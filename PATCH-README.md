# CUMULATIVE-7 — Persistence Durability + Self-Test Isolation Audit

Basis: CUMULATIVE-6-CORRECTED patch tree.

## Audit findings fixed

1. **False cross-tab broadcast on failed persistence**
   - `_saveImmediate()` previously announced `kw_v4_persistence` even when both IndexedDB and the localStorage fallback failed.
   - Fixed: announcement now occurs only after a durable write succeeds.
   - If the latest snapshot cannot be persisted at all, its queued-version guard is released so a later flush can retry.

2. **Hard-flush recovery could resurrect an older IndexedDB snapshot**
   - `saveFlush()` writes the synchronous `kw_v4` localStorage snapshot before the asynchronous IndexedDB transaction is guaranteed to commit.
   - Startup previously preferred IndexedDB whenever it existed, even when the synchronous local snapshot was newer.
   - Fixed with `kw_v4_persist_meta` timestamps. On recovery, a newer confirmed local snapshot wins over an older IDB snapshot.
   - Existing installations without metadata keep the previous IDB-first behavior until a new persistence operation establishes metadata.

3. **UI self-test was coupled to real cross-tab stale state**
   - The `saveFlush()` diagnostic test could fail with the production stale-tab guard active, even though `_saveImmediate(json)` was implemented correctly.
   - Reconstructed/updated `modules/shared/self-test-cases-b.js`: the test temporarily isolates `_crossTabStateStale` / warning state, then restores both values in `finally`.
   - Production stale-tab protection is unchanged.

4. **Regression tests were updated to the new contract**
   - S1850 now accepts the queued-stamp contract.
   - S1852 checks the new hard-flush durability metadata instead of the old source shape.
   - New S1853 covers false broadcast, hard-flush recovery ordering, and self-test isolation.

## Verification performed in this patch tree

- `node --check` on all 5 changed source JS files: PASS.
- Targeted persistence audit tests: PASS (7/7 subtests across S1742/S1850/S1852/S1853).
- All four persistence mirror implementations have identical `_saveImmediate(snapshotJson)` logic after whitespace normalization.

## Bundle status — IMPORTANT

`app-bundle-b.min.js` and `docs/app-bundle-b.min.js` are **not manually edited in this patch**. The full repository and `scripts/build.js` were not present in the supplied CUMULATIVE-6 ZIP, so rebuilding a trustworthy bundle from the canonical GROUP_B source list was not possible here.

After layering this patch onto the full app-main tree, run:

```bash
node scripts/build.js s1793-final-hardening-1825
node scripts/verify-bundle-freshness.js
npm test
```

Do not treat this ZIP as a final production bundle until those commands are run on the same full tree used for the 7097-test baseline.

## Correction on top of CUMULATIVE-7
- `tests/persistence-stale-fallback-s1765.test.js`: the fallback-guard assertion matched the exact pre-durability string `if(seq===_savePersistSeq)_writeLocalSnapshot(json);`. CUMULATIVE-7 changed that line to `if(seq===_savePersistSeq){const fallbackOk=_writeLocalSnapshot(json);...`. The assertion is now a regex that still requires the `seq===_savePersistSeq` guard around `_writeLocalSnapshot(json)` and accepts both shapes, so it passes on the current source and on both a stale and a freshly rebuilt Bundle-B. No runtime change.
- Verified: fresh app-main (31) + v1825-TEST-CORRECTION + CUMULATIVE-6-CORRECTED + this patch: `npm run test:full` = 7101 tests, 7101 pass, 0 fail.
- Bundle-B is still intentionally NOT rebuilt here (no esbuild in the verification environment). `verify-bundle-freshness.js` fails until `node scripts/build.js s1793-final-hardening-1825` is run on the full tree with esbuild installed.

## Accumulation note
- This ZIP is cumulative for the SAVEFLUSH chain: it carries every fix file of CUMULATIVE-6-CORRECTED (mirrors, debug-console, tests s1843/s1850/s1851/s1852/1742, bundle-B and docs bundle-B) plus the CUMULATIVE-7 files and the corrected s1765 test. It can be layered directly on app-main (31) + the KW v1825 patch.
- `app-bundle-b.min.js` and `docs/app-bundle-b.min.js` are the CUMULATIVE-6 builds and are stale relative to the CUMULATIVE-7 source; rebuild with `node scripts/build.js s1793-final-hardening-1825` (esbuild installed) before deploy.
- Verified with only app-main (31) + v1825-TEST-CORRECTION + this ZIP (no CUMULATIVE-2/5/6 layered): `npm run test:full` = 7101 tests, 7101 pass, 0 fail.
