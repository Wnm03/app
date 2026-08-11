# AI_SCOPE.md — Batas scope Smart AI

Ditambahkan Sesi 26 (2026-07-18).

## Di dalam scope Smart AI

- **Foundation** — `modules/ai/ai-core.js`, `ai-service.js`,
  `ai-decision-engine.js`, `modules/logistics/logistics-engine.js`,
  `logistics-service.js` (Tahap 1).
- **Integration** — event bus wiring, service layer wiring, registry,
  dashboard/navigation wiring khusus fitur AI (Tahap 2).
- **Decision Engine** — recommendation, decision logic, context
  analysis, cross-module analysis (Tahap 4).
- **Daily Briefing** — `AIService.dailyBriefing()`, 5 bagian (lihat
  `docs/PRODUCT_DECISIONS.md`) (Tahap 5).
- **Learning** — `AIDecision.learn`, `recordOutcome()`,
  `getConfidence()` (Tahap 6).
- **Simulation** — `AIService.simulate()`, `profitSimulation` (Tahap 7).
- **Health Check** — `AIService.healthCheck()`, duplicate/dead-code/
  broken-reference/storage-audit/performance-check (Tahap 8).

## Di luar scope Smart AI

Apa pun di luar 7 kategori di atas BUKAN scope Smart AI — termasuk
(tapi tidak terbatas pada):

- Modul aplikasi inti non-AI (keuangan, cobek, kendaraan, dst) kecuali
  disentuh AI lewat `AIContext.snapshot()` sbg READ-ONLY context.
- LifeOS (`lifeos/*`) — itu track terpisah, lihat `docs/LIFEOS_SCOPE.md`.
- Smart Logistics (Tahap 3) sudah 100% — tidak ada scope AI baru di
  sana kecuali ada rule/gap baru yang ditemukan lewat audit kecil.

## Dokumen status

`IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, `TODO.md` (semua di ROOT
repo, BUKAN `docs/`) — dokumen ini yang jadi source of truth detail per
tahap/sub-item, JANGAN dipindah ke `docs/` (backward compatible dgn
link/referensi yang sudah ada di banyak dokumen lain).
