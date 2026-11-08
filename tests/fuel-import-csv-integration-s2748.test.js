'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function runImport(D, content) {
  let id = 0;
  const result = { html: '', get innerHTML() { return this.html; }, set innerHTML(value) { this.html = String(value); } };
  class FileReaderStub {
    readAsText() { this.onload({ target: { result: content } }); }
  }
  const ctx = loadSource(['modules/shared/backup-restore.js'], {
    D,
    uid: () => `csv-${++id}`,
    FileReader: FileReaderStub,
    document: { getElementById: key => key === 'carImportResult' ? result : (key === 'carImportVehicle' ? { value: 'v1' } : null) },
    save() {}, toast() {}, escapeHtml: String,
  }, ['importCarData']);
  ctx.importCarData({ target: { files: [{ name: 'fuel.csv' }] } });
  return result;
}

test('CSV BBM import is idempotent across repeated imports', () => {
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }], accounts: [{ id: 'a1' }], bbmLogs: [], servisLogs: [], kmLogs: [], sparepartCats: [] };
  const csv = 'Tanggal,Jenis,Keterangan,Jumlah,KM,Liter\n2026-11-01,BBM,Pertalite,30000,1000,3';
  const first = runImport(D, csv);
  assert.equal(D.bbmLogs.length, 1);
  assert.match(first.html, /1/);
  runImport(D, csv);
  assert.equal(D.bbmLogs.length, 1);
});

test('CSV BBM import rolls back the batch when its odometer conflicts with existing history', () => {
  const existing = { id: 'b-old', vehicleId: 'v1', date: '2026-11-01', km: 1100, liter: 3, cost: 30000 };
  const D = { vehicles: [{ id: 'v1', name: 'Vario' }], accounts: [{ id: 'a1' }], bbmLogs: [existing], servisLogs: [], kmLogs: [], sparepartCats: [] };
  const csv = 'Tanggal,Jenis,Keterangan,Jumlah,KM,Liter\n2026-11-02,BBM,Pertalite,30000,1000,3';
  const result = runImport(D, csv);
  assert.equal(D.bbmLogs.length, 1);
  assert.equal(D.bbmLogs[0].id, 'b-old');
  assert.match(result.html, /integritas odometer/);
});
