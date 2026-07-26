-- AlterTable: link a component to a product so items can be grouped/filtered per product
ALTER TABLE "components" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE INDEX "components_productId_idx" ON "components"("productId");

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
