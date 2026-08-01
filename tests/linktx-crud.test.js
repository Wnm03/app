'use strict';
// tests/linktx-crud.test.js — cakupan modules/finance/linktx.js (LinkTx),
// sebelumnya 0 test file yang menyentuhnya langsung.
// Fokus: pola "hubungkan transaksi lama" (bukan tambah/edit form biasa,
// tapi tetap CRUD di baliknya — create link entry & undo = hapus link):
//   - _cfg() per konteks (renov/wishlist/bill/default)
//   - open()/toggleSelect()/_getFiltered() (filter & seleksi)
//   - _createFromTx() (tombol "Hubungkan" -> insert item baru per konteks)
//   - _undoEntry()/undo() (tombol "Urungkan" -> hapus item yg baru dibuat)
//   - confirmBulk() (validasi kosong, askConfirm batal, sukses simpan+refresh)

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
function makeDoc(predefined = {}) {
  return {
    getElementById: (id) => (id in predefined ? predefined[id] : autoEl()),
    querySelectorAll: () => [],
  };
}
function makeD(overrides = {}) {
  return Object.assign(
    {
      transactions: [],
      accounts: [{ id: 'a1', name: 'Cash', emoji: '💵' }],
      renovProjects: [],
      wishlist: [],
      bills: [],
      billsArchive: [],
    },
    overrides,
  );
}

function makeCtx({ document, D, calls, askConfirmResult = true }) {
  return loadSource(
    ['modules/finance/linktx.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'link' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      fmtFull: (n) => 'RpFull' + n,
      getCatsByType: () => [],
      openModal: (id) => calls.push('open:' + id),
      closeModal: (id) => calls.push('close:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      save: () => calls.push('save'),
      askConfirm: async (msg) => { calls.push('askConfirm:' + msg); return askConfirmResult; },
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      refreshBillEverywhere: () => calls.push('refreshBillEverywhere'),
      // WorthIt dipanggil langsung (bukan typeof-guarded) di _refreshCtxUI()
      // untuk ctx==='wishlist', jadi harus di-stub biar tidak ReferenceError.
      WorthIt: { renderList: () => calls.push('WorthIt.renderList'), renderBoughtList: () => calls.push('WorthIt.renderBoughtList') },
    },
    ['LinkTx'],
  );
}

// ---------------------------------------------------------------------------
// _cfg()
// ---------------------------------------------------------------------------

test('_cfg() ctx renov -> label & desc sesuai nama proyek renovasi', () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur' }] });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'renov'; LinkTx.targetId = 'p1';
  const cfg = LinkTx._cfg();
  assert.match(cfg.desc, /Renov Dapur/);
  assert.match(cfg.confirmLabel, /Item Renovasi/);
});

test('_cfg() ctx wishlist -> label "Sudah Beli"', () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  LinkTx.ctx = 'wishlist'; LinkTx.targetId = null;
  const cfg = LinkTx._cfg();
  assert.match(cfg.confirmLabel, /Sudah Beli/);
});

test('_cfg() ctx bill -> desc sesuai nama tagihan (cari di bills lalu billsArchive)', () => {
  const calls = [];
  const D = makeD({ bills: [], billsArchive: [{ id: 'b1', name: 'Listrik' }] });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'bill'; LinkTx.targetId = 'b1';
  const cfg = LinkTx._cfg();
  assert.match(cfg.desc, /Listrik/);
  assert.match(cfg.confirmLabel, /Riwayat Pembayaran/);
});

test('_cfg() ctx tidak dikenal -> fallback default (desc kosong)', () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  LinkTx.ctx = 'lainnya';
  const cfg = LinkTx._cfg();
  assert.equal(cfg.desc, '');
  assert.match(cfg.confirmLabel, /Hubungkan Terpilih/);
});

// ---------------------------------------------------------------------------
// open() / toggleSelect() / _getFiltered()
// ---------------------------------------------------------------------------

