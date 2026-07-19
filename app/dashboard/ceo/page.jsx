'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, AlertTriangle, Package, Users, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function CEODashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
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
          return (
            <Card key={index} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
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
          <CardHeader>
            <CardTitle className="text-white">Critical Alerts</CardTitle>
            <CardDescription className="text-slate-400">Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.ordersDelayed > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-400">
                      {stats.ordersDelayed} orders are delayed
                    </span>
                  </div>
                </div>
              )}
              {stats?.lowStockComponents > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-400">
                      {stats.lowStockComponents} components below reorder level
                    </span>
                  </div>
                </div>
              )}
              {stats?.pendingQC > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-400">
                      {stats.pendingQC} items pending QC inspection
                    </span>
                  </div>
                </div>
              )}
              {stats?.ordersDelayed === 0 && stats?.lowStockComponents === 0 && stats?.pendingQC === 0 && (
                <div className="p-8 text-center">
                  <p className="text-slate-400">No critical alerts</p>
                </div>
              )}
            </div>
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
    </div>
  )
}
