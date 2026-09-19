Keluarga-W — accumulated performance/hardening patch v1825

Scope
- Accumulates and preserves the supplied v1824 Dashboard/Service performance fixes.
- Deep audit focused on page navigation, active feature/tab rendering, duplicate render paths, hidden presenter work, DOM scans, and cache-busting.
- No business-rule rewrite, no data-schema migration, and no CSS/layout/UI redesign.

Inherited v1824 fixes preserved
- Dashboard Hub section-aware/lazy rendering.
- FEATURE_REGISTRY lazy feature grid.
- Favorit double-render fix.
- Widget recursive render guard.
- Dashboard preference active-page guards.
- Dashboard month aggregation/cache hardening.
- Service checklist undefined-length hardening and malformed suggestion-array guard.
- Production bundle freshness/cache-busting baseline.

New v1825 audit fixes
1. Keuangan navigation is top-tab scoped.
   - Entering Keuangan no longer renders the full Kelola/transaction pipeline when the user is actually on Tagihan, Budget, Utang/Piutang, Akun, Aset/Proyek, or Laporan.
   - The existing tab switcher remains the render owner when the user opens a tab.
2. Shop navigation is active-tab scoped.
   - Entering Shop no longer renders Kasir + Etalase + Riwayat + Produk + recent widgets together.
   - Only the active Shop tab is rendered on page entry.
3. Asset Management/Investment presenters are lazy.
   - Property/Rental/Portfolio/Maintenance presenters render only for the Manajemen tab.
   - InvestmentListUI renders only for the Investasi tab.
   - Ringkasan/Buku/Analisis keep the existing Aset renderer as their source of truth.
4. Asset tab switching is lazy and freshness-safe.
   - Opening a new Asset tab renders its active domain once.
   - Re-tapping the already-active Asset tab does not trigger another heavy render.
5. showPage() no longer scans the same open-overlay selector twice during one navigation.
6. Re-tapping an already-active bottom navigation item is a no-op for the full page renderer. Programmatic showPage(name) behavior is preserved.
7. Cache-busting/service-worker cache is advanced to v1825 so stale v1824 assets cannot mask the patch.

Intentional non-changes
- No business calculations/formulas were changed.
- No HTML structure, CSS, theme, spacing, or visual component treatment was changed.
- renderPajakZakat() remains its existing full pipeline; splitting it safely requires a separate presenter extraction and is intentionally outside this low-risk pass.
- Aset.renderList() remains the existing SoT for its core Ringkasan/Buku/Analisis pipeline; only Manajemen/Investasi side presenters were made lazy.

Validation
- Targeted accumulated dashboard/service/performance tests: 16/16 PASS.
- app-bundle-a.min.js: node --check PASS.
- app-bundle-b.min.js: node --check PASS.
- modules/shared/modules-render.js: node --check PASS.
- modules/shared/modal-navigasi.js: node --check PASS.
- modules/asset/aset-misc.js: node --check PASS.
- Version/cache/source-size gates: PASS (9/9 targeted integrity tests + verify-bundle + strict source-size).
- Dashboard settings + tab-switch regression: PASS (35/35).
- Business/performance regression set: PASS (102/102 targeted tests).
- Full project suite: the supplied baseline reported 7 failures from 3 causes; all 3 causes are addressed in this accumulated patch. A complete 7,093-test rerun was not completed in this execution environment, so full-suite green is not claimed here.
- esbuild/minification is not performed in this environment; rebuilt production bundles are valid JavaScript and bundle-freshness PASS, but they are not minified.

Deployment
Upload all files in this patch, especially:
- index.html
- app_production.html
- sw.js
- app-bundle-a.min.js
- app-bundle-b.min.js
- changed source modules under modules/
- tests/ (regression gates)

Do not deploy only source JS while retaining the old production bundles.

Final v1825 corrections included
- All five version-bearing source files are synchronized to s1793-final-hardening-1825.
- modules/shared/modules-render.js is reduced to 1590 lines, below the 1600-line guard, without changing business rules.
- DashboardSettings uses an active-page helper based on existing DOM elements/class state instead of requiring document.querySelector(), keeping the runtime guard and the repository's lightweight test harness compatible.
- setAsetTab() no longer requires document.querySelector() to identify the previous active tab; it reuses the existing tab NodeList.
- Regression tests were updated to model the intended active-page contract, including an explicit inactive-page no-render case.
