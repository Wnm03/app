# PATCH S2027-S2030 — APP MAIN FINAL NATIVE WIRING

Target: APP MAIN baseline `app-main (14).zip`.

## Purpose

Complete the S2027-S2030 compatibility patch without replacing APP MAIN's native Service SOT architecture and without shipping a full release.

## Runtime change

Add one source entry to `scripts/build.js`, immediately after:

`modules/vehicle/service-event-sot.js`

Add:

`modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js`

This makes the already-tested compatibility projection part of the normal APP MAIN build input.

## Added files

- `modules/vehicle/service-history-lifecycle-s2027-s2030-app-main.js`
- `tests/service-history-lifecycle-s2027-s2030-app-main.test.js`

## Important exclusions

Do not copy historical S2014-S2030 runtime replacements over APP MAIN. Do not replace `servis.js`, `servis-b.js`, bundles, HTML, service worker, persistence, or Service SOT modules.

## Verification

Targeted compatibility test: 1/1 PASS.

Full repository test was started on the patched APP MAIN copy but the execution environment timed out before the Node test runner emitted its final summary; therefore no new full-suite PASS claim is made here.
