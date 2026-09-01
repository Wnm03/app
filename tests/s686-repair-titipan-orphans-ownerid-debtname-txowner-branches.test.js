'use strict';
// tests/s686-repair-titipan-orphans-ownerid-debtname-txowner-branches.test.js
// — SESI FIX-2026-09-01-lanjutan2, menutup gap dicatat di
// SESSION-NOTE-FIX-2026-09-01-lanjutan2.md: repairOwnerIdConsistency()/
// repairDebtNameStaleness()/repairTransactionOwnerRefs() (titipan-reconcile.js)
// sudah ADA sejak sesi sebelumnya tapi BELUM disambungkan ke tombol "🔧
// Perbaiki Gap Dana Titipan" (repairTitipanOrphans(), self-test.js). Sesi
// ini menyambungkannya, pola SAMA PERSIS penambahan cabang Akun (S675-
// lanjutan, lihat tests/s675-repair-titipan-orphans-akun-branch.test.js) —
// 1 tombol, 1 dialog konfirmasi, sekarang 6 cabang total.
//
// Harness diekstrak LANGSUNG dari source asli lewat extractAsyncFunctionAutoStub()
// (helper sama persis file test S675 di atas, disalin lokal krn bukan
// helper bersama) — menjalankan fungsi sungguhan, bukan re-implementasi
// logicnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makePermissiveStub } = require('./helpers/loadSource');

function extractAsyncFunctionAutoStub(file, fnName, extraGlobals = {}) {
  const fullPath = path.join(__dirname, '..', file);
  const src = fs.readFileSync(fullPath, 'utf8');
  const marker = `async function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`extractAsyncFunctionAutoStub: "${marker}" tidak ditemukan di ${file}`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  const snippet = src.slice(start, i);
  const known = { console, Date, Math, JSON, Number, String, Boolean, Array, Object, RegExp, Map, Set, Promise, setTimeout: () => 0, clearTimeout: () => {}, ...extraGlobals };
  const store = new Map(Object.entries(known));
  const proxyHandler = {
    has() { return true; },
    get(target, prop) {
      if (prop === Symbol.unscopables) return undefined;
      if (store.has(prop)) return store.get(prop);
      const stub = makePermissiveStub(String(prop));
      store.set(prop, stub);
      return stub;
    },
    set(target, prop, value) { store.set(prop, value); return true; },
  };
  const sandbox = new Proxy({}, proxyHandler);
  const context = vm.createContext(sandbox);
  new vm.Script(`${snippet}\nthis.__fn = ${fnName};`, { filename: `${file}#${fnName}` }).runInContext(context);
  return context.__fn;
}

