'use strict';
// tests/s486-titipan-commitment-return.test.js — Sesi 486 (Case F: Partial
// Return / Pengembalian Dana Titipan, lihat
// RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md, lanjutan Gap #3 yang SUDAH
// SELESAI S485a-e — lihat RENCANA-SESI-GAP3-TITIPAN-COMMITMENT.md).
//
// Target: `DanaTitipanPortfolioAPI.recordReturn()`/`getReturns()`/
// `deleteReturn()` (backend, log/riwayat pengembalian — BUKAN upsert
// seperti saveCommitment()) + extend `build()` (`returnedTotal`/
// `outstandingPrincipal` per owner, derived tidak disimpan) + modal
// `titipanReturnModal` (`modals.js`) + object baru `DanaTitipanReturnUI`
// (open()/save()/deleteEntry(), murni konsumsi API — 0 logika CRUD/
// projection baru) + extend `DanaTitipanPortfolioPresenter.render()`
// (baris "Sudah Dikembalikan"/"Pokok Belum Dikembalikan" + riwayat +
// tombol "↩️ Catat Pengembalian").
//
// LAPIS 1-2 (gap-check template vs JS, tag balance) pola sama
// tests/s485d-titipan-commitment-ui.test.js. LAPIS 3+ (backend murni,
// tanpa DOM) pola sama tests/s485b-titipan-commitment-crud.test.js +
// tests/s485c-titipan-commitment-projection.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');

// ============================================================
// Helper DOM stateful — pola SAMA PERSIS
// tests/s485d-titipan-commitment-ui.test.js (select dgn option, value,
// selectedOptions, textContent, innerHTML tersimpan beneran).
// ============================================================
function makeElement(id) {
  let _innerHTML = '';
  let _value = '';
  let _textContent = '';
  let _options = [];
  const el = {
    id,
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
  Object.defineProperty(el, 'textContent', {
    get() { return _textContent; },
    set(v) { _textContent = v; },
  });
  Object.defineProperty(el, 'selectedOptions', {
    get() {
      const found = _options.find((o) => o.value === _value);
      if (found) return [found];
      return _options.length ? [_options[0]] : [];
    },
  });
  Object.defineProperty(el, '_options', { get() { return _options; } });
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

function baseD(investments, titipanCommitments, titipanReturns) {
  return {
    investments: investments || [],
    investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [],
    titipanCommitments: titipanCommitments || [],
    titipanReturns: titipanReturns || [],
  };
}

function oneOwnerD(principalAmount) {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    principalAmount !== undefined ? [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount }] : [],
  );
  return D;
}

function makeCtx(D, dom) {
  let saveCalls = 0;
  const openModalCalls = [];
  const closeModalCalls = [];
  const toastMessages = [];
  const confirmQueue = [];
  let _n = 0;
  const extraGlobals = {
    D,
    uid: () => 'r' + (_n += 1),
    save: () => { saveCalls++; },
    escapeHtml: (s) => String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c])),
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    fmtFull: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    openModal: (id) => { openModalCalls.push(id); },
    closeModal: (id) => { closeModalCalls.push(id); },
    toast: (msg) => { toastMessages.push(msg); },
    askConfirm: async () => (confirmQueue.length ? confirmQueue.shift() : true),
  };
  if (dom) extraGlobals.document = dom;
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    extraGlobals,
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI', 'DanaTitipanPortfolioPresenter', 'DanaTitipanReturnUI'],
  );
  ctx._saveCalls = () => saveCalls;
  ctx.openModalCalls = openModalCalls;
  ctx.closeModalCalls = closeModalCalls;
  ctx.toastMessages = toastMessages;
  ctx._confirmQueue = confirmQueue;
  return ctx;
}

function extractModalHtml() {
  const modalsSrc = fs.readFileSync(path.join(ROOT, 'modules/shared/modals.js'), 'utf8');
  const sandbox = {};
  const context = vm.createContext(sandbox);
  new vm.Script(modalsSrc + '\nthis.MODAL_HTML = MODAL_HTML;', { filename: 'modals.js' }).runInContext(context);
  const all = context.MODAL_HTML.join('\n');
  const m = /<div class="overlay" id="titipanReturnModal"[\s\S]*?\n\s*<\/div>\n<\/div>/.exec(all);
  assert.ok(m, 'titipanReturnModal harus ditemukan utuh di MODAL_HTML');
  return m[0];
}

