# Session note s370 (Sesi 370) — Modul 12 Product Delete Mutation Gate

Lanjutan langsung dari patch s369 (Modul 11, produk-inline-create-tx-cart-
mutation-gate) yang diupload user
(`kw_release_sesi369_modul11-produk-inline-create-txcart-mutation-gate_v1066.zip`
+ `CHANGELOG-MODUL11.md`/`FILES-CHANGED.md`/`s369-SESSION-NOTE.md`).
Instruksi user sesi ini: gunakan ZIP FULL RELEASE v1066 sebagai baseline,
kerjakan SATU sesi saja (Modul 12), audit seperlunya utk temukan SATU
bypass mutation prioritas tertinggi, implementasi langsung ke source,
reuse modul existing, jangan refactor besar/ubah business logic di luar
scope, semua perubahan additive & backward compatible, mutasi lewat
SSOT/gate existing bila memungkinkan — **kalau gate belum ada, buat
sekecil mungkin hanya utk kebutuhan sesi ini** (beda dari batasan Modul 11
yang mewajibkan reuse gate existing saja), berhenti setelah Modul 12,
jangan lanjut Modul 13/roadmap.

## Audit & pemilihan target

Baseline v1066 (hasil Modul 11) sudah menutup: stock, create/update produk
lewat form Etalase, atribut fisik, supplier CRUD, kategori, inline-create
produsen (2 titik, Modul 10), DAN inline-create produk baru saat form
Transaksi (Modul 11). Session note & changelog Modul 11 mencatat 2 sisa
kandidat: CSV import (`cobek-io.js`) & `Etalase.delete(i)` — keduanya
sengaja tidak dikerjakan Modul 11 karena masing2 di luar scope "reuse gate
existing" (CSV butuh desain id-collision, delete butuh method baru yang
sebelumnya tidak boleh dibuat).

Audit ulang sesi ini (grep `D.products.push`/`D.produsen.push`/
`D.products.splice`/`D.produsen.splice` di seluruh `modules/shop/*.js`)
mengonfirmasi status yang sama: hanya 3 titik yang masih bypass — CSV
import produk (create), CSV import produsen (create+update), dan
`Etalase.delete(i)`. Tidak ditemukan titik bypass baru.

**Dipilih**: `Etalase.delete(i)` (`cobek-etalase.js`) —
`D.products.splice(i,1)` mentah, satu titik mutasi TUNGGAL & terisolasi
(bukan batch/concurrent seperti CSV import, bukan butuh field tambahan
seperti rute produsen CSV). Sesi ini instruksi user secara eksplisit
mengizinkan membuat gate baru sekecil mungkin bila belum ada — jadi
batasan yang menahan Modul 11 tidak lagi berlaku, dan `Etalase.delete(i)`
menjadi kandidat wiring paling lurus dgn risiko regresi paling rendah.

**CSV import TETAP TIDAK dipilih** — alasan teknis dari audit Modul 11
(id-collision batch-create, field `jarakKm`/`biayaPerKm` yang tidak
ditangani `SupplierStore.mutateUpdate()`) tidak berubah; kedua sub-modul
itu tetap butuh desain tambahan, bukan wiring lurus 1-titik seperti yang
diminta sesi ini ("audit seperlunya, SATU target").

## Yang dikerjakan

1. **1 method baru** (diizinkan eksplisit sesi ini) —
   `ProductRepository.mutateDelete(products, id)`, PURE, pola SAMA PERSIS
   `SupplierStore.mutateDelete()` (Modul 7): validasi array + id (reuse
   `validateTextValue()` existing), balikin array baru hasil `.filter()`,
   idempotent (id tidak ketemu tetap `ok:true`).
2. **1 titik mutasi dialihkan**: `Etalase.delete(i)` — resolve index ke id
   produk, panggil gate, assign balik `D.products`. Guard
   `typeof ProductRepository!=='undefined'` + fallback raw splice utk 2
   kasus: gate belum termuat, ATAU index sudah basi (produk di index itu
   sudah tidak ada) — supaya 0 perubahan perilaku pada kasus tepi
   dibanding sebelum Modul 12.
3. **8 test baru**
   (`tests/product-delete-mutation-gate-mod12.test.js`) — unit gate (4:
   hapus sukses+input tidak dimutasi, id tidak ketemu, invalid input,
   hapus-di-tengah-array), integrasi (2: wiring benar2 lewat gate +
   askConfirm false = 0 perubahan), fallback tanpa gate (1), edge case
   index basi (1).

## Hasil verifikasi

- `npm test` penuh (`node --test tests/*.test.js`): **2475 test, 2473
  pass, 2 gagal** — dikonfirmasi PERSIS 2 kegagalan pre-existing yang sama
  dari baseline Modul 11 (`dashHubNavigateToFeature`, tidak terkait Shop).
  **0 regresi baru.** (Sebelum sesi ini: 2467 test, 2465 pass, 2 gagal
  sama; +8 test baru semua pass.)
- `node scripts/build.js`: sukses, versi bundle numerik v1066 -> v1067.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash
  source cocok).
- Perubahan terkonfirmasi masuk kedua bundle (grep penanda komentar
  "Modul 12": `app-bundle-a.min.js` 1 kemunculan [wiring
  `cobek-etalase.js`], `app-bundle-b.min.js` 1 kemunculan [gate
  `product-repository.js`]).

## Yang SENGAJA tidak disentuh

1. CSV import (`cobek-io.js`) — tetap bypass, alasan teknis sama seperti
   audit Modul 11 (lihat `CHANGELOG-MODUL11.md` §Issue tersisa &
   `CHANGELOG-MODUL12.md` §Latar & audit).
2. Signature publik `Etalase.delete(i)` — tetap menerima index (dipanggil
   dari `data-action` di HTML), 0 perubahan kontrak.
3. `mutateDelete()` gate baru TIDAK dipanggil dari titik lain mana pun
   (CSV import, kasir, dst.) — scope murni `Etalase.delete(i)`.

## Environment sandbox (sama seperti Modul 3-11)

`esbuild`/`eslint` tidak terpasang (tidak ada akses jaringan di sandbox
ini) — bundle hasil build TIDAK diminifikasi tapi 100% valid (`node
--check` + `verify-bundle-freshness.js` lolos).

## File yang berubah

Lihat `FILES-CHANGED.md` (root repo) untuk daftar lengkap + unified diff
di `MODUL12-PRODUCT-DELETE-MUTATION-GATE.diff`.

## Issue tersisa

Domain Shop **BELUM 100% tertutup**. CSV import (`cobek-io.js`, 2 sub-
kandidat terpisah: create-produk vs create+update-produsen) tetap kandidat
paling masuk akal untuk sesi berikutnya kalau user meminta lanjut — TIDAK
dikerjakan/dirancang sesi ini, lihat detail teknis lengkap di
`CHANGELOG-MODUL11.md` §Issue tersisa (masih berlaku, tidak berubah).

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 13 yang
dibuat/dikerjakan sesi ini.**
