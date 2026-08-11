'use strict';
// tests/ownership-settings-presenter.test.js — cakupan Sesi 229-230:
// Settings -> Ownership (modules/shared/ownership-settings-presenter.js).
// WIRE/PRESENTER ONLY — 100% reuse OwnershipEngine.TYPES/label()/
// countByType() (S191), TIDAK ada rumus/engine baru. summary() dites murni
// (tidak sentuh DOM); render() hanya dites lewat guard "container tidak
// ada -> aman diam2", pola sama persis tests/business-flow-presenter.test.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(extra) {
  return Object.assign(
    { accounts: [], assets: [], investments: [], vehicles: [] },
    extra,
  );
}

function makeCtx(D) {
  return loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/ownership-settings-presenter.js',
    ],
    { D, escapeHtml: (s) => String(s) },
    ['OwnershipSettingsPresenter', 'OwnershipEngine'],
  );
}

// --- summary() — agregasi murni --------------------------------------

test('summary() — kosong kalau semua koleksi kosong, semua tipe = 0', () => {
  const ctx = makeCtx(baseD());
  const s = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(s.ok, true);
  assert.equal(s.total, 0);
  assert.deepEqual(
    { ...s.counts },
    { SELF: 0, INVESTOR: 0, CUSTOMER: 0, THIRD_PARTY: 0, FAMILY: 0 },
  );
});

test('summary() — entity tanpa field ownership dianggap SELF (fallback default)', () => {
  const D = baseD({ accounts: [{ id: 'a1' }, { id: 'a2' }] });
  const ctx = makeCtx(D);
  const s = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(s.total, 2);
  assert.equal(s.counts.SELF, 2);
});

test('summary() — gabungkan 4 koleksi (accounts/assets/investments/vehicles), hitung per tipe', () => {
  const D = baseD({
    accounts: [{ id: 'a1', ownership: 'SELF' }, { id: 'a2', ownership: 'investor' }],
    assets: [{ id: 's1', ownership: 'CUSTOMER' }],
    investments: [{ id: 'i1', ownership: 'family' }],
    vehicles: [{ id: 'v1', ownership: 'THIRD_PARTY' }, { id: 'v2' }],
  });
  const ctx = makeCtx(D);
  const s = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(s.total, 6);
  assert.deepEqual(
    { ...s.counts },
    { SELF: 2, INVESTOR: 1, CUSTOMER: 1, THIRD_PARTY: 1, FAMILY: 1 },
  );
});

test('summary() — PURE, dipanggil berulang balikin hasil identik (tidak akumulasi)', () => {
  const D = baseD({ accounts: [{ id: 'a1', ownership: 'INVESTOR' }] });
  const ctx = makeCtx(D);
  const first = ctx.OwnershipSettingsPresenter.summary();
  const second = ctx.OwnershipSettingsPresenter.summary();
  assert.deepEqual({ ...first.counts }, { ...second.counts });
  assert.equal(first.total, second.total);
});

test('summary() — rollback aman kalau OwnershipEngine belum dimuat', () => {
  const ctx = loadSource(
    ['modules/shared/ownership-settings-presenter.js'],
    { D: baseD({ accounts: [{ id: 'a1' }] }), escapeHtml: (s) => String(s) },
    ['OwnershipSettingsPresenter'],
  );
  const s = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(s.ok, false);
});

test('summary() — rollback aman kalau D belum dimuat (typeof D === undefined)', () => {
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/ownership-settings-presenter.js'],
    {},
    ['OwnershipSettingsPresenter'],
  );
  const s = ctx.OwnershipSettingsPresenter.summary();
  assert.equal(s.ok, true);
  assert.equal(s.total, 0);
});

// --- render() — guard DOM, tidak throw --------------------------------

test('render() — tidak throw walau container tidak ada (document stub permisif)', () => {
  const ctx = makeCtx(baseD());
  assert.doesNotThrow(() => ctx.OwnershipSettingsPresenter.render());
});
