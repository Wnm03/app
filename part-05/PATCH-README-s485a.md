# Patch s484 → s485a

Fitur: Gap #3 (Titipan Commitment) — langkah 1/5: fondasi data model
`D.titipanCommitments` (init lazy, belum ditulis di sesi ini) + owner
picker read-only `DanaTitipanPortfolioAPI.listExistingOwners()`.

Lihat `s485a-SESSION-NOTE.md` untuk detail lengkap, dan
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` (di root repo) untuk peta 5
sesi Gap #3 secara keseluruhan.

## Cara pakai patch ini

Timpa (overwrite) file-file di bawah ini ke atas instalasi versi s484
(build 1209). Semua path relatif terhadap root aplikasi.

## Isi patch

**File baru:**
- `tests/s485a-titipan-commitment-owner-picker.test.js`

**File diubah (source):**
- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah
  `DanaTitipanPortfolioAPI.listExistingOwners()`. `build()`/`render()`
  lama TIDAK diubah sama sekali.

**File hasil build otomatis (JANGAN diedit manual, timpa apa adanya):**
- `app_production.html`, `index.html` (hanya bump `?v=1209→1210`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `sw.js` (`CACHE_NAME` → `kw-cache-v1210`)
- `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` (semua hanya konstanta versi disamakan
  build.js ke `s485a-titipan-commitment-owner-picker`, 0 perubahan lain)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Verifikasi setelah apply patch

```
node --test tests/*.test.js
```
Harus **3098/3098 PASS**.

## Tidak termasuk dalam patch ini (menunggu sesi berikutnya)

- **Sesi 485b:** CRUD backend `D.titipanCommitments` (create/upsert,
  validasi).
- **Sesi 485c:** extend `build()` — union owner, allocation guard,
  `allocationStatus`.
- **Sesi 485d:** modal `titipanCommitmentModal` + extend `render()` (UI).
- **Sesi 485e:** build final + regresi penuh + dokumentasi penutup.

Tidak ada perubahan ke `ownership-engine.js`, `multi-owner-engine.js`,
`investasi.js` (termasuk `_syncTitipanDebt()`), atau `akun.js` — sudah
diverifikasi lewat diff eksplisit (lihat SESSION-NOTE).

## Known limitation (pre-existing, bukan bug baru patch ini)

Holding legacy `fundSource:'titipan'` semuanya memakai `ownerId` literal
`'titipan_investor'` di `Investment.getOwners()` — 2 orang berbeda yang
memakai jalur legacy ini akan collapse jadi 1 entri di
`listExistingOwners()`. Tidak diperbaiki di sesi manapun dalam rencana
Gap #3 ini (di luar scope, dilarang oleh keputusan audit).
