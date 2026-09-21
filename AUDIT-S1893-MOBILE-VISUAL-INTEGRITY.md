# AUDIT S1893 — Mobile Visual Integrity & Responsive Hardening

## Scope

S1893 follows the real Android screenshots supplied by the user. The audit targets the new baseline `app-main (38).zip` and the S1892 cumulative repair. The scope is visual/runtime integrity rather than a cosmetic theme pass:

- Shop
- Uang Mobil / Car Notes
- Pajak & Zakat
- modal/drawer/quick-settings geometry
- bottom navigation/FAB interaction with the keyboard
- portrait widths 360/390/430 class devices
- mobile landscape
- long tabs, vehicle chips, grids and domain workspace containment
- PWA/Android WebView-safe behavior

## Findings

1. The screenshots showed a dimmed page with content apparently displaced horizontally. The implementation therefore needs to defend both the page shell and overlay geometry; simply adding `overflow-x:hidden` is not considered a sufficient repair.
2. Modal sheets can retain inline `transform`/`transition` state after a swipe/close lifecycle. S1893 resets sheet geometry when `openModal()` / `openQS()` opens an overlay.
3. Mobile and landscape viewport state was not explicitly represented for runtime UX. S1893 adds a lightweight viewport-state helper using `visualViewport` when available.
4. Long tab/chip containers and domain children need explicit `min-width:0`/`max-width:100%` containment so flex/grid descendants cannot force the page shell wider than the viewport.
5. Keyboard-open state should not leave fixed quick-action FABs above the keyboard. S1893 hides those fixed actions while the visual viewport is substantially reduced.

## Implementation

- `styles.css`: mobile shell containment, domain containment, landscape composition, keyboard/FAB behavior.
- `pwa-ui-layer.css`: existing PWA layer remains within the 15 KB budget.
- `modules/shared/pwa-ux-performance.js`: viewport state (`--pwa-vw`, `--pwa-vh`, `pwa-landscape`, `pwa-keyboard-open`) and overlay geometry reset helper.
- `modules/shared/modal-navigasi.js` and `modules/asset/modal-navigasi.js`: reset modal/quick-settings geometry before opening.
- `tests/s1893-mobile-visual-integrity.test.js`: regression contracts for viewport meta, domain containment, landscape state, keyboard state, overlay reset, and fixed-width shell prevention.
- brittle runtime-version assertions were made build-version tolerant so future synchronized builds do not create false failures.

## Validation

- S1893 focused visual/UI suite: **42/42 PASS** when combined with the S1891/S1892 UI and Car Notes integrity contracts.
- Performance budget: **PASS**.
- SOT: **PASS**, runtime version `s1877-selftest-persistence-fix-1886`, HTML/SW `1886`.
- Architecture: **PASS**.
- Persistence: **PASS**.
- PWA recovery: **PASS**.
- Feature regression: **PASS**.
- Release firewall: **10/10 PASS**.
- Bundle freshness: **PASS**.
- Window expose: **83/83 PASS**.
- Car Notes integrity/performance: **PASS**.
- App-wide hardening: **9/9 PASS**.
- Scalability proxy: **PASS**.
- `npm test` reached test **4027** before the 300-second execution limit; no aggregate result was produced, so full-suite PASS is **not claimed**.
- Browser visual smoke remains environment-blocked (`ERR_BLOCKED_BY_ADMINISTRATOR`); no browser visual PASS is claimed.
- esbuild is unavailable in the environment; generated bundles are syntactically valid but not minified by esbuild.

## Release principle

No business logic, IndexedDB schema, routing contract, or existing `data-action` API was intentionally changed by S1893. The repair is presentation/runtime-hardening only and is cumulative with S1880–S1892.
