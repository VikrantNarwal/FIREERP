# FIRE ERP — PROGRESS LOG
_(Paste this whole file into any new Claude conversation so it instantly knows the real status. Update it every session — never guess, only mark something done when verified against actual git/db/code output. HOW THIS FILE WORKS: Claude rewrites this content whenever something new is verified in chat — but YOU must save it into the project folder and `git commit` it yourself for it to actually persist. It does not update on its own.)_

**Repo:** https://github.com/VikrantNarwal/FIREERP
**Last verified:** 2026-07-27
**Last commit on main (as of last GitHub check):** `5b02d40` — NOTE: two commits after `d815503` were found on this branch that this log had not previously accounted for: `3834c2c` (postinstall fix, confirmed genuinely applied) and `0afdc5b` (fix for component PUT 500 error, mapping `notes`→`description`). Branch was confirmed pushed and up to date with `origin/main` as of this check.
**Working tree status (last check):** Local changes from this session (schema.prisma, route.js, page.jsx, new migration) are NOT yet committed or pushed to GitHub — code changes exist only on the user's local machine (`E:\WEB EFP\FIREERP-main`) and on the live Neon DB (migration applied). Vercel has NOT been redeployed with these changes.

---

## 🟡 NEW THIS SESSION — CODE WRITTEN & BUILD-VERIFIED, MIGRATION NOT YET APPLIED

**Inventory dashboard changes (per user request), 3 files modified + 1 new migration:**
1. `prisma/schema.prisma` — added `productId String?` + relation on `Component`, plus `components Component[]` on `Product`. Purpose: let inventory items link to a product for grouping.
2. `prisma/migrations/20260727000000_add_product_to_component/migration.sql` — new migration: adds nullable `productId` column, index, and FK (`ON DELETE SET NULL`) on `components`. Non-destructive, no data loss risk.
3. `app/api/[[...path]]/route.js` — `GET/POST/PUT /api/components*` now `include: { product: true }` so the frontend gets product data.
4. `app/dashboard/inventory/page.jsx`:
   - **New "Add Component" dialog** (previously did not exist at all — only Edit existed). Same visual style as Edit.
   - **Product dropdown** added to both Add and Edit dialogs, pulling from `/api/products`.
   - **Product column** added to the inventory table.
   - **Generate Purchase List** now groups low-stock items by product name in the downloaded `.txt` file.
   - **Hardening**: `loadCategories()` now guards with `Array.isArray(data)` before calling `setCategories` — this was the same failure mode as the original production crash; wasn't yet fixed as of last session.
   - Deliberately did NOT touch stock status (In Stock/Low Stock/Out of Stock) — user confirmed keep it exactly as-is (auto-computed, no manual override).

**Verified in a sandboxed environment:**
- `npm run build` → `✓ Compiled successfully` for all JS/JSX (both before and after these changes, confirming no syntax/logic errors introduced).
- Confirmed via `git stash`/`git stash pop` that the *unmodified* code fails identically at the Prisma-client-generation step — that failure is a sandbox network restriction (no route to `binaries.prisma.sh` or `neon.tech`, both return `403`), NOT a bug in this code.

**✅ CONFIRMED DONE ON USER'S MACHINE (2026-07-27, live Neon DB):**
- `cmd /c "npx prisma migrate deploy"` run from `E:\WEB EFP\FIREERP-main` — output confirmed: `4 migrations found in prisma/migrations`, `Applying migration 20260727000000_add_product_to_component`, `All migrations have been successfully applied.`
- Live Neon DB (`ep-holy-field-az66xe30.c-3.ap-southeast-1.aws.neon.tech` / `neondb`) now has: `components.productId` (nullable TEXT column), an index on it, and FK `components_productId_fkey → products(id) ON DELETE SET NULL`.
- Gotcha hit and resolved during this step: first `migrate deploy` attempt threw `Error: P3015 — Could not find the migration file at migration.sql` because the new migration folder was created via `mkdir` but `migration.sql` hadn't been copied into it yet. Once the file was copied in, the retry succeeded. **Lesson for future sessions: creating the migration folder is not enough — the `migration.sql` file itself must be inside it before running `migrate deploy`.**

**NOT yet confirmed done (still blocking full rollout):**
- `cmd /c "npx prisma generate"` — NOT yet re-run/confirmed after the schema.prisma replacement (still needs to be confirmed regenerated against the NEW schema with `productId`, not just the old one from the earlier `postinstall` session)
- `cmd /c "npm run build"` — NOT yet confirmed run locally with the new `route.js`/`page.jsx`/`schema.prisma` in place
- **Not yet confirmed that `route.js`, `page.jsx`, and `schema.prisma` were actually copied into `E:\WEB EFP\FIREERP-main`** — only the migration folder + file were explicitly confirmed. This needs verification before build/commit, since the migration alone doesn't do anything without matching application code.
- `git add`, commit, push — NOT done
- Vercel redeploy with build cache cleared — NOT done
- Live check on `/dashboard/inventory` (Add Component, Product dropdown, grouped Purchase List) — NOT done

