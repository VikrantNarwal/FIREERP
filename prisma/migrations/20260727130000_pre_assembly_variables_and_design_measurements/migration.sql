-- AlterTable: structured, fully-dynamic storage for Design's pre-assembly measurements
-- (replaces the old "parse a free-text notes blob with regex" approach)
ALTER TABLE "orders" ADD COLUMN "designMeasurements" JSONB;

-- CreateTable: Design-managed measurement field definitions.
-- Design can add/rename/delete rows here at any time with zero deploys/migrations —
-- values live in orders."designMeasurements" keyed by "key" below.
CREATE TABLE "pre_assembly_variables" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,
    "group" TEXT NOT NULL DEFAULT 'General',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pre_assembly_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pre_assembly_variables_key_key" ON "pre_assembly_variables"("key");

-- CreateIndex
CREATE INDEX "pre_assembly_variables_group_idx" ON "pre_assembly_variables"("group");

-- CreateIndex
CREATE INDEX "pre_assembly_variables_isActive_idx" ON "pre_assembly_variables"("isActive");

-- Seed the same 5 fields the app already used (as free text in internalNotes),
-- so Design's existing workflow keeps working immediately after this migration —
-- Design can rename/delete/add to these freely from here on.
INSERT INTO "pre_assembly_variables" ("id", "key", "label", "unit", "group", "sortOrder", "updatedAt") VALUES
  (gen_random_uuid()::text, 'wooden_log_length', 'Wooden Log Length', 'mm', 'Wooden Log', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'wooden_log_width',  'Wooden Log Width',  'mm', 'Wooden Log', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'flame_sheet_length', 'Flame Sheet Length', 'mm', 'Flame Sheet', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'flame_sheet_width',  'Flame Sheet Width',  'mm', 'Flame Sheet', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'mirror_length', 'Mirror Length', 'mm', 'Mirror', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'mirror_width',  'Mirror Width',  'mm', 'Mirror', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'nylon_rod_length', 'Nylon Rod Length', 'mm', 'Nylon Rod', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'led_strip_length', 'LED Strip Length', 'mm', 'LED Strip', 0, CURRENT_TIMESTAMP);
