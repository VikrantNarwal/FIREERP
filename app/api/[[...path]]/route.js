import { NextResponse } from 'next/server'
import { getProductionStagesForProduct } from '@/lib/stageTemplates'
import prisma from '@/lib/prisma'
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken, generate2FASecret, verify2FAToken } from '@/lib/auth'
import { generateJobNumber } from '@/lib/jobNumberGenerator'

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Helper to verify auth token
function verifyAuth(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const { verifyAccessToken } = require('@/lib/auth')
  return verifyAccessToken(token)
}

// Order date-typed fields — HTML date inputs send plain strings (or '' when
// cleared), so these need normalizing to Date|null before Prisma sees them.
const ORDER_DATE_FIELDS = [
  'orderDate', 'requiredDate', 'promisedDate', 'actualStartDate', 'actualEndDate',
  'deliveryDate', 'installationDate', 'dispatchDate', 'designApprovedAt', 'advanceDatePaid'
]

// Sales owns order edits, including backfilling dispatch/dates on old orders
// and the post-dispatch outcome (customer review, safe-delivery, remake flag).
// This normalizes whatever the client sent into values Prisma will accept.
function sanitizeOrderUpdate(body) {
  const data = { ...body }
  for (const field of ORDER_DATE_FIELDS) {
    if (field in data) data[field] = data[field] ? new Date(data[field]) : null
  }
  if ('customerReviewRating' in data && data.customerReviewRating !== null) {
    data.customerReviewRating = Math.min(5, Math.max(1, Number(data.customerReviewRating) || 1))
  }
  // A remake flag with no reason is meaningless to Production — and clearing
  // the flag should clear any stale reason/notes from a previous defect.
  if (data.needsRemake === false) {
    data.remakeReason = null
    data.remakeNotes = null
  }
  return data
}

// Helper to check role permissions
function requireRole(user, allowedRoles) {
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
  }
  return null
}


// ==================== ORDER TRACKING HELPERS ====================

// Statuses that mean "this order has left the factory" — these live in the
// Dispatched Items list everywhere in the portal, never in the active list.
const DISPATCHED_STATUSES = ['DISPATCHED', 'DELIVERED', 'INSTALLATION_PENDING', 'INSTALLED', 'CLOSED']
// An open order older than this many days (counted from its posting date)
// is automatically flagged IMPORTANT (priority URGENT).
const IMPORTANT_AFTER_DAYS = 15

// Human labels for the edit-history trail. Only fields listed here are tracked.
const TRACKED_ORDER_FIELDS = {
  status: 'Status',
  priority: 'Priority',
  quantity: 'Quantity',
  orderDate: 'Posting date',
  promisedDate: 'Promised date',
  requiredDate: 'Required date',
  dispatchDate: 'Dispatch date',
  deliveryDate: 'Delivery date',
  installationDate: 'Installation date',
  notes: 'Notes',
  internalNotes: 'Internal notes',
  customerNotes: 'Customer notes',
  delayReason: 'Delay reason',
  deliveredSafely: 'Delivered safely',
  customerReviewRating: 'Customer rating',
  customerReviewNotes: 'Customer review notes',
  needsRemake: 'Needs remake',
  remakeReason: 'Remake reason',
  remakeNotes: 'Remake notes',
  unitPrice: 'Unit price',
  totalPrice: 'Total price',
  discount: 'Discount',
  finalPrice: 'Final price',
  variant: 'Variant',
  flameColor: 'Flame colour',
  soundOption: 'Sound option',
  rgbOption: 'RGB option',
  dimensions: 'Dimensions',
  designMeasurements: 'Design measurements',
  designApprovedAt: 'Design approved on'
}
const DATE_ONLY_FIELDS = new Set([
  'orderDate', 'promisedDate', 'requiredDate', 'dispatchDate', 'deliveryDate',
  'installationDate', 'designApprovedAt'
])

// Turns any stored/sent value into a short, comparable, human-readable string.
function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return '(empty)'
  if (DATE_ONLY_FIELDS.has(field)) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  return String(value)
}

// Compares the order as it was BEFORE the edit with the cleaned data being
// written, and returns only what really changed: [{ field, label, from, to }].
function computeOrderDiff(before, data) {
  const diff = []
  for (const field of Object.keys(TRACKED_ORDER_FIELDS)) {
    if (!(field in data)) continue
    const from = displayValue(field, before[field])
    const to = displayValue(field, data[field])
    if (from !== to) diff.push({ field, label: TRACKED_ORDER_FIELDS[field], from, to })
  }
  return diff
}

