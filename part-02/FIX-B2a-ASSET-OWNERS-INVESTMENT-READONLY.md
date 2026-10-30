# Sesi B2a — `assetOwnersModal` Read-Only Kalau Aset Terhubung ke Holding Investasi

Lanjutan Sesi B1 (`a.investmentId`, field link Aset -> Holding Investasi). Sesi B2
dipecah jadi 2 sub-sesi (disiplin "1 task = 1 sesi"); ini **sub-sesi 1/2**.

## Scope sesi ini (SENGAJA dibatasi)
- Kalau aset yang dibuka `⚖️ Atur Porsi Kepemilikan`-nya punya `a.investmentId` yang
  valid (holding masih ada di `D.investments`), modal `assetOwnersModal` jadi
  **READ-ONLY**: porsi ditampilkan dari `Investment.getOwners(h)` (holding investasi
  tertaut, sumber kebenaran porsi utk instrumen ini) — bukan dari `a.owners` lagi.
- Baris pemilik dirender statis (nama + porsi%), TANPA input edit/tombol hapus.
- Tombol edit (`➕ Tambah Pemilik` / `✅ Simpan Porsi` / `↺ Reset Draft`, dibungkus 1
  div baru `#assetOwnersEditControls`) disembunyikan; hint baru
  `#assetOwnersReadOnlyHint` muncul menjelaskan alasannya & cara lepas tautan (lewat
  dropdown B1 di form Aset).
- Pertahanan berlapis: `addOwnerRow`/`removeOwnerRow`/`saveOwners`/`resetOwners` tetap
  di-guard `Aset._ownersReadOnly` di level fungsi (toast + no-op), bukan cuma
  menyembunyikan tombol — supaya draft baca-saja dari holding investasi TIDAK PERNAH
  bisa ketulis balik ke `a.owners` lewat jalur mana pun.
- Fallback AMAN (0 regresi) ke jalur editable lama kalau: `investmentId` kosong,
  holding tertaut sudah dihapus (orphan), atau module `investasi.js` belum dimuat.
- TIDAK ADA di sesi ini (ditunda ke **B2b**): tombol `⚖️ Atur Porsi Kepemilikan` di
  `assetModal` utama BELUM disembunyikan/diubah, dan BELUM ada navigasi langsung ke
  `investmentOwnersModal` dari dalam `assetOwnersModal`. Untuk sesi ini, hint cukup
  mengarahkan user secara tekstual.

## File yang diubah
- `modules/asset/aset.js`:
  - Fungsi baru `Aset._resolveLinkedInvestmentOwners(a)` — PURE, baca
    `Investment.getOwners(h)` (AUD-008/S462, 100% reuse), balikin `null` kalau tidak
    terhubung/orphan/module belum dimuat (caller fallback ke jalur lama).
  - Fungsi baru `Aset._toggleOwnersEditControls()` — PURE UI, tampil/sembunyikan
    `#assetOwnersEditControls` & `#assetOwnersReadOnlyHint` berdasarkan
    `Aset._ownersReadOnly`.
  - `Aset.openOwnersModal()`: panggil `_resolveLinkedInvestmentOwners()` duluan,
    set `Aset._ownersReadOnly` & populate `_ownersDraft` dari situ kalau terhubung.
  - `Aset._renderOwnersList()`: cabang read-only baru (baris statis), panggil
    `_toggleOwnersEditControls()` di awal (SATU titik toggle, tidak diulang di
    beberapa tempat).
  - `Aset.addOwnerRow()`/`removeOwnerRow()`/`saveOwners()`/`resetOwners()`: guard
    `Aset._ownersReadOnly` di awal masing-masing fungsi.
- `modules/shared/modals.js` — `assetOwnersModal`: tambah `#assetOwnersReadOnlyHint`
  (div hint, default `u-dnone`) & bungkus 3 tombol edit lama + `#assetOwnersTotalBox`
  dalam `<div id="assetOwnersEditControls">`. Tombol `Tutup` TETAP di luar wrapper
  (modal harus selalu bisa ditutup, read-only atau tidak).

## Tests
`tests/asset-owners-investment-readonly-b2a.test.js` (9 test baru):
- 2 gap-check: id baru B2a ada di template & posisinya benar (wrapper mendahului
  tombol lama, tombol Tutup tetap di luar wrapper), tag HTML seimbang.
- 4 test read-only: `openOwnersModal()` baca porsi dari `Investment.getOwners()`
  (bukan `a.owners`), list dirender statis tanpa input/tombol hapus, blok tombol edit
  tersembunyi + hint tampil, dan pertahanan berlapis (4 fungsi mutasi di-no-op +
  toast saat dipanggil paksa di mode read-only — `a.owners`/aset dibuktikan 0 berubah).
- 3 test regresi: aset tanpa `investmentId` tetap 100% editable (jalur lama, 0
  berubah), `investmentId` orphan fallback aman, `Investment` module belum dimuat
  fallback aman (tidak crash).

## Regression
```
node --test tests/asset-owners-*.test.js tests/asset-ownership-split-presenter.test.js \
  tests/s490-asset-owners-registry-wiring.test.js tests/s497-owner-isself-toggle-rerender-fix.test.js \
  tests/s505-asset-owner-quota-live.test.js tests/asset-3owners-linked-account-real-tx-audit-s444.test.js \
  tests/dana-kelolaan-linked-account-exclude-s449.test.js
# 97 pass, 0 fail

node --test tests/*.test.js
# 3799 pass, 0 fail (baseline + B1 + 9 test baru sesi ini)
```

## Verifikasi tambahan
- `node -c modules/asset/aset.js` → OK.
- `new Function(...)` syntax-check `modules/shared/modals.js` → OK.

## Sesi berikutnya (B2b)
- Sembunyikan/ubah tombol `⚖️ Atur Porsi Kepemilikan` di `assetModal` utama saat
  `a.investmentId` terisi (mis. jadi `🔗 Atur Porsi di Investasi`).
- Tambah navigasi langsung dari situ (atau dari dalam `assetOwnersModal`) ke
  `investmentOwnersModal` lewat `InvestmentUI.openOwnersModal(a.investmentId)`
  (sudah ada sejak S464, tinggal di-wire).
- B3: baris "🔗 Terhubung ke Investasi" + porsi read-only di kartu Aset (pola persis
  `vehAssetBridgeHtml()`).
