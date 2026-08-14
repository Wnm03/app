// tests/titipan-sync.test.js — test TitipanSync (modules/finance/titipan-sync.js).
// Pola sama dgn tests/titipan-reconcile.test.js: node:test + assert, mock
// Aset minimal (reconcile() sesi 10a cuma membungkus Aset._syncOwnerDebts,
// jadi mock di sini hanya perlu meniru KEHADIRAN/KETIADAAN fungsi itu, tidak
// perlu mereplikasi logic sync sungguhan -- itu sudah dites tuntas di
// tests/asset*.test.js yang ada).
const test = require('node:test');
const assert = require('node:assert');
const TitipanSync = require('../modules/finance/titipan-sync.js');

test('reconcile(a) ok=true & memanggil Aset._syncOwnerDebts(a) persis 1x saat tersedia', () => {
  const a = { id: 'a1', nilai: 1000000 };
  let calls = [];
  global.Aset = {
    _syncOwnerDebts(asset) { calls.push(asset); },
  };
  const res = TitipanSync.reconcile(a);
  assert.deepStrictEqual(res, { ok: true, synced: true });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], a); // objek yang sama, bukan copy
  delete global.Aset;
});

test('reconcile(a) tidak melempar & synced=false kalau Aset belum dimuat', () => {
  delete global.Aset;
  const res = TitipanSync.reconcile({ id: 'a2', nilai: 500000 });
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'sync-unavailable' });
});

test('reconcile(a) synced=false kalau Aset ada tapi _syncOwnerDebts bukan fungsi', () => {
  global.Aset = { _syncOwnerDebts: null };
  const res = TitipanSync.reconcile({ id: 'a3', nilai: 500000 });
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'sync-unavailable' });
  delete global.Aset;
});

test('reconcile(a) ok=false kalau a falsy (null) -- 0 panggilan ke Aset', () => {
  let calls = 0;
  global.Aset = { _syncOwnerDebts() { calls++; } };
  const res = TitipanSync.reconcile(null);
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'no-asset' });
  assert.strictEqual(calls, 0);
  delete global.Aset;
});

test('reconcile(a) ok=false kalau a undefined -- 0 panggilan ke Aset', () => {
  let calls = 0;
  global.Aset = { _syncOwnerDebts() { calls++; } };
  const res = TitipanSync.reconcile(undefined);
  assert.deepStrictEqual(res, { ok: false, synced: false, reason: 'no-asset' });
  assert.strictEqual(calls, 0);
  delete global.Aset;
});

test('reconcile(a) meneruskan exception asli dari _syncOwnerDebts (tidak ditelan try/catch)', () => {
  global.Aset = {
    _syncOwnerDebts() { throw new Error('boom dari MultiOwnerEngine.getOwners()'); },
  };
  assert.throws(() => TitipanSync.reconcile({ id: 'a4' }), /boom dari MultiOwnerEngine/);
  delete global.Aset;
});

test('reconcile(a) tidak membaca/menulis field lain di luar apa yang dilakukan _syncOwnerDebts', () => {
  const a = { id: 'a5', nilai: 750000, owners: [{ ownerId: 'o1', isSelf: false, porsi: 20 }] };
  const snapshotBefore = JSON.stringify(a);
  global.Aset = {
    _syncOwnerDebts(asset) { asset.__synced = true; }, // simulasi 1 efek samping asli
  };
  TitipanSync.reconcile(a);
  // reconcile() sendiri 0 mutasi tambahan -- satu-satunya perubahan pada `a`
  // datang dari _syncOwnerDebts() yang dipanggilnya, bukan dari reconcile().
  assert.strictEqual(a.__synced, true);
  delete a.__synced;
  assert.strictEqual(JSON.stringify(a), snapshotBefore);
  delete global.Aset;
});

// --- reconcileAccounts() (Rekomendasi #2, 2026-08-14 sesi lanjutan) ---
// Mock D/MultiOwnerEngine/recalcAccBalance/uid/todayStr minimal, pola sama
// tests/titipan-reconcile.test.js.
function setupAccGlobals({ accounts = [], assets = [], debts = [], ownersByAccount = {}, balanceByAccount = {} }) {
  global.D = { accounts, assets, debts };
  global.MultiOwnerEngine = {
    getOwners(acc) { return { ok: true, owners: ownersByAccount[acc.id] || [] }; },
  };
  global.recalcAccBalance = (accId) => (balanceByAccount[accId] || 0);
  global.uid = (() => { let n = 0; return () => 'uid' + (++n); })();
  global.todayStr = () => '2026-08-14';
}
function cleanupAccGlobals() {
  delete global.D; delete global.MultiOwnerEngine; delete global.recalcAccBalance; delete global.uid; delete global.todayStr;
}

test('reconcileAccounts() no-op {synced:0,removed:0} kalau D/D.accounts belum ada', () => {
  delete global.D;
  const res = TitipanSync.reconcileAccounts();
  assert.deepStrictEqual(res, { synced: 0, removed: 0 });
});

