# FIX v1229 → v1230 (Sesi 499): `DanaTitipanPortfolioAPI.build()` — Sesi B1 (Perluas ke Domain Aset)

## Konteks
Menindaklanjuti `AUDIT-SESI-B-PERLUASAN-ASET.md` (audit, 0 kode diubah
sesi itu). Kesimpulan audit: Sesi B **bisa dikerjakan**, dengan F1 wajib
jadi bagian implementasi B1 (bukan sesi terpisah). Kontrak yang dikunci
sebelum sesi ini mulai:

1. **F1 — wajib.** `_asetOwnersForTitipan(a)`: HANYA percaya `owners[]`
   eksplisit. Kalau `MultiOwnerEngine.getOwners(a)` balik
   `isSynthesized:true`, hasilnya `[]` — TIDAK PERNAH memakai hasil
   sintesis ownership sebagai identitas pemilik dana titipan.
2. **F2 — Opsi A.** Per alokasi Aset: `allocatedPrincipal = currentValue
   = porsi × a.nilai`, `gain = 0`. 0 perubahan struktur `holdings[]`/renderer.
3. **Union Investasi + Aset tetap 1 owner.** Owner yang sama di kedua
   domain → 1 kartu, `allocatedPrincipal` digabung. Kontrak output
   existing tidak berubah.
4. **F3 tidak disentuh** — didokumentasikan sebagai TODO/follow-up.

Scope keluar (sesuai keputusan sebelum sesi mulai): F3, F2 Opsi B, Sesi
C, Sesi D.

## Perubahan

### `modules/finance/dana-titipan-portfolio-presenter.js`
- **`_asetOwnersForTitipan(a)`** (baru) — replikasi PERSIS pola guard
  `Investment.getOwners(h)` (investasi.js) ke domain Aset: panggil
  `MultiOwnerEngine.getOwners(a)`, balikin `res.owners` HANYA kalau
  `res.ok && !res.isSynthesized`; selain itu `[]`. 0 rumus baru — guard
  ini SAMA PERSIS logic yang sudah ada & sudah dites di `investasi.js`,
  cuma dipindah lokasinya (sesuai §2.3 audit).
- **`_assetSplits(a)`** (baru) — pola sama `_holdingSplits(h)`, tapi
  utk Aset: `costSplit = valueSplit = splitByPorsi(a.nilai, owners)`,
  `gainSplit = splitByPorsi(0, owners)` (F2 Opsi A). Balikin `null`
  (skip, tidak throw) kalau `_asetOwnersForTitipan()` balik `[]` atau
  dependency belum dimuat.
- **`build()`** — ditambah loop ke-2 atas `D.assets` (setelah loop
  holding Investasi yang ADA, TIDAK diubah sama sekali), UNION ke
  `ownersMap` yang SAMA. Aset yang lolos push baris ke `holdings[]`
  dengan `type:'aset'`, `linkedInvestmentId:null`,
  `linkedAssetId:a.id` (field tambahan, murni informatif — tidak
  dibaca kode existing manapun). Owner SELF & porsi 0 tetap
  dikecualikan (pola sama loop Investasi). Kontrak `owners[].holdings[]`
  dan `totals.*` — **0 field baru** ditambah/dihapus/diubah.

## Yang TIDAK berubah
- `Investment.getOwners()`/`holdingCost()`/`holdingValue()`/
  `holdingGainLoss()` — 0 baris disentuh.
- `MultiOwnerEngine` — 0 baris disentuh (dipakai apa adanya, pola sama
  `_holdingSplits()`).
- `OwnershipEngine`/`aset.js` — 0 baris disentuh (F1 di-fix di sisi
  KONSUMEN/presenter, bukan di sumber datanya).
- `totals` — key set sama persis v1229 (dijaga test `Object.keys`
  deepEqual di `s484-dana-titipan-portfolio-presenter.test.js`, tetap
  lolos tanpa modifikasi).
