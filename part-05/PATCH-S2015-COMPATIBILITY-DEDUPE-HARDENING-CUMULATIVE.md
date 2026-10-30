# PATCH S2015 — Cumulative S2009–S2015

## Purpose

Hardening lanjutan dari S2014 untuk menutup gap vehicle compatibility,
model compatibility, safe dedupe, stale duplicate recovery, dan konsistensi
consumer katalog/stok/rekomendasi.

## Changed files

- `modules/vehicle/service-reminder-vehicle-scope-s2015.js`
  - shared vehicle/model compatibility resolver
  - VehicleCatalog.filterForVehicle bridge
  - VehicleCatalog.recommend bridge
  - Sparepart.isPartForVehicle bridge
  - canonical vehicle-aware service-category resolver
  - compatibility-safe persisted dedupe
  - stale S2014 marker recovery
- `modules/vehicle/service-reminder-vehicle-scope-s2014.js`
  - compatibility shim only; production HTML no longer loads this file
- `tests/service-reminder-vehicle-scope-s2015.test.js`
  - new regression matrix
- `tests/service-reminder-vehicle-scope-s2014.test.js`
  - historical regression now executes against cumulative S2015 implementation
- `index.html`
  - production patch query/version → 2015
  - production entry → S2015 module
- `app_production.html`
  - same wiring as `index.html`
- `sw.js`
  - cache `kw-cache-v2015`
  - S2015 module in precache
- `AUDIT-S2015-COMPATIBILITY-DEDUPE-HARDENING-CUMULATIVE.md`
  - implementation/audit record

## Validation

PASS:

- JavaScript syntax for S2015 module/shim/test
- S2014 historical regression test
- S2015 compatibility/dedupe regression test
- HTML S2015 wiring in `index.html`
- HTML S2015 wiring in `app_production.html`
- service-worker S2015 precache wiring

Not claimed:

- full application suite, because this cumulative patch archive does not
  contain the repository's complete test-helper tree.

## Data safety

No service history ID, transaction ID, finance record, or stock record is
physically deleted. Persisted duplicate suppression is now conservative and
only occurs when equivalence is provable.
