# Files Changed — Tahap 1

Baseline: `repo-final.zip` yang diunggah (versi v242 /
`kw83-tahap0-feature-registry-17`, sesuai `LANGKAH-9-LAPORAN-AKHIR.md`).

Total file yang berubah: **3**. Total file baru: **1**. Total file
dihapus: **0**. Total file JavaScript tersentuh: **0**.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `design-tokens.css` | **Baru** | +95 | Semua design token (9 blok tema warna + `:root` spacing/radius/font-size/z-index) dipindah apa adanya dari `styles.css`, plus token aditif baru (`--font-body`, `--font-heading`, 7 token radius tambahan, skala shadow & transition durasi sebagai referensi). |
| `styles.css` | Diubah | 739 → 727 baris | (1) Blok token dipindah keluar ke `design-tokens.css`, diganti komentar penunjuk. (2) 71 deklarasi `border-radius`/`border-*-radius` yang sebelumnya angka px literal diganti `var(--r-*)` — **nilai akhir identik**. (3) 32 deklarasi `font-family` diganti `var(--font-body)`/`var(--font-heading)` — **nilai akhir identik**. Tidak ada selector, urutan cascade, atau nilai visual lain yang berubah. |
| `index.html` | Diubah | +1 baris | Menambah `<link rel="stylesheet" href="design-tokens.css?v=242">` sebelum `<link rel="stylesheet" href="styles.css?v=242">`, supaya token termuat lebih dulu. Nomor versi query string (`?v=242`) disamakan dengan yang sudah ada di file, mengikuti konvensi build yang ada — **build system sendiri tidak dijalankan/diubah**. |
| `app_production.html` | Diubah | +1 baris | Perubahan identik dengan `index.html` (file ini memang dijaga identik dengan `index.html` sesuai konvensi proyek — diverifikasi dengan `diff`, tetap identik setelah perubahan). |
| `UI-AUDIT.md` | Baru | — | Deliverable dokumentasi Tahap 1 (lihat isi file). |
| `DESIGN-SYSTEM.md` | Baru | — | Deliverable dokumentasi Tahap 1 (lihat isi file). |
| `CHANGELOG.md` | Baru | — | Deliverable dokumentasi Tahap 1 (lihat isi file). |
| `FILES-CHANGED.md` | Baru | — | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

Diverifikasi dengan `diff -rq` antara baseline dan hasil akhir: **tidak
ada file lain yang berubah** selain empat file di atas + empat dokumen
baru. Secara khusus, dipastikan **tidak tersentuh**:

- Seluruh file `.js` di root maupun `lifeos/` (termasuk
  `dashboard-hub-favorit.js`, `dashboard-hub-registry.js`,
  `features-helpers-global-security.js`, dan lainnya)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `sw.js` (Service Worker)
- `scripts/build.js` dan seluruh isi `scripts/`
- `manifest.json`
- Seluruh isi `tests/`
- `docs/FILE-MAP.md`
- `backups/`
- `eslint.config.js`, `package.json`

## Alasan tidak ada file yang dihapus atau digabung

Tahap 1 murni bersifat aditif + relokasi nilai (bukan penghapusan).
Tidak ada CSS yang dihapus — token yang "hilang" dari `styles.css`
sepenuhnya berpindah ke `design-tokens.css` dengan nilai yang sama,
dan tetap bisa diakses lewat nama variabel yang sama persis.

---

# Files Changed — Tahap 6

Baseline: hasil Tahap 5 (`repo-final.zip` sebagaimana diunggah, 1227/1227
test PASS, 0 file JS berubah sejak Tahap 1).

Total file yang berubah: **2**. Total file baru: **0**. Total file
dihapus: **0**. Total file JavaScript tersentuh: **0**.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `index.html` | Diubah | 4 titik (teks) | Menghapus emoji `⚙️` yang redundan setelah `</svg>` pada 4 tombol `qs-btn` (qsKeuangan, qsLaporan, qsCarnotes, qsAI) — SVG gear yang sudah ada dipertahankan sebagai satu-satunya icon. Tidak ada atribut, event, atau elemen lain yang berubah. |
| `app_production.html` | Diubah | 4 titik (teks) | Perubahan identik dengan `index.html`, diverifikasi tetap identik via `diff` setelah perubahan (konvensi proyek tetap terjaga). |
| `CHANGELOG.md` | Diperbarui | +bagian Tahap 6 | Menambahkan bagian "Tahap 6 — Audit Icon & Perbaikan Minimal". |
| `FILES-CHANGED.md` | Diperbarui | +bagian ini | Dokumen ini. |
| `UI-ICON-AUDIT.md` | Baru | — | Tabel audit icon lengkap per kategori (deliverable Tahap 6, terpisah dari `UI-AUDIT.md` Tahap 1 supaya tidak menimpa audit sebelumnya). |

## File yang TIDAK berubah (ditegaskan)

Diverifikasi dengan `diff` dan `grep`: **tidak ada file lain yang
berubah**. Secara khusus dipastikan tetap utuh:

- Seluruh 69 file `.js` di root maupun `lifeos/**` (termasuk
  `dashboard-hub-registry.js` yang menyimpan field `icon:` emoji —
  sengaja tidak disentuh karena mengubahnya berarti mengubah
  JavaScript)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `styles.css`
- `sw.js` (Service Worker)
- `scripts/build.js` dan seluruh isi `scripts/`
- `manifest.json`, `icon-192.svg`, `icon-512.svg`
- Seluruh isi `tests/`
- ADR-001, `FEATURE_REGISTRY`, Blueprint Final
- `eslint.config.js`, `package.json`

## Alasan tidak ada file JS/CSS yang diubah di Tahap 6

