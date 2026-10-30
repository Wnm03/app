# FIX v1244 → v1245 — S512: Dashboard Hub Entry untuk Dana Titipan

## Baseline & Final Version
- Baseline: FULL RELEASE v1244 (`s510-owner-picker-select-stacked-modal-fix`)
- Audit sebelumnya: S511 — "Dana Titipan Navigation & Entry Point" (read-only,
  0 perubahan kode)
- Final: v1245 (`s512-dashboard-hub-dana-titipan`)
- Baseline regression aktual: **3346/3346 PASS** (dicek ulang langsung di
  working tree v1244 sebelum perubahan apa pun — angka ini BEDA dari
  "3342/3342" yang disebut di prompt implementasi S512; 3342 adalah baseline
  v1243, bukan v1244. Dilaporkan apa adanya sesuai hasil run, bukan
  mengasumsikan angka dari prompt.)
- Final regression: **3353/3353 PASS** (3346 baseline + 7 test baru; 0 test
  lama diubah, 0 test dihapus, 0 assertion dilemahkan)

## Problem
Dana Titipan sebelumnya hanya bisa dijangkau lewat jalur 3 langkah:

```
Keuangan → Laporan → Dana Titipan (sub-tab ke-4, paling bawah)
```

Jalur ini tetap berfungsi normal (dikonfirmasi oleh audit S511), tapi tidak
mudah ditemukan — tidak muncul di Dashboard Hub, tidak bisa dicari lewat
Universal Search fitur, dan tidak bisa di-favoritkan.

## Solution
Menambahkan **1 entry baru** ke `FEATURE_REGISTRY`
(`modules/dashboard-hub/dashboard-hub-registry.js`, kategori `keuangan`):

```js
{ key: 'keu-dana-titipan', label: 'Dana Titipan', icon: '💰',
  desc: 'Pokok, alokasi, dan pengembalian dana titipan per pemilik',
  target: { page: 'keuangan', tab: 'laporan', subtab: 'titipan', goTo: 'danaTitipanTabList' } }
```

Tidak ada jalur render kedua yang dibuat. Flow render tetap 100% jalur lama:

```
renderLaporan() → DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList')
```

Entry ini murni menambah **cara membuka** panel yang sudah ada, bukan
mengubah panel itu sendiri.

## Navigation Target
```
Dashboard Hub → cari/klik "Dana Titipan"
    ↓ DashboardHub.open('keu-dana-titipan')
    ↓ dashHubNavigateToFeature(target)   [TIDAK DIUBAH — sudah mendukung]
    ↓ showPage('keuangan')
    ↓ setKeuanganTab('laporan')
    ↓ setLaporanTab('titipan', subtabs[LAPORAN_SUBTAB_IDX.titipan])  [LAPORAN_SUBTAB_IDX.titipan=3, TIDAK DIUBAH]
    ↓ #laporanTab-titipan (visible)
    ↓ #danaTitipanTabList (sudah terisi sejak renderLaporan())
```

Bukti dari audit S511 (dikonfirmasi ulang sebelum implementasi, STEP 2):
`LAPORAN_SUBTAB_IDX = { ringkasan: 0, aruskas: 1, transaksi: 2, titipan: 3 }`
sudah ada di `dashboard-hub.js` sejak sebelum sesi ini — dispatcher generik
`dashHubNavigateToFeature()` sudah menangani `target.subtab` untuk
`page:'keuangan', tab:'laporan'` tanpa perubahan apa pun.

## Files Changed

**Logic:**
- `modules/dashboard-hub/dashboard-hub-registry.js` — +1 entry `FEATURE_REGISTRY` (kategori Keuangan)

**Tests:**
- `tests/dashboard-hub-dana-titipan-s512.test.js` — file baru, 7 test:
  1. Entry `keu-dana-titipan` ada di registry
  2. Target entry persis sesuai spesifikasi
  3. Entry berada di kategori `keuangan`
  4. `target.subtab` valid di `LAPORAN_SUBTAB_IDX` existing (index tetap 3, tidak berubah)
  5. Query "Dana Titipan" ditemukan lewat `dashHubSearchFeatures()` existing
  6. Identifier navigasi lama (`titipan` / `laporanTab-titipan` / `danaTitipanTabList`) tidak berubah
  7. Tidak ada key duplikat `keu-dana-titipan`

