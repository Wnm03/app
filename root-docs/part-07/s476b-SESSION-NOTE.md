# Sesi s476b — Investment Planner: rewire dari `Aset.investmentPerformance()` ke `Investment.*`

Ref: `docs/s476-PLAN-migrate-investasi-to-holdings.md`, bagian "s476b
(opsional, sesi terpisah — TIDAK mendesak) — Investment Planner".
Baseline: `kw_release_v1200_s476a2-cagr-yield.zip`.
Versi baru: **v1201 (s476b-investment-planner-rewire)**.

## Latar belakang

`investment-planner-api.js` sejak Sesi 161 sengaja DIREWIRE dari
`Investment.*`/`D.investments` ke `Aset.investmentPerformance()`/
`D.assets`, karena waktu itu `Investment.addHolding()` tidak pernah
dipanggil dari UI mana pun — `D.investments` selalu kosong permanen
(BUG-INV-001). Alasan itu SUDAH TIDAK BERLAKU sejak s476a:
- `D.investments` sekarang jadi SSOT (migrasi 1x-jalan dari `D.assets`
  via `migrateAssetInvestmentsToHoldings()`).
- Tab "💹 Investasi" (`InvestmentListUI`, Sesi 466-468) adalah UI penulis
  data yang nyata — user bisa tambah/edit holding langsung ke
  `D.investments` TANPA lewat Buku Aset sama sekali.

Selama `investment-planner-api.js` masih baca
`Aset.investmentPerformance()`, ada 2 masalah:
1. **Data makin menyimpang** — `Aset.investmentPerformance()` membaca
   `D.assets` MENTAH, TIDAK mengecualikan aset yang sudah
   `_migratedToInvestmentId` (beda dari `Aset.totalValue()` yang sudah
   dikecualikan sejak s476a Blocker A). Investment Planner terus membaca
   salinan data lama, bukan `D.investments` (SSOT sekarang).
2. **Holding baru tidak pernah muncul** — holding yang ditambah murni
   lewat tab Investasi (`Investment.addHolding()` langsung, tanpa lewat
   Buku Aset) TIDAK PERNAH kelihatan di Investment Planner sama sekali.

