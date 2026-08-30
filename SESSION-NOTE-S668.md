# Sesi S668 — Filter Owner+Status nyambung ke tab Dana Titipan

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan" `SESSION-NOTE-S667.md`:
"S668: filter Owner+Status di daftar Buku Aset (S667) & daftar Investasi
(S662) nyambung ke tab Dana Titipan (`DanaTitipanPortfolioPresenter`) —
supaya konsisten dgn filter yang sudah ada di kedua daftar itu." Fondasi
query (`Aset.getOwnerSettlement()`/`Investment.getOwnerSettlement()`) sudah
ada sejak S660/S665 — sesi ini menyambungkan ke UI **tab Dana Titipan**
(`#danaTitipanTabList`, sub-tab Laporan → Dana Titipan): dropdown "Pemilik"
+ "Status" di atas daftar kartu owner, mirroring `InvestmentListUI` (S662)
1:1 sejauh polanya cocok — beda struktur data (di sini 1 kartu = 1 owner
teragregasi lintas holding Aset+Investasi, bukan 1 baris = 1 item).

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/finance/dana-titipan-
portfolio-render.js`. `dana-titipan-aggregation-api.js` (`build()`) **TIDAK
disentuh** — reuse penuh `projection.owners[].holdings[]` yang SUDAH ADA
(field `linkedAssetId`/`linkedInvestmentId`/`linkedOwnerId`), 0 agregasi
baru.

- **State baru**: `DanaTitipanPortfolioPresenter.filterOwnerId` /
  `filterSettlement` (default `''`), pola SAMA PERSIS
  `InvestmentListUI.filterOwnerId`/`filterSettlement` — state UI murni,
  direset tiap reload halaman, TIDAK ditulis ke `D`.
- **`_holdingSettlement(hh)`** (BARU): resolve status settlement 1 baris
  holding owner (`o.holdings[]`) dgn REUSE PENUH `Aset.getOwnerSettlement()`
  (holding domain Aset, via `hh.linkedAssetId`) / `Investment.
  getOwnerSettlement()` (holding domain Investasi, via
  `hh.linkedInvestmentId`) — 0 rumus baru, murni lookup entity asal + guard
  fallback `'titipan'` kalau entity sudah tidak ketemu.
- **`_ownerMatchesFilter(o)`** (BARU): predicate murni (0 mutasi).
  `filterOwnerId` kosong → lolos semua. Owner harus cocok `filterOwnerId`
  DAN, kalau `filterSettlement` juga diisi, MINIMAL 1 holding owner ini
  cocok `_holdingSettlement()` — beda granularitas dari Aset/Investasi
  (per-item match langsung) karena di sini 1 kartu owner merangkum banyak
  holding; filter beroperasi di level KARTU OWNER (unit yang dirender
  `_ownerListHtml()`), bukan menyembunyikan holding individual di dalam
  kartu.
- **`_renderFilterBar(owners)`** (BARU): 2 dropdown "Pemilik" & "Status",
  badge jumlah "(N holding)" per owner (`o.holdings.length`, pola sama
  badge "(N holding)"/"(N aset)" S664/S667). 0 owner → balikin `''` (filter
  bar disembunyikan total). Dropdown Status disabled kalau `filterOwnerId`
  kosong.
- **`onFilterOwnerChange(val)` / `onFilterSettlementChange(val)`** (BARU):
  set state lalu panggil `DanaTitipanPortfolioPresenter.
  renderInto('danaTitipanTabList')` LANGSUNG — beda dari
  `InvestmentListUI` (2 method render terpisah) karena Dana Titipan tab 0
  kartu ringkasan terpisah dari isi utama container.
- **`_renderNow(el)` diwiring ulang** dgn gate `isTabView = (el.id ===
  'danaTitipanTabList')`: filter bar + `filteredOwners` HANYA dibangun &
  dipakai kalau `isTabView` — kartu ringkas `#danaTitipanPortfolioList` (tab
  Ringkasan, di dalam kartu Dana Kelolaan) **TETAP 100% apa adanya, 0 filter
  bar, 0 owner disembunyikan**, sesuai permintaan eksplisit user
  "nyambungin filter ini ke tab Dana Titipan" (bukan kartu ringkas). Filter
  bar dibangun dari `projection.owners` PENUH (sebelum difilter) supaya
  opsi dropdown tetap lengkap. `poolSummary`/`totals.*` di bawah TETAP
  dihitung dari `projection` penuh (0 diubah) — filter ini HANYA memfilter
  kartu owner apa yang dirender, sama seperti S662/S667. Pesan kosong
  dibedakan: **"Belum ada porsi dana titipan..."** (0 data sama sekali,
  pesan lama, 0 diubah) vs **"🔍 Tidak ada pemilik dana titipan yang cocok
  dengan filter ini"** (`filteredOwners` kosong tapi `projection.owners`
  tidak, HANYA bisa terjadi di `isTabView`).

## Verifikasi

- `node -c modules/finance/dana-titipan-portfolio-render.js` — lolos.
- Test baru: `tests/s668-dana-titipan-owner-status-filter.test.js` (16
  test): `_holdingSettlement()` (domain Aset/Investasi, default + fallback
  entity hilang), `_ownerMatchesFilter()` (filterOwnerId kosong/terisi,
  filterSettlement butuh ≥1 holding cocok), `_renderFilterBar()` (kosong
  kalau 0 owner, badge "(N holding)", dropdown Status disabled/enabled),
  `onFilterOwnerChange()`/`onFilterSettlementChange()` (state + delegasi ke
  `renderInto('danaTitipanTabList')`, normalisasi nilai tidak valid),
  `renderInto()`/`_renderNow()` end-to-end (filter bar HANYA di
  `danaTitipanTabList` TIDAK di `danaTitipanPortfolioList` walau state
  filter terisi, hasil filter menyembunyikan kartu yang tidak cocok, 2
  pesan kosong berbeda).
- Full suite (`node --test tests/*.test.js`): **5000/5000 pass** (4984
  sebelumnya + 16 baru, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1470**.
- Release Gate: **lolos via override** — `eslint`/`esbuild` tidak tersedia
  di sandbox ini (tidak ada akses jaringan utk `npm install`), di-override
  manual lewat `CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  tercatat di `docs/RELEASE-GATE-LOG.md`. Gate html-sync & version-sync
  lolos bersih (tanpa override).

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
| `SESSION-NOTE-S667.md` | S667 | catatan |
| `modules/finance/dana-titipan-portfolio-render.js` | S668 | filter Owner+Status nyambung ke tab Dana Titipan |
| `tests/s668-dana-titipan-owner-status-filter.test.js` | S668 | test baru |
| `SESSION-NOTE-S668.md` | S668 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- **S669**: multi-select owner di daftar Investasi (`InvestmentListUI`) —
  saat ini filter Pemilik cuma single-select (`filterOwnerId` 1 nilai),
  rencana lanjutan izinkan pilih beberapa owner sekaligus.
- **S670**: filter Owner+Status di dalam kartu ringkas
  `#danaTitipanPortfolioList` (tab Ringkasan) — SENGAJA TIDAK disentuh sesi
  ini (kartu ringkas dibiarkan apa adanya sesuai permintaan eksplisit user),
  kalau nanti dibutuhkan bisa reuse penuh `_renderFilterBar()`/
  `_ownerMatchesFilter()` yang sudah ada, cuma ubah gate `isTabView` jadi
  mencakup kedua container (atau parameter eksplisit).
