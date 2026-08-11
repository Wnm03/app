# RENCANA SESI — Versi Ringkas (Smart Delivery Engine)

Ini versi padat dari `RENCANA-SESI-SMART-DELIVERY-ENGINE.md`. Intinya sama
(AI decision layer + logistics layer + fungsi prediktif per domain + event
wiring, semua additive), tapi jumlah file & sesi dipangkas supaya lebih
gampang dieksekusi manual lewat Claude gratis.

## Kenapa dipangkas

Blueprint asli minta 13 file di `modules/ai/` + 9 file di
`modules/logistics/` = 22 file kosong yang isinya cuma "wiring" (bus, store,
context, rule engine, learning engine, simulation, prompt, dst — masing-masing
dipisah file sendiri, niru struktur `economic-intelligence/` yang memang
dirancang untuk tim besar & fase berbulan-bulan).

Untuk 1 orang yang jalan lewat sesi chat terbatas, itu bikin 2 masalah:
- Tiap sesi habis buat bikin file kosong + daftarin ke `build.js`, belum
  sampai ke logic yang beneran dipakai.
- Makin banyak file = makin gampang ada 1 yang lupa didaftarkan di
  `build.js` → app error saat load.

Jadi: **isi yang sama, dikelompokkan jadi lebih sedikit file per domain**,
bukan 1 file per konsep kecil.

## Struktur file baru (dipadatkan)

| Sebelum (blueprint) | Sesudah (ringkas) |
|---|---|
| `ai-core.js, ai-context.js, ai-storage.js, ai-event-engine.js` | `modules/ai/ai-core.js` (bus + storage + context jadi 1 file) |
| `ai-decision-engine.js, ai-rule-engine.js, ai-recommendation-engine.js, ai-learning-engine.js` | `modules/ai/ai-decision-engine.js` (4 konsep jadi 1 file, dipisah jadi namespace internal: `AIDecision.rules`, `.recommend`, `.learn`) |
| `ai-daily-briefing.js, ai-health-check.js, ai-simulation.js, ai-prompt.js, ai-service.js` | `modules/ai/ai-service.js` (facade tunggal: `AIService.dailyBriefing()`, `.healthCheck()`, `.simulate()`, `.buildPrompt()`) |
| `logistics-storage.js, logistics-route.js, logistics-load.js, logistics-fuel.js, logistics-pricing.js, logistics-engine.js` | `modules/logistics/logistics-engine.js` (baca dari `OngkirCalc`/`PriceReko` yang sudah ada, bukan duplikat) |
| `logistics-service.js, logistics-ui.js, logistics-modal.js` | `modules/logistics/logistics-service.js` (pakai `modules/shared/modals.js` yang sudah ada utk UI, tidak bikin modal baru) |

Total jadi **5 file baru**, bukan 22. Isinya tetap semua fungsi/kelas yang
diminta blueprint, cuma dikumpulkan per-lapisan, bukan per-konsep.

## 6 Sesi (bukan 15)

| Sesi | Isi |
|---|---|
| **1** | `modules/ai/ai-core.js` — event bus + storage + context. Fondasi murni, tanpa fitur. |
| **2** | `modules/ai/ai-decision-engine.js` + `ai-service.js` — decision/rule/recommend/learn + facade (briefing, health-check, simulation, prompt). Ini "otak" AI-nya. |
| **3** | `modules/logistics/logistics-engine.js` + `logistics-service.js` — baca `OngkirCalc`/`PriceReko`, hitung rute/beban/BBM/harga. |
| **4** | Fungsi additive ke SHOP + COBEK (file asli, bukan file baru): `calculateSmartDelivery, calculateFuel, calculateProfit, calculateVehicleCapacity, requestAIRecommendation` di `cobek-pricing.js`/`cobek-order.js`; `weightCalculator, volumeCalculator, packingCalculator` di `cobek-etalase.js`. |
| **5** | Fungsi additive ke FINANCE + ASSET + VEHICLE (+ INVENTORY setelah kamu putuskan §4 di dokumen lengkap): `predictCashflow/Expense/Income`, `predictAssetValue/netWorthForecast`, `predictService/fuelEfficiency/maintenanceForecast`, `stockPrediction/deadStockDetector/restockRecommendation`. |
| **6** | Wiring event (`finance.updated`, `delivery.created`, dst) dari titik `save()` masing-masing modul lewat bus Sesi 1 + daftarkan semua file baru ke `scripts/build.js` + test minimal + update `docs/FILE-MAP.md`. |

