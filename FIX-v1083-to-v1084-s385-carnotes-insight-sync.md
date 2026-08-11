# FIX v1083 → v1084 (s385) — Sync AI Insight Pajak Kendaraan ↔ Transaksi Keuangan

## Konteks

Laporan gj: kartu 💡 AI Insight di tab Mobil/Car Notes masih menampilkan
reminder "STNK Tahunan jatuh tempo/sudah lewat" untuk kendaraan yang
pajaknya SEBENARNYA sudah dibayar — terjadi kalau pembayaran dicatat
manual lewat 💰 Tambah Transaksi di Keuangan (bukan lewat tombol ✅ Bayar
di modal Pajak Kendaraan, yang otomatis advance tanggal jatuh tempo).
`MobilInsight.compute()` cuma baca tanggal jatuh tempo tersimpan di data
kendaraan (`v[cfg.tglKey]`), tidak pernah cross-check ke `D.transactions`.

## Perubahan

- `modules/ai/feature-insights.js` — `MobilInsight.compute()`: sebelum
  push item pajak kendaraan (STNK Tahunan/Ganti Plat 5 Tahun/Uji
  Kelayakan) ke insight, cross-check dulu ke `D.transactions`. Kalau ADA
  transaksi `expense` dengan note yang mengandung label pajak (tanpa
  emoji, mis. "STNK Tahunan") + nama kendaraan, dan tanggal transaksi
  berada dalam rentang wajar di sekitar tanggal jatuh tempo saat ini
  (maks H-45 sebelum s/d H+30 sesudah tanggal jatuh tempo), item itu
  dianggap SUDAH DIBAYAR dan tidak ditampilkan lagi di AI Insight —
  walau field tanggal jatuh tempo kendaraan belum sempat ke-refresh.
  Bagian (2) insight SIM TIDAK diubah (di luar scope permintaan — SIM
  tidak punya pola pembayaran transaksi Keuangan yang konsisten).
- `app-bundle-a.min.js` — bundle produksi disinkronkan (kode
  `MobilInsight.compute()` di bundle ini identik dengan modul asli,
  bukan hasil minify-obfuscate, jadi perubahan sama persis).
- `index.html`, `app_production.html` — bump cache-busting query
  `?v=1083` → `?v=1084` di semua referensi script/style.
- `sw.js` — `CACHE_NAME` 'kw-cache-v1083' → 'kw-cache-v1084', supaya
  service worker fetch ulang bundle yang sudah diubah, bukan kepakai
  cache lama.
- `CHANGELOG.md` — entri Sesi 385 baru (prepend).

## Cara Kerja Matching

Karena transaksi manual di Keuangan tidak punya link eksplisit ke
record pajak kendaraan (beda dengan alur Tagihan yang pakai
`taxLink.key`), matching pakai heuristik note-based:

1. Transaksi harus bertipe `expense`.
2. `note` transaksi harus mengandung label pajak tanpa emoji (mis.
   "STNK Tahunan", "Ganti Plat", "Uji Kelayakan") **dan** nama
   kendaraan (`v.name`) — sama persis pola note yang otomatis dibuat
   `bayarPajakKendaraan()`, jadi transaksi dari tombol ✅ Bayar otomatis
   ketangkep juga (idempotent, tidak dobel-hitung apa pun karena ini
   hanya baca, bukan mengubah data).
3. Tanggal transaksi harus jatuh dalam window `[jatuh_tempo âˆ’ 45 hari,
   jatuh_tempo + 30 hari]` — cukup longgar untuk pembayaran yang
   dilakukan agak sebelum/sesudah tanggal resmi, tapi tidak melebar ke
   siklus pembayaran periode-periode sebelumnya yang sudah lama lewat.

Fallback aman: kalau tidak ada transaksi yang cocok, insight tetap
tampil seperti biasa — tidak ada risiko pajak yang BELUM dibayar
ikut ke-hide gara-gara false match.

## Belum Dikerjakan

- `getProactiveReminders()` di `vehicle-core.js` (reminder proaktif
  dashboard, bukan kartu AI Insight) masih murni baca tanggal jatuh
  tempo kendaraan, belum di-cross-check ke transaksi — di luar scope
  permintaan sesi ini (spesifik minta sync "di AI insight"). Bisa
  disamakan di sesi lanjutan kalau memang mau dikonsistenkan juga.
- Kalau user mengganti nama kendaraan setelah transaksi pembayaran
  lama dicatat, atau catatan transaksinya tidak menyebut nama
  kendaraan persis, sync berbasis note-matching ini bisa gagal cocok
  (fallback: insight tetap tampil apa adanya, bukan silent-hide).

## Verifikasi

- Sintaks `feature-insights.js` & `app-bundle-a.min.js` divalidasi via
  `new Function(source)` — lolos, tidak ada syntax error.
- Manual trace: kendaraan dgn `pajakTahunanTgl` H-10 dari hari ini +
  transaksi expense note `"STNK Tahunan - <nama kendaraan>"` bertanggal
  H-5 → item pajak tidak lagi muncul di `MobilInsight.compute()`.
  Kendaraan sejenis TANPA transaksi cocok → item tetap muncul seperti
  semula (regresi nol untuk kasus belum bayar).
