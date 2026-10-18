# S2149 — Rework Audit & Test Result

Date: 2026-10-18
Baseline: `app-main (23).zip`
Accumulated input overlay: `S2148-CUMULATIVE-INTERVAL-AUDIT-OVERLAY.zip`

## Applied in this rework

- Re-applied cumulative S2145–S2148 service interval files to the baseline tree.
- Fixed the concrete S2146 regression found during re-test: `filter-fuel-pump` now has independent structured axes `inspectKm: 12000` / `inspectAction: periksa` and `replaceKm: 48000` / `replaceAction: ganti`. Previously the 48,000 km replacement existed only in prose condition text, so the action-plan builder could not reliably emit a replacement schedule.
- Rebuilt generated service master and production bundles; build version is now 2562.
- Refreshed `MANIFEST-SHA256.txt` entries for tracked files.
- Added/retained regression tests for Slide Piece reset, Filter Fuel Pump dual interval, and S2148 interval-conflict audit.

## Verification

- `node --test` targeted service interval tests + generated-master checksum tests: **8/8 PASS**.
- `npm run build`: **PASS**, both production bundles syntax-checked by build; HTML files and service worker version synchronized at 2562.
- `node --check car-notes.js`, generated master, and both bundles: **PASS**.
- `node scripts/verify-bundle-freshness.js`: **PASS**.
- `SERVICE_SOT_SKIP_FULL_REGRESSION=1 node scripts/service-sot-integrity-gate.js`: **PASS** for the nine non-full-suite integrity checks. The gate was explicitly run with its full regression leg skipped.
- Full regression runner was attempted, but did **not** complete within the execution window. A first attempt surfaced and then fixed the stale generated-master checksum test; a second 64-shard attempt completed 32/64 shards (4,496 tests) with no failures among those completed shards, then timed out before all remaining shards completed. Therefore full-suite status is **INCOMPLETE**, not PASS.

## Remaining substantive issue — not silently papered over

The V-Belt CVT interval still has conflicting policy data: component master declares 32,000 km while the KZR 2012 note says inspection at 8,000 km and replacement at 24,000 km. The legacy maintenance registry uses 24,000 km, but the active per-vehicle interval SOT can override the rule axis. A global rewrite would be unsafe because it could change unrelated vehicle models and/or user-set manual intervals. Correct closure requires model/generation-scoped guideline resolution and a regression proving that manual SOT values remain authoritative. This is intentionally recorded as an open blocker; the audit cannot honestly claim zero substantive bugs yet.

## Audit interpretation

The S2148 text scanner reports nine interval mentions, but most are action-axis/notes differences rather than confirmed runtime bugs (for example Busi's inspection and replacement cadence). The V-Belt 8k/24k/32k conflict is the confirmed substantive policy conflict. `stel-grease-komstir` and `ban-belakang` also contain interval mentions without canonical interval values and require a policy decision before promotion into active SOT.

## Data safety

No user backup or live vehicle data was modified. Existing manual per-vehicle interval SOT was not rewritten. Do not deploy this build as “zero substantive bugs” until the V-Belt model-scope blocker is closed and full regression completes.
