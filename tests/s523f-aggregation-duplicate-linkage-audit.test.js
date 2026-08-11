'use strict';
// tests/s523f-aggregation-duplicate-linkage-audit.test.js — S523-F
// (Aggregation / Nominal Audit, BUG-09 commitment/allocation anomaly,
// BUG-10 duplicate aggregation).
//
// Target: `DanaTitipanPortfolioAPI.build()`
// (modules/finance/dana-titipan-portfolio-presenter.js) — this file adds
// ONLY regression coverage for behavior already proven to exist in the
// source (deterministic dataset A-E from the S523-F audit). 0 production
// code changed; this is read-only verification.
//
// Dataset:
//   A. 1 owner + 1 commitment + 1 allocation (single holding)
//   B. 1 owner + 1 commitment + several allocations (multiple holdings)
//   C. duplicate linkage attempts (same ownerId twice in one holding's
//      owners[]; saveCommitment() called twice for the same ownerId)
//   D. nilai (value) 0
//   E. boundary: allocatedPrincipal === principalAmount exactly

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js'],
    { D, uid: () => 'u' + (D._n = (D._n || 0) + 1), save: () => {}, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n) },
    ['Investment', 'OwnershipEngine', 'MultiOwnerEngine', 'DanaTitipanPortfolioAPI'],
  );
}

function baseD(investments, titipanCommitments) {
  return { investments, investmentTx: [], investmentWatchlist: [], debts: [], accounts: [], transactions: [], titipanCommitments: titipanCommitments || [] };
}

test('A. 1 owner + 1 commitment + 1 allocation: allocatedPrincipal dan principalAmount masing-masing dihitung tepat satu kali', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 }],
  );
  const p = makeCtx(D).DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const budi = p.owners[0];
  assert.equal(budi.allocatedPrincipal, 800000); // 100*8000, exactly once
  assert.equal(budi.principalAmount, 1000000);
  assert.equal(budi.estimatedUnallocated, 200000);
  assert.equal(p.totals.allocatedPrincipalTotal, 800000);
  assert.equal(p.totals.principalAmountTotal, 1000000);
  assert.equal(p.totals.estimatedUnallocatedTotal, 200000);
});

test('B. 1 owner + 1 commitment + beberapa allocation: setiap holding masuk agregasi sekali, tidak ada holding yang dihitung dua kali', () => {
  const D = baseD(
    [
      { id: 'h1', name: 'BBCA', unit: 100, avgPrice: 8000, currentPrice: 9000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
      { id: 'h2', name: 'Emas', unit: 10, avgPrice: 1000000, currentPrice: 1100000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 15000000 }],
  );
  const p = makeCtx(D).DanaTitipanPortfolioAPI.build();
  const budi = p.owners[0];
  assert.equal(budi.holdings.length, 2); // exactly 2 linkages, no duplicate row
  assert.equal(budi.allocatedPrincipal, 800000 + 10000000);
  assert.equal(p.totals.allocatedPrincipalTotal, 800000 + 10000000);
  assert.equal(p.totals.estimatedUnallocatedTotal, 15000000 - (800000 + 10000000));
});

test('C1. duplicate ownerId dalam satu holding owners[]: ditolak validateOwners() via splitByPorsi, holding di-skip (bukan double-count)', () => {
  const D = baseD(
    [{
      id: 'h1', name: 'Reksadana X', unit: 1000, avgPrice: 1000, currentPrice: 1000,
      owners: [
        { ownerId: 'budi', porsi: 50, ownerName: 'Budi', isSelf: false },
        { ownerId: 'budi', porsi: 50, ownerName: 'Budi (dup)', isSelf: false }, // duplicate ownerId, same holding
      ],
    }],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 5000000 }],
  );
  const ctx = makeCtx(D);
  // Confirm the write-path guard itself rejects this list directly.
  const v = ctx.MultiOwnerEngine.validateOwners(D.investments[0].owners);
  assert.equal(v.ok, false);
  assert.match(v.reason, /duplikat/);
  // build() must not crash and must not double-count the rejected holding:
  // owner still appears (from the commitment union) but with 0 allocation.
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.owners.length, 1);
  const budi = p.owners[0];
  assert.equal(budi.holdings.length, 0);
  assert.equal(budi.allocatedPrincipal, 0);
  assert.equal(p.totals.allocatedPrincipalTotal, 0);
});

