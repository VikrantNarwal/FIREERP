'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Package, Search, Trash2, Eye, AlertTriangle, Truck } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { formatQuantity, formatDimensions, formatDate, isDispatched, isImportant, daysSincePosted, priorityLabel } from '@/lib/utils'
import OrderDetailDialog from '@/components/orders/OrderDetailDialog'

export default function CEOOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUrgentDialog, setShowUrgentDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [orderToMarkUrgent, setOrderToMarkUrgent] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      setOrders(data)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return

    try {
      await api.deleteOrder(orderToDelete.id)
      toast.success(`Order ${orderToDelete.jobNumber} deleted successfully`)
      setShowDeleteDialog(false)
      setOrderToDelete(null)
      loadOrders()
    } catch (error) {
      toast.error('Failed to delete order')
    }
  }

  const handleMarkUrgent = async () => {
    if (!orderToMarkUrgent) return

    try {
      await api.updateOrder(orderToMarkUrgent.id, {
        priority: 'URGENT'
      })
      toast.success(`Order ${orderToMarkUrgent.jobNumber} marked as IMPORTANT!`)
      setShowUrgentDialog(false)
      setOrderToMarkUrgent(null)
      loadOrders()
    } catch (error) {
      toast.error('Failed to mark order as urgent')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'QUOTATION': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'APPROVED': 'bg-green-500/20 text-green-400 border-green-500/50',
      'IN_PRODUCTION': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'QC_PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      'QC_PASSED': 'bg-green-500/20 text-green-400 border-green-500/50',
      'READY_TO_DISPATCH': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      'DISPATCHED': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
      'DELIVERED': 'bg-teal-500/20 text-teal-400 border-teal-500/50',
      'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/50'
    }
    return colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-red-500/20 text-red-400 border-red-500/50',
      'HIGH': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      'NORMAL': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'LOW': 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    }
    return colors[priority] || colors['NORMAL']
  }

  const filteredOrders = orders.filter(order =>
    order.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  // Dispatched orders live in their own list; important ones sit on top of the active list.
  const activeFiltered = filteredOrders
    .filter(o => !isDispatched(o))
    .sort((a, b) => (isImportant(b) ? 1 : 0) - (isImportant(a) ? 1 : 0))
  const dispatchedFiltered = filteredOrders.filter(isDispatched)

  if (loading) {
    return <div className="text-white">Loading orders...</div>
  }

  const stats = {
    total: orders.length,
    active: orders.filter(o => !isDispatched(o) && o.status !== 'CANCELLED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    delivered: orders.filter(isDispatched).length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">All Orders</h1>
        <p className="text-slate-400 mt-1">CEO view with full system access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Orders</p>
                <p className="text-3xl font-bold text-white">{stats.active}</p>
              </div>
              <Package className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Dispatched Items</p>
                <p className="text-3xl font-bold text-white">{stats.delivered}</p>
              </div>
              <Package className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Cancelled</p>
                <p className="text-3xl font-bold text-white">{stats.cancelled}</p>
              </div>
              <Package className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by job number, customer, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Orders ({activeFiltered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeFiltered.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">{order.jobNumber}</h3>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      <Badge className={getPriorityColor(order.priority)}>{priorityLabel(order.priority)}</Badge>
                      {order.autoImportantAt && order.priority === 'URGENT' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">15+ days</Badge>
                      )}
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Qty: {formatQuantity(order.quantity)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{order.customer?.name}</span>
                      <span>•</span>
                      <span>{order.product?.name}</span>
                      <span>•</span>
                      <span>₹{order.finalPrice}</span>
                      <span>•</span>
                      <span>Posted {formatDate(order.orderDate)} ({daysSincePosted(order)}d ago)</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                      onClick={() => {
                        setOrderToMarkUrgent(order)
                        setShowUrgentDialog(true)
                      }}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Mark IMPORTANT
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedOrder(order)
                        setShowDetailDialog(true)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    {order.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                          setOrderToDelete(order)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Dispatched Items — orders leave the active list and land here automatically once marked Dispatched */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Dispatched Items ({dispatchedFiltered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dispatchedFiltered.map((order) => (
              <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                    <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    {order.needsRemake && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Remake</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {order.customer?.name} · {order.product?.name} · Posted: {formatDate(order.orderDate)} · Dispatched: {formatDate(order.dispatchDate)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setSelectedOrder(order)
                    setShowDetailDialog(true)
                  }}
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
              </div>
            ))}
            {dispatchedFiltered.length === 0 && (
              <p className="text-center text-slate-400 py-6">No dispatched orders{searchTerm ? ' match your search' : ' yet'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog — full read-only details + edit history */}
      <OrderDetailDialog orderId={selectedOrder?.id} open={showDetailDialog} onOpenChange={setShowDetailDialog} />


      {/* Mark Urgent Confirmation Dialog */}
      <AlertDialog open={showUrgentDialog} onOpenChange={setShowUrgentDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <AlertDialogTitle>Mark as IMPORTANT</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-400">
                <p>Mark order <span className="font-semibold text-white">{orderToMarkUrgent?.jobNumber}</span> as IMPORTANT?</p>
                <p className="mt-3">This will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Show order at the TOP of all dashboards</li>
                  <li>Alert ALL departments (Production, QC, Design, etc.)</li>
                  <li>Add red "IMPORTANT" badge visible everywhere</li>
                  <li>Require immediate attention from all teams</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkUrgent}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Mark as IMPORTANT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-400">
                <p>Are you sure you want to delete order <span className="font-semibold text-white">{orderToDelete?.jobNumber}</span>?</p>
                <p className="mt-3">This action will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Soft-delete the order (set deletedAt timestamp)</li>
                  <li>Change status to CANCELLED</li>
                  <li>Create an audit log entry</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