Satu-satunya perubahan yang lolos kriteria "aman + minimal" adalah
penghapusan emoji duplikat di dua file HTML statis. Seluruh temuan
audit lain yang secara teknis "perlu diganti" (emoji sebagai icon UI)
mayoritas berada di JavaScript (field data `icon:`, label tombol
dinamis) — mengubahnya melanggar batasan eksplisit Tahap 6 ("Jangan
mengubah JavaScript"), sehingga dicatat sebagai rekomendasi Tahap 7,
bukan dieksekusi.

---

# Files Changed — Tahap 7

Baseline: hasil Tahap 6 (1227/1227 PASS, 0 JS berubah sejak Tahap 1).

Total file yang berubah: **2**. Total file baru: **0**. Total file
dihapus: **0**. Total file JavaScript tersentuh: **0**. Total file
HTML tersentuh: **0**.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `styles.css` | Diubah | 739 → 818 baris (+79, murni aditif) | Motion tokens (`--dur-*`, `--ease-*`), `prefers-reduced-motion`, `:focus-visible`, ripple CSS-only pada 13 tap-target, press-feedback yang tadinya belum ada (4 komponen + nav-item), card elevation on hover (desktop-only), penyeragaman easing pada `overlayIn`/`slideUp`/`.toast`/`.page` (nilai durasi tidak berubah). |
| `CHANGELOG.md` | Diperbarui | +bagian Tahap 7 | Menambahkan bagian "Tahap 7 — Micro Interaction & Motion System". |
| `FILES-CHANGED.md` | Diperbarui | +bagian ini | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- Seluruh 69 file `.js` (root & `lifeos/**`), termasuk
  `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html` (tetap identik satu sama lain,
  diverifikasi `diff`)
- `sw.js`, `scripts/build.js`, `manifest.json`, `icon-192.svg`,
  `icon-512.svg`
- Seluruh isi `tests/`
- ADR-001, `FEATURE_REGISTRY`, Blueprint Final
- `eslint.config.js`, `package.json`
- `UI-ICON-AUDIT.md` (dokumen Tahap 6, tidak disentuh ulang)

## Alasan hanya `styles.css` yang diubah

Seluruh target Tahap 7 (hover, active, focus-visible, press
animation, card elevation, button feedback, navigation transition,
dialog/bottom-sheet/snackbar animation, ripple CSS-only,
`prefers-reduced-motion`, smooth scrolling) bisa dicapai murni lewat
CSS karena mekanisme toggle (`class .open`, `class .show`, `class
.active`) yang dibutuhkan **sudah ada** di JavaScript sejak sebelum
Tahap 7 — CSS baru hanya perlu "mengisi" bagaimana state tersebut
tampil secara visual. Satu pengecualian (exit animation overlay)
butuh perubahan JS dan sengaja **tidak dieksekusi**, dicatat sebagai
rekomendasi Tahap 8 di `CHANGELOG.md`.

# Files Changed — Tahap 8

Baseline: hasil Tahap 7 (1228/1228 test PASS — angka aktual, lihat
`FINAL-QA.md` §1 — 0 file JS berubah sejak Tahap 1).

Total file yang berubah: **2**. Total file baru: **1**. Total file
dihapus: **0**. Total file CSS/JavaScript tersentuh: **0**.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `FINAL-QA.md` | **Baru** | — | Deliverable audit akhir Tahap 8 (lihat isi file: accessibility, responsive, performance CSS, design system, motion, icon summary, rekomendasi Tahap 9, ringkasan Tahap 1–8, quality gate). |
| `CHANGELOG.md` | Diperbarui | +bagian Tahap 8 | Menambahkan bagian "Tahap 8 — Final QA, Accessibility, Performance & Release Candidate". |
| `FILES-CHANGED.md` | Diperbarui | +bagian ini | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

Diverifikasi dengan `diff -rq` terhadap hasil Tahap 7: **tidak ada file
lain yang berubah**. Secara khusus dipastikan tetap utuh:

- Seluruh file `.js` di root maupun `lifeos/**`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `styles.css`, `index.html`, `app_production.html`
- `sw.js` (Service Worker)
- `scripts/build.js` dan seluruh isi `scripts/`
- `manifest.json`, `icon-192.svg`, `icon-512.svg`
- Seluruh isi `tests/`
- ADR-001, `FEATURE_REGISTRY`, Blueprint Final
- `eslint.config.js`, `package.json`
- `UI-ICON-AUDIT.md` (deliverable Tahap 6, tidak diaudit ulang)

## Alasan tidak ada file CSS/JS yang diubah di Tahap 8

Tahap 8 adalah audit murni. Seluruh temuan yang secara teknis "bisa"
diperbaiki (literal CSS vs token, kontras `--text3`, ukuran tap-target
sekunder) sengaja **tidak dieksekusi** mengikuti instruksi eksplisit
brief Tahap 8: "Jangan mengubah jika berisiko. Catat sebagai
rekomendasi bila perlu." Seluruh temuan dicatat di `FINAL-QA.md` §8
sebagai rekomendasi Tahap 9.

# Files Changed — Final Release Candidate (Release Notes, Dokumentasi & Handover)

Baseline: hasil Tahap 8 / Release Candidate (1228/1228 test PASS, 0
file JS/CSS/HTML berubah sejak Tahap 1).

Total file yang berubah: **6**. Total file baru: **4**. Total file
dihapus: **0**. Total file HTML/CSS/JavaScript tersentuh: **0**.

| File | Jenis | Ringkasan |
|---|---|---|
| `RELEASE-NOTES.md` | **Baru** | Ringkasan Release Candidate, highlight Tahap 1–8, fitur utama, hasil testing, quality gate. |
| `PROJECT-SUMMARY.md` | **Baru** | Struktur project, arsitektur, design system, entry point, folder utama, komponen utama, alur aplikasi — untuk handover ke developer lain. |
| `KNOWN-ISSUES.md` | **Baru** | Daftar seluruh isu yang sengaja belum diperbaiki (murni dokumentasi ulang dari `FINAL-QA.md`, tidak ada perbaikan baru). |
| `ROADMAP-v1.1.md` | **Baru** | Backlog versi berikutnya, dikelompokkan High/Medium/Low Priority. |
| `CHANGELOG.md` | Diperbarui | +bagian "Final Release Candidate — Release Notes, Dokumentasi & Handover". |
| `FILES-CHANGED.md` | Diperbarui | +bagian ini. |

## File yang TIDAK berubah (ditegaskan)

Diverifikasi dengan `diff -rq` terhadap hasil Tahap 8: **tidak ada file
HTML/CSS/JavaScript yang berubah**. Secara khusus dipastikan tetap utuh:

- Seluruh file `.js` di root maupun `lifeos/**`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `styles.css`, `index.html`, `app_production.html`
- `sw.js` (Service Worker)
- `scripts/build.js` dan seluruh isi `scripts/`
- `manifest.json`, `icon-192.svg`, `icon-512.svg`
- Seluruh isi `tests/`
- ADR-001, `FEATURE_REGISTRY`, Blueprint Final
- `eslint.config.js`, `package.json`
- `FINAL-QA.md`, `UI-ICON-AUDIT.md`, `DESIGN-SYSTEM.md`, `UI-AUDIT.md`, `LANGKAH-9-LAPORAN-AKHIR.md` (deliverable tahap sebelumnya, tidak diubah)

## Validasi

Perintah yang dijalankan untuk memastikan hanya file Markdown yang
berubah:

```
diff -rq <baseline-tahap-8> <hasil-final>
```

Hasil: hanya `CHANGELOG.md`, `FILES-CHANGED.md` (diperbarui) dan
`RELEASE-NOTES.md`, `PROJECT-SUMMARY.md`, `KNOWN-ISSUES.md`,
`ROADMAP-v1.1.md` (baru) yang muncul di diff — seluruhnya berekstensi
`.md`. Tidak ada file lain yang tersentuh.

## Daftar Seluruh File Dokumentasi (Kumulatif Tahap 1 – Final)

| File | Dibuat di Tahap |
|---|---|
| `UI-AUDIT.md` | 1 |
| `DESIGN-SYSTEM.md` | 1 |
| `CHANGELOG.md` | 1 (diperbarui tiap tahap) |
| `FILES-CHANGED.md` | 1 (diperbarui tiap tahap) |
| `UI-ICON-AUDIT.md` | 6 |
| `FINAL-QA.md` | 8 |
| `RELEASE-NOTES.md` | Final |
| `PROJECT-SUMMARY.md` | Final |
| `KNOWN-ISSUES.md` | Final |
| `ROADMAP-v1.1.md` | Final |
| `LANGKAH-9-LAPORAN-AKHIR.md` | Pra-Tahap 1 (baseline) |
| `README.md` | Pra-Tahap 1 (baseline) |
| `docs/CLAUDE.md`, `docs/FILE-MAP.md`, `docs/CATATAN-CEK-CLAUDE.md`, `docs/PRE-MERGE-LINT-CHECK.md` | Pra-Tahap 1 (baseline, internal) |

---

# Files Changed — Sprint 1, Tahap 2 (Dashboard 2.0 — Hero Card)

Baseline: FINAL RELEASE CANDIDATE (v242 / `kw83-tahap0-feature-registry-17`)
+ Sprint 1 Tahap 1 (`DASHBOARD-2.0-PLAN.md`, 0 file kode disentuh).

Total file kode berubah: **4** (`dashboard-hub.js`, `index.html`,
`styles.css`, + `app_production.html` sinkron otomatis). Total file baru:
**2** (`HERO-CARD.md`, `tests/dashboard-hub-hero.test.js`). Total file
dibuat ulang otomatis oleh `scripts/build.js` (bukan diedit manual):
**5** (`app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
`docs/FILE-MAP.md`, + versi string di 6 file source).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-hub.js` | Diubah | Tambah `_dashHubHeroMonthTx()` + object `DashboardHubHero` (fungsi baru murni, tidak ada baris lama dihapus/diubah), + 1 baris pemanggilan aditif `if (typeof DashboardHubHero !== 'undefined') DashboardHubHero.render();` di dalam `DashboardHub.render()`, pola sama dgn `LifeOSHome.render()`/`DashboardHubFavoritView.render()` yang sudah ada. |
| `index.html` | Diubah | Tambah blok `<div class="dashhub-hero" id="dashHubHeroCard">…</div>` di dalam `#page-dashboard-hub`, sebagai elemen PERTAMA setelah header, sebelum `.dashhub-search-wrap`. Tidak ada elemen lain yang dipindah/dihapus/diubah. |
| `styles.css` | Diubah | Tambah blok CSS baru scoped `.dashhub-hero*` (~25 deklarasi) setelah `.dashhub-search-empty`, sebelum komentar "Tahap 5 (Responsive...)". 100% pakai token yang sudah ada (`--r-2xl`/`--sp-*`/`--fs-*`/`--accent*`/`.green`/`.red`). Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya. |
| `app_production.html` | Diubah (otomatis) | Disinkronkan ulang jadi salinan persis `index.html` oleh `scripts/build.js` (konvensi proyek yang sudah ada — file ini SELALU ditulis ulang di akhir build, bukan diedit manual). |
| `app-bundle-a.min.js` | Dibuat ulang (otomatis) | Hasil `scripts/build.js` dari GROUP_A source (tidak ada file GROUP_A yang berubah isinya di tahap ini, bundle ini ikut ditulis ulang krn build memproses kedua grup sekaligus + bump versi). |
| `app-bundle-b.min.js` | Dibuat ulang (otomatis) | Hasil `scripts/build.js` dari GROUP_B source, termasuk `dashboard-hub.js` yang sudah memuat `DashboardHubHero`. Ini file yang BENERAN dimuat `index.html`/`app_production.html` lewat `<script src="app-bundle-b.min.js?v=243">`. |
| `sw.js` | Diubah (otomatis) | `CACHE_NAME` naik ke `'kw-cache-v243'` — efek samping bump-version otomatis `scripts/build.js`, bukan perubahan logic Service Worker. |
| `docs/FILE-MAP.md` | Dibuat ulang (otomatis) | Ditulis ulang otomatis oleh `scripts/build.js` (bagian dari alur build yang sudah ada). |
| 6 file source versi (`modules-render.js`, `modals.js`, `modules-calc.js`, `features-budget-laporan-carnotes-pelanggan.js`, `features-helpers-global-security.js`, `features-aiwidget-reminder-gdrive-search.js`) | Diubah (otomatis) | String versi `kw83-tahap0-feature-registry-17` → `-18`, bump otomatis `scripts/build.js` (konvensi versi yang sudah ada sejak Tahap 0, bukan proses baru). |
| `HERO-CARD.md` | **Baru** | Dokumentasi struktur, data, CSS, dan alasan desain Hero Card (deliverable Tahap 2). |
| `tests/dashboard-hub-hero.test.js` | **Baru** | 8 test baru utk `DashboardHubHero` + 1 test integrasi `DashboardHub.render()`. |
| `CHANGELOG.md` | Diubah | Tambah bagian "Sprint 1, Tahap 2" di akhir file (append, riwayat lama tidak diubah). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (append, riwayat lama tidak diubah). |

## File yang TIDAK berubah (ditegaskan)

- `dashboard-hub-registry.js` (**`FEATURE_REGISTRY`**) — 0 baris berubah.
- `scripts/build.js` — **dijalankan, TIDAK diedit**. Semua perubahan di
  file di atas yang bertanda "(otomatis)" adalah OUTPUT dari menjalankan
  skrip ini apa adanya, bukan hasil edit manual ke `scripts/build.js`.
- Seluruh JS domain lain (`akun.js`, `transaksi.js`, `modules-calc.js`, dkk)
  — isinya tidak diedit sama sekali; hanya ikut "dibaca ulang" (unchanged
  content) ke dalam bundle baru oleh `scripts/build.js`.
- `manifest.json`, `eslint.config.js`, `package.json` — tidak disentuh,
  tidak ada dependency baru.
- Grid kategori, Favorit, Life OS, Pinned Widgets, Bottom Navigation, Quick
  Switcher — 0 baris berubah pada komponen-komponen ini.
- `DASHBOARD-2.0-PLAN.md` (deliverable Tahap 1) — tidak diedit ulang.

## Hasil test

```
node --test tests/*.test.js
# tests 1235
# pass 1235
# fail 0
```

(Baseline pristine terverifikasi ulang di lingkungan ini: 1227/1227 PASS —
lihat catatan di `CHANGELOG.md` bagian Tahap 2. 8 test baru ditambahkan
murni aditif, 0 test lama gagal/dihapus.)

---

# Files Changed — Sprint 1, Tahap 3 (Dashboard 2.0 — Quick Actions)

Baseline: Sprint 1 Tahap 2 — Hero Card (1235/1235 test PASS, build
`kw83-tahap0-feature-registry-18`, v243).

Total file kode berubah: **3** (`index.html`, `styles.css`, +
`app_production.html` sinkron otomatis). Total file baru: **2**
(`QUICK-ACTIONS.md`, `tests/dashboard-hub-quickactions.test.js`). Total
file dibuat ulang otomatis oleh `scripts/build.js` (bukan diedit manual):
**5** (`app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
`docs/FILE-MAP.md`, + versi string di 6 file source). **0 file JavaScript
domain diedit manual** — Quick Actions murni markup, tidak butuh modul JS
baru.

| File | Jenis | Ringkasan |
|---|---|---|
| `index.html` | Diubah | Tambah blok `<div class="dashhub-qa-row" id="dashHubQuickActions">…</div>` (5 tombol `.dashhub-qa-btn`) di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-hero`, sebelum `.dashhub-search-wrap`. Tiap tombol memanggil fungsi yang **SUDAH ADA** lewat `data-onclick` (`openTxModal('expense')`, `openCatatan('anak')`, `openBackupModal()`, `document.getElementById('dashHubSearchInput').focus()`, `showPage('ai',document.querySelectorAll('.nav-item')[3])`). Tidak ada elemen lain yang dipindah/dihapus/diubah. |
| `styles.css` | Diubah | Tambah blok CSS baru scoped `.dashhub-qa*` (~12 deklarasi) setelah blok media query Hero Card `min-width:600px`. 100% pakai token yang sudah ada (`--sp-*`/`--r-pill`/`--fs-icon-lg`/`--surface2`/`--surface3`/`--border`/`--accent`/`--text2`). Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya. |
| `app_production.html` | Diubah (otomatis) | Disinkronkan ulang jadi salinan persis `index.html` oleh `scripts/build.js` (konvensi proyek yang sama sejak Tahap 2). |
| `app-bundle-a.min.js` | Dibuat ulang (otomatis) | Hasil `scripts/build.js` dari GROUP_A source — bump versi otomatis, tidak ada perubahan logic GROUP_A. |
| `app-bundle-b.min.js` | Dibuat ulang (otomatis) | Hasil `scripts/build.js` dari GROUP_B source — bump versi otomatis, tidak ada fungsi JS baru (Quick Actions murni markup, tidak menyentuh `dashboard-hub.js`). |
| `sw.js` | Diubah (otomatis) | `CACHE_NAME` naik ke `'kw-cache-v244'` — efek samping bump-version otomatis `scripts/build.js`. |
| `docs/FILE-MAP.md` | Dibuat ulang (otomatis) | Ditulis ulang otomatis oleh `scripts/build.js`. |
| 6 file source versi (`modules-render.js`, `modals.js`, `modules-calc.js`, `features-budget-laporan-carnotes-pelanggan.js`, `features-helpers-global-security.js`, `features-aiwidget-reminder-gdrive-search.js`) | Diubah (otomatis) | String versi `kw83-tahap0-feature-registry-18` → `-19`, bump otomatis `scripts/build.js`. |
| `QUICK-ACTIONS.md` | **Baru** | Dokumentasi struktur Quick Actions, aksi yang digunakan, event yang dipanggil, CSS baru, dan alasan desain (deliverable Tahap 3). |
| `tests/dashboard-hub-quickactions.test.js` | **Baru** | 10 test baru: markup ada & posisi benar, jumlah tombol, tiap tombol memanggil fungsi yang sudah ada, Hero Card/Grid Dashboard tidak tersentuh, parity HTML, token CSS valid. |
| `CHANGELOG.md` | Diubah | Tambah bagian "Sprint 1, Tahap 3" di akhir file (append, riwayat lama tidak diubah). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (append, riwayat lama tidak diubah). |

## File yang TIDAK berubah (ditegaskan)

- `dashboard-hub.js` — **0 baris berubah**. Quick Actions tidak butuh modul
  JS baru karena tiap tombol langsung memanggil fungsi global yang sudah
  ada lewat `data-onclick` (dispatcher yang sudah ada di
  `features-helpers-global-security.js`).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- `transaksi.js` (`openTxModal`, `openCatatan`), `backup-restore.js`
  (`openBackupModal`), `modal-navigasi.js` (`showPage`) — dipanggil APA
  ADANYA, **0 baris diedit**.
- `scripts/build.js` — dijalankan, TIDAK diedit.
- Grid Dashboard (`#dashboardHubGrid`/`#dashboardHubWrap`), Widget (Life
  OS, Favorit, Pinned Widgets), Bottom Navigation (`.nav-item`) — 0 baris
  berubah pada komponen-komponen ini.
- `manifest.json`, `eslint.config.js`, `package.json` — tidak disentuh,
  tidak ada dependency baru.
- `HERO-CARD.md` (deliverable Tahap 2) — tidak diedit ulang.

## Hasil test

```
node --test tests/*.test.js
# tests 1245
# pass 1245
# fail 0
```

(Baseline Tahap 2 terverifikasi ulang di lingkungan ini: 1235/1235 PASS.
10 test baru ditambahkan murni aditif, 0 test lama gagal/dihapus.)

# Files Changed — Sprint 1 Tahap 4 (Modern Dashboard Grid)

Baseline: Sprint 1 Tahap 3 selesai, `node --test` 1245/1245 PASS.

Total file kode berubah: **2**. Total file baru: **1** (dokumentasi).
Total baris kode berubah: **~42** (jauh di bawah batas 350 baris / 5 file).

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `styles.css` | Diubah | ~40 baris (24 tambah, 17 hapus/ganti) | Modernisasi Material Design 3 untuk `.dashhub-cat*`, `.dashhub-feature-grid`, `.dashhub-feature-card`, `.dashhub-feature-name/-desc`, `.dashhub-fav-star`, dan hover elevation kartu — radius, padding/gap via token spacing, shadow elevation, favorite indicator jadi chip bulat, + 1 class baru `.dashhub-cat-badge`. |
| `dashboard-hub.js` | Diubah | +1 baris | Render `.dashhub-cat-badge` (jumlah fitur per kategori) di sebelah label kategori — murni tampilan, pakai `cat.features.length` yang sudah ada, `FEATURE_REGISTRY` tidak disentuh. |
| `DASHBOARD-GRID.md` | Baru | — | Deliverable dokumentasi Tahap 4. |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Tahap 4 ditambahkan di akhir file (aditif, entry Tahap 1-3 tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`) — 0 baris
  berubah, tetap tampil & berfungsi seperti Tahap 2/3.
- Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search — di luar
  cakupan Tahap 4, tidak disentuh.
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `index.html`, `app_production.html` — tidak diedit (markup kontainer
  grid yang sudah ada dari Tahap 1/5 sudah cukup, tidak perlu perubahan).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi, validasi
  cukup `node --test`).

## Hasil test

```
node --test
# tests 1246
# pass 1246
# fail 0
```

# Files Changed — Sprint 1 Tahap 5 (Dashboard Summary Cards)

Baseline: Sprint 1 Tahap 4 selesai, `node --test` 1246/1246 PASS.

Total file kode berubah: **3** (`dashboard-hub.js`, `styles.css`,
`index.html` + `app_production.html` sinkron manual). Total file baru:
**2** (`DASHBOARD-SUMMARY.md`, `tests/dashboard-hub-summary.test.js`).
**`scripts/build.js` tidak dijalankan** — tidak ada file yang
dibuat/ditulis ulang otomatis pada Tahap 5 ini (berbeda dari Tahap 2/3
yang menjalankan build; sama seperti keputusan Tahap 4).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-hub.js` | Diubah | Tambah `_dashHubSummaryMonthTx()` + object `DashboardHubSummary` (fungsi baru murni, tidak ada baris lama dihapus/diubah), + 1 baris pemanggilan aditif `if (typeof DashboardHubSummary !== 'undefined') DashboardHubSummary.render();` di dalam `DashboardHub.render()`, pola sama dgn `DashboardHubHero.render()` yang sudah ada. |
| `index.html` | Diubah | Tambah blok `<div class="dashhub-summary-grid" id="dashHubSummaryGrid"></div>` di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-qa-row` (Quick Actions), sebelum `.dashhub-search-wrap`. Tidak ada elemen lain yang dipindah/dihapus/diubah. |
| `styles.css` | Diubah | Tambah blok CSS baru scoped `.dashhub-summary*` (~6 deklarasi + 1 media query) setelah blok media query Quick Actions `min-width:600px`, sebelum komentar "Tahap 5 (Responsive...)". 100% pakai token yang sudah ada (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/`--border`) + utility `.green`/`.red` yang sudah ada. Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya. |
| `app_production.html` | Diubah (manual, disinkronkan) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — **bukan** oleh `scripts/build.js` (tidak dijalankan pada Tahap 5), melainkan disinkronkan langsung krn kedua file harus tetap identik. |
| `DASHBOARD-SUMMARY.md` | **Baru** | Dokumentasi struktur, sumber data, CSS baru, dan alasan desain Summary Cards (deliverable Tahap 5). |
| `tests/dashboard-hub-summary.test.js` | **Baru** | 6 test baru untuk `_dashHubSummaryMonthTx()`/`DashboardHubSummary` + 1 test integrasi `DashboardHub.render()` (memverifikasi Hero Card & Grid Dashboard tetap tampil). |
| `CHANGELOG.md` | Diubah | Tambah bagian "Sprint 1 Tahap 5" di akhir file (append, riwayat lama tidak diubah). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (append, riwayat lama tidak diubah). |

## File yang TIDAK berubah (ditegaskan)

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Dashboard
  Grid (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`) — 0 baris
  berubah, tetap tampil & berfungsi seperti Tahap 2/3/4.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search — di luar
  cakupan Tahap 5, tidak disentuh.
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi, validasi
  cukup `node --test`). Catatan: karena build tidak dijalankan, bundle
  yang benar-benar dimuat browser (`app-bundle-b.min.js`) belum memuat
  `DashboardHubSummary` — lihat §5 `DASHBOARD-SUMMARY.md`.

## Hasil test

```
node --test
# tests 1252
# pass 1252
# fail 0
```

(Baseline Tahap 4 terverifikasi ulang di lingkungan ini: 1246/1246 PASS.
6 test baru ditambahkan murni aditif, 0 test lama gagal/dihapus.)

# Files Changed — Sprint 1 Tahap 6 (Modern Pinned Widgets)

Baseline: Sprint 1 Tahap 5 selesai, `node --test` 1252/1252 PASS.

Total file kode berubah: **1** (`styles.css`). Total file baru: **2**
(`PINNED-WIDGETS.md`, `tests/dashboard-hub-pinnedwidgets.test.js`).
Total baris kode berubah: **~47 baris** (jauh di bawah batas 350 baris /
5 file). **0 file HTML/JS diedit** — modernisasi murni CSS, scoped ke
descendant selector `#dashboardHubPinnedWrap ...`.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `styles.css` | Diubah | ~47 baris (tambah) | Blok CSS baru scoped `#dashboardHubPinnedWrap .card`/`#dashboardHubPinnedWrap .card-title` + 3 media query (600px 2-kolom, 1024px 3-kolom, hover elevation) setelah blok Summary Cards, sebelum komentar "Tahap 5 (Responsive...)". 100% pakai token yang sudah ada (`--r-2xl`/`--sp-*`/`--fs-body-lg`). Definisi dasar `.card`/`.card-title` (dipakai ~40+ kartu lain) **tidak diubah**. |
| `PINNED-WIDGETS.md` | **Baru** | — | Dokumentasi cakupan, alasan "murni CSS scoped", CSS baru, dan alasan desain per target Tahap 6 (deliverable). |
| `tests/dashboard-hub-pinnedwidgets.test.js` | **Baru** | — | 11 test baru: 6 widget & urutannya tidak berubah, markup/`data-action` tiap widget tidak berubah, Hero/Quick Actions/Summary Cards/Grid tetap ada, `.card`/`.card-title` dasar tidak diedit, override ter-scope dengan benar ke Pinned Widgets, token CSS valid, breakpoint 600px/1024px ada. |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Tahap 6 ditambahkan di akhir file (aditif, entry Tahap 1-5 tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- `dashboard-hub.js`, `index.html`, `app_production.html` — **0 baris
  berubah**. Rendering isi 6 widget Pinned (`Advisor`, `LifeBalance`,
  `FI`, dkk) sudah ditangani modul JS masing-masing sejak sebelum Tahap
  6, tidak dipanggil dari `DashboardHub.render()` — tidak ada yang perlu
  diedit untuk modernisasi visual ini.
- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`) — 0 baris
  berubah, tetap tampil & berfungsi seperti Tahap 2/3/4/5.
- `.card`/`.card-title` **dasar** (dipakai ~40+ kartu lain di seluruh
  app: Dashboard lama, Keuangan, Shop, Car Notes, Pajak, Pengaturan,
  dst) — 0 baris berubah; hanya di-override via descendant selector
  `#dashboardHubPinnedWrap ...` yang HANYA berlaku di dalam Pinned
  Widgets.
- Isi widget, event (`data-action`), data (`D.*`), dan urutan 6 widget
  Pinned — tidak diubah.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi, validasi
  cukup `node --test`).

## Hasil test

```
node --test
# tests 1263
# pass 1263
# fail 0
```

(Baseline Tahap 5 terverifikasi ulang di lingkungan ini: 1252/1252 PASS.
11 test baru ditambahkan murni aditif, 0 test lama gagal/dihapus.)

# Files Changed — Sprint 1 Tahap 7 (Dashboard Analytics)

Baseline: Sprint 1 Tahap 6 selesai, `node --test` 1263/1263 PASS.

Total file kode berubah: **4** (`dashboard-hub.js`, `styles.css`,
`index.html` + `app_production.html` sinkron manual). Total file baru:
**2** (`DASHBOARD-ANALYTICS.md`, `tests/dashboard-hub-analytics.test.js`).
Total file kode+test: **5** (pas di batas maksimal). Total baris
kode+markup berubah: **~99 baris** (jauh di bawah batas 350 baris).
**`scripts/build.js` tidak dijalankan** — sama seperti keputusan
Tahap 4/5.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `dashboard-hub.js` | Diubah | ~62 baris (tambah) | Tambah `_dashHubAnalyticsMonthTx()` + object `DashboardHubAnalytics` (render 5 kartu horizontal: Transaksi Bulan Ini/Total Pemasukan/Total Pengeluaran/Saldo Bersih/Pemasukan vs Pengeluaran %, fungsi baru murni, tidak ada baris lama dihapus/diubah), + 1 baris pemanggilan aditif `if (typeof DashboardHubAnalytics !== 'undefined') DashboardHubAnalytics.render();` di dalam `DashboardHub.render()`, tepat setelah pemanggilan `DashboardHubSummary.render()`. |
| `index.html` | Diubah | ~11 baris (tambah) | Tambah blok `<div class="dashhub-analytics-row" id="dashHubAnalyticsRow"></div>` di dalam `#page-dashboard-hub`, tepat setelah `.dashhub-summary-grid` (Summary Cards), sebelum `.dashhub-search-wrap`. Tidak ada elemen lain yang dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | ~11 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — **bukan** oleh `scripts/build.js` (tidak dijalankan pada Tahap 7), melainkan disinkronkan langsung krn kedua file harus tetap identik. |
| `styles.css` | Diubah | ~15 baris (tambah) | Blok CSS baru scoped `.dashhub-analytics*` (5 deklarasi, baris scroll horizontal) setelah blok media query Summary Cards `min-width:600px`, sebelum komentar Pinned Widgets Tahap 6. 100% pakai token yang sudah ada (`--sp-*`/`--r-xl`/`--fs-caption`/`--fs-title-sm`/`--surface2`/`--border`) + utility `.green`/`.red` yang sudah ada; pola scroll horizontal reuse dari `.trs-chip-row`/`.kasir-kat-chips`. Tidak ada deklarasi `.dashhub-*` lama yang diubah nilainya. |
| `DASHBOARD-ANALYTICS.md` | **Baru** | — | Dokumentasi struktur, sumber data, CSS baru, dan alasan desain Dashboard Analytics (deliverable Tahap 7). |
| `tests/dashboard-hub-analytics.test.js` | **Baru** | — | 7 test baru untuk `_dashHubAnalyticsMonthTx()`/`DashboardHubAnalytics` + 1 test integrasi `DashboardHub.render()` (memverifikasi Hero Card/Summary Cards/Grid tetap tampil). |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Tahap 7 ditambahkan di akhir file (aditif, entry Tahap 1-6 tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- Hero Card (`.dashhub-hero*`), Quick Actions (`.dashhub-qa*`), Summary
  Cards (`.dashhub-summary*`), Dashboard Grid
  (`#dashboardHubGrid`/`.dashhub-cat*`/`.dashhub-feature*`), Pinned
  Widgets (`#dashboardHubPinnedWrap`) — 0 baris berubah, tetap tampil &
  berfungsi seperti Tahap 2/3/5/6.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris berubah.
- Bottom Navigation, AI, Statistik, Widget Drag & Drop, Search — di luar
  cakupan Tahap 7, tidak disentuh.
- `FEATURE_REGISTRY`, ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi, validasi
  cukup `node --test`). Catatan: karena build tidak dijalankan, bundle
  yang benar-benar dimuat browser (`app-bundle-b.min.js`) belum memuat
  `DashboardHubAnalytics` — sama seperti catatan Tahap 5 untuk
  `DashboardHubSummary`.

## Hasil test

```
node --test
# tests 1270
# pass 1270
# fail 0
```

(Baseline Tahap 6 terverifikasi ulang di lingkungan ini: 1263/1263 PASS.
7 test baru ditambahkan murni aditif, 0 test lama gagal/dihapus.)

---

# FILES-CHANGED — Sprint 2 Tahap 1: FAB Halaman Keuangan (Finance 2.0)

Baseline diaudit ulang langsung dari source code (Sprint 1 Tahap 7,
`node --test` 1271/1271 PASS aktual di lingkungan ini) — bukan dari
ringkasan/laporan sebelumnya, yang ternyata tidak sesuai isi project
(lihat `FINANCE-2.0.md` §0).

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | ~9 baris (tambah) | Tambah blok `<div class="keu-fab" id="keuFab">...</div>` di dalam `#page-keuangan`, tepat setelah `.cn-tabs`, sebelum `#keuanganTab-kelola`. Isi: 2 tombol aksi (reuse `openTxModal('income')`/`openTxModal('expense')` yang sudah ada) + 1 tombol utama toggle (reuse mekanisme `data-onclick` generik yang sudah ada). Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | ~9 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — **bukan** oleh `scripts/build.js` (tidak dijalankan), melainkan disinkronkan langsung. |
| `styles.css` | Diubah | ~13 baris (tambah) | Blok CSS baru scoped `.keu-fab*` (append di akhir file, setelah komentar penutup Tahap 7). 100% pakai token yang sudah ada (`--sp-9`/`--sp-4`/`--sp-3`/`--sp-6`/`--r-full`/`--r-pill`/`--fs-icon`/`--fs-icon-lg`/`--fs-body`/`--z-dropdown`/`--accent`/`--surface3`/`--border2`/`--text`/`--dur-fast`/`--ease-standard`). Tidak ada deklarasi `.keu-*` atau lainnya yang diubah nilainya. |
| `tests/finance-2.0-fab.test.js` | **Baru** | — | 12 test struktural (baca markup mentah via `fs`, tanpa DOM tiruan, karena FAB tidak menambah fungsi JS): keberadaan & posisi `#keuFab` relatif terhadap `#page-keuangan`/`#keuanganTab-kelola`, reuse `openTxModal()`, reuse `data-onclick` (bukan `data-action`), parity `index.html` vs `app_production.html`, CSS `.keu-fab*` memakai token yang sudah ada, serta guard eksplisit `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) dan `transaksi.js` (business logic) tidak disentuh. |
| `FINANCE-2.0.md` | **Baru** | — | Dokumentasi tujuan, layout, perubahan visual, FAB, responsive, design token, file yang berubah, dan alasan business logic tidak disentuh (deliverable Sprint 2 Tahap 1). |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 1 ditambahkan di akhir file (aditif, entry Tahap 1-7 Sprint 1 tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- Hero Dashboard, Dashboard, Dashboard Analytics (`dashboard-hub.js`,
  `dashboard-hub-registry.js`) — 0 baris berubah.
- Seluruh isi Halaman Keuangan yang sudah ada sebelum Tahap ini
  (Anggaran, Dana Pensiun, Proyek Renovasi, Sewa Kios, Semua Transaksi,
  dll.) — 0 baris berubah, tetap tampil & berfungsi seperti sebelumnya.
- `transaksi.js` (`openTxModal` dan seluruh business logic transaksi)
  — 0 baris berubah; hanya dipanggil ulang (reuse) dari lokasi baru.
- `FEATURE_REGISTRY`, ADR-001, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan** (sesuai instruksi, validasi
  cukup `node --test`). Catatan: karena build tidak dijalankan, bundle
  yang benar-benar dimuat browser (`app-bundle-b.min.js`) belum memuat
  markup FAB ini — sama seperti catatan Tahap 5/7 untuk fitur aditif
  lain yang belum di-build ulang.

## Hasil test

```
node --test
# tests 1283
# pass 1283
# fail 0
```

(Baseline Sprint 1 Tahap 7 terverifikasi ulang di lingkungan ini:
1271/1271 PASS. 12 test baru ditambahkan murni aditif, 0 test lama
gagal/dihapus/diubah.)

---

# FILES-CHANGED — Sprint 2 Tahap 2: FAB Halaman Shop (Shop 2.0)

Baseline: Sprint 2 Tahap 1 selesai, `node --test` 1283/1283 PASS
(diverifikasi ulang di lingkungan ini).

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +17 baris (tambah) | Tambah blok `<div class="keu-fab" id="shopFab">...</div>` di dalam `#page-shop`, setelah `.cn-tabs`, sebelum `#shopTab-kasir`. Isi: 2 tombol aksi (reuse `openOrderModal()`/`openProductModal()`) + 1 tombol utama toggle. **Reuse class CSS `.keu-fab*` dari Tahap 1, tidak ada class baru.** Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +17 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan oleh `scripts/build.js` (tidak dijalankan). |
| `styles.css` | Diubah | +5 baris (tambah) | 1 rule baru `#page-shop .keu-fab{bottom:150px;}` (override posisi aditif, mencegah tumpang tindih dgn `.kasir-floatbar`) + komentar. Rule `.keu-fab` asli (Tahap 1) tidak diubah nilainya. **Tidak ada class `.shop-fab*` baru.** |
| `tests/shop-fab.test.js` | **Baru** | 114 baris | 16 test struktural: keberadaan & posisi `#shopFab` relatif terhadap `#page-shop`/`#shopTab-kasir`, reuse class `.keu-fab*` (bukan class baru), reuse `openOrderModal()`/`openProductModal()`, reuse `data-onclick` (bukan `data-action`), parity `index.html` vs `app_production.html`, guard tidak ada `.shop-fab` di CSS, guard rule `.keu-fab` asli tidak berubah, serta guard eksplisit `cobek-io.js`, `cobek-tx-cart.js`, dan `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) tidak disentuh. |
| `SHOP-2.0.md` | **Baru** | — | Dokumentasi audit, fungsi/komponen yang di-reuse, FAB, responsive, design token, file yang berubah, dan alasan business logic tidak disentuh (deliverable Sprint 2 Tahap 2). |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 2 ditambahkan di akhir file (aditif, entry sebelumnya tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

**Total perubahan kode**: 3 file diubah + 1 file test baru = 4 file
kode (batas 5). Total baris markup/CSS: 39 baris (batas ±350).

## File yang TIDAK berubah (ditegaskan)

- Hero Dashboard, Dashboard, Dashboard Analytics — 0 baris berubah.
- Halaman Keuangan & FAB-nya (Sprint 2 Tahap 1) — 0 baris berubah.
- Seluruh isi Halaman Shop yang sudah ada sebelum Tahap ini (Kasir AI,
  Manual, Etalase, Produsen, Riwayat, Pelanggan) — 0 baris berubah,
  tetap tampil & berfungsi seperti sebelumnya.
- `cobek-io.js` (`openOrderModal`, `setShopTab`), `cobek-tx-cart.js`
  (`openProductModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY`, ADR-001, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1299
# pass 1299
# fail 0
```

(Baseline Sprint 2 Tahap 1 terverifikasi ulang di lingkungan ini:
1283/1283 PASS. 16 test baru ditambahkan murni aditif, 0 test lama
gagal/dihapus/diubah.)

---

# FILES-CHANGED — Sprint 2 Tahap 3: FAB Halaman Car Notes (Car Notes 2.0)

Baseline: Sprint 2 Tahap 2 selesai, `node --test` 1299/1299 PASS
(diverifikasi ulang di lingkungan ini).

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +19 baris (tambah) | Tambah blok `<div class="keu-fab" id="carNotesFab">...</div>` di dalam `#page-carnotes`, setelah `.cn-tabs`, sebelum komentar `<!-- BBM TAB -->`. Isi: 2 tombol aksi (reuse `openBbmModal()`/`openServisModal()`) + 1 tombol utama toggle. **Reuse class CSS `.keu-fab*` dari Tahap 1, tidak ada class baru.** Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +19 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan oleh `scripts/build.js` (tidak dijalankan). |
| `tests/car-notes-fab.test.js` | **Baru** | 122 baris | 17 test struktural: keberadaan & posisi `#carNotesFab` relatif terhadap `#page-carnotes`/`#cnTab-bbm`/`#cnTab-servis`, reuse class `.keu-fab*` (bukan class baru), reuse `openBbmModal()`/`openServisModal()`, reuse `data-onclick` (bukan `data-action`), parity `index.html` vs `app_production.html`, guard tidak ada class CSS baru & tidak ada override posisi baru di `styles.css`, serta guard eksplisit `vehicle-core.js`, `sparepart-servis.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`), dan `dashboard-hub.js` tidak disentuh. |
| `CAR-NOTES-2.0.md` | **Baru** | — | Dokumentasi audit, fungsi/komponen yang di-reuse, FAB, responsive, design token, file yang berubah, dan alasan business logic tidak disentuh (deliverable Sprint 2 Tahap 3). |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 3 ditambahkan di akhir file (aditif, entry sebelumnya tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

**Total perubahan kode**: 2 file diubah + 1 file test baru = 3 file
kode (batas 5). `styles.css` **tidak disentuh** (tidak dibutuhkan
override posisi, berbeda dari Tahap 2).

## File yang TIDAK berubah (ditegaskan)

- Hero Dashboard, Dashboard, Dashboard Analytics — 0 baris berubah.
- Halaman Keuangan & FAB-nya (Tahap 1), Halaman Shop & FAB-nya
  (Tahap 2) — 0 baris berubah.
- Seluruh isi Halaman Car Notes yang sudah ada sebelum Tahap ini (tab
  BBM & Servis, spesifikasi kendaraan, pajak/SIM, sparepart, stok,
  import data) — 0 baris berubah, tetap tampil & berfungsi seperti
  sebelumnya.
- `styles.css` — **tidak disentuh sama sekali**.
- `vehicle-core.js` (`openBbmModal`, `setCnTab`), `sparepart-servis.js`
  (`openServisModal`) — 0 baris berubah; hanya dipanggil ulang (reuse)
  dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic kendaraan, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1316
# pass 1316
# fail 0
```

(Baseline Sprint 2 Tahap 2 terverifikasi ulang di lingkungan ini:
1299/1299 PASS. 17 test baru ditambahkan murni aditif, 0 test lama
gagal/dihapus/diubah.)

---

# FILES-CHANGED — Sprint 2 Tahap 4: FAB Halaman Laporan (Reports 2.0)

Baseline: Sprint 2 Tahap 3 selesai, `node --test` 1316/1316 PASS
(diverifikasi ulang di lingkungan ini).

| File | Jenis | Ukuran perubahan | Keterangan |
|---|---|---|---|
| `index.html` | Diubah | +20 baris (tambah) | Tambah blok `<div class="keu-fab" id="laporanFab">...</div>` di dalam `#keuanganTab-laporan` (bukan di luar seperti `#keuFab`), tepat setelah pembukaan div-nya, sebelum `.page-settings-btn`. Isi: 2 tombol aksi (reuse `exportLaporanPDF()`/`exportCSV()`) + 1 tombol utama toggle. **Reuse class CSS `.keu-fab*` dari Tahap 1, tidak ada class baru.** `#keuFab` (Tahap 1) tidak diubah. Tidak ada elemen lama dipindah/dihapus/diubah. |
| `app_production.html` | Diubah (manual, disinkronkan) | +20 baris (tambah) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong) — bukan oleh `scripts/build.js` (tidak dijalankan). |
| `styles.css` | Diubah | +7 baris (tambah) | 1 rule baru `#keuanganTab-laporan .keu-fab{bottom:170px;}` (override posisi aditif, mencegah tumpang tindih dgn `#keuFab` saat tab Laporan aktif) + komentar. Rule `.keu-fab` asli (Tahap 1) & override Shop (Tahap 2) tidak diubah nilainya. **Tidak ada class `.laporan-fab*`/`.reports-fab*` baru.** |
| `tests/laporan-fab.test.js` | **Baru** | 142 baris | 20 test struktural: keberadaan & posisi `#laporanFab` relatif terhadap `#keuanganTab-laporan`/`#page-keuangan`, penempatan kontekstual (di dalam tab, beda dari `#keuFab` yang di luar), reuse class `.keu-fab*` (bukan class baru), reuse `exportLaporanPDF()`/`exportCSV()`, reuse `data-onclick` (bukan `data-action`), parity `index.html` vs `app_production.html`, guard tidak ada class CSS baru & guard override posisi di CSS, serta guard eksplisit `tx-list-cashflow.js`, `features-aiwidget-reminder-gdrive-search.js`, `backup-restore.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`), dan `dashboard-hub.js` tidak disentuh. |
| `REPORTS-2.0.md` | **Baru** | — | Dokumentasi audit, keputusan desain FAB kontekstual, fungsi/komponen yang di-reuse, FAB, responsive, design token, file yang berubah, dan alasan business logic tidak disentuh (deliverable Sprint 2 Tahap 4). |
| `CHANGELOG.md` | Diubah | ditambah section baru | Entry Sprint 2 Tahap 4 ditambahkan di akhir file (aditif, entry sebelumnya tidak diubah). |
| `FILES-CHANGED.md` | Diubah | ditambah section baru | Dokumen ini. |

