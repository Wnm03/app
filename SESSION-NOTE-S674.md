# Sesi S674 — Dana Titipan multi-select owner filter (FINAL, 2 sesi)

## Konteks
Lanjutan eksplisit dari backlog SESSION-NOTE-S673.md ("Sesi 2 (S674, Dana
Titipan)"): terapkan pola SAMA PERSIS S673 (`Aset.filterOwnerIds`,
`modules/asset/aset.js`) ke `DanaTitipanPortfolioPresenter`
(`modules/finance/dana-titipan-portfolio-render.js`) — dropdown single-select
owner (S668/S670) diganti checkbox-list multi-select + tombol Pilih
Semua/Bersihkan (kalau owner >5), semantik OR.

Atas instruksi eksplisit, dikerjakan dalam **2 sesi terpisah**:
- **Sesi 1**: HANYA source file (`dana-titipan-portfolio-render.js`).
  Test lama sengaja belum disentuh (13/23 gagal, sesuai ekspektasi karena
  bentuk API berubah). ZIP interim diserahkan (bukan release).
- **Sesi 2 (sesi ini)**: tulis ulang `tests/s668-dana-titipan-owner-status-
  filter.test.js` + `tests/s670-dana-titipan-ringkas-filter.test.js`, full
  suite, build, release gate, ZIP final.

## Baseline
Overlay `kw_release_sesi673_aset-multiselect-owner-filter_v1475.zip` di atas
`app-main__41_.zip` → `node --test tests/*.test.js` dari nol → **5044/5044
pass**. Baseline sah dipakai kedua sesi.

## Perubahan Sesi 1 (source, sudah diserahkan sebelumnya)
`modules/finance/dana-titipan-portfolio-render.js`:
- State: `filterOwnerId` (string) → `filterOwnerIds` (array), default `[]`.
- `_ownerMatchesFilter(o)`: semantik AND (1 owner) → OR (owner manapun dari
  `filterOwnerIds`).
- `_renderFilterBar(owners)`: dropdown owner `<select>` diganti checkbox-list
  (pola PERSIS `Aset._renderFilterBar()` S673) — badge "(N holding)"
  dipertahankan, tombol "Pilih Semua"/"Bersihkan" HANYA muncul kalau
  `owners.length > 5`. Dropdown Status dipertahankan apa adanya (disabled
  kalau `filterOwnerIds` kosong).
- Handler: `onFilterOwnerChange(val)` diganti `onFilterOwnerToggle(id)` +
  `onFilterOwnerSelectAll()`/`onFilterOwnerClearAll()` (Select All ambil
  owner dari `DanaTitipanPortfolioAPI.build()` langsung). `onFilterSettlement
  Change()` TIDAK berubah logic-nya.
- Komentar lama yang merujuk `Aset.onFilterOwnerChange()` (API lama
  pra-S673) diupdate jadi `Aset.onFilterOwnerToggle()`.
- Grep ulang seluruh codebase non-test: 0 referensi
  `DanaTitipanPortfolioPresenter.filterOwnerId`/`onFilterOwnerChange` di luar
  file ini.

## Perubahan Sesi 2 (test, sesi ini)
`tests/s668-dana-titipan-owner-status-filter.test.js` — ditulis ulang PENUH
(pola sama `tests/s667-aset-owner-status-filter.test.js`, S673): state awal
array kosong, `_ownerMatchesFilter` semantik OR, `_renderFilterBar`
checkbox+badge+checked+dropdown Status+tombol quick-action (gate >5 owner via
`seedBanyakOwner(n)`), `onFilterOwnerToggle`+guard id kosong,
`onFilterSettlementChange`, `onFilterOwnerSelectAll`/`onFilterOwnerClearAll`,
`renderInto()` end-to-end (multi-select) — 27 test.

`tests/s670-dana-titipan-ringkas-filter.test.js` — ditulis ulang mengikuti
bentuk baru (gate `isFilterableView` S670 TIDAK berubah, hanya bentuk filter
yang berubah): `renderInto('danaTitipanPortfolioList')` end-to-end
multi-select, state filter dibagi (shared) lintas 2 container, gate tidak
bocor ke container lain, `onFilterOwnerToggle`/`onFilterSettlementChange`/
`onFilterOwnerSelectAll`/`onFilterOwnerClearAll` memanggil `renderInto()`
KEDUA container — 10 test.

Semua array dari konteks `vm` (mis. `ctx.DanaTitipanPortfolioPresenter.
filterOwnerIds`) dicek pakai `.length`/`.indexOf`/`[i]`, BUKAN
`assert.deepEqual` (konvensi codebase — cross-realm deepEqual pada array vm
sandbox rawan gagal). Array `calls`/`calledWith` yang dibuat & di-push murni
di host (test file) tetap dicek via `.length`/index per-elemen untuk
konsistensi penuh dgn pola di atas.

## Verifikasi
- `node -c modules/finance/dana-titipan-portfolio-render.js` — lolos.
- `node --test tests/s668-*.test.js tests/s670-*.test.js` — **33/33 pass**
  langsung tanpa iterasi debug (10 test lama msh relevan dari s668 + 23 baru
  gabungan s668+s670).
- Full suite (`node --test tests/*.test.js`): **5054/5054 pass** (5044
  baseline + 10 net new, 0 gagal, 0 regresi).
- Build (`node scripts/build.js`) sukses, versi naik ke **v1476**.
- Release Gate (`node scripts/verify-release-ready.js`): **lolos via
  override** — `eslint`/`esbuild` tetap tidak tersedia di sandbox ini (tidak
  ada akses jaringan utk `npm install`), di-override manual lewat
  `CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`, tercatat di
  `docs/RELEASE-GATE-LOG.md`. Gate html-sync & version-sync lolos bersih
  (tanpa override).

## Daftar akumulasi file patch (sesi patch berjalan, mulai S660)

| File | Sesi | Status |
|---|---|---|
| `modules/asset/investasi.js` | S660 | owner settlement foundation (Investasi) |
| `modules/asset/investasi-view.js` | S661 | wiring toggle UI titipan/milik |
| `modules/asset/investasi-list-view.js` | S662-S664, S669, S671, S672 | filter owner+status, multi-select, tombol Pilih Semua/Bersihkan, persist localStorage |
| `modules/asset/aset-owners.js` | S665, S666 | owner settlement foundation + wiring UI toggle |
| `modules/asset/aset.js` | S667, S673 | filter Owner+Status Buku Aset + multi-select |
| `modules/finance/dana-titipan-portfolio-render.js` | S668, S670, **S674** | filter Owner+Status Dana Titipan (S668), gate 2 container (S670), **multi-select checkbox + Pilih Semua/Bersihkan (S674)** |
| `tests/s667-aset-owner-status-filter.test.js` | S667, ditulis ulang S673 | test |
| `tests/s668-dana-titipan-owner-status-filter.test.js` | S668 (S670), **ditulis ulang penuh S674** | test |
| `tests/s670-dana-titipan-ringkas-filter.test.js` | S670, **ditulis ulang S674** | test |
| `tests/s671-investmentlistui-filter-select-all-clear.test.js` | S671 | test |
| `tests/s672-investmentlistui-filter-persist-localstorage.test.js` | S672 | test |

## Backlog
Item "multi-select owner Buku Aset/Dana Titipan" dari catatan S667/S673
**TUNTAS** — Buku Aset (S673) & Dana Titipan (S674) sudah selesai keduanya.
0 item backlog baru dari sesi ini.
