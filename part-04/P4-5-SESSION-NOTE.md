# S2152 P4.5 — Zero Direct Write / Runtime Stock Authority

Scope:
- Close remaining runtime fallback writes to `D.partsStock`.
- Keep `D.partsStock` as the only storage owner; `StockCommandSOT` is the mutation gateway.
- Preserve UI/layout and existing data model.
- Keep self-test fixtures allowed to seed/reset their isolated test state directly.

Closed paths:
- Finance stock purchase/revert helpers.
- Finance transaction/service snapshot rollback.
- Service-session recovery and mutation rollback.
- Service usage/revert/replace and reminder auto-ganti stock mutation.
- Sparepart CRUD create/update/delete/bulk-delete/catalog sync.
- Part archive/restore and stock-modal post-save mutations.
- Vehicle-catalog import initial stock quantity.
- Data-health negative-stock correction.
- CSV import rollback.
- Chat service rollback.
- Stock bootstrap initialization now goes through `StockCommandSOT.ensureStorage()`.

Architecture:
- No second stock store introduced.
- `D.partsStock` remains storage owner.
- No UI rearrangement.

Validation target:
- P4.5 static zero-direct-write gates.
- P4.1/P4.2/P4.3/P4.4 focused tests.
- Syntax/build verification.
- Service-SOT gate must be reported honestly if transport/runtime timeout persists.
