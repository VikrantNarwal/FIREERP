'use client'

import { useState, useEffect } from 'react'
import { Plus, Download, ShoppingCart, AlertTriangle, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function InventoryManager() {
  const [components, setComponents] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchaseList, setPurchaseList] = useState([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [loading, setLoading] = useState(true)

  const [newItem, setNewItem] = useState({
    name: '',
    code: '',
    category: 'OTHER',
    specs: '',
    supplierId: '',
    unitPrice: '',
    currentStock: '',
    reorderLevel: '',
    unit: 'pcs'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [componentsData, suppliersData] = await Promise.all([
        api.getComponents(),
        api.getSuppliers()
      ])
      setComponents(componentsData || [])
      setSuppliers(suppliersData || [])
    } catch (error) {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.code) {
      toast.error('Name and code are required')
      return
    }

    try {
      await api.createComponent({
        ...newItem,
        currentStock: parseFloat(newItem.currentStock) || 0,
        unitPrice: parseFloat(newItem.unitPrice) || 0,
        reorderLevel: parseFloat(newItem.reorderLevel) || 10
      })
      toast.success('✅ Item added!')
      setShowAddItem(false)
      setNewItem({
        name: '',
        code: '',
        category: 'OTHER',
        specs: '',
        supplierId: '',
        unitPrice: '',
        currentStock: '',
        reorderLevel: '',
        unit: 'pcs'
      })
      loadData()
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  const handleCellEdit = async (componentId, field, value) => {
    try {
      // Update the component in the backend
      await api.put(`/components/${componentId}`, { [field]: value })
      
      // Update local state
      setComponents(prev => prev.map(c => 
        c.id === componentId ? { ...c, [field]: value } : c
      ))
      
      toast.success('Updated!')
      setEditingId(null)
      setEditingField(null)
    } catch (error) {
      toast.error('Update failed')
    }
  }

  const addToPurchaseList = (component) => {
    const existing = purchaseList.find(p => p.id === component.id)
    if (existing) {
      toast.info('Already in purchase list')
      return
    }
    
    const qtyNeeded = Math.max(
      component.reorderQuantity || 100,
      component.reorderLevel - component.currentStock
    )
    
    setPurchaseList(prev => [...prev, {
      ...component,
      quantityToPurchase: qtyNeeded
    }])
    toast.success(`Added ${component.name} to purchase list`)
  }

  const generatePurchaseOrder = () => {
    if (purchaseList.length === 0) {
      toast.error('Purchase list is empty')
      return
    }

    const poText = `
PURCHASE ORDER
Generated: ${new Date().toLocaleString()}

${purchaseList.map((item, idx) => `
${idx + 1}. ${item.name} (${item.code})
   Supplier: ${item.supplier?.name || 'N/A'}
   Quantity: ${item.quantityToPurchase} ${item.unit}
   Unit Price: ₹${item.unitPrice}
   Total: ₹${(item.quantityToPurchase * item.unitPrice).toFixed(2)}
`).join('\n')}

TOTAL AMOUNT: ₹${purchaseList.reduce((sum, item) => 
  sum + (item.quantityToPurchase * item.unitPrice), 0
).toFixed(2)}
    `

    // Create blob and download
    const blob = new Blob([poText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PO_${Date.now()}.txt`
    a.click()
    
    toast.success('Purchase order generated!')
    setPurchaseList([])
  }

  const lowStockItems = components.filter(c => c.currentStock <= c.reorderLevel)

  if (loading) {
    return <div className="text-white text-center py-12">Loading inventory...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-slate-400 text-sm">Excel-style inventory tracker</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" className="border-slate-700 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 text-white border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Item Code *</Label>
                  <Input
                    value={newItem.code}
                    onChange={(e) => setNewItem({...newItem, code: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newItem.category} onValueChange={(v) => setNewItem({...newItem, category: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="FRP_LOGS" className="text-white">FRP Logs</SelectItem>
                      <SelectItem value="LED_MODULES" className="text-white">LED Modules</SelectItem>
                      <SelectItem value="STEPPER_MOTORS" className="text-white">Motors</SelectItem>
                      <SelectItem value="PCBS" className="text-white">PCBs</SelectItem>
                      <SelectItem value="OTHER" className="text-white">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={newItem.supplierId} onValueChange={(v) => setNewItem({...newItem, supplierId: v})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-white">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specifications</Label>
                  <Input
                    value={newItem.specs}
                    onChange={(e) => setNewItem({...newItem, specs: e.target.value})}
                    placeholder="Size, color, model..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (₹)</Label>
                  <Input
                    type="number"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input
                    type="number"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({...newItem, currentStock: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    value={newItem.reorderLevel}
                    onChange={(e) => setNewItem({...newItem, reorderLevel: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddItem(false)} className="border-slate-700">
                  Cancel
                </Button>
                <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700">
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="bg-red-900/20 border-red-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {lowStockItems.length} Items Low on Stock
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Purchase List */}
      {purchaseList.length > 0 && (
        <Card className="bg-green-900/20 border-green-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-green-400 font-semibold">
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                {purchaseList.length} items in purchase list
              </div>
              <Button onClick={generatePurchaseOrder} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Generate PO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Excel-Style Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Specs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Price (₹)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Min</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {components.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                      No inventory items. Click "Add Item" to start.
                    </td>
                  </tr>
                ) : (
                  components.map((comp) => (
                    <tr 
                      key={comp.id} 
                      className={`hover:bg-slate-800 transition-colors ${
                        comp.currentStock <= comp.reorderLevel ? 'bg-red-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-medium">{comp.name}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-sm">{comp.code}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {editingId === comp.id && editingField === 'description' ? (
                          <Input
                            autoFocus
                            defaultValue={comp.description || ''}
                            onBlur={(e) => handleCellEdit(comp.id, 'description', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellEdit(comp.id, 'description', e.target.value)
                              if (e.key === 'Escape') { setEditingId(null); setEditingField(null) }
                            }}
                            className="bg-slate-700 border-slate-600 text-white h-8 text-sm"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingId(comp.id); setEditingField('description') }}
                            className="cursor-pointer hover:bg-slate-700 px-2 py-1 rounded"
                          >
                            {comp.description || 'Click to add'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{comp.supplier?.name || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {editingId === comp.id && editingField === 'unitPrice' ? (
                          <Input
                            type="number"
                            autoFocus
                            defaultValue={comp.unitPrice || ''}
                            onBlur={(e) => handleCellEdit(comp.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellEdit(comp.id, 'unitPrice', parseFloat(e.target.value) || 0)
                              if (e.key === 'Escape') { setEditingId(null); setEditingField(null) }
                            }}
                            className="bg-slate-700 border-slate-600 text-white h-8 text-sm text-right"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingId(comp.id); setEditingField('unitPrice') }}
                            className="cursor-pointer hover:bg-slate-700 px-2 py-1 rounded text-green-400 font-semibold"
                          >
                            ₹{comp.unitPrice || 0}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === comp.id && editingField === 'currentStock' ? (
                          <Input
                            type="number"
                            autoFocus
                            defaultValue={comp.currentStock || ''}
                            onBlur={(e) => handleCellEdit(comp.id, 'currentStock', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellEdit(comp.id, 'currentStock', parseFloat(e.target.value) || 0)
                              if (e.key === 'Escape') { setEditingId(null); setEditingField(null) }
                            }}
                            className="bg-slate-700 border-slate-600 text-white h-8 text-sm text-right"
                          />
                        ) : (
                          <div 
                            onClick={() => { setEditingId(comp.id); setEditingField('currentStock') }}
                            className={`cursor-pointer hover:bg-slate-700 px-2 py-1 rounded font-bold ${
                              comp.currentStock <= comp.reorderLevel ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {comp.currentStock}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-sm">{comp.reorderLevel}</td>
                      <td className="px-4 py-3 text-center">
                        {comp.currentStock <= comp.reorderLevel && (
                          <Button 
                            size="sm"
                            onClick={() => addToPurchaseList(comp)}
                            className="bg-orange-600 hover:bg-orange-700 h-7 text-xs"
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Order
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