**Total perubahan kode**: 3 file diubah + 1 file test baru = 4 file
kode (batas 5). Total baris markup/CSS: 47 baris (batas ±350).

## File yang TIDAK berubah (ditegaskan)

- Hero Dashboard, Dashboard, Dashboard Analytics — 0 baris berubah.
- Halaman Shop & FAB-nya (Tahap 2), Halaman Car Notes & FAB-nya
  (Tahap 3) — 0 baris berubah.
- `#keuFab` (Tahap 1) dan seluruh isi tab Kelola & Laporan yang sudah
  ada sebelum Tahap ini — 0 baris berubah, tetap tampil & berfungsi
  seperti sebelumnya.
- `tx-list-cashflow.js` (`setKeuanganTab`),
  `features-aiwidget-reminder-gdrive-search.js` (`exportLaporanPDF`),
  `backup-restore.js` (`exportCSV`) — 0 baris berubah; hanya dipanggil
  ulang (reuse) dari lokasi baru.
- `FEATURE_REGISTRY` (`dashboard-hub-registry.js`), `dashboard-hub.js`,
  ADR-001, business logic, routing, database.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`,
  `docs/FILE-MAP.md`, versi aplikasi, `package.json`.
- `scripts/build.js` — **tidak dijalankan**.

## Hasil test

```
node --test
# tests 1335
# pass 1335
# fail 0
```

(Baseline Sprint 2 Tahap 3 terverifikasi ulang di lingkungan ini:
1316/1316 PASS. 20 test baru ditambahkan murni aditif, 0 test lama
gagal/dihapus/diubah.)

# Files Changed — Tahap 10

ROADMAP-v1.1.md item #2 (High Priority): exit/closing animation
overlay & bottom sheet. Lihat `MODAL-EXIT-ANIMATION.md` untuk detail.

| File | Jenis | Ringkasan |
|---|---|---|
| `styles.css` | Diubah (aditif) | +2 keyframes (`overlayOut`, `slideDown`) + 2 rule (`.overlay.closing`/`.calc-overlay.closing` dan turunan `.modal`/`.calc-modal`-nya), 100% token durasi/easing yang sudah ada. |
| `modal-navigasi.js` | Diubah (aditif) | `closeModal()`: tunda lepas `.open` lewat `animationend`+fallback `setTimeout`, + guard re-open cepat & id modal tidak ditemukan. `openModal()`: +1 baris `classList.remove('closing')`. |
| `tests/modal-close-animation.test.js` | Baru | 10 test (7 DOM struktural, 3 CSS struktural). |
| `MODAL-EXIT-ANIMATION.md` | Baru | Dokumentasi deliverable Tahap 10. |
| `CHANGELOG.md` | Diubah | Entry Tahap 10 (aditif). |
| `KNOWN-ISSUES.md` | Diubah | §5.1 ditandai selesai. |
| `ROADMAP-v1.1.md` | Diubah | Item #2 High Priority ditandai selesai. |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

Total file kode yang berubah: **2** (`styles.css`, `modal-navigasi.js`).
Tidak menyentuh `index.html`/`app_production.html` (sudah memuat kedua
file di atas apa adanya), `app-bundle-*.min.js`, `sw.js`,
`scripts/build.js`, `package.json`, `dashboard-hub-registry.js`
(`FEATURE_REGISTRY`), atau file business logic mana pun.

# Files Changed — Sprint 3 Tahap 3.1 (AI Command Center Foundation)

Baseline diverifikasi ulang langsung dari repository (bukan klaim sesi
sebelumnya): `node --test` 1384/1384 PASS sebelum tahap ini dimulai.
Lihat `AI-COMMAND-CENTER-FOUNDATION.md` untuk detail lengkap.

| File | Jenis | Ringkasan |
|---|---|---|
| `ai-command-center.js` | Baru | Registry `AICommandCenter` (register/unregister/get/execute/clear command), murni logic, tanpa DOM, tanpa command bawaan. |
| `tests/ai-command-center.test.js` | Baru | 14 test baru. |
| `scripts/build.js` | Diubah (+1 baris) | Daftarkan `ai-command-center.js` ke `GROUP_B`. Logic build.js tidak diedit. |
| `AI-COMMAND-CENTER-FOUNDATION.md` | Baru | Dokumentasi deliverable Tahap 3.1. |
| `CHANGELOG.md` | Diubah | Entry Sprint 3 Tahap 3.1 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

Total file kode yang berubah: **3** (`ai-command-center.js`,
`tests/ai-command-center.test.js`, `scripts/build.js`).
Tidak menyentuh `FEATURE_REGISTRY` (`dashboard-hub-registry.js`),
Dashboard V2, business logic modul manapun, `index.html`/
`app_production.html`, `sw.js`, `package.json`.

# Files Changed — RFC Dashboard V2 Migration Tahap V2.1 (Layout Foundation)

**PLANNING ONLY.** 0 file kode diubah — hanya dokumen RFC ditambahkan.

| File | Jenis | Ringkasan |
|---|---|---|
| `DASHBOARD-V2-MIGRATION-RFC.md` | Baru | Audit, dependency map, klasifikasi reusable, migration plan bertahap, risk assessment, daftar file proyeksi implementasi V2.1. |
| `CHANGELOG.md` | Diubah | Entry RFC (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

Total file kode yang berubah: **0**. Tidak ada implementasi — menunggu
persetujuan RFC sebelum Tahap V2.1 (5 komponen dormant, proyeksi 2 file
kode: `dashboard-v2-shell.js` + test-nya) dieksekusi.



# Files Changed — Tahap V2.1 (Dashboard V2 Shell — Layout Foundation)

Total file kode yang berubah: **3** (`dashboard-v2-shell.js`,
`tests/dashboard-v2-shell.test.js`, `scripts/build.js`). Total file
diubah non-kode: **2** (`styles.css` aditif, `CHANGELOG.md`). Total
file baru non-kode: **2** (`DASHBOARD-V2-SHELL.md`, `FILES-CHANGED.md`
entri ini). **0** perubahan `index.html`/`app_production.html`.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | **Baru** | `window.DashboardV2Shell` — `init()`/`render()`/`destroy()`. Scaffold 5 komponen layout dormant (Sidebar/Header V2/Main Content Container/Bottom Navigation V2/FAB V2), placeholder murni. Root container di-mount lewat JS (`createElement`/`appendChild` ke `document.body`), bukan markup HTML. |
| `tests/dashboard-v2-shell.test.js` | Baru | 15 test baru (API, lifecycle idempotent, struktur placeholder, regresi isolasi dari `FEATURE_REGISTRY`/`showPage()`/`.nav-item`/`#mainNav`/Dashboard Hub/HTML). |
| `scripts/build.js` | Diubah (+1 baris) | Daftarkan `dashboard-v2-shell.js` ke `GROUP_B`. |
| `styles.css` | Diubah (aditif) | Rule CSS baru namespace `dashboard-v2-*`, 100% reuse token existing, breakpoint Sidebar desktop-only. |
| `DASHBOARD-V2-SHELL.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.1 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- `index.html`, `app_production.html` — 0 baris disentuh (diverifikasi
  test: tidak ada string `dashboard-v2-`/`dashboardV2`).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `modal-navigasi.js` (`showPage()`) — tidak disentuh.
- Business logic Finance/Vehicle/Reports/Shop/Hero Dashboard.
- `scripts/build.js` logic (hanya +1 baris daftar file).

## Hasil test

```
node --test
# tests 1414
# pass 1414
# fail 0
```

# Files Changed — Tahap V2.2 (Header V2 & Hero V2)

Total file kode yang berubah: **2** (`dashboard-v2-shell.js` diubah,
`tests/dashboard-v2-hero.test.js` baru). Total file diubah non-kode:
**2** (`styles.css` aditif, `CHANGELOG.md`). Total file baru non-kode:
**1** (`DASHBOARD-V2-HERO.md`). **0** perubahan `index.html`/
`app_production.html`/`scripts/build.js`.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Header V2: +4 sub-placeholder (greeting/search/notification/avatar). Main Content Container: sekarang membungkus Hero V2 (title/health score/balance/insight). Struktur top-level 5 komponen & API tidak berubah. |
| `tests/dashboard-v2-hero.test.js` | Baru | 12 test baru. |
| `styles.css` | Diubah (aditif) | Rule CSS sub-elemen Header V2 & Hero V2, 100% reuse token existing. |
| `DASHBOARD-V2-HERO.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.2 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `modal-navigasi.js` (`showPage()`), `ai-command-center.js`
  (`AICommandCenter`) — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan (shell
  sudah terdaftar sejak V2.1).
