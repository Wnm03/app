# Instruksi untuk Claude Code — Repo Keluarga W

> **Chat baru? Baca `docs/README_DEVELOPER.md` dulu** (ditambahkan
> Sesi 26) — itu entry point urutan baca dokumen yang benar
> (`SESSION_RULES.md` → `PRODUCT_DECISIONS.md` → `PROJECT_STATE.md` →
> `NEXT_SESSION.md` → file ini). Project ini punya 2 track paralel
> (Smart AI & LifeOS) — lihat `docs/AI_SCOPE.md`/`docs/LIFEOS_SCOPE.md`.

Repo ini adalah PWA client-side (tanpa backend) untuk manajemen keuangan,
zakat, bisnis, dan kendaraan keluarga. Source dipecah per fitur, lalu
digabung jadi `app-bundle-a.min.js` / `app-bundle-b.min.js` oleh `build.js`.

## Perintah penting
- `npm install` — sekali di awal (untuk eslint/esbuild).
- `npm run lint` — ESLint (`eslint.config.js`).
- `npm test` — `node --test tests/*.test.js`, unit test asli (bukan mock).
- `npm run build` — jalankan `build.js`, hasilkan bundle.
- `npm run check` — lint && test && build, jalankan semua sekaligus.

## SESSION WORKFLOW & RECOVERY MODE (aturan permanen)

Aturan lengkap ada di `docs/SESSION_RULES.md` (sumber kebenaran tunggal
untuk urutan kerja sesi) — ringkasan di bawah ini WAJIB tetap sinkron
dgn file itu, jangan diedit terpisah/berbeda isi.

**SESSION WORKFLOW** (urutan wajib tiap sesi implementasi):
1. Baca `docs/CLAUDE.md`.
2. Baca `IMPLEMENTATION_STATUS.md`.
3. Baca `ROADMAP.md`.
4. Baca `TODO.md`.
5. Kerjakan HANYA TODO prioritas nomor 1 (pecah ke sub-item terkecil
   kalau prioritas itu terlalu besar utk 1 sesi).
6. Jalankan test (`node --test tests/*.test.js`).
7. Build project (`node scripts/build.js`).
8. Setelah build sukses, WAJIB membuat ZIP terlebih dahulu.
9. Tampilkan link download ZIP.
10. Baru update seluruh dokumentasi (`docs/CLAUDE.md`/
    `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md`).
11. STOP — jangan lanjut ke TODO berikutnya di sesi yang sama.

**RECOVERY MODE** (kalau sesi terputus krn kuota):
- Jangan mengulang analisis.
- Jangan mengulang implementasi yang sudah selesai.
- Jangan mengulang test kalau tidak ada perubahan kode.
- Jangan mengulang build kalau build terakhir masih valid.
- Lanjutkan dari checkpoint terakhir.
- Prioritaskan pembuatan ZIP kalau belum dibuat.
- Setelah ZIP selesai, baru update dokumentasi.
- Jangan mengerjakan fitur baru sampai sesi sebelumnya benar-benar
  selesai (ZIP + dokumentasi).

## Tugas default kalau diminta "perbaiki bug" / "self-test" / "fix sampai hijau"
1. Jalankan `npm run check`.
2. Kalau ada yang gagal:
   - Baca error paling atas dulu (biasanya akar masalah).
   - Untuk error test: baca pesan `_selfTestAssert` di `tests/*.test.js`
     (sudah deskriptif dalam Bahasa Indonesia), lalu cari fungsi terkait
     di **file sumber**, BUKAN di `app-bundle-a.min.js` / `app-bundle-b.min.js`
     — file itu hasil build otomatis dan akan tertimpa lagi tiap build.
   - Untuk error lint: ikuti aturan `eslint.config.js`.
   - Untuk error build: cek `build.js` dan urutan GROUP_A/GROUP_B di komentar
     paling atas tiap file `features-*.js` — banyak modul saling referensi
     jadi urutan load penting, jangan diubah sembarangan.
3. Buat perubahan sekecil mungkin yang menyelesaikan akar masalah.
4. Jalankan lagi `npm run check`, ulangi sampai semua pass, 0 fail, build sukses.
5. Kalau perbaikan yang "benar" butuh keputusan produk (bukan sekadar bug
   teknis, misal aturan pajak/zakat berubah) — STOP dan tanya dulu, jangan menebak.
6. Di akhir, ringkas: apa yang rusak, kenapa, dan file apa saja yang diubah.

## Yang tidak boleh disentuh langsung
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build, edit di source lalu build ulang.
- Urutan file di `build.js` (GROUP_A/GROUP_B) — hanya diubah kalau memang ada alasan struktural yang jelas.

## Cara resmi bikin zip rilis/patch — WAJIB pakai `npm run release`
JANGAN pernah bikin zip rilis dengan cara select-file-manual/copy folder kerja.
Dua insiden pernah terjadi persis karena itu:
- Sebuah paket patch pernah dikirim tanpa `app-bundle-a.min.js` & belasan file
  source lain (folder kerja ≠ apa yg sudah di-commit).
- Sebuah paket patch lain ("collapse-fixed") ternyata dibuat dari branch/commit
  LAMA yg belum di-rebase ke `main` terbaru → 2 bugfix yg sudah pernah selesai
  (chicken-egg OCR di `scan-ocr.js`, false-positive nama aset Bibit) ke-revert
  tanpa disadari.

Jalankan `npm run release` (= `scripts/release.sh`) setiap kali mau membuat zip
utk dikirim keluar. Script ini otomatis:
1. Menolak jalan kalau branch bukan `main` atau ketinggalan dari `origin/main`
   (mencegah patch dari base basi seperti insiden ke-2 di atas).
2. Menjalankan `npm run check` penuh — build akan berhenti sendiri kalau ada
   regresi ke pola bug yg sudah pernah ada guard-nya (lihat lint-lint di
   `build.js`: u-dnone/style.display, escapeHtml, chicken-egg Tesseract, dst).
3. Meng-commit otomatis perubahan versi/bundle hasil build, lalu bikin zip
   lewat `git archive` dari commit itu — jadi isi zip dijamin = isi commit,
   tidak mungkin ada file kerja lokal yg ketinggalan/nyelip.

Kalau menemukan kelas bug yang sudah pernah terjadi & sempat ke-revert/muncul
lagi (seperti insiden chicken-egg OCR di atas), pertimbangkan menambah lint
guard baru di `build.js` (pola: `lintXxx()` yang dipanggil di `main()` dan
`process.exit(1)` kalau ketemu) supaya build gagal keras kalau bug itu balik
lagi — bukan cuma mengandalkan komentar `// BUGFIX:` yang bisa hilang saat di-diff/revert.

## Upload dari HP (tanpa CLI) — WAJIB kalau tidak pakai `npm run release`

Kalau update dikirim ke GitHub lewat upload manual di HP (GitHub mobile
app/web, tanpa akses terminal/git), `npm run release` tidak bisa dijalankan.
Supaya 2 insiden lama (file source ketinggalan, patch dari base basi) tidak
terulang lewat jalur ini, WAJIB ikuti:

1. **Selalu lewat branch baru + Pull Request, jangan langsung upload ke
   `main`.** Buka PR, biarkan CI (`npm run check` dari `.github/workflows/ci.yml`)
   jalan otomatis — ini pengganti `npm run release` yang tidak bisa jalan di HP.
2. **Jangan merge PR sebelum status check CI hijau.** Jangan tergesa-gesa
   merge dari HP sebelum centang hijau muncul di PR.
3. **Cocokkan jumlah & nama file sebelum upload** dengan isi commit terakhir
   di `kw/` (terutama `*.js` di root, bukan di `backups/`/`archive/`) — supaya
   file yang "ketinggalan" ketahuan sebelum upload, bukan sesudah.
4. **Jangan upload `kw/backups/` atau `kw/archive/` secara manual.** Upload
   lewat GitHub app tidak otomatis skip file yang di-gitignore seperti
   `git add` — file di dua folder ini harus dikeluarkan manual dari daftar
   yang diupload/ditimpa.
5. **Jangan edit `app-bundle-a.min.js` / `app-bundle-b.min.js` langsung** di
   editor GitHub mobile. File ini hasil build otomatis — edit source-nya,
   biarkan CI/`build.js` yang generate ulang bundle.
6. **Tulis di pesan commit: asal upload & versi/build dasar**, misal
   `"upload dari Claude mobile, base build #173"` — supaya kalau ternyata
   base-nya stale, gampang dilacak (persis insiden ke-2 di atas).
7. **Setelah merge, cek `FILE-MAP.md` ikut ter-update otomatis oleh CI** —
   ini bukti build step benar-benar jalan, bukan cuma file mentah ketimpa
   manual.

## CI & branch protection
`.github/workflows/ci.yml` menjalankan `npm run check` (termasuk
`--require-minify`, lihat catatan esbuild di bawah) di setiap push & PR.
Supaya ini benar-benar jadi gerbang wajib (bukan sekadar informatif), aktifkan
di GitHub: Settings → Branches → Branch protection rule utk `main` → centang
"Require status checks to pass before merging" → pilih job `check` dari
workflow ini. Tanpa ini, PR/patch dari branch basi tetap bisa di-merge/dikirim
walau CI merah.

## Catatan esbuild (minifikasi)
`build.js` fallback otomatis ke bundle TANPA minifikasi kalau `esbuild` tidak
terpasang — aman utk dev sehari-hari, tapi BAHAYA kalau kejadian diam-diam di
CI/rilis produksi (`optionalDependencies` esbuild bisa gagal pasang tanpa bikin
`npm install` exit non-zero). Karena itu `ci.yml` & `scripts/release.sh` sama-sama
memanggil build dengan flag `--require-minify` (atau `REQUIRE_MINIFY=1`) —
build akan GAGAL keras kalau esbuild ternyata tidak terpasang, daripada diam-diam
mengirim bundle besar tanpa ada yang sadar.

## Catatan kerja — 2026-07-10/11: review & test dasar Car Notes (BBM/Servis)

Konteks: diminta review kode fitur Car Notes (Catatan BBM & Servis di
`features-budget-laporan-carnotes-pelanggan.js` + helper terkait di
`transaksi.js` / `features-tukang-kendaraan-storage.js`). Semua check
(`npm run check`) sudah hijau sebelum & sesudah kerjaan ini — TIDAK ada bug
yang diperbaiki di sesi ini, murni menambah test yang sebelumnya nol utk
area ini.

**Temuan review (status per 2026-07-11):**
1. ✅ SELESAI (lihat catatan kerja 2026-07-11 di bawah) — Catatan BBM yang
   "yatim" (kehilangan `txLinkId`) sekarang dibuatkan ulang transaksinya
   & di-sambung lagi saat diedit, tidak silently unsynced lagi.
2. ✅ SELESAI (lihat catatan kerja 2026-07-11 bagian ke-2 di bawah) —
   `resolveVehicleTxCategory` sekarang pakai link stabil `linkedVehicleId`
   di kategori, bukan cocok-nama string doang, jadi tidak lagi fragile
   kalau kategorinya di-rename (atau nanti kendaraannya, kalau suatu saat
   ada fitur rename kendaraan — saat ini belum ada UI utk itu).

**Test yang ditambahkan (0 → 48 test khusus Car Notes, total suite 103 → 151):**
- `tests/bbm-log.test.js` — `recordBbmLog()` (transaksi.js): catatan baru,
  auto-init `D.bbmLogs`, harga auto-hitung dari cost/liter vs harga manual,
  edit di tempat (tidak dobel entry), `txLinkId` tidak ikut ketimpa saat
  edit, fallback `vehicleId` lama, `existingBbmId` yang tidak ketemu.
- `tests/bbm-renderlist.test.js` — `BBM.renderList()`: total liter/biaya
  terfilter per kendaraan & rentang tanggal, rata-rata km/L (kasus normal
  ≥2 isi-penuh & fallback <2 isi-penuh), badge km/L per baris, empty state.
- `tests/servis-calc.test.js` — fungsi pengingat servis
  (`servisLogMatchesCat`, `getEffectiveIntervalKm`, `hasIntervalOverride`,
  `getLastServiceKm`, `estimateKmPerDay`, `estimateServiceDateISO`) di
  `features-tukang-kendaraan-storage.js`; `Servis.applyStockUsage` /
  `Servis.revertStockUsage` (pemakaian & pengembalian stok sparepart,
  termasuk jalur konfirmasi saat stok kurang); dan `Servis._saveInner`
  penuh (catatan baru vs edit, kategori pengingat cocok/baru/nama-kendaraan,
  sinkron interval, sinkron transaksi Keuangan, tukar part yg dipakai saat
  edit, pembatalan simpan kalau user batal konfirmasi stok kurang).

Sisa area Car Notes yg masih belum ada test: `BBM.openModal`/`Servis.openModal`
(prefill form saat edit — murni DOM-write, nilai gunanya lebih rendah drpd
yg sudah dites) dan bagian "Jalan"/Torsi baut kalau ada logikanya sendiri
(belum dicek).

Semua test baru pakai `loadSource()`/`extractFunction()` yang sudah ada di
`tests/helpers/` (load file source ASLI, bukan re-implementasi logic) —
lihat catatan lengkap caranya di `tests/helpers/loadSource.js`.

## Catatan kerja — 2026-07-11: fix temuan #1 (BBM "yatim" tidak tersinkron ulang saat diedit)

Konteks: mengerjakan temuan #1 dari review sesi sebelumnya (lihat di atas).
Sebelum fix, `npm run check` (test+build; lint tidak bisa dijalankan di
sandbox ini krn tidak ada akses internet utk `npm install`) sudah hijau —
bug ini murni belum ke-cover test, bukan regresi yang kelihatan dari CI.

**Akar masalah** (`BBM._saveInner` di
`features-budget-laporan-carnotes-pelanggan.js`): saat edit, `txId` diambil
dari `existing.txLinkId||null`. Kalau catatan BBM kehilangan `txLinkId`
(mis. transaksi terkaitnya kehapus manual di luar alur normal, atau data
lama sebelum field ini ada), `txId` jatuh ke `null` → cabang
`if(txId){...update tx...}` dilewati begitu saja → tidak ada transaksi baru
dibuat, catatan tetap "yatim" selamanya walau berkali-kali diedit, tanpa
pesan error apapun ke user.

**Fix**: tambah deteksi `wasOrphan = isEdit && !existing.txLinkId`. Kalau
`wasOrphan`, generate `txId` baru (`uid()`) dan buat transaksi baru persis
seperti alur catatan baru (push ke `D.transactions`, kategori dari
`resolveVehicleTxCategory(veh)`, subcategory `'Bensin'`), lalu sambung lagi
`D.bbmLogs[..].txLinkId` ke `txId` yang baru itu — krn `recordBbmLog()`
(transaksi.js) SENGAJA tidak menyentuh `txLinkId` saat edit (lihat test
`recordBbmLog — edit TIDAK mengubah txLinkId...` di `bbm-log.test.js`),
jadi penyambungan ulang ini harus terjadi di `_saveInner`, bukan di
`recordBbmLog`. Toast dibedakan (`"...& disinkron ulang ke Keuangan"`) biar
user sadar ada transaksi baru yang otomatis dibuat. Alur edit normal
(`txLinkId` sudah ada) tidak berubah sama sekali.

**Test baru**: `tests/bbm-saveinner.test.js` (0 → 5 test, total suite
151 → 156) — sebelumnya `BBM._saveInner` belum ada test sama sekali (beda
dgn `recordBbmLog` yang sudah dites di `bbm-log.test.js`). Cakupan: tolak
simpan kalau KM/liter/biaya kosong, catatan baru (log+transaksi dibuat,
`txLinkId` tersambung), edit normal (update di tempat, tidak dobel
transaksi), **edit catatan yatim (kasus bugfix ini — transaksi baru
dibuat & `txLinkId` tersambung ulang)**, dan `editId` yang tidak ketemu di
`D.bbmLogs`. Pola test: `createFakeDocument` dari `tests/helpers/fakeDom.js`
+ stub `recordBbmLog` lokal di file test (implementasi disalin persis dari
`transaksi.js`, krn fungsi itu di file lain) — sama seperti pola
`Servis._saveInner` di `servis-calc.test.js`.

`npm test` & `npm run build` sudah dicek hijau (156/156 pass, build sukses)
setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di sesi ini krn
sandbox tanpa akses internet (`npm install` gagal 403) — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release
utk memastikan tidak ada pelanggaran `eslint.config.js` dari perubahan ini.

Temuan #2 (`resolveVehicleTxCategory` fragile thd rename kendaraan) masih
belum dikerjakan — lihat catatan status di atas.

## Catatan kerja — 2026-07-11 (bagian ke-2): fix temuan #2 (kategori kendaraan fragile thd rename)

**Klarifikasi penting sebelum fix**: dicek dulu apakah "rename kendaraan"
itu nyata bisa terjadi dari UI — ternyata SAAT INI tidak ada fitur rename
nama kendaraan sama sekali (`features-tukang-kendaraan-storage.js` cuma
punya `saveVehicle` (tambah baru), `editVehicleInterval` (cuma interval
servis, bukan nama), dan `delVehicle`). Jadi jalur bug yang BENAR-BENAR
bisa kejadian sekarang bukan "kendaraan di-rename", tapi **kategorinya**
di-rename lewat menu Kategori (`kategori.js:saveCat`) — fitur itu SUDAH ada
dan sengaja menyesuaikan transaksi LAMA ke nama kategori baru
(`D.transactions.forEach(t=>{if(t.category===oldName)t.category=name})`),
tapi tidak tahu-menahu soal `resolveVehicleTxCategory` yang nyari kategori
kendaraan lewat cocok-nama-persis. Akibatnya: user rename kategori
"Vario 125" jadi "Motor Harian" (murni alasan estetika di Keuangan) →
transaksi LAMA ikut ganti nama (benar), tapi catatan BBM/servis
BERIKUTNYA utk kendaraan itu tidak nemu lagi kategori itu → jatuh diam-diam
ke kategori "Transport" umum, tercampur dgn kendaraan lain, TANPA pesan
error apapun ke user. Ini bug teknis konkret (bukan keputusan produk soal
aturan pajak/zakat), jadi dikerjakan langsung tanpa nanya dulu — TAPI kalau
suatu saat mau nambah fitur rename kendaraan, itu tetap bisa dipakai lewat
mekanisme yang sama (lihat di bawah), tidak perlu perubahan lagi.

**Fix** (`resolveVehicleTxCategory` di `transaksi.js`): kategori kendaraan
sekarang disimpan pakai field baru `linkedVehicleId` begitu ketemu/dibuat
pertama kali (lewat cocok nama, sama seperti sebelumnya). Urutan pencarian
kategori jadi: (1) cari dulu via `c.linkedVehicleId===vehicle.id` — stabil,
tidak peduli nama kategori berubah; (2) kalau belum ada link (data lama/
pertama kali), fallback ke cocok-nama-persis seperti sebelumnya, LALU
langsung di-stamp `linkedVehicleId`-nya biar next call pakai jalur (1); (3)
kalau tetap tidak ketemu, fallback ke kategori "Transport" bersama (TIDAK
di-stamp link, krn ini kategori bersama utk semua kendaraan yg belum py
kategori sendiri, bukan punya 1 kendaraan tertentu). `kategori.js:saveCat`
tidak perlu diubah — field `linkedVehicleId` otomatis ikut kepertahankan
krn baris itu sudah pakai spread `{...D.categories[type][catEditIdx],
name,emoji}`.

**Test baru**: `tests/vehicle-tx-category.test.js` (0 → 6 test, total suite
156 → 162) — sebelumnya `resolveVehicleTxCategory` belum ada test sama
sekali. Cakupan: belum ada kategori sama sekali (fallback Transport, TIDAK
di-link), kategori cocok nama & ke-link, **kategori sudah di-link lalu
NAMANYA diubah => tetap ketemu via link (kasus bugfix ini)**, 2 kendaraan
beda tidak saling ke-link, kendaraan tanpa kategori khusus tetap fallback
Transport bersama, dan subs (Bensin/Servis & Oli/Pajak) tidak dobel kalau
dipanggil berkali-kali. (Catatan teknis: `Array.from(...)` dipakai sebelum
`assert.deepEqual` pada array yg berasal dari dalam vm sandbox, krn array
lintas-realm bikin `deepEqual`/`deepStrictEqual` gagal walau isinya sama
persis — pola yg sama dipakai di `fi-calc.test.js`.)

`npm test` & `npm run build` sudah dicek hijau (162/162 pass, build
sukses) setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di
sesi ini krn sandbox tanpa akses internet (`npm install` gagal 403) —
tolong jalankan `npm run check` penuh sebelum merge/release.

## Catatan kerja — 2026-07-11 (bagian ke-3): fix sinkronisasi BBM ↔ Transaksi ↔ Car Notes

Konteks: mengerjakan item "BELUM DIKERJAKAN" dari `CATATAN-CEK-CLAUDE.md` —
"Sinkronisasi BBM ↔ Transaksi ↔ Car Notes: belum diuji ulang secara
otomatis". Ini arah SEBALIKNYA dari temuan #1 (yang itu: edit dari sisi
Car Notes/`BBM._saveInner` → Keuangan; ini: edit dari sisi Keuangan/form
Transaksi → Car Notes).

**Akar masalah** (`_saveTxInner` di `transaksi.js`): saat edit transaksi
yang sudah tertaut ke catatan BBM (`existingTx.bbmLinkId`), sinkronisasi ke
`D.bbmLogs` HANYA terjadi lewat `applyTxBbmFromTx()`, dan fungsi itu
early-return total kalau checkbox "Sinkron ke Catatan Mobil" (`txSyncBbm`)
tidak tercentang atau panel BBM disembunyikan (mis. krn kategori transaksi
diganti keluar dari BBM saat edit). Akibatnya: user ubah jumlah/tanggal
transaksi, tapi checkbox itu kebetulan mati → `D.bbmLogs` (dipakai Car
Notes) TIDAK ikut ter-update, jadi beda nilai dari `D.transactions`
(dipakai Keuangan) walau `bbmLinkId` masih menghubungkan keduanya —
silent desync, ketauan cuma kalau user buka Car Notes & Keuangan
berdampingan. Ini INKONSISTEN dgn link sejenis: `servisLinkId` (baris
tepat di atasnya) SELALU sinkron field dasar (cost/date/accountId) TANPA
syarat, tidak digantung checkbox apapun — jadi bukan keputusan produk
baru, cuma menyamakan BBM dgn pola yang sudah dipakai utk Servis.

**Fix**: tambah blok sinkron TANPA SYARAT tepat setelah blok `servisLinkId`
yang sudah ada — kalau `existingTx.bbmLinkId` ada, field dasar
(`cost`/`date`/`accountId`) di `D.bbmLogs` yang bersangkutan selalu
di-`Object.assign` mengikuti transaksi, TERLEPAS dari checkbox. Checkbox
`txSyncBbm` tetap seperti semula — cuma ngatur field DETAIL BBM
(km/liter/harga/spbu/fullTank/kendaraan) lewat `applyTxBbmFromTx()` yang
tetap jalan setelahnya (kalau checkbox nyala, field detail ikut sinkron
juga di atas field dasar; kalau mati, field detail dibiarkan apa adanya).

**Test baru**: `tests/tx-bbm-sync.test.js` (0 → 3 test, total suite
162 → 165) — sebelumnya `_saveTxInner`/`saveTx` (fungsi utama form
Transaksi Keuangan) belum ada test otomatis SAMA SEKALI. Cakupan: **edit
transaksi ber-`bbmLinkId` dgn checkbox MATI → field dasar BBM tetap ikut
sinkron, field detail TIDAK disentuh (kasus bugfix ini)**; edit dgn
checkbox NYALA → field dasar & detail dua2nya sinkron (perilaku lama,
tetap jalan); dan edit transaksi tanpa `bbmLinkId` → `D.bbmLogs` sama
sekali tidak disentuh. Cakupan sengaja dibatasi ke jalur "tunai" (bukan
cicilan/langganan/stok/cobek) biar fokus & jelas — banyak dependency
lintas-file (`WorthIt`, `SewaKios`, `Tukang`, `Renov`,
`applyTxCobekStockFromTx`, dst) di-stub sebagai no-op, BUKAN test
integrasi lintas file sungguhan.

Sisa item `CATATAN-CEK-CLAUDE.md` yg masih belum dikerjakan: evaluasi
split `transaksi.js` (butuh keputusan desain besar, sengaja belum
dieksekusi) & Logic Torsi Sparepart (belum ada test otomatis).

`npm test` & `npm run build` sudah dicek hijau (165/165 pass, build
sukses) setelah perubahan ini. `npm run lint` TIDAK bisa dijalankan di
sesi ini krn sandbox tanpa akses internet — tolong jalankan `npm run
check` penuh sebelum merge/release.

## Catatan kerja — 2026-07-11 (bagian ke-4): test otomatis Logic Torsi Sparepart

Konteks: mengerjakan item terakhir yang tersisa "BELUM DIKERJAKAN" di
`CATATAN-CEK-CLAUDE.md` — "Logic Torsi Sparepart (katalog 60+ spesifikasi
torsi Honda Vario 125, kalibrasi kunci torsi fisik MOLLAR MLR-B11950):
belum ada pengujian fungsional otomatis terhadap kalkulator ekstensi
(`Torsi.calcExt`) atau mode checklist servis." Item lain yg masih tersisa
("Evaluasi split `transaksi.js`") sengaja TIDAK dikerjakan di sesi ini krn
itu keputusan desain/refactor besar yang menurut `CLAUDE.md` sendiri
seharusnya dikonfirmasi dulu ke user, bukan ditebak — jadi dibiarkan
sebagai satu-satunya sisa item di `CATATAN-CEK-CLAUDE.md`.

`npm run check` (test+build; lint tidak bisa jalan di sandbox ini krn tidak
ada akses internet) sudah hijau sebelum sesi ini — jadi ini murni menambah
test yang sebelumnya nol utk modul `Torsi` (kalkulator torsi sparepart &
mode checklist servis di `features-budget-laporan-carnotes-pelanggan.js`),
TIDAK ada bug yang ditemukan/diperbaiki di kode aplikasinya.

**Test baru**: `tests/torsi-calc.test.js` (0 → 22 test, total suite
165 → 187). Cakupan:
- `Torsi.calcExt()` — rumus `setting = target × L ÷ (L + A)` (kalkulator
  ekstensi/sambungan batang kunci torsi), termasuk kasus L/A kosong &
  belum ada target (hasil disembunyikan, tidak dihitung), serta jalur mode
  manual (`this.mode==='manual'`) selain mode katalog.
- `Torsi.fmt()` — pembulatan 2 desimal & fallback `–` utk null/NaN.
- `Torsi.currentTargetNm()` — baca `this.selected.nm` di mode katalog vs
  baca input `trsManualTorsiInput` di mode manual.
- `Torsi.renderGaugeValues()` — konversi N·m → kgf·m/lbf·ft/lbf·in (angka
  konversi persis, mis. 98,0665 N·m = 10 kgf·m persis), badge catatan
  `'oli'`/`'new'`, & kasus nm null (semua nilai jadi `–`).
- `Torsi.setCalcMode()` — toggle class aktif tombol katalog/manual & show/
  hide panel input manual, termasuk auto-sync gauge saat pindah ke manual
  dgn input yg sudah terisi.
- `Torsi.itemKey()`, `Torsi.selectPart()` (part `noTorque` sengaja
  diabaikan, tidak ke-load ke kalkulator).
- Mode checklist servis: `Torsi.updateSummary()` (progres `done/count` &
  total biaya HANYA dari item yg tercentang), `Torsi.toggleCheck()` &
  `Torsi.updateBiaya()` (mutasi state + ikut `persist()` ke
  `D.torsiChecklist[curVehicleId]`, termasuk fallback biaya ke 0 kalau
  input invalid), `Torsi.setPageMode()` (toggle normal/checklist),
  `Torsi.loadPersisted()` (baca kembali state per kendaraan — kendaraan
  lain tidak ikut ketukar — & default aman kalau kendaraan belum pernah
  punya record).

Pola test: `loadSource()` me-load file source ASLI
(`features-budget-laporan-carnotes-pelanggan.js`, tempat modul `Torsi`
didefinisikan) ke sandbox vm, PLUS `createFakeDocument()` dari
`tests/helpers/fakeDom.js` (baca/tulis elemen DOM kalkulator yg
dipakai `Torsi.calcExt`/`renderGaugeValues` dst). Modul `Torsi` sengaja
TIDAK butuh `D`/`curVehicleId` sama sekali di method kalkulatornya (murni
`this.mode`/`this.selected`/DOM) — jadi file GROUP_A ini bisa di-load
SENDIRIAN tanpa `features-tukang-kendaraan-storage.js` (GROUP_B, penyedia
asli `TORSI_DB`/`findTorsiDb`/`MY_WRENCH_SCALE` saat runtime). Konstanta
lintas-bundle (`TORSI_NM_PER_KGF/LBFT/LBIN`, `MY_WRENCH_SCALE`) yang
aslinya baru didefinisikan belakangan di bundle B (tapi dipakai method
`Torsi` yg baru jalan setelah kedua bundle ter-load penuh di browser)
disuntikkan lewat `extraGlobals` — `MY_WRENCH_SCALE` dibangun ulang persis
rumus aslinya (bukan di-mock kosong) supaya `renderWrenchNote()` yang
otomatis terpanggil tiap `renderGaugeValues()` tidak crash. Cakupan
`computeCats()` (butuh `findTorsiDb` lintas-bundle) & `renderList()`/
`renderRow()` (murni string HTML) sengaja TIDAK dites di sini — test
checklist di atas menyuntik `Torsi.cats` manual dgn array kecil buatan
sendiri, fokus ke logika kalkulator/state, bukan re-verifikasi isi katalog
torsi (yang sudah "benar krn disalin dari buku manual resmi", bukan logika
yg bisa salah).

`npm test` → 187/187 pass, 0 fail. `node build.js` → sintaks bundle valid,
versi naik ke 147 (`kw80-merge-advisor-card-dashcards-22`). `npm run lint`
TIDAK bisa dijalankan di sesi ini krn sandbox tanpa akses internet —
tolong jalankan `npm run check` penuh (atau minimal `npm run lint`)
sebelum merge/release.

Dengan ini, semua item "BELUM DIKERJAKAN" di `CATATAN-CEK-CLAUDE.md` sudah
selesai KECUALI "Evaluasi split `transaksi.js`" yang memang butuh
konfirmasi desain dulu dari user sebelum dieksekusi.

## Catatan kerja — 2026-07-11 (bagian ke-5): split `transaksi.js` → `cicilan.js`

Konteks: user secara eksplisit meminta item terakhir yang tersisa di
`CATATAN-CEK-CLAUDE.md` ("Evaluasi split `transaksi.js`") dieksekusi —
ini keputusan desain/refactor besar yang sebelumnya sengaja ditahan
(lihat catatan bagian ke-3/ke-4 di atas) sampai ada konfirmasi user.

**Evaluasi:** `transaksi.js` sebelum split ≈1165 baris / 79+ fungsi —
file dengan risiko maintainability tertinggi menurut audit sebelumnya.
Dipilih memisahkan **logika form Cicilan** (paling mandiri & paling
gampang dikenali batasnya) ke `cicilan.js` baru:
`validateCicilanFields`, `calcCicilanPerBulanFromTotal`,
`calcCicilanTotalFromPerBulan`, `syncCicilanPreview`,
`getCicilanSharedMine`, `toggleCicilanSharedFields`, `syncCicilanDate`,
`openCicilanHistoryFromTx`. Bagian lain `transaksi.js` (BBM, stok
sparepart, stok/penjualan Cobek, transfer, target, dll) SENGAJA belum
dipisah di sesi ini — masing-masing area itu punya saling-ketergantungan
berbeda & butuh evaluasi terpisah supaya tidak jadi satu PR raksasa yang
susah di-review; cicilan dipilih duluan karena scope-nya paling jelas
(cuma dipakai lewat panel Cicilan di txModal + dipanggil balik dari
`_saveTxInner`/`editTx`/`setPayMethod`/`openTxModal` di transaksi.js).

**Kenapa aman dipindah (bukan cuma dipindah tanpa dicek):**
- Semua fungsi cicilan murni fungsi global (bukan namespace/module) —
  SAMA PERSIS sebelum & sesudah split, jadi tiap pemanggil (baik dari
  `transaksi.js` sendiri maupun dari atribut `data-action`/`onchange`/
  `oninput` di HTML `modals.js`) tidak perlu diubah sama sekali.
- Variabel state `cicilanLastInput`/`cicilanSharedLastInput`/
  `cicilanDateLinked` TETAP di `features-helpers-global-security.js`
  (tidak ikut dipindah) — file itu sudah dimuat lebih dulu di
  `build.js` sebelum `cicilan.js`/`transaksi.js`, jadi tidak ada
  masalah urutan load/referensi belum terdefinisi.
- `cicilan.js` didaftarkan di `GROUP_B` (`build.js`), tepat sebelum
  `transaksi.js` (posisi lama fungsi-fungsi ini) — build tetap satu
  bundle global, jadi tidak ada perubahan konsep module/namespace baru
  yang bisa bikin file lain (`worthit.js`, `modals.js`, dst) putus.
- Dicek referensi silang tiap fungsi cicilan ke SEMUA file source
  (`grep`) sebelum & sesudah pindah — tidak ada file lain yang
  meng-assume fungsi ini ada di `transaksi.js` secara spesifik (semua
  akses lewat nama fungsi global, bukan lewat isi file).
- `tests/tx-bbm-sync.test.js` (`loadSource(['transaksi.js'], ...)`)
  tetap hijau tanpa diubah — jalur yang dites sengaja "tunai" (bukan
  cicilan), dan pemanggilan `getCicilanSharedMine` di `_saveTxInner`
  ada di dalam cabang `curPayMethod==='cicilan'` yang tidak pernah
  tereksekusi di test itu, jadi tidak butuh `cicilan.js` ikut di-load.

**Hasil:** `transaksi.js` 1165 → 1070 baris, `cicilan.js` baru 112
baris (8 fungsi, semuanya dipindah verbatim — TIDAK ada perubahan
logika/perilaku, murni pengelompokan ulang file).

`npm test` → 187/187 pass, 0 fail (tidak ada test yang perlu diubah).
`node build.js` → sukses, sintaks kedua bundle valid, versi naik ke 148
(`kw80-merge-advisor-card-dashcards-23`). `npm run lint` TIDAK bisa
dijalankan di sesi ini krn sandbox tanpa akses internet (`npm install`/
`npx eslint` gagal 403) — tolong jalankan `npm run check` penuh (atau
minimal `npm run lint`) sebelum merge/release, supaya style file baru
`cicilan.js` ikut divalidasi terhadap `eslint.config.js`.

Sisa area besar `transaksi.js` (BBM, stok sparepart/Cobek, transfer,
target/tabungan, dll) belum dievaluasi untuk split lebih lanjut —
kalau mau dilanjutkan, sebaiknya satu area per sesi (sama seperti
pendekatan cicilan ini) supaya masing-masing tetap gampang di-review &
di-verifikasi lewat `npm run check`.

## Catatan kerja — 2026-07-11 (bagian ke-6): split `transaksi.js` → `tx-bbm.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5), area kedua yang
dipisah adalah **panel sinkron BBM** pada form Transaksi — dipilih setelah
cicilan karena scope-nya juga jelas & sudah ada test yang mengunci
perilakunya (`tests/bbm-log.test.js`, `tests/tx-bbm-sync.test.js`).

**Fungsi yang dipindah** ke `tx-bbm.js` baru: `populateTxBbmVehicleSelect`,
`toggleTxBbmFields`, `syncTxBbmAmt`, `syncTxAmtToLiter`,
`syncTxAmtToLiterForce`, `recordBbmLog`, `applyTxBbmFromTx`. Semua tetap
fungsi global verbatim (tidak ada perubahan logika), dipanggil sama persis
dari `transaksi.js` (`updateTxVehiclePanels`, `editTx`, `openTxModal`,
`_saveTxInner`), dari HTML (`modals.js`, atribut `oninput`/`onchange`), dan
dari file lintas-bundle `features-budget-laporan-carnotes-pelanggan.js`
(`BBM._saveInner` memanggil `recordBbmLog`).

**Kenapa aman dipindah:**
- `recordBbmLog` dipanggil dari `features-budget-laporan-carnotes-pelanggan.js`
  (GROUP_A) walau kini didefinisikan di `tx-bbm.js` (GROUP_B, dimuat
  setelah GROUP_A) — ini AMAN karena pemanggilannya baru terjadi lazy saat
  user menyimpan form BBM (setelah kedua bundle sudah selesai di-load di
  browser), bukan saat file GROUP_A pertama kali di-parse.
- `tx-bbm.js` didaftarkan di `GROUP_B` (`build.js`) tepat sebelum
  `transaksi.js` (posisi lama fungsi-fungsi ini, setelah `cicilan.js`).
- Dicek referensi silang tiap fungsi ke SEMUA file source sebelum & sesudah
  pindah — tidak ada file lain yang meng-assume fungsi ini ada persis di
  `transaksi.js`.
- **2 file test yang sebelumnya `loadSource(['transaksi.js'])` diupdate**
  supaya ikut memuat `tx-bbm.js`:
  - `tests/bbm-log.test.js` — sekarang `loadSource(['tx-bbm.js'], ...)`
    (recordBbmLog pindah lokasi, tapi test-nya sendiri TIDAK berubah
    assersinya sama sekali, cuma path file sumber).
  - `tests/tx-bbm-sync.test.js` — sekarang
    `loadSource(['tx-bbm.js', 'transaksi.js'], ...)` supaya
    `applyTxBbmFromTx`/`recordBbmLog` yang dipanggil dari dalam
    `_saveTxInner` tetap terdefinisi di sandbox test yang sama.

**Hasil:** `transaksi.js` 1070 → 1000 baris, `tx-bbm.js` baru 92 baris (7
fungsi, dipindah verbatim).

`npm test` → 187/187 pass, 0 fail (2 file test disesuaikan path
`loadSource`, TIDAK ada assersi/skenario test yang diubah). `node build.js`
→ sukses, sintaks kedua bundle valid, versi naik ke 149
(`kw80-merge-advisor-card-dashcards-24`). `npm run lint` TIDAK bisa
dijalankan di sesi ini krn sandbox tanpa akses internet — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok sparepart, stok/penjualan
Cobek, transfer antar akun, target/tabungan. Direkomendasikan tetap satu
area per sesi.

## Catatan kerja — 2026-07-11 (bagian ke-7): split `transaksi.js` → `tx-stok-sparepart.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/ke-6), area ketiga
yang dipisah adalah **panel "Tambah ke Stok Sparepart juga?"** pada form
Transaksi.

**Fungsi yang dipindah** ke `tx-stok-sparepart.js` baru:
`populateTxStockSelect`, `onTxStockItemChange`, `toggleTxStockFields`,
`applyTxStockFromTx`. Semua tetap fungsi global verbatim, dipanggil sama
persis dari `transaksi.js` (`updateTxVehiclePanels`, `_saveTxInner` — 3
titik panggil `applyTxStockFromTx` di jalur cicilan/langganan/tunai), dari
HTML (`modals.js`), dan dari `scan-ocr.js` (auto-centang panel stok saat
hasil scan struk terdeteksi sparepart).

**Kenapa aman dipindah:**
- Tidak ada test yang sebelumnya memanggil fungsi-fungsi ini langsung, TAPI
  `applyTxStockFromTx` dipanggil TANPA SYARAT di dalam `_saveTxInner`
  (baru early-return di dalam fungsinya sendiri kalau checkbox mati) —
  jadi `tests/tx-bbm-sync.test.js` (yang menjalankan `_saveTxInner` penuh)
  akan **ReferenceError** kalau `tx-stok-sparepart.js` tidak ikut di-load.
  Diupdate: `loadSource(['tx-bbm.js', 'tx-stok-sparepart.js',
  'transaksi.js'], ...)`. Skenario/assersi test itu sendiri TIDAK berubah
  (checkbox stok tetap `false` di semua kasusnya, jadi
  `applyTxStockFromTx` tetap early-return seperti sebelumnya — cuma
  memastikan fungsinya ADA/terdefinisi di sandbox).
- `tx-stok-sparepart.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  sebelum `transaksi.js` (setelah `cicilan.js`, `tx-bbm.js`).
- `scan-ocr.js` (juga GROUP_B, dimuat lebih dulu di `build.js` daripada
  `tx-stok-sparepart.js`) memanggil `onTxStockItemChange`/
  `toggleTxStockFields` secara lazy (dalam handler hasil scan, bukan saat
  file di-parse) — aman terlepas dari urutan definisi.

**Hasil:** `transaksi.js` 1000 → 943 baris, `tx-stok-sparepart.js` baru 72
baris (4 fungsi, dipindah verbatim).

`npm test` → 187/187 pass, 0 fail (1 file test disesuaikan path
`loadSource`). `node build.js` → sukses, sintaks kedua bundle valid, versi
naik ke 150 (`kw80-merge-advisor-card-dashcards-25`). `npm run lint` TIDAK
bisa dijalankan di sesi ini krn sandbox tanpa akses internet — tolong
jalankan `npm run check` penuh sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok/penjualan Cobek, transfer
antar akun, target/tabungan. Direkomendasikan tetap satu area per sesi.

## Catatan kerja — 2026-07-11 (bagian ke-8): split `transaksi.js` → `tx-transfer.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/6/7), area keempat
yang dipisah adalah **modal "⇄ Transfer Antar Akun"** (`transferModal`) —
dipilih karena scope-nya paling kecil & paling berdiri sendiri dari sisa
area yang belum dipecah (stok/penjualan Cobek, target/tabungan), jadi
risiko regresinya paling rendah.

**Fungsi yang dipindah** ke `tx-transfer.js` baru: `openTransferModal`,
`saveTransfer`. Keduanya tetap fungsi global verbatim (tidak ada perubahan
logika), dipanggil sama persis dari HTML (`modals.js`, atribut
`data-action="openTransferModal"` / `data-action="saveTransfer"`).

**Kenapa aman dipindah:**
- Tidak ada file source lain (`grep` menyeluruh) maupun test yang memanggil
  `openTransferModal`/`saveTransfer` — keduanya hanya dipanggil dari
  `data-action` di HTML, jadi tidak ada referensi langsung ke isi
  `transaksi.js` yang perlu disesuaikan.
- `tx-transfer.js` didaftarkan di `GROUP_B` (`build.js`) tepat setelah
  `tx-stok-sparepart.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — build tetap satu bundle global, urutan load tidak berubah utk
  modul lain.
- Tidak ada test yang perlu diupdate (tidak ada file test yang
  `loadSource(['transaksi.js'])` lalu memanggil salah satu dari 2 fungsi
  ini secara langsung).

**Hasil:** `transaksi.js` 943 → 924 baris, `tx-transfer.js` baru 32 baris (2
fungsi, dipindah verbatim, disisakan komentar penunjuk di lokasi lama).

`npm test` → 187/187 pass, 0 fail (tidak ada file test yang perlu diubah).
`node build.js` → sukses, sintaks kedua bundle valid (`node --check`),
lint bawaan `build.js` (u-dnone vs style.display, escapeHtml, chicken-egg
Tesseract) lolos tanpa temuan, versi naik ke 151
(`kw80-merge-advisor-card-dashcards-26`). Dicek manual: `openTransferModal`
& `saveTransfer` masing-masing cuma muncul 1x di source (`tx-transfer.js`)
& 1x di `app-bundle-b.min.js` (0x di `app-bundle-a.min.js`). `npm run lint`
TIDAK bisa dijalankan di sesi ini krn sandbox tanpa akses internet
(`npm install`/`npx eslint` gagal 403 Forbidden) — tolong jalankan
`npm run check` penuh (atau minimal `npm run lint`) sebelum merge/release.

Sisa area `transaksi.js` yang belum dipisah: stok/penjualan Cobek,
target/tabungan (`openTargetModal`, `onTargetAccChange`,
`onTargetDanaDaruratToggle`, `saveTarget`, `showTargetAccountTx`, dan
helper terkait `changeMonth`/`getTxListRange`/dst kalau mau dipisah jadi
domain "List Transaksi & Cashflow Forecast" tersendiri). Direkomendasikan
tetap satu area per sesi, dan **WAJIB** coba manual di browser (`?dev=1`):
buka form Transaksi → Transfer Antar Akun, isi & simpan transfer antar 2
akun, pastikan saldo kedua akun berubah dengan benar & muncul di riwayat
Keuangan — sandbox ini tidak punya browser jadi belum bisa diverifikasi
visual, hanya lolos cek sintaks & unit test.

## Catatan kerja — 2026-07-11 (bagian ke-9): split `transaksi.js` → `tx-cobek.js` + `tx-target.js`

Konteks: lanjutan sesi split `transaksi.js` (bagian ke-5/6/7/8), diminta
kerjakan dua area sisa sekaligus dalam satu sesi: **stok/penjualan Cobek**
dan **target/tabungan**.

**Temuan penting soal area Cobek:** berbeda dari BBM/Stok Sparepart, fungsi
panel form Cobek (`populateTxCobekStockSelect`, `onTxCobekStockItemChange`,
`toggleTxCobekStockFields`, `resetCobekStockCart`, `applyTxCobekStockFromTx`,
`populateTxCobekSaleSelect`, `onTxCobekSaleItemChange`,
`toggleTxCobekSaleFields`, `resetTxCobekSaleCart`, `applyTxCobekSaleFromTx`,
dst) **SUDAH ada di `cobek.js` sejak awal**, bukan hasil split sesi ini —
`transaksi.js` cuma memanggilnya. Satu-satunya bagian domain Cobek yang
murni tersisa di source `transaksi.js` adalah detektor
`isCobekStockCatName(catName,subName)` (dipakai `updateTxVehiclePanels()`
utk menentukan kapan panel Stok/Penjualan Cobek muncul) — jadi itu satu2nya
yang dipindah.

**Fungsi yang dipindah ke `tx-cobek.js` baru:** `isCobekStockCatName`.

**Fungsi yang dipindah ke `tx-target.js` baru:** `openTargetModal`,
`onTargetAccChange`, `onTargetDanaDaruratToggle`, `saveTarget`,
`showTargetAccountTx`, `addTarget`, `delTarget`. Fungsi domain lain yang
kebetulan tergabung historis di lokasi yang sama (`toggleMs`/milestone,
`delReminder`/pengingat, `saveCatatan`/`saveReminder`/`saveLDR`) **TIDAK**
ikut dipindah — beda domain, sengaja dibiarkan di `transaksi.js`.

**Kenapa aman dipindah:**
- Semua fungsi tetap global verbatim (tidak ada perubahan logika sama
  sekali), dipanggil sama persis dari HTML (`modals.js`, atribut
  `onchange`/`data-action`) dan dari `modules-render.js` (tombol
  `showTargetAccountTx`/`addTarget`/`delTarget` di kartu Target Pengaturan).
- `openTargetModal`/`onTargetDanaDaruratToggle` juga dipanggil lintas-bundle
  dari `modules-calc.js` & `aset.js` (banner "belum ada Dana Darurat") — ini
  AMAN karena panggilannya lazy (event klik), bukan saat file di-parse.
- `grep` menyeluruh: tidak ada file test yang `loadSource` lalu memanggil
  salah satu dari fungsi-fungsi ini secara langsung — **tidak ada file test
  yang perlu diubah** sama sekali di sesi ini.
- `tx-cobek.js` & `tx-target.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  setelah `tx-transfer.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — urutan load modul lain tidak berubah.

**Hasil:** `transaksi.js` 924 → 864 baris, `tx-cobek.js` baru 28 baris (1
fungsi), `tx-target.js` baru 67 baris (7 fungsi), semua dipindah verbatim.

`npm test` → 187/187 pass, 0 fail (tidak ada file test yang perlu diubah
sama sekali). `node build.js` → sukses, sintaks kedua bundle valid (`node
--check`), lint bawaan `build.js` (u-dnone vs style.display, escapeHtml,
chicken-egg Tesseract) lolos tanpa temuan, versi naik ke 152
(`kw80-merge-advisor-card-dashcards-27`). Dicek manual: tiap fungsi yang
dipindah muncul tepat 1x di source & hanya di `app-bundle-b.min.js` (0x di
`app-bundle-a.min.js`). `npm run lint` TIDAK bisa dijalankan di sesi ini krn
sandbox tanpa akses internet (`npm install`/`npx eslint` gagal) — tolong
jalankan `npm run check` penuh (atau minimal `npm run lint`) sebelum
merge/release.

**Sisa area `transaksi.js` yang belum dipisah:** transfer antar akun
sudah selesai (bagian ke-8), stok/Cobek & target/tabungan selesai di sesi
ini — domain besar yang tersisa hanyalah **"List Transaksi & Cashflow
Forecast"** (`changeMonth`, `setTxListPeriode`, `getTxListRange`,
`setPeriode`, `getRange`, `computeCashflowForecast`, `txHTML`, `delTx`,
`setKeuanganTab`) kalau memang mau dipecah jadi file tersendiri — scope-nya
lebih besar & lebih tersebar (dipakai banyak render function), jadi
disarankan direview dulu cross-reference-nya sebelum dieksekusi, sesi
terpisah. **WAJIB** coba manual di browser (`?dev=1`) untuk kedua area yang
baru dipindah sesi ini: (1) buka form Transaksi dengan kategori bernama
"Cobek"/"Shop", pastikan panel Stok/Penjualan Cobek tetap muncul & bisa
disimpan; (2) buka Pengaturan → Target, tambah target baru (dgn & tanpa
centang Dana Darurat, dgn & tanpa akun terkait), edit progres tabungan,
lihat transaksi akun terkait — sandbox ini tidak punya browser jadi belum
bisa diverifikasi visual, hanya lolos cek sintaks & unit test.

## Catatan kerja — 2026-07-11 (bagian ke-10): verifikasi browser split `tx-cobek.js` + `tx-target.js`

Lanjutan langsung bagian ke-9 di atas — sesi itu menutup dengan catatan
"WAJIB coba manual di browser" karena sandbox saat itu tidak punya
Chrome/Playwright. Sesi ini ternyata punya akses Chrome cache Puppeteer
(`/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/...`) dan
Playwright terpasang global, jadi kedua skenario itu langsung dijalankan
nyata (bukan mock, bukan cuma baca kode). **Tidak ada perubahan kode di
sesi ini — murni verifikasi.**

- `isCobekStockCatName`: dites pakai kategori Cobek asli di data
  (`Bisnis › Cobek`, id `sub_cb_cobek`) → `true`. Dites nama kategori/sub
  yang tidak nyambung sama sekali → `false`. Dites skenario intinya —
  rename total nama kategori & sub (mis. jadi "Bisnis Kios Renovasi" /
  "Peralatan Rumah Tangga") tanpa ganti id → tetap `true` lewat fallback
  id `sub_cb_cobek`/`sub_cbb_cobek`. Ini membuktikan fallback rename-proof
  yang jadi alasan fungsi ini ditulis memang betul jalan.
- Semua 7 fungsi `tx-target.js` (`openTargetModal`, `onTargetAccChange`,
  `onTargetDanaDaruratToggle`, `saveTarget`, `showTargetAccountTx`,
  `addTarget`, `delTarget`) ke-expose ke `window` (`typeof === 'function'`).
  Alur nyata: buka modal → isi nama & nominal → `saveTarget()` → 1 target
  baru masuk `D.targets` dengan field benar → toggle Dana Darurat memicu
  hint rekomendasi (angka & teks masuk akal) → `delTarget()` menghapus
  bersih dari array tanpa nyisa.
- 0 `pageerror` di console selama semua skenario di atas. Smoke-test
  internal tetap `✅ OK — 992 referensi getElementById() & 55 data-action
  semuanya valid`. `npm test` → 187/187 pass. `node build.js` → sukses,
  versi naik ke 153.

**Kesimpulan: tidak ada kekurangan (fungsi hilang/nyangkut) maupun
kelebihan (duplikat/sisa deklarasi ganda) di split `tx-cobek.js` +
`tx-target.js`.** File split ini sudah tuntas & terverifikasi penuh
(sintaks, unit test, DAN browser). Area split yang masih tersisa dari
`transaksi.js` tetap sama seperti disebut di bagian ke-9: **"List
Transaksi & Cashflow Forecast"** (`changeMonth`, `setTxListPeriode`,
`getTxListRange`, `setPeriode`, `getRange`, `computeCashflowForecast`,
`txHTML`, `delTx`, `setKeuanganTab`) — scope-nya lebih besar & lebih
tersebar dipakai banyak render function, jadi tetap disarankan sesi
terpisah dengan review cross-reference dulu sebelum eksekusi.

## Catatan kerja — 2026-07-11 (bagian ke-11): split `transaksi.js` → `tx-list-cashflow.js`

Konteks: eksekusi area terakhir yang disebut belum dipisah di bagian ke-9/
ke-10 — **"List Transaksi & Cashflow Forecast"**. Atas permintaan eksplisit
user ("jalankan pisah list transaksi").

**Fungsi yang dipindah ke `tx-list-cashflow.js` baru (9 fungsi + 1
variabel state):** `txHTML`, `delTx`, `changeMonth`, `txListPeriode` (let),
`setTxListPeriode`, `getTxListRange`, `setPeriode`, `getRange`,
`computeCashflowForecast`, `setKeuanganTab`. Semua dipindah verbatim, tidak
ada perubahan logika.

**Yang SENGAJA TIDAK ikut dipindah** (dipakai modul lain sejak sebelum
sesi ini, tetap di tempat asal): `curMonth`/`curYear` (deklarasi asli di
`features-helpers-global-security.js`), `txListPage`
(`filter-laporan.js`), `filterPeriode` (`features-helpers-global-security.js`),
`resetTxPageAndRender` (`filter-laporan.js`). Hanya `txListPeriode` yang
ikut pindah karena murni lokal punya `transaksi.js` & cuma dipakai bareng
`setTxListPeriode`/`getTxListRange`.

**Kenapa aman dipindah:**
- Semua fungsi tetap global verbatim, dipanggil sama persis dari HTML
  (`app_production.html`/`index.html`: `onclick="changeMonth(...)"`,
  `setTxListPeriode`, `setPeriode`, `setKeuanganTab`), dari
  `modules-render.js` (`renderKeuangan`/`renderLaporan`/
  `renderCashflowForecast` masing2 makai `getTxListRange`/`getRange`/
  `computeCashflowForecast`), dari `backup-restore.js` & `cobek.js`
  (`getRange`/`txHTML`/`computeCashflowForecast` utk ekspor & kartu shop),
  dan `features-sheets-pwa-selftest.js` (self-test makai `setKeuanganTab`).
- `deleteTxFromModal()` (tetap di `transaksi.js`) memanggil `delTx(id)` —
  aman karena deklarasi fungsi di-hoist di seluruh scope bundle gabungan,
  tidak tergantung urutan file selama satu bundle (sama seperti pola sesi
  sebelumnya).
- `grep` menyeluruh test suite: tidak ada test yang `loadSource` lalu
  memanggil salah satu dari 9 fungsi ini secara langsung — **tidak ada
  file test yang perlu diubah** sama sekali di sesi ini.
- `tx-list-cashflow.js` didaftarkan di `GROUP_B` (`build.js`) tepat
  setelah `tx-target.js` dan sebelum `transaksi.js` (posisi lama fungsi
  ini) — urutan load modul lain tidak berubah.

**Hasil:** `transaksi.js` 864 → 729 baris, `tx-list-cashflow.js` baru 159
baris (9 fungsi + 1 var). `npm test` → 187/187 pass, 0 fail (tidak ada
file test yang perlu diubah). `node build.js` → sukses, sintaks kedua
bundle valid, versi naik ke 154.

**Diverifikasi lewat browser nyata (Playwright + Chrome headless), bukan
cuma baca kode:**
- Semua 9 fungsi + `txListPeriode` ke-expose ke `window`.
- `changeMonth(-1)` → `curMonth`/`curYear` berubah benar (lintas tahun
  baru dites implisit lewat logic wrap month 0-11).
- `getTxListRange()` & `getRange()` mengembalikan objek `{from,to}` dengan
  `Date` valid.
- `computeCashflowForecast()` jalan tanpa error, field lengkap
  (`incAvg`/`expAvg`/`saldoNow`/`billsDue`/`upcoming`/`projected`).
- `txHTML(t)` dites dgn data transaksi contoh → HTML keluar benar, ada
  `data-action="editTx"` & `data-action="delTx"` dgn `data-args` ter-escape
  rapi.
- `setKeuanganTab('laporan')` → panel Laporan kebuka, `setKeuanganTab('kelola')`
  → balik ke panel Kelola, keduanya tanpa error.
- `delTx()` dites end-to-end: tambah transaksi dummy → hapus →
  `D.transactions` balik ke jumlah semula, tanpa nyisa.
- Smoke-test internal tetap `✅ OK — 992 referensi getElementById() & 55
  data-action semuanya valid`. 0 `pageerror` di seluruh skenario di atas.

**Kesimpulan: split ke-11 (List Transaksi & Cashflow Forecast) bersih,
tidak ada kekurangan (fungsi hilang/nyangkut) maupun kelebihan (duplikat/
sisa deklarasi ganda).** Dengan ini, **seluruh area besar dari roadmap
split `transaksi.js` (bagian ke-5 s/d ke-11) sudah tuntas** — `transaksi.js`
kini isinya murni form Tambah/Edit Transaksi (`setTxType`, autocomplete
kategori/produk, `updateTxVehiclePanels`, `openTxModal`/`editTx`/`saveTx`/
`_saveTxInner`) + beberapa fungsi kecil lintas-domain (`saveCatatan`,
`saveReminder`, `saveLDR`, `toggleMs`, `delReminder`) yang sengaja
dibiarkan gabung karena skalanya kecil & tidak cukup besar utk jadi file
sendiri.

## Catatan kerja — 2026-07-11 (bagian ke-12): housekeeping dokumentasi + `FILE-MAP.md` otomatis

Konteks: user tanya "apa yang belum dikerjakan" & minta saran supaya sesi
AI berikutnya tidak kebingungan cari file. 3 perbaikan, atas persetujuan
eksplisit user:

**1. Beresin `CATATAN-CEK-CLAUDE.md`:** 2 item ("Sinkronisasi BBM ↔
Transaksi ↔ Car Notes", "Logic Torsi Sparepart") sudah ditandai ✅ tapi
kesasar nangkring di bagian "BELUM DIKERJAKAN" (harusnya di "SUDAH
SELESAI" sesuai aturan file itu sendiri). Dipindah ke tempat yang benar,
"BELUM DIKERJAKAN" sekarang kosong (tidak ada item pending).

**2. Arsipkan `PEMISAHAN-FILE-ROADMAP.md` (2170 baris) — sudah basi
total.** Dokumen ini nyebut file (`features-etalase-piutang-renovai.js`,
`features-gaji-cobek-tagihan.js`, `features-renovasi-pajak-aset-order.js`,
dst) sebagai "belum dipecah" padahal file-file itu **sudah tidak ada** —
sudah dipecah jadi `cobek.js`/`aset.js`/`piutang-utang.js`/`renovasi.js`/
`gaji-calc.js`/`tagihan-kalender.js`/`akun.js`/`kategori.js`/dll di
sesi-sesi lain yang tidak balik update dokumen ini. Dipindah ke
`archive/PEMISAHAN-FILE-ROADMAP.md.OBSOLETE-2026-07-11.md` dengan header
peringatan besar di atasnya (bukan dihapus total — riwayat tetap ada,
cuma dikeluarkan dari jalur baca utama). `eslint.config.js` (`ignores`)
diupdate dari nama file spesifik jadi `archive/**` (lebih tahan lama,
otomatis nutupin apapun yang taruh di situ nanti).

**3. `FILE-MAP.md` — peta file & fungsi global auto-generated (perbaikan
utama).** Script baru `scripts/generate-file-map.js`, reuse
`getAllSourceFiles()`/`collectFromFile()` dari `scripts/collect-app-globals.js`
yang sudah ada (jadi cuma 1 implementasi parser top-level declaration,
tidak dobel). Kedua fungsi itu diexport tambahan dari
`collect-app-globals.js` (perubahan aditif, tidak mengubah perilaku
lama). Output `FILE-MAP.md` di root, 2 bagian:
  - Tabel file berurutan sesuai `GROUP_A`+`GROUP_B` (urutan load asli),
    tiap baris: jumlah baris + ringkasan 1-2 kalimat diekstrak otomatis
    dari komentar header file (`// nama-file.js — deskripsi...` yang
    memang sudah konsisten ditulis di kebanyakan file).
  - Index abjad semua identifier top-level (`function`/`const`/`let`/`var`)
    → nama file tempatnya dideklarasikan (852 identifier, 50 file per
    hitungan sesi ini).
  Dipanggil OTOMATIS di akhir `build.js` (setelah pesan "Build ... selesai
  & lolos cek sintaks", dibungkus try/catch supaya kegagalan generate
  peta TIDAK menggagalkan build produksi — cuma warning). Jadi peta ini
  selalu fresh tanpa langkah manual tambahan, sepanjang kebiasaan "jalankan
  `node build.js` tiap habis ubah source" (yang memang sudah jadi pola
  baku tiap sesi) tetap dijalankan.

**Kenapa ini lebih baik dari dokumen prosa manual:** peta yang
di-generate dari source tidak bisa basi seperti
`PEMISAHAN-FILE-ROADMAP.md` — kalau source berubah, generate ulang
otomatis ikut berubah. Sesi Claude berikutnya (atau manusia) tinggal
`grep nama_fungsi FILE-MAP.md` buat tahu ada di file mana, jauh lebih
cepat & akurat daripada `grep -rn` manual ke puluhan file source.

**Diverifikasi:**
- `node --check` lolos di `scripts/generate-file-map.js`, `build.js`,
  `scripts/collect-app-globals.js`.
- `node build.js` → sukses, `FILE-MAP.md` ke-generate ulang otomatis di
  akhir, versi naik ke 155. Isi dicek manual: fungsi hasil split
  bagian ke-9/ke-11 (`isCobekStockCatName`→`tx-cobek.js`,
  `openTargetModal`→`tx-target.js`, `txHTML`/`setKeuanganTab`/
  `computeCashflowForecast`→`tx-list-cashflow.js`) muncul benar.
- `npm test` → 187/187 pass, 0 fail.
- Smoke-test browser (Playwright + Chrome headless): `✅ OK — 992
  referensi getElementById() & 55 data-action semuanya valid`, 0
  `pageerror`. (Perubahan sesi ini murni tooling/dokumentasi + `build.js`,
  tidak menyentuh kode runtime app sama sekali, jadi risiko regresi UI
  nol — smoke-test cuma buat mastiin build.js yang diedit tidak
  merusak proses build/bundling.)
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint`
  sebelum merge/release utk mastiin `eslint.config.js` yang diedit
  (`ignores: 'archive/**'`) valid.

**Untuk sesi berikutnya:** kalau nambah/pindah/hapus file source lagi,
TIDAK perlu update dokumen manapun secara manual soal "file ini isinya
apa" — cukup pastikan `node build.js` dijalankan sampai selesai (sudah
kebiasaan baku), `FILE-MAP.md` otomatis ikut sinkron. Kalau perlu cari
sebuah fungsi/variabel global, cek `FILE-MAP.md` bagian 2 dulu sebelum
`grep -rn` manual.

## Catatan kerja — 2026-07-11 (bagian ke-13): validasi `eslint.config.js` manual + audit cakupan test

Konteks: user minta cek apakah `eslint.config.js` yang diedit sesi
sebelumnya valid (tanpa bisa `npm install` di sandbox ini), lalu minta
audit apakah `tests/*.test.js` sudah mencakup semua fitur/modul.

**1. Validasi `eslint.config.js` tanpa eslint asli (sandbox tetap tanpa
internet — `npm install` gagal 403 ke registry.npmjs.org, konsisten
dengan keterbatasan sesi-sesi sebelumnya):**
- `node --check eslint.config.js` & `node --check
  scripts/collect-app-globals.js` — syntax OK.
- `require('./eslint.config.js')` dieksekusi manual → 3 config block,
  struktur key sesuai schema flat config ESLint v9 (`ignores` /
  `files+languageOptions+rules` / `files+languageOptions`).
- `collectAppGlobals()` jalan tanpa error → 852 global app-specific +
  51 global browser = 903 total; semua value (`readonly`/`writable`)
  & semua key (nama identifier JS) valid — 0 invalid.
- **BELUM tervalidasi** (butuh eslint asli, tidak bisa disimulasikan):
  hasil lint SEBENARNYA (`no-undef`, `no-unused-vars`, dll) di seluruh
  source. Wajib jalankan `npm install && npm run lint` di mesin lokal
  (Node ≥20) sebelum merge/release.

**2. Audit cakupan `tests/*.test.js` (dijalankan pakai `node --test`
bawaan Node, tidak butuh `npm install`) → 187/187 pass, 0 fail, tapi
cakupan modul TIDAK lengkap.**

Modul yang SUDAH ada unit test (13 dari ~48 file fitur): `tx-bbm.js`,
`tx-stok-sparepart.js`, `transaksi.js`,
`features-budget-laporan-carnotes-pelanggan.js`,
`features-tukang-kendaraan-storage.js`, `modules-calc.js`,
`format-tema.js`, `gaji-calc.js`, `helper-teks.js`, `data-default.js`,
`features-helpers-global-security.js`, `pajak-pbb-zakat.js`,
`scan-ocr.js`. `modules-render.js` cuma dicek statis (registry check di
`dash-card-registry.test.js`, bukan logic test). `smoke-test.js`
structural check di browser (dev mode) — cek DOM id & window exposure,
bukan logic bisnis.

**Modul TANPA unit test sama sekali (~30+ file), 2 paling prioritas:**
- **`keamanan-pin.js`** — logic enkripsi PIN (PBKDF2+AES-GCM), paling
  security-sensitive di seluruh app, nol test.
- **`refleksi-selfcare.js`** — modul baru yang lagi aktif dikembangkan
  (gratitude journal, streak self-care, catatan PIN-encrypted), nol test.

Sisanya juga tanpa test: `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-transfer.js`, `tx-cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`,
`kasir.js`, `sewakios.js`, `renovasi.js`, `worthit.js`,
`tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`,
`kategori.js`, `kategorisasi-ai.js`, `linktx.js`, `kalkulator-input.js`,
`filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

**Saran untuk sesi berikutnya:** prioritaskan test buat `keamanan-pin.js`
(enkripsi/dekripsi PIN, forgot-PIN flow, edge case PIN salah) dan
`refleksi-selfcare.js` (streak logic, gratitude entry CRUD, PIN-encrypted
notes) dulu sebelum modul lain — keduanya security/data-integrity
sensitive dan `refleksi-selfcare.js` masih aktif berubah. File
`PRE-MERGE-LINT-CHECK.md` (baru, root) dibuat sebagai pengingat cepat
command yang harus dijalankan sebelum merge: `npm install && npm run
lint` (dan opsional `npm run check` buat lint+test+build sekaligus).

**Diverifikasi:**
- `node --check` lolos untuk `eslint.config.js` &
  `scripts/collect-app-globals.js`.
- `require('./eslint.config.js')` + `collectAppGlobals()` dieksekusi
  manual tanpa error, hasil di atas.
- `node --test tests/*.test.js` → 187/187 pass, 0 fail (tidak ada
  perubahan kode dilakukan sesi ini, murni audit + dokumentasi).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet) — sama seperti sebelumnya, tolong jalankan di lokal sebelum
  merge.

## Catatan kerja — 2026-07-11 (bagian ke-14): test buat bagian RINGAN `refleksi-selfcare.js`

Konteks: lanjutan bagian ke-13 (audit cakupan test), user minta "kerjakan
saran yg ringan dulu" — dari 2 modul prioritas tanpa test
(`keamanan-pin.js`, `refleksi-selfcare.js`), dipilih mengerjakan bagian
yang PALING RINGAN dulu: logic murni (tanpa kripto) di
`refleksi-selfcare.js`, bukan `keamanan-pin.js` (lebih berat karena butuh
mock Web Crypto/PBKDF2+AES-GCM async).

**File baru: `tests/refleksi-selfcare.test.js` (16 test, semua pass).**
Cakupan SENGAJA dibatasi ke bagian ringan:
- `Refleksi.computeStreak()` — pure logic (6 test): streak 0 hari,
  streak lanjut walau hari ini belum dicentang ("grace" utk hari
  berjalan), streak putus kalau kemarin JUGA belum dicentang, streak 5
  hari berturut-turut, array kosong dihitung sama dgn tidak checklist.
- `SelfCareReko.compute()` — widget rekomendasi (3 test): `ready:false`
  kalau data <5 hari, item "weakest" terdeteksi benar, `gratitudeCount`
  cuma hitung catatan DALAM window 14 hari.
- Jurnal Syukur `addGratitude`/`deleteGratitude` (4 test, pakai fakeDom):
  teks kosong ditolak, teks valid tersimpan & input dikosongkan,
  batal/konfirmasi hapus.
- Checklist `toggleSelfCare` (3 test, pakai fakeDom): toggle
  nyala/mati, key hari itu dihapus total dari `selfCareLog` saat item
  terakhir di-uncheck (bukan disisakan array kosong).

**SENGAJA belum dicakup** (lebih berat, disisakan utk sesi lanjutan):
bagian "Catatan Privat" (`addNote`/`toggleNoteView`/`deleteNote`) —
butuh mock `encryptApiKeyWithPin`/`decryptApiKeyWithPin`/
`_sessionRawPin` (skema kripto sama dgn `keamanan-pin.js`). Test buat
`keamanan-pin.js` sendiri juga masih kosong — itu jadi PR berikutnya yg
lebih berat (async Web Crypto).

**2 jebakan yang ketemu & diperbaiki selama nulis test ini (dicatat biar
sesi berikutnya tidak mengulang):**
1. Array yang lahir dari `push()` DI DALAM vm context (lewat
   `loadSource()`) constructor-nya beda realm dgn `Array` host walau
   `Array.isArray()`/isinya identik — `assert.deepEqual` (alias
   `deepStrictEqual` di mode `'assert/strict'`) gagal walau isi sama
   persis. Solusi: bungkus `Array.from(...)` dulu sebelum
   `assert.deepEqual`.
2. `createFakeDocument(initial)` MEMBUAT elemen fake baru lalu
   `Object.assign` nilai `initial` ke situ — BUKAN reuse referensi objek
   yg dioper. Jadi kalau mau baca nilai akhir suatu field (mis. `value`)
   setelah dipanggil kode yang dites, harus baca lewat
   `fakeDocument.getElementById(id)`, bukan variabel lokal yang tadinya
   dioper sbg initial value (itu tetap objek terpisah, tidak ikut
   berubah).

**Diverifikasi:**
- `node --check tests/refleksi-selfcare.test.js` — syntax OK.
- `node --test tests/*.test.js` → **203/203 pass, 0 fail** (naik dari
  187 sebelum sesi ini, +16 test baru, 0 regresi ke test lama).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge, terutama karena ada file baru (`tests/refleksi-selfcare.test.js`).

**Untuk sesi berikutnya:** modul tanpa test yang masih tersisa (lihat
bagian ke-13 utk daftar lengkap). Kalau lanjut ke bagian "berat" dari
`refleksi-selfcare.js` (catatan privat) atau ke `keamanan-pin.js`
langsung, siapkan dulu mock untuk `crypto.subtle`
(`importKey`/`deriveKey`/`encrypt`/`decrypt` — Node punya
`require('node:crypto').webcrypto` yang API-compatible, bisa dipakai
langsung sbg `crypto` global di `loadSource()` tanpa perlu mock manual).

## Catatan kerja — 2026-07-11 (bagian ke-15): test "Catatan Privat" (kripto asli, tanpa mock)

Konteks: lanjutan bagian ke-14, user minta lanjut ke bagian "berat" yang
disisakan — Catatan Privat terenkripsi di `refleksi-selfcare.js`.

**File baru: `tests/refleksi-catatan-privat.test.js` (9 test, semua
pass).** Kunci teknis: Node 22 punya `globalThis.crypto` (Web Crypto
ASLI) + `TextEncoder`/`TextDecoder`/`atob`/`btoa` built-in — jadi
`keamanan-pin.js` (sumber `encryptApiKeyWithPin`/`decryptApiKeyWithPin`)
di-load APA ADANYA tanpa mock kripto sama sekali. Round-trip
enkripsi→dekripsi di test ini BENERAN jalan (PBKDF2 100rb iterasi +
AES-GCM), bukan stub yang pura-pura berhasil. Ini sekaligus jadi test
PERTAMA yang menyentuh `encryptApiKeyWithPin`/`decryptApiKeyWithPin` —
belum ada test khusus buat `keamanan-pin.js` sendiri (PIN screen,
lockout, `gantiPin`, migrasi skema lama→baru — itu jadi PR terpisah,
lihat "untuk sesi berikutnya" di bawah).

Cakupan test:
- `addNote` (3 test): sesi PIN tidak aktif → ditolak; teks kosong →
  ditolak SEBELUM cek sesi PIN; sesi aktif + teks valid → tersimpan
  **terenkripsi** (diverifikasi eksplisit: `JSON.stringify(note.enc)`
  TIDAK mengandung judul/isi asli sama sekali, baik plaintext maupun
  base64-nya — ini yang paling penting, mastiin tidak ada kebocoran data
  mentah ke storage), input judul+teks ikut dikosongkan.
- `toggleNoteView` (4 test): PIN sesi sama → dekripsi sukses, judul+isi
  balik SAMA PERSIS (round-trip nyata); toggle 2x (buka→tutup) → balik
  status tersembunyi; PIN sesi BEDA (simulasi PIN sudah diganti) →
  dekripsi gagal, toast error, isi TIDAK ditampilkan; sesi PIN tidak
  aktif sama sekali → ditolak tanpa mencoba dekripsi.
- `deleteNote` (2 test): batal vs konfirmasi hapus, `_revealed` state
  ikut dibersihkan pas delete.

**Jebakan teknis yang ditemukan & solusinya:** `_sessionRawPin` di
`keamanan-pin.js` dideklarasikan `let` di top-level — vm TIDAK
menempelkannya ke context object (sama seperti catatan soal
const/let di `loadSource.js`), dan parameter `expose` di `loadSource()`
cuma bisa BACA nilai, bukan SET nilai baru dari luar test. Solusinya:
`vm.runInContext('_sessionRawPin = "1234";', ctx)` dijalankan langsung
ke context yang sama (`ctx` yang di-return `loadSource()` adalah
objek yang sudah di-`vm.createContext()`, jadi bisa dipakai lagi lewat
`vm.runInContext()` biasa) — ini dipakai sbg helper `setSessionPin(pin)`
di test buat simulasi "sesi PIN aktif/tidak aktif/berubah".

**Diverifikasi:**
- `node --check tests/refleksi-catatan-privat.test.js` — syntax OK.
- `node --test tests/*.test.js` → **212/212 pass, 0 fail** (naik dari
  203 di bagian ke-14, +9 test baru, 0 regresi).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge (ada 2 file test baru dari bagian ke-14 & ke-15).

**Untuk sesi berikutnya — sisa PR test yang belum dikerjakan:**
1. `keamanan-pin.js` sendiri masih tanpa test langsung: `hashPin`
   (deterministik, gampang), lockout PIN salah (`_pinLockState`/
   `_pinLockRemainingMs`/`updatePinLockUI` — perlu stub
   `localStorage`/`setInterval`), `gantiPin` (re-enkripsi API key lama
   ke PIN baru), `loadAndMigrateApiKeyOnUnlock` (migrasi skema lama →
   baru). Pola test kripto real (tanpa mock) yang dipakai di bagian
   ke-15 ini bisa langsung dipakai ulang.
2. Modul lain yang masih tanpa test sama sekali: lihat daftar lengkap di
   bagian ke-13 (masih ~28 file, dikurangi `refleksi-selfcare.js` yang
   sekarang sudah full tercakup — bagian ringan bagian ke-14 + bagian
   berat bagian ke-15 ini).

## Catatan kerja — 2026-07-11 (bagian ke-16): test `keamanan-pin.js` — hashPin, gantiPin, migrasi API key

Konteks: lanjutan saran prioritas #1 dari bagian ke-15 — `keamanan-pin.js`
sendiri masih tanpa test langsung. User setuju lanjut.

**File baru: `tests/keamanan-pin.test.js` (13 test, semua pass).** Sama
seperti bagian ke-15, pakai Web Crypto ASLI Node (`globalThis.crypto`),
BUKAN mock — round-trip enkripsi/dekripsi beneran jalan.

Cakupan:
- `hashPin` (3 test): deterministik (PIN sama → hash sama), PIN beda →
  hash beda, format hex SHA-256 valid (64 karakter 0-9a-f).
- `gantiPin` (4 test): batal (prompt kosong) → tidak ada perubahan sama
  sekali; PIN baru tidak valid (bukan 4 digit angka) → ditolak dgn
  alert; PIN baru valid tanpa API key lama → hash PIN baru tersimpan +
  sesi diupdate; PIN baru valid DENGAN API key lama → **re-enkripsi
  berhasil** (diverifikasi: hasil enkripsi baru beda dari yg lama krn
  salt/iv baru, TAPI tetap bisa dibuka dgn PIN baru & sudah TIDAK BISA
  dibuka lagi dgn PIN lama).
- `loadAndMigrateApiKeyOnUnlock` (6 test): sesi PIN tidak aktif → no-op;
  belum ada apa-apa tersimpan & belum ada apiKey → no-op; belum ada
  tersimpan tapi `D.profile.apiKey` sudah terisi manual → otomatis
  dienkripsi & disimpan; data tersimpan & PIN sesi cocok → dimuat apa
  adanya; **skema LAMA** (kunci enkripsi = hash PIN via `kw_pin`, bukan
  PIN mentah) → berhasil dimigrasi otomatis ke skema baru (dibaca via
  fallback legacy, lalu di-re-enkripsi ke skema baru, diverifikasi bisa
  dibuka lagi dgn skema baru setelahnya); skema baru MAUPUN lama
  dua-duanya gagal (PIN beneran berubah/data rusak) → `apiKey` TIDAK
  diisi, toast peringatan muncul (di-trigger sinkron di test dgn
  override `setTimeout` jadi langsung panggil, bukan nunggu 400ms
  beneran).

Pola helper baru di file ini: `makeFakeLocalStorage()` — mock in-memory
sederhana (`getItem`/`setItem`/`removeItem`) yang BENERAN dipakai
baca-tulis (bukan permissive no-op stub dari `loadSource.js` default),
karena `gantiPin`/`loadAndMigrateApiKeyOnUnlock` baca-tulis
`localStorage` langsung utk kunci `'kw_pin'` & `kw_apikey_enc`. Juga
`safeSetItem` di-stub supaya TETAP menulis ke `fakeLocalStorage` (bukan
cuma spy kosong) sambil tetap dicatat tiap panggilannya buat verifikasi.

**SENGAJA belum dicakup di sesi ini:** layar PIN interaktif & lockout
percobaan salah (`pinPress`/`pinBack`/`checkPin`/`updatePinLockUI`/
`_pinLockState`/`_pinLockRemainingMs`) — lebih banyak berurusan dgn
DOM keypad + timer interval, beda karakter testing-nya dari 3 fungsi di
atas (yang murni logic + kripto). `persistApiKeyEncrypted` (autosave
debounce 500ms) juga belum, tapi kecil kemungkinan berisiko tinggi
(cuma wrapper tipis di atas `encryptApiKeyWithPin` yg sudah teruji).

**Diverifikasi:**
- `node --check tests/keamanan-pin.test.js` — syntax OK.
- `node --test tests/*.test.js` → **225/225 pass, 0 fail** (naik dari
  212 di bagian ke-15, +13 test baru, 0 regresi).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge (sekarang ada 3 file test baru dari bagian ke-14/15/16
  yang menumpuk belum divalidasi lint-nya).

**Untuk sesi berikutnya:** kalau mau lanjut cakupan `keamanan-pin.js`
100%, sisanya lockout PIN (`_pinLockState` dkk, butuh fake
`setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
interaktif (`pinPress`/`checkPin`, butuh fakeDom + `pinBuffer` yg
juga `let` top-level, pola `setSessionPin`-nya sama persis dgn yg
dipakai di sini). Modul lain yg masih nol test: lihat daftar di bagian
ke-13 (sekarang berkurang 1 lagi: `keamanan-pin.js` bagian intinya sudah
tercakup, meski belum 100%).

## Catatan kerja — 2026-07-11 (bagian ke-17): test `tx-cobek.js` — `isCobekStockCatName`

Konteks: user minta "kerjakan saran yg ringan dulu" lagi. Dari 2 opsi
sisa di catatan bagian ke-16 (lanjut `keamanan-pin.js` — lockout PIN +
layar PIN interaktif, keduanya lebih berat krn butuh fake
`setInterval`/`Date.now` & fakeDom+`pinBuffer`; ATAU pilih salah satu
modul nol-test lain dari daftar bagian ke-13), dipilih yang PALING
RINGAN dari semuanya: `tx-cobek.js` (28 baris, satu fungsi murni
`isCobekStockCatName`, tidak baca/tulis DOM sama sekali — cuma baca
`D.categories`), bukan lanjut `keamanan-pin.js`.

**File baru: `tests/tx-cobek.test.js` (10 test, semua pass).** Fungsi ini
menentukan kapan panel Stok/Penjualan Cobek/Shop muncul di form
Transaksi (dipanggil dari `updateTxVehiclePanels()` di `transaksi.js`).
Cakupan:
- Cocok langsung by nama kategori/subkategori mengandung "cobek" atau
  "shop" (case-insensitive), termasuk saat `D.categories` kosong sama
  sekali (bagian ini tidak butuh lookup ke `D` sama sekali).
- `catName`/`subName` `undefined`/`null`/tidak diisi → tidak error,
  balik `false` (fallback ke string kosong sebelum di-regex).
- Fallback lewat ID internal (`sub_cb_cobek`/`sub_cbb_cobek`) tetap
  `true` walau nama kategori & subkategori SUDAH di-rename user jadi
  sama sekali tidak mengandung kata "cobek"/"shop" — ini bagian paling
  penting krn fitur rename kategori memang ada di app (beda dari kasus
  kendaraan di `resolveVehicleTxCategory` yg belum ada UI rename-nya).
- Fallback ID diverifikasi jalan baik dari `D.categories.expense`
  maupun `D.categories.income`.
- Kategori ketemu by nama tapi `sub.id` bukan salah satu dari 2 id yg
  dikenali → `false` (tidak asal true krn kategorinya "mirip").
- `subName` yang diberikan tidak ada di daftar `subs` kategori yg
  ketemu → `false`, tidak error/throw.

**Tidak ada bug ditemukan** — `isCobekStockCatName` sudah benar sesuai
komentar di source-nya sendiri; sesi ini murni menambah test yang
sebelumnya nol utk fungsi ini (sama seperti pola "review tanpa bug" di
catatan kerja Car Notes 2026-07-10/11 di atas).

**Diverifikasi:**
- `node --check tests/tx-cobek.test.js` — syntax OK.
- `node --test tests/*.test.js` → **235/235 pass, 0 fail** (naik dari
  225 di bagian ke-16, +10 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan (u-dnone,
  escapeHtml, chicken-egg OCR), versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-31` (build #156), kedua bundle
  lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file,
  852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet, `npm install` gagal 403 ke registry) —
  tolong jalankan `npm run lint` di lokal sebelum merge/release (ada 1
  file test baru dari bagian ke-17 yg menumpuk dgn bagian ke-14/15/16
  yg juga belum divalidasi lint-nya di mesin lokal).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN)** Modul kecil lain yg masih nol test dari daftar bagian
   ke-13, kandidat murni-logic tanpa DOM berat: `tx-transfer.js` (32
   baris, mirip pola `tx-cobek.js`), lalu file "kalkulator" yg
   kemungkinan besar pure-function: `kalkulator-input.js` (140 baris),
   `worthit.js` (467 baris), `edukasi-dana.js` (173 baris),
   `hidup-seimbang.js` (218 baris) — belum dicek detail isinya, perlu
   baca dulu sebelum pilih.
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola `tests/refleksi-selfcare.test.js`:
   `akun.js`, `cicilan.js`, `tx-target.js`, `piutang-utang.js`,
   `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (`_pinLockState`/`_pinLockRemainingMs`/`updatePinLockUI`, butuh fake
   `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`, butuh fakeDom +
   `pinBuffer` yg jg `let` top-level — pola `setSessionPin` di
   `tests/keamanan-pin.test.js` bisa dipakai ulang).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir krn ukurannya jauh lebih besar dari yg lain,
   butuh sesi tersendiri utk dipetakan dulu strukturnya sebelum nulis
   test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js` yg baru
selesai bagian ke-17 ini) dari bagian ke-13: `akun.js`, `aset.js`,
`cicilan.js`, `cobek.js`, `piutang-utang.js`, `tx-target.js`,
`tx-transfer.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`worthit.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `kalkulator-input.js`, `filter-laporan.js`,
`hidup-seimbang.js`, `edukasi-dana.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-18): test `tx-transfer.js` — `openTransferModal` & `saveTransfer`

Konteks: lanjutan bagian ke-17, user minta lanjut saran berikutnya. Dari
daftar prioritas di catatan bagian ke-17 (opsi 1, "RINGAN": `tx-transfer.js`
dulu sebelum kalkulator2 yg belum dicek isinya), dipilih `tx-transfer.js`
(32 baris, 2 fungsi: `openTransferModal` & `saveTransfer`). Beda dari
`tx-cobek.js` (murni tanpa DOM), dua fungsi ini baca/tulis DOM langsung
(`getElementById`) — jadi dites pakai `fakeDom`, pola sama seperti
`tests/refleksi-selfcare.test.js`, tetap tergolong "ringan" krn tidak ada
kripto/timer/async rumit.

**File baru: `tests/tx-transfer.test.js` (12 test, semua pass).**
Cakupan:
- `openTransferModal` (4 test): reset `trAmt`/`trNote` jadi kosong,
  `trDate` di-set ke tanggal hari ini (ISO), manggil
  `populateAccFilters()` & `openModal('transferModal')`, `trTo.selectedIndex`
  diarahkan ke akun kedua HANYA kalau akun >1 (kalau cuma 1 akun,
  `selectedIndex` tidak disentuh sama sekali).
- `saveTransfer` validasi (3 test): jumlah kosong/nol ditolak, jumlah
  negatif ditolak, akun asal===tujuan ditolak — ketiganya via toast,
  tidak menambah transaksi apa pun.
- `saveTransfer` jalur sukses (5 test): tepat 2 transaksi baru
  (`transfer_out` dari akun asal + `transfer_in` ke akun tujuan) dgn
  jumlah/tanggal/kategori sama persis; catatan kosong → default
  `"Transfer"` + nama akun lawan diselipkan (`→`/`←`); catatan custom
  dipertahankan bukan ditimpa; nama akun di catatan di-`escapeHtml()`
  (dicek eksplisit tag `<b>` tidak lolos mentah); efek samping lengkap
  (`save()`, `closeModal('transferModal')`, `renderDashboard()`,
  `renderKeuangan()`, toast sukses) semua terpanggil.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17, sesi ini murni
menambah test yang sebelumnya nol utk `tx-transfer.js`.

**Diverifikasi:**
- `node --check tests/tx-transfer.test.js` — syntax OK.
- `node --test tests/*.test.js` → **247/247 pass, 0 fail** (naik dari
  235 di bagian ke-17, +12 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-32` (build #157), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 2 file test baru menumpuk dari
  bagian ke-17/ke-18 yg belum divalidasi lint-nya, ditambah sisa dari
  bagian ke-14/15/16 sebelumnya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN, belum dicek isinya)** Kandidat kalkulator murni-logic dari
   opsi 1 bagian ke-17 yg tersisa: `kalkulator-input.js` (140 baris),
   `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218 baris),
   `worthit.js` (467 baris) — perlu dibaca dulu isinya sebelum pilih
   mana yg paling ringan (blm tentu semuanya pure-function spt namanya).
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola bagian ke-18 ini: `akun.js`,
   `cicilan.js`, `tx-target.js`, `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (`_pinLockState`/`_pinLockRemainingMs`/`updatePinLockUI`, butuh fake
   `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`, butuh fakeDom +
   `pinBuffer` yg jg `let` top-level — pola `setSessionPin` di
   `tests/keamanan-pin.test.js` bisa dipakai ulang).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js` bagian ke-17 &
`tx-transfer.js` bagian ke-18 ini): `akun.js`, `aset.js`, `cicilan.js`,
`cobek.js`, `piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `kalkulator-input.js`,
`filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-19): test `kalkulator-input.js` — bagian ringan (`safeCalc`/`normalizeAmtToken`/preview/`evalAmtExpr`)

Konteks: lanjutan bagian ke-18, user minta lanjut lagi. Dari opsi 1 di
catatan bagian ke-18 (4 kandidat kalkulator belum dicek isinya), dibaca
dulu isi ke-4 file: `kalkulator-input.js` (140 baris) ternyata isinya
paling pas dgn "ringan" — parser ekspresi murni (`safeCalc`,
`normalizeAmtToken`) + 2 fungsi DOM-ringan (`updateAmtPreview`,
`evalAmtExpr`) TANPA state top-level `let` — jadi dipilih duluan drpd
`worthit.js`/`edukasi-dana.js`/`hidup-seimbang.js` yg belum tentu
sesederhana itu.

**Cakupan file ini SENGAJA dibatasi**, sama pola-nya dgn split
ringan/berat di `refleksi-selfcare.js` (bagian ke-14/15): popup
kalkulator interaktif (`openCalc`/`calcPress`/`calcClear`/
`calcBackspace`/`calcEquals`/`calcUseResult`/`calcRenderDisplay`) pakai
`let calcExpr`/`calcTargetId` top-level yg perlu di-reset lewat
`vm.runInContext` (pola sama dgn `_sessionRawPin`/`pinBuffer` di
`keamanan-pin.js`) — disisakan utk sesi lanjutan yg lebih "sedang"
beratnya, TIDAK dikerjakan di sesi ini.

**File baru: `tests/kalkulator-input.test.js` (26 test, semua pass).**
Cakupan:
- `safeCalc` (10 test): tambah/kurang, precedence kali/bagi vs
  tambah/kurang, tanda kurung, pembagian dgn 0 → `NaN` (bukan
  `Infinity`), unary minus/plus, ekspresi tidak lengkap (`"2+"`) →
  `NaN`, karakter di luar whitelist (huruf/simbol lain, termasuk upaya
  injeksi kayak `"alert(1)"`/`"2;3"`) → `NaN`, input bukan
  string/kosong/whitespace-only → `NaN`, token tersisa yg tidak
  konsisten (`"2 3"`) → `NaN`, angka desimal biasa dihitung benar.
- `safeCalc` gaya pemisah ribuan ala Indonesia (2 test, ini bagian yg
  paling gampang salah kalau di-refactor tanpa test): `"1.000"` →
  dinormalisasi jadi `1000` (BUKAN `1.0`), `"1.000.000"` → `1000000`.
- `normalizeAmtToken` (4 test, akses fungsi ini langsung terpisah dari
  `safeCalc` krn dia top-level `function` sendiri): tanpa titik apa
  adanya, segmen terakhir 1-2 digit dianggap desimal, segmen terakhir
  3+ digit dianggap ribuan (titik dibuang semua), kombinasi ribuan+desimal
  (`"1.000.50"` → `"1000.50"`).
- `calcPreviewValue` (3 test): falsy/kosong → 0, ekspresi tidak valid →
  0 (bukan `NaN`, penting krn dipakai langsung sbg angka di UI),
  ekspresi valid → hasil hitungnya.
- `updateAmtPreview` (3 test, pakai fakeDom): elemen tidak ketemu →
  no-op tanpa error, hasil >0 → preview terisi `"= " + fmt(hasil)`,
  hasil 0/negatif → preview dikosongkan (termasuk kasus preview
  sebelumnya ada isi lama, harus ke-reset).
- `evalAmtExpr` (5 test, pakai fakeDom + `class FakeEvent` yg di-inject
  manual krn vm sandbox `loadSource()` tidak menyediakan `Event`
  bawaan): elemen tidak ketemu → no-op; value tanpa karakter
  operator/titik (mis. `"500"` polos) → TIDAK diubah & TIDAK dispatch
  event (regex trigger `/[+\-*/.]/ `sengaja butuh minimal satu operator
  atau titik); ekspresi valid → value ditimpa hasil hitung & dispatch
  event `"input"` dgn `bubbles:true`; ekspresi invalid (hasil `NaN`) →
  value TIDAK diubah, tidak dispatch event; hasil dibulatkan 2 desimal
  (`"10/3"` → `"3.33"`).

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18, sesi ini
murni menambah test yg sebelumnya nol utk bagian ringan file ini.

**Diverifikasi:**
- `node --check tests/kalkulator-input.test.js` — syntax OK.
- `node --test tests/*.test.js` → **273/273 pass, 0 fail** (naik dari
  247 di bagian ke-18, +26 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-33` (build #158), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 3 file test baru menumpuk dari
  bagian ke-17/18/19 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Lanjut `kalkulator-input.js` bagian yg disisakan: popup
   kalkulator interaktif (`openCalc`/`calcPress`/`calcClear`/
   `calcBackspace`/`calcEquals`/`calcUseResult`/`calcRenderDisplay`) —
   butuh helper `vm.runInContext('calcExpr = "...";', ctx)` spt pola
   `setSessionPin` di `tests/keamanan-pin.test.js`, tapi TIDAK butuh
   kripto/timer async — jadi masih lebih ringan drpd sisa
   `keamanan-pin.js` (opsi 3 di bawah).
2. **(RINGAN, belum dicek isinya)** 3 kandidat kalkulator lain yg belum
   dicek: `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218
   baris), `worthit.js` (467 baris, paling besar dari yg "kalkulator").
3. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom spt pola bagian ke-18: `akun.js`,
   `cicilan.js`, `tx-target.js`, `piutang-utang.js`, `aset.js`.
4. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
5. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

Daftar modul nol-test yg TERSISA (dikurangi `tx-cobek.js`/`tx-transfer.js`
bagian ke-17/18; `kalkulator-input.js` bagian ke-19 ini SEBAGIAN sudah
tercakup, popup interaktifnya belum): `akun.js`, `aset.js`, `cicilan.js`,
`cobek.js`, `piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`hidup-seimbang.js`, `edukasi-dana.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-20): test `kalkulator-input.js` — popup interaktif (`kalkulator-input.js` 100% tercakup)

Konteks: lanjutan bagian ke-19, user minta lanjut lagi. Sesuai opsi 1 di
catatan bagian ke-19 ("SEDANG": lanjut popup kalkulator interaktif —
lebih ringan drpd sisa `keamanan-pin.js` krn tidak ada kripto/timer
async), dikerjakan sekarang: `openCalc`/`closeCalc`/`calcPress`/
`calcClear`/`calcBackspace`/`calcEquals`/`calcUseResult`/
`calcRenderDisplay` — semuanya baca/tulis 2 variabel top-level `let
calcTargetId, calcExpr`.

**Teknik:** sama persis pola `setSessionPin`/`getSessionPin` di
`tests/keamanan-pin.test.js` (bagian ke-16) — `vm.runInContext('calcExpr
= ...;', ctx)` utk nulis, `vm.runInContext('calcExpr', ctx)` utk baca,
krn `let` top-level TIDAK otomatis nempel ke objek context vm (beda dari
`function`/`var`). Helper `setCalcExpr`/`getCalcExpr`/`setCalcTargetId`/
`getCalcTargetId` dibungkus di `makeCalcPopup()`.

**File baru: `tests/kalkulator-popup.test.js` (24 test, semua pass).**
`kalkulator-input.js` sekarang 100% tercakup (gabungan dgn
`tests/kalkulator-input.test.js` bagian ke-19). Cakupan:
- `openCalc`/`closeCalc` (5 test): target berisi angka murni (boleh
  titik, TANPA operator) → `calcExpr` diisi dari value target itu;
  target berisi ekspresi (ada operator, mis. `"2+3"`) → `calcExpr` mulai
  kosong (regex `/^[0-9.]+$/` sengaja menolak apa pun selain
  digit/titik); target kosong → kosong; `openModal('calcModal')` &
  `calcRenderDisplay()` ikut terpanggil; `closeCalc` → `closeModal('calcModal')`.
- `calcRenderDisplay` (4 test): `calcExpr` kosong → valEl `"0"`;
  berakhiran operator → valEl apa adanya, exprEl kosong; ekspresi
  lengkap & valid → exprEl tampilkan ekspresi, valEl tampilkan hasil;
  ekspresi tidak valid (`"5//3"`, walau tidak mungkin lahir dari
  `calcPress` normal) → tidak crash, fallback tampilkan `calcExpr`
  mentah di kedua elemen.
- `calcPress` (5 test): tekan operator saat kosong → diberi awalan
  `"0"`; tekan angka/titik → cuma di-append; tekan operator saat SUDAH
  berakhiran operator → operator lama diganti (bukan ditumpuk, mis.
  `"5+"` + tekan `"*"` → `"5*"`, bukan `"5+*"`); tekan operator normal →
  ditambahkan di akhir; DOM ikut ter-update tiap tekan (manggil
  `calcRenderDisplay` di dalamnya).
- `calcClear`/`calcBackspace` (3 test): clear total apa pun isinya;
  backspace hapus 1 karakter terakhir; backspace saat sudah kosong →
  tidak error, tetap kosong.
- `calcEquals` (3 test): ekspresi valid → `calcExpr` ditimpa hasil akhir
  (dibulatkan 2 desimal); ekspresi belum lengkap (berakhiran operator,
  hasil `NaN`) → `calcExpr` TIDAK berubah (diabaikan, user masih bisa
  lanjut mengetik); pembagian desimal dibulatkan benar (`"10/3"` →
  `"3.33"`).
- `calcUseResult` (4 test): `calcTargetId` belum di-set (`null`) → cuma
  nutup modal, tidak nyentuh elemen; `calcExpr` angka murni (tanpa
  operator/titik) → dipakai apa adanya (TIDAK dilewatkan `safeCalc` lagi
  — regex trigger butuh minimal 1 operator/titik); `calcExpr` ekspresi
  valid → dihitung dulu, hasilnya yg dipakai; `calcExpr` tidak valid
  (`NaN`) → value target sama sekali TIDAK disentuh (tetap nilai lama),
  tapi modal tetap ditutup (`closeCalc()` selalu jalan di akhir apa pun
  hasilnya).

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19, sesi ini
murni menambah test yg sebelumnya nol utk bagian popup file ini.

**Diverifikasi:**
- `node --check tests/kalkulator-popup.test.js` — syntax OK.
- `node --test tests/*.test.js` → **297/297 pass, 0 fail** (naik dari
  273 di bagian ke-19, +24 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-34` (build #159), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini
  (sandbox tanpa internet) — tolong jalankan `npm run lint` di lokal
  sebelum merge/release (sekarang ada 4 file test baru menumpuk dari
  bagian ke-17/18/19/20 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN, belum dicek isinya)** 3 kandidat kalkulator lain yg belum
   dicek: `edukasi-dana.js` (173 baris), `hidup-seimbang.js` (218
   baris), `worthit.js` (467 baris).
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`kalkulator-input.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test —
dikeluarkan dari daftar di bawah. Daftar modul nol-test yg TERSISA (sebelum
bagian ke-21 di bawah):
`akun.js`, `aset.js`, `cicilan.js`, `cobek.js`, `piutang-utang.js`,
`tx-target.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`worthit.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `filter-laporan.js`, `hidup-seimbang.js`, `edukasi-dana.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-21): test `edukasi-dana.js` (EduFund) & `hidup-seimbang.js` (LifeBalance) — 2 kandidat paling ringan dari opsi 1 bagian ke-20

Konteks: user minta "kerjakan saran yg paling ringan" dari 2 file dulu. Dari
opsi 1 di catatan bagian ke-20 ("3 kandidat kalkulator lain yg belum dicek:
`edukasi-dana.js` 173 baris, `hidup-seimbang.js` 218 baris, `worthit.js` 467
baris"), dipilih 2 yg PALING RINGAN (baris paling sedikit): `edukasi-dana.js`
dan `hidup-seimbang.js`. `worthit.js` (467 baris, terbesar dari 3 kandidat)
sengaja belum dikerjakan, disisakan utk sesi berikutnya.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19/20, sesi ini
murni menambah test yg sebelumnya nol utk kedua modul ini, tidak ada
perubahan di kode aplikasi.

**File baru: `tests/edukasi-dana.test.js` (18 test, `EduFund`).** Cakupan:
`calc()` (5 test: tahun target lewat/tahun ini → `pmtBulanan` = kekurangan
sekaligus; kasus normal pakai rumus anuitas inflasi≠return; kasus
inflasi==return → dibagi rata per bulan; terkumpul melebihi target →
kekurangan diklem 0; `accountId` terisi → terkumpul diambil dari
`recalcAccBalance()` bukan field manual), `updatePreview()` (3 test: pesan
warning kalau tahun target lewat, preview normal, `eduSavedWrap`
tampil/sembunyi sesuai akun dipilih), `save()` (5 test: validasi nama &
biaya kosong, entry baru, mode edit update di tempat, `accountId` terisi
→ `terkumpul` dipaksa 0), `del()` (1 test), `renderDashMini()` (2 test:
card disembunyikan kalau kosong, total/pct dihitung benar), `render()`
(2 test: empty state, linkTag akun ikut dirender). `openModal()` (murni
prefill form dari data existing — pola sama dgn BBM.openModal/
Servis.openModal yg sudah didokumentasikan nilai gunanya lebih rendah) dan
`checkAI()` (butuh mock `callAIProviderRaw`/`RefAI._parseJSON`/
`showPromptModal` async, ranah test terpisah yg lebih berat) SENGAJA belum
dites, konsisten dgn pola pembatasan cakupan di bagian-bagian sebelumnya.

**File baru: `tests/hidup-seimbang.test.js` (29 test, `LifeBalance`).**
Cakupan: `compute()` (11 test: Dana Darurat kosong/50%/>100% diklem;
DSR income belum ada → netral 13 + `thin:true`, DSR normal & filter
cicilan yg `sisaTenor` null/bukan `kind:'cicilan'` diabaikan; No Spend
histori <7 hari → netral+thin, No Spend normal; Kerja-Istirahat tanpa
Absensi → netral+thin, kerja penuh 7 hari → 0 poin, 2+ hari istirahat →
poin penuh diklem; total & level di 4 ambang batas Seimbang/Cukup
Baik/Perlu Perhatian/Waspada — termasuk catatan penting: **field `thin`
HANYA ada di 3 komponen (DSR/No-Spend/Kerja), Dana Darurat TIDAK PERNAH
`thin` krn kosongnya sudah tercermin lewat `ddPts:0`, bukan nilai netral**),
`getFocusAreas()` (2 test: filter pct<70% urut naik maks 2, semua ≥70% →
kosong), `render()`/`renderFocus()` (4 test: skor & ring ter-tulis,
`lbDataNote` tampil/sembunyi sesuai ada-tidaknya komponen `thin`, pesan
"Pertahankan" kalau tidak ada area fokus), `saveSnapshot()` (3 test:
entry baru, update snapshot tanggal yg sama termasuk flag `auto` ketimpa
saat manual, auto-save tidak toast), `autoSnapshotIfNeeded()` (3 test:
skip kalau app masih kosong total, skip kalau sudah ada snapshot bulan
ini, buat baru kalau syarat terpenuhi), `deleteSnapshot()` (2 test:
konfirmasi vs batal), `renderTrendBadge()` (3 test: <2 snapshot
disembunyikan, delta naik/turun). `renderHistoryModal()` (chart SVG +
list riwayat, murni DOM-write dari data yg sudah dites lewat
`saveSnapshot()`) SENGAJA belum dites detail — nilai gunanya lebih rendah.

**Catatan teknis satu kesalahan yg kejadian & diperbaiki SAAT menulis test
(bukan bug di kode aplikasi)**: draft awal test skenario total/level salah
asumsi keempat komponen "netral" bernilai 13 semua (13×4=52). Ternyata
Dana Darurat TIDAK punya jalur netral — kalau belum ada Target Dana
Darurat, `ddPts` langsung 0 (bukan 13), jadi total kondisi "semua data
kosong" yg benar adalah 0+13+13+13=**39** (level Waspada), bukan 52.
Ketahuan sendiri lewat `node --test` gagal (assertion mismatch), lalu
draft test dikoreksi mengikuti perilaku source yg sebenarnya (source TIDAK
diubah).

**Diverifikasi:**
- `node --test tests/*.test.js` → **344/344 pass, 0 fail** (naik dari 297
  di bagian ke-20, +47 test baru dari 2 file test baru ini, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-35` (build #160), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet) — tolong jalankan `npm run lint` di lokal sebelum
  merge/release (sekarang ada 2 file test baru menumpuk dari bagian
  ke-21 ini yg belum divalidasi lint-nya, ditambah tumpukan dari
  bagian ke-17/18/19/20 yg juga belum divalidasi).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(RINGAN)** `worthit.js` (467 baris) — kandidat "kalkulator" terakhir
   yg tersisa dari daftar bagian ke-19/20, belum dicek isinya sama sekali.
2. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
3. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
4. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`edukasi-dana.js` & `hidup-seimbang.js` SEKARANG SUDAH tidak lagi masuk
daftar nol-test. Daftar modul nol-test yg TERSISA (sebelum bagian ke-22
di bawah): `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `worthit.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`,
`onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-22): test `worthit.js` (WorthIt) — kandidat terakhir dari daftar "kalkulator" bagian ke-19/20/21

Konteks: user minta "lanjutkan" dari catatan bagian ke-21. Sesuai opsi 1
di catatan bagian ke-21 ("(RINGAN) `worthit.js` 467 baris — kandidat
kalkulator terakhir yg tersisa"), dikerjakan sekarang. Dgn ini, seluruh
daftar "3 kandidat kalkulator" dari bagian ke-19 (`edukasi-dana.js`,
`hidup-seimbang.js`, `worthit.js`) sudah selesai semua.

**Tidak ada bug ditemukan** — sama seperti bagian ke-17/18/19/20/21, sesi
ini murni menambah test yg sebelumnya nol utk modul ini, tidak ada
perubahan di kode aplikasi.

**File baru: `tests/worthit.test.js` (47 test, `WorthIt`).** Cakupan:
- `incomeAvg()` (2 test): filter HANYA transaksi `type:'income'` dlm
  rentang bulan efektif, dibagi rata sesuai `FI.effectiveMonths()`.
- `computeScore()` (10 test, fungsi scoring Prioritas Belanja): poin dasar
  kebutuhan vs keinginan, urgensi mendesak/bisa_nunggu/nice_to_have,
  pengurang `sudahPunya` (poin & teks alasan custom), diskon 3 ambang
  (≥30% hijau naik faktor beda tergantung `sudahPunya` 0.4 vs 0.2, 10-30%
  orange, <10% merah "diskon palsu"), tekanan saldo 2 ambang (>50%/25-50%
  merah/orange), dan skor selalu diklem ke rentang 0-100.
- `hitung()` (14 test, verdict & issue list "Cek Sebelum Beli" single-item):
  validasi harga kosong, Dana Darurat kosong/100%/<100% (beda level merah
  vs orange tergantung kategori keinginan/kebutuhan), DSR sesudah cicilan
  baru >35% → verdict TUNDA DULU, saldo terkuras >50%, metode tunai
  surplus positif (estimasi bulan nabung) & negatif (data cukup vs belum
  cukup → beda pesan), selisih bunga cicilan vs tunai, diskon valid
  (hemat besar) & invalid (Harga Normal ≤ harga), saran "tunggu 3 hari"
  utk kategori keinginan, kondisi ideal → WORTH IT, dan `WorthIt._last`
  tersimpan setelah hitung sukses (dipakai `catatBeli()`/`simpanDulu()`
  yg TIDAK dites di sini, lihat catatan cakupan di atas file test).
- CRUD Prioritas Belanja (12 test): `addToList()` (validasi nama/harga,
  entry baru, deteksi duplikat nama dgn konfirmasi setuju/batal, mode
  edit update di tempat), `editListItem()`/`cancelEditList()` (prefill
  form & reset), `deleteListItem()` (hapus + auto-cancel kalau item yg
  dihapus sedang diedit).
- `renderList()` (4 test): empty state, item `bought:true` tidak ikut
  tampil di list aktif, urutan skor tertinggi→terendah & badge prioritas
  sesuai ambang, ringkasan total harga & warning kalau melebihi saldo.
- `applyBuyLink()`/`onLinkedTxEdited()`/`onLinkedTxDeleted()` (3 test):
  sinkronisasi status/harga/tanggal item wishlist dgn transaksi Keuangan
  yg tertaut (pola sama dgn `bbmLinkId`/`servisLinkId` di `transaksi.js`
  yg sudah dites di bagian ke-3/tx-bbm-sync).
- `undoBought()` (2 test): konfirmasi vs batal, transaksi Keuangan yg
  sudah tercatat SENGAJA tidak ikut terhapus saat undo (uangnya memang
  sudah keluar — dijelaskan di pesan konfirmasi sendiri).
- `renderBoughtList()` (2 test): empty state, urutan tanggal beli
  terbaru dulu.

SENGAJA belum dites (didokumentasikan di komentar atas file test):
`open()`/`switchTab()`/`reset()`/`onMethodChange()`/`toggleDiskon()`/
`toggleDiskonList()`/`toggleSudahPunya()`/`toggleBoughtView()` (murni
toggle tampilan modal tanpa logic hitung, nilai guna rendah spt
BBM.openModal/Servis.openModal), `syncDiskon()`/`syncDiskonList()`
(duplikat exact logic preview diskon yg sudah dites via jalur diskon di
`hitung()`/`computeScore()`), `catatBeli()`/`catatBeliList()`/
`simpanDulu()` (integrasi lintas modul ke form Transaksi — butuh mock
`openTxModal`/`setPayMethod`/`syncCicilanPreview`/
`guessCategoryFromReceiptText`/`selectTxCat` sekaligus, ranah test
integrasi terpisah yg lebih berat), dan `openLinkTxModal()` (cuma
delegasi 1 baris ke `LinkTx.open()`).

**Catatan teknis 1 kegagalan yg kejadian & diperbaiki SAAT menulis test
(bukan bug di kode aplikasi)**: test `editListItem` awalnya gagal dgn
error `scrollIntoView is not a function` — elemen generik dari
`createFakeElement()` di `tests/helpers/fakeDom.js` memang tidak
menyediakan stub utk `scrollIntoView` (cuma `focus()`/`click()`), padahal
`WorthIt.editListItem()` memanggilnya di elemen `wlName` sbg bagian dari
alur UX (auto-scroll ke form saat mulai edit). Diperbaiki dgn override
manual `scrollIntoView:()=>{}` khusus di test itu (bukan mengubah
`fakeDom.js` global, krn baru 1 tempat yg butuh — kalau modul lain nanti
butuh pola sama, pertimbangkan tambah `scrollIntoView` ke default
`createFakeElement()`).

**Diverifikasi:**
- `node --test tests/*.test.js` → **391/391 pass, 0 fail** (naik dari 344
  di bagian ke-21, +47 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-36` (build #161), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (50
  file, 852 identifier global).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet) — tolong jalankan `npm run lint` di lokal sebelum
  merge/release (sekarang ada 3 file test baru menumpuk dari bagian
  ke-21/22 yg belum divalidasi lint-nya, ditambah tumpukan sebelumnya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Modul transaksi/CRUD sedang (100–350 baris) yg
   kemungkinan butuh fakeDom, pola sama dgn `edukasi-dana.js`/
   `worthit.js` sesi ini: `akun.js`, `cicilan.js`, `tx-target.js`,
   `piutang-utang.js`, `aset.js`.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`worthit.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test — dgn ini,
SEMUA kandidat "kalkulator" dari bagian ke-19 SUDAH selesai. Daftar modul
nol-test yg TERSISA: `akun.js`, `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-target.js`, `tx-list-cashflow.js`,
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`,
`linktx.js`, `filter-laporan.js`, `diagnostik-versi.js`,
`debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-23): test `akun.js` & `tx-target.js` — 2 modul pertama dari opsi 1 (SEDANG) di saran bagian ke-22

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file dulu. Sesuai opsi 1
di catatan bagian ke-22 ("(SEDANG) Modul transaksi/CRUD sedang (100–350
baris) yg kemungkinan butuh fakeDom: `akun.js`, `cicilan.js`, `tx-target.js`,
`piutang-utang.js`, `aset.js`"), dipilih 2 file terkecil di daftar itu:
`akun.js` (111 baris) & `tx-target.js` (67 baris).

**Tidak ada bug ditemukan** — sama seperti sesi-sesi sebelumnya, sesi ini
murni menambah test yg sebelumnya nol utk 2 modul ini, tidak ada perubahan
di kode aplikasi.

**File baru: `tests/akun.test.js` (27 test, seluruh fungsi `akun.js`).**
Cakupan: `recalcAccBalance()` (akun tak ditemukan, baseBalance vs fallback
`balance`, filter income/expense/transfer_in/transfer_out per akun),
`populateAccFilters()` (isi opsi ke `fAcc`/`txAcc`/`trFrom`/`trTo`/`wrAcc`,
placeholder & preservasi value lama di `tAcc`/`assetAccId`, panggil
`populateKeuFilters()`, aman kalau elemen tidak ada), `linkedAssetAccountIds()`/
`isAccLinkedToAsset()`, `totalSaldoAkun()` (exclude akun `includeInBalance:false`
& akun tertaut aset), `quickToggleInclude()` (blok+toast kalau tertaut aset &
masih included, boleh toggle balik kalau sudah dikecualikan manual, toggle
bebas utk akun biasa, id tak ketemu), `openAccModal()` (mode tambah vs edit,
prefill, label saldo, hint tertaut aset, `editAccIdx` tersimpan — dibuktikan
via `_saveAccInner()` sesudahnya krn `editAccIdx`/`accIncludeState` adalah
`let` modul-scope yg TIDAK bisa dibaca langsung dari luar `vm` context, lihat
catatan teknis di bawah), `toggleAccInclude()`/`updateAccIncludeBtn()`,
`_saveAccInner()` (validasi nama kosong, tambah baru + fallback emoji, edit
dgn baseBalance dihitung ulang spy saldo tampil = nominal input meski ada
transaksi berjalan, includeInBalance ikut state toggle), dan `delAcc()`
(guard minimal 1 akun, batal konfirmasi, hapus + pindahkan transaksi/tagihan/
BBM/servis/cobek ke akun fallback, aman kalau list terkait undefined semua).

**File baru: `tests/tx-target.test.js` (25 test, seluruh fungsi
`tx-target.js`).** Cakupan: `openTargetModal()` (reset semua field ke
default), `onTargetAccChange()` (tampil/sembunyi `tSavedWrap` sesuai akun
dipilih/tidak), `onTargetDanaDaruratToggle()` (sembunyi hint saat unchecked;
saat checked — rekomendasi 6× rata-rata pengeluaran bulanan dari `FI`, pesan
generik kalau data kosong, isi nama/emoji/amt HANYA kalau masih kosong/default
(tidak menimpa input user), peringatan kalau ada target Dana Darurat lain yg
tandanya akan pindah), `saveTarget()` (validasi nama/amt kosong, `saved` dari
input manual vs dipaksa 0 kalau tertaut akun, fallback emoji, mematikan
`isDanaDarurat` di target lain, memanggil `AlokasiAset.renderAll()` kalau
tersedia & aman kalau tidak), `showTargetAccountTx()` (return awal kalau
target/akun tak ketemu atau tidak tertaut akun, filter+urut transaksi
terbaru dulu, ringkasan jumlah & saldo, empty state), `addTarget()` (batal
prompt, input tak valid, input valid nambah `saved`), dan `delTarget()`
(batal konfirmasi vs hapus).

**Catatan teknis — kenapa `editAccIdx`/`accIncludeState` tidak dites via
akses langsung `ctx.editAccIdx`:** keduanya dideklarasikan `let` di
top-level `akun.js`. Sesuai catatan di `tests/helpers/loadSource.js`, node
`vm` TIDAK otomatis menempelkan binding `let`/`const` ke objek context (beda
dari `function`/`var`), dan parameter `expose` di `loadSource()` cuma
mengambil SNAPSHOT nilai sekali sesaat sesudah semua file dimuat — jadi
`ctx.editAccIdx` tidak pernah ikut ter-update stelah `openAccModal()`
dipanggil, dan assignment manual `ctx.editAccIdx = 0` dari luar juga TIDAK
memengaruhi variabel `let` asli di dalam sandbox (cuma nambah property baru
di objek `ctx`, terpisah dari binding aslinya). Percobaan pertama nulis test
dgn pola ini gagal 4x dgn cara yg membingungkan (nilai balik ke default,
atau assignment "seperti kepakai" tapi ternyata tidak) — diperbaiki dgn
selalu memverifikasi state itu secara TIDAK LANGSUNG lewat efek sampingnya
yg teramati dari luar (teks tombol `accIncludeBtn`, atau hasil nyata
`_saveAccInner()` sesudahnya: apakah update akun yg sudah ada atau malah
nambah akun baru). Kalau modul lain nanti butuh pola serupa (module-state
`let` yg perlu dites lintas pemanggilan fungsi), pakai pendekatan yg sama:
verifikasi lewat efek yg terlihat dr luar, jangan andalkan baca/tulis
`ctx.<namaVariabelLet>` langsung.

**Diverifikasi:**
- `node --test tests/*.test.js` → **443/443 pass, 0 fail** (naik dari 391
  di bagian ke-22, +52 test baru, 0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-37` (build #162), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi.
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install` gagal 403) — tolong jalankan `npm run lint`
  di lokal sebelum merge/release (sudah menumpuk beberapa file test baru
  dari bagian ke-21/22/23 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG)** Sisa modul dari opsi 1 bagian ke-22 yg belum dikerjakan:
   `cicilan.js` (112 baris), `piutang-utang.js` (351 baris), `aset.js`
   (350 baris) — pola sama dgn `akun.js`/`tx-target.js` sesi ini.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`akun.js` & `tx-target.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test.
Daftar modul nol-test yg TERSISA: `aset.js`, `cicilan.js`, `cobek.js`,
`piutang-utang.js`, `tx-list-cashflow.js`, `backup-restore.js`,
`payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
`tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-24): test `cicilan.js` & `piutang-utang.js` — 2 file dari sisa opsi 1 (SEDANG) di saran bagian ke-23

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file dulu. Dari sisa opsi
1 bagian ke-23 (`cicilan.js` 112 baris, `piutang-utang.js` 351 baris,
`aset.js` 350 baris), dipilih `cicilan.js` (jelas terkecil) & `piutang-utang.js`
— BUKAN `aset.js` walau baris nyaris sama (350 vs 351), karena `aset.js`
juga memuat `IDBStore` (helper generik IndexedDB async, co-located tapi
beda domain) yg butuh mock `indexedDB` terpisah & menambah kompleksitas
signifikan tanpa menambah nilai test yg sepadan — lebih pas disisakan sesi
tersendiri (lihat saran #1 di bawah).

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya
nol utk 2 modul ini, tidak ada perubahan di kode aplikasi.

**File baru: `tests/cicilan.test.js` (32 test, seluruh fungsi `cicilan.js`).**
Cakupan: `validateCicilanFields()` (total kosong/≤0, tenor invalid, bunga
negatif — masing2 toast+focus sesuai field, bunga kosong dianggap 0/valid),
`calcCicilanPerBulanFromTotal()`/`calcCicilanTotalFromPerBulan()` (kalkulasi
murni dgn & tanpa bunga), `syncCicilanPreview()` (sumber 'total' vs
'perbulan', nilai 0/kosong -> sembunyikan preview & kosongkan field lawan,
label "Lunas setelah ini" saat tenor 1, porsi shared mode pct vs nominal —
termasuk field mana yg ditulis-ulang vs dibiarkan sbg input asli user,
efek src='sharedPct'/'sharedNominal' ke `cicilanSharedLastInput`),
`getCicilanSharedMine()` (checkbox off, mode pct & nominal dgn clamp
1-99%/0..perBulanFull), `toggleCicilanSharedFields()`, `syncCicilanDate()`
(guard curPayMethod≠cicilan & cicilanDateLinked, sinkron 2 arah tanggal),
dan `openCicilanHistoryFromTx()` (guard billId kosong, buka riwayat).

**File baru: `tests/piutang-utang.test.js` (45 test, seluruh fungsi
`piutang-utang.js` — Piutang/Debt/DebtStrategy/Bill).** Cakupan:
`Piutang.{openModal,toggleLunas,save,delete,totalValue,overdueDays,
sortedActive,renderList}` (validasi nama, edit vs tambah, urutan prioritas
tagih berdasar overdue×nilai lalu jatuh tempo lalu nilai, banner "Prioritas
tagih"), `Debt.{openModal,toggleLunas,save,syncBill,delete,totalValue,
totalCicilanBulanan,renderList}` — termasuk `syncBill()` yg TIDAK dites
terpisah tapi dibuktikan lewat efeknya di `save()`: auto-bikin `Bill` saat
ada cicilan & belum lunas, auto-hapus `Bill` saat ditandai lunas/cicilan
jadi 0, update (bukan duplikat) `Bill` existing & segarkan `nextDue` kalau
sudah lewat, `DebtStrategy.{setMethod,onExtraInput,activeDebts,
computeOrder,computeDSR,simulate,render}` (avalanche vs snowball order,
DSR dari `Debt.totalCicilanBulanan()`+bill cicilan lain / `WorthIt.incomeAvg()`,
simulasi amortisasi bulanan dgn & tanpa dana ekstra, `Debt.renderList()`
memicu `DebtStrategy.render()` otomatis via `typeof` guard), dan
`Bill.openLinkTxModal()` (guard `curBillHistoryId` kosong, buka `LinkTx`).

**Catatan teknis — `Piutang`/`Debt`/`DebtStrategy`/`Bill` perlu `expose` di
`loadSource()`:** keempatnya dideklarasikan `const` di top-level
`piutang-utang.js`. Beda dari `function` (otomatis nempel ke context vm),
`const` TIDAK otomatis jadi properti context (sudah didokumentasikan di
`loadSource.js`, sama kasusnya dgn `MONTHS_FULL` di catatan lama) — kalau
lupa, `ctx.Piutang` dkk jadi `undefined` & manggil method-nya lempar
`TypeError: Cannot read properties of undefined`. Solusi: tambahkan
`['Piutang','Debt','DebtStrategy','Bill']` sbg parameter `expose` ke-3 di
`loadSource()`. Beda dgn kasus `editAccIdx` (module-scope `let` yg butuh
verifikasi TIDAK LANGSUNG lewat efek samping), di sini `expose` CUKUP krn
`Piutang` dkk adalah objek (referensi) yg method-nya bisa dipanggil
langsung dari luar sesudah di-`expose`, bukan primitif yg di-reassign.

**Catatan teknis lain — hindari `assert.deepEqual`/`deepStrictEqual` utk
objek yg dibuat DI DALAM vm context:** percobaan awal `getCicilanSharedMine()`
ditest dgn `assert.deepEqual(r, {shared:false,pct:null,mine:500000})` GAGAL
walau isinya identik ("same structure but not reference-equal") — sebabnya
objek literal yg dibuat kode di dalam sandbox vm punya `Object.prototype`
dari REALM berbeda (sandbox), sedangkan objek pembanding di test dibuat di
realm Node biasa; `deepStrictEqual` (dipakai `node:assert/strict`) ikut
membandingkan prototype makanya gagal walau isi sama. Diperbaiki dgn
assert per-field (`assert.equal(r.shared,...)` dst) — pola yg sama harus
dipakai kalau modul lain nanti mengembalikan objek literal dari dalam vm.

**Diverifikasi:**
- `node --test tests/*.test.js` → **520/520 pass, 0 fail** (naik dari 443
  di bagian ke-23, +77 test baru [32 cicilan + 45 piutang-utang], 0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-38` (build #163), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi.
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install` gagal 403) — tolong jalankan `npm run lint`
  di lokal sebelum merge/release (sudah menumpuk beberapa file test baru
  dari bagian ke-21/22/23/24 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(SEDANG-BERAT)** `aset.js` (350 baris, TERSISA dari opsi 1 bagian
   ke-22/23) — pola sama dgn modul lain, TAPI perlu extra effort utk
   `IDBStore` (helper generik IndexedDB async yg co-located di file yg
   sama): perlu mock `indexedDB` (mis. via `fake-indexeddb` package kalau
   tersedia offline, atau stub manual `indexedDB.open()`), sedangkan
   `AlokasiAset`/`Aset`/`TimelineW` bisa pakai pola fakeDocument biasa.
   Pertimbangkan pisah jadi 2 test file (`aset.test.js` utk 3 modul sync,
   `idb-store.test.js` khusus async) biar lebih rapi.
2. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN
   (butuh fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) &
   layar PIN interaktif (`pinPress`/`pinBack`/`checkPin`).
3. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) —
   disisakan paling akhir, butuh sesi tersendiri utk dipetakan dulu
   strukturnya sebelum nulis test.

`cicilan.js` & `piutang-utang.js` SEKARANG SUDAH tidak lagi masuk daftar
nol-test. Daftar modul nol-test yg TERSISA: `aset.js`, `cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`,
`kasir.js`, `sewakios.js`, `renovasi.js`, `tagihan-kalender.js`,
`reset-gaji-mingguan.js`, `modals.js`, `modal-navigasi.js`, `onboarding.js`,
`profil-pengaturan.js`, `kategori.js`, `kategorisasi-ai.js`, `linktx.js`,
`filter-laporan.js`, `diagnostik-versi.js`, `debug-console.js`,
`error-handler.js`, `features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-25): test `aset.js` — saran #1 (SEDANG-BERAT) dari bagian ke-24

Konteks: user minta kerjakan saran di CLAUDE.md, 2 file. Dari saran bagian
ke-24, dipilih saran #1: `aset.js` (350 baris, TERSISA terakhir dari opsi 1
bagian ke-22/23/24) — dipecah jadi **2 file test** persis seperti yang
disarankan, karena `IDBStore` (helper generik IndexedDB async, co-located di
file yang sama tapi beda domain) butuh mock `indexedDB` async terpisah dari
3 modul sync lain (`AlokasiAset`/`Aset`/`TimelineW`) yang cukup pakai pola
fakeDocument biasa.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk `aset.js`, tidak ada perubahan di kode aplikasi.

**File baru: `tests/aset.test.js` (47 test, 3 modul sync `aset.js`).**
Cakupan: `ALOKASI_PRESETS` (sanity tiap preset total 100%), `AlokasiAset.{
setRisk,onDanaInput,renderOne,renderAll,init}` (render ulang setelah ganti
risiko/dana, chip aktif sesuai index risk konservatif/moderat/agresif, risk
tidak dikenal -> box TIDAK ditulis ulang, dana fallback ke `totalSaldoAkun()`
kalau belum ada tersimpan, banner ajakan buat target Dana Darurat vs progress
ddInfo kalau sudah ada termasuk jalur `accountId` via `recalcAccBalance`),
`Aset.{openModal,updateProfitPreview,toggleZakatable,save,delete,renderList,
totalValue}` (mode tambah vs edit, hitung untung/rugi & class green/red,
validasi nama kosong, hitung `keuntungan`/`keuntunganPct` dari modalInvestasi
kalau ada, editId yang aset-nya sudah hilang, badge zakat & untung/rugi &
status akun tertaut/terhapus di renderList), `PORTFOLIO_LABELS` (regex label
kolom scan portofolio), dan `TimelineW.{avgSurplus,goals,waterfall,
addMonthsToDate,render}` (delegasi ke `Pensiun.avgSurplus()` kalau modul itu
ada, gabungan goal dari proyek Renov & target non-Dana-Darurat, cursor
akumulatif antar goal di waterfall, blok Pensiun on-track vs kurang di render).

**File baru: `tests/idb-store.test.js` (12 test, `IDBStore`).** Mock
`indexedDB` MANUAL dibuat sendiri di file test (bukan pakai package
`fake-indexeddb` — sandbox ini tidak ada akses internet utk `npm install`,
lihat catatan `npm run lint` di bawah) — cukup minimal utk simulasikan
`open()` sukses/gagal, `get`/`put` lewat `transaction()`, dan trigger
`onversionchange`/`onclose` sesuai kontrak yang dipakai `IDBStore`. Cakupan:
`_open()` (`window.indexedDB` tidak ada, cache promise supaya `open()` cuma
sekali, `open()` gagal -> cache di-reset, `onversionchange`/`onclose` ->
db ditutup & cache di-reset), `get`/`set` jalur sukses biasa, dan
`_withRetry()` — bagian paling penting: error biasa TIDAK retry, tapi
`InvalidStateError` ATAU pesan mengandung "closing" (khas Safari) dianggap
koneksi basi -> buang cache & retry SEKALI, kalau percobaan ke-2 juga gagal
baru menyerah & balikin fallback (`undefined` utk `get`, `false` utk `set` —
beda default sesuai yg di-pass masing2 pemanggil).

**Catatan teknis — expose semua modul `const` di `aset.js`, bukan cuma yang
langsung relevan:** selain `ALOKASI_PRESETS`/`PORTFOLIO_LABELS` yang jelas
dibutuhkan, `AlokasiAset`/`Aset`/`TimelineW`/`IDBStore` SEMUA dideklarasikan
`const` di top-level file ini jadi SEMUA perlu masuk parameter `expose` ke-3
`loadSource()` (bukan cuma yang mau dites langsung di 1 file test) — sempat
lupa expose `AlokasiAset`/`Aset`/`TimelineW` di awal & muncul error
`ctx.AlokasiAset`/`ctx.Aset`/`ctx.TimelineW` adalah `undefined`.

**Catatan teknis lain — `AlokasiAset.renderOne()` TIDAK merender
`preset.label`** (cuma `preset.desc` + item2), jadi assert render ulang di
test `setRisk`/`init`/`renderAll` pakai potongan teks `preset.desc` (mis.
"Seimbang antara peluang pertumbuhan..."), BUKAN nama preset ("⚖️ Moderat")
— sempat salah asumsi di percobaan pertama.

**Catatan teknis lain — urutan `openModal()` vs isi field form saat test edit
`Aset.save()`:** `Aset.openModal(id)` PREFILL semua field dari data aset
lama (termasuk nama/nilai), jadi kalau field form di-set duluan lewat
`domValues` SEBELUM `openModal()` dipanggil, nilainya bakal KETIMPA lagi oleh
data lama. Pola yang benar (sama seperti `_saveAccInner` edit test di
`akun.test.js`): panggil `openModal(id)` dulu, BARU ubah `fakeDocument.
getElementById(...).value` sesudahnya utk simulasikan user mengedit.

**Diverifikasi:**
- `node --test tests/*.test.js` → **579/579 pass, 0 fail** (naik dari 520 di
  bagian ke-24, +59 test baru [47 aset.test.js + 12 idb-store.test.js],
  0 regresi).
- `node build.js` → sukses, 0 error dari lint guard bawaan, versi naik
  otomatis ke `kw80-merge-advisor-card-dashcards-39` (build #164), kedua
  bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi (`aset.js`
  otomatis hilang dari daftar "nol-test" begitu digenerate ulang — cek
  daftar di bawah, bukan di FILE-MAP.md, krn itu bukan yg dilacaknya).
- `npm run lint`/`npx eslint` masih TIDAK bisa dites di sesi ini (sandbox
  tanpa internet, `npm install`/`npx eslint` gagal 403) — tolong jalankan
  `npm run lint` di lokal sebelum merge/release (sudah menumpuk beberapa
  file test baru dari bagian ke-21/22/23/24/25 yg belum divalidasi lint-nya).

**Untuk sesi berikutnya — pilihan saran, urut dari paling ringan:**
1. **(BERAT)** Lanjut cakupan `keamanan-pin.js` ke 100%: lockout PIN (butuh
   fake `setInterval`/`Date.now` yg bisa dimaju-mundurkan) & layar PIN
   interaktif (`pinPress`/`pinBack`/`checkPin`).
2. `cobek.js` (1261 baris, file fitur terbesar yg masih nol test) — disisakan
   paling akhir, butuh sesi tersendiri utk dipetakan dulu strukturnya sebelum
   nulis test.
3. Modul menengah yg masih nol test (350 baris ke bawah, pola serupa modul yg
   sudah dites): `tx-list-cashflow.js`, `backup-restore.js`,
   `payroll-absensi.js`, `kasir.js`, `sewakios.js`, `renovasi.js`,
   `tagihan-kalender.js`.

`aset.js` SEKARANG SUDAH tidak lagi masuk daftar nol-test (baik 3 modul
sync-nya maupun `IDBStore`). Daftar modul nol-test yg TERSISA: `cobek.js`,
`tx-list-cashflow.js`, `backup-restore.js`, `payroll-absensi.js`, `kasir.js`,
`sewakios.js`, `renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`,
`modals.js`, `modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`,
`kategori.js`, `kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`, `features-sheets-pwa-selftest.js`.
(`keamanan-pin.js` TIDAK termasuk daftar ini — sudah PARSIAL ada test dari
sesi lebih lama, cek `tests/keamanan-pin.test.js` & catatan kerja terkait utk
lihat fungsi apa saja yg masih kosong.)

## Catatan kerja — 2026-07-11 (bagian ke-26): test `tx-list-cashflow.js` (dipecah jadi 2 file test)

Konteks: user minta kerjakan 2 file "menengah" dari daftar nol-test di
bagian ke-25. Dipilih `tx-list-cashflow.js` (160 baris, 9 fungsi: `txHTML`,
`delTx`, `changeMonth`, `setTxListPeriode`, `getTxListRange`, `setPeriode`,
`getRange`, `computeCashflowForecast`, `setKeuanganTab`) — sebelumnya nol
test sama sekali.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk `tx-list-cashflow.js`, tidak ada perubahan di kode aplikasi.

**Dipecah jadi 2 file test** (bukan 1), pola sama seperti `aset.js` →
`aset.test.js` + `idb-store.test.js` di bagian ke-25 — file ini punya 2
kelompok fungsi dgn kebutuhan mock yg beda jauh:

**File baru: `tests/tx-list-cashflow-render.test.js` (22 test).** Kelompok
render/filter yg cukup di-stub DOM sederhana: `txHTML` (icon/warna sesuai
tipe & kategori, transfer selalu ⇄, fallback icon default kalau kategori tak
ketemu, acc-chip, subcategory/note, badge payMethod), `changeMonth` (wrap
bulan/tahun ke depan & ke belakang), `setTxListPeriode`+`getTxListRange`
(selamanya/bulan/hari/minggu/tahun/custom), `setPeriode`+`getRange` (versi
Laporan, elemen DOM beda dari List Transaksi tapi logic serupa),
`setKeuanganTab` (toggle panel kelola vs laporan, fallback pilih tombol dari
querySelectorAll kalau `el` tidak diberikan).

**File baru: `tests/tx-list-cashflow-deltx.test.js` (24 test).** Kelompok
side-effect berat: `delTx` (18 test mencakup semua cabang: batal konfirmasi,
tanpa link, bbmLinkId, stockItems multi-produk + clamp ke 0, stockProductId
single-produk, cobekLinkId dgn/tanpa items dgn/tanpa entry ketemu,
servisLinkId dgn/tanpa usedPartId dgn/tanpa D.servisLogs, renovItemLinkId/
wishlistLinkId/sewaKiosLinkId/tukangPaymentEntryIds beserta suffix toast
masing2) & `computeCashflowForecast` (6 test: default vs BudgetReko
terdefinisi, incAvg/expAvg dari transaksi dlm rentang, billsDue dari
tagihan ≤30 hari, projected).

**Catatan teknis — 2 edge case toast `delTx` yg gampang salah asumsi kalau
cuma baca sekilas:**
- `stockProductId` set tapi produknya sudah tidak ada di `D.products`:
  TIDAK ADA toast sama sekali (bukan toast generik "🗑 Dihapus") — toast
  stok butuh `p` ketemu, sedangkan toast generik di baris akhir ditekan
  krn kondisinya cuma cek `t.stockProductId` truthy, TIDAK peduli apakah
  produknya ketemu atau tidak.
- `servisLinkId` set tapi `D.servisLogs` tidak ada sama sekali: seluruh
  blok servis (termasuk toast "🔧 Catatan servis...") dilewati krn guard
  `&&D.servisLogs`, TAPI toast generik di akhir JUGA ikut tertekan (kondisi
  akhir cuma cek `t.servisLinkId`, tidak peduli `D.servisLogs` ada atau
  tidak) — hasilnya TIDAK ADA toast sama sekali di kasus ini, sempat salah
  tebak di percobaan pertama (dikira toast generik tetap muncul).

**Catatan teknis lain — variabel global bebas vs module-scoped `let`:**
`curMonth`/`curYear`/`txListPage`/`filterPeriode` dideklarasikan di
`features-helpers-global-security.js` (bukan di `tx-list-cashflow.js`),
diassign langsung tanpa `let` di file ini — sama pola dgn
`cicilanLastInput` dkk di `cicilan.test.js`: bisa diinject & dibaca balik
langsung lewat `extraGlobals` `loadSource()`, TANPA trik `expose`.
`txListPeriode` BEDA — itu `let txListPeriode='bulan'` module-scoped DI
DALAM `tx-list-cashflow.js` sendiri, jadi dites lewat parameter `expose`
`loadSource()` (dibaca via `ctx.txListPeriode` setelah `expose:
['txListPeriode']`) — beda dari pola `editAccIdx` di `akun.test.js` yg
sengaja TIDAK dibaca langsung (di sini dibaca langsung krn tidak perlu
verifikasi lewat pemanggil kedua, cukup baca state akhir).

**Diverifikasi:**
- `node --test tests/*.test.js` → **625/625 pass, 0 fail** (naik dari 579
  di bagian ke-25, +46 test baru [22 render + 24 deltx/forecast], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-40` (build #165), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (52 file — 2 file test
  baru ikut kehitung di index fungsi global, `tx-list-cashflow.js` otomatis
  hilang dari daftar nol-test).
- `node --check tx-list-cashflow.js` → sintaks OK (tidak ada kode aplikasi
  yg diubah sesi ini).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`tx-list-cashflow.js` tidak diubah), jadi risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini):** `cobek.js` (1261 baris, terbesar, disisakan paling
akhir — butuh sesi tersendiri utk dipetakan strukturnya dulu),
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `kategori.js`,
`kategorisasi-ai.js`, `linktx.js`, `filter-laporan.js`,
`diagnostik-versi.js`, `debug-console.js`, `error-handler.js`,
`features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-27): test `kategori.js` + `kategorisasi-ai.js`

Konteks: user minta kerjakan 2 file "kecil" dari daftar nol-test di bagian
ke-26. Dipilih `kategori.js` (167 baris, 19 fungsi: CRUD Kategori & Subkategori
+ filter dropdown) dan `kategorisasi-ai.js` (185 baris, objek `AutoKat` dgn
6 method: AI auto-kategorisasi dari catatan bebas Input Transaksi) —
sebelumnya nol test sama sekali utk keduanya.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya
nol utk kedua file, tidak ada perubahan di kode aplikasi.

**File baru: `tests/kategori.test.js` (56 test).** Cakupan: `getAllCats`/
`getCatsByType`/`getCat`/`getCatByType` (termasuk kasus nama kategori
duplikat di income & expense — dipilih yg subs-nya paling banyak),
`uniqueCatList`/`subNamesForCat`, `populateCatSelect`/`populateSubSelect`
(preserve value lama kalau masih valid, reset ke "semua" kalau tidak),
`openCatModal`/`delCatFromModal`/`setCatModalType`/`refreshTxCatIfOpen`,
`saveCat`/`delCat` (rename kategori ikut menyesuaikan `category` di
transaksi & bills, pesan konfirmasi beda utk kategori bawaan/default vs
kategori yg masih dipakai transaksi), `openSubCatModal`/`saveSubCat`/
`delSubCat` (rename subkategori ikut menyesuaikan `subcategory` di
transaksi & bills — HANYA yg `category`-nya juga cocok), `toggleCatGroup`,
`filterCat`.

**File baru: `tests/kategorisasi-ai.test.js` (34 test).** Cakupan seluruh
method `AutoKat`: `onNoteInput` (debounce 750ms, tebakan lokal instan hanya
utk expense & field kategori kosong), `hideSuggest`, `runAiSuggest`
(guard: catatan <4 char, tanpa API key, catatan sama dgn query terakhir,
tidak ada kategori sama sekali, AI balas kategori di luar daftar yg
diizinkan → diabaikan, respons gagal/error/JSON tidak valid → ditangkap
diam-diam, field Keterangan berubah sejak request dikirim → saran basi
tidak ditampilkan, token check request basi), `renderSuggest`, `apply`
(isi kategori+subkategori via `selectTxCat`/`selectTxSubCat` atau fallback
`txCat.value` langsung, lalu "belajar" ke `D.learnedItemCat`), `learnFromNote`
(filter stopword/angka/kata <4 huruf, maksimal 4 kata kunci per catatan).

**Catatan teknis — dependency lintas-file yg perlu di-stub manual:**
- `kategori.js`: state module-scoped (`catEditIdx`/`curCatModalType`/
  `catModalCallback`/`subCatParentId`/`subCatParentType`/`subCatEditId`/
  `curCatFilter`) TIDAK dideklarasikan `let` di file ini sendiri (dideklarasikan
  di `features-helpers-global-security.js`) — pola sama dgn `curMonth`/
  `curYear` di `tx-list-cashflow.test.js`: diinject & dibaca balik langsung
  lewat `extraGlobals` `loadSource()`, tanpa trik `expose`.
- `kategori.js`: `DEFAULT_CATS` didefinisikan di `renovasi.js` (di luar
  cakupan test ini) — di-stub `{income:[],expense:[]}` per default, sama
  pola dgn `identitas.test.js`.
- `kategori.js`: `populateCatSelect` baca `[...sel.options]` (bukan cuma
  `innerHTML`) buat cek value lama masih valid — `fakeDom.js` TIDAK
  mem-parsing `innerHTML` jadi elemen beneran, jadi ditambah helper lokal
  `withOptionsSupport(el)` (override `innerHTML` jadi accessor yg
  meng-extract `<option value="...">` via regex ke `el.options`) khusus
  test file ini, TIDAK diubah di `helpers/fakeDom.js` bersama (supaya tidak
  mempengaruhi test lain).
- `kategorisasi-ai.js`: `getCatsByType` berasal dari `kategori.js` (tidak
  di-load bareng) — di-stub baca langsung dari `D.categories[type]`.
- `kategorisasi-ai.js`: `setTimeout`/`clearTimeout` bawaan `loadSource()`
  cuma stub no-op (return 0, TIDAK menjalankan callback) — disuntik fake
  timer LOKAL (simpan `{id,fn,ms}`, TIDAK auto-invoke) via `extraGlobals`,
  supaya `onNoteInput` bisa dites bagian debounce-nya (terjadwal/clearTimeout)
  terpisah dari `runAiSuggest` yg dites LANGSUNG (tanpa lewat timer) — pola
  sama semangatnya dgn `_saveAccInner`/`_saveInner` di file lain.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
- Field DOM (`catName`/`catEmoji`) yg di-set lewat `domValues` SEBELUM
  `openCatModal()` dipanggil ketimpa lagi oleh `openCatModal()` (persis
  peringatan yg sudah didokumentasikan di bagian ke-24 soal `openModal()`
  vs `domValues`) — diperbaiki: panggil `openCatModal()` dulu, baru set
  `fakeDocument.getElementById(...).value` sesudahnya.
- Return value function yg lahir di dalam vm context (array/objek dari
  `getCat`/`uniqueCatList`/`subNamesForCat`) TIDAK bisa dibandingkan pakai
  `assert.deepEqual`/`deepStrictEqual` (beda prototype/realm dgn host,
  sudah didokumentasikan di `aset.test.js`/`fi-calc.test.js`) — dipakai
  helper lokal `sameJson()` (`JSON.stringify` kedua sisi) di
  `kategori.test.js`.
- `opts.selectTxCat || defaultFn` di helper `makeAutoKat` awalnya bikin
  test "selectTxCat tidak tersedia (fallback ke txCat.value)" gagal karena
  `undefined || defaultFn` tetap balik `defaultFn` — diperbaiki pakai
  `'selectTxCat' in opts ? opts.selectTxCat : defaultFn` supaya `undefined`
  yg SENGAJA dioper tidak diam-diam ketimpa.

**Diverifikasi:**
- `node --test tests/*.test.js` → **715/715 pass, 0 fail** (naik dari 625
  di bagian ke-26, +90 test baru [56 kategori + 34 kategorisasi-ai], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-41` (build #166), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file, 852
  identifier — `kategori.js`/`kategorisasi-ai.js` otomatis hilang dari
  daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`kategori.js`/`kategorisasi-ai.js` tidak diubah), jadi risiko regresi
  UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini):** `cobek.js` (1261 baris, terbesar, disisakan paling
akhir — butuh sesi tersendiri utk dipetakan strukturnya dulu),
`backup-restore.js`, `payroll-absensi.js`, `kasir.js`, `sewakios.js`,
`renovasi.js`, `tagihan-kalender.js`, `reset-gaji-mingguan.js`, `modals.js`,
`modal-navigasi.js`, `onboarding.js`, `profil-pengaturan.js`, `linktx.js`,
`filter-laporan.js`, `diagnostik-versi.js`, `debug-console.js`,
`error-handler.js`, `features-aiwidget-reminder-gdrive-search.js`,
`features-sheets-pwa-selftest.js`.

## Catatan kerja — 2026-07-11 (bagian ke-28): test `error-handler.js` + `onboarding.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-27, dikerjakan dari yang
paling RINGAN dulu (urutan baris): `modals.js` (6 baris, dilewati — murni array
string HTML modal statis, tidak ada logic buat dites) → `error-handler.js` (37
baris) → `onboarding.js` (40 baris). Kedua file ini sebelumnya nol test sama
sekali.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yg sebelumnya nol
utk kedua file, tidak ada perubahan di kode aplikasi.

**File baru: `tests/error-handler.test.js` (11 test).** Cakupan
`_friendlyErrorNotice`: pesan normal (toast dgn detail & durasi 5000ms),
pesan `undefined` (detail dikosongkan, bukan jadi string `": undefined"`),
pesan >120 karakter dipotong, throttle 3 detik (panggilan kedua dlm window
diabaikan, tepat di batas 3000ms jalan lagi), fallback ke `console.warn`
kalau `toast` belum jadi function, error yg dilempar `toast()` sendiri
ditangkap diam-diam (tidak crash). Juga dites 2 listener global
`window.addEventListener('error'/'unhandledrejection', ...)`: format
`console.error` yg benar (`e.error||e.message` utk listener error,
`e.reason` utk unhandledrejection), serta bukti kedua listener berbagi
throttle counter yang sama (`_lastErrorToastAt` global, bukan per-listener).

**File baru: `tests/onboarding.test.js` (7 test).** Cakupan
`updateOnboardPreview`: guard elemen `obPreviewBox` tidak ada (return dini
tanpa error), rumus estimasi (`gaji×26` hari kerja, dikurangi `kirim×4`),
warna hijau/merah sesuai tanda hasil, fallback `||0` utk input
kosong/non-angka. Cakupan `finishOnboard`: PIN bukan 4 digit ditolak (tidak
menyimpan apapun, `showAlertModal` dipanggil dgn pesan yg benar), alur
sukses (profil tersimpan persis sesuai field, PIN di-hash via `hashPin`,
`_sessionRawPin` ke-set, `kw_pin`/`kw_setup` ke-`safeSetItem`, `save()` &
`showMain()` terpanggil, elemen `#onboard` disembunyikan), & default value
nama/gaji/kiriman kalau field dikosongkan.

**Catatan teknis — kenapa `window`/`Date` perlu di-mock manual utk
`error-handler.js`:** stub bawaan `loadSource()` (`makePermissiveStub`)
sengaja permisif tapi TIDAK stateful — `window.addEventListener(...)`
selalu balik stub baru tanpa nyimpen handler-nya, jadi listener yg
didaftarkan tidak bisa dipanggil balik dari test. Begitu juga `Date.now()`
asli tidak bisa dimaju-mundurkan tanpa nunggu beneran (throttle-nya 3
detik). Solusinya: `extraGlobals: { window: fakeWindow, Date: fakeDate }`
dgn `fakeWindow.addEventListener` yg nyimpen handler ke object biasa
(`listeners[evt]=fn`) & `fakeDate={now:()=>t}` (bisa diubah lewat closure
`setTime()`) — cukup krn `error-handler.js` cuma pakai `Date.now()`, tidak
perlu tiruan class `Date` penuh.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
- Beberapa test awal pakai `time: 1000` sbg waktu awal, tapi
  `_lastErrorToastAt` module-scoped mulai dari `0` — jadi `now(1000)-0=1000`
  masih `<3000`, throttle nge-blok toast PERTAMA yang harusnya lolos.
  Diperbaiki: waktu awal test non-throttle dinaikkan ke `>=3000` (dipakai
  `5000`) supaya panggilan pertama tidak keblokir throttle residual dari
  `_lastErrorToastAt=0`.
- `assert.deepEqual(D.profile, {...})` di `onboarding.test.js` gagal
  (`reference-equal` check) krn `D.profile` lahir di dalam vm context, beda
  prototype/realm dgn object literal host — pola yg sama persis sudah
  didokumentasikan di `aset.test.js`/`fi-calc.test.js`/`kategori.test.js`.
  Diperbaiki: bandingkan lewat `JSON.stringify` kedua sisi.
- `modals.js` (6 baris efektif, isinya cuma 1 array `MODAL_HTML` berisi
  string HTML mentah blok modal) SENGAJA dilewati — bukan "belum sempat",
  tapi memang tidak ada logic murni utk dites di sana (beda dari file lain
  di daftar nol-test yang semuanya punya fungsi).

**Diverifikasi:**
- `node --test tests/*.test.js` → **733/733 pass, 0 fail** (naik dari 715
  di bagian ke-27, +18 test baru [11 error-handler + 7 onboarding], 0 regresi).
- `node build.js` → sukses, versi naik otomatis ke
  `kw80-merge-advisor-card-dashcards-42` (build #167), kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (50 file, 852
  identifier — `error-handler.js`/`onboarding.js` otomatis hilang dari
  daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx eslint` gagal 403) — sama seperti
  keterbatasan sesi-sesi sebelumnya, tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan murni
  penambahan file test, tidak menyentuh kode runtime app sama sekali
  (`error-handler.js`/`onboarding.js` tidak diubah), jadi risiko regresi
  UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (2 sudah
selesai sesi ini, `modals.js` dilewati krn murni data statis tanpa
logic):** `debug-console.js` (48 baris), `diagnostik-versi.js` (76 baris),
`profil-pengaturan.js` (81 baris), `reset-gaji-mingguan.js` (86 baris),
`filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js` (242
baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir — butuh sesi
tersendiri utk dipetakan strukturnya dulu),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `debug-console.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-29): test `debug-console.js` + perbaikan test basi Kekayaan Bersih

Konteks: lanjutan daftar modul nol-test dari bagian ke-28, urutan ringan→berat:
`debug-console.js` (48 baris) berikutnya. Sesi ini juga memperbaiki 1 test
in-app (`getSelfTestCases()` di `features-sheets-pwa-selftest.js`) yang gagal
karena rumus ekspektasinya basi, ketinggalan dari formula asli `renderBersih()`.

**Perbaikan test basi (bukan bug aplikasi):** test "Buku Aset: totalAssetValue()
& Kekayaan Bersih konsisten" cuma bandingkan `saldoAkun+totalAset-utangManual`,
padahal `Kekayaan.renderBersih()` (modules-calc.js) sudah lama diperluas ikut
memasukkan `totalPiutangValue()` (piutang menambah) dan `totalDebtValue()`
(utang tercatat lain, bukan cuma `utangJT` manual) ke rumus Kekayaan Bersih.
Diperbaiki: rumus ekspektasi di test disamakan dgn `renderBersih()` +
pesan assert ditambah nilai aktual vs ekspektasi biar lebih gampang didiagnosis
kalau gagal lagi nanti.

**File baru: `tests/debug-console.test.js` (14 test).** Cakupan
`updateDebugConsoleBtn` (tombol tidak ada -> return dini, teks sesuai status
aktif/tidak) & `toggleDebugConsole`: alur mematikan (hapus key, `eruda.destroy()`
dipanggil HANYA kalau `window.eruda` ada, error dari `destroy()` ditangkap diam-diam),
alur mengaktifkan saat eruda SUDAH pernah dimuat (`window.eruda` ada -> langsung
`eruda.init()`, tidak bikin `<script>` baru), dan alur lazy-load CDN saat eruda
BELUM pernah dimuat (key `kw_debug_console` di-set OPTIMIS duluan sebelum script
selesai load, `<script>` di-append ke `document.head` kalau ada / fallback ke
`document.documentElement`, `onload` sukses vs `onload` yg `eruda.init()`-nya
error tetap toast+update tombol tapi pesannya beda, `onerror` rollback key +
toast pesan butuh internet).

**Catatan teknis — kenapa `window.eruda` & `eruda` (bare global) perlu disuntik
manual biar konsisten:** di browser asli, `window` ADALAH global object, jadi
`window.eruda` dan bare `eruda` otomatis nunjuk objek yang sama begitu script
CDN eruda selesai load. Stub `loadSource()` yang dipakai di sini `window` cuma
objek biasa terpisah dari context vm top-level, jadi kalau tidak disamakan
manual, `if(window.eruda)` (dipakai `toggleDebugConsole` utk pre-check) & bare
`eruda.init()`/`eruda.destroy()` (dipakai langsung, bukan lewat `window.`) bisa
nunjuk 2 objek beda dan test jadi salah baca. Solusi: helper `setEruda()`/opsi
`erudaPresent` di test set KEDUANYA (`fakeWindow.eruda` dan `ctx.eruda`) ke
objek yang sama.

**Diverifikasi:**
- `node --test tests/*.test.js` → **747/747 pass, 0 fail** (naik dari 733 di
  bagian ke-28, +14 test baru [debug-console], 0 regresi).
- `node build.js` → sukses, versi naik otomatis, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`debug-console.js`
  otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal) — tolong jalankan `npm run lint` sebelum
  merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan test murni
  tidak menyentuh `debug-console.js`/`modules-calc.js` (logic asli tidak
  diubah, cuma rumus ekspektasi di 1 test in-app), risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `diagnostik-versi.js` (76 baris), `profil-pengaturan.js` (81
baris), `reset-gaji-mingguan.js` (86 baris), `filter-laporan.js` (220 baris),
`kasir.js` (221 baris), `sewakios.js` (242 baris), `linktx.js` (244 baris),
`modal-navigasi.js` (284 baris), `payroll-absensi.js` (365 baris),
`renovasi.js` (437 baris), `tagihan-kalender.js` (443 baris),
`backup-restore.js` (718 baris), `cobek.js` (1261 baris, terbesar, disisakan
paling akhir), `features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `diagnostik-versi.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-30): test `diagnostik-versi.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-29, urutan ringan→berat:
`diagnostik-versi.js` (76 baris) berikutnya. Tidak ada bug ditemukan — murni
menambah test yg sebelumnya nol, tidak ada perubahan di kode aplikasi.

**File baru: `tests/diagnostik-versi.test.js` (17 test).** Cakupan
`getHtmlSnapshotForSelfTest` (proxy tipis ke `document.documentElement.outerHTML`),
`computeProductionSyncStatus` (sinkron vs ketinggalan, format label beda antara
2 cabang — cabang sinkron pakai prefix `v` sebelum nomor versi, cabang
ketinggalan TIDAK), `computeModuleSyncStatus` (semua sinkron, 1 modul
ketinggalan, variabel versi modul belum ke-load sama sekali via
`typeof x!=='undefined'`), IIFE `_checkModuleVersionSync` yang **jalan
otomatis saat file di-load** (semua sinkron → tidak ada warn/toast; 1 atau
lebih modul beda versi → console.warn + toast durasi 6000 berisi daftar file
bermasalah; `toast` belum jadi function → tetap warn, tidak crash; error tak
terduga di dalam cek → ditangkap `catch` luar, lapor via `console.error`), dan
`computeFileSizeStatus` (boundary persis di `FILE_SIZE_WARN_BYTES`=2.0MB &
`FILE_SIZE_ACTION_BYTES`=2.5MB, termasuk kasus off-by-one 1 byte di bawah
tiap ambang).

**Catatan teknis — kenapa test file ini beda pola dari file lain:** IIFE
top-level `_checkModuleVersionSync()` di `diagnostik-versi.js` jalan sekali
otomatis PERSIS saat `loadSource()` mengeksekusi file (bukan saat fungsi
dipanggil manual seperti file lain) — jadi tiap skenario kombinasi versi beda
butuh `loadSource()` BARU (tidak bisa reuse 1 `ctx` utk banyak `test()` spt
pola file lain di repo ini), karena side-effect-nya sudah "kejadian" di
load-time, tidak bisa di-reset.

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:** versi test
awal dipakai `'v100'`/`'v50'` dst sbg NILAI variabel (mis.
`MODAL_VERSION='v99'`), padahal source-nya sendiri sudah nambahin prefix `'v'`
di beberapa tempat (`'...v'+modalVersion`) — hasilnya jadi dobel `vv99` di
pesan. Diperbaiki: nilai versi di test pakai angka polos tanpa prefix
(`'100'`, `'99'`, dst), meniru cara `APP_BUILD_VERSION` asli dipakai
(angka/label build, prefix `v` cuma ditambah di template string tempat
dipakai, tidak di value-nya). Juga 1 test awal cuma nge-override
`APP_BUILD_VERSION` sendirian tanpa nyamain versi modul lain ke nilai yg sama
→ salah nangkep `allOk` jadi `false` padahal maksudnya semua-sinkron;
diperbaiki dgn override eksplisit ke-5 variabel versi ke nilai yg sama.

**Diverifikasi:**
- `node --test tests/*.test.js` → **764/764 pass, 0 fail** (naik dari 747 di
  bagian ke-29, +17 test baru [diagnostik-versi], 0 regresi).
- `node build.js` → sukses, versi naik otomatis, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`diagnostik-versi.js`
  otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet) — tolong jalankan `npm run lint` sebelum merge/release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini — perubahan test murni,
  `diagnostik-versi.js` tidak diubah sama sekali, risiko regresi UI nol.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `profil-pengaturan.js` (81 baris), `reset-gaji-mingguan.js` (86
baris), `filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js`
(242 baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `profil-pengaturan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-31): test `profil-pengaturan.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-30, urutan
ringan→berat: `profil-pengaturan.js` (81 baris) berikutnya. Tidak ada bug
ditemukan — murni menambah test yg sebelumnya nol, tidak ada perubahan di
kode aplikasi.

**File baru: `tests/profil-pengaturan.test.js` (31 test).** Cakupan
`autoSaveProfile` (baca semua input form profil & tulis ke `D.profile`,
fallback default nama/gaji/kiriman kalau kosong/non-angka, field opsional
lembur/tarif-minggu/tanggal-lahir/API-key/provider yg masing2 dijaga guard
`if(el)` sendiri, `persistApiKeyEncrypted()` cuma jalan kalau elemen
`sApiKey` ada, `save()` tepat 1x), `profilePTKPStatus`/`profileJiwaKeluarga`
(pasangan fungsi murni yg SAMA-SAMA baca `statusKawin`/`tanggungan` tapi beda
aturan clamp — PTKP status di-clamp maksimal 3 tanggungan buat kode `TK0`..`K3`,
sedangkan hitung jiwa keluarga TIDAK di-clamp sama sekali), `updateProfilPTKPPreview`
(format tampilan beda antara cabang `TK`/`K`, mis. `TK0`→`TK/0` vs `K2`→`K/2`),
`updateUsiaPreview` (sembunyi kalau tanggal lahir kosong, tampil + panggil
`fiCalcAge` kalau ada), `selectStatusKawin`/`selectTanggungan`/`selectStatusPekerjaan`
(toggle chip aktif via `querySelectorAll`, update state, panggil `save()`,
`selectStatusPekerjaan` tambahan panggil `renderPajakRekomendasi(true)`), dan
`toggleApiKeyHint` (placeholder & link bantuan beda antara provider `gemini`
vs lainnya).

**Catatan teknis — jebakan yg sempat salah di percobaan pertama:**
`fakeDom.js` punya `getElementById` yg SELALU meng-auto-vivifikasi elemen
kosong (tidak pernah balik `null`/`undefined`), jadi 2 test awal yg
mengasumsikan "elemen opsional tidak didaftarkan di `domInitial` → guard
`if(el)` gagal" ternyata salah — elemen tetap ada (kosong), guard tetap lolos,
cuma fallback ke nilai default krn `value` kosong. Diperbaiki dgn pola yg
sudah ada di file test lain (`akun.test.js`/`aset.test.js`): override
`fakeDocument.getElementById` secara eksplisit supaya balik `null` utk id
tertentu, baru guard-nya beneran teruji. Juga 1 test `classList` awal salah
pakai array literal langsung di `domInitial` (`createFakeDocument` internal
pakai `Object.assign` yg menimpa objek `classList` bawaan jadi array biasa
tanpa `contains()`/`remove()`) — diperbaiki dgn `createFakeElement({classList:[...]})`
eksplisit sebelum di-passing (pola sama spt `fi-calc.test.js`).

**Diverifikasi:**
- `node --test tests/*.test.js` → **795/795 pass, 0 fail** (naik dari 764 di
  bagian ke-30, +31 test baru [profil-pengaturan], 0 regresi).
- `node build.js` → sukses, versi naik ke `kw80-merge-advisor-card-dashcards-47`
  (build #172), kedua bundle lolos `node --check` sintaks, `FILE-MAP.md`
  diregenerasi (`profil-pengaturan.js` otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless,
  `/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`)
  → `✅ [smoke-test] OK — 992 referensi getElementById() & 55 data-action
  semuanya valid`, 0 `pageerror`.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal dgn 403) — tolong jalankan `npm run lint`
  sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `reset-gaji-mingguan.js` (86 baris), `filter-laporan.js` (220
baris), `kasir.js` (221 baris), `sewakios.js` (242 baris), `linktx.js` (244
baris), `modal-navigasi.js` (284 baris), `payroll-absensi.js` (365 baris),
`renovasi.js` (437 baris), `tagihan-kalender.js` (443 baris),
`backup-restore.js` (718 baris), `cobek.js` (1261 baris, terbesar, disisakan
paling akhir), `features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `reset-gaji-mingguan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-32): test `reset-gaji-mingguan.js`

Konteks: lanjutan daftar modul nol-test dari bagian ke-31, urutan
ringan→berat: `reset-gaji-mingguan.js` (86 baris) berikutnya. Tidak ada bug
ditemukan — murni menambah test yg sebelumnya nol, tidak ada perubahan di
kode aplikasi.

**File baru: `tests/reset-gaji-mingguan.test.js` (18 test).** Cakupan
`getWeekRange` (rentang Minggu 00:00:00.000 s/d Sabtu 23:59:59.999, sama utk
input hari apa saja dlm minggu itu), `checkWeeklySalaryReset` (guard "bukan
hari Sabtu" & "sudah di-prompt hari ini" sama2 return awal tanpa efek
samping, filter absensi yg BENAR-BENAR jatuh di rentang minggu berjalan
[absensi minggu lalu sengaja diselipkan sbg kontrol negatif], render ringkasan
ke DOM + buka modal, `wrAccWrap`/`wrAcc` kondisional ke `D.accounts.length`),
`openWeeklyResetManual` (toast peringatan kalau kosong vs alur lengkap kalau
ada: `populateAccFilters()`, isi ringkasan, tutup 2 modal sumber lalu buka
modal reset), dan `confirmWeeklyReset` (cabang `yes=false` cuma catat prompt
date + re-render tanpa sentuh `D.workDays`/`renderKeuangan`; cabang
`yes=true` selalu reset `D.workDays` minggu ini terlepas dari status
auto-income, TAPI transaksi Pemasukan & `renderKeuangan()` cuma jalan kalau
checkbox aktif DAN total>0; kategori dicari via regex `/gaji/i` dgn 2 lapis
fallback [kategori income pertama, lalu literal `'Gaji'`]; `accountId`
fallback ke akun pertama atau `null` kalau `D.accounts` kosong).

**Catatan teknis — kenapa test file ini beda pola dari file lain:** file ini
pakai `new Date()` (tanpa argumen) utk deteksi "sekarang" (hari Sabtu?,
rentang minggu berjalan), TAPI juga pakai `new Date(x)` dgn argumen (parsing
tanggal absensi via `new Date(w.date)`, copy-constructor `new Date(start)`)
yg harus tetap berperilaku spt Date asli (`getDay`/`setDate`/`setHours` dst).
Stub `Date.now()` sederhana (pola `error-handler.test.js`) tidak cukup —
dibuat `class FakeDate extends Date` yg cuma meng-override constructor
tanpa-argumen ke waktu tetap, delegasi ke `super(...args)` utk selebihnya.
Sandbox Node ini kebetulan ber-TZ UTC (offset 0, dicek via
`new Date().getTimezoneOffset()`), jadi string ISO `'YYYY-MM-DD'` polos aman
dipakai konsisten tanpa geser hari.

Var modul `_wrLastTotal`/`_wrLastCount` dideklarasikan pakai `let` (bukan
implicit-global spt `_sessionRawPin` di `onboarding.js`), jadi TIDAK
menempel ke objek context vm & tidak bisa di-inject langsung dari test.
Solusinya: test `confirmWeeklyReset` selalu memanggil `openWeeklyResetManual()`
dulu (yg secara alami mengisi kedua var itu lewat closure) sebelum memanggil
`confirmWeeklyReset()` — pola ini juga meniru urutan pemakaian ASLI di app
(tombol buka modal reset selalu dipencet dulu sebelum tombol konfirmasi).

**Diverifikasi:**
- `node --test tests/*.test.js` → **813/813 pass, 0 fail** (naik dari 795 di
  bagian ke-31, +18 test baru [reset-gaji-mingguan], 0 regresi).
- `node build.js` → sukses, versi naik ke build #173, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi
  (`reset-gaji-mingguan.js` otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless) → `✅ [smoke-test] OK —
  992 referensi getElementById() & 55 data-action semuanya valid`, 0
  `pageerror`.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install` gagal dgn 403) — tolong jalankan `npm run lint`
  sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA (1 sudah selesai
sesi ini):** `filter-laporan.js` (220 baris), `kasir.js` (221 baris),
`sewakios.js` (242 baris), `linktx.js` (244 baris), `modal-navigasi.js` (284
baris), `payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `filter-laporan.js` berikutnya.

## Catatan kerja — 2026-07-11 (bagian ke-33): test `pengaturan-search.js`

Konteks: diminta jalankan test "dari yg terkecil" mengikuti pola sesi
sebelumnya. Ketemu `pengaturan-search.js` (72 baris) — modul ini KELEWAT
dari daftar "sesi berikutnya" bagian ke-32 (kemungkinan krn dipindah dari
`features-helpers-global-security.js` v73 belakangan, jadi belum sempat
tercatat di daftar itu) — TAPI ternyata masih nol test dan LEBIH KECIL dari
`filter-laporan.js` (220 baris) yg tercatat sbg "berikutnya". Diverifikasi
dgn cek langsung: cari semua file source yg tidak direferensikan
`loadSource([...])` di `tests/*.test.js` manapun. Dipilih `pengaturan-search.js`
krn genuinely terkecil, mengikuti aturan ringan→berat apa adanya (bukan cuma
ikut daftar tercatat). Tidak ada bug ditemukan — murni menambah test yg
sebelumnya nol, tidak ada perubahan di kode aplikasi.

**File baru: `tests/pengaturan-search.test.js` (23 test).** Cakupan
`toggleStgGroup` (toggle kelas `open` + `aria-expanded` di `.stg-group-head`,
guard `id` tidak ketemu, guard head tidak ada), `toggleSingleCardCollapse`
(pola sama tapi utk `.card-collapse-head`), `stgSearch` (query kosong
sembunyikan hasil, resultEl tidak ada, tidak ada kartu cocok vs ada,
case-insensitive + trim, kartu di dalam grup tertutup ikut dibuka tapi TIDAK
di-toggle tertutup lagi kalau grup sudah terbuka, kartu `card-collapse` ikut
dibuka, highlight pencarian sebelumnya dibersihkan tiap pencarian baru,
hasil pertama jadwalkan `scrollIntoView` via `setTimeout`), dan listener
`keydown` top-level (Enter/Spasi di `.stg-group-head,.card-collapse-head` →
`preventDefault()` + `head.click()`, tombol lain/target tidak cocok/
`target.closest` tidak ada → no-op).

**Catatan teknis — 2 jebakan `fakeDom.js` yg bikin salah di percobaan
pertama:**
1. `createFakeDocument({id: objekBuatanSendiri})` melakukan
   `Object.assign(elemenAutoVivify, objekBuatanSendiri)` di dalam `ensure()`
   — properti PRIMITIF (`textContent` string) di-copy NILAI-nya ke objek
   auto-vivify yg BEDA dari variabel lokal test, jadi assert langsung ke
   variabel lokal `resultEl.textContent` setelah manggil `stgSearch()` selalu
   baca nilai lama (`''`). Field OBJEK (`style`/`classList`) tetap aman
   dibaca dari variabel lokal krn Object.assign cuma copy REFERENCE utk
   objek, bukan primitif. Fix: ambil ulang elemen via
   `fakeDocument.getElementById(id)` SETELAH pemanggilan fungsi yg dites,
   baru assert `textContent`-nya.
2. Konfirmasi ulang jebakan `classList` dari catatan bagian ke-31: passing
   literal `{classList:['u-dnone']}` sbg value `initial` ke
   `createFakeDocument` menimpa `classList` jadi array polos tanpa
   `contains()`/`remove()` — harus `createFakeElement({classList:[...]})`
   dulu baru dipassing sbg value `initial`.
3. `assert.deepEqual`/`deepStrictEqual` GAGAL membandingkan object literal
   yg dibuat DI DALAM `vm` sandbox (mis. argumen `scrollIntoView({behavior,
   block})` yg dipanggil dari source app yg jalan di context vm) dgn object
   literal host Node biasa — walau isinya identik, prototype `Object`-nya
   beda REALM jadi dianggap tidak sama. Fix: assert per-field alih-alih
   `deepEqual` utk nilai yg berasal dari dalam sandbox vm.

**Diverifikasi:**
- `node --test tests/*.test.js` → **864/864 pass, 0 fail** (naik dari 841,
  +23 test baru [pengaturan-search], 0 regresi).
- Sanity-check tambahan: sengaja rusak 1 baris logika `stgSearch` (ganti
  pesan hasil jadi string statis) → 3 test relevan langsung merah, lalu
  dikembalikan → hijau lagi. Konfirmasi test baru ini benar-benar menguji
  perilaku, bukan cuma lolos scaffolding kosong.
- `node build.js kw83-test-pengaturan-search-1` → sukses (versi lama
  `kw82-test-tx-stok-sparepart` tidak berakhiran `-angka` jadi auto-increment
  gagal, dikasih nama versi manual sesuai saran error `build.js`), build
  #185, kedua bundle lolos `node --check` sintaks, `FILE-MAP.md` diregenerasi
  (`pengaturan-search.js` otomatis hilang dari daftar nol-test).
- `npm run lint`/`npx eslint` & smoke-test browser (Playwright) TIDAK bisa
  dites di sesi ini (sandbox tanpa internet/`node_modules`/Chrome
  terpasang) — tolong jalankan sebelum merge/release.

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA:**
`filter-laporan.js` (220 baris), `kasir.js` (221 baris), `sewakios.js` (242
baris), `linktx.js` (244 baris), `modal-navigasi.js` (284 baris),
`payroll-absensi.js` (365 baris), `renovasi.js` (437 baris),
`tagihan-kalender.js` (443 baris), `backup-restore.js` (718 baris),
`cobek.js` (1261 baris, terbesar, disisakan paling akhir),
`features-aiwidget-reminder-gdrive-search.js` (1586 baris),
`features-sheets-pwa-selftest.js` (2361 baris). Lanjutkan urutan
ringan→berat: `filter-laporan.js` berikutnya. **PENTING:** cek ulang daftar
ini dgn cara yg sama spt bagian ke-33 (cari file source yg tidak
direferensikan `loadSource([...])` di test manapun) sebelum mulai, jangan
cuma percaya daftar tercatat — sudah kejadian 1x (`pengaturan-search.js`)
kelewat dari daftar.

## Catatan kerja — 2026-07-12: fitur baru — Export/Import data di 📋 Buku Aset

Konteks: permintaan user "tambahkan fitur export import data di data aset".
Sebelum ini, satu-satunya jalur export/import utk data `D.assets` adalah lewat
modal Backup Data umum (`backupModal`, modul "🏦 Aset, Utang & Piutang" di
`backup-restore.js`) yang menggabung SEMUA jenis data sekaligus — tidak ada
tombol export/import yang scoped khusus ke Buku Aset saja di kartunya
sendiri.

**Perubahan (`aset.js`):** 3 method baru di objek `Aset` (menyusul
`totalValue()`, di ujung objek):
- `Aset.exportJSON()` — download `D.assets` apa adanya sbg file JSON
  (`aset-W-YYYY-MM-DD.json`). Guard kosong -> toast peringatan, tidak bikin
  file.
- `Aset.exportCSV()` — versi CSV (kolom Nama/Jenis/Lokasi/Nilai/Modal
  Investasi/Harga Beli/Jumlah Unit/Tanggal/Zakatable/Akun Tertaut), pola
  escaping sama persis dgn `toCSVRow` di `runBackup()` (backup-restore.js).
- `Aset.importJSON(e)` — baca file dari `<input type=file>` (event
  `change`), terima array polos ATAU objek `{assets:[...]}` (jadi file hasil
  `exportJSON()` maupun hasil export modul "Aset" di Backup Data umum
  dua-duanya bisa langsung dipakai). Validasi minimal per-entri (`name` &
  `nilai` numerik wajib ada), baris yg tidak valid dilewati (dihitung &
  disebut di toast, tidak menggagalkan seluruh import). `askConfirm()` dulu
  sebelum benar-benar menambahkan. **Sengaja SELALU DITAMBAHKAN** (bukan
  menimpa/menggantikan `D.assets` yg sudah ada) dgn `id` BARU
  (`uid()`) per entri — menghindari id bentrok kalau file diimport 2x atau
  berasal dari device lain.

**Keputusan desain penting — `accountId` SENGAJA di-null-kan saat import,
tidak dipakai apa adanya dari file:** id akun (`D.accounts[].id`) unik per
instalasi/device, bukan nilai stabil lintas backup. Kalau `accountId` dari
file dipakai mentah-mentah, ada risiko nyata (silent, tanpa peringatan)
aset ke-link ke akun yang SALAH di device tujuan (kebetulan ada akun dgn id
yg sama tapi beda akun) — akibatnya nilai Kekayaan Bersih bisa salah tanpa
ada indikasi error apapun ke user. Lebih aman user tautkan ulang manual
lewat modal Edit Aset (field "Tautkan ke Akun") kalau memang perlu, drpd
app menebak & berpotensi menautkan ke akun yg keliru.

**UI (`index.html`, sumber tunggal — `app_production.html` otomatis
disalin ulang oleh `build.js`):** 2 tombol baru (`⬇️ Export Aset (JSON)` /
`⬆️ Import Aset`) ditambah tepat di bawah `#assetList`, sebelum tombol
"📋 Impor Nota Emas (Massal)" yg sudah ada — dipilih JSON sbg format
export utama (bukan CSV) krn JSON bisa langsung di-import balik lewat
`Aset.importJSON` (round-trip), CSV cuma satu-arah (mis. dibuka Excel).
Tombol Import memicu klik ke `<input type=file id=assetImportFile
style=display:none>` yg tersembunyi (pola sama dgn `importShopExcelFile`
di `importShopExcelModal`), bukan modal preview tersendiri — dipertimbangkan
cukup krn `askConfirm()` sudah menampilkan ringkasan (jumlah aset valid/
dilewati) sebelum commit, beda dgn `goldImportModal`/`importKatalogModal`
yg butuh preview lebih detail krn parsing teks bebas (bukan JSON
terstruktur).

**Test baru: `tests/aset.test.js` (+20 test, disisipkan sesudah blok test
`totalValue`).** Helper baru `makeAsetIO()` (terpisah dari `makeAset()` yg
sudah ada di file yg sama) krn 3 method baru ini butuh mock tambahan yg
tidak dipakai method `Aset` lain: `document.createElement('a')` (link
download, dicatat ke array `anchors` biar bisa diverifikasi `.click()`/
`.download`), `Blob`/`URL.createObjectURL` (isi file yg mau didownload,
lewat array `blobs`), dan `FileReader` (baca file upload — class
`FakeFileReader` per-test yg `onload` nya dipanggil sinkron dgn teks isi
file yg ditentukan test, bukan lewat browser beneran). Cakupan: kedua
fungsi export (kosong -> toast peringatan, ada isi -> Blob+anchor+toast
benar), dan `importJSON` (file batal dipilih -> no-op, JSON rusak, format
tak dikenali, semua/sebagian entri invalid, user batal konfirmasi, sukses
normal dgn verifikasi eksplisit `accountId` di-null-kan & `id` baru bukan
`id` lama, format `{assets:[...]}` jg didukung, `keuntungan`/
`keuntunganPct` dihitung ulang dari `modalInvestasi` yg diimport).

**Jebakan teknis yg ditemukan saat menulis test (dicatat biar sesi
berikutnya tidak mengulang):**
1. `global.FileReader = FakeFileReader` di luar `vm` TIDAK berpengaruh ke
   kode yg jalan di dalam sandbox `loadSource()` (beda realm/global) — harus
   dioper eksplisit lewat parameter `extraGlobals` (`FileReader:
   FakeFileReader`) SEBELUM `loadSource()` dipanggil, bukan di-set ke global
   Node biasa sesudahnya. Konsekuensinya: `FakeFileReader` harus dibikin
   duluan (dari `makeFakeFileInputEvent()`) baru `makeAsetIO()` dipanggil
   dgn `{FileReader: FakeFileReader}`, bukan urutan sebaliknya spt pola test
   lain di file yg sama (mis. `askConfirm` bisa di-oper belakangan krn itu
   memang parameter `opts` biasa, bukan soal realm).
2. `importJSON()` yg sukses memanggil `Aset.renderList()` di akhir (bagian
   dari efek samping normal, sama spt `save()` biasa) — `renderList()`
   butuh `fmt()` (format Rupiah) yg SEBELUMNYA tidak perlu di-stub di
   `makeAsetIO()` (beda dari `makeAset()` yg sudah lama menyediakannya utk
   test `renderList()` langsung) — ketauan dari error `fmt is not defined`
   sampai ditambahkan ke `extraGlobals`.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1100/1100 pass, 0 fail** (naik dari
  1080 sebelum sesi ini — tepatnya dari jumlah sebelum ditambah, +20 test
  baru murni fitur ini, 0 regresi ke test lama).
- `node build.js` → sukses, 0 error dari 3 lint guard bawaan (u-dnone,
  escapeHtml, chicken-egg Tesseract), versi naik ke
  `kw83-test-pengaturan-search-33` (build #214), kedua bundle lolos `node
  --check` sintaks, `app_production.html` disalin ulang otomatis dari
  `index.html` (sekarang identik lagi), `FILE-MAP.md` diregenerasi (51
  file, 878 identifier global — 3 method baru `Aset.exportJSON`/
  `Aset.exportCSV`/`Aset.importJSON` masih di bawah nama objek `Aset` yg
  sama, jadi tidak nambah baris baru di index abjad FILE-MAP, cuma nambah
  isi method di dalamnya).
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan di sesi ini krn sandbox
  tanpa akses internet (`npm install` gagal 403 ke registry) — sama seperti
  keterbatasan hampir semua sesi sebelumnya di file ini, tolong jalankan
  `npm run lint` (atau `npm run check` penuh) di lokal sebelum merge/
  release.
- Smoke-test browser TIDAK dijalankan ulang sesi ini (sandbox tanpa Chrome/
  Playwright terpasang) — **disarankan dicoba manual di browser (`?dev=1`)
  sebelum rilis**: buka halaman Kekayaan/Zakat → kartu 📋 Buku Aset → tap
  "⬇️ Export Aset (JSON)" (pastikan file ke-download & isinya bener), lalu
  tap "⬆️ Import Aset" pilih file itu lagi (pastikan aset dobel muncul di
  list dgn id baru, `askConfirm()` muncul dulu, saldo Kekayaan Bersih ikut
  ter-update).

**Belum dikerjakan / sengaja di luar cakupan:** export/import per-item
lain di Buku Aset (mis. hanya aset ber-tag zakatable saja) — kalau nanti
dibutuhkan, ikuti pola `askConfirm()` + validasi per-entri yg sama.

## Catatan kerja — 2026-07-11 (bagian ke-34): test `filter-laporan.js` (di-port dari snapshot v174 ke v187 pasca-redesign Etalase)

Konteks: daftar nol-test ringan→berat dari saran akhir bagian ke-33 bilang
`filter-laporan.js` berikutnya, tapi cabang kerja proyek ini sempat belok
duluan ke redesign tampilan kartu produk Etalase (lihat entri
`CATATAN-CEK-CLAUDE.md` [2026-07-11] "Redesign tampilan kartu produk
Etalase") sebelum akhirnya sesi ini balik menuntaskan `filter-laporan.js`.
Testnya sendiri SEBELUMNYA sudah ditulis & diverifikasi penuh di sesi lain
pd snapshot proyek yg lebih lama (sebelum redesign Etalase, versi build
#173→#174) — sesi ini murni **port** file test itu ke snapshot v187/188 ini,
bukan menulis dari nol. Tidak ada bug ditemukan di kode aplikasi baik dulu
maupun sekarang — murni menambah test yg sebelumnya nol.

**Kenapa perlu porting, bukan copy-paste polos:** redesign Etalase mengganti
penamaan `cobek`→`shop` di beberapa tempat yg disentuh `goToList()`:
`#page-cobek`→`#page-shop`, `setCobekTab()`→`setShopTab()`, parameter
`cobekTabName`→`shopTabName`. Selain baris itu, `filter-laporan.js` di v187
ini 100% identik dgn versi lama (`diff` cuma nunjukkan 2 baris beda, isinya
cuma rename itu — dicek eksplisit sebelum mulai port, bukan asumsi). Jadi
proses port-nya: copy `tests/filter-laporan.test.js` apa adanya, lalu
`sed` rename semua `cobek*`/`Cobek*`/`#page-cobek` jadi `shop*`/`Shop*`/
`#page-shop` (termasuk nama variabel test internal spt `cobekTabs`→
`shopTabs`, `cobekCalls`→`shopCalls`), lalu jalankan test-nya — 51/51 pass
tanpa perlu perubahan lain. `tests/helpers/loadSource.js` &
`tests/helpers/fakeDom.js` di v187 ini ternyata BYTE-IDENTICAL dgn versi
lama (dicek pakai `diff`), jadi tidak ada penyesuaian pola test yg
dibutuhkan di luar rename cobek→shop itu.

**Cakupan test (51 test, `tests/filter-laporan.test.js`):** filter panel
Keuangan (`kf*`) & Laporan (`f*`) — `txMatchesFilters`/`txMatchesSearch`
(murni; catatan kontrak — `txMatchesSearch` cuma me-lowercase haystack-nya,
BUKAN query-nya, pemanggil wajib lowercase query duluan spt yg dilakukan
`getKeuFilters()`), `getLaporanFilters`/`getKeuFilters`,
`resetLaporanFilter`/`resetKeuFilter`, `populateCatFilter`/
`populateKeuFilters` (termasuk cabang pertahankan-vs-fallback akun terpilih
lama di `<select>`), `onFKatChange`/`onKfKatChange`, `toggleKeuFilter`
(termasuk kuirk nyata: klik pertama pada panel yg `style.display` awalnya
kosong `''` justru men-set eksplisit ke `'none'`, bukan `'block'` —
dikonfirmasi ini perilaku production asli lewat browser, bukan bug test),
simpan/pulihkan preferensi filter ke `localStorage` (`saveKeuFilterPrefs`/
`loadKeuFilterPrefsIntoDOM`, dgn guard sekali-muat `_keuFilterPrefsLoaded`),
badge jumlah filter aktif (`updateKfBadge`), paginasi list (`loadMoreTx`/
`loadMoreLapTx`/`resetTxPageAndRender`, debounce pencarian 250ms
`onKfSearchInput`), navigasi antar-list dgn scroll+flash-highlight
(`goToList`, termasuk cabang `pageName`+`navIdx`, tab Shop [`etalase`/
`produsen`/`riwayat`/`pelanggan`/fallback index 0], tab Car Notes [`servis`/
lainnya], & elemen target yg tidak ada di DOM), dan modal ringkasan
transaksi terfilter dari 3 scope dashboard/keuangan/laporan dgn paginasi
100 per batch (`showFilteredTx`).

**Catatan teknis (dipindah dari sesi penulisan test aslinya, masih relevan
di sini) — 2 jebakan lintas-realm `vm`:**
1. Variabel `let`/`const` top-level yg dideklarasikan DI DALAM file sumber
   yg di-load (bukan lewat `extraGlobals`) — spt `txListPage`, `lapTxPage`,
   `_keuFilterPrefsLoaded` di `filter-laporan.js` — TIDAK otomatis nempel
   ke objek context vm yg dikembalikan `loadSource()`. Solusi:
   `vm.runInContext('namaVar', ctx)` / `vm.runInContext('namaVar=...', ctx)`
   ke context yg SAMA (`ctx` dari `loadSource()` IS objek context-nya) —
   pola sudah ada di `tests/kalkulator-popup.test.js`.
2. Objek plain yg DIBUAT & DI-RETURN oleh kode yg berjalan di dalam sandbox
   vm (mis. `getKeuFilters()`) py `[[Prototype]]` beda dari realm host test
   file, jadi `assert.deepEqual`/`deepStrictEqual` (mode strict) SELALU
   gagal walau isinya identik ("same structure but are not
   reference-equal"). Solusi: JSON round-trip (helper `plain()` di
   `tests/filter-laporan.test.js`) sebelum dibandingkan.

Juga: `createFakeDocument()` (`tests/helpers/fakeDom.js`) menerapkan
`initial` lewat `Object.assign(newElement, initial)` — MERATAKAN accessor
getter/setter kustom (elemen `<select>` tiruan yg py `.options` "hidup",
dibutuhkan `populateKeuFilters()` yg baca `[...kfAcc.options]` SETELAH
nulis `.innerHTML`) jadi cuma snapshot statis. Elemen yg butuh accessor
beneran harus disuntik lewat override `getElementById` langsung, bukan
lewat parameter `initial`.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1020/1020 pass, 0 fail** (naik dari 969
  sebelum sesi ini, +51 test baru [filter-laporan], 0 regresi).
- `node build.js` → sukses, versi naik dari `kw83-test-pengaturan-search-3`
  ke `kw83-test-pengaturan-search-4`, build #188, kedua bundle lolos
  `node --check` sintaks, `FILE-MAP.md` diregenerasi (`filter-laporan.js`
  otomatis hilang dari daftar nol-test).
- Smoke-test browser (Playwright + Chrome headless) → `✅ [smoke-test] OK —
  999 referensi getElementById() & 56 data-action semuanya valid`, 0
  `pageerror`. Dicoba juga live di browser (bukan cuma smoke-test generik):
  `showPage('keuangan',...)` → `toggleKeuFilter()` → `resetKeuFilter()` →
  `showFilteredTx('dashboard','all','Test Dashboard')` (modal kebuka, judul
  benar) → `goToList('page-etalase',null,undefined,'etalase')` (fungsi
  `setShopTab` pasca-redesign terkonfirmasi ada & jalan) — semua tanpa
  error.
- `npm run lint`/`npx eslint` TIDAK bisa dites di sesi ini (sandbox tanpa
  internet, `npm install`/`npx` gagal 403) — tolong jalankan `npm run lint`
  sebelum merge/release. (Sudah beberapa sesi berturut2 tidak bisa dites
  krn keterbatasan sandbox yg sama.)

**Untuk sesi berikutnya — daftar modul nol-test yg TERSISA** (dicek ulang
sesi ini via pola `loadSource(['nama-file.js']` di seluruh `tests/*.test.js`,
BUKAN cuma percaya catatan lama — sesuai pesan peringatan di saran bagian
ke-33 yg bilang `pengaturan-search.js` pernah kelewat): `kasir.js`,
`sewakios.js`, `linktx.js`, `modal-navigasi.js`, `payroll-absensi.js`,
`renovasi.js`, `tagihan-kalender.js`, `backup-restore.js`,
`features-aiwidget-reminder-gdrive-search.js`. Catatan tambahan: `cobek.js`
SUDAH dapat test (`tests/cobek.test.js`, ditambahkan bareng redesign
Etalase) jadi TIDAK perlu dikerjakan lagi; `features-sheets-pwa-selftest.js`
SEBAGIAN tercakup (`parsePzNum`/`parseDecStr` via `extractFunction` di
`tests/parse-angka.test.js`) tapi belum full coverage kalau mau digarap
menyeluruh. Ukuran file (buat estimasi urutan ringan→berat, belum diverifikasi
ulang barisnya krn tidak semua file dicek `wc -l` sesi ini): `kasir.js` &
`sewakios.js` termasuk yg lebih ringan, `backup-restore.js` &
`features-aiwidget-reminder-gdrive-search.js` termasuk yg terberat di sisa
daftar ini.

## Catatan kerja — 2026-07-12: Dashboard Feature Hub — Tahap 0 (FEATURE_REGISTRY)

Konteks: mulai implementasi `blueprint-dashboard-hub.md` (dokumen final, sudah
direvisi berdasarkan audit implementasi). Tahap 0 = "Finalisasi taksonomi §1
jadi 1 sumber data ... Tidak ada elemen visual baru dirender" — murni data,
tanpa UI. Tahap 1 (bangun `dashboard-hub.js` yang mengkonsumsi registry ini)
BELUM dikerjakan, menunggu sesi terpisah sesuai aturan "jangan mengerjakan
lebih dari satu tahap sekaligus".

**File baru: `dashboard-hub-registry.js`** — `const FEATURE_REGISTRY`, array 10
kategori (persis blueprint §1) → daftar fitur, tiap fitur
`{key, label, desc, target}`. Setiap `target` (page/tab/goTo/group/dashKey/
action) HANYA diisi berdasarkan navigasi yang sudah nyata ada & diverifikasi
manual lewat `grep` ke `index.html`/`app_production.html` (`showPage`,
`setKeuanganTab`/`setShopTab`/`setPajakTab`, `toggleStgGroup`,
`DASH_CARD_DEFS` di `modules-render.js`) — bukan tebakan. 2 temuan audit yang
memengaruhi bentuk data (dicatat di komentar header file, bukan cuma di sini):
- Fitur kategori 📦 Aset & sebagian 🌱 Personal (Piutang/Utang, Strategi
  Pelunasan) ternyata **nempel di `page-pajak` tab `zakat`**, bukan halaman
  sendiri — halaman itu campur Pajak+Zakat+Aset+Piutang/Utang.
- `WorthIt` (Worth It? & Prioritas Belanja) **murni modal**
  (`WorthIt.open()`, dipicu dari Quick Switcher) — tidak ada kartu/section
  di page manapun sama sekali, jadi target-nya `{action:'WorthIt.open'}`
  tanpa `page`, beda skema dari fitur lain.

**File baru: `tests/dashboard-hub-registry.test.js`** (8 test) — bukan cuma
validasi struktur (key unik, field wajib ada, 10 kategori sesuai blueprint
§1), tapi **cross-check tiap `target` ke kode nyata**: `target.page` dicek ke
`id="page-<page>"` di kedua file HTML, `target.tab` dicek ke daftar tab
terverifikasi per halaman, `target.goTo` dicek elemen id-nya benar ada,
`target.group` (Settings) dicek id `stgGroup*` ada, `target.dashKey` dicek
cocok dgn key nyata di `DASH_CARD_DEFS` (parse langsung dari
`modules-render.js`), dan `target.action` dicek ada sbg `data-action="..."`
atau deklarasi function di source. Ini guard supaya kalau nanti UI Tahap 1+
dibangun berdasarkan registry ini lalu source-nya berubah/direname, test jadi
merah duluan (bukan ketauan pas smoke-test browser). Sanity-check manual:
sengaja rusak 1 `goTo` jadi id palsu → test #4 langsung merah → dikembalikan
→ hijau lagi (bukti test ini menguji sungguhan, bukan scaffolding kosong).

**File diubah: `scripts/build.js`** — tambah `'dashboard-hub-registry.js'` di
akhir array `GROUP_B` (1 baris, urutan file lama tidak diubah), sesuai
blueprint §6.

**Tidak disentuh:** `index.html`, `app_production.html`, `styles.css`,
`manifest.json`, `sw.js` — tidak ada elemen visual baru, sesuai definisi
Tahap 0. Blueprint & Design System juga tidak diubah (tidak ditemukan bug).

**Diverifikasi:**
- `node --test tests/*.test.js` → **1114/1114 pass, 0 fail** (naik dari 1094
  sebelum sesi ini — 20 test baru dari `dashboard-hub-registry.test.js`
  [8 test] tercampur dgn beberapa file test lain yg sudah ada sebelumnya di
  snapshot ini, 0 regresi).
- `node build.js kw83-tahap0-feature-registry-1` → sukses, build #223, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, `FILE-MAP.md` diregenerasi otomatis (60 file, 886 identifier
  — `FEATURE_REGISTRY` masuk index abjad).
- `node --check` lolos utk `dashboard-hub-registry.js`,
  `tests/dashboard-hub-registry.test.js`, `scripts/build.js`.
- `collectAppGlobals()` dijalankan manual → `FEATURE_REGISTRY` otomatis
  masuk daftar globals ESLint (tidak perlu edit `eslint.config.js` manual).
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan di sesi ini (sandbox
  tanpa akses internet, `eslint` belum terpasang) — sama seperti
  keterbatasan hampir semua sesi sebelumnya di file ini. Karena
  `no-unused-vars` di `eslint.config.js` levelnya `warn` (bukan `error`) dan
  `FEATURE_REGISTRY` belum dipakai modul manapun sampai Tahap 1 nanti, kalau
  lint dijalankan kemungkinan besar cuma muncul 1 warning ringan (bukan
  error) — tapi tetap **tolong jalankan `npm run lint` (atau `npm run check`
  penuh) di lokal sebelum lanjut ke Tahap 1**, supaya dipastikan.
- Smoke-test browser TIDAK dijalankan ulang sesi ini (sandbox tanpa Chrome/
  Playwright terpasang) — risiko regresi UI nol karena tidak ada file
  HTML/CSS yang diubah & tidak ada fungsi render/DOM baru yang dipanggil di
  mana pun (file baru murni data, belum dikonsumsi kode lain).

**Untuk Tahap 1 (sesi berikutnya):** bangun `dashboard-hub.js` yang
mengkonsumsi `FEATURE_REGISTRY` (Feature Grid), sesuai urutan teknis blueprint
§7 ("`FEATURE_REGISTRY` → `dashboard-hub.js` → `sidebar-nav.js` &
`dashboard-hub-search.js`"). Ingat aturan Tahap 1 blueprint §5: hub dibangun
sbg halaman terpisah dulu (belum jadi default), semua Feature Card reuse
`showPage`/`goToList`/`setKeuanganTab` dst yang sudah ada — tidak menulis
ulang logic halaman manapun.

## Catatan kerja — 2026-07-12: Dashboard Hub Tahap 5 (Responsive & UI Polish)

Scope: hanya responsive + polish CSS untuk Dashboard Hub (blueprint
`docs/blueprint-dashboard-hub.md` §4/§5). Tidak ada redesign, fitur baru,
perubahan business logic/registry/routing/render lifecycle.

**Audit (desktop/tablet/mobile, Playwright + chromium lokal @ /opt/pw-browsers):**
- Project ini **belum pernah punya `@media` sama sekali** di `styles.css`
  (dikonfirmasi `grep -c "@media"` = 0 sebelum sesi ini) — sesuai catatan
  blueprint §5 Tahap 5.
- BUG NYATA: `.dashhub-feature-grid` hardcode `repeat(2,1fr)` tanpa breakpoint
  → di tablet (768px) & desktop (1280px/1920px) grid TETAP 2 kolom, card jadi
  kotak kosong raksasa (screenshot: card lebar >600px isinya cuma judul+desc
  kecil di pojok kiri). Halaman hub juga tidak punya container/max-width →
  melebar penuh 1920px di layar besar, search dropdown ikut melebar absurd.
- Minor: `.dashhub-feature-name`/`.dashhub-feature-desc` belum ada
  line-clamp/ellipsis (spec §3 Feature Card Anatomi minta "maks 2 baris" &
  "1 baris, ellipsis") — label panjang (mis. "Absensi Harian & Kalkulator
  Gaji", "Kategorisasi Transaksi Otomatis") berisiko wrap tidak rapi di kolom
  sempit mobile.
- Minor: `.dashhub-feature-card` tidak ada hover state (mobile-only asalnya,
  wajar) — begitu desktop grid diperbaiki, mouse-hover jadi realistis dipakai
  tapi belum ada feedback visual.
- Tidak ditemukan: horizontal scroll/overflow (dicek `scrollWidth==
  clientWidth` di 360/390/768/900/1280/1920px, semua match), widget bertumpuk
  di Pinned Widgets (mobile/desktop dicek via screenshot penuh), spacing antar
  kategori vs Pinned Widgets (dicek konsisten ~16-24px, bukan bug).
- DITUNDA (bukan diperbaiki sesi ini): `.dashhub-feature-card` &
  `.dashhub-search-item` adalah `<div data-action=...>` TANPA
  `role="button" tabindex="0"` (pola yang sudah dipakai di `.stg-group-head`
  dkk) — jadi tidak bisa di-*keyboard-focus*. TAPI: bahkan elemen yang
  SUDAH punya `tabindex="0"` di app ini juga tidak bisa diaktifkan lewat
  Enter/Space (cuma ada global listener utk `click` di
  `features-helpers-global-security.js` + `keydown` utk `Escape` saja di
  `modal-navigasi.js`, tidak ada handler Enter/Space generik). Ini gap
  aksesibilitas app-wide pra-existing, bukan spesifik Dashboard Hub, dan
  perbaikan yang benar butuh nyentuh dispatcher global (di luar scope file
  Tahap 5 & butuh keputusan desain: role="button" custom vs ganti ke
  `<button>` asli). Dicatat di sini biar tidak hilang, bukan ditebak sepihak.

**Perbaikan (CSS-only, `styles.css`, semua diberi selector scoped
`#page-dashboard-hub .dashhub-*` supaya TIDAK berdampak ke halaman lain):**
1. `@media (min-width:600px)` → grid fitur jadi 3 kolom (tablet, sesuai
   tabel §4 "3-4 kolom" — dipilih 3, bukan rentang, biar 1 aturan pasti).
2. `@media (min-width:1024px)` → grid fitur jadi 5 kolom (desktop, sesuai
   §4 "5-6 kolom" — dipilih 5) + `#page-dashboard-hub{max-width:1080px;
   margin:auto}` supaya konten tidak melebar penuh layar (ini container
   pertama di app ini, sengaja discope HANYA ke halaman hub, bukan global).
3. `-webkit-line-clamp:2` di `.dashhub-feature-name`, ellipsis 1-baris di
   `.dashhub-feature-desc` — sesuai spec §3, cegah wrap tidak rapi.
4. `@media (hover:hover) and (pointer:fine)` → hover state
   `.dashhub-feature-card` (border+bg berubah), digated supaya tidak jadi
   sticky-hover di layar sentuh.

**Verifikasi:**
- `node --test tests/*.test.js` → 1189/1189 PASS (sebelum & sesudah build,
  tidak ada test baru — perubahan murni CSS, tidak ada pola test CSS di
  project ini utk didupliksi/diperluas).
- `node scripts/build.js` → sukses, v231→v232, `index.html` &
  `app_production.html` identik.
- Playwright smoke (manual, lihat cara di `CATATAN-CEK-CLAUDE.md`): tidak
  ada horizontal scroll di 6 lebar viewport (360/390/768/900/1280/1920),
  Feature Search tetap filter & klik-navigasi jalan, klik Feature Card grid
  tetap navigasi jalan, tidak ada `pageerror` baru. Satu warning smoke-test
  bawaan (`OngkirCalc` tidak ke-`window`) tetap muncul seperti sebelumnya —
  bug lama pra-Tahap 4, sesuai catatan di awal task, tidak disentuh.

Tahap 5 SELESAI untuk scope Dashboard Hub. Sidebar responsif (blueprint §6
`sidebar-nav.js`) belum pernah dibuat sama sekali di codebase ini — di luar
scope task Tahap 5 kali ini (task hanya minta Dashboard Hub), jadi tidak
disentuh/tidak dianggap "temuan tertunda" — murni belum sampai gilirannya.

## Catatan kerja — 2026-07-17: Split tab halaman 🏠 Aset (page-aset)

Konteks: dari audit "halaman/tab mana yang kepanjangan ke bawah" (jumlah
card & baris per tab), `page-aset` adalah SATU-SATUNYA halaman utama yang
masih scroll panjang tanpa tab/accordion sama sekali — 8 card ditumpuk
(Insight, Dashboard Aset, Ringkasan Investasi, Penyusutan, Pajak Aset,
Histori Kekayaan, Buku Aset, Laporan Aset, Rekomendasi Alokasi). Dipecah jadi
3 tab, pola **SAMA PERSIS** dengan `setKeuanganTab`/`setShopTab`/`setCnTab`/
`setPajakTab` yang sudah ada (`.cn-tabs` + `.cn-tab[data-action]` + toggle
`u-dnone` per pane) — TIDAK ADA business logic baru, murni reorganisasi DOM:

- **📊 Ringkasan** (`#asetTab-ringkasan`) — Insight Aset, Dashboard Aset,
  Ringkasan Performa Investasi, Histori Kekayaan & Growth Rate.
- **📋 Buku Aset** (`#asetTab-buku`) — kartu Buku Aset (daftar aset +
  tambah/export/import/impor nota emas).
- **🧮 Analisis & Pajak** (`#asetTab-analisis`) — Penyusutan Aset, Pajak
  Aset, Laporan Aset, Rekomendasi Alokasi Aset.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#page-aset`:
   tambah `.cn-tabs` nav (3 tombol, `data-action="setAsetTab"`), bungkus
   kartu-kartu jadi 3 `<div id="asetTab-xxx">`. Semua `id` kartu/elemen di
   dalamnya (mis. `assetList`, `wealthSnapshotList`, `aaResult`, dst) TIDAK
   diubah sama sekali — supaya semua fungsi render yang sudah ada
   (`Aset.renderList()`, `AlokasiAset.init()`, `renderWealthSnapshots()`,
   dst, dipanggil dari `renderPageContent('aset')` di `modules-render.js`)
   tetap jalan apa adanya tanpa modifikasi, terlepas dari tab mana yang lagi
   aktif (sama seperti pola kartu ber-collapse yang sudah ada — kontennya
   tetap ke-render, cuma disembunyikan lewat CSS).
2. `aset.js` — tambah `const ASET_TAB_ORDER` + `function setAsetTab(t,el)`
   (persis pola `setKeuanganTab` di `tx-list-cashflow.js`), taruh sebelum
   `Object.assign(window,{...})` di akhir file.
3. `dashboard-hub.js` — tambah `const ASET_TAB_IDX` + cabang
   `target.page === 'aset'` di `dashHubNavigateToFeature()` supaya kartu
   fitur Dashboard Hub kategori "Aset" auto-switch ke tab yang benar
   sebelum `goTo`/scroll-highlight (pola sama dgn keuangan/shop/carnotes/
   pajak yang sudah ada).
4. `dashboard-hub-registry.js` — tambah field `tab` ke 4 entry kategori
   "Aset" (`aset-buku`→`buku`, `aset-histori`→`ringkasan`,
   `aset-alokasi`→`analisis`, `aset-emas`→`buku`) + update komentar "TAB
   REFERENSI" (sebelumnya `page:'aset' -> tanpa tab`, sekarang
   `'ringkasan'|'buku'|'analisis'`).
5. `features-sheets-pwa-selftest.js` — daftarkan `page-aset` ke self-test
   generik "panel tab benar-benar terlihat (computed display) setelah tab
   diklik" (grup `groups[]` yang sudah ada, cuma nambah 1 entry
   `{page:'#page-aset', fn:setAsetTab, paneId:t=>'asetTab-'+t}`).
6. `tests/dashboard-hub-registry.test.js` — tambah `aset: ['ringkasan',
   'buku', 'analisis']` ke `KNOWN_TABS` (whitelist yang dipakai test
   cross-check `target.tab` valid).

**Kenapa `index.html` & `app_production.html` diedit terpisah tapi identik
persis:** kedua file itu memang harus tetap 100% identik (ada test khusus
"HTML parity" utk ini) — jadi restrukturisasi HTML-nya dikerjakan sekali di
Python lalu ditempel ke kedua file dengan potongan yang SAMA PERSIS, bukan
diketik ulang manual dua kali (rawan typo beda antara keduanya).

**Verifikasi:** `node --test tests/*.test.js` → 1712/1712 PASS (termasuk
test parity index.html/app_production.html & test cross-check
FEATURE_REGISTRY target.tab). `node scripts/build.js` → sukses, v372→v373,
`index.html` & `app_production.html` tetap identik setelah build. **Catatan:
`npm run lint` (eslint) TIDAK dijalankan sesi ini** — `node_modules` belum
terpasang di environment kerja & tidak ada akses internet buat `npm install`
saat itu; jalankan `npm run check` penuh (atau minimal `npm run lint`)
sebelum rilis/PR sungguhan utk sesi ini supaya tetap sesuai alur wajib di
atas.

Sisa 3 kandidat dari audit yang sama (Keuangan > tab Laporan, Keuangan > tab
Kelola, Pajak & Zakat > tab 🧾 Pajak) BELUM dikerjakan — di luar scope sesi
ini, lihat ringkasan prioritas di percakapan sesi ini kalau mau lanjut.

## Catatan kerja — 2026-07-17 (bagian ke-2): split sub-tab 📊 Laporan (dalam page-keuangan)

Konteks: user minta kerjakan 1 saran tab-split paling urgent dari sisa 3
kandidat di atas. Dipilih **tab Laporan (Keuangan)** — bukan Kelola atau
Pajak — berdasarkan audit ulang jumlah baris & kartu per kandidat (dicek
langsung dari `index.html`, bukan tebakan): Laporan ≈136 baris/6 kartu utama
(Saldo Akun, Aset Keluarga, Grafik 6 Bulan, Proyeksi Arus Kas, Per Kategori,
Daftar Transaksi + Export) vs Kelola ≈145 baris/~3 kartu besar vs tab Pajak
(PPh 21) ≈117 baris/2 kartu — Laporan py kartu TERBANYAK & paling beragam
fungsinya, paling sesuai kriteria split yang sama dipakai utk `page-aset`
sebelumnya (banyak kartu berbeda fungsi ditumpuk, bukan cuma panjang scroll).

**Sub-tab baru (nested DI DALAM tab Laporan yang sudah ada, pola SAMA PERSIS
dgn `setAsetTab`/`asetTab-*`):**
- **📊 Ringkasan** (`#laporanTab-ringkasan`) — Saldo Akun, Aset Keluarga,
  stat Masuk/Keluar/Bersih, Grafik 6 Bulan.
- **📅 Arus Kas & Kategori** (`#laporanTab-aruskas`) — Proyeksi Arus Kas 30
  Hari, Per Kategori.
- **📋 Transaksi & Export** (`#laporanTab-transaksi`) — kartu jumlah
  transaksi/rata-rata, Daftar Transaksi, Export.

Filter/FAB/periode di bagian atas tab Laporan (chip periode, custom range,
select Tipe/Kategori/Sub/Akun/Metode, reset filter) **TETAP di luar
sub-tab** — satu state filter berlaku ke ketiga sub-tab sekaligus (bukan
per-sub-tab), karena `renderLaporan()` tetap 1x mengisi semua kartu di
ketiga sub-tab tiap kali filter berubah, terlepas dari sub-tab mana yang lagi
kelihatan (sama seperti kartu-kartu Aset yang tetap ke-render semua walau
disembunyikan CSS).

**Kenapa grouping-nya begini (bukan sekedar 3 kartu/3 kartu/3 kartu rata):**
ada 2 referensi `goToList(...)` di DALAM tab Laporan sendiri (bukan lewat
Dashboard Hub) — `lapAccTotal`→`lapAccList` & `lapCount`/`lapAvg`→`lapTx` —
`goToList()` (filter-laporan.js) TIDAK diberi parameter sub-tab baru (scope
sengaja dibatasi, lihat di bawah), jadi tiap pasangan goTo-target WAJIB
berakhir di sub-tab yang SAMA supaya `scrollIntoView` tidak nyasar ke elemen
yang lagi disembunyikan `u-dnone`. Karena itu "Jumlah transaksi/Rata-rata"
(goTo `lapTx`) ditaruh di **Transaksi & Export** (bareng `lapTx`), BUKAN di
Ringkasan seperti pengelompokan pertama yang sempat dipertimbangkan.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#keuanganTab-laporan`:
   tambah `.cn-tabs.lap-subtabs` nav (3 tombol, `data-action="setLaporanTab"`,
   class tombol **`.lap-subtab`, SENGAJA BUKAN `.cn-tab`**), bungkus 6 kartu
   jadi 3 `<div id="laporanTab-xxx">`. Semua `id` kartu/elemen di dalamnya
   (`lapAccList`, `grafikBars`, `cfBody`, `lapKat`, `lapTx`, dst) TIDAK
   diubah — fungsi render yang sudah ada (`renderLaporan()`,
   `renderCashflowForecast()`, dst, `modules-render.js`) tetap jalan apa
   adanya. Direstrukturisasi sekali di Python lalu ditempel SAMA PERSIS ke
   kedua file (pola sama dgn split Aset kemarin), diverifikasi `diff` 0.
2. `styles.css` — tambah `.lap-subtabs`/`.lap-subtab`/`.lap-subtab.active`,
   **class terpisah dari `.cn-tab`** (bukan cuma varian) — supaya query
   `#page-keuangan .cn-tab` yang dipakai `setKeuanganTab()`, `KEU_TAB_IDX`,
   & self-test generik TIDAK ikut menangkap tombol sub-tab bersarang ini
   (kalau ikut ketangkap: index tab top-level Kelola/Tagihan/dst jadi
   salah hitung & `classList.remove('active')` bakal ikut nge-reset tombol
   sub-tab). Pola isolasi class ini sudah ada presedennya di app ini
   (`.budget-tab-btn`, sub-tab Budget List/Rekomendasi) — bukan pola baru.
3. `tx-list-cashflow.js` — tambah `const LAPORAN_SUBTAB_ORDER` + `function
   setLaporanTab(t,el)`, persis pola `setAsetTab`, taruh setelah
   `setKeuanganTab`.
4. `dashboard-hub.js` — tambah `const LAPORAN_SUBTAB_IDX` + di dalam cabang
   `target.page === 'keuangan'`: kalau `target.tab==='laporan'` DAN
   `target.subtab` terisi, panggil `setLaporanTab()` juga (setelah
   `setKeuanganTab()`) — supaya kartu fitur Dashboard Hub yang nunjuk ke
   dalam tab Laporan (Saldo Akun, Grafik, Arus Kas, Per Kategori, Export)
   auto-buka sub-tab yang benar sebelum `goTo`/scroll-highlight, BUKAN
   nyasar ke sub-tab Ringkasan (default) kalau kontennya sebenarnya ada di
   sub-tab lain.
5. `dashboard-hub-registry.js` — tambah field `subtab` ke 4 entry kategori
   Keuangan yang nunjuk ke dalam tab Laporan (`keu-saldo-akun`→`ringkasan`,
   `keu-grafik`→`ringkasan`, `keu-cashflow`→`aruskas`,
   `keu-laporan-kategori`→`aruskas`, `keu-export`→`transaksi`) + update
   komentar "TAB REFERENSI".
6. `features-sheets-pwa-selftest.js` — tambah 1 entry ke `groups[]` self-test
   generik "panel tab benar-benar terlihat setelah tab diklik":
   `{page:'#keuanganTab-laporan', fn:setLaporanTab, paneId:t=>'laporanTab-'+t,
   btnClass:'.lap-subtab'}` — reuse harness yang sudah ada (presedennya
   entry `BudgetTabs.switchTo`/`.budget-tab-btn`), tidak menulis self-test
   baru dari nol.
7. `tests/dashboard-hub-registry.test.js` — tambah `KNOWN_SUBTABS =
   {'keuangan.laporan': ['ringkasan','aruskas','transaksi']}` + test baru
   cross-check `target.subtab` (valid sesuai whitelist DAN id
   `laporanTab-<subtab>` nyata ada di DOM), pola sama persis dgn test
   `target.tab` yang sudah ada.

**Kenapa TIDAK mengubah `goToList()` (filter-laporan.js):** sempat
dipertimbangkan nambah parameter sub-tab ke `goToList()` biar lebih generik,
tapi itu fungsi bersama dipakai BANYAK pemanggil lintas halaman (Shop, Car
Notes, Aset, dst) — mengubah signature-nya menambah risiko regresi di luar
scope sub-tab Laporan. Sebagai gantinya, 2 pemanggilan `goToList()` yang ada
DI DALAM tab Laporan sengaja diatur supaya goTo-target-nya selalu di
sub-tab yang sama dgn kartu pemanggilnya (lihat penjelasan grouping di
atas) — cukup lewat pengaturan DOM, tanpa nyentuh `goToList()` sama sekali.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (naik dari 1712
  sebelum sesi ini, +1 test baru [`target.subtab` cross-check], 0 regresi).
- `node scripts/build.js kw83-split-laporan-subtab-1` → sukses, v373→v374,
  kedua bundle lolos `node --check` sintaks, `index.html` &
  `app_production.html` tetap identik setelah build, `FILE-MAP.md`
  diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam blok `#page-keuangan`):
  6 tombol `.cn-tab` (top-level) vs 3 tombol `.lap-subtab` (nested) —
  dikonfirmasi TIDAK ada tabrakan class/selector.
- Smoke-test browser (Playwright) & `npm run lint` **TIDAK dijalankan sesi
  ini** — sandbox tanpa Chrome/Playwright terpasang & tanpa akses internet
  utk `npm install`/`eslint`, sama seperti keterbatasan hampir semua sesi
  sebelumnya di file ini. **Tolong jalankan smoke-test browser manual**
  (buka `?dev=1`, klik ketiga tombol sub-tab Laporan, pastikan kartu yang
  benar tampil & konten tetap terisi setelah filter diubah) **+
  `npm run lint`/`npm run check`** sebelum merge/release.

Sisa 2 kandidat dari audit sebelumnya (Keuangan > tab Kelola, Pajak & Zakat >
tab 🧾 Pajak) BELUM dikerjakan — di luar scope sesi ini.

## Catatan kerja — 2026-07-17 (bagian ke-3): split sub-tab 💰 Kelola (dalam page-keuangan)

Konteks: user minta lanjut 1 saran tab-split berikutnya. Dari 2 sisa
kandidat (Kelola, Pajak PPh21), dipilih **Kelola** — audit ulang jumlah
baris/kartu (dicek langsung dari `index.html`): Kelola ≈145 baris/~18
elemen bertanda `class="card...` (Insight, Saldo Bersih, Absensi Gaji,
Semua Transaksi + filter besar, Kelola Kategori, Import Data, Kekayaan
Bersih) vs tab Pajak (PPh 21) ≈117 baris/~15 — Kelola tetap yang
terpanjang & terbanyak kartunya dari sisa 2 kandidat.

**Sub-tab baru (nested DI DALAM tab Kelola yang sudah ada, pola SAMA PERSIS
dgn `setLaporanTab`/`setAsetTab`):**
- **📊 Ringkasan** (`#kelolaTab-ringkasan`) — Insight Keuangan, header
  month-nav, stat Pemasukan/Pengeluaran, Saldo Bersih, Gaji dari Absensi,
  Kekayaan Bersih.
- **💸 Transaksi** (`#kelolaTab-transaksi`) — tombol cepat Masuk/Keluar/
  Transfer, Kalkulator Gaji, Absensi Harian, kartu Semua Transaksi
  (filter+search+list+load more).
- **🏷️ Kelola Data** (`#kelolaTab-pengaturan`) — Kelola Kategori &
  Subkategori, Import Data dari Aplikasi Lain (keduanya sudah `<details>`
  collapse dari awal).

**Kenapa grouping-nya begini:** ada 2 pasangan `goToList()`/aksi DALAM tab
Kelola sendiri yang WAJIB tetap 1 sub-tab (`goToList()` TIDAK diberi
parameter sub-tab, sama seperti keputusan di split Laporan kemarin) —
tapi keduanya kebetulan sudah otomatis aman: `kbPiutang`/`kbTotalAset`/
`kbSaldoAkun`/`kbInventori` di kartu Kekayaan Bersih semua `goToList()`/
`showPage()` ke tab/halaman LAIN (bukan balik ke elemen di dalam Kelola
sendiri), jadi TIDAK ada kasus goTo-target yang kepisah sub-tab kayak
`lapCount→lapTx` kemarin. Header month-nav (`changeMonth`) sengaja ditaruh
di **Ringkasan** (bareng stat Pemasukan/Pengeluaran yang dipengaruhinya),
BUKAN di Transaksi — karena kartu "Semua Transaksi" py filter periode
sendiri (`txListPeriodeChips`/`setTxListPeriode`), independen dari
month-nav (`curMonth`/`curYear`, dipakai `mIncome`/`mExpense`/`mNet` saja).

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi
   `#keuanganTab-kelola`: tambah `.cn-tabs.kel-subtabs` nav (3 tombol,
   `data-action="setKelolaTab"`, class tombol **`.kel-subtab`** — beda lagi
   dari `.cn-tab` MAUPUN `.lap-subtab`, alasan sama dgn split Laporan:
   cegah tabrakan query `#page-keuangan .cn-tab`), bungkus kartu-kartu jadi
   3 `<div id="kelolaTab-xxx">`. Semua `id` elemen di dalamnya TIDAK diubah
   — `renderKeuangan()` (modules-render.js) tetap mengisi `monthLabel`,
   `mIncome`/`mExpense`/`mNet`, `allTx`, dst di ketiga sub-tab sekaligus,
   terlepas dari mana yang aktif. Direstrukturisasi sekali di Python lalu
   ditempel SAMA PERSIS ke kedua file, `diff` 0.
2. `styles.css` — tambah `.kel-subtabs`/`.kel-subtab`/`.kel-subtab.active`,
   class terpisah dari `.cn-tab` & `.lap-subtab` (bukan varian keduanya).
3. `tx-list-cashflow.js` — tambah `const KELOLA_SUBTAB_ORDER` + `function
   setKelolaTab(t,el)`, persis pola `setLaporanTab`/`setAsetTab`.
4. `dashboard-hub.js` — tambah `const KELOLA_SUBTAB_IDX` + cabang baru
   `target.tab==='kelola' && target.subtab` (else-if setelah cabang
   `laporan`) yang panggil `setKelolaTab()` sesudah `setKeuanganTab()`.
5. `dashboard-hub-registry.js` — tambah `subtab: 'transaksi'` ke 3 entry
   yang nunjuk tab Kelola dgn `action:'openTxModal'` (`keu-transaksi`,
   `ai-kategorisasi`, `ai-scan-ocr`) — bukan krn goTo butuh (ketiganya
   modal-only, tidak goTo), tapi supaya konteks tab yang kebuka DI
   BELAKANG modal sesuai (kartu Semua Transaksi), bukan default Ringkasan.
   Update juga komentar "TAB REFERENSI".
6. `features-sheets-pwa-selftest.js` — tambah 1 entry ke `groups[]`:
   `{page:'#keuanganTab-kelola', fn:setKelolaTab, paneId:t=>'kelolaTab-'+t,
   btnClass:'.kel-subtab'}`.
7. `tests/dashboard-hub-registry.test.js` — `KNOWN_SUBTABS` diperluas
   dgn `'keuangan.kelola': ['ringkasan','transaksi','pengaturan']` + test
   `target.subtab` yang sudah ada (dari split Laporan) DIGENERALISASI
   (tambah `SUBTAB_PANE_PREFIX` map, bukan hardcode `laporanTab-`) supaya
   otomatis ikut cross-check subtab Kelola juga, tanpa duplikasi test.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (sama dgn
  sebelum sesi ini — tidak ada test BARU ditambahkan krn test
  `target.subtab` yang sudah ada digeneralisasi, bukan diduplikasi; 0
  regresi).
- `node scripts/build.js kw83-split-kelola-subtab-1` → sukses, v374→v375,
  kedua bundle lolos `node --check`, `index.html`/`app_production.html`
  tetap identik, `FILE-MAP.md` diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam blok `#page-keuangan`):
  6 `.cn-tab` (top-level) vs 3 `.lap-subtab` (Laporan) vs 3 `.kel-subtab`
  (Kelola) — dikonfirmasi TIDAK ada tabrakan class/selector antar
  ketiganya.
- Smoke-test browser (Playwright) & `npm run lint` **TIDAK dijalankan sesi
  ini** — sandbox tanpa Chrome/Playwright & tanpa akses internet, sama
  seperti sesi-sesi sebelumnya. **Tolong jalankan smoke-test browser
  manual** (buka `?dev=1`, klik ketiga tombol sub-tab Kelola, pastikan
  kartu yang benar tampil, tombol +Masuk/-Keluar/Transfer masih berfungsi,
  & filter/search transaksi tetap jalan) **+ `npm run lint`/`npm run
  check`** sebelum merge/release.

Sisa 1 kandidat dari audit sebelumnya (Pajak & Zakat > tab 🧾 Pajak PPh 21)
BELUM dikerjakan — di luar scope sesi ini.

## Catatan kerja — 2026-07-17 (bagian ke-4): split sub-tab 🧾 Pajak (PPh 21) (dalam page-pajak)

Konteks: user minta lanjut kandidat TERAKHIR dari daftar tab-split
(Keuangan > Laporan ✅, Keuangan > Kelola ✅, sisa: Pajak & Zakat > tab 🧾
Pajak PPh 21). Tab ini SENGAJA cuma dipecah 2 sub-tab (bukan 3 seperti
Laporan/Kelola/Aset) — audit ulang isi (dicek dari `index.html`) cuma
ketemu 2 kartu utama (🧾 Estimasi PPh 21, 🏛️ PBB) + 2 `<details>` terkait
(📖 Tabel Referensi PTKP & Tarif, 🏪 Pajak Bisnis Shop/UMKM), jadi
dikelompokkan jadi 2 sub-tab bertema, bukan dipaksa 3.

**Sub-tab baru (nested DI DALAM tab 🧾 Pajak yang sudah ada, pola SAMA
PERSIS dgn `setLaporanTab`/`setKelolaTab`/`setAsetTab`):**
- **🧾 PPh 21** (`#pjkTab-pph21`) — kartu Estimasi PPh 21 (Orang Pribadi) +
  `<details>` Tabel Referensi PTKP & Tarif.
- **🏛️ PBB & UMKM** (`#pjkTab-pbb`) — kartu PBB (Pajak Bumi & Bangunan) +
  `<details>` Pajak Bisnis Shop (UMKM).

**Kartu `pajakRekomendasiCard` (rekomendasi dinamis berdasar Status
Pekerjaan di Profil) SENGAJA ditaruh DI LUAR kedua sub-tab**, tetap di atas
nav sub-tab, persis di bawah `pajakRekomendasiCard` lama — karena isinya
lintas sub-tab (`renderPajakRekomendasi()` di `modules-render.js` bisa
merujuk baik kalkulator PPh 21 MAUPUN PPh Final UMKM sekaligus, tergantung
`D.profile.statusPekerjaan`: karyawan/freelance/keduanya). Kalau kartu ini
ikut dipindah ke salah satu sub-tab, rekomendasi yang menyebut kalkulator
di sub-tab LAIN jadi tidak terlihat user tanpa pindah tab dulu.

**Reorganisasi urutan DOM:** sebelumnya urutan kartu di `index.html` adalah
PPh21 → PBB → Tabel PTKP&Tarif → UMKM (PBB nyempil DI ANTARA PPh21 & tabel
referensinya). Supaya pengelompokan sub-tab masuk akal, urutan diubah jadi
PPh21 → Tabel PTKP&Tarif (sub-tab PPh 21) lalu PBB → UMKM (sub-tab PBB &
UMKM). Semua `id` kartu/elemen di dalamnya (`pjPPh21Card`, `pphResultBox`,
`pjPBBCard`, `pbbAssetPick`, `umkmDetails`, dst) TIDAK diubah sama sekali —
`renderPajakZakat()`/`renderPajakRekomendasi()`/`pilihAsetPBB()` dst
(dipanggil dari `renderPageContent('pajak')` di `modules-render.js`) tetap
jalan apa adanya, terlepas dari sub-tab mana yang aktif.

**File yang diubah:**
1. `index.html` & `app_production.html` — restrukturisasi `#pajakTab-pajak`
   (nested di dalam tab top-level 🧾 Pajak (PPh 21), yang sendiri nested di
   dalam `#page-pajak`): tambah `.cn-tabs.pjk-subtabs` nav (2 tombol,
   `data-action="setPjkTab"`, class tombol **`.pjk-subtab`** — beda lagi
   dari `.cn-tab`/`.lap-subtab`/`.kel-subtab`, alasan sama dgn split
   Laporan/Kelola: cegah tabrakan query `#page-pajak .cn-tab` yang dipakai
   `setPajakTab()`/`PAJAK_TAB_IDX`/self-test buat tab Zakat/Pajak
   tingkat-atas), bungkus & reorder kartu jadi 2 `<div id="pjkTab-xxx">`.
   Direstrukturisasi sekali di Python lalu ditempel SAMA PERSIS ke kedua
   file, `diff` 0.
2. `styles.css` — tambah `.pjk-subtabs`/`.pjk-subtab`/`.pjk-subtab.active`,
   class terpisah dari `.cn-tab`/`.lap-subtab`/`.kel-subtab` (bukan varian
   salah satunya).
3. `features-sheets-pwa-selftest.js` — tambah `const PJK_SUBTAB_ORDER` +
   `function setPjkTab(t,el)` (persis pola `setLaporanTab`/`setKelolaTab`),
   ditaruh tepat setelah `setPajakTab()` yang sudah ada di file yang sama
   (file ini SUDAH jadi rumah `setPajakTab`/`hitungPPh21`/`hitungPBB` dkk
   dari sesi-sesi lampau — bukan file baru, ikut lokasi yang sudah ada).
   Juga tambah 1 entry ke `groups[]` self-test generik "panel tab
   benar-benar terlihat setelah tab diklik": `{page:'#pajakTab-pajak',
   fn:setPjkTab, paneId:t=>'pjkTab-'+t, btnClass:'.pjk-subtab'}`.
4. `dashboard-hub.js` — tambah `const PJK_SUBTAB_IDX` + cabang baru di
   dalam blok `target.page === 'pajak'` yang panggil `setPjkTab()` kalau
   `target.tab==='pajak' && target.subtab`, sesudah `setPajakTab()` (pola
   sama dgn cabang `laporan`/`kelola` di dalam blok `keuangan`).
5. `dashboard-hub-registry.js` — tambah `subtab: 'pph21'` ke entry
   `pz-pph21` & `subtab: 'pbb'` ke entry `pz-pbb` (2 entry kategori Pajak &
   Zakat yang nunjuk ke tab `pajak`). Update juga komentar "TAB REFERENSI".
6. `tests/dashboard-hub-registry.test.js` — `KNOWN_SUBTABS` diperluas dgn
   `'pajak.pajak': ['pph21','pbb']` + `SUBTAB_PANE_PREFIX` diperluas dgn
   `'pajak.pajak': 'pjkTab-'` — REUSE test `target.subtab` yang sudah
   digeneralisasi di split Kelola (bukan test baru, otomatis ikut
   cross-check sub-tab Pajak juga).

**Kenapa TIDAK mengubah `goToList()`/fungsi navigasi lain:** tidak ada
pemanggilan `goToList()` DI DALAM tab Pajak yang menunjuk balik ke elemen
lain di dalam tab Pajak sendiri (beda dari kasus `lapCount→lapTx` di split
Laporan) — `pbbAssetPick` (dropdown pilih aset) manggil `pilihAsetPBB()`
murni baca `D.assets`, bukan navigasi; entry registry `pz-*` semua
`goTo` ke elemen di sub-tab yang SAMA dgn `subtab` barunya sendiri. Jadi
tidak ada penyesuaian selain menambah field `subtab` di 2 entry di atas.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1713/1713 pass, 0 fail** (sama dgn
  sebelum sesi ini — tidak ada test BARU krn test `target.subtab` yang
  sudah ada di-reuse via `KNOWN_SUBTABS`/`SUBTAB_PANE_PREFIX`, bukan
  diduplikasi; 0 regresi).
- `node scripts/build.js kw84-split-pajak-subtab-1` → sukses, v375→v376,
  kedua bundle lolos `node --check` sintaks, `index.html` &
  `app_production.html` tetap identik setelah build, `FILE-MAP.md`
  diregenerasi otomatis.
- Sanity-check manual (regex hitung tombol dalam `index.html`): 19
  `.cn-tab` (top-level, semua halaman) vs 3 `.lap-subtab` (Laporan) vs 3
  `.kel-subtab` (Kelola) vs 2 `.pjk-subtab` (Pajak) — dikonfirmasi TIDAK
  ada tabrakan class/selector antar keempatnya.
- Smoke-test browser (Playwright) & `npm run lint`/`npm install` (esbuild)
  **TIDAK dijalankan sesi ini** — sandbox tanpa Chrome/Playwright terpasang
  & tanpa akses internet, sama seperti sesi-sesi split sebelumnya (build di
  atas otomatis fallback ke bundle TANPA minifikasi krn esbuild tidak
  ketemu, sesuai catatan esbuild di atas — bundle tetap valid & aman
  dipakai, cuma lebih besar). **Tolong jalankan smoke-test browser manual**
  (buka `?dev=1`, buka Pajak & Zakat > tab 🧾 Pajak (PPh 21), klik kedua
  tombol sub-tab, pastikan kartu yang benar tampil, kalkulator PPh 21 & PBB
  tetap jalan, kartu rekomendasi tetap muncul di kedua sub-tab sesuai
  Status Pekerjaan) **+ `npm install --save-dev esbuild` lalu `npm run
  check` penuh (lint + test + build minified)** sebelum merge/release.

Dengan ini SEMUA 4 kandidat dari audit "halaman/tab kepanjangan" (page-aset,
Keuangan > Laporan, Keuangan > Kelola, Pajak & Zakat > Pajak PPh 21) SUDAH
selesai dipecah jadi tab/sub-tab. Belum ada audit baru dijalankan setelah
ini utk cari kandidat split berikutnya (kalau ada) — di luar scope sesi ini.

## AUDIT + RENCANA KERJA BERTAHAP — Split tab 🧭 Dashboard Hub (landing page) — BELUM DIKERJAKAN

Konteks: user minta saran split tab lanjutan utk **Dashboard Hub**
(`#page-dashboard-hub`), landing page default aplikasi (bukan salah satu
dari 4 kandidat di atas — itu semua tab DI DALAM page lain, Dashboard Hub
adalah page-nya sendiri). Sesi ini **HANYA audit + rencana kerja**, TIDAK
ADA perubahan kode — pengelompokan sub-tab adalah keputusan produk (lihat
aturan "STOP dan tanya dulu" di bagian atas file ini), jadi ditulis dulu di
sini utk dikonfirmasi sebelum dieksekusi.

### 1. Temuan audit

`#page-dashboard-hub` (index.html baris 2193–2508, **≈316 baris** — lebih
panjang dari SEMUA 4 kandidat yang sudah dipecah sebelumnya sebelum
dipecah: Aset ~? kartu/8, Laporan ≈136 baris, Kelola ≈145 baris, Pajak
≈117 baris) berisi, urut dari atas:

1. **Hero Card** (`dashHubHeroCard`) — saldo semua akun + pemasukan/
   pengeluaran bulan ini. Diisi `DashboardHubHero.render()`.
2. **🪜 Tangga Ternak Uang** (`tanggaKeuanganCard`) — kartu besar
   background image, diisi script terpisah (`tangga-keuangan.js`, load
   SETELAH bundle).
3. **Quick Actions** (`dashHubQuickActions`) — 4 tombol (Transaksi,
   Backup, Cari, AI). Murni markup, tidak ada modul JS sendiri.
4. **Summary Cards** (`dashHubSummaryGrid`) — diisi
   `DashboardHubSummary.render()`.
5. **Analytics row** (`dashHubAnalyticsRow`) — diisi
   `DashboardHubAnalytics.render()`.
6. **🔍 Search fitur** (`dashHubSearchInput` + `dashHubSearchResults`).
7. **⭐ Favorit** (`dashHubFavoritSection`, `u-dnone` default sampai user
   nge-favorit sesuatu) — diisi `DashboardHubFavoritView.render()`.
8. **Tab switcher yang SUDAH ADA**: 🗂️ Semua Fitur ↔ 📌 Pinned Widget
   (`dashHubMainTabsRow`, pola `chip-btn` + `DashboardHub.setMainTab()`/
   `applyMainTab()` di `dashboard-hub.js`, preferensi diingat di
   `localStorage['dashHubMainTab']`, default `'fitur'`). Ini BUKAN pola
   `.cn-tab`/`.lap-subtab` dkk yang dipakai di 4 split sebelumnya — sistem
   beda, dibuat sesi lampau (lihat `QUICK-ACTIONS.md`/`PINNED-WIDGETS.md`),
   TIDAK disentuh sesi ini, murni didata ulang di sini.
   - Pane **"Semua Fitur"** (`dashHubMainGridCard`) — grid kategori fitur
     (`dashboardHubGrid`), collapsible sendiri (`card-collapse-toggle`).
   - Pane **"Pinned Widget"** (`dashboardHubPinnedWrap`) — **6 kartu besar
     ditumpuk**: 🧭 Penasihat (`advisorCard`), 🎯 Skor Hidup Seimbang
     (`lifeBalanceCard`), 🌱 Refleksi & Self-Care (`refleksiCard`), 🎯
     Kebebasan Finansial (`dashFiCard`), 🏖️ Dana Pensiun
     (`dashPensiunCard`), 📅 Absensi Harian (`dashAbsensiCard`).
9. **🌱 Life OS** (`lifeOSWrap`, `u-dnone` default, toggle di Setelan) —
   DI LUAR tab switcher #8, jadi selalu ada di DOM (kadang tersembunyi via
   toggle setting, BUKAN via tab Fitur/Pinned).
10. **🌦️ Kondisi Ekonomi / EIE** (`eieWrap`) — DI LUAR tab switcher #8
    juga, SELALU tampil (tidak ada toggle sembunyi seperti Life OS).

**Kenapa terasa panjang:** item #1–7 SEMUA selalu tampil sebelum user
sampai ke tab switcher #8, lalu #9–10 (Life OS + EIE) juga selalu tampil
lagi SETELAH pane #8 — jadi walau sudah ada 1 tab switcher, total ada 3
"section besar" (item 1-7, pane Pinned Widget yang isinya 6 kartu, lalu
Life OS+EIE) yang semuanya numpuk berurutan, bukan benar-benar tersembunyi
lewat tab.

**`DashboardHub.render()` (dashboard-hub.js) memanggil SEMUA render()
modul di atas tanpa syarat** (LifeOSHome, DashboardHubFavoritView,
DashboardHubHero, DashboardHubSummary, DashboardHubAnalytics,
EIEDashboard, dst) — baru di baris PALING BAWAH toggle visibility Fitur/
Pinned dijalankan (`applyMainTab`). Pola ini match dgn split-split
sebelumnya (Laporan/Kelola/Aset/Pajak): render tetap isi SEMUA sub-tab
sekaligus, cuma visibility yang di-toggle — jadi split baru bisa REUSE
pola yang sama, tidak perlu ubah cara render.

### 2. Kenapa risiko lebih tinggi dari 4 split sebelumnya

- **13 file test** khusus menyentuh `page-dashboard-hub`
  (`tests/dashboard-hub*.test.js`) — jauh lebih banyak dari test yang
  disentuh tiap split sebelumnya (Laporan/Kelola cuma nambah ke 1 file
  `dashboard-hub-registry.test.js`).
- Ini **landing page default** (`class="page active"` saat startup) —
  bug di sini langsung kelihatan tiap buka app, beda dari tab yang perlu
  diklik dulu.
- Sudah dicek: `tests/dashboard-hub-quickactions.test.js` &
  `tests/dashboard-hub-pinned-widgets.test.js`/`pinnedwidgets.test.js`
  TIDAK menuntut struktur DOM parent-child yang kaku — mereka cek (a)
  **urutan posisi string** (`heroIdx < qaIdx < searchIdx`, aman dilewati
  asal urutan elemen tidak dibalik) dan (b) **elemen tsb ADA DI DALAM
  `#page-dashboard-hub`** (aman dilewati asal tetap nested di situ, boleh
  dibungkus wrapper div baru). Jadi risikonya **bisa dikelola** asal
  urutan DOM tidak dibalik & tidak ada elemen yang dipindah KELUAR dari
  `#page-dashboard-hub` — sama seperti prinsip yang sudah dipakai di split
  Aset/Laporan/Kelola/Pajak (index/id kartu tidak diubah, cuma dibungkus).

### 3. Usulan pengelompokan sub-tab (masih perlu dikonfirmasi user)

Hero Card + Quick Actions + Search **diusulkan TETAP selalu tampil di
atas** (tidak ikut dipecah) — itu yang paling sering dibutuhkan sekali
lihat begitu buka app, beda karakter dari kartu2 lain yang sifatnya lebih
"jelajah fitur".

| Sub-tab baru | Isi |
|---|---|
| *(selalu tampil, di atas nav sub-tab)* | Hero Card, Quick Actions, Search |
| 📊 Ringkasan | Summary Cards, Analytics row, 🪜 Tangga Ternak Uang |
| 🗂️ Fitur | ⭐ Favorit, lalu switcher **Semua Fitur ↔ Pinned Widget yang SUDAH ADA (tidak diubah)** |
| 🌦️ Insight | 🌱 Life OS, 🌦️ Kondisi Ekonomi (EIE) |

Opsional tahap lanjutan (kalau pane Pinned Widget masih dirasa panjang
setelah split di atas): pecah 6 kartu Pinned Widget jadi 2 grup kecil pakai
sistem sub-sub-tab yang sama (mis. "Finansial": Kebebasan Finansial/Dana
Pensiun/Absensi vs "Personal": Penasihat/Skor Hidup Seimbang/Refleksi) —
TIDAK termasuk rencana Fase 1-6 di bawah, nunggu evaluasi setelah Fase 1-6
selesai & dirasakan langsung.

**Pertanyaan produk yang perlu dijawab user sebelum eksekusi:**
1. Setuju grouping 3-sub-tab di atas, atau ada preferensi lain (mis.
   Favorit digabung ke section selalu-tampil, bukan masuk sub-tab Fitur)?
2. Nama/emoji sub-tab boleh diubah sesuai selera (📊 Ringkasan / 🗂️ Fitur /
   🌦️ Insight cuma usulan awal).
3. Switcher Fitur↔Pinned Widget yang sudah ada — tetap dipertahankan APA
   ADANYA di dalam sub-tab "🗂️ Fitur" (opsi di rencana ini), atau
   sekalian mau dilebur jadi sub-tab baru (bukan chip-switcher lagi)?

### 4. Rencana kerja bertahap (tiap fase independen, bisa di-`npm run
check` & commit terpisah — SAMA PERSIS filosofi "perubahan sekecil
mungkin" di bagian atas file ini)

**Fase 1 — Tambah nav sub-tab + bungkus DOM (index.html/app_production.html)**
- Tambah `.cn-tabs.dhb-subtabs` (2 tombol dulu, `.dhb-subtab`, class baru
  lagi — pola sama alasan sama dgn `.lap-subtab`/`.kel-subtab`/
  `.pjk-subtab`: cegah tabrakan `#page-dashboard-hub .cn-tab` andai nanti
  ada `.cn-tab` lain di page ini) diletakkan **setelah** Search/Favorit,
  **sebelum** tab switcher Fitur/Pinned lama (#8 di atas).
- Bungkus (TANPA reorder — urutan DOM existing dipertahankan) jadi 3
  `<div id="dashHubTab-xxx">`:
  - `dashHubTab-ringkasan`: Summary Cards + Analytics + Tangga Ternak Uang.

    ⚠️ Catatan urutan: Tangga Ternak Uang ada di ATAS Quick Actions di DOM
    saat ini (lihat temuan #2 vs #3 di atas), sementara Summary/Analytics
    (#4-5) ada di BAWAH Quick Actions. Kalau mau digabung 1 sub-tab
    Ringkasan tanpa reorder DOM, Tangga Ternak Uang TETAP di posisi
    asalnya (sebelum Quick Actions, di luar area selalu-tampil) — berarti
    definisi "selalu tampil di atas" di §3 perlu disesuaikan jadi Hero →
    Tangga Ternak Uang ATAU Tangga Ternak Uang ikut masuk sub-tab
    Ringkasan (butuh reorder kecil: pindah ke bawah Analytics). Pilih
    salah satu saat eksekusi Fase 1 — dicatat di sini supaya tidak
    kelewat, BUKAN diputuskan sepihak di rencana ini.
  - `dashHubTab-fitur`: Favorit + tab switcher Fitur/Pinned Widget lama
    (utuh, tidak diubah isinya).
  - `dashHubTab-insight`: Life OS wrap + EIE wrap.
- Tambah `DashboardHub.setSectionTab(tab)` / `applySectionTab(tab)` di
  `dashboard-hub.js` — method BARU di object `DashboardHub` yang sudah
  ada (pola sama persis dgn `setMainTab`/`applyMainTab` yang sudah ada di
  situ, TAPI localStorage key BEDA: `dashHubSectionTab`, supaya tidak
  tabrakan dgn `dashHubMainTab` yang sudah ada). Dipanggil dari
  `DashboardHub.render()` di baris paling akhir (setelah
  `this.applyMainTab(...)` yang sudah ada), pola "render semua dulu, baru
  toggle visibility" tetap sama.
- CSS: `styles.css` tambah `.dhb-subtabs`/`.dhb-subtab`/
  `.dhb-subtab.active`, copy pola persis dari `.pjk-subtabs` dkk.

**Fase 2 — Self-test & test generalisasi**
- `features-sheets-pwa-selftest.js`: tambah 1 entry ke `groups[]`
  (`{page:'#page-dashboard-hub', fn:DashboardHub.setSectionTab,
  paneId:t=>'dashHubTab-'+t, btnClass:'.dhb-subtab'}` — cek dulu apakah
  harness `groups[]` support `fn` berupa method object (`Xxx.yyy`), kalau
  cuma support fungsi global perlu wrapper tipis).
- `tests/dashboard-hub-registry.test.js`: **kemungkinan besar TIDAK perlu
  diubah** — Dashboard Hub bukan target navigasi (`target.page:
  'dashboard-hub'` dgn `subtab`) dari page lain di `FEATURE_REGISTRY`
  setahu audit ini (perlu di-grep ulang saat eksekusi: `grep "page:
  'dashboard-hub'" dashboard-hub-registry.js` — kalau ADA entry semacam
  itu, baru perlu tambah `subtab` + masuk `KNOWN_SUBTABS`/
  `SUBTAB_PANE_PREFIX` pakai key `'dashboard-hub.<tab>'`).
- Test yang WAJIB dicek manual satu-satu (bukan auto-fix, baca dulu
  assert-nya) karena posisi/containment-sensitive (lihat §2):
  `dashboard-hub-quickactions.test.js`,
  `dashboard-hub-pinned-widgets.test.js`,
  `dashboard-hub-pinnedwidgets.test.js`,
  `dashboard-hub-default-landing.test.js`,
  `dashboard-hub-advisor-lifebalance-migration.test.js`.

**Fase 3 — `npm run check` penuh + smoke-test manual**
- `node --test tests/*.test.js` sampai 0 fail (baseline sebelum mulai:
  1713/1713 — catat angka SEBELUM Fase 1 mulai, supaya jelas berapa test
  baru/berubah).
- `node scripts/build.js` → cek versi naik, `index.html`/
  `app_production.html` tetap identik, bundle lolos `node --check`.
- Smoke-test browser manual WAJIB (lebih kritis dari split sebelumnya
  krn ini landing page): buka app dari awal (bukan `?dev=1` doang),
  pastikan Hero/Quick Actions/Search langsung kelihatan tanpa perlu klik
  apa-apa, klik ketiga sub-tab baru, pastikan grid Semua Fitur & Pinned
  Widget (switcher lama) masih jalan seperti biasa DI DALAM sub-tab
  Fitur, pastikan Favorit/Life OS/EIE masih render datanya, pastikan
  reload app balik ke sub-tab terakhir yang aktif (via localStorage,
  konsisten dgn perilaku `dashHubMainTab` yang sudah ada).

**Fase 4 (opsional, TIDAK termasuk scope awal)** — pecah pane Pinned
Widget (6 kartu) jadi 2 sub-sub-tab, lihat §3 "Opsional tahap lanjutan".
Hanya dikerjakan kalau setelah Fase 1-3 dirasa masih kurang & user minta
lanjut.

### 5. Status

**Fase 1 SELESAI** (lihat catatan kerja 2026-07-17 bagian ke-5 di bawah).
**Fase 2 SELESAI/diverifikasi — TIDAK ada perubahan kode** (lihat catatan
kerja 2026-07-17 bagian ke-6 di bawah): harness `groups[]` dikonfirmasi
memang tidak cocok (1 pane id per tab, bukan beberapa id tersebar) —
cakupan setara sudah dipenuhi `dashboard-hub-sectiontabs.test.js` yang
dibuat di Fase 1, jadi generalisasi harness lama ditutup sebagai "sengaja
dilewati", bukan utang. `dashboard-hub-registry.test.js` dikonfirmasi
TIDAK perlu diubah (di-grep ulang, tidak ada entry `subtab` yang
dibutuhkan). Fase 3 (npm run check penuh + smoke-test manual) — bagian
`test`+`build` SUDAH dijalankan & hijau (lihat bagian ke-6), `lint` &
smoke-test browser manual **masih BELUM** (lihat catatan "belum
dikerjakan" di bagian ke-6).

## Catatan kerja — 2026-07-17 (bagian ke-5): eksekusi Fase 1 — split tab 🧭 Dashboard Hub (landing page)

Konteks: lanjutan audit di atas ("BELUM DIKERJAKAN"). User minta lanjut
eksekusi Fase 1 langsung (tanpa menunggu jawaban 1-per-1 dari 3 pertanyaan
produk di §3) — keputusan di bawah diambil mengikuti opsi berisiko-paling-
rendah/paling-sesuai filosofi "perubahan sekecil mungkin" di atas, BUKAN
keputusan sepihak soal selera produk.

**Keputusan yang diambil (menjawab §3 & catatan ambiguitas Tangga Ternak
Uang di Fase 1):**
1. Grouping 3-sub-tab dipakai APA ADANYA sesuai usulan §3 (📊 Ringkasan /
   🗂️ Fitur / 🌦️ Insight) — nama/emoji belum diubah, gampang di-rename user
   kapan saja (tinggal ganti teks tombol di index.html/app_production.html,
   key internal `ringkasan`/`fitur`/`insight` tidak perlu ikut berubah).
2. **Tangga Ternak Uang TETAP jadi bagian "selalu tampil" (Hero → Tangga →
   Quick Actions → Search), TIDAK ikut masuk sub-tab Ringkasan** — opsi ini
   dipilih (bukan opsi "pindah ke bawah Analytics") krn 0 reorder DOM, vs
   opsi satunya butuh reorder kecil. Kalau ternyata maunya Tangga ikut masuk
   Ringkasan (supaya area "selalu tampil" lebih ringkas), tinggal bilang —
   perubahannya kecil (pindah 1 blok + tambah 1 id ke daftar grup Ringkasan
   di `applySectionTab()`).
3. Switcher Fitur↔Pinned Widget yang sudah ada **dipertahankan APA ADANYA**
   di dalam sub-tab Fitur (tidak dilebur jadi sub-tab baru) — opsi paling
   rendah risiko dari 2 opsi di §3 poin 3.

**Keputusan implementasi (beda dari draf rencana awal Fase 1 di atas, dgn
alasan):** draf awal menyebut "bungkus jadi 3 `<div id="dashHubTab-xxx">`".
Setelah dicek ulang, itu TIDAK dieksekusi persis begitu — SENGAJA TIDAK ada
`<div id="dashHubTab-xxx">` wrapper baru sama sekali. Alasan:
- Section yang perlu dikelompokkan TIDAK bersebelahan di DOM (Summary/
  Analytics ada SEBELUM search bar, Favorit tepat SEBELUM nav baru, tab
  switcher Fitur/Pinned tepat SESUDAHNYA, LifeOS/EIE jauh di bawah lagi) —
  membungkusnya jadi 3 wrapper div yang benar2 nempel ke nav butuh reorder
  DOM yang lebih besar dari yang tersirat di draf, & lebih berisiko ke test
  containment/urutan yang sudah ada (lihat §2 di atas).
- Sebagai gantinya, `DashboardHub.setSectionTab(tab)`/`applySectionTab(tab)`
  (2 method BARU di object `DashboardHub` yang sudah ada di
  `dashboard-hub.js`, pola sama persis dgn `setMainTab`/`applyMainTab` yang
  sudah ada) toggle class `u-dnone` LANGSUNG ke 8 id section yang SUDAH ADA
  (`dashHubSummaryGrid`, `dashHubAnalyticsRow`, `dashHubFavoritSection`,
  `dashHubMainTabsRow`, `dashHubMainGridCard`, `dashboardHubPinnedWrap`,
  `lifeOSWrap`, `eieWrap`) — 0 reorder, 0 wrapper baru, markup/id semua
  section itu sendiri TIDAK disentuh sama sekali.
- `dashHubMainGridCard`/`dashboardHubPinnedWrap` (switcher Fitur/Pinned)
  & `dashHubFavoritSection` (Favorit) punya visibility SENDIRI yang
  data-driven (tunduk ke `dashHubMainTab`, atau kosong-kalau-belum-ada-
  favorit) — `applySectionTab()` SENGAJA memanggil ulang
  `applyMainTab()`/`DashboardHubFavoritView.render()` di akhir supaya
  keputusan itu tetap dihormati saat sub-tab "Fitur" aktif lagi, bukan
  ketimpa jadi selalu-tampil oleh toggle generik.
- Konsekuensi: harness self-test generik `groups[]` yang sudah ada di
  `features-sheets-pwa-selftest.js` (dipakai `setLaporanTab`/`setKelolaTab`/
  `setPjkTab` dkk, cek `document.getElementById(g.paneId(tabName))`) TIDAK
  cocok dipakai di sini (butuh 1 pane id per tab, bukan beberapa id
  tersebar) — SENGAJA tidak ditambah entry baru ke situ. Sebagai gantinya,
  perilaku toggle dites lewat `tests/dashboard-hub-sectiontabs.test.js`
  (loadSource + document/localStorage tiruan, pola sama dgn
  `tests/dashboard-hub.test.js`) — cakupannya setara (tiap section
  dipastikan tampil/sembunyi yang benar per sub-tab + persist
  localStorage), cuma harnessnya beda.

**File yang diubah:**
1. `index.html` & `app_production.html` — tambah nav `.cn-tabs.dhb-subtabs`
   (3 tombol `.dhb-subtab`, id `dashHubSectionTabBtn-ringkasan/fitur/
   insight`, `data-action="DashboardHub.setSectionTab"`) tepat di antara
   `#dashHubFavoritSection` & `#dashHubMainTabsRow`. TIDAK ADA elemen lain
   yang dipindah/dihapus — restrukturisasi sekali lalu ditempel SAMA PERSIS
   ke kedua file (`diff` 0, dites `tests/dashboard-hub-sectiontabs.test.js`).
2. `styles.css` — tambah `.dhb-subtabs`/`.dhb-subtab`/`.dhb-subtab.active`,
   copy pola persis dari `.pjk-subtabs` dkk (class terpisah, cegah tabrakan
   `#page-dashboard-hub .cn-tab`).
3. `dashboard-hub.js` — tambah `DashboardHub.setSectionTab(tab)` &
   `DashboardHub.applySectionTab(tab)`, dipanggil dari `DashboardHub.render()`
   baris paling akhir (setelah `applyMainTab(...)` yang sudah ada). Pilihan
   diingat via `localStorage['dashHubSectionTab']` (default `'ringkasan'`),
   pola sama dgn `dashHubMainTab`.
4. `tests/dashboard-hub-sectiontabs.test.js` (BARU) — 14 test: struktur
   markup (posisi nav, 3 tombol & id/data-args-nya, Hero/Tangga/Quick
   Actions/Search tidak tersentuh, semua section masih ada di dalam
   `#page-dashboard-hub`, `index.html`=`app_production.html`), token CSS,
   & perilaku `setSectionTab`/`applySectionTab` (toggle per grup + interaksi
   dgn `dashHubMainTab` yang sudah ada + persist localStorage).

**Yang TIDAK diubah (sengaja, di luar scope Fase 1):**
- `dashboard-hub-registry.js`/`tests/dashboard-hub-registry.test.js` — tidak
  ada entry `target.page:'dashboard-hub'` yang butuh field `subtab` baru
  (semua entry ke halaman ini pakai `goTo`/`dashKey`, bukan konsep sub-tab);
  dicek via `grep "page: 'dashboard-hub'" dashboard-hub-registry.js`.
- Harness self-test generik `groups[]` di `features-sheets-pwa-selftest.js`
  — lihat alasan di atas (bentuk datanya tidak cocok, 1 section pane per
  tab).
- Interaksi `goTo` (klik hasil pencarian/Favorit yang menuju kartu di dalam
  Pinned Widget, mis. `advisorCard`) dgn `dashHubMainTab` **sudah punya gap
  sebelum sesi ini** (tidak otomatis switch `dashHubMainTab` ke `'pinned'`
  kalau target ada di situ) — Fase 1 ini TIDAK memperbesar gap itu (perilaku
  sama persis sebelum & sesudah), cuma menambahkan 1 lapis kondisi baru
  (`dashHubSectionTab` harus `'fitur'` juga) di atas gap yang sudah ada.
  Perbaikan gap ini (kalau memang mau dibereskan) lebih tepat jadi sesi
  terpisah krn menyentuh `dashHubNavigateToFeature()`/registry, bukan
  sekadar split tab.

**Diverifikasi:**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail** (baseline
  sebelum sesi ini: 1713 pass; +14 test baru dari
  `dashboard-hub-sectiontabs.test.js`, 0 regresi ke 1713 test lama).
- `node scripts/build.js kw85-dashboardhub-sectiontabs-fase1-1` → sukses,
  v376→v377, kedua bundle lolos `node --check` sintaks & lint-guard bawaan
  build (`u-dnone` permanen kosong / `escapeHtml` / chicken-egg Tesseract),
  `index.html` & `app_production.html` tetap identik setelah build,
  `FILE-MAP.md` diregenerasi otomatis (112 file, 1063 identifier global).
- Sanity-check manual (regex hitung tombol dalam `index.html`): 28 `.cn-tab`
  vs 3 `.lap-subtab` vs 3 `.kel-subtab` vs 2 `.pjk-subtab` vs **3
  `.dhb-subtab`** — dikonfirmasi tidak ada tabrakan class/selector.
- `npm run lint` (ESLint) & `npm install --save-dev esbuild` **TIDAK
  dijalankan sesi ini** — sandbox tanpa akses internet & tanpa `eslint`
  terpasang (sama seperti sesi-sesi split sebelumnya; build di atas
  otomatis fallback ke bundle TANPA minifikasi krn esbuild tidak ketemu,
  bundle tetap valid & aman, cuma lebih besar). **Tolong jalankan `npm
  install` (esbuild+eslint) → `npm run check` penuh, lalu smoke-test browser
  manual** (buka `?dev=1`, klik ketiga sub-tab baru di Beranda, pastikan
  Hero/Tangga/Quick Actions/Search tetap kelihatan tanpa klik apa-apa, grid
  Semua Fitur & Pinned Widget switcher masih jalan DI DALAM sub-tab Fitur,
  Favorit/Life OS/EIE masih render datanya, reload app balik ke sub-tab
  terakhir yang aktif) **sebelum merge/release** — belum dijalankan sesi
  ini, persis catatan yang sama di tiap split sebelumnya.

Fase 2 (opsional, generalisasi harness `groups[]` bawaan) SENGAJA dilewati
(lihat alasan "Yang TIDAK diubah" di atas, bukan kelupaan). Fase 4 (pecah
Pinned Widget jadi 2 sub-sub-tab) masih menunggu evaluasi setelah Fase 1 ini
dirasakan langsung, sesuai rencana awal.

## Catatan kerja — 2026-07-17 (bagian ke-6): eksekusi Fase 2 — verifikasi self-test/test generalisasi (split tab Dashboard Hub)

Konteks: lanjutan dari bagian ke-5. User minta lanjut ke Fase 2 sesuai
rencana bertahap di §4. Rencana awal Fase 2 (di §4) berisi 3 item: (a)
tambah entry ke harness `groups[]` di `features-sheets-pwa-selftest.js`,
(b) cek `dashboard-hub-registry.test.js`, (c) cek manual 5 file test yang
posisi/containment-sensitive. Ketiganya dikerjakan sebagai **verifikasi**,
BUKAN penulisan kode baru — hasilnya nihil perubahan kode, sesuai yang
sudah diantisipasi & diputuskan di catatan bagian ke-5 ("Fase 2 SENGAJA
dilewati").

**(a) Harness `groups[]` — dikonfirmasi ulang TIDAK cocok, keputusan
lama tetap berlaku:**
Dibaca `groups.forEach()` di `features-sheets-pwa-selftest.js`
(baris ~1697-1730): tiap entry hanya boleh punya **1 pane id per nama
tab** (`document.getElementById(g.paneId(tabName))`, singular). Sub-tab
Dashboard Hub tidak begitu — 1 sub-tab = beberapa id section tersebar
(mis. "Ringkasan" = `dashHubSummaryGrid` + `dashHubAnalyticsRow`,
"Fitur" = `dashHubFavoritSection` + `dashHubMainTabsRow` +
`dashHubMainGridCard`/`dashboardHubPinnedWrap`, "Insight" = `lifeOSWrap`
+ `eieWrap`). Menambah entry `dashboard-hub` ke `groups[]` apa adanya
akan salah assert (cuma cek 1 id, id lain kelewat) — harus ubah bentuk
harness (`paneId` jadi array) yang berisiko ke 4 entry lain yang sudah
ada (`carnotes`/`shop`/`pajak`/`keuangan` dkk), padahal 14 test di
`dashboard-hub-sectiontabs.test.js` (dibuat Fase 1) SUDAH mengecek hal
yang sama (visible/hidden per grup id + persist localStorage) dengan
harness khusus yang cocok bentuk datanya. Kesimpulan: **cakupan test
sudah setara, generalisasi harness lama ditutup sebagai keputusan sadar,
bukan item yang masih terutang.** (Catatan: `fn` sebagai method object
seperti `Xxx.yyy`, mis. `DashboardHub.setSectionTab`, sebenarnya SUDAH
didukung harness ini — ada preseden `BudgetTabs.switchTo` di entry yang
sudah ada. Yang jadi ganjalan murni bentuk `paneId` singular di atas,
bukan bentuk `fn`.)

**(b) `dashboard-hub-registry.test.js` — dikonfirmasi TIDAK perlu
diubah:**
`grep "page: 'dashboard-hub'" dashboard-hub-registry.js` → semua 6 entry
yang ditemukan pakai `target:{page:'dashboard-hub', goTo:'...'}` atau
`dashKey:'...'` (mis. `advisorCard`, `lifeBalanceCard`, `refleksiCard`,
`dashFiCard`, `dashAbsensiCard`) — TIDAK ADA satupun yang pakai field
`subtab`, jadi tidak ada yang perlu ditambah ke `KNOWN_SUBTABS`/
`SUBTAB_PANE_PREFIX`, konsisten dgn dugaan di rencana awal §4 Fase 2.
(Di luar scope Fase 2, sekadar dicatat sebagai temuan: entry `goTo` di
atas semuanya mengarah ke kartu yang sekarang ada DI DALAM sub-tab
"Fitur" atau "Insight" — ini gap navigasi `dashHubSectionTab` yang SUDAH
disebut di catatan bagian ke-5 sebagai "sudah ada sebelum sesi ini, TIDAK
diperbesar Fase 1", tetap di luar scope sesi ini juga, biar jadi sesi
terpisah kalau mau dibereskan.)

**(c) 5 file test posisi/containment-sensitive — dibaca satu-satu,
dikonfirmasi aman:**
`dashboard-hub-quickactions.test.js`, `dashboard-hub-pinned-widgets.test.js`,
`dashboard-hub-pinnedwidgets.test.js`, `dashboard-hub-default-landing.test.js`,
`dashboard-hub-advisor-lifebalance-migration.test.js` — semua pakai cek
posisi string (`html.indexOf('id="..."')` + perbandingan urutan index) atau
containment sederhana (index section A < index elemen B, artinya B ada "di
dalam" A), BUKAN struktur parent-child DOM yang kaku. Karena Fase 1 sengaja
TIDAK reorder DOM & TIDAK menambah wrapper baru (toggle `u-dnone` langsung
ke 8 id section existing), asumsi di kelima file test ini tetap valid tanpa
perlu diubah.

**Diverifikasi (bagian test & build dari Fase 3, dijalankan lebih awal
sebagai bagian verifikasi Fase 2 di atas):**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail** — sama persis
  dgn baseline akhir Fase 1 (tidak ada regresi, karena memang tidak ada
  perubahan kode di Fase 2 ini).
- `node scripts/build.js` sempat dijalankan sbg smoke-check tambahan →
  sukses, sintaks kedua bundle lolos `node --check`, `index.html`/
  `app_production.html` tetap identik satu sama lain. **Hasil build ini
  SENGAJA DIBUANG/di-revert** (versi kembali ke 377, bundle balik ke isi
  semula) karena tidak ada perubahan source yang perlu dibundel — menjaga
  filosofi "perubahan sekecil mungkin", bukan naikin nomor versi tanpa
  alasan fungsional.
- `npm run lint` (ESLint) **TIDAK dijalankan** — sandbox sesi ini tanpa
  akses internet & tanpa `node_modules`/`eslint` terpasang (`npm install`
  butuh network yang tidak tersedia di sandbox ini), sama seperti
  keterbatasan yang dicatat di sesi-sesi split sebelumnya.
- Smoke-test browser manual (buka app dari awal, klik 3 sub-tab baru,
  pastikan Hero/Quick Actions/Search & switcher Fitur/Pinned & Favorit/Life
  OS/EIE semua masih jalan, reload balik ke sub-tab terakhir) **BELUM
  dijalankan** — perlu lingkungan browser sungguhan, di luar kapasitas
  sandbox ini. **WAJIB dilakukan manual sebelum merge/release**, sama
  seperti catatan yang berulang di sesi-sesi sebelumnya.

**File yang diubah sesi ini:** hanya `docs/CLAUDE.md` (dokumentasi status
Fase 2 di atas). **Tidak ada file source/test/bundle lain yang berubah.**

**Sisa pekerjaan sebelum rilis (bukan lagi bagian Fase 1/2, ini murni Fase
3 poin verifikasi manual yang minta akses di luar sandbox):**
1. `npm install` (sekali, butuh internet) lalu `npm run lint` — cek ESLint
   belum pernah jalan utk perubahan split tab ini sama sekali.
2. Smoke-test browser manual (lihat daftar di atas).
3. Setelah 1 & 2 hijau, baru `npm run build` / `npm run release` beneran
   (bukan run-lalu-buang seperti verifikasi sesi ini) utk naikin versi &
   bikin bundle rilis yang sesungguhnya.

## Catatan kerja — 2026-07-17 (bagian ke-7): eksekusi Fase 3 — sejauh mana bisa diverifikasi dari sandbox tanpa akses CLI/git/browser

Konteks: user minta lanjut eksekusi Fase 3 (3 poin di atas) dari sesi
sebelumnya. Sandbox sesi ini (chat, bukan Claude Code) punya batasan lebih
ketat dari sandbox split-tab sebelumnya: **tanpa akses jaringan sama sekali**
(bukan cuma "tanpa `node_modules` terpasang") dan **tanpa `.git`** (zip
diekstrak langsung, bukan clone). Jadi dari 3 poin Fase 3, cuma sebagian
yang benar-benar bisa dikerjakan di sini:

**1. `npm install` + `npm run lint` — TIDAK BISA dijalankan di sandbox ini.**
`npm install` gagal keras (`403 Forbidden` ke `registry.npmjs.org`) karena
jaringan dimatikan total di sandbox chat ini — beda dgn sandbox sesi
sebelumnya yg setidaknya bisa akses internet tapi belum sempat install.
ESLint tetap 0% tercoverage utk seluruh perubahan split tab Dashboard Hub
(Fase 1) sejak awal. **Ini WAJIB dijalankan oleh user sendiri di mesin dgn
akses internet** sebelum rilis — bukan sekadar item verifikasi opsional.

**2. Smoke-test browser manual — TIDAK BISA dijalankan langsung oleh
Claude (tidak ada browser sungguhan di sandbox ini), tapi disiapkan agar
user bisa jalankan sendiri dgn 1 klik:**
Menjalankan ulang `node scripts/build-preview.js` dari source APA ADANYA
(tanpa perubahan kode apa pun, versi tetap 377 — TIDAK di-build-release
krn poin 1 & 2 belum hijau, konsisten dgn aturan "Setelah 1 & 2 hijau, baru
build/release beneran" di atas) → menghasilkan `keluarga-w-preview.html`
baru (1 file HTML self-contained, semua JS inline) yg BISA dibuka langsung
oleh user sbg preview/artifact utk menjalankan sendiri checklist smoke-test
manual yg sudah dicatat di bagian ke-5/ke-6 (buka `?dev=1`, klik 3 sub-tab
baru di Beranda, pastikan Hero/Tangga/Quick Actions/Search tetap kelihatan,
grid Semua Fitur & Pinned Widget switcher jalan DI DALAM sub-tab Fitur,
Favorit/Life OS/EIE render datanya, reload balik ke sub-tab terakhir aktif).

**3. `npm run build` / `npm run release` beneran — SENGAJA BELUM
dijalankan.** Sempat dicoba `node scripts/build.js` sbg smoke-check
tambahan (bukan rilis resmi) di sandbox terpisah sebelum sesi dokumentasi
ini: sukses, sintaks kedua bundle lolos `node --check`, tidak ada regresi.
**Hasil itu SENGAJA DIBUANG/tidak dipakai** (sama sikapnya dgn bagian
ke-6) krn versi bakal naik (377→378) tanpa perubahan source fungsional,
dan yg lebih penting: poin 1 (lint) & 2 (smoke-test browser nyata oleh
manusia) belum hijau, jadi ini belum layak jadi rilis resmi sesuai aturan
sendiri di §"Cara resmi bikin zip rilis". `scripts/release.sh` juga tidak
bisa dijalankan sama sekali di sini krn butuh repo `.git` (zip ini hasil
ekstrak, bukan clone) — persis skenario "Upload dari HP (tanpa CLI)" yg
sudah ada prosedurnya di atas: lewat PR + CI, bukan `npm run release`.

**Diverifikasi ulang sesi ini (tanpa perubahan source):**
- `node --test tests/*.test.js` → **1727/1727 pass, 0 fail**, sama persis
  dgn baseline akhir Fase 1/2 — dikonfirmasi lagi dari salinan zip yg akan
  dipaketkan ke user, bukan cuma dari salinan kerja sebelumnya.

**File yang diubah/ditambah sesi ini:** `docs/CLAUDE.md` (catatan ini) dan
`keluarga-w-preview.html` (regenerasi murni dari source v377 yg tidak
berubah — bukan hasil build baru, bukan bundle rilis). **Tidak ada file
source/test/bundle lain yang berubah; `APP_BUILD_VERSION` tetap 377.**

**Sisa pekerjaan sebelum rilis (tidak berkurang dari daftar bagian ke-6,
krn Fase 3 belum bisa dituntaskan dari sandbox ini):**
1. User jalankan `npm install` lalu `npm run lint` di mesin sendiri (perlu
   internet) — cek ESLint pertama kali utk seluruh perubahan split tab.
2. User buka `keluarga-w-preview.html` (hasil sesi ini) di browser
   sungguhan & jalankan checklist smoke-test manual di atas.
3. Setelah 1 & 2 hijau: kalau punya akses CLI/git ke repo asli, jalankan
   `npm run release` (bukan dari hasil ekstrak zip ini). Kalau upload
   lewat HP tanpa CLI, ikuti prosedur "Upload dari HP" di atas (branch +
   PR + tunggu CI hijau), JANGAN commit langsung ke `main`.

## Catatan kerja — 2026-07-17 (bagian ke-8): eksekusi Fase 3 lanjutan — esbuild berhasil dipasang offline, build produksi v378 (minified) selesai

Konteks: lanjutan langsung dari bagian ke-7 di sesi yang sama. Setelah
dicek ulang lebih teliti, ternyata paket `esbuild` (v0.27.7, lewat
dependency tool lain yang sudah ter-cache di sandbox chat ini — bukan dari
`registry.npmjs.org`, jadi TIDAK melanggar batasan "tanpa jaringan") bisa
disalin manual ke `node_modules/esbuild` + `node_modules/@esbuild/linux-x64`
di proyek ini, dan `require('esbuild')` di `build.js` berhasil jalan
(`build.js` cuma `require()` polos, tidak mengecek versi lewat npm). Ini
mengubah status poin 3 dari catatan bagian ke-7.

**Yang berubah dari kesimpulan bagian ke-7:**
- `REQUIRE_MINIFY=1 node scripts/build.js kw86-fase3-minified-build` →
  **sukses, bundle BENERAN diminify** (`app-bundle-a.min.js` 646.8 KB,
  `app-bundle-b.min.js` 615.0 KB — jauh lebih kecil dari versi tanpa
  minifikasi di bagian ke-7), bukan fallback lagi. Semua lint-guard bawaan
  build (`u-dnone`, `escapeHtml`, chicken-egg Tesseract) lolos. Sintaks
  kedua bundle lolos `node --check`. `index.html`/`app_production.html`
  identik & konsisten di versi baru. Versi naik **377 → 378**.
- `node --test tests/*.test.js` dijalankan ulang sesudah build →
  **1727/1727 pass, 0 fail** (tes jalan terhadap file sumber, bukan
  bundle, jadi ini murni re-konfirmasi tidak ada regresi source, bukan
  bukti bundle hasil minify jalan benar di browser — itu tetap PR poin 2
  di bawah).
- `keluarga-w-preview.html` diregenerasi ulang dari `index.html` v378
  (bundle minified) via `node scripts/build-preview.js`.

**Yang TETAP TIDAK BISA dari sandbox ini (tidak berubah dari bagian
ke-7):**
- **ESLint** — dicari ke seluruh filesystem sandbox (bukan cuma
  `npm install`), termasuk cache tool lain & pip — **tidak ditemukan
  sama sekali**, beda dgn esbuild yg kebetulan ter-cache lewat tool lain.
  `npm run lint`/poin 1 Fase 3 **masih 100% belum pernah dijalankan**
  utk perubahan split tab ini. Ini bukan soal usaha lebih, paketnya
  memang tidak ada di sandbox ini dan tidak bisa diunduh (network mati).
- **Smoke-test browser manual oleh manusia** — bundle sekarang sudah
  hasil minify sungguhan (bukan fallback), jadi makin penting dicek nyata
  di browser (kode minified kadang punya kegagalan yang tidak kelihatan
  di `node --check`, mis. isu scope/closure yang cuma muncul saat runtime
  sungguhan). **Belum dijalankan**, tetap wajib sebelum rilis.
- `node_modules/esbuild` yang disalin manual sesi ini **TIDAK ikut
  dipaketkan ke zip** (bukan bagian source, cuma tooling build sesi ini;
  di repo asli ini normal `devDependency`/`optionalDependency`, dipasang
  user sendiri via `npm install`).

**File yang berubah sesi ini (bagian ke-8):** `docs/CLAUDE.md` (catatan
ini), plus hasil build resmi: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
`index.html`, `app_production.html`, `sw.js`, `FILE-MAP.md`,
`keluarga-w-preview.html`, dan 6 file source konstanta versi (lihat log
build di atas). `backups/` bertambah 2 file (backup otomatis bundle versi
377 sebelum ditimpa). **Tidak ada perubahan LOGIKA/fitur** — murni
build+minify dari source yang sama persis dgn akhir Fase 1/2.

**Sisa pekerjaan sebelum rilis (mengerucut dari bagian ke-7, sekarang
tinggal 2 poin manusia, bukan lagi 3):**
1. `npm run lint` di mesin dgn internet — satu-satunya bagian Fase 3 yang
   benar-benar tidak bisa disentuh dari sandbox chat manapun sejauh ini.
2. Buka `keluarga-w-preview.html` (v378, bundle minified beneran) di
   browser sungguhan, jalankan checklist smoke-test manual (lihat daftar
   di bagian ke-5/ke-6/ke-7 di atas) — makin penting krn sekarang bundle
   sudah diminify sungguhan.
3. Setelah 1 & 2 hijau: commit hasil build v378 ini (atau jalankan
   `npm run release` ulang dari repo git asli kalau mau versi yg
   ter-generate otomatis lagi) lalu push/PR sesuai prosedur di atas.

## Catatan kerja — 2026-07-17 (bagian ke-9): fix bug `scripts/build-preview.js` — CSS tidak ikut ter-inline, preview tampil tanpa styling

Konteks: user kirim screenshot `keluarga-w-preview.html` yang dibuka di
mobile — tampil sbg teks polos tanpa styling sama sekali (semua elemen
numpuk vertikal, tidak ada card/tombol/warna). Root cause: **bug lama di
`scripts/build-preview.js`** yang baru ketahuan sekarang — script itu cuma
inline 4 file JS (`INLINE_FILES`), TAPI TIDAK inline `styles.css` &
`modern-ui-layer.css` yang tetap dilink eksternal via
`<link rel="stylesheet" href="styles.css?v=NNN">`. Saat file HTML hasil
build-preview dibuka sbg file standalone (mis. artifact/attachment, bukan
diserver dari folder proyek yg ada `styles.css` di sebelahnya), browser
tidak bisa fetch CSS itu (tidak ada base path relatif yang valid) →
HTML render tanpa styling sama sekali. **Ini bug di tooling preview, bukan
bug di app** (source `styles.css`/app itu sendiri tidak berubah & tidak
salah).

**Perbaikan:** `scripts/build-preview.js` diubah — sekarang juga inline
`styles.css` & `modern-ui-layer.css` sbg `<style>...</style>` (persis pola
yg sudah ada utk JS, cari `<link rel="stylesheet" href="FILE?v=NNN">` lalu
ganti). Preview diregenerasi ulang: `keluarga-w-preview.html` sekarang
berisi 6 file ter-inline (2 CSS + 4 JS), bukan 4.

**Diverifikasi:** `node scripts/build-preview.js` sukses, file output
punya 2 tag `<style>` (sebelumnya 0). **Belum diverifikasi visual di
browser sungguhan** oleh siapa pun (termasuk oleh Claude — tidak ada
browser di sandbox ini) — user perlu konfirmasi tampilan sudah benar
setelah membuka ulang file preview yang baru.

**File yang berubah sesi ini (bagian ke-9):** `scripts/build-preview.js`
(source, bugfix), `keluarga-w-preview.html` (regenerasi). **Tidak ada
perubahan pada app sesungguhnya** (`styles.css`, source JS, bundle semua
tidak disentuh) — murni perbaikan tooling preview.

## Catatan kerja — 2026-07-17 (bagian ke-10): fix bug nyata — onboarding macet total di context tanpa `crypto.subtle` (preview/iframe sandbox)

Konteks: user lapor sudah isi 4 digit PIN & klik "Mulai Sekarang" di
preview, tapi TIDAK masuk ke dashboard (macet di layar onboarding, tidak
ada pesan error apa pun).

**Root cause (dikonfirmasi, BUKAN dugaan):** `hashPin()` di
`keamanan-pin.js` 100% bergantung ke `crypto.subtle.digest()` TANPA
fallback & TANPA try/catch. `crypto.subtle` cuma tersedia di "secure
context" (HTTPS/localhost, ATAU iframe dgn origin yg "potentially
trustworthy"). Iframe sandbox tanpa atribut `allow-same-origin` (pola
umum utk iframe preview/artifact viewer demi isolasi keamanan) punya
origin "opaque" yang TIDAK dianggap secure context oleh spesifikasi
browser → `crypto.subtle` = `undefined` di situ → `crypto.subtle.digest`
throw `TypeError` → promise di `finishOnboard()` (async, tanpa try/catch)
reject diam-diam → baris `document.getElementById('onboard').style.
display='none'; showMain();` tidak pernah jalan → user macet total tanpa
tahu kenapa. `checkPin()` (layar masukkan PIN sesudah PIN dibuat) punya
bug akar yang sama krn juga manggil `hashPin()`.

**Perbaikan (2 lapis, sesuai prinsip "perubahan sekecil mungkin"):**
1. **`hashPin()` sekarang punya fallback SHA-256 murni JavaScript**
   (`_sha256Fallback`, fungsi baru) yang dipakai HANYA kalau
   `crypto.subtle`/`crypto.subtle.digest` tidak ada atau throw. Diverifikasi
   cocok 100% dgn `crypto.subtle`/Node `crypto.createHash('sha256')` lewat
   2 cara: (a) unit test manual thd 9 input dgn berbagai panjang termasuk
   kasus tepi padding SHA-256 (55/56/57/63/64/1000 byte) — semua match;
   (b) simulasi langsung context `crypto.subtle===undefined` → hash yg
   dihasilkan fallback dibandingkan hash dari `crypto.subtle` asli utk
   input yg sama (`kwPinSalt_v1:1234`) → **identik**. Jadi PIN yang dibuat
   lewat fallback (context tanpa `crypto.subtle`) tetap valid & konsisten
   kalau nanti dicek lagi di context YANG PUNYA `crypto.subtle` (atau
   sebaliknya) — bukan 2 skema hash yang beda.
2. **`finishOnboard()` sekarang dibungkus try/catch** dgn pesan error
   yang jelas ke user (`showAlertModal`) kalau ada kegagalan APA PUN saat
   setup awal (bukan cuma soal `crypto.subtle` — jaring pengaman umum
   biar tidak ada lagi kegagalan diam-diam tanpa pesan di alur ini).

**Diverifikasi:**
- `node --test tests/keamanan-pin.test.js tests/onboarding.test.js` →
  pass (20 test, termasuk test `finishOnboard` yang sudah ada
  sebelumnya — Node punya `crypto.subtle` bawaan jadi test ini lewat
  jalur utama, bukan fallback; fallback diverifikasi terpisah lewat
  simulasi manual di atas, BUKAN lewat suite test resmi — lihat "Sisa
  pekerjaan" di bawah).
- `node --test tests/*.test.js` penuh → **1727/1727 pass, 0 fail**, tidak
  ada regresi.
- `REQUIRE_MINIFY=1 node scripts/build.js kw87-fix-hashpin-fallback-crypto-subtle`
  → sukses, v378→**v379**, minified beneran (bundle a 646.9 KB, b 617.2 KB),
  semua lint-guard & cek sintaks lolos.
- `keluarga-w-preview.html` diregenerasi dari v379 (sudah termasuk CSS
  ter-inline dari fix bagian ke-9 + fix `hashPin` ini) — dikonfirmasi
  `_sha256Fallback` ikut ter-bundle di `app-bundle-b.min.js` & preview.
- **Belum diverifikasi visual di browser/preview sungguhan oleh siapa
  pun** (termasuk saya — tidak ada browser nyata di sandbox chat ini).
  User perlu konfirmasi onboarding sekarang bisa lanjut ke dashboard
  setelah buka preview yang baru.

**Batasan yang jujur diakui:** fallback ini HANYA menutup celah
`hashPin()` (dipakai onboarding + cek PIN + ganti PIN). Fungsi lain yang
juga pakai `crypto.subtle` (`encryptApiKeyWithPin`/`decryptApiKeyWithPin`,
fitur enkripsi API key AI opsional) BELUM dikasih fallback serupa —
`decryptApiKeyWithPin` sudah ada try/catch dari sebelumnya (gagal dgn
sopan, return `null`), tapi `encryptApiKeyWithPin` belum, dan kalau
`crypto.subtle` memang tidak ada, fitur simpan API key terenkripsi itu
tidak akan berfungsi di context tsb (di luar scope laporan bug user kali
ini yang spesifik soal onboarding/PIN, jadi sengaja tidak disentuh sesi
ini — kalau perlu, ini kandidat sesi terpisah).

**File yang berubah sesi ini (bagian ke-10):** `keamanan-pin.js` (fungsi
baru `_sha256Fallback`, `hashPin` diubah pakai fallback), `onboarding.js`
(`finishOnboard` dibungkus try/catch), `docs/CLAUDE.md` (catatan ini), plus
hasil build resmi v379: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
`index.html`, `app_production.html`, `sw.js`, `FILE-MAP.md`,
`keluarga-w-preview.html`, dan 6 file source konstanta versi.

**Sisa pekerjaan:**
1. User konfirmasi visual: buka `keluarga-w-preview.html` yang baru, isi
   PIN, klik "Mulai Sekarang" — harus langsung masuk dashboard sekarang.
2. Kandidat test baru yang belum ditulis sesi ini (opsional, tidak
   memblokir fix): unit test `hashPin()` yang secara eksplisit mock
   `crypto.subtle` jadi `undefined`/throw utk memastikan jalur fallback
   ter-cover permanen di suite resmi, bukan cuma diverifikasi manual
   sekali di sesi ini.
3. `npm run lint` & smoke-test browser manual — masih item yang sama dari
   bagian ke-7/ke-8, belum berkurang.

## Catatan kerja — 2026-07-17 (bagian ke-11): audit menyeluruh + fix bug null-guard di fitur "Laporan" (Shop/Cobek) + daftar saran

Konteks: diminta test seluruh fitur aplikasi secara nyata (bukan cuma baca
kode). Sandbox chat ini TIDAK punya browser/koneksi internet, jadi
verifikasi dilakukan via: `node --test tests/*.test.js` penuh (1727/1727
pass), `node --check` di semua 222 file `.js` (0 syntax error), replikasi
statis logika `smoke-test.js` (cross-check tiap `data-action="Modul.method"`
& `getElementById("id")` di `index.html` terhadap AST asli
`app-bundle-a.min.js`/`app-bundle-b.min.js`, pakai `acorn` — bukan regex
tebak-tebakan) memakai `acorn` yang kebetulan sudah ter-install sbg
dependency `ts-node` di sandbox.

**Bug yang ditemukan & diperbaiki:** `Laporan.setPeriodeLap()` &
`Laporan.getRangeLap()` di `cobek-order.js` (fitur "📊 Laporan" dalam modul
Shop/Cobek) memanggil `document.getElementById('lapCustomRange')`,
`('lapFrom')`, `('lapTo')` lalu langsung akses `.classList`/`.value` TANPA
null-check — beda dari pola aman (`el&&...`/`if(!el)return`) yang konsisten
dipakai di fungsi-fungsi lain persis di sebelahnya (`renderTab()`,
`renderTopProduk()`, dst). Root cause kenapa baru ketahuan sekarang: tombol
tab "laporan" itu sendiri **tidak pernah dipasang** di `index.html` (hanya
`etalase` & `riwayat` yang wired ke `setShopTab()`) — jadi kode ini selama
ini tidak reachable dari UI produksi manapun, makanya lolos dari testing
manual biasa. Ditambahkan null-guard di 3 lokasi kode yang sama
(`cobek-order.js` sumber, `app-bundle-a.min.js`, `keluarga-w-preview.html`)
memakai optional chaining (`?.`) — perlu 1 iterasi perbaikan krn percobaan
pertama sempat taruh `const` di tengah comma-expression hasil minify
(invalid syntax), ketahuan langsung dari `node --check` & diperbaiki.

**Diverifikasi:** `node --test tests/*.test.js` → 1727/1727 pass, 0
regresi. `node --check` di ketiga file yang diubah → 0 syntax error. Diff
`keluarga-w-preview.html` vs versi sebelum sesi ini → cuma 1 baris berubah
(fix ini), tidak ada perubahan tak sengaja lain.

**File yang berubah sesi ini (bagian ke-11):** `cobek-order.js`,
`app-bundle-a.min.js`, `keluarga-w-preview.html`. **Tidak menjalankan**
`npm run build`/`node scripts/build.js` (lihat kandidat masalah #3 di
bawah — build sempat gagal krn format `APP_BUILD_VERSION` saat ini tidak
diakhiri `-angka`), jadi bundle & preview dipatch manual langsung
(bukan lewat build step resmi) — **berisiko drift** dari source kalau ada
build ulang berikutnya yg tidak sengaja menimpa balik tanpa fix ini
ter-carry; sebaiknya diverifikasi ulang setelah `build.js` bisa jalan
normal lagi (lihat #3).

**Daftar saran (belum dikerjakan sesi ini, murni catatan untuk sesi
berikutnya):**
1. **Selesaikan atau buang fitur "Laporan" di Shop/Cobek.** Logikanya
   (`setPeriodeLap`, `renderTab`, agregasi top produk/pelanggan) sudah
   lengkap, tinggal kurang tombol tab + markup chip periode + div
   `lapCustomRange`/`lapFrom`/`lapTo`/`lapTrip`/`lapOmzet`/`lapUntung`/
   `lapMargin`/`lapTopProduk`/`lapTopPelanggan` di HTML. Atau hapus kalau
   memang tidak jadi dipakai, supaya tidak nambah bundle size & maintenance
   percuma utk kode yang tidak reachable.
2. **Satukan sumber kebenaran kode.** Fix di atas harus ditempel manual ke
   3 file (source + 2 salinan hasil build/preview) krn `npm run build`
   gagal jalan (lihat #3). Kalau build rutin bisa jalan, edit cukup di
   source lalu build ulang — resiko drift antar file hilang.
3. **Perbaiki `node scripts/build.js` supaya bisa jalan tanpa argumen
   manual.** `APP_BUILD_VERSION` saat ini
   (`"kw87-fix-hashpin-fallback-crypto-subtle"`) tidak diakhiri `-angka`,
   jadi `computeNextVersion()` throw & `npm run check`/`npm run build`
   tidak bisa dipakai sbg satu perintah mulus tanpa argumen tambahan.
4. **Tambah smoke test DOM otomatis di CI, bukan cuma manual `?dev=1`.**
   1727 unit test yang ada semuanya test logika murni — tidak ada yang
   menangkap kasus "elemen dipanggil `getElementById` tapi id-nya tidak
   pernah ada di HTML" (persis bug di atas). `smoke-test.js` yang sudah ada
   mengecek pola ini tapi cuma jalan manual di browser dev mode. Kalau
   logikanya dipindah ke test Node (parser statis mirip yang dipakai utk
   audit sesi ini, atau Playwright kalau nanti tersedia), kelas bug ini bisa
   ketahuan otomatis sebelum rilis, bukan nunggu laporan user.
5. **Ukuran bundle cukup besar utk PWA.** `app-bundle-a.min.js` (~648KB) +
   `app-bundle-b.min.js` (~620KB) + `index.html` (~216KB) ≈1.5MB sebelum
   kompresi; `keluarga-w-preview.html` standalone sampai ~1.6MB satu file.
   Worth dicek: lazy-load modul yang jarang dipakai, & pastikan server
   production pakai gzip/brotli.

## Catatan kerja — 2026-07-17 (bagian ke-12): kerjakan saran #3 (paling ringan) — `build.js` sekarang jalan tanpa argumen manual

Konteks: lanjutan daftar saran bagian ke-11. Dikerjakan yang paling ringan
dulu (saran #3), bukan #1 (butuh keputusan produk: selesaikan atau buang
fitur Laporan) atau #4/#5 (butuh kerja lebih besar).

**Akar masalah:** `APP_BUILD_VERSION` sempat ditulis manual jadi
`'kw87-fix-hashpin-fallback-crypto-subtle'` (bagian ke-10) — tidak diakhiri
`-angka`, jadi `computeNextVersion()` di `scripts/build.js` selalu `throw`
kalau dipanggil tanpa argumen versi eksplisit. Direproduksi dulu: `node
scripts/build.js` (tanpa argumen) → error persis seperti dugaan di saran #3.

**Perbaikan:** jalankan build dengan versi eksplisit yang mengakhiri format
lama dengan `-angka` (`kw87-fix-hashpin-fallback-crypto-subtle-1`, lalu
`-2` krn percobaan pertama sempat berhenti di tengah oleh guard
`--require-minify`, bukan oleh bug versi — lihat "Batasan" di bawah). Ini
BUKAN keputusan produk, murni format string versi, jadi tidak perlu stop &
tanya (poin 5 di instruksi tugas default).

**Diverifikasi:**
- `node --test tests/*.test.js` → 1727/1727 pass, 0 fail, sebelum & sesudah.
- `node scripts/build.js kw87-fix-hashpin-fallback-crypto-subtle-2` →
  sukses penuh: versi disamakan di 6 file source, semua konstanta
  `*_VERSION` terverifikasi sinkron, `app-bundle-a.min.js`/`b.min.js`
  ditulis, `index.html`/`app_production.html` (`?v=380`) &
  `sw.js` (`kw-cache-v380`) ter-update, `docs/FILE-MAP.md` diregenerasi
  (112 file, 1064 identifier global), `node --check` lolos di kedua bundle.
- `node scripts/build-preview.js` dijalankan ulang supaya
  `keluarga-w-preview.html` ikut konsisten ke v380 (6 file ter-inline:
  `styles.css`, `modern-ui-layer.css`, kedua bundle, `smoke-test.js`,
  `tangga-keuangan.js`).
- Dicek tidak ada sisa string versi lama (`kw87-fix-hashpin-fallback-crypto-subtle` tanpa akhiran) di file `.js`/`.html` manapun di luar `backups/`.

**Batasan yang jujur diakui:** sandbox sesi ini TIDAK punya akses jaringan
sama sekali (beda dari bagian ke-8 yang sempat berhasil pasang `esbuild`
offline) — `npm install` gagal 403 di semua paket, `eslint` & `esbuild`
TIDAK terpasang. Konsekuensinya:
- `npm run lint` tidak bisa dijalankan/diverifikasi sesi ini.
- Bundle hasil build (v380) **TIDAK diminify** — fallback otomatis
  `build.js` (aman utk dev, lihat catatan esbuild di atas), ukurannya
  lebih besar dari v379 (798.6 KB + 900.2 KB vs 646.9 KB + 617.2 KB
  sebelumnya). **Sebelum dipakai sbg rilis produksi**, sebaiknya build
  ulang di environment yang punya akses `npm install --save-dev esbuild`
  supaya kembali minified — jangan asumsikan v380 di paket ini sudah final
  rilis.
- Sama seperti sesi-sesi sebelumnya: tidak ada browser nyata di sandbox
  ini, jadi verifikasi visual `keluarga-w-preview.html` v380 belum
  dilakukan siapa pun.

**File yang berubah sesi ini (bagian ke-12):** versi dibump ke `-2` di 6
file source (`features-helpers-global-security.js`, `modules-render.js`,
`modals.js`, `modules-calc.js`,
`features-budget-laporan-carnotes-pelanggan.js`,
`features-aiwidget-reminder-gdrive-search.js`), plus hasil build otomatis:
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
`keluarga-w-preview.html`, `docs/CLAUDE.md` (catatan ini). Saran #1
("Laporan" Shop/Cobek), #4 (smoke test DOM otomatis di CI), #5 (ukuran
bundle) dari bagian ke-11 BELUM dikerjakan — sengaja disisakan utk sesi
berikutnya sesuai urutan "paling ringan dulu".

## Catatan kerja — 2026-07-17 (bagian ke-13): dicoba saran #4 (smoke test DOM otomatis di CI) — DIHENTIKAN, ternyata tidak "ringan" di sandbox ini

Konteks: lanjut ke saran #4 dari daftar bagian ke-11 (setelah #3 selesai di
bagian ke-12). Sebelum menulis test sungguhan, dicoba dulu prototipe di luar
repo (`/tmp`, TIDAK menyentuh file apa pun di `tests/`) utk mengukur seberapa
layak — hasilnya: **tidak layak dikerjakan dengan aman di sandbox ini,
dihentikan sebelum ada perubahan ke repo.**

**Yang dicoba:** port logika `smoke-test.js` (extract `getElementById()` &
`data-action="Modul.method"` via regex, lalu cross-check) ke Node/`node:vm`,
mengikuti saran persis di catatan bagian ke-11 ("parser statis mirip yang
dipakai utk audit sesi ini"). Untuk cek `data-action`, berhasil: memuat
`app-bundle-a.min.js` + `app-bundle-b.min.js` + `tangga-keuangan.js` (persis
urutan yg dimuat `index.html`) ke 1 sandbox `vm` bersama pakai stub permisif
dari `tests/helpers/loadSource.js` — semua 79 `data-action` yang ditemukan
resolve ke fungsi asli tanpa false positive (0 `actionMissing`).

**Kenapa dihentikan — bagian `getElementById()` menghasilkan ~660 false
positive:** banyak modal (mis. `txModal`, `productModal`, dst) disimpan
sbg array string HTML (`MODAL_HTML` di `modals.js`) yang baru di-inject ke
DOM sungguhan saat runtime (`innerHTML=...`), BUKAN literal `id="..."` yang
langsung kebaca teks polos — di source/bundle, tanda kutip di dalam string
itu ter-escape (`\"`), jadi regex `id=(['"])...` yang sama persis dgn yang
dipakai `smoke-test.js` TIDAK match. Di browser sungguhan ini bukan masalah
karena `smoke-test.js` cek `document.getElementById()` di DOM HIDUP
(setelah modal ter-render), bukan cuma teks statis — static-text check di
situ cuma fallback sekunder utk elemen lazy-render. Tanpa jsdom (perlu
render modal ke DOM beneran) atau acorn/AST (perlu install, butuh
internet), replikasi statis di Node menghasilkan ratusan ID yang SEBENARNYA
valid tapi dilaporkan "hilang" — persis kelas false-positive yang analisis
`data-action` versi lama (lihat komentar di `smoke-test.js`) sudah pernah
diperingatkan bisa terjadi kalau tidak hati-hati.

**Kenapa tidak dipaksa lanjut:** menambah test dgn false-positive rate
setinggi itu ke `npm test`/CI akan membuatnya PERMANEN merah utk kode yang
sebenarnya benar — bertentangan dgn tujuan sendiri (CI harus jadi sinyal
yang bisa dipercaya, bukan nambah noise). Sandbox sesi ini juga tidak ada
akses internet (`npm install` 403 di semua paket — lihat bagian ke-12),
jadi tidak bisa pasang `acorn` (dipakai audit manual bagian ke-11) atau
`jsdom` utk perbaiki ini dengan benar sekarang.

**Yang dibutuhkan utk mengerjakan saran #4 dgn benar (kandidat sesi
berikutnya, idealnya di environment dgn akses internet):**
1. `npm install --save-dev jsdom` lalu render `MODAL_HTML`/markup dinamis
   lain ke DOM beneran sebelum cek `getElementById()`, ATAU
2. Cari SEMUA tempat markup modal/dinamis di-generate (bukan cuma
   `MODAL_HTML` di `modals.js` — perlu disurvei, mungkin ada pola serupa di
   file lain) & tulis ekstraksi id yang sadar akan escaping tsb, ATAU
3. Cakupan lebih sempit: HANYA cek `data-action` (bagian yang TERBUKTI 0
   false-positive di percobaan ini) dulu sbg test terpisah, tunda bagian
   `getElementById()` sampai ada solusi utk masalah escaping di atas.

**File yang berubah sesi ini:** HANYA `docs/CLAUDE.md` (catatan ini). Tidak
ada file lain yang disentuh — semua eksperimen dilakukan di `/tmp`, tidak
ada test baru yang masuk ke `tests/`. `npm test` masih 1727/1727 pass persis
seperti sebelum sesi ini (tidak ada regresi, tidak ada penambahan).




## Catatan kerja — 2026-07-17 (bagian ke-14): kerjakan saran "(BERAT)" yang berulang sejak bagian ke-16 — cakupan test `keamanan-pin.js` lockout PIN + layar PIN interaktif, akhirnya ke 100%

Konteks: dari 2 jalur saran yang masih terbuka (daftar bagian ke-11: fitur
Laporan/build-source-of-truth/smoke-test-DOM/bundle-size, VS daftar
`keamanan-pin.js` yang berulang ditandai **(BERAT)** di hampir setiap
catatan sejak bagian ke-16 sampai ke-25), dipilih yang paling berat &
paling lama mengendap: **lanjutkan cakupan `keamanan-pin.js` ke 100%** —
bagian lockout percobaan PIN salah (`_pinLockState`/`_pinLockRemainingMs`/
`_formatLockDuration`/`updatePinLockUI`) & layar PIN interaktif
(`showPinScreen`/`pinPress`/`pinBack`/`updatePinDots`/`checkPin`), yang
sebelumnya 100% NOL test (lihat komentar di kepala `tests/
keamanan-pin.test.js`: "SENGAJA belum dicakup ... disisakan utk sesi
lanjutan"). Alasan ini dianggap "paling berat" dibanding saran-saran
`bagian ke-11`: butuh infra baru (fake `Date.now()`/`setInterval` yang bisa
dimaju-mundurkan) yang belum pernah ada di `tests/helpers/` — bukan cuma
nulis test dgn pola yang sudah ada.

**Tidak ada bug ditemukan** — sesi ini murni menambah test yang sebelumnya
nol utk bagian lockout/interaktif `keamanan-pin.js`, tidak ada perubahan
kode aplikasi.

**Infra baru: `tests/helpers/fakeTimer.js`.** `Date.now()` +
`setInterval()`/`clearInterval()` palsu yang jamnya bisa dimaju-mundurkan
manual lewat `advance(ms)`/`set(ms)`, dan intervalnya TIDAK auto-fire
sendiri — harus dipicu eksplisit lewat `fireAll()`. Ini reusable utk file
lain yang butuh pola serupa nanti (bukan cuma `keamanan-pin.js`).

**File baru: `tests/keamanan-pin-lockout.test.js` (33 test).** Mengikuti
pola `makeCtx()` serupa `keamanan-pin.test.js` (localStorage in-memory
beneran, bukan stub permisif) + `createFakeDocument` (elemen `onboard`,
`pinScreen`, `pinScreenTitle`, `pinLockMsg`, `pinPad`, `pd0..pd3`) +
`fakeTimer` baru di atas. Mencakup: `_pinLockState` (default kosong, parse
int, fallback nilai rusak → 0 bukan NaN), `_pinLockRemainingMs` (0 kalau
tidak lock/sudah lewat, selisih persis kalau masih lock),
`_formatLockDuration` (format detik-saja vs menit+detik, pembulatan ceil),
`updatePinLockUI` (reset UI saat tidak lock, kunci keypad + pesan
countdown langsung tampil saat lock TANPA nunggu interval, auto-unlock
begitu waktu habis lewat interval, tidak menumpuk interval kalau dipanggil
dobel), `showPinScreen` (sembunyikan onboard, reset buffer, judul pakai
nama profil/fallback "W"), `pinPress`/`pinBack`/`updatePinDots` (diblokir
total saat lock, dot terisi persis sepanjang buffer, guard >4 digit,
genap 4 digit menjadwalkan `checkPin` via `setTimeout(...,120)` — DITANGKAP
bukan dijalankan otomatis, sama pola dgn `setTimeout` override di
`keamanan-pin.test.js`), dan `checkPin` (diblokir total saat lock tanpa
sempat cek hash sama sekali, PIN benar → sesi terisi & lock counter
direset, PIN salah di bawah batas → fails+1 & toast sisa percobaan, PIN
salah ke-5 → stage 1 lock 30 detik + fails direset + keypad ikut terlihat
terkunci lewat `updatePinLockUI` yang dipanggil di dalamnya, stage naik
mengikuti `PIN_LOCK_DURATIONS_SEC` [30,60,120,300,600] dan di-clamp ke
durasi terakhir kalau stage sudah lewat index terakhir — bukan
out-of-range/`undefined`). Ditutup 1 test end-to-end: 5x salah beruntun via
`pinPress` sampai lock → keypad kebuka otomatis begitu jam dimajukan lewat
durasi lock → PIN benar via `pinPress` normal lagi setelahnya.

**Catatan teknis — kenapa `assert.deepEqual` gagal utk `_pinLockState()`,
harus `JSON.stringify` (sama seperti dicatat di `aset.test.js`/
`onboarding.test.js`):** objek literal `{fails,until,stage}` yang dibuat
DI DALAM vm context (`_pinLockState()` jalan di realm sandbox) beda
prototype `Object` dari objek literal yang ditulis di test (realm host
Node biasa) — `assert.deepEqual`/`deepStrictEqual` menganggap beda
walau isinya identik. Dibandingkan via `JSON.stringify(...)` sama seperti
pola yang sudah didokumentasikan di sesi-sesi sebelumnya.

**Catatan teknis lain — `pinBuffer` diinject & dibaca langsung via
`ctx.pinBuffer`, TANPA trik `expose`:** sama pola dgn `curMonth` dkk di
`tx-list-cashflow.test.js` (bagian ke-26) — `pinBuffer` diassign langsung
tanpa `let`/`const` di `keamanan-pin.js` sendiri (dideklarasikan `let
pinBuffer=''` di `features-helpers-global-security.js`, file yang TIDAK
dimuat di test ini), jadi assignment `pinBuffer=k` di dalam vm sloppy-mode
otomatis jadi properti global yang bisa diinject/dibaca balik langsung
lewat `extraGlobals`/`ctx.pinBuffer`.

**Diverifikasi:**
- `node --test tests/keamanan-pin-lockout.test.js` → 33/33 pass sendirian.
- `node --test tests/*.test.js` penuh → **1788/1788 pass, 0 fail**, 0
  regresi (naik dari 1727 di bagian ke-13 — selisih lebih dari +33 murni
  krn sesi ke-13 tidak menambah test apa pun, jadi angka dasar sebelumnya
  memang sudah beda dari yg terakhir tercatat; intinya semua pass, tidak
  ada yang merah).
- `node --check tests/keamanan-pin-lockout.test.js` & `node --check tests/
  helpers/fakeTimer.js` → 0 syntax error.
- **Tidak menjalankan `node scripts/build.js`** — sesi ini murni menambah
  file test baru (`tests/keamanan-pin-lockout.test.js`,
  `tests/helpers/fakeTimer.js`), TIDAK menyentuh kode aplikasi apa pun
  (`keamanan-pin.js` sumber tidak diubah sama sekali), jadi tidak ada
  bundle/preview yang perlu diregenerasi kali ini.

**File yang berubah sesi ini (bagian ke-14):** `tests/
keamanan-pin-lockout.test.js` (baru), `tests/helpers/fakeTimer.js` (baru),
`docs/CLAUDE.md` (catatan ini). Tidak ada file lain yang disentuh.

**Sisa pekerjaan / kandidat sesi berikutnya:**
1. `cobek.js` (1261 baris, file fitur terbesar yang masih nol test) — masih
   disisakan paling akhir seperti dicatat sejak bagian ke-25, butuh sesi
   tersendiri utk dipetakan strukturnya dulu.
2. Daftar saran bagian ke-11 yang belum dikerjakan: #1 (selesaikan/buang
   fitur "Laporan" Shop/Cobek — butuh keputusan produk), #4 (smoke test DOM
   otomatis di CI — sempat dicoba di bagian ke-13, perlu `jsdom`/akses
   internet yang tidak tersedia di sandbox ini), #5 (ukuran bundle ~1.5MB).
3. `npm run lint` masih belum bisa diverifikasi di sandbox manapun sejauh
   ini (tidak ada akses internet utk `npm install eslint`) — item lama yang
   belum berkurang dari bagian ke-7/ke-8/ke-11/ke-12.

## Catatan kerja — 2026-07-17 (bagian ke-15): kerjakan saran #1 bagian ke-11 — pasang markup tab "📊 Laporan" di Shop/Cobek (opsi "selesaikan", bukan "buang")

Konteks: dari 2 opsi saran #1 bagian ke-11 ("selesaikan atau buang fitur
Laporan Shop/Cobek"), dipilih **selesaikan** — logika (`Laporan.renderTab()`/
`topProdukAgg()`/`renderTopProduk()`/`renderTopPelanggan()`/`setPeriodeLap()`/
`getRangeLap()` di `cobek-order.js`, `exportLaporanShopXLSX()` di
`cobek-io.js`, cabang `t==='laporan'` di `setShopTab()`) sudah lengkap sejak
lama tapi TIDAK PERNAH bisa diakses user krn tidak ada tombol tab & tidak ada
elemen `#lapTrip`/`#lapOmzet`/dst di HTML — persis akar masalah kenapa bug
null-guard di bagian ke-11 baru ketahuan sekarang (kode tidak reachable dari
UI produksi manapun). *(Catatan: entri ini ditulis belakangan di sesi
berikutnya krn kuota chat sesi asli habis sebelum sempat dicatat — pekerjaan
kode & test-nya sendiri sudah selesai & terverifikasi sebelum kuota habis.)*

**Perubahan HANYA markup, TIDAK ADA business logic baru** kecuali 1 wrapper
tipis `renderShopLaporan()` di `cobek-io.js` (pola sama dgn `renderShop()`/
`renderShopGrafik()` yang sudah ada) supaya input tanggal custom range bisa
memanggil `Laporan.renderTab()`:
1. `index.html` & `app_production.html` — 1 tombol tab baru
   (`data-action="setShopTab" data-args='["laporan","$el"]'`) di deretan tab
   Shop (setelah Pelanggan, sebelum `#shopFab`), 1 div `#shopTab-laporan`
   (filter periode + 4 kartu stat + grafik + top produk + top pelanggan), 1
   FAB kontekstual `#shopLaporanFab` (pola sama persis dgn `#laporanFab` di
   tab Laporan Keuangan/`REPORTS-2.0.md`) dgn 2 aksi (`exportLaporanShopXLSX()`,
   `exportShopSemuaXLSX()` — keduanya sudah ada di `cobek-io.js`/`ShopExport`).
2. `cobek-io.js` — tambah `renderShopLaporan(){return Laporan.renderTab();}`,
   dipanggil dari `onchange` input `#lapFrom`/`#lapTo` di markup baru.

**File baru: `tests/shop-laporan-tab.test.js` (17 test).** Mengecek struktur
markup (posisi tombol tab, isi `#shopTab-laporan`, isi blok FAB) di kedua
file HTML, token CSS terkait, dan bahwa TIDAK ADA fungsi/logic baru selain
`renderShopLaporan()` wrapper (business logic yang dipanggil tetap fungsi
lama yang sudah ada).

**Diverifikasi (dikonfirmasi ulang di sesi ini dari salinan zip yg sama):**
- `node --test tests/*.test.js` → **1788/1788 pass, 0 fail** (naik dari 1727
  di bagian ke-14 — mencakup +17 test `shop-laporan-tab.test.js` ini plus
  test lain yg juga ditambah antara bagian ke-14 & sesi ini).
- `node --test tests/shop-laporan-tab.test.js` sendirian → 17/17 pass.
- Markup dicek manual: tombol tab, `#shopTab-laporan`, `#shopLaporanFab`
  semua ada & konsisten di `index.html` maupun `app_production.html`.

**Yang TIDAK diverifikasi (sama keterbatasan sesi-sesi lain):** `npm run
lint` (tidak ada internet), smoke-test browser manual (tidak ada browser di
sandbox), `npm run build`/`release` resmi (tidak dijalankan sesi ini krn
murni dokumentasi, tidak ada perubahan source lanjutan).

**File yang berubah sesi ini (bagian ke-15):** HANYA `docs/CLAUDE.md`
(catatan susulan ini). Kode fitur Laporan Shop (`index.html`,
`app_production.html`, `cobek-io.js`, `tests/shop-laporan-tab.test.js`)
sudah ada duluan di paket zip sebelum sesi ini, tidak disentuh lagi di sini.

**Sisa pekerjaan / kandidat sesi berikutnya (mengerucut, saran #1 bagian
ke-11 sekarang SELESAI):**
1. `cobek.js` (1261 baris, file fitur terbesar yang masih nol test).
2. Saran #4 bagian ke-11 (smoke test DOM otomatis di CI) — perlu
   `jsdom`/akses internet, sudah dicoba & dihentikan di bagian ke-13.
3. Saran #5 bagian ke-11 (ukuran bundle) — lihat audit ringan di bagian
   ke-16 di bawah: bukan murni soal kode, sebagian besar terkait
   ketersediaan `esbuild`/gzip di environment rilis, bukan sesuatu yang
   bisa "diperbaiki" lewat perubahan source.
4. `npm run lint` masih belum bisa diverifikasi di sandbox manapun.

## Catatan kerja — 2026-07-17 (bagian ke-16): audit ringan saran #5 bagian ke-11 (ukuran bundle) — kesimpulan: bukan kandidat perbaikan kode "ringan"

Konteks: diminta lanjut saran ringan lain setelah Fase 1–3 split tab
Dashboard Hub (bagian ke-5/6/7/8) dikonfirmasi selesai/mentok di batas
sandbox. Ditelusuri juga `KNOWN-ISSUES.md`/`ROADMAP-v1.1.md` (jalur CSS
terpisah dari saran bagian ke-11) utk kandidat "ringan" lain — hasilnya
**7 dari 11 item roadmap CSS SUDAH selesai** (border-radius/box-shadow/
touch-target/container max-width/hover tap-target sekunder), sisa 4 item
(kontras `--text3`, konsolidasi durasi transition, ripple berbasis
koordinat, font-size kecil→token) SEMUANYA sengaja belum disentuh krn
masing-masing butuh review visual lintas tema/komponen (bukan
value-preserving) atau perubahan JS di luar mandat — bukan "belum sempat",
jadi TIDAK masuk kategori ringan.

**Audit ukuran bundle (saran #5 bagian ke-11):**
- Ukuran saat ini di zip: `app-bundle-a.min.js` ≈798.6 KB, `b.min.js`
  ≈900.1 KB (**TANPA minifikasi** — fallback `build.js` krn `esbuild` tidak
  terpasang di sandbox manapun sejauh ini kecuali sempat berhasil disalin
  manual sekali di bagian ke-8).
- Perbandingan: build ber-minifikasi asli (bagian ke-8, `esbuild` v0.27.7)
  menghasilkan `a.min.js` 646.8 KB + `b.min.js` 615.0 KB — **~440KB lebih
  kecil total** dari versi tanpa-minifikasi di zip ini. Artinya sebagian
  besar "masalah" ukuran bundle saat ini adalah **konsekuensi sandbox tanpa
  esbuild**, bukan bug source yang perlu di-lazy-load.
- `sw.js` sudah precache semua file inti (network-first + cache fallback),
  tidak ada indikasi gzip/brotli disebut di manapun di repo (`sw.js`,
  `manifest.json`, `README.md`) — itu wajar utk PWA client-side tanpa
  backend: kompresi transport ada di lapisan hosting/CDN (mis. GitHub
  Pages/Netlify/Cloudflare otomatis gzip/brotli response), bukan sesuatu
  yang dikonfigurasi di source repo ini.
- `ci.yml`/`release.sh` sudah punya guard `--require-minify`/`REQUIRE_MINIFY=1`
  (dicatat sejak bagian ke-8) yang bikin build GAGAL KERAS kalau `esbuild`
  ternyata tidak terpasang saat rilis resmi — jadi risiko "bundle besar
  ke-ship diam-diam tanpa minify" **sudah ada pagarnya**, tidak perlu
  perbaikan kode tambahan.
- Kandidat lazy-load nyata (modul jarang dipakai spt `scan-ocr.js` 42.8KB,
  `backup-restore.js` 40.8KB) **belum diaudit lebih dalam** — ini pekerjaan
  BERAT (butuh peta dependency antar modul & mungkin ubah strategi load di
  `index.html`/`build.js`), bukan sekadar konfigurasi ringan, jadi sengaja
  TIDAK dieksekusi sesi ini tanpa instruksi lebih lanjut.

**Kesimpulan:** tidak ada perubahan kode yang dibuat sesi ini utk saran #5
— audit menyimpulkan ini BUKAN item "ringan" (baik dieksekusi penuh sbg
lazy-load, maupun dianggap selesai sbg konfigurasi), jadi disisakan apa
adanya utk sesi mendatang kalau memang mau dikerjakan penuh sbg fitur
tersendiri.

**Diverifikasi:** `node --test tests/*.test.js` → 1788/1788 pass, 0 fail
(tidak ada regresi, tidak ada file source yang diubah sesi ini selain
`docs/CLAUDE.md`).

**File yang berubah sesi ini (bagian ke-16):** HANYA `docs/CLAUDE.md`
(catatan bagian ke-15 & ke-16 ini). Tidak ada file source/test/bundle lain
yang disentuh.

**Kesimpulan menyeluruh sesi ini — tidak ada lagi item "ringan" tersisa:**
Setelah menelusuri 2 jalur saran (bagian ke-11 JS/dashboard, dan
`ROADMAP-v1.1.md` CSS), SEMUA item yang murni mekanis/tanpa-keputusan sudah
selesai. Sisa pekerjaan yang ada semuanya butuh salah satu dari: (a)
keputusan produk, (b) verifikasi visual di browser sungguhan, (c) akses
internet (lint/esbuild), atau (d) kerja struktural besar (`cobek.js` test,
lazy-load bundle). Kandidat sesi berikutnya kalau user mau lanjut salah
satu dari yang "berat": `cobek.js` (test), lazy-load bundle (#5), atau
konsolidasi durasi transition/font-size (butuh review visual per komponen).

## Catatan kerja — 2026-07-18: Rule kedua per domain AI (finance/vehicle/asset/delivery)

Konteks: lanjutan `RENCANA-SESI-RINGKAS.md` Sesi 7-9 — tiap domain sudah
punya 1 rule (Sesi 7/8), delivery sudah configurable (Sesi 9), tapi rule
kedua per domain belum pernah diputuskan ("keputusan produk lanjutan —
belum dikerjakan"). Diusulkan 4 kandidat berdasarkan fungsi yang SUDAH ADA
(tidak menambah logic prediktif baru), dikonfirmasi user sebelum eksekusi
(sesuai aturan "STOP dan tanya dulu" di atas):

- **`finance-low-balance`** (`modules/finance/tx-list-cashflow.js`) — saldo
  total akun (`totalSaldoAkun()`) di bawah setengah rata-rata pengeluaran
  bulanan (`computeCashflowForecast().expAvg`). Ambang 0.5x DIHARDCODE
  (belum diminta configurable). `_financeLowBalanceCheck()` helper baru,
  didaftarkan di `registerFinanceAIRules()` yang sudah ada (bukan fungsi
  register terpisah).
- **`vehicle-fuel-efficiency-drop`** (`modules/vehicle/sparepart-servis.js`)
  — km/liter segmen Full Tank TERAKHIR turun ≥20% dari rata-rata segmen
  sebelumnya (min. 4 log Full Tank berurutan → 3 segmen historis + 1
  terakhir). `_vehicleFuelEfficiencyDropCheck()` helper baru menghitung
  km/L PER PASANGAN log berurutan sendiri (TIDAK mengubah/menduplikasi
  `fuelEfficiency()`/`estimateRpPerKm()` yang menghitung km/L gabungan
  semua histori).
- **`asset-zakat-due`** (`modules/asset/aset.js`) — ada aset zakatable
  dengan estimasi Zakat Maal (`PajakAset.hitungZakatAset()`, sudah ada)
  > 0. **Catatan penting**: ini murni PENGINGAT BERKALA (cooldown
  mingguan), BUKAN pengecekan status sudah/belum dibayar — dicek dulu,
  app ini TIDAK menyimpan histori tanggal pembayaran zakat/haul sama
  sekali, jadi rule ini sengaja tidak berpura-pura tahu status bayar
  (beda dari usulan awal di percakapan yang menyebut "belum dibayar lagi
  sejak lewat 1 haul" — disederhanakan jadi murni ada-tidaknya kewajiban
  zakat, konsisten dgn `hitungZakatAset()` sendiri yang juga "TANPA cek
  haul/nishab terpisah").
- **`delivery-low-stock`** (`modules/shop/cobek-pricing.js`) — ada produk
  Shop/Cobek dengan `stock<=2`. Ambang DIPAKAI ULANG dari badge "Menipis"
  yang SUDAH ADA di kartu produk (`cobek-etalase.js`, `stockCls`/
  `stockLbl`), TIDAK mengarang ambang baru. `_deliveryLowStockCheck()`
  baca `D.products` langsung (bukan `ctx.payload`, beda dari
  `delivery-thin-margin` yang bergantung event `delivery.created`).

Keempatnya didaftarkan sebagai `AIDecision.rules.register()` KEDUA di
dalam fungsi `register<Domain>AIRules()` yang sudah ada (bukan fungsi
baru) — tetap 1 titik pemanggilan per domain saat boot (`self-test.js`),
idempotent lewat guard yang sudah ada.

**Test baru (+15 test, 4 file yang sudah ada diperluas, bukan file baru):**
`tests/finance-ai-rule.test.js` (+4: register, trigger, tidak-trigger,
expAvg 0), `tests/vehicle-ai-rule.test.js` (+4: register, trigger [drop
30%], tidak-trigger [drop 10%, di bawah ambang 20%], tidak-trigger [log
Full Tank <4]), `tests/asset-ai-rule.test.js` (+3: register, trigger,
tidak-trigger [tidak ada aset zakatable]), `tests/delivery-ai-rule.test.js`
(+4: register, trigger, tidak-trigger [stok>2], tidak-trigger [tidak ada
produk]). `makeCtx()` di `finance-ai-rule.test.js` diperluas menerima opsi
`totalSaldoAkun` custom (sebelumnya hardcode `1000000`) supaya bisa
mengontrol trigger/tidak-trigger rule saldo.

**Diverifikasi:**
- `node --test tests/*.test.js` → **2071/2071 pass, 0 fail** (naik dari
  2056 sebelum sesi ini, +15 test baru, 0 regresi).
- `node --check` lolos di 4 file source yang diubah.
- `node scripts/build.js` → sukses, versi naik ke
  `kw99-sesi25-fix-gdrive-backup-await-19` (build #432), 3 lint-guard
  bawaan (u-dnone, escapeHtml, chicken-egg Tesseract) lolos, kedua bundle
  lolos `node --check` sintaks, `index.html`/`app_production.html` tetap
  identik, `FILE-MAP.md` diregenerasi (130 file, 1178 identifier).
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet (`npm install` gagal), sama seperti keterbatasan
  hampir semua sesi sebelumnya di file ini. Bundle hasil build TANPA
  minifikasi (fallback otomatis, aman tapi lebih besar dari versi
  ter-minify) — **jalankan `npm install --save-dev esbuild` + `npm run
  lint` di lokal sebelum rilis produksi**, sesuai catatan esbuild di atas.
- Smoke-test browser manual belum dijalankan (tidak ada browser di
  sandbox ini) — perubahan murni logic rule (baca data, tidak ada UI
  baru/perubahan DOM), risiko regresi visual rendah, tapi tetap disarankan
  dicoba manual (`?dev=1`, buka Pengaturan → 🤖 AI Asisten →
  `AIService.dailyBriefing()`/`.simulate()` via console dev) sebelum rilis.

**Status sekarang: ke-4 domain (finance/vehicle/asset/delivery) masing-
masing punya 2 rule.** Rule kedua ini SEMUA hardcode (tidak configurable)
— kalau nanti mau dibuat configurable juga (pola sama dgn Sesi 7/9), itu
keputusan produk lanjutan berikutnya.

## Catatan kerja — 2026-07-18 (lanjutan): rule kedua per domain jadi configurable (Sesi 10)

Lanjutan catatan tepat di atas. Ke-4 rule kedua dibuat configurable, pola
PERSIS sama dgn `getAIFinanceOverspendThreshold()` (Sesi 7)/
`getAIDeliveryThinMarginThreshold()` (Sesi 9) — getter/setter baca/tulis
`D.profile.<key>`, clamp ke rentang valid, field baru di Pengaturan → 🤖 AI
Asisten:

- `finance-low-balance`: `getAIFinanceLowBalanceMultiplier()`/
  `setAIFinanceLowBalanceMultiplier(mult)` → `D.profile.
  aiFinanceLowBalanceMultiplier`, rentang 0.1-2, default 0.5.
- `vehicle-fuel-efficiency-drop`: `getAIVehicleFuelDropThreshold()`/
  `setAIVehicleFuelDropThreshold(pct)` → `D.profile.
  aiVehicleFuelDropThresholdPct`, rentang 5-90, default 20. Minimal 3
  segmen historis TETAP hardcode (syarat data cukup, bukan ambang
  sensitivitas).
- `asset-zakat-due`: `getAIAssetZakatMinThreshold()`/
  `setAIAssetZakatMinThreshold(rp)` → `D.profile.
  aiAssetZakatMinThresholdRp`, minimal 0, default Rp0 (perilaku lama:
  trigger begitu ada zakat > 0). Beda dari 3 lainnya: ambang NOMINAL
  minimum, bukan % — sesuai sifat rule ("ada zakat atau tidak").
- `delivery-low-stock`: `getAIDeliveryLowStockThreshold()`/
  `setAIDeliveryLowStockThreshold(n)` → `D.profile.
  aiDeliveryLowStockThreshold`, minimal 0, default 2 pcs. Badge "Menipis"
  di kartu produk (`cobek-etalase.js`) TIDAK ikut berubah, tetap hardcode
  `<=2`.

4 field baru ditambahkan di Pengaturan → 🤖 AI Asisten (`index.html`):
"Ambang Saldo Rendah (x rata-rata pengeluaran)", "Ambang Turun Efisiensi
BBM (%)", "Ambang Stok Menipis (pcs)", "Ambang Minimal Zakat Maal (Rp)".
Wiring di `autoSaveProfile()` (`modules/shared/profil-pengaturan.js`) &
`renderSettings()` (`modules/shared/modules-render.js`), pola sama dgn 2
field existing (`sAIFinanceThreshold`/`sAIDeliveryThreshold`).

**Test tambahan (+20, 4 file existing diperluas, bukan file baru):**
`tests/finance-ai-rule.test.js`, `tests/vehicle-ai-rule.test.js`,
`tests/delivery-ai-rule.test.js`, `tests/asset-ai-rule.test.js` — masing-
masing +5 test (getter default, getter custom valid, getter fallback
invalid, setter+clamp, 1 rule test "ambang custom dihormati").

**Diverifikasi:**
- `node --test tests/*.test.js` → **2091/2091 pass, 0 fail** (naik dari
  2071 sebelum sesi ini, +20 test baru, 0 regresi).
- `node --check` lolos di 6 file source yang diubah
  (`modules/finance/tx-list-cashflow.js`,
  `modules/vehicle/sparepart-servis.js`, `modules/shop/cobek-pricing.js`,
  `modules/asset/aset.js`, `modules/shared/modules-render.js`,
  `modules/shared/profil-pengaturan.js`).
- `node scripts/build.js` → sukses, versi naik ke
  `kw99-sesi25-fix-gdrive-backup-await-20` (build #433), 3 lint-guard
  bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi
  (130 file, 1190 identifier).
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti sesi-sesi sebelumnya. Bundle TANPA
  minifikasi (fallback otomatis, aman) — **jalankan `npm install
  --save-dev esbuild` + `npm run lint` di lokal sebelum rilis produksi.**
- Smoke-test browser manual belum dijalankan (tidak ada browser di
  sandbox ini) — perubahan murni logic ambang + field Pengaturan baru,
  risiko regresi visual rendah, tapi tetap disarankan dicoba manual
  (`?dev=1`, Pengaturan → 🤖 AI Asisten, isi field baru lalu cek
  `AIService.dailyBriefing()`/`.simulate()` via console dev) sebelum
  rilis.

**Status sekarang: SEMUA rule kedua di ke-4 domain sudah configurable**,
konsisten dgn rule pertama (finance-overspend-month sejak Sesi 7,
delivery-thin-margin sejak Sesi 9). `vehicle-service-overdue` &
`asset-networth-declining` (rule PERTAMA vehicle/asset) TETAP hardcode
karena sifatnya status/tren, bukan ambang nominal — sama alasan Sesi 8/9,
tidak berubah sesi ini.

## Catatan kerja — 2026-07-17 (bagian ke-17): mulai test `cobek.js` (BERAT, dikerjakan bertahap) — Stage 1: `ImportKatalog`, `ShopExport` (row-builder), `ImportShopExcel`

Konteks: lanjutan item "berat" (`cobek.js` — sekarang sudah terpecah jadi 5
file: `cobek-etalase.js`/`cobek-pricing.js`/`cobek-order.js`/
`cobek-tx-cart.js`/`cobek-io.js`, 2251 baris total) yang disisakan di
bagian ke-16. **Ternyata BUKAN benar2 nol test** — `tests/cobek.test.js`
(1750 baris, 141 test, header komentarnya masih menyebut nama lama
"cobek.js (1262 baris)") sudah mencakup SEBAGIAN BESAR namespace (Etalase,
PriceReko, PriceRekoWidget, StockRekoWidget, Produsen, SiapPulang, Order,
Laporan, Pelanggan). Diaudit ulang fungsi per fungsi (cross-check tiap
nama fungsi top-level di 5 file vs disebut/tidak di `cobek.test.js`) —
ketemu celah nyata: 3 namespace `const` top-level di `cobek-io.js`
(`ImportKatalog`, `ShopExport`, `ImportShopExcel`) **0% tercakup**, karena
`makeCtx()` di `cobek.test.js` cuma expose 10 namespace lain lewat
parameter ke-3 `loadSource()` — 3 namespace ini tidak ikut di-expose (lihat
catatan `loadSource.js`: `const`/`let` top-level butuh expose eksplisit,
beda dari `function` yang otomatis nempel ke context vm). Selain 3
namespace itu, sisa fungsi yang tadinya kelihatan "tidak disebut di test"
ternyata SEMUANYA thin wrapper 1-baris ke method namespace yang SUDAH
dites langsung (mis. `delProdusen(id){return Produsen.delete(id);}`,
`Produsen.delete` sudah dites) — pola yang sama persis dgn `Order.save`/
`_saveInner` yang sudah didokumentasikan sebelumnya, jadi SENGAJA tidak
ditambah test terpisah utk wrapper-wrapper itu.

**Cakupan Stage 1 (dipilih krn 3 namespace ini paling besar celahnya &
punya logika murni yang bisa dites tanpa DOM/browser sungguhan):**
1. **`ImportKatalog`** (impor massal produk dari teks tempel harga) — FULL:
   `_parsePrice` (angka polos/`rb`/`ribu`/`k`), `_parse` (baris tanpa harga
   jadi nama kategori, baris kosong/harga 0 dibuang), `preview` (teks
   kosong → toast, tidak ada baris valid → pesan kosong, valid → hitung
   baru/update), `commit` (belum preview → toast, target
   reseller/beli menentukan field harga yg ke-update, produk baru vs
   existing, reset `parsed` setelahnya), `open`/`setTarget`.
2. **`ShopExport`** — HANYA bagian row-builder murni (`etalaseRows`,
   `produsenRows`, `riwayatRows`, `pelangganRows`, `laporanRows`):
   margin Rp/% (termasuk fallback 0 saat `hargaBeli`=0, bukan NaN),
   jumlah produk terhubung per produsen, filter by range
   `Laporan.getRange()` (tab Riwayat) vs `Laporan.getRangeLap()` (tab
   Laporan — **2 sumber periode terpisah**, dikonfirmasi lewat test),
   fallback baris data lama (`.sets` tanpa `.items`). **`exportXxx()`/
   `_download()`/`_ensureLib()` SENGAJA TIDAK dites** (bergantung
   `XLSX`/download file nyata, di luar cakupan harness `loadSource` vm
   murni — sama alasan `Order.save`/`withSaveGuard` tidak dites).
3. **`ImportShopExcel`** — HANYA `_parse` (map header Excel kolom
   Indonesia → field object, target etalase vs produsen, baris tanpa nama
   dibuang), `commit` (match by name case-insensitive → update, tidak ada
   → buat baru, field kosong string tidak menimpa field lama produsen),
   `setTarget`/`open`. **`onFileSelected` SENGAJA TIDAK dites** (butuh
   stub `File`/`XLSX.read()` nyata, kandidat Stage berikutnya kalau
   dianggap perlu).

**File baru: `tests/cobek-import-export.test.js` (26 test).**

**Catatan teknis — kenapa awalnya 9 test gagal dgn `assert.deepEqual`
(lalu diperbaiki ke `JSON.stringify`/cek `.length`):** sama persis pola yg
sudah didokumentasikan di `aset.test.js`/`onboarding.test.js`/bagian
ke-14 — array/object yg dibuat DI DALAM vm context (`_parse()`/`parsed`/
`parsedRows`/`laporanRows()` jalan di realm sandbox) beda prototype
`Array`/`Object` dari literal yang ditulis di test (realm host Node biasa),
`assert.deepEqual` menganggap beda walau isinya identik. Semua diganti ke
`assert.equal(JSON.stringify(a), JSON.stringify(b))` (utk isi) atau
`assert.equal(arr.length, 0)` (utk cek kosong).

**Catatan teknis lain — `renderProductList` bukan stub yg diinject
sengaja tidak jalan:** sempat coba assert
`calls.render.some(r=>r[0]==='renderProductList')` dgn meng-inject stub
`renderProductList` lewat `extraGlobals`, TAPI `cobek-io.js` sendiri
punya `function renderProductList(){...}` beneran (baris 205) — deklarasi
`function` di vm HOISTING & menimpa binding global apa pun yg diinject
duluan lewat `extraGlobals` (beda dari `const`/`let` yg butuh expose
manual). Assersi itu dihapus (redundan — behavior `renderProductList`
sendiri, yaitu `Etalase.renderList()`/`PriceRekoWidget.render()` dst,
sudah dites lewat jalur lain di `cobek.test.js`), diganti fokus ke
verifikasi `D.products`/`save`/`closeModal`/`toast` saja.

**Diverifikasi:**
- `node --test tests/cobek-import-export.test.js` → 26/26 pass sendirian.
- `node --test tests/*.test.js` penuh → **1814/1814 pass, 0 fail** (naik
  dari 1788 di bagian ke-16, +26 murni dari file baru, 0 regresi).
- `node --check tests/cobek-import-export.test.js` → 0 syntax error.
- **Tidak menjalankan `node scripts/build.js`** — sesi ini murni menambah
  file test baru, tidak menyentuh kode aplikasi (`cobek-io.js` dkk sumber
  TIDAK diubah sama sekali), jadi tidak ada bundle yang perlu diregenerasi.

**File yang berubah sesi ini (bagian ke-17):** `tests/
cobek-import-export.test.js` (baru), `docs/CLAUDE.md` (catatan ini). Tidak
ada file lain yang disentuh.

**Sisa pekerjaan `cobek.js` utk Stage berikutnya (dipersempit dari
"1261 baris nol test" jadi celah spesifik yang tersisa):**
1. `cobek-tx-cart.js` — fungsi cart Stok/Jual dari form Transaksi gabungan
   yang BUKAN thin-wrapper (`populateTxShopStockSelect`,
   `onTxShopStockItemChange`, `removeShopStockCartItem`,
   `populateTxShopSaleSelect`, `onTxShopSaleItemChange`,
   `removeTxShopSaleCartItem`, `applyBundleLinkedStock`,
   `applyTxShopStockFromTx`, `applyTxShopSaleFromTx`,
   `computeTxShopSaleTotals`) — belum diaudit isi & ditest sama sekali,
   kemungkinan kandidat celah terbesar yg tersisa.
2. `ImportShopExcel.onFileSelected` (butuh stub `File`/`XLSX.read()`).
3. `Order.removeItem` — dicek 0 occurrence di `cobek.test.js` (beda dari
   `addItem`/`changeQty` yang sudah dites), perlu dikonfirmasi apakah
   benar celah atau tertes tidak langsung.
4. `Laporan.renderTab` — fungsi render utama tab "📊 Laporan" Shop (dipakai
   oleh `renderShopLaporan()` yg dipasang di bagian ke-15) — 0 occurrence
   di `cobek.test.js`, kandidat test lanjutan yg relevan langsung dgn
   fitur yg baru diaktifkan.

## Catatan kerja — 2026-07-18 (lanjutan lagi): `cobek-tx-cart.js` Stage berikutnya — 7 fungsi 0% coverage kini tertes langsung

Lanjutan item #1 di atas. Diaudit ulang: dari 10 fungsi yang disebut,
`applyTxShopStockFromTx`/`applyTxShopSaleFromTx`/`computeTxShopSaleTotals`
TERNYATA sudah punya test (dicek ulang lewat `grep -c` per nama fungsi di
`tests/cobek.test.js`) — cuma belum menutup semua cabang. Sisa 7 fungsi
betul-betul 0 occurrence, sekarang semua ditest langsung (bukan cuma lewat
efek sampingnya di fungsi lain):

- `populateTxShopStockSelect()` — bangun opsi `<select>` dari
  `D.products`/`D.produsen`/`D.cobekKategori`, pertahankan pilihan lama
  kalau masih valid, reset ke `__new__` kalau produk sudah hilang.
- `onTxShopStockItemChange()` — 4 cabang: pilih `__new__` (tampilkan field
  baru, prefill nama dari `txNote` HANYA kalau nama masih kosong), pilih
  produk existing (isi kategori & `hargaBeli` default), & pilih produk
  existing dgn produsen aktif yg py `hargaByProdusen` (dipakai, bukan
  `hargaBeli` default).
- `removeShopStockCartItem(idx)` — hapus item dari cart (via efek yg
  teramati di `txShopStockCartList` innerHTML, krn `curShopStockCart` itu
  module-scope `let` yg tidak ke-expose — lihat catatan pola ini di kepala
  file), & `txAmt` ikut disinkronkan ulang setelah hapus.
- `populateTxShopSaleSelect()` — 3 cabang: belum ada produk (placeholder),
  ada produk & pilihan lama valid (dipertahankan + harga jual ikut
  disinkron), pilihan lama tidak valid (default ke produk pertama).
- `onTxShopSaleItemChange()` — termasuk cabang `sel.value` kosong (no-op,
  guard `!sel.value`).
- `removeTxShopSaleCartItem(idx)` — pola sama dgn `removeShopStockCartItem`
  utk cart Jual.
- `applyBundleLinkedStock(product,qty,sign)` — sebelumnya cuma tertes
  TIDAK LANGSUNG lewat `recordShopSale` (4 test bundle yg sudah ada).
  Ditambah 5 test LANGSUNG memanggil fungsi ini sendiri: product
  null/undefined (no-op), bukan bundle (tidak ada efek samping), sign -1
  (kurangi base + kandidat alu yg stoknya cukup), sign +1 (kembalikan ke
  base + kandidat pertama), & tidak ada kandidat base/alu-muntu yg cocok
  (dilewati diam-diam, tidak error).

**Test baru: +17, semua di `tests/cobek.test.js` yang sudah ada (bukan
file baru).** Tidak ada source (`modules/shop/cobek-tx-cart.js` dkk) yang
diubah sama sekali sesi ini — murni menambah test, jadi tidak perlu
`node scripts/build.js` ulang.

**Diverifikasi:**
- `node --test tests/cobek.test.js` sendirian → **158/158 pass** (naik
  dari 141).
- `node --test tests/*.test.js` penuh → **2108/2108 pass, 0 fail** (naik
  dari 2091 di sesi sebelumnya, +17 murni dari test baru, 0 regresi).
- `node --check tests/cobek.test.js` → 0 syntax error.

**Sisa celah `cobek-tx-cart.js` yg BELUM ditutup sesi ini (bukan 0%, tapi
belum semua cabang):** `applyTxShopStockFromTx` belum ada test utk cabang
`existingTx.stockItems`/`existingTx.stockProductId` (restore stok lama saat
EDIT transaksi yg sudah pernah nambah stok sebelumnya) & multi-item cart;
`applyTxShopSaleFromTx` belum ada test utk cabang edit
(`existingTx.cobekLinkId`, replace order lama). Kandidat lanjutan
berikutnya kalau mau menutup 100% cabang file ini.

**Sisa pekerjaan `cobek.js` yg BELUM disentuh (tidak berubah dari catatan
di atas):** `ImportShopExcel.onFileSelected`, `Order.removeItem`,
`Laporan.renderTab`.

## Catatan kerja — 2026-07-18 (lanjutan lagi): tutup 3 celah terakhir dari sesi sebelumnya

Lanjutan langsung dari 2 catatan "Sisa" di atas. Semua 3 celah ditutup
sesi ini, tidak ada source app yang diubah (murni tambah test):

1. **`applyTxShopStockFromTx`/`applyTxShopSaleFromTx` — cabang edit
   (`tests/cobek.test.js`, +5 test).**
   - `applyTxShopStockFromTx`: 3 test cabang edit — `existingTx.stockItems`
     (array baru), `existingTx.stockProductId`/`stockQty` (format lama),
     & kasus restore > stok saat ini (`Math.max(0,...)`, tidak boleh minus).
     Ketiganya verifikasi stok akhir = restore dulu (kurangi qty lama) baru
     tambah cart baru.
   - `applyTxShopSaleFromTx`: 2 test cabang edit lewat `existingTx.cobekLinkId`
     — sukses (update in-place `D.cobek` via `recordShopSale`'s
     `existingShopId`, BUKAN push order baru, stok lama dikembalikan dulu
     via `applyBundleLinkedStock` sebelum dikurangi lagi) & gagal (stok baru
     tidak cukup — order lama harus tetap utuh, tidak ada mutasi).

2. **`Order.removeItem` (`tests/cobek.test.js`, +2 test).** Hapus item by
   index + `renderItems()` terpanggil (verifikasi lewat efek di
   `#orderItemList` innerHTML), plus wrapper tipis `removeOrderItem()` di
   `cobek-io.js` dicek memanggil `Order.removeItem` yang sama.

3. **`Laporan.renderTab` (`tests/cobek.test.js`, +4 test).** Fungsi render
   utama tab "📊 Laporan" Shop (state `periodeLap`, TERPISAH dari `periode`
   milik tab Riwayat — lihat catatan di kepala fungsi). Ditest: hitung
   trip/omzet/untung/margin dalam rentang, `renderTopProduk`/
   `renderTopPelanggan` (termasuk agregasi qty/omzet per produk & per
   pelanggan lintas beberapa order), state kosong (pesan "Belum ada data"
   di kedua panel top), & `setPeriodeLap()` (ganti periode aktif + panggil
   `renderTab()` + konfirmasi TIDAK menimpa `Laporan.periode`).

4. **`ImportShopExcel.onFileSelected` (`tests/cobek-import-export.test.js`,
   +7 test, file yang sudah ada — bukan baru).** Sebelumnya sengaja
   di-skip di file ini (lihat catatan header lama: "butuh stub
   File/XLSX.read() nyata"). Ditambah 2 helper (`fakeFile(rows)` — objek
   dgn `.arrayBuffer()` async, `fakeXLSX(rows,opts)` — mock `XLSX.read()`/
   `XLSX.utils.sheet_to_json()`) & parameter baru `opts.XLSX` di `makeCtx()`
   (di-splice ke `extraGlobals` loadSource() cuma kalau di-set, biar
   `typeof XLSX==='undefined'` di source asli tetap kebaca `undefined` di
   test lain yang tidak butuh XLSX). Cabang yang ditest: tidak ada file
   dipilih (no-op, kosongkan preview), `ensureXLSX()` gagal (toast "Gagal
   memuat pustaka Excel"), `ensureXLSX()` sukses tapi TIDAK throw (jalur
   try/catch aman — dicatat di komentar test kenapa efek samping
   `ensureXLSX()` tidak bisa "menembus" balik ke variabel global sandbox
   vm lewat closure biasa, jadi test ini fokus ke "tidak melempar
   exception", bukan hasil akhirnya), `XLSX` sudah tersedia sukses baca +
   parse + render preview + enable commit (target etalase & produsen),
   `XLSX.read()` melempar error (file rusak → toast pesan error, preview
   kosong, commit disabled), & baris terbaca tapi semuanya tanpa nama
   (dibuang `_parse()` → pesan "Tidak ada baris valid terbaca").

**Diverifikasi:**
- `node --test tests/cobek.test.js` sendirian → **169/169 pass** (naik
  dari 158).
- `node --test tests/cobek-import-export.test.js` sendirian → **33/33
  pass** (naik dari 26).
- `node --test tests/*.test.js` penuh → **2126/2126 pass, 0 fail** (naik
  dari 2108 di sesi sebelumnya, +18 murni dari test baru, 0 regresi).
- `node --check` kedua file test → 0 syntax error.
- **Tidak menjalankan `node scripts/build.js`** — sesi ini murni menambah
  test, source app (`cobek-tx-cart.js`/`cobek-order.js`/`cobek-io.js` dkk)
  TIDAK diubah sama sekali, jadi tidak ada bundle yang perlu diregenerasi.
- **`eslint` TIDAK dijalankan** — registry npm diblokir di sandbox sesi
  ini (`npm error 403` saat `npx eslint`) & tidak ada `node_modules`
  ter-install. Sebagai gantinya dicek manual pola `no-unused-vars` yang
  paling umum kena (destructure `fakeDocument` yang ternyata tidak dipakai
  di 3 test baru — sudah diperbaiki). **WAJIB jalankan `npm run lint`
  sungguhan di sesi/mesin berikutnya sebelum anggap ini benar-benar bersih.**

**File yang berubah sesi ini:** `tests/cobek.test.js` (+11 test: 5 cabang
edit `applyTxShop*FromTx`, 2 `Order.removeItem`/`removeOrderItem`, 4
`Laporan.renderTab`/`setPeriodeLap`, plus field id `lap*` baru di
`baseFields()`), `tests/cobek-import-export.test.js` (+7 test
`ImportShopExcel.onFileSelected`, param `opts.XLSX` baru di `makeCtx()`,
komentar header diupdate), `docs/CLAUDE.md` (catatan ini). Tidak ada file
lain yang disentuh.

**Sisa pekerjaan `cobek.js`/`cobek-tx-cart.js` yg BELUM disentuh:** tidak
ada lagi celah 0%-coverage yang tercatat dari rangkaian sesi
`cobek.js`/`cobek-tx-cart.js`/`cobek-io.js` ini — 3 celah terakhir (poin
2–4 di catatan sesi sebelumnya) & 2 cabang edit `applyTxShop*FromTx` (poin
1 di catatan sesi sebelumnya) sudah tertutup semua per sesi ini.

## Catatan kerja — 2026-07-18 (Sesi 14): TODO.md #1 — Rule Cross Module pertama (Finance + Delivery)

Konteks: `TODO.md` prioritas tertinggi, "Satu item = target 1 sesi". Fondasi
(Context Collector per-domain, `AIContext.snapshot()`, Sesi 13) sudah
selesai, jadi item ini sekarang bisa dikerjakan dengan benar.

**Rule baru: `cross-finance-delivery-margin-balance`**
(`modules/ai/ai-decision-engine.js`, fungsi `_crossFinanceDeliveryCheck()` +
`registerCrossModuleAIRules()`) — rule PERTAMA yang benar-benar membaca 2
domain dalam 1 `condition()` (sebelumnya semua rule finance-*/vehicle-*/
asset-*/delivery-* cuma baca domain sendiri). Trigger kalau margin
rata-rata 5 transaksi Cobek terakhir (`AIContext.snapshot().shop.
recentAvgMarginPct`) TIPIS **dan** saldo total akun (`snapshot().finance.
saldoNow`) sedang RENDAH, bersamaan.

**Keputusan ambang (sesuai catatan TODO.md — "perlu keputusan produk
kecil"):** SENGAJA TIDAK membuat ambang baru. Reuse APA ADANYA 2 getter
yang sudah ada & sudah bisa diatur user di Pengaturan > 🤖 AI Asisten:
- `getAIDeliveryThinMarginThreshold()` (cobek-pricing.js, default 10%)
- `getAIFinanceLowBalanceMultiplier()` (tx-list-cashflow.js, default 0.5x)

Ditempatkan di `ai-decision-engine.js` (bukan `tx-list-cashflow.js` atau
`cobek-pricing.js`) krn rule ini bukan milik 1 domain — butuh `AIContext`
(ai-core.js) + getter finance + getter shop, ketiganya sudah dijamin
ter-load lebih dulu lewat urutan `GROUP_B` di `scripts/build.js`. Beda dari
`delivery-thin-margin` (baca `ctx.payload` dari 1 event `delivery.created`
saja): rule ini baca `recentAvgMarginPct` (rata-rata AIContext) supaya bisa
dievaluasi kapan saja, bukan cuma persis saat 1 transaksi baru disimpan.

Didaftarkan lewat `registerCrossModuleAIRules()`, dipanggil di `self-test.js
init()` setelah `registerFinanceAIRules()`/`registerVehicleAIRules()`/
`registerAssetAIRules()`/`registerDeliveryAIRules()` — pola guard/try-catch
& idempotent yang sama persis dgn 4 fungsi register domain lain.

**Test baru: `tests/cross-module-ai-rule.test.js` (8 test).** Cakupan:
register (berhasil + idempotent), rule trigger (margin tipis 5% + saldo
rendah), tidak trigger (margin sehat 40% walau saldo rendah; margin tipis
tapi saldo masih cukup; belum ada histori Cobek sama sekali — `recentAvgMarginPct`
null), ambang dihormati kalau diubah via `setAIDeliveryThinMarginThreshold()`
custom (margin 15% tidak trigger di ambang default 10%, tapi trigger begitu
ambang dinaikkan ke 20%), dan 2 guard langsung `_crossFinanceDeliveryCheck()`
(AIContext belum di-load, domain finance/shop belum available — keduanya
`trigger:false`, tidak error).

**Jebakan yang ditemukan & diperbaiki saat menulis test (bukan bug
aplikasi):** `AIDecision.rules.evaluate(ctx)` mengembalikan ARRAY langsung
(bukan `{triggered:[...]}` seperti draf awal test) — beberapa test awal
sempat salah destructure. Juga 2 kasus boundary: saldo persis di ambang
(`saldo===expAvg*multiplier`) TIDAK trigger krn kondisi source pakai `<`
ketat (`saldo<expAvg*multiplier`), bukan `<=` — nilai test disesuaikan
(400rb, bukan 500rb, utk expAvg 1jt & multiplier 0.5).

**Diverifikasi:**
- `node --test tests/cross-module-ai-rule.test.js` → 8/8 pass.
- `node --test tests/*.test.js` penuh → **2175/2175 pass, 0 fail** (naik
  dari 2167 sebelum sesi ini — 8 test baru, 0 regresi).
- `node --check` lolos di `modules/ai/ai-decision-engine.js`, `self-test.js`,
  `tests/cross-module-ai-rule.test.js`.
- `node scripts/build.js kw99-sesi25-fix-gdrive-backup-await-25` → sukses,
  versi naik ke build #438 (rebuild verifikasi paska-sesi menaikkannya lagi
  ke build #439 — tidak ada perubahan kode, hanya re-run build), 3
  lint-guard bawaan (u-dnone, escapeHtml,
  chicken-egg Tesseract) lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `FILE-MAP.md`
  diregenerasi (130 file, 1198 identifier).
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet (`npm install` gagal), sama seperti keterbatasan
  hampir semua sesi sebelumnya di file ini. Bundle hasil build TANPA
  minifikasi (fallback otomatis, aman tapi lebih besar) — **jalankan
  `npm install --save-dev esbuild` + `npm run lint` di lokal sebelum
  rilis produksi.**
- Smoke-test browser manual belum dijalankan (tidak ada browser di
  sandbox ini) — perubahan murni logic rule baru (baca data via
  AIContext, tidak ada UI/DOM baru), risiko regresi visual nol, tapi
  disarankan dicoba manual (`?dev=1`, isi data Cobek margin tipis + saldo
  rendah, cek `AIService.dailyBriefing()`/`.simulate()` via console dev
  memunculkan rekomendasi baru ini) sebelum rilis.

**File yang berubah sesi ini:** `modules/ai/ai-decision-engine.js` (rule
baru), `self-test.js` (wiring boot), `tests/cross-module-ai-rule.test.js`
(baru), `TODO.md` (item #1 lama ditandai selesai, sisa item digeser naik
1 nomor), plus hasil build resmi: `app-bundle-a.min.js`,
`app-bundle-b.min.js`, `index.html`, `app_production.html`, `sw.js`,
`docs/FILE-MAP.md`, 6 file konstanta versi, `docs/CLAUDE.md` (catatan ini).

**Untuk sesi berikutnya:** TODO.md #1 (baru) — wiring `recordOutcome()`
dari 1 titik UI nyata (tombol terima/abaikan di kartu "Penasihat").

---

## Sesi 14 (lanjutan) — 2026-07-18 — Wiring `recordOutcome()` dari UI nyata

**Rule/fitur baru: `AIRecommendCard`** (`ai-chat.js`) — widget kecil di
dalam kartu "🧭 Penasihat" > tab "🩺 Insight Cepat" (`#aiRecommendBody`,
ditambahkan di `index.html`/`app_production.html` tepat di bawah
`#finCoachBody`), KHUSUS rekomendasi dari `AIDecision` (mesin Rule/
Cross-Module Tahap 4) — TERPISAH dari `FinCoach` (rule-based lama, tidak
pernah pakai `AIDecision` sama sekali).

**Kenapa render() async (beda dari `FinCoach.renderDash()` yang sync):**
`AIDecision.decide()` sendiri async (baca/tulis IndexedDB lewat
`AIStore`), jadi `AIRecommendCard.render()` juga async — dipanggil TANPA
`await` (fire-and-forget) dari `renderDashboard()` (`modules-render.js`,
tepat setelah `FinCoach.renderDash(dashCtx)`), pola SAMA PERSIS dengan
cara `AIWidget`/`EIEDashboard` sudah dipanggil di file yang sama.

**Field baru `ruleId` di `formatRecommendation()`** (`ai-decision-
engine.js`) — sebelum sesi ini, output rekomendasi standar (`id/title/
reason/confidence/priority/affectedModules/estimatedImpact/actions`)
TIDAK menyertakan `ruleId`, padahal UI butuh itu buat manggil
`AIDecision.learn.recordOutcome(ruleId, outcome)`. Additive murni
(`ruleId: decision.ruleId || null`) — tidak mengubah field lama, 2 test
lama di `tests/ai-decision-recommendation.test.js` ditambah assert
`rec.ruleId`, tidak ada test yang dihapus/diganti.

**Tombol ✓ Terima / Abaikan → `AIRecommendCard.act(id, ruleId, outcome)`:**
1. Panggil `AIDecision.learn.recordOutcome(ruleId, outcome)` SUNGGUHAN —
   sebelum sesi ini fungsi ini cuma pernah dipanggil dari
   `tests/ai-decision-engine.test.js`, tidak pernah dari kode UI manapun.
2. Dismiss id itu (localStorage `kw_ai_recommend_dismissed`, pola disalin
   APA ADANYA dari `FinCoach.dismiss()`/`dismissedIds()` yang sudah ada,
   BUKAN mekanisme baru) — supaya rekomendasi yang sudah direspon tidak
   tampil lagi di render berikutnya. Dismiss per **decision id** (bukan
   per `ruleId`) karena 1 rule yang sama bisa trigger lagi lain waktu
   dengan decision id baru — itu SEHARUSNYA tetap muncul lagi, bukan
   didiamkan permanen hanya karena rule-nya pernah direspon dulu.
3. `recordOutcome()` dipanggil DULU baru dismiss SETELAHNYA, dibungkus
   try/catch: kalau `recordOutcome()` gagal (mis. IndexedDB error),
   `act()` TETAP lanjut ke dismiss (tidak melempar), tapi tercatat lewat
   `console.warn` — keputusan: mending rekomendasi hilang dari layar
   (user sudah menekan tombolnya) daripada macet di kartu selamanya kalau
   persist gagal, walau konsekuensinya feedback itu TIDAK ke-track kalau
   errornya kejadian.
4. `toast()` konfirmasi ringan sesudahnya (pesan beda utk accepted vs
   ignored), lalu `AIRecommendCard.render()` dipanggil ulang di akhir
   `act()` biar kartu langsung ke-refresh tanpa nunggu siklus
   `renderDashboard()` berikutnya.

**Kenapa maksimal 2 kartu ditampilkan sekaligus (bukan semua):** pola sama
dgn `FinCoach.renderDash()` yang juga membatasi tampilan (`top.slice(0,4)`)
supaya kartu "🧭 Penasihat" tidak kepanjangan — beda angka (2, bukan 4)
karena rekomendasi `AIDecision` py badan teks lebih panjang (title+reason)
dibanding 1 baris insight FinCoach.

**`window` exposure:** `AIRecommendCard` ditambahkan ke daftar
`Object.assign(window,{...})` di `app-bootstrap.js` (baris yang sama
dengan `Advisor`/`FinCoach`) — kelupaan expose ini KETAHUAN lewat test
`window-expose-audit.test.js` yang SUDAH ADA (bukan test baru sesi ini),
gagal duluan sebelum sempat lupa upload — bukti nyata gunanya test itu.

**Test baru: `tests/ai-recommend-card.test.js` (7 test).** Cakupan:
render() kosong kalau tidak ada rekomendasi (tidak error), render() tidak
error kalau `AIDecision` belum ter-load (guard `typeof`), render() nulis
title/reason + 2 tombol dengan `id`/`ruleId`/`outcome` yang benar di
`data-args`, dibatasi 2 teratas, filter id yang sudah didismiss dari
localStorage, `act('accepted')` memanggil `recordOutcome` + dismiss +
toast + re-render (kartu hilang dari body), `act('ignored')` juga
tercatat, dan `act()` tidak throw + tetap dismiss walau `recordOutcome()`
melempar error. Dipakai `loadSource(['ai-chat.js'], ...)` (load 1 file
utuh, bukan cuma fungsi terisolasi) + `createFakeDocument` dari
`tests/helpers/fakeDom.js` — pola disalin dari
`tests/self-reward-view.test.js` (widget UI dengan localStorage-based
dismiss serupa).

**Diverifikasi:**
- `node --test tests/ai-recommend-card.test.js tests/ai-decision-
  recommendation.test.js` → 11/11 pass duluan sebelum full suite.
- `node --test tests/*.test.js` penuh → sempat **1 gagal**
  (`window-expose-audit.test.js`, `AIRecommendCard` belum di-expose ke
  `window`) — diperbaiki (lihat poin `window` exposure di atas), lalu
  **2182/2182 pass, 0 fail** (naik dari 2175 sebelum sesi ini — 7 test
  baru `ai-recommend-card.test.js`).
- `node --check` lolos di `ai-chat.js`, `modules/ai/ai-decision-
  engine.js`, `modules/shared/modules-render.js`, `app-bootstrap.js`.
- `node scripts/build.js` → sukses, versi naik ke build #440 (dari #439
  hasil rebuild verifikasi sebelumnya), 3 lint-guard bawaan lolos, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, `docs/FILE-MAP.md` diregenerasi (130 file, 1199
  identifier — naik 1 dari `AIRecommendCard`).
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Smoke-test browser manual belum dijalankan (tidak ada browser di
  sandbox ini) — disarankan dicoba manual (`?dev=1`, buka Beranda, pastikan
  ada rule `AIDecision` yang trigger — mis. isi data Cobek margin tipis +
  saldo rendah dari rule Sesi 14 sebelumnya — cek kartu "🤖 Rekomendasi AI"
  muncul di bawah "🩺 Insight Cepat", tombol Terima/Abaikan berfungsi &
  hilang setelah diklik) sebelum rilis produksi.

**File yang berubah sesi ini:** `ai-chat.js` (`AIRecommendCard` baru),
`modules/ai/ai-decision-engine.js` (field `ruleId` di
`formatRecommendation()`), `modules/shared/modules-render.js` (wiring
`AIRecommendCard.render()` di `renderDashboard()`), `app-bootstrap.js`
(window exposure), `index.html` & `app_production.html` (`#aiRecommendBody`
container), `tests/ai-recommend-card.test.js` (baru), `tests/ai-decision-
recommendation.test.js` (2 assert `ruleId` ditambah), `TODO.md`/
`ROADMAP.md`/`IMPLEMENTATION_STATUS.md` (status Tahap 6 naik ke 55%),
plus hasil build resmi: `app-bundle-a.min.js`, `app-bundle-b.min.js`,
`sw.js`, `docs/FILE-MAP.md`, 6 file konstanta versi, `docs/CLAUDE.md`
(catatan ini).

**Untuk sesi berikutnya:** TODO.md #2 — `AIService.simulate()` panggil
`LogisticsEngine.profitCalculator()` (Tahap 7, Profit Simulation).

## Checkpoint recovery — 2026-07-18 — Verifikasi & packaging pasca sesi terputus

Sesi sebelumnya terputus (kuota habis) setelah implementasi Sesi 14
selesai. Sesi ini HANYA melakukan verifikasi ulang + packaging, TIDAK ada
kode baru:

- Diverifikasi ulang (bukan diulang dari nol): `npm test` → 2182/2182
  pass, 0 fail. `npm run build` → sukses, versi naik dari #440 ke **#441**
  (build sebelumnya yang disebut "#439" di catatan sesi terputus ternyata
  sudah #440 di source — selisih 1 build verifikasi, tidak ada kode yang
  hilang). Kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik.
- Tidak ada perubahan kode implementasi.
- Dokumentasi (`docs/CLAUDE.md`, `IMPLEMENTATION_STATUS.md`,
  `ROADMAP.md`, `TODO.md`) diperbarui untuk mencatat checkpoint ini.
- ZIP rilis baru di-generate dari state pasca-build #441.

**Untuk sesi berikutnya:** tetap TODO.md #2 — `AIService.simulate()`
panggil `LogisticsEngine.profitCalculator()` (Tahap 7, Profit
Simulation).

## Checkpoint recovery #2 — 2026-07-18 — Verifikasi & packaging ulang pasca sesi terputus (kuota habis)

Sesi ini dimulai dari ZIP delivery Sesi 15 (`kw_release_sesi15_delivery_summary.zip`)
tanpa memori sesi sebelumnya. Instruksi: HANYA verifikasi + packaging,
TIDAK ada kode/fitur baru, TIDAK mengubah implementasi kecuali ada error
yang menghalangi packaging.

- Diverifikasi ulang dari source (bukan dipercaya dari catatan saja):
  `node --test tests/*.test.js` → **2188/2188 pass, 0 fail**.
  `node --check` lolos di kedua bundle (`app-bundle-a.min.js`,
  `app-bundle-b.min.js`).
- `node scripts/build.js` dijalankan ulang sebagai rebuild verifikasi
  (pola yang sama dipakai di checkpoint recovery sebelumnya): versi naik
  dari `kw99-sesi25-fix-gdrive-backup-await-30` (`?v=443`) ke
  `kw99-sesi25-fix-gdrive-backup-await-31` (**`?v=444`**). Sinkronisasi
  versi di 6 file source lolos, `index.html`/`app_production.html`
  identik, `docs/FILE-MAP.md` diregenerasi (130 file, 1200 identifier).
  `esbuild` tetap tidak tersedia di sandbox ini (tanpa akses internet) —
  bundle tidak diminify, tapi valid secara sintaks.
- Tidak ada kode implementasi yang diubah selain versi build (murni
  rebuild verifikasi, tanpa perubahan logika).
- Dokumentasi (`docs/CLAUDE.md`, `IMPLEMENTATION_STATUS.md`,
  `ROADMAP.md`, `TODO.md`) diperbarui untuk mencatat checkpoint ini.
- ZIP rilis baru di-generate dari state pasca-build `?v=444`.

**Untuk sesi berikutnya:** tetap TODO.md #2 — Dashboard/nav wiring
`dailyBriefing()` (butuh keputusan produk).

## Sesi 16 — 2026-07-18 — Dashboard/nav wiring `dailyBriefing()` (TODO.md #2)

Keputusan produk: kartu baru `AIDailyBriefingCard` ditaruh DI BAWAH
`AIRecommendCard` (`#aiBriefingBody`, di dalam kartu "🧭 Penasihat" > tab
"🩺 Insight Cepat") — reuse container/pola yang sama persis (guard
`typeof`, fire-and-forget dari `renderDashboard()`, sembunyikan diri
kalau tidak ada apa pun buat ditampilkan), BUKAN halaman/route baru.
Beda dari `AIRecommendCard`: murni ringkasan display (jumlah keputusan
AI terbaru + ringkasan pengiriman kalau ada order Cobek pending), TIDAK
ada tombol/interaksi, jadi TIDAK butuh localStorage dismiss.

**Sumber data:** `AIService.dailyBriefing({limit:5})` — method ini
sudah ada sejak Sesi 2 tapi "senyap" (belum pernah dipanggil dari UI
mana pun). Murni MEMBACA (tidak memicu evaluasi rule baru, tidak
menulis apa pun ke store), aman dipanggil tiap render Beranda.

**File yang berubah:**
- `ai-chat.js` — `AIDailyBriefingCard` baru (setelah `AIRecommendCard`,
  sebelum `AIWidget`). `render()`: ambil briefing, kosongkan body kalau
  `!decisionCount && !deliverySummary` (tidak ada apa pun buat
  ditampilkan), kalau ada tulis "N keputusan AI terbaru tercatat" +
  (kalau ada `deliverySummary`) baris ringkasan order Cobek pending
  (`#id` + estimasi penjualan dari `deliverySummary.profit.totalPenjualan`,
  fallback 0 kalau `profit` null).
- `modules/shared/modules-render.js` — 1 baris di `renderDashboard()`:
  `if(typeof AIDailyBriefingCard!=='undefined')AIDailyBriefingCard.render();`
  (persis di bawah pemanggilan `AIRecommendCard.render()`).
- `app-bootstrap.js` — `AIDailyBriefingCard` ditambahkan ke
  `Object.assign(window,{...})` (window-expose-audit lolos, tidak perlu
  perbaikan ulang seperti Sesi 14).
- `index.html` & `app_production.html` — `<div id="aiBriefingBody">`
  ditambahkan tepat di bawah `<div id="aiRecommendBody">`.
- `tests/ai-daily-briefing-card.test.js` (baru, 8 test) — body
  dikosongkan kalau tidak ada keputusan & tidak ada deliverySummary,
  tidak error kalau `AIService` belum ter-load, tidak error kalau
  `dailyBriefing()` melempar error atau balik null, jumlah keputusan
  tertulis dgn benar, ringkasan deliverySummary (sourceOrderId +
  totalPenjualan) tertulis dgn benar (termasuk saat `profit` null →
  fallback 0), dan `dailyBriefing()` dipanggil dgn `{limit:5}`.

**Diverifikasi:**
- `node --test tests/ai-daily-briefing-card.test.js` → 8/8 pass duluan
  sebelum full suite.
- `node --test tests/*.test.js` penuh → **2196/2196 pass, 0 fail** (naik
  dari 2188 sebelum sesi ini — 8 test baru).
- `node --test tests/window-expose-audit.test.js` → lolos dari awal,
  `AIDailyBriefingCard` langsung ke-expose dgn benar (beda dari Sesi 14
  yang sempat lupa 1x).
- `node --check` lolos di `ai-chat.js`, `modules/shared/modules-
  render.js`, `app-bootstrap.js`.
- `node scripts/build.js` → sukses, versi naik ke build `kw99-sesi25-
  fix-gdrive-backup-await-32` (`?v=445`, dari `?v=444`). 3 lint-guard
  bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1201 identifier — naik 1 dari
  `AIDailyBriefingCard`).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2196/2196 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Smoke-test browser manual belum dijalankan (tidak ada browser di
  sandbox ini) — disarankan dicoba manual (`?dev=1`, buka Beranda, cek
  kartu "📋 Ringkasan Harian AI" muncul di bawah "🤖 Rekomendasi AI" kalau
  ada keputusan AI terbaru atau order Cobek pending, dan TIDAK muncul
  sama sekali kalau keduanya kosong) sebelum rilis produksi.

**Yang belum (di luar scope item #2 ini):** kartu ini murni display,
belum ada link/tombol buka detail (mis. ke laporan Cobek order terkait)
— bisa jadi lanjutan kalau dibutuhkan.

**Untuk sesi berikutnya:** TODO.md #3 — `AIService.healthCheck()`
tambah Duplicate Detection (paling murah dari 5 sub-item Tahap 8).

## Sesi 17 — 2026-07-18 — `healthCheck()` Duplicate Detection (TODO.md #3)

Tahap 8, sub-item paling murah dari 5 (Storage Audit/Dead Code
Detection/Broken Reference/Duplicate Detection/Performance Check).

**2 helper baru di `ai-service.js`** (murni baca, non-invasif — sama
prinsip dgn `healthCheck()` sendiri):
- `_aiFindDuplicateRuleIds()` — iterasi `AIDecision.rules.getAll()`
  (array `_rules`), hitung id yang muncul >1x. Normalnya SELALU
  kosong krn `rules.register()` (ai-decision-engine.js) sudah menolak
  id yang sudah ada (`this._rules.some(r=>r.id===rule.id)) return
  false`) — deteksi ini murni jaring pengaman kalau suatu saat ada
  jalur lain yang menambah ke `_rules` tanpa lewat `register()`.
- `_aiFindDuplicateRecommendations()` — beda kasus: `AIDecision.
  recommend._map` adalah OBJECT keyed by id, jadi id-nya sendiri
  TIDAK MUNGKIN dobel (key object unik by definisi bahasa). Yang
  dicek justru KONTEN: kalau 2+ id BERBEDA punya `label`+`target`
  PERSIS SAMA, itu indikasi 2 modul domain tidak sengaja mendaftarkan
  rekomendasi yang sama 2x dgn id berbeda (redundan, bukan bug fatal
  tapi berguna dibersihkan). `label` sama tapi `target` beda TIDAK
  dianggap duplikat (dicek dgn `JSON.stringify([label,target])`
  sebagai key pengelompokan).

**`healthCheck()` diubah:** 2 field baru di `checks` —
`duplicateRuleIds` (array id) & `duplicateRecommendations` (array
`{label,target,ids}`). Keduanya INFORMASIONAL, TIDAK menjatuhkan `ok`
ke `false` (pola sama dgn `rulesRegistered`/`recommendationsRegistered`
— hanya error struktural di blok try/catch yang menjatuhkan `ok`).

**File yang berubah:** `modules/ai/ai-service.js` (2 helper baru +
`healthCheck()` diubah), `tests/ai-service.test.js` (2 test lama
ditambah assert field baru, 3 test baru: `duplicateRuleIds` tetap
kosong walau `register()` dipanggil 2x id sama krn ditolak duluan,
`duplicateRecommendations` mendeteksi 2 id beda dgn label+target sama,
label sama tapi target beda TIDAK dianggap duplikat).

**Diverifikasi:**
- `node --test tests/ai-service.test.js` → 19/19 pass duluan sebelum
  full suite.
- `node --test tests/*.test.js` penuh → **2199/2199 pass, 0 fail**
  (naik dari 2196 sebelum sesi ini — 3 test baru).
- `node --check` lolos di `modules/ai/ai-service.js`.
- `node scripts/build.js` → sukses, versi naik ke build `kw99-sesi25-
  fix-gdrive-backup-await-33` (`?v=446`, dari `?v=445`). 3 lint-guard
  bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1203 identifier — naik 2, `_aiFindDuplicate
  RuleIds`/`_aiFindDuplicateRecommendations`).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2199/2199 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Tidak ada perubahan UI (murni facade + health-check data), jadi
  tidak ada smoke-test browser tambahan yang relevan buat item ini.

**Yang belum (di luar scope item #3 ini):** belum ada widget UI yang
menampilkan hasil `healthCheck()` (masih dipanggil manual lewat
console/test) — 4 sub-item lain Tahap 8 (Storage Audit/Dead Code
Detection/Broken Reference/Performance Check) juga belum ada.

**Untuk sesi berikutnya:** belum ada item baru yang secara eksplisit
disepakati — TODO.md perlu direview ulang (Tahap 8 sub-item lain,
atau lanjut ke item lain dari `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`
yang persentasenya masih rendah, mis. Tahap 6 `getConfidence()` buat
menimbang urutan tampil rekomendasi).

## Sesi 18 — 2026-07-18 — `healthCheck()` Dead Code Detection (TODO.md #4)

**Konteks:** Checkpoint recovery sesi terputus (kuota habis) — Build
#439/2199-test-pass/v446 diverifikasi ulang dulu (tanpa perubahan
kode), baru user memilih prioritas berikutnya lewat pilihan eksplisit
dari 5 opsi (Storage Audit/Dead Code Detection/Broken Reference/
Performance Check/`getConfidence()`): **Dead Code Detection** dipilih.

**Definisi "dead code" yang dipakai** (TODO.md #4 tidak menspesifikasi
detail, jadi diputuskan sesi ini): rule yang TERDAFTAR di
`AIDecision.rules._rules` (lolos `validateAIRuleShape()` + tidak
duplikat id) tapi `enabled===false` — `rules.evaluate()` skip rule
ini di baris paling atas loop-nya (`if (!rule.enabled) continue`, lihat
ai-decision-engine.js), jadi `condition()`/`action()`-nya TIDAK PERNAH
dijalankan lewat `decide()`/`simulate()` manapun. Ini beda dari
"Broken Reference" (sub-item Tahap 8 lain yang BELUM dikerjakan —
itu soal rule yang mengacu `recommendationId` yang tidak terdaftar di
`AIDecision.recommend`, bukan soal rule yang tidak pernah jalan).

**Yang selesai:**
- `_aiFindDeadRuleIds()` (helper baru, `modules/ai/ai-service.js`) —
  `AIDecision.rules.getAll().filter(r=>r.enabled===false).map(r=>r.id)`.
  Murni baca, tidak menulis apa pun.
- `healthCheck().checks.deadRuleIds` (array id) — diisi dari helper di
  atas, di blok try yang sama dgn `duplicateRuleIds`/
  `duplicateRecommendations`. INFORMASIONAL, TIDAK menjatuhkan `ok` ke
  `false` (pola identik dgn 2 field duplikat Sesi 17).
- Test baru di `tests/ai-service.test.js`: (1) deteksi 1 rule
  `enabled:false` di antara rule aktif lain, (2) semua rule enabled ->
  kosong, (3) rule `enabled:false` yang di-`unregister()` TIDAK ikut
  muncul (krn sudah hilang dari registry, bukan cuma dinonaktifkan).
  2 test lama (`healthCheck` kondisi normal & 0-rule) ditambah assert
  field baru.
- **Catatan teknis test (bukan bug produksi):** assertion `deadRuleIds`
  pakai `JSON.stringify(...)` comparison, BUKAN `assert.deepEqual`
  langsung — karena array hasil `AIDecision.rules.getAll().filter().
  map()` berasal dari realm `vm` sandbox test harness (`tests/helpers/
  loadSource.js`), beda `Array.prototype` dgn `[]` literal di file test
  (Node `assert.deepStrictEqual` membandingkan reference realm, bukan
  cuma struktur). `duplicateRuleIds`/`duplicateRecommendations` (Sesi
  17) kebetulan LOLOS `deepEqual` langsung krn rantainya mulai dari
  `Object.keys()` (fungsi realm utama yang di-inject ke sandbox),
  sementara `deadRuleIds` mulai dari `_rules.slice()` (array literal
  YANG DIBUAT di dalam sandbox) — beda titik awal realm. Sudah ada
  preseden pola ini di codebase: test `duplicateRecommendations` juga
  pakai `JSON.stringify` buat field `ids` persis karena alasan yang
  sama. TIDAK ada perubahan apa pun ke kode produksi untuk isu ini —
  murni cara assert di test.

**File yang berubah:** `modules/ai/ai-service.js` (1 helper baru +
`healthCheck()` diubah), `tests/ai-service.test.js` (2 test lama
ditambah assert field baru, 3 test baru).

**Diverifikasi:**
- `node --test tests/ai-service.test.js` → 22/22 pass duluan sebelum
  full suite (5 gagal di percobaan pertama krn isu realm di atas,
  diperbaiki di assertion test, BUKAN kode produksi, lalu 22/22 pass).
- `node --test tests/*.test.js` penuh → **2202/2202 pass, 0 fail**
  (naik dari 2199 sebelum sesi ini — 3 test baru).
- `node --check` lolos di `modules/ai/ai-service.js` &
  `tests/ai-service.test.js`.
- `node scripts/build.js` → sukses, versi naik ke build `kw99-sesi25-
  fix-gdrive-backup-await-34` (`?v=447`, dari `?v=446`). 3 lint-guard
  bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1204 identifier — naik 1, `_aiFindDeadRuleIds`).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2202/2202 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Tidak ada perubahan UI (murni facade + health-check data), jadi
  tidak ada smoke-test browser tambahan yang relevan buat item ini.

**Yang belum (di luar scope item #4a ini):** belum ada widget UI yang
menampilkan hasil `healthCheck()` (masih dipanggil manual lewat
console/test) — 3 sub-item lain Tahap 8 (Storage Audit/Broken
Reference/Performance Check) juga belum ada.

**Untuk sesi berikutnya:** belum ada item baru yang secara eksplisit
disepakati — TODO.md item 4b perlu direview ulang (3 sub-item Tahap 8
sisa), atau lanjut ke Tahap 6 `getConfidence()` (menimbang urutan
tampil rekomendasi).

## Sesi 19 — 2026-07-18 — Tahap 6: `getConfidence()` dipakai buat urutan tampil rekomendasi (TODO.md #5)

**Konteks:** User memilih dari 4 opsi (Storage Audit/Broken
Reference/Performance Check — 3 sub-item Tahap 8 sisa — atau Tahap 6
`getConfidence()`): **`getConfidence()`** dipilih.

**Kenapa ini bukan Tahap 8:** ketiga sub-item Health Check (Storage
Audit/Broken Reference/Performance Check) masih murni diagnostik
tambahan tanpa efek ke UI. Item ini beda — `getConfidence()`
(`AIDecision.learn`, sudah ada sejak Tahap 6 awal) sebelumnya HANYA
pernah dipanggil dari test unit (`tests/ai-decision-engine.test.js`),
tidak pernah dipakai di jalur produk manapun — persis seperti
`recordOutcome()` sebelum Sesi 14.

**Desain skor gabungan (keputusan diambil sesi ini, TODO.md tidak
menspesifikasi rumus):** `AIRecommendCard.render()` (`ai-chat.js`)
sekarang, sebelum memotong ke 2 kartu teratas, mengurutkan rekomendasi
descending berdasar `score = r.confidence * learnedConfidence`:
- `r.confidence` — sudah ada di output `formatRecommendation()`
  (`ai-decision-engine.js`), proxy dari `weight` rule (1-10 → 0.1-1.0).
  Ini sinyal "seberapa penting rule-nya menurut yang mendaftarkan".
- `learnedConfidence` — `AIDecision.learn.getConfidence(ruleId)`, rasio
  adaptif accepted/(accepted+rejected) dari histori Terima/Abaikan user
  per rule, default 0.5 (netral) kalau belum ada histori.
- Perkalian (bukan rata-rata/max) dipilih supaya rule dengan histori
  BURUK (learnedConfidence rendah) tetap turun peringkat meski
  weight-nya tinggi — 1 sinyal buruk cukup menekan skor, bukan
  "ditutupi" oleh sinyal lain yang bagus. Kalau salah satu 0 (mis. rule
  yang SELALU ditolak user), skor jadi ~0 → praktis selalu di bawah.

**Guard ganda (non-invasif, additive):**
1. Kalau `AIDecision.learn.getConfidence` tidak ada sebagai function
   (mock/versi `AIDecision` lama) — sorting di-skip sama sekali, array
   `recommendations` dipakai APA ADANYA (urutan trigger asli dari
   `decide()`), TIDAK error. Ini juga yang bikin test lama
   (`tests/ai-recommend-card.test.js`, mock `AIDecision.learn` tanpa
   `getConfidence`) tetap lolos tanpa diubah sama sekali.
2. Kalau `getConfidence()` melempar error untuk salah satu rule (mis.
   IndexedDB gagal) — `Promise.all` reject, ditangkap try/catch,
   sorting DIBATALKAN untuk seluruh render() ini (fallback ke urutan
   asli), TIDAK melempar ke pemanggil.

**Kenapa di `AIRecommendCard.render()` (UI), bukan di
`formatRecommendation()` (engine):** `formatRecommendation()` sengaja
sync (dipakai juga oleh Daily Briefing/Simulation yang tidak semuanya
butuh urutan berbobot histori) — komentar di kode itu sendiri sudah
bilang "konsumen yang butuh confidence adaptif tetap bisa panggil
`learn.getConfidence()` terpisah". `AIRecommendCard.render()` sudah
async (memanggil `decide()` yang juga async) dan SATU-SATUNYA konsumen
yang benar-benar menampilkan urutan ke user lalu memotongnya ke top-N —
tempat paling tepat buat sorting ini tanpa mengubah kontrak
`formatRecommendation()`/`decide()` yang dipakai modul lain.

**File yang berubah:** `ai-chat.js` (`AIRecommendCard.render()`,
sorting ditambahkan sebelum `slice(0,2)`), `tests/ai-recommend-
card.test.js` (mock `AIDecision.learn` ditambah opsi
`getConfidenceImpl`, 3 test baru: urutan berubah sesuai skor gabungan,
fallback ke urutan asli kalau `getConfidence` tidak ada, fallback kalau
`getConfidence()` throw).

**Diverifikasi:**
- `node --test tests/ai-recommend-card.test.js` → 10/10 pass (7 lama +
  3 baru) duluan sebelum full suite.
- `node --test tests/*.test.js` penuh → **2205/2205 pass, 0 fail**
  (naik dari 2202 sebelum sesi ini).
- `node --check` lolos di `ai-chat.js` & `tests/ai-recommend-
  card.test.js`.
- `node scripts/build.js` → sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-35` (`?v=448`, dari `?v=447`). 3
  lint-guard bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1204 identifier — tidak ada identifier global
  baru krn `AIRecommendCard` sudah terdaftar sejak Sesi 14, perubahan
  murni di dalam method `render()` yang sudah ada).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2205/2205 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Tidak ada perubahan kontrak field (`confidence` tetap 0.1-1.0 dari
  weight, TIDAK diganti nilainya) — murni urutan tampil yang berubah,
  jadi tidak ada smoke-test browser tambahan yang wajib di luar unit
  test.

**Yang belum:** skor gabungan (perkalian) adalah keputusan desain sesi
ini, belum ada mekanisme buat user melihat/mengatur skor ini secara
eksplisit (masih implisit lewat urutan tampil saja). 3 sub-item Tahap 8
(Storage Audit/Broken Reference/Performance Check) juga masih ❌.

**Untuk sesi berikutnya:** belum ada item baru yang secara eksplisit
disepakati — TODO.md item 4b (3 sub-item Tahap 8 sisa) masih jadi
kandidat utama.

## Sesi 20 — 2026-07-18 — `healthCheck()` Broken Reference (TODO.md #4c)

**Konteks:** User diminta memilih salah satu dari 3 sub-item Tahap 8
sisa (Storage Audit/Broken Reference/Performance Check) tanpa
menyebutkan yang mana secara spesifik ("kerjakan salah satunya dulu").
**Broken Reference** dipilih krn paling konsisten dgn 2 sub-item yang
sudah selesai (Duplicate/Dead Code Detection) — sama-sama field array
informasional yang dibaca dari state `AIDecision` yang sudah ada, tanpa
butuh infrastruktur baru (beda dgn Performance Check yang butuh timing
instrumentation, atau Storage Audit yang scope-nya lebih lebar/belum
jelas definisinya).

**Definisi "Broken Reference" yang dipakai** (mengikuti catatan Sesi
18 yang sudah membedakannya dari Dead Code Detection): `recommendationId`
yang PERNAH dihasilkan rule (tercatat di `store.decisionLog`, hasil
`rule.action(ctx)` nyata lewat `AIDecision.decide()`) tapi
`AIDecision.recommend.getById(recommendationId)` tidak menemukan
definisinya — artinya modul domain yang seharusnya `register()`
rekomendasi itu belum/tidak lagi terdaftar (mis. file belum di-load,
atau id-nya berubah tanpa update rule).

**Kenapa baca `decisionLog` (histori), BUKAN menjalankan ulang rule:**
`recommendationId` cuma diketahui dari HASIL `rule.action(ctx)` — baru
ada setelah `rule.condition(ctx)` true & action() benar-benar
dieksekusi dgn ctx nyata (lihat `rules.evaluate()` di
`ai-decision-engine.js`). Tidak bisa dibaca statis dari definisi rule
sebelum dijalankan. `decisionLog` sudah menyimpan histori ini (SATU-
SATUNYA penulis: `AIDecision.decide()`), jadi dipakai ulang — bukan
memanggil `evaluate()`/`decide()` lagi di dalam `healthCheck()` sendiri
(yang butuh ctx domain nyata & efek samping menandai cooldown, tidak
cocok utk pemeriksaan read-only yang harus aman dipanggil kapan saja).

**Yang selesai:**
- `_aiFindBrokenRecommendationRefs()` (helper baru,
  `modules/ai/ai-service.js`) — iterasi `store.decisionLog`, dedup by
  `recommendationId`, cek tiap id unik lewat
  `AIDecision.recommend.getById()`, kembalikan id yang tidak resolve.
  Murni baca, tidak menulis apa pun.
- `healthCheck().checks.brokenRecommendationRefs` (array id) — diisi
  dari helper di atas, di blok try yang sama dgn 3 field Tahap 8
  lainnya. INFORMASIONAL, TIDAK menjatuhkan `ok` ke `false` (pola
  identik dgn `duplicateRuleIds`/`duplicateRecommendations`/
  `deadRuleIds`).
- Test baru di `tests/ai-service.test.js`: (1) deteksi 1
  `recommendationId` broken dari decisionLog nyata (hasil `decide()`
  sungguhan, bukan mock), (2) kosong kalau `recommendationId` terdaftar,
  (3) kosong kalau belum pernah `decide()` sama sekali (decisionLog
  kosong), (4) dedup — 2 rule berbeda yang sama-sama menghasilkan
  `recommendationId` broken yang SAMA di 1 `decide()` cuma dihitung
  sekali. 2 test lama (`healthCheck` kondisi normal & 0-rule) ditambah
  assert field baru.
- **Catatan teknis test (bukan bug produksi, preseden sama dgn
  `deadRuleIds` Sesi 18):** assertion `brokenRecommendationRefs` pakai
  `JSON.stringify(...)` comparison, BUKAN `assert.deepEqual` langsung —
  array hasil helper berasal dari realm `vm` sandbox test harness
  (`tests/helpers/loadSource.js`), beda `Array.prototype` dgn `[]`
  literal di file test.

**File yang berubah:** `modules/ai/ai-service.js` (1 helper baru +
`healthCheck()` diubah), `tests/ai-service.test.js` (2 test lama
ditambah assert field baru, 4 test baru).

**Diverifikasi:**
- `node --test tests/ai-service.test.js` → 26/26 pass (2 gagal di
  percobaan pertama krn isu realm di atas pada 2 assertion baseline,
  diperbaiki di assertion test — BUKAN kode produksi — lalu 26/26 pass)
  duluan sebelum full suite.
- `node --test tests/*.test.js` penuh → **2209/2209 pass, 0 fail**
  (naik dari 2205 sebelum sesi ini — 4 test baru).
- `node --check` lolos di `modules/ai/ai-service.js` &
  `tests/ai-service.test.js`.
- `node scripts/build.js` → sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-36` (`?v=449`, dari `?v=448`). 3
  lint-guard bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1205 identifier — naik 1,
  `_aiFindBrokenRecommendationRefs`).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2209/2209 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Tidak ada perubahan UI (murni facade + health-check data), jadi tidak
  ada smoke-test browser tambahan yang relevan buat item ini.

**Yang belum (di luar scope item #4c ini):** 2 sub-item Tahap 8 sisa
(Storage Audit/Performance Check) masih ❌. Belum ada widget UI yang
menampilkan hasil `healthCheck()` (masih dipanggil manual lewat
console/test) — konsisten dgn keterbatasan yang sama sejak Sesi 17/18.

**Untuk sesi berikutnya:** belum ada item baru yang secara eksplisit
disepakati — TODO.md item 4d (Storage Audit / Performance Check) perlu
dipilih user.

## Sesi 21 — 2026-07-18 — `healthCheck()` Storage Audit (TODO.md #4d)

**Konteks:** User diminta memilih salah satu dari 2 sub-item Tahap 8
sisa (Storage Audit/Performance Check) tanpa menyebutkan yang mana
secara spesifik ("kerjakan salah satunya"). **Storage Audit** dipilih
krn masih konsisten dgn pola 4 field health-check yang sudah ada
(field array/object informasional yang dibaca dari state yang sudah
ada, tanpa infrastruktur baru) — beda dgn Performance Check yang
kemungkinan butuh timing instrumentation baru (mis. bungkus
`rules.evaluate()` dgn pengukuran durasi), scope-nya perlu diperjelas
dulu di sesi lain.

**Definisi "Storage Audit" yang dipakai:** cek 2 object di `AIStore`
yang keyed by `ruleId` — `ruleCooldowns` (diisi `_markCooldown()` tiap
rule trigger nyata lewat `decide()`) & `learningData` (diisi
`AIDecision.learn.recordOutcome()`) — buat entry yang `ruleId`-nya
TIDAK/TIDAK LAGI ada di `AIDecision.rules.getAll()`. Ini soal *storage
leak*: `rules.unregister(id)` HANYA menghapus dari array `_rules`,
TIDAK PERNAH ikut membersihkan `ruleCooldowns`/`learningData` — jadi
kalau modul domain yang dulu `register()` sebuah rule kemudian
di-refactor/dihapus, jejak cooldown & data pembelajarannya tertulis
selamanya di `AIStore` (persisten di IndexedDB lewat `aiSave()`).

**Beda dari Dead Code Detection (Sesi 18):** itu soal rule yang MASIH
terdaftar tapi `enabled:false` (definisi rule-nya masih ada, cuma tidak
pernah dievaluasi). Storage Audit ini soal rule yang SUDAH TIDAK
terdaftar sama sekali (definisinya sudah hilang lewat `unregister()`)
tapi jejaknya masih ada di 2 object storage tadi — kasus & sumber data
yang sama sekali berbeda, makanya jadi field terpisah, bukan digabung
ke `deadRuleIds`.

**Kenapa TIDAK auto-cleanup di helper ini:** murni deteksi/baca, tidak
menghapus entry apa pun. Menghapus entry `learningData` berarti
membuang histori accepted/rejected/ignored rule tsb secara permanen —
itu keputusan produk (apakah histori lama masih relevan kalau rule-nya
suatu saat di-register() ulang dgn id yang sama) yang belum diminta
user, jadi disengaja dibiarkan murni informasional dulu (pola sama dgn
3 field Tahap 8 lain — `duplicateRuleIds`/`deadRuleIds`/
`brokenRecommendationRefs` — semuanya juga tidak auto-fix apa pun).

**Yang selesai:**
- `_aiFindOrphanedStorageKeys()` (helper baru,
  `modules/ai/ai-service.js`) — ambil `Set` id rule terdaftar dari
  `AIDecision.rules.getAll()`, filter `Object.keys(store.ruleCooldowns)`
  & `Object.keys(store.learningData)` yang tidak ada di set itu.
  Kembalikan `{ orphanedCooldownRuleIds, orphanedLearningDataRuleIds }`.
  Murni baca, tidak menulis apa pun.
- `healthCheck().checks.orphanedStorageKeys` (object 2 array) — diisi
  dari helper di atas, di blok try yang sama dgn 4 field Tahap 8
  lainnya. INFORMASIONAL, TIDAK menjatuhkan `ok` ke `false` (pola
  identik dgn 4 field lain).
- Test baru di `tests/ai-service.test.js`: (1) kosong kalau rule yang
  trigger & dapat feedback masih terdaftar, (2) mendeteksi kedua field
  (`ruleCooldowns` & `learningData`) sekaligus kalau rule-nya sudah
  `unregister()`, (3) 2 rule di-unregister tapi cuma 1 yang pernah dapat
  feedback → `orphanedCooldownRuleIds` isi 2 id, `orphanedLearningDataRuleIds`
  isi 1 id saja (2 field independen, tidak saling menyalin), (4) kosong
  kalau belum pernah ada rule trigger/feedback sama sekali (storage
  masih default kosong). 2 test lama (`healthCheck` kondisi normal &
  0-rule) ditambah assert field baru.
- **Catatan teknis test (bukan bug produksi, preseden sama dgn
  `deadRuleIds`/`brokenRecommendationRefs` sesi sebelumnya):** assertion
  `orphanedStorageKeys` pakai `JSON.stringify(...)` comparison, BUKAN
  `assert.deepEqual` langsung — object/array hasil helper berasal dari
  realm `vm` sandbox test harness (`tests/helpers/loadSource.js`), beda
  `Object`/`Array.prototype` dgn literal di file test biarpun isinya
  identik.

**File yang berubah:** `modules/ai/ai-service.js` (1 helper baru +
`healthCheck()` diubah), `tests/ai-service.test.js` (2 test lama
ditambah assert field baru, 4 test baru).

**Diverifikasi:**
- `node --test tests/ai-service.test.js` → 30/30 pass (5 gagal di
  percobaan pertama krn isu realm di atas pada semua assertion baru yang
  sempat pakai `assert.deepEqual`, diperbaiki jadi `JSON.stringify` —
  BUKAN kode produksi — lalu 30/30 pass) duluan sebelum full suite.
- `node --test tests/*.test.js` penuh → **2213/2213 pass, 0 fail**
  (naik dari 2209 sebelum sesi ini — 4 test baru).
- `node scripts/build.js` → sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-37` (`?v=450`, dari `?v=449`). 3
  lint-guard bawaan lolos, kedua bundle lolos `node --check` sintaks,
  `index.html`/`app_production.html` tetap identik, `docs/FILE-MAP.md`
  diregenerasi (130 file, 1206 identifier — naik 1,
  `_aiFindOrphanedStorageKeys`).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2213/2213 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- Tidak ada perubahan UI (murni facade + health-check data), jadi tidak
  ada smoke-test browser tambahan yang relevan buat item ini.

**Yang belum (di luar scope item #4d ini):** 1 sub-item Tahap 8 terakhir
(Performance Check) masih ❌ — Tahap 8 akan 100% kalau itu selesai.
Belum ada cleanup otomatis utk entry orphan yang terdeteksi (disengaja,
lihat alasan di atas) & belum ada widget UI yang menampilkan hasil
`healthCheck()` (masih dipanggil manual lewat console/test) —
konsisten dgn keterbatasan yang sama sejak Sesi 17/18/20.

**Untuk sesi berikutnya:** belum ada item baru yang secara eksplisit
disepakati — TODO.md item 4e (Performance Check, sub-item Tahap 8
terakhir) adalah kandidat utama, tapi scope-nya (apa yang diukur, cara
instrumentasinya) perlu diperjelas user dulu sebelum dikerjakan.

## Sesi 22 — 2026-07-18 — Tahap 2 Registry (TODO.md #6) — IMPLEMENTATION MODE

**Nomor sesi:** 22
**Tanggal:** 2026-07-18

**Target:** User beralih ke mode "IMPLEMENTATION MODE" eksplisit —
peran Software Engineer melanjutkan project existing (bukan Architect),
prioritas ditentukan dari urutan tahap tetap (Tahap 2 > 4 > 5 > 6 > 7 >
8), BUKAN dari kalimat "prioritas berikutnya" di catatan sesi
sebelumnya (yang mengarah ke Tahap 8 #4e Performance Check). Dicek
`IMPLEMENTATION_STATUS.md`: Tahap 2 (Integration) 45%, belum 100%, jadi
prioritas #1 di urutan yang diberikan. Dipecah ke sub-item terkecil
lewat `ROADMAP.md` Tahap 2 checklist — 3 item belum ☑ (Registry/
Navigation wiring/Router wiring). **Registry** dipilih krn paling
kecil & paling jelas definisinya: murni tambah data ke file registry
yang sudah ada (`dashboard-hub-registry.js`), TIDAK butuh infrastruktur
navigasi baru seperti 2 item lainnya (yang scope-nya belum jelas —
"Navigation wiring"/"Router wiring" apa persisnya di luar `showPage()`/
`FEATURE_REGISTRY` yang sudah ada, butuh klarifikasi user).

**Temuan (dari baca kode, bukan tebakan):** `FEATURE_REGISTRY` kategori
`ai` (label "AI") sudah ada tapi isinya fitur BEDA subsistem (chat/
kategorisasi transaksi/scan OCR) — bukan Smart Delivery Engine
(`modules/ai/*`, `AIService`) yang jadi fokus Sesi 15-21. Permukaan UI
nyata dari `AIService` — `AIRecommendCard` (render ke `#aiRecommendBody`)
& `AIDailyBriefingCard` (render ke `#aiBriefingBody`), keduanya di
`ai-chat.js`, keduanya sub-bagian DI DALAM kartu `advisorCard` di
`page-dashboard-hub` — HANYA terdaftar 1x secara generik lewat entry
`dash-penasihat` (kategori `dashboard`, target `goTo:'advisorCard'`).
Konsekuensinya: pencarian dgn kata kunci spesifik (mis. "rekomendasi
ai"/"ringkasan harian") tidak nemu entry yang cocok, cuma cocok ke
label generik "Penasihat AI" kalau kebetulan match.

**Yang selesai:**
- `modules/dashboard-hub/dashboard-hub-registry.js` — 2 entry baru DI
  DALAM kategori `dashboard` (bukan kategori baru, bukan file baru),
  ditaruh tepat setelah `dash-penasihat` supaya urutannya masuk akal
  (induk dulu baru sub-bagian):
  - `dash-ai-rekomendasi` — label "Rekomendasi AI", target
    `{page:'dashboard-hub', goTo:'aiRecommendBody'}`.
  - `dash-ai-ringkasan-harian` — label "Ringkasan Harian AI", target
    `{page:'dashboard-hub', goTo:'aiBriefingBody'}`.
  - Keduanya diverifikasi manual: id `aiRecommendBody`/`aiBriefingBody`
    ADA di `index.html` DAN `app_production.html` (masing-masing 1x),
    dan keduanya berada DI DALAM blok `id="page-dashboard-hub"` (bukan
    cuma sama-sama ada di HTML — dicek posisi baris manual: page dimulai
    baris 2270, kedua id di baris 2517-2518, jauh di dalam blok).
- **TIDAK ada helper/function baru** — file ini MURNI DATA (sesuai
  aturan komentar header file: "MURNI DATA, tidak ada logic render/
  navigasi apa pun"), konsisten dgn rule "jangan duplicate
  function"/"jangan arsitektur baru".
- **TIDAK ada test baru ditulis** — 12 test generik yang SUDAH ADA di
  `tests/dashboard-hub-registry.test.js` (struktur dasar, key unik
  global, target.page/tab/subtab/goTo/group/dashKey/action valid, 10
  kategori blueprint) semuanya iterasi `FEATURE_REGISTRY` secara
  generik lewat `collectNavEntries()` — otomatis ikut memvalidasi 2
  entry baru tanpa perlu ditambah test, dan memang lolos (lihat hasil
  test di bawah). Menambah test khusus per-entry akan jadi duplikasi
  krn tidak ada 1 pun preseden test khusus per-`f.key` di file test ini
  (semua test lain di project juga sudah cek — `dash-penasihat` dkk
  TIDAK punya test individual).
- Konsumen `FEATURE_REGISTRY` lain (`dashboard-hub-search.js`,
  `dashboard-hub-favorit-view.js`, `dashboard-hub.js` render sidebar &
  hitung `totalFeatures`) semuanya baca `FEATURE_REGISTRY` secara
  generik (loop/`.find()`/`.reduce()`), TIDAK ada hardcode jumlah/nama
  fitur di kode manapun — dicek lewat grep, tidak ada yang perlu diubah.

**File yang diubah:**
`modules/dashboard-hub/dashboard-hub-registry.js` (2 entry data baru).

**Hasil test:**
- `node --test tests/dashboard-hub-registry.test.js` → 12/12 pass
  (langsung lolos di percobaan pertama — tidak ada isu format target
  krn mengikuti pola persis 5 entry lain di kategori `dashboard`).
- `node --test tests/*.test.js` (full suite) → **2213/2213 pass, 0
  fail** (jumlah SAMA dgn sebelum sesi ini — tidak ada test baru
  ditambah, sesuai penjelasan di atas).

**Hasil build:**
- `node scripts/build.js` → sukses. 3 lint-guard bawaan lolos, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-38` (`?v=451`, dari `?v=450`).
  `docs/FILE-MAP.md` diregenerasi (130 file, 1206 identifier — TIDAK
  naik, krn tidak ada identifier/function baru, cuma data literal).
- `node --test tests/*.test.js` diulang SETELAH build → tetap
  2213/2213 pass, 0 regresi dari proses build itu sendiri.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- ZIP dibuat SEGERA setelah build sukses (sebelum update dokumentasi),
  sesuai urutan kerja wajib di `docs/SESSION_RULES.md` yang baru
  ditambahkan sesi ini.

**Progress:** Tahap 2 (Integration) naik dari 45% -> 55%. Lihat
`IMPLEMENTATION_STATUS.md`/`ROADMAP.md` utk detail per sub-item.

**Next TODO:** BELUM dipilih user — 2 kandidat: (a) TODO.md #6b, 2
sub-item Tahap 2 tersisa (Navigation wiring/Router wiring, scope perlu
diperjelas dulu), atau (b) TODO.md #4e, Tahap 8 Performance Check (sub-
item Tahap 8 terakhir, scope timing instrumentation juga perlu
diperjelas). Sesuai urutan prioritas tahap (2 sebelum 8), (a) yang jadi
kandidat utama KALAU scope-nya sudah bisa diperjelas user; kalau belum,
Tahap 2 dianggap "buntu sementara" & boleh lompat ke tahap berikutnya
yang scope-nya jelas.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku (belum berubah): `npm run lint`/`esbuild` tidak bisa dijalankan
di sandbox tanpa internet (di semua sesi sejak awal); 2 sub-item Tahap 2
(Navigation/Router wiring) & 1 sub-item Tahap 8 (Performance Check)
masih ❌, scope-nya sama-sama belum jelas & perlu keputusan produk user.


## Catatan kerja — 2026-07-18 (Sesi 23, IMPLEMENTATION MODE): Tahap 5 — Financial Summary

Konteks: LIFEOS IMPLEMENTATION MODE, urutan prioritas Tahap 2 > 4 > 5 >
6 > 7 > 8. Tahap 2 (Integration, 55%) sisa 2 sub-item (Navigation
wiring/Router wiring) — scope-nya TETAP belum jelas (dicatat sejak Sesi
22, TODO.md #6b), jadi TIDAK ditebak, dilewati sesuai aturan "kalau
butuh keputusan produk, STOP dan tanya dulu". Tahap 4: dicek
`ROADMAP.md`, SEMUA sub-item sudah checked, tidak ada yang bisa dikerjakan.
Tahap 5 (55% sebelum sesi ini) jadi target — 3 sub-item tersisa
(Daily Summary/Reminder Summary/Financial Summary), dipecah & dipilih
**Financial Summary** krn paling kecil & murni teknis (angkat data yang
sudah ada, bukan desain struktur/sumber data baru spt 2 lainnya).

**Yang dikerjakan:** `AIService.dailyBriefing()` (`modules/ai/ai-service.js`)
sekarang punya field top-level baru `financialSummary` — diangkat APA
ADANYA dari `context.finance` (`AIContext.snapshot()`, sudah ada sejak
Sesi 13, reuse `computeCashflowForecast()` TANPA rumus baru), pola SAMA
PERSIS dgn `deliverySummary` (Sesi 15) yang juga diangkat dari sumber
existing ke top-level biar gampang dikonsumsi UI tanpa harus masuk ke
`context.finance` nested. `null` kalau domain finance belum tersedia
(`context.finance.available===false`, mis. `tx-list-cashflow.js` belum
di-load) — TIDAK menebak/mereka-reka data. TIDAK ada fungsi/rumus baru,
TIDAK ada file baru, TIDAK ada duplikasi storage/event.

**File yang diedit:** `modules/ai/ai-service.js` (field baru +
komentar), `tests/ai-service.test.js` (helper `loadService` dapat opsi
`withFinance` yang memuat `modules/finance/tx-list-cashflow.js` +
`totalSaldoAkun` stub, pola sama dgn opsi `withLogistics` yang sudah
ada; 2 test baru: financialSummary terisi & sama persis dgn
`context.finance` saat tx-list-cashflow.js dimuat, financialSummary
null + tidak throw saat belum dimuat).

**Hasil test:**
- `node --test tests/ai-service.test.js` -> 32/32 pass.
- `node --test tests/*.test.js` (full suite) -> **2215/2215 pass, 0
  fail** (naik dari 2213 sebelum sesi ini, +2 test baru, 0 regresi).

**Hasil build:**
- `node scripts/build.js` -> sukses. 3 lint-guard bawaan lolos, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, versi naik ke build `kw99-sesi25-fix-gdrive-backup-await-39`
  (`?v=452`, dari `?v=451`). `docs/FILE-MAP.md` diregenerasi (130 file,
  1206 identifier — TIDAK naik krn `financialSummary` adalah field
  literal di dalam method yang sudah ada, bukan identifier top-level baru).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
  Bundle hasil build TANPA minifikasi (fallback otomatis, aman tapi
  lebih besar) — jalankan `npm install --save-dev esbuild` + `npm run
  lint` di lokal sebelum rilis produksi.
- ZIP dibuat SEGERA setelah build sukses (sebelum update dokumentasi ini),
  sesuai urutan kerja wajib di `docs/SESSION_RULES.md`.

**Progress:** Tahap 5 (AI Daily Briefing) naik dari 45% -> 55%. Lihat
`IMPLEMENTATION_STATUS.md`/`ROADMAP.md` untuk detail per sub-item.

**Next TODO:** BELUM dipilih user — 2 sub-item Tahap 5 tersisa (Daily
Summary terstruktur per bagian / Reminder Summary), keduanya
kemungkinan butuh keputusan produk (struktur pembagian & sumber data
reminder belum jelas) — perlu diperjelas user dulu. Alternatif: Tahap 2
#6b atau Tahap 8 #4e kalau scope-nya sudah bisa diperjelas duluan.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku (belum berubah): `npm run lint`/`esbuild` tidak bisa dijalankan
di sandbox tanpa internet; 2 sub-item Tahap 2 (Navigation/Router wiring),
2 sub-item Tahap 5 (Daily/Reminder Summary), & 1 sub-item Tahap 8
(Performance Check) semuanya belum, scope-nya perlu keputusan produk user.


## Catatan kerja — 2026-07-18 (Sesi 25, LIFEOS IMPLEMENTATION MODE): LIFEOS_GOAL_SOURCES → goal-adapter.js

Konteks: track terpisah dari Sesi 1-23 (Smart AI & Smart Logistics, lihat
`IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md` — sengaja TIDAK diubah
sesi ini karena scope-nya khusus AI/Logistics). Sesi 24 (di luar log ini)
membuat `area-adapter.js`/`today-adapter.js` registry-driven (iterasi
`LIFEOS_AREAS`/`LIFEOS_TODAY_SOURCES`, dispatch ke `*_BUILDERS` per key).
Prioritas Smart AI (Tahap 2/8) dicek dulu sebelum sesi ini — semua sisa
sub-item (Navigation/Router wiring, Performance Check) masih butuh
keputusan produk/arsitektur, jadi dipindah ke roadmap LifeOS sesuai
konfirmasi user: `LIFEOS_GOAL_SOURCES` → `goal-adapter.js`.

**Temuan audit:** `goal-adapter.js` SUDAH ada sebelumnya (3 sumber
di-hardcode: target/eduFund/wishlist), docstring-nya SUDAH mengaku
"Depends on: LIFEOS_GOAL_SOURCES" tapi kodenya TIDAK benar-benar membaca
array itu — beda dari klaim, mirip kondisi `area-adapter.js`/
`today-adapter.js` sebelum Sesi 24. `tests/lifeos-goal-adapter.test.js`
belum ada sama sekali (gap test, bukan cuma gap registry-wiring).

**Yang dikerjakan:** `goalAdapterList()` (`lifeos/adapters/goal-adapter.js`)
di-refactor jadi registry-driven — pola SAMA PERSIS dgn
`today-adapter.js`/`TODAY_SOURCE_BUILDERS`: iterasi `LIFEOS_GOAL_SOURCES`
(`lifeos-registry.js`), dispatch ke `GOAL_SOURCE_BUILDERS` berdasar `key`,
key tanpa builder terdaftar dilewati aman (tidak throw). 3 builder murni
hasil ekstraksi fungsi dari kode lama (`goalSourceTarget`/
`goalSourceEduFund`/`goalSourceWishlist`) — TIDAK ada perubahan logic,
TIDAK ada field baru, output sama persis dgn sebelumnya (urutan hasil
tetap target -> eduFund -> wishlist krn itu urutan ketiganya di
`LIFEOS_GOAL_SOURCES`).

**Builder pensiun/fi/debt SENGAJA TIDAK ditambah sesi ini:** diaudit
bentuk `D.pensiun`/`D.finansialFreedom` di `modules/shared/modules-calc.js`
— keduanya objek tunggal (bukan array), field-nya sudah bisa dipastikan
(`targetDana`/`accId` utk pensiun, `expenseCatIds`/`swr`/dst utk FI).
TAPI progress "current amount"-nya dihitung lewat `Pensiun.*`/`FI.*` yang
baca `D` dari CLOSURE MODUL masing-masing (bukan parameter `D` yang
di-pass ke adapter) — reuse langsung berarti adapter ini harus baca `D`
dari 2 sumber berbeda (parameter vs closure modul lain), melanggar pola
adapter murni yang testable lewat `loadSource` dgn `D` palsu, dan
termasuk "perubahan arsitektur" yang di luar scope sesi ini (aturan
`SESSION_RULES.md`: kalau butuh keputusan produk/arsitektur, STOP &
tanya dulu, jangan menebak). `D.debtStrategy` sendiri cuma
`{method, extra}` — bukan goal bertarget, tidak ada field amount/progress
sama sekali. Dicatat di `TODO.md` sbg item terbuka baru, bukan ditebak.

**File yang diedit:** `lifeos/adapters/goal-adapter.js` (refactor
registry-driven, murni ekstraksi fungsi + komentar, 0 perubahan output),
`tests/lifeos-goal-adapter.test.js` (BARU, 11 test: registry-driven
dispatch, key tanpa builder dilewati aman, reaktif thd perubahan
`LIFEOS_GOAL_SOURCES` runtime, tiap 3 sumber existing + edge case
progressPct, `goalAdapterFindOne()`).

**Hasil test:**
- `node --test tests/lifeos-goal-adapter.test.js` -> 11/11 pass (file baru).
- `node --test tests/*.test.js` (full suite) -> **2243/2243 pass, 0
  fail** (naik dari 2232 sebelum sesi ini, +11 test baru, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2243/2243 pass, 0 regresi dari
  proses build itu sendiri.

**Hasil build:**
- `node scripts/build.js` -> sukses. 3 lint-guard bawaan lolos, kedua
  bundle lolos `node --check` sintaks, `index.html`/`app_production.html`
  tetap identik, versi naik ke build `kw99-sesi25-fix-gdrive-backup-await-41`
  (`?v=454`, dari `?v=453`). `docs/FILE-MAP.md` diregenerasi (131 file,
  1218 identifier — naik dari 130/1206 krn 3 fungsi builder + 1 konstanta
  `GOAL_SOURCE_BUILDERS` baru yang top-level).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini tanpa
  akses internet, sama seperti keterbatasan sesi-sesi sebelumnya. Bundle
  hasil build TANPA minifikasi (fallback otomatis, aman tapi lebih besar).
- ZIP (`kw_release_sesi25_lifeos_goal_adapter_v454.zip`) dibuat SEGERA
  setelah build sukses, SEBELUM update dokumentasi ini, sesuai urutan
  kerja wajib di `docs/SESSION_RULES.md`.

**Dokumentasi lain yang diperbaiki sesi ini:** `README.md` § LifeOS >
Status Implementasi — 2 baris ternyata SUDAH KADALUARSA sejak Sesi 24
(belum sempat diupdate sesi itu): baris "registry dibaca terprogram"
masih bilang "⚠️ Belum" padahal `area-adapter.js`/`today-adapter.js`
sudah registry-driven sejak Sesi 24, dan baris "test suite `lifeos/`"
masih bilang "❌ Belum ada" padahal `tests/lifeos-area-adapter.test.js`/
`tests/lifeos-today-adapter.test.js`/`tests/lifeos-nav.test.js` sudah
ada. Diperbaiki jadi akurat (mencakup ketiga adapter + goal-adapter sesi
ini), `area-adapter.js` juga ditambahkan ke daftar struktur folder
`adapters/` yang sebelumnya kelewatan.

**Progress LifeOS:** `LIFEOS_AREAS`/`LIFEOS_TODAY_SOURCES`/
`LIFEOS_GOAL_SOURCES` sekarang SEMUA registry-driven & dikonsumsi
otomatis oleh adapter masing-masing (bukan cuma dokumentasi). Ini
BUKAN bagian dari tracking Tahap 1-8 Smart AI di `IMPLEMENTATION_STATUS.md`
— LifeOS belum punya dokumen status persentase sendiri (kalau
dibutuhkan, perlu dibuat terpisah, bukan ditumpuk ke
`IMPLEMENTATION_STATUS.md` yang scope-nya khusus AI/Logistics).

**Next TODO (LifeOS):** builder `pensiun`/`fi`/`debt` di
`GOAL_SOURCE_BUILDERS` — butuh keputusan produk/arsitektur dulu (lihat
alasan di atas): (a) apakah adapter boleh menerima context tambahan
(mis. `FI`/`Pensiun` sbg parameter opsional) di luar `D`, atau (b) apakah
"current amount" utk pensiun/FI cukup dihitung ulang murni dari `D` tanpa
lewat `FI.*`/`Pensiun.*` (butuh audit rumus lebih dalam dari sekadar
baca shape field). Tidak ditebak sesi ini.

**Known Issue:** tidak ada isu baru dari sesi ini selain 2 baris README
yang sudah diperbaiki di atas. Isu lama yang masih berlaku (belum
berubah): `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox tanpa
internet; seluruh sub-item Smart AI yang masih terbuka (Tahap 2/5/8) TETAP
butuh keputusan produk, belum berubah sesi ini.


## Catatan kerja — 2026-07-18 (Sesi 26): LDOS — LifeOS Developer Operating System

Konteks: user upload dokumen instruksi meta ("LDOS") minta dibangun
sistem dokumentasi permanen (10 file baru di `docs/` + merge ke file
existing) supaya sesi-sesi berikutnya bisa langsung lanjut kerja tanpa
audit ulang & tanpa kehilangan konteks. Ini sesi DOKUMENTASI MURNI —
TIDAK ada perubahan source/app code, TIDAK ada perubahan test/build.

**Yang dikerjakan:**
- 10 file BARU di `docs/`: `README_DEVELOPER.md`, `PRODUCT_DECISIONS.md`,
  `PROJECT_STATE.md`, `NEXT_SESSION.md`, `IMPLEMENTATION_POLICY.md`,
  `CHECKPOINT.md`, `ZIP_RULES.md`, `AI_SCOPE.md`, `LIFEOS_SCOPE.md`,
  `WORKFLOW.md`.
- 2 file di-MERGE (append/tambah section, isi lama TIDAK dihapus/
  ditimpa): `docs/SESSION_RULES.md` (section "Update Sesi 26" +
  pembaruan diagram struktur dokumentasi), `docs/CLAUDE.md` (pointer di
  atas + entri log ini).

**Temuan penting yang dicatat ke `docs/PRODUCT_DECISIONS.md`:**
dokumen LDOS yang di-upload user ternyata BERISI keputusan produk yang
selama ini jadi blocker "butuh keputusan produk, tanya user dulu" di 3
tempat berbeda sejak beberapa sesi lalu:
1. **TODO.md #6b (Tahap 2, Navigation/Router wiring)** — dijawab: reuse
   `FEATURE_REGISTRY`/`showPage()` existing, jangan bikin router baru.
2. **TODO.md #8 (Tahap 5, Daily/Reminder Summary)** — dijawab:
   `dailyBriefing()` WAJIB 5 bagian (Finance/Delivery/Reminder/Target/
   Recommendation Summary), + urutan prioritas reminder
   Finance→Vehicle→Shop→Asset→Goal→LifeOS.
3. **TODO.md #4e (Tahap 8, Performance Check)** — dijawab: ukur Context
   Collector/Rule Evaluation/Recommendation/Daily Briefing/Simulation.

Ketiganya SEKARANG BISA dikerjakan sesi berikutnya tanpa nanya user
lagi — didetailkan di `docs/PRODUCT_DECISIONS.md`, jangan diaudit ulang
alasannya, cukup baca file itu.

**File yang diedit:** hanya `docs/*.md` (10 baru + 2 merge) — 0 file
source app (`modules/`, `lifeos/`, `scripts/`, `tests/`) tersentuh.

**Hasil test:** TIDAK dijalankan ulang — 0 perubahan source/app code,
hasil Sesi 25 (2243/2243 pass) tetap berlaku penuh.

**Hasil build:** TIDAK dijalankan ulang — 0 perubahan source/app code,
build Sesi 25 (`?v=454`) tetap berlaku penuh.

**ZIP:** `kw_release_sesi26_ldos_docs.zip` — dibuat dari seluruh folder
kerja (sama seperti Sesi 25 + 10 file docs baru), sesuai
`docs/ZIP_RULES.md`. Build/version TETAP `?v=454` (tidak ada rebuild).

**Progress:** Tidak ada perubahan progress Smart AI/LifeOS itu sendiri
(dokumentasi only). Yang berubah: 3 blocker "butuh keputusan produk" di
Smart AI (Tahap 2/5/8) sekarang TERJAWAB, siap dikerjakan.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — 3 kandidat (semua sudah
tidak buntu), user perlu memilih salah satu di sesi berikutnya. Urutan
prioritas tahap mengarahkan ke Tahap 2 (Navigation/Router wiring) sbg
kandidat utama kalau tidak ada instruksi lain.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` masih
tidak bisa dijalankan di sandbox tanpa internet (isu lama, tidak
berubah). Goal-adapter `pensiun`/`fi`/`debt` (Sesi 25) masih terbuka,
BELUM terjawab oleh dokumen LDOS ini — dicatat terpisah di
`docs/PRODUCT_DECISIONS.md` § LifeOS sbg "belum final".


## Catatan kerja — 2026-07-18 (Sesi 27): LifeOS Navigation wiring — LIFEOS_NAV_MAP

**Nomor sesi:** 27
**Tanggal:** 2026-07-18
**Target:** Melengkapi `LIFEOS_NAV_MAP` (`lifeos/lifeos-nav.js`) — "jump
to source" utk item Life OS Today yang sebelumnya belum bisa dinavigasi.

Konteks: mengikuti `docs/README_DEVELOPER.md`/`docs/NEXT_SESSION.md`
(LDOS), sebelum mengerjakan target dilakukan audit kecil pada file yang
relevan dgn kandidat LifeOS. Ketemu gap konkret: `todayAdapterList()`
(`lifeos/adapters/today-adapter.js`) sudah registry-driven 5/5 key
(`LIFEOS_TODAY_SOURCES`: bills/reminders/selfcare/payroll/tukang, semua
sudah punya builder di `TODAY_SOURCE_BUILDERS` sejak sesi-sesi lalu),
TAPI `LIFEOS_NAV_MAP` (`lifeos/lifeos-nav.js`) — tempat "jump to
source" tiap item Today menentukan cara membuka referensi aslinya —
cuma punya entri utk 2 dari 5 sourceKind itu (`bills`/`reminders`). 3
sourceKind lain (`selfcare`/`payroll`/`tukang`) jatuh ke cabang default
`lifeOSNavigateToSource()`: `console.warn` + toast "Referensi untuk
item ini belum diatur. Tolong laporkan ke pengembang." — bukan
navigasi beneran. Ini persis pola gap yang cocok utk 1 sesi kecil
(bukan Tahap besar), scope-nya jelas & tidak butuh keputusan produk.

**Yang dikerjakan:**
- `LIFEOS_NAV_MAP` ditambah 3 entri:
  - `selfcare: { page: 'dashboard-hub', cardSelector: '#refleksiCard' }`
    — reuse target yang SUDAH terverifikasi di
    `dashboard-hub-registry.js` (key `dash-refleksi`,
    `target: { page: 'dashboard-hub', dashKey: 'refleksi', goTo:
    'refleksiCard' }`). Dikonfirmasi elemen `#refleksiCard` memang ada
    (`index.html`) & di-render lewat `DASH_CARD_DEFS` key `refleksi`
    (`modules-render.js`).
  - `payroll: { page: 'dashboard-hub', cardSelector:
    '#dashAbsensiCard' }` — reuse target FEATURE_REGISTRY key
    `per-absensi` (`target: { page: 'dashboard-hub', dashKey:
    'absensi', goTo: 'dashAbsensiCard' }`). Dikonfirmasi
    `todaySourcePayroll()` baca `D.workDays`/`D.lastResetPromptDate`,
    field SAMA PERSIS dgn yang ditulis/dibaca
    `modules/business/payroll-absensi.js` (`const Payroll={...}`) —
    jadi kartu `dashAbsensiCard` memang referensi aslinya yang benar,
    bukan tebakan.
  - `tukang: { openFn() { Tukang.openModal(); } }` — sourceKind ini
    murni modal (tidak attach ke page/kartu), pola openFn SAMA PERSIS
    dgn entri `wishlist`/`renovasi` yang sudah ada. Dikonfirmasi
    `Tukang.openModal` memang ada (`modules/business/tukang-absensi.js`
    baris 58) & dipanggil dari tombol existing `data-action=
    "Tukang.openModal"` ("👷 Absensi Tukang", kartu Renovasi di
    `index.html`).
- Komentar header `lifeos-nav.js` diperbarui: catatan status cakupan
  (5/5 sourceKind Today sekarang dipetakan; Goal tetap 3/6 sesuai
  builder yang sudah ada; pensiun/fi/debt sengaja belum krn builder-nya
  sendiri belum ada — lihat `docs/PRODUCT_DECISIONS.md`).
- **TIDAK ada mekanisme/router baru**: `_lifeOSHighlightSettingsCard()`
  dipakai APA ADANYA (fungsi ini sebenarnya generik, bukan
  khusus-Setelan — bagian `closest('.stg-tabpanel')`/
  `closest('.stg-group')` otomatis no-op kalau kartu tujuan bukan di
  halaman Setelan), dan `dashHubNavigateToFeature()` juga dipakai APA
  ADANYA (sudah dipakai utk `page:'dashboard-hub'` sebelumnya lewat
  entri `bills`/`reminders` ke `page:'settings'` — pola `{page,
  cardSelector}` cuma diperluas ke nilai `page` baru, bukan struktur
  baru).

**File yang diedit:** `lifeos/lifeos-nav.js` (3 entri baru + update
komentar header, 0 perubahan fungsi/mekanisme), `tests/lifeos-nav.test.js`
(6 test baru: selfcare page+scroll, payroll page+cardSelector, tukang
openFn + fallback Tukang belum ter-load; 1 test lama disesuaikan
[daftar key page-based & ekspektasi page per-key, krn selfcare/payroll
sekarang page:'dashboard-hub' bukan 'settings']).

**Hasil test:**
- `node --test tests/lifeos-nav.test.js` -> 13/13 pass (naik dari 7,
  +6 test baru).
- `node --test tests/*.test.js` (full suite) -> **2248/2248 pass, 0
  fail** (naik dari 2243 sebelum sesi ini, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2248/2248 pass, 0 regresi dari
  proses build itu sendiri.

**Hasil build:**
- `node scripts/build.js` -> sukses. Ketiga lint-guard bawaan lolos,
  kedua bundle lolos `node --check` sintaks, `index.html`/
  `app_production.html` tetap identik, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-43` (`?v=456`, dari `?v=455`).
  `docs/FILE-MAP.md` diregenerasi (131 file, 1218 identifier — sama
  jumlah krn perubahan cuma isi objek `LIFEOS_NAV_MAP`, tidak ada
  fungsi/konstanta top-level baru).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi
  sebelumnya. Bundle hasil build TANPA minifikasi (fallback otomatis,
  aman tapi lebih besar).
- ZIP (`kw_release_sesi27_navwiring_lifeos_v456.zip`) dibuat SEGERA
  setelah build sukses, SEBELUM update dokumentasi ini, sesuai urutan
  kerja wajib di `docs/SESSION_RULES.md`/`docs/ZIP_RULES.md`.

**Progress LifeOS:** Nav wiring utk Today SEKARANG LENGKAP 5/5
sourceKind (sebelumnya 2/5). Goal nav wiring TETAP 3/6
(target/eduFund/wishlist) — TIDAK ditambah sesi ini krn builder
pensiun/fi/debt di `goal-adapter.js` sendiri memang belum ada (bukan
kelalaian, lihat blocker lama di `docs/PRODUCT_DECISIONS.md` §
LifeOS). Ini BUKAN bagian dari tracking Tahap 1-8 Smart AI di
`IMPLEMENTATION_STATUS.md` — progress Smart AI (Tahap 2/4/5/6/7/8)
TIDAK berubah sesi ini.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — 3 kandidat track Smart AI
(semua sudah tidak buntu, urutan prioritas mengarahkan ke Tahap 2 sbg
kandidat utama) + 3 kandidat track LifeOS (registry-driven-kan
project/review/knowledge adapter, audit `ui/goals.js`, atau tunggu
keputusan produk pensiun/fi/debt). User perlu memilih salah satu di
sesi berikutnya.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku (belum berubah): `npm run lint`/`esbuild` tidak bisa dijalankan
di sandbox tanpa internet; goal-adapter `pensiun`/`fi`/`debt` masih
terbuka (butuh keputusan produk/arsitektur, BELUM final); seluruh
sub-item Smart AI yang masih terbuka (Tahap 2/5/8) TETAP butuh
dikerjakan (blocker produknya sudah terjawab, tapi belum
diimplementasikan).


## Catatan kerja — 2026-07-18 (Sesi 28): Smart AI Tahap 2 — Navigation/Router wiring (TODO.md #6b)

**Nomor sesi:** 28
**Tanggal:** 2026-07-18
**Target:** Menyelesaikan 2 sub-item Tahap 2 (Integration) yang sejak
Sesi 22-23 dicatat "scope belum jelas" — sekarang sudah dijawab lewat
`docs/PRODUCT_DECISIONS.md` (Sesi 26): navigation/router wiring =
pastikan entry LifeOS/AI bisa dijangkau lewat `FEATURE_REGISTRY` +
`showPage()` existing, TIDAK bikin router baru.

**Audit kecil (sebelum implementasi, sesuai First Action
`docs/NEXT_SESSION.md`):** ditemukan bahwa `dashboard-hub-registry.js`
(kategori `dashboard`) SUDAH punya entry `dash-lifeos` (`target: {
page: 'dashboard-hub', goTo: 'lifeOSWrap' }`) LENGKAP dengan komentar
yang menyebut "Sesi 27 (TODO.md #6b, Tahap 2 Navigation wiring)" —
TAPI entry ini TIDAK tercatat di `ROADMAP.md`/`TODO.md`/
`IMPLEMENTATION_STATUS.md` manapun (semua dokumen itu masih bilang
"Navigation/Router wiring ❌ belum ada" sampai sebelum sesi ini), dan
BELUM ADA satu pun test end-to-end yang memverifikasi entry ini benar2
bisa dinavigasi (cuma otomatis lolos test STRUKTURAL generik
`tests/dashboard-hub-registry.test.js` yang validasi bentuk
target/goTo id, bukan perilaku navigasi nyata). Ini gap dokumentasi +
test, BUKAN kode hilang — konsisten dgn kemungkinan sesi sebelumnya
sempat menulis kode ini tapi terputus sebelum sempat menulis test/
update dokumen (pola RECOVERY MODE `docs/SESSION_RULES.md`).

Konfirmasi tambahan: `DashboardHub.open(key)` (ADR-001 §4 — "SATU-
SATUNYA entry point publik navigasi", lihat komentar di
`dashboard-hub.js`) sudah GENERIK sejak sebelum Sesi 22 — mencari key
di `cat.key` lalu `f.key` di seluruh `FEATURE_REGISTRY`, lalu delegasi
ke `dashHubNavigateToFeature()`. Ini SUDAH otomatis mencakup entry
`dash-lifeos`/`dash-ai-rekomendasi`/`dash-ai-ringkasan-harian` tanpa
perlu kode tambahan apa pun — jadi "Router wiring" juga SUDAH ADA,
bukan yang perlu dibangun baru.

**Yang dikerjakan:** 3 test integrasi BARU di
`tests/dashboard-hub-search-integration.test.js` (pola SAMA PERSIS dgn
test `shop-sewakios` yang sudah ada di file yang sama — REAL
`FEATURE_REGISTRY`, bukan fake registry kecil) yang memverifikasi jalur
nyata search -> select() -> `DashboardHub.open()` -> `showPage()`:
- `search('rekomendasi ai')` -> `dash-ai-rekomendasi` -> `showPage('dashboard-hub')`
- `search('ringkasan harian')` -> `dash-ai-ringkasan-harian` -> `showPage('dashboard-hub')`
- `search('life os')` -> `dash-lifeos` -> `showPage('dashboard-hub')`

**TIDAK ada kode navigasi baru ditulis** — `DashboardHub.open()`/
`dashHubNavigateToFeature()` dipakai APA ADANYA, entry `dash-lifeos` di
registry juga dipakai apa adanya (bukan ditulis ulang sesi ini, sudah
ada sebelumnya). Konsisten dgn keputusan produk "tidak bikin router
baru".

**File yang diedit:**
- `tests/dashboard-hub-search-integration.test.js` (3 test baru).
- `TODO.md` (item #6b ditandai `~~selesai~~`, catatan resolusi + entri
  log sesi di header).
- `ROADMAP.md` (Tahap 2 "Navigation wiring"/"Router wiring" dicentang
  ☑, entri log sesi).
- `IMPLEMENTATION_STATUS.md` (Tahap 2: 55% -> 70%, detail
  Navigation/Router wiring dipindah dari ❌ ke ✅ dgn penjelasan audit).

**Hasil test:**
- `node --test tests/dashboard-hub-search-integration.test.js` ->
  14/14 pass (naik dari 11, +3 test baru).
- `node --test tests/*.test.js` (full suite) -> **2251/2251 pass, 0
  fail** (naik dari 2248 sebelum sesi ini, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2251/2251 pass, 0 regresi dari
  proses build itu sendiri.

**Hasil build:**
- `node scripts/build.js` -> sukses. Ketiga lint-guard bawaan lolos,
  kedua bundle lolos `node --check` sintaks, `index.html`/
  `app_production.html` tetap identik, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-44` (`?v=457`, dari `?v=456`).
  `docs/FILE-MAP.md` diregenerasi (131 file, 1218 identifier — sama
  jumlah krn perubahan cuma isi test file + dokumen .md, tidak ada
  fungsi/konstanta app baru).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi
  sebelumnya.
- ZIP (`kw_release_sesi28_ai-nav-router-wiring_v457.zip`) dibuat SEGERA
  setelah build sukses, SEBELUM update dokumentasi ini, sesuai urutan
  kerja wajib `docs/SESSION_RULES.md`/`docs/ZIP_RULES.md`.

**Progress Smart AI:** Tahap 2 (Integration) naik dari 55% ke 70% — 4
dari 5 sub-item sekarang ✅ (Event Bus/Registry/Navigation
wiring/Router wiring), sisa 1: Service Layer wiring (`simulate()`/
`healthCheck()` masih belum dipanggil nyata dari UI, beda dgn
`dailyBriefing()` yang sudah dipanggil sejak Sesi 16). Tahap 4-8
lainnya TIDAK tersentuh sesi ini.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat #1 (Tahap 5
Daily/Reminder/Target Summary), #2 (Tahap 8 Performance Check), atau
#3 (Tahap 2 Service Layer wiring, sisa 1 sub-item — scope-nya BELUM
diaudit, perlu audit kecil dulu di sesi berikutnya kalau dipilih). User
perlu memilih salah satu.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku (belum berubah): `npm run lint`/`esbuild` tidak bisa dijalankan
di sandbox tanpa internet; goal-adapter `pensiun`/`fi`/`debt` (track
LifeOS) masih terbuka; Tahap 5/8 Smart AI masih perlu diimplementasikan
(blocker produknya sudah terjawab, implementasinya belum dikerjakan).

## Catatan kerja — 2026-07-18 (Sesi 29): Smart AI Tahap 2 — Service Layer wiring (TODO.md #6c)

**Konteks:** checkpoint sesi sebelumnya sempat menyebut fitur "AI Health
Check"/"Diagnostik AI" yang ternyata TIDAK ada di ZIP terbaru — setelah
dikonfirmasi user, ZIP diperlakukan sebagai source of truth dan
checkpoint lama itu diabaikan (bukan pekerjaan yang tersimpan ke
repository). Sesi ini lanjut murni dari `docs/NEXT_SESSION.md`/
`docs/CHECKPOINT.md` yang ADA di ZIP (Sesi 28 selesai penuh, target
berikutnya belum dipilih). User memilih kandidat #3: Service Layer
wiring.

**Target:** hubungkan `AIService.healthCheck()` dan `AIService.simulate()`
ke UI existing (sisa 1 sub-item Tahap 2, sebelumnya belum ada di
TODO.md sbg item bernomor — sekarang jadi #6c).

**Audit kecil:** `AIService.healthCheck()` (sejak Sesi 8) dan
`AIService.simulate()` (sejak Sesi 15) sudah lengkap logic-nya tapi
belum pernah dipanggil dari UI mana pun (persis pola `dailyBriefing()`
sebelum Sesi 16). Card "🧭 Penasihat" (`index.html`, id `advisorCard`)
sudah punya 2 tab: "🩺 Insight Cepat" (`#advisorPanel-coach`, berisi
`#finCoachBody`/`#aiRecommendBody`/`#aiBriefingBody`) dan "🔍 Laporan AI"
(`#advisorPanel-report`, berisi `#aiWidgetBody` + tombol
Buat/Perbarui Analisis & Konsultasi AI) — keduanya cukup dipakai ulang,
tidak perlu halaman/router baru.

**Implementasi:**
- `index.html` — 2 container baru: `#aiStatusBody` (DI BAWAH
  `#aiBriefingBody`, tab Insight Cepat) & `#aiSimulateBody` + tombol
  `#aiSimulateBtn` (DI BAWAH tombol Buat/Perbarui Analisis & Konsultasi
  AI, tab Laporan AI).
- `ai-chat.js` — 2 objek baru, pola SAMA PERSIS dgn `AIDailyBriefingCard`/
  `AIWidget.generate()` yang sudah ada (container khusus, guard
  `typeof`, fire-and-forget/async tombol):
  - `AIStatusCard.render()` — baca `AIService.healthCheck()`, tulis ke
    `#aiStatusBody`. Silent (innerHTML kosong) kalau `ok:true` & tidak
    ada temuan informasional (duplicateRuleIds/duplicateRecommendations/
    brokenRecommendationRefs/orphanedStorageKeys kosong semua) — supaya
    tidak nambah ruang kosong di Beranda kalau AI tidak "punya cerita"
    apa-apa, sama seperti `AIDailyBriefingCard`. Kalau `ok:false` atau
    ada temuan, tampilkan ringkasannya.
  - `AISimulateWidget.run()` — dipanggil tombol `#aiSimulateBtn`
    (`data-action="AISimulateWidget.run"`), panggil
    `AIService.simulate({})` (TANPA ctx tambahan — What-If atas kondisi
    data SEKARANG, bukan skenario manual; input skenario manual di luar
    scope sub-item ini, belum ada UI-nya), tulis daftar
    `result.recommendations` ke `#aiSimulateBody`. Guard `running`
    mencegah dobel-tap. Hasil TIDAK dipersist ke `D` (beda dari
    `AIWidget.generate()` yang simpan `D.aiWidgetReport`) — murni
    tampilan sekali-tap, konsisten dgn `simulate()` yang memang
    `simulated:true` (tidak menulis apa pun ke store, lihat
    `ai-decision-engine.js` `decide()`).
- `modules/shared/modules-render.js` — `renderDashboard()`: tambah
  `if(typeof AIStatusCard!=='undefined')AIStatusCard.render();` persis
  di bawah pemanggilan `AIDailyBriefingCard.render()`.
- `app-bootstrap.js` — `AISimulateWidget` ditambahkan ke
  `Object.assign(window,{...})` (dipakai lewat `data-action`).
  `AIStatusCard` TIDAK perlu diekspos (tidak ada data-action, murni
  dipanggil dari `renderDashboard()`).

**Tidak ada duplikasi:** reuse `AIService.healthCheck()`/`simulate()`
apa adanya (tidak ada rumus/logic baru ditulis di `ai-service.js`),
reuse card/panel/container yang sudah ada, reuse pola card
(`AIDailyBriefingCard`) & pola tombol-async (`AIWidget.generate()`)
yang sudah ada. Konsisten dgn `docs/PRODUCT_DECISIONS.md` § "Umum —
Larangan duplikasi".

**Test:**
- `tests/ai-status-card.test.js` (8 test baru, pola sama dgn
  `tests/ai-daily-briefing-card.test.js`) & `tests/ai-simulate-widget.test.js`
  (7 test baru) — total 15 test baru.
- `node --test tests/ai-status-card.test.js tests/ai-simulate-widget.test.js`
  -> 15/15 pass.
- `node --test tests/*.test.js` (full suite) -> **2266/2266 pass, 0
  fail** (naik dari 2251, +15 test baru, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2266/2266 pass.

**Hasil build:**
- `node scripts/build.js` -> sukses. Ketiga lint-guard bawaan lolos,
  kedua bundle lolos `node --check` sintaks, `index.html`/
  `app_production.html` tetap identik, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-45` (`?v=458`, dari `?v=457`).
  `docs/FILE-MAP.md` diregenerasi.
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi
  sebelumnya.
- ZIP (`kw_release_sesi29_ai-service-layer-wiring_v458.zip`) dibuat
  SEGERA setelah build sukses, SEBELUM update dokumentasi ini, sesuai
  urutan kerja wajib `docs/SESSION_RULES.md`/`docs/ZIP_RULES.md`.

**Progress Smart AI:** Tahap 2 (Integration) naik dari 70% ke **100%** —
semua 5 sub-item sekarang ✅ (Event Bus/Registry/Dashboard wiring/
Navigation wiring/Router wiring/Service Layer wiring — Tahap 2 SELESAI
PENUH). Tahap 4-8 lainnya TIDAK tersentuh sesi ini.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat #1 (Tahap 5
Daily/Reminder/Target Summary, TODO.md #8) atau #2 (Tahap 8 Performance
Check, TODO.md #4e). User perlu memilih salah satu.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku (belum berubah): `npm run lint`/`esbuild` tidak bisa dijalankan
di sandbox tanpa internet; goal-adapter `pensiun`/`fi`/`debt` (track
LifeOS) masih terbuka; Tahap 5/8 Smart AI masih perlu diimplementasikan
(blocker produknya sudah terjawab, implementasinya belum dikerjakan).

## Catatan kerja — 2026-07-18 (Sesi 30): Smart AI Tahap 8 — Performance Check (TODO.md #4e)

**Konteks:** checkpoint yang diberikan user ("Sesi 39") menyebut 6
langkah sudah selesai (helper `_aiMeasure`/perf-timing dibuat & dipakai
membungkus `AIContext.snapshot()`/`AIDecision.rules.evaluate()`/
`AIDecision.formatRecommendation()`/`AIService.dailyBriefing()`/
`AIService.simulate()`). Setelah dicek, TIDAK SATU PUN dari itu ada di
ZIP terakhir (`kw_release_sesi29_ai-service-layer-wiring_v458.zip`) —
sama pola dgn insiden checkpoint palsu di Sesi 29. Sesuai instruksi
eksplisit user ("jangan menebak implementasi yang hilang, lanjutkan
dari kode yang benar-benar ada"), checkpoint lama diabaikan sepenuhnya
dan Tahap 8 Performance Check dikerjakan dari NOL berdasarkan
`docs/NEXT_SESSION.md` (kandidat #2) + `docs/PRODUCT_DECISIONS.md` §
Performance Check (scope: ukur durasi 5 fungsi — Context Collector/Rule
Evaluation/Recommendation/Daily Briefing/Simulation — cara ukur konkret
memang didesain bebas di sesi implementasi, bukan keputusan produk
baru). Diberi nomor Sesi 30 (bukan "39") supaya konsisten dgn penomoran
`docs/CLAUDE.md`/`docs/NEXT_SESSION.md` yang berhenti di Sesi 29 di ZIP
ini — sesi 30-38 versi user kemungkinan terputus kuota sebelum sempat
menghasilkan ZIP baru.

**Implementasi:**
- `modules/ai/ai-core.js` — 1 helper timing baru, ditaruh SEBELUM
  `AIContext`: `_aiMeasureMs(fn)` (sync) & `_aiMeasureMsAsync(fn)`
  (async), keduanya pakai `Date.now()` (BUKAN `performance.now()` —
  sandbox `tests/helpers/loadSource.js` tidak menyediakan global
  `performance`, & `Date.now()` sudah konsisten dgn pola timestamp
  lain di `modules/ai/`). Return `{result, ms}`, murni wrapper
  read-only.
- `modules/ai/ai-service.js` — `AIService.healthCheck()`: field baru
  `checks.performance = {contextCollectorMs, ruleEvaluationMs,
  recommendationMs, dailyBriefingMs, simulationMs}`. Cara ukur:
  - `contextCollectorMs` — bungkus `AIContext.snapshot()` yang SUDAH
    dipanggil di `healthCheck()` (reuse hasilnya jg utk
    `contextReady`, TIDAK snapshot 2x).
  - `ruleEvaluationMs` — `AIDecision.rules.evaluate({...snapshot,
    simulated:true})`. `simulated:true` WAJIB supaya TIDAK menandai
    cooldown rule nyata (pola sama dgn `simulate()`) — murni
    pengukuran, bukan evaluasi produksi.
  - `recommendationMs` — `AIDecision.formatRecommendation()` dipanggil
    dgn decision TERAKHIR dari `store.decisionLog` kalau ada, atau
    decision sintetik minimal (`{id:'perf-check', message:''}`) kalau
    `decisionLog` masih kosong.
  - `dailyBriefingMs` — `this.dailyBriefing({limit:1})` (limit kecil
    KHUSUS di jalur pengukuran ini, TIDAK mengubah default publik
    `dailyBriefing()` yg tetap `limit:10`).
  - `simulationMs` — `this.simulate({})`.
  - Kelimanya dibungkus try/catch terpisah dari blok check lain
    (informasional, TIDAK menjatuhkan `ok` — hanya
    `checks.performanceError` kalau blok performance gagal total),
    pola SAMA PERSIS dgn 5 field informasional Tahap 8 sebelumnya.

**Tidak ada duplikasi/refactor besar:** 1 helper timing baru, tidak ada
registry/storage baru, tidak menyentuh arsitektur/kontrak publik
`AIService`. `checks.performance` murni field TAMBAHAN — backward
compatible penuh.

**Test:**
- 4 test baru di `tests/ai-service.test.js`: kondisi normal, kondisi
  kosong (0 rule, decisionLog kosong), read-only (tidak menulis
  IDBStore & tidak menandai cooldown), & recommendationMs pakai
  decision terakhir dari decisionLog.
- `node --test tests/ai-service.test.js` -> 36/36 pass (naik dari 32).
- `node --test tests/*.test.js` (full suite) -> **2270/2270 pass, 0
  fail** (naik dari 2266, +4 test baru, 0 regresi).

**Hasil build:**
- `node scripts/build.js` -> sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-46` (`?v=459`, dari `?v=458`).
  `docs/FILE-MAP.md` diregenerasi.
- `npm run lint`/`esbuild` TIDAK bisa dijalankan (sandbox tanpa
  internet).
- ZIP (`kw_release_sesi30_ai-performance-check_v459.zip`) dibuat SEGERA
  setelah build sukses, SEBELUM update dokumentasi ini.

**Progress Smart AI:** Tahap 8 (Performance Check) — sub-item terakhir
TODO.md #4e sekarang ✅ SELESAI.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat tersisa: TODO.md
#8 (Tahap 5, Daily/Reminder/Target Summary) atau track LifeOS.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox
tanpa internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS)
masih terbuka.

## Catatan kerja — 2026-07-18 (Sesi 32): Smart AI Tahap 6 — AI Learning (target eksplisit user)

**Konteks:** ZIP yang diberikan user (`kw_release_sesi31_ai-daily-
briefing_v460.zip`) tidak punya entri Sesi 31 di `docs/CLAUDE.md`/
`docs/NEXT_SESSION.md`/`TODO.md` (terakhir tercatat Sesi 30, `?v=459`)
— sama pola dgn insiden checkpoint tidak sinkron sebelumnya. Sesuai
instruksi eksplisit user ("Gunakan repository (ZIP terakhir) sebagai
SOURCE OF TRUTH", "Jangan audit ulang project"), kode di ZIP dipakai
apa adanya (build `?v=460`, 2274/2274 test pass sebelum sesi ini) tanpa
menebak apa yang terjadi di Sesi 31 — target sesi ini murni ikut
instruksi eksplisit user (Tahap 6 AI Learning), bukan hasil audit
ulang.

**Audit kecil:** `AIDecision.learn.recordOutcome()`/`getConfidence()`
(`modules/ai/ai-decision-engine.js`) ternyata SUDAH terhubung ke UI
nyata sejak Sesi 14/19 lewat `AIRecommendCard` (ai-chat.js, kartu "🧭
Penasihat" > tab "🩺 Insight Cepat") — tombol Terima (`'accepted'`) &
Abaikan (`'ignored'`). Celah yang ditemukan: outcome `'rejected'`
(sudah ada di `AI_VALID_OUTCOMES` sejak Sesi 2) TIDAK PERNAH bisa
dipicu dari UI nyata manapun — hanya dari test unit
`ai-decision-engine.test.js`. Padahal `getConfidence()` (dipakai
`AIRecommendCard.render()` buat urutan tampil sejak Sesi 19) rumusnya
`accepted/(accepted+rejected)`, dan SENGAJA mengabaikan `'ignored'`
(komentar asli: "belum tentu penolakan"). Akibatnya, sebelum sesi ini,
confidence adaptif dari histori pemakaian nyata TIDAK PERNAH bisa
turun — rule yang rekomendasinya berulang kali di-"Abaikan" user tetap
dianggap netral, AI Learning belum benar-benar "belajar" dari
penggunaan nyata (persis yang diminta target sesi ini).

**Implementasi:**
- `ai-chat.js` — `AIRecommendCard.render()`: tambah 1 tombol baru
  "✗ Tolak" di antara "✓ Terima" dan "Abaikan", manggil
  `AIRecommendCard.act(r.id,r.ruleId,'rejected')` (fungsi `act()` SUDAH
  generic menerima outcome apa pun sejak Sesi 14, tidak diubah).
- `AIRecommendCard.act()`: tambah 1 cabang pesan toast utk
  `outcome==='rejected'` (beda dari accepted/ignored), supaya user tahu
  tindakannya benar-benar berefek ke pembelajaran AI, bukan cuma
  dismiss.
- TIDAK ada file/UI/halaman baru, TIDAK ada storage/registry/adapter/
  event baru, TIDAK ada perubahan ke `AIDecision.learn`/
  `ai-decision-engine.js` sama sekali (reuse persis apa adanya).
  "Abaikan" (`'ignored'`) TETAP tidak mempengaruhi confidence — perilaku
  lama tidak berubah, backward compatible penuh.

**Test:**
- `tests/ai-recommend-card.test.js`: 2 test baru (`act()` dgn
  `'rejected'` — recordOutcome terpanggil benar, toast beda, dismiss
  tetap jalan; & `'rejected'` tetap dismiss walau `recordOutcome()`
  error) + 2 assertion ditambah ke test render tombol yang sudah ada
  (cek tombol Tolak muncul dgn `ruleId` benar).
- `node --test tests/ai-recommend-card.test.js` -> 12/12 pass (naik
  dari 9).
- `node --test tests/*.test.js` (full suite) -> **2276/2276 pass, 0
  fail** (naik dari 2274, +2 test baru, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2276/2276 pass.

**Hasil build:**
- `node scripts/build.js` -> sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-48` (`?v=461`, dari `?v=460`).
  Ketiga lint-guard bawaan lolos, kedua bundle lolos `node --check`
  sintaks, `index.html`/`app_production.html` tetap identik.
  `docs/FILE-MAP.md` diregenerasi.
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- ZIP (`kw_release_sesi32_ai-learning-reject_v461.zip`) dibuat SEGERA
  setelah build sukses, SEBELUM update dokumentasi ini.

**Progress Smart AI:** Tahap 6 (AI Learning) naik dari **65% ke 75%**.
Belum 100%: histori Terima/Tolak/Abaikan belum ditampilkan ke user
(statistik per rule), belum ada keputusan produk soal bentuk
tampilannya.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat: TODO.md #8
(Tahap 5, Daily/Reminder/Target Summary), TODO.md #4e (Tahap 8,
Performance Check), lanjutan Tahap 6 (histori per rule, butuh
keputusan produk kecil), atau track LifeOS.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox
tanpa internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; dokumentasi (`docs/CLAUDE.md`/`TODO.md`) sempat tidak sinkron
dgn ZIP terakhir (Sesi 31 tidak tercatat) — diselesaikan dgn memakai
ZIP sbg source of truth sesuai instruksi eksplisit user, TANPA audit
ulang seluruh project.

## Catatan kerja — 2026-07-18 (Sesi 34): Smart AI Tahap 8 — AI Health Check jadi "pusat diagnostik" (target eksplisit user)

**Konteks:** ZIP yang diberikan user
(`kw_release_sesi33_ai-delivery-simulation_v462.zip`) tidak punya entri
Sesi 33 di `docs/CLAUDE.md`/`docs/NEXT_SESSION.md`/`TODO.md` (terakhir
tercatat Sesi 32, `?v=461`) — sama pola dgn insiden Sesi 31/Sesi 29
sebelumnya. Sesuai instruksi eksplisit user ("Gunakan repository (ZIP
terakhir) sebagai SOURCE OF TRUTH", "Jangan audit ulang repository"),
kode Sesi 33 (`deliverySimulation` di `simulate()`, terlihat dari nama
test `tests/ai-service.test.js`) dipakai apa adanya tanpa menebak
detailnya — target sesi ini murni ikut instruksi eksplisit user (Tahap
8 AI Health Check), bukan hasil audit ulang Sesi 33.

**Audit kecil:** `AIService.healthCheck()` (`modules/ai/ai-service.js`)
ternyata SUDAH lengkap 6/6 sub-item termasuk Performance Check
(`checks.performance` — field ini SUDAH ADA lengkap dgn komentar
detail merujuk Sesi 30, plus 4 test terkait di
`tests/ai-service.test.js` yang SUDAH pass) — `TODO.md`/
`IMPLEMENTATION_STATUS.md` di ZIP ini masih mencatat "BELUM
DIKERJAKAN"/55%, dokumentasi tidak sinkron dgn kode (sama pola insiden
berulang di project ini). Yang BENAR-BENAR belum ada: `healthCheck()`
belum pernah ditampilkan sbg satu diagnostic view utuh ke user —
`AIStatusCard` (Sesi 28) sengaja SILENT kalau sehat, cuma nongol kalau
ada temuan masalah (notifikasi, bukan dashboard diagnostik). Ini yang
jadi scope nyata target user "pusat diagnostik Smart AI" sesi ini.

**Implementasi:**
- `ai-chat.js` — widget baru `AIHealthCheckWidget` (`items()`, `run()`,
  `renderHtml()`), tombol "🩺 Health Check Lengkap" di kartu "🧭
  Penasihat" > tab "🔍 Laporan AI", DI BAWAH tombol `AISimulateWidget`
  (pola on-demand yang sama — fire-on-click, bukan fire-and-forget tiap
  render Beranda). Memanggil `AIService.healthCheck()` (TIDAK ada
  argumen tambahan, TIDAK ada engine/helper/storage baru), lalu
  menyusun ulang field yang SUDAH ADA di return-nya jadi 7 checkmark
  sesuai target eksplisit user: Context Collector (`checks.contextReady`),
  Rule Evaluation/Recommendation Engine/Daily Briefing/Simulation
  (masing-masing dari `checks.performance.*Ms` — ready kalau nilainya
  number), Performance Timing (✓ kalau ke-5 fungsi berhasil diukur, plus
  durasi ms tiap fungsi), Overall Status (`health.ok` + `checkedAt`) —
  plus temuan informasional (duplikat/dead rule/broken ref/orphaned
  storage) kalau ada, dibaca dari field yang sama dgn `AIStatusCard`
  (bukan fungsi/helper baru, cuma dibaca ulang di 2 tempat).
- `index.html` — 1 tombol baru (`#aiHealthCheckBtn`) + 1 container hasil
  (`#aiHealthCheckBody`), DI BAWAH `#aiSimulateBody`, reuse class CSS yang
  sudah ada (`btn btn-ghost btn-sm`, dst).
- `app-bootstrap.js` — `AIHealthCheckWidget` ditambahkan ke
  `Object.assign(window,{...})` (wajib, top-level `const` TIDAK otomatis
  jadi properti `window` — kelas bug ini ada guard test otomatis
  `tests/window-expose-audit.test.js`, sempat gagal sebelum baris ini
  ditambahkan, sekarang pass).
- `AIStatusCard` (kartu silent-notifikasi) **TIDAK diubah sama sekali**
  — backward compatible penuh, perilaku lama & 8 test lamanya tetap
  utuh.

**Tidak ada duplikasi/refactor besar:** 0 engine/helper/storage/
registry/adapter/event baru — `AIHealthCheckWidget` murni UI yang
membaca ulang `AIService.healthCheck()` yang sudah lengkap sejak Sesi
30 (backend Performance Check TIDAK disentuh sesi ini, sudah selesai
sebelumnya).

**Test:**
- `tests/ai-healthcheck-widget.test.js`: 12 test baru (run() manggil
  healthCheck() & tulis ke `#aiHealthCheckBody`; tidak error kalau
  `AIService` belum ter-load/`healthCheck()` melempar; guard `running`
  cegah panggilan dobel; `renderHtml()` — 7 checkmark kondisi sehat,
  checkmark individual ✗ kalau ms field bukan number, Performance
  Timing ikut ✗ kalau ada fungsi gagal diukur, Overall Status ✗+pesan
  "belum siap" kalau `ok:false`, durasi ms tiap fungsi tampil, temuan
  informasional tampil kalau ada, tidak melempar kalau `health`/
  `checks` kosong/null).
- `node --test tests/ai-healthcheck-widget.test.js` -> 12/12 pass.
- `node --test tests/*.test.js` (full suite) -> **2295/2295 pass, 0
  fail** (naik dari 2283 di ZIP masuk, +12 test baru, 0 regresi).
- Diulang lagi SETELAH build -> tetap 2295/2295 pass.

**Hasil build:**
- `node scripts/build.js` -> sukses, versi naik ke build
  `kw99-sesi25-fix-gdrive-backup-await-50` (`?v=463`, dari `?v=462`).
  Ketiga lint-guard bawaan lolos, kedua bundle lolos `node --check`
  sintaks, `index.html`/`app_production.html` tetap identik (diverifikasi
  `diff` langsung, bukan cuma lolos test). `docs/FILE-MAP.md`
  diregenerasi.
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
- ZIP (`kw_release_sesi34_ai-health-check-diagnostic_v463.zip`) dibuat
  SEGERA setelah build sukses, SEBELUM update dokumentasi ini.

**Progress Smart AI:** Tahap 8 (AI Health Check) naik dari **55% (versi
dokumentasi lama yang tidak sinkron) ke 100%** — backend 6/6 sub-item
(sudah selesai sejak Sesi 30, cuma belum tercatat benar) + UI "pusat
diagnostik" (target eksplisit sesi ini) sekarang lengkap. Lihat
`IMPLEMENTATION_STATUS.md` § Tahap 8 & `TODO.md` #4e utk detail.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat tersisa: TODO.md
#8 (Tahap 5, Daily/Reminder/Target Summary), lanjutan Tahap 6 (histori
per rule, butuh keputusan produk kecil), Sesi 33 (`deliverySimulation`)
belum diaudit/didokumentasikan detail (di luar scope sesi ini), atau
track LifeOS.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox
tanpa internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; dokumentasi (`TODO.md`/`IMPLEMENTATION_STATUS.md`) sempat
tidak sinkron dgn kode utk Tahap 8 Performance Check (dicatat "belum
dikerjakan" padahal sudah selesai Sesi 30) — diperbaiki sesi ini; Sesi
33 (`ai-delivery-simulation`) juga belum tercatat di `docs/CLAUDE.md`/
`TODO.md`, dibiarkan apa adanya sesuai instruksi user (tidak audit
ulang), mungkin perlu didokumentasikan sesi mendatang kalau relevan.

## Catatan kerja — 2026-07-18 (Sesi 36, LIFEOS IMPLEMENTATION MODE): Registry Driven Project Adapter

Target eksplisit user: migrasikan `project-adapter.js` supaya sepenuhnya
pakai registry existing sebagai source of truth (bukan bikin registry
baru), pola SAMA PERSIS dgn `today-adapter.js` (Sesi 24) &
`goal-adapter.js` (Sesi 25). Instruksi: baca hanya
`README_DEVELOPER.md`/`NEXT_SESSION.md`/`PRODUCT_DECISIONS.md`/
`CLAUDE.md` (tail), tidak audit ulang seluruh repo, tidak roadmap baru,
tidak refactor besar.

**Temuan audit kecil:** `project-adapter.js` merge 2 sumber
(D.renovProjects legacy + LifeOSStore.projects generic), sebelumnya
STRING `'renovasi'`/`'business'`/`'renovProjects'` hardcode langsung di
badan `projectAdapterList()` — TIDAK membaca registry sama sekali,
padahal `lifeos-registry.js` SUDAH punya
`LIFEOS_PROJECT_LEGACY_SOURCE = { key: 'renovasi', dArr: 'renovProjects',
areaKey: 'business' }` (dibuat sesi-sesi sebelumnya, belum pernah
dikonsumsi). Tidak ada `LIFEOS_PROJECT_SOURCES` (array) — sesuai izin
instruksi user ("atau registry project existing"), dipakai registry yang
sudah ada apa adanya, TIDAK membuat registry baru.

**Yang dikerjakan:** `projectAdapterList()` (`lifeos/adapters/
project-adapter.js`) di-refactor — bagian legacy sekarang baca
`LIFEOS_PROJECT_LEGACY_SOURCE` dari registry lalu dispatch ke builder
`projectSourceRenovasi()` lewat `PROJECT_LEGACY_SOURCE_BUILDERS` (key
tanpa builder terdaftar dilewati aman, tidak throw — pola sama dgn
`TODAY_SOURCE_BUILDERS`/`GOAL_SOURCE_BUILDERS`). String yang sebelumnya
hardcode (`'renovasi'`, `'business'`, `'renovProjects'`) sekarang dibaca
dari `src.key`/`src.areaKey`/`src.dArr` — 0 perubahan output (diverifikasi
lewat test: id/kind/areaKey/sourceRef persis sama). Bagian generic
(`LifeOSStore.projects`) SENGAJA TIDAK disentuh — itu bukan "sumber D"
yang perlu didaftarkan di registry (penyimpanan generik Life OS sendiri,
ditulis lewat `project-service.js`), sama seperti `knowledge-adapter.js`
tidak mendaftarkan `LifeOSStore.knowledge` ke registry manapun.

Tidak ada registry/helper/adapter/storage/event baru dibuat — murni
reuse `LIFEOS_PROJECT_LEGACY_SOURCE` yang sudah ada + pola dispatch
builder yang sudah ada dari `today-adapter.js`/`goal-adapter.js`.
`review-adapter.js`/`knowledge-adapter.js` (kandidat lain yang disebut
`docs/NEXT_SESSION.md`) TIDAK disentuh sesi ini — di luar scope target
tunggal sesi ini.

**File yang diedit:** `lifeos/adapters/project-adapter.js` (refactor
registry-driven bagian legacy, 0 perubahan output), `tests/
lifeos-project-adapter.test.js` (BARU, 8 test: key+builder terdaftar di
registry, legacy dipetakan dari `D[dArr registry]`, key tanpa builder
dilewati aman, `dArr` diganti runtime otomatis ikut kebaca, D kosong
tidak throw, generic tidak berubah, urutan gabungan legacy->generic,
`projectAdapterFindOne()`).

**Hasil test:**
- `node --test tests/lifeos-project-adapter.test.js` → 8/8 pass (file
  baru).
- `node --test tests/*.test.js` (full suite) → **2304/2304 pass, 0
  fail** (naik dari 2296 sebelum sesi ini — verifikasi langsung run test
  di ZIP Sesi 35, bukan cuma angka di `docs/NEXT_SESSION.md` — +8 test
  baru dari `tests/lifeos-project-adapter.test.js`), 0 regresi.
- Diulang lagi SETELAH build → tetap 2304/2304 pass, 0 regresi dari
  proses build itu sendiri.

**Hasil build:**
- `node scripts/build.js kw100-sesi36-registry-driven-project-adapter`
  → sukses. Ketiga lint-guard bawaan lolos, kedua bundle lolos
  `node --check` sintaks, `index.html`/`app_production.html` tetap
  identik, versi naik ke build
  `kw100-sesi36-registry-driven-project-adapter` (`?v=465`, dari
  `?v=464`). `docs/FILE-MAP.md` diregenerasi (131 file, 1228 identifier
  — naik dari 1218 krn 2 fungsi builder + 1 konstanta
  `PROJECT_LEGACY_SOURCE_BUILDERS` + 1 fungsi `projectAdapterLegacyList`
  baru yang top-level).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
  Bundle hasil build TANPA minifikasi (fallback otomatis, aman tapi
  lebih besar).
- ZIP (`kw_release_sesi36_lifeos-project-adapter-registry_v465.zip`)
  dibuat SEGERA setelah build sukses, SEBELUM update dokumentasi ini,
  sesuai urutan kerja wajib di `docs/ZIP_RULES.md`.

**Progress LifeOS:** `LIFEOS_AREAS`/`LIFEOS_TODAY_SOURCES`/
`LIFEOS_GOAL_SOURCES`/`LIFEOS_PROJECT_LEGACY_SOURCE` sekarang semua
registry-driven & benar-benar dikonsumsi (bukan cuma diklaim di
docstring). `review-adapter.js`/`knowledge-adapter.js` MASIH belum
registry-driven (di luar scope sesi ini, tetap jadi kandidat sesi
mendatang sesuai `docs/NEXT_SESSION.md`).

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat LifeOS tersisa:
registry-driven-kan `review-adapter.js`/`knowledge-adapter.js`. Kandidat
Smart AI (TODO.md #8 Daily/Reminder/Target Summary, Tahap 6 lanjutan,
audit Sesi 33 `deliverySimulation`) juga masih terbuka kalau user pilih
track Smart AI sesi berikutnya.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox tanpa
internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; `review-adapter.js`/`knowledge-adapter.js` (track LifeOS) masih
belum registry-driven; Sesi 33 (`ai-delivery-simulation`, track Smart
AI) masih belum terdokumentasi detail.

## Catatan kerja — 2026-07-18 (Sesi 37, LIFEOS IMPLEMENTATION MODE): Registry Driven Review Adapter

Target eksplisit user: migrasikan `review-adapter.js` supaya sepenuhnya
pakai registry existing sebagai source of truth (bukan bikin registry
baru), pola SAMA PERSIS dgn `today-adapter.js` (Sesi 24), `goal-adapter.js`
(Sesi 25), & `project-adapter.js` (Sesi 36). Instruksi: baca hanya
`README_DEVELOPER.md`/`NEXT_SESSION.md`/`PRODUCT_DECISIONS.md`/
`CLAUDE.md` (tail), tidak audit ulang seluruh repo, tidak roadmap baru,
tidak refactor besar.

**Temuan audit kecil:** `reviewAdapterLatestSnapshots()` sebelumnya
hardcode 3 nama array/field D langsung (`D.wealthSnapshots`,
`D.lifeBalanceSnapshots`, `D.assetAllocation`) di badan fungsi — TIDAK
membaca registry sama sekali, padahal `lifeos-registry.js` SUDAH punya
`LIFEOS_REVIEW_SOURCES` (array 3 entri: `wealth`/`lifeBalance`/
`assetAlloc`, masing-masing dgn `dArr`), dibuat sesi-sesi sebelumnya,
belum pernah dikonsumsi. `reviewAdapterLogFor()`/`reviewAdapterIsOverdue()`
(baca `LifeOSStore.reviewLog`) di luar scope registry ini (bukan sumber
D, tidak disentuh).

**Yang dikerjakan:** `reviewAdapterLatestSnapshots()` (`lifeos/adapters/
review-adapter.js`) di-refactor jadi registry-driven — iterasi
`LIFEOS_REVIEW_SOURCES`, dispatch ke builder di `REVIEW_SOURCE_BUILDERS`
berdasar `key` (key tanpa builder dilewati aman, tidak throw — pola sama
dgn `TODAY_SOURCE_BUILDERS`/`GOAL_SOURCE_BUILDERS`/
`PROJECT_LEGACY_SOURCE_BUILDERS`). 2 builder (`wealth`/`lifeBalance`)
ambil item TERAKHIR dari array snapshot (`reviewSourceLastSnapshot`,
baca `D[src.dArr]`); 1 builder (`assetAlloc`) baca objek tunggal
langsung tanpa `.slice()` (`reviewSourceDirect`) — dibedakan krn bentuk
datanya memang beda (array snapshot historis vs objek alokasi tunggal),
BUKAN arsitektur baru, cuma 2 builder simpel yang sesuai bentuk data
masing-masing. Nama field OUTPUT tetap sama persis dgn sebelum migrasi
(`wealth`/`lifeBalance`/`assetAllocation`) lewat mapping kecil
`REVIEW_OUTPUT_FIELD` (`assetAlloc` -> `assetAllocation`, 2 lainnya
identity) — supaya `lifeos/ui/review.js` yang sudah baca
`snapshots.wealth`/`snapshots.lifeBalance` TIDAK perlu berubah sama
sekali. 0 perubahan output, backward compatible penuh (diverifikasi
lewat test).

Tidak ada registry/helper/adapter/storage/event baru dibuat — murni
reuse `LIFEOS_REVIEW_SOURCES` yang sudah ada + pola dispatch builder
yang sudah ada dari `today-adapter.js`/`goal-adapter.js`/
`project-adapter.js`. `knowledge-adapter.js` (kandidat lain yang disebut
`docs/NEXT_SESSION.md`) TIDAK disentuh sesi ini — di luar scope target
tunggal sesi ini.

**File yang diedit:** `lifeos/adapters/review-adapter.js` (refactor
registry-driven bagian `reviewAdapterLatestSnapshots()`, 0 perubahan
output; `reviewAdapterLogFor()`/`reviewAdapterIsOverdue()` TIDAK
disentuh), `tests/lifeos-review-adapter.test.js` (BARU, 10 test:
semua key di `LIFEOS_REVIEW_SOURCES` punya builder terdaftar, wealth/
lifeBalance/assetAlloc dipetakan dgn benar dari `D[dArr registry]`, D
kosong -> semua field null tidak throw, entri dihapus dari registry ->
field hilang dari hasil, key tanpa builder dilewati aman, `dArr` diganti
runtime otomatis ikut kebaca, `reviewAdapterLogFor()`/
`reviewAdapterIsOverdue()` tidak berubah).

**Hasil test:**
- `node --test tests/lifeos-review-adapter.test.js` → 10/10 pass (file
  baru).
- `node --test tests/*.test.js` (full suite) → **2314/2314 pass, 0
  fail** (naik dari 2304 sebelum sesi ini, +10 test baru dari file baru),
  0 regresi.
- Diulang lagi SETELAH build → tetap 2314/2314 pass, 0 regresi dari
  proses build itu sendiri.

**Hasil build:**
- `node scripts/build.js kw101-sesi37-registry-driven-review-adapter`
  → sukses. Ketiga lint-guard bawaan lolos, kedua bundle lolos
  `node --check` sintaks, `index.html`/`app_production.html` tetap
  identik, versi naik ke build
  `kw101-sesi37-registry-driven-review-adapter` (`?v=466`, dari
  `?v=465`). `docs/FILE-MAP.md` diregenerasi (131 file, 1232 identifier
  — naik dari 1228 krn 2 fungsi builder + 2 konstanta
  (`REVIEW_SOURCE_BUILDERS`/`REVIEW_OUTPUT_FIELD`) baru yang top-level).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini
  tanpa akses internet, sama seperti keterbatasan sesi-sesi sebelumnya.
  Bundle hasil build TANPA minifikasi (fallback otomatis, aman tapi
  lebih besar).
- ZIP (`kw_release_sesi37_lifeos-review-adapter-registry_v466.zip`)
  dibuat SEGERA setelah build sukses, SEBELUM update dokumentasi ini
  (lalu di-regenerate 1x lagi setelah dokumentasi diupdate supaya ZIP
  final yang dikirim ke user berisi dokumentasi terbaru juga — sesuai
  preferensi user di Sesi 36).

**Progress LifeOS:** `LIFEOS_AREAS`/`LIFEOS_TODAY_SOURCES`/
`LIFEOS_GOAL_SOURCES`/`LIFEOS_PROJECT_LEGACY_SOURCE`/
`LIFEOS_REVIEW_SOURCES` sekarang semua registry-driven & benar-benar
dikonsumsi (bukan cuma diklaim di docstring). `knowledge-adapter.js`
MASIH belum registry-driven (di luar scope sesi ini, tetap jadi kandidat
sesi mendatang sesuai `docs/NEXT_SESSION.md`).

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — kandidat LifeOS tersisa:
registry-driven-kan `knowledge-adapter.js` (adapter terakhir dari daftar
area/today/goal/project/review/knowledge). Kandidat Smart AI (TODO.md #8
Daily/Reminder/Target Summary, Tahap 6 lanjutan, audit Sesi 33
`deliverySimulation`) juga masih terbuka kalau user pilih track Smart AI
sesi berikutnya.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox tanpa
internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; `knowledge-adapter.js` (track LifeOS) masih belum
registry-driven; Sesi 33 (`ai-delivery-simulation`, track Smart AI)
masih belum terdokumentasi detail.

## Sesi 38 (2026-07-18): Registry Driven Knowledge Adapter

Target eksplisit user: migrasikan `knowledge-adapter.js` supaya sepenuhnya
pakai registry sebagai source of truth — melengkapi daftar
area/today/goal/project/review/knowledge (`project-adapter.js` Sesi 36,
`review-adapter.js` Sesi 37).

**Audit kecil** (`lifeos/adapters/knowledge-adapter.js`,
`lifeos/lifeos-registry.js`): `knowledgeAdapterCatatanRef(D)` masih
`return D.catatan || {}` — hardcode nama field D langsung, TIDAK membaca
registry sama sekali. Registry `LIFEOS_KNOWLEDGE_REF_SOURCE` (bentuknya 1
objek `{ key: 'catatan', dArr: 'catatan' }`, BUKAN array — sama persis
kasusnya dgn `LIFEOS_PROJECT_LEGACY_SOURCE`) sudah ada di
`lifeos-registry.js` sejak sebelum Sesi 38, tapi belum pernah dikonsumsi
oleh adapter manapun. `knowledgeAdapterList()`/`knowledgeAdapterByTag()`
(baca `LifeOSStore.knowledge`, BUKAN `D`) di luar scope — itu penyimpanan
Knowledge base LifeOS sendiri (`services/knowledge-service.js`), bukan
"sumber D" yang perlu registry.

**Implementasi** (`lifeos/adapters/knowledge-adapter.js`): pola SAMA
persis dgn `projectAdapterLegacyList()`/`PROJECT_LEGACY_SOURCE_BUILDERS`
(Sesi 36) — karena kedua registry ini sama-sama 1 objek, bukan array:
- `knowledgeRefSourceCatatan(D, src)` — builder baru, balikin
  `D[src.dArr] || {}`.
- `KNOWLEDGE_REF_SOURCE_BUILDERS` — map `{ catatan: knowledgeRefSourceCatatan }`,
  didaftar per `key` registry (pola sama dgn
  `PROJECT_LEGACY_SOURCE_BUILDERS`/`REVIEW_SOURCE_BUILDERS`/
  `GOAL_SOURCE_BUILDERS`/`TODAY_SOURCE_BUILDERS`).
- `knowledgeAdapterCatatanRef(D)` — sekarang baca
  `LIFEOS_KNOWLEDGE_REF_SOURCE`, dispatch ke builder lewat `src.key`, kalau
  registry/builder tidak ada balik `{}` aman (tidak throw) — sama pola
  guard `typeof ... !== 'undefined'` yang dipakai adapter lain.

0 perubahan output — `knowledgeAdapterCatatanRef(D)` tetap balikin isi
`D.catatan` persis sama seperti sebelum migrasi (cuma jalurnya sekarang
lewat registry, bukan hardcode). TIDAK ada registry/helper/adapter/
storage/event baru — reuse penuh pola existing
(`PROJECT_LEGACY_SOURCE_BUILDERS` sbg referensi, `LIFEOS_KNOWLEDGE_REF_SOURCE`
yang sudah ada).

**Test baru** (`tests/lifeos-knowledge-adapter.test.js`, 0 → 8 test — file
ini SEBELUMNYA belum ada test sama sekali, jadi ini test pertama utk
`knowledgeAdapterList()`/`knowledgeAdapterByTag()` sekaligus): builder
terdaftar utk key registry, dibaca dari `D[dArr registry]` (bukan hardcode
"catatan"), `D.catatan` belum ada -> objek kosong tidak throw, `dArr`
diganti di registry -> adapter otomatis ikut baca array baru (bukti
benar-benar registry-driven), key registry tanpa builder -> objek kosong
tidak throw, `knowledgeAdapterList()` sort terbaru dulu + array kosong
kalau `LifeOSStore.knowledge` belum ada, `knowledgeAdapterByTag()` filter
per tag + tetap terurut. (Catatan teknis: pakai `Object.keys(...).length`/
`.length` alih-alih `assert.deepEqual` langsung utk hasil objek/array
kosong dari vm sandbox — objek/array lintas-realm bikin `deepEqual` gagal
walau isinya identik, pola sama dgn `vehicle-tx-category.test.js`/
`fi-calc.test.js`.)

**Hasil test**: `npm test` 2322/2322 pass (naik dari 2314, +8 test baru).
`npm run build` sukses, `?v=467`
(`kw102-sesi38-registry-driven-knowledge-adapter`).
- `npm run lint`/`esbuild` TIDAK bisa dijalankan — sandbox sesi ini tanpa
  akses internet, sama seperti keterbatasan sesi-sesi sebelumnya. Bundle
  hasil build TANPA minifikasi (fallback otomatis, aman tapi lebih besar).
- ZIP (`kw_release_sesi38_lifeos-knowledge-adapter-registry_v467.zip`)
  dibuat SEGERA setelah build sukses, SEBELUM update dokumentasi ini
  (lalu di-regenerate 1x lagi setelah dokumentasi diupdate supaya ZIP
  final yang dikirim ke user berisi dokumentasi terbaru juga — sesuai
  preferensi user di Sesi 36).

**Progress LifeOS:** SEMUA 6 adapter (area/today/goal/project/review/
knowledge) sekarang registry-driven & benar-benar dikonsumsi (bukan cuma
diklaim di docstring). Migrasi registry-driven daftar adapter yang
dicatat sejak Sesi 36/37 sekarang TUNTAS.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — belum ada kandidat konkret
baru di track LifeOS (migrasi registry-driven ke-6 adapter sudah tuntas),
perlu arahan user. Kandidat Smart AI (TODO.md #8 Daily/Reminder/Target
Summary, Tahap 6 lanjutan, audit Sesi 33 `deliverySimulation`) masih
terbuka kalau user pilih track Smart AI sesi berikutnya.

**Known Issue:** tidak ada isu baru dari sesi ini. Isu lama yang masih
berlaku: `npm run lint`/`esbuild` tidak bisa dijalankan di sandbox tanpa
internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; Sesi 33 (`ai-delivery-simulation`, track Smart AI) masih belum
terdokumentasi detail.

## Sesi 39 — 2026-07-18: Audit dokumentasi Tahap 7 Delivery Simulation (Sesi 33) + fix build blocker `APP_BUILD_VERSION`

**Target:** dipilih dari 3 kandidat di `docs/NEXT_SESSION.md` (Kandidat
1: Daily/Reminder Summary — butuh keputusan produk; Kandidat 2: Tahap 6
lanjutan — butuh keputusan produk; Kandidat 3: audit Sesi 33
`deliverySimulation`). Kandidat 3 dipilih krn satu-satunya yang TIDAK
butuh keputusan produk baru, TIDAK ubah arsitektur, risiko regresi
paling kecil, & bisa selesai 1 sesi.

**Temuan audit:** `AIService.simulate()` field `result.deliverySimulation`
(Tahap 7, ditandai "TARGET Sesi 33" di JSDoc `modules/ai/ai-service.js`)
sudah lengkap diimplementasikan — reuse `LogisticsEngine.deliverySummary()`
+ `_aiLastPendingCobekOrder()` (helper existing, bukan baru), 10 test
sudah ada di `tests/ai-service.test.js` (baris ~571-640), semuanya pass.
TIDAK ada kode yang kurang. Yang stale hanya dokumentasi status:
- `IMPLEMENTATION_STATUS.md` § Tahap 7 masih tulis "Delivery Simulation
  ❌" & status 35% — padahal sudah ✅ sejak Sesi 33.
- `ROADMAP.md` § Tahap 7 masih ☐ Delivery Simulation.

Ini persis pola insiden "dokumentasi status tidak sinkron dgn kode
nyata" yang sudah beberapa kali tercatat di project ini sebelumnya.

**Perbaikan (dokumentasi murni, 0 perubahan kode/fitur):**
- `IMPLEMENTATION_STATUS.md`: Tahap 7 35% → 45% (Delivery Simulation
  ditandai ✅ dgn deskripsi lengkap), header tanggal audit diupdate.
- `ROADMAP.md`: checkbox Delivery Simulation ☐ → ☑.
- `TODO.md`: entri Sesi 39 ditambahkan di paling atas.

**Blocker terpisah yang ditemukan & diperbaiki (bukan target sesi, tapi
menghalangi step wajib "Build" di workflow):** `node scripts/build.js`
(tanpa argumen) throw `Error: Format versi
"kw103-sesi39-executive-dashboard-integration" tidak dikenali (harus
diakhiri -angka)` — `APP_BUILD_VERSION` di
`modules/shared/features-helpers-global-security.js` sempat ditulis
manual jadi label custom tanpa akhiran angka. Pola & solusi PERSIS sama
dgn insiden sebelumnya (lihat "Catatan kerja — 2026-07-17 (bagian ke-12)"
di atas): jalankan build dgn versi eksplisit yang menutup label lama dgn
`-angka` —
`node scripts/build.js kw103-sesi39-executive-dashboard-integration-1`.
Build lalu auto-detect versi numerik tertinggi di HTML (468, dari nama
ZIP masuk) dan lanjut ke 469. Build normal (tanpa argumen manual) sudah
bisa dipakai lagi mulai sesi berikutnya. Ini murni perbaikan format
string versi, BUKAN keputusan produk, jadi dikerjakan langsung tanpa
berhenti tanya user (konsisten dgn penanganan insiden yang sama
sebelumnya).

**File yang diubah:** `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`,
`TODO.md`, `docs/CLAUDE.md` (sesi ini), + 6 file sumber versi (bumped
otomatis oleh `build.js`: `modules/shared/modules-render.js`,
`modules/shared/modals.js`, `modules/shared/modules-calc.js`,
`chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
`ai-chat.js`) + `app-bundle-a.min.js`/`app-bundle-b.min.js`/
`app_production.html`/`index.html`/`sw.js`/`FILE-MAP.md` (regenerasi
build rutin).

**Test baru:** 0 (murni sinkronisasi dokumentasi + fix versi, tidak ada
logic baru).

**Hasil test:** `node --test tests/*.test.js` → 2332/2332 pass (0
regresi, dijalankan 2x — sebelum & sesudah build — hasil identik).

**Hasil build:** sukses, `?v=469`
(`kw103-sesi39-executive-dashboard-integration-1`). `esbuild` tidak
tersedia di sandbox (tanpa akses internet) — bundle tanpa minifikasi,
sama seperti keterbatasan sesi-sesi sebelumnya.

**Progress:** Tahap 7 (AI Simulation) 35% → 45%.

**Next TODO:** Lihat `docs/NEXT_SESSION.md` — 3 kandidat sisa (Kandidat
1 Daily/Reminder Summary, Kandidat 2 Tahap 6 lanjutan, Track LifeOS)
semuanya butuh keputusan produk/arahan user kecil dulu sebelum bisa
dikerjakan.

**Known Issue:** tidak ada isu baru. Isu lama yang masih berlaku:
`npm run lint`/`esbuild` tidak bisa dijalankan di sandbox tanpa
internet; goal-adapter `pensiun`/`fi`/`debt` (track LifeOS) masih
terbuka; TODO.md #8 & Tahap 6 lanjutan masih butuh keputusan produk.

## Sesi 40 — 2026-07-18: Finalisasi keputusan produk — Reminder Summary, Target Summary, Tahap 6 tampilan histori

**Target:** BUKAN implementasi fitur baru. Audit kecil kandidat Smart AI
yang terblokir keputusan produk (Kandidat 1 & 2 dari `docs/NEXT_SESSION.md`
akhir Sesi 39), lalu finalisasi keputusan produk yang diperlukan supaya
sesi implementasi berikutnya tidak ambigu. Prioritas sesuai instruksi
user: (1) Daily Summary, (2) Reminder Summary, (3) Tahap 6 AI Learning.

**Audit & keputusan (detail lengkap di `docs/PRODUCT_DECISIONS.md`):**

1. **Daily Summary — TIDAK butuh keputusan baru.** Struktur 5-bagian
   sudah final sejak Sesi 26. Checkbox "Daily Summary" di `ROADMAP.md`
   otomatis lengkap begitu Reminder Summary & Target Summary selesai —
   bukan item desain terpisah. Diklarifikasi di
   `docs/PRODUCT_DECISIONS.md` supaya sesi depan tidak audit ulang.

2. **Target Summary — cross-check arsitektur (dicatat "mungkin butuh
   keputusan produk tambahan" di Sesi 26) ternyata SUDAH terjawab** di
   `docs/LIFEOS_SCOPE.md` § "Di luar scope LifeOS": AI membaca LifeOS
   satu arah diizinkan eksplisit. **Keputusan final:** field
   `targetSummary` di `dailyBriefing()` = `goalAdapterList()`
   (`lifeos/adapters/goal-adapter.js`) diangkat apa adanya, guard
   `typeof`, `null` kalau LifeOS belum di-load — pola sama persis dgn
   `financialSummary`/`deliverySummary`.

3. **Reminder Summary — keputusan sumber data final.** Audit kode
   menemukan `todayAdapterList()` (`lifeos/adapters/today-adapter.js`,
   registry-driven lewat `LIFEOS_TODAY_SOURCES`: bills/reminders/
   selfcare/payroll/tukang) sudah persis fungsi read-only lintas-domain
   yang dibutuhkan — `checkAndFireReminders()` (`reminder-notif.js`)
   TIDAK bisa dipakai langsung krn bukan fungsi murni (side-effect
   notifikasi/DOM). **Keputusan final:** field `reminderSummary` =
   `todayAdapterList()` diangkat apa adanya, guard `typeof`, `null`
   kalau tidak tersedia. Dicatat juga: urutan abstrak "Reminder
   Priority" (Finance→Vehicle→Shop→Asset→Goal→LifeOS, keputusan lama
   Sesi 26) belum 1:1 dgn 5 `key` di `LIFEOS_TODAY_SOURCES` saat ini —
   TIDAK menghalangi implementasi sesi depan, perluasan registry ke
   domain lain (kalau nanti diinginkan) adalah pekerjaan additive
   terpisah di masa depan.

4. **Tahap 6 AI Learning lanjutan — keputusan bentuk tampilan final.**
   Histori Terima/Tolak/Abaikan per rule ditampilkan sbg baris kecil
   TAMBAHAN di kartu existing `AIRecommendCard` (`ai-chat.js`) — bukan
   halaman/route/chart/modal baru. Reuse penuh
   `AIDecision.learn.getStats(ruleId)`/`getConfidence(ruleId)` yang
   sudah ada sejak Sesi 14/19, TIDAK ada storage/helper baru. Format
   teks persis diserahkan ke implementasi teknis (bukan keputusan
   produk). Guard: kalau rule belum pernah punya histori
   (`accepted+rejected+ignored===0`), baris statistik TIDAK ditampilkan.

**Implementasi kecil tanpa keputusan tambahan:** TIDAK ADA yang
dikerjakan sesi ini (sesuai instruksi eksplisit user: sesi ini murni
keputusan produk, implementasi fitur ditunda ke sesi berikutnya
walaupun blocker-nya sudah terjawab semua).

**File yang diubah:** `docs/PRODUCT_DECISIONS.md` (3 keputusan baru +
klarifikasi Daily Summary), `docs/CLAUDE.md` (sesi ini),
`docs/NEXT_SESSION.md`, `TODO.md`. Tidak ada perubahan source
code/logic — build tetap dijalankan sesuai SESSION WORKFLOW (regenerasi
bundle rutin, 6 file versi + bundle + HTML + sw.js + FILE-MAP.md).

**Test baru:** 0 (tidak ada perubahan logic).

**Hasil test:** `node --test tests/*.test.js` → 2332/2332 pass (0
regresi).

**Hasil build:** sukses, `?v=470` — build jalan TANPA argumen manual
(konfirmasi fix `APP_BUILD_VERSION` Sesi 39 masih berlaku).

**Progress:** 0% (sesi keputusan produk, bukan implementasi). Tahap 5 &
Tahap 6 SEKARANG SIAP diimplementasikan sesi berikutnya tanpa blocker
keputusan produk tersisa.

**Next TODO:** Sesi 41 bisa langsung implementasi salah satu dari:
Reminder Summary + Target Summary (Tahap 5, `dailyBriefing()`), atau
Tahap 6 tampilan histori (`AIRecommendCard`). Lihat
`docs/NEXT_SESSION.md` utk target final & file yang akan diubah.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.

## Sesi 41 — 2026-07-18: Audit kecil menemukan Reminder Summary/Target Summary/Daily Summary (Tahap 5) SUDAH lengkap sejak Sesi 31 — sinkronisasi dokumentasi

**Target:** Audit kecil terhadap 2 kandidat siap-kerja di
`docs/NEXT_SESSION.md` (Kandidat 1: Reminder Summary + Target Summary;
Kandidat 2: Tahap 6 tampilan histori), pilih SATU sesuai kriteria: tidak
butuh keputusan produk baru, tidak butuh perubahan arsitektur, selesai
dalam 1 sesi, dampak terbesar, risiko regresi terkecil.

**Audit:** Sebelum mulai implementasi Kandidat 1, `modules/ai/ai-service.js`
dibaca ulang (bukan ditulis dari asumsi `docs/NEXT_SESSION.md`) — ternyata
`_aiReminderAndTargetSummary()` + field `reminderSummary`/`targetSummary`
di `dailyBriefing()` SUDAH lengkap diimplementasikan sejak **Sesi 31**
(komentar kode eksplisit menyebut "Sesi 31"), dan `tests/ai-service.test.js`
sudah punya 4 test khusus untuk itu (baris ~206-286) — SEMUA lulus. Bentuk
implementasinya PERSIS sama dengan keputusan final yang dicatat ulang di
`docs/PRODUCT_DECISIONS.md` Sesi 40 (reuse `goalAdapterList()`/
`todayAdapterList()` apa adanya, guard `typeof`, `null` kalau tidak
tersedia). Yang stale HANYA dokumentasi: `ROADMAP.md` masih ☐ untuk
"Daily Summary"/"Reminder Summary" (Target Summary malah tidak ada baris
checkbox-nya sama sekali), dan `IMPLEMENTATION_STATUS.md` masih menulis
Tahap 5 55% dengan Reminder/Daily Summary ❌ — pola insiden yang SAMA
PERSIS dengan Sesi 39 (Tahap 7 Delivery Simulation kodenya sudah selesai
duluan, dokumentasi ketinggalan).

**Kenapa ini dipilih dibanding Kandidat 2:** Setelah audit, Kandidat 1
BUKAN lagi "implementasi 2 field baru" — ia sudah 0% kode tersisa
(duplicate kalau dikerjakan ulang, dilarang eksplisit di
`docs/SESSION_RULES.md`). Sinkronisasi dokumentasi murni: tidak butuh
keputusan produk, tidak butuh perubahan arsitektur, risiko regresi NOL
(tidak ada baris kode yang disentuh), dan dampaknya besar — Tahap 5 (AI
Daily Briefing) naik dari status stale 55% menjadi akurat 100%, dan
mencegah sesi berikutnya membuang waktu mengimplementasikan ulang fitur
yang sudah ada. Kandidat 2 (Tahap 6 histori) TETAP terbuka & siap
dikerjakan sesi berikutnya, tidak disentuh sama sekali sesi ini (sesuai
"satu target per sesi").

**Implementasi:** TIDAK ADA perubahan source code/logic/test. Perubahan
murni dokumentasi:
- `ROADMAP.md` — Tahap 5: "Daily Summary" & "Reminder Summary" diubah ☐→☑,
  tambah baris checkbox "Target Summary" (☑, sebelumnya tidak ada baris
  terpisah untuk ini).
- `IMPLEMENTATION_STATUS.md` — ringkasan atas: Tahap 5 55%→**100%**,
  Tahap 7 disamakan ke 45% (mengikuti catatan Sesi 39 yang sempat tidak
  terbawa ke tabel ringkasan). Bagian detail Tahap 5: ditulis ulang
  lengkap dengan status Reminder Summary ✅/Target Summary ✅/Daily
  Summary ✅ beserta sumber kode & test yang sudah ada (Sesi 31).

**File yang diubah:** `ROADMAP.md`, `IMPLEMENTATION_STATUS.md`,
`docs/CLAUDE.md` (sesi ini), `docs/NEXT_SESSION.md`, `TODO.md`. Build
tetap dijalankan rutin sesuai SESSION WORKFLOW (regenerasi bundle, versi
naik otomatis krn tidak ada perubahan source yang perlu argumen manual).

**Test baru:** 0 (tidak ada perubahan logic — 4 test Reminder/Target
Summary sudah ada sejak Sesi 31).

**Hasil test:** `node --test tests/*.test.js` → 2332/2332 pass (0
regresi, sama seperti Sesi 40).

**Hasil build:** sukses, `?v=471` — build jalan TANPA argumen manual.

**Progress:** Tahap 5 (AI Daily Briefing) 55%→**100%** (murni koreksi
status, kode sudah 100% sejak Sesi 31).

**Next TODO:** Kandidat 2 — Tahap 6 tampilan histori Terima/Tolak/Abaikan
di `AIRecommendCard` (`ai-chat.js`), keputusan produk sudah final di
`docs/PRODUCT_DECISIONS.md` § Tahap 6, siap implementasi langsung tanpa
tanya user lagi. Lihat `docs/NEXT_SESSION.md`.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap tidak
bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.

## Sesi 42 — 2026-07-18: Tahap 6 AI Learning lanjutan — baris statistik Terima/Tolak/Abaikan di AIRecommendCard

**Target:** Implementasi Kandidat 1 (satu-satunya kandidat Smart AI
tersisa di `docs/NEXT_SESSION.md` akhir Sesi 41) — statistik AI
Learning (Terima/Tolak/Abaikan per rule) ditampilkan di
`AIRecommendCard` (`ai-chat.js`), sesuai keputusan final
`docs/PRODUCT_DECISIONS.md` § "Tahap 6 AI Learning lanjutan" (Sesi 40).

**Audit kecil:** `ai-chat.js` (`AIRecommendCard.render()`/`act()`) dan
`modules/ai/ai-decision-engine.js` (`AIDecision.learn`) dibaca ulang —
`getStats(ruleId)` (balikin `{accepted,rejected,ignored}`, ada sejak
Sesi 14) dan `getConfidence(ruleId)` (dipakai Sesi 19 utk urutan tampil)
sudah lengkap & tidak perlu diubah. Tidak ada storage/registry/adapter
baru yang dibutuhkan — murni baca ulang data yang sudah dipersist.

**Implementasi:** Di dalam `AIRecommendCard.render()`, setelah `top`
(2 rekomendasi teratas) ditentukan, statistik per `ruleId` diambil lewat
`AIDecision.learn.getStats(ruleId)` (guard `typeof===function`, `Promise.all`
supaya tidak sekuensial). Baris kecil `📊 ✓ Terima X · ✗ Tolak Y · Abaikan Z`
ditambahkan DI DALAM kartu existing, di antara teks alasan & baris tombol
Terima/Tolak/Abaikan — BUKAN kartu/halaman/route/chart/modal baru. Guard
sesuai keputusan produk: baris statistik TIDAK ditampilkan sama sekali
kalau `getStats` tidak tersedia (versi AIDecision lama), kalau rule tidak
punya `ruleId`, kalau `getStats()` melempar error, atau kalau histori
kosong (`accepted+rejected+ignored===0`) — TIDAK pernah tampil "0/0/0".
TIDAK ada perubahan pada `act()`/dismiss/sorting confidence yang sudah
ada (backward compatible penuh).

**File yang diubah:** `ai-chat.js` (`AIRecommendCard.render()`),
`tests/ai-recommend-card.test.js` (helper `makeCtx` ditambah opsi
`getStatsImpl`, 5 test baru).

**Test baru:** 5 — (1) rule dgn histori tampilkan baris statistik dgn
angka benar, (2) rule tanpa histori (sum 0) TIDAK menampilkan baris
sama sekali, (3) `getStats` tidak tersedia (versi lama) tidak error &
tidak menampilkan baris, (4) `getStats()` melempar error tidak
menjatuhkan render(), (5) rekomendasi tanpa `ruleId` dilewati dari
lookup statistik.

**Hasil test:** `node --test tests/ai-recommend-card.test.js` →
17/17 pass. `node --test tests/*.test.js` → **2337/2337 pass** (naik
dari 2332, +5 test baru, 0 regresi).

**Hasil build:** sukses, `?v=472`.

**Progress:** Tahap 6 (AI Learning) naik dari 75% menuju status lebih
lengkap — histori Terima/Tolak/Abaikan SEKARANG ditampilkan ke user
(sebelumnya cuma dipakai internal utk sorting/confidence adaptif, tidak
pernah terlihat). Lihat `IMPLEMENTATION_STATUS.md` untuk angka final.

**Next TODO:** Belum ada kandidat konkret baru track Smart AI yang siap
kerja tanpa arahan user (semua item Tahap 5/6/8 utama sudah selesai).
Opsi: (a) Tahap 4 AI Decision Engine (85%, cek sisa sub-item apa yang
kurang), (b) Tahap 7 AI Simulation (45%, Scenario Engine masih 🟡
sekadar re-run rule), (c) Track LifeOS (goal-adapter
`pensiun`/`fi`/`debt` — masih butuh keputusan produk, JANGAN ditebak).
Lihat `docs/NEXT_SESSION.md` utk detail.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.

## Sesi 43 — 2026-07-18: Batch 1 Initialization — sistem Batch diintegrasikan ke dokumentasi resmi repo

**Target:** BUKAN implementasi fitur. Permintaan eksplisit user
("BATCH 1 INITIALIZATION") — integrasikan konsep Batch (pengelompokan
beberapa sesi + checkpoint review) ke repository tanpa melanggar aturan
project (`docs/SESSION_RULES.md`), supaya mulai sesi berikutnya Claude
cukup baca `docs/NEXT_SESSION.md` dan otomatis mengikuti Batch.

**Audit kecil (sebelum integrasi, sesuai instruksi user):**
`docs/NEXT_SESSION.md`, `docs/CLAUDE.md`, `TODO.md`, `ROADMAP.md`,
`IMPLEMENTATION_STATUS.md`, `docs/PRODUCT_DECISIONS.md` dibaca ulang.
Temuan penting: draft Batch 1 dari user menulis Sesi 42 sebagai
"sedang dikerjakan sesuai NEXT_SESSION" — tapi `docs/CLAUDE.md` (log
sesi sebelumnya) menunjukkan Sesi 42 **SUDAH SELESAI PENUH**
(implementasi Tahap 6 AI Learning lanjutan, build `?v=472`, 2337/2337
test pass). Sesi inisialisasi Batch ini sendiri, secara kronologis,
adalah **Sesi 43** (bukan salah satu dari 2 sesi "implementasi fitur"
Sesi 43/44 yang diasumsikan user di draft) — krn ini murni dokumentasi,
0 kode. Konsekuensi: draft Batch 1 user (5 sesi: 41–45) digeser jadi
**6 sesi (41–46)** supaya nomor sesi di Batch tetap sinkron dgn log
sekuensial `docs/CLAUDE.md` yang sudah berjalan sejak Sesi 22 (bukan
membuat 2 entri log berbeda dgn nomor sesi sama). Batch 2 ikut bergeser
jadi Sesi 47–51 (bukan 46–50 seperti draft user). Isi/pola konsep (2
sesi selesai + 1 sesi inisialisasi + 2 sesi implementasi + 1 sesi
review) TETAP PERSIS seperti diminta user — hanya nomor absolut yang
disesuaikan dgn kenyataan repo. Detail lengkap alasan pergeseran ada di
`docs/BATCH_PLAN.md` § "Kenapa dibuat".

**Implementasi (dokumentasi, additive, tidak mengubah arsitektur/aturan
kerja):**
- **`docs/BATCH_PLAN.md` (BARU)** — sumber kebenaran pengelompokan sesi
  ke Batch. Berisi tabel Batch 1 (Sesi 41–46, status tiap sesi + target,
  4 sesi pertama sudah terisi dari log aktual, Sesi 44/45/46 berisi
  target dari `docs/NEXT_SESSION.md`/`TODO.md` yang sudah ada — TIDAK
  ada fitur baru ditebak), placeholder Batch 2 (Sesi 47–51, target
  "akan ditentukan setelah Batch 1 selesai" sesuai instruksi eksplisit
  user "JANGAN menentukan fiturnya"), dan section "Aturan Batch" yang
  eksplisit menyatakan dokumen ini TIDAK menggantikan
  `docs/SESSION_RULES.md` — satu-target-per-sesi & urutan SESSION
  WORKFLOW tetap berlaku penuh di dalam Batch.
- **`docs/SESSION_RULES.md`** — 1 baris ditambahkan di § "Struktur
  dokumentasi" (`BATCH_PLAN.md`), murni additive, tidak ada baris lain
  yang diubah/dihapus.
- **`docs/NEXT_SESSION.md`** — section baru "Batch Tracking" di paling
  atas (ringkasan Batch saat ini, sesi berjalan/terakhir, sesi
  berikutnya, pointer ke `docs/BATCH_PLAN.md`), "Session terakhir" &
  "First Action" diperbarui ke Sesi 43/44.
- **`TODO.md`** — entri log Sesi 43 baru di paling atas (format sama
  dgn entri sesi lain), sesuai § "Format catatan sesi"
  `docs/SESSION_RULES.md`.

`ROADMAP.md`/`IMPLEMENTATION_STATUS.md` **TIDAK diubah** — tidak ada
progress tahap yang berubah sesi ini (murni proses/dokumentasi Batch,
bukan status fitur). `docs/PRODUCT_DECISIONS.md` **TIDAK diubah** —
Batch adalah keputusan proses/workflow (domain `docs/SESSION_RULES.md`),
bukan keputusan produk.

**File yang diubah:** `docs/BATCH_PLAN.md` (baru), `docs/SESSION_RULES.md`,
`docs/NEXT_SESSION.md`, `TODO.md`, `docs/CLAUDE.md` (sesi ini). Tidak
ada perubahan source code/logic — build tetap dijalankan sesuai SESSION
WORKFLOW (regenerasi bundle rutin, versi naik otomatis walau tidak ada
source JS yang berubah, pola sama dgn Sesi 40/41).

**Test baru:** 0 (tidak ada perubahan logic).

**Hasil test:** `node --test tests/*.test.js` → **2337/2337 pass**
(0 regresi, sama seperti akhir Sesi 42).

**Hasil build:** sukses, `?v=473`.

**Progress:** 0% (sesi dokumentasi/proses, bukan implementasi — sesuai
pola Sesi 40/41). Tidak ada tahap yang berubah status.

**Next TODO:** Sesi 44 (Batch 1, sesi implementasi fitur pertama
setelah Batch aktif) — Tahap 4 AI Decision Engine (85%), audit kecil
dulu `modules/ai/ai-decision-engine.js` vs `IMPLEMENTATION_STATUS.md`
§ Tahap 4 utk pastikan sub-item konkret yang masih kurang (cek juga
kemungkinan pola Sesi 39/41: status stale vs kode sudah selesai).
Lihat `docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md` utk detail.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.

---

## Sesi 44 (2026-07-18) — Batch 1, audit kecil Tahap 4 AI Decision Engine

**Target:** Kandidat #1 dari `docs/NEXT_SESSION.md` (per akhir Sesi 43),
baris Sesi 44 `docs/BATCH_PLAN.md`: **Tahap 4 — AI Decision Engine
(85%)** — audit kecil `modules/ai/ai-decision-engine.js` vs
`IMPLEMENTATION_STATUS.md` § Tahap 4 utk pastikan sub-item konkret apa
yang masih kurang dari 100%, sebelum implementasi apa pun.

**Audit kecil:** dibaca `modules/ai/ai-decision-engine.js` (380 baris),
`IMPLEMENTATION_STATUS.md` § Tahap 4, `ROADMAP.md` § Tahap 4. Hasil:
ke-4 sub-item yang tercatat sudah ✅ di detail `IMPLEMENTATION_STATUS.md`
(Recommendation, Decision Logic, Context Analysis, Cross Module
Analysis) memang benar-benar ada di kode & lolos test:
- Recommendation — `AIDecision.recommend` + `formatRecommendation()` ada.
- Decision Logic — `AIDecision.rules`/`.decide()` ada, 8 rule/4 domain.
- Context Analysis — `AIContext.snapshot()` (Sesi 13) ada.
- Cross Module Analysis — `registerCrossModuleAIRules()` (baris 357),
  rule `cross-finance-delivery-margin-balance` (baris 306/361) ada,
  divalidasi `tests/cross-module-ai-rule.test.js` (bagian dari suite
  2337 test yang lulus).

`ROADMAP.md` § Tahap 4 juga sudah semua ☑ (0 checkbox ☐ tersisa) — TIDAK
ada sub-item baru yang perlu ditulis. Kesimpulan: ini pola SAMA PERSIS
dengan insiden dokumentasi-vs-kode Sesi 39 (Tahap 7 Delivery Simulation)
& Sesi 41 (Tahap 5 Reminder/Target Summary) — kode & test sudah 100%
lengkap sejak Sesi 14, tapi ringkasan persentase di
`IMPLEMENTATION_STATUS.md` (85%) tidak pernah diperbarui mengikuti
detail sub-item di bawahnya yang sudah 4/4 ✅. Sesuai `docs/NEXT_SESSION.md`
("kalau audit menemukan Tahap 4 ternyata sudah 100% di kode, sesi ini
jadi sinkronisasi dokumentasi seperti Sesi 41, bukan implementasi baru
— itu bukan penyimpangan dari rencana"), sesi ini murni sinkronisasi
dokumentasi, TIDAK ada kode baru ditulis.

**Implementasi:** TIDAK ADA (0 kode berubah) — sesuai definisi
"implementasi" dari audit di atas, tidak ada sub-item yang benar-benar
kurang utk diimplementasikan.

**File yang diubah:**
- `IMPLEMENTATION_STATUS.md` — tabel ringkasan atas (`Tahap 4 : 🟡 85%`
  → `✅ 100%`) & section detail § Tahap 4 (baris status 85%→100%,
  catatan penjelasan pola Sesi 39/41), header "Terakhir diaudit"
  diperbarui ke Sesi 44/build `?v=474`.
- `TODO.md` — entri log Sesi 44 baru di paling atas.
- `docs/NEXT_SESSION.md` — Batch Tracking, "Session terakhir",
  "Checkpoint", "Target berikutnya" (Sesi 45 → Tahap 7), "File yang
  akan diubah", "Known Blocker", "First Action" diperbarui.
- `docs/BATCH_PLAN.md` — baris tabel Sesi 44 (⏳→✅ SELESAI, ringkasan
  hasil), baris Sesi 45 disederhanakan (hanya 1 kandidat tersisa,
  Tahap 7).
- `docs/CLAUDE.md` (sesi ini).

`ROADMAP.md` **TIDAK diubah** — sudah semua ☑ utk Tahap 4 sebelum sesi
ini, tidak ada checkbox yang perlu ditambah/diubah.
`docs/PRODUCT_DECISIONS.md` **TIDAK diubah** — tidak ada keputusan
produk baru sesi ini (murni audit + sinkronisasi status).

**Test baru:** 0 (tidak ada perubahan logic).

**Hasil test:** `node --test tests/*.test.js` → **2337/2337 pass**
(0 regresi, sama seperti akhir Sesi 43/42), dijalankan 2x (sebelum &
sesudah build) sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=474` (naik dari 473 — versi bundle naik
otomatis walau tidak ada source JS yang berubah, pola sama dgn Sesi
40/41/43).

**Progress:** Tahap 4 (AI Decision Engine) 85% → **100%**. Lihat
`IMPLEMENTATION_STATUS.md`.

**Next TODO:** Sesi 45 (Batch 1, per `docs/BATCH_PLAN.md`) — **Tahap 7
— AI Simulation (45%)**, Scenario Engine (builder skenario terstruktur,
masih 🟡 sekadar re-run rule biasa). Audit kecil dulu KODE ASLI
(`modules/ai/ai-service.js` `simulate()`, `tests/ai-service.test.js`)
apakah "kurang"-nya itu asli atau cuma dokumentasi stale (pola insiden
Sesi 39/41/44) — kalau asli kurang, cek juga apakah butuh keputusan
produk (bentuk/struktur skenario) sebelum implementasi, JANGAN ditebak.
Lihat `docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md` utk detail.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.

---

## Sesi 45 (2026-07-18) — Batch 1, implementasi Tahap 7 Scenario Engine

**Target:** Kandidat tunggal Sesi 45 per `docs/BATCH_PLAN.md`/
`docs/NEXT_SESSION.md`: **Tahap 7 — AI Simulation (45%)**, Scenario
Engine (builder skenario terstruktur) — audit kecil dulu utk pastikan
apakah sub-item ini benar-benar belum ada atau cuma dokumentasi stale
(pola Sesi 39/41/44), lalu implementasi HANYA kalau tidak butuh
keputusan produk baru.

**Audit kecil:** dibaca `modules/ai/ai-service.js` § `simulate()`,
`ai-chat.js` § `AISimulateWidget`, `ROADMAP.md`/`IMPLEMENTATION_STATUS.md`
§ Tahap 7. Hasil BERBEDA dari 3 sesi audit sebelumnya (39/41/44) — kali
ini gapnya **NYATA**, bukan dokumentasi stale:
- `ROADMAP.md` § Tahap 7 punya **1 checkbox ☐ betulan** (Scenario
  Engine) — 3 lainnya (What-If/Profit Simulation/Delivery Simulation)
  memang sudah ☑ dgn bukti kode yang valid.
- `simulate(ctx)` (baris 527) cuma bisa menjalankan **SATU** ctx ad-hoc
  per pemanggilan, tanpa nama/label/struktur — persis seperti yang
  ditulis di komentar kode itu sendiri ("murni What-If polos").
- `AISimulateWidget.run()` (`ai-chat.js` baris 660) juga cuma memanggil
  `AIService.simulate({})` — TIDAK ada builder/form/preset skenario
  apa pun di sisi UI.
- `docs/PRODUCT_DECISIONS.md` **TIDAK punya entri** soal bentuk/struktur
  skenario — konsisten dgn catatan `docs/NEXT_SESSION.md` sesi-sesi
  sebelumnya yang menandai kandidat ini "kemungkinan butuh keputusan
  produk".

**Keputusan desain (menghindari kebutuhan keputusan produk):** dibanding
menebak preset skenario bisnis spesifik (mis. "BBM naik 20%", "margin
turun 5%" — itu BUTUH keputusan produk soal angka yang relevan buat app
ini), dipilih desain MURNI TEKNIS: `AIService.simulateScenarios(scenarios)`
adalah **orkestrator berulang** di atas `simulate()` yang sudah ada —
menerima array skenario BERLABEL (`{name, ctx}` ATAU ctx polos dgn name
default `"Skenario N"`), menjalankan `simulate(ctx)` apa adanya per
skenario, mengembalikan hasil terstruktur `[{name, ctx, result, error}]`.
Nilai/isi tiap skenario (BBM berapa, margin berapa, dst) 100% datang
dari PEMANGGIL — sama persis dgn pola `ctx.profit`/`ctx.delivery` yang
sudah ada di `simulate()` sejak Sesi 15/33 — jadi method baru ini TIDAK
menambahkan satu pun nilai/threshold bisnis baru, murni infrastruktur
"builder terstruktur" yang memenuhi definisi `ROADMAP.md` tanpa
menebak keputusan produk.

**Implementasi:** `modules/ai/ai-service.js` — method baru
`simulateScenarios(scenarios)`:
- Guard: bukan array / array kosong → balik `[]`, TIDAK throw.
- 2 bentuk input diterima: `{name, ctx}` (terstruktur, `name` dipakai
  apa adanya kalau string non-kosong) ATAU ctx polos (tanpa properti
  `name`/`ctx`, name default `"Skenario 1"`/`"Skenario 2"`/dst
  berdasar index).
- Skenario dijalankan **berurutan** (`for` + `await`, BUKAN
  `Promise.all`) — sengaja, supaya urutan `results` PERSIS sama dgn
  urutan input, gampang dipetakan UI mendatang.
- Error di 1 skenario ditangkap per-item (`try/catch` per iterasi) —
  hasil skenario itu `{name, ctx, result:null, error:"pesan"}`, TIDAK
  menjatuhkan skenario lain dalam batch yang sama.
- `simulate(ctx)` dipanggil **APA ADANYA** per skenario (`this.simulate(ctx)`)
  — kontrak lamanya (return `decisions`/`triggered`/`recommendations`/
  `simulated`/`profitSimulation`/`deliverySimulation`) TIDAK berubah
  sama sekali, method baru murni MEMBUNGKUS di lapisan atas.

**File yang diubah:**
- `modules/ai/ai-service.js` — method baru `simulateScenarios()`
  (~35 baris kode + JSDoc penjelasan desain).
- `tests/ai-service.test.js` — **8 test baru**: array kosong/bukan
  array → `[]`; bentuk `{name,ctx}` terstruktur dgn 2 skenario nyata
  (nilai `profitSimulation` beda antar skenario, membuktikan `ctx`
  per-skenario benar-benar terpakai independen); ctx polos → name
  default `"Skenario N"` berurutan; name kosong/bukan string → fallback
  ke default; 1 skenario error tertangkap individual tanpa menjatuhkan
  skenario lain; urutan hasil PERSIS sama dgn urutan input (bukti
  eksekusi berurutan bukan `Promise.all`); kontrak `simulate()` lama
  TIDAK berubah (hasil identik antara panggil langsung vs lewat
  `simulateScenarios()` dgn 1 skenario). Catatan teknis: 3 assert
  awal sempat pakai `assert.deepEqual` polos & gagal krn array dibuat
  di realm vm sandbox berbeda (`loadSource` helper) — diperbaiki pakai
  `JSON.stringify()` comparison, pola yang SUDAH ADA & terdokumentasi
  di test lain di file yang sama (lihat komentar baris ~213 file
  sebelum sesi ini), BUKAN pola baru.
- `ROADMAP.md` — checkbox Scenario Engine ☐→☑.
- `IMPLEMENTATION_STATUS.md` — tabel ringkasan (`Tahap 7 : 🟡 45%` →
  `✅ 100%`, konsisten dgn cara hitung yang sama dipakai Tahap 4 Sesi
  44: 100% kalau semua checkbox `ROADMAP.md` § tahap terkait sudah ☑)
  & section detail § Tahap 7 (deskripsi lengkap `simulateScenarios()`,
  catatan eksplisit "belum ada UI wiring" supaya sesi mendatang tahu
  ini masih technical debt opsional, bukan diklaim selesai total).
- `TODO.md` — entri log Sesi 45 baru di paling atas.
- `docs/NEXT_SESSION.md` — ditulis ulang penuh (Batch Tracking,
  Session terakhir, Checkpoint, Target berikutnya → Sesi 46 Batch
  Review, kandidat UI wiring dicatat sbg opsional bukan wajib, Known
  Blocker, First Action, Stop Condition).
- `docs/BATCH_PLAN.md` — baris tabel Sesi 45 (⏳→✅ SELESAI, ringkasan
  hasil).
- `docs/CLAUDE.md` (sesi ini).

`docs/PRODUCT_DECISIONS.md` **TIDAK diubah** — tidak ada keputusan
produk baru yang perlu dicatat (desain sengaja dibuat MURNI teknis
justru supaya tidak butuh keputusan produk sama sekali).

**Test baru:** 8 (`tests/ai-service.test.js`).

**Hasil test:** `node --test tests/*.test.js` → **2345/2345 pass**
(naik dari 2337, +8 test baru, 0 regresi), dijalankan 2x (sebelum &
sesudah build) sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=475` (naik dari 474).

**Progress:** Tahap 7 (AI Simulation) 45% → **100%**. Lihat
`IMPLEMENTATION_STATUS.md`. Batch 1 sekarang: Tahap 1/2/3/4/5/7/8 =
100%, Tahap 6 = 90% (satu-satunya tahap Smart AI yang belum 100%).

**Next TODO:** Sesi 46 (Batch 1, TERAKHIR) — **Batch Review**: regression
test penuh, full build, Final ZIP Batch 1, Documentation Sync, tutup
Batch 1 di `docs/BATCH_PLAN.md`, siapkan placeholder Batch 2 (Sesi
47–51) TANPA fitur ditentukan (sesuai instruksi eksplisit user
sebelumnya, kecuali ada arahan baru). TIDAK ada fitur baru di sesi ini.
Kandidat fitur OPSIONAL (kalau user pilih lanjut, bukan default Batch
Review): UI wiring `simulateScenarios()` (kemungkinan butuh keputusan
produk soal preset yang ditampilkan) ATAU Tahap 6 lanjutan (90%→100%,
belum diaudit ulang sejak Sesi 42). Lihat `docs/NEXT_SESSION.md` utk
detail lengkap.

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet. Goal-adapter
`pensiun`/`fi`/`debt` (track LifeOS) masih terbuka, belum final.
`simulateScenarios()` belum ada UI wiring (bukan bug, sengaja di luar
scope 1-sub-item-per-sesi — lihat "Next TODO").

---

## Sesi 46 (2026-07-18) — Batch 1, Batch Review (TERAKHIR di Batch 1)

**Target:** Baris Sesi 46 `docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md`:
**Batch Review** — regression test penuh, full build, Final ZIP Batch 1
(gabungan Sesi 41–45), Documentation Sync, tutup Batch 1 di
`docs/BATCH_PLAN.md`, siapkan placeholder Batch 2 (Sesi 47–51) TANPA
fitur ditentukan. TIDAK ada fitur/roadmap/arsitektur baru sesuai
instruksi eksplisit user sesi ini.

**Audit Batch 1 (Sesi 41–45):**
- Semua target Batch 1 per `docs/BATCH_PLAN.md` berstatus ✅ SELESAI di
  tabel (41–45), sesuai dgn log per-sesi di file ini.
- `IMPLEMENTATION_STATUS.md` vs `ROADMAP.md` vs `TODO.md` dibaca ulang
  penuh: Tahap 1/2/3/4/5/7/8 = 100%, Tahap 6 = 90% — konsisten di
  ketiga file, tidak ada progress yang diklaim selesai di satu dokumen
  tapi tidak di dokumen lain.
- **1 temuan nyata:** `ROADMAP.md` § Tahap 8 masih menulis
  `☐ Performance Check`, padahal `IMPLEMENTATION_STATUS.md` sudah
  mencatat Tahap 8 = 100% (Sesi 34) & field `checks.performance`
  (`modules/ai/ai-service.js`, helper `_aiMeasureMs()`/
  `_aiMeasureMsAsync()` di `modules/ai/ai-core.js`) sudah lengkap sejak
  Sesi 30, divalidasi 4 test khusus di `tests/ai-service.test.js`
  (baris ~478–520) — pola SAMA PERSIS dgn insiden Sesi 39/41/44
  (checkbox/persentase stale, kode & test sudah lengkap). **Diperbaiki:**
  checkbox `ROADMAP.md` ☐→☑ dgn catatan rujukan sub-item + sesi
  perbaikan. TIDAK ada kode/test baru (murni sinkronisasi dokumentasi,
  sesuai batas "Batch Review tidak menambah fitur baru").
- Tidak ditemukan TODO yang seharusnya sudah selesai tapi masih
  tercatat belum (`TODO.md` entri Sesi 45 di paling atas sudah
  mencerminkan status terbaru).
- Tidak ditemukan fitur yang tercatat selesai tapi implementasinya
  tidak ada — setiap ✅ di `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`
  Batch 1 dicek silang ke path file kode yang disebutkan (mis.
  `simulateScenarios()` di `modules/ai/ai-service.js`, baris rule
  `cross-finance-delivery-margin-balance` di
  `modules/ai/ai-decision-engine.js`) — semua ada.
- Cek duplikasi (helper/registry/adapter/storage/UI): 3 file registry
  ditemukan (`modules/ai/ai-decision-engine.js` — AI rule registry,
  `modules/dashboard-hub/dashboard-hub-registry.js` — dashboard entry
  registry, `economic-intelligence/eie-registry.js` — EIE registry) —
  masing-masing domain berbeda, BUKAN duplikat. Tidak ditemukan
  duplicate helper/adapter/storage/UI di `modules/ai/*`/`lifeos/*`
  yang relevan dgn Batch 1 (fungsi `_ai*`/`goalAdapterList`/
  `todayAdapterList` masing-masing hanya didefinisikan 1x).

**Implementasi:** TIDAK ADA fitur baru. Satu perbaikan dokumentasi
(`ROADMAP.md` checkbox Performance Check, lihat di atas).

**File yang diubah:**
- `ROADMAP.md` — checkbox Tahap 8 Performance Check ☐→☑ (perbaikan
  audit, bukan fitur baru).
- `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
  `app_production.html`/`sw.js` — hasil `node scripts/build.js` rutin
  (versi naik otomatis walau tidak ada perubahan source JS logic,
  pola sama dgn Sesi 40/41/43).
- `IMPLEMENTATION_STATUS.md` — header "Terakhir diaudit" diperbarui ke
  Sesi 46/build `?v=476`.
- `TODO.md` — entri log Sesi 46 baru di paling atas.
- `docs/NEXT_SESSION.md` — ditulis ulang (Batch 1 ditutup, "Batch 2
  siap dimulai", kandidat Batch 2 didaftarkan tanpa dipilih).
- `docs/BATCH_PLAN.md` — baris tabel Sesi 46 (⏳→✅ SELESAI), Batch 1
  ditutup penuh.
- `docs/CLAUDE.md` (sesi ini).

`docs/PRODUCT_DECISIONS.md`/`docs/SESSION_RULES.md` **TIDAK diubah** —
tidak ada keputusan produk/aturan kerja baru sesi ini.

**Test baru:** 0 (Batch Review tidak menambah fitur).

**Hasil test:** `node --test tests/*.test.js` → **2345/2345 pass**
(0 regresi, sama seperti akhir Sesi 45), dijalankan 2x (sebelum &
sesudah build) sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=476` (naik dari 475). Sintaks kedua bundle
lolos `node --check`.

**Progress:** 0% fitur baru (Batch Review murni audit + regression +
build + ZIP + dokumentasi). Batch 1 akhir: Tahap 1/2/3/4/5/7/8 = 100%,
Tahap 6 = 90%.

**Next TODO:** Batch 2 (Sesi 47–51) — target BELUM ditentukan sesuai
instruksi eksplisit user, lihat `docs/NEXT_SESSION.md` § "Kandidat
Batch 2" untuk daftar kandidat (bukan pilihan default, tanpa keputusan
produk baru).

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet (bundle hasil build
TANPA minifikasi, tetap valid). Goal-adapter `pensiun`/`fi`/`debt`
(track LifeOS) masih terbuka, belum final. Tahap 6 (AI Learning) masih
90% — sub-item tersisa belum diaudit ulang sejak Sesi 42 (kandidat
Batch 2, bukan blocker Batch 1). `simulateScenarios()` masih belum ada
UI wiring (kandidat Batch 2, bukan bug).

## Catatan kerja — 2026-07-18 (Sesi 47): Batch 2 sesi pertama — audit kecil Tahap 6 AI Learning, sinkronisasi dokumentasi

**Nomor sesi:** 47 (Batch 2, sesi pertama).

**Target:** dipilih dari kandidat #2 di `docs/BATCH_PLAN.md`/
`docs/NEXT_SESSION.md` § Batch 2 — "Tahap 6 (AI Learning) 90%→100%,
belum diaudit ulang sejak Sesi 42". Dipilih dari 3 kandidat Batch 2
krn 2 kandidat lain (UI wiring `simulateScenarios()`, Track LifeOS
goal source `pensiun`/`fi`/`debt`) eksplisit membutuhkan keputusan
produk sebelum bisa dieksekusi, sedangkan kandidat ini murni "audit
kecil dulu" sesuai instruksi `docs/NEXT_SESSION.md` § First Action.

**Audit kecil:** dibaca `ROADMAP.md` § Tahap 6 — SEMUA sub-item
(History, Learning Storage, Recommendation Improvement Sesi 14/19/32/
42) sudah ☑, tidak ada checkbox ☐ tersisa. Dicek kode nyata
(`modules/ai/ai-decision-engine.js` objek `.learn` — `recordOutcome`/
`getStats`/`getConfidence`) & `ai-chat.js` (`AIRecommendCard`) — sesuai
dgn yang tercatat. `grep -rn "auto-disable\|autoDisable"` ke seluruh
`modules/`/`tests/` → 0 hasil — dikonfirmasi fitur "auto-disable rule
yang berulang kali ditolak" (satu-satunya alasan
`IMPLEMENTATION_STATUS.md` menulis "Belum 100%") memang belum pernah
diimplementasikan, DAN memang tidak pernah jadi checkbox `ROADMAP.md`
(konsisten dgn catatan lama sendiri: "belum ada keputusan produk,
JANGAN ditebak" — bukan celah yang terlewat, tapi memang sengaja di
luar scope sampai ada arahan produk).

**Kesimpulan:** checklist `ROADMAP.md` (sumber kebenaran checklist
Tahap 6) sudah 100% ☑ tanpa sisa — angka ringkasan 90% di
`IMPLEMENTATION_STATUS.md` STALE, pola SAMA PERSIS dgn insiden
dokumentasi-vs-kode Sesi 39/41/44/46 (checkbox/persentase ringkasan
tidak sinkron dgn kode & checklist detail yang sudah lengkap). Sesuai
aturan "Kalau kandidat terbaik ternyata sudah selesai, jangan
implementasi ulang — lakukan sinkronisasi dokumentasi bila diperlukan"
(`docs/SESSION_RULES.md`), TIDAK ada implementasi baru dikerjakan.

**File yang diubah (murni dokumentasi, 0 kode aplikasi/test):**
- `IMPLEMENTATION_STATUS.md` — header "Terakhir diaudit" diperbarui ke
  Sesi 47, tabel ringkasan Tahap 6 90%→100%, detail section Tahap 6
  diperbarui (status 100%, catatan "auto-disable" diperjelas sbg ide
  masa depan di luar checklist — BUKAN blocker 100% — bukan dihapus,
  supaya konteksnya tetap ada utk sesi mendatang).
- `TODO.md` — entri log Sesi 47 baru di paling atas.
- `docs/NEXT_SESSION.md` — Batch Tracking & Session terakhir diperbarui
  ke Sesi 47, 2 kandidat Batch 2 tersisa (keduanya butuh keputusan
  produk) dicatat ulang sbg "Target berikutnya".
- `docs/BATCH_PLAN.md` — baris tabel Sesi 47 ditambahkan ke § Batch 2.
- `docs/CLAUDE.md` (sesi ini).

`ROADMAP.md`/`docs/PRODUCT_DECISIONS.md`/`docs/SESSION_RULES.md`
**TIDAK diubah** — `ROADMAP.md` sudah benar (semua ☑), tidak ada
keputusan produk/aturan kerja baru sesi ini.

**Test baru:** 0 (murni sinkronisasi dokumentasi, tidak ada perubahan
kode aplikasi/test).

**Hasil test:** `node --test tests/*.test.js` → **2345/2345 pass** (0
regresi, sama seperti akhir Sesi 46), dijalankan 2x (sebelum & sesudah
build) sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=477` (naik dari 476, murni bump versi
otomatis — tidak ada perubahan source JS logic). Sintaks kedua bundle
lolos `node --check`. `esbuild` tidak terpasang di sandbox ini (tanpa
akses internet) — bundle TANPA minifikasi, tetap 100% valid.

**Progress:** Tahap 6 (AI Learning) 90%→100%. **Semua Tahap Smart AI
(1–8) kini 100%.**

**Next TODO:** Batch 2 sesi berikutnya — 2 kandidat tersisa (UI wiring
`simulateScenarios()`, Track LifeOS goal source), KEDUANYA butuh
keputusan produk dari user sebelum bisa diimplementasikan. Lihat
`docs/NEXT_SESSION.md` § "Target berikutnya".

**Known Issue:** tidak ada isu baru. `npm run lint`/`esbuild` tetap
tidak bisa dijalankan di sandbox tanpa internet (bundle hasil build
TANPA minifikasi, tetap valid). Goal-adapter `pensiun`/`fi`/`debt`
(track LifeOS) masih terbuka, belum final — tidak disentuh sesi ini.
`simulateScenarios()` masih belum ada UI wiring — tidak disentuh sesi
ini, menunggu keputusan produk.

## Catatan kerja — 2026-07-18 (Sesi 48, dicatat RETROAKTIF Sesi 49): UI wiring `simulateScenarios()`

**Nomor sesi:** 48 (Batch 2). **Dicatat retroaktif** — sesi ini SUDAH
selesai di kode (bukti: komentar eksplisit "Sesi 48" di `ai-chat.js`
baris ~691, versi bundle `?v=478` sebelum Sesi 49 mulai) tapi TIDAK
PERNAH tercatat di `docs/CLAUDE.md`/`docs/NEXT_SESSION.md`/
`docs/BATCH_PLAN.md`/`TODO.md` — ditemukan lewat audit kecil di awal
Sesi 49. Pola stale TERBALIK dari insiden Sesi 39/41/44/46/47 (biasanya
dokumentasi klaim selesai duluan, kali ini kode duluan, dokumentasi
ketinggalan).

**Target (direkonstruksi dari kode):** kandidat Batch 2 #1 — UI wiring
`AIService.simulateScenarios()` (Tahap 7 lanjutan).

**Implementasi (dari kode, bukan diimplementasikan ulang sesi ini):**
`AIScenarioWidget` (`ai-chat.js`) — tombol "📊 Simulasi Skenario" yang
memanggil `AIService.simulateScenarios(scenarios)` nyata dari UI,
skenario dibangun dari order Cobek pending (`buildScenariosFromPendingCobek()`),
guard `typeof AIService==='undefined'||typeof AIService.simulateScenarios!=='function'`
sebelum jalan, flag `running` cegah double-tap, error di-`console.warn`
(tidak throw ke UI).

**File yang diubah (per kode, tidak diverifikasi ulang detail diff
krn di luar scope Sesi 49 — target Sesi 49 adalah LifeOS):** `ai-chat.js`.

**Catatan Sesi 49:** TIDAK ada kode diubah utk merekonstruksi log ini —
murni sinkronisasi dokumentasi berdasar bukti yang sudah ada di kode.
Test/build utk Sesi 48 tidak diverifikasi ulang terpisah (sudah
tercakup dalam full test/build Sesi 49 yang tetap 2366/2366 pass &
`?v=479` sukses, jadi tidak ada regresi dari Sesi 48 yang lolos ke
Sesi 49).

---

## Catatan kerja — 2026-07-18 (Sesi 49): Track LifeOS — Goal source `pensiun`/`fi`/`debt`

**Nomor sesi:** 49 (Batch 2).

**Target:** Track LifeOS — implementasi Goal Source LifeOS (`pensiun`/
`fi`/`debt`) sesuai pola repository (arahan eksplisit user).

**Audit kecil:** dibaca `docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md`/
`docs/SESSION_RULES.md`/`docs/PRODUCT_DECISIONS.md`/`docs/CLAUDE.md`/
`TODO.md`/`IMPLEMENTATION_STATUS.md`/`ROADMAP.md`. Ditemukan 2 hal:
1. `lifeos/adapters/goal-adapter.js`: builder `pensiun`/`fi`/`debt`
   memang belum terdaftar di `GOAL_SOURCE_BUILDERS`, persis sesuai
   catatan lama (`docs/PRODUCT_DECISIONS.md` § LifeOS, sebelumnya
   "BELUM final").
2. **Temuan tak terduga:** kode `ai-chat.js` sudah berisi Sesi 48
   (`AIScenarioWidget`, UI wiring `simulateScenarios()`) yang tidak
   pernah tercatat di dokumentasi manapun — dicatat retroaktif di atas.

**Konflik yang diklarifikasi ke user:** instruksi awal menyebut
keputusan produk goal source LifeOS "SUDAH FINAL", tapi
`docs/PRODUCT_DECISIONS.md` menulis "BELUM final — MASIH TERBUKA" dgn
2 pertanyaan arsitektur konkret. Dicek langsung ke kode
(`Pensiun.danaTerkumpul()`, `FI.netAssetFund()`, `D.debts` vs
`D.debtStrategy`) utk memastikan ini nyata, bukan dokumentasi basi,
lalu ditanyakan ke user (2 pertanyaan single-select) sebelum
implementasi — sesuai `docs/SESSION_RULES.md` ("jangan jadi Architect,
jangan menebak keputusan produk").

**Keputusan user (final, dicatat di `docs/PRODUCT_DECISIONS.md`):**
1. pensiun/fi: reuse langsung `Pensiun.danaTerkumpul()`/
   `FI.netAssetFund()`/`FI.targetNominal()` (guard typeof), BUKAN
   dihitung ulang murni dari `D`.
2. debt: sumber data `D.debts` (bukan `D.debtStrategy`).

**Implementasi:**
- `lifeos/adapters/goal-adapter.js` — 3 builder baru: `goalSourcePensiun(D)`
  (guard konfigurasi persis `Pensiun.renderDashMini()`, currentAmount dari
  `Pensiun.danaTerkumpul()` guard typeof + try/catch), `goalSourceFI(D)`
  (guard `FI` tersedia + `targetNominal()>0`, currentAmount dari
  `FI.netAssetFund()`), `goalSourceDebt(D)` (map `D.debts` yang
  `nilai>0`, progress 0/100 berdasar `lunas`). Ketiganya didaftarkan di
  `GOAL_SOURCE_BUILDERS`. Docstring file ditulis ulang menjelaskan
  keputusan & konsekuensinya.
- `lifeos/lifeos-registry.js` — `LIFEOS_GOAL_SOURCES` entry `debt`:
  `dArr` diubah `debtStrategy` → `debts`.
- `tests/lifeos-goal-adapter.test.js` — ditulis ulang: hapus test lama
  yang mengasumsikan pensiun/fi/debt selalu dilewati, tambah 9 test
  baru (guard konfigurasi belum lengkap, guard `Pensiun`/`FI` tidak
  tersedia, reuse dgn stub `Pensiun`/`FI` lewat `extraGlobals`
  `loadSource()`, debt lunas/belum lunas/nilai kosong). Total file ini
  naik dari 12 → 21 test.

Tidak ada engine/registry/adapter baru — murni reuse pola builder
existing (`goalSourceTarget`/`goalSourceEduFund`/`goalSourceWishlist`)
& pola guard `typeof X!=='function'` yang sudah dipakai di seluruh
`lifeos/adapters/*`.

**File yang diubah:**
- `lifeos/adapters/goal-adapter.js`
- `lifeos/lifeos-registry.js`
- `tests/lifeos-goal-adapter.test.js`
- `IMPLEMENTATION_STATUS.md` (catat temuan Sesi 48 di § Tahap 7, header)
- `docs/PRODUCT_DECISIONS.md` (§ LifeOS goal source: BELUM final → FINAL)
- `docs/PROJECT_STATE.md` (baris Adapter—goal, Nav wiring, Test suite,
  Overall Progress)
- `TODO.md` (entri Sesi 49 baru di paling atas)
- `docs/BATCH_PLAN.md` (baris tabel Sesi 48 [retroaktif] & 49)
- `docs/NEXT_SESSION.md` (ditulis ulang)
- `docs/CLAUDE.md` (sesi ini, + log retroaktif Sesi 48)
- `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
  `app_production.html`/`sw.js` (hasil `node scripts/build.js`)

`ROADMAP.md`/`docs/SESSION_RULES.md`/`docs/AI_SCOPE.md`/
`docs/LIFEOS_SCOPE.md` **TIDAK diubah** — tidak ada checkbox Smart AI
baru (target sesi ini track LifeOS) atau aturan kerja baru.

**Test baru:** +9 (`tests/lifeos-goal-adapter.test.js`, 12→21).

**Hasil test:** `node --test tests/*.test.js` → **2366/2366 pass**
(naik dari 2345, 0 regresi), dijalankan 2x (sebelum & sesudah build)
sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=479` (naik dari 478). Sintaks kedua bundle
lolos `node --check`. `esbuild` tidak terpasang di sandbox ini (tanpa
akses internet) — bundle TANPA minifikasi, tetap valid.

**Progress:** LifeOS — Goal source `pensiun`/`fi`/`debt` SELESAI.
`goalAdapterList()` sekarang 6/6 key registry (`LIFEOS_GOAL_SOURCES`)
punya builder terdaftar di `GOAL_SOURCE_BUILDERS`.

**Next TODO:** Batch 2 sisa 2 sesi (Sesi 50–51), target BELUM
ditentukan — kandidat: nav wiring goal (`LIFEOS_NAV_MAP` 3/6 →
mungkin 6/6), audit `lifeos/ui/goals.js` vs 3 goal source baru,
sinkronisasi `docs/PROJECT_STATE.md` § Smart AI (stale sejak Sesi 37).
Lihat `docs/NEXT_SESSION.md` § "Target berikutnya".

**Known Issue:** tidak ada isu baru dari implementasi Sesi 49.
`npm run lint`/`esbuild` tetap tidak bisa dijalankan di sandbox tanpa
internet (bundle hasil build TANPA minifikasi, tetap valid). UI
`lifeos/ui/goals.js` belum diaudit apakah otomatis menampilkan 3 goal
source baru dgn benar (emoji `🏖️`/`🕊️`/`📕` belum dicek ada di style
map manapun) — kandidat audit kecil sesi mendatang, bukan bug yang
dikonfirmasi.

## Catatan kerja — 2026-07-18 (Sesi 50): Nav wiring goal LifeOS (`LIFEOS_NAV_MAP`)

**Nomor sesi:** 50 (Batch 2, sesi ke-4 dari 5).

**Target:** kandidat #1 dari `docs/NEXT_SESSION.md` § Target berikutnya
(versi Sesi 49) — "Nav wiring goal LifeOS: `LIFEOS_NAV_MAP` goal masih
memetakan 3/6 sourceKind (target/eduFund/wishlist)".

**Audit kecil (sebelum implementasi):**
1. Dikonfirmasi `lifeos/lifeos-nav.js` § `LIFEOS_NAV_MAP` memang belum
   punya entri `pensiun`/`fi`/`debt` — 3 sourceKind ini baru punya
   builder di `goal-adapter.js` sejak Sesi 49, dan `lifeos/ui/goals.js`
   sudah otomatis merender kartu goal-nya dgn
   `data-action="lifeOSNavigateToSource"` (klik-able). Kalau diklik,
   `lifeOSNavigateToSource()` jatuh ke cabang "sourceKind tidak
   dikenal" (`console.warn` + toast error ke user) — GAP NYATA, bukan
   dokumentasi stale.
2. Dicek juga kandidat #2 dari sesi lalu (UI Goal `goals.js` apakah
   otomatis menampilkan 3 goal source baru) — `lifeos/ui/goals.js`
   (22 baris) murni `goalAdapterList(D).map(...)`, generik membaca
   `g.emoji || '🎯'`/`g.name`/`g.progressPct` per goal. `goalSourcePensiun`/
   `goalSourceFI`/`goalSourceDebt` (Sesi 49) SUDAH menyertakan field
   `emoji` sendiri (🏖️/🕊️/📕, lihat `goal-adapter.js` baris 102/122/132)
   — jadi TIDAK ADA GAP di sini, 0 kode diubah utk kandidat #2 (dicatat
   sbg konfirmasi non-gap, bukan pekerjaan yang diselesaikan).
3. Ditelusuri lokasi "referensi asli" tiap sourceKind baru di
   `app_production.html`: `pensiun` (`#pensiunBody`, di dalam
   `#keuanganTab-asetproyek`), `debt` (`#debtList`, di dalam
   `#keuanganTab-utangpiutang`) — keduanya tab di `#page-keuangan` yang
   disembunyikan lewat class `u-dnone` BIASA (bukan `.stg-tabpanel`
   seperti tab Setelan), sehingga `_lifeOSHighlightSettingsCard()` yang
   sudah ada TIDAK bisa membuka tab itu sendiri (dia cuma tahu cara
   `.stg-tabpanel`/`.stg-group`/`.card-collapse`). `fi` (`#dashFiCard`)
   ternyata cuma ada di `page-dashboard-hub` (bukan di tab keuangan
   manapun) — pola page+cardSelector biasa (seperti selfcare/payroll)
   sudah cukup.
4. Ditemukan `goToList(targetId, pageName, navIdx, shopTabName,
   cnTabName, keuTabName)` (`modules/finance/filter-laporan.js`) —
   fungsi LAMA yang SUDAH dipakai lintas-halaman utk lompat + switch
   tab keuangan + scroll + flash-highlight (dipakai di `kbPiutang`
   stat dashboard keuangan, `data-args='["piutangList", null, null,
   null, null, "utangpiutang"]'`), `KEU_TAB_ORDER`/`setKeuanganTab()`
   (`tx-list-cashflow.js`). Menulis ulang logic switch-tab keuangan di
   `lifeos-nav.js` akan **duplicate** mekanisme yang sudah ada
   (dilarang, `docs/PRODUCT_DECISIONS.md` § Umum) — jadi keputusan
   implementasi: REUSE `goToList()` apa adanya lewat `openFn`, `navIdx`
   dikosongkan (`null`) persis pola `goToList("assetList","aset")` yang
   sudah ada (`app_production.html` baris ~405, `showPage()` sendiri
   fallback cari nav-item yang cocok kalau `el` tidak dikirim).

**Implementasi:**
- `lifeos/lifeos-nav.js` — 3 entri baru di `LIFEOS_NAV_MAP`:
  - `pensiun`: `openFn` → `goToList('pensiunBody', 'keuangan', null,
    null, null, 'asetproyek')` (guard `typeof goToList === 'function'`).
  - `debt`: `openFn` → `goToList('debtList', 'keuangan', null, null,
    null, 'utangpiutang')` (guard sama).
  - `fi`: `{ page: 'dashboard-hub', cardSelector: '#dashFiCard' }` —
    pola biasa, TIDAK perlu `openFn`.
  - Docstring file diperbarui (§ "Status cakupan Sesi 50") menjelaskan
    keputusan reuse `goToList()` di atas.
- TIDAK ada engine/service/adapter/registry/storage/event/UI baru —
  murni 3 entri data + guard di file yang sudah ada.

**File yang diubah:**
- `lifeos/lifeos-nav.js` (3 entri baru + docstring)
- `tests/lifeos-nav.test.js` (+5 test baru: 2× `pensiun` — openFn reuse
  `goToList()` dgn argumen tepat + guard-tidak-tersedia; 2× `debt` —
  sama; 1× `fi` — page-based + `fi` ditambahkan ke test
  `expectedPage`/`navIndex` yang sudah ada)
- `docs/PROJECT_STATE.md` (baris "Goal (UI)"/"Nav wiring"/"Test suite
  lifeos/"/paragraf Overall LifeOS/Overall Progress)
- `docs/BATCH_PLAN.md` (baris tabel Sesi 50)
- `TODO.md` (entri Sesi 50 baru di paling atas)
- `docs/NEXT_SESSION.md` (ditulis ulang)
- `docs/CLAUDE.md` (sesi ini)
- `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
  `app_production.html`/`sw.js` (hasil `node scripts/build.js`)

`ROADMAP.md`/`IMPLEMENTATION_STATUS.md` (root) **TIDAK diubah** — target
sesi ini murni track LifeOS, tidak ada checkbox Smart AI yang berubah.
`docs/SESSION_RULES.md`/`docs/PRODUCT_DECISIONS.md`/`docs/AI_SCOPE.md`/
`docs/LIFEOS_SCOPE.md` juga TIDAK diubah — tidak ada aturan kerja atau
keputusan produk baru (implementasi sesi ini murni teknis, reuse fungsi
lama, tidak butuh keputusan produk).

**Test baru:** +5 (`tests/lifeos-nav.test.js`, 13→18).

**Hasil test:** `node --test tests/*.test.js` → **2371/2371 pass**
(naik dari 2366, 0 regresi), dijalankan sebelum & sesudah build sesuai
SESSION WORKFLOW.

**Hasil build:** sukses, `?v=480` (naik dari 479). Sintaks kedua bundle
lolos `node --check`. `esbuild` tidak terpasang di sandbox ini (tanpa
akses internet) — bundle TANPA minifikasi, tetap valid.

**Progress:** LifeOS — Nav wiring goal SELESAI. `LIFEOS_NAV_MAP`
sekarang 6/6 sourceKind goal (target/eduFund/wishlist/pensiun/fi/debt)
punya entri, konsisten dgn `goalAdapterList()` (Sesi 49) yang sudah
6/6 key registry punya builder. UI Goal (`goals.js`) dikonfirmasi tidak
butuh perubahan apa pun.

**Next TODO:** Batch 2 sisa 1 sesi (Sesi 51) — kandidat paling konkret:
sinkronisasi `docs/PROJECT_STATE.md` § Smart AI (tabel Tahap 1-8 stale
sejak Sesi 37, vs `IMPLEMENTATION_STATUS.md` yang sudah 100% semua),
kemungkinan digabung sbg Batch Review Batch 2 (pola sama Sesi 46 —
audit menyeluruh Sesi 47–50 + regression test penuh + full build + ZIP
Final Batch 2). Lihat `docs/NEXT_SESSION.md` § "Target berikutnya".

**Known Issue:** tidak ada isu baru dari implementasi Sesi 50.
`npm run lint`/`esbuild` tetap tidak bisa dijalankan di sandbox tanpa
internet (bundle hasil build TANPA minifikasi, tetap valid).
`docs/PROJECT_STATE.md` § Smart AI (Tahap 4/5/6/7 persentase) masih
stale sejak Sesi 37 — TIDAK disentuh sesi ini krn di luar scope target
(track LifeOS), dicatat eksplisit sbg kandidat Sesi 51.

## Catatan kerja — 2026-07-18 (Sesi 51): Batch Review — penutup Batch 2

**Nomor sesi:** 51 (Batch 2, sesi terakhir/ke-5 dari 5 — Batch Review).

**Target:** Batch Review Batch 2 (Sesi 47–51), sesuai
`docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md` — audit menyeluruh + regresi
penuh + build + ZIP gabungan + sinkronisasi dokumentasi, digabung dgn
kandidat sinkronisasi `docs/PROJECT_STATE.md` yang tercatat sejak akhir
Sesi 50.

**Audit menyeluruh (sebelum implementasi):**
1. Sesi 47–50 ditelusuri ulang lewat `docs/BATCH_PLAN.md`/`TODO.md`/
   `docs/CLAUDE.md` — semua 4 sesi tercatat ✅ SELESAI dgn hasil test
   naik konsisten (2345→2366→2371, 0 regresi), tidak ada sesi yang
   "setengah jalan" atau checkpoint tergantung.
2. `grep` menyeluruh dicek ulang utk larangan duplikasi
   (`docs/PRODUCT_DECISIONS.md` § Umum) — tidak ditemukan
   helper/function/storage/registry/adapter/event ganda dari
   implementasi Sesi 47–50 (Tahap 6 doc sync / `AIScenarioWidget` /
   goal-adapter 3 builder baru / `LIFEOS_NAV_MAP` 3 entri baru).
3. Dibandingkan `docs/PROJECT_STATE.md` § Smart AI (tabel ringkasan
   Tahap 1-8) vs `IMPLEMENTATION_STATUS.md` (root, source of truth
   per-tahap) & `ROADMAP.md` (root) — ditemukan STALE: masih tercatat
   Tahap 4 85% / Tahap 5 55% / Tahap 6 75% / Tahap 7 35% (snapshot Sesi
   37), padahal `IMPLEMENTATION_STATUS.md`/`ROADMAP.md` sudah 100%
   semua tahap sejak Sesi 44 (Tahap 4)/45 (Tahap 7)/47 (Tahap 6)/41
   (Tahap 5) — pola SAMA PERSIS dgn insiden dokumentasi-stale Sesi
   39/41/44/46/47 (angka ringkasan tertinggal dari checklist yang sudah
   lengkap). GAP DOKUMENTASI NYATA, bukan gap kode.
4. `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md` (root) dicek ulang
   — semua sudah konsisten dgn kode, TIDAK ada stale lain ditemukan.
5. Dicari bug implementasi kecil & jelas selama audit (sesuai instruksi
   sesi ini) — TIDAK ditemukan.

**Implementasi (murni sinkronisasi dokumentasi):**
- `docs/PROJECT_STATE.md` — tabel ringkasan Tahap 1-8 § Smart AI
  diperbarui semua ✅ 100% (Tahap 4/5/6/7 sebelumnya 85%/55%/75%/35%),
  catatan lama ttg "belum di-refresh sejak Sesi 37" dihapus & diganti
  catatan sinkronisasi Sesi 51, tanggal snapshot di kepala file
  diperbarui.
- TIDAK ada kode/test/engine/registry/adapter baru — 0 source berubah.

**File yang diubah:**
- `docs/PROJECT_STATE.md` (tabel Tahap 1-8 + catatan + tanggal snapshot)
- `docs/BATCH_PLAN.md` (baris tabel Sesi 51 + penutupan Batch 2 +
  daftar kandidat Batch 3, TIDAK dipilih)
- `docs/NEXT_SESSION.md` (ditulis ulang, Batch 2 ditutup)
- `TODO.md` (entri Sesi 51 baru di paling atas)
- `docs/CLAUDE.md` (sesi ini)
- `app-bundle-a.min.js`/`app-bundle-b.min.js`/`index.html`/
  `app_production.html`/`sw.js` (hasil `node scripts/build.js`, versi
  naik krn build dijalankan ulang meski 0 source logic berubah — build
  script auto-increment versi setiap dijalankan)

`ROADMAP.md`/`IMPLEMENTATION_STATUS.md` (root) **TIDAK diubah** — sudah
sinkron dgn kode sejak sebelum sesi ini, tidak ada checkbox/persentase
yang perlu dikoreksi. `docs/SESSION_RULES.md`/`docs/PRODUCT_DECISIONS.md`/
`docs/AI_SCOPE.md`/`docs/LIFEOS_SCOPE.md` juga TIDAK diubah — tidak ada
aturan kerja atau keputusan produk baru sesi ini.

**Test baru:** 0 (murni dokumentasi, tidak ada perubahan logic).

**Hasil test:** `node --test tests/*.test.js` → **2371/2371 pass**
(tidak berubah dari Sesi 50, 0 regresi), dijalankan 2x (sebelum &
sesudah build) sesuai SESSION WORKFLOW.

**Hasil build:** sukses, `?v=481` (naik dari 480 — build script
auto-increment versi tiap dijalankan meski tidak ada perubahan logic
source). Sintaks kedua bundle lolos `node --check`. `esbuild` tidak
terpasang di sandbox ini (tanpa akses internet) — bundle TANPA
minifikasi, tetap valid.

**Progress:** **Batch 2 (Sesi 47–51) DITUTUP.** Semua Tahap Smart AI
(1-8) 100% & konsisten di seluruh dokumentasi (`IMPLEMENTATION_STATUS.md`/
`ROADMAP.md`/`docs/PROJECT_STATE.md`). LifeOS goal source & nav wiring
6/6 sourceKind lengkap (Sesi 49/50).

**Next TODO:** Batch 3 BELUM dimulai, menunggu arahan user. Kandidat
tercatat (bukan dipilih): audit detail LifeOS Knowledge/Review/Projects
UI (pola sama audit `goals.js` Sesi 50); LifeOS Plugin & Life Objects
(belum ada implementasi, butuh keputusan produk dulu). Lihat
`docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md`.

**Known Issue:** tidak ada isu baru dari sesi ini. `npm run lint`/
`esbuild` tetap tidak bisa dijalankan di sandbox tanpa internet (bundle
hasil build TANPA minifikasi, tetap valid). LifeOS Knowledge/Review/
Projects UI (`lifeos/ui/knowledge.js`/`review.js`/`projects.js`) masih
tercatat "Ada, belum diaudit detail" — kandidat audit kecil Batch 3.

## Catatan kerja — 2026-07-19 (Sesi 52, Batch 3 kandidat #1): audit detail LifeOS Knowledge — 0 bug, +9 test baru

Konteks: Batch 3 dimulai. User minta audit berurutan LifeOS Knowledge →
Review → Projects → Life Objects → Plugin System, pilih SATU kandidat
terbaik per sesi (tidak butuh keputusan produk baru, tidak ubah arsitektur,
selesai 1 sesi, risiko regresi rendah, hasil implementasi nyata).

**Audit `lifeos/ui/knowledge.js` + `lifeos/services/knowledge-service.js`:**
dibaca menyeluruh. `LifeOSKnowledge.render()` murni konsumsi
`knowledgeAdapterList(store)` (adapter registry-driven yang sudah tertes
sendiri di `tests/lifeos-knowledge-adapter.test.js`), guard elemen-tidak-ada
sudah benar, exposure ke `window` (baris akhir file, expose SEMUA modul UI
Life OS sekaligus) sudah benar sejak audit lama. `saveInsight()` delegasi
penuh ke `knowledgeServiceSave()` lalu re-render — tidak ada logic tulis lain
di UI. **TIDAK ada bug ditemukan.**

**Gap nyata:** kedua file ini 0% tercakup test (dicek via `grep -rl` ke
seluruh `tests/*.test.js` — tidak ada satu pun yang me-`loadSource` salah
satu dari `lifeos/ui/knowledge.js` atau `lifeos/services/knowledge-service.js`),
berbeda dari `lifeos/ui/goals.js` yang sudah diaudit+tertes Sesi 50 (goals.js
generik & tidak butuh perubahan/test karena render-only trivial; knowledge.js
punya path tulis (`saveInsight`) + 3 fungsi service CRUD yang lebih substansial
utk dites).

**Implementasi:** `tests/lifeos-knowledge-ui.test.js` (9 test baru) —
`LifeOSKnowledge.render()` (isi dari adapter apa adanya, urutan terbaru-dulu,
empty state, field kosong/null tidak error, guard elemen tidak ada),
`LifeOSKnowledge.saveInsight()` (delegasi ke service + re-render),
`knowledgeServiceSave()` (entry lengkap dgn id/createdAt/tags default
kosong), `knowledgeServiceUpdateTags()` (entry ketemu vs tidak ketemu —
`lifeOSSave()` HANYA dipanggil kalau entry ketemu), `knowledgeServiceDelete()`
(hapus tepat 1 entry, entry lain tidak ikut terhapus, id tidak ketemu tidak
error). TIDAK ada kode aplikasi yang diubah — murni test baru, 0 duplicate
helper/registry/adapter/storage/event/UI (semua reuse `lifeOSGetStore`/
`lifeOSSave`/`uid` yang di-stub, bukan di-reimplementasi).

**Catatan teknis:** `lifeos/ui/knowledge.js` di-load sendirian (tanpa 5 file
`ui/*.js` lain) di harness test — baris exposure `window.LifeOSHome=...` dkk
di akhir file butuh 6 identifier (`LifeOSHome`/`Areas`/`Today`/`Goals`/
`Projects`/`Review`) di-stub `undefined` lewat `extraGlobals` supaya tidak
`ReferenceError`, sama pola dgn file lain yang exposure-block-nya butuh
banyak modul sibling ter-load. Juga `assert.deepEqual` gagal utk array yang
lahir di dalam vm sandbox (`entry.tags`/`entry.relatedRefs` default `[]`) —
diganti `assert.equal(x.length, 0)`, pola cross-realm yang sudah
didokumentasikan berkali-kali di file test lain.

**Diverifikasi:**
- `node --test tests/*.test.js` → **2380/2380 pass, 0 fail** (naik dari
  2371, +9 test baru, 0 regresi).
- `node scripts/build.js kw88-lifeos-knowledge-ui-test-1` → sukses, versi
  naik ke `?v=482`, kedua bundle lolos `node --check` sintaks & lint-guard
  bawaan build, `index.html`/`app_production.html` identik, `FILE-MAP.md`
  diregenerasi otomatis (132 file, 1239 identifier global).
- `npm run lint` TIDAK bisa dijalankan (sandbox tanpa akses internet,
  konsisten dgn keterbatasan sesi-sesi sebelumnya) — tolong jalankan
  `npm run lint`/`npm run check` di lokal sebelum merge/release.
- esbuild TIDAK terpasang di sandbox sesi ini, build fallback ke bundle
  TANPA minifikasi (aman, cuma lebih besar) — sama seperti beberapa sesi
  sebelumnya yang juga tanpa akses esbuild offline.

**Untuk sesi berikutnya:** lanjut kandidat #2 — audit detail LifeOS Review
(`lifeos/ui/review.js` + `lifeos/services/review-service.js`), pola audit
sama persis (baca dulu, cek cakupan test via grep, baru tentukan langkah).

## Catatan kerja — 2026-07-19 (Sesi 53, Batch 3 kandidat #2): audit detail LifeOS Review — 0 bug, +10 test baru

Konteks: lanjutan Batch 3 (kandidat #1 Knowledge selesai Sesi 52). Target
sesi ini: audit `lifeos/ui/review.js` + `lifeos/services/review-service.js`.

**Audit:** dibaca menyeluruh. `LifeOSReview.render()` murni konsumsi
`reviewAdapterLatestSnapshots(D)` (baca 3 sumber D via registry
`LIFEOS_REVIEW_SOURCES`, sudah tertes sendiri di
`tests/lifeos-review-adapter.test.js`) & `reviewAdapterIsOverdue(store,
period, thresholdDays)` (2x panggil independen utk weekly/monthly, masing2
threshold beda 7 vs 30 hari) — guard elemen-tidak-ada di awal sudah benar,
`snapshots.wealth.netWorth ?? ''` sengaja pakai `??` (bukan `||`) supaya
nilai `0` tetap tampil, bukan dianggap kosong. `startWeekly()` delegasi
penuh ke `reviewServiceStartSession()` lalu re-render — tidak ada logic
tulis lain di UI. **TIDAK ada bug ditemukan.**

**Observasi (bukan bug, tidak diubah):** `reviewServiceComplete()` &
`reviewServiceAddActionItem()` (2 dari 3 fungsi service) belum dipanggil
dari UI manapun (dicek via grep ke seluruh source) — pola identik dgn
temuan `knowledgeServiceUpdateTags()`/`Delete()` yang juga belum wired di
audit Knowledge (Sesi 52). Bukan gap yang butuh keputusan produk mendesak.

**Gap nyata:** kedua file 0% tercakup test (grep ke seluruh
`tests/*.test.js` — tidak ada yang me-`loadSource` salah satu dari
`lifeos/ui/review.js` atau `lifeos/services/review-service.js`).

**Implementasi:** `tests/lifeos-review-ui.test.js` (10 test baru) —
`LifeOSReview.render()` (tanpa histori -> kedua badge overdue tampil;
weekly baru selesai -> badge weekly hilang, monthly tetap independen;
snapshot wealth/lifeBalance tampil apa adanya; `netWorth:0` tetap tampil;
guard elemen tidak ada), `startWeekly()` (format `periodKey`
`weekly-YYYY-MM-DD`, delegasi ke service, re-render), `reviewServiceStartSession`
(field lengkap default), `reviewServiceComplete` (merge `snapshotRefs` via
spread — field lama dipertahankan, field baru menimpa; sessionId tidak
ketemu -> `null` tanpa `lifeOSSave()`; argumen kedua opsional), dan
`reviewServiceAddActionItem` (item baru `done:false`, sessionId tidak
ketemu -> `null` tanpa `lifeOSSave()`). TIDAK ada kode aplikasi yang
diubah — murni test baru, 0 duplicate helper/registry/adapter/storage/
event/UI (reuse `lifeOSGetStore`/`lifeOSSave`/`uid` yang di-stub, pola
sama persis dgn `tests/lifeos-knowledge-ui.test.js` Sesi 52).

**Catatan teknis:** `lifeos/ui/review.js` (beda dari `knowledge.js`) TIDAK
punya blok exposure ke `window` di akhir file — jadi tidak perlu stub
identifier tambahan (`LifeOSHome` dkk) seperti test Knowledge Sesi 52.
Semua 10 test lolos di percobaan pertama tanpa perlu perbaikan.

**Diverifikasi:**
- `node --test tests/*.test.js` → **2390/2390 pass, 0 fail** (naik dari
  2380, +10 test baru, 0 regresi).
- `node scripts/build.js kw89-lifeos-review-ui-test-1` → sukses, versi
  naik ke `?v=483`, kedua bundle lolos `node --check` sintaks & lint-guard
  bawaan build, `index.html`/`app_production.html` identik, `FILE-MAP.md`
  diregenerasi otomatis (132 file, 1239 identifier global).
- `npm run lint` TIDAK bisa dijalankan (sandbox tanpa akses internet,
  konsisten dgn keterbatasan sesi-sesi sebelumnya) — tolong jalankan
  `npm run lint`/`npm run check` di lokal sebelum merge/release.
- esbuild TIDAK terpasang di sandbox sesi ini, build fallback ke bundle
  TANPA minifikasi (aman, cuma lebih besar).

**Untuk sesi berikutnya:** lanjut kandidat #3 — audit detail LifeOS
Projects (`lifeos/ui/projects.js` + `lifeos/services/project-service.js`),
pola audit sama persis. Catatan tambahan: `LifeOSProjects.open()` delegasi
ke `lifeOSNavigateToSource()` (`lifeos-nav.js`, sudah tertes di
`tests/lifeos-nav.test.js`) — cek dulu apakah jalur itu sudah cukup
tercakup dari sisi `lifeos-nav.js` atau masih perlu test tambahan dari
sisi `projects.js` sendiri (mis. `render()`/`createGeneric()` yang belum
tentu tersentuh test nav).

## Catatan kerja — Sesi 54 (2026-07-19): Audit detail LifeOS Projects (Batch 3, kandidat #3)

**Nomor sesi:** 54
**Tanggal:** 2026-07-19
**Target:** Audit detail `lifeos/ui/projects.js` + `lifeos/services/project-service.js` (Batch 3 kandidat #3, urutan Knowledge✅→Review✅→Projects✅→Life Objects→Plugin), termasuk cek cakupan test jalur `open()` → `lifeOSNavigateToSource()`.

**Audit:** Kedua file dibaca menyeluruh. TIDAK ada bug ditemukan:
- `LifeOSProjects.render()` — guard elemen tidak ada, murni konsumsi `projectAdapterList(D, store)` (adapter registry-driven yang sudah tertes sendiri), tidak baca `D`/store langsung.
- `LifeOSProjects.open(projectId)` — cari via `projectAdapterFindOne()`, guard project tidak ketemu, delegasi penuh ke `lifeOSNavigateToSource(p.kind, p.sourceRef ? p.sourceRef.id : null)` (guard `typeof` kalau `lifeos-nav.js` belum ter-load).
- `LifeOSProjects.createGeneric()` — delegasi ke `projectServiceCreate()` lalu re-render.
- `project-service.js` — 5 fungsi CRUD (`Create`/`AddChecklistItem`/`ToggleChecklistItem`/`SetStatus`/`Delete`) murni terhadap `lifeOSGetStore()`, tiap fungsi memanggil `lifeOSSave()` di akhir. Guard "project/item tidak ketemu -> null, tidak panggil save" konsisten di 4 dari 5 fungsi; `projectServiceDelete()` SENGAJA tidak guard "ketemu dulu" (pakai `filter()`, aman dipanggil walau id tidak ketemu, `lifeOSSave()` tetap terpanggil) — bukan bug, cuma beda pola dari yang lain, didokumentasikan di test baru.

**Cek cakupan jalur `open()→lifeOSNavigateToSource()` (sesuai instruksi sesi ini):** ditemukan gap nyata — `tests/lifeos-nav.test.js` sudah tertes utk banyak `sourceKind` (bills/reminders/selfcare/payroll/tukang/target/eduFund/wishlist/pensiun/fi/debt/generic/unknown) TAPI **`sourceKind:'renovasi'` (satu-satunya sourceKind yang dipetakan untuk Projects) TIDAK PERNAH dites** di file itu. Ditutup di sesi ini (lihat "Test baru" di bawah).

**File yang diubah:**
- `tests/lifeos-projects-ui.test.js` (BARU, 15 test) — render (empty state, gabungan generic+renovasi, nama kosong, guard elemen tidak ada), open (renovasi/generic/tidak ketemu/nav belum ter-load), createGeneric (delegasi + re-render), dan seluruh `project-service.js` (Create dgn default field lengkap, AddChecklistItem, ToggleChecklistItem, SetStatus, Delete).
- `tests/lifeos-nav.test.js` (+2 test) — `sourceKind:'renovasi'` (openFn → `Renov.openDetail(sourceId)`, TIDAK panggil `showPage`) & `Renov` belum ter-load (tidak throw).
- `docs/NEXT_SESSION.md`, `docs/BATCH_PLAN.md`, `docs/PROJECT_STATE.md` — sinkronisasi status Sesi 54.

**0 kode aplikasi diubah** — murni test baru, risiko regresi nol.

**Hasil test:** 2407/2407 pass (`node --test tests/*.test.js`, dijalankan 2x — sebelum & sesudah build — hasil identik). Naik dari 2390 (baseline Sesi 53) — +17 test baru (15 file baru + 2 di `lifeos-nav.test.js`).

**Hasil build:** `node scripts/build.js` sukses, versi naik 483→**484**. Semua lint-guard bawaan (u-dnone, escapeHtml, chicken-egg Tesseract) lolos. Sintaks kedua bundle valid (`node --check`). `index.html`/`app_production.html` identik. `FILE-MAP.md` diregenerasi (132 file, 1239 identifier). **Catatan:** esbuild tidak terpasang di sandbox sesi ini (tanpa akses internet) — bundle TANPA minifikasi (lebih besar dari build sebelumnya, tapi 100% valid & aman dipakai). Sebelum rilis produksi, sebaiknya build ulang di environment dgn `npm install --save-dev esbuild` supaya kembali minified.

**Progress:** Batch 3 — 3 dari 5 kandidat selesai (Knowledge✅ Sesi 52, Review✅ Sesi 53, Projects✅ Sesi 54). Sisa: Life Objects & Plugin System (butuh keputusan produk/arsitektur, belum final — lihat `docs/LIFEOS_SCOPE.md`/`docs/PRODUCT_DECISIONS.md`).

**Next TODO:** Kalau belum ada keputusan produk baru soal LifeOS Plugin/Life Objects, sesi berikutnya sebaiknya jadi **Batch Review** Batch 3 (audit menyeluruh Sesi 52-54, regression test penuh, ZIP final Batch 3 — pola sama dgn Sesi 46/51).

**Known Issue:** Tidak ada yang baru. `npm run lint` tetap belum bisa dijalankan di sandbox ini (tanpa akses internet) — sama seperti keterbatasan hampir semua sesi sebelumnya, tolong jalankan `npm run lint`/`npm run check` penuh di lokal sebelum merge/release.

## Catatan kerja — Sesi 55 (2026-07-19): Batch Review, penutup Batch 3

**Nomor sesi:** 55
**Tanggal:** 2026-07-19
**Target:** Batch Review Batch 3 (audit menyeluruh Sesi 52-54, sesuai instruksi user & arahan `docs/NEXT_SESSION.md` sendiri, pola sama dgn Sesi 46/51).

**Catatan penomoran:** Permintaan user pada sesi ini menyebut "Batch 4/Sesi 56", tapi audit `docs/CLAUDE.md`/`docs/BATCH_PLAN.md` menemukan sesi terakhir yang benar-benar tercatat adalah Sesi 54 dan Batch 3 BELUM ditutup — pola sama persis dgn insiden Sesi 39/41/44/46/47 (nomor sesi mengikuti log sekuensial aktual, bukan sebaliknya). Sesi ini karena itu dicatat sbg **Sesi 55**, menjalankan Batch Review yang memang diarahkan oleh `docs/NEXT_SESSION.md` sendiri ("kalau belum ada keputusan produk baru soal Plugin/Life Objects, sesi berikutnya jadi Batch Review").

**Audit dokumentasi vs implementasi (kandidat tercatat di `docs/NEXT_SESSION.md`):**
- Satu-satunya kandidat tersisa — **LifeOS Plugin & Life Objects** — dicek ke `docs/PRODUCT_DECISIONS.md` (grep "plugin"/"life object"): TIDAK ada keputusan produk baru sejak Sesi 54.
- `docs/PROJECT_STATE.md`, `docs/BATCH_PLAN.md`, `docs/SESSION_RULES.md`, `TODO.md`, `IMPLEMENTATION_STATUS.md`, `ROADMAP.md` dicocokkan terhadap kode nyata (test file di `tests/`, adapter di `lifeos/adapters/`) — SEMUA SUDAH SINKRON, tidak ada baris stale ditemukan.

**Quality check:**
- Duplicate helper/registry/adapter/storage/event/UI: `lifeos/adapters/` (6 file, 1 domain masing-masing), semua file `*registry*.js` (4 file, domain berbeda-beda, tidak tumpang tindih). **0 duplikasi.**
- Hasil audit Knowledge (Sesi 52)/Review (Sesi 53)/Projects (Sesi 54) dikonfirmasi ulang dari log — ketiganya 0 bug, gap test sudah ditutup.
- Test coverage Batch 3: `tests/lifeos-knowledge-ui.test.js` (9), `tests/lifeos-review-ui.test.js` (10), `tests/lifeos-projects-ui.test.js` (15) — semua ada.
- sourceKind LifeOS tanpa coverage: dicek `tests/lifeos-nav.test.js` — semua sourceKind Today (5/5), Goal (6/6), Project legacy (`renovasi`, 1/1) sudah tertes.

**Kesimpulan:** tidak ada gap implementasi nyata baru → **0 kode source diubah** sesi ini.

**File yang diubah (dokumentasi saja):**
- `docs/NEXT_SESSION.md` — ditulis ulang (Batch 3 ditutup, Batch 4 belum dimulai, kandidat Life Objects & Plugin System diarsipkan terpisah).
- `docs/BATCH_PLAN.md` — baris tabel Sesi 55 (Batch Review) ditambahkan, Batch 3 ditandai DITUTUP, § Batch 4 baru ditambahkan.
- `docs/PROJECT_STATE.md` — § Overall Progress disinkronkan (`?v=485`, ZIP Final Batch 3, ringkasan Sesi 55).
- `docs/CLAUDE.md` — catatan sesi ini.
- `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md` — TIDAK diubah (sudah terverifikasi sinkron).

**Diverifikasi:**
- `node --test tests/*.test.js` → **2407/2407 pass, 0 fail** (2x — sebelum & sesudah build, hasil identik, 0 regresi).
- `node scripts/build.js kw55-batch3-review-final` → sukses, versi naik ke `?v=485`, kedua bundle lolos `node --check` & lint-guard bawaan, `index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi (132 file, 1239 identifier).
- `npm run lint` TIDAK bisa dijalankan (sandbox tanpa akses internet). esbuild TIDAK terpasang — build fallback tanpa minifikasi (aman, cuma lebih besar).

**Progress:** **Batch 3 (Sesi 52–55) DITUTUP.** Kandidat "LifeOS Life Objects" & "LifeOS Plugin System" diarsipkan terpisah ke Batch 4 (belum dimulai) — keduanya tetap butuh keputusan produk/arsitektur.

**Next TODO:** Sesi 56 menunggu arahan user soal Batch 4 (prioritas Life Objects vs Plugin System, keputusan arsitektur). JANGAN menebak.

**Known Issue:** Tidak ada yang baru. `npm run lint` tetap belum bisa dijalankan di sandbox ini.

## Catatan kerja — Sesi 56 (2026-07-19): Audit Batch 4 — belum siap dimulai, 0 implementasi

**Nomor sesi:** 56
**Tanggal:** 2026-07-19
**Target:** Audit kecil kandidat Batch 4 (`docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md`: LifeOS Life Objects & LifeOS Plugin System), sesuai instruksi user — pilih kandidat prioritas tertinggi HANYA setelah audit mengonfirmasi ada keputusan produk final.

**Audit — konfirmasi status:**
- Sesi terakhir tercatat: **Sesi 55** (Batch Review, penutup Batch 3, build `?v=485`).
- Batch aktif: **Batch 4 — BELUM DIMULAI** (`docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md` § Batch 4).
- Progress Smart AI: Tahap 1-8 tetap 100% (`IMPLEMENTATION_STATUS.md`/`ROADMAP.md`, tidak berubah).
- Progress LifeOS: registry + 6/6 adapter registry-driven & tertes; Knowledge/Review/Projects/Goal UI+service semua diaudit+tertes penuh (Batch 3). Plugin & Life Objects: **masih 0% implementasi** (`docs/PROJECT_STATE.md` baris 46-47: "❌ Belum ada implementasi apa pun" utk keduanya).
- Dicek `docs/PRODUCT_DECISIONS.md` (grep menyeluruh "plugin"/"life object"): **TIDAK ADA satupun keputusan produk** soal kedua kandidat ini.
- Dicek `docs/LIFEOS_SCOPE.md`: kedua kandidat disebut "termasuk scope kalau dikerjakan nanti" — TIDAK ada detail arsitektur/data-model/acceptance-criteria, hanya pernyataan scope umum. Ini BUKAN keputusan produk final yang cukup utk mulai implementasi.

**Kesimpulan audit:** Batch 4 **BELUM SIAP dimulai** untuk kedua kandidat (Life Objects maupun Plugin System) — keduanya butuh keputusan produk/arsitektur dari user dulu (minimal: skema data, cakupan fitur awal, prioritas mana duluan). Sesuai instruksi eksplisit sesi ini ("Jangan mengarang roadmap. Jangan mengarang fitur. Jika PRODUCT_DECISIONS.md belum final, cukup: audit, cari gap nyata, dokumentasikan, jangan implementasi") — **0 implementasi dilakukan sesi ini.**

**Gap nyata lain (di luar 2 kandidat Batch 4):** dicek ulang observasi lama di log Sesi 52/53 (`knowledgeServiceUpdateTags()`/`Delete()`, `reviewServiceComplete()`/`AddActionItem()` belum wired ke UI) — tetap tercatat sbg **observasi, BUKAN bug** (pola desain yang sama & disengaja), tidak ada gap baru ditemukan yang butuh aksi.

**File yang diubah:** hanya `docs/CLAUDE.md` (log sesi ini). `docs/NEXT_SESSION.md`/`docs/BATCH_PLAN.md`/`docs/PROJECT_STATE.md`/`TODO.md`/`IMPLEMENTATION_STATUS.md`/`ROADMAP.md` **TIDAK diubah** — semua sudah akurat menggambarkan status "Batch 4 belum dimulai, menunggu keputusan produk", tidak ada yang stale.

**Hasil test:** `node --test tests/*.test.js` → **2407/2407 pass, 0 fail** (dijalankan 1x, konfirmasi status quo — tidak ada kode diubah sehingga tidak perlu run kedua kalinya per aturan RECOVERY MODE "jangan mengulang test jika tidak ada perubahan kode").

**Hasil build:** Build TIDAK dijalankan ulang — build terakhir (`?v=485`) masih valid & sudah terverifikasi (dicek `index.html`/`app-bundle-*.min.js` masih menunjukkan `?v=485`), tidak ada kode diubah sesi ini sehingga rebuild akan menghasilkan output identik (sesuai RECOVERY MODE: "jangan mengulang build jika build terakhir masih valid").

**Progress:** Tidak berubah dari Sesi 55. Batch 3 tetap DITUTUP. Batch 4 tetap BELUM DIMULAI.

**Next TODO:** Sesi 57 menunggu keputusan produk dari user soal Life Objects DAN/ATAU Plugin System (skema data, scope MVP, prioritas mana duluan) sebelum Batch 4 bisa benar-benar dimulai. JANGAN menebak arsitektur atau membuat roadmap baru tanpa arahan eksplisit.

**Known Issue:** Tidak ada yang baru. `npm run lint` tetap belum bisa dijalankan di sandbox ini (tanpa akses internet).

## Catatan kerja — Sesi 57 (2026-07-19): Life Object `sourceRef` — Registry + Resolver + Validator (MVP)

**Nomor sesi:** 57
**Tanggal:** 2026-07-19
**Target:** Implementasi Life Object `kind:"ref"` sourceRef, keputusan produk FINAL dari user (Batch 4, kandidat "LifeOS Life Objects" yang sebelumnya diarsipkan sejak Sesi 55/56).

**Keputusan produk final (dari user, dicatat penuh di `docs/PRODUCT_DECISIONS.md` § LifeOS — Life Object sourceRef):**
- `sourceRef = { domain: "...", id: "..." }`.
- `domain` HANYA boleh salah satu dari registry `LIFEOS_OBJECT_REF_SOURCES` (minimal goal/project/knowledge/review) — BUKAN referensi ke Life Object lain, BUKAN generic resolver bebas `{kind,id}`, BUKAN recursive, BUKAN wildcard domain.
- Tiap entry registry minimal: `label`, `resolver(id)`, `exists(id)`.
- Validasi create/update: domain wajib terdaftar, id wajib ada, `exists(id)` harus true — gagal → return validation error, JANGAN membuat object.
- Dilarang eksplisit: referensi antar Life Object, self reference, recursive resolver, nested reference, generic resolver, wildcard domain, Plugin System, UI baru, refactor besar.

**Implementasi:**
- `lifeos/lifeos-registry.js` — tambah `LIFEOS_OBJECT_REF_SOURCES` (object map, BUKAN array+key seperti registry lain — pemakaiannya lookup langsung per nama domain, bukan iterasi/dispatch builder, jadi bentuknya sengaja beda, didokumentasikan di komentar file). 4 domain: `goal` (reuse `goalAdapterList(D)`), `project` (reuse `projectAdapterFindOne(D, store, id)`), `knowledge` (reuse `knowledgeAdapterList(store)`), `review` (baca `LifeOSStore.reviewLog` langsung — belum ada adapter findOne utk reviewLog sebelumnya). Semua resolver/exists baca `D`/`LifeOSStore` dari closure global dgn guard `typeof X !== 'undefined'` (pola SAMA PERSIS dgn `goalSourcePensiun()`/`goalSourceFI()` mengakses `Pensiun`/`FI`, `goal-adapter.js`) — sesuai kontrak `resolver(id)`/`exists(id)` (hanya 1 parameter, bukan `D`/store dioper eksplisit).
- `lifeos/lifeos-object-ref.js` (BARU) — `lifeOSObjectRefResolve(domain,id)`, `lifeOSObjectRefExists(domain,id)`, `lifeOSObjectRefValidate(sourceRef)` (balik `{valid:true}` atau `{valid:false,error:'...'}`, TIDAK PERNAH membuat/menulis object apa pun). Pola file SAMA dgn `lifeos-nav.js` (satu-satunya tempat yang tahu cara resolve, bukan menyebar logic ke tiap UI/service).
- `scripts/build.js` — `lifeos/lifeos-object-ref.js` didaftarkan ke urutan bundle (setelah `knowledge-adapter.js`, sebelum `services/project-service.js` — sesudah semua adapter yang dia-reuse).
- `tests/lifeos-object-ref.test.js` (BARU, 17 test) — bentuk registry (tepat 4 domain, label/resolver/exists per entry), resolver/exists per domain (reuse adapter existing, domain tak terdaftar aman null/false tanpa throw, guard `D` belum ter-load), validator (sukses, sourceRef invalid, domain tak terdaftar, id kosong, id tidak ketemu, TIDAK PERNAH menulis apa pun ke store).

**TIDAK diimplementasikan (di luar scope MVP eksplisit user sesi ini):** storage/CRUD Life Object itu sendiri (belum ada `kind` lain selain `ref`, belum ada `LifeOSStore.objects`), UI baru, Plugin System, refactor besar.

**File yang diubah:**
- `lifeos/lifeos-registry.js` — tambah `LIFEOS_OBJECT_REF_SOURCES`.
- `lifeos/lifeos-object-ref.js` — file baru.
- `scripts/build.js` — daftar file baru ke urutan bundle.
- `tests/lifeos-object-ref.test.js` — file baru, 17 test.
- `docs/PRODUCT_DECISIONS.md`, `docs/PROJECT_STATE.md`, `docs/BATCH_PLAN.md`, `docs/NEXT_SESSION.md`, `docs/CLAUDE.md` (catatan sesi ini) — disinkronkan.

**Diverifikasi:**
- `node --test tests/*.test.js` → **2424/2424 pass, 0 fail** (2x — sebelum & sesudah build, hasil identik, 0 regresi. Naik dari 2407 → +17 test baru).
- `node scripts/build.js kw57-batch4-objectref` → sukses, versi naik ke `?v=486`, kedua bundle lolos `node --check` & lint-guard bawaan (u-dnone/escapeHtml/Tesseract), `index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi.
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan (sandbox tanpa akses internet, `node_modules` tidak terpasang). esbuild TIDAK terpasang — build fallback tanpa minifikasi (aman, cuma lebih besar dari build sebelumnya).

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Life Object `sourceRef` MVP selesai. Storage/CRUD Life Object penuh & Plugin System masih menunggu keputusan produk lanjutan.

**Next TODO:** Sesi berikutnya menunggu keputusan produk dari user soal (a) skema storage/CRUD Life Object penuh (kind lain selain `ref`, tempat penyimpanan `LifeOSStore.objects`?, UI kalau ada) atau (b) Plugin System — JANGAN menebak arsitektur baru tanpa arahan eksplisit.

**Known Issue:** Tidak ada yang baru. `npm run lint` tetap belum bisa dijalankan di sandbox ini (tanpa akses internet).

## Catatan kerja — Sesi 58 (2026-07-19): Life Object CRUD — Service Layer (kind:"generic"|"ref")

**Nomor sesi:** 58
**Tanggal:** 2026-07-19
**Target (instruksi eksplisit user):** CRUD Life Objects (service layer) saja, pertahankan kompatibilitas `kind:"generic"` & `kind:"ref"`, unit test lengkap, build, full regression test, ZIP release, update dokumentasi seperlunya. TIDAK mengerjakan UI maupun Plugin System.

**Implementasi:**
- `lifeos/lifeos-store.js` — tambah `LifeOSStore.objects: []` + masuk ke `LIFEOS_STORE_DEFAULT` (array ke-4, sejajar `projects`/`reviewLog`/`knowledge`). Tidak mengubah struktur `D`, tidak mengubah siklus save/load yang sudah ada — persist otomatis lewat `lifeOSSave()`/`lifeOSLoad()` existing.
- `lifeos/services/life-object-service.js` (BARU) — `lifeObjectServiceCreate`/`Update`/`Delete`/`Get`/`List`. Scope MVP: HANYA `kind:"generic"` (sourceRef selalu dipaksa `null`, pola identik `project-service.js`) & `kind:"ref"` (sourceRef WAJIB lolos `lifeOSObjectRefValidate()` — reuse penuh dari Sesi 57, 0 duplikasi logic validasi) — kind lain ditolak eksplisit dgn `{valid:false,error}`, TIDAK diterima diam-diam. `create()`/`update()` balik `Promise<{valid:true,object}|{valid:false,error}>` (beda dari `project-service.js` yg balik object/null langsung — perlu alasan gagal utk pemanggil, kontrak sama persis dgn `lifeOSObjectRefValidate()`). Validasi gagal → **TIDAK PERNAH menulis** ke `store.objects`, **TIDAK PERNAH memanggil** `lifeOSSave()` (termasuk `update()`: object lama tidak berubah sama sekali, bukan partial mutation). `delete()`/`get()`/`list()` pola sama persis `project-service.js` (delete tidak throw kalau id tidak ada, tetap panggil `lifeOSSave()`; get() null kalau tidak ketemu; list() salinan array).
- `scripts/build.js` — daftarkan `lifeos/services/life-object-service.js` ke urutan bundle (setelah `services/knowledge-service.js`, sebelum `ui/lifeos-home.js` — sesuai urutan wajib store→registry→...→adapters→services→ui yang sudah ada).
- `tests/lifeos-life-object-service.test.js` (BARU, 17 test) — create() kind generic (default, sourceRef dipaksa null meski dioper, field wajib name/areaKey, kind tak dikenal ditolak); create() kind ref (sourceRef valid tersimpan apa adanya, domain tak terdaftar/id tak ketemu/sourceRef kosong → ditolak, TIDAK menulis); update() (partial update, ganti kind generic↔ref ikut aturan sourceRef yg sama, validasi gagal → object tidak berubah sama sekali + TIDAK memanggil lifeOSSave(), id tidak ketemu → error); delete()/get()/list() (pola sama project-service.js). File test berdiri sendiri (tidak dipasangkan `*-ui.test.js` spt project/review/knowledge Batch 3, karena memang tidak ada UI di sesi ini sesuai instruksi eksplisit).

**TIDAK diimplementasikan (di luar scope eksplisit sesi ini):** UI Life Object apa pun, Plugin System, refactor besar, kind Life Object lain selain `generic`/`ref` (belum didesain, sengaja ditolak eksplisit bukan diterima diam-diam).

**File yang diubah:**
- `lifeos/lifeos-store.js` — tambah `objects: []`.
- `lifeos/services/life-object-service.js` — file baru.
- `scripts/build.js` — daftar file baru ke urutan bundle.
- `tests/lifeos-life-object-service.test.js` — file baru, 17 test.
- `docs/PRODUCT_DECISIONS.md`, `docs/PROJECT_STATE.md`, `docs/BATCH_PLAN.md`, `docs/NEXT_SESSION.md`, `docs/CLAUDE.md` (catatan sesi ini) — disinkronkan.

**Diverifikasi:**
- `node --test tests/*.test.js` → **2441/2441 pass, 0 fail** (2x — sebelum & sesudah build, hasil identik, 0 regresi. Naik dari 2424 → +17 test baru).
- `node scripts/build.js kw58-batch4-lifeobject-crud` → sukses, versi naik ke `?v=487`, kedua bundle lolos `node --check` & lint-guard bawaan (u-dnone/escapeHtml/Tesseract), `index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi (134 file, 1250 identifier).
- `npm run lint`/`npx eslint` TIDAK bisa dijalankan (sandbox tanpa akses internet). esbuild TIDAK terpasang — build fallback tanpa minifikasi (aman, cuma lebih besar).

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Life Object `sourceRef` (Sesi 57) + storage/CRUD service layer (Sesi 58, `kind:"generic"|"ref"`) selesai. UI Life Object & Plugin System masih menunggu keputusan produk lanjutan.

**Next TODO:** Sesi berikutnya menunggu arahan/keputusan produk user soal (a) UI Life Object (kalau ada — belum ada desain apa pun) atau (b) Plugin System — JANGAN menebak arsitektur baru tanpa arahan eksplisit.

**Known Issue:** Tidak ada yang baru. `npm run lint` tetap belum bisa dijalankan di sandbox ini (tanpa akses internet).

## Catatan kerja — Sesi 59 (2026-07-19): Keputusan Produk UI Life Object (docs-only, 0 coding)

**Nomor sesi:** 59
**Tanggal:** 2026-07-19
**Target (instruksi eksplisit user):** Rancangan/keputusan produk UI Life Object, TERMASUK jawaban Risiko #1 (jump-to-source Life Object `kind:"ref"` domain `knowledge`/`review`). Sesi ini murni keputusan produk — TIDAK ada coding/implementasi.

**Keputusan produk final (dicatat penuh di `docs/PRODUCT_DECISIONS.md` § "LifeOS — Life Object UI (FINAL — Sesi 59)"):**
- 0 sistem baru — Life Object jadi panel ke-7 di `#lifeOSWrap` (`LifeOSHome`), pola identik 6 panel lain. Panel baru `lifeos/ui/life-objects.js` (`LifeOSLifeObjects`), reuse styling `lifeos-project-card`, wajib didaftarkan ke `window` di `knowledge.js`.
- Create `kind:"generic"` via `showPromptModal()` (nama + areaKey dari `LIFEOS_AREAS`, dropdown bukan teks bebas) → `lifeObjectServiceCreate()`.
- Create `kind:"ref"` via 2-tahap `showChoiceModal()` (domain dari `LIFEOS_OBJECT_REF_SOURCES` → id via adapter domain terkait) → `lifeObjectServiceCreate({kind:'ref', sourceRef})`. Gagal validasi → tampil via `toast()`/`showAlertModal()`, tidak boleh diam-diam gagal.
- Delete via `askConfirm()` (reuse existing) → `lifeObjectServiceDelete()`. Update UI TIDAK ada di Fase 1.
- **Risiko #1 (jump-to-source domain `knowledge`/`review`) DIPUTUSKAN: Option (C)** — `lifeos/ui/life-objects.js` boleh punya mapping domain→cara-buka sendiri (duplikasi kecil disengaja, scope sempit, hanya dipakai saat `open()` Life Object `kind:"ref"`). `knowledgeAdapterList()`/`LifeOSStore.reviewLog` TIDAK diubah (tidak menempel `sourceKind`), `lifeOSNavigateToSource()`/`LIFEOS_NAV_MAP` existing TIDAK diubah, adapter `goal`/`project` TETAP reuse `lifeOSNavigateToSource()` apa adanya (sudah punya `sourceKind`). TIDAK ada penambahan `sourceKind` ke adapter, TIDAK ada refactor lintas modul.
- Guard sourceRef "busuk": `open()`/render kartu `kind:"ref"` pakai `lifeOSObjectRefResolve()`, balik `null` → tampil "Referensi tidak ditemukan" (bukan error/blank), tidak ada background re-validate.
- Fase implementasi didesain bertahap (1: panel+render+empty state+create generic+delete; 2: create ref; 3: jump-to-source ref Option C; 4: opsional, update UI, belum diminta).

**TIDAK diimplementasikan sesi ini:** seluruhnya keputusan produk — 0 kode, 0 test, 0 build baru. Implementasi Fase 1 menunggu sesi berikutnya.

**File yang diubah:**
- `docs/PRODUCT_DECISIONS.md` — tambah § "LifeOS — Life Object UI (FINAL — Sesi 59)".
- `docs/NEXT_SESSION.md` — target sesi berikutnya diarahkan ke Fase 1 UI Life Object.

**Diverifikasi:** Tidak ada perubahan kode/test — `node --test tests/*.test.js` tetap **2441/2441 pass** (baseline tidak berubah dari Sesi 58, tidak perlu dijalankan ulang krn 0 kode diubah, sesuai aturan RECOVERY MODE). Build TIDAK dijalankan ulang — `?v=487` tetap valid.

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Life Object `sourceRef` (Sesi 57) + CRUD service layer (Sesi 58) + keputusan UI termasuk Risiko #1 (Sesi 59) selesai. Implementasi Fase 1 UI Life Object BELUM dimulai.

**Next TODO:** Sesi berikutnya mengerjakan implementasi Fase 1 UI Life Object sesuai desain § Sesi 59 di `docs/PRODUCT_DECISIONS.md` — JANGAN tanya ulang soal keputusan yang sudah final di atas.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 60 (2026-07-19): Sinkronisasi Dokumentasi (docs-only, 0 coding)

**Nomor sesi:** 60
**Tanggal:** 2026-07-19
**Target (instruksi eksplisit user):** MODE DOKUMENTASI SAJA — sinkronisasi dokumentasi menyusul keputusan FINAL Sesi 59 (Risiko #1 jump-to-source Life Object `kind:"ref"` = Option C). TIDAK ada perubahan source code, TIDAK ada perubahan test, TIDAK ada build ulang, TIDAK ada implementasi fitur.

**Audit awal:** `docs/PRODUCT_DECISIONS.md` § "LifeOS — Life Object UI (FINAL — Sesi 59)" & `docs/NEXT_SESSION.md` § "Target berikutnya" ternyata SUDAH berisi keputusan Sesi 59 secara lengkap (ditulis sesi itu juga). Gap nyata yang ditemukan: `docs/CLAUDE.md` (log kerja sekuensial) DAN `docs/BATCH_PLAN.md` (tabel Batch 4) belum punya baris/entri Sesi 59 — log meloncat dari Sesi 58 langsung ke kosong. Ini murni gap dokumentasi (bukan gap keputusan produk).

**Perubahan sesi ini:**
- `docs/CLAUDE.md` — tambah entri log Sesi 59 (retroaktif, merangkum keputusan yang sudah tertulis di `docs/PRODUCT_DECISIONS.md`) + entri log Sesi 60 (sesi ini sendiri).
- `docs/BATCH_PLAN.md` — tambah baris Sesi 59 & Sesi 60 ke tabel Batch 4.
- `docs/NEXT_SESSION.md` — target sesi berikutnya dirapikan agar scope Fase 1 eksplisit sesuai instruksi sesi ini: panel ke-7 LifeOS, list, empty state, create generic, archive/delete (belum ada edit), belum ada Plugin System, jump-to-source mengikuti keputusan FINAL Option (C).
- `docs/PRODUCT_DECISIONS.md` — TIDAK diubah (sudah final & lengkap dari Sesi 59, diverifikasi ulang sesi ini, tidak ada yang perlu ditambah).

**TIDAK diubah:** source code apa pun, file test apa pun, `scripts/build.js`, hasil build (`app-bundle-*.min.js`, `?v=487` tetap), ZIP baru TIDAK dibuat (sesuai mode dokumentasi murni).

**Diverifikasi:** 0 kode/test diubah → baseline **2441/2441 test pass** (tidak dijalankan ulang, tidak ada perubahan yang mempengaruhi hasil, sesuai aturan RECOVERY MODE "jangan mengulang test jika tidak ada perubahan kode"). Build tetap `?v=487` (`kw58-batch4-lifeobject-crud`), tidak di-rebuild.

**Progress:** Batch 4 tidak berubah statusnya — tetap SEDANG BERJALAN, seluruh keputusan produk (Sesi 57-59) sudah final & terdokumentasi lengkap & konsisten. Implementasi Fase 1 UI Life Object masih menjadi target sesi berikutnya.

**Next TODO:** Sesi berikutnya (Sesi 61) mengerjakan implementasi Fase 1 UI Life Object — lihat `docs/NEXT_SESSION.md` § "Target berikutnya" utk scope detail.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 61 (2026-07-19): Life Object UI — Fase 1 (implementasi)

**Nomor sesi:** 61
**Tanggal:** 2026-07-19
**Target (dari `docs/NEXT_SESSION.md`):** Implementasi Fase 1 UI Life Object sesuai desain FINAL Sesi 59 (`docs/PRODUCT_DECISIONS.md` § "LifeOS — Life Object UI (FINAL — Sesi 59)"): panel ke-7 + list + empty state + create `kind:"generic"` + archive/delete + jump-to-source Option (C). Create `kind:"ref"` (2-modal) & Update UI TIDAK di Fase 1.

**Implementasi:**
- File baru `lifeos/ui/life-objects.js` (`LifeOSLifeObjects`) — `render()` (list dari `lifeObjectServiceList()`, empty state, reuse styling `lifeos-project-card`), `createGeneric()`/`promptCreateGeneric()` (`showPromptModal()` nama → `showChoiceModal()` areaKey dari `LIFEOS_AREAS`, dropdown bukan teks bebas), `remove()` (`askConfirm()` → `lifeObjectServiceDelete()`), `open()` (jump-to-source Option C: domain `goal`/`project` reuse `lifeOSNavigateToSource()` apa adanya; domain `knowledge`/`review` mapping lokal di file ini sendiri via `showAlertModal()`; sourceRef "busuk" → `lifeOSObjectRefResolve()` balik `null` → toast "Referensi tidak ditemukan").
- `lifeos/ui/knowledge.js` — daftarkan `window.LifeOSLifeObjects` (mencegah bug data-action silent-fail, pola sama modul lain).
- `lifeos/ui/lifeos-home.js` — kartu ringkasan baru di `lifeOSHomeGrid` (ikon 🧩, count `lifeObjectServiceList().length`), `switchPanel()` tambah `'life-objects'`.
- `scripts/build.js` — daftarkan `lifeos/ui/life-objects.js` SEBELUM `lifeos/ui/knowledge.js` (knowledge.js yang expose ke `window`, urutan load wajib begitu).
- `index.html`/`app_production.html` — tambah `#lifeOSPanel-life-objects` (tombol "Life Object Baru" + `#lifeOSLifeObjectsGrid`), disinkronkan di kedua file.

**TIDAK diimplementasikan sesi ini (sesuai scope Fase 1):** create `kind:"ref"` (2-modal `showChoiceModal()`), Update UI, Plugin System.

**Test:** +11 test baru (`tests/lifeos-life-objects-ui.test.js`) — render (kosong/isi/DOM hilang), createGeneric (valid/gagal validasi), remove (confirm/cancel), open (generic/ref goal/ref knowledge/sourceRef busuk). **2452/2452 test pass** (naik dari 2441, 2x — sebelum & sesudah build).

**Build:** `kw61-batch4-lifeobject-ui-fase1` (`?v=488`).

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Fase 1 UI Life Object SELESAI. Sisa Batch 4: Fase 2 (create `kind:"ref"` 2-modal) & opsional Fase 4 (Update UI); Plugin System masih menunggu keputusan produk terpisah.

**Next TODO:** Sesi berikutnya mengerjakan Fase 2 — create Life Object `kind:"ref"` via 2-tahap `showChoiceModal()` (pilih domain dari `LIFEOS_OBJECT_REF_SOURCES` → pilih id via adapter domain terkait) → `lifeObjectServiceCreate({kind:'ref', sourceRef})`, gagal validasi tampil via `toast()`/`showAlertModal()`.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 62 (2026-07-19): Life Object UI — Fase 2 (create kind:"ref")

**Nomor sesi:** 62
**Tanggal:** 2026-07-19
**Target (dari `docs/NEXT_SESSION.md`):** Implementasi Fase 2 — create Life Object `kind:"ref"` via 2-tahap `showChoiceModal()` (pilih domain dari `LIFEOS_OBJECT_REF_SOURCES` → pilih id dari domain terkait via adapter masing-masing) → `lifeObjectServiceCreate({kind:'ref', sourceRef})`.

**Implementasi:**
- `lifeos/ui/life-objects.js` (`LifeOSLifeObjects`) — tambah `promptCreateRef()` (2 tahap `showChoiceModal()`: pilih domain, lalu pilih item via `_refSourceItems()`), `_refSourceItems(domain)` (REUSE `goalAdapterList`/`projectAdapterList`/`knowledgeAdapterList`/`LifeOSStore.reviewLog` apa adanya — 0 agregasi/query baru), `createRef(name, areaKey, sourceRef)` (→ `lifeObjectServiceCreate({kind:'ref'})` → render + `LifeOSHome.render()`).
- Domain/item tanpa data → toast, tidak lanjut modal berikutnya. Validasi `sourceRef` gagal → toast error, tidak menulis ke store.
- Render kartu `kind:"ref"` hasil create REUSE `render()` existing Fase 1 (0 builder kartu baru).
- `index.html`/`app_production.html` — tombol baru "🔗 Life Object dari Referensi", disinkronkan.

**TIDAK diimplementasikan sesi ini:** Update UI, Plugin System.

**Test:** +8 test baru (`tests/lifeos-life-objects-ui.test.js`, total 19 test file ini). **2460/2460 test pass** (naik dari 2452, 2x — sebelum & sesudah build).

**Build:** `kw62-batch4-lifeobject-ui-fase2` (`?v=489`).

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Fase 1 & Fase 2 UI Life Object SELESAI. Sisa Batch 4: opsional Update UI; Plugin System masih menunggu keputusan produk terpisah.

**Next TODO:** Sesi berikutnya konfirmasi ke user apakah Update UI (opsional) jadi target eksplisit, atau target lain (Plugin System perlu keputusan produk dulu, jangan ditebak).

**Known Issue:** Tidak ada yang baru. (Catatan: dokumentasi Sesi 62 sempat tertinggal — `docs/NEXT_SESSION.md` disinkronkan retroaktif di sesi lanjutan sebelum Sesi 63 dimulai, `docs/CLAUDE.md`/`docs/BATCH_PLAN.md` disinkronkan di sesi ini (Sesi 64, Batch Review) — 0 dampak ke kode/test.)

## Catatan kerja — Sesi 63 (2026-07-19): Life Object UI — Update (edit nama/areaKey)

**Nomor sesi:** 63
**Tanggal:** 2026-07-19
**Target (dari konfirmasi user, opsi "Update UI Life Object" di `docs/NEXT_SESSION.md`):** Implementasi Update UI — edit nama/areaKey Life Object. `sourceRef`/`kind` TIDAK diedit (belum ada keputusan produk utk ganti referensi).

**Implementasi:**
- `lifeos/ui/life-objects.js` (`LifeOSLifeObjects`) — tombol edit (✏️) per kartu → `promptEdit(id)` (`showPromptModal()` nama, prefill dari `obj.name`, lalu `showChoiceModal()` areaKey dari `LIFEOS_AREAS`, pola sama create) → `update(id, name, areaKey)` → `lifeObjectServiceUpdate()` (sudah ada sejak Sesi 58, dipanggil apa adanya — TIDAK ditulis ulang) → render() + `LifeOSHome.render()`.
- id tidak ditemukan/validasi gagal → toast error, TIDAK throw, TIDAK partial state.

**TIDAK diimplementasikan sesi ini:** edit `sourceRef`/`kind`, Plugin System.

**Test:** +6 test baru (`tests/lifeos-life-objects-ui.test.js`, total 25 test file ini). **2466/2466 test pass** (naik dari 2460, 2x — sebelum & sesudah build).

**Build:** `kw63-batch4-lifeobject-ui-update` (`?v=490`).

**Progress:** Batch 4 (Sesi 56–?) **SEDANG BERJALAN** — Fase 1, Fase 2, & Update UI Life Object SELESAI. Sisa Batch 4: Plugin System masih menunggu keputusan produk terpisah (jangan ditebak).

**Next TODO:** Sesi berikutnya konfirmasi ke user target (Plugin System perlu keputusan produk dulu, ATAU Batch Review kalau tidak ada target baru).

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 64 (2026-07-19): Batch Review — Batch 4 DITUTUP

**Nomor sesi:** 64
**Tanggal:** 2026-07-19
**Target (konfirmasi eksplisit user):** Batch Review Batch 4 (tutup batch, tanpa fitur baru) — Plugin System TIDAK dikerjakan (belum ada keputusan produk, tidak ditebak).

**Audit:**
- Sinkronisasi dokumentasi: entri Sesi 62 & 63 yang sempat tertinggal di `docs/CLAUDE.md`/`docs/BATCH_PLAN.md` ditambahkan (retroaktif, `docs/NEXT_SESSION.md` sudah lengkap sejak sesi masing-masing). Pola gap dokumentasi sama seperti insiden Sesi 39/41/44/46/47/60 — bukan gap keputusan produk.
- Quality check: 0 duplicate helper/registry/adapter/storage/UI di scope Life Object (`life-object-service.js` satu-satunya penulis `LifeOSStore.objects`; `lifeos-object-ref.js`/`LIFEOS_OBJECT_REF_SOURCES` satu-satunya validator/registry sourceRef; `life-objects.js` panel tunggal, tidak ada builder kartu duplikat utk `kind:"ref"`).
- Test coverage Batch 4 diverifikasi lengkap: `tests/lifeos-object-ref.test.js` (17), `tests/lifeos-life-object-service.test.js` (17), `tests/lifeos-life-objects-ui.test.js` (25 — render/empty/create generic/create ref 2-modal/update/delete/jump-to-source/sourceRef busuk). Tidak ada gap implementasi baru ditemukan → 0 kode source diubah sesi ini.
- Plugin System & kind Life Object selain `generic`/`ref`: TETAP belum ada keputusan produk — diarsipkan sbg kandidat Batch 5, BUKAN dikerjakan/ditebak.

**Test:** 0 test baru. **2466/2466 test pass** (2x, sebelum & sesudah build — regression penuh, tidak berubah dari Sesi 63).

**Build:** tidak ada rebuild kode baru (0 source berubah); versi tetap `?v=490`.

**Progress:** **Batch 4 (Sesi 56–64) DITUTUP.** Life Object `sourceRef` MVP (57) + CRUD service (58) + keputusan UI (59) + Fase 1 (61) + Fase 2 (62) + Update UI (63) semua SELESAI & tertes.

**Next TODO:** Batch 5 — target BELUM ditentukan. Kandidat: LifeOS Plugin System (butuh keputusan produk/arsitektur dulu, jangan ditebak), kind Life Object baru selain `generic`/`ref` (sama, butuh keputusan produk dulu).

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 65 (2026-07-19): LifeOS Plugin System — MVP

**Nomor sesi:** 65
**Tanggal:** 2026-07-19
**Target (konfirmasi eksplisit user, Opsi 1 dari 3 pilihan Batch 5 — FINAL, tidak didiskusikan ulang):** LifeOS Plugin System — MVP saja: Plugin Registry, Plugin Manifest, Plugin Loader, Plugin Validation. TIDAK Plugin UI, TIDAK Marketplace, TIDAK Plugin Runtime kompleks. Satu sesi = satu milestone.

**Implementasi:**
- Arsitektur MENGIKUTI pola registry yang SUDAH ADA di repo (`economic-intelligence/eie-registry.js`, "Plugin registry EIE" — object tunggal + `register()`/getter, TANPA eksekusi kode) — bukan dirancang ulang dari nol, sesuai instruksi "arsitektur yang sudah ada".
- `lifeos/plugins/lifeos-plugin-manifest.js` (BARU) — `LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS`/`OPTIONAL_FIELDS` + `lifeOSPluginCreateManifest({id,name,version,areaKey,description})`. Manifest MURNI metadata — TIDAK ada `entry`/kode eksekusi apa pun (Plugin Runtime sengaja di luar scope).
- `lifeos/plugins/lifeos-plugin-validation.js` (BARU) — `lifeOSPluginValidateManifest(manifest)`: tolak bukan object/array, field wajib (`id`/`name`/`version`) kosong/bukan string, `version` bukan format semver `x.y.z`, `areaKey` (opsional) yang tidak terdaftar di `LIFEOS_AREAS` (`lifeos-registry.js`, REUSE penuh — 0 registry/taksonomi baru). Kontrak sama persis dgn `lifeOSObjectRefValidate()`: balik `{valid,error?}`, TIDAK PERNAH throw.
- `lifeos/plugins/lifeos-plugin-registry.js` (BARU) — `LifeOSPluginRegistry` (`_plugins` map by id): `register()` (validasi dulu via `lifeOSPluginValidateManifest()`, id duplikat DITOLAK eksplisit bukan overwrite diam-diam), `unregister()`, `get()`, `list()`, `has()`. TIDAK menyentuh `D`/`LifeOSStore` — murni bookkeeping in-memory metadata, beda total dari `LifeOSStore.objects`.
- `lifeos/plugins/lifeos-plugin-loader.js` (BARU) — `lifeOSPluginLoad(manifests)`: batch register array manifest ke `LifeOSPluginRegistry`, satu manifest gagal (invalid/duplikat) TIDAK menghentikan proses batch, balik `{loaded:[ids], rejected:[{id,error}]}`. "Loader" = memuat manifest ke registry, BUKAN menjalankan kode plugin.
- Didaftarkan ke `scripts/build.js`, urutan setelah `lifeos-registry.js`/`lifeos-link-registry.js` (butuh `LIFEOS_AREAS` utk validasi `areaKey`), sebelum adapters.

**TIDAK diimplementasikan sesi ini (sesuai scope MVP eksplisit user):** Plugin UI, Plugin Marketplace, Plugin Runtime (eksekusi kode plugin sungguhan/sandboxing), kind Life Object baru selain `generic`/`ref`.

**Catatan teknis (bukan perubahan scope):** 12 test sempat gagal saat regression pertama karena isu harness `loadSource()` (vm) — (a) `const LifeOSPluginRegistry` tidak otomatis nempel ke context vm (butuh `expose` eksplisit, sama seperti `LIFEOS_PLUGIN_MANIFEST_REQUIRED_FIELDS`), (b) beberapa assertion membandingkan objek/array yang DIBUAT DI DALAM vm sandbox langsung dengan literal test file — beda realm → `assert.deepEqual` (strict) gagal walau isinya identik (pola sama seperti kenapa `tests/lifeos-object-ref.test.js` selalu membungkus hasil vm lewat `Object.keys().sort()` sebelum dibandingkan). Diperbaiki dgn `Array.from()`/perbandingan field individual — 0 perubahan pada kode source, murni perbaikan test.

**Test:** +20 test baru (`tests/lifeos-plugin-system.test.js`). **2486/2486 test pass** (naik dari 2466, 2x — sebelum & sesudah build).

**Build:** `kw65-batch5-plugin-system-mvp` (`?v=491`).

**Progress:** **Batch 5 (Sesi 65–?) SEDANG BERJALAN** — Plugin System MVP (Registry/Manifest/Loader/Validation) SELESAI.

**Next TODO:** Sesi berikutnya tanya user target lanjutan Batch 5: Plugin UI, Plugin Marketplace, Plugin Runtime (semua butuh keputusan produk/arsitektur terpisah, jangan ditebak), atau kind Life Object baru selain `generic`/`ref`, atau Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 66 (2026-07-19): LifeOS Plugin System — Plugin UI

**Nomor sesi:** 66
**Tanggal:** 2026-07-19
**Target (konfirmasi eksplisit user, target lanjutan Batch 5):** Plugin UI — panel utk lihat/registrasi plugin terdaftar, konsisten dgn Plugin System MVP Sesi 65 (Registry/Manifest/Loader/Validation). TIDAK Plugin Marketplace, TIDAK Plugin Runtime.

**Implementasi:**
- `lifeos/ui/plugins.js` (BARU) — panel ke-8 Life OS `LifeOSPlugins`, pola SAMA PERSIS dgn `life-objects.js` Fase 1 (card list + empty state + tombol aksi `data-action`): `render()` (list dari `LifeOSPluginRegistry.list()` — id/nama/versi/areaKey apa adanya), `register(id,name,version,areaKey)` (bungkus `lifeOSPluginCreateManifest()` → `LifeOSPluginRegistry.register()`, gagal → toast error, TIDAK render ulang state salah), `promptRegister()` (`showPromptModal()` berantai id→nama→versi, lalu `showChoiceModal()` areaKey OPSIONAL dari `LIFEOS_AREAS` — pilihan pertama "Tidak ada" → `areaKey:null`; batal di tahap manapun → berhenti diam-diam, 0 register), `remove(id)` (`askConfirm()` → `unregister()` → `render()`).
- Beda sengaja dari Life Object: `LifeOSPluginRegistry` MURNI in-memory (bukan `LifeOSStore`/`D`) → TIDAK ada `lifeOSSave()`/`LifeOSHome.render()` dipanggil setelah register/unregister (tidak ada data App inti yang berubah).
- `lifeos/ui/lifeos-home.js` — kartu ringkasan "🔌 Plugin" ditambahkan ke `lifeOSHomeGrid` (count dari `LifeOSPluginRegistry.list().length`), `'plugins'` ditambahkan ke array `switchPanel()`, `LifeOSPlugins.render()` dipanggil di `render()`.
- `index.html`/`app_production.html` — panel baru `#lifeOSPanel-plugins` (tombol "🔌 Daftarkan Plugin" + `#lifeOSPluginsGrid`), disisipkan tepat setelah panel `#lifeOSPanel-life-objects`, disinkronkan di kedua file.
- `lifeos/ui/knowledge.js` (titik expose window terakhir grup `lifeos/ui/*`) — `window.LifeOSPlugins` ditambahkan, pola sama `window.LifeOSLifeObjects`.
- Didaftarkan ke `scripts/build.js`, urutan setelah `lifeos/ui/life-objects.js`, sebelum `lifeos/ui/knowledge.js`.

**Catatan teknis (bukan perubahan scope):** Regression pertama sempat 1 fail — `tests/window-expose-audit.test.js` mendeteksi `LifeOSPlugins` dipakai via `data-action` di HTML tapi belum di-expose ke `window` (bug nyata yang sama persis dgn insiden lama yang didokumentasikan di `knowledge.js`, "tombol diam saat diklik"). Diperbaiki dgn menambahkan baris expose di `knowledge.js` — 0 perubahan scope, murni memperbaiki gap yang terdeteksi audit otomatis.

**TIDAK diimplementasikan sesi ini:** Plugin Marketplace, Plugin Runtime (eksekusi kode plugin sungguhan), edit manifest plugin setelah register (unregister + register ulang kalau perlu ganti), kind Life Object baru selain `generic`/`ref`.

**Test:** +13 test baru (`tests/lifeos-plugins-ui.test.js`). **2499/2499 test pass** (naik dari 2486, 2x — sebelum & sesudah build).

**Build:** `kw66-batch5-plugin-ui-mvp` (`?v=492`).

**Progress:** **Batch 5 (Sesi 65–?) SEDANG BERJALAN** — Plugin System MVP (Sesi 65) + Plugin UI (Sesi 66) SELESAI.

**Next TODO:** Sesi berikutnya tanya user target lanjutan Batch 5: Plugin Marketplace, Plugin Runtime (keduanya butuh keputusan produk/arsitektur terpisah, jangan ditebak), atau kind Life Object baru selain `generic`/`ref`, atau Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 67 (2026-07-19): Sinkronisasi Dokumentasi (docs-only, 0 coding)

**Nomor sesi:** 67
**Tanggal:** 2026-07-19
**Mode:** Dokumentasi murni (pola sama Sesi 60), tidak ada instruksi fitur baru.

**Temuan audit:**
- `docs/NEXT_SESSION.md` § "Batch Tracking" masih menulis "Batch 5:
  BELUM DIMULAI" dan § "Session terakhir"/"Checkpoint" masih macet di
  Sesi 64 — padahal Sesi 65 (Plugin System MVP) & Sesi 66 (Plugin UI)
  sudah SELESAI & terdokumentasi lengkap di `docs/CLAUDE.md`/
  `docs/BATCH_PLAN.md`/`docs/LIFEOS_SCOPE.md`. Gap dokumentasi murni
  (retroaktif), BUKAN gap implementasi.
- `docs/PROJECT_STATE.md` baris "Test suite `lifeos/`" belum
  menghitung `tests/lifeos-life-objects-ui.test.js` (25),
  `tests/lifeos-plugin-system.test.js` (20),
  `tests/lifeos-plugins-ui.test.js` (13) — total salah (152, seharusnya
  210).

**Perbaikan:** Ketiga gap di atas diperbaiki di `docs/NEXT_SESSION.md`
dan `docs/PROJECT_STATE.md`. `docs/CLAUDE.md`, `docs/BATCH_PLAN.md`,
`docs/LIFEOS_SCOPE.md` sudah lengkap sejak Sesi 66 — tidak perlu
diubah selain entri Sesi 67 ini.

**Test:** 0 test baru. Regression penuh dijalankan ulang sbg verifikasi
— **2499/2499 test pass**, 0 fail.

**Build:** 0 kode diubah → tidak ada rebuild. Versi tetap
`kw66-batch5-plugin-ui-mvp` (`?v=492`).

**Progress:** **Batch 5 (Sesi 65–?) SEDANG BERJALAN** — Plugin System
MVP (65) + Plugin UI (66) SELESAI, dokumentasi sekarang konsisten
penuh di 5 file (`docs/CLAUDE.md`/`docs/BATCH_PLAN.md`/
`docs/PROJECT_STATE.md`/`docs/LIFEOS_SCOPE.md`/`docs/NEXT_SESSION.md`).

**Next TODO:** Sama seperti akhir Sesi 66 — tanya user target lanjutan
Batch 5 (Plugin Marketplace, Plugin Runtime, atau kind Life Object baru
selain `generic`/`ref`, semua butuh keputusan produk/arsitektur
terpisah, jangan ditebak), atau Batch Review kalau tidak ada target
baru.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 69 (2026-07-19): LifeOS Plugin System — Plugin Runtime MVP

**Nomor sesi:** 69
**Tanggal:** 2026-07-19
**Target (eksplisit user):** Plugin Runtime, di atas Plugin
Registry+Manifest+Loader yang sudah ada (Sesi 65) — TIDAK Marketplace,
TIDAK Plugin UI baru.

**Implementasi:**
- `lifeos/plugins/lifeos-plugin-runtime.js` (BARU) — `LifeOSPluginRuntime`,
  state machine lifecycle per plugin id: `loaded → enabled ⇄ disabled →
  unloaded`. `load(manifest, hooks?)` reuse penuh
  `LifeOSPluginRegistry.register()` (0 duplikasi validasi), lalu buat
  entri runtime. `enable()`/`disable()` menolak transisi ilegal eksplisit
  (mis. `disable()` dari `'loaded'`, `enable()` dari `'enabled'`) — bukan
  silent no-op. `unload()` state akhir permanen dari state manapun
  (termasuk `'error'`), unregister dari `LifeOSPluginRegistry` juga.
- **Capability validation** — `manifest.capabilities` (opsional, BARU,
  array string) ditambah ke `lifeos-plugin-manifest.js`
  (`LIFEOS_PLUGIN_CAPABILITIES = ['read-data','ui-panel','notify']`) dan
  divalidasi di `lifeos-plugin-validation.js` (WAJIB subset capability
  dikenal, kalau tidak `register()` menolak). `LifeOSPluginRuntime.enable()`
  cek ulang (defense-in-depth, jaga-jaga manifest masuk lewat jalur lain).
  Perluasan MINIMAL & backward-compatible — manifest tanpa `capabilities`
  tetap valid (default `[]`).
- **Error isolation** — `load(manifest, {onEnable, onDisable})`: hook
  opsional disuplai PEMANGGIL saat load runtime (BUKAN dari isi
  manifest/kode plugin — jadi TIDAK ada "kode plugin dari luar" yang
  dieksekusi di sini). Hook dibungkus try/catch di `_runHookIsolated()`
  — throw TIDAK PERNAH merambat ke pemanggil `enable()`/`disable()`, dan
  TIDAK PERNAH menjatuhkan plugin lain di runtime registry (dites
  eksplisit: plugin A punya hook yang throw, plugin B tetap `enable()`
  normal). Plugin yang hook-nya throw ditandai state `'error'` +
  `lastError` disimpan (bisa dibaca via `lastError(id)`).
- **TETAP TIDAK ADA eksekusi kode plugin arbitrer** — manifest TETAP
  tanpa `entry`/kode eksekusi (keputusan arsitektur Sesi 65 tidak
  berubah), Runtime ini TIDAK `eval`/`import()`/menjalankan kode dari
  file/string plugin apa pun. "Runtime" = state machine lifecycle +
  gerbang capability, BUKAN sandbox eksekusi kode.
- `scripts/build.js` — daftarkan `lifeos-plugin-runtime.js` di urutan
  LifeOS (setelah loader, sebelum adapters).
- `LifeOSPluginRuntime` TIDAK di-expose ke `window` — sama seperti
  `LifeOSPluginRegistry`, layer internal/backend yang tidak dipanggil
  lewat `data-action` dari HTML manapun (tidak ada UI baru sesi ini),
  jadi tidak melanggar pola `window-expose-audit.test.js`.

**Test:** +21 test baru (`tests/lifeos-plugin-runtime.test.js`) —
load()/enable()/disable()/unload() state machine (transisi legal &
ilegal), capability validation, error isolation (termasuk isolasi
antar-plugin), `list()`. 1 test lama disesuaikan
(`tests/lifeos-plugin-system.test.js`, assersi
`LIFEOS_PLUGIN_MANIFEST_OPTIONAL_FIELDS` nambah `'capabilities'`).
Catatan teknis: beberapa assersi awal pakai `assert.deepEqual` gagal
krn cross-realm prototype mismatch VM sandbox (pola sudah dikenal,
lihat catatan Kasir module) — diperbaiki jadi perbandingan per-field
(`assert.equal` tiap properti, bukan `assert.deepEqual` objek/array
utuh dari sandbox).

**Regression:** 2520/2520 pass (naik dari 2499, 2x — sebelum & sesudah
build).

**Build:** `kw69-batch5-plugin-runtime-mvp` (`?v=493`, naik dari
`?v=492`).

**Progress:** **Batch 5 (Sesi 65–?) SEDANG BERJALAN** — Plugin System
MVP (65) + Plugin UI (66) + Plugin Runtime MVP (69) SELESAI. Kandidat
lanjutan (belum dipilih): Plugin Marketplace, kind Life Object baru
selain `generic`/`ref`.

**Next TODO:** Tanya user target lanjutan Batch 5 (Plugin Marketplace
atau kind Life Object baru — keputusan produk/arsitektur terpisah,
jangan ditebak), atau Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 71 (2026-07-20): Finance Domain Foundation (Batch 6)

**Nomor sesi:** 71
**Tanggal:** 2026-07-20
**Target (keputusan produk FINAL, eksplisit dari user):** "Finance
Domain Foundation" — dukungan domain `finance` pada Life Object
`sourceRef` (`kind:"ref"`), Batch 6.

**Konteks:** Sesi ini awalnya diarahkan minta klarifikasi kandidat
Batch 5 (Plugin Marketplace / kind Life Object baru, sesuai
`docs/NEXT_SESSION.md` § First Action). User memberi keputusan FINAL
baru di luar 2 kandidat lama: domain `finance` pada Life Object.
Diperlakukan sbg keputusan produk final sesuai instruksi eksplisit
user — scope diambil paling sempit yang konsisten dgn arsitektur
`LIFEOS_OBJECT_REF_SOURCES` yang SUDAH ADA (Sesi 57/58, 4 domain
goal/project/knowledge/review), bukan sistem baru.

**Implementasi:**
- `lifeos/lifeos-registry.js` — `LIFEOS_OBJECT_REF_SOURCES` nambah
  entry ke-5, `finance` (`label: 'Transaksi'`). `resolver(id)`/`exists(id)`
  baca `D.transactions` LANGSUNG (guard `typeof D !== 'undefined'`) —
  TIDAK ada adapter `lifeos/adapters/*.js` baru (pola SAMA PERSIS dgn
  domain `review`, yang juga baca `store.reviewLog` langsung tanpa
  adapter terpisah). 0 perubahan ke `lifeOSObjectRefResolve`/`Exists`/
  `Validate` (`lifeos-object-ref.js`) — generic penuh terhadap domain
  baru.
- `lifeos/ui/life-objects.js` — `_refSourceItems('finance')` REUSE
  `D.transactions` apa adanya (label dari `category`/`subcategory`/
  `amount` via `fmtFull()` kalau tersedia/`date`). Jump-to-source domain
  `finance` ditambahkan ke `_openRefLocal()` (mapping lokal, pola sama
  knowledge/review) TAPI reuse `editTx()` (modal edit transaksi yang
  SUDAH ADA di `modules/finance/transaksi.js`) — BUKAN `showAlertModal()`
  spt knowledge/review, karena transaksi sudah punya UI edit sendiri.
  `promptCreateRef()` otomatis mendukung domain baru ini tanpa
  perubahan (daftar domain diambil dinamis dari
  `Object.keys(LIFEOS_OBJECT_REF_SOURCES)`).
- `lifeos/services/life-object-service.js` — 0 perubahan (validasi
  `sourceRef` generic penuh via `lifeOSObjectRefValidate()`).
- TIDAK ada UI baru/panel baru, TIDAK ada storage baru — murni
  pendaftaran 1 domain baru ke sistem `sourceRef` yang sudah ada.

**Test:** +11 test baru — 7 di `tests/lifeos-object-ref.test.js`
(resolver/exists/validate domain `finance`, D belum ter-load,
D.transactions belum ada), 4 di `tests/lifeos-life-objects-ui.test.js`
(`open()` reuse `editTx()`, sourceRef busuk, `_refSourceItems('finance')`
dgn & tanpa `D.transactions`). 1 assersi lama disesuaikan
(`tests/lifeos-object-ref.test.js`, "TEPAT 4 domain" → "TEPAT 5 domain").

**Regression:** 2531/2531 pass (naik dari 2520, 2x — sebelum & sesudah
build).

**Build:** `kw71-batch6-finance-domain-foundation` (`?v=494`, naik dari
`?v=493`).

**Progress:** **Batch 6 (Sesi 71–?) DIMULAI** — Finance Domain
Foundation SELESAI & tertes. `LIFEOS_OBJECT_REF_SOURCES` sekarang 5/5
domain (finance/goal/knowledge/project/review).

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 6. Kandidat Batch 5 lama (Plugin Marketplace, kind Life
Object baru selain `generic`/`ref`) tetap terarsip, belum dikerjakan.

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 71 lanjutan (2026-07-20): Finance Domain — test coverage tambahan (Batch 6)

**Konteks:** Sesi 71 (di atas) sudah SELESAI & tertes penuh, tapi
`tests/lifeos-life-objects-ui.test.js` belum punya test `createRef()`
khusus domain `finance` (test `createRef()` yang ada sebelumnya cuma
pakai `areaKey:'finance'` dgn `sourceRef.domain:'knowledge'` — bukan
sourceRef yang benar-benar nunjuk domain `finance`). Ditambahkan
menyusul instruksi eksplisit user melengkapi test asset ini.

**Implementasi:** HANYA `tests/lifeos-life-objects-ui.test.js` diubah —
+2 test baru, ditaruh persis sebelum test `promptCreateRef()` domain
knowledge:
- `createRef()` domain `finance` sukses — `D.transactions` berisi
  `tx1`, `sourceRef:{domain:'finance',id:'tx1'}` -> `result.valid===true`,
  `store.objects[0].kind==='ref'`, `sourceRef` tersimpan sesuai, `save()`
  & `LifeOSHome.render()` terpanggil 1x (pola identik test `createRef()`
  domain `knowledge` yang sudah ada).
- `createRef()` domain `finance` gagal — `id` tidak ada di
  `D.transactions` -> `result.valid===false`, store TIDAK bertambah,
  `save()` TIDAK terpanggil, 1 toast error.

TIDAK ADA perubahan ke `lifeos-registry.js`, `lifeos/ui/life-objects.js`,
`life-object-service.js`, atau file source lain mana pun — murni
penambahan test asset.

**Test:** +2 test baru. Regression penuh: 2533/2533 pass (naik dari
2531, 2x — sebelum & sesudah build).

**Build:** `kw71-batch6-finance-domain-foundation-createref-tests`
(`?v=495`, naik dari `?v=494`).

**Progress:** Batch 6 (Sesi 71) — Finance Domain Foundation + test
coverage tambahan SELESAI & tertes penuh.

**Next TODO:** Sama seperti sebelumnya — belum ada keputusan produk
user utk arah lanjutan Batch 6 (builder finance lanjutan, Plugin
Marketplace, atau kind Life Object baru).

**Known Issue:** Tidak ada yang baru.

## Catatan kerja — Sesi 72 (2026-07-20): Finance Domain — Builder Filter Transaksi (Batch 6)

**Target (keputusan produk FINAL, eksplisit dari user):** "Builder
finance lanjutan" = filter di picker saat BUAT ref baru (pilih tipe
transaksi dulu, lalu pilih 1 transaksi spesifik) — sourceRef TETAP
nunjuk 1 transaksi tunggal (alternatif "ref ke sekumpulan transaksi"
ditolak eksplisit). Lihat `docs/PRODUCT_DECISIONS.md` § "LifeOS —
Finance Domain: Builder Filter Transaksi (FINAL — Sesi 72, Batch 6)".

**Implementasi:**
- `lifeos/ui/life-objects.js` — `_refSourceItems(domain, filter)`
  nambah parameter `filter` opsional. HANYA domain `finance` yang
  memakainya: `{type:'income'|'expense'}` mempersempit
  `D.transactions` (via `Array.filter`) SEBELUM di-map ke {id,label}.
  Tanpa filter -> perilaku sama persis Sesi 71 (semua transaksi).
  Domain lain (goal/project/knowledge/review) mengabaikan parameter
  ini sepenuhnya — signature backward-compatible.
- `promptCreateRef()` — setelah domain `finance` dipilih (tahap 1),
  disisipkan 1 `showChoiceModal()` baru KHUSUS finance: "Semua" /
  "Pemasukan" / "Pengeluaran". Hasil dipetakan ke `financeFilter`
  (`{type:'income'}`/`{type:'expense'}`/`undefined`), lalu diteruskan
  ke `_refSourceItems('finance', financeFilter)`. Domain lain TIDAK
  kena modal tambahan ini (alur 2-modal lama tetap identik).
- `lifeos-registry.js`, `life-object-service.js`,
  `lifeos-object-ref.js` — 0 perubahan (struktur `sourceRef`
  `{domain,id}` tetap sama, filter murni mempersempit picker UI).

**Test:** +6 test baru di `tests/lifeos-life-objects-ui.test.js` —
`_refSourceItems('finance', {type:'expense'|'income'})` (2), tanpa
filter tetap semua (1, regresi-guard), `promptCreateRef()` alur
lengkap dgn filter "Pengeluaran" (1), filter "Semua" tidak
mempersempit (1), batal di modal filter -> tidak lanjut ke modal item
(1).

**Regression:** 2539/2539 pass (naik dari 2533, 2x — sebelum & sesudah
build).

**Build:** `kw72-batch6-finance-filter-builder` (`?v=496`, naik dari
`?v=495`).

**Progress:** Batch 6 (Sesi 71-72) — Finance Domain Foundation +
builder filter transaksi SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 6 (Plugin Marketplace atau kind Life Object baru selain
`generic`/`ref`, kandidat lama Batch 5), atau Batch Review kalau tidak
ada target baru.

**Known Issue:** Tidak ada yang baru.

---

## Catatan kerja — Sesi 73 (2026-07-20): Finance Account & Finance Category Foundation (Batch 6)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 6 setelah Finance Domain Foundation (Sesi 71) + Builder Filter
Transaksi (Sesi 72) — tambah 2 domain `sourceRef` baru: `financeAccount`
(D.accounts) & `financeCategory` (D.categories.income/.expense). Pola
implementasi SAMA PERSIS dgn domain `finance` (Sesi 71): baca D langsung
apa adanya, TIDAK ada adapter `lifeos/adapters/*.js` baru, TIDAK ada
agregasi/query baru.

**Implementasi:**
- `lifeos/lifeos-registry.js` — `LIFEOS_OBJECT_REF_SOURCES` nambah 2
  entry baru: `financeAccount` (resolver/exists baca `D.accounts` apa
  adanya, TIDAK memanggil `recalcAccBalance()`) & `financeCategory`
  (resolver baca `D.categories.income` lalu `D.categories.expense`,
  hasil ditempel field `type:'income'|'expense'` non-destruktif supaya
  UI tahu array mana yg harus dibuka). Total domain terdaftar naik dari
  5 -> 7.
- `lifeos/ui/life-objects.js`:
  - `_refSourceItems(domain, filter)` — nambah case `financeAccount`
    (`{id,label}` dari emoji+name D.accounts) & `financeCategory`
    (gabungan D.categories.income + D.categories.expense, label ditandai
    "(Pemasukan)"/"(Pengeluaran)"). Parameter `filter` diabaikan kedua
    domain baru ini (belum ada kebutuhan produk, sama seperti domain
    goal/project/knowledge/review).
  - `_openRefLocal(domain, sourceId)` — nambah case `financeAccount`
    (reuse `openAccModal(idx)` yang SUDAH ADA, modules/finance/akun.js)
    & `financeCategory` (reuse `openCatModal(idx, type)` yang SUDAH ADA,
    modules/finance/kategori.js). Beda dgn `editTx(id)` (domain
    `finance`, terima id langsung), kedua modal lama ini terima INDEX
    array — jadi idx dicari dulu dari `D.accounts`/`D.categories[type]`
    via `sourceId` SEBELUM manggil modal, TIDAK mengubah signature modal
    lama.
  - `open()` — 0 perubahan (sudah generik, domain apa pun selain
    goal/project otomatis jatuh ke `_openRefLocal()`).
  - `promptCreateRef()` — 0 perubahan (domain picker sudah data-driven
    dari `Object.keys(LIFEOS_OBJECT_REF_SOURCES)`, jadi 2 domain baru
    otomatis muncul sbg pilihan tanpa kode tambahan; TIDAK ditambah
    builder filter step seperti finance Sesi 72 — belum ada keputusan
    produk utk itu di kedua domain baru ini).
- `lifeos-object-ref.js`, `life-object-service.js` — 0 perubahan (fully
  data-driven dari registry, tidak ada domain hardcoded di situ).

**Test:** +27 test baru — `tests/lifeos-object-ref.test.js` (+16:
resolve/exists/D-belum-load/D.accounts atau D.categories belum
ada/validate valid & invalid, utk `financeAccount` & `financeCategory`
masing2, plus update assert jumlah domain 5 -> 7) & `
tests/lifeos-life-objects-ui.test.js` (+11: `open()` sukses+gagal utk
kedua domain baru reuse `openAccModal`/`openCatModal`,
`_refSourceItems()` bentuk+kosong utk kedua domain,
`createRef()` sukses+gagal utk kedua domain — `load()` harness ditambah
param `openAccModal`/`openCatModal`).

**Regression:** 2566/2566 pass (naik dari 2539, 2x — sebelum & sesudah
build).

**Build:** `kw73-batch6-finance-account-category-1` (`?v=497`, naik dari
`?v=496`).

**Progress:** Batch 6 (Sesi 71-73) — Finance Domain Foundation +
builder filter transaksi + Finance Account & Finance Category
Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 6 (builder/filter di `financeAccount`/`financeCategory`,
Plugin Marketplace, atau kind Life Object baru selain `generic`/`ref`),
atau Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 74 (2026-07-20): Finance Intelligence Foundation (Batch 6)

**Konteks (retroaktif):** entri ini sempat tertinggal — sebelumnya file
ini langsung lompat dari Sesi 73 ke Sesi 75 tanpa mencatat Sesi 74,
padahal keputusan produk & implementasinya sudah lengkap di
`docs/PRODUCT_DECISIONS.md`/`docs/BATCH_PLAN.md`/`docs/PROJECT_STATE.md`.
Ditambahkan Sesi 75 sbg bagian sinkronisasi dokumentasi, 0 kode diubah
utk entri ini.

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 6 setelah Finance Account & Finance Category Foundation (Sesi 73)
— file baru `modules/finance/finance-intelligence.js`, lapisan agregasi
PURE (read-only) di atas service yang SUDAH ADA: `computeCashflowForecast()`
(`tx-list-cashflow.js`), `Budget.getUsed()`/`getEffectiveLimit()`
(`budget.js`), `totalSaldoAkun()` (`akun.js`), `totalDebtValue()`
(`pajak-aset-ui-wrappers.js`) — TIDAK ada rumus rata-rata/proyeksi/
pemakaian anggaran yang dihitung ulang.

**Implementasi:**
- `FinanceIntelligence.incomeVsExpense(range?)` — satu-satunya logic
  genuinely baru (agregasi income/expense per rentang tanggal eksplisit,
  default bulan berjalan lewat `_resolveRange()`).
- `cashflowSummary()` — wrapper tipis `computeCashflowForecast()` +
  `incomeVsExpense()` bulan berjalan.
- `budgetSummary(month?, year?)` — wrapper tipis `Budget.getUsed()`/
  `getEffectiveLimit()` per `D.budgets`.
- `healthScore()` — skor 0-100 komposit 4 komponen (savings rate/budget
  adherence/rasio utang thd saldo/proyeksi cashflow 30 hari), tiap
  komponen HANYA disertakan kalau service-nya tersedia (guard `typeof`),
  skor diskalakan ulang dari bobot yang tersedia.
- `insights()` — insight dasar derivatif dari 4 fungsi di atas — BUKAN
  duplikasi `FinCoach` (`modules-calc.js`), yang tetap widget Dashboard
  proaktif terpisah dgn state dismiss & domain di luar finance murni.
- `summary()` — satu pintu masuk gabungan ke-5 fungsi di atas.
- Didaftarkan ke `scripts/build.js` GROUP_B, setelah
  `pajak-aset-ui-wrappers.js` (dependency `totalDebtValue`) & sebelum
  `app-bootstrap.js`. TIDAK ada UI/panel/wiring baru sesi ini (murni
  fondasi data/service utk widget/AI briefing di sesi mendatang) —
  TIDAK mengubah struktur `D`.

**Test:** +17 test baru `tests/finance-intelligence.test.js` (pola sama
`tests/finance-predict.test.js` — dependency `computeCashflowForecast`/
`Budget`/`totalSaldoAkun`/`totalDebtValue` di-mock lewat `loadSource`
extraGlobals, isolasi murni per fungsi).

**Regression:** 2583/2583 pass (naik dari 2566, 2x — sebelum & sesudah
build).

**Build:** `kw74-batch6-finance-intelligence-foundation` (`?v=498`, naik
dari `?v=497`).

**Progress:** Batch 6 (Sesi 71-74) — Finance Domain Foundation +
builder filter transaksi + Finance Account & Finance Category
Foundation + Finance Intelligence Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan saat itu — lihat Sesi 75 di bawah utk
kelanjutannya (Finance Dashboard & AI Hook Foundation, keputusan
produk FINAL user).

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 75 (2026-07-20): Finance Dashboard & AI Hook Foundation (Batch 6)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 6 setelah Finance Intelligence Foundation (Sesi 74) — Finance
Dashboard Summary (Net Worth Card, Cash Flow Card, Budget Card,
Financial Health Card) + AI Hook, **100% reuse**
`FinanceIntelligence.summary()`, TIDAK ada rumus baru, TIDAK menghitung
ulang, TIDAK mengubah service/data/arsitektur — UI hanya presenter.

**Implementasi:**
- File baru `modules/finance/finance-dashboard.js` (`FinanceDashboard`):
  - `getAIHook()` — wrapper tipis read-only ke
    `FinanceIntelligence.summary()`, 0 transformasi. Guard `typeof
    FinanceIntelligence === 'undefined'` -> `{ok:false}` (pola sama
    `cashflowSummary()`/`budgetSummary()` di `finance-intelligence.js`
    sendiri).
  - `render()` — baca `#findashGrid`, panggil `getAIHook()`, render 4
    kartu presenter. Guard container tidak ada -> return diam2 (pola
    sama `EIEDashboard.render()`).
  - `_netWorthCard()` — SATU-SATUNYA pembacaan data di luar
    `summary()`: `totalSaldoAkun()`/`totalDebtValue()` (KEDUANYA fungsi
    yang SUDAH ADA & juga dipakai `FinanceIntelligence.healthScore()`
    sendiri, dipanggil ulang apa adanya — bukan duplikasi rumus, krn
    `summary()` tidak expose net worth mentah sbg field).
  - `_cashFlowCard()`/`_budgetCard()`/`_healthCard()` — murni
    memformat field `summary().cashflow`/`.budget`/`.healthScore` apa
    adanya (net/projected, totalUsed/totalLimit/overallPct/overCount,
    score/label) — 0 recompute.
- `modules/dashboard-hub/dashboard-hub.js` — `DashboardHub.render()`
  nambah `if(typeof FinanceDashboard!=='undefined')FinanceDashboard.render();`
  tepat setelah `DashboardHubAnalytics.render()`, sebelum
  `EIEDashboard.render()` (pola sama persis). `SECTION_GROUPS.insight`
  nambah `'findashWrap'` (bareng `lifeOSWrap`/`eieWrap`) — bukan tab
  baru.
- `modules/shared/modules-render.js` — live-wiring `renderDashboard()`
  nambah `if(typeof FinanceDashboard!=='undefined')FinanceDashboard.render();`
  di blok try/catch yang sama dgn `DashboardHubAnalytics`/`EIEDashboard`.
- `index.html`/`app_production.html` — container `#findashWrap`
  (`.dashhub-wrap card`) + `#findashGrid` (`.findash-grid`) ditambahkan
  tepat setelah `#eieWrap`, pola markup sama persis.
- `styles.css` — `.findash-grid`/`.findash-card`/`.findash-card-icon`/
  `-label`/`-val`/`-sub` baru, semua token (`--sp-*`/`--r-*`/`--fs-*`)
  & warna (`.green`/`.red`/`.orange`) REUSE yang sudah ada — 0 token/
  warna baru.
- `scripts/build.js` — GROUP_B nambah `modules/finance/finance-dashboard.js`,
  diletakkan setelah `finance-intelligence.js` (dependency) & sebelum
  `app-bootstrap.js`/`dashboard-hub.js` (konsumen).

**Test:** `tests/finance-dashboard.test.js` (BARU, 14 test) — pola sama
`tests/finance-intelligence.test.js` (dependency `FinanceIntelligence`/
`totalSaldoAkun`/`totalDebtValue`/`fmt` di-mock lewat `loadSource`
extraGlobals), DOM lewat `fakeDom` (pola sama
`tests/dashboard-hub-summary.test.js`): getAIHook ok/not-ok, render
guard container tidak ada, render tanpa FinanceIntelligence (empty
state), 4 kartu (Net Worth hijau/merah/fallback, Cash Flow ok/not-ok,
Budget normal/over-limit, Health score/label), render gabungan 4 kartu.

**Regression:** 2597/2597 pass (naik dari 2583, 2x — sebelum & sesudah
build).

**Build:** `kw75-batch6-finance-dashboard-ai-hook-1` (`?v=499`, naik
dari `?v=498`).

**Progress:** Batch 6 (Sesi 71-75) — Finance Domain Foundation +
builder filter transaksi + Finance Account & Finance Category
Foundation + Finance Intelligence Foundation + Finance Dashboard & AI
Hook Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 6 (builder/filter di `financeAccount`/`financeCategory`,
Plugin Marketplace, kind Life Object baru selain `generic`/`ref`, atau
wiring nyata `FinanceDashboard.getAIHook()` ke AI Daily Briefing/
`ai-chat.js`), atau Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 76 (2026-07-20): Vehicle Intelligence Foundation (Batch 7)

**Konteks (retroaktif):** entri ini sempat tertinggal — sebelumnya file
ini langsung lompat dari Sesi 75 ke Sesi 77 tanpa mencatat Sesi 76,
padahal keputusan produk & implementasinya sudah lengkap di
`docs/PRODUCT_DECISIONS.md`/`docs/BATCH_PLAN.md`/`docs/PROJECT_STATE.md`/
`docs/NEXT_SESSION.md`. Ditambahkan Sesi 77 sbg bagian sinkronisasi
dokumentasi, 0 kode diubah utk entri ini.

**Target (keputusan produk FINAL, eksplisit dari user):** target baru
Batch 7 (Batch 6 dianggap SELESAI SEMENTARA tanpa Batch Review formal,
lihat `docs/BATCH_PLAN.md` § Batch 7) — file baru
`modules/vehicle/vehicle-intelligence.js`, lapisan agregasi PURE
(read-only) di atas service yang SUDAH ADA: `getVehicleKm()`/
`fuelEfficiency()` (`vehicle-core.js`), `predictService()`/
`maintenanceForecast()` (`sparepart-servis.js`) — TIDAK ada rumus
KM/hari, konsumsi BBM, atau interval servis dihitung ulang. Pola SAMA
PERSIS `FinanceIntelligence` (Sesi 74), cuma dipindah ke domain vehicle.

**Implementasi:**
- `VehicleIntelligence.vehicleOverview(vehicleId)` — ringkasan 1
  kendaraan (KM/servis/BBM), `{ok:false}` kalau kendaraan tidak
  ditemukan.
- `healthScore(vehicleId)` — skor 0-100 komposit 2 komponen (service
  adherence dari status `predictService().items`, ketersediaan data
  BBM dari `fuelEfficiency()`) — HANYA komponen tersedia disertakan,
  skor diskalakan dari bobot yang tersedia.
- `fleetSummary()` — agregasi lintas SEMUA `D.vehicles` (total
  kendaraan, total servis lewat jatuh tempo, rata-rata healthScore
  armada) — satu-satunya logic genuinely baru selain skoring komposit.
- `insights(vehicleId?)` — fleet-level tanpa parameter atau
  per-kendaraan, BUKAN duplikasi rule `AIDecision` yang proaktif dgn
  cooldown.
- `summary(vehicleId?)` — satu pintu masuk gabungan.
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `finance-dashboard.js`, sebelum `app-bootstrap.js`. TIDAK ada
  Dashboard, TIDAK ada HTML/CSS, TIDAK ada AI Hook, TIDAK ada Reminder
  (eksplisit di luar scope sesi ini) — murni fondasi data/service,
  TIDAK mengubah struktur `D`.

**Test:** +17 test baru `tests/vehicle-intelligence.test.js` (pola sama
`tests/finance-intelligence.test.js` — dependency di-mock lewat
`loadSource` extraGlobals).

**Regression:** 2614/2614 pass (naik dari 2597, 2x — sebelum & sesudah
build).

**Build:** `kw76-batch7-vehicle-intelligence-foundation` (`?v=500`, naik
dari `?v=499`).

**Progress:** Batch 7 (Sesi 76) — Vehicle Intelligence Foundation
SELESAI & tertes.

**Next TODO:** Belum ditentukan saat itu — lihat Sesi 77 di bawah utk
kelanjutannya (Vehicle Dashboard Foundation, keputusan produk FINAL
user).

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 77 (2026-07-20): Vehicle Dashboard Foundation (Batch 7)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 7 setelah Vehicle Intelligence Foundation (Sesi 76) — implementasi
HANYA: `vehicle-dashboard.js`, DashboardHub wiring, HTML container, CSS
(reuse style yang ada), unit test, full regression, build, sinkronisasi
docs, ZIP release, verifikasi ZIP. WAJIB reuse `VehicleIntelligence`,
jangan duplicate logic, jangan membuat rumus baru, jangan ubah
service/data/arsitektur — UI hanya presenter. TIDAK mengerjakan
Reminder/AI Hook/fitur Vehicle lain.

**Implementasi:**
- File baru `modules/vehicle/vehicle-dashboard.js` (`VehicleDashboard`):
  - `getAIHook()` — wrapper tipis read-only ke
    `VehicleIntelligence.summary()` (fleet-level, TANPA `vehicleId`),
    0 transformasi. Guard `typeof VehicleIntelligence === 'undefined'`
    -> `{ok:false}` (pola sama persis `getAIHook()` `FinanceDashboard`).
  - `render()` — baca `#vehdashGrid`, panggil `getAIHook()`, render 3
    kartu presenter. Guard container tidak ada -> return diam2 (pola
    sama `FinanceDashboard.render()`). Guard tambahan:
    `fleet.totalVehicles === 0` -> empty state "Belum ada data
    kendaraan" (beda dari Finance krn `VehicleIntelligence.summary()`
    tidak punya field `ok` per-komponen — `fleetSummary()` selalu
    balik struktur valid meski `D.vehicles` kosong).
  - `_fleetCard()`/`_serviceCard()`/`_healthCard()` — murni memformat
    field `summary().fleet` apa adanya (totalVehicles/totalOverdue/
    avgHealth) — 0 recompute, 0 pembacaan `D` langsung (beda dari
    `FinanceDashboard._netWorthCard()` yang masih baca
    `totalSaldoAkun()`/`totalDebtValue()` langsung — di sini semua
    angka sudah tersedia lewat `fleet`).
- `modules/dashboard-hub/dashboard-hub.js` — `DashboardHub.render()`
  nambah `if(typeof VehicleDashboard!=='undefined')VehicleDashboard.render();`
  tepat setelah `FinanceDashboard.render()`, sebelum
  `EIEDashboard.render()` (pola sama persis). `SECTION_GROUPS.insight`
  nambah `'vehdashWrap'` (bareng `lifeOSWrap`/`eieWrap`/`findashWrap`)
  — bukan tab baru.
- `modules/shared/modules-render.js` — live-wiring `renderDashboard()`
  nambah `if(typeof VehicleDashboard!=='undefined')VehicleDashboard.render();`
  di blok try/catch yang sama dgn `FinanceDashboard`/`EIEDashboard`.
- `index.html`/`app_production.html` — container `#vehdashWrap`
  (`.dashhub-wrap card`) + `#vehdashGrid` (`.findash-grid`, class
  DIPAKAI ULANG APA ADANYA — TIDAK ada class baru) ditambahkan tepat
  setelah `#findashWrap`, pola markup sama persis.
- `styles.css` — **0 perubahan.** `.findash-grid`/`.findash-card*`
  (Sesi 75) di-reuse langsung krn strukturnya generik (grid kartu
  icon+label+value+sub), tidak perlu class/token baru.
- `scripts/build.js` — GROUP_B nambah `modules/vehicle/vehicle-dashboard.js`,
  diletakkan setelah `vehicle-intelligence.js` (dependency) & sebelum
  `app-bootstrap.js` (konsumen).

**Test:** `tests/vehicle-dashboard.test.js` (BARU, 12 test) — pola sama
`tests/finance-dashboard.test.js` (dependency `VehicleIntelligence`/
`escapeHtml` di-mock lewat `loadSource` extraGlobals), DOM lewat
`fakeDom` (pola sama `tests/dashboard-hub-summary.test.js`): getAIHook
ok/not-ok (+ verifikasi dipanggil tanpa `vehicleId`), render guard
container tidak ada, render tanpa VehicleIntelligence (empty state),
render totalVehicles 0 (empty state), 3 kartu (Total Kendaraan, Servis
hijau/merah, Health hijau/merah), render gabungan 3 kartu.

**Regression:** 2626/2626 pass (naik dari 2614, 2x — sebelum & sesudah
build).

**Build:** `kw77-batch7-vehicle-dashboard-foundation` (`?v=501`, naik
dari `?v=500`).

**Progress:** Batch 7 (Sesi 76-77) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring nyata `VehicleDashboard.getAIHook()`/
`FinanceDashboard.getAIHook()` ke AI Daily Briefing, builder/filter
picker `financeAccount`/`financeCategory`, Plugin Marketplace, kind
Life Object baru selain `generic`/`ref`), atau Batch Review kalau
tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 78 (2026-07-20): Vehicle Reminder Foundation (Batch 7)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 7 — implementasikan `vehicle-reminder.js`: Service Reminder, Tax
Reminder, Fuel Reminder, Reminder Summary API. Kerjakan sampai
implementasi, unit test, full regression, build — TANPA update docs/
buat ZIP di sesi yang sama (dipisah ke sesi lanjutan, lihat di bawah).

**Implementasi:**
- File baru `modules/vehicle/vehicle-reminder.js` (`VehicleReminder`),
  pola sama persis `vehicle-intelligence.js` (Sesi 76) — lapisan
  agregasi PURE (read-only, tidak menyentuh DOM/localStorage/save()):
  - `_vehicles(vehicleId)` — helper internal baca `D.vehicles` apa
    adanya, difilter ke 1 kendaraan kalau `vehicleId` diberikan (guard
    `typeof D`).
  - `serviceReminders(vehicleId?)` — reuse `predictService()` apa
    adanya. Item status `'aman'` TIDAK dijadikan reminder. status
    `'lewat'` => `severity:'overdue'`, status `'segera'` =>
    `severity:'due-soon'` — ambang ITU SENDIRI (sisaKm<=0 /
    sisaKm<=intervalKm*0.15) sudah dihitung di dalam `predictService()`,
    TIDAK dihitung ulang.
  - `taxReminders(vehicleId?)` — reuse `VEHTAX_ITEMS` (STNK Tahunan/
    Ganti Plat 5th/Uji Kelayakan) + `dateStatusBadge()`/
    `daysUntilDate()` (`vehicle-core.js`, SUDAH dipakai
    `checkAndFireReminders()`/`renderCnTab()`) — col `'red'` (lewat) =>
    `severity:'overdue'`, col `'orange'` (<=30 hari) =>
    `severity:'due-soon'`, col `'green'`/`''` TIDAK dijadikan reminder.
  - `fuelReminders(vehicleId?)` — SATU-SATUNYA logic genuinely baru
    sesi ini (belum ada versi murninya sebelumnya, sama seperti
    `fleetSummary()` di Sesi 76): estimasi jangkauan BBM dari
    rata-rata liter tiap pengisian Full Tank historis (`D.bbmLogs`
    difilter `fullTank`, pola filter SAMA PERSIS
    `estimateRpPerKm()`/`_vehicleFuelEfficiencyDropCheck()`) dikali
    `kmPerLiter` (reuse `fuelEfficiency()`), dibandingkan ke km yang
    sudah ditempuh sejak Full Tank terakhir (`getVehicleKm()` reuse).
    Ambang `'due-soon'` pakai rasio 15% SAMA PERSIS yang sudah dipakai
    `predictService()` (bukan ambang baru), `sisaKm<=0` =>
    `severity:'overdue'`. `estDateISO` reuse `estimateServiceDateISO()`
    (formula proyeksi generik, bukan spesifik servis) apa adanya. Kalau
    `fuelEfficiency()` tidak `ok` (data BBM kurang), balikin reminder
    `severity:'info'` dgn alasan dari `fuel.reason`. TIDAK ada field
    "kapasitas tangki" baru ditambahkan ke `D` (di luar scope
    Foundation) — jangkauan diestimasi murni dari histori liter Full
    Tank, bukan dari kapasitas tangki statis.
  - `summary(vehicleId?)` — Reminder Summary API, satu pintu masuk
    gabungan (dipakai widget/AI briefing masa depan, di luar scope
    sesi ini), murni memanggil 3 fungsi di atas + hitungan
    `overdueCount`/`dueSoonCount`/`infoCount`, TIDAK ada logic
    tambahan/pengurutan.
- `scripts/build.js` — GROUP_B nambah `modules/vehicle/vehicle-reminder.js`,
  diletakkan setelah `vehicle-dashboard.js` & sebelum `app-bootstrap.js`
  (pola sama persis penempatan `vehicle-intelligence.js`/
  `vehicle-dashboard.js` sebelumnya).
- TIDAK ada wiring ke `reminder-notif.js`/`checkAndFireReminders()`
  (yang nembak `Notification` browser), TIDAK ada UI/panel/dashboard
  card, TIDAK ada AI Hook — eksplisit di luar scope sesi ini (murni
  fondasi data/service, pola sama persis `vehicle-intelligence.js`
  Sesi 76 sebelum `vehicle-dashboard.js` Sesi 77 menyusul).

**Test:** `tests/vehicle-reminder.test.js` (BARU, 22 test) — pola sama
`tests/vehicle-intelligence.test.js` (dependency `predictService`/
`VEHTAX_ITEMS`/`dateStatusBadge`/`daysUntilDate`/`fuelEfficiency`/
`getVehicleKm`/`estimateServiceDateISO` di-mock lewat `loadSource`
extraGlobals): serviceReminders (belum dimuat, status aman/lewat/segera,
filter vehicleId, guard `ok:false` per kendaraan tidak menghentikan
kendaraan lain), taxReminders (dependency belum dimuat, tgl kosong,
overdue/due-soon/aman, beberapa jenis pajak sekaligus, filter
vehicleId), fuelReminders (fuelEfficiency tidak ok, tanpa log fullTank
valid, masih jauh dari batas, due-soon, overdue, filter vehicleId),
summary (gabungan 3 tipe + hitungan overdue/due-soon/info, tanpa
kendaraan sama sekali, vehicleId diteruskan konsisten). Catatan teknis:
array yang dibuat DI DALAM sandbox `vm` (hasil `[]`/`.map()` di source
`vehicle-reminder.js`) beda realm dari array host di file test —
`assert.deepEqual`/`deepStrictEqual` GAGAL membandingkannya meski
isinya sama (prototype `Array` beda realm), jadi assersi array kosong
pakai `.length===0`/`Array.isArray`, bukan `deepEqual([], [])` langsung
(pelajaran baru sesi ini, dicatat supaya tidak terulang di test
`vehicle`/`finance` lain yang mengembalikan array dari fungsi sandbox).

**Regression:** 2648/2648 pass (naik dari 2626, 2x — sebelum & sesudah
build).

**Build:** `kw78-batch7-vehicle-reminder-foundation` (`?v=502`, naik
dari `?v=501`).

**Progress:** Batch 7 (Sesi 76-78) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation SELESAI &
tertes penuh (implementasi/test/regression/build). Sinkronisasi
dokumentasi + ZIP release dikerjakan di kelanjutan sesi ini (lihat
`docs/CHECKPOINT.md`).

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleReminder.summary()` ke UI/notifikasi/AI
briefing, wiring `VehicleDashboard.getAIHook()`/
`FinanceDashboard.getAIHook()` ke AI Daily Briefing, builder/filter
picker `financeAccount`/`financeCategory`, Plugin Marketplace, kind
Life Object baru selain `generic`/`ref`), atau Batch Review kalau
tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 79 (2026-07-20): Vehicle AI Hook Foundation (Batch 7)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 7 setelah Vehicle Reminder Foundation (Sesi 78) —
`VehicleAIHook`, Fleet Summary API, Vehicle Insight API, Vehicle
Insight Presenter, integrasi ke Vehicle Dashboard. 100% reuse
`VehicleIntelligence` (Sesi 76) & `VehicleReminder` (Sesi 78), tanpa
rumus baru, tanpa duplicate logic, tanpa ubah struktur data/service,
UI presenter saja.

**Implementasi:**
- File baru `modules/vehicle/vehicle-ai-hook.js` (`VehicleAIHook`) —
  objek BARU (bukan pengganti `getAIHook()` milik
  `FinanceDashboard`/`VehicleDashboard`), 1 pintu masuk read-only
  gabungan Intelligence+Reminder:
  - `fleetSummary()` — Fleet Summary API, gabungan
    `VehicleIntelligence.summary()` + `VehicleReminder.summary()`
    (keduanya fleet-level, tanpa `vehicleId`), 0 transformasi.
    `{ok:false}` kalau `VehicleIntelligence`/`VehicleReminder` belum
    dimuat.
  - `vehicleInsight(vehicleId)` — Vehicle Insight API, gabungan
    `VehicleIntelligence.summary(vehicleId)` +
    `VehicleReminder.summary(vehicleId)` utk 1 kendaraan. Reuse
    `{ok:false}` dari `vehicleOverview()` (via field `.vehicle` di
    `summary(vehicleId)`) kalau kendaraan tidak ditemukan — TIDAK
    menduplikasi pengecekan.
- File baru `modules/vehicle/vehicle-insight-presenter.js`
  (`VehicleInsightPresenter`) — UI HANYA presenter, pola sama persis
  `VehicleDashboard.render()`, 100% reuse `VehicleAIHook.fleetSummary()`.
  3 kartu: Reminder Aktif (`reminder.total`), Reminder Lewat Jatuh
  Tempo (`reminder.overdueCount`), Reminder Segera Jatuh Tempo
  (`reminder.dueSoonCount`) — semua nilai dari `VehicleReminder.summary()`
  apa adanya (via `VehicleAIHook`). CSS 0 perubahan — reuse penuh
  `.findash-grid`/`.findash-card*`.
- Integrasi ke Vehicle Dashboard: container `#vehinsightWrap`/
  `#vehinsightGrid` ditambahkan `index.html` setelah `#vehdashWrap`
  (`app_production.html` disinkronkan otomatis oleh build), masuk grup
  sub-tab **insight** (`SECTION_GROUPS`, ditambahkan setelah
  `vehdashWrap`). Wired ke `DashboardHub.render()` (setelah
  `VehicleDashboard.render()`) & live-wiring `renderDashboard()`
  (`modules-render.js`), pola sama persis `VehicleDashboard.render()`.
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-reminder.js` (dependency), sebelum `app-bootstrap.js`
  (konsumen) — urutan: `vehicle-ai-hook.js` lalu
  `vehicle-insight-presenter.js`.

**Test:** +18 test baru — `tests/vehicle-ai-hook.test.js` (9 test,
pola sama `tests/vehicle-intelligence.test.js`) &
`tests/vehicle-insight-presenter.test.js` (9 test, pola sama
`tests/vehicle-dashboard.test.js`) — dependency di-mock lewat
`loadSource` extraGlobals, DOM lewat `fakeDom`.

**Regression:** 2666/2666 pass (naik dari 2648, 2x — sebelum &
sesudah build).

**Build:** `kw79-batch7-vehicle-ai-hook-foundation` (`?v=503`, naik
dari `?v=502`).

**Progress:** Batch 7 (Sesi 76-79) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleAIHook`/`FinanceDashboard.getAIHook()`
ke AI Daily Briefing, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life
Object baru selain `generic`/`ref`), atau Batch Review kalau tidak ada
target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap
tidak bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 80 (2026-07-20): Vehicle AI Dashboard Integration (Batch 7)

**Target (keputusan produk FINAL, eksplisit dari user):** lanjutan
Batch 7 setelah Vehicle AI Hook Foundation (Sesi 79) — integrasi
`VehicleAIHook` & `VehicleReminder` ke Dashboard Hub: Vehicle Daily
Brief, Vehicle Alert Panel, Vehicle Insight Feed. 100% reuse
`VehicleAIHook`/`VehicleReminder`/`VehicleIntelligence`, tanpa rumus
baru, tanpa duplicate logic, tanpa framework baru, tanpa ubah struktur
data/service, UI presenter saja.

**Audit singkat:** `VehicleAIHook`/`VehicleInsightPresenter` (Sesi 79)
sudah wired ke `DashboardHub.render()`/`renderDashboard()` tapi baru
sebatas angka ringkasan (3 kartu). Belum ada kartu "cerita" (briefing
1-2 kalimat, pola `AIDailyBriefingCard`), belum ada daftar item yang
butuh perhatian SEKARANG (pola `AIStatusCard`), belum ada feed insight
gaya list (pola `EIEInsightFeed`) — 3 kekosongan itu jadi target 3 file
baru sesi ini.

**Implementasi:**
- File baru `modules/vehicle/vehicle-daily-brief.js`
  (`VehicleDailyBrief`) — ringkasan 1-2 kalimat dari
  `VehicleAIHook.fleetSummary()` (total kendaraan, avgHealth,
  totalOverdue, reminder.total/overdueCount). Pola SILENT (body
  dikosongkan) sama persis `AIDailyBriefingCard` — hilang kalau 0
  kendaraan, bukan empty-state eksplisit.
- File baru `modules/vehicle/vehicle-alert-panel.js`
  (`VehicleAlertPanel`) — daftar reminder severity `'overdue'`,
  di-FILTER (bukan recompute) dari `VehicleAIHook.fleetSummary().reminder.all`.
  Pola SILENT sama persis `AIStatusCard` — hilang total kalau tidak ada
  item overdue.
- File baru `modules/vehicle/vehicle-insight-feed.js`
  (`VehicleInsightFeed`) — feed list gabungan
  `intelligence.insights` (fleet-level, dari `VehicleIntelligence.insights()`)
  + reminder severity `'due-soon'` (overdue TIDAK diulang di sini,
  sudah tanggung jawab `VehicleAlertPanel`), maks 8 item, pola tampilan
  sama persis `EIEInsightFeed` tapi SINKRON (bukan async) & tanpa link
  navigasi `rec.target` (di luar scope).
- Ketiganya 100% reuse `VehicleAIHook.fleetSummary()` — TIDAK ada
  pembacaan `D`/pemanggilan `VehicleIntelligence`/`VehicleReminder`
  langsung di file presenter (beda dari `VehicleDashboard` yang masih
  baca `totalSaldoAkun()`/`totalDebtValue()` — di sini 0 pembacaan
  tambahan sama sekali, konsisten `VehicleInsightPresenter`).
- Container `#vehBriefWrap`/`#vehAlertWrap`/`#vehInsightFeedWrap`
  ditambahkan `index.html` setelah `#vehinsightWrap`
  (`app_production.html` disinkronkan otomatis oleh build), masuk grup
  sub-tab **insight** (`SECTION_GROUPS`). Wired ke `DashboardHub.render()`
  (setelah `VehicleInsightPresenter.render()`) & live-wiring
  `renderDashboard()` (`modules-render.js`).
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-insight-presenter.js` (dependency `VehicleAIHook` sudah
  dimuat lebih awal), sebelum `app-bootstrap.js` — urutan:
  `vehicle-daily-brief.js`, `vehicle-alert-panel.js`,
  `vehicle-insight-feed.js`.

**Test:** +22 test baru — `tests/vehicle-daily-brief.test.js` (7),
`tests/vehicle-alert-panel.test.js` (7), `tests/vehicle-insight-feed.test.js`
(8) — pola sama `tests/vehicle-dashboard.test.js`, dependency di-mock
lewat `loadSource` extraGlobals, DOM lewat `fakeDom`.

**Regression:** 2688/2688 pass (naik dari 2666, 2x — sebelum & sesudah
build).

**Build:** `kw80-batch7-vehicle-ai-dashboard-integration` (`?v=504`,
naik dari `?v=503`).

**Progress:** Batch 7 (Sesi 76-80) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation + Vehicle AI Dashboard Integration SELESAI & tertes
penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleAIHook`/`FinanceDashboard.getAIHook()`
ke AI Daily Briefing lintas-domain, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life
Object baru selain `generic`/`ref`), atau Batch Review kalau tidak ada
target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap
tidak bisa dijalankan (tanpa akses internet di sandbox).

---

## Catatan kerja — Sesi 81 (2026-07-20): Vehicle Analytics Foundation (Batch 7)

**Target:** Vehicle Analytics Foundation, lanjutan Batch 7 setelah
Vehicle AI Dashboard Integration (Sesi 80) — Vehicle Trend API, Vehicle
Cost Summary, Fuel Trend Summary, Service Trend Summary, Vehicle
Analytics Presenter. 100% reuse `VehicleIntelligence`/`VehicleReminder`/
`VehicleAIHook`, tanpa rumus baru (selain SUM biaya historis per bulan),
tanpa duplicate logic, tanpa framework baru, tanpa ubah struktur
data/service, UI presenter saja.

**Implementasi:**
- File baru `modules/vehicle/vehicle-trend-api.js` (`VehicleTrendAPI`)
  — SATU-SATUNYA logic genuinely baru sesi ini: `monthlyCostTrend(
  {vehicleId, type, months})` men-SUM field `cost` yang SUDAH ADA di
  `D.bbmLogs`/`D.servisLogs` (diisi `tx-bbm.js`/`sparepart-servis.js`/
  `backup-restore.js`), dikelompokkan per bulan kalender ('YYYY-MM',
  default 6 bulan terakhir — bulan tanpa transaksi tetap muncul dgn
  total 0). Murni HISTORI aktual — TIDAK memprediksi/mengestimasi
  apa pun (beda dari `fuelEfficiency().estMonthlyCost`/
  `maintenanceForecast()` yang MEMPROYEKSIKAN masa depan). Label bulan
  reuse `MONTHS` (`helper-teks.js`) apa adanya.
- File baru `modules/vehicle/vehicle-cost-summary.js`
  (`VehicleCostSummary.summary(vehicleId?, months?)`) — 100% reuse
  `VehicleTrendAPI.monthlyCostTrend(type:'all')`, tambah derivasi ringan
  (rata-rata/bulan, arah tren naik/turun/tetap dari 2 bulan terakhir,
  breakdown total BBM vs total servis) — pola sama persis
  `insights()`/`healthScore()` di `VehicleIntelligence` (derivasi
  ambang ringan, bukan rumus baru berdiri sendiri).
- File baru `modules/vehicle/vehicle-fuel-trend.js`
  (`VehicleFuelTrendSummary.summary(vehicleId?, months?)`) — gabungan
  `VehicleTrendAPI.monthlyCostTrend(type:'fuel')` + (kalau `vehicleId`
  diberikan) `VehicleIntelligence.vehicleOverview(id).fuel` apa adanya
  utk efisiensi BBM saat ini (`kmPerLiter`/`rpPerKm`/`estMonthlyCost`,
  0 recompute). Tanpa `vehicleId`, `current` tetap `null` (bukan
  `{ok:false}` palsu — `fuelEfficiency()` per-desain memang
  per-kendaraan).
- File baru `modules/vehicle/vehicle-service-trend.js`
  (`VehicleServiceTrendSummary.summary(vehicleId?, months?)`) —
  gabungan `VehicleTrendAPI.monthlyCostTrend(type:'service')` +
  `VehicleReminder.serviceReminders(vehicleId?)` apa adanya utk daftar
  item servis aktif (overdue/due-soon) — 0 ambang baru,
  `overdueCount`/`dueSoonCount` dihitung dari `severity` yang sudah ada.
- File baru `modules/vehicle/vehicle-analytics-presenter.js`
  (`VehicleAnalyticsPresenter`) — UI HANYA presenter, 100% reuse
  `VehicleCostSummary.summary()` fleet-level (total/avgPerMonth/
  direction/totalFuel/totalService) + `VehicleIntelligence.
  fleetSummary()` (HANYA utk guard "belum ada kendaraan", pola sama
  persis `VehicleInsightPresenter`). 4 kartu: Total Biaya Kendaraan
  (N Bulan), Total Biaya BBM, Total Biaya Servis, Tren Biaya Bulan
  Terakhir (Naik/Turun/Tetap). CSS 0 perubahan — reuse penuh
  `.findash-grid`/`.findash-card*`.
- Container `#vehAnalyticsWrap`/`#vehanalyticsGrid` ditambahkan
  `index.html`/`app_production.html` setelah `#vehInsightFeedWrap`,
  masuk grup sub-tab **insight**. Wired ke `DashboardHub.render()`
  (setelah `VehicleInsightFeed.render()`) & live-wiring
  `renderDashboard()` (`modules-render.js`).
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-insight-feed.js`, sebelum `app-bootstrap.js` — urutan:
  `vehicle-trend-api.js`, `vehicle-cost-summary.js`,
  `vehicle-fuel-trend.js`, `vehicle-service-trend.js`,
  `vehicle-analytics-presenter.js`.

**Test:** +50 test baru — `tests/vehicle-trend-api.test.js` (12),
`tests/vehicle-cost-summary.test.js` (10),
`tests/vehicle-fuel-trend.test.js` (6),
`tests/vehicle-service-trend.test.js` (6),
`tests/vehicle-analytics-presenter.test.js` (16) — pola sama
`tests/vehicle-ai-hook.test.js`/`tests/vehicle-insight-presenter.test.js`,
dependency di-mock lewat `loadSource` extraGlobals, DOM lewat `fakeDom`.

**Regression:** 2738/2738 pass (naik dari 2688, 2x — sebelum & sesudah
build).

**Build:** `kw81-batch7-vehicle-analytics-foundation-1` (`?v=505`, naik
dari `?v=504`). Versi lama (`kw80-batch7-vehicle-ai-dashboard-
integration`) tidak diakhiri `-angka` (nama sesi terakhir yg jadi
label final Batch 7 sesi sebelumnya), jadi versi baru diberi manual
lewat `node scripts/build.js kw81-batch7-vehicle-analytics-foundation-1`
(bukan auto-increment) — sesuai instruksi error `computeNextVersion()`
sendiri.

**Progress:** Batch 7 (Sesi 76-81) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation + Vehicle AI Dashboard Integration + Vehicle Analytics
Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleAIHook`/`FinanceDashboard.getAIHook()`
ke AI Daily Briefing lintas-domain, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life
Object baru selain `generic`/`ref`, chart/grafik visual utk
`VehicleTrendAPI.monthlyCostTrend()` — Sesi 81 baru expose data
mentah+angka, BELUM ada visualisasi grafik), atau Batch Review kalau
tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap
tidak bisa dijalankan (tanpa akses internet di sandbox). Playwright/
smoke-test.js (browser-only) juga tidak bisa dijalankan di sandbox ini
— diganti verifikasi statis manual (grep bundle hasil build memuat
`VehicleTrendAPI`/`VehicleCostSummary`/`VehicleFuelTrendSummary`/
`VehicleServiceTrendSummary`/`VehicleAnalyticsPresenter`, id
`vehanalyticsGrid` cocok antara HTML & presenter, `docs/FILE-MAP.md`
ter-generate ulang mencakup 5 file baru).

## Catatan kerja — Sesi 82 (2026-07-20): Vehicle Decision Engine Foundation (Batch 7)

**Target:** Vehicle Decision Engine Foundation, lanjutan Batch 7 setelah
Vehicle Analytics Foundation (Sesi 81) — Vehicle Decision API,
Recommendation Engine, Priority Scoring, Action Recommendation, Decision
Presenter. 100% reuse `VehicleIntelligence`/`VehicleReminder`/
`VehicleAIHook`/Vehicle Analytics, tanpa menghitung ulang rumus, tanpa
duplicate logic, tanpa framework baru, tanpa ubah struktur data/service,
UI presenter saja.

**Implementasi:**
- File baru `modules/vehicle/vehicle-decision-api.js`
  (`VehicleDecisionAPI.context(vehicleId?)`) — 100% reuse
  `VehicleAIHook.fleetSummary()`/`.vehicleInsight(vehicleId)` (Sesi 79
  — sendiri sudah gabungan `VehicleIntelligence.summary()` +
  `VehicleReminder.summary()`), 0 rumus baru. Titik masuk TUNGGAL data
  mentah utk seluruh lapisan Decision Engine sesi ini — lapisan di
  bawahnya HANYA boleh baca lewat file ini, bukan panggil
  `VehicleAIHook`/`VehicleIntelligence`/`VehicleReminder` langsung.
- File baru `modules/vehicle/vehicle-recommendation-engine.js`
  (`VehicleRecommendationEngine.recommendations(vehicleId?)`) — 100%
  reuse `VehicleDecisionAPI.context()`. Logic-nya MEMILIH (filter, bukan
  recompute) item reminder severity `'overdue'`/`'due-soon'` (`'info'`
  dilewati) + insight type `'warning'` (`'info'`/`'positive'` dilewati),
  diseragamkan jadi 1 shape recommendation (`{id, source, type,
  vehicleId, vehicleName, severity, message}`). Dengan `vehicleId`, pakai
  `intelligence.vehicleInsights` (bukan `intelligence.insights` yg tetap
  fleet-level — lihat komentar `VehicleIntelligence.summary()`).
- File baru `modules/vehicle/vehicle-priority-scoring.js`
  (`VehiclePriorityScoring.score(recommendation)`/`.rank(recommendations)`)
  — SATU-SATUNYA "rumus" genuinely baru sesi ini: tabel bobot
  `SEVERITY_WEIGHT` (`overdue`=100, `warning`=60, `due-soon`=40, pola
  KOMPOSIT sama persis `VehicleIntelligence.healthScore()`) + pengurutan
  menurun (stable sort) berdasarkan skor itu. TIDAK ada ambang numerik
  baru atas data mentah — murni pemosisian 3 nilai severity yang SUDAH
  ADA jadi urutan bisnis (overdue = risiko langsung > warning = kondisi
  umum > due-soon = masih ada waktu bersiap).
- File baru `modules/vehicle/vehicle-action-recommendation.js`
  (`VehicleActionRecommendation.actionFor(recommendation)`/
  `.withAction(recommendations)`) — lookup teks aksi konkret
  `ACTION_MAP[type][severity]` (mis. `service`+`overdue` → "Jadwalkan
  servis sekarang"), murni presentasional, pola sama persis `_icon(type)`
  di `VehicleAlertPanel`/`_insightIcon(type)` di `VehicleInsightFeed`.
  Fallback `DEFAULT_LABEL` kalau kombinasi belum terdaftar (fail-safe,
  bukan throw).
- File baru `modules/vehicle/vehicle-decision-presenter.js`
  (`VehicleDecisionPresenter`) — UI HANYA presenter, 100% reuse pipeline
  `VehicleRecommendationEngine.recommendations()` →
  `VehiclePriorityScoring.rank()` → `VehicleActionRecommendation.
  withAction()`, 0 rumus baru di file ini. Daftar maks 5 rekomendasi
  berprioritas tertinggi, ikon per type + warna border per severity
  (token tema `var(--accent)`/`var(--accent2)`/`var(--accent4)` yang
  SUDAH ADA, TIDAK ada CSS baru). Pola SILENT-kalau-kosong sama persis
  `VehicleAlertPanel`/`VehicleInsightFeed`.
- Container `#vehDecisionWrap`/`#vehDecisionBody` ditambahkan
  `index.html`/`app_production.html` setelah `#vehAnalyticsWrap`, masuk
  grup sub-tab **insight**. Wired ke `DashboardHub.render()` (setelah
  `VehicleAnalyticsPresenter.render()`) & live-wiring `renderDashboard()`
  (`modules-render.js`).
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-analytics-presenter.js`, sebelum `app-bootstrap.js` — urutan:
  `vehicle-decision-api.js`, `vehicle-recommendation-engine.js`,
  `vehicle-priority-scoring.js`, `vehicle-action-recommendation.js`,
  `vehicle-decision-presenter.js`.
- **Bug pre-existing ditemukan & diperbaiki saat audit sebelum
  implementasi (di luar scope fitur baru, tapi additive/1-baris & langsung
  berdekatan):** `#vehAnalyticsWrap` (Sesi 81) terdokumentasi masuk
  `SECTION_GROUPS.insight` di `docs/BATCH_PLAN.md` tapi array
  `SECTION_GROUPS.insight` di `dashboard-hub.js` ternyata TIDAK pernah
  benar-benar memuatnya — diperbaiki bersamaan dgn menambahkan
  `vehDecisionWrap` ke array yang sama.
- `app_production.html` disinkronkan manual ke `index.html` sebelum test
  (pola wajib — kedua file harus identik, biasanya build.js yang menulis
  ulang otomatis di akhir build, tapi disamakan lebih awal di sesi ini
  supaya test parity HTML lolos SEBELUM build dijalankan, sesuai urutan
  Unit Test → Full Regression → Build di `docs/WORKFLOW.md`).

**Test:** +39 test baru — `tests/vehicle-decision-api.test.js` (5),
`tests/vehicle-recommendation-engine.test.js` (8),
`tests/vehicle-priority-scoring.test.js` (9),
`tests/vehicle-action-recommendation.test.js` (9),
`tests/vehicle-decision-presenter.test.js` (8) — pola sama
`tests/vehicle-ai-hook.test.js`/`tests/vehicle-analytics-presenter.test.js`,
dependency di-mock lewat `loadSource` extraGlobals, DOM lewat `fakeDom`.

**Regression:** 2777/2777 pass (naik dari 2738, 2x — sebelum & sesudah
build).

**Build:** `kw82-batch7-vehicle-decision-engine-foundation` (`?v=506`,
naik dari `?v=505`).

**Progress:** Batch 7 (Sesi 76-82) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation + Vehicle AI Dashboard Integration + Vehicle Analytics
Foundation + Vehicle Decision Engine Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleAIHook`/`FinanceDashboard.getAIHook()`
ke AI Daily Briefing lintas-domain, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life
Object baru selain `generic`/`ref`, chart/grafik visual utk
`VehicleTrendAPI.monthlyCostTrend()`, wiring `VehicleDecisionAPI`/
`VehicleRecommendationEngine` ke AI briefing/chat — Sesi 82 baru expose
recommendation+priority+action, BELUM ada wiring ke `ai-chat.js`), atau
Batch Review kalau tidak ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox). Playwright/
smoke-test.js (browser-only) juga tidak bisa dijalankan di sandbox ini
— diganti verifikasi statis manual (grep bundle hasil build memuat
`VehicleDecisionAPI`/`VehicleRecommendationEngine`/
`VehiclePriorityScoring`/`VehicleActionRecommendation`/
`VehicleDecisionPresenter`, id `vehDecisionWrap`/`vehDecisionBody` cocok
antara HTML & presenter, `docs/FILE-MAP.md` ter-generate ulang mencakup
5 file baru).

## Catatan kerja — Sesi 83 (2026-07-20): Vehicle Automation Foundation (Batch 7)

**Target:** Vehicle Automation Foundation, lanjutan Batch 7 setelah
Vehicle Decision Engine Foundation (Sesi 82) — Vehicle Automation API,
Smart Reminder Scheduler, Maintenance Automation, Tax & Document
Automation, Automation Presenter. 100% reuse `VehicleDecisionEngine`
(pipeline `VehicleRecommendationEngine`/`VehiclePriorityScoring`/
`VehicleActionRecommendation`, Sesi 82)/`VehicleReminder`/`VehicleAIHook`/
`VehicleIntelligence`, tanpa menghitung ulang rumus, tanpa duplicate
logic, tanpa framework baru, tanpa ubah struktur data/service, UI
presenter saja.

**Implementasi:**
- File baru `modules/vehicle/vehicle-automation-api.js`
  (`VehicleAutomationAPI.context(vehicleId?)`) — 100% reuse pipeline
  `VehicleRecommendationEngine.recommendations()` →
  `VehiclePriorityScoring.rank()` → `VehicleActionRecommendation.
  withAction()` (Sesi 82, sendiri sudah gabungan `VehicleDecisionAPI` →
  `VehicleAIHook` → `VehicleIntelligence`+`VehicleReminder`), 0 rumus
  baru. Titik masuk TUNGGAL data mentah utk seluruh lapisan Automation
  Foundation sesi ini — lapisan di bawahnya HANYA boleh baca lewat file
  ini, bukan panggil `VehicleRecommendationEngine`/`VehiclePriorityScoring`/
  `VehicleActionRecommendation` langsung (pola sama persis
  `VehicleDecisionAPI` terhadap `VehicleAIHook`).
- File baru `modules/vehicle/vehicle-reminder-scheduler.js`
  (`VehicleReminderScheduler.schedule(vehicleId?)`/`.summary(vehicleId?)`)
  — 100% reuse `VehicleAutomationAPI.context()`. SATU-SATUNYA "rumus"
  genuinely baru sesi ini: tabel lookup `SCHEDULE_MAP` (severity →
  {bucket,label} — `overdue`→`today`/"Segera (Hari Ini)", `warning`→
  `soon`/"Perlu Ditinjau", `due-soon`→`upcoming`/"Minggu Ini"), MURNI
  klasifikasi presentasional (pola sama persis `ACTION_MAP` di
  `VehicleActionRecommendation`/`SEVERITY_WEIGHT` di
  `VehiclePriorityScoring` — bukan ambang numerik baru, severity itu
  sendiri sudah final dari layer di bawahnya). `summary()` menghitung
  jumlah per bucket dari `schedule()`, 0 recompute field lain.
- File baru `modules/vehicle/vehicle-maintenance-automation.js`
  (`VehicleMaintenanceAutomation.tasks(vehicleId?)`/`.plan(vehicleId?)`)
  — 100% reuse `VehicleReminderScheduler.schedule()`. Logic-nya MEMILIH
  (filter, bukan recompute) item dengan `type === 'service'` saja, pola
  sama persis filter severity di
  `VehicleRecommendationEngine._fromReminders()`.
- File baru `modules/vehicle/vehicle-tax-document-automation.js`
  (`VehicleTaxDocumentAutomation.tasks(vehicleId?)`/`.plan(vehicleId?)`)
  — pola SAMA PERSIS `VehicleMaintenanceAutomation`, bedanya filter
  `type === 'tax'`.
- File baru `modules/vehicle/vehicle-automation-presenter.js`
  (`VehicleAutomationPresenter`) — UI HANYA presenter, 100% reuse
  `VehicleReminderScheduler.summary()` + `VehicleMaintenanceAutomation.
  plan()` + `VehicleTaxDocumentAutomation.plan()`, 0 rumus baru di file
  ini. 4 kartu ringkasan (Total Item Terjadwal, Segera (Hari Ini), Servis
  Terjadwal, Pajak/Dokumen Terjadwal) — reuse penuh class
  `.findash-grid`/`.findash-card*` (pola sama persis
  `VehicleAnalyticsPresenter`, BUKAN pola silent-kalau-kosong
  `VehicleAlertPanel`/`VehicleDecisionPresenter`, karena ini kartu angka
  ringkasan, bukan daftar item — kartu tetap tampil selama ada
  kendaraan). Guard "belum ada data kendaraan" via
  `VehicleIntelligence.fleetSummary().totalVehicles`, sama persis
  `VehicleAnalyticsPresenter`.
- Container `#vehAutomationWrap`/`#vehAutomationGrid` ditambahkan
  `index.html`/`app_production.html` setelah `#vehDecisionWrap`, masuk
  grup sub-tab **insight** (`SECTION_GROUPS.insight` di
  `dashboard-hub.js`). Wired ke `DashboardHub.render()` (setelah
  `VehicleDecisionPresenter.render()`) & live-wiring `renderDashboard()`
  (`modules-render.js`).
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-decision-presenter.js`, sebelum `app-bootstrap.js` — urutan:
  `vehicle-automation-api.js`, `vehicle-reminder-scheduler.js`,
  `vehicle-maintenance-automation.js`,
  `vehicle-tax-document-automation.js`, `vehicle-automation-presenter.js`.
- `app_production.html` disinkronkan manual ke `index.html` (identik,
  perubahan container ditambahkan ke kedua file sebelum test/build).

**Test:** +39 test baru — `tests/vehicle-automation-api.test.js` (5),
`tests/vehicle-reminder-scheduler.test.js` (10),
`tests/vehicle-maintenance-automation.test.js` (7),
`tests/vehicle-tax-document-automation.test.js` (7),
`tests/vehicle-automation-presenter.test.js` (10) — pola sama
`tests/vehicle-decision-api.test.js`/`tests/vehicle-recommendation-engine.
test.js`/`tests/vehicle-analytics-presenter.test.js`, dependency di-mock
lewat `loadSource` extraGlobals, DOM lewat `fakeDom`.

**Regression:** 2816/2816 pass (naik dari 2777, 2x — sebelum & sesudah
build).

**Build:** `kw83-batch7-vehicle-automation-foundation` (`?v=507`, naik
dari `?v=506`).

**Progress:** Batch 7 (Sesi 76-83) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation + Vehicle AI Dashboard Integration + Vehicle Analytics
Foundation + Vehicle Decision Engine Foundation + Vehicle Automation
Foundation SELESAI & tertes penuh.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleAIHook`/`FinanceDashboard.getAIHook()` ke
AI Daily Briefing lintas-domain, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life Object
baru selain `generic`/`ref`, chart/grafik visual utk
`VehicleTrendAPI.monthlyCostTrend()`, wiring `VehicleAutomationAPI`/
`VehicleReminderScheduler` ke notifikasi/AI briefing/chat — Sesi 83 baru
expose schedule+maintenance+tax automation, BELUM ada wiring ke
`reminder-notif.js`/`ai-chat.js`), atau Batch Review kalau tidak ada
target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox). Playwright/
smoke-test.js (browser-only) juga tidak bisa dijalankan di sandbox ini —
diganti verifikasi statis manual (grep bundle hasil build memuat
`VehicleAutomationAPI`/`VehicleReminderScheduler`/
`VehicleMaintenanceAutomation`/`VehicleTaxDocumentAutomation`/
`VehicleAutomationPresenter`, id `vehAutomationWrap`/`vehAutomationGrid`
cocok antara HTML & presenter, `docs/FILE-MAP.md` ter-generate ulang
mencakup 5 file baru).

## Catatan kerja — Sesi 84 (2026-07-20): Vehicle Dashboard Final Integration (Batch 7)

**Target:** Vehicle Dashboard Final Integration, lanjutan Batch 7 setelah
Vehicle Automation Foundation (Sesi 83) — menutup gap terakhir yang
tercatat eksplisit di `docs/BATCH_PLAN.md` Sesi 83: wiring
`VehicleReminder` (Sesi 78) ke notifikasi browser NYATA
(`reminder-notif.js` `checkAndFireReminders()`, yang SUDAH ADA & sudah
menembak notifikasi utk tagihan/LDR/pajak-kendaraan/SIM/SPT — tapi
Service Reminder & Fuel Reminder belum pernah menembak notifikasi
sungguhan sebelumnya). 100% reuse `VehicleReminder.serviceReminders()`/
`.fuelReminders()`, 0 ambang/rumus baru, 0 perubahan ke jalur notifikasi
pajak kendaraan yang sudah berjalan.

**Implementasi:**
- File baru `modules/vehicle/vehicle-notif-bridge.js`
  (`VehicleNotifBridge.items(vehicleId?, firedIds?)`) — lapisan
  penerjemah PURE (tidak pernah memanggil `fireNotif()`/`Notification`/
  `localStorage` sendiri), 100% reuse `VehicleReminder.serviceReminders()`/
  `.fuelReminders()` (Sesi 78) apa adanya. Mengambil HANYA item severity
  `'overdue'` (service+fuel), diterjemahkan jadi bentuk generik
  `{fireKey,title,body}` siap pakai pemanggil, difilter `firedIds`
  (dedupe hari yang sama, disuplai pemanggil dari `kw_notif_fired.ids`).
  `taxReminders()` SENGAJA TIDAK disertakan — jalur lama ad-hoc di
  `reminder-notif.js` (baca `D.vehicles`+`VEHTAX_ITEMS` langsung,
  mendahului `VehicleReminder`) sudah menembak notif pajak; menyertakannya
  lagi lewat modul ini akan dobel-tembak (fireKey format beda, tidak akan
  saling mendeteksi lewat `firedIds` yang sama). severity `'due-soon'`/
  `'info'` SENGAJA TIDAK ditembak jadi push notification, pola sama ambang
  tagihan/pajak yang sudah ada (hanya H-0 s/d lewat yang aktif tembak
  notif).
- `reminder-notif.js` `checkAndFireReminders()` — 1 blok baru ditambahkan
  setelah blok SPT Tahunan, SEBELUM `localStorage.setItem('kw_notif_fired'...)`:
  guard `typeof VehicleNotifBridge!=='undefined'`, panggil
  `VehicleNotifBridge.items(undefined, fired.ids)`, lalu `fireNotif()`
  tiap item + push `fireKey` ke `fired.ids` (pola identik blok
  tagihan/LDR/pajak-kendaraan/SIM/SPT yang sudah ada di file yang sama).
  TIDAK ada perubahan ke blok pajak kendaraan (`VEHTAX_ITEMS`) yang sudah
  ada — dibiarkan apa adanya, di luar scope sesi ini (resiko regresi kalau
  diubah, tanpa manfaat baru).
- Didaftarkan ke `scripts/build.js` GROUP_B setelah
  `vehicle-reminder.js`, sebelum `vehicle-ai-hook.js` (posisi
  `reminder-notif.js` sendiri di GROUP_B TIDAK dipindah — referensi
  `VehicleNotifBridge` di `checkAndFireReminders()` diresolusi saat
  FUNGSI DIPANGGIL, bukan saat file di-parse, jadi urutan load tetap aman
  walau `reminder-notif.js` secara fisik lebih dulu di bundle, pola sama
  persis referensi `VEHTAX_ITEMS`/`predictService` yang sudah ada di file
  yang sama sebelum sesi ini).
- TIDAK ada UI/panel/dashboard card baru, TIDAK ada perubahan
  `index.html`/`app_production.html` (sesi ini murni wiring
  service-ke-notifikasi, bukan lapisan presenter) — eksplisit di luar
  scope sesi ini.

**Test:** +10 test baru `tests/vehicle-notif-bridge.test.js` — pola sama
`tests/vehicle-ai-hook.test.js` (dependency `VehicleReminder` di-mock
lewat `loadSource` extraGlobals). Catatan teknis: 2 assersi awal sempat
gagal krn array hasil sandbox `vm` beda realm dari array host (pola sama
catatan `tests/vehicle-reminder.test.js` Sesi 78) — diperbaiki pakai
`.length===0`/`Array.from()` sebelum `deepEqual`, bukan `deepEqual([],[])`
langsung.

**Regression:** 2826/2826 pass (naik dari 2816, 2x — sebelum & sesudah
build).

**Build:** `kw84-batch7-vehicle-dashboard-final-integration` (`?v=508`,
naik dari `?v=507`).

**Progress:** Batch 7 (Sesi 76-84) — Vehicle Intelligence Foundation +
Vehicle Dashboard Foundation + Vehicle Reminder Foundation + Vehicle AI
Hook Foundation + Vehicle AI Dashboard Integration + Vehicle Analytics
Foundation + Vehicle Decision Engine Foundation + Vehicle Automation
Foundation + **Vehicle Dashboard Final Integration** SELESAI & tertes
penuh. Gap notifikasi nyata Service/Fuel Reminder (tercatat sejak Sesi
83) DITUTUP sesi ini.

**Next TODO:** Belum ditentukan — perlu keputusan produk user utk arah
lanjutan Batch 7 (wiring `VehicleDecisionAPI`/`VehicleRecommendationEngine`
ke `ai-chat.js`/AI Daily Briefing lintas-domain, builder/filter picker
`financeAccount`/`financeCategory`, Plugin Marketplace, kind Life Object
baru selain `generic`/`ref`, chart/grafik visual utk
`VehicleTrendAPI.monthlyCostTrend()`, insight-level Priority Scoring yang
menggabungkan faktor lain selain severity), atau Batch Review kalau tidak
ada target baru.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox). Playwright/
smoke-test.js (browser-only) juga tidak bisa dijalankan di sandbox ini —
diganti verifikasi statis manual (grep bundle hasil build memuat
`VehicleNotifBridge`, `checkAndFireReminders` memanggil
`VehicleNotifBridge.items`, `docs/FILE-MAP.md` ter-generate ulang
mencakup 1 file baru).

## Catatan kerja — Sesi 118 (2026-07-21): Cross Module Integration Hardening (Batch 13)

**Target:** S118 — BUKAN fitur baru. Hardening seluruh integrasi cross-domain
setelah dependency graph dinyatakan bebas cycle di S117 (lihat
tests/cross-module-graph-static.test.js). Scope: modules/cross/*,
DashboardHub, ai-chat.js, UnifiedSummaryAPI, CrossSummaryAPI, CrossAIHook,
UnifiedAIBriefing, LifeDashboardSummaryAPI, DecisionCenterAPI, ActionQueue,
RecommendationPanel.

**Audit:** Seluruh 17 file `modules/cross/*.js` dibaca ulang + wiring
`DashboardHub.render()` (dashboard-hub.js), live-wiring `renderDashboard()`
(modules/shared/modules-render.js), dan 3 jembatan baca `ai-chat.js`
(`unifiedBriefingChatContext()`/`recommendationPanelChatContext()`/
`actionQueueChatContext()`). Hasil: rantai
`CrossSummaryAPI -> CrossAIHook -> UnifiedSummaryAPI -> UnifiedAIBriefing ->
LifeDashboardSummaryAPI -> (PriorityEngine) -> DecisionCenterAPI ->
ActionQueue/RecommendationPanel` tetap DAG bersih (dikonfirmasi ulang test
S117 yang sudah ada), 0 dependency dua arah, 0 dead dependency di
`scripts/build.js` (semua 17 file cross terdaftar & terpakai).

**1 gap ditemukan (bukan siklus, bukan fitur hilang — murni wiring tidak
konsisten):** `DecisionCenterHome` (Recommendation Panel + Action Queue,
Sesi 90) dipanggil dari `DashboardHub.render()` (navigasi) TAPI TIDAK
disambungkan ke live-wiring `renderDashboard()` — beda dari 4 presenter
cross lain (`CrossDashboardCard`/`CrossInsightPresenter`/
`UnifiedBriefingPresenter`/`UnifiedDashboardHome`) yang SUDAH live sejak
Sesi 87-89. Akibat: Action Queue/Recommendation Panel tidak ikut ter-update
kalau user tetap di halaman Dashboard Hub lalu menyimpan data dari halaman
lain.

**Perbaikan (100% reuse, 0 API/formula/struktur data baru):**
- `modules/shared/modules-render.js` — 1 baris ditambahkan ke
  `renderDashboard()`: `if(typeof DecisionCenterHome!=='undefined')
  DecisionCenterHome.render();`, persis setelah `UnifiedDashboardHome.render()`
  (pola sama posisinya di `DashboardHub.render()`), + komentar penjelasan gap.

**Test (BARU):** `tests/cross-module-integration-hardening.test.js` (4 test)
— parity check statis generik (regex-parse source ASLI, bukan daftar
hardcode) antara `DashboardHub.render()` & `renderDashboard()` utk 5
entrypoint render cross-module (`CrossDashboardCard`/`CrossInsightPresenter`/
`UnifiedBriefingPresenter`/`UnifiedDashboardHome`/`DecisionCenterHome`),
ditambah cek 0 duplikasi wiring di kedua sisi. Test full-chain data (S116)
& DAG statis (S117) yang sudah ada TETAP dipakai apa adanya (0 perubahan)
— sudah mencakup item "integration test seluruh alur
CrossSummaryAPI→...→RecommendationPanel" (target #5 S118).

**Tidak diubah (eksplisit di luar/tidak perlu scope):** 0 kontrak API, 0
business logic, 0 struktur data D diubah di manapun — sesuai rule S118
("STOP & laporkan blocker" TIDAK terpicu, tidak ada kebutuhan mengubah
kontrak). `docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md` sempat berhenti
konsisten di Sesi 84/110 (gap dokumentasi lama, lihat catatan Backfill
S85-110) — TIDAK diisi retroaktif penuh sesi ini (di luar scope S118, yang
scope-nya hardening cross-module, bukan audit dokumentasi lintas-sesi).

**Regression:** 3322/3322 pass (naik dari 3318, 2x — sebelum & sesudah
build).

**Build:** `kw118-batch13-cross-module-integration-hardening` (`?v=535`,
naik dari `?v=534`).

**ZIP:** `kw_release_sesi118_batch13-cross-module-integration-hardening_v535.zip`
— dibuat & diverifikasi `unzip -t` ("No errors detected in compressed data").

**Next TODO:** Belum ditentukan — S118 murni hardening, tidak menambah
kandidat fitur baru. Kandidat lama Batch 7/12 (lihat `docs/NEXT_SESSION.md`)
tetap berlaku, semua masih butuh keputusan produk user.

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 119 (2026-07-21): Release Candidate Validation (Batch 13)

**Target:** S119 — TIDAK ADA fitur baru. Tahap validasi Release Candidate
Batch 13: memastikan seluruh perubahan Batch 13 (S111-S118: AI Daily
Briefing Integration, Unified Recommendation Panel Integration, ActionQueue
Public API Integration, Circular Dependency Hotfix, Dependency Graph
Verification, Cross Module Integration Hardening) siap dirilis. Scope:
seluruh modules/cross/*, DashboardHub, ai-chat.js, Finance, Vehicle,
UnifiedSummaryAPI, UnifiedAIBriefing, DecisionCenterAPI, ActionQueue,
RecommendationPanel.

**Checklist dijalankan:**
1. Audit dependency graph — `tests/cross-module-graph-static.test.js`
   (topological sort Kahn's algorithm atas SELURUH `modules/cross/*.js`)
   dijalankan ulang: DAG bersih, 0 circular dependency.
2. 0 circular dependency dikonfirmasi ulang (poin 1) + runtime chain test
   `tests/decision-center-dependency-graph.test.js` (rantai ASLI dimuat &
   dipanggil bersamaan, 0 stack overflow).
3. Seluruh unit test dijalankan: `node --test tests/*.test.js`.
4. Full regression dijalankan 2x (sebelum & sesudah build).
5. Audit build: `node scripts/build.js` sukses, lolos `node --check` di
   kedua bundle, versi konstanta tersinkron di 6 file source.
6. Audit bundle: seluruh 17 identifier modul cross (`CrossSummaryAPI` s/d
   `RecommendationPanel`) + 3 jembatan `ai-chat.js`
   (`unifiedBriefingChatContext`/`recommendationPanelChatContext`/
   `actionQueueChatContext`) dikonfirmasi ADA di `app-bundle-b.min.js`
   (grep count > 0, tidak ada yang hilang dari hasil build).
7. Audit wiring DashboardHub: diff terprogram `DashboardHub.render()`
   (dashboard-hub.js) vs `renderDashboard()` (modules-render.js) atas
   seluruh 29 entrypoint render — 100% paritas utk scope Finance/Vehicle/
   Cross (gap `DecisionCenterHome` dari S118 dikonfirmasi sudah tertutup;
   1 selisih tersisa, `LifeOSHome`, DI LUAR scope Batch 13 — track LifeOS
   terpisah, tidak disentuh).
8. Audit AI Chat: 3 jembatan baca (`unifiedBriefingChatContext`/
   `recommendationPanelChatContext`/`actionQueueChatContext`) diperiksa —
   perilaku benar (guard+try/catch+format apa adanya, 0 duplikasi), TAPI
   ditemukan `actionQueueChatContext()` (S115) belum pernah punya test
   wiring khusus (beda dari 2 saudaranya yang sudah sejak S111/S114) — gap
   coverage, BUKAN bug perilaku.
9. Audit Decision Center: `DecisionCenterAPI.summary()` — 0 perubahan,
   `tests/decision-center-api.test.js` tetap pass.
10. Audit Recommendation Panel: `getRecommendations()`/`render()` — 0
    perubahan, `tests/recommendation-panel.test.js` +
    `tests/recommendation-panel-chat-wiring.test.js` tetap pass.
11. Audit Action Queue: `getQueue()`/`render()` — 0 perubahan logic,
    `tests/action-queue.test.js` tetap pass; gap coverage poin 8 ditutup
    sesi ini (lihat di bawah).
12. Audit UnifiedAIBriefing: `generate()` — 0 perubahan, arsitektur "lapisan
    bawah root chain" (guard S116) tetap utuh (dikonfirmasi poin 1/2),
    `tests/unified-ai-briefing.test.js` tetap pass.
13. Seluruh integration test PASS — 3328/3328 (naik dari 3322).

**Bug ditemukan:** TIDAK ADA bug perilaku. 1 gap test-coverage ditemukan
(poin 8/11): `actionQueueChatContext()` (ai-chat.js, S115) tidak punya test
wiring khusus, berbeda dari `unifiedBriefingChatContext()`/
`recommendationPanelChatContext()` yang masing2 sudah (S111/S114). Ditutup
sesi ini murni sbg validasi (menambah test, 0 perubahan kode `ai-chat.js`
atau modul manapun) — 6 test baru mengonfirmasi fungsi SUDAH berjalan benar
(guard/try-catch/format/null-path semua sesuai pola saudaranya).

**File diubah:** HANYA `tests/action-queue-chat-wiring.test.js` (file test
BARU, 6 test). TIDAK ADA source code/API/business logic/struktur data yang
diubah — sesuai rule S119 ("Hanya bug fix kecil bila ditemukan"; di sini
tidak ada bug, hanya gap coverage yang ditutup).

**Regression:** 3328/3328 pass (naik dari 3322, 2x — sebelum & sesudah
build).

**Build:** `kw119-batch13-release-candidate-validation` (`?v=536`, naik
dari `?v=535`).

**ZIP:** `kw_release_sesi119_batch13-release-candidate-validation_v536.zip`
— dibuat & diverifikasi `unzip -t` ("No errors detected in compressed
data").

**Kesimpulan Release Candidate:** Batch 13 (S111-S119) **SIAP RILIS** — 0
circular dependency, 0 dead dependency, 0 duplikasi wiring, DashboardHub &
AI Chat konsisten pakai jalur data yang sama (single source per presenter),
seluruh integration test PASS.

**Next TODO:** Belum ditentukan — S119 murni validasi RC, tidak menambah
kandidat fitur baru. Menunggu keputusan produk user (mis. tutup Batch 13
resmi / Batch Review, atau target Batch 14 baru).

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — Sesi 120 (2026-07-21): Batch 13 Final Integration & Release (PENUTUP)

**Target:** S120 — PENUTUP Batch 13. Tidak ada fitur baru/refactor besar/
redesign. 4 target: Final Integration Audit, Final Regression, Final
Build, Final Release ZIP. Scope: seluruh modules/cross/*, DashboardHub, AI
Chat, Finance, Vehicle, UnifiedSummaryAPI, CrossSummaryAPI, CrossAIHook,
UnifiedAIBriefing, LifeDashboardSummaryAPI, DecisionCenterAPI,
RecommendationPanel, ActionQueue.

**Audit akhir (checklist):**
- Dependency graph bebas cycle — `tests/cross-module-graph-static.test.js`
  (DAG statis, topological sort) + `tests/decision-center-dependency-graph.test.js`
  (rantai runtime ASLI) dijalankan ulang, 32/32 pass, 0 cycle.
- Seluruh integration test PASS — termasuk
  `tests/cross-module-integration-hardening.test.js` (S118, parity
  DashboardHub/renderDashboard), `tests/action-queue-chat-wiring.test.js`
  (S119, gap coverage yg baru ditutup), `tests/recommendation-panel-chat-wiring.test.js`,
  `tests/unified-briefing-chat-wiring.test.js` — semua pass.
- Sapuan akhir modul in-scope (`finance-dashboard`/`vehicle-ai-hook`/
  `cross-ai-hook`/`unified-summary-api`/`priority-engine`/
  `decision-center-api`/`action-queue`/`recommendation-panel`/
  `unified-ai-briefing`) — 81/81 test pass, 0 regresi.
- 0 blocker kritis ditemukan — TIDAK ada perbaikan kode diperlukan sesi
  ini (Batch 13 sudah divalidasi tuntas di S118/S119, S120 murni
  konfirmasi ulang + build/release resmi penutup).

**Full Regression:** `node --test tests/*.test.js` → **3328/3328 pass**
(2x — sebelum & sesudah build, 0 fail).

**Final Build:** `node scripts/build.js kw120-batch13-final-integration-release`
→ sukses. Kedua bundle (`app-bundle-a.min.js`/`app-bundle-b.min.js`) lolos
`node --check` (dijalankan eksplisit ulang, bukan cuma lewat build.js).
`index.html` == `app_production.html` (dikonfirmasi `diff`, identik).
Versi naik `?v=536` → **`?v=537`** (`kw-cache-v537`). `docs/FILE-MAP.md`
ter-generate ulang otomatis oleh build.js (206 file, 1329 identifier
global) — konvensi project (build.js selalu regenerate file ini tiap
build sukses).

**Release ZIP:** `kw_release_sesi120_batch13-final-integration-release_v537.zip`
— seluruh working directory (kecuali `node_modules/`), TANPA folder
pembungkus (root ZIP = root project, sesuai `docs/ZIP_RULES.md`),
diverifikasi `unzip -t` ("No errors detected in compressed data").

**Kesimpulan penutup Batch 13:** Batch 13 (Sesi 111–120) **DITUTUP RESMI**
— AI Daily Briefing Integration, Unified Recommendation Panel Integration,
ActionQueue Public API Integration, Circular Dependency Hotfix (S116),
Dependency Graph Verification (S117), Cross Module Integration Hardening
(S118), Release Candidate Validation (S119), Final Integration & Release
(S120, sesi ini) — seluruh checklist rilis terpenuhi: 0 circular
dependency, 0 dead dependency, 0 duplikasi wiring, 0 bug kritis tersisa,
seluruh regression/integration test PASS, build naik & bersih.

**Next TODO:** Belum ditentukan — Batch 13 SELESAI. Menunggu keputusan
produk/roadmap user utk Batch 14 (target belum dipilih, JANGAN ditebak).

**Known Issue:** Tidak ada yang baru. `npm run lint`/esbuild tetap tidak
bisa dijalankan (tanpa akses internet di sandbox).

## Catatan kerja — 2026-07-21: Data Management Core — Backup History + Backup Health

Konteks: target sesi "Data Management Core", scope dibatasi HANYA 2 fitur:
Backup History & Backup Health.

**File baru:**
- `modules/shared/backup-history-api.js` — `BackupHistoryAPI`: pencatatan
  histori tiap proses backup (`D.backupHistory`, array baru, maks 50 entri
  terakhir, terbaru-dulu) + API baca murni (`list`/`latest`/`clear`/`summary`).
- `modules/shared/backup-health-api.js` — `BackupHealthAPI`: status
  kesehatan backup (`status()` — level never/ok/overdue, ambang 7 hari SAMA
  PERSIS dgn `checkBackup()` yang sudah ada) + `reliability()` (persentase
  sukses, derivatif dari `BackupHistoryAPI.summary()`).
- `modules/shared/backup-history-presenter.js` /
  `modules/shared/backup-health-presenter.js` — UI presenter murni (0 rumus
  baru), render ke `#backupHistoryList`/`#backupHealthCard` di card "💾
  Backup & Restore" (Pengaturan), dipanggil dari `renderSettings()`.

**File diubah:**
- `modules/shared/backup-restore.js` — 3 titik hook `BackupHistoryAPI.
  recordEntry()` (guard `typeof`), tepat di titik yang sudah menandai
  backup selesai (`D.lastBackup=...`) di `exportData()`/`runFullBackup()`/
  `runBackup()` — TIDAK ada perubahan logic backup itu sendiri.
- `modules/shared/modules-render.js` — 2 baris panggil
  `BackupHealthPresenter.render()`/`BackupHistoryPresenter.render()` di
  `renderSettings()`.
- `index.html` — 2 container baru (`#backupHealthCard`/`#backupHistoryList`)
  di card Backup & Restore.
- `styles.css` — kelas `.bh-*` (health card + row histori), murni additive.
- `scripts/build.js` — 4 file baru didaftarkan di `GROUP_B`, setelah
  `backup-restore.js`.

**Test baru (+50, 4 file baru):** `tests/backup-history-api.test.js` (18),
`tests/backup-health-api.test.js` (15), `tests/backup-history-presenter.test.js`
(9), `tests/backup-health-presenter.test.js` (7).

**Diverifikasi:** `node --test tests/*.test.js` → **3475/3475 pass, 0 fail**
(regresi penuh, 0 gagal). `node scripts/build.js
kw130-data-management-core-backup-history-health-1` → sukses, versi naik
`kw129-s129-dashboard-settings` → `kw130-data-management-core-backup-history-health-1`
(build #547), 3 lint-guard bawaan lolos, kedua bundle lolos `node --check`
sintaks, `index.html`/`app_production.html` identik, `FILE-MAP.md`
diregenerasi. Bundle TANPA minifikasi (esbuild tidak terpasang di sandbox
ini) — jalankan `npm install --save-dev esbuild` + `npm run lint` di lokal
sebelum rilis produksi (keterbatasan yang sama dgn hampir semua sesi
sebelumnya).

**Sengaja di luar scope sesi ini:** tombol "Bersihkan Histori Backup" (UI
utk `BackupHistoryAPI.clear()`), threshold overdue configurable (saat ini
hardcode 7 hari, sama dgn `checkBackup()`), smoke-test browser manual
(tidak ada browser di sandbox ini).

---

## Catatan kerja — Sesi 141 (2026-07-22): TASK-141 — Fuel Intelligence Card

**Target:** TASK-141 (READY) — Fuel Intelligence Card. Scope diminta:
Fuel Engine, Fuel Storage, Fuel Card, Fuel Modal, Fuel History, Fuel
Analytics. Exit criteria: Build PASS, Tests PASS, Dashboard terintegrasi.

**Audit sebelum implementasi:** ditemukan Engine/Storage/Modal/History/
Analytics BBM SUDAH ADA tersebar (`fuelEfficiency()`/vehicle-core.js,
`VehicleFuelTrendSummary`, `VehicleReminder.fuelReminders()`, `D.bbmLogs`,
`const BBM` di car-notes.js — modal tambah/edit + list + grafik SVG).
Sesuai `docs/IMPLEMENTATION_POLICY.md` (no-duplicate/100% reuse),
TASK-141 diinterpretasikan sbg lapisan agregasi BARU ("Fuel Intelligence
Card") yang menggabungkan semua itu jadi 1 kartu dashboard + modal
detail — bukan membangun ulang engine/storage yang sudah ada.

**Implementasi (6 file baru, `modules/vehicle/`):**
- `fuel-storage.js` — `FuelStorage`, accessor read-only tipis di atas
  `D.bbmLogs` (logs/sortedByDate/latest/recent/count per vehicleId). 0
  field baru di `D`.
- `fuel-intelligence-engine.js` — `FuelIntelligenceEngine`,
  `vehicleInsight(vehicleId)`/`fleetInsight()`: 100% reuse
  `VehicleFuelTrendSummary.summary()` + `VehicleReminder.fuelReminders()`
  + `FuelStorage`, 0 rumus baru.
- `fuel-history.js` — `FuelHistory.render(vehicleId)`, daftar 8 log BBM
  terbaru (`FuelStorage.recent()`), markup reuse class `tx-item` dari
  `BBM.renderList()`, tap baris buka `bbmModal` (`openBbmModal`, SUDAH
  ADA).
- `fuel-analytics.js` — `FuelAnalytics.render(vehicleId)`, kartu
  efisiensi (km/L, Rp/km, estimasi/bulan dari `trend.current` apa
  adanya) + bar tren biaya bulanan (dari `trend.rows[].total` apa
  adanya, width% murni tampilan).
- `fuel-modal.js` — `FuelModal.open(vehicleId?)`, orkestrasi tipis: isi
  judul, panggil `FuelAnalytics.render()`/`FuelHistory.render()`, lalu
  `openModal('fuelIntelModal')` (SUDAH ADA, reuse apa adanya).
- `fuel-card.js` — `FuelCard.render()`, kartu ringkas di Dashboard Hub
  tab Car Notes (kendaraan aktif `curVehicleId`), status warna dari
  reminders (merah=overdue, oranye=due-soon), CTA buka `FuelModal.open()`.

**File diubah:**
- `scripts/build.js` — 6 file baru didaftarkan di `GROUP_B`, setelah
  `vehicle-analytics-presenter.js`, sebelum `vehicle-decision-api.js`.
- `modules/shared/modules-render.js` — 1 baris panggil `FuelCard.render()`
  di `renderCnTab()`, setelah `VehicleAnalyticsPresenter.render()`.
- `modules/shared/modals.js` — 1 modal baru `fuelIntelModal` ditambahkan
  ke `MODAL_HTML`, setelah `bbmModal`.
- `index.html`/`app_production.html` — container baru `#fuelIntelWrap`/
  `#fuelIntelBody` di Dashboard Hub (`#page-carnotes`), setelah
  `#vehAnalyticsWrap`.

**Test baru (+26, 6 file baru):** `tests/fuel-storage.test.js` (7),
`tests/fuel-intelligence-engine.test.js` (5), `tests/fuel-card.test.js`
(5), `tests/fuel-history.test.js` (3), `tests/fuel-modal.test.js` (3),
`tests/fuel-analytics.test.js` (3). DOM-heavy (Card/History/Modal/
Analytics) dites lewat fake DOM minimal (stub `getElementById`), bukan
jsdom, sesuai catatan `helpers/loadSource.js`.

**Diverifikasi:** `node --test tests/*.test.js` → **95/95 pass, 0 fail**
(69 test lama di workspace bootstrap ini + 26 baru). `node scripts/build.js
kw-task141-fuel-intelligence-card-2` → sukses, versi naik 565→567 (2x
build selama sesi ini), 3 lint-guard bawaan lolos, kedua bundle lolos
`node --check` sintaks, `index.html`/`app_production.html` identik,
`FILE-MAP.md` diregenerasi. Bundle TANPA minifikasi (esbuild tidak
terpasang di sandbox ini).

**Dashboard terintegrasi:** ✅ — `FuelCard` tampil di Dashboard Hub tab
Car Notes (`renderCnTab()`), tap CTA buka `fuelIntelModal` berisi
`FuelAnalytics`+`FuelHistory`.

**Sengaja di luar scope sesi ini:** fleet-level card (multi-kendaraan
sekaligus — `FuelIntelligenceEngine.fleetInsight()` sudah ada tapi belum
dipakai UI manapun, kandidat lanjutan), field "kapasitas tangki" per
kendaraan (masih pakai estimasi rata-rata liter Full Tank historis, sama
seperti `VehicleReminder.fuelReminders()`), export/print riwayat BBM dari
modal (delegasi ke `bbmModal` yang sudah ada).

**Known Issue:** `npm run lint`/esbuild tetap tidak bisa dijalankan
(tanpa akses internet di sandbox ini), sama seperti sesi-sesi sebelumnya.

---

## Catatan kerja — Sesi 157 (2026-07-23): Split Nav Car Notes jadi 4 Tab

**Target:** Permintaan eksplisit user — halaman Car Notes (`#page-carnotes`)
terlalu panjang ke bawah (10 card AI/dashboard + fuel selalu tampil
sekaligus di atas tab BBM/Servis), beda dari pola Keuangan/Shop yang
sudah dipecah tab. User minta dipecah tab TAPI tetap multi-vehicle
(vehicle selector jangan hilang/kebawa masuk ke dalam tab tertentu).

**Implementasi (murni reorganisasi DOM + toggle visibility, 0 rumus/
render/logic baru — 100% reuse):**
- `index.html`/`app_production.html` — `#page-carnotes` dipecah jadi 4
  `cn-tabs` (pola sama persis `setKeuanganTab`, `#page-keuangan`):
  - `🧠 Insight AI` (`#cnTab-insight`, BARU) — `#vehdashWrap`/
    `#vehinsightWrap`/`#vehBriefWrap`/`#vehAttentionWrap`/
    `#vehAnalyticsWrap`/`#vehAutomationWrap`/`#vehSpecCard`, dipindah
    dari selalu-tampil di atas.
  - `⛽ BBM` (`#cnTab-bbm`, sudah ada) — ditambah 4 fuel card
    (`#fuelIntelWrap`/`#fuelDashWrap`/`#fuelCompareWrap`/
    `#fuelTrendWrap`) di atas konten BBM lama, dipindah dari tab Insight.
  - `🔧 Servis` (`#cnTab-servis`) — tidak berubah.
  - `🚦 Pajak & SIM` (`#cnTab-pajak`, BARU) — card Pajak Kendaraan & SIM,
    dipindah dari selalu-tampil di bawah `#vehSpecCard`.
  - Vehicle selector chip (`#vehicleSelect`) + Odometer (`#cnCurKm`)
    TETAP di luar/atas ke-4 tab (tidak dipindah sama sekali) — konteks
    "kendaraan mana yang aktif" tetap kelihatan & tetap ke-apply ke
    semua tab (multi-vehicle tidak berubah).
  - Periode chips (`#cnPeriodeChips`/`#cnCustomRange`) dibungkus
    `#cnPeriodeWrap` (BARU) — cuma tampil di tab bbm/servis (filter itu
    memang cuma dipakai `renderBbmList()`/`renderServisList()`).
  - FAB (`#carNotesFab`) — cuma tampil di tab bbm/servis (aksinya
    `openBbmModal()`/`openServisModal()`, tidak relevan di tab lain).
- `modules/vehicle/vehicle-core.js` — `setCnTab(t,el)` diperluas dari
  2 tab (`bbm`/`servis`) jadi 4 (`insight`/`bbm`/`servis`/`pajak`) +
  toggle visibility `#carNotesFab`/`#cnPeriodeWrap` sesuai tab aktif.
  `renderCnTab()` (modules-render.js) TIDAK disentuh — semua render()
  presenter tetap dipanggil apa adanya tiap render (data selalu fresh),
  murni DOM `u-dnone` yang berubah lewat `setCnTab()`.

**Default tab aktif:** `bbm` (sama seperti sebelumnya, `curCnTab='bbm'`
di `features-helpers-global-security.js`, tidak diubah) — supaya
perilaku default tidak berubah dari sudut pandang user existing.

**Diverifikasi:** `node --test tests/*.test.js` → **381/381 pass, 0
fail** (murni reorganisasi DOM, tidak ada test yang perlu diubah).
`node scripts/build.js kw157-mobil-nav-split-tab` → sukses, versi naik
596→597, 3 lint-guard bawaan lolos, kedua bundle lolos `node --check`
sintaks, `index.html`/`app_production.html` identik, `FILE-MAP.md`
diregenerasi.

**Sengaja di luar scope sesi ini:** grouping tab lain (mis. pisah
Servis jadi sub-tab lagi kalau ke depan makin panjang), badge/notif
count di tombol tab (mis. jumlah item "Perlu Perhatian" di tombol
Insight AI) — belum diminta eksplisit.

**Known Issue:** esbuild tetap tidak terpasang (sandbox tanpa internet),
bundle belum diminify, sama seperti sesi-sesi sebelumnya.

---

## Catatan kerja — Sesi 158 (2026-07-23): Bugfix — 6 card bocor tampil di semua tab Dashboard Hub

**Target:** Lanjutan analisa permintaan user ("dashboard hub masih panjang
kebawah") — Dashboard Hub sudah punya 4 sub-tab (Ringkasan/Fitur/Widget/
Insight) sejak 2026-07-17, tapi tetap terasa panjang di SEMUA tab.

**Root cause:** `#propertyManagementWrap`/`#rentalManagementWrap`/
`#assetPortfolioWrap`/`#assetMaintenanceWrap` (S101-104, Sesi 132) &
`#recommendationPanelWrap`/`#actionQueueWrap` (Sesi 90, Decision Center)
— container HTML-nya sudah ada & diisi render()-nya masing-masing lewat
`DashboardHub.render()`, tapi TIDAK PERNAH didaftarkan ke `SECTION_GROUPS`
(`applySectionTab()`, `dashboard-hub.js`) sejak split tab dibuat. Akibatnya
ke-6nya tidak pernah kena toggle `u-dnone` — selalu tampil di ke-4 tab
sekaligus, bocor keluar dari sistem tab.

**Fix (1 baris array, `modules/dashboard-hub/dashboard-hub.js`):** ke-6 id
ditambahkan ke grup `insight` (SECTION_GROUPS), sejalan tematik dgn isi
tab itu (Life OS, Kondisi Ekonomi, Cross Summary — semua card lintas-
domain). 0 render/logic/markup HTML disentuh — murni pendaftaran ke
mekanisme toggle yang sudah ada, jalan otomatis lewat `applySectionTab()`
yang sudah dipanggil tiap `DashboardHub.render()`.

**Diverifikasi:** `node --test tests/*.test.js` → **381/381 pass, 0
fail** (tidak ada test yang assert isi `SECTION_GROUPS` secara eksplisit,
`tests/dashboard-hub-goto-subtab.test.js` pakai fake DOM independen —
tidak terpengaruh). `node scripts/build.js
kw158-dashboard-hub-section-groups-fix` → sukses, versi naik 597→598,
3 lint-guard bawaan lolos, kedua bundle lolos `node --check` sintaks,
`index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi.
`keluarga-w-preview.html` diregenerasi ulang (`node scripts/
build-preview.js`) dari source `?v=598`.

**Sengaja di luar scope sesi ini:** audit ulang seluruh Dashboard Hub utk
kandidat "leak" serupa lainnya (sesi ini cuma verifikasi manual DOM
region antara `#eieWrap`→`#crossDashWrap` & `#lifePriorityWrap`→
`#dashboardHubPinnedWrap` tempat 6 id ini ditemukan — audit id lain di
luar 2 region itu belum dilakukan, kandidat sesi lanjutan kalau user
masih merasa panjang setelah fix ini).

---

## Catatan kerja — Sesi 173b (2026-07-23): Daftarkan 5 modal ke sweep test (coverage 91/91)

**Target:** Hasil "Tes Buka/Tutup Modal" user lapor 1 bermasalah — 5 modal
ada di halaman tapi belum terdaftar ke sweep manapun: `fuelIntelModal`,
`billMultiScanModal`, `universalOcrModal`, `fuelBarCorrectionModal`,
`fuelTankProfileModal`.

**Fix (`self-test.js`, `MODULE_METHOD_MODAL_SPECS`):** 5 entri baru.
`FuelModal.open()`/`FuelBarCorrection.open()`/`FuelTankProfileUI.open()`
dipanggil dgn `D.vehicles[0].id` (pola sama openers kendaraan lain yg
sudah ada) — kalau belum ada profil tangki/kendaraan, otomatis kena
`needsContext` (wajar, sama seperti 9 modal lain). `BillMultiScan`/
`UniversalScan` alur aslinya nunggu file input (`onchange`), tidak bisa
disimulasikan sweep tanpa file sungguhan — dipanggil `openModal()`/
`closeModal()` langsung (bypass alur OCR, pola sama `openWaShare()` di
`RISKY_OPENER_SPECS`), sweep memang cuma cek mekanika buka/tutup overlay.

**Diverifikasi:** `node --test tests/*.test.js` → **447/447 pass, 0
fail**. `node scripts/build.js` → sukses, versi naik 628→629, 3
lint-guard bawaan lolos, kedua bundle lolos `node --check` sintaks,
`index.html`/`app_production.html` identik, `FILE-MAP.md` diregenerasi.

**Known Issue:** esbuild tetap tidak terpasang, bundle belum diminify.

---

## Catatan kerja — Sesi 262 (2026-07-26): Selective Liquid Glass + M3 Expressive UI refresh

**Target:** Implementasi arah UI (M3 Expressive + Selective Liquid Glass,
floating nav tanpa FAB, palet netral kalem) yang sudah disepakati lewat
preview interaktif di percakapan sebelumnya, ke file project nyata.

**Perubahan:** `modern-ui-layer.css` (floating `.nav` + safe-area, fix
token mati `--surface1`→`--header-bg`, fix kontras WCAG AA badge stok di
6 tema terang via `color-mix`), file baru `nav-scroll.js` (auto-hide nav
saat scroll, mandiri), file baru `preview-m3-liquidglass.html` (preview
pakai CSS/JS project asli + theme switcher 10 tema).

**Scope:** CSS-only + 1 JS berdiri sendiri. TIDAK menyentuh
`app-bundle-a/b.min.js`/modul bisnis — 0 resiko regresi ke test suite
JS yang ada. Test suite tidak dijalankan ulang sesi ini (tidak ada logic
bisnis yang berubah untuk diverifikasi).

**Known Issue:** perilaku scroll-aware nav belum punya test otomatis
(di luar cakupan harness `vm` sandbox yang ada, murni DOM+scroll
browser) — verifikasi manual via `preview-m3-liquidglass.html`.

---

## Catatan kerja — Sesi 308 (2026-07-27): Fix Aset/Personal terpotong di kartu "Semua Fitur" Dashboard Hub

**Target:** User lapor (screenshot) kategori "Aset" & "Personal" di kartu
collapse "🗂️ Semua Fitur" Dashboard Hub terpotong/hilang tanpa scrollbar
saat kategori sebelumnya (mis. Pajak & Zakat) dibuka bersamaan.

**Root cause:** `#dashHubMainGrid-cbody` (wrapper `.card-collapse-body`
yang membungkus SELURUH `FEATURE_REGISTRY`, 10 kategori — lihat
`dashboard-hub-registry.js`) memakai rule generik
`.card-collapse-body{overflow:hidden;max-height:2000px}` di `styles.css`.
Kalau beberapa kategori dibuka bersamaan, total tinggi gabungan semua
kategori gampang lebih dari 2000px -> sisanya (kategori Aset lanjutan/
Personal dst yang urutannya di bawah) KEPOTONG TANPA SCROLLBAR — bug
class yang sama persis yang sudah pernah difix untuk `#bbmList`/`#allTx`
dkk (lihat komentar BUGFIX existing di `styles.css` ~baris 686-701),
cuma belum pernah diterapkan ke wrapper kategori Dashboard Hub ini.

**Fix (CSS-only, additive):** override `#dashHubMainGrid-cbody{max-height:
20000px}` di `styles.css` — jauh di atas kemungkinan total tinggi
gabungan 10 kategori sekaligus terbuka. Beda dari `#bbmList` dkk (yang
dikasih scroll internal sendiri): di sini TIDAK dikasih scroll internal
krn tiap kategori sudah collapsible sendiri-sendiri, jadi cukup naikkan
cap parent-nya. 0 perubahan HTML/JS, 0 kategori/fitur baru.

## Test

`node --test tests/*.test.js` -> **1593/1593 pass, 0 fail** (tidak ada
test baru — perubahan murni CSS, tidak ada logic yang perlu ditest).

## Build

`bump-version.sh 820` -> sukses, versi naik 819→820 di
index.html/app_production.html/sw.js (styles.css tidak lewat
`build.js` krn bukan file JS/bundle).

## ZIP

`kw_release_sesi308_dashhub-aset-personal-clip-fix_v820.zip` — dibuat &
dikirim ke user.

---

## Catatan kerja — Sesi 309 (2026-07-27): Fix scan "Detail Portofolio" Bibit tidak kebaca + field dinamis investasi di Akun

**Target:** User lapor (screenshot Bibit) scan "Update Saldo Akun" gagal
total ("Nominal tidak ditemukan") utk layar "Detail Portofolio" per-
instrumen (dibuka tap 1 reksa dana/saham), plus minta field dinamis
(Modal Investasi/Nilai Investasi/Keuntungan dll) bisa ikut kebaca ke akun.

**Root cause:** `detectScreenTypeScores()` (`modules/shared/scan-ocr.js`)
cuma kenal layar Bibit lewat kata kunci di banner ringkasan atas ("Nilai
Portofolio .../Imbal Hasil"/dst). Layar "Detail Portofolio" per-instrumen
TIDAK PUNYA banner itu (cuma kartu 1 instrumen: Nilai Sekarang/Modal
Investasi/Harga Beli/Total Unit) -> `detectScreenType()` return `null` ->
`UniversalScan.scan()` tidak dapat parser sama sekali -> "Nominal tidak
ditemukan", BUKAN cuma `parseBibitScreen()` yang gagal baca nominalnya.
Tambahan: label unit di layar ini "Total Unit" (bukan "Jumlah Unit" spt
halaman Bibit lain) -- tidak match regex lama sama sekali.

**Fix (additif):**
- `detectScreenTypeScores()`: fingerprint baru (Modal Investasi + Nilai
  Sekarang/Saat Ini + Jumlah/Total Unit sekaligus) -> `bibit` — spesifik
  ke kartu instrumen Bibit, tidak overlap ke bank/wallet/jago_pocket.
- `parseBibitScreen()`: fallback ke "Nilai Sekarang" sbg nominal kalau
  banner ringkasan tidak ketemu, PLUS ekstrak `detail` (Modal Investasi/
  Keuntungan [terima nilai negatif utk rugi]/Harga Beli/Jumlah Unit) —
  field dinamis, cuma ada kalau parser Bibit berhasil membacanya.
- `PORTFOLIO_LABELS.jumlahUnit` (`modules/asset/aset.js`, dipakai scan
  Aset): terima juga "Total Unit" (dulu cuma "Jumlah Unit").
- `UniversalScan` (item mapping/preview/`importSelected()`): `detail`
  dibawa dari parser ke preview checklist (ditampilkan read-only) lalu
  ditulis ke akun tujuan sbg `account.investDetail` (field OPSIONAL,
  akun tanpa hasil scan investasi tidak punya field ini sama sekali).
- `renderAccGrid()` (`modules/shared/modules-render.js`): tampilkan
  `investDetail` (Modal/Untung-Rugi/jumlah unit) di kartu akun kalau ada
  — 0 perubahan tampilan utk akun tanpa field ini.

**Scope:** tidak ada perubahan skema akun WAJIB (investDetail optional,
backward compatible, akun lama tanpa field ini tetap jalan normal).

## Test

7 test baru `tests/scan-ocr-bibit-detail.test.js` (detectScreenType utk
layar Detail Portofolio, parseBibitScreen fallback+detail+keuntungan
negatif, 0 regresi ke pola lama). `node --test tests/*.test.js` ->
**1600/1600 pass, 0 fail** (naik dari 1593).

## Build

`node scripts/build.js s308-bibit-detail-scan-invest-detail` -> sukses,
3 lint-guard bawaan lolos, kedua bundle lolos `node --check`, versi naik
820→821, `index.html`/`app_production.html` identik, `FILE-MAP.md`
diregenerasi.

## ZIP

`kw_release_sesi309_bibit-detail-scan-invest-detail_v821.zip` — dibuat &
dikirim ke user.

## Catatan kerja — Sesi 310 (2026-07-29): Bugfix ScannerSession nyangkut aktif selamanya (self-healing guard)

**Bug:** `ScannerSession` (kunci exclusive mode scanner, `modules/shared/
scanner-session.js`) bisa nyangkut `_active=true` PERMANEN kalau proses
tutup kamera terputus di tengah jalan (app di-minimize pas prompt izin
kamera muncul, tab di-suspend browser, dll) — `finally{}` di Scanner Engine
(vehicle-scanner.js/sparepart-scanner.js) tidak sempat jalan sampai selesai,
`ScannerSession.exit()` tidak pernah terpanggil, TAPI overlay
`.vehicle-scanner-fullscreen`-nya sudah lenyap dari DOM lebih dulu. Akibat:
class `body.scanner-session-active` nempel permanen -> CSS suppression
(`_scannerSessionEnsureStyle()`) men-`display:none` SEMUA `.overlay`/
`.qs-modal-overlay`/`.calc-overlay`/`.keu-fab`/`#toast` selamanya, dan
`isActive()` selalu `true` -> scan berikutnya ditolak terus ("Scanner lain
sedang aktif") tanpa jalan keluar selain reload penuh.

**Fix (additif, 0 API publik berubah):** self-healing guard di
`scanner-session.js`. `_scannerSessionHasLiveOverlay()` cek fisik
`document.querySelector('.vehicle-scanner-fullscreen')` (class overlay SAMA
PERSIS dipakai VehicleScanner & SparepartScanner). `_scannerSessionSelfHeal()`
— kalau `_scannerSessionActive` bilang `true` tapi overlay itu sudah tidak
ada -> reset paksa PENUH (counter ke 0, flag ke `false`, `resumeUI()`, class
body dilepas), sama seperti exit() normal. Dipanggil di 2 titik: awal
`scannerSessionIsActive()` (titik yang dicek pemanggil SEBELUM buka scanner
baru, lihat guard "Scanner lain sedang aktif" di vehicle-scanner.js/
sparepart-scanner.js) & awal `scannerSessionEnter()` (jaring pengaman kedua).
Konservatif: kalau `document.querySelector` tidak tersedia (browser
lama/environment lain), TIDAK memaksa reset — anggap overlay masih ada
(tidak mau sok tahu menutup sesi yang mungkin beneran masih aktif).

**Scope:** tidak menyentuh Scanner Engine (vehicle-scanner.js/
sparepart-scanner.js) maupun urutan enter()/exit() yang sudah ada — murni
guard tambahan di titik cek status.

## Test

7 test baru di `tests/scanner-session.test.js` (overlay masih ada -> tidak
direset; overlay lenyap -> self-heal reset+return false; class body
dilepas; enter() baru sesudah self-heal jalan normal (bukan dianggap nested
enter()); guard konservatif tanpa `querySelector`; flag sudah false dari
awal -> no-op). Fake DOM `makeDocument()` ditambah `querySelector()` (default
`overlayLive:true` supaya 0 regresi ke test lama). `node --test
tests/*.test.js` -> **1753/1753 pass, 0 fail** (naik dari 1746).

## Build

`node scripts/build.js s310-scanner-session-self-healing-guard` -> sukses,
3 lint-guard bawaan lolos, kedua bundle lolos `node --check`, versi naik
876→880 (build dijalankan ulang sekali lagi setelah update dokumen ini
sendiri), `index.html`/`app_production.html` identik, `FILE-MAP.md`
diregenerasi.

## ZIP

`kw_release_sesi310_scanner-session-self-healing-guard_v880.zip` — dibuat &
dikirim ke user.

# Sesi 323 (2026-07-30) — Cicilan/tagihan sudah dibayar periode ini ikut tab Lunas + navigasi ‹bulan› di Daftar Transaksi

## Konteks

Laporan user (bahasa santai): pastikan cicilan & "bayar bulan depan" (bayar
di muka sebelum jatuh tempo) yang sudah dibayar sesuai tanggal ikut masuk
ke tab "✅ Lunas" (fitur split tab Bayar/Lunas dari Sesi 322), dan tambah
filter navigasi bulan (‹›, klik kiri mundur/klik kanan maju — sama seperti
pola yang sudah ada) di kartu "📋 Semua Transaksi" (Daftar Transaksi, tab
Kelola). Diklarifikasi via 3 pertanyaan ke user sebelum coding (channel
chat) karena permintaan aslinya ambigu:
1. Entri "sudah dibayar" tetap tampil di KEDUA tab (Bayar & Lunas)
   selama tagihannya sendiri masih aktif (belum lunas total) — bukan
   dipindah penuh.
2. "Bayar bulan depan" = bayar di muka sebelum tanggal jatuh tempo.
3. Filter bulan Daftar Transaksi = navigasi ‹› per bulan (bukan dropdown).

## Perubahan

- **`modules/finance/tagihan-kalender.js`**: fungsi baru
  `getBillPaidThisPeriodInfo(b)` — cek histori pembayaran TERBARU
  (`D.transactions` dgn `billLinkId===b.id`) dicocokkan ke PERIODE
  SEKARANG (bulan/tahun/minggu berjalan sesuai `b.freq`), BUKAN ke
  `b.nextDue` (karena `nextDue` sudah kadung dimajukan oleh
  `markBillPaid()`) — supaya pembayaran di muka ("bayar bulan depan")
  tetap terdeteksi sbg "sudah dibayar periode ini". Selalu `null` utk
  `freq==='sekali'` (begitu dibayar langsung pindah ke `D.billsArchive`,
  tidak pernah nyangkut di `D.bills` lagi).
- **`modules/shared/modules-render.js`** (`renderBillList()`): tagihan
  aktif yang lolos `getBillPaidThisPeriodInfo()` ditambahkan sbg ENTRI
  KEDUA (duplikat, `_paidPeriodOnly:true`, `_lunas:true`) khusus tampil
  di tab Lunas — entri ASLI-nya (`_lunas:false`) TETAP ada & tetap tampil
  normal di tab Bayar (0 perubahan ke tab Bayar). `renderBillItemHtml()`:
  badge/label/tombol aksi dibedakan utk `_paidPeriodOnly` (badge "✅
  Dibayar" bukan "✅ Lunas", tombol aksi tetap versi AKTIF —
  `markBillPaid` diganti `openBillHistory`+Edit — supaya tidak salah
  rute ke logic arsip yg akan gagal cari record di `D.billsArchive`).
  Variabel `isArchived` (`b._lunas&&!b._paidPeriodOnly`) menggantikan
  semua pengecekan `b._lunas` polos yg sebelumnya berarti "arsip
  permanen" (opacity kartu, progress cicilan, anomaly badge, tombol
  aksi) — 0 perubahan perilaku utk entri arsip asli.
  `renderKeuangan()`: tambah sinkron `#txListMonthLabel` (guard elemen)
  bareng `#monthLabel` yang sudah ada.
- **`modules/finance/tx-list-cashflow.js`**: fungsi baru
  `changeTxListMonth(dir)` — reuse `curMonth`/`curYear` yang SAMA
  dgn `changeMonth()` (month-nav Ringkasan, 1 sumber kebenaran periode
  bulan berjalan), paksa `txListPeriode='bulan'` + sinkron chip aktif,
  lalu `resetTxPageAndRender()`.
- **`index.html`** (`app_production.html` ikut disalin build.js): tambah
  blok `.month-nav` (‹ `#txListMonthLabel` ›, `data-action="changeTxListMonth"`)
  di kartu "📋 Semua Transaksi", + `id="txListPeriodeChipBulan"` di chip
  "Bulan Ini" (dipakai `changeTxListMonth` utk sinkron status aktif).

## Test

7 test baru `tests/bill-paid-this-period.test.js` (`getBillPaidThisPeriodInfo`
— cicilan bulanan baru dibayar, bayar di muka/bulan depan, belum pernah
dibayar, dibayar bulan lalu, freq sekali selalu null, transaksi billLinkId
lain diabaikan, freq tahunan/mingguan). `renderBillList()`/
`renderBillItemHtml()`/`changeTxListMonth()` sengaja TIDAK dites di sini
(baca/tulis DOM langsung, di luar batasan `loadSource.js`) — cukup
diverifikasi lewat baca-ulang kode + regression suite penuh.

`node --test tests/*.test.js` -> **1767/1767 pass, 0 fail** (naik dari
1760, 2x — sebelum & sesudah build, 0 regresi).

## Build

`node scripts/build.js s322-lunas-paidperiod-txlist-monthnav` -> sukses,
3 lint-guard bawaan lolos, kedua bundle lolos `node --check`, versi naik
892→893, `index.html`/`app_production.html` identik, `FILE-MAP.md`
diregenerasi.

## ZIP

`kw_release_sesi323_lunas-paidperiod-txlist-monthnav_v893.zip` — dibuat &
dikirim ke user.

## Perlu QA manual

- Cek visual tab Lunas: cicilan yang baru dibayar bulan ini muncul di
  tab Lunas (badge "✅ Dibayar") SEKALIGUS tetap muncul di tab Bayar
  dgn jatuh tempo bulan depan.
- Cek tombol di kartu "✅ Dibayar" (tab Lunas): 📋 Riwayat + ✏️ Edit + ⋮
  harus jalan normal (bukan rute arsip).
- Cek navigasi ‹› di kartu Daftar Transaksi: klik kiri/kanan pindah bulan
  & otomatis switch chip ke "Bulan Ini".

# Sesi 324 (2026-07-30) — Badge "Sudah dibayar bulan ini" di kartu tab Bayar

## Konteks
Lanjutan ringkas Sesi 323 (rekomendasi yang dipilih user dari 3 opsi):
cicilan/tagihan yang sudah dibayar periode ini kini juga dapat badge kecil
`✅ Sudah dibayar bulan ini` LANGSUNG di kartunya di tab Bayar (tanpa perlu
pindah ke tab Lunas) — reuse `getBillPaidThisPeriodInfo()` dari Sesi 323,
0 fungsi baru.

## Perubahan
`modules/shared/modules-render.js` (`renderBillItemHtml()`): chip baru
`paidThisPeriodChip`, muncul hanya utk entri AKTIF asli (bukan
`_paidPeriodOnly`/arsip), ditambahkan ke baris chip nama kartu.

## Test
0 test baru (reuse `getBillPaidThisPeriodInfo()` yg sudah dites Sesi 323;
perubahan murni template HTML, DOM). `node --test tests/*.test.js` ->
**1767/1767 pass** (2x, 0 regresi).

## Build
`node scripts/build.js s323-badge-paid-thismonth-bayar-tab` -> sukses,
`?v=894`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi324_badge-paid-thismonth-bayar-tab_v894.zip` — dibuat &
dikirim ke user.

# Sesi 325 (2026-07-30) — Navigasi ‹bulan› di filter lanjutan Tagihan (konsistensi dgn Daftar Transaksi)

## Konteks
Lanjutan ringkas Sesi 323/324 (opsi #2 dari rekomendasi): dropdown Bulan/
Tahun di filter lanjutan Tagihan (billFilterBulan/billFilterTahun) TETAP
ada (tidak dihapus, tetap bisa reset ke "Semua Bulan"/"Semua Tahun"),
ditambah shortcut navigasi ‹› di atasnya biar polanya konsisten dgn
Daftar Transaksi (klik kiri mundur/kanan maju 1 bulan).

## Perubahan
- **`modules/finance/tagihan-kalender.js`**: fungsi baru
  `navBillFilterMonth(dir)` — reuse `applyBillFilter()` yg sudah ada
  (nulis ke 2 dropdown lalu panggil fungsi itu). `populateBillFilterOptions()`:
  fix kecil — tahun yg SEDANG dipilih (`prevT`) sekarang ikut dipertahankan
  di opsi `<select>` walau belum ada tagihan tercatat di tahun itu (dulu
  langsung ke-reset ke "Semua Tahun" tiap render kalau tahun tsb belum
  py data — bug laten yg baru kelihatan skrg krn nav bisa geser ke
  tahun kosong).
- **`index.html`**: tambah blok `.month-nav` (‹ label statis › ) di
  filter lanjutan Tagihan, `data-action="navBillFilterMonth"`.

## Test
0 test baru (fungsi baru + fix murni baca/tulis DOM — di luar batasan
`loadSource.js`, verifikasi manual). `node --test tests/*.test.js` ->
**1767/1767 pass** (2x, 0 regresi — jumlah test TIDAK berubah dari Sesi
324 karena tidak ada test baru).

## Build
`node scripts/build.js s324-navbillfiltermonth-tagihan` -> sukses,
`?v=895`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi325_navbillfiltermonth-tagihan_v895.zip` — dibuat &
dikirim ke user.

## Perlu QA manual
Nav ‹› di filter lanjutan Tagihan: geser ke bulan/tahun yg belum ada
tagihan (mis. tahun depan) -> pastikan TIDAK ke-reset ke "Semua Tahun"
saat list dirender ulang.

# Sesi 326 (2026-07-30) — Fix kecil: badge anomaly ikut tampil di kartu "sudah dibayar" (audit konsistensi _lunas)

## Konteks
Audit ringkas pasca Sesi 323-325: grep semua pemakaian `_lunas` di
codebase utk pastikan tidak ada pengecekan lain yang masih menganggap
`b._lunas===true` = "arsip permanen" sejak `_paidPeriodOnly` ditambahkan
Sesi 323. Ketemu 1 titik lolos: badge anomaly (getBillAnomalyInfo) di
`renderBillItemHtml()` masih pakai `b._lunas` polos, jadi kartu
"✅ Dibayar" (tab Lunas, sebenarnya masih aktif) ikut menyembunyikan
badge anomaly-nya padahal seharusnya boleh tampil (beda dari entri
arsip asli yang memang tidak relevan lagi).

## Perubahan
`modules/shared/modules-render.js` (`renderBillItemHtml()`): `anomaly`
sekarang pakai `isArchived` (bukan `b._lunas` polos) — konsisten dgn
`statusBadge`/`actionBtns`/opacity kartu yang sudah pakai `isArchived`
sejak Sesi 323.

## Test
`node --test tests/*.test.js` -> **1767/1767 pass** (2x, 0 regresi,
jumlah test tidak berubah — perubahan murni template DOM).

## Build
`node scripts/build.js s325-fix-anomaly-badge-paidperiod` -> sukses,
`?v=896`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi326_fix-anomaly-badge-paidperiod_v896.zip` — dibuat &
dikirim ke user.

# Sesi 344 (2026-07-30) — Audit inventory-transfer/pengiriman/kategori: konfirmasi item #1-4 sudah selesai + 2 rule AI baru

## Konteks
Audit `AUDIT-DESAIN-inventory-transfer-pengiriman-kategori.md` (item #1
Buat Transfer, #2 Inventory Movement, #3 Rencana Pengiriman kapasitas
motor, #4 Kategori drilldown) dicek ulang terhadap kode rilis v915:
**semua 4 item ternyata sudah diimplementasikan** (item #2 pakai
`manualLocation` gabungan Opsi A+B, item #4 pakai `toggleKategoriDetail`
— beda nama fungsi dari draft desain tapi setara). Tidak ada perubahan
kode utk item #1-4 sesi ini.

## Perubahan
Tambah 2 rule `AIDecision` baru (generic engine, `ai-decision-engine.js`,
sudah ada — 0 mesin baru), pola sama persis rule domain lain yg sudah
terdaftar:
- **`vehicle-capacity-missing`** (`modules/vehicle/sparepart-servis.js`,
  `registerVehicleAIRules()`): warning kalau kendaraan dipakai di
  `D.deliveryPlans` tapi `capacityKg`/`capacityM3` (field yg sudah ada
  sejak audit #3) masih kosong.
- **`product-weight-missing`** (`modules/shop/cobek-pricing.js`,
  `registerDeliveryAIRules()`): info kalau produk dipakai di
  `D.inventoryTransfers`/`D.deliveryPlans` tapi `beratPerUnit` (field
  yg sudah ada) masih kosong.

Keduanya murni baca `D` langsung, 0 field/index baru, 0 rumus baru
(reuse persis field yg sudah ada dari audit sebelumnya).

## Test
0 test baru — konsisten dgn pola rule domain lain di codebase ini
(`vehicle-service-overdue`, `delivery-low-stock`, dst juga tidak punya
test per-rule tersendiri; hanya mesin generik `AIDecision` yg dites di
`tests/ai-decision-engine-s286.test.js`). `node --test tests/*.test.js`
-> **1870/1870 pass** (2x, 0 regresi).

## Build
`node scripts/build.js s344-ai-rules-kapasitas-motor-berat-produk` ->
sukses, `?v=918`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi344_ai-rules-kapasitas-motor-berat-produk_v918.zip` —
dibuat & dikirim ke user.

## Perlu QA manual
Cek AI Daily Briefing/`AIRecommendCard` muncul: (1) kendaraan tanpa
kapasitas dipakai di Rencana Pengiriman, (2) produk tanpa berat dipakai
di Buat Transfer/Rencana Pengiriman.

# Sesi 344b (2026-07-30) — Badge berat/kapasitas belum diisi langsung di kartu (bukan cuma AI Briefing)

## Konteks
Lanjutan Sesi 344 (2 rule AI baru). Rule AI cuma muncul di AI Briefing
dgn cooldown 72 jam — bisa kelewat kalau briefing tidak dibuka. Tambah
badge langsung di kartu, reuse PERSIS kondisi kedua rule (0 rumus baru).

## Perubahan
- **`modules/shop/cobek-etalase.js`** (`renderList()`): tag baru
  "⚠️ Berat belum diisi" di kartu produk Etalase — tampil kalau produk
  dipakai di `D.inventoryTransfers`/`D.deliveryPlans` tapi `beratPerUnit`
  kosong (kondisi sama persis rule `product-weight-missing`).
- **`modules/vehicle/vehicle-core.js`** (`vehMetaText()`): tag baru
  "⚠️ Kapasitas belum diisi" di kartu Kelola Kendaraan — tampil kalau
  kendaraan dipakai di `D.deliveryPlans` tapi `capacityKg`/`capacityM3`
  kosong (kondisi sama persis rule `vehicle-capacity-missing`).

Keduanya murni template render (0 field/index baru, 0 D.write).

## Test
0 test baru (murni template DOM, di luar cakupan `loadSource.js` —
konsisten pola badge lain di codebase ini, mis. `stockCls`/`stockLbl`).
`node --test tests/*.test.js` -> **1870/1870 pass** (2x, 0 regresi).

## Build
`node scripts/build.js s344b-badge-berat-kapasitas-kartu` -> sukses,
`?v=919`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi344b_badge-berat-kapasitas-kartu_v919.zip` — dibuat &
dikirim ke user.

# Sesi 396 (2026-08-06) — Fix: saldo akun tertaut aset multi-owner belum difilter porsi kepemilikan

## Konteks
Lanjutan MultiOwnerEngine (S390-395). User lapor: kalau sebuah aset punya
lebih dari 1 pemilik (⚖️ Atur Porsi Kepemilikan, mis. SELF 60% + Investor
40%) dan aset itu ditautkan ke sebuah Akun (`asset.accountId`), akun
tertaut itu SELALU dikecualikan PENUH (0%) dari Total Saldo Akun lewat
`linkedAssetAccountIds()` — sama seperti akun tertaut aset single-owner
biasa. Padahal porsi SELF di saldo akun itu tetap uang milik sendiri &
seharusnya ikut kehitung, hanya porsi pemilik lain yang layak dikecualikan.

## Perubahan
- **`modules/finance/akun.js`**:
  - `linkedAssetAccountSelfPorsi(accId)` (baru) — cari aset yang
    `accountId`-nya cocok, reuse `MultiOwnerEngine.getOwners()` untuk cek
    `isMultiOwner`; balik `MultiOwnerEngine.selfPorsi(asset)` kalau
    memang multi-owner, balik `0` kalau aset single-owner/tidak ketemu
    (supaya `totalSaldoAkun()` 0 regresi utk kasus lama — akun tertaut
    aset single-owner tetap dikecualikan penuh apa adanya).
  - `totalSaldoAkun()` — TAMBAH 1 blok: utk akun yang `linked` (tertaut
    aset) & `isAccOwnershipSelf(a)` true, tambahkan
    `recalcAccBalance(a.id) * (porsi/100)` ke total (0 kalau porsi 0,
    yaitu aset single-owner — noop, logic lama utuh). 0 rumus baru,
    100% reuse `MultiOwnerEngine.selfPorsi()` (S393) yang sudah dipakai
    Zakat & Piutang/Utang.

## Test
Test baru `tests/akun-multiowner-linked-account-s396.test.js` (4 test):
akun tertaut aset single-owner tetap 0% (0 regresi), akun tertaut aset
multi-owner ikut porsi SELF, akun ber-ownership non-SELF sendiri tetap
dikecualikan penuh walau asetnya multi-owner, & unit test
`linkedAssetAccountSelfPorsi()` langsung.
`node --test tests/*.test.js` -> **2695/2695 pass** (0 regresi).

## Build
`node scripts/build.js s396-akun-multiowner-linked-saldo-filter` ->
sukses, `?v=1098`, `index.html`/`app_production.html` identik.

## ZIP
`kw_release_sesi396_akun-multiowner-linked-saldo-filter_v1098.zip`.

# Sesi 543 (2026-08-10) — Fix: dropdown "Pilih Aset" Dana Titipan ter-reset diam-diam ("belum sinkron")

## Konteks
Laporan user: dropdown "Pilih Aset" per kartu owner (tab Dana Titipan)
kelihatan sudah terisi (mis. "Sucorinvest"), tapi tombol "⚖️ Atur Porsi
Aset" tetap toast "Pilih aset dulu". Root cause: `_renderNow()` mengganti
seluruh `el.innerHTML` tiap dipanggil ulang (dipicu `renderLaporan()`
setiap ada perubahan lain di halaman, mis. harga investasi live update),
dan `_assetOptionsHtml()` selalu generate opsi placeholder tanpa
`selected` — pilihan user diam2 ter-reset sebelum sempat klik tombol.

## Perubahan
- `modules/finance/dana-titipan-portfolio-presenter.js`:
  `_captureAssetPickSelections()`/`_restoreAssetPickSelections()` (baru),
  dipanggil di awal/akhir `_renderNow()`; preservasi PER `ownerId` (via
  `data-owner-id` baru di tiap `<select id="titipanAssetPick_N">`, BUKAN
  index — index bisa bergeser antar render kalau urutan owners berubah,
  `build()` sort by allocatedPrincipal desc). Guard `typeof
  el.querySelectorAll` — aman di test harness ringan tanpa
  querySelectorAll. 0 logika projection/aggregasi lain disentuh.

## Test
Test baru `tests/s543-titipan-asset-pick-preserve-selection.test.js` (4
test: baseline tanpa interaksi, preservasi setelah render ulang,
preservasi saat urutan owner bergeser index, guard DOM tanpa
querySelectorAll).
`node --test tests/*.test.js` -> **3757/3757 pass** (naik dari 3753, 0
regresi).

## Build
`node scripts/build.js s543-titipan-assetpick-dropdown-preserve-selection`
-> sukses, `?v=1278`, `index.html`/`app_production.html` identik,
`verify-bundle-freshness.js` konfirmasi segar.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan) — dicatat di
`docs/RELEASE-GATE-LOG.md`. html-sync: **lolos** murni. Gate akhir:
**LOLOS**. Detail lengkap di
`FIX-v1277-to-v1278-s543-titipan-assetpick-dropdown-preserve-selection.md`.

## Progress
Item #1 laporan user (bug dropdown) selesai penuh. Item #2 (tombol
"hapus akun pemilik") dikonfirmasi BUKAN bug — keputusan desain S523-C
sengaja melarang global owner deletion, keputusan produk §4 rekomendasi
S523 belum diambil. TIDAK dikerjakan sesi ini, menunggu klarifikasi user.

## Next TODO
Klarifikasi keputusan produk soal "hapus akun pemilik" (scope: apakah
mau ditambah, dan perilaku terhadap data lintas domain yang masih
terikat) sebelum menyentuh area ini.

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`kw_release_sesi543_titipan-assetpick-dropdown-preserve-selection_v1278.zip`.

# Sesi Q1 (2026-08-28) — Proyeksi Kas: tampilkan Pemasukan/Pengeluaran Bulan Ini (data sudah ada, tinggal ditampilkan)

## Konteks
Lanjutan `AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md` (audit: kartu
"💰 Proyeksi Kas Bulan Ini" sengaja sempit by design, cuma
gaji-kewajiban -- `dashCtx.inc/exp` KAS RIIL semua tipe transaksi
sudah dihitung & sudah dioper ke `_renderCashProjectionCard(ctx)`
tiap buka Dashboard, tapi tidak pernah dipakai kartu). Sesi Q1 =
prioritas WAJIB dari rencana 3 sesi (Q1 wajib, Q2/Q3 opsional).

## Perubahan
- `modules/shared/modules-render.js` — `_renderCashProjectionCard(ctx)`:
  tambah 2 stat-box baru "Pemasukan Bulan Ini"/"Pengeluaran Bulan Ini"
  (grid2 jadi 4 sel). REUSE `ctx.inc`/`ctx.exp` apa adanya kalau ctx
  tersedia (Keputusan #1, 0 filter ulang) -- fallback hitung sendiri
  dari `D.transactions` (ter-guard `hitungKas!==false`, pola identik
  `_dashMonthlyIncExp()`/`FinCoach.compute()`) kalau dipanggil tanpa
  ctx. 0 perubahan ke `getMonthlyCashProjection()` (acceptance
  criteria #4, murni consumer). 3 angka existing (Proyeksi Gaji/Sisa
  Kewajiban/Proyeksi Kas) tetap utuh, 0 mode gabungan (kriteria #5
  lama tetap berlaku).
- Keputusan #2 (tampilkan `FI.monthlySurplus()`) & #3 (breakdown gaji/
  kewajiban di balik toggle) DITUNDA -- itu scope Sesi Q2/Q3
  (opsional), TIDAK dikerjakan sesi ini sesuai rencana.

## Test
Test baru `tests/cash-projection-card-s-q1.test.js` (5 test): reuse
ctx.inc/exp apa adanya, fallback tanpa ctx ter-guard hitungKas,
fallback dgn ctx.m/y tapi tanpa ctx.inc/exp pakai bulan target (bukan
bulan berjalan), 0 regresi 3 angka existing Sesi P1/P2, guard DOM
absen tidak throw.
`node --test tests/*.test.js` -> **4804/4804 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s661-networth-renderbersih-ssot-unify`,
`?v=1403`, `index.html`/`app_production.html` sinkron. Catatan: sebelum
build, ditemukan & diperbaiki drift versi pre-existing (BUKAN dari
perubahan sesi ini) -- `MODULE_RENDER_VERSION`/`MODULE_CALC_VERSION` di
`modules/shared/modules-render.js`/`modules-calc.js` sudah tertulis
`s662-...` (lebih maju dari 3 file lain yg masih `s660-...`) sehingga
`bumpVersionEverywhere()` tidak ikut me-replace-nya -- disamakan manual
ke `s660-...` dulu spy build bisa jalan normal, lalu build otomatis
menaikkan semua ke `s661-...`.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan -- `network egress disabled`)
-- dicatat di `docs/RELEASE-GATE-LOG.md`. html-sync & version-sync:
**lolos** murni. Gate akhir: **LOLOS**.

## Progress
Sesi Q1 (wajib) SELESAI. Data pemasukan/pengeluaran kas riil bulan
berjalan yang sebelumnya dihitung tapi dibuang sekarang tampil di
kartu Proyeksi Kas.

## Next TODO
Sesi Q2 (opsional, tunggu konfirmasi user): breakdown gaji tercatat vs
pending & kewajiban total vs sudah dibayar, di balik toggle "Detail"
(field-nya sudah ada di `getMonthlyCashProjection()`, 0 hitungan
baru). Sesi Q3 (opsional): `FI.monthlySurplus()` sbg metrik ke-3
terpisah + penjelasan beda window -- risiko SEDANG, wajib ada
copywriting jelas kalau dikerjakan.

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-sesi-Q1-proyeksi-kas-pemasukan-pengeluaran.zip` (patch, hanya
file berubah -- bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
chat-action-handlers.js, modules/shared/features-helpers-global-security.js,
modules/shared/modals.js, modules/shared/modules-calc.js,
modules/shared/modules-render.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/RELEASE-GATE-LOG.md,
tests/cash-projection-card-s-q1.test.js.

# Sesi Q2 (2026-08-28) — Proyeksi Kas: breakdown gaji tercatat/pending & kewajiban total/dibayar (di balik toggle Detail)

## Konteks
Lanjutan Sesi Q1 & `AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md` (Sesi Q2
opsional, dikerjakan atas konfirmasi user lanjut). `getMonthlyCashProjection()`
sudah mengembalikan breakdown lebih detail dari yang ditampilkan kartu
(`recordedGaji`/`pendingGajiEstimate` vs `proyeksiGaji` gabungan;
`billMonthTotal`/`billPaidThisPeriod` vs `sisaKewajiban` gabungan) --
belum pernah ditampilkan ke user.

## Perubahan
- `modules/shared/modules-render.js` — `_renderCashProjectionCard(ctx)`:
  tambah blok breakdown "Gaji Tercatat"/"Gaji Pending"/"Total
  Kewajiban"/"Sudah Dibayar", REUSE field `getMonthlyCashProjection()`
  yang sudah ada (0 hitungan baru). Ditampilkan di balik toggle tombol
  "Detail ▾" (Keputusan #3: default tersembunyi, class `u-dnone` --
  pola sama `hideDashCardEl()`/`showDashCardEl()` yang sudah ada di
  file yang sama) supaya kartu tidak makin padat by default (sudah 5
  angka utama sejak Sesi Q1). Toggle murni `classList.toggle('u-dnone')`
  inline, 0 fungsi/state baru di JS.
- Keputusan #2 (`FI.monthlySurplus()` sbg metrik ke-3) TETAP DITUNDA --
  scope Sesi Q3 (opsional terpisah), belum dikerjakan sesi ini.

## Test
Test baru `tests/cash-projection-card-s-q2.test.js` (4 test): breakdown
4 angka baru tampil dgn nilai benar (reuse getMonthlyCashProjection()),
breakdown tersembunyi default (`u-dnone`) + tombol toggle ada, 5 angka
utama Sesi P1/P2/Q1 tetap utuh (0 regresi), guard DOM absen tidak throw.
`node --test tests/*.test.js` -> **4808/4808 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s662-networth-renderbersih-ssot-unify`,
`?v=1404`, `index.html`/`app_production.html` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan) -- dicatat di
`docs/RELEASE-GATE-LOG.md`. html-sync & version-sync: **lolos** murni.
Gate akhir: **LOLOS**.

## Progress
Sesi Q2 (opsional) SELESAI. Breakdown gaji tercatat/pending &
kewajiban total/dibayar yang sebelumnya dihitung tapi tidak pernah
ditampilkan sekarang tersedia di balik toggle "Detail" pada kartu
Proyeksi Kas.

## Next TODO
Sesi Q3 (opsional, tunggu konfirmasi user): `FI.monthlySurplus()`
sbg metrik ke-3 terpisah + penjelasan singkat beda window (rata-rata
multi-bulan vs bulan kalender ini) -- risiko SEDANG (berpotensi
membingungkan kalau labelnya tidak jelas), wajib ada 1-2 baris
copywriting penjelasan di UI kalau dikerjakan.

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-sesi-Q2-proyeksi-kas-breakdown-gaji-kewajiban.zip` (patch,
hanya file berubah -- bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
chat-action-handlers.js, modules/shared/features-helpers-global-security.js,
modules/shared/modals.js, modules/shared/modules-calc.js,
modules/shared/modules-render.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/RELEASE-GATE-LOG.md,
tests/cash-projection-card-s-q2.test.js.

# Sesi Q3 (2026-08-28) — Proyeksi Kas: metrik "Rata-rata Surplus Bulanan" + penjelasan beda window

## Konteks
Lanjutan Sesi Q1/Q2 & `AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md` (Sesi
Q3 opsional, risiko SEDANG -- dikerjakan atas konfirmasi user lanjut).
Keputusan #2: `FI.monthlySurplus()` (rata-rata window multi-bulan,
`FI.effectiveMonths()`) BEDA SEMANTIK dari `dashCtx.inc/exp` (bulan
kalender berjalan) -- kalau digabung tanpa penjelasan, user bisa
menyangka 2 angka itu representasi yang sama & bingung kenapa beda.

## Perubahan
- `modules/shared/modules-render.js` — `_renderCashProjectionCard(ctx)`:
  tambah metrik ke-4 "Rata-rata Surplus Bulanan (N bln terakhir)",
  REUSE `fiMonthlySurplus()`/`FI.effectiveMonths()` (0 rumus baru).
  Ditampilkan SELALU (bukan di balik toggle Detail -- beda dari
  breakdown Q2 yang murni info tambahan opsional, metrik ini wajib
  kelihatan krn beda semantik dari Proyeksi Kas), disertai 1-2 baris
  penjelasan eksplisit ("ini rata-rata ... bukan bulan kalender
  berjalan saja -- wajar kalau angkanya tidak sama") sesuai mitigasi
  risiko yang disyaratkan dokumen audit. Guard `typeof
  fiMonthlySurplus`/`typeof FI` -- kartu tetap render normal kalau
  modules-calc.js belum dimuat bareng (fallback diam, tanpa metrik
  ini, tidak throw).

## Test
Test baru `tests/cash-projection-card-s-q3.test.js` (5 test): metrik
surplus tampil SELALU (posisi sebelum blok toggle Detail, dibuktikan
via index string), penjelasan beda window wajib ada, guard aman kalau
FI/fiMonthlySurplus tidak dimuat (tidak throw, kartu lain tetap
render), 0 regresi 5+4 angka Sesi P1/P2/Q1/Q2, guard DOM absen.
`node --test tests/*.test.js` -> **4813/4813 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s663-networth-renderbersih-ssot-unify`,
`?v=1405`, `index.html`/`app_production.html` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan) -- dicatat di
`docs/RELEASE-GATE-LOG.md`. html-sync & version-sync: **lolos** murni.
Gate akhir: **LOLOS**.

## Progress
Sesi Q3 (opsional, terakhir dari rencana 3 sesi audit proyeksi arus
kas) SELESAI. Ketiga sesi (Q1 wajib + Q2/Q3 opsional) dari
`AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md` sekarang TUNTAS -- kartu
"💰 Proyeksi Kas Bulan Ini" sekarang menampilkan Proyeksi Gaji, Sisa
Kewajiban, Pemasukan/Pengeluaran Bulan Ini, Proyeksi Kas, Rata-rata
Surplus Bulanan (selalu tampil + penjelasan), & breakdown gaji/
kewajiban detail (di balik toggle).

## Next TODO
Tidak ada TODO tersisa dari rencana audit ini (3/3 sesi selesai).
Target sesi berikutnya menunggu arahan user.

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-sesi-Q3-proyeksi-kas-surplus-rata-rata.zip` (patch, hanya file
berubah -- bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
chat-action-handlers.js, modules/shared/features-helpers-global-security.js,
modules/shared/modals.js, modules/shared/modules-calc.js,
modules/shared/modules-render.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/RELEASE-GATE-LOG.md,
tests/cash-projection-card-s-q3.test.js.

# Sesi Cleanup-DeadFiles (2026-08-29) — Hapus 8 file dead code duplikat (modules-render.js legacy dkk)

## Konteks
Ditemukan di catatan PATCH-README-oversized-files-split-modules-render.md
(sesi split sebelumnya): `modules/modules-render.js` &
`modules/shop/modules-render.js` disebut "duplikat/legacy, belum
diaudit — kandidat sesi berikutnya kalau memang masih relevan". Dicek:
KEDUANYA 0 referensi path-exact di `scripts/build.js` (tidak pernah
ikut bundle), dan ternyata sudah ada script `scripts/remove-shop-dead-files.sh`
dari sesi lebih lama yang sudah mendaftarkan keduanya (plus 6 file
dead lain) sbg "TERKONFIRMASI 0 referensi" — tapi script itu belum
pernah benar-benar dijalankan (file-file masih ada di ZIP upload).

## Perubahan
Menjalankan `scripts/remove-shop-dead-files.sh` — 8 file dihapus (1
sudah tidak ada sebelumnya):
- `modules/shop/modals.js`, `modules/shop/modules-render.js`,
  `modules/shop/modules-calc.js`, `modules/shop/multi-owner-engine.js`,
  `modules/shop/features-helpers-global-security.js`
- `modules/modals.js`, `modules/modules-render.js`,
  `modules/modules-calc.js`
- (`finance/tx-cobek.js` — dilewati, sudah tidak ada)

Tidak ada perubahan kode lain (0 fungsi baru/diubah).

## Test
`node --test tests/*.test.js` -> **4857/4857 pass** (0 regresi) —
sama persis sebelum & sesudah penghapusan.

## Build
`node scripts/build.js` -> versi bump otomatis
`s672-cashflow-siklus-legacy-card`, `?v=1417`,
`index.html`/`app_production.html` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan) -- dicatat di
`docs/RELEASE-GATE-LOG.md`. html-sync & version-sync: **lolos** murni.
Gate akhir: **LOLOS**.

## Progress
Catatan "kandidat sesi berikutnya" dari patch split modules-render
sudah dituntaskan — kedua file legacy duplikat itu bukan kandidat
split (murni dead code), sudah dihapus bersama 6 file dead lain yang
sebelumnya sudah teridentifikasi tapi belum dieksekusi.

## Next TODO
Tidak ada TODO baru dari sesi ini. Sisa file di atas ambang ukuran
1600 baris (dari audit sesi split sebelumnya): `scripts/build.js`
(wajar, script build itu sendiri), `modules/vehicle/sparepart-servis.js`,
`modules/finance/transaksi.js`, `modules/shared/scan-ocr.js`,
`modules/finance/dana-titipan-portfolio-render.js` — kandidat split
sesi mendatang kalau relevan.

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-cleanup-8-dead-files-modules-render-legacy.zip` (patch, hanya
file berubah — bukan full release; 8 file DIHAPUS, lihat daftar di
atas, tidak ikut di ZIP): app-bundle-a.min.js, app-bundle-b.min.js,
app_production.html, index.html, sw.js, chat-action-handlers.js,
modules/shared/features-helpers-global-security.js,
modules/shared/modals.js, modules/shared/modules-calc.js,
modules/shared/modules-render.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/RELEASE-GATE-LOG.md.

# Sesi Split-SparepartServis (2026-08-29) — Pecah modules/vehicle/sparepart-servis.js (2053->1350 baris)

## Konteks
Lanjutan audit ukuran file (kandidat berikutnya setelah cleanup dead
files): `modules/vehicle/sparepart-servis.js` (2053 baris) adalah file
terbesar kedua sesudah `scripts/build.js`.

## Perubahan
Titik potong bersih: TEPAT SETELAH `window.Sparepart = Sparepart;`
(baris terakhir object `Sparepart`).
- **Diubah:** `modules/vehicle/sparepart-servis.js` — sisa bagian
  PERTAMA (fungsi helper global: catVisibleForVehicle/
  resolveServisCatForVehicle/computeServiceUrgency/recommendIntervalKm/
  historyStatsForName dkk, + object `Sparepart` lengkap + `window.
  Sparepart=Sparepart`).
- **Baru:** `modules/vehicle/sparepart-servis-b.js` (727 baris) —
  object `SparepartCsvImport`, data referensi `TORSI_DB`/
  `VEHICLE_SPEC_DB`, `MY_WRENCH_SCALE`, seluruh fungsi wrapper global
  ke `Servis` (car-notes.js) — saveServis/delServis/markSparepartServiced
  dkk, & fitur prediksi/AI kendaraan (predictService, maintenanceForecast,
  registerVehicleAIRules, 3 fungsi `_vehicle*Check()`).

Sama seperti pola split modules-render.js: murni deklarasi
`function`/`const` top-level, TIDAK butuh mixin `Object.assign` — cukup
`sparepart-servis-b.js` dimuat SETELAH `sparepart-servis.js`
(scripts/build.js, GROUP_A, entri baru tepat setelah file utama).

## Test
5 file test disesuaikan (`loadSource([...])` ditambah
`modules/vehicle/sparepart-servis-b.js` krn menguji fungsi yang pindah
— `predictService()`, `TORSI_DB`/`findTorsiDb()`/`suggestServiceIntervalKm()`):
`tests/sparepart-interval-bulan.test.js`,
`tests/sparepart-recommend-categories.test.js`,
`tests/sparepart-sync-from-catalog-s331.test.js`. 7 file test lain yang
menyebut `sparepart-servis.js` dicek — tidak butuh perubahan (semua
fungsi yang mereka pakai tetap di bagian PERTAMA, atau sudah guard
`typeof` thd fungsi yang pindah).
`node --test tests/*.test.js` -> **4857/4857 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s674-cashflow-siklus-legacy-card`,
`?v=1419`, `index.html`/`app_production.html`/`sw.js` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan) -- dicatat di
`docs/RELEASE-GATE-LOG.md`. html-sync & version-sync: **lolos** murni.
Gate akhir: **LOLOS**.

## Progress
Lint "file kegedean" (ambang 1600 baris): **4 -> 3** file (di luar
`scripts/build.js` yang wajar). `sparepart-servis.js` sudah lepas dari
daftar (2053 -> 1350).

## Next TODO
Sisa file oversized (kandidat sesi split berikutnya):
`modules/finance/transaksi.js` (1900), `modules/shared/scan-ocr.js`
(1677), `modules/finance/dana-titipan-portfolio-render.js` (1616).

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-split-sparepart-servis.zip` (patch, hanya file berubah — bukan
full release): app-bundle-a.min.js, app-bundle-b.min.js,
app_production.html, index.html, sw.js,
modules/vehicle/sparepart-servis.js,
modules/vehicle/sparepart-servis-b.js (baru), scripts/build.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md,
docs/RELEASE-GATE-LOG.md,
tests/sparepart-interval-bulan.test.js,
tests/sparepart-recommend-categories.test.js,
tests/sparepart-sync-from-catalog-s331.test.js.

# Sesi Split-Transaksi (2026-08-29) — Pecah modules/finance/transaksi.js (1899->1244 baris)

## Konteks
Lanjutan audit ukuran file setelah split `sparepart-servis.js`. Kandidat
prioritas #1 dari 3 sisa file oversized: `modules/finance/transaksi.js`
(1899 baris), file terbesar di luar `scripts/build.js`.

## Perubahan
Titik potong bersih: TEPAT SEBELUM `async function saveTx(){` (baris
1239, langsung setelah `deleteTxFromModal(){...}` selesai).
- **Diubah:** `modules/finance/transaksi.js` — sisa bagian PERTAMA
  (setTxType, panel kendaraan/BBM/sparepart/shop, autocomplete
  kategori/produk, owner-resolver, openTxModal/editTx/
  deleteTxFromModal, dkk).
- **Baru:** `modules/finance/transaksi-b.js` (680 baris) —
  `saveTx()`/`_saveTxInner()` (mesin simpan transaksi ~600 baris:
  cicilan/langganan/piutang/servis/bbm/shop sync) + fungsi tak
  terkait domain transaksi yang sebelumnya menumpuk di ekor file yang
  sama: `saveCatatan`, `saveReminder`, `saveLDR`, `toggleMs`,
  `delReminder`.

Sama seperti pola split sebelumnya: murni deklarasi `function`
top-level, TIDAK butuh mixin `Object.assign` — cukup
`transaksi-b.js` dimuat SETELAH `transaksi.js` (scripts/build.js,
entri baru tepat setelah file utama). Referensi ke variabel top-level
(`let`/`var`) yang dideklarasikan di file lain
(`features-helpers-global-security.js`: curTxType/txEditId/_txSaving)
maupun di `transaksi.js` sendiri (`_txPayMethodTouchedByUser`) tetap
aman: di browser, `let`/`var` top-level pada `<script>` klasik berbagi
satu global lexical scope lintas file.

## Test
10 file test disesuaikan (`loadSource([...])` ditambah
`modules/finance/transaksi-b.js` krn menguji fungsi yang ikut pindah,
terutama `saveTx()`/`_saveTxInner()`):
`tests/s628-bugB-atomicity-create-regression.test.js`,
`tests/s316-tagihan-tx-edit-billlink-sync.test.js`,
`tests/s433-tx-renov-edit-save-fix.test.js`,
`tests/s436-tx-renov-e2e-real.test.js`,
`tests/s447-tx-renov-numeric-id-fix.test.js`,
`tests/s452-tx-renov-edit-checkbox-restore.test.js`,
`tests/s574-d2-deduction-owner-persist-validation.test.js`,
`tests/s574-e-history-badge-datahealth-regression.test.js`,
`tests/s578-dl-next-1-deduction-owner-validation-source.test.js`,
`tests/tx-stock-edit-checkbox-restore-s629b.test.js` (2 loadSource
call di file ini).
1 file test khusus (`tests/s271-bill-list-cicilan-fixes.test.js`) —
"source guard" yang baca isi mentah `transaksi.js` via regex (bukan
`loadSource`), diubah baca gabungan `transaksi.js` + `transaksi-b.js`
karena pola yang dicek (`totalAmount:cicilanShared?perBulan:null` dkk)
ikut pindah ke file baru.
18 file test lain yang menyebut `transaksi.js` dicek satu per satu —
TIDAK butuh perubahan (fungsi yang mereka pakai tetap di bagian
PERTAMA, tidak menyentuh saveTx/saveCatatan/saveReminder/saveLDR/
toggleMs/delReminder).
`node --test tests/*.test.js` -> **4857/4857 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s676-cashflow-siklus-legacy-card`,
`?v=1423`, `index.html`/`app_production.html`/`sw.js` sinkron. (Versi
naik 3 langkah dari baseline krn build dijalankan berulang saat
verifikasi output di sesi ini — tidak ada dampak fungsional, cuma
nomor versi lebih tinggi dari yang seharusnya minimal.)

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan). html-sync & version-sync:
**lolos** murni. Gate akhir: **LOLOS**.

## Progress
Lint "file kegedean" (ambang 1600 baris): **3 -> 2** file di antara
file aktif/terdaftar di build.js (di luar `scripts/build.js` yang
wajar). `transaksi.js` sudah lepas dari daftar (1899 -> 1244).
Catatan: lint juga menandai `modules/modules-render.js` (2165) &
`modules/shop/modules-render.js` (1974) sebagai oversized, tapi
KEDUANYA file mati/duplikat — TIDAK terdaftar di `scripts/build.js`
(hanya `modules/shared/modules-render.js` yang aktif), jadi bukan
kandidat split & aman diabaikan (sama seperti temuan dead-file sesi
sebelumnya).

## Next TODO
Sisa file oversized aktif (kandidat sesi split berikutnya):
`modules/shared/scan-ocr.js` (1677),
`modules/finance/dana-titipan-portfolio-render.js` (1616).

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-split-transaksi.zip` (patch, hanya file berubah — bukan full
release): app-bundle-a.min.js, app-bundle-b.min.js,
app_production.html, index.html, sw.js,
modules/finance/transaksi.js,
modules/finance/transaksi-b.js (baru), scripts/build.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md,
tests/s628-bugB-atomicity-create-regression.test.js,
tests/s271-bill-list-cicilan-fixes.test.js,
tests/s316-tagihan-tx-edit-billlink-sync.test.js,
tests/s433-tx-renov-edit-save-fix.test.js,
tests/s436-tx-renov-e2e-real.test.js,
tests/s447-tx-renov-numeric-id-fix.test.js,
tests/s452-tx-renov-edit-checkbox-restore.test.js,
tests/s574-d2-deduction-owner-persist-validation.test.js,
tests/s574-e-history-badge-datahealth-regression.test.js,
tests/s578-dl-next-1-deduction-owner-validation-source.test.js,
tests/tx-stock-edit-checkbox-restore-s629b.test.js.

# Sesi Split-ScanOCR (2026-08-29) — Pecah modules/shared/scan-ocr.js (1676->1067 baris)

## Konteks
Lanjutan audit ukuran file setelah split `transaksi.js`. Kandidat #1
dari 2 sisa file oversized.

## Perubahan
Titik potong bersih: TEPAT SETELAH
`function scanBillMultiItems(){return BillMultiScan.scan();}`, persis
di depan header komentar section `// ==== UniversalScan (Sesi 125) ====`.
- **Diubah:** `modules/shared/scan-ocr.js` — sisa bagian PERTAMA
  (ocrRecognize/downscaleImage/scanReceipt/scanBuktiTransfer/
  scanTanggalDariFoto/scanKmOdometer/scanAssetPortfolio/
  scanReceiptBelanja/scanWorthItCheckout/BillMultiScan, dkk).
- **Baru:** `modules/shared/scan-ocr-b.js` (638 baris) — seluruh
  fitur UniversalScan (Sesi 125): scan screenshot Bank/E-Wallet/
  Bibit/Jago Pocket buat isi Akun otomatis (`detectScreenType*()`,
  `parseBankScreen`/`parseWalletScreen`/`parseWalletNominal`/
  `parseBibitScreen`/`extractBibitKeuntungan`/`parseJagoPocketScreen`,
  `_fuzzyAccountMatch`, `runUniversalScanParser`/
  `validateUniversalScanItem`, `getOcrMinConfidence`/
  `setOcrMinConfidence`, `UniversalScanHistory`, object
  `UniversalScan`, `scanUniversal()`).

Sama seperti pola split sebelumnya: murni deklarasi function/const
top-level, TIDAK butuh `Object.assign` — cukup `scan-ocr-b.js`
dimuat SETELAH `scan-ocr.js`.

## Test
3 file test disesuaikan (`loadSource([...])` ditambah
`modules/shared/scan-ocr-b.js`): `tests/scan-ocr-bibit-detail.test.js`
(`detectScreenType()`/`parseBibitScreen()`),
`tests/scan-ocr-wallet.test.js` (`parseWalletScreen()`),
`tests/window-expose-audit-s347.test.js` (entri audit
`UniversalScan`; entri `BillMultiScan` di file yang sama TIDAK
berubah). `tests/scan-ocr-epoch-guard.test.js` dicek — tidak butuh
perubahan (`_scanEpochNow`/`_scanEpochStale` tetap di bagian PERTAMA).
`node --test tests/*.test.js` -> **4857/4857 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s677-cashflow-siklus-legacy-card`,
`?v=1424`, `index.html`/`app_production.html`/`sw.js` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan). html-sync & version-sync:
**lolos** murni. Gate akhir: **LOLOS**.

## Progress
Lint "file kegedean" (ambang 1600 baris) di antara file aktif:
**2 -> 1** file. `scan-ocr.js` sudah lepas dari daftar (1676 -> 1067).
`modules/modules-render.js` & `modules/shop/modules-render.js` tetap
ditandai lint tapi keduanya file mati/duplikat, tidak terdaftar di
`scripts/build.js` — aman diabaikan.

## Next TODO
Sisa file oversized aktif (terakhir dari daftar awal 4 file, kandidat
sesi split berikutnya): `modules/finance/dana-titipan-portfolio-render.js`
(1616).

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-split-scan-ocr.zip` (patch, hanya file berubah — bukan full
release): app-bundle-a.min.js, app-bundle-b.min.js,
app_production.html, index.html, sw.js,
modules/shared/scan-ocr.js,
modules/shared/scan-ocr-b.js (baru), scripts/build.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md,
tests/scan-ocr-bibit-detail.test.js,
tests/scan-ocr-wallet.test.js,
tests/window-expose-audit-s347.test.js.

# Sesi Split-DanaTitipanPortfolioRender (2026-08-29) — Pecah modules/finance/dana-titipan-portfolio-render.js (1615->1092 baris)

## Konteks
Sesi terakhir dari backlog audit ukuran file (4 file awal: transaksi.js,
sparepart-servis.js, scan-ocr.js, dana-titipan-portfolio-render.js).

## Perubahan
Titik potong bersih: TEPAT SETELAH penutup object
`DanaTitipanPortfolioPresenter` (`};`), persis di depan header
komentar `DanaTitipanCommitmentUI`.
- **Diubah:** `modules/finance/dana-titipan-portfolio-render.js` —
  sisa bagian PERTAMA (object `DanaTitipanPortfolioPresenter` saja).
- **Baru:** `modules/finance/dana-titipan-portfolio-render-b.js`
  (547 baris) — object `DanaTitipanCommitmentUI`, `DanaTitipanReturnUI`,
  `DanaTitipanPoolUI`.

Sama seperti pola split sebelumnya: murni deklarasi const top-level,
TIDAK butuh `Object.assign` — cukup `dana-titipan-portfolio-render-b.js`
dimuat SETELAH file utama.

## Test
12 file test disesuaikan (`loadSource([...])` ditambah
`dana-titipan-portfolio-render-b.js`):
`dana-titipan-asset-picker-holding-option-s608`,
`s485d-titipan-commitment-ui`, `s486-titipan-commitment-return`,
`s515-dana-titipan-owner-nominal-asset-kuota-porsi`,
`s516-dana-titipan-commitment-ownerid-escaping`,
`s523b-titipan-owner-creation`,
`s544-titipan-duplicate-container-scoped-porsi`,
`s550-titipan-commitment-ui-tablist-sync`,
`s631-titipan-holding-name-direct-porsi`,
`session04a-dana-titipan-pool-ui-summary`,
`session04b-dana-titipan-pool-ui-modal`,
`session05-dana-titipan-fill-remaining`. 4 "source guard"
(`fs.readFileSync`) di 3 file diarahkan ke file baru; 1 guard khusus
di `s485d` (cek `Presenter.render()` sampai marker
`DanaTitipanCommitmentUI`) dibaca gabungan kedua file. 44 file test
lain dicek — tidak butuh perubahan (hanya pakai
`DanaTitipanPortfolioPresenter`, tetap di bagian PERTAMA).
`node --test tests/*.test.js` -> **4857/4857 pass** (0 regresi).

## Build
`node scripts/build.js` -> versi `s678-cashflow-siklus-legacy-card`,
`?v=1425`, `index.html`/`app_production.html`/`sw.js` sinkron.

## Status lint & release gate
Lint & minify: **tidak tersedia, di-override** (eslint/esbuild tidak
terpasang, sandbox tanpa akses jaringan). html-sync & version-sync:
**lolos** murni. Gate akhir: **LOLOS**.

## Progress
Lint "file kegedean" (ambang 1600 baris): **1 -> 0** file aktif.
**Backlog audit ukuran file (4 file: transaksi.js, sparepart-servis.js,
scan-ocr.js, dana-titipan-portfolio-render.js) SELESAI TUNTAS.** Sisa
lint hanya `scripts/build.js` (wajar, di luar cakupan audit) + 2 file
mati/duplikat (`modules/modules-render.js`,
`modules/shop/modules-render.js`, tidak terdaftar di
`scripts/build.js`, aman diabaikan).

## Next TODO
Tidak ada kandidat split file lagi dari backlog ini. Sesi berikutnya
bisa lanjut ke pekerjaan lain (mis. audit dead file duplikat
`modules/modules-render.js`/`modules/shop/modules-render.js` buat
dihapus permanen, atau kembali ke fitur DP/piutang shop yang sempat
tertunda sebelum backlog audit ukuran file ini dimulai).

## Known Issue
Tidak ada known issue baru dari sesi ini.

## ZIP
`PATCH-split-dana-titipan-portfolio-render.zip` (patch, hanya file
berubah — bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
modules/finance/dana-titipan-portfolio-render.js,
modules/finance/dana-titipan-portfolio-render-b.js (baru),
scripts/build.js, docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md,
tests/dana-titipan-asset-picker-holding-option-s608.test.js,
tests/s485d-titipan-commitment-ui.test.js,
tests/s486-titipan-commitment-return.test.js,
tests/s515-dana-titipan-owner-nominal-asset-kuota-porsi.test.js,
tests/s516-dana-titipan-commitment-ownerid-escaping.test.js,
tests/s523b-titipan-owner-creation.test.js,
tests/s544-titipan-duplicate-container-scoped-porsi.test.js,
tests/s550-titipan-commitment-ui-tablist-sync.test.js,
tests/s631-titipan-holding-name-direct-porsi.test.js,
tests/session04a-dana-titipan-pool-ui-summary.test.js,
tests/session04b-dana-titipan-pool-ui-modal.test.js,
tests/session05-dana-titipan-fill-remaining.test.js.

# Sesi KasirAcc (2026-08-29) — kasirAcc "➕ Akun Baru" (item #1 dari audit dropdown produk/akun Shop)

Audit sebelumnya menemukan 2 titik dropdown produk yang tertaut Shop belum
punya jalan pintas tambah data baru: (1) `kasirAcc` (dropdown akun di tab
Kasir AI, form pembayaran) — dikerjakan sesi ini; (2) `txShopSaleItem`
(Penjualan Shop di form Transaksi Pemasukan) — masih backlog, belum
dikerjakan.

**Implementasi:**
- `modules/finance/akun.js`: `openAccModal(idx, callback)` sekarang
  menerima callback opsional (var module-level baru `accModalCallback`,
  di-reset ke `null` tiap kali openAccModal dipanggil ulang) — dipanggil
  di akhir `_saveAccInner()` dengan akun yang baru dibuat/diedit, persis
  pola `catModalCallback`/`openCatModal()` yang sudah ada di
  `modules/finance/kategori.js`. Berlaku utk kedua cabang (edit & create).
- `modules/business/kasir.js`: `Kasir.populateAccSelect()` sekarang
  menyisipkan opsi `➕ Akun Baru` (value `__new__`) di akhir list &
  menyimpan pilihan sebelumnya di `el.dataset.prevValue`; method baru
  `Kasir.onAccSelectChange()` — kalau user pilih `__new__`, buka
  `accModal` lewat callback (auto re-populate select & auto-select akun
  baru begitu tersimpan), select langsung dikembalikan ke pilihan
  sebelumnya SELAMA modal masih terbuka (bukan nyangkut di `__new__`).
- `index.html`: `<select id="kasirAcc">` ditambah
  `onchange="Kasir.onAccSelectChange()"`.

**Verifikasi:**
- Build (`node scripts/build.js`) sukses, versi naik ke 1437,
  `app_production.html` ikut ter-generate, sintaks bundle lolos.
- `verify-window-expose.js` ✅.
- `verify-release-ready.js`: html-sync & version-sync ✅; lint (eslint)
  & minify (esbuild) di-override manual (sandbox tanpa akses jaringan,
  tercatat di `docs/RELEASE-GATE-LOG.md`) — gate akhir **LOLOS**.
- Full test suite: 4873 test, **4870 pass, 3 fail** — 3 failure di
  `s679-scroll-flash-14-tabswitch-regression.test.js`
  (`scrollTabBarIntoView`), pre-existing & tidak berkaitan sama sekali
  dgn `akun.js`/`kasir.js`/`index.html` yang diubah sesi ini (bukan
  regresi dari patch ini).
- Test regresi otomatis khusus utk `accModalCallback`/
  `onAccSelectChange` TIDAK dibuat: keduanya menyentuh DOM
  (`getElementById`, `openModal`), yang secara eksplisit di luar cakupan
  harness `tests/helpers/loadSource.js` (dicatat di komentar helper
  itu sendiri — ranah smoke-test/manual QA, bukan unit test murni), dan
  pola sejenis (`catModalCallback`) juga tidak punya unit test tersendiri
  di codebase, jadi konsisten kalau tidak dipaksakan di sini juga.

## Next TODO
Item #2 dari audit: `txShopSaleItem` (dropdown Penjualan Shop di form
Transaksi Pemasukan/Pengeluaran) belum punya opsi `➕ Produk Baru` —
`txShopStockItem` (Stok Shop) sudah punya sejak awal, `txShopSaleItem`
belum, kalau `D.products` kosong cuma tampil "— Belum ada produk di
Etalase —" tanpa jalan pintas tambah produk.

## ZIP
Patch (hanya file berubah — bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
chat-action-handlers.js, modules/finance/akun.js,
modules/business/kasir.js, modules/shared/features-helpers-global-security.js,
modules/shared/modals.js, modules/shared/modules-calc.js,
modules/shared/modules-render.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/RELEASE-GATE-LOG.md, docs/CLAUDE.md.

# Sesi lanjutan KasirAcc (2026-08-29) — txShopSaleItem "➕ Produk Baru" (item #2 dari audit dropdown produk/akun Shop)

Lanjutan sesi sebelumnya (kasirAcc "➕ Akun Baru", item #1). Item #2: dropdown
Penjualan Shop (`txShopSaleItem`) di form Transaksi Pemasukan belum punya
opsi "➕ Produk Baru" — `txShopStockItem` (Stok Shop) sudah punya sejak awal,
`txShopSaleItem` belum, kalau `D.products` kosong cuma tampil "— Belum ada
produk di Etalase —" tanpa jalan pintas tambah produk.

**Implementasi:**
- `modules/shop/cobek-etalase.js`: `Etalase.openModal(idx, callback)` sekarang
  menerima callback opsional (property module baru `this.modalCallback`,
  di-reset ke `null` tiap kali `openModal()` dipanggil ulang) — dipanggil di
  3 titik keluar `_saveInner()` (cabang koreksi stok, cabang beli stok baru
  dgn transaksi pengeluaran, cabang update biasa) dengan produk yang baru
  dibuat/diedit, persis pola `accModalCallback`/`openAccModal()` (sesi
  sebelumnya) & `catModalCallback`/`openCatModal()` yang sudah ada.
- `modules/shop/cobek-tx-cart.js`: `populateTxShopSaleSelect()` sekarang
  selalu menyisipkan opsi `➕ Produk Baru` (value `__new__`) di akhir list —
  termasuk saat `D.products` kosong (sebelumnya cuma tampil pesan kosong
  tanpa jalan pintas) — & menyimpan pilihan sebelumnya di
  `el.dataset.prevValue`; `onTxShopSaleItemChange()` — kalau user pilih
  `__new__`, buka `productModal` lewat `Etalase.openModal(null, callback)`
  (auto re-populate select & auto-select produk baru begitu tersimpan),
  select langsung dikembalikan ke pilihan sebelumnya SELAMA modal masih
  terbuka (bukan nyangkut di `__new__`).
- `index.html`: TIDAK ada perubahan — `<select id="txShopSaleItem">` sudah
  punya `onchange="onTxShopSaleItemChange()"` sejak awal.

**Verifikasi:**
- Build (`node scripts/build.js`) sukses, versi naik ke 1439, sintaks bundle
  lolos.
- Full test suite: 4873 test, **4870 pass, 3 fail** — 3 failure sama persis
  yang sudah didokumentasikan di sesi sebelumnya
  (`s679-scroll-flash-14-tabswitch-regression.test.js`,
  `scrollTabBarIntoView`), pre-existing & tidak berkaitan dengan
  `cobek-etalase.js`/`cobek-tx-cart.js` yang diubah sesi ini (bukan regresi
  dari patch ini).
- Test regresi otomatis khusus utk `Etalase.modalCallback`/
  `onTxShopSaleItemChange` TIDAK dibuat: sama alasan sesi sebelumnya
  (menyentuh DOM, di luar cakupan harness `tests/helpers/loadSource.js`,
  pola sejenis `catModalCallback`/`accModalCallback` juga tidak punya unit
  test tersendiri).

## Audit dropdown produk/akun Shop — SELESAI
Kedua item dari audit awal (kasirAcc "➕ Akun Baru" & txShopSaleItem
"➕ Produk Baru") sudah dikerjakan. Tidak ada backlog tersisa dari audit ini.

## ZIP
Patch (hanya file berubah — bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
modules/shop/cobek-etalase.js, modules/shop/cobek-tx-cart.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md, docs/CLAUDE.md.

# Sesi Fix Migrasi Kendaraan ke Holding (2026-08-29) — bug #2 dari audit user (kendaraan nyelip ke Holding Investasi)

**Konteks:** User audit manual kode (bukan cuma screenshot) dan nemu penyebab
pasti bug #2 (kendaraan masuk ke Holding Investasi) di
`migrateAssetInvestmentsToHoldings()` (`modules/asset/aset-misc.js`), plus
dugaan kuat utk bug #1 (klik holding hasil migrasi tidak respon — kemungkinan
gejala data korup dari migrasi, bukan bug klik/dispatcher terpisah; user
diminta cek toast pas tap, belum ada laporan balik).

**Root cause (dikonfirmasi):** "Harga Beli/Unit" & "Jumlah Unit" di
`assetModal` adalah field GENERIK yang tetap tampil di form apa pun jenis
asetnya (termasuk Kendaraan) — bukan field eksklusif investasi. Filter
kandidat migrasi menghitung `buku = a.hargaBeli * a.jumlahUnit` TANPA cek
`a.jenis` dulu di jalur utama (fallback `buku=a.nilai` di baris bawahnya
SUDAH benar cek jenis, tapi jalur hargaBeli×jumlahUnit tidak). Akibatnya
kendaraan yang diisi kedua field itu (mis. user catat harga beli motor) lolos
jadi kandidat, ikut ke-`Investment.addHolding()` dgn `type` fallback
`'Lainnya'` (jenis 'Kendaraan' tidak ada di `ASSET_JENIS_TO_INVESTMENT_TYPE`),
dan asetnya sendiri hilang dari Buku Aset (ditandai
`_migratedToInvestmentId`).

**Fix:** `modules/asset/aset-misc.js` — tambah
`.filter(a=>!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis])` di filter kandidat
`migrateAssetInvestmentsToHoldings()`, SEBELUM `buku` dihitung. Sekarang
hanya aset berjenis investasi yang dikenal (Kripto/Reksadana/Saham/
Deposito-Investasi/Emas-Logam-Mulia) yang bisa jadi kandidat sama sekali —
aset jenis lain (Kendaraan, Properti, Elektronik, dll) tidak akan pernah
lolos meski field hargaBeli/jumlahUnit terisi, berapa pun jenisnya.

**Test baru** (`tests/s476a-migrate-investasi-to-holdings.test.js`, 2
tambahan):
- Kendaraan dgn `hargaBeli`+`jumlahUnit` terisi TIDAK ikut termigrasi (fixture
  motor Rp15.000.000).
- Aset jenis lain-lain (Elektronik, laptop) dgn field yang sama juga TIDAK
  termigrasi — mengonfirmasi fix bukan cuma hardcode utk 'Kendaraan'.

**Verifikasi:**
- Test suite terkait (`s476a-migrate-investasi-to-holdings`,
  `s476a2-cagr-yield`, `dana-titipan-portfolio-migrated-asset-doublecount-
  s594`): semua pass, termasuk 2 test baru.
- Full test suite: **4901 test, 4901 pass, 0 fail** — tidak ada regresi. (3
  failure pre-existing yang disebut di sesi sebelumnya sudah tidak muncul
  lagi di run ini; kemungkinan sudah kebetulan resolve di sesi lain sejak
  dicatat, tidak diselidiki lebih lanjut di sesi ini karena di luar cakupan
  patch.)
- Build (`node scripts/build.js`) sukses, versi naik ke 1446, sintaks bundle
  lolos.

## Bug #1 (klik holding tidak respon) — BELUM di-fix, masih perlu info dari user
Dispatcher tap sudah dicek & seharusnya selalu munculin toast error kalau ada
masalah pas tap. Dugaan kuat: semua holding di screenshot (Schorder/Bni am/
Sucorinvest, unit="1") adalah hasil auto-migrasi (bukan input manual), jadi
kemungkinan besar ini gejala data hasil migrasi yang "aneh" (avgPrice=
currentPrice, unit=1 buatan fallback), bukan bug klik terpisah. **Menunggu
konfirmasi user**: pas tap item itu, ada toast kecil muncul atau benar-benar
0 reaksi? Kalau 0 reaksi total → curigai overlay/CSS nutupin area klik. Kalau
ada toast error → baru investigasi id/data holding tsb.

## Next TODO
- Tunggu jawaban user soal toast (bug #1) sebelum lanjut investigasi.
- 3 test failure pre-existing yang disebut sesi sebelumnya (audit utang) —
  tidak reproduce di full run sesi ini, cek ulang kalau muncul lagi.
- Audit alur pembayaran utang/piutang (masih pending dari sesi sebelumnya,
  belum disentuh sesi ini).

## ZIP
Patch (hanya file berubah — bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
modules/asset/aset-misc.js, tests/s476a-migrate-investasi-to-holdings.test.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md, docs/CLAUDE.md.

# Sesi Fix Bug #1 (klik holding 0 reaksi) — hardening _renderList() (2026-08-29)

**Konteks:** Lanjutan sesi sebelumnya (fix migrasi Kendaraan). User konfirmasi
bug #1: tap holding hasil migrasi = **0 reaksi total, TIDAK ada toast**.

**Analisis:** Dispatcher klik pusat (`_dataActionClickHandler`) sudah sangat
robust — try/catch penuh, selalu toast kalau ada error atau fungsi tidak
ditemukan. "0 toast" berarti dispatcher kemungkinan besar tidak pernah
kebagian action yang valid utk row itu. `InvestmentListUI._renderList()`
(`modules/asset/investasi-list-view.js`) membangun HTML lewat
`holdings.map(...)` TANPA try/catch per-baris — kalau SATU holding bikin
salah satu hitungan (`holdingValue`/`holdingGainLoss`/`holdingROI`/
`investmentCrossCheckWarning`) throw, exception itu merambat keluar SEBELUM
`el.innerHTML=...` sempat jalan. `_renderList()` sendiri dipanggil langsung
dari `render()`/`setAsetTab()`, BUKAN lewat dispatcher data-action — jadi
tidak ada try/catch/toast yang menangkapnya sama sekali. Efeknya:
`#investmentHoldingList` tetap berisi HTML dari render sukses SEBELUMNYA
(termasuk `data-action` yang tampak normal secara visual), tapi render
TERBARU (yang seharusnya reflect state data sekarang) tidak pernah
ter-apply — persis gejala "kelihatan normal, tap = 0 reaksi, 0 toast".

**Fix:** Bungkus hitungan per-holding di `_renderList()` dengan try/catch.
Kalau satu holding gagal dihitung, fallback ke nilai aman (value/gain/roi=0)
dan tetap dirender sbg row yang BISA di-tap (dengan badge ⚠️ + tooltip
sbg penanda), bukan menjatuhkan seluruh `.map()`/render list. `console.error`
tetap dipanggil per-holding utk debugging.

**Test:** TIDAK dibuat test otomatis khusus — sama alasan sesi-sesi
sebelumnya (`cobek-etalase.js`/`cobek-tx-cart.js`, dst): fungsi ini menyentuh
DOM (`document.getElementById`), di luar cakupan harness
`tests/helpers/loadSource.js` (yang secara eksplisit menyatakan tidak untuk
fungsi baca/tulis DOM). Verifikasi manual (`node --check`) + full suite tetap
dijalankan utk pastikan 0 regresi di kode lain.

**Verifikasi:**
- `node --check modules/asset/investasi-list-view.js`: lolos.
- Full test suite: **4901 test, 4901 pass, 0 fail**.
- Build sukses, versi naik ke 1447 (s689), sintaks bundle lolos.

**Catatan penting:** Fix ini adalah *hardening* (mencegah render silently
gagal ke depannya) berdasarkan analisis kode terbaik yang bisa dilakukan
tanpa akses langsung ke device user. Kalau setelah update ini tap holding
masih 0 reaksi, kemungkinan besar penyebabnya BUKAN exception dalam
`_renderList()` — perlu screenshot console error (aktifkan toggle "Debug
Console" di Pengaturan biar toast error nunjukin lokasi persis) atau cek
apakah overlay/CSS lain menutupi area tap.

## ZIP
Patch (hanya file berubah — bukan full release, KUMULATIF dgn sesi fix
migrasi Kendaraan sebelumnya): app-bundle-a.min.js, app-bundle-b.min.js,
app_production.html, index.html, sw.js, modules/asset/aset-misc.js,
modules/asset/investasi-list-view.js,
tests/s476a-migrate-investasi-to-holdings.test.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/CLAUDE.md.

# Sesi Audit Tombol Investasi (2026-08-30) — InvestmentWatchUI.render() tanpa try/catch

**Laporan user:** tab Aset bagian Investasi, semua tombol tidak berfungsi, 0 toast,
TAPI ada console error (beda dari sesi-sesi audit sebelumnya di area yang sama yang
melaporkan 0 toast DAN 0 error).

**Diagnosa:** `InvestmentListUI.render()` (`modules/asset/investasi-list-view.js`)
sudah dilindungi try/catch di `_renderSummary()` (s614) & `_renderList()` (s689) —
tapi baris ketiga yang dipanggilnya, `InvestmentWatchUI.render()`
(`modules/asset/investasi-watch-view.js`), TIDAK pernah dapat perlakuan sama. Fungsi
ini dipanggil LANGSUNG dari `setAsetTab('investasi')`/`renderPageContent('aset')`,
BUKAN lewat dispatcher `data-action` yang selalu toast — jadi kalau
`Investment.watchlistAlerts()`/`getWatchlist()` atau salah satu field item watchlist
(`w.name`/`w.type`/`w.lastPrice`/`w.targetPrice`) throw utk 1 entry data yang
tidak lengkap/rusak, exception itu jadi console error MURNI (tidak ada jalur
toast di pemanggil) DAN memutus alur setelahnya di pemanggil, persis gejala
"semua tombol di tab ini tidak bereaksi" yang dilaporkan.

**Fix:** `InvestmentWatchUI.render()` dibungkus try/catch dengan pola SAMA PERSIS
`InvestmentListUI._renderSummary()`/`_renderList()`:
- `Investment.getWatchlist()` gagal -> tampilkan empty-state "Gagal memuat daftar
  pantauan" (bukan biarkan exception lolos).
- `Investment.watchlistAlerts()` gagal -> fallback `alertIds` kosong (badge "Target
  tercapai" di-skip, list tetap dirender).
- 1 item watchlist gagal dihitung/dibaca -> fallback nilai aman + badge ⚠️ di baris
  itu (tetap bisa di-tap utk dibuka & dicek), TIDAK menjatuhkan seluruh `.map()`.

**Test baru:** `tests/investasi-watch-render-guard-audit-tombol-investasi.test.js`
(3 test baru — watchlistAlerts() throw, 1 item watchlist "beracun" via getter throw,
dan perilaku normal tanpa error tidak berubah).

**Verifikasi:**
- `node --check modules/asset/investasi-watch-view.js`: lolos.
- Test file baru: 3/3 pass. Test terkait investasi lain (s467/s469/s540b-d/s552/s614/
  s476a/ownership-sync-investasi/worthit-pricewatch): semua tetap pass, 0 regresi.
- Full suite: **4916 test, 4916 pass, 0 fail**.
- Build (`node scripts/build.js`) sukses, versi naik ke 1458 (s616), sintaks bundle
  lolos, `sw.js` CACHE_NAME ikut naik ke v1458 (paksa client ambil ulang bundle).

## ZIP
Patch (hanya file berubah — bukan full release): app-bundle-a.min.js,
app-bundle-b.min.js, app_production.html, index.html, sw.js,
modules/asset/investasi-watch-view.js,
tests/investasi-watch-render-guard-audit-tombol-investasi.test.js,
docs/COVERAGE-PER-MODULE.md, docs/FILE-MAP.md, docs/CLAUDE.md.

# Sesi Audit Lanjutan "Bug Serupa" (2026-08-30) — pola sama di PropertyManagementAPI

**Konteks:** Lanjutan audit sesi InvestmentWatchUI.render() (di atas) — user minta cari
bug SERUPA di tempat lain & akumulasikan ke patch yang sama.

**Diagnosa:** Pola bug yang sama (fungsi dipanggil di luar dispatcher data-action,
kalkulasi per-item TANPA try/catch, 1 item bermasalah menjatuhkan seluruh render tanpa
toast) ditemukan di `modules/asset/property-management-api.js`:
- `taxSummary()` — `PajakAset.hitungPBB(a, settings)` per item TIDAK dibungkus try/catch.
- `depreciationSummary()` — `Penyusutan.hitung(a)` per item TIDAK dibungkus try/catch.

Celah ini murni kelalaian, bukan perbedaan desain: `AssetMaintenanceAPI.
maintenanceOverview()` (file tetangga) sudah membungkus panggilan `Penyusutan.hitung()`
yang SAMA PERSIS sejak awal. `PropertyManagementAPI.summary()` (dipanggil
`PropertyManagementPresenter.render()`, yang dipanggil LANGSUNG dari
`renderPageContent('aset')`, sama seperti rantai InvestmentListUI.render()) berarti 1
aset properti dgn data yang bikin `hitungPBB()`/`Penyusutan.hitung()` throw akan
menjatuhkan seluruh render tab Aset dgn gejala yang sama: console error, 0 toast, tombol
tidak bereaksi.

Diaudit juga (tidak ada masalah, hanya untuk memastikan): `rental-management-api.js`
(reduce murni aritmatika, tidak ada panggilan eksternal per-item yang bisa throw),
`asset-portfolio-api.js` (map di array literal kecil, bukan data user), dan keempat
`render()` di 4 presenter Aset (property/rental/portfolio/maintenance) — semuanya sudah
guard `s.ok` sebelum render kartu, aman.

**Fix:** `taxSummary()` & `depreciationSummary()` dibungkus try/catch per item, pola
SAMA PERSIS `AssetMaintenanceAPI.maintenanceOverview()` — 1 item gagal fallback ke nilai
aman (PBB `terutang:0` + flag `error:true` / masuk hitungan `belumLengkap`), item lain
tetap dihitung normal.

**Test baru:** `tests/property-management-api-per-item-guard.test.js` (4 test —
taxSummary() 1 item throw, depreciationSummary() 1 item throw, summary() gabungan
tetap ok:true, dan perilaku normal tanpa error tidak berubah).

**Verifikasi:**
- `node --check modules/asset/property-management-api.js`: lolos.
- Test baru: 4/4 pass. `tests/asset-nav-consistency-s252.test.js` (cakupan 4 presenter
  Aset terkait): tetap 14/14 pass, 0 regresi.
- Full suite: **4920 test, 4920 pass, 0 fail**.
- Build sukses, versi naik ke 1459 (s617), sintaks bundle lolos, `sw.js` CACHE_NAME naik
  ke v1459.

## ZIP
Patch KUMULATIF dgn sesi InvestmentWatchUI.render() di atas (hanya file berubah — bukan
full release): app-bundle-a.min.js, app-bundle-b.min.js, app_production.html,
index.html, sw.js, modules/asset/investasi-watch-view.js,
modules/asset/property-management-api.js,
tests/investasi-watch-render-guard-audit-tombol-investasi.test.js,
tests/property-management-api-per-item-guard.test.js, docs/COVERAGE-PER-MODULE.md,
docs/FILE-MAP.md, docs/CLAUDE.md.
