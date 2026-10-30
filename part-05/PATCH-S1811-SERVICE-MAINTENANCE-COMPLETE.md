# S1811 — COMPLETE SERVICE MAINTENANCE PATCH

## Scope
Cumulative patch: includes S1810 Service Component/Action/Reminder fixes plus the requested complete maintenance-guidance layer. ZIP contains only changed source/test files; no generated bundles are included.

## Implemented
1. Canonical service component identity remains `serviceComponentId` / `SERVICE_CHECKLIST_GROUPS`.
2. System Pengereman remains canonicalized: specific front/rear brake-pad components; no generic `Kampas Rem` recommendation.
3. `Pembersihan Rem` is treated as an action, not a component.
4. Manual action selection is available: `Periksa`, `Bersihkan` (when valid), `Ganti`.
5. Reminder completion now opens an action picker instead of silently assuming the recommended action.
6. Rule-based recommendation layer: condition + maintenance urgency -> recommendation only; user choice remains authoritative.
7. Inspection result is persisted: `baik`, `mulai-aus`, `aus`, `rusak`.
8. Per-component condition note is persisted (max 500 chars).
9. Last inspected / last replaced / last cleaned are tracked separately for reminder context.
10. Recommendation reason is surfaced in checklist/reminder UI.
11. KM, month, and day reminder axes remain supported; month/day-only schedules are not filtered out because `intervalKm` is absent.
12. `Tidak berlaku` can be recorded from the checklist and suppresses that component's reminder until a later actual service record supersedes it.
13. Legacy free-text brake/service entries are not guessed into a component; UI flags them for manual mapping through Edit.
14. Reminder status remains multi-level and now exposes the relevant history context.
15. Service SoT integrity helper audits duplicate IDs/names, generic brake duplicates, orphan categories, unknown history component IDs, and legacy unmapped labels.
16. Build order includes the new guidance module so the generated bundles contain the feature.

## Data compatibility
- Existing `D.servisLogs` rows remain valid.
- New fields are additive: `conditionResult`, `conditionNote`, `checklistNotApplicable`, plus per-checklist-row condition fields.
- Existing action/interval semantics are preserved unless the user explicitly chooses a manual override.
- Legacy free-text is not destructively rewritten when the component cannot be resolved unambiguously.

## Validation
- Service-focused regression suite: **409/409 PASS**.
- New S1811 guidance tests: **5/5 PASS**.
- Targeted checklist/history/reminder regression tests: PASS.
- Build verification in a clean copy: **s1813 build PASS**; both generated bundles passed `node --check`.
- Full application test suite was allowed to run but exceeded the execution window; the run reached **4246 tests** before timeout, so no 100% full-suite completion claim is made.

## Deployment
1. Apply this ZIP over the current source tree.
2. Run the project's normal build command, e.g. `node scripts/build.js` with the next numeric build version.
3. Deploy all files produced/changed by the build, including both bundles, HTML, and service-worker cache version.
4. On Android/Brave, perform the normal service-worker/cache refresh after deployment.
