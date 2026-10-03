'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

test('S2342 reuses each Car Notes array fingerprint without changing signature values', () => {
  const ctx = loadSource(['modules/vehicle/car-notes-performance.js'], {}, ['CarNotesPerformance']);
  const makeRows = (prefix) => {
    let calls = 0;
    const row = { toJSON() { calls++; return { id: prefix, value: 7 }; } };
    return { rows: [row], calls: () => calls };
  };
  const services = makeRows('service');
  const bbmLogs = makeRows('fuel');
  const transactions = makeRows('tx');
  const vehicles = makeRows('vehicle');
  const taxRecords = makeRows('tax');
  const rideLogs = makeRows('ride');
  const rides = makeRows('legacy-ride');
  const partsStock = makeRows('part');
  const reminders = makeRows('reminder');
  const result = ctx.CarNotesPerformance.domainSignatures({
    services: services.rows, bbmLogs: bbmLogs.rows, transactions: transactions.rows,
    vehicles: vehicles.rows, taxRecords: taxRecords.rows, rideLogs: rideLogs.rows,
    rides: rides.rows, partsStock: partsStock.rows, reminders: reminders.rows,
  });
  assert.equal(result.service, result.final.split('|')[0]);
  assert.equal(result.fuel, result.final.split('|')[1]);
  assert.equal(result.finance, result.final.split('|')[2]);
  assert.ok(result.tax.startsWith(result.final.split('|')[3] + '|'), 'tax signature keeps vehicle and tax-record fingerprints');
  for (const group of [services, bbmLogs, transactions, vehicles, taxRecords, rideLogs, rides, partsStock, reminders]) {
    assert.equal(group.calls(), 1, 'each source array should be fingerprinted once');
  }
});

test('S2342 preserves the legacy rideLogs-first signature behavior', () => {
  const ctx = loadSource(['modules/vehicle/car-notes-performance.js'], {}, ['CarNotesPerformance']);
  const result = ctx.CarNotesPerformance.domainSignatures({ rideLogs: [], rides: [{ id: 'legacy' }] });
  const expected = ctx.CarNotesPerformance.domainSignatures({ rideLogs: [] }).ride;
  assert.equal(result.ride, expected);
});
