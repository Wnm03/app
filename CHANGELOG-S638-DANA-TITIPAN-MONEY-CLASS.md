# Patch — Sesi s638 (RENCANA-MODERNISASI-UI.md)

Lanjutan langsung dari s637 (tabel Ledger Pro + saldo berjalan #allTx).
Baseline: overlay zip s637 di atas app-main terbaru.

**Scope:** "Perluas `<summary>` Dana Titipan dengan kolom porsi/nilai"
(tabel rencana). Audit sebelum coding menemukan porsi% & nilai (Pokok→
Kini→gain) SUDAH ditampilkan sejak Sesi 540-D/632/541 — yang belum ada
cuma class `money` di span nominalnya, supaya kebagian `tabular-nums`/
`font-mono` di tema "modern" lewat aturan `[data-theme="modern"] .money`
yang sudah ada sejak s635. **0 CSS baru, 0 komponen baru, 0 restrukturisasi
DOM** — murni tambah 1 class attribute ke span yang sudah ada.

## Perubahan

- `modules/finance/dana-titipan-portfolio-render.js`:
  - `_ownerCardHtml` (markup di `renderInto()`) — span Pokok/Kini/gain di
    `<summary>` kartu owner ditambah class `money`.
  - `_holdingRowHtml()` — span "Pokok → Kini" & gain (varian
    `hasGainTracking:true`) dan span "Nilai:" (varian `false`, baris
    Aset) ditambah class `money`.
  - `_holdingsListHtml()` — span subtotal grup kustodian ditambah class
    `money`.
  - 0 angka/rumus/atribut lain (data-action, id, porsi%, urutan) diubah.
- `tests/s638-dana-titipan-money-class-modern.test.js` (BARU) — 5 test:
  class `money` muncul di summary owner, baris holding (kedua varian
  hasGainTracking), subtotal grup kustodian, dan regresi memastikan
  porsi%/nama/struktur `<details>` 0 berubah.

**Tidak disentuh:** `index.html`/`app_production.html` (0 markup baru),
`styles.css` (reuse aturan `.money` yang sudah ada sejak s635), logic
`_groupHoldingsByCustodian`/`_assetOptionsHtml`/routing porsi.

## Verifikasi
- `node --check modules/finance/dana-titipan-portfolio-render.js` → OK
- `node --test tests/*.test.js` → **4563/4563 pass** (4558 sebelumnya +
  5 baru), 0 regresi.
- `node scripts/build.js` TIDAK dijalankan (esbuild tidak tersedia di
  sandbox ini) — jalankan sendiri sebelum upload.

## File dalam ZIP ini
- `modules/finance/dana-titipan-portfolio-render.js`
- `tests/s638-dana-titipan-money-class-modern.test.js` (BARU)
- `CHANGELOG-S638-DANA-TITIPAN-MONEY-CLASS.md`
