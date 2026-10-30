# Patch: DL-Next-9 Owner Quota "Kuota Sisa" — Sinkron dgn `spent` Formula `build()`

Ref: `DESIGN-LOCK-DL-NEXT-9-OWNER-QUOTA-SISA-SPENT-SYNC-2.md` (Revisi 3,
LOCK).

## Verifikasi pre-implementasi (WAJIB dicek dulu sesuai design lock)

- **Cek Revisi 2 (binary `hasAnyPorsi`/`hasPorsiElsewhere`)**: TIDAK
  ditemukan jejaknya di source (`dana-titipan-aggregation-api.js`,
  `investasi-view.js`, `aset.js`) — jadi **0 langkah revert diperlukan**.
  `build()` sudah memakai formula pre-DL-Next-9 (`spent =
  allocatedPrincipal + usedTotal + linkedExpenseTotal`, satu cabang, tanpa
  pengecualian "hilang setelah porsi pertama") apa adanya.
- **Poin verifikasi teknis #1** (`costSplit` di `allocatedExcluding()`
  identik basis dgn yang mengisi `o.allocatedPrincipal` di `build()`):
  DIKONFIRMASI — keduanya baca `costSplit[idx].bagian` dari
  `_holdingSplits()`/`_assetSplits()` yang sama persis.
- **Poin verifikasi teknis #2** (`usedTotal`/`linkedExpenseTotal` global
  per-owner, bukan per-holding): DIKONFIRMASI — `usedMap` dikunci per
  `tx.titipanLinkId` (= `ownerId`), `_linkedExpenseTotalForOwner()` dikunci
  per `o.ownerId`. Jadi 0 exclusion tambahan diperlukan utk kedua
  komponen ini di live modal (beda dgn `allocatedExcluding()` yang memang
  harus exclude instrumen yang sedang dibuka).
- **Poin verifikasi teknis #3** (live modal butuh `build()` penuh atau
  helper ringan): diputuskan panggil `DanaTitipanPortfolioAPI.build()`
  langsung dari `_ownerQuotaText()` (0 caching tambahan) — konsisten
  dengan pola performa existing di fungsi ini (sudah memanggil
  `getCommitments()`/`allocatedExcluding()` yang sama-sama O(n) scan
  tiap ketik).

## Fix

Root cause: "💰 Kuota sisa" di modal `investmentOwnersModal`/
`assetOwnersModal` HANYA mengurangi `allocatedExcluding()` (pokok
teralokasi ke instrumen lain) + nominal draft baris ini dari `principal`
— mengabaikan 2 jalur pengeluaran yang SUDAH jadi bagian formula `spent`
di `build()`/`estimatedUnallocated` sejak Sesi 519 & Sesi
PATCH-2026-08-14 (`usedTotal` — jalur "💸 Catat Pengeluaran Dana
Titipan" — & `linkedExpenseTotal` — pengeluaran akun tertaut
`deductionOwnerId`). Akibatnya angka "Kuota sisa" bisa tidak sinkron
dengan dashboard Dana Titipan.

- `modules/asset/investasi-view.js` (`InvestmentUI._ownerQuotaText()`):
  tambah `usedTotal` + `linkedExpenseTotal`, dibaca dari owner bucket
  `DanaTitipanPortfolioAPI.build()`, ke pengurang formula. Formula baru:
  `sisa = principal - allocatedExcluding() - usedTotal -
  linkedExpenseTotal - draftNominal`.
- `modules/asset/aset.js` (`Aset._ownerQuotaText()`): mirror PERSIS fix
  di atas utk domain Aset.
- `modules/finance/dana-titipan-aggregation-api.js`: 0 rumus diubah
  (formula `build()` sudah benar) — tambah komentar Hard Invariant
  eksplisit di titik perhitungan `estimatedUnallocated`/
  `allocationStatus` (Untung-Rugi permanen terpisah dari kuota, sesuai
  design lock).

## Hard Invariant (tidak berubah)

`o.gain`/`gainSplit`/`currentValue` (Untung-Rugi) TIDAK PERNAH masuk
formula kuota di titik manapun (`build()` maupun live modal) — HANYA
`principalAmount`/`allocatedPrincipal` (cost-basis)/`usedTotal`/
`linkedExpenseTotal` yang boleh mempengaruhi "Kuota sisa"/
`estimatedUnallocated`/`allocationStatus`.

## Verifikasi

- Test baru: `tests/dl-next-9-owner-quota-sisa-spent-sync.test.js`
  (12 kasus — Case A-G dari Test Plan design lock: partial/full/over
  allocation, gain tidak mempengaruhi kuota, owner baru, exclusion edit
  holding, cross-domain Investment+Aset; + fix `usedTotal` di kedua
  modal `InvestmentUI`/`Aset`; + Hard Invariant gain tidak masuk live
  modal).
- Full suite: **4292/4292 lolos** (`node --test tests/*.test.js`).
- Test existing yang diaudit ulang sesuai checklist design lock (§12):
  `patch-2026-08-14-b-majoris-deductionowner-sync`,
  `patch-2026-08-14-titipan-unallocated-linked-expense`,
  `s484-dana-titipan-portfolio-presenter`, `s485a/b/c/d`,
  `s486-titipan-commitment-return`, `s505-asset-owner-quota-live`,
  `s514-dana-titipan-exact-principal-guard`, `s523a/c/f` — **SEMUA
  lolos tanpa perubahan expected value** (dikonfirmasi: karena `build()`
  memang sudah di formula pre-DL-Next-9 yang benar sejak awal, sesi
  coding sebelumnya yang disebut design lock TIDAK sempat menyentuh
  file-file ini dgn model binary Revisi 2 — 0 regresi, 0 revert
  diperlukan).
- `node scripts/build.js` sukses — versi naik ke **1345**
  ("s616-owner-registry-mandatory-lookup"), sintaks kedua bundle valid
  (`node --check`), `FILE-MAP.md`/`COVERAGE-PER-MODULE.md`
  ter-regenerate otomatis.

## File yang berubah/ditambah (sesi ini)

- `modules/finance/dana-titipan-aggregation-api.js` (diedit — komentar
  saja, 0 rumus berubah)
- `modules/asset/investasi-view.js` (diedit)
- `modules/asset/aset.js` (diedit)
- `tests/dl-next-9-owner-quota-sisa-spent-sync.test.js` (baru)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (regenerated, v1345)
- `app_production.html`, `index.html`, `sw.js` (version bump ?v=1345 /
  cache name)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerated)
