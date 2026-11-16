'use strict';
// Tampilan bertahap Data Health Check: grup PERINGATAN dgn > 5 kartu diciutkan (kartu TETAP di DOM, hanya `hidden`).
// Error tidak pernah diciutkan. Toggle = DOM + state saja (tanpa rescan / openModal). State bertahan saat render ulang
// selama modal terbuka (aksi perbaikan memanggil runDataHealthCheck() lagi) dan direset saat modal tertutup.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(extra) {
  return Object.assign({
    accounts: [], vehicles: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], preorders: [],
    sparepartCats: [{ id: 'c1', vehicleId: 'v2', name: 'Rem' }],
  }, extra || {});
}
const orphanLogs = (n) => Array.from({ length: n }, (_, i) => ({ id: 'o' + i, item: 'Oli' + i, categoryId: 'zzz' + i, date: '2026-01-01' }));
const wrongVehLogs = (n) => Array.from({ length: n }, (_, i) => ({ id: 'w' + i, item: 'Rem' + i, categoryId: 'c1', vehicleId: 'v1', date: '2026-01-01' }));

function boot(D, opts) {
  opts = opts || {};
  const els = { dataHealthSummary: { innerHTML: '' }, dataHealthList: { innerHTML: '' } };
  const modal = { classList: { contains: () => !!opts.open } };
  if (opts.modal !== false) els.dataHealthModal = modal;
  const dom = { flips: [], heads: [] };
  const document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: (sel) => {
      if (/data-dh-grp/.test(sel)) { const o = { hidden: true }; dom.flips.push(o); return [o]; }
      if (/data-dh-head/.test(sel)) { const lbl = { textContent: '' }; const h = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, querySelector: () => lbl, lbl }; dom.heads.push(h); return [h]; }
      return [];
    },
  };
  const win = {};
  let opened = 0;
  const ctx = loadSource(['modules/shared/helper-teks.js', 'data-health-check.js'], { D, document, window: win, openModal: () => { opened++; } });
  return { ctx, els, dom, win, opened: () => opened };
}
const cards = (h) => (h.match(/padding:10px;border-radius:10px/g) || []).length;
const hiddenCards = (h) => (h.match(/data-dh-grp="\d+" hidden/g) || []).length;

test('grup peringatan > 5 kartu: ada tombol header, semua kartu tetap di DOM dan hidden', () => {
  const b = boot(makeD({ servisLogs: orphanLogs(7) }));
  const issues = b.ctx.runDataHealthCheck();
  const h = b.els.dataHealthList.innerHTML;
  assert.equal(cards(h), issues.length);
  assert.equal(hiddenCards(h), 7);
  assert.match(h, /data-action="DataHealth\.toggleGroup"/);
  assert.match(h, /7 temuan/);
  assert.match(h, /aria-expanded="false"/);
  assert.match(h, /categoryId orphan/); // detail tetap terbaca di innerHTML (self-test bergantung ini)
});

test('grup peringatan <= 5 kartu: tidak diciutkan, tanpa tombol header', () => {
  const b = boot(makeD({ servisLogs: orphanLogs(5) }));
  b.ctx.runDataHealthCheck();
  const h = b.els.dataHealthList.innerHTML;
  assert.equal(hiddenCards(h), 0);
  assert.doesNotMatch(h, /DataHealth\.toggleGroup/);
});

test('error TIDAK pernah diciutkan walau > 5 kartu', () => {
  const b = boot(makeD({ servisLogs: wrongVehLogs(8) }));
  const issues = b.ctx.runDataHealthCheck();
  assert.equal(issues.filter((i) => i.level === 'error' && /kategori kendaraan lain/.test(i.title)).length, 8);
  const h = b.els.dataHealthList.innerHTML;
  assert.equal(hiddenCards(h), 0);
  assert.doesNotMatch(h, /DataHealth\.toggleGroup/);
});

test('toggleGroup tidak memindai ulang / membuka modal; membalik hidden & aria-expanded', () => {
  const b = boot(makeD({ servisLogs: orphanLogs(7) }));
  b.ctx.runDataHealthCheck();
  const before = b.opened();
  assert.equal(typeof b.win.DataHealth.toggleGroup, 'function');
  b.win.DataHealth.toggleGroup(0);
  assert.equal(b.opened(), before, 'tidak boleh openModal/rescan');
  assert.equal(b.dom.flips[0].hidden, false);
  assert.equal(b.dom.heads[0].attrs['aria-expanded'], 'true');
  assert.equal(b.dom.heads[0].lbl.textContent, 'Sembunyikan');
  b.win.DataHealth.toggleGroup(0);
  assert.equal(b.dom.flips[1].hidden, true);
  assert.equal(b.dom.heads[1].lbl.textContent, 'Lihat detail');
  b.win.DataHealth.toggleGroup(99); // indeks tak dikenal -> aman, tidak melempar
});

test('state terbuka bertahan saat render ulang selama modal terbuka; reset bila modal tertutup', () => {
  const D = makeD({ servisLogs: orphanLogs(7) });
  const b = boot(D, { open: true });
  b.ctx.runDataHealthCheck();
  b.win.DataHealth.toggleGroup(0);
  b.ctx.runDataHealthCheck(); // mis. setelah aksi perbaikan
  assert.equal(hiddenCards(b.els.dataHealthList.innerHTML), 0);
  assert.match(b.els.dataHealthList.innerHTML, /aria-expanded="true"/);
  const c = boot(D, { open: false });
  c.ctx.runDataHealthCheck();
  c.win.DataHealth.toggleGroup(0);
  c.ctx.runDataHealthCheck(); // modal tertutup -> buka ulang = ciut lagi
  assert.equal(hiddenCards(c.els.dataHealthList.innerHTML), 7);
});

test('batas kartu per grup peringatan: render maks 100, catatan sisa; nilai kembalian & ringkasan tetap lengkap', () => {
  const b = boot(makeD({ servisLogs: orphanLogs(130) }));
  const issues = b.ctx.runDataHealthCheck();
  const orphan = issues.filter((i) => /categoryId orphan/.test(i.title));
  assert.equal(orphan.length, 130, 'nilai kembalian tidak dipotong');
  const h = b.els.dataHealthList.innerHTML;
  assert.equal(cards(h), 100);
  assert.match(h, /Menampilkan 100 dari 130 temuan/);
  assert.match(h, /130 temuan/); // judul tombol header memakai jumlah penuh
  assert.match(b.els.dataHealthSummary.innerHTML, /<b>130 peringatan<\/b>/);
  assert.match(h, /data-dh-note="0" data-dh-grp="0" hidden/); // catatan ikut ciut bersama grup
});

test('batas kartu: tepat 100 kartu -> tanpa catatan; error TIDAK pernah dibatasi', () => {
  const pas = boot(makeD({ servisLogs: orphanLogs(100) }));
  pas.ctx.runDataHealthCheck();
  assert.equal(cards(pas.els.dataHealthList.innerHTML), 100);
  assert.doesNotMatch(pas.els.dataHealthList.innerHTML, /Menampilkan 100 dari/);
  const err = boot(makeD({ servisLogs: wrongVehLogs(130) }));
  const issues = err.ctx.runDataHealthCheck();
  assert.equal(cards(err.els.dataHealthList.innerHTML), issues.length);
  assert.doesNotMatch(err.els.dataHealthList.innerHTML, /Menampilkan 100 dari/);
});
