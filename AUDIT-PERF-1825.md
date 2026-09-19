# Keluarga-W — Deep Performance Audit / v1825

Scope: UI/render/persistence scheduling only. Business logic and visual/UI markup are unchanged.

## Implemented

1. Page navigation now renders only the active top-level feature tab for Keuangan and Shop.
2. Asset page keeps existing Aset.renderList() SoT for Ringkasan/Buku/Analisis, but Management and Investment presenters are lazy-rendered only when their tab is active.
3. Asset tab switching owns the lazy render so opening a tab after page entry never shows stale placeholder content. Repeated taps on the already-active Asset tab do not re-render the heavy section.
4. showPage() reuses one overlay NodeList instead of scanning the full DOM twice.
5. Re-tapping an already-active bottom navigation item is a no-op for rendering; programmatic showPage(name) behavior remains unchanged.
6. Cache-busting/service-worker cache version advanced to v1825 so the performance patch cannot be masked by the previous v1824 cache.

## Preserved

- Dashboard Hub lazy section rendering from v1824.
- Favorit double-render fix.
- Widget recursive render guard.
- Service checklist undefined-length hardening.
- Existing business calculations, data schema, event/action names, and visible UI markup.

## Remaining intentionally unchanged

- renderPajakZakat() still owns its existing full-page calculation pipeline because splitting it safely requires a larger presenter extraction and was not necessary for this low-risk pass.
- Aset.renderList() still owns its existing dashboard/report side renders for the core Asset sections; this is kept as the current source of truth to avoid changing business/render semantics.
- No CSS/layout changes.

## Final v1825 integrity corrections

- Version constants, HTML cache-busters, service-worker cache name, and bundle markers are synchronized at v1825.
- `modules/shared/modules-render.js` is 1590 lines; strict source-size gate passes without changing the 1600-line policy.
- Dashboard preference rendering now checks the active page via existing DOM nodes/class state; no `document.querySelector('.page.active')` dependency remains in that settings path.
- Asset tab previous-active detection reuses the existing `.cn-tab` NodeList, preserving behavior while remaining compatible with the repository test harness.

## Validation snapshot

- `verify-bundle-freshness`: PASS for both bundles.
- `verify-version-integrity`: PASS.
- strict source-size audit: PASS.
- Dashboard settings + tab switch regression: 35/35 PASS.
- Targeted business/performance regression set: 102/102 PASS.
- Four originally failing integrity test files (version/cache, S1783, S1786, Car Notes source-size) now pass: 9/9 tests.
- Full 7,093-test suite was not rerun to completion in this environment; therefore no claim of 7,093/7,093 is made.
