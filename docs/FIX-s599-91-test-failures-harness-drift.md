# FIX s599 — 91 kegagalan test pre-existing: test-harness drift, bukan bug produksi

**Status: DONE.**

## Root cause

23 file test (91 subtest) gagal dengan error seragam
`<nama> is not defined` (mis. `isAssetOwnershipSelf`, `AlokasiAset`,
`AssetInsight`, `migrateAssetInvestmentsToHoldings`,
`registerAssetAIRules`, `syncLinkedAssetNilaiFromAkun`,
`assetInvestmentLinkOptionsHtml`, `_normalizeInstrumentName`,
`LaporanAset`). Diaudit: SEMUA simbol itu masih ADA di source produksi,
tapi sudah dipindah keluar dari `modules/asset/aset.js` ke
`modules/asset/aset-misc.js` (dan `LaporanAset` ke
`modules/asset/aset-reports.js`) di sesi refactor sebelumnya. Produksi
(`scripts/build.js`) SUDAH benar — memuat ketiga file berurutan
(`aset.js` → `aset-reports.js` → `aset-misc.js`, baris 114-116) — jadi
**0 bug produksi**, app live tidak pernah kena masalah ini.

Yang basi adalah `tests/helpers/loadSource.js`-based test harness: 23
file test memanggil `loadSource(['modules/asset/aset.js', ...])` TANPA
`aset-reports.js`/`aset-misc.js`, sisa dari sebelum refactor pemindahan
tsb — sandbox `vm` test jadi tidak pernah melihat simbol yang sudah
dipindah, walau di app nyata semua termuat lengkap.

## Fix

22 file: tambah `'modules/asset/aset-reports.js', 'modules/asset/aset-misc.js'`
tepat setelah setiap `'modules/asset/aset.js'` di array `files` yang
dikirim ke `loadSource()` — persis urutan produksi. 0 assertion diubah,
0 logic test diubah.

1 file (`window-expose-audit-s348.test.js`): target `AlokasiAset` di
array `TARGETS` diupdate `files: ['modules/asset/aset.js']` →
`['modules/asset/aset.js', 'modules/asset/aset-reports.js',
'modules/asset/aset-misc.js']` (const `AlokasiAset` sendiri sudah pindah
ke `aset-misc.js`, sudah punya `window.AlokasiAset=AlokasiAset` di sana
— test cuma perlu tahu di mana harus dicari).

## Test

- Full suite `node --test tests/*.test.js`: **4146 test, 4146 PASS, 0
  fail** (sebelumnya 4055 pass / 91 fail — SEMUA 91 kegagalan tertutup,
  0 kegagalan baru).
- `node scripts/build.js`: sukses (v1324), `node --check` lolos kedua
  bundle.

## File yang berubah

23 file di `tests/`:
`asset-3owners-linked-account-real-tx-audit-s444.test.js`,
`asset-investment-doublecount-fix-b8.test.js`,
`asset-investment-migration-candidates-b4.test.js`,
`asset-investment-owners-redirect-b2b.test.js`,
`asset-nilai-sync-from-akun-s422f.test.js`,
`asset-owners-ai-rules-regression-s392e.test.js`,
`asset-owners-flow-e2e-392a-to-392e.test.js`,
`asset-totalvalue-selfowned-s422d.test.js`,
`cross-module-sync-finalisasi-s201.test.js`, `dana-kelolaan.test.js`,
`dashboard-networth-ssot-s268.test.js`,
`fi-investment-asset-value-doublecount-fix-b9.test.js`,
`investment-ownership-sync-s261.test.js`,
`ownership-sync-ai-s265.test.js`, `ownership-sync-asset.test.js`,
`ownership-sync-debt-piutang.test.js`,
`ownership-sync-portfolio-networth.test.js`,
`s461-cross-source-titipan-total-regression.test.js`,
`s476a-migrate-investasi-to-holdings.test.js`,
`s476a2-cagr-yield.test.js`,
`s547-self-owner-identity-unification.test.js`,
`s584-networth-selfportion-consistency-audit.test.js`,
`window-expose-audit-s348.test.js`.

- 0 file produksi (`modules/*`) disentuh — murni fix harness test.
- REGENERASI otomatis (`node scripts/build.js`, jalankan sendiri di
  repo Anda): bundle + `app_production.html`/`index.html`/`sw.js`/
  `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md` — TIDAK disertakan
  di patch ini (0 file produksi berubah, aman untuk tidak upload ulang
  bundle kalau tidak mau, tapi jalankan `node scripts/build.js` tetap
  disarankan supaya versi & FILE-MAP tetap sinkron).
