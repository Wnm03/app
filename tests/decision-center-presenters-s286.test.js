'use strict';
// tests/decision-center-presenters-s286.test.js — S286 lanjutan, prioritas
// RENDAH dari audit (temuan: modules/cross/action-queue.js,
// recommendation-panel.js, decision-center-home.js, life-priority-panel.js
// 0 test sama sekali). Semua 4 file ini murni presenter ("UI HANYA
// presenter", lihat komentar header masing-masing file) — sesuai batasan
// harness (loadSource TIDAK cocok utk fungsi yang baca/tulis DOM, lihat
// tests/helpers/loadSource.js), cakupan sesi ini HANYA fungsi murni yang
// tidak menyentuh document: getQueue()/getRecommendations() (data API non-
// DOM), helper presentasional (_label/_row/_vehicleIcon/_icon), dan
// DecisionCenterHome.render() (delegasi murni ke 2 presenter lain, di-mock
// sbg plain object berisi fungsi hitung-panggilan — tidak menyentuh DOM
// sungguhan). render() milik ActionQueue/RecommendationPanel/
// LifePriorityPanel sendiri (yang baca getElementById) TIDAK dites di sini
// — sesuai batasan harness yang sama seperti test presenter lain
// (tests/business-flow-presenter.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ---------------------------------------------------------------------
// ActionQueue (modules/cross/action-queue.js)
// ---------------------------------------------------------------------

function makeActionQueue(DecisionCenterAPI) {
  const extra = { escapeHtml: (s) => String(s) };
  if (DecisionCenterAPI !== undefined) extra.DecisionCenterAPI = DecisionCenterAPI;
  return loadSource(['modules/cross/action-queue.js'], extra, ['ActionQueue']).ActionQueue;
}

test('ActionQueue.getQueue(): DecisionCenterAPI belum dimuat -> ok:false, priorityItems kosong', () => {
  const aq = makeActionQueue();
  const r = aq.getQueue();
  assert.equal(r.ok, false);
  assert.equal(r.priorityItems.length, 0);
});

test('ActionQueue.getQueue(): summary() {ok:false} atau priorityItems bukan array -> ok:false, priorityItems kosong', () => {
  const aq = makeActionQueue({ summary: () => ({ ok: false }) });
  const r = aq.getQueue();
  assert.equal(r.ok, false);
  assert.equal(r.priorityItems.length, 0);
});

test('ActionQueue.getQueue(): sukses -> priorityItems diteruskan apa adanya dari DecisionCenterAPI.summary()', () => {
  const items = [{ kind: 'finance', name: 'Makan' }, { kind: 'vehicle', severity: 'overdue', message: 'Ganti oli' }];
  const aq = makeActionQueue({ summary: () => ({ ok: true, priorityItems: items }) });
  const r = aq.getQueue();
  assert.equal(r.ok, true);
  assert.equal(r.priorityItems, items); // reference sama, 0 transformasi
});

test('ActionQueue._label(): finance -> teks limit anggaran, vehicle -> message apa adanya', () => {
  const aq = makeActionQueue();
  assert.equal(aq._label({ kind: 'finance', name: 'Hiburan' }), 'Anggaran "Hiburan" sudah melebihi limit.');
  assert.equal(aq._label({ kind: 'vehicle', message: 'Ganti oli telat' }), 'Ganti oli telat');
});

test('ActionQueue._vehicleIcon(): mapping type dikenal, fallback utk type asing', () => {
  const aq = makeActionQueue();
  assert.equal(aq._vehicleIcon('service'), '🔧');
  assert.equal(aq._vehicleIcon('tax'), '📋');
  assert.equal(aq._vehicleIcon('fuel'), '⛽');
  assert.equal(aq._vehicleIcon('entah'), '⛔');
});

// ---------------------------------------------------------------------
// RecommendationPanel (modules/cross/recommendation-panel.js)
// ---------------------------------------------------------------------

function makeRecPanel(DecisionCenterAPI) {
  const extra = { escapeHtml: (s) => String(s) };
  if (DecisionCenterAPI !== undefined) extra.DecisionCenterAPI = DecisionCenterAPI;
  return loadSource(['modules/cross/recommendation-panel.js'], extra, ['RecommendationPanel']).RecommendationPanel;
}

