# FIRE ERP — PROGRESS LOG
_(Paste this whole file into any new Claude conversation so it instantly knows the real status. Update it every session — never guess, only mark something done when verified against actual git/db/code output. HOW THIS FILE WORKS: Claude rewrites this content whenever something new is verified in chat — but YOU must save it into the project folder and `git commit` it yourself for it to actually persist. It does not update on its own.)_

**Repo:** https://github.com/VikrantNarwal/FIREERP
**Last verified:** 2026-07-27
**Last commit on main:** `57c0c41` — "Add customizable inventory options migration and route updates"
**Working tree status (last check):** clean except one harmless untracked file (`PROJECT_STATUS_*.md`, a local report — safe to delete or .gitignore)

---

---

## ✅ CONFIRMED DONE (verified against real git/db/code output)

- **Phase 0 — Inventory Category dropdown bug**: FIXED and BUILD-VERIFIED. `app/dashboard/inventory/page.jsx` now fetches categories live via `api.get('/inventory-options?type=CATEGORY')` on mount and renders them dynamically (`categories.map(...)`), instead of the old hardcoded invalid list (`RAW_MATERIAL`, etc.). Confirmed with `npm run build` → "Compiled successfully", `/dashboard/inventory` route built with no errors. Committed and pushed (see commit hash below — update after next push).
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
