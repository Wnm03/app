# Changelog — Sesi S706 (Fix Temuan #2 audit modul Aset: LaporanAset tidak exclude aset termigrasi ke Investasi, v1515)

## Task
Lanjutan audit mendalam 27 file `modules/asset` (sesi S705); sesi ini
mengerjakan Temuan #2 (1 sesi = 1 task): `LaporanAset.nilaiAset()`/
`ringkasanKekayaan()`/`build().daftarAset` (`aset-reports.js`) hanya
memfilter `isAssetOwnershipSelf`, tidak memfilter
`!a._migratedToInvestmentId`/`!a.investmentId` seperti `Aset.totalValue()`
(`aset.js`) — menyebabkan aset yang sudah jadi Holding Investasi tetap
dihitung dobel di kartu "📑 Laporan Aset".

## Perubahan
- `modules/asset/aset-reports.js` — tambah filter migrasi
  (`!a._migratedToInvestmentId`, `!a.investmentId`) ke `nilaiAset()`,
  `ringkasanKekayaan()`, dan sumber data `daftarAset` di `build()`, pola
  SAMA PERSIS `Aset.totalValue()`. `aset.js` sendiri 0 disentuh.

## Sengaja TIDAK dikerjakan sesi ini
- Temuan #3 (dobel Buku Utang saat auto-holding di `saveUnified()`) —
  backlog sesi berikutnya, sesuai aturan 1 sesi = 1 task.

## Test
- Baru: `tests/s706-laporan-aset-exclude-migrated-double-count.test.js`
  (5 test).
- Full suite: 5285/5285 (1 flake pre-existing tidak terkait, terkonfirmasi
  di baseline).
- Build: `node scripts/build.js` — semua gate lolos, versi → 1515.

---

# Changelog — Sesi S705 (Fix Temuan #1 audit modul Aset: 3 kartu laporan aset tanpa try/catch, v1514)

## Task
Audit mendalam 27 file `modules/asset` menemukan 3 temuan konkret; sesi ini
mengerjakan Temuan #1 (1 sesi = 1 task): `Penyusutan.renderList()`,
`PajakAset.renderList()`, `LaporanAset.renderList()` (`aset-reports.js`)
dipanggil berurutan tanpa try/catch dari 4 titik di `Aset.renderList()`
(`aset.js`), pola bug yang sama dengan yang sudah diperbaiki S601/S608 untuk
per-item render.

## Perubahan
- `modules/asset/aset.js` — method baru `Aset._safeRenderReports()`
  membungkus ketiga panggilan kartu laporan dengan try/catch masing-masing;
  4 titik panggilan lama diganti pakai method ini. `aset-reports.js` sendiri
  0 disentuh.

## Sengaja TIDAK dikerjakan sesi ini
- Temuan #2 (filter migrasi belum disinkron di `LaporanAset`) dan Temuan #3
  (dobel Buku Utang saat auto-holding di `saveUnified()`) — backlog sesi
  berikutnya, sesuai aturan 1 sesi = 1 task.

## Test
- Baru: `tests/s705-aset-report-cards-trycatch-guard.test.js` (4 test).
- Full suite: 5277/5277 pass, 0 fail.
- Build: `node scripts/build.js` — semua gate lolos, versi → 1514.

---

# Changelog — Sesi S610 (Sisa renderer try/catch per-baris: modules/vehicle/, modules/cross/, v1451)

## Task
Lanjutan audit "0 reaksi" (pola sama S601/S608): sisa renderer di luar
cakupan s608 — `modules/vehicle/`, `modules/cross/`, dashboard presenter —
yang masih pakai `list.map(...) -> innerHTML` TANPA try/catch per-item.