test('RecommendationPanel.getRecommendations(): DecisionCenterAPI belum dimuat -> ok:false, recommendations kosong', () => {
  const rp = makeRecPanel();
  const r = rp.getRecommendations();
  assert.equal(r.ok, false);
  assert.equal(r.recommendations.length, 0);
});

test('RecommendationPanel.getRecommendations(): summary() {ok:false} atau recommendations bukan array -> ok:false', () => {
  const rp = makeRecPanel({ summary: () => ({ ok: true, recommendations: 'bukan-array' }) });
  const r = rp.getRecommendations();
  assert.equal(r.ok, false);
  assert.equal(r.recommendations.length, 0);
});

test('RecommendationPanel.getRecommendations(): sukses -> recommendations diteruskan apa adanya', () => {
  const recs = [{ type: 'warning', message: 'Margin tipis' }];
  const rp = makeRecPanel({ summary: () => ({ ok: true, recommendations: recs }) });
  const r = rp.getRecommendations();
  assert.equal(r.ok, true);
  assert.equal(r.recommendations, recs);
});

test('RecommendationPanel._icon(): mapping type dikenal, fallback ke info utk type asing', () => {
  const rp = makeRecPanel();
  assert.equal(rp._icon('warning'), '🟡');
  assert.equal(rp._icon('positive'), '🟢');
  assert.equal(rp._icon('info'), 'ℹ️');
  assert.equal(rp._icon('entah'), 'ℹ️');
});

// ---------------------------------------------------------------------
// DecisionCenterHome (modules/cross/decision-center-home.js) — orkestrator
// render() murni delegasi, di-mock sbg penghitung panggilan (0 DOM nyata).
// ---------------------------------------------------------------------

test('DecisionCenterHome.render(): mendelegasikan ke RecommendationPanel.render() & ActionQueue.render() kalau keduanya ada', () => {
  let recCalled = 0;
  let aqCalled = 0;
  const ctx = loadSource(
    ['modules/cross/decision-center-home.js'],
    {
      RecommendationPanel: { render: () => { recCalled++; } },
      ActionQueue: { render: () => { aqCalled++; } },
    },
    ['DecisionCenterHome'],
  );
  ctx.DecisionCenterHome.render();
  assert.equal(recCalled, 1);
  assert.equal(aqCalled, 1);
});

test('DecisionCenterHome.render(): RecommendationPanel/ActionQueue belum dimuat -> tidak throw', () => {
  const ctx = loadSource(['modules/cross/decision-center-home.js'], {}, ['DecisionCenterHome']);
  assert.doesNotThrow(() => ctx.DecisionCenterHome.render());
});

// ---------------------------------------------------------------------
// LifePriorityPanel (modules/cross/life-priority-panel.js) — helper murni.
// ---------------------------------------------------------------------

function makeLifePriorityPanel() {
  return loadSource(
    ['modules/cross/life-priority-panel.js'],
    { escapeHtml: (s) => String(s) },
    ['LifePriorityPanel'],
  ).LifePriorityPanel;
}

test('LifePriorityPanel._vehicleIcon(): mapping type dikenal, fallback utk type asing', () => {
  const lp = makeLifePriorityPanel();
  assert.equal(lp._vehicleIcon('service'), '🔧');
  assert.equal(lp._vehicleIcon('tax'), '📋');
  assert.equal(lp._vehicleIcon('fuel'), '⛽');
  assert.equal(lp._vehicleIcon('entah'), '⛔');
});

test('LifePriorityPanel._row(): item finance -> markup memuat nama anggaran', () => {
  const lp = makeLifePriorityPanel();
  const html = lp._row({ kind: 'finance', name: 'Makan' });
  assert.match(html, /Makan/);
  assert.match(html, /melebihi limit/);
});

test('LifePriorityPanel._row(): item vehicle -> markup memuat message & ikon sesuai severity/type', () => {
  const lp = makeLifePriorityPanel();
  const html = lp._row({ kind: 'vehicle', severity: 'overdue', vehicleType: 'service', message: 'Ganti oli telat' });
  assert.match(html, /Ganti oli telat/);
  assert.match(html, /🔧/);
});
