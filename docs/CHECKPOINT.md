# CHECKPOINT.md — Status granular sesi berjalan (update tiap sesi/step)

Kalau sesi terputus di tengah jalan, lanjutkan dari **Current Step**,
JANGAN audit/implement/test/build ulang bagian yang sudah **Completed**.

## Current Session

Sesi 348 (2026-08-01) — FIX BUG KRITIS (audit ulang lanjutan Sesi 347,
1 modul terlewat: AlokasiAset)

**Konteks:** User minta audit ulang apakah masih ada bug serupa (window
expose). Audit ulang penuh source-tree — kali ini scan otomatis semua
`const`/`let`/`var X={` top-level yang dipakai lewat `data-action="X.xxx"`
tapi TANPA `window.X=X` — menemukan **1 modul lagi**: `AlokasiAset` di
`modules/asset/aset.js`. Terlewat di Sesi 346 karena file itu punya 10 const
top-level (ALOKASI_PRESETS, AlokasiAset, AssetInsight, Aset, Penyusutan,
PajakAset, LaporanAset, IDBStore, PORTFOLIO_LABELS, TimelineW) dan audit
sesi itu cuma menemukan `Aset`, tidak ngecek const lain di file yang sama.

**Root cause SAMA PERSIS** Sesi 345/346/347: 3 tombol chip risiko alokasi
aset (Konservatif/Moderat/Agresif — `app_production.html`/`index.html`)
pakai `data-action="AlokasiAset.setRisk"`, di-resolve dispatcher global
lewat `window['AlokasiAset']['setRisk']`. Tanpa `window.AlokasiAset`,
ketiga tombol gagal diam-diam.

**Fix**: `if (typeof AlokasiAset !== 'undefined') window.AlokasiAset =
AlokasiAset;` ditambahkan tepat setelah `}` penutup objek (baris 99).
0 perubahan logic/routing lain.

**Audit ulang menyeluruh** (termasuk `let`/`var`, bukan cuma `const`, dan
cek deklarasi ganda di >1 file) tidak menemukan modul lain selain
`AlokasiAset` — 30 modul Sesi 347 + 14 modul Sesi 345/346 semuanya
terverifikasi ulang benar via `FILE-MAP.md` (identifier-to-file mapping
auto-generated).

## Test

`node --test tests/*.test.js` -> **2402/2402 pass, 0 fail** (2399 lama + 3
baru di `tests/window-expose-audit-s348.test.js`).

## Build

`node scripts/build.js s348-fix-window-expose-audit-alokasiaset` -> sukses,
`?v=1012`.

## ZIP

`kw_release_v1012_s348-window-expose-audit-alokasiaset.zip` &
`patch-s348-window-expose-audit-alokasiaset.zip` — dibuat & dikirim ke
user.

---

## Current Session (sebelumnya)

Sesi 347 (2026-08-01) — FIX BUG KRITIS (lanjutan audit Sesi 346, temuan
lanjutan window-expose)

**Konteks:** Audit penuh source-tree (bukan cuma log ringkasan) untuk pola
`const Owner={...}` tanpa `window.Owner=Owner` yang dipakai lewat
`data-action="Owner.xxx"`. Sesi 345/346 menemukan & memperbaiki 14 modul
(car-notes.js + 13 modul). Sesi ini menemukan **30 modul tambahan**:

`ai-chat.js` (Advisor, AIRecommendCard, AIStatusCard, AISimulateWidget,
AIScenarioWidget, AIHealthCheckWidget, AIWidget), `budget.js` (BudgetTabs,
BudgetReko), `modules/asset/aset-emas-impor.js` (GoldImport, GoldZakat),
`modules/business/tukang-absensi.js` (Tukang), `modules/dashboard-hub/dashboard-hub.js`
(DashboardHub), `modules/finance/pajak-pbb-zakat.js` (RefAI),
`modules/finance/piutang-utang.js` (Bill),
`modules/finance/tagihan-kalender.js` (BillFallbackScan),
`modules/shared/modules-calc.js` (DanaDaruratAI, FinCoach),
`modules/shared/scan-ocr.js` (BillMultiScan, UniversalScan),
`modules/shop/cobek-pricing.js` (PriceReko, OngkirCalc, PriceRekoWidget,
StockRekoWidget, WeightBulkWidget), `lifeos/ui/*.js` × 5 (LifeOSHome,
LifeOSLifeObjects, LifeOSPlugins, LifeOSProjects, LifeOSReview).

**Deviasi:** `DashboardHub` dites di sandbox vm TANPA global `window` sama
sekali (`tests/dashboard-hub-goto-subtab.test.js`), jadi guard plain
`if (typeof Owner!=='undefined') window.Owner=Owner;` dari Sesi 345/346
throw `ReferenceError: window is not defined` di sana. Guard diganti jadi
`if (typeof window !== 'undefined' && typeof Owner !== 'undefined')` khusus
utk insersi ini (30 modul), sama presedennya dgn `scanner-session.js` &
`ai-core.js`.

**Catatan teknis:** `Tukang` butuh `reset-gaji-mingguan.js` (`getWeekRange`)
dimuat duluan, sama pola dgn `Payroll` di Sesi 346. `RefAI` & `LifeOSReview`
sempat butuh perbaikan tooling insersi manual (brace-counting naif salah
hitung gara-gara regex literal berisi backtick literal di `RefAI`, dan
nested template literal di `LifeOSReview`) — sudah diverifikasi manual titik
insersinya persis setelah `}` penutup objek masing-masing.

## Test

`node --test tests/*.test.js` -> **2399/2399 pass, 0 fail** (2309 lama + 90
baru di `tests/window-expose-audit-s347.test.js`, 30 modul × 3 assertion).

## Build

`node scripts/build.js s347-fix-window-expose-audit-30-modules` -> sukses,
`?v=1011`.

## ZIP

`kw_release_v1011_s347-window-expose-audit-30-modules.zip` &
`patch-s347-window-expose-audit-30-modules.zip` — dibuat & dikirim ke user.

---

## Current Session (sebelumnya)

Sesi 346 (2026-08-01) — FIX BUG KRITIS (lanjutan audit Sesi 345, temuan
tambahan yang sengaja tidak disentuh sesi lalu): konfirmasi & perbaiki pola
bug `const Owner={...}` top-level tanpa `window.Owner=Owner` di **13 modul**
lain — `Budget` (`budget.js`), `Aset` (`modules/asset/aset.js`), `Kasir`
(`modules/business/kasir.js`), `Payroll`
(`modules/business/payroll-absensi.js`), `EduFund`
(`modules/finance/edukasi-dana.js`), `LinkTx` (`modules/finance/linktx.js`),
`WorthIt` (`modules/finance/worthit.js`), `LifeBalance`
(`modules/home/hidup-seimbang.js`), `Refleksi`
(`modules/home/refleksi-selfcare.js`), `Pensiun`
(`modules/shared/modules-calc.js`), `Etalase`
(`modules/shop/cobek-etalase.js`), `Order` (`modules/shop/cobek-order.js`),
`Sparepart` (`modules/vehicle/sparepart-servis.js`). Akar masalah SAMA
PERSIS Sesi 345: dispatcher klik global
(`features-helpers-global-security.js`) selalu resolve
`data-action="Owner.method"` lewat `window[Owner][method]`, dan `const
Owner={...}` top-level di script biasa HANYA membuat binding lexical-scope,
BUKAN properti `window` — jadi SEMUA tombol dengan data-action `Owner.xxx`
di 13 modul ini gagal diam-diam. **Fix**: tambah `window.Owner = Owner;`
tepat setelah tiap deklarasi objek selesai, mengikuti pola comment yang
sama persis dgn Sesi 345. Audit dilakukan lewat pencarian eksplisit
`^const NAME={` utk tiap nama yg dicurigai + verifikasi `window.NAME=`
belum ada di file itu — semua 13 dikonfirmasi memang belum ter-ekspos.
Insersi titik penutup objek dicek brace-counting otomatis (skrip audit
sekali-pakai) + verifikasi manual `node --check` per file; 1 kasus
(`Payroll`) sempat salah sasar ke dalam komentar header karena marker
match ganda — diperbaiki dgn marker yang di-anchor ke awal baris; 1 kasus
(`Sparepart`) brace-counter gagal cari titik tutup krn objeknya sangat
panjang & kompleks — titik tutup dikonfirmasi manual via pencarian baris
`};` top-level tepat sebelum `const SparepartCsvImport={` berikutnya. +39
test regresi baru (`tests/window-expose-audit-s346.test.js`, 13 modul × 3
assertion: window.Owner ada, identik dgn binding lexical, method bisa
di-resolve gaya dispatcher `window['Owner']['method']`). Test 2309/2309
PASS (2270 lama + 39 baru, 2x — sebelum & sesudah build). Build sukses,
`?v=1010` (`s346-fix-window-expose-audit-13-modules`).

---

Sesi 345 (2026-08-01) — FIX BUG KRITIS (laporan user: tombol Car Notes tidak
bereaksi, 0 toast): `car-notes.js` — tiga objek fitur `BBM`, `Servis`, `Torsi`
dideklarasikan `const` top-level. Di script biasa (bukan module), `const`/
`let` top-level **tidak otomatis** jadi properti `window`. Dispatcher klik
global (`features-helpers-global-security.js`) selalu resolve
`data-action="Owner.method"` lewat `window[Owner][method]` — karena
`window.BBM`/`window.Servis`/`window.Torsi` tidak pernah ada, SEMUA tombol
dengan data-action `BBM.xxx`/`Servis.xxx`/`Torsi.xxx` gagal diam-diam (chip
rekomendasi part di form Servis, semua interaksi modal Kalkulator Torsi:
pilih kategori, toggle checklist, mode kalkulator, dst). Pola bug identik yang
sudah pernah terjadi & diperbaiki utk `FuelModal`/`FuelBarCorrection`/
`FuelTankProfileUI` (lihat komentar `fuel-modal.js`) — kali ini kelewat utk
BBM/Servis/Torsi. **Fix**: tambah `window.BBM = BBM`, `window.Servis =
Servis`, `window.Torsi = Torsi` tepat setelah tiap deklarasi objek di
`car-notes.js`, dengan komentar penjelasan mengikuti pola existing. +3 test
regresi baru (`tests/car-notes-window-expose-s345.test.js`) yang memuat
`car-notes.js` ASLI lewat harness vm & memverifikasi `window.BBM/Servis/Torsi`
ada, identik dgn binding lexical-nya, dan method-nya benar-benar bisa
di-resolve gaya dispatcher (`window['Owner']['method']`). **Temuan tambahan
di luar scope sesi ini** (sengaja tidak disentuh, satu fokus per sesi): pola
`const Owner={...}` tanpa `window.Owner=Owner` kemungkinan juga ada di modul
lain — `Budget`, `Aset`, `Kasir`, `Payroll`, `EduFund`, `LinkTx`, `WorthIt`,
`LifeBalance`, `Refleksi`, `Pensiun`, `Etalase`, `Order`, `Sparepart`, dll —
rekomendasi kuat utk sesi audit terpisah. Test 2270/2270 PASS (2267 lama +
3 baru, 2x — sebelum & sesudah build). Build sukses, `?v=1009`
(`s345-fix-carnotes-window-expose-bbm-servis-torsi`).

---

