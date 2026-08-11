'use strict';
// tests/s505-asset-owner-quota-live.test.js — Sesi 505 (S505): live "💰 Kuota
// sisa" Dana Titipan di assetOwnersModal, mirror PERSIS mekanisme S494
// (InvestmentUI._ownerQuotaText()/_updateOwnerQuotaDisplay()/onOwnerPorsiInput())
// tapi utk domain Aset, 100% reuse `DanaTitipanPortfolioAPI.allocatedExcluding()`
// S504 (dipanggil dgn bentuk BARU `{assetId: currentAssetId}`, BUKAN string).
//
// DILARANG oleh prompt sesi ini: mengubah dana-titipan-portfolio-presenter.js
// atau investasi-view.js — file ini 100% menguji lewat `Aset.*` (aset.js) apa
// adanya, 0 duplikasi rumus quota di test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeStatefulDom() {
  const registry = new Map();
  function makeElement(id) {
    return {
      id, value: '', textContent: '', innerHTML: '', className: '',
      placeholder: '', disabled: false, style: {},
      classList: {
        _set: new Set(),
        toggle(cls, force) {
          const on = force !== undefined ? force : !this._set.has(cls);
          if (on) this._set.add(cls); else this._set.delete(cls);
          return on;
        },
        contains(cls) { return this._set.has(cls); },
        add(cls) { this._set.add(cls); },
        remove(cls) { this._set.delete(cls); },
      },
    };
  }
  return {
    getElementById(id) {
      if (!registry.has(id)) registry.set(id, makeElement(id));
      return registry.get(id);
    },
    _registry: registry,
  };
}

function makeCtx(D, dom) {
  const ctx = loadSource(
    ['modules/asset/aset.js', 'modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    {
      D,
      document: dom,
      escapeHtml: (s) => String(s),
      openModal: () => {},
      closeModal: () => {},
      uid: () => 'owner_x',
      sameId: (a, b) => String(a) === String(b),
      save: () => {},
      toast: () => {},
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      todayStr: () => '2026-08-07',
    },
    ['Aset', 'MultiOwnerEngine', 'Investment', 'DanaTitipanPortfolioAPI'],
  );
  ctx.Aset.renderList = () => {};
  return ctx;
}

// quotaFromList(dom,i) -- baca konten div "#assetOwnerKuota{i}" dari innerHTML
// #assetOwnersList (STRING hasil _renderOwnersList(), bukan elemen DOM nyata --
// mock dom di sini TIDAK mem-parsing HTML jadi elemen anak, sama catatan
// tests/asset-owners-nominal-sync-s429.test.js). Dipakai KHUSUS utk verifikasi
// initial render (§13 prompt sesi: quota harus benar SAAT modal pertama kali
// dibuka, sebelum user berinteraksi apa pun) -- SETELAH interaksi (mis.
// onOwnerPorsiInput), elemen #assetOwnerKuota{i} sungguhan ter-vivify oleh
// getElementById() & bisa dibaca langsung (lihat Test 7 di bawah).
function quotaFromList(dom, i) {
  const html = dom.getElementById('assetOwnersList').innerHTML;
  const marker = 'id="assetOwnerKuota' + i + '"';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  return html.slice(idx, idx + 300);
}

function baseD({ assets, investments, titipanCommitments }) {
  return {
    assets: assets || [], investments: investments || [], investmentTx: [], investmentWatchlist: [],
    debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [], titipanReturns: [],
  };
}

// ---- Test 1: quota dasar (0 allocation lain) ----

