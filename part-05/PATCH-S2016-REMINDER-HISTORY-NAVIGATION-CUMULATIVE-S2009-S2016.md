# PATCH S2016 — Cumulative S2009–S2016

## Scope

Menutup bug navigasi `Pengingat → 📜 Riwayat` yang ditemukan pada screenshot: tab Riwayat
terbuka tetapi filter komponen hilang dan histori menjadi `Semua komponen`.

Patch ini **mengakumulasi seluruh file patch S2015 yang sudah ada** dan menambahkan perubahan
S2016. Tidak ada file sesi S2009–S2015 yang dihapus dari archive patch.

## Changed / added for S2016

- `modules/vehicle/servis.js`
  - Reminder history navigation menjadi component-scoped lintas sesi
  - canonical component resolver untuk History
  - normalized vehicle identity
  - reset view-state filter saat modal dibuka
- `tests/service-component-reminder-history-regression-s2012.test.js`
  - diselaraskan dengan kontrak S2016
- `tests/service-reminder-history-navigation-s2016.test.js`
  - behavioral regression baru
- `app-bundle-b.min.js`
  - bundle produksi berisi fix S2016
- `index.html`
  - asset query/cache version dinaikkan ke 2016
- `app_production.html`
  - asset query/cache version dinaikkan ke 2016
- `sw.js`
  - cache `kw-cache-v2016`
- `AUDIT-S2016-REMINDER-HISTORY-NAVIGATION-CUMULATIVE.md`
  - audit dan kontrak fix

## Previous S2009–S2015 files

Seluruh isi archive patch S2015 dipertahankan, termasuk:

- S2014 vehicle-scope/dedupe regression
- S2015 compatibility/dedupe hardening
- S2014 compatibility shim
- S2015 module
- S2013/S2014/S2015 audit documents
- existing production bundles
- existing HTML/service-worker files
- existing tests dan helper yang memang sudah ada di patch S2015

## Data safety

Tidak ada ID histori, transaksi, finance, stock, atau record servis yang dihapus.
S2016 hanya memperbaiki view-state/navigation dan projection read-only.

## Validation

- S2014: PASS
- S2015: PASS
- S2012/S2013 historical regression: PASS
- S2016 focused regression: PASS
- combined focused run: 13/13 PASS
- bundle freshness: PASS
- bundle syntax: PASS

Not claimed: full application suite baru.
