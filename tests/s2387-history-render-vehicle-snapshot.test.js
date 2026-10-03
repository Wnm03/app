'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../modules/vehicle/servis.js'), 'utf8');

test('S2387: history render creates one vehicle-scoped source view', () => {
  assert.match(source, /const vehicleLogs=\(D\.servisLogs\|\|\[\]\)\.filter\(x=>x&&String\(x\.vehicleId\)===vehicleKey\);/);
});

test('S2387: session options reuse the vehicle-scoped view', () => {
  assert.match(source, /const sessions=\[\.\.\.new Map\(vehicleLogs\.filter\(x=>x\.sessionId\|\|x\.serviceJobId\)/);
});

test('S2387: component options preserve the optional session filter over the same vehicle view', () => {
  assert.match(source, /const componentSourceRows=Servis\.serviceHistorySessionFilter\?vehicleLogs\.filter\(x=>String\(x\.sessionId\|\|x\.serviceJobId\|\|'\'\)===String\(Servis\.serviceHistorySessionFilter\)\):vehicleLogs;/);
  assert.match(source, /const componentIds=\[\.\.\.new Set\(componentSourceRows\.flatMap\(/);
});

test('S2387: history rows reuse the vehicle-scoped view', () => {
  assert.match(source, /const history=vehicleLogs\.filter\(log=>\{\s*const sid=String\(log\.sessionId\|\|log\.serviceJobId\|\|'\'\);/);
});

test('S2387: render optimization does not reassign or mutate persisted service logs', () => {
  const start = source.indexOf('renderEditHistoryTab(){');
  const end = source.indexOf('\n},', start);
  const block = source.slice(start, end < 0 ? start + 12000 : end);
  assert.doesNotMatch(block, /D\.servisLogs\s*=|D\.servisLogs\.splice\(|D\.servisLogs\.push\(/);
});
