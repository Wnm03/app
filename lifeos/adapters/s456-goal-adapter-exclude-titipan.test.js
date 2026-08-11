'use strict';
// tests/s456-goal-adapter-exclude-titipan.test.js — Sesi 456: entri utang
// "dana titipan" (linkedAssetId terisi, auto-sync dari
// Aset._syncOwnerDebts()) BUKAN kewajiban yang perlu jadi target Goal --
// lanjutan pola S455 (DebtStrategy.activeDebts()), sekarang di
// goalSourceDebt() (lifeos/adapters/goal-adapter.js), dipakai
// financial-goal-api.js buat kartu "Goals". FIX: exclude titipan supaya
// tidak nongol permanen sbg goal card 0% yg gak pernah selesai.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    debts: [
      { id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false },
      { id: 'd2', name: 'Investor A', nilai: 4000000, lunas: false, jatuhTempo: '', linkedAssetId: 'a1', linkedOwnerId: 'inv1' },
    ],
  };
}

function makeCtx() {
  return loadSource(
    ['lifeos/adapters/goal-adapter.js'],
    {},
    ['goalSourceDebt', 'goalAdapterList'],
  );
}

test('goalSourceDebt() — entri titipan (linkedAssetId) TIDAK ikut, utang biasa tetap ikut', () => {
  const D = makeD();
  const ctx = makeCtx();
  const out = ctx.goalSourceDebt(D);
  assert.equal(out.some((g) => g.sourceId === 'd1'), true, 'utang biasa harus tetap ada');
  assert.equal(out.some((g) => g.sourceId === 'd2'), false, 'entri titipan harus di-exclude');
});

test('goalSourceDebt() — tanpa entri titipan sama sekali, perilaku lama tidak berubah', () => {
  const D = { debts: [{ id: 'd1', name: 'KTA Bank X', nilai: 3000000, lunas: false }] };
  const ctx = makeCtx();
  const out = ctx.goalSourceDebt(D);
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceId, 'd1');
});
