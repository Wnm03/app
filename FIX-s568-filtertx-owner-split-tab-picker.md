# FIX s568 — Riwayat Transaksi Akun Tertaut: Porsi per Pemilik Jadi Pilihan Tab (Bukan Patungan)

**Permintaan user (lanjutan sesi 567):** dari screenshot "Riwayat: Majoris"
— "Fokus gambar porsi per pemilik bukan patungan ubah menjadi pilihan per
pemilik renov aja atau mas sihab saja."

## Masalah

Sejak S567, blok "👥 Porsi per Pemilik" di modal Riwayat Transaksi (scope
`account`, akun tertaut Aset multi-owner) menampilkan SEMUA pemilik
sekaligus dalam satu blok (mode "patungan" — mis. baris "mas sihab" dan
"renov" tampil bersamaan). User ingin ini jadi PILIHAN: bisa lihat "renov"
saja atau "mas sihab" saja, bukan digabung.

## Perubahan

- **`modules/finance/filter-laporan.js` (`showFilteredTx`):** blok owner
  split sekarang render sbg tab (reuse class `.cn-tab`/`.cn-tab.active`
  dari `styles.css`, sudah dipakai di tempat lain — 0 CSS baru) berisi
  nama tiap pemilik. Data lengkap tiap owner (Modal/Pengeluaran/Total)
  disimpan di `window._filterTxOwnerSplitRows`; hanya owner PERTAMA yang
  dirender ke `#filterTxOwnerSplitDetail` saat modal dibuka.
- **`selectFilterTxOwnerSplit(idx)`** (baru): dipanggil saat tab diklik —
  ganti isi `#filterTxOwnerSplitDetail` ke owner terpilih & toggle class
  `active` pada tombolnya. Murni baca dari array yang sudah dihitung,
  TIDAK menghitung ulang split (0 query D.assets/transactions tambahan).
- Total Modal/Pengeluaran/Total per owner (hasil `MultiOwnerEngine.
  splitByPorsi()`) tidak berubah rumusnya sama sekali — cuma cara
  tampilnya yang berubah dari "semua sekaligus" jadi "satu per satu via
  tab".

## Test

- `tests/s567-filtertx-owner-split.test.js` (test 1) di-update: sebelumnya
  assert kedua nama+detail owner tampil bersamaan di HTML; sekarang assert
  kedua NAMA tampil sbg tombol tab, tapi hanya detail owner PERTAMA yang
  ada di HTML awal, dan data owner kedua tersedia lewat
  `window._filterTxOwnerSplitRows` (siap ditampilkan saat tabnya diklik).
- Full suite: 3975/3975 pass.

## File yang berubah

- `modules/finance/filter-laporan.js` (ubah)
- `tests/s567-filtertx-owner-split.test.js` (ubah)
- Bundle regenerasi via `node scripts/build.js` → versi 1297, S568:
  `app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
  `index.html`, `sw.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `chat-action-handlers.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js` (versi sync only,
  0 logic baru di file-file ini).
