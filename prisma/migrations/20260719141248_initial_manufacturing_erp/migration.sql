-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CEO', 'SALES', 'DESIGN', 'PRODUCTION', 'INVENTORY', 'PROCUREMENT', 'QC', 'ELECTRONICS', 'DISPATCH', 'SERVICE', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FireplaceType" AS ENUM ('ELECTRICAL_FIREPLACE');

-- CreateEnum
CREATE TYPE "FireplaceVariant" AS ENUM ('EF', 'EFP', 'EFH', 'EFHP');

-- CreateEnum
CREATE TYPE "FlameColor" AS ENUM ('ORANGE', 'BLUE', 'MULTICOLOR', 'RGB');

-- CreateEnum
CREATE TYPE "ComponentCategory" AS ENUM ('FRP_LOGS', 'PP_SHEETS', 'BROWN_FILMS', 'LED_MODULES', 'STEPPER_MOTORS', 'COUPLERS', 'NYLON_RODS', 'MIRROR_SHEETS', 'SMPS', 'PCBS', 'ESP32', 'DFPLAYER_MODULES', 'PAM8403_AMPLIFIERS', 'SPEAKERS', 'BLOWERS', 'HEATERS', 'CONNECTORS', 'WIRES', 'SCREWS', 'NUTS', 'POWDER_COATING', 'WELDING_RODS', 'PACKING_MATERIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('QUOTATION', 'APPROVED', 'IN_PRODUCTION', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED', 'READY_TO_DISPATCH', 'DISPATCHED', 'DELIVERED', 'INSTALLATION_PENDING', 'INSTALLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProductionStageType" AS ENUM ('DESIGN_APPROVED', 'LASER_CUTTING', 'BENDING', 'WELDING', 'GRINDING_BUFFING', 'POWDER_COATING', 'INCOMING_QC', 'WOODEN_LOG_PREP', 'FLAME_SHEET_PREP', 'LIGHT_ASSEMBLY', 'STEPPER_MOTOR_ASSEMBLY', 'PCB_PREPARATION', 'SPEAKER_ASSEMBLY', 'HEATER_ASSEMBLY', 'MAIN_ASSEMBLY', 'FUNCTIONAL_TESTING', 'BURN_IN_TEST', 'FINAL_QC', 'PACKAGING', 'DISPATCH_READY', 'DISPATCHED', 'DELIVERED', 'INSTALLATION_PENDING', 'INSTALLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('INCOMING', 'IN_PROCESS', 'FINAL');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PENDING', 'PASS', 'FAIL', 'CONDITIONAL_PASS');

-- CreateEnum
CREATE TYPE "NCRStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SOLIDWORKS_DRAWING', 'AUTOCAD_FILE', 'BOM_FILE', 'PRODUCTION_DRAWING', 'QC_REPORT', 'TEST_REPORT', 'PACKING_LIST', 'INVOICE', 'DELIVERY_CHALLAN', 'WARRANTY_CARD', 'INSTALLATION_MANUAL', 'CUSTOMER_APPROVAL', 'DESIGN_APPROVAL', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gst" TEXT,
    "rating" DOUBLE PRECISION,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FireplaceType" NOT NULL,
    "variant" "FireplaceVariant" NOT NULL,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boms" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "ComponentCategory" NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "reorderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxStock" DOUBLE PRECISION,
    "location" TEXT,
    "supplierId" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "gst" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "lotNumber" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gst" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bomId" TEXT,
    "fireplaceType" "FireplaceType" NOT NULL,
    "variant" "FireplaceVariant" NOT NULL,
    "dimensions" JSONB,
    "flameColor" "FlameColor",
    "soundOption" BOOLEAN NOT NULL DEFAULT false,
    "rgbOption" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrderStatus" NOT NULL DEFAULT 'QUOTATION',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredDate" TIMESTAMP(3),
    "promisedDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "installationDate" TIMESTAMP(3),
    "salesPersonId" TEXT NOT NULL,
    "designApprovedBy" TEXT,
    "designApprovedAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "customerNotes" TEXT,
    "delayReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_stages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stage" "ProductionStageType" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" INTEGER NOT NULL,
    "operatorId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "checklists" JSONB,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "delayReason" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_inspections" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "stage" "ProductionStageType",
    "inspectorId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "result" "InspectionResult" NOT NULL DEFAULT 'PENDING',
    "defects" JSONB,
    "measurements" JSONB,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncrs" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "qcInspectionId" TEXT,
    "issue" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "NCRStatus" NOT NULL DEFAULT 'OPEN',
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ncrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "manufacturingHistory" JSONB NOT NULL,
    "componentLotNumbers" JSONB,
    "firmwareVersion" TEXT,
    "pcbRevision" TEXT,
    "testResults" JSONB,
    "manufacturedAt" TIMESTAMP(3) NOT NULL,
    "qcApprovedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT NOT NULL,
    "version" TEXT DEFAULT '1.0',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_type_variant_key" ON "products"("type", "variant");

-- CreateIndex
CREATE INDEX "boms_productId_idx" ON "boms"("productId");

-- CreateIndex
CREATE INDEX "bom_items_bomId_idx" ON "bom_items"("bomId");

-- CreateIndex
CREATE INDEX "bom_items_componentId_idx" ON "bom_items"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "components_code_key" ON "components"("code");

-- CreateIndex
CREATE INDEX "components_category_idx" ON "components"("category");

-- CreateIndex
CREATE INDEX "components_supplierId_idx" ON "components"("supplierId");

-- CreateIndex
CREATE INDEX "inventory_transactions_componentId_idx" ON "inventory_transactions"("componentId");

-- CreateIndex
CREATE INDEX "inventory_transactions_orderId_idx" ON "inventory_transactions"("orderId");

-- CreateIndex
CREATE INDEX "inventory_transactions_type_idx" ON "inventory_transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "suppliers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "orders_jobNumber_key" ON "orders"("jobNumber");

-- CreateIndex
CREATE INDEX "orders_jobNumber_idx" ON "orders"("jobNumber");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_priority_idx" ON "orders"("priority");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_salesPersonId_idx" ON "orders"("salesPersonId");

-- CreateIndex
CREATE INDEX "production_stages_orderId_idx" ON "production_stages"("orderId");

-- CreateIndex
CREATE INDEX "production_stages_status_idx" ON "production_stages"("status");

-- CreateIndex
CREATE INDEX "production_stages_stage_idx" ON "production_stages"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "production_stages_orderId_stage_key" ON "production_stages"("orderId", "stage");

-- CreateIndex
CREATE INDEX "qc_inspections_orderId_idx" ON "qc_inspections"("orderId");

-- CreateIndex
CREATE INDEX "qc_inspections_type_idx" ON "qc_inspections"("type");

-- CreateIndex
CREATE INDEX "qc_inspections_result_idx" ON "qc_inspections"("result");

-- CreateIndex
CREATE UNIQUE INDEX "ncrs_ncrNumber_key" ON "ncrs"("ncrNumber");

-- CreateIndex
CREATE INDEX "ncrs_orderId_idx" ON "ncrs"("orderId");

-- CreateIndex
CREATE INDEX "ncrs_status_idx" ON "ncrs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_serialNumber_key" ON "serial_numbers"("serialNumber");

-- CreateIndex
CREATE INDEX "serial_numbers_orderId_idx" ON "serial_numbers"("orderId");

-- CreateIndex
CREATE INDEX "documents_orderId_idx" ON "documents"("orderId");

-- CreateIndex
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "boms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "boms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_designApprovedBy_fkey" FOREIGN KEY ("designApprovedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stages" ADD CONSTRAINT "production_stages_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_inspections" ADD CONSTRAINT "qc_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_qcInspectionId_fkey" FOREIGN KEY ("qcInspectionId") REFERENCES "qc_inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ncrs" ADD CONSTRAINT "ncrs_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
