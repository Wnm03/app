# Cakupan screenshot UI — status S2758

## Bukti yang tersedia

Arsip `kw-ui-audit-screenshots-rencana.zip` berisi 24 screenshot halaman utama (8 halaman × mobile/tablet/desktop), `pages-sheet.png`, `themes-sheet.png`, serta `lock-d.png`. Arsip patch S2757 juga berisi screenshot before/after terpilih untuk Fase 0 dan Fase 1.

## Belum tersedia

Sesuai batas cakupan pada `RENCANA-UPGRADE-FRONTEND.md` bagian F, bukti visual berikut belum ada di arsip yang diberikan:

- Sub-tab Keuangan: Tagihan, Budget, Piutang & Utang, Aset & Proyek, Laporan, Akun; terutama sub-tab Laporan → Dana Titipan.
- 8 tab Shop selain tampilan default yang telah ditangkap.
- Modal tambah transaksi (FAB +), termasuk tampilan modal pada viewport mobile/tablet/desktop.
- Alur visual layar Dana Titipan (daftar, detail, modal tambah/pengeluaran/pengembalian) pada data seed.

## Batas eksekusi S2758

Percobaan menjalankan `tools/capture-baseline.py` dengan Chromium sistem (`/usr/bin/chromium`) gagal sebelum halaman terbuka: Chromium mengembalikan `net::ERR_BLOCKED_BY_ADMINISTRATOR` untuk `http://localhost:8099/index.html` dan juga `file://`. Browser capture tidak dapat dinyatakan selesai dari sandbox ini. Tidak ada screenshot sintetis atau hasil capture yang diklaim sebagai bukti.

Capture yang belum ada tetap menjadi gate sebelum Fase 2. Jalankan `python3 tools/capture-baseline.py` dan lengkapi alur sub-tab/modal pada mesin pengembangan yang mengizinkan Chromium dan localhost; simpan hasilnya di `docs/screenshots-fase1b/` beserta log console.