Tiap sesi tetap: additive, `npm run check` hijau, di-zip & didownload sebelum
lanjut sesi berikutnya — sama seperti rencana lengkap, cuma lebih sedikit
berhenti-mulai.

## Status per sesi

- ✅ Sesi 1-4: selesai (lihat `kw_release_sesi4.zip`).
- ✅ **Sesi 5 (selesai)**: additive ke FINANCE + ASSET + VEHICLE.
  **Keputusan Inventory: DI-SKIP** (dijawab eksplisit sebelum sesi ini
  jalan — stockPrediction/deadStockDetector/restockRecommendation TIDAK
  dikerjakan, tidak ada di modul manapun). Fungsi yang ditambahkan (semua
  additive, pure/read-only, tidak ada UI/wiring baru — lihat komentar
  header blok masing-masing di source):
  - `modules/finance/tx-list-cashflow.js`: `predictIncome`,
    `predictExpense`, `predictCashflow` — membungkus
    `computeCashflowForecast()` yang sudah ada jadi proyeksi bulan-demi-
    bulan ke depan.
  - `modules/asset/aset.js`: `predictAssetValue` (membungkus
    `Penyusutan.hitung()` dgn tanggal masa depan), `netWorthForecast`
    (membungkus `Kekayaan.currentNetWorth()`/`actualCAGR()`, fallback ke
    `predictCashflow()` kalau histori snapshot belum cukup).
  - `modules/vehicle/vehicle-core.js`: `fuelEfficiency` (membungkus
    `estimateRpPerKm()`/`estimateKmPerDay()`).
  - `modules/vehicle/sparepart-servis.js`: `predictService` (versi pure-
    data dari perhitungan `Servis.renderReminder()`, TIDAK
    me-refactor/menyentuh render aslinya), `maintenanceForecast`
    (menggabungkan `predictService()` + rata-rata biaya histori
    `D.servisLogs[].cost` per kategori).
  - Test baru: `tests/finance-predict.test.js`,
    `tests/asset-predict.test.js`, `tests/vehicle-predict.test.js` (25
    test, semua PASS). Total suite: **2010/2010 PASS**.
  - `npm run build` (`node scripts/build.js`) sudah dijalankan ulang —
    `docs/FILE-MAP.md`, `app-bundle-a.min.js`/`app-bundle-b.min.js`,
    versi (`?v=423`) semua sudah sinkron. Tidak ada file baru yang perlu
    didaftarkan ke `scripts/build.js` (murni edit file existing).
  - **Catatan**: `node --test` & `node scripts/build.js` sudah dijalankan
    & lolos di lingkungan ini. `npm run lint` (eslint) **belum sempat
    dijalankan** — environment ini tidak ada akses internet buat
    `npm install` (`node_modules/` kosong). Sebelum lanjut Sesi 6,
    jalankan `npm install && npm run check` di komputer kamu buat
    memastikan eslint juga hijau (kode baru mengikuti gaya file
    sekitarnya persis — indentasi, titik koma, kutip — jadi kemungkinan
    besar aman, tapi belum diverifikasi otomatis oleh linter).
