# Patch — AUDIT-UIUX-VISUAL-2026-08 (Temuan 1–3) + RENCANA-MODERNISASI-UI (s635, s636)

Patch zip ini kumulatif overlay: berisi HANYA file yang diperbaiki/baru,
tidak ada bundle/version bump (jalankan `node scripts/build.js` sendiri
di environment kamu sebelum upload — esbuild tidak tersedia di
environment sandbox ini). `app_production.html` DISERTAKAN kali ini
karena disinkronkan manual persis logika build.js step 6 (supaya gate
`html-sync` di `verify-release-ready.js` tidak memblokir).

## Riwayat isi zip

### Ronde 1 — AUDIT-UIUX-VISUAL-2026-08.md, Temuan 1–3

- `styles.css` — Temuan 1: `.stat-box--warn .stat-val{margin-top:14px}`
  (badge "⚠️ Kurang/Rugi" tidak lagi menimpa angka). Temuan 3: mask-image
  gradient di `.filter-scroll` (indikator scroll horizontal).
- `modules/shop/cobek-order.js` — Temuan 2: `Produsen.renderList()`
  tampilkan maks 3 item harga + "+N produk lain" (dulu 1 paragraf
  panjang), detail penuh tetap via `openHargaModal()`.

### Ronde 2 — RENCANA-MODERNISASI-UI.md, Sesi s635 (styles.css)

Murni token CSS, 0 markup disentuh:
- Blok tema ke-11 `[data-theme="modern"]` (fondasi Minimal — flat, 1
  aksen biru `#2f6fed`, shadow tipis), pola sama persis 10 tema lama.
- Token global `--font-mono` (system stack, zero network cost).
- Aturan scoped `[data-theme="modern"] .stat-val, ... {font-family:
  var(--font-mono)}` — menang via specificity, tanpa `!important`.
- Belum didaftarkan ke pemilihan tema di UI (scope sesi berikutnya).

### Ronde 3 — RENCANA-MODERNISASI-UI.md, Sesi s636 (pilot Beranda)

**Scope:** ticker strip ringkasan di Beranda/Dashboard Hub, di-gate
KHUSUS ke `[data-theme="modern"]` — tema lama 0 dampak (elemen selalu
`display:none` di 10 tema lama, karena tema "modern" sendiri belum
terdaftar di pemilihan tema, section ini praktis tidak terlihat user
manapun untuk saat ini).

- `index.html` — tambah container `<div class="bill-stat-pills
  dashhub-ticker" id="dashHubTickerModern"></div>` tepat setelah Hero
  Card, sebelum Quick Actions. 100% reuse class `.bill-stat-pills`/
  `.bill-stat-pill` yang sudah ada (bukan komponen baru dari nol).
- `styles.css` — 2 baris gate: `.dashhub-ticker{display:none}` +
  `[data-theme="modern"] .dashhub-ticker{display:flex}`. Nilai angka di
  dalam ticker pakai class `.stat-val` yang sudah ada, otomatis kebagian
  `font-family:var(--font-mono)` lewat aturan s635 — 0 CSS numerik baru.
- `modules/dashboard-hub/dashboard-hub.js` — presenter baru
  `DashboardHubTickerModern` (+ `_dashHubTickerModernMonthTx()`), pola
  identik `DashboardHubSummary`/`DashboardHubAnalytics`: 100% reuse
  `_dashHubMonthTxShared()` yang sudah ada, 0 rumus baru. Dipanggil dari
  `DashboardHub.render()` (guard `typeof`), visibilitas 100%
  didelegasikan ke CSS (bukan percabangan tema di JS).
- `tests/dashboard-hub-ticker-modern-s636.test.js` (BARU) — 8 test:
  render tanpa container, data kosong, reuse filter bulan-berjalan yang
  sama persis dgn Summary/Analytics (termasuk exclude transaksi bulan
  lalu), class warna bersih negatif/positif, 4 label item, pemanggilan
  di pipeline `DashboardHub.render()`, gate CSS ada, posisi container di
  index.html tepat (setelah Hero, sebelum Quick Actions).
- `app_production.html` — disinkronkan dari `index.html` (+ komentar
  AUTO-GENERATED persis format build.js) karena `verify-release-ready`
  gate `html-sync` membandingkan keduanya.

## Verifikasi (kumulatif, setelah ronde 3)
- `node --check modules/shop/cobek-order.js` → OK
- `node --check modules/dashboard-hub/dashboard-hub.js` → OK
- `node --test tests/*.test.js` → **4547/4547 pass** (0 fail), termasuk
  8 test baru s636 dan gate `verify-release-ready`/`html-sync`.
- `node scripts/build.js` TIDAK dijalankan penuh (esbuild tidak
  tersedia di sini) — `app_production.html` disinkronkan manual persis
  logikanya. Tetap jalankan `node scripts/build.js` di environment kamu
  sebelum upload utk regenerasi bundle & bump versi resmi.

## File dalam ZIP ini
- `styles.css` (Temuan 1, 3, token tema s635, gate ticker s636)
- `modules/shop/cobek-order.js` (Temuan 2)
- `index.html` (container ticker s636)
- `app_production.html` (disinkronkan dari index.html)
- `modules/dashboard-hub/dashboard-hub.js` (presenter `DashboardHubTickerModern` s636)
- `tests/dashboard-hub-ticker-modern-s636.test.js` (BARU)