Sesi 344 (2026-08-01) — FIX UX (laporan user via 2 screenshot, tab Lunas &
Bayar Daftar Tagihan): kartu duplikat "sudah dibayar periode ini"
(`_paidPeriodOnly`, S322) di tab Lunas terlihat "tombol tidak sesuai" — ✅
Bayar tidak tampil (SUDAH BENAR by design, mencegah dobel-bayar periode yang
sama) & ✏️ malah membuka Edit Transaksi, bukan Edit Tagihan (JUGA SUDAH BENAR
by design — bill masih aktif, `openBillModal()` redirect ke `editTx()` transaksi
pembayaran periode ini, lihat catatan gap "Edit Tagihan vs Detail Cicilan" yang
sudah ada). **Root cause sebenarnya**: label tombol ✏️ generik "Edit" tidak
menjelaskan bahwa hasilnya lompat ke Edit Transaksi, bukan pengaturan tagihan —
menyesatkan ekspektasi user. **Fix (murni copy/label, 0 perubahan
routing/logic)**: `renderBillItemHtml()` (`modules/shared/modules-render.js`)
— title/aria-label tombol ✏️ khusus kartu `_paidPeriodOnly` diganti dari "Edit"
jadi **"Edit Pembayaran Bulan Ini"**. `openBillModal()`/`editTx()`/tombol ✅
yang disembunyikan TIDAK disentuh sama sekali (sudah benar, berisiko regresi
tinggi kalau diubah — banyak bugfix history terkait). 0 test baru diperlukan
(tidak ada assertion pada title/aria-label lama). Test 2267/2267 PASS (2x —
sebelum & sesudah build). Build sukses, `?v=1008`
(`s344-fix-bill-paidperiod-edit-label`).

---

Sesi 343 (2026-08-01) — Tambah test baru `tests/pajak-pbb-zakat-crud.test.js`
(cakupan `modules/finance/pajak-pbb-zakat.js` — PBB/Zakat/PPh21/PajakUMKM, 375
baris, sebelumnya 0 test file yang menyentuhnya langsung — lanjutan pola test
"*-crud.test.js" dari sesi-sesi sebelumnya: linktx-crud, renovasi-modal-crud,
refleksi-selfcare-crud, edukasi-dana-crud, dst). +22 test baru: `PBB.hitung()`
(save() ke default vs per-aset, terisolasi benar), `PBB.ikatTagihan()` (create
tagihan baru vs update tagihan existing by `pbbLink`), `Zakat.hitungPenghasilan()/
hitungMaal()/hitungFitrah()` (kalkulasi + save()), `Zakat.catatDibayar()` (create
log+transaksi, guard jumlah 0 & askConfirm ditolak) & `delLog()` (delete, guard
askConfirm ditolak), `PPh21.getPTKP()/hitungProgresif()` (murni), `PPh21.hitung()/
isiDariTransaksi()` (save() + DOM), `PajakUMKM.render()` (murni, tanpa save()).
0 source code diubah — murni test asset baru. Test 2267/2267 PASS (2x — sebelum
& sesudah build). Build sukses, `?v=1007`
(`s343-pajak-pbb-zakat-crud-test`).

---

Sesi 332 lanjutan 3 (2026-08-01) — Fix 2 temuan terakhir yang masih tersisa
dari `AUDIT-DEEP-modules-vehicle-v993-s332.md` §6: **VEH-001**
(race-condition timeout scanner vs `decodeContinuously()` — akar penyebab:
timeout seharusnya hanya membungkus fase inisialisasi kamera
(`getUserMedia()`), bukan keseluruhan lifecycle `decodeContinuously()`;
timer 10 detik
di `vehicle-scanner.js` & `sparepart-scanner.js` sekarang dibatalkan begitu
kamera benar-benar menyala, lewat listener `loadedmetadata` sekali pada
`video`, bukan lagi me-race seluruh sesi continuous-scan) dan **VEH-005**
(kontrak `search({vehicleId})` sekarang reuse `filterForVehicle()` di
`vehicle-catalog.js`, jadi part universal — `compatibleVehicleIds` kosong/
belum diisi — ikut lolos, konsisten dgn `filterForVehicle()`, bukan
tersingkir). +8 tes baru (3 di `vehicle-scanner.test.js`, 3 di
`sparepart-scanner.test.js`, 2 di `vehicle-catalog.test.js`). VEH-006 tetap
sengaja tidak di-fix (sudah didokumentasikan tim, GIGO by design,
`TASK-142`). **Semua 7 temuan VEH-001..007 dari audit sekarang selesai
ditangani** (VEH-006 dikecualikan by design). Test 2067/2067 (naik dari
2059). Build sukses, `?v=996`. Detail: `CHANGELOG.md` § Sesi 332 (lanjutan
3).

## Sesi Sebelumnya (lanjutan 2)

Sesi 332 lanjutan 2 (2026-08-01) — Fix 2 temuan berikutnya dari
`AUDIT-DEEP-modules-vehicle-v993-s332.md` §6: **VEH-002** (`vehicle-catalog-
ui.js` — "Pilih Semua" sekarang scope ke `_catVisibleIds`, item yg sedang
tampil setelah filter kendaraan/pencarian, bukan seluruh katalog) dan
**VEH-007** (`backup-restore.js` `importCarData()` — field angka string dari
JSON restore user dikoersi ke Number lewat `_numOrUndef()`/
`_sanitizeNumFields()`, cegah reduce/SUM jadi string-concat). +5 tes baru.
VEH-001 (race-condition scanner) & VEH-005 (kontrak API, dampak rendah)
**belum dikerjakan** — lihat audit §5 utk prioritas lanjutan. Test
2059/2059 (naik dari 2054). Build sukses, `?v=995`. Detail: `CHANGELOG.md`
§ Sesi 332 (lanjutan 2).

## Sesi Sebelumnya

Sesi 332 lanjutan (2026-08-01) — Fix 2 temuan **termudah** dari
`AUDIT-DEEP-modules-vehicle-v993-s332.md` §6 (VEH-003, VEH-004), scoped
ke `modules/vehicle/vehicle-core.js` saja. VEH-003: `saveKm()` sekarang
tolak KM negatif (`km<=0`), samakan kontrak dgn `commitCurKmEdit()`.
VEH-004: kapasitas (kg/m³/kWh) & interval servis (mesin/transmisi) kini
ditolak kalau negatif — helper baru `_posOrNull()` di JS + atribut
`min="0"` di 5 field HTML. VEH-001/002/005/007 **belum dikerjakan**
(lebih kompleks — race-condition promise, filter katalog, kontrak API,
tipe data restore backup), lihat audit §5 utk prioritas lanjutan. Test
2054/2054 (sebelum & sesudah). Build sukses, `?v=994`. Detail:
`CHANGELOG.md` § Sesi 332 (lanjutan).

Sesi 332 (2026-08-01) — Update baseline `docs/AUDIT_MATRIX.md` § Coverage
Baseline (diminta user langsung, bukan tindak lanjut poin audit S324).
Angka lama (625 total/474 JS/137 MD/"13+" module families) sudah lama
usang & di-flag non-fatal oleh `lintDocsBaselineCountDrift()` tiap build
sejak S324/S325. Diganti ke angka sungguhan repo saat ini: 629 total, 475
JS, 140 MD, 12 module families (dihitung eksak, bukan lagi perkiraan).
0 perubahan kode. Test 2054/2054 (sebelum & sesudah). Build sukses,
`?v=993` — peringatan drift baseline sekarang hilang dari output build.
Detail: `CHANGELOG.md` § Sesi 332.

Sesi 331 (2026-08-01) — MAINTAINABILITY (tindak lanjut poin #3 — TERAKHIR
— dari daftar saran user pasca-audit S324, "coverage per modul"): tambah
`scripts/generate-coverage-per-module.js` (auto-generate, pola sama
`generate-file-map.js`) yang menghasilkan `docs/COVERAGE-PER-MODULE.md` —
tabel per module family (`modules/<x>`, `economic-intelligence`, `lifeos`,
`root`): jumlah file source vs jumlah file test yang menyentuhnya
langsung (structural, bukan code-coverage ter-instrumentasi — batasan ini
didokumentasikan eksplisit). Dipanggil otomatis di akhir `node build.js`
sukses (try/catch non-fatal, sama pola FILE-MAP.md). Hasil pertama: 15
family, cuma 1 (`modules/home`) yang 0 test file menyentuhnya langsung.
`node --test`: 2054/2054 PASS sebelum & sesudah. SELESAI PENUH. **Ini
poin TERAKHIR dari 8 poin daftar saran maintainability S324 — semuanya
sudah dikerjakan.** Ringkasan siapa mengerjakan poin mana: #1 baseline
auto-generate (sudah ada sebelum S325), #2 lint drift generik (S328), #3
coverage per modul (S331, sesi ini), #4 SSOT operasi lint (S329), #5
guard empty-catch (S330), #6 batasi ukuran file (S325), #7 peta
dependency (S327), #8 convention doc (S326). Detail lengkap:
`CHANGELOG.md` § Sesi 331.

---

Sesi 330 (2026-08-01) — MAINTAINABILITY (tindak lanjut poin #5 dari
daftar saran user pasca-audit S324, "guard empty-catch"): tambah
`lintEmptyCatchGuard()` + helper `findMatchingBrace()` (`scripts/build.js`),
didaftarkan ke `LINT_REGISTRY` (S329) sbg entry ke-8, severity `'warning'`.
Scan `ALL_SOURCE` cari blok `catch{...}` yang body-nya 100% kosong (tanpa
kode maupun komentar) — ditemukan 36 pre-existing di 15 file, dibiarkan
sbg warning (di luar scope "guard" utk membereskan semuanya sekaligus,
butuh tinjauan kasus per kasus). 0 catch block diubah, 0 fungsi lint lama
disentuh. `node --test`: 2054/2054 PASS sebelum & sesudah. SELESAI PENUH.
Poin #3 (coverage per modul) — SATU-SATUNYA sisa dari daftar saran S324 —
masih BELUM dikerjakan. Detail lengkap: `CHANGELOG.md` § Sesi 330.

---

Sesi 329 (2026-08-01) — MAINTAINABILITY (tindak lanjut poin #4 dari
daftar saran user pasca-audit S324, "SSOT operasi lint"): refactor
`main()` (`scripts/build.js`) dari 7 blok wiring lint bespoke duplikat
jadi config-driven — `LINT_REGISTRY` (7 entry: pesan/severity/advice per
lint) + `runLintRegistry()` (1 loop generik yang menjalankan &
melaporkan semuanya, blocking -> `process.exit(1)`, warning ->
`console.warn` build tetap lanjut). Ke-7 fungsi lint itu sendiri
(`lintDnoneStyleDisplayMismatch()` dkk) 0 baris diubah — cuma dipanggil
lewat referensi. Output `node scripts/build.js` diverifikasi identik
sebelum/sesudah refactor (teks pesan & urutan check sama persis). 0
`docs/AUDIT_MATRIX.md`/file lain disentuh. SELESAI PENUH. Poin #3 & #5
(coverage per modul, guard empty-catch) masih BELUM dikerjakan. Detail
lengkap: `CHANGELOG.md` § Sesi 329.

---