## Perubahan (try/catch per-item + fallback aman)
- `modules/vehicle/fuel-history.js` — `FuelHistory.render()`
- `modules/vehicle/fuel-compare.js` — `FuelCompare.render()`
- `modules/vehicle/vehicle-attention-presenter.js` — `render()` (2 blok: actionRows & insightRows)
- `modules/vehicle/vehicle-decision-presenter.js` — `render()`
- `modules/cross/life-priority-panel.js` — `render()`
- `modules/cross/action-queue.js` — `render()`

## Sengaja TIDAK disentuh (risiko rendah — audit dicek, bukan terlewat)
- `modules/dashboard-hub/dashboard-hub.js` — mayoritas `.map().join('')` di
  file ini beroperasi atas array kecil TETAP (4-5 kartu ringkasan statis:
  Pemasukan/Pengeluaran/Bersih/Transaksi, 5 tipe ownership), bukan daftar
  dinamis dari data user — risiko throw per-item minim & sudah banyak
  di-guard `typeof`.
- `modules/cross/cross-insight-presenter.js`, `modules/cross/recommendation-panel.js`,
  `modules/cross/cross-dashboard-card.js`, `modules/cross/cross-module-widgets.js` —
  per-item cuma lookup emoji (`_icon(type)`, fallback default) +
  `escapeHtml()`, tidak ada kalkulasi/derivasi lanjutan yang bisa throw.

## Test
- Baru: `tests/s610-vehicle-cross-renderlist-trycatch-guard.test.js` (4 test).
- Full suite: 4911/4911 pass, 0 fail.
- Build: `node scripts/build.js` — semua gate lolos, versi -> 1451.
  `verify-bundle-freshness.js` lolos.

---

# Changelog — Sesi S609 (Audit alur pembayaran Utang/Piutang — revert transaksi pelunasan, v1450)

## Task
Lanjutan backlog item #4 dari sesi s608: audit alur pembayaran utang/piutang
(`modules/finance/piutang-utang.js`), fitur AUDIT-SYNC-PIUTANG-UTANG-ARUS-KAS
§5.1/§5.2 (toggle "🧾 Catat juga sebagai transaksi arus kas" saat entri
Piutang/Utang dibuat & ditandai lunas).

## Bug ditemukan
§5.2 sudah menangani Belum Lunas -> Lunas (bikin 1 transaksi pelunasan
otomatis, idempotent via `linkedPayoffTxId`). Arah sebaliknya — Lunas
dibatalkan jadi Belum Lunas lagi — tidak membalikkan apa pun: transaksi
pelunasan otomatis tetap nyangkut di `D.transactions` & tetap mempengaruhi
saldo akun, padahal piutang/utangnya sendiri sudah kembali dihitung PENUH
sbg belum lunas — double count di Total Piutang/Utang & Kekayaan Bersih.

## Perubahan

**`modules/finance/piutang-utang.js`**
- `Piutang._saveInner()` — transisi Lunas -> Belum Lunas sekarang menghapus
  balik `p.linkedPayoffTxId` dari `D.transactions` & membersihkan field
  tsb (simetris dgn §5.2). Idempotent: kalau ditandai Lunas lagi nanti,
  transaksi pelunasan baru dibuat lagi seperti biasa.
- `Debt._saveInner()` — pola simetris persis, arah expense
  (`d.linkedPayoffTxId`).
- Entri manual (tanpa `linkedTxId`/`linkedPayoffTxId`, tidak pernah pakai
  toggle §5.1) 0 terpengaruh.

## Test
- Baru: `tests/s609-audit-payoff-tx-revert-piutang-utang.test.js` (4 test).
- Full suite: 4907/4907 pass, 0 fail.
- Build: `node scripts/build.js` — semua gate lolos, versi -> 1450.
  `verify-bundle-freshness.js` lolos.

## Masih menggantung
Sisa renderer di luar cakupan s608 (`modules/vehicle/`, `modules/cross/`,
dashboard presenter) — belum disentuh sesi ini.

---

# Changelog — Sesi S668 (Panel "⚙️ Atur" siklus tagihan di kartu Proyeksi Kas Bulan Ini lama, v1410)

