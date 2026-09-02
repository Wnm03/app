'use strict';
// tests/s550-titipan-commitment-ui-tablist-sync.test.js — Sesi 550
// (FIX-S550-DANA-TITIPAN-TABLIST-SYNC-COMMITMENT-UI).
//
// Latar belakang: Sesi 498 menambah container BARU #danaTitipanTabList
// (sub-tab Laporan > Dana Titipan) via
// `DanaTitipanPortfolioPresenter.renderInto(containerId)`, dan
// `renderLaporan()` (modules-render.js) sudah dipatch waktu itu supaya
// memanggil BAIK `DanaTitipanPortfolioPresenter.render()` (container LAMA
// #danaTitipanPortfolioList) MAUPUN `.renderInto('danaTitipanTabList')`
// (container BARU) setiap kali laporan dirender ulang.
//
// Yang KETINGGALAN sampai sesi ini: `DanaTitipanCommitmentUI.save()` dan
// `DanaTitipanCommitmentUI.deleteCommitment()` cuma memanggil
// `DanaTitipanPortfolioPresenter.render()` (container lama) setelah
// commit/hapus pokok dana titipan lewat modal — container BARU
// #danaTitipanTabList TIDAK ikut ter-refresh sampai `renderLaporan()`
// dipanggil ulang dari tempat lain (mis. ganti tab). Sesi 550 menambah
// panggilan `.renderInto('danaTitipanTabList')` PERSIS setelah `.render()`
// di kedua method itu, meniru pola yang sudah ada di `renderLaporan()`
// (0 rumus/logic CRUD baru, murni panggilan render tambahan).
//
// Target test:
//   1. save() alur sukses -> renderInto('danaTitipanTabList') terpanggil
//      SETELAH render(), tepat 1x.
//   2. save() gagal (validasi/throw) -> render()/renderInto() KEDUANYA
//      TIDAK terpanggil (regresi guard: tidak ada render dini kalau save
//      gagal).
//   3. save() tanpa owner dipilih -> render()/renderInto() KEDUANYA TIDAK
//      terpanggil.
//   4. deleteCommitment() alur sukses (confirm ya) -> renderInto(...)
//      terpanggil SETELAH render(), tepat 1x.
//   5. deleteCommitment() confirm batal -> render()/renderInto() KEDUANYA
//      TIDAK terpanggil.
//   6. Guard aman kalau DanaTitipanPortfolioPresenter belum ter-load sama
//      sekali -- tidak throw.
//   7. Container #danaTitipanTabList BENERAN berisi HTML (bukan string
//      kosong) setelah save() -- bukti renderInto() bukan cuma
//      "terpanggil" tapi sungguhan menulis ke container yang benar.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// ============================================================
// DOM tiruan STATEFUL (pola sama tests/s485d-titipan-commitment-ui.test.js)
// ============================================================
function makeElement(id) {
  let _innerHTML = '';
  let _value = '';
  let _options = [];
  const el = {
    id,
    textContent: '',
    placeholder: '',
    className: '',
    disabled: false,
    style: {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return _innerHTML; },
    set(html) {
      _innerHTML = String(html);
      _options = [];
      const re = /<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g;
      let m;
      while ((m = re.exec(_innerHTML))) _options.push({ value: m[1], textContent: m[2] });
    },
  });
  Object.defineProperty(el, 'value', {
    get() { return _value; },
    set(v) { _value = v; },
  });
  Object.defineProperty(el, 'selectedOptions', {
    get() {
      const found = _options.find((o) => o.value === _value);
      if (found) return [found];
      return _options.length ? [_options[0]] : [];
    },
  });
  return el;
}

function makeStatefulDom() {
  const registry = new Map();
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeD(investments, titipanCommitments) {
  return {
    investments: investments || [],
    investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [],
    titipanCommitments: titipanCommitments || [],
  };
}

function makeCtx(D, dom, extraGlobals) {
  const closeModalCalls = [];
  const toastMessages = [];
  let confirmAnswer = true;
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js', 'modules/finance/dana-titipan-portfolio-render-b.js',
    ],
    Object.assign({
      D,
      document: dom,
      uid: () => 'commit_' + Math.random().toString(36).slice(2),
      save: () => {},
      escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
      }[c])),
      fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
      openModal: () => {},
      closeModal: (id) => { closeModalCalls.push(id); },
      toast: (msg) => { toastMessages.push(msg); },
      askConfirm: async () => confirmAnswer,
    }, extraGlobals || {}),
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanCommitmentUI'],
  );
  ctx.closeModalCalls = closeModalCalls;
  ctx.toastMessages = toastMessages;
  ctx.setConfirmAnswer = (v) => { confirmAnswer = v; };
  return ctx;
}

// Bungkus render()/renderInto() dgn spy TANPA mengubah perilaku aslinya
// (tetap panggil implementasi asli), supaya urutan & jumlah panggilan
// bisa dicek sekaligus outputnya (container innerHTML) tetap benar.
function spyOnPresenter(ctx) {
  const calls = [];
  const origRender = ctx.DanaTitipanPortfolioPresenter.render;
  const origRenderInto = ctx.DanaTitipanPortfolioPresenter.renderInto;
  ctx.DanaTitipanPortfolioPresenter.render = function (...args) {
    calls.push('render');
    return origRender.apply(this, args);
  };
  ctx.DanaTitipanPortfolioPresenter.renderInto = function (...args) {
    calls.push('renderInto:' + args[0]);
    return origRenderInto.apply(this, args);
  };
  return calls;
}

function baseD() {
  return makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [],
  );
}

// ============================================================
// save()
// ============================================================