- `tests/dashboard-v2-shell.test.js` (V2.1) — tidak diubah, tetap 100%
  lulus (dijalankan ulang sbg bukti tidak ada regresi).

## Hasil test

```
node --test
# tests 1426
# pass 1426
# fail 0
```

# Files Changed — Tahap V2.3 (Summary Cards & Quick Actions)

Baseline: `node --test` 1426/1426 PASS (akhir Tahap V2.2), diverifikasi
`diff -rq` — hanya 3 file berubah/baru pada tahap ini.

Total file kode yang berubah: **2** (`dashboard-v2-shell.js` diubah,
`tests/dashboard-v2-hero.test.js` disesuaikan). Total file baru: **2**
(`tests/dashboard-v2-summary.test.js`, `DASHBOARD-V2-SUMMARY.md`).
Total file diubah non-kode: **1** (`CHANGELOG.md`). **0** perubahan
`index.html`/`app_production.html`/`styles.css`/`scripts/build.js`.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Main Content Container sekarang membungkus 3 anak: Hero V2 (tidak berubah) + Summary Cards (baru, 4 kartu) + Quick Actions (baru, 4 tombol `disabled`). Struktur top-level 5 komponen & API tidak berubah. |
| `tests/dashboard-v2-summary.test.js` | Baru | 13 test baru. |
| `tests/dashboard-v2-hero.test.js` | Diubah (penyesuaian) | 1 assersi diperbarui (Main kini py 3 anak, bukan 1) — bukan perubahan perilaku, murni menyesuaikan test lama dgn struktur baru yg disengaja. |
| `DASHBOARD-V2-SUMMARY.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.3 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (Summary Cards/Quick Actions tahap ini
  murni struktur DOM, tanpa styling baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan (shell
  sudah terdaftar sejak V2.1).
- `tests/dashboard-v2-shell.test.js` (V2.1, 15 test) — tidak diubah,
  tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.2) dan hasil akhir
tahap ini: **hanya 3 file di atas** yang berubah/baru, tidak ada file
lain yang tersentuh.

## Hasil test

```
node --test
# tests 1439
# pass 1439
# fail 0
```

# Files Changed — Tahap V2.4 (Module Grid & Insight Panel)

Baseline: `node --test` 1439/1439 PASS (akhir Tahap V2.3), diverifikasi
`diff -rq`.

Total file kode yang berubah: **2** (`dashboard-v2-shell.js` diubah,
`tests/dashboard-v2-summary.test.js` diperbarui). Total file baru: **0**
kode/test (test tambahan digabung ke file V2.3 yg sudah ada). **0**
perubahan `index.html`/`app_production.html`/`styles.css`/
`scripts/build.js`. (Catatan: `CHANGELOG.md`/`FILES-CHANGED.md`/dokumen
V2.4 baru ditambahkan belakangan, digabung ke entry ini karena tahap
V2.4 sebelumnya berjalan dgn instruksi eksplisit "jangan dokumentasi".)

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Main Content Container membungkus 2 anak baru: Module Grid (6 kartu) + Insight Panel (3 insight item), sesudah Quick Actions. Struktur top-level & API tidak berubah. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi lama diperbaiki (Main kini 5 anak, bukan 3) + 6 test baru (Module Grid, Insight Panel, dormant, regresi). |

## File yang TIDAK berubah (ditegaskan)

- `index.html`, `app_production.html`, `styles.css` — tidak disentuh.
- `dashboard-hub.js`, `FEATURE_REGISTRY`, `AICommandCenter` — tidak
  disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2) — tidak diubah, tetap 100% lulus.

## Hasil test

```
node --test
# tests 1445
# pass 1445
# fail 0
```

# Files Changed — Tahap V2.5 (Sidebar Navigation & Bottom Navigation V2 items)

Baseline: `node --test` 1445/1445 PASS (akhir Tahap V2.4), diverifikasi
`diff -rq` — hanya 2 file berubah/baru pada tahap ini.

Total file kode yang berubah: **1** (`dashboard-v2-shell.js` diubah).
Total file baru: **1** (`tests/dashboard-v2-navigation.test.js`). Total
file diubah non-kode: **2** (`CHANGELOG.md`, `FILES-CHANGED.md`). Total
file baru non-kode: **1** (`DASHBOARD-V2-NAVIGATION.md`). **0**
perubahan `index.html`/`app_production.html`/`styles.css`/
`scripts/build.js`.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | `render()` di-refactor memanggil `_buildSidebar()`/`_buildBottomNav()` (method baru) alih-alih teks polos inline. Sidebar: +5 item navigasi `disabled` (Dashboard/Finance/Vehicle/Reports/Settings). Bottom Nav: +4 item navigasi `disabled` (Home/Finance/Vehicle/More). Struktur top-level & API tidak berubah. |
| `tests/dashboard-v2-navigation.test.js` | Baru | 10 test baru. |
| `DASHBOARD-V2-NAVIGATION.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.4 + V2.5 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan)

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (item navigasi tahap ini murni struktur
  DOM, tanpa styling baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-summary.test.js` (V2.3/V2.4) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.4) dan hasil akhir
tahap ini: **hanya 2 file kode/test di atas** yang berubah/baru.

## Hasil test

```
node --test
# tests 1456
# pass 1456
# fail 0
```

## Tahap V2.6 — Recent Activity

Baseline: akhir Tahap V2.5 (`tests 1456 / pass 1456 / fail 0`).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildRecentActivity()` (5 item placeholder), di-wire ke `_buildMain()` sbg anak ke-6. `_buildMain()` sekarang menghasilkan 6 anak alih-alih 5. Header comment Tahap V2.6 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-activity.test.js` | Baru | 11 test baru untuk Recent Activity. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 5 → 6 (tidak ada assersi lain yg terdampak). |
| `DASHBOARD-V2-ACTIVITY.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.6 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.6

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (item aktivitas tahap ini murni
  struktur DOM, tanpa styling baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.5) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1467
# pass 1467
# fail 0
```

## Tahap V2.7 — Statistics Panel

Baseline: akhir Tahap V2.6 (`tests 1467 / pass 1467 / fail 0`).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildStatisticsPanel()` (4 kartu statistik placeholder, tiap kartu `<button disabled>` berisi 4 sub-elemen icon/title/value/trend), di-wire ke `_buildMain()` sbg anak ke-7. `_buildMain()` sekarang menghasilkan 7 anak alih-alih 6. Header comment Tahap V2.7 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-statistics.test.js` | Baru | 13 test baru untuk Statistics Panel. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 6 → 7 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 6 → 7 (assersi lain di file ini tidak terdampak). |
| `DASHBOARD-V2-STATISTICS.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.7 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.7

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (kartu statistik tahap ini murni
  struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-statistics-*` disiapkan mengikuti konvensi existing,
  belum ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.6) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1480
# pass 1480
# fail 0
```

## Tahap V2.8 — Upcoming Tasks

Baseline: akhir Tahap V2.7 (`tests 1480 / pass 1480 / fail 0`).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildUpcomingTasks()` (5 kartu tugas placeholder, tiap kartu `<button disabled>` berisi 4 sub-elemen icon/title/due date/status), di-wire ke `_buildMain()` sbg anak ke-8. `_buildMain()` sekarang menghasilkan 8 anak alih-alih 7. Header comment Tahap V2.8 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-upcoming.test.js` | Baru | 13 test baru untuk Upcoming Tasks. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 7 → 8 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 7 → 8 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 7 → 8 (assersi lain di file ini tidak terdampak). |
| `DASHBOARD-V2-UPCOMING.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.8 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.8

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (kartu tugas tahap ini murni struktur
  DOM, tanpa styling baru; namespace class
  `dashboard-v2-upcoming-task-*` disiapkan mengikuti konvensi existing,
  belum ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.7) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1493
# pass 1493
# fail 0
```

## Tahap V2.9 — Notifications Center

Baseline: akhir Tahap V2.8 (`tests 1493 / pass 1493 / fail 0`).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildNotifications()` (5 kartu notifikasi placeholder, tiap kartu `<button disabled>` berisi 4 sub-elemen icon/title/description/timestamp), di-wire ke `_buildMain()` sbg anak ke-9. `_buildMain()` sekarang menghasilkan 9 anak alih-alih 8. Header comment Tahap V2.9 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-notifications.test.js` | Baru | 13 test baru untuk Notifications Center. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 8 → 9 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 8 → 9 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 8 → 9 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 8 → 9 (assersi lain di file ini tidak terdampak). |
| `DASHBOARD-V2-NOTIFICATIONS.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.9 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.9

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (kartu notifikasi tahap ini murni
  struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-notification-*` disiapkan mengikuti konvensi existing,
  belum ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `AICommandCenter` — tidak disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.8) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1506
# pass 1506
# fail 0
```

## Tahap V2.10 — AI Command Center UI

Baseline: akhir Tahap V2.9 (`tests 1506 / pass 1506 / fail 0`).

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildAiCommandCenter()` (1 search field readonly + 4 kartu aksi `<button disabled>` + 1 area saran statis), di-wire ke `_buildMain()` sbg anak ke-10. `_buildMain()` sekarang menghasilkan 10 anak alih-alih 9. Header comment Tahap V2.10 ditambahkan. Identifier kode memakai `AiCommandCenter` (bukan `AICommandCenter`) supaya tidak collide string dgn modul `AICommandCenter` existing. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-ai.test.js` | Baru | 14 test baru untuk AI Command Center UI. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 9 → 10 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 9 → 10 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 9 → 10 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 9 → 10 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-notifications.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 9 → 10 (assersi lain di file ini tidak terdampak). |
| `DASHBOARD-V2-AI.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.10 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.10

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (search field/kartu aksi/area saran
  tahap ini murni struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-ai-*` disiapkan mengikuti konvensi existing, belum ada
  deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `ai-command-center.js` (`AICommandCenter` existing) — tidak
  disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.9) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1520
# pass 1520
# fail 0
```

---

# Tahap V2.11 — Dashboard V2 – Health Score Widget

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildHealthScore()` (1 circular score placeholder + 1 subtitle statis + 4 kartu metrik `<button disabled>` berisi icon/title/status), di-wire ke `_buildMain()` sbg anak ke-11. `_buildMain()` sekarang menghasilkan 11 anak alih-alih 10. Header comment Tahap V2.11 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-health.test.js` | Baru | 13 test baru untuk Health Score Widget. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 10 → 11 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 10 → 11 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 10 → 11 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 10 → 11 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-notifications.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 10 → 11 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-ai.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 10 → 11 (assersi lain di file ini tidak terdampak, termasuk assersi anak ke-10 AI Command Center yg tetap benar). |
| `DASHBOARD-V2-HEALTH.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.11 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.11

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (score circle/subtitle/kartu metrik
  tahap ini murni struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-health-*` disiapkan mengikuti konvensi existing, belum
  ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `ai-command-center.js` (`AICommandCenter` existing) — tidak
  disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.10) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1533
# pass 1533
# fail 0
```

---

# Tahap V2.12 — Dashboard V2 – Predictive Insights

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildPredictiveInsights()` (5 kartu insight prediktif `<button disabled>` berisi icon/title/prediction/confidence/recommendation), di-wire ke `_buildMain()` sbg anak ke-12. `_buildMain()` sekarang menghasilkan 12 anak alih-alih 11. Header comment Tahap V2.12 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-predictive.test.js` | Baru | 11 test baru untuk Predictive Insights. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 11 → 12 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-notifications.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-ai.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-health.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 11 → 12 (assersi lain di file ini tidak terdampak, termasuk assersi anak ke-11 Health Score yg tetap benar). |
| `DASHBOARD-V2-PREDICTIVE.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.12 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.12

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (kartu insight tahap ini murni
  struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-predictive-*` disiapkan mengikuti konvensi existing,
  belum ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `ai-command-center.js` (`AICommandCenter` existing) — tidak
  disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.11) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1544
# pass 1544
# fail 0
```

---

# Tahap V2.13 — Dashboard V2 – Automation Center

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif) | Method baru `_buildAutomationCenter()` (5 kartu automation `<button disabled>` berisi icon/title/schedule/status/description), di-wire ke `_buildMain()` sbg anak ke-13. `_buildMain()` sekarang menghasilkan 13 anak alih-alih 12. Header comment Tahap V2.13 ditambahkan. Struktur top-level & API `init()`/`render()`/`destroy()` tidak berubah. |
| `tests/dashboard-v2-automation.test.js` | Baru | 11 test baru untuk Automation Center. |
| `tests/dashboard-v2-summary.test.js` | Diubah | 2 assersi jumlah anak Main disesuaikan dari 12 → 13 (tidak ada assersi lain yg terdampak). |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-statistics.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-notifications.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-ai.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-health.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak). |
| `tests/dashboard-v2-predictive.test.js` | Diubah | 1 assersi jumlah anak Main (test idempotensi) disesuaikan dari 12 → 13 (assersi lain di file ini tidak terdampak, termasuk assersi anak ke-12 Predictive Insights yg tetap benar). |
| `DASHBOARD-V2-AUTOMATION.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.13 (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.13

- `index.html`, `app_production.html` — tetap 0 markup Dashboard V2.
- `styles.css` — tidak disentuh (kartu automation tahap ini murni
  struktur DOM, tanpa styling baru; namespace class
  `dashboard-v2-automation-*` disiapkan mengikuti konvensi existing,
  belum ada deklarasi CSS baru).
- `dashboard-hub.js`, `dashboard-hub-registry.js` (`FEATURE_REGISTRY`),
  `ai-command-center.js` (`AICommandCenter` existing) — tidak
  disentuh/tidak direferensikan.
- `scripts/build.js` — tidak ada file baru yg perlu didaftarkan.
- `tests/dashboard-v2-shell.test.js` (V2.1), `tests/dashboard-v2-hero.test.js`
  (V2.2), `tests/dashboard-v2-navigation.test.js` (V2.5) — tidak
  diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.12) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1555
# pass 1555
# fail 0
```

