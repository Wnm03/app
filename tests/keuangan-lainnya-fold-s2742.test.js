const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

// S2742 — Laporan Keuangan: 4 kartu inti tetap tampil, 6 kartu perencanaan dilipat ke "Lainnya".
// Presentasi saja: yang dipindah hanya pembungkus yang sudah ada (id & data-action tidak berubah).

const CORE = ['findashWrap', 'cashflowProjWrap', 'financialHealthScoreWrap', 'financialRiskDashboardWrap'];
const REST = ['forecastWrap', 'budgetRecoWrap', 'financialGoalWrap', 'investPlannerWrap', 'debtOptimizerWrap', 'retirementPlannerWrap'];

// DOM tiruan minimal: cukup untuk appendChild/insertBefore/nextSibling/open/addEventListener.
function makeNode(tag, id) {
  const n = {
    tagName: String(tag).toUpperCase(), id: id || '', className: '', children: [], parentNode: null, open: false, listeners: {},
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = n; n.children.push(c); return c; },
    removeChild(c) { n.children.splice(n.children.indexOf(c), 1); c.parentNode = null; return c; },
    insertBefore(c, ref) {
      if (c.parentNode) c.parentNode.removeChild(c);
      c.parentNode = n;
      const i = ref ? n.children.indexOf(ref) : n.children.length;
      n.children.splice(i < 0 ? n.children.length : i, 0, c);
      return c;
    },
    get nextSibling() { const p = n.parentNode; return p ? (p.children[p.children.indexOf(n) + 1] || null) : null; },
    addEventListener(t, fn) { (n.listeners[t] = n.listeners[t] || []).push(fn); },
    closest(sel) { // hanya mendukung 'details.kb-lainnya'
      for (let x = n; x; x = x.parentNode) if (x.tagName === 'DETAILS' && /\bkb-lainnya\b/.test(x.className)) return x;
      return null;
    },
  };
  return n;
}

function loadFold() {
  const src = fs.readFileSync(path.join(ROOT, 'modules/shared/pwa-ux-performance.js'), 'utf8');
  const a = src.indexOf("const KEU_CORE=[");
  const b = src.indexOf('const foldFilters=function(){', a);
  assert.ok(a > 0 && b > a, 'blok S2742 harus ada sebelum foldFilters');
  const body = src.slice(a, b);
  const titles = {};
  CORE.concat(REST).forEach((k) => { titles[k] = k; });
  const tab = makeNode('div', 'keuanganTab-laporan');
  const nodes = {};
  // urutan DOM asli: findash, forecast, budgetReco, cashflowProj, goal, invest, debt, retirement, health, risk
  ['findashWrap', 'forecastWrap', 'budgetRecoWrap', 'cashflowProjWrap', 'financialGoalWrap', 'investPlannerWrap',
    'debtOptimizerWrap', 'retirementPlannerWrap', 'financialHealthScoreWrap', 'financialRiskDashboardWrap'].forEach((k) => {
    nodes[k] = makeNode('div', k); tab.appendChild(nodes[k]);
  });
  const store = {};
  const env = {
    KEU_TITLES: titles,
    byId: (id) => (id === 'kbLainnyaFold' ? (tab.children.find((c) => c.id === id) || null) : nodes[id] || null),
    make: (tag, cls, text) => { const n = makeNode(tag); n.className = cls || ''; if (text) n.textContent = text; return n; },
    readPrefs: () => JSON.parse(store.v || '{}'),
    localStorage: { setItem: (k, v) => { store.v = v; } },
    window: { requestAnimationFrame: (fn) => fn() },
  };
  const fn = new Function('KEU_TITLES', 'byId', 'make', 'readPrefs', 'localStorage', 'window',
    body + '; return {KEU_CORE, foldLainnya};');
  const api = fn(env.KEU_TITLES, env.byId, env.make, env.readPrefs, env.localStorage, env.window);
  return { api, tab, nodes, store };
}

