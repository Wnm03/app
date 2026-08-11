# FIX v1231 → v1232 (Sesi 501): Dana Titipan — F3 Reconciliation (Deteksi Aset Kepemilikan Ganda)

## Konteks
Follow-up dari `AUDIT-SESI-B-PERLUASAN-ASET.md` §3.2 (F3), yang sebelumnya
ditandai "bukan blocker, tunggu laporan kasus nyata". User minta
dikerjakan sekarang.

**Kasus F3:** aset yang punya `a.ownership` non-SELF (whole-entity,
dropdown Kepemilikan) **DAN** `a.owners[]` eksplisit non-SELF (porsi
majemuk, modal "Atur Porsi Kepemilikan") **sekaligus** — kartu "💰 Dana
Kelolaan" (`DanaKelolaan.sumAssets()`, hitung 100% `a.nilai` sbg 1 tipe
generik) vs tab "💰 Dana Titipan" (`DanaTitipanPortfolioAPI.build()`,
Sesi B1, HANYA porsi `owners[]` per orang) bisa menampilkan pecahan
BERBEDA untuk aset yang sama. **Bukan dobel-hitung** di mana pun (2
angka ini tidak pernah dijumlah bareng) — cuma bisa bikin user bingung.

## Keputusan Desain
**TIDAK mengubah rumus salah satu sisi** (`sumAssets()`/`build()`
tetap 100% seperti sebelumnya) — keduanya "benar" untuk definisi
masing-masing (whole-entity vs porsi eksplisit), memaksa salah satu
"menang" berisiko jadi rumus baru yang belum diminta & bisa merusak
makna existing di tempat lain yang sudah reuse `sumAssets()`/`byType()`
(mis. `summary()`, dashboard). Solusi yang diambil: **deteksi +
beritahu** lewat `runDataHealthCheck()` (data-health-check.js) — pola
SAMA PERSIS semua cek "tautan orphan"/"data mencurigakan" yang sudah
ada di file itu (S268-S402), murni baca, 0 mutasi.

## Perubahan

### `data-health-check.js`
Tambah 1 cek baru di dalam loop `(D.assets||[]).forEach(a=>{...})` yang
sudah ada (persis setelah cek "akun tautan tidak valid"):
- Kondisi warn: `OwnershipEngine.resolve(a).type !== 'SELF'` **DAN**
  `MultiOwnerEngine.getOwners(a)` balik `ok:true, isSynthesized:false`
  (owners[] eksplisit, bukan sintesis) **DAN** ada baris non-SELF
  dengan porsi > 0 di situ.
- Pesan: sebut nama aset, persentase porsi non-SELF eksplisit, & lokasi
  cek (modal Aset) — level `warn` (bukan `error`, karena bukan data
  rusak, cuma 2 sumber kebenaran berbeda).
- Guard ganda `typeof OwnershipEngine`/`typeof MultiOwnerEngine` (pola
  sama semua guard lain di file ini) — kalau salah satu belum dimuat,
  cek diam saja, 0 false-positive.

## Yang TIDAK berubah
- `DanaKelolaan.sumAssets()`/`byType()`/`summary()` — 0 baris disentuh.
- `DanaTitipanPortfolioAPI.build()`/`_asetOwnersForTitipan()`/
  `_assetSplits()` (Sesi B1/B2) — 0 baris disentuh.
- `OwnershipEngine`/`MultiOwnerEngine` — 0 baris disentuh (dipakai apa
  adanya, read-only).
- Cek `runDataHealthCheck()` yang sudah ada — 0 diubah, cuma ditambah.

## Test Baru
`tests/data-health-check-aset-dual-ownership-f3-s501.test.js` (5 test):
1. Aset ber-`ownership` non-SELF + `owners[]` eksplisit non-SELF
   sekaligus → warn, pesan sebut nama aset & persentase.
2. Aset cuma `ownership` non-SELF tanpa `owners[]` eksplisit (kasus
   umum/legacy) → TIDAK warn.
3. Aset cuma `owners[]` eksplisit, `ownership` SELF/kosong (kasus
   normal Sesi B1) → TIDAK warn.
4. `owners[]` eksplisit tapi SEMUA porsi SELF (bukan titipan beneran)
   → TIDAK warn.
5. Guard: aman kalau `OwnershipEngine`/`MultiOwnerEngine` belum
   dimuat (0 crash, 0 false-positive).

## Verifikasi
- `node --test tests/*.test.js` — **3266/3266 lulus** (naik dari 3261,
  +5 test baru; 0 regresi).
- `node scripts/build.js s501-dana-titipan-f3-dual-ownership-datahealthcheck`
  — build sukses, versi naik ke **v1232**, sintaks kedua bundle valid.
- `esbuild` tidak tersedia (bundle belum diminify, sama seperti sesi
  sebelumnya — 100% valid & aman dipakai).

## Sisa Kerjaan (SENGAJA bukan sesi ini)
- **Sesi C** — mekanisme "pinjam untuk transaksi keuangan" (G4), wajib
  audit kecil dulu.
- **Sesi D** (opsional) — perluasan ke Kendaraan/Shop.

## Catatan
Zip release ini **FULL RELEASE** (semua file, v1232). Zip patch
terpisah
(`kw_patch_v1231-to-v1232_s501-dana-titipan-f3-dual-ownership-datahealthcheck.zip`)
berisi HANYA file yang berubah/baru sejak v1231.
