'use strict';
// tests/ownership-sync-vehicle-s197.test.js — cakupan Sesi 197 (Ownership
// Sync — Family/Dashboard/AI/Insight/Report). Lanjutan langsung dari Sesi
// 196 (tests/ownership-sync-vehicle.test.js — Vehicle/Car Notes/Fuel/
// Servis/Reminder/Dashboard Hub/AI Chat), reuse OwnershipEngine (Sesi 191)
// + isVehicleOwnershipSelf() (vehicle-core.js, Sesi 196) APA ADANYA — 0
// logic ownership baru ditulis sesi ini, cuma nyambungin filter yang sudah
// ada ke 5 titik konsumsi yang BELUM disentuh Sesi 196:
//
//   - Family:    AsetKeluarga.carNotes()      (modules/asset/aset-keluarga.js)
//   - Dashboard: _dashServisSelfVehicles()    (modules/shared/modules-render.js,
//                dipakai renderDashServisVehChips()/renderDashboardServisReminder()
//                — widget Beranda "Reminder Servis", BEDA dari Dashboard Hub/
//                VehicleDashboard yang sudah kefilter transitif sejak S196)
//   - AI:        _aiContextVehicle()          (modules/ai/ai-core.js,
//                context AI Daily Briefing, BEDA dari ai-chat.js yang sudah
//                difilter S196)
//   - Insight:   MobilInsight.compute()       (modules/ai/feature-insights.js,
//                bagian Pajak Kendaraan; bagian SIM SENGAJA TIDAK difilter —
//                bukan entitas kendaraan, tidak punya konsep ownership)
//   - Report:    FuelCompare._vehicles()      (modules/vehicle/fuel-compare.js,
//                satu titik ubah yang otomatis mencakup render()/_rows()/
//                exportFleetJSON()/exportFleetHTML())
//
// RULE yang dites (SAMA PERSIS Sesi 192-196):
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari agregat
//     lintas-kendaraan di atas, TAPI D.vehicles sendiri TIDAK dimutasi/
//     dihapus (histori tetap tersimpan apa adanya).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    vehicles: [
      { id: 'v1', name: 'Vario 125' }, // tanpa ownership -> default SELF
      { id: 'v2', name: 'Beat Street', ownership: 'SELF' },
      { id: 'v3', name: 'Mobil Investor', ownership: 'INVESTOR' },
      { id: 'v4', name: 'Motor Titipan', ownership: 'customer' }, // lowercase
      { id: 'v5', name: 'Mobil Keluarga', ownership: 'FAMILY' },
    ],
    assets: [],
    simList: [],
  };
}

// ------ (1) Family: AsetKeluarga.carNotes() ------

test('AsetKeluarga.carNotes() — jumlahKendaraan HANYA hitung kendaraan ownership SELF (default+eksplisit)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/asset/aset-keluarga.js'],
    { D },
    ['AsetKeluarga'],
  );
  const cn = ctx.AsetKeluarga.carNotes();
  assert.equal(cn.jumlahKendaraan, 2, 'v1 (default SELF) + v2 (SELF) = 2, v3/v4/v5 dikecualikan');
});

test('AsetKeluarga.carNotes() — OwnershipEngine belum dimuat -> semua kendaraan dihitung (fallback SELF)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/asset/aset-keluarga.js'], { D }, ['AsetKeluarga']);
  const cn = ctx.AsetKeluarga.carNotes();
  assert.equal(cn.jumlahKendaraan, 5, 'guard typeof isVehicleOwnershipSelf -> anggap semua SELF');
});

test('AsetKeluarga.carNotes() — D.vehicles TIDAK dimutasi oleh filter ownership', () => {
  const D = makeD();
  const before = JSON.stringify(D.vehicles);
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/asset/aset-keluarga.js'],
    { D },
    ['AsetKeluarga'],
  );
  ctx.AsetKeluarga.carNotes();
  assert.equal(JSON.stringify(D.vehicles), before);
});

// ------ (2) Dashboard: _dashServisSelfVehicles() (modules-render.js) ------

function extractFnSource(src, fnName) {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

function loadDashServisSandbox(D, isVehicleOwnershipSelf) {
  const SRC = fs.readFileSync(
    path.join(__dirname, '..', 'modules', 'shared', 'modules-render.js'),
    'utf8',
  );
  const context = { console, D, isVehicleOwnershipSelf };
  vm.createContext(context);
  const snippet = `${extractFnSource(SRC, '_dashServisSelfVehicles')}\nthis._dashServisSelfVehicles = _dashServisSelfVehicles;`;
  vm.runInContext(snippet, context, { filename: 'dash-servis-self-vehicles-extract.js' });
  return context;
}

test('_dashServisSelfVehicles() — HANYA balikin kendaraan ownership SELF (default+eksplisit)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js'], { D }, ['isVehicleOwnershipSelf']);
  const sandbox = loadDashServisSandbox(D, ctx.isVehicleOwnershipSelf);
  const result = sandbox._dashServisSelfVehicles();
  assert.deepEqual(result.map((v) => v.id), ['v1', 'v2']);
});