// ============================================================
// LAPIS 1 -- gap-check template HTML asli (modals.js) vs id/data-action
// yang benar-benar dipakai DanaTitipanReturnUI.
// ============================================================

test('1. [gap-check] titipanReturnModal: semua id yang dipakai DanaTitipanReturnUI.open()/save() memang ada di template', () => {
  const html = extractModalHtml();
  const presenterSrc = fs.readFileSync(path.join(ROOT, 'modules/finance/dana-titipan-portfolio-render.js'), 'utf8');
  const start = presenterSrc.indexOf('const DanaTitipanReturnUI');
  assert.notEqual(start, -1, 'DanaTitipanReturnUI harus ada di presenter file -- nama berubah? update test ini');
  const uiCode = presenterSrc.slice(start);
  const idsUsed = [...uiCode.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(idsUsed.length >= 3, 'harus ada minimal beberapa getElementById dipanggil di DanaTitipanReturnUI');
  for (const id of new Set(idsUsed)) {
    assert.match(html, new RegExp(`id="${id}"`), `id="${id}" dipanggil DanaTitipanReturnUI tapi TIDAK ADA di template titipanReturnModal -- gap HTML/JS`);
  }
  assert.match(html, /data-action="DanaTitipanReturnUI\.save"/, 'tombol Simpan harus data-action="DanaTitipanReturnUI.save"');
});

test('2. [gap-check] titipanReturnModal: tag div/label seimbang', () => {
  const html = extractModalHtml();
  for (const tag of ['div', 'label']) {
    const openCount = (html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
    const closeCount = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(openCount, closeCount, `titipanReturnModal: <${tag}> tidak seimbang (${openCount} buka vs ${closeCount} tutup)`);
  }
});

// ============================================================
// LAPIS 2 -- backend murni: recordReturn()/getReturns()/deleteReturn().
// ============================================================

test('3. recordReturn(): create baru -> push ke D.titipanReturns, panggil save()', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000, returnDate: '2026-03-01', notes: 'cicilan 1' });
  assert.equal(D.titipanReturns.length, 1);
  assert.equal(rec.ownerId, 'budi');
  assert.equal(rec.ownerName, 'Budi');
  assert.equal(rec.amount, 20000000);
  assert.equal(rec.returnDate, '2026-03-01');
  assert.equal(rec.notes, 'cicilan 1');
  assert.ok(rec.id);
  assert.equal(ctx._saveCalls(), 1);
});

test('4. recordReturn(): dipanggil 2x utk owner sama -> 2 record TERPISAH (log/riwayat, BUKAN upsert seperti saveCommitment())', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 15000000 });
  assert.equal(D.titipanReturns.length, 2, 'harus 2 baris terpisah, bukan update in place');
});

test('5. recordReturn(): ownerId tidak dikenal (belum ada di listExistingOwners()) -> throw, TIDAK menulis apa pun', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'hantu', amount: 1000 }), /tidak ditemukan/);
  assert.equal(D.titipanReturns.length, 0);
});

test('6. recordReturn(): amount negatif -> ditolak, TIDAK menulis apa pun', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: -5000 }), />= 0/);
  assert.equal(D.titipanReturns.length, 0);
});

test('7. recordReturn(): amount non-numerik -> ditolak', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  assert.throws(() => ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 'abc' }));
  assert.equal(D.titipanReturns.length, 0);
});

