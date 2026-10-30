# S1785 — Full Gap/Error/Bug/Diff Audit

## Findings closed
1. **Theme Pro rollback deletion gap** — `DELETE-FILES.txt` declared 18 retired paths, but 17 retired files were still physically present. This caused `verify-delete-manifest.js`, `verify-carnotes-integrity.js`, and `carnotes-theme-pro-rollback.test.js` to fail. All 17 physical files are removed in the audited working tree. The remaining manifest entry is the `finance/` directory contract and is intentionally left outside this patch because it is a directory-level historical cleanup target requiring separate review.
2. **Deletion was not operationally reproducible** — added `scripts/apply-delete-manifest.js`, an idempotent, path-safe applier with duplicate/path-traversal checks. Added npm command `npm run apply-delete-manifest`.
3. **Runner recovery timeout gap** — `scripts/run-full-test.js` now supports `TEST_RECOVERY_TIMEOUT_MS` for the serial retry after empty TAP, bounded by the normal shard timeout (default 30s, never below 10s).

## Audit results
- `node --check` source: PASS.
- Version integrity: PASS — `s1783-final-reliability-1766` / `?v=1766` / `kw-cache-v1766`.
- DELETE-MANIFEST: PASS — 18/18.
- Car Notes integrity: PASS — 343 files scanned, 0 forbidden Theme Pro tokens, 0 duplicate IDs, exactly 1 `Servis` declaration.
- Runtime lifecycle: PASS.
- Service SoT integrity: PASS.
- Bundle freshness: PASS — both production bundles fresh.
- Focused S1780/S1783/S1785 regression set: 21/21 PASS.
- Individual 32-shard verification: all 32 shards PASS when executed independently/serially; shard totals are recorded by the runner checkpoints.

## Remaining environment limitation
A single monolithic `node scripts/run-full-test.js` invocation can exceed the sandbox wall-clock limit even though each shard completes successfully when isolated. This is treated as an environment/runner orchestration limitation, not reported as an application regression. `eslint` and `esbuild` are also unavailable in this sandbox.

## Deliberately not changed
`self-test.js` remains above the 1600-line advisory threshold (2701 lines, below the current 2750 guard cap). It is a maintainability refactor candidate, not a demonstrated runtime bug, so it is not hidden by raising the cap in this patch.