function makeHarness(opts) {
  const {
    checkResult = { ok: true, missing: [], orphan: [] },
    checkAccountsResult = { ok: true, missing: [], orphan: [] },
    checkOwnerIdResult = { ok: true, divergent: [] },
    checkDebtNameResult = { ok: true, stale: [] },
    checkTxOwnerResult = { ok: true, orphan: [] },
    checkPendingOwnerReviewResult = { ok: true, pending: [] },
    checkOwnerIdConflictsResult = { ok: true, conflicts: [] },
    repairOwnerIdReturn = { unified: 0, conflicts: [] },
    repairDebtNameReturn = { synced: 0 },
    repairTxOwnerReturn = { fixed: 0, cleared: 0, unresolved: [] },
    includeNewFns = true,
    includePendingOwnerReviewFn = true,
    includeOwnerIdConflictsFn = true,
  } = opts;
  const calls = {
    repairMissing: 0, repairOrphans: 0, reconcileAccounts: 0,
    repairOwnerIdConsistency: 0, repairDebtNameStaleness: 0, repairTransactionOwnerRefs: 0,
    save: 0, toasts: [], confirmPrompts: [], warnings: [],
  };
  const TitipanReconcile = {
    check: () => checkResult,
    checkAccounts: () => checkAccountsResult,
    repairMissing: () => { calls.repairMissing++; return { synced: 0, unresolved: [] }; },
    repairOrphans: () => { calls.repairOrphans++; return { removed: 0 }; },
  };
  if (includeNewFns) {
    TitipanReconcile.checkOwnerIdConsistency = () => checkOwnerIdResult;
    TitipanReconcile.checkDebtNameStaleness = () => checkDebtNameResult;
    TitipanReconcile.checkTransactionOwnerRefs = () => checkTxOwnerResult;
    TitipanReconcile.repairOwnerIdConsistency = () => { calls.repairOwnerIdConsistency++; return repairOwnerIdReturn; };
    TitipanReconcile.repairDebtNameStaleness = () => { calls.repairDebtNameStaleness++; return repairDebtNameReturn; };
    TitipanReconcile.repairTransactionOwnerRefs = () => { calls.repairTransactionOwnerRefs++; return repairTxOwnerReturn; };
  }
  if (includePendingOwnerReviewFn) {
    TitipanReconcile.checkPendingOwnerReview = () => checkPendingOwnerReviewResult;
  }
  if (includeOwnerIdConflictsFn) {
    TitipanReconcile.checkOwnerIdConflicts = () => checkOwnerIdConflictsResult;
  }
  const TitipanSync = {
    reconcileAccounts: () => { calls.reconcileAccounts++; return { synced: 0, removed: 0 }; },
  };
  const extraGlobals = {
    TitipanReconcile,
    TitipanSync,
    askConfirm: async (msg) => { calls.confirmPrompts.push(msg); return true; },
    toast: (msg) => { calls.toasts.push(msg); },
    save: () => { calls.save++; },
    console: { warn: (...args) => { calls.warnings.push(args); } },
  };
  const fn = extractAsyncFunctionAutoStub('self-test.js', 'repairTitipanOrphans', extraGlobals);
  return { fn, calls };
}

test('repairTitipanOrphans(): gap MURNI ownerIdConsistency (check/checkAccounts ok) tidak lagi false all-clear', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
  });
  await fn();
  assert.ok(!calls.toasts.some((t) => t.includes('Tidak ada gap Dana Titipan yang perlu diperbaiki')));
  assert.equal(calls.repairOwnerIdConsistency, 1);
});

test('repairTitipanOrphans(): gap MURNI debtNameStaleness memicu repairDebtNameStaleness()', async () => {
  const { fn, calls } = makeHarness({
    checkDebtNameResult: { ok: false, stale: [{ debtId: 'd1', linkedOwnerId: 'o1', debtName: 'Budi', registryName: 'Budi Santoso' }] },
  });
  await fn();
  assert.equal(calls.confirmPrompts.length, 1);
  assert.equal(calls.repairDebtNameStaleness, 1);
});

test('repairTitipanOrphans(): gap MURNI transactionOwnerRefs memicu repairTransactionOwnerRefs()', async () => {
  const { fn, calls } = makeHarness({
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1', accountId: 'acc1', deductionOwnerId: 'o_lama' }] },
  });
  await fn();
  assert.equal(calls.repairTransactionOwnerRefs, 1);
});

test('repairTitipanOrphans(): ketiga cabang baru + 2 cabang lama sekaligus -- SEMUA diperbaiki dalam 1 konfirmasi', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: false, missing: [{ key: 'a1::o1' }], orphan: [] },
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    checkDebtNameResult: { ok: false, stale: [{ debtId: 'd1' }] },
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1' }] },
  });
  await fn();
  assert.equal(calls.confirmPrompts.length, 1, 'harus tetap 1 dialog, bukan per cabang');
  assert.equal(calls.repairMissing, 1);
  assert.equal(calls.repairOwnerIdConsistency, 1);
  assert.equal(calls.repairDebtNameStaleness, 1);
  assert.equal(calls.repairTransactionOwnerRefs, 1);
});

test('repairTitipanOrphans(): semua 5 sub-check ok -- tetap toast "tidak ada gap", 0 mutasi, 3 repair baru TIDAK terpanggil', async () => {
  const { fn, calls } = makeHarness({});
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('Tidak ada gap Dana Titipan yang perlu diperbaiki')));
  assert.equal(calls.confirmPrompts.length, 0);
  assert.equal(calls.repairOwnerIdConsistency, 0);
  assert.equal(calls.repairDebtNameStaleness, 0);
  assert.equal(calls.repairTransactionOwnerRefs, 0);
  assert.equal(calls.save, 0);
});

