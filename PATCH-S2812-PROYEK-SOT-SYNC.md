# PATCH S2812 — Proyek Renovasi: sinkron lintas fitur / 1 SOT (build 2812)
Basis: app-main (10). Audit browser Chromium 390x844 (form diisi, Simpan diklik).

## Perbaikan
1. ai-chat.js — "terbayar" proyek di prompt AI Chat memakai payments[] (sebelumnya hanya item.paid → cicilan hilang; contoh 1.000.000 vs 1.400.000 di layar Proyek).
2. modules/finance/tx-renov.js (unlinkTxRenovFromTx) — lepas tautan tx CICILAN lewat form Keuangan: baris payments[] dibuang, item.paid dihitung ulang, renovPaymentId ikut dilepas. Sebelumnya payment tetap dihitung, tx menyisakan renovPaymentId yatim, health "tautan cicilan tidak konsisten".
3. modules/finance/akun.js (delAcc) — hapus akun memigrasi item.accountId & payments[].accountId (+ snapshot rollback + deteksi hasLinkedData). Sebelumnya health "Item Renovasi dengan akun tidak valid".
4. tests/s2812-proyek-sot-sync.test.js (baru, 4 tes; 2 gagal di baseline).

## Bukti
- Audit browser ulang: 69 cek, 0 gagal, 0 error JS (sebelum fix: 3 temuan).
- Tes renovasi terkait: 97/97. Full suite: 9775/9779; 3 gagal sama dgn baseline (S1780, s1608, S2308: file orphan modals.js/shadow global-security ada di zip).
- Build resmi --require-minify → 2812, sintaks bundle valid.

## Belum terverifikasi
- payments[].accountId setelah hapus akun hanya diuji lewat kode, bukan browser.
- Keyboard Android, OCR, Import CSV, Laporan PDF.
- Observasi (tidak diubah): status proyek di LifeOS selalu 'active'.
Unggah SEMUA file di zip, bukan hanya HTML.
