# CLAUDE_CONTEXT.md

> Dokumen ini BUKAN dokumentasi lengkap proyek. Ini hanya konteks minimum
> agar sesi AI baru bisa memahami repository dengan cepat. Untuk detail
> penuh, lihat Legacy Documentation (`docs/*.md`) dan `CHANGELOG.md`.
> Dibuat oleh TASK-000 (Documentation Bootstrap). Standar dokumentasi
> baru: lihat `docs/ai/README` (catatan di bagian bawah file ini).

## Apa proyek ini

**KW (Keluarga W)** — PWA manajemen keuangan, aset, bisnis, dan kendaraan
keluarga. Vanilla JavaScript, tanpa framework runtime. Dipakai personal
oleh 1 keluarga.

## Source of Truth

1. **Source Code Repository** (prioritas tertinggi)
2. `docs/ai/` (dokumen ini + PROJECT_STATUS.md + AI_HANDOFF.md)
3. Legacy Documentation (arsip, lihat bagian bawah)

Kalau ada konflik antar-ketiganya: ikuti Source Code, laporkan konfliknya.

## Struktur Kode

- **Source multi-file**: `modules/<domain>/*.js` (11 domain: shared, ai,
  self-reward, asset, business, finance, logistics, dashboard-hub, home,
  cross, shop, vehicle) + beberapa file root (`ai-chat.js`, `car-notes.js`,
  `budget.js`, dll).
- **Bundle yang dipakai app nyata**: `app-bundle-a.min.js` +
  `app-bundle-b.min.js` — dihasilkan `scripts/build.js` dari daftar
  `GROUP_A`+`GROUP_B` (urutan file eksplisit di script, BUKAN
  auto-discover). Edit source tanpa build ulang = tidak berpengaruh ke app.
- `economic-intelligence/` — engine terpisah (EIE), event bus & store
  sendiri, sengaja terisolasi dari `D`.
- `lifeos/` — subsistem Life Objects/plugin/registry.
- `tests/` — Node built-in test runner (`node --test tests/*.test.js`).

## Storage Architecture

- `D` = global mutable object (didefinisikan di
  `modules/shared/features-helpers-global-security.js`), disimpan via
  `save()` ke IndexedDB (`IDBStore`, generic helper — **lokasinya di
  `modules/asset/aset.js`**, technical debt yang sudah dicatat di komentar
  file itu sendiri). Fallback sinkron ke `localStorage['kw_v4']` hanya di
  titik kritis.
- EIE (`economic-intelligence/eie-store.js`) & LifeOS
  (`lifeos/lifeos-store.js`) masing-masing punya store sendiri di
  IndexedDB, terpisah total dari `D` — jangan disatukan.

## Build System

- `node scripts/build.js` — gabung `GROUP_A`+`GROUP_B` → 2 bundle, auto
  sinkron versi (`APP_BUILD_VERSION` dkk) ke 5 file source + `?v=` di
  kedua HTML + `CACHE_NAME` di `sw.js`. Ada lint guard bawaan (u-dnone vs
  style.display, escapeHtml hilang, OCR chicken-egg regression).
- Minifikasi via `esbuild` kalau terpasang (optional dependency) —
  fallback tetap valid tanpa minify kalau tidak ada.
- **PENTING**: menjalankan `node scripts/build.js` MENGUBAH file (bundle,
  index.html, app_production.html, sw.js, docs/FILE-MAP.md). Jangan
  jalankan kecuali memang bagian dari scope task.

## Navigasi & Modal

- `modules/dashboard-hub/dashboard-hub-registry.js` → `FEATURE_REGISTRY`
  = satu-satunya sumber taksonomi navigasi.
- `modules/shared/modals.js` → `MODAL_HTML[]` — array HTML modal, urutan
  **wajib** sinkron manual dengan urutan `document.write()` di
  `app_production.html`. ~78 modal terdaftar (per catatan lama
  "modal sweep 78/78").

## Konvensi Kerja (dari komentar kode & Legacy Docs)

- "Repository/ZIP = Source of Truth" — bukan dokumen naratif.
- Engine = pure/read-only. Presenter = 100% reuse engine, 0 rumus baru.
  Comment di tiap file domain sengaja menegaskan "0 rumus baru/100%
  reuse" — pola ini konsisten dipertahankan, ikuti kalau menambah modul
  serupa.
- Additive-only secara default kecuali ada keputusan produk eksplisit
  untuk mengubah/menghapus.

## Known Gotchas

- `IDBStore` (helper storage generik) ada di `modules/asset/aset.js`,
  bukan file storage tersendiri — jangan bingung saat mencari.
- Beberapa Legacy Docs (`NEXT_SESSION.md`, `PROJECT_STATE.md`) **stale**,
  berhenti di sekitar Sesi ~72–110 padahal source code sudah jauh di
  depan (build `kw171-...-629`). Jangan jadikan rujukan status terkini —
  gunakan `docs/ai/PROJECT_STATUS.md`.
- Penomoran sesi belum konsisten antara nama file ZIP (mis. "sesi173b")
  dan `CHANGELOG.md` (entri teratas masih "Sesi 171"). Standar penomoran
  baru menunggu keputusan Blueprint berikutnya — untuk sementara ikuti
  pola nama ZIP yang sedang aktif.

## Peran AI (BP-015 Appendix A Rev 2)

- Claude: implementasi, refactor (jika disetujui), testing, packaging.
- Tidak mengubah Blueprint/ADR/Architecture Decision sendiri. Konflik →
  laporkan, hentikan implementasi di area itu.

---
*docs/ai/ adalah standar dokumentasi AI yang baru (mulai TASK-000).
Legacy Documentation di `docs/*.md` tetap dipertahankan sebagai arsip,
tidak dihapus/diubah, akan dimigrasikan bertahap.*
