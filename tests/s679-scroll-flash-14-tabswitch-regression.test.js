'use strict';
// tests/s679-scroll-flash-14-tabswitch-regression.test.js — S679
//
// Rekomendasi #1 audit S677: 14 titik scroll-fix (S677) belum punya test
// regresi -- kalau nanti direfactor orang lain, panggilan
// scrollTabBarIntoView() bisa hilang tanpa ketahuan (semua test lain di
// suite ini tidak menyentuh soal scroll sama sekali). Pola ekstraksi
// fungsi ASLI dari source lewat vm (bukan re-implement logic) SAMA PERSIS
// dgn tests/s335-bug011-gotolist-tab-active-index.test.js, sesuai
// permintaan eksplisit.
//
// Test A: perilaku scrollTabBarIntoView() itu sendiri (modal-navigasi.js)
//   -- scrollIntoView() dipanggil, DAN flash-highlight ditambah lalu
//   dihapus lagi setelah timeout (rekomendasi #3 audit S677).
// Test B: 12 dari 14 fungsi ganti-tab (top-level `function ...`) --
//   masing-masing di-extract langsung dari file sumbernya lewat
//   extractFunctionAutoStub(), scrollTabBarIntoView di-mock, lalu
//   dipastikan mock itu TERPANGGIL saat fungsi asli dijalankan.
// Test C: 2 sisanya (BudgetTabs.switchTo, DashboardHub.applySectionTab)
//   adalah method di object literal (bukan `function nama(...)` biasa),
//   jadi di-load penuh via loadSource() dengan DOM tiruan minimal,
//   dipola dari tests/dashboard-hub-goto-subtab.test.js yang sudah ada.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, extractFunctionAutoStub, makePermissiveStub } = require('./helpers/loadSource');

function makeFakeEl(name) {
  const el = { name, _classes: new Set(), dataset: {}, style: {} };
  el.classList = {
    add: (...c) => c.forEach((x) => el._classes.add(x)),
    remove: (...c) => c.forEach((x) => el._classes.delete(x)),
    toggle: (c, force) => {
      const on = force === undefined ? !el._classes.has(c) : !!force;
      if (on) el._classes.add(c); else el._classes.delete(c);
      return on;
    },
    contains: (c) => el._classes.has(c),
  };
  el.scrollIntoViewCalls = 0;
  el.scrollIntoView = () => { el.scrollIntoViewCalls++; };
  Object.defineProperty(el, 'offsetWidth', { get: () => 0 });
  return el;
}

// ============== TEST A: scrollTabBarIntoView() sendiri ==============

test('scrollTabBarIntoView() — memanggil scrollIntoView DAN toggle flash-highlight (rekomendasi #3 audit S677)', () => {
  const timeouts = [];
  const ctx = loadSource(['modules/shared/modal-navigasi.js'], {
    document: makePermissiveStub('document'),
    requestAnimationFrame: (fn) => fn(),
    setTimeout: (fn, ms) => { timeouts.push(fn); return timeouts.length; },
  });

  const el = makeFakeEl('activeTab');
  ctx.scrollTabBarIntoView(el);

  assert.equal(el.scrollIntoViewCalls, 1, 'scrollIntoView() harus terpanggil tepat 1x');
  assert.equal(el.classList.contains('flash-highlight'), true, 'flash-highlight harus ditambahkan setelah scroll');

  // Jalankan setTimeout yang tertunda (hapus flash-highlight setelah 1200ms).
  assert.equal(timeouts.length, 1, 'harus ada 1 setTimeout terjadwal utk hapus flash-highlight');
  timeouts[0]();
  assert.equal(el.classList.contains('flash-highlight'), false, 'flash-highlight harus dihapus lagi setelah timeout');
});

test('scrollTabBarIntoView(null) — aman dipanggil tanpa elemen (guard existing tidak boleh regresi)', () => {
  const ctx = loadSource(['modules/shared/modal-navigasi.js'], { document: makePermissiveStub('document') });
  assert.doesNotThrow(() => ctx.scrollTabBarIntoView(null));
  assert.doesNotThrow(() => ctx.scrollTabBarIntoView(undefined));
});

// ============== TEST B: 12 fungsi top-level `function ...` ==============

