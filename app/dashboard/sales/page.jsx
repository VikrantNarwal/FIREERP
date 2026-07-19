'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function SimpleSalesDashboard() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false)

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
    notes: ''
  })

  // New Customer State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    city: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts()
      ])
      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
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
        flameColor: 'ORANGE',
        soundOption: false,
        rgbOption: false,
        quantity,
        unitPrice: price,
        totalPrice: price * quantity,
        finalPrice: price * quantity,
        discount: 0,
        priority: 'NORMAL',
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
        notes: ''
      })
    } catch (error) {
      toast.error('Failed to create order')
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      QUOTATION: 'bg-yellow-600',
      APPROVED: 'bg-blue-600',
      IN_PRODUCTION: 'bg-purple-600',
      DISPATCHED: 'bg-green-600',
      DELIVERED: 'bg-green-700'
    }
    return colors[status] || 'bg-gray-600'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales & Orders</h1>
          <p className="text-slate-400 text-sm mt-1">Manage customer orders</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-white">
                <Users className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 text-white border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Customer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    placeholder="Enter customer name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    placeholder="Enter phone number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Enter address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="Enter city"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)} className="border-slate-700">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomer} className="bg-blue-600 hover:bg-blue-700">
                    Add Customer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-slate-900 text-white border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select value={newOrder.customerId} onValueChange={(value) => setNewOrder({...newOrder, customerId: value})}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id} className="text-white">
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={newOrder.productId} onValueChange={(value) => setNewOrder({...newOrder, productId: value})}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id} className="text-white">
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Select value={newOrder.variant} onValueChange={(value) => setNewOrder({...newOrder, variant: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="EF" className="text-white">Basic</SelectItem>
                      <SelectItem value="EFP" className="text-white">Premium</SelectItem>
                      <SelectItem value="EFH" className="text-white">With Heater</SelectItem>
                      <SelectItem value="EFHP" className="text-white">Premium + Heater</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Width (mm)</Label>
                    <Input
                      type="number"
                      placeholder="1200"
                      value={newOrder.width}
                      onChange={(e) => setNewOrder({...newOrder, width: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      placeholder="800"
                      value={newOrder.height}
                      onChange={(e) => setNewOrder({...newOrder, height: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Depth (mm)</Label>
                    <Input
                      type="number"
                      placeholder="300"
                      value={newOrder.depth}
                      onChange={(e) => setNewOrder({...newOrder, depth: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₹) *</Label>
                    <Input
                      type="number"
                      placeholder="25000"
                      value={newOrder.price}
                      onChange={(e) => setNewOrder({...newOrder, price: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any special requirements..."
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowNewOrderDialog(false)} className="border-slate-700">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} className="bg-blue-600 hover:bg-blue-700">
                    Create Order
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-400">Total Orders</CardTitle>
              <Package className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-400">In Production</CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {orders.filter(o => o.status === 'IN_PRODUCTION').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-400">Customers</CardTitle>
              <Users className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{customers.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-400">Quotations</CardTitle>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {orders.filter(o => o.status === 'QUOTATION').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No orders yet. Click "New Order" to create one.
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white">{order.jobNumber}</span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {order.customer?.name} • {order.product?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">₹{order.finalPrice?.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">Qty: {order.quantity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
