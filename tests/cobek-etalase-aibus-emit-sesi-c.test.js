'use strict';
// tests/cobek-etalase-aibus-emit-sesi-c.test.js — Sesi C-lanjutan Shop/Cobek
// (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 / AUDIT-SESI-C-EVENTBUS-
// D-WRITES-NO-EMIT.md, Prioritas Sedang temuan #6 "Shop/Cobek — produk &
// stok, hanya order yang emit"): scope sesi ini dipersempit ke CORE CRUD
// produk & kategori (cobek-etalase.js, 4 titik) sesuai keputusan user —
// sisa titik (harga produsen/cobek-order.js, price reko & restock/
// cobek-pricing.js, inline create produsen di keranjang/cobek-tx-cart.js,
// bulk import/cobek-io.js) SENGAJA belum disentuh, jadi backlog sesi
// berikutnya.
//
// Event BARU "product.updated" (belum ada presedennya sebelum sesi ini),
// payload konsisten skema kind/action yang sudah ada di finance.updated/
// asset.updated dkk:
// - Etalase._saveInner(): create/edit produk (1 emit menutupi ke-3 jalur
//   koreksi-stok/beli-stok/update-biasa, pola sama tagihan-kalender.js)
//   -> product.updated {kind:"produk",action,productId,name}
// - Etalase.delete(i): hapus produk
//   -> product.updated {kind:"produk",action:"delete",deletedId,name}
// - Etalase.addKategoriManual(): create & rename kategori (2 cabang
//   terpisah, pola sama PBB.ikatTagihan() sesi Zakat/PBB)
//   -> product.updated {kind:"kategori",action,categoryId,name}
// - Etalase.delKategori(id): hapus kategori
//   -> product.updated {kind:"kategori",action:"delete",deletedId,name}
//
// Harness: reuse pola makeDoc()/fakeEls dari
// tests/product-ownership-foundation.test.js (Etalase.save() penuh lewat
// DOM), + AIBus event collector pola sama sesi-sesi Sesi C sebelumnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides = {}) {
  return Object.assign(
    {
      products: [],
      produsen: [],
      cobekKategori: [],
      accounts: [{ id: 'acc1', name: 'Cash', emoji: '💵' }],
      transactions: [],
    },
    overrides,
  );
}

function baseFakeEls(extra = {}) {
  return Object.assign(
    {
      pName: { value: 'Cobek Batu 20cm' },
      pStock: { value: '5' },
      pKategori: { value: '' },
      pProdusen: null,
      pBeli: { value: '0' },
      pJual: { value: '50000' },
      pReseller: { value: '' },
      pDiskon: { value: '' },
      pBeratPerUnit: null,
      pPanjang: null,
      pLebar: null,
      pTinggi: null,
      pAcc: { value: 'acc1' },
      pOwnership: null,
    },
    extra,
  );
}

function makeCtx({ D, els = {}, extra = {} }) {
  const aibusEvents = [];
  const fakeDocument = { getElementById: (id) => (id in els ? els[id] : null), querySelectorAll: () => [] };
  const ctx = loadSource(
    ['modules/shop/generic/category-store.js', 'modules/shop/cobek-etalase.js'],
    Object.assign(
      {
        D,
        document: fakeDocument,
        escapeHtml: (s) => String(s),
        fmt: (n) => String(n),
        fmtFull: (n) => String(n),
        shopKategoriName: () => '',
        resolveShopKategori(name) {
          name = (name || '').trim();
          if (!name) return '';
          let cat = D.cobekKategori.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!cat) { cat = { id: 'ck_' + (D.cobekKategori.length + 1), name }; D.cobekKategori.push(cat); }
          return cat.id;
        },
        openModal() {}, closeModal() {},
        toast() {},
        uid: (() => { let n = 1; return () => 'u' + (n++); })(),
        save() {},
        withSaveGuard: (key, modalId, fn) => fn(),
        renderDashboard() {}, renderKeuangan() {},
        askConfirm: async () => true,
        AIBus: { emit(name, payload) { aibusEvents.push({ name, payload }); } },
      },
      extra,
    ),
    ['Etalase'],
  );
  ctx.__aibusEvents = aibusEvents;
  return ctx;
}

test('Etalase.save() — produk baru (update biasa, tanpa stok/tx) emit product.updated {kind:"produk",action:"create"}', () => {
  const D = makeD();
  const ctx = makeCtx({ D, els: baseFakeEls({ pStock: { value: '0' } }) });
  ctx.Etalase.editIdx = null;

  ctx.Etalase.save();

  assert.equal(D.products.length, 1, '0 regresi: produk tetap tersimpan seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat produk baru disimpan');
  assert.equal(ev.payload.kind, 'produk');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.productId, D.products[0].id);
});

test('Etalase.save() — edit produk existing emit product.updated {action:"edit"}', () => {
  const D = makeD({ products: [{ id: 'prod_1', name: 'Lama', stock: 0, hargaBeli: 0, hargaJual: 10000, hargaByProdusen: {} }] });
  const ctx = makeCtx({ D, els: baseFakeEls({ pName: { value: 'Baru' }, pStock: { value: '0' } }) });
  ctx.Etalase.editIdx = 0;

  ctx.Etalase.save();

  assert.equal(D.products[0].name, 'Baru', '0 regresi: nama tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev);
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.productId, 'prod_1');
});

