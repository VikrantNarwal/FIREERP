'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import api from '@/lib/api'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function QCDashboard() {
  const [inspections, setInspections] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [inspectionsData, ordersData] = await Promise.all([
        api.getQCInspections(),
        api.getOrders({ status: 'QC_PENDING' })
      ])
      setInspections(inspectionsData)
      setOrders(ordersData)
    } catch (error) {
      toast.error('Failed to load QC data')
    } finally {
      setLoading(false)
    }
  }

  const getResultColor = (result) => {
    const colors = {
      PASS: 'bg-green-500',
      FAIL: 'bg-red-500',
      PENDING: 'bg-yellow-500',
      CONDITIONAL_PASS: 'bg-orange-500'
    }
    return colors[result] || 'bg-gray-500'
  }

  const getResultIcon = (result) => {
    switch (result) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'CONDITIONAL_PASS':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  if (loading) {
    return <div className="text-white">Loading QC data...</div>
  }

  const passRate = inspections.length > 0
    ? ((inspections.filter(i => i.result === 'PASS').length / inspections.length) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Quality Control Dashboard</h1>
        <p className="text-slate-400 mt-1">Manage inspections and quality reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Total Inspections</CardTitle>
            <div className="text-3xl font-bold text-white">{inspections.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Pending QC</CardTitle>
            <div className="text-3xl font-bold text-yellow-500">
              {orders.length}
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Pass Rate</CardTitle>
            <div className="text-3xl font-bold text-green-500">{passRate}%</div>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-400">Failed</CardTitle>
            <div className="text-3xl font-bold text-red-500">
              {inspections.filter(i => i.result === 'FAIL').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Pending Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{order.jobNumber}</p>
                      <p className="text-sm text-slate-400">{order.customer?.name}</p>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Inspect
                    </Button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-slate-400 py-8">No pending inspections</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inspections.slice(0, 5).map(inspection => (
                <div key={inspection.id} className="p-4 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getResultIcon(inspection.result)}
                        <p className="font-semibold text-white">{inspection.order?.jobNumber}</p>
                      </div>
                      <p className="text-xs text-slate-400">
                        {inspection.type} - {new Date(inspection.inspectedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Inspector: {inspection.inspector?.firstName} {inspection.inspector?.lastName}
                      </p>
                    </div>
                    <Badge className={`${getResultColor(inspection.result)} text-white border-0`}>
                      {inspection.result}
                    </Badge>
                  </div>
                </div>
              ))}
              {inspections.length === 0 && (
                <p className="text-center text-slate-400 py-8">No inspections recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
