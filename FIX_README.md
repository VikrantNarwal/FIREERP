# Fix package — 2026-07-27 (Design approval / Payments / Notes visibility)

## Before you do anything else

Last package's `npx prisma migrate deploy` and the GitHub push were **not done**. That means
none of the previous fixes are live yet — your production site is still running old code.

This package includes both the old pending migration AND today's fixes. You only need to
deploy **once**, but you must do **all three steps below in order**. Skipping any one of them
means the others silently don't matter.

## What changed in this package (only 2 files touched)

1. **`app/api/[[...path]]/route.js`**
   - `PUT /production/stages/:id` — now wrapped in a transaction, and it now moves an order
     from `APPROVED` → `IN_PRODUCTION` automatically the moment any stage starts. This is why
     orders were getting stuck in "Design Approved" forever — nothing ever flipped that status.
   - `POST /payments` — now wrapped in a transaction (payment + order totals + audit log commit
     together or not at all), and the order's `advanceAmountPaid` is now the sum of every advance
     payment on the order instead of being overwritten by the latest one.
2. **`app/dashboard/production/page.jsx`**
   - Now displays the Sales-entered `notes` on both the order card and the stage-update dialog
     (Design's dashboard already showed this; Production's didn't).
   - Removed the now-redundant client-side status-advance logic, since the backend handles it
     atomically for every dashboard that touches a stage (Production, Admin, CEO).

No schema changes in this package — the columns these fixes rely on (`advanceAmountPaid`,
`balanceDue`, `notes`, `status`) already exist. The pending migration from last time
(`20260727130000_pre_assembly_variables_and_design_measurements`) is still included in
`prisma/migrations/` and still needs to be deployed — see Step 2.

## Deploy steps — run all three, in this order

### 1. Extract and overwrite
Extract this zip into your project folder (`E:\WEB EFP\FIREERP-main`), overwriting existing files.

### 2. Run the pending database migration
```
npx prisma migrate deploy
```
This is additive-only (new nullable column, new table from last time — nothing in today's fix
needs a new column). It does not touch or delete any existing data. Run it from your project
folder with your production `DATABASE_URL` in scope (however you normally point Prisma at Neon).

Confirm it prints something like `X migrations applied` with no errors before moving on.

### 3. Commit and push to GitHub
```
git add -A
git commit -m "Fix: design-approved orders stuck in place, payment save reliability, notes visibility for Production"
git push
```
Vercel builds from GitHub — until this push happens, Vercel keeps serving the old code no matter
what you've changed locally. Watch the Vercel dashboard until the new deployment shows **Ready**.

## How to verify each fix after deploy

- **Design approval → Production:** Approve a design, then in Production open that order and
  change any stage away from "Pending." Refresh the Design or Sales dashboard — the order's
  status badge should now read `IN_PRODUCTION`, not `APPROVED`.
- **Payments:** Record a payment as Sales. The toast should confirm success, and the order card
  should immediately show the updated "Advance Paid" / "Balance" figures without a page reload.
  Record a second advance payment on the same order — the Advance Paid figure should be the sum
  of both, not just the second one.
- **Notes:** Open any order with Sales notes attached, in both the Design and Production
  dashboards — the notes should appear in both.

## If something still doesn't work

Open the browser console (F12) on the page where it fails and check the Network tab for the
failing request — the response body will now always carry a real error message instead of a
silent false-success, since the API client (`lib/api.js`) already throws on any non-2xx response.
Send me that error message and I can go straight to the cause instead of guessing.
