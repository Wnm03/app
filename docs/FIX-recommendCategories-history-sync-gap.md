# FIX — Sinkronisasi `recommendCategories()` dengan Riwayat Servis (D.servisLogs)

## Konteks
Audit atas fitur "💡 Rekomendasi Kategori Sesuai Kendaraan" (patch
`patch-rekomendasi-kategori-servis`) menemukan `recommendCategories()`
sudah sinkron terhadap kategori sparepart yang ADA (`D.sparepartCats`,
exact-name skip), tapi **tidak pernah membaca `D.servisLogs`** sama
sekali. Dua gap:

1. Part yang sudah sering dicatat manual di riwayat servis (`item` di
   `D.servisLogs`) tapi belum dibuatkan kategori resmi tetap
   direkomendasikan sebagai kandidat "baru" tanpa penanda — sistem tidak
   tahu part itu sudah "dikenal" dari histori. Part yang bahkan sama
   sekali tidak ada di TORSI_DB/`GENERIC_RECOMMEND_NAMES` juga tidak
   pernah muncul di rekomendasi walau sudah sering dicatat.
2. `intervalKm` rekomendasi murni dari buku manual (TORSI_DB) atau
   estimasi umum (`FALLBACK_KEYWORDS`) — tidak pernah dibandingkan dengan
   pola servis ASLI kendaraan itu, walau fungsi penghitungnya
   (`recommendIntervalKm()`) sudah ada (dipakai di alur lain: saran
   override interval kategori yang **sudah ada**).

## Perbaikan
`modules/vehicle/sparepart-servis.js`:
- **`historyMatchesName(log, nameLower)`** (baru) — versi generik
  `servisLogMatchesCat()` yang menerima string nama part langsung
  (bukan objek kategori), karena kandidat di sini belum tentu punya
  kategori resmi/`cat.id`.
- **`historyStatsForName(vehicleId, name)`** (baru) — reuse pola persis
  `recommendIntervalKm()` (rata-rata jarak KM antar catatan, minimal 2
  data KM valid & berurutan naik), tapi filter via `historyMatchesName()`
  by teks nama. Murni baca `D.servisLogs`, 0 tulis.
- **`recommendCategories()`** — diperluas, backward compatible:
  - Tier `manual`/`generic` (perilaku lama tidak berubah: sumber &
    `intervalKm` tetap dari TORSI_DB/estimasi umum) sekarang dilampiri
    field `history` (`{count, avgKm}`) dan **disort** supaya kandidat
    yang sudah pernah dicatat manual (`history.count > 0`) diprioritaskan
    di urutan atas tier masing-masing.
  - **Tier `history` baru (`tier3`)** — kandidat tambahan murni dari nama
    item `D.servisLogs` kendaraan aktif yang TIDAK ada di TORSI_DB maupun
    `GENERIC_RECOMMEND_NAMES`, dengan syarat ≥2 catatan nama sama +
    `avgKm` berhasil dihitung. `intervalKm` diisi dari `avgKm` (pola KM
    asli), bukan buku manual/estimasi umum — dilabeli eksplisit beda di
    `source`.
  - `all` = `tier1 (manual) → tier3 (history) → tier2 (generic)` —
    kandidat berbasis data pabrikan tetap paling diutamakan, lalu pola
    servis asli pengguna, baru estimasi umum generik.
  - Tetap 100% read-only (tidak pernah panggil `save()`).
- `openRecommendBox()` — UI checklist menampilkan badge baru `📝 Riwayat
  servis` untuk tier `history`, dan catatan tambahan "Sudah dicatat Nx di
  riwayat servis kendaraan ini" (+ pola KM asli kalau beda ≥100 km dari
  angka rekomendasi) untuk kandidat tier `manual`/`generic` yang juga
  match histori.

## Test
`tests/sparepart-recommend-categories.test.js` (+4 test baru, total 12,
semua lolos):
1. Kandidat tier manual/generic yang match riwayat servis ditandai
   `history` dan diprioritaskan (didahulukan) dalam tiernya.
2. Part yang sering dicatat manual tapi TIDAK ada di TORSI_DB/generic
   tetap muncul (tier `history` baru), `intervalKm` = pola KM asli.
3. Riwayat < 2 catatan TIDAK memicu tier `history` (data belum cukup).
4. Cross-check riwayat tetap PURE — tidak pernah `save()` atau menulis
   `D.servisLogs`/`D.sparepartCats`.

