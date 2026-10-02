# S2315 — PWA Offline / Recovery Reality Audit

## Status
**OPEN / BLOCKED — browser runtime required**

## Scope
Audit the PWA/offline/recovery boundary without modifying production code.

## Verified repository evidence

1. `index.html` / `index(1).html` reference:
   - `manifest.json`
   - `app-bundle-a.min.js`
   - `smoke-test.js`
   - a PWA/service-worker helper identified in source comments as
     `features-sheets-pwa-selftest.js`.

2. The HTML explicitly documents that the PWA service worker is registered
   from the PWA/self-test feature.

3. The HTML contains a module-load failure banner. A failed module load is
   surfaced to the user rather than silently ignored.

4. The application has local persistent state and separate backup/recovery
   mechanisms. Google Drive backup is documented as a JSON recovery path
   intended to survive local browser-cache deletion.

5. CSP includes `worker-src 'self' blob:`, which is compatible with the
   documented Blob-based service-worker path.

## What this audit does NOT prove

Static repository evidence cannot prove:

- service-worker installation actually succeeds on a real origin;
- activation and controller takeover succeed;
- the expected cache is populated;
- a cold reload with network disabled serves the application shell;
- stale-cache replacement works after an application update;
- deleting browser/site data leaves the remote backup usable;
- an interrupted/offline write remains durable;
- Android Chrome/PWA standalone mode behaves correctly.

These require an actual browser/device lifecycle.

## Required S2315 reality matrix

| Scenario | Required evidence |
|---|---|
| First online open | App shell loads |
| SW registration | Registration succeeds |
| SW activation | Active worker controls page |
| Cache population | Required shell assets present |
| Network OFF + reload | App opens from cache |
| Existing local data + offline | Data remains readable |
| Offline mutation | Contract explicitly known; no silent loss |
| Network restored | App recovers without duplicate/corrupt state |
| New build | Cache version replaced/invalidated correctly |
| Old SW → new SW | No mixed-version shell |
| Site data cleared | Clean install path works |
| Remote backup restore | Data recoverable after local wipe |
| Standalone/PWA mode | Core app remains usable |

## Current verdict

**S2315 cannot be CLOSED from static evidence.**

No production defect is asserted. The blocker is execution environment: this
audit requires a real browser/device with DevTools or equivalent control over
network state, service-worker registration, cache storage, and site data.

## Delta

- Production: 0
- Schema: 0
- Persistence: 0
- UI: 0
- Service worker: 0
- Tests: 0
- Audit documentation: 1

Do not add or alter service-worker logic merely to turn this audit into PASS.
