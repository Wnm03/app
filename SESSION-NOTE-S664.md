# Sesi S664 — Badge jumlah holding di opsi dropdown owner (filter bar)

## Konteks

Lanjutan dari daftar "Ide lanjutan" user pasca-S662/S663, poin 2 kategori
"Ringan, sesi kecil":

> **Badge jumlah** di opsi dropdown owner, mis. "Istri (3 holding)" — biar
> user tahu seberapa banyak sebelum klik.

`InvestmentListUI._renderFilterBar()` (S662) sebelumnya cuma menampilkan nama
owner di tiap opsi dropdown "Pemilik" (mis. `<option>Istri</option>`) — user
harus pilih dulu baru tahu berapa banyak holding yang bakal muncul. Sesi ini
menambahkan badge jumlah di label opsi itu sendiri.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-list-view.js`
(`InvestmentListUI._renderFilterBar()`). `modules/asset/investasi.js` (S660)
**TIDAK disentuh** — reuse penuh `Investment.getOwners(h)` yang sudah ada,
0 rumus baru.

- **`_renderFilterBar(allHoldings)` (diedit)** — `ownerMap` sebelumnya
  `Map<ownerId, name>`, sekarang `Map<ownerId, {name, count}>`. `count` =
  **jumlah HOLDING** (bukan jumlah baris kepemilikan di `getOwners()`) di
  mana owner itu muncul sbg salah satu pemilik non-SELF. Dijaga dgn
  `Set` per-holding (`seenInThisHolding`) supaya 1 holding yang (secara data
  lama/duplikat) punya >1 baris owner dgn `ownerId` yang sama TIDAK
  dihitung dobel — badge ini soal "berapa holding", bukan "berapa baris
  kepemilikan". Holding patungan (2+ pemilik non-SELF berbeda) otomatis
  menambah count di **masing-masing** owner tsb (bukan cuma satu), sesuai
  makna "holding di mana owner X punya porsi".
- Label opsi jadi `escapeHtml(info.name) + ' (' + info.count + ' holding)'`
  — opsi `"👥 Semua Pemilik"` (default) SENGAJA tidak diberi badge angka
  (tidak ada satu angka tunggal yang bermakna utk "semua").
- **0 perubahan** ke `onFilterOwnerChange`/`onFilterSettlementChange`/
  `_holdingMatchesFilter`/`_renderSummary` (S663) — badge murni kosmetik di
  label opsi, logic filter & baris info ringkasan 0 disentuh.

**Test lama yang disesuaikan (bukan source, cuma assertion)**:
`tests/s662-investmentlistui-owner-settlement-filter.test.js` baris assertion
`/>Istri</` (label polos) diupdate jadi `/>Istri \(1 holding\)</` supaya
tetap cocok dgn label baru — perilaku LAMA yang diuji (filter bar muncul
begitu ada owner non-SELF) tidak berubah, cuma formatnya makin spesifik.

## Verifikasi

- `node -c modules/asset/investasi-list-view.js` — lolos.
- Test baru: `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js`
  (6 test: 1 owner/1 holding -> badge "(1 holding)"; 1 owner/3 holding ->
  "(3 holding)"; 2 owner beda jumlah -> badge masing-masing independen;
  holding patungan 2 pemilik non-SELF -> masing-masing tetap "(1 holding)",
  bukan double-count; opsi "Semua Pemilik" tidak diberi badge angka; badge
  ikut update benar setelah tambah holding baru & render ulang).
- Full suite (`node --test tests/*.test.js`): **4954/4954 pass** (4948
  sebelumnya + 6 baru sesi ini, 0 gagal, 0 regresi).
- Release Gate (`node scripts/verify-release-ready.js`): lint & minifikasi
  di-override (environment sandbox tanpa akses jaringan, eslint/esbuild
  tidak terpasang — override tercatat di `docs/RELEASE-GATE-LOG.md`);
  html-sync & version-sync lolos normal (0 perubahan `index.html` sesi ini).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan sesi S660 |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test baru |
| `SESSION-NOTE-S661.md` | S661 | catatan sesi S661 |
| `modules/asset/investasi-list-view.js` | S662, S663, S664 | S662: filter daftar owner+settlement. S663: + baris info ringkasan ikut filter. S664: + badge jumlah holding di opsi dropdown owner |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 (assertion diupdate S664) | test — 1 baris disesuaikan format label baru |
| `SESSION-NOTE-S662.md` | S662 | catatan sesi S662 |
| `tests/s663-investmentlistui-summary-filter-note.test.js` | S663 | test baru |
| `SESSION-NOTE-S663.md` | S663 | catatan sesi S663 |
| `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js` | S664 | test baru |
| `SESSION-NOTE-S664.md` | S664 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan)

Sisa ide dari daftar "Ide lanjutan" user (independen, tidak saling
blocking):

- **Pola sama ke `D.assets[]` (Buku Aset)** — sudah dicatat sejak S660,
  masih tertunda.
- **Filter nyambung ke Dana Titipan tab** (grup custodian S540 &
  `DanaTitipanPortfolioPresenter`) — belum tersambung ke `ownerSettlement`.
- **Multi-select owner** (bukan cuma 1 pemilik sekaligus) — belum
  dikerjakan, butuh desain state UI terpisah dari `filterOwnerId` tunggal
  yang ada sekarang.
