'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api'
import OrderHistory from '@/components/orders/OrderHistory'
import {
  getStageProgress, stageLabel, formatQuantity, formatDimensions, formatDate,
  formatDateTime, daysSincePosted, isImportant, isDispatched, remakeReasonLabel
} from '@/lib/utils'

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs text-slate-400">{label}</p>
    <div className="text-sm text-white break-words">{children ?? '—'}</div>
  </div>
)

const money = (v) => (v === null || v === undefined ? '—' : `₹${v}`)

// Read-only, COMPLETE view of one order: customer, product, money, every date,
// production stages, payments, documents, design measurements and the edit
// history. Safe for every role — nothing here can change the order.
export default function OrderDetailDialog({ orderId, open, onOpenChange, refreshKey = 0 }) {
  const [order, setOrder] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !orderId) return
    let cancelled = false
    setLoading(true)
    Promise.all([api.getOrder(orderId), api.getPayments(orderId).catch(() => [])])
      .then(([o, p]) => {
        if (cancelled) return
        setOrder(o)
        setPayments(Array.isArray(p) ? p : [])
      })
      .catch(() => { if (!cancelled) setOrder(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, orderId, refreshKey])

  const progress = order ? getStageProgress(order.productionStages) : null
  const measurements = order?.designMeasurements && typeof order.designMeasurements === 'object'
    ? Object.entries(order.designMeasurements)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order Details {order ? `— ${order.jobNumber}` : ''}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-slate-400">Loading...</p>}
        {!loading && !order && <p className="text-slate-400">Could not load this order.</p>}

        {!loading && order && (
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{order.status}</Badge>
              {isImportant(order) && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  IMPORTANT{order.autoImportantAt ? ' (auto)' : ''}
                </Badge>
              )}
              {isDispatched(order) && (
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">DISPATCHED</Badge>
              )}
              {order.needsRemake && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  Remake: {remakeReasonLabel(order.remakeReason)}
                </Badge>
              )}
              {!isDispatched(order) && order.status !== 'CANCELLED' && (
                <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/50">
                  Posted {daysSincePosted(order)} day(s) ago
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Customer">{order.customer?.name}</Field>
              <Field label="Phone">{order.customer?.phone}</Field>
              <Field label="City">{order.customer?.city}</Field>
              <Field label="Address">{order.customer?.address}</Field>
              <Field label="Product">{order.product?.name} {order.variant}</Field>
              <Field label="Quantity">{formatQuantity(order.quantity)}</Field>
              <Field label="Dimensions">{formatDimensions(order.dimensions)}</Field>
              <Field label="Flame colour">{order.flameColor}</Field>
              <Field label="Sales person">
                {order.salesPerson ? `${order.salesPerson.firstName} ${order.salesPerson.lastName}` : '—'}
              </Field>
            </div>

            <div>
              <p className="text-slate-200 font-medium mb-2">Money</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Unit price">{money(order.unitPrice)}</Field>
                <Field label="Total price">{money(order.totalPrice)}</Field>
                <Field label="Discount">{money(order.discount)}</Field>
                <Field label="Final price">{money(order.finalPrice)}</Field>
                <Field label="Advance paid">{money(order.advanceAmountPaid)}</Field>
                <Field label="Balance due">{money(order.balanceDue)}</Field>
              </div>
              {payments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs bg-slate-800 rounded px-3 py-2">
                      <span className="text-slate-300">
                        {p.paymentType} · {p.paymentMode || '—'}{p.transactionRef ? ` · ${p.transactionRef}` : ''}
                      </span>
                      <span className="text-slate-400">
                        ₹{p.amount} · {formatDate(p.paymentDate)}
                        {p.recordedBy ? ` · ${p.recordedBy.firstName}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-slate-200 font-medium mb-2">Dates</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Posted on">{formatDateTime(order.orderDate)}</Field>
                <Field label="Promised">{formatDate(order.promisedDate)}</Field>
                <Field label="Required">{formatDate(order.requiredDate)}</Field>
                <Field label="Design approved">{formatDate(order.designApprovedAt)}</Field>
                <Field label="Dispatched">{formatDate(order.dispatchDate)}</Field>
                <Field label="Delivered">{formatDate(order.deliveryDate)}</Field>
                <Field label="Installed">{formatDate(order.installationDate)}</Field>
              </div>
            </div>

            {(order.notes || order.internalNotes || order.customerNotes || order.delayReason) && (
              <div className="space-y-2">
                <p className="text-slate-200 font-medium">Notes</p>
                {order.notes && <Field label="Sales notes">{order.notes}</Field>}
                {order.customerNotes && <Field label="Customer notes">{order.customerNotes}</Field>}
                {order.internalNotes && <Field label="Internal notes">{order.internalNotes}</Field>}
                {order.delayReason && <Field label="Delay reason">{order.delayReason}</Field>}
              </div>
            )}

            {isDispatched(order) && (
              <div>
                <p className="text-slate-200 font-medium mb-2">Delivery outcome</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Delivered safely">
                    {order.deliveredSafely === true ? 'Yes' : order.deliveredSafely === false ? 'No — damaged' : 'Not known yet'}
                  </Field>
                  <Field label="Customer rating">
                    {order.customerReviewRating ? `${order.customerReviewRating}/5` : '—'}
                  </Field>
                  <Field label="Review notes">{order.customerReviewNotes}</Field>
                </div>
              </div>
            )}

            {measurements.length > 0 && (
              <div>
                <p className="text-slate-200 font-medium mb-2">Design measurements</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {measurements.map(([k, v]) => (
                    <div key={k} className="bg-slate-800 rounded px-3 py-2">
                      <p className="text-xs text-slate-400">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-white">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {progress && progress.total > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-200 font-medium">Production stages</p>
                  <p className="text-xs text-slate-400">{progress.completedCount}/{progress.total} complete</p>
                </div>
                <Progress value={progress.percent} className="h-1.5 mb-2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {order.productionStages.map((s) => (
                    <div key={s.id} className="flex justify-between text-xs bg-slate-800 rounded px-3 py-1.5">
                      <span className={s.status === 'COMPLETED' ? 'text-slate-400' : 'text-white'}>{stageLabel(s.stage)}</span>
                      <span className="text-slate-400">{s.status.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.documents?.length > 0 && (
              <div>
                <p className="text-slate-200 font-medium mb-2">Documents</p>
                <div className="space-y-1">
                  {order.documents.map((d) => (
                    <a
                      key={d.id}
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs bg-slate-800 rounded px-3 py-2 text-orange-300 hover:underline"
                    >
                      {d.type.replace(/_/g, ' ')} · {d.fileName}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <OrderHistory orderId={order.id} refreshKey={refreshKey} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
