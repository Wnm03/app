# S2426 — Dependency Lock / Release Path Contract

## Finding
S2425 added a read-only lockfile blocker to `audit:release-contract`, but the actual `scripts/release.sh` path did not independently require a lockfile before running `npm run check`. This left the official release workflow less strict than its reproducibility contract.

## Repair
- `scripts/release.sh` now fails before build/test when neither `package-lock.json` nor `npm-shrinkwrap.json` exists.
- Added `scripts/audit-dependency-lock-contract.js` as a narrow static guard.
- Added `tests/s2426-dependency-lock-contract.test.js`.
- Added `audit:dependency-lock` npm script.

## Important limitation
The current repository still has no lockfile. S2426 intentionally does **not** fabricate one. The environment has no cached esbuild package metadata, so a real lockfile must be generated in an environment with the project's dependency registry/cache and then committed.

## Validation
- S2426 targeted test: expected 2/2 PASS.
- Lockfile presence: BLOCK in current environment.
- esbuild/eslint availability remains BLOCKED.
- Bundle-B freshness remains BLOCKED/stale.
