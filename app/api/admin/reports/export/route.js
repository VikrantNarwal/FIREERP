import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/admin/reports/export — downloads a plain-text report covering every order:
// customer details, product/variant, status, key dates (including dispatch/delivery),
// pricing, and every payment recorded against it.
//
// Auth note: this file lives outside the app's single catch-all router
// (app/api/[[...path]]/route.js) as its own dedicated route — Next.js matches this
// specific path first, so it works independently and doesn't need any change to that file.
// Since this project's auth uses a Bearer token from localStorage (not cookies), the
// frontend must call this with an Authorization header — a plain <a href> download link
// will NOT work here. See the button wiring in the admin dashboard for the correct approach.

import { verifyAccessToken } from '@/lib/auth'
import { formatDimensions } from '@/lib/utils'

function verifyAuth(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return verifyAccessToken(authHeader.substring(7))
}

export async function GET(request) {
  const user = verifyAuth(request)
  if (!user || !['ADMIN', 'CEO'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: {
      customer: true,
      product: true,
      salesPerson: { select: { firstName: true, lastName: true } },
      payments: { orderBy: { paymentDate: 'asc' } }
    },
    orderBy: { orderDate: 'desc' }
  })

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
  const fmtMoney = (n) => (n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—')

  const lines = []
  lines.push('='.repeat(70))
  lines.push('FIRE ERP — ORDERS, PAYMENTS & DISPATCH REPORT')
  lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
  lines.push(`Total orders: ${orders.length}`)
  lines.push('='.repeat(70))
  lines.push('')

  for (const o of orders) {
    lines.push('-'.repeat(70))
    lines.push(`JOB NUMBER: ${o.jobNumber}`)
    lines.push(`Status: ${o.status}    Priority: ${o.priority}`)
    lines.push('')
    lines.push('Customer:')
    lines.push(`  Name:    ${o.customer?.name || '—'}`)
    lines.push(`  Company: ${o.customer?.company || '—'}`)
    lines.push(`  Phone:   ${o.customer?.phone || '—'}`)
    lines.push(`  Email:   ${o.customer?.email || '—'}`)
    lines.push(`  Address: ${[o.customer?.address, o.customer?.city, o.customer?.state, o.customer?.pincode].filter(Boolean).join(', ') || '—'}`)
    lines.push('')
    lines.push('Product:')
    lines.push(`  ${o.product?.name || '—'}  (Variant: ${o.variant || '—'}, Qty: ${o.quantity})`)
    if (formatDimensions(o.dimensions)) {
      lines.push(`  Dimensions: ${formatDimensions(o.dimensions)}`)
    }
    lines.push('')
    lines.push('Dates:')
    lines.push(`  Order Date:      ${fmtDate(o.orderDate)}`)
    lines.push(`  Promised Date:   ${fmtDate(o.promisedDate)}`)
    // NOTE: this schema has no dedicated "dispatched at" timestamp field on Order.
    // deliveryDate is the closest existing field and is used here as "Dispatch/Delivery Date".
    // If you want a true dispatch timestamp captured at the moment status flips to
    // DISPATCHED, that needs a small schema addition — flag it if you want that built.
    lines.push(`  Dispatch/Delivery Date: ${fmtDate(o.deliveryDate)}`)
    lines.push('')
    lines.push('Pricing:')
    lines.push(`  Total Price:     ${fmtMoney(o.finalPrice ?? o.totalPrice)}`)
    lines.push(`  Advance Paid:    ${fmtMoney(o.advanceAmountPaid)}`)
    lines.push(`  Balance Due:     ${fmtMoney(o.balanceDue)}`)
    lines.push('')
    lines.push(`Sales Person: ${o.salesPerson ? `${o.salesPerson.firstName} ${o.salesPerson.lastName}` : '—'}`)
    lines.push('')
    if (o.payments.length > 0) {
      lines.push('Payments:')
      for (const p of o.payments) {
        lines.push(`  - ${fmtDate(p.paymentDate)}  ${fmtMoney(p.amount)}  [${p.paymentType}${p.paymentMode ? ' / ' + p.paymentMode : ''}]${p.transactionRef ? '  Ref: ' + p.transactionRef : ''}`)
      }
    } else {
      lines.push('Payments: none recorded')
    }
    lines.push('')
  }

  lines.push('='.repeat(70))
  lines.push('END OF REPORT')

  const content = lines.join('\n')
  const filename = `orders-report-${new Date().toISOString().slice(0, 10)}.txt`

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
