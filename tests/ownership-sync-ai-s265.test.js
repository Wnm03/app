'use strict';
// tests/ownership-sync-ai-s265.test.js — cakupan Sesi 265 (AI Ownership
// Sync). Lanjutan audit modules/ai/* dari Sesi 197/260: menutup gap yang
// BELUM disentuh sesi-sesi sebelumnya — 0 helper ownership baru dibuat, 0
// business logic lama diubah, murni nambah filter SELF di atas titik baca
// D.assets/D.products/D.cobek/D.piutang/D.debts yang masih mentah:
//
//   - AI Context:  _aiContextAsset()        (modules/ai/ai-core.js) —
//                  assetCount HANYA aset ownership SELF, reuse
//                  isAssetOwnershipSelf() (aset.js, Sesi 193).
//   - AI Context:  _aiContextShop()         (modules/ai/ai-core.js) —
//                  productCount & recentAvgMarginPct HANYA produk/transaksi
//                  Cobek ownership SELF, reuse isProductOwnershipSelf()/
//                  isCobekOwnershipSelf() (Sesi 191/194, dipakai S260 di
//                  feature-insights.js tapi belum di ai-core.js).
//   - AI Service:  _aiLastPendingCobekOrder() (modules/ai/ai-service.js) —
//                  Delivery Summary AI Daily Briefing HANYA pesanan Cobek
//                  ownership SELF, reuse isCobekOwnershipSelf().
//   - AI Insight:  PiutangUtangInsight.compute() (modules/ai/feature-insights.js)
//                  — insight jatuh tempo HANYA piutang/utang ownership SELF,
//                  reuse isPiutangOwnershipSelf()/isDebtOwnershipSelf()
//                  (piutang-utang.js, Sesi 255).
//
// RULE yang dites (SAMA PERSIS sesi ownership sync sebelumnya):
//   - SELF (eksplisit atau default/tanpa field ownership) -> dihitung normal.
//   - INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY -> DIKECUALIKAN dari context/
//     insight AI di atas, TAPI D.* sendiri TIDAK dimutasi/dihapus.
//   - Guard typeof: kalau helper ownership belum dimuat, fallback anggap
//     semua SELF (tidak exclude apa pun) — konsisten sesi-sesi sebelumnya.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSource } = require('./helpers/loadSource');

