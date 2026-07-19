'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, AlertTriangle, Package, Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function CEODashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showAlertDetail, setShowAlertDetail] = useState(false)
  const [showDetailView, setShowDetailView] = useState(false)
  const [detailViewType, setDetailViewType] = useState('')
  const [detailData, setDetailData] = useState([])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsData, alertsData] = await Promise.all([
        api.getDashboardStats(),
        api.getAlerts({ status: 'OPEN' })
      ])
      setStats(statsData)
      setAlerts(alertsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await api.updateAlert(alertId, {
        status: 'RESOLVED',
        resolutionNotes: 'Resolved by CEO'
      })
      toast.success('Alert resolved successfully')
      setShowAlertDetail(false)
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to resolve alert')
    }
  }

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await api.updateAlert(alertId, {
        status: 'ACKNOWLEDGED'
      })
      toast.success('Alert acknowledged')
      setShowAlertDetail(false)
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to acknowledge alert')
    }
  }

  const handleStatClick = async (type) => {
    setDetailViewType(type)
    setShowDetailView(true)
    
    try {
      let data = []
      switch(type) {
        case 'totalOrders':
          data = await api.getOrders()
          break
        case 'inProduction':
          const allOrders = await api.getOrders()
          data = allOrders.filter(o => o.status === 'IN_PRODUCTION')
          break
        case 'delayed':
          const orders = await api.getOrders()
          data = orders.filter(o => 
            o.promisedDate && 
            new Date(o.promisedDate) < new Date() && 
            !['DELIVERED', 'CLOSED', 'CANCELLED'].includes(o.status)
          )
          break
        case 'lowStock':
          data = await api.getComponents()
          data = data.filter(c => c.currentStock <= c.reorderLevel)
          break
        default:
          data = []
      }
      setDetailData(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load details')
      setDetailData([])
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/10 border-red-500/50 text-red-400'
      case 'HIGH': return 'bg-orange-500/10 border-orange-500/50 text-orange-400'
      case 'MEDIUM': return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
      case 'LOW': return 'bg-blue-500/10 border-blue-500/50 text-blue-400'
      default: return 'bg-slate-500/10 border-slate-500/50 text-slate-400'
    }
  }

  const getSeverityBadge = (severity) => {
    const colors = {
      'CRITICAL': 'bg-red-500 text-white',
      'HIGH': 'bg-orange-500 text-white',
      'MEDIUM': 'bg-yellow-500 text-black',
      'LOW': 'bg-blue-500 text-white'
    }
    return <Badge className={colors[severity] || ''}>{severity}</Badge>
  }

  const getCategoryLabel = (category) => {
    return category?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || category
  }

  if (loading) {
    return <div className="text-white">Loading dashboard...</div>
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400'
    },
    {
      title: 'In Production',
      value: stats?.ordersInProduction || 0,
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400'
    },
    {
      title: 'Delayed Orders',
      value: stats?.ordersDelayed || 0,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-400'
    },
    {
      title: 'Today Dispatches',
      value: stats?.todayDispatches || 0,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-400'
    },
    {
      title: 'Pending QC',
      value: stats?.pendingQC || 0,
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-400'
    },
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: 'from-cyan-500 to-cyan-600',
      textColor: 'text-cyan-400'
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockComponents || 0,
      icon: AlertTriangle,
      color: 'from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-400'
    },
    {
      title: 'Critical Alerts',
      value: stats?.criticalAlerts || 0,
      icon: AlertCircle,
      color: 'from-pink-500 to-pink-600',
      textColor: 'text-pink-400'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">CEO Dashboard</h1>
        <p className="text-slate-400 mt-1">Real-time business overview and KPIs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          const clickType = ['totalOrders', 'inProduction', 'delayed', '', '', '', 'lowStock', ''][index]
          return (
            <Card 
              key={index} 
              className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              onClick={() => clickType && handleStatClick(clickType)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    {clickType && <p className="text-xs text-slate-500 mt-1">Click for details →</p>}
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Production Efficiency</CardTitle>
            <CardDescription className="text-slate-400">Overall manufacturing performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">On-Time Delivery</span>
                  <span className="text-sm font-semibold text-green-400">87%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Production Capacity</span>
                  <span className="text-sm font-semibold text-blue-400">74%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '74%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Quality Rate</span>
                  <span className="text-sm font-semibold text-purple-400">95%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '95%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Critical Alerts</CardTitle>
              <CardDescription className="text-slate-400">System-wide issues requiring attention</CardDescription>
            </div>
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {alerts?.length || 0}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors ${getSeverityColor(alert.severity)}`}
                    onClick={() => {
                      setSelectedAlert(alert)
                      setShowAlertDetail(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{alert.message}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs opacity-75">
                          <span>{getCategoryLabel(alert.category)}</span>
                          <span>•</span>
                          <span>{alert.raisedBy?.firstName} {alert.raisedBy?.lastName}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      {getSeverityBadge(alert.severity)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-slate-400">No critical alerts - all systems operational</p>
                </div>
              )}
            </div>
            {alerts && alerts.length > 5 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" className="text-slate-400">
                  View all {alerts.length} alerts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">System Status</CardTitle>
          <CardDescription className="text-slate-400">Overall system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Database</span>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-xs text-green-400">Operational</p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">API</span>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-xs text-green-400">Healthy</p>
            </div>
            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Production</span>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <p className="text-xs text-green-400">Active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail View Dialog */}
      <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailViewType === 'totalOrders' && 'All Orders'}
              {detailViewType === 'inProduction' && 'Orders in Production'}
              {detailViewType === 'delayed' && 'Delayed Orders'}
              {detailViewType === 'lowStock' && 'Low Stock Components'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {detailViewType === 'lowStock' ? (
              detailData.map((item) => (
                <div key={item.id} className="p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.code} - {item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-semibold">Stock: {item.currentStock} {item.unit}</p>
                      <p className="text-xs text-slate-400">Reorder: {item.reorderLevel}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              detailData.map((order) => (
                <div key={order.id} className="p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{order.jobNumber}</p>
                      <p className="text-xs text-slate-400">{order.customer?.name}</p>
                    </div>
                    <Badge>{order.status}</Badge>
                  </div>
                </div>
              ))
            )}
            {detailData.length === 0 && (
              <p className="text-center text-slate-400 py-8">No data to display</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Detail Dialog */}
      <Dialog open={showAlertDetail} onOpenChange={setShowAlertDetail}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Critical Alert Details
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedAlert.severity)}
                <Badge variant="outline">{getCategoryLabel(selectedAlert.category)}</Badge>
                {selectedAlert.order && (
                  <Badge variant="secondary">Order: {selectedAlert.order.jobNumber}</Badge>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-1">Message</h3>
                <p className="text-white">{selectedAlert.message}</p>
              </div>

              {selectedAlert.details && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-1">Details</h3>
                  <p className="text-slate-300">{selectedAlert.details}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="text-slate-400 mb-1">Raised By</h3>
                  <p className="text-white">
                    {selectedAlert.raisedBy?.firstName} {selectedAlert.raisedBy?.lastName}
                    <span className="text-slate-400"> ({selectedAlert.raisedByRole})</span>
                  </p>
                </div>
                <div>
                  <h3 className="text-slate-400 mb-1">Created</h3>
                  <p className="text-white">
                    {formatDistanceToNow(new Date(selectedAlert.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                {selectedAlert.status === 'OPEN' && (
                  <>
                    <Button
                      onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                      variant="outline"
                      className="flex-1"
                    >
                      Acknowledge
                    </Button>
                    <Button
                      onClick={() => handleResolveAlert(selectedAlert.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Resolve
                    </Button>
                  </>
                )}
                {selectedAlert.status === 'ACKNOWLEDGED' && (
                  <Button
                    onClick={() => handleResolveAlert(selectedAlert.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Resolve
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
