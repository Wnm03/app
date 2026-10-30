# FIX v1232 → v1233 (Sesi 502): Audit Sesi C — Mekanisme "Pinjam untuk Transaksi Keuangan" (G4)

## Konteks
Sesi ini **AUDIT MURNI** — 0 kode fungsional diubah, sesuai rencana
4-sesi awal (`AUDIT-DANA-TITIPAN-TAB-TERPADU.md`) yang menandai Sesi C
"wajib audit kecil `saveTx()`/`txModal` dulu sebelum coding". Deliverable
sesi ini adalah `AUDIT-SESI-C-PINJAM-TRANSAKSI-G4.md` — dipaketkan ke
zip release/patch (naik versi) mengikuti disiplin "1 sesi 1 zip" yang
sama dipakai sesi kode, meski sesi ini murni dokumen.

## Isi Audit (ringkas — baca file lengkap untuk detail & kutipan kode)

**Temuan utama:**
- `saveTx()`/`_saveTxInner()` (transaksi.js) punya ≥5 percabangan
  independen (`billLinkId` kind `utang`/`tagihan`, `cicilan`,
  `langganan`, generik) — field baru "dibiayai dana titipan" harus
  di-wire ke SETIAP cabang secara terpisah kalau mau berlaku universal.
- `delTx()` (tx-list-cashflow.js) sudah punya 9 blok cleanup
  linked-side-effect linear — field debt-borrow baru butuh blok ke-10
  supaya tidak jadi debt orphan saat transaksi sumbernya dihapus.
- **Sudah ada alternatif manual, 0 kode**: modul Buku Utang
  (`piutang-utang.js`, `Debt.save()`) SUDAH BISA mencatat "Utang ke
  Budi Rp X" hari ini juga, tanpa perlu tertaut ke transaksi tertentu —
  hasil bookkeeping-nya identik dengan yang G4 otomatis akan hasilkan.

**Rekomendasi utama: JANGAN bangun otomasi G4 sekarang** — kapabilitas
intinya sudah tersedia manual (§4 audit), permukaan integrasi jauh lebih
luas & rapuh dibanding pola serupa di Investasi/Aset, dan belum ada
laporan pengguna nyata yang butuh otomasi ini (konsisten prinsip
"driven by laporan konkret" yang sudah dipakai di sesi F3/F2-Opsi-B).

**Kalau tetap dilanjutkan ke depan** — dipecah C1→C4, dimulai dari
lingkup PALING kecil (transaksi Pengeluaran baru + tunai saja, TANPA
menyentuh cabang cicilan/langganan/utang/tagihan existing yang paling
rapuh), masing-masing 1 sesi 1 zip dengan audit ulang sebelum lanjut ke
sub-sesi berikutnya.

**Saran produk tambahan:**
- Dokumentasikan alur manual (Transaksi + Buku Utang, 2 modal) di
  tooltip/FAQ — 0 kode, mengisi gap G4 sekarang juga.
- Kalau demand nyata muncul, pertimbangkan desain lebih murah: tombol
  pintasan yang memanggil `saveTx()` + `Debt.save()` (dua-duanya APA
  ADANYA, 0 modifikasi) berurutan — 0 field baru, 0 cabang baru,
  risiko regresi mendekati nol dibanding menambah field ke `saveTx()`
  langsung.

**3 keputusan yang perlu dikonfirmasi user** (lihat §7 audit):
1. Setuju tidak membangun G4 sekarang?
2. Kalau tidak — mulai C1, atau alternatif "tombol pintasan"?
3. Perlu dokumentasi alur manual sekarang juga (independen dari #1/#2)?

## Perubahan Kode
**0 (nol).** Sesi ini murni menambah 1 file dokumen
(`AUDIT-SESI-C-PINJAM-TRANSAKSI-G4.md`) di root repo.

## Verifikasi
- `node --test tests/*.test.js` — **3266/3266 lulus**, angka SAMA
  PERSIS dengan v1232 (0 kode disentuh, jadi 0 test baru/berubah — ini
  yang diharapkan untuk sesi audit).
- `node scripts/build.js s502-audit-sesi-c-pinjam-transaksi-g4` — build
  sukses, versi naik ke **v1233** (versi dinaikkan murni supaya doc
  audit ini konsisten ter-track di riwayat rilis, bukan karena ada
  perubahan fungsional), sintaks kedua bundle valid.
- `esbuild` tidak tersedia (bundle belum diminify, sama seperti
  sesi-sesi sebelumnya — 100% valid & aman dipakai).

## Sisa Kerjaan
- **Sesi C** — status berubah dari "belum diaudit" → "sudah diaudit,
  MENUNGGU keputusan user (§7)" — TIDAK otomatis lanjut ke coding.
- **Sesi D** (opsional) — perluasan ke Kendaraan/Shop, tidak berubah
  oleh audit ini, masih menunggu use-case nyata.

## Catatan
Zip release ini **FULL RELEASE** (semua file, v1233). Zip patch
terpisah (`kw_patch_v1232-to-v1233_s502-audit-sesi-c-pinjam-transaksi-g4.zip`)
berisi HANYA file yang berubah/baru sejak v1232 — isinya murni 1 file
audit baru + file version-bump (0 file logic berubah).
