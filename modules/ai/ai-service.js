// ai-service.js — Smart Delivery Engine, Sesi 2/6: facade tunggal.
//
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. Butuh ai-core.js
// (Sesi 1) & ai-decision-engine.js (di atas, Sesi 2 ini) sudah dimuat
// lebih dulu — lihat urutan di scripts/build.js.
//
// Kenapa 1 file, bukan 5 (ai-daily-briefing.js + ai-health-check.js +
// ai-simulation.js + ai-prompt.js + ai-service.js) — lihat
// RENCANA-SESI-RINGKAS.md bagian "Kenapa dipangkas". AIService adalah
// SATU-SATUNYA pintu masuk yang dipakai UI/modul lain (Sesi 4-6) —
// mereka tidak boleh memanggil AIDecision/AIStore langsung, supaya kalau
// internal berubah nanti, kontrak publik (4 method di bawah) tetap sama.
//
// PENTING (Sesi 2 — masih "senyap"): tidak ada UI, tidak ada wiring
// otomatis. Method di bawah baru "hidup" kalau dipanggil eksplisit oleh
// kode lain (Sesi 4-6). Dengan 0 rule domain terdaftar (lihat catatan di
// ai-decision-engine.js), dailyBriefing()/simulate() akan selalu
// mengembalikan hasil kosong sampai ada modul yang register rule/rekomendasi.

// _aiLastPendingCobekOrder() — Sesi 15 (Tahap 5, Delivery Summary): cari
// transaksi Cobek TERAKHIR yang belum diserahkan/dikirim, buat sumber data
// LogisticsEngine.deliverySummary() di dailyBriefing(). Filter & urutan
// SAMA PERSIS dgn pola yang sudah ada (`D.cobek.filter(c=>c.items &&
// c.delivered===false)` di cobek-order.js #106, sort
// `(b.id||0)-(a.id||0)` di _aiContextShop() ai-core.js) — bukan rumus
// baru. Guard `typeof D==='undefined'` (tidak pernah menyentuh/mengubah D,
// murni baca) — kalau D belum ada atau tidak ada order pending, balik null.
// (Sesi 265, Ownership Sync — AI): TAMBAH filter isCobekOwnershipSelf di
// atas D.cobek (0 logic lama diubah) — pesanan Cobek ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan dari Delivery Summary
// AI Daily Briefing, pola sama persis _aiContextShop() (ai-core.js, S265).
// Guard typeof: kalau helper belum dimuat, anggap semua SELF.
function _aiLastPendingCobekOrder() {
  if (typeof D === 'undefined' || !D || !Array.isArray(D.cobek)) return null;
  const cobSelfFilter = typeof isCobekOwnershipSelf === 'function' ? isCobekOwnershipSelf : (() => true);
  const pending = D.cobek
    .filter((c) => c.items && c.delivered === false)
    .filter(cobSelfFilter)
    .sort((a, b) => (b.id || 0) - (a.id || 0));
  return pending[0] || null;
}

// _aiFindDuplicateRuleIds() — Tahap 8 (AI Health Check, TODO.md #3, Duplicate
// Detection). Cek AIDecision.rules.getAll() (array _rules) buat id yang
// muncul lebih dari 1x. Secara normal TIDAK PERNAH terjadi krn
// rules.register() sudah menolak id yang sudah ada (`this._rules.some(r=>
// r.id===rule.id)) return false` di ai-decision-engine.js) — deteksi ini
// murni JARING PENGAMAN kalau suatu saat ada jalur lain yang menambah ke
// _rules tanpa lewat register() (mis. bug refactor), BUKAN mengasumsikan
// bug itu ada sekarang. Murni baca (tidak menulis apa pun).
function _aiFindDuplicateRuleIds() {
  const counts = Object.create(null);
  AIDecision.rules.getAll().forEach((r) => {
    if (!r || typeof r.id !== 'string') return;
    counts[r.id] = (counts[r.id] || 0) + 1;
  });
  return Object.keys(counts).filter((id) => counts[id] > 1);
}

// _aiFindDuplicateRecommendations() — beda kasus dari rule id di atas:
// AIDecision.recommend._map adalah OBJECT keyed by id, jadi id-nya sendiri
// TIDAK MUNGKIN dobel (key object unik by definisi bahasa). Yang dicek di
// sini justru KONTEN-nya: kalau 2+ id BERBEDA terdaftar dgn label+target
// yang PERSIS SAMA, itu indikasi 2 modul domain tidak sengaja mendaftarkan
// rekomendasi yang sama 2x dgn id berbeda (redundan, bukan bug fatal, tapi
// berguna buat dibersihkan). Murni baca (tidak menulis apa pun).
function _aiFindDuplicateRecommendations() {
  const map = AIDecision.recommend.getAll();
  const byContent = Object.create(null);
  Object.keys(map).forEach((id) => {
    const def = map[id] || {};
    const key = JSON.stringify([def.label || '', def.target || null]);
    (byContent[key] = byContent[key] || []).push(id);
  });
  return Object.keys(byContent)
    .map((key) => byContent[key])
    .filter((ids) => ids.length > 1)
    .map((ids) => {
      const def = map[ids[0]] || {};
      return { label: def.label || '', target: def.target || null, ids };
    });
}

