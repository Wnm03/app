# PATCH S2842 (akumulasi di atas S2840 + S2841) — dana bukan-pribadi tidak masuk laporan & Kekayaan Bersih
Basis: app-main_17. ZIP KUMULATIF: S2840 + S2841 + S2842.

## A. Pemasukan/Pengeluaran pribadi memuat transaksi akun non-SELF
Temuan browser: akun ownership INVESTOR/THIRD_PARTY (dana titipan penuh) -> Keuangan/Laporan menampilkan pemasukan 10jt, pengeluaran 0,8jt (pribadi: 3jt / 0,5jt). Saldo sudah benar.
- finance/akun.js: isAliranKlienOnlySafe (klien MURNI, utk badge/label) dan isAliranKlienSafe (= aliran bukan-pribadi: klien ATAU transaksi di akun non-SELF; predikat sama dgn totalSaldoAkun -> isAccOwnershipSelf). Semua konsumen agregat yg sudah memakai isAliranKlienSafe (Keuangan, Laporan, Hub, budget, PPh21, zakat, proyeksi kas, insight, audit) otomatis ikut. akunPunyaAliranKlienSafe/akunAliranKlienSetSafe (badge) memakai versi murni. laporanTotalsSafe: basis pribadi mengecualikan akun non-SELF, basis fisik tetap lengkap, klienMasuk/Keluar tidak tercemar. adaAkunBukanPribadiSafe() + modules-render-b.js (grafik 6 bulan ikut basis pribadi bila ada akun non-SELF).
- Daftar transaksi (txM) TIDAK diubah; transaksi akun non-SELF tetap tampil di daftar & histori akunnya.

## B. Kekayaan Bersih terpotong dua kali oleh utang "Dana titipan akun"
Akun ownership non-SELF penuh sudah keluar dari totalSaldoAkun(), tetapi TitipanSync tetap membuat utang linkedAccountId yg ikut Total Utang (pola BUG-016) -> NW -4,2jt (seharusnya 2,5jt).
- finance/piutang-utang.js: isDebtAkunLuarSaldo(d) (akun ownership non-SELF atau includeInBalance=false); Debt.totalValue() mengecualikannya. Entry TETAP ada di D.debts. Akun SELF berporsi pemilik lain TIDAK diubah (saldo penuh masuk + utang porsi pemilik lain = benar, lihat S675).

## Uji browser (Chromium 390x844; asli vs patch)
| Skenario | Asli | Patch |
| akun investor 4,7jt + titipan 2jt + dompet (gaji 3jt, makan .5jt) | pemasukan 10jt, pengeluaran 0,8jt, NW -4,2jt | pemasukan 3jt, pengeluaran 0,5jt, NW 2,5jt; saldo 2,5jt; Dana Kelolaan 6,7jt (tidak berubah) |
| DP klien di akun SELF | 3jt/0,5jt, NW 2,5jt | sama; Dana Klien 800rb di Dana Kelolaan |
| DP klien di akun investor (legacy) | saldo 500rb, NW -0,3jt | saldo 2,5jt, NW 2,5jt, Dana Kelolaan 800rb tanpa dobel |
Laporan (lapIn/lapOut/lapNet) ikut: 3jt/0,5jt/2,5jt. Tanpa error JS/console.

## Tes
Baru: tests/s2842-bukan-pribadi-laporan-dan-utang-akun.test.js (5, RED lalu hijau). Disesuaikan (grab fungsi akun.js / stub): akun-aliran-klien-link-guard, laporan-basis-pribadi, dana-proyek-tampilan-saldo.
Full suite TZ=UTC: base 10010/38 gagal; patch 10030/38 gagal, daftar nama gagal IDENTIK.

## Dampak perilaku
- Pengguna dgn akun ber-ownership non-SELF: pemasukan/pengeluaran bulanan, budget, zakat, PPh21, proyeksi kas, insight tak lagi menghitung transaksi akun itu; Total Utang & Kekayaan Bersih tak lagi memuat utang titipan akun tsb.
- Basis "fisik" di Laporan tetap memuat semuanya.
## Belum
Build ulang bundle resmi (scripts/build.js); uji Android. Debt Optimizer (activeDebts) masih memuat entri linkedAccountId; tidak diubah.
