# FIX v1144 -> v1145 (s431) — Auto-bagi sisa nilai aset ke pemilik lain saat isi Nominal (Rp)

## Konteks

Permintaan user: di form "⚖️ Atur Porsi Kepemilikan" (Buku Aset,
`assetOwnersModal`), ketika user mengisi **Nominal (Rp)** untuk satu
pemilik, sisa nilai aset (total aset dikurangi nominal pemilik itu,
dijepit sampai 0 — tidak boleh negatif) harus otomatis dibagi RATA ke
SEMUA pemilik lain, dan hasilnya sinkron ke semua data (draft, DOM,
`D.assets` lewat `saveOwners()`).

## Audit sebelum implementasi

Sejak S429, Nominal (Rp) sudah 2 arah dgn Porsi (%) TAPI hanya untuk
baris yang sedang diedit — baris pemilik lain tidak ikut berubah (user
harus hitung & isi manual). 0 fitur auto-bagi sisa sebelum sesi ini.

## Perubahan

### `modules/asset/aset.js`

- **`Aset._autoDistributeRemaining(editedIndex)`** (baru) — hitung
  `sisaPorsi = MAX(0, 100 - porsiBarisEdited)`, bagi rata ke semua baris
  lain (`draft.length - 1` baris), tulis ke `Aset._ownersDraft[*].porsi`
  + update DOM `#ownerPorsi{i}`/`#ownerNominal{i}` baris-baris itu
  langsung (bukan render ulang list, supaya fokus input tidak hilang —
  pola sama persis `onOwnerPorsiInput`/`onOwnerNominalInput`). Baris
  terakhir sengaja menyerap sisa pembulatan supaya total tetap PERSIS
  100% (pola sama seperti `_synthesizeFromTitipan()` di
  `multi-owner-engine.js`).
- **`Aset.onOwnerNominalInput(i,val)`** — sekarang memanggil
  `_autoDistributeRemaining(i)` setelah menulis porsi baris yang diedit.
- **`Aset.onOwnerPorsiInput(i,val)`** — SENGAJA TIDAK diubah (0 regresi)
  — auto-bagi hanya dipicu dari isi Nominal (Rp), sesuai permintaan
  eksplisit user ("ketika mengisi nominal"), edit Porsi (%) manual tetap
  perilaku lama (cuma sync Nominal baris itu sendiri).

**"Sync ke semua data"**: `_autoDistributeRemaining()` menulis ke field
`porsi` yang sama persis dibaca `saveOwners()`/`updateOwnersTotal()`/
`MultiOwnerEngine.*` (0 field baru) — begitu tersimpan lewat
`saveOwners()`, seluruh alur sync existing (saldo akun tertaut, Zakat
Maal, Pajak Aset, dst — S390-422e) otomatis ikut benar, sama seperti
S430.

## Test

`tests/asset-owners-nominal-autodistribute-s431.test.js` — 6 test baru:
1. Isi nominal 1 baris (2 pemilik) -> sisa otomatis ke baris lain.
2. 3 pemilik -> sisa dibagi rata ke 2 baris lain, total tetap 100%.
3. Nominal melebihi nilai aset -> sisa dijepit ke 0 (bukan minus).
4. Hasil auto-bagi tetap tersimpan benar via `saveOwners()`.
5. Edit Porsi (%) manual TIDAK memicu auto-bagi (0 regresi).
6. `_autoDistributeRemaining()` no-op kalau cuma 1 pemilik.

Test lama (`asset-owners-nominal-sync-s429.test.js`,
`asset-owners-flow-e2e-392a-to-392e.test.js`,
`asset-ownership-split-presenter.test.js`, `multi-owner-engine.test.js`)
tetap 0 regresi.

`node --test tests/*.test.js` -> **2880/2880 pass, 0 fail** (naik dari
2874, +6 test baru).

## Release Gate

`node scripts/verify-release-ready.js`:
- **Lint/Minify**: eslint/esbuild tidak tersedia (sandbox tanpa akses
  jaringan, konsisten s424/s425/s428/s429/s430) -> di-override manual.
  Detail: `docs/RELEASE-GATE-LOG.md`.
- **html-sync**: lolos tanpa override.

## Build

`node scripts/build.js s431-asset-owners-auto-distribute-remaining` ->
sukses, `v1144` -> `v1145`.

## File yang berubah

- `modules/asset/aset.js` — `_autoDistributeRemaining()` (baru),
  `onOwnerNominalInput()` (memanggil auto-bagi)
- `tests/asset-owners-nominal-autodistribute-s431.test.js` — BARU, 6 test
- `docs/RELEASE-GATE-LOG.md` — 1 entri baru (append, otomatis)
- Konstanta versi (8 file source yang sama dgn sesi-sesi sebelumnya) naik
  ke `s431-asset-owners-auto-distribute-remaining`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis,
  `?v=1144` -> `?v=1145`
- `backups/` — 2 file backup bundle lama (otomatis oleh `build.js`)

## Belum dikerjakan / batasan yang diketahui

- Auto-bagi hanya dipicu dari field Nominal (Rp), TIDAK dari Porsi (%) —
  sesuai permintaan eksplisit user. Kalau ke depannya diinginkan juga
  utk Porsi (%), butuh sesi terpisah (disiplin "1 task = 1 sesi").
- Baris pemilik baru yang ownerId-nya masih kosong (dari `addOwnerRow()`
  yang belum diberi nama/nominal) tetap ikut menerima bagian rata —
  konsisten dgn perilaku `saveOwners()` yang sudah ada (baris kosong
  diberi id via `uid()` saat disimpan).
