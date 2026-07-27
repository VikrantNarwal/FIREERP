'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Package, AlertCircle, Activity, Wrench, MessageSquare, Plus, Clock, Download, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [repairs, setRepairs] = useState([])
  const [complaints, setComplaints] = useState([])
  const [showRepairDialog, setShowRepairDialog] = useState(false)
  const [showComplaintDialog, setShowComplaintDialog] = useState(false)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [newRepair, setNewRepair] = useState({
    orderId: '',
    repairType: '',
    description: '',
    priority: 'NORMAL'
  })

  const [newComplaint, setNewComplaint] = useState({
    orderId: '',
    customerName: '',
    issue: '',
    severity: 'MEDIUM'
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [statsData, ordersData, usersData] = await Promise.all([
        api.getDashboardStats(),
        api.getOrders(),
        api.getUsers()
      ])
      setStats(statsData)
      setOrders(ordersData || [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      
      // Load repairs and complaints from localStorage (in production, use API)
      const savedRepairs = JSON.parse(localStorage.getItem('repairs') || '[]')
      const savedComplaints = JSON.parse(localStorage.getItem('complaints') || '[]')
      setRepairs(savedRepairs)
      setComplaints(savedComplaints)
    } catch (error) {
      console.error('Failed to load data')
    }
  }

  const handleCreateRepair = () => {
    if (!newRepair.orderId || !newRepair.repairType || !newRepair.description) {
      toast.error('Please fill all fields')
      return
    }

    const repair = {
      id: Date.now().toString(),
      ...newRepair,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: 'Admin'
    }

    const updatedRepairs = [...repairs, repair]
    setRepairs(updatedRepairs)
    localStorage.setItem('repairs', JSON.stringify(updatedRepairs))
    
    toast.success('Repair order created')
    setShowRepairDialog(false)
    setNewRepair({ orderId: '', repairType: '', description: '', priority: 'NORMAL' })
  }

  const handleCreateComplaint = () => {
    if (!newComplaint.customerName || !newComplaint.issue) {
      toast.error('Please fill all fields')
      return
    }

    const complaint = {
      id: Date.now().toString(),
      ...newComplaint,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      recordedBy: 'Admin'
    }

    const updatedComplaints = [...complaints, complaint]
    setComplaints(updatedComplaints)
    localStorage.setItem('complaints', JSON.stringify(updatedComplaints))
    
    toast.success('Complaint recorded')
    setShowComplaintDialog(false)
    setNewComplaint({ orderId: '', customerName: '', issue: '', severity: 'MEDIUM' })
  }

  const handleDownloadReport = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/admin/reports/export', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-report-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (err) {
      toast.error('Could not download report')
    } finally {
      setDownloading(false)
    }
  }

  const getTodayOrders = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return orders.filter(o => new Date(o.createdAt) >= today)
  }

  const getActiveUsers = () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return users.filter(u => u.lastLogin && new Date(u.lastLogin) >= oneHourAgo)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">System administration and team monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadReport} disabled={downloading}>
            <Download className="w-4 h-4" />
            {downloading ? 'Preparing…' : 'Download Report'}
          </Button>
          <Dialog open={showRepairDialog} onOpenChange={setShowRepairDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
                <Wrench className="w-4 h-4" />
                Log Repair
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Create Repair Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Order ID</Label>
                  <Input
                    value={newRepair.orderId}
                    onChange={(e) => setNewRepair({ ...newRepair, orderId: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="JOB26070001"
                  />
                </div>
                <div>
                  <Label>Repair Type</Label>
                  <Select value={newRepair.repairType} onValueChange={(v) => setNewRepair({ ...newRepair, repairType: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCREEN_REPLACEMENT">Screen Replacement</SelectItem>
                      <SelectItem value="MOTOR_REPAIR">Motor Repair</SelectItem>
                      <SelectItem value="HEATER_ISSUE">Heater Issue</SelectItem>
                      <SelectItem value="ELECTRICAL">Electrical Issue</SelectItem>
                      <SelectItem value="MECHANICAL">Mechanical Issue</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newRepair.priority} onValueChange={(v) => setNewRepair({ ...newRepair, priority: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newRepair.description}
                    onChange={(e) => setNewRepair({ ...newRepair, description: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Describe the repair needed..."
                  />
                </div>
                <Button onClick={handleCreateRepair} className="w-full">Create Repair Order</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Log Complaint
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Record Customer Complaint</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Order ID (Optional)</Label>
                  <Input
                    value={newComplaint.orderId}
                    onChange={(e) => setNewComplaint({ ...newComplaint, orderId: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="JOB26070001"
                  />
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={newComplaint.customerName}
                    onChange={(e) => setNewComplaint({ ...newComplaint, customerName: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={newComplaint.severity} onValueChange={(v) => setNewComplaint({ ...newComplaint, severity: v })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Issue Description</Label>
                  <Textarea
                    value={newComplaint.issue}
                    onChange={(e) => setNewComplaint({ ...newComplaint, issue: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Describe the complaint..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleCreateComplaint} className="w-full">Record Complaint</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="bg-slate-900 border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setShowOrdersModal(true)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-blue-400 mt-1">Click to view all statuses</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Today's Orders</p>
                <p className="text-3xl font-bold text-white">{getTodayOrders().length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Users Now</p>
                <p className="text-3xl font-bold text-white">{getActiveUsers().length}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Open Complaints</p>
                <p className="text-3xl font-bold text-white">
                  {complaints.filter(c => c.status === 'OPEN').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Activity */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Team Activity Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.slice(0, 8).map(user => {
                const isActive = user.lastLogin && new Date(user.lastLogin) >= new Date(Date.now() - 60 * 60 * 1000)
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-500'}`} />
                      <div>
                        <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-slate-400">{user.role}</p>
                      </div>
                    </div>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Today's Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {getTodayOrders().map(order => (
                <div key={order.id} className="p-3 bg-slate-800/50 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{order.jobNumber}</p>
                      <p className="text-xs text-slate-400">{order.customer?.name}</p>
                    </div>
                    <Badge>{order.status}</Badge>
                  </div>
                </div>
              ))}
              {getTodayOrders().length === 0 && (
                <p className="text-center text-slate-400 py-8">No orders created today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Orders */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wrench className="w-5 h-5" />
            Repair Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {repairs.map(repair => (
              <div key={repair.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{repair.orderId}</span>
                      <Badge className={
                        repair.priority === 'URGENT' ? 'bg-red-500' :
                        repair.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                      }>{repair.priority}</Badge>
                      <Badge variant="outline">{repair.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">{repair.repairType.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-slate-300">{repair.description}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDistanceToNow(new Date(repair.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {repairs.length === 0 && (
              <p className="text-center text-slate-400 py-8">No repair orders</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Complaints */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5" />
            Customer Complaints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {complaints.map(complaint => (
              <div key={complaint.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{complaint.customerName}</span>
                      {complaint.orderId && <span className="text-slate-400 text-sm">({complaint.orderId})</span>}
                      <Badge className={
                        complaint.severity === 'CRITICAL' ? 'bg-red-500' :
                        complaint.severity === 'HIGH' ? 'bg-orange-500' :
                        complaint.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                      }>{complaint.severity}</Badge>
                      <Badge variant="outline">{complaint.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-300">{complaint.issue}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {complaints.length === 0 && (
              <p className="text-center text-slate-400 py-8">No complaints recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Orders Status Modal */}
      <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" /> All Orders — Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{order.jobNumber}</p>
                  <p className="text-xs text-slate-400">
                    {order.customer?.name} · {order.product?.name}
                  </p>
                </div>
                <Badge>{order.status}</Badge>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-slate-400 py-8">No orders yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
