'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Package, FileDown, Edit, Bell, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

export default function InventoryDashboard() {
  const [components, setComponents] = useState([])
  const [editingComponent, setEditingComponent] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showUrgentNoteDialog, setShowUrgentNoteDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await api.get('/inventory-options?type=CATEGORY')
      setCategories(data)
    } catch (error) {
      toast.error('Failed to load categories')
    }
  }
  
  const [urgentNote, setUrgentNote] = useState({
    componentIds: [],
    message: '',
    priority: 'HIGH'
  })

  const [editForm, setEditForm] = useState({
    code: '',
    name: '',
    category: '',
    currentStock: 0,
    reorderLevel: 0,
    reorderQuantity: 0,
    unit: '',
    vendorName: '',
    vendorContact: '',
    vendorEmail: '',
    notes: ''
  })

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

  const handleEditClick = (component) => {
    setEditingComponent(component)
    setEditForm({
      code: component.code || '',
      name: component.name || '',
      category: component.category || '',
      currentStock: component.currentStock || 0,
      reorderLevel: component.reorderLevel || 0,
      reorderQuantity: component.reorderQuantity || 0,
      unit: component.unit || 'PCS',
      vendorName: component.vendorName || '',
      vendorContact: component.vendorContact || '',
      vendorEmail: component.vendorEmail || '',
      notes: component.notes || ''
    })
    setShowEditDialog(true)
  }

  const handleSaveComponent = async () => {
    if (!editForm.name || !editForm.code) {
      toast.error('Name and code are required')
      return
    }

    try {
      await api.put(`/components/${editingComponent.id}`, editForm)
      toast.success('Component updated successfully!')
      setShowEditDialog(false)
      loadComponents()
    } catch (error) {
      toast.error('Failed to update component')
    }
  }

  const handleSendUrgentNote = async () => {
    if (!urgentNote.message) {
      toast.error('Please enter a message')
      return
    }

    const lowStockComponents = components.filter(c => c.currentStock <= c.reorderLevel)
    
    try {
      await api.createAlert({
        category: 'INVENTORY_SHORTAGE',
        message: `URGENT: Inventory Purchase Request - ${lowStockComponents.length} items low stock`,
        details: `${urgentNote.message}\n\nLow Stock Items:\n${lowStockComponents.map(c => 
          `- ${c.name} (${c.code}): Current: ${c.currentStock}, Need: ${c.reorderQuantity}, Vendor: ${c.vendorName || 'Not specified'}`
        ).join('\n')}`,
        severity: urgentNote.priority,
        orderId: null
      })
      
      toast.success('Urgent note sent to CEO!')
      setShowUrgentNoteDialog(false)
      setUrgentNote({ componentIds: [], message: '', priority: 'HIGH' })
    } catch (error) {
      toast.error('Failed to send urgent note')
    }
  }

  const generatePurchaseList = () => {
    const lowStock = components.filter(c => c.currentStock <= c.reorderLevel)
    if (lowStock.length === 0) {
      toast.info('All components are adequately stocked')
      return
    }
    
    const list = `PURCHASE ORDER LIST\nGenerated: ${new Date().toLocaleString()}\n\n` +
      lowStock.map(c => 
        `Item: ${c.name}\n` +
        `Code: ${c.code}\n` +
        `Category: ${c.category}\n` +
        `Current Stock: ${c.currentStock} ${c.unit}\n` +
        `Reorder Quantity: ${c.reorderQuantity} ${c.unit}\n` +
        `Vendor: ${c.vendorName || 'Not specified'}\n` +
        `Contact: ${c.vendorContact || 'Not specified'}\n` +
        `Email: ${c.vendorEmail || 'Not specified'}\n` +
        `${'-'.repeat(50)}\n`
      ).join('\n')
    
    const blob = new Blob([list], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `purchase-list-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    toast.success('Purchase list generated')
  }

  const lowStockCount = components.filter(c => c.currentStock <= c.reorderLevel).length
  const criticalStockCount = components.filter(c => c.currentStock === 0).length

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
          <p className="text-slate-400 mt-1">Complete component tracking with vendor management</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowUrgentNoteDialog(true)} 
            className="gap-2 bg-red-600 hover:bg-red-700"
            disabled={lowStockCount === 0}
          >
            <Bell className="w-4 h-4" />
            Send Urgent Note to CEO
          </Button>
          <Button onClick={generatePurchaseList} className="gap-2">
            <FileDown className="w-4 h-4" />
            Generate Purchase List
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-sm text-slate-400">Out of Stock</p>
            <p className="text-3xl font-bold text-red-400">{criticalStockCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">In Stock</p>
            <p className="text-3xl font-bold text-green-400">
              {components.length - lowStockCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Components Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Component Inventory (Click Edit to modify all fields)</CardTitle>
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
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-left p-3">Contact</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {components.map(component => (
                  <tr key={component.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-slate-300 font-mono text-xs">{component.code}</td>
                    <td className="p-3 text-white">{component.name}</td>
                    <td className="p-3 text-slate-400">{component.category}</td>
                    <td className="p-3 text-right text-white font-semibold">{component.currentStock}</td>
                    <td className="p-3 text-right text-slate-400">{component.reorderLevel}</td>
                    <td className="p-3 text-right text-slate-400">{component.reorderQuantity}</td>
                    <td className="p-3 text-slate-400">{component.unit}</td>
                    <td className="p-3 text-slate-300">{component.vendorName || '-'}</td>
                    <td className="p-3 text-slate-300 text-xs">{component.vendorContact || '-'}</td>
                    <td className="p-3">
                      {component.currentStock === 0 ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : component.currentStock <= component.reorderLevel ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Low Stock</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">In Stock</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleEditClick(component)}
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Component Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code *</Label>
                <Input
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label>Component Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  value={editForm.currentStock}
                  onChange={(e) => setEditForm({ ...editForm, currentStock: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={editForm.reorderLevel}
                  onChange={(e) => setEditForm({ ...editForm, reorderLevel: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label>Reorder Quantity</Label>
                <Input
                  type="number"
                  value={editForm.reorderQuantity}
                  onChange={(e) => setEditForm({ ...editForm, reorderQuantity: parseFloat(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={editForm.unit} onValueChange={(v) => setEditForm({ ...editForm, unit: v })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">Pieces</SelectItem>
                    <SelectItem value="KG">Kilograms</SelectItem>
                    <SelectItem value="M">Meters</SelectItem>
                    <SelectItem value="L">Liters</SelectItem>
                    <SelectItem value="BOX">Box</SelectItem>
                    <SelectItem value="ROLL">Roll</SelectItem>
                    <SelectItem value="SET">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Vendor Information
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Vendor Name</Label>
                  <Input
                    value={editForm.vendorName}
                    onChange={(e) => setEditForm({ ...editForm, vendorName: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Vendor company name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vendor Contact</Label>
                    <Input
                      value={editForm.vendorContact}
                      onChange={(e) => setEditForm({ ...editForm, vendorContact: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <Label>Vendor Email</Label>
                    <Input
                      type="email"
                      value={editForm.vendorEmail}
                      onChange={(e) => setEditForm({ ...editForm, vendorEmail: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      placeholder="vendor@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes / Instructions</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Special handling instructions, storage requirements, etc."
                rows={3}
              />
            </div>

            <Button onClick={handleSaveComponent} className="w-full bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Urgent Note to CEO Dialog */}
      <Dialog open={showUrgentNoteDialog} onOpenChange={setShowUrgentNoteDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500" />
              Send Urgent Purchase Request to CEO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <p className="text-sm text-yellow-400">
                <strong>{lowStockCount} components</strong> are currently at or below reorder level.
                This message will create a critical alert on CEO dashboard.
              </p>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={urgentNote.priority} onValueChange={(v) => setUrgentNote({ ...urgentNote, priority: v })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message to CEO *</Label>
              <Textarea
                value={urgentNote.message}
                onChange={(e) => setUrgentNote({ ...urgentNote, message: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Explain the urgency and what action is needed..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSendUrgentNote} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Send Urgent Request to CEO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
