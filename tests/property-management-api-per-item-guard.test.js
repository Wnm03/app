'use strict';
// tests/property-management-api-per-item-guard.test.js — Regression utk audit lanjutan
// "bug serupa" InvestmentWatchUI.render() (lihat
// tests/investasi-watch-render-guard-audit-tombol-investasi.test.js): pola yang sama —
// fungsi yang dipanggil di luar dispatcher data-action (di sini lewat
// PropertyManagementAPI.summary() -> PropertyManagementPresenter.render(), dipanggil
// langsung dari renderPageContent('aset')) TIDAK boleh membiarkan exception dari
// kalkulasi PER ITEM merambat keluar tanpa tertangkap, karena itu akan menjatuhkan
// SELURUH render tanpa toast.
//
// Ditemukan 2 titik: `taxSummary()` (PajakAset.hitungPBB per item) &
// `depreciationSummary()` (Penyusutan.hitung per item) di
// modules/asset/property-management-api.js dipanggil TANPA try/catch, padahal
// `AssetMaintenanceAPI.maintenanceOverview()` (file tetangga, panggilan
// `Penyusutan.hitung()` yang SAMA PERSIS) sudah membungkusnya sejak awal — celah
// murni kelalaian, bukan perbedaan desain yang disengaja.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(assets) {
  return { assets };
}

function makeCtx(D, overrides = {}) {
  return loadSource(
    ['modules/asset/property-management-api.js'],
    {
      D,
      Aset: { ICON: {} },
      PajakAset: {
        JENIS_PROPERTI: ['Tanah', 'Rumah/Bangunan'],
        settings: () => ({}),
        hitungPBB: (a) => ({ njop: a.nilai, njoptkp: 0, dasar: 0, terutang: 0 }),
      },
      Penyusutan: {
        hitung: () => null,
      },
      ...overrides,
    },
    ['PropertyManagementAPI'],
  );
}

test('[taxSummary] 1 aset yg bikin PajakAset.hitungPBB() throw TIDAK menjatuhkan taxSummary() -- aset lain tetap dihitung', () => {
  const D = makeD([
    { id: 'a1', name: 'Tanah Normal', jenis: 'Tanah', nilai: 100000000 },
    { id: 'a2', name: 'Tanah Beracun', jenis: 'Tanah', nilai: 50000000 },
  ]);
  const ctx = makeCtx(D, {
    PajakAset: {
      JENIS_PROPERTI: ['Tanah', 'Rumah/Bangunan'],
      settings: () => ({}),
      hitungPBB: (a) => {
        if (a.id === 'a2') throw new Error('simulated PBB calc error');
        return { njop: a.nilai, njoptkp: 0, dasar: 0, terutang: 10000 };
      },
    },
  });

  const result = assert.doesNotThrow(() => ctx.PropertyManagementAPI.taxSummary());
  const r = ctx.PropertyManagementAPI.taxSummary();
  assert.equal(r.ok, true);
  assert.equal(r.count, 2, 'aset yang errornya tetap ikut dihitung sbg item (fallback aman), bukan di-skip diam2');
  assert.equal(r.totalPBB, 10000, 'hanya PBB aset normal yang ikut dijumlahkan, aset error fallback ke terutang 0');
  const errored = r.items.find((x) => x.id === 'a2');
  assert.equal(errored.pbb.error, true);
});

test('[depreciationSummary] 1 aset yg bikin Penyusutan.hitung() throw TIDAK menjatuhkan depreciationSummary() -- aset lain tetap terhitung', () => {
  const D = makeD([
    { id: 'a1', name: 'Rumah Normal', jenis: 'Rumah/Bangunan', nilai: 500000000, penyusutan: { aktif: true } },
    { id: 'a2', name: 'Rumah Beracun', jenis: 'Rumah/Bangunan', nilai: 300000000, penyusutan: { aktif: true } },
  ]);
  const ctx = makeCtx(D, {
    Penyusutan: {
      hitung: (a) => {
        if (a.id === 'a2') throw new Error('simulated depreciation calc error');
        return { metode: 'garis_lurus', hargaPerolehan: 500000000, nilaiBuku: 400000000, akumulasi: 100000000 };
      },
    },
  });

  assert.doesNotThrow(() => ctx.PropertyManagementAPI.depreciationSummary());
  const r = ctx.PropertyManagementAPI.depreciationSummary();
  assert.equal(r.ok, true);
  assert.equal(r.jumlahAktif, 2);
  assert.equal(r.belumLengkap, 1, 'aset yang throw dihitung sbg belumLengkap, bukan menjatuhkan seluruh perhitungan');
  assert.equal(r.totalNilaiBuku, 400000000, 'hanya nilai buku aset normal yang ikut dijumlahkan');
});

test('[summary] gabungan taxSummary()+depreciationSummary() tetap ok:true walau ada aset bermasalah di keduanya', () => {
  const D = makeD([
    { id: 'a1', name: 'Tanah A', jenis: 'Tanah', nilai: 100000000 },
    { id: 'a2', name: 'Rumah Beracun', jenis: 'Rumah/Bangunan', nilai: 300000000, penyusutan: { aktif: true } },
  ]);
  const ctx = makeCtx(D, {
    PajakAset: {
      JENIS_PROPERTI: ['Tanah', 'Rumah/Bangunan'],
      settings: () => ({}),
      hitungPBB: () => { throw new Error('simulated PBB error'); },
    },
    Penyusutan: {
      hitung: () => { throw new Error('simulated depreciation error'); },
    },
  });

  assert.doesNotThrow(() => ctx.PropertyManagementAPI.summary());
  const s = ctx.PropertyManagementAPI.summary();
  assert.equal(s.ok, true);
  assert.equal(s.tax.ok, true);
  assert.equal(s.depreciation.ok, true);
});

test('[taxSummary/depreciationSummary] tanpa error -- perilaku normal tidak berubah', () => {
  const D = makeD([
    { id: 'a1', name: 'Tanah A', jenis: 'Tanah', nilai: 100000000, penyusutan: { aktif: false } },
  ]);
  const ctx = makeCtx(D);
  const tax = ctx.PropertyManagementAPI.taxSummary();
  assert.equal(tax.ok, true);
  assert.equal(tax.count, 1);
  assert.equal(tax.items[0].pbb.error, undefined);
});
