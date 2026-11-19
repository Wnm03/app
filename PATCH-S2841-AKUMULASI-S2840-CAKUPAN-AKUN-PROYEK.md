# PATCH S2841 (bagian dari paket kumulatif S2840+S2841+S2842) — Audit lanjut temuan 3: aturan "akun dalam cakupan" Proyek Renovasi
Basis: app-main_17. ZIP INI KUMULATIF: berisi S2840 + S2841 (timpa file S2840 sebelumnya).

## Hasil audit temuan 3
- renovClientAccountEligible punya cek ad-hoc `a.ownership||a.ownerType` + 4 field akun yang tak pernah ditulis di mana pun (assetId/assetLinkId/investmentId/holdingId). `ownerType` tak dibaca OwnershipEngine. Akibat: ownership tak valid/berspasi dianggap SELF oleh totalSaldoAkun() & engine, tapi DP ditolak oleh Renovasi.
- Lebih serius: bila akun tempat DP kemudian keluar cakupan (tertaut aset, non-SELF, keluar saldo), status KUNING tapi dana tertahan tetap dikurangkan dari totalSaldoAkun() yang sudah tidak memuat akun itu => saldo pribadi KURANG-GANDA (bisa negatif). Pada Dana Kelolaan (S2840) akun non-SELF akan terhitung DOBEL (byType + dana tertahan).

## Langkah aman yang dikerjakan (tiap langkah punya tes RED->hijau)
1. renovasi.js — renovAccountScope(accountId) -> {ok,reason}: predikat sama dgn totalSaldoAkun() (includeInBalance, !tertaut aset, isAccOwnershipSelf->OwnershipEngine) + bukan titipan. renovClientAccountEligible = scope.ok. Cek ad-hoc & field mati dihapus.
2. renovClientFundState +diLuarSaldo (DP di akun non-SELF / includeInBalance=false, TIDAK tertaut aset) dan +diNonSelf (DP di akun non-SELF). Status/isu/teks tidak berubah.
3. renovDanaTertahanDalamSaldo(p) dipakai saldoPribadi(); renovDanaTertahanUntukKelolaan(p) dipakai DanaKelolaan.sumDanaProyekKlien(). renovDanaTertahan(p) TIDAK diubah.
PENGECUALIAN SENGAJA (ditemukan lewat uji browser): akun TERTAUT aset — dana klien ikut nilai Aset (Kekayaan Bersih = saldo pribadi + nilai aset), sehingga pengurangan lewat saldo pribadi dipertahankan (perilaku lama). Versi pertama S2841 mengurangi juga kasus ini dan membuat Kekayaan Bersih naik 800.000 (menghitung dana klien). Akun titipan SELF berporsi pemilik lain tetap ada di totalSaldoAkun() -> tetap dikurangkan.

## Uji browser (Chromium 390x844, bundle dibangun ulang di salinan; asli vs patch)
| Skenario | Asli (saldo pribadi / Dana Kelolaan) | Patch |
| klien di akun SELF (DP 2jt, biaya 1,2jt, gaji 3jt, makan .5jt) | 2,5jt / - | 2,5jt / Dana Klien 800rb; pemasukan bulan 3,0jt (DP tidak masuk), Kekayaan Bersih 2,5jt |
| DP di akun non-SELF (legacy) | 500rb (kurang-ganda) | 2,5jt; Dana Kelolaan investor 800rb, tanpa dobel |
| DP di akun tertaut aset (legacy) | 1,7jt; NW 2,5jt | sama (sengaja); Dana Kelolaan +800rb |
| ganti klasifikasi klien->pribadi | DP hilang dari pembukuan | ditolak |
| akun investor/titipan (ownership non-SELF) | Saldo/hero/Laporan 2,5jt (tidak memuat akun itu) | sama |
Tanpa error JS/console di semua skenario.

## Temuan A dan B -> ditutup di S2842 (lihat PATCH-S2842-*.md)

## Verifikasi
Full suite TZ=UTC: base 10010/38 gagal; patch 10025/38 gagal, daftar nama gagal IDENTIK. Tes baru: s2841 (9) + s2840 (6).
Belum: build ulang bundle resmi (scripts/build.js; di sini hanya salinan sementara dgn konstanta versi disesuaikan); uji Android.
