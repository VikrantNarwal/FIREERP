'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, DollarSign, FileText, Upload, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'

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
  
  // New Order State
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    productId: '',
    variant: 'EF',
    width: '',
    height: '',
    depth: '',
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
          depth: parseFloat(newOrder.depth) || 0
        },
        quantity: quantity,
        unitPrice: price,
        totalPrice: price * quantity,
        finalPrice: price * quantity,
        promisedDate: new Date(newOrder.promisedDate).toISOString(),
        notes: newOrder.notes
      }

      await api.createOrder(orderData)
      toast.success('Order created successfully!')
      setShowNewOrderDialog(false)
      loadData()
      setNewOrder({
        customerId: '',
        productId: '',
        variant: 'EF',
        width: '',
        height: '',
        depth: '',
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

  const getStatusColor = (status) => {
    const colors = {
      'QUOTATION': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'APPROVED': 'bg-green-500/20 text-green-400 border-green-500/50',
      'IN_PRODUCTION': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'DELIVERED': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
    }
    return colors[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  const stats = {
    totalOrders: orders.length,
    quotations: orders.filter(o => o.status === 'QUOTATION').length,
    approved: orders.filter(o => o.status === 'APPROVED' || o.status === 'IN_PRODUCTION').length,
    customers: customers.length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage orders, customers, and quotations</p>
        </div>
        <div className="flex gap-2">
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
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Width (cm)</Label>
                    <Input
                      type="number"
                      value={newOrder.width}
                      onChange={(e) => setNewOrder({ ...newOrder, width: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={newOrder.height}
                      onChange={(e) => setNewOrder({ ...newOrder, height: e.target.value })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Depth (cm)</Label>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="bg-slate-900 border-slate-800 cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => setShowOrdersModal(true)}
        >
          <CardContent className="p-6">
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
          <CardContent className="p-6">
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
          <CardContent className="p-6">
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
          <CardContent className="p-6">
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
          <CardTitle className="text-white">Recent Orders</CardTitle>
          <CardDescription className="text-slate-400">Manage and track order payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.slice(0, 10).map((order) => (
              <div
                key={order.id}
                className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      {order.advanceAmountPaid && order.advanceAmountPaid > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Advance Paid: ₹{order.advanceAmountPaid}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>{order.customer?.name}</span>
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
            ))}
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
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{order.jobNumber}</p>
                  <p className="text-xs text-slate-400">{order.customer?.name}</p>
                </div>
                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
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
