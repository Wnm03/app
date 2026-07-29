'use strict';
// tests/product-ownership-foundation.test.js — Product Ownership Foundation
// (modul Inventory/Shop). Reuse OwnershipEngine (Sesi 191), pola PERSIS
// isCobekOwnershipSelf() (cobek-order.js, S194) / isVehicleOwnershipSelf()
// (vehicle-core.js, S196).
//
// Target yang dites di sini:
//   - isProductOwnershipSelf(p): SELF (eksplisit/default) -> true,
//     INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> false, guard tanpa engine ->
//     fallback true (regresi lama tetap jalan).
//   - Etalase.totalModalStok()/totalNilaiJualStok(): HANYA menghitung produk
//     ownership SELF (di titik sumber, Etalase) — produk non-SELF TIDAK
//     dihapus dari D.products, cuma dikecualikan dari agregat.
//   - Migrasi data lama: produk tanpa field `ownership` sama sekali (data
//     lama sebelum sesi ini) tetap dianggap SELF (resolve() fallback),
//     TIDAK ada produk existing yang tiba-tiba ke-exclude/hilang dari
//     agregat, 100% backward compatible.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return {
    products: [
      // Produk lama (sebelum sesi ini): TIDAK ada field ownership sama
      // sekali -> migrasi via resolve() fallback ke SELF, tetap dihitung.
      { id: 'p1', name: 'Cobek 19-20cm', stock: 10, hargaBeli: 20000, hargaJual: 40000 },
      // SELF eksplisit (produk baru disimpan lewat modal setelah sesi ini).
      { id: 'p2', name: 'Lumpang 20cm', stock: 5, hargaBeli: 30000, hargaJual: 60000, ownership: 'SELF' },
      // INVESTOR: harus dikecualikan dari totalModalStok/totalNilaiJualStok,
      // TAPI tetap ada di D.products (histori/etalase tidak dihapus).
      { id: 'p3', name: 'Cobek Investor 25cm', stock: 100, hargaBeli: 999999, hargaJual: 999999, ownership: 'INVESTOR' },
      // CUSTOMER (lowercase, harus dinormalisasi & dikecualikan juga).
      { id: 'p4', name: 'Titipan Customer', stock: 50, hargaBeli: 500000, hargaJual: 900000, ownership: 'customer' },
    ],
    produsen: [],
    cobekKategori: [],
    accounts: [],
    transactions: [],
  };
}

function makeCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      shopKategoriName: () => '',
      resolveShopKategori: () => '',
    },
    ['OwnershipEngine', 'Etalase', 'isProductOwnershipSelf'],
  );
}

test('isProductOwnershipSelf() — produk lama tanpa field ownership -> true (default SELF, migrasi)', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isProductOwnershipSelf(D.products[0]), true);
});

test('isProductOwnershipSelf() — ownership eksplisit SELF -> true', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isProductOwnershipSelf(D.products[1]), true);
});

test('isProductOwnershipSelf() — INVESTOR/CUSTOMER (case-insensitive) -> false', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  assert.equal(ctx.isProductOwnershipSelf(D.products[2]), false);
  assert.equal(ctx.isProductOwnershipSelf(D.products[3]), false);
});

test('isProductOwnershipSelf() — kalau OwnershipEngine tidak dimuat, fallback true (regresi lama tetap jalan)', () => {
  const D = makeD();
  const ctx = loadSource(
    ['modules/shop/cobek-etalase.js'],
    { D, escapeHtml: (s) => String(s), fmt: (n) => String(n), fmtFull: (n) => String(n), shopKategoriName: () => '', resolveShopKategori: () => '' },
    ['isProductOwnershipSelf'],
  );
  assert.equal(ctx.isProductOwnershipSelf(D.products[2]), true, 'tanpa engine, dianggap SELF (tidak exclude apa pun)');
});

test('Etalase.totalModalStok() — HANYA menghitung produk ownership SELF (default & eksplisit), INVESTOR/CUSTOMER dikecualikan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // p1 (default SELF): 10*20000=200000, p2 (SELF eksplisit): 5*30000=150000
  // p3 (INVESTOR) & p4 (CUSTOMER) dikecualikan meski nilainya jauh lebih besar.
  assert.equal(ctx.Etalase.totalModalStok(), 200000 + 150000);
});

test('Etalase.totalNilaiJualStok() — HANYA menghitung produk ownership SELF, INVESTOR/CUSTOMER dikecualikan', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  // p1: 10*40000=400000, p2: 5*60000=300000
  assert.equal(ctx.Etalase.totalNilaiJualStok(), 400000 + 300000);
});

test('Etalase.totalModalStok()/totalNilaiJualStok() — D.products TIDAK dihapus/dimutasi, produk non-SELF tetap ada di etalase', () => {
  const D = makeD();
  const ctx = makeCtx(D);
  ctx.Etalase.totalModalStok();
  ctx.Etalase.totalNilaiJualStok();
  assert.equal(D.products.length, 4, 'semua 4 produk (termasuk non-SELF) tetap tersimpan di D.products');
});