// _aiFindDeadRuleIds() — Tahap 8 (AI Health Check, TODO.md #4, Dead Code
// Detection). Cek AIDecision.rules.getAll() buat rule yang `enabled ===
// false` — rule ini TERDAFTAR (lolos validateAIRuleShape + register()) tapi
// TIDAK PERNAH dievaluasi (`rules.evaluate()` skip rule kalau `!rule.enabled`
// di baris paling atas loop-nya, lihat ai-decision-engine.js) — secara
// efektif "kode mati": ada di registry, tapi action()-nya tidak akan pernah
// jalan lewat decide()/simulate() manapun. TIDAK ada API buat mengaktifkan
// balik selain unregister() lalu register() ulang dgn enabled:true — jadi
// hasil ini murni informasional (mis. rule yang sengaja dinonaktifkan
// sementara tapi lupa dihapus/diaktifkan lagi). Murni baca (tidak menulis
// apa pun).
function _aiFindDeadRuleIds() {
  return AIDecision.rules.getAll()
    .filter((r) => r && r.enabled === false)
    .map((r) => r.id);
}

// _aiFindBrokenRecommendationRefs() — Tahap 8 (AI Health Check, TODO.md #4b,
// Broken Reference). Beda dari Dead Code Detection (rule yang tidak pernah
// jalan) — ini soal `recommendationId` yang PERNAH dihasilkan rule (tercatat
// di decisionLog, hasil evaluate() -> action() nyata) tapi TIDAK/TIDAK LAGI
// terdaftar di `AIDecision.recommend` (mis. modul domain yang dulu
// register() rekomendasi itu belum sempat di-load, atau id-nya diganti tanpa
// update rule). Kenapa baca `decisionLog` (histori), BUKAN cek statis semua
// rule: `recommendationId` cuma diketahui dari HASIL `rule.action(ctx)` —
// baru ada setelah rule benar-benar trigger dgn ctx nyata (lihat
// `rules.evaluate()`), tidak bisa dibaca dari definisi rule sebelum
// dijalankan. decisionLog sudah menyimpan histori itu (SATU-SATUNYA
// penulis: `AIDecision.decide()`), jadi dipakai ulang di sini — bukan
// menjalankan ulang rule (yang butuh ctx domain nyata & bisa menandai
// cooldown lagi, tidak cocok utk pemeriksaan read-only). Dedup by
// recommendationId (1 id yang broken dihitung sekali walau muncul di banyak
// decision). Murni baca (tidak menulis apa pun).
function _aiFindBrokenRecommendationRefs() {
  const store = aiGetStore();
  const log = (store && Array.isArray(store.decisionLog)) ? store.decisionLog : [];
  const seen = Object.create(null);
  const broken = [];
  log.forEach((d) => {
    const recId = d && d.recommendationId;
    if (!recId || typeof recId !== 'string' || seen[recId]) return;
    seen[recId] = true;
    if (!AIDecision.recommend.getById(recId)) broken.push(recId);
  });
  return broken;
}

// _aiFindOrphanedStorageKeys() — Tahap 8 (AI Health Check, TODO.md #4d,
// Storage Audit). Cek 2 object di AIStore yang keyed by ruleId —
// `ruleCooldowns` (diisi `_markCooldown()` tiap rule trigger nyata) &
// `learningData` (diisi `recordFeedback()`, lihat ai-decision-engine.js)
// — buat key yang ruleId-nya TIDAK/TIDAK LAGI terdaftar di
// `AIDecision.rules.getAll()`. Ini bisa terjadi krn `rules.unregister(id)`
// HANYA menghapus dari `_rules` (lihat definisinya di
// ai-decision-engine.js), TIDAK PERNAH ikut membersihkan
// `ruleCooldowns`/`learningData` — jadi kalau modul domain yang dulu
// register() sebuah rule kemudian di-refactor/dihapus (unregister()), jejak
// cooldown & data pembelajarannya tetap tertulis selamanya di AIStore
// (storage leak ringan, ukurannya kecil per-entry tapi tidak pernah
// menyusut). Beda dari Dead Code Detection (`_aiFindDeadRuleIds()` di
// atas): itu soal rule yang MASIH terdaftar tapi `enabled:false`, ini
// soal rule yang SUDAH TIDAK terdaftar sama sekali tapi jejaknya masih
// ada di storage. Murni baca/deteksi — TIDAK menghapus entry apa pun
// secara otomatis (keputusan cleanup, mis. apakah histori pembelajaran
// rule lama masih ingin dipertahankan, butuh keputusan produk terpisah).
function _aiFindOrphanedStorageKeys() {
  const store = aiGetStore();
  const registeredIds = new Set(AIDecision.rules.getAll().map((r) => r.id));
  const cooldowns = (store && store.ruleCooldowns) || {};
  const learning = (store && store.learningData) || {};
  return {
    orphanedCooldownRuleIds: Object.keys(cooldowns).filter((id) => !registeredIds.has(id)),
    orphanedLearningDataRuleIds: Object.keys(learning).filter((id) => !registeredIds.has(id)),
  };
}