## Task
Lanjutan S667: kartu "🏦 Proyeksi Saldo Kas" (CashFlowProjectionPresenter,
#cashflowProjWrap) dan kartu "💰 Proyeksi Kas Bulan Ini" (dashCashProjCard,
_renderCashProjectionCard) ternyata 2 widget TERPISAH dgn mesin hitung
berbeda (audit sblm sesi ini). Setelah diskusi, dipilih: TAMBAH panel
"⚙️ Atur" (siklus tagihan) ke kartu lama, TIDAK digabung jadi 1 tampilan
(risiko 2 angka mirip nama beda makna tabrakan di 1 kartu).

## Perubahan

**`modules/finance/cash-projection.js`**
- `getMonthlyCashProjection(month,year,opts)` — parameter `opts` BARU &
  OPSIONAL (`billWindowMode`,`cycleStartDay`), 100% backward-compatible.
  Tanpa opts / opts tanpa `billWindowMode:'siklus'` -> identik perilaku
  lama (`getBillOccurrencesInMonth`, bulan kalender). Mode `'siklus'` pakai
  `billingCycleRange()`+`getBillOccurrencesInRange()` (SUDAH ADA di
  tx-list-cashflow.js/tagihan-kalender.js, Sesi 93/95) utk jendela
  **sisaKewajiban/billMonthTotal/billPaidThisPeriod** saja —
  **proyeksiGaji TETAP selalu bulan kalender** (gaji tidak ada konsep
  siklus tengah-bulan).

**`modules/shared/modules-render.js`**
- `_renderCashProjectionCard()` sekarang baca `CashflowProjSettings`
  (SAMA `D.profile.cashflowProjSettings` yang dipakai kartu satunya —
  0 struktur data baru) & teruskan `billWindowMode`/`cycleStartDay` ke
  `getMonthlyCashProjection()`.
- Panel inline "⚙️ Atur" baru (`_dashCashProjSettingsToggle`/
  `_dashCashProjToggleSettings`/`_dashCashProjFillSettingsPanel`/
  `_dashCashProjSetBillWindowMode`/`_dashCashProjSetCycleDay`/
  `_dashCashProjResetSettings`/`_dashCashProjRefreshAll`) — cuma expose
  mode Kalender/Siklus Custom + tanggal mulai siklus (field
  `months`/`accountId` di settings yang sama TIDAK relevan di kartu ini,
  sengaja tidak ditampilkan). 0 CSS baru (reuse chip-btn/fg/fl/fi/btn).

**`modules/finance/cashflow-projection-presenter.js`**
- `resetSettings()`/`_applySettings()` sekarang ikut refresh
  `_renderCashProjectionCard()` — 1 setting dipakai 2 kartu, disinkron
  2 arah supaya tidak stale kalau diubah dari panel manapun.

## Test
- File baru `tests/cash-projection-s667b-siklus.test.js` (6 test):
  backward-compat literal (tanpa opts vs opts={}), mode bukan-siklus
  identik lama, mode siklus menangkap tagihan potong-tengah-bulan,
  cycleStartDay custom, proyeksiGaji tetap kalender, guard aman tanpa
  billingCycleRange dimuat.
- `tests/cash-projection-card-s-p2.test.js` & `cash-projection-card-s-q3.test.js`
  diupdate (ikut extract `_dashCashProjSettingsToggle`, dependency baru
  `_renderCashProjectionCard`) — 0 assertion lama diubah.
- `npm test` — **4833/4833 PASS** (4827 lama + 6 baru).
- `node scripts/verify-window-expose.js` — OK, 77 modul.

## Build
- `node scripts/build.js s668-cashflow-siklus-legacy-card` — versi
  1409 -> **1410**, `package.json` 0.85.9 -> 0.85.10, bundle a/b
  diregenerasi (esbuild tidak terpasang di environment build ini ->
  tanpa minifikasi, tetap valid).


