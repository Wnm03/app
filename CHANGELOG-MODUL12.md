# CHANGELOG — Modul 12 (Sesi 370): Product Delete Mutation Gate

Baseline: `kw_release_sesi369_modul11-produk-inline-create-txcart-mutation-gate_v1066.zip` (v1066)
Hasil: **v1067**

## Latar & audit

Lanjutan langsung Modul 3-11 (`ProductRepository`, `SupplierStore`,
`CategoryStore` — SSOT tulis domain Shop). Audit ulang sesi ini
(`grep 'D.products.push\|D.produsen.push\|D.products.splice\|D.produsen.splice'`
di seluruh `modules/shop/*.js`) menemukan status berikut:

| Titik mutasi mentah | File | Status |
|---|---|---|
| `Produsen.save()` create/update | `cobek-order.js` | Sudah digate (Modul 7) |
| `Etalase.onProdusenChange()` inline-create produsen | `cobek-etalase.js` | Sudah digate (Modul 10) |
| `onTxShopStockProdusenChange()` inline-create produsen | `cobek-tx-cart.js` | Sudah digate (Modul 10) |
| `Etalase.save()` create/update produk | `cobek-etalase.js` | Sudah digate (Tahap 6 / Modul 5-6) |
| `applyTxShopStockFromTx()` create produk inline | `cobek-tx-cart.js` | Sudah digate (Modul 11) |
| CSV import produk (create) | `cobek-io.js` | **MASIH bypass** — butuh desain tambahan (id-collision, lihat CHANGELOG-MODUL11 §Issue tersisa), TIDAK dipilih sesi ini |
| CSV import produsen (create+update) | `cobek-io.js` | **MASIH bypass** — sama alasan di atas, TIDAK dipilih sesi ini |
| **`Etalase.delete(i)` (`D.products.splice(i,1)`)** | `cobek-etalase.js` | **MASIH bypass, 0 gate tersedia** — **DIPILIH sesi ini** |

## Alasan memilih target

`Etalase.delete(i)` adalah **satu titik mutasi tunggal, terisolasi**, tanpa
masalah desain tambahan (bukan batch/concurrent seperti CSV import, bukan
butuh field baru seperti rute produsen di CSV). Instruksi sesi ini
mengizinkan membuat gate baru sekecil mungkin bila belum ada — beda dari
batasan Modul 11 ("reuse gate yang sudah ada" saja) yang membuat titik ini
sengaja dilewati sebelumnya. Dibanding CSV import (2 sub-kandidat, masing2
butuh keputusan desain: id-suffix override & field `jarakKm`/`biayaPerKm`
yang tidak ditangani `SupplierStore.mutateUpdate()`), `Etalase.delete(i)`
adalah wiring lurus dgn risiko regresi paling rendah — kandidat prioritas
tertinggi utk SATU modul kecil sesi ini.

## Yang dikerjakan

1. **1 method baru** (dibuat sekecil mungkin, sesuai instruksi sesi ini):
   `ProductRepository.mutateDelete(products, id)` — PURE, pola **SAMA
   PERSIS** `SupplierStore.mutateDelete(suppliers, id)` (Modul 7): validasi
   `products` harus array, `id` harus teks valid (reuse
   `validateTextValue()` yang sudah ada, 0 validator baru), balikin ARRAY
   BARU hasil `.filter()` (bukan splice in-place) — array input TIDAK
   dimutasi. Id tidak ketemu tetap `ok:true` (idempotent, sama perilaku
   `.filter()` native).

2. **1 titik mutasi dialihkan**: `Etalase.delete(i)` (`cobek-etalase.js`).
   Menggantikan `D.products.splice(i,1)` mentah dengan:
   - Ambil `p = D.products[i]` (produk di index yang mau dihapus).
   - Kalau `p` ada **dan** `ProductRepository` termuat: panggil
     `ProductRepository.mutateDelete(D.products, p.id)`, assign hasilnya
     balik ke `D.products` kalau `ok:true`, fallback raw splice kalau
     gate menolak (mestinya tidak pernah terjadi karena `p.id` sudah pasti
     valid, tapi fail-safe tetap disediakan).
   - Kalau `p` tidak ada (index basi) **atau** `ProductRepository` belum
     termuat: fallback `D.products.splice(i,1)` mentah — **PERSIS**
     perilaku lama, 0 perubahan pada kasus tepi ini.
   - Guard `typeof ProductRepository!=='undefined'` — pola SAMA PERSIS
     seluruh gate Modul 3-11 lain, karena `cobek-etalase.js` (GROUP_A)
     dimuat SEBELUM `product-repository.js` (GROUP_B) di `build.js` —
     guard runtime tetap wajib meski keduanya sama-sama ter-bundle
     akhirnya (dipakai persis sama di `Etalase.save()` sejak Tahap 6).

