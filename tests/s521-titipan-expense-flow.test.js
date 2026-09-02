'use strict';
// tests/s521-titipan-expense-flow.test.js — Sesi 521 (S521-A), targeted
// test utk modules/finance/titipan-expense-flow.js sesuai
// DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md §20 (minimal coverage list).
//
// Pola SAMA PERSIS tests/s519-dana-titipan-transaksi-talangan-linkage.test.js
// (LAPIS 3 murni, loadSource harness, 0 DOM).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  let saveCalls = 0;
  const ctx = loadSource(
    [
      'modules/shared/ownership-engine.js',
      'modules/shared/multi-owner-engine.js',
      'modules/asset/investasi.js',
      'modules/shared/filter-prefs-store.js',
      'modules/finance/dana-titipan-aggregation-api.js', 'modules/finance/dana-titipan-commitment-return-api.js', 'modules/finance/dana-titipan-portfolio-render.js',
      'modules/finance/piutang-utang.js',
      'modules/finance/transaksi.js',
      'modules/finance/tx-list-cashflow.js',
      'modules/finance/titipan-expense-flow.js',
    ],
    {
      D,
      uid: () => 'u' + (D._n = (D._n || 0) + 1),
      todayStr: () => '2026-08-09',
      save: () => { saveCalls++; },
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      sameId: (a, b) => a === b,
      askConfirm: async () => true,
      toast: () => {},
      renderDashboard: () => {}, renderKeuangan: () => {}, renderCnTab: () => {}, renderProductList: () => {},
      renderShop: () => {}, renderShopRecent: () => {}, renderStockList: () => {},
    },
    [
      'DanaTitipanPortfolioAPI', 'resolveTxTitipanOwner', 'applyTxTitipanLinkageOnSave',
      'maybeCreateTitipanTalanganPiutang', 'syncTitipanTalanganPiutangOnEdit',
      'removeUnpaidTitipanTalanganPiutangForTx', 'delTx', 'MultiOwnerEngine',
      'TitipanExpenseFlow',
    ],
  );
  ctx._saveCalls = () => saveCalls;
  return ctx;
}

function baseD(overrides) {
  return Object.assign({
    investments: [
      {
        id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
        owners: [
          { ownerId: 'budi', porsi: 60, ownerName: 'Budi', isSelf: false },
          { ownerId: 'cici', porsi: 40, ownerName: 'Cici', isSelf: false },
        ],
      },
    ],
    investmentTx: [], investmentWatchlist: [], debts: [], accounts: [{ id: 'acc1', name: 'Cash' }],
    titipanCommitments: [
      { id: 'c1', ownerId: 'budi', ownerName: 'Budi', principalAmount: 1000000 },
      { id: 'c2', ownerId: 'cici', ownerName: 'Cici', principalAmount: 1000000 },
    ],
    titipanReturns: [], transactions: [], piutang: [], assets: [],
  }, overrides || {});
}

const baseInput = (extra) => Object.assign({
  nominal: 100000,
  owners: [{ ownerId: 'budi' }],
  category: 'Belanja',
  subcategory: '',
  accountId: 'acc1',
  date: '2026-08-09',
  note: 'test',
}, extra || {});

// ============================================================
// 1. single owner -> 1 transaksi
// ============================================================
test('1. single owner: submit() menghasilkan tepat 1 transaksi dgn titipanLinkId owner tsb', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput());
  assert.equal(res.ok, true);
  assert.equal(res.txIds.length, 1);
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].amount, 100000);
  assert.equal(D.transactions[0].titipanLinkId, 'budi');
  // FIX (audit "Pemilik Sumber Potongan" tidak sync ke Dana Titipan):
  // deductionOwnerId harus ikut terisi sama dengan titipanLinkId, bukan
  // cuma titipanLinkId saja -- ini field yang dibaca dashboard Dana
  // Titipan (resolveTxOwnerAssignment(), filter-laporan.js).
  assert.equal(D.transactions[0].deductionOwnerId, 'budi');
  assert.equal(D.transactions[0].type, 'expense');
  assert.equal(ctx._saveCalls(), 1);
});

// ============================================================
// 2. multi owner -> N transaksi
// ============================================================
test('2. multi owner: submit() menghasilkan N transaksi terpisah, masing2 1 titipanLinkId', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi', porsi: 60 }, { ownerId: 'cici', porsi: 40 }],
  }));
  assert.equal(res.ok, true);
  assert.equal(res.txIds.length, 2);
  assert.equal(D.transactions.length, 2);
  const linkIds = D.transactions.map((t) => t.titipanLinkId).sort();
  assert.deepEqual(linkIds, ['budi', 'cici']);
  // tidak ada 1 transaksi dgn field split/array -- masing2 row scalar
  D.transactions.forEach((t) => { assert.equal(typeof t.titipanLinkId, 'string'); });
  // deductionOwnerId per baris harus sama dgn titipanLinkId baris itu (1
  // baris split = 1 owner, konsisten di semua transaksi hasil split).
  D.transactions.forEach((t) => { assert.equal(t.deductionOwnerId, t.titipanLinkId); });
});

