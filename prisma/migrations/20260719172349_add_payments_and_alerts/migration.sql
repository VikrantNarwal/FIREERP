-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('PRODUCTION_DELAY', 'QUALITY_ISSUE', 'INVENTORY_SHORTAGE', 'CUSTOMER_ESCALATION', 'EQUIPMENT_FAILURE', 'SAFETY_CONCERN', 'DESIGN_REVISION', 'DELIVERY_RISK', 'PAYMENT_PENDING', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'QUOTATION';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "advanceAmountPaid" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "advanceDatePaid" TIMESTAMP(3),
ADD COLUMN     "balanceDue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL,
    "paymentMode" TEXT,
    "transactionRef" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "critical_alerts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "raisedByUserId" TEXT NOT NULL,
    "raisedByRole" TEXT NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "critical_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "critical_alerts_orderId_idx" ON "critical_alerts"("orderId");

-- CreateIndex
CREATE INDEX "critical_alerts_status_idx" ON "critical_alerts"("status");

-- CreateIndex
CREATE INDEX "critical_alerts_severity_idx" ON "critical_alerts"("severity");

-- CreateIndex
CREATE INDEX "critical_alerts_category_idx" ON "critical_alerts"("category");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