test('reconcileAccounts() no-op kalau recalcAccBalance bukan fungsi', () => {
  global.D = { accounts: [{ id: 'acc1' }], debts: [] };
  delete global.recalcAccBalance;
  const res = TitipanSync.reconcileAccounts();
  assert.deepStrictEqual(res, { synced: 0, removed: 0 });
  cleanupAccGlobals();
});

test('reconcileAccounts() menulis baris Buku Utang baru utk akun berdiri-sendiri berporsi non-SELF', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    debts: [],
    ownersByAccount: { acc1: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 25 }] },
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.synced, 1);
  assert.strictEqual(res.removed, 0);
  assert.strictEqual(D.debts.length, 1);
  const d = D.debts[0];
  assert.strictEqual(d.linkedAccountId, 'acc1');
  assert.strictEqual(d.linkedOwnerId, 'o1');
  assert.strictEqual(d.name, 'Budi');
  assert.strictEqual(d.nilai, 250000); // 1000000 * 25%
  assert.strictEqual(d.catatan, 'Dana titipan akun: BRI');
  cleanupAccGlobals();
});

test('reconcileAccounts() nominal ikut saldo akun real-time (bukan snapshot) -- berubah tiap dipanggil ulang', () => {
  const debts = [];
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    debts,
    ownersByAccount: { acc1: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 50 }] },
    balanceByAccount: { acc1: 1000000 },
  });
  TitipanSync.reconcileAccounts();
  assert.strictEqual(D.debts[0].nilai, 500000);
  global.recalcAccBalance = (accId) => (accId === 'acc1' ? 2000000 : 0); // saldo berubah (mis. transaksi baru)
  TitipanSync.reconcileAccounts();
  assert.strictEqual(D.debts.length, 1); // update baris yang sama, bukan duplikat
  assert.strictEqual(D.debts[0].nilai, 1000000);
  cleanupAccGlobals();
});

test('reconcileAccounts() melewati akun yang tertaut ke Aset (arah Akun->Aset sudah menangani)', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    assets: [{ id: 'a1', accountId: 'acc1' }],
    debts: [],
    ownersByAccount: { acc1: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 25 }] },
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.synced, 0);
  assert.strictEqual(D.debts.length, 0);
  cleanupAccGlobals();
});

test('reconcileAccounts() menghapus baris ketika akun baru saja ditautkan ke Aset', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    assets: [{ id: 'a1', accountId: 'acc1' }], // sudah tertaut sekarang
    debts: [{ id: 'd1', nilai: 250000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }], // sisa dari sesi sebelum ditautkan
    ownersByAccount: { acc1: [{ ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 25 }] },
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.removed, 1);
  assert.strictEqual(D.debts.length, 0);
  cleanupAccGlobals();
});

test('reconcileAccounts() menghapus baris owner yang dicabut (porsi jadi 0 / baris dihapus)', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    debts: [{ id: 'd1', nilai: 250000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }],
    ownersByAccount: { acc1: [] }, // owner sudah dicabut
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.removed, 1);
  assert.strictEqual(D.debts.length, 0);
  cleanupAccGlobals();
});

test('reconcileAccounts() menghapus baris ketika akun dihapus permanen', () => {
  setupAccGlobals({
    accounts: [], // akun sudah dihapus
    debts: [{ id: 'd1', nilai: 250000, linkedAccountId: 'acc1', linkedOwnerId: 'o1' }],
    balanceByAccount: {},
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.removed, 1);
  assert.strictEqual(D.debts.length, 0);
  cleanupAccGlobals();
});

test('reconcileAccounts() mengabaikan owner SELF & porsi<=0', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'BRI' }],
    debts: [],
    ownersByAccount: { acc1: [
      { ownerId: 'SELF', ownerName: 'Saya', isSelf: true, porsi: 70 },
      { ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 0 },
    ] },
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.synced, 0);
  assert.strictEqual(D.debts.length, 0);
  cleanupAccGlobals();
});

test('reconcileAccounts() 1 akun banyak owner non-SELF -> 1 baris per owner', () => {
  setupAccGlobals({
    accounts: [{ id: 'acc1', name: 'Gopay' }],
    debts: [],
    ownersByAccount: { acc1: [
      { ownerId: 'o1', ownerName: 'Budi', isSelf: false, porsi: 20 },
      { ownerId: 'o2', ownerName: 'Siti', isSelf: false, porsi: 30 },
    ] },
    balanceByAccount: { acc1: 1000000 },
  });
  const res = TitipanSync.reconcileAccounts();
  assert.strictEqual(res.synced, 2);
  assert.strictEqual(D.debts.length, 2);
  const byOwner = Object.fromEntries(D.debts.map((d) => [d.linkedOwnerId, d.nilai]));
  assert.strictEqual(byOwner.o1, 200000);
  assert.strictEqual(byOwner.o2, 300000);
  cleanupAccGlobals();
});
