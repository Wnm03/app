# PATCH S2849 — Talangan titipan: tanggal piutang, pelunasan sebagian, sinkron edit/hapus
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2848 (zip ini kumulatif; build v2870). "renov" dan "home in" tidak digabung.

## Perubahan
| # | Perubahan | File |
|---|---|---|
| 2 | Tanggal piutang talangan = tanggal bayar transaksi (fallback `todayStr()`) | finance/piutang-utang.js |
| 3 | Piutang talangan: nilai = SISA. Nilai turun -> dialog "catat pelunasan sebagian" (pemasukan non-pribadi sebesar selisih, bertanda `talanganPiutangId`) atau "hanya koreksi". Lunas = pemasukan sebesar sisa tersimpan (nilai ketikan diabaikan). Piutang lunas: nilai terkunci. `Piutang.save` kini async (`withSaveGuardAsync`) | finance/piutang-utang.js, finance/tx-renov.js (`talanganPartialTxs`, `talanganIsPiutang`, `talanganPayoffCreate(p,nilai,tgl)`) |
| 5a | Hapus pemasukan pelunasan langsung: akhir -> piutang dibuka lagi; sebagian -> sisa bertambah (bila sudah lunas: dibuka dengan sisa = nilai sebagian) | tx-renov.js `talanganPayoffTxDeleted`, finance/tx-list-cashflow.js |
| 5b | Hapus transaksi talangan ikut menghapus pelunasan sebagian (tanpa pemasukan yatim) | piutang-utang.js `removeUnpaidTitipanTalanganPiutangForTx` |
| 5c | BUG: edit nominal tx talangan tertaut tagihan lewat txModal tidak menyinkron piutang (cabang tagihan/cicilan/langganan return sebelum sync) dan `deductionOwnerId` bisa terhapus. Kini sinkron (`talanganSyncOnTxEdit`) dan penanda pemilik dipertahankan | finance/transaksi-b.js, tx-renov.js |
| Tes | `s2849-talangan-tanggal-dan-pelunasan-sebagian.test.js` (12 tes); s2848 disesuaikan (`talanganPayoffCreate(p,p.nilai)`) | tests |
| E2E | `e2e/s2849-ui-penuh.js` (Chromium 390×844) | e2e |

`tagihan-kalender.js` tidak diubah (tetap 1599 baris).

## Verifikasi
- Full suite TZ=UTC: 10095 tes, 0 gagal, 1 skip (baseline 10083).
- Browser, backup wallpanel-rab, alur UI: form tagihan (modal) Cash -> ✅ Bayar (tanggal 5 hari lalu) -> piutang +100.000 bertanggal sama, pribadi tetap, chip/kartu/Hub/Buku Piutang tampil -> sebagian 30.000 -> koreksi -> lunas (pemasukan = sisa 65.000) -> terkunci -> dibuka lagi -> hapus pelunasan langsung -> edit nominal 100.000->120.000 (piutang +20.000) -> hapus tx talangan (saldo, pribadi, piutang kembali awal). Tanpa error JS, tanpa overflow horizontal.

## Temuan / belum
- **Item 1 (tagihan proyek Renovasi) BELUM diubah, menunggu keputusan.** Proyek wallpanel tidak punya `dana`; mekanisme sumber dana Renovasi tidak aktif. Tagihan proyek dengan pemilik tersimpan home in dibayar dari Cash/Gopay: `resolveRenovBillOwner` memilih pemilik akun (SELF) dan membuang home in -> masuk pengeluaran pribadi, tanpa piutang. Usulan A: hormati pemilik tersimpan + talangan S2848 untuk proyek non-klien; B: proyek klien jangan otomatis (hindari dobel dengan `renovPaymentId`).
- Dropdown pemilik form tagihan di akun Cash tidak menawarkan home in (hanya pemilik akun) -> talangan tak bisa dibuat dari form baru; usulan: tampilkan pemilik titipan berlabel "ditalangi". Belum diubah.
- Batasan: piutang lunas yang transaksi talangannya dihapus tetap sebagai riwayat (invarian S519); memindah akun transaksi talangan saat edit belum ditangani; item 6 (goal-adapter) tidak disentuh; Android/Safari/Firefox tidak diuji.
