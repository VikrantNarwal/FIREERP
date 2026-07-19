'use client'

import { useState, useEffect } from 'react'
import { Ruler, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function DesignerPage() {
  const [orders, setOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
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

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId)
      setSelectedOrder(order)
      // Load existing measurements if any
      if (order?.internalNotes) {
        parseExistingMeasurements(order.internalNotes)
      } else {
        resetMeasurements()
      }
    }
  }, [selectedOrderId, orders])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      // Show quotations and approved orders
      const designOrders = (data || []).filter(o => 
        o.status === 'QUOTATION' || o.status === 'APPROVED'
      )
      setOrders(designOrders)
      
      // Auto-select first order
      if (designOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(designOrders[0].id)
      }
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const parseExistingMeasurements = (notes) => {
    // Try to extract measurements from notes
    const woodLogMatch = notes.match(/Wooden Log: (\d+)mm x (\d+)mm/)
    const flameMatch = notes.match(/Flame Sheet: (\d+)mm x (\d+)mm/)
    const mirrorMatch = notes.match(/Mirror: (\d+)mm x (\d+)mm/)
    const nylonMatch = notes.match(/Nylon Rod: (\d+)mm/)
    const ledMatch = notes.match(/LED Strip: (\d+)mm/)
    
    if (woodLogMatch || flameMatch) {
      setMeasurements({
        woodenLogLength: woodLogMatch ? woodLogMatch[1] : '',
        woodenLogWidth: woodLogMatch ? woodLogMatch[2] : '',
        flameSheetLength: flameMatch ? flameMatch[1] : '',
        flameSheetWidth: flameMatch ? flameMatch[2] : '',
        mirrorLength: mirrorMatch ? mirrorMatch[1] : '',
        mirrorWidth: mirrorMatch ? mirrorMatch[2] : '',
        nylonRodLength: nylonMatch ? nylonMatch[1] : '',
        ledStripLength: ledMatch ? ledMatch[1] : '',
        notes: ''
      })
    }
  }

  const resetMeasurements = () => {
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
  }

  const handleSave = async (approveForProduction = false) => {
    if (!selectedOrderId) {
      toast.error('Please select an order')
      return
    }

    // Check if at least some measurements are filled
    const hasData = Object.values(measurements).some(v => v && v.toString().trim() !== '')
    if (!hasData) {
      toast.error('Please enter at least some measurements')
      return
    }

    try {
      const measurementsText = `
DESIGN MEASUREMENTS:
Wooden Log: ${measurements.woodenLogLength}mm x ${measurements.woodenLogWidth}mm
Flame Sheet: ${measurements.flameSheetLength}mm x ${measurements.flameSheetWidth}mm
Mirror: ${measurements.mirrorLength}mm x ${measurements.mirrorWidth}mm
Nylon Rod: ${measurements.nylonRodLength}mm
LED Strip: ${measurements.ledStripLength}mm
Additional Notes: ${measurements.notes}
      `.trim()

      const updateData = {
        internalNotes: measurementsText
      }

      if (approveForProduction) {
        updateData.status = 'APPROVED'
        updateData.designApprovedBy = JSON.parse(localStorage.getItem('user')).id
        updateData.designApprovedAt = new Date().toISOString()
      }

      await api.updateOrder(selectedOrderId, updateData)

      if (approveForProduction) {
        toast.success('✅ Measurements saved & Order approved for production!')
      } else {
        toast.success('✅ Measurements saved successfully!')
      }
      
      // Reload to update status
      await loadOrders()
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  const handleUpdateField = (field, value) => {
    setMeasurements(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-2">No orders pending design approval</div>
        <div className="text-sm text-slate-500">All orders are either approved or in production</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Design & Measurements</h1>
        <p className="text-slate-400 text-sm mt-1">Enter production specifications and approve orders</p>
      </div>

      {/* Order Selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Select Order</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-lg h-12">
              <SelectValue placeholder="Choose an order" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {orders.map(order => (
                <SelectItem key={order.id} value={order.id} className="text-white text-base py-3">
                  {order.jobNumber} - {order.customer?.name} - {order.product?.name}
                  {order.status === 'APPROVED' && ' ✓ Approved'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedOrder && (
            <div className="mt-4 p-4 bg-slate-800 rounded">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">Job Number:</span>
                  <span className="text-white font-semibold ml-2">{selectedOrder.jobNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white ml-2">{selectedOrder.customer?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Product:</span>
                  <span className="text-white ml-2">{selectedOrder.product?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                    selectedOrder.status === 'APPROVED' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Measurements Form */}
      {selectedOrderId && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Pre-Assembly Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wooden Log */}
            <div>
              <Label className="text-white text-base mb-3 block">Wooden Log Dimensions</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Length (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.woodenLogLength}
                    onChange={(e) => handleUpdateField('woodenLogLength', e.target.value)}
                    placeholder="e.g., 150"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Width (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.woodenLogWidth}
                    onChange={(e) => handleUpdateField('woodenLogWidth', e.target.value)}
                    placeholder="e.g., 30"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
              </div>
            </div>

            {/* Flame Sheet */}
            <div>
              <Label className="text-white text-base mb-3 block">Flame Sheet Dimensions</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Length (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.flameSheetLength}
                    onChange={(e) => handleUpdateField('flameSheetLength', e.target.value)}
                    placeholder="e.g., 1000"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Width (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.flameSheetWidth}
                    onChange={(e) => handleUpdateField('flameSheetWidth', e.target.value)}
                    placeholder="e.g., 600"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
              </div>
            </div>

            {/* Mirror */}
            <div>
              <Label className="text-white text-base mb-3 block">Mirror Dimensions</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Length (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.mirrorLength}
                    onChange={(e) => handleUpdateField('mirrorLength', e.target.value)}
                    placeholder="e.g., 950"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Width (mm)</Label>
                  <Input
                    type="number"
                    value={measurements.mirrorWidth}
                    onChange={(e) => handleUpdateField('mirrorWidth', e.target.value)}
                    placeholder="e.g., 550"
                    className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                  />
                </div>
              </div>
            </div>

            {/* Other Measurements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Nylon Rod Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.nylonRodLength}
                  onChange={(e) => handleUpdateField('nylonRodLength', e.target.value)}
                  placeholder="e.g., 800"
                  className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">LED Strip Length (mm)</Label>
                <Input
                  type="number"
                  value={measurements.ledStripLength}
                  onChange={(e) => handleUpdateField('ledStripLength', e.target.value)}
                  placeholder="e.g., 5000"
                  className="bg-slate-800 border-slate-700 text-white text-lg h-12"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-white">Additional Notes</Label>
              <Textarea
                value={measurements.notes}
                onChange={(e) => handleUpdateField('notes', e.target.value)}
                placeholder="Any special instructions for production..."
                className="bg-slate-800 border-slate-700 text-white min-h-24"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
              <Button 
                onClick={() => handleSave(false)} 
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-800"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Measurements
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                className="bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save & Approve for Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