---

## ✅ CONFIRMED DONE (verified against real git/db/code output)

- **Phase 0 — Inventory Category dropdown bug**: FIXED and confirmed pushed (commit `995aff7`, confirmed via `git log`).
- **`postinstall` script fix**: Confirmed genuinely added in commit `3834c2c`, confirmed genuinely MISSING at the prior commit `d815503` (verified via `git show d815503:package.json`) despite an earlier commit (`30f1e6d`) falsely claiming to add it. Confirmed present in current `package.json` and confirmed pushed to `origin/main`.
- **Component PUT 500 error fix**: Commit `0afdc5b` — root cause confirmed via `schema.prisma`: `Component` model has a `description` field, not `notes`; API now remaps `notes → description` on update. This fix existed on the branch but was undocumented in the log until this session.
- **Phase -1 — Security fix**: DONE. Commit `9255b4e` — clickjacking headers fixed (`SAMEORIGIN`), unused `mongodb` package removed.
- **Database migrations**: 3 pre-existing migrations confirmed on disk (initial schema, payments/alerts, customizable inventory options). A 4th migration (`add_product_to_component`) was added this session — NOT yet applied to the live DB (see above).
- **Inventory Options backend**: Fully wired — dynamic `inventory_options` table + complete CRUD API. **Confirmed this session: no frontend admin UI exists for managing categories/units** — only the backend API and one dynamic dropdown consumer (the Edit/Add Component dialogs) exist. Nobody can add/rename/deactivate categories except by hitting the API directly.
- **Vendor fields (`vendorName/vendorContact/vendorEmail`)**: Confirmed this session — actively used in the UI (table display + edit/add form inputs), not just sitting unused in the schema.
- **"Add Component" dialog**: Confirmed this session there was previously NO way to add a new inventory item through the UI at all — only Edit existed. Now added (see above).

## ❓ NEEDS VERIFICATION (don't assume — check before marking done)

- Does the live Neon DB actually have the new `productId` column yet? (Depends on `prisma migrate deploy` being run — see blocking items above.)
- Does the live Vercel deployment reflect ANY of this session's changes, or the previous session's `postinstall`/component-fix changes? Nothing has been pushed to GitHub yet this session.

## ⬜ NOT YET DONE (per BUILD_PLAN.md, no evidence found yet)

- **Phase 1** — Admin Orders page (confirmed: `app/dashboard/admin/` has only a base `page.jsx`, no `orders/` subfolder) + nav link; Production Stages section in Order Detail dialog (confirmed: no `productionStages` reference in `app/dashboard/ceo/orders/page.jsx`).
- **Phase 2** — Sales visibility (Feature #1).
- **Phase 4** — 3 bigger features, each needs a planning decision first:
  - Feature #3: Group/filter inventory by Product via BOM (partially addressed this session via direct `productId` on Component — simpler than full BOM-based grouping, by explicit user choice)
  - Feature #7: Admin-editable Product/Variant tables (replacing fixed enums) — not yet touched
  - Feature #8: Admin-configurable Production Stages per product (new `StageTemplate` table)
- **Stock status manual override**: considered this session, user explicitly said keep current auto-computed behavior as-is, no override added.

## 🗒️ SESSION NOTES
- User works across multiple Claude accounts/sessions — this file is the single source of truth to prevent repeated/lost work. Update after every verified change, don't take verbal claims as "done" without git/db/code evidence.
- Windows environment: PowerShell only (bash-style commands don't work); `npx` via raw PowerShell is blocked by execution policy — must use `cmd /c "npx ..."` instead.
- Method used to verify facts in this project: `git log`, `git status`, `git diff <old>..<new> -- <file>`, `npx prisma migrate status` (via `cmd /c`), and `Select-String -Path <file> -Pattern <x> -Context <n>,<n>` to inspect real file contents directly — never assume from commit messages or migration names alone.
- **New this session**: sandboxed Claude environments (e.g. Claude's code execution tool) cannot reach `binaries.prisma.sh` or Neon's Postgres host — confirmed via direct `curl` test, both return HTTP 403 from the sandbox's egress proxy. Any `prisma generate`/`migrate deploy`/`migrate status` step must be run on the user's own machine or in a CI/deploy environment with unrestricted network (e.g. Vercel's build step already runs `prisma generate` successfully via `postinstall`).
