# PATCH v1274 → v1275 (S542 — Rename/Hapus Kustodian dari Registry)

Lanjutan ringan pasca-`DESIGN-S540-CUSTODIAN-GROUPING.md` §Follow-up
pasca-S540 (item ringan #2 dari 2, item #1 sudah selesai di S541). Detail
lengkap: `s542-SESSION-NOTE.md`.

## Status
- **3753/3753 test PASS** (`node --test tests/*.test.js`) — 3743 baseline
  (S541) + 10 test baru.
- `node scripts/build.js s542-custodian-registry-rename-remove` dijalankan:
  versi `s541-titipan-custodian-group-subtotal` →
  `s542-custodian-registry-rename-remove`, `?v=` **1274 → 1275**,
  `CACHE_NAME` → `kw-cache-v1275`. `app_production.html` sudah
  disinkronkan ulang dari `index.html`.
- Bundle unminified (esbuild tidak tersedia di sandbox ini) — sintaks
  lolos `node --check`, 100% valid dipakai.
- Regresi ulang setelah build: 3753/3753 PASS lagi (0 perubahan angka —
  build.js hanya bump versi + regenerasi bundle).

## Apa yang berubah
- `modules/shared/custodian-registry.js` — `CustodianRegistry` nambah
  `rename(id, newName)` & `remove(id)` (pola guard/validasi sama persis
  `findOrCreate()`). `id` tidak berubah saat rename, jadi holding yang
  sudah punya `custodianId` otomatis ikut tampil nama baru di mana pun.
  `remove()` TIDAK cascading-delete ke `D.investments[]` — holding terkait
  tetap tersimpan utuh, cuma fallback ke label generik "Kustodian" &
  keluar dari grup (perilaku aman S540-D, tidak diubah).
- `modules/asset/investasi-list-view.js` — `InvestmentListUI` nambah
  `_syncCustodianActionButtons()`, `renameCustodian()`, `deleteCustodian()`.
  Hapus kustodian WAJIB konfirmasi (`askConfirm()`) yang menjelaskan
  holding TIDAK ikut terhapus.
- `modules/shared/modals.js` — `investmentModal`: tambah 2 link aksi kecil
  ("✏️ Ubah Nama Kustodian" / "🗑️ Hapus Kustodian") di bawah dropdown
  `#investCustodian`, tampil hanya saat entri kustodian nyata terpilih.
- `tests/s542-custodian-rename-remove.test.js` — baru, 10 test.
- `docs/architecture/DESIGN-S540-CUSTODIAN-GROUPING.md` — tandai item
  "Rename/hapus kustodian dari registry" selesai.
- Sisanya (`app-bundle-a/b.min.js`, `app_production.html`, `index.html`,
  `sw.js`, `modules/shared/modules-render.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md`) — HANYA hasil `scripts/build.js`
  (version-bump + regenerasi bundle + regenerasi dokumentasi
  auto-generated), 0 logic tambahan masuk lewat proses build.

## Belum dikerjakan (dicatat, bukan bagian patch ini)
**Mass assign kustodian** TETAP non-goal — sudah dicatat eksplisit di
Design Lock S540 sendiri, butuh Design Lock terpisah (keputusan UX: pilih
banyak holding sekaligus → assign 1 kustodian) sebelum dikerjakan.

## Cara pakai patch ini
Timpa file-file di atas ke lokasi yang sama di deployment v1274 kamu.
Upload SEMUA file yang berubah (bukan cuma HTML/sw.js) — bundle
(`app-bundle-a.min.js`/`app-bundle-b.min.js`) WAJIB ikut ter-upload
karena itu yang sebenarnya dijalankan browser.