// AI_REMINDER_DOMAIN_ORDER — urutan prioritas reminder per
// docs/PRODUCT_DECISIONS.md § Reminder Priority (Finance -> Vehicle ->
// Shop -> Asset -> Goal -> LifeOS). Array literal lokal (bukan registry
// baru) krn urutan ini SATU-SATUNYA konsumen sejauh ini (Reminder
// Summary) — kalau nanti ada konsumen lain yang butuh urutan sama,
// baru layak diangkat jadi registry terpisah.
const AI_REMINDER_DOMAIN_ORDER = ['finance', 'vehicle', 'shop', 'asset', 'goal', 'lifeos'];

// _aiReminderAndTargetSummary(context) — Tahap 5 (Daily Briefing, TODO.md
// #8): bangun `reminderSummary` (array per domain, urutan
// AI_REMINDER_DOMAIN_ORDER) & `targetSummary` sekaligus dalam 1 fungsi
// supaya `goalAdapterList(D)` (dipakai KEDUA field) cuma dihitung SEKALI
// per pemanggilan dailyBriefing() — bukan 2x terpisah.
//
// Reminder Summary SENGAJA reuse fungsi condition() rule AI yang SUDAH
// ADA per domain (pola yang sama dipakai `registerFinanceAIRules()` dkk),
// BUKAN menulis ulang logic "apa yang butuh diingatkan" dari nol:
//   - finance -> `context.finance.billsDueCount`/`billsDue30Hari`
//     (AIContext.snapshot(), sudah dihitung sekali di dailyBriefing()
//     lewat computeCashflowForecast() — REUSE hasil yang sudah ada,
//     TIDAK panggil computeCashflowForecast() lagi).
//   - vehicle -> `_vehicleOverdueCheck()` (sparepart-servis.js, dipakai
//     jg oleh rule 'vehicle-service-overdue').
//   - shop -> `_deliveryLowStockCheck()` (cobek-pricing.js, dipakai jg
//     oleh rule delivery low-stock).
//   - asset -> `_assetZakatDueCheck()` (aset.js, dipakai jg oleh rule
//     asset zakat).
//   - goal -> `goalAdapterList(D)` (lifeos/adapters/goal-adapter.js,
//     READ-ONLY — arah baca AI->LifeOS sudah diizinkan eksplisit di
//     docs/LIFEOS_SCOPE.md), reminder = goal yang progressPct<100.
//   - lifeos -> `todayAdapterList(D)` (lifeos/adapters/today-adapter.js),
//     jumlah item "hari ini" yang masih pending.
// Tiap domain guard `typeof fn==='function'` (pola SAMA PERSIS dgn 4
// builder `_aiContext*` di ai-core.js) — domain yang modulnya belum
// di-load `available:false, count:0`, TIDAK throw, TIDAK menebak data.
//
// Target Summary = `goalAdapterList(D)` APA ADANYA (list lengkap, tidak
// difilter) + `incompleteCount` (turunan ringan dari list yang sama,
// BUKAN rumus baru). `null` kalau `goalAdapterList` belum di-load ATAU
// `D` belum ada.
function _aiReminderAndTargetSummary(context) {
  const hasD = typeof D !== 'undefined' && D;
  const entries = {};

  const fin = context && context.finance;
  entries.finance = (fin && fin.available)
    ? { domain: 'finance', available: true, count: fin.billsDueCount || 0, detail: { billsDue30Hari: fin.billsDue30Hari, billsDueCount: fin.billsDueCount } }
    : { domain: 'finance', available: false, count: 0, detail: null };

  const vehicleCheck = (typeof _vehicleOverdueCheck === 'function') ? _vehicleOverdueCheck() : null;
  entries.vehicle = vehicleCheck
    ? { domain: 'vehicle', available: true, count: vehicleCheck.overdue.length, items: vehicleCheck.overdue.slice(0, 3) }
    : { domain: 'vehicle', available: false, count: 0, items: [] };

  const shopCheck = (typeof _deliveryLowStockCheck === 'function') ? _deliveryLowStockCheck() : null;
  entries.shop = shopCheck
    ? { domain: 'shop', available: true, count: shopCheck.low.length, items: shopCheck.low.slice(0, 3).map((p) => ({ id: p.id, name: p.name, stock: p.stock })) }
    : { domain: 'shop', available: false, count: 0, items: [] };

  const assetCheck = (typeof _assetZakatDueCheck === 'function') ? _assetZakatDueCheck() : null;
  entries.asset = (assetCheck && assetCheck.trigger)
    ? { domain: 'asset', available: true, count: assetCheck.jumlah, detail: { totalZakat: assetCheck.totalZakat, minThreshold: assetCheck.minThreshold } }
    : { domain: 'asset', available: !!assetCheck, count: 0, detail: null };

  const goalList = (typeof goalAdapterList === 'function' && hasD) ? goalAdapterList(D) : null;
  const incompleteGoals = goalList ? goalList.filter((g) => g.progressPct < 100) : [];
  entries.goal = goalList
    ? { domain: 'goal', available: true, count: incompleteGoals.length, items: incompleteGoals.slice(0, 3).map((g) => ({ id: g.id, name: g.name, progressPct: g.progressPct })) }
    : { domain: 'goal', available: false, count: 0, items: [] };

  const todayList = (typeof todayAdapterList === 'function' && hasD) ? todayAdapterList(D) : null;
  entries.lifeos = todayList
    ? { domain: 'lifeos', available: true, count: todayList.length, items: todayList.slice(0, 3).map((i) => ({ id: i.id, label: i.label })) }
    : { domain: 'lifeos', available: false, count: 0, items: [] };

  const reminderSummary = AI_REMINDER_DOMAIN_ORDER.map((d) => entries[d]);
  const targetSummary = goalList
    ? { count: goalList.length, incompleteCount: incompleteGoals.length, items: goalList }
    : null;

  return { reminderSummary, targetSummary };
}

