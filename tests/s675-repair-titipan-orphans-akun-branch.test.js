'use strict';
// tests/s675-repair-titipan-orphans-akun-branch.test.js — S675-lanjutan
//
// LATAR: audit menemukan repairTitipanOrphans() (self-test.js, tombol "🔧
// Perbaiki Gap Dana Titipan") HANYA pernah membaca TitipanReconcile.check()
// (cabang Aset+Investasi) di pre-check/confirm/repair -- 0 sentuhan ke
// checkAccounts() (cabang Akun berdiri-sendiri) sama sekali. Kalau
// checkAccounts() melapor gap SEMENTARA check() bersih, tombol langsung
// toast "tidak ada gap" & return -- FALSE ALL-CLEAR, pola bug SAMA PERSIS
// yang dibenerin S621 utk cabang missing, cuma kambuh lagi di cabang Akun
// yang ditambah belakangan setelah fix S621 itu.
//
// Fungsi diekstrak LANGSUNG dari source asli (self-test.js) lewat
// extractFunctionAutoStub() -- pola sama tests/s679-scroll-flash-14-
// tabswitch-regression.test.js -- supaya test ini menjalankan fungsi
// sungguhan, bukan re-implementasi logicnya. TitipanReconcile/TitipanSync/
// askConfirm/toast/save di-mock lewat extraGlobals; global lain yang
// disentuh (console.warn, runSelfTest) otomatis jadi stub permisif no-op.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makePermissiveStub } = require('./helpers/loadSource');

// extractAsyncFunctionAutoStub — sama persis pola extractFunctionAutoStub()
// (tests/helpers/loadSource.js, dipakai tests/s679-scroll-flash-14-
// tabswitch-regression.test.js) TAPI marker-nya "async function NAMA(" --
// extractFunctionAutoStub() cari "function NAMA(" (tanpa "async "), jadi
// utk fungsi yang dideklarasikan `async function ...`, start-nya jatuh
// TEPAT SETELAH kata "async " dan snippet hasil ekstraksi kehilangan
// keyword "async"-nya -- `await` di dalamnya jadi SyntaxError ("await is
// only valid in async functions"). repairTitipanOrphans() dideklarasikan
// `async function repairTitipanOrphans(){...}`, jadi butuh varian ini
// (bukan mengubah helper bersama -- dipakai banyak test lain, aman
// dilokalkan di sini saja).
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

function makeHarness({ checkResult, checkAccountsResult, hasCheckAccounts = true, hasReconcileAccounts = true }) {
  const calls = { repairMissing: 0, repairOrphans: 0, reconcileAccounts: 0, save: 0, toasts: [], confirmPrompts: [] };
  const TitipanReconcile = {
    check: () => checkResult,
    repairMissing: () => { calls.repairMissing++; return { synced: 0, unresolved: [] }; },
    repairOrphans: () => { calls.repairOrphans++; return { removed: 0 }; },
  };
  if (hasCheckAccounts) TitipanReconcile.checkAccounts = () => checkAccountsResult;
  const TitipanSync = {};
  if (hasReconcileAccounts) {
    TitipanSync.reconcileAccounts = () => { calls.reconcileAccounts++; return { synced: 2, removed: 0 }; };
  }
  const extraGlobals = {
    TitipanReconcile,
    TitipanSync,
    askConfirm: async (msg) => { calls.confirmPrompts.push(msg); return true; },
    toast: (msg) => { calls.toasts.push(msg); },
    save: () => { calls.save++; },
  };
  const fn = extractAsyncFunctionAutoStub('self-test.js', 'repairTitipanOrphans', extraGlobals);
  return { fn, calls };
}

test('repairTitipanOrphans(): gap MURNI di cabang Akun (check() ok, checkAccounts() tidak) TIDAK lagi false-report "tidak ada gap"', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: true, missing: [], orphan: [] },
    checkAccountsResult: { ok: false, missing: [{ key: 'acc1::owner1' }], orphan: [] },
  });
  await fn();
  assert.ok(!calls.toasts.some((t) => t.includes('Tidak ada gap Dana Titipan yang perlu diperbaiki')),
    'tidak boleh false all-clear ketika checkAccounts() melapor gap');
});

test('repairTitipanOrphans(): gap cabang Akun memicu TitipanSync.reconcileAccounts() di dalam alur konfirmasi yang sama', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: true, missing: [], orphan: [] },
    checkAccountsResult: { ok: false, missing: [{ key: 'acc1::owner1' }], orphan: [] },
  });
  await fn();
  assert.equal(calls.confirmPrompts.length, 1, 'harus tetap cuma 1 dialog konfirmasi (bukan dialog terpisah per cabang)');
  assert.equal(calls.reconcileAccounts, 1, 'TitipanSync.reconcileAccounts() harus terpanggil');
  assert.equal(calls.save, 1, 'save() harus terpanggil karena ada perubahan (accSynced>0)');
});

test('repairTitipanOrphans(): gap cabang Aset/Investasi + Akun sekaligus -- ketiganya diperbaiki dalam 1 konfirmasi', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: false, missing: [{ key: 'a1::o1' }], orphan: [{ key: 'a2::o2' }] },
    checkAccountsResult: { ok: false, missing: [{ key: 'acc1::o1' }], orphan: [] },
  });
  await fn();
  assert.equal(calls.confirmPrompts.length, 1);
  assert.equal(calls.repairMissing, 1);
  assert.equal(calls.repairOrphans, 1);
  assert.equal(calls.reconcileAccounts, 1);
});

test('repairTitipanOrphans(): check() DAN checkAccounts() sama-sama ok -- tetap toast "tidak ada gap", 0 mutasi', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: true, missing: [], orphan: [] },
    checkAccountsResult: { ok: true, missing: [], orphan: [] },
  });
  await fn();
  assert.ok(calls.toasts.some((t) => t.includes('Tidak ada gap Dana Titipan yang perlu diperbaiki')));
  assert.equal(calls.confirmPrompts.length, 0);
  assert.equal(calls.reconcileAccounts, 0);
  assert.equal(calls.save, 0);
});

test('repairTitipanOrphans(): guard aman kalau TitipanReconcile.checkAccounts belum dimuat (0 regresi ke behavior lama)', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: false, missing: [{ key: 'a1::o1' }], orphan: [] },
    checkAccountsResult: undefined,
    hasCheckAccounts: false,
  });
  await fn();
  assert.equal(calls.repairMissing, 1);
  assert.equal(calls.reconcileAccounts, 0, 'tanpa checkAccounts(), cabang Akun tidak boleh disentuh sama sekali');
});

test('repairTitipanOrphans(): guard aman kalau TitipanSync.reconcileAccounts belum dimuat -- gap Akun terdeteksi tapi tidak crash', async () => {
  const { fn, calls } = makeHarness({
    checkResult: { ok: true, missing: [], orphan: [] },
    checkAccountsResult: { ok: false, missing: [{ key: 'acc1::o1' }], orphan: [] },
    hasReconcileAccounts: false,
  });
  await assert.doesNotReject(fn());
  assert.equal(calls.reconcileAccounts, 0);
  // Tidak ada yang benar-benar berubah (reconcileAccounts tidak tersedia) --
  // pesan akhirnya "tidak ada baris yang diubah", bukan crash/exception.
  assert.ok(calls.toasts.some((t) => t.includes('Tidak ada baris yang diubah')));
});
