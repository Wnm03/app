# Rencana s476 — Migrasi Investasi: `D.investments` jadi SSOT

Status: **SELESAI — s476a (migrasi+Blocker A/B+hide), s476a2
(CAGR/Yield, Opsi A), dan s476b (Investment Planner rewire ke
Investment.*) sudah dieksekusi & lolos test (3062/3062, 0 regresi).**
Baseline: `kw_release_v1196_s474-virtual-bill-item-final.zip`.
Rilis terakhir: `kw_release_v1201_s476b-investment-planner-rewire.zip`
(v1201).
Keputusan (final, dikonfirmasi O): **`D.investments` jadi SSOT** untuk
data investasi ke depan. Buku Aset (`D.assets`) jadi tampilan/redirect,
bukan sumber kebenaran kedua.

## Latar belakang (ringkas dari audit sebelumnya)
- `D.assets` (Buku Aset): data investasi ASLI user (BGB/TAO/ETH/BTC/
  Majoris/Schorder/Bni am), aktif dipakai sejak Sesi 161.
- `D.investments` (tab "💹 Investasi"): array TERPISAH, kosong permanen
  sejak Sesi 161 sampai Sesi 465 (BUG-INV-001, `docs/BUG_REGISTRY.md`).
  Sesi 466-468 membangun UI baru di atasnya (Opsi 3 "Aktifkan") — tapi
  **tidak pernah ada migrasi** dari `D.assets`. UI-nya jalan, datanya
  kosong dari nol.
- `investment-planner-api.js` (fitur Investment Planner, s469): baca
  `Aset.investmentPerformance()` — turunan `D.assets`, BUKAN
  `D.investments`. Sistem ke-3 yang perlu diperhitungkan.

## 2 BLOCKER KRITIS (audit sesi ini — wajib selesai SEBELUM entri lama disembunyikan)

### Blocker A — Kekayaan Bersih tidak pernah baca `D.investments`
`Kekayaan.currentNetWorth()`/`renderBersih()` (`modules-calc.js`
~baris 839-840, 930+) = `totalSaldoAkun()+totalAssetValue()+
totalInventoriBisnisValue()+totalPiutangValue()-FI.totalDebt()`.
`totalAssetValue()` → `Aset.totalValue()` (`aset.js:1320`) → jumlah
`D.assets[].nilai` (self-owned) **SAJA**. `Investment.portfolioSummary()`
**tidak pernah** masuk formula manapun terkait Net Worth.

**Implikasi**: kalau entri `D.assets` yang sudah dimigrasi disembunyikan
dari perhitungan `Aset.totalValue()` TANPA `Investment.portfolioSummary
().totalValue` ikut ditambahkan ke `currentNetWorth()`/`renderBersih()`,
Kekayaan Bersih akan **turun diam-diam** sebesar nilai yang dimigrasi.
**Wajib diperbaiki di sesi yang SAMA** dengan sesi yang menyembunyikan
entri lama, tidak boleh dipisah/ditunda.

### Blocker B — Zakat pakai `a.zakatable`, `D.investments` tidak punya field ini
Zakat Maal (`pajak-pbb-zakat.js:118`) & toggle Financial Freedom "Hanya
Zakatable" (`modules-calc.js:8-9`) menyaring `D.assets` lewat
`a.zakatable===true` (bukti di screenshot O: badge hijau "Zakat" di
holding "Majoris"). Skema `Holding` di `investasi.js` **belum punya
field `zakatable`** sama sekali.

**Wajib**: tambah field aditif `h.zakatable` (boolean, default `false`
sama seperti `D.assets` baru) ke skema `Investment` holding, dibawa saat
migrasi, dan zakat/FI-scope diarahkan ikut menjumlah holding investasi
yang `zakatable===true`.

## Perbedaan skema (field mapping untuk migrasi)

