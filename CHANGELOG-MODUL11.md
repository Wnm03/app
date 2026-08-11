# CHANGELOG — Modul 11: Produk Inline-Create (Tx Cart) Mutation Gate

Sesi 369. Lanjutan langsung Modul 10 (`kw_release_sesi368_modul10-produsen-
inline-create-mutation-gate_v1065.zip`). Baseline: FULL RELEASE ZIP v1065.

## Audit domain Shop (ringkas)

Grep menyeluruh `D.products.push`/`D.produsen.push`/`D.products.splice`/
`D.produsen.splice` di seluruh `modules/shop/*.js`:

| Titik | File | Status sebelum sesi ini |
|---|---|---|
| `Etalase.onProdusenChange()` | `cobek-etalase.js` | ✅ Sudah digate (Modul 10) |
| `onTxShopStockProdusenChange()` | `cobek-tx-cart.js` | ✅ Sudah digate (Modul 10) |
| `Etalase.save()` create produk | `cobek-etalase.js` | ✅ Sudah digate (Tahap 6) |
| `Etalase.save()` create produsen (form) | `cobek-order.js` `Produsen.save()` | ✅ Sudah digate (Modul 7) |
| `applyTxShopStockFromTx()` create produk baru (isNew) | `cobek-tx-cart.js` | ❌ Object literal mentah — **DIPILIH sesi ini** |
| `ImportShopExcel.commit()` create produsen | `cobek-io.js` | ❌ Object literal mentah — TIDAK dipilih (lihat §Issue tersisa) |
| `ImportShopExcel.commit()` update produsen | `cobek-io.js` | ❌ Mutasi langsung `pr.contact=...` dst — TIDAK dipilih |
| `ImportShopExcel.commit()` create produk | `cobek-io.js` | ❌ Object literal mentah — TIDAK dipilih |
| `ImportShopExcel.commit()` update produk | `cobek-io.js` | ✅ Sudah digate (`ProductRepository.mutateSet*`) |
| `Etalase.delete(i)` | `cobek-etalase.js` | ❌ `D.products.splice()` mentah — TIDAK dipilih (butuh method baru, lihat §Issue tersisa) |
| `Produsen.delete(id)` | `cobek-order.js` | ✅ Sudah digate (Modul 7, `SupplierStore.mutateDelete()`) |

## Modul dipilih: `applyTxShopStockFromTx()` create-produk-baru

**Alasan (prioritas sesuai instruksi):**

1. **Risiko integritas data** — titik ini adalah SATU-SATUNYA sisa mutasi
   mentah di fungsi `applyTxShopStockFromTx()`; 4 mutasi lain di fungsi yang
   SAMA (stock delta, harga, kategoriId/produsenId, hargaByProdusen nested)
   SUDAH lewat `ProductRepository` sejak Modul 5/6 — jadi 1 titik ini adalah
   inkonsistensi nyata di tengah fungsi yang sudah 80% SSOT.
2. **Banyaknya jalur terdampak** — dipanggil dari alur simpan Transaksi
   (checkbox "Tambah Stok Shop") setiap kali user menambah produk baru lewat
   keranjang stok — jalur yang sering dipakai (setara pentingnya dgn form
   Etalase yang sudah digate Tahap 6).
3. **Kemampuan reuse gate** — `ProductRepository.createProduct()` (Tahap 4)
   sudah battle-tested (dipakai `Etalase.save()` sejak Tahap 6), 0 method
   baru dibutuhkan.
4. **Perubahan sekecil mungkin** — 1 fungsi, 1 file, ~20 baris (mayoritas
   komentar penjelasan), 0 helper baru.

**Kandidat yang TIDAK dipilih** (CSV import `cobek-io.js`) — lihat
§"Issue tersisa" untuk alasan teknis lengkap; ringkas: masalah ID generator
yang butuh penanganan ekstra + scope 4 titik campur create/update di 1
fungsi, lebih besar dari "satu modul terisolasi".

## Yang dikerjakan

1. **0 method baru** — murni WIRING `applyTxShopStockFromTx()` (fungsi
   `it.isNew && !product` branch) ke `ProductRepository.createProduct()`
   (SSOT Tahap 4, SUDAH ADA & battle-tested di `Etalase.save()` Tahap 6).
