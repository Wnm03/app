# Sesi 485c (Gap #3 — Titipan Commitment, langkah 3/5: Projection Extension `build()`)

## Konteks

Lanjutan langkah 2/5 (S485b, CRUD backend). Sesi ini = layer paling
berisiko secara logika (allocation guard) — diisolasi dari UI supaya
review fokus ke angka, bukan markup (lihat
`RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md`). Sesi ini = **langkah 3/5**.

## Target sesi ini

Extend `DanaTitipanPortfolioAPI.build()`:
- Owner list = **union** dari `titipanCommitments` + owner hasil
  agregasi holding (bukan cuma salah satu sumber) — owner yang sudah
  komit tapi belum punya holding sama sekali tetap muncul
  (allocated/currentValue/gain = 0).
- Per owner: `principalAmount` (dari commitment, `null` — bukan default
  0 — kalau tidak ada record commitment), `allocatedPrincipal`/
  `currentValue`/`gain` tetap 100% reuse mekanisme S484 lama (0 rumus
  baru).
- Guard `estimatedUnallocated`/`overAllocatedAmount`/`allocationStatus`
  (`OK` / `OVER_ALLOCATED` / `PRINCIPAL_NOT_SET`): tidak pernah negatif,
  tidak pernah default 0 kalau principal memang belum ada.
- `totals` dapat 3 field baru: `principalAmountTotal`,
  `estimatedUnallocatedTotal` (hanya dijumlah dari owner yang principal-
  nya sudah diset), `overAllocatedTotal`.

## File yang diubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — extend
  `build()` (+ komentar header update). `listExistingOwners()`/
  `saveCommitment()`/`getCommitments()` TIDAK diubah sama sekali.
- `tests/s485c-titipan-commitment-projection.test.js` (BARU) — 12 test,
  termasuk test case utama dari spec (Budi Rp100jt, BBCA+RDPU+Emas →
  allocated 70jt, unallocated 30jt, currentValue 75jt, gain 5jt, OK).
- **Update test lama yang sengaja "pin" bentuk `totals` sebelum gap #3
  dikerjakan** (bagian dari evolusi terencana, bukan regresi tak
  disengaja — dicatat eksplisit di komentar masing-masing test sebelum
  sesi ini):
  - `tests/s484-dana-titipan-portfolio-presenter.test.js` test #10 —
    sebelumnya memastikan gap #3 BELUM dikerjakan; sekarang diupdate
    memverifikasi tanpa commitment, owner tetap `PRINCIPAL_NOT_SET` &
    field literal salah (`kasBelumDiinvestasikan`/`titipanPokok`, dst)
    tetap TIDAK PERNAH muncul.
  - `tests/s485a-titipan-commitment-owner-picker.test.js` test #10 —
    update daftar keys `totals` yang diharapkan (menambah 3 field baru).
  - `tests/s485b-titipan-commitment-crud.test.js` test #13 — update
    sama + assert `allocationStatus`/`principalAmount` owner sesuai
    commitment yang disimpan sesi 485b.
  - Nilai `allocatedPrincipalTotal`/`currentValueTotal`/`gainTotal` di
    ketiga file itu **TIDAK berubah** — hanya bentuk objek `totals`
    (key baru ditambah) yang di-update, 0 regresi nilai.
- `scripts/build.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `index.html`, `app_production.html`, kedua bundle, `sw.js`,
  `modules/shared/modals.js`/`modules-calc.js`/`modules-render.js`/
  `features-helpers-global-security.js`, `chat-action-handlers.js` —
  **hanya bump versi build** (1211→1212).

## Hasil test

`node --test tests/*.test.js` → **3124/3124 PASS** (3112 lama, 3 di
antaranya diupdate sesuai evolusi terencana + 12 baru), 0 gagal, 0
regresi nilai. Dijalankan 2x (sebelum & sesudah build), hasil sama.

## Hasil build

`node scripts/build.js s485c-titipan-commitment-projection` → sukses,
versi s485b→s485c (build 1211→1212), sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=1212` sinkron.

## Verifikasi HARD RULE (wajib per instruksi audit)

`diff` eksplisit baseline S485a vs hasil sesi ini terhadap file yang
DILARANG diubah:

```
ownership-engine.js     -> TIDAK BERUBAH
multi-owner-engine.js   -> TIDAK BERUBAH
investasi.js            -> TIDAK BERUBAH (termasuk _syncTitipanDebt())
akun.js                 -> TIDAK BERUBAH
```

Semua file lain yang ikut ter-diff (bundle, index.html, modals.js, dst)
diverifikasi HANYA berisi bump konstanta versi build — 0 markup/logic
baru (belum ada modal/UI sesi ini, itu Sesi 485d).

## Progress & Next TODO

Langkah 3/5 selesai, teruji, ter-build. **Sesi 485d** (berikutnya): UI —
`titipanCommitmentModal` baru di `MODAL_HTML` (`modals.js`), extend
`DanaTitipanPortfolioPresenter.render()` untuk menampilkan Pokok
Dikomit/Teralokasi/Estimasi Belum Teralokasi/Nilai Saat Ini/Untung-Rugi
per owner, label "Estimasi Belum Teralokasi" (bukan Kas/Saldo/Dana
Tersisa), badge ⚠️ kalau `OVER_ALLOCATED`, "Belum dicatat" (bukan "Rp0")
kalau `PRINCIPAL_NOT_SET`. Wajib browser smoke test di sesi itu (satu-
satunya sesi yang mengubah markup/DOM nyata).

## Known Issue

Tidak ada known issue baru dari perubahan sesi ini, selain
`titipan_investor` collision yang sudah dicatat di S485a (pre-existing,
tidak diperbaiki). Catatan tambahan: kalau ada 2 holding legacy milik
2 orang berbeda yang collapse jadi 1 `ownerId` (`titipan_investor`),
`principalAmount`/`allocationStatus` di `build()` juga ikut gabung jadi
1 baris — konsisten dgn keterbatasan yang sama, bukan bug baru.
