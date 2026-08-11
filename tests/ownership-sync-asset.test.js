'use strict';
// tests/ownership-sync-asset.test.js — cakupan Sesi 193 (Ownership Sync —
// Asset & Investasi) khusus bagian Asset (modules/asset/aset.js).
//
// Target: isAssetOwnershipSelf() (helper baru, reuse OwnershipEngine),
// Aset.totalValue() (Total Asset), AssetInsight.compute()/render() (AI
// Insight), Aset.renderDashboard() (Dashboard Aset) — SEMUA cuma nambah 1
// filter ownership di atas logic lama, 0 rumus diubah.
//
// RULE yang dites di sini:
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari Total Aset/
//     Dashboard Aset/AI Insight, TAPI TIDAK dihapus dari D.assets (histori
//     tetap tersimpan, masih bisa diakses lewat Aset.renderList()/D.assets).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    assets: [
      { id: 'a1', name: 'Tanah Warisan', jenis: 'Tanah', nilai: 500000000 }, // tanpa ownership -> default SELF
      { id: 'a2', name: 'Rumah Sendiri', jenis: 'Rumah/Bangunan', nilai: 800000000, ownership: 'SELF' },
      { id: 'a3', name: 'Saham Modal Investor', jenis: 'Saham', nilai: 200000000, ownership: 'INVESTOR' },
      { id: 'a4', name: 'Emas Titipan Customer', jenis: 'Emas/Logam Mulia', nilai: 50000000, ownership: 'customer' },
      { id: 'a5', name: 'Motor Keluarga', jenis: 'Kendaraan', nilai: 30000000, ownership: 'FAMILY' },
      { id: 'a6', name: 'Tanah Pihak Ketiga', jenis: 'Tanah', nilai: 100000000, ownership: 'THIRD_PARTY' },
    ],
    accounts: [],
    transactions: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s) },
    ['OwnershipEngine', 'Aset', 'AssetInsight', 'isAssetOwnershipSelf']
  );
}

test('isAssetOwnershipSelf() — aset tanpa field ownership -> true (default SELF)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[0]), true);
});

test('isAssetOwnershipSelf() — aset ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[1]), true);
});

test('isAssetOwnershipSelf() — INVESTOR/CUSTOMER/FAMILY/THIRD_PARTY -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[2]), false);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[3]), false);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[4]), false);
  assert.equal(ctx.isAssetOwnershipSelf(D.assets[5]), false);
});

test('Aset.totalValue() — HANYA aset SELF (eksplisit/default) yang dijumlah', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // 500jt (a1, default SELF) + 800jt (a2, SELF) = 1.3M
  assert.equal(ctx.Aset.totalValue(), 1300000000);
});

test('Aset.totalValue() — D.assets ASLI tidak berubah (histori aset non-SELF tetap tersimpan)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Aset.totalValue();
  assert.equal(D.assets.length, 6, 'tidak ada aset yang dihapus/dimutasi');
});

test('Aset.totalValue() — kalau OwnershipEngine tidak dimuat, fallback hitung semua aset (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/aset.js'], { D, escapeHtml: (s) => String(s) }, ['Aset']);
  const totalSemua = D.assets.reduce((s, a) => s + a.nilai, 0);
  assert.equal(ctx.Aset.totalValue(), totalSemua);
});

test('AssetInsight.compute() — insight konsentrasi (kalau muncul) pakai persentase HANYA dari aset SELF, bukan ikut aset non-SELF', () => {
  const D = makeD();
  // SELF-only: a1 Tanah 500jt + a2 Rumah/Bangunan 800jt = total 1.3M.
  // Rumah/Bangunan = 800jt/1.3M = 61.5% (>=60%, insight HARUS muncul).
  // Kalau (secara salah) aset non-SELF ikut dihitung (a3 Saham 200jt + a4 Emas
  // 50jt + a5 Motor 30jt + a6 Tanah 100jt), total jadi 1.68M dan proporsi
  // Rumah/Bangunan turun jadi 800jt/1.68M=47.6% (insight TIDAK akan muncul) --
  // jadi test ini memastikan filter ownership benar2 dipakai, bukan cuma
  // kebetulan lolos.
  const ctx = makeCtx(D);
  const insights = ctx.AssetInsight.compute();
  const konsentrasi = insights.find((t) => /Rumah\/Bangunan/.test(t) && /diversifikasi/i.test(t));
  assert.notEqual(konsentrasi, undefined, 'insight konsentrasi Rumah/Bangunan harus muncul (61.5% dari total SELF)');
  assert.match(konsentrasi, /62%|61%/, 'persentase yg ditampilkan harus dihitung HANYA dari aset SELF (~61.5%), bukan ikut aset non-SELF (~47.6%)');
});

test('Aset.renderDashboard() — Dashboard Aset (assetDashboard*) HANYA menghitung aset SELF', () => {
  const D = makeD();
  const store = {};
  const fakeEl = (id) => ({
    get textContent() { return store[id]; },
    set textContent(v) { store[id] = v; },
    innerHTML: '',
    classList: { add() {}, remove() {} },
    style: {},
  });
  const documentStub = {
    getElementById(id) {
      if (!store.__els) store.__els = {};
      if (!store.__els[id]) store.__els[id] = fakeEl(id);
      return store.__els[id];
    },
    querySelectorAll() { return []; },
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    { D, document: documentStub, escapeHtml: (s) => String(s), fmt: (n) => 'Rp ' + n, fmtFull: (n) => 'Rp ' + n, fmtFullSigned: (n) => (n >= 0 ? '+' : '') + n },
    ['OwnershipEngine', 'Aset']
  );
  ctx.Aset.renderDashboard();
  assert.equal(store.assetDashTotal, 'Rp 1300000000', 'total pasar Dashboard Aset harus 1.3M (HANYA aset SELF)');
});
