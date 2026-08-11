# Changelog — Sesi 365 (Modul 7 — Supplier Mutation Gate)

## Konteks

Lanjutan langsung dari Modul 6 (Sesi 364, nested-mutation-gate). Instruksi
eksplisit user: implementasi LANGSUNG pada FULL RELEASE ZIP terakhir
(`kw_release_sesi364_modul6-nested-mutation-gate_v1061.zip`), audit
secukupnya saja (bukan sesi audit terpisah), tanpa refactor besar/perubahan
business logic, reuse validator existing, tetap additive & backward
compatible.

Target Modul 7 (dikonfirmasi user): bangun **Supplier Mutation Gate** di
`modules/shop/generic/supplier-store.js` (`mutateCreate()`/`mutateUpdate()`/
`mutateDelete()`/`mutateSetRoute()`), lalu alihkan SELURUH mutasi supplier
(`Produsen.save()`, `Produsen.delete()`, `OngkirCalc.saveProdusenPref()`)
lewat gate yang sama (SSOT), sama pola `ProductRepository` Modul 3-6.

## Audit awal (bagian dari implementasi)

Grep titik TULIS ke `D.produsen` (bukan baca) di seluruh `modules/`:

| File | Fungsi | Operasi |
|---|---|---|
| `cobek-order.js` | `Produsen.save()` | CREATE (`D.produsen.push(...)`) **ATAU** UPDATE in-place (`Object.assign(pr,...)`) tergantung `editId` |
| `cobek-order.js` | `Produsen.delete()` | DELETE (`D.produsen=D.produsen.filter(...)`) + sisi-efek clear `p.produsenId=''` di produk terkait |
| `cobek-pricing.js` | `OngkirCalc.saveProdusenPref()` | SET 2 field numerik in-place (`pr.jarakKm`/`pr.biayaPerKm`) |

`supplier-store.js` sendiri sebelum sesi ini PURE murni baca (`list()`/
`find()`/`label()`/`costFor()`/`productsFor()`) — 0 method tulis, persis
dicatat di header file (`SupplierStore = ... CRUD asli tetap di Produsen.* —
cobek-order.js, TIDAK diubah sesi ini`, komentar dari Tahap 1 Generic Shop
Engine). Sisi-efek `p.produsenId=''` di `Produsen.delete()` DIKONFIRMASI
di luar scope (mutasi Product bukan Supplier) — lihat §"Sengaja tidak
disentuh" di bawah.

## Perubahan

### 1. `SupplierStore` — Supplier Mutation Gate (4 method baru)

`modules/shop/generic/supplier-store.js`:

- **`mutateCreate(fields)`** (baru, PURE) — bangun objek supplier baru.
  `fields.name` WAJIB (divalidasi via `_validateText()`, DELEGASI ke
  `ProductRepository.validateTextValue()` YANG SUDAH ADA — 0 duplikasi
  validasi teks baru, fallback lokal aturan identik kalau
  `ProductRepository` belum dimuat); `contact`/`note` OPSIONAL (boleh
  kosong, sama perilaku lama — TIDAK divalidasi wajib-isi, cuma di-trim).
  id pakai generator PERSIS literal lama (`'prd_'+Date.now()`, sama yang
  dipakai `Produsen.save()`). Return `{ok:true, supplier}` — caller yang
  push ke `D.produsen` & panggil `save()` (sama batasan
  `ProductRepository.createProduct()`).
- **`mutateUpdate(supplier, changes)`** (baru, in-place) — edit supplier
  existing. `changes.name` wajib valid (fail-safe: kalau tidak valid,
  supplier TIDAK disentuh sama sekali); `contact`/`note` ditulis HANYA kalau
  key-nya ada di `changes` (tidak menimpa nilai lama kalau tidak dikirim).
