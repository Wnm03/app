'use strict';
// tests/s693-timelinew-target-click-tosource.test.js — cakupan
// TimelineW.render() (modules/asset/aset-misc.js).
//
// S689 sudah mewiring baris "renov" (-> Renov.openDetail) & baris Pensiun
// (-> Pensiun.openSettings), tapi test-nya (timeline-w-cardclick-tosource.
// test.js) SENGAJA tidak diikutkan di ZIP patch S689 sendiri (lihat
// SESSION-NOTE-S689). S693 melanjutkan dengan mewiring baris "target"
// (-> openTargetModal(id), reuse fondasi edit-by-id dari S692). File test
// ini MENGGANTIKAN test S689 yang hilang itu sekaligus menambah cakupan
// S693, supaya ketiga jenis baris (renov/pensiun/target) punya regresi
// dalam SATU file, tidak terpisah lagi antar sesi.
//
// TimelineW.render() baca/tulis DOM (getElementById dst) — pola sama
// dengan tests/s692-target-modal-editbyid.test.js: loadSource() dgn
// `document` fake di-override lewat extraGlobals.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeCard() {
  return {
    id: 'timelineWCard',
    style: {},
    classList: { remove() {}, add() {}, toggle() {} },
    innerHTML: '',
  };
}

function makeCtx({ D, Pensiun, Renov } = {}) {
  const card = makeFakeCard();
  const doc = { getElementById: (id) => (id === 'timelineWCard' ? card : null) };
  const ctx = loadSource(
    [
      'modules/asset/aset-owners.js',
      'modules/asset/aset.js',
      'modules/asset/aset-reports.js',
      'modules/asset/aset-misc.js',
    ],
    {
      document: doc,
      D: D || { targets: [], renovProjects: [], pensiun: {} },
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      applyOneCardCollapsePref: () => {},
      Pensiun,
      Renov,
    },
    ['TimelineW'],
  );
  return { ctx, card };
}

test('TimelineW.render() — baris target-* dapat data-action="openTargetModal" data-args=[id] & class u-pointer (S693)', () => {
  const D = {
    targets: [{ id: 'tgt-abc', name: 'Beli Motor', amount: 10000000, saved: 2000000, emoji: '🎯' }],
    renovProjects: [],
    pensiun: {},
  };
  const { ctx, card } = makeCtx({ D });
  ctx.TimelineW.render();
  assert.match(card.innerHTML, /data-action="openTargetModal"/);
  assert.match(card.innerHTML, /data-args='\["tgt-abc"\]'/);
  assert.match(card.innerHTML, /class=" u-pointer"/);
});

test('TimelineW.render() — beberapa target sekaligus, masing-masing baris dapat data-args id sendiri-sendiri', () => {
  const D = {
    targets: [
      { id: 't1', name: 'Target 1', amount: 1000000, saved: 0, emoji: '🎯' },
      { id: 't2', name: 'Target 2', amount: 2000000, saved: 0, emoji: '🎯' },
    ],
    renovProjects: [],
    pensiun: {},
  };
  const { ctx, card } = makeCtx({ D });
  ctx.TimelineW.render();
  const matches = card.innerHTML.match(/data-action="openTargetModal"/g) || [];
  assert.equal(matches.length, 2, 'harus ada 2 baris clickable, satu per target');
  assert.ok(card.innerHTML.includes("data-args='[\"t1\"]'"));
  assert.ok(card.innerHTML.includes("data-args='[\"t2\"]'"));
});

test('TimelineW.render() — baris renov-* (S689) tetap dapat data-action="Renov.openDetail" setelah S693 (regresi, tidak boleh hilang)', () => {
  const D = { targets: [], renovProjects: [{ id: 'renov1', name: 'Renovasi Dapur' }], pensiun: {} };
  const FakeRenov = {
    totals: (p) => ({ sisa: 5000000 }),
    openDetail: () => {},
  };
  const { ctx, card } = makeCtx({ D, Renov: FakeRenov });
  ctx.TimelineW.render();
  assert.match(card.innerHTML, /data-action="Renov.openDetail"/);
  assert.match(card.innerHTML, /data-args='\["renov1"\]'/);
});

test('TimelineW.render() — baris Pensiun (S689) tetap dapat data-action="Pensiun.openSettings" setelah S693 (regresi, tidak boleh hilang)', () => {
  const D = {
    targets: [],
    renovProjects: [],
    pensiun: { usiaSekarang: 30, usiaPensiun: 55, accId: 'acc1', targetDana: 1000000000 },
  };
  const FakePensiun = {
    avgSurplus: () => ({ surplus: 0, months: 0 }),
    sisaBulan: () => 300,
    proyeksi: () => 500000000,
    openSettings: () => {},
  };
  const { ctx, card } = makeCtx({ D, Pensiun: FakePensiun });
  ctx.TimelineW.render();
  assert.match(card.innerHTML, /data-action="Pensiun.openSettings"/);
});

test('TimelineW.render() — campuran renov + target dalam 1 render, masing-masing dapat data-action & data-args sesuai jenisnya sendiri (tidak tertukar)', () => {
  const D = {
    targets: [{ id: 'tgt-xyz', name: 'Dana Darurat Kedua', amount: 5000000, saved: 1000000, emoji: '💰' }],
    renovProjects: [{ id: 'renov-9', name: 'Renovasi Kamar' }],
    pensiun: {},
  };
  const FakeRenov = { totals: () => ({ sisa: 3000000 }), openDetail: () => {} };
  const { ctx, card } = makeCtx({ D, Renov: FakeRenov });
  ctx.TimelineW.render();
  assert.match(card.innerHTML, /data-action="openTargetModal" data-args='\["tgt-xyz"\]'/);
  assert.match(card.innerHTML, /data-action="Renov.openDetail" data-args='\["renov-9"\]'/);
});
