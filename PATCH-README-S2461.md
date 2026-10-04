# S2461 — Restore Full Identity Reconciliation + CSP-safe Diagnostic Export

Accumulated on baseline: app-main (5).zip
Build: s2041-1-part-sot-hardening-2234 / cache 2234

## Fixes

1. Restore reconciliation now covers nested `servisLogs[].checklist[]` references and legacy `serviceCost.components[]` references, inheriting vehicle ownership from the parent service log without injecting synthetic `vehicleId` fields into nested records.
2. Cross-vehicle category repair remains fail-closed: only a deterministic canonical `serviceComponentId` can provision a vehicle-local Car Notes projection.
3. S2013 restore diagnostics now persist the full category/component reconciliation issue list (up to 200 issues/changes) in `window.__S2013_RESTORE_DIAGNOSTIC` and localStorage key `kw_restore_diagnostic_s2013`.
4. Added CSP-safe application actions to copy or download restore diagnostics. No `eval`, `new Function`, or CSP weakening is introduced.
5. Stale restore diagnostics are cleared at restore start and after successful restore.
6. Auto self-test lazy diagnostic residency is now inside the guarded bootstrap; a rejected lazy loader can no longer escape before the `try/catch` and surface as opaque `Auto self-test gagal jalan: ReferenceError {}`. Bootstrap errors are also logged with their actual error object.
7. Diagnostic UI adds `Salin Detail Restore` and `Simpan Restore JSON`.

## Tests

- S2451/S2455/S2461 targeted restore suite: 8/8 PASS.
- Real backup fixture `backup-keluarga-W-2026-10-04.json`: reconciliation PASS, 0 unresolved, 19 deterministic changes under the test harness.
- verify-window-expose: PASS.
- lazy-boundary audit: 99/99 PASS.
- patch integrity: PASS.
- patch contamination: PASS.
- persistence integrity: PASS.
- PWA recovery integrity: PASS (cache v2234).
- SOT integrity: PASS.
- production bundle syntax: PASS.
- bundle freshness: PASS.

## Full suite note

`npm test` was started but did not complete within the execution timeout; the observed suite remained green through test 316 before timeout. This is a test-duration/environment limitation, not reported as a full-suite PASS.

## Build note

The repository environment has no installed `esbuild`/`eslint`, so the build produced valid non-minified bundles. `node --check` passes for both bundles. A clean release gate still requires the project's normal dependency install and minified production build.
