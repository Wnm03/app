# Patch — Sesi s639 (RENCANA-MODERNISASI-UI.md)

Lanjutan langsung dari s637 (tabel Ledger Pro + saldo berjalan Uang) & s638
(class `.money` Dana Titipan). Baseline: overlay
`PATCH-AUDIT-UIUX-VISUAL-2026-08.zip` + `kw_patch_s637-tx-tabel-modern-saldo-berjalan.zip`
+ `kw_patch_s638-dana-titipan-money-class.zip` di atas app-main terbaru
(v1369, sudah termasuk s636 keamanan PIN salt per-perangkat — sesi terpisah,
tidak terkait rencana modernisasi ini, nomor sesi kebetulan sama krn counter
global).

**Scope:** "Terapkan ke Aset (list padat, bukan grid kartu)" (tabel rencana,
risiko: Sedang). Berbeda dari s638 (murni tambah class), sesi ini
**perubahan struktural DOM** untuk `#assetList` — sesuai catatan risiko
rencana, disertai proof-test terpisah, bukan dianggap "additive markup"
biasa.

## Keputusan sebelum coding

- **0 kolom saldo berjalan.** Beda dari transaksi Uang (s637), daftar aset
  bukan arus kas kronologis — konsep "saldo setelah item ke-N" tidak
  bermakna finansial di sini. Kolom yang ditampilkan: **Aset** (ikon+nama+
  badge Zakat/warning cross-check+chip jenis/lokasi) | **Nilai** | tombol
  aksi ⋮.
- **Reuse penuh class `.tx-tbl*`** yang sudah ada sejak s637 (bukan bikin
  `.aset-tbl*` baru) — struktur tabel generik (wrap/table/thead/td/num),
  tidak spesifik ke transaksi, jadi aman dipakai ulang. **0 CSS baru**
  ditambahkan sesi ini.
- Chip jenis/lokasi, badge Zakat, badge warning cross-check
  (`assetCrossCheckWarning()`) — REUSE PERSIS logic yang sama dgn kartu
  lama, 0 rumus baru dihitung ulang.

## Perubahan

- `modules/asset/aset.js`:
  - `Aset.renderList()` — tambah percabangan `D.profile.theme==='modern'`
    (SSOT, bukan DOM query) SEBELUM jalur kartu lama: kalau aktif, `#assetList`
    dirender via `assetTableHTML(list)` (tabel), lalu tetap panggil ulang
    `Aset.renderDashboard()`/`renderInvestasi()`/`Penyusutan.renderList()`/
    `PajakAset.renderList()`/`LaporanAset.renderList()`/`AssetInsight.render()`
    persis sama dgn jalur lama, dan `return` lebih awal. Jalur kartu
    `list.map(a=>{...})` (dipakai 10 tema lama) **0 diubah/dihapus**, tetap
    persis sama byte-nya.
  - Fungsi baru `assetTableRowHTML(a)` / `assetTableHTML(list)` (top-level,
    pola sama persis `txTableRowHTML`/`txTableHTML` di
    `tx-list-cashflow.js`) — ditambahkan di akhir file, setelah
    `window.Aset=Aset`. Tap baris → `data-action="openAssetModal"` (sama
    dgn kartu, buka Edit). Tombol ⋮ → `data-action="Aset.openActionsMenu"`
    (sama dgn kartu, buka overflow menu detail). **0 handler baru** — 100%
    reuse dispatcher `data-action` global yang sudah ada.
- `tests/s639-aset-tabel-modern-list-padat.test.js` (BARU) — 12 test:
  markup baris (ikon jenis, chip jenis/lokasi, nilai, badge Zakat/warning,
  0 kolom saldo), markup tabel (header, tbody kosong, urutan item
  dipertahankan), wiring `renderList()` (percabangan tema modern +
  jalur kartu lama masih utuh), reuse CSS `.tx-tbl*`/`.acc-chip` (0 class
  baru).

**Tidak disentuh:** `index.html`/`app_production.html` (0 markup baru,
`#assetList` container sudah ada), `styles.css` (reuse penuh aturan
`.tx-tbl*` sejak s637 & `.acc-chip` yang sudah lama ada), logic
`migrateAssetInvestmentsToHoldings()`/`assetOwnFilter`/`openActionsMenu()`/
rumus nilai aset apa pun.

## Verifikasi
- `node --check modules/asset/aset.js` → OK
- `node --check tests/s639-aset-tabel-modern-list-padat.test.js` → OK
- `node scripts/verify-window-expose.js` → OK (fungsi baru bukan
  `data-action="X.method"` pada objek top-level, pola sama `txTableHTML`,
  tidak butuh window-expose)
- `node --test tests/*.test.js` → **4575/4575 pass** (4563 sebelumnya + 12
  baru), 0 regresi.
- `node scripts/build.js` TIDAK dijalankan (esbuild tidak tersedia di
  sandbox ini) — jalankan sendiri sebelum upload untuk regenerasi bundle &
  bump versi resmi. `index.html`/`app_production.html` tidak berubah sesi
  ini jadi gate `html-sync` aman apa adanya.

## File dalam ZIP ini
- `modules/asset/aset.js`
- `tests/s639-aset-tabel-modern-list-padat.test.js` (BARU)
- `CHANGELOG-S639-ASET-TABEL-MODERN-LIST-PADAT.md`

## Sisa rencana (RENCANA-MODERNISASI-UI.md)
- s640 — Audit lintas modul, full run test suite, keputusan go/no-go
  `modern` jadi tema default. Belum dikerjakan.
