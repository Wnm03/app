# Sesi 312 — Fix: onDecode() per-frame ZXing mengabaikan error fatal
# + Audit docs pasca file-separation (scanner modules)

## Bug (kode) — sudah di v882
`onDecode(result, err)` di `vehicle-scanner.js` DAN `sparepart-scanner.js`
tidak pernah membaca parameter `err`. Fatal error (mis. izin kamera ditolak)
yang dikirim ZXing lewat callback per-frame ini (bukan lewat reject()
promise) sebelumnya tertelan diam-diam — overlay+kamera nyangkut permanen,
tanpa toast, tanpa ScannerSession.exit().

Fix: helper `vehicleScannerIsHarmlessDecodeError(err)` (true hanya utk
NotFoundException/ChecksumException/FormatException) + reuse di
`sparepartScannerIsHarmlessDecodeError()`. Error lain -> stop/reject +
toast error, pola menyesuaikan arsitektur masing-masing (VehicleScanner:
stop() langsung; SparepartScanner: reject(err) lewat catch block
`sparepartScannerScan()` yang sudah ada).

1753/1753 test pass, build s312/v882 sintaks valid.

## Temuan docs (diminta: cek design md pasca pemisahan file)

**PD-007 orphaned citation** — `docs/PRODUCT_DECISIONS.md § "Scanner —
Exclusive Scanner Mode via ScannerSession (FINAL — Sesi 316, PD-007)"`
dikutip PERSIS oleh 7 file (`scanner-session.js`, `vehicle-scanner.js`,
`sparepart-scanner.js`, `modal-navigasi.js`, `scripts/build.js`,
`tests/scanner-session.test.js`, & sekarang fix baru saya di
`vehicle-scanner.js`) seolah section itu ada di `PRODUCT_DECISIONS.md` —
padahal file itu berhenti di "Sesi 75" & NOL mention "scanner". Isi
keputusannya cuma pernah ditulis naratif di `CHANGELOG.md` § Sesi 317 &
`docs/NEXT_SESSION.md`, tidak pernah dipromosikan ke
`PRODUCT_DECISIONS.md` (yang judulnya sendiri "keputusan produk final,
permanen"). "PD-007" juga bukan bagian skema penomoran yang dipakai di
tempat lain (tidak ada PD-001..006 di mana pun) — kemungkinan tertinggal
saat salah satu sesi konsolidasi dokumentasi.

**Fix**: section PD-007 ditambahkan ke `PRODUCT_DECISIONS.md` (murni
konsolidasi dari CHANGELOG/NEXT_SESSION yang sudah final & sudah
diimplementasi — 0 keputusan baru). Doc-only, tidak menyentuh kode/versi
build.

**Belum saya sentuh, perlu diketahui:** ada anomali penomoran sesi yang
saya TIDAK coba selesaikan sendiri (STOP-and-report) — `docs/CLAUDE.md`
mencatat "Sesi 310" = hari ini (2026-07-29, cocok dgn ZIP awal Anda), tapi
`CHANGELOG.md`/`NEXT_SESSION.md` mencatat "Sesi 316/317" (migrasi
ScannerSession) sebagai sesuatu yang SUDAH SELESAI & terlihat jelas di
kode Sesi 310 hari ini. Kalau "Sesi N" itu penomoran tunggal berjalan
maju, 316/317 seharusnya terjadi SETELAH 310, bukan sebelum — tapi
kodenya sudah ada sekarang. Kemungkinan ada 2 skema penomoran berbeda
(atau reset sesi di suatu titik) yang saya tidak punya cukup konteks utk
memastikan. Saya juga menghindari label "Sesi 311/312" di
`APP_BUILD_VERSION` (dipakai murni sbg slug versi build, bukan klaim
sesi ke berapa) supaya tidak menambah kebingungan — tapi kalau Anda
punya konvensi tersendiri utk itu, kabari.

## Verifikasi
- `node --test tests/*.test.js` -> 1753/1753 pass (tidak berubah dari
  build sebelumnya — perubahan sesi ini setelah itu murni docs).
- Tidak perlu `node scripts/build.js` ulang (0 perubahan kode/JS setelah
  build v882 di atas) — `PRODUCT_DECISIONS.md` doc-only.
