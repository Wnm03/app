# PATCH KUMULATIF FASE 0–5C + 3D + 4B + 4B2 + 4C — S2775

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2774. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2775.txt`; laporan: `FASE4C-S2775-REPORT.md`.

## Tambahan S2775 (Fase 4C, Rencana §C.5)
- CSS saja: grid 2 kolom di tablet (ringkasan Aset/Mobil 768–1279px; daftar kartu Aset/Shop 768–1023px) dan form edit Transaksi/Aset/Produk sebagai panel kanan di ≥1280px. Bukan master–detail penuh (panel tetap modal).
- Versi 2775 (`SKIP_LINT=1`). Tes baru: `tests/fase4c-s2775-tablet-grid-detail-panel.test.js` (6 tes).

## Verifikasi yang benar-benar dijalankan
- Full suite: 9572 tes, 9556 lulus, 15 gagal. Daftar 15 itu identik dengan S2774 dan seluruhnya juga gagal di baseline `app-main (5)` mentah (baseline: 9493 tes, 40 gagal). 0 kegagalan baru. Gate `verify-bundle-freshness` dan `verify-window-expose` lulus; hash 58/58 cocok.
- Belum: tampilan di browser (tanpa Chromium), master–detail JS, lint/minify penuh, Safari/Firefox, Android.

---
(Riwayat S2774 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5C + 3D + 4B + 4B2 — S2774

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2773. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2774.txt`; laporan: `FASE4B2-S2774-REPORT.md`.

## Tambahan S2774 (Fase 4B lanjutan, Rencana §D Fase 4)
- Tabel padat di layar ≥1024px untuk semua tema pada: daftar Aset, Dana Titipan (owner, holding, riwayat pengembalian), dan produk Etalase Shop (tabel baru). <1024px tetap kartu; data, filter, dan aksi tidak berubah. Render ulang otomatis saat melintasi breakpoint.
- Versi 2774 (`SKIP_LINT=1`). Tes baru: `tests/fase4b2-s2774-wide-tables-aset-titipan-shop.test.js` (8 tes).

## Verifikasi yang benar-benar dijalankan
- Full suite: 9566 tes, 9550 lulus, 15 gagal. Ke-15 itu sama dengan daftar kegagalan S2773 dan seluruhnya juga gagal di baseline `app-main (5)` mentah (baseline: 9493 tes, 40 gagal; 25 sisanya teratasi rantai patch). 0 kegagalan baru. Gate `verify-bundle-freshness` dan `verify-window-expose` lulus; `refresh-file-hashes --check` 58/58 cocok.
- Belum: tampilan di browser (tanpa Chromium di sesi ini), master–detail, grid tablet, lint/minify penuh, Safari/Firefox, Android.

