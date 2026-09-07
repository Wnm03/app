'use strict';
// tests/fuel-jenis-per-vehicle-s755.test.js — Sesi 755: fix gap "Belum
// optimal" dari S753/S754 -- D.fuelPriceRef.lastType SEBELUMNYA 1 field
// GLOBAL dipakai bareng semua kendaraan, jadi kalau user isi BBM motor
// (Pertalite) lalu buka modal BBM mobil (biasa Pertamax), dropdown Jenis
// BBM mobil ikut default ke Pertalite juga (bukan Pertamax) -- user harus
// ganti manual tiap gantian kendaraan. Fix: D.fuelPriceRef.lastTypeByVehicle
// (per vehicleId), dgn D.fuelPriceRef.lastType (global) tetap dipertahankan
// sbg fallback utk pemanggil yang belum kirim vehicleId (backward-compat).
//
// Scope tes: FuelPriceRef.populateSelect()/onSelectChange() (modules/
// vehicle/fuel-price-ref.js) parameter ke-3 vehicleId baru, + wiring
// tx-bbm.js onTxBbmVehicleChange() yang sekarang ikut isi ulang dropdown
// txBbmJenis per-kendaraan tiap ganti pilihan di txBbmVehicle.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop === 'dispatchEvent') return () => true;
      if (prop === 'matches') return () => false;
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
      fuelPriceRef: {
        pertalite: 10000, pertamax: 12500, pertamaxTurbo: 14000,
        pertaminaDex: 13800, dexlite: 13600, solar: 6800,
        lastType: 'pertalite', lastTypeByVehicle: {}, lastCheckedAt: null, refSources: {},
      },
    },
    overrides,
  );
}

function makeFuelRefCtx({ document, D }) {
  return loadSource(
    ['modules/vehicle/fuel-price-ref.js'],
    {
      document, D,
      escapeHtml: (s) => String(s),
      save: () => {},
    },
    ['FuelPriceRef'],
  );
}

// ---------------------------------------------------------------------------
// populateSelect(selectId, vehicleId)
// ---------------------------------------------------------------------------

test('s755: populateSelect() dgn vehicleId -> pakai lastTypeByVehicle[vehicleId], bukan lastType global', () => {
  const D = makeD({
    fuelPriceRef: Object.assign(makeD().fuelPriceRef, {
      lastType: 'pertalite', // motor terakhir isi Pertalite
      lastTypeByVehicle: { mobil1: 'pertamax' }, // tapi mobil1 biasa Pertamax
    }),
  });
  const sel = { innerHTML: '', value: '' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ txBbmJenis: sel }), D });
  ctx.FuelPriceRef.populateSelect('txBbmJenis', 'mobil1');
  assert.equal(sel.value, 'pertamax', 'dropdown mobil1 harus default Pertamax, bukan ikut lastType global Pertalite');
});

test('s755: populateSelect() dgn vehicleId yang belum pernah punya lastType sendiri -> fallback ke lastType global', () => {
  const D = makeD({
    fuelPriceRef: Object.assign(makeD().fuelPriceRef, {
      lastType: 'pertamaxTurbo',
      lastTypeByVehicle: { mobil1: 'pertamax' },
    }),
  });
  const sel = { innerHTML: '', value: '' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ txBbmJenis: sel }), D });
  ctx.FuelPriceRef.populateSelect('txBbmJenis', 'motorBaru'); // belum ada entry lastTypeByVehicle
  assert.equal(sel.value, 'pertamaxTurbo');
});

test('s755: populateSelect() TANPA vehicleId (pemanggil lama) -> perilaku lama tetap jalan, pakai lastType global', () => {
  const D = makeD({
    fuelPriceRef: Object.assign(makeD().fuelPriceRef, {
      lastType: 'solar',
      lastTypeByVehicle: { mobil1: 'pertamax' },
    }),
  });
  const sel = { innerHTML: '', value: '' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ jenisBbmSelect: sel }), D });
  ctx.FuelPriceRef.populateSelect('jenisBbmSelect');
  assert.equal(sel.value, 'solar');
});

test('s755: populateSelect() dgn D.fuelPriceRef.lastTypeByVehicle belum ada sama sekali (data lama, sebelum sesi ini) -> tidak throw, fallback ke lastType', () => {
  const D = makeD();
  delete D.fuelPriceRef.lastTypeByVehicle;
  const sel = { innerHTML: '', value: '' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ txBbmJenis: sel }), D });
  assert.doesNotThrow(() => ctx.FuelPriceRef.populateSelect('txBbmJenis', 'mobil1'));
  assert.equal(sel.value, 'pertalite');
});

// ---------------------------------------------------------------------------
// onSelectChange(selectId, hargaId, vehicleId)
// ---------------------------------------------------------------------------

