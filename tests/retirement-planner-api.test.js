'use strict';
// tests/retirement-planner-api.test.js — cakupan
// modules/finance/retirement-planner-api.js (RetirementPlannerAPI),
// sebelumnya 0 test file yang menyentuhnya langsung. Pola wrapper +
// derivatif (gapAnalysis = proyeksi-target, retirementRecommendation =
// rule bertingkat configured/hasTarget/onTrack/kontribusi).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx({ D, Pensiun }) {
  const extra = { D: D || {} };
  if (Pensiun !== undefined) extra.Pensiun = Pensiun;
  return loadSource(['modules/finance/retirement-planner-api.js'], extra, ['RetirementPlannerAPI']);
}

const OK_PENSIUN = {
  danaTerkumpul: () => 100000000,
  proyeksi: () => 1200000000,
  sisaBulan: () => 240,
  rekomendasiKontribusi: () => ({ reko: 5000000, surplus: 3000000, months: 240, pct: 0.5 }),
};

function makeD(pensiun) { return { pensiun: pensiun || {} }; }

// --- _overview() ---

test('_overview() -> {ok:false} kalau Pensiun belum dimuat', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD() });
  const r = api._overview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /belum dimuat/);
});

test('_overview() -> {ok:false} kalau Pensiun.danaTerkumpul()/dst throw', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD(), Pensiun: { danaTerkumpul: () => { throw new Error('x'); } } });
  const r = api._overview();
  assert.equal(r.ok, false);
  assert.match(r.reason, /gagal dipanggil/);
});

test('_overview() -> configured:true hanya kalau usiaSekarang & usiaPensiun & accId terisi', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 1000000000, kontribusiBulanan: 2000000 }),
    Pensiun: OK_PENSIUN,
  });
  const r = api._overview();
  assert.equal(r.ok, true);
  assert.equal(r.configured, true);
  assert.equal(r.terkumpul, 100000000);
  assert.equal(r.proyeksi, 1200000000);
  assert.equal(r.target, 1000000000);
});

test('_overview() -> configured:false kalau accId belum diisi (walau usia sudah)', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD({ usiaSekarang: 30, usiaPensiun: 55 }), Pensiun: OK_PENSIUN });
  const r = api._overview();
  assert.equal(r.configured, false);
});

// --- contributionRecommendation() / _contribution() ---

test('contributionRecommendation() -> {ok:false} kalau Pensiun belum dimuat', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD() });
  assert.equal(api.contributionRecommendation().ok, false);
});

test('contributionRecommendation() -> field reko/surplus dibaca apa adanya', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD(), Pensiun: OK_PENSIUN });
  const r = api.contributionRecommendation();
  assert.equal(r.ok, true);
  assert.equal(r.reko, 5000000);
  assert.equal(r.surplus, 3000000);
});

// --- gapAnalysis() ---

test('gapAnalysis() -> hasTarget:false kalau target belum diisi (<=0)', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD({ targetDana: 0 }), Pensiun: OK_PENSIUN });
  const r = api.gapAnalysis();
  assert.equal(r.ok, true);
  assert.equal(r.hasTarget, false);
  assert.equal(r.onTrack, false);
});

test('gapAnalysis() -> onTrack:true kalau proyeksi >= target, gap = proyeksi-target', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD({ targetDana: 1000000000 }), Pensiun: OK_PENSIUN });
  const r = api.gapAnalysis();
  assert.equal(r.hasTarget, true);
  assert.equal(r.onTrack, true);
  assert.equal(r.gap, 200000000); // 1.2M - 1M
});

test('gapAnalysis() -> onTrack:false kalau proyeksi < target', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD({ targetDana: 2000000000 }), Pensiun: OK_PENSIUN });
  const r = api.gapAnalysis();
  assert.equal(r.onTrack, false);
  assert.equal(r.gap, -800000000);
});

test('gapAnalysis() -> {ok:false} diteruskan kalau overview gagal', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD() });
  assert.equal(api.gapAnalysis().ok, false);
});

// --- retirementRecommendation() ---

test('retirementRecommendation() -> [] kalau overview gagal', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD() });
  assert.equal(api.retirementRecommendation().length, 0);
});

test('retirementRecommendation() -> "retire_not_configured" kalau belum configured (berhenti di situ)', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD(), Pensiun: OK_PENSIUN });
  const recs = api.retirementRecommendation();
  assert.equal(recs.length, 1);
  assert.equal(recs[0].code, 'retire_not_configured');
});

test('retirementRecommendation() -> "retire_no_target" kalau configured tapi target belum diisi', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1' }), Pensiun: OK_PENSIUN });
  const recs = api.retirementRecommendation();
  assert.ok(recs.some((r) => r.code === 'retire_no_target'));
});

test('retirementRecommendation() -> "retire_on_track" (positive) kalau proyeksi >= target', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 1000000000, kontribusiBulanan: 6000000 }),
    Pensiun: OK_PENSIUN,
  });
  const recs = api.retirementRecommendation();
  const onTrack = recs.find((r) => r.code === 'retire_on_track');
  assert.equal(onTrack.type, 'positive');
});

test('retirementRecommendation() -> "retire_gap" (warning) kalau proyeksi < target', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 2000000000, kontribusiBulanan: 6000000 }),
    Pensiun: OK_PENSIUN,
  });
  const recs = api.retirementRecommendation();
  const gap = recs.find((r) => r.code === 'retire_gap');
  assert.equal(gap.type, 'warning');
});

test('retirementRecommendation() -> "retire_contribution_below_reko" kalau kontribusi saat ini < rekomendasi', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 1000000000, kontribusiBulanan: 1000000 }),
    Pensiun: OK_PENSIUN, // reko: 5000000 > kontribusiBulanan 1000000
  });
  const recs = api.retirementRecommendation();
  assert.ok(recs.some((r) => r.code === 'retire_contribution_below_reko'));
});

test('retirementRecommendation() -> TIDAK ada "contribution_below_reko" kalau kontribusi sudah >= rekomendasi', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 1000000000, kontribusiBulanan: 9000000 }),
    Pensiun: OK_PENSIUN,
  });
  const recs = api.retirementRecommendation();
  assert.ok(!recs.some((r) => r.code === 'retire_contribution_below_reko'));
});

// --- summary() ---

test('summary() -> ok:true & gabungan ke-4 kalau overview ok', () => {
  const { RetirementPlannerAPI: api } = makeCtx({
    D: makeD({ usiaSekarang: 30, usiaPensiun: 55, accId: 'a1', targetDana: 1000000000, kontribusiBulanan: 6000000 }),
    Pensiun: OK_PENSIUN,
  });
  const r = api.summary();
  assert.equal(r.ok, true);
  assert.equal(r.retirementOverview.terkumpul, 100000000);
  assert.equal(r.gapAnalysis.onTrack, true);
  assert.equal(r.contributionRecommendation.reko, 5000000);
  assert.ok(Array.isArray(r.recommendation));
});

test('summary() -> ok:false kalau Pensiun belum dimuat, recommendation tetap array kosong', () => {
  const { RetirementPlannerAPI: api } = makeCtx({ D: makeD() });
  const r = api.summary();
  assert.equal(r.ok, false);
  assert.equal(r.recommendation.length, 0);
});
