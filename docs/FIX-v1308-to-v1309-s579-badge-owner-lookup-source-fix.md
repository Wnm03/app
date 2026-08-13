# FIX-v1308-to-v1309-s579-badge-owner-lookup-source-fix.md

## Sesi
S579 — implementasi **DL-Next-6** (`DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md`,
ref `AUDIT-8-11-OWNER-RESOLVER-POST-DL-NEXT-1.md` §Audit-9). 1 sesi, 1
fokus: ganti basis lookup nama owner di badge riwayat.

## Bug yang diperbaiki
Badge "👤 Ditanggung: <nama owner>" di riwayat transaksi (`txHTML()`,
`modules/finance/tx-list-cashflow.js`, S574-E) resolve nama owner lewat
`getAccOwners(t.accountId)` lalu fallback `acc.owners` — **keduanya**
hanya membaca `acc.owners[]`/`acc.ownership`, tidak pernah mengecek aset
tertaut. Pola sama persis dengan bug yang diperbaiki DL-Next-1 (S578).

Sejak DL-Next-1, lebih banyak transaksi valid berhasil menyimpan
`deductionOwnerId` lewat sumber `source:'asset'` (akun tanpa
`acc.owners[]` sendiri, tapi tertaut aset multi-owner) — badge untuk
transaksi ini gagal menemukan nama ownernya (baris kosong), walau data
`deductionOwnerId` tersimpan benar.

## Perubahan
- `modules/finance/tx-list-cashflow.js` — blok lookup nama owner di
  `txHTML()` diganti: `resolveOwnerDefaultForAccount(t.accountId)`
  (sumber sama dengan DL-Next-1/UI) dicoba **duluan**; `getAccOwners()`/
  `acc.owners` **dipertahankan sebagai fallback** (bukan dihapus) — aman
  kalau `transaksi.js` belum dimuat/urutan `build.js` berubah, sama pola
  guard `typeof` yang sudah ada di file ini.
- **Yang SENGAJA tidak diubah**:
  - `deductionOwnerId` itu sendiri — 0 sentuhan, murni lookup tampilan.
  - Aturan pemilihan owner (Design Lock §2.1/§2.2 lama) — tidak relevan
    di sini (fix ini bukan soal pemilihan, cuma lookup nama utk display).
  - `getAccOwners()`/`akun.js` — tidak dihapus, tetap dipakai di tempat
    lain, hanya urutan pemanggilan di `txHTML()` yang berubah (jadi
    fallback, bukan primary).

## Test
- `tests/s579-dl-next-6-badge-owner-lookup-source.test.js` (**baru**,
  3 test case, TDD RED→GREEN):
  1. RED sebelum fix / GREEN sesudah fix: akun tanpa `acc.owners[]`
     sendiri + tertaut aset multi-owner + `deductionOwnerId` dari owner
     aset → badge **wajib** menampilkan nama (sebelum fix: baris kosong,
     membuktikan bug persis seperti temuan Audit-9).
  2. Regresi: akun dengan `acc.owners[]` sendiri → badge tetap resolve
     nama seperti sebelumnya (fallback lama tidak rusak).
  3. Regresi: transaksi tanpa `deductionOwnerId` → tetap 0 badge
     (backward compatible, tidak berubah).

## Verifikasi
- `node --test tests/s579-dl-next-6-badge-owner-lookup-source.test.js`
  → **3/3 lolos** (RED dikonfirmasi gagal sebelum fix, GREEN setelahnya).
- Full `node --test tests/*.test.js` → **4072 test, 4063 pass, 9 fail** —
  naik dari baseline S578 (4069/4060/9, +3 test baru semua pass). Ke-9
  kegagalan **identik** dengan baseline sebelumnya — **0 regresi baru**.
- Build: `s578-dl-next-1-owner-resolver-validation-fix` →
  `s579-dl-next-6-badge-owner-lookup-fix`, v1308 → v1309.
  `verify-bundle-freshness`/`verify-window-expose` lolos.
  `verify-release-ready` **LOLOS** (gate lint/minify di-override manual,
  konsisten S424 dst, dicatat di `docs/RELEASE-GATE-LOG.md`).

## Status Design Lock
DL-Next-6 **selesai**. DL-Next-2 (OUT OF SCOPE), DL-Next-3 (KNOWN
LIMITATION), DL-Next-4 (ALREADY SATISFIED, ditutup), DL-Next-5 (OPTIONAL)
tetap tidak dikerjakan, sesuai status masing-masing.
