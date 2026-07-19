'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function InventoryDashboard() {
  const [components, setComponents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComponents()
  }, [])

  const loadComponents = async () => {
    try {
      const data = await api.getComponents()
      setComponents(data)
    } catch (error) {
      toast.error('Failed to load components')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = async (componentId, newStock) => {
    try {
      await api.put(`/components/${componentId}`, {
        currentStock: parseFloat(newStock)
      })
      toast.success('Stock updated')
      setEditingId(null)
      loadComponents()
    } catch (error) {
      toast.error('Failed to update stock')
    }
  }

  const generatePurchaseList = () => {
    const lowStock = components.filter(c => c.currentStock <= c.reorderLevel)
    if (lowStock.length === 0) {
      toast.info('All components are adequately stocked')
      return
    }
    
    const list = lowStock.map(c => 
      `${c.name} (${c.code}): Current: ${c.currentStock} ${c.unit}, Reorder: ${c.reorderQuantity} ${c.unit}`
    ).join('\n')
    
    const blob = new Blob([`Purchase Order List\n\n${list}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `purchase-list-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    toast.success('Purchase list generated')
  }

  const lowStockCount = components.filter(c => c.currentStock <= c.reorderLevel).length

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
          <p className="text-slate-400 mt-1">Excel-like component tracking</p>
        </div>
        <Button onClick={generatePurchaseList} className="gap-2">
          <FileDown className="w-4 h-4" />
          Generate Purchase List
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Total Components</p>
            <p className="text-3xl font-bold text-white">{components.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Low Stock Items</p>
            <p className="text-3xl font-bold text-yellow-400">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">Critical Stock</p>
            <p className="text-3xl font-bold text-red-400">
              {components.filter(c => c.currentStock === 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Component Inventory (Click stock to edit)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Current Stock</th>
                  <th className="text-right p-3">Reorder Level</th>
                  <th className="text-right p-3">Reorder Qty</th>
                  <th className="text-left p-3">Unit</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {components.map(component => (
                  <tr key={component.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-slate-300">{component.code}</td>
                    <td className="p-3 text-white">{component.name}</td>
                    <td className="p-3 text-slate-400">{component.category}</td>
                    <td className="p-3 text-right">
                      {editingId === component.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 h-8 bg-slate-700 border-slate-600 text-white"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStock(component.id, editValue)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <span
                          onClick={() => {
                            setEditingId(component.id)
                            setEditValue(component.currentStock.toString())
                          }}
                          className="cursor-pointer hover:underline text-white font-semibold"
                        >
                          {component.currentStock}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-400">{component.reorderLevel}</td>
                    <td className="p-3 text-right text-slate-400">{component.reorderQuantity}</td>
                    <td className="p-3 text-slate-400">{component.unit}</td>
                    <td className="p-3">
                      {component.currentStock === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : component.currentStock <= component.reorderLevel ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">In Stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
