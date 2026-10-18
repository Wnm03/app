# S2151 — Cumulative Service Interval Chain Audit & Fix

## Scope and baseline
- Baseline: `app-main (23).zip`.
- Accumulated history preserved: S2145, S2146, S2147, S2148, S2149, S2150, and S2151.
- Chain audited: component master → generated checklist master → `ServiceInputCatalog` → `ServiceIntervalSOT` / `VehicleCarNotesSOT` → maintenance action plan → service history reset baseline → next-due snapshot/reminder urgency.
- Cumulative service master: 13 groups, 102 components.

## Substantive runtime defects fixed
1. **Independent interval axes were being collapsed.** The legacy persisted category interval could overwrite the inspection interval before the active SOT was mapped onto the replacement axis. For components declaring `intervalAxes: "independent"`, category projections no longer overwrite the inspection rule; the active vehicle SOT owns the replacement axis.
2. **Filter Fuel Pump:** inspection remains every 12,000 km while the active replacement SOT is 48,000 km; a pressure/condition trigger remains separate.
3. **Busi:** inspection cadence 4,000 km and replacement SOT 8,000 km now remain separate so the alternating cadence is not collapsed to one interval.
4. **Minyak Rem:** inspection 4,000 km is independent from replacement at 24,000 km / 24 months.
5. **Aki:** inspection at 4,000 km remains separate from the 15,000 km replacement/condition review cadence.
6. **Ban Depan:** condition/TWI inspection at 4,000 km and pressure check every 14 days remain separate from the approximate 20,000 km replacement SOT.
7. **Ban Belakang:** 4,000 km condition/TWI and 14-day pressure checks are retained; the 16,000–20,000 km service-life range is not fabricated into a fixed replacement interval.
8. **V-Belt model/year scope:** the 24,000 km replacement guideline is limited to KZR / Vario Techno 125 model year 2012. The generic 32,000 km interval remains for other matching models/years. Stale `pedoman` SOT records are migrated to the scoped guideline; `manual` and `ai-rekomendasi` records are not overwritten.
9. **Roller CVT:** inspection cadence is independent of the active SOT replacement cadence. The disagreement between the user-accumulated 12,000–15,000 km replacement note and the existing ±24,000 km master remains explicitly flagged for policy review; no unapproved interval was silently selected.

## Chain integrity
- `scripts/audit-service-reminder-chain-s2151.js`: PASS, 102 components scanned, zero structural/runtime-chain findings.
- Generated master and JSON source deep equality: PASS.
- Independent-axis components validated: busi, V-Belt CVT, Roller CVT, Filter Fuel Pump, Minyak Rem, Aki, Ban Depan.
- Manual SOT preservation and guideline-only migration covered by S2151 regression tests.
- `ServiceIntervalSOT` remains the single active interval SOT; historical service snapshots are not rewritten.

## Verification
- Build: PASS, version **2567**.
- Focused regression tests: **31/31 PASS**.
- Full regression: **8,913 tests; 8,912 pass, 0 fail, 0 cancelled, 1 skipped** across 64 shards. Every shard checkpoint validated against the current test manifest.
- `node --check` on changed runtime sources and both bundles: PASS.
- `scripts/verify-bundle-freshness.js`: PASS for both bundles.
- Non-full-regression checks in `service-sot-integrity-gate.js`: PASS. The gate was run with its full-regression leg skipped because the full regression was run separately and independently passed.

## Remaining explicit policy review (not silently resolved)
- **Roller CVT:** the accumulated note says 12,000–15,000 km replacement, while the existing master says approximately 24,000 km. The master remains `needsReview: true`; deciding which guideline is authoritative requires a verified model-specific service source. This is a data-policy discrepancy, not a failing runtime regression.
- Build warnings still report an outdated `docs/AUDIT_MATRIX.md` file-count baseline and oversized source files. They do not fail the build and are outside the interval-reminder chain scope.

## Release conclusion
No known substantive runtime defects remain in the audited interval/reminder chain checks, and the complete regression suite passed. This is not a claim that every possible application bug is impossible; the Roller CVT interval policy is deliberately left visible for evidence-based resolution rather than guessed.
