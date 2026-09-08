# PATCH s756 — Fix bundle basi: Jenis BBM tidak sync ke Harga per Liter

## Isi patch
Patch ini HANYA berisi file yang berubah karena `node scripts/build.js`
dijalankan ulang (rebuild bundle produksi). TIDAK ADA perubahan logika baru
— source logic (`fuel-price-ref.js`, `car-notes.js`, dst.) sudah benar
sejak Sesi 755, cuma bundle produksinya yang belum pernah di-rebuild.
Detail root cause & analisis lengkap ada di
`SESSION-NOTE-S756-bundle-staleness-fuel-jenis-sync.md` di dalam patch ini.

File yang diganti (12):
- `app-bundle-a.min.js` — rebuild, sekarang berisi
  `FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId)`
  (versi lama tanpa `curVehicleId`)
- `app-bundle-b.min.js` — rebuild (idem)
- `index.html` — `?v=` dinaikkan ke 1625 (cache-bust)
- `app_production.html` — `?v=` dinaikkan ke 1625 (cache-bust)
- `sw.js` — `CACHE_NAME` dinaikkan ke `kw-cache-v1625` (cache-bust PWA)
- `chat-action-handlers.js` — bump konstanta versi saja (otomatis oleh
  build.js, tanpa perubahan logika)
- `modules/shared/modals.js` — bump konstanta versi saja
- `modules/shared/modules-calc.js` — bump konstanta versi saja
- `modules/shared/modules-render.js` — bump konstanta versi saja
- `modules/shared/features-helpers-global-security.js` — bump konstanta
  versi saja
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
  (dokumentasi, tanpa dampak fungsional)

## Cara apply
Timpa (overwrite) 12 file di atas pada lokasi yang sama persis di repo/
hosting kamu (`wnm03.github.io/app/`), pertahankan struktur folder
(`modules/shared/...`, `docs/...`). Upload SEMUA file di atas sekaligus —
jangan cuma `index.html`/`sw.js`, karena inti fix-nya ada di kedua bundle
`.js`.

## Verifikasi setelah apply
```
node scripts/verify-bundle-freshness.js
```
Harus menghasilkan "✓ kedua bundle segar". Lalu di browser: hard-refresh
(atau clear PWA cache) supaya `sw.js` versi baru terpasang, baru tes ulang
modal "Catat Isi BBM" — ganti Jenis BBM harus langsung meng-update Harga
per Liter & (kalau Total Biaya sudah diisi) Volume BBM.
