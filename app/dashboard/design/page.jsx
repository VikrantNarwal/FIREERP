'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Ruler, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function DesignDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [measurements, setMeasurements] = useState({
    woodenLogLength: '',
    woodenLogWidth: '',
    flameSheetLength: '',
    flameSheetWidth: '',
    mirrorLength: '',
    mirrorWidth: '',
    nylonRodLength: '',
    ledStripLength: '',
    notes: ''
  })

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      const designOrders = (data || []).filter(o => 
        o.status === 'QUOTATION' || o.status === 'APPROVED' || o.status === 'IN_PRODUCTION'
      )
      setOrders(designOrders)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveDesign = async (orderId) => {
    try {
      await api.updateOrder(orderId, {
        status: 'APPROVED',
        designApprovedAt: new Date().toISOString()
      })
      toast.success('Design approved successfully!')
      loadOrders()
    } catch (error) {
      toast.error('Failed to approve design')
    }
  }

  const handleSaveMeasurements = async () => {
    if (!selectedOrder) return

    try {
      const measurementNotes = `
Design Measurements:
- Wooden Log: ${measurements.woodenLogLength}mm x ${measurements.woodenLogWidth}mm
- Flame Sheet: ${measurements.flameSheetLength}mm x ${measurements.flameSheetWidth}mm
- Mirror: ${measurements.mirrorLength}mm x ${measurements.mirrorWidth}mm
- Nylon Rod: ${measurements.nylonRodLength}mm
- LED Strip: ${measurements.ledStripLength}mm
${measurements.notes ? `\nNotes: ${measurements.notes}` : ''}
`.trim()

      await api.updateOrder(selectedOrder.id, {
        internalNotes: measurementNotes
      })
      
      toast.success('Measurements saved successfully!')
      loadOrders()
      setShowDetailDialog(false)
    } catch (error) {
      toast.error('Failed to save measurements')
    }
  }

  const columns = [
    {
      id: 'QUOTATION',
      title: 'New Quotations',
      icon: AlertCircle,
      color: 'text-blue-400',
      orders: orders.filter(o => o.status === 'QUOTATION')
    },
    {
      id: 'APPROVED',
      title: 'Design Approved',
      icon: CheckCircle,
      color: 'text-green-400',
      orders: orders.filter(o => o.status === 'APPROVED')
    },
    {
      id: 'IN_PRODUCTION',
      title: 'In Production',
      icon: Clock,
      color: 'text-purple-400',
      orders: orders.filter(o => o.status === 'IN_PRODUCTION')
    }
  ]

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-red-500 text-white',
      'HIGH': 'bg-orange-500 text-white',
      'NORMAL': 'bg-blue-500 text-white',
      'LOW': 'bg-slate-500 text-white'
    }
    return colors[priority] || colors['NORMAL']
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Design Dashboard</h1>
        <p className="text-slate-400 mt-1">Multi-task design board with priority sorting</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Active</p>
                <p className="text-3xl font-bold text-white">{orders.length}</p>
              </div>
              <Ruler className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {columns.map((col) => (
          <Card key={col.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{col.title}</p>
                  <p className="text-3xl font-bold text-white">{col.orders.length}</p>
                </div>
                <col.icon className={`w-8 h-8 ${col.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <Card key={column.id} className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <column.icon className={`w-5 h-5 ${column.color}`} />
                {column.title}
                <Badge variant="secondary" className="ml-auto">
                  {column.orders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {column.orders
                  .sort((a, b) => {
                    const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 }
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  })
                  .map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowDetailDialog(true)
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{order.customer?.name}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{order.variant}</span>
                        <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
                      </div>
                      {order.dimensions && (
                        <div className="mt-2 text-xs text-slate-400">
                          {order.dimensions.width}W × {order.dimensions.height}H × {order.dimensions.depth}D
                        </div>
                      )}
                    </div>
                  ))}
                {column.orders.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No orders in this stage
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Design Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Job Number</Label>
                  <p className="text-white font-semibold">{selectedOrder.jobNumber}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Customer</Label>
                  <p className="text-white">{selectedOrder.customer?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">Width</Label>
                  <p className="text-white">{selectedOrder.dimensions?.width || 0} mm</p>
                </div>
                <div>
                  <Label className="text-slate-400">Height</Label>
                  <p className="text-white">{selectedOrder.dimensions?.height || 0} mm</p>
                </div>
                <div>
                  <Label className="text-slate-400">Depth</Label>
                  <p className="text-white">{selectedOrder.dimensions?.depth || 0} mm</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Product</Label>
                <p className="text-white">{selectedOrder.product?.name} - {selectedOrder.variant}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label className="text-slate-400">Notes</Label>
                  <p className="text-white">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Measurement Inputs */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-white font-semibold mb-3">Pre-Assembly Measurements</h3>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400">Wooden Log Length (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.woodenLogLength}
                        onChange={(e) => setMeasurements({...measurements, woodenLogLength: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">Wooden Log Width (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.woodenLogWidth}
                        onChange={(e) => setMeasurements({...measurements, woodenLogWidth: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400">Flame Sheet Length (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.flameSheetLength}
                        onChange={(e) => setMeasurements({...measurements, flameSheetLength: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">Flame Sheet Width (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.flameSheetWidth}
                        onChange={(e) => setMeasurements({...measurements, flameSheetWidth: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400">Mirror Length (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.mirrorLength}
                        onChange={(e) => setMeasurements({...measurements, mirrorLength: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">Mirror Width (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.mirrorWidth}
                        onChange={(e) => setMeasurements({...measurements, mirrorWidth: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400">Nylon Rod Length (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.nylonRodLength}
                        onChange={(e) => setMeasurements({...measurements, nylonRodLength: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400">LED Strip Length (mm)</Label>
                      <Input
                        type="number"
                        value={measurements.ledStripLength}
                        onChange={(e) => setMeasurements({...measurements, ledStripLength: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-400">Additional Notes</Label>
                    <Textarea
                      value={measurements.notes}
                      onChange={(e) => setMeasurements({...measurements, notes: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="Any special instructions..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button
                  onClick={handleSaveMeasurements}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  Save Measurements
                </Button>
                {selectedOrder.status === 'QUOTATION' && (
                  <Button
                    onClick={() => {
                      handleApproveDesign(selectedOrder.id)
                      setShowDetailDialog(false)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Design
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
