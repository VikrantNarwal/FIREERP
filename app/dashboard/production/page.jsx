'use client'

import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function ProductionTracker() {
  const [allOrders, setAllOrders] = useState([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [currentOrder, setCurrentOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetails(selectedOrderId)
    }
  }, [selectedOrderId])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      const productionOrders = (data || []).filter(o => 
        o.status === 'APPROVED' || o.status === 'IN_PRODUCTION'
      )
      setAllOrders(productionOrders)
      
      // Auto-select first order if available
      if (productionOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(productionOrders[0].id)
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderDetails = async (orderId) => {
    try {
      const order = await api.getOrder(orderId)
      setCurrentOrder(order)
      
      // Update order to IN_PRODUCTION if it's still APPROVED
      if (order.status === 'APPROVED') {
        await api.updateOrder(orderId, { status: 'IN_PRODUCTION' })
      }
    } catch (error) {
      console.error('Load order error:', error)
    }
  }

  const startStage = async (stageId) => {
    try {
      await api.updateProductionStage(stageId, { 
        status: 'IN_PROGRESS',
        actualStartDate: new Date().toISOString()
      })
      toast.success('Stage started!')
      loadOrderDetails(selectedOrderId)
    } catch (error) {
      toast.error('Failed to start')
    }
  }

  const completeStage = async (stageId) => {
    try {
      await api.updateProductionStage(stageId, { 
        status: 'COMPLETED',
        actualEndDate: new Date().toISOString()
      })
      toast.success('✅ Stage completed!')
      loadOrderDetails(selectedOrderId)
    } catch (error) {
      toast.error('Failed to complete')
    }
  }

  const getStageName = (stage) => {
    const names = {
      DESIGN_APPROVED: '1. Design',
      LASER_CUTTING: '2. Cutting',
      BENDING: '3. Bending',
      WELDING: '4. Welding',
      GRINDING_BUFFING: '5. Finishing',
      POWDER_COATING: '6. Coating',
      INCOMING_QC: '7. QC',
      WOODEN_LOG_PREP: '8. Wood',
      FLAME_SHEET_PREP: '9. Flame',
      LIGHT_ASSEMBLY: '10. Lights',
      STEPPER_MOTOR_ASSEMBLY: '11. Motor',
      PCB_PREPARATION: '12. PCB',
      SPEAKER_ASSEMBLY: '13. Speaker',
      HEATER_ASSEMBLY: '14. Heater',
      MAIN_ASSEMBLY: '15. Assembly',
      FUNCTIONAL_TESTING: '16. Testing',
      BURN_IN_TEST: '17. Burn Test',
      FINAL_QC: '18. Final QC',
      PACKAGING: '19. Packing',
      DISPATCH_READY: '20. Ready'
    }
    return names[stage] || stage
  }

  if (loading) {
    return <div className="text-white text-center py-12">Loading...</div>
  }

  if (allOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">No orders ready for production</div>
        <div className="text-sm text-slate-500">Orders need to be approved by Design team first</div>
      </div>
    )
  }

  const stages = currentOrder?.productionStages || []
  const completed = stages.filter(s => s.status === 'COMPLETED').length
  const total = stages.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const currentStage = stages.find(s => s.status === 'IN_PROGRESS') || stages.find(s => s.status === 'PENDING')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Select order and start manufacturing</p>
        </div>
      </div>

      {/* Order Selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Select Order to Manufacture</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white text-lg h-12">
              <SelectValue placeholder="Choose an order" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {allOrders.map(order => (
                <SelectItem key={order.id} value={order.id} className="text-white text-base py-3">
                  {order.jobNumber} - {order.customer?.name} - {order.product?.name}
                  {order.priority === 'URGENT' && <Badge className="ml-2 bg-red-600">URGENT</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Order Progress */}
      {currentOrder && (
        <>
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{currentOrder.jobNumber}</h2>
                  <div className="text-slate-300">
                    {currentOrder.customer?.name} • {currentOrder.product?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-green-400">{progress}%</div>
                  <div className="text-slate-400 text-sm">{completed} / {total} Complete</div>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-green-500 to-green-600 h-4 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Stage - Large and Clear */}
          {currentStage && (
            <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="text-sm text-blue-300 mb-2">CURRENT STAGE</div>
                  <div className="text-3xl font-bold text-white mb-4">
                    {getStageName(currentStage.stage)}
                  </div>
                  <div className="text-blue-200">
                    {currentStage.status === 'PENDING' ? 'Ready to start' : 'In progress...'}
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  {currentStage.status === 'PENDING' && (
                    <Button 
                      size="lg"
                      onClick={() => startStage(currentStage.id)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xl px-12 py-6 h-auto"
                    >
                      <Play className="w-6 h-6 mr-3" />
                      START WORKING
                    </Button>
                  )}
                  {currentStage.status === 'IN_PROGRESS' && (
                    <Button 
                      size="lg"
                      onClick={() => completeStage(currentStage.id)}
                      className="bg-green-600 hover:bg-green-700 text-white text-xl px-12 py-6 h-auto animate-pulse"
                    >
                      <CheckCircle className="w-6 h-6 mr-3" />
                      MARK COMPLETE
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Stages Grid */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">All Production Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      stage.status === 'COMPLETED'
                        ? 'bg-green-900 border-green-600'
                        : stage.status === 'IN_PROGRESS'
                        ? 'bg-blue-900 border-blue-500 ring-2 ring-blue-400'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {stage.status === 'COMPLETED' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : stage.status === 'IN_PROGRESS' ? (
                        <Play className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-slate-500" />
                      )}
                      <span className={`font-semibold ${
                        stage.status === 'COMPLETED' ? 'text-green-300' :
                        stage.status === 'IN_PROGRESS' ? 'text-blue-300' :
                        'text-slate-400'
                      }`}>
                        {getStageName(stage.stage)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {stage.status === 'COMPLETED' ? 'Done' :
                       stage.status === 'IN_PROGRESS' ? 'Working...' :
                       'Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
