# FIX v1074 (s375) — Inventory Transfer: Product Picker Chip (bugfix + fitur)

## Masalah

`#inventoryTransferModal` (🚚 Buat Transfer, tab Bisnis Shop) selalu
menampilkan "Belum ada produk ditambahkan" walau produk sudah "ditap" —
karena markup dan JS beda kontrak:

- HTML `#itProductList` cuma `<div>` kosong berlabel "ketuk chip utk +1"
  — tidak pernah ada kode yang mengisinya dengan chip, dan tidak ada
  click handler apa pun di situ (chip-tap belum pernah diimplementasikan
  sungguhan, cuma label placeholder).
- JS lama (`BusinessFlowPresenter.openTransferModal()` /
  `addTransferCartItem()`) menunggu elemen `#itProduct` (select dropdown)
  dan `#itQty` (input angka) yang **tidak ada** di HTML modal — saat
  modal dibuka, kode mencoba mengisi select yang tidak eksis
  (`document.getElementById('itProduct')` → `null`), gagal senyap.
- `addTransferCartItem()` sendiri tidak pernah dipanggil dari mana pun
  (tidak ada tombol/`data-action` yang mengarah ke situ).

## Fix

Implementasi chip-list sesuai label & niat desain awal (opsi 1 dari 2
rekomendasi):

- **`renderTransferProductChips()`** (baru) — render `#itProductList`
  jadi daftar chip tap-to-add, **hanya produk yang masih ada sisa stok
  di lokasi asal (`#itFrom`)** (reuse `_availableAtSource()`, 0 rumus
  stok baru). Tiap chip menampilkan nama, sisa stok, dan berat/unit (kg,
  dari `product.beratPerUnit` via `ProductStore.getWeight()`).
- **`tapTransferChip(productId)`** (baru) — ketuk chip = +1 qty ke
  keranjang sementara (`_transferCartState`), ketuk lagi = +1 lagi
  (multi-select: tap produk lain manapun sekaligus, tidak dibatasi 1
  produk/transfer). Qty & cek stok reuse persis `_sanitizeQty()` /
  `_availableAtSource()` — helper validasi tunggal yang sama dipakai
  backend `createInventoryTransfer()`, jadi UI & backend selalu sepakat
  1 aturan yang sama.
- **`onTransferOriginChange()`** (baru, dipasang ke `onchange` `#itFrom`
  di `modules/shared/modals.js`) — ganti Origin mengosongkan keranjang &
  render ulang chip, karena ketersediaan stok itu per lokasi asal (chip
  dari Origin lama bisa tidak valid lagi di Origin baru).
- **`openTransferModal()`** disederhanakan: reset keranjang + render chip
  awal, tidak lagi menyentuh `#itProduct`/`#itQty` yang tidak eksis.
- **`addTransferCartItem()`** dihapus total (dead code, tidak pernah
  dipanggil dari mana pun) — diganti `tapTransferChip()`.
- Backend (`createInventoryTransfer()`, `_validateTransferRequest()`,
  `_availableAtSource()`, `_sanitizeQty()`, `receiveTransfer()`,
  `transferSummary()`) **TIDAK diubah sama sekali** — 0 rumus stok baru,
  UI baru murni wiring ke helper yang sudah ada.

## Test (baru)

`tests/inventory-transfer-chip-ui-s374.test.js` — 11 test baru, cakupan:
render chip (hanya produk berstok, label sisa stok + berat/unit, pesan
kosong kalau tidak ada), tap chip (qty +1 per tap, increment berulang,
multi-select produk berbeda, ditolak kalau lebih dari sisa stok, sisa
stok di chip ikut berkurang), `openTransferModal()`/
`onTransferOriginChange()` (reset keranjang), dan
`saveTransferFromModal()` end-to-end lewat keranjang hasil tap chip.

`node --test tests/*.test.js` → **2546/2546 pass** (2 failure pre-existing
`dashHubNavigateToFeature` scroll-timing, tidak terkait sesi ini — lihat
`tests/asset-nav-consistency-s252.test.js`, sudah gagal sebelum sesi ini
juga).

## File yang diubah (manual)

- `modules/shop/business-flow-presenter.js` — `openTransferModal()`
  disederhanakan, `addTransferCartItem()` dihapus, ditambah
  `renderTransferProductChips()`, `tapTransferChip()`,
  `onTransferOriginChange()`.
- `modules/shared/modals.js` — `#itFrom` diberi
  `onchange="BusinessFlowPresenter.onTransferOriginChange()"`.
- `tests/inventory-transfer-chip-ui-s374.test.js` (baru).

## Auto-terupdate oleh `scripts/build.js` (versi 1073 → 1074)

- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild, tanpa minify —
  esbuild tidak tersedia di environment ini)
- `app_production.html`, `index.html` (`?v=1074`)
- `sw.js` (`CACHE_NAME` -> `kw-cache-v1074`)
- Konstanta versi (`MODAL_VERSION` dkk) disamakan otomatis oleh
  `build.js`, bukan perubahan manual.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (regenerasi otomatis)

## TIDAK diubah

- Logic stok/lokasi/backend Inventory Transfer (Sesi 243/265) — 0
  perubahan, semua test lama tetap PASS tanpa modifikasi.
- Skema data (`D.inventoryTransfers`) — tidak ada field baru.
