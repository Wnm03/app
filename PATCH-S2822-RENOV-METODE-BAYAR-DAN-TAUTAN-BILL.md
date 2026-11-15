# PATCH S2822 — Metode bayar Renovasi jujur + cicilan/tagihan tertaut Proyek Renovasi (AKUMULATIF di atas S2821)
Dasar: app-main__11_.zip (build ...-2832). Isi: PATCH-S2821 (nominal ketat + lazy diagnostik, build 2835) + perbaikan temuan audit #1–#2 → build **2836**.
Sumber: audit browser nyata (Playwright/Chromium), data uji buatan sendiri.

## Temuan #2 — metode pembayaran tercatat tidak jujur
- `modules/home/renovasi.js`: pembayaran item mode **Cicil** kini `payMethod:'cicilan'` (dulu selalu `tunai`); mode Cash/Lunas tetap `tunai`. DP/Termin klien kini `tunai` (dulu `transfer`, tak ada di dropdown Metode).
- `modules/finance/filter-laporan.js`: `_txPayMethodForFilter()` — `transfer` lama (DP yang sudah tersimpan) dihitung `tunai` di filter Metode, jadi data lama tidak lolos dari semua filter tanpa migrasi. Metode lain (mis. `debit`) tetap dibandingkan apa adanya.

## Temuan #1 — cicilan & tagihan proyek tidak tertaut ke proyek
Akar: tautan proyek hanya lahir dari jalur transaksi tunai; pembayaran cicilan (modal Transaksi) dan tombol Bayar di Tagihan membuat transaksi kategori Renovasi tanpa `renovProjectLinkId` dan tanpa `deductionOwnerId`.
- Bill (`D.bills`) boleh membawa `renovProjectLinkId` + `deductionOwnerId`.
- Form Tagihan (`modules/shared/modals.js`): pilihan **🔨 Proyek Renovasi (opsional)** + **Pemilik/Penanggung** (muncul untuk akun berpemilik). Handler di `tx-renov.js`.
- `tagihan-kalender.js` `markBillPaid`: bill bertaut → tentukan penanggung SEBELUM mutasi (tersimpan di bill → pemilik tunggal otomatis → akun multi-pemilik ditanya; batal = pembayaran batal), transaksi membawa `renovProjectLinkId`+`deductionOwnerId`, dan tiap pembayaran jadi **payment** pada 1 item proyek per bill (`item.billLinkId`). Snapshot atomik kini mencakup `renovProjects`.
- `transaksi-b.js`: cicilan baru dari modal Transaksi dengan panel "Catat juga ke Proyek Renovasi" dicentang → bill + transaksi pertama tertaut proyek (+ payment).
- `tx-renov.js`: `applyRenovBillPayment`, `resolveRenovBillOwner`, `getTxRenovPanelProject` (+ helper form Tagihan). Hapus/edit transaksi ikut menyinkronkan payment lewat `Renov.onLinkedTxDeleted/Edited` yang sudah ada.
- Hasil: "Terbayar" proyek ikut menghitung cicilan/tagihan; potongan akun titipan punya penanggung. Harga item cicilan = porsi per periode × tenor; tagihan berulang mengikuti total terbayar.

## Tes & gerbang
- `tests/s2822-renov-metode-bayar-dan-tautan-bill.test.js`: 8 tes baru lulus. `tests/s2196-finance-cross-entity-atomicity.test.js`: string kunci atomik diperbarui (+`renovProjects`).
- Browser (Chromium, 19 cek): metode bayar, filter, form Tagihan, bayar tagihan akun titipan 1 pemilik, dialog pilih penanggung akun 2 pemilik, cicilan via modal Transaksi → cicilan ke-2 masuk item yang sama, hapus transaksi menghapus payment, 0 error JS.
- Suite penuh: 9.832 tes, 9.828 lulus, 3 gagal BAWAAN zip (S1780 DELETE-FILES, s1608 modules/modals.js orphan, S2308 shadow global-security) — sama seperti catatan S2821.
- verify-bundle-freshness OK, verify-window-expose OK, verify-source-size --strict OK (tagihan-kalender.js 1596 ≤ 1600), `node scripts/build.js --require-minify` OK (2836).

## Belum dikerjakan / batasan
- Temuan #3–#5 (panel Dana Proyek per sumber dana, filter Proyek di Laporan, sinkron 3 penanda) sengaja tidak disentuh.
- Edit bill lewat modal Transaksi (cabang edit cicilan/tagihan lama) tidak mengubah tautan proyek bill; ubah lewat form Tagihan.
- Bill yang SUDAH ada tidak ditautkan otomatis (tak ada tebakan proyek); buka Edit Tagihan dan pilih proyek. Pembayaran lama tidak dimigrasi.
- Transaksi cicilan/tagihan lama berkategori Renovasi tetap bisa ditautkan manual lewat "🔗 Hubungkan Transaksi Lama".
