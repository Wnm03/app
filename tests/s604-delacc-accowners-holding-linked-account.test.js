'use strict';
// tests/s604-delacc-accowners-holding-linked-account.test.js — SESI S604
// (audit lanjutan S603, "audit bug serupa"). Root cause SAMA PERSIS S603:
// kode yang tadinya cuma tahu D.assets[].accountId (tautan Buku Aset) belum
// pernah diupdate sejak S601-3 nambah D.investments[].accountId (tautan
// LANGSUNG Holding Investasi lewat dropdown "🔗 Hubungkan ke Akun"). Sesi ini
// nemu 2 titik lagi dengan gap yang sama:
//
// (1) delAcc() (akun.js) — hasLinkedData & migrasi accountId sesudah hapus
//     HANYA cek 6 array (transactions/bills/bbmLogs/servisLogs/cobek/targets/
//     assets), TIDAK ADA D.investments. Akun yang tertaut LANGSUNG ke Holding
//     (skenario "Majoris" tanpa Aset perantara) lolos sebagai "0 data
//     terkait" -- 0 peringatan ke user, dan h.accountId JADI DANGLING
//     REFERENCE PERMANEN (menunjuk akun yang sudah dihapus, tidak pernah
//     dimigrasikan seperti D.assets).
//     Fix: tambah D.investments ke hasLinkedData/linkedHoldingsCount/migrasi,
//     pola SAMA PERSIS D.assets yang sudah ada.
//
// (2) AccOwners.open()/save() (akun.js) — modal "⚖️ Porsi Kepemilikan" akun
//     tertaut Holding tetap FULL EDITABLE, draft dari acc.owners (basi).
//     Simpan Porsi dari sisi Akun dapat toast SUKSES tapi TIDAK PERNAH
//     ditulis ke Investment.setOwners() -- semua konsumen porsi
//     (renderAccGrid/resolveOwnerDefaultForAccount/
//     resolveTxOwnerSplitForAccount) toh selalu prioritaskan Holding di atas
//     acc.owners, jadi edit user lenyap tanpa jejak. Fix: 100% REUSE pola B2b
//     Aset.openOwnersModal() -- alih navigasi LANGSUNG ke
//     InvestmentUI.openOwnersModal(id), modal akun tidak pernah dibuka utk
//     akun tertaut Holding. save() dijaga ulang (jaring pengaman kedua).

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign(
    { accounts: [], transactions: [], bills: [], bbmLogs: [], servisLogs: [], cobek: [], targets: [], assets: [], investments: [] },
    overrides
  );
}

// --- (1) delAcc() -----------------------------------------------------------

function makeDelAccCtx(D, stubs = {}) {
  const calls = { save: 0, choiceModalArgs: null };
  const toasts = [];
  const ctx = loadSource(
    ['modules/finance/akun.js'],
    Object.assign(
      {
        D,
        escapeHtml: (s) => s,
        fmt: (n) => 'Rp' + n,
        save: () => { calls.save++; },
        toast: (msg) => toasts.push(msg),
        askConfirm: stubs.askConfirm || (async (msg) => { calls.confirmArgs = msg; return true; }),
        showChoiceModal: stubs.showChoiceModal || (async (opts) => { calls.choiceModalArgs = opts; return 0; }),
        renderAccGrid: () => {},
        populateKeuFilters: () => {},
        renderDashAccList: () => {},
        renderLapAccList: () => {},
        renderDashboard: () => {},
        renderKeuangan: () => {},
        refreshBillEverywhere: () => {},
        renderCnTab: () => {},
      },
      stubs.extra || {}
    )
  );
  return { ctx, calls, toasts };
}

