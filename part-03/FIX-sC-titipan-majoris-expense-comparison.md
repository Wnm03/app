# FIX — Sesi C: Baris Pembanding "Estimasi dari Transaksi <Akun>" di Kartu Dana Titipan

**Rujukan:** `AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md` §3 Langkah B
(lanjutan Sesi A — `resolveTxOwnerSplitForAccount()`, Langkah A audit yang
sama).

## Target
Kartu "💰 DANA TITIPAN" per owner selama ini cuma menampilkan "Pokok
Dikomit" (manual, diketik user) tanpa pembanding otomatis dari transaksi
riil akun tertaut (mis. Majoris). Sesi ini menambah baris baca-saja
**"Estimasi dari Transaksi &lt;Akun&gt;"** di sebelah "Pokok Dikomit",
dihitung otomatis dari total expense akun tertaut × porsi owner (sumber
#3 di audit — split `MultiOwnerEngine.splitByPorsi()` atas transaksi
Majoris, sebelumnya cuma ditampung sesaat di modal Riwayat).

## Perubahan
- **`modules/finance/dana-titipan-portfolio-render.js`**
  - Fungsi baru `DanaTitipanPortfolioPresenter._expenseComparisonForOwner(o)`
    — PURE, 100% REUSE `resolveTxOwnerSplitForAccount()` (filter-laporan.js,
    Sesi A) + `MultiOwnerEngine.splitByPorsi()` (0 rumus baru). Untuk tiap
    `o.holdings[]`: resolve akun tertaut (via `linkedAssetId` domain Aset,
    atau `linkedInvestmentId` → cari balik Aset ber-`investmentId` sama,
    domain Investasi tertaut). Skip holding yang akunnya tidak dikenali
    sebagai akun multi-owner ATAU owner ini tidak match porsinya (guard
    sama S567/568). Total expense akun dihitung ALL-TIME (bukan per
    periode filter). Dedup by `accountId` supaya tidak dobel kalau >1
    holding mengarah ke akun sama. Balikin `null` (baris disembunyikan)
    kalau tidak ada kecocokan sama sekali.
  - `_renderNow()`: 1 baris grid baru disisipkan di antara "Pokok Dikomit"
    dan "Teralokasi ke Holding", HANYA muncul kalau
    `_expenseComparisonForOwner()` balikin data. Label akun generik (join
    nama akun unik), BUKAN hardcode "Majoris" — berlaku untuk akun tertaut
    lain juga.
  - **Tidak menyentuh** `principalAmount`/`outstandingPrincipal`/
    `_principalCell()`/`_outstandingCell()`/`allocatedPrincipal` — murni
    baris tambahan baca-saja (§3 Langkah B, dikonfirmasi test #6).

## Test
`tests/sC-titipan-majoris-expense-comparison.test.js` (6 test, semua
lolos):
1. Aset multi-owner tertaut akun, ada expense → muncul `{total,
   accountNames}`, expense non-akun/non-expense tidak ikut kehitung.
2. Owner tidak match porsi akun → `null`.
3. Holding Investasi tertaut balik ke Aset ber-`accountId` → ikut
   kehitung (jalur Langkah A: `Investment.getOwners()` via link).
4. Tidak ada holding tertaut akun sama sekali → `null`, 0 error.
5. Dua holding mengarah ke akun sama → dedup, tidak dihitung dobel.
6. `_principalCell()`/`_outstandingCell()` tidak berubah kontrak.

Full regression suite: `node --test tests/*.test.js` → **3985/3985 lolos,
0 gagal**.

## Build
`node scripts/build.js SesiC-titipan-majoris-expense-comparison` — versi
naik ke **1298**, sintaks kedua bundle valid (`node --check`), FILE-MAP.md
& COVERAGE-PER-MODULE.md ter-update.

## Di luar scope sesi ini (sesuai audit §5)
- Langkah C ("Sisa belum terpotong") — sesi terpisah berikutnya.
- Fitur "alihkan ke akun lain" — ditunda.
- `titipanCommitments`/`usedTotal`/sync Aset↔Akun — tidak disentuh.