test('1. quota dasar: principal 50jt, aset.nilai 40jt, porsi 50% -> quota 30jt (0 allocation lain)', () => {
  const D = baseD({
    assets: [{ id: 'aBaru', name: 'Aset Baru', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aBaru';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /Kuota sisa/);
  assert.match(html, /30000000/);
});

// ---- Test 2: existing Aset allocation ----

test('2. existing Aset allocation: principal 50jt, Aset lama 20jt, Aset baru 40jt porsi 50% -> quota 10jt', () => {
  const D = baseD({
    assets: [
      { id: 'aLama', name: 'Aset Lama', nilai: 20000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
      { id: 'aBaru', name: 'Aset Baru', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] },
    ],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aBaru';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /10000000/);
});

// ---- Test 3: existing Investment allocation (membuktikan S504 dipakai) ----

test('3. existing Investment allocation: principal 50jt, Investment 20jt, Aset baru 40jt porsi 50% -> quota 10jt', () => {
  const D = baseD({
    assets: [{ id: 'aBaru', name: 'Aset Baru', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] }],
    investments: [{ id: 'invA', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aBaru';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /10000000/);
});

// ---- Test 4: mixed domain ----

test('4. mixed domain: principal 100jt, Investment 20jt + Aset lain 30jt, Aset sekarang 40jt porsi 50% -> quota 30jt', () => {
  const D = baseD({
    assets: [
      { id: 'aLain', name: 'Aset Lain', nilai: 30000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] },
      { id: 'aSekarang', name: 'Aset Sekarang', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] },
    ],
    investments: [{ id: 'invA', name: 'BBCA', unit: 1, avgPrice: 20000000, currentPrice: 20000000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 100000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aSekarang';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /30000000/);
});

// ---- Test 5: current asset exclusion (test paling penting, §14 prompt) ----

test('5. current asset exclusion: Aset sekarang 40jt Budi 50% -> allocation Aset ini sendiri TIDAK ikut dihitung sbg "other allocation"', () => {
  const D = baseD({
    assets: [{ id: 'aX', name: 'Aset X', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aX';
  ctx.Aset.openOwnersModal();
  // Kalau exclusion GAGAL (Aset X ikut dihitung sbg "other"), quota akan
  // terpotong dua kali: 50 - 20(diri sendiri) - 20(draft) = 10jt (SALAH).
  // Exclusion BENAR: 50 - 0(tidak ada allocation lain) - 20(draft) = 30jt.
  const html = quotaFromList(dom, 0);
  assert.match(html, /30000000/, 'allocation Aset X sendiri tidak boleh ikut dihitung sbg allocation lain (double count)');
});

// ---- Test §15: multi-owner, quota per owner (bukan gabungan) ----

test('multi-owner: Budi principal 50jt, Cici principal 30jt, Aset 40jt Budi=50% Cici=50% -> quota dihitung per owner', () => {
  const D = baseD({
    assets: [{ id: 'aM', name: 'Aset Multi', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'cici', ownerName: 'Cici', porsi: 50, isSelf: false }] }],
    titipanCommitments: [
      { ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 },
      { ownerId: 'cici', ownerName: 'Cici', principalAmount: 30000000 },
    ],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aM';
  ctx.Aset.openOwnersModal();
  const budiHtml = quotaFromList(dom, 0);
  const ciciHtml = quotaFromList(dom, 1);
  // Budi: 50jt - 0 - 20jt(draft) = 30jt. Cici: 30jt - 0 - 20jt(draft) = 10jt.
  assert.match(budiHtml, /30000000/);
  assert.match(ciciHtml, /10000000/);
});

// ---- Test 6: over quota -> soft warning, Save TIDAK diblokir oleh quota ----

test('6. over quota: menghasilkan warning "melebihi pokok dikomit" tapi Save tetap dikontrol validasi porsi 100% existing', () => {
  const D = baseD({
    assets: [{ id: 'aOver', name: 'Aset Over', nilai: 100000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 100, isSelf: false }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aOver';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /melebihi pokok dikomit/);
  // total porsi = 100% -> saveBtn TIDAK boleh disabled cuma krn quota negatif.
  const saveBtn = dom.getElementById('assetOwnersSaveBtn');
  assert.equal(saveBtn.disabled, false, 'Save harus tetap aktif (validasi porsi 100%, bukan quota) meski over-alokasi');
});

// ---- Test 7: live update lewat onOwnerPorsiInput (tanpa render ulang/reload) ----

test('7. live update: ubah porsi 10 -> 20 -> 50 -> 75 -- quota ikut berubah tiap kali, TANPA render ulang list', () => {
  const D = baseD({
    assets: [{ id: 'aLive', name: 'Aset Live', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 10, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 90, isSelf: true }] }],
    titipanCommitments: [{ ownerId: 'budi', ownerName: 'Budi', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aLive';
  ctx.Aset.openOwnersModal();

  ctx.Aset.onOwnerPorsiInput(0, '10');
  assert.match(dom.getElementById('assetOwnerKuota0').innerHTML, /46000000/); // 50-0-4jt

  ctx.Aset.onOwnerPorsiInput(0, '20');
  assert.match(dom.getElementById('assetOwnerKuota0').innerHTML, /42000000/); // 50-0-8jt

  ctx.Aset.onOwnerPorsiInput(0, '50');
  assert.match(dom.getElementById('assetOwnerKuota0').innerHTML, /30000000/); // 50-0-20jt

  ctx.Aset.onOwnerPorsiInput(0, '75');
  // 40jt*0.75=30jt draft, 50-0-30 = 20jt.
  assert.match(dom.getElementById('assetOwnerKuota0').innerHTML, /20000000/);
});

// ---- Owner belum punya commitment: prompt "catat pokok dulu", sama persis Investment ----

test('owner belum punya titipanCommitments -> prompt "catat pokok dulu" (bukan tampil tanpa batas), 0 auto-commit', () => {
  const D = baseD({
    assets: [{ id: 'aNoCommit', name: 'Aset Tanpa Commit', nilai: 40000000, owners: [{ ownerId: 'budi', ownerName: 'Budi', porsi: 50, isSelf: false }, { ownerId: 'aku', ownerName: 'Aku', porsi: 50, isSelf: true }] }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aNoCommit';
  ctx.Aset.openOwnersModal();
  const html = quotaFromList(dom, 0);
  assert.match(html, /belum dicatat/);
  assert.match(html, /catat pokok dulu/);
  assert.deepEqual(D.titipanCommitments, [], '0 auto-commit -- D.titipanCommitments tidak boleh dibuat otomatis (tetap kosong)');
});

// ---- Owner SELF: 0 quota row dirender (konsisten Investment) ----

test('owner isSelf -> tidak ada #assetOwnerKuota dirender (konsisten InvestmentUI, quota hanya utk owner non-SELF)', () => {
  const D = baseD({
    assets: [{ id: 'aSelf', name: 'Aset Sendiri', nilai: 40000000, owners: [{ ownerId: 'aku', ownerName: 'Aku', porsi: 100, isSelf: true }] }],
    titipanCommitments: [{ ownerId: 'aku', ownerName: 'Aku', principalAmount: 50000000 }],
  });
  const dom = makeStatefulDom();
  const ctx = makeCtx(D, dom);
  ctx.Aset.editId = 'aSelf';
  ctx.Aset.openOwnersModal();
  const rowHtml = dom.getElementById('assetOwnersList').innerHTML;
  assert.doesNotMatch(rowHtml, /assetOwnerKuota0/);
});
