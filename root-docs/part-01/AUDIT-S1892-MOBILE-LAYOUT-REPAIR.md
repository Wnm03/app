# S1892 — Mobile Layout Integrity Repair

## Finding

The baseline Shop, Uang Mobil/Car Notes, and Pajak & Zakat pages had a structural DOM nesting defect: the domain workspace was trapped inside the legacy `.page-settings-btn` flex wrapper, and Shop/Car domain wrappers did not consistently own their complete workspace content. On narrow screens this caused the page title/settings flex layout to compete with the full workspace, producing severe horizontal clipping/overflow visible in the supplied Android screenshots.

## Evidence

- `#page-shop`, `#page-carnotes`, and `#page-pajak` each used `.page-settings-btn` as the parent of the domain workspace in the baseline.
- The baseline `.page-settings-btn` is a flex container (`display:flex; justify-content:space-between`), so placing the full domain workspace inside it creates a horizontal layout instead of a vertical page flow.
- Shop/Car `pwa-domain-page` wrappers originally closed around only the quick-settings button rather than the complete domain workspace.
- Pajak's `pwa-domain-page` wrapper was opened and immediately closed while the actual workspace remained inside the title wrapper.

## Repair

1. Close `.page-settings-btn` immediately after the page title for Shop, Car Notes, and Pajak.
2. Make `.pwa-domain-page` a sibling workspace container.
3. Make the Shop and Car domain wrapper own their complete page workspace.
4. Make Pajak's domain wrapper own its complete page workspace.
5. Add width containment (`min-width:0`, `max-width:100%`, `box-sizing:border-box`) for page/domain workspace boundaries.
6. Add explicit mobile focus, forced-colors, and safe-area-top contracts.
7. Add regression tests that inspect the actual HTML structure in both runtime shells.
8. Synchronize build/runtime version to 1885 and refresh generated bundles/SW/docs.

## Validation

- Targeted UI/layout regression: 35/35 PASS before build; post-build stale-version contracts were updated and rerun.
- Release UI gate: PASS after repair.
- Performance budget: PASS; `pwa-ui-layer.css` 14,515 / 15,000 bytes.
- SOT / architecture / persistence / PWA recovery / feature regression: PASS.
- Release firewall: 10/10 PASS.
- Bundle freshness: PASS.
- Window expose: 83/83 PASS.
- Patch integrity/contamination: PASS.
- Full `npm test`: reached test 4793 but execution timed out before aggregate summary; therefore full-suite PASS is not claimed.
- Browser visual smoke test: environment returns `ERR_BLOCKED_BY_ADMINISTRATOR`; browser PASS is not claimed.

## Scope safety

No business logic, IndexedDB schema, routing contract, `data-action` hooks, or domain calculations were intentionally changed by S1892.
