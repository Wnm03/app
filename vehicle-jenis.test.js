'use strict';
// tests/vehicle-jenis.test.js — cakupan modules/vehicle/vehicle-core.js
// (Sesi 165, dropdown "Jenis Kendaraan" Motor/Mobil/Listrik di modal Kelola
// Kendaraan). Fokus test: vehJenisFieldsHtml() & vehMetaText() (fungsi murni,
// tidak sentuh DOM/D) — pemilihan modal/onVehJenisChange()/saveVehicle()
// (baca document.getElementById) sengaja TIDAK dites di sini sesuai batasan
// loadSource.js (lihat catatan di file itu), cukup diverifikasi manual/
// smoke-test.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx() {
  return loadSource(
    ['modules/vehicle/vehicle-core.js'],
    {},
    ['vehJenisFieldsHtml', 'vehMetaText', 'VEH_JENIS_DEFAULT_INTERVAL']
  );
}

test('vehJenisFieldsHtml() — motor: 1 field interval servis, id vehInterval', () => {
  const ctx = makeCtx();
  const html = ctx.vehJenisFieldsHtml('motor', {});
  assert.match(html, /id="vehInterval"/);
  assert.doesNotMatch(html, /vehOliTransInterval/);
  assert.doesNotMatch(html, /vehBatteryCapacity/);
});

test('vehJenisFieldsHtml() — mobil: 2 field terpisah, oli mesin (vehInterval) & oli transmisi (vehOliTransInterval)', () => {
  const ctx = makeCtx();
  const html = ctx.vehJenisFieldsHtml('mobil', {});
  assert.match(html, /id="vehInterval"/);
  assert.match(html, /id="vehOliTransInterval"/);
  assert.match(html, /Oli Mesin/);
  assert.match(html, /Oli Transmisi/);
});

test('vehJenisFieldsHtml() — listrik: field kapasitas baterai (vehBatteryCapacity), BUKAN interval KM', () => {
  const ctx = makeCtx();
  const html = ctx.vehJenisFieldsHtml('listrik', {});
  assert.match(html, /id="vehBatteryCapacity"/);
  assert.doesNotMatch(html, /id="vehInterval"/);
  assert.doesNotMatch(html, /id="vehOliTransInterval"/);
});

test('vehJenisFieldsHtml() — mengisi ulang value dari data existing (mode edit)', () => {
  const ctx = makeCtx();
  const htmlMobil = ctx.vehJenisFieldsHtml('mobil', { serviceIntervalKm: 5000, oliTransmisiIntervalKm: 25000 });
  assert.match(htmlMobil, /value="5000"/);
  assert.match(htmlMobil, /value="25000"/);
  const htmlListrik = ctx.vehJenisFieldsHtml('listrik', { batteryCapacityKwh: 8.2 });
  assert.match(htmlListrik, /value="8\.2"/);
});

test('VEH_JENIS_DEFAULT_INTERVAL — motor 3000km, mobil 5000km (beda wajar, sinkron modal SIM/Debt pattern default per jenis)', () => {
  const ctx = makeCtx();
  assert.equal(ctx.VEH_JENIS_DEFAULT_INTERVAL.motor, 3000);
  assert.equal(ctx.VEH_JENIS_DEFAULT_INTERVAL.mobil, 5000);
});

test('vehMetaText() — motor: format "Interval servis: X km", fallback 3000 kalau kosong', () => {
  const ctx = makeCtx();
  assert.equal(ctx.vehMetaText({ jenis: 'motor', serviceIntervalKm: 4000 }), 'Interval servis: 4.000 km');
  assert.equal(ctx.vehMetaText({ serviceIntervalKm: 0 }), 'Interval servis: 3.000 km');
});

test('vehMetaText() — mobil: tampilkan oli mesin & oli transmisi terpisah', () => {
  const ctx = makeCtx();
  const text = ctx.vehMetaText({ jenis: 'mobil', serviceIntervalKm: 5000, oliTransmisiIntervalKm: 20000 });
  assert.equal(text, 'Oli mesin: 5.000 km · Oli transmisi: 20.000 km');
});

test('vehMetaText() — mobil tanpa oli transmisi diisi -> "belum diisi" (bukan 0 km / crash)', () => {
  const ctx = makeCtx();
  const text = ctx.vehMetaText({ jenis: 'mobil', serviceIntervalKm: 5000 });
  assert.match(text, /belum diisi/);
});

test('vehMetaText() — listrik: tampilkan kapasitas baterai, bukan interval KM', () => {
  const ctx = makeCtx();
  const text = ctx.vehMetaText({ jenis: 'listrik', batteryCapacityKwh: 5.5 });
  assert.equal(text, 'Kapasitas baterai: 5.5 kWh');
  assert.doesNotMatch(text, /km/);
});

test('vehMetaText() — listrik tanpa kapasitas diisi -> pesan "belum diisi" (bukan crash/NaN)', () => {
  const ctx = makeCtx();
  const text = ctx.vehMetaText({ jenis: 'listrik' });
  assert.match(text, /belum diisi/);
});

test('vehMetaText() — kendaraan lama tanpa field jenis (data pre-KW165) default ke motor', () => {
  const ctx = makeCtx();
  const text = ctx.vehMetaText({ serviceIntervalKm: 3000 });
  assert.equal(text, 'Interval servis: 3.000 km');
});
