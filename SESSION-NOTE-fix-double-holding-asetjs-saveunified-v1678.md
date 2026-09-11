# Session Note — Fix bug produksi double-holding `aset.js saveUnified()` (v1678)

## Task

Item #1 urutan "sesi ringan berikutnya" `ROADMAP-KONSOLIDASI-DATABASE-
SERVIS-v2.md` §2m: perbaikan bug produksi double-holding yang ditemukan
(tapi sengaja DITUNDA, di luar scope) di sesi v1677 saat menutup 7 gap
harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js`.

## Bug (repro singkat)

Aset baru dibuat via `saveUnified()` dengan jenis yang cocok mapping
migrasi (`ASSET_JENIS_TO_INVESTMENT_TYPE`: Saham/Reksadana/Kripto/
Deposito) + `hargaBeli`/`jumlahUnit` terisi (>0) + toggle "Buat Holding
Investasi Otomatis" aktif:

1. `Aset.save()` (dipanggil DI DALAM `saveUnified()`, SEBELUM blok
   holding-creation eksplisit) → `_saveInner()` → `renderList()` →
   `migrateAssetInvestmentsToHoldings()` (dipanggil UNCONDITIONAL tiap
   `renderList()`) mendeteksi aset baru ini sbg kandidat migrasi SAH
   (belum punya `_migratedToInvestmentId`/`investmentId`, jenis cocok,
   `buku=hargaBeli*jumlahUnit>0`) → bikin **Holding #1**, tandai
   `a._migratedToInvestmentId=holding.id`.
2. `saveUnified()` lanjut: guard lama `if(savedAsset.investmentId)
   return savedAsset` cek field `investmentId` — BUKAN
   `_migratedToInvestmentId` (field yang justru ditulis migrasi barusan)
   — guard gagal menangkap kasus ini, `saveUnified()` lanjut bikin
   **Holding #2** via `Investment.addHolding()`.

Hasil: 1 aset baru → 2 Holding Investasi terduplikasi.

## Fix

Satu baris di `modules/asset/aset.js`, guard di `saveUnified()`:

```js
// sebelum
if(savedAsset.investmentId)return savedAsset;
// sesudah
if(savedAsset.investmentId||savedAsset._migratedToInvestmentId)return savedAsset;
```

Guard sekarang cek KEDUA field — kalau migrasi race sudah menandai aset
ini (`_migratedToInvestmentId`, Holding #1 sudah dibuat), `saveUnified()`
langsung `return` TANPA membuat Holding #2. 0 perubahan lain (urutan
side-effect `_saveInner()`/`renderList()` TIDAK disentuh, sesuai opsi
paling minim-risiko yang sudah disebut di ROADMAP §2m — bukan opsi
"pindah `renderList()`" yang lebih invasif).

## Test

Regression test baru ditambahkan ke file harness yang sudah ada
(`tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js`,
Bagian 3): `Aset.saveUnified() aset baru jenis tradable + hargaBeli/
jumlahUnit terisi -- TIDAK bikin 2 Holding terduplikasi`. Mereproduksi
persis kombinasi race di atas (jenis Reksadana + hargaBeli/jumlahUnit
terisi), membungkus `Investment.addHolding` utk menghitung jumlah
panggilan, assert cuma 1x holding dibuat (`saved._migratedToInvestmentId`
terisi, `saved.investmentId` TETAP kosong krn guard baru return sebelum
baris itu sempat jalan — bukan bug, memang alur guard-nya).

- File test ini: 18/18 pass (naik dari 17/17 v1677 + 1 test baru).
- **Catatan lingkungan sandbox**: 7 test LAIN di file yang sama (tidak
  disentuh sesi ini) gagal dgn `TypeError` tak terkait (mis.
  `Investment.watchlistAlerts is not a function`) — dikonfirmasi
  **pre-existing SEBELUM fix ini** (diuji di working copy bersih tanpa
  perubahan apa pun, hasil identik). Kemungkinan drift rekonstruksi
  source dari overlay ZIP akumulasi (`app-main__78_.zip` +
  `PATCH-AKUMULASI-v1642-v1673/v1675/v1676/v1677.zip`) di sandbox ini,
  BUKAN regresi dari fix. **Rekomendasi: verifikasi ulang di repo git
  penuh milik W** sebelum menganggap semua 6497 test v1677 benar-benar
  utuh di sini.
- Full suite `node --test`: **6501 test, 6487 pass, 14 fail** (naik dari
  6500/6486/14 sebelum sesi ini — net +1 test, +1 pass, fail COUNT SAMA
  PERSIS 14, nama test yang gagal dikonfirmasi IDENTIK via diff sebelum/
  sesudah). **0 regresi baru dari fix ini.** Deviasi dari 2 fail yang
  dicatat CHANGELOG v1677 (6497/6495/2) kemungkinan besar sama — artefak
  rekonstruksi sandbox, bukan hasil sesi ini (14 vs 2 sudah demikian
  SEBELUM fix diterapkan).
- `node scripts/build.js` — sukses. Versi source bump
  `s-sesi-c-titipan-updated-1677` → `...-1678`; `?v=` bump `1652` →
  `1653`. (Selisih 1652→1653 bukan 1653→1654 krn base sandbox ini juga
  hasil rekonstruksi overlay, bukan repo git berkelanjutan.)
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK, kedua bundle segar.
- `node scripts/verify-release-ready.js` — LOLOS via override manual
  (`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  sandbox tanpa akses jaringan — eslint & esbuild tidak terpasang, pola
  sama sesi-sesi sebelumnya).
- Bundle hasil build **TANPA minifikasi** (esbuild tidak tersedia di
  sandbox ini, tanpa akses jaringan) — sintaks valid (`node --check`
  lolos), tapi lebih besar dari build produksi asli. Kalau W ingin
  bundle terminifikasi, jalankan `npm install --save-dev esbuild` lalu
  `node scripts/build.js` ulang di lingkungan W sendiri.

## Sengaja TIDAK dikerjakan sesi ini

- 7 test lain yang gagal di file harness yang sama (lihat catatan
  lingkungan sandbox di atas) — di luar scope (bukan regresi dari fix
  ini, butuh verifikasi terpisah di repo git W).
- Sesi F lanjutan (thumbnail/lightbox), Sesi D (`service_categories`),
  Dana Titipan `titipan.updated`, wiring `AIService.wireEvents()` —
  tidak berubah dari antrian sesi-sesi sebelumnya.

Ditutup: item #1 §2m ROADMAP ("Bug produksi double-holding `aset.js
saveUnified()`").
