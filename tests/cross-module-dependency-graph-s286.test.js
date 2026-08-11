'use strict';
// tests/cross-module-dependency-graph-s286.test.js — S286 lanjutan,
// menutup TEMUAN AUDIT PALING TINGGI: dokumentasi (komentar header
// modules/cross/unified-ai-briefing.js § "ARSITEKTUR (S116 — Circular
// Dependency Hotfix)") merujuk tests/cross-module-graph-static.test.js +
// tests/decision-center-dependency-graph.test.js sbg regression-guard
// permanen thd bug nyata Sesi 115-117 (`UnifiedAIBriefing -> ActionQueue
// -> DecisionCenterAPI` sempat circular -> "Maximum call stack size
// exceeded" saat rantai modul ASLI dimuat bersamaan) — TERNYATA KEDUA
// FILE ITU TIDAK ADA di source (dicek grep/find, 0 hasil). File ini
// menggantikan keduanya sekaligus, isi digabung supaya tidak menambah
// nama file test baru dgn tanggung jawab yang tumpang tindih.
//
// 2 lapis perlindungan (pola sama ROH-nya dgn S117/S118 — "regex-parse
// source ASLI, bukan daftar hardcode" & "muat rantai modul ASLI, bukan
// mock", lihat catatan docs/CLAUDE.md § Sesi 117-118):
//
//   1. STATIC — baca ulang ke-17 modules/cross/*.js APA ADANYA, bangun
//      graph dependency dari referensi identifier antar-file (generik,
//      BUKAN daftar edge hardcode), lalu jalankan deteksi siklus (DFS).
//      Kalau ada siklus BARU yang masuk lagi ke modules/cross/* di masa
//      depan (bukan cuma kombinasi 3 nama yang sudah diketahui), test
//      ini tetap menangkapnya.
//   2. RUNTIME — muat SEMUA 17 file cross ASLI bersamaan (urutan build
//      SEBENARNYA dari scripts/build.js), + stub minimal utk 4
//      dependency LEAF di luar modules/cross/ (FinanceDashboard/
//      VehicleAIHook/FinanceIntelligence/VehicleIntelligence — domain
//      lain, sudah tertes sendiri di file lain, di sini cukup di-stub
//      krn bukan bagian dari graph yang diaudit), lalu panggil
//      konsumen paling hilir (ActionQueue.getQueue()) end-to-end. Kalau
//      siklus balik terjadi, panggilan ini akan RangeError "Maximum
//      call stack size exceeded" — test gagal otomatis tanpa perlu
//      assertion tambahan.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');
const CROSS_DIR = path.join(ROOT, 'modules', 'cross');

// Urutan load ASLI dari scripts/build.js (Sesi 87-90, Batch 8) — SATU-
// SATUNYA tempat urutan ini didefinisikan ulang di luar build.js sendiri,
// sengaja disalin literal (bukan di-parse otomatis dari build.js) supaya
// test ini tidak diam-diam lolos kalau build.js berubah urutan tanpa
// sepengetahuan reviewer.
const BUILD_ORDER = [
  'finance-vehicle-cross-summary.js',
  'cross-ai-hook.js',
  'cross-dashboard-card.js',
  'cross-insight-presenter.js',
  'unified-summary-api.js',
  'unified-ai-briefing.js',
  'unified-briefing-presenter.js',
  'life-dashboard-summary-api.js',
  'priority-engine.js',
  'personal-overview-presenter.js',
  'cross-module-widgets.js',
  'life-priority-panel.js',
  'unified-dashboard-home.js',
  'decision-center-api.js',
  'recommendation-panel.js',
  'action-queue.js',
  'decision-center-home.js',
];

// ---------------------------------------------------------------------
// Bagian 1: STATIC — bangun graph dari source ASLI, deteksi siklus.
// ---------------------------------------------------------------------

