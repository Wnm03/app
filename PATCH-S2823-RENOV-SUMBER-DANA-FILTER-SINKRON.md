# PATCH S2823 — Dana Proyek per sumber dana, filter Proyek/Sumber di Laporan, audit penanda sinkron (AKUMULATIF S2821 + S2822 + S2823)
Dasar: app-main__11_.zip (build ...-2832). Hasil build **2838**. Sumber: audit browser nyata (Chromium), data uji buatan sendiri.

## Temuan #3 — "Dana Proyek" bukan saldo dana proyek
- `modules/finance/tx-renov.js`: `renovProjectAccountIds`, `renovFundSource`, `renovFundBreakdown`, `renovProjectFund`. 1 SOT, tanpa field baru: rekening proyek = akun tempat DP/Termin klien masuk; penanggung/akun berpemilik = titipan; sisanya = talangan pribadi.
- `modules/home/renovasi.js`: Dana Proyek = DP/Termin masuk - belanja dari rekening proyek (+ item lunas tanpa catatan transaksi). Panel menampilkan "Sumber dana pembayaran item" (rekening proyek / talangan pribadi / titipan per pemilik). Label "Talangan pribadi" berdasar sumber nyata. CSV/PDF/Excel memakai angka yang sama. Tanpa helper -> perilaku lama.

## Temuan #4 — filter Proyek & Sumber Dana
- `index.html` (+cermin `app_production.html`): dropdown Proyek Renovasi + Sumber Dana Proyek di Laporan (`fProyek/fSumber`) dan Keuangan (`kfProyek/kfSumber`).
- `modules/finance/filter-laporan.js`: filter proyek (tx pembayaran + DP, "Tanpa proyek"), filter sumber (hanya pengeluaran proyek), populate, reset, prefs Keuangan. `pwa-ux-performance.js`: dropdown baru ikut lipatan filter Laporan.

## Temuan #5 — penanda tidak sinkron
- `tx-renov.js`: `renovMarkerAudit` (tanpa-penanggung, penanggung-asing, tanpa-proyek, proyek-hilang, payment-yatim, tanpa-payment) dan `renovRepairMarkers` (hanya mengisi penanggung bila akun tepat 1 pemilik).
- `renovasi.js`: peringatan + tombol "Periksa & Rapikan" (`Renov.repairMarkers`, rollback bila simpan gagal).

## Tes & gerbang
- `tests/s2823-...test.js`: 10 tes baru lulus. Browser (Chromium): Dana Proyek 16 jt, talangan 3 jt, titipan 1 jt Pak Budi, rapikan menyelesaikan 1 temuan, filter benar, 0 error JS.
- Suite penuh: 9.842 tes; satu kegagalan baru (S1854, guard refreshAfterMutation) sudah diperbaiki dan lulus; 3 kegagalan BAWAAN zip (S1780, s1608, S2308) tetap. verify-bundle-freshness, verify-window-expose OK, build --require-minify OK.

## Belum diuji / batasan
- Ekspor Excel/PDF di browser, akun 2 pemilik di browser, sinkron Google, tampilan visual panel (terhalang onboarding).
- Akun multi-pemilik tanpa penanggung tidak ditebak; pilih manual. Data lama tidak dimigrasi.
