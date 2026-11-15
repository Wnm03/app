# PATCH S2824 — Import CSV Renovasi bisa membaca hasil Export CSV sendiri (AKUMULATIF S2821 + S2822 + S2823 + S2824)
Dasar: S2823 (build 2838) -> build 2839. Sumber: audit E2E browser nyata (Chromium), data uji buatan sendiri.

## Temuan
Export CSV proyek menulis beberapa seksi (`=== IDENTITAS PROYEK ===`, RINGKASAN, DP / TERMIN, DAFTAR ITEM, RIWAYAT CICILAN). Import CSV membaca header Item/Harga hanya dari baris pertama, jadi file hasil export sendiri tidak memasukkan item sama sekali (tanpa dialog preview).

## Perbaikan
- `modules/home/renovasi.js`: helper baru `Renov._csvItemSection(rows)`. Bila baris pertama bukan header dan file punya seksi `===`, import memakai seksi DAFTAR ITEM (berhenti di baris kosong / seksi berikut). CSV polos (header di baris pertama) diproses persis seperti sebelumnya. Nomor baris pada pesan "baris tidak valid" kini memakai offset seksi.
- Seksi RIWAYAT CICILAN (juga punya kolom Item+Nominal) tidak salah terbaca sebagai daftar item.

## Tes & gerbang
- `tests/s2824-renov-import-csv-seksi-export.test.js`: 6 tes baru lulus. Tes renov terkait: 164 lulus.
- Browser (Chromium): export utuh -> "Import 5 item" -> 5 item benar; impor ulang -> terdeteksi duplikat (0 tambahan); CSV polos "Item,Harga" -> 2 item; 0 error JS.
- Suite penuh: 9.848 tes, 3 gagal BAWAAN zip (S1780, s1608, S2308) sama seperti S2823. verify-bundle-freshness OK, verify-window-expose OK, `build --require-minify` OK.

## Belum dikerjakan / diketahui (dari audit E2E yang sama)
- Bayar Tagihan tertaut proyek membuat item BARU (`billLinkId`), bukan mengisi item RAB yang sudah ada -> total rencana bisa dobel.
- Pengeluaran bertanggal masa depan langsung memotong saldo hari ini; transaksi tagihan berkategori "Tagihan", bukan "Renovasi".
- Import CSV hanya membawa item rencana (DP/Termin, cicilan, status lunas tidak ikut).
- Export/Import Excel & PDF belum teruji di browser (pustaka dari CDN).