Audit ROI/CAGR (s476a2) sudah mengonfirmasi `Investment Planner TIDAK
pernah membaca `yieldPct`, jadi sesi ini bukan soal CAGR — murni ganti
sumber baca portfolio/allocation/watchlist.

## Perubahan

1. **`modules/finance/investment-planner-api.js`**
   - `_portfolio()` — sekarang baca `Investment.portfolioSummary()`
     (bukan `Aset.investmentPerformance()`). Field
     `holdingsCount/totalValue/totalCost/totalGainLoss/roiPct/
     totalDividend/totalRealizedGain` dipetakan APA ADANYA (0
     recompute) — bentuk output TIDAK berubah, jadi presenter tidak
     perlu disentuh. `yieldPct` (s476a2) ikut diteruskan sbg bonus
     field (belum dikonsumsi presenter/recommendation).
   - `_allocation()` — sekarang pass-through langsung ke
     `Investment.assetAllocation()` (sudah punya bentuk
     `{type,value,pct}` terurut, 0 grouping manual lagi — beda dari
     versi Sesi 161 yang harus grouping manual dari `tracked`).
   - `watchlistAlerts()` — sekarang benar2 meneruskan
     `Investment.watchlistAlerts()`/`getWatchlist()` (fitur watchlist
     `D.investmentWatchlist` sudah ada & sudah ada UI-nya sejak Sesi
     467, `InvestmentWatchUI`) — BUKAN lagi selalu
     `{ok:true,alerts:[],count:0}` seperti versi Sesi 161 (itu cuma
     benar selama sumbernya Buku Aset yang memang tidak punya konsep
     watchlist).
   - `investmentRecommendation()` — pesan `invest_no_holdings` diarahkan
     ke tab "💹 Investasi" (bukan lagi "isi Modal Investasi di 📋 Buku
     Aset").
   - Guard berlapis (`typeof Investment==='undefined'` dst) pola SAMA
     PERSIS `AssetPortfolioAPI._investment()`
     (modules/asset/asset-portfolio-api.js, S101 — sudah lebih dulu
     baca `Investment.*` dgn pola sama) — 0 pola guard baru.
   - `summary()` — TIDAK diubah (bentuk output sama, cuma isi field di
     dalamnya yang sumbernya beda sekarang).
2. **`modules/finance/investment-planner-presenter.js`** — 0 perubahan
   behavior, cuma update komentar `INVESTPLANNER_NAV_TARGETS.investasiTab`
   supaya tidak lagi bilang "2 fitur beda sumber data" (sekarang sama).
3. **`tests/investment-planner-gap-fix.test.js`** — ditulis ulang
   mengikuti rewire: bangun `Investment` (via `investasi.js`) + panggil
   `Investment.addHolding()`/`addWatch()` langsung, BUKAN lagi
   `D.assets`. `Aset` SENGAJA tidak di-inject di test portfolioOverview()
   (membuktikan API tidak lagi bergantung `Aset`). 7 test (sama jumlah
   dgn versi lama, 1 diganti isinya jadi test watchlist count:0 kosong).
4. **`tests/investment-ownership-sync-s261.test.js`** — bagian "(2)
   InvestmentPlannerAPI cascade" (2 test) ditulis ulang pakai
   `D.investments` (holding) + `Investment.*`, BUKAN lagi `D.assets` +
   `Aset.*`. Bagian "(1)" (`Aset.investmentPerformance()` sendiri) &
   "(3)" (`InvestAI`) TIDAK diubah — masih relevan & tidak terdampak
   rewire ini (fungsi `Aset.investmentPerformance()` itu sendiri masih
   dipakai kartu "Performa Investasi" di dashboard Buku Aset lama, & tes
   `InvestAI` sudah baca `Investment` langsung sejak sebelum sesi ini).
   10 test total, tetap sama.
5. Bundle (`app-bundle-a.min.js`/`app-bundle-b.min.js`) diregenerasi via
   `node scripts/build.js s476b-investment-planner-rewire` (esbuild
   tidak tersedia di sandbox ini — bundle TANPA minifikasi, tapi 100%
   valid & konsisten dgn source, sama seperti s476a/s476a2). Build
   `?v=1201`.

## Yang TIDAK diubah (sengaja)
- `Aset.investmentPerformance()` (`aset.js`) — TIDAK dihapus/diubah,
  masih dipakai kartu "Performa Investasi" di dashboard Buku Aset lama
  (`renderInvestasi()`).
- `AssetPortfolioAPI` (`asset-portfolio-api.js`) — sudah lebih dulu baca
  `Investment.*` sejak S101, tidak terdampak.
- Bentuk output `InvestmentPlannerAPI.summary()` — sama persis, jadi
  `InvestmentPlannerPresenter` 0 perubahan logic (cuma komentar).

## Test
`node --test tests/*.test.js` — **3062/3062 pass, 0 regresi** vs
baseline v1200 (dijalankan 2x: sebelum & sesudah build, jumlah test
TIDAK berubah — file test yang diubah tetap 7+10 test seperti
sebelumnya, isinya saja yang diganti mengikuti sumber data baru).

## Release Gate
`node scripts/verify-release-ready.js` — 2 override dipakai (dicatat di
`docs/RELEASE-GATE-LOG.md`, versi `s476b-investment-planner-rewire`):
- **lint-unavailable**: eslint tidak terpasang di sandbox (tidak ada
  akses npm/network) — pola sama sesi-sesi sebelumnya.
- **unminified-bundle**: esbuild tidak tersedia di sandbox — pola sama
  s476a/s476a2.
- **html-sync**: LOLOS langsung (tidak perlu override).

## Definition of Done
- [x] `investment-planner-api.js` dibaca ulang dari `Investment.*`
      (SSOT), bukan lagi `Aset.investmentPerformance()`
- [x] Bentuk output `summary()`/presenter TIDAK berubah (0 regresi UI)
- [x] Watchlist Alerts sekarang benar2 mengecek `D.investmentWatchlist`
      (bukan lagi selalu kosong)
- [x] Test diupdate mengikuti sumber data baru, 0 regresi jumlah/hasil
- [x] `npm test` — 3062/3062, 0 regresi
- [x] Release Gate lolos (2 override tercatat, alasan valid & konsisten
      dgn sesi-sesi sebelumnya)