## Tahap V2.14A — Dashboard V2 Activation Framework

| File | Status | Perubahan |
|---|---|---|
| `dashboard-v2-activation.js` | Baru | Feature flag internal in-memory: `isDashboardV2Enabled()` (default `false`), `enableDashboardV2()`, `disableDashboardV2()` (keduanya idempotent). Tidak baca/tulis `FEATURE_REGISTRY`, tidak memanggil `showPage()`, tidak menyentuh DOM, tidak meng-instantiate `DashboardV2Shell`, tidak menghubungkan data. |
| `tests/dashboard-v2-activation.test.js` | Baru | 11 test baru untuk Dashboard V2 Activation Framework. |
| `scripts/build.js` | Diubah (aditif) | Mendaftarkan `dashboard-v2-activation.js` di daftar bundle, setelah `dashboard-v2-shell.js`. |
| `DASHBOARD-V2-ACTIVATION.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.14A (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.14A

- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak dibaca/ditulis/direferensikan.
- `dashboard-hub.js`, `index.html`, `app_production.html` — tidak disentuh sama sekali.
- `dashboard-v2-shell.js` (`DashboardV2Shell`) — tidak dimodifikasi, tidak dipanggil/di-instantiate oleh modul baru.
- Seluruh business logic (`D.*`) dan routing (`showPage()`) — tidak disentuh/tidak dipanggil.
- Seluruh test suite V2.1–V2.13 (`tests/dashboard-v2-*.test.js` lainnya) — tidak diubah, tetap 100% lulus.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.13) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1566
# pass 1566
# fail 0
```

## Tahap V2.14B — Dashboard V2 Activation Wiring (render, baca-saja)

| File | Status | Perubahan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah (aditif, baca-saja) | `render()` membaca `isDashboardV2Enabled()` (guard `typeof`, fallback dormant kalau tidak ter-load), lalu toggle atribut `hidden`/`data-dashboard-v2-state` root (`dormant` ↔ `active`). Struktur top-level & API tidak berubah. |
| `tests/dashboard-v2-activation-render.test.js` | Baru | 11 test baru untuk wiring render() ↔ activation flag. |
| `DASHBOARD-V2-ACTIVATION-RENDER.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.14B (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.14B

- `dashboard-v2-activation.js` (V2.14A) — tidak disentuh sama sekali.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak dibaca/ditulis/direferensikan.
- `dashboard-hub.js`, `index.html`, `app_production.html` — tidak disentuh.
- Routing/`showPage()` — tidak dipanggil, tidak direferensikan di kode aktif.
- Business logic (`D.*`, Finance/Vehicle/AI) — tidak dibaca sama sekali.
- Tidak ada `fetch`, tidak ada state instance baru, tidak ada event listener baru.
- Seluruh test suite V2.1–V2.14A (`tests/dashboard-v2-*.test.js` lainnya) — tidak diubah, tetap 100% lulus tanpa modifikasi assertion.

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.14A) dan hasil akhir
tahap ini: hanya `dashboard-v2-shell.js` yang berubah, ditambah 3 file baru
(`tests/dashboard-v2-activation-render.test.js`,
`DASHBOARD-V2-ACTIVATION-RENDER.md`, dan entry di `CHANGELOG.md`/
`FILES-CHANGED.md`).

## Hasil test

```
node --test
# tests 1577
# pass 1577
# fail 0
```

## Tahap V2.14C — Dashboard V2 Mount (baca activation flag di DashboardHub.render())

| File | Status | Perubahan |
|---|---|---|
| `dashboard-hub.js` | Diubah (aditif, guarded) | `DashboardHub.render()` menambah 1 blok akhir: kalau `isDashboardV2Enabled()===true` dan `DashboardV2Shell` tersedia, panggil `DashboardV2Shell.init()` lalu `.render()`. No-op total kalau flag `false` (default). |
| `tests/dashboard-v2-shell.test.js` | Diubah | 1 assertion peninggalan ("`dashboard-hub.js` tidak mereferensikan `DashboardV2Shell`") diperbarui: sekarang menjamin referensi itu tepat 1x & di dalam guard `typeof`. |
| `tests/dashboard-v2-hero.test.js` | Diubah | idem. |
| `tests/dashboard-v2-activity.test.js` | Diubah | idem. |
| `tests/dashboard-v2-statistics.test.js` | Diubah | idem. |
| `tests/dashboard-v2-notifications.test.js` | Diubah | idem. |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | idem. |
| `tests/dashboard-v2-ai.test.js` | Diubah | idem. |
| `tests/dashboard-v2-health.test.js` | Diubah | idem. |
| `tests/dashboard-v2-predictive.test.js` | Diubah | idem. |
| `tests/dashboard-v2-automation.test.js` | Diubah | idem. |
| `tests/dashboard-v2-navigation.test.js` | Diubah | idem. |
| `tests/dashboard-v2-summary.test.js` | Diubah | idem. |
| `tests/dashboard-v2-mount.test.js` | Baru | 11 test baru untuk mount wiring `DashboardHub.render()` ↔ `DashboardV2Shell`. |
| `DASHBOARD-V2-MOUNT.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry Tahap V2.14C (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.14C

- `dashboard-v2-shell.js` (V2.1–V2.14B) — tidak disentuh.
- `dashboard-v2-activation.js` (V2.14A) — tidak disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak dibaca/ditulis dgn cara baru; hanya dibaca oleh kode lama yg sudah ada di atas blok mount.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic (`D.*`, Finance/Vehicle/Reports/AI) — tidak dibaca/diubah.
- Tidak ada `fetch` ditambahkan.
- 12 file test yang assertion-nya disesuaikan HANYA punya 1 assertion yg berubah per file (assertion lain tidak tersentuh).

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.14B) dan hasil akhir
tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1588
# pass 1588
# fail 0
```

## Tahap V2.14C+ — Guard Init-Once Dashboard V2 Mount

Baseline: hasil akhir V2.14C (`node --test` → 1588/1588 PASS).

Total file yang berubah: **2**. Total file baru: **2**. Total file
dihapus: **0**.

| File | Jenis | Baris berubah | Ringkasan |
|---|---|---|---|
| `dashboard-hub.js` | Diubah | +16 baris | Blok mount Dashboard V2 (V2.14C) di dalam `DashboardHub.render()` dibungkus guard init-once (`DashboardHub._dashHubV2Initialized`) — `init()` hanya dipanggil sekali, `render()` tetap dipanggil tiap kali. Tidak ada baris lain yang disentuh. |
| `tests/dashboard-v2-mount.test.js` | Diubah | 1 assertion | Assertion pada 1 test disesuaikan dari "init() ikut bertambah tiap render()" menjadi "init() tetap 1x, render() tetap bertambah" — mengikuti kontrak guard baru. Test lain di file ini tidak disentuh. |
| `tests/dashboard-v2-init-once.test.js` | Baru | +8 test | Test khusus utk guard init-once: sekali init walau render() berkali-kali, render() 1:1 dgn panggilan `DashboardHub.render()`, disable→enable tidak dobel init, siklus disable/enable berulang, Dashboard lama normal saat flag false, environment tanpa `DashboardV2Shell`, tidak memanggil `showPage()`, jaminan statis tidak memakai `FEATURE_REGISTRY`. |
| `DASHBOARD-V2-INIT-ONCE.md` | Baru | — | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | — | Entry tahap ini (aditif). |
| `FILES-CHANGED.md` | Diubah | — | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.14C+

- `dashboard-v2-shell.js`, `dashboard-v2-activation.js` — tidak disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic (`D.*`, Finance/Vehicle/Reports/AI) — tidak disentuh.
- Semua file test lain di `tests/` (selain 1 assertion di
  `dashboard-v2-mount.test.js` dan file baru `dashboard-v2-init-once.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir V2.14C) dan hasil
akhir tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.14D — Auto Destroy Dashboard V2 + Perbaikan Kontrak Test

Baseline: hasil akhir Tahap "Guard Init-Once" (`node --test` →
1596/1596 PASS).

Total file yang berubah: **14**. Total file baru: **1**. Total file
dihapus: **0**.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-hub.js` | Diubah | Blok auto-destroy baru di `DashboardHub.render()`, setelah guard init-once — `DashboardV2Shell.destroy()` dipanggil 1x saat flag balik false setelah pernah init, lalu `_dashHubV2Initialized` direset. |
| `tests/dashboard-v2-activity.test.js` | Diubah | 1 assertion: guard count 1x → 2x. |
| `tests/dashboard-v2-ai.test.js` | Diubah | idem. |
| `tests/dashboard-v2-automation.test.js` | Diubah | idem. |
| `tests/dashboard-v2-health.test.js` | Diubah | idem. |
| `tests/dashboard-v2-hero.test.js` | Diubah | idem. |
| `tests/dashboard-v2-mount.test.js` | Diubah | idem. |
| `tests/dashboard-v2-navigation.test.js` | Diubah | idem. |
| `tests/dashboard-v2-notifications.test.js` | Diubah | idem. |
| `tests/dashboard-v2-predictive.test.js` | Diubah | idem. |
| `tests/dashboard-v2-shell.test.js` | Diubah | idem. |
| `tests/dashboard-v2-statistics.test.js` | Diubah | idem. |
| `tests/dashboard-v2-summary.test.js` | Diubah | idem. |
| `tests/dashboard-v2-upcoming.test.js` | Diubah | idem. |
| `tests/dashboard-v2-init-once.test.js` | Diubah | Mock `DashboardV2Shell` ditambah `destroy()`; 2 test ditulis ulang mengikuti kontrak "init sekali per siklus aktivasi" + destroy; 1 test ditambah assertion `destroy === 0`. |
| `DASHBOARD-V2-AUTO-DESTROY.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry tahap ini (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.14D

- `dashboard-v2-shell.js` — tidak disentuh sama sekali.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic (`D.*`, Finance/Vehicle/Reports/AI) — tidak disentuh.
- Seluruh assertion LAIN di 13 file test yang diubah (hanya 1 assertion
  guard-count per file di 12 file kategori A yang berubah; hanya 2 test
  ditulis ulang + 1 assertion ditambah di `dashboard-v2-init-once.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap Guard
Init-Once) dan hasil akhir tahap ini: hanya file-file di atas yang
berubah/baru.

## Hasil test

```
node --test tests/dashboard-v2-init-once.test.js
# tests 8
# pass 8
# fail 0

node --test
# tests 1596
# pass 1596
# fail 0
```

## Tahap V2.15 — Dashboard V2 Activation Switch

Baseline: hasil akhir Tahap V2.14D — Auto Destroy (`node --test` →
1596/1596 PASS).

Total file yang berubah: **2**. Total file baru: **3**. Total file
dihapus: **0**.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-hub.js` | Diubah | Fungsi baru `_dashHubV2SwitchHtml()` (blok toggle UI, guard `typeof` atas 3 fungsi API aktivasi); `el.innerHTML` di `DashboardHub.render()` diprefix dengan hasil fungsi itu; method baru `DashboardHub.toggleDashboardV2()` (flip flag lewat `enableDashboardV2()`/`disableDashboardV2()` existing, lalu `DashboardHub.render()`). Tidak ada baris lain yang disentuh. |
| `tests/dashboard-v2-activation-switch.test.js` | Baru | 11 test mencakup: rendering switch (ada/tidaknya API, checkbox mengikuti flag, label teks), `toggleDashboardV2()` (arah flip enable/disable, `render()` tepat 1x, tidak memanggil `showPage()`, aman tanpa `DashboardV2Shell`, idempotent), dan jaminan statis tidak mereferensikan `FEATURE_REGISTRY`. |
| `DASHBOARD-V2-ACTIVATION-SWITCH.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry tahap ini (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.15

- `dashboard-v2-shell.js` — tidak disentuh sama sekali.
- `dashboard-v2-activation.js` — tidak disentuh; hanya fungsi publiknya
  (`isDashboardV2Enabled`/`enableDashboardV2`/`disableDashboardV2`) yang
  DIBACA/DIPANGGIL dari `dashboard-hub.js`.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic (`D.*`, Finance/Vehicle/Reports/AI) — tidak disentuh.
- Blok mount/init-once/auto-destroy (V2.14C/V2.14D) di `dashboard-hub.js`
  — persis sama, tidak ada baris yang diubah.
- **Seluruh file test lama** (92 file dari baseline V2.14D) — tidak satu
  pun diubah pada tahap ini; hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.14D) dan
hasil akhir tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test tests/dashboard-v2-activation-switch.test.js
# tests 11
# pass 11
# fail 0

node --test
# tests 1607
# pass 1607
# fail 0
```

## Tahap V2.16 — Dashboard V2 Data Adapter Layer

Baseline: hasil akhir Tahap V2.15 — Activation Switch (`node --test` →
1607/1607 PASS).

Total file yang berubah: **2**. Total file baru: **3**. Total file
dihapus: **0**.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-data-adapter.js` | Baru | Lapisan adapter read-only: `getFinanceSummary()`, `getVehicleSummary()`, `getFamilySummary()`, `getDocumentSummary()`. Guard `typeof D`, tanpa fetch, tanpa state baru, tanpa mutasi `D`, tanpa routing/`showPage()`/`FEATURE_REGISTRY`. Dashboard V2 belum memakainya. |
| `tests/dashboard-v2-data-adapter.test.js` | Baru | 18 test: perhitungan ringkasan per domain, data kosong/tidak lengkap, guard `D` tidak tersedia/`null`, jaminan read-only (Proxy `set`/`deleteProperty`), tidak menyentuh `document`/`showPage()`/`FEATURE_REGISTRY`, jaminan statis tanpa `let`/`var` top-level & tanpa referensi `fetch(`/`DashboardV2Shell`. |
| `DASHBOARD-V2-DATA-ADAPTER.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry tahap ini (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.16

- `dashboard-hub.js` — tidak disentuh sama sekali (beda dari tahap
  V2.14C–V2.15 yang selalu mengedit file ini).
- `dashboard-v2-shell.js`, `dashboard-v2-activation.js` — tidak
  disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  dan tidak direferensikan sama sekali oleh adapter baru.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; adapter hanya MEMBACA `D`, tidak
  pernah menulis.
- **Seluruh file test lama** (94 file dari baseline V2.15) — tidak
  satu pun diubah pada tahap ini; hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.15) dan
hasil akhir tahap ini: hanya file-file di atas yang berubah/baru.

## Hasil test

```
node --test tests/dashboard-v2-data-adapter.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1625
# pass 1625
# fail 0
```

## Tahap V2.17 — Dashboard V2 Hero Data Integration

Baseline: hasil akhir Tahap V2.16 — Dashboard V2 Data Adapter Layer
(`node --test` → 1625/1625 PASS).

Total file yang berubah: **1**. Total file baru: **2**. Total file
dihapus: **0**.

| File | Jenis | Ringkasan |
|---|---|---|
| `dashboard-v2-shell.js` | Diubah | `_buildHero()` (satu-satunya fungsi disentuh) menambah 4 elemen anak baru (Finance/Vehicle/Family/Document summary) yang membaca `dashboard-v2-data-adapter.js` lewat guard `typeof fn === 'function'`, fallback placeholder kalau adapter tidak tersedia/`null`. 4 elemen Hero lama (V2.2) & seluruh sub-komponen Main lain (Summary Cards dst) tidak diubah. |
| `tests/dashboard-v2-hero-data.test.js` | Baru | 17 test: fallback placeholder (adapter tidak di-load / return `null`), elemen lama tidak berubah, ringkasan sungguhan per fungsi adapter (mock), integrasi sungguhan (adapter asli + `D` tiruan), idempotency, aksesibilitas, constraint statis (tanpa fetch/showPage/FEATURE_REGISTRY/`D.` langsung/innerHTML, adapter tetap tidak berubah, guard `typeof` di ke-4 fungsi). |
| `DASHBOARD-V2-HERO-DATA.md` | Baru | Dokumentasi deliverable tahap ini. |
| `CHANGELOG.md` | Diubah | Entry tahap ini (aditif). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini. |

## File yang TIDAK berubah (ditegaskan) — Tahap V2.17

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16 & test tanda tangan API (4 fungsi publik yang sama,
  tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Hero — Summary Cards, Module Grid, Insight
  Panel, Recent Activity, Statistics Panel, Upcoming Tasks, Notifications
  Center, AI Command Center, Health Score Widget, Predictive Insights,
  Automation Center — 0 baris tersentuh (hanya `_buildHero()` yang
  diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (95 file dari baseline V2.16) — tidak
  satu pun diubah pada tahap ini; hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.16) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-hero-data.test.js` (baru) + `DASHBOARD-V2-HERO-
DATA.md` (baru) + `CHANGELOG.md`/`FILES-CHANGED.md` (diubah, aditif)
yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-hero-data.test.js
# tests 17
# pass 17
# fail 0

node --test
# tests 1642
# pass 1642
# fail 0
```

## Tahap V2.18 — Summary Cards Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam `_buildSummaryCards()`
  (4 elemen data summary baru ditambah sbg anak Summary Cards, mengikuti
  pola persis `_buildHero()` V2.17). Tidak ada fungsi lain yang disentuh.
- `tests/dashboard-v2-summary.test.js` — 2 assertion lama
  (`cards.children.length`) diperbaiki dari `4` ke `8`, satu-satunya
  alasan: jumlah anak Summary Cards berubah akibat penambahan additive.
- `tests/dashboard-v2-summary-data.test.js` — file test baru (18 test).
- `DASHBOARD-V2-SUMMARY-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17 & test tanda tangan API (4 fungsi publik yang
  sama, tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Summary Cards — Hero, Quick Actions, Module
  Grid, Insight Panel, Recent Activity, Statistics Panel, Upcoming
  Tasks, Notifications Center, AI Command Center, Health Score Widget,
  Predictive Insights, Automation Center — 0 baris tersentuh (hanya
  `_buildSummaryCards()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.17) — tidak satu pun diubah
  selain 2 assertion di `tests/dashboard-v2-summary.test.js` (jumlah
  child berubah dari penambahan additive); hanya 1 file test baru
  ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.17) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-summary.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (baru) +
`DASHBOARD-V2-SUMMARY-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-summary-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1660
# pass 1660
# fail 0
```

## Tahap V2.19 — Module Grid Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam `_buildModuleGrid()`
  (4 elemen data summary baru ditambah sbg anak Module Grid, mengikuti
  pola persis `_buildHero()` V2.17 & `_buildSummaryCards()` V2.18).
  Tidak ada fungsi lain yang disentuh.
- `tests/dashboard-v2-summary.test.js` — 2 assertion lama
  (`moduleGrid.children.length`/`grid.children.length`) diperbaiki dari
  `6` ke `10`, satu-satunya alasan: jumlah anak Module Grid berubah
  akibat penambahan additive.
- `tests/dashboard-v2-summary-data.test.js` — 1 assertion constraint
  (guard-count per fungsi adapter) diperbaiki dari `2x` ke `3x`, karena
  Module Grid menambah 1 titik pemanggilan guard baru per fungsi.
- `tests/dashboard-v2-module-grid-data.test.js` — file test baru (18
  test).
- `DASHBOARD-V2-MODULE-GRID-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18 & test tanda tangan API (4 fungsi publik
  yang sama, tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Module Grid — Hero, Summary Cards, Quick
  Actions, Insight Panel, Recent Activity, Statistics Panel, Upcoming
  Tasks, Notifications Center, AI Command Center, Health Score Widget,
  Predictive Insights, Automation Center — 0 baris tersentuh (hanya
  `_buildModuleGrid()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh.
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.18) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-summary.
  test.js` dan 1 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js` (keduanya akibat penambahan additive); hanya 1 file
  test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.18) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-summary.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (baru) +
