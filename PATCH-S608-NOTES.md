# Patch S608 — Sinkronisasi "Porsi per Pemilik" ↔ Dashboard Dana Titipan

Versi build: 1335 (naik dari 1334)

## Bug
Angka "Pengeluaran" per pemilik di kartu **Porsi per Pemilik** (Riwayat
Transaksi) tidak pernah cocok dengan angka **"Estimasi dari Transaksi
<Akun>"** di dashboard Dana Titipan, walau keduanya merepresentasikan
data yang sama (transaksi akun yang sama).

Root cause — ada 2 sumber kebenaran berbeda untuk "transaksi ini milik
pemilik siapa":
1. `resolveTxOwnerAssignment()` (filter-laporan.js) — baca field
   `t.ownerPorsiId`. Field ini **sudah mati**: UI penulisnya
   (`updateTxOwnerPorsiOptions()`) sudah dihapus total sejak sesi lama
   (AUDIT-S540/B1-B12-DOUBLECOUNT), jadi field ini tidak pernah ditulis
   lagi oleh kode manapun — fungsi ini selalu jatuh ke fallback "owner
   pertama" untuk semua transaksi.
2. `_expenseComparisonForOwner()` (dana-titipan-portfolio-render.js) —
   pakai pembagian **proporsional** (`MultiOwnerEngine.splitByPorsi`)
   berdasarkan % kepemilikan, bukan assignment eksplisit per transaksi
   sama sekali.

Field yang **aktif dan benar-benar tersimpan** adalah `t.deductionOwnerId`
(picker "Pemilik Sumber Potongan", S574) — field yang sama yang dipakai
badge "👤 Ditanggung: <owner>" di tiap baris transaksi.

## Fix
- `resolveTxOwnerAssignment()`: sekarang baca `t.deductionOwnerId` lebih
  dulu (sumber aktif), fallback `t.ownerPorsiId` (legacy, jaga-jaga data
  lama), baru owner pertama. 0 perubahan pada signature/kontrak fungsi.
- `_expenseComparisonForOwner()`: ganti dari `splitByPorsi` proporsional
  ke penjumlahan transaksi per `resolveTxOwnerAssignment()` — REUSE fungsi
  yang sama dengan kartu Porsi per Pemilik, sehingga kedua layar sekarang
  membaca satu sumber kebenaran yang identik.

## File yang berubah
- `modules/finance/filter-laporan.js` — fix `resolveTxOwnerAssignment()`
- `modules/finance/dana-titipan-portfolio-render.js` — fix
  `_expenseComparisonForOwner()`
- `tests/s567-filtertx-owner-split.test.js` — 2 test baru (deductionOwnerId
  eksplisit + prioritas di atas ownerPorsiId legacy)
- `tests/sC-titipan-majoris-expense-comparison.test.js` — test 1 diupdate
  (semula mengasumsikan proporsi, sekarang assignment eksplisit) + 2 test
  baru (1b: owner minor tidak lagi "nyicip" ke mayoritas; 1c: konsistensi
  lintas-layar)
- File turunan build (auto-generated, wajib ikut diupload):
  `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js`, `chat-action-handlers.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js`,
  `modules/shared/features-helpers-global-security.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md`

## Verifikasi
- Test suite: **4232/4232 PASS** (naik dari 4228 — 4 test baru)
- `node scripts/build.js`: sukses, versi 1335
- `verify-window-expose.js`: OK
- `verify-release-ready.js`: LOLOS (lint & minify di-override manual —
  sandbox tanpa akses npm registry/jaringan, dicatat di
  `docs/RELEASE-GATE-LOG.md`)

## Catatan penting
Ini zip **patch** (hanya file yang berubah) — copy/overwrite ke folder
project Anda, jangan extract sebagai project baru. Upload SEMUA file di
atas, termasuk bundle & HTML (bukan cuma source module-nya).
