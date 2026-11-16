'use strict';
// Data Health Check: modal HARUS menampilkan SEMUA temuan (bukan hanya yang di-push sebelum blok render).
// Bug asal: render dipanggil di tengah runDataHealthCheck(); cek S2818-S2820, kategori servis, dan preorder
// di-push sesudahnya sehingga hanya masuk nilai kembalian -> ringkasan bisa "sehat" padahal ada temuan.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(extra) {
  return Object.assign({
    accounts: [], vehicles: [], transactions: [], bills: [], assets: [],
    bbmLogs: [], piutang: [], partsStock: [], debts: [], budgets: [],
    categories: { income: [], expense: [] }, cobek: [], lifeBalanceSnapshots: [], products: [],
    servisLogs: [], wealthSnapshots: [], wishlist: [], workDays: [], renovProjects: [], preorders: [], sparepartCats: [],
  }, extra || {});
}
function run(D) {
  const els = { dataHealthSummary: { innerHTML: '' }, dataHealthList: { innerHTML: '' } };
  const document = { getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [] };
  let opened = 0;
  const ctx = loadSource(['modules/shared/helper-teks.js', 'data-health-check.js'], { D, document, openModal: () => { opened++; } });
  const issues = ctx.runDataHealthCheck();
  return { issues, els, opened };
}
const cards = (html) => (html.match(/padding:10px;border-radius:10px/g) || []).length;

test('hanya temuan pasca-render (preorder orphan) -> tetap tampil, ringkasan bukan "sehat"', () => {
  const { issues, els } = run(makeD({ preorders: [{ id: 'p1', productId: 'hilang', status: 'open' }] }));
  const f = issues.filter((i) => /Preorder/i.test(i.title));
  assert.ok(f.length >= 1, 'fixture harus menghasilkan temuan preorder');
  assert.doesNotMatch(els.dataHealthSummary.innerHTML, /Tidak ditemukan masalah/);
  assert.match(els.dataHealthList.innerHTML, /Preorder/);
});

test('hanya temuan pasca-render (categoryId servis orphan) -> tampil di daftar', () => {
  const { issues, els } = run(makeD({ servisLogs: [{ id: 's1', item: 'Oli', categoryId: 'zzz', date: '2026-01-01' }] }));
  assert.ok(issues.some((i) => /categoryId orphan/.test(i.title)));
  assert.match(els.dataHealthList.innerHTML, /categoryId orphan/);
});

test('hanya temuan pasca-render (nominal pecahan) -> tampil di daftar', () => {
  const { issues, els } = run(makeD({ transactions: [{ id: 1, date: '2026-01-01', type: 'expense', amount: 100.5, category: 'x' }] }));
  assert.ok(issues.some((i) => /Nominal pecahan/.test(i.title)));
  assert.match(els.dataHealthList.innerHTML, /Nominal pecahan/);
});

test('jumlah kartu di DOM = panjang nilai kembalian; hitungan error/peringatan di ringkasan benar', () => {
  const { issues, els } = run(makeD({
    preorders: [{ id: 'p1', productId: 'hilang', status: 'open' }],
    servisLogs: [{ id: 's1', item: 'Oli', categoryId: 'zzz', date: '2026-01-01' }],
    transactions: [{ id: 1, date: '2026-01-01', type: 'expense', amount: 100.5, category: 'x' }],
  }));
  assert.ok(issues.length >= 3);
  assert.equal(cards(els.dataHealthList.innerHTML), issues.length);
  const e = issues.filter((i) => i.level === 'error').length;
  const w = issues.filter((i) => i.level === 'warn').length;
  assert.match(els.dataHealthSummary.innerHTML, new RegExp('<b>' + e + ' error</b> & <b>' + w + ' peringatan</b>'));
});

test('tanpa temuan -> ringkasan sehat, modal tetap dibuka sekali, nilai kembalian array kosong', () => {
  const { issues, els, opened } = run(makeD());
  assert.equal(issues.length, 0);
  assert.match(els.dataHealthSummary.innerHTML, /Tidak ditemukan masalah/);
  assert.equal(opened, 1);
});

test('urutan tampil: error di atas peringatan; nilai kembalian tetap urutan asli', () => {
  const { issues, els } = run(makeD({
    servisLogs: [{ id: 's1', item: 'Oli', categoryId: 'zzz', date: '2026-01-01' }, { id: 's2', item: 'Rem', categoryId: 'c1', vehicleId: 'v1', date: '2026-01-01' }],
    vehicles: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }],
    sparepartCats: [{ id: 'c1', vehicleId: 'v2', name: 'Rem' }],
    preorders: [{ id: 'p1', productId: 'hilang', status: 'open' }],
  }));
  assert.ok(issues.some((i) => i.level === 'error'), 'fixture harus punya error');
  assert.ok(issues.findIndex((i) => i.level === 'error') > issues.findIndex((i) => i.level === 'warn'), 'di array asli error muncul sesudah warn');
  const html = els.dataHealthList.innerHTML;
  const lvl = [...html.matchAll(/(❌|⚠️) /g)].map((m) => m[1]);
  const firstWarn = lvl.indexOf('⚠️');
  assert.ok(firstWarn === -1 || !lvl.slice(firstWarn).includes('❌'), 'tidak boleh ada error di bawah peringatan');
  assert.equal(issues.length, lvl.length);
});

test('ringkasan memuat rincian per jenis temuan bila >= 2 jenis; tidak ada bila 1 jenis', () => {
  const dua = run(makeD({
    servisLogs: [{ id: 's1', item: 'Oli', categoryId: 'zzz', date: '2026-01-01' }],
    preorders: [{ id: 'p1', productId: 'hilang', status: 'open' }],
  }));
  assert.match(dua.els.dataHealthSummary.innerHTML, /Rincian:/);
  const satu = run(makeD({ preorders: [{ id: 'p1', productId: 'hilang', status: 'open' }] }));
  assert.doesNotMatch(satu.els.dataHealthSummary.innerHTML, /Rincian:/);
});
