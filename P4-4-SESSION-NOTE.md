# S2152 P4.4 — Stock Recovery / Import / Bulk Write Authority

Build: s2041-1-part-sot-hardening-2163

Implemented:
- StockCommandSOT.remove
- StockCommandSOT.restoreRows
- StockCommandSOT.replaceSnapshot
- StockCommandSOT.setQtyMap
- Service-session recovery stock restore routed through StockCommandSOT when available
- Service-session mutation snapshot rollback routed through StockCommandSOT when available
- Finance service-edit stock snapshot rollback routed through StockCommandSOT when available
- Sparepart UI single delete and bulk delete routed through StockCommandSOT when available
- S2041 referenced-part bulk restore routed through StockCommandSOT when available
- Added P4.4 focused tests

Validation:
- P4.4 + P4.1 + P4.3 + S2047/S2048/S2049/S2050 focused suite: 28/28 PASS
- SOT integrity: PASS
- Architecture integrity: PASS
- Bundle freshness: PASS
- Bundle syntax: PASS
- Build: PASS, version 2163
- esbuild unavailable; bundles are valid but not minified
- Service-SOT gate: TIMEOUT / UNVERIFIED (runner did not complete within transport window)
- Existing P27 source/bundle contract tests were not used as a P4.4 PASS gate; their baseline contract mismatch predates this P4.4 change.

UI: no layout/rearrangement changes.
Storage: no second stock store introduced; D.partsStock remains storage owner behind command gateway.
