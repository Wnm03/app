# Deep Forensic Audit — app-main (19) — S1761

## Scope
Full source tree, 358 active JS source files, 777 active test files, primary HTML, service worker, build/release gates, generated file maps, bundles, historical audit/patch artifacts, and critical Car Notes/Servis integrity.

## Confirmed findings and actions

### F-01 — Retired Theme Pro artifacts still present (HIGH)
`modules/vehicle/pro-mockup-presenter.js` and `pro-ui-layer.css` remained in the active tree despite the permanent rollback contract. 15 retired Theme Pro test files also remained. The integrity gate reported 3 forbidden tokens and the rollback test failed.

**Action:** remove the 17 retired files using `DELETE-FILES.txt`.

### F-02 — Test runner checkpoint aggregation is unreliable (MEDIUM)
`run-full-test.js` can report a complete aggregate from shard child output while persisted shard checkpoints can contain zero test counts for otherwise PASS shards. A forced direct shard reproduced the stale/zero-count checkpoint behavior. This is an audit-tooling defect; it does not by itself prove an application defect.

**Action:** not changed in this patch because changing the test harness during the application rollback fix would mix scopes. Recommend a dedicated test-runner hardening session.

### F-03 — Generated coverage documentation was stale (LOW)
After removing 15 retired tests, `docs/COVERAGE-PER-MODULE.md` still stated 791 test files. Regenerated output now reports 777 active test files. `docs/FILE-MAP.md` was also regenerated after the retirement cleanup.

### F-04 — Release gate is environment-blocked (MEDIUM)
`eslint` and `esbuild` are absent from the supplied environment. Release gate therefore blocks on lint availability and minification. This is not bypassed. Existing source/bundle freshness, HTML/version sync, Service SoT, Car Notes integrity, window-expose, performance, and source-size gates were checked independently.

### F-05 — Maintainability warning (LOW)
`self-test.js` is 2701 lines against a 1600-line advisory threshold, but below its explicit 2750 guard cap. No refactor was made because this is maintainability debt rather than a confirmed runtime defect.

## Post-fix verification
- Car Notes integrity: PASS
- Theme Pro rollback test: PASS (2/2)
- Car Notes performance guard: PASS
- window-expose gate: PASS (82/82 data-action modules)
- Service SoT integrity gate: PASS
- Bundle freshness: PASS
- Source-size strict gate: PASS (warning only for self-test.js)
- Full sharded test execution: aggregate child output reported 6798/6798 pass, 0 fail/cancelled; checkpoint persistence is affected by F-02 and therefore should not be treated as an independent second confirmation.
- Direct unsharded `node --test tests/*.test.js` did not complete within the environment timeout; the sharded runner is the usable verification path here.

## Security/static observations
- No duplicate IDs in `index.html` or `app_production.html` (955 IDs each, all unique).
- No active production references to the retired Theme Pro presenter/CSS after cleanup; bundle search also found no retired Pro markers.
- Dynamic code sinks `eval()` / `new Function()` were not found in active non-test source. `document.write()` remains intentionally used by the modal bootstrap pipeline and is guarded by existing build-lint checks.
- Many `innerHTML` assignments exist; sampled security-sensitive dynamic HTML paths consistently use `escapeHtml`/equivalent escaping where user-controlled values are interpolated. A full sink-to-source taint audit remains a separate deep-security pass if required.

## Patch boundary
This audit patch removes only the confirmed retired Theme Pro artifacts and refreshes generated documentation. It intentionally does not alter application business logic, bundles, or release-gate overrides.
