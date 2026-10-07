'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, DollarSign, FileText, Upload, Receipt, Eye, Truck, Star, RefreshCw, Search, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { getStageProgress, stageLabel, DIMENSION_UNITS, formatDimensions, formatQuantity, formatDate, remakeReasonLabel, isDispatched, isImportant, daysSincePosted, formatDateTime } from '@/lib/utils'
import OrderDetailDialog from '@/components/orders/OrderDetailDialog'
import OrderHistory from '@/components/orders/OrderHistory'
import DispatchButton from '@/components/orders/DispatchButton'

const ORDER_STATUSES = ['QUOTATION', 'APPROVED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED', 'INSTALLATION_PENDING', 'INSTALLED', 'CLOSED', 'CANCELLED']

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
const emptyEditForm = {
  status: '', priority: '', quantity: 1,
  orderDate: '', promisedDate: '', requiredDate: '', dispatchDate: '', notes: '',
  deliveredSafely: 'UNKNOWN', customerReviewRating: '', customerReviewNotes: '',
  needsRemake: false, remakeReason: '', remakeNotes: ''
}

export default function SalesDashboard() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialog states
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showQuotationDialog, setShowQuotationDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  // Full read-only details window, search box, "show more", and a counter that
  // refreshes the edit-history list right after a save.
  const [detailOrderId, setDetailOrderId] = useState(null)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState(15)
  const [historyKey, setHistoryKey] = useState(0)
  
  // New Order State
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    productId: '',
    variant: 'EF',
    width: '',
    height: '',
    depth: '',
    unit: 'cm',
    price: '',
    quantity: 1,
    promisedDate: '',
    notes: ''
  })

  // New Customer State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    city: ''
  })

  // Payment State
  const [payment, setPayment] = useState({
    amount: '',
    paymentType: 'ADVANCE',
    paymentMode: 'CASH',
    transactionRef: '',
    notes: ''
  })

  // Quotation State
  const [quotation, setQuotation] = useState({
    fileName: '',
    fileUrl: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ordersData, customersData, productsData, variantsRes] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts(),
        api.get('/product-variants')
      ])
      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
      setVariants(variantsRes.variants || [])
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Name and phone are required')
      return
    }

    try {
      await api.createCustomer(newCustomer)
      toast.success('Customer added successfully!')
      setShowNewCustomerDialog(false)
      loadData()
      setNewCustomer({ name: '', phone: '', address: '', city: '' })
    } catch (error) {
      toast.error('Failed to add customer')
    }
  }

  const handleCreateOrder = async () => {
    if (!newOrder.customerId || !newOrder.productId || !newOrder.price) {
      toast.error('Please fill customer, product, and price')
      return
    }

    if (!newOrder.promisedDate) {
      toast.error('Please select promised delivery date')
      return
    }

    try {
      const price = parseFloat(newOrder.price) || 0
      const quantity = parseInt(newOrder.quantity) || 1
      
      const orderData = {
        customerId: newOrder.customerId,
        productId: newOrder.productId,
        fireplaceType: 'ELECTRICAL_FIREPLACE',
        variant: newOrder.variant,
        dimensions: {
          width: parseFloat(newOrder.width) || 0,
          height: parseFloat(newOrder.height) || 0,
          depth: parseFloat(newOrder.depth) || 0,
          unit: newOrder.unit
        },
        quantity: quantity,
        unitPrice: price,
        totalPrice: price * quantity,
        finalPrice: price * quantity,
        promisedDate: new Date(newOrder.promisedDate).toISOString(),
        notes: newOrder.notes
      }

      const created = await api.createOrder(orderData)
      toast.success('Order created successfully!')
      setShowNewOrderDialog(false)
      // The API now returns the complete order (customer, product, salesPerson,
      // productionStages already included) — merge it straight into state instead
      // of re-fetching orders+customers+products+variants. Customers/products/variants
      // don't change when an order is created, so that reload was pure waste at the
      // exact moment a sales person is waiting on the dialog to close.
      setOrders(prev => [created, ...prev])
      setNewOrder({
        customerId: '',
        productId: '',
        variant: 'EF',
        width: '',
        height: '',
        depth: '',
        unit: 'cm',
        price: '',
        quantity: 1,
        promisedDate: '',
        notes: ''
      })
    } catch (error) {
      toast.error('Failed to create order')
    }
  }

  const handleRecordPayment = async () => {
    if (!payment.amount) {
      toast.error('Please enter payment amount')
      return
    }

    try {
      await api.createPayment({
        orderId: selectedOrder.id,
        amount: parseFloat(payment.amount),
        paymentType: payment.paymentType,
        paymentMode: payment.paymentMode,
        transactionRef: payment.transactionRef,
        notes: payment.notes,
        paymentDate: new Date().toISOString()
      })
      
      toast.success('Payment recorded successfully!')
      setShowPaymentDialog(false)
      setPayment({
        amount: '',
        paymentType: 'ADVANCE',
        paymentMode: 'CASH',
        transactionRef: '',
        notes: ''
      })
      loadData()
    } catch (error) {
      toast.error('Failed to record payment')
    }
  }

  const handleUploadQuotation = async () => {
    if (!quotation.fileName || !quotation.fileUrl) {
      toast.error('Please enter file name and URL')
      return
    }

    try {
      await api.uploadDocument({
        orderId: selectedOrder.id,
        type: 'QUOTATION',
        fileName: quotation.fileName,
        fileUrl: quotation.fileUrl,
        notes: quotation.notes
      })
      
      toast.success('Quotation uploaded successfully!')
      setShowQuotationDialog(false)
      setQuotation({
        fileName: '',
        fileUrl: '',
        notes: ''
      })
    } catch (error) {
      toast.error('Failed to upload quotation')
    }
  }

  // Sales owns the full order record — details, every date (including
  // backfilling dispatch date on old orders), status/priority, and once
  // dispatched, the delivery outcome (customer review, safe-delivery,
  // remake flag). Design and Production only ever see this data, read-only.
  const openOrderEdit = (order) => {
    setSelectedOrder(order)
    setEditForm({
      status: order.status || '',
      priority: order.priority || 'NORMAL',
      quantity: order.quantity ?? 1,
      orderDate: toDateInput(order.orderDate),
      promisedDate: toDateInput(order.promisedDate),
      requiredDate: toDateInput(order.requiredDate),
      dispatchDate: toDateInput(order.dispatchDate),
      notes: order.notes || '',
      deliveredSafely: order.deliveredSafely === true ? 'YES' : order.deliveredSafely === false ? 'NO' : 'UNKNOWN',
      customerReviewRating: order.customerReviewRating ?? '',
      customerReviewNotes: order.customerReviewNotes || '',
      needsRemake: !!order.needsRemake,
      remakeReason: order.remakeReason || '',
      remakeNotes: order.remakeNotes || ''
    })
    setShowOrderDetailDialog(true)
  }

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return
    try {
      const payload = {
        status: editForm.status,
        priority: editForm.priority,
        quantity: parseInt(editForm.quantity) || 1,
        promisedDate: editForm.promisedDate || null,
        requiredDate: editForm.requiredDate || null,
        dispatchDate: editForm.dispatchDate || null,
        notes: editForm.notes,
        deliveredSafely: editForm.deliveredSafely === 'YES' ? true : editForm.deliveredSafely === 'NO' ? false : null,
        customerReviewRating: editForm.customerReviewRating === '' ? null : parseInt(editForm.customerReviewRating),
        customerReviewNotes: editForm.customerReviewNotes,
        needsRemake: editForm.needsRemake,
        remakeReason: editForm.needsRemake ? (editForm.remakeReason || null) : null,
        remakeNotes: editForm.needsRemake ? editForm.remakeNotes : null
      }
      const updated = await api.updateOrder(selectedOrder.id, payload)
      toast.success('Order updated successfully!')
      // the PUT response has no production stages — keep the ones we already had
      setOrders(prev => prev.map(o => (o.id === updated.id ? { ...updated, productionStages: o.productionStages } : o)))
      setHistoryKey(k => k + 1)
      setShowOrderDetailDialog(false)
    } catch (error) {
      toast.error(error.message || 'Failed to update order')
    }
  }

  // Dispatch button result: swap the updated order in. It now counts as
  // dispatched, so it leaves Active Orders and lands in Dispatched Items.
  const handleDispatched = (updated) => {
    setOrders(prev => prev.map(o => (o.id === updated.id ? { ...o, ...updated, productionStages: updated.productionStages || o.productionStages } : o)))
    setHistoryKey(k => k + 1)
  }

  const getStatusColor = (status) => {
    const colors = {
      'QUOTATION': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'APPROVED': 'bg-green-500/20 text-green-400 border-green-500/50',
      'IN_PRODUCTION': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'DELIVERED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
    }
    return colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'
  }

  const isOverdue = (order) =>
    order.promisedDate &&
    new Date(order.promisedDate) < new Date() &&
    !isDispatched(order) &&
    !['CANCELLED'].includes(order.status)

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  const stats = {
    totalOrders: orders.length,
    quotations: orders.filter(o => o.status === 'QUOTATION').length,
    approved: orders.filter(o => o.status === 'APPROVED' || o.status === 'IN_PRODUCTION').length,
    customers: customers.length
  }

  // Search works on both lists at once (job number, customer, phone, status, product).
  const matchesSearch = (o) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    return [o.jobNumber, o.customer?.name, o.customer?.phone, o.status, o.product?.name, o.variant]
      .some(v => (v || '').toString().toLowerCase().includes(q))
  }
  // Dispatched orders leave the active list and live in "Dispatched Items".
  const activeOrders = orders
    .filter(o => !isDispatched(o) && o.status !== 'CANCELLED')
    .filter(matchesSearch)
    .sort((a, b) => (isImportant(b) ? 1 : 0) - (isImportant(a) ? 1 : 0))
  const dispatchedOrders = orders.filter(isDispatched).filter(matchesSearch)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Sales Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage orders, customers, and quotations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <Button onClick={handleCreateCustomer} className="w-full">
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Customer *</Label>
                    <Select value={newOrder.customerId} onValueChange={(value) => setNewOrder({ ...newOrder, customerId: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Product *</Label>
                    <Select value={newOrder.productId} onValueChange={(value) => setNewOrder({ ...newOrder, productId: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Variant</Label>
                    <Select value={newOrder.variant} onValueChange={(value) => setNewOrder({ ...newOrder, variant: value })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {variants.map(v => (
                          <SelectItem key={v.code} value={v.code}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <Label>Measurement Unit *</Label>
                  <Select value={newOrder.unit} onValueChange={(value) => setNewOrder({ ...newOrder, unit: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIMENSION_UNITS.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">Applies to Width, Height and Depth below — Design and Production will see this exact unit.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Width ({newOrder.unit})</Label>
                    <Input
                      type="number"
                      value={newOrder.width}
                      onChange={(e) => setNewOrder({ ...newOrder, width: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Height ({newOrder.unit})</Label>
                    <Input
                      type="number"
                      value={newOrder.height}
                      onChange={(e) => setNewOrder({ ...newOrder, height: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Depth ({newOrder.unit})</Label>
                    <Input
                      type="number"
                      value={newOrder.depth}
                      onChange={(e) => setNewOrder({ ...newOrder, depth: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>

                <div>
                  <Label>Promised Delivery Date *</Label>
                  <Input
                    type="date"
                    value={newOrder.promisedDate}
                    onChange={(e) => setNewOrder({ ...newOrder, promisedDate: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>

                <Button onClick={handleCreateOrder} className="w-full">
                  Create Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card
          className="bg-slate-900 border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setShowOrdersModal(true)}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats.totalOrders}</p>
                <p className="text-xs text-blue-400 mt-1">Click to view all statuses</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Quotations</p>
                <p className="text-3xl font-bold text-white">{stats.quotations}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Orders</p>
                <p className="text-3xl font-bold text-white">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Customers</p>
                <p className="text-3xl font-bold text-white">{stats.customers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Active Orders ({activeOrders.length})</CardTitle>
          <CardDescription className="text-slate-400">Every order that is not dispatched yet — important ones on top</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 mt-1 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search job number, customer, phone, product or status..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(15) }}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeOrders.slice(0, visibleCount).map((order) => {
              const progress = getStageProgress(order.productionStages)
              return (
                <div
                  key={order.id}
                  className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        {isImportant(order) && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                            IMPORTANT{order.autoImportantAt ? ' (15+ days)' : ''}
                          </Badge>
                        )}
                        {isOverdue(order) && (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">OVERDUE</Badge>
                        )}
                        {order.advanceAmountPaid && order.advanceAmountPaid > 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            Advance Paid: ₹{order.advanceAmountPaid}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mb-2">
                        <span>{order.customer?.name}</span>
                        <span>•</span>
                        <span>Qty: {formatQuantity(order.quantity)}</span>
                        <span>•</span>
                        <span>₹{order.finalPrice}</span>
                        {order.balanceDue !== null && order.balanceDue !== undefined && (
                          <>
                            <span>•</span>
                            <span className={order.balanceDue > 0 ? 'text-yellow-400' : 'text-green-400'}>
                              Balance: ₹{order.balanceDue}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Posted {formatDate(order.orderDate)} ({daysSincePosted(order)} day{daysSincePosted(order) === 1 ? '' : 's'} ago)</span>
                      </div>
                      {progress.total > 0 && (
                        <div className="max-w-md">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>
                              {progress.completedCount}/{progress.total} stages complete
                              {progress.nextStage && <> · Next: {stageLabel(progress.nextStage.stage)}</>}
                            </span>
                            <span>{progress.percent}%</span>
                          </div>
                          <Progress value={progress.percent} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DispatchButton order={order} onDispatched={handleDispatched} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-slate-300 hover:text-white"
                        onClick={() => { setDetailOrderId(order.id); setShowFullDetails(true) }}
                      >
                        <ClipboardList className="w-4 h-4" />
                        Full Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-slate-300 hover:text-white"
                        onClick={() => openOrderEdit(order)}
                      >
                        <Eye className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowQuotationDialog(true)
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        Quotation
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowPaymentDialog(true)
                        }}
                      >
                        <DollarSign className="w-4 h-4" />
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            {activeOrders.length > visibleCount && (
              <Button variant="outline" className="w-full" onClick={() => setVisibleCount(c => c + 15)}>
                Show more ({activeOrders.length - visibleCount} more)
              </Button>
            )}
            {activeOrders.length === 0 && (
              <p className="text-center text-slate-400 py-6">No active orders{searchTerm ? ' match your search' : ''}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dispatched Orders — separate section with delivery/review/remake features,
          kept apart from the main list since these orders are past production. */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Dispatched Items ({dispatchedOrders.length})
          </CardTitle>
          <CardDescription className="text-slate-400">Orders move here automatically once marked Dispatched — delivery status, customer review, remake flags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dispatchedOrders.map(order => (
              <div key={order.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      {order.needsRemake && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 gap-1">
                          <RefreshCw className="w-3 h-3" /> Remake: {remakeReasonLabel(order.remakeReason)}
                        </Badge>
                      )}
                      {order.deliveredSafely === true && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Delivered Safely</Badge>
                      )}
                      {order.deliveredSafely === false && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Delivery Damaged</Badge>
                      )}
                      {order.customerReviewRating && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 gap-1">
                          <Star className="w-3 h-3" /> {order.customerReviewRating}/5
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {order.customer?.name} · Posted: {formatDate(order.orderDate)} · Dispatched: {formatDate(order.dispatchDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" className="gap-2 text-slate-300 hover:text-white" onClick={() => { setDetailOrderId(order.id); setShowFullDetails(true) }}>
                      <ClipboardList className="w-4 h-4" />
                      Full Details
                    </Button>
                    <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => openOrderEdit(order)}>
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {dispatchedOrders.length === 0 && (
              <p className="text-center text-slate-400 py-6">No dispatched orders{searchTerm ? ' match your search' : ' yet'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            {selectedOrder && (
              <p className="text-sm text-slate-400">Order: {selectedOrder.jobNumber} | Total: ₹{selectedOrder.finalPrice}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={payment.amount}
                onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={payment.paymentType} onValueChange={(value) => setPayment({ ...payment, paymentType: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVANCE">Advance</SelectItem>
                  <SelectItem value="BALANCE">Balance</SelectItem>
                  <SelectItem value="FULL">Full Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={payment.paymentMode} onValueChange={(value) => setPayment({ ...payment, paymentMode: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction Reference</Label>
              <Input
                placeholder="UTR/Ref number (optional)"
                value={payment.transactionRef}
                onChange={(e) => setPayment({ ...payment, transactionRef: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes"
                value={payment.notes}
                onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={handleRecordPayment} className="w-full bg-green-600 hover:bg-green-700">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quotation Upload Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Upload Quotation</DialogTitle>
            {selectedOrder && (
              <p className="text-sm text-slate-400">Order: {selectedOrder.jobNumber}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File Name *</Label>
              <Input
                placeholder="e.g., Quotation_JOB001.pdf"
                value={quotation.fileName}
                onChange={(e) => setQuotation({ ...quotation, fileName: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>File URL *</Label>
              <Input
                placeholder="https://example.com/quotation.pdf"
                value={quotation.fileUrl}
                onChange={(e) => setQuotation({ ...quotation, fileUrl: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">Upload your file to a cloud storage and paste the URL here</p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes about this quotation"
                value={quotation.notes}
                onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={handleUploadQuotation} className="w-full">
              Upload Quotation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Orders Status Modal */}
      <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>All Orders — Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {orders.map(order => {
              const progress = getStageProgress(order.productionStages)
              return (
                <div key={order.id} className="flex flex-wrap items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-white font-medium">{order.jobNumber}</p>
                      {isImportant(order) && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px]">IMPORTANT</Badge>
                      )}
                      {isOverdue(order) && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-[10px]">OVERDUE</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{order.customer?.name} · Qty: {formatQuantity(order.quantity)}</p>
                    {progress.total > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        {progress.completedCount}/{progress.total} stages
                        {progress.nextStage && <> · Next: {stageLabel(progress.nextStage.stage)}</>}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                </div>
              )
            })}
            {orders.length === 0 && (
              <p className="text-center text-slate-400 py-8">No orders yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail / Edit Dialog — Sales can change order details, status,
          every date, and (once dispatched) the delivery outcome. */}
      <Dialog open={showOrderDetailDialog} onOpenChange={setShowOrderDetailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Order — {selectedOrder?.jobNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const progress = getStageProgress(selectedOrder.productionStages)
            return (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Order Status</Label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Important (urgent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="bg-slate-800 border-slate-700" />
                </div>

                {/* Dates — Design and Production see Order Placement Date and Dispatch
                    Date read-only; Sales fills these in, including for old orders. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Posted On (automatic)</Label>
                    <div className="h-10 flex items-center px-3 rounded-md bg-slate-800/60 border border-slate-700 text-slate-300 text-sm">
                      {formatDateTime(selectedOrder.orderDate)}
                    </div>
                  </div>
                  <div>
                    <Label>Dispatch Date</Label>
                    <Input type="date" value={editForm.dispatchDate}
                      onChange={(e) => setEditForm({ ...editForm, dispatchDate: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div>
                    <Label>Required Date</Label>
                    <Input type="date" value={editForm.requiredDate}
                      onChange={(e) => setEditForm({ ...editForm, requiredDate: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div>
                    <Label>Promised Delivery Date</Label>
                    <Input type="date" value={editForm.promisedDate}
                      onChange={(e) => setEditForm({ ...editForm, promisedDate: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white" />
                    {isOverdue(selectedOrder) && <p className="text-xs text-orange-400 mt-1">Overdue</p>}
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="bg-slate-800 border-slate-700" />
                </div>

                {formatDimensions(selectedOrder.dimensions) && (
                  <p className="text-sm text-slate-400">Dimensions: {formatDimensions(selectedOrder.dimensions)}</p>
                )}

                {/* Dispatch & Delivery Outcome — only relevant once dispatched */}
                {(editForm.status === 'DISPATCHED' || editForm.status === 'DELIVERED' || editForm.status === 'INSTALLED' || editForm.status === 'CLOSED') && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg space-y-3">
                    <h3 className="font-semibold text-indigo-400 flex items-center gap-2">
                      <Truck className="w-4 h-4" /> Dispatch & Delivery Outcome
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Delivered Safely?</Label>
                        <Select value={editForm.deliveredSafely} onValueChange={(v) => setEditForm({ ...editForm, deliveredSafely: v })}>
                          <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNKNOWN">Not yet known</SelectItem>
                            <SelectItem value="YES">Yes — safe</SelectItem>
                            <SelectItem value="NO">No — damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Customer Review Rating (1-5)</Label>
                        <Select value={editForm.customerReviewRating ? String(editForm.customerReviewRating) : ''} onValueChange={(v) => setEditForm({ ...editForm, customerReviewRating: v })}>
                          <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="No review yet" /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? 's' : ''}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Customer Review Notes</Label>
                      <Textarea value={editForm.customerReviewNotes}
                        onChange={(e) => setEditForm({ ...editForm, customerReviewNotes: e.target.value })}
                        className="bg-slate-800 border-slate-700" placeholder="What the customer said" />
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Label>Needs Remake (transport/manufacturing defect)?</Label>
                      <Select value={editForm.needsRemake ? 'YES' : 'NO'} onValueChange={(v) => setEditForm({ ...editForm, needsRemake: v === 'YES' })}>
                        <SelectTrigger className="w-32 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NO">No</SelectItem>
                          <SelectItem value="YES">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editForm.needsRemake && (
                      <>
                        <div>
                          <Label>Remake Reason</Label>
                          <Select value={editForm.remakeReason} onValueChange={(v) => setEditForm({ ...editForm, remakeReason: v })}>
                            <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue placeholder="Select reason" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TRANSPORT_DAMAGE">Transport Damage</SelectItem>
                              <SelectItem value="MANUFACTURING_DEFECT">Manufacturing Defect</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Remake Notes (for Production)</Label>
                          <Textarea value={editForm.remakeNotes}
                            onChange={(e) => setEditForm({ ...editForm, remakeNotes: e.target.value })}
                            className="bg-slate-800 border-slate-700" placeholder="What needs to be redone" />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {progress.total > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm">Production Progress (read-only)</p>
                      <p className="text-xs text-slate-400">{progress.completedCount}/{progress.total} complete</p>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                  </div>
                )}

                {editForm.status === 'DISPATCHED' && !editForm.dispatchDate && (
                  <p className="text-xs text-indigo-300">Dispatch date will be filled automatically with today's date.</p>
                )}

                <Button onClick={handleUpdateOrder} className="w-full bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>

                <OrderHistory orderId={selectedOrder.id} refreshKey={historyKey} />
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Full read-only details for ANY order — everything incl. edit history */}
      <OrderDetailDialog
        orderId={detailOrderId}
        open={showFullDetails}
        onOpenChange={setShowFullDetails}
        refreshKey={historyKey}
      />
    </div>
  )
}
