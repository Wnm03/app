# PATCH S2902 — Dana tertahan setelah pencairan final = biaya belum terbayar (bukan laba) + penjaga "ditanggung pemilik lain"
Basis: app-main_21 + S2900/S2901 (build 2913) -> build 2915. AKUMULATIF: semua file S2900+S2901+S2902 ada di ZIP ini (hanya file yang berubah dari app-main_21); salin menimpa.

## Angka backup asli (wallpanel, 21 Nov 2026)
- Laba terhitung 2.363.100 = penerimaan bersih 7.000.000 - biaya 4.636.900. W 800.000 (33,8538%), home in 1.563.100 (66,1462%).
- Saldo BRI 2.667.582 = home in 1.563.100 + bagian W 800.000 + dana tertahan 304.482.
- 304.482 = 3 item biaya belum terbayar (punya tagihan): Lem Kuning Taco 212.000 + Lem Sealant 52.078 + Fisher+Baut 40.404.
- Utang bagi hasil home in 529.169 = 66,1462% x laba diakui LAMA 800.000; S2900 menaikkannya ke 1.563.100 lalu melunasinya lewat transfer BRI -> Rekening home in.

## Bug (ditemukan lewat simulasi pada backup asli)
Setelah Pencairan Final, renovSaldoRincian() melaporkan profit=304.482, proyek=0. Penyebab: labaBelumDicairkan = diakui - pencairan W saja (2.363.100 - 800.000 = 1.563.100), padahal 1.563.100 itu bagian home in yang SUDAH dicairkan final. Akibatnya sisa dana tertahan 304.482 (biaya 3 tagihan) berlabel "profit"/laba, dan panel menampilkan "Belum dicairkan (hak proyek) 1.563.100".

## Perbaikan (modules/home/renovasi.js)
1. renovLabaSummary: labaBelumDicairkan = diakui - pencairan W - pencairan pemilik lain (renovPencairanLain). Field baru pencairanLain. Setelah final: belum=0, kelebihanPencairan=false; renovSaldoRincian -> {tertahan 304.482, profit 0, proyek 304.482}.
2. renovItemBelumTerbayar(p): daftar item dengan sisa bayar (+penanda tagihan). Panel final: "Sisa dana proyek tertahan Rp 304.482 untuk 3 item biaya belum terbayar (nama + nilai). Bayar dari rekening dana proyek; bukan uang pribadi."
3. Penjaga (S2860 tak terulang): status KUNING kini menyebut item + penyebab + cara memperbaiki, bukan lagi "Pembayaran dari akun titipan":
   - biaya bertanda "ditanggung home in" -> "ubah penanggung ke Milik Sendiri; biaya proyek dibayar dari dana proyek";
   - rekening dana proyek memuat porsi mitra -> "pindahkan porsi mitra ke rekening sendiri lewat Pencairan Final".
   Helper baru: renovAlasanPembayaranTitipan, _renovNamaPemilik.

## Keputusan desain (penting)
Porsi home in TIDAK disimpan di BRI. Kode S2900/S2901 memperlakukan rekening yang memuat porsi pemilik lain sebagai titipan -> DP/biaya BRI jadi KUNING dan biaya terhitung 0. Cara yang aman: biarkan BRI 100% Milik Sendiri, lalu Cairkan laba (sekali): 1.563.100 pindah ke rekening home in (tombol "Buat rekening home in" tersedia), 800.000 jadi pendapatan W, sisa 304.482 tertahan untuk 3 tagihan. Setelah 3 tagihan dibayar dari BRI (sumberDana proyek), dana tertahan = 0.

## Rekomendasi tambahan yang dikerjakan
4. Invarian total diuji di browser pada backup asli: saldo pribadi naik TEPAT 800.000 oleh pencairan final; total utang (FI) tidak berubah; membayar 3 tagihan dari dana proyek tidak menggeser saldo pribadi.
5. Kosmetik: angka rupiah di ledger & rincian final diberi nowrap (sebelumnya "Rp 1.563.10 0" membungkus di layar 390px).

## Temuan data (di luar patch)
Akun Cash di backup bernilai -4.976.231, sehingga saldo pribadi negatif (-4.176.231 setelah final). Ini bukan dari wallpanel; kemungkinan saldo awal Cash belum diisi atau ada pemasukan belum tercatat. Perlu dicek di data.

## Tes & gerbang
Baru: tests/s2902-dana-tertahan-item-tagihan.test.js (8). Full suite 10288 tes: 10287 lulus, 0 gagal, 1 dilewati. verify-window-expose OK, verify-bundle-freshness OK. Bundle dibangun ulang (esbuild), versi 2915 (sw.js & docs/sw.js = kw-cache-v2915); docs/ disinkronkan.
Uji BROWSER (Chromium headless 390x844, backup asli 21 Nov 2026): e2e/s2902-dana-tertahan-browser.js, 18/18 lulus — modal pencairan via klik nyata, Buat rekening home in, BRI 1.104.482, Rekening home in 1.563.100, dana tertahan 304.482 (3 item), profit 0, 3 tagihan dibayar -> dana tertahan 0 & BRI 800.000, penjaga ditanggung home in -> KUNING. Jalankan: BACKUP=/path/backup.json node e2e/s2902-dana-tertahan-browser.js (E2E_SHOTS=/dir untuk tangkapan layar).
Belum: uji di perangkat HP asli. Kosmetik sudah dibereskan: angka di ledger & rincian final kini satu baris (nowrap). Transfer tetap bisa membuat BRI minus bila disetujui (S2901).
File yatim modules/modals.js & modules/shop/modals.js sudah dihapus build (tercantum di DELETE-FILES.txt); hapus manual bila masih ada.

Isi ZIP patch: 25 file = 19 diubah + 6 baru (dihitung dengan membandingkan folder kerja vs app-main_21 satu per satu), termasuk tes S2900/S2901/S2902 dan e2e S2902.
