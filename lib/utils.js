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
