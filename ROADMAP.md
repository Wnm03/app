# ROADMAP.md — Smart AI & Smart Logistics

Checklist per-tahap. ☑ = ada bukti di source code. ☐ = belum. Detail
persentase & alasan ada di `IMPLEMENTATION_STATUS.md`.

## Tahap 1 — Foundation
- ☑ AI Core (`modules/ai/ai-core.js`)
- ☑ AI Service (`modules/ai/ai-service.js`)
- ☑ AI Decision Engine (`modules/ai/ai-decision-engine.js`)
- ☑ Logistics Engine (`modules/logistics/logistics-engine.js`)
- ☑ Logistics Service (`modules/logistics/logistics-service.js`)

## Tahap 2 — Integration
- ☑ Registry (`FEATURE_REGISTRY` kategori `dashboard` — 2 entry baru,
  `dash-ai-rekomendasi`/`dash-ai-ringkasan-harian` — SELESAI Sesi 22,
  TODO.md #6)
- ☑ Dashboard wiring (`AIDailyBriefingCard` di Beranda — SELESAI Sesi
  16, lihat Tahap 5)
- ☑ Navigation wiring (Sesi 28 — audit: registry `dash-lifeos` sudah
  ada, ditambah 3 test end-to-end)
- ☑ Router wiring (Sesi 28 — audit: `DashboardHub.open()` sudah jadi
  entry point navigasi generik sejak sebelumnya, tidak ada router baru)
- ☑ Event Bus wiring (`AIService.wireEvents()`, 4 event domain)
- ☑ Service Layer wiring (`dailyBriefing()` dipanggil nyata dari UI —
  SELESAI Sesi 16; `simulate()`/`healthCheck()` dipanggil nyata dari UI
  — SELESAI Sesi 29, TODO.md #6c. **Tahap 2 sekarang 100%.**)

## Tahap 3 — Smart Logistics
- ☑ Vehicle Capacity Checker
- ☑ Weight Calculator
- ☑ Volume Calculator
- ☑ Packing Calculator
- ☑ Fuel Calculator
- ☑ Operational Cost
- ☑ Smart Ongkir
- ☑ Profit Calculator
- ☑ Delivery Summary

## Tahap 4 — AI Decision Engine
- ☑ Recommendation (`AIDecision.recommend`, `formatRecommendation()`)
- ☑ Decision Logic (`AIDecision.rules`, `decide()`)
- ☑ Context Analysis (per-domain, `AIContext.snapshot()` — Sesi 13,
  `finance`/`asset`/`vehicle`/`shop`, reuse penuh fungsi domain existing)
- ☑ Cross Module Analysis (rule 2+ domain sekaligus) — SELESAI Sesi 14
  - ☑ Sub-langkah Sesi 12: 1 rule vehicle memanggil `LogisticsEngine`
    (koneksi antar-engine, BUKAN rule cross-domain penuh)
  - ☑ Sub-langkah Sesi 13: fondasi context collector selesai (blocker rule
    cross-domain penuh sudah hilang)
  - ☑ Sub-langkah Sesi 14: rule `cross-finance-delivery-margin-balance`
    (`ai-decision-engine.js`, `registerCrossModuleAIRules()`) — rule
    PERTAMA yang baca 2 domain (finance + shop) sekaligus lewat
    `AIContext.snapshot()`, 8 test baru di
    `tests/cross-module-ai-rule.test.js`

## Tahap 5 — AI Daily Briefing
- ☑ Daily Summary (terstruktur per bagian — SELESAI Sesi 31, 5 bagian
  Finance/Delivery/Reminder/Target/Recommendation Summary semuanya
  terisi; status ini sempat tidak sinkron dgn kode, diperbaiki Sesi 41)
- ☑ Reminder Summary (`dailyBriefing()` field `reminderSummary`, array
  6 domain — Finance/Vehicle/Shop/Asset/Goal/LifeOS — reuse fungsi
  condition() rule existing per domain + `todayAdapterList()`/
  `goalAdapterList()` — SELESAI Sesi 31, TODO.md #8)
- ☑ Target Summary (`dailyBriefing()` field `targetSummary`, reuse
  `goalAdapterList(D)` APA ADANYA — SELESAI Sesi 31, TODO.md #8)
- ☑ Financial Summary (`dailyBriefing()` field `financialSummary`,
  diangkat APA ADANYA dari `context.finance` yang sudah ada — SELESAI
  Sesi 23, TODO.md #7)
- ☑ Delivery Summary (`dailyBriefing()` panggil
  `LogisticsEngine.deliverySummary()` — SELESAI Sesi 15, sumber data
  order Cobek pending terakhir, field `result.deliverySummary`)
- ☑ Recommendation Summary (field `recommendations` di `dailyBriefing()`)
- ☑ Dashboard wiring (`AIDailyBriefingCard`, `#aiBriefingBody` — SELESAI
  Sesi 16, kartu ringkasan display-only di bawah `AIRecommendCard`,
  TODO.md #2)

## Tahap 6 — AI Learning
- ☑ History (`decisionLog`)
- ☑ Learning Storage (`AIDecision.learn`)
- ☑ Recommendation Improvement
  - ☑ Sesi 14: `recordOutcome()` dipanggil dari 1 titik UI nyata
    (`AIRecommendCard`, tombol ✓ Terima/Abaikan di kartu "🧭 Penasihat")
  - ☑ Sesi 19: `getConfidence()` dipakai buat menimbang/mengurutkan
    rekomendasi yang tampil (`AIRecommendCard.render()`, skor gabungan
    weight-confidence × confidence adaptif, guard kalau getConfidence
    tidak ada/error)
  - ☑ Sesi 32: tombol ketiga "✗ Tolak" (outcome `'rejected'`) di
    `AIRecommendCard` — sebelum sesi ini `'rejected'` tidak pernah
    tercapai dari UI nyata, jadi confidence adaptif tidak pernah bisa
    turun dari pemakaian nyata
  - ☑ Sesi 42: baris statistik histori Terima/Tolak/Abaikan per rule
    ditampilkan di dalam kartu `AIRecommendCard` existing (reuse
    `AIDecision.learn.getStats(ruleId)`, TIDAK ada storage/UI baru)

## Tahap 7 — AI Simulation
- ☑ What-If Analysis (`AIService.simulate()`)
- ☑ Scenario Engine (builder skenario terstruktur — SELESAI Sesi 45,
  `AIService.simulateScenarios(scenarios)`, jalankan BEBERAPA skenario
  What-If berlabel dalam 1 pemanggilan, murni orkestrasi berulang di
  atas `simulate()` yang sudah ada — TIDAK ada preset bisnis baru
  ditebak, nilai skenario sepenuhnya dari pemanggil)
- ☑ Profit Simulation (`simulate(ctx)` panggil
  `LogisticsEngine.profitCalculator()` kalau `ctx.profit` diisi — SELESAI
  Sesi 15, hasil di field `result.profitSimulation`)
- ☑ Delivery Simulation (`simulate(ctx)` panggil
  `LogisticsEngine.deliverySummary()` — SELESAI Sesi 33, hasil di field
  `result.deliverySimulation`; checkbox ini sempat tidak sinkron dgn kode,
  diperbaiki Sesi 39, lihat `IMPLEMENTATION_STATUS.md`)

## Tahap 8 — AI Health Check
- ☑ Storage Audit (`healthCheck()` field `orphanedStorageKeys` —
  ruleId di `ruleCooldowns`/`learningData` yang rule-nya sudah
  di-`unregister()` — SELESAI Sesi 21, TODO.md #4d)
- ☑ Dead Code Detection (`healthCheck()` field `deadRuleIds` — id rule
  terdaftar dgn `enabled:false`, TIDAK PERNAH dievaluasi
  `rules.evaluate()` — SELESAI Sesi 18, TODO.md #4)
- ☑ Broken Reference (`healthCheck()` field `brokenRecommendationRefs`
  — `recommendationId` di `decisionLog` yang tidak/tidak lagi
  terdaftar di `AIDecision.recommend` — SELESAI Sesi 20, TODO.md #4c)
- ☑ Duplicate Detection (`healthCheck()` field `duplicateRuleIds` +
  `duplicateRecommendations` — SELESAI Sesi 17, TODO.md #3)
- ☑ Performance Check (`healthCheck()` field `checks.performance` —
  `{contextCollectorMs, ruleEvaluationMs, recommendationMs,
  dailyBriefingMs, simulationMs}` — SELESAI Sesi 30, TODO.md #4e; murni
  read-only, `_aiMeasureMs()`/`_aiMeasureMsAsync()`
  (`modules/ai/ai-core.js`); checkbox ini sempat tidak sinkron dgn kode
  [`IMPLEMENTATION_STATUS.md` sudah mencatat Tahap 8 100% sejak Sesi
  34], diperbaiki Sesi 46 — pola sama insiden Sesi 39/41/44)

---

**Sesi 15 — 2026-07-18:** Profit Simulation (Tahap 7) & Delivery Summary
(Tahap 5) selesai — lihat `CLAUDE.md` untuk detail.

**Checkpoint recovery #2 — 2026-07-18:** Sesi terputus (kuota habis)
diverifikasi ulang tanpa perubahan kode/fitur — 2188/2188 test pass,
build `?v=444`. Lihat `docs/CLAUDE.md`.

**Sesi 16 — 2026-07-18:** Dashboard/nav wiring `dailyBriefing()`
(TODO.md #2) selesai — kartu `AIDailyBriefingCard` di Beranda,
2196/2196 test pass, build `?v=445`. Lihat `docs/CLAUDE.md`.

**Sesi 17 — 2026-07-18:** `healthCheck()` Duplicate Detection
(TODO.md #3) selesai — 2199/2199 test pass, build `?v=446`. Lihat
`docs/CLAUDE.md`.

**Sesi 18 — 2026-07-18:** `healthCheck()` Dead Code Detection
(TODO.md #4) selesai — 2202/2202 test pass, build `?v=447`. Lihat
`docs/CLAUDE.md`.

**Sesi 19 — 2026-07-18:** Tahap 6 — `getConfidence()` dipakai buat
urutan tampil rekomendasi (TODO.md #5) selesai — 2205/2205 test pass,
build `?v=448`. Lihat `docs/CLAUDE.md`.

**Sesi 20 — 2026-07-18:** `healthCheck()` Broken Reference (TODO.md
#4c) selesai — 2209/2209 test pass, build `?v=449`. Lihat
`docs/CLAUDE.md`.

**Sesi 21 — 2026-07-18:** `healthCheck()` Storage Audit (TODO.md #4d)
selesai — 2213/2213 test pass, build `?v=450`. Lihat `docs/CLAUDE.md`.

**Sesi 22 — 2026-07-18:** Tahap 2 Registry (TODO.md #6) selesai —
2213/2213 test pass, build `?v=451`. Lihat `docs/CLAUDE.md`.

**Sesi 23 — 2026-07-18:** Tahap 5 Financial Summary (TODO.md #7)
selesai — 2215/2215 test pass, build `?v=452`. Lihat `docs/CLAUDE.md`.

**Sesi 28 — 2026-07-18:** Tahap 2 Navigation/Router wiring (TODO.md #6b)
selesai — 2251/2251 test pass, build `?v=457`. Lihat `docs/CLAUDE.md`.

**Sesi 29 — 2026-07-18:** Tahap 2 Service Layer wiring (TODO.md #6c) —
`healthCheck()`/`simulate()` dipanggil nyata dari UI existing. **Tahap
2 sekarang 100%.** 2266/2266 test pass, build `?v=458`. Lihat
`docs/CLAUDE.md`.
