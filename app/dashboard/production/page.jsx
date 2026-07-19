'use client'

import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function SimpleProductionTracker() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      // Get all orders and filter in frontend
      const data = await api.getOrders()
      // Filter for orders that are approved or in production
      const filteredOrders = (data || []).filter(o => 
        o.status === 'IN_PRODUCTION' || o.status === 'APPROVED'
      )
      setOrders(filteredOrders)
    } catch (error) {
      console.error('Load orders error:', error)
      setOrders([]) // Set empty array on error
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const startStage = async (stageId) => {
    try {
      await api.updateProductionStage(stageId, { 
        status: 'IN_PROGRESS',
        actualStartDate: new Date().toISOString()
      })
      toast.success('Stage started')
      loadOrders()
    } catch (error) {
      toast.error('Failed to start stage')
    }
  }

  const completeStage = async (stageId) => {
    try {
      await api.updateProductionStage(stageId, { 
        status: 'COMPLETED',
        actualEndDate: new Date().toISOString()
      })
      toast.success('Stage completed!')
      loadOrders()
    } catch (error) {
      toast.error('Failed to complete stage')
    }
  }

  const getStageIcon = (status) => {
    if (status === 'COMPLETED') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'IN_PROGRESS') return <Play className="w-4 h-4 text-blue-500" />
    return <Clock className="w-4 h-4 text-gray-500" />
  }

  const stageName = (stage) => {
    const names = {
      DESIGN_APPROVED: 'Design',
      LASER_CUTTING: 'Cutting',
      BENDING: 'Bending',
      WELDING: 'Welding',
      GRINDING_BUFFING: 'Finishing',
      POWDER_COATING: 'Coating',
      INCOMING_QC: 'QC Check',
      WOODEN_LOG_PREP: 'Wood Prep',
      FLAME_SHEET_PREP: 'Flame Prep',
      LIGHT_ASSEMBLY: 'Lights',
      STEPPER_MOTOR_ASSEMBLY: 'Motor',
      PCB_PREPARATION: 'Electronics',
      SPEAKER_ASSEMBLY: 'Speaker',
      HEATER_ASSEMBLY: 'Heater',
      MAIN_ASSEMBLY: 'Assembly',
      FUNCTIONAL_TESTING: 'Testing',
      BURN_IN_TEST: 'Burn Test',
      FINAL_QC: 'Final Check',
      PACKAGING: 'Packing',
      DISPATCH_READY: 'Ready'
    }
    return names[stage] || stage
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Production Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">Track order progress</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">In Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{Array.isArray(orders) ? orders.length : 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {Array.isArray(orders) ? orders.filter(o => o.productionStages?.some(s => 
                s.status === 'COMPLETED' && 
                new Date(s.actualEndDate).toDateString() === new Date().toDateString()
              )).length : 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">In Progress Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {Array.isArray(orders) ? orders.filter(o => o.productionStages?.some(s => s.status === 'IN_PROGRESS')).length : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center text-slate-400">
              No orders in production yet
            </CardContent>
          </Card>
        ) : (
          orders.map(order => {
            const stages = order.productionStages || []
            const completed = stages.filter(s => s.status === 'COMPLETED').length
            const total = stages.length
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0
            const currentStage = stages.find(s => s.status === 'IN_PROGRESS') || stages.find(s => s.status === 'PENDING')

            return (
              <Card key={order.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{order.jobNumber}</h3>
                        {order.priority === 'URGENT' && (
                          <Badge className="bg-red-600 text-white">URGENT</Badge>
                        )}
                        {order.priority === 'HIGH' && (
                          <Badge className="bg-orange-600 text-white">HIGH</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        <span className="font-medium text-slate-300">{order.customer?.name}</span>
                        <span className="mx-2">•</span>
                        <span>{order.product?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{progress}%</div>
                      <div className="text-xs text-slate-400">{completed} of {total}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {currentStage && (
                    <div className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStageIcon(currentStage.status)}
                          <div>
                            <div className="text-white font-semibold">{stageName(currentStage.stage)}</div>
                            <div className="text-xs text-slate-400">
                              {currentStage.status === 'IN_PROGRESS' ? 'Working on it...' : 'Ready to start'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {currentStage.status === 'PENDING' && (
                            <Button 
                              size="sm"
                              onClick={() => startStage(currentStage.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Start
                            </Button>
                          )}
                          {currentStage.status === 'IN_PROGRESS' && (
                            <Button 
                              size="sm"
                              onClick={() => completeStage(currentStage.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">Recent Stages:</div>
                    <div className="flex flex-wrap gap-2">
                      {stages.slice(0, 8).map(stage => (
                        <div 
                          key={stage.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            stage.status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                            stage.status === 'IN_PROGRESS' ? 'bg-blue-900 text-blue-300' :
                            'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {getStageIcon(stage.status)}
                          <span>{stageName(stage.stage)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
