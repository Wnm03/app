# AUDIT S2040–S2041 — Car Notes Part SOT (regression-safe)

Basis: `app-main__40_.zip` (base, v2145) + `PATCH-S2041-...zip` (S2040+S2041) diterapkan di salinan kerja.
Tidak ada source yang diubah. Semua temuan di bawah hanya audit.

## EXECUTIVE RESULT: **REGRESSION** → Final verdict: **NEEDS PATCH**

| Area | Hasil |
|---|---|
| A. SOT | WARNING |
| B. Part Picker | REGRESSION |
| C. Service | REGRESSION (CRITICAL data integrity, C1) |
| D. Transaction | REGRESSION (C2) |
| E. Stock | REGRESSION |
| F. Purchase | WARNING |
| G. Service History | REGRESSION (via C1) |
| H. Legacy S2040 | PASS WITH WARNING |
| I. UI | NOT VERIFIED (browser) — hanya code-read |
| J. Performance | PASS WITH WARNING |
| K. Data Integrity | REGRESSION |
| L. KPB Boundary | PASS |

## Level verifikasi

| Level | Status |
|---|---|
| STATIC VERIFIED | Ya — syntax, loader index/production, fungsi/ID kunci ada |
| UNIT VERIFIED | Sebagian — harness fake-DOM (`/home/claude/audit/t1.js`, `t2.js`), bukan browser |
| INTEGRATION VERIFIED | Tidak — alur Service→Part→Stock & Purchase→Part→Stock dibaca dari kode, tidak dieksekusi end-to-end |
| BROWSER UI VERIFIED | **NOT VERIFIED** — tidak ada DOM snapshot sebelum/sesudah, mobile/desktop belum diuji |
| Full test suite | Baseline 7925 pass / 5 fail. Patch 7919 pass / 16 fail → **11 kegagalan baru** (lihat R4) |

Catatan: test S2041 (`part-crud-s2041.test.js`) hanya `includes()` string di source — tidak membuktikan perilaku. Semua PASS-nya STATIC.

---

## CRITICAL / REGRESSION

### C1 — Edit servis kehilangan referensi Part bila stok 0 / diarsipkan — CRITICAL
- Lokasi: `part-crud-s2041.js` → `refreshSelect()`, `pickerDefaults('servisPartId')` (onlyAvailable=ON); dampak di `servis.js:1102` dan `1154-1158` (`replaceStockUsages`).
- Masalah: picker servis dibangun ulang hanya dari part `qty>0 && !isArchived`. Saat Edit Servis lama yang memakai part yang kini qty 0 (contoh: stok 5, pakai 5) atau sudah diarsipkan, opsi part terpilih hilang → `servisPartId.value=''`.
- Dampak: saat simpan, `usedPartId=''` → usage lama di-revert (stok bertambah diam-diam) dan `usedPartId` di history terhapus. History tidak bisa direkonstruksi; stok jadi salah.
- Reproduksi: `t1.js` — select berisi `pA` (qty 0, dipakai s1) → setelah `refreshAll()` value `""`, opsi `pA` hilang.
- Solusi additive: di `refreshSelect`, selalu pertahankan opsi yang sedang terpilih (label "· habis/arsip"), walau tak lolos filter.
- Aman additive: **Ya**.

### C2 — Opsi "➕ Sparepart Baru" (`__new__`) hilang di picker Transaksi — REGRESSION
- Lokasi: `refreshSelect('txStockItem')`; konsumen `tx-stok-sparepart.js:398` (`itemSel==='__new__'`).
- Masalah: placeholder diambil dari opsi pertama hanya bila value kosong; `__new__` punya value → diganti `— Pilih Part —` (value `""`), opsi `__new__` dibuang.
- Dampak: jalur pembelian part baru dari form Transaksi tidak bisa dipilih; nilai `''` masuk cabang "part existing".
- Reproduksi: `t1.js` — opsi TX setelah S2041: `['|— Pilih Part —', pB, pA, pE]`, `__new__` tidak ada.
- Solusi additive: pertahankan opsi sentinel (value diawali `__`) dan placeholder aslinya.
- Aman additive: **Ya**.

### C3 — "Hapus Semua" stok mem-bypass aturan archive — CRITICAL (celah lama, tidak ditutup S2041)
- Lokasi: `sparepart-servis-ui.js:658` `removeAllStockConfirm()` → `D.partsStock=D.partsStock.filter(...)`.
- Dampak: part dengan purchase/service history di-hard-delete → referensi menggantung. Melanggar aturan §10.
- Solusi additive: bungkus seperti `delStock` — part berreferensi di-archive, sisanya dihapus.

