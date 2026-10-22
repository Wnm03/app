# PATCH KUMULATIF S2619 — Shop Import, DP/Piutang, Omzet Ongkir (Rebased v2627)

## Identitas dan lineage
- Baseline resmi: `app-main (33).zip`.
- Riwayat akumulasi yang dipertahankan: Dashboard Audit S2616, Finance S2617, Shop S2618, implementasi target S2619.
- Build akhir: `s2595-carnotes-null-interval-guard-2627`; cache `kw-cache-v2627`.
- Patch disusun ulang dari baseline setelah audit menemukan overlay lama menimpa HTML dari lineage berbeda dan menghilangkan elemen baseline.
- Tidak ada migrasi destruktif atau penulisan ulang massal data pengguna.

## Koreksi lineage yang dilakukan
- `index.html` dipulihkan dari baseline dan perubahan yang diperlukan digabungkan secara aditif; elemen laporan lama seperti `lapAccList`, `periodeChips`, `lapMonthNav`, `lap-subtabs`, dan subtab Dana Titipan dipertahankan.
- Kontrol omzet termasuk/tanpa ongkir dan kontainer BI Shop ditambahkan kembali tanpa mengganti seluruh halaman dengan HTML yang kehilangan fitur.
- Kartu Ownership Summary dan Cross Summary yang duplikatif/menyesatkan di Dashboard Hub dihapus sesuai audit dashboard S2616.
- CSS tambahan dashboard dipindahkan ke `modern-ui-layer.css`; guard FAB yang menjadi kontrak lama dipertahankan di `styles.css`. Ukuran `styles.css`: 178,111 byte, di bawah batas 180,000 byte.
- `app_production.html` dan kedua bundle dibangun ulang dari sumber yang telah direkonsiliasi; versi/cache konsisten v2627.
- Kontrak tes historis diperbarui hanya pada titik yang berubah secara disengaja: label status transfer generik, delegasi posting pembayaran ke helper bersama, label markup, argumen `setShopTab`, dan grup kontrol omzet.

## Implementasi target S2619
### Impor Etalase
- Paste, CSV, PDF, dan scan menggunakan `ShopDataIO.commitShopRows()`.
- Jalur Excel Etalase diarahkan ke mekanisme commit bersama, sementara parser per format tetap dipertahankan.
- JSON tetap memakai kontrak backup/restore khusus untuk mode gabung/timpa; tidak dipaksa ke commit baris biasa.
- Kolom harga reseller kosong tidak menimpa nilai lama; validasi dan pratinjau tetap perlu dijalankan dalam browser nyata untuk alur file penuh.

### DP/piutang Kasir–Order
- Orkestrasi pembayaran dipusatkan di `syncShopSalePayment()`.
- Penulisan transaksi memakai `FinanceTxSOT`; piutang memakai `BillDebtPiutangCanonicalWriter`.
- Kontrak lama dipertahankan: DP kosong dianggap lunas penuh; DP dibatasi 0..total; saldo `max(0,total-DP)`; relasi menggunakan `piutangLinkId`.
- Jika tautan piutang lama ada tetapi record hilang dan saldo masih tersisa, edit Order ditolak sebelum mutasi stok/order; tidak membuat piutang pengganti otomatis pada keadaan ambigu.
- Batas terbuka: stok/order dan posting keuangan/piutang belum dibuktikan sebagai satu transaksi atomik lintas seluruh koleksi. Full rollback pada kegagalan runtime perlu E2E/integrasi khusus.

### Omzet termasuk/tanpa ongkir
- Menambahkan pilihan runtime `Termasuk ongkir` / `Tanpa ongkir` di laporan Shop.
- `Laporan.revenueAmount()` menjadi proyeksi bersama untuk ringkasan riwayat/laporan, pelanggan/top-pelanggan, ekspor, dan `ProfitEngine.summarize()`.
- Pilihan bersifat read-only terhadap transaksi sumber; default tetap termasuk ongkir untuk kompatibilitas.
- Record lama tanpa rincian ongkir tidak direkonstruksi dengan tebakan; mode tanpa ongkir mempertahankan total tersimpan untuk record tersebut dan menandai keterbatasan data.
- Omzet produk dan keuntungan tetap mengikuti definisi yang ada; tidak ditulis ulang.

## Verifikasi aktual
- Tes suite penuh resumable/sharded: **9,110 tests; 9,109 pass; 0 fail; 0 cancelled; 1 skipped; 0 todo**. Semua 32 checkpoint lulus integritas.
- Tes target terpilih setelah rebase: **82/82 PASS**; tes tambahan kontrol omzet/segmented: **18/18 PASS**.
- Build produksi/minifikasi: **PASS**, v2627; kedua bundle lolos `node --check`.
- `verify-window-expose`: **PASS**, 84 modul `data-action` ter-expose.
- `verify-bundle-freshness`: **PASS**, hash source/bundle cocok.
- `verify-source-size --strict`: **PASS**, dengan 3 peringatan ukuran file yang masih dalam guard cap.
- ESLint file terkait: **0 error, 74 warning**; warning `no-unused-vars` yang sudah ada/dispatcher-global tetap dilaporkan.
- `refresh-file-hashes.py --check`: **PASS**, 48 entri cocok, tidak ada path hilang atau hash basi.
- Browser E2E: **BLOCKED oleh kebijakan lingkungan** (`net::ERR_BLOCKED_BY_ADMINISTRATOR` saat navigasi origin lokal). Ini bukan bukti bug, tetapi bukan pula bukti alur Shop sudah lulus E2E.

## Status rilis
**PARTIAL — suite penuh lulus, build dan integritas bundle lulus, tetapi deploy-ready belum boleh diklaim** karena browser E2E untuk impor, pembayaran/edit piutang, dan mode omzet belum dapat dijalankan. Risiko atomisitas lintas koleksi tetap terbuka.

## Aturan artefak
ZIP final hanya berisi file baru/berubah dibanding baseline `app-main (33).zip`, termasuk manifest, catatan audit, dan bukti yang relevan. Tidak memasukkan `node_modules`, checkpoint tes, backup build, log sementara, atau ZIP bersarang.
