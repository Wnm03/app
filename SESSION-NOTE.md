# Session note — Modul 16 (lanjutan s373)

Lanjutan langsung dari s373 (Modul 15, Clear Field Mutation Gate,
`kw_release_sesi373_modul15-clear-field-mutation-gate_v1071.zip`), yang
saat itu menyimpulkan "SHOP FINAL — tidak ada Modul 16 yang diperlukan".

Instruksi user sesi ini: target eksplisit Modul 16 — tutup bypass di
`ShopDataIO.importShopJSON()` (`shop-data-io-api.js`) dan
`ImportShopExcel.commit()` target `'produsen'` (`cobek-io.js`), reuse gate
existing (`ProductRepository`/`SupplierStore`/`CategoryStore`), tidak
refactor besar, tidak buat roadmap/Modul 17.

## Verifikasi awal

Sebelum implementasi, kedua target dibaca langsung dari source ZIP v1071
(bukan diasumsikan benar dari instruksi) — **dikonfirmasi bypass VALID**:
`importShopJSON()` menulis `product[f]=src[f]` mentah + `D.products.push()`/
`D.produsen.push()` object literal mentah; `ImportShopExcel.commit()`
target `'produsen'` 0% gated (beda dari target `'etalase'` yang sudah
digate Modul 14/15). Artinya audit s373 yang menyimpulkan "SHOP FINAL"
melewatkan 2 titik ini.

## Yang dikerjakan

1. `shop-data-io-api.js` `importShopJSON()`: update produk existing +
   create produk baru + create produsen baru dialihkan ke
   `ProductRepository`/`SupplierStore` (guard typeof + fallback lama, pola
   PERSIS Modul 3-15).
2. `cobek-io.js` `ImportShopExcel.commit()` target `'produsen'`: update
   supplier (nama/kontak/catatan lewat `mutateUpdate()`, jarakKm+biayaPerKm
   lewat `mutateSetRoute()` — hanya saat keduanya terisi, sesuai kontrak
   all-or-nothing gate itu) + create supplier baru dialihkan ke
   `SupplierStore`.
3. Kasus partial-route (cuma salah satu kolom jarak/biaya terisi di file
   Excel) SENGAJA dibiarkan raw — di luar kontrak `mutateSetRoute()`,
   dicatat sbg known issue di `CHANGELOG-MODUL16.md` (bukan gate baru,
   supaya business logic partial-update lama tidak berubah).
4. Test baru: `tests/shop-jsonimport-produsenexcel-mutation-gate-mod16.test.js`
   (15 test: 9 utk `importShopJSON()`, 6 utk `ImportShopExcel.commit()`
   target produsen — termasuk rollback/fallback & backward-compat).
5. Test lama TIDAK disentuh — tetap PASS tanpa modifikasi (sandbox-nya
   tidak me-load `ProductRepository`/`SupplierStore`, jalur fallback
   otomatis aktif, perilaku identik).

## Regression & build

`npm test`: 2533/2535 pass. 2 gagal (`dashboard-hub-goto-subtab.test.js`)
dikonfirmasi PRE-EXISTING (identik baseline v1071 — modul dashboard-hub
tidak disentuh sesi ini).

`node scripts/build.js s373-modul16-shop-json-produsen-excel-mutation-gate`
— sukses, sintaks valid. `node scripts/verify-bundle-freshness.js` — segar.
Versi v1071 → v1072.

## Audit ulang setelah Modul 16

Grep pola assignment mentah field Product/Supplier di seluruh
`modules/shop/*.js` + `modules/business/*.js`, ditelusuri satu per satu:
**tidak ditemukan bypass lain**. Semua titik tersisa sudah digate atau
memang staging row (dipipa lewat `commitShopRows()` yang sudah gated).

## Status akhir

**SHOP FINAL (revisi atas kesimpulan s373).** Sesuai instruksi eksplisit
sesi ini: implementasi berhenti di Modul 16, TIDAK melanjutkan ke Modul 17,
TIDAK membuat roadmap. Known issue `mutateSetRoute()` partial-update
dicatat di `CHANGELOG-MODUL16.md` untuk sesi mendatang kalau user memilih
menutupnya (bukan Modul 17 otomatis — keputusan ada di user).
