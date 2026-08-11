# Sesi B3 — Bridge Tampilan Aset ↔ Investasi (baris read-only + navigasi)

Lanjutan rencana B1 (field `investmentId`) → B2a (assetOwnersModal read-only) →
B2b (redirect ke investmentOwnersModal). Sesi ini murni **tampilan/navigasi**,
pola PERSIS `vehAssetBridgeHtml()` (S507, `modules/vehicle/vehicle-core.js`).

## Perubahan

`modules/asset/aset.js`:

1. **`Aset._investmentBridgeMeta(a)`** (baru) — fungsi PURE/read-only, baca
   LIVE dari `D.investments` via `Aset._resolveLinkedInvestment(a)` +
   `Investment.getOwners(h)` tiap panggilan (0 snapshot/cache di `a`).
   Balikin `null` kalau aset tidak tertaut atau tautan orphan (holding sudah
   dihapus) — caller menyembunyikan baris ini sepenuhnya kalau `null`.
   Format: `🔗 Terhubung ke Investasi: <nama holding> · Porsi: 70% Budi · 30% Ayah`
   (baris "· Porsi:" hanya muncul kalau holding punya porsi>0 tercatat).

2. **`Aset.openActionsMenu(id)`** (diubah) — mengikuti pola desain S306
   (kartu Aset tetap ringkas, detail di overflow menu "⋮"):
   - `investmentBridgeMeta` ditambahkan ke array `metaRows` yang sudah ada
     (sejajar `extraMeta`/`linkMeta`/`ownMeta`/`titipanMeta`/`pctMeta`).
   - Tombol navigasi baru **"🔍 Lihat di Investasi"** (row `investRow`,
     sejajar `histRow` yang sudah ada) — HANYA muncul kalau aset tertaut ke
     holding yang masih ada. 100% reuse `InvestmentListUI.openModal(id)`
     (sudah ada sejak Fase 1 `investasi-list-view.js`) lewat dispatcher
     `data-action`/`data-args` generik yang sudah ada — TIDAK ada modal baru,
     TIDAK ada router baru.

## Scope guard (0 regresi)

- 0 field baru di `D.assets`/`D.investments`.
- 0 perubahan ke `modals.js` (tidak perlu — bridge ini tampil di overflow
  menu yang sudah ada, bukan field form baru).
- 0 perubahan ke logic B2a/B2b (`_resolveLinkedInvestment`,
  `_resolveLinkedInvestmentOwners`, `openOwnersModal` redirect, label tombol
  `#assetOwnersBtn`) — hanya menambah 1 method baru + 2 baris di
  `openActionsMenu()`.

## Test

`tests/asset-investment-bridge-b3.test.js` (baru, 12 test, pola sama persis
`tests/asset-investment-owners-redirect-b2b.test.js` — `loadSource()` + DOM
tiruan stateful):

- `_investmentBridgeMeta`: null utk tidak-tertaut, null utk orphan, format
  nama+porsi utk tertaut valid, holding tanpa owners sama sekali (tanpa
  "Porsi:"), baca live (bukan snapshot), read-only murni (0 tulis ke `a`).
- `openActionsMenu`: baris bridge muncul/tidak muncul di `#assetActionsMeta`
  sesuai kondisi tertaut/orphan, tombol "Lihat di Investasi" muncul/tidak di
  `#assetActionsList` dgn `data-args` id holding yang benar, tidak mengganggu
  `metaRows` lama (mis. `pctMeta` tetap tampil bareng).

## Sesi berikutnya (B4, sesuai rencana)

Alat bantu migrasi Data Health Check: cari kandidat instrumen dobel-catat
by name-similarity antara `D.assets` & `D.investments`, tampilkan sbg saran
(bukan auto-link).
