# Sesi S667 — Filter Owner+Status di daftar Buku Aset

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan" `SESSION-NOTE-S666.md`:
"S667: filter Owner+Status di daftar Buku Aset (`Aset.renderList()`,
`aset.js`), pola sama `investasi-list-view.js` S662." Fondasi query
(`Aset.getOwnerSettlement()`/`setOwnerSettlement()`/`assetsByOwnerSettlement()`)
sudah ada sejak S665, wiring toggle di modal "⚖️ Atur Porsi Kepemilikan" aset
sudah ada sejak S666 — sesi ini menyambungkan ke UI **daftar** Buku Aset
(`#assetList`): dropdown "Pemilik" + "Status" di atas daftar, mirroring
`InvestmentListUI` (S662, `investasi-list-view.js`) 1:1, supaya user bisa
"lihat semua aset yang ditandai titipan dari Adik" langsung dari daftar Buku
Aset, sama seperti sudah bisa dilakukan di daftar Investasi sejak S662.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/aset.js`.
`modules/asset/aset-owners.js` (S665/S666) **TIDAK disentuh** — reuse penuh
`Aset.getOwnerSettlement()`/`MultiOwnerEngine.getOwners()` yang sudah ada, 0
rumus baru.

- **State baru**: `Aset.filterOwnerId` / `Aset.filterSettlement` (default
  `''`), pola SAMA PERSIS `InvestmentListUI.filterOwnerId`/`filterSettlement`
  — state UI murni, direset tiap reload halaman, TIDAK ditulis ke `D`.
- **`Aset._renderFilterBar(list)`** (BARU): bangun 2 dropdown "Pemilik" &
  "Status" dari `MultiOwnerEngine.getOwners(a)` (owner non-SELF, kanonik lewat
  OwnerRegistry) + `Aset.getOwnerSettlement()`. Badge jumlah "(N aset)" per
  owner (dihitung per aset unik, bukan per baris kepemilikan — pola sama
  badge "(N holding)" `InvestmentListUI` S664). 0 owner non-SELF sama sekali
  → balikin `''` (filter bar disembunyikan total, bukan dirender
  kosong/nganggur). Dropdown Status disabled kalau `filterOwnerId` kosong
  (settlement adalah properti PER owner-aset, tidak bermakna tanpa owner
  terpilih).
- **`Aset._assetMatchesFilter(a)`** (BARU): predicate murni (0 mutasi),
  dipakai `Array.prototype.filter()` di `renderList()`. `filterOwnerId`
  kosong → lolos semua. Owner harus ADA di aset (non-SELF) DAN, kalau
  `filterSettlement` juga diisi, statusnya harus cocok
  `Aset.getOwnerSettlement()`.
- **`Aset.onFilterOwnerChange(val)` / `onFilterSettlementChange(val)`**
  (BARU): onchange handler dropdown, set state lalu panggil
  `Aset.renderList()` langsung — pola SAMA PERSIS `assetOwnFilter` yang sudah
  ada sejak S235 (`onchange="Aset.renderList()"` di `index.html`), BEDA dari
  `InvestmentListUI` yang re-render summary+list terpisah (Buku Aset tidak
  punya kartu ringkasan terpisah dari `renderList()` seperti
  `#investSummaryValue`, jadi 0 perlu jalur partial render tersendiri).
- **`Aset.renderList()` diwiring ulang**: filter bar dibangun dari `list`
  (SUDAH lolos filter tipe kepemilikan `assetOwnFilter` S235 + SUDAH exclude
  item yang termigrasi ke Investasi) SEBELUM difilter owner+status — supaya
  opsi dropdown owner tetap lengkap walau filter Status sedang menyembunyikan
  sebagian aset (pola sama `InvestmentListUI._renderFilterBar(allHoldings)`).
  Hasil filter jadi `filteredList`, dipakai di SEMUA jalur render (kartu
  `.tx-item` 10 tema lama, tabel modern S639, DAN kedua state kosong) —
  dengan pesan kosong yang dibedakan: **"Belum ada aset tercatat"** (0 aset
  sama sekali) vs **"🔍 Tidak ada aset yang cocok dengan filter ini"**
  (`filteredList` kosong tapi `list` tidak, filter menyembunyikan semuanya).
  Dashboard/`renderDashboard()`/dst di bawah TETAP dihitung dari `D.assets`
  penuh (0 diubah) — filter ini HANYA memfilter apa yang dirender di daftar,
  sama seperti `assetOwnFilter` sudah berlaku sejak S235.

