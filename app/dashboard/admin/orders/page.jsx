'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Search, Trash2, Eye, AlertTriangle, ShieldOff, Clock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { getStageProgress, stageLabel, formatQuantity, formatDimensions } from '@/lib/utils'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUrgentDialog, setShowUrgentDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [orderToFlag, setOrderToFlag] = useState(null) // { order, makeUrgent: bool }

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

  const handleTogglePriority = async () => {
    if (!orderToFlag) return
    const { order, makeUrgent } = orderToFlag
    try {
      await api.updateOrder(order.id, { priority: makeUrgent ? 'URGENT' : 'NORMAL' })
      toast.success(
        makeUrgent
          ? `Order ${order.jobNumber} marked as VERY URGENT!`
          : `Order ${order.jobNumber} urgent flag removed`
      )
      setShowUrgentDialog(false)
      setOrderToFlag(null)
      loadOrders()
    } catch (error) {
      toast.error('Failed to update order priority')
    }
  }

  const handleStageStatusChange = async (stage, newStatus) => {
    try {
      await api.updateProductionStage(stage.id, { status: newStatus })
      toast.success('Stage updated')
      // keep dialog in sync without a full reload flicker
      const data = await api.getOrders()
      setOrders(data)
      const refreshed = data.find((o) => o.id === selectedOrder?.id)
      if (refreshed) setSelectedOrder(refreshed)
    } catch (error) {
      toast.error('Failed to update stage')
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

  const isOverdue = (order) =>
    order.promisedDate &&
    new Date(order.promisedDate) < new Date() &&
    !['DELIVERED', 'CANCELLED', 'CLOSED'].includes(order.status)

  const filteredOrders = orders
    .filter((order) =>
      order.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((order) => priorityFilter === 'ALL' || order.priority === priorityFilter)
    // Urgent-first, then most recently created — so the orders needing attention surface immediately
    .sort((a, b) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1
      if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  if (loading) {
    return <div className="text-white">Loading orders...</div>
  }

  const stats = {
    total: orders.length,
    active: orders.filter((o) => !['DELIVERED', 'CANCELLED', 'CLOSED'].includes(o.status)).length,
    urgent: orders.filter((o) => o.priority === 'URGENT').length,
    overdue: orders.filter(isOverdue).length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">All Orders</h1>
        <p className="text-slate-400 mt-1">Admin view — flag priority, track every production stage</p>
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

        <Card
          className="bg-slate-900 border-slate-800 cursor-pointer hover:border-red-500/50 transition-colors"
          onClick={() => setPriorityFilter(priorityFilter === 'URGENT' ? 'ALL' : 'URGENT')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Urgent</p>
                <p className="text-3xl font-bold text-white">{stats.urgent}</p>
                <p className="text-xs text-red-400 mt-1">Click to {priorityFilter === 'URGENT' ? 'clear filter' : 'filter'}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Overdue</p>
                <p className="text-3xl font-bold text-white">{stats.overdue}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by job number, customer, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-44 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const progress = getStageProgress(order.productionStages)
              return (
                <div
                  key={order.id}
                  className={`p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors border ${
                    order.priority === 'URGENT' ? 'border-red-500/60' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold text-lg">{order.jobNumber}</h3>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">Qty: {formatQuantity(order.quantity)}</Badge>
                        {isOverdue(order) && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">OVERDUE</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                        <span>{order.customer?.name}</span>
                        <span>•</span>
                        <span>{order.product?.name}</span>
                        <span>•</span>
                        <span>₹{order.finalPrice}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
                      </div>
                      {progress.total > 0 && (
                        <div className="max-w-md">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>
                              {progress.completedCount}/{progress.total} stages complete
                              {progress.nextStage && (
                                <> · Next: {stageLabel(progress.nextStage.stage)}</>
                              )}
                            </span>
                            <span>{progress.percent}%</span>
                          </div>
                          <Progress value={progress.percent} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {order.priority === 'URGENT' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => {
                            setOrderToFlag({ order, makeUrgent: false })
                            setShowUrgentDialog(true)
                          }}
                        >
                          <ShieldOff className="w-4 h-4" />
                          Unflag
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                          onClick={() => {
                            setOrderToFlag({ order, makeUrgent: true })
                            setShowUrgentDialog(true)
                          }}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Mark URGENT
                        </Button>
                      )}
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
              )
            })}
            {filteredOrders.length === 0 && (
              <p className="text-center text-slate-400 py-8">No orders match your filters</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details — {selectedOrder?.jobNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Priority</p>
                  <Badge className={getPriorityColor(selectedOrder.priority)}>{selectedOrder.priority}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Customer</p>
                  <p className="text-white">{selectedOrder.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Product</p>
                  <p className="text-white">{selectedOrder.product?.name} {selectedOrder.variant}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Quantity</p>
                  <p className="text-white font-semibold">{formatQuantity(selectedOrder.quantity)}</p>
                </div>
                {formatDimensions(selectedOrder.dimensions) && (
                  <div>
                    <p className="text-sm text-slate-400">Dimensions</p>
                    <p className="text-white">{formatDimensions(selectedOrder.dimensions)}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Final Price</p>
                  <p className="text-white font-semibold">₹{selectedOrder.finalPrice}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Promised Date</p>
                  <p className={isOverdue(selectedOrder) ? 'text-orange-400 font-semibold' : 'text-white'}>
                    {selectedOrder.promisedDate ? new Date(selectedOrder.promisedDate).toLocaleDateString() : '—'}
                    {isOverdue(selectedOrder) && ' (overdue)'}
                  </p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Notes</p>
                  <p className="text-white">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Production Stages — full breakdown, editable */}
              {selectedOrder.productionStages?.length > 0 && (() => {
                const progress = getStageProgress(selectedOrder.productionStages)
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-300 font-medium">Production Stages</p>
                      <p className="text-xs text-slate-400">
                        {progress.completedCount}/{progress.total} complete
                      </p>
                    </div>
                    <Progress value={progress.percent} className="h-1.5 mb-3" />

                    {progress.remaining.length > 0 && (
                      <p className="text-xs text-slate-500 mb-2">
                        Remaining ({progress.remainingCount}): {progress.remaining.map((s) => stageLabel(s.stage)).join(', ')}
                      </p>
                    )}

                    <div className="space-y-2">
                      {progress.completed.concat(progress.remaining).sort((a, b) => a.sequence - b.sequence).map((stage) => (
                        <div key={stage.id} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                          <span className={`text-sm ${stage.status === 'COMPLETED' ? 'text-slate-400' : 'text-white'}`}>
                            {stageLabel(stage.stage)}
                          </span>
                          <Select
                            value={stage.status}
                            onValueChange={(newStatus) => handleStageStatusChange(stage, newStatus)}
                          >
                            <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                              <SelectItem value="ON_HOLD">On Hold</SelectItem>
                              <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark/Unmark Urgent Confirmation Dialog */}
      <AlertDialog open={showUrgentDialog} onOpenChange={setShowUrgentDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <AlertDialogTitle>
                {orderToFlag?.makeUrgent ? 'Mark as VERY URGENT' : 'Remove Urgent Flag'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-slate-400">
                {orderToFlag?.makeUrgent ? (
                  <>
                    <p>Mark order <span className="font-semibold text-white">{orderToFlag?.order?.jobNumber}</span> as VERY URGENT?</p>
                    <p className="mt-3">This will:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Show order at the TOP of all dashboards</li>
                      <li>Add red "URGENT" badge visible everywhere</li>
                      <li>Signal to all teams this needs immediate attention</li>
                    </ul>
                  </>
                ) : (
                  <p>Remove the urgent flag from <span className="font-semibold text-white">{orderToFlag?.order?.jobNumber}</span>? It will go back to NORMAL priority.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTogglePriority}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {orderToFlag?.makeUrgent ? 'Mark as VERY URGENT' : 'Remove Flag'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