function stripComments(src) {
  // Buang block comment (/* ... */) & line comment (// ...) SEBELUM
  // dianalisis — komentar header banyak file di sini menyebut nama file
  // lain sbg PROSA (mis. "presenter-presenternya (RecommendationPanel/
  // ActionQueue) ada di file terpisah"), yang BUKAN referensi kode nyata
  // & akan salah terdeteksi sbg edge kalau tidak dibuang dulu.
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function buildCrossModuleGraph() {
  const files = fs.readdirSync(CROSS_DIR).filter((f) => f.endsWith('.js'));
  const nameToFile = {};
  const fileSrc = {};
  for (const f of files) {
    const raw = fs.readFileSync(path.join(CROSS_DIR, f), 'utf8');
    const src = stripComments(raw);
    fileSrc[f] = src;
    const m = src.match(/^const ([A-Za-z0-9_]+) = \{/m);
    if (m) nameToFile[m[1]] = f;
  }
  // edges[f] = daftar file lain yang DIBACA oleh f (f depends on X).
  const edges = {};
  for (const f of files) {
    edges[f] = [];
    // Buang baris deklarasi sendiri ("const Name = {") supaya identifier
    // sendiri tidak dianggap referensi ke diri sendiri.
    const bodyWithoutOwnDecl = fileSrc[f].replace(/^const [A-Za-z0-9_]+ = \{/m, '');
    for (const [name, otherFile] of Object.entries(nameToFile)) {
      if (otherFile === f) continue;
      const re = new RegExp(`\\b${name}\\b`);
      if (re.test(bodyWithoutOwnDecl)) edges[f].push(otherFile);
    }
  }
  return { files, edges, nameToFile };
}

test('Static: graph dependency modules/cross/*.js 0 siklus (deteksi generik, bukan daftar hardcode)', () => {
  const { files, edges } = buildCrossModuleGraph();

  // DFS cycle detection standar (white/gray/black).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  files.forEach((f) => { color[f] = WHITE; });
  const cyclePath = [];

  function dfs(f, stack) {
    color[f] = GRAY;
    stack.push(f);
    for (const dep of edges[f]) {
      if (color[dep] === GRAY) {
        cyclePath.push(...stack.slice(stack.indexOf(dep)), dep);
        return true;
      }
      if (color[dep] === WHITE && dfs(dep, stack)) return true;
    }
    stack.pop();
    color[f] = BLACK;
    return false;
  }

  let found = false;
  for (const f of files) {
    if (color[f] === WHITE && dfs(f, [])) { found = true; break; }
  }

  assert.equal(found, false, `Siklus terdeteksi di modules/cross/*.js: ${cyclePath.join(' -> ')}`);
});

test('Static: 3 file inti riwayat bug S115-117 (UnifiedAIBriefing/ActionQueue/DecisionCenterAPI) tetap 1 arah (hilir -> hulu), tidak balik', () => {
  const { edges } = buildCrossModuleGraph();
  // UnifiedAIBriefing (hulu) TIDAK BOLEH membaca ActionQueue/
  // DecisionCenterAPI/LifeDashboardSummaryAPI (hilir) — persis larangan
  // eksplisit di komentar header unified-ai-briefing.js.
  const briefingDeps = edges['unified-ai-briefing.js'] || [];
  assert.equal(briefingDeps.includes('action-queue.js'), false);
  assert.equal(briefingDeps.includes('decision-center-api.js'), false);
  assert.equal(briefingDeps.includes('life-dashboard-summary-api.js'), false);
  // Arah yang BENAR: ActionQueue -> DecisionCenterAPI (hilir membaca hulu).
  assert.equal((edges['action-queue.js'] || []).includes('decision-center-api.js'), true);
});

// ---------------------------------------------------------------------
// Bagian 2: RUNTIME — muat ke-17 file ASLI bersamaan, panggil rantai
// nyata end-to-end lewat konsumen paling hilir.
// ---------------------------------------------------------------------

function loadRealCrossChain() {
  const files = BUILD_ORDER.map((f) => path.join('modules', 'cross', f));
  return loadSource(
    files,
    {
      escapeHtml: (s) => String(s),
      // 4 leaf dependency di luar modules/cross/ — domain lain, sudah
      // tertes sendiri di file test masing-masing, di sini cukup stub
      // data realistis krn bukan bagian graph yang diaudit sesi ini.
      FinanceDashboard: {
        getAIHook: () => ({
          ok: true,
          healthScore: { score: 72, label: 'Sehat' },
          budget: { ok: true, overCount: 1, items: [{ name: 'Hiburan', over: true }, { name: 'Makan', over: false }] },
          insights: [{ type: 'warning', message: 'Anggaran Hiburan lewat batas' }],
        }),
      },
      VehicleAIHook: {
        fleetSummary: () => ({
          ok: true,
          intelligence: { fleet: { totalVehicles: 2, avgHealth: 80 }, insights: [{ type: 'info', message: 'Servis mendatang' }] },
          reminder: {
            overdueCount: 1, dueSoonCount: 1,
            all: [
              { type: 'oli', severity: 'overdue', message: 'Ganti oli telat' },
              { type: 'pajak', severity: 'due-soon', message: 'Pajak jatuh tempo minggu depan' },
              { type: 'ban', severity: 'ok', message: 'Aman' },
            ],
          },
        }),
      },
      FinanceIntelligence: {
        insights: () => [{ type: 'warning', message: 'Margin Cobek tipis' }],
      },
      VehicleIntelligence: {
        insights: () => [{ type: 'info', message: 'Cek ban' }],
      },
    },
    ['ActionQueue', 'RecommendationPanel', 'DecisionCenterAPI', 'PriorityEngine', 'UnifiedAIBriefing', 'LifeDashboardSummaryAPI'],
  );
}

test('Runtime: rantai modul ASLI (17 file, urutan build sebenarnya) dimuat bersamaan tanpa error', () => {
  assert.doesNotThrow(() => loadRealCrossChain());
});

test('Runtime: ActionQueue.getQueue() end-to-end lewat rantai ASLI — tidak RangeError/stack overflow, data mengalir sampai hilir', () => {
  const ctx = loadRealCrossChain();
  let result;
  assert.doesNotThrow(() => { result = ctx.ActionQueue.getQueue(); });
  assert.equal(result.ok, true);
  assert.equal(Array.isArray(result.priorityItems), true);
});

test('Runtime: RecommendationPanel.getRecommendations() end-to-end lewat rantai ASLI — hasil filter type==="warning" dari finance+vehicle', () => {
  const ctx = loadRealCrossChain();
  const result = ctx.RecommendationPanel.getRecommendations();
  assert.equal(result.ok, true);
  assert.equal(result.recommendations.length, 1); // hanya insight finance yg 'warning' (vehicle stub 'info', tidak lolos filter)
  assert.equal(result.recommendations[0].message, 'Margin Cobek tipis');
});

test('Runtime: UnifiedAIBriefing.generate() -> LifeDashboardSummaryAPI.summary() -> DecisionCenterAPI.summary() konsisten (briefing sama persis diteruskan naik)', () => {
  const ctx = loadRealCrossChain();
  const briefing = ctx.UnifiedAIBriefing.generate();
  const life = ctx.LifeDashboardSummaryAPI.summary();
  const decision = ctx.DecisionCenterAPI.summary();
  assert.equal(briefing.ok, true);
  assert.equal(life.briefing.text, briefing.text);
  assert.equal(decision.briefing.text, briefing.text);
});

test('Runtime: PriorityEngine.getItems() end-to-end lewat rantai ASLI — item finance over + vehicle overdue/due-soon muncul', () => {
  const ctx = loadRealCrossChain();
  const p = ctx.PriorityEngine.getItems();
  assert.equal(p.ok, true);
  assert.equal(p.count, p.items.length);
  assert.equal(p.count, 3); // 1 vehicle overdue + 1 finance over + 1 vehicle due-soon
  const order = p.items.map((i) => `${i.kind}:${i.severity}`).join(',');
  assert.equal(order, 'vehicle:overdue,finance:over,vehicle:due-soon');
});