test('S550(1). save() sukses -> render() (yang secara internal panggil renderInto("danaTitipanPortfolioList")) lalu renderInto("danaTitipanTabList") tambahan, urutan render() dulu', () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  dom.getElementById('danaTitipanTabList');
  const calls = spyOnPresenter(ctx);

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '75000000';
  ctx.DanaTitipanCommitmentUI.save();

  // render() = renderInto('danaTitipanPortfolioList') (S498, tidak diubah
  // sesi ini) — jadi urutan yang benar: render() dulu (yg di dalamnya
  // memanggil renderInto ke container LAMA), BARU renderInto() eksplisit
  // ke container BARU #danaTitipanTabList (baris baru sesi 550).
  assert.deepEqual(calls, ['render', 'renderInto:danaTitipanPortfolioList', 'renderInto:danaTitipanTabList']);
  assert.deepEqual(ctx.closeModalCalls, ['titipanCommitmentModal']);
});

test('S550(2). save() gagal (principal negatif, saveCommitment() throw) -> render() DAN renderInto() TIDAK terpanggil sama sekali', () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  const calls = spyOnPresenter(ctx);

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '-5000000';
  ctx.DanaTitipanCommitmentUI.save();

  assert.deepEqual(calls, []);
  assert.deepEqual(ctx.closeModalCalls, []);
  assert.match(ctx.toastMessages.join(' '), /⚠️/);
});

test('S550(3). save() tanpa owner dipilih -> render() DAN renderInto() TIDAK terpanggil', () => {
  const dom = makeStatefulDom();
  const D = makeD([], []);
  const ctx = makeCtx(D, dom);
  const calls = spyOnPresenter(ctx);

  dom.getElementById('titipanCommitOwner').value = '';
  ctx.DanaTitipanCommitmentUI.save();

  assert.deepEqual(calls, []);
  assert.equal(D.titipanCommitments.length, 0);
});

// ============================================================
// deleteCommitment()
// ============================================================

test('S550(4). deleteCommitment() confirm ya -> render() lalu renderInto("danaTitipanTabList") tambahan', async () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000, committedDate: '2026-01-01', notes: '' }],
  );
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  dom.getElementById('danaTitipanTabList');
  ctx.setConfirmAnswer(true);
  const calls = spyOnPresenter(ctx);

  ctx.DanaTitipanCommitmentUI.open('budi');
  await ctx.DanaTitipanCommitmentUI.deleteCommitment();

  assert.deepEqual(calls, ['render', 'renderInto:danaTitipanPortfolioList', 'renderInto:danaTitipanTabList']);
  assert.equal(D.titipanCommitments.length, 0);
  assert.deepEqual(ctx.closeModalCalls, ['titipanCommitmentModal']);
});

test('S550(5). deleteCommitment() confirm batal -> render() DAN renderInto() TIDAK terpanggil, data tetap utuh', async () => {
  const dom = makeStatefulDom();
  const D = makeD(
    [{ id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1000, currentPrice: 1000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000, committedDate: '2026-01-01', notes: '' }],
  );
  const ctx = makeCtx(D, dom);
  ctx.setConfirmAnswer(false);
  const calls = spyOnPresenter(ctx);

  ctx.DanaTitipanCommitmentUI.open('budi');
  await ctx.DanaTitipanCommitmentUI.deleteCommitment();

  assert.deepEqual(calls, []);
  assert.equal(D.titipanCommitments.length, 1);
  assert.deepEqual(ctx.closeModalCalls, []);
});

// ============================================================
// Guard aman & bukti nyata container ke-render
// ============================================================

test('S550(6). guard aman: kalau DanaTitipanPortfolioPresenter belum ter-load (typeof undefined), save() TIDAK throw & tetap menyimpan data', () => {
  // Catatan: render() sendiri (S498) sudah bergantung ke this.renderInto()
  // secara internal (render() = renderInto('danaTitipanPortfolioList')),
  // jadi skenario "presenter ada tapi renderInto hilang" bukan kombinasi
  // valid di codebase saat ini -- guard yang benar-benar relevan diuji di
  // sini adalah `typeof DanaTitipanPortfolioPresenter !== 'undefined'`
  // (presenter belum ter-load sama sekali), pola sama persis dgn guard
  // yang sudah lama dipakai renderLaporan().
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  const savedPresenter = ctx.DanaTitipanPortfolioPresenter;
  ctx.DanaTitipanPortfolioPresenter = undefined;

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '75000000';
  assert.doesNotThrow(() => ctx.DanaTitipanCommitmentUI.save());
  assert.equal(D.titipanCommitments.length, 1, 'saveCommitment() tetap jalan walau presenter belum ter-load');

  ctx.DanaTitipanPortfolioPresenter = savedPresenter; // restore, jaga-jaga dipakai test lain di file yg sama
});

test('S550(7). save() sukses -> #danaTitipanTabList BENERAN terisi HTML (bukan string kosong), bukti renderInto() menulis ke container yang benar', () => {
  const dom = makeStatefulDom();
  const D = baseD();
  const ctx = makeCtx(D, dom);
  dom.getElementById('danaTitipanPortfolioList');
  const tabListEl = dom.getElementById('danaTitipanTabList');
  assert.equal(tabListEl.innerHTML, '', 'sanity check: kosong sebelum save()');

  ctx.DanaTitipanCommitmentUI.open('budi');
  dom.getElementById('titipanCommitPrincipal').value = '75000000';
  ctx.DanaTitipanCommitmentUI.save();

  assert.ok(tabListEl.innerHTML.length > 0, '#danaTitipanTabList harus terisi setelah save()');
  assert.match(tabListEl.innerHTML, /Budi/, 'konten harus mengandung nama owner yang baru saja di-commit');
});
