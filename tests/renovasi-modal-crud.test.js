'use strict';
// tests/renovasi-modal-crud.test.js — cakupan modules/home/renovasi.js (Renov):
// family `modules/home` sebelumnya 0 test file (lihat docs/COVERAGE-PER-MODULE.md).
//
// Fokus: alur tombol Tambah/Edit/Hapus proyek & item biaya, plus buka modal
// detail (Renov.openDetail — daftar item per proyek, setara "riwayat" biaya
// proyek). Modal open/close generik (openModal()/closeModal()) di-mock —
// yang dites di sini urutan panggilan & perubahan data (D.renovProjects),
// BUKAN implementasi openModal() itu sendiri (sudah ada test lain utk itu).

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
  return { getElementById: (id) => predefined[id] || autoEl() };
}

function makeD(overrides = {}) {
  return Object.assign({
    renovProjects: [],
    accounts: [{ id: 'a1', name: 'Cash', emoji: '💵' }],
    transactions: [],
  }, overrides);
}

function makeCtx({ document, D, calls, confirmResult = true }) {
  return loadSource(
    ['modules/home/renovasi.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'r' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      fmtFull: (n) => 'Rp' + n,
      todayStr: () => '2026-08-01',
      getCatsByType: () => [{ name: 'Material', emoji: '🧱' }],
      evalAmtExpr: () => {},
      save: () => calls.push('save'),
      openModal: (id) => calls.push('open:' + id),
      closeModal: (id) => calls.push('close:' + id),
      toast: (msg) => calls.push('toast:' + msg),
      askConfirm: async () => { calls.push('askConfirm'); return confirmResult; },
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
    },
    ['Renov'],
  );
}

// ===== Tombol Tambah/Edit Proyek (openProjectModal + saveProject) =====

test('openProjectModal() tanpa id (tombol Tambah) -> form kosong, judul "Proyek Renovasi Baru", buka renovProjectModal', () => {
  const calls = [];
  const els = { renovProjectModalTitle: { textContent: '' }, renovProjName: { value: 'sisa lama' }, renovProjNote: { value: 'sisa lama' } };
  const { Renov } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  Renov.openProjectModal();
  assert.equal(els.renovProjectModalTitle.textContent, 'Proyek Renovasi Baru');
  assert.equal(els.renovProjName.value, '');
  assert.equal(els.renovProjNote.value, '');
  assert.equal(Renov.projEditId, null);
  assert.deepEqual(calls, ['open:renovProjectModal']);
});

test('openProjectModal(id) (tombol Edit) -> form terisi data proyek, judul "Edit Proyek"', () => {
  const calls = [];
  const els = { renovProjectModalTitle: { textContent: '' }, renovProjName: { value: '' }, renovProjNote: { value: '' } };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', catatan: 'cat lama', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.openProjectModal('p1');
  assert.equal(els.renovProjectModalTitle.textContent, 'Edit Proyek');
  assert.equal(els.renovProjName.value, 'Renov Dapur');
  assert.equal(els.renovProjNote.value, 'cat lama');
  assert.equal(Renov.projEditId, 'p1');
});

test('saveProject() — nama kosong -> toast peringatan, TIDAK menyimpan', () => {
  const calls = [];
  const els = { renovProjName: { value: '  ' }, renovProjNote: { value: '' } };
  const D = makeD();
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.saveProject();
  assert.equal(D.renovProjects.length, 0);
  assert.match(calls.join(','), /toast:.*Masukkan nama/);
  assert.ok(!calls.includes('save'));
});

test('saveProject() tanpa projEditId (Tambah) -> proyek baru masuk D.renovProjects, modal ditutup', () => {
  const calls = [];
  const els = { renovProjName: { value: 'Renov Kamar' }, renovProjNote: { value: 'cat baru' } };
  const D = makeD();
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.saveProject();
  assert.equal(D.renovProjects.length, 1);
  assert.equal(D.renovProjects[0].name, 'Renov Kamar');
  assert.equal(D.renovProjects[0].catatan, 'cat baru');
  assert.equal(D.renovProjects[0].items.length, 0);
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('close:renovProjectModal'));
});

