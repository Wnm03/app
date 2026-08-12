# Patch: Revisi visibility "Pemilik Sumber Potongan" — S575, v1306

Versi build: 1306 (tetap, sesuai instruksi — angka ini sudah dipakai patch
sebelumnya "akun-aset-reverse-sync", sesi ini melanjutkan di angka yang sama).

## Perubahan

Sebelumnya (S574-C): field "Pemilik Sumber Potongan" di Transaksi tampil
HANYA kalau akun `isMultiOwner` (owners.length>1 DAN total porsi = 100%,
lewat `getAccOwners()`/`MultiOwnerEngine.getOwners()` yang membungkus
`validateOwners()`).

Sekarang: field tampil kalau akun punya `owners[]` ASLI dengan minimal 1
baris ber-`ownerId` — TIDAK pernah mensyaratkan `isMultiOwner` maupun total
porsi 100%.
- 1 owner → field tampil, otomatis terpilih.
- 2+ owner → dropdown tampil, tetap wajib pilih manual (perilaku lama
  dipertahankan: pilihan owner akun sebelumnya tidak pernah terbawa ke akun
  lain).

## Root cause temuan audit

`getAccOwners()` mensyaratkan `validateOwners()` (total=100%) sebelum owners
ASLI dipakai — kalau gagal, owners diganti diam-diam jadi sintesis SELF
(`isSynthesized:true`). Menggantung visibility ke situ berarti diam-diam
tetap mensyaratkan total 100%, melanggar larangan eksplisit di spec sesi ini.

## Fix

1. `getAccOwnersRaw(accId)` baru (`modules/finance/akun.js`) — baca
   `acc.owners[]` apa adanya, filter hanya per-baris `ownerId` valid (TANPA
   syarat `porsi`/total). Dipakai KHUSUS oleh visibility Transaksi — tidak
   dipakai di tempat lain (Buku Aset/Zakat/Kekayaan Bersih/`setAccOwners()`
   tetap pakai `getAccOwners()`, tidak disentuh).
2. `updateTxDeductionOwnerVisibility()` (`modules/finance/transaksi.js`)
   diganti pakai `getAccOwnersRaw()`, auto-select kalau owners.length===1.
3. Validasi wajib-pilih saat simpan (`_saveTxInner()`, masih pakai
   `getAccOwners()`/`isMultiOwner`) **TIDAK diubah** — di luar scope (aturan
   validasi porsi kepemilikan).
4. `setAccOwners()`, `deductionOwnerId`, `assetId`, saldo/nominal — tidak
   disentuh.

## File berubah (logic manual)

- `modules/finance/akun.js` — `getAccOwnersRaw()` baru (~20 baris)
- `modules/finance/transaksi.js` — `updateTxDeductionOwnerVisibility()`
  direvisi
- `tests/s574-d2-deduction-owner-persist-validation.test.js` /
  `tests/s574-e-history-badge-datahealth-regression.test.js` — stub
  `getAccOwnersRaw()` ditambahkan ke harness (test lama stub `getAccOwners()`
  saja, sekarang perlu keduanya)

## File baru

- `tests/s575-tx-deduction-owner-visibility.test.js` — 6 test: akun tanpa
  owners, 1 owner (auto-select), 2+ owner (manual), 1 owner total≠100%,
  2 owner total≠100%, ganti akun A→B (pilihan tidak terbawa)

## File rebuild otomatis (`node scripts/build.js` + `bump-version.sh`)

`app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
`index.html`, `sw.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
`docs/RELEASE-GATE-LOG.md`, dan konstanta versi di
`modules/shared/modules-render.js` / `modules/shared/modals.js` /
`modules/shared/modules-calc.js` / `chat-action-handlers.js` /
`modules/shared/features-helpers-global-security.js`.

## Test

- Full suite: **4051 test, 4042 pass, 9 fail** — 9 kegagalan PERSIS SAMA
  (nama & lokasi identik) dengan pre-existing sebelum sesi ini (domain
  Investment Owners nominal display + `resolveTxOwnerAssignment` legacy,
  tidak terkait). **0 regresi baru.**
- 6 test baru S575: PASS semua.
- Test S574 lama (d2/e/tx-account-not-owner-no-split/acc-owners-reverse-sync):
  37/39 pass, 2 fail = pre-existing yang sama di atas.

## Build

`node scripts/build.js` PASS (semua lint regresi built-in PASS, 0
MODAL_HTML drift). `verify-bundle-freshness.js` PASS. `verify-release-ready.js`
PASS dengan 2 override terdokumentasi (`docs/RELEASE-GATE-LOG.md`) — eslint
& esbuild tidak bisa dipasang di sandbox ini (tanpa akses jaringan), bundle
tidak diminify tapi 100% valid (`node --check` lolos).

## Bundle ini merupakan release PENUH

ZIP ini berisi seluruh tree `app-main` (bukan patch-diff parsial) — sudah
termasuk patch "akun-aset-reverse-sync" v1306 yang di-upload bersamaan
dengan sesi ini, DITAMBAH revisi visibility di atas. Siap upload langsung.
