# FIX S584 — Implementasi AUDIT-S583 (test lock, 0 logic produksi diubah)

## Konteks
`docs/AUDIT-S583-NETWORTH-SELFPORTION-CONSISTENCY.md` (sesi audit murni,
0 kode diubah) mengonfirmasi 5 fungsi agregat Net Worth (`Aset.totalValue()`,
`totalSaldoAkun()`, `Investment.selfOwnedTotalValue()`/`zakatableValue()`,
`Piutang.totalValue()`, `Debt.totalValue()`) konsisten pakai 2 lapis filter
(binary include/exclude + skala porsi) dan 0 dobel-hitung silang — tapi
verifikasinya waktu itu murni baca source manual, belum ada test yang
mengunci kelima invariant itu dalam SATU file terpusat (masing-masing
domain sudah punya test terpisah dari sesi lamanya sendiri, tapi tidak ada
yang mengecek gabungan lintas-domain sekaligus).

## Yang dikerjakan
File baru: `tests/s584-networth-selfportion-consistency-audit.test.js`
(6 test, load source ASLI via `loadSource()` harness — bukan re-implementasi
logic):
1. `Aset.totalValue()` — single-owner penuh, multi-owner diskalakan,
   ownership legacy non-SELF exclude, `investmentId` (migrasi ke Holding)
   exclude.
2. `totalSaldoAkun()` — akun tertaut aset dikecualikan PENUH apa pun status
   ownership aset yg menautkannya (S422c).
3. `Investment.selfOwnedTotalValue()`/`zakatableValue()` — non-SELF exclude,
   multi-owner diskalakan.
4. `Piutang.totalValue()` — non-SELF exclude, piutang tertaut aset patungan
   diskalakan via `resolveEntryAssetSelfPorsi()`.
5. `Debt.totalValue()` — non-SELF exclude, diskalakan, DAN exclude
   `linkedAssetId`/`linkedInvestmentId` (anti double-subtraction, BUG-016).
6. Skenario integrasi: 1 aset patungan 60/40 tertaut ke akun + auto-sync
   debt titipan darinya → dihitung manual lintas Aset+Akun+Debt, dipastikan
   porsi non-SELF (40%) tidak muncul di manapun, 0 kebocoran/dobel-hitung.

0 file produksi disentuh — murni test baru, semua langsung PASS di
percobaan pertama (mengonfirmasi kesimpulan AUDIT-S583: memang tidak ada
bug, hanya belum ada test-nya).

## Verifikasi
- `node --test tests/s584-networth-selfportion-consistency-audit.test.js`
  → 6/6 pass.
- Full `node --test tests/*.test.js`: **SEBELUM 4071/4071/0 fail (baseline
  S582/S583) → SESUDAH 4077/4077/0 fail** (+6 test baru, semua pass, 0
  regresi).

## Rilis
Docs+test only (0 file produksi diubah) — pola sama sesi audit-implementasi
lain yang tidak menyentuh bundle produksi. Tidak menjalankan
`scripts/build.js` (tidak ada perubahan ke source aplikasi/UI yang perlu
di-bundle-ulang atau bump versi); `tests/` di luar scope bundling.
