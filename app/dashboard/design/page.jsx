'use client'

import { useState, useEffect } from 'react'
import { Ruler, Save, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function DesignPage() {
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState('')
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders({ status: 'QUOTATION' })
      setOrders(data)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMeasurements = async () => {
    if (!selectedOrder) {
      toast.error('Please select an order')
      return
    }

    try {
      // Save measurements as order notes and approve for production
      const measurementsText = `
DESIGN MEASUREMENTS:
Wooden Log: ${measurements.woodenLogLength}mm x ${measurements.woodenLogWidth}mm
Flame Sheet: ${measurements.flameSheetLength}mm x ${measurements.flameSheetWidth}mm
Mirror: ${measurements.mirrorLength}mm x ${measurements.mirrorWidth}mm
Nylon Rod: ${measurements.nylonRodLength}mm
LED Strip: ${measurements.ledStripLength}mm
Notes: ${measurements.notes}`

      await api.updateOrder(selectedOrder, {
        status: 'APPROVED',
        designApprovedBy: JSON.parse(localStorage.getItem('user')).id,
        designApprovedAt: new Date().toISOString(),
        internalNotes: measurementsText
      })

      toast.success('Measurements saved! Order approved for production.')
      
      // Reset form
      setSelectedOrder('')
      setMeasurements({
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
      
      loadOrders()
    } catch (error) {
      toast.error('Failed to save measurements')
    }
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Design & Measurements</h1>
        <p className="text-slate-400 text-sm mt-1">Enter production measurements for orders</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Pending Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No pending orders for design approval</p>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="p-3 bg-slate-800 rounded flex items-center justify-between">
                  <div>
                    <span className="text-white font-semibold">{order.jobNumber}</span>
                    <span className="text-slate-400 text-sm ml-3">{order.customer?.name}</span>
                  </div>
                  <span className="text-slate-400 text-sm">{order.product?.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Ruler className="w-5 h-5" />
            Enter Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Select Order</Label>
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Choose an order" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {orders.map(order => (
                  <SelectItem key={order.id} value={order.id} className="text-white">
                    {order.jobNumber} - {order.customer?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <h3 className="text-white font-semibold mb-3">Component Measurements</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Wooden Log Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.woodenLogLength}
                  onChange={(e) => setMeasurements({...measurements, woodenLogLength: e.target.value})}
                  placeholder="e.g., 150"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Wooden Log Width (mm)</Label>
                <Input
                  type="number"
                  value={measurements.woodenLogWidth}
                  onChange={(e) => setMeasurements({...measurements, woodenLogWidth: e.target.value})}
                  placeholder="e.g., 30"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-white">Flame Sheet Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.flameSheetLength}
                  onChange={(e) => setMeasurements({...measurements, flameSheetLength: e.target.value})}
                  placeholder="e.g., 1000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Flame Sheet Width (mm)</Label>
                <Input
                  type="number"
                  value={measurements.flameSheetWidth}
                  onChange={(e) => setMeasurements({...measurements, flameSheetWidth: e.target.value})}
                  placeholder="e.g., 600"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-white">Mirror Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.mirrorLength}
                  onChange={(e) => setMeasurements({...measurements, mirrorLength: e.target.value})}
                  placeholder="e.g., 950"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Mirror Width (mm)</Label>
                <Input
                  type="number"
                  value={measurements.mirrorWidth}
                  onChange={(e) => setMeasurements({...measurements, mirrorWidth: e.target.value})}
                  placeholder="e.g., 550"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-white">Nylon Rod Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.nylonRodLength}
                  onChange={(e) => setMeasurements({...measurements, nylonRodLength: e.target.value})}
                  placeholder="e.g., 800"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">LED Strip Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.ledStripLength}
                  onChange={(e) => setMeasurements({...measurements, ledStripLength: e.target.value})}
                  placeholder="e.g., 5000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-white">Additional Notes</Label>
              <Textarea
                value={measurements.notes}
                onChange={(e) => setMeasurements({...measurements, notes: e.target.value})}
                placeholder="Any special instructions for production..."
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button onClick={handleSaveMeasurements} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save & Approve for Production
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
