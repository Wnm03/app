# PROJECT-SUMMARY.md — Keluarga W

Dokumen ini memberi gambaran arsitektur singkat bagi developer lain
yang akan memelihara/melanjutkan project ini. Untuk peta fungsi
per-file yang selalu sinkron dengan source, gunakan `docs/FILE-MAP.md`
(auto-generated, jangan edit manual) sebagai referensi utama —
dokumen ini hanya ringkasan level-tinggi.

---

## Apa Aplikasi Ini

**Keluarga W** — PWA (Progressive Web App) manajemen keuangan, zakat,
bisnis, dan kendaraan keluarga. Vanilla JavaScript (tanpa framework),
data disimpan di `localStorage`/IndexedDB browser pengguna — tidak ada
backend/server. Dideploy statis di GitHub Pages (`wnm03.github.io`).

## Entry Point

- **`index.html`** — entry point utama aplikasi.
- **`app_production.html`** — salinan identik `index.html`, disinkronkan
  otomatis oleh `scripts/build.js` setiap build. Jangan pernah edit
  salah satu tanpa yang lain; biarkan build script yang menjaga sinkron.
- Kedua HTML memuat `app-bundle-a.min.js` dan `app-bundle-b.min.js`
  (artefak build, **tidak** disertakan di repo — dihasilkan ulang via
  `npm run build`), plus `styles.css`.

## Cara Build & Menjalankan

```bash
npm install
npm run build   # menjalankan scripts/build.js
npm test        # node --test tests/*.test.js
npm run lint    # eslint .
npm run check   # lint + test + build sekaligus
```

`build.js` membundel `GROUP_A`+`GROUP_B` (urutan file source penting —
banyak modul saling referensi lewat variabel global, lihat komentar
"PENTING: file ini HARUS dimuat sesuai urutan build.js" di banyak
file), memutakhirkan query-string versi (`?v=`) di kedua HTML dan
`CACHE_NAME` di `sw.js`, lalu menjalankan `node --check` pada kedua
bundle. `docs/FILE-MAP.md` juga di-regenerate otomatis di akhir build
sukses.

Aplikasi dijalankan cukup lewat static file server apa pun (`npx serve
.`, GitHub Pages, Live Server) — tidak butuh proses backend.

## Arsitektur

Pola **"source-file-plus-minified-bundle"**: puluhan file domain kecil
(`*.js` di root) masing-masing berisi fungsi global (bukan ES module —
tidak ada `import`/`export`), digabung `build.js` jadi dua bundle
minified sesuai urutan `GROUP_A`/`GROUP_B`. Ini bukan arsitektur
komponen/module modern — semua fungsi hidup di global scope dan saling
memanggil langsung by name, sehingga **urutan load antar file kritikal**
untuk file yang saling bergantung.

State aplikasi inti disimpan dalam satu objek global `D` (didefinisikan
+ dipersist lewat `features-helpers-global-security.js`), dengan pola
`D.save()` untuk persist ke `localStorage`. Sebagian domain besar
(Aset, GoldImport) pakai IndexedDB lewat helper `IDBStore` generik di
`aset.js`.

### Folder Utama

```
.
├── index.html / app_production.html   # entry point (identik, auto-sync)
├── styles.css                          # seluruh styling + design tokens
├── manifest.json, sw.js                # PWA manifest & Service Worker
├── *.js (root)                         # ~55 modul domain (lihat docs/FILE-MAP.md)
├── lifeos/                             # lapisan orkestrasi read-only (lihat § LifeOS)
│   ├── lifeos-store.js / lifeos-registry.js / lifeos-link-registry.js
│   ├── adapters/    # menerjemahkan data D.* -> bentuk LifeOS, read-only terhadap D
│   ├── services/    # satu-satunya tempat menulis LifeOSStore.*
│   └── ui/           # render panel LifeOS (entry: ui/lifeos-home.js)
├── scripts/                            # build & release tooling
│   ├── build.js                        # bundler GROUP_A+GROUP_B
│   ├── generate-file-map.js            # generator docs/FILE-MAP.md
│   ├── release.sh, bump-version.sh, rollback.sh
│   └── collect-app-globals.js
├── tests/                              # node --test, 1228 test
├── docs/                               # dokumentasi internal (CLAUDE.md, FILE-MAP.md, dll.)
├── archive/                            # patch lama yang sudah/tidak jadi diterapkan (riwayat)
└── backups/
```

### Komponen Utama (per Domain)

