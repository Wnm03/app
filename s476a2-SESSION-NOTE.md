# Sesi s476a2 — CAGR/Yield: bawa a.tanggal + replikasi formula lama ke Investment.*

Ref: `docs/s476-PLAN-migrate-investasi-to-holdings.md`, bagian
"AUDIT ROI/CAGR lama vs baru".
Baseline: `kw_release_v1199_s476a-migrate-investasi-to-holdings.zip`.
Versi baru: **v1200 (s476a2-cagr-yield)**.

## Latar belakang (hasil audit)
Audit ROI/CAGR lama (`Aset.investmentPerformance()`, aset.js) vs baru
(`Investment.*`, investasi.js) sebelum eksekusi migrasi menemukan:
- **ROI (total return)**: formula identik & angka pasca-migrasi TERBUKTI
  sama persis (`holdingValue()`/`holdingCost()` mereproduksi `nilai`/`buku`
  lama tepat). Tidak perlu perubahan.
- **CAGR/Yield (%/tahun)**: **hilang total** di sisi `Investment.*` —
  skema `Holding` tidak pernah punya field tanggal, dan
  `migrateAssetInvestmentsToHoldings()` tidak membawa `a.tanggal`. Tab
  "💹 Investasi" (`investasi-list-view.js`) juga tidak pernah menampilkan
  baris Yield/CAGR, padahal dashboard Buku Aset lama menampilkannya
  (`assetInvestasiYield`). Investment Planner (`investment-planner-api.js`)
  dikonfirmasi TIDAK terdampak (tidak pernah membaca `yieldPct`).

Keputusan: **Opsi A** — tambah CAGR/Yield ke `Investment.*` SEBELUM Buku
Aset lama disembunyikan dari user, supaya tidak ada regresi fitur yang
terlihat.

## Perubahan
1. **`modules/asset/investasi.js`**
   - `h.purchaseDate` (field baru, aditif, opsional, default `null`) di
     `addHolding()`/`updateHolding()`.
   - `Investment.holdingYieldPct(h)` — CAGR per-holding, REPLIKASI PERSIS
     formula lama `((nilai/buku)^(365/hari)-1)*100`, sumber nilai/buku dari
     `holdingValue()`/`holdingCost()` (sudah ada), sumber tanggal dari
     `h.purchaseDate`. `null` kalau `purchaseDate` kosong / cost≤0 /
     durasi <1 hari / hasil non-finite (guard sama persis versi lama).
   - `Investment.portfolioSummary().yieldPct` — rata-rata tertimbang
     (bobot=`holdingCost`) dari `holdingYieldPct()` tiap holding SELF,
     pola agregasi SAMA PERSIS `cagrSum`/`cagrWeight` versi lama.
2. **`modules/asset/aset.js`**
   - `migrateAssetInvestmentsToHoldings()` — sekarang mengirim
     `purchaseDate: a.tanggal||null` ke `Investment.addHolding()`.
3. **`modules/asset/investasi-list-view.js`**
   - `openModal()`/`save()` — baca/tulis field baru `investPurchaseDate`.
   - `_renderSummary()` — tampilkan `investSummaryYield` (setara
     `assetInvestasiYield` lama), guard aman kalau elemen belum ada di DOM.
4. **`modules/shared/modals.js`** — tambah input
   `<input type="date" id="investPurchaseDate">` (Tanggal Perolehan,
   opsional) di `investmentModal`.
5. **`index.html` / `app_production.html`** — tambah
   `<div id="investSummaryYield">` di kartu ringkasan tab "💹 Investasi".
6. **`tests/s476a2-cagr-yield.test.js`** (baru) — 4 test: purchaseDate
   dibawa migrasi, `holdingYieldPct()` null kalau kosong, replikasi CAGR
   PERSIS sama dgn formula lama (dites numerik langsung, toleransi 1e-9),
   `portfolioSummary().yieldPct` rata-rata tertimbang & null-safe.
7. Bundle (`app-bundle-a.min.js`/`app-bundle-b.min.js`) di-regenerasi via
   `node scripts/build.js` (esbuild tidak tersedia di environment build
   ini — bundle TANPA minifikasi, tapi 100% valid & konsisten dgn source;
   jalankan `npm install --save-dev esbuild` lalu build ulang kalau mau
   ukuran seminim versi sebelumnya).

## Test
`npm test` — **3062/3062 pass, 0 regresi** vs baseline v1199 (termasuk 57
test s476a migrasi/Blocker A/Blocker B yang tidak diubah sama sekali, +4
test baru s476a2).

## Definition of Done (checklist audit, lihat plan doc)
- [x] ROI/CAGR lama vs baru diaudit & dibandingkan
- [x] Keputusan Opsi A/B diisi & dieksekusi (Opsi A)
- [x] CAGR/Yield holding hasil migrasi bisa dihitung lagi (tidak silent-drop)
- [x] Tab Investasi menampilkan Yield/CAGR (paritas dgn dashboard Buku Aset lama)
- [x] `npm test` — 0 regresi baru
