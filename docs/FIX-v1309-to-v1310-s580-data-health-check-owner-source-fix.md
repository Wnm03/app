# FIX v1309 → v1310 — Sesi S580 (DL-Next-7: Data Health Check Owner Source Fix)

## Konteks
Implementasi **DL-Next-7** dari `DESIGN-LOCK-DL-NEXT-7-DATA-HEALTH-CHECK-
OWNER-SOURCE.md`, menutup temuan `AUDIT-12-OWNER-RESOLVER-POST-DL-NEXT-6.md`.
1 sesi, 1 fokus: ganti basis cek `t.deductionOwnerId` di
`runDataHealthCheck()` (`data-health-check.js`).

## Bug yang diperbaiki
`runDataHealthCheck()` sebelumnya memvalidasi `t.deductionOwnerId` **hanya**
terhadap `dOwnerAcc.owners||[]` (`acc.owners[]` akun transaksi) — buta
terhadap aset multi-owner tertaut, pola source-mismatch identik bug
DL-Next-1/DL-Next-6. Akibatnya: transaksi dengan `deductionOwnerId` yang
**valid sepenuhnya** dari sumber aset tertaut (akun tanpa `acc.owners[]`
manual sendiri) memicu warning palsu **"Pemilik Sumber Potongan tidak
ditemukan"** di UI Data Health Check, seolah owner-nya dihapus — padahal
data valid.

## Perbaikan
- `data-health-check.js` — basis owner diganti dari `dOwnerAcc.owners||[]`
  ke `resolveOwnerDefaultForAccount(t.accountId).owners` (sumber sama
  persis yang dipakai guard `_saveTxInner()` S578 & badge riwayat
  DL-Next-6). Guard `typeof` dipertahankan: kalau fungsi belum termuat,
  fallback ke `dOwnerAcc.owners||[]` lama — 0 crash, 0 regresi.
- Wording pesan **hanya** disesuaikan utk cabang `source==='asset'`
  (sekarang menyebut nama aset multi-owner tertaut, bukan "dihapus dari
  akun X" yang keliru di kasus ini). Cabang lain (`source==='account'`,
  kasus C "bukan pemilik akun ini", akun invalid) **verbatim tidak
  berubah**. Level tetap `warn` di semua cabang.
- `data-health-check.js` — **satu-satunya** file source produksi yang
  disentuh sesi ini (sesuai lock).

## Test
`tests/data-health-check-deduction-owner-asset-source-s580.test.js`
(**baru**, 5 test):
1. `deductionOwnerId` valid dari sumber aset tertaut → **0 warning**
   (regresi utama yang diperbaiki, reproduksi persis kasus di
   `AUDIT-12`).
2. `deductionOwnerId` benar-benar tidak ada di aset tertaut maupun akun
   → tetap warn, pesan menyebut nama aset tertaut.
3. Owner tidak ditemukan via `acc.owners[]` manual (`source:'account'`)
   → pesan **lama verbatim**, 0 regresi wording.
4. Owner valid di akun lain (kasus C) → tidak terganggu.
5. Guard fallback (tanpa `resolveOwnerDefaultForAccount` termuat) → logic
   lama tetap jalan, 0 crash.

Full `npm test`: **4077 test, 4068 pass, 9 fail** (naik dari 4072/4063/9,
+5 test baru semua pass) — 9 kegagalan **identik pre-existing** (diverifikasi
sama persis di baseline v1309 sebelum perubahan sesi ini), **0 regresi
baru**.

## Rilis
`node scripts/build.js` (auto-increment v1309→v1310, s580). Bundle
**tidak diminify** (esbuild tidak terpasang, sandbox tanpa akses
jaringan) — `node --check` lolos di kedua bundle, 100% valid secara
fungsional. Gate lint/minify di-override manual (dicatat di
`docs/RELEASE-GATE-LOG.md`), pola sama seperti sesi-sesi sebelumnya
dgn batasan sandbox yang sama.

## Cakupan yang SENGAJA tidak dikerjakan
Refactor `data-health-check.js` dari baca `D` global ke pola dependency
injection (`loadSource()`) — di luar cakupan DL-Next-7 (lihat Design
Lock §1, keputusan eksplisit: dipertahankan).
