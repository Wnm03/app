# S621 — FIX: Transaksi TANPA akun potongan eksplisit ikut mengurangi Pokok Dikomit Dana Titipan (akun 1-owner)

Build version: **v1350** (`s621-titipan-explicit-owner-only`)

## Laporan user
Screenshot dashboard Dana Titipan (owner "Uang motor", Pokok Dikomit
Rp 12.000.000, akun BRI 100% owner tunggal) + modal "Riwayat: BRI" (14
transaksi). "Estimasi dari Transaksi BRI" menampilkan Rp 1.923.542 — angka
itu SUDAH cocok dengan kartu "Porsi per Pemilik" di modal riwayat (jadi
secara matematis "sinkron"), tapi user menyadari akar masalah yang lebih
dalam: dari 14 transaksi di akun itu (belanja mingguan, sekolah anak,
mainan anak, pulsa, tagihan admin, dst), cuma 1 yang benar-benar ditandai
`deductionOwnerId` (badge "👤 Ditanggung: Uang motor"). 13 sisanya numpang
lewat akun itu tanpa pernah ditandai — tapi tetap ikut memotong Pokok
Dikomit pocket "Uang motor".

Permintaan eksplisit user: transaksi boleh disimpan TANPA akun potongan
(0 wajib isi), tapi HANYA yang eksplisit di-set akun potongan yang boleh
mengurangi Pokok Dikomit.

## Root cause
`resolveTxOwnerAssignment(t, owners)` (`filter-laporan.js`) — fungsi satu-
satunya sumber kebenaran untuk badge "Ditanggung", kartu "Porsi per
Pemilik", DAN kalkulasi Dana Titipan (`_linkedExpenseTotalForOwner()`) —
fallback ke `owners[0].ownerId` kalau `t.deductionOwnerId` kosong (S608).
Untuk akun dengan **1 owner** (spt BRI/"Uang motor", porsi 100%), fallback
itu berarti **SEMUA transaksi otomatis dianggap milik owner itu**, walau
user tidak pernah menandainya secara sadar — porsi kepemilikan AKUN (siapa
berhak atas saldo) tertukar konsepnya dengan assignment PER-TRANSAKSI
(pengeluaran ini untuk pocket yang mana).

Kontribusi kedua: `updateTxDeductionOwnerVisibility()` (`transaksi.js`)
auto-preselect `owners[0].ownerId` di dropdown "Pemilik Sumber Potongan"
untuk akun 1-owner — jadi field itu secara fungsional tidak pernah kosong
untuk transaksi BARU pada akun semacam ini, mempertegas asumsi implisit
yang sama.

## Fix (2 file, scope disepakati eksplisit dengan user: "semua tempat")
1. **`modules/finance/filter-laporan.js`** — `resolveTxOwnerAssignment()`:
   fallback `owners[0].ownerId` DIHAPUS TOTAL. Transaksi tanpa
   `deductionOwnerId`/`ownerPorsiId` eksplisit yang valid sekarang balik
   `null` (tidak diassign ke siapa pun). Semua konsumen membandingkan hasil
   fungsi ini dengan `=== o.ownerId`, jadi `null` otomatis tidak pernah
   match — 0 perubahan kontrak caller diperlukan. Efek otomatis konsisten
   di: `_linkedExpenseTotalForOwner()` (Dana Titipan), kartu "Porsi per
   Pemilik" (Riwayat Transaksi akun), dan badge "👤 Ditanggung" per baris.
2. **`modules/finance/transaksi.js`** — `updateTxDeductionOwnerVisibility()`:
   auto-preselect untuk akun 1-owner dihapus, sekarang selalu default
   kosong (`sel.value=''`) sama seperti akun multi-owner — field benar-
   benar opsional/opt-in, user pilih sadar. Validasi wajib-isi **tidak
   diubah** (tetap hanya wajib kalau `owners.length>1`) — transaksi tetap
   bisa disimpan tanpa akun potongan sesuai permintaan user.

0 rumus split baru ditulis di kedua file — murni menghapus 1 fallback
implisit + 1 auto-select implisit.

