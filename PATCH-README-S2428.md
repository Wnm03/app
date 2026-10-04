# S2428 — CI + Audit-Matrix Governance Contract

## Scope
Close two documentation/governance gaps found during the repair queue:
1. the active repository had no `.github/workflows/ci.yml` although current developer guidance required it;
2. `docs/AUDIT_MATRIX.md` still presented obsolete coverage counts as the current baseline.

## Repair
- Add `.github/workflows/ci.yml`.
  - triggers on push and pull request;
  - requires `package-lock.json` or `npm-shrinkwrap.json` before installation;
  - installs with `npm ci`;
  - runs `npm run check` as the release-grade check.
- Add `tests/s2428-ci-workflow-contract.test.js` to prevent accidental removal/weakening of the CI contract.
- Add a current S2428 coverage snapshot to `docs/AUDIT_MATRIX.md` using the clean S2427 replay inventory: 3195 files, 1859 JS, 1254 tests, 1133 Markdown, 7 HTML, 16 JSON, 4 CSS, 14 top-level module directories.

## Important limitation
S2428 does **not** create a lockfile, install dependencies, or rebuild Bundle-B. The workflow is intentionally expected to fail at its lockfile gate until a real npm-generated lockfile is produced in a valid dependency environment.

## Validation target
- S2428 workflow contract tests must pass locally.
- Clean replay must preserve the S2427 release blockers rather than masking them.