test('saveProject() dengan projEditId (Edit) -> proyek existing di-UPDATE, bukan bikin baru', () => {
  const calls = [];
  const els = { renovProjName: { value: 'Nama Baru' }, renovProjNote: { value: 'Catatan Baru' } };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Nama Lama', catatan: 'Catatan Lama', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.projEditId = 'p1';
  Renov.saveProject();
  assert.equal(D.renovProjects.length, 1);
  assert.equal(D.renovProjects[0].name, 'Nama Baru');
  assert.equal(D.renovProjects[0].catatan, 'Catatan Baru');
  assert.equal(Renov.projEditId, null);
});

// ===== Tombol Hapus Proyek (deleteProject) =====

test('deleteProject() — konfirmasi dibatalkan -> proyek TIDAK dihapus', async () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls, confirmResult: false });
  await Renov.deleteProject('p1');
  assert.equal(D.renovProjects.length, 1);
  assert.ok(!calls.includes('save'));
});

test('deleteProject() — dikonfirmasi -> proyek terhapus dari D.renovProjects, modal detail ditutup', async () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls, confirmResult: true });
  Renov.curId = 'p1';
  await Renov.deleteProject('p1');
  assert.equal(D.renovProjects.length, 0);
  assert.equal(Renov.curId, null);
  assert.ok(calls.includes('close:renovDetailModal'));
  assert.match(calls.join(','), /toast:.*dihapus/);
});

test('deleteProject() — transaksi (txId) milik item yang sudah lunas TIDAK ikut terhapus, cuma link-nya dilepas', async () => {
  const calls = [];
  const D = makeD({
    renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1', name: 'Keramik', paid: true, txId: 't1' }] }],
    transactions: [{ id: 't1', amount: 100000, renovProjectLinkId: 'p1', renovItemLinkId: 'i1' }],
  });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls, confirmResult: true });
  await Renov.deleteProject('p1');
  assert.equal(D.transactions.length, 1, 'transaksi di Keuangan tetap ada');
  assert.equal(D.transactions[0].renovProjectLinkId, undefined);
});

// ===== Buka Detail Proyek (openDetail — daftar/"riwayat" item biaya) =====

test('openDetail(id) -> curId ke-set, render detail, buka renovDetailModal', () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls });
  Renov.openDetail('p1');
  assert.equal(Renov.curId, 'p1');
  assert.ok(calls.includes('open:renovDetailModal'));
});

// ===== Tombol Tambah/Edit Item Biaya (openItemModal + saveItem) =====

test('openItemModal(projectId) tanpa itemId (tombol Tambah Item) -> form kosong, judul "Tambah Item Biaya"', () => {
  const calls = [];
  const els = {
    renovItemModalTitle: { textContent: '' },
    renovItemName: { value: 'sisa' },
    renovItemHarga: { value: 'sisa' },
    renovItemPaidNotice: { style: {} },
  };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.openItemModal('p1');
  assert.equal(els.renovItemModalTitle.textContent, 'Tambah Item Biaya');
  assert.equal(els.renovItemName.value, '');
  assert.equal(Renov.editItemId, null);
  assert.ok(calls.includes('close:renovDetailModal'));
  assert.ok(calls.includes('open:renovItemModal'));
});

test('openItemModal(projectId, itemId) (tombol Edit Item) -> form terisi data item, judul "Edit Item Biaya"', () => {
  const calls = [];
  const els = {
    renovItemModalTitle: { textContent: '' },
    renovItemName: { value: '' },
    renovItemHarga: { value: '' },
    renovItemPaidNotice: { style: {} },
  };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1', name: 'Keramik', harga: 500000, paid: false }] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.openItemModal('p1', 'i1');
  assert.equal(els.renovItemModalTitle.textContent, 'Edit Item Biaya');
  assert.equal(els.renovItemName.value, 'Keramik');
  assert.equal(els.renovItemHarga.value, 500000);
  assert.equal(Renov.editItemId, 'i1');
});

