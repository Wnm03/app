# Session note s368 (Sesi 368) — Modul 10 Produsen Inline-Create Mutation Gate

Lanjutan langsung dari patch s367 (Modul 9, weight-bulk-mutation-gate)
yang diupload user (`kw_release_sesi367_modul9-weight-bulk-mutation-
gate_v1064.zip` + `CHANGELOG-MODUL9.md`/`FILES-CHANGED.md`/
`s367-SESSION-NOTE.md`/`MODUL9-WEIGHT-BULK-MUTATION-GATE.diff`). Instruksi
user sesi ini: gunakan FULL RELEASE ZIP v1064 sebagai baseline, lanjutkan
peningkatan arsitektur HANYA kalau masih ada mutation point nyata yang
belum SSOT, jangan buat modul baru kalau tidak ada kebutuhan teknis
jelas; audit domain Shop (direct write `D.*`, bypass Repository/Store/
Mutation Gate, validasi tersebar, nested mutation tanpa gate); kalau ada
SATU kandidat layak kerjakan itu saja lalu berhenti; kalau tidak ada,
buat laporan akhir (bukan modul baru).

## Audit & pemilihan target (dikerjakan sesi ini)

Baseline v1064 (hasil Modul 9) sudah menutup: stock, create/update
produk lewat form Etalase, atribut fisik (termasuk `beratPerUnit`,
Modul 9), supplier CRUD lewat form Produsen, kategori. Session note
Modul 9 mencatat 3 sisa bypass (CSV import create, inline produsen saat
form Etalase/Transaksi, inline produk saat form Transaksi) tapi menolak
menjadikannya satu modul karena "scope 4+ file, pola tidak seragam".

Audit ulang sesi ini memecah 3 sisa itu lebih detail: **inline-create
produsen** (prompt "Produsen Baru" di dropdown) ternyata kode-nya SAMA
PERSIS byte-for-byte di 2 file (`cobek-etalase.js` `Etalase.
onProdusenChange()` dan `cobek-tx-cart.js`
`onTxShopStockProdusenChange()`) — jelas hasil copy-paste sejak
pemecahan `cobek.js` lama. Ini SATU pola terisolasi (bukan 2 pola beda
di 2 file), dengan gate yang SUDAH ADA & battle-tested
(`SupplierStore.mutateCreate()`, Modul 7, dipakai `Produsen.save()`) dan
`id` generator SAMA PERSIS literal lama (`'prd_'+Date.now()`) — 0 risiko
perubahan perilaku. Dipilih sebagai Modul 10.

CSV import (`shop-data-io-api.js`/`cobek-io.js`) dan inline-create
produk saat form Transaksi (fungsi lain di `cobek-tx-cart.js`) TETAP
TIDAK dipaksakan — pola beda-beda per file, campur create+update,
bukan satu titik terisolasi seperti kandidat yang dipilih. Lihat detail
di `CHANGELOG-MODUL10.md` §"Issue tersisa".

## Yang dikerjakan

1. **0 method baru** — sesi ini murni WIRING 2 fungsi ke gate yang SUDAH
   ADA (`SupplierStore.mutateCreate()`, Modul 7) ke 2 titik yang belum
   memakainya.
2. **2 titik mutasi dialihkan**: `Etalase.onProdusenChange()`
   (`cobek-etalase.js`) & `onTxShopStockProdusenChange()`
   (`cobek-tx-cart.js`), keduanya guard `typeof SupplierStore!==
   'undefined'` + fallback raw PERSIS literal lama.
3. **Validasi nama wajib isi TETAP di caller** — UX guard lama, bukan
   business logic gate, tidak berubah. Mekanisme `D.produsen.push(np)`
   juga TETAP di caller (Store PURE, sama keputusan Tahap 6).
4. **7 test baru** (`tests/produsen-inline-create-mutation-gate-mod10.
   test.js`) — integrasi (gate benar-benar dipanggil, produsen lain
   tidak ikut berubah) + fallback tanpa `SupplierStore` + guard lama
   (prompt kosong/batal, gate 0 kali dipanggil).
5. **0 test lama diubah**.

## Hasil verifikasi

- `npm test` penuh: **2460 test, 2458 pass, 2 gagal** — dikonfirmasi
  PERSIS 2 kegagalan pre-existing yang sama dari baseline Modul 9
  (`dashHubNavigateToFeature`, tidak terkait Shop). **0 regresi baru.**
- `node scripts/build.js`: sukses, `APP_BUILD_VERSION` s391 -> s392,
  versi bundle numerik v1064 -> v1065.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).
- Perubahan terkonfirmasi masuk `app-bundle-a.min.js` (grep penanda
  komentar "Modul 10 — inline", 2 kemunculan).

## Yang SENGAJA tidak disentuh

1. Validasi nama wajib isi & mekanisme push+save di caller — bukan
   business logic gate ini.
2. `restock()`/`receiveGoods()`/`WeightBulkWidget` — sudah digate
   sesi-sesi sebelumnya (Modul lama/Modul 9).
3. Create produk/produsen dari CSV import (`shop-data-io-api.js`/
   `cobek-io.js`) — bypass SSOT juga, TAPI scope besar & pola tidak
   seragam, di luar "satu modul" sesi ini.
4. Create produk baru inline saat isi form Transaksi
   (`cobek-tx-cart.js`, fungsi berbeda) — pola beda, di luar scope.

## Environment sandbox (sama seperti Modul 3-9)

`esbuild`/`eslint` tidak terpasang (tidak ada akses jaringan di sandbox
ini) — bundle hasil build TIDAK diminifikasi tapi 100% valid (`node
--check` + `verify-bundle-freshness.js` lolos).

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff
di `MODUL10-PRODUSEN-INLINE-CREATE-MUTATION-GATE.diff`.

## Issue tersisa

Domain Shop **BELUM 100% tertutup**. Titik create `D.products`/
`D.produsen` dari CSV import (2 file, pola row-mapping vs form berbeda,
branch update JUGA bypass) dan inline-create produk saat form Transaksi
(pola field dari cart) adalah kandidat paling masuk akal untuk sesi
berikutnya kalau user meminta lanjut — TIDAK dikerjakan/dirancang sesi
ini karena scope-nya lebih besar dari "satu modul terisolasi".

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 11 yang
dibuat/dikerjakan sesi ini.**