| Domain | File Utama |
|---|---|
| Render & helper global | `modules-render.js`, `modules-calc.js`, `features-helpers-global-security.js` |
| Transaksi Keuangan | `transaksi.js` + `tx-*.js` (bbm, stok-sparepart, transfer, cobek, target, list-cashflow) |
| Budget, Laporan, Car Notes | `features-budget-laporan-carnotes-pelanggan.js` |
| Shop/Cobek (bisnis) | `cobek-etalase.js`, `cobek-pricing.js`, `cobek-order.js`, `cobek-tx-cart.js`, `cobek-io.js`, `kasir.js` |
| Cicilan, Piutang/Utang | `cicilan.js`, `piutang-utang.js` |
| Aset & Kekayaan | `aset.js`, `aset-emas-impor.js` |
| Kendaraan | `vehicle-core.js`, `sparepart-servis.js`, `tukang-absensi.js` |
| Payroll & Absensi | `payroll-absensi.js`, `reset-gaji-mingguan.js`, `gaji-calc.js` |
| Scan/OCR | `scan-ocr.js` |
| Dashboard Feature Hub | `dashboard-hub.js`, `dashboard-hub-registry.js` (FEATURE_REGISTRY), `dashboard-hub-search.js`, `dashboard-hub-favorit*.js` |
| Keamanan | `keamanan-pin.js` |
| Backup/Export/Import | `backup-restore.js` |
| Filter & Laporan | `filter-laporan.js` |
| LifeOS | `lifeos/**` (lihat di atas) |

### LifeOS (Lapisan Orkestrasi)

`LifeOS` adalah lapisan **read-only** di atas data `D` yang sudah ada,
menyatukan lima domain personal-life-management: Today, Areas, Goals,
Projects, Review, Knowledge. Aturan arsitektur ketat:
- `lifeos-store.js` = **satu-satunya** tempat LifeOS menulis (key
  IndexedDB `lifeos:store`), tidak pernah menyentuh `D` atau memanggil
  `D.save()`.
- `adapters/*.js` = read-only, menerjemahkan data `D.*` lama ke bentuk
  LifeOS tanpa menulis apa pun.
- `services/*.js` = satu-satunya tempat menulis ke `LifeOSStore.*`
  masing-masing domain (mis. `project-service.js` untuk
  `LifeOSStore.projects`).
- `ui/*.js` = render-only, tidak pernah akses `D`/`LifeOSStore`
  langsung — selalu lewat adapter/service. Entry point: `ui/lifeos-home.js`.

## Design System

Seluruh token di `styles.css` (`:root` + 10 blok `[data-theme="..."]`):
- Warna: `--bg`, `--surface`–`--surface4`, `--accent`–`--accent4` (+ varian `-soft`), `--text`–`--text3`, `--border`/`--border2`
- Spacing: `--sp-1`…`--sp-11`
- Radius: `--r-xs`…`--r-full`
- Font-size: `--fs-caption`…`--fs-stat`
- Z-index: `--z-chrome`…`--z-toast`
- Motion (Tahap 7): `--dur-fast`…`--dur-slow`, `--ease-standard`, `--ease-emphasized`, `--ease-emphasized-accel`

Detail lengkap katalog token & inventaris komponen ada di
`DESIGN-SYSTEM.md` (Tahap 1). Status migrasi literal→token & rekomendasi
lanjutan ada di `KNOWN-ISSUES.md` dan `ROADMAP-v1.1.md`.

## Alur Aplikasi Singkat

1. `index.html`/`app_production.html` dimuat → memuat `styles.css` lalu
   `app-bundle-a.min.js` + `app-bundle-b.min.js` (hasil gabungan seluruh
   file source, urutan sesuai `GROUP_A`/`GROUP_B` di `build.js`).
2. State `D` di-load dari `localStorage` (migrasi data lama bila perlu,
   ditangani `features-helpers-global-security.js`).
3. Layar PIN (jika keamanan aktif) → `keamanan-pin.js`.
4. Landing page default: **Dashboard Feature Hub**
   (`dashboard-hub.js`) — satu-satunya `.page.active` saat startup.
5. Navigasi antar halaman lewat Bottom Navigation (`.nav`/`.nav-item`)
   atau Feature Hub — tidak ada router URL-based, murni toggle class
   `.page.active` per section dalam satu HTML.
6. Setiap domain (Transaksi, Budget, Aset, dst.) merender ke `.page`
   masing-masing, membaca/menulis `D` langsung, lalu `D.save()`.
7. LifeOS (opsional, di atas semua ini) menyusun ulang data `D` yang
   sama lewat adapter read-only untuk tampilan Today/Areas/Goals/dll.

## File Penting untuk Developer Baru

| File | Kenapa penting |
|---|---|
| `docs/FILE-MAP.md` | Peta lengkap 81 file source + 946 identifier global, auto-generated — cek di sini dulu sebelum grep manual. |
| `docs/CLAUDE.md` | Catatan kerja & pola berulang (cross-realm testing, async testing, dll.) dari sesi-sesi development sebelumnya. |
| `docs/FILE-MAP.md` §"PEMISAHAN-FILE-ROADMAP" (jika ada) / `archive/` | Riwayat refactoring pemisahan file besar (v89–v92+). |
| `DESIGN-SYSTEM.md` | Katalog token & komponen (Tahap 1). |
| `UI-ICON-AUDIT.md` | Audit ikon lengkap (Tahap 6). |
| `FINAL-QA.md` | Audit akhir accessibility/responsive/performance (Tahap 8). |
| `KNOWN-ISSUES.md` / `ROADMAP-v1.1.md` | Isu diketahui & backlog versi berikutnya. |
| `tests/` | Test suite `node --test`, 1228 test — jalankan sebelum & sesudah setiap perubahan. |
