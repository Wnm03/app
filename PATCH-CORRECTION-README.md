# UI-V7 / Keluarga-W — v1825 Final Test Correction Patch

This is an additive correction to `KW-DASHBOARD-SERVIS-PERF-PATCH-v1825-FINAL-ACCUMULATED.zip`.

## Scope

Only two test-contract corrections are included. No business logic, UI, CSS, production source, or production bundle behavior is changed by this correction.

### 1. `tests/perf-navigation-v1825.test.js`
Updated the static assertions to match the current helper name:

- `activeTab(...)` → `getActivePageTab(...)`

The runtime behavior being asserted is unchanged.

### 2. `tests/sa16-dashboard-settings-dynamic-inline-attr.test.js`
Updated `DASH_PREFS_FILES` so the dashboard preference migration checks the file where the implementation now lives:

- `modules/shared/modules-render.js` → `modules/shared/modules-render-b.js`

## Baseline reported for this correction

The supplied full-test result after these two test corrections was:

- 7094 tests
- 7094 passed
- 0 failed

This package is intentionally cumulative: it contains the prior v1825-FINAL patch contents plus these two corrected test files.
