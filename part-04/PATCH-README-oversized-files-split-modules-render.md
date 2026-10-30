# Patch: pecah modules/shared/modules-render.js

Isi zip ini HANYA file yang berubah/baru — timpa (overwrite) langsung ke
lokasi yang sama di project asli, SETELAH lebih dulu menimpa patch
sebelumnya (`PATCH-README-oversized-files-split.md`, yang memecah
`business-flow-presenter.js` dan `aset.js`). Patch ini melanjutkan audit
ukuran file yang sama, giliran file terbesar berikutnya. Tidak ada
perubahan lain (tidak ada bump versi, tidak ada regenerate bundle
`app-bundle-*.min.js`, tidak ada ubah `index.html`/`app_production.html`/`sw.js`).

## modules/shared/modules-render.js (2445 -> 1277 baris)

Separuh KEDUA file (dari `runDeferredOrNow()` — helper defer render —
sampai baris terakhir: `renderDashboard()`, `renderKeuangan()`,
`renderLaporan()`, `renderCnTab()`, `renderVehicleManageList()`,
`renderSettings()`, self-test/nav-smoke/modal-sweep result renderer, dan
seluruh render Pajak & Zakat) dipindah ke file baru:

- **Baru:** `modules/shared/modules-render-b.js` (1184 baris)
- **Diubah:** `modules/shared/modules-render.js` — sisa separuh PERTAMA
  (renderAccGrid/renderDashAccList/renderCatList/renderBillHistory/
  renderBillArchive/renderBillCalendar/kartu Proyeksi Kas/
  `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/`DASH_CARD_BY_KEY`/
  `isDashCardOn()`/`hideDashCardEl()`/`showDashCardEl()`/
  `renderDashCardPrefsUI()`/`toggleDashCardPref()`, dst).

**Beda dari pola `aset.js`/`business-flow-presenter.js` (patch sebelumnya):**
file ini isinya murni deklarasi `function` global (bukan method di dalam
satu object literal), jadi **tidak butuh `Object.assign` mixin**. Begitu
kedua file di-load ke scope global yang sama, semua fungsi otomatis bisa
saling panggil — cukup pastikan `modules-render-b.js` dimuat SETELAH
`modules-render.js` (urutan dijaga di `scripts/build.js`, lihat di bawah).
`MODULE_RENDER_VERSION` tetap di `modules-render.js` (tidak dipindah,
tidak diubah nilainya).

Titik potong dipilih di batas fungsi yang bersih (baris kosong, tidak
memotong satu grup const `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/
`DASH_CARD_BY_KEY` yang saling terkait) — grup itu dan tiga fungsi
show/hide-card-nya (dipakai lintas modul: `dashboard-hub-settings.js`)
sengaja dibiarkan utuh di `modules-render.js` (bagian PERTAMA).

## Lainnya

- `scripts/build.js` — 1 entri baru ditambahkan ke `GROUP_A`, TEPAT
  SETELAH `modules/shared/modules-render.js` (dependency: fungsi-fungsi
  di `modules-render-b.js` bisa dipanggil dari fungsi-fungsi di
  `modules-render.js`, jadi ordering fisik file sumber ini disamakan
  dengan pola split sebelumnya walau secara teknis 2 file top-level-function
  ini tidak strict-order seperti mixin Object.assign).
- 8 file `tests/*.test.js` — disesuaikan supaya tetap membaca/memuat fungsi
  dari file yang benar setelah pemindahan:
  - `tests/dash-monthly-incexp-hitungkas-s-t2.test.js`,
    `tests/tx-badge-catatan-saja-s-t3.test.js` — `extractFunction()` untuk
    `_dashMonthlyIncExp` diarahkan ke `modules-render-b.js`.
  - `tests/ownership-filter-ui-s235.test.js` — array `loadSource([...])`
    ditambah `modules/shared/modules-render-b.js` (dependency:
    `renderVehicleManageList()` pindah ke situ).
  - `tests/s637-tx-tabel-modern-saldo-berjalan.test.js`,
    `tests/s640-modern-theme-registration-audit.test.js`,
    `tests/s643-audit-lintas-s641-s642.test.js`,
    `tests/virtual-bill-alltx-wiring-s468c.test.js` — path baca source
    (`fs.readFileSync`/`extractFunction`) untuk `renderKeuangan()` diarahkan
    ke `modules-render-b.js`.
  - `tests/dash-card-show-hide.test.js` — loop `renderDashboard()`
    (`dashCardRenderOrder`) yang diaudit sekarang dibaca dari
    `modules-render-b.js` (`SRC_B`, variabel baru); `hideDashCardEl()`/
    `showDashCardEl()` yang diekstrak tetap dari `modules-render.js` (`SRC`,
    tidak berubah — kedua fungsi itu tidak pindah).
  - 15 file `tests/*.test.js` lain yang menyebut nama file ini (termasuk
    yang path-nya di-split lewat `path.join(...)` per-komponen, bukan cuma
    string literal) sudah dicek satu per satu — TIDAK butuh perubahan
    karena fungsi yang mereka pakai (`renderAccGrid`, `renderBillArchive`,
    `renderBillCalendar`, `_renderCashProjectionCard`,
    `_dashCashProjSettingsToggle`, `_dashServisSelfVehicles`, aksi
    `markBillPaid`/`openBillHistory`, dll) semuanya tetap ada di separuh
    PERTAMA (`modules-render.js`).

## Verifikasi

Verifikasi dilakukan di working copy BERSIH (upload asli + patch
sebelumnya + HANYA 10 file di zip ini — tanpa efek samping `npm run build`
yang sempat tidak sengaja jalan dan langsung dibuang lagi supaya tidak ikut
ke patch):

- `npm test` -> **4857 pass, 0 fail** (sama seperti sebelum perubahan ini).
- Lint "file kegedean" (`scripts/build.js`, ambang 1600 baris,
  `self-test.js` di-allowlist): **8 -> 7** file yang masih di atas ambang.
  `modules/shared/modules-render.js` sudah lepas dari daftar (2445 -> 1277).
  Sisa terbesar sekarang: `scripts/build.js` (2410 — wajar, ini script
  build itu sendiri), `modules/modules-render.js` (2165 — file legacy
  duplikat, lihat catatan di bawah), `modules/vehicle/sparepart-servis.js`
  (2054), `modules/shop/modules-render.js` (1974 — legacy duplikat juga),
  `modules/finance/transaksi.js` (1900), `modules/shared/scan-ocr.js`
  (1677), `modules/finance/dana-titipan-portfolio-render.js` (1616).

**Catatan:** `modules/modules-render.js` dan `modules/shop/modules-render.js`
adalah file duplikat/legacy terpisah (bukan file yang dipecah sesi ini) —
disinggung di komentar header masing-masing ("Dipindah ke
modules/shared/modules-render.js ... isi & nama file TIDAK berubah, cuma
lokasi folder"). Belum diaudit/disentuh; kandidat sesi split berikutnya
kalau memang masih relevan (perlu dicek dulu apa masih dipakai atau sisa
peninggalan restrukturisasi folder Sesi 17-18).

## Setelah menimpa file-file ini, jalankan:
```
npm test          # harus tetap 4857 pass, 0 fail
npm run build     # regenerate bundle + bump versi (jalankan manual saat siap rilis)
```
