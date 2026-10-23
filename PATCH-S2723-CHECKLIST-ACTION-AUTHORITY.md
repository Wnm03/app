# S2723 — Checklist action authority on edit

## Finding
The checklist-edit reconciliation path used truthy fallbacks (`payload.actionType || owner.actionType`) when updating an existing component row. An explicitly blank checklist action could therefore fail to clear a stale `ganti` action already stored on that component, even though the reminder baseline policy treats blank action as unknown.

## Change
- Treat the presence of the `actionType` property as authoritative, including an explicit blank/null value.
- Use the session/owner action fallback only when the payload does not contain the `actionType` property.
- Use the resolved component action for the next-due snapshot so blank actions cannot create a reset baseline.
- Added regression coverage for editing an existing component with stale `ganti` to an explicitly blank action.
- Rebuilt production bundles and synchronized cache/build version to 2686.

## Validation
- 23/23 focused tests passed across five test files.
- `npm run build -- --no-progress` completed successfully.
- Both production bundles passed `node --check`; HTML files and service worker cache versions synchronized to 2686.
- Full test suite and real browser/WebView verification remain outstanding; this patch does not claim zero remaining substantive bugs.
