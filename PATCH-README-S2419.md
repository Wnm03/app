# S2419 — Test/Replay Portability Hardening

## Scope
Harden the test/replay contract against dependencies on session-local or external workspace paths.

## Verified baseline
- Pristine baseline: `app-main (53)`
- Cumulative reference used for this delta: S2417
- S2418 artifact was not available in the current runtime, so this file is intentionally a **delta**, not a claim of cumulative S2419-through-S2418 completeness.

## Audit result
- Absolute `/mnt/data` / `/mnt/user-data` references in `tests/` and `scripts/`: **0**
- Historical `replayNNNN` / `freshNNNN` / `workNNNN` references: **0**
- New portability contract: **PASS**

## Changes
- `scripts/audit-test-replay-portability.js`
  - Read-only scanner for absolute workspace and historical replay dependencies.
- `tests/s2419-test-replay-portability.test.js`
  - Regression contract for the scanner.
- `package.json`
  - Adds `audit:test-replay-portability`.

## Deliberately not changed
There are 91 tests using repository-root-relative `readFileSync(...)` paths. These are a separate CWD-portability class and are not changed in S2419 because the current evidence does not establish them as a false-failure defect. They should be handled as a separate audited migration if portability outside the repository root is required.

## Verification
- `node scripts/audit-test-replay-portability.js` — PASS
- `node --test tests/s2419-test-replay-portability.test.js` — 1/1 PASS
