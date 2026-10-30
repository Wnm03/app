# Sesi 505 (S505) — Live Kuota Dana Titipan pada `assetOwnersModal`

Ref: `PROMPT-S505-LIVE-KUOTA-ASSETOWNERSMODAL.md`.

## Status

**IMPLEMENTED**

## Baseline

v1236, `node --test tests/*.test.js` = **3280/3280** hijau.

## Final

v1237, `node --test tests/*.test.js` = **3290/3290** hijau (3280 lama + 10
baru, 0 regresi).

## Target

`assetOwnersModal` belum menampilkan kuota Dana Titipan live. S504 sudah
menyelesaikan fondasinya (`allocatedExcluding()` lintas domain Investment +
Aset), tapi belum ada UI yang memakainya di sisi Aset.

## Root cause

UI `assetOwnersModal` (`Aset.*` di `modules/asset/aset.js`) belum mereuse
`DanaTitipanPortfolioAPI.allocatedExcluding()` — mekanisme "Kuota sisa" yang
sudah berjalan di `investmentOwnersModal` (S494) tidak pernah di-mirror ke
sisi Aset.

## Solution

Mirror mekanisme `InvestmentUI._ownerQuotaText()` /
`InvestmentUI._updateOwnerQuotaDisplay()` / `InvestmentUI.onOwnerPorsiInput()`
(investasi-view.js, TIDAK diubah sama sekali sesi ini) ke `Aset.*`
(aset.js):

- **`Aset._ownerQuotaText(o)`** (baru) — hitung teks "💰 Kuota sisa: Rp X"
  per baris owner non-SELF, 100% reuse `DanaTitipanPortfolioAPI
  .getCommitments()` (baca `principalAmount`) +
  `DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId, {assetId:
  currentAssetId})` (S504, bentuk BARU object — BUKAN string, supaya
  exclusion masuk domain Aset, bukan Investment) + `Aset._ownersAssetNilai()`
  (basis nilai Rp yang SAMA dipakai kolom Nominal (Rp) existing S429,
  turunan `a.nilai`).
- **`Aset._updateOwnerQuotaDisplay(i)`** (baru) — update HANYA elemen
  `#assetOwnerKuota{i}` tanpa render ulang list (pola sama S494, supaya
  fokus/kursor input tidak hilang tiap ketik).
- **`Aset._renderOwnersList()`** — tambah `<div id="assetOwnerKuota{i}">`
  di tiap baris owner non-SELF (setelah checkbox "Ini saya"), sama posisi
  struktural `InvestmentUI._renderOwnersList()`.
- **`Aset.onOwnerPorsiInput(i,val)`** — tambah 1 baris panggilan
  `Aset._updateOwnerQuotaDisplay(i)` di akhir, sama pola
  `InvestmentUI.onOwnerPorsiInput()`.
- **`Aset.onOwnerNominalInput(i,val)`** (kedua cabang) — Aset punya field
  Nominal (Rp) tambahan yang tidak ada di Investment (S429) & juga
  mengubah `porsi` baris (langsung/tidak langsung lewat
  `_autoDistributeRemaining()`); ditambahkan refresh
  `_updateOwnerQuotaDisplay()` utk SEMUA baris draft di kedua cabang
  supaya kuota tetap konsisten & live meski trigger-nya dari field
  Nominal, bukan cuma Porsi (%) — perluasan wajar dari live-update S494
  ke field kedua yang memang sudah ada di modal ini, 0 field/mekanisme
  baru di luar itu.

## Logic

```
Dana Titipan Owner
       ↓
principalAmount (D.titipanCommitments[])
       ↓
DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, { assetId: currentAssetId })
       ↓
alokasi domain lain (Investment + Aset LAIN, S504)
       ↓
draft Aset ini = Aset._ownersAssetNilai() × (porsi/100)
       ↓
💰 Kuota sisa = principal − excluding − draft   (LIVE, di #assetOwnerKuota{i})
```

`currentAssetId` diambil dari `Aset._ownersModalAsset.id` (state modal yang
sudah ada sejak `openOwnersModal()`, S392a). Draft allocation basis: `a.nilai`
(via `_ownersAssetNilai()` existing, S499-consistent — **bukan**
`a.modalInvestasi`).

## SSOT

`D.titipanCommitments[].principalAmount` — tidak ada field baru
(`assetOwnerQuota`/`remainingQuota`/dst). Semua angka kuota derived murni
di `_ownerQuotaText()`, 0 disimpan ke `D`.

## OwnershipEngine / MultiOwnerEngine

**Tidak disentuh.** `owners[]`/`ownership` tidak diubah cara resolve-nya,
0 sentinel owner baru.

## S504 (`allocatedExcluding()`/`dana-titipan-portfolio-presenter.js`)

**Tidak disentuh.** API dipanggil apa adanya dengan bentuk baru
`{assetId: currentAssetId}` yang memang sudah disiapkan S504.

## Tests

10 test baru di `tests/s505-asset-owner-quota-live.test.js`:

1. Quota dasar (0 allocation lain).
2. Existing Aset allocation lain.
3. Existing Investment allocation (membuktikan S504 benar-benar dipakai UI
   Aset).
4. Mixed domain (Investment + Aset lain).
5. **Current asset exclusion** (test paling penting, §14 prompt) —
   allocation Aset yang sedang diedit tidak boleh double-count.
6. Multi-owner — kuota dihitung per owner, bukan gabungan.
7. Over-quota — soft warning tampil, `#assetOwnersSaveBtn` TIDAK
   di-disable oleh quota (tetap dikontrol validasi total-porsi 100%
   existing).
8. Live update — porsi diubah 10→20→50→75 lewat `onOwnerPorsiInput()`
   langsung (bukan render ulang), quota berubah tiap kali.
9. Owner belum punya `titipanCommitments` — prompt "catat pokok dulu",
   0 auto-commit (`D.titipanCommitments` tetap `[]`).
10. Owner `isSelf` — 0 elemen `#assetOwnerKuota{i}` dirender (konsisten
    Investment, quota cuma utk owner non-SELF).

Semua 10 **PASS**. Test existing S392a-S499 (termasuk
`asset-owners-nominal-sync-s429.test.js`,
`asset-owners-nominal-autodistribute-s431.test.js`, dll) tetap **PASS
tanpa modifikasi**.

## Files changed

- `modules/asset/aset.js` — `_ownerQuotaText()`/`_updateOwnerQuotaDisplay()`
  baru + hook di `_renderOwnersList()`/`onOwnerPorsiInput()`/
  `onOwnerNominalInput()`.
- `tests/s505-asset-owner-quota-live.test.js` — baru, 10 test.
- File generated/version (build otomatis): `modules/shared/modules-render.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`, `backups/*`.

`modules/finance/dana-titipan-portfolio-presenter.js` dan
`modules/asset/investasi-view.js` **TIDAK disentuh** sama sekali.

## Regression

**PASS** — 3290/3290 (3280 baseline + 10 baru), 0 gagal.

## Browser

**MANUAL BROWSER VERIFICATION — NOT RUN** (tidak ada Playwright/browser
tersedia di environment ini).

## Deliverables

1. Full Release ZIP (v1237)
2. Patch ZIP (v1236 → v1237)
3. Dokumen FIX/session ini
