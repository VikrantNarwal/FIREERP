-- ============================================================================
-- PHASE 4: Admin-manageable Products, Variants, and Per-Product Production Stages
-- Pattern reused from your own proven migration 20260726190624 (enum -> TEXT),
-- which already converted ComponentCategory to free text with zero data loss.
-- Every step below is additive or a same-pattern column-type conversion.
-- ============================================================================

-- 1) Remove the constraint that caps you at exactly 4 products (one per type+variant).
--    This is the actual blocker on "Admin can add new products" today.
DROP INDEX IF EXISTS "products_type_variant_key";

-- 2) Convert Product.variant and Order.variant from the fixed FireplaceVariant enum
--    to free text. Existing values (EF/EFP/EFH/EFHP) are preserved exactly as-is.
ALTER TABLE "products" ALTER COLUMN "variant" TYPE TEXT USING ("variant"::TEXT);
ALTER TABLE "orders"   ALTER COLUMN "variant" TYPE TEXT USING ("variant"::TEXT);
DROP TYPE "FireplaceVariant";

-- 3) Convert ProductionStage.stage and QCInspection.stage from the fixed
--    ProductionStageType enum to free text, so per-product custom stages work.
--    Existing values preserved exactly as-is (same safe cast used in step 2).
ALTER TABLE "production_stages" ALTER COLUMN "stage" TYPE TEXT USING ("stage"::TEXT);
ALTER TABLE "qc_inspections"    ALTER COLUMN "stage" TYPE TEXT USING ("stage"::TEXT);
DROP TYPE "ProductionStageType";

-- 4) New table: admin-managed variant catalog (add / rename / retire variants).
CREATE TABLE "product_variant_options" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_variant_options_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_variant_options_code_key" ON "product_variant_options"("code");

-- Seed with your 4 existing variants so nothing in the UI goes blank after deploy.
INSERT INTO "product_variant_options" ("id","code","label","updatedAt") VALUES
 (gen_random_uuid()::text, 'EF',   'E.F.',     CURRENT_TIMESTAMP),
 (gen_random_uuid()::text, 'EFP',  'E.F.P.',   CURRENT_TIMESTAMP),
 (gen_random_uuid()::text, 'EFH',  'E.F.H.',   CURRENT_TIMESTAMP),
 (gen_random_uuid()::text, 'EFHP', 'E.F.H.P.', CURRENT_TIMESTAMP);

-- 5) New tables: per-product, admin-editable production stage templates.
CREATE TABLE "stage_templates" (
    "id"        TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stage_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stage_templates_productId_key" ON "stage_templates"("productId");
ALTER TABLE "stage_templates"
  ADD CONSTRAINT "stage_templates_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "stage_template_items" (
    "id"         TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stageKey"   TEXT NOT NULL,
    "label"      TEXT NOT NULL,
    "sequence"   INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stage_template_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stage_template_items_templateId_idx" ON "stage_template_items"("templateId");
ALTER TABLE "stage_template_items"
  ADD CONSTRAINT "stage_template_items_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "stage_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6) Auto-generate a template for every EXISTING product using your current fixed
--    25-stage sequence, so today's order-creation behavior is IDENTICAL right after
--    deploy. Admin can then customize per product from the new admin page whenever
--    they want — nothing changes automatically for orders already in the system.
DO $$
DECLARE
  prod RECORD;
  tmpl_id TEXT;
  stages TEXT[] := ARRAY[
    'DESIGN_APPROVED','LASER_CUTTING','BENDING','WELDING','GRINDING_BUFFING',
    'POWDER_COATING','INCOMING_QC','WOODEN_LOG_PREP','FLAME_SHEET_PREP','LIGHT_ASSEMBLY',
    'STEPPER_MOTOR_ASSEMBLY','PCB_PREPARATION','SPEAKER_ASSEMBLY','HEATER_ASSEMBLY','MAIN_ASSEMBLY',
    'FUNCTIONAL_TESTING','BURN_IN_TEST','FINAL_QC','PACKAGING','DISPATCH_READY',
    'DISPATCHED','DELIVERED','INSTALLATION_PENDING','INSTALLED','CLOSED'
  ];
  i INT;
BEGIN
  FOR prod IN SELECT id FROM "products" WHERE "deletedAt" IS NULL LOOP
    tmpl_id := gen_random_uuid()::text;
    INSERT INTO "stage_templates" ("id","productId","updatedAt")
    VALUES (tmpl_id, prod.id, CURRENT_TIMESTAMP);

    FOR i IN 1..array_length(stages,1) LOOP
      INSERT INTO "stage_template_items" ("id","templateId","stageKey","label","sequence","updatedAt")
      VALUES (
        gen_random_uuid()::text,
        tmpl_id,
        stages[i],
        initcap(replace(stages[i], '_', ' ')),
        i,
        CURRENT_TIMESTAMP
      );
    END LOOP;
  END LOOP;
END $$;
