# Fix v974 (s314) — refreshBillHistoryModalViews(): satu sumber kebenaran utk render checklist billHistoryEditModal

## Latar belakang

Lanjutan langsung dari `FIX-v973-s313-billhistoryedit-list-refresh.md` dan
rekomendasi #1 di ringkasan audit yang menyertainya (dikirim ke user setelah
s313 selesai): bug s313 terjadi karena `saveBillHistoryEdit()` dan
`deleteBillHistoryTx()` — dua fungsi SEBELAH PERSIS di modal yang sama
(`billHistoryEditModal`) — masing-masing menulis SENDIRI-SENDIRI daftar
pemanggilan render (`renderDashboard()`/`renderKeuangan()`/`renderBillList()`/
`checkBills()`/`renderBillHistory()`/`renderBillArchive()`), alih-alih berbagi
satu sumber kebenaran. Fix s313 menambal GEJALA (menambahkan 2 panggilan yang
kelewat di `saveBillHistoryEdit()`), tapi ROOT CAUSE STRUKTURAL-nya — dua
daftar render yang bisa diam-diam beda kapan saja salah satu fungsi diedit
lagi tanpa mengedit fungsi sebelahnya — belum dibenahi. Ini murni tindak
lanjut preventif, bukan laporan bug baru dari user.

## Perubahan

`modules/finance/tagihan-kalender.js`:

- Fungsi baru `refreshBillHistoryModalViews()` — memanggil ke-6 render inti
  yang SELALU relevan tiap kali data di modal Riwayat Pembayaran berubah:
  `renderDashboard();renderKeuangan();renderBillList();checkBills();
  renderBillHistory();renderBillArchive();`
- `saveBillHistoryEdit()`: baris render manual diganti jadi satu panggilan
  `refreshBillHistoryModalViews()`.
- `deleteBillHistoryTx()`: 6 render inti diganti jadi
  `refreshBillHistoryModalViews()`, `renderSettings()` TETAP dipanggil
  terpisah sesudahnya (sengaja tidak dimasukkan ke helper bersama — cakupan
  hapus riwayat pembayaran lebih besar daripada edit, bisa mengembalikan
  tagihan dari arsip ke aktif / balikin sisa tenor, jadi levelnya beda dari
  edit tanggal/jumlah yang tidak menyentuh apa pun di halaman Pengaturan).

Tidak ada perubahan PERILAKU — daftar render yang dipanggil di kedua fungsi
persis sama sebelum & sesudah fix ini (dikonfirmasi lewat suite lama
`s313-billhistoryedit-list-refresh.test.js`, 4/4 tetap PASS setelah stub
`refreshBillHistoryModalViews()` ditambahkan ke sandbox test itu). Ini murni
refactor struktural: satu tempat untuk satu daftar, supaya kelas bug s313
("satu fungsi lupa nambah render, fungsi sebelah tidak") tidak bisa lolos
lagi tanpa ketahuan.

## Test baru

`tests/s314-billhistory-render-checklist-helper.test.js` (4 test):

1. `refreshBillHistoryModalViews()` sendiri memanggil ke-6 render, urutan &
   kelengkapan tetap.
2. Source `saveBillHistoryEdit()` memanggil `refreshBillHistoryModalViews()`
   (dicek dari teks sumber, bukan cuma perilaku eksekusi).
3. Source `deleteBillHistoryTx()` memanggil `refreshBillHistoryModalViews()`
   DAN tetap memanggil `renderSettings()` terpisah.
4. Kedua fungsi TIDAK ADA lagi panggilan `renderBillList()` langsung di luar
   komentar — harus lewat helper bersama.

`tests/s313-billhistoryedit-list-refresh.test.js` diupdate: sandbox test-nya
ditambah stub `refreshBillHistoryModalViews()` yang fan-out ke render stub
yang sama, supaya assertion lama (cek `renderBillList()`/`checkBills()` ikut
terpanggil) tetap valid tanpa perlu tahu isi asli fungsi helper baru.

## Verifikasi

- Simulasi revert manual (`refreshBillHistoryModalViews()` di
  `saveBillHistoryEdit()` diganti balik ke 6 render manual): test s314
  dikonfirmasi GAGAL (3/4) — membuktikan test ini benar-benar jadi guard
  regresi, bukan false positive.
- `node --test tests/*.test.js` → **2026/2026 PASS** (naik dari 2022, +4 test
  baru, 0 regresi).
- `node --check` semua file yang diubah → OK.
- Build: `s314-billhistory-render-checklist-helper` → versi **974**, sintaks
  bundle valid, `index.html` & `app_production.html` identik (auto oleh
  build.js). `docs/FILE-MAP.md` ter-generate ulang otomatis.

## Catatan: rekomendasi audit lain yang BELUM diimplementasikan

Dari 3 rekomendasi yang disampaikan bareng ringkasan s313, cuma #1 (di atas)
yang dikerjakan di patch ini. Sisanya sengaja BELUM disentuh:

- **Gap billLinkId tagihan aktif** & **fallback amount-matching utang** —
  sudah ✅ SELESAI dari sesi-sesi sebelumnya (s310, s309) — lihat
  `AUDIT-billlinkid-remaining-gaps.md` poin 1 & 2. Tidak perlu dikerjakan
  ulang.
- **Blokir auto-link saat kandidat fallback ambigu** (poin 3 di audit yang
  sama) — ini KEPUTUSAN DESAIN SENGAJA (s308), bukan pekerjaan tertunda:
  mengubahnya jadi blokir-total (minta pilih manual) adalah perubahan
  perilaku besar yang butuh desain UX terpisah (modal pilih manual, dsb),
  di luar cakupan "perbaikan ringkas" yang diminta. Direkomendasikan dibahas
  terpisah kalau memang mau dikerjakan.