# Changelog — Sesi S667 (Cash Flow Projection: siklus tagihan tengah-bulan + panel Atur, v1409)

## Task
Audit + rilis resmi utk fitur "Cash Flow Projection — Siklus Tagihan &
Settings" (CashflowProjSettings, billingCycleRange(),
computeCashflowForecast(opts), panel "⚙️ Atur" di
CashFlowProjectionPresenter) yang kodenya sudah ada di source tapi
BELUM PERNAH melewati siklus build resmi (versi app tidak pernah
di-bump, CHANGELOG tidak pernah ditulis utk fitur ini).

## Temuan Audit
- Source code fitur (cashflow-projection-settings.js,
  billingCycleRange()/computeCashflowForecast(opts) di
  tx-list-cashflow.js, 3 kartu navigasi + panel Atur di
  cashflow-projection-presenter.js, entry build.js) SUDAH lengkap &
  100% backward-compatible — diverifikasi via 4.827 test (`npm test`),
  semua PASS.
- package.json version & CHANGELOG.md TIDAK PERNAH ter-update utk
  fitur ini sebelumnya (versi app masih tertahan di
  s666-networth-renderbersih-ssot-unify / v1408).
- Sesi ini murni menjalankan siklus build resmi (bump versi,
  regenerasi bundle, sinkronisasi ?v= & cache) yang seharusnya sudah
  dijalankan sebelumnya, TANPA mengubah logic apa pun.

## Fitur (ringkasan)
- `CashflowProjSettings` (get/set/reset/isCustomized) — preferensi
  user (rentang bulan, filter akun, mode jendela tagihan,
  cycleStartDay) disimpan di `D.profile.cashflowProjSettings`.
- `billingCycleRange(refDate, cycleStartDay)` — siklus tagihan yang
  potong di tengah bulan (mis. kartu kredit/listrik pascabayar),
  default mulai tgl 16, bisa diatur 1–28.
- `computeCashflowForecast(opts)` — parameter opsional baru
  (months/accountId/billWindowMode/cycleStartDay), 100%
  backward-compatible dgn pemanggilan lama tanpa argumen.
- 3 kartu Proyeksi Saldo Kas sekarang klik ke tujuan berbeda
  (income/expense -> tab Transaksi terfilter, bills -> tab Tagihan)
  + panel inline "⚙️ Atur" utk ubah settings di atas.

## Build
- `npm test` — 4.827/4.827 PASS.
- `node scripts/build.js s667-cashflow-siklus-tagihan-settings` —
  versi app 1408 -> 1409, bundle a/b diregenerasi (esbuild tidak
  terpasang di environment build ini -> bundle TANPA minifikasi,
  tetap valid/aman, ukuran lebih besar dari versi terminifikasi).
- File yang berubah: app-bundle-a.min.js, app-bundle-b.min.js,
  app_production.html, index.html, sw.js,
  modules/shared/{modals.js, modules-render.js, modules-calc.js,
  features-helpers-global-security.js}, chat-action-handlers.js,
  docs/FILE-MAP.md, docs/COVERAGE-PER-MODULE.md.


# Changelog — Sesi S660 (DP + Piutang di applyTxShopSaleFromTx, v1393)

## Task
Poin 1 dari 3 permintaan user: tambah field DP + logic piutang ke
`applyTxShopSaleFromTx()` (modules/shop/cobek-tx-cart.js) — jalur
penjualan Shop yang dipicu dari centang "Catat juga sbg Penjualan Shop"
di modal Transaksi (txModal), BUKAN dari modal Order (orderModal) yang
sudah lebih dulu punya fitur ini (kw-shop-dp, Order._saveInner() di
cobek-order.js).

## Fix (additive)
- Field baru #txShopSaleDP ("Uang Diterima / DP (Rp)") ditambahkan ke
  panel txShopSalePanel di modules/shared/modals.js, pola & copy sama
  persis dgn #oDP di orderModal.
