'use strict';
// Fixture SINTETIS untuk tes migrasi data S2731/S2732/S2733.
// Tidak berisi data pribadi: semua nilai dibuat-buat. Bila fixture asli data-fix/*.json masih ada di repo
// (mis. di mesin pemilik), fixture asli dipakai seperti sebelumnya; bila tidak, input sintetis dibuat di tmp
// lalu skrip migrasi yang SEBENARNYA dijalankan untuk menghasilkan keluaran yang dites.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DF = f => path.join(ROOT, 'data-fix', f);
const REAL = {
  s2731: 'backup-keluarga-W-2026-10-24-CLEAN-S2730-dedup-S2731-FIXED.json',
  s2732: 'backup-keluarga-W-2026-10-24-CLEAN-S2730-dedup-S2731-FIXED-S2732.json',
  s2733: 'backup-keluarga-W-2026-10-24-CLEAN-S2730-dedup-S2731-FIXED-S2732-S2733.json',
  s2733report: 'laporan-perubahan-S2733.json',
};
let tmp = null;
const dir = () => tmp || (tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-synth-fixture-')));
const run = (script, inp, out, rep) => execFileSync(process.execPath, [path.join(ROOT, 'scripts', script), inp, out].concat(rep ? ['--report', rep] : []), { stdio: 'ignore' });
const write = (name, obj) => { const p = path.join(dir(), name); fs.writeFileSync(p, JSON.stringify(obj)); return p; };
const memo = {};
const once = (k, fn) => memo[k] || (memo[k] = fn());

function s2731Input() {
  const L = (id, item, extra) => Object.assign({ id, vehicleId: 'veh_1', item, date: '2025-01-01', km: 1000, cost: 1000 }, extra);
  return {
    vehicles: [{ id: 'veh_1', sot: { serviceSchedules: [], serviceCategories: [] } }],
    sparepartCats: [],
    servisLogs: [
      L(1783591790532, 'Seal Head', { date: '2025-07-23' }),
      L(1782820344534, 'Gasket Stator Base', { serviceComponentId: 'cylinder-gasket' }),
      L(1782820344535, 'Gasket Stator Base'),
      L(1782820344536, 'Seal Magnet'),
      L(1782820344540, 'Jasa Pasang Stang Laher'),
      L(1782820344612, 'Ban Dalam'),
      L(1783591790515, 'Jasa Overhoul'),
      L(1783591790610, 'Pembersihan Rem'),
    ],
    partsStock: [{ id: 'ps_1', vehicleId: 'veh_1', code: 'AAA-111', name: 'Part A', qty: 2, price: 1000, catId: 'c1' }],
    _vehicleCatalogStore: { items: [{ id: 77, oemCode: '11363KWN900', name: 'Gasket Stator Base' }] },
  };
}
function s2733Input() {
  return {
    vehicles: [{ id: 'veh_1' }],
    servisLogs: [],
    _vehicleCatalogStore: { items: [{ id: 'c1', oemCode: 'XYZ-1' }] },
    partsStock: [
      { id: 'valid_1', vehicleId: 'veh_1', code: 'XYZ-1', name: 'Part X', qty: 3, price: 5000, catId: 'c1', catalogId: 'c1' },
      { id: 'orphan_1', vehicleId: 'veh_1', code: 'xyz 1', name: 'Part X (dup)', qty: 0, price: 4000 },
      { id: 'solo_1', vehicleId: 'veh_1', code: 'QQQ-9', name: 'Part Q', qty: 1, price: 100, catId: 'c1' },
    ],
  };
}

const real = k => fs.existsSync(DF(REAL[k])) ? DF(REAL[k]) : null;
exports.s2731Fixed = () => real('s2731') || once('s2731', () => {
  const out = path.join(dir(), 's2731-fixed.json');
  run('fix-backup-service-sot-s2731.js', write('s2731-in.json', s2731Input()), out); return out;
});
exports.s2732Prev = () => exports.s2731Fixed();
exports.s2732Next = () => real('s2732') || once('s2732', () => {
  const out = path.join(dir(), 's2732.json'); run('link-gasket-stator-base-part-s2732.js', exports.s2731Fixed(), out); return out;
});
exports.s2733Prev = () => real('s2732') || once('s2733prev', () => write('s2733-prev.json', s2733Input()));
exports.s2733Next = () => real('s2733') || once('s2733', () => {
  const out = path.join(dir(), 's2733.json'); run('merge-duplicate-stock-s2733.js', exports.s2733Prev(), out, path.join(dir(), 's2733-report.json')); return out;
});
exports.s2733Report = () => real('s2733report') || (exports.s2733Next(), path.join(dir(), 's2733-report.json'));
exports.isSynthetic = () => !real('s2731');
