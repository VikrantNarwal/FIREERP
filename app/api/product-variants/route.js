import { NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'

// GET /api/product-variants — active variants only, readable by any logged-in role.
// Used by the Sales "New Order" form and the Admin "Add Product" form dropdown.
export const GET = authMiddleware(async () => {
  try {
    const variants = await prisma.productVariantOption.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' }
    })
    return NextResponse.json({ variants })
  } catch (error) {
    console.error('GET /api/product-variants error:', error)
    return NextResponse.json({ error: 'Failed to load variants' }, { status: 500 })
  }
}, [])