test('Etalase.save() — produk baru dgn stok & harga beli (jalur transaksi pengeluaran) tetap emit 1x product.updated', () => {
  const D = makeD();
  const ctx = makeCtx({ D, els: baseFakeEls({ pStock: { value: '5' }, pBeli: { value: '10000' } }) });
  ctx.Etalase.editIdx = null;

  ctx.Etalase.save();

  assert.equal(D.transactions.length, 1, '0 regresi: transaksi pengeluaran tetap tercatat seperti sebelumnya');
  const evs = ctx.__aibusEvents.filter((e) => e.name === 'product.updated');
  assert.equal(evs.length, 1, 'hanya 1 emit (bukan dobel) meski jalur ini juga menulis D.transactions');
  assert.equal(evs[0].payload.action, 'create');
});

test('Etalase.save() — jalur Koreksi Stok tetap emit 1x product.updated', () => {
  const D = makeD({ products: [{ id: 'prod_2', name: 'X', stock: 2, hargaBeli: 0, hargaJual: 10000, hargaByProdusen: {} }] });
  const ctx = makeCtx({ D, els: baseFakeEls({ pName: { value: 'X' }, pStock: { value: '9' } }) });
  ctx.Etalase.editIdx = 0;
  ctx.Etalase.stockKoreksiState = true;

  ctx.Etalase.save();

  assert.equal(D.products[0].stock, 9, '0 regresi: stok tetap terkoreksi seperti sebelumnya');
  assert.equal(D.transactions.length, 0, '0 regresi: koreksi stok tetap tidak bikin transaksi');
  const evs = ctx.__aibusEvents.filter((e) => e.name === 'product.updated');
  assert.equal(evs.length, 1);
  assert.equal(evs[0].payload.action, 'edit');
});

test('Etalase.delete(i) — hapus produk emit product.updated {kind:"produk",action:"delete",deletedId}', async () => {
  const D = makeD({ products: [{ id: 'prod_9', name: 'Dihapus' }] });
  const ctx = makeCtx({ D, els: {} });

  await ctx.Etalase.delete(0);

  assert.equal(D.products.length, 0, '0 regresi: produk tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat produk dihapus');
  assert.equal(ev.payload.kind, 'produk');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'prod_9');
});

test('Etalase.addKategoriManual() — tambah kategori baru emit product.updated {kind:"kategori",action:"create"}', () => {
  const D = makeD();
  const els = { cobekKategoriNewInput: { value: 'Kategori Baru' } };
  const ctx = makeCtx({ D, els });

  ctx.Etalase.addKategoriManual();

  assert.equal(D.cobekKategori.length, 1, '0 regresi: kategori tetap tertambah seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat kategori baru ditambah');
  assert.equal(ev.payload.kind, 'kategori');
  assert.equal(ev.payload.action, 'create');
  assert.equal(ev.payload.categoryId, D.cobekKategori[0].id);
});

test('Etalase.addKategoriManual() — rename kategori existing emit product.updated {action:"edit"}', () => {
  const D = makeD({ cobekKategori: [{ id: 'ck_1', name: 'Lama' }] });
  const els = { cobekKategoriNewInput: { value: 'Baru' } };
  const ctx = makeCtx({ D, els });
  ctx.Etalase.katEditId = 'ck_1';

  ctx.Etalase.addKategoriManual();

  assert.equal(D.cobekKategori[0].name, 'Baru', '0 regresi: nama kategori tetap ter-update seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev);
  assert.equal(ev.payload.kind, 'kategori');
  assert.equal(ev.payload.action, 'edit');
  assert.equal(ev.payload.categoryId, 'ck_1');
});

test('Etalase.delKategori(id) — hapus kategori emit product.updated {kind:"kategori",action:"delete",deletedId}', async () => {
  const D = makeD({ cobekKategori: [{ id: 'ck_2', name: 'Dihapus' }], products: [] });
  const ctx = makeCtx({ D, els: {} });

  await ctx.Etalase.delKategori('ck_2');

  assert.equal(D.cobekKategori.length, 0, '0 regresi: kategori tetap terhapus seperti sebelumnya');
  const ev = ctx.__aibusEvents.find((e) => e.name === 'product.updated');
  assert.ok(ev, 'AIBus.emit("product.updated", ...) harus terpanggil saat kategori dihapus');
  assert.equal(ev.payload.kind, 'kategori');
  assert.equal(ev.payload.action, 'delete');
  assert.equal(ev.payload.deletedId, 'ck_2');
});

test('AIBus tidak ada (typeof AIBus==="undefined") — save()/delete()/kategori tetap tidak throw (guard konsisten pola lama)', async () => {
  const D = makeD();
  const ctx = makeCtx({ D, els: baseFakeEls({ pStock: { value: '0' } }), extra: { AIBus: undefined } });
  ctx.Etalase.editIdx = null;

  assert.doesNotThrow(() => ctx.Etalase.save());
  await assert.doesNotReject(async () => { await ctx.Etalase.delete(0); });

  const els2 = { cobekKategoriNewInput: { value: 'Kategori Tanpa Bus' } };
  const ctx2 = makeCtx({ D: makeD(), els: els2, extra: { AIBus: undefined } });
  assert.doesNotThrow(() => ctx2.Etalase.addKategoriManual());
});
