# PATCH — Audit lanjutan S679 (akumulasi, sudah di-build): `SETTINGS_TAB_ORDER`, `.page-title`, `AUDIT_MATRIX.md`

Patch ini sudah dijalankan lewat `node scripts/build.js` sungguhan (bukan cuma
edit source manual) — jadi bundle produksi (`app-bundle-b.min.js`) SUDAH
berisi fix-nya, bukan cuma file source. Versi naik dari **1435 → 1436**
(label build: `s680-cashflow-siklus-legacy-card`).

## Perubahan fungsional (yang benar-benar memperbaiki bug/konsistensi)

### 1. Bug: `SETTINGS_TAB_ORDER` hilang entry `pengingat`
**File sumber:** `modules/shared/pengaturan-search.js`

```js
// sebelum: 6 entry, hilang 'pengingat'
const SETTINGS_TAB_ORDER=['profil','keuangan','notifbackup','keamanan','kepemilikan','diagnostik'];
// sesudah: 7 entry, urutan sama persis dgn urutan tombol .cn-tab di DOM
const SETTINGS_TAB_ORDER=['profil','keuangan','pengingat','notifbackup','keamanan','kepemilikan','diagnostik'];
```

Dipakai sbg fallback index di `setSettingsTab(tab, el)` saat dipanggil TANPA
`el` (bukan dari klik tombol) — terbukti terjadi dari `stgSearch()` (file
ini sendiri), deep-link `DashboardHub` (`target.group`), dan
`_lifeOSHighlightSettingsCard()` (`lifeos-nav.js`). Sebelumnya kalau target
`pengingat`, tombol **"Profil"** yang salah ke-highlight `active`. Sudah
diverifikasi masuk ke `app-bundle-b.min.js` hasil build (`grep
SETTINGS_TAB_ORDER app-bundle-b.min.js` menunjukkan array 7 entry yang
benar).

### 2. Konsistensi: `.page-title` di `page-keuangan` & `page-settings`
**File:** `index.html` (sumber), `app_production.html` (auto-generated
cermin `index.html` oleh build)

Ditambahkan blok `.page-settings-btn > .page-title` (💰 Keuangan / ⚙️
Pengaturan) — pola sama dgn `page-aset`/`page-pajak` yang sudah punya ini
duluan.

### 3. Housekeeping: `docs/AUDIT_MATRIX.md` basi
Tabel "Coverage Baseline" diupdate ke angka sungguhan repo saat ini + 1
catatan drift baru. Sesudah patch ini, build melaporkan:
```
✓ Angka baseline di docs/AUDIT_MATRIX.md masih sinkron dengan repo
```
(sebelumnya `⚠️` selisih 530/254/250/2 file untuk 4 label yang di-auto-check).

## Perubahan otomatis dari build (bukan logic bisnis, TIDAK disentuh manual)

Build.js menaikkan nomor versi ke SEMUA file yang perlu disamakan sekaligus
(satu sumber kebenaran, ini perilaku standar build — lihat komentar di
`scripts/build.js`):

- `app-bundle-a.min.js`, `app-bundle-b.min.js` — rebuild ulang, **tanpa
  minifikasi** (esbuild tidak terpasang di sandbox ini — lihat catatan di
  bawah)
- `index.html`, `app_production.html` — semua `?v=` jadi `?v=1436`
- `sw.js` — `CACHE_NAME` jadi `kw-cache-v1436`
- `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` — konstanta versi (`MODAL_VERSION`,
  `MODULE_CALC_VERSION`, dst) disamakan ke `s680-cashflow-siklus-legacy-card`.
  **Diff di 5 file ini murni satu baris angka versi, 0 logic berubah** —
  sudah diverifikasi manual per file.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Sengaja TIDAK disertakan (sesuai instruksi terakhir: "lewati backup")

Build juga otomatis menulis 2 file backup timestamped ke `backups/`
(`app-bundle-a/b.min.s680-cashflow-siklus-legacy-card.<timestamp>.js`) —
**tidak ikut disertakan** di patch ini atas permintaan. Kalau dijalankan
lagi di server production, backup akan otomatis ter-generate lagi di sana
(bukan sesuatu yang perlu di-manage manual lewat patch).

## Belum dikerjakan (perlu sesi terpisah)

- **Poin #4** — 3 file source >1600 baris (`scripts/build.js` 2435,
  `modules/modules-render.js` 2165, `modules/shop/modules-render.js` 1974):
  butuh refactor besar, berisiko regresi, perlu sesi & review terpisah.
- **Poin #5** — `esbuild` belum terpasang di sandbox ini (butuh akses
  network: `npm install --save-dev esbuild`). Bundle di patch ini **valid &
  aman dipakai** (lolos `node --check`) tapi belum diminify — 1381.9 KB
  (bundle A) & 3641.5 KB (bundle B). Kalau environment deploy sungguhan
  punya akses network, jalankan `npm install --save-dev esbuild` lalu
  `node scripts/build.js` ulang di sana untuk hasil final yang diminify.

## Cara deploy
Upload **semua** file di patch ini (bukan cuma HTML) — build sengaja
menaikkan versi bersama supaya tidak ada file yang "ketinggalan" versi lama.