test('Etalase.totalModalStok()/totalNilaiJualStok() — kalau semua produk SELF (belum ada ownership sama sekali), hasil sama seperti sebelum fitur ini (regresi lama tetap jalan)', () => {
  const D = {
    products: [
      { id: 'p1', name: 'A', stock: 2, hargaBeli: 1000, hargaJual: 2000 },
      { id: 'p2', name: 'B', stock: 3, hargaBeli: 500, hargaJual: 900 },
    ],
    produsen: [], cobekKategori: [], accounts: [], transactions: [],
  };
  const ctx = makeCtx(D);
  assert.equal(ctx.Etalase.totalModalStok(), 2 * 1000 + 3 * 500);
  assert.equal(ctx.Etalase.totalNilaiJualStok(), 2 * 2000 + 3 * 900);
});

test('Etalase.save() — produk baru: ownership default SELF kalau dropdown #pOwnership tidak ada di DOM', () => {
  const D = { products: [], produsen: [], cobekKategori: [], accounts: [{ id: 'acc1', name: 'Cash', emoji: '💵' }], transactions: [] };
  const fakeEls = {
    pName: { value: 'Produk Baru' },
    pStock: { value: '5' },
    pKategori: { value: '' },
    pProdusen: null,
    pBeli: { value: '1000' },
    pJual: { value: '2000' },
    pReseller: { value: '' },
    pDiskon: { value: '' },
    pBeratPerUnit: null,
    pPanjang: null,
    pLebar: null,
    pTinggi: null,
    pAcc: { value: 'acc1' },
    pOwnership: null,
  };
  const fakeDocument = { getElementById: (id) => (id in fakeEls ? fakeEls[id] : null) };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      shopKategoriName: () => '',
      resolveShopKategori: () => '',
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      uid: () => 'tx1',
      save: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
    },
    ['Etalase'],
  );
  ctx.Etalase.editIdx = null;
  ctx.Etalase.save();
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].ownership, 'SELF');
});

test('Etalase.save() — produk baru: ownership diambil & dinormalisasi dari dropdown #pOwnership (mis. INVESTOR)', () => {
  const D = { products: [], produsen: [], cobekKategori: [], accounts: [{ id: 'acc1', name: 'Cash', emoji: '💵' }], transactions: [] };
  const fakeEls = {
    pName: { value: 'Produk Investor' },
    pStock: { value: '0' },
    pKategori: { value: '' },
    pProdusen: null,
    pBeli: { value: '0' },
    pJual: { value: '5000' },
    pReseller: { value: '' },
    pDiskon: { value: '' },
    pBeratPerUnit: null,
    pPanjang: null,
    pLebar: null,
    pTinggi: null,
    pAcc: { value: 'acc1' },
    pOwnership: { value: 'investor' },
  };
  const fakeDocument = { getElementById: (id) => (id in fakeEls ? fakeEls[id] : null) };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      shopKategoriName: () => '',
      resolveShopKategori: () => '',
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      uid: () => 'tx1',
      save: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
    },
    ['Etalase'],
  );
  ctx.Etalase.editIdx = null;
  ctx.Etalase.save();
  assert.equal(D.products.length, 1);
  assert.equal(D.products[0].ownership, 'INVESTOR');
  // Produk INVESTOR baru harus langsung dikecualikan dari totalModalStok (0, karena hargaBeli=0 juga, jadi cek via totalNilaiJualStok)
  assert.equal(ctx.Etalase.totalNilaiJualStok(), 0, 'produk INVESTOR tidak ikut dihitung ke totalNilaiJualStok');
});

test('Etalase.save() — edit produk lama tanpa field ownership: setelah disimpan ulang, ownership dipatenkan eksplisit sesuai dropdown (migrasi on-edit)', () => {
  const D = {
    products: [{ id: 'prod_old', name: 'Produk Lama', stock: 10, hargaBeli: 1000, hargaJual: 2000, produsenId: '', hargaByProdusen: {} }],
    produsen: [], cobekKategori: [], accounts: [{ id: 'acc1', name: 'Cash', emoji: '💵' }], transactions: [],
  };
  assert.equal('ownership' in D.products[0], false, 'produk lama belum punya field ownership sama sekali');
  const fakeEls = {
    pName: { value: 'Produk Lama' },
    pStock: { value: '10' },
    pKategori: { value: '' },
    pProdusen: null,
    pBeli: { value: '1000' },
    pJual: { value: '2000' },
    pReseller: { value: '' },
    pDiskon: { value: '' },
    pBeratPerUnit: null,
    pPanjang: null,
    pLebar: null,
    pTinggi: null,
    pAcc: { value: 'acc1' },
    pOwnership: { value: 'SELF' },
  };
  const fakeDocument = { getElementById: (id) => (id in fakeEls ? fakeEls[id] : null) };
  const ctx = loadSource(
    ['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'],
    {
      D,
      document: fakeDocument,
      escapeHtml: (s) => String(s),
      fmt: (n) => String(n),
      fmtFull: (n) => String(n),
      shopKategoriName: () => '',
      resolveShopKategori: () => '',
      openModal: () => {},
      closeModal: () => {},
      toast: () => {},
      uid: () => 'tx1',
      save: () => {},
      renderDashboard: () => {},
      renderKeuangan: () => {},
    },
    ['Etalase'],
  );
  ctx.Etalase.editIdx = 0;
  ctx.Etalase.save();
  assert.equal(D.products[0].ownership, 'SELF');
});