test('saveItem() — nama/harga kosong -> toast peringatan, item TIDAK tersimpan', () => {
  const calls = [];
  const els = {
    renovItemName: { value: '' }, renovItemUkuran: { value: '' },
    renovItemHarga: { value: '' }, renovItemHargaTotalToggle: { checked: false }, renovItemHargaTotal: { value: '' },
    renovItemCat: { value: '' }, renovItemAcc: { value: '' }, renovItemTglBayar: { value: '' }, renovItemNote: { value: '' },
  };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.curId = 'p1';
  Renov.saveItem();
  assert.equal(D.renovProjects[0].items.length, 0);
  assert.match(calls.join(','), /toast:.*Lengkapi nama/);
});

test('saveItem() tanpa editItemId (Tambah) -> item baru masuk p.items', () => {
  const calls = [];
  const els = {
    renovItemName: { value: 'Cat Tembok' }, renovItemUkuran: { value: '' },
    renovItemHarga: { value: '300000' }, renovItemHargaTotalToggle: { checked: false }, renovItemHargaTotal: { value: '' },
    renovItemCat: { value: 'Material' }, renovItemAcc: { value: 'a1' }, renovItemTglBayar: { value: '2026-08-01' }, renovItemNote: { value: '' },
  };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.curId = 'p1';
  Renov.saveItem();
  assert.equal(D.renovProjects[0].items.length, 1);
  assert.equal(D.renovProjects[0].items[0].name, 'Cat Tembok');
  assert.equal(D.renovProjects[0].items[0].harga, 300000);
  assert.equal(D.renovProjects[0].items[0].paid, false);
  assert.ok(calls.includes('close:renovItemModal'));
});

test('saveItem() dengan editItemId (Edit) -> item existing di-UPDATE, bukan nambah baru', () => {
  const calls = [];
  const els = {
    renovItemName: { value: 'Keramik 60x60' }, renovItemUkuran: { value: '' },
    renovItemHarga: { value: '750000' }, renovItemHargaTotalToggle: { checked: false }, renovItemHargaTotal: { value: '' },
    renovItemCat: { value: 'Material' }, renovItemAcc: { value: 'a1' }, renovItemTglBayar: { value: '2026-08-01' }, renovItemNote: { value: '' },
  };
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1', name: 'Keramik', harga: 500000, paid: false }] }] });
  const { Renov } = makeCtx({ document: makeDoc(els), D, calls });
  Renov.curId = 'p1';
  Renov.editItemId = 'i1';
  Renov.saveItem();
  assert.equal(D.renovProjects[0].items.length, 1);
  assert.equal(D.renovProjects[0].items[0].name, 'Keramik 60x60');
  assert.equal(D.renovProjects[0].items[0].harga, 750000);
  assert.equal(Renov.editItemId, null);
});

// ===== Tombol Hapus Item Biaya (deleteItem) =====

test('deleteItem() — konfirmasi dibatalkan -> item TIDAK dihapus', async () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1', name: 'Keramik', harga: 500000, paid: false }] }] });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls, confirmResult: false });
  await Renov.deleteItem('p1', 'i1');
  assert.equal(D.renovProjects[0].items.length, 1);
});

test('deleteItem() — dikonfirmasi -> item terhapus dari p.items', async () => {
  const calls = [];
  const D = makeD({ renovProjects: [{ id: 'p1', name: 'Renov Dapur', items: [{ id: 'i1', name: 'Keramik', harga: 500000, paid: false }] }] });
  const { Renov } = makeCtx({ document: makeDoc(), D, calls, confirmResult: true });
  await Renov.deleteItem('p1', 'i1');
  assert.equal(D.renovProjects[0].items.length, 0);
  assert.match(calls.join(','), /toast:.*dihapus/);
});
