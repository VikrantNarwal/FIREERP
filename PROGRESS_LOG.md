# FIRE ERP — Progress Log

---

## Phase 6 — Admin Urgent Flagging & Full Stage Visibility (Admin + Sales)
**Status: ✅ Pushed to GitHub** — 2026-07-27
**Commit:** `306d2de` — "Admin urgent flagging, stage progress view for admin and sales"
**Repo:** VikrantNarwal/FIREERP
**Live verification:** ⏳ Pending — Vercel deployment triggered by this push has not yet been
confirmed "Ready" or smoke-tested live. Do that next (checklist below).

### Why this phase happened
BUILD_PLAN.md (an earlier planning doc) described Admin urgent-flagging and an Admin Orders
page as already planned. Checked the actual repo before touching anything: `app/dashboard/admin/orders/page.jsx`
**did not exist** and Admin's nav had no "Orders" link — that earlier plan was never actually
implemented. Sales also had no way to see per-order production-stage detail, only the Phase 5
"Total Orders" status modal. This phase built both, using backend permissions that already
existed — no schema or API changes were needed.

### What shipped
- **New shared helper** `getStageProgress(stages)` + `stageLabel(stage)` added to `lib/utils.js`
  — takes an order's `productionStages` array and returns completed count, remaining count,
  the remaining stage list, and the next stage due. Used by every view below so the "what's
  left" logic lives in one place instead of being re-derived per page.
