# S2172 — Service Conflict Evidence Audit

S2172 is a read-only evidence report over unresolved service history rows, duplicated category IDs, and root-vs-checklist action conflicts. It intentionally makes no data changes and does not turn a candidate into an authorized migration.

## Actual uploaded backup and S2171 migrated copy

The uploaded source backup hash remains `4d73853b57b0df1d22e218dce839440cef210e3877b7d751d6dd4a0ecedcfb31`.

| Measurement | Original backup | S2171 migrated copy |
|---|---:|---:|
| Vehicles | 5 | 5 |
| Service history rows | 110 | 110 |
| Unresolved canonical history rows | 20 | 15 |
| Root-vs-checklist action conflicts | 22 | 22 |
| Duplicated category IDs in category table | 29 | 29 |
| Automatic changes made by S2172 | 0 | 0 |

The 29 duplicated category IDs are duplicates in the full category table, not necessarily 29 service-log references; findings can overlap. S2170 had identified 11 history rows with cross-vehicle category references, 11 rows referencing duplicate category IDs, and 22 action-authority conflicts.

## Important findings

- The five reviewed Slidepiece mappings applied by S2171 reduced unresolved rows from 20 to 15 in the separate migrated copy.
- The remaining 15 unresolved rows include legacy labels with no canonical identity, missing component identifiers, and multi-component service sessions where the root history row cannot safely be assigned to a single component.
- 19 action conflicts have a single checklist row and one checklist action; these are candidates for review of a stale root action, not permission to auto-rewrite it. Three conflicts involve multiple actions/rows and require manual review.
- A duplicated or cross-vehicle category reference is a hard stop for category-based identity repair.

## Rules

- A duplicated `categoryId` or cross-vehicle category match blocks automatic identity repair.
- Checklist identity can be presented as a candidate only when exactly one component/master pair is present; even then a multi-component service session requires human confirmation before root history identity is changed.
- Per-component checklist actions remain authoritative for that component. A stale root action is not automatically rewritten, even for a single checklist row.
- The original input SHA-256 is captured and rechecked; report generation is read-only.

## Run

```bash
node scripts/s2172-service-conflict-evidence-audit.js backup.json report-s2172.json
```

## Status

This phase improves row-level traceability. It does not clear unresolved identities or category/action conflicts by itself. S2171 migration copy remains separate from the original backup. App-wide build/full-suite completion is not claimed for S2172 because only diagnostic script, tests, and documentation were changed.
