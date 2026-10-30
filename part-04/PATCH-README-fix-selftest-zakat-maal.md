# Patch — Fix smoke-test "Rumus Zakat Maal konsisten dengan tampilan terakhir" (1 gagal dari 103)

## Root cause
Test di `self-test.js` menghitung ekspektasi `expectedHarta` pakai rumus
LAMA, sementara implementasi asli sudah di-update di sesi-sesi setelahnya
(`Zakat.hitungMaal()` — `modules/finance/pajak-pbb-zakat.js`) tanpa test-nya
ikut disinkronkan. Kode aslinya BENAR (sudah sesuai desain terbaru); yang
salah adalah ekspektasi di test.

Detail kesenjangan:
- **asetZakatable**: kode asli (Sesi 393/s476a/B8) exclude aset yang sudah
  ditautkan ke Holding Investasi (`_migratedToInvestmentId`/`investmentId`)
  supaya tidak dobel-hitung dgn `Investment.zakatableValue()`. Test lama
  menjumlah semua `a.zakatable` mentah tanpa exclude ini.
- **utang**: kode asli memprioritaskan `FI.totalDebt()` (Financial
  Intelligence, sumber kebenaran tunggal total utang) kalau modul itu
  tersedia. Test lama selalu pakai fallback manual
  (`utangJT + totalDebtValue() + totalCicilanOutstanding()`), padahal `FI`
  memang sudah dimuat di app ini sehingga hasilnya beda dari yang
  ditampilkan di layar.

## Fix
`self-test.js` — samakan rumus `expectedHarta` di test
"Rumus Zakat Maal (85gr emas & 2.5%) konsisten dengan tampilan terakhir"
persis dengan `Zakat.hitungMaal()`:
- `asetZakatable` ikut filter `!a._migratedToInvestmentId && !a.investmentId`
  + tambah `Investment.zakatableValue()` (guarded typeof).
- `utang` pakai `FI.totalDebt()` kalau tersedia, baru fallback ke rumus
  manual lama.

Tidak ada perubahan ke kode aplikasi (`pajak-pbb-zakat.js`) — murni
perbaikan test yang ketinggalan.

## Verifikasi
- `node scripts/build.js` → sukses, versi naik ke 1376, sintaks bundle valid.
- `node --test tests/*.test.js` → **4612/4612 pass, 0 fail**.
- Smoke-test internal app (`self-test.js`, halaman Pengaturan → Jalankan
  Tes) seharusnya sekarang **103/103** kalau dijalankan ulang di kondisi
  data yang sama seperti screenshot (sebelumnya 102/103, 1 gagal persis di
  test Zakat Maal ini).

## Cara pakai
Overlay SEMUA file di patch ini (termasuk kedua bundle — app ini load dari
`app-bundle-a/b.min.js`, bukan file source satu-satu, lihat catatan patch
sebelumnya) ke tempat app di-serve, lalu hard-refresh / pastikan Service
Worker ambil cache versi baru (`kw-cache-v1376`).

## File dalam patch
- `self-test.js` (fix utama)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (hasil rebuild)
- `index.html`, `app_production.html`, `sw.js` (sinkronisasi versi ?v=1376
  otomatis dari build tool)
- `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js`, `chat-action-handlers.js`
  (bump konstanta versi internal, otomatis dari build tool — 0 perubahan
  logic)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi dokumentasi
  otomatis, bukan kode jalan)
