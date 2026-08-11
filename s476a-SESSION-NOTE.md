# Sesi s476a — Migrasi Investasi: D.assets → D.investments (SSOT baru)

Ref: `docs/s476-PLAN-migrate-investasi-to-holdings.md`.
Baseline: `kw_release_v1196_s474-virtual-bill-item-final.zip`.
Versi baru: **v1199 (s476a-migrate-investasi-to-holdings)**.

## Ringkasan
Migrasi entri investasi lama di Buku Aset (`D.assets`) ke Holding
(`D.investments`, sebelumnya kosong permanen sejak Sesi 161 — BUG-INV-001)
via `migrateAssetInvestmentsToHoldings()`, digabung dalam 1 sesi dengan 2
blocker kritis (Net Worth & Zakat) sesuai rencana — TIDAK dipecah, supaya
tidak ada jendela waktu Kekayaan Bersih salah.

## Perubahan
1. **`modules/asset/investasi.js`**
   - `h.zakatable` (field baru, aditif, default `false`) di `addHolding()`/`updateHolding()`.
   - `Investment.zakatableValue()` — total holding SELF yang `zakatable`, diskalakan `MultiOwnerEngine.selfOwnedValue()`.
   - `Investment.selfOwnedTotalValue()` — total SEMUA holding SELF, diskalakan sama.
2. **`modules/asset/aset.js`**
   - `mapAssetJenisToInvestmentType()` — tabel padanan kategori (`Reksadana`→`Reksa Dana`, dst, fallback `Lainnya`).
   - `migrateAssetInvestmentsToHoldings()` — migrasi idempotent (flag `a._migratedToInvestmentId`, aditif, aset asal TIDAK dihapus), filter sumber SAMA PERSIS `Aset.investmentPerformance()`. Dipanggil di awal `Aset.renderList()`.
   - `Aset.totalValue()` — exclude aset yang sudah `_migratedToInvestmentId` (TIDAK menambahkan nilai holding di titik ini — lihat alasan pemisahan di bawah).
   - `Aset.renderList()` — entri termigrasi disembunyikan dari list biasa, diganti 1 baris ringkasan + tombol ke tab Investasi (`dashHubNavigateToFeature`).
3. **`modules/shared/modules-calc.js`** (Blocker A)
   - `Kekayaan.currentNetWorth()` & `Kekayaan.renderBersih()` — TAMBAH `Investment.selfOwnedTotalValue()`. Sengaja **bukan** di dalam `Aset.totalValue()` sendiri — `totalAssetValue()` juga dipakai `AssetPortfolioAPI.portfolioComposition()` sebagai `assetValue`, yang SUDAH menjumlah `investmentValue` (`Investment.portfolioSummary().totalValue`) terpisah; kalau ditambah di `Aset.totalValue()` juga, jadi dobel-hitung di kartu Portfolio.
   - `FI.investmentAssetValue()` (scope `'zakatable'`) — exclude aset termigrasi + tambah `Investment.zakatableValue()`.
4. **`modules/finance/pajak-pbb-zakat.js`** (Blocker B)
   - `Zakat.hitungMaal()` — `asetZakatable` exclude aset termigrasi + tambah `Investment.zakatableValue()`.

## Keputusan desain penting
- **Titik gabung Net Worth SENGAJA di `modules-calc.js`, bukan di `Aset.totalValue()`** — supaya tidak dobel-hitung dengan `AssetPortfolioAPI` yang sudah menjumlah aset & investasi terpisah. Konsekuensi: `Aset.totalValue()` sendiri (dipakai jg oleh Dashboard Aset "Nilai Pasar") sekarang HANYA aset non-investasi (turun sebesar nilai yang dimigrasi) — investasi sudah punya total sendiri di tab Investasi.
- **Investment Planner (`investment-planner-api.js`) & `Aset.investmentPerformance()` TIDAK disentuh** (tetap baca `D.assets` mentah) — sesuai rencana, dipisah ke s476b (opsional) karena butuh perbandingan formula ROI/CAGR lama vs baru dulu.

## Known limitation (didokumentasikan, bukan bug baru)
`AssetPortfolioAPI.portfolioComposition()` menjumlah `investmentValue` dari
`Investment.portfolioSummary().totalValue`, yang **TIDAK** diskalakan porsi
multi-owner (beda dari `Aset.totalValue()`/`selfOwnedTotalValue()` yang
sudah). Ini gap yang SUDAH ADA sebelum sesi ini (kode-nya sudah ada sejak
Sesi 193, cuma tidak pernah kena data nyata krn `D.investments` selalu
kosong — BUG-INV-001). Untuk holding hasil migrasi yang multi-owner (mis.
Majoris 70/30), kartu **Portfolio** (bukan Kekayaan Bersih/Zakat — itu sudah
benar & dites) bisa sedikit overstate porsi non-SELF. Net Worth &
Zakat Maal (SSOT sebenarnya) SUDAH benar & dites regresi (lihat test E2E).
Perbaikan `portfolioSummary()`/`assetAllocation()` scaling di luar scope
sesi ini (butuh sesi terpisah, banyak konsumen: `dana-kelolaan.js`,
`invest-ai-widget.js`, `self-reward-ai-widget.js`, `AssetPortfolioAPI`).

## Test
- File baru: `tests/s476a-migrate-investasi-to-holdings.test.js` (7 test) —
  migrasi, idempotency, owners/zakatable carry-over, Blocker A/B parity,
  dan 1 test E2E lewat `Kekayaan.currentNetWorth()` asli (bukan cuma
  rumus tiruan di test).
- 3 test lama disesuaikan (perubahan perilaku YANG DISENGAJA sesuai
  Blocker A, bukan regresi tersembunyi):
  - `tests/dana-kelolaan.test.js` — komentar diperjelas (nilai tetap sama, `Aset.totalValue()` tidak berubah).
  - `tests/ownership-sync-portfolio-networth.test.js` — 2 assert `currentNetWorth()`/`netWorthSnapshot().netWorth` naik dari 1500000→1620000 (holding SELF h1=120000 sekarang ikut, sesuai spesifikasi Blocker A).
- `npm test`: **3058/3058 pass, 0 gagal** (baseline v1196 + sesi ini).

## Definition of Done (dari rencana sesi)
- [x] Semua holding investasi tracked termigrasi
- [x] Net Worth identik sebelum & sesudah (test E2E)
- [x] Zakat Maal identik sebelum & sesudah (test)
- [x] 0 dobel-hitung Net Worth (test) — Portfolio widget: lihat known limitation di atas
- [x] Migrasi idempotent (test)
- [x] Buku Aset tidak lagi menampilkan entri termigrasi sbg baris editable biasa
- [x] `npm test` — 0 regresi baru vs baseline v1196 s474
