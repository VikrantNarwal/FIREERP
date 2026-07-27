import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// GET /api/admin/products/:id/stages — ordered stage list for one product
export const GET = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const template = await prisma.stageTemplate.findUnique({
      where: { productId: id },
      include: { items: { orderBy: { sequence: 'asc' } } }
    })
    if (!template) {
      return NextResponse.json({ error: 'No stage template found for this product' }, { status: 404 })
    }
    return NextResponse.json({ template })
  } catch (error) {
    console.error('GET /api/admin/products/[id]/stages error:', error)
    return NextResponse.json({ error: 'Failed to load stage template' }, { status: 500 })
  }
}, ['ADMIN'])

// PUT /api/admin/products/:id/stages — replace the full ordered stage list in one atomic call.
// This is how Admin adds, deletes, renames, and reorders stages — send the whole new list,
// in the order they should run.
// Body: { stages: [{ stageKey, label }, ...] }   (array order = production sequence)
//
// IMPORTANT SAFETY NOTE (read before wiring the UI): this only changes the TEMPLATE used for
// FUTURE orders of this product. Orders already in production keep their existing
// ProductionStage rows untouched — editing a template never rewrites history.
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { stages } = body

    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: 'At least one production stage is required' }, { status: 400 })
    }
    for (const s of stages) {
      if (!s.stageKey || !s.stageKey.trim() || !s.label || !s.label.trim()) {
        return NextResponse.json({ error: 'Every stage needs both a key and a label' }, { status: 400 })
      }
    }
    const keys = stages.map(s => s.stageKey.trim().toUpperCase())
    if (new Set(keys).size !== keys.length) {
      return NextResponse.json({ error: 'Stage keys must be unique within a product' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product || product.deletedAt) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.stageTemplate.upsert({
        where: { productId: id },
        update: {},
        create: { productId: id }
      })

      await tx.stageTemplateItem.deleteMany({ where: { templateId: template.id } })

      await tx.stageTemplateItem.createMany({
        data: stages.map((s, idx) => ({
          templateId: template.id,
          stageKey: s.stageKey.trim().toUpperCase().replace(/\s+/g, '_'),
          label: s.label.trim(),
          sequence: idx + 1
        }))
      })

      await tx.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'UPDATE',
          resource: 'StageTemplate',
          resourceId: template.id,
          changes: { productId: id, stageCount: stages.length }
        }
      })

      return tx.stageTemplate.findUnique({
        where: { id: template.id },
        include: { items: { orderBy: { sequence: 'asc' } } }
      })
    })

    return NextResponse.json({ template: result })
  } catch (error) {
    console.error('PUT /api/admin/products/[id]/stages error:', error)
    return NextResponse.json({ error: 'Failed to update stage template' }, { status: 500 })
  }
}, ['ADMIN'])
