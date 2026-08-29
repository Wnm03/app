'use strict';
// tests/asset-owners-linked-account-ownership-sync-s437.test.js — Sesi 437:
// audit "porsi kepemilikan & ownership harus single source of truth" —
// ditemukan gap: akun 🏦 yang ditautkan ke Aset (assetAccId) TIDAK ikut
// mewarisi field `ownership` (OwnershipEngine) milik asetnya, kecuali kalau
// akunnya baru dibuat otomatis lewat opsi "__new__" (Aset.save()). Kalau
// user menautkan ke akun yang SUDAH ADA, atau porsi kepemilikan aset
// diubah lewat modal ⚖️ Atur Porsi Kepemilikan (saveOwners()), `ownership`
// akun tertaut tetap nyangkut ke nilai lama (biasanya SELF/default) —
// OwnershipEngine jadi TIDAK lagi single source of truth utk akun tsb
// (mis. akun tetap ikut Total Saldo Kas walau asetnya ownership INVESTOR).
//
// Fix: Aset.save() (jalur akun EXISTING) & Aset.saveOwners() sekarang ikut
// menyamakan `linkedAcc.ownership` ke ownership aset (arah sync SATU ARAH,
// Aset -> Akun, sama pola dgn sync saldo baseBalance/balance yang sudah ada
// sejak Sesi C/422e).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extraGlobals) {
  let _n = 0;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/finance/akun.js', 'modules/asset/aset-owners.js', 'modules/asset/aset.js'],
    Object.assign(
      {
        D,
        escapeHtml: (s) => String(s),
        uid: () => 'owner_' + (_n += 1),
        sameId: (a, b) => String(a) === String(b),
        save: () => { if (typeof invalidateAccBalCache === 'function') invalidateAccBalCache(); },
        toast: () => {},
        withSaveGuard: (key, modalId, fn) => fn(),
      },
      extraGlobals || {}
    ),
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'recalcAccBalance']
  );
}

test('saveOwners() — akun tertaut ikut disamakan ownership-nya ke ownership aset (INVESTOR)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Ruko Patungan', nilai: 1000000000, accountId: 'acc1', ownership: 'INVESTOR', owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'budi', porsi: 40, ownerName: 'Budi' }] }],
    accounts: [{ id: 'acc1', name: 'Rek Patungan', baseBalance: 600000000, includeInBalance: true, ownership: 'SELF' }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 80, isSelf: true },
    { ownerId: 'budi', ownerName: 'Budi', porsi: 20, isSelf: false },
  ];
  ctx.Aset.saveOwners();
  const acc = D.accounts.find((a) => a.id === 'acc1');
  assert.equal(acc.ownership, 'INVESTOR');
});

test('saveOwners() — aset tanpa field ownership (data lama) -> akun tertaut fallback SELF via OwnershipEngine.resolve()', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Ruko Patungan', nilai: 1000000000, accountId: 'acc1', owners: [{ ownerId: 'SELF', porsi: 60 }, { ownerId: 'budi', porsi: 40, ownerName: 'Budi' }] }],
    accounts: [{ id: 'acc1', name: 'Rek Patungan', baseBalance: 600000000, includeInBalance: true, ownership: 'CUSTOMER' }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.Aset.renderList = () => {};
  ctx.Aset._ownersModalAsset = D.assets[0];
  ctx.Aset._ownersDraft = [
    { ownerId: 'SELF', ownerName: 'Milik Sendiri', porsi: 80, isSelf: true },
    { ownerId: 'budi', ownerName: 'Budi', porsi: 20, isSelf: false },
  ];
  ctx.Aset.saveOwners();
  const acc = D.accounts.find((a) => a.id === 'acc1');
  assert.equal(acc.ownership, 'SELF');
});

test('Aset.save() — menautkan ke akun EXISTING ikut menyamakan ownership akun ke ownership aset yang dipilih di form', () => {
  const D = {
    assets: [],
    accounts: [{ id: 'acc1', name: 'Rek Sewa', baseBalance: 0, balance: 0, includeInBalance: true, ownership: 'SELF' }],
    transactions: [],
  };
  const fields = {
    assetName: 'Kios Disewakan',
    assetJenis: 'Rumah/Bangunan',
    assetLokasi: '',
    assetNilai: '50000000',
    assetModalInvestasi: '',
    assetHargaBeli: '',
    assetJumlahUnit: '',
    assetTanggal: '',
    assetAccId: 'acc1',
    assetOwnership: 'INVESTOR',
  };
  const document = {
    getElementById: (id) => {
      if (!(id in fields)) return null;
      return { value: fields[id] };
    },
  };
  const ctx = makeCtx(D, {
    document,
    parsePzNum: (s) => Number(String(s || '0').replace(/[^0-9.-]/g, '')) || 0,
    parseDecStr: () => null,
    closeModal: () => {},
    renderKekayaanBersih: () => {},
    hitungZakatMaal: () => {},
    renderAccGrid: () => {},
    renderDashAccList: () => {},
    renderLapAccList: () => {},
    populateKeuFilters: () => {},
  });
  ctx.Aset.editId = null;
  ctx.Aset._zakatableState = false;
  ctx.Aset.renderList = () => {};
  ctx.Aset.save();
  const acc = D.accounts.find((a) => a.id === 'acc1');
  assert.equal(acc.ownership, 'INVESTOR');
});