const TOPLEVEL_CASES = [
  { file: 'modules/finance/tx-list-cashflow.js', fn: 'setLaporanTab', args: (el) => ['ringkasan', el] },
  { file: 'modules/finance/tx-list-cashflow.js', fn: 'setKelolaTab', args: (el) => ['ringkasan', el] },
  { file: 'modules/finance/tx-list-cashflow.js', fn: 'setKeuanganTab', args: (el) => ['kelola', el] },
  { file: 'modules/asset/aset-misc.js', fn: 'setAsetTab', args: (el) => ['ringkasan', el] },
  { file: 'modules/vehicle/vehicle-core.js', fn: 'setCnTab', args: (el) => ['bbm', el] },
  { file: 'modules/vehicle/vehicle-core.js', fn: 'setCnInsightTab', args: (el) => ['ringkasan', el] },
  { file: 'modules/vehicle/vehicle-core.js', fn: 'setCnBbmTab', args: (el) => ['ringkasan', el] },
  { file: 'pajak-aset-ui-wrappers.js', fn: 'setPjkTab', args: (el) => ['ringkasan', el] },
  { file: 'pajak-aset-ui-wrappers.js', fn: 'setPajakTab', args: (el) => ['zakat', el] },
  { file: 'modules/shared/pengaturan-search.js', fn: 'setSettingsTab', args: (el) => ['profil', el] },
  { file: 'modules/shop/cobek-io.js', fn: 'setShopTab', args: (el) => ['kasir', el] },
  {
    file: 'modules/finance/tagihan-kalender.js',
    fn: 'setBillListTab',
    // setBillListTab(tab) tidak menerima `el` -- ambil elemen dari
    // document.getElementById('billTabBayarBtn') yang di-stub di bawah.
    args: () => ['aktif'],
  },
];

for (const { file, fn, args } of TOPLEVEL_CASES) {
  test(`${fn}() (${file}) — masih memanggil scrollTabBarIntoView() (regresi S677 titik scroll-fix)`, () => {
    const calls = [];
    const spy = (el) => { calls.push(el); };
    const fakeEl = makeFakeEl(fn + '-btn');

    const realFn = extractFunctionAutoStub(file, fn, {
      scrollTabBarIntoView: spy,
      document: {
        getElementById: () => fakeEl,
        querySelectorAll: () => ({ forEach: () => {} }),
      },
    });

    realFn(...args(fakeEl));

    assert.equal(calls.length, 1, `${fn}() harus memanggil scrollTabBarIntoView() tepat 1x -- kalau ini gagal, panggilan scroll-fix di ${fn}() sudah hilang/berubah`);
  });
}

// ============== TEST C: 2 method object-literal ==============

test('BudgetTabs.switchTo() — masih memanggil scrollTabBarIntoView() (regresi S677 titik scroll-fix)', () => {
  const calls = [];
  const paneList = makeFakeEl('budgetTabPane-list');
  const paneReko = makeFakeEl('budgetTabPane-reko');
  const btnList = makeFakeEl('budget-tab-btn-list'); btnList.dataset.tab = 'list';
  const btnReko = makeFakeEl('budget-tab-btn-reko'); btnReko.dataset.tab = 'reko';
  const byId = {
    'budgetTabPane-list': paneList,
    'budgetTabPane-reko': paneReko,
    budgetTabSettingsBtn: makeFakeEl('settingsBtn'),
    budgetTabAddBtn: makeFakeEl('addBtn'),
  };
  const fakeDocument = {
    getElementById: (id) => byId[id] || null,
    querySelectorAll: (sel) => (sel === '.budget-tab-btn' ? [btnList, btnReko] : []),
  };

  const ctx = loadSource(['budget.js'], {
    document: fakeDocument,
    scrollTabBarIntoView: (el) => calls.push(el),
  }, ['BudgetTabs']);

  ctx.BudgetTabs.switchTo('list');

  assert.equal(calls.length, 1, 'BudgetTabs.switchTo() harus memanggil scrollTabBarIntoView() tepat 1x');
});

test('DashboardHub.applySectionTab() — masih memanggil scrollTabBarIntoView() (regresi S677 titik scroll-fix)', () => {
  const calls = [];
  const sectionBtns = {};
  ['ringkasan', 'fitur', 'widget', 'insight'].forEach((t) => {
    sectionBtns[`dashHubSectionTabBtn-${t}`] = makeFakeEl(`dashHubSectionTabBtn-${t}`);
  });
  const fakeDocument = {
    getElementById: (id) => sectionBtns[id] || makeFakeEl(id),
  };

  const ctx = loadSource(['modules/dashboard-hub/dashboard-hub.js'], {
    document: fakeDocument,
    scrollTabBarIntoView: (el) => calls.push(el),
  }, ['DashboardHub']);

  ctx.DashboardHub.applySectionTab('ringkasan');

  assert.equal(calls.length, 1, 'DashboardHub.applySectionTab() harus memanggil scrollTabBarIntoView() tepat 1x');
});