- applyTxShopSaleFromTx() sekarang reuse PERSIS logic kw-shop-dp milik
  Order._saveInner(): DP kosong = lunas penuh (0 regresi perilaku lama);
  DP < Total -> sisa dicatat/disinkron sbg D.piutang (create/update/hapus
  mengikuti pola existingPiutangId yang sama), linked via
  shopRecord.piutangLinkId di D.cobek. Transaksi utama (tx.amount) di-set
  ke DP (bukan Total) supaya saldo akun konsisten dgn uang yang benar2
  diterima — barang tetap dianggap keluar/terjual penuh dari stok
  (recordShopSale tidak berubah).
- 0 perubahan pada Order._saveInner()/orderModal (referensi, tidak disentuh).

## Test & Build
4718/4718 test lulus (0 regresi), build v1393 sukses, sintaks bundle valid.


# Changelog — Sesi S648 (Fix bug klik nama holding di Dana Titipan -> TypeError, v1382)

## Bug report
User lapor via screenshot: klik tombol di kartu owner Dana Titipan
("mas sihab"/"Aku") memunculkan toast "Terjadi error saat memproses
tombol. Cek console." Diagnosis awal (audit statis + simulasi Node
dgn data dummy) tidak berhasil mereproduksi. Dipasang patch DEBUG
sementara (toast menampilkan pesan+lokasi error asli) — user klik lagi
tombol yang error, dapat pesan pasti: `TypeError: assetId.indexOf is
not a function | at Object._routeAssetPorsi`.

## Root cause
`_routeAssetPorsi(assetId)` (modules/finance/dana-titipan-portfolio-render.js)
memanggil `assetId.indexOf('h:')` dengan asumsi `assetId` selalu string.
Jalur klik-nama-langsung `openAssetPorsiDirect()` (Sesi 631) mengoper
`hh.linkedAssetId` MENTAH dari `D.assets[].id`/`D.investments[].id` —
id-id itu di app ini berupa ANGKA (`uid()`-based), bukan string. `Number`
tidak punya method `.indexOf` -> throw. Jalur dropdown lama
(`openAssetPorsi()`, baca `<select>.value`) tidak kena krn value DOM
`<select>` selalu string.

## Fix (additive, 1 titik)
`_routeAssetPorsi()` sekarang koersi `String(assetId)` sekali di titik
masuk (dipakai kedua caller: `openAssetPorsi()` & `openAssetPorsiDirect()`,
0 perubahan di caller). 2 test regresi baru (assetId angka murni & assetId
angka dgn prefix `h:`), 4630/4630 test lulus 0 regresi, build+
verify-bundle-freshness+verify-window-expose semua OK.



## Audit
Bukan laporan bug user — audit keamanan proaktif atas `modules/shared/keamanan-pin.js`.

## Temuan
Salt yang dipakai `hashPin()` sebelumnya adalah string TETAP
(`'kwPinSalt_v1:'`) yang sama persis di semua instalasi aplikasi. Karena
source code app ini terbuka (di-hosting di repo GitHub), salt itu bukan
rahasia. Efeknya: siapa pun bisa precompute SATU tabel hash untuk 10.000
kombinasi PIN 4-digit (dengan salt tetap itu) SEKALI SAJA, lalu memakai
tabel yang sama untuk membalik hash `kw_pin` curian dari instalasi mana pun
dalam hitungan mikrodetik — salting jadi tidak memberi proteksi tambahan
sama sekali dibanding hash polos.

## Fix (additive, backward-compatible)
1. `modules/shared/keamanan-pin.js` — tiap instalasi sekarang generate
   salt acak 16-byte sendiri (`kw_pin_salt` di localStorage, dibuat sesaat
   sebelum dipakai pertama kali via `_getOrCreatePinSalt()`), dipakai
   `hashPin()` untuk semua PIN baru/ganti PIN.