`DASHBOARD-V2-MODULE-GRID-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-module-grid-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1678
# pass 1678
# fail 0
```

## Tahap V2.20 — Statistics Panel Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildStatisticsPanel()` (4 elemen data summary baru ditambah sbg
  anak Statistics Panel, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18 & `_buildModuleGrid()` V2.19). Tidak ada
  fungsi lain yang disentuh.
- `tests/dashboard-v2-statistics.test.js` — 2 assertion lama
  (`panel.children.length`) diperbaiki dari `4` ke `8`, satu-satunya
  alasan: jumlah anak Statistics Panel berubah akibat penambahan
  additive.
- `tests/dashboard-v2-summary.test.js` — 1 assertion lama
  (`statisticsPanel.children.length`) diperbaiki dari `4` ke `8`,
  alasan yang sama.
- `tests/dashboard-v2-summary-data.test.js` &
  `tests/dashboard-v2-module-grid-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `3x` ke `4x`, karena Statistics Panel menambah 1 titik pemanggilan
  guard baru per fungsi.
- `tests/dashboard-v2-statistics-data.test.js` — file test baru (18
  test).
- `DASHBOARD-V2-STATISTICS-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19 & test tanda tangan API (4 fungsi
  publik yang sama, tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Statistics Panel — Hero, Summary Cards,
  Quick Actions, Module Grid, Insight Panel, Recent Activity, Upcoming
  Tasks, Notifications Center, AI Command Center, Health Score Widget,
  Predictive Insights, Automation Center — 0 baris tersentuh (hanya
  `_buildStatisticsPanel()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.19) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-statistics.
  test.js`, 1 assertion child-count di `tests/dashboard-v2-summary.
  test.js`, dan 2 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js` & `tests/dashboard-v2-module-grid-data.test.js`
  (semuanya akibat penambahan additive); hanya 1 file test baru
  ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.19) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-statistics.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (baru) +
`DASHBOARD-V2-STATISTICS-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-statistics-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1696
# pass 1696
# fail 0
```

## Tahap V2.21 — Recent Activity Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildRecentActivity()` (4 elemen data summary baru ditambah sbg
  anak Recent Activity, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18, `_buildModuleGrid()` V2.19 &
  `_buildStatisticsPanel()` V2.20). Tidak ada fungsi lain yang
  disentuh.
- `tests/dashboard-v2-activity.test.js` — 2 assertion lama
  (`activity.children.length`) diperbaiki dari `5` ke `9`, satu-satunya
  alasan: jumlah anak Recent Activity berubah akibat penambahan
  additive.
- `tests/dashboard-v2-summary.test.js` — 1 assertion lama
  (`recentActivity.children.length`) diperbaiki dari `5` ke `9`, alasan
  yang sama.
- `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js` &
  `tests/dashboard-v2-statistics-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `4x` ke `5x`, karena Recent Activity menambah 1 titik pemanggilan
  guard baru per fungsi.
- `tests/dashboard-v2-recent-activity-data.test.js` — file test baru
  (18 test).
- `DASHBOARD-V2-RECENT-ACTIVITY-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20 & test tanda tangan API (4
  fungsi publik yang sama, tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Recent Activity — Hero, Summary Cards, Quick
  Actions, Module Grid, Insight Panel, Statistics Panel, Upcoming
  Tasks, Notifications Center, AI Command Center, Health Score Widget,
  Predictive Insights, Automation Center — 0 baris tersentuh (hanya
  `_buildRecentActivity()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.20) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-activity.
  test.js`, 1 assertion child-count di `tests/dashboard-v2-summary.
  test.js`, dan 3 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js`, `tests/dashboard-v2-module-grid-data.test.js` &
  `tests/dashboard-v2-statistics-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.20) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-activity.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (baru) +
`DASHBOARD-V2-RECENT-ACTIVITY-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-recent-activity-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1714
# pass 1714
# fail 0
```

## Tahap V2.22 — Upcoming Tasks Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildUpcomingTasks()` (4 elemen data summary baru ditambah sbg anak
  Upcoming Tasks, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18, `_buildModuleGrid()` V2.19,
  `_buildStatisticsPanel()` V2.20 & `_buildRecentActivity()` V2.21).
  Tidak ada fungsi lain yang disentuh.
- `tests/dashboard-v2-upcoming.test.js` — 2 assertion lama
  (`section.children.length`) diperbaiki dari `5` ke `9`, satu-satunya
  alasan: jumlah anak Upcoming Tasks berubah akibat penambahan
  additive.
- `tests/dashboard-v2-summary.test.js` — 1 assertion lama
  (`upcomingTasks.children.length`) diperbaiki dari `5` ke `9`, alasan
  yang sama.
- `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js` &
  `tests/dashboard-v2-recent-activity-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `5x` ke `6x`, karena Upcoming Tasks menambah 1 titik pemanggilan
  guard baru per fungsi.
- `tests/dashboard-v2-upcoming-tasks-data.test.js` — file test baru (18
  test).
- `DASHBOARD-V2-UPCOMING-TASKS-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21 & test tanda tangan API
  (4 fungsi publik yang sama, tanpa `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Upcoming Tasks — Hero, Summary Cards, Quick
  Actions, Module Grid, Insight Panel, Statistics Panel, Recent
  Activity, Notifications Center, AI Command Center, Health Score
  Widget, Predictive Insights, Automation Center — 0 baris tersentuh
  (hanya `_buildUpcomingTasks()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.21) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-upcoming.
  test.js`, 1 assertion child-count di `tests/dashboard-v2-summary.
  test.js`, dan 4 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js`, `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js` &
  `tests/dashboard-v2-recent-activity-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.21) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-upcoming.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (baru) +
`DASHBOARD-V2-UPCOMING-TASKS-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-upcoming-tasks-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1732
# pass 1732
# fail 0
```

## Tahap V2.23 — Notifications Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildNotifications()` (4 elemen data summary baru ditambah sbg
  anak Notifications, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18, `_buildModuleGrid()` V2.19,
  `_buildStatisticsPanel()` V2.20, `_buildRecentActivity()` V2.21 &
  `_buildUpcomingTasks()` V2.22). Tidak ada fungsi lain yang disentuh.
- `tests/dashboard-v2-notifications.test.js` — 2 assertion lama
  (`section.children.length`) diperbaiki dari `5` ke `9`, satu-satunya
  alasan: jumlah anak Notifications berubah akibat penambahan
  additive.
- `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js` &
  `tests/dashboard-v2-upcoming-tasks-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `6x` ke `7x`, karena Notifications menambah 1 titik pemanggilan guard
  baru per fungsi.
- `tests/dashboard-v2-notifications-data.test.js` — file test baru (18
  test).
- `DASHBOARD-V2-NOTIFICATIONS-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21/V2.22 & test tanda
  tangan API (4 fungsi publik yang sama, tanpa `let`/`var` top-level
  baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Notifications — Hero, Summary Cards, Quick
  Actions, Module Grid, Insight Panel, Recent Activity, Statistics
  Panel, Upcoming Tasks, AI Command Center, Health Score Widget,
  Predictive Insights, Automation Center — 0 baris tersentuh (hanya
  `_buildNotifications()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.22) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-notifications.
  test.js`, dan 5 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js`, `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js` &
  `tests/dashboard-v2-upcoming-tasks-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.22) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-notifications.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-notifications-data.test.js` (baru)
+ `DASHBOARD-V2-NOTIFICATIONS-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-notifications-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1750
# pass 1750
# fail 0
```

## Tahap V2.24 — Automation Center Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildAutomationCenter()` (4 elemen data summary baru ditambah sbg
  anak Automation Center, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18, `_buildModuleGrid()` V2.19,
  `_buildStatisticsPanel()` V2.20, `_buildRecentActivity()` V2.21,
  `_buildUpcomingTasks()` V2.22 & `_buildNotifications()` V2.23).
  Tidak ada fungsi lain yang disentuh.
- `tests/dashboard-v2-automation.test.js` — 2 assertion lama
  (`section.children.length`) diperbaiki dari `5` ke `9`, satu-satunya
  alasan: jumlah anak Automation Center berubah akibat penambahan
  additive.
- `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js` &
  `tests/dashboard-v2-notifications-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `7x` ke `8x`, karena Automation Center menambah 1 titik pemanggilan
  guard baru per fungsi.
- `tests/dashboard-v2-automation-data.test.js` — file test baru (18
  test).
- `DASHBOARD-V2-AUTOMATION-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23 & test tanda
  tangan API (4 fungsi publik yang sama, tanpa `let`/`var` top-level
  baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Automation Center — Hero, Summary Cards,
  Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, AI Command Center,
  Health Score Widget, Predictive Insights — 0 baris tersentuh (hanya
  `_buildAutomationCenter()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.23) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-automation.
  test.js`, dan 6 assertion guard-count di `tests/dashboard-v2-summary-
  data.test.js`, `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js` &
  `tests/dashboard-v2-notifications-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.23) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-automation.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-notifications-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-automation-data.test.js`
(baru) + `DASHBOARD-V2-AUTOMATION-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-automation-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1768
# pass 1768
# fail 0
```

## Tahap V2.25 — AI Command Center Data Integration

- `dashboard-v2-shell.js` — diedit HANYA di dalam
  `_buildAiCommandCenter()` (4 elemen data summary baru ditambah sbg
  anak AI Command Center, mengikuti pola persis `_buildHero()` V2.17,
  `_buildSummaryCards()` V2.18, `_buildModuleGrid()` V2.19,
  `_buildStatisticsPanel()` V2.20, `_buildRecentActivity()` V2.21,
  `_buildUpcomingTasks()` V2.22, `_buildNotifications()` V2.23 &
  `_buildAutomationCenter()` V2.24). Tidak ada fungsi lain yang
  disentuh.
- `tests/dashboard-v2-ai.test.js` — 2 assertion lama
  (`section.children.length`) diperbaiki dari `6` ke `10`,
  satu-satunya alasan: jumlah anak AI Command Center berubah akibat
  penambahan additive tahap ini.
- `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js`,
  `tests/dashboard-v2-notifications-data.test.js` &
  `tests/dashboard-v2-automation-data.test.js` — masing-masing 1
  assertion constraint (guard-count per fungsi adapter) diperbaiki dari
  `8x` ke `9x`, karena AI Command Center menambah 1 titik pemanggilan
  guard baru per fungsi.
- `tests/dashboard-v2-ai-data.test.js` — file test baru (18 test).
- `DASHBOARD-V2-AI-DATA.md` — dokumentasi baru.
- `CHANGELOG.md`, `FILES-CHANGED.md` — diedit, aditif (entri tahap ini
  ditambahkan di akhir file).

### Tidak diubah

- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23/V2.24 &
  test tanda tangan API (4 fungsi publik yang sama, tanpa `let`/`var`
  top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain AI Command Center — Hero, Summary Cards,
  Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, Automation Center,
  Health Score Widget, Predictive Insights — 0 baris tersentuh (hanya
  `_buildAiCommandCenter()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.24) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-ai.test.js`,
  dan 7 assertion guard-count di
  `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js`,
  `tests/dashboard-v2-notifications-data.test.js` &
  `tests/dashboard-v2-automation-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.24) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-ai.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-notifications-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-automation-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-ai-data.test.js` (baru) +
`DASHBOARD-V2-AI-DATA.md` (baru) + `CHANGELOG.md`/`FILES-CHANGED.md`
(diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-ai-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1786
# pass 1786
# fail 0
```

## Tahap V2.26 — Health Score Data Integration

- `dashboard-v2-shell.js` — HANYA `_buildHealthScore()` diedit
  (additive): 4 elemen data baru ditambah sbg anak Health Score,
  masing-masing dibuat via `document.createElement()`, dipanggil lewat
  guard `typeof getFinanceSummary/getVehicleSummary/getFamilySummary/
  getDocumentSummary === 'function'`, digabung ke `children` (via
  `children.push(...)`) lalu di-render lewat
  `section.replaceChildren()`. Tidak ada fungsi lain yang disentuh.
- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23/V2.24/V2.25
  & test tanda tangan API (4 fungsi publik yang sama, tanpa
  `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Health Score — Hero, Summary Cards, Quick
  Actions, Module Grid, Insight Panel, Recent Activity, Statistics
  Panel, Upcoming Tasks, Notifications, Automation Center, AI Command
  Center, Predictive Insights — 0 baris tersentuh (hanya
  `_buildHealthScore()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.25) — tidak satu pun diubah
  selain 2 assertion child-count di `tests/dashboard-v2-health.test.js`,
  dan 8 assertion guard-count di
  `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js`,
  `tests/dashboard-v2-notifications-data.test.js`,
  `tests/dashboard-v2-automation-data.test.js` &
  `tests/dashboard-v2-ai-data.test.js` (semuanya akibat penambahan
  additive); hanya 1 file test baru ditambahkan
  (`tests/dashboard-v2-health-data.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.25) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-health.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-notifications-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-automation-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-ai-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-health-data.test.js` (baru) +
`DASHBOARD-V2-HEALTH-DATA.md` (baru) + `CHANGELOG.md`/`FILES-
CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-health-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1804
# pass 1804
# fail 0
```

## Tahap V2.27 — Predictive Insights Data Integration

- `dashboard-v2-shell.js` — HANYA `_buildPredictiveInsights()` diedit
  (additive): 4 elemen data baru ditambah sbg anak Predictive
  Insights, masing-masing dibuat via `document.createElement()`,
  dipanggil lewat guard `typeof getFinanceSummary/getVehicleSummary/
  getFamilySummary/getDocumentSummary === 'function'`, digabung ke
  array baru (`[...cards, financeEl, vehicleEl, familyEl, documentEl]`)
  lalu di-render lewat `section.replaceChildren()`. Tidak ada fungsi
  lain yang disentuh.
- `dashboard-v2-data-adapter.js` — TIDAK diubah sama sekali (murni
  dipakai, bukan disunting). Diverifikasi `diff` byte-identik terhadap
  baseline V2.16/V2.17/V2.18/V2.19/V2.20/V2.21/V2.22/V2.23/V2.24/V2.25/
  V2.26 & test tanda tangan API (4 fungsi publik yang sama, tanpa
  `let`/`var` top-level baru).
- `dashboard-hub.js`, `dashboard-v2-activation.js` — tidak disentuh.
- Sub-komponen Main selain Predictive Insights — Hero, Summary Cards,
  Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, Automation Center,
  AI Command Center, Health Score — 0 baris tersentuh (hanya
  `_buildPredictiveInsights()` yang diedit).
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh (selain versi
  build `?v=` yang disinkronkan otomatis oleh `build.js`, di luar
  perubahan manual tahap ini).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; shell TIDAK membaca `D` langsung
  (satu-satunya jalur baca tetap lewat adapter, bukan `D.*` langsung).
- **Seluruh file test lama** (baseline V2.26) — tidak satu pun diubah
  selain 2 assertion child-count di
  `tests/dashboard-v2-predictive.test.js`, dan 9 assertion guard-count
  di `tests/dashboard-v2-summary-data.test.js`,
  `tests/dashboard-v2-module-grid-data.test.js`,
  `tests/dashboard-v2-statistics-data.test.js`,
  `tests/dashboard-v2-recent-activity-data.test.js`,
  `tests/dashboard-v2-upcoming-tasks-data.test.js`,
  `tests/dashboard-v2-notifications-data.test.js`,
  `tests/dashboard-v2-automation-data.test.js`,
  `tests/dashboard-v2-ai-data.test.js` &
  `tests/dashboard-v2-health-data.test.js` (semuanya akibat
  penambahan additive); hanya 1 file test baru ditambahkan
  (`tests/dashboard-v2-predictive-data.test.js`).

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.26) dan
hasil akhir tahap ini: hanya `dashboard-v2-shell.js` (diubah) +
`tests/dashboard-v2-predictive.test.js` (diubah, 2 assertion) +
`tests/dashboard-v2-summary-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-statistics-data.test.js` (diubah, 1 assertion) +
`tests/dashboard-v2-recent-activity-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-upcoming-tasks-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-notifications-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-automation-data.test.js`
(diubah, 1 assertion) + `tests/dashboard-v2-ai-data.test.js` (diubah,
1 assertion) + `tests/dashboard-v2-health-data.test.js` (diubah, 1
assertion) + `tests/dashboard-v2-predictive-data.test.js` (baru) +
`DASHBOARD-V2-PREDICTIVE-DATA.md` (baru) + `CHANGELOG.md`/`FILES-
CHANGED.md` (diubah, aditif) yang berbeda.

## Hasil test

```
node --test tests/dashboard-v2-predictive-data.test.js
# tests 18
# pass 18
# fail 0

node --test
# tests 1822
# pass 1822
# fail 0
```

## Tahap V2.28 — Dashboard Refresh Lifecycle

### Diubah (aditif, 0 baris dihapus)

- `dashboard-v2-shell.js` — tambah 1 method baru, `refresh()`, + blok
  komentar dokumentasi "Tahap V2.28" (lihat CHANGELOG.md untuk kontrak
  lengkap). `init()`, `render()`, `destroy()`, dan seluruh
  `_build*()` builder existing tidak diubah/di-refactor sama sekali
  (`refresh()` memanggil `_buildMain()` apa adanya).

### Baru

- `tests/dashboard-v2-refresh.test.js` — 22 test mencakup: ketersediaan
  `refresh()`; no-op sebelum `init()`/sebelum `render()`; tidak
  memanggil `init()`/`destroy()`; tidak membuat root baru; tetap
  memakai adapter (integrasi sungguhan dgn `D` berubah di antara
  `render()` & `refresh()`); tidak membaca `D` langsung (inspeksi
  source); tidak memakai `fetch()`/`showPage()`/`FEATURE_REGISTRY`/
  `innerHTML`/query DOM global (inspeksi source); idempotency; tidak
  mengubah Activation Switch; mempertahankan referensi root/sidebar/
  header/main/bottomNav/fab; hanya memperbarui isi `main` (Sidebar/
  Header/Bottom Nav tidak ikut ter-refresh); seluruh 11 panel adapter
  ter-update; API lama tidak berubah.
- `DASHBOARD-V2-REFRESH.md` — dokumentasi deliverable tahap ini.

### Tidak diubah

- `dashboard-v2-data-adapter.js` — byte-identik dgn baseline V2.27.
- `dashboard-hub.js` — byte-identik dgn baseline V2.27.
- `dashboard-v2-activation.js` — byte-identik dgn baseline V2.27.
- Seluruh builder `_build*()` di `dashboard-v2-shell.js` (Hero, Summary
  Cards, Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, AI Command Center,
  Health Score, Predictive Insights, Automation Center, Sidebar,
  Header, Bottom Nav) — 0 baris tersentuh.
- `FEATURE_REGISTRY`/`dashboard-hub-registry.js` — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh secara manual
  (selain versi build `?v=` yang disinkronkan otomatis oleh
  `build.js`).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; `refresh()` TIDAK membaca `D`
  langsung (satu-satunya jalur baca tetap lewat adapter).
- **Seluruh file test lama** (baseline V2.27, 1822 test) — tidak satu
  pun diubah; hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.27) dan
hasil akhir tahap ini: perubahan manual hanya `dashboard-v2-shell.js`
(aditif) + `tests/dashboard-v2-refresh.test.js` (baru) +
`DASHBOARD-V2-REFRESH.md` (baru) + `CHANGELOG.md`/`FILES-CHANGED.md`
(aditif). File lain yang berbeda (`app-bundle-*.min.js`,
`app_production.html`, `index.html`, `sw.js`, `docs/FILE-MAP.md`, 6
file sinkronisasi versi) adalah efek otomatis `node scripts/build.js`
(bump nomor versi build), bukan sentuhan manual.

## Hasil test

```
node --test tests/dashboard-v2-refresh.test.js
# tests 22 / pass 22 / fail 0

node --test
# tests 1844 / pass 1844 / fail 0
```

## Tahap V2.29 — Dashboard Auto Refresh

### Diubah (aditif, 0 baris dihapus)

- `dashboard-v2-shell.js` — tambah 3 method baru (`startAutoRefresh(
  intervalMs?)`, `stopAutoRefresh()`, `isAutoRefreshActive()`) + 1
  konstanta baru (`AUTO_REFRESH_DEFAULT_MS`) + 1 state instance baru
  (`_autoRefreshTimer`) + blok komentar dokumentasi "Tahap V2.29"
  (lihat CHANGELOG.md untuk kontrak lengkap). `refresh()` (V2.28),
  `init()`, `render()`, `destroy()`, dan seluruh `_build*()` builder
  existing tidak diubah/di-refactor sama sekali — `startAutoRefresh()`
  murni memanggil `this.refresh()` apa adanya lewat `setInterval()`,
  0 logic pembangunan panel baru/diduplikasi.

### Baru

- `tests/dashboard-v2-auto-refresh.test.js` — 20 test mencakup:
  ketersediaan `startAutoRefresh()`/`stopAutoRefresh()`/
  `isAutoRefreshActive()` & `AUTO_REFRESH_DEFAULT_MS`; state awal
  (`isAutoRefreshActive()` false, `stopAutoRefresh()` sebelum start
  no-op); `startAutoRefresh()` mendaftarkan timer & mengaktifkan
  status; default interval vs interval custom vs fallback nilai tidak
  valid (`0`/negatif); `stopAutoRefresh()` membersihkan timer aktif;
  idempotency `startAutoRefresh()` (tidak menumpuk timer, selalu tepat
  1 aktif walau dipanggil berkali-kali/dgn interval berbeda); tiap tick
  timer memanggil `refresh()` (reuse, bukan duplikasi) & TIDAK
  memanggil `init()`/`render()`/`destroy()`; tick sebelum `init()`/
  `render()` & sesudah `destroy()` tetap aman (no-op, kontrak `refresh()`
  V2.28 berlaku penuh, tidak diam-diam mount ulang); integrasi
  sungguhan dgn adapter ASLI (`D` berubah di antara `render()` &
  tick timer, panel ter-update via `refresh()`); tidak membaca `D`
  langsung & tidak memakai `fetch()`/`showPage()`/`FEATURE_REGISTRY`/
  `innerHTML` (inspeksi source ketiga method baru); `startAutoRefresh()`
  secara tekstual hanya memanggil `refresh()`, bukan `init()`/`render()`/
  `destroy()`; environment tanpa `setInterval` aman (no-op); `_buildMain()`
  tetap punya persis 3 kemunculan di kode aktif (tidak ada call site
  baru di luar `render()`/`refresh()`); idempotent end-to-end (banyak
  tick tidak menumpuk node).
- `DASHBOARD-V2-AUTO-REFRESH.md` — dokumentasi deliverable tahap ini.

### Tidak diubah

- `dashboard-v2-data-adapter.js` — byte-identik dgn baseline V2.28.
- `dashboard-hub.js` — byte-identik dgn baseline V2.28.
- `dashboard-v2-activation.js` — byte-identik dgn baseline V2.28.
- `refresh()`, `init()`, `render()`, `destroy()`, dan seluruh
  `_build*()` builder di `dashboard-v2-shell.js` (Hero, Summary Cards,
  Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, AI Command Center,
  Health Score, Predictive Insights, Automation Center, Sidebar,
  Header, Bottom Nav) — 0 baris tersentuh.
- `FEATURE_REGISTRY`/`dashboard-hub-registry.js` — tidak disentuh,
  tidak direferensikan.
- `showPage()` — tidak dipanggil/diubah.
- `index.html`, `app_production.html` — tidak disentuh secara manual
  (selain versi build `?v=` yang disinkronkan otomatis oleh
  `build.js`).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; ketiga method baru TIDAK membaca
  `D` langsung (satu-satunya efek adalah memanggil `refresh()` yang
  pun tidak membaca `D` langsung, lihat DASHBOARD-V2-REFRESH.md).
- **Seluruh file test lama** (baseline V2.28, 1844 test) — tidak satu
  pun diubah; hanya 1 file test baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.28) dan
hasil akhir tahap ini: perubahan manual hanya `dashboard-v2-shell.js`
(aditif) + `tests/dashboard-v2-auto-refresh.test.js` (baru) +
`DASHBOARD-V2-AUTO-REFRESH.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (aditif). File lain yang berbeda
(`app-bundle-*.min.js`, `app_production.html`, `index.html`, `sw.js`,
`docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek otomatis
`node scripts/build.js` (bump nomor versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-auto-refresh.test.js
# tests 20 / pass 20 / fail 0

node --test
# tests 1864 / pass 1864 / fail 0
```

## Tahap V2.30 — Interactive Dashboard Cards

### Diubah (aditif, 0 baris dihapus)

- `dashboard-v2-shell.js` — `_buildModuleGrid()`: 3 dari 6 entri
  `modules[]` (Finance/Vehicle/Settings) dapat field baru `page`
  (`'keuangan'`/`'carnotes'`/`'settings'`); pembuatan kartu dibungkus
  `if (mod.page) {...} else {...}`, cabang `else` = kode lama V2.4
  persis tidak berubah. Cabang `if` menaruh `role="button"`,
  `tabindex="0"`, `data-action="dashHubNavigateToFeature"`,
  `data-args='[{"page":...}]'` — reuse dispatcher `data-action` global
  (`features-helpers-global-security.js`, TIDAK diubah) +
  `dashHubNavigateToFeature()` (`dashboard-hub.js`, TIDAK diubah) +
  `showPage()` (`modal-navigasi.js`, TIDAK diubah). 0 fungsi
  navigasi baru; `dashboard-v2-shell.js` sendiri tidak pernah memanggil
  `showPage()`/`addEventListener`/`.onclick=`/`FEATURE_REGISTRY` secara
  tekstual. 3 entri lain (Reports/Family/Documents) dapat `page: null`
  — tetap placeholder murni, tidak diwire (lihat CHANGELOG.md &
  DASHBOARD-V2-INTERACTIVE-CARDS.md untuk alasan pemetaan).
- `tests/dashboard-v2-summary.test.js` — test "Module Grid: 6 module
  card ... sesuai urutan & placeholder" diganti (bukan dihapus):
  sekarang memverifikasi Finance/Vehicle/Settings punya
  `role="button"`/`data-action`/`data-args` yang benar & TIDAK lagi
  match `/placeholder/i`; Reports/Family/Documents tetap match
  `/placeholder/i` & 0 `data-action`.
- `tests/dashboard-v2-module-grid-data.test.js` — test "6 kartu lama
  ... tidak berubah" diganti (bukan dihapus): sekarang memverifikasi
  Finance/Vehicle/Settings punya `data-action` yang benar,
  Reports/Family/Documents tetap 0 `data-action`.

### Baru

- `tests/dashboard-v2-interactive-cards.test.js` — 1 test integrasi:
  memuat `dashboard-v2-shell.js` bersama `dashboard-hub.js` ASLI (bukan
  mock) di satu sandbox (`tests/helpers/loadSource.js`), benar-benar
  memanggil rantai `data-action` → `dashHubNavigateToFeature()` →
  `showPage()` (di-stub) utk Finance/Vehicle/Settings & memverifikasi
  nama page yang benar terpanggil tepat 1x; juga memverifikasi
  Reports/Family/Documents tetap 0 `data-action`.
- `DASHBOARD-V2-INTERACTIVE-CARDS.md` — dokumentasi deliverable tahap
  ini.

### Tidak diubah

- `dashboard-hub.js`, `modal-navigasi.js`,
  `features-helpers-global-security.js`, `modules-render.js`,
  `dashboard-hub-registry.js`/`FEATURE_REGISTRY` — byte-identik dgn
  baseline V2.29, tidak direferensikan sbg pemanggilan langsung (hanya
  dirujuk sbg STRING nama fungsi di `data-action`, yang di-resolve oleh
  dispatcher existing saat runtime, bukan oleh `dashboard-v2-shell.js`).
- `refresh()`, `init()`, `render()`, `destroy()`,
  `startAutoRefresh()`/`stopAutoRefresh()`/`isAutoRefreshActive()`
  (V2.29), dan seluruh `_build*()` builder lain di
  `dashboard-v2-shell.js` (Hero, Summary Cards, Quick Actions, Insight
  Panel, Recent Activity, Statistics Panel, Upcoming Tasks,
  Notifications, AI Command Center, Health Score, Predictive Insights,
  Automation Center, Sidebar, Header, Bottom Nav) — 0 baris tersentuh.
- `index.html`, `app_production.html` — tidak disentuh secara manual
  (selain versi build `?v=` yang disinkronkan otomatis oleh
  `build.js`).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `akun.js`, dst) — tidak disentuh; kartu baru tidak membaca `D`
  langsung, hanya membawa nama page statis.
- **Seluruh file test lama** (baseline V2.29, 1864 test) selain 2 file
  yang diperbarui di atas — tidak satu pun diubah; hanya 1 file test
  baru ditambahkan.

Diverifikasi dgn `diff -rq` antara baseline (akhir Tahap V2.29) dan
hasil akhir tahap ini: perubahan manual hanya `dashboard-v2-shell.js`
(aditif) + `tests/dashboard-v2-summary.test.js` (diubah) +
`tests/dashboard-v2-module-grid-data.test.js` (diubah) +
`tests/dashboard-v2-interactive-cards.test.js` (baru) +
`DASHBOARD-V2-INTERACTIVE-CARDS.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (aditif). File lain yang berbeda
(`app-bundle-*.min.js`, `app_production.html`, `index.html`, `sw.js`,
`docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek otomatis
`node scripts/build.js` (bump nomor versi build), bukan sentuhan
manual.

## Hasil test

```
node --test tests/dashboard-v2-interactive-cards.test.js
# tests 1 / pass 1 / fail 0

node --test
# tests 1865 / pass 1865 / fail 0
```
## Tahap V2.31 — Hero Real Data

### Diubah (REPLACE placeholder → data nyata di elemen yang sama, id/class tidak berubah)

- `dashboard-v2-shell.js` — HANYA `_buildHero()` disentuh:
  - 4 variabel summary adapter (`financeSummary`/`vehicleSummary`/
    `familySummary`/`documentSummary`) dipindah ke atas fungsi (dari
    lokasi lamanya di blok V2.17) supaya di-REUSE, bukan fetch ulang.
  - 4 placeholder LAMA (`dashboardV2HeroTitle`/`dashboardV2Hero-
    HealthScore`/`dashboardV2HeroBalance`/`dashboardV2HeroInsight`,
    Tahap V2.2) — `textContent`/`aria-label` di-REPLACE jadi data nyata
    (title: total data tercatat; healthScore: Skor Kelengkapan Data
    X/4 domain; balance: saldo dari `getFinanceSummary()`; insight:
    ringkasan gabungan 4 domain), dgn fallback ke teks placeholder ASLI
    V2.2 byte-identik kalau adapter/`D` belum tersedia. 4 elemen data
    summary BARU (V2.17) tidak berubah perilakunya.

### Baru

- `tests/dashboard-v2-hero-real-data.test.js` — 6 test: integrasi
  sungguhan (adapter ASLI + `D` tiruan) memverifikasi 4 placeholder lama
  menampilkan data nyata & tidak lagi match `/placeholder/i`; healthScore
  parsial (3/4 domain); jalur "adapter tidak di-load" tetap fallback
  placeholder byte-identik; constraint check (`D` tidak dibaca langsung,
  adapter & `dashboard-hub.js` tidak diubah).
- `DASHBOARD-V2-HERO-REAL-DATA.md` — dokumentasi deliverable tahap ini.

### Tidak diubah

- `dashboard-v2-data-adapter.js` — 0 byte diubah, tetap persis 5 fungsi
  seperti baseline V2.16.
- `dashboard-hub.js` — tidak disentuh (tetap V2.30.1, mutual-exclusion
  Hub↔V2 tidak berubah).
- Seluruh `_build*()` builder lain di `dashboard-v2-shell.js` (Summary
  Cards, Quick Actions, Module Grid, Insight Panel, Recent Activity,
  Statistics Panel, Upcoming Tasks, Notifications, AI Command Center,
  Health Score card, Predictive Insights, Automation Center, Sidebar,
  Header, Bottom Nav, Auto Refresh) — 0 baris tersentuh.
- `index.html`, `app_production.html` — tidak disentuh secara manual
  (selain versi build `?v=` yang disinkronkan otomatis oleh `build.js`).
- Business logic penulis `D` (`transaksi.js`, `vehicle-core.js`,
  `hidup-seimbang.js`, dst) — tidak disentuh; Hero tidak membaca `D`
  langsung, hanya lewat 4 fungsi adapter yang sudah ada.
- **Seluruh file test lama** (baseline V2.30.1, 1870 test) — 0 file
  diubah; hanya 1 file test baru ditambahkan.
  `tests/dashboard-v2-hero.test.js` & `tests/dashboard-v2-hero-
  data.test.js` (yang tadinya berisiko obsolete krn menguji teks
  placeholder lama) TETAP lulus tanpa modifikasi — keduanya me-load
  shell tanpa adapter, sehingga tetap menguji jalur fallback yang tidak
  berubah.

Diverifikasi dgn `diff -rq` antara baseline (V2.30.1) dan hasil akhir
tahap ini: perubahan manual hanya `dashboard-v2-shell.js` (diubah, hanya
di dalam `_buildHero()`) + `tests/dashboard-v2-hero-real-data.test.js`
(baru) + `DASHBOARD-V2-HERO-REAL-DATA.md` (baru) + `CHANGELOG.md`/
`FILES-CHANGED.md` (aditif). File lain yang berbeda
(`app-bundle-*.min.js`, `app_production.html`, `index.html`, `sw.js`,
`docs/FILE-MAP.md`, 6 file sinkronisasi versi) adalah efek otomatis
`node scripts/build.js` (bump nomor versi build), bukan sentuhan manual.

## Hasil test

```
node --test tests/dashboard-v2-hero-real-data.test.js
# tests 6 / pass 6 / fail 0

node --test
# tests 1876 / pass 1876 / fail 0
```

# Files Changed — Tab "📊 Laporan" Shop/Cobek (bangun UI utk logic yatim)

Baseline: 1727/1727 test PASS sebelum sesi ini.

## Temuan audit

`Laporan.renderTab()`/`topProdukAgg()`/`renderTopProduk()`/
`renderTopPelanggan()`/`setPeriodeLap()`/`getRangeLap()` (`cobek-order.js`)
dan `exportLaporanShopXLSX()` (`cobek-io.js`), plus cabang
`t==='laporan'` di `setShopTab()`, sudah ada sejak lama — tapi **tidak ada
elemen HTML sama sekali** (`#lapTrip`, `#lapOmzet`, `#lapGrafikBars`, dst)
maupun tombol tab untuk memicunya. Tab "Laporan" Shop sepenuhnya tidak bisa
diakses user walau logic-nya lengkap. Sesi ini menambahkan HANYA markup +
1 wrapper tipis baru untuk mengaktifkannya, plus FAB kontekstual (pola sama
persis dengan `#laporanFab` di tab Laporan Keuangan, `REPORTS-2.0.md`).

## File yang berubah

| File | Jenis | Ringkasan |
|---|---|---|
| `index.html` | Diubah (+95 baris) | 1 tombol tab baru "📊 Laporan" di `.cn-tabs` Shop; 1 div `#shopTab-laporan` baru berisi filter periode (`#lapPeriodeChips`/`#lapCustomRange`, TERPISAH dari filter Riwayat), 4 kartu stat (reuse `.grid2`/`.stat-box`), grafik (reuse `.grafik-bar-wrap`), top produk & top pelanggan; FAB kontekstual `#shopLaporanFab` (reuse penuh `.keu-fab*`, 2 aksi: `exportLaporanShopXLSX()`/`exportShopSemuaXLSX()`, keduanya fungsi lama tidak diubah). |
| `app_production.html` | Diubah (disinkronkan) | Disalin ulang jadi salinan persis `index.html` (diverifikasi `diff` kosong). |
| `styles.css` | Diubah (+8 baris) | 1 rule baru `#shopTab-laporan .keu-fab{bottom:236px;}` (override posisi, aditif, offset sama seperti pola Laporan Keuangan) + komentar. Tidak ada class `.shop-laporan-fab*` baru. |
| `cobek-io.js` | Diubah (+1 baris) | 1 wrapper tipis baru `function renderShopLaporan(){return Laporan.renderTab();}` (pola sama dgn `renderShop()`/`renderShopGrafik()` yang sudah ada) supaya input `#lapFrom`/`#lapTo` bisa memicu render ulang. Tidak ada baris lain di file ini yang diubah. |
| `tests/shop-laporan-tab.test.js` | **Baru** (28 test) | Test struktural: tombol tab & posisi, elemen `#lapTrip`/dst ada, filter periode terpisah dari Riwayat, 4 kartu stat reuse `.grid2`/`.stat-box` (bukan grid-4 baru), grafik reuse `.grafik-bar-wrap`, FAB kontekstual (di dalam `#shopTab-laporan`, ter-toggle otomatis), FAB reuse `.keu-fab*` & 2 fungsi export lama, parity `index.html`/`app_production.html`, guard tidak ada class CSS baru, guard `cobek-order.js`/`dashboard-hub-registry.js` tidak disentuh, guard `cobek-io.js` hanya nambah 1 wrapper. |
| `CHANGELOG.md` | Diubah | ditambah entry baru (aditif, prepend). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (aditif, append). |

## Yang TIDAK diubah

- `Laporan.renderTab()`/`topProdukAgg()`/`renderTopProduk()`/
  `renderTopPelanggan()`/`setPeriodeLap()`/`getRangeLap()`/`renderGrafik()`
  (`cobek-order.js`) — 0 baris tersentuh, semua logic direuse apa adanya.
- `exportLaporanShopXLSX()`/`ShopExport.exportLaporan()`/
  `exportShopSemuaXLSX()` (`cobek-io.js`) — 0 baris tersentuh.
- `setShopTab()` (`cobek-io.js`) — cabang `t==='laporan'` sudah ada sejak
  lama, tidak diubah.
- `#shopFab` (Sprint 2 Tahap 2) — tidak diubah, tetap tampil di semua tab
  Shop termasuk tab Laporan yang baru.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — tidak relevan/tidak
  disentuh, tab Laporan Shop bukan entri baru di Dashboard Grid.

## Verifikasi

Diverifikasi lewat browser (Playwright + Chrome headless), dgn transaksi
nyata di `D.cobek` (bukan mock): tab Laporan menampilkan jumlah transaksi,
omzet, untung, margin, grafik 6 bulan, top produk, top pelanggan dgn benar;
FAB toggle & kedua aksi export terwire dgn benar; ganti filter periode
(Harian) tidak memicu error; smoke-test internal tetap bersih
(`✅ [smoke-test] OK — 1155 referensi getElementById() & 79 data-action
semuanya valid`).

## Hasil test

```
node --test tests/shop-laporan-tab.test.js
# tests 28 / pass 28 / fail 0

node --test
# tests 1755 / pass 1755 / fail 0

npm run build
✓ Tidak ada elemen u-dnone yang berisiko permanen kosong
✓ Tidak ada field user yang dirender tanpa escapeHtml()
✓ Tidak ada regresi pola guard dini Tesseract
✓ Semua konstanta versi terverifikasi sinkron
✓ Sintaks kedua bundle valid (node --check lolos)
✓ index.html & app_production.html sudah identik.
```

---

# Files Changed — Sesi 139: Bugfix Navigasi "Semua Fitur" Dashboard Hub (goTo ke sub-tab tidak aktif)

Baseline: hasil Sesi 138 (`?v=563`), `node --test tests/*.test.js`
52/52 PASS sebelum sesi ini (skop test yang tersedia di ZIP kerja ini).

Total file kode yang berubah: **2** (`dashboard-hub.js`,
`app-bundle-b.min.js`). Total file baru: **1**
(`tests/dashboard-hub-goto-subtab.test.js`). Total file dibuat ulang
otomatis oleh `scripts/build.js` (bukan diedit manual): `app-bundle-a.min.js`,
`index.html`, `app_production.html`, `sw.js`, `docs/FILE-MAP.md`, + 6 file
konstanta versi source.

| File | Jenis | Ringkasan |
|---|---|---|
| `modules/dashboard-hub/dashboard-hub.js` | Diubah (aditif) | Tambah `DASHHUB_GOTO_SECTION_MAP` (reverse-map dari `SECTION_GROUPS` yang sudah ada di `DashboardHub.applySectionTab()`, 0 taksonomi baru) + `_dashHubResolveGoToSection(goToId)` (jalan naik lewat `parentElement` sampai ketemu container section terdaftar, atau `null`). `dashHubNavigateToFeature()`: 1 blok baru di dalam `setTimeout` yang sudah ada, sebelum `scrollIntoView()` — kalau `target.page==='dashboard-hub'` dan section-nya ketemu, panggil `DashboardHub.setSectionTab(section)` dulu. 0 baris lama dihapus/diubah selain penambahan blok ini. |
| `app-bundle-b.min.js` | Diubah (aditif, lalu dibuat ulang otomatis) | Patch identik ditempel manual dulu (verifikasi cepat `node --check`), lalu `scripts/build.js` dijalankan sungguhan sehingga bundle final = hasil build otomatis dari source yang sudah dipatch (bukan lagi patch manual yang dipertahankan). |
| `tests/dashboard-hub-goto-subtab.test.js` | **Baru** | 10 test: resolusi `_dashHubResolveGoToSection()` per id (termasuk naik beberapa level ancestor, id di luar `SECTION_GROUPS` manapun → `null`, id yang tidak ada di DOM → `null`, tidak `throw`), serta integrasi penuh `dashHubNavigateToFeature()` (setSectionTab terpanggil dgn tab yang benar SEBELUM scrollIntoView utk kartu Widget/Insight, TIDAK terpanggil sama sekali utk kartu yang sudah di luar section manapun, dan tidak pernah tersentuh sama sekali utk goTo di halaman lain). |
| `CHANGELOG.md` | Diubah | Entry Sesi 139 ditambahkan di paling atas (konvensi newest-first file ini, riwayat lama tidak diubah). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (aditif, append). |
| `docs/CHECKPOINT.md` | Diubah | Current Session diperbarui ke Sesi 139. |

## File yang TIDAK berubah (ditegaskan)

- `SECTION_GROUPS` di `DashboardHub.applySectionTab()` (dashboard-hub.js)
  — 0 baris disentuh, `DASHHUB_GOTO_SECTION_MAP` murni REUSE nilainya.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`) — 0 baris disentuh,
  seluruh `target.goTo`/`target.page` per kartu tetap persis sama dengan
  sebelum sesi ini.
- `showPage()`, `applySectionTab()`, `setKeuanganTab()`/`setShopTab()`/
  `setCnTab()`/`setPajakTab()`/`setAsetTab()` dan seluruh cabang navigasi
  ke page lain di `dashHubNavigateToFeature()` — 0 baris disentuh, guard
  baru HANYA aktif utk `target.page==='dashboard-hub'`.
- `index.html`, `app_production.html` — tidak diedit manual (hanya `?v=`
  disinkronkan otomatis oleh `scripts/build.js`, 0 markup berubah).
- Seluruh 62 test lama (52 baseline Sesi 138 + tidak ada yang dihapus) —
  tidak satu pun diubah, tetap 100% lulus tanpa modifikasi assertion.

## Hasil test

```
node --test tests/dashboard-hub-goto-subtab.test.js
# tests 10 / pass 10 / fail 0

node --test tests/*.test.js
# tests 62 / pass 62 / fail 0
```

## Build

```
node scripts/build.js kw139-fix-dashboard-hub-goto-subtab
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=564 / kw-cache-v564
```

---

# Files Changed — Sesi 140: Bugfix Kartu Beranda Tidak Muncul Lagi Setelah Dinyalakan Ulang

Baseline: hasil Sesi 139 (`?v=564`), `node --test tests/*.test.js`
62/62 PASS sebelum sesi ini (skop test yang tersedia di ZIP kerja ini).

Total file kode yang berubah: **1** (`modules/shared/modules-render.js`).
Total file baru: **1** (`tests/dash-card-show-hide.test.js`). Total file
dibuat ulang otomatis oleh `scripts/build.js` (bukan diedit manual):
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
`app_production.html`, `sw.js`, `docs/FILE-MAP.md`, + 6 file konstanta
versi source.

| File | Jenis | Ringkasan |
|---|---|---|
| `modules/shared/modules-render.js` | Diubah (aditif) | Tambah `showDashCardEl(elId)` — kebalikan simetris persis `hideDashCardEl()` (melepas `classList('u-dnone')` DAN inline `style.display`), ditempatkan langsung setelah definisi `hideDashCardEl()`. Loop `DASH_RENDER_ORDER` di `renderDashboard()`: +1 baris `showDashCardEl(cardDef.elId);` dipanggil SETELAH guard `isDashCardOn()` & SEBELUM `cardDef.render(...)`. 0 baris lama dihapus/diubah selain penambahan ini. |
| `tests/dash-card-show-hide.test.js` | **Baru** | 7 test: `hideDashCardEl()` (class+inline style ditambahkan), `showDashCardEl()` (keduanya dilepas — kontrak inti bugfix ini, idempotent, aman di elemen tidak ada/tidak pernah disembunyikan), dan 1 test integrasi yang memverifikasi urutan pemanggilan nyata di source (`isDashCardOn` guard → `showDashCardEl` → `cardDef.render`) di dalam loop `renderDashboard()`. |
| `CHANGELOG.md` | Diubah | Entry Sesi 140 ditambahkan di paling atas (konvensi newest-first file ini, riwayat lama tidak diubah). |
| `FILES-CHANGED.md` | Diubah | Dokumen ini (aditif, append). |
| `docs/CHECKPOINT.md` | Diubah | Current Session diperbarui ke Sesi 140. |
| `docs/NEXT_SESSION.md` | Diubah | Sinkronisasi status Batch 14 & baseline versi terbaru. |

## File yang TIDAK berubah (ditegaskan)

- `hideDashCardEl()` — 0 baris disentuh, `showDashCardEl()` murni fungsi
  BARU yang simetris, bukan modifikasi fungsi lama.
- `DASH_CARD_DEFS`/`DASH_RENDER_ORDER`/`DASH_CARD_BY_KEY`,
  `isDashCardOn()`/`toggleDashCardPref()`/`setAllDashCardPrefs()`,
  `renderDashCardPrefsUI()` — 0 baris disentuh.
- `dashboard-hub-registry.js` (`FEATURE_REGISTRY`, termasuk field
  `dashKey`) — 0 baris disentuh.
- `dashboard-hub.js` (`dashHubNavigateToFeature`/
  `DASHHUB_GOTO_SECTION_MAP`, bugfix Sesi 139) — 0 baris disentuh sesi
  ini, area berbeda (sub-tab Dashboard Hub vs inline style kartu
  opsional).
- `index.html`, `app_production.html` — tidak diedit manual (hanya `?v=`
  disinkronkan otomatis oleh `scripts/build.js`, 0 markup berubah).
- Seluruh 62 test lama — tidak satu pun diubah, tetap 100% lulus tanpa
  modifikasi assertion.

## Hasil test

```
node --test tests/dash-card-show-hide.test.js
# tests 7 / pass 7 / fail 0

node --test tests/*.test.js
# tests 69 / pass 69 / fail 0
```

## Build

```
node scripts/build.js kw140-fix-dashcard-toggle-inline-style
# ✓ Linter bawaan "pola bug u-dnone vs style.display" lolos bersih
# ✓ Sintaks kedua bundle valid (node --check lolos)
# ✓ index.html & app_production.html sudah identik.
# Versi baru: ?v=565 / kw-cache-v565
```