3. **Kenapa by-id, bukan by-index, di dalam gate**: `SupplierStore.
   mutateDelete()`/`CategoryStore.mutateDelete()` sudah-existing keduanya
   pakai `id` (bukan index array) sebagai kunci hapus — mengikuti pola yang
   sama supaya konsisten di seluruh domain Shop. Caller (`Etalase.delete`)
   tetap menerima `i` (index, tidak diubah — signature publik fungsi lama
   dipertahankan 100%, dipanggil dari `data-action` di HTML dgn index),
   lalu me-resolve ke `id` sebelum memanggil gate. Efek samping baik:
   kalau index sudah basi (list re-render di antara klik & konfirmasi),
   gate tetap menghapus produk yang BENAR (by-id) alih-alih produk lain di
   posisi index itu sekarang — TAPI perilaku ini hanya aktif kalau
   `p = D.products[i]` masih valid; kalau index sudah benar-benar di luar
   array (`p` undefined), fallback raw splice dipakai supaya 0 perubahan
   perilaku tepi dibanding sebelum Modul 12.

4. **8 test baru** (`tests/product-delete-mutation-gate-mod12.test.js`):
   - Unit (4): hapus by-id sukses (array baru, input tidak dimutasi), id
     tidak ketemu tetap `ok:true`, `products`/`id` tidak valid ->
     `ok:false`, hapus di tengah array (urutan sisanya tetap sama).
   - Integrasi (2): `Etalase.delete(i)` benar-benar memanggil
     `ProductRepository.mutateDelete()` (di-spy) & produk lain di array
     tidak berubah; `askConfirm()` `false` -> 0 perubahan (perilaku lama
     dipertahankan).
   - Fallback (1): tanpa `ProductRepository` termuat, splice by index
     PERSIS perilaku sebelum Modul 12.
   - Edge case (1): index basi (produk di index itu sudah tidak ada) ->
     fallback raw splice, 0 error, 0 perubahan array — SAMA PERSIS
     perilaku lama pada kasus tepi ini.

## Hasil verifikasi

- `node --test tests/*.test.js`: **2475 test, 2473 pass, 2 gagal** —
  dikonfirmasi PERSIS 2 kegagalan pre-existing yang sama
  (`dashHubNavigateToFeature`, tidak terkait Shop) dari baseline v1066.
  **0 regresi baru.** (Sebelum sesi ini: 2467 test, 2465 pass, 2 gagal
  sama; +8 test baru, semua pass.)
- `node scripts/build.js`: sukses, versi bundle numerik v1066 -> **v1067**.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).
- Perubahan terkonfirmasi masuk kedua bundle (grep penanda komentar
  "Modul 12": `app-bundle-a.min.js` 1 kemunculan [wiring
  `cobek-etalase.js`, GROUP_A], `app-bundle-b.min.js` 1 kemunculan [gate
  `product-repository.js`, GROUP_B]).

## Yang SENGAJA tidak disentuh

1. CSV import (`cobek-io.js`, produk & produsen) — TETAP tidak dipaksakan.
   Alasan teknis (id-collision batch create, field rute produsen yang
   tidak ditangani `SupplierStore.mutateUpdate()`) tidak berubah dari
   audit Modul 11, lihat `CHANGELOG-MODUL11.md` §Issue tersisa untuk
   detail lengkap.
2. Signature publik `Etalase.delete(i)` — TETAP menerima index (dipanggil
   dari `data-action` di HTML template), 0 perubahan kontrak pemanggilan.
3. Efek samping lain di sekitar delete (`renderList()`, `toast()`,
   `save()`) — 0 perubahan urutan/logic, hanya baris mutasi array yang
   diganti.
4. `mutateDelete()` **TIDAK** dipanggil dari titik lain manapun (mis. CSV
   import/kasir) — scope sesi ini murni `Etalase.delete(i)`.

## Environment sandbox

Sama seperti Modul 3-11: `esbuild`/`eslint` tidak terpasang (tidak ada
akses jaringan) — bundle hasil build TIDAK diminifikasi tapi 100% valid
(`node --check` + `verify-bundle-freshness.js` lolos).

## Issue tersisa (domain Shop belum 100% tertutup)

Domain Shop **masih belum 100% tertutup**. Kandidat tersisa untuk sesi
berikutnya (kalau user eksplisit minta lanjut, TIDAK dikerjakan/dirancang
sesi ini):

1. **CSV import** (`cobek-io.js`) — 2 sub-modul terpisah (create-produk vs
   create+update-produsen), masing2 butuh desain tambahan (lihat
   CHANGELOG-MODUL11.md §Issue tersisa untuk detail teknis lengkap yang
   masih berlaku).

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 13 yang
dibuat/dikerjakan sesi ini.**
