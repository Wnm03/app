# SESSION NOTE — Sesi C-followup: Perbaikan 7 gap harness `investasi-dasar-aibus-investment-updated-sesi-c.test.js` (v1677)

> Sumber: `ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §2l urutan poin 1 —
> item pertama "Urutan sesi ringan berikutnya" per status v1676. Menutup
> gap yang DITUNDA eksplisit atas instruksi W di
> `SESSION-NOTE-sesi-c-investasi-dasar-investment-updated-v1674.md`
> ("jangan perbaiki dulu, lanjut bikin zip akumulasi").

## Kenapa sesi ini

v1674 menambah 7 titik emit `investment.updated` baru (`investasi-watch-
view.js`/`aset-misc.js`/`aset.js`/`tx-list-cashflow.js`/`realokasi-sisa-
kuota.js`) dengan test baru (17 test), tapi 7 dari 17 test gagal murni
karena **gap harness** (stub context `loadSource()` di test belum meniru
urutan-muat/dependency file asli di app nyata) — BUKAN bug logic di 7
titik emit itu sendiri (dikonfirmasi manual sejak v1674). Perbaikan
ditunda ke sesi terpisah supaya packaging v1674 tidak terhambat.

## Yang dikerjakan

**Semua perubahan HANYA di file test** (`tests/investasi-dasar-aibus-
investment-updated-sesi-c.test.js`) — **0 baris kode produksi diubah**
sesi ini.

### Bagian 2 (`aset-misc.js`, `makeMiscCtx()`) — 4 test, gap murni stub

File asli `aset-misc.js` SELALU dimuat SETELAH `aset.js`/`aset-reports.js`
di app nyata — baris terakhir file (`Object.assign(window,{...})`)
merujuk `Aset`/`Penyusutan`/`PajakAset`/`LaporanAset`/`IDBStore`/
`PORTFOLIO_LABELS`/`TimelineW` yang didefinisikan di file lain. Harness
yang memuat file ini SENDIRIAN belum menyediakan stub utk nama-nama itu.
**Fix**: tambah stub objek kosong (`{}`) utk semua nama tsb di
`extraGlobals` — aman krn tidak ada logic di `migrateAssetInvestmentsTo
Holdings()`/`unmigrateAssetFromInvestment()` (yang DITES) yang MEMBACA
nama-nama itu, cuma diekspos ke `window` di baris terakhir file.

### Bagian 3 (`aset.js` `saveUnified()`, `makeAsetCtx()`) — 3 test, gap stub + 1 temuan bug produksi (di luar scope, DITUNDA)

`_saveInner()` (dipanggil dari dalam `saveUnified()`) memanggil `renderList()`,
yang punya beberapa dependency lanjutan yang belum di-stub:

1. `FilterPrefsStore.loadOnce(Aset)` (S716, `modules/shared/filter-prefs-
   store.js`) — file MURNI (cuma baca/tulis `localStorage`, sudah di-stub
   permisif oleh `loadSource()`), jadi dimuat dari **source asli**
   (`loadSource(['modules/shared/filter-prefs-store.js','modules/asset/
   aset.js','modules/asset/aset-misc.js'], ...)`), bukan di-mock.
2. `migrateAssetInvestmentsToHoldings()` (dari `aset-misc.js`, DITES
   terpisah di Bagian 2 di atas) — dipanggil UNCONDITIONAL tiap
   `renderList()`. Dimuat dari source asli juga (urutan: `aset.js` DULU
   baru `aset-misc.js` — kebalikan urutan real app, lihat `docs/FILE-MAP.md`
   — supaya `Aset` yang dirujuk `aset-misc.js` sudah ada sbg binding;
   aman krn fungsi baru DIPANGGIL belakangan, bukan saat file dimuat).
3. `isAssetOwnershipSelf()` (fungsi ASLI di `aset-misc.js`) memanggil
   `OwnershipEngine.resolve(a).type` — stub `OwnershipEngine` ditambah
   method `resolve()`.
4. `fmtFull`/`fmt` (dipanggil dari `renderDashboard()`/cabang list-render
   `renderList()`) — stub sederhana `(n) => String(n)`.
5. `AssetInsight.render()` (dipanggil dari cabang `!list.length`/
   `!filteredList.length` `renderList()`) — stub no-op.
6. `Aset.renderDashboard()`/`Aset.renderInvestasi()`/`Aset.
   _safeRenderReports()` — method render ASLI `aset.js` sendiri, tapi
   masing2 punya rantai dependency formatting lanjutan yang tidak
   relevan dgn logic emit yang DITES di sini — **di-override no-op
   SETELAH `loadSource()`, SEBELUM test memanggil `saveUnified()`** (pola
   sama alasan stub `renderKekayaanBersih`/`renderAccGrid`/dkk yang
   sudah ada sejak v1674).

### Temuan sesi ini: bug produksi (DITUNDA, di luar scope 7 gap harness)

Setelah semua gap stub #1–6 ditutup, 3 test Bagian 3 (aset.js) masih
gagal — TAPI bukan lagi `ReferenceError` (gap harness), melainkan
**assertion count event salah** (`3 !== 1`). Ditrace manual (lihat
`node -e` reproduksi di riwayat sesi ini):

Kalau aset BARU dibuat via `saveUnified()` dgn jenis yang cocok mapping
migrasi (`ASSET_JENIS_TO_INVESTMENT_TYPE`, aset-misc.js — subset dari
`TRADABLE_TYPE_MAP` aset.js: Saham/Reksadana/Kripto/Deposito) DAN
`hargaBeli`/`jumlahUnit` terisi (>0) DAN toggle "Buat Holding Investasi
Otomatis" aktif:

1. `Aset.save()` → `_saveInner()` → `renderList()` →
   `migrateAssetInvestmentsToHoldings()` jalan LEBIH DULU (SEBELUM
   `investmentId` sempat di-set oleh blok holding-creation eksplisit di
   bawah `saveUnified()`) — asset baru ini ke-deteksi sbg kandidat sah
   (belum py `_migratedToInvestmentId`/`investmentId`, jenis cocok,
   `buku=hargaBeli*jumlahUnit>0`) → bikin Holding #1, set
   `_migratedToInvestmentId`, emit `investment.updated{kind:'migrate-
   from-asset'}`.
2. `saveUnified()` lanjut: guard `if(savedAsset.investmentId)return`
   cek field `investmentId` — TAPI yang di-set migrasi di atas adalah
   `_migratedToInvestmentId` (field BEDA) — guard ini TIDAK menangkap
   kasus ini. `saveUnified()` lanjut bikin Holding #2 via
   `Investment.addHolding()` lagi, plus waris ownership, emit
   `investment.updated{ownersUpdated:true}`.

**Hasil: 1 aset baru → 2 Holding Investasi terduplikasi** (dikonfirmasi
`saved.investmentId` beda dgn `saved._migratedToInvestmentId` di
reproduksi manual). Ini BUG PRODUKSI NYATA di `aset.js saveUnified()`
(guard-nya cek field yang salah), bukan artefak test — tapi DI LUAR
cakupan "7 gap harness" (yang scope-nya murni stub test, per keputusan
W di `SESSION-NOTE-sesi-c-investasi-dasar-investment-updated-v1674.md`).

**Keputusan sesi ini (instruksi W eksplisit)**: TIDAK memperbaiki bug
produksinya. Sebagai gantinya, 2 dari 3 data test Bagian 3 (`waris
ownership non-SELF` & `owners SELF 100%`) diubah — `assetHargaBeli`/
`assetJumlahUnit` SENGAJA dikosongkan (jadi `0`, gagal syarat `buku>0`
di kandidat migrasi, migrasi tidak ke-trigger) — supaya test tetap
menguji apa yang MEMANG jadi subjeknya (logic `ownersUpdated` di blok
holding-creation eksplisit `saveUnified()`), tanpa terserempet race
migrasi yang di luar cakupan. `hargaBeli`/`jumlahUnit`=0 tidak
mempengaruhi assertion yang ada (tidak ada assertion soal nilai
holding/unit/harga).

Tambahan 1 fix harness (bukan soal race di atas): stub `AIBus.emit` di
`makeAsetCtx()` diubah supaya HANYA menangkap event `investment.updated`
— `_saveInner()` (CRUD Aset inti, preseden LAMA di luar cakupan sesi
v1674) SUDAH emit `asset.updated` di jalur create/delete yang sama;
tanpa filter ini, `ctx._events` ikut menghitung `asset.updated` yang
bukan subjek Bagian 3, bikin assertion count keliru walau logic
`investment.updated` sendiri sudah benar.

**Bug produksi di atas DICATAT sbg item baru di ROADMAP §2m
(`❌ Belum dikerjakan`) utk sesi terpisah** — bukan diabaikan, cuma
ditunda sesuai keputusan scope eksplisit.

## Test

- `tests/investasi-dasar-aibus-investment-updated-sesi-c.test.js`:
  **17/17 pass** (naik dari 10/17 di v1674, 0 test dihapus/di-skip).
- Full suite `node --test tests/*.test.js`: **6497 test, 6495 pass, 2
  fail** — kedua kegagalan **100% pre-existing sejak v1673**
  (S468d/txHTML virtual-bill, tidak berubah dari v1676) — **0 regresi
  baru**, dan (sbg bonus) 2 kegagalan lain yang sempat muncul di full-
  suite run rekonstruksi checkout sesi ini SEBELUM `build.js` dijalankan
  (`verify-release-ready (end-to-end)`/`checkBundleFreshness()`) ikut
  **hilang setelah `node scripts/build.js` dijalankan** — keduanya
  memang soal state build/gate-log basi, bukan regresi kode (dicatat
  sbg follow-up terbuka di v1674, sekarang terkonfirmasi beres krn
  murni efek build, bukan bug).
- `node scripts/build.js` — sukses. Versi source bump otomatis
  `s-sesi-c-titipan-updated-1676` → `...-1677`; versi numerik `?v=`
  bump `1651` → `1652`. Bundle ditulis TANPA minifikasi (esbuild tidak
  tersedia), sintaks kedua bundle lolos `node --check`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK, kedua bundle segar
  (setelah build).
- `node scripts/verify-release-ready.js` — lolos via override manual
  (`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  sandbox tanpa akses jaringan, sama seperti override sesi-sesi
  sebelumnya). `docs/RELEASE-GATE-LOG.md` diperbarui otomatis oleh
  script.
- Peringatan oversized-file (`car-notes.js`, `modules/asset/aset-
  owners.js`) — tidak berubah dari sebelum sesi ini, tidak menggagalkan
  build.

## Sengaja TIDAK dikerjakan sesi ini

- **Perbaikan bug produksi double-holding** di `aset.js saveUnified()`
  (guard `if(savedAsset.investmentId)` seharusnya juga cek
  `_migratedToInvestmentId`, atau urutan pemanggilan `renderList()`
  dipindah SETELAH `investmentId` di-set) — temuan BARU sesi ini,
  DITUNDA ke sesi terpisah atas instruksi eksplisit W. Dicatat di
  ROADMAP §2m.
- Sesi F lanjutan (thumbnail/lightbox), gate wajib version-bump, Zakat/
  PBB 6 titik sisa — tidak berubah dari sesi-sesi sebelumnya.

**Belum dikerjakan:** perbaikan bug double-holding `aset.js
saveUnified()` (BARU, lihat di atas), Sesi F lanjutan, gate version-
bump wajib, Zakat/PBB 6 titik sisa.