- **New page** `app/dashboard/admin/orders/page.jsx` (Admin nav now has an "Orders" tab, added
  in `app/dashboard/layout.jsx`):
  - Every order shows a mini progress bar (e.g. "12/20 stages complete · Next: Welding")
  - **Mark URGENT** button + confirmation dialog → sets `priority: 'URGENT'` via the existing
    `PUT /api/orders/:id` endpoint (already allowed `ADMIN` role, verified — no backend change)
  - **Unflag** button (new — the older CEO-only version of this feature could mark urgent but
    never remove the flag; added the reverse action since it's the same endpoint)
  - Urgent orders auto-sort to the top of the list, get a red left border + red badge
  - **View** opens full order detail: complete production stage list, a clearly labeled
    "Remaining (N): ..." summary, and a per-stage status dropdown (Admin already has backend
    permission to update stages via `PUT /api/production/stages/:id`, same as CEO)
  - Priority filter dropdown + a clickable "Urgent" stat card that toggles the filter
  - New "Overdue" badge/stat: flags orders where `promisedDate` has passed and status isn't
    `DELIVERED`/`CANCELLED`/`CLOSED`
  - Delete order (soft-delete) carried over from the same pattern as CEO's Orders page
- **Sales dashboard** (`app/dashboard/sales/page.jsx`):
  - Each order in "Recent Orders" now has a **View Status** button + the same stage progress bar
  - Opens a **read-only** detail dialog: order status, priority, promised date (with overdue
    flag), full stage list, and a "Remaining (N): ..." summary — deliberately no edit controls,
    since Sales was asked to *see* status, not change it (backend also does not grant Sales
    the production-stage-update permission, so this matches actual access)
  - The existing "Total Orders" modal (shipped in Phase 5) now also shows stage progress and
    urgent/overdue badges per order, not just the status badge
- **Admin dashboard** (`app/dashboard/admin/page.jsx`): its own "Total Orders" modal got the
  same stage-progress + urgent/overdue upgrade, for a quick glance without leaving the main
  dashboard.

### Safety measures taken
- No database schema changes — this phase only touches frontend files (`.jsx`) and one shared
  helper file (`lib/utils.js`); every action used already-existing, already-permissioned API
  endpoints.
- All 5 changed/new files were syntax-checked with `esbuild` before handing off, to catch JSX
  errors before they reached `npm run build`.
- Confirmed via `route.js` that `PUT /api/production/stages/:id` does **not** allow the `SALES`
  role before deciding to make Sales' stage view read-only — this was a deliberate choice to
  match existing backend access, not an oversight.

### Follow-ups — do these next
- [ ] Confirm the Vercel deployment from commit `306d2de` shows **Ready**, not
      building/failed
- [ ] Live smoke test: log in as Admin → `/dashboard/admin/orders` → confirm the "Orders" tab
      appears in the nav and the page loads
- [ ] Live smoke test: as Admin, open an order with production stages → confirm progress bar,
      "Remaining" list, and that changing a stage's dropdown shows "Stage updated" and persists
      after refresh
- [ ] Live smoke test: as Admin, click **Mark URGENT** → confirm red badge + order jumps to top
      of list → click **Unflag** → confirm it returns to NORMAL
- [ ] Live smoke test: log in as Sales → click **View Status** on any order → confirm stage
      list and "Remaining" summary appear, and confirm there is no way to edit a stage from
      this view
- [ ] Live smoke test: both Admin and Sales "Total Orders" modals show stage progress correctly

---

## Phase 4 — Admin-Managed Products, Variants & Production Stages
**Status: ✅ Deployed** — 2026-07-27
**Commit:** `ba1cb18` — "Phase 4: admin-managed products, variants, and production stages"
**Repo:** VikrantNarwal/FIREERP

### What shipped
- Removed the hard cap of 4 products (dropped `@@unique([type, variant])` on `Product`)
- `Product.variant`, `Order.variant`, `ProductionStage.stage`, `QCInspection.stage` converted
  from fixed enums to free text — admin-editable going forward, no code deploy needed for new values
- New tables: `product_variant_options`, `stage_templates`, `stage_template_items`
- New admin page: `/dashboard/admin/products` — add/rename/delete products, manage the variant
  catalog (add/rename/deactivate/delete), and edit each product's production stage list
  (add/remove/reorder/rename)
- New API routes:
  - `GET/POST /api/admin/products`
  - `PUT/DELETE /api/admin/products/[id]`
  - `GET/PUT /api/admin/products/[id]/stages`
  - `GET/POST /api/admin/variants`
  - `PUT/DELETE /api/admin/variants/[id]`
  - `GET /api/product-variants` (public read, any logged-in role — feeds Sales' New Order form)
- Order creation (`app/api/[[...path]]/route.js`, `POST /orders`) now pulls its production stage
  list from the product's `StageTemplate` via `lib/stageTemplates.js` →
  `getProductionStagesForProduct()`, instead of a hardcoded array
- New Order form (`app/dashboard/sales/page.jsx`) Variant dropdown now fetches live from
  `/api/product-variants` instead of a hardcoded EF/EFP/EFH/EFHP list; Product dropdown was
  already dynamic (`api.getProducts()`), no change needed there
- Admin nav (`app/dashboard/layout.jsx`) updated with a "Products" link → `/dashboard/admin/products`

### Real-world behavior preserved
- Discovered during implementation that live order creation only ever created **20** production
  stages (`DESIGN_APPROVED` → `DISPATCH_READY`), not the full 25 in the old enum —
  `DISPATCHED`/`DELIVERED`/`INSTALLATION_PENDING`/`INSTALLED`/`CLOSED` are tracked via
  `Order.status`, not as stage rows. Migration's auto-seed initially over-seeded all 25 per
  product; corrected via a follow-up `DELETE FROM stage_template_items WHERE "stageKey" IN
  (...)` cleanup, and `DEFAULT_STAGE_TEMPLATE` in `lib/stageTemplates.js` trimmed to match.
  Verified after fix: 20 distinct stage keys × 4 products, no strays.

### Safety measures taken
- Neon branch `backupbeforephase4` (ID `br-sparkling-frog-azkftvc7`) created from `production`
  before any schema change — untouched, kept as a rollback point
- Migration auto-generated a matching `StageTemplate` for every pre-existing product using the
  exact stage sequence already in production, so existing orders' behavior was unaffected
- `npx prisma migrate deploy` used (not `migrate dev`) to apply a hand-written, reviewed
  migration file rather than letting Prisma auto-generate one against a live database
- Local `npm run build` verified clean (all 19 routes compiled, including 6 new admin API
  routes and the new admin page) before pushing to GitHub

### Bugs caught and fixed during implementation
1. Stray `stageTemplate StageTemplate?` field mistakenly duplicated onto the `Supplier` model in
   `schema.prisma` (should only be on `Product`) — caused `prisma generate` to fail with a
   missing-opposite-relation error; removed.
2. `DEFAULT_STAGE_TEMPLATE` in `lib/stageTemplates.js` initially included 5 stages
   (`DISPATCHED`, `DELIVERED`, `INSTALLATION_PENDING`, `INSTALLED`, `CLOSED`) not used by the
   real order-creation code — trimmed to match actual behavior (see above).
3. Missing `</Select>` closing tag in `app/dashboard/sales/page.jsx` after replacing the
   hardcoded variant `<SelectItem>` list — caused a JSX syntax error on build; fixed.

### Follow-ups — do these next
- [ ] Confirm Vercel deployment from commit `ba1cb18` shows **Ready**, not building/failed
- [ ] Live smoke test: log in as Admin → `/dashboard/admin/products` → create a test product →
      confirm it gets the default 20-stage pipeline
- [ ] Live smoke test: log in as Sales → New Order → confirm the test product and a new/edited
      variant appear without redeploying
- [ ] Live smoke test: open an order created *before* this deploy → confirm its production
      stages display unchanged
- [ ] Decide whether to keep or delete the `backupbeforephase4` Neon branch once confident
      (safe to keep indefinitely; costs little/nothing on most Neon plans)

---

## Phase 4b — Dark Theme Contrast Fix (Admin Products Page)
**Status: ✅ Deployed** — 2026-07-27
**Commit:** `1536b7d` *(commit message on this push is stale/incorrect — see note below)*

### What shipped
- Fixed 16 places in `app/dashboard/admin/products/page.jsx` where `<Input>`, `<Textarea>`,
  `<SelectTrigger>`, and ghost icon buttons (pencil, stage settings, up/down arrows) were
  missing the `bg-slate-800 border-slate-700 text-white` / `text-slate-300 hover:text-white`
  classes used consistently everywhere else in the app — resulted in dark text on a dark
  background, effectively invisible. Full-file replacement applied.

---

## Phase 5 — Order Status Click-Through & Downloadable Report
**Status: ✅ Deployed** — 2026-07-27
**Commit:** `1536b7d` — labeled "Fix dark theme contrast on admin products page" in git history,
but the actual diff in this commit is this Phase 5 work (3 files: `app/dashboard/admin/page.jsx`,
`app/dashboard/sales/page.jsx`, `app/api/admin/reports/export/route.js`). No functional issue —
just a mismatched commit message worth knowing if you're ever bisecting git history later.

### What shipped
- **Admin dashboard** (`app/dashboard/admin/page.jsx`):
  - "Total Orders" stat card is now clickable → opens a modal listing every order with its
    current status (job number, customer, product, status badge)
  - New "Download Report" button in the header → downloads a plain-text file covering every
    order: customer details, product/variant, status, key dates, pricing, and full payment
    history per order
- **Sales dashboard** (`app/dashboard/sales/page.jsx`):
  - Same clickable "Total Orders" card + full order-status modal added, giving Sales a way to
    see every order's status beyond the existing "10 most recent" list
- **New API route:** `GET /api/admin/reports/export` (Admin/CEO only) — generates the text
  report server-side and returns it as a downloadable attachment. Lives as its own dedicated
  route file outside the app's single catch-all router (`app/api/[[...path]]/route.js`) — Next.js
  matches the specific path first, so no change to that file was needed.
- Frontend download wiring uses a manual `fetch()` with the `Authorization: Bearer` header
  (not a plain `<a href>` link), since this app's auth token lives in `localStorage`, not cookies

### Known limitation — flagged, not silently worked around
- The schema has **no dedicated "dispatched at" timestamp** on `Order`. The report labels
  `Order.deliveryDate` as "Dispatch/Delivery Date" since it's the closest existing field — this
  is an approximation, not a true capture of the moment status flips to `DISPATCHED`. If a real
  dispatch timestamp is wanted, that needs a small schema addition (new field + a code hook that
  sets it when status changes) — not yet built, pending a decision.

### Follow-ups
- [ ] Live smoke test: click "Total Orders" on both Admin and Sales dashboards, confirm the
      modal lists all orders (not just 10) with correct statuses
- [ ] Live smoke test: click "Download Report" as Admin, confirm the `.txt` file downloads and
      contains correct customer/payment/dispatch data for a few known orders
- [ ] Decide whether to add a true `dispatchedAt` timestamp field (see limitation above)
- [ ] Optional: commit message on `1536b7d` could be amended for clarity, though not required

---

## Phases 1–3 — Admin/CEO/Sales Order Visibility & Flagging
**Status:** Delivered as exact copy-paste code in `BUILD_PLAN.md` (not re-verified in this log —
confirm against that file and your own deployment history if you need exact dates/commits).

- Admin: flag orders, view order status
- CEO: update production status
- Sales: view order status
- Customizable inventory categories/units (`InventoryOption` table + `/api/inventory-options`)
  — migration `20260726190624_customizable_inventory_options`
- Component→Product linkage — migration `20260727000000_add_product_to_component`

*(If these were verified live and deployed, update this section with the actual commit hash and
verification date — this log currently only reflects what earlier planning documents describe,
not a fresh confirmation.)*

---

## Outstanding / Not Yet Built
Anything not listed above as shipped is not yet built. Add new phases to the top of this file as
they're planned and completed, following the same format: **What shipped / Safety measures /
Bugs caught / Follow-ups**.
