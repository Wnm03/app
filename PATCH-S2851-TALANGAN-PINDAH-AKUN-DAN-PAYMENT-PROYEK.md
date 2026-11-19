# PATCH S2851 — Payment proyek yatim (modul Renovasi lazy), sinkron edit tagihan proyek, pindah akun talangan
Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2850 (zip ini kumulatif; build v2874). "renov" dan "home in" tidak digabung.

## Perubahan
| # | Perubahan | File |
|---|---|---|
| 1 | AKAR payment yatim: modul Renovasi dimuat lazy (`ensureRenov`). Bila belum pernah dibuka, cascade hapus/edit di Keuangan (`typeof Renov!=='undefined'`) lolos diam-diam -> payment item proyek, piutang talangan proyek, DP/refund tertinggal. Kini `delTx` dan `_saveTxInner` memuat modul dulu (`renovEnsureForTx`); gagal memuat = hapus/simpan dibatalkan dengan toast | finance/tx-renov.js, finance/tx-list-cashflow.js, finance/transaksi-b.js |
| 2 | Edit tagihan proyek lewat cabang tagihan/cicilan/langganan tidak menyinkron payment item (nominal/tanggal/akun basi). Kini `billRenovPaymentSyncOnEdit` memanggil `Renov.onLinkedTxEdited` | tx-renov.js |
| 3 | BUG lama: edit lewat modal di cabang umum menghapus `deductionOwnerId` pembayaran tagihan (dropdown pemilik tersembunyi pada akun satu pemilik) -> potong porsi berubah jadi pengeluaran pribadi. Kini tanda pemilik dipertahankan (`talanganKeepsOwnerOnEdit`) | tx-renov.js, transaksi-b.js |
| 4 | Pindah akun transaksi bayar tagihan titipan (`talanganSyncOnAccountChange`): talangan -> akun memuat porsi pemilik = potong porsi (piutang belum lunas dibatalkan, penanda dilepas); potong porsi -> akun tanpa porsi = talangan (penanda + piutang otomatis). Piutang sudah lunas / ada pelunasan sebagian: dibiarkan sebagai talangan + toast (pemasukan pelunasan tidak dihapus diam-diam) | tx-renov.js, transaksi-b.js |
| Tes | `s2851-talangan-pindah-akun-dan-payment-proyek.test.js` (11 tes) | tests |
| E2E | `e2e/s2851-pindah-akun-dan-payment-proyek.js` (Chromium 390×844, 14 pemeriksaan) | e2e |

`tagihan-kalender.js` tidak diubah (tetap 1599 baris). Item 6 goal-adapter: sudah selesai di S2845, tidak ada perubahan.

## Verifikasi
- Full suite TZ=UTC: 10112 tes, 10111 lulus, 0 gagal, 1 skip (sebelumnya 10101).
- Browser, backup wallpanel-rab, Renovasi belum dimuat: bayar BRI lalu hapus -> payment hilang, item belum lunas; bayar Cash (talangan) lalu hapus -> payment, piutang kembali awal; BRI->Cash lewat modal edit = talangan (piutang +Rp212.000); Cash->BRI = potong porsi (piutang hilang, tetap non-pribadi); edit nominal 250.000 -> payment ikut. Tanpa error JS. `e2e/s2850-proyek-talangan.js` tetap lulus (15), temuan payment yatim kini 0.

## Temuan / belum
- Edit lewat modal pada pembayaran tagihan melepas `billLinkId` dari transaksi (perilaku lama cabang umum, payMethod form tidak sama dengan jenis tagihan). Tidak diubah di sini; hook Cash->BRI sengaja tidak bergantung pada `billLinkId`.
- Dropdown "ditalangi" masih memuat semua pemilik Dana Titipan yang dikenal (S2850), belum disaring.
- Belum diuji: Android, Safari, Firefox.

## Terapkan
- Ekstrak zip di atas repo. Zip tidak bisa menghapus file: jalankan `node scripts/apply-delete-manifest.js` (atau build) bila `modules/modals.js` dan `modules/shop/modals.js` masih ada.
