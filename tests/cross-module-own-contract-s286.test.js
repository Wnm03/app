'use strict';
// tests/cross-module-own-contract-s286.test.js — S286 lanjutan, menutup
// TEMUAN AUDIT: 11 file modules/cross/* SUDAH ikut ditest di
// cross-module-dependency-graph-s286.test.js (graph siklus + 1 rantai
// end-to-end lewat ActionQueue), TAPI belum satupun punya test kontrak
// FUNGSIONAL milik file itu sendiri (guard {ok:false}, arithmetic
// murni yang jadi tanggung jawabnya, dan utk presenter: perilaku SILENT/
// container-tidak-ada). File ini menutup semuanya, dikelompokkan per
// prioritas audit:
//
//   🟠 TINGGI  — life-dashboard-summary-api.js, unified-ai-briefing.js
//   🟡 SEDANG  — unified-summary-api.js, cross-ai-hook.js,
//                finance-vehicle-cross-summary.js, cross-dashboard-card.js
//   🟢 RENDAH  — 5 presenter DOM-bound: cross-insight-presenter.js,
//                personal-overview-presenter.js,
//                unified-briefing-presenter.js, cross-module-widgets.js,
//                unified-dashboard-home.js
//
// Pola: loadSource (pola sama tests/cross-module-dependency-graph-s286.
// test.js) + stub minimal HANYA utk dependency langsung file yang
// diuji (bukan rantai 17 file — itu sudah tanggung jawab test graph),
// supaya tiap file benar2 diuji SENDIRIAN (unit, bukan integrasi).
// Untuk 5 file presenter: dipakai `makeEl`/`byId` (pola sama
// tests/dash-card-show-hide.test.js) supaya innerHTML bisa diperiksa.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeEl(id) {
  return { id, innerHTML: '' };
}

function domCtx(ids) {
  const byId = Object.create(null);
  ids.forEach((id) => { byId[id] = makeEl(id); });
  return {
    byId,
    document: { getElementById: (id) => byId[id] || null },
  };
}

// =====================================================================
// 🟠 TINGGI — life-dashboard-summary-api.js
// =====================================================================

test('LifeDashboardSummaryAPI.summary(): {ok:false} kalau UnifiedSummaryAPI belum dimuat', () => {
  const ctx = loadSource(
    ['modules/cross/life-dashboard-summary-api.js'],
    {},
    ['LifeDashboardSummaryAPI'],
  );
  const r = ctx.LifeDashboardSummaryAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'UnifiedSummaryAPI belum dimuat');
});

test('LifeDashboardSummaryAPI.summary(): {ok:false} dari UnifiedSummaryAPI diteruskan apa adanya, tidak dibungkus ulang', () => {
  const ctx = loadSource(
    ['modules/cross/life-dashboard-summary-api.js'],
    { UnifiedSummaryAPI: { summary: () => ({ ok: false, reason: 'stub down' }) } },
    ['LifeDashboardSummaryAPI'],
  );
  const r = ctx.LifeDashboardSummaryAPI.summary();
  assert.deepEqual(r, { ok: false, reason: 'stub down' });
});

test('LifeDashboardSummaryAPI.summary(): finance/vehicle/insightCount 100% reuse dari UnifiedSummaryAPI, briefing dari UnifiedAIBriefing apa adanya, priorityCount = budgetOver+overdue+dueSoon', () => {
  const finance = { ok: true, budget: { ok: true, overCount: 2 } };
  const vehicle = { ok: true, reminder: { overdueCount: 1, dueSoonCount: 3 } };
  const ctx = loadSource(
    ['modules/cross/life-dashboard-summary-api.js'],
    {
      UnifiedSummaryAPI: { summary: () => ({ ok: true, finance, vehicle, insightCount: 7 }) },
      UnifiedAIBriefing: { generate: () => ({ ok: true, text: 'ringkasan x', parts: ['ringkasan x'] }) },
    },
    ['LifeDashboardSummaryAPI'],
  );
  const r = ctx.LifeDashboardSummaryAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.finance, finance);
  assert.equal(r.vehicle, vehicle);
  assert.equal(r.insightCount, 7);
  assert.deepEqual(r.briefing, { ok: true, text: 'ringkasan x', parts: ['ringkasan x'] });
  assert.equal(r.priorityCount, 2 + 1 + 3);
});

