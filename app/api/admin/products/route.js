import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'
import { DEFAULT_STAGE_TEMPLATE } from '@/lib/stageTemplates'

// GET /api/admin/products — list all products (incl. variant + stage count) for the admin page
export const GET = authMiddleware(async (request) => {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        stageTemplate: { include: { items: { orderBy: { sequence: 'asc' } } } },
        _count: { select: { orders: true, components: true } }
      }
    })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('GET /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}, ['ADMIN'])

// POST /api/admin/products — create a new product, optionally with its own stage list.
// Body: { name, type, variant, description?, basePrice?, stages?: [{ stageKey, label }] }
// If `stages` is omitted, the default 25-stage sequence is used so the product works immediately.
export const POST = authMiddleware(async (request) => {
  try {
    const body = await request.json()
    const { name, type, variant, description, basePrice, stages } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }
    if (!type) {
      return NextResponse.json({ error: 'Product type is required' }, { status: 400 })
    }
    if (!variant || !variant.trim()) {
      return NextResponse.json({ error: 'Variant is required' }, { status: 400 })
    }

    const stageList = Array.isArray(stages) && stages.length > 0 ? stages : DEFAULT_STAGE_TEMPLATE

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          type,
          variant: variant.trim(),
          description: description || null,
          basePrice: basePrice != null ? parseFloat(basePrice) : null
        }
      })

      const template = await tx.stageTemplate.create({
        data: { productId: created.id }
      })

      await tx.stageTemplateItem.createMany({
        data: stageList.map((s, idx) => ({
          templateId: template.id,
          stageKey: s.stageKey,
          label: s.label,
          sequence: idx + 1
        }))
      })

      await tx.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'CREATE',
          resource: 'Product',
          resourceId: created.id,
          changes: { name: created.name, type, variant }
        }
      })

      return created
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/products error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}, ['ADMIN'])