test('8. recordReturn(): tidak menyentuh D.accounts/D.transactions/D.investmentTx/D.investments/D.debts sama sekali', () => {
  const D = oneOwnerD(100000000);
  const before = {
    accounts: JSON.stringify(D.accounts), transactions: JSON.stringify(D.transactions),
    investmentTx: JSON.stringify(D.investmentTx), investments: JSON.stringify(D.investments),
    debts: JSON.stringify(D.debts),
  };
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  assert.equal(JSON.stringify(D.accounts), before.accounts);
  assert.equal(JSON.stringify(D.transactions), before.transactions);
  assert.equal(JSON.stringify(D.investmentTx), before.investmentTx);
  assert.equal(JSON.stringify(D.investments), before.investments);
  assert.equal(JSON.stringify(D.debts), before.debts);
});

test('9. getReturns(): tanpa argumen -> semua record; dengan ownerId -> difilter utk owner itu saja', () => {
  const D = oneOwnerD(100000000);
  D.investments.push({ id: 'h2', name: 'RDPU', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false }] });
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'cici', amount: 5000000 });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 10000000 });
  assert.equal(ctx.DanaTitipanPortfolioAPI.getReturns().length, 3);
  const budiOnly = ctx.DanaTitipanPortfolioAPI.getReturns('budi');
  assert.equal(budiOnly.length, 2);
  assert.ok(budiOnly.every((r) => r.ownerId === 'budi'));
});

test('10. deleteReturn(): id ditemukan -> terhapus, return true, panggil save()', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  const ok = ctx.DanaTitipanPortfolioAPI.deleteReturn(rec.id);
  assert.equal(ok, true);
  assert.equal(D.titipanReturns.length, 0);
  assert.equal(ctx._saveCalls(), 2, '1x recordReturn + 1x deleteReturn');
});

test('11. deleteReturn(): id tidak ditemukan -> return false, TIDAK mengubah apa pun, TIDAK throw', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  const ok = ctx.DanaTitipanPortfolioAPI.deleteReturn('id-hantu');
  assert.equal(ok, false);
  assert.equal(D.titipanReturns.length, 1);
});

// ============================================================
// LAPIS 3 -- build(): returnedTotal/outstandingPrincipal per owner
// (derived, tidak disimpan) + totals.
// ============================================================

test('12. build(): owner punya principal, belum ada return -> returnedTotal=0, outstandingPrincipal=principalAmount persis', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 0);
  assert.equal(budi.outstandingPrincipal, 100000000);
});

test('13. build(): owner principal 100jt + return 30jt -> outstandingPrincipal = 70jt', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 30000000 });
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 30000000);
  assert.equal(budi.outstandingPrincipal, 70000000);
});

test('14. build(): total return >= principal -> outstandingPrincipal clamp ke 0 (tidak pernah negatif)', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 60000000 });
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 60000000 });
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 120000000);
  assert.equal(budi.outstandingPrincipal, 0);
});

test('15. build(): owner PRINCIPAL_NOT_SET tapi sudah ada return -> outstandingPrincipal tetap null, returnedTotal tetap dijumlah', () => {
  const D = oneOwnerD(); // tidak ada commitment sama sekali
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 10000000 });
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocationStatus, 'PRINCIPAL_NOT_SET');
  assert.equal(budi.returnedTotal, 10000000);
  assert.equal(budi.outstandingPrincipal, null);
});

test('16. build(): owner tanpa return sama sekali -> returnedTotal = 0 (bukan undefined/null)', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 0);
  assert.notEqual(budi.returnedTotal, null);
  assert.notEqual(budi.returnedTotal, undefined);
});

test('17. build(): totals.returnedTotalSum menjumlah SEMUA owner (termasuk PRINCIPAL_NOT_SET); totals.outstandingPrincipalTotal HANYA owner yang principal-nya sudah diset', () => {
  const D = oneOwnerD(100000000); // budi
  D.investments.push({ id: 'h2', name: 'RDPU', unit: 1, avgPrice: 10000000, currentPrice: 10000000, owners: [{ ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false }] });
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 40000000 }); // budi: principal 100jt, return 40jt -> outstanding 60jt
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'cici', amount: 5000000 }); // cici: PRINCIPAL_NOT_SET
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.totals.returnedTotalSum, 45000000, 'harus menjumlah budi+cici, termasuk yang PRINCIPAL_NOT_SET');
  assert.equal(p.totals.outstandingPrincipalTotal, 60000000, 'hanya budi (principal sudah diset), cici TIDAK ikut menyumbang');
});

