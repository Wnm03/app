# S2718 — Checklist action baseline isolation

## Reproduced defect
A multi-component session may store a generic root `actionType` (for example `ganti`) while a component-specific checklist row has no `actionType`. The previous resolver fell back to the root action even though the component row existed, incorrectly treating that component as replaced.

## Fix
`ServiceLegacyMaintenance.componentAction()` now treats a matching component checklist row as authoritative. If its action is missing, the action remains unknown. Root-level action is used only when there is no matching component checklist row.

## Regression coverage
Added a regression test where the root action is `ganti`, one component has an explicit `ganti`, and another component row has no action. The first component retains its replacement baseline; the second does not inherit it and stays `BASELINE_REQUIRED`.

## Validation
- Focused service/reminder suite: 49/49 passed.
- `npm run build`: passed.
- Both minified bundle syntax checks passed.
- Build version/cache synchronized to 2680.
- Full suite and real browser/WebView verification were not run.

## Scope
Patch-only cumulative archive. No user service history or backup data was rewritten.