- **`mutateDelete(suppliers, id)`** (baru, PURE) — balikin ARRAY BARU hasil
  filter (input TIDAK dimutasi), idempotent (id tidak ketemu tetap
  `ok:true`, sama perilaku `Array.filter()` native). `id` divalidasi via
  `_validateText()` yang sama (1 validator dipakai utk `name` MAUPUN `id` —
  sama semangat `mutateSetField()` ProductRepository yang 1 gate dipakai
  ke-3 field teksnya).
- **`mutateSetRoute(supplier, jarakKm, biayaPerKm)`** (baru, in-place) —
  GATE utk rute tetap Etape 1 (kw192-ongkir-produsen-pref). Kedua angka
  divalidasi via `_validateRouteNumber()` (DELEGASI ke
  `ProductRepository.validatePriceValue()` YANG SUDAH ADA — aturan sama:
  finite, diklem `>=0`, 0 duplikasi validasi angka baru). Fail-safe: salah
  satu angka tidak valid -> supplier TIDAK disentuh sama sekali (rute lama
  tetap utuh, bukan partial write).

Semua method baru 100% ADDITIVE ke file yang sama — 0 method lama
(`list()`/`find()`/`label()`/`costFor()`/`productsFor()`) diubah. Reuse
penuh validator `ProductRepository` (guard `typeof`, sama pola
`mutateSetHargaProdusen()` Modul 6 yang reuse `validateTextValue()`/
`validatePriceValue()` miliknya sendiri) — **0 validator baru diduplikasi**.

### 2. 4 titik mutasi dialihkan ke gate

Semua pakai guard `typeof SupplierStore!=='undefined'` + fallback mentah
lama (pola sama persis Modul 3-6):

- **`cobek-order.js` `Produsen.save()`** — cabang CREATE lewat
  `SupplierStore.mutateCreate()` (hasil `.supplier` di-push ke
  `D.produsen`); cabang UPDATE lewat `SupplierStore.mutateUpdate(pr,...)`.
- **`cobek-order.js` `Produsen.delete()`** — `D.produsen=D.produsen.filter
  (...)` diganti `SupplierStore.mutateDelete(D.produsen,id)` (hasil
  `.suppliers` di-assign balik ke `D.produsen`). Baris
  `D.products.forEach(p=>{if(p.produsenId===id)p.produsenId='';})` SENGAJA
  TETAP mentah (lihat §"Sengaja tidak disentuh").
- **`cobek-pricing.js` `OngkirCalc.saveProdusenPref()`** —
  `pr.jarakKm=km;pr.biayaPerKm=biaya;` diganti
  `SupplierStore.mutateSetRoute(pr,km,biaya)`. Guard `km<=0` (wajib isi
  jarak dulu) TETAP di caller — itu UX guard lama, bukan business logic
  gate (sama semangat guard `val>0` yang tetap di caller
  `Produsen.saveHarga()` Modul 6, TIDAK dipindah ke dalam gate).

## Sengaja tidak disentuh

1. **`p.produsenId=''` di `Produsen.delete()`** — ini MUTASI PRODUCT (bukan
   Supplier), di luar scope Supplier Mutation Gate sesi ini. Memaksanya
   lewat `ProductRepository.mutateSetField()` (Modul 5) juga TIDAK BISA
   tanpa mengubah perilaku: gate itu MEWAJIBKAN teks non-kosong, sedangkan
   di sini justru sengaja menulis string kosong (`''`) sebagai penanda
   "produsen sudah dihapus" — dipertahankan raw dgn sengaja, didokumentasikan
   inline di kode & di `SupplierStore.mutateDelete()`.
2. **`Produsen.saveHarga()`** (mutasi nested `hargaByProdusen`, lewat
   `ProductRepository.mutateSetHargaProdusen()`/`mutateDeleteHargaProdusen()`)
   — SUDAH digate Modul 6, di luar scope Modul 7 (itu mutasi Product, bukan
   Supplier).
3. **`OngkirCalc.prefillFromProdusen()`** — READ-ONLY (baca `pr.jarakKm`/
   `pr.biayaPerKm` utk prefill form), bukan mutasi — 0 perubahan.

## Testing

