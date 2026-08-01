# Patch s348 — Audit ulang: 1 modul terlewat (AlokasiAset)

Lanjutan Sesi 347 (30 modul). User minta audit ulang untuk memastikan tidak
ada bug window-expose serupa yang tersisa. Scan otomatis seluruh
source-tree (bukan cuma file yang sudah dicurigai) menemukan **1 modul
lagi**: `AlokasiAset` di `modules/asset/aset.js`.

File ini punya 10 const top-level; Sesi 346 hanya menemukan & memperbaiki
`Aset` di file yang sama, `AlokasiAset` (const terpisah) luput. Root cause
sama persis: 3 tombol chip risiko alokasi aset (Konservatif/Moderat/Agresif
di `app_production.html`/`index.html`) pakai
`data-action="AlokasiAset.setRisk"` yang gagal diam-diam tanpa
`window.AlokasiAset`.

**Fix**: satu baris `if (typeof AlokasiAset !== 'undefined')
window.AlokasiAset = AlokasiAset;` setelah `}` penutup objek. 0 perubahan
logic/routing lain. Detail: `FIX-v1012-s348-window-expose-audit-alokasiaset.md`.

**Audit ulang menyeluruh** (const/let/var, termasuk cek deklarasi ganda
antar file) mengonfirmasi TIDAK ADA modul lain yang bermasalah — 30 modul
Sesi 347 + 14 modul Sesi 345/346 semuanya sudah benar.

File lain dalam patch ini:
- `tests/window-expose-audit-s348.test.js` — 3 test regresi baru.
- `docs/CHECKPOINT.md` — entri Sesi 348 ditambahkan di atas.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — di-generate ulang
  otomatis, sekarang termasuk `AlokasiAset`.
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — konstanta versi
  naik (`s347-...` -> `s348-fix-window-expose-audit-alokasiaset`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis, `?v=1011`
  -> `?v=1012`.

Cara pakai: timpa semua file di atas di project kerja Anda (struktur folder
sama persis, bertumpuk dengan patch s347 sebelumnya), lalu `npm test` untuk
verifikasi (harus 2402/2402 pass). Tidak perlu `node scripts/build.js`
lagi — bundle & `?v=` di patch ini sudah hasil build final.

## Test

`node --test tests/*.test.js` -> **2402/2402 pass, 0 fail** (2399 lama + 3
baru), 2x (sebelum & sesudah build).

## Build

`node scripts/build.js s348-fix-window-expose-audit-alokasiaset` -> sukses,
`?v=1012`.
