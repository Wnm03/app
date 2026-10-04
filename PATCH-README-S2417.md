# S2417 — Release Contract Hardening

Baseline: app-main (53)
Previous canonical: S2416

## Changed/new files
- `package.json` — add `audit:release-contract` script.
- `scripts/release-contract-audit.js` — read-only release contract aggregator; no build/install/write operations.
- `tests/s2417-release-contract-hardening.test.js` — contract tests.
- `docs/S2417-RELEASE-CONTRACT-HARDENING.md` — usage and boundaries.

## Verification
- S2417 targeted tests: 2/2 PASS.
- Read-only audit correctly reports current blockers: Bundle-B stale; eslint unavailable; esbuild unavailable.
- Performance budget: PASS.
- HTML/SW version sync: PASS.
- Patch contamination: PASS.

No runtime application code changed.
