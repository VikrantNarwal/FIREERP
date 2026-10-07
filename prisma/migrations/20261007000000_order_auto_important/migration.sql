-- Auto-IMPORTANT marker: set once when an open order passes 15 days since its
-- posting date and is automatically flagged. Additive only — no data touched.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "autoImportantAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_autoImportantAt_idx" ON "orders"("autoImportantAt");
