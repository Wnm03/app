# S2170 — Backup reconciliation preview and regression gate

## Scope
Read-only diagnostic layer over S2161's canonical identity audit. It adds per-history-row findings for cross-vehicle category references, duplicate category IDs, contradictory action authority, and invalid/missing odometer/date deadline evidence. It does not edit or migrate backup data.

## Actual backup inspected
Input: `backup-keluarga-W-2026-10-18.json` (read-only).
- 5 vehicles; 110 service history rows; 244 sparepart category rows.
- 20 history rows remain unresolved by deterministic canonical identity mapping.
- 44 row-level findings: 22 BLOCK and 22 REVIEW.
- Findings by kind: 11 cross-vehicle category references, 11 duplicate category-ID references, and 22 root/checklist action conflicts. Categories can overlap; these are finding counts, not unique root causes.
- Input SHA-256 before and after the scan is identical; no automatic writes occurred.

## Interpretation
Duplicate category IDs make some category references ambiguous even if a local category appears to exist. A reference that may resolve to a different vehicle must not be rewritten by guessing. S2169 continues to make ambiguous checklist action selection fail-closed. Missing identity/interval values are review-only until canonical evidence can prove the correct component and action.

## Verification
- S2170 preview tests: 2/2 pass (read-only input, cross-vehicle reference, ambiguous action review-only).
- Targeted service/reminder regression chain including S2005, S2145, S2148, S2150, S2152, S2168, S2169, S2170: 29/29 pass.
- Build: PASS, release version `2579`; bundle syntax, index/production HTML, service-worker cache synchronized.
- `verify-bundle-freshness.js`: PASS.
- `verify-window-expose.js`: PASS (83 modules).
- `verify-patch-integrity.js`: PASS (87 apply files, 0 deletions in the existing release manifest).
- Full test suite rerun timed out in this execution environment and is not claimed as passing for S2170.

## Run preview yourself
`node scripts/s2170-service-backup-reconciliation-preview.js <backup.json> [report.json]`

The script is deliberately read-only. It emits row-level evidence and recommended next steps, not automatic corrections. Apply a separate migration only after a preview is reviewed and the correction is deterministic, idempotent, audited, and rollbackable.