test('delAcc() — akun tertaut LANGSUNG ke Holding (D.investments), 0 data lain -> TERDETEKSI (bukan "0 data terkait"), accountId Holding ikut dimigrasi', async () => {
  const D = makeD({
    accounts: [
      { id: 'acc-holding', name: 'Majoris' },
      { id: 'acc-lain', name: 'Kas' },
    ],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
  });
  let choiceModalCalled = false;
  const { ctx, calls } = makeDelAccCtx(D, { showChoiceModal: async () => { choiceModalCalled = true; return 0; } });
  await ctx.delAcc(0);
  // cuma 1 kemungkinan tujuan (acc-lain) -> tidak perlu showChoiceModal, tapi HARUS tetap
  // terdeteksi (confirmMsg "punya data terkait", BUKAN "tidak punya data terkait") & dimigrasi.
  assert.equal(choiceModalCalled, false);
  assert.equal(calls.confirmArgs.includes('tidak punya data terkait'), false, 'akun tertaut Holding TIDAK boleh dianggap "tidak punya data terkait"');
  assert.equal(D.investments[0].accountId, 'acc-lain', 'accountId Holding harus ikut dimigrasi ke akun tujuan, bukan dangling reference');
  assert.equal(D.accounts.length, 1);
  assert.equal(calls.save, 1);
});

test('delAcc() — akun tertaut Holding & ada 2+ kemungkinan tujuan -> showChoiceModal muncul, dipindah ke pilihan user, disebut di pesan', async () => {
  const D = makeD({
    accounts: [
      { id: 'acc-holding', name: 'Majoris' },
      { id: 'a2', name: 'Bank BCA' },
      { id: 'a3', name: 'Bank Mandiri' },
    ],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
  });
  const { ctx, calls } = makeDelAccCtx(D, { showChoiceModal: async (opts) => { calls.choiceModalArgs = opts; return 1; } });
  await ctx.delAcc(0);
  assert.ok(calls.choiceModalArgs);
  assert.ok(calls.choiceModalArgs.message.includes('Holding Investasi'), 'pesan pilihan tujuan harus menyebut Holding Investasi yang tertaut');
  assert.equal(D.investments[0].accountId, 'a3', 'harus dipindah ke akun yang DIPILIH user, bukan otomatis accounts[0]');
  assert.equal(D.accounts.length, 2);
});

test('delAcc() — akun tertaut Holding DAN Aset sekaligus (kombinasi) -> keduanya ikut dimigrasi', async () => {
  const D = makeD({
    accounts: [
      { id: 'acc1', name: 'Majoris' },
      { id: 'a2', name: 'Bank BCA' },
    ],
    investments: [{ id: 'h1', name: 'Holding X', accountId: 'acc1' }],
    assets: [{ id: 'as1', name: 'Aset Y', accountId: 'acc1' }],
  });
  const { ctx } = makeDelAccCtx(D);
  await ctx.delAcc(0);
  assert.equal(D.investments[0].accountId, 'a2');
  assert.equal(D.assets[0].accountId, 'a2');
});

test('delAcc() — 0 regresi: akun tanpa tautan Holding sama sekali tetap berperilaku seperti sebelumnya', async () => {
  const D = makeD({
    accounts: [
      { id: 'a1', name: 'Cash' },
      { id: 'a2', name: 'Bank' },
    ],
  });
  let choiceModalCalled = false;
  const { ctx, calls, toasts } = makeDelAccCtx(D, { showChoiceModal: async () => { choiceModalCalled = true; return 0; } });
  await ctx.delAcc(0);
  assert.equal(choiceModalCalled, false);
  assert.equal(D.accounts.length, 1);
  assert.ok(toasts.some((t) => t.includes('dihapus')));
});

// --- (2) AccOwners.open()/save() --------------------------------------------