test('open() -> reset selected, isi ulang filter box, panggil openModal(linkTxModal)', () => {
  const calls = [];
  const els = {
    linkTxSuccessBox: { style: {} },
    linkTxFilterBox: { style: {} },
    linkTxSearch: { value: 'sisa' },
    linkTxDari: { value: 'sisa' },
    linkTxSampai: { value: 'sisa' },
    linkTxModalDesc: { innerHTML: '' },
    linkTxKat: { innerHTML: '', value: '' },
    linkTxAkun: { innerHTML: '', value: '' },
    linkTxSub: { innerHTML: '', value: '' },
    linkTxList: { innerHTML: '' },
    linkTxPreviewText: { textContent: '' },
    linkTxConfirmBtn: { disabled: false, style: {}, textContent: '' },
  };
  const { LinkTx } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  LinkTx.selected = new Set(['old']);
  LinkTx.open('wishlist', 'w1');
  assert.equal(LinkTx.ctx, 'wishlist');
  assert.equal(LinkTx.targetId, 'w1');
  assert.equal(LinkTx.selected.size, 0);
  assert.equal(els.linkTxSuccessBox.style.display, 'none');
  assert.equal(els.linkTxFilterBox.style.display, 'block');
  assert.equal(els.linkTxSearch.value, '');
  assert.ok(calls.includes('open:linkTxModal'));
});

test('toggleSelect() -> tambah kalau belum ada, hapus kalau sudah ada (id di-string-kan)', () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  LinkTx.toggleSelect('t1');
  assert.ok(LinkTx.selected.has('t1'));
  LinkTx.toggleSelect('t1');
  assert.ok(!LinkTx.selected.has('t1'));
});

test('_getFiltered() -> cuma expense yang BELUM ditautkan yang muncul', () => {
  const calls = [];
  const D = makeD({
    transactions: [
      { id: 't1', type: 'expense', amount: 10000, note: 'Beli galon', date: '2026-01-01' },
      { id: 't2', type: 'income', amount: 500000, note: 'Gaji', date: '2026-01-02' },
      { id: 't3', type: 'expense', amount: 20000, note: 'Sudah link', date: '2026-01-03', renovItemLinkId: 'x' },
    ],
  });
  const els = { linkTxSearch: { value: '' }, linkTxKat: { value: 'semua' }, linkTxSub: { value: 'semua' }, linkTxDari: { value: '' }, linkTxSampai: { value: '' }, linkTxAkun: { value: 'semua' } };
  const { LinkTx } = makeCtx({ document: makeDoc(els), D, calls });
  const list = LinkTx._getFiltered();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 't1');
});

test('_getFiltered() -> filter rentang tanggal (dari/sampai) & pencarian teks (note)', () => {
  const calls = [];
  const D = makeD({
    transactions: [
      { id: 't1', type: 'expense', amount: 10000, note: 'Beli galon', date: '2026-01-01' },
      { id: 't2', type: 'expense', amount: 20000, note: 'Beli pulsa', date: '2026-02-01' },
    ],
  });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  const byDate = LinkTx._getFiltered().filter(() => true); // sanity: semua masuk tanpa filter dulu
  assert.equal(byDate.length, 2);
  const bySearch = LinkTx._getFiltered('galon');
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 't1');
});

test('selectAllMatching() -> semua hasil filter masuk ke selected, toast jumlah', () => {
  const calls = [];
  const D = makeD({
    transactions: [
      { id: 't1', type: 'expense', amount: 10000, note: 'A', date: '2026-01-01' },
      { id: 't2', type: 'expense', amount: 20000, note: 'B', date: '2026-01-02' },
    ],
  });
  const els = { linkTxList: { innerHTML: '' }, linkTxPreviewText: { textContent: '' }, linkTxConfirmBtn: { disabled: false, style: {}, textContent: '' } };
  const { LinkTx } = makeCtx({ document: makeDoc(els), D, calls });
  LinkTx.selectAllMatching();
  assert.equal(LinkTx.selected.size, 2);
  assert.match(calls.join(','), /toast:.*2 transaksi dipilih/);
});

test('clearSelection() -> selected dikosongkan', () => {
  const calls = [];
  const els = { linkTxList: { innerHTML: '' }, linkTxPreviewText: { textContent: '' }, linkTxConfirmBtn: { disabled: false, style: {}, textContent: '' } };
  const { LinkTx } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  LinkTx.selected = new Set(['t1', 't2']);
  LinkTx.clearSelection();
  assert.equal(LinkTx.selected.size, 0);
});

