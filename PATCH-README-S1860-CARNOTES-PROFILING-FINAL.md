# PATCH README — S1860 Car Notes Profiling / Tooling Hardening

## Handoff checklist

- [ ] Apply **all** files listed between `BEGIN_APPLY_FILES` / `END_APPLY_FILES` in `PATCH-MANIFEST-S1860-FIXED.txt`.
- [ ] Apply the canonical `DELETE-FILES.txt` before build. `DELETE-FILES-S1860-FIXED.txt` is retained as a historical copy.
- [ ] Confirm `chat-action-handlers.js` is present **before** running build.
- [ ] Run `node scripts/build-with-patch-manifest.js PATCH-MANIFEST-S1860-FIXED.txt` (or `npm run build:patch -- PATCH-MANIFEST-S1860-FIXED.txt`).
- [ ] Run `node --test tests/*.test.js` for the direct full-suite result.
- [ ] Run `npm run test:full`; on a single-core environment it now auto-falls back to 1 shard unless `TEST_SHARDS` is explicitly supplied.
- [ ] Run `npm run audit:test-hygiene`.
- [ ] Run `node scripts/persistence-integrity-gate.js`.

## What this cumulative fix adds

1. **Patch preflight before build/version mutation.** The manifest is machine-readable; a missing file aborts before `build.js` can bump any version.
2. **Version preflight before writes.** `bumpVersionEverywhere()` refuses to write if any runtime version constant has drifted from the canonical old version.
3. **Single-core full-test fallback.** `run-full-test.js` automatically selects one shard on one-core environments; explicit `TEST_SHARDS` remains authoritative.
4. **Test-hygiene audit.** A lightweight advisory scanner identifies brittle exact call-text assertions so future safe signature refactors are less likely to create stale failures.
5. **Dead renderer retirement.** `modules/modules-render.js` is removed. Tests previously reading it are redirected to the canonical live renderer files (`modules/shared/modules-render.js`, `modules/shared/modules-render-b.js`, or `modules/shop/modules-render.js`) according to the functionality actually loaded.
6. **Handoff checklist.** This README makes file application order, delete step, build, test, and gate evidence explicit.
7. **Post-audit corrections.** `s1858-carnotes-deep-performance.test.js` now targets the canonical live renderer and asserts the performance/profile pipeline that actually exists; `test-runner-serial-recovery-s1778.test.js` now follows the `detectedParallelism` implementation. `DELETE-FILES.txt` is now the canonical two-entry manifest consumed by `scripts/apply-delete-manifest.js`.

## Preserved S1860 runtime work

The Car Notes profiling/performance source and generated build artifacts from the corrected S1860 patch remain accumulated. This fix does not revert or replace those runtime changes.

## Validation target

Final validation on the corrected merged tree: the two stale tests are updated to the canonical renderer/runner implementations; the targeted regression set is green. The full-suite runner was attempted in the constrained sandbox but did not complete within the execution window, so no new full-suite claim is based on that timeout.


S1860 NEXT HARDENING — ONE-STAGE CUMULATIVE ADDITION
=====================================================
Implemented in the same cumulative patch: atomic build rollback; patch manifest integrity; duplicate/dead-code advisory scan; runtime storage/JSON/render/save hotspot audit; event-listener audit; explicit-version reproducibility gate; Car Notes scalability proxy audit; and patch contamination gate.

Recommended execution order:
1. `npm run audit:patch-contamination`
2. `npm run audit:patch-integrity` with `PATCH_MANIFEST=PATCH-MANIFEST-S1860-FIXED.txt`
3. `npm run audit:test-hygiene`
4. `npm run audit:duplicates`
5. `npm run audit:event-listeners`
6. `npm run audit:runtime-io`
7. `npm run audit:scalability`
8. `node --test tests/s1860-tooling-hardening.test.js tests/s1860-carnotes-profiling.test.js`
9. `npm run build:atomic -- --require-minify` for release builds, or `npm run build:atomic` for normal builds.
10. `npm run verify:reproducible-build` on a clean release candidate when byte-identical rebuild validation is required.

The duplicate/event/runtime/scalability scans are advisory and deliberately do not rewrite application logic automatically; they produce concrete hotspots for the next profiling decision. The atomic wrapper is the safe build entrypoint because it restores build-owned source/artifacts if build.js exits non-zero.