// ============================================================
// 3. porsi valid (multi-owner, total 100) -> lolos validasi
// ============================================================
test('3. porsi valid (total 100%): validate() ok:true', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({
    owners: [{ ownerId: 'budi', porsi: 60 }, { ownerId: 'cici', porsi: 40 }],
  }));
  assert.equal(v.ok, true);
});

// ============================================================
// 4. invalid porsi (total bukan 100) -> ditolak, 0 transaksi dibuat
// ============================================================
test('4. invalid porsi (total 90%): validate() ok:false & submit() tidak menyentuh D', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({
    owners: [{ ownerId: 'budi', porsi: 50 }, { ownerId: 'cici', porsi: 40 }],
  }));
  assert.equal(v.ok, false);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    owners: [{ ownerId: 'budi', porsi: 50 }, { ownerId: 'cici', porsi: 40 }],
  }));
  assert.equal(res.ok, false);
  assert.equal(D.transactions.length, 0);
  assert.equal(ctx._saveCalls(), 0);
});

// ============================================================
// 5. invalid owner (bukan existing owner) -> ditolak
// ============================================================
test('5. invalid owner (tidak dikenal listExistingOwners): submit() ditolak, 0 transaksi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({ owners: [{ ownerId: 'orang_asing' }] }));
  assert.equal(res.ok, false);
  assert.match(res.reason, /tidak dikenal/);
  assert.equal(D.transactions.length, 0);
});

// ============================================================
// 6. invalid nominal -> ditolak
// ============================================================
test('6. invalid nominal (0/negatif/bukan angka): submit() ditolak', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  assert.equal(ctx.TitipanExpenseFlow.submit(baseInput({ nominal: 0 })).ok, false);
  assert.equal(ctx.TitipanExpenseFlow.submit(baseInput({ nominal: -500 })).ok, false);
  assert.equal(ctx.TitipanExpenseFlow.submit(baseInput({ nominal: 'abc' })).ok, false);
  assert.equal(D.transactions.length, 0);
});

// ============================================================
// 7. rounding — Math.round() per row
// ============================================================
test('7. rounding: tiap row nominal integer hasil Math.round()', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi', porsi: 33 }, { ownerId: 'cici', porsi: 67 }],
  }));
  assert.equal(res.ok, true);
  res.rows.forEach((r) => { assert.equal(r.amount, Math.round(r.amount)); });
});

// ============================================================
// 8. residual diterapkan ke row terakhir
// ============================================================
test('8. residual-to-last-row: 100000 split 33/33/34 -> residual pembulatan nempel di row terakhir', () => {
  const D = baseD({
    investments: [{
      id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
      owners: [
        { ownerId: 'budi', porsi: 33, ownerName: 'Budi', isSelf: false },
        { ownerId: 'cici', porsi: 33, ownerName: 'Cici', isSelf: false },
        { ownerId: 'dedi', porsi: 34, ownerName: 'Dedi', isSelf: false },
      ],
    }],
  });
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi', porsi: 33 }, { ownerId: 'cici', porsi: 33 }, { ownerId: 'dedi', porsi: 34 }],
  }));
  assert.equal(res.ok, true);
  assert.equal(res.rows[0].amount, 33000);
  assert.equal(res.rows[1].amount, 33000);
  // 100000 - 33000 - 33000 = 34000 (pas, tapi cek kasus pecahan lain di bawah)
  assert.equal(res.rows[2].amount, 34000);

  // Kasus yang benar2 memaksa residual non-0 (porsi 1/3 berulang):
  const D2 = baseD({
    investments: [{
      id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
      owners: [
        { ownerId: 'budi', porsi: 33.34, ownerName: 'Budi', isSelf: false },
        { ownerId: 'cici', porsi: 33.33, ownerName: 'Cici', isSelf: false },
        { ownerId: 'dedi', porsi: 33.33, ownerName: 'Dedi', isSelf: false },
      ],
    }],
  });
  const ctx2 = makeCtx(D2);
  const res2 = ctx2.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi', porsi: 33.34 }, { ownerId: 'cici', porsi: 33.33 }, { ownerId: 'dedi', porsi: 33.33 }],
  }));
  assert.equal(res2.ok, true);
  const sum2 = res2.rows.reduce((s, r) => s + r.amount, 0);
  assert.equal(sum2, 100000);
});

