# FIX v1143 -> v1144 (s430) — Nominal (Rp) otomatis di Porsi Kepemilikan Aset

## Konteks

Permintaan user: audit form "⚖️ Atur Porsi Kepemilikan" (Buku Aset,
`assetOwnersModal`) — tambah field nominal yang otomatis terhitung dari
field persen, sinkron ke semua data.

## Audit sebelum implementasi

Form porsi kepemilikan (`modules/asset/aset.js`, dibangun S392a-S393)
sebelum sesi ini cuma punya 1 field angka per baris pemilik: **Porsi (%)**.
Field Nominal (Rp) belum ada sama sekali — user harus hitung manual berapa
Rupiah yang mewakili porsi % tertentu dari nilai aset. Pola dua-arah
%<->Rp yang mirip sudah ada di 2 tempat lain di codebase (referensi dipakai
sesi ini, 0 rumus baru): `txCicilanSharedPct`/`txCicilanSharedNominal`
(cicilan patungan) & `billSharedPct` (tagihan patungan) — keduanya cuma
1 arah (Rp dihitung dari %), sesi ini melangkah 1 langkah lebih jauh:
dua arah penuh (edit % ATAU Rp, yang lain ikut update).

## Perubahan

### `modules/asset/aset.js`

- **`Aset._ownersAssetNilai()`** (baru) — nilai dasar konversi, dibaca
  dari `Aset._ownersModalAsset.nilai` (field `assetNilai` form Aset yang
  SUDAH ADA, 0 field baru). Balik 0 kalau aset belum punya nilai positif.
- **`Aset._renderOwnersList()`** — tiap baris pemilik sekarang render 2
  input berdampingan: **Porsi (%)** (id `ownerPorsi{i}`, sudah ada) &
  **Nominal (Rp)** (id `ownerNominal{i}`, BARU) — nominal dihitung
  `nilaiAset * porsi/100` saat render. Field Nominal **dinonaktifkan**
  (disabled) kalau aset belum punya nilai (Estimasi Nilai Saat Ini
  kosong/0) — dengan hint teks kecil menjelaskan kenapa, karena konversi
  Rp<->% butuh nilai dasar yang tidak bisa ditebak aman.
- **`Aset.onOwnerPorsiInput(i,val)`** — sekarang, selain menulis `porsi`
  ke draft (perilaku lama, 0 regresi), juga langsung menulis
  `ownerNominal{i}.value` (bukan render ulang list — pola sama persis
  alasan `_renderOwnersList` sendiri tidak dipanggil tiap ketik: supaya
  fokus/kursor input tidak hilang).
- **`Aset.onOwnerNominalInput(i,val)`** (baru) — arah sebaliknya: user isi
  Rp, porsi% dihitung ulang (`nominal/nilaiAset*100`, dibulatkan 2
  desimal sama seperti `MultiOwnerEngine.remainingPorsi()`) & ditulis ke
  `Aset._ownersDraft[i].porsi` (field YANG SAMA dibaca `saveOwners()`/
  `updateOwnersTotal()` — Nominal murni tampilan turunan, TIDAK pernah
  jadi field tersendiri di `D.assets`), lalu sync balik ke
  `ownerPorsi{i}.value`. No-op kalau nilai aset 0 (guard jaga-jaga).

**"Sync ke semua data"**: karena Nominal murni turunan dari `porsi`
(field yang sudah dibaca semua alur existing — `saveOwners()`,
`AssetOwnershipSplitPresenter`, `MultiOwnerEngine.selfOwnedValue()`, sync
saldo akun tertaut, Zakat Maal, dst — semuanya S390-422e), 0 perubahan
tambahan diperlukan di modul lain: begitu porsi tersimpan (lewat Rp atau
%, sama-sama menulis `porsi`), seluruh alur sync yang SUDAH ADA otomatis
ikut benar.

## Test

`tests/asset-owners-nominal-sync-s429.test.js` — 6 test baru:
1. Nominal terisi otomatis saat modal dibuka (100% dari nilai aset).
2. Ubah Porsi% -> Nominal ikut update (DOM, tanpa render ulang).
3. Ubah Nominal -> Porsi% ikut dihitung ulang (DOM).
4. Porsi hasil sync via Nominal beneran tersimpan ke `D.assets` lewat
   `saveOwners()` (bukan cuma berubah di tampilan).
5. Field Nominal dinonaktifkan kalau aset belum punya nilai.
6. `onOwnerNominalInput()` no-op kalau nilai aset 0.

Test lama (`asset-owners-flow-e2e-392a-to-392e.test.js`,
`asset-owners-ai-rules-regression-s392e.test.js`,
`asset-ownership-split-presenter.test.js`, `multi-owner-engine.test.js`)
tetap 0 regresi — dijalankan terpisah dulu sebelum full suite.

`node --test tests/*.test.js` -> **2874/2874 pass, 0 fail** (naik dari
2868, +6 test baru).

## Release Gate

`node scripts/verify-release-ready.js`:
- **Lint/Minify**: eslint/esbuild tidak tersedia (sandbox tanpa akses
  jaringan, konsisten s424/s425/s428/s429) -> di-override manual. Detail:
  `docs/RELEASE-GATE-LOG.md`.
- **html-sync**: lolos tanpa override.

## Build

`node scripts/build.js s430-asset-owners-nominal-field` -> sukses,
`v1143` -> `v1144`.

## File yang berubah

- `modules/asset/aset.js` — `_ownersAssetNilai()` (baru),
  `_renderOwnersList()` (field Nominal ditambah), `onOwnerPorsiInput()`
  (sync Nominal), `onOwnerNominalInput()` (baru)
- `tests/asset-owners-nominal-sync-s429.test.js` — BARU, 6 test
- `docs/RELEASE-GATE-LOG.md` — 1 entri baru (append, otomatis)
- Konstanta versi (8 file source yang sama dgn sesi-sesi sebelumnya) naik
  ke `s430-asset-owners-nominal-field`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis,
  `?v=1143` -> `?v=1144`
- `backups/` — 2 file backup bundle lama (otomatis oleh `build.js`)

## Belum dikerjakan / batasan yang diketahui

- Tidak ada tombol kalkulator (🧮) di field Nominal (beda dari
  `txCicilanSharedNominal`) — baris pemilik dinamis (index berubah
  tiap tambah/hapus), butuh audit terpisah kalau mau dipasangi kalkulator
  per baris. Input angka polos sudah cukup utk kebutuhan sesi ini.
- `_ownersAssetNilai()` HANYA baca `nilai` (Estimasi Nilai Saat Ini) —
  TIDAK baca `assetModalInvestasi`/field investasi lain, konsisten
  dengan field yang sudah dipakai `selfOwnedNilai()`/sync saldo akun
  tertaut di seluruh `aset.js`.