test('C2. saveCommitment() dipanggil dua kali utk ownerId sama: upsert, bukan menambah dua record/menjumlah dua kali', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 10, avgPrice: 8000, currentPrice: 8000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] }],
    [],
  );
  const ctx = makeCtx(D);
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 });
  ctx.DanaTitipanPortfolioAPI.saveCommitment({ ownerId: 'budi', ownerName: 'Budi', principalAmount: 3000000 }); // re-save same owner
  assert.equal(D.titipanCommitments.length, 1); // upsert, not appended as a 2nd record
  const p = ctx.DanaTitipanPortfolioAPI.build();
  assert.equal(p.totals.principalAmountTotal, 3000000); // latest value only, not 1M+3M
});

test('D. nilai (allocated/current/principal) 0: tidak menghasilkan NaN/duplikasi, totals tetap 0', () => {
  const D = baseD(
    [{ id: 'h1', name: 'Kosong', unit: 0, avgPrice: 0, currentPrice: 0, owners: [{ ownerId: 'cici', porsi: 100, ownerName: 'Cici', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'cici', ownerName: 'Cici', principalAmount: 0 }],
  );
  const p = makeCtx(D).DanaTitipanPortfolioAPI.build();
  const cici = p.owners[0];
  assert.equal(cici.allocatedPrincipal, 0);
  assert.equal(cici.principalAmount, 0);
  assert.equal(cici.estimatedUnallocated, 0);
  assert.equal(cici.allocationStatus, 'OK');
  assert.equal(p.totals.allocatedPrincipalTotal, 0);
  assert.equal(p.totals.principalAmountTotal, 0);
});

test('E. boundary: allocatedPrincipal === principalAmount persis -> OK, estimatedUnallocated 0 (bukan OVER_ALLOCATED)', () => {
  const D = baseD(
    [{ id: 'h1', name: 'BBCA', unit: 100, avgPrice: 10000, currentPrice: 10000, owners: [{ ownerId: 'dedi', porsi: 100, ownerName: 'Dedi', isSelf: false }] }],
    [{ id: 'c1', ownerId: 'dedi', ownerName: 'Dedi', principalAmount: 1000000 }], // == 100*10000
  );
  const p = makeCtx(D).DanaTitipanPortfolioAPI.build();
  const dedi = p.owners[0];
  assert.equal(dedi.allocatedPrincipal, 1000000);
  assert.equal(dedi.allocationStatus, 'OK');
  assert.equal(dedi.estimatedUnallocated, 0);
  assert.equal(dedi.overAllocatedAmount, 0);
});

test('F. anomaly-shape dataset: owner tanpa commitment (allocatedPrincipal besar) + owner dgn commitment kecil -> Teralokasi total >> Pokok Dikomit total by DESIGN (populasi beda), bukan bug formula', () => {
  const D = baseD(
    [
      // Ayah: has a large holding but NEVER set a titipan commitment (principalAmount stays null for him).
      { id: 'h1', name: 'Saham Besar', unit: 1000, avgPrice: 9000000, currentPrice: 9500000, owners: [{ ownerId: 'ayah', porsi: 100, ownerName: 'Ayah', isSelf: false }] },
      // Budi: small holding, DOES have a commitment.
      { id: 'h2', name: 'Deposito Kecil', unit: 1, avgPrice: 10000, currentPrice: 10000, owners: [{ ownerId: 'budi', porsi: 100, ownerName: 'Budi', isSelf: false }] },
    ],
    [{ id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 10000 }],
  );
  const p = makeCtx(D).DanaTitipanPortfolioAPI.build();
  const ayah = p.owners.find((o) => o.ownerId === 'ayah');
  const budi = p.owners.find((o) => o.ownerId === 'budi');
  assert.equal(ayah.allocationStatus, 'PRINCIPAL_NOT_SET');
  assert.equal(ayah.principalAmount, null);
  assert.equal(ayah.estimatedUnallocated, null);
  // allocatedPrincipalTotal includes Ayah's huge holding (no commitment gate).
  assert.equal(p.totals.allocatedPrincipalTotal, 9000000000 + 10000);
  // principalAmountTotal / estimatedUnallocatedTotal ONLY include owners with
  // a commitment on file (Budi) — this is the documented, intentional
  // behavior (see build() comments), reproducing the reported screenshot
  // shape (Teralokasi >> Pokok Dikomit) WITHOUT any double-counting.
  assert.equal(p.totals.principalAmountTotal, 10000);
  assert.equal(p.totals.estimatedUnallocatedTotal, 0); // Budi's allocation (10000) == his principal (10000)
});
