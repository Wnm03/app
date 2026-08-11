# Sesi B2b — Tombol `assetModal` Redirect Langsung ke `investmentOwnersModal`

Lanjutan Sesi B2a (`assetOwnersModal` read-only kalau aset terhubung `investmentId`).
Ini **sub-sesi 2/2** dari Sesi B2 (disiplin "1 task = 1 sesi").

## Scope sesi ini (SENGAJA dibatasi)
- Tombol `⚖️ Atur Porsi Kepemilikan` di `assetModal` utama (id baru `#assetOwnersBtn`)
  ganti label jadi `🔗 Atur Porsi di Investasi` kalau aset yang dibuka punya
  `a.investmentId` yang valid (holding masih ada di `D.investments`) — balik ke label
  lama kalau tidak terhubung/orphan/belum ada aset tersimpan.
- Label update di 2 titik: `Aset.openModal(id)` (baca `a.investmentId` tersimpan) dan
  `Aset.onInvestmentLinkChange()` — dipanggil `onchange` dropdown
  `🔗 Hubungkan ke Holding Investasi` (B1) supaya label ikut berubah LIVE begitu user
  ganti tautan, belum sempat Simpan Aset.
- `Aset.openOwnersModal()` (dipanggil tombol yang sama) sekarang REDIRECT LANGSUNG ke
  `InvestmentUI.openOwnersModal(investmentId)` (S464, 100% reuse) kalau aset tertaut ke
  holding yang masih ada — `assetOwnersModal` (termasuk versi read-only B2a) TIDAK
  dibuka sama sekali lagi untuk aset tertaut, karena sekarang atur porsinya SATU PINTU
  di `investmentOwnersModal`.
- `Aset.openOwnersModalById(assetId)` (wrapper navigasi S515 dari kartu Dana Titipan)
  otomatis ikut redirect — 100% reuse `openOwnersModal()`, 0 baris diubah di wrapper.
- Fallback AMAN (0 regresi), sama pola B2a: `investmentId` kosong, holding orphan
  (sudah dihapus), atau module `investasi-view.js` (`InvestmentUI`) belum dimuat ->
  tetap fallback ke `assetOwnersModal` (jalur read-only B2a / editable lama).

## File yang diubah
- `modules/asset/aset.js`:
  - Fungsi baru `Aset._resolveLinkedInvestment(a)` — PURE, versi ringan dari
    `_resolveLinkedInvestmentOwners()` (tidak butuh module `Investment` dimuat, tidak
    baca owners) — dipakai toggle label & redirect. `_resolveLinkedInvestmentOwners(a)`
    (B2a) di-refactor supaya reuse fungsi ini (0 perubahan perilaku).
  - Fungsi baru `Aset._applyOwnersButtonLabel(linked)` / `_updateOwnersButtonLabel(a)` —
    PURE UI, toggle `textContent` tombol `#assetOwnersBtn`.
  - Fungsi baru `Aset.onInvestmentLinkChange()` — dipanggil `onchange` dropdown
    `#assetInvestmentId`.
  - `Aset.openModal(id)`: panggil `_updateOwnersButtonLabel(a)` setelah
    `_populateInvestmentLinkSelect(a)`.
  - `Aset.openOwnersModal()`: cek `_resolveLinkedInvestment(a)` di awal — kalau ada &
    `InvestmentUI` dimuat, panggil `InvestmentUI.openOwnersModal(id)` lalu `return`
    (skip total logic `assetOwnersModal` di bawahnya, termasuk jalur read-only B2a).
- `modules/shared/modals.js`:
  - `assetModal`: tombol `Atur Porsi Kepemilikan` dapat `id="assetOwnersBtn"` baru;
    dropdown `#assetInvestmentId` dapat `onchange="Aset.onInvestmentLinkChange()"`.

## Tests
`tests/asset-investment-owners-redirect-b2b.test.js` (12 test baru):
- 2 gap-check: `#assetOwnersBtn` & `onchange` dropdown ada di template.
- 5 test label tombol: tertaut valid / tidak tertaut / orphan / aset baru (null) /
  live update lewat `onInvestmentLinkChange()` (termasuk balik ke default saat
  dropdown dikosongkan lagi).
- 5 test redirect: tertaut valid -> `InvestmentUI.openOwnersModal(id)` dipanggil &
  `assetOwnersModal` TIDAK dibuka; tidak tertaut -> tetap buka `assetOwnersModal`
  seperti biasa; orphan -> fallback (bukan redirect); `InvestmentUI` belum dimuat ->
  fallback aman tanpa crash; `openOwnersModalById()` (S515) ikut redirect.

## Regression
```
node --test tests/asset-investment-owners-redirect-b2b.test.js \
  tests/asset-owners-investment-readonly-b2a.test.js tests/asset-owners-*.test.js \
  tests/asset-ownership-split-presenter.test.js tests/s490-asset-owners-registry-wiring.test.js \
  tests/s505-asset-owner-quota-live.test.js
# 88 pass, 0 fail

node --test tests/*.test.js
# 3811 pass, 0 fail (baseline + B1 + B2a + 12 test baru sesi ini)
```

## Verifikasi tambahan
- `node -c modules/asset/aset.js` → OK.
- `new Function(...)` syntax-check `modules/shared/modals.js` → OK.

## Sesi berikutnya (B3)
- Bridge tampilan: baris "🔗 Terhubung ke Investasi" + porsi read-only di kartu Aset
  (pola persis `vehAssetBridgeHtml()`, S507).