## Hasil test & build
```
node --test tests/*.test.js   → 4730 pass, 7 fail (PRE-EXISTING, tidak
                                 terkait perubahan ini — sama persis di
                                 baseline patch sebelum fix ini, area
                                 populateVehicleSelect()/autoSuggestInterval()
                                 modal edit kategori, lihat detail di bawah)
```
7 kegagalan pre-existing (diverifikasi identik sebelum & sesudah patch
ini, tidak disentuh sama sekali oleh perubahan ini):
`EDIT kategori existing — dropdown kendaraan TERBUKA...` (x4),
`EDIT stok existing — dropdown terbuka...`,
`openCatModal() EDIT kategori existing — box AI otomatis terisi...`,
`autoSuggestInterval() — nama kosong TIDAK toast error...`.

## Scope
Hanya `modules/vehicle/sparepart-servis.js` (source) +
`tests/sparepart-recommend-categories.test.js` (test) yang disentuh.
Tidak ada perubahan skema data, tidak ada migrasi.

---

# LAMPIRAN — Temuan Audit Terpisah: Fix Sesi "S657" Hilang dari Backup

## Temuan
Saat audit regresi (7 test gagal pra-eksisting di `tests/sparepart-
catmodal-vehicle-edit-audit.test.js`), ditemukan `docs/BUILD-TEST-REGRESI-
S657.md` di backup yang di-upload mengklaim patch "S657 (sparepart-cat-
vehicle-editable)" **sudah** membuat seluruh 4718 test lolos (0 fail),
termasuk file test tsb. Tapi kode implementasinya (perubahan di
`modules/vehicle/sparepart-servis.js` yang seharusnya dibawa patch S657)
**TIDAK ADA** di backup ini — hanya file test-nya (RED) dan dokumen
verifikasinya yang ikut ter-merge, source fix-nya sendiri hilang.

**Kesimpulan: ya, ini kejadian nyata dari skenario yang ditanyakan** — patch
ZIP sesi S657 kemungkinan besar tidak pernah benar-benar di-upload/di-
terapkan ke repo utama sebelum backup `app-main__5_.zip` ini diambil (gap
di workflow ZIP-as-source-of-truth: tes + docs ter-commit tapi ZIP source
fix-nya sendiri terlewat), BUKAN karena tertimpa oleh patch rekomendasi-
kategori-servis (patch itu tidak pernah menyentuh
`populateVehicleSelect()`/`saveCat()`/`saveStock()`/`suggestInterval()`
sama sekali).

## Perbaikan (re-implementasi S657, di file yang SAMA dgn fix di atas)
`modules/vehicle/sparepart-servis.js`:
- `populateVehicleSelect(elId,currentValue,isEdit)` — TAMBAH baru tetap
  dikunci/disabled ikut `curVehicleId` (S629, tidak berubah). EDIT
  kategori/stok existing kini dropdown **terbuka** (enabled), nilai awal =
  `vehicleId` tersimpan pada kategori/stok itu sendiri (`currentValue`),
  bukan dipaksa `curVehicleId`.
- `saveCat()`/`saveStock()` — vehicleId yang disimpan: TAMBAH baru tetap
  dari `curVehicleId` langsung (S629). EDIT existing kini dibaca langsung
  dari nilai select (dropdown-nya sudah terbuka di mode ini).
- `openCatModal()` — mode EDIT sekarang otomatis memanggil
  `Sparepart.autoSuggestInterval()` (baru) supaya box rekomendasi AI
  langsung terisi tanpa tap tombol manual; mode TAMBAH tetap kosongkan box
  spt sebelumnya.
- `_renderSuggestBox(name)` (baru, top-level) — extract innerHTML-building
  yang sudah ada di `suggestInterval()` supaya dipakai bersama tanpa
  duplikasi logic.
- `Sparepart.autoSuggestInterval()` (baru) — sama seperti
  `suggestInterval()` tapi TIDAK toast error kalau nama kosong (dipanggil
  otomatis, bukan hasil tap user).

## Test
`tests/sparepart-catmodal-vehicle-edit-audit.test.js` — sudah ada
sebelumnya (RED, dibawa entah dari sesi mana), sekarang **10/10 pass**
tanpa diubah sedikit pun (murni implementasi source menyusul test yang
sudah ditulis).

