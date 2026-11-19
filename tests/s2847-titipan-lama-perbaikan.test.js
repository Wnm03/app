'use strict';
// S2847 — perbaiki penanda titipan pada pembayaran tagihan lama (preview + terapkan); transaksi biasa tidak disentuh.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

const ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', owners: [{ ownerId: 'SELF', porsi: 100, ownerName: 'Milik Sendiri', isSelf: true }] },
  { id: 'acc_bri', name: 'BRI', owners: [{ ownerId: 'H', porsi: 100, ownerName: 'home in', isSelf: false }] },
  { id: 'acc_multi', name: 'Multi', owners: [{ ownerId: 'R', porsi: 60, ownerName: 'renov', isSelf: false }, { ownerId: 'H', porsi: 40, ownerName: 'home in', isSelf: false }] },
  { id: 'acc_plain', name: 'Plain' },
];

function mkCtx(bills, extra) {
  const D = { accounts: ACCOUNTS, bills, billsArchive: [], transactions: [], renovProjects: [] };
  const owners = (accId) => {
    const a = ACCOUNTS.find((x) => x.id === accId);
    return a && Array.isArray(a.owners) ? a.owners.filter((o) => o && o.ownerId) : [];
  };
  return loadSource(['modules/finance/tx-renov.js', 'modules/finance/tagihan-kalender.js'], {
    D,
    getAccOwnersRaw: (accId) => ({ ok: true, owners: owners(accId) }),
    sameId: (a, b) => String(a) === String(b),
    escapeHtml: (x) => String(x),
    MONTHS_FULL: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    fmt: (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'),
    ...extra,
  });
}
const bill = (id, name, amount, accountId, extra) => ({ id, name, amount, accountId, kind: 'tagihan', freq: 'bulanan', nextDue: '2026-12-05', ...extra });
function tx(id, accountId, billLinkId, extra) { return { id, type: 'expense', amount: 1000 * id, accountId, billLinkId, date: '2026-11-10', category: 'Tagihan', ...extra }; }
function setup() {
  const bills = [bill('b1', 'wallpanel', 212000, 'acc_bri'), bill('b2', 'wifi', 50000, 'acc_cash'), bill('b3', 'multi', 70000, 'acc_multi', { deductionOwnerId: 'R' })];
  const c = mkCtx(bills, { save: () => { c.__saved = (c.__saved || 0) + 1; } });
  c.D.billsArchive = [bill('b4', 'arsip', 5000, 'acc_bri')];
  c.D.transactions = [
    tx(1, 'acc_bri', 'b1'),                              // akun 1 pemilik non-SELF -> fix (home in)
    tx(2, 'acc_cash', 'b2'),                             // pribadi -> tidak
    tx(3, 'acc_multi', 'b3'),                            // pemilik tersimpan di tagihan R -> fix (renov)
    tx(4, 'acc_bri', 'b4'),                              // tagihan arsip -> fix
    tx(5, 'acc_bri', 'b1', { deductionOwnerId: 'H' }),   // sudah bertanda -> tidak
    { id: 6, type: 'expense', amount: 6000, accountId: 'acc_bri', date: '2026-11-10', category: 'Makan' }, // bukan tagihan -> tidak
    tx(7, 'acc_bri', 'b1', { renovProjectLinkId: 'p1' }), // tx proyek -> bukan urusan sini
    tx(8, 'acc_bri', 'hilang'),                          // tagihan tak ditemukan, akun 1 pemilik -> fix
  ];
  c.FinanceTxSOT = { patchMetaById: (id, patch) => { const t = c.D.transactions.find((x) => x.id === id); Object.assign(t, patch); return t; } };
  return c;
}
test('titipanLamaAudit: hanya pembayaran tagihan tanpa penanda dengan pemilik jelas', () => {
  const c = setup();
  const r = c.titipanLamaAudit();
  assert.deepEqual(JSON.parse(JSON.stringify(r.map((x) => [x.txId, x.ownerId]).sort((a, b) => a[0] - b[0]))), [[1, 'H'], [3, 'R'], [4, 'H'], [8, 'H']]);
});
test('titipanLamaRingkas: per pemilik, identitas tidak digabung', () => {
  const c = setup();
  const s = c.titipanLamaRingkas();
  assert.equal(s.count, 4);
  assert.equal(s.total, 1000 + 3000 + 4000 + 8000);
  assert.deepEqual(JSON.parse(JSON.stringify(s.owners.map((o) => o.ownerName).sort())), ['home in', 'renov']);
});
test('titipanLamaRepair: menulis deductionOwnerId, menyimpan, idempoten; tx lain tidak berubah', () => {
  const c = setup();
  const r1 = c.titipanLamaRepair();
  assert.equal(r1.fixed, 4);
  assert.equal(c.__saved, 1);
  assert.equal(c.D.transactions.find((x) => x.id === 2).deductionOwnerId, undefined);
  assert.equal(c.D.transactions.find((x) => x.id === 6).deductionOwnerId, undefined);
  assert.equal(c.D.transactions.find((x) => x.id === 7).deductionOwnerId, undefined);
  assert.equal(c.D.transactions.find((x) => x.id === 3).deductionOwnerId, 'R');
  assert.equal(c.titipanLamaRepair().fixed, 0);
});
