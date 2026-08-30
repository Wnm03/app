# Sesi S670 — Filter Owner+Status di kartu ringkas `#danaTitipanPortfolioList`

## Konteks

Lanjutan eksplisit dari catatan "Belum dikerjakan" `SESSION-NOTE-S669.md`:
"S670: filter Owner+Status di dalam kartu ringkas
`#danaTitipanPortfolioList` (tab Ringkasan) — SENGAJA TIDAK disentuh sesi
S668 (kartu ringkas dibiarkan apa adanya sesuai permintaan eksplisit user),
kalau nanti dibutuhkan bisa reuse penuh
`_renderFilterBar()`/`_ownerMatchesFilter()` yang sudah ada di
`dana-titipan-portfolio-render.js`, cuma ubah gate `isTabView` jadi
mencakup kedua container." Fondasi filter (`_renderFilterBar()`,
`_ownerMatchesFilter()`, state `filterOwnerId`/`filterSettlement`) sudah
ada sejak S668 — sesi ini murni memperluas gate render supaya filter yang
sama juga aktif di kartu ringkas Dana Kelolaan (tab Ringkasan), bukan cuma
di sub-tab Laporan > Dana Titipan.

## Perubahan sesi ini

**1 file source disentuh** (sesuai aturan "1 sesi 1 file",
`docs/ZIP_RULES.md` § Mode PATCH ZIP):
`modules/finance/dana-titipan-portfolio-render.js` (file sama dengan
S668 — lanjutan langsung, bukan file baru). `dana-titipan-aggregation-api.js`
**TIDAK disentuh** — 0 rumus/agregasi baru.

- **`isTabView` → `isFilterableView`** (rename di `_renderNow()`): gate yang
  tadinya `el.id === 'danaTitipanTabList'` sekarang
  `el.id === 'danaTitipanTabList' || el.id === 'danaTitipanPortfolioList'`.
  Container id lain (kalau ada) tetap tidak menampilkan filter bar (gate
  tidak bocor ke sembarang container).
- **`onFilterOwnerChange(val)` / `onFilterSettlementChange(val)`**: tadinya
  cuma delegasi ke `renderInto('danaTitipanTabList')`, sekarang memanggil
  `renderInto()` untuk **kedua** id container (`danaTitipanTabList` lalu
  `danaTitipanPortfolioList`) — state filter (`filterOwnerId`/
  `filterSettlement`) dibagi (shared) di antara keduanya, pola sama semua
  caller lain di codebase yang sudah lebih dulu SELALU memanggil
  `render()` (→ `renderInto('danaTitipanPortfolioList')`) DAN
  `renderInto('danaTitipanTabList')` berpasangan (mis. `akun.js`,
  `investasi-view.js`, `dana-titipan-portfolio-render-b.js`) — container
  yang belum ada di DOM halaman yang sedang dibuka diam-diam di-skip oleh
  guard `if (!el) return` di `renderInto()`, jadi aman dipanggil dobel.
- **`_renderFilterBar()`/`_ownerMatchesFilter()`**: **TIDAK disentuh** —
  reuse penuh apa adanya dari S668, 0 perubahan logic filter/predicate.

**Test lama diupdate** (bukan file source kedua):
`tests/s668-dana-titipan-owner-status-filter.test.js` — 3 assertion
diupdate mengikuti perubahan target render
(`onFilterOwnerChange`/`onFilterSettlementChange` sekarang memanggil
`renderInto()` 2x, bukan 1x) + 1 test end-to-end diganti dari "filter bar
HANYA muncul di tab" menjadi "filter bar muncul di KEDUA container".

## Verifikasi

- `node -c modules/finance/dana-titipan-portfolio-render.js` — lolos.
- Test baru: `tests/s670-dana-titipan-ringkas-filter.test.js` (7 test):
  `renderInto('danaTitipanPortfolioList')` end-to-end (filter bar
  muncul & memfilter, pesan "🔍 Tidak ada pemilik..." saat filter tidak
  match, pesan "Belum ada porsi..." saat 0 data, filter kosong tetap
  menampilkan semua owner), state filter dibagi lintas container, gate
  tidak bocor ke container id lain, `onFilterOwnerChange()`/
  `onFilterSettlementChange()` memanggil `renderInto()` untuk kedua id
  container.
- Full suite (`node --test tests/*.test.js`): **5018/5018 pass** (5011
  sebelumnya + 7 baru, 0 regresi — termasuk 1 file test lama S668 yang
  assertion-nya diupdate).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1472**.
  Catatan: build sempat terhenti sebelum sampai ke kode S670 karena
  ditemukan drift pra-eksisting yang tidak terkait sesi ini — konstanta
  `MODULE_FEATURES_VERSION` di `chat-action-handlers.js` sudah menyimpang
  ('s627-...') dari versi sebelum sesi ini ('s624-...'), sehingga tidak
  ikut ter-replace otomatis oleh `bumpVersionEverywhere()`. Diperbaiki
  manual (1 baris, disamakan ke versi lama yang benar) supaya build bisa
  lanjut — bukan bagian dari fitur S670, murni unblock build.
- Release Gate: **lolos via override** — `eslint`/`esbuild` tidak tersedia
  di sandbox ini (tidak ada akses jaringan utk `npm install`), di-override
  manual lewat `CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  tercatat di `docs/RELEASE-GATE-LOG.md`. Gate html-sync & version-sync
  lolos bersih (tanpa override).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `modules/asset/investasi-list-view.js` | S662, S663, S664, S669 | filter owner+status, baris info ringkasan, badge jumlah, multi-select |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation (S665) + wiring UI toggle (S666) |
| `modules/asset/aset.js` | S667 | filter Owner+Status di daftar Buku Aset |
| `modules/finance/dana-titipan-portfolio-render.js` | S668, S670 | filter Owner+Status di tab Dana Titipan (S668) + di kartu ringkas (S670) |
| `tests/s668-dana-titipan-owner-status-filter.test.js` | S668 (assertion diupdate S670) | test |
| `tests/s670-dana-titipan-ringkas-filter.test.js` | S670 | test baru |
| `SESSION-NOTE-S670.md` | S670 | catatan sesi ini |

(Sesi patch berikutnya: tambahkan barisnya di sini, JANGAN hapus baris di
atas. Daftar lengkap sesi S660-S669 ada di `SESSION-NOTE-S669.md`.)

## Belum dikerjakan (sengaja ditunda, sesi lanjutan — sesuai "1 sesi 1 target")

- Multi-select owner untuk daftar **Buku Aset** (`Aset.filterOwnerId`,
  S667) & tab **Dana Titipan** (`DanaTitipanPortfolioPresenter.
  filterOwnerId`, S668/S670) masih single-select — pola S669
  (`InvestmentListUI`, checkbox list) bisa dipakai kalau nanti dibutuhkan
  konsistensi lintas ketiga tempat.
- Tombol cepat "Pilih Semua"/"Bersihkan" di atas checkbox list owner
  Investasi (S669) kalau owner-nya banyak (>5).
- Persist pilihan filter owner (`filterOwnerIds` dkk) ke `localStorage`,
  pola sama `cardCollapsePrefs` — saat ini semua state filter murni UI,
  reset tiap reload halaman.
