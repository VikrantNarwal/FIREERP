-- Performance fix: GET /api/orders is called by every dashboard on every load
-- (Sales, Design, Production — which also polls every 30s — QC, Admin, CEO) and
-- always does WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC. Neither column
-- was indexed, so every single one of those requests was a full table scan.
-- CreateIndex
CREATE INDEX "orders_deletedAt_createdAt_idx" ON "orders"("deletedAt", "createdAt");

-- Performance fix: generateJobNumber() (called on every order creation) counts
-- orders WHERE "orderDate" >= start-of-month. Also previously unindexed.
-- CreateIndex
CREATE INDEX "orders_orderDate_idx" ON "orders"("orderDate");
