'use strict';
// tests/debt-bill-cicilan.test.js — cakupan KW-170: cicilan barang (Buku
// Tagihan/D.bills kind:'cicilan', sisaTenor>0) digabung sbg "utang beneran"
// ke Buku Utang (D.debts) — Debt.billCicilanAktif(), DebtStrategy.
// billCicilanAsDebtLike(), DebtStrategy.activeDebts() gabungan, & efek
// lanjutannya ke DebtStrategy.simulate() dan DebtOptimizerAPI._overview()
// (fix double-count activeCount). Fokus test: fungsi PURE (tidak sentuh
// DOM) — renderList()/render() (baca getElementById) sengaja TIDAK dites di
// sini sesuai batasan loadSource.js, cukup diverifikasi manual/smoke-test.
// Langganan (kind:'langganan') sengaja TIDAK dites ikut tergabung — sesuai
// keputusan audit sesi ini, tetap dikecualikan (tidak punya sisaTenor/tenor).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D) {
  return loadSource(['modules/finance/piutang-utang.js'], { D }, ['Debt', 'DebtStrategy']);
}

function makeOptimizerCtx(D) {
  return loadSource(
    ['modules/finance/piutang-utang.js', 'modules/finance/debt-optimizer-api.js'],
    { D },
    ['Debt', 'DebtStrategy', 'DebtOptimizerAPI']
  );
}

test('billCicilanAktif() — hanya ambil kind cicilan dgn sisaTenor>0, exclude langganan/tagihan biasa/cicilan yg sudah 0', () => {
  const D = {
    debts: [],
    bills: [
      { id: 'b1', kind: 'cicilan', sisaTenor: 3, amount: 100000 },
      { id: 'b2', kind: 'langganan', sisaTenor: null, amount: 50000 },
      { id: 'b3', kind: 'tagihan', amount: 20000 },
      { id: 'b4', kind: 'cicilan', sisaTenor: 0, amount: 75000 },
    ],
  };
  const ctx = makeCtx(D);
  const active = ctx.Debt.billCicilanAktif();
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'b1');
});

test('billCicilanAsDebtLike() — bunga di-set 0, nilai = amount x sisaTenor, id diprefix "bill:"', () => {
  const D = {
    debts: [],
    bills: [{ id: 'b1', name: 'Cicilan HP', kind: 'cicilan', sisaTenor: 4, amount: 250000, bunga: 10 }],
  };
  const ctx = makeCtx(D);
  const mapped = ctx.DebtStrategy.billCicilanAsDebtLike();
  assert.equal(mapped.length, 1);
  const m = mapped[0];
  assert.equal(m.id, 'bill:b1');
  assert.equal(m.name, 'Cicilan HP');
  assert.equal(m.bunga, 0, 'bunga cicilan barang sudah dibakar ke amount, jangan ikut dipakein compounding');
  assert.equal(m.cicilanBulanan, 250000);
  assert.equal(m.nilai, 1000000); // 250000 x 4
  assert.equal(m._isBillCicilan, true);
});

test('activeDebts() — gabung D.debts aktif + cicilan barang aktif, TIDAK duplikat, debt lunas/nilai 0 tetap dibuang', () => {
  const D = {
    debts: [
      { id: 'd1', name: 'KTA', nilai: 5000000, lunas: false, bunga: 18, cicilanBulanan: 500000 },
      { id: 'd2', name: 'Lunas', nilai: 0, lunas: true },
    ],
    bills: [{ id: 'b1', name: 'Cicilan Motor', kind: 'cicilan', sisaTenor: 6, amount: 300000 }],
  };
  const ctx = makeCtx(D);
  const active = ctx.DebtStrategy.activeDebts();
  assert.equal(active.length, 2);
  assert.ok(active.some((d) => d.id === 'd1'));
  assert.ok(active.some((d) => d.id === 'bill:b1'));
});

test('simulate() — cicilan barang (bunga 0) lunas TEPAT setelah sisaTenor bulan, tanpa bunga tambahan', () => {
  const D = {
    debts: [],
    bills: [{ id: 'b1', name: 'Cicilan Kulkas', kind: 'cicilan', sisaTenor: 5, amount: 200000 }],
  };
  const ctx = makeCtx(D);
  const active = ctx.DebtStrategy.activeDebts();
  const order = ctx.DebtStrategy.computeOrder(active, 'avalanche');
  const sim = ctx.DebtStrategy.simulate(order, 0);
  assert.equal(sim.months, 5);
  assert.equal(sim.totalInterest, 0);
});

test('DebtOptimizerAPI._overview() — activeCount TIDAK dobel hitung cicilan barang setelah digabung ke activeDebts()', () => {
  const D = {
    debts: [{ id: 'd1', name: 'KTA', nilai: 5000000, lunas: false, bunga: 18, cicilanBulanan: 500000 }],
    bills: [{ id: 'b1', name: 'Cicilan Motor', kind: 'cicilan', sisaTenor: 6, amount: 300000 }],
  };
  const ctx = makeOptimizerCtx(D);
  const o = ctx.DebtOptimizerAPI.debtOverview();
  assert.equal(o.ok, true);
  assert.equal(o.activeCount, 2, 'harus 2 (1 utang formal + 1 cicilan barang), bukan 3');
  assert.equal(o.totalValue, 5000000 + 300000 * 6, 'totalValue ikut nambah outstanding cicilan barang');
  assert.equal(o.totalCicilanBulanan, 500000 + 300000);
});