test('_dashServisSelfVehicles() — isVehicleOwnershipSelf belum ada -> semua kendaraan (fallback SELF)', () => {
  const D = makeD();
  const sandbox = loadDashServisSandbox(D, undefined);
  const result = sandbox._dashServisSelfVehicles();
  assert.equal(result.length, 5);
});

// ------ (3) AI: _aiContextVehicle() (ai-core.js) ------

function loadAiContextVehicleSandbox(D, isVehicleOwnershipSelf, fuelEfficiency) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'ai', 'ai-core.js'), 'utf8');
  const context = { console, D, isVehicleOwnershipSelf, fuelEfficiency };
  vm.createContext(context);
  const snippet = `${extractFnSource(SRC, '_aiContextVehicle')}\nthis._aiContextVehicle = _aiContextVehicle;`;
  vm.runInContext(snippet, context, { filename: 'ai-context-vehicle-extract.js' });
  return context;
}

test('_aiContextVehicle() — vehicleCount & vehicles[] HANYA mencakup kendaraan ownership SELF', () => {
  const D = makeD();
  const fuelEfficiency = () => ({ ok: true, rpPerKm: 1000, estMonthlyCost: 100000 });
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js'], { D }, ['isVehicleOwnershipSelf']);
  const sandbox = loadAiContextVehicleSandbox(D, ctx.isVehicleOwnershipSelf, fuelEfficiency);
  const result = sandbox._aiContextVehicle();
  assert.equal(result.available, true);
  assert.equal(result.vehicleCount, 2);
  assert.deepEqual(result.vehicles.map((v) => v.id), ['v1', 'v2']);
});

test('_aiContextVehicle() — isVehicleOwnershipSelf belum ada -> semua kendaraan (fallback SELF)', () => {
  const D = makeD();
  const fuelEfficiency = () => ({ ok: true, rpPerKm: 1000, estMonthlyCost: 100000 });
  const sandbox = loadAiContextVehicleSandbox(D, undefined, fuelEfficiency);
  const result = sandbox._aiContextVehicle();
  assert.equal(result.vehicleCount, 5);
});

// ------ (4) Insight: MobilInsight.compute() (feature-insights.js) ------

function makeInsightD(overrides) {
  const soon = new Date(Date.now() + 5 * 86400000).toISOString();
  return Object.assign(
    {
      vehicles: [
        { id: 'v1', name: 'Vario 125', stnkTahunan: soon },
        { id: 'v2', name: 'Mobil Investor', ownership: 'INVESTOR', stnkTahunan: soon },
      ],
      simList: [],
    },
    overrides,
  );
}

function escapeHtml(s) { return String(s); }
function daysUntilDate(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}
const VEHTAX_ITEMS = { stnkTahunan: { label: 'STNK Tahunan', tglKey: 'stnkTahunan' } };

test('MobilInsight.compute() — insight pajak HANYA muncul utk kendaraan ownership SELF', () => {
  const D = makeInsightD();
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/ai/feature-insights.js'],
    { D, escapeHtml, daysUntilDate, VEHTAX_ITEMS },
    ['MobilInsight'],
  );
  const items = ctx.MobilInsight.compute();
  assert.equal(items.length, 1);
  assert.match(items[0].id, /^mobil-tax-v1-/);
});

test('MobilInsight.compute() — OwnershipEngine belum dimuat -> semua kendaraan diproses (fallback SELF)', () => {
  const D = makeInsightD();
  const ctx = loadSource(
    ['modules/ai/feature-insights.js'],
    { D, escapeHtml, daysUntilDate, VEHTAX_ITEMS },
    ['MobilInsight'],
  );
  const items = ctx.MobilInsight.compute();
  assert.equal(items.length, 2);
});

// ------ (5) Report: FuelCompare._vehicles() (fuel-compare.js) ------

test('FuelCompare._vehicles() — HANYA balikin kendaraan ownership SELF', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/fuel-compare.js'],
    { D },
    ['FuelCompare'],
  );
  assert.deepEqual(ctx.FuelCompare._vehicles().map((v) => v.id), ['v1', 'v2']);
});

test('FuelCompare._vehicles() — isVehicleOwnershipSelf belum ada -> semua kendaraan (fallback SELF)', () => {
  const D = makeD();
  const ctx = loadSource(['modules/vehicle/fuel-compare.js'], { D }, ['FuelCompare']);
  assert.equal(ctx.FuelCompare._vehicles().length, 5);
});

test('FuelCompare._vehicles() — D.vehicles TIDAK dimutasi oleh filter ownership', () => {
  const D = makeD();
  const before = JSON.stringify(D.vehicles);
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/vehicle/vehicle-core.js', 'modules/vehicle/fuel-compare.js'],
    { D },
    ['FuelCompare'],
  );
  ctx.FuelCompare._vehicles();
  assert.equal(JSON.stringify(D.vehicles), before);
});