test('LifeDashboardSummaryAPI.summary(): briefing {ok:false} kalau UnifiedAIBriefing belum dimuat, priorityCount tetap dihitung (0 kalau counter kosong)', () => {
  const ctx = loadSource(
    ['modules/cross/life-dashboard-summary-api.js'],
    {
      UnifiedSummaryAPI: { summary: () => ({ ok: true, finance: { ok: false }, vehicle: { ok: false }, insightCount: 0 }) },
    },
    ['LifeDashboardSummaryAPI'],
  );
  const r = ctx.LifeDashboardSummaryAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.briefing.ok, false);
  assert.equal(r.briefing.reason, 'UnifiedAIBriefing belum dimuat');
  assert.equal(r.priorityCount, 0);
});

// =====================================================================
// 🟠 TINGGI — unified-ai-briefing.js
// =====================================================================

test('UnifiedAIBriefing.generate(): {ok:false} kalau UnifiedSummaryAPI belum dimuat', () => {
  const ctx = loadSource(['modules/cross/unified-ai-briefing.js'], {}, ['UnifiedAIBriefing']);
  const r = ctx.UnifiedAIBriefing.generate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'UnifiedSummaryAPI belum dimuat');
});

test('UnifiedAIBriefing.generate(): {ok:false} dari UnifiedSummaryAPI diteruskan apa adanya', () => {
  const ctx = loadSource(
    ['modules/cross/unified-ai-briefing.js'],
    { UnifiedSummaryAPI: { summary: () => ({ ok: false, reason: 'down' }) } },
    ['UnifiedAIBriefing'],
  );
  assert.deepEqual(ctx.UnifiedAIBriefing.generate(), { ok: false, reason: 'down' });
});

test('UnifiedAIBriefing.generate(): {ok:false, reason} kalau finance+vehicle+insightCount semua kosong (0 hal diceritakan)', () => {
  const ctx = loadSource(
    ['modules/cross/unified-ai-briefing.js'],
    { UnifiedSummaryAPI: { summary: () => ({ ok: true, finance: { ok: false }, vehicle: { ok: false }, insightCount: 0 }) } },
    ['UnifiedAIBriefing'],
  );
  const r = ctx.UnifiedAIBriefing.generate();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'Tidak ada data untuk briefing');
});

test('UnifiedAIBriefing.generate(): merangkai health score finance + fleet + total perhatian (budgetOver+vehicleOverdue) + insightCount jadi 1 teks', () => {
  const ctx = loadSource(
    ['modules/cross/unified-ai-briefing.js'],
    {
      UnifiedSummaryAPI: {
        summary: () => ({
          ok: true,
          finance: { ok: true, healthScore: { score: 72, label: 'Sehat' }, budget: { ok: true, overCount: 1 } },
          vehicle: { ok: true, intelligence: { fleet: { totalVehicles: 2, avgHealth: 80 } }, reminder: { overdueCount: 1 } },
          insightCount: 3,
        }),
      },
    },
    ['UnifiedAIBriefing'],
  );
  const r = ctx.UnifiedAIBriefing.generate();
  assert.equal(r.ok, true);
  assert.equal(r.parts.length, 4);
  assert.match(r.parts[0], /72\/100 \(Sehat\)/);
  assert.match(r.parts[1], /80\/100 dari 2 kendaraan/);
  assert.match(r.parts[2], /2 hal butuh perhatian \(1 anggaran lewat batas, 1 servis\/pajak\/BBM lewat jatuh tempo\)/);
  assert.match(r.parts[3], /3 insight tersedia hari ini/);
  assert.equal(r.text, r.parts.join(' '));
});

test('UnifiedAIBriefing.generate(): totalAttention 0 -> kalimat "Tidak ada hal mendesak"', () => {
  const ctx = loadSource(
    ['modules/cross/unified-ai-briefing.js'],
    {
      UnifiedSummaryAPI: {
        summary: () => ({
          ok: true,
          finance: { ok: true, healthScore: { score: 90, label: 'Sangat Sehat' }, budget: { ok: true, overCount: 0 } },
          vehicle: { ok: false },
          insightCount: 0,
        }),
      },
    },
    ['UnifiedAIBriefing'],
  );
  const r = ctx.UnifiedAIBriefing.generate();
  assert.equal(r.ok, true);
  assert.ok(r.parts.some((p) => p.includes('Tidak ada hal mendesak')));
});

// =====================================================================
// 🟡 SEDANG — unified-summary-api.js
// =====================================================================

