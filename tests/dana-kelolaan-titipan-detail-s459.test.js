'use strict';
// tests/dana-kelolaan-titipan-detail-s459.test.js — cakupan Sesi 459
// (rekomendasi #2 dari audit "dana titipan" Sesi 458): daftar RINCI
// per-entri titipanAset/titipanInvestasi (bukan cuma total Rp gabungan),
// murni presenter-support baca-saja, 0 mutasi, 0 model data baru.
//
// Target:
//   - DanaKelolaan.listTitipan() (modules/finance/dana-kelolaan.js) —
//     pecah tiap baris pemilik non-SELF dlm aset SELF (via
//     MultiOwnerEngine.getOwners()) + tiap holding investasi
//     fundSource='titipan' (via Investment.holdingCost()), jadi array
//     {owner, source, name, nominal, refId}.
//   - DanaKelolaanPresenter.renderTitipanDetail() (dana-kelolaan-presenter.js)
//     — render array itu ke container opsional #danaKelolaanTitipanDetailList,
//     baris sumber 'aset' clickable (openAssetModal), baris 'investasi' TIDAK
//     clickable (belum ada action buka-modal holding di repo ini).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    accounts: [],
    assets: [
      { id: 's1', name: 'Rumah Kontrakan', nilai: 4000000, owners: [
        { ownerId: 'SELF', porsi: 60, ownerName: 'Milik Sendiri', isSelf: true },
        { ownerId: 'budi', porsi: 25, ownerName: 'Budi' },
        { ownerId: 'ayah', porsi: 15, ownerName: 'Ayah' },
      ] },
      { id: 's2', name: 'Aset Titipan Legacy', nilai: 5000000, titipanAmount: 1700000 }, // SELF (sisa) + 1 owner titipan legacy
      { id: 's3', name: 'Aset Milik Investor', nilai: 2000000, ownership: 'INVESTOR' }, // whole-entity, TIDAK masuk listTitipan()
    ],
    transactions: [],
    investments: [
      { id: 'i1', unit: 20, avgPrice: 50000, currentPrice: 60000, fundSource: 'titipan', titipanOwner: 'Budi' }, // cost 1000000
      { id: 'i2', unit: 5, avgPrice: 2000, currentPrice: 2000, fundSource: 'sendiri' }, // tidak masuk
      { id: 'i3', unit: 10, avgPrice: 30000, currentPrice: 30000, ownership: 'THIRD_PARTY', fundSource: 'titipan' }, // whole non-SELF, TIDAK masuk listTitipan()
    ],
    investmentTx: [],
    investmentWatchlist: [],
    cobek: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js', 'modules/asset/investasi.js', 'modules/shop/cobek-order.js', 'modules/finance/dana-kelolaan.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      uid: () => 'x',
    },
    ['OwnershipEngine', 'MultiOwnerEngine', 'DanaKelolaan', 'Investment', 'recalcAccBalance', 'totalSaldoAkun', 'Aset'],
  );
}

test('DanaKelolaan.listTitipan() — pecah tiap baris owner non-SELF dlm aset SELF (majemuk & legacy) + holding titipan, urut nominal terbesar', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const rows = ctx.DanaKelolaan.listTitipan();
  // 3 entri: Budi (aset majemuk, 25% * 4jt = 1jt), Ayah (aset majemuk, 15% * 4jt = 600rb),
  // pemilik legacy (aset s2, 1.7jt), Budi (investasi, cost 1jt) = 4 entri total.
  assert.equal(rows.length, 4);
  assert.equal(rows[0].nominal, 1700000, 'terbesar duluan (aset titipan legacy)');
  const asetEntries = rows.filter((r) => r.source === 'aset');
  const investasiEntries = rows.filter((r) => r.source === 'investasi');
  assert.equal(asetEntries.length, 3);
  assert.equal(investasiEntries.length, 1);
  assert.equal(investasiEntries[0].owner, 'Budi');
  assert.equal(investasiEntries[0].nominal, 1000000);
  assert.equal(investasiEntries[0].name, 'Holding', 'holding tanpa field name -> fallback label default');
  const budiAset = asetEntries.find((r) => r.owner === 'Budi');
  assert.equal(budiAset.nominal, 1000000, '25% dari 4jt');
  assert.equal(budiAset.name, 'Rumah Kontrakan');
  assert.equal(budiAset.refId, 's1');
  const ayahAset = asetEntries.find((r) => r.owner === 'Ayah');
  assert.equal(ayahAset.nominal, 600000, '15% dari 4jt');
});

