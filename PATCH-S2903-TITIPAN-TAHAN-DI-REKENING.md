# PATCH S2903 — Porsi pemilik lain boleh DITAHAN di rekening dana proyek (BRI tetap 1 pemilik) sebagai titipan
Basis: app-main_21 + S2900/S2901/S2902 -> build 2916. AKUMULATIF: semua file S2900+S2901+S2902+S2903 ada di ZIP ini (hanya file yang berubah dari app-main_21); salin menimpa.

## Latar
Sebelum ini Pencairan Final memaksa porsi pemilik lain (home in 1.563.100) dipindah ke rekening yang memuat pemilik itu (renovFinalAkunValid). Rekening bersama (BRI berporsi 2 pemilik) sengaja dihindari karena dianggap titipan -> status KUNING, biaya terhitung 0 (S2900/S2901). Audit di backup asli: BRI Milik Sendiri sudah menampung dana tertahan 2.667.582 (dikurangkan dari saldo pribadi); porsi mitra sudah punya representasi titipan = utang bagi hasil (renovBagiProjectId, dikecualikan dari total utang kas). Yang kurang: opsi menahan, dan rincian per titipan.

## Perubahan (modules/home/renovasi.js, modules/finance/akun.js)
1. Pencairan Final: untuk pemilik NON-W ada pilihan "Tahan di rekening dana proyek (titipan)". Tanpa transfer; baris final ditandai tahan:true, accountId = rekening sumber. Utang bagi hasil naik ke nilai akhir (1.563.100) dan TETAP terbuka. Baris W tidak bisa ditahan.
2. renovPencairanLain mengecualikan baris tahan -> porsi ditahan tetap dana tertahan; labaBelumDicairkan = hak mitra yang ditahan (bukan kelebihan pencairan).
3. Helper baru: renovTitipanDitahan(p), renovTitipanDitahanTotal(p).
4. renovCairkanTahan(p,{ownerId,rekeningId,tanggal,izinkanMinus}): rilis titipan = transfer rekening sumber -> rekening pemilik (harus memuat pemilik & beda dari sumber), utang lunas, rollback penuh bila simpan gagal. UI: tombol "Cairkan titipan <nama>" di panel final (Renov.openRilisTahan / buatRekeningRilis / submitRilisTahan).
5. renovSaldoRincian menambah field titipan; profit tidak lagi menghitung porsi mitra yang ditahan (sebelumnya akan berlabel profit). saldoKlienRingkasSafe + 2 catatan saldo: "saldo proyek X + titipan mitra Y + profit belum dicairkan Z".
6. Panel final: baris "ditahan di <rekening> (titipan)", ringkasan titipan, dan sisa dana proyek tertahan tidak lagi menyertakan titipan.
Data & alur lama (transfer ke rekening pemilik) tidak berubah.

## Bukti pada backup asli (bundle asli + renovasi.js di VM Node, baca-saja; wallpanel 21 Nov 2026)
- Tahan: saldo pribadi naik TEPAT 800.000; saldo fisik tetap; tertahan 1.867.582 = titipan 1.563.100 + proyek 304.482; profit 0; utang home in terbuka 1.563.100 (1 baris); utang kas tidak berubah.
- Rilis ke "Rekening home in": BRI 1.104.482 (sama dgn e2e S2902), tertahan 304.482, utang home in lunas, saldo pribadi tetap +800.000 (rilis tidak menggeser saldo pribadi).
- Catatan: transaksi bertanggal masa depan tidak dihitung ke saldo (mis. rilis bertanggal besok).

## Tes & gerbang
Baru: tests/s2903-titipan-tahan-di-rekening.test.js (13). tests/s2902 diperbarui (bentuk renovSaldoRincian + field titipan:0). Full suite 10301 tes: 10300 lulus setelah perbaikan tes S2902, 0 gagal, 1 dilewati (dijalankan setelah file yatim dihapus). verify-window-expose, verify-bundle-freshness, verify-docs-sync OK. Build 2916 (sw.js & docs/sw.js = kw-cache-v2916); docs/ disinkronkan.
Belum: uji browser S2903 (butuh Chromium; skrip e2e belum ditulis) dan uji di HP asli. Jalur Bayar tagihan asli dgn tag "home in" pada 3 tagihan belum diuji di browser (lihat catatan S2902).
File yatim modules/modals.js & modules/shop/modals.js: hapus manual setelah menyalin (tercantum di DELETE-FILES.txt); bila tidak, 2 tes (S1780, s1608) gagal.
Risiko: menahan porsi mitra berarti uang mitra bercampur di BRI. Pastikan titipan dicairkan; panel final selalu menampilkan jumlah ditahan. Dana Titipan/Kelolaan memakai representasi yang sama dgn sebelum final (utang bagi hasil), jadi tidak ada hitung ganda baru.