test('repairTitipanOrphans(): save() terpanggil & toast menyebut hasil kalau repairOwnerIdConsistency() menyatukan >0 baris', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    repairOwnerIdReturn: { unified: 2, conflicts: [] },
  });
  await fn();
  assert.equal(calls.save, 1);
  assert.ok(calls.toasts.some((t) => t.includes('ID pemilik disatukan')));
});

test('repairTitipanOrphans(): conflicts dari repairOwnerIdConsistency() DICATAT ke console.warn, tidak menghentikan alur/toast sukses', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    repairOwnerIdReturn: { unified: 0, conflicts: [{ name: 'Budi', id: 'a1' }] },
  });
  await fn();
  assert.ok(calls.warnings.some((w) => String(w[0]).includes('tabrakan')));
});

test('repairTitipanOrphans(): unresolved dari repairTransactionOwnerRefs() (dikosongkan krn ambigu) DICATAT ke console.warn', async () => {
  const { fn, calls } = makeHarness({
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1' }] },
    repairTxOwnerReturn: { fixed: 0, cleared: 1, unresolved: ['t1'] },
  });
  await fn();
  assert.ok(calls.warnings.some((w) => String(w[0]).includes('dikosongkan')));
  assert.ok(calls.toasts.some((t) => t.includes('pemilik potongan transaksi diperbaiki')));
});

test('repairTitipanOrphans(): guard aman (0 regresi ke behavior lama) kalau 3 check/repair baru belum dimuat', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: false, missing: [{ key: 'a1::o1' }], orphan: [] },
    includeNewFns: false,
  });
  await fn();
  assert.equal(calls.repairMissing, 1, 'cabang lama tetap jalan');
  assert.equal(calls.repairOwnerIdConsistency, 0);
  assert.equal(calls.repairDebtNameStaleness, 0);
  assert.equal(calls.repairTransactionOwnerRefs, 0);
});

test('repairTitipanOrphans(): guard aman kalau HANYA repair-nya belum dimuat tapi check-nya sudah (typeof repair* dicek terpisah)', async () => {
  const checkOwnerIdResult = { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] };
  const calls = { confirmPrompts: [], toasts: [], repairOwnerIdConsistency: 0 };
  const TitipanReconcile = {
    check: () => ({ ok: true, missing: [], orphan: [] }),
    checkAccounts: () => ({ ok: true, missing: [], orphan: [] }),
    checkOwnerIdConsistency: () => checkOwnerIdResult,
    checkDebtNameStaleness: () => ({ ok: true, stale: [] }),
    checkTransactionOwnerRefs: () => ({ ok: true, orphan: [] }),
    // repairOwnerIdConsistency SENGAJA tidak didefinisikan
  };
  const extraGlobals = {
    TitipanReconcile,
    TitipanSync: {},
    askConfirm: async (msg) => { calls.confirmPrompts.push(msg); return true; },
    toast: (msg) => { calls.toasts.push(msg); },
    save: () => {},
  };
  const fn = extractAsyncFunctionAutoStub('self-test.js', 'repairTitipanOrphans', extraGlobals);
  await assert.doesNotReject(fn());
  assert.equal(calls.confirmPrompts.length, 1, 'gap tetap terdeteksi & diminta konfirmasi');
  assert.ok(calls.toasts.some((t) => t.includes('Tidak ada baris yang diubah')), 'tidak crash walau repair-nya tidak tersedia');
});

// --- toast backlog checkPendingOwnerReview() (poin 4, sesi lanjutan hasil
// audit 2026-09-01 -- txUnresolved sebelumnya cuma console.warn, sekarang
// juga muncul di toast supaya kelihatan di HP tanpa perlu buka devtools) ---

