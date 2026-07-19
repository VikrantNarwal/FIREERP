'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Clock, AlertCircle, CheckCircle, Play } from 'lucide-react'

const PRODUCTION_STAGES = [
  { key: 'DESIGN_APPROVED', label: 'Design Approved' },
  { key: 'LASER_CUTTING', label: 'Laser Cutting' },
  { key: 'BENDING', label: 'Bending' },
  { key: 'WELDING', label: 'Welding' },
  { key: 'GRINDING_BUFFING', label: 'Grinding/Buffing' },
  { key: 'POWDER_COATING', label: 'Powder Coating' },
  { key: 'INCOMING_QC', label: 'Incoming QC' },
  { key: 'WOODEN_LOG_PREP', label: 'Wooden Log Prep' },
  { key: 'FLAME_SHEET_PREP', label: 'Flame Sheet Prep' },
  { key: 'LIGHT_ASSEMBLY', label: 'Light Assembly' },
  { key: 'STEPPER_MOTOR_ASSEMBLY', label: 'Stepper Motor Assembly' },
  { key: 'PCB_PREPARATION', label: 'PCB Preparation' },
  { key: 'SPEAKER_ASSEMBLY', label: 'Speaker Assembly' },
  { key: 'HEATER_ASSEMBLY', label: 'Heater Assembly' },
  { key: 'MAIN_ASSEMBLY', label: 'Main Assembly' },
  { key: 'FUNCTIONAL_TESTING', label: 'Functional Testing' },
  { key: 'BURN_IN_TEST', label: 'Burn-in Test' },
  { key: 'FINAL_QC', label: 'Final QC' },
  { key: 'PACKAGING', label: 'Packaging' },
  { key: 'DISPATCH_READY', label: 'Dispatch Ready' }
]

export default function ProductionDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState('ALL')

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getKanbanData()
      setOrders(data)
    } catch (error) {
      toast.error('Failed to load production data')
    } finally {
      setLoading(false)
    }
  }

  const updateStageStatus = async (stageId, status) => {
    try {
      await api.updateProductionStage(stageId, { status })
      toast.success('Stage updated')
      loadOrders()
    } catch (error) {
      toast.error('Failed to update stage')
    }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: 'bg-red-500',
      HIGH: 'bg-orange-500',
      NORMAL: 'bg-blue-500',
      LOW: 'bg-gray-500'
    }
    return colors[priority] || 'bg-gray-500'
  }

  const getStageStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getCurrentStage = (order) => {
    if (!order.productionStages) return null
    return order.productionStages.find(s => s.status === 'IN_PROGRESS') || 
           order.productionStages.find(s => s.status === 'PENDING')
  }

  const filteredOrders = selectedStage === 'ALL' 
    ? orders 
    : orders.filter(order => {
        const currentStage = getCurrentStage(order)
        return currentStage?.stage === selectedStage
      })

  if (loading) {
    return <div className="text-white">Loading production data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Production Kanban Board</h1>
          <p className="text-slate-400 mt-1">Real-time production tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="ALL" className="text-white">All Stages</SelectItem>
              {PRODUCTION_STAGES.map(stage => (
                <SelectItem key={stage.key} value={stage.key} className="text-white">
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadOrders} variant="outline" className="border-slate-700 text-white">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">In Production</CardTitle>
            <div className="text-3xl font-bold text-white">{orders.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Urgent Orders</CardTitle>
            <div className="text-3xl font-bold text-red-500">
              {orders.filter(o => o.priority === 'URGENT').length}
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">In Progress</CardTitle>
            <div className="text-3xl font-bold text-blue-500">
              {orders.filter(o => o.productionStages?.some(s => s.status === 'IN_PROGRESS')).length}
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Completed Today</CardTitle>
            <div className="text-3xl font-bold text-green-500">
              {orders.filter(o => o.productionStages?.some(s => 
                s.status === 'COMPLETED' && 
                new Date(s.actualEndDate).toDateString() === new Date().toDateString()
              )).length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredOrders.map(order => {
          const currentStage = getCurrentStage(order)
          const completedStages = order.productionStages?.filter(s => s.status === 'COMPLETED').length || 0
          const totalStages = order.productionStages?.length || 0
          const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0

          return (
            <Card key={order.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{order.jobNumber}</h3>
                      <Badge className={`${getPriorityColor(order.priority)} text-white border-0`}>
                        {order.priority}
                      </Badge>
                      {currentStage && (
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          {PRODUCTION_STAGES.find(s => s.key === currentStage.stage)?.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p><span className="text-slate-500">Customer:</span> {order.customer?.name}</p>
                      <p><span className="text-slate-500">Product:</span> {order.product?.name} - {order.variant}</p>
                      <p><span className="text-slate-500">Promised Date:</span> {order.promisedDate ? new Date(order.promisedDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{Math.round(progress)}%</div>
                    <div className="text-xs text-slate-400">Complete</div>
                  </div>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {order.productionStages?.slice(0, 10).map(stage => (
                    <div key={stage.id} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                      {getStageStatusIcon(stage.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 truncate">
                          {PRODUCTION_STAGES.find(s => s.key === stage.stage)?.label}
                        </p>
                      </div>
                      {stage.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStageStatus(stage.id, 'COMPLETED')}
                          className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                        >
                          Complete
                        </Button>
                      )}
                      {stage.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStageStatus(stage.id, 'IN_PROGRESS')}
                          className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {order.productionStages && order.productionStages.length > 10 && (
                  <p className="text-xs text-slate-500 mt-2">
                    +{order.productionStages.length - 10} more stages
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filteredOrders.length === 0 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400">No orders in production</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