Sesi 328 (2026-08-01) — MAINTAINABILITY (tindak lanjut poin #2 dari
daftar saran user pasca-audit S324, "lint drift generik"): refactor
`lintDocsBaselineCountDrift()` (`scripts/build.js`) dari hardcode 4
label jadi config-driven (`FILE_COUNT_LINT_LABELS` +
`FILE_COUNT_LINT_DOCS`), satu kali walk repo, generik terhadap baris
`| Label | Angka |` apa pun di dokumen target. Menambah cakupan 2 label
yang sebelumnya diam-diam tidak dicek: `JSON`, `CSS`. 0 baris
`docs/AUDIT_MATRIX.md` diedit permanen (drift pre-existing "Total
files"/"Markdown" dari S326/S327 tetap ada sbg warning, di luar scope).
SELESAI PENUH. Poin #3–5 (coverage per modul, SSOT operasi lint, guard
empty-catch) masih BELUM dikerjakan. Detail lengkap: `CHANGELOG.md` §
Sesi 328.

---

Sesi 327 (2026-08-01) — DOKUMENTASI (tindak lanjut poin #7 dari daftar
saran user pasca-audit S324, "peta ketergantungan ringan"): tambah
`docs/architecture/DEPENDENCY-MAP.md` — tabel MANUAL (bukan graph
otomatis — percobaan otomatis di sesi ini terbukti terlalu noisy, 718
"siklus" mayoritas false-positive, di-revert) untuk 9 identifier/modul
inti lintas-domain + jumlah pemanggil hasil grep sungguhan. 0 kode
disentuh (hasil akhir). SELESAI PENUH. Poin #2–5 (lint drift generik,
coverage per modul, SSOT operasi lint, guard empty-catch) masih BELUM
dikerjakan — lihat catatan di `CHANGELOG.md` § Sesi 327 kenapa
pendekatan otomatis untuk hal semacam ini perlu hati-hati di codebase
script-global ini. Detail lengkap: `CHANGELOG.md` § Sesi 327.

---

Sesi 326 (2026-08-01) — DOKUMENTASI (tindak lanjut poin #8 dari daftar
saran user pasca-audit S324, "Convention doc untuk pola berulang"): tambah
`docs/architecture/ADR-029-data-action-convention.md` — dokumentasi murni
konvensi `data-action`/`data-args` yang sudah dipakai sejak S264 Security
Hardening. 0 kode disentuh. SELESAI PENUH. Poin #2–5, #7 (lint drift
generik, coverage per modul, SSOT operasi lint, guard empty-catch, peta
dependency) masih BELUM dikerjakan. Detail lengkap: `CHANGELOG.md` §
Sesi 326.

---

Sesi 325 (2026-08-01) — MAINTAINABILITY (tindak lanjut poin #6 dari
daftar saran user pasca-audit S324, "Batasi ukuran file"): tambah lint
peringatan `lintOversizedSourceFiles()` di `scripts/build.js` (ambang
1600 baris, `console.warn` saja — build TETAP LANJUT), + sinkronisasi 2
angka baseline `docs/AUDIT_MATRIX.md` yang terdeteksi drift saat build
dijalankan. SELESAI PENUH. Poin #1 dari daftar saran yang sama
("baseline auto-generate") TERNYATA sudah ada sejak sesi sebelumnya
lewat `lintDocsBaselineCountDrift()` — tidak dikerjakan ulang. Poin
#2–5, #7–8 (lint drift generik, coverage per modul, SSOT operasi lint,
guard empty-catch, peta dependency, convention doc) BELUM dikerjakan.
Detail lengkap: `CHANGELOG.md` § Sesi 325.

---

Sesi 323 (2026-07-31) — HOUSEKEEPING (tindak lanjut saran audit Sesi 2,
`AUDIT_BUG_PIN_BARCODE_2_SESI_CLAUDE_SESI2_HASIL.md`, di luar scope
bugfix): tambah `docs/architecture/ADR-028.md` (duplikasi `vehicle-
scanner.js`/`sparepart-scanner.js` sengaja, isolasi risiko antar
scanner) + lint `lintScannerStructuralDrift()` (`scripts/build.js`) &
test unit-nya (`tests/scanner-structural-drift.test.js`) yang menjaga
fungsi lifecycle "kembar" kedua scanner tidak diam-diam divergen.
SELESAI PENUH. 0 file business logic scanner disentuh. Detail lengkap:
`CHANGELOG.md` § Sesi 323.

Saran housekeeping lain dari audit yang sama (esbuild — butuh
`npm install`, tidak bisa dieksekusi di lingkungan tanpa akses
jaringan; timeout/debounce jadi setting; diagnostik error kamera;
rename `scanCamera`) BELUM dikerjakan — prioritas sedang/rendah,
dicatat sbg rekomendasi lanjutan di
`AUDIT_BUG_PIN_BARCODE_2_SESI_CLAUDE_SESI2_HASIL.md`, bukan bug.

---

Sesi 318 (2026-07-31) — FIX (lanjutan s317, "Sesi B" dari rencana ringkas):
`_saveBillInner()` utk tagihan LUNAS/arsip (`billEditFromArchive`) sekarang
commit balik `#billDue`/`#billAmt` yang diedit ke `t.date`/`t.amount`
transaksi pembayaran terakhirnya, reuse logic sync (completedAt arsip,
piutang "Ditanggung Bersama", sisa utang) dari `saveBillHistoryEdit()` —
diextract jadi 1 fungsi shared baru `applyBillPaymentTxSync()`, dipanggil
dari KEDUA tempat. SELESAI PENUH (bagian tulis). Detail lengkap:
`FIX-v979-s318-savebillinner-archive-tx-writeback.md`.

Sesi C (hapus tombol "✏️ Ubah Tanggal Bayar"/`openBillPaymentDateEdit()`,
rapikan `billPaidDateWrap`) & Sesi D (verifikasi `billHistoryEditModal`
tidak disentuh) BELUM dikerjakan — menyusul sesi berikutnya, lihat
"Belum terjawab" di `FIX-v979-s318-savebillinner-archive-tx-writeback.md`.

---

Sesi 312 (2026-07-27) — FIX: akun baru dari opsi "➕ Buat Akun Baru dari
Aset Ini" (`Aset.save()`, blok `accountId==='__new__'`) tidak mewarisi
`ownership` aset sumbernya — resolusi `ownership` dipindah ke SEBELUM blok
pembuatan akun, `newAcc` sekarang menyertakan field `ownership` apa adanya
(pola field sama `_saveAccInner()`/`akun.js`). Akun tertaut LAMA (bukan
`__new__`) tidak disentuh — di luar scope. SELESAI PENUH. Detail lengkap:
`CHANGELOG.md` § S312.

Belum digarap (ditunda, bukan bug — lihat `docs/NEXT_SESSION.md`): kartu
akun tertaut selalu blur walau toggle "Aktif" — ini BY DESIGN
(`renderAccGrid()`, `modules-render.js`), toggle memang tidak berlaku
selama masih tertaut Aset.

---

Sesi 311 (2026-07-27) — FIX: nominal akun tertaut ke Buku Aset tidak sync
saat nilai aset diedit (`Aset.save()` di `modules/asset/aset.js`,
`accountId` yang sudah tertaut sebelumnya sekarang ikut dikoreksi ke nilai
aset terbaru lewat pola `txDelta`, riwayat transaksi akun tidak diubah).
SELESAI PENUH. Detail lengkap: `CHANGELOG.md` § S311.

---

Sesi 287 (2026-07-27) — FIX: Katalog Suku Cadang tidak sync ke dropdown
"Pilih Sparepart" (input transaksi Keuangan) & Kelola Stok Sparepart tidak
push ke Katalog. SELESAI PENUH. Detail lengkap: `CHANGELOG.md` § Sesi 287.

**Target eksplisit user**: 2 screenshot melaporkan katalog suku cadang
belum tampil di input transaksi, dan Kelola Kategori/Stok Sparepart
seharusnya sync otomatis dgn Katalog.

**Implementasi**: Tahap 10 (lanjutan bridge Tahap 9 Sesi 266) — 2 arah
sync antara `VehicleCatalog` (Katalog Suku Cadang) & `D.partsStock`:
1. `syncUnlinkedCatalogPartsToStock()` baru (tx-stok-sparepart.js), tautkan
   otomatis part katalog yang belum ada di `D.partsStock` tiap panel stok
   dibuka — reuse `syncPartsStockFromCatalog()` 100%.
2. `Sparepart.saveStock()` (sparepart-servis.js) push part stok baru ke
   `VehicleCatalog.create()` best-effort, pola sama `applyTxStockFromTx()`.

**Scope**: 2 file JS + 2 file test (10 test baru). 0 skema/store baru, 0
perubahan ke fungsi bridge murni yang sudah ada (Tahap 9 dipakai apa
adanya).

## Test

`node --test tests/*.test.js` -> **1553/1554 pass** (naik dari 1543/1544,
+10 test baru). 1 fail SUDAH ADA sebelum sesi ini (FEATURE_REGISTRY,
`stgGroup3`/Pengingat belum dihapus dari index.html — pekerjaan lain yang
sedang berjalan, di luar cakupan fix ini).

## Build

`node scripts/build.js s287-sparepart-catalog-tx-sync` -> sukses, `?v=811`
(naik dari `?v=810`).

## ZIP

`kw_release_sesi287_sparepart-catalog-tx-sync_v811.zip` — dibuat &
diverifikasi `unzip -t`.

## Current Step

Sesi 287 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 262 (2026-07-26) — Selective Liquid Glass + M3 Expressive UI refresh
(floating nav, glass chrome, kontras badge stok). SELESAI PENUH. Detail
lengkap: `CHANGELOG.md` § Sesi 262.

**Target eksplisit user**: implementasi arah UI Material 3 Expressive +
Selective Liquid Glass yang sudah disepakati lewat preview interaktif
(floating bottom nav, tanpa FAB, nav 6 item asli, palet netral kalem) ke
file project nyata, plus buat preview HTML implementasi, plus doc-sync.

**Implementasi**: lihat `CHANGELOG.md` § Sesi 262 untuk detail penuh
(`modern-ui-layer.css`, `nav-scroll.js` baru, `preview-m3-liquidglass.html`
baru, 1 bug token mati + 1 fix kontras WCAG AA ditemukan & diperbaiki).

**Scope**: CSS-only + 1 file JS mandiri baru. TIDAK menyentuh
`app-bundle-a/b.min.js` atau modul bisnis apa pun — 0 resiko ke 1228 test
JS yang ada (test suite tidak dijalankan ulang sesi ini karena tidak ada
perubahan logic bisnis untuk diverifikasi).

---

## Sesi sebelumnya (arsip singkat)

Sesi 203 (Continue, 2026-07-25) — Delivery Plan UI: hubungkan TripEngine
(S198) ke Order/Kasir. SELESAI PENUH.

**Target eksplisit user**: TripEngine/LogisticsEngine/calculateSmartDelivery/
calculateVehicleCapacity/weightCalculator/volumeCalculator/packingCalculator
sudah lengkap tapi belum ada UI ("senyap") — hubungkan ke UI nyata (form
Order), tambah hook Dashboard & AI Insight, tulis test, build, ZIP.

**Implementasi**:
- `modules/shared/modals.js` — field baru `pBeratPerUnit`/`pPanjang`/
  `pLebar`/`pTinggi` di `productModal` (dipakai `weightCalculator()`/
  `volumeCalculator()`, S4/S198, lewat TripEngine). Tombol baru "🚚 Rencana
  Pengiriman" di `orderModal`. Modal baru `deliveryPlanModal` (index 80 di
  `MODAL_HTML`) — form produk/qty/produsen/metode/kendaraan/margin +
  ringkasan ongkir/harga/profit/berat/volume + tombol rekomendasi AI.
  `MODAL_VERSION` dibump otomatis oleh build.js.
- `app_production.html`/`index.html` — `document.write(MODAL_HTML[80])`
  ditambah setelah `hondaPdfImportModal` (source of truth; build.js sinkron
  keduanya otomatis).