**Test existing** (`tests/dashboard-hub-registry.test.js`) — **TIDAK diubah**.
Diverifikasi (STEP 4) bahwa test ini generik (baca `FEATURE_REGISTRY` via
regex/`Function()`, validasi struktural apa adanya: key unik, page/tab/subtab
valid, `goTo` id ada di HTML) — otomatis mencakup entry baru tanpa perlu
diedit, tidak ada fixed-count/fixed-list assertion yang perlu disesuaikan.

**Generated/build files** (version bump standar, isi hanya string versi):
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` (konstanta versi)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (bundle ulang, TANPA
  minifikasi — esbuild tidak tersedia di sandbox)
- `index.html`, `app_production.html` (`?v=1245`)
- `sw.js` (`CACHE_NAME` → `kw-cache-v1245`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md` (auto-generated)
- `backups/` (backup bundle lama otomatis dari `build.js`)

## Tests
- Pre-implementation baseline (v1244, sebelum diubah): 3346/3346 PASS
- New tests added: 7 (semua PASS individual sebelum full suite)
- Pre-build full suite: 3353/3353 PASS
- Post-build full suite: 3353/3353 PASS (0 regresi antara pre-build dan post-build)

## Guardrails
Diverifikasi lewat `diff -rq` baseline v1244 vs hasil S512 — file berikut
**TIDAK tersentuh sama sekali**:
- `modules/finance/dana-titipan-portfolio-presenter.js` — UNCHANGED
- `modules/shared/multi-owner-engine.js` — UNCHANGED
- `modules/shared/ownership-engine.js` — UNCHANGED
- `modules/asset/aset.js` — UNCHANGED
- `modules/vehicle/vehicle-core.js` — UNCHANGED
- `car-notes.js` — UNCHANGED
- `modules/dashboard-hub/dashboard-hub.js` — UNCHANGED (dispatcher existing
  sudah cukup, 0 perubahan navigasi)
- `modules/finance/tx-list-cashflow.js` — UNCHANGED (tab Laporan/`setLaporanTab`/
  `LAPORAN_SUBTAB_ORDER` tidak disentuh)

Ditegaskan:
- `DanaTitipanPortfolioAPI` — unchanged
- Presenter (`DanaTitipanPortfolioPresenter`) — unchanged
- `MultiOwnerEngine` — unchanged
- `OwnershipEngine` — unchanged
- Data model (`D.titipanCommitments`, `D.titipanReturns`) — unchanged
- Tab Dana Titipan existing (`#laporanTab-titipan`, sub-tab ke-4 di Laporan) — unchanged, posisi tidak dipindah
- Router — tidak ada router baru, reuse penuh `dashHubNavigateToFeature()`
- HTML — 0 perubahan (`index.html`/`app_production.html` hanya berubah karena `?v=` version bump standar, bukan perubahan struktur)

## Browser Verification
**NOT RUN** — browser tidak tersedia di environment sandbox ini (hanya Node.js
runtime tanpa akses jaringan). Verifikasi dilakukan lewat:
- Test otomatis end-to-end secara struktural (registry → dispatcher map → HTML id existence, lihat `tests/dashboard-hub-registry.test.js` & `tests/dashboard-hub-dana-titipan-s512.test.js`)
- `node --check` pada bundle hasil build (sintaks valid)
- `html-sync` gate (index.html ≡ app_production.html)

Smoke-test manual di browser sungguhan (buka Dashboard Hub → cari "Dana
Titipan" → klik → konfirmasi mendarat di Keuangan → Laporan → Dana Titipan →
panel terisi → tab lain tetap berfungsi) **direkomendasikan sebelum rilis ke
pengguna**, tapi di luar kemampuan environment ini.

## Release Gate
- `lint`: **OVERRIDE** — eslint tidak terpasang (sandbox tanpa akses jaringan
  npm registry), sama seperti S508–S510. Verifikasi manual: perubahan hanya 1
  entry object literal baru mengikuti pola field/style entry existing di
  array yang sama, 0 sintaks baru di luar pola.
- `minify`: **OVERRIDE** — esbuild tidak terpasang (sandbox tanpa akses
  jaringan), sama seperti build v1241–v1244 sebelumnya. Bundle unminified
  tapi valid secara sintaks (`node --check` lolos).
- `html-sync`: **PASS** — `app_production.html` sinkron dengan `index.html`.
- Kedua override dicatat otomatis di `docs/RELEASE-GATE-LOG.md`.
