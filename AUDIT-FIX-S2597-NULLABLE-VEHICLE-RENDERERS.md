# S2597 — Nullable numeric rendering hardening (cumulative)

## Scope
- Preserves all files from PATCH-S2596 cumulative patch.
- Fixes service reminder rendering when remaining KM, current odometer, or effective last-service KM is absent or invalid.
- Shows `Interval belum ditetapkan` instead of formatting null/undefined as a number.
- Guards history baseline labels for null, undefined, empty, and non-finite values.
- Rejects malformed monthly fuel insight numeric payloads before formatting.
- Guards sparepart usage-history KM formatting.
- Adds source regression tests for these contracts.
- Rebuilds production bundles and aligns index.html, app_production.html and service worker cache to build 2597.

## Verification
- `npm run build`: PASS; both minified bundles pass `node --check`, HTML references and SW cache synchronized at 2597.
- Targeted regression selection: 20 tests passed, 0 failed.
- Full `npm test`: execution timed out at 120 seconds after reporting tests through #3404; no final suite summary was produced. Full-suite PASS is therefore NOT claimed.
- Build warnings remain for stale `docs/AUDIT_MATRIX.md` coverage counts and oversized source files; build itself succeeds.
