# PATCH S-ABS1 (kumulatif S-ABS1 + S-ABS1.1) — Absensi Pribadi
Build: s2041-1-part-sot-hardening-2319 (dari 2318). Basis: app-main (13).zip. Satu-satunya source fitur: modules/business/payroll-absensi.js.

## S-ABS1 — fitur
1. Minggu otomatis: tanggal Minggu -> jenis "Hari Minggu" (tarif Minggu), dropdown tetap bebas (biasa/borongan).
2. Jam template dari rutinitas: modus 5 absensi 'biasa' terakhir; hari yg sama dgn >=2 sampel -> pola hari itu; Minggu/borongan tidak ikut; default 07:00-15:00.
3. Simpan Cepat 1 ketukan (di bawah baris Tanggal/Gaji); tanggal terisi -> buka mode edit.
4. Anti-timpa: tambah di tanggal terisi butuh ketukan kedua "Timpa Absensi"; edit lalu pindah ke tanggal entri LAIN diblokir
   (dulu menghapus entri lain diam-diam). Grid minggu ikut pindah saat tanggal diganti. Rumus dipusatkan di Payroll.hitungHari().

## S-ABS1.1 — audit "tanpa mengubah alur lama" (hasil jalan nyata)
Temuan: field jam ikut tersembunyi saat (a) mengedit entri Minggu lama dan (b) memilih "Minggu" manual dari dropdown -> beda dari alur lama.
Perbaikan: jam hanya disembunyikan utk Minggu yang TERISI OTOMATIS (flag _autoMinggu). Edit entri & pilihan manual -> jam tampil seperti sebelumnya.
Dikunci 2 tes regresi baru. Alur lama yang diverifikasi utuh: isi jam manual, borongan, edit/batal, hapus, hitung lembur/kurang-jam.
Ketukan (modal terbuka): lama 3-5 (fokus tanggal, jenis, jam, simpan) -> baru 1 (Simpan Cepat); jalur manual lama tetap ada.

## Verifikasi
- tests/payroll-absensi-minggu-template-sabs1.test.js: 21 tes. Full regression: 8813 pass / 0 fail / 1 skip (baseline asli 8792 pass / 0 fail / 1 skip).
- Build esbuild asli + verify-release-ready.js lolos tanpa override. ZIP diuji diterapkan di atas app-main (13) murni.

## Catatan docs/ (TIDAK disinkronkan — sengaja)
docs/app-bundle-b.min.js adalah fixture kontrak historis (audit S2304: RETAIN) yg dikunci tes S1843/S1851/S1852. Mencoba menimpa dgn bundle
terbaru langsung mematahkan S1851. docs/ dikembalikan persis seperti basis (hanya 2 dok auto-generated yg ikut berubah). Sinkron docs/ butuh
keputusan terpisah (mis. pindahkan fixture ke tests/fixtures lalu mirror penuh) — jalur deploy sebenarnya (root vs docs/) perlu dikonfirmasi.