2. Migrasi otomatis: `checkPin()` sekarang fallback ke skema lama
   (`hashPinLegacyFixedSalt()`, salt tetap) SATU KALI kalau hash skema baru
   tidak cocok — kalau cocok, PIN tetap dianggap benar (user TIDAK perlu
   reset PIN) & hash langsung ditulis ulang pakai skema baru, sehingga
   instalasi lama otomatis "naik kelas" begitu user login sekali.
3. `disablePinFlow()` juga menghapus `kw_pin_salt` (kebersihan, konsisten
   dengan penghapusan `kw_pin` & data terkait lainnya).
- CATATAN JUJUR: ini tetap bukan pengganti PIN yang lebih panjang/kuat —
  10.000 kombinasi tetap brute-force-able dalam hitungan detik begitu
  penyerang tahu salt spesifik korban (yang tersimpan di localStorage yang
  sama). Perbaikan ini menutup celah "satu tabel pracetak dipakai ulang
  lintas semua instalasi", bukan brute-force per-korban itu sendiri
  (sudah dimitigasi terpisah oleh lockout percobaan PIN yang sudah ada).
- Version otomatis naik v1368 → **v1369** (`scripts/build.js`).
- Test: `node --test tests/*.test.js` — **4505/4505 lulus, 0 gagal**.

---

# Changelog — Sesi S609 (Dana Titipan: fix modal "Catat Pengeluaran" tidak sync deductionOwnerId & tidak punya field Akun, v1342)

## Laporan user
Dropdown "Pemilik Sumber Potongan" tidak pernah muncul saat mencatat
pengeluaran lewat modal "Catat Pengeluaran Dana Titipan", dan transaksi yang
dicatat lewat modal itu tidak sync ke badge "👤 Ditanggung", kartu "Porsi
per Pemilik", dan "Estimasi dari Transaksi Akun" di dashboard Dana Titipan.

## Root cause
Modal Dana Titipan (`TitipanExpenseFlow`/`TitipanExpenseUI`, S521) adalah
alur transaksi terpisah dari form Transaksi biasa (`txModal`):
1. Tidak punya field Akun sama sekali — `accountId` di-hardcode ke
   `D.accounts[0]`, jadi tidak ada `#txAcc`-equivalent yang bisa memicu
   dropdown "Pemilik Sumber Potongan" (field itu murni milik `txModal`).
2. Tidak pernah mengisi `deductionOwnerId` — field yang sejak S574/S608
   dibaca `resolveTxOwnerAssignment()` (filter-laporan.js) sebagai sumber
   kebenaran badge/kartu/estimasi Dana Titipan di atas. Modal ini hanya
   menulis `titipanLinkId` (field terpisah, tidak dibaca konsumen tsb),
   jadi transaksi lewat sini selalu jatuh ke fallback "owner pertama" di
   semua tampilan yang membaca `deductionOwnerId`.

## Fix (additive, 0 logic lama diubah)
1. `modules/shared/modals.js` — tambah dropdown "Bayar dari Akun"
   (`#titipanExpenseAcc`) ke `titipanExpenseModal`.
2. `modules/finance/titipan-expense-ui.js` — `open()` mengisi & reset
   dropdown akun ke akun pertama (pola sama `billAcc`,
   tagihan-kalender.js); `save()` membaca `accountId` dari dropdown itu
   (fallback ke akun pertama dipertahankan hanya untuk elemen yang belum
   sempat terisi).
3. `modules/finance/titipan-expense-flow.js` — `submit()` sekarang juga
   mengisi `tx.deductionOwnerId = row.ownerId` di tiap transaksi yang
   dibuat (1 baris split = 1 owner yang sudah tervalidasi lewat
   `resolveOwner()`/`validate()`, aman diisi langsung tanpa validasi
   ulang terhadap owners akun).
4. Test baru/diperluas: `tests/s521-titipan-expense-flow.test.js` (assert
   `deductionOwnerId` di test 1 & 2, konsisten dgn `titipanLinkId` di tiap
   baris split) dan `tests/s521-titipan-expense-ui.test.js` (assert
   `deductionOwnerId` di test 7 + test baru 7b/7c untuk dropdown akun).
