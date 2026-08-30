# Sesi S671 — Tombol "Pilih Semua"/"Bersihkan" di checkbox owner InvestmentListUI

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan" `SESSION-NOTE-S670.md`
(diwariskan apa adanya dari `SESSION-NOTE-S669.md`): "Tombol cepat 'Pilih
Semua'/'Bersihkan' di atas checkbox list owner Investasi (S669) kalau
owner-nya banyak (>5)." Dari 3 item backlog yang tersisa (item ini +
multi-select owner Buku Aset/Dana Titipan + persist filter ke
`localStorage`), item ini dipilih duluan sesuai permintaan eksplisit user
"1 sesi yang ringan dulu" — murni menambah 2 tombol di atas checkbox list
yang SUDAH ADA sejak S669, 0 perubahan pada predicate filter/checkbox
yang sudah ada.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-list-view.js`.
`modules/asset/aset.js` (filter Buku Aset, S667) dan
`modules/finance/dana-titipan-portfolio-render.js` (filter Dana Titipan,
S668/S670) **TIDAK disentuh** — item backlog "multi-select owner di kedua
tempat itu" tetap ditunda, bukan bagian sesi ini.

- **`_renderFilterBar(allHoldings)`**: tambah blok `quickActionsHtml` —
  dirender HANYA kalau jumlah owner non-SELF (`ownerIdsAll.length`) lebih
  dari 5 (ambang sesuai kata-kata persis di catatan backlog), berisi 2
  tombol (`btn btn-ghost btn-sm`, pola sama tombol lain di file ini) yang
  memanggil `onFilterOwnerSelectAll()`/`onFilterOwnerClearAll()`. Checkbox
  list & dropdown Status di bawahnya **TIDAK diubah sama sekali**.
- **`onFilterOwnerSelectAll()`** (baru): kumpulkan SEMUA `ownerId`
  non-SELF dari `Investment.getHoldings()` saat ini (bukan cuma yang lagi
  tercentang), set `filterOwnerIds` ke array itu, lalu `_renderSummary()`
  + `_renderList()` — pola sama persis `onFilterOwnerToggle()`. Dibungkus
  guard `typeof Investment === 'undefined'` (skip diam-diam) + try/catch
  per-holding di `getOwners()` (holding korup di-skip, tidak menjatuhkan
  hasil keseluruhan) — pola guard yang sama dipakai `_renderFilterBar()`/
  `_holdingMatchesFilter()`.
- **`onFilterOwnerClearAll()`** (baru): reset `filterOwnerIds` ke `[]` &
  `filterSettlement` ke `''`, lalu render ulang — identik efeknya dengan
  melepas centang owner terakhir secara manual di `onFilterOwnerToggle()`.
- **`_holdingMatchesFilter()`/`onFilterOwnerToggle()`/
  `onFilterSettlementChange()`**: **TIDAK disentuh** — reuse penuh, 0
  perubahan logic.

**Test baru** (bukan file source kedua):
`tests/s671-investmentlistui-filter-select-all-clear.test.js` (7 test).

## Verifikasi

- `node -c modules/asset/investasi-list-view.js` — lolos.
- Test baru (7 test): tombol TIDAK muncul di ≤5 owner, tombol muncul di
  >5 owner, `onFilterOwnerSelectAll()` mengisi semua ownerId & menampilkan
  semua holding terkait, checkbox semua ter-`checked` setelah Select All,
  `onFilterOwnerClearAll()` mengosongkan `filterOwnerIds`+`filterSettlement`
  sekaligus (termasuk setelah Select All + set status), guard
  `typeof Investment === 'undefined'` tidak melempar, holding dengan
  `owners` korup (`getOwners()` throw) tidak menjatuhkan hasil Select All.
- Full suite (`node --test tests/*.test.js`): **5025/5025 pass** (5018
  sebelumnya + 7 baru, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1473**.
  Catatan: drift pra-eksisting `MODULE_FEATURES_VERSION` di
  `chat-action-handlers.js` (sama pola yang dicatat di
  `SESSION-NOTE-S670.md`) muncul lagi sebelum build ('s626-...' vs
  's627-...' yang seharusnya) — kali ini `bumpVersionEverywhere()`
  otomatis menyamakan ke 5 file source tanpa perlu fix manual (lihat log
  build: "Versi disamakan di 5 file source..."), jadi TIDAK ada
  intervensi manual di luar S671 pada sesi ini.
- Release Gate: **lolos via override** — `eslint`/`esbuild` tetap tidak
  tersedia di sandbox ini (tidak ada akses jaringan utk `npm install`),
  di-override manual lewat `CONFIRM_LINT_UNAVAILABLE_REASON`/
  `CONFIRM_UNMINIFIED_REASON`, tercatat di `docs/RELEASE-GATE-LOG.md`.
  Gate html-sync & version-sync lolos bersih (tanpa override).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `modules/asset/investasi-list-view.js` | S662, S663, S664, S669, S671 | filter owner+status, baris info ringkasan, badge jumlah, multi-select, tombol Pilih Semua/Bersihkan |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation (S665) + wiring UI toggle (S666) |
| `modules/asset/aset.js` | S667 | filter Owner+Status di daftar Buku Aset |
| `modules/finance/dana-titipan-portfolio-render.js` | S668, S670 | filter Owner+Status di tab Dana Titipan (S668) + di kartu ringkas (S670) |
| `tests/s668-dana-titipan-owner-status-filter.test.js` | S668 (assertion diupdate S670) | test |
| `tests/s670-dana-titipan-ringkas-filter.test.js` | S670 | test |
| `tests/s671-investmentlistui-filter-select-all-clear.test.js` | S671 | test baru |
| `SESSION-NOTE-S670.md` | S670 | catatan sesi |
| `SESSION-NOTE-S671.md` | S671 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas. Daftar lengkap sesi S660-S669 ada di `SESSION-NOTE-S669.md`.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- Multi-select owner untuk daftar **Buku Aset** (`Aset.filterOwnerId`,
  S667) & tab **Dana Titipan** (`DanaTitipanPortfolioPresenter.
  filterOwnerId`, S668/S670) masih single-select — pola S669/S671
  (`InvestmentListUI`, checkbox list + tombol Pilih Semua/Bersihkan) bisa
  dipakai kalau nanti dibutuhkan konsistensi lintas ketiga tempat.
- Persist pilihan filter owner (`filterOwnerIds` dkk) ke `localStorage`,
  pola sama `cardCollapsePrefs` — saat ini semua state filter murni UI,
  reset tiap reload halaman.
