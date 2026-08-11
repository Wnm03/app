'use strict';
// tests/fuel-notif-bridge.test.js — cakupan modules/vehicle/
// fuel-notif-bridge.js (TASK-153, Fuel Notification & Reminder).
// FuelNotifBridge murni MENERJEMAHKAN insight FuelInsightEngine jadi
// {fireKey,title,body,vehicleId} siap tembak notifikasi — FuelInsightEngine
// di-mock lewat extraGlobals (pola sama persis test lain di project ini yang
// mock dependency modul lain), supaya test ini fokus ke logic
// terjemahan+filter+dedup-nya sendiri, bukan ikut nge-test ulang formula
// reserve/efisiensi/risiko/prediksi di FuelInsightEngine (yang sudah
// dites di tests/fuel-insight-engine.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, FuelInsightEngine } = {}) {
  return loadSource(
    ['modules/vehicle/fuel-notif-bridge.js'],
    { D, FuelInsightEngine },
    ['FuelNotifBridge'],
  );
}

function insight(id, priority, extra) {
  return Object.assign({ id, priority, title: id, description: id + ' desc' }, extra || {});
}

test('items() — {} kalau FuelInsightEngine belum dimuat', () => {
  const ctx = makeCtx({ D: { vehicles: [{ id: 'v1' }] } });
  assert.equal(ctx.FuelNotifBridge.items().length, 0);
});

test('items() — 0 kendaraan (D.vehicles kosong/tidak ada) balikin []', () => {
  const ctx = makeCtx({ D: { vehicles: [] }, FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [] }) } });
  assert.equal(ctx.FuelNotifBridge.items().length, 0);
  const ctx2 = makeCtx({ D: {}, FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [] }) } });
  assert.equal(ctx2.FuelNotifBridge.items().length, 0);
});

test('Reserve notification — reserve-fuel CRITICAL ditembak, INFO tidak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctxCritical = makeCtx({
    D,
    FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('reserve-fuel', 'CRITICAL')] }) },
  });
  const resCritical = ctxCritical.FuelNotifBridge.items();
  assert.equal(resCritical.length, 1);
  assert.equal(resCritical[0].fireKey, 'fuel_reserve-fuel_v1');
  assert.equal(resCritical[0].vehicleId, 'v1');
  assert.match(resCritical[0].title, /Cadangan/);
  assert.equal(resCritical[0].body, 'reserve-fuel desc');

  const ctxInfo = makeCtx({
    D,
    FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('reserve-fuel', 'INFO')] }) },
  });
  assert.equal(ctxInfo.FuelNotifBridge.items().length, 0);
});

test('Efficiency warning — fuel-efficiency CRITICAL/HIGH ditembak, MEDIUM/LOW/INFO tidak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  ['CRITICAL', 'HIGH'].forEach((p) => {
    const ctx = makeCtx({
      D,
      FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('fuel-efficiency', p)] }) },
    });
    const res = ctx.FuelNotifBridge.items();
    assert.equal(res.length, 1, 'priority ' + p + ' harus ditembak');
    assert.match(res[0].title, /Efisiensi/);
  });
  ['MEDIUM', 'LOW', 'INFO'].forEach((p) => {
    const ctx = makeCtx({
      D,
      FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('fuel-efficiency', p)] }) },
    });
    assert.equal(ctx.FuelNotifBridge.items().length, 0, 'priority ' + p + ' tidak boleh ditembak');
  });
});

test('Maintenance reminder — maintenance CRITICAL (riskLevel tinggi) ditembak, MEDIUM/LOW tidak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctxCritical = makeCtx({
    D,
    FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('maintenance', 'CRITICAL')] }) },
  });
  const res = ctxCritical.FuelNotifBridge.items();
  assert.equal(res.length, 1);
  assert.match(res[0].title, /Servis/);

  ['MEDIUM', 'LOW'].forEach((p) => {
    const ctx = makeCtx({
      D,
      FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('maintenance', p)] }) },
    });
    assert.equal(ctx.FuelNotifBridge.items().length, 0);
  });
});

test('Prediction reminder — next-refuel CRITICAL/HIGH ditembak, MEDIUM/LOW tidak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  ['CRITICAL', 'HIGH'].forEach((p) => {
    const ctx = makeCtx({
      D,
      FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('next-refuel', p)] }) },
    });
    const res = ctx.FuelNotifBridge.items();
    assert.equal(res.length, 1, 'priority ' + p + ' harus ditembak');
    assert.match(res[0].title, /Isi BBM/);
  });
  ['MEDIUM', 'LOW'].forEach((p) => {
    const ctx = makeCtx({
      D,
      FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('next-refuel', p)] }) },
    });
    assert.equal(ctx.FuelNotifBridge.items().length, 0);
  });
});

test('Insight tipe lain (fuel-consumption/monthly-cost/prediction) tidak pernah ditembak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctx = makeCtx({
    D,
    FuelInsightEngine: {
      getInsights: () => ({
        ok: true,
        insights: [
          insight('fuel-consumption', 'INFO'),
          insight('monthly-cost', 'INFO'),
          insight('prediction', 'INFO'),
        ],
      }),
    },
  });
  assert.equal(ctx.FuelNotifBridge.items().length, 0);
});

test('No duplicate notifications — firedIds memfilter item yang sudah ditembak', () => {
  const D = { vehicles: [{ id: 'v1' }] };
  const ctx = makeCtx({
    D,
    FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('reserve-fuel', 'CRITICAL')] }) },
  });
  const first = ctx.FuelNotifBridge.items(undefined, []);
  assert.equal(first.length, 1);
  const second = ctx.FuelNotifBridge.items(undefined, [first[0].fireKey]);
  assert.equal(second.length, 0);
});

test('Vehicle switch — items() difilter ke 1 kendaraan kalau vehicleId diberikan', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    FuelInsightEngine: {
      getInsights: (vid) => ({ ok: true, insights: [insight('reserve-fuel', 'CRITICAL', { description: 'desc-' + vid })] }),
    },
  });
  const all = ctx.FuelNotifBridge.items();
  assert.equal(all.length, 2);
  const ids = all.map((i) => i.vehicleId).sort();
  assert.equal(ids[0], 'v1');
  assert.equal(ids[1], 'v2');

  const only1 = ctx.FuelNotifBridge.items('v1', []);
  assert.equal(only1.length, 1);
  assert.equal(only1[0].vehicleId, 'v1');
  assert.equal(only1[0].body, 'desc-v1');
});

test('Kendaraan tanpa insight valid (getInsights ok:false) dilewati, tidak menggagalkan kendaraan lain', () => {
  const D = { vehicles: [{ id: 'v1' }, { id: 'v2' }] };
  const ctx = makeCtx({
    D,
    FuelInsightEngine: {
      getInsights: (vid) => (vid === 'v1'
        ? { ok: false, reason: 'Kendaraan tidak ditemukan' }
        : { ok: true, insights: [insight('reserve-fuel', 'CRITICAL')] }),
    },
  });
  const res = ctx.FuelNotifBridge.items();
  assert.equal(res.length, 1);
  assert.equal(res[0].vehicleId, 'v2');
});

test('Kendaraan tanpa id dilewati', () => {
  const D = { vehicles: [{ name: 'no id' }, { id: 'v1' }] };
  const ctx = makeCtx({
    D,
    FuelInsightEngine: { getInsights: () => ({ ok: true, insights: [insight('reserve-fuel', 'CRITICAL')] }) },
  });
  const res = ctx.FuelNotifBridge.items();
  assert.equal(res.length, 1);
  assert.equal(res[0].vehicleId, 'v1');
});
