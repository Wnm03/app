# Session note s364 (Sesi 364) — Modul 6 Nested Attribute Mutation Gate

Lanjutan langsung dari patch s363 (Modul 5, attribute-mutation-gate) yang
diupload user (`kw_release_sesi363_modul5-attribute-mutation-gate_v1060.zip`
+ `CHANGELOG-MODUL5.md`/`FILES-CHANGED.md`/`s363-SESSION-NOTE.md`/
`MODUL5-ATTRIBUTE-MUTATION-GATE.diff`). Instruksi eksplisit user: implementasi
langsung pada FULL RELEASE, bukan audit ulang.

## Target sesi ini (dikonfirmasi instruksi user)

Selesaikan seluruh mutasi nested Product (termasuk object/map) sehingga
wajib lewat `ProductRepository` sbg SSOT. Fokus eksplisit disebut:
`hargaByProdusen`, seluruh nested object Product, seluruh mutasi
kategori/produsen yang masih bypass Repository, seluruh write langsung
terhadap nested map.

## Yang dikerjakan

1. **Audit lapangan** (bagian dari implementasi, hasil ditaruh langsung di
   `CHANGELOG-MODUL6.md` §"Audit awal") — grep `hargaByProdusen` ke seluruh
   `modules/`, dikonfirmasi manual titik TULIS vs BACA:
   - 3 titik TULIS ketemu: `cobek-order.js` `Produsen.saveHarga()` (set ATAU
     delete), `cobek-tx-cart.js` `applyTxShopStockFromTx()` (set-only),
     `cobek-etalase.js` `Etalase.save()` (set-only).
   - Sisanya (4 file) semua BACA, di luar scope.
   - `kategoriId`/`produsenId` di `cobek-tx-cart.js` `applyTxShopStockFromTx()`
     dikonfirmasi 3 titik assignment mentah tersisa (issue #1 tercatat sejak
     `CHANGELOG-MODUL5.md`).
2. **2 gate baru di `ProductRepository`** (`product-repository.js`, file
   yang sama dgn Modul 3/4/5, 100% additive):
   - `mutateSetHargaProdusen(product, produsenId, value)` — SET nested,
     reuse `validateTextValue()` (key) & `validatePriceValue()` (value) yang
     SUDAH ADA, 0 duplikasi validasi baru.
   - `mutateDeleteHargaProdusen(product, produsenId)` — DELETE nested,
     idempotent.
3. **7 titik mutasi dialihkan** ke gate di 3 file (`cobek-order.js`/
   `cobek-tx-cart.js`/`cobek-etalase.js`), semua pakai guard
   `typeof ProductRepository!=='undefined'` + fallback lama.
   `kategoriId`/`produsenId` di `cobek-tx-cart.js` memakai `mutateSetField()`
   YANG SUDAH ADA (Modul 5) — bukan gate baru, cuma wiring.
4. **1 edge-case dipertahankan raw dgn sengaja** — cabang
   `kategoriInput` whitespace-only di `cobek-tx-cart.js` (`resolveShopKategori()`
   balikin `''`, kode lama menimpa `kategoriId` jadi `''`; gate menolak
   string kosong by design — dipertahankan raw KHUSUS di kasus ini supaya 0
   perubahan perilaku, didokumentasikan inline).
5. **17 test baru** (`tests/product-repository-nested-mutation-gate-mod6.test.js`)
   — unit (create/update/overwrite/delete/idempotent/invalid-key/invalid-
   value/null/negatif-diklem/produk-invalid/rollback) + integrasi (3 file
   yang di-wire, termasuk fallback tanpa ProductRepository).
6. **0 test lama diubah** — beda dari Modul 5 yang mengubah 1 assert Modul 4;
   sesi ini tidak ada perilaku lama yang berubah status scope.

## Hasil verifikasi

- `npm test` penuh: **2411 test, 2409 pass, 2 gagal** — dikonfirmasi PERSIS
  2 kegagalan pre-existing yang sama dari baseline Modul 5
  (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi baru.**
- `node scripts/build.js`: sukses, versi naik **v1060 → v1061**.
- `node scripts/verify-bundle-freshness.js`: ✓ kedua bundle segar (hash
  source cocok).

## Yang SENGAJA tidak disentuh

1. Titik BACA `hargaByProdusen[...]` (`purchase-engine.js`/`cobek-order.js`
   render/`cobek-tx-cart.js` autofill/`business-intelligence-presenter.js`)
   — bukan mutasi.
2. `if(!p.hargaByProdusen)p.hargaByProdusen={}` di `backup-restore.js`/
   `features-helpers-global-security.js` — migrasi schema/init default,
   bukan tulis nilai ke map.
3. `kategoriId`/`produsenId` di object literal pembuatan produk BARU
   (`cobek-tx-cart.js`) — identitas produk baru, bukan mutasi existing.
4. Field `margin`/`barcode` — tetap belum ada sbg field skema (dicatat
   sejak Modul 5).

## Environment sandbox (sama seperti Modul 4/5)

- `esbuild`/`eslint` tidak terpasang (tidak ada akses jaringan di sandbox
  ini) — bundle hasil build TIDAK diminifikasi tapi 100% valid
  (`node --check` + `verify-bundle-freshness.js` ✓). Jalankan
  `npm install --save-dev esbuild eslint` di lingkungan dgn akses internet
  kalau minifikasi/lint penuh dibutuhkan sebelum deploy produksi.

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff di
`MODUL6-NESTED-MUTATION-GATE.diff`.

## Issue tersisa (Modul 7, kalau relevan)

Tidak ada nested mutation Product lain yang teridentifikasi — `hargaByProdusen`
adalah satu-satunya struktur object/map di skema Product saat ini. Kalau
skema Product menambah nested structure baru di masa depan, pola
`mutateSetHargaProdusen()`/`mutateDeleteHargaProdusen()` sesi ini bisa jadi
referensi/template gate baru.
