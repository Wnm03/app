'use strict';
// tests/sim-jenis-fields-html.test.js — cakupan merge sesi339 (SIM per-jenis
// fields: KIR utk B1/B2, CC motor utk C/C1/C2) ke branch sesi344d.
//
// simJenisFieldsHtml(jenis, s) — PURE (tidak sentuh DOM), dites langsung di
// sini. Wiring DOM (onSimJenisChange/openSimModal/saveSim) sudah dicakup
// smoke-test manual, bukan ranah test murni-logika ini.

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFunction } = require('./helpers/loadSource');

const simJenisFieldsHtml = extractFunction('modules/vehicle/vehicle-core.js', 'simJenisFieldsHtml');

test('simJenisFieldsHtml() — SIM B1/B2 menampilkan field Tanggal Uji KIR', () => {
  const htmlB1 = simJenisFieldsHtml('SIM B1', {});
  const htmlB2 = simJenisFieldsHtml('SIM B2', { kirTanggal: '2027-01-01' });
  assert.match(htmlB1, /simKirTgl/);
  assert.match(htmlB1, /Uji KIR/);
  assert.match(htmlB2, /2027-01-01/);
});

test('simJenisFieldsHtml() — SIM C/C1/C2 menampilkan field Kapasitas CC Motor', () => {
  const htmlC = simJenisFieldsHtml('SIM C', {});
  const htmlC1 = simJenisFieldsHtml('SIM C1', {});
  const htmlC2 = simJenisFieldsHtml('SIM C2', { motorCc: 250 });
  assert.match(htmlC, /simMotorCc/);
  assert.match(htmlC1, /simMotorCc/);
  assert.match(htmlC2, /value="250"/);
});

test('simJenisFieldsHtml() — SIM A/D tidak punya field tambahan (string kosong)', () => {
  assert.equal(simJenisFieldsHtml('SIM A', {}), '');
  assert.equal(simJenisFieldsHtml('SIM D', {}), '');
});

test('simJenisFieldsHtml() — aman dipanggil tanpa argumen kedua (s undefined)', () => {
  assert.doesNotThrow(() => simJenisFieldsHtml('SIM B1'));
  assert.doesNotThrow(() => simJenisFieldsHtml('SIM C'));
});