// Open orders more than IMPORTANT_AFTER_DAYS old become IMPORTANT (priority
// URGENT) automatically — once. After that a person can still change the
// priority by hand and it will NOT be overwritten again (autoImportantAt is
// the "already handled" marker). Runs at most once every 5 minutes per server.
let lastAutoFlagRun = 0
async function autoFlagImportantOrders(userId) {
  const now = Date.now()
  if (now - lastAutoFlagRun < 5 * 60 * 1000) return
  lastAutoFlagRun = now
  try {
    const cutoff = new Date(now - IMPORTANT_AFTER_DAYS * 24 * 60 * 60 * 1000)
    const due = await prisma.order.findMany({
      where: {
        deletedAt: null,
        autoImportantAt: null,
        orderDate: { lt: cutoff },
        dispatchDate: null,
        status: { notIn: [...DISPATCHED_STATUSES, 'CANCELLED'] }
      },
      select: { id: true, priority: true }
    })
    if (due.length === 0) return

    await prisma.order.updateMany({
      where: { id: { in: due.map(o => o.id) } },
      data: { priority: 'URGENT', autoImportantAt: new Date() }
    })

    const changed = due.filter(o => o.priority !== 'URGENT')
    if (changed.length > 0) {
      await prisma.auditLog.createMany({
        data: changed.map(o => ({
          userId,
          action: 'UPDATE',
          resource: 'Order',
          resourceId: o.id,
          changes: {
            auto: true,
            diff: [{
              field: 'priority',
              label: 'Priority',
              from: o.priority,
              to: `URGENT (auto-marked IMPORTANT: ${IMPORTANT_AFTER_DAYS} days passed since posting)`
            }]
          }
        }))
      })
    }
  } catch (error) {
    // Never block the order list because of the auto-flag job.
    lastAutoFlagRun = 0
    console.error('autoFlagImportantOrders failed:', error)
  }
}