**Test lama diupdate** (bukan file source kedua):
`tests/s639-aset-tabel-modern-list-padat.test.js` — 2 assertion source-check
untuk wiring `renderList()` diupdate mengikuti pergantian nama variabel
(`list`→`filteredList`, ditambah prefix `ownerFilterBar`).

## Verifikasi

- `node -c modules/asset/aset.js` — lolos.
- Test baru: `tests/s667-aset-owner-status-filter.test.js` (16 test):
  `_renderFilterBar()` (kosong kalau 0 owner non-SELF, badge jumlah per
  owner, dropdown Status disabled/enabled, opsi terpilih sesuai state, badge
  dihitung per ASET bukan per baris owner), `_assetMatchesFilter()`
  (filterOwnerId kosong lolos semua, owner tidak ada → false, filterSettlement
  kosong vs diisi, default 'titipan' vs sudah di-set 'milik'),
  `onFilterOwnerChange()`/`onFilterSettlementChange()` (state + delegasi ke
  `Aset.renderList()`, normalisasi nilai tidak valid), state awal, 2 wiring
  source-check untuk `renderList()`.
- Full suite (`node --test tests/*.test.js`): **4984/4984 pass** (4968
  sebelumnya + 16 baru, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1469**.
- Release Gate: **lolos via override** — `eslint`/`esbuild` tidak tersedia di
  sandbox ini (tidak ada akses jaringan utk `npm install`), di-override
  manual lewat `CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  tercatat di `docs/RELEASE-GATE-LOG.md` (entri
  `2026-08-30T07:37:54.199Z`). Gate html-sync & version-sync lolos bersih
  (tanpa override).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `tests/s660-investasi-owner-settlement-bukan-titipan.test.js` | S660 | test |
| `docs/ZIP_RULES.md` | S660 | aturan Mode Patch ZIP |
| `SESSION-NOTE-S660.md` | S660 | catatan |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `tests/s661-investmentui-owner-settlement-toggle.test.js` | S661 | test |
| `SESSION-NOTE-S661.md` | S661 | catatan |
| `modules/asset/investasi-list-view.js` | S662, S663, S664 | filter owner+status, baris info ringkasan, badge jumlah |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 (assertion diupdate S664) | test |
| `SESSION-NOTE-S662.md` | S662 | catatan |
| `tests/s663-investmentlistui-summary-filter-note.test.js` | S663 | test |
| `SESSION-NOTE-S663.md` | S663 | catatan |
| `tests/s664-investmentlistui-filterbar-owner-count-badge.test.js` | S664 | test |
| `SESSION-NOTE-S664.md` | S664 | catatan |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation (S665) + wiring UI toggle (S666) |
| `tests/s665-aset-owner-settlement-bukan-titipan.test.js` | S665 | test |
| `SESSION-NOTE-S665.md` | S665 | catatan |
| `tests/s666-aset-owners-settlement-toggle-ui.test.js` | S666 | test baru |
| `SESSION-NOTE-S666.md` | S666 | catatan |
| `modules/asset/aset.js` | S667 | filter Owner+Status di daftar Buku Aset |
| `tests/s667-aset-owner-status-filter.test.js` | S667 | test baru |
| `tests/s639-aset-tabel-modern-list-padat.test.js` | S667 | assertion source-check diupdate (wiring `renderList()`) |
| `SESSION-NOTE-S667.md` | S667 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- **S668**: filter Owner+Status nyambung ke tab Dana Titipan
  (`DanaTitipanPortfolioPresenter`) — supaya konsisten dgn filter yang sudah
  ada di daftar Investasi (S662) & daftar Buku Aset (S667 ini).
- **S669**: multi-select owner di daftar Investasi (`InvestmentListUI`) —
  saat ini filter Pemilik cuma single-select (`filterOwnerId` 1 nilai),
  rencana lanjutan izinkan pilih beberapa owner sekaligus.
