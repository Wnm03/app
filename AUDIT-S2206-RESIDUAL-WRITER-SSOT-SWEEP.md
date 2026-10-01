# A-S2206 — Residual Writer / SSOT Sweep

## Scope
Final residual mutation sweep after S2180–S2205. No UI/schema redesign. Objective: ensure production mutation of canonical collections goes through the established SOT/canonical writers.

## Findings
- Routed remaining production `D.transactions` create/delete/restore paths through `FinanceTxSOT` across Finance, Shop, Home/Renovasi, Asset/Investasi, Vehicle/Service and recovery paths.
- Routed transfer-pair creation through `FinanceTxSOT.createMany()`.
- Routed transaction restore/delete/filter operations through `create`, `updateById`, `removeById`, `removeWhere`, or `replaceSnapshot`.
- Extended `ShopCanonicalWriter` with `replaceSnapshot()` and routed remaining Shop import/restore/update/delete snapshot paths through the canonical boundary.
- Routed Shop pricing/import/etalase mutation paths through `ShopCanonicalWriter`.
- Added a static residual-writer test so future direct canonical collection mutation is detected.

## Compatibility policy
Legacy fallback branches remain only where the runtime explicitly lacks the canonical dependency. They are not the normal production path. Self-test, backup/restore, initialization and read-only consumers are excluded from the writer gate.

## Validation
- S2206 targeted: 2/2 PASS.
- Combined S2181–S2205 + S2206 targeted suite: 59/59 PASS.
- S2167 production runtime wiring: PASS.
- S2154–S2159 SOT consolidation: 6/6 PASS.
- S2160 SOT drift/orphan gate: 6/6 PASS.
- S2166 runtime projection sync: PASS.
- Build: PASS, version 2202.
- Bundle A/B syntax: PASS.

## Known non-S2206 warnings
- `modules/asset/aset-misc.js:476` empty catch warning (pre-existing).
- `docs/AUDIT_MATRIX.md` coverage counts are stale (pre-existing documentation warning).
- `modules/vehicle/servis.js` and `build.js` exceed the source-size warning threshold.
- esbuild is unavailable in the environment; generated bundles are unminified and excluded from the patch.

## Exit interpretation
This checkpoint closes the residual canonical-writer sweep for the audited collection families. It does not by itself prove absence of all possible runtime defects in production.
