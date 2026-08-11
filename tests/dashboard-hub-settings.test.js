'use strict';
/**
 * dashboard-hub-settings.test.js — Regresi logika murni DashboardSettings
 * (modules/dashboard-hub/dashboard-hub-settings.js): urutan kartu custom
 * (applyDashCardOrder/reorderCard), validasi density/tab default (fallback
 * ke nilai aman kalau localStorage kosong/rusak), dan resetDashboardLayout().
 *
 * Load FILE ASLI lewat vm (bukan copy-paste logic), pola localStorage-in-
 * memory PERSIS sama dgn tests/dashboard-hub-goto-subtab.test.js. Bagian
 * yang baca/tulis DOM (renderDashCardOrderUI/renderSettingsUI) dites lewat
 * DOM tiruan minimal, bukan smoke-test browser -- cukup utk pastikan tidak
 * throw & isi elemen sesuai state.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RENDER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'),
  'utf8'
);
const SETTINGS_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'dashboard-hub', 'dashboard-hub-settings.js'),
  'utf8'
);

function makeEl(id) {
  const el = { id, innerHTML: '', checked: false, value: '', _classes: new Set() };
  el.classList = {
    add(...c) { c.forEach((x) => el._classes.add(x)); },
    remove(...c) { c.forEach((x) => el._classes.delete(x)); },
    toggle(c, force) {
      const on = force === undefined ? !el._classes.has(c) : !!force;
      if (on) el._classes.add(c); else el._classes.delete(c);
      return on;
    },
    contains(c) { return el._classes.has(c); },
  };
  return el;
}

function loadSandbox() {
  const dom = Object.create(null);
  ['dashCompactModeToggle', 'dashCardDensitySelect', 'dashDefaultTabSelect', 'dashCardOrderList', 'page-dashboard-hub']
    .forEach((id) => { dom[id] = makeEl(id); });

  const localStorageStore = {};
  const saveCalls = [];
  const renderDashboardCalls = [];
  const confirmAnswers = [];

  const context = {
    console,
    document: {
      getElementById(id) { return Object.prototype.hasOwnProperty.call(dom, id) ? dom[id] : null; },
    },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null; },
      setItem(k, v) { localStorageStore[k] = v; },
      removeItem(k) { delete localStorageStore[k]; },
    },
    escapeHtml(s) { return String(s); },
    D: {},
    save() { saveCalls.push(true); },
    renderDashboard() { renderDashboardCalls.push(true); },
    toast() {},
    askConfirm() { return Promise.resolve(confirmAnswers.shift()); },
    // Stub fungsi lain yang dirujuk DASH_CARD_DEFS[].render() (tidak dites
    // di sini, cukup no-op supaya loading tidak throw kalau ada yang tak
    // sengaja terpanggil).
    renderFinancialFreedom() {},
    Pensiun: { renderDashMini() {} },
    Payroll: { renderDashMini() {} },
    Refleksi: { renderDashCard() {} },
  };
  vm.createContext(context);
  vm.runInContext(RENDER_SRC, context, { filename: 'modules-render.js' });
  vm.runInContext(SETTINGS_SRC, context, { filename: 'dashboard-hub-settings.js' });
  vm.runInContext(
    'this.DashboardSettings = DashboardSettings; this.DASH_CARD_BY_KEY = DASH_CARD_BY_KEY; this.DASH_RENDER_ORDER = DASH_RENDER_ORDER;',
    context,
    { filename: 'dashboard-hub-settings-test-epilogue.js' }
  );
  // modules-render.js sudah mendeklarasikan renderDashboard() ASLI (butuh
  // puluhan modul lain yg tidak relevan di sini) -- timpa dgn tracker
  // SETELAH load, bukan sebelum (deklarasi function top-level akan
  // menimpa properti context yg di-set sebelum runInContext).
  context.renderDashboard = () => { renderDashboardCalls.push(true); };
  return { context, dom, localStorageStore, saveCalls, renderDashboardCalls, confirmAnswers };
}

test('applyDashCardOrder() — D.dashCardOrder kosong -> fallback ke DASH_RENDER_ORDER apa adanya', () => {
  const { context } = loadSandbox();
  context.D.dashCardOrder = undefined;
  assert.deepEqual(context.DashboardSettings.applyDashCardOrder(), context.DASH_RENDER_ORDER);
});

test('applyDashCardOrder() — custom order valid dipakai penuh, tidak ada duplikat/kehilangan kartu', () => {
  const { context } = loadSandbox();
  context.D.dashCardOrder = ['refleksi', 'fi', 'pensiun', 'absensi'];
  const order = Array.from(context.DashboardSettings.applyDashCardOrder());
  assert.deepEqual(order, ['refleksi', 'fi', 'pensiun', 'absensi']);
  assert.equal(new Set(order).size, context.DASH_RENDER_ORDER.length);
});

test('applyDashCardOrder() — key yang sudah dihapus dari registry otomatis gugur (tidak error)', () => {
  const { context } = loadSandbox();
  context.D.dashCardOrder = ['refleksi', 'kartu_sudah_dihapus', 'fi'];
  const order = context.DashboardSettings.applyDashCardOrder();
  assert.ok(!order.includes('kartu_sudah_dihapus'));
  assert.deepEqual(new Set(order), new Set(context.DASH_RENDER_ORDER));
});

test('applyDashCardOrder() — kartu baru yang belum ada di custom order tetap ikut (ditambahkan di sisa urutan)', () => {
  const { context } = loadSandbox();
  context.D.dashCardOrder = ['refleksi'];
  const order = context.DashboardSettings.applyDashCardOrder();
  assert.equal(order[0], 'refleksi');
  assert.deepEqual(new Set(order), new Set(context.DASH_RENDER_ORDER));
});

test('reorderCard() — naik/turun menukar posisi dgn tetangga & tersimpan ke D.dashCardOrder', () => {
  const { context, saveCalls, renderDashboardCalls } = loadSandbox();
  context.D.dashCardOrder = ['fi', 'pensiun', 'absensi', 'refleksi'];
  context.DashboardSettings.reorderCard('pensiun', 'up');
  assert.deepEqual(Array.from(context.D.dashCardOrder), ['pensiun', 'fi', 'absensi', 'refleksi']);
  assert.equal(saveCalls.length, 1);
  // page-dashboard-hub ada di DOM tiruan -> renderDashboard() ikut terpanggil
  assert.equal(renderDashboardCalls.length, 1);
});

test('reorderCard() — kartu pertama tidak bisa naik (di luar batas -> no-op, bukan error)', () => {
  const { context, saveCalls } = loadSandbox();
  context.D.dashCardOrder = ['fi', 'pensiun', 'absensi', 'refleksi'];
  context.DashboardSettings.reorderCard('fi', 'up');
  assert.deepEqual(context.D.dashCardOrder, ['fi', 'pensiun', 'absensi', 'refleksi']);
  assert.equal(saveCalls.length, 0);
});

test('reorderCard() — kartu terakhir tidak bisa turun (di luar batas -> no-op)', () => {
  const { context, saveCalls } = loadSandbox();
  context.D.dashCardOrder = ['fi', 'pensiun', 'absensi', 'refleksi'];
  context.DashboardSettings.reorderCard('refleksi', 'down');
  assert.deepEqual(context.D.dashCardOrder, ['fi', 'pensiun', 'absensi', 'refleksi']);
  assert.equal(saveCalls.length, 0);
});

test('reorderCard() — key yang tidak ada di urutan (mis. sudah dihapus) -> no-op', () => {
  const { context, saveCalls } = loadSandbox();
  context.D.dashCardOrder = ['fi', 'pensiun', 'absensi', 'refleksi'];
  context.DashboardSettings.reorderCard('key_asing', 'up');
  assert.equal(saveCalls.length, 0);
});

test('getDensity()/setDensity() — nilai valid tersimpan & terbaca balik lewat localStorage', () => {
  const { context, localStorageStore } = loadSandbox();
  assert.equal(context.DashboardSettings.getDensity(), 'normal'); // default sebelum diset
  context.DashboardSettings.setDensity('rapat');
  assert.equal(localStorageStore.dashCardDensity, 'rapat');
  assert.equal(context.DashboardSettings.getDensity(), 'rapat');
});

test('setDensity() — nilai di luar 3 pilihan sah diabaikan (tidak ditulis ke localStorage)', () => {
  const { context, localStorageStore } = loadSandbox();
  context.DashboardSettings.setDensity('super-rapat');
  assert.equal(localStorageStore.dashCardDensity, undefined);
  assert.equal(context.DashboardSettings.getDensity(), 'normal');
});

test('getDensity() — value tersimpan tidak dikenal (data korup) -> fallback normal, bukan error', () => {
  const { context, localStorageStore } = loadSandbox();
  localStorageStore.dashCardDensity = 'ngasal';
  assert.equal(context.DashboardSettings.getDensity(), 'normal');
});

test('getDefaultTab()/setDefaultTab() — nilai valid tersimpan & terbaca balik', () => {
  const { context, localStorageStore } = loadSandbox();
  assert.equal(context.DashboardSettings.getDefaultTab(), 'ringkasan');
  context.DashboardSettings.setDefaultTab('widget');
  assert.equal(localStorageStore.dashDefaultSectionTab, 'widget');
  assert.equal(context.DashboardSettings.getDefaultTab(), 'widget');
});

test('setDefaultTab() — nilai tidak sah diabaikan, getDefaultTab() tetap fallback ringkasan', () => {
  const { context, localStorageStore } = loadSandbox();
  context.DashboardSettings.setDefaultTab('tab_asal_asalan');
  assert.equal(localStorageStore.dashDefaultSectionTab, undefined);
  assert.equal(context.DashboardSettings.getDefaultTab(), 'ringkasan');
});

test('isCompactMode()/toggleCompactMode() — toggle boolean tersimpan & terbaca balik', () => {
  const { context, localStorageStore } = loadSandbox();
  assert.equal(context.DashboardSettings.isCompactMode(), false);
  context.DashboardSettings.toggleCompactMode(true);
  assert.equal(localStorageStore.dashCompactMode, '1');
  assert.equal(context.DashboardSettings.isCompactMode(), true);
  context.DashboardSettings.toggleCompactMode(false);
  assert.equal(context.DashboardSettings.isCompactMode(), false);
});

test('renderDashCardOrderUI() — render ke #dashCardOrderList sesuai urutan efektif, tombol ujung disabled', () => {
  const { context, dom } = loadSandbox();
  context.D.dashCardOrder = ['refleksi', 'fi', 'pensiun', 'absensi'];
  context.DashboardSettings.renderDashCardOrderUI();
  const html = dom.dashCardOrderList.innerHTML;
  assert.match(html, /Refleksi & Self-Care/);
  // Kartu pertama (refleksi): tombol ▲ disabled; kartu terakhir (absensi): tombol ▼ disabled.
  const firstItemIdx = html.indexOf('Refleksi & Self-Care');
  const firstItemBlock = html.slice(firstItemIdx, html.indexOf('</div>', html.indexOf('</div>', firstItemIdx) + 1));
  assert.match(firstItemBlock, /reorderCard\('refleksi','up'\)[^>]*disabled|disabled[^>]*reorderCard\('refleksi','up'\)/);
});

test('resetDashboardLayout() — membersihkan semua preferensi (order/density/compact/tab) & re-render', async () => {
  const { context, localStorageStore, confirmAnswers, saveCalls, dom } = loadSandbox();
  context.D.dashCardOrder = ['refleksi', 'fi', 'pensiun', 'absensi'];
  localStorageStore.dashCompactMode = '1';
  localStorageStore.dashCardDensity = 'rapat';
  localStorageStore.dashDefaultSectionTab = 'widget';
  confirmAnswers.push(true); // simulasi user tekan "Ya, Reset"

  await context.DashboardSettings.resetDashboardLayout();

  assert.equal(context.D.dashCardOrder, undefined);
  assert.equal(localStorageStore.dashCompactMode, undefined);
  assert.equal(localStorageStore.dashCardDensity, undefined);
  assert.equal(localStorageStore.dashDefaultSectionTab, undefined);
  assert.equal(saveCalls.length, 1);
  // Setelah reset, UI Pengaturan disinkronkan ulang ke default.
  assert.equal(dom.dashCardDensitySelect.value, 'normal');
  assert.equal(dom.dashDefaultTabSelect.value, 'ringkasan');
  assert.equal(dom.dashCompactModeToggle.checked, false);
});

test('resetDashboardLayout() — user batal konfirmasi -> tidak ada perubahan sama sekali', async () => {
  const { context, localStorageStore, confirmAnswers, saveCalls } = loadSandbox();
  context.D.dashCardOrder = ['refleksi', 'fi', 'pensiun', 'absensi'];
  localStorageStore.dashCardDensity = 'rapat';
  confirmAnswers.push(false); // user tekan "Batal"

  await context.DashboardSettings.resetDashboardLayout();

  assert.deepEqual(context.D.dashCardOrder, ['refleksi', 'fi', 'pensiun', 'absensi']);
  assert.equal(localStorageStore.dashCardDensity, 'rapat');
  assert.equal(saveCalls.length, 0);
});

test('renderSettingsUI() — menyinkronkan kontrol Pengaturan ke nilai localStorage yang sedang tersimpan', () => {
  const { context, dom, localStorageStore } = loadSandbox();
  localStorageStore.dashCompactMode = '1';
  localStorageStore.dashCardDensity = 'rapat';
  localStorageStore.dashDefaultSectionTab = 'insight';
  context.DashboardSettings.renderSettingsUI();
  assert.equal(dom.dashCompactModeToggle.checked, true);
  assert.equal(dom.dashCardDensitySelect.value, 'rapat');
  assert.equal(dom.dashDefaultTabSelect.value, 'insight');
});
