'use strict';
/**
 * tests/servis-foto-badge-sesi-f2.test.js
 *
 * Sesi F2 (lanjutan Sesi F1, ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7
 * Sesi F "Foto di Service History") -- langkah kedua dari backlog F1 yang
 * SENGAJA ditunda: "Thumbnail/badge foto di daftar Riwayat Servis
 * (Servis.renderList())". Sesi ini HANYA badge teks jumlah foto (pola sama
 * persis batchInfo Sesi E3 -- lihat tests/servis-batchid-sesi-e3.test.js),
 * BUKAN thumbnail gambar/lightbox -- itu tetap backlog Sesi F berikutnya
 * (risiko lebih tinggi: perlu ubah struktur tx-item, bukan cuma tx-meta).
 *
 * 0 regresi: entry lama tanpa field `foto` (undefined) atau `foto: []`
 * tidak menampilkan badge sama sekali -- fallback sama seperti
 * partInfo/batchInfo yang sudah ada.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, extra }) {
  return loadSource(['car-notes.js'], {
    D,
    curVehicleId: 'v1',
    uid: (() => { let n = 0; return () => 'id' + (++n); })(),
    escapeHtml: (s) => s,
    save() {},
    closeModal() {},
    renderCnTab() {},
    renderDashboard() {},
    renderKeuangan() {},
    toast() {},
    askConfirm: async () => true,
    showPromptModal: async () => '0',
    getVehicleKm: () => 15000,
    estimateKmPerDay: () => null,
    resolveVehicleTxCategory: () => 'Kendaraan',
    servisLogMatchesCat: () => false,
    catVisibleForVehicle: () => true,
    getEffectiveIntervalKm: (vid, cat) => cat.intervalKm,
    hasIntervalOverride: () => false,
    estimateServiceDateISO: () => null,
    fmtDateID: () => '',
    AIBus: { emit() {} },
    ...extra,
  }, ['Servis']);
}

function makeD(servisLogs) {
  return {
    sparepartCats: [],
    servisLogs,
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    partsStock: [],
  };
}

function renderAndGetHtml(D) {
  const elements = {
    servisList: { innerHTML: '', insertAdjacentElement() {} },
    servisCount: { textContent: '' },
    servisTotalCost: { textContent: '' },
    servisLastKm: { textContent: '' },
    servisListLoadMoreWrap: null,
  };
  const documentStub = {
    getElementById: (id) => elements[id] !== undefined ? elements[id] : null,
    createElement: () => ({ style: {}, querySelector: () => ({}) }),
  };
  const ctx = makeCtx({
    D,
    extra: {
      document: documentStub,
      getCnRange: () => ({ from: new Date('2000-01-01'), to: new Date('2100-01-01') }),
      TX_PAGE_SIZE: 50,
      fmt: (n) => String(n),
    },
  });
  ctx.Servis.listPage = 1;
  ctx.Servis.renderReminder = () => {};
  ctx.Servis.renderList();
  return elements.servisList.innerHTML;
}

test('Sesi F2: entry dengan foto (>=1) menampilkan badge "📷 N" di tx-meta', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: ['a', 'b', 'c'] },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(html.includes('📷 3'), 'badge harus tampilkan jumlah foto (3)');
});

test('Sesi F2: entry dengan foto: [] (array kosong) TIDAK menampilkan badge (0 regresi F1)', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: [] },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(!html.includes('📷'), 'foto: [] tidak boleh menampilkan badge apa pun');
});

test('Sesi F2: entry lama tanpa field `foto` sama sekali TIDAK menampilkan badge (backward-compatible)', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '' },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(!html.includes('📷'), 'entry tanpa field foto tidak boleh menampilkan badge');
});

test('Sesi F2: badge foto & badge batch bisa muncul bersamaan tanpa saling menghapus', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: ['a'], batchId: 'batch-x' },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(html.includes('🔗 batch'), 'badge batch tetap harus ada');
  assert.ok(html.includes('📷 1'), 'badge foto tetap harus ada di entry yang sama');
});

test('Sesi F2: badge foto per-entry, bukan tercampur antar entry berbeda', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: ['a', 'b'] },
    { id: 's2', vehicleId: 'v1', date: '2026-09-10', item: 'Cek Rem', km: 14000, cost: 0, note: '' },
  ]);
  const html = renderAndGetHtml(D);
  const s1Block = html.split('Cek Rem')[0];
  const s2Block = html.split('Cek Rem')[1];
  assert.ok(s1Block.includes('📷 2'), 'entry s1 (Ganti Oli, 2 foto) harus ada badge');
  assert.ok(!s2Block.includes('📷'), 'entry s2 (Cek Rem, tanpa foto) tidak boleh ada badge');
});
