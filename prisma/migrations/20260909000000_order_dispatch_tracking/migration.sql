-- Dispatch & delivery tracking: dispatch date (set by Sales, read-only for
-- Design/Production), plus post-dispatch outcome fields (customer review,
-- safe-delivery flag, remake flag/reason) — all set by Sales.

-- CreateEnum
CREATE TYPE "RemakeReason" AS ENUM ('TRANSPORT_DAMAGE', 'MANUFACTURING_DEFECT');

-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "dispatchDate" TIMESTAMP(3),
  ADD COLUMN "deliveredSafely" BOOLEAN,
  ADD COLUMN "customerReviewRating" INTEGER,
  ADD COLUMN "customerReviewNotes" TEXT,
  ADD COLUMN "needsRemake" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remakeReason" "RemakeReason",
  ADD COLUMN "remakeNotes" TEXT;

-- CreateIndex
CREATE INDEX "orders_dispatchDate_idx" ON "orders"("dispatchDate");
CREATE INDEX "orders_needsRemake_idx" ON "orders"("needsRemake");