| `D.assets` (sumber) | `D.investments` (tujuan) | Catatan |
|---|---|---|
| `a.name` | `h.name` | 1:1 |
| `a.category` (`Kripto`/`Reksadana`/`Saham`/`Deposito/Investasi`/`Emas/Logam Mulia`/`Lainnya`) | `h.type` (`INVESTMENT_TYPES`: `Saham`/`Reksa Dana`/`Obligasi`/`Deposito`/`Kripto`/`Emas`/`Lainnya`) | **Kosakata TIDAK 1:1** — perlu tabel mapping eksplisit (`Reksadana`→`Reksa Dana`, `Deposito/Investasi`→`Deposito`, `Emas/Logam Mulia`→`Emas`, sisanya fallback `Lainnya`) |
| `a.modalInvestasi` ATAU `a.hargaBeli×a.jumlahUnit` | `h.unit`, `h.avgPrice` | Kalau `modalInvestasi` terisi tapi `hargaBeli`/`jumlahUnit` tidak ada (banyak kasus manual) → `unit:1, avgPrice:modalInvestasi` (holding dicatat sebagai 1 lot, bukan per-unit — konsisten dgn cara `investmentPerformance()` treat `modalInvestasi` sbg buku tunggal) |
| `a.nilai` | `h.currentPrice` (dgn `unit` di atas → `nilai/unit`) | Kalau `unit`>1 dari `jumlahUnit` asli, `currentPrice=a.nilai/a.jumlahUnit`; kalau `unit:1` (kasus modalInvestasi-only), `currentPrice=a.nilai` |
| `a.zakatable` | `h.zakatable` (field BARU, lihat Blocker B) | 1:1 |
| `a.owners[]` | `h.owners[]` | Sudah kompatibel (`MultiOwnerEngine` format sama, sejak Sesi 462 AUD-008) — 1:1 langsung |
| `a.tanggal` | tidak ada padanan langsung di `h` | Dipakai `investmentPerformance()` utk CAGR; `Investment.holdingROI()`/`holdingGainLoss()` di `investasi.js` **tidak pakai tanggal sama sekali** (cek ulang formula ROI di sana sebelum eksekusi — kemungkinan `yieldPct`/CAGR versi lama HILANG kalau dipindah ke `Investment.*` apa adanya) |
| `a.notes`/`a.catatan` (kalau ada) | `h.notes` | 1:1 kalau field-nya ada |

**Filter sumber migrasi** — HARUS pakai definisi persis sama seperti
`investmentPerformance()` (`aset.js:1459`), bukan filter kategori baru:
`isAssetOwnershipSelf(a)` **DAN** (`a.modalInvestasi!=null` ATAU
(`a.hargaBeli!=null` DAN `a.jumlahUnit!=null`)) **DAN** buku (modal)
`>0`. Ini penting supaya definisi "aset yang dianggap investasi"
konsisten dgn yang SUDAH dipakai kartu ringkasan Buku Aset sekarang —
tidak sembarang kategori (`Tanah`/`Rumah`/`Kendaraan` TIDAK ikut
walau ada di daftar `ICON`).

## AUDIT ROI/CAGR lama vs baru — SELESAI (dieksekusi sebelum migrasi, lihat hasil)

Dibandingkan langsung dari kode di kedua zip (`aset.js` vs `investasi.js`,
patch s476a) sebelum migrasi dieksekusi ke sesi ini.

### ✅ ROI (total return) — COCOK, aman
- **Lama** (`Aset.investmentPerformance()`, `aset.js:1538`): `roiPct =
  (totalNilai-totalModal)/totalModal*100`, level portofolio (agregat dari
  seluruh `buku`/`nilai` aset tracked). Per-aset juga dihitung `pct =
  (nilai-buku)/buku*100` (dipakai utk `best`/`worst`).
- **Baru** (`Investment.holdingROI()`/`portfolioSummary()`,
  `investasi.js:359-407`): `holdingROI(h) = (holdingValue(h)-
  holdingCost(h))/holdingCost(h)*100` per-holding, `portfolioSummary().
  roiPct = totalGainLoss/totalCost*100` level portofolio — **konstruksi
  formula identik**.
- **Verifikasi numerik pasca-migrasi**: `migrateAssetInvestmentsToHoldings()`
  (`aset.js:144`) menyusun `unit`/`avgPrice`/`currentPrice` sedemikian
  rupa sehingga `holdingCost(h)=unit×avgPrice` selalu **sama persis**
  dengan `buku` lama, dan `holdingValue(h)=unit×currentPrice` selalu
  **sama persis** dengan `nilai` lama (baik jalur `hargaBeli×jumlahUnit`
  maupun jalur `modalInvestasi`-only/unit:1). Jadi ROI per-holding & ROI
  portofolio **tidak berubah angka** setelah migrasi — konsisten dgn
  test wajib "Net Worth SAMA PERSIS" yang sudah ditulis di rencana s476a.

### ❌ CAGR/Yield (%/tahun) — HILANG TOTAL, bukan cuma beda formula
- **Lama** (`aset.js:1554-1565`): `yieldPct` = rata-rata tertimbang
  (bobot=`buku`) dari `((nilai/buku)^(365/hari)-1)*100` per aset, pakai
  `a.tanggal` utk hitung `hari` sejak beli. Ditampilkan ke user di
  dashboard Buku Aset (`assetInvestasiYield`, `renderInvestasi()`
  `aset.js:1586-1589`) sebagai "~X%/tahun (CAGR)".
