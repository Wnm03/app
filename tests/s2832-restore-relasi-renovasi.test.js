'use strict';
// S2832 — restore parsial meminta konfirmasi (R-05) & relasi Renovasi↔transaksi pasca-restore dilaporkan tanpa mengubah data (R-06).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

function ctxFor(D, extra) {
  return loadSource(['modules/shared/backup-restore.js'], { D, ...(extra || {}) }, ['_restoreRenovPartialRisk', '_restoreRenovRelationIssues']);
}

test('S2832: _restoreRenovPartialRisk — hanya transaksi / hanya renov bila sisi lain ada di data saat ini', () => {
  const c = ctxFor({});
  const cur = { transactions: [{ id: 1 }], renovProjects: [{ id: 7, items: [] }] };
  assert.equal(c._restoreRenovPartialRisk({ transactions: [] }, cur), true);
  assert.equal(c._restoreRenovPartialRisk({ renovProjects: [] }, cur), true);
  assert.equal(c._restoreRenovPartialRisk({ transactions: [], renovProjects: [] }, cur), false);
  assert.equal(c._restoreRenovPartialRisk({ accounts: [] }, cur), false);
  assert.equal(c._restoreRenovPartialRisk({ transactions: [] }, { transactions: [], renovProjects: [] }), false);
  assert.equal(c._restoreRenovPartialRisk({ renovProjects: [] }, { transactions: [], renovProjects: [] }), false);
});

test('S2832: _restoreRenovRelationIssues — hanya payment-yatim/proyek-hilang, data tidak berubah', () => {
  const D = { transactions: [{ id: 2, type: 'expense', renovProjectLinkId: 99 }], accounts: [], renovProjects: [{ id: 7, items: [{ id: 1, harga: 10, payments: [{ id: 'p', txId: 5, amount: 10 }] }] }] };
  const before = JSON.stringify(D);
  const c = ctxFor(D, {
    sameId: (a, b) => String(a) === String(b),
    renovMarkerAudit: () => [{ kind: 'payment-yatim', txId: 5 }, { kind: 'proyek-hilang', txId: 2 }, { kind: 'tanpa-penanggung', txId: 3 }],
  });
  const r = c._restoreRenovRelationIssues();
  assert.deepEqual(r.map((x) => x.kind), ['payment-yatim', 'proyek-hilang']);
  assert.equal(JSON.stringify(D), before);
  assert.equal(JSON.stringify(ctxFor(D)._restoreRenovRelationIssues()), '[]');
});

test('S2832: sumber — konfirmasi sebelum snapshot & laporan setelah commit, bukan penolakan', () => {
  const s = fs.readFileSync('modules/shared/backup-restore.js', 'utf8');
  const iConf = s.indexOf("__s2013SetStage('partial-renov-check')");
  const iSnap = s.indexOf("__s2013SetStage('snapshot-current-data')");
  const iCommit = s.indexOf('var _restoreAtomicCommitted=true');
  const iRep = s.indexOf('_restoreRenovRelationIssues();', s.indexOf('async function applyRestoredData'));
  assert.ok(iConf > 0 && iConf < iSnap, 'konfirmasi harus sebelum snapshot/mutasi');
  assert.ok(iRep > iCommit, 'laporan harus setelah commit atomik');
  assert.doesNotMatch(s.slice(iRep - 200, iRep + 600), /throw new Error\('Restore dibatalkan: relasi Renovasi/);
});
