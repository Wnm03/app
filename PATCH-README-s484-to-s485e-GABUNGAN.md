# Patch gabungan s484 → s485e (FINAL, Gap #3 lengkap)

Patch ini untuk yang mau **lompat langsung dari instalasi versi s484
(build 1209) ke s485e (build 1214)** dalam satu langkah, tanpa perlu
apply 5 patch bertahap (`s484→s485a`, `s485a→s485b`, `s485b→s485c`,
`s485c→s485d`, `s485d→s485e`) satu-satu.

Isinya = **union** file yang berubah di kelima patch bertahap
tersebut, tiap file diambil dari **versi final s485e** (build 1214) —
bukan hasil penggabungan diff manual. Sudah diverifikasi byte-per-byte
identik dengan release penuh `kw_release_v1214_s485e-final-gap3-closeout.zip`
untuk setiap file yang termasuk di patch ini.

Fitur yang dibawa patch ini: **Gap #3 — Titipan Principal/Allocation
Reconciliation** lengkap 5 langkah:
1. **S485a** — fondasi `D.titipanCommitments` (lazy init) +
   `DanaTitipanPortfolioAPI.listExistingOwners()` (read-only, dedup by
   `ownerId`).
2. **S485b** — `saveCommitment()` CRUD backend (upsert by `ownerId`,
   existing-owner-only, 0 sentuh `D.accounts`/`D.investments`/`D.debts`).
3. **S485c** — extend `build()`: union owner (commitment ∪ holding),
   `principalAmount`/`estimatedUnallocated`/`overAllocatedAmount`/
   `allocationStatus` (`OK`/`OVER_ALLOCATED`/`PRINCIPAL_NOT_SET`) per
   owner, totals baru.
4. **S485d** — modal `titipanCommitmentModal` + object
   `DanaTitipanCommitmentUI` (`open()`/`save()`) + extend `render()`
   (satu-satunya langkah yang mengubah markup/DOM).
5. **S485e** — build final + regresi penuh + dokumentasi penutup
   (murni bump versi, 0 logika baru).

Detail lengkap tiap langkah ada di masing-masing
`s485a-SESSION-NOTE.md` s/d `s485e-SESSION-NOTE.md` dan
`PATCH-README-s485a.md` s/d `PATCH-README-s485e.md` yang ikut disertakan
di patch ini (untuk audit trail — bukan wajib dibaca sebelum apply).
Ringkasan penuh 5 sesi + keterbatasan yang sengaja dibiarkan ada di
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` bagian "Ringkasan Akhir Gap #3".

## Cara pakai patch ini

Timpa (overwrite) file-file di bawah ini ke atas instalasi versi
**s484 (build 1209)**. Semua path relatif terhadap root aplikasi.

> ⚠️ Patch ini HANYA valid di atas baseline s484 (build 1209) persis.
> Kalau instalasi kamu sudah di s485a/b/c/d, JANGAN pakai patch
> gabungan ini — pakai patch bertahap yang sesuai (`s485a→s485b`, dst)
> supaya tidak menimpa progress dengan file yang salah baseline-nya.

## Isi patch

**File baru (murni baru, tidak ada di s484):**
- `tests/s485a-titipan-commitment-owner-picker.test.js` (baru)
- `tests/s485b-titipan-commitment-crud.test.js` (baru)
- `tests/s485c-titipan-commitment-projection.test.js` (baru)
- `tests/s485d-titipan-commitment-ui.test.js` (baru)

**File sudah ada sejak s484, isinya ditimpa ke versi final (bukan file
baru, tapi WAJIB ikut ditimpa — ini jantung Gap #3):**
- `modules/finance/dana-titipan-portfolio-presenter.js` — di s484
  filenya sudah ada (fitur Dana Titipan Portfolio Projection, sesi
  sebelum Gap #3), tapi isinya di s485e sudah bertambah banyak: init
  `D.titipanCommitments` (S485a), `saveCommitment()`/`getCommitments()`
  (S485b), extend `build()` — union owner + allocation guard (S485c),
  object `DanaTitipanCommitmentUI` + extend `render()` (S485d).
- `tests/s484-dana-titipan-portfolio-presenter.test.js` — juga sudah
  ada sejak s484 baseline; ikut disertakan karena termasuk dalam salah
  satu snapshot patch bertahap (S485b→S485c). Isinya identik dengan
  versi s484 aslinya (0 perubahan assertion), aman ditimpa ulang.

**File diubah (source):**
- `modules/shared/modals.js` — tambah 1 entry baru `MODAL_HTML`:
  `titipanCommitmentModal` (S485d). Modal lain TIDAK disentuh.

**File hasil build otomatis (JANGAN diedit manual, timpa apa adanya):**
- `app_production.html`, `index.html` (bump `?v=1209→1214`)
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `sw.js` (`CACHE_NAME` → `kw-cache-v1214`)
- `modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `chat-action-handlers.js` (konstanta versi → `s485e-final-regression-docs`)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

**Dokumentasi (audit trail, disertakan apa adanya):**
- `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` (status SELESAI, ringkasan
  akhir 5 sesi)
- `s485a-SESSION-NOTE.md` s/d `s485e-SESSION-NOTE.md`
- `PATCH-README-s485a.md` s/d `PATCH-README-s485e.md`
- `PATCH-README-s484-to-s485e-GABUNGAN.md` (dokumen ini)

**Catatan tentang 2 file dokumentasi (`PATCH-README-s485a.md`,
`s485a-SESSION-NOTE.md`):** file-file ini ada di patch bertahap
`s484→s485a` asli tapi sebelumnya tidak ikut ter-carry ke release
penuh s485d/s485e (S485a tidak menyisakan SESSION-NOTE terpisah di
repo saat itu — lihat catatan di `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md`).
Di patch gabungan ini keduanya diambil dari sumber patch
`kw_patch_s484-to-s485a_v1210` asli (bukan dari release final, karena
memang tidak ada di sana) — isinya valid apa adanya, murni dokumentasi
histori langkah 1/5, tidak memengaruhi kode/test.

## Verifikasi setelah apply patch

```
node --test tests/*.test.js
```
Harus **3144/3144 PASS**, 0 gagal.

## Tidak ada perubahan ke HARD RULE

`ownership-engine.js`, `multi-owner-engine.js`, `investasi.js`
(termasuk `_syncTitipanDebt()`), dan `akun.js` — **TIDAK BERUBAH SAMA
SEKALI** di seluruh rangkaian s484→s485e (diverifikasi checksum
identik di tiap sesi individual S485a-e, lihat SESSION-NOTE
masing-masing).

## Known limitation (pre-existing, bukan bug baru Gap #3)

Holding legacy `fundSource:'titipan'` semuanya memakai `ownerId`
literal `'titipan_investor'` — 2 orang berbeda yang memakai jalur
legacy ini collapse jadi 1 entri owner, jadi juga 1 baris di modal
"Atur Pokok Dana Titipan". Dicatat sejak S485a, **sengaja tidak
diperbaiki** dalam Gap #3 ini (di luar scope, keputusan audit).

## Remaining limitations (backlog, di luar Gap #3)

- Principal self-reported, tidak ada validasi silang ke
  `account.balance`/histori transaksi riil.
- Belum ada partial return/withdrawal (Case F).
- Legacy owner identity (`titipan_investor`) bisa tetap ambigu.

Detail lengkap: `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md` bagian
"Remaining limitations".
