# Audit S2860 + dana 800rb (2026-11-20)

## Uji patch di atas app-main__19_
- Full test: patch 10190 tes (10187 lulus, 2 gagal) vs baseline 10180 tes (10177 lulus, 2 gagal). Dua gagal identik & pre-existing
  (s1608 orphan modules/modals.js; S1780 DELETE-FILES). Regresi baru: 0. 10 tes S2860 baru lulus.
- verify-bundle-freshness: kedua bundle segar.
- Browser 390px (data backup asli): panel Laba Bersih & Bagi Hasil, input nominal<->porsi, simpan, modal Porsi Akun BRI: berfungsi, 0 error aplikasi.
- Catatan UI (tidak diubah): field nominal tanpa pemisah ribuan; di modal Porsi Akun, mengubah satu baris tidak menyesuaikan baris lain yang sudah terisi (auto-fill hanya 1 baris kosong).
- Belum diuji di browser: kartu Aset Majoris, Investasi, Kendaraan, UI pengeluaran titipan.

## Dana 800rb (proyek wallpanel)
- 800.000 = bagian "Milik Sendiri" di BRI (29,711% x 2.692.582). Saldo BRI = dana proyek (7.000.000 - 4.307.418).
- Laba bersih estimasi 2.388.100 (RAB 7.000.000 - rencana item 4.611.900) -> 800.000 = 33,499434697%; "home in" 1.588.100.
- Sebab saldo pribadi -9.283.649: 15 biaya + 2 DP bertanda deductionOwnerId "home in" & BRI punya pemilik non-SELF
  -> status KUNING (17 temuan), biaya terhitung 0, dana tertahan 7.000.000.
- Koreksi (backup-...-KOREKSI-BAGI-HASIL.json): (A) renovProjects[wallpanel].bagiHasil; (B1) hapus deductionOwnerId dari 17 transaksi;
  (B2) acc_bri owners -> SELF 100%, ownerAnchor dihapus; checksum disegel ulang.
- Hasil di app: status HIJAU, tertahan 2.692.582, saldo pribadi -4.976.231, bagi hasil 800.000 / 1.588.100.
- 800.000 jadi pendapatan pribadi setelah proyek ditandai selesai + atestasi, lalu dicairkan lewat ledger.
- Porsi tetap 33,4994%: bila biaya proyek berubah, nominal 800.000 ikut bergeser (isi Laba manual untuk mengunci).

## S2861 — perbaikan temuan uji browser (akumulasi di atas S2860, build 2900)
- Auto-isi sisa porsi "lengket" saat nominal/porsi diketik digit demi digit: `calculateRemainingShare()` (modules-calc.js) kini juga menjadikan baris yang diisi otomatis (`_auto===true`) sebagai target hitung ulang; baris yang diketik user (`_touched`) tetap tidak pernah ditimpa, baris terisi tersimpan tanpa flag tidak ditimpa. Pemanggil Aset (aset-owners.js), Investasi (investasi-view.js), Akun (akun.js) menandai `_auto=true` saat mengisi. Hasil browser: ketik 800000 di BRI -> baris lain 70,2887414385% (sebelumnya 99,9997%, total 129,7%).
- Kosmetik: judul modal Porsi Akun tidak lagi "🏦 🏦 BRI"; baris "Tersimpan" panel bagi hasil menampilkan porsi maks 4 desimal dan boleh turun baris di 390px.
- Tidak diubah (disengaja): pemisah ribuan pada field nominal (parser memakai titik sebagai desimal, rawan salah baca); porsi desimal penuh di field input (dipakai round-trip lossless).
- Data backup (bukan kode): akun yatim `acc_bri::1794734731912` di komitmen titipan, kepemilikan ganda aset Majoris, pemilik "renov" over-allocated Rp 50.000 — perlu dibereskan lewat UI Dana Titipan/Aset, bukan patch kode.
- Tes: tests/s2861-autofill-sisa-porsi-berulang.test.js (6). Full suite 10195/10196 pass, 0 gagal (2 gagal lama s1608 & S1780 hilang karena build menerapkan DELETE-FILES.txt: modules/modals.js & modules/shop/modals.js terhapus).