function makeAccOwnersCtx(D, extra = {}) {
  const els = {};
  const fakeDoc = { getElementById: (id) => els[id] || (els[id] = { textContent: '', innerHTML: '', value: '', style: {} }) };
  const openOwnersModalCalls = [];
  const toasts = [];
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/investasi.js', 'modules/finance/transaksi.js', 'modules/finance/akun.js'],
    Object.assign(
      {
        D,
        document: fakeDoc,
        save: () => {},
        toast: (m) => toasts.push(m),
        fmt: (n) => String(n),
        escapeHtml: (s) => String(s),
        sameId: (a, b) => String(a) === String(b),
        uid: () => 'x' + Math.random(),
        openModal: () => {},
        InvestmentUI: { openOwnersModal: (id) => openOwnersModalCalls.push(id) },
      },
      extra
    ),
    ['AccOwners']
  );
  // editAccIdx dideklarasikan `let` di top-level akun.js -- tidak bisa di-override
  // lewat extraGlobals (lexical binding menyembunyikan property sandbox yang sama
  // nama). Set langsung di context yang SAMA lewat vm.runInContext supaya
  // AccOwners.open() (yang baca editAccIdx dari luar) melihat index yang benar.
  vm.runInContext('editAccIdx = 0;', ctx);
  return { ctx, openOwnersModalCalls, toasts, els };
}

test('AccOwners.open() — akun tertaut LANGSUNG ke Holding -> dialihkan ke InvestmentUI.openOwnersModal(), modal akun TIDAK dibuka', () => {
  const D = makeD({
    accounts: [{ id: 'acc-holding', name: 'Majoris' }],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding' }],
  });
  const { ctx, openOwnersModalCalls } = makeAccOwnersCtx(D);
  // simulasikan editAccIdx=0 via akses langsung (harness tidak bisa inject `let` top-level,
  // jadi verifikasi lewat AccOwners._accId TIDAK terisi setelah open() -- bukti modal akun batal dibuka).
  ctx.AccOwners.open();
  assert.deepEqual(openOwnersModalCalls, ['h1'], 'harus dialihkan ke modal Holding dengan id holding yang benar');
  assert.equal(ctx.AccOwners._accId, null, 'AccOwners._accId TIDAK boleh terisi -- modal Porsi Akun tidak jadi dibuka utk akun tertaut Holding');
});

test('AccOwners.open() — akun TIDAK tertaut Holding -> modal akun dibuka normal (0 regresi)', () => {
  const D = makeD({
    accounts: [{ id: 'acc1', name: 'Kas', owners: [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 100, isSelf: true }] }],
  });
  const { ctx, openOwnersModalCalls } = makeAccOwnersCtx(D);
  ctx.AccOwners.open();
  assert.deepEqual(openOwnersModalCalls, [], 'akun biasa tidak boleh dialihkan ke modal Holding');
  assert.equal(ctx.AccOwners._accId, 'acc1');
  assert.equal(ctx.AccOwners._draft.length, 1);
});

test('AccOwners.save() — jaring pengaman kedua: kalau _accId ternyata tertaut Holding, save() ditolak (bukan diam-diam sukses)', () => {
  const D = makeD({
    accounts: [{ id: 'acc-holding', name: 'Majoris', owners: [{ ownerId: 'SELF', ownerName: 'Saya', porsi: 100, isSelf: true }] }],
    investments: [{ id: 'h1', name: 'Majoris', accountId: 'acc-holding', owners: [{ ownerId: 'SELF', ownerName: 'renov', porsi: 84.8781, isSelf: true }, { ownerId: 'sihab', ownerName: 'mas sihab', porsi: 15.1219, isSelf: false }] }],
  });
  const { ctx } = makeAccOwnersCtx(D);
  // Paksa state seolah-olah modal ini SUDAH terlanjur terbuka (edge case: akun baru ditautkan
  // ke Holding SETELAH modal dibuka) -- save() harus tetap menolak, bukan percaya open() semata.
  ctx.AccOwners._accId = 'acc-holding';
  ctx.AccOwners._draft = [{ ownerId: 'SELF', ownerName: 'Saya Doang', porsi: 100, isSelf: true }];
  ctx.AccOwners.save();
  assert.equal(D.accounts[0].owners[0].ownerName, 'Saya', 'acc.owners TIDAK boleh berubah -- save() ditolak');
  assert.deepEqual(
    D.investments[0].owners.map((o) => o.ownerName),
    ['renov', 'mas sihab'],
    'Holding.owners TIDAK boleh ikut berubah -- save() ditolak sebelum menulis apa pun'
  );
});