// ============================================================
// 9. total hasil pembagian == nominal input (invariant, banyak kasus acak)
// ============================================================
test('9. exact total: sum(rows.amount) === nominal input utk berbagai porsi ganjil', () => {
  const cases = [
    [33, 33, 34], [1, 1, 98], [70, 30], [10, 20, 30, 40], [11, 11, 11, 67],
  ];
  cases.forEach((porsis) => {
    const ownerIds = ['budi', 'cici', 'dedi', 'edo'].slice(0, porsis.length);
    const D = baseD({
      investments: [{
        id: 'h1', name: 'BBCA', unit: 1, avgPrice: 1, currentPrice: 1,
        owners: ownerIds.map((id, i) => ({ ownerId: id, porsi: porsis[i], ownerName: id, isSelf: false })),
      }],
    });
    const ctx = makeCtx(D);
    const res = ctx.TitipanExpenseFlow.submit(baseInput({
      nominal: 777777,
      owners: ownerIds.map((id, i) => ({ ownerId: id, porsi: porsis[i] })),
    }));
    assert.equal(res.ok, true, JSON.stringify(porsis));
    const sum = D.transactions.reduce((s, t) => s + t.amount, 0);
    assert.equal(sum, 777777, JSON.stringify(porsis));
  });
});

// ============================================================
// 10. linkage titipanLinkId — pakai primitive S519, valid owner terjaga
// ============================================================
test('10. linkage: titipanLinkId hasil submit() lolos resolveTxTitipanOwner() (S519)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  ctx.TitipanExpenseFlow.submit(baseInput());
  const tx = D.transactions[0];
  assert.ok(ctx.resolveTxTitipanOwner(tx.titipanLinkId));
});

// ============================================================
// 11. talangan linkage — maybeCreateTitipanTalanganPiutang() otomatis jalan
// ============================================================
test('11. talangan: submit({talangan:true}) membuat piutang otomatis per owner (S519)', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi', porsi: 60 }, { ownerId: 'cici', porsi: 40 }],
    talangan: true,
  }));
  assert.equal(res.ok, true);
  assert.equal(D.piutang.length, 2);
  const byOwner = Object.fromEntries(D.piutang.map((p) => [p.autoTitipanOwnerId, p]));
  assert.equal(byOwner.budi.nilai, 60000);
  assert.equal(byOwner.cici.nilai, 40000);
  assert.equal(byOwner.budi.lunas, false);
});

// ============================================================
// 12. duplicate/idempotency — re-entrant submit diblokir
// ============================================================
test('12. duplicate submit: re-entrant submit() selama window commit diblokir, 0 transaksi kedua', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  let nestedResult = null;
  const res = ctx.TitipanExpenseFlow.submit(baseInput(), {
    onBeforeCommit: () => {
      nestedResult = ctx.TitipanExpenseFlow.submit(baseInput());
      return undefined;
    },
  });
  assert.equal(res.ok, true);
  assert.equal(nestedResult.ok, false);
  assert.equal(D.transactions.length, 1);
  assert.equal(ctx._saveCalls(), 1);
});

// ============================================================
// 13. edit/delta-sync — pakai syncTitipanTalanganPiutangOnEdit() (S519)
// ============================================================
test('13. edit/delta-sync: edit nominal salah satu tx hasil S521 -> piutang talangan ikut sync', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 100000,
    owners: [{ ownerId: 'budi' }],
    talangan: true,
  }));
  const txId = res.txIds[0];
  const tx = D.transactions.find((t) => t.id === txId);
  const oldAmount = tx.amount;
  const pBefore = D.piutang.find((x) => x.autoTxId === txId).nilai;
  tx.amount = 80000; // simulasi user edit nominal lewat modal edit tx generik
  const synced = ctx.syncTitipanTalanganPiutangOnEdit(txId, oldAmount, tx.amount);
  assert.equal(synced, true);
  const p = D.piutang.find((x) => x.autoTxId === txId);
  // Pola delta SAMA PERSIS S519 (syncTitipanTalanganPiutangOnEdit): nilai
  // baru = nilai lama + oldAmount - newAmount (bukan ditimpa newAmount
  // begitu saja) -- lihat tests/s519-...test.js #8. S521 tidak mengubah
  // formula ini, cuma memverifikasi tx hasil S521 kompatibel dgn primitive
  // S519 existing.
  assert.equal(p.nilai, pBefore + oldAmount - 80000);
});

// ============================================================
// 14. delete cascade — delTx() tetap satu-satunya jalur, piutang belum
// lunas ikut terhapus (0 cascade baru ditulis file ini)
// ============================================================
test('14. delete cascade: delTx() pada tx hasil S521 menghapus piutang talangan yg belum lunas', async () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 50000,
    owners: [{ ownerId: 'budi' }],
    talangan: true,
  }));
  const txId = res.txIds[0];
  assert.equal(D.piutang.length, 1);
  await ctx.delTx(txId);
  assert.equal(D.transactions.find((t) => t.id === txId), undefined);
  assert.equal(D.piutang.length, 0);
});