## S2862 — poin 1 saran: bereskan data backup (tanpa perubahan kode)
- Pengecekan `TitipanReconcile.checkAll()` dijalankan pada bundle terkirim (VM) terhadap `backup-...-KOREKSI-BAGI-HASIL.json`: 3 temuan terkonfirmasi (accountSync orphan `acc_bri::1794734731912`, ownershipDualSource Majoris, poolCommitment renov +50.000).
- Dibereskan memakai jalur bawaan app, bukan edit manual: (1) `TitipanSync.reconcileAccounts()` -> menghapus 1 baris Buku Utang yatim "home in" (Dana titipan akun BRI, Rp 1.892.582; BRI sudah SELF 100% sejak koreksi sebelumnya); (2) Majoris: `owners[]` (renov 84,33% / mas sihab 15,67%) dipertahankan sebagai satu-satunya sumber, dropdown Kepemilikan `INVESTOR` -> `SELF`. Total Dana Kelolaan tetap 20.316.338 (hanya pindah bucket investor -> titipanAset).
- Diff terhadap backup asli: hanya 2 perubahan di atas; checksum disegel ulang, `verifyBackupPayload` -> ok:true.
- Hasil `checkAll()`: accountSync ok, ownershipDualSource ok. Tersisa `poolCommitment`: renov over-allocated Rp 50.000 (alokasi aset/holding 9.616.338 + terpakai 427.247 + biaya tertaut 1.006.415 = 11.050.000 vs pokok 11.000.000). Sengaja TIDAK diubah: memilih tambah pokok atau kurangi alokasi adalah keputusan data uang pemilik "renov".
- File: `backup-keluarga-W-2026-11-20-BERSIH-REKONSILIASI.json` (di luar ZIP patch ini; patch ini tidak mengubah kode, bundle, atau sw.js).

## S2863 — poin 2 saran: kunci laba bagi hasil (data saja, tanpa perubahan kode)
- `renovProjects[wallpanel].bagiHasil.labaManual` diisi 2.388.100 (sama dgn estimasi saat ini: RAB 7.000.000 - rencana item 4.611.900). Bagian W (33,4994%) = tepat 800.000.
- Uji: tambah item biaya +100.000 -> laba efektif tetap 2.388.100 (auto turun jadi 2.288.100), nominal 800.000 tidak bergeser. Checksum disegel ulang, `verifyBackupPayload` ok:true.
- File: `backup-keluarga-W-2026-11-20-LABA-TERKUNCI.json` (turunan dari BERSIH-REKONSILIASI; over-allocated renov Rp 50.000 tetap menunggu keputusan). Kembali ke otomatis: kosongkan Laba manual di panel.

## S2864 — alokasi renov dikurangi + uji alur selesai/atestasi/pencairan (data & uji, tanpa perubahan kode)
- Over-allocated renov Rp 50.000 diselesaikan dengan MENGURANGI alokasi: Majoris `owners[]` renov 84,3257% -> 83,8647%, selisih 0,4610% masuk baris "Milik Sendiri"; `ownerAnchor` dihapus; `Aset._syncOwnerDebts` -> utang renov 9.145.758 -> 9.095.758. Diff vs backup sebelumnya hanya 4 titik itu. `checkAll().ok = true`, checksum ok. File: `backup-...-REKONSILIASI-OK.json`.
- Uji alur pada SALINAN data (tidak ditulis ke backup; atestasi "semua biaya tercatat" adalah pernyataan pemilik): tandai selesai ok -> syarat terpenuhi, status HIJAU -> akui 800.000 ok -> cairkan 800.000 ok; kunci ganda idempoten; cairkan lebih dari batas ditolak ("Melebihi batas pencairan (0)"); pendapatan pribadi 2026-11 = 800.000; `renovLedgerIssues` kosong.
- Temuan 1: setelah selesai, batas laba ledger = 2.692.582 (penerimaan 7.000.000 - biaya terbayar 4.307.418), bukan 2.388.100 (Laba manual). Selisih 304.482 = sisa belanja belum terbayar. Ledger bisa diakui sampai 2.692.582 walau bagian W hanya 800.000; pembatas ada di pilihan jumlah user.
- Temuan 2 (tampilan): baris "Tersimpan" panel bagi hasil membagi pencairan ledger menurut porsi: W "cair 267.995", home in "cair 532.005", belum 0/0 — padahal pencairan 800.000 adalah pendapatan W. `renovBagiHasilRows` (renovasi.js) belum diubah; perlu keputusan arti ledger.

## S2865 — perbaikan tampilan "Sudah Dicairkan" panel bagi hasil (temuan 2 S2864) — build 2901
- `renovBagiHasilRows` (modules/home/renovasi.js): ledger pencairan = pendapatan pribadi pemilik perangkat. Proyek klien yang punya baris `isSelf` -> hanya baris itu yang mendapat `dicairkan` = total ledger dan `belum` = max(0, nominal - cair); penerima lain `dicairkan/belum = null`. Tanpa baris isSelf atau proyek non-klien: perilaku lama.
- Panel menampilkan "—" untuk null; CSV bagian bagi hasil mengosongkan selnya. Data wallpanel: W cair 800.000 / belum 0 (sebelumnya 267.995), home in "—" (sebelumnya 532.005).
- Tidak diubah (sengaja): batas "akui laba" ledger (2.692.582) belum dibatasi ke bagian W.
- Tes: tests/s2865-bagi-hasil-cair-baris-self.test.js (6). Full suite 10202 tes: 10201 lulus, 0 gagal. Bundle segar (verify-bundle-freshness ok), build 2901.

