'use strict';
// S256AO: D.fuelPriceRef belum ada di sesi pertama setelah onboarding (seed ada di load()). Writer FuelPriceRef tidak boleh TypeError.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'modules/vehicle/fuel-price-ref.js'), 'utf8');

function load(D) {
  const saved = [];
  const sel = { value: 'pertamax' };
  const doc = { getElementById: (id) => (id === 'sel' ? sel : null) };
  const api = new Function('D', 'document', 'save', 'todayStr', 'window', src + '; return FuelPriceRef;')(
    D, doc, () => saved.push(1), () => '2026-10-07', {});
  return { api, saved };
}

test('S256AO: onSelectChange tidak melempar saat D.fuelPriceRef undefined, dan menyimpan pilihan', () => {
  const D = {};
  const { api, saved } = load(D);
  assert.doesNotThrow(() => api.onSelectChange('sel', null, 'veh_1'));
  assert.strictEqual(D.fuelPriceRef.lastType, 'pertamax');
  assert.strictEqual(D.fuelPriceRef.lastTypeByVehicle.veh_1, 'pertamax');
  assert.strictEqual(saved.length, 1);
});

test('S256AO: wadah darurat tidak menduplikasi angka seed (agar blok migrasi load() tetap yang mengisi)', () => {
  const D = {};
  load(D).api._ensureStore();
  assert.strictEqual(D.fuelPriceRef.pertalite, undefined);
  assert.strictEqual(D.fuelPriceRef.solar, undefined);
  assert.deepStrictEqual(D.fuelPriceRef.refSources, {});
});

test('S256AO: data yang sudah ada tidak ditimpa', () => {
  const D = { fuelPriceRef: { pertalite: 10000, lastType: 'pertalite', lastTypeByVehicle: { a: 'solar' }, refSources: { pertalite: { source: 'x' } } } };
  const { api } = load(D);
  api.onSelectChange('sel', null, 'veh_2');
  assert.strictEqual(D.fuelPriceRef.pertalite, 10000);
  assert.strictEqual(D.fuelPriceRef.lastTypeByVehicle.a, 'solar');
  assert.strictEqual(D.fuelPriceRef.lastTypeByVehicle.veh_2, 'pertamax');
});
