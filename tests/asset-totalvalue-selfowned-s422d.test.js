'use strict';
// tests/asset-totalvalue-selfowned-s422d.test.js — Sesi 422d (fix #3, lanjutan
// s422c): Aset.totalValue() untuk ASET MULTI-OWNER (owners[] via
// MultiOwnerEngine, beda dari field `ownership` legacy S193).
//
// RULE yang dites di sini:
//   - Aset single-owner (mayoritas/legacy, tanpa `owners[]`) -> tetap dijumlah
//     PENUH (a.nilai), 0 regresi (sama seperti sebelum sesi ini).
//   - Aset multi-owner -> HANYA porsi SELF (MultiOwnerEngine.selfOwnedValue())
//     yang ikut dijumlah, BUKAN a.nilai penuh (dulu overstate Kekayaan Bersih).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s) },
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset']
  );
}

test('Aset.totalValue() — aset single-owner tetap dijumlah penuh (0 regresi)', () => {
  const D = {
    assets: [{ id: 'a1', name: 'Tanah Warisan', jenis: 'Tanah', nilai: 500000000 }],
    accounts: [],
    transactions: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.Aset.totalValue(), 500000000);
});

test('Aset.totalValue() — aset multi-owner: HANYA porsi SELF yang dijumlah', () => {
  const D = {
    assets: [{
      id: 'as1', name: 'Ruko Patungan', jenis: 'Rumah/Bangunan', nilai: 1000000000,
      owners: [
        { ownerId: 'SELF', porsi: 60 },
        { ownerId: 'investor-budi', porsi: 40, ownerName: 'Budi' },
      ],
    }],
    accounts: [],
    transactions: [],
  };
  const ctx = makeCtx(D);
  // 1000000000 * 60% = 600000000 (bukan 1000000000 penuh)
  assert.equal(ctx.Aset.totalValue(), 600000000);
});

test('Aset.totalValue() — campuran aset single-owner + multi-owner + non-SELF (ownership legacy)', () => {
  const D = {
    assets: [
      { id: 'a1', name: 'Tanah Sendiri', jenis: 'Tanah', nilai: 500000000 },
      {
        id: 'as1', name: 'Ruko Patungan', jenis: 'Rumah/Bangunan', nilai: 1000000000,
        owners: [
          { ownerId: 'SELF', porsi: 60 },
          { ownerId: 'investor-budi', porsi: 40, ownerName: 'Budi' },
        ],
      },
      { id: 'a3', name: 'Emas Titipan Customer', jenis: 'Emas/Logam Mulia', nilai: 50000000, ownership: 'CUSTOMER' },
    ],
    accounts: [],
    transactions: [],
  };
  const ctx = makeCtx(D);
  // 500000000 (Tanah Sendiri) + 600000000 (60% Ruko Patungan) = 1100000000
  // Emas Titipan Customer (ownership legacy non-SELF) tetap dikecualikan total (S193, 0 regresi)
  assert.equal(ctx.Aset.totalValue(), 1100000000);
});

test('Aset.totalValue() — kalau MultiOwnerEngine tidak dimuat, fallback a.nilai penuh (0 regresi)', () => {
  const D = {
    assets: [{
      id: 'as1', name: 'Ruko Patungan', jenis: 'Rumah/Bangunan', nilai: 1000000000,
      owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'investor-budi', porsi: 40 }],
    }],
    accounts: [],
    transactions: [],
  };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/asset/aset.js'],
    { D, escapeHtml: (s) => String(s) },
    ['OwnershipEngine', 'Aset']
  );
  assert.equal(ctx.Aset.totalValue(), 1000000000);
});
