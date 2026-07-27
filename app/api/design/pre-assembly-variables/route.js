import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// GET /api/design/pre-assembly-variables
// Any logged-in user can read (Production needs this to label the measurements
// it displays); only Design/CEO/Admin can write (see POST/PUT/DELETE below).
export const GET = authMiddleware(async (request) => {
  try {
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    const variables = await prisma.preAssemblyVariable.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }]
    })

    return NextResponse.json(variables)
  } catch (error) {
    console.error('GET /api/design/pre-assembly-variables error:', error)
    return NextResponse.json({ error: 'Failed to load measurement fields' }, { status: 500 })
  }
}, [])

function slugify(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// POST /api/design/pre-assembly-variables — create a new measurement field.
// Body: { label, unit?, group?, sortOrder? }
// Design decides entirely what exists here — a single mirror measurement, a full
// mirror-width-and-height pair, extra wooden log fields, anything — this endpoint
// places no limits on count or naming beyond a unique key derived from the label.
export const POST = authMiddleware(async (request) => {
  try {
    const body = await request.json()
    const { label, unit, group, sortOrder } = body

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    const key = slugify(label)
    if (!key) {
      return NextResponse.json({ error: 'Label must contain at least one letter or number' }, { status: 400 })
    }

    const existing = await prisma.preAssemblyVariable.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json(
        { error: `A measurement field with a matching key ("${key}") already exists: "${existing.label}"` },
        { status: 409 }
      )
    }

    const variable = await prisma.preAssemblyVariable.create({
      data: {
        key,
        label: label.trim(),
        unit: unit ? unit.trim() : null,
        group: group && group.trim() ? group.trim() : 'General',
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'PreAssemblyVariable',
        resourceId: variable.id,
        changes: variable
      }
    })

    return NextResponse.json(variable, { status: 201 })
  } catch (error) {
    console.error('POST /api/design/pre-assembly-variables error:', error)
    return NextResponse.json({ error: 'Failed to create measurement field' }, { status: 500 })
  }
}, ['DESIGN', 'CEO', 'ADMIN'])