- ✅ **Sesi 6 — SELESAI (dikonfirmasi ulang [2026-07-18], status di bawah ini
  sebelumnya basi/tidak sinkron dgn source)**: wiring event
  `AIBus.emit(...)` sudah ada persis di titik `save()` masing-masing modul
  domain — `finance.updated` di `modules/finance/transaksi.js` (4 titik),
  `asset.updated` di `modules/asset/aset.js` (2 titik), `vehicle.updated` di
  `modules/vehicle/sparepart-servis.js` (1 titik), `delivery.created` di
  `modules/shop/cobek-order.js` (1 titik) — semua guarded
  `typeof AIBus!=="undefined"`. `AIService.wireEvents()` juga sudah
  dipanggil sekali saat boot (`self-test.js`, guard `_wired`). Tidak ada
  file baru yang perlu didaftarkan ke `scripts/build.js` (murni tambahan ke
  file yang sudah terdaftar). **Yang BARU ditambahkan sesi ini**:
  `tests/ai-domain-event-wiring.test.js` — sebelumnya TIDAK ADA test yang
  menjaga ke-4 titik emit ini (`tests/ai-service-wireevents.test.js` yang
  sudah ada cuma menguji mekanisme bus dgn event palsu, bukan titik save()
  domain nyata), jadi kalau salah satu baris emit kehapus tanpa sengaja
  saat refactor, tidak ada yang gagal — sekarang ada.

## Status nyata setelah Sesi 6: bus "hidup" tapi 0 rule terdaftar

