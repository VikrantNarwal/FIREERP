'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { getStageProgress, stageLabel } from '@/lib/utils'

export default function ProductionDashboard() {
  const [orders, setOrders] = useState([])
  const [variables, setVariables] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showStageDialog, setShowStageDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
    loadVariables()
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      const productionOrders = (data || []).filter(o =>
        ['APPROVED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED'].includes(o.status)
      )
      setOrders(productionOrders)
      // Keep the open dialog's data in sync with the latest fetch (e.g. after a stage update)
      if (selectedOrder) {
        const refreshed = productionOrders.find(o => o.id === selectedOrder.id)
        if (refreshed) setSelectedOrder(refreshed)
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  // Design's measurement field definitions — used to label whatever values Design
  // has saved on the order. Readable by every role; only Design/CEO/Admin can edit them.
  const loadVariables = async () => {
    try {
      const data = await api.getPreAssemblyVariables()
      setVariables(Array.isArray(data) ? data : [])
    } catch (error) {
      // Non-fatal — measurements section just won't show labels if this fails
      console.error('Failed to load measurement field definitions', error)
    }
  }

  const variableMap = variables.reduce((acc, v) => { acc[v.key] = v; return acc }, {})

  const getDesignMeasurements = (order) => {
    const values = order?.designMeasurements
    if (!values || typeof values !== 'object' || Object.keys(values).length === 0) return []
    return Object.entries(values)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => ({
        key,
        value,
        label: variableMap[key]?.label || stageLabel(key),
        unit: variableMap[key]?.unit || '',
        group: variableMap[key]?.group || 'General'
      }))
  }

  // Immediate, single-stage save — same proven pattern used on the Admin Orders page.
  // Every change is its own request, so there is no "Save Changes" step that can
  // silently no-op: either this toast fires with a real error, or the stage is updated.
  // The order's overall status (APPROVED -> IN_PRODUCTION -> QC_PENDING, and back if a
  // completed stage is reopened) is now kept in sync server-side, atomically, inside the
  // same request that updates the stage — so a plain reload here is enough to pick it up.
  const handleStageStatusChange = async (stage, newStatus) => {
    try {
      await api.updateProductionStage(stage.id, { status: newStatus })
      toast.success('Stage updated')
      await loadOrders()
    } catch (error) {
      toast.error(error.message || 'Failed to update stage')
    }
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Production Dashboard</h1>
        <p className="text-slate-400 mt-1">Multi-stage parallel processing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Active Orders</p>
            <p className="text-3xl font-bold text-white">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">In Production</p>
            <p className="text-3xl font-bold text-white">
              {orders.filter(o => o.status === 'IN_PRODUCTION').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">QC Pending</p>
            <p className="text-3xl font-bold text-white">
              {orders.filter(o => o.status === 'QC_PENDING').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Urgent Orders</p>
            <p className="text-3xl font-bold text-red-400">
              {orders.filter(o => o.priority === 'URGENT').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Orders Section */}
      {orders.filter(o => o.priority === 'URGENT').length > 0 && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              VERY URGENT ORDERS - CEO Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.filter(o => o.priority === 'URGENT').map(order => (
                <div key={order.id} className="p-3 bg-slate-900 rounded-lg border border-red-500/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                      <p className="text-sm text-slate-400">{order.customer?.name}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => { setSelectedOrder(order); setShowStageDialog(true) }}
                    >
                      Work on This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Orders */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Production Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map(order => {
              const progress = getStageProgress(order.productionStages)
              const measurements = getDesignMeasurements(order)

              return (
                <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold text-lg">{order.jobNumber}</h3>
                        {order.priority === 'URGENT' && (
                          <Badge className="bg-red-500 text-white animate-pulse">VERY URGENT</Badge>
                        )}
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{order.customer?.name} - {order.product?.name}</p>

                      {/* Progress Bar — driven by the order's real stage rows */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{progress.completedCount}/{progress.total} stages</span>
                        </div>
                        <Progress value={progress.percent} className="h-2" />
                        {progress.remaining.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Next: {stageLabel(progress.nextStage?.stage)}
                          </p>
                        )}
                      </div>

                      {/* Sales Notes — carried over from the order Sales created; Design and
                          Production both need to see whatever Sales attached to the order. */}
                      {order.notes && (
                        <div className="mt-2 p-2 bg-slate-700/30 border border-slate-600 rounded text-xs">
                          <span className="font-semibold text-slate-300">Sales Notes: </span>
                          <span className="text-slate-300">{order.notes}</span>
                        </div>
                      )}

                      {/* Designer Measurements — structured, from Design's dashboard */}
                      {measurements.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
                          <div className="flex items-center gap-2 mb-1 text-blue-400">
                            <Ruler className="w-3 h-3" />
                            <span className="font-semibold">Designer Measurements:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 text-slate-300">
                            {measurements.map(m => (
                              <span key={m.key}>{m.label}: {m.value}{m.unit ? ` ${m.unit}` : ''}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => { setSelectedOrder(order); setShowStageDialog(true) }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Update Stages
                    </Button>
                  </div>
                </div>
              )
            })}
            {orders.length === 0 && (
              <div className="text-center py-8 text-slate-500">No active production orders</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stage Update Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Production Stages - {selectedOrder?.jobNumber}</DialogTitle>
            <p className="text-sm text-slate-400">Each change saves immediately — no separate "Save" step needed.</p>
          </DialogHeader>

          {selectedOrder && (() => {
            const progress = getStageProgress(selectedOrder.productionStages)
            const measurements = getDesignMeasurements(selectedOrder)

            return (
              <div className="space-y-6">
                {/* Sales Notes */}
                {selectedOrder.notes && (
                  <div className="p-4 bg-slate-800 border border-slate-700 rounded">
                    <h3 className="font-semibold text-slate-300 mb-2">Sales Notes</h3>
                    <p className="text-sm text-slate-300">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Designer Measurements */}
                {measurements.length > 0 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                    <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                      <Ruler className="w-4 h-4" />
                      Designer Specifications
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                      {measurements.map(m => (
                        <div key={m.key}>
                          <span className="text-slate-400">{m.label}:</span>
                          <span className="ml-2 font-semibold">{m.value}{m.unit ? ` ${m.unit}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress summary */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-300 font-medium">Production Stages</p>
                    <p className="text-xs text-slate-400">{progress.completedCount}/{progress.total} complete</p>
                  </div>
                  <Progress value={progress.percent} className="h-1.5 mb-3" />
                  {progress.remaining.length > 0 && (
                    <p className="text-xs text-slate-500 mb-3">
                      Remaining ({progress.remainingCount}): {progress.remaining.map(s => stageLabel(s.stage)).join(', ')}
                    </p>
                  )}

                  {/* Real stage rows for THIS order/product — never a hardcoded list,
                      so this always matches whatever Admin has configured for this product. */}
                  <div className="space-y-2">
                    {progress.completed.concat(progress.remaining)
                      .sort((a, b) => a.sequence - b.sequence)
                      .map(stage => (
                        <div key={stage.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                          <span className={`text-sm ${stage.status === 'COMPLETED' ? 'text-slate-400' : 'text-white'}`}>
                            {stageLabel(stage.stage)}
                            {stage.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 inline ml-2 text-green-400" />}
                          </span>
                          <Select
                            value={stage.status}
                            onValueChange={(newStatus) => handleStageStatusChange(stage, newStatus)}
                          >
                            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                              <SelectItem value="FAILED">Failed</SelectItem>
                              <SelectItem value="SKIPPED">Skipped</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    {progress.total === 0 && (
                      <p className="text-sm text-slate-500">This order has no production stages yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <Button variant="outline" onClick={() => setShowStageDialog(false)}>Close</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
