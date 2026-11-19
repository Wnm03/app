# PATCH S2850 — Talangan titipan: tagihan Proyek Renovasi non-klien + dropdown pemilik "ditalangi"
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2849 (zip ini kumulatif; build v2871). "renov" dan "home in" tidak digabung.

## Perubahan
| # | Perubahan | File |
|---|---|---|
| 1 | Tagihan tertaut Proyek Renovasi NON-klien kini menghormati pemilik tersimpan. Dibayar dari akun yang tidak memuat porsi pemilik itu (Cash/Gopay) = talangan (meta S2848, piutang otomatis, toast), TANPA dialog pemilik, dan pembayaran tetap tertaut ke item proyek (`applyRenovBillPayment`). Sebelumnya `resolveRenovBillOwner` memilih pemilik akun (SELF) dan membuang home in -> masuk pengeluaran pribadi tanpa piutang. Proyek `dana==='klien'` = perilaku lama. Untuk usulan B dipilih "biarkan" (tanpa peringatan tambahan) | finance/tx-renov.js (`billRenovTalanganMeta`), finance/tagihan-kalender.js (hook `markBillPaid`, 0 baris tambahan) |
| 4 | Dropdown pemilik form Tagihan menawarkan "🤝 <nama> (ditalangi)" untuk pemilik Dana Titipan yang TIDAK punya porsi di akun terpilih, disisipkan sebelum "➕ Tambah / kelola pemilik akun…". Akun yang memuat porsinya (BRI) tidak menandainya; proyek klien tidak menawarkannya. Pilihan tersimpan dipertahankan saat akun/proyek berganti | finance/tx-renov.js (`billTalanganOwnerChoices`, `updateBillRenovOwnerVisibility`) |
| + | Audit penanda proyek (`renovMarkerAudit`) tidak lagi menandai transaksi talangan (`titipanTalangan===true`) sebagai "penanggung-asing"; non-talangan tetap ditandai | finance/tx-renov.js |
| Tes | `s2850-talangan-tagihan-proyek-dan-dropdown.test.js` (6 tes). `s2848-talangan-titipan-tagihan.test.js` disesuaikan: satu assert mengecek teks hook lama (`_talMeta`), kini mengikuti bentuk baru | tests |
| E2E | `e2e/s2850-proyek-talangan.js` (Chromium 390×844, 15 pemeriksaan) | e2e |

`tagihan-kalender.js` tetap 1599 baris (gate 1600). Build: v2871 (bundle, html, sw.js, stempel versi di beberapa modul ikut berubah).

## Verifikasi
- Full suite TZ=UTC: 10101 tes, 10100 lulus, 0 gagal, 1 skip (sebelumnya 10095).
- Browser, backup wallpanel-rab: form tagihan RAB wallpanel dipindah ke Cash, home in dipilih lewat dropdown baru -> tersimpan; bayar (`markBillPaid`) tanpa dialog pemilik -> piutang home in +Rp212.000, pengeluaran pribadi tetap, saldo Cash −Rp212.000, payment tertaut ke item proyek, toast talangan, kartu Tagihan menampilkan "Talangan belum diganti", tanpa overflow horizontal. Hapus transaksi -> saldo Cash, pengeluaran pribadi, dan piutang kembali ke awal. Proyek klien dibayar -> tanpa piutang talangan otomatis. Tanpa error JS.
- Pembayaran dipicu lewat `markBillPaid` (bukan klik tombol Bayar).

## Temuan / belum
- **Payment yatim (bukan dari patch ini):** menghapus transaksi bayar tagihan proyek meninggalkan payment di item proyek. Terjadi juga pada baseline tanpa S2850 (dicek pada tagihan non-talangan di BRI). Belum diperbaiki.
- Dropdown "ditalangi" memuat semua pemilik Dana Titipan yang dikenal (di backup uji termasuk "Aku", "istri", "Investor"); tidak ada penyaringan lebih lanjut.
- Belum: item 6 (`lifeos/adapters/goal-adapter.js`), pindah akun transaksi talangan saat edit, Android/Safari/Firefox.

## Terapkan
- Ekstrak zip di atas repo. Hapus manual bila masih ada: `modules/modals.js` dan `modules/shop/modals.js` (sisa lama; build di sini menghapusnya, dan tes S1780/s1608 gagal bila ada). Zip tidak bisa menghapus file.