test('updatePreview() -> teks preview & tombol disabled sesuai jumlah/total terpilih', () => {
  const calls = [];
  const D = makeD({ transactions: [{ id: 't1', type: 'expense', amount: 15000, note: 'A', date: '2026-01-01' }] });
  const els = { linkTxPreviewText: { textContent: '' }, linkTxConfirmBtn: { disabled: false, style: {}, textContent: '' } };
  const { LinkTx } = makeCtx({ document: makeDoc(els), D, calls });
  LinkTx.updatePreview();
  assert.equal(els.linkTxPreviewText.textContent, 'Belum ada transaksi dipilih');
  assert.equal(els.linkTxConfirmBtn.disabled, true);
  LinkTx.selected.add('t1');
  LinkTx.updatePreview();
  assert.match(els.linkTxPreviewText.textContent, /1 transaksi dipilih/);
  assert.equal(els.linkTxConfirmBtn.disabled, false);
});

// ---------------------------------------------------------------------------
// _createFromTx() / _undoEntry()
// ---------------------------------------------------------------------------

test('_createFromTx() ctx renov -> item renovasi baru masuk p.items, tx ditandai link', () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'renov'; LinkTx.targetId = 'p1';
  const t = { id: 't1', note: 'Cat tembok', amount: 100000, date: '2026-01-01', category: 'Rumah', accountId: 'a1' };
  const entry = LinkTx._createFromTx(t);
  assert.equal(D.renovProjects[0].items.length, 1);
  assert.equal(D.renovProjects[0].items[0].paid, true);
  assert.equal(t.renovProjectLinkId, 'p1');
  assert.ok(t.renovItemLinkId);
  assert.equal(entry.kind, 'renov');
});

test('_createFromTx() ctx wishlist -> barang baru masuk D.wishlist berstatus sudah beli', () => {
  const calls = [];
  const D = makeD();
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'wishlist'; LinkTx.targetId = null;
  const t = { id: 't1', note: 'Kipas Angin', amount: 250000, date: '2026-01-01' };
  const entry = LinkTx._createFromTx(t);
  assert.equal(D.wishlist.length, 1);
  assert.equal(D.wishlist[0].bought, true);
  assert.equal(t.wishlistLinkId, D.wishlist[0].id);
  assert.equal(entry.kind, 'wishlist');
});

test('_createFromTx() ctx bill -> tx ditandai billLinkId, TIDAK bikin transaksi baru', () => {
  const calls = [];
  const D = makeD({ bills: [{ id: 'b1', name: 'Listrik' }] });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'bill'; LinkTx.targetId = 'b1';
  const t = { id: 't1', note: 'Bayar listrik', amount: 150000, date: '2026-01-01' };
  const entry = LinkTx._createFromTx(t);
  assert.equal(t.billLinkId, 'b1');
  assert.equal(entry.kind, 'bill');
});

test('_createFromTx() -> null kalau target (proyek/tagihan) tidak ditemukan', () => {
  const calls = [];
  const D = makeD();
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx.ctx = 'renov'; LinkTx.targetId = 'tidak-ada';
  const t = { id: 't1', note: 'X', amount: 1000, date: '2026-01-01' };
  assert.equal(LinkTx._createFromTx(t), null);
});

test('_undoEntry() kind renov -> item dihapus dari project, link di tx dilepas', () => {
  const calls = [];
  const D = makeD({
    renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1' }] }],
    transactions: [{ id: 't1', renovProjectLinkId: 'p1', renovItemLinkId: 'i1' }],
  });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx._undoEntry({ kind: 'renov', projectId: 'p1', itemId: 'i1', txId: 't1' });
  assert.equal(D.renovProjects[0].items.length, 0);
  assert.equal(D.transactions[0].renovItemLinkId, undefined);
});

test('_undoEntry() kind wishlist -> barang dihapus dari D.wishlist, link tx dilepas', () => {
  const calls = [];
  const D = makeD({
    wishlist: [{ id: 'w1', name: 'Kipas' }],
    transactions: [{ id: 't1', wishlistLinkId: 'w1' }],
  });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls });
  LinkTx._undoEntry({ kind: 'wishlist', itemId: 'w1', txId: 't1' });
  assert.equal(D.wishlist.length, 0);
  assert.equal(D.transactions[0].wishlistLinkId, undefined);
});

// ---------------------------------------------------------------------------
// confirmBulk() / undo() / finish()
// ---------------------------------------------------------------------------

test('confirmBulk() -> belum ada dipilih -> toast peringatan, TIDAK askConfirm/save', async () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  await LinkTx.confirmBulk();
  assert.match(calls.join(','), /toast:.*Belum ada transaksi dipilih/);
  assert.ok(!calls.includes('save'));
});

