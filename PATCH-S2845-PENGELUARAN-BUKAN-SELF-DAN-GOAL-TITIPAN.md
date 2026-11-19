# PATCH S2845 (akumulasi di atas S2840–S2844)
Basis: app-main_17. ZIP kumulatif S2840–S2845, hanya file yang berubah. Identitas "renov" dan "home in" TIDAK digabung.

## Keputusan n (dari HANDOFF S2844 §4)
1. Apa pun yang bukan porsi SELF = bukan pengeluaran pribadi -> dikeluarkan dari basis pribadi. Basis fisik tetap lengkap; daftar transaksi & histori akun tidak berubah.
2. Tidak tanya pemilik saat bayar tagihan non-proyek di akun multi-pemilik (pemilik tersimpan di tagihan tetap dibawa). Tidak ada perubahan kode.
3. goalSourceDebt tidak lagi memuat utang "Dana titipan akun" (linkedAccountId), pola S2843.

## Perubahan
- finance/akun.js: helper `isTxDeductionNonSelfSafe(t)` (deductionOwnerId non-kosong, bukan 'SELF', dan pemilik tsb bukan isSelf pada akun tx) dipanggil dari `isAliranKlienSafe` (dengan guard typeof). Semua agregat pribadi (Keuangan, Laporan, Hub, budget, zakat, PPh21, proyeksi kas, insight) ikut. `isAliranKlienOnlySafe`/badge klien tidak tercemar.
- lifeos/adapters/goal-adapter.js: `goalSourceDebt` menambah `!d.linkedAccountId`.
- tests/s2845-pengeluaran-bukan-self-dan-goal-titipan.test.js (4 tes baru).
- e2e/dana-proyek-browser/full.js, sweep2.js: `catch(e){}` kosong -> `catch(e){void e;}` (gate v22).

## Verifikasi
- `node scripts/build.js --require-minify` lolos (versi 2862).
- Full suite TZ=UTC: 10064 tes, 10063 lulus, 0 gagal, 1 skip.
- WAJIB di repo asli: `node scripts/apply-delete-manifest.js` (modules/modals.js dan satu file lain sisa ZIP, tercantum di DELETE-FILES.txt).

## Dampak perilaku
Pembayaran tagihan titipan (mis. wallpanel Rp212.000, porsi "home in") dari akun BRI tidak lagi dihitung pengeluaran pribadi; Kekayaan Bersih/saldo tidak berubah (saldo fisik tetap berkurang).

## Belum
Uji browser alur form tagihan baru (BRI -> home in otomatis -> bayar -> deductionOwnerId; Cash -> pribadi), Android, Safari/Firefox, upload build resmi.
