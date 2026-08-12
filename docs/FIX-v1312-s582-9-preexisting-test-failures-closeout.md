# FIX v1312 — Sesi S582 (Closeout 9 Kegagalan Test Pre-Existing)

## Konteks
Permintaan user: audit dan perbaiki `node --test tests/*.test.js: 4081
test, 4072 pass, 9 fail`. Ke-9 kegagalan ini **sudah didokumentasikan
sebagai pre-existing** di `RES-D-IMPLEMENTATION-REPORT.md` (baseline
v1306) dan dikonfirmasi ulang identik di `AUDIT-14-OWNER-RESOLVER-
POST-DL-NEXT-8.md` (v1312) — 0 terkait rantai Owner Resolver. Sesi ini
mengaudit akar masalah tiap kelompok satu-per-satu dan menutupnya.

## Temuan & Perbaikan (3 kelompok)

### Kelompok 1 (1 test) — `data-health-check-tx-assetid-selflink-s559.test.js`
**Akar masalah:** GAP NYATA, bukan test basi. Test ini menguji cek baru
"transaksi self-link ke aset yang accountId-nya sama dengan akun
transaksi itu sendiri" (follow-up dari patch UI
`akun-majoris-selflink-redundant`/`updateTxAssetWrapVisibility()` di
`transaksi.js`, lihat `tests/s559-tx-asset-selflink-redundant.test.js`
yang PASS) — tapi cek sisi `data-health-check.js`-nya **tidak pernah
benar-benar ditulis** di source produksi (0 hit grep judul/logic-nya di
seluruh repo sebelum sesi ini).

**Fix:** tambah 1 blok cek baru di `runDataHealthCheck()`
(`data-health-check.js`, setelah cek orphan `t.assetId` yang sudah ada) —
kalau `t.assetId` valid (bukan orphan) DAN aset yang ditunjuk itu
`accountId`-nya sama dengan `t.accountId` transaksi itu sendiri → warn
"Transaksi tertaut ke Aset Multi-Owner yang redundan (menautkan diri
sendiri)". Murni baca (0 auto-repair), guard `_linkedAsset &&`
(skip kalau assetId orphan, sudah ditangani cek lain) dan `t.accountId &&`
(skip kalau transaksi tanpa accountId) — pola sama persis cek-cek orphan
lain di file ini.

**Hasil:** `tests/data-health-check-tx-assetid-selflink-s559.test.js`
4/4 pass (naik dari 1/4).