test('s755: onSelectChange() dgn vehicleId -> simpan ke lastTypeByVehicle[vehicleId] DAN tetap update lastType global', () => {
  const D = makeD();
  const sel = { value: 'pertamax' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ txBbmJenis: sel }), D });
  ctx.FuelPriceRef.onSelectChange('txBbmJenis', undefined, 'mobil1');
  assert.equal(D.fuelPriceRef.lastTypeByVehicle.mobil1, 'pertamax');
  assert.equal(D.fuelPriceRef.lastType, 'pertamax');
});

test('s755: onSelectChange() 2 kendaraan beda jenis BBM -> masing-masing tersimpan terpisah, tidak saling menimpa', () => {
  const D = makeD();
  const selMotor = { value: 'pertalite' };
  const selMobil = { value: 'pertamax' };
  const ctxMotor = makeFuelRefCtx({ document: makeDoc({ bbmJenis: selMotor }), D });
  ctxMotor.FuelPriceRef.onSelectChange('bbmJenis', undefined, 'motor1');
  const ctxMobil = makeFuelRefCtx({ document: makeDoc({ bbmJenis: selMobil }), D });
  ctxMobil.FuelPriceRef.onSelectChange('bbmJenis', undefined, 'mobil1');
  assert.equal(D.fuelPriceRef.lastTypeByVehicle.motor1, 'pertalite');
  assert.equal(D.fuelPriceRef.lastTypeByVehicle.mobil1, 'pertamax');
});

test('s755: onSelectChange() TANPA vehicleId (pemanggil lama) -> lastTypeByVehicle tidak disentuh sama sekali', () => {
  const D = makeD();
  const sel = { value: 'dexlite' };
  const ctx = makeFuelRefCtx({ document: makeDoc({ jenisBbmSelect: sel }), D });
  ctx.FuelPriceRef.onSelectChange('jenisBbmSelect');
  assert.equal(D.fuelPriceRef.lastType, 'dexlite');
  assert.deepEqual(JSON.parse(JSON.stringify(D.fuelPriceRef.lastTypeByVehicle)), {});
});

// ---------------------------------------------------------------------------
// tx-bbm.js onTxBbmVehicleChange() -- wiring: isi ulang txBbmJenis per-kendaraan
// ---------------------------------------------------------------------------

function makeTxBbmCtx({ document, D, FuelPriceRef, getVehicleKm }) {
  return loadSource(
    ['modules/finance/tx-bbm.js'],
    { document, D, FuelPriceRef, getVehicleKm },
    ['onTxBbmVehicleChange'],
  );
}

test('s755: onTxBbmVehicleChange() -- meneruskan vehicleId terpilih ke FuelPriceRef.populateSelect()/onSelectChange()', () => {
  const calls = [];
  const D = { vehicles: [] };
  const sel = { value: 'mobil1' };
  const kmEl = { value: '' };
  const FuelPriceRef = {
    populateSelect: (id, vehId) => calls.push(['populateSelect', id, vehId]),
    onSelectChange: (id, hargaId, vehId) => calls.push(['onSelectChange', id, hargaId, vehId]),
  };
  const getVehicleKm = () => 5000;
  const ctx = makeTxBbmCtx({
    document: makeDoc({ txBbmVehicle: sel, txBbmKm: kmEl }),
    D, FuelPriceRef, getVehicleKm,
  });
  ctx.onTxBbmVehicleChange();
  assert.deepEqual(calls[0], ['populateSelect', 'txBbmJenis', 'mobil1']);
  assert.deepEqual(calls[1], ['onSelectChange', 'txBbmJenis', 'txBbmHargaL', 'mobil1']);
  assert.equal(kmEl.value, 5000);
});

test('s755: onTxBbmVehicleChange() -- ganti ke kendaraan lain, panggilan berikutnya kirim vehicleId yang baru', () => {
  const calls = [];
  const D = { vehicles: [] };
  const sel = { value: 'motor1' };
  const kmEl = { value: '' };
  const FuelPriceRef = {
    populateSelect: (id, vehId) => calls.push(['populateSelect', vehId]),
    onSelectChange: (id, hargaId, vehId) => calls.push(['onSelectChange', vehId]),
  };
  const ctx = makeTxBbmCtx({
    document: makeDoc({ txBbmVehicle: sel, txBbmKm: kmEl }),
    D, FuelPriceRef, getVehicleKm: () => 0,
  });
  ctx.onTxBbmVehicleChange();
  sel.value = 'mobil2';
  ctx.onTxBbmVehicleChange();
  assert.deepEqual(calls, [
    ['populateSelect', 'motor1'], ['onSelectChange', 'motor1'],
    ['populateSelect', 'mobil2'], ['onSelectChange', 'mobil2'],
  ]);
});
