'use client'

import { useEffect, useState } from 'react'
import { History, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

// Shows WHO changed an order, WHEN, and exactly WHAT changed (old → new).
// Used inside every order details window, for every role.
export default function OrderHistory({ orderId, refreshKey = 0 }) {
  const [history, setHistory] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setHistory(null)
    setError(false)
    api.get(`/orders/${orderId}/history`)
      .then((data) => { if (!cancelled) setHistory(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [orderId, refreshKey])

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-orange-400" />
        <p className="text-slate-200 font-medium">Edit History</p>
      </div>

      {error && <p className="text-sm text-red-400">Could not load history.</p>}
      {!error && history === null && <p className="text-sm text-slate-400">Loading history...</p>}
      {!error && history && history.length === 0 && (
        <p className="text-sm text-slate-400">No edits yet.</p>
      )}

      <div className="space-y-2">
        {(history || []).map((h) => (
          <div key={h.id} className="bg-slate-800 rounded-md p-3 border border-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
              <p className="text-sm text-white font-medium">
                {h.action === 'CREATE' ? 'Order posted' : h.action === 'DELETE' ? 'Order deleted' : 'Edited'}
                {' by '}
                {h.auto ? 'System (automatic)' : h.by}
                {h.role && !h.auto ? <span className="text-slate-400 font-normal"> · {h.role}</span> : null}
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(h.at)}</p>
            </div>
            {h.diff.length > 0 && (
              <ul className="space-y-1">
                {h.diff.map((d, i) => (
                  <li key={i} className="text-xs text-slate-300 flex flex-wrap items-center gap-1">
                    <span className="text-slate-400">{d.label}:</span>
                    <span className="line-through text-red-300/80 break-all">{d.from}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-green-300 break-all">{d.to}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