- **Baru**: **tidak ada** field tanggal/`purchaseDate` sama sekali di
  skema `Holding` (`investasi.js:101-128`, `addHolding()`/
  `updateHolding()`) — dicek lewat `grep -i "cagr|yield|tanggal"` di
  `investasi.js`: 0 hasil terkait. `migrateAssetInvestmentsToHoldings()`
  juga **tidak membawa** `a.tanggal` ke holding baru (lihat payload
  `Investment.addHolding({...})` di `aset.js:156-164` — tidak ada field
  tanggal). Ini sudah diduga di baris tabel mapping "a.tanggal — tidak
  ada padanan langsung di h" di atas, dan audit ini **mengonfirmasi**:
  bukan cuma "formula beda", tapi kemampuan hitung CAGR **hilang total**
  di sisi `Investment.*` — tidak ada data mentah utk dihitung ulang pun.
- **Dampak UI konkret**: tab "💹 Investasi" yang sudah dibangun Sesi
  466-468 (`investasi-list-view.js` `_renderSummary()`, baris ~47-66)
  **hanya menampilkan** `totalValue`/`totalCost`/`totalGainLoss`/
  `roiPct`/`totalDividend`/`totalRealizedGain` — **tidak ada baris
  Yield/CAGR sama sekali**. Begitu Buku Aset lama disembunyikan (poin 5,
  s476a) dan user diarahkan ke tab Investasi, baris "~X%/tahun (CAGR)"
  yang **sekarang sudah bisa dilihat user** akan **hilang dari UI** —
  ini regresi fitur yang terlihat user, bukan cuma soal Investment
  Planner.
