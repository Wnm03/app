'use strict';
// tests/s705-aset-report-cards-trycatch-guard.test.js — cakupan FIX audit
// "3 kartu laporan aset tidak dilindungi try/catch" (pola sama S601/S608):
// Penyusutan.renderList()/PajakAset.renderList()/LaporanAset.renderList()
// sebelumnya dipanggil berurutan TANPA try/catch dari 4 titik di
// Aset.renderList() -- 1 fungsi throw (mis. data aset korup) merambat ke
// pemanggil, membatalkan panggilan berikutnya (AssetInsight.render() ikut
// batal) dan di alur Aset.delete() baris setelah Aset.renderList()
// (renderAccGrid/renderDashAccList/renderLapAccList) ikut batal jalan.
// Fix: Aset._safeRenderReports() -- bungkus tiap kartu laporan dgn
// try/catch sendiri2, 1 kartu gagal TIDAK menjatuhkan 2 lainnya maupun
// AssetInsight.render() maupun pemanggil Aset.renderList() itu sendiri.
//
// Test di sini HANYA memverifikasi kontrak baru (1 kartu laporan rusak
// tidak menjatuhkan render list / kartu lain & AssetInsight tetap
// jalan) -- bukan re-test isi HTML kartu laporan itu sendiri.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function buildCtx(overrides) {
  const el = { innerHTML: '<div>render lama (basi)</div>' };
  const D = {
    assets: [
      { id: 'good1', name: 'Motor', jenis: 'Kendaraan', nilai: 5000000, owners: [] },
    ],
  };
  const calls = [];
  const ctx = loadSource(
    ['modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    Object.assign(
      {
        D,
        uid: () => 'uid_' + Math.random().toString(36).slice(2),
        document: { getElementById: (id) => (id === 'assetList' ? el : null) },
        escapeHtml: (s) => String(s),
        fmt: (n) => 'Rp ' + Math.round(n || 0),
        assetCrossCheckWarning: () => null,
        migrateAssetInvestmentsToHoldings: () => {},
        renderKekayaanBersih: () => {},
        hitungZakatMaal: () => {},
        Penyusutan: { renderList: () => { calls.push('penyusutan'); } },
        PajakAset: { renderList: () => { calls.push('pajak'); } },
        LaporanAset: { renderList: () => { calls.push('laporan'); } },
        AssetInsight: { render: () => { calls.push('insight'); } },
        console: { error: () => {} },
      },
      overrides || {},
    ),
    ['Aset'],
  );
  return { ctx, el, calls };
}

test('Aset._safeRenderReports() — Penyusutan.renderList() throw tidak menjatuhkan PajakAset/LaporanAset/AssetInsight', () => {
  const { ctx, calls } = buildCtx({
    Penyusutan: { renderList: () => { throw new Error('data penyusutan korup'); } },
  });
  assert.doesNotThrow(() => ctx.Aset._safeRenderReports());
});

test('Aset.renderList() — PajakAset.renderList() throw tidak membatalkan AssetInsight.render() sesudahnya', () => {
  const { ctx, calls } = buildCtx({
    PajakAset: { renderList: () => { throw new Error('data pajak korup'); } },
  });
  assert.doesNotThrow(() => ctx.Aset.renderList());
  assert.ok(calls.includes('penyusutan'), 'Penyusutan.renderList() tetap dipanggil');
  assert.ok(calls.includes('laporan'), 'LaporanAset.renderList() tetap dipanggil walau PajakAset gagal');
  assert.ok(calls.includes('insight'), 'AssetInsight.render() tetap dipanggil walau PajakAset gagal');
});

test('Aset.renderList() — LaporanAset.renderList() throw tidak menjatuhkan render #assetList maupun pemanggil', () => {
  const { ctx, el, calls } = buildCtx({
    LaporanAset: { renderList: () => { throw new Error('data laporan korup'); } },
  });
  assert.doesNotThrow(() => ctx.Aset.renderList());
  assert.match(el.innerHTML, /Motor/);
  assert.doesNotMatch(el.innerHTML, /render lama \(basi\)/);
  assert.ok(calls.includes('insight'), 'AssetInsight.render() tetap dipanggil walau LaporanAset gagal');
});

test('Aset.renderList() — 0 aset (early-return "belum ada aset tercatat") tetap pakai _safeRenderReports(), 1 kartu gagal tidak membatalkan AssetInsight', () => {
  const { ctx, calls } = buildCtx({
    Penyusutan: { renderList: () => { throw new Error('data penyusutan korup'); } },
  });
  ctx.D.assets = [];
  assert.doesNotThrow(() => ctx.Aset.renderList());
  assert.ok(calls.includes('pajak'), 'PajakAset.renderList() tetap dipanggil di jalur kosong');
  assert.ok(calls.includes('laporan'), 'LaporanAset.renderList() tetap dipanggil di jalur kosong');
  assert.ok(calls.includes('insight'), 'AssetInsight.render() tetap dipanggil di jalur kosong');
});
