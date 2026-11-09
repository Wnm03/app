# Fase 2A — S2761 (akumulasi di atas S2760)

## Yang dikerjakan (belum ada di S2760)
Fase 2 (RENCANA-UPGRADE-FRONTEND.md §D) dimulai dengan irisan terkecil yang aman: **sistem ikon SVG tunggal** untuk header dan FAB, plus sisa Fase 1C (teks inline <12px).

- `index.html` (+ cermin `app_production.html`): sprite `<symbol>` (`i-search`, `i-settings`, `i-backup`, `i-alert`, `i-plus`) di awal `<body>`; header 🔎 ⚙️ 💾 dan FAB "＋" diganti `<svg class="ico"><use href="#i-*">`. `aria-label`, `role`, `data-action`, `#selfTestNavBadge` tidak berubah.
- `modules/shared/backup-restore.js`: 4 tempat yang menimpa `#backupBadge` dengan `textContent` emoji (💾/⚠️) → `innerHTML` berisi ikon SVG (`i-backup` / `i-alert`), termasuk `btnOriginal` yang sudah berupa innerHTML.
- `pwa-ui-layer.css`: aturan mobile `#backupBadge::before{content:'💾'}` (menyembunyikan label + menyuntik emoji) → `content:none`; label tetap tersembunyi di mobile, ikon SVG tampil.
- `tokens.css`: kelas `.ico` (garis 2px, `currentColor`), ukuran ikon header/FAB. Tetap tanpa `!important`.
- `modern-ui-layer.css`: blok "FASE 2A": lantai 12px untuk `style="font-size:9/9.5/10/10.5/11px"` inline yang ditulis renderer JS (selector atribut, **1 deklarasi `!important`** — atribut inline tidak bisa dikalahkan selector biasa; mudah di-rollback dengan menghapus blok).
- Tes: `tests/fase2a-s2761-icons.test.js` (6 tes); `tests/fase1c-s2760-floor-touch.test.js` dibuat tidak rapuh (blok 1C dipotong sebelum blok 2A; cache-bust versi-agnostik, ≥2760).
- Build resmi versi 2761 (`SKIP_LINT=1 node scripts/build.js s2433-fase2a-icons-2761`).

## Verifikasi yang benar-benar dijalankan
- Browser (Playwright + Chromium, 3 viewport, seed sintetis, `tools/capture-fase1b-extended.py`): 60 screenshot, 0 missing_controls, 0 error console/page, 0 overflow horizontal. Header & FAB diperiksa visual di mobile 390.
- Teks <12px (jumlah semua keadaan): mobile 7 → **0**, tablet 9 → **2**, desktop 9 → **2**. Kontrol <40px tidak berubah (33 / 24 / 127).
- Tes fokus Fase 0/1/1B/1C/2A: lulus. Full suite `node --test tests/*.test.js`: lihat PATCH-MANIFEST.md.
- Release lint/minify penuh belum dijalankan (`SKIP_LINT=1`, tanpa jaringan).

## Belum dikerjakan (apa adanya)
- Fase 2 sisa: emoji di judul kartu/tab/ListRow/qs-action/menu FAB (±ratusan kemunculan, sebagian dihasilkan JS) dan komponen inti (StatTile, SegmentedControl, TabBar...) + migrasi halaman.
- Fase 3 (navigasi ≤2 tingkat, satu entry point pencarian, hero → baris ringkas), Fase 4 (layout desktop/tablet), Fase 5 (tema bermakna, PIN lock, skeleton).
- `!important` 185 + 1 (blok 2A), `@layer` belum.
- Kontrol <40px desktop (127) menunggu Fase 4; sisa mobile/tablet berupa utility class + `data-action` tanpa selector aman.
- Uji perangkat Android nyata belum dilakukan.
