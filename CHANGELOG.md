# Changelog — Sesi S609 (Dana Titipan: fix modal "Catat Pengeluaran" tidak sync deductionOwnerId & tidak punya field Akun, v1342)

## Laporan user
Dropdown "Pemilik Sumber Potongan" tidak pernah muncul saat mencatat
pengeluaran lewat modal "Catat Pengeluaran Dana Titipan", dan transaksi yang
dicatat lewat modal itu tidak sync ke badge "👤 Ditanggung", kartu "Porsi
per Pemilik", dan "Estimasi dari Transaksi Akun" di dashboard Dana Titipan.

## Root cause
Modal Dana Titipan (`TitipanExpenseFlow`/`TitipanExpenseUI`, S521) adalah
alur transaksi terpisah dari form Transaksi biasa (`txModal`):
1. Tidak punya field Akun sama sekali — `accountId` di-hardcode ke
   `D.accounts[0]`, jadi tidak ada `#txAcc`-equivalent yang bisa memicu
   dropdown "Pemilik Sumber Potongan" (field itu murni milik `txModal`).
2. Tidak pernah mengisi `deductionOwnerId` — field yang sejak S574/S608
   dibaca `resolveTxOwnerAssignment()` (filter-laporan.js) sebagai sumber
   kebenaran badge/kartu/estimasi Dana Titipan di atas. Modal ini hanya
   menulis `titipanLinkId` (field terpisah, tidak dibaca konsumen tsb),
   jadi transaksi lewat sini selalu jatuh ke fallback "owner pertama" di
   semua tampilan yang membaca `deductionOwnerId`.

## Fix (additive, 0 logic lama diubah)
1. `modules/shared/modals.js` — tambah dropdown "Bayar dari Akun"
   (`#titipanExpenseAcc`) ke `titipanExpenseModal`.
2. `modules/finance/titipan-expense-ui.js` — `open()` mengisi & reset
   dropdown akun ke akun pertama (pola sama `billAcc`,
   tagihan-kalender.js); `save()` membaca `accountId` dari dropdown itu
   (fallback ke akun pertama dipertahankan hanya untuk elemen yang belum
   sempat terisi).
3. `modules/finance/titipan-expense-flow.js` — `submit()` sekarang juga
   mengisi `tx.deductionOwnerId = row.ownerId` di tiap transaksi yang
   dibuat (1 baris split = 1 owner yang sudah tervalidasi lewat
   `resolveOwner()`/`validate()`, aman diisi langsung tanpa validasi
   ulang terhadap owners akun).
4. Test baru/diperluas: `tests/s521-titipan-expense-flow.test.js` (assert
   `deductionOwnerId` di test 1 & 2, konsisten dgn `titipanLinkId` di tiap
   baris split) dan `tests/s521-titipan-expense-ui.test.js` (assert
   `deductionOwnerId` di test 7 + test baru 7b/7c untuk dropdown akun).
- Version otomatis naik v1341 → **v1342** (`scripts/build.js`).
- Test: `node --test tests/*.test.js` — **4280/4280 lulus, 0 gagal**.
- `verify-release-ready.js`: lolos (gate lint/minify di-override manual —
  sandbox tanpa akses npm/jaringan, eslint & esbuild tidak terpasang;
  gate html-sync & version-sync lolos bersih).

# Changelog — Sesi S591 (Dana Titipan: dedup holding "Majoris" 2x + tombol Atur Porsi ganda, v1319)

## Konteks
Laporan user: di kartu Dana Titipan (tab Uang), 1 aset yang sama (mis.
"🏦 Majoris") muncul lebih dari 1 kali di daftar holding untuk owner yang
sama, dengan persentase porsi identik di tiap baris — dan tiap baris punya
tombol "⚖️ Atur Porsi" sendiri, terpisah dari dropdown "Pilih Aset" +
tombol "⚖️ Atur Porsi Aset" yang sudah ada di bawahnya.

## Hasil
- **Root cause**: `DanaTitipanPortfolioAPI.build()`
  (`modules/finance/dana-titipan-portfolio-presenter.js`) push 1 baris
  holding PER BARIS `owners[]` hasil `_assetSplits(a)` tanpa dedup — kalau
  1 aset punya lebih dari 1 baris pemilik dengan `ownerId` yang sama, aset
  itu tampil sebagai beberapa baris terpisah.
- **Fix**:
  1. Dedup per (aset, owner) — baris `owners[]` diagregasi dulu per
     `ownerId` (jumlah porsi/allocatedPrincipal/currentValue/gain) sebelum
     push ke `bucket.holdings`; total per-owner tidak berubah.
  2. Tombol "⚖️ Atur Porsi" per-baris holding dihapus dari
     `_holdingRowHtml()` — pengaturan porsi sekarang hanya lewat dropdown
     "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" per kartu owner.
- `modules/finance/dana-titipan-portfolio-presenter.js` — satu-satunya
  file source produksi yang disentuh sesi ini.
- Version otomatis naik v1318 → **v1319** (`scripts/bump-version.sh`),
  disusulkan di sesi ini bareng entri changelog ini (patch asli S591
  belum menyertakan bump versi/changelog).