function extractFnSource(src, fnName) {
  const marker = `function ${fnName}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`"${marker}" tidak ditemukan`);
  const braceOpen = src.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}

// ------ (1) AI Context: _aiContextAsset() (ai-core.js) ------

function loadAiContextAssetSandbox(D, isAssetOwnershipSelf, netWorthForecast) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'ai', 'ai-core.js'), 'utf8');
  const context = { console, D, isAssetOwnershipSelf, netWorthForecast };
  vm.createContext(context);
  const snippet = `${extractFnSource(SRC, '_aiContextAsset')}\nthis._aiContextAsset = _aiContextAsset;`;
  vm.runInContext(snippet, context, { filename: 'ai-context-asset-extract.js' });
  return context;
}

function makeAssetD() {
  return {
    assets: [
      { id: 'a1', name: 'Emas Sendiri' }, // tanpa ownership -> default SELF
      { id: 'a2', name: 'Tabungan Sendiri', ownership: 'SELF' },
      { id: 'a3', name: 'Aset Investor', ownership: 'INVESTOR' },
      { id: 'a4', name: 'Aset Titipan', ownership: 'customer' }, // lowercase
      { id: 'a5', name: 'Aset Keluarga', ownership: 'FAMILY' },
    ],
  };
}

test('_aiContextAsset() — assetCount HANYA hitung aset ownership SELF (default+eksplisit)', () => {
  const D = makeAssetD();
  const netWorthForecast = () => ({ ok: true, netWorthNow: 1000000, projectedEnd: 1100000, metode: 'linear' });
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/asset/aset.js'], { D }, ['isAssetOwnershipSelf']);
  const sandbox = loadAiContextAssetSandbox(D, ctx.isAssetOwnershipSelf, netWorthForecast);
  const result = sandbox._aiContextAsset();
  assert.equal(result.available, true);
  assert.equal(result.assetCount, 2, 'a1 (default SELF) + a2 (SELF) = 2, a3/a4/a5 dikecualikan');
});

test('_aiContextAsset() — isAssetOwnershipSelf belum ada -> semua aset dihitung (fallback SELF)', () => {
  const D = makeAssetD();
  const netWorthForecast = () => ({ ok: true, netWorthNow: 1000000, projectedEnd: 1100000, metode: 'linear' });
  const sandbox = loadAiContextAssetSandbox(D, undefined, netWorthForecast);
  const result = sandbox._aiContextAsset();
  assert.equal(result.assetCount, 5);
});

test('_aiContextAsset() — D.assets TIDAK dimutasi oleh filter ownership', () => {
  const D = makeAssetD();
  const before = JSON.stringify(D.assets);
  const netWorthForecast = () => ({ ok: true, netWorthNow: 1000000, projectedEnd: 1100000, metode: 'linear' });
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/asset/aset.js'], { D }, ['isAssetOwnershipSelf']);
  const sandbox = loadAiContextAssetSandbox(D, ctx.isAssetOwnershipSelf, netWorthForecast);
  sandbox._aiContextAsset();
  assert.equal(JSON.stringify(D.assets), before);
});

// ------ (2) AI Context: _aiContextShop() (ai-core.js) ------

function loadAiContextShopSandbox(D, isProductOwnershipSelf, isCobekOwnershipSelf) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'ai', 'ai-core.js'), 'utf8');
  const context = {
    console, D, isProductOwnershipSelf, isCobekOwnershipSelf,
    _deliveryLowStockCheck: undefined,
  };
  vm.createContext(context);
  const snippet = `${extractFnSource(SRC, '_aiContextShop')}\nthis._aiContextShop = _aiContextShop;`;
  vm.runInContext(snippet, context, { filename: 'ai-context-shop-extract.js' });
  return context;
}

function makeShopD() {
  return {
    products: [
      { id: 'p1', name: 'Batu A' }, // default SELF
      { id: 'p2', name: 'Batu B', ownership: 'SELF' },
      { id: 'p3', name: 'Batu Investor', ownership: 'INVESTOR' },
      { id: 'p4', name: 'Batu Titipan', ownership: 'THIRD_PARTY' },
    ],
    cobek: [
      { id: 1, date: '2026-07-01', profit: 10000, total: 100000 }, // default SELF
      { id: 2, date: '2026-07-02', profit: 20000, total: 100000, ownership: 'SELF' },
      { id: 3, date: '2026-07-03', profit: 30000, total: 100000, ownership: 'INVESTOR' },
    ],
  };
}

test('_aiContextShop() — productCount HANYA produk ownership SELF', () => {
  const D = makeShopD();
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'], { D }, ['isProductOwnershipSelf']);
  const ctx2 = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js'], { D }, ['isCobekOwnershipSelf']);
  const sandbox = loadAiContextShopSandbox(D, ctx.isProductOwnershipSelf, ctx2.isCobekOwnershipSelf);
  const result = sandbox._aiContextShop();
  assert.equal(result.available, true);
  assert.equal(result.productCount, 2, 'p1 (default SELF) + p2 (SELF) = 2, p3/p4 dikecualikan');
});

test('_aiContextShop() — recentAvgMarginPct HANYA hitung transaksi Cobek ownership SELF', () => {
  const D = makeShopD();
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-etalase.js'], { D }, ['isProductOwnershipSelf']);
  const ctx2 = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js'], { D }, ['isCobekOwnershipSelf']);
  const sandbox = loadAiContextShopSandbox(D, ctx.isProductOwnershipSelf, ctx2.isCobekOwnershipSelf);
  const result = sandbox._aiContextShop();
  // Hanya cobek id 1 & 2 (SELF): margin masing2 10% & 20% -> rata2 15%.
  assert.equal(result.recentOrdersConsidered, 2);
  assert.equal(result.recentAvgMarginPct, 15);
});

test('_aiContextShop() — helper ownership belum ada -> semua produk/transaksi dihitung (fallback SELF)', () => {
  const D = makeShopD();
  const sandbox = loadAiContextShopSandbox(D, undefined, undefined);
  const result = sandbox._aiContextShop();
  assert.equal(result.productCount, 4);
  assert.equal(result.recentOrdersConsidered, 3);
});

// ------ (3) AI Service: _aiLastPendingCobekOrder() (ai-service.js) ------

function loadAiLastPendingSandbox(D, isCobekOwnershipSelf) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'modules', 'ai', 'ai-service.js'), 'utf8');
  const context = { console, D, isCobekOwnershipSelf };
  vm.createContext(context);
  const snippet = `${extractFnSource(SRC, '_aiLastPendingCobekOrder')}\nthis._aiLastPendingCobekOrder = _aiLastPendingCobekOrder;`;
  vm.runInContext(snippet, context, { filename: 'ai-last-pending-cobek-extract.js' });
  return context;
}

test('_aiLastPendingCobekOrder() — lewati pesanan pending non-SELF, ambil yang SELF terbaru', () => {
  const D = {
    cobek: [
      { id: 1, items: [{ name: 'x' }], delivered: false, ownership: 'SELF' },
      { id: 2, items: [{ name: 'y' }], delivered: false, ownership: 'INVESTOR' }, // terbaru tapi non-SELF
    ],
  };
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js'], { D }, ['isCobekOwnershipSelf']);
  const sandbox = loadAiLastPendingSandbox(D, ctx.isCobekOwnershipSelf);
  const result = sandbox._aiLastPendingCobekOrder();
  assert.equal(result.id, 1, 'pesanan id 2 (INVESTOR) dikecualikan walau lebih baru');
});

test('_aiLastPendingCobekOrder() — semua pending non-SELF -> null', () => {
  const D = {
    cobek: [
      { id: 1, items: [{ name: 'x' }], delivered: false, ownership: 'CUSTOMER' },
    ],
  };
  const ctx = loadSource(['modules/shared/ownership-engine.js', 'modules/shop/cobek-order.js'], { D }, ['isCobekOwnershipSelf']);
  const sandbox = loadAiLastPendingSandbox(D, ctx.isCobekOwnershipSelf);
  const result = sandbox._aiLastPendingCobekOrder();
  assert.equal(result, null);
});

test('_aiLastPendingCobekOrder() — isCobekOwnershipSelf belum ada -> fallback SELF (pesanan terbaru apa adanya)', () => {
  const D = {
    cobek: [
      { id: 1, items: [{ name: 'x' }], delivered: false, ownership: 'SELF' },
      { id: 2, items: [{ name: 'y' }], delivered: false, ownership: 'INVESTOR' },
    ],
  };
  const sandbox = loadAiLastPendingSandbox(D, undefined);
  const result = sandbox._aiLastPendingCobekOrder();
  assert.equal(result.id, 2);
});

// ------ (4) AI Insight: PiutangUtangInsight.compute() (feature-insights.js) ------

function makeInsightD() {
  return {
    piutang: [
      { id: 'pu1', name: 'Piutang Sendiri', nilai: 500000, lunas: false, jatuhTempo: '2026-07-27' }, // default SELF, besok
      { id: 'pu2', name: 'Piutang Investor', nilai: 900000, lunas: false, jatuhTempo: '2026-07-27', ownership: 'INVESTOR' },
    ],
    debts: [
      { id: 'du1', name: 'Utang Sendiri', nilai: 700000, lunas: false, jatuhTempo: '2026-07-27' }, // default SELF, besok
      { id: 'du2', name: 'Utang Titipan', nilai: 800000, lunas: false, jatuhTempo: '2026-07-27', ownership: 'THIRD_PARTY' },
    ],
  };
}

function makeFeatureInsightCtx(D) {
  return loadSource(
    ['modules/shared/ownership-engine.js', 'modules/finance/piutang-utang.js', 'modules/ai/feature-insights.js'],
    {
      D,
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp ' + Math.round(n || 0),
      fmtFull: (n) => 'Rp ' + Math.round(n || 0),
      daysUntilDate: (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date('2026-07-26T00:00:00');
        return Math.round((d - now) / 86400000);
      },
      save: () => {},
      sameId: (a, b) => a === b,
    },
    ['PiutangUtangInsight'],
  );
}

test('PiutangUtangInsight.compute() — piutang jatuh tempo non-SELF TIDAK memunculkan insight nagih', () => {
  const D = makeInsightD();
  const ctx = makeFeatureInsightCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  const piutangItems = out.filter((x) => x.id.startsWith('piutang-due-'));
  assert.equal(piutangItems.length, 1);
  assert.equal(piutangItems[0].id, 'piutang-due-pu1');
});

test('PiutangUtangInsight.compute() — utang jatuh tempo non-SELF TIDAK memunculkan insight nagih', () => {
  const D = makeInsightD();
  const ctx = makeFeatureInsightCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  const debtItems = out.filter((x) => x.id.startsWith('debt-due-'));
  assert.equal(debtItems.length, 1);
  assert.equal(debtItems[0].id, 'debt-due-du1');
});

test('PiutangUtangInsight.compute() — semua piutang/utang non-SELF -> tidak ada insight jatuh tempo', () => {
  const D = {
    piutang: [{ id: 'pu1', name: 'Piutang Investor', nilai: 500000, lunas: false, jatuhTempo: '2026-07-27', ownership: 'INVESTOR' }],
    debts: [{ id: 'du1', name: 'Utang Keluarga', nilai: 700000, lunas: false, jatuhTempo: '2026-07-27', ownership: 'FAMILY' }],
  };
  const ctx = makeFeatureInsightCtx(D);
  const out = ctx.PiutangUtangInsight.compute();
  assert.equal(out.filter((x) => x.id.startsWith('piutang-due-')).length, 0);
  assert.equal(out.filter((x) => x.id.startsWith('debt-due-')).length, 0);
});

test('PiutangUtangInsight.compute() — D.piutang/D.debts TIDAK dimutasi oleh filter ownership', () => {
  const D = makeInsightD();
  const beforeP = JSON.stringify(D.piutang);
  const beforeD = JSON.stringify(D.debts);
  const ctx = makeFeatureInsightCtx(D);
  ctx.PiutangUtangInsight.compute();
  assert.equal(JSON.stringify(D.piutang), beforeP);
  assert.equal(JSON.stringify(D.debts), beforeD);
});
