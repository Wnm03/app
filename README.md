# Keluarga W

Aplikasi manajemen keuangan, zakat, bisnis, dan kendaraan keluarga ("Keluarga W") —
PWA (Progressive Web App) berbasis vanilla JavaScript, disusun sebagai kumpulan
file source yang dibundel menjadi `app-bundle-a.min.js` / `app-bundle-b.min.js`
lewat `scripts/build.js`.

Repository ini juga menyertakan **LifeOS**, lapisan orkestrasi personal-life-management
(Today / Areas / Goals / Projects / Review / Knowledge) yang dibangun **di atas**
data existing tanpa mengubahnya — lihat [§ LifeOS](#lifeos) di bawah.

---

## Struktur Folder

```
.
├── scripts/                 # Build & release tooling
│   ├── build.js              # Bundling GROUP_A + GROUP_B -> app-bundle-a/b.min.js
│   ├── release.sh
│   ├── bump-version.sh
│   ├── rollback.sh
│   ├── generate-file-map.js
│   └── collect-app-globals.js
├── tests/                   # Node.js test runner (node --test)
├── docs/                    # Dokumentasi internal proyek inti
├── lifeos/                  # Modul LifeOS (lihat § LifeOS)
│   ├── lifeos-store.js
│   ├── lifeos-registry.js
│   ├── lifeos-link-registry.js
│   ├── adapters/
│   ├── services/
│   └── ui/
├── archive/                  # Patch yang sudah diterapkan / ditunda, disimpan untuk riwayat
├── index.html
├── app_production.html
├── styles.css
├── manifest.json
├── sw.js
├── dashboard-hub.js
├── dashboard-hub-registry.js
├── dashboard-hub-search.js
├── *.js                      # Modul-modul domain (akun, cicilan, aset, cobek, vehicle, dll.)
├── eslint.config.js
├── package.json
└── .gitignore
```

> Bundle hasil build (`app-bundle-a.min.js`, `app-bundle-b.min.js`) **tidak** disertakan
> di repository ini — keduanya adalah artefak build, dihasilkan ulang secara lokal
> lewat `npm run build` (lihat [Cara Build](#cara-build)).

---

## Cara Build

Prasyarat: Node.js ≥ 20 (lihat `engines` di `package.json`).

```bash
npm install
npm run build
```

`npm run build` menjalankan `scripts/build.js`, yang akan:

1. Menjalankan pengecekan pola bug yang sudah pernah terjadi (mis. `u-dnone` vs `style.display`, field user tanpa `escapeHtml()`, regresi guard OCR).
2. Menyamakan nomor versi di seluruh file source terkait.
3. Membundel `GROUP_A` dan `GROUP_B` (termasuk seluruh `lifeos/*.js`, lihat [Dependency LifeOS](#dependency-lifeos)) menjadi `app-bundle-a.min.js` dan `app-bundle-b.min.js`.
4. Memutakhirkan query-string `?v=` di `index.html` / `app_production.html` dan `CACHE_NAME` di `sw.js`.
5. Menjalankan `node --check` terhadap kedua bundle untuk memastikan sintaks valid.

Opsional — untuk hasil bundle yang diminifikasi (butuh koneksi internet):

```bash
npm install --save-dev esbuild
npm run build
```

Tanpa `esbuild`, build tetap valid dan aman dipakai, hanya belum diminifikasi.

Jalankan test suite:

```bash
npm test
```

Jalankan lint:

```bash
npm run lint
```

Semua langkah sekaligus (lint + test + build):

```bash
npm run check
```

---

## Cara Menjalankan

Aplikasi ini adalah PWA statis — tidak butuh server backend. Setelah build:

1. Sajikan folder repository ini lewat static file server apa pun (mis. `npx serve .`, GitHub Pages, atau ekstensi Live Server).
2. Buka `index.html` (atau `app_production.html` — keduanya identik dan disinkronkan otomatis oleh `build.js`).
3. Data disimpan di `localStorage`/IndexedDB browser milik pengguna — tidak ada dependency server.

---

## LifeOS

LifeOS adalah lapisan orkestrasi **read-only** di atas data aplikasi inti (`D`),
dirancang untuk menyatukan lima domain personal-life-management: **Today**, **Areas**,
**Goals**, **Projects**, **Review**, dan **Knowledge**.

### Struktur LifeOS

```
lifeos/
├── lifeos-store.js          # Storage LifeOS sendiri (IDBStore key 'lifeos:store')
├── lifeos-registry.js       # Taksonomi fungsional (AREAS, TODAY_SOURCES, GOAL_SOURCES, dll.) — murni data
├── lifeos-link-registry.js  # Relasi cross-domain implisit-by-convention
├── adapters/                # Menerjemahkan data D.* -> bentuk LifeOS (read-only terhadap D)
│   ├── goal-adapter.js
│   ├── area-adapter.js
│   ├── project-adapter.js
│   ├── today-adapter.js
│   ├── review-adapter.js
│   └── knowledge-adapter.js
├── services/                # Logic di atas adapters (project/review/knowledge service)
│   ├── project-service.js
│   ├── review-service.js
│   └── knowledge-service.js
└── ui/                       # Rendering panel LifeOS
    ├── lifeos-home.js         # Entry point — LifeOSHome.render()
    ├── today.js
    ├── goals.js
    ├── projects.js
    ├── review.js
    └── knowledge.js
```

### Catatan Zero-Touch terhadap `D`

**LifeOS tidak pernah menulis ke `D`.** Ini adalah aturan arsitektur yang mengikat,
bukan sekadar konvensi:

- Tidak ada `D.projects`, `D.reviewLog`, `D.knowledge`, atau property baru apa pun
  yang ditambahkan ke `D`.
- Seluruh modul di `lifeos/adapters/*.js` hanya **membaca** array/object `D.*` yang
  sudah ada (mis. `D.renovProjects`, `D.targets`, `D.wealthSnapshots`) — tidak pernah
  memanggil `save()` milik `D`.
- **Seluruh data milik LifeOS sendiri (projects generik, review log, knowledge base)
  disimpan lewat `LifeOSStore`**, sebuah namespace penyimpanan terpisah total dari `D`,
  dipersist lewat key IDBStore sendiri (`'lifeos:store'`) di `lifeos-store.js`.
- **Dashboard hanya menjadi host UI.** `dashboard-hub.js` memanggil
  `LifeOSHome.render()` sebagai satu titik integrasi — tidak ada logic LifeOS yang
  hidup di `dashboard-hub.js` itu sendiri; seluruh logic tetap berada di dalam
  folder `lifeos/`.

### Dependency LifeOS

`scripts/build.js` memuat file `lifeos/*.js` dengan urutan dependency berikut
(wajib dijaga, lihat komentar di `scripts/build.js`):

```
lifeos-store.js
      ↓
lifeos-registry.js
      ↓
lifeos-link-registry.js
      ↓
adapters/*.js
      ↓
services/*.js
      ↓
ui/*.js
```

### Status Implementasi

| Bagian | Status |
|---|---|
| Struktur modul (`store` → `registry` → `link-registry` → `adapters` → `services` → `ui`) | ✅ Ada, mengikuti urutan dependency di atas |
| Integrasi ke `scripts/build.js` (GROUP_B) | ✅ Terpasang — seluruh 17 file `lifeos/*.js` masuk manifest build |
| Markup host (`#lifeOSWrap`, `.lifeos-panel`, dll.) di `index.html` / `app_production.html` | ✅ Ada |
| Pemanggilan `LifeOSHome.render()` dari `dashboard-hub.js` | ✅ Ada |
| `LIFEOS_AREAS` / `LIFEOS_TODAY_SOURCES` / `LIFEOS_GOAL_SOURCES` / `LIFEOS_PROJECT_LEGACY_SOURCE` / `LIFEOS_REVIEW_SOURCES` / `LIFEOS_KNOWLEDGE_REF_SOURCE` dibaca terprogram oleh adapter | ✅ Sudah — SEMUA 6 adapter (`area-adapter.js`/`today-adapter.js` Sesi 24, `goal-adapter.js` Sesi 25, `project-adapter.js` Sesi 36 bagian legacy, `review-adapter.js` Sesi 37 `reviewAdapterLatestSnapshots()`, `knowledge-adapter.js` Sesi 38 `knowledgeAdapterCatatanRef()`) sekarang registry-driven (dispatch ke `*_BUILDERS` per key; key tanpa builder dilewati aman). `goal-adapter.js`: 3 dari 6 key (`target`/`eduFund`/`wishlist`) punya builder — 3 sisanya (`pensiun`/`fi`/`debt`) sengaja belum, butuh keputusan produk/arsitektur (lihat `TODO.md`) |
| Test suite khusus untuk `lifeos/` | ✅ Ada — `tests/lifeos-area-adapter.test.js`, `tests/lifeos-today-adapter.test.js`, `tests/lifeos-goal-adapter.test.js`, `tests/lifeos-project-adapter.test.js`, `tests/lifeos-review-adapter.test.js`, `tests/lifeos-knowledge-adapter.test.js` (BARU Sesi 38), `tests/lifeos-nav.test.js` |
| Zero-touch terhadap `D` | ✅ Diverifikasi — tidak ditemukan penulisan ke `D` di modul `lifeos/` |

---

## Testing

Test suite memakai Node.js native test runner (`node --test`), dengan harness
sandbox (`loadSource`) untuk memuat file source sebagai modul non-ESM, serta
implementasi fake IndexedDB untuk pengujian `IDBStore`. Jalankan dengan:

```bash
npm test
```

**PENTING — jangan jalankan `node --test` tanpa argumen di root folder.**
Skrip `npm test` di atas sengaja membatasi pencarian ke `tests/*.test.js`
saja. `self-test.js` di root adalah file runtime UTAMA aplikasi (bukan file
test Node), tapi namanya kebetulan cocok pola default `node --test`
(`*-test.js`) — kalau dijalankan tanpa argumen, Node akan ikut memuatnya
sebagai file test dan melaporkannya "gagal" (karena isinya kode browser,
bukan test case `node:test`). Ini bukan bug aplikasi; selalu pakai
`npm test` / `npm run test:watch`, atau kalau perlu manual: `node --test
tests/*.test.js`.

---

## Lisensi

`UNLICENSED` — proyek privat (lihat `package.json`).