- `modules/shop/cobek-etalase.js` — `Etalase.openModal()`/`Etalase.save()`
  baca/tulis `beratPerUnit`/`panjang`/`lebar`/`tinggi` ke `D.products[]`.
  0 rumus baru, field APA ADANYA disimpan.
- **File baru** `modules/shop/delivery-plan-ui.js` — `DeliveryPlanUI`
  (open/onProductChange/setMetode/calc/askAI), presenter MURNI: 100% reuse
  `TripEngine.plan()`/`weight()`/`volume()` (S198, sendiri delegasi PERSIS
  ke `calculateSmartDelivery()`/`weightCalculator()`/`volumeCalculator()`)
  + `requestAIRecommendation()` (S6). 0 rumus/logic AI baru. Terdaftar di
  `scripts/build.js` (GROUP_B, setelah `trip-engine.js`).
- `modules/ai/feature-insights.js` — item baru `ShopInsight` #5
  `'shop-delivery-plan'`: muncul kalau ada produk dgn
  `beratPerUnit`/dimensi terisi, arahkan ke fitur Rencana Pengiriman.
  100% reuse `TripEngine`, guard `typeof`, tidak throw kalau
  belum dimuat.
- Dashboard hook: item AI Insight di atas otomatis tampil di kartu AI
  Insight Dashboard (`FeatureInsightUI`/`renderDashboard()` yang sudah
  ada) — tidak menambah kartu findash baru ke
  `ShopBusinessEnginePresenter` (di luar cakupan, risiko ubah struktur
  grid 3-kartu yang sudah ada test-nya).

## Test

`node --test tests/*.test.js` -> **996/996 pass, 0 fail** (naik dari 987 —
9 test baru `tests/delivery-plan-ui.test.js`: `DeliveryPlanUI.open()`/
`calc()`/`setMetode()` tidak throw walau DOM di-stub permisif,
`TripEngine.plan()`/`weight()`/`volume()` dipakai presenter, & 3 test
`ShopInsight` item `shop-delivery-plan` muncul/tidak sesuai data produk).

## Build

`node scripts/build.js` -> sukses, `?v=717` (naik dari `?v=716`).
FILE-MAP.md ditulis ulang otomatis (265 file, 1655 identifier global).

## ZIP

`kw_release_sesi203_delivery-plan-ui_v717.zip` — dibuat & diverifikasi
`unzip -t`.

## Current Step

Sesi 203 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 189 (Tahap 7C-4b lanjutan, 2026-07-25) — Hubungkan Detail OCR ke UI.
SELESAI PENUH.

**Target eksplisit user**: hubungkan `SparepartOcrCatalogDetail` (Tahap
7C-3b, sebelumnya fungsi MURNI tanpa sentuh DOM) ke UI nyata.

**Implementasi**:
- `modules/vehicle/sparepart-ocr-catalog-detail.js` — fungsi baru
  `sparepartOcrCatalogDetailOpen()` (`SparepartOcrCatalogDetail.open`):
  reuse `show()` yang SUDAH ADA apa adanya (0 logic baru), KALAU
  ditemukan tulis `html`-nya ke `#sparepartOcrDetailBody` lalu buka modal
  lewat `openModal('sparepartOcrDetailModal')` (SUDAH ADA,
  `modal-navigasi.js`). `found:false` -> tidak menulis DOM/tidak buka
  modal (perilaku "jika ditemukan, tampilkan" tidak berubah).
  `document`/`openModal` guard typeof, gagal aman.
- `modules/shared/modals.js` — modal baru `sparepartOcrDetailModal`
  (index 78 di `MODAL_HTML`), berisi container `#sparepartOcrDetailBody`,
  read-only, tombol tutup standar. `MODAL_VERSION` dibump.
- `index.html` — `<script>document.write(MODAL_HTML[78])</script>`
  ditambah setelah `vehCatalogImportModal` (source of truth;
  `app_production.html` ditulis ulang otomatis oleh build.js).
- `modules/vehicle/sparepart-ocr-orchestrator.js` — step `'detail'`
  sekarang utamakan `SparepartOcrCatalogDetail.open()`, fallback ke
  `.show()` murni utk kompatibilitas mundur. 0 logic pencarian/parsing
  baru — orkestrator tetap murni pemanggil.

## Test

`node --test tests/*.test.js` -> **690/690 pass, 0 fail** (naik dari 684
— 5 test baru `tests/sparepart-ocr-catalog-detail.test.js` utk `open()`,
1 test baru `tests/sparepart-ocr-orchestrator.test.js` utk prioritas
`.open()` vs `.show()`), 2x — sebelum & sesudah build.

## Build

`node scripts/build.js kw189-sparepart-ocr-detail-ui` -> sukses,
`?v=660` (naik dari `?v=659`).

## ZIP

`kw_release_sesi189_tahap7C4b-sparepart-ocr-detail-ui_v660.zip` — dibuat
& diverifikasi `unzip -t`.

## Current Step

Sesi 189 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan &
link ditampilkan ke user. STOP.

---

Sesi 188 (Tahap 7C-4b lanjutan, 2026-07-24) — Prefill form tambah part dari
hasil OCR dikembalikan. SELESAI PENUH.

**Target eksplisit user**: prefill form dengan hasil OCR; jangan ubah proses
simpan; jangan ubah fitur lain.

**Implementasi**: `modules/vehicle/sparepart-ocr-catalog-add.js` —
`sparepartOcrCatalogAddOpen()` kembali menulis field prefill
(`catPartName`/`catOemCode`/`catBarcode`) ke DOM setelah
`VehicleCatalogUI.openForm()` (mode tambah), reuse `fields(parsed)` yang
sudah ada, guard elemen tidak ada/nilai kosong (mengembalikan perilaku Tahap
7C-3c yang sempat dinonaktifkan di Sesi 187/`noprefill-657`).
`confirmAndSave()`/alur simpan TIDAK disentuh. Detail lengkap: `CHANGELOG.md`
§ Sesi 188.

## Test

`node --test tests/*.test.js` -> **684/684 pass, 0 fail** (naik dari 682 —
+2 test baru di `tests/sparepart-ocr-catalog-add.test.js`).

## Build

`node scripts/build.js kw188-tahap7C4b-sparepart-ocr-add-prefill` -> sukses,
`?v=658` (naik dari `?v=657`).

## ZIP

`kw_release_sesi188_tahap7C4b-sparepart-ocr-add-prefill_v658.zip` — dibuat &
diverifikasi `unzip -t`.

## Current Step

Sesi 188 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP.

---

Sesi 187 (Tahap 7C-4b, 2026-07-24) — Orkestrator Scan -> Parse -> Cari
Vehicle Catalog -> Detail/Add. SELESAI PENUH.

**Target eksplisit user**: buat orkestrator yang merangkai Scan -> Parse
-> Cari Vehicle Catalog; kalau ditemukan panggil Detail, kalau tidak
panggil Add. Jangan ubah UI selain wiring.

**Implementasi**: `modules/vehicle/sparepart-ocr-orchestrator.js`
(`SparepartOcrOrchestrator.run()`) — 0 logic baru, murni memanggil
berurutan `SparepartOcr.scan()` (7C-1) -> `SparepartOcrParser.
parseText()` (7C-2) -> `SparepartOcrCatalogLink.findFromParsed()` (7C-3a)
-> `found` ? `SparepartOcrCatalogDetail.show()` (7C-3b) :
`SparepartOcrCatalogAdd.open()` (7C-3c). Scan `null`/`''` -> berhenti,
tidak lanjut. Kelima dependency opsional (guard typeof), gagal aman.
TIDAK ada tombol/entry-point UI baru ditaruh ke halaman manapun sesi ini.
Detail lengkap: `CHANGELOG.md` § Sesi 187 (Tahap 7C-4b).

## Test

`node --test tests/*.test.js` -> **682/682 pass, 0 fail** (naik dari 672 —
10 test baru `tests/sparepart-ocr-orchestrator.test.js`, 2x — sebelum &
sesudah build).

## Build

`node scripts/build.js kw187-tahap7C4b-sparepart-ocr-orchestrator` ->
sukses, `?v=656` (naik dari `?v=655`).

## ZIP

`kw_release_sesi187_tahap7C4b-sparepart-ocr-orchestrator_v656.zip` —
dibuat & diverifikasi `unzip -t`.

## Current Step

Sesi 187 (Tahap 7C-4b) selesai penuh — ZIP rilis dibuat & diverifikasi,
ringkasan & link ditampilkan ke user. STOP (menunggu target lanjutan —
kandidat: wiring orkestrator ini ke tombol scan label nyata di halaman
Vehicle Catalog, belum ada keputusan produk).

---

Sesi 166 (2026-07-23) — Fitur baru: "Pantau Harga" (Price Watch) — tab ke-3
Worth It?. SELESAI PENUH.

**Target eksplisit user**: catat harga 1 produk dari waktu ke waktu (manual
ATAU dari scan), AI bandingkan ke tren harga historis + kondisi keuangan,
lalu kasih saran "aman dibeli sekarang" vs "tunggu dulu" — via fitur Worth
It? yang sudah ada (bukan modul baru terpisah, konfirmasi user).

**Implementasi**: `WorthIt.PW` (`modules/finance/worthit.js`) — sub-objek
baru, pola sama persis `CAT_FIELDS`/`catFieldsHtml` (Sesi 165b): fungsi PURE
dipisah dari wiring DOM. `D.priceWatch` array baru (`{id,name,entries:[]}`,
tiap entry `{id,price,date,source:'manual'|'scan'}`), backward compatible
(`D.priceWatch||[]` di semua pembacaan, tidak perlu migrasi data lama).
`trend(entries)` (PURE) — hitung latest/min/max/avg dari entries, klasifikasi
arah turun/naik/stabil (ambang ±3% dari rata-rata, pola ambang sama gaya
`healthScore()`), `belum_cukup` kalau entry <2. `financialSafety()` (PURE)
— 100% reuse `FinanceIntelligence.summary()` (Sesi 74) apa adanya, TIDAK
ada rumus cashflow/health-score baru, guard `typeof` kalau modul belum
dimuat. `verdict(trend,finance)` (PURE) — gabung tren harga + kondisi
keuangan jadi 1 saran: turun+sehat→aman, turun+skor rendah/cashflow
minus→override tetap tunggu, naik→selalu tunggu. Input harga: manual
(`promptAddEntry()`, `showPromptModal()`) ATAU scan (`scanEntry()` 100%
reuse `scanReceipt()` yang SUDAH ADA — generic OCR struk/nota, ditembak ke
2 input hidden `wiWatchScanAmt`/`wiWatchScanDate`, `oninput` otomatis
commit ke `addEntry()` begitu OCR selesai — TIDAK ada parser OCR baru).
`render()` — list kartu per produk (verdict box + histori harga + tombol
catat/scan/hapus), dipanggil dari `WorthIt.switchTab('watch')` yang
diperluas (Sesi 165b hanya 2 tab, sekarang generik 3 tab).
`modules/shared/modals.js` — tombol tab ke-3 "📈 Pantau Harga" di
`worthItModal` + div `#wiTabWatch` (list produk + 2 input hidden scan +
tombol "➕ Tambah Produk Dipantau"). TIDAK ada perubahan struktur data
`D.wishlist`/`D.transactions` yang sudah ada, TIDAK ada framework baru,
TIDAK ada duplikasi logic keuangan (100% baca ulang `FinanceIntelligence`).
+15 test baru `tests/worthit-pricewatch.test.js` (13 unit `trend()`/
`verdict()`/`financialSafety()` PURE + 1 integrasi ringan `addItem()`/
`addEntry()`/`trend()` end-to-end via `D` lokal — pola sama
`tests/worthit-jenis.test.js`). Wiring DOM (`render()`/`promptAddItem()`/
`scanEntry()`/dst) sengaja TIDAK dites unit (baca/tulis `document`,
di luar cakupan `loadSource.js`), cukup diverifikasi manual/smoke-test.

