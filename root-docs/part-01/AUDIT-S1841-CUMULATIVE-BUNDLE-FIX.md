# S1841 — Cumulative Repack: Bundle Regression Fix

## Scope

Baseline: `app-main (29)`, with S1840 (service-crash/version-closure) already
applied, then `patch-S1841-fuel-data-quality-forecast-cumulative-S1840.zip`
applied on top, per user request to run a full test.

## Root cause found during full test

The S1841 zip's own manifest already flagged that it had not achieved a
full-suite PASS in its build environment. Running the full suite after
applying it on top of the S1840-patched tree surfaced a concrete regression:

`tests/s1840-release-gates.test.js` — *"S1840 production version contract has
no stale v1817 runtime references"* — failed. The assertion expects
`app-bundle-b.min.js` to contain `itemsOfGroup` (the defensive wrapper-access
helper introduced by the S1840 service-crash fix in
`servis-checklist.js`/`servis.js`/`tx-servis.js`).

Investigation:
- Source files `modules/vehicle/servis-checklist.js`, `modules/vehicle/servis.js`,
  `modules/finance/tx-servis.js` still contained `itemsOfGroup` (14, 3, and 1
  occurrences respectively) — the S1841 zip did not touch these files.
- `app-bundle-a.min.js` / `app-bundle-b.min.js` shipped inside the S1841 zip
  contained **zero** occurrences of `itemsOfGroup`.

This means the S1841 zip's prebuilt bundles were generated from a source tree
that branched off plain baseline-29 without the prior S1840 service-crash fix
merged in. Overlaying just that zip's bundle files onto an already-fixed
source tree silently reverted the crash fix at the only layer that matters in
production (the bundle), while the source files on disk still looked correct
— a classic "source is right, artifact is stale" deployment trap, which is
exactly the class of bug the version/bundle-freshness gates from the earlier
S1840 close-out were built to catch.

## Fix

Ran `node scripts/build.js` against the fully merged source tree (S1840
service-crash fix + S1840 fuel-consumption-standard + S1841 fuel-data-quality,
all present together). This:

- Regenerated `app-bundle-a.min.js` / `app-bundle-b.min.js` from the correct,
  complete source set (`itemsOfGroup` now present in bundle B: 18 occurrences).
- Bumped `APP_BUILD_VERSION` and all synced version constants from
  `s1793-final-hardening-1818` to `s1793-final-hardening-1819`.
- Rewrote `?v=` in `index.html` / `app_production.html` and `CACHE_NAME` in
  `sw.js` to `1819`.
- Re-ran `node --check` on both regenerated bundles: PASS.

esbuild is not available in this environment (no network access), so the
rebuilt bundles are unminified concatenations rather than minified output —
functionally equivalent, larger in size, and explicitly flagged as safe by
`build.js` itself. This is an environment limitation, not an application
defect.

## Regression

Full suite after rebuild: **7031 tests, 7031 pass, 0 fail, 0 cancelled, 0
skipped, 0 todo** (`node --test tests/*.test.js`, single process, ~80s).

Release gates after rebuild:
- `verify-bundle-freshness.js`: PASS
- `verify-version-integrity.js`: PASS — `s1793-final-hardening-1819` / `?v=1819`
  / `kw-cache-v1819`
- `verify-delete-manifest.js`: PASS — `pro-ui-layer.css` absent
- `pwa-recovery-integrity-gate.js`: PASS
- `service-sot-integrity-gate.js`: PASS on all 8 structural/behavioral checks

## Known environment limitation (not an application defect)

This sandbox has a single CPU core. `service-sot-integrity-gate.js` invokes
its own full-regression check via a 32-shard/8-concurrency child-process
runner (`scripts/run-full-test.js`), which is unreliable under single-core
contention: a shard's `node --test` child can exit 0 without emitting a TAP
summary, and the runner's own retry/serial-recovery logic does not always
resolve this before the final checkpoint-integrity re-check. This was
observed both on the S1840 baseline (documented in the original S1840 audit)
and again here (shard 28 in this run). Verified as infra noise, not a real
failure, by running that shard's 26 test files directly (`node --test
<files>`): 296/296 pass.

## Conclusion

This repack carries the same intended S1841 fuel-data-quality behavior as the
originally-uploaded zip, plus the S1840 fixes it should have been built on top
of, with production artifacts (bundle A/B, HTML, SW) rebuilt from the actual
merged source so the shipped bundle matches what the source files contain.
Deploy this zip's contents as a complete set; do not substitute bundle/HTML/SW
files from the earlier, non-cumulative S1841 zip.
