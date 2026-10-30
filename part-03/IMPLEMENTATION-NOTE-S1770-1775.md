# S1770-S1775 — Release Hardening

Implemented post-S1769 hardening as a source-only cumulative patch.

## Added
- `scripts/verify-release-hardening.js`: release toolchain presence, bundle source-hash freshness, HTML mirror, PWA precache, fixed bundle-size budget, and runtime timer ownership checks.
- `scripts/verify-pwa-recovery.js`: static offline/install/activate recovery contract.
- `scripts/verify-listener-lifecycle.js`: listener duplication guard for runtime lifecycle surfaces.
- `config/release-budgets.json`: source-controlled bundle byte ceilings (10% headroom from the audited S1769 baseline).
- `tests/release-hardening-s1770-1775.test.js`: regression coverage for the new gates and the zero-test shard protection.

## Existing hardening retained
- S1762 self-test decomposition and compatibility facades.
- S1763 runtime lifecycle idempotency.
- S1764 persistence/backup ordering.
- S1765 stale persistence fallback sequencing.
- S1766 final audit and full-test runner zero-test-shard protection.
- S1769 cumulative final-audit changes and retired Theme Pro deletions.

## Verification
- PWA recovery contract: PASS.
- Listener lifecycle contract: PASS.
- New release-hardening regression tests: 4/4 PASS.
- Bundle A/B source hashes: fresh.
- HTML production mirror: exact after generated-marker normalization.
- Bundle budgets: PASS.
- Runtime interval ownership: PASS (1 maintenance interval in extracted runtime).

## Environment limitation
`eslint` and `esbuild` are not installed in the sandbox. An `npm install --ignore-scripts --no-audit --no-fund` attempt timed out, so no false PASS was recorded. The release-hardening gate deliberately reports those tools as required before a production release.