test('UnifiedSummaryAPI.summary(): {ok:false} kalau CrossAIHook belum dimuat', () => {
  const ctx = loadSource(['modules/cross/unified-summary-api.js'], {}, ['UnifiedSummaryAPI']);
  const r = ctx.UnifiedSummaryAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'CrossAIHook belum dimuat');
});

test('UnifiedSummaryAPI.summary(): {ok:false} dari CrossAIHook diteruskan apa adanya', () => {
  const ctx = loadSource(
    ['modules/cross/unified-summary-api.js'],
    { CrossAIHook: { getAIHook: () => ({ ok: false, reason: 'down' }) } },
    ['UnifiedSummaryAPI'],
  );
  assert.deepEqual(ctx.UnifiedSummaryAPI.summary(), { ok: false, reason: 'down' });
});

test('UnifiedSummaryAPI.summary(): insightCount = panjang finance.insights + vehicle.intelligence.insights (murni penjumlahan panjang array, 0 rebuild list)', () => {
  const finance = { ok: true, insights: [{ type: 'warning' }, { type: 'info' }] };
  const vehicle = { ok: true, intelligence: { insights: [{ type: 'info' }] } };
  const ctx = loadSource(
    ['modules/cross/unified-summary-api.js'],
    { CrossAIHook: { getAIHook: () => ({ ok: true, finance, vehicle }) } },
    ['UnifiedSummaryAPI'],
  );
  const r = ctx.UnifiedSummaryAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.finance, finance);
  assert.equal(r.vehicle, vehicle);
  assert.equal(r.insightCount, 3);
});

test('UnifiedSummaryAPI.summary(): insightCount 0 kalau finance/vehicle {ok:false} atau insights bukan array', () => {
  const ctx = loadSource(
    ['modules/cross/unified-summary-api.js'],
    { CrossAIHook: { getAIHook: () => ({ ok: true, finance: { ok: false }, vehicle: { ok: true, intelligence: {} } }) } },
    ['UnifiedSummaryAPI'],
  );
  assert.equal(ctx.UnifiedSummaryAPI.summary().insightCount, 0);
});

// =====================================================================
// 🟡 SEDANG — cross-ai-hook.js
// =====================================================================

test('CrossAIHook.getAIHook(): {ok:false} kalau CrossSummaryAPI belum dimuat', () => {
  const ctx = loadSource(['modules/cross/cross-ai-hook.js'], {}, ['CrossAIHook']);
  const r = ctx.CrossAIHook.getAIHook();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'CrossSummaryAPI belum dimuat');
});

test('CrossAIHook.getAIHook(): 100% wrapper tipis — mengembalikan persis objek dari CrossSummaryAPI.summary() (0 transformasi)', () => {
  const stub = { ok: true, finance: { x: 1 }, vehicle: { y: 2 } };
  const ctx = loadSource(
    ['modules/cross/cross-ai-hook.js'],
    { CrossSummaryAPI: { summary: () => stub } },
    ['CrossAIHook'],
  );
  assert.equal(ctx.CrossAIHook.getAIHook(), stub);
});

// =====================================================================
// 🟡 SEDANG — finance-vehicle-cross-summary.js
// =====================================================================

test('CrossSummaryAPI.summary(): {ok:false} kalau FinanceDashboard belum dimuat', () => {
  const ctx = loadSource(
    ['modules/cross/finance-vehicle-cross-summary.js'],
    { VehicleAIHook: { fleetSummary: () => ({ ok: true }) } },
    ['CrossSummaryAPI'],
  );
  const r = ctx.CrossSummaryAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'FinanceDashboard belum dimuat');
});

test('CrossSummaryAPI.summary(): {ok:false} kalau VehicleAIHook belum dimuat (FinanceDashboard sudah)', () => {
  const ctx = loadSource(
    ['modules/cross/finance-vehicle-cross-summary.js'],
    { FinanceDashboard: { getAIHook: () => ({ ok: true }) } },
    ['CrossSummaryAPI'],
  );
  const r = ctx.CrossSummaryAPI.summary();
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'VehicleAIHook belum dimuat');
});

test('CrossSummaryAPI.summary(): {ok:true, finance, vehicle} — hasil FinanceDashboard.getAIHook()/VehicleAIHook.fleetSummary() apa adanya, 0 transformasi', () => {
  const finance = { ok: true, healthScore: { score: 55 } };
  const vehicle = { ok: true, intelligence: { fleet: { totalVehicles: 1 } } };
  const ctx = loadSource(
    ['modules/cross/finance-vehicle-cross-summary.js'],
    { FinanceDashboard: { getAIHook: () => finance }, VehicleAIHook: { fleetSummary: () => vehicle } },
    ['CrossSummaryAPI'],
  );
  const r = ctx.CrossSummaryAPI.summary();
  assert.equal(r.ok, true);
  assert.equal(r.finance, finance);
  assert.equal(r.vehicle, vehicle);
});