## Test

`node --test tests/*.test.js` -> **424/424 pass, 0 fail** (naik dari 409 —
15 test baru `tests/worthit-pricewatch.test.js`, 2x — sebelum & sesudah
build).

## Build

`node scripts/build.js kw166-worthit-pricewatch` -> sukses, `?v=618`
(naik dari `?v=617`). Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis), kedua bundle lolos `node --check`,
`index.html`==`app_production.html`.

## ZIP

`kw_release_sesi166_worthit_pricewatch_v618.zip` — dibuat & diverifikasi
`unzip -t`.

## Current Step

Sesi 166 selesai penuh — ZIP rilis dibuat & diverifikasi, ringkasan & link
ditampilkan ke user. STOP (menunggu target lanjutan).

---

Sesi 161 (2026-07-23) — Bugfix gap Investment Planner (dilaporkan user):
kartu "Investment Planner" selalu kosong walau sudah ada data investasi
di 📋 Buku Aset. SELESAI PENUH.

**Root cause**: `InvestmentPlannerAPI` (Sesi 95) membaca `Investment`/
`D.investments` (`modules/asset/investasi.js`, Sesi 9) — modul yang TIDAK
PERNAH punya UI penulis data (`Investment.addHolding()` tidak pernah
dipanggil dari mana pun). User sebenarnya mengisi data investasinya lewat
📋 Buku Aset (`D.assets`, field `modalInvestasi`/`hargaBeli`×`jumlahUnit`).

**Fix**: `Aset.investmentPerformance()` baru (`modules/asset/aset.js`,
diekstrak murni dari `Aset.renderInvestasi()` yang sudah ada — 0 rumus
baru). `InvestmentPlannerAPI._portfolio()`/`_allocation()`
(`modules/finance/investment-planner-api.js`) direwire baca fungsi itu,
bukan `Investment` lagi. `watchlistAlerts()` jujur `count:0` (Buku Aset
tidak punya watchlist). Pesan empty-state presenter yang salah
diperbaiki. Detail lengkap: `CHANGELOG.md` § Sesi 161. +7 test baru
(`tests/investment-planner-gap-fix.test.js`), regression 387/387 pass
(2x — sebelum & sesudah build). Build
`kw161-investment-planner-gap-fix-610` (`?v=610`), kedua bundle lolos
`node --check`, `index.html`==`app_production.html`.

## Current Step

Sesi 161 selesai penuh — ZIP rilis dibuat, ringkasan & link ditampilkan
ke user. STOP (menunggu target lanjutan).

## Files Changed (Sesi 161)

- `modules/asset/aset.js` — `Aset.investmentPerformance()` baru
  (diekstrak dari `Aset.renderInvestasi()`, 0 rumus baru), `renderInvestasi()`
  dirombak untuk memanggilnya.
- `modules/finance/investment-planner-api.js` — `_portfolio()`/
  `_allocation()` direwire ke `Aset.investmentPerformance()`;
  `watchlistAlerts()` disederhanakan (selalu `ok:true, count:0`); pesan
  `invest_no_holdings` diperbaiki.
- `modules/finance/investment-planner-presenter.js` — pesan empty-state
  holdingsCount===0 diperbaiki.
- `tests/investment-planner-gap-fix.test.js` — baru, 7 test.

- `app-bundle-a.min.js` — dibuat ulang otomatis oleh `scripts/build.js` dari
  source yang sudah dipatch (grup A, memuat `modules-render.js`).
- `app-bundle-b.min.js` — dibuat ulang otomatis (versi disamakan, 0 source
  di grup B berubah).
