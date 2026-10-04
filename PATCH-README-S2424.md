# S2424 — Bundle-B Budget Contract Realignment

## Baseline
`app-main (53)` + cumulative S2423.

## Finding
`performance-budget.js` defines the authoritative Bundle-B release ceiling as **5,000,000 bytes**, while `config/release-budgets.json` still contained the historical **4,808,116-byte** threshold. The same production artifact therefore received conflicting decisions from two release gates.

## Repair
- Align `config/release-budgets.json` Bundle-B budget to 5,000,000 bytes.
- Add `tests/s2424-bundle-budget-source-contract.test.js` so the fixed release-hardening budget cannot silently drift from the authoritative performance budget.
- No runtime, bundle, HTML, SW, or source-code behavior changed.
- No Bundle-B rebuild was fabricated: the existing Bundle-B remains stale until a real production build with esbuild is available.

## Evidence
- S2424 contract test: PASS.
- Performance budget: PASS, Bundle-B 4,925,019 / 5,000,000 bytes.
- Bundle freshness: BLOCK — source 6a7306385a0b77d1 vs embedded 221da3874ea0ea76.
- eslint: BLOCK — unavailable.
- esbuild: BLOCK — unavailable.

## Release interpretation
S2424 closes the contradictory budget-gate contract. It does **not** close the existing Bundle-B freshness blocker or toolchain blockers.