test('18. build(): tidak mengubah allocatedPrincipal/currentValue/gain/allocationStatus yang sudah ada sejak S485c (0 regresi rumus lama)', () => {
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.allocatedPrincipal, 800000); // 100 unit * 8000 avgPrice
  assert.equal(budi.currentValue, 900000); // 100 unit * 9000 currentPrice
  assert.equal(budi.allocationStatus, 'OK');
});

// ============================================================
// LAPIS 4 -- render(): wording "Sudah Dikembalikan"/"Pokok Belum
// Dikembalikan", tombol "Catat Pengembalian", riwayat per owner,
// escapeHtml pada notes.
// ============================================================

test('19. render(): menampilkan "Sudah Dikembalikan" & "Pokok Belum Dikembalikan" (BUKAN "Outstanding"), tombol "Catat Pengembalian"', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Sudah Dikembalikan/);
  assert.match(html, /Pokok Belum Dikembalikan/);
  assert.doesNotMatch(html, /Outstanding/i);
  assert.match(html, /Catat Pengembalian/);
  assert.match(html, /data-action="DanaTitipanReturnUI\.open"/);
});

test('20. render(): owner belum ada return sama sekali -> "Pokok Belum Dikembalikan" tampil = principalAmount penuh, tanpa riwayat', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(50000000);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /Pokok Belum Dikembalikan/);
  assert.doesNotMatch(html, /DanaTitipanReturnUI\.deleteEntry/, 'belum ada riwayat -> belum ada tombol hapus riwayat');
  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.outstandingPrincipal, 50000000);
});

test('21. render(): riwayat pengembalian muncul per owner, notes di-escapeHtml (anti-XSS)', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000, notes: '<script>alert(1)</script>' });
  ctx.DanaTitipanPortfolioPresenter.render();
  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  assert.match(html, /DanaTitipanReturnUI\.deleteEntry/, 'riwayat return harus punya tombol hapus per baris');
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/, 'notes mentah TIDAK boleh lolos ke innerHTML (XSS)');
  assert.match(html, /&lt;script&gt;/, 'notes harus lolos lewat escapeHtml()');
});

// ============================================================
// LAPIS 5 -- DanaTitipanReturnUI.open()/save()/deleteEntry() lewat DOM
// stateful.
// ============================================================

test('22. open(ownerId): owner terisi readonly dari listExistingOwners(), field nominal/tanggal/catatan KOSONG, openModal terpanggil', () => {
  const dom = makeStatefulDom();
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanReturnUI.open('budi');
  assert.equal(dom.getElementById('titipanReturnOwnerId').value, 'budi');
  assert.equal(dom.getElementById('titipanReturnOwnerDisplay').textContent, 'Budi');
  assert.equal(dom.getElementById('titipanReturnAmount').value, '');
  assert.equal(dom.getElementById('titipanReturnDate').value, '');
  assert.equal(dom.getElementById('titipanReturnNotes').value, '');
  assert.deepEqual(ctx.openModalCalls, ['titipanReturnModal']);
});

test('23. save(): alur sukses -- baca form, panggil recordReturn(), tutup modal, render() ulang, toast sukses', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  let renderCalls = 0;
  const origRender = ctx.DanaTitipanPortfolioPresenter.render;
  ctx.DanaTitipanPortfolioPresenter.render = function () { renderCalls += 1; return origRender.call(this); };

  ctx.DanaTitipanReturnUI.open('budi');
  dom.getElementById('titipanReturnAmount').value = '25000000';
  dom.getElementById('titipanReturnDate').value = '2026-03-05';
  dom.getElementById('titipanReturnNotes').value = 'cicilan pertama';
  ctx.DanaTitipanReturnUI.save();

  assert.equal(D.titipanReturns.length, 1);
  const saved = D.titipanReturns[0];
  assert.equal(saved.ownerId, 'budi');
  assert.equal(saved.amount, 25000000);
  assert.equal(saved.returnDate, '2026-03-05');
  assert.equal(saved.notes, 'cicilan pertama');
  assert.deepEqual(ctx.closeModalCalls, ['titipanReturnModal']);
  assert.equal(renderCalls, 1);
  assert.match(ctx.toastMessages.join(' '), /tercatat/);
});

