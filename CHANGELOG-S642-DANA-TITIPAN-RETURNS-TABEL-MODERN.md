# Patch — Sesi s642 (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md)
Mini-tabel Ledger Pro di dalam kartu owner Dana Titipan

**Baseline:** app-main + overlay s635–s641 (4601/4601 test pass sebelum
sesi ini).

## Scope
`_returnsHistoryHtml(ownerId)` (`modules/finance/dana-titipan-portfolio-render.js`)
— daftar "Riwayat pengembalian" per owner, dipanggil dari dalam badan
`<details class="u-mb6..." id="titipanOwnerCard_${oi}">` (kartu owner,
S631–S634).

## Keputusan desain (sesuai 2 poin checklist rencana §6)
- Struktur `<details>` kartu owner **TIDAK diganti** — hanya isi daftar
  return yang tadinya `<div>` per-baris diganti mini-`<table class="tx-tbl">`
  saat tema modern. Bagian lain kartu owner (badge, summary sticky,
  holdings list, dropdown tautkan aset) 0 disentuh.
- Kolom tabel: Tanggal, Catatan, Nominal, tombol hapus — reuse class
  `.tx-tbl*`/`.money`/`.tx-amount` dari s637/s638, 0 CSS baru.

## Perubahan
- `_returnsHistoryHtml()`: percabangan `D.profile&&D.profile.theme==='modern'`
  → mini-tabel; else → jalur `<div>`/flex lama byte-identik dgn sebelum
  sesi ini.
- Guard `typeof D!=='undefined'` (pola konsisten sisa file ini).

## Yang TIDAK diubah
- Struktur `<details>` pembungkus kartu owner & seluruh bagian lain di
  dalamnya (holdings, badge, dropdown aset, sticky summary)
- `_holdingsListHtml()`, `_ownerCardHtml()`, kartu kustodian — 0 disentuh
- `tx-list-cashflow.js`, `styles.css`, `filter-laporan.js` (s641),
  `modules-render.js` (s637), `aset.js` (s639) — 0 disentuh sesi ini

## File yang berubah
- `modules/finance/dana-titipan-portfolio-render.js` — mini-tabel di
  `_returnsHistoryHtml()`

## File baru
- `tests/s642-dana-titipan-returns-tabel-modern.test.js` — 5 test: render
  mini-tabel di tema modern, jalur lama tetap untuk tema lain, guard
  `D.profile` kosong, kasus kosong (0 return) di kedua tema, escapeHtml
  tetap aman + tombol hapus tetap berfungsi di dalam tabel.

## Verifikasi
- `node --test tests/s642-dana-titipan-returns-tabel-modern.test.js` →
  5/5 pass
- `node --test tests/*.test.js` → **4606/4606 pass** (4601 sebelumnya + 5
  baru), 0 fail, 0 regresi

## Status cakupan Ledger Pro (update dari s641)
| Layar | Status |
|---|---|
| Beranda | ✅ ticker (s636) |
| Uang (`#allTx`) | ✅ tabel + saldo berjalan (s637) |
| Aset (`#assetList`) | ✅ tabel list padat (s639) |
| Riwayat (`#filterTxList`) | ✅ tabel + saldo berjalan kondisional (s641) |
| **Dana Titipan** | **✅ mini-tabel riwayat pengembalian di dalam `<details>` (s642, sesi ini)** — struktur holdings/badge/owner card lain masih non-tabel by design (bukan daftar transaksi datar, tidak cocok pola Ledger Pro literal — lihat §2 rencana) |

**Belum dikerjakan:** s643 — audit lintas 2 sesi terakhir (s641+s642) +
full run + evaluasi ulang keputusan go/no-go default, sesuai
`RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md` §3.