test('DanaKelolaan.listTitipan() — aset/investasi whole-entity non-SELF TIDAK ikut (sudah terlihat di modul asalnya sendiri)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  const rows = ctx.DanaKelolaan.listTitipan();
  assert.ok(!rows.some((r) => r.refId === 's3'), 'aset ownership INVESTOR whole-entity tidak masuk daftar rinci titipan');
  assert.ok(!rows.some((r) => r.refId === 'i3'), 'holding ownership THIRD_PARTY whole-entity tidak masuk daftar rinci titipan');
});

test('DanaKelolaan.listTitipan() — holding fundSource="sendiri" tidak ikut, dan array kosong kalau tidak ada titipan sama sekali', () => {
  const D = { accounts: [], assets: [], investments: [], investmentTx: [], investmentWatchlist: [], cobek: [] };
  const ctx = makeCtx(D);
  assert.equal(ctx.DanaKelolaan.listTitipan().length, 0);
});

test('DanaKelolaan.listTitipan() — D.assets/D.investments ASLI tidak berubah setelah dipanggil', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.DanaKelolaan.listTitipan();
  assert.equal(D.assets.length, 3);
  assert.equal(D.investments.length, 3);
  assert.equal(D.assets[0].owners.length, 3);
});

// --- DanaKelolaanPresenter.renderTitipanDetail() --------------------------

function renderToHtml(extraGlobals) {
  let html = '';
  const el = {
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
  };
  const documentStub = {
    getElementById(id) {
      return id === 'danaKelolaanTitipanDetailList' ? el : null;
    },
  };
  loadSource(
    ['modules/finance/dana-kelolaan-presenter.js'],
    { document: documentStub, escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp ' + Math.round(n || 0), ...extraGlobals },
    ['DanaKelolaanPresenter'],
  ).DanaKelolaanPresenter.renderTitipanDetail();
  return html;
}

test('DanaKelolaanPresenter.renderTitipanDetail() — baris "aset" clickable (openAssetModal), baris "investasi" TIDAK clickable', () => {
  const DanaKelolaan = {
    listTitipan: () => [
      { owner: 'Budi', source: 'aset', name: 'Rumah Kontrakan', nominal: 1000000, refId: 's1' },
      { owner: 'Ayah', source: 'investasi', name: 'Reksadana X', nominal: 500000, refId: 'i1' },
    ],
  };
  const html = renderToHtml({ DanaKelolaan });
  assert.ok(html.includes('Budi'));
  assert.ok(html.includes('Ayah'));
  assert.ok(html.includes('Rumah Kontrakan'));
  assert.ok(html.includes('Reksadana X'));
  const pointerMatches = html.match(/u-pointer/g) || [];
  assert.equal(pointerMatches.length, 1, 'HANYA baris aset yang clickable');
  assert.ok(html.includes('data-action="openAssetModal"'));
  assert.ok(html.includes('"s1"') || html.includes('[&quot;s1&quot;]') || html.includes('["s1"]'));
  assert.ok(!html.includes('data-action="Investment'), 'baris investasi tidak diberi action yang belum tentu ada');
});

test('DanaKelolaanPresenter.renderTitipanDetail() — array kosong -> pesan "belum ada", bukan list kosong senyap', () => {
  const DanaKelolaan = { listTitipan: () => [] };
  const html = renderToHtml({ DanaKelolaan });
  assert.ok(/belum ada/i.test(html));
});

test('DanaKelolaanPresenter.renderTitipanDetail() — container tidak ada di halaman (getElementById null) -> aman diam2, tidak error', () => {
  const documentStub = { getElementById() { return null; } };
  assert.doesNotThrow(() => {
    loadSource(
      ['modules/finance/dana-kelolaan-presenter.js'],
      { document: documentStub, escapeHtml: (s) => String(s), fmtFull: (n) => String(n), DanaKelolaan: { listTitipan: () => [{ owner: 'x', source: 'aset', name: 'y', nominal: 1, refId: '1' }] } },
      ['DanaKelolaanPresenter'],
    ).DanaKelolaanPresenter.renderTitipanDetail();
  });
});

test('DanaKelolaanPresenter.renderTitipanDetail() — DanaKelolaan belum dimuat -> aman diam2, tidak error', () => {
  let html = 'unchanged';
  const el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
  const documentStub = { getElementById: (id) => (id === 'danaKelolaanTitipanDetailList' ? el : null) };
  assert.doesNotThrow(() => {
    loadSource(
      ['modules/finance/dana-kelolaan-presenter.js'],
      { document: documentStub, escapeHtml: (s) => String(s), fmtFull: (n) => String(n) },
      ['DanaKelolaanPresenter'],
    ).DanaKelolaanPresenter.renderTitipanDetail();
  });
  assert.equal(html, 'unchanged', 'container tidak disentuh kalau DanaKelolaan tidak tersedia');
});