- `verify-release-ready.js` Gate version-sync (S588): lolos di v1319.
- Test: `node --test tests/*.test.js` — 386/387 lulus di scope
  dana-titipan/portfolio saat S591 dikirim (1 kegagalan pre-existing tidak
  terkait, `s461-cross-source-titipan-total-regression.test.js`); full
  suite belum dijalankan ulang di sesi susulan ini.

Detail lengkap: `s591-SESSION-NOTE.md`.

# Changelog — Sesi S590 (Fix: tombol Hapus menu aksi aset ketutup nav bawah, v1318)

## Konteks
Laporan user (live, dikonfirmasi bukan cuma recent-apps Android): tombol
"🗑 Hapus" di modal aksi aset ketutup nav bawah walau modal sudah terbuka,
tetap terjadi setelah patch v1316 (cache-bump) di-upload & di-refresh.

## Hasil
- **Root cause**: `body.has-open-modal .nav { display: none; }` (styles.css)
  tanpa `!important` — kalah lawan inline style `mn.style.display='flex'`
  yang di-set `showMain()` sekali saat app dibuka. Class `has-open-modal`
  sendiri toggle BENAR, tapi efek visualnya kalah, jadi nav tidak pernah
  benar-benar hilang lagi sejak app pertama dibuka — berpotensi
  mempengaruhi semua modal/qs-sheet yang pakai mekanisme ini, tidak cuma
  menu aksi aset.
- **Fix**: tambah `!important` ke rule itu. `showMain()`/inline style-nya
  tidak disentuh sama sekali (0 risiko regresi ke titik lain).
- `styles.css` — satu-satunya file source produksi yang disentuh sesi ini.
- `tests/nav-hidden-modal-inline-style-override-s590.test.js` (**baru**, 3
  test, semua pass).
- Version otomatis naik v1317 → **v1318** (`scripts/bump-version.sh`).
- Full `npm test`: **4147 test, 4056 pass, 91 fail** (baseline sebelum sesi
  ini: 4144/4053/91 — identik), **0 regresi baru**.
- `verify-release-ready.js` Gate version-sync (S588): **lolos** di v1318.

Detail lengkap: `s590-SESSION-NOTE.md`.

# Changelog — Sesi S588 (Gate 4 "version-sync" di verify-release-ready.js)

## Konteks
Menutup celah yang menyebabkan bug cache basi sebelumnya (?v=1314 lupa
dinaikkan bareng CACHE_NAME sw.js — lihat PATCH-README-v1316-cache-bump.md):
`bump-version.sh` sudah bisa menaikkan versi dengan benar, tapi belum ada
gate yang BLOCK pembuatan ZIP kalau ternyata versi masih tidak sinkron.

## Hasil
- Gate 4 baru "version-sync" di `scripts/verify-release-ready.js`: BLOCK
  ZIP (tanpa override) kalau `?v=N` di `index.html` tidak seragam, atau
  tidak sama dengan `CACHE_NAME` di `sw.js`.
- `tests/verify-release-ready-s575-version-sync.test.js` (**baru**, 4 test,
  semua pass).
- `scripts/verify-release-ready.js` — satu-satunya file source produksi
  yang disentuh sesi ini.
- Full `npm test`: **4144 test, 4053 pass, 91 fail** (baseline tanpa test
  baru: 4140/4049/91 — identik), **0 regresi baru**.

Detail lengkap: `s588-SESSION-NOTE.md`.

# Changelog — Sesi S581 (DL-Next-8: Data Health Check Other-Account Owner Source Fix, v1312)

## Konteks
Implementasi **DL-Next-8** dari `docs/DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-
CHECK-OTHER-ACC-SOURCE.md` (ref `docs/AUDIT-13-OWNER-RESOLVER-POST-DL-
NEXT-7.md`). 1 sesi, 1 fokus: ganti basis cabang `existsOnOtherAcc` di
`runDataHealthCheck()`.

## Hasil
- **Bug diperbaiki**: kategorisasi salah di Data Health Check untuk
  transaksi yang `deductionOwnerId`-nya valid HANYA lewat aset multi-
  owner tertaut di AKUN LAIN — sebelumnya dikategorikan "tidak ditemukan
  sama sekali" (kasus A), seharusnya "ada, tapi di akun lain" (kasus C).
  Level `warn` tidak berubah di kedua kasus (bukan false-negative), murni
  perbaikan judul/pesan.
- `data-health-check.js` sekarang pakai `resolveOwnerDefaultForAccount()`
  per akun lain (sumber sama dgn cabang utama DL-Next-7), fallback ke
  `a.owners[]` lama kalau fungsi belum termuat.
- `data-health-check.js` — **satu-satunya** file source produksi yang
  disentuh sesi ini.
- `tests/data-health-check-other-acc-owner-source-s581.test.js`
  (**baru**, 4 test — regresi utama AUDIT-13 dikonfirmasi fix).
- Full `npm test`: **4081 test, 4072 pass, 9 fail** (naik dari 4077/4068/9,
  +4 test baru semua pass) — 9 kegagalan identik pre-existing, **0
  regresi baru**.

Detail lengkap: `docs/FIX-v1310-to-v1312-s581-data-health-check-other-acc-owner-source-fix.md`.