- UI (`renderInto()`) — 0 disentuh. Baris Aset tampil lewat markup
  `holdings[]` yang sama (ikon "📈" generik apa adanya, F2 Opsi B —
  kolom P&L khusus per tipe baris — TETAP ditunda sesuai audit).
- Aset ber-`a.ownership` legacy TANPA `owners[]` eksplisit (belum
  pernah buka modal "Atur Porsi Kepemilikan") TETAP tidak muncul di
  tab Dana Titipan — ini BENAR secara desain (F1), bukan regresi.

## TODO (didokumentasikan, bukan dikerjakan — F3, sesuai audit §3.2)
Utk aset yang py **KEDUANYA** `a.ownership` non-SELF *dan* `a.owners[]`
eksplisit non-SELF sekaligus: kartu "Dana Kelolaan" (lama,
`DanaKelolaan.sumAssets()`, whole-entity) vs tab "Dana Titipan" (baru,
porsi `owners[]`) bisa menampilkan pecahan berbeda utk aset yang sama.
Bukan blocker — edge case sempit (butuh 2 aksi manual terpisah utk
terjadi). Kerjakan reconciliation-nya HANYA kalau ada laporan kasus
nyata, bukan preventif.

## Test Baru
`tests/s499-dana-titipan-build-aset-source.test.js` (4 test, 3 wajib
sesuai §5 audit + 1 guard tambahan):
1. **B1(a)** — aset `ownership` non-SELF TANPA `owners[]` eksplisit →
   TIDAK muncul di `build()` (regresi-guard F1).
2. **B1(b)** — aset dgn `owners[]` eksplisit (porsi majemuk) → muncul,
   porsi & nama owner benar, `gain=0` per baris (F2 Opsi A).
3. **B1(c)** — owner sama titip di Investasi + Aset → 1 kartu owner,
   `allocatedPrincipal`/`currentValue` digabung, `holdings[]` berisi 2
   baris (1 `type:'aset'`, 1 investasi).
4. Guard tambahan — `build()` aman kalau `D.assets` tidak ada/bukan
   array (0 crash, murni skip, konsisten pola guard `canReadHoldings`
   yang sudah ada).

## Verifikasi
- `node --test tests/*.test.js` — **3258/3258 lulus** (naik dari 3254,
  +4 test baru; 0 regresi — semua test S484/S485a-e/S486/S498 existing
  lolos TANPA modifikasi).
- `node scripts/build.js s499-dana-titipan-build-aset-source-sesi-b1` —
  build sukses, versi naik ke **v1230**, sintaks kedua bundle valid
  (`node --check`), `app_production.html` disinkronkan otomatis ke
  `index.html`.
- `esbuild` tidak tersedia di environment build sesi ini (tanpa akses
  jaringan) — kedua bundle **belum diminify** (sama seperti sesi
  sebelumnya, S498) — 100% valid & aman dipakai.

## Sisa Kerjaan (SENGAJA bukan sesi ini)
- **F2 Opsi B** (opsional, follow-up terpisah) — flag
  `hasGainTracking:false` per baris Aset + sembunyikan kolom P&L
  khusus baris itu di `renderInto()`, kalau `gain=0` yang selalu tampil
  utk Aset dirasa membingungkan di praktik.
- **F3 reconciliation** (ditunda sampai ada laporan nyata) — lihat
  §"TODO" di atas.
- **Sesi C** — mekanisme "pinjam untuk transaksi keuangan" (G4).
- **Sesi D** (opsional) — perluasan ke Kendaraan/Shop.

## Catatan
Zip release ini **FULL RELEASE** (semua file, v1230). Zip patch
terpisah (`kw_patch_v1229-to-v1230_s499-dana-titipan-build-aset-source-sesi-b1.zip`)
berisi HANYA file yang berubah/baru sejak v1229 — upload ULANG semua
file di situ ke lokasi yang sama, jangan cuma `index.html`/`sw.js`.
