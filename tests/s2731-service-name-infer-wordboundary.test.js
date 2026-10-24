'use strict';
// S2731 — ServiceInputCatalog.infer() harus mencocokkan per kata/frasa utuh (bukan substring mentah).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const { SERVICE_CHECKLIST_GROUPS } = require(path.join(root, 'modules/vehicle/service-master-data.generated.js'));
const ctx = { SERVICE_CHECKLIST_GROUPS, console }; ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'modules/vehicle/service-input-catalog.js'), 'utf8'), ctx, { filename: 'service-input-catalog.js' });
const id = t => { const r = ctx.ServiceInputCatalog.infer(t); return r && r.item ? r.item.id : null; };

// Bug lama: "kaki" mengandung "aki"; "paking" mengandung "aki".
assert.notEqual(id('Sasis & Kaki-Kaki'), 'aki', 'Kaki-kaki bukan Aki');
assert.notEqual(id('Kaki-kaki'), 'aki');
assert.equal(id('aki'), 'aki', 'exact match menang atas containment');
assert.equal(id('Aki'), 'aki');
assert.equal(id('Aki GTZ6V / MTZ6S'), 'aki', 'frasa utuh "aki" di dalam teks tetap cocok');
// Perilaku yang harus tetap sama.
assert.equal(id('Oli mesin'), 'oli-mesin');
assert.equal(id('Oli Mesin SPX 2'), 'oli-mesin');
assert.equal(id('Filter Udara pembersihan'), 'filter-udara');
assert.equal(id('ban'), 'ban-depan');
assert.equal(id('Paking (Gasket) Knalpot'), 'paking-knalpot');
assert.equal(id('tidak ada komponen ini xyz'), null);
// Hasil cache tetap objek baru per panggilan.
const a = ctx.ServiceInputCatalog.infer('aki'), b = ctx.ServiceInputCatalog.infer('aki');
assert.notEqual(a, b);

// Skrip perbaikan data: idempoten & hanya additive.
const src = fs.readFileSync(path.join(root, 'scripts/fix-backup-service-sot-s2731.js'), 'utf8');
assert.match(src, /sp_component_aki_veh_1/);
assert.doesNotMatch(src, /\.splice\([^)]*,\s*[1-9]\d*\s*\)/, 'skrip tidak boleh menghapus baris');
console.log('S2731 infer word-boundary regression: PASS');
