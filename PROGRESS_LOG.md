# FIRE ERP — PROGRESS LOG
_(Paste this whole file into any new Claude conversation so it instantly knows the real status. Update it every session — never guess, only mark something done when verified against actual git/db/code output. HOW THIS FILE WORKS: Claude rewrites this content whenever something new is verified in chat — but YOU must save it into the project folder and `git commit` it yourself for it to actually persist. It does not update on its own.)_

**Repo:** https://github.com/VikrantNarwal/FIREERP
**Last verified:** 2026-07-27
**Last commit on main:** `57c0c41` — "Add customizable inventory options migration and route updates"
**Working tree status (last check):** clean except one harmless untracked file (`PROJECT_STATUS_*.md`, a local report — safe to delete or .gitignore)

---

## 🔴 TOP PRIORITY — ACTIVE BUG, CONFIRMED LIVE IN PRODUCTION

**Inventory Category dropdown is broken (Phase 0 bug), CONFIRMED still present as of `57c0c41`:**
- `app/dashboard/inventory/page.jsx` line 302-307 still hardcodes the OLD invalid values: `RAW_MATERIAL, ELECTRONICS, HARDWARE, PACKAGING, CONSUMABLE, TOOL` (+ `OTHER` elsewhere).
- Meanwhile the database was migrated (in `57c0c41`) to DROP the old `ComponentCategory` enum entirely and replace it with a free `TEXT` column backed by a new `inventory_options` table (correct 22 real categories seeded: `FRP_LOGS`, `PP_SHEETS`, etc., plus `UNIT` values like `PCS`, `KG`).
- Backend API is fully built and working: `GET/POST/PUT/DELETE /api/inventory-options?type=CATEGORY` — audit-logged, role-protected (`INVENTORY/CEO/ADMIN`).
- **Net effect right now:** because the column is now plain TEXT (not enforced by an enum anymore), submitting the old broken dropdown values will likely SAVE SILENTLY with bad data (e.g. `"RAW_MATERIAL"` stored as a category) instead of erroring. This is worse than before the migration in terms of silent data corruption risk.
- **Not yet checked:** whether the SECOND occurrence of this dropdown (Edit Component dialog) has the same issue — BUILD_PLAN.md notes it appears twice.
- **Fix in progress:** next step is rewriting the dropdown in `inventory/page.jsx` to fetch live from `GET /api/inventory-options?type=CATEGORY` instead of any hardcoded list. Full surrounding code (15 lines before/10 after each match) requested from user, pending their paste, before Claude writes the exact replacement.

---

## ✅ CONFIRMED DONE (verified against real git/db/code output)

- **Phase -1 — Security fix**: DONE. Commit `9255b4e` — clickjacking headers fixed (`SAMEORIGIN`), unused `mongodb` package removed.
- **Database migrations**: 3 migrations exist, Prisma confirms *"Database schema is up to date!"* — no drift between schema.prisma and live Neon Postgres DB.
- **Inventory Options backend (new feature, beyond BUILD_PLAN.md)**: Fully wired — dynamic `inventory_options` table + complete CRUD API (`/api/inventory-options`) for both CATEGORY and UNIT types. Admin-manageable in theory, IF a frontend admin UI exists for it (not yet checked — see below).
- **Component soft-delete (new feature, not in BUILD_PLAN.md)**: `DELETE /api/components/:id` added in `57c0c41` — proper soft delete (`deletedAt`), audit-logged.
- **Vendor fields added to schema**: `vendorName`, `vendorContact`, `vendorEmail` added directly as TEXT columns on `components` table in `57c0c41`. ⚠️ Note: BUILD_PLAN.md recommended connecting these to the existing `Supplier` table via `supplierId` instead of adding raw text fields — this may create two disconnected ways to reference a vendor (old `supplierId` relation + new plain text fields). Worth a decision on whether both are intentional.

## ❓ NEEDS VERIFICATION (don't assume — check before marking done)

- Is there a frontend admin UI page for managing `inventory_options` (add/rename/deactivate categories & units), or does only the backend API exist with nothing calling it yet?
- Does the Edit Component dialog (2nd occurrence of the category dropdown) have the same hardcoded bug as the Add dialog?
- Are the new `vendorName/vendorContact/vendorEmail` fields actually used anywhere in the Inventory form UI, or just sitting unused in the schema?

## ⬜ NOT YET DONE (per BUILD_PLAN.md, no evidence found yet)

- **Phase 1** — Admin Orders page (copy of CEO orders page) + nav link; Production Stages section added to Order Detail dialog.
- **Phase 2** — Sales visibility (Feature #1).
- **Phase 4** — 3 bigger features, each needs a planning decision first:
  - Feature #3: Group/filter inventory by Product via BOM (decision needed: BOM-based grouping vs. fully separate custom tables)
  - Feature #7: Admin-editable Product/Variant tables (replacing fixed enums) — related groundwork may already exist via the new `inventory_options` pattern, but Product/Variant themselves are a separate enum, not yet touched
  - Feature #8: Admin-configurable Production Stages per product (new `StageTemplate` table)

## 🗒️ SESSION NOTES
- User works across multiple Claude accounts/sessions — this file is the single source of truth to prevent repeated/lost work. Update after every verified change, don't take verbal claims as "done" without git/db/code evidence.
- Windows environment: PowerShell only (bash-style commands don't work); `npx` via raw PowerShell is blocked by execution policy — must use `cmd /c "npx ..."` instead.
- Method used to verify facts in this project: `git log`, `git status`, `git diff <old>..<new> -- <file>`, `npx prisma migrate status` (via `cmd /c`), and `Select-String -Path <file> -Pattern <x> -Context <n>,<n>` to inspect real file contents directly — never assume from commit messages or migration names alone.