- **Investment Planner TIDAK terdampak** (ralat asumsi awal risiko #1):
  dicek `investment-planner-api.js` — `_portfolio()` hanya mengekspos
  `holdingsCount/totalValue/totalCost/totalGainLoss/roiPct` (+ dividend/
  realizedGain yg selalu 0), **`yieldPct` tidak pernah dibaca/diekspos**
  ke `portfolioOverview()`/`investmentRecommendation()`. Jadi migrasi
  Investment Planner (s476b) sendiri **aman** dari sisi CAGR — CAGR
  tidak pernah jadi bagian kontrak data planner.
- **Yang benar-benar butuh keputusan**: dashboard Buku Aset (`Aset.
  renderInvestasi()`) vs tab Investasi (`InvestmentListUI._renderSummary
  ()`) — user KEHILANGAN baris CAGR begitu poin 5 (sembunyikan entri
  lama) jalan, KECUALI ditambahkan sebelum/bersamaan.

### Rekomendasi (revisi rencana eksekusi)
Ada 2 opsi, pilih salah satu SEBELUM poin 5 (hide Buku Aset lama) di-deploy:
- **Opsi A (disarankan)** — tambah field aditif `h.purchaseDate`
  (opsional, default null) ke skema `Holding`, bawa `a.tanggal` saat
  migrasi (field baru di tabel mapping), lalu tambah
  `Investment.holdingYieldPct(h)`/`portfolioSummary().yieldPct`
  (replikasi formula CAGR tertimbang persis dari `aset.js:1554-1565`,
  0 rumus baru — cuma pindah), + 1 baris UI di
  `InvestmentListUI._renderSummary()` setara `assetInvestasiYield`. Bisa
  masuk 1 sesi dengan s476a (field aditif, tidak mengubah Blocker A/B)
  atau sesi terpisah kecil (s476a2) SEBELUM poin 5 hide dijalankan.
- **Opsi B** — terima kehilangan CAGR di tab Investasi buat sementara,
  tapi WAJIB kasih tahu user secara eksplisit (mis. baris "Yield/CAGR
  belum tersedia di tampilan baru, sedang dikerjakan") supaya bukan
  silent regression. Lebih cepat, tapi mengorbankan paritas fitur yang
  sudah dilihat user hari ini.

**Keputusan: Opsi A — DIEKSEKUSI di sesi s476a2 (lihat
`s476a2-SESSION-NOTE.md`).** `h.purchaseDate` ditambahkan ke skema
`Holding`, dibawa saat migrasi dari `a.tanggal`, `Investment.
holdingYieldPct()`/`portfolioSummary().yieldPct` mereplikasi PERSIS
formula lama (diverifikasi numerik lewat test, toleransi 1e-9), dan tab
"💹 Investasi" sekarang menampilkan baris Yield/CAGR (`investSummaryYield`)
setara dashboard Buku Aset lama. 4 test baru (`tests/s476a2-cagr-
yield.test.js`) + 57 test s476a lama, semua lolos (3062/3062 total, 0
regresi). Rilis: `kw_release_v1200_s476a2-cagr-yield.zip`.

## Risiko tambahan yang perlu diverifikasi saat eksekusi
1. ~~`investmentPerformance()` (ROI/CAGR versi lama)` vs
   `Investment.holdingROI()`/`holdingGainLoss()` (versi baru) —
   formulanya HARUS dibandingkan hasil angkanya sebelum Investment
   Planner dialihkan (s476c)~~ **SELESAI DIAUDIT — lihat bagian "AUDIT
   ROI/CAGR lama vs baru" di atas.** ROI cocok & aman; CAGR/Yield hilang
   total di sisi `Investment.*` dan butuh keputusan Opsi A/B di atas
   sebelum poin 5 (hide Buku Aset lama) dijalankan — bukan lagi soal
   Investment Planner (s476b) yang ternyata tidak pernah membaca
   `yieldPct`.
2. **`dana-kelolaan.js`** & **`invest-ai-widget.js`**/
   **`self-reward-ai-widget.js`** SUDAH baca `Investment.getHoldings()`
   (dari fix BUG-INV-001 Fase 4/Sesi 468) — begitu holding nyata masuk
   lewat migrasi, cabang2 ini otomatis mulai aktif (bukan lagi dead-read
   selalu-kosong). **Perlu smoke-test** hasilnya masuk akal (mis. dana
   kelolaan tidak dobel-hitung item yang sama dari `D.assets` DAN
   `D.investments` kalau s476d/hide belum jalan di sesi yang sama).
3. **Duplikasi tampilan sementara**: antara migrasi (s476a) selesai dan
   penyembunyian `D.assets` lama (harus di sesi sama dgn Blocker A/B
   fix, lihat urutan sesi di bawah) — ADA JENDELA di mana holding yang
   sama tampil 2x (di Buku Aset lama & tab Investasi baru) kalau
   sesi dipecah longgar. **Rekomendasi: gabung migrasi + hide + fix
   Blocker A/B jadi 1 sesi** (bukan dipisah lintas beberapa sesi
   seperti draft awal saya sebelumnya), supaya tidak ada window
   inkonsisten yang ke-deploy ke user.

## Rencana sesi (revisi — digabung demi konsistensi data, bukan dipecah longgar)

### s476a — Migrasi + Blocker A + Blocker B + hide, SEMUA DALAM 1 SESI
Alasan digabung (beda dari draft s476a-d sebelumnya): memisah migrasi
dari fix Net Worth/Zakat menciptakan jendela waktu Kekayaan Bersih
salah — tidak bisa diterima utk data uang. 1 zip patch, scope:
1. Tabel mapping kategori (`INVESTMENT_TYPES`) — fungsi murni,
   dites terpisah tanpa DOM.
2. `migrateAssetInvestmentsToHoldings()` — baca `D.assets` (filter
   sama `investmentPerformance()`), tulis via `Investment.addHolding()`
   (reuse, 0 validasi baru) + `owners[]`/`zakatable` dibawa. **Idempotent**
   (tandai `a._migratedToInvestmentId` di aset asal supaya tidak
   dobel-migrasi kalau fungsi ke-trigger 2x — additive, tidak menghapus
   `a` itu sendiri, cuma flag).
3. Tambah field `h.zakatable` ke skema `Investment` (`investasi.js`) +
   wiring `pajak-pbb-zakat.js`/`modules-calc.js` FI-scope supaya ikut
   menjumlah holding `zakatable===true`.
4. `Aset.totalValue()`/`currentNetWorth()` ikut menambahkan
   `Investment.portfolioSummary().totalValue` (hati-hati: JANGAN
   dobel-hitung — begitu `a._migratedToInvestmentId` di-set, aset itu
   HARUS dikecualikan dari `Aset.totalValue()` di render Buku Aset
   biasa, supaya total gabungan Net Worth = 1x hitung, bukan 2x).
5. Buku Aset: entri yang sudah `_migratedToInvestmentId` disembunyikan
   dari list biasa (tapi tetap ada di `D.assets`, bukan dihapus —
   reversible), diganti 1 baris ringkasan "💹 Investasi kamu sekarang
   dikelola di tab Investasi" dgn tombol pintas ke sana.
- Test wajib: Net Worth SAMA PERSIS sebelum & sesudah migrasi (regression
  eksplisit, fixture data screenshot O — BTC/ETH/Majoris/dst); Zakat
  Maal sama persis; `dana-kelolaan.js`/`invest-ai-widget.js` tidak
  dobel-hitung; idempotency (migrasi dijalankan 2x tidak duplikat).
- **Zip output**: `kw_patch_migrate-investasi-to-holdings-s476a.zip`

### s476a2 (baru, direkomendasikan SEBELUM poin 5 hide, lihat Audit ROI/CAGR) — CAGR/Yield di Investment
Kalau Opsi A dipilih: tambah `h.purchaseDate` (aditif) + bawa
`a.tanggal` saat migrasi + `portfolioSummary().yieldPct`
(replikasi persis formula lama) + 1 baris UI di
`InvestmentListUI._renderSummary()`. Scope kecil, bisa digabung ke
s476a atau jadi sesi mini terpisah — yang penting SEBELUM Buku Aset
lama disembunyikan dari user, supaya tidak ada window user kehilangan
info CAGR yang sudah pernah mereka lihat.

### s476b (opsional, sesi terpisah — TIDAK mendesak) — Investment Planner
**STATUS: SELESAI (lihat `s476b-SESSION-NOTE.md`).** Alihkan
`investment-planner-api.js` dari `Aset.investmentPerformance()` ke
`Investment.*`. **Update pasca-audit**: ROI/CAGR sudah dibandingkan
(lihat bagian "AUDIT ROI/CAGR lama vs baru") — ROI portofolio & per-
holding TERBUKTI identik secara formula & numerik pasca-migrasi, dan
Investment Planner ternyata **tidak pernah membaca `yieldPct`** sama
sekali (hanya `holdingsCount/totalValue/totalCost/totalGainLoss/
roiPct`), jadi CAGR bukan blocker buat s476b. Tetap aman ditunda
terpisah — Investment Planner bukan angka uang riil (proyeksi), beda
kelas risiko dari Net Worth/Zakat — tapi risiko utamanya sekarang murni
administratif (ganti sumber data), bukan lagi risiko ROI berubah diam-
diam.

**Dieksekusi**: `_portfolio()`/`_allocation()`/`watchlistAlerts()`
direwire ke `Investment.portfolioSummary()`/`Investment.
assetAllocation()`/`Investment.watchlistAlerts()` (0 rumus baru, pola
guard sama persis `AssetPortfolioAPI._investment()` yang sudah lebih
dulu baca `Investment.*`). Watchlist Alerts sekarang benar2 fungsional
(sebelumnya selalu `count:0` krn Buku Aset tidak punya konsep
watchlist). Bentuk output `summary()` TIDAK berubah — presenter 0
perubahan logic. Test `tests/investment-planner-gap-fix.test.js` &
bagian cascade `tests/investment-ownership-sync-s261.test.js` ditulis
ulang mengikuti sumber data baru (jumlah test tetap sama, 0 regresi).
`npm test` — 3062/3062 pass. Rilis:
`kw_release_v1201_s476b-investment-planner-rewire.zip`.

## Definition of Done
- [x] ROI/CAGR lama vs baru diaudit & dibandingkan (lihat "AUDIT ROI/CAGR
      lama vs baru") — ROI cocok; keputusan Opsi A/B utk CAGR/Yield
      diisi SEBELUM poin "Buku Aset tidak lagi menampilkan..." di bawah
      dieksekusi
- [ ] Semua holding investasi tracked (`modalInvestasi`/`hargaBeli×jumlahUnit`
      terisi, self-owned) di `D.assets` termigrasi ke `D.investments`
- [ ] Net Worth (`currentNetWorth()`/`renderBersih()`) identik sebelum
      & sesudah migrasi (regression test eksplisit)
- [ ] Zakat Maal identik sebelum & sesudah migrasi (termasuk item yang
      sebelumnya `zakatable:true`, mis. "Majoris")
- [ ] 0 dobel-hitung (baik di Net Worth maupun `dana-kelolaan.js`/AI widget)
- [ ] Migrasi idempotent (aman dijalankan ulang)
- [ ] Buku Aset tidak lagi menampilkan entri yang sudah termigrasi
      sebagai baris editable biasa (redirect ke tab Investasi)
- [ ] `npm test` — 0 regresi baru vs baseline v1196 s474