- Version otomatis naik v1341 → **v1342** (`scripts/build.js`).
- Test: `node --test tests/*.test.js` — **4280/4280 lulus, 0 gagal**.
- `verify-release-ready.js`: lolos (gate lint/minify di-override manual —
  sandbox tanpa akses npm/jaringan, eslint & esbuild tidak terpasang;
  gate html-sync & version-sync lolos bersih).

# Changelog — Sesi S591 (Dana Titipan: dedup holding "Majoris" 2x + tombol Atur Porsi ganda, v1319)

## Konteks
Laporan user: di kartu Dana Titipan (tab Uang), 1 aset yang sama (mis.
"🏦 Majoris") muncul lebih dari 1 kali di daftar holding untuk owner yang
sama, dengan persentase porsi identik di tiap baris — dan tiap baris punya
tombol "⚖️ Atur Porsi" sendiri, terpisah dari dropdown "Pilih Aset" +
tombol "⚖️ Atur Porsi Aset" yang sudah ada di bawahnya.

## Hasil
- **Root cause**: `DanaTitipanPortfolioAPI.build()`
  (`modules/finance/dana-titipan-portfolio-presenter.js`) push 1 baris
  holding PER BARIS `owners[]` hasil `_assetSplits(a)` tanpa dedup — kalau
  1 aset punya lebih dari 1 baris pemilik dengan `ownerId` yang sama, aset
  itu tampil sebagai beberapa baris terpisah.
- **Fix**:
  1. Dedup per (aset, owner) — baris `owners[]` diagregasi dulu per
     `ownerId` (jumlah porsi/allocatedPrincipal/currentValue/gain) sebelum
     push ke `bucket.holdings`; total per-owner tidak berubah.
  2. Tombol "⚖️ Atur Porsi" per-baris holding dihapus dari
     `_holdingRowHtml()` — pengaturan porsi sekarang hanya lewat dropdown
     "Pilih Aset" + tombol "⚖️ Atur Porsi Aset" per kartu owner.
- `modules/finance/dana-titipan-portfolio-presenter.js` — satu-satunya
  file source produksi yang disentuh sesi ini.
- Version otomatis naik v1318 → **v1319** (`scripts/bump-version.sh`),
  disusulkan di sesi ini bareng entri changelog ini (patch asli S591
  belum menyertakan bump versi/changelog).
- `verify-release-ready.js` Gate version-sync (S588): lolos di v1319.
- Test: `node --test tests/*.test.js` — 386/387 lulus di scope
  dana-titipan/portfolio saat S591 dikirim (1 kegagalan pre-existing tidak
  terkait, `s461-cross-source-titipan-total-regression.test.js`); full
  suite belum dijalankan ulang di sesi susulan ini.

Detail lengkap: `s591-SESSION-NOTE.md`.

# Changelog — Sesi S590 (Fix: tombol Hapus menu aksi aset ketutup nav bawah, v1318)

## Konteks
Laporan user (live, dikonfirmasi bukan cuma recent-apps Android): tombol
"🗑 Hapus" di modal aksi aset ketutup nav bawah walau modal sudah terbuka,
tetap terjadi setelah patch v1316 (cache-bump) di-upload & di-refresh.

## Hasil
- **Root cause**: `body.has-open-modal .nav { display: none; }` (styles.css)
  tanpa `!important` — kalah lawan inline style `mn.style.display='flex'`
  yang di-set `showMain()` sekali saat app dibuka. Class `has-open-modal`
  sendiri toggle BENAR, tapi efek visualnya kalah, jadi nav tidak pernah
  benar-benar hilang lagi sejak app pertama dibuka — berpotensi
  mempengaruhi semua modal/qs-sheet yang pakai mekanisme ini, tidak cuma
  menu aksi aset.
