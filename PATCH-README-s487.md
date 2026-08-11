# PATCH s486 → s487 — BUG-004 (TODO.md): Badge Cara Bayar Tagihan/Utang

Ringkasan lengkap: `s487-SESSION-NOTE.md`.

## Status

- **3178/3178 test PASS** (naik dari 3172, +6 test baru, 0 regresi).
- `node scripts/build.js s487-pmicons-badge-tagihan-utang` sudah
  dijalankan: `?v=1215` → **`?v=1216`**, `CACHE_NAME` →
  `kw-cache-v1216`.
- `node scripts/verify-release-ready.js`: **LOLOS** (gate `html-sync`
  hijau otomatis; `lint`/`minify` di-override manual, sandbox tanpa
  akses jaringan npm — tercatat di `docs/RELEASE-GATE-LOG.md`).

## Isi (fix + housekeeping TODO.md)

Fix: `pmIcons` (`modules/finance/tx-list-cashflow.js`) ditambah
`tagihan:'🧾'`/`utang:'📕'` — sebelumnya badge kartu transaksi utk
pembayaran Tagihan/Utang tampil tanpa ikon. `TODO.md` juga diperbarui:
5 item lain di tabel yang sama ternyata sudah lama diperbaiki di sesi
lampau tapi belum ditandai selesai (stale-doc), ditandai ✅ DONE dgn
referensi lokasi fix di source.

## Cara apply patch

Timpa semua file di atas ke atas baseline S486 (`v1215`,
`kw_release_v1215_s486-case-f-partial-return-FINAL.zip`).