// Main route handler
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    // ==================== AUTHENTICATION ROUTES ====================
    
    // Login - POST /api/auth/login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password, twoFactorToken } = body

      if (!email || !password) {
        return handleCORS(NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        ))
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!user || user.status !== 'ACTIVE') {
        return handleCORS(NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        ))
      }

      const isValidPassword = await verifyPassword(password, user.password)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        ))
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          return handleCORS(NextResponse.json(
            { requires2FA: true },
            { status: 200 }
          ))
        }

        const isValid2FA = verify2FAToken(user.twoFactorSecret, twoFactorToken)
        if (!isValid2FA) {
          return handleCORS(NextResponse.json(
            { error: 'Invalid 2FA token' },
            { status: 401 }
          ))
        }
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          resource: 'User',
          resourceId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      })

      const accessToken = generateAccessToken(user)
      const refreshToken = generateRefreshToken(user)

      const { password: _, twoFactorSecret: __, ...userWithoutSensitive } = user

      return handleCORS(NextResponse.json({
        user: userWithoutSensitive,
        accessToken,
        refreshToken
      }))
    }

    // Register - POST /api/auth/register (Admin only in production)
    if (route === '/auth/register' && method === 'POST') {
      const authUser = verifyAuth(request)
      const denied = requireRole(authUser, ['CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()
      const { email, password, firstName, lastName, role, department } = body

      if (!email || !password || !firstName || !lastName || !role) {
        return handleCORS(NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        ))
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        return handleCORS(NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        ))
      }

      const hashedPassword = await hashPassword(password)

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role,
          department: department || role
        }
      })

      const { password: _, ...userWithoutPassword } = user

      return handleCORS(NextResponse.json(userWithoutPassword, { status: 201 }))
    }

    // Refresh token - POST /api/auth/refresh
    if (route === '/auth/refresh' && method === 'POST') {
      const body = await request.json()
      const { refreshToken } = body

      if (!refreshToken) {
        return handleCORS(NextResponse.json(
          { error: 'Refresh token required' },
          { status: 400 }
        ))
      }

      const decoded = verifyRefreshToken(refreshToken)
      if (!decoded) {
        return handleCORS(NextResponse.json(
          { error: 'Invalid refresh token' },
          { status: 401 }
        ))
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      })

      if (!user || user.status !== 'ACTIVE') {
        return handleCORS(NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 401 }
        ))
      }

      const newAccessToken = generateAccessToken(user)
      const newRefreshToken = generateRefreshToken(user)

      return handleCORS(NextResponse.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }))
    }

    // Verify token - GET /api/auth/verify
    if (route === '/auth/verify' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ))
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          status: true
        }
      })

      if (!dbUser || dbUser.status !== 'ACTIVE') {
        return handleCORS(NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 401 }
        ))
      }

      return handleCORS(NextResponse.json({ user: dbUser }))
    }

    // ==================== CUSTOMER ROUTES ====================

    // Get all customers - GET /api/customers
    if (route === '/customers' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const customers = await prisma.customer.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' }
      })

      return handleCORS(NextResponse.json(customers))
    }

    // Create customer - POST /api/customers
    if (route === '/customers' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()
      const customer = await prisma.customer.create({
        data: body
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Customer',
          resourceId: customer.id
        }
      })

      return handleCORS(NextResponse.json(customer, { status: 201 }))
    }

    // ==================== ORDER ROUTES ====================

    // Get all orders - GET /api/orders
    if (route === '/orders' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      await autoFlagImportantOrders(user.id)

      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const priority = url.searchParams.get('priority')

      const where = { deletedAt: null }
      if (status) where.status = status
      if (priority) where.priority = priority

      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: true,
          product: true,
          salesPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          productionStages: {
            orderBy: { sequence: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return handleCORS(NextResponse.json(orders))
    }

    // Get single order - GET /api/orders/:id
    if (route.match(/^\/orders\/[^\/]+$/) && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const orderId = path[1]
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          product: true,
          bom: {
            include: {
              items: {
                include: {
                  component: true
                }
              }
            }
          },
          salesPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          designApprover: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          productionStages: {
            include: {
              operator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: { sequence: 'asc' }
          },
          qcInspections: {
            include: {
              inspector: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          documents: {
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          serialNumbers: true,
          ncrs: true
        }
      })

      if (!order) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      return handleCORS(NextResponse.json(order))
    }

    // Create order - POST /api/orders
    if (route === '/orders' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()

      // These two only depend on inputs we already have (the clock, and
      // body.productId) — neither depends on the other's result, so run them
      // as one concurrent round trip instead of two sequential ones.
      const [jobNumber, stageRows] = await Promise.all([
        generateJobNumber(),
        getProductionStagesForProduct(body.productId)
      ])

      // Create order
      const order = await prisma.order.create({
        data: {
          jobNumber,
          customerId: body.customerId,
          productId: body.productId,
          fireplaceType: body.fireplaceType,
          variant: body.variant,
          dimensions: body.dimensions,
          flameColor: body.flameColor,
          soundOption: body.soundOption || false,
          rgbOption: body.rgbOption || false,
          status: 'QUOTATION',
          // Posting date is always stamped by the server — nobody types it.
          orderDate: new Date(),
          priority: body.priority || 'NORMAL',
          quantity: body.quantity || 1,
          unitPrice: body.unitPrice,
          totalPrice: body.totalPrice,
          discount: body.discount || 0,
          finalPrice: body.finalPrice,
          requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
          promisedDate: body.promisedDate ? new Date(body.promisedDate) : null,
          salesPersonId: user.id,
          notes: body.notes,
          customerNotes: body.customerNotes
        },
        include: {
          customer: true,
          product: true,
          salesPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // Create initial production stages from this product's admin-defined template,
      // and the audit log entry — both only need order.id and user.id (already have
      // both), so these are independent of each other and can run concurrently too.
      await Promise.all([
        prisma.productionStage.createMany({
          data: stageRows.map(s => ({
            orderId: order.id,
            stage: s.stage,
            sequence: s.sequence,
            status: s.status
          }))
        }),
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'CREATE',
            resource: 'Order',
            resourceId: order.id,
            changes: { created: true, diff: [] }
          }
        })
      ])

      // Prisma's createMany doesn't return the created rows, but we already know
      // exactly what was written (same stageRows used above) — attaching them here
      // lets the frontend render the complete order immediately without a refetch.
      order.productionStages = stageRows

      return handleCORS(NextResponse.json(order, { status: 201 }))
    }

    // Update order - PUT /api/orders/:id
    if (route.match(/^\/orders\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'DESIGN', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const orderId = path[1]
      const body = await request.json()

      const before = await prisma.order.findUnique({ where: { id: orderId } })
      if (!before) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }

      const data = sanitizeOrderUpdate(body)

      // The posting date is set automatically when the order is created.
      // Only CEO / Admin may correct it.
      if (!['CEO', 'ADMIN'].includes(user.role)) delete data.orderDate

      // Marked DISPATCHED with no dispatch date? Stamp it now — the order then
      // moves to the Dispatched Items list on its own, nobody has to type a date.
      const nextStatus = data.status || before.status
      if (nextStatus === 'DISPATCHED' && !before.dispatchDate && !data.dispatchDate) {
        data.dispatchDate = new Date()
      }

      const diff = computeOrderDiff(before, data)

      const order = await prisma.order.update({
        where: { id: orderId },
        data,
        include: {
          customer: true,
          product: true,
          salesPerson: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // Only write a history entry when something truly changed.
      if (diff.length > 0) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE',
            resource: 'Order',
            resourceId: order.id,
            changes: { diff }
          }
        })
      }

      return handleCORS(NextResponse.json(order))
    }

    // Edit history for one order - GET /api/orders/:id/history
    // Every role can read it: it shows who changed what, and when.
    if (route.match(/^\/orders\/[^\/]+\/history$/) && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const logs = await prisma.auditLog.findMany({
        where: { resource: 'Order', resourceId: path[1] },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: 200
      })

      const history = logs
        .filter(l => l.action === 'CREATE' || l.action === 'DELETE' || (l.changes && Array.isArray(l.changes.diff) && l.changes.diff.length > 0))
        .map(l => ({
          id: l.id,
          at: l.timestamp,
          action: l.action,
          auto: !!(l.changes && l.changes.auto),
          by: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'Unknown',
          role: l.user ? l.user.role : null,
          diff: (l.changes && Array.isArray(l.changes.diff)) ? l.changes.diff : []
        }))

      return handleCORS(NextResponse.json(history))
    }

    // Dispatch order - POST /api/orders/:id/dispatch
    // One-click "send to Dispatched Items". Production and Sales both use this
    // (Production cannot use the general order edit, which is Sales/Design only).
    // Sets status DISPATCHED + dispatch date = now, and writes the edit history.
    // Re-dispatching an order that was flagged for a remake clears the remake flag.
    if (route.match(/^\/orders\/[^\/]+\/dispatch$/) && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'PRODUCTION', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const orderId = path[1]
      const before = await prisma.order.findUnique({ where: { id: orderId } })
      if (!before || before.deletedAt) {
        return handleCORS(NextResponse.json({ error: 'Order not found' }, { status: 404 }))
      }
      if (before.status === 'CANCELLED') {
        return handleCORS(NextResponse.json({ error: 'A cancelled order cannot be dispatched' }, { status: 400 }))
      }
      const alreadyDispatched = DISPATCHED_STATUSES.includes(before.status) || !!before.dispatchDate
      if (alreadyDispatched && !before.needsRemake) {
        return handleCORS(NextResponse.json({ error: 'This order is already in Dispatched Items' }, { status: 409 }))
      }

      const data = { status: 'DISPATCHED', dispatchDate: new Date() }
      if (before.needsRemake) {
        // The remade unit is going out again — close the remake and reset the
        // delivery outcome so Sales can record it fresh for the new shipment.
        data.needsRemake = false
        data.remakeReason = null
        data.remakeNotes = null
        data.deliveredSafely = null
      }

      const diff = computeOrderDiff(before, data)

      const order = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data,
          include: {
            customer: true,
            product: true,
            salesPerson: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            productionStages: { orderBy: { sequence: 'asc' } }
          }
        })
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE',
            resource: 'Order',
            resourceId: updated.id,
            changes: { dispatched: true, diff }
          }
        })
        return updated
      })

      return handleCORS(NextResponse.json(order))
    }

    // Soft delete order - DELETE /api/orders/:id (CEO only)
    if (route.match(/^\/orders\/[^\/]+$/) && method === 'DELETE') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const orderId = path[1]

      const order = await prisma.order.update({
        where: { id: orderId },
        data: { 
          deletedAt: new Date(),
          status: 'CANCELLED'
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          resource: 'Order',
          resourceId: order.id,
          changes: { deletedAt: order.deletedAt }
        }
      })

      return handleCORS(NextResponse.json({ message: 'Order deleted successfully', order }))
    }

    // ==================== PRODUCTION STAGE ROUTES ====================

    // Get production stages for order - GET /api/orders/:id/stages
    if (route.match(/^\/orders\/[^\/]+\/stages$/) && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const orderId = path[1]
      const stages = await prisma.productionStage.findMany({
        where: { orderId },
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { sequence: 'asc' }
      })

      return handleCORS(NextResponse.json(stages))
    }

    // Update production stage - PUT /api/production/stages/:id
    if (route.match(/^\/production\/stages\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['PRODUCTION', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const stageId = path[2]
      const body = await request.json()

      const data = { ...body }
      // Only auto-stamp timestamps when the caller didn't already supply one —
      // never blindly null out a timestamp that was set on a previous update.
      if (body.status === 'IN_PROGRESS' && !data.actualStartDate) {
        data.actualStartDate = new Date()
      } else if (data.actualStartDate) {
        data.actualStartDate = new Date(data.actualStartDate)
      }

      if (body.status === 'COMPLETED' && !data.actualEndDate) {
        data.actualEndDate = new Date()
      } else if (data.actualEndDate) {
        data.actualEndDate = new Date(data.actualEndDate)
      }

      // Everything below runs as one transaction: the stage write, the audit log, and the
      // order's overall status all move together or not at all. This is also the single
      // place that keeps Order.status in sync with its stages — Production, Admin, and CEO
      // all call this same endpoint to change a stage, so they all get correct auto-advance
      // for free instead of each dashboard reimplementing (and possibly disagreeing on) it.
      const stage = await prisma.$transaction(async (tx) => {
        const updatedStage = await tx.productionStage.update({
          where: { id: stageId },
          data,
          include: {
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'UPDATE',
            resource: 'ProductionStage',
            resourceId: updatedStage.id,
            changes: body
          }
        })

        const order = await tx.order.findUnique({
          where: { id: updatedStage.orderId },
          include: { productionStages: true }
        })

        if (order) {
          const stages = order.productionStages
          const allCompleted = stages.length > 0 && stages.every(s => s.status === 'COMPLETED')
          const anyStarted = stages.some(s => s.status === 'IN_PROGRESS' || s.status === 'COMPLETED')

          let nextOrderStatus = null
          // Design approved it, and work has now actually started on at least one stage —
          // move it out of "Design Approved" so it stops looking stuck there.
          if (order.status === 'APPROVED' && anyStarted) {
            nextOrderStatus = 'IN_PRODUCTION'
          } else if (order.status === 'IN_PRODUCTION' && allCompleted) {
            nextOrderStatus = 'QC_PENDING'
          } else if (order.status === 'QC_PENDING' && !allCompleted) {
            // A completed stage got reopened after QC already picked it up — step back.
            nextOrderStatus = 'IN_PRODUCTION'
          }

          if (nextOrderStatus) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: nextOrderStatus }
            })
            await tx.auditLog.create({
              data: {
                userId: user.id,
                action: 'UPDATE',
                resource: 'Order',
                resourceId: order.id,
                changes: {
                  diff: [{ field: 'status', label: 'Status', from: order.status, to: nextOrderStatus }]
                }
              }
            })
          }
        }

        return updatedStage
      })

      return handleCORS(NextResponse.json(stage))
    }

    // Get Kanban board data - GET /api/production/kanban
    if (route === '/production/kanban' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      await autoFlagImportantOrders(user.id)

      const orders = await prisma.order.findMany({
        where: {
          deletedAt: null,
          status: {
            in: ['APPROVED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED']
          }
        },
        include: {
          customer: true,
          product: true,
          productionStages: {
            where: {
              status: {
                in: ['PENDING', 'IN_PROGRESS']
              }
            },
            orderBy: { sequence: 'asc' }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { promisedDate: 'asc' }
        ]
      })

      return handleCORS(NextResponse.json(orders))
    }

    // ==================== COMPONENT/INVENTORY ROUTES ====================

    // Get all components - GET /api/components
    if (route === '/components' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const components = await prisma.component.findMany({
        where: { deletedAt: null },
        include: {
          supplier: true,
          product: true
        },
        orderBy: { name: 'asc' }
      })

      return handleCORS(NextResponse.json(components))
    }

    // Create component - POST /api/components
    if (route === '/components' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'PROCUREMENT', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()

      if (!body.name || !body.code) {
        return handleCORS(NextResponse.json({ error: 'Name and code are required' }, { status: 400 }))
      }

      // Whitelist to real Component columns — the frontend form sends "notes"
      // (mapped to the actual "description" column) and may send "productId": 'none'
      // (mapped to null). Any other stray key is dropped instead of crashing the insert.
      const {
        name, code, category, description, notes, unit,
        currentStock, reorderLevel, reorderQuantity, minStock, maxStock,
        location, vendorName, vendorContact, vendorEmail,
        supplierId, productId, unitPrice, gst
      } = body

      const data = {
        name,
        code,
        category,
        description: notes !== undefined ? notes : description,
        unit: unit || 'pcs',
        currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
        reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : undefined,
        reorderQuantity: reorderQuantity !== undefined ? Number(reorderQuantity) : undefined,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        maxStock: maxStock !== undefined ? Number(maxStock) : undefined,
        location,
        vendorName,
        vendorContact,
        vendorEmail,
        supplierId: supplierId || null,
        productId: productId === 'none' ? null : (productId || null),
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
        gst: gst !== undefined ? Number(gst) : undefined
      }

      let component
      try {
        component = await prisma.component.create({
          data,
          include: {
            supplier: true,
            product: true
          }
        })
      } catch (err) {
        if (err.code === 'P2002') {
          return handleCORS(NextResponse.json(
            { error: `A component with code "${code}" already exists` },
            { status: 409 }
          ))
        }
        throw err
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Component',
          resourceId: component.id
        }
      })

      return handleCORS(NextResponse.json(component, { status: 201 }))
    }