// =====================================================================
// 🟡 SEDANG — cross-dashboard-card.js
// =====================================================================

function crossDashCtx(hookResult, ids = ['crossDashGrid']) {
  const dom = domCtx(ids);
  const ctx = loadSource(
    ['modules/cross/cross-dashboard-card.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      CrossAIHook: hookResult === undefined ? undefined : { getAIHook: () => hookResult },
    },
    ['CrossDashboardCard'],
  );
  return { ctx, byId: dom.byId };
}

test('CrossDashboardCard.render(): container tidak ada di halaman -> aman diam2 (tidak throw)', () => {
  const { ctx } = crossDashCtx({ ok: true, finance: {}, vehicle: {} }, []);
  assert.doesNotThrow(() => ctx.CrossDashboardCard.render());
});

test('CrossDashboardCard.render(): CrossAIHook belum dimuat -> empty-state', () => {
  const { ctx, byId } = crossDashCtx(undefined);
  ctx.CrossDashboardCard.render();
  assert.match(byId.crossDashGrid.innerHTML, /Data cross summary belum tersedia/);
});

test('CrossDashboardCard.render(): getAIHook() {ok:false} -> empty-state', () => {
  const { ctx, byId } = crossDashCtx({ ok: false });
  ctx.CrossDashboardCard.render();
  assert.match(byId.crossDashGrid.innerHTML, /Data cross summary belum tersedia/);
});

test('CrossDashboardCard.render(): hanya render 1 kartu "Total Perhatian Gabungan" (kartu health finance/vehicle sengaja DIHAPUS dari output, dedup)', () => {
  const { ctx, byId } = crossDashCtx({
    ok: true,
    finance: { ok: true, budget: { ok: true, overCount: 2 } },
    vehicle: { ok: true, reminder: { overdueCount: 3 } },
  });
  ctx.CrossDashboardCard.render();
  const html = byId.crossDashGrid.innerHTML;
  assert.match(html, /Total Perhatian Gabungan/);
  assert.doesNotMatch(html, /Skor Kesehatan Finansial/);
  assert.doesNotMatch(html, /Skor Kesehatan Armada/);
  assert.match(html, />5</); // 2 + 3
});

test('CrossDashboardCard._combinedAttentionCard(): murni penjumlahan budgetOver+vehicleOverdue, cls orange kalau >0 / green kalau 0', () => {
  const { ctx } = crossDashCtx({ ok: true });
  const zero = ctx.CrossDashboardCard._combinedAttentionCard({ ok: false }, { ok: false });
  assert.equal(zero.value, '0');
  assert.equal(zero.cls, 'green');
  const some = ctx.CrossDashboardCard._combinedAttentionCard(
    { ok: true, budget: { ok: true, overCount: 4 } },
    { ok: true, reminder: { overdueCount: 1 } },
  );
  assert.equal(some.value, '5');
  assert.equal(some.cls, 'orange');
});

// =====================================================================
// 🟢 RENDAH — 5 presenter DOM-bound (container tidak ada -> aman diam2;
// SILENT kalau tidak ada apa pun buat diceritakan; render() = 100%
// reuse layer data, 0 rumus di presenter)
// =====================================================================

// --- cross-insight-presenter.js ---

