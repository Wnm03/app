# S595 — Merge + Build Note (repair-orphans + majoris-renov-reconcile)

ZIP ini adalah gabungan **sudah di-build** dari 2 patch S595 yang
tadinya terpisah:

1. `PATCH-s595-titipan-reconcile-repair-orphans.zip` —
   `TitipanReconcile.repairOrphans()` + tombol perbaikan gap orphan.
2. `PATCH-s595-titipan-majoris-renov-reconcile-WIP.zip` —
   Pengeluaran Majoris (dari transaksi Renov) + Sisa Saldo Majoris
   Belum Terpotong. (Sebelumnya dikirim source-only/pre-build.)

Tidak ada bentrok path sama sekali di antara kedua patch aslinya.
Kedua source-nya digabung ke satu working copy penuh, lalu:

## Hasil verifikasi
- `node --test tests/*.test.js` → **4167/4167 PASS, 0 fail**
  (seluruh suite proyek, bukan cuma file yang berubah).
- `node scripts/verify-window-expose.js` → OK (73 modul data-action,
  semua ter-window-expose).
- `node scripts/build.js` → **BERHASIL**, sintaks kedua bundle valid
  (`node --check` lolos), versi disinkronkan otomatis ke **1325**
  (label internal: `s586-9-preexisting-test-failures-closeout` — ini
  penomoran versi build.js sendiri, BUKAN nomor sesi `s595`; tetap
  konsisten dgn skema versi berjalan).

## ⚠️ Satu catatan penting: bundle TIDAK terminifikasi
Environment build ini **tidak punya akses internet** untuk
`npm install esbuild`, jadi `build.js` otomatis fallback ke mode
"gabungan mentah tanpa minifikasi" (perilaku resmi & aman — dicetak
jelas oleh build.js sendiri, bukan error diam-diam):

- `app-bundle-a.min.js`: 1278.6 KB (belum diminify)
- `app-bundle-b.min.js`: 3267.8 KB (belum diminify)

Bundle ini **100% valid dan aman dipakai/di-deploy** — hanya lebih
besar ukurannya dibanding build produksi biasa yang pakai esbuild.
Kalau O mau ukuran seminim versi produksi sebelumnya, jalankan sekali
di environment lokal yang ada internet:

```
npm install --save-dev esbuild
npm run build
```

lalu timpa `app-bundle-a.min.js` / `app-bundle-b.min.js` di ZIP ini
dengan hasilnya (versi/label build TIDAK perlu diubah lagi, cukup
bundle-nya saja).

## File yang berubah di ZIP ini
- `modules/finance/dana-titipan-aggregation-api.js`
- `modules/finance/dana-titipan-portfolio-render.js`
- `modules/finance/titipan-reconcile.js`
- `modules/shared/modals.js`
- `modules/shared/features-helpers-global-security.js`
- `modules/shared/modules-render.js`
- `modules/shared/modules-calc.js`
- `chat-action-handlers.js`
- `self-test.js`
- `index.html`, `app_production.html`, `sw.js` (versi ?v=1325 / cache
  `kw-cache-v1325`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild, unminified)
- `tests/titipan-reconcile.test.js`
- `tests/s595-titipan-majoris-renov-reconcile.test.js`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerated)