## Hasil test & build gabungan (kedua fix di atas)
```
node --test tests/*.test.js        → 4730 pass, 0 fail
node scripts/verify-window-expose.js → OK (76 modul, semua ter-expose)
```

## Rekomendasi ke N
Supaya kejadian ini tidak terulang: sebelum menganggap sesi manapun
"selesai", cross-check bahwa ZIP source yang di-generate BENAR sudah
ter-upload/ter-terapkan ke repo utama sebelum lanjut sesi berikutnya —
`docs/BUILD-TEST-REGRESI-S657.md` sendiri sudah membuktikan build+test
lolos di sandbox sesi asalnya, artinya kemungkinan besar ZIP-nya memang
sempat dibuat tapi tidak sempat/lupa di-upload ke repo utama sebelum
backup diambil. Kalau ada ZIP sesi lama yang belum yakin sudah ter-apply,
aman untuk diterapkan ulang — perubahan di atas idempotent (menimpa
fungsi yang sama, tidak menduplikasi apa pun).

---

# LAMPIRAN 2 — FITUR BARU: "Interval Waktu (Bulan, opsional)" per Kategori Sparepart

## Konteks
Permintaan user: sebagian kategori servis idealnya diingatkan berbasis
WAKTU juga, bukan cuma KM — mis. Minyak Rem/Aki bisa menurun kualitasnya
meski kendaraan jarang dipakai (km baru dikit tapi sudah lewat 6 bulan).
Sebelum fitur ini, `getEffectiveIntervalKm()`/`predictService()`/
`Servis.renderReminder()` murni satu sumbu (km) — kategori spt itu bisa
"terlambat" bertahun-tahun tanpa pernah kebaca sistem selama km-nya belum
tercapai.

## Perbaikan
`modules/vehicle/sparepart-servis.js` (murni tambahan, tidak mengubah
signature/logic lama):
- **`getEffectiveIntervalBulan(cat)`** (baru) — baca `cat.intervalBulan`,
  balikin `null` kalau tidak diisi/0 (backward compatible, tanpa override
  per-kendaraan — beda dari `getEffectiveIntervalKm()`).
- **`getLastServiceDateForCat(vehicleId,cat)`** (baru) — twin tanggal dari
  `getLastServiceKmForCat`, reuse `servisLogMatchesCat()` yang sama persis.
- **`monthsSinceISO(dateISO,nowISO)`** (baru) — selisih bulan (desimal)
  antar 2 tanggal ISO, konstanta 30.4368 hari/bulan (rata-rata astronomis).
- **`computeServiceUrgency({vehicleId,cat,curKm,kmPerDay,nowISO})`** (baru)
  — SATU-SATUNYA titik hitung status/sisa servis yang sadar 2 sumbu.
  Dihitung sbg **fraksi sisa** tiap sumbu (`fracRemainKm`/`fracRemainBulan`,
  1=baru diservis .. 0=jatuh tempo .. negatif=lewat) — satu-satunya cara
  adil membandingkan km vs bulan (unit beda). Axis dgn fraksi **paling
  kecil** yang menang ("mana yang lebih dulu tercapai", konvensi servis
  standar km-ATAU-bulan). Tanpa `intervalBulan`, hasilnya **identik
  matematis** dgn formula km lama — 0 perubahan perilaku data existing.
- **`predictService()`** — diubah memakai `computeServiceUrgency()`
  menggantikan perhitungan `sisaKm`/`status` inline. Field baru di tiap
  baris: `sisaBulan`, `intervalBulan`, `limitingAxis`. Urutan sort
  **sengaja dipertahankan** `sisaKm` ascending (tidak ikut `limitingAxis`)
  supaya urutan kategori pure-km existing tidak berubah/regresi.
- **`ensureIntervalBulanField()`** (baru) — injeksi runtime input
  "Interval Waktu (Bulan, opsional)" ke modal Kategori Sparepart (anchor:
  `#sparepartInterval`), idempotent & no-op-safe kalau anchor tidak ada di
  DOM (mis. harness test). Template statis modal
  (`modules/shared/modals.js`) di luar cakupan patch ini, jadi dipasang
  lewat JS, bukan HTML permanen.
- **`openCatModal()`/`saveCat()`** — baca/tulis `cat.intervalBulan` lewat
  field baru di atas.
