# PATCH v1289 → v1290 (S558 — Fix teks hint "Kaitkan ke Aset Multi-Owner" hardcode "pemasukan")

Detail lengkap (root cause, fix, test): lihat `docs/BUG_REGISTRY.md` §
`BUG-S558-001`.

## Status
- **3947/3947 test PASS-or-baseline** (`node --test tests/*.test.js`) —
  3937 baseline PASS + 4 test baru
  (`tests/s558-tx-asset-hint-generic-copy.test.js`), tetap 6 fail
  pre-existing tidak terkait (`_ownerNominalText` investment-owners) — 0
  regresi.
- `node scripts/build.js s558-tx-asset-hint-generic-copy` dijalankan:
  `?v=` **1289 → 1290**, `CACHE_NAME` → `kw-cache-v1290`,
  `MODAL_VERSION` → `s558-...`. `app_production.html` sudah
  disinkronkan ulang dari `index.html`.
- Bundle unminified (esbuild tidak tersedia di sandbox ini) — sintaks
  lolos `node --check`, 100% valid dipakai.

## Apa yang berubah (logika)
Gap kosmetik dilaporkan user: teks hint di bawah dropdown "⚖️ Kaitkan
ke Aset Multi-Owner (opsional)" pada modal Tambah/Edit Transaksi selalu
berbunyi *"Kalau **pemasukan** ini terkait aset patungan..."*, padahal
blok ini sudah tampil & berfungsi untuk transaksi **Pengeluaran** juga
sejak patch akun-multi-owner-doublecount-datahealthcheck-restore
(perluasan dari S394 yang tadinya cuma untuk Pemasukan). Logic
split porsi sendiri sudah benar untuk kedua tipe — murni copy yang
belum diupdate.

- `modules/shared/modals.js` — div hint diberi `id="txAssetHint"`, dan
  default copy diubah jadi generik: *"Kalau **transaksi** ini terkait
  aset patungan..."* (fallback statis kalau JS belum sempat jalan).
- `modules/finance/transaksi.js` — fungsi baru `updateTxAssetHintText()`
  mengisi `textContent` `#txAssetHint` sesuai `curTxType` aktif
  ("pemasukan" untuk income, "pengeluaran" untuk expense), dipanggil
  dari `updateTxAssetWrapVisibility()` — sehingga otomatis ikut
  ter-refresh tiap ganti tipe transaksi (`setTxType()`) maupun tiap
  buka modal (`openTxModal()`/`editTx()`). 0 perubahan logic
  visibility/split porsi aset — murni sinkronisasi copy.

## File yang berubah
- `modules/shared/modals.js` — markup hint `#txAssetWrap`, `id`
  ditambahkan + default copy digenerikkan.
- `modules/finance/transaksi.js` — `updateTxAssetHintText()` baru +
  dipanggil dari `updateTxAssetWrapVisibility()`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang
  (source-of-truth yang benar-benar dijalankan browser).
- `index.html`, `app_production.html` — `?v=1289` → `?v=1290`.
- `sw.js` — `CACHE_NAME` → `kw-cache-v1290`.
- `docs/BUG_REGISTRY.md` — entri baru `BUG-S558-001`.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis dari `scripts/build.js`.
- `tests/s558-tx-asset-hint-generic-copy.test.js` — baru (4 test
  regresi).

## Cara pakai patch ini
Timpa file-file di atas ke lokasi yang sama di deployment v1289 kamu.
Upload SEMUA file yang berubah (bukan cuma HTML/sw.js) — bundle
(`app-bundle-a.min.js`/`app-bundle-b.min.js`) WAJIB ikut ter-upload
karena itu yang sebenarnya dijalankan browser.
