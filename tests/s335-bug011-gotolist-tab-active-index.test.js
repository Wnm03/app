'use strict';
// tests/s335-bug011-gotolist-tab-active-index.test.js — S335, BUG-011
//
// Bug: goToList() (modules/finance/filter-laporan.js, fungsi jump() di
// dalamnya) menghitung index tombol .cn-tab untuk shopTabName/cnTabName
// lewat ternary HARDCODE, tidak cocok dengan urutan tombol aktual di DOM
// (index.html):
//   - #page-carnotes .cn-tab: insight=0, bbm=1, servis=2, pajak=3
//     Kode lama: tabs[cnTabName==='servis'?1:0] -> 'servis' salah dapat
//     index 1 (bbm), padahal index aktualnya 2.
//   - #page-shop .cn-tab: kasir=0,jual=1,etalase=2,produsen=3,riwayat=4,
//     pelanggan=5,laporan=6,bi=7
//     Kode lama: tabs[shopTabName==='etalase'?1:shopTabName==='produsen'?2:
//     shopTabName==='riwayat'?3:shopTabName==='pelanggan'?4:0] -> semua
//     index yang dicek offset -1 dari index aktual.
//
// setCnTab(t,el)/setShopTab(t,el) sendiri sudah benar: `t` (string) dipakai
// untuk toggle KONTEN (jadi konten yang tampil tetap benar), tapi `el`
// (elemen tombol dari index yang salah) dipakai untuk
// `el.classList.add('active')` -- jadi tombol yang ter-highlight beda dari
// tab konten yang sebenarnya ditampilkan.
//
// Regression test ini menjalankan goToList() ASLI (bukan re-implement
// logic-nya) dengan fake `document` yang melacak elemen mana yang dapat
// class 'active', lalu assert index/nama tombol yang ter-highlight SAMA
// dengan tab konten yang diminta.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// extractFunctionWithGlobals: sama seperti extractFunction() di
// helpers/loadSource.js (brace-counting, ambil fungsi ASLI dari source file
// by name -- bukan re-implement manual) tapi mengizinkan sandbox dengan
// extra globals. Dipakai di sini supaya setShopTab()/setCnTab() ASLI bisa
// dites terisolasi dari dispatcher render per-tab (Kasir.render(),
// renderProductList(), dst.) yang di luar cakupan BUG-011 (soal index
// tombol, bukan isi konten tab) tanpa harus memuat seluruh cobek-io.js/
// vehicle-core.js (yang mendeklarasikan ulang nama-nama itu sbg function,
// menimpa stub noop kalau file penuh yang dimuat).
function extractFunctionWithGlobals(file, fnName, extraGlobals) {
  const fullPath = path.join(ROOT, file);
  const src = fs.readFileSync(fullPath, 'utf8');
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`extractFunctionWithGlobals: "${marker}" tidak ditemukan di ${file}`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const snippet = src.slice(start, i);
  const sandbox = { console, ...extraGlobals };
  const context = vm.createContext(sandbox);
  new vm.Script(`${snippet}\nthis.__fn = ${fnName};`, { filename: `${file}#${fnName}` }).runInContext(context);
  return context.__fn;
}

function makeEl(name) {
  const el = { name, _classes: new Set() };
  el.classList = {
    add: (c) => el._classes.add(c),
    remove: (c) => el._classes.delete(c),
    toggle: (c, force) => {
      if (force) el._classes.add(c);
      else el._classes.delete(c);
    },
    contains: (c) => el._classes.has(c),
  };
  el.style = {};
  return el;
}

// Bangun fake DOM sesuai urutan tombol AKTUAL di index.html.
function makeFakeDom() {
  const cnTabNames = ['insight', 'bbm', 'servis', 'pajak'];
  const shopTabNames = ['kasir', 'jual', 'etalase', 'produsen', 'riwayat', 'pelanggan', 'laporan', 'bi'];
  const cnTabs = cnTabNames.map(makeEl);
  const shopTabs = shopTabNames.map(makeEl);

  const byId = {};
  [...cnTabNames, 'jalan'].forEach((x) => { byId['cnTab-' + x] = makeEl('cnTab-' + x); });
  byId.carNotesFab = makeEl('carNotesFab');
  byId.cnPeriodeWrap = makeEl('cnPeriodeWrap');

  const document = {
    querySelectorAll: (sel) => {
      if (sel === '#page-carnotes .cn-tab') return cnTabs;
      if (sel === '#page-shop .cn-tab') return shopTabs;
      if (sel === '.nav-item') return [];
      return [];
    },
    getElementById: (id) => byId[id] || null,
  };

  return { document, cnTabs, shopTabs };
}

function makeCtx(document) {
  const noop = () => {};

  const setCnTab = extractFunctionWithGlobals('modules/vehicle/vehicle-core.js', 'setCnTab', {
    document,
    renderCnTab: noop,
  });
  const setShopTab = extractFunctionWithGlobals('modules/shop/cobek-io.js', 'setShopTab', {
    document,
    Kasir: { render: noop },
    renderProductList: noop,
    renderProdusenList: noop,
    renderShop: noop,
    renderShopGrafik: noop,
    renderShopRecent: noop,
    renderCustomerList: noop,
    Laporan: { renderTab: noop },
  });

  return loadSource(['modules/finance/filter-laporan.js'], {
    document,
    showPage: noop,
    setCnTab,
    setShopTab,
  });
}


function activeNameOf(tabs) {
  const active = tabs.filter((t) => t.classList.contains('active'));
  return active.map((t) => t.name);
}

test("goToList() — BUG-011: cnTabName='servis' harus meng-highlight tombol 'servis', bukan 'bbm'", () => {
  const { document, cnTabs } = makeFakeDom();
  const ctx = makeCtx(document);

  ctx.goToList('servisReminderCard', 'carnotes', 4, null, 'servis');

  assert.deepEqual(
    activeNameOf(cnTabs),
    ['servis'],
    "BUG-011: tombol tab yang ter-highlight 'active' harus 'servis' (sesuai konten yang dibuka), bukan 'bbm'",
  );
});

test("goToList() — BUG-011: shopTabName='pelanggan' harus meng-highlight tombol 'pelanggan', bukan 'produsen'", () => {
  const { document, shopTabs } = makeFakeDom();
  const ctx = makeCtx(document);

  ctx.goToList('someShopTarget', 'shop', 2, 'pelanggan', null);

  assert.deepEqual(
    activeNameOf(shopTabs),
    ['pelanggan'],
    "BUG-011: tombol tab yang ter-highlight 'active' harus 'pelanggan', bukan tombol lain (offset -1 lama = 'produsen')",
  );
});

test("goToList() — BUG-011: shopTabName='etalase' harus meng-highlight tombol 'etalase', bukan 'jual'", () => {
  const { document, shopTabs } = makeFakeDom();
  const ctx = makeCtx(document);

  ctx.goToList('someShopTarget', 'shop', 2, 'etalase', null);

  assert.deepEqual(
    activeNameOf(shopTabs),
    ['etalase'],
    "BUG-011: tombol tab yang ter-highlight 'active' harus 'etalase', bukan tombol lain",
  );
});
