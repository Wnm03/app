# Session note s372 (Sesi 372) — Modul 14 Import Excel Product Mutation Gate

Lanjutan langsung dari patch s371 (Modul 13, csv-import-product-mutation-gate)
yang diupload user
(`kw_release_sesi371_modul13-csv-import-product-mutation-gate_v1068.zip`
+ `CHANGELOG-MODUL13.md`/`FILES-CHANGED.md`/`s371-SESSION-NOTE.md`/
`MODUL13-CSV-IMPORT-PRODUCT-MUTATION-GATE.diff`). Instruksi user sesi
ini: target SUDAH ditentukan eksplisit — `ImportShopExcel.commit()`
(`modules/shop/cobek-io.js`), jalur Import Excel (`.xlsx`) yang masih
bypass SSOT. Kerjakan langsung di source ZIP FULL RELEASE, jangan
refactor besar/ubah business logic, reuse `ProductRepository` yang sudah
ada, gunakan `createProduct()`+`saveProduct()`, pertahankan format id +
kompatibilitas data lama + fallback bila `ProductRepository` belum
dimuat, jangan sentuh modul lain, test lengkap + build + verifikasi
bundle + ZIP baru, berhenti setelah Modul 14.

## Audit singkat (titik mutasi)

Grep `D.products.push` di `modules/shop/cobek-io.js` mengonfirmasi
persis 1 titik yang masih bypass: cabang `else` (create produk baru,
target `'etalase'`) di `ImportShopExcel.commit()`, baris 552 (baseline
v1068) — object literal mentah, TIDAK lewat `ProductRepository`. Cabang
UPDATE produk existing di fungsi yang sama SUDAH memakai
`ProductRepository.mutateSetStock()/mutateSetPrice()/mutateSetDiskon()/
mutateSetField()` sejak Modul 3-5 (tidak diubah). Target `'produsen'`
(`D.produsen.push()`) sengaja TIDAK disentuh — skema `Produsen` belum
punya Repository sendiri, di luar cakupan `ProductRepository`.

Menarik: komentar di `shop-data-io-api.js` (ditulis sesi Modul 13) sudah
lebih dulu menyebut *"ImportShopExcel.commit() cabang .xlsx"* sebagai
salah satu pemakai `createProduct()`/`saveProduct()` — sebenarnya itu
referensi mendahului kondisi aktual (kode `cobek-io.js` baru benar-benar
menutup celah itu di sesi ini). Setelah patch Modul 14, komentar tsb jadi
akurat 100%.

## Id-collision — TIDAK ADA analisa baru diperlukan

Pola id lokal (`'prod_'+Date.now()+'_'+uid()`, `uid()` counter monotonic)
SUDAH dianalisa & dikonfirmasi aman di sesi Modul 13 — Modul 14 pakai
generator LOKAL yang PERSIS SAMA (bukan `ProductRepository._genId()`),
jadi kesimpulan itu berlaku identik di sini, tidak perlu diulang.

## Yang dikerjakan

1. **0 method/validator baru** di `ProductRepository` — murni WIRING ke
   `createProduct()`+`saveProduct()` (Tahap 4) yang sudah ada, pola
   PERSIS SAMA dgn `shop-data-io-api.js` (Modul 13).
2. **1 titik mutasi dialihkan**: create produk baru (target `'etalase'`)
   di `ImportShopExcel.commit()` (`modules/shop/cobek-io.js`), guard
   `typeof ProductRepository!=='undefined'` + fallback fail-safe 2 lapis
   (createProduct gagal → raw push; saveProduct gagal → push
   `newProduct` langsung) + fallback tanpa `ProductRepository` sama
   sekali (semua PERSIS pola Modul 13).
3. **0 perubahan business logic** — field yang ditulis SAMA PERSIS
   dengan object literal lama; default field baru (beratPerUnit/panjang/
   lebar/tinggi/ownership) otomatis terisi via `createProduct()`.
4. **0 perubahan format id/skema data** — id lokal, shape produk
   (`hargaByProdusen: {}` dst.) tidak berubah.
5. **Test baru**: `tests/import-shop-excel-create-mutation-gate-mod14.test.js`
   — 14 test (lihat `CHANGELOG-MODUL14.md` §Yang dikerjakan poin 6 utk
   rincian per kategori).
6. **Full regression**: 2508 test, 2506 pass, 2 fail — kedua kegagalan
   di `tests/dashboard-hub-goto-subtab.test.js` (timing/`setTimeout`,
   modul `dashboard-hub.js`, tidak berkaitan sama sekali dgn
   `cobek-io.js`/`ProductRepository`; gagal identik saat dijalankan
   sendiri berulang kali — pre-existing flaky test, BUKAN regresi dari
   patch sesi ini). Sesuai instruksi ("jangan menyentuh modul di luar
   scope Import Excel"), tidak disentuh/diperbaiki.
7. **Build**: `node scripts/build.js
   s372-import-shop-excel-product-mutation-gate-modul14` — sukses,
   sintaks bundle valid, versi numerik 1068 → **1069**.
8. **Verifikasi bundle freshness**: `node scripts/verify-bundle-freshness.js`
   — kedua bundle segar, hash source cocok.
9. Dokumen: `CHANGELOG-MODUL14.md`, `FILES-CHANGED.md`,
   `s372-SESSION-NOTE.md` (file ini), `FINAL-DIFF.patch`.
10. Paket: `kw_release_sesi372_modul14-import-shop-excel-product-mutation-gate_v1069.zip`.

## Berhenti sesuai instruksi

Modul 14 selesai — **TIDAK lanjut ke Modul 15**. Kalau ada titik bypass
lain (mis. target `'produsen'` di `ImportShopExcel`, atau jalur lain di
luar `modules/shop/`/`modules/business/` yang belum pernah diaudit),
belum ditelusuri sesi ini — dicatat sbg issue tersisa di
`CHANGELOG-MODUL14.md`, bukan dikerjakan.
