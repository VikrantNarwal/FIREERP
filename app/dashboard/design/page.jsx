'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Ruler, CheckCircle, Clock, AlertCircle, Settings, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

const emptyVariableForm = { id: null, label: '', unit: '', group: 'General' }

export default function DesignDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [measurementValues, setMeasurementValues] = useState({})

  // Pre-assembly measurement field definitions — fully owned by Design.
  const [variables, setVariables] = useState([])
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [variableForm, setVariableForm] = useState(emptyVariableForm)
  const [variableToDelete, setVariableToDelete] = useState(null)

  useEffect(() => {
    loadOrders()
    loadVariables()
    const interval = setInterval(loadOrders, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await api.getOrders()
      const designOrders = (data || []).filter(o =>
        o.status === 'QUOTATION' || o.status === 'APPROVED' || o.status === 'IN_PRODUCTION'
      )
      setOrders(designOrders)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadVariables = async () => {
    try {
      const data = await api.getPreAssemblyVariables()
      setVariables(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load measurement fields')
    }
  }

  const handleApproveDesign = async (orderId) => {
    try {
      await api.updateOrder(orderId, {
        status: 'APPROVED',
        designApprovedAt: new Date().toISOString()
      })
      toast.success('Design approved successfully!')
      loadOrders()
    } catch (error) {
      toast.error(error.message || 'Failed to approve design')
    }
  }

  const openOrderDetail = (order) => {
    setSelectedOrder(order)
    // Pre-fill from whatever is already saved on the order; any field with no
    // saved value yet defaults to an empty string.
    const existing = order.designMeasurements && typeof order.designMeasurements === 'object'
      ? order.designMeasurements
      : {}
    const initial = {}
    variables.forEach(v => { initial[v.key] = existing[v.key] ?? '' })
    setMeasurementValues(initial)
    setShowDetailDialog(true)
  }

  const handleSaveMeasurements = async () => {
    if (!selectedOrder) return

    try {
      // Drop empty values so we only store fields the designer actually filled in
      const cleaned = Object.fromEntries(
        Object.entries(measurementValues).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      )

      await api.updateOrder(selectedOrder.id, { designMeasurements: cleaned })

      toast.success('Measurements saved successfully!')
      loadOrders()
      setShowDetailDialog(false)
    } catch (error) {
      toast.error(error.message || 'Failed to save measurements')
    }
  }

  // ---------- Pre-Assembly Variable management (create / rename / delete) ----------

  const handleSaveVariable = async () => {
    if (!variableForm.label.trim()) {
      toast.error('Label is required')
      return
    }

    try {
      if (variableForm.id) {
        await api.updatePreAssemblyVariable(variableForm.id, {
          label: variableForm.label,
          unit: variableForm.unit,
          group: variableForm.group
        })
        toast.success('Measurement field updated')
      } else {
        await api.createPreAssemblyVariable({
          label: variableForm.label,
          unit: variableForm.unit,
          group: variableForm.group
        })
        toast.success('Measurement field added')
      }
      setVariableForm(emptyVariableForm)
      await loadVariables()
    } catch (error) {
      toast.error(error.message || 'Failed to save measurement field')
    }
  }

  const handleDeleteVariable = async () => {
    if (!variableToDelete) return
    try {
      await api.deletePreAssemblyVariable(variableToDelete.id)
      toast.success(`"${variableToDelete.label}" deleted`)
      setVariableToDelete(null)
      await loadVariables()
    } catch (error) {
      toast.error(error.message || 'Failed to delete measurement field')
    }
  }

  // Group variables for display (e.g. "Wooden Log", "Mirror") in the order Design defined them
  const groupedVariables = variables.reduce((acc, v) => {
    if (!acc[v.group]) acc[v.group] = []
    acc[v.group].push(v)
    return acc
  }, {})

  const columns = [
    { id: 'QUOTATION', title: 'New Quotations', icon: AlertCircle, color: 'text-blue-400', orders: orders.filter(o => o.status === 'QUOTATION') },
    { id: 'APPROVED', title: 'Design Approved', icon: CheckCircle, color: 'text-green-400', orders: orders.filter(o => o.status === 'APPROVED') },
    { id: 'IN_PRODUCTION', title: 'In Production', icon: Clock, color: 'text-purple-400', orders: orders.filter(o => o.status === 'IN_PRODUCTION') }
  ]

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-red-500 text-white',
      'HIGH': 'bg-orange-500 text-white',
      'NORMAL': 'bg-blue-500 text-white',
      'LOW': 'bg-slate-500 text-white'
    }
    return colors[priority] || colors['NORMAL']
  }

  if (loading) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Design Dashboard</h1>
          <p className="text-slate-400 mt-1">Multi-task design board with priority sorting</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-slate-700 text-slate-200 hover:text-white"
          onClick={() => { setVariableForm(emptyVariableForm); setShowManageDialog(true) }}
        >
          <Settings className="w-4 h-4" />
          Manage Measurement Fields
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Active</p>
                <p className="text-3xl font-bold text-white">{orders.length}</p>
              </div>
              <Ruler className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {columns.map((col) => (
          <Card key={col.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{col.title}</p>
                  <p className="text-3xl font-bold text-white">{col.orders.length}</p>
                </div>
                <col.icon className={`w-8 h-8 ${col.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <Card key={column.id} className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <column.icon className={`w-5 h-5 ${column.color}`} />
                {column.title}
                <Badge variant="secondary" className="ml-auto">{column.orders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {column.orders
                  .sort((a, b) => {
                    const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 }
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  })
                  .map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                      onClick={() => openOrderDetail(order)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-semibold">{order.jobNumber}</h3>
                        <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{order.customer?.name}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{order.variant}</span>
                      </div>
                      {order.dimensions && (
                        <div className="mt-2 text-xs text-slate-400">
                          {order.dimensions.width}W × {order.dimensions.height}H × {order.dimensions.depth}D
                        </div>
                      )}
                    </div>
                  ))}
                {column.orders.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No orders in this stage</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Design Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Job Number</Label>
                  <p className="text-white font-semibold">{selectedOrder.jobNumber}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Customer</Label>
                  <p className="text-white">{selectedOrder.customer?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-400">Width</Label>
                  <p className="text-white">{selectedOrder.dimensions?.width || 0} mm</p>
                </div>
                <div>
                  <Label className="text-slate-400">Height</Label>
                  <p className="text-white">{selectedOrder.dimensions?.height || 0} mm</p>
                </div>
                <div>
                  <Label className="text-slate-400">Depth</Label>
                  <p className="text-white">{selectedOrder.dimensions?.depth || 0} mm</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">Product</Label>
                <p className="text-white">{selectedOrder.product?.name} - {selectedOrder.variant}</p>
              </div>

              {selectedOrder.notes && (
                <div>
                  <Label className="text-slate-400">Notes</Label>
                  <p className="text-white">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Dynamic Measurement Inputs — rendered from whatever fields Design has defined */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Pre-Assembly Measurements</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-400 hover:text-white gap-1"
                    onClick={() => { setVariableForm(emptyVariableForm); setShowManageDialog(true) }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Edit Fields
                  </Button>
                </div>

                {variables.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No measurement fields defined yet. Click "Edit Fields" to add one (e.g. Wooden Log Length, Mirror Height).
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedVariables).map(([group, groupVars]) => (
                      <div key={group}>
                        <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{group}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {groupVars.map(v => (
                            <div key={v.id}>
                              <Label className="text-slate-400">
                                {v.label}{v.unit ? ` (${v.unit})` : ''}
                              </Label>
                              <Input
                                value={measurementValues[v.key] ?? ''}
                                onChange={(e) => setMeasurementValues({ ...measurementValues, [v.key]: e.target.value })}
                                className="bg-slate-800 border-slate-700 text-white"
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <Button onClick={handleSaveMeasurements} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Ruler className="w-4 h-4 mr-2" />
                  Save Measurements
                </Button>
                {selectedOrder.status === 'QUOTATION' && (
                  <Button
                    onClick={() => { handleApproveDesign(selectedOrder.id); setShowDetailDialog(false) }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Design
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Measurement Fields Dialog — full create/rename/delete, no schema changes needed */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Pre-Assembly Measurement Fields</DialogTitle>
            <p className="text-sm text-slate-400">
              Add, rename, or delete any measurement field — wooden log dimensions, mirror
              measurements, or anything else. Changes apply instantly to every order's
              measurement form, no deploy needed.
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add / Edit form */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
              <p className="text-sm font-medium text-slate-300">
                {variableForm.id ? 'Edit field' : 'Add a new field'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label className="text-slate-400 text-xs">Group</Label>
                  <Input
                    value={variableForm.group}
                    onChange={(e) => setVariableForm({ ...variableForm, group: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="e.g. Wooden Log, Mirror"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-slate-400 text-xs">Field Label *</Label>
                  <Input
                    value={variableForm.label}
                    onChange={(e) => setVariableForm({ ...variableForm, label: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="e.g. Mirror Height"
                  />
                </div>
                <div className="col-span-1">
                  <Label className="text-slate-400 text-xs">Unit</Label>
                  <Input
                    value={variableForm.unit}
                    onChange={(e) => setVariableForm({ ...variableForm, unit: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="e.g. mm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveVariable} className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  {variableForm.id ? 'Save Changes' : 'Add Field'}
                </Button>
                {variableForm.id && (
                  <Button variant="outline" onClick={() => setVariableForm(emptyVariableForm)}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Existing fields list */}
            <div className="space-y-3">
              {Object.entries(groupedVariables).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No measurement fields yet — add one above.</p>
              )}
              {Object.entries(groupedVariables).map(([group, groupVars]) => (
                <div key={group}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{group}</p>
                  <div className="space-y-2">
                    {groupVars.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                        <div>
                          <span className="text-white text-sm">{v.label}</span>
                          {v.unit && <span className="text-slate-500 text-xs ml-2">({v.unit})</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white h-7 w-7 p-0"
                            onClick={() => setVariableForm({ id: v.id, label: v.label, unit: v.unit || '', group: v.group })}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                            onClick={() => setVariableToDelete(v)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!variableToDelete} onOpenChange={(open) => !open && setVariableToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{variableToDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This removes the field from every order's measurement form. Values already saved
              for past orders are kept in the database but will no longer be shown. This cannot
              be undone from here (you can re-add a field with the same name later).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVariable} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
