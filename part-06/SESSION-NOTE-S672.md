# Sesi S672 — Persist filter Pemilik/Status InvestmentListUI ke localStorage

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan" `SESSION-NOTE-S671.md`
(diwariskan dari `SESSION-NOTE-S670.md`): "Persist pilihan filter owner
(`filterOwnerIds` dkk) ke `localStorage`, pola sama `cardCollapsePrefs` —
saat ini semua state filter murni UI, reset tiap reload halaman." Dari 2
item backlog yang tersisa (item ini + multi-select owner Buku
Aset/Dana Titipan), item ini dipilih duluan sesuai permintaan eksplisit
user "1 sesi ringkas" — scope DIPERSEMPIT sengaja ke **InvestmentListUI
saja** (filter yang sudah multi-select sejak S669/S671), BUKAN ketiga
lokasi filter sekaligus. Alasan: `Aset.filterOwnerId` (Buku Aset, S667) &
`DanaTitipanPortfolioPresenter.filterOwnerId` (Dana Titipan, S668/S670)
masih single-select — persist state yang bakal diganti bentuknya
(single -> multi, item backlog satunya) berarti kerja 2x kalau
dikerjakan sekarang; InvestmentListUI sudah stabil di bentuk final
(checkbox multi-select) jadi persist di sini tidak akan perlu diubah
lagi nanti.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP): `modules/asset/investasi-list-view.js`.

- **State baru**: `_filterPrefsLoaded` (flag runtime, bukan dipersist) &
  `_filterStorageKey` (`'investmentListFilterPrefs'`, namespace terpisah
  dari `cardCollapsePrefs` — concern beda: data filter vs UI collapse).
- **`_loadFilterPrefsOnce()`** (baru): baca `localStorage`, validasi
  bentuk data (`Array.isArray` utk `filterOwnerIds`, whitelist
  `'milik'`/`'titipan'` utk `filterSettlement` — data lama/hasil edit
  manual DevTools JANGAN dipercaya mentah-mentah), terapkan ke
  `InvestmentListUI.filterOwnerIds`/`filterSettlement`. Guard
  `_filterPrefsLoaded` supaya baca localStorage **HANYA sekali per
  lifetime halaman** — dipanggil dari **`render()`** (SSOT satu-satunya
  titik tab Investasi dibuka), BUKAN dari `_renderList()`/
  `_renderSummary()` yang dipanggil berkali-kali dari dalam handler
  filter sendiri (baca ulang di situ akan menimpa balik perubahan live
  user dgn nilai lama di storage).
- **`_saveFilterPrefs()`** (baru): tulis `{filterOwnerIds,
  filterSettlement}` ke `localStorage` sbg JSON. Dipanggil dari KEEMPAT
  handler mutator yang sudah ada: `onFilterOwnerToggle()`,
  `onFilterSettlementChange()`, `onFilterOwnerSelectAll()` (S671),
  `onFilterOwnerClearAll()` (S671) — masing-masing +1 baris pemanggilan,
  0 perubahan logic lain di dalamnya.
- Kedua fungsi baru dibungkus try/catch permisif + guard
  `typeof localStorage === 'undefined'`, pola PERSIS
  `toggleCardCollapse()`/`applyCardCollapsePrefs()` (`modal-navigasi.js`)
  — localStorage gagal/diblokir/korup/tidak tersedia TIDAK PERNAH
  melempar, filter tetap berfungsi murni di state UI in-memory (cuma
  tidak ke-persist lintas reload).
- **`_renderFilterBar()`/`_holdingMatchesFilter()`/checkbox list/tombol
  Pilih Semua-Bersihkan (S671)**: **TIDAK disentuh** — reuse penuh, 0
  perubahan logic filter/predicate/render.

**Test baru** (bukan file source kedua):
`tests/s672-investmentlistui-filter-persist-localstorage.test.js` (8 test).

## Verifikasi

- `node -c modules/asset/investasi-list-view.js` — lolos.
- Test baru (8 test, pakai mock `localStorage` in-memory sungguhan —
  bukan permissive stub bawaan `loadSource`, supaya alur baca-tulis JSON
  benar-benar teruji): tiap handler mutator (`onFilterOwnerToggle`/
  `onFilterSettlementChange`/`onFilterOwnerSelectAll`/
  `onFilterOwnerClearAll`) menulis ke `localStorage`; `render()` di
  context/"halaman" BARU membaca filter tersimpan & menerapkannya;
  `render()` dipanggil 2x TIDAK menimpa balik perubahan live user
  (guard baca-sekali); data localStorage kosong/korup/bentuk tidak valid
  semuanya balik ke default kosong tanpa melempar; `localStorage` tidak
  tersedia sama sekali (`typeof undefined`) tidak melempar di
  `render()`/handler manapun.
- Test lama S669/S671 (`onFilterOwnerToggle`/`_renderList` dipanggil
  langsung tanpa lewat `render()`) tetap 18/18 pass tanpa modifikasi —
  konfirmasi `_loadFilterPrefsOnce()` yang HANYA dipanggil dari `render()`
  tidak mengganggu test yang memang sengaja tidak lewat SSOT itu (pola
  test murni-logika `loadSource`, lihat catatan di `tests/helpers/
  loadSource.js`).
- Full suite (`node --test tests/*.test.js`): **5033/5033 pass** (5025
  sebelumnya + 8 baru, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1474**.
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
| `modules/asset/investasi-list-view.js` | S662, S663, S664, S669, S671, S672 | filter owner+status, baris info ringkasan, badge jumlah, multi-select, tombol Pilih Semua/Bersihkan, persist localStorage |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation (S665) + wiring UI toggle (S666) |
| `modules/asset/aset.js` | S667 | filter Owner+Status di daftar Buku Aset |
| `modules/finance/dana-titipan-portfolio-render.js` | S668, S670 | filter Owner+Status di tab Dana Titipan (S668) + di kartu ringkas (S670) |
| `tests/s668-dana-titipan-owner-status-filter.test.js` | S668 (assertion diupdate S670) | test |
| `tests/s670-dana-titipan-ringkas-filter.test.js` | S670 | test |
| `tests/s671-investmentlistui-filter-select-all-clear.test.js` | S671 | test |
| `tests/s672-investmentlistui-filter-persist-localstorage.test.js` | S672 | test baru |
| `SESSION-NOTE-S670.md` | S670 | catatan sesi |
| `SESSION-NOTE-S671.md` | S671 | catatan sesi |
| `SESSION-NOTE-S672.md` | S672 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas. Daftar lengkap sesi S660-S669 ada di `SESSION-NOTE-S669.md`.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- Multi-select owner untuk daftar **Buku Aset** (`Aset.filterOwnerId`,
  S667) & tab **Dana Titipan** (`DanaTitipanPortfolioPresenter.
  filterOwnerId`, S668/S670) masih single-select — pola S669/S671
  (`InvestmentListUI`, checkbox list + tombol Pilih Semua/Bersihkan) bisa
  dipakai kalau nanti dibutuhkan konsistensi lintas ketiga tempat.
- Persist filter ke `localStorage` untuk **Buku Aset** & **Dana Titipan**
  — SENGAJA ditunda sampai keduanya (kalau jadi) sudah dikonversi ke
  multi-select seperti Investasi (lihat alasan di § Konteks di atas),
  supaya tidak kerja 2x. Pola `_loadFilterPrefsOnce()`/
  `_saveFilterPrefs()` di sesi ini (S672) bisa langsung di-reuse untuk
  keduanya begitu waktunya tiba — cukup ganti nama key storage & field
  yang dipersist per lokasi.