### R1 — Part baru (Tambah Part Manual) tidak menyimpan OEM; context bocor — REGRESSION
- Lokasi: wrapper `Sparepart.saveStock` di `part-crud-s2041.js`.
- Masalah: `idx=this.stockEditIdx` → untuk Part baru `null` → blok `if(p)` dilewati: `stockOemCode` tidak disimpan, `pendingContext` tidak dibersihkan.
- Dampak: fitur utama "+ Tambah Part Manual" tidak mempersist OEM; `pendingContext` lama ikut mengisi komponen di "Tambah Stok" berikutnya (repro `t2.js`: `stockServiceComponentId` terisi `comp_ctx`).
- Solusi additive: tangani part baru (ambil part yang baru di-push), dan `pendingContext=null` di semua jalur.

### R2 — Archive tidak dikenali Stock Master/dashboard — REGRESSION vs spec §5D/§10
- Lokasi: `sparepart-servis-ui.js` (0 referensi `isArchived`), `renderStockList`, `calcDashboardStats`.
- Dampak: part arsip tampil di daftar stok dan ikut hitung "habis/menipis"/persediaan; tidak ada badge arsip, tidak ada restore, riwayat penyesuaian tidak tampil.
- Solusi additive: filter/badge arsip + toggle "tampilkan arsip" + tombol restore (kecil, di list existing).

### R3 — Saldo sebelum archive tidak terjurnal — WARNING→REGRESSION vs spec §7
- Lokasi: `Sparepart.delStock` wrapper: `p.qty=0` tanpa entry `adjustmentHistory`.
- `t2.js`: setelah archive, entry terakhir tetap edit manual sebelumnya (qty 5→1); penurunan 1→0 karena archive tidak tercatat.
- Solusi: push entry `{qtyBefore,qtyAfter:0,delta,reason:'archive',source:'part-crud-s2041',date}` sebelum `qty=0`.

### R4 — Patch tidak konsisten rilis: 11 tes baru gagal — REGRESSION (gate rilis)
- Patch membawa `index.html`, `app_production.html`, `sw.js`, bundle di **v2149**, sementara source (mis. `features-helpers-global-security.js:125` `...-2145`) dan penanda di `app-bundle-a.min.js` tidak sinkron.
- Gagal baru: S1786, S1904, S1908, S1909, S1930, S1974, S2144, SA13, "SW cache version…", "version source/HTML/SW…", `s1906-runtime-null-guard` ("app-bundle-a: current release version marker missing").
- Bukan bug fungsional, tapi ZIP ini tidak lolos gate rilis. Solusi: sinkronkan konstanta versi + rebuild (`scripts/build.js`) di sesi patch, lalu jalankan ulang seluruh suite.
- 5 kegagalan lain sudah ada di baseline (S1860, v22 empty-catch `service-interval-sot.js:159`, 3 tes `vehicle-jenis`) — bukan dari patch.

---

## WARNING

