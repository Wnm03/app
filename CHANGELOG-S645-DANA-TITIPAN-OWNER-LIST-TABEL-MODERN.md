# Patch — Sesi s645 (RENCANA-PERLUASAN-LEDGER-PRO-RIWAYAT-TITIPAN.md)
List ringkasan per-owner Dana Titipan ("👤 nama Pokok→Kini") dibungkus
tabel Ledger Pro.

**Baseline:** app-main + overlay s635–s644 (4622/4622 test pass sebelum
sesi ini).

## Latar belakang
Laporan user (via 3 screenshot): setelah s644 (holdings-per-instrumen
sudah jadi tabel), bagian **list ringkasan per-owner** di ATAS holding
("👤 renov Pokok Rp X → Kini Rp Y +Rp 0", dst — baris `<summary>` kartu
owner) masih tampil flat/div, tidak ikut jadi tabel spt mockup Ledger
Pro, walau tema `modern` sudah aktif (dikonfirmasi dari font mono pada
angka di screenshot ke-3).

## Scope
`_renderNow()` (`modules/finance/dana-titipan-portfolio-render.js`) —
bagian `projection.owners.map((o, oi) => \`<details>...\`).join('')` yang
dulu inline di dalam template literal `el.innerHTML`.

## Keputusan desain
- Markup 1 kartu owner (`<details id="titipanOwnerCard_${oi}">` beserta
  SEMUA isinya — summary, grid detail, 3 tombol aksi, dropdown tautkan
  aset, riwayat pengembalian, holdings bersarang) **DIEKSTRAK APA ADANYA**
  ke `_ownerCardHtml(o, oi)` — 0 markup/wiring diubah, byte-identik
  dgn sebelum sesi ini.
- `_ownerListHtml(owners)` — gate `D.profile.theme==='modern'`, pola SAMA
  PERSIS `_holdingsListHtml()` (s644): tema modern → `_ownerListHtmlModern()`,
  10 tema lama → flat join `_ownerCardHtml()` apa adanya.
- `_ownerListHtmlModern(owners)` — bungkus tiap kartu owner dalam
  `<table class="tx-tbl">` (reuse class S637/s642/s644, 0 CSS baru
  kecuali 1 aturan padding), **1 `<tr><td colspan="3">` per owner** (BUKAN
  3 `<td>` sungguhan) — karena tiap kartu owner tetap 1 `<details>` utuh
  yang butuh lebar penuh utk expand/tombol/dropdown/holdings bersarang,
  beda dari `_holdingsTableHtmlModern()` (s644) yang barisnya flat/leaf
  tanpa expand sehingga bisa 3 `<td>` sungguhan. Header kolom (`Pemilik` /
  `Pokok → Kini` / `±`) murni acuan visual, konsisten dgn pola tabel
  lain di tema ini.
- 1 aturan CSS baru: `.titipan-tbl-owner-cell` — kurangi padding default
  `.tx-tbl td` (8px) supaya `<details>` kartu owner di dalamnya tidak
  double-padded.

## Yang TIDAK diubah
- Isi kartu owner itu sendiri (`_ownerCardHtml`) — 0 karakter berubah
  dibanding markup lama, cuma dipindah ke method terpisah.
- `_holdingsListHtml()`/`_holdingsTableHtmlModern()` (s644),
  `_returnsHistoryHtml()` (s642), `_groupHoldingsByCustodian()` (S540-D)
  — 0 disentuh.
- `render()` dipindah posisi (sebelum `_ownerCardHtml()` dkk, bukan
  sesudah) supaya test gap-check lama (`s485d-titipan-commitment-ui.test.js`,
  cek raw-source slice `render()`→`const DanaTitipanCommitmentUI`) tetap
  menemukan markup tombol — 0 logic test diubah, murni reorder method.

## File yang berubah
- `modules/finance/dana-titipan-portfolio-render.js` — ekstrak
  `_ownerCardHtml()`, tambah `_ownerListHtml()`/`_ownerListHtmlModern()`,
  reorder posisi method (lihat di atas)
- `styles.css` — 1 aturan `.titipan-tbl-owner-cell`

## File baru
- `tests/s645-dana-titipan-owner-list-tabel-modern.test.js` — 6 test:
  render tabel + header di tema modern, wiring kartu owner (id/data-action/
  dropdown/holdings) tetap utuh di dalam `<td>`, jalur lama utk 10 tema
  lain (0 `<table>`), guard `profile.theme` kosong, banyak owner (urutan
  terjaga), integrasi lewat `_renderNow()` penuh.

## Verifikasi
- `node --test tests/s645-*.test.js` → 6/6 pass
- `node --test tests/*.test.js` → **4628/4628 pass**, 0 fail, 0 regresi
  (4622 sebelumnya + 6 baru)

## Status cakupan Ledger Pro Dana Titipan (update dari s644)
| Bagian | Status |
|---|---|
| Holdings per instrumen (dalam kartu owner) | ✅ tabel (s644) |
| Riwayat pengembalian (dalam kartu owner) | ✅ mini-tabel (s642) |
| **List ringkasan per-owner (di atas kartu holding)** | **✅ tabel, kartu `<details>` tetap utuh per baris (s645, sesi ini)** |

**Belum dikerjakan / non-goal sesi ini:** baris "Total Teralokasi" /
"Total Pokok Dikomit" / dst di bawah list owner (footer summary) —
TIDAK disentuh, tetap markup lama; belum ada laporan user soal bagian
ini.
