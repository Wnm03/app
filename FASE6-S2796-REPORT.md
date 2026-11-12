# Fase 6 — S2796: nominal, nama, dan tombol hapus tidak terpotong di daftar uang (CSS saja)

Basis: app-main (build 2795). Akumulasi di atas S2795. Hanya CSS + stempel versi hasil build (tanpa perubahan logika/markup/data).

## Temuan audit (Chromium, 320/360/390/412/768/1440px)
- Keuangan > Kelola > Transaksi dan Laporan > Transaksi: nominal "-Rp 1.250.000" terpotong di 320/360/390px (data realistis: akun "BCA", catatan ~30 karakter); tombol hapus keluar kartu/layar. Dengan catatan panjang hanya "-Rp" yang tampak.
- Akar masalah: `.tx-item > *{min-width:0}` + `.tx-info{flex:1 1 auto}` membuat pembungkus nominal+hapus menyusut ke 23px, isinya `nowrap`, lalu dipotong `overflow:hidden` pada kartu. Ditambah `#allTx .tx-amount{max-width:31vw/34vw; text-overflow:ellipsis}` yang memotong angka besar.
- Piutang/Utang: nama menyusut jadi "Pembaya…" (67px di 360px, 27px di 320px). Laporan: nama akun panjang di-ellipsis.
- Tile angka (Tagihan "Bulan Ini", Kekayaan Bersih Piutang/Inventori) keluar 4px dari kartu; tombol "Atur" pecah jadi "Atu/r".

## Perubahan (`tokens.css`, blok "FASE 6 (S2796)", tanpa `!important`)
a. Kolom nominal/aksi `flex:0 0 auto; min-width:max-content`; kolom info yang mengalah. Ellipsis nominal dihapus.
b. <=599px: baris boleh membungkus; nominal turun ke baris berikut (rata kanan) bila nama terlalu sempit.
c. Nama maksimal 3 baris (bukan 1 baris + ellipsis).
d. Tile angka membungkus; baris Piutang/Inventori di Kekayaan Bersih wrap, target sentuh 44px dipertahankan.
e. Tombol Filter/Atur `nowrap`.
Build: `SKIP_LINT=1 node scripts/build.js s2433-fase6-tx-overflow-2796` (cache kw-cache-v2796); `refresh-file-hashes.py --write`.
Tes baru: `tests/fase6-s2796-tx-overflow.test.js` (7 tes).

## Hasil terukur (stres: nama 100 karakter, nominal sampai Rp 9.999.999.999.999)
| Metrik | Sebelum | Sesudah |
|---|---|---|
| Nominal/hapus/nama terpotong atau keluar layar (320/360/390px) | 11–13 elemen per tampilan | 0 |
| Tablet 768px (tombol hapus keluar 16px) | 2 | 0 |
| Desktop 1440px (hapus di Riwayat 3px) | 1 | 0 |
| Kontrol <40px mobile/tablet (Keuangan) | 0 | 0 |
| Error konsol / scroll horizontal | 0 / 0 | 0 / 0 |
Daftar sisa yang sengaja diabaikan: baris tab yang bisa digeser (`.cn-tab`, `.lap-subtab`, `.kel-subtab`).

## Test
Full suite: 9697 tes, 3 gagal — ketiganya tes "retired path" yang juga gagal di baseline (S1780, s1608, S2308). Jalankan `node scripts/apply-delete-manifest.js` setelah apply.

## Belum / batas klaim
- Format tanggal ISO ("2026-11-11") di daftar transaksi TIDAK diubah (menyentuh JS render + banyak tes); Tagihan memakai "14 Nov 2026". Usul sesi terpisah.
- Hanya tema Dark + data sintetis; Shop, Dana Titipan, biaya BBM/Servis, Aset belum diaudit. Lint/minify penuh, Safari/Firefox, Android belum.