- **Fix**: tambah `!important` ke rule itu. `showMain()`/inline style-nya
  tidak disentuh sama sekali (0 risiko regresi ke titik lain).
- `styles.css` — satu-satunya file source produksi yang disentuh sesi ini.
- `tests/nav-hidden-modal-inline-style-override-s590.test.js` (**baru**, 3
  test, semua pass).
- Version otomatis naik v1317 → **v1318** (`scripts/bump-version.sh`).
- Full `npm test`: **4147 test, 4056 pass, 91 fail** (baseline sebelum sesi
  ini: 4144/4053/91 — identik), **0 regresi baru**.
- `verify-release-ready.js` Gate version-sync (S588): **lolos** di v1318.

Detail lengkap: `s590-SESSION-NOTE.md`.

# Changelog — Sesi S588 (Gate 4 "version-sync" di verify-release-ready.js)

## Konteks
Menutup celah yang menyebabkan bug cache basi sebelumnya (?v=1314 lupa
dinaikkan bareng CACHE_NAME sw.js — lihat PATCH-README-v1316-cache-bump.md):
`bump-version.sh` sudah bisa menaikkan versi dengan benar, tapi belum ada
gate yang BLOCK pembuatan ZIP kalau ternyata versi masih tidak sinkron.

## Hasil
- Gate 4 baru "version-sync" di `scripts/verify-release-ready.js`: BLOCK
  ZIP (tanpa override) kalau `?v=N` di `index.html` tidak seragam, atau
  tidak sama dengan `CACHE_NAME` di `sw.js`.
- `tests/verify-release-ready-s575-version-sync.test.js` (**baru**, 4 test,
  semua pass).
- `scripts/verify-release-ready.js` — satu-satunya file source produksi
  yang disentuh sesi ini.
- Full `npm test`: **4144 test, 4053 pass, 91 fail** (baseline tanpa test
  baru: 4140/4049/91 — identik), **0 regresi baru**.

Detail lengkap: `s588-SESSION-NOTE.md`.

# Changelog — Sesi S581 (DL-Next-8: Data Health Check Other-Account Owner Source Fix, v1312)

## Konteks
Implementasi **DL-Next-8** dari `docs/DESIGN-LOCK-DL-NEXT-8-DATA-HEALTH-
CHECK-OTHER-ACC-SOURCE.md` (ref `docs/AUDIT-13-OWNER-RESOLVER-POST-DL-
NEXT-7.md`). 1 sesi, 1 fokus: ganti basis cabang `existsOnOtherAcc` di
`runDataHealthCheck()`.

## Hasil
- **Bug diperbaiki**: kategorisasi salah di Data Health Check untuk
  transaksi yang `deductionOwnerId`-nya valid HANYA lewat aset multi-
  owner tertaut di AKUN LAIN — sebelumnya dikategorikan "tidak ditemukan
  sama sekali" (kasus A), seharusnya "ada, tapi di akun lain" (kasus C).
  Level `warn` tidak berubah di kedua kasus (bukan false-negative), murni
  perbaikan judul/pesan.
- `data-health-check.js` sekarang pakai `resolveOwnerDefaultForAccount()`
  per akun lain (sumber sama dgn cabang utama DL-Next-7), fallback ke
  `a.owners[]` lama kalau fungsi belum termuat.
- `data-health-check.js` — **satu-satunya** file source produksi yang
  disentuh sesi ini.
- `tests/data-health-check-other-acc-owner-source-s581.test.js`
  (**baru**, 4 test — regresi utama AUDIT-13 dikonfirmasi fix).
- Full `npm test`: **4081 test, 4072 pass, 9 fail** (naik dari 4077/4068/9,
  +4 test baru semua pass) — 9 kegagalan identik pre-existing, **0
  regresi baru**.

Detail lengkap: `docs/FIX-v1310-to-v1312-s581-data-health-check-other-acc-owner-source-fix.md`.
