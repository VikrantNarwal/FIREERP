'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Ruler, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

const PRODUCTION_STAGES = [
  { id: 'LASER_CUTTING', name: 'Laser Cutting', group: 'Metal Work' },
  { id: 'BENDING', name: 'Bending', group: 'Metal Work' },
  { id: 'WELDING', name: 'Welding', group: 'Metal Work' },
  { id: 'GRINDING_BUFFING', name: 'Grinding & Buffing', group: 'Metal Work' },
  { id: 'POWDER_COATING', name: 'Powder Coating', group: 'Metal Work' },
  { id: 'INCOMING_QC', name: 'Incoming QC', group: 'Quality' },
  { id: 'WOODEN_LOG_PREP', name: 'Wooden Log Prep', group: 'Assembly Prep' },
  { id: 'FLAME_SHEET_PREP', name: 'Flame Sheet Prep', group: 'Assembly Prep' },
  { id: 'MIRROR_CUTTING', name: 'Mirror Cutting', group: 'Assembly Prep' },
  { id: 'LIGHT_ASSEMBLY', name: 'Light Assembly', group: 'Electronics' },
  { id: 'STEPPER_MOTOR_ASSEMBLY', name: 'Stepper Motor', group: 'Electronics' },
  { id: 'PCB_PREPARATION', name: 'PCB Preparation', group: 'Electronics' },
  { id: 'SPEAKER_ASSEMBLY', name: 'Speaker Assembly', group: 'Electronics' },
  { id: 'HEATER_ASSEMBLY', name: 'Heater Assembly', group: 'Electronics' },
  { id: 'MAIN_ASSEMBLY', name: 'Main Assembly', group: 'Final Assembly' },
  { id: 'WIRING', name: 'Wiring & Connections', group: 'Final Assembly' },
  { id: 'FUNCTIONAL_TESTING', name: 'Functional Testing', group: 'Testing' },
  { id: 'BURN_IN_TEST', name: 'Burn-in Test', group: 'Testing' },
  { id: 'FINAL_QC', name: 'Final QC', group: 'Quality' },
  { id: 'PACKAGING', name: 'Packaging', group: 'Dispatch' }
]

export default function ProductionDashboard() {
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showStageDialog, setShowStageDialog] = useState(false)
  const [selectedStages, setSelectedStages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
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
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStages = async () => {
    if (selectedStages.length === 0) {
      toast.error('Please select at least one stage')
      return
    }

    try {
      // Update multiple stages simultaneously
      const order = await api.getOrder(selectedOrder.id)
      const stagesToUpdate = order.productionStages.filter(ps => 
        selectedStages.includes(ps.stage)
      )

      await Promise.all(
        stagesToUpdate.map(stage => 
          api.updateProductionStage(stage.id, {
            status: 'COMPLETED',
            actualEndDate: new Date().toISOString()
          })
        )
      )

      // Update order status if needed
      const allCompleted = order.productionStages.every(ps => 
        ps.status === 'COMPLETED' || selectedStages.includes(ps.stage)
      )
      
      if (allCompleted) {
        await api.updateOrder(selectedOrder.id, { status: 'QC_PENDING' })
      } else {
        await api.updateOrder(selectedOrder.id, { status: 'IN_PRODUCTION' })
      }

      toast.success(`${selectedStages.length} stages marked as completed`)
      setShowStageDialog(false)
      setSelectedStages([])
      loadOrders()
    } catch (error) {
      toast.error('Failed to update stages')
    }
  }

  const toggleStage = (stageId) => {
    setSelectedStages(prev => 
      prev.includes(stageId) 
        ? prev.filter(s => s !== stageId)
        : [...prev, stageId]
    )
  }

  const parseDesignerMeasurements = (internalNotes) => {
    if (!internalNotes) return null
    
    const lines = internalNotes.split('\n')
    const measurements = {}
    
    lines.forEach(line => {
      if (line.includes('Wooden Log:')) measurements.woodenLog = line.split(':')[1]?.trim()
      if (line.includes('Flame Sheet:')) measurements.flameSheet = line.split(':')[1]?.trim()
      if (line.includes('Mirror:')) measurements.mirror = line.split(':')[1]?.trim()
      if (line.includes('Nylon Rod:')) measurements.nylonRod = line.split(':')[1]?.trim()
      if (line.includes('LED Strip:')) measurements.ledStrip = line.split(':')[1]?.trim()
    })
    
    return Object.keys(measurements).length > 0 ? measurements : null
  }

  const getStageGroups = () => {
    const groups = {}
    PRODUCTION_STAGES.forEach(stage => {
      if (!groups[stage.group]) groups[stage.group] = []
      groups[stage.group].push(stage)
    })
    return groups
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
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowStageDialog(true)
                      }}
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
              const measurements = parseDesignerMeasurements(order.internalNotes)
              const completedStages = order.productionStages?.filter(ps => ps.status === 'COMPLETED').length || 0
              const totalStages = order.productionStages?.length || 20
              
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
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{completedStages}/{totalStages} stages</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(completedStages / totalStages) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Designer Measurements */}
                      {measurements && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
                          <div className="flex items-center gap-2 mb-1 text-blue-400">
                            <Ruler className="w-3 h-3" />
                            <span className="font-semibold">Designer Measurements:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 text-slate-300">
                            {measurements.woodenLog && <span>Wooden Log: {measurements.woodenLog}</span>}
                            {measurements.flameSheet && <span>Flame Sheet: {measurements.flameSheet}</span>}
                            {measurements.mirror && <span>Mirror: {measurements.mirror}</span>}
                            {measurements.nylonRod && <span>Nylon Rod: {measurements.nylonRod}</span>}
                            {measurements.ledStrip && <span>LED Strip: {measurements.ledStrip}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowStageDialog(true)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Update Stages
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Stage Selection Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Production Stages - {selectedOrder?.jobNumber}</DialogTitle>
            <p className="text-sm text-slate-400">Select multiple stages that are completed (parallel work)</p>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Designer Measurements */}
              {parseDesignerMeasurements(selectedOrder.internalNotes) && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                  <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Designer Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                    {Object.entries(parseDesignerMeasurements(selectedOrder.internalNotes)).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-400">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="ml-2 font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage Groups */}
              {Object.entries(getStageGroups()).map(([group, stages]) => (
                <div key={group} className="space-y-2">
                  <h3 className="font-semibold text-slate-300">{group}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {stages.map(stage => {
                      const stageData = selectedOrder.productionStages?.find(ps => ps.stage === stage.id)
                      const isCompleted = stageData?.status === 'COMPLETED'
                      
                      return (
                        <div 
                          key={stage.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isCompleted 
                              ? 'bg-green-500/10 border-green-500/50' 
                              : 'bg-slate-800 border-slate-700'
                          }`}
                        >
                          <Checkbox
                            checked={isCompleted || selectedStages.includes(stage.id)}
                            disabled={isCompleted}
                            onCheckedChange={() => !isCompleted && toggleStage(stage.id)}
                          />
                          <Label className={isCompleted ? 'text-green-400' : 'text-white'}>
                            {stage.name}
                            {isCompleted && <CheckCircle className="w-3 h-3 inline ml-2" />}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button
                  onClick={handleUpdateStages}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={selectedStages.length === 0}
                >
                  Mark {selectedStages.length} Stage{selectedStages.length !== 1 ? 's' : ''} as Completed
                </Button>
                <Button variant="outline" onClick={() => setShowStageDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