## S2866 — poin 1-3 saran (peringatan ledger, impor ulang tanpa gandakan, pratinjau nominal) — build 2902
- **Poin 1 (renovasi.js)**: `renovBagianSelf(p)` + `renovCekMelebihiBagianSelf(p,aksi,jumlah)` (murni). `Renov.submitLaba` kini async: akui/cairkan yang membuat total (akui: laba diakui bersih; cairkan: pencairan valid) melebihi nominal baris `isSelf` memunculkan konfirmasi "…melebihi bagian W (Rp 800.000). Lanjut?". Batal -> ledger tidak berubah; Lanjut -> jalur lama. Batas keras ledger (bisaAkui/batasPencairan) TIDAK diubah. Tanpa baris isSelf / laba belum positif / aksi koreksi/selesai -> tidak ada peringatan. Modal akui/cairkan menampilkan baris "Bagian W (bagi hasil): …". Uji pada salinan backup asli: akui 2.692.582 -> konfirmasi muncul; batal = 0 entri, lanjut = 1 entri.
- **Poin 2 (renovasi.js)**: akar masalah terkonfirmasi — kunci anti-duplikat CSV membandingkan kolom Kategori hasil ekspor (`grup`) dengan `it.category` item lama (nilai berbeda, mis. "BAHAN" vs "Renov"), jadi tidak pernah cocok: proyek wallpanel asli 18 item -> impor ulang CSV hasil ekspor = 36. Kini kunci = nama (normalisasi spasi/huruf) + harga, dicocokkan berbasis hitungan (satu baris file memakai satu item lama). CSV dan XLSX sama. Baris cocok dilewati; dialog menampilkan "N item baru, M dilewati karena sudah ada (cocok nama + harga), K baris tidak valid"; bila tidak ada yang baru -> toast info, tanpa dialog. Mode "ganti semua" sengaja tidak dibuat (riwayat pembayaran per item hilang). Uji pada data asli: sebelum 18 -> 36, sesudah tetap 18.
- **Poin 3 (renovasi.js)**: pratinjau "= Rp 1.000.000" di bawah field nominal Renov (RAB, DP/termin, refund, bayar item, laba/cadangan modal laba, laba manual & nominal bagi hasil). Field tetap angka polos; pembacaan pratinjau = pembacaan konsumennya, jadi "1.000" tampil "= Rp 1" (salah ketik langsung terlihat). Satu listener delegasi `input`/`focusin`, elemen pratinjau dibuat saat dibutuhkan (modals.js/HTML tidak disentuh).
- Poin 4 (uji ekspor XLSX/PDF di ponsel) tetap tugas pemilik, tanpa kode.
- Tes: tests/s2866-ledger-peringatan-impor-nominal.test.js (13); tests/s2767-renov-core.test.js diperbarui (kalimat dialog impor CSV baru). Full suite 10215 tes: 10214 lulus, 0 gagal, 1 dilewati. Bundle segar, build 2902.

## S2867 — saran tambahan 1-3 (+ uji poin 4) — build 2903
- **Jumlah awal modal Akui/Cairkan** (renovasi.js `renovSisaBagianSelf`): bila ada baris Milik Sendiri, kolom terisi min(batas ledger, sisa bagian W) — akui: nominal W − laba diakui; cairkan: nominal W − pencairan valid; sisa 0 -> kosong. Atribut `max` tetap batas ledger, jadi angka lebih besar tetap bisa diketik (dengan konfirmasi S2866). Tanpa baris isSelf: perilaku lama.
- **Penanda pasif** (`renovLedgerMelebihiSelf`): panel bagi hasil menampilkan peringatan merah bila laba diakui bersih atau pencairan valid > nominal W (mis. biaya berubah setelah akui).
- **Catatan selisih** (`renovSelisihManualLedger`): bila Laba manual berbeda dari batas laba ledger (setelah syarat selesai+atestasi+HIJAU), panel menampilkan angka keduanya dan selisih. Data wallpanel: manual 2.388.100 vs ledger 2.692.582, selisih 304.482.
- **Uji poin 4**: pustaka SheetJS dimuat dari CDN sehingga tidak bisa dijalankan di sandbox tanpa internet; parser `_xlsxBuild`/`_xlsxParse` diuji dengan data wallpanel asli (sel rumus dinormalkan seperti hasil sheet_to_json): impor ulang ke proyek yang sama 18 dilewati / 0 baru; ke proyek kosong 18 baru total 4.611.900; grup beda tetap dikenali duplikat (build lama menggandakan 18). Ekspor/unduh file XLSX & PDF nyata tetap perlu dicoba dari ponsel.
- Tes: tests/s2867-sisa-bagian-w-penanda-selisih.test.js (8). Full suite 10223 tes: 10222 lulus, 0 gagal, 1 dilewati. Browser Chromium 390px dengan data backup asli: 20/20 pemeriksaan lulus.
