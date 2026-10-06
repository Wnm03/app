'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');
const fs = require('fs');

const BACKUP = 'modules/shared/backup-restore.js';
const SHOP = 'modules/business/shop-data-io-api.js';
const OCRB = 'modules/shared/scan-ocr-b.js';
const CATIMPORT = 'modules/vehicle/vehicle-catalog-import.js';

function read(f){ return fs.readFileSync(f,'utf8'); }

test('S1827 export laporan CSV: setiap cell wajib RFC4180-escaped', () => {
  const src = read(BACKUP);
  assert.ok(src.includes('function _reportCsvCell(v)'));
  assert.ok(src.includes('r.map(_reportCsvCell).join(',')'));
});

test('S1827 scan universal: import hanya menerima item tervalidasi dan target akun eksplisit', () => {
  const src = read(OCRB);
  assert.match(src, /validateUniversalScanItem\(it,getOcrMinConfidence\(\)\/100\)/);
  assert.match(src, /targetAccId:fuzzy\?fuzzy\.id:'__new__'/);
  assert.match(src, /const existing=\(it\.targetAccId&&it\.targetAccId!=='__new__'\)/);
  assert.match(src, /D\.accounts\.push\(acc\)/);
});

test('S1827 katalog import: preview/commit melewati VehicleCatalogWriteSOT', () => {
  const src = read(CATIMPORT);
  assert.match(src, /VehicleCatalogWriteSOT\.ensurePart\(data, vehicleId\)/);
  assert.doesNotMatch(src, /VehicleCatalog\.create\(data\)/);
});

test('S1827 audit: import transaksi CSV memakai deterministic importIdempotencyKey dan deduplikasi batch', () => {
  const src = read(BACKUP);
  assert.match(src, /_dedupeImportedTransactions\(imported\)/);
  assert.match(src, /FinanceTxSOT\.createMany|D\.transactions/);
  assert.match(src, /tx\.importIdempotencyKey|_stableImportKey\(type/);
  assert.match(src, /function _dedupeImportedTransactions\(imported\)/);
  assert.match(src, /importIdempotencyKey/);
  assert.match(src, /existingKeys\.has\(key\)\|\|acceptedKeys\.has\(key\)/);
});

test('S1827 audit: Shop JSON export memang subset, bukan full Shop ledger', () => {
  const src = read(SHOP);
  assert.match(src, /exportShopJSON\(\)/);
  assert.match(src, /products:\s*D\.products/);
  assert.match(src, /produsen:\s*D\.produsen/);
  assert.doesNotMatch(src, /cobek:\s*D\.cobek/);
});
