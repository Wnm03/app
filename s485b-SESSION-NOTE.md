# Sesi 485b (Gap #3 — Titipan Commitment, langkah 2/5: Commitment CRUD backend, tanpa UI)

## Konteks

Lanjutan langkah 1/5 (S485a, owner picker read-only). Sesi ini
mengimplementasikan logika create/upsert `D.titipanCommitments[]` murni
via API — belum ada modal (lihat `RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md`
untuk peta 5 sesi Gap #3 secara keseluruhan). Sesi ini = **langkah 2/5**.

## Target sesi ini

- `DanaTitipanPortfolioAPI.saveCommitment({ownerId, ownerName,
  principalAmount, committedDate, notes})`:
  - Validasi: `ownerId` wajib & harus ada di `listExistingOwners()`
    (existing-owner-only, TIDAK generate identity baru).
  - Validasi: `principalAmount` numerik & >= 0.
  - Upsert by `ownerId`: sudah ada → update in place; belum ada → push
    baru dengan `id: uid()`.
  - Isolasi total dari `D.accounts`/`D.transactions`/`D.investmentTx`/
    `D.investments`/`D.debts`.
- `DanaTitipanPortfolioAPI.getCommitments()` — getter read-only, init
  lazy (TIDAK menulis `D.titipanCommitments` kalau belum ada).
- `deleteCommitment()` — **di-skip sesuai rencana** (tidak ada
  requirement eksplisit hapus di fase ini; bisa jadi sesi terpisah nanti
  kalau dibutuhkan).
- **Tidak** menyentuh `build()`/`render()`/modal sama sekali — projection
  extension menyusul di Sesi 485c, UI di Sesi 485d.

## File yang diubah

- `modules/finance/dana-titipan-portfolio-presenter.js` — tambah
  `DanaTitipanPortfolioAPI.saveCommitment()` + `getCommitments()` (+
  komentar update di header file).
- `tests/s485b-titipan-commitment-crud.test.js` (BARU) — 14 test.
- `scripts/build.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `index.html`, `app_production.html`, kedua bundle, `sw.js`,
  `modules/shared/modals.js`/`modules-calc.js`/`modules-render.js`/
  `features-helpers-global-security.js`, `chat-action-handlers.js` —
  **hanya bump versi build** (1210→1211), 0 perubahan markup/logic lain
  di file-file itu (diverifikasi lewat diff eksplisit terhadap baseline
  S485a, lihat §Verifikasi di bawah).

## Hasil test

`node --test tests/*.test.js` → **3112/3112 PASS** (3098 lama + 14
baru), 0 gagal, 0 regresi. Dijalankan 2x (sebelum & sesudah build), hasil
sama.

## Hasil build

`node scripts/build.js s485b-titipan-commitment-crud` → sukses, versi
s485a→s485b (build 1210→1211), sintaks kedua bundle valid,
`index.html`/`app_production.html` identik & `?v=1211` sinkron.

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

Assert tambahan khusus sesi ini (test #9): `D.accounts`,
`D.transactions`, `D.investmentTx`, `D.investments`, `D.debts`
diserialize sebelum & sesudah `saveCommitment()` dipanggil — hasilnya
harus identik (deep-equal via JSON.stringify) — memverifikasi isolasi
akuntansi total sesuai scope rencana sesi.

## Progress & Next TODO

Langkah 2/5 selesai, teruji, ter-build. **Sesi 485c** (berikutnya):
extend `build()` — union owner (dari `titipanCommitments` + hasil
agregasi holding), `allocatedPrincipal`/`currentValue`/`gain` (reuse
mekanisme lama), guard `estimatedUnallocated`/`overAllocatedAmount`/
`allocationStatus` (`OK`/`OVER_ALLOCATED`/`PRINCIPAL_NOT_SET`), totals
baru (`principalAmountTotal`, `estimatedUnallocatedTotal`,
`overAllocatedTotal`). Masih tanpa modal/UI.

## Known Issue

Tidak ada known issue baru dari perubahan sesi ini, selain
`titipan_investor` collision yang sudah dicatat di S485a (pre-existing,
tidak diperbaiki — kalau owner legacy itu dipakai di `saveCommitment()`,
principal-nya tersimpan di bawah 1 `ownerId` gabungan yang sama seperti
di `listExistingOwners()`, bukan bug baru).
