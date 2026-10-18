# AUDIT S2153 — Service Interval Registry Hardening

## Scope

Cumulative on baseline `app-main (23).zip` and the S2145–S2152 interval/reminder patches. This stage adds registry validation hardening and regression coverage without changing per-vehicle manual SOT precedence or inventing intervals for components without a verified rule.

## Changes

- `validateMaintenanceRuleRegistry()` now reports `invalidInterval` for explicitly supplied interval fields that are non-finite, zero/negative, or fractional. This prevents malformed values from being silently ignored when another valid axis exists.
- The validator reports duplicate checklist component identities as `duplicateCatalogId`.
- New tests cover malformed intervals (`0`, negative, fractional, `NaN`, `Infinity`), duplicate identities, current action/schedule integrity, and preservation of the S2152 Roller CVT 12,000 km inspection / 24,000 km replacement policy with manual replacement override.
- No automatic interval is synthesized for components whose policy is not explicit. The validator reports 52 checklist IDs without a KZR-specific rule, with 0 orphan rules, 0 malformed interval fields, 0 duplicate IDs, and 0 invalid/missing actions among defined rules. These 52 IDs are a separate model-specific coverage review list, not automatically classified as runtime bugs; they must not be assigned guessed replacement intervals.

## Verification

- Build: PASS, version `s2033-reset-interval-chain-audit-2569` (build v2569).
- Targeted interval and registry tests: 15/15 PASS.
- Full regression: 8,919 tests; 8,918 passed, 0 failed, 1 skipped; all 64 shards validated.
- Bundle freshness: PASS for `app-bundle-a.min.js` and `app-bundle-b.min.js`.
- Service SOT non-full-regression integrity checks: PASS. The full regression was run separately above; the skip flag on the gate was used only to avoid invoking it twice.

## Audit notes / remaining recommendations

- 102 service components are represented in the generated master data. The checklist and maintenance-rule registry have different coverage by design; components without a fixed rule must remain condition-based or explicitly policy-reviewed rather than receiving invented kilometre intervals.
- The legacy text-only scanner `scripts/audit-service-interval-conflicts-s2148.js` still reports 9 textual differences across 102 components. Several are expected independent axes (for example inspection 12,000 km vs replacement 24,000 km for Roller CVT) and should not be counted as substantive runtime bugs; the scanner needs action-axis awareness before it can serve as a strict zero-finding release gate. The remaining policy-review candidates include Ban Depan (master is marked `needsReview`) and interval mentions that lack a canonical axis.
- Build still reports the pre-existing stale coverage counts in `docs/AUDIT_MATRIX.md` and oversized source files (`modules/vehicle/servis.js`, `modules/shared/features-helpers-global-security.js`, `scripts/build.js`). These are maintainability warnings, not failures introduced by S2153.
- This audit verifies interval-registry shape, SOT precedence, build outputs, and the existing full regression suite. It is not a claim that every possible application defect is impossible.
