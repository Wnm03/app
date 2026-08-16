# Patch — 3+ Holding ditautkan ke 1 Akun yang sama, porsi/owner gabungan

## Masalah
`h.accountId` (skema S601-3) mendukung tautan holding→akun, tapi semua
fungsi resolver yang membacanya (`findLinkedHoldingForAccount()`,
`resolveOwnerDefaultForAccount()`, `resolveTxOwnerSplitForAccount()`,
`resolveAccOwnershipBadgeState()`) pakai `.find()` — cuma ambil holding
**PERTAMA** yang cocok di `D.investments[]`. Kalau 2-3 holding kebetulan
sama-sama ditautkan ke akun yang sama, holding ke-2/ke-3 diam-diam
diabaikan dari perhitungan owner/porsi (walau tetap terhitung benar di
jalur migrasi/hapus akun — beda kode).

## Perbaikan
- **`findLinkedHoldingsForAccount(accId)`** (baru, plural) — balikin
  SEMUA holding yang cocok, bukan cuma 1.
- **`aggregateOwnersAcrossHoldings(holdings)`** (baru) — gabung owners[]
  dari N holding jadi 1 daftar, **dibobot nilai** tiap holding
  (`Investment.holdingValue(h)`, fungsi lama, 0 rumus nilai baru) thd
  total nilai gabungan. Owner yang sama di >1 holding porsinya
  **dijumlah**. Fallback bobot sama rata kalau semua holding nilainya 0.
  `holdings.length===1` → hasil PERSIS `Investment.getOwners()` apa
  adanya (0 regresi kasus 1 holding per akun, mayoritas kasus).
- `findLinkedHoldingForAccount()` (singular, lama) **TIDAK diubah** —
  tetap dipakai badge/guard UI yang cuma butuh tahu "ada/tidak ada".
- 3 fungsi konsumen (`resolveOwnerDefaultForAccount` di `transaksi.js`,
  `resolveTxOwnerSplitForAccount` di `filter-laporan.js`,
  `resolveAccOwnershipBadgeState` di `akun.js`) sekarang pakai varian
  plural + aggregasi, bukan singular.
- **`AccOwners.open()`** (akun.js) — kalau akun ditautkan **1** holding,
  perilaku lama utuh (auto-redirect ke Buku Investasi). Kalau **2+**,
  tidak ada 1 tujuan redirect yang benar → toast sebut SEMUA nama
  holding, minta user buka Buku Investasi & pilih sendiri.

## File berubah/baru (11)
- `modules/finance/transaksi.js` — fungsi baru + resolver
- `modules/finance/filter-laporan.js` — resolver + field baru `holdings` (array)
- `modules/finance/akun.js` — badge resolver + `AccOwners.open()`
- `tests/s638-multi-holding-shared-account-aggregation.test.js` — baru, 12 test
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js`, `docs/FILE-MAP.md`,
  `docs/COVERAGE-PER-MODULE.md` — hasil build ulang (`?v=1371`,
  `s639-keamanan-pin-per-device-salt`)

## Verifikasi
`node --test tests/*.test.js` → **4539/4539 pass, 0 fail** (4527 lama +
12 test baru). `node scripts/build.js` lolos semua cek internal.

## Cara pasang
Timpa 11 file di atas ke lokasi yang sama di repo, commit & push
semuanya sekaligus (termasuk 2 bundle .min.js).
