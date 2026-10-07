import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Shared helper: turns an order's `productionStages` array into a summary
// used by Admin/Sales/CEO order views to show "which stages are done" and
// "which stages are remaining" without each page re-deriving this itself.
// `stages` is expected to already be ordered by `sequence` (the API always
// returns it that way), but this sorts defensively in case it isn't.
export function getStageProgress(stages) {
  const list = Array.isArray(stages) ? [...stages].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)) : []
  const total = list.length
  const completed = list.filter((s) => s.status === 'COMPLETED')
  const remaining = list.filter((s) => s.status !== 'COMPLETED')
  const nextStage = remaining[0] || null
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0

  return {
    total,
    completedCount: completed.length,
    remainingCount: remaining.length,
    completed,
    remaining,
    nextStage,
    percent
  }
}

export function stageLabel(stage) {
  return (stage || '').replace(/_/g, ' ')
}

// ==================== DIMENSIONS / UNITS ====================
// `Order.dimensions` is a free-form JSON field: { width, height, depth, unit }.
// Sales picks the unit at order-creation time; every other dashboard (Design,
// Production, Admin, CEO) must read that same real unit back instead of
// hardcoding one — that mismatch was the root cause of the "SI units" bug.

export const DIMENSION_UNITS = [
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' }
]

// Orders created before the unit selector existed have no `dimensions.unit`.
// Those were entered against the old Sales form, which hardcoded its label as
// "(cm)" — so 'cm' is the correct assumption for old data, not a guess.
export function getDimensionUnit(dimensions) {
  return dimensions?.unit || 'cm'
}

// One shared formatter so every dashboard shows the exact unit that was
// actually selected, instead of each page independently guessing.
export function formatDimensions(dimensions) {
  if (!dimensions) return null
  const { width, height, depth } = dimensions
  if (width == null && height == null && depth == null) return null
  const unit = getDimensionUnit(dimensions)
  return `${width ?? 0}W × ${height ?? 0}H × ${depth ?? 0}D ${unit}`
}

// ==================== QUANTITY ====================
// Shared so "how many pieces" reads identically everywhere it's shown —
// Design, Production, QC, Admin, and CEO previously showed this nowhere at all.
export function formatQuantity(quantity) {
  const qty = Number(quantity) || 1
  return `${qty} ${qty === 1 ? 'pc' : 'pcs'}`
}

// ==================== DISPATCH / DELIVERY ====================
// Shared so Sales, Design and Production all read order placement date and
// dispatch date identically. Order placement date (orderDate) is always set
// at creation, including for orders created before this feature — only
// dispatchDate can be genuinely empty until Sales fills it in.
export function formatDate(date) {
  return date ? new Date(date).toLocaleDateString() : '—'
}

export const REMAKE_REASON_LABELS = {
  TRANSPORT_DAMAGE: 'Transport Damage',
  MANUFACTURING_DEFECT: 'Manufacturing Defect'
}

export function remakeReasonLabel(reason) {
  return REMAKE_REASON_LABELS[reason] || reason || '—'
}

// ==================== DISPATCHED ITEMS / IMPORTANT / POSTING DATE ====================
// One definition shared by every dashboard, so "dispatched", "important" and
// "days since posting" always mean the same thing on every page.

// Statuses meaning the order has left the factory.
export const DISPATCHED_STATUSES = ['DISPATCHED', 'DELIVERED', 'INSTALLATION_PENDING', 'INSTALLED', 'CLOSED']

// Open orders older than this many days (from posting date) become IMPORTANT.
export const IMPORTANT_AFTER_DAYS = 15

// Dispatched = status says so, or a dispatch date is on record.
// Cancelled orders never count as dispatched.
export function isDispatched(order) {
  if (!order || order.status === 'CANCELLED') return false
  return DISPATCHED_STATUSES.includes(order.status) || !!order.dispatchDate
}

// Whole days since the order was posted (orderDate is stamped automatically
// when the order is created).
export function daysSincePosted(order) {
  if (!order?.orderDate) return 0
  const ms = Date.now() - new Date(order.orderDate).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

// IMPORTANT = priority URGENT (admin/CEO flag or the 15-day auto-flag), or an
// open order that has crossed 15 days and the server has not flagged yet.
export function isImportant(order) {
  if (!order || isDispatched(order) || order.status === 'CANCELLED') return false
  if (order.priority === 'URGENT') return true
  return !order.autoImportantAt && daysSincePosted(order) >= IMPORTANT_AFTER_DAYS
}

export function priorityLabel(priority) {
  return priority === 'URGENT' ? 'IMPORTANT' : priority
}

// Date + time, for "when was it edited" lines.
export function formatDateTime(date) {
  return date
    ? new Date(date).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}

// Splits a list of orders into the two groups every page shows.
export function splitOrders(orders) {
  const list = Array.isArray(orders) ? orders : []
  return {
    active: list.filter((o) => !isDispatched(o) && o.status !== 'CANCELLED'),
    dispatched: list.filter(isDispatched),
    cancelled: list.filter((o) => o.status === 'CANCELLED')
  }
}
