import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// PUT /api/admin/products/:id — rename / edit a product (name, variant, description, basePrice)
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { name, variant, description, basePrice } = body

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const data = {}
    if (name != null) {
      if (!name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      data.name = name.trim()
    }
    if (variant != null) {
      if (!variant.trim()) return NextResponse.json({ error: 'Variant cannot be empty' }, { status: 400 })
      data.variant = variant.trim()
    }
    if (description !== undefined) data.description = description
    if (basePrice !== undefined) data.basePrice = basePrice != null ? parseFloat(basePrice) : null

    const updated = await prisma.product.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'UPDATE',
        resource: 'Product',
        resourceId: id,
        changes: { before: existing, after: updated }
      }
    })

    return NextResponse.json({ product: updated })
  } catch (error) {
    console.error('PUT /api/admin/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}, ['ADMIN'])

// DELETE /api/admin/products/:id — soft delete (matches your existing soft-delete convention;
// blocked if the product has real orders against it, so history is never silently orphaned)
export const DELETE = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } }
    })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (existing._count.orders > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${existing._count.orders} order(s) reference this product. Remove/reassign them first, or the order history would break.` },
        { status: 409 }
      )
    }

    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'DELETE',
        resource: 'Product',
        resourceId: id,
        changes: { name: existing.name }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/products/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}, ['ADMIN'])
