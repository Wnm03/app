# FIX s562-s563 — R5: Pecah `dana-titipan-portfolio-presenter.js` jadi 3 modul

**Status: DONE.**

**Sumber:** `AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md`, Rekomendasi R5
("Setelah R2–R3 stabil: pisahkan (a) build()/aggregation logic, (b) CRUD
Commitment/Return API, (c) render/UI"). R2 (s560) dan R4 (s561) sudah
closeout; R3 (`GAP3-AUD-001`) masih **OPEN/PRE-EXISTING/OUT-OF-SCOPE** per
`docs/BUG_REGISTRY.md` — split ini TIDAK menyentuh/tidak menunggu R3 karena
sifatnya pure structural (0 rumus diubah), jadi aman dikerjakan di luar
urutan prioritas R2→R3→R5 yang disarankan audit.

## Perubahan

1. **3 file baru** di `modules/finance/`, isinya disalin APA ADANYA (0
   rumus/logic diubah) dari `dana-titipan-portfolio-presenter.js` (file
   lama, 1640 baris, **sudah dihapus**):
   - `dana-titipan-aggregation-api.js` — mendeklarasikan
     `const DanaTitipanPortfolioAPI = {...}` berisi `_holdingSplits()`,
     `_asetOwnersForTitipan()`, `_assetSplits()`, `allocatedExcluding()`,
     `build()`, `listExistingOwners()`.
   - `dana-titipan-commitment-return-api.js` — `Object.assign
     (DanaTitipanPortfolioAPI, {...})` menambah `getCommitments()`,
     `saveCommitment()`, `deleteCommitment()`, `removeOwnerLinkage()`,
     `getReturns()`, `recordReturn()`, `deleteReturn()` ke objek yang
     SAMA (bukan objek baru — WAJIB dimuat setelah file 1, karena pakai
     `Object.assign` bukan `const` baru, supaya tidak redeclare identifier
     di scope global yang sama).
   - `dana-titipan-portfolio-render.js` — `DanaTitipanPortfolioPresenter`,
     `DanaTitipanCommitmentUI`, `DanaTitipanReturnUI` (WAJIB dimuat
     setelah file 1 & 2 — semua panggilan API di sini sudah
     fully-qualified `DanaTitipanPortfolioAPI.xxx()`, bukan `this.xxx()`,
     jadi 0 perubahan diperlukan akibat split).

2. **`scripts/build.js`** — entry bundle diganti jadi 3 entry berurutan
   (aggregation-api → commitment-return-api → render), komentar terkait
   diupdate.

3. **35 file test** di `tests/` — array `files` yang tadinya cuma 1 nama
   file lama diganti jadi 3 entry file baru (urutan sama). 4 test yang
   baca **raw source text** (`presenterSrc = fs.readFileSync(...)`)
   diarahkan ke `dana-titipan-portfolio-render.js` (lokasi baru
   `DanaTitipanCommitmentUI`/`DanaTitipanReturnUI`/`render()`):
   `s523b-titipan-owner-creation`, `s486-titipan-commitment-return`,
   `s521-titipan-expense-ui`, `s485d-titipan-commitment-ui`.

4. **Fix tambahan yang ditemukan blocking (di luar scope R5, tapi
   diperbaiki karena diinstruksikan langsung oleh pesan error tooling
   build-nya sendiri):** `MODAL_VERSION` di `modules/shared/modals.js`
   masih `'s558-tx-asset-hint-generic-copy'` (stale dari sesi sebelumnya,
   tidak ikut ter-bump saat sesi lain menaikkan konstanta versi lain) —
   disamakan manual supaya `verifyVersionConstantsSynced()` lolos.

5. File lama `modules/finance/dana-titipan-portfolio-presenter.js`
   **dihapus** setelah semua caller dipastikan pindah ke 3 file baru.

## Test

- Full regression (`node --test tests/*.test.js`): **3960 test, 3954
  pass, 6 fail** — 6 kegagalan semua di
  `tests/s551-investment-owners-nominal-readonly.test.js`
  (`ctx.InvestmentUI._ownerNominalText is not a function`).
  **Dikonfirmasi PRE-EXISTING, tidak terkait split ini**: root cause
  adalah `investasi-view.js` Sesi 552 me-rename `_ownerNominalText()` →
  `_ownerNominalValue()`, tapi test S551 lama tidak pernah
  diupdate/diretire. Dibuktikan lewat repro manual pakai file LAMA
  (sebelum dihapus) — hasil sama (`undefined`), jadi 100% independen
  dari pemecahan file titipan.
- Setelah file lama dihapus & build ulang: regresi diulang, hasil identik
  (3954/3960, kegagalan sama, 0 regresi baru dari penghapusan).

## Build

- `node scripts/build.js` sukses 2x berturut (v1291 lalu v1292/
  `s563-modal-sweep-datahealth-fixes`) — sekali untuk verifikasi split,
  sekali lagi setelah file lama dihapus.
- Peringatan "file source kegedean" (`OVERSIZED_FILE_ALLOWLIST` check):
  `dana-titipan-portfolio-presenter.js` (1641 baris) **sudah tidak
  muncul lagi** di daftar peringatan setelah split+delete (dari 8 file
  jadi 7 file yang masih di atas ambang 1600 baris — sisanya di luar
  scope R5).
- `node --check` lolos untuk kedua bundle hasil build.

## Temuan sampingan (di luar scope R5, BELUM diputuskan — jangan diperbaiki
diam-diam di sesi lanjutan tanpa konfirmasi user)

- `tests/s551-investment-owners-nominal-readonly.test.js` adalah test
  usang (stale) sejak Sesi 552 (domain Investasi/`investasi-view.js`,
  bukan Dana Titipan). Kandidat: update assertion ke
  `_ownerNominalValue()`, atau retire test kalau sudah fully-superseded
  oleh test S552.

## File yang berubah

- BARU: `modules/finance/dana-titipan-aggregation-api.js`
- BARU: `modules/finance/dana-titipan-commitment-return-api.js`
- BARU: `modules/finance/dana-titipan-portfolio-render.js`
- HAPUS: `modules/finance/dana-titipan-portfolio-presenter.js`
- UBAH: `scripts/build.js` (bundle file list + komentar)
- UBAH: `modules/shared/modals.js` (sync `MODAL_VERSION`, blocking fix
  tak terkait — lihat §4 di atas)
- UBAH: 35 file di `tests/` (file list load order; 4 di antaranya juga
  fix path `readFileSync` raw source)
- REGENERASI (otomatis oleh `scripts/build.js`): `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
- UPDATE: `AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md` (§R5 + tabel
  Ringkasan Prioritas ditandai DONE, temuan sampingan s551 ditambahkan)