---
(Riwayat S2773 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5C + 3D + 4B — S2773

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2772. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2773.txt`; laporan: `FASE4B-S2773-REPORT.md`.

## Tambahan S2773 (Fase 4B, Rencana §D Fase 4)
- Daftar transaksi Uang (#allTx) dan Riwayat memakai tabel padat (`txTableHTML`) di layar ≥1024px untuk semua tema (sebelumnya hanya tema modern). <1024px dan data/handler tidak berubah. Render ulang otomatis saat melintasi breakpoint.
- Versi 2773 (`SKIP_LINT=1`). Tes baru: `tests/fase4b-s2773-wide-tx-table.test.js` (6 tes).

## Verifikasi yang benar-benar dijalankan
- Full suite: 9558 tes, 15 gagal — identik dengan S2771/baseline (0 kegagalan baru).
- Belum: tampilan di browser (tanpa Chromium di sesi ini), lint/minify penuh, Safari/Firefox, Android.

---
(Riwayat S2772 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5C + 3D — S2772

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2771. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2772.txt`; laporan: `FASE3D-S2772-REPORT.md`.

## Tambahan S2772 (Fase 3D, Rencana §A#2)
- Keuangan: chip periode Kelola > Transaksi dan Laporan dilipat jadi dropdown "Periode" di dalam konten (3 → 2 baris). Chip asli tetap di DOM sebagai sumber kebenaran; handler periode tidak berubah. Aset sudah 1 baris (tidak diubah).
- Versi 2772 (`SKIP_LINT=1`). Tes baru: `tests/fase3d-s2772-keuangan-periode.test.js` (5 tes).

## Verifikasi yang benar-benar dijalankan
- Full suite: 9552 tes, 15 gagal — identik dengan S2771 dan juga gagal di baseline (0 kegagalan baru). Gate bundle-freshness dan window-expose lulus.
- Belum: ukur baris tab di browser (tanpa Chromium di sesi ini), lint/minify penuh, Safari/Firefox, Android.

---
(Riwayat S2771 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5C — S2771

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2769. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2771.txt`; laporan: `FASE5C-S2771-REPORT.md`.

## Tambahan S2771 (Fase 5C — layar kunci PIN)
- Umpan balik PIN salah (titik error, getar singkat, pesan inline aria-live), token `--pin-error` per tema (kontras ≥5,9:1), tombol PIN mengikuti token tema. Logika verifikasi/penguncian tidak diubah. Tes baru: `tests/fase5c-s2770-pin-screen.test.js` (4 tes). Capture: `docs/screenshots-fase5c/`.
- Versi 2771 (`SKIP_LINT=1`). Belum: empty state, skeleton, transisi halaman; Safari/Firefox, Android, pembaca layar.

---
(Riwayat S2769 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5B — S2769

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2768. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2769.txt`; laporan: `FASE5B-S2769-REPORT.md`.

## Tambahan S2769 (Fase 5B, Rencana §A#4 — setelah audit)
- `tokens.css` blok FASE 5B (tanpa `!important`): `--density`, `--card-pad`, `--card-radius`, `--font-num` kini diset per tema dan dibaca `.card` serta angka uang. Dark/Light = lega (kartu 14px/14px, density 1, Space Grotesk); Graphite/Modern = padat (10px/10px, density .8, monospace). Desktop ≥900px: Dark/Light tetap 20px/18px (tidak berubah), padat 16px/14px.
- `--text2` Modern #6b6b6b → #686868 (kontras 4,35 → 4,55:1 di `--surface3`). Light tidak perlu diubah (5,25:1). `--density:.86` desktop lama (tidak terpakai) dihapus.
- Versi 2769 (`SKIP_LINT=1`). Tes baru: `tests/fase5b-s2769-theme-tokens.test.js` (5 tes). Alat: `tools/capture-fase5b.py`.

## Verifikasi yang benar-benar dijalankan
- Chromium 390/768/1440 × 4 tema × 8 halaman, sebelum vs sesudah: geometri kartu dan font angka dibandingkan; Dark/Light desktop identik; 0 error console, 0 scroll horizontal. Capture Keuangan 4 tema × 2 viewport di `docs/screenshots-fase5b/`.
- Full suite: lihat `FASE5B-S2769-REPORT.md` / ringkasan sesi. Lint/minify penuh, Safari/Firefox, Android belum.

## Belum dikerjakan
- Fase 5 sisa: layar PIN, empty state, skeleton, transisi halaman. Tipografi/radius per komponen Graphite (129 selektor). `!important` 186, `@layer` belum.

---
(Riwayat S2768 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–5A — S2768

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2767. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2768.txt`; laporan: `FASE5A-S2768-REPORT.md`.

## Tambahan S2768 (Fase 5A, Rencana §A#4)
- Dropdown tema onboarding (`index.html`, `app_production.html`) hanya menawarkan tema kanonik: Dark, Light, Otomatis, Graphite, Modern. Opsi Ocean/Stone/Slate dihapus karena hanya alias (ocean→dark, stone→light, slate→graphite) yang dibuang `canonicalizeTheme()`. Perilaku tema tidak berubah; pemilih tema Pengaturan sudah kanonik sejak sebelumnya.
- Koreksi audit: tema `modern` (tabel padat Ledger Pro) SUDAH bisa dipilih di Pengaturan; yang tidak ada hanya di onboarding, kini ditambahkan.
- Versi 2768 (`SKIP_LINT=1`). Tes baru: `tests/fase5a-s2768-onboarding-themes.test.js` (2 tes).

## Verifikasi yang benar-benar dijalankan
- Chromium: onboarding dengan modern/graphite/auto/dark → `D.profile.theme` dan `data-theme` benar (auto→dark pada jam ini), 0 error.
- Full suite: 9538 tes, 15 gagal — identik dengan S2760–S2767 (0 kegagalan baru). Lint/minify penuh, Safari/Firefox, Android belum.

## Belum dikerjakan
- Fase 5: tema yang benar-benar berbeda (kontras, radius, kepadatan), layar kunci PIN, empty state, skeleton, transisi halaman.
- Tabel padat untuk semua tema di ≥1024px (butuh ubah gating S637 + tes), master–detail 4B, grid tablet.
- Fase 2 sisa (emoji label tab Mobil butuh persetujuan ubah tes S1903/S1921; emoji hasil JS; komponen inti), satu mesin pencarian. `!important` 186, `@layer` belum.

---
(Riwayat S2767 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–4A — S2767

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2765. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2767.txt`; laporan: `FASE4A-S2767-REPORT.md`. (Nomor 2766 terlewati: build otomatis menaikkan versi pada build kedua.)

## Tambahan S2767 (Fase 4A, setelah audit dan persetujuan)
- `tokens.css` blok FASE 4A (tanpa `!important`, hanya ≥1280px): lebar Beranda disamakan 1208px; ringkasan Aset dan Car Notes (Insight, Rekomendasi, BBM) jadi grid 2 kolom, elemen non-kartu dan kartu Insight tetap lebar penuh. Mobile/tablet tidak berubah. Keuangan Kelola sengaja tidak dijadikan 2 kolom (hasilnya timpang).
- Sidebar desktop (≥1024px): "Tambah" dipisah dari daftar menu dengan garis pemisah.
- Ikon pencarian header: `title="Cari (Ctrl+K atau /)"` di `index.html` dan `app_production.html`.
- Versi 2767 (`SKIP_LINT=1`). Tes baru: `tests/fase4a-s2767-wide-layout.test.js` (3 tes).

## Verifikasi yang benar-benar dijalankan
- Chromium 390/768/1280/1440/1920: 0 error console, 0 scroll horizontal; kartu Aset/Mobil 576px di 1440 (2 kolom), mobile/tablet tetap 366/744px.
- Full suite: 9536 tes, 15 gagal — identik dengan S2760–S2765 (0 kegagalan baru). Lint/minify penuh, Safari/Firefox, Android, capture ulang 60 screenshot belum.

## Belum dikerjakan
- Fase 4: tabel padat riwayat transaksi/produk (menyentuh render JS; ditunda menunggu persetujuan), master–detail (Fase 4B), grid tablet 768.
- Fase 2 sisa (emoji label tab Mobil butuh persetujuan ubah tes S1903/S1921; emoji hasil JS; komponen inti), satu mesin pencarian, Fase 5. `!important` 186, `@layer` belum.

---
(Riwayat S2765 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–3C — S2765

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2764. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2765.txt`; laporan: `FASE3C-S2765-REPORT.md`.

## Tambahan S2765
- Fase 3C (Rencana §A#2): baris chip periode BBM/Servis (tingkat 3) → satu dropdown "Periode" di dalam konten (`pwa-ux-performance.js`). Chip asli tetap di DOM (disembunyikan) dan menjadi sumber kebenaran; dropdown meneruskan klik ke chip, jadi `setCnPeriode()`/`cnPeriodeByTab` tidak berubah. Baris tab Mobil: BBM 3→2, Insight 2, Servis 2.
- Fase 3C (Rencana §A#8): tile "Cari Fitur" ganda di Beranda disembunyikan (CSS, markup & handler tetap); shortcut `/` dan Ctrl/⌘+K membuka pencarian yang sama dengan ikon header (tidak aktif saat mengetik atau saat modal terbuka).
- Hero → baris ringkas: sudah selesai di S2764 (Mobil 95→73px, Pajak 156→134px).
- Build resmi versi 2765 (`SKIP_LINT=1`). Tes baru: `tests/fase3c-s2765-nav-search.test.js` (4 tes).

## Verifikasi yang benar-benar dijalankan
- Browser (Chromium, mobile 390 + desktop 1440): jumlah baris tab diukur; dropdown periode mengubah `cnPeriode` dan chip aktif; periode BBM dan Servis tetap independen; Ctrl+K membuka modal pencarian; tile "Cari Fitur" tidak terlihat; 0 error console/page.
- Full suite: 9533 tes, 15 gagal — identik dengan S2760–S2764 (0 kegagalan baru). Lint/minify penuh belum; Safari/Firefox, uji Android, dan capture ulang 60 screenshot belum.

## Belum dikerjakan
- Fase 2 sisa: emoji pada label tab Mobil dan emoji hasil JS (tes S1903/S1921 mengunci label emoji → perlu persetujuan mengubah kontrak tes); komponen inti (StatTile, ListRow, EmptyState).
- Fase 3: pencarian fitur (Beranda) dan pencarian data (ikon header) masih dua mesin terpisah; pencarian Pengaturan tetap lokal. Layout tablet Shop (hero 274px).
- Fase 4–5. `!important` 186, `@layer` belum.

---
(Riwayat S2764 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–3B — S2764

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2763. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2764.txt`; laporan: `FASE3B-S2764-REPORT.md`.

## Tambahan S2764
- Fase 3B (hero ringkas, Rencana §A#9): judul hero Shop/Mobil/Pajak diganti dari copy promosi ke judul fungsional satu baris ("Penjualan, stok, dan pelanggan", "Biaya kendaraan", "Pajak dan zakat"). `id`/`aria-labelledby`, paragraf, dan aksi tidak berubah. Tinggi hero mobile: Mobil 95→73px, Pajak 156→134px (Shop tetap 80). Tes: `tests/fase3b-s2764-hero-copy.test.js`.
- Build resmi versi 2764 (`SKIP_LINT=1`).

## Verifikasi yang benar-benar dijalankan
- Browser (Chromium, 3 viewport): 60 screenshot, 0 error console/page, 0 overflow; teks <12px 0/2/2, kontrol <40px 33/24/127 (tidak berubah). Tinggi hero diukur langsung.
- Full suite: 9529 tes, 15 gagal — identik dengan S2760–S2763 (0 kegagalan baru). Lint/minify penuh belum; uji Android belum.

## Belum dikerjakan
- Fase 3 sisa: tab Mobil maksimal 2 tingkat, satu entry point pencarian. Layout tablet Shop (hero 274px) belum disentuh. Fase 2 sisa, Fase 4–5. `!important` 186, `@layer` belum.

---
(Riwayat S2763 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–3A — S2763

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2762. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2763.txt`; laporan: `FASE3A-S2763-REPORT.md`.

## Tambahan S2763
- Fase 3A (indikator scroll tab bar, Rencana §A#2): `tokens.css` blok "FASE 3A" — fade tepi kiri/kanan scroll-driven (`animation-timeline: scroll(self inline)` + `@property`), muncul hanya bila ada konten tersembunyi di sisi itu. Berlaku untuk `.cn-tabs`, `.segmented-control`, `.ai-suggest`, `.filter-scroll`, `.trs-chip-row`, `.kasir-kat-chips`, dan tab bar halaman (Keuangan/Shop/Aset/Pajak/Pengaturan/Mobil). Tanpa JS, tanpa `!important`; browser tanpa dukungan tetap seperti sebelumnya. Tes: `tests/fase3a-s2763-tab-fade.test.js`.
- Build resmi versi 2763 (`SKIP_LINT=1`).

## Verifikasi yang benar-benar dijalankan
- Browser (Chromium): mask diukur di posisi awal/tengah/akhir scroll pada Keuangan, Aset, AI — fade kiri nol di awal, dua sisi di tengah, kanan nol di akhir. Capture 3 viewport: 60 screenshot, 0 error console/page, 0 overflow; teks <12px 0/2/2, kontrol <40px 33/24/127 (tidak berubah).
- Full suite: 9527 tes, 15 gagal sebelum pembaruan hash — identik dengan S2760–S2762; tes hash (S256AU) lulus setelah `refresh-file-hashes.py --write`. Lint/minify penuh belum dijalankan; Safari/Firefox belum diuji (fallback: tanpa fade); uji Android belum.

## Belum dikerjakan
- Fase 3 sisa: tab maksimal 2 tingkat (Mobil 4 baris), satu entry point pencarian, hero → baris ringkas. Fase 2 sisa (emoji berwarna/JS, komponen inti), Fase 4–5. `!important` 186, `@layer` belum.

---
(Riwayat S2762 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–2B — S2762

## Basis dan penerapan
- Baseline: `app-main` dari `app-main (5).zip`. Overlay; hanya file yang berbeda dari baseline; mempertahankan S2757–S2761. Tidak ada file dihapus. Daftar: `CHANGED-FILES-S2762.txt`; laporan: `FASE2B-S2762-REPORT.md`.

## Tambahan S2762
- Fase 2B: 32 emoji ikon (⚙️ 19, 🔍 7, 💾 5, 🔎 1) pada text node markup statis `index.html` (judul kartu, tombol "Atur", judul modal, qs-action) → ikon sprite `<use href="#i-*">`. Placeholder input tetap emoji (atribut tidak bisa memuat SVG).
- Build resmi versi 2762 (`SKIP_LINT=1`). Tes baru: `tests/fase2b-s2762-static-icons.test.js`.

## Verifikasi yang benar-benar dijalankan
- Browser capture (3 viewport, seed sintetis): 60 screenshot, 0 missing_controls, 0 error console/page, 0 overflow; teks <12px 0/2/2, kontrol <40px 33/24/127 (tidak berubah).
- Full suite: 9524 tes, 15 gagal — identik dengan S2760/S2761 (0 kegagalan baru). Lint/minify penuh belum dijalankan; uji Android belum.

## Belum dikerjakan
- Emoji lain (warna/konten: 💚🔴⛽🔧📋🎯 dst.) dan emoji yang dihasilkan JS; komponen inti; Fase 3–5. `!important` 186, `@layer` belum.

---
(Riwayat S2761 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–2A — S2761

## Basis dan penerapan

- Baseline: `app-main` dari `app-main (5).zip`. Terapkan ZIP ini sebagai overlay; bukan full release. Tidak ada file yang dihapus.
- Berisi HANYA file yang berbeda dari baseline; mempertahankan seluruh isi S2757–S2760. Daftar: `CHANGED-FILES-S2761.txt`; laporan: `FASE2A-S2761-REPORT.md`.

## Tambahan S2761

- Fase 2A: sprite ikon SVG (`i-search/settings/backup/alert/plus`) menggantikan emoji di header (🔎 ⚙️ 💾) dan FAB "＋"; badge Backup di `backup-restore.js` memakai ikon SVG; emoji `::before` mobile di `pwa-ui-layer.css` dihapus.
- Sisa Fase 1C: lantai 12px untuk `style="font-size:9–11px"` inline (satu blok `!important` di `modern-ui-layer.css`).
- Build resmi versi 2761 (`SKIP_LINT=1`).

## Verifikasi yang benar-benar dijalankan

- Browser capture (Playwright + Chromium, 3 viewport, seed sintetis): 60 screenshot, 0 missing_controls, 0 error console/page, 0 overflow horizontal. Teks <12px: mobile 7→0, tablet 9→2, desktop 9→2.
- Tes fokus Fase 0/1/1B/1C/2A: lulus. Full suite `node --test tests/*.test.js` (overlay di baseline app-main (5)): 9522 tes, 15 gagal — 15 itu identik dengan yang gagal di S2760 (0 kegagalan baru).
- Release lint/minify penuh belum dijalankan (`SKIP_LINT=1`, tanpa jaringan). Uji perangkat Android nyata belum dilakukan.

## Status teknis

- `!important`: 186 (185 + 1 blok 2A). `@layer`: belum. Fase 2 sisa, Fase 3–5: belum dimulai.

---
(Riwayat S2760 dan sebelumnya di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–1C — S2760

## Basis dan penerapan

- Baseline: `app-main` dari `app-main (5).zip`. Terapkan ZIP ini sebagai overlay; bukan full release. Tidak ada file yang dihapus.
- Mempertahankan seluruh isi S2757–S2759. Daftar perubahan: `CHANGED-FILES-S2760.txt`; laporan: `FASE1C-S2760-REPORT.md`.

## Tambahan S2760

- CSS: lantai 12px sisa teks sekunder (`tokens.css`) dan target sentuh 44px aksi kartu Etalase/Akun/export (`modern-ui-layer.css`).
- `tools/capture-fase1b-extended.py`: jalur modal diperbaiki + metrik per screenshot. Hasil capture nyata di `docs/screenshots-fase1b/`.
- Build resmi versi 2760 (bundle, HTML, `sw.js`, konstanta versi) — memperbaiki ketidaksinkronan versi sejak S2757 (tes SA13 dan 9 tes sinkron-versi lain).

## Verifikasi yang benar-benar dijalankan

- Browser capture: 60 screenshot, 0 missing_controls, 0 error console/page, 0 overflow horizontal (3 viewport, seed sintetis).
- Tes fokus Fase 0/1/1B/1C + SA13: PASS.
- Full suite `node --test tests/*.test.js` (overlay di baseline app-main (5)): S2759 asli 25 gagal, S2760 sesudah hash diperbarui 15 gagal; 15 tersebut juga gagal di S2759 asli (0 kegagalan baru). 10 tes sinkron-versi yang gagal di S2759 kini lolos.
- Release lint/minify penuh belum dijalankan (`SKIP_LINT=1`, tanpa jaringan).

## Status teknis

- `!important`: 185 (tidak berubah). `@layer`: belum. Fase 2–5: belum dimulai.
- Sisa temuan capture: lihat bagian "Sisa" di `FASE1C-S2760-REPORT.md`.

---
(Riwayat S2759 di bawah dipertahankan)

# PATCH KUMULATIF FASE 0–1B — S2759

## Basis dan penerapan

- Baseline: `app-main` dari `app-main (5).zip`.
- Patch induk: `PATCH-KUMULATIF-fase0-fase1-fase1b-s2758.zip`.
- S2759 mempertahankan seluruh isi patch S2758 dan menambahkan runner capture serta tes cakupan.
- Terapkan sebagai overlay ke baseline; ZIP ini bukan full release.
- Tidak ada file yang dihapus; `DELETE-FILES.txt` tidak diperlukan.

## Tambahan S2759

- `tools/capture-fase1b-extended.py`: capture otomatis sub-tab Finance/Laporan, Dana Titipan, 8 tab Shop, dan modal tambah transaksi pada tiga viewport.
- `tests/fase1b-extended-capture-coverage.test.js`: guard statis cakupan runner dan markup.
- `FASE1B-S2759-REPORT.md`: laporan perubahan dan hasil verifikasi.
- `CHANGED-FILES-S2759.txt` dan `FILE-HASHES-SHA256.txt`: daftar perubahan dan integritas.

## Batas klaim

- Tes fokus: 10/10 PASS; Python syntax check PASS.
- Browser capture belum menghasilkan screenshot di sandbox; jalankan runner pada mesin yang mengizinkan Chromium/localhost.
- Full suite dan release lint/minify belum PASS/terverifikasi.
- Jumlah `!important` tetap 185; `@layer` belum dimigrasikan.

## Riwayat yang dipertahankan

Seluruh file dan perbaikan S2757 serta S2758 tetap berada dalam ZIP kumulatif ini.
