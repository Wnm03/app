# FIX s598 — R5 REALISASI: Pecah `dana-titipan-portfolio-presenter.js` jadi 3 modul (kali ini benar-benar live)

**Status: DONE.**

## Latar belakang

Percobaan split R5 pertama (S562-S563,
`FIX-s562-s563-r5-dana-titipan-presenter-split.md`) sempat "selesai" tapi
**DIVERGEN dari produksi**: sesi-sesi berikutnya (S554 lanjutan, S594, Sesi
C/S597) terus mengedit `dana-titipan-portfolio-presenter.js` monolit (file
yang seharusnya sudah dihapus S563, tapi entah kenapa kembali ada di
repo) sebagai satu-satunya file yang dibundel `scripts/build.js`, sementara
3 file hasil split lama (`dana-titipan-aggregation-api.js`,
`dana-titipan-commitment-return-api.js`, `dana-titipan-portfolio-render.js`)
jadi **orphan** — tidak terdaftar build, isinya ketinggalan (belum ada fix
S554-lanjutan/S594/S597). Ditemukan & didokumentasikan di S594
("TEMUAN SAMPINGAN") dan S597 ("DI LUAR SCOPE SESI INI").

**Keputusan:** realisasikan R5, bukan hapus orphan-nya begitu saja — 3 file
itu representasi desain split yang memang direncanakan, bukan sampah.

## Perubahan

1. **3 file di `modules/finance/` ditulis ulang** dari sumber **produksi
   terkini** (`dana-titipan-portfolio-presenter.js` versi s597, 1789
   baris — SUDAH termasuk fix S554 lanjutan/S594 doublecount aset
   bermigrasi + fitur "Estimasi dari Transaksi <Akun>" S597), BUKAN dari
   versi orphan S563 yang basi. 0 rumus/logic diubah dari versi s597,
   murni dipindah apa adanya:
   - `dana-titipan-aggregation-api.js` — `const DanaTitipanPortfolioAPI =
     {...}`: `_holdingSplits()`, `_asetOwnersForTitipan()`,
     `_assetSplits()` (termasuk guard `_migratedToInvestmentId` S594),
     `allocatedExcluding()`, `build()`, `listExistingOwners()`.
   - `dana-titipan-commitment-return-api.js` — `Object.assign
     (DanaTitipanPortfolioAPI, {...})`: `getCommitments()`,
     `saveCommitment()`, `deleteCommitment()`, `removeOwnerLinkage()`,
     `getReturns()`, `recordReturn()`, `deleteReturn()`. WAJIB dimuat
     setelah file 1.
   - `dana-titipan-portfolio-render.js` — `DanaTitipanPortfolioPresenter`
     (termasuk `_expenseComparisonForOwner()` S597),
     `DanaTitipanCommitmentUI`, `DanaTitipanReturnUI`. WAJIB dimuat
     setelah file 1 & 2.

2. **`scripts/build.js`** — entry bundle diganti dari 1
   (`dana-titipan-portfolio-presenter.js`) jadi 3 entry berurutan
   (aggregation-api → commitment-return-api → render), komentar
   terkait diupdate.

3. **File lama `modules/finance/dana-titipan-portfolio-presenter.js`
   DIHAPUS.**

4. **36 file test** di `tests/` — array `files` yang tadinya 1 nama file
   (hasil migrasi S596 ke arah monolit, sekarang jadi arah yang salah)
   dikembalikan ke daftar 3 file split. 4 test yang baca **raw source
   text** (`presenterSrc = fs.readFileSync(...)`) diarahkan ke
   `dana-titipan-portfolio-render.js` (lokasi baru markup/UI yang
   diperiksa): `s523b-titipan-owner-creation`,
   `s486-titipan-commitment-return`, `s521-titipan-expense-ui`,
   `s485d-titipan-commitment-ui`.

5. **Fix tambahan yang ditemukan blocking** (di luar scope R5, tapi
   diperbaiki karena diinstruksikan langsung oleh tooling build-nya
   sendiri): `MODULE_RENDER_VERSION` di `modules/shared/modules-render.js`
   masih `'s584-...'` stale 1 versi dari konstanta versi lain — disamakan
   manual supaya `verifyVersionConstantsSynced()` lolos (pola sama S563
   dengan `MODAL_VERSION`).

## Test

- Full regression (`node --test tests/*.test.js`): **4146 test, 4055
  pass, 91 fail** — dibandingkan A/B dengan baseline SEBELUM split
  (repo dgn s594+s596+s597 diterapkan, presenter.js monolit): **91
  kegagalan PERSIS SAMA** (diff nama test = 0 baris beda). 0 regresi
  baru dari split, 0 kegagalan lama ikut hilang (semuanya pre-existing,
  di luar scope Dana Titipan).
- Diulang lagi SETELAH `node scripts/build.js` (bundle regenerasi): hasil
  identik lagi (4055/4146, 91 gagal sama persis).

## Build

- `node scripts/build.js` sukses, versi naik ke `s584-...` / build
  `v1323`. `node --check` lolos untuk kedua bundle hasil build.
- Bundle (`app-bundle-b.min.js`) dikonfirmasi memuat KETIGA file split
  berurutan (`dana-titipan-aggregation-api.js` →
  `dana-titipan-commitment-return-api.js` →
  `dana-titipan-portfolio-render.js`), 0 sisa referensi
  `dana-titipan-portfolio-presenter.js` sebagai source path.
- Peringatan "file source kegedean" (`OVERSIZED_FILE_ALLOWLIST`):
  `dana-titipan-portfolio-presenter.js` (1789 baris) sudah tidak ada
  lagi di daftar (file sudah dihapus, split ke 3 file di bawah ambang).

## File yang berubah

- BARU (isi = split dari presenter.js versi s597):
  `modules/finance/dana-titipan-aggregation-api.js`,
  `modules/finance/dana-titipan-commitment-return-api.js`,
  `modules/finance/dana-titipan-portfolio-render.js`
- HAPUS: `modules/finance/dana-titipan-portfolio-presenter.js`
- UBAH: `scripts/build.js` (bundle file list + komentar)
- UBAH: `modules/shared/modules-render.js` (sync `MODULE_RENDER_VERSION`,
  blocking fix tak terkait — lihat §5 di atas)
- UBAH: 36 file di `tests/` (file list load order; 4 di antaranya juga
  fix path `readFileSync` raw source)
- REGENERASI (otomatis oleh `scripts/build.js`): `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Catatan lingkup (belum disentuh, di luar scope sesi ini)

- 3 file orphan LAIN yang tidak terkait R5 (`modules/modals.js`,
  `modules/shop/modals.js`, `finance/transaksi.js` root — didokumentasikan
  `AUDIT-S572-DUPLICATE-SOURCE-STALE-STATE.md`) — **TIDAK disentuh**,
  beda kasus dari 3 file R5 di atas.
- 91 kegagalan test pre-existing (Aset.saveOwners/totalValue,
  BUG-OWN-001/002 utang titipan, dll) — di luar scope, tidak terkait
  split ini, sudah diverifikasi identik sebelum & sesudah patch.

**CATATAN PENTING:** snapshot `app-main.zip` yang jadi basis patch ini
tertinggal (`s582/s584`) dari versi live Anda. Timpa SEMUA file di atas
(bukan cuma yang "UBAH", termasuk yang "BARU"/"HAPUS") ke repo Anda yang
sudah sinkron ke versi live, lalu jalankan `node scripts/build.js` di
sana sendiri supaya nomor versi/build ikut benar sesuai riwayat repo
Anda (jangan pakai bundle hasil build di sini apa adanya).
