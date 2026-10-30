# Patch Akumulasi Penuh — Sesi KasirAcc + txShopSaleItem + Sync Piutang/Utang→Arus Kas (sudah di-build)

Gabungan 3 sesi patch berurutan di atas `app-main__28_.zip` (base), SUDAH lewat
`node scripts/build.js` — bundle & HTML tidak lagi stale.

## Urutan sesi yang digabung
1. `PATCH-sesi-KasirAcc-akun-baru-dropdown.zip` (08:56)
2. `PATCH-sesi-txShopSaleItem-produk-baru.zip` (09:41)
3. `PATCH-sesi-sync-piutang-utang-arus-kas.zip` (10:49) — sesi ini:
   SCHEMA_VERSION 9→10 + migrasi `toVersion:10` (backfill kategori baku
   "Piutang"/"Utang" utk user lama), toggle sinkron piutang/utang↔arus kas
   di `piutangModal`/`debtModal`, helper baru di `piutang-utang.js`
   (lihat `PATCH-INFO-sesi-sync-piutang-utang-arus-kas.md` utk detail lengkap).

## Test & build sesi ini
- `node --check` per file (source only, sebelum build): PASS —
  `data-default.js`, `features-helpers-global-security.js`, `modals.js`,
  `piutang-utang.js`.
- `node --test tests/*.test.js`: **4873/4873 pass** (baseline gabungan
  tetap utuh, tidak ada regresi).
- `node scripts/build.js`: **sukses**, versi baru `s682-cashflow-siklus-legacy-card`
  / build #1441. esbuild tidak terpasang (tanpa akses jaringan) → bundle
  ditulis TANPA minifikasi (ukuran lebih besar dari build produksi
  sebelumnya, tapi 100% valid, `node --check` bundle juga lolos).
- Peringatan build (non-blocking, tidak menghentikan build):
  - `docs/AUDIT_MATRIX.md` sedikit usang (selisih 1 file/markdown) — belum
    diupdate di patch ini.
  - 3 file source sudah lewat ambang 1600 baris (`scripts/build.js`,
    `modules/modules-render.js`, `modules/shop/modules-render.js`) — sudah
    lama, bukan regresi sesi ini.

## File yang berubah (22 file, source + bundle — hasil diff penuh base vs repo)
- `modules/shared/data-default.js`
- `modules/shared/features-helpers-global-security.js` (SCHEMA_VERSION 10 + versi build)
- `modules/shared/modals.js`
- `modules/finance/piutang-utang.js`
- `modules/shared/modules-render.js` (versi build ikut naik, isi lain dari sesi KasirAcc)
- `modules/shared/modules-calc.js` (versi build)
- `chat-action-handlers.js` (versi build)
- `modules/business/kasir.js` (sesi KasirAcc)
- `modules/finance/akun.js` (sesi KasirAcc)
- `budget.js` (sesi txShopSaleItem)
- `modules/finance/tagihan-kalender.js` (sesi txShopSaleItem)
- `modules/dashboard-hub/dashboard-hub.js` (sesi txShopSaleItem)
- `modules/shop/cobek-tx-cart.js` (sesi txShopSaleItem)
- `modules/shop/cobek-etalase.js` (sesi txShopSaleItem)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (regenerated, build #1441)
- `app_production.html`, `index.html` (?v=1441)
- `sw.js` (CACHE_NAME kw-cache-v1441)
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` (auto-generated ulang oleh build.js)
- `docs/CLAUDE.md`, `docs/RELEASE-GATE-LOG.md` (auto-update versi oleh build.js)

## Belum dikerjakan
- Test file baru khusus fitur sync piutang/utang→arus kas belum dibuat.
- CHANGELOG belum ditambah entri baru.
- §6.2 (exclude kategori Piutang/Utang dari rata-rata income/expense) masih terbuka.
- `docs/AUDIT_MATRIX.md` "Coverage Baseline" belum disinkronkan (peringatan build).

**Cara pakai:** upload SEMUA file di atas (bukan cuma HTML/sw.js) ke hosting —
source & bundle sudah konsisten di versi build #1441.