// Update component - PUT /api/components/:id
    if (route.match(/^\/components\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'PROCUREMENT', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const componentId = path[1]
      const body = await request.json()

      const component = await prisma.component.update({
        where: { id: componentId },
        data: (() => { const { notes, ...rest } = body; return notes !== undefined ? { ...rest, description: notes } : rest })(),
        include: {
          supplier: true,
          product: true
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'Component',
          resourceId: componentId,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(component))
    }

    // Soft delete component - DELETE /api/components/:id
    if (route.match(/^\/components\/[^\/]+$/) && method === 'DELETE') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'PROCUREMENT', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const componentId = path[1]

      const component = await prisma.component.update({
        where: { id: componentId },
        data: { deletedAt: new Date() }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          resource: 'Component',
          resourceId: componentId,
          changes: { deletedAt: component.deletedAt }
        }
      })

return handleCORS(NextResponse.json({ message: 'Component deleted successfully', component }))
    }

    // ==================== INVENTORY OPTIONS ROUTES (Category/Unit management) ====================

    // Get inventory options - GET /api/inventory-options?type=CATEGORY
    if (route === '/inventory-options' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const type = url.searchParams.get('type')

      const where = { isActive: true }
      if (type) where.type = type

      const options = await prisma.inventoryOption.findMany({
        where,
        orderBy: { label: 'asc' }
      })

      return handleCORS(NextResponse.json(options))
    }

    // Create inventory option - POST /api/inventory-options
    if (route === '/inventory-options' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()

      if (!body.type || !body.value || !body.label) {
        return handleCORS(NextResponse.json(
          { error: 'type, value, and label are required' },
          { status: 400 }
        ))
      }

      const option = await prisma.inventoryOption.create({
        data: {
          type: body.type,
          value: body.value.toUpperCase().replace(/\s+/g, '_'),
          label: body.label
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'InventoryOption',
          resourceId: option.id
        }
      })

      return handleCORS(NextResponse.json(option, { status: 201 }))
    }

    // Update inventory option (rename) - PUT /api/inventory-options/:id
    if (route.match(/^\/inventory-options\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const optionId = path[1]
      const body = await request.json()

      const option = await prisma.inventoryOption.update({
        where: { id: optionId },
        data: {
          label: body.label,
          isActive: body.isActive
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'InventoryOption',
          resourceId: optionId,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(option))
    }

    // Delete inventory option - DELETE /api/inventory-options/:id
    if (route.match(/^\/inventory-options\/[^\/]+$/) && method === 'DELETE') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['INVENTORY', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const optionId = path[1]

      await prisma.inventoryOption.delete({
        where: { id: optionId }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE',
          resource: 'InventoryOption',
          resourceId: optionId
        }
      })

      return handleCORS(NextResponse.json({ message: 'Option deleted successfully' }))
    }

    // ==================== SUPPLIER ROUTES ====================
    // Get all suppliers - GET /api/suppliers
    if (route === '/suppliers' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' }
      })

      return handleCORS(NextResponse.json(suppliers))
    }

    // Create supplier - POST /api/suppliers
    if (route === '/suppliers' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['PROCUREMENT', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()
      const supplier = await prisma.supplier.create({
        data: body
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Supplier',
          resourceId: supplier.id
        }
      })

      return handleCORS(NextResponse.json(supplier, { status: 201 }))
    }

    // ==================== QC ROUTES ====================

    // Get QC inspections - GET /api/qc/inspections
    if (route === '/qc/inspections' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const orderId = url.searchParams.get('orderId')

      const where = {}
      if (orderId) where.orderId = orderId

      const inspections = await prisma.qCInspection.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          inspector: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { inspectedAt: 'desc' }
      })

      return handleCORS(NextResponse.json(inspections))
    }

    // Create QC inspection - POST /api/qc/inspections
    if (route === '/qc/inspections' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['QC', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()
      const inspection = await prisma.qCInspection.create({
        data: {
          ...body,
          inspectorId: user.id
        },
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          inspector: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // If inspection failed, create NCR
      if (body.result === 'FAIL' && body.defects) {
        const ncrCount = await prisma.nCR.count()
        const ncrNumber = `NCR-${new Date().getFullYear()}-${String(ncrCount + 1).padStart(5, '0')}`

        await prisma.nCR.create({
          data: {
            ncrNumber,
            orderId: body.orderId,
            qcInspectionId: inspection.id,
            issue: body.defects.description || 'QC Inspection Failed',
            description: JSON.stringify(body.defects),
            severity: body.defects.severity || 'MEDIUM',
            createdById: user.id
          }
        })
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'QCInspection',
          resourceId: inspection.id
        }
      })

      return handleCORS(NextResponse.json(inspection, { status: 201 }))
    }

    // ==================== DASHBOARD/ANALYTICS ROUTES ====================

    // Get dashboard stats - GET /api/dashboard/stats
    if (route === '/dashboard/stats' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [
        totalOrders,
        ordersInProduction,
        ordersDelayed,
        todayDispatches,
        pendingQC,
        totalCustomers,
        lowStockComponents,
        criticalAlerts,
        openAlerts
      ] = await Promise.all([
        prisma.order.count({ where: { deletedAt: null } }),
        prisma.order.count({
          where: {
            status: 'IN_PRODUCTION',
            deletedAt: null
          }
        }),
        prisma.order.count({
          where: {
            promisedDate: { lt: new Date() },
            status: { notIn: ['DELIVERED', 'CLOSED', 'CANCELLED'] },
            deletedAt: null
          }
        }),
        prisma.order.count({
          where: {
            status: 'DISPATCHED',
            updatedAt: { gte: today },
            deletedAt: null
          }
        }),
        prisma.qCInspection.count({
          where: { result: 'PENDING' }
        }),
        prisma.customer.count({ where: { deletedAt: null } }),
        prisma.component.count({
          where: {
            currentStock: { lte: prisma.component.fields.reorderLevel },
            deletedAt: null
          }
        }),
        prisma.criticalAlert.count({
          where: {
            severity: { in: ['HIGH', 'CRITICAL'] },
            status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] }
          }
        }),
        prisma.criticalAlert.count({
          where: {
            status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] }
          }
        })
      ])

      const stats = {
        totalOrders,
        ordersInProduction,
        ordersDelayed,
        todayDispatches,
        pendingQC,
        totalCustomers,
        lowStockComponents,
        criticalAlerts,
        openAlerts
      }

      return handleCORS(NextResponse.json(stats))
    }

    // ==================== USER ROUTES ====================

    // Get all users - GET /api/users
    if (route === '/users' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user || !['CEO', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }

      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          phone: true,
          status: true,
          createdAt: true,
          lastLogin: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return handleCORS(NextResponse.json(users))
    }

    // Update user profile - PUT /api/users/:id
    if (route.match(/^\/users\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const userId = path[1]
      const body = await request.json()

      // Users can only update their own profile unless they're admin
      if (userId !== user.id && !['CEO', 'ADMIN'].includes(user.role)) {
        return handleCORS(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          phone: true,
          status: true
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'User',
          resourceId: userId,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(updatedUser))
    }

    // ==================== PRODUCT ROUTES ====================

    // Get all products - GET /api/products
    if (route === '/products' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          boms: {
            where: { isActive: true },
            take: 1,
            orderBy: { revision: 'desc' }
          }
        }
      })

      return handleCORS(NextResponse.json(products))
    }

    // ==================== PAYMENT ROUTES ====================

    // Get payments - GET /api/payments
    if (route === '/payments' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const orderId = url.searchParams.get('orderId')

      const where = {}
      if (orderId) where.orderId = orderId

      const payments = await prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true,
              customer: {
                select: {
                  name: true
                }
              }
            }
          },
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { paymentDate: 'desc' }
      })

      return handleCORS(NextResponse.json(payments))
    }

    // Create payment - POST /api/payments
    if (route === '/payments' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()

      if (!body.orderId || body.amount === undefined || body.amount === null || isNaN(body.amount)) {
        return handleCORS(NextResponse.json(
          { error: 'orderId and a numeric amount are required' },
          { status: 400 }
        ))
      }

      // Everything below is one transaction: the payment row, the order's running
      // advance/balance totals, and the audit log all commit together or not at all.
      // Previously these were separate calls — if the order-update step failed after the
      // payment had already been inserted, the payment silently existed in the database
      // while the order's displayed totals never moved, and Sales saw a failure toast for
      // a save that had actually partially happened. A transaction makes that impossible:
      // either the whole payment is recorded and reflected everywhere, or none of it is.
      const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
          data: {
            orderId: body.orderId,
            amount: body.amount,
            paymentType: body.paymentType,
            paymentMode: body.paymentMode,
            transactionRef: body.transactionRef,
            notes: body.notes,
            paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
            recordedById: user.id
          },
          include: {
            order: {
              select: {
                id: true,
                jobNumber: true
              }
            },
            recordedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        })

        const order = await tx.order.findUnique({ where: { id: body.orderId } })
        if (!order) {
          throw new Error('Order not found')
        }

        // Recompute both totals from every payment on record for this order — summed fresh
        // each time, never overwritten with just this one payment's amount. This is what
        // makes a second advance instalment add to the first instead of replacing it.
        const totalPaidAgg = await tx.payment.aggregate({
          where: { orderId: body.orderId },
          _sum: { amount: true }
        })
        const totalPaid = totalPaidAgg._sum.amount || 0

        const orderUpdateData = {
          balanceDue: order.finalPrice != null ? order.finalPrice - totalPaid : null
        }

        if (body.paymentType === 'ADVANCE') {
          const advanceAgg = await tx.payment.aggregate({
            where: { orderId: body.orderId, paymentType: 'ADVANCE' },
            _sum: { amount: true }
          })
          orderUpdateData.advanceAmountPaid = advanceAgg._sum.amount || 0
          orderUpdateData.advanceDatePaid = order.advanceDatePaid || created.paymentDate
        }

        await tx.order.update({
          where: { id: body.orderId },
          data: orderUpdateData
        })

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'CREATE',
            resource: 'Payment',
            resourceId: created.id,
            changes: body
          }
        })

        return created
      })

      return handleCORS(NextResponse.json(payment, { status: 201 }))
    }

    // ==================== CRITICAL ALERTS ROUTES ====================

    // Get alerts - GET /api/alerts
    if (route === '/alerts' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const status = url.searchParams.get('status')
      const severity = url.searchParams.get('severity')
      const orderId = url.searchParams.get('orderId')

      const where = {}
      if (status) where.status = status
      if (severity) where.severity = severity
      if (orderId) where.orderId = orderId

      const alerts = await prisma.criticalAlert.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true,
              customer: {
                select: {
                  name: true
                }
              }
            }
          },
          raisedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      return handleCORS(NextResponse.json(alerts))
    }

    // Create alert - POST /api/alerts
    if (route === '/alerts' && method === 'POST') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const body = await request.json()

      const alert = await prisma.criticalAlert.create({
        data: {
          orderId: body.orderId,
          raisedByUserId: user.id,
          raisedByRole: user.role,
          category: body.category,
          message: body.message,
          details: body.details,
          severity: body.severity,
          status: 'OPEN'
        },
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          raisedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'CriticalAlert',
          resourceId: alert.id,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(alert, { status: 201 }))
    }

    // Update alert (resolve/acknowledge) - PUT /api/alerts/:id
    if (route.match(/^\/alerts\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const alertId = path[1]
      const body = await request.json()

      const updateData = {
        ...body
      }

      // If resolving, add resolved metadata
      if (body.status === 'RESOLVED' || body.status === 'CLOSED') {
        updateData.resolvedAt = new Date()
        updateData.resolvedByUserId = user.id
      }

      const alert = await prisma.criticalAlert.update({
        where: { id: alertId },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          raisedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'CriticalAlert',
          resourceId: alertId,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(alert))
    }

    // ==================== DOCUMENT UPLOAD ROUTE ====================

    // Upload document - POST /api/documents/upload
    if (route === '/documents/upload' && method === 'POST') {
      const user = verifyAuth(request)
      const denied = requireRole(user, ['SALES', 'DESIGN', 'PRODUCTION', 'QC', 'CEO', 'ADMIN'])
      if (denied) return handleCORS(denied)

      const body = await request.json()

      const document = await prisma.document.create({
        data: {
          orderId: body.orderId,
          type: body.type,
          fileName: body.fileName,
          fileUrl: body.fileUrl,
          fileSize: body.fileSize,
          mimeType: body.mimeType,
          uploadedById: user.id,
          notes: body.notes
        },
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Document',
          resourceId: document.id,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(document, { status: 201 }))
    }

    // Get documents - GET /api/documents
    if (route === '/documents' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const url = new URL(request.url)
      const orderId = url.searchParams.get('orderId')
      const type = url.searchParams.get('type')

      const where = {}
      if (orderId) where.orderId = orderId
      if (type) where.type = type

      const documents = await prisma.document.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              jobNumber: true
            }
          },
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return handleCORS(NextResponse.json(documents))
    }

    // Root endpoint - GET /api/
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({
        message: 'Manufacturing ERP API',
        version: '1.0.0',
        status: 'operational'
      }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
