
> **Catatan akumulasi 2649 (2026-10-23):** dokumen ini adalah snapshot historis v2648. Gunakan `AUDIT-RANTAI-AKUMULASI-S2649-2649.md` sebagai status validasi terbaru. Full-suite dan browser belum terverifikasi dalam run terbaru; jangan mengartikan tes terarah sebagai release certification.

# S2649 Continued Hotfix — Status

Baseline: `app-main (35).zip`
Cumulative input patch: `patch-Shop-CarNotes-Renov-S2649-akumulatif.zip`
Build version: `2648`

## Changes in this continuation

1. `modules/shared/pwa-ux-performance.js`
   - Renovasi summary rendering is idempotent: it keys rendered state by remaining amount and unpaid-item count, avoiding self-triggering subtree-observer loops caused by repeatedly replacing summary children.
   - Product price fold filters out the modal shell and nested modal containers before moving fields, preventing the fold decorator from wrapping the modal itself.
   - Purchase Order remove-button touch sizing uses the existing presentation class in CSS, not a `data-action` selector in the stylesheet.
2. `modules/home/renovasi.js`
   - After saving a project from an open transaction modal, the Renovasi project select is refreshed immediately and the newly saved/edited project is selected. This does not depend on clicking a close button.
   - DOM test doubles without a `classList.contains` implementation remain safe.
3. `modern-ui-layer.css`
   - Replaced the `data-action` selector for PO cart small buttons with `#pobCartList .btn-sm` to preserve the presentation-only CSS contract.
4. Build outputs and cache versions regenerated from source; `index.html`, `app_production.html`, and `sw.js` are aligned at version 2648.

## Verification

- `npm run build`: PASS; required minification and bundle syntax checks passed.
- `npm run verify-bundle`: PASS; both bundles fresh against source.
- Targeted regression suite: **56/56 PASS**, covering Renovasi modal CRUD, transaction-to-Renovasi linkage, numeric project IDs, responsive CSS contract, S2103 design-system contract, linked transaction event dispatch, and Renovasi delete cascade.
- Full suite: **NOT VERIFIED**. `npm run test:full` exceeded the execution window in this environment. A previous attempt surfaced the CSS `data-action` contract failure; that specific failure was corrected and its test now passes. The complete suite must be rerun in an environment with sufficient time.
- Real browser / Playwright: **NOT RUN**. Playwright/Puppeteer are not installed in this workspace, so no claim is made that viewport/browser acceptance is complete.

## Release status

**Not release-certified.** The known source/build fixes are in this cumulative patch, but the remaining acceptance gate is a complete full-suite run and real-browser tests at 390x844 and 360x640, including Order cart add, Add Product modal, Renovasi project save, and transaction linkage persistence.
