import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// PUT /api/admin/variants/:id — rename a variant, or toggle it active/inactive.
// Body: { label?, isActive? }
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { label, isActive } = body

    const existing = await prisma.productVariantOption.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    const data = {}
    if (label != null) {
      if (!label.trim()) return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 })
      data.label = label.trim()
    }
    if (isActive != null) data.isActive = !!isActive

    const updated = await prisma.productVariantOption.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'ProductVariantOption',
        resourceId: id,
        changes: { before: existing, after: updated }
      }
    })

    return NextResponse.json({ variant: updated })
  } catch (error) {
    console.error('PUT /api/admin/variants/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 })
  }
}, ['ADMIN'])

// DELETE /api/admin/variants/:id — hard delete only if unused by any product;
// otherwise tells the admin to deactivate instead (safer for a live system).
export const DELETE = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const existing = await prisma.productVariantOption.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    const inUse = await prisma.product.count({
      where: { variant: existing.code, deletedAt: null }
    })

    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `"${existing.label}" is used by ${inUse} product(s). Deactivate it instead of deleting so existing products keep working — use PUT with { "isActive": false }.`
        },
        { status: 409 }
      )
    }

    await prisma.productVariantOption.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'ProductVariantOption',
        resourceId: id,
        changes: { code: existing.code, label: existing.label }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/variants/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 })
  }
}, ['ADMIN'])