2. **1 titik mutasi dialihkan**: create produk baru inline saat isi
   keranjang stok form Transaksi (`cobek-tx-cart.js`).
3. **Guard `typeof ProductRepository!=='undefined'` + fallback raw PERSIS
   literal lama** — pola identik Modul 3-10.
4. **Keputusan khusus — id generator TETAP lokal**: `ProductRepository.
   _genId()` cuma `'prod_'+Date.now()` (tanpa suffix), sedangkan kode lama
   di titik ini pakai `'prod_'+Date.now()+'_'+uid()` (suffix `uid()` sengaja
   ditambahkan supaya aman kalau >1 produk baru dibuat dalam 1 keranjang
   pada milidetik yang sama — `forEach()` di fungsi ini sinkron). Kalau
   dipaksa pakai id polos dari gate, ini JUSTRU MEMPERKENALKAN bug tabrakan
   id yang sebelumnya tidak ada (regresi, melanggar instruksi "tidak boleh
   mengubah business logic"). Solusi: `createProduct()` tetap dipanggil
   utk validasi & field default (konsisten dgn produk hasil form Etalase),
   lalu `.id` DITIMPA ULANG dengan generator lokal SEGERA setelah create
   (bukan lewat `fields` — `createProduct()` sengaja menolak override id
   lewat `fields` untuk "jaga keunikan generatornya sendiri", lihat
   komentar `product-repository.js`). Hasil: 0 perubahan format/perilaku id,
   0 risiko tabrakan baru.
5. **Efek samping (disengaja, bukan business logic baru)**: produk yang
   dibuat lewat jalur ini sekarang otomatis dapat field default tambahan
   yang sudah dipakai produk hasil form Etalase sejak Tahap 6
   (`beratPerUnit`/`panjang`/`lebar`/`tinggi`/`ownership`, semua default
   `0`/`'SELF'`) — SAMA prinsip "dipatenkan eksplisit" yang sudah berlaku
   di `Etalase.save()` (field yang tadinya `undefined` & di-resolve
   `OwnershipEngine.resolve()` saat baca, sekarang eksplisit `'SELF'` sejak
   dibuat). Nilai efektif 100% sama; tidak ada kode pembaca field ini yang
   berubah perilakunya.
6. **9 test baru** (`tests/product-inline-create-mutation-gate-mod11.test.js`)
   — integrasi (gate benar-benar dipanggil, produk lain tidak berubah),
   id generator lokal (regex + skenario 2 produk baru 1 keranjang, tidak
   tabrakan), fallback tanpa `ProductRepository`, dan 2 test "produk
   existing TIDAK lewat createProduct()" (dedup by name & pilih dari
   dropdown).
7. **1 komentar test lama diperbarui** (bukan logic) —
   `tests/product-repository-nested-mutation-gate-mod6.test.js`, judul test
   yang tadinya menyebut "kategoriId awal via object literal (bukan gate)"
   diperjelas jadi "via createProduct() field merge (Modul 11, bukan
   mutateSetField() gate)" supaya tetap akurat setelah perubahan sesi ini.
   Assertion test tersebut TIDAK berubah & tetap PASS.

## Hasil verifikasi

- `node --test tests/*.test.js`: **2467 test, 2465 pass, 2 gagal** —
  dikonfirmasi PERSIS 2 kegagalan pre-existing yang sama (`dashHubNavigateToFeature`,
  tidak terkait Shop) dari baseline v1065. **0 regresi baru.** (Sebelum sesi
  ini: 2460 test, 2458 pass, 2 gagal sama.)
- `node scripts/build.js`: sukses, versi bundle numerik v1065 -> **v1066**.
- `node scripts/verify-bundle-freshness.js`: kedua bundle segar (hash source
  cocok).
- Perubahan terkonfirmasi masuk `app-bundle-a.min.js` (grep penanda
  komentar "Modul 11", 1 kemunculan).

## Yang SENGAJA tidak disentuh

1. 4 mutasi lain di `applyTxShopStockFromTx()` (stock delta/harga/
   kategoriId&produsenId/hargaByProdusen) — sudah digate sejak Modul 5/6,
   tidak disentuh sesi ini.
