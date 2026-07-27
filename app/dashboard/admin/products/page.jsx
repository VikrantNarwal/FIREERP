'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, Settings2, Tags } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

// api.get/post/put/delete resolve with the parsed JSON body even on 4xx/5xx —
// they never throw on their own. This wrapper makes error responses throw so
// existing try/catch blocks below behave as expected.
function must(res) {
  if (res && res.error) throw new Error(res.error)
  return res
}

// ============================================================================
// Admin — Products, Variants & Production Stages
// One page, three panels: Products (add/rename/delete), Variants (add/rename/
// deactivate/delete), and a per-product Stage Editor (add/remove/reorder/rename
// the production pipeline for that specific product).
// ============================================================================

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)

  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const [variantDialogOpen, setVariantDialogOpen] = useState(false)

  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [stageProduct, setStageProduct] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, variantsRes] = await Promise.all([
        api.get('/admin/products'),
        api.get('/admin/variants')
      ])
      setProducts(productsRes.products || [])
      setVariants(variantsRes.variants || [])
    } catch (err) {
      toast.error('Could not load products/variants')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products & Production Setup</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage what Sales can sell, what variants exist, and each product's production pipeline.
          </p>
        </div>
      </div>

      {/* ---------------- PRODUCTS ---------------- */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-medium text-white">Products</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setVariantDialogOpen(true)}>
              <Tags className="w-4 h-4 mr-2" /> Manage Variants
            </Button>
            <Button size="sm" onClick={() => { setEditingProduct(null); setProductDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {loading && <div className="p-6 text-slate-400 text-sm">Loading…</div>}
          {!loading && products.length === 0 && (
            <div className="p-6 text-slate-400 text-sm">No products yet — add your first one.</div>
          )}
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between p-5 hover:bg-slate-800/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{p.name}</span>
                  <Badge variant="secondary">{p.variant}</Badge>
                  {p._count?.orders > 0 && (
                    <span className="text-xs text-slate-500">{p._count.orders} order(s)</span>
                  )}
                </div>
                {p.description && <p className="text-slate-400 text-sm mt-1">{p.description}</p>}
                <p className="text-slate-500 text-xs mt-1">
                  {p.stageTemplate?.items?.length || 0} production stage(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setStageProduct(p); setStageDialogOpen(true) }}>
                  <Settings2 className="w-4 h-4 mr-1" /> Stages
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(p); setProductDialogOpen(true) }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => deleteProduct(p, setProducts)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        variants={variants}
        onSaved={loadAll}
      />

      <VariantDialog
        open={variantDialogOpen}
        onOpenChange={setVariantDialogOpen}
        variants={variants}
        reload={loadAll}
      />

      {stageProduct && (
        <StageDialog
          open={stageDialogOpen}
          onOpenChange={(v) => { setStageDialogOpen(v); if (!v) setStageProduct(null) }}
          product={stageProduct}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}

async function deleteProduct(product, setProducts) {
  if (!window.confirm(`Delete "${product.name}"? This can't be undone if the product has no orders.`)) return
  try {
    must(await api.delete(`/admin/products/${product.id}`))
    toast.success('Product deleted')
    setProducts(prev => prev.filter(p => p.id !== product.id))
  } catch (err) {
    toast.error(err?.message || 'Could not delete — it may still have orders linked to it')
  }
}

// ============================================================================
// Add / Edit Product dialog
// ============================================================================
function ProductDialog({ open, onOpenChange, product, variants, onSaved }) {
  const isEdit = !!product
  const [form, setForm] = useState({ name: '', variant: '', description: '', basePrice: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        variant: product.variant || '',
        description: product.description || '',
        basePrice: product.basePrice ?? ''
      })
    } else {
      setForm({ name: '', variant: '', description: '', basePrice: '' })
    }
  }, [product, open])

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.variant) return toast.error('Variant is required')
    setSaving(true)
    try {
      if (isEdit) {
        must(await api.put(`/admin/products/${product.id}`, form))
        toast.success('Product updated')
      } else {
        must(await api.post('/admin/products', { ...form, type: 'ELECTRICAL_FIREPLACE' }))
        toast.success('Product created with the default 25-stage pipeline — customize it via "Stages"')
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Name</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electrical Fireplace — Premium" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Variant</label>
            <Select value={form.variant} onValueChange={v => setForm({ ...form, variant: v })}>
              <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
              <SelectContent>
                {variants.filter(v => v.isActive).map(v => (
                  <SelectItem key={v.code} value={v.code}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Description</label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Base Price</label>
            <Input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Variant catalog manager dialog
// ============================================================================
function VariantDialog({ open, onOpenChange, variants, reload }) {
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')

  const addVariant = async () => {
    if (!newCode.trim() || !newLabel.trim()) return toast.error('Code and label are required')
    try {
      must(await api.post('/admin/variants', { code: newCode, label: newLabel }))
      toast.success('Variant added')
      setNewCode(''); setNewLabel('')
      reload()
    } catch (err) {
      toast.error(err?.message || 'Could not add variant')
    }
  }

  const saveRename = async (id) => {
    try {
      must(await api.put(`/admin/variants/${id}`, { label: editLabel }))
      toast.success('Variant renamed')
      setEditingId(null)
      reload()
    } catch (err) {
      toast.error(err?.message || 'Rename failed')
    }
  }

  const toggleActive = async (v) => {
    try {
      must(await api.put(`/admin/variants/${v.id}`, { isActive: !v.isActive }))
      reload()
    } catch (err) {
      toast.error('Could not update')
    }
  }

  const removeVariant = async (v) => {
    if (!window.confirm(`Delete variant "${v.label}"?`)) return
    try {
      must(await api.delete(`/admin/variants/${v.id}`))
      toast.success('Variant deleted')
      reload()
    } catch (err) {
      toast.error(err?.message || 'In use — deactivate instead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
        <DialogHeader><DialogTitle className="text-white">Manage Variants</DialogTitle></DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {variants.map(v => (
            <div key={v.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">{v.code}</span>
                {editingId === v.id ? (
                  <Input className="h-7 w-40" value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                ) : (
                  <span className={v.isActive ? 'text-white' : 'text-slate-500 line-through'}>{v.label}</span>
                )}
              </div>
              <div className="flex gap-1">
                {editingId === v.id ? (
                  <Button size="sm" onClick={() => saveRename(v.id)}>Save</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingId(v.id); setEditLabel(v.label) }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => toggleActive(v)}>
                  {v.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-400" onClick={() => removeVariant(v)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <Input className="w-24" placeholder="CODE" value={newCode} onChange={e => setNewCode(e.target.value)} />
          <Input placeholder="Display label" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          <Button onClick={addVariant}><Plus className="w-4 h-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Per-product Stage Editor — add / delete / rename / reorder
// ============================================================================
function StageDialog({ open, onOpenChange, product, onSaved }) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get(`/admin/products/${product.id}/stages`)
      .then(res => { must(res); setStages((res.template?.items || []).map(i => ({ stageKey: i.stageKey, label: i.label }))) })
      .catch(() => toast.error('Could not load stages'))
      .finally(() => setLoading(false))
  }, [open, product.id])

  const move = (idx, dir) => {
    const next = [...stages]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setStages(next)
  }

  const rename = (idx, label) => {
    const next = [...stages]
    next[idx] = { ...next[idx], label }
    setStages(next)
  }

  const remove = (idx) => setStages(stages.filter((_, i) => i !== idx))

  const addStage = () => {
    if (!newLabel.trim()) return
    const stageKey = newLabel.trim().toUpperCase().replace(/\s+/g, '_')
    setStages([...stages, { stageKey, label: newLabel.trim() }])
    setNewLabel('')
  }

  const save = async () => {
    if (stages.length === 0) return toast.error('Add at least one stage')
    setSaving(true)
    try {
      must(await api.put(`/admin/products/${product.id}/stages`, { stages }))
      toast.success('Production stages updated — applies to new orders of this product')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Production Stages — {product.name}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500">
          This is the exact sequence used when a new order of this product is created.
          Existing orders already in production are not affected by changes here.
        </p>

        {loading ? (
          <div className="text-slate-400 text-sm py-4">Loading…</div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {stages.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-2 py-1.5">
                <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="text-xs text-slate-500 w-5 shrink-0">{idx + 1}</span>
                <Input
                  className="h-7 flex-1"
                  value={s.label}
                  onChange={e => rename(idx, e.target.value)}
                />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => move(idx, 1)} disabled={idx === stages.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => remove(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-800">
          <Input placeholder="New stage name, e.g. Mirror Polishing" value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()} />
          <Button variant="outline" onClick={addStage}><Plus className="w-4 h-4" /></Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Stages'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
