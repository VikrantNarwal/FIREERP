import { NextResponse } from 'next/server'
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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const body = await request.json()
      const jobNumber = await generateJobNumber()

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

      // Create initial production stages
      const stages = [
        { stage: 'DESIGN_APPROVED', sequence: 1 },
        { stage: 'LASER_CUTTING', sequence: 2 },
        { stage: 'BENDING', sequence: 3 },
        { stage: 'WELDING', sequence: 4 },
        { stage: 'GRINDING_BUFFING', sequence: 5 },
        { stage: 'POWDER_COATING', sequence: 6 },
        { stage: 'INCOMING_QC', sequence: 7 },
        { stage: 'WOODEN_LOG_PREP', sequence: 8 },
        { stage: 'FLAME_SHEET_PREP', sequence: 9 },
        { stage: 'LIGHT_ASSEMBLY', sequence: 10 },
        { stage: 'STEPPER_MOTOR_ASSEMBLY', sequence: 11 },
        { stage: 'PCB_PREPARATION', sequence: 12 },
        { stage: 'SPEAKER_ASSEMBLY', sequence: 13 },
        { stage: 'HEATER_ASSEMBLY', sequence: 14 },
        { stage: 'MAIN_ASSEMBLY', sequence: 15 },
        { stage: 'FUNCTIONAL_TESTING', sequence: 16 },
        { stage: 'BURN_IN_TEST', sequence: 17 },
        { stage: 'FINAL_QC', sequence: 18 },
        { stage: 'PACKAGING', sequence: 19 },
        { stage: 'DISPATCH_READY', sequence: 20 }
      ]

      await prisma.productionStage.createMany({
        data: stages.map(s => ({
          orderId: order.id,
          stage: s.stage,
          sequence: s.sequence,
          status: 'PENDING'
        }))
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          resource: 'Order',
          resourceId: order.id
        }
      })

      return handleCORS(NextResponse.json(order, { status: 201 }))
    }

    // Update order - PUT /api/orders/:id
    if (route.match(/^\/orders\/[^\/]+$/) && method === 'PUT') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const orderId = path[1]
      const body = await request.json()

      const order = await prisma.order.update({
        where: { id: orderId },
        data: body,
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

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'Order',
          resourceId: order.id,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(order))
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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const stageId = path[2]
      const body = await request.json()

      const stage = await prisma.productionStage.update({
        where: { id: stageId },
        data: {
          ...body,
          actualStartDate: body.status === 'IN_PROGRESS' && !body.actualStartDate ? new Date() : body.actualStartDate,
          actualEndDate: body.status === 'COMPLETED' ? new Date() : null
        },
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

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          resource: 'ProductionStage',
          resourceId: stage.id,
          changes: body
        }
      })

      return handleCORS(NextResponse.json(stage))
    }

    // Get Kanban board data - GET /api/production/kanban
    if (route === '/production/kanban' && method === 'GET') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

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
          supplier: true
        },
        orderBy: { name: 'asc' }
      })

      return handleCORS(NextResponse.json(components))
    }

    // Create component - POST /api/components
    if (route === '/components' && method === 'POST') {
      const user = verifyAuth(request)
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const body = await request.json()
      const component = await prisma.component.create({
        data: body
      })

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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

      const componentId = path[1]
      const body = await request.json()

      const component = await prisma.component.update({
        where: { id: componentId },
        data: body
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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

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
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      }

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
        lowStockComponents
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
        })
      ])

      const stats = {
        totalOrders,
        ordersInProduction,
        ordersDelayed,
        todayDispatches,
        pendingQC,
        totalCustomers,
        lowStockComponents
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
