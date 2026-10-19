'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('S2595 FuelHistory._row handles null, numeric-string and zero KM safely', () => {
  const source = fs.readFileSync(path.join(root, 'modules/vehicle/fuel-history.js'), 'utf8');
  const match = source.match(/const FuelHistory = \{[\s\S]*?\n\};/);
  assert.ok(match, 'FuelHistory object exists');
  const sandbox = { document: { getElementById: () => null }, FuelStorage: {}, escapeHtml: s => String(s), fmt: n => String(n), JSON };
  vm.runInNewContext(match[0] + ';this.FuelHistory=FuelHistory;', sandbox);
  const row = b => sandbox.FuelHistory._row(b);
  assert.match(row({id:'a',km:null,cost:1000,date:'2026-10-19'}), /\(km tidak dicatat\)/);
  assert.match(row({id:'b',km:'12345',cost:1000,date:'2026-10-19'}), /12\.345 km/);
  assert.match(row({id:'c',km:0,cost:1000,date:'2026-10-19'}), /0 km/);
});

test('S2595 Car Notes current odometer renderer guards null KM source', () => {
  const source = fs.readFileSync(path.join(root, 'modules/shared/modules-render-b.js'), 'utf8');
  assert.match(source, /const currentKm=kmSrc&&kmSrc\.km!=null&&Number\.isFinite\(Number\(kmSrc\.km\)\)\?Number\(kmSrc\.km\):null/);
  assert.match(source, /currentKm===null\?'— km':currentKm\.toLocaleString\('id-ID'\)\+' km'/);
});


test('S2595 service reminder renderer handles missing effective KM interval', () => {
  const source = fs.readFileSync(path.join(root, 'modules/vehicle/servis-b.js'), 'utf8');
  assert.match(source, /const hasFiniteKmRemaining=sisa!==null&&sisa!==undefined&&sisa!==''&&Number\.isFinite\(Number\(sisa\)\)/);
  assert.match(source, /const kmRemainingLabel=hasFiniteKmRemaining\?/);
  assert.match(source, /'interval belum ditetapkan'/);
  assert.doesNotMatch(source, /`Sisa \${sisa\.toLocaleString\('id-ID'\)} km`/);
  assert.doesNotMatch(source, /`🔔 Sisa \${sisa\.toLocaleString\('id-ID'\)} km`/);
  assert.match(source, /const hasFiniteKmRemaining=sisa!==null&&sisa!==undefined&&sisa!==''&&Number\.isFinite\(Number\(sisa\)\)/);
  assert.match(source, /!hasFiniteKmRemaining\)\?null/);
  assert.doesNotMatch(source, /estimateServiceDateISO\(sisa,kmPerDay\)/);
});
