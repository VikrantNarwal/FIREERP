'use client'

import { useState } from 'react'
import { Truck, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getStageProgress, formatQuantity } from '@/lib/utils'

// One-click "send to Dispatched Items" for Sales and Production.
// Asks for a confirmation first (a dispatch is visible to every team and
// stamps the dispatch date), warns when the order is not production-complete,
// then calls POST /api/orders/:id/dispatch. The parent gets the updated order
// back through onDispatched so it can move it into its Dispatched Items list.
export default function DispatchButton({ order, onDispatched, size = 'sm', className = '', fullWidthOnMobile = false }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!order) return null

  const progress = getStageProgress(order.productionStages)
  const stagesOpen = progress.total > 0 && progress.remainingCount > 0
  const notApproved = order.status === 'QUOTATION'
  const isRemake = !!order.needsRemake
  const label = isRemake ? 'Dispatch Again' : 'Dispatch'

  const confirmDispatch = async () => {
    setBusy(true)
    try {
      const updated = await api.dispatchOrder(order.id)
      toast.success(`${order.jobNumber} moved to Dispatched Items`)
      setOpen(false)
      if (onDispatched) onDispatched(updated)
    } catch (error) {
      toast.error(error.message || 'Failed to dispatch order')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        size={size}
        className={`gap-2 bg-indigo-600 hover:bg-indigo-700 text-white ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} ${className}`}
        onClick={() => setOpen(true)}
        data-testid={`dispatch-btn-${order.jobNumber}`}
      >
        <Truck className="w-4 h-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v) }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              {isRemake ? 'Dispatch remade order?' : 'Send to Dispatched Items?'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {order.jobNumber} · {order.customer?.name || 'Customer'} · {formatQuantity(order.quantity)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              The order will be marked <span className="font-semibold text-indigo-300">DISPATCHED</span> with
              today&apos;s date and move to the Dispatched Items box for every team.
            </p>
            {isRemake && (
              <p className="text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded p-2">
                This order was flagged for a remake. Dispatching it again clears the remake flag.
              </p>
            )}
            {(stagesOpen || notApproved) && (
              <div className="flex items-start gap-2 text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  {notApproved
                    ? 'This order is still a quotation. '
                    : ''}
                  {stagesOpen
                    ? `${progress.remainingCount} of ${progress.total} production stages are not completed yet. `
                    : ''}
                  Dispatch anyway only if it has really left the factory.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" className="border-slate-700 text-slate-200" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" disabled={busy} onClick={confirmDispatch}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              {busy ? 'Dispatching...' : 'Yes, Dispatch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
