# S620 — FIX: Owner Dana Titipan tanpa Holding/Aset sama sekali (akun-only, "Uang motor") tidak pernah kepotong pengeluarannya

Build version: **v1348** (`s620-owner-registry-mandatory-lookup`)

## Bug
Laporan user: owner Dana Titipan "Uang motor" cuma punya "Pokok Dikomit"
(principal commitment) yang tertaut LANGSUNG ke `owners[]` sebuah akun BRI
multi-owner — 0 Holding Investasi dan 0 Aset sama sekali di antaranya.
Transaksi pengeluaran Rp100.000 di akun BRI itu sudah benar tersimpan
`deductionOwnerId: 'uang-motor'`, tapi "Estimasi Belum Teralokasi" di
dashboard Dana Titipan tetap tidak berkurang sepeser pun.

## Akar masalah
Tiga fungsi yang menyinkronkan pengeluaran transaksi ke dashboard Dana
Titipan — `resolveTxOwnerSplitForAccount()` (`filter-laporan.js`),
`_linkedExpenseTotalForOwner()` (`dana-titipan-aggregation-api.js`), dan
twin-nya `_expenseComparisonForOwner()` (`dana-titipan-portfolio-render.js`)
— SEBELUM sesi ini hanya pernah menemukan akun tertaut lewat:
1. Holding Investasi yang tertaut langsung ke akun, atau
2. Aset yang tertaut ke akun (lalu opsional tertaut ke Holding).

Owner yang porsinya di-set LANGSUNG di `D.accounts[].owners[]` (dropdown
"⚖️ Porsi Kepemilikan Akun" di modal Akun) tanpa Holding/Aset perantara
sama sekali tidak pernah ditemukan oleh ketiga fungsi ini — persis pola gap
yang sudah lebih dulu diperbaiki untuk `resolveOwnerDefaultForAccount()`
(transaksi.js, Sesi Res-B) tapi belum pernah untuk tiga fungsi di atas.

## Fix (3 file, semua di `modules/finance/`)
1. **`filter-laporan.js`** — `resolveTxOwnerSplitForAccount()` mendapat
   fallback tier ke-3 (`getAccOwnersEffective()`, `akun.js`) SEBELUM balik
   `null` — urutan prioritas sama persis `resolveOwnerDefaultForAccount()`
   (Holding menang > Aset > owners akun sendiri).
2. **`dana-titipan-aggregation-api.js`** — `_linkedExpenseTotalForOwner()`
   mendapat loop kedua yang scan `D.accounts` LANGSUNG (bukan cuma lewat
   `o.holdings[]`), reuse 100% dedup (`seenAcc`), filter expense, dan guard
   anti-doublecount `!t.titipanLinkId` yang sama persis loop pertama.
3. **`dana-titipan-portfolio-render.js`** — twin fix yang sama persis di
   `_expenseComparisonForOwner()`, sesuai konvensi "wajib diubah bersamaan"
   file ini.

0 rumus split baru ditulis di ketiga file — murni menambah 1 titik
penemuan akun yang sebelumnya terlewat.

## Test
- **Baru:** `tests/s620-titipan-account-only-owner-linked-expense.test.js`
  (4 test) — reproduksi skenario laporan persis (owner akun-only, 0
  holding), `build()` end-to-end, dedup per-owner, dan guard
  `titipanLinkId`.
- **Update:** `tests/sC-titipan-majoris-expense-comparison.test.js` — test
  7 baru (twin render-side dari test di atas).
- Baseline sebelum fix: 4332/4332 pass (post-S619).
- **Full suite sesudah fix: 4337/4337 pass, 0 regresi.**

## Build
`node scripts/build.js` — versi naik dari **1347** (S619) ke **1348**,
`app_production.html`/bundle/`sw.js` di-regenerate otomatis, versi
konstanta disamakan di 5 file source.

## Isi ZIP (hanya file yang berubah/baru dari S619)
- `index.html`, `app_production.html`, `sw.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `modules/finance/filter-laporan.js` — **fix inti**
- `modules/finance/dana-titipan-aggregation-api.js` — **fix inti**
- `modules/finance/dana-titipan-portfolio-render.js` — **fix inti**
- `modules/shared/modals.js`, `modules/shared/modules-render.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js` (version-sync saja)
- `chat-action-handlers.js` (version-sync saja)
- `tests/s620-titipan-account-only-owner-linked-expense.test.js` (baru)
- `tests/sC-titipan-majoris-expense-comparison.test.js` (test baru
  ditambahkan)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

⚠️ Upload SEMUA file di atas (bukan cuma yang "fix inti") — versi harus
tetap sinkron di seluruh file sesuai aturan build.

## Sesi berikutnya
Catatan sesi sebelumnya (`s620-titipan-...` di txt) juga menyinggung
kemungkinan gap serupa di tempat lain yang masih hanya baca `o.holdings[]`
tanpa fallback akun-langsung — belum diaudit di sesi ini, kandidat untuk
sesi lanjutan kalau muncul laporan serupa.
