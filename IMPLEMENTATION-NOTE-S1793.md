# S1793 — Deep Hardening Cumulative S1787–S1793

## Implemented

- **S1787 Architecture / SoT:** added `architecture-integrity-gate.js`; runtime manifest is checked for duplicates/missing critical sources and legacy duplicate security owners are prevented from entering the runtime manifest.
- **S1788 State / Persistence:** added `persistence-integrity-gate.js`; verifies IDB primary persistence, critical localStorage snapshot, serialized write queue, lifecycle flush, and cross-tab stale protection.
- **S1789 Event / DOM lifecycle:** existing singleton lifecycle + AIBus cleanup is now included in the deep release firewall.
- **S1790 Data / migration hardening:** `runDataMigrations()` now stops at the first failed migration and leaves `D.schemaVersion` at the last successful checkpoint. This prevents a failed migration from being permanently marked as completed. Added regression coverage.
- **S1791 Offline / PWA recovery:** added `pwa-recovery-integrity-gate.js` checking install/activate/fetch recovery, precache core assets, cache version, and non-undefined offline Response fallback.
- **S1792 Feature regression:** added `feature-regression-gate.js` checking that critical Finance/Theme/Navigation/Backup/AI/Vehicle/Fuel/Servis sources remain in the build manifest and critical HTML anchors remain present.
- **S1793 Release firewall:** added `release-firewall.js` as a structural hard-gate aggregator and wired it into `verify-release-ready.js`.
- Historical cache-bust regression test `carnotes-classic-polish-1756.test.js` was made version-relative instead of hard-coding 1766, so future release bumps do not create false failures.
- `tests/version-integrity-s1783.test.js` was made release-relative instead of hard-coding the previous session version.
- `docs/AUDIT_MATRIX.md` baseline was synchronized to the current repository inventory.
- Rebuilt bundles/HTML/SW as release **`s1793-final-hardening-1793`**; bundle source-hash freshness and syntax were reverified.

## Verification

- Deep Release Firewall: **10/10 PASS**.
- New cumulative regression suite: **53/53 PASS**.
- Changed JavaScript syntax check: **39/39 PASS**.
- Car Notes integrity: **PASS** — forbidden 0, duplicate IDs 0/0, Servis declaration 1.
- DELETE-FILES manifest: **18/18 PASS**.
- Version integrity: **PASS** — source `s1793-final-hardening-1793`, HTML `?v=1793`, SW `kw-cache-v1793`.
- Bundle freshness: **A/B PASS**.
- Source-size strict gate: **PASS with existing warning** — `tests/self-test.js` is 2701 lines but remains under its documented 2750 guard cap.

## Full-suite status

The full 32-shard suite could not be completed to a single authoritative aggregate inside this sandbox because long-running direct shards hit the execution-time ceiling. Individual shard runs that completed were checked for real TAP counts and failures; one historical hard-coded-version test failure was found and fixed. The complete cumulative targeted regression set above is green.

## Environment-only release limitations

`eslint` is not installed in this sandbox, and `esbuild` is unavailable, so `verify-release-ready.js` still cannot report the optional environment gates as PASS without a real dependency installation. The generated bundles are syntactically valid and fresh, but are **not minified** in this environment.