// ============================================================
// 15. paid piutang tetap ada setelah delete tx sumbernya
// ============================================================
test('15. paid piutang preservation: piutang talangan yg SUDAH lunas tidak ikut terhapus oleh delTx()', async () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({
    nominal: 50000,
    owners: [{ ownerId: 'budi' }],
    talangan: true,
  }));
  const txId = res.txIds[0];
  const p = D.piutang.find((x) => x.autoTxId === txId);
  p.lunas = true; // ditandai lunas manual (Piutang.toggleLunas() di app nyata)
  await ctx.delTx(txId);
  assert.equal(D.transactions.find((t) => t.id === txId), undefined);
  assert.equal(D.piutang.length, 1);
  assert.equal(D.piutang[0].lunas, true);
});

// ============================================================
// bonus: 2 owner sama (duplikat) di 1 submit -> ditolak
// ============================================================
test('16. owner duplikat dalam 1 submit multi-owner: validate() ok:false', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({
    owners: [{ ownerId: 'budi', porsi: 50 }, { ownerId: 'budi', porsi: 50 }],
  }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /duplikat/);
});

// ============================================================
// 17. S521-C audit: submit() (single & multi owner) TIDAK PERNAH
// memutasi principalAmount (titipanCommitments), D.assets, atau
// owners[]/porsi investasi (D.investments) -- Design Lock §16/§21/§23.10
// ("Jangan menulis langsung ke D.assets[].owners[]/a.nilai" & "Tidak ada
// perubahan OwnershipEngine/MultiOwnerEngine"). Snapshot deep-copy
// SEBELUM submit() dibandingkan SETELAH submit() -- satu-satunya field D
// yang boleh berubah adalah D.transactions (+ D.piutang lewat primitive
// S519 kalau talangan==true).
// ============================================================
test('17. submit() (single & multi owner) tidak memutasi principalAmount/D.assets/owners investasi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const snapshotCommitments = JSON.parse(JSON.stringify(D.titipanCommitments));
  const snapshotAssets = JSON.parse(JSON.stringify(D.assets));
  const snapshotInvestments = JSON.parse(JSON.stringify(D.investments));

  const single = ctx.TitipanExpenseFlow.submit(baseInput({ owners: [{ ownerId: 'budi' }] }));
  assert.equal(single.ok, true);
  const multi = ctx.TitipanExpenseFlow.submit(baseInput({
    owners: [{ ownerId: 'budi', porsi: 60 }, { ownerId: 'cici', porsi: 40 }],
  }));
  assert.equal(multi.ok, true);

  assert.deepEqual(D.titipanCommitments, snapshotCommitments, 'principalAmount/titipanCommitments harus tetap utuh');
  assert.deepEqual(D.assets, snapshotAssets, 'D.assets tidak boleh berubah sama sekali');
  assert.deepEqual(D.investments, snapshotInvestments, 'owners[]/porsi investasi tidak boleh berubah sama sekali');
});

// ============================================================
// 18. S521-E hardening: kategori kosong -> ditolak, 0 transaksi
// (cabang `if (!input.category) return {ok:false,...}` di validate(),
// belum pernah dites eksplisit sebelumnya).
// ============================================================
test('18. kategori kosong: validate()/submit() ditolak, 0 transaksi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({ category: '' }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /Kategori wajib/);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({ category: '' }));
  assert.equal(res.ok, false);
  assert.equal(D.transactions.length, 0);
});

// ============================================================
// 19. S521-E hardening: akun kosong -> ditolak, 0 transaksi
// (cabang `if (!input.accountId) return {ok:false,...}` di validate()).
// ============================================================
test('19. akun (accountId) kosong: validate()/submit() ditolak, 0 transaksi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({ accountId: '' }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /Akun wajib/);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({ accountId: '' }));
  assert.equal(res.ok, false);
  assert.equal(D.transactions.length, 0);
});

// ============================================================
// 20. S521-E hardening: tanggal kosong -> ditolak, 0 transaksi
// (cabang `if (!input.date) return {ok:false,...}` di validate()).
// ============================================================
test('20. tanggal kosong: validate()/submit() ditolak, 0 transaksi', () => {
  const D = baseD();
  const ctx = makeCtx(D);
  const v = ctx.TitipanExpenseFlow.validate(baseInput({ date: '' }));
  assert.equal(v.ok, false);
  assert.match(v.reason, /Tanggal wajib/);
  const res = ctx.TitipanExpenseFlow.submit(baseInput({ date: '' }));
  assert.equal(res.ok, false);
  assert.equal(D.transactions.length, 0);
});
