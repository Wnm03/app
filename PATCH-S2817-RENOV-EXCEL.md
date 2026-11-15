# PATCH S2817 — Export/Import Excel proyek Renovasi (akumulatif di atas S2816, build 2829)
Unggah SEMUA file di zip ini (termasuk bundle hasil build). Hapus 5 file di DELETE-FILES-S2816-APPLY.txt.

## Fitur
- Detail proyek: tombol baru "Export Excel" dan "Import Excel" (di samping CSV/PDF).
- Export Excel (`Renov.exportXLSX`) -> `renovasi-<nama>.xlsx`, 4 sheet:
  - REKAP: layout seperti sheet REKAP pada RAB_*.xlsx (NO | TANGGAL | ITEM | JUMLAH | HARGA SATUAN | ONGKIR | JUMLAH HARGA), dikelompokkan per kategori, JUMLAH HARGA/JUMLAH/TOTAL JMLH berupa rumus Excel.
  - Ringkasan, DP-Termin, Cicilan.
- Import Excel (`Renov.importXLSX`): membaca sheet REKAP (atau sheet pertama) lalu menambah item rencana ke proyek. Kategori dari label grup (BAHAN, JASA, dst). Berhenti sebelum TOTAL JMLH/HJK/DIVIDEN. Baris harga 0 dilewati, duplikat dilewati, ada preview + konfirmasi, rollback jika simpan gagal. JUMLAH/HARGA SATUAN/ONGKIR disimpan di item (qty, hargaSatuan, ongkir).
- Memakai SheetJS yang sudah ada (ensureXLSX, CDN), butuh internet saat pertama dipakai.
- Sheet lain di contoh (Harga Bahan, Kebutuhan Bahan, Hitungan, INVOICE, Audit) TIDAK diimpor.

## Uji
- tests/s2817-renov-excel-export-import.test.js (5 tes), fixture = sheet REKAP asli (tests/fixtures/s2817-rekap-aoa.json): 14 item, jumlah Rp6.298.259,67 = TOTAL JMLH di file contoh.
- Rumus hasil export dihitung ulang di LibreOffice: cocok (506.415 pada proyek dari backup).
- Full suite: 9801 tes, 9800 lulus, 0 gagal.
- Chromium + backup asli: 5 tombol tampil, Export CSV menghasilkan renovasi-renov.csv benar. Export Excel/PDF belum bisa dijalankan di sandbox (CDN SheetJS/jsPDF tidak terjangkau).

## Tambahan (build 2829)
- Import Excel: nilai HJK (Harga Jual Konsumen) di REKAP mengisi Nilai Kontrak/RAB proyek HANYA bila RAB masih kosong/0; RAB yang sudah terisi tidak ditimpa. Tampil di preview konfirmasi, dikembalikan bila simpan gagal. Lokasi terbaca di meta parser (belum disimpan ke proyek).
- Import Excel: bila sheet REKAP tidak ada/tidak terbaca, dicoba sheet lain sampai ada yang berheader ITEM + JUMLAH HARGA/Harga.
- Full suite: 9802 tes, 9801 lulus, 0 gagal (6 tes S2817).

## Keputusan & tambahan (build 2829)
- Field baru proyek `lokasi` (opsional): ada di form proyek (setelah Klien), tampil di export Excel (REKAP baris LOKASI + sheet Ringkasan), dan terisi dari import Excel HANYA bila masih kosong (ikut preview, rollback bila simpan gagal). Proyek lama tanpa lokasi tetap valid.
- DITUNDA (keputusan): katalog harga dari sheet "Harga Bahan". Butuh kunci data baru di D + wiring backup/restore + UI pemilih item; risiko ke data lebih besar dari manfaatnya sekarang. Rekomendasi: kerjakan sebagai sesi terpisah dengan tes backup-restore.
- Full suite: 9803 tes, 9802 lulus, 0 gagal. Chromium + backup asli: form Lokasi tampil, tersimpan, dan muncul di REKAP.