const AIService = {
  /** dailyBriefing({limit}) — ringkasan harian: snapshot context + N
   * keputusan/rekomendasi terakhir dari decisionLog, rekomendasi
   * di-resolve ke { label, target } lewat AIDecision.recommend. TIDAK
   * memicu evaluasi rule baru (itu tugas decide(), dipanggil terpisah
   * oleh titik wiring Sesi 6) — briefing murni MEMBACA hasil yang sudah
   * ada, supaya bisa dipanggil sesering apa pun tanpa efek samping.
   *
   * Sesi 15 (Tahap 5 — Delivery Summary): field `deliverySummary` diisi
   * dari `LogisticsEngine.deliverySummary()`, sumber datanya transaksi
   * Cobek TERAKHIR yang belum diserahkan/dikirim (`_aiLastPendingCobekOrder()`
   * di atas). HANYA `totalPenjualan`/`diskon` yang diisi dari order —
   * field lain (kendaraan/jarak/berat/volume/biaya operasional) TIDAK ada
   * di data order Cobek sama sekali, jadi SENGAJA tidak diisi/ditebak
   * (LogisticsEngine sendiri sudah fallback aman ke 0 untuk parameter yang
   * kosong, TIDAK throw — lihat komentar `deliverySummary()` di
   * logistics-engine.js). Konsekuensinya: `capacity`/`estimasiBBM`/`ongkir`
   * di hasil ini akan 0/AMAN selama belum ada input kendaraan & rute
   * manual — HANYA `profit.totalPenjualan`/`profit.diskon` yang
   * merepresentasikan data nyata. Kalau tidak ada order pending ATAU
   * LogisticsEngine belum di-load, `deliverySummary` balik `null` (TIDAK
   * ada order palsu/di-reka-reka).
   *
   * Sesi 23 (Tahap 5 — Financial Summary, ROADMAP.md "Financial Summary
   * (terpisah)"): field `financialSummary` diisi APA ADANYA dari
   * `context.finance` (AIContext.snapshot(), sudah ada sejak Sesi 13 —
   * reuse computeCashflowForecast() TANPA rumus baru) — cuma diangkat jadi
   * field TOP-LEVEL terpisah (bukan nested-only di `context.finance`),
   * pola sama persis dgn `deliverySummary`/`recommendations` yang juga
   * diangkat ke top-level dari sumber yang sudah ada. `null` kalau domain
   * finance belum tersedia (`context.finance.available===false`, mis.
   * tx-list-cashflow.js belum di-load), TIDAK menebak data.
   *
   * Sesi 31 (Tahap 5 — Reminder Summary & Target Summary, TODO.md #8,
   * struktur final per `docs/PRODUCT_DECISIONS.md`): field
   * `reminderSummary` (array 6 entri, urutan `AI_REMINDER_DOMAIN_ORDER` —
   * Finance -> Vehicle -> Shop -> Asset -> Goal -> LifeOS, tiap entri
   * `{domain, available, count, items?/detail?}`) & `targetSummary`
   * (`{count, incompleteCount, items}` dari `goalAdapterList(D)` APA
   * ADANYA, `null` kalau belum tersedia). Keduanya dibangun 1x lewat
   * `_aiReminderAndTargetSummary()` di atas (lihat komentarnya utk daftar
   * lengkap fungsi yang di-reuse per domain) — struktur "5 bagian Daily
   * Briefing" (Finance/Delivery/Reminder/Target/Recommendation Summary)
   * SEKARANG LENGKAP semua. */
  async dailyBriefing({ limit = 10 } = {}) {
    await aiEnsureLoaded();
    const store = aiGetStore();
    const context = AIContext.snapshot();
    const recentDecisions = (store.decisionLog || [])
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((d) => Object.assign({}, d, {
        recommendation: d.recommendationId ? AIDecision.recommend.getById(d.recommendationId) : null,
      }));

    const lastPendingOrder = _aiLastPendingCobekOrder();
    const deliverySummary = (lastPendingOrder
      && typeof LogisticsEngine !== 'undefined'
      && typeof LogisticsEngine.deliverySummary === 'function')
      ? Object.assign(
        { sourceOrderId: lastPendingOrder.id },
        LogisticsEngine.deliverySummary({
          totalPenjualan: lastPendingOrder.total,
          diskon: lastPendingOrder.diskon,
        }),
      )
      : null;

    const financialSummary = (context.finance && context.finance.available)
      ? context.finance
      : null;

    // Sesi 31 (Tahap 5 — Reminder Summary & Target Summary, TODO.md #8,
    // struktur final per docs/PRODUCT_DECISIONS.md § Daily Briefing/§
    // Reminder Priority): reuse `_aiReminderAndTargetSummary()` di atas
    // (1 fungsi, 1 pemanggilan `goalAdapterList(D)`, bukan duplikasi).
    // Dibungkus try/catch terpisah supaya kalau ADA yang gagal tak
    // terduga, 2 field ini balik null (informasional) TANPA
    // menjatuhkan dailyBriefing() secara keseluruhan (field lain, mis.
    // financialSummary/deliverySummary, tetap terisi normal) — pola sama
    // dgn guard try/catch di healthCheck().
    let reminderSummary = null;
    let targetSummary = null;
    try {
      const rt = _aiReminderAndTargetSummary(context);
      reminderSummary = rt.reminderSummary;
      targetSummary = rt.targetSummary;
    } catch (e) {
      console.warn('[AIService] dailyBriefing(): reminderSummary/targetSummary gagal dihitung:', e);
    }

    return {
      generatedAt: new Date().toISOString(),
      context,
      lastRunAt: store.lastRunAt || null,
      recentDecisions,
      deliverySummary,
      financialSummary,
      reminderSummary,
      targetSummary,
      // Sesi 11 — bentuk standar (id/title/reason/confidence/priority/
      // affectedModules/estimatedImpact/actions), sama kontrak dgn
      // decide().recommendations & simulate(), supaya UI briefing dan
      // UI What-If konsumsi struktur yang identik. `recentDecisions` di
      // atas TETAP ada apa adanya (backward compatible, tidak dihapus).
      recommendations: recentDecisions.map((d) => AIDecision.formatRecommendation(d)),
    };
  },

  /** healthCheck() — pemeriksaan integritas ringan, non-invasif (TIDAK
   * menulis apa pun ke store). Dipakai buat diagnostik manual (mis. lewat
   * console) atau widget "Status AI" di sesi UI mendatang, supaya bisa
   * cepat tahu kalau ada modul yang lupa didaftarkan (rules kosong terus,
   * padahal Sesi 4-5 seharusnya sudah register).
   *
   * TODO.md #3 (Tahap 8, Duplicate Detection): field `duplicateRuleIds`
   * (id rule yang muncul >1x di `AIDecision.rules.getAll()` — normalnya
   * SELALU kosong krn `rules.register()` sendiri sudah menolak id
   * duplikat, murni jaring pengaman) & `duplicateRecommendations`
   * (kelompok id `AIDecision.recommend` berbeda yang label+target-nya
   * PERSIS SAMA — indikasi rekomendasi didaftarkan redundan 2x dgn id
   * beda). Keduanya informasional (TIDAK menjatuhkan `ok` ke false),
   * sama seperti `rulesRegistered`/`recommendationsRegistered` — hanya
   * error struktural (lihat blok try/catch di bawah) yang menjatuhkan
   * `ok`.
   *
   * TODO.md #4 (Tahap 8, Dead Code Detection): field `deadRuleIds` — id
   * rule yang terdaftar tapi `enabled===false`, artinya TIDAK PERNAH
   * dievaluasi `rules.evaluate()` (lihat `_aiFindDeadRuleIds()` di atas).
   * Sama pola dgn 2 field duplikat di atas: informasional, TIDAK
   * menjatuhkan `ok`.
   *
   * TODO.md #4b (Tahap 8, Broken Reference): field
   * `brokenRecommendationRefs` — `recommendationId` yang PERNAH tercatat
   * di `decisionLog` (hasil rule trigger nyata) tapi TIDAK/TIDAK LAGI
   * terdaftar di `AIDecision.recommend` (lihat
   * `_aiFindBrokenRecommendationRefs()` di atas). Sama pola dgn 3 field
   * lain: informasional, TIDAK menjatuhkan `ok`.
   *
   * TODO.md #4d (Tahap 8, Storage Audit): field `orphanedStorageKeys` —
   * `{ orphanedCooldownRuleIds, orphanedLearningDataRuleIds }`, ruleId di
   * `AIStore.ruleCooldowns`/`AIStore.learningData` yang rule-nya SUDAH
   * di-unregister() (lihat `_aiFindOrphanedStorageKeys()` di atas). Sama
   * pola dgn 4 field lain: informasional, TIDAK menjatuhkan `ok`.
   *
   * TODO.md #4e (Tahap 8, Performance Check): field `performance` — durasi
   * eksekusi (ms, `Date.now()` lewat `_aiMeasureMs()`/`_aiMeasureMsAsync()`
   * di ai-core.js) dari 5 fungsi yang jadi scope Performance Check per
   * `docs/PRODUCT_DECISIONS.md` § Performance Check: Context Collector
   * (`AIContext.snapshot()`), Rule Evaluation (`AIDecision.rules.evaluate()`,
   * dipanggil dgn `{simulated:true}` supaya TIDAK menandai cooldown nyata —
   * murni pengukuran, pola sama dgn `simulate()`), Recommendation
   * (`AIDecision.formatRecommendation()`, dipanggil dgn decision TERAKHIR
   * dari `decisionLog` kalau ada, atau decision sintetik minimal kalau
   * belum pernah ada decide() sama sekali — supaya tetap terukur walau
   * historinya kosong), Daily Briefing (`this.dailyBriefing({limit:1})` —
   * limit kecil khusus di jalur pengukuran ini supaya health check tetap
   * ringan, TIDAK mengubah default `dailyBriefing()` publik) & Simulation
   * (`this.simulate({})`). Kelimanya read-only (tidak ada yang menulis ke
   * store — lihat catatan masing-masing method), jadi aman dipanggil
   * berulang dari health check tanpa efek samping. Sama pola dgn 5 field
   * lain di atas: informasional, TIDAK menjatuhkan `ok` (hanya
   * `performanceError` yang dicatat kalau blok ini gagal total). */
  async healthCheck() {
    const checks = {
      busReady: typeof AIBus !== 'undefined' && typeof AIBus.emit === 'function',
      storeReady: false,
      rulesRegistered: 0,
      recommendationsRegistered: 0,
      duplicateRuleIds: [],
      duplicateRecommendations: [],
      deadRuleIds: [],
      brokenRecommendationRefs: [],
      orphanedStorageKeys: { orphanedCooldownRuleIds: [], orphanedLearningDataRuleIds: [] },
      contextReady: false,
      performance: {
        contextCollectorMs: null,
        ruleEvaluationMs: null,
        recommendationMs: null,
        dailyBriefingMs: null,
        simulationMs: null,
      },
    };
    let ok = checks.busReady;

    try {
      await aiEnsureLoaded();
      checks.storeReady = aiGetStore() != null;
      ok = ok && checks.storeReady;
    } catch (e) {
      checks.storeError = String((e && e.message) || e);
      ok = false;
    }

    try {
      checks.rulesRegistered = AIDecision.rules.getAll().length;
      checks.recommendationsRegistered = Object.keys(AIDecision.recommend.getAll()).length;
      checks.duplicateRuleIds = _aiFindDuplicateRuleIds();
      checks.duplicateRecommendations = _aiFindDuplicateRecommendations();
      checks.deadRuleIds = _aiFindDeadRuleIds();
      checks.brokenRecommendationRefs = _aiFindBrokenRecommendationRefs();
      checks.orphanedStorageKeys = _aiFindOrphanedStorageKeys();
    } catch (e) {
      checks.decisionEngineError = String((e && e.message) || e);
      ok = false;
    }

    let contextSnapshotForPerf = null;
    try {
      const timed = _aiMeasureMs(() => AIContext.snapshot());
      contextSnapshotForPerf = timed.result;
      checks.contextReady = !!(timed.result && timed.result.generatedAt);
      checks.performance.contextCollectorMs = timed.ms;
    } catch (e) {
      checks.contextError = String((e && e.message) || e);
      ok = false;
    }

    try {
      checks.performance.ruleEvaluationMs = _aiMeasureMs(
        () => AIDecision.rules.evaluate(Object.assign({}, contextSnapshotForPerf, { simulated: true })),
      ).ms;

      const store = aiGetStore();
      const log = (store && Array.isArray(store.decisionLog)) ? store.decisionLog : [];
      const lastDecision = log.length ? log[log.length - 1] : {
        id: 'perf-check', ruleId: null, severity: 'info', message: '', recommendationId: null,
      };
      checks.performance.recommendationMs = _aiMeasureMs(
        () => AIDecision.formatRecommendation(lastDecision),
      ).ms;
    } catch (e) {
      checks.performanceError = String((e && e.message) || e);
    }

    try {
      checks.performance.dailyBriefingMs = (await _aiMeasureMsAsync(
        () => this.dailyBriefing({ limit: 1 }),
      )).ms;
      checks.performance.simulationMs = (await _aiMeasureMsAsync(
        () => this.simulate({}),
      )).ms;
    } catch (e) {
      checks.performanceError = String((e && e.message) || e);
    }

    return { ok, checkedAt: new Date().toISOString(), checks };
  },

  /** simulate(ctx) — jalankan rule evaluation What-If TANPA menulis apa
   * pun ke store (tidak ada decisionLog baru, tidak ada cooldown
   * tertandai) — pola sama dgn EIE ScenarioSimulator. Berguna buat UI
   * mendatang yang mau menunjukkan "kalau kondisi X, AI akan
   * merekomendasikan apa" tanpa efek samping nyata.
   *
   * Sesi 15 (Tahap 7 — Profit Simulation): kalau ctx.profit diisi (bentuk
   * sama dgn parameter LogisticsEngine.profitCalculator — totalPenjualan/
   * diskon/ongkir/biayaBBM/biayaOperasional), hasilnya ikut disertakan di
   * field `profitSimulation`, murni TAMBAHAN read-only (LogisticsEngine
   * juga tidak menulis apa pun). Kalau ctx.profit tidak diisi ATAU
   * LogisticsEngine belum di-load (mis. sandbox test yang tidak
   * memuatnya), `profitSimulation` balik `null` — kontrak lama
   * (decisions/triggered/recommendations/simulated) TIDAK berubah sama
   * sekali, jadi pemanggil existing (dailyBriefing lewat rule biasa, test
   * lama) tidak perlu tahu field baru ini.
   *
   * Sesi 33 (Tahap 7 — Delivery Simulation, TARGET sesi ini): field baru
   * `deliverySimulation` — reuse `LogisticsEngine.deliverySummary()` (§9,
   * orkestrator Tahap 3 yang SAMA PERSIS dipakai `dailyBriefing()`) supaya
   * simulasi bisa jalan utk 4 skenario What-If sekaligus dalam SATU
   * pemanggilan: perubahan harga BBM (`hargaBBM`), ongkir
   * (`jarak`/`biayaPerKm`/`beratKg`/`volumeM3`/dst — parameter
   * `smartOngkir()` yg dipanggil `deliverySummary()` di dalamnya),
   * margin (`marginPct`), & profit (`totalPenjualan`/`diskon`, dihitung
   * `deliverySummary()` lewat `profitCalculator()` internal kalau
   * `totalPenjualan` terisi) — TIDAK ada rumus/engine baru, murni
   * parameter berbeda ke fungsi yang sudah ada.
   *
   * "Data nyata" (sesuai target sesi ini): baseline `totalPenjualan`/
   * `diskon` diambil dari order Cobek pending TERAKHIR (reuse
   * `_aiLastPendingCobekOrder()`, sumber SAMA PERSIS dgn
   * `dailyBriefing().deliverySummary`, BUKAN helper baru), lalu
   * `ctx.delivery` (kalau dikasih) di-timpa di atas baseline itu — jadi
   * pemanggil bisa nguji "kalau BBM naik jadi Rp X" atau "kalau margin
   * turun jadi Y%" TERHADAP data order nyata yang sedang berjalan, tanpa
   * perlu isi ulang totalPenjualan/diskon dari nol. Kalau tidak ada order
   * pending SAMA SEKALI, `ctx.delivery` sendiri masih bisa dipakai berdiri
   * sendiri (murni skenario manual, sama seperti `ctx.profit`). Kalau
   * keduanya kosong ATAU LogisticsEngine belum di-load, `deliverySimulation`
   * balik `null` (tidak menebak data) — kontrak lama TIDAK berubah. */
  async simulate(ctx = {}) {
    const result = await AIDecision.decide(Object.assign({}, ctx, { simulated: true }));
    result.profitSimulation = (ctx.profit
      && typeof LogisticsEngine !== 'undefined'
      && typeof LogisticsEngine.profitCalculator === 'function')
      ? LogisticsEngine.profitCalculator(ctx.profit)
      : null;

    const lastPendingOrder = _aiLastPendingCobekOrder();
    const deliveryBaseline = lastPendingOrder
      ? { totalPenjualan: lastPendingOrder.total, diskon: lastPendingOrder.diskon }
      : null;
    const deliveryParams = (deliveryBaseline || ctx.delivery)
      ? Object.assign({}, deliveryBaseline, ctx.delivery)
      : null;
    result.deliverySimulation = (deliveryParams
      && typeof LogisticsEngine !== 'undefined'
      && typeof LogisticsEngine.deliverySummary === 'function')
      ? Object.assign(
        lastPendingOrder ? { sourceOrderId: lastPendingOrder.id } : {},
        LogisticsEngine.deliverySummary(deliveryParams),
      )
      : null;

    return result;
  },

  /** simulateScenarios(scenarios) — builder skenario TERSTRUKTUR (Tahap 7,
   * TARGET Sesi 45): jalankan BEBERAPA skenario What-If sekaligus dalam
   * SATU pemanggilan, masing-masing diberi LABEL eksplisit — beda dari
   * `simulate(ctx)` polos yang cuma menjalankan SATU ctx ad-hoc tanpa
   * nama/struktur (itu sebabnya `ROADMAP.md` menandai "Scenario Engine"
   * masih 🟡 walau What-If/Profit/Delivery Simulation sudah ✅).
   *
   * Sengaja MURNI TEKNIS — pembungkus terstruktur di atas `simulate()`
   * yang sudah ada, BUKAN kumpulan preset skenario bisnis baru yang
   * ditebak. Nilai BBM/margin/ongkir/dst SEPENUHNYA datang dari
   * pemanggil (persis seperti `ctx.profit`/`ctx.delivery` di
   * `simulate()`) — jadi TIDAK butuh keputusan produk soal skenario
   * spesifik apa yang "benar" utk app ini (beda dgn misal menentukan
   * "skenario BBM naik 20%" yg butuh angka bisnis nyata).
   *
   * Bentuk input FLEKSIBEL, 2 cara (biar backward-friendly dgn ctx polos
   * yang sudah biasa dipakai `simulate()`):
   * - `{name, ctx}` — cara TERSTRUKTUR, name dipakai apa adanya.
   * - ctx polos (tanpa properti `name`/`ctx`) — name di-default
   *   `"Skenario 1"`/`"Skenario 2"`/dst berdasar urutan index.
   *
   * `simulate(ctx)` DIPANGGIL APA ADANYA per skenario (TIDAK ada
   * rule/engine baru, kontrak lama `simulate()` sama sekali tidak
   * berubah) — method baru ini murni ORKESTRASI berulang + pelabelan.
   * Error di 1 skenario DITANGKAP per-item (field `error`, `result:null`)
   * supaya tidak menjatuhkan skenario lain dalam batch yang sama. Input
   * bukan array/array kosong balik `[]`, TIDAK throw. */
  async simulateScenarios(scenarios) {
    if (!Array.isArray(scenarios) || !scenarios.length) return [];
    const results = [];
    for (let i = 0; i < scenarios.length; i += 1) {
      const raw = scenarios[i];
      const isStructured = raw && typeof raw === 'object'
        && (Object.prototype.hasOwnProperty.call(raw, 'name')
          || Object.prototype.hasOwnProperty.call(raw, 'ctx'));
      const name = (isStructured && typeof raw.name === 'string' && raw.name.trim())
        ? raw.name.trim()
        : `Skenario ${i + 1}`;
      const ctx = isStructured ? (raw.ctx || {}) : (raw || {});
      try {
        // eslint-disable-next-line no-await-in-loop -- skenario dijalankan
        // berurutan dgn sengaja (bukan Promise.all) supaya urutan hasil di
        // `results` PERSIS sama dgn urutan input, gampang dipetakan UI.
        const result = await this.simulate(ctx);
        results.push({ name, ctx, result, error: null });
      } catch (e) {
        results.push({ name, ctx, result: null, error: String((e && e.message) || e) });
      }
    }
    return results;
  },

  /** buildPrompt(purpose, extra) — rangkai teks prompt siap pakai buat
   * pemanggilan LLM di masa depan (belum ada pemanggilan LLM di file ini
   * sama sekali — murni penyusun teks). Prinsip sama dgn catatan di
   * economic-intelligence/engine/insight-generator.js: LLM TIDAK PERNAH
   * menggantikan rule engine untuk angka/keputusan — prompt ini hanya
   * dipakai kalau suatu saat ada lapisan yang MERANGKAI BAHASA dari hasil
   * yang sudah dihitung rule engine, bukan untuk membiarkan LLM
   * memutuskan sendiri. */
  async buildPrompt(purpose, extra = {}) {
    const briefing = await this.dailyBriefing({ limit: 5 });
    const lines = [
      `Tujuan: ${typeof purpose === 'string' && purpose.trim() ? purpose.trim() : '(tidak ditentukan)'}`,
      `Waktu: ${briefing.generatedAt}`,
      `Jumlah keputusan AI terbaru: ${briefing.recentDecisions.length}`,
    ];
    briefing.recentDecisions.forEach((d, i) => {
      lines.push(`${i + 1}. [${d.severity}] ${d.message}`);
    });
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach((key) => {
        lines.push(`${key}: ${JSON.stringify(extra[key])}`);
      });
    }
    return lines.join('\n');
  },
  /** wireEvents() — Sesi 6: satu-satunya titik yang menyambungkan event
   * bisnis ('finance.updated','asset.updated','vehicle.updated',
   * 'delivery.created') ke AIDecision.decide(). Dipanggil SEKALI saat
   * app boot (lihat init() di self-test.js). Sengaja idempotent (guard
   * _wired) supaya aman kalau termanggil dobel. TIDAK di-debounce dgn
   * sengaja (setTimeout tidak reliable di semua konteks test/sandbox) —
   * decide() sendiri murah (baca D + rule evaluation ringan), jadi
   * dipanggil langsung tiap event tanpa delay tambahan. */
  _wired: false,
  wireEvents() {
    if (this._wired) return;
    if (typeof AIBus === 'undefined' || typeof AIBus.on !== 'function') return;
    const handle = (eventName) => (payload) => {
      AIDecision.decide({ event: eventName, payload }).catch((e) => {
        console.warn('[AIService] decide() gagal untuk event "' + eventName + '":', e);
      });
    };
    ['finance.updated', 'asset.updated', 'vehicle.updated', 'delivery.created'].forEach((evt) => {
      AIBus.on(evt, handle(evt));
    });
    this._wired = true;
  },
};

if (typeof window !== 'undefined') {
  window.AIService = AIService;
}
