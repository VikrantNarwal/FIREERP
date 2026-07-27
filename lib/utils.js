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
