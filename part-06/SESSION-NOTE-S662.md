# Sesi S662 — Filter daftar investasi/portfolio berdasarkan owner+settlement

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan sesi ini" di
SESSION-NOTE-S661.md: fondasi query (`Investment.getOwnerSettlement()`/
`setOwnerSettlement()`/`holdingsByOwnerSettlement()`, S660) dan toggle UI di
modal "⚖️ Atur Porsi Kepemilikan" (S661) sudah ada — sesi ini menyambungkan
ke **daftar holding** (tab 💹 Investasi): dropdown "Pemilik" + "Status" di
atas daftar, supaya user bisa mis. "Tampilkan: Milik Istri, bukan Titipan"
tanpa buka satu-satu holding.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-list-view.js`
(`InvestmentListUI`). `modules/asset/investasi.js` (fondasi S660) **TIDAK
disentuh lagi** sesi ini — reuse penuh API yang sudah ada, 0 rumus baru.

- `InvestmentListUI.filterOwnerId` / `filterSettlement` (BARU) — state UI
  murni (bukan ditulis ke `D`), direset tiap reload halaman, pola sama
  `editId`. `filterOwnerId=''` = Semua Pemilik; `filterSettlement=''` =
  Semua Status.
- `_renderFilterBar(allHoldings)` (BARU) — bangun 2 `<select>` dari
  `Investment.getOwners(h)` (opsi owner non-SELF, dikumpulkan dari holding
  yang ADA sekarang, bukan `OwnerRegistry.listAll()` penuh — supaya tidak
  ada opsi mubazir dari domain Aset/Akun yang hasilnya selalu kosong di
  sini) + `Investment.getOwnerSettlement()` (opsi status). **0 owner
  non-SELF sama sekali → balikin `''`** (filter bar disembunyikan total,
  bukan dirender kosong/nganggur).
- `_holdingMatchesFilter(h)` (BARU) — predicate murni per-holding, delegasi
  ke `Investment.getOwners()`/`getOwnerSettlement()` (pola query sama
  persis `Investment.holdingsByOwnerSettlement()` di `investasi.js`, cuma
  dipecah jadi predicate supaya bisa dipakai `Array.prototype.filter()`
  langsung di `_renderList()`). Dibungkus try/catch (1 holding korup tidak
  menjatuhkan render list, konsisten pola guard S608/S601 yang sudah ada
  di file ini).
- `onFilterOwnerChange(val)` / `onFilterSettlementChange(val)` (BARU) —
  onchange handler dropdown, murni tulis state + `_renderList()` ulang (0
  sentuh `D`, 0 sentuh summary/watchlist). Balik ke "Semua Pemilik"
  otomatis mengosongkan `filterSettlement` juga (status tanpa owner
  terpilih tidak bermakna apa-apa — settlement adalah properti PER
  owner-holding).
- `_renderList()` — disisipkan filter bar (dari `allHoldings`, SEBELUM
  difilter, supaya opsi dropdown owner tetap lengkap walau filter Status
  lagi aktif) + terapkan filter ke daftar holding yang dirender. Empty-state
  baru "Tidak ada holding yang cocok dengan filter ini" dibedakan dari
  empty-state lama "Belum ada holding investasi tercatat" (0 holding sama
  sekali) — filter bar tetap tampil di kasus pertama supaya user bisa ganti
  filter lagi.

**0 perubahan skema/field baru di `investasi.js`** — murni pemakaian API
yang sudah difondasikan S660/S661.

## Verifikasi

- `node -c modules/asset/investasi-list-view.js` — lolos.
- Test baru: `tests/s662-investmentlistui-owner-settlement-filter.test.js`
  (8 test: filter bar disembunyikan/muncul tergantung ada-tidaknya owner
  non-SELF, filter by owner saja, filter owner+status "milik", filter
  owner+status "titipan", empty-state filter yang cocok, reset status saat
  owner dikosongkan, dan guard holding korup tidak menjatuhkan render).
- Full suite (`node --test tests/*.test.js`): **4941/4941 pass** (4933
  sebelumnya + 8 baru sesi ini, 0 gagal, 0 regresi).
- Release Gate (`node scripts/verify-release-ready.js`): lint & minifikasi
  di-override (environment sandbox tanpa akses jaringan, eslint/esbuild
  tidak terpasang — override tercatat di `docs/RELEASE-GATE-LOG.md`);
  html-sync & version-sync lolos normal.

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
| `modules/asset/investasi-list-view.js` | S662 | filter daftar investasi owner+settlement |
| `tests/s662-investmentlistui-owner-settlement-filter.test.js` | S662 | test baru |
| `SESSION-NOTE-S662.md` | S662 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan)

- Field sejenis untuk `D.assets[]` (Buku Aset) kalau dibutuhkan pola yang
  sama di luar Investasi.
