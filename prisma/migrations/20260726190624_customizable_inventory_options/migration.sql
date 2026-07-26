-- CreateEnum
CREATE TYPE "InventoryOptionType" AS ENUM ('CATEGORY', 'UNIT');

-- AlterTable: add new vendor columns
ALTER TABLE "components" ADD COLUMN "vendorName" TEXT,
ADD COLUMN "vendorContact" TEXT,
ADD COLUMN "vendorEmail" TEXT;

-- AlterTable: safely convert category from enum to text, preserving all existing data
ALTER TABLE "components" ALTER COLUMN "category" TYPE TEXT USING ("category"::TEXT);

-- DropEnum: now safe to remove, nothing references it anymore
DROP TYPE "ComponentCategory";

-- CreateTable
CREATE TABLE "inventory_options" (
    "id" TEXT NOT NULL,
    "type" "InventoryOptionType" NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_options_type_idx" ON "inventory_options"("type");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_options_type_value_key" ON "inventory_options"("type", "value");


-- Seed existing categories so the admin list isn't empty after migration
INSERT INTO "inventory_options" ("id", "type", "value", "label", "updatedAt") VALUES
  (gen_random_uuid()::text, 'CATEGORY', 'FRP_LOGS', 'FRP Logs', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'PP_SHEETS', 'PP Sheets', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'BROWN_FILMS', 'Brown Films', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'LED_MODULES', 'LED Modules', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'STEPPER_MOTORS', 'Stepper Motors', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'COUPLERS', 'Couplers', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'NYLON_RODS', 'Nylon Rods', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'MIRROR_SHEETS', 'Mirror Sheets', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'SMPS', 'SMPS', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'PCBS', 'PCBs', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'ESP32', 'ESP32', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'DFPLAYER_MODULES', 'DFPlayer Modules', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'PAM8403_AMPLIFIERS', 'PAM8403 Amplifiers', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'SPEAKERS', 'Speakers', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'BLOWERS', 'Blowers', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'HEATERS', 'Heaters', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'CONNECTORS', 'Connectors', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'WIRES', 'Wires', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'SCREWS', 'Screws', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'NUTS', 'Nuts', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'POWDER_COATING', 'Powder Coating', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'WELDING_RODS', 'Welding Rods', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'PACKING_MATERIAL', 'Packing Material', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CATEGORY', 'OTHER', 'Other', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'PCS', 'Pieces', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'KG', 'Kilograms', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'M', 'Meters', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'L', 'Liters', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'BOX', 'Box', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'ROLL', 'Roll', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'UNIT', 'SET', 'Set', CURRENT_TIMESTAMP);