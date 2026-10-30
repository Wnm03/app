# AUDIT S2253 — Bundle-B Lazy Residency

## Scope
Membuktikan cluster scanner/import/OCR vehicle catalog dapat dipindahkan dari startup Bundle-B ke loading on-demand tanpa mengubah SOT, persistence, database schema, atau business logic.

## Implementasi
14 source dipertahankan sebagai file runtime tetapi dikeluarkan dari `GROUP_B` dan dimuat berurutan oleh `modules/shared/feature-lazy-loader.js` melalui `_loadScriptOnce()` ketika `VehicleCatalogUI.catalogUiOpen()` dipanggil.

Cluster:
- vehicle scanner
- sparepart scanner + UI
- sparepart OCR + parser + catalog detail/add/link/orchestrator
- vehicle catalog PDF import + UI + stock push
- vehicle catalog web import + UI

## Ukuran
- Sebelum: raw GROUP_B = 5,382,370 byte.
- Setelah: raw GROUP_B = 5,205,910 byte.
- Pengurangan: 176,460 byte (~3.28%).
- Source cluster tetap tersedia 14/14.

## Safety contract
- Loading sequential, bukan paralel, karena modul legacy berbagi global/window namespace.
- `_loadScriptOnce()` dipakai kembali; tidak ada `eval()` atau `import()` dinamis.
- Failure me-reset promise sehingga retry pada pembukaan katalog berikutnya tetap mungkin.
- `catalogUiOpen()` menunggu loader sebelum user dapat memakai tombol Scan/Import.
- Tidak ada perubahan SOT/persistence/event/outbox/DB schema.

## Tidak disentuh
Honda PDF import standalone tidak dipindahkan pada sesi ini karena tidak ditemukan entry point runtime yang cukup kuat untuk membuktikan residency aman. Ia tetap di GROUP_B sampai ada consumer/trigger proof tersendiri.

## Gate
`tests/s2253-vehicle-catalog-lazy-residency.test.js`: 2/2 PASS.
Node syntax checks: PASS.
Build dengan versi tetap 2206: PASS; esbuild belum tersedia sehingga artifact masih fallback non-minified.
