# S2313 — Fresh Install / Cold-Start Reality Audit

## Status
**PARTIAL / BLOCKED — runtime fresh-install execution not available in this environment**

## Scope
Read-only audit of the current Keluarga W application surface for:
- first-run/onboarding state
- persisted local state and reload expectations
- PWA/service-worker entry points
- backup/restore as a recovery path
- distinction between static evidence and a real browser fresh-install test

## Evidence verified from repository/library sources

1. `index.html` contains the onboarding surface and explicitly keeps `#onboard`
   hidden by default; the source comment states that `init()` reveals it for a
   genuinely new user who has never completed setup.
2. The application exposes local backup/restore through the UI, including JSON
   import/restore.
3. The application documents local browser storage and warns that storage
   capacity can be limited.
4. PWA/service-worker behavior is present in the application surface and is
   therefore part of the cold-start path.
5. Google Drive backup is documented as a separate recovery path intended to
   survive local browser-cache deletion.

## What cannot be claimed

A true S2313 "fresh install / cold start reality test" requires an actual browser
profile/device lifecycle:

1. clear site data / new browser profile;
2. open the deployed app;
3. verify first-run onboarding;
4. complete onboarding;
5. create representative data;
6. hard reload;
7. close/reopen;
8. verify all persisted domains and relationships;
9. unregister/clear service-worker/cache where applicable;
10. reopen from a clean install state;
11. verify recovery/restore.

That lifecycle was **not executed here**. Therefore no PASS is claimed for
real-device/browser persistence, service-worker activation, cache replacement,
or cold-start rendering.

## Production delta

- Production code: 0
- Schema: 0
- Persistence implementation: 0
- UI implementation: 0
- Service worker: 0
- Audit documentation: 1

## Verdict

**S2313 remains OPEN / BLOCKED pending a real browser fresh-install test.**

This is an evidence limitation, not evidence of a runtime defect.

Recommended execution environment:
- Android Chrome (primary real-user target)
- one clean browser profile/site-data reset
- one installed PWA lifecycle if the deployment supports installation
- one hard reload and one browser-close/reopen cycle
- record screenshots/console errors and persistence checks for representative
  Finance, Vehicle/Car Notes, Service, Shop/Stock, Asset/Investment, Owner/
  Titipan data.

Do not modify production code merely to close this audit.
