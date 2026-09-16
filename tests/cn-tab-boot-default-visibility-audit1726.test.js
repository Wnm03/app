'use strict';
// tests/cn-tab-boot-default-visibility-audit1726.test.js — legacy Classic boot audit
// Guards the original Classic boot behavior so future UI changes cannot
// accidentally make multiple Car Notes panes visible at startup.
//
// Pola ekstraksi fungsi ASLI dari source lewat vm (bukan re-implement
// logic), gabungan setCnTab() (vehicle-core.js) + renderCnTab()
// (modules-render-b.js) dalam SATU sandbox auto-stub permisif, supaya
// interaksi keduanya (renderCnTab() manggil setCnTab() manggil ulang
// renderCnTab()) teruji sungguhan -- bukan cuma salah satu fungsi diuji
// terisolasi.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makePermissiveStub } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

function extractFnSnippet(file, fnName) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan di ${file}`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

function makeFakeEl(tag) {
  const el = { tag, _classes: new Set(), dataset: {}, style: {}, textContent: '' };
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
  el.querySelectorAll = () => [];
  el.querySelector = () => null;
  return el;
}

// Bangun DOM tiruan MINIMAL: 6 pane #cnTab-*, tombol .cn-tab per tab (dgn
// data-args persis pola HTML asli), #page-carnotes sbg root query.
function makeFakeCarNotesDom(themeIsPro) {
  const panes = {};
  for (const t of ['beranda', 'insight', 'bbm', 'servis', 'pajak', 'jalan']) {
    panes[t] = makeFakeEl('div');
  }
  const tabNames = ['beranda', 'servis', 'bbm', 'insight', 'pajak'];
  const buttons = tabNames.map((t) => {
    const b = makeFakeEl('button');
    b._dataArgs = `["${t}", "$el"]`;
    b.getAttribute = (name) => (name === 'data-args' ? b._dataArgs : null);
    return b;
  });
  const pageCarnotes = makeFakeEl('div');
  pageCarnotes.querySelectorAll = (sel) => {
    if (sel === '.cn-tab') return buttons;
    return [];
  };
  pageCarnotes.querySelector = (sel) => {
    const m = /\[data-args\*="([^"]+)"\]/.exec(sel);
    if (m) return buttons.find((b) => b._dataArgs.includes(m[1])) || null;
    return null;
  };

  const byId = { 'page-carnotes': pageCarnotes };
  for (const t of Object.keys(panes)) byId['cnTab-' + t] = panes[t];

  const document = {
    body: { dataset: { theme: themeIsPro ? 'pro' : 'classic' } },
    getElementById: (id) => byId[id] || null,
    querySelectorAll: (sel) => {
      if (sel === '#page-carnotes .cn-tab') return buttons;
      return [];
    },
    querySelector: (sel) => {
      const scoped = sel.startsWith('#page-carnotes ') ? sel.slice('#page-carnotes '.length) : sel;
      return pageCarnotes.querySelector(scoped);
    },
  };
  return { document, panes, buttons };
}

function loadCombined(themeIsPro) {
  const setCnTabSrc = extractFnSnippet('modules/vehicle/vehicle-core.js', 'setCnTab');
  const renderCnTabSrc = extractFnSnippet('modules/shared/modules-render-b.js', 'renderCnTab');
  const { document, panes, buttons } = makeFakeCarNotesDom(themeIsPro);

  const known = {
    console,
    document,
    window: {},
    curCnTab: 'bbm',
    CN_TAB_LABEL: { beranda: 'Beranda', insight: 'Insight AI', bbm: 'BBM', servis: 'Servis', pajak: 'Pajak & SIM', jalan: 'Jalan' },
    cnPeriodeByTab: {},
    // Presenter/fungsi lain yang dipanggil TANPA guard typeof di
    // renderCnTab() -- di-stub no-op di sini (bukan lewat auto-stub
    // permisif) supaya assignment/pembacaan lain (mis. curCnTab) tetap
    // mengarah ke variable sungguhan, bukan proxy stub baru.
    renderBbmList: () => {},
    renderServisList: () => {},
    renderCarImportVehicleSelect: () => {},
    renderVehTaxSim: () => {},
  };
  const store = new Map(Object.entries(known));
  const proxyHandler = {
    has() { return true; },
    get(target, prop) {
      if (prop === Symbol.unscopables) return undefined;
      if (store.has(prop)) return store.get(prop);
      const stub = makePermissiveStub(String(prop));
      store.set(prop, stub);
      return stub;
    },
    set(target, prop, value) {
      store.set(prop, value);
      return true;
    },
  };
  const sandbox = new Proxy({}, proxyHandler);
  const context = vm.createContext(sandbox);
  new vm.Script(`${setCnTabSrc}\n${renderCnTabSrc}\nthis.__renderCnTab = renderCnTab;`, { filename: 'combined-cnTab' }).runInContext(context);

  return { context, document, panes, buttons, getCurCnTab: () => store.get('curCnTab') };
}

test('renderCnTab() saat boot pertama (tema Klasik): HANYA #cnTab-bbm yang computed-visible, bukan #cnTab-beranda juga', () => {
  const { context, panes } = loadCombined(false);
  context.__renderCnTab();

  assert.equal(panes.bbm.classList.contains('u-dnone'), false, '#cnTab-bbm harus TIDAK punya u-dnone (tab default Klasik = bbm, perilaku asli)');
  assert.equal(panes.beranda.classList.contains('u-dnone'), true, '#cnTab-beranda harus punya u-dnone di tema Klasik (dashboard Pro-only, jangan bocor)');
  for (const t of ['insight', 'servis', 'pajak', 'jalan']) {
    assert.equal(panes[t].classList.contains('u-dnone'), true, `#cnTab-${t} harus tetap u-dnone (bukan tab aktif)`);
  }
});

test('renderCnTab() dipanggil berkali-kali: init tab default cuma jalan SEKALI (guard __cnTabBootInitialized), tidak reset pilihan tab user', () => {
  const { context, panes, buttons } = loadCombined(false);
  context.__renderCnTab();
  assert.equal(panes.bbm.classList.contains('u-dnone'), false, 'boot pertama: bbm visible');

  // Simulasikan user tap tab lain (servis) SETELAH boot -- panggil setCnTab
  // langsung (pola sama persis dipakai data-action="setCnTab" di markup).
  const servisBtn = buttons.find((b) => b._dataArgs.includes('servis'));
  context.setCnTab('servis', servisBtn);
  assert.equal(panes.servis.classList.contains('u-dnone'), false, 'setelah user pindah tab manual: servis jadi visible');
  assert.equal(panes.bbm.classList.contains('u-dnone'), true, 'bbm ikut ter-hide lagi setelah pindah tab');

  // renderCnTab() dipanggil lagi (mis. refresh setelah simpan transaksi) --
  // TIDAK BOLEH menimpa balik ke tab default 'bbm' (guard boot sudah true).
  context.__renderCnTab();
  assert.equal(panes.servis.classList.contains('u-dnone'), false, 'renderCnTab() refresh TIDAK BOLEH reset tab balik ke default');
});