test('CrossInsightPresenter.render(): container tidak ada -> aman diam2', () => {
  const dom = domCtx([]);
  const ctx = loadSource(
    ['modules/cross/cross-insight-presenter.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['CrossInsightPresenter'],
  );
  assert.doesNotThrow(() => ctx.CrossInsightPresenter.render());
});

test('CrossInsightPresenter.render(): 0 insight finance+vehicle -> SILENT (innerHTML dikosongkan)', () => {
  const dom = domCtx(['crossInsightBody']);
  const ctx = loadSource(
    ['modules/cross/cross-insight-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      FinanceIntelligence: { insights: () => [] },
      VehicleIntelligence: { insights: () => [] },
    },
    ['CrossInsightPresenter'],
  );
  dom.byId.crossInsightBody.innerHTML = 'sisa lama';
  ctx.CrossInsightPresenter.render();
  assert.equal(dom.byId.crossInsightBody.innerHTML, '');
});

test('CrossInsightPresenter.render(): menggabungkan (concat) insight finance+vehicle apa adanya, ikon per type', () => {
  const dom = domCtx(['crossInsightBody']);
  const ctx = loadSource(
    ['modules/cross/cross-insight-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      FinanceIntelligence: { insights: () => [{ type: 'warning', message: 'Budget lewat' }] },
      VehicleIntelligence: { insights: () => [{ type: 'positive', message: 'Servis aman' }] },
    },
    ['CrossInsightPresenter'],
  );
  ctx.CrossInsightPresenter.render();
  const html = dom.byId.crossInsightBody.innerHTML;
  assert.match(html, /🟡 Budget lewat/);
  assert.match(html, /🟢 Servis aman/);
});

// --- personal-overview-presenter.js ---

test('PersonalOverviewPresenter.render(): container tidak ada -> aman diam2', () => {
  const dom = domCtx([]);
  const ctx = loadSource(
    ['modules/cross/personal-overview-presenter.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['PersonalOverviewPresenter'],
  );
  assert.doesNotThrow(() => ctx.PersonalOverviewPresenter.render());
});

test('PersonalOverviewPresenter.render(): LifeDashboardSummaryAPI belum dimuat / {ok:false} -> SILENT', () => {
  const dom = domCtx(['personalOverviewBody']);
  const ctx = loadSource(
    ['modules/cross/personal-overview-presenter.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['PersonalOverviewPresenter'],
  );
  dom.byId.personalOverviewBody.innerHTML = 'sisa lama';
  ctx.PersonalOverviewPresenter.render();
  assert.equal(dom.byId.personalOverviewBody.innerHTML, '');
});

test('PersonalOverviewPresenter.render(): briefText+priorityCount 0 semua -> SILENT', () => {
  const dom = domCtx(['personalOverviewBody']);
  const ctx = loadSource(
    ['modules/cross/personal-overview-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: { ok: false }, priorityCount: 0 }) },
    },
    ['PersonalOverviewPresenter'],
  );
  ctx.PersonalOverviewPresenter.render();
  assert.equal(dom.byId.personalOverviewBody.innerHTML, '');
});

test('PersonalOverviewPresenter.render(): briefText dari briefing.text apa adanya + baris prioritas sesuai priorityCount', () => {
  const dom = domCtx(['personalOverviewBody']);
  const ctx = loadSource(
    ['modules/cross/personal-overview-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      LifeDashboardSummaryAPI: { summary: () => ({ ok: true, briefing: { ok: true, text: 'Semua terkendali.' }, priorityCount: 2 }) },
    },
    ['PersonalOverviewPresenter'],
  );
  ctx.PersonalOverviewPresenter.render();
  const html = dom.byId.personalOverviewBody.innerHTML;
  assert.match(html, /Semua terkendali\./);
  assert.match(html, /2 hal butuh perhatian/);
});

// --- unified-briefing-presenter.js ---

test('UnifiedBriefingPresenter.render(): kedua container tidak ada -> aman diam2', () => {
  const dom = domCtx([]);
  const ctx = loadSource(
    ['modules/cross/unified-briefing-presenter.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['UnifiedBriefingPresenter'],
  );
  assert.doesNotThrow(() => ctx.UnifiedBriefingPresenter.render());
});

test('UnifiedBriefingPresenter.render(): UnifiedAIBriefing {ok:false} -> kedua container (#crossBriefBody & #aiUnifiedBriefBody) dikosongkan independen', () => {
  const dom = domCtx(['crossBriefBody', 'aiUnifiedBriefBody']);
  dom.byId.crossBriefBody.innerHTML = 'lama1';
  dom.byId.aiUnifiedBriefBody.innerHTML = 'lama2';
  const ctx = loadSource(
    ['modules/cross/unified-briefing-presenter.js'],
    { document: dom.document, escapeHtml: (s) => String(s), UnifiedAIBriefing: { generate: () => ({ ok: false }) } },
    ['UnifiedBriefingPresenter'],
  );
  ctx.UnifiedBriefingPresenter.render();
  assert.equal(dom.byId.crossBriefBody.innerHTML, '');
  assert.equal(dom.byId.aiUnifiedBriefBody.innerHTML, '');
});

test('UnifiedBriefingPresenter.render(): satu kali generate(), teks SAMA ditulis ke #crossBriefBody & #aiUnifiedBriefBody', () => {
  const dom = domCtx(['crossBriefBody', 'aiUnifiedBriefBody']);
  let calls = 0;
  const ctx = loadSource(
    ['modules/cross/unified-briefing-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      UnifiedAIBriefing: { generate: () => { calls++; return { ok: true, text: 'Briefing gabungan.' }; } },
    },
    ['UnifiedBriefingPresenter'],
  );
  ctx.UnifiedBriefingPresenter.render();
  assert.equal(calls, 1);
  assert.match(dom.byId.crossBriefBody.innerHTML, /Briefing gabungan\./);
  assert.match(dom.byId.aiUnifiedBriefBody.innerHTML, /Briefing gabungan\./);
});

test('UnifiedBriefingPresenter.render(): kalau hanya salah satu container ada di halaman, tetap terisi (independen)', () => {
  const dom = domCtx(['crossBriefBody']);
  const ctx = loadSource(
    ['modules/cross/unified-briefing-presenter.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      UnifiedAIBriefing: { generate: () => ({ ok: true, text: 'X.' }) },
    },
    ['UnifiedBriefingPresenter'],
  );
  assert.doesNotThrow(() => ctx.UnifiedBriefingPresenter.render());
  assert.match(dom.byId.crossBriefBody.innerHTML, /X\./);
});

// --- cross-module-widgets.js ---

test('CrossModuleWidgets.render(): container tidak ada -> aman diam2', () => {
  const dom = domCtx([]);
  const ctx = loadSource(
    ['modules/cross/cross-module-widgets.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['CrossModuleWidgets'],
  );
  assert.doesNotThrow(() => ctx.CrossModuleWidgets.render());
});

test('CrossModuleWidgets.render(): LifeDashboardSummaryAPI belum dimuat / {ok:false} -> empty-state', () => {
  const dom = domCtx(['crossWidgetsGrid']);
  const ctx = loadSource(
    ['modules/cross/cross-module-widgets.js'],
    { document: dom.document, escapeHtml: (s) => String(s) },
    ['CrossModuleWidgets'],
  );
  ctx.CrossModuleWidgets.render();
  assert.match(dom.byId.crossWidgetsGrid.innerHTML, /Data life dashboard belum tersedia/);
});

test('CrossModuleWidgets.render(): 2 kartu (Insight Tersedia/Prioritas Aktif) 100% reuse insightCount/priorityCount apa adanya, cls orange/green sesuai >0', () => {
  const dom = domCtx(['crossWidgetsGrid']);
  const ctx = loadSource(
    ['modules/cross/cross-module-widgets.js'],
    {
      document: dom.document,
      escapeHtml: (s) => String(s),
      LifeDashboardSummaryAPI: { summary: () => ({ ok: true, insightCount: 5, priorityCount: 0 }) },
    },
    ['CrossModuleWidgets'],
  );
  ctx.CrossModuleWidgets.render();
  const html = dom.byId.crossWidgetsGrid.innerHTML;
  assert.match(html, /Insight Tersedia/);
  assert.match(html, /Prioritas Aktif/);
  assert.match(html, />5</);
  assert.match(html, />0</);
});

// --- unified-dashboard-home.js ---

test('UnifiedDashboardHome.render(): memanggil ketiga presenter (PersonalOverviewPresenter/CrossModuleWidgets/LifePriorityPanel) berurutan, murni orchestrator (0 rumus sendiri)', () => {
  const calls = [];
  const ctx = loadSource(
    ['modules/cross/unified-dashboard-home.js'],
    {
      PersonalOverviewPresenter: { render: () => calls.push('overview') },
      CrossModuleWidgets: { render: () => calls.push('widgets') },
      LifePriorityPanel: { render: () => calls.push('priority') },
    },
    ['UnifiedDashboardHome'],
  );
  ctx.UnifiedDashboardHome.render();
  assert.deepEqual(calls, ['overview', 'widgets', 'priority']);
});

test('UnifiedDashboardHome.render(): kalau salah satu presenter belum dimuat, sisanya tetap dipanggil (guard per-presenter, tidak throw)', () => {
  const calls = [];
  const ctx = loadSource(
    ['modules/cross/unified-dashboard-home.js'],
    {
      CrossModuleWidgets: { render: () => calls.push('widgets') },
      LifePriorityPanel: { render: () => calls.push('priority') },
    },
    ['UnifiedDashboardHome'],
  );
  assert.doesNotThrow(() => ctx.UnifiedDashboardHome.render());
  assert.deepEqual(calls, ['widgets', 'priority']);
});
