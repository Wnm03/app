# S2034 P2 — Category / Component / Interval / Existing History

Cumulative on `app-main (25)`.

## Scope
- Lock Kelola Kategori Sparepart to `masterCategoryId -> serviceComponentId -> canonical component name`.
- Keep category interval KM/bulan as the editable reminder projection/override; do not silently overwrite it with master metadata.
- Add read-only audit for existing `D.servisLogs`.

## Changed files
- `modules/shared/modals.js`
- `modules/vehicle/sparepart-servis-ui.js`
- `modules/vehicle/service-category-component-history-audit-s2034.js`
- `scripts/build.js`
- `scripts/s2034-category-component-history-audit.js`
- `tests/service-category-component-history-audit-s2034.test.js`

## Existing history safety
Historical name and interval snapshots are facts from the time of service. S2034 only reports differences against the current category/master; it does not rewrite, delete, merge, or create history/finance/stock/evidence records.

## Backup audit
`node scripts/s2034-category-component-history-audit.js <backup.json> <report.md>`

## Verification
Targeted S2034 + existing category/interval/reconciliation/history tests: **65/65 PASS** on the focused S2034/category/interval/reconciliation/history suite.
