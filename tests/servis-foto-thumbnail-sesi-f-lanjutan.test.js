'use strict';
/**
 * tests/servis-foto-thumbnail-sesi-f-lanjutan.test.js
 *
 * Sesi F-lanjutan (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi F,
 * backlog eksplisit dari Sesi F2 -- lihat tests/servis-foto-badge-
 * sesi-f2.test.js): thumbnail gambar SUNGGUHAN (<img> 38x38, foto
 * PERTAMA saja) di tx-item Riwayat Servis, BUKAN cuma badge teks "📷 N"
 * (yang sudah ada sejak F2, TETAP dipertahankan berdampingan).
 *
 * Lightbox/viewer ukuran penuh & kompresi dataURL TETAP backlog terpisah
 * (di luar cakupan sesi ini).
 *
 * 0 regresi: entry tanpa field `foto`/`foto:[]` TIDAK menampilkan <img>
 * apa pun -- markup tx-item persis sama seperti sebelum sesi ini.
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

test('Sesi F-lanjutan: entry dengan foto (>=1) menampilkan <img> thumbnail dari foto PERTAMA', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'] },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(html.includes('<img src="data:image/png;base64,AAA"'), 'harus render <img> pakai foto PERTAMA (indeks 0)');
  assert.ok(!html.includes('data:image/png;base64,BBB'), 'foto kedua TIDAK ikut dirender (cuma preview 1 foto)');
  // Badge teks (Sesi F2) tetap ada berdampingan, tidak digantikan.
  assert.ok(html.includes('📷 2'), 'badge teks jumlah foto tetap ada berdampingan dgn thumbnail');
});

test('Sesi F-lanjutan: entry dengan foto: [] (array kosong) TIDAK menampilkan <img> (0 regresi)', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: [] },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(!html.includes('<img'), 'foto: [] tidak boleh render <img> apa pun');
});

test('Sesi F-lanjutan: entry lama tanpa field `foto` sama sekali TIDAK menampilkan <img> (backward-compatible)', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '' },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(!html.includes('<img'), 'entry tanpa field foto tidak boleh render <img>');
});

test('Sesi F-lanjutan: thumbnail per-entry, bukan tercampur antar entry berbeda', () => {
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: ['data:image/png;base64,X'] },
    { id: 's2', vehicleId: 'v1', date: '2026-09-10', item: 'Cek Rem', km: 14000, cost: 0, note: '' },
  ]);
  const html = renderAndGetHtml(D);
  const s1Block = html.split('Cek Rem')[0];
  const s2Block = html.split('Cek Rem')[1];
  assert.ok(s1Block.includes('<img src="data:image/png;base64,X"'), 'entry s1 (Ganti Oli, ada foto) harus render thumbnail');
  assert.ok(!s2Block.includes('<img'), 'entry s2 (Cek Rem, tanpa foto) tidak boleh render thumbnail');
});

test('Sesi F-lanjutan: escapeHtml TIDAK diterapkan ke src dataURL (dataURL base64 aman tanpa escaping, konsisten pola _renderPhotoThumbs modal)', () => {
  // dataURL base64 tidak pernah mengandung karakter HTML-sensitive
  // ("<"/">"/"&"/'"'), jadi tidak perlu escapeHtml -- sama persis pola
  // Servis._renderPhotoThumbs() (form modal) yang juga langsung interpolasi
  // src tanpa escaping. Test ini murni memastikan src utuh tidak terpotong/
  // dimodifikasi.
  const longDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(50);
  const D = makeD([
    { id: 's1', vehicleId: 'v1', date: '2026-09-11', item: 'Ganti Oli', km: 15000, cost: 0, note: '', foto: [longDataUrl] },
  ]);
  const html = renderAndGetHtml(D);
  assert.ok(html.includes(`<img src="${longDataUrl}"`), 'src dataURL harus utuh tanpa modifikasi');
});