test('repairTitipanOrphans(): toast backlog "perlu diisi ulang" muncul kalau checkPendingOwnerReview() ada isinya', async () => {
  const { fn, calls } = makeHarness({
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1', accountId: 'acc1' }] },
    repairTxOwnerReturn: { fixed: 0, cleared: 1, unresolved: ['t1'] },
    checkPendingOwnerReviewResult: { ok: false, pending: [{ txId: 't1', accountId: 'acc1' }] },
  });
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('1 transaksi perlu diisi ulang pemilik potongannya') && t.includes('t1')));
});

test('repairTitipanOrphans(): backlog checkPendingOwnerReview() tetap ditoast walau run ini 0 gap baru (backlog lama belum direview)', async () => {
  const { fn, calls } = makeHarness({
    checkPendingOwnerReviewResult: { ok: false, pending: [{ txId: 'lama1' }, { txId: 'lama2' }] },
  });
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('2 transaksi lama perlu diisi ulang')), 'backlog lama tetap ditoast walau semua 5 sub-check ok run ini');
});

test('repairTitipanOrphans(): TIDAK ada toast backlog kalau checkPendingOwnerReview() kosong', async () => {
  const { fn, calls } = makeHarness({
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1', accountId: 'acc1' }] },
    repairTxOwnerReturn: { fixed: 1, cleared: 0, unresolved: [] },
  });
  await fn();
  assert.ok(!calls.toasts.some((t) => t.includes('perlu diisi ulang')));
});

test('repairTitipanOrphans(): guard aman (tidak throw) kalau checkPendingOwnerReview() belum dimuat', async () => {
  const { fn, calls } = makeHarness({
    checkTxOwnerResult: { ok: false, orphan: [{ txId: 't1', accountId: 'acc1' }] },
    repairTxOwnerReturn: { fixed: 0, cleared: 1, unresolved: ['t1'] },
    includePendingOwnerReviewFn: false,
  });
  await assert.doesNotReject(fn());
  assert.ok(!calls.toasts.some((t) => t.includes('perlu diisi ulang')));
});

// --- toast backlog checkOwnerIdConflicts() (poin 1, sesi lanjutan --
// ownerConflicts sebelumnya cuma console.warn, sekarang juga muncul di
// toast, pola SAMA PERSIS pendingOwnerReview di atas) ---

test('repairTitipanOrphans(): toast backlog "kepemilikan bertabrakan" muncul kalau checkOwnerIdConflicts() ada isinya', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    repairOwnerIdReturn: { unified: 0, conflicts: [{ name: 'Budi', id: 'a1' }] },
    checkOwnerIdConflictsResult: { ok: false, conflicts: [{ name: 'Budi', id: 'a1' }] },
  });
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('1 baris kepemilikan bertabrakan') && t.includes('Budi')));
});

test('repairTitipanOrphans(): backlog checkOwnerIdConflicts() tetap ditoast walau run ini 0 gap baru (backlog lama belum direview)', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdConflictsResult: { ok: false, conflicts: [{ name: 'Budi', id: 'a1' }, { name: 'Siti', id: 'a2' }] },
  });
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('backlog lama') && t.includes('2 baris kepemilikan bertabrakan')), 'backlog lama tetap ditoast walau semua 5 sub-check ok run ini');
});

test('repairTitipanOrphans(): TIDAK ada toast backlog kalau checkOwnerIdConflicts() kosong', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    repairOwnerIdReturn: { unified: 2, conflicts: [] },
  });
  await fn();
  assert.ok(!calls.toasts.some((t) => t.includes('bertabrakan')));
});

test('repairTitipanOrphans(): guard aman (tidak throw) kalau checkOwnerIdConflicts() belum dimuat', async () => {
  const { fn, calls } = makeHarness({
    checkOwnerIdResult: { ok: false, divergent: [{ name: 'Budi', ids: ['id_a', 'id_b'] }] },
    repairOwnerIdReturn: { unified: 0, conflicts: [{ name: 'Budi', id: 'a1' }] },
    includeOwnerIdConflictsFn: false,
  });
  await assert.doesNotReject(fn());
  assert.ok(!calls.toasts.some((t) => t.includes('bertabrakan')));
});
