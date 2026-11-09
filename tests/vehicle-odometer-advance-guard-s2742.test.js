'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ askConfirm = async () => true, today = '2026-11-08' } = {}) {
  // Bekukan jam sandbox: getProactiveReminders() memakai `new Date()` lokal, jadi tes
  // tidak boleh bergantung pada tanggal nyata saat dijalankan.
  const fixedMs = new Date(today + 'T12:00:00').getTime();
  const FrozenDate = class extends Date {
    constructor(...args) { if (args.length) super(...args); else super(fixedMs); }
    static now() { return fixedMs; }
  };
  const D = {
    vehicles: [{ id: 'v1', name: 'Vario 125' }],
    kmLogs: [{ id: 'k1', vehicleId: 'v1', date: '2026-11-01', km: 1000 }],
    bbmLogs: [{ id: 'b1', vehicleId: 'v1', date: '2026-11-03', km: 1100 }],
    servisLogs: [{ id: 's1', vehicleId: 'v1', date: '2026-11-04', km: 1200 }],
    bills: [], simList: [], eduFunds: [], transactions: [], assets: [],
  };
  const ctx = loadSource(['modules/vehicle/vehicle-core.js'], {
    D, askConfirm, VEHTAX_ITEMS: {}, Date: FrozenDate, now: new Date(today + 'T12:00:00'),
    daysUntilDate: () => null, fmtFull: String, dateToISO: d => d.toISOString().slice(0, 10),
    totalSaldoAkun: () => 0, totalDebtValue: () => 0, totalCicilanOutstanding: () => 0,
    curVehicleId: 'v1',
  }, ['confirmVehicleOdometerAdvance', 'getLatestVehicleOdometerBefore', 'getProactiveReminders']);
  return { ctx, D };
}

test('shared odometer guard: >500 km prompts against latest dated reading across BBM/service/manual', async () => {
  let prompts = 0;
  const { ctx } = makeCtx({ askConfirm: async () => { prompts++; return true; } });
  const result = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-05', km: 1801, source: 'BBM' });
  assert.equal(prompts, 1);
  assert.equal(result.ok, true);
  assert.equal(result.previousKm, 1200);
  assert.equal(result.jump, 601);
});

test('shared odometer guard: <=500 km does not prompt', async () => {
  let prompts = 0;
  const { ctx } = makeCtx({ askConfirm: async () => { prompts++; return true; } });
  const result = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-05', km: 1700 });
  assert.equal(prompts, 0);
  assert.equal(result.ok, true);
  assert.equal(result.jump, 500);
});

test('shared odometer guard: reject confirmation leaves caller free to abort before mutation', async () => {
  const { ctx } = makeCtx({ askConfirm: async () => false });
  const result = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-05', km: 1801 });
  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true);
  assert.equal(result.previousKm, 1200);
});

test('shared odometer guard: excludes edited record and respects the next chronological reading', async () => {
  let prompts = 0;
  const { ctx } = makeCtx({ askConfirm: async () => { prompts++; return true; } });
  const result = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-02', km: 1050, excludeId: 'b1' });
  assert.equal(prompts, 0);
  assert.equal(result.ok, true);
  assert.equal(result.previousKm, 1000);
});

test('shared odometer guard: backdated reading cannot exceed a later cross-domain odometer', async () => {
  const { ctx } = makeCtx({ askConfirm: async () => true });
  const result = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-02', km: 1250 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /melebihi catatan sesudahnya/);
});

test('proactive reminder includes vehicle KM refresh when latest reading is at least 7 days old', () => {
  const { ctx, D } = makeCtx({ today: '2026-11-08' });
  D.servisLogs[0].date = '2026-10-31';
  D.servisLogs[0].km = 1200;
  D.bbmLogs[0].date = '2026-10-30';
  D.kmLogs[0].date = '2026-10-29';
  const items = ctx.getProactiveReminders();
  assert.ok(items.some(x => x.includes('Perbarui KM Vario 125') && x.includes('8 hari lalu')));
});

test('transaction BBM route: declined KM confirmation aborts before creating a BBM log', async () => {
  const values = {
    txSyncBbm: { checked: true }, txBbmPanel: { style: { display: 'block' } },
    txBbmKm: { value: '1801' }, txBbmLiter: { value: '2' }, txBbmHargaL: { value: '10000' },
    txBbmSpbu: { value: 'SPBU' }, txBbmFull: { checked: false },
    txBbmVehicle: { value: 'v1' }, txBbmJenis: { value: 'Pertalite' },
  };
  const { loadSource } = require('./helpers/loadSource');
  const D = { bbmLogs: [{ id: 'b1', vehicleId: 'v1', date: '2026-11-04', km: 1200 }], vehicles: [{ id: 'v1' }] };
  const ctx = loadSource(['modules/finance/tx-bbm.js'], {
    D, document: { getElementById: id => values[id] || null },
    confirmVehicleOdometerAdvance: async () => ({ ok: false, cancelled: true }),
    toast() {},
  }, ['applyTxBbmFromTx']);
  const result = await ctx.applyTxBbmFromTx('tx1', 20000, '2026-11-05', 'acc1', '', null);
  assert.equal(result, false);
  assert.equal(D.bbmLogs.length, 1);
});

test('same-day odometer entries use conservative non-decreasing KM ordering', async () => {
  const { ctx, D } = makeCtx({ askConfirm: async () => true });
  D.bbmLogs.push({ id: 'b-same-day', vehicleId: 'v1', date: '2026-11-05', km: 1300 });
  const lower = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-05', km: 1299, source: 'BBM' });
  assert.equal(lower.ok, false);
  assert.match(lower.reason, /lebih rendah/);
  const higher = await ctx.confirmVehicleOdometerAdvance({ vehicleId: 'v1', date: '2026-11-05', km: 1301, source: 'BBM' });
  assert.equal(higher.ok, true);
});