### Kelompok 2 (6 test) — `s551-investment-owners-nominal-readonly.test.js`
**Akar masalah:** stale test, sudah **resmi diputuskan untuk di-retire**
sejak `FIX-s551-nominal-readonly-test-retire.md` (premis test ini —
field Nominal read-only — sudah dibalik sengaja jadi 2 arah oleh
keputusan desain Sesi 552) — tapi eksekusi hapus file itu **belum pernah
benar-benar dijalankan** di snapshot manapun sejak saat itu (dikonfirmasi
ulang di `RES-D-IMPLEMENTATION-REPORT.md`: "file retire belum
tereksekusi di snapshot ini").

**Fix:** eksekusi keputusan yang sudah dikunci — **hapus**
`tests/s551-investment-owners-nominal-readonly.test.js`. Coverage
pengganti (`tests/s552-investment-owners-nominal-bidirectional.test.js`,
11 test termasuk assersi eksplisit "TIDAK PERNAH menulis balik") sudah
ada & tetap 11/11 pass — dicek ulang sebelum hapus. 0 file lain
mereferensikan nama file test ini (`grep -rl`), test suite di-discover
via `fs.readdirSync` (`scripts/build.js`) jadi 0 wiring lain berubah.

### Kelompok 3 (2 test) — `s574-tx-account-not-owner-no-split.test.js`
**Akar masalah:** stale test dengan premis yang **sudah dibatalkan
produk**, belum pernah ada keputusan retire resmi (baru sebatas dicatat
"pre-existing" di `RES-D-IMPLEMENTATION-REPORT.md`) — diaudit tuntas
sesi ini:
- Test ini mengasumsikan fitur "👥 Porsi per Pemilik" di
  `showFilteredTx(scope=account)` (`filter-laporan.js`) **dihapus total**
  ("BUGFIX LANJUTAN" versi test ini menyebut Sesi 574 spesifik).
- Faktanya, fitur itu **bukan dihapus** — ditambah di S567
  (`FIX-s567-filtertx-owner-porsi-split.md`), lalu di-enhance S568 (tab
  picker per-owner), lalu di-enhance LAGI lewat "Sesi A"
  (`AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md`, fix source owner jadi live
  via `resolveTxOwnerSplitForAccount()`) dan sesi lanjutan (assignment
  eksplisit per-transaksi via `tx.ownerPorsiId`,
  `resolveTxOwnerAssignment()`) — comment terbaru di kode produksi
  eksplisit menyebut ini sebagai **permintaan user yang berkelanjutan**,
  bukan bug yang harus dihapus.
- Nama file "S574" di test ini **bentrok penomoran sesi** dengan
  "Sesi 574 — Pemilik Sumber Potongan" yang sebenarnya (lihat
  `S574-IMPLEMENTATION-REPORT.md`, fitur `deductionOwnerId` — domain
  BEDA TOTAL, sengaja dipisah dari `ownerPorsiId`/split ini sesuai
  Design Lock lama). Test file ini kemungkinan draft/proposal awal yang
  **tidak pernah disetujui/dieksekusi** sebagai perubahan produk nyata —
  arah produk yang benar-benar berjalan adalah mempertahankan &
  memperkaya fitur split, bukan menghapusnya.

**Fix:** **hapus** `tests/s574-tx-account-not-owner-no-split.test.js`.
0 kode produksi disentuh (fitur split di `filter-laporan.js` sudah benar
sesuai arah produk yang sebenarnya berjalan — mengubah kode untuk
mengikuti premis test yang sudah dibatalkan justru akan MERUSAK fitur
aktif). 0 file lain mereferensikan nama file test ini di luar 2 laporan
historis (`RES-D-IMPLEMENTATION-REPORT.md`, `S574-IMPLEMENTATION-
REPORT.md`) yang murni mencatat kegagalan lama, tidak bergantung ke file
test-nya secara fungsional.

## Verifikasi
- `node --check data-health-check.js` — lolos.
- `node --test tests/data-health-check-tx-assetid-selflink-s559.test.js`
  → 4/4 pass.
- `node --test tests/s552-investment-owners-nominal-bidirectional.test.js`
  → 11/11 pass (dicek sebelum hapus S551, konfirmasi coverage pengganti
  utuh).
- Full `node --test tests/*.test.js`:
  **SEBELUM:** 4081 test, 4072 pass, 9 fail.
  **SESUDAH: 4071 test, 4071 pass, 0 fail.**
  Rincian perubahan jumlah test: file self-link (4 test, 1 gagal→4 test,
  0 gagal, jumlah TIDAK berubah krn cek baru ditambah ke fungsi yang
  sudah dites, bukan test baru) + file S551 dihapus (−7 test, 1 pass + 6
  fail lama) + file S574-split dihapus (−3 test, 1 pass + 2 fail lama) =
  4081 − 7 − 3 = **4071 test, 0 gagal.**

## Rilis
`node scripts/build.js s582-9-preexisting-test-failures-closeout`
(v1312→v1313). `verify-bundle-freshness.js` & `verify-window-expose.js`
lolos. Bundle **tidak diminify** (esbuild tidak terpasang, sandbox tanpa
akses jaringan) — `node --check` lolos di kedua bundle. Gate
lint/minify di `verify-release-ready.js` di-override manual (pola sama
S508–S581), tercatat di `docs/RELEASE-GATE-LOG.md`.

## Cakupan yang SENGAJA tidak dikerjakan
- Tidak menyentuh logic split `filter-laporan.js` (`resolveTxOwnerAssignment`/
  `selectFilterTxOwnerSplit`/`resolveTxOwnerSplitForAccount`) — fitur ini
  **dipertahankan apa adanya**, sudah benar sesuai arah produk terkini
  (S567/S568/Sesi A dan seterusnya), test yang salah premisnya yang
  dihapus, bukan fiturnya.
- Tidak membuat penggantian test baru untuk 2 file yang di-retire — sudah
  ada coverage pengganti yang memadai (S552 untuk kelompok 2; untuk
  kelompok 3, fitur split sudah dicover `tests/s567-filtertx-owner-split.test.js`
  dan test lain di sekitarnya yang tidak disentuh sesi ini).
