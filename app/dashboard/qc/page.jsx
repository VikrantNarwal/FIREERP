'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatQuantity } from '@/lib/utils'

export default function QCDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      const qcOrders = (data || []).filter(o => 
        ['IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED'].includes(o.status)
      )
      setOrders(qcOrders)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleQCAction = async (orderId, action) => {
    try {
      await api.updateOrder(orderId, {
        status: action === 'PASS' ? 'QC_PASSED' : 'QC_FAILED'
      })
      toast.success(`QC ${action.toLowerCase()}ed successfully`)
      loadOrders()
    } catch (error) {
      toast.error('Failed to update QC status')
    }
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Quality Control Dashboard</h1>
        <p className="text-slate-400 mt-1">Inspect and approve orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-sm text-slate-400">QC Passed</p>
            <p className="text-3xl font-bold text-green-400">
              {orders.filter(o => o.status === 'QC_PASSED').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">QC Failed</p>
            <p className="text-3xl font-bold text-red-400">
              {orders.filter(o => o.status === 'QC_FAILED').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">In Production</p>
            <p className="text-3xl font-bold text-blue-400">
              {orders.filter(o => o.status === 'IN_PRODUCTION').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Orders for QC Inspection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">{order.jobNumber}</h3>
                      <Badge variant="outline">{order.status}</Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Qty: {formatQuantity(order.quantity)}</Badge>
                      {order.priority === 'URGENT' && (
                        <Badge className="bg-red-500 text-white">VERY URGENT</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">{order.customer?.name} - {order.product?.name}</p>
                  </div>
                  {order.status === 'QC_PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleQCAction(order.id, 'PASS')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Pass
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQCAction(order.id, 'FAIL')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Fail
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
