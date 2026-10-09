# PATCH S2288 (kumulatif, S2288 + S2288-b + S2288-d) — build s2041-1-part-sot-hardening-2289
Terapkan di atas `app-main__10_.zip` (build 2285). Berisi: Langkah 1-4, 7a, 7b, B1 (renderCnTab + Servis.renderList/renderReminder), B4 (loader lazy + guard #nextPulang) + hasil build.
Upload SEMUA file (bundle a/b, index.html, app_production.html, sw.js). Tes: 8733 lulus, 0 gagal, 1 skip. Detail & backlog: docs/PERF-REMEDIATION-LOG.md
Perilaku: auto self-test OPT-IN (?selftest=1 / kw_selftest_auto='1'); banner [DEV] hanya ?dev=1 / kw_dev=1; timeout muat skrip lazy tidak memulai skrip kedua.
Belum dikerjakan (butuh keputusan/data): B2/Langkah 5, B3 (Langkah 6), B5, B6, B7 — alasan di log.
