'use strict';
// tests/sparepart-render-dashboard-vehicle-scope-audit.test.js — audit user
// (lihat chat): widget ringkasan Sparepart.renderDashboard() (#sparepartDashboard
// -- kartu Stok Menipis/Habis/Part Terlaris/Nilai Persediaan/chart di atas
// tab Stok Sparepart) dulu selalu memakai D.partsStock/D.servisLogs MENTAH
// (semua kendaraan tercampur), BEDA dengan Sparepart.renderStockList()
// (daftar di bawahnya, fungsi yang sama) yang SUDAH benar filter per
// curVehicleId. Fix: filter dulu pakai pola sama persis renderStockList()
// sebelum lempar ke calcDashboardStats().

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, curVehicleId) {
  const dashEl = { innerHTML: '' };
  const document = { getElementById: (id) => (id === 'sparepartDashboard' ? dashEl : null) };
  const ctx = loadSource(
    ['modules/shared/helper-teks.js', 'modules/shared/format-tema.js', 'modules/vehicle/sparepart-servis.js'],
    {
      D,
      document,
      curVehicleId,
      MY_WRENCH: { brand: 'MOLLAR', sku: 'MLR-B11950', minNm: 13.56, maxNm: 108.48, minLbft: 10, maxLbft: 80, panjang: 280 },
    },
    ['Sparepart']
  );
  return { ctx, dashEl };
}

test('renderDashboard() — nilai persediaan HANYA hitung stok kendaraan aktif, bukan semua kendaraan', () => {
  const D = {
    partsStock: [
      { id: 'p1', name: 'Kampas Rem Veh1', qty: 2, price: 100000, vehicleId: 'veh1' },
      { id: 'p2', name: 'Oli Veh2', qty: 5, price: 200000, vehicleId: 'veh2' },
    ],
    sparepartCats: [],
    servisLogs: [],
  };
  const { ctx, dashEl } = makeCtx(D, 'veh1');
  ctx.Sparepart.renderDashboard();
  // Nilai persediaan veh1 saja: 2*100000 = 200000. Kalau bocor ikut veh2
  // (5*200000=1jt) totalnya akan 1.2jt.
  assert.match(dashEl.innerHTML, /200\.000/);
  assert.doesNotMatch(dashEl.innerHTML, /1\.200\.000/);
});

test('renderDashboard() — part universal (tanpa vehicleId) tetap ikut dihitung (fail-open, backward compatible)', () => {
  const D = {
    partsStock: [
      { id: 'p1', name: 'Baut Universal', qty: 1, price: 50000 },
      { id: 'p2', name: 'Oli Veh2', qty: 5, price: 200000, vehicleId: 'veh2' },
    ],
    sparepartCats: [],
    servisLogs: [],
  };
  const { ctx, dashEl } = makeCtx(D, 'veh1');
  ctx.Sparepart.renderDashboard();
  assert.match(dashEl.innerHTML, /50\.000/);
});
