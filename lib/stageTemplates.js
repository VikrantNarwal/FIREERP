// Shared helper: turns a Product's admin-defined StageTemplate into the actual
// ProductionStage rows for a new Order. Import this wherever orders are created
// instead of any hardcoded stage list.

import prisma from './prisma'

// Fallback used only when a brand-new product is created without an explicit
// `stages` list in the request body — keeps today's exact 25-stage behavior.
export const DEFAULT_STAGE_TEMPLATE = [
  { stageKey: 'DESIGN_APPROVED', label: 'Design Approved' },
  { stageKey: 'LASER_CUTTING', label: 'Laser Cutting' },
  { stageKey: 'BENDING', label: 'Bending' },
  { stageKey: 'WELDING', label: 'Welding' },
  { stageKey: 'GRINDING_BUFFING', label: 'Grinding Buffing' },
  { stageKey: 'POWDER_COATING', label: 'Powder Coating' },
  { stageKey: 'INCOMING_QC', label: 'Incoming QC' },
  { stageKey: 'WOODEN_LOG_PREP', label: 'Wooden Log Prep' },
  { stageKey: 'FLAME_SHEET_PREP', label: 'Flame Sheet Prep' },
  { stageKey: 'LIGHT_ASSEMBLY', label: 'Light Assembly' },
  { stageKey: 'STEPPER_MOTOR_ASSEMBLY', label: 'Stepper Motor Assembly' },
  { stageKey: 'PCB_PREPARATION', label: 'PCB Preparation' },
  { stageKey: 'SPEAKER_ASSEMBLY', label: 'Speaker Assembly' },
  { stageKey: 'HEATER_ASSEMBLY', label: 'Heater Assembly' },
  { stageKey: 'MAIN_ASSEMBLY', label: 'Main Assembly' },
  { stageKey: 'FUNCTIONAL_TESTING', label: 'Functional Testing' },
  { stageKey: 'BURN_IN_TEST', label: 'Burn In Test' },
  { stageKey: 'FINAL_QC', label: 'Final QC' },
  { stageKey: 'PACKAGING', label: 'Packaging' },
  { stageKey: 'DISPATCH_READY', label: 'Dispatch Ready' },
  ]

/**
 * Returns the ordered list of { stage, sequence } objects to create as
 * ProductionStage rows for a brand-new order of the given product.
 * Falls back to DEFAULT_STAGE_TEMPLATE if the product somehow has no
 * template yet (shouldn't happen after the Phase 4 migration, but this
 * keeps order creation from ever hard-failing).
 */
export async function getProductionStagesForProduct(productId) {
  const template = await prisma.stageTemplate.findUnique({
    where: { productId },
    include: { items: { orderBy: { sequence: 'asc' } } }
  })

  const items = template?.items?.length ? template.items : DEFAULT_STAGE_TEMPLATE.map((s, idx) => ({
    stageKey: s.stageKey,
    sequence: idx + 1
  }))

  return items.map((item, idx) => ({
    stage: item.stageKey,
    sequence: item.sequence ?? idx + 1,
    status: 'PENDING'
  }))
}
