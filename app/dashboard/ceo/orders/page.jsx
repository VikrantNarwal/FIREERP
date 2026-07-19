'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Package, Search, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

export default function CEOOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)

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
    order.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="text-white">Loading orders...</div>
  }

  const stats = {
    total: orders.length,
    active: orders.filter(o => !['DELIVERED', 'CANCELLED', 'CLOSED'].includes(o.status)).length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">All Orders</h1>
        <p className="text-slate-400 mt-1">CEO view with full system access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
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
          <CardContent className="p-6">
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
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Delivered</p>
                <p className="text-3xl font-bold text-white">{stats.delivered}</p>
              </div>
              <Package className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
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
          <CardTitle className="text-white">All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold text-lg">{order.jobNumber}</h3>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{order.customer?.name}</span>
                      <span>•</span>
                      <span>{order.product?.name}</span>
                      <span>•</span>
                      <span>₹{order.finalPrice}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
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

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Job Number</p>
                  <p className="text-white font-semibold">{selectedOrder.jobNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Customer</p>
                  <p className="text-white">{selectedOrder.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Product</p>
                  <p className="text-white">{selectedOrder.product?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Final Price</p>
                  <p className="text-white font-semibold">₹{selectedOrder.finalPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Priority</p>
                  <Badge className={getPriorityColor(selectedOrder.priority)}>{selectedOrder.priority}</Badge>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Notes</p>
                  <p className="text-white">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete order <span className="font-semibold text-white">{orderToDelete?.jobNumber}</span>?
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Soft-delete the order (set deletedAt timestamp)</li>
                <li>Change status to CANCELLED</li>
                <li>Create an audit log entry</li>
                <li>This action cannot be undone</li>
              </ul>
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
