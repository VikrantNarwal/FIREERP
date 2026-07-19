'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function SalesDashboard() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)

  const [newOrder, setNewOrder] = useState({
    customerId: '',
    productId: '',
    fireplaceType: 'ELECTRICAL_FIREPLACE',
    variant: 'EF',
    dimensions: { width: 0, height: 0, depth: 0 },
    flameColor: 'ORANGE',
    soundOption: false,
    rgbOption: false,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    notes: ''
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

  const handleCreateOrder = async () => {
    try {
      const totalPrice = newOrder.unitPrice * newOrder.quantity
      const finalPrice = totalPrice - (newOrder.discount || 0)

      const orderData = {
        ...newOrder,
        totalPrice,
        finalPrice,
        dimensions: newOrder.dimensions
      }

      await api.createOrder(orderData)
      toast.success('Order created successfully!')
      setShowNewOrderDialog(false)
      loadData()
      
      setNewOrder({
        customerId: '',
        productId: '',
        fireplaceType: 'ELECTRICAL_FIREPLACE',
        variant: 'EF',
        dimensions: { width: 0, height: 0, depth: 0 },
        flameColor: 'ORANGE',
        soundOption: false,
        rgbOption: false,
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        notes: ''
      })
    } catch (error) {
      toast.error('Failed to create order')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      QUOTATION: 'bg-yellow-500',
      APPROVED: 'bg-green-500',
      IN_PRODUCTION: 'bg-blue-500',
      QC_PENDING: 'bg-orange-500',
      DISPATCHED: 'bg-purple-500',
      DELIVERED: 'bg-green-600',
      CLOSED: 'bg-gray-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage orders and quotations</p>
        </div>
        <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Order</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter order details for a new fireplace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Customer</Label>
                  <Select value={newOrder.customerId} onValueChange={(value) => setNewOrder({...newOrder, customerId: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id} className="text-white">{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Product</Label>
                  <Select value={newOrder.productId} onValueChange={(value) => setNewOrder({...newOrder, productId: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id} className="text-white">{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Variant</Label>
                  <Select value={newOrder.variant} onValueChange={(value) => setNewOrder({...newOrder, variant: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="EF" className="text-white">E.F. (Basic)</SelectItem>
                      <SelectItem value="EFP" className="text-white">E.F.P. (Premium)</SelectItem>
                      <SelectItem value="EFH" className="text-white">E.F.H. (with Heater)</SelectItem>
                      <SelectItem value="EFHP" className="text-white">E.F.H.P. (Heater Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Flame Color</Label>
                  <Select value={newOrder.flameColor} onValueChange={(value) => setNewOrder({...newOrder, flameColor: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="ORANGE" className="text-white">Orange</SelectItem>
                      <SelectItem value="BLUE" className="text-white">Blue</SelectItem>
                      <SelectItem value="MULTICOLOR" className="text-white">Multicolor</SelectItem>
                      <SelectItem value="RGB" className="text-white">RGB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Width (mm)</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.dimensions.width}
                    onChange={(e) => setNewOrder({...newOrder, dimensions: {...newOrder.dimensions, width: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Height (mm)</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.dimensions.height}
                    onChange={(e) => setNewOrder({...newOrder, dimensions: {...newOrder.dimensions, height: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Depth (mm)</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.dimensions.depth}
                    onChange={(e) => setNewOrder({...newOrder, dimensions: {...newOrder.dimensions, depth: parseFloat(e.target.value)}})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Unit Price (₹)</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.unitPrice}
                    onChange={(e) => setNewOrder({...newOrder, unitPrice: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Quantity</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({...newOrder, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Discount (₹)</Label>
                  <Input
                    type="number"
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newOrder.discount}
                    onChange={(e) => setNewOrder({...newOrder, discount: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Notes</Label>
                <Textarea
                  className="bg-slate-800 border-slate-700 text-white"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowNewOrderDialog(false)} className="border-slate-700 text-white">Cancel</Button>
                <Button onClick={handleCreateOrder} className="bg-blue-600 hover:bg-blue-700">Create Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">Total Orders</CardDescription>
            <CardTitle className="text-3xl text-white">{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">In Production</CardDescription>
            <CardTitle className="text-3xl text-white">{orders.filter(o => o.status === 'IN_PRODUCTION').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">Dispatched</CardDescription>
            <CardTitle className="text-3xl text-white">{orders.filter(o => o.status === 'DISPATCHED').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">Delivered</CardDescription>
            <CardTitle className="text-3xl text-white">{orders.filter(o => o.status === 'DELIVERED').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div>
                  <p className="font-semibold text-white">{order.jobNumber}</p>
                  <p className="text-sm text-slate-400">{order.customer?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-white">{order.product?.name}</p>
                  <p className="text-xs text-slate-400">{order.variant}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">₹{order.finalPrice?.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Qty: {order.quantity}</p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
