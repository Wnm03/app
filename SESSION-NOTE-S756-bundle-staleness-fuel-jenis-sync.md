# S756 — Fix: Harga per Liter & Volume BBM tidak sync saat Jenis BBM dipilih

## Gejala (laporan user)
Di modal "Catat Isi BBM" (Kendaraan → BBM): dropdown "Jenis BBM" sudah
dipilih (mis. Pertamax), tapi field "Harga per Liter" tetap menampilkan
harga jenis lain (mis. Rp 10.000, harga Pertalite), padahal hasil "Cek
Update Harga BBM via AI" mengonfirmasi harga Pertamax yang TERSIMPAN sudah
benar (Rp 15.950). Field "Volume BBM (Liter)" juga tidak ikut terhitung
otomatis dari Total Biaya ÷ Harga.

## Root cause (ditemukan lewat audit, bukan asumsi)
BUKAN bug logika di source. Source (`car-notes.js`, `modules/vehicle/
fuel-price-ref.js`, `modules/shared/modals.js`, `modules/finance/
tx-bbm.js`) sudah benar sejak Sesi 755 — `FuelPriceRef.populateSelect()`
dan `FuelPriceRef.onSelectChange()` sudah menerima parameter `vehicleId`
supaya tiap kendaraan punya jenis BBM default sendiri
(`D.fuelPriceRef.lastTypeByVehicle`).

Masalahnya: **`app-bundle-a.min.js` & `app-bundle-b.min.js` — file yang
BENERAN dimuat browser lewat `index.html`/`app_production.html` — tidak
pernah di-rebuild setelah Sesi 755.** Bundle yang ter-upload masih berisi
versi PRA-755:
- `FuelPriceRef.onSelectChange(selectId, hargaId)` — 2 parameter, TANPA
  `vehicleId`.
- `FuelPriceRef.populateSelect(selectId)` — TANPA `vehicleId`.
- `D.fuelPriceRef` default object TANPA field `lastTypeByVehicle`.
- Markup `bbmModal`/`txBbmFields` (dibundel dari `modals.js`) memanggil
  `onchange="FuelPriceRef.onSelectChange('bbmJenis','bbmHarga')"` — tanpa
  `curVehicleId` di argumen ke-3.

Ini persis pola bug yang sudah pernah terjadi & didokumentasikan sendiri
di `scripts/verify-bundle-freshness.js` (rujukan insiden S326→S328):
source sudah benar, tapi bundle produksi lupa di-rebuild sebelum upload,
sehingga app sungguhan menjalankan logika lama. `node scripts/build.js`
sempat dijalankan sesi 755 (lihat `SESSION-NOTE-S750-fuel-jenis-
dropdown.md` dkk.), tapi hasil build terbaru rupanya tidak ikut ter-upload
ke lokasi yang dipakai `wnm03.github.io/app/` — bundle di repo/zip yang
diaudit sesi ini masih versi 1412/1585-lama (belum lolos
`verify-bundle-freshness.js`).

Dampak konkretnya ke gejala yang dilaporkan: dengan `onSelectChange`
versi lama (tanpa vehicleId), sinkronisasi jenis→harga per-kendaraan yang
dimaksud Sesi 755 tidak jalan — kendaraan lain bisa "mewarisi" `lastType`
global yang salah, dan field harga tidak konsisten dengan jenis yang
tampil di dropdown. Karena harga salah, cabang `syncHargaChanged()` yang
harusnya menghitung ulang Volume dari `Total Biaya ÷ Harga` juga ikut
menghasilkan angka yang salah/tidak ke-trigger sesuai ekspektasi user.

## Fix
Tidak ada perubahan logika baru. Fix murni menjalankan ulang
`node scripts/build.js` dari source yang sudah benar, supaya bundle
produksi kembali sinkron dengan source:
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild total.
- Versi disamakan otomatis oleh build.js dari `s754-fuel-jenis-unknown-
  edit-legacy` → `s755-fuel-jenis-unknown-edit-legacy` di 5 file source
  (`modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js`) — cuma bump
  konstanta versi, TIDAK ada perubahan logika.
- `index.html`, `app_production.html`, `sw.js` — query version (`?v=`)
  & `CACHE_NAME` dinaikkan ke 1586 supaya browser/PWA cache tidak
  menyajikan bundle lama yang sudah basi ke user.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis oleh build.js (dokumentasi, tanpa dampak fungsional).

## Verifikasi
- `node scripts/build.js` — build sukses, sintaks kedua bundle valid.
- `node scripts/verify-bundle-freshness.js` — **✓ kedua bundle segar**
  (sebelumnya akan gagal kalau dijalankan terhadap bundle lama).
- `grep -o "FuelPriceRef.onSelectChange([^)]*)" app-bundle-a.min.js` —
  sekarang menghasilkan `FuelPriceRef.onSelectChange('bbmJenis',
  'bbmHarga',curVehicleId)` (match source, sebelumnya tanpa
  `curVehicleId`).
- `node --test tests/*fuel*.test.js` — 461/465 pass. 4 gagal adalah test
  LAMA sesi S750 (`fuel-jenis-dropdown-s750.test.js`,
  `fuel-ref-modal-s751/752.test.js`) yang meng-assert signature 2-parameter
  (pra-755) secara verbatim di source — ini staleness test yang SUDAH ADA
  sebelum sesi ini (tidak disebabkan oleh fix ini; source memang sudah
  berubah ke 3-parameter sejak S755, test-nya yang belum di-update
  mengikuti). Di luar scope sesi ini (1 sesi = 1 task); direkomendasikan
  jadi task terpisah: update assertion di 4 file test tsb. ke signature
  3-parameter yang benar.

## Rekomendasi tambahan (tidak dikerjakan sesi ini)
Pertimbangkan menambahkan `node scripts/verify-bundle-freshness.js`
sebagai langkah wajib (CI/pre-upload hook) supaya insiden bundle-basi
seperti ini (S326→S328, dan sekarang S755→S756) tidak terulang lagi
tanpa terdeteksi sebelum sampai ke user.
