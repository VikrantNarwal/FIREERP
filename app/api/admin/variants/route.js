import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// GET /api/admin/variants — full list including inactive (admin management view)
export const GET = authMiddleware(async () => {
  try {
    const variants = await prisma.productVariantOption.findMany({ orderBy: { label: 'asc' } })
    return NextResponse.json({ variants })
  } catch (error) {
    console.error('GET /api/admin/variants error:', error)
    return NextResponse.json({ error: 'Failed to load variants' }, { status: 500 })
  }
}, ['ADMIN'])

// POST /api/admin/variants — add a new variant option
// Body: { code, label }   e.g. { code: "EFX", label: "E.F.X. Premium" }
export const POST = authMiddleware(async (request) => {
  try {
    const body = await request.json()
    const { code, label } = body

    if (!code || !code.trim() || !label || !label.trim()) {
      return NextResponse.json({ error: 'Both code and label are required' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_')

    const exists = await prisma.productVariantOption.findUnique({ where: { code: cleanCode } })
    if (exists) {
      return NextResponse.json({ error: `Variant code "${cleanCode}" already exists` }, { status: 409 })
    }

    const variant = await prisma.productVariantOption.create({
      data: { code: cleanCode, label: label.trim() }
    })

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'CREATE',
        resource: 'ProductVariantOption',
        resourceId: variant.id,
        changes: { code: variant.code, label: variant.label }
      }
    })

    return NextResponse.json({ variant }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/variants error:', error)
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 })
  }
}, ['ADMIN'])