- **`renderCatList()`** — meta text jadi `"Setiap X km atau Y bln"` kalau
  keduanya diisi (sebelumnya cuma `"Setiap X km"`).
- **CSV** (`parseCategoryCSV`/`commitCategoryCSV`/`exportCategoryCSV`) —
  kolom `interval_bulan` opsional & order-agnostic (ditambahkan setelah
  `interval_km`). File CSV lama tanpa kolom ini tetap terbaca normal
  (`intervalBulan` default 0).

`car-notes.js`:
- **`Servis.renderReminder()`** — kartu "🔔 Pengingat Servis" (yang user
  lihat langsung di Dashboard/tab Catatan Kendaraan) sekarang memanggil
  `computeServiceUrgency()` untuk menentukan `status`/`severity`
  (menggantikan perhitungan `sisa<=0`/`sisa<=intervalKm*0.15` inline).
  Progress bar & label km (`pct`, `msg`, `Sisa X km`) **tetap dihitung
  dari `sisaKm` seperti sebelumnya** (0 perubahan tampilan lama) — cuma
  ditambah catatan "· sisa ~N bln" / "· ⚠️ lewat N bln" kalau axis bulan
  yang lebih mendesak (`limitingAxis==='bulan'`) DAN kategori itu memang
  punya `intervalBulan` diatur (fail-open, kategori pure-km tidak
  menambah noise apa pun di tampilan).

## Test
`tests/sparepart-interval-bulan.test.js` (baru, 11 test, semua lolos):
1. `getEffectiveIntervalBulan()` — null kalau kosong/0, angka kalau >0.
2. `monthsSinceISO()` — hitung selisih bulan benar, null kalau tanggal
   kosong.
3. `getLastServiceDateForCat()` — ambil tanggal log terakhir yang match
   kategori, null kalau tidak ada.
4. `computeServiceUrgency()` — kategori TANPA `intervalBulan` identik
   dengan formula km lama.
5. `computeServiceUrgency()` — axis bulan yang lebih mendesak MENANG
   (kasus Minyak Rem: km masih jauh tapi sudah >1 tahun sejak servis
   terakhir → `status:'lewat'`, `limitingAxis:'bulan'`).
6. `predictService()` — kategori dgn `intervalBulan` mendesak ikut
   ditandai `'lewat'` walau `sisaKm` masih banyak.
7. `ensureIntervalBulanField()` — balikin `null` (no-op) kalau anchor DOM
   tidak ada.
8. `saveCat()` — baca & simpan `cat.intervalBulan` dari field baru,
   kategori baru maupun edit existing (termasuk dikosongkan → tersimpan 0).
9. `renderCatList()` — meta text menambahkan "atau Y bln".
10. `parseCategoryCSV()`/`commitCategoryCSV()`/`exportCategoryCSV()` —
    round-trip kolom `interval_bulan`.
11. `parseCategoryCSV()` — file CSV lama tanpa kolom `interval_bulan`
    tetap kompatibel (default 0, tidak error).

## Hasil test & build
```
node --test tests/*.test.js → 4741 pass, 0 fail
                               (4730 test lama + 11 test baru,
                               dijalankan di atas app-main lengkap
                               setelah patch ini + kedua fix di
                               LAMPIRAN 1 di atas diterapkan)
```

## Scope
`modules/vehicle/sparepart-servis.js` + `car-notes.js` (source) +
`tests/sparepart-interval-bulan.test.js` (test, baru) yang disentuh.
Tidak ada perubahan skema data yang breaking — `cat.intervalBulan` field
baru opsional, default 0/tidak ada = perilaku lama persis. Tidak ada
migrasi data lama yang diperlukan.

## Belum dikerjakan (di luar scope sesi ini, untuk sesi lanjutan)
- Field permanen di template HTML modal (`modules/shared/modals.js`),
  menggantikan injeksi runtime `ensureIntervalBulanField()`.
- Override `intervalBulan` per-kendaraan (serupa `intervalOverrides`
  untuk km) — saat ini `intervalBulan` murni 1 nilai global per kategori.
- `recommendCategories()` (LAMPIRAN sebelumnya) belum menyertakan
  estimasi/rekomendasi nilai bulan, hanya km.
- `maintenanceForecast()` belum di-cross-check terhadap `sisaBulan`
  (saat ini masih murni pakai `estDateISO` dari sumbu km).