test('24. save(): tidak ada ownerId (form rusak/belum open()) -> toast peringatan, recordReturn TIDAK terpanggil, modal TIDAK ditutup', () => {
  const dom = makeStatefulDom();
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  ctx.DanaTitipanReturnUI.save();
  assert.equal(D.titipanReturns.length, 0);
  assert.match(ctx.toastMessages.join(' '), /Owner wajib dipilih/);
  assert.deepEqual(ctx.closeModalCalls, []);
});

test('25. save(): recordReturn() throw (mis. amount negatif) -> toast berisi pesan error, modal TIDAK ditutup, render() TIDAK dipanggil ulang', () => {
  const dom = makeStatefulDom();
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  let renderCalls = 0;
  ctx.DanaTitipanPortfolioPresenter.render = () => { renderCalls += 1; };

  ctx.DanaTitipanReturnUI.open('budi');
  dom.getElementById('titipanReturnAmount').value = '-1000';
  ctx.DanaTitipanReturnUI.save();

  assert.equal(D.titipanReturns.length, 0);
  assert.deepEqual(ctx.closeModalCalls, []);
  assert.equal(renderCalls, 0);
  assert.match(ctx.toastMessages.join(' '), /⚠️/);
});

test('26. deleteEntry(id): confirm ya -> deleteReturn() terpanggil, render() ulang, toast', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  let renderCalls = 0;
  ctx.DanaTitipanPortfolioPresenter.render = () => { renderCalls += 1; };
  ctx._confirmQueue.push(true);

  return ctx.DanaTitipanReturnUI.deleteEntry(rec.id).then(() => {
    assert.equal(D.titipanReturns.length, 0);
    assert.equal(renderCalls, 1);
    assert.match(ctx.toastMessages.join(' '), /dihapus/);
  });
});

test('27. deleteEntry(id): confirm batal -> deleteReturn() TIDAK terpanggil, data tetap utuh', () => {
  const dom = makeStatefulDom();
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);
  const rec = ctx.DanaTitipanPortfolioAPI.recordReturn({ ownerId: 'budi', amount: 20000000 });
  let renderCalls = 0;
  ctx.DanaTitipanPortfolioPresenter.render = () => { renderCalls += 1; };
  ctx._confirmQueue.push(false);

  return ctx.DanaTitipanReturnUI.deleteEntry(rec.id).then(() => {
    assert.equal(D.titipanReturns.length, 1);
    assert.equal(renderCalls, 0);
  });
});

// ============================================================
// LAPIS 6 -- end-to-end ringkas: open -> isi -> save -> render() ->
// outstandingPrincipal & riwayat benar-benar terlihat.
// ============================================================

test('28. [flow] end-to-end: catat 2x pengembalian parsial -> render() menampilkan outstanding terkini & 2 baris riwayat', () => {
  const dom = makeStatefulDom();
  dom.getElementById('danaTitipanPortfolioList');
  const D = oneOwnerD(100000000);
  const ctx = makeCtx(D, dom);

  ctx.DanaTitipanReturnUI.open('budi');
  dom.getElementById('titipanReturnAmount').value = '30000000';
  ctx.DanaTitipanReturnUI.save();

  ctx.DanaTitipanReturnUI.open('budi');
  dom.getElementById('titipanReturnAmount').value = '20000000';
  ctx.DanaTitipanReturnUI.save();

  const p = ctx.DanaTitipanPortfolioAPI.build();
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(budi.returnedTotal, 50000000);
  assert.equal(budi.outstandingPrincipal, 50000000);

  const html = dom.getElementById('danaTitipanPortfolioList').innerHTML;
  const deleteBtnCount = (html.match(/DanaTitipanReturnUI\.deleteEntry/g) || []).length;
  assert.equal(deleteBtnCount, 2, 'harus ada 2 tombol hapus riwayat (2 baris pengembalian)');
});