| ID | Temuan | Lokasi | Dampak / saran |
|---|---|---|---|
| W1 | `adjustmentHistory` belum punya field `source`; id memakai `Date.now()+random` | `saveStock` wrapper | Lengkapi `source`; aman additive |
| W2 | Dua logika kompatibilitas kendaraan: `partRows.vehicleMatch` (pakai `vehicleIds`/`vehicleId`) vs `Sparepart.isPartForVehicle` (pakai `compatibleVehicleIds` katalog). "Universal" = implisit `!vehicleId` | `part-crud-s2041.js` vs `sparepart-servis.js:835` | Picker dan Stock Master bisa beda hasil. Delegasikan ke `isPartForVehicle` |
| W3 | Inferensi berbasis nama (pra-ada): `ServiceInputCatalog.infer(name)`, `resolveServiceCategoryComponent(...,name)`, `resolveServisCatForVehicle(name)`; `ensurePart({oemCode:code})` memperlakukan kode internal sebagai OEM | `sparepart-servis-ui.js` saveStock; `tx-stok-sparepart.js` | Bertentangan dengan §3/§4 (fallback = WARNING). Jangan diubah langsung; tandai fallback |
| W4 | `computeServiceUrgency` legacy memakai `cat.serviceComponentId\|\|cat.componentId\|\|cat.id` — id kategori bisa dipakai sebagai id komponen | `sparepart-servis.js:~564` | Tidak membuat due palsu, tapi reminder bisa diam-diam jadi `BASELINE_REQUIRED` |
| W5 | Lebih dari satu engine due hidup bersamaan: `ServiceMaintenanceEngine`, `buildServiceNextDueSnapshot`, `computeServiceUrgency`, `ServiceLegacyMaintenance` | `service-maintenance-engine.js`, `sparepart-servis.js`, `service-legacy-maintenance.js` | Kesetaraan hasil **NOT VERIFIED**. Perlu tes perbandingan sebelum adapter→canonical→cleanup |
| W6 | S2041 berupa runtime wrapper di luar bundle/`build.js`/`sw.js` PRECACHE, memonkey-patch `Sparepart.*` dan `window.populateTxStockSelect`; `?v=2041` terpisah dari versi rilis | `index.html:3615`, `app_production.html:3618`, `sw.js` | Offline PWA tidak dijamin memuatnya; luput dari gate bundle/lint |
| W7 | `MutationObserver` body-subtree: konvergen (refresh ulang menambah 0 elemen di harness) dan disconnect 120 dtk; setelahnya bergantung hook `populate*` | `boot()` | Aman sekarang; tambah guard bila hook diubah |
| W8 | `evaluateAction`: `kmNow==null` dengan interval KM saja → `NOT_DUE` (semestinya tak-diketahui) | `service-legacy-maintenance.js` | Minor |
| W9 | Tidak ada field `partType` (OEM/Aftermarket/Generic/Custom) di stok; hanya di katalog | `vehicle-catalog-identity-sot.js` | Pembeda saat ini hanya nama/kode. Field opsional additive |
| W10 | Deteksi duplikat Part (nama/OEM/catalog) tidak ditemukan; belum diaudit dengan data nyata | — | **NOT VERIFIED** |

---

## SAFE (terverifikasi pada level yang disebut)

- **KPB boundary (STATIC):** di runtime Car Notes hanya komentar, flag `kpbManagedExternally`, dan label checkbox "Motor lama" (`vehicle-core.js`). Tidak ada logika KPB1–4 di perhitungan. `scripts/build.js` menyebut KPB — bukan runtime app, isi tidak diperiksa lebih jauh.
- **S2040 (UNIT):** 4 tes lolos; tanpa history → `BASELINE_REQUIRED`, tidak membuat baseline palsu; history lama tidak ditulis ulang.
- **Filter (UNIT, fake DOM):** kategori & komponen ketat (Part tanpa komponen tidak masuk otomatis); archived tersembunyi; default "stok tersedia" servis ON, pembelian OFF.
- **Idempotensi (UNIT):** 2× `refreshAll()` tambahan → 0 elemen baru (tidak ada tombol/checkbox ganda).
- **Archive-vs-delete (UNIT):** part berreferensi → `isArchived`, `archivedAt`, `archivedReason`; part tanpa referensi → alur hapus asli.
- **Ledger qty manual (UNIT):** `qtyBefore/qtyAfter/delta/reason/date` tercatat (kurang `source`, lihat W1).
- **Harga (STATIC):** part dengan `priceHistory` mempertahankan price/avg/last saat edit manual — belum diuji unit.
- **XSS (STATIC):** label/opsi lewat `esc()`; tombol pakai `textContent`; nilai modal lewat `.value`. Belum diuji di browser.

---

## Rekomendasi patch berikutnya (S2041.1, additive, urutan prioritas)

1. C1+C2: `refreshSelect` selalu mempertahankan opsi terpilih dan opsi sentinel `__*`.
2. R1: `saveStock` wrapper menangani Part baru + bersihkan `pendingContext`.
3. C3: bungkus `removeAllStockConfirm` dengan aturan archive.
4. R3+W1: jurnal archive + field `source`.
5. R2: filter/badge/restore arsip di Stock Master (minimal, pakai class existing).
6. W2: delegasikan kompatibilitas kendaraan ke `Sparepart.isPartForVehicle`.
7. R4: sinkronkan versi + rebuild; daftarkan `part-crud-s2041.js` ke build/sw bila memang dipertahankan.
8. Tes perilaku (fake-DOM `t1.js`/`t2.js` dijadikan test di `tests/`) + tes perbandingan engine due (W5).
9. Browser E2E + DOM snapshot service form, transaksi form, stock modal (belum dilakukan).

**FINAL VERDICT: NEEDS PATCH.** Jangan menyatakan PASS: C1 dapat merusak service history pada skenario umum.
