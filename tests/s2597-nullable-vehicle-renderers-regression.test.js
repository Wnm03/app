'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
test('S2597: service reminder safely labels missing/invalid KM and interval', () => {
 const s=read('modules/vehicle/servis-b.js');
 assert.match(s,/const sisaKmLabel=sisa===null\?'Interval belum ditetapkan':sisa\.toLocaleString\('id-ID'\)/);
 assert.match(s,/sisa===null\?'Interval belum ditetapkan'/);
 assert.match(s,/effectiveLastKm==null\|\|effectiveLastKm===''\|\|!Number\.isFinite\(Number\(effectiveLastKm\)\)/);
 assert.match(s,/r\.lastKm==null\|\|r\.lastKm===''\|\|!Number\.isFinite\(Number\(r\.lastKm\)\)/);
});
test('S2597: fuel monthly insight validates numeric values before formatting',()=>{const s=read('modules/vehicle/fuel-insight-engine.js');assert.match(s,/actual\.ok && Number\.isFinite\(Number\(actual\.totalCost\)\)/);assert.match(s,/actual\.averagePrice != null/);});
test('S2597: sparepart usage history validates KM before formatting',()=>{const s=read('modules/vehicle/sparepart-servis-ui.js');assert.match(s,/h\.km!=null&&h\.km!==''&&Number\.isFinite\(Number\(h\.km\)\)/);});