`AIDecision.rules.register(...)` **belum pernah dipanggil dari modul
manapun** (dicek ulang [2026-07-18], `grep -rn "AIDecision.rules.register"
modules/` cuma nemu definisi generic-nya di `ai-decision-engine.js`, tidak
ada domain yang register rule). Efeknya: event bisnis sudah sampai ke
`AIDecision.decide()` lewat `wireEvents()`, tapi karena tidak ada rule yang
dievaluasi, `AIService.dailyBriefing()`/`.simulate()` akan **selalu
mengembalikan hasil kosong** — infrastruktur sudah nyala, tapi belum ada
"otak" nya. Menentukan rule apa saja (mis. "peringatan kalau pengeluaran
bulan ini > X% dari rata-rata 3 bulan", ambang nominal, dst) adalah
**keputusan produk**, bukan sekadar kerja teknis — sesuai `docs/CLAUDE.md`
("kalau perbaikan yang benar butuh keputusan produk — STOP dan tanya dulu").

## Mulai dari mana

Sesi 6 (wiring event) sudah selesai. Kalau mau lanjut ke rule domain nyata
(`AIDecision.rules.register(...)`), perlu diputuskan dulu rule apa saja yang
mau didaftarkan per domain (finance/asset/vehicle/delivery) — lihat bagian
di atas.

## Sesi 7 (selesai) — rule domain FINANCE pertama

Rule pertama didaftarkan ke `AIDecision.rules`: **`finance-overspend-month`**
— trigger kalau pengeluaran bulan berjalan > X% dari rata-rata pengeluaran
(`computeCashflowForecast().expAvg`). Keputusan produk yang dikonfirmasi:
Finance dulu (bukan semua domain sekaligus), dan X **bisa diatur user**
(bukan hardcode) lewat field baru di Pengaturan → 🤖 AI Asisten (default
150% = 1,5×).

- `modules/finance/tx-list-cashflow.js`: `getAIFinanceOverspendThreshold()`,
  `setAIFinanceOverspendThreshold(pct)` (baca/tulis
  `D.profile.aiFinanceOverspendThresholdPct`, minimum dipaksa 100),
  `_financeOverspendCheck()` (helper internal), `registerFinanceAIRules()`
  (idempotent, guard kalau `AIDecision` belum dimuat).
- `self-test.js`: `registerFinanceAIRules()` dipanggil sekali saat boot,
  persis setelah `AIService.wireEvents()`.
- `index.html` + `modules/shared/profil-pengaturan.js` (`autoSaveProfile`) +
  `modules/shared/modules-render.js` (`renderSettings`): field baru "Ambang
  Peringatan Boros (%)" di kartu 🤖 AI Asisten.
- Test baru: `tests/finance-ai-rule.test.js` (10 test — getter/setter,
  register idempotent, guard AIDecision belum ada, trigger/tidak-trigger,
  ambang custom, expAvg 0). Total suite: **2037/2037 PASS**.
- `npm run build` sudah dijalankan ulang (`?v=428`, `docs/FILE-MAP.md`
  sinkron). Tidak ada file baru yang perlu didaftarkan ke `scripts/build.js`.
- Domain lain (asset/vehicle/delivery) **belum** punya rule terdaftar —
  lanjutan kalau diperlukan.

## Sesi 8 (selesai) — rule VEHICLE + ASSET + DELIVERY

Melanjutkan Sesi 7 ke 3 domain sekaligus (keputusan eksplisit: bukan satu-
satu). Semua idempotent, guard `AIDecision` belum ada, didaftarkan sekali
saat boot (`self-test.js`, sejajar `registerFinanceAIRules()`).

- **`vehicle-service-overdue`** (`modules/vehicle/sparepart-servis.js`) —
  trigger kalau ada kendaraan dgn item servis berstatus `'lewat'`
  (`predictService()`, status yg sama dgn `Servis.renderReminder()` — tidak
  ada ambang baru). Cooldown 24 jam.
- **`asset-networth-declining`** (`modules/asset/aset.js`) — trigger kalau
  `netWorthForecast({monthsAhead:6}).projectedEnd < netWorthNow` (tren
  turun, bukan ambang nominal). Cooldown 168 jam (mingguan).
- **`delivery-thin-margin`** (`modules/shop/cobek-pricing.js`) — trigger
  kalau `marginPct` transaksi Cobek yang baru disimpan < 10% (rule-of-thumb,
  hardcode — beda dari rule finance, TIDAK dibuat configurable krn belum
  diminta). `marginPct` baru ditambahkan ke payload
  `AIBus.emit("delivery.created",...)` di `modules/shop/cobek-order.js`
  (additive, key baru — tidak mengubah key lama). Condition rule ini WAJIB
  cek `ctx.event==='delivery.created'` dulu (beda dari 3 rule lain yg baca
  `D` langsung) supaya tidak nge-trigger pakai data basi saat `decide()`
  dipicu event lain.
- Test baru: `tests/vehicle-ai-rule.test.js` (4), `tests/asset-ai-rule.test.js`
  (5), `tests/delivery-ai-rule.test.js` (5) — total suite: **2051/2051 PASS**.
- `npm run build` dijalankan ulang (`?v=430`, `docs/FILE-MAP.md` sinkron).
  Tidak ada file baru yang perlu didaftarkan ke `scripts/build.js`.

**Status sekarang: ke-4 domain (finance/vehicle/asset/delivery) sudah punya
1 rule masing-masing.** Kalau mau nambah rule lain per domain, atau bikin
ambang `delivery-thin-margin` configurable juga (sama pola dgn finance),
itu keputusan produk lanjutan — belum dikerjakan sesi ini.

## Sesi 9 (selesai) — ambang delivery-thin-margin jadi configurable

`AI_DELIVERY_THIN_MARGIN_PCT` (hardcode 10) di `modules/shop/cobek-pricing.js`
diganti jadi `getAIDeliveryThinMarginThreshold()`/
`setAIDeliveryThinMarginThreshold(pct)` — pola PERSIS sama dgn
`getAIFinanceOverspendThreshold()` (Sesi 7): baca/tulis
`D.profile.aiDeliveryThinMarginThresholdPct`, dijaga di rentang 0-100,
default tetap 10%.

- Field baru "Ambang Margin Tipis Cobek (%)" di Pengaturan → 🤖 AI Asisten
  (`index.html`), wiring di `autoSaveProfile()`
  (`modules/shared/profil-pengaturan.js`) & `renderSettings()`
  (`modules/shared/modules-render.js`).
- Test tambahan di `tests/delivery-ai-rule.test.js` (+5: getter/setter,
  fallback nilai invalid, ambang custom dihormati). Total suite:
  **2056/2056 PASS**.
- `npm run build` dijalankan ulang (`?v=431`, `docs/FILE-MAP.md` sinkron).

Sekarang **2 dari 4 domain** (finance, delivery) punya ambang configurable;
vehicle (`'lewat'` status) & asset (tren negatif) sengaja tidak pakai ambang
nominal (lihat alasan di Sesi 8), jadi tidak ada yang perlu di-configurable-kan
di situ.

## Sesi 10 (selesai) — rule KEDUA per domain jadi configurable

Lanjutan catatan 2026-07-18 di `docs/CLAUDE.md` ("Rule kedua per domain AI")
yang menyimpulkan ke-4 rule kedua (`finance-low-balance`,
`vehicle-fuel-efficiency-drop`, `asset-zakat-due`, `delivery-low-stock`)
semua hardcode. Sesi ini membuatnya configurable, pola PERSIS sama dgn
Sesi 7/9 (getter/setter baca/tulis `D.profile.<key>`, clamp ke rentang
valid, field baru di Pengaturan → 🤖 AI Asisten):

- `finance-low-balance` — `getAIFinanceLowBalanceMultiplier()`/
  `setAIFinanceLowBalanceMultiplier(mult)` → `D.profile.aiFinanceLowBalanceMultiplier`,
  rentang 0.1-2, default 0.5 (`modules/finance/tx-list-cashflow.js`).
- `vehicle-fuel-efficiency-drop` — `getAIVehicleFuelDropThreshold()`/
  `setAIVehicleFuelDropThreshold(pct)` → `D.profile.aiVehicleFuelDropThresholdPct`,
  rentang 5-90, default 20 (`modules/vehicle/sparepart-servis.js`). Minimal
  3 segmen historis TETAP hardcode (syarat data cukup, bukan ambang
  sensitivitas).
- `asset-zakat-due` — `getAIAssetZakatMinThreshold()`/
  `setAIAssetZakatMinThreshold(rp)` → `D.profile.aiAssetZakatMinThresholdRp`,
  minimal 0, default Rp0 (perilaku lama: trigger begitu ada zakat > 0)
  (`modules/asset/aset.js`). Ini satu-satunya dari ke-4 yang beda: bukan
  ambang % tapi ambang nominal minimum, karena kondisinya "ada zakat atau
  tidak", bukan tren/rasio.
- `delivery-low-stock` — `getAIDeliveryLowStockThreshold()`/
  `setAIDeliveryLowStockThreshold(n)` → `D.profile.aiDeliveryLowStockThreshold`,
  minimal 0, default 2 pcs (`modules/shop/cobek-pricing.js`). Badge
  "Menipis" di kartu produk (`cobek-etalase.js`) TIDAK ikut diubah — tetap
  hardcode `<=2`, cuma ambang rule AI ini yang configurable.

- 4 field baru di Pengaturan → 🤖 AI Asisten (`index.html`): "Ambang Saldo
  Rendah (x rata-rata pengeluaran)", "Ambang Turun Efisiensi BBM (%)",
  "Ambang Stok Menipis (pcs)", "Ambang Minimal Zakat Maal (Rp)". Wiring di
  `autoSaveProfile()` (`modules/shared/profil-pengaturan.js`) &
  `renderSettings()` (`modules/shared/modules-render.js`), pola sama dgn 2
  field existing.
- Test tambahan (+20, 4 file existing diperluas, bukan file baru):
  `tests/finance-ai-rule.test.js`, `tests/vehicle-ai-rule.test.js`,
  `tests/delivery-ai-rule.test.js`, `tests/asset-ai-rule.test.js` — masing-
  masing +5 (getter default, getter custom valid, getter fallback invalid,
  setter+clamp, 1 rule test "ambang custom dihormati"). Total suite:
  **2091/2091 PASS** (naik dari 2071).
- `npm run build` dijalankan ulang (`?v=433`, `docs/FILE-MAP.md` sinkron,
  `index.html`/`app_production.html` identik). `node --check` lolos di
  6 file source yang diubah.
- `npm run lint`/`esbuild` **TIDAK bisa dijalankan** — sandbox tanpa akses
  internet, sama seperti sesi-sesi sebelumnya. Bundle TANPA minifikasi
  (fallback otomatis, aman). **Jalankan `npm install --save-dev esbuild` +
  `npm run lint` di lokal sebelum rilis produksi.**

**Status sekarang: SEMUA rule kedua di ke-4 domain sudah configurable**,
konsisten dgn rule pertama masing-masing (finance-overspend-month,
delivery-thin-margin sejak Sesi 7/9; vehicle-service-overdue &
asset-networth-declining TETAP hardcode karena sifatnya status/tren, bukan
ambang nominal — sama alasan Sesi 8/9).
