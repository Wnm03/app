# S523-B — Owner Creation di Modal Pokok Dana Titipan (BUG-01)

## Root cause
`titipanCommitmentModal` (`DanaTitipanCommitmentUI.open()`) hanya mengisi
dropdown `#titipanCommitOwner` dari `listExistingOwners()` — tidak ada jalan
membuat owner baru dari modal ini. User harus muter dulu lewat "⚖️ Atur Porsi
Kepemilikan" di Investasi/Aset sebelum bisa mencatat Pokok Dana Titipan untuk
owner baru.

## Fix (minimal, reuse API existing)
- `modules/finance/dana-titipan-portfolio-presenter.js`: method baru
  `DanaTitipanCommitmentUI.addNewOwner()` — pakai `showPromptModal()` untuk
  minta nama, panggil `OwnerRegistry.findOrCreate(name)` (API resmi S489,
  sama seperti dipakai `assetOwnersModal`/`investmentOwnersModal`), lalu
  panggil ulang `open(ownerId)` supaya dropdown ter-refresh dan owner baru
  langsung terpilih. 0 ownerId manual, 0 free-text ke `saveCommitment()` —
  Design Lock S485d ("existing-owner-only") tetap utuh karena owner baru
  sudah "existing" di `listExistingOwners()` begitu `findOrCreate()`
  dipanggil (union registry, S492).
- `modules/shared/modals.js`: tombol baru "➕ Tambah Pemilik Baru"
  (`data-action="DanaTitipanCommitmentUI.addNewOwner"`) di `titipanCommitmentModal`.
  `MODAL_VERSION` → `s524-dana-titipan-ui-multiowner` (rutin, lewat build.js).

## File yang berubah
- `modules/finance/dana-titipan-portfolio-presenter.js`
- `modules/shared/modals.js`
- `tests/s523b-titipan-owner-creation.test.js` (baru, 6 test case)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (rebuild penuh, tanpa minifikasi — esbuild tidak tersedia di sandbox)
- `sw.js`, `index.html`, `app_production.html` — `?v=`/`CACHE_NAME` → 1254 (rutin)
- `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`
  — konstanta versi disamakan (rutin, `bumpVersionEverywhere()`)
- `docs/FILE-MAP.md` / `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis

## Test
- `node --test tests/s523b-titipan-owner-creation.test.js` → **6/6 lolos**.
- `node --test tests/*.test.js` → **3685/3685 lolos, 0 gagal** (3679 lama + 6 baru, **0 regresi**).

## Build
- `node scripts/build.js` — lolos semua lint blocking, termasuk
  `lintModalHtmlIndexDrift()` dan `verifyVersionConstantsSynced()`.
  Bundle valid (`node --check`), belum diminify (esbuild tidak tersedia).

## Di luar scope (tidak disentuh)
- BUG-02/03/06/12 (scoped removal + cross-domain guard) → S523-C.
- BUG-07/08 (Holding selector persistence) → S523-D.
- BUG-09 (aggregation anomaly) → S523-E (kondisional).