test('S2742: 4 kartu inti tetap anak langsung tab, 6 sisanya pindah ke #kbLainnyaFold (id utuh)', () => {
  const { api, tab, nodes } = loadFold();
  assert.deepEqual(api.KEU_CORE, CORE);
  api.foldLainnya({});
  const fold = tab.children.find((c) => c.id === 'kbLainnyaFold');
  assert.ok(fold, 'fold dibuat');
  assert.equal(fold.tagName, 'DETAILS');
  assert.equal(fold.open, false, 'default tertutup');
  CORE.forEach((k) => assert.equal(nodes[k].parentNode, tab, k + ' tetap di tab'));
  REST.forEach((k) => assert.equal(nodes[k].parentNode, fold, k + ' pindah ke fold'));
  // fold berada setelah kartu inti terakhir (Risiko)
  assert.equal(nodes.financialRiskDashboardWrap.nextSibling, fold);
});

test('S2742: idempoten — panggilan ulang tidak membuat fold ganda atau memindah lagi', () => {
  const { api, tab } = loadFold();
  api.foldLainnya({});
  const before = tab.children.map((c) => c.id).join(',');
  api.foldLainnya({}); api.foldLainnya({});
  assert.equal(tab.children.map((c) => c.id).join(','), before);
  assert.equal(tab.children.filter((c) => c.id === 'kbLainnyaFold').length, 1);
});

test('S2742: terbuka otomatis bila pengguna dulu membuka kartu non-inti atau fold tersimpan terbuka', () => {
  assert.equal((() => { const x = loadFold(); x.api.foldLainnya({ investPlannerWrap: false }); return x.tab.children.find((c) => c.id === 'kbLainnyaFold').open; })(), true);
  assert.equal((() => { const x = loadFold(); x.api.foldLainnya({ kbLainnyaFold: false }); return x.tab.children.find((c) => c.id === 'kbLainnyaFold').open; })(), true);
  assert.equal((() => { const x = loadFold(); x.api.foldLainnya({ investPlannerWrap: true, kbLainnyaFold: true }); return x.tab.children.find((c) => c.id === 'kbLainnyaFold').open; })(), false);
});

test('S2742: status buka/tutup disimpan di cardCollapsePrefs (kunci kbLainnyaFold)', () => {
  const { api, tab, store } = loadFold();
  api.foldLainnya({});
  const fold = tab.children.find((c) => c.id === 'kbLainnyaFold');
  const sum = fold.children[0];
  fold.open = true; sum.listeners.click[0]();
  assert.equal(JSON.parse(store.v).kbLainnyaFold, false); // false = terbuka (sama dgn semantik collapsed)
  fold.open = false; sum.listeners.click[0]();
  assert.equal(JSON.parse(store.v).kbLainnyaFold, true);
});

test('S2742: tanpa kartu risiko (halaman lain) fungsi diam, tidak melempar', () => {
  const { api, tab, nodes } = loadFold();
  tab.removeChild(nodes.financialRiskDashboardWrap); nodes.financialRiskDashboardWrap.parentNode = null;
  assert.doesNotThrow(() => api.foldLainnya({}));
});

test('S2742: goTo membuka "Lainnya" bila target ada di dalamnya', () => {
  const src = fs.readFileSync(path.join(ROOT, 'modules/dashboard-hub/dashboard-hub.js'), 'utf8');
  const i = src.indexOf("el.closest('details.kb-lainnya')");
  assert.ok(i > 0, 'kait goTo ada');
  const j = src.indexOf("el.scrollIntoView({ behavior: 'smooth', block: 'start' })", i);
  assert.ok(j > i, 'dibuka SEBELUM scrollIntoView');
  // perilaku: ulang kondisi yang sama terhadap node tiruan
  const fold = makeNode('details'); fold.className = 'kb-lainnya';
  const wrap = makeNode('div', 'investPlannerWrap'); fold.appendChild(wrap);
  const lipat = typeof wrap.closest === 'function' ? wrap.closest('details.kb-lainnya') : null;
  if (lipat && !lipat.open) lipat.open = true;
  assert.equal(fold.open, true);
});

test('S2742: CSS grup Lainnya ada dan ikut urutan flex kartu insight Laporan', () => {
  const css = fs.readFileSync(path.join(ROOT, 'modern-ui-layer.css'), 'utf8');
  assert.match(css, /#keuanganTab-laporan > \.kb-lainnya \{ order:5;/);
  assert.match(css, /\.kb-lainnya\[open\] > summary::after/);
});