test('confirmBulk() -> askConfirm ditolak (batal) -> TIDAK ada entry dibuat, TIDAK save', async () => {
  const calls = [];
  const D = makeD({
    wishlist: [],
    transactions: [{ id: 't1', type: 'expense', note: 'A', amount: 1000, date: '2026-01-01' }],
  });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls, askConfirmResult: false });
  LinkTx.ctx = 'wishlist'; LinkTx.targetId = null;
  LinkTx.selected.add('t1');
  await LinkTx.confirmBulk();
  assert.equal(D.wishlist.length, 0);
  assert.ok(!calls.includes('save'));
});

test('confirmBulk() -> sukses: entries dibuat, save(), lastBatch tersimpan, UI sukses tampil', async () => {
  const calls = [];
  const els = {
    linkTxFilterBox: { style: {} },
    linkTxSuccessBox: { style: {} },
    linkTxSuccessTitle: { textContent: '' },
    linkTxSuccessSub: { textContent: '' },
  };
  const D = makeD({
    wishlist: [],
    transactions: [{ id: 't1', type: 'expense', note: 'Kipas', amount: 250000, date: '2026-01-01' }],
  });
  const { LinkTx } = makeCtx({ document: makeDoc(els), D, calls });
  LinkTx.ctx = 'wishlist'; LinkTx.targetId = null;
  LinkTx.selected.add('t1');
  await LinkTx.confirmBulk();
  assert.equal(D.wishlist.length, 1);
  assert.ok(calls.includes('save'));
  assert.equal(LinkTx.lastBatch.count, 1);
  assert.equal(LinkTx.selected.size, 0);
  assert.equal(els.linkTxFilterBox.style.display, 'none');
  assert.equal(els.linkTxSuccessBox.style.display, 'block');
  assert.match(els.linkTxSuccessTitle.textContent, /1 transaksi berhasil dihubungkan/);
  assert.match(calls.join(','), /toast:.*dihubungkan/);
});

test('undo() -> tanpa lastBatch -> toast peringatan, tidak error', async () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  await LinkTx.undo();
  assert.match(calls.join(','), /toast:.*Tidak ada link yang bisa diurungkan/);
});

test('undo() -> askConfirm ditolak -> lastBatch TIDAK dihapus, entry TIDAK di-undo', async () => {
  const calls = [];
  const D = makeD({ wishlist: [{ id: 'w1' }], transactions: [{ id: 't1', wishlistLinkId: 'w1' }] });
  const { LinkTx } = makeCtx({ document: makeDoc(), D, calls, askConfirmResult: false });
  LinkTx.lastBatch = { ctx: 'wishlist', targetId: null, entries: [{ kind: 'wishlist', itemId: 'w1', txId: 't1', amount: 1000 }], count: 1, total: 1000 };
  await LinkTx.undo();
  assert.equal(D.wishlist.length, 1);
  assert.ok(LinkTx.lastBatch);
});

test('undo() -> sukses: entry di-undo, save(), lastBatch direset, UI kembali ke filter box', async () => {
  const calls = [];
  const els = { linkTxSuccessBox: { style: {} }, linkTxFilterBox: { style: {} }, linkTxList: { innerHTML: '' }, linkTxPreviewText: { textContent: '' }, linkTxConfirmBtn: { disabled: false, style: {}, textContent: '' } };
  const D = makeD({ wishlist: [{ id: 'w1' }], transactions: [{ id: 't1', wishlistLinkId: 'w1' }] });
  const { LinkTx } = makeCtx({ document: makeDoc(els), D, calls });
  LinkTx.lastBatch = { ctx: 'wishlist', targetId: null, entries: [{ kind: 'wishlist', itemId: 'w1', txId: 't1', amount: 1000 }], count: 1, total: 1000 };
  await LinkTx.undo();
  assert.equal(D.wishlist.length, 0);
  assert.equal(D.transactions[0].wishlistLinkId, undefined);
  assert.ok(calls.includes('save'));
  assert.equal(LinkTx.lastBatch, null);
  assert.equal(els.linkTxSuccessBox.style.display, 'none');
  assert.equal(els.linkTxFilterBox.style.display, 'block');
  assert.match(calls.join(','), /toast:.*Link dibatalkan/);
});

test('finish() -> closeModal(linkTxModal) dipanggil, lastBatch direset', () => {
  const calls = [];
  const { LinkTx } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  LinkTx.lastBatch = { count: 1 };
  LinkTx.finish();
  assert.ok(calls.includes('close:linkTxModal'));
  assert.equal(LinkTx.lastBatch, null);
});