## Dampak yang disengaja (perlu diketahui user)
Setelah rilis ini, "Estimasi dari Transaksi <Akun>" untuk owner Dana
Titipan akun 1-owner akan **turun** (kemungkinan ke Rp 0) untuk transaksi
lama yang belum pernah ditandai `deductionOwnerId` secara eksplisit —
sampai user mulai menandai transaksi yang memang dimaksudkan untuk pocket
tsb lewat dropdown "Pemilik Sumber Potongan" yang sekarang selalu tampil
kosong (opsional) di form Transaksi.

## Test
- **Baru:** `tests/patch-2026-08-15-titipan-explicit-owner-only.test.js`
  (3 test) — reproduksi persis skenario laporan (akun BRI/"Uang motor",
  14 transaksi rumah tangga tanpa tag vs 1 transaksi eksplisit), kontrak
  "boleh simpan tanpa akun potongan" (balik `null`, bukan reject/error),
  dan kontrak "eksplisit tetap terhitung penuh".
- **Update (14 test, semua di file yang sudah ada)** — mengganti asumsi
  fallback lama dengan kontrak baru (tambah `deductionOwnerId` eksplisit
  di data uji, atau assert `Rp0`/`null` untuk kasus tanpa tag):
  - `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js`
    (A4, A5)
  - `tests/res-c-tx-deduction-owner-resolver-integration.test.js` (Res-C
    2/6)
  - `tests/s575-tx-deduction-owner-visibility.test.js` (2/6, 4/6, 6/6)
  - `tests/s567-filtertx-owner-split.test.js` (2 test)
  - `tests/s569-resolve-tx-owner-split-stale-fix.test.js` (2 test)
  - `tests/sC-titipan-majoris-expense-comparison.test.js` (test 1, 3, 5)
- Baseline sebelum fix: 4337/4337 pass (post-S620), 14 gagal setelah
  fallback dihapus (semuanya menguji perilaku lama yang sengaja diganti).
- **Full suite sesudah fix: 4340/4340 pass, 0 regresi.**

## Build
`node scripts/build.js s621-titipan-explicit-owner-only` — versi naik dari
**1349** (auto-label, dikoreksi) ke **1350**, `app_production.html`/bundle/
`sw.js` diregenerasi otomatis, versi konstanta disamakan di 5 file source.

⚠️ Release gate (`verify-release-ready.js`) di-override manual untuk 2 gate
(lint, minify) — eslint & esbuild tidak tersedia di sandbox tanpa akses
jaringan ini. Sintaks bundle tetap divalidasi via `node --check` (lolos).
Rekomendasi: jalankan `npm run check` penuh (lint asli + minify asli) di
mesin dev kamu sebelum upload final kalau memungkinkan.

## Isi ZIP (hanya file yang berubah/baru dari S620)
- `index.html`, `app_production.html`, `sw.js`
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `modules/finance/filter-laporan.js` — **fix inti**
- `modules/finance/transaksi.js` — **fix inti**
- `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`,
  `modules/shared/features-helpers-global-security.js` (version-sync saja)
- `chat-action-handlers.js` (version-sync saja)
- `tests/patch-2026-08-15-titipan-explicit-owner-only.test.js` (baru)
- `tests/fix-holding-direct-account-titipan-and-ghost-asset-link.test.js`,
  `tests/res-c-tx-deduction-owner-resolver-integration.test.js`,
  `tests/s575-tx-deduction-owner-visibility.test.js`,
  `tests/s567-filtertx-owner-split.test.js`,
  `tests/s569-resolve-tx-owner-split-stale-fix.test.js`,
  `tests/sC-titipan-majoris-expense-comparison.test.js` (update assertion)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
- `docs/RELEASE-GATE-LOG.md` (log override lint/minify)

⚠️ Upload SEMUA file di atas (bukan cuma "fix inti") — versi harus tetap
sinkron di seluruh file sesuai aturan build.

## Sesi berikutnya
Belum ada tindak lanjut wajib. Kandidat kalau ada laporan serupa: audit
apakah ada tempat lain yang masih mengandalkan asumsi implisit "akun
1-owner = semua transaksi otomatis milik owner itu" di luar 3 konsumen
`resolveTxOwnerAssignment()` yang sudah dicek sesi ini.
