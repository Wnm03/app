# FIX Sesi A — resolveTxOwnerSplitForAccount(): Owner Source Setelah Link (P0)

**Sumber:** `AUDIT-DANA-TITIPAN-MAJORIS-PORSI-SYNC.md` (review S. terhadap
audit sinkronisasi Dana Titipan × Majoris), Sesi A dari urutan implementasi
A→E yang direkomendasikan §9. Ini murni Langkah A (refactor + owner
resolver) — **belum menyentuh UI Dana Titipan** (Sesi C/D).

**2 keputusan yang dikunci user sebelum sesi ini:**
1. `sisaBelumTerpotong < 0` → badge peringatan + tetap tampil angka (bukan
   clamp/hide) — dipakai nanti di Sesi D, dicatat di sini supaya tidak
   hilang dari konteks.
2. "Pengeluaran Majoris" = **semua** expense di akun Majoris (bukan hanya
   yang eksplisit ditandai Dana Titipan renov) — dipakai nanti di Sesi C/D.

## Masalah (P0 — §2 audit)

Saat Aset (mis. "Majoris") di-link ke Holding Investasi, `a.owners`
disalin **SEKALI** ke holding. Setelah itu porsi bisa diedit di Holding,
tapi `a.owners` lama di Aset **TIDAK ikut berubah**. `showFilteredTx
(scope='account')` (S567/S568) sebelum sesi ini baca
`MultiOwnerEngine.getOwners(linkedAssetForSplit)` **langsung dari
`a.owners`** — jadi pemecahan Modal/Pengeluaran/Total per pemilik di
riwayat transaksi akun bisa diam-diam pakai porsi **LAMA/stale**, padahal
porsi sebenarnya sudah berubah di Holding.

## Perubahan

- **`modules/finance/filter-laporan.js`:**
  - Fungsi baru `resolveTxOwnerSplitForAccount(accountId)` — SATU titik
    baca owner, urutan sumber DIKUNCI sesuai kontrak audit §3:
    1. Aset ketemu & tertaut ke Holding Investasi (`a.investmentId`,
       holding masih ada) → `Aset._resolveLinkedInvestmentOwners(a)`
       (SUDAH ADA sejak Sesi B2a/462, baca LIVE `Investment.getOwners(h)`
       tiap panggilan — 0 rumus baru).
    2. Belum tertaut / tautan orphan (holding dihapus) / module
       `investasi.js` belum dimuat → fallback
       `MultiOwnerEngine.getOwners(a)` (perilaku PERSIS sebelum sesi ini
       — 0 regresi untuk akun yang belum pernah di-link).
    - PURE, 0 side-effect, 0 tulis ke `D`.
  - `showFilteredTx()`: bagian owner-split scope `'account'` sekarang
    WAJIB lewat `resolveTxOwnerSplitForAccount()`, tidak lagi baca
    `MultiOwnerEngine.getOwners(linkedAssetForSplit)` langsung dari
    `a.owners`. Rumus `splitByPorsi()` (Modal/Pengeluaran/Total) dan
    render tab-per-owner (S568) **tidak diubah sama sekali** — cuma
    sumber `owners`-nya yang sekarang benar.

- **Test baru:** `tests/s569-resolve-tx-owner-split-stale-fix.test.js`
  (4 test):
  1. **P0** — porsi diedit di Holding *setelah* aset linked → split
     transaksi pakai porsi Holding terbaru (bukan `a.owners` lama).
  2. Aset belum linked → fallback `a.owners` (perilaku lama, 0 regresi).
  3. `a.investmentId` orphan (holding sudah dihapus) → fallback
     `a.owners`, tidak error/crash.
  4. `D.titipanCommitments` (`principalAmount`/`usedTotal`) dan
     `D.investments` tidak termutasi sama sekali (PURE read-only) —
     mengunci batasan audit "jangan ganti principalAmount/usedTotal".

## Batasan yang DIJAGA (sesuai audit §10)

- 0 rumus split baru — 100% reuse `MultiOwnerEngine.splitByPorsi()` &
  `Investment.getOwners()`/`MultiOwnerEngine.getOwners()` yang sudah ada.
- 0 perubahan ke `principalAmount`, `usedTotal`, atau `titipanCommitments`.
- 0 perubahan tampilan/behavior Dana Titipan (belum masuk scope sesi ini
  — itu Sesi C).
- Render S567/S568 (tab per pemilik, format teks Modal/Pengeluaran/Total)
  **identik**, hanya untuk akun yang porsinya TIDAK berubah sejak link
  (lihat regresi di bawah).

## Verifikasi

⚠️ **Catatan penting:** paket yang diberikan ke saya cuma berisi file
yang disentuh sesi-sesi terakhir (S559–S567 + patch S568), **bukan repo
lengkap** — tidak ada `package.json`/`tests/helpers/loadSource.js`/
`node_modules`, jadi saya **tidak bisa menjalankan
`node --test tests/*.test.js` yang sesungguhnya** di sisi saya. Yang
sudah saya lakukan sebagai gantinya:

- Menulis harness `vm`-based sendiri (meniru pola `loadSource()` yang
  dipakai test-test lain di repo) untuk sanity-check **logika**
  `resolveTxOwnerSplitForAccount()` + `showFilteredTx()` secara langsung
  — 4 skenario baru di atas **lolos**, dan 2 skenario regresi S567/S568
  (owner-split biasa + akun tidak tertaut) yang saya tiru dari
  `s567-filtertx-owner-split.test.js` juga **lolos** persis nilai yang
  sama seperti sebelum patch.
- `node --check modules/finance/filter-laporan.js` → lolos (syntax OK).

**Wajib dilakukan di sisi Anda sebelum menganggap sesi ini selesai**
(baseline lengkap + harness resmi ada di lokal Anda):
1. `node --test tests/s567-filtertx-owner-split.test.js
   tests/s568-*.test.js tests/s569-resolve-tx-owner-split-stale-fix.test.js`
2. `node --test tests/*.test.js` (regresi penuh — pastikan tetap
   3975+4=3979/3979 atau sesuai jumlah baseline terbaru Anda, 0 gagal).
3. `node scripts/build.js` (lint blocking + versi + bundle check).

## Belum ditangani (scope sesi berikutnya per audit §9)

- Sesi B: regression + stale-owner test tambahan kalau masih dianggap
  perlu (P0 di atas sudah tercakup Test 1).
- Sesi C: "Pengeluaran Majoris" (Σsemua expense akun, keputusan terkunci)
  ditampilkan sebagai pembanding di kartu Dana Titipan, label eksplisit
  "Pokok Dikomit (manual)" vs "Pengeluaran Majoris (dari transaksi)".
- Sesi D: `sisaBelumTerpotong = recalcAccBalance(accountId) − Σexpense`,
  badge peringatan kalau negatif (keputusan terkunci).
- Sesi E: full regression + build + ZIP final.
