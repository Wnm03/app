'use strict';
// tests/acc-owners-save-linked-asset-reverse-sync-audit.test.js — audit
// lanjutan "Pemilik Sumber Potongan": arah Aset->Akun sudah disinkronkan
// (Aset.saveOwners() -> setAccOwners()), tapi arah SEBALIKNYA (Akun->Aset,
// lewat AccOwners.save()) belum pernah ada. Kalau porsi diedit dari sisi
// Akun, aset tertaut (a.accountId) tetap porsi lama -- Buku Aset/Zakat/
// Kekayaan Bersih basi, & bisa ketimpa balik kalau Aset.saveOwners()
// terpanggil lagi nanti.
//
// Fix: AccOwners.save() sekarang juga cari aset tertaut (accountId) & sync
// owners[]-nya, KECUALI aset itu tertaut Holding Investasi (investmentId --
// porsinya didikte Investment, bukan D.assets[].owners manual).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, extraGlobals) {
  let _n = 0;
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shared/multi-owner-engine.js', 'modules/asset/aset.js', 'modules/finance/akun.js'],
    Object.assign(
      {
        D,
        document: { getElementById: () => null },
        escapeHtml: (s) => String(s),
        uid: () => 'owner_' + (_n += 1),
        sameId: (a, b) => String(a) === String(b),
        save: () => {},
        toast: () => {},
        openModal: () => {},
        withSaveGuard: (key, modalId, fn) => fn(),
      },
      extraGlobals || {}
    ),
    ['OwnershipEngine', 'MultiOwnerEngine', 'Aset', 'AccOwners', 'getAccOwners', 'setAccOwners']
  );
}

test('AccOwners.save() — akun 1-owner->multi-owner ikut sync ke aset tertaut (accountId), termasuk kasus asetnya masih 1-owner (getMultiOwnerAssets() akan kelewat kasus ini)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'Majoris', nilai: 11268205, accountId: 'acc1', owners: [{ ownerId: 'SELF', porsi: 100 }] }],
    accounts: [{ id: 'acc1', name: 'Majoris', baseBalance: 11268205, includeInBalance: true, ownership: 'SELF' }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.editAccIdx = 0;
  ctx.Aset.renderList = () => {};
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [
    { ownerId: '', ownerName: 'mas sihab', porsi: 15.1219, isSelf: false },
    { ownerId: '', ownerName: 'renov', porsi: 84.8781, isSelf: false },
  ];
  ctx.AccOwners.save();

  const asset = D.assets.find((a) => a.id === 'as1');
  assert.equal(asset.owners.length, 2, 'a.owners harus ikut ter-update setelah edit porsi dari sisi Akun');
  assert.deepEqual(asset.owners.map((o) => o.ownerName).sort(), ['mas sihab', 'renov']);
});

test('AccOwners.save() — aset tertaut ke Holding Investasi (investmentId) TIDAK ikut ditulis (porsi didikte Investment, bukan sini)', () => {
  const D = {
    assets: [{ id: 'as1', name: 'RD Saham X', nilai: 5000000, accountId: 'acc1', investmentId: 'inv1', owners: [{ ownerId: 'SELF', porsi: 100 }] }],
    accounts: [{ id: 'acc1', name: 'RD Saham X', baseBalance: 5000000, includeInBalance: true, ownership: 'SELF' }],
    investments: [{ id: 'inv1', name: 'RD Saham X' }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [
    { ownerId: '', ownerName: 'A', porsi: 30, isSelf: false },
    { ownerId: '', ownerName: 'B', porsi: 70, isSelf: false },
  ];
  ctx.AccOwners.save();

  const asset = D.assets.find((a) => a.id === 'as1');
  assert.deepEqual(asset.owners, [{ ownerId: 'SELF', porsi: 100 }], 'a.owners aset ber-investmentId TIDAK BOLEH ditulis dari AccOwners.save()');
});

test('AccOwners.save() — akun tanpa aset tertaut (0 match accountId) -> tidak error, cuma sync akun', () => {
  const D = {
    assets: [],
    accounts: [{ id: 'acc1', name: 'Cash', baseBalance: 100000, includeInBalance: true }],
    transactions: [],
  };
  const ctx = makeCtx(D);
  ctx.editAccIdx = 0;
  ctx.AccOwners._accId = 'acc1';
  ctx.AccOwners._draft = [
    { ownerId: '', ownerName: 'A', porsi: 50, isSelf: false },
    { ownerId: '', ownerName: 'B', porsi: 50, isSelf: false },
  ];
  assert.doesNotThrow(() => ctx.AccOwners.save());
  assert.equal(D.accounts[0].owners.length, 2);
});