- **Test baru** (`tests/supplier-mutation-gate-mod7.test.js`) — 20 test:
  - 15 unit: `mutateCreate()` (nama valid, contact/note opsional kosong,
    nama kosong/whitespace/tidak ada ditolak, fields tidak valid),
    `mutateUpdate()` (update in-place, nama kosong ditolak tanpa partial
    write, key tidak dikirim tidak menimpa nilai lama, supplier/changes
    tidak valid), `mutateDelete()` (id ada dihapus + input tidak dimutasi,
    id tidak ketemu idempotent, suppliers bukan array/id tidak valid),
    `mutateSetRoute()` (angka valid, negatif diklem ke 0, NaN/Infinity/
    string ditolak tanpa partial write, supplier tidak valid).
  - 4 integrasi: `Produsen.save()` CREATE & UPDATE (masing-masing verifikasi
    gate benar-benar dipanggil + hasil akhir identik business logic lama),
    `Produsen.delete()` (verifikasi gate dipanggil + sisi-efek clear
    `produsenId` produk TETAP jalan seperti sebelumnya), `OngkirCalc.
    saveProdusenPref()` (verifikasi gate dipanggil + `jarakKm`/`biayaPerKm`
    tersimpan sama seperti sebelumnya).
  - 1 test "seluruh caller lama tetap bekerja tanpa `SupplierStore`"
    (`SupplierStore` SENGAJA tidak dimuat sama sekali — fallback mentah
    tetap jalan utk `Produsen.save()`/`OngkirCalc.saveProdusenPref()`, guard
    `typeof` terverifikasi).
- **0 test lama diubah** — tidak ada perilaku lama yang berubah status
  scope sesi ini.
- **Regresi penuh** (`npm test`): 2431 test total (2411 baseline Modul 6 +
  20 baru), 2429 pass, 2 gagal — dikonfirmasi PERSIS 2 kegagalan
  pre-existing yang SAMA dari baseline Modul 6 (`dashHubNavigateToFeature`,
  navigasi dashboard, tidak terkait Shop/SupplierStore sama sekali. **0
  regresi baru dari Modul 7.**

## Build

- `node scripts/build.js` sukses → versi naik ke **v1062**
  (`s389-generic-shop-engine-tahap12-final-audit-final-release`).
  `app-bundle-a.min.js`/`app-bundle-b.min.js` ditulis ulang, lolos cek
  sintaks (`node --check`).
- `node scripts/verify-bundle-freshness.js` → ✓ kedua bundle segar (hash
  source cocok), aman deploy.
- **Catatan lingkungan (sama seperti Modul 4-6)**: `esbuild`/`eslint` tidak
  terpasang di sandbox sesi ini (tidak ada akses jaringan) — bundle hasil
  build TIDAK diminifikasi (lebih besar dari build ter-minify, tapi 100%
  valid, dikonfirmasi `verify-bundle-freshness.js` + `node --check`).
  Jalankan `npm install --save-dev esbuild eslint` di lingkungan dgn akses
  internet kalau minifikasi/lint penuh dibutuhkan sebelum deploy produksi.

## File yang berubah

Lihat `FILES-CHANGED.md` (diperbarui) untuk daftar lengkap + unified diff
source di `MODUL7-SUPPLIER-MUTATION-GATE.diff` (bundle/HTML/sw.js/docs hasil
auto-generate `build.js` TIDAK disertakan di diff — cuma isi ulang otomatis
dari source).

## Issue tersisa

Tidak ada mutasi supplier lain yang teridentifikasi sesi ini — 3 titik
(`Produsen.save()`/`Produsen.delete()`/`OngkirCalc.saveProdusenPref()`)
adalah SELURUH jalur tulis `D.produsen` di codebase saat ini (dikonfirmasi
lewat grep §"Audit awal"). Kalau skema Supplier menambah field baru di masa
depan yang perlu digate, `mutateUpdate()`/`mutateSetRoute()` sesi ini bisa
jadi referensi/template (whitelist field + validator reuse).
