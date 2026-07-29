# Fase 2 — Dashboard Wiring (live-refresh widget Dashboard Hub)

## Temuan sebelum ubah apa pun

Cek `renderDashboard()` (dipanggil dari ~30 titik `save()` di seluruh app —
transaksi, shop, vehicle, akun, kategori, dst): `Advisor.render()` &
`LifeBalance.render()` (2 dari 6 Pinned Widgets) **sudah** live-refresh lewat
titik ini, apa pun halaman yang sedang dibuka. Tapi **Hero Card, Summary
Cards, Dashboard Analytics, dan Favorit** (semua widget Sprint 1 Dashboard
Hub) HANYA dirender ulang lewat `DashboardHub.render()` — yang cuma jalan
saat navigasi/`showPage('dashboard-hub')`. Efeknya: kalau user tetap di
halaman Dashboard Hub lalu menyimpan transaksi lewat Quick Action/modal,
angka Hero/Summary/Analytics & daftar Favorit TIDAK ikut ter-update sampai
halaman dibuka ulang. `EIEDashboard` ("AI Insight") sama — cuma jalan lewat
`DashboardHub.render()`.

## Perubahan

Satu titik, additive, reuse pola yang sudah ada (bukan mekanisme baru):

- **`modules/shared/modules-render.js`** — di akhir `renderDashboard()`,
  ditambah 5 baris guarded (`typeof X!=='undefined'`) memanggil
  `DashboardHubHero.render()`, `DashboardHubSummary.render()`,
  `DashboardHubAnalytics.render()`, `DashboardHubFavoritView.render()`, dan
  `EIEDashboard.render()` — dibungkus try/catch sendiri (pola sama dgn loop
  `DASH_RENDER_ORDER` di atasnya) supaya kalau salah satu gagal, TIDAK
  menjatuhkan sisa `renderDashboard()` yang dipanggil dari alur simpan data
  di halaman lain.
- **`tests/dashboard-hub-live-wiring.test.js`** (baru, 2 test) — regex-parse
  source `renderDashboard()` (pola sama dgn `tests/dash-card-registry.test.js`,
  bukan VM krn `modules-render.js` terlalu besar/bergantung banyak modul lain):
  memastikan ke-5 pemanggilan live-wiring ada & dibungkus try/catch sendiri.

## Tidak diubah

- `dashboard-hub.js`, `dashboard-hub-favorit.js`,
  `dashboard-hub-favorit-view.js` — 0 baris disentuh. `DashboardHub.render()`
  (dipanggil saat navigasi) tetap sama persis.
- `EIEDashboard`/`AIService` (Smart Delivery Engine) — 0 baris disentuh.
  Sengaja TIDAK dipakai `AIService.dailyBriefing()` sbg "AI Insight" baru:
  0 rule domain terdaftar di `AIDecision.rules` (Sesi 6
  `RENCANA-SESI-RINGKAS.md` — wiring event `finance.updated`/dst — belum
  dikerjakan), jadi `dailyBriefing()` akan selalu kosong. `EIEDashboard`
  (Economic Intelligence Engine) sudah jadi "AI Insight" Dashboard Hub yang
  fungsional & lebih matang — live-wiring ini menyambungkannya, bukan
  membuat sistem AI insight baru.

## Hasil test & build

```
node --test tests/*.test.js
# tests 2025 / pass 2025 / fail 0
node scripts/build.js
✓ Build "kw99-sesi25-fix-gdrive-backup-await-13" selesai & lolos cek sintaks
```

Versi akhir: **v426** (naik dari v425).

## Yang tidak bisa dijalankan di sandbox ini

- `npm run lint` (ESLint) — tidak ada akses internet buat `npm install`.
- Smoke-test berbasis browser (Playwright/`runHeadlessSelfTest()`).

Disarankan dijalankan manual sebelum merge, sesuai `docs/CLAUDE.md`.

## Kemungkinan lanjutan (belum dikerjakan sesi ini)

- Kalau mau "AI Insight" berbasis `AIService` (Smart Delivery Engine)
  bukan EIE: perlu Sesi 6 `RENCANA-SESI-RINGKAS.md` dulu (daftarkan rule +
  wiring event `finance.updated`/`asset.updated`/`vehicle.updated` ke
  `AIBus`) — di luar scope sesi ini, sengaja tidak disentuh.
