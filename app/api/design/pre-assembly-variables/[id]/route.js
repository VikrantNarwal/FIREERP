import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// PUT /api/design/pre-assembly-variables/:id — rename/relabel/reorder/deactivate.
// Body: { label?, unit?, group?, sortOrder?, isActive? }
// Note: the "key" never changes after creation (values already saved on orders are
// keyed by it) — rename the label freely, the underlying key stays stable.
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const body = await request.json()

    const existing = await prisma.preAssemblyVariable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Measurement field not found' }, { status: 404 })
    }

    const data = {}
    if (body.label != null) {
      if (!body.label.trim()) return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 })
      data.label = body.label.trim()
    }
    if (body.unit !== undefined) data.unit = body.unit ? body.unit.trim() : null
    if (body.group !== undefined) data.group = body.group && body.group.trim() ? body.group.trim() : 'General'
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0
    if (body.isActive !== undefined) data.isActive = !!body.isActive

    const variable = await prisma.preAssemblyVariable.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'PreAssemblyVariable',
        resourceId: id,
        changes: { before: existing, after: variable }
      }
    })

    return NextResponse.json(variable)
  } catch (error) {
    console.error('PUT /api/design/pre-assembly-variables/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update measurement field' }, { status: 500 })
  }
}, ['DESIGN', 'CEO', 'ADMIN'])

// DELETE /api/design/pre-assembly-variables/:id — permanently removes the field
// definition. Values already saved under this key on existing orders are left as-is
// in Order.designMeasurements (harmless orphaned data, not shown once the field
// definition is gone) — Design can always re-add the same label later.
export const DELETE = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const existing = await prisma.preAssemblyVariable.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Measurement field not found' }, { status: 404 })
    }

    await prisma.preAssemblyVariable.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'PreAssemblyVariable',
        resourceId: id,
        changes: { key: existing.key, label: existing.label }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/design/pre-assembly-variables/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete measurement field' }, { status: 500 })
  }
}, ['DESIGN', 'CEO', 'ADMIN'])
