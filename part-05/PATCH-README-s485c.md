# Patch s485b → s485c

Fitur: Gap #3 (Titipan Commitment) — langkah 3/5: extend `build()` —
union owner (commitment + holding), `principalAmount`/
`estimatedUnallocated`/`overAllocatedAmount`/`allocationStatus` per
owner, totals baru. Tanpa UI/modal.

Lihat `s485c-SESSION-NOTE.md` untuk detail lengkap, dan
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` (di root repo) untuk peta 5
sesi Gap #3 secara keseluruhan.

## Cara pakai patch ini

Timpa (overwrite) file-file di bawah ini ke atas instalasi versi s485b
(build 1211). Semua path relatif terhadap root aplikasi.

## Isi patch

**File baru:**
- `tests/s485c-titipan-commitment-projection.test.js`

**File diubah (source):**
- `modules/finance/dana-titipan-portfolio-presenter.js` — extend
  `build()`. `listExistingOwners()`/`saveCommitment()`/
  `getCommitments()` TIDAK diubah.

**File test lama yang diupdate (evolusi terencana, lihat SESSION-NOTE
untuk penjelasan lengkap kenapa ini bukan regresi):**
- `tests/s484-dana-titipan-portfolio-presenter.test.js`
- `tests/s485a-titipan-commitment-owner-picker.test.js`
- `tests/s485b-titipan-commitment-crud.test.js`

**File hasil build otomatis (JANGAN diedit manual, timpa apa adanya):**
- `app_production.html`, `index.html` (hanya bump `?v=1211→1212`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `sw.js` (`CACHE_NAME` → `kw-cache-v1212`)
- `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` (semua hanya konstanta versi disamakan
  build.js ke `s485c-titipan-commitment-projection`, 0 perubahan lain)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Verifikasi setelah apply patch

```
node --test tests/*.test.js
```
Harus **3124/3124 PASS**.

## Tidak termasuk dalam patch ini (menunggu sesi berikutnya)

- **Sesi 485d:** modal `titipanCommitmentModal` + extend `render()` (UI,
  satu-satunya sesi yang mengubah markup/DOM nyata — wajib browser smoke
  test).
- **Sesi 485e:** build final + regresi penuh + dokumentasi penutup.

Tidak ada perubahan ke `ownership-engine.js`, `multi-owner-engine.js`,
`investasi.js` (termasuk `_syncTitipanDebt()`), atau `akun.js` — sudah
diverifikasi lewat diff eksplisit (lihat SESSION-NOTE).

## Known limitation (pre-existing, bukan bug baru patch ini)

Holding legacy `fundSource:'titipan'` semuanya memakai `ownerId` literal
`'titipan_investor'` — 2 orang berbeda yang memakai jalur legacy ini
collapse jadi 1 entri owner, jadi juga 1 baris `principalAmount`/
`allocationStatus` gabungan di `build()`. Tidak diperbaiki di sesi
manapun dalam rencana Gap #3 ini (di luar scope, dilarang oleh keputusan
audit).
