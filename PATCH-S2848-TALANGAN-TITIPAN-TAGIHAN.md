# PATCH S2848 — Talangan titipan dari pembayaran tagihan (fase 1–4)

Tanggal: 19 November 2026. Basis: app-main_17 + patch kumulatif S2840–S2847. Aturan tetap: "renov" dan "home in" tidak digabung.

## Yang dikerjakan
Tagihan titipan "home in" yang dibayar dari akun TANPA porsi "home in" (mis. Cash) kini = **talangan**: piutang otomatis atas nama pemilik, transaksi keluar dari basis pribadi.
Potong porsi (akun memuat pemilik, mis. BRI) tidak berubah.

| Bagian | Perubahan | File |
|---|---|---|
| Fase 1 — helper | `billTalanganOwnerForPay`, `billTalanganPayMeta`, `billEnsureTalanganPiutang`, `billTalanganNote` | `finance/tx-renov.js` |
| Fase 2 — hook bayar | `markBillPaid`: bila pemilik tersimpan bukan pemilik akun sumber -> tx diberi `titipanLinkId`, `titipanTalangan:true`, `deductionOwnerId`; piutang dibuat dalam batas atomik yang sama; toast "Dicatat sebagai talangan ke home in Rp…" | `finance/tagihan-kalender.js` (tetap 1599 baris; hanya baris yang ada diubah) |
| Fase 3 — tampilan | kartu Pribadi/Titipan + chip "Talangan belum diganti: Rp… (per pemilik)" (`talanganBelumDiganti`); catatan Hub `catatanHubTalanganSafe` (hanya bila ada saldo); chip tagihan "🤝 home in · ditalangi"; Buku Piutang sudah menampilkan baris (🔒 otomatis) | `finance/tx-renov.js`, `finance/akun.js`, `dashboard-hub/dashboard-hub.js`, `shared/modules-render.js` |
| Fase 4 — pelunasan | Tandai lunas di Buku Piutang untuk piutang talangan -> pemasukan ke akun talangan, bertanda `talanganPelunasanOwnerId` (dikecualikan dari basis pribadi lewat `isAliranKlienSafe`); dibuka lagi -> pemasukan dibatalkan. Kategori pemasukan 'Piutang' dipastikan ada | `finance/tx-renov.js`, `finance/piutang-utang.js`, `finance/akun.js` |
| Basis pribadi | tanpa kode baru: `deductionOwnerId` non-SELF sudah dikecualikan oleh `isAliranKlienSafe` (S2845) | – |
| Tes | `tests/s2848-talangan-titipan-tagihan.test.js` (9 tes) | tests |
| Build | `node scripts/build.js --require-minify` -> v2867 (bundle, index.html, app_production.html, sw.js, FILE-MAP/COVERAGE) | build output |

## PENYIMPANGAN dari desain yang disetujui (perlu diketahui)
Desain memakai field baru `titipanOwnerId` / `titipanTxId`. Saat membaca kode ditemukan mekanisme talangan Dana Titipan **Sesi 519** yang sudah ada dan identik tujuannya:
`tx.titipanLinkId` + `tx.titipanTalangan===true` -> `maybeCreateTitipanTalanganPiutang()` -> piutang "Talangan Dana Titipan: <pemilik>" dengan `autoTxId` (1:1, idempotent) + `autoTitipanOwnerId`.
Edit nominal, ganti pemilik, dan hapus transaksi sudah menyinkronkan piutang itu (`syncTitipanTalanganPiutangOnEdit`, `removeUnpaidTitipanTalanganPiutangForTx`), dan agregasi Dana Titipan (`talanganTotal`) sudah membacanya. Jadi: **0 field baru**, `titipanTxId` diganti `autoTxId`, `titipanOwnerId` diganti `autoTitipanOwnerId`. Nama piutang memakai label yang ada ("Talangan Dana Titipan: home in"), bukan "Talangan titipan: home in – wallpanel"; nama tagihan ada di catatan.

## Verifikasi
- Tes baru 9/9 hijau. Full suite TZ=UTC: **10079 tes, 0 gagal** setelah build ulang (referensi S2847 tanpa build ulang: 2 gagal artefak build, kini hijau). Sebelum build ulang, 27 tes gagal karena gerbang kesegaran bundle — normal bila sumber berubah tanpa rebuild.
- Browser (Chromium 390×844, backup wallpanel-rab, 3 pembayaran):

| Kasus | Piutang home in | Pengeluaran pribadi bulan ini | Saldo akun |
|---|---|---|---|
| A. wifi, Cash, tanpa pemilik | – | +Rp50.000 | −50.000 |
| B. bpjs Rp72.500, Cash, pemilik home in (talangan) | **+Rp72.500** (4 -> 5 baris) | **tetap Rp1.607.580** | −72.500 |
| C. jajan Rp26.500, BRI, pemilik home in (potong porsi) | tidak ada | tetap | −26.500 |

  Kekayaan bersih netral (saldo −72.500, piutang +72.500; piutang masuk rumus). Hapus transaksi B mengembalikan semuanya (1276 transaksi, 4 piutang, piutang home in 0). Tanpa error JS.

## Hasil uji fase 3–4 (browser, backup wallpanel-rab)
- Setelah talangan Rp72.500: kartu Tagihan menampilkan "Talangan belum diganti: Rp 72.500 · 🤝 home in · Rp 72.500"; Hub: "Talangan belum diganti pemilik titipan Rp 72.500".
- Tandai lunas: saldo −1.713.649 -> −1.641.149 (kembali), piutang home in 72.500 -> 0, pemasukan Rp72.500 ke Cash bertanda non-pribadi. Dibuka lagi: pemasukan dibatalkan, piutang kembali 72.500, tanpa dobel. Tanpa error JS.
- Bug ditemukan & diperbaiki lewat uji ini: kategori pemasukan 'Piutang' tidak ada di backup -> `FINANCE_CATEGORY_UNRESOLVED`; kini dipastikan lewat `FinanceCategorySOT.ensureCategory`. (Jalur lama `createPiutangUtangAutoTx` untuk piutang bertaut manual memakai kategori yang sama dan tidak diubah di sini.)
- Full suite TZ=UTC: 10083 tes, 0 gagal.

## Belum / batasan
- **Tagihan tertaut Proyek Renovasi (mis. wallpanel di backup) tidak masuk hook ini.** Jalurnya memakai `resolveRenovBillOwner` + mekanisme sumber dana Renovasi sendiri (`setPaymentSource`). Uji B/C memakai tagihan biasa yang pemilik/akunnya diatur lewat skrip. Perlu keputusan bila tagihan proyek juga harus jadi talangan.
- Pelunasan sebagian: pakai edit nilai piutang yang ada; pemasukan dibuat sebesar nilai saat ditandai lunas.
- Butir §7 terjawab: pelunasan piutang hanya membuat pemasukan bila punya `linkedTxId`; piutang talangan (`autoTxId`) tidak, sehingga fase 4 menambahkannya.
- Toast ganda di uji hanya karena pembungkus toast dipasang berulang di skrip uji.
- Tidak diuji: Android, Safari/Firefox. Tanggal piutang = hari bayar (`todayStr()` bawaan S519), bukan tanggal bayar yang diisi.
