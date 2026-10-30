# Sesi B10 — Navigasi Simetris Investasi → Aset ("🔗 Lihat di Aset")

## Konteks
Prioritas #3 dari daftar sesi lanjutan B6+: B3 sudah nambah "🔍 Lihat di Investasi"
di kartu Aset (arah Aset → Investasi), tapi arah baliknya belum ada. Sejak B8/B9
menutup audit dobel-hitung nilai (Kekayaan Bersih/Zakat Maal/FI, prioritas #1/#4),
sesi ini lanjut ke item navigasi simetris — pola PERSIS S509b/S509c
(vehicle-core.js ↔ aset.js, bridge Vehicle ↔ Asset yang sudah ada).

## Perubahan

**1. `modules/asset/investasi-list-view.js`**
- `InvestmentListUI._resolveLinkedAsset(h)` (baru) — PURE/read-only, cari SATU
  entry `D.assets` yang `investmentId`-nya menunjuk ke holding ini (link dibuat
  dari sisi Aset lewat dropdown B1). Baca LIVE dari `D.assets` tiap panggilan
  (0 snapshot/cache di `h`) — kebalikan persis `Aset._resolveLinkedInvestment()`.
  Balikin `null` kalau tidak ada aset tertaut (normal — tidak semua holding harus
  punya aset tertaut baliknya).
- `InvestmentListUI._renderAssetLinkAction(h)` (baru) — bangun tombol navigasi
  "🔗 Lihat di Aset" ke kontainer `#investmentAssetLinkAction`, HANYA tampil
  kalau `_resolveLinkedAsset()` ketemu. Pola PERSIS
  `Aset._renderVehicleLinkAction()` (S509c) — container disembunyikan
  (`classList.toggle('u-dnone', true)`) kalau tidak ada match. 100% reuse
  `Aset.openModal()` (sudah ada) lewat dispatcher `data-action` generik yang
  sudah ada — TIDAK ada modal baru, TIDAK ada router baru.
- Dipanggil dari `openModal(id)` (baik mode Tambah maupun Edit — guard
  `_resolveLinkedAsset(null)` otomatis balikin `null` di mode Tambah, jadi 0
  cabang if/else terpisah diperlukan).

**2. `modules/shared/modals.js`**
- `investmentModal`: tambah `<div class="fg u-dnone" id="investmentAssetLinkAction">`
  tepat sebelum tombol `investmentOwnersBtn` (posisi relatif sama dgn
  `assetVehicleLinkAction` di `assetModal`, yang juga diletakkan sebelum tombol
  aksi utama modal itu).

## Scope guard (0 regresi)
- 0 field baru di `D.assets`/`D.investments` — reuse `a.investmentId` yang sudah
  ada sejak B1.
- 0 perubahan ke logic B1/B2a/B2b/B3/B8/B9 (link field, readonly owners,
  redirect, bridge display arah Aset→Investasi, exclude dobel-hitung).
- 0 perubahan ke rumus Kekayaan Bersih/Zakat Maal/FI.

## Test
`tests/investment-asset-reverse-link-b10.test.js` (baru, 8 test, pola sama
persis `tests/investment-list-ui-s466.test.js` — `loadSource()` + DOM tiruan
stateful):
- `_resolveLinkedAsset`: null utk tidak-tertaut, ketemu aset yang benar utk 1
  match, tidak ikut ketemu aset yang tertaut ke holding LAIN, baca live (bukan
  snapshot — tautan ditambah setelah holding dibuat tetap ketemu).
- `openModal()` wiring: kontainer disembunyikan/ditampilkan sesuai kondisi
  tertaut/tidak, tombol punya `data-action="Aset.openModal"` dgn `data-args`
  id aset yang benar, mode Tambah (h=null) tetap disembunyikan, holding lain
  yang tidak tertaut tidak ikut ketiban tombol.
- Full suite: **3854/3854 lulus, 0 regresi** (3846 baseline B9 + 8 test baru B10).

## Sesi berikutnya (dari daftar prioritas awal, belum dikerjakan)
- 🟢 QoL: link cepat dari saran Data Health Check (tombol buka `assetModal`
  langsung dari saran B4, reuse dispatcher `data-action` yang sudah ada).