- `tests/dash-card-show-hide.test.js` — file test BARU, 7 test.
- `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — hasil
  build (`?v=565`), disinkronkan otomatis.
- `CHANGELOG.md`, `FILES-CHANGED.md` — entry Sesi 140.
- `docs/CHECKPOINT.md` (file ini), `docs/NEXT_SESSION.md` — sinkronisasi
  dokumentasi.
- **TIDAK diubah:** `hideDashCardEl()`, `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/
  `DASH_CARD_BY_KEY`, `isDashCardOn()`/`toggleDashCardPref()`/
  `setAllDashCardPrefs()`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`,
  termasuk field `dashKey`), `dashHubNavigateToFeature()`
  (`dashboard-hub.js`, sudah diperbaiki Sesi 139 utk kasus sub-tab, TIDAK
  disentuh lagi sesi ini), seluruh 62 test lama.

## Test

`node --test tests/*.test.js` -> **69/69 pass, 0 fail** (naik dari 62, 7
test baru murni aditif).

## Build

`node scripts/build.js kw140-fix-dashcard-toggle-inline-style` -> sukses,
`?v=565`. Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox,
fallback otomatis).

## ZIP

`kw_release_sesi140_fix-dashcard-toggle-inline-style_v565.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

---

Sebelumnya Sesi 139 (2026-07-22) — Bugfix navigasi "Semua Fitur" Dashboard Hub.
SELESAI PENUH. **Dilaporkan user** (screenshot preview HTML): klik kartu
apa pun di grid "🗂️ Semua Fitur" yang goTo-nya adalah Penasihat AI/
Rekomendasi AI/Ringkasan Harian AI/Skor Hidup Seimbang/Refleksi & Self-
Care/Kebebasan Finansial (FI)/Life OS selalu terlihat "mengarah ke Tangga
Ternak Uang". **Root cause**: `target.goTo` ketujuh kartu itu hidup di
dalam container yang ada di `SECTION_GROUPS` sub-tab LAIN
(`#dashboardHubPinnedWrap` → sub-tab "📌 Widget"; `#lifeOSWrap` → sub-tab
"🌦️ Insight") — bukan di sub-tab "🗂️ Fitur" tempat kartunya sendiri.
`dashHubNavigateToFeature()` tidak pernah memanggil
`DashboardHub.setSectionTab()` dulu sebelum `scrollIntoView()`, jadi
kalau user sedang di sub-tab lain, elemen tujuan tetap `u-dnone` →
`scrollIntoView()` no-op tanpa error; yang kelihatan cuma efek
sampingan `showPage()` reset scroll ke 0, mendarat di kartu Tangga
Ternak Uang yang SENGAJA selalu tampil di atas seluruh sub-tab. **Fix**:
`DASHHUB_GOTO_SECTION_MAP` baru (100% reverse-map dari `SECTION_GROUPS`
yang sudah ada) + `_dashHubResolveGoToSection()` (jalan naik lewat
`parentElement`) di `modules/dashboard-hub/dashboard-hub.js` —
`dashHubNavigateToFeature()` sekarang switch ke sub-tab yang benar dulu
sebelum scroll, hanya utk `target.page==='dashboard-hub'`. 10 test baru
(`tests/dashboard-hub-goto-subtab.test.js`), regression 62/62 pass (52
lama + 10 baru). Build `kw139-fix-dashboard-hub-goto-subtab` (`?v=564`),
kedua bundle lolos `node --check`, `index.html`==`app_production.html`.
**Catatan skop test**: sama seperti Sesi 138, ZIP kerja ini hanya
membawa test yang tersedia di `tests/` (sekarang 5 file, 62 test),
BUKAN full suite ribuan test yang disebut riwayat sesi-sesi lampau di
file ini.

## Current Step

Sesi 139 selesai penuh — ZIP rilis dibuat & diverifikasi (`unzip -t`),
ringkasan & link ditampilkan ke user. STOP (menunggu target lanjutan).

## Files Changed (Sesi 139)

- `modules/dashboard-hub/dashboard-hub.js` — `DASHHUB_GOTO_SECTION_MAP` +
  `_dashHubResolveGoToSection()` baru; `dashHubNavigateToFeature()` +1
  blok (switch sub-tab sebelum scroll ke `target.goTo`).
- `app-bundle-b.min.js`, `app-bundle-a.min.js` — dibuat ulang otomatis
  oleh `scripts/build.js` dari source yang sudah dipatch.
- `tests/dashboard-hub-goto-subtab.test.js` — file test BARU, 10 test.
- `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md` — hasil
  build (`?v=564`), disinkronkan otomatis.
- `CHANGELOG.md`, `FILES-CHANGED.md` — entry Sesi 139.
- `docs/CHECKPOINT.md` (file ini) — sinkronisasi dokumentasi.
- **TIDAK diubah:** `SECTION_GROUPS`/`applySectionTab()`,
  `dashboard-hub-registry.js` (`FEATURE_REGISTRY`), `showPage()`, markup
  `index.html`/`app_production.html` (0 perubahan manual, cuma `?v=`
  otomatis), seluruh 52 test lama.

## Test

`node --test tests/*.test.js` -> **62/62 pass, 0 fail** (naik dari 52,
10 test baru murni aditif).

## Build

`node scripts/build.js kw139-fix-dashboard-hub-goto-subtab` -> sukses,
`?v=564`. Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox,
fallback otomatis).

## ZIP

`kw_release_sesi139_fix-dashboard-hub-goto-subtab_v564.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

---

Sebelumnya Sesi 138 (2026-07-22) — Cleanup fisik `#page-dashboard` lama (dead code
pasca-migrasi Dashboard Hub) + 2 pintu nyasar + null-guard `backupBanner`.
SELESAI PENUH. **Temuan awal sesi**: dari 17 card di `DASH_RENDER_ORDER`,
cuma 13 yang benar-benar mati (`bill`/`servisReminder`/`sewaKiosReminder`/
`backupReminder`/`danaDarurat`/`cashflowForecast`/`timeline`/`budgetMini`/
`eduFund`/`zakatMini`/`laporanMini`/`siapPulang`/`ldr`) — 4 sisanya
(`fi`/`pensiun`/`absensi`/`refleksi`) TETAP HIDUP karena elemennya sudah
pindah ke `#page-dashboard-hub` sejak migrasi Tahap 3a, hanya render-nya
masih dikontrol fungsi yang sama. **Fix**: `DASH_CARD_DEFS`/
`DASH_RENDER_ORDER` (`modules/shared/modules-render.js`) dipangkas ke 4
entry hidup saja; guard `if(getElementById('page-dashboard'))` di
`setAllDashCardPrefs`/`toggleDashCardPref` diarahkan ke
`page-dashboard-hub`; `renderDashboard()` dibersihkan dari baris yang
nulis ke elemen dashboard lama (`dIncome`/`dExpense`/`dBalance`/`dShop`/
`recentTx`/`dashAccList`) — `dashCtx` TETAP dipertahankan (masih dipakai
`FinCoach`). 4 titik `getElementById('backupBanner')`/`'lastBackupDate'`
tanpa null-check di `modules/shared/backup-restore.js` diperbaiki pakai
optional chaining/null-check (pola sama yang sudah dipakai luas di file
itu) — SEBELUM HTML dihapus, supaya `checkBackup()`/`runFullBackup()`
tidak crash begitu elemennya hilang. Entry mati `dash-laporan-mini`
(target `page:'dashboard'`) dihapus dari `FEATURE_REGISTRY`
(`modules/dashboard-hub/dashboard-hub-registry.js`) — padanan live-nya
sudah ada (`keu-saldo-akun`/`keu-grafik` di bawah section `keuangan`).
Tombol "Saldo Akun" di kartu Kekayaan Bersih (`app_production.html`)
diperbaiki dari `showPage('dashboard', ...)` ke
`showPage('dashboard-hub', ...)` (nav index 0 sama persis). Baru setelah
semua pintu nyasar & null-guard beres, blok HTML `#page-dashboard`
(baris 202–325) dihapus fisik, `index.html` disinkronkan (sekarang
identik `app_production.html`, terverifikasi `diff`). Build
`kw138-batch-breadcrumb-navigasi-page-dashboard-cleanup` (`?v=562`),
kedua bundle lolos `node --check`. **Catatan skop test**: ZIP kerja sesi
ini hanya membawa 4 file test (`tests/tagihan-kalender.test.js`,
`tests/data-archive.test.js`, `tests/eie-registry.test.js`,
`tests/lifeos-link-registry.test.js` — 52/52 pass, 2x sebelum & sesudah
build), BUKAN full suite ribuan test yang disebut riwayat sesi
sebelumnya di file ini — cakupan regresi otomatis sesi ini terbatas ke
4 file itu saja; verifikasi tambahan dilakukan manual (grep menyeluruh
memastikan 0 sisa referensi ke `id="page-dashboard"`/`dashBillCard`/
`dIncome`/`dExpense`/`dBalance`/`dShop`/`recentTx`/`dashAccList`/dst di
HTML setelah blok dihapus).

**Belum/di luar scope sesi ini**: modal `qsDashboard` ("⚙️ Aksi Cepat")
sekarang ORPHAN — satu-satunya tombol pemicunya ada di dalam blok
`#page-dashboard` yang baru dihapus, jadi tidak ada lagi cara membuka
modal ini dari UI manapun. Modal TIDAK makan biaya render selama tidak
dibuka (bukan bug aktif), tapi worth dibersihkan (hapus HTML modal +
referensi terkait) di sesi lanjutan kalau mau benar-benar tuntas.

Sesi 138 lanjutan (2026-07-22) — **Cleanup modal orphan `qsDashboard`.**
Konfirmasi user ("Lanjutkan"): tuntaskan catatan "belum selesai" dari
bagian pertama sesi ini. Diverifikasi dulu (bukan diasumsikan) bahwa
`qsDashboard` benar-benar 100% orphan — grep menyeluruh ke seluruh
`app_production.html` (HTML) & semua file `*.js` (JS) memastikan tidak
ada `data-action="openQS" data-args='["qsDashboard"]'` maupun
`openQS('qsDashboard')` terprogram tersisa di mana pun (beda dari
`qsBillActions` yang polanya mirip tapi TERNYATA masih dipanggil
programatik dari `tagihan-kalender.js` — jadi TIDAK ikut dihapus).
Ditemukan 1 titik tambahan yang akan crash kalau modalnya dihapus tanpa
diperbaiki dulu: `self-test.js` `EXTRA_MODAL_SWEEP_SPECS` masih punya
entry smoke-test `{fn:'openQS',args:['qsDashboard'],...}` — dihapus
duluan SEBELUM HTML-nya, pola yang sama dengan urutan null-guard
`backupBanner` sebelum HTML dihapus di bagian pertama sesi ini. Setelah
itu blok HTML `qs-modal-overlay#qsDashboard` (komentar "QUICK SETTINGS:
DASHBOARD" + isi modal, ~39 baris) dihapus fisik dari
`app_production.html`, `index.html` disinkronkan ulang. Build
`kw138-batch2-qsdashboard-orphan-modal-cleanup` (`?v=563`), regression
52/52 pass (2x, sebelum & sesudah build), kedua bundle lolos
`node --check`, `index.html`==`app_production.html` terverifikasi.
**Catatan**: aksi-aksi di dalam modal ini (+Pemasukan/+Pengeluaran/
Transfer/Jual Shop/Worth It/+Tagihan/+Target/+Akun/Backup/Kalkulator
Gaji/Absensi Harian) semuanya TETAP bisa diakses lewat entry point lain
yang sudah ada di app (tombol nav bawah, tab masing-masing fitur,
Pengaturan) — yang hilang murni satu shortcut menu, bukan fungsinya.

Sebelumnya Sesi 121 (2026-07-21) — Bugfix: Kartu "Tangga Ternak Uang" macet di
"Menghitung..." (dilaporkan user, screenshot). SELESAI PENUH.
**Root cause**: `page-dashboard-hub` adalah landing page DEFAULT (statis
`class="page active"` di HTML), jadi boot lewat
`showMain()->refreshCurrentPage()->renderPageContent()`, BUKAN
`showPage()`. `tangga-keuangan.js` sebelumnya HANYA render lewat wrap
`window.showPage` sendiri + fallback `setTimeout(450ms)` di window
'load' — keduanya tidak pernah tersentuh (atau kalah race lawan
`await load()`) di boot pertama, jadi kartu bisa macet permanen. Pola
gap SAMA PERSIS DecisionCenterHome (S118). **Fix (1 baris + cleanup)**:
`TanggaKeuangan.render()` disambungkan ke blok "DASHBOARD HUB — LIVE
WIRING" di `renderDashboard()` (modules/shared/modules-render.js) —
titik yang sama dipakai 20+ presenter Dashboard Hub lain, dipanggil
LANGSUNG-sinkron dari `showMain()` setelah data siap + tiap `save()` di
seluruh app. Wrap `window.showPage`/`setTimeout` lama di
`tangga-keuangan.js` DIHAPUS (superseded, sumber race-nya). 0 perubahan
di `compute()`/`render()` TanggaKeuangan sendiri. Test
`dashboard-hub-live-wiring.test.js` diperluas (5→6 widget terkunci).
Regression 3328/3328 pass (2x), build
`kw121-batch14-tangga-keuangan-boot-render-fix` (?v=538), kedua bundle
lolos node --check, index.html==app_production.html, ZIP dibuat &
tervalidasi.

Sebelumnya Sesi 120 (2026-07-21) — Batch 13 Final Integration & Release (PENUTUP).
SELESAI PENUH: audit akhir 0 blocker kritis, regression 3328/3328 pass
(2x), build `kw120-batch13-final-integration-release` (?v=537), kedua
bundle lolos node --check, index.html==app_production.html, FILE-MAP
ter-update otomatis, ZIP rilis dibuat & tervalidasi. **Batch 13 DITUTUP
RESMI.**

Sebelumnya Sesi 119 (2026-07-21) — Release Candidate Validation (Batch 13).
SELESAI PENUH: 13-item checklist audit dijalankan, 0 bug perilaku
ditemukan, 1 gap test-coverage ditutup (actionQueueChatContext, +6
test), regression 3328/3328 pass (2x), build
`kw119-batch13-release-candidate-validation` (?v=536), ZIP dibuat &
tervalidasi. Batch 13 dinyatakan SIAP RILIS.

Sebelumnya Sesi 118 (2026-07-21) — Cross Module Integration Hardening (Batch 13).
SELESAI PENUH: audit modules/cross/* + DashboardHub + ai-chat.js
menemukan 1 gap wiring (DecisionCenterHome tidak live di
renderDashboard()), diperbaiki 1 baris (100% reuse), +4 test baru
(tests/cross-module-integration-hardening.test.js), regression
3322/3322 pass (2x), build `kw118-batch13-cross-module-integration-
hardening` (?v=535), ZIP dibuat & tervalidasi.

Sebelumnya Sesi 84 (2026-07-20) — Vehicle Dashboard Final Integration (Batch 7).
SELESAI PENUH (implementasi/test/regression/build/ZIP di pesan
pertama, dokumentasi lengkap di kelanjutan sesi ini — sama sesi
logis, 2 pesan, pola sama Sesi 78).

## Current Step

Sesi 138 selesai penuh — ZIP rilis sudah dibuat & diverifikasi
(`unzip -t`), ringkasan & link ditampilkan ke user. STOP (menunggu user
pilih: lanjut bersihkan modal `qsDashboard` orphan, atau target lain).

## Files Changed (Sesi 138, lanjutan — qsDashboard cleanup)

- `self-test.js` — entry `qsDashboard` dihapus dari
  `EXTRA_MODAL_SWEEP_SPECS`.
- `app_production.html` — blok modal `qs-modal-overlay#qsDashboard`
  (~39 baris) dihapus.
- `index.html` — disinkronkan (identik `app_production.html`).
- Hasil build (`?v=563`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `sw.js`, `docs/FILE-MAP.md`, konstanta versi di 6 file source.
- **TIDAK diubah:** `openQS`/`closeQS` (generic, masih dipakai 6 modal
  QS lain), `qsBillActions` (dikonfirmasi masih dipanggil programatik
  dari `tagihan-kalender.js`, BUKAN orphan).

## Files Changed (Sesi 138)

- `modules/shared/modules-render.js` — `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`
  dipangkas 17→4, guard `page-dashboard`→`page-dashboard-hub` (2 titik),
  `renderDashboard()` dibersihkan dari tulis-ke-elemen-mati (6 baris).
- `modules/shared/backup-restore.js` — 4 titik `backupBanner`/
  `lastBackupDate` di-null-guard.
- `modules/dashboard-hub/dashboard-hub-registry.js` — entry
  `dash-laporan-mini` dihapus.
- `app_production.html` — tombol Saldo Akun retarget `dashboard-hub`,
  blok `#page-dashboard` (202 baris) dihapus.
- `index.html` — disinkronkan (identik `app_production.html`).
- Hasil build (`?v=562`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `sw.js`, `docs/FILE-MAP.md`, konstanta versi di 6 file source.
- `docs/CHECKPOINT.md` (file ini) — sinkronisasi dokumentasi.
- **TIDAK diubah:** modal `qsDashboard` (HTML-nya, di luar scope —
  lihat catatan orphan di atas), `styles.css`, seluruh isi
  `#page-dashboard-hub` selain 1 tombol Saldo Akun.

## Test

`node --test tests/*.test.js` (4 file test yang tersedia di ZIP kerja
ini) -> **52/52 pass, 0 fail** (2x — sebelum & sesudah build).

## Build

`node scripts/build.js kw138-batch-breadcrumb-navigasi-page-dashboard-cleanup`
-> sukses, `?v=562`. Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis).

## ZIP

`kw_release_sesi138_breadcrumb-navigasi-3lapis_v562.zip` — dibuat &
diverifikasi `unzip -t` ("No errors detected in compressed data").

## Completed

- [x] Keputusan produk FINAL eksplisit user: lanjutan Batch 7 setelah
  Vehicle Automation Foundation (Sesi 83) — target "Vehicle Dashboard
  Final Integration", diinterpretasikan sbg menutup gap eksplisit yang
  dicatat Sesi 83: wiring Service Reminder & Fuel Reminder
  (`VehicleReminder`, Sesi 78) ke notifikasi browser NYATA.
- [x] File baru `modules/vehicle/vehicle-notif-bridge.js`
  (`VehicleNotifBridge`): `items(vehicleId?, firedIds?)` — 100% reuse
  `VehicleReminder.serviceReminders()`/`.fuelReminders()`, HANYA
  severity `'overdue'`, hasil `{fireKey,title,body}`, difilter
  `firedIds`. `taxReminders()` SENGAJA TIDAK disertakan (jalur ad-hoc
  lama sudah menembak notif pajak).
- [x] `reminder-notif.js` `checkAndFireReminders()` — 1 blok baru
  (guard `typeof VehicleNotifBridge`) menembak `fireNotif()` per item
  & push `fireKey` ke `fired.ids`, ditambahkan sebelum
  `localStorage.setItem('kw_notif_fired'...)`.
- [x] `scripts/build.js` — GROUP_B nambah
  `modules/vehicle/vehicle-notif-bridge.js`, setelah
  `vehicle-reminder.js`, sebelum `vehicle-ai-hook.js`.
- [x] `tests/vehicle-notif-bridge.test.js` (BARU, 10 test) — items()
  kosong (VehicleReminder belum dimuat), service overdue, service
  due-soon (tidak ditembak), fuel overdue, fuel info/due-soon (tidak
  ditembak), gabungan service+fuel lintas kendaraan, dedupe firedIds,
  firedIds bukan array (guard), vehicleId diteruskan apa adanya,
  taxReminders TIDAK pernah dipanggil bridge.
- [x] `node --test tests/*.test.js` (full suite, sebelum build) ->
  2826/2826 pass (naik dari 2816) — 2 assersi awal sempat gagal (array
  cross-realm sandbox vm), diperbaiki pakai `.length===0`/
  `Array.from()`.
- [x] `node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration`
  -> sukses, `?v=508` (naik dari `?v=507`).
- [x] Full test suite diulang setelah build -> tetap 2826/2826 pass.
- [x] ZIP release dibuat & diverifikasi (`unzip -t` — "No errors
  detected in compressed data").
- [x] Dokumentasi disinkronkan: `docs/CLAUDE.md`,
  `docs/PROJECT_STATE.md`, `docs/NEXT_SESSION.md`,
  `docs/BATCH_PLAN.md`, `CHANGELOG.md` (+ catatan gap Sesi 77-83 yang
  ditemukan di `CHANGELOG.md` saat sesi ini, ditandai transparan bukan
  diisi retroaktif penuh — di luar scope sesi ini), `docs/CHECKPOINT.md`
  (file ini).

## Current Step

Sesi selesai penuh — menampilkan ringkasan & link ZIP ke user, lalu
STOP (menunggu user pilih target lanjutan Batch 7).

## Remaining

- [ ] STOP — tunggu user pilih target lanjutan Batch 7 (lihat
  `docs/NEXT_SESSION.md` § "Target berikutnya": wiring
  `VehicleAIHook`/`FinanceDashboard.getAIHook()` ke AI Daily
  Briefing/`ai-chat.js`, builder/filter picker
  `financeAccount`/`financeCategory`, chart/grafik visual utk
  `VehicleTrendAPI.monthlyCostTrend()`, wiring `VehicleDecisionAPI`/
  `VehicleRecommendationEngine` ke AI briefing/chat, insight-level
  Priority Scoring, Plugin Marketplace, atau kind Life Object baru
  selain `generic`/`ref` — semua butuh keputusan produk dulu, jangan
  ditebak).
- [ ] (Opsional, di luar scope sesi ini) Backfill retroaktif entri
  Sesi 77-83 di `CHANGELOG.md` kalau user minta sesi dokumentasi-sinkronisasi
  terpisah — detail lengkap sudah ada di `docs/BATCH_PLAN.md`.

## Files Changed (Sesi 84)

- `modules/vehicle/vehicle-notif-bridge.js` — file BARU
  (`VehicleNotifBridge`).
- `reminder-notif.js` — `checkAndFireReminders()` +1 blok wiring.
- `scripts/build.js` — GROUP_B +1 entry.
- `tests/vehicle-notif-bridge.test.js` — file test BARU, 10 test.
- Hasil build (`?v=508`): `app-bundle-a.min.js`, `app-bundle-b.min.js`,
  `index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md`, +
  konstanta versi di 6 file source (sinkronisasi otomatis `build.js`).
- `docs/CLAUDE.md`, `docs/PROJECT_STATE.md`, `docs/NEXT_SESSION.md`,
  `docs/BATCH_PLAN.md`, `CHANGELOG.md`, `docs/CHECKPOINT.md` —
  sinkronisasi dokumentasi.
- **TIDAK diubah:** `modules/vehicle/vehicle-reminder.js` (Sesi 78,
  dipakai apa adanya lewat `serviceReminders()`/`fuelReminders()` — 0
  perubahan diperlukan), blok pajak kendaraan (`VEHTAX_ITEMS`) di
  `reminder-notif.js` (jalur lama, tidak disentuh). `styles.css`,
  `index.html`/`app_production.html`, `modules/dashboard-hub/*` — 0
  perubahan (TIDAK ada UI/panel/dashboard card baru sesi ini, murni
  wiring service-ke-notifikasi).

## Test

`node --test tests/*.test.js` -> **2826/2826 pass, 0 fail** (naik dari
2816 sebelum sesi ini).

## Build

`node scripts/build.js kw84-batch7-vehicle-dashboard-final-integration`
-> sukses, `?v=508`. Bundle TANPA minifikasi (esbuild tidak tersedia di
sandbox, fallback otomatis — sama seperti sesi-sesi sebelumnya).

## ZIP

`kw_release_sesi84_vehicle-dashboard-final-integration_v508.zip` —
dibuat & diverifikasi `unzip -t` ("No errors detected in compressed
data").

---

## Checkpoint — Sesi 157 (2026-07-23): Split Nav Car Notes jadi 4 Tab

**Selesai:** `#page-carnotes` dipecah jadi 4 `cn-tabs` (🧠 Insight AI /
⛽ BBM / 🔧 Servis / 🚦 Pajak & SIM), pola sama persis `setKeuanganTab`.
Vehicle selector + Odometer tetap di luar tab (multi-vehicle utuh).
Detail lengkap: `docs/CLAUDE.md` § Sesi 157.

**Hasil build (`?v=597`, `kw157-mobil-nav-split-tab`):**
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`, + konstanta versi
di 5 file source (sinkronisasi otomatis `build.js`).

**TIDAK diubah:** semua presenter/engine vehicle & fuel (0 rumus/render
baru — murni reorganisasi DOM `index.html` + `setCnTab()` di
`vehicle-core.js`). Tidak ada file test baru (murni DOM, existing test
sudah cukup).

## Test

`node --test tests/*.test.js` -> **381/381 pass, 0 fail**.

## Build

`node scripts/build.js kw157-mobil-nav-split-tab` -> sukses, `?v=597`.

## ZIP

`kw_release_sesi157_mobil_nav_split_tab_v597.zip` — dibuat & dikirim ke
user.

---

## Checkpoint — Sesi 158 (2026-07-23): Bugfix 6 card bocor di semua tab Dashboard Hub

**Selesai:** `SECTION_GROUPS.insight` (`dashboard-hub.js`) ditambah 6 id
(`propertyManagementWrap`/`rentalManagementWrap`/`assetPortfolioWrap`/
`assetMaintenanceWrap`/`recommendationPanelWrap`/`actionQueueWrap`) yang
sebelumnya tidak terdaftar & selalu tampil di semua tab. Detail lengkap:
`docs/CLAUDE.md` § Sesi 158.

**Hasil build (`?v=598`, `kw158-dashboard-hub-section-groups-fix`):**
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`keluarga-w-preview.html` (regenerasi), + konstanta versi di 5 file
source.

## Test

`node --test tests/*.test.js` -> **381/381 pass, 0 fail**.

## Build

`node scripts/build.js kw158-dashboard-hub-section-groups-fix` -> sukses, `?v=598`.

## ZIP

`kw_release_sesi158_dashboard_hub_section_groups_fix_v598.zip` — dibuat & dikirim ke user.

---

## Checkpoint — Sesi 164b (2026-07-23): Cek status "kategori punya field generik" + implementasi SIM

**Konteks:** User minta cek ulang 5 tempat yang disebut masih generik
(Akun/Jenis Akun, Kelola Kendaraan, SIM, Utang & Piutang, Worth It?) —
ternyata #1 (Akun→Jenis Akun) sudah selesai dikerjakan sesi ini (lihat
`accJenisFieldsWrap`, `onAccJenisChange()` di `modules/finance/akun.js`)
dan #4 (Utang, bukan Piutang) sudah selesai di sesi KW-163 sebelumnya
(`Debt.JENIS_DEFAULTS`/`Debt.onJenisChange()` di
`modules/finance/piutang-utang.js`). Sisa yang belum: #2 Kelola
Kendaraan (belum ada dropdown Jenis Kendaraan sama sekali), #3 SIM
(dropdown ada tapi tanpa default masa berlaku/estimasi biaya), #5 Worth
It? (kategori cuma label, tanpa pertanyaan tambahan beda per kategori).

**Dikerjakan sesi ini:** #3 SIM — `SIM_JENIS_DEFAULTS` (estimasi biaya
perpanjangan per jenis, angka umum PNBP Indonesia) +
`SIM_MASA_BERLAKU_TAHUN=5` + `onSimJenisChange()` di
`modules/vehicle/vehicle-core.js`, dipanggil dari `onchange` dropdown
`simJenis` (`modules/shared/modals.js`) dan otomatis saat buka modal SIM
baru (`openSimModal()`). Field kosong saja yang diisi otomatis (tidak
menimpa input manual/edit). Bonus bugfix: `simBiaya` sebelumnya TIDAK
PERNAH disimpan ke `D.simList` di `saveSim()` (field dibaca ke UI tapi
hilang tiap save) — sekarang ikut disimpan.

**Belum dikerjakan (untuk sesi berikutnya):** #2 Kelola Kendaraan (butuh
dropdown Jenis Kendaraan: motor/mobil/listrik, field beda per jenis —
mobil: oli mesin+transmisi terpisah, listrik: kapasitas baterai bukan
interval KM) dan #5 Worth It? (pertanyaan tambahan per kategori
Kebutuhan/Keinginan).

## Test

`node --test tests/*.test.js` -> **392/392 pass, 0 fail** (baseline lama
tanpa test baru khusus SIM — belum ditambahkan test unit terpisah).

## Build

`node scripts/build.js kw164-sim-jenis-fields-616` -> sukses, `?v=615`.

## ZIP

`kw_release_sesi164b_sim_jenis_fields_v616.zip` — dibuat & dikirim ke user.

---

## Checkpoint — Sesi 165 (2026-07-23): #2 Kelola Kendaraan — dropdown Jenis
Kendaraan (implementasi ringkas 1 dari 2 sisa item "masih generik")

**Konteks:** Lanjutan sisa dari Sesi 164b — user minta kerjakan salah satu
dari #2 Kelola Kendaraan / #5 Worth It? secara ringkas. Dipilih #2.

**Dikerjakan sesi ini:** Modal Kelola Kendaraan (`vehicleModal` di
`modules/shared/modals.js`) sekarang punya dropdown **Jenis Kendaraan**
(motor/mobil/listrik) yang mengganti field di bawahnya secara dinamis
(pola sama persis `onAccJenisChange()`/`accJenisFieldsWrap` di
`modules/finance/akun.js`):
- **Motor** (default) — 1 field interval servis (KM), sama seperti perilaku
  lama.
- **Mobil** — 2 field terpisah: Interval Servis Oli Mesin (KM, default
  5000) & Interval Servis Oli Transmisi (KM) — oli mesin tetap disimpan ke
  `v.serviceIntervalKm` (dipakai reminder servis existing), oli transmisi
  field baru `v.oliTransmisiIntervalKm`.
- **Listrik** — field interval KM DIGANTI Kapasitas Baterai (kWh), field
  baru `v.batteryCapacityKwh`; `v.serviceIntervalKm` diset 0 (kendaraan
  listrik tidak ganti oli).

Implementasi: `vehJenisFieldsHtml(jenis,v)` (pure, render HTML field per
jenis) + `onVehJenisChange()` (wiring DOM, dipanggil dari `onchange`
dropdown & dari `openVehicleModal()`/`editVehicle()`) + `vehMetaText(v)`
(pure, teks ringkasan di daftar Kelola Kendaraan — dipakai
`renderVehicleManageList()` di `modules-render.js`, gantikan teks statis
"Interval servis: X km" yang dulu sama utk semua jenis) — semuanya di
`modules/vehicle/vehicle-core.js`. Kendaraan lama tanpa field `jenis`
default ke `'motor'` (backward compatible, tidak ada migrasi data
diperlukan). 8 test baru `tests/vehicle-jenis.test.js` (pola sama
`tests/debt-jenis.test.js` — hanya fungsi murni yang dites, bukan
DOM/modal wiring).

**Belum dikerjakan (untuk sesi berikutnya):** #5 Worth It? (pertanyaan
tambahan per kategori Kebutuhan/Keinginan — field `wiCategory`/`wlCategory`
di `worthItModal` masih cuma dropdown polos tanpa pertanyaan lanjutan beda
per kategori).

## Test

`node --test tests/*.test.js` -> **403/403 pass, 0 fail** (naik dari 392 —
11 test baru `tests/vehicle-jenis.test.js`).

## Build

`node scripts/build.js kw165-vehicle-jenis-fields` -> sukses, `?v=616`.

## ZIP

`kw_release_sesi165_vehicle_jenis_fields_v616.zip` — dibuat & dikirim ke
user.

---

## Checkpoint — Sesi 165b (2026-07-23): #5 Worth It? — pertanyaan tambahan
per kategori Kebutuhan/Keinginan (item terakhir dari "masih generik")

**Konteks:** Lanjutan sisa Sesi 165 — user minta kerjakan sisa item #5
Worth It? secara ringkas.

**Dikerjakan sesi ini:** Dropdown Kategori di `worthItModal` (baik tab 🔍
Cek 1 Barang `wiCategory` maupun tab 📋 Prioritas Belanja `wlCategory`)
sekarang punya pertanyaan lanjutan yang berubah sesuai kategori dipilih
(pola sama persis `onVehJenisChange()`/`vehJenisFieldsHtml()` di
`modules/vehicle/vehicle-core.js`):
- **Kebutuhan** — dropdown "Alasan Kebutuhan": rusak/tidak berfungsi, habis
  & perlu restock, belum pernah punya (tapi memang perlu), atau
  wajib/keharusan.
- **Keinginan** — dropdown "Sudah Kepikiran Sejak Kapan?": baru
  lihat/kepikiran, beberapa hari terakhir, atau sudah lama diincar.

Implementasi: `WorthIt.CAT_FIELDS` (config per kategori) +
`WorthIt.catFieldsHtml(cat,prefix,val)` (pure, render HTML opsi) +
`WorthIt.onCategoryChange(prefix,presetVal)` (wiring DOM, dipanggil dari
`onchange` dropdown `wiCategory`/`wlCategory` & saat modal dibuka/edit) +
`WorthIt.readCatExtra(cat,prefix)` (baca jawabannya saat submit) — semua di
`modules/finance/worthit.js`. Jawabannya dipakai buat:
- Tab single (`WorthIt.hitung()`): menambah/mengganti baris hasil cek
  sesuai jawaban (mis. "baru lihat" → peringatan lebih tegas soal
  impulsif; "sudah lama diincar" → aturan tunggu 3 hari dianggap lewat).
- Tab list (`WorthIt.computeScore()`): ikut menggeser skor prioritas
  (mis. "belum pernah punya" dapat skor kebutuhan lebih rendah dari
  kebutuhan yang jelas rusak/habis/wajib).

Field baru (`catExtra`) disimpan di tiap item `D.wishlist` — backward
compatible, item lama tanpa field ini tetap jalan normal (`readCatExtra`
return `null`, tidak dipakai di scoring). 6 test baru
`tests/worthit-jenis.test.js` (pola sama `tests/vehicle-jenis.test.js` —
hanya `WorthIt.catFieldsHtml()` yang dites, bukan DOM/modal wiring).

## Test

`node --test tests/*.test.js` -> **409/409 pass, 0 fail** (naik dari 403 —
6 test baru `tests/worthit-jenis.test.js`).

## Build

`node scripts/build.js kw165-worthit-kategori-fields` -> sukses, `?v=617`.

## ZIP

`kw_release_sesi165b_worthit_kategori_fields_v617.zip` — dibuat & dikirim
ke user.

## Checkpoint — Sesi 267 (2026-07-26): Kasir AI — parity Alamat/Delivered/DP dgn Order

Audit ditemukan Kasir AI (`modules/business/kasir.js`) kirim 3 field lebih
sedikit dari Order manual: `address` selalu hardcode `''`, `delivered`
selalu hardcode `true`, dan tidak ada dukungan DP/Piutang. `recordShopSale()`
sendiri sudah generik (terima ketiganya) — gapnya murni di layar Kasir.

Fix (additif, 0 baris Order/`recordShopSale()` diubah):
- Tambah field Alamat (`kasirCustAddr`), toggle "Sudah diserahkan"
  (`kasirDelivered` + `Kasir.toggleDeliveredField()`), dan field DP
  (`kasirDP`) di `index.html` (kasir-cart-fields).
- `Kasir._checkoutInner()`: teruskan address & delivered ke
  `recordShopSale()`; logic DP→Piutang (hitung sisa, `D.transactions.amount
  = dp`, buat `D.piutang` kalau sisa>0) **diduplikasi** dari
  `Order._saveInner()` (opsi A — user pilih ini di atas opsi ekstrak
  helper bersama, krn Kasir tidak pernah edit entri lama jadi tidak perlu
  logic reconciliation `piutangLinkId`).
- `Kasir.reset()` ikut clear 3 field baru.

## Test

`node --test tests/*.test.js` -> **1369/1369 pass, 0 fail** (tidak ada test
baru ditambahkan — perubahan murni wiring UI, dicek manual lewat build+lint).

## Build

`node scripts/build.js kasir-audit-address-delivered-dp` -> sukses, `?v=784`.

## ZIP

`kw_release_kasir-audit-address-delivered-dp_v784.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 320 (2026-07-28): Sewa Kios — Status Kosong/Disewa jadi dinamis

**Konteks:** Audit ulang "field mana lagi yang masih generik" (lanjutan pola
Sesi 164b–165b: Akun/Kendaraan/SIM/Utang/Worth It). Ditemukan 1 gap baru:
dropdown Status (`skStatus`) di modal Kelola Unit Kios (`sewaKiosUnitModal`)
tidak punya `onchange` sama sekali — field "Nama Penyewa" selalu tampil
walau status masih "Kosong" (belum ada penyewa).

**Dikerjakan sesi ini:** `SewaKios.onStatusChange()` (pola sama persis
`onVehJenisChange()`/`onSimJenisChange()` di
`modules/vehicle/vehicle-core.js`) — toggle `u-dnone` pada
`skPenyewaWrap` (fg wrap baru yang membungkus field `skPenyewa`,
`modules/shared/modals.js`): status **Disewa** -> field Nama Penyewa
tampil, status **Kosong** -> disembunyikan. Dipanggil dari `onchange`
dropdown `skStatus` & sekali saat modal dibuka (`openUnitModal()`,
`modules/business/sewakios.js`) supaya konsisten baik saat Tambah Unit
maupun Edit Unit. Data `penyewa` tetap tersimpan apa adanya (tidak ada
perubahan skema) — cuma visibility field yang berubah, jadi tidak ada
migrasi data diperlukan.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail** (tidak ada test
baru — perubahan murni wiring UI/visibility, sama pola dgn Sesi 267).

## Build

`node scripts/build.js kw320-sewakios-status-dinamis` -> sukses, `?v=833`.

## ZIP

`kw_release_sesi320_sewakios-status-dinamis_v833.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 321 (2026-07-28): Dana Titipan Aset — label/placeholder Nama jadi dinamis

**Konteks:** Lanjutan audit "field generik" — kandidat #2 yang sebelumnya
ditandai "minor, perlu konfirmasi": dropdown "Dana Titipan Dari"
(`assetTitipanOwnerType`, modal Aset) sudah punya 3 pilihan
(Investor/Keluarga/Lainnya) tapi label & placeholder field Nama di
sebelahnya statis ("Nama (opsional)" / "Pak Budi, dll") sama utk ketiganya.

**Dikerjakan sesi ini:** `Aset.TITIPAN_OWNER_LABELS` (config per tipe) +
`Aset.onTitipanOwnerTypeChange()` — pola sama persis
`Debt.JENIS_DEFAULTS`/`Debt.onJenisChange()`
(`modules/finance/piutang-utang.js`). Label & placeholder field Nama
sekarang berubah sesuai tipe dipilih: Investor -> "Nama Investor" ("Pak
Budi, PT Modal Jaya, dll"), Keluarga -> "Nama Anggota Keluarga" ("Kakak,
Ibu, Om Budi, dll"), Lainnya -> "Nama/Keterangan" ("Koperasi, teman, dll").
Dipanggil dari `onchange` dropdown, dari `Aset.toggleTitipan()` (saat
toggle Dana Titipan dinyalakan), & sekali saat modal Aset dibuka
(`openModal()`) supaya konsisten saat Tambah/Edit. Murni UI copy — TIDAK
ada field/skema data baru (`titipanOwnerName` tetap 1 field yang sama),
jadi tidak ada migrasi data diperlukan.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail** (tidak ada test
baru — perubahan murni UI label/placeholder, sama pola dgn Sesi 320).

## Build

`node scripts/build.js kw321-danatitipan-label-dinamis` -> sukses, `?v=834`.

## ZIP

`kw_release_sesi321_danatitipan-label-dinamis_v834.zip` — dibuat & dikirim
ke user.

---

## Checkpoint — Sesi 322 (2026-07-28): Sewa Kios — Harga Sewa/Bulan ikut disembunyikan saat Kosong

**Konteks:** User minta pastikan field "Harga Sewa / Bulan" (bukan cuma
"Nama Penyewa") juga ikut mengikuti status Kosong/Disewa — sebelumnya di
Sesi 320 cuma `skPenyewaWrap` yang ditoggle, `skHarga` masih selalu tampil.

**Dikerjakan sesi ini:** `skHarga` sekarang dibungkus `skHargaWrap`
(`modules/shared/modals.js`), ikut ditoggle bareng `skPenyewaWrap` di
`SewaKios.onStatusChange()` (`modules/business/sewakios.js`) — status
**Disewa** -> Nama Penyewa & Harga Sewa/Bulan sama-sama tampil, status
**Kosong** -> keduanya disembunyikan. Data `hargaSewaBulanan` tetap
tersimpan apa adanya kalau sebelumnya sudah diisi (cuma visibility field
yang berubah, bukan value-nya) — jadi kalau unit balik status ke Disewa
lagi, harga lama masih ada.

## Test

`node --test tests/*.test.js` -> **1629/1629 pass, 0 fail**.

## Build

`node scripts/build.js kw322-sewakios-harga-dinamis` -> sukses, `?v=835`.

## ZIP

`kw_release_sesi322_sewakios-harga-dinamis_v835.zip` — dibuat & dikirim ke
user.
