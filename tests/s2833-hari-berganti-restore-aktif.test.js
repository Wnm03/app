'use strict';
// S2833 — pembaruan harian tidak menyentuh data saat restore aktif (R-04) & juga dipicu pageshow/focus (R-02).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function setup() {
  const state = { today: '2026-11-15' };
  const docL = {}, winL = {};
  const win = { addEventListener: (n, f) => { winL[n] = f; } };
  const D = { accounts: [{ id: 'a1', baseBalance: 0, includeInBalance: true }], transactions: [], assets: [] };
  const calls = { refreshed: 0, saved: 0 };
  const doc = { visibilityState: 'visible', addEventListener: (n, f) => { docL[n] = f; }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const ctx = loadSource(['modules/finance/akun.js'], {
    D, todayStr: () => state.today, document: doc, window: win,
    setTimeout: () => 1, clearTimeout: () => {},
    refreshAfterMutation: () => { calls.refreshed++; },
    syncLinkedAssetNilaiFromAkun: () => 1, save: () => { calls.saved++; },
  });
  return { state, docL, winL, win, calls, ctx };
}

test('S2833: pageshow & focus memicu pengecekan hari berganti', () => {
  const { state, winL, calls } = setup();
  assert.equal(typeof winL.pageshow, 'function');
  assert.equal(typeof winL.focus, 'function');
  winL.focus();
  assert.equal(calls.refreshed, 0);
  state.today = '2026-11-16';
  winL.pageshow();
  assert.equal(calls.refreshed, 1);
  assert.equal(calls.saved, 1);
  winL.focus();
  assert.equal(calls.refreshed, 1);
});

test('S2833: saat restore aktif — tidak refresh/save, dan dicoba ulang setelah restore selesai', () => {
  const { state, docL, win, calls } = setup();
  state.today = '2026-11-16';
  win.__kwRestoreActive = true;
  docL.visibilitychange();
  assert.equal(calls.refreshed, 0);
  assert.equal(calls.saved, 0);
  win.__kwRestoreActive = false;
  docL.visibilitychange();
  assert.equal(calls.refreshed, 1);
  assert.equal(calls.saved, 1);
});

test('S2833: applyRestoredData membungkus core dengan try/finally yang selalu melepas penanda', () => {
  const s = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  const w = s.slice(s.indexOf('async function applyRestoredData(imp){'), s.indexOf('async function _applyRestoredDataCore(imp){'));
  assert.match(w, /__kwRestoreActive=true/);
  assert.match(w, /finally\{/);
  assert.match(w, /_applyRestoredDataCore\(imp\)/);
});

test('S2833: wrapper menolak/rollback tetap melepas penanda (perilaku)', async () => {
  const win = {};
  const ctx = loadSource(['modules/shared/backup-restore.js'], { D: {}, window: win }, ['applyRestoredData']);
  // imp tidak valid -> core menolak/melempar; apa pun hasilnya penanda harus kembali false
  try { await ctx.applyRestoredData(null); } catch (_e) { void _e; }
  assert.notEqual(win.__kwRestoreActive, true);
});