2. Validasi qty>0/pilih produk dulu — UX guard di `addShopStockCartItem()`
   (fungsi lain), bukan business logic gate ini.
3. CSV import (`cobek-io.js`) — TETAP tidak dipaksakan, lihat §Issue
   tersisa untuk alasan teknis baru (ID generator).
4. `Etalase.delete(i)` (`D.products.splice()`) — TIDAK ada gate delete di
   `ProductRepository` sama sekali (beda dari `SupplierStore.mutateDelete()`
   yang sudah ada), jadi menggate ini BUKAN "wiring ke gate existing"
   melainkan "buat method baru" — di luar scope sesi ini per instruksi
   "reuse gate yang sudah ada".

## Environment sandbox

Sama seperti Modul 3-10: `esbuild`/`eslint` tidak terpasang (tidak ada
akses jaringan) — bundle hasil build TIDAK diminifikasi tapi 100% valid
(`node --check` + `verify-bundle-freshness.js` lolos).

## Issue tersisa (domain Shop belum 100% tertutup)

Domain Shop **BELUM 100% tertutup**. 2 kandidat berikut TETAP TIDAK
dipaksakan sesi ini, dengan alasan teknis lebih detail dari audit
sebelumnya:

### 1. CSV Import (`cobek-io.js`, `ImportShopExcel.commit()`)

- **Produsen**: create (`D.produsen.push(...)`) DAN update (`pr.contact=...`
  dst mentah) berdua bypass `SupplierStore` sepenuhnya — beda dari Produk,
  yang update-nya SUDAH digate.
- **Produk**: hanya create yang bypass; update SUDAH digate penuh lewat
  `ProductRepository.mutateSet*()`.
- **Masalah teknis baru yang ditemukan sesi ini (alasan utama tidak
  dipaksakan)**: `commit()` men-create banyak baris dalam SATU `forEach()`
  sinkron — bisa >1 produk/produsen baru pada milidetik yang SAMA.
  `ProductRepository._genId()`/`SupplierStore.mutateCreate()` generate id
  HANYA `'prod_'+Date.now()`/`'prd_'+Date.now()` (TANPA suffix unik),
  sedangkan kode CSV import SAAT INI sengaja pakai suffix
  `+'_'+uid()` justru untuk mencegah tabrakan itu. Wiring naif ke gate
  apa adanya AKAN memperkenalkan bug tabrakan id massal pada import
  banyak baris baru sekaligus — regresi nyata, bukan sekadar
  refactor. Solusi (override id setelah create, sama seperti Modul 11
  sesi ini) BISA diterapkan, tapi produsen JUGA butuh field `jarakKm`/
  `biayaPerKm` yang `SupplierStore.mutateUpdate()` TIDAK menangani (hanya
  `mutateSetRoute()` yang menangani, itu pun validasi "keduanya wajib
  valid sekaligus, fail-safe kalau salah satu invalid" — beda dari
  perilaku CSV import sekarang yang partial-update independen per
  field). Menyatukan ini jadi SATU modul rapi butuh desain tambahan
  (bukan wiring lurus), lebih besar dari "satu titik terisolasi".
- **Rekomendasi**: kalau user minta lanjut, pecah jadi 2 modul terpisah
  (create-produk CSV vs create+update-produsen CSV) supaya masing-masing
  tetap "satu modul kecil", bukan digabung.

### 2. `Etalase.delete(i)` (`cobek-etalase.js`)

- `D.products.splice(i,1)` mentah, 0 validasi/gate.
- **TIDAK ADA gate delete existing di `ProductRepository`** untuk
  di-reuse (beda dari `SupplierStore.mutateDelete()`/
  `CategoryStore.mutateDelete()` yang sudah ada) — menggate ini berarti
  MEMBUAT method baru (`ProductRepository.mutateDelete()`), bukan wiring
  ke gate existing. Di luar scope "reuse existing gate" sesi ini; kandidat
  yang sah untuk modul TERPISAH kalau user eksplisit minta gate delete
  produk dibuat.

**BERHENTI di sini. Tidak ada implementasi/roadmap Modul 12 yang
dibuat/dikerjakan sesi ini.**
