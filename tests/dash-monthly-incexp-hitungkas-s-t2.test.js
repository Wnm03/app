'use strict';
// tests/dash-monthly-incexp-hitungkas-s-t2.test.js — Sesi T2 (AUDIT-hitung-kas-toggle-dan-
// ringkasan-tagihan.md, RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md).
// Cakupan: `_dashMonthlyIncExp(txM)` (modules/shared/modules-render.js) — pure helper baru yang
// dipisah dari inline dashCtx.inc/exp di renderDashboard() (baris ~1054-1055 sebelum sesi ini)
// supaya guard tx.hitungKas:false (Sesi T1) bisa dites tanpa sandbox DOM-heavy renderDashboard()
// itu sendiri (loop DASH_RENDER_ORDER/LifeBalance/Advisor dst di luar scope harness pure-logic
// ini — sama seperti disclaimer test T1 di tests/tx-hitungkas-toggle-s-t1.test.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFunction } = require('./helpers/loadSource');

const _extracted = extractFunction('modules/shared/modules-render-b.js', '_dashMonthlyIncExp');
// _dashMonthlyIncExp() dijalankan lewat vm sandbox terpisah (extractFunction(), loadSource.js) —
// objek hasil {inc,exp} yang di-return itu punya realm/Object.prototype BEDA dari realm test ini,
// jadi assert.deepStrictEqual (yang ikut membandingkan prototype) SELALU gagal walau isinya sama
// persis. Wrapper tipis di bawah cuma menyalin field inc/exp ke objek plain realm test ini (0
// perubahan logic) supaya deepStrictEqual bisa dipakai apa adanya.
function _dashMonthlyIncExp(txM) {
  const r = _extracted(txM);
  return { inc: r.inc, exp: r.exp };
}

test('_dashMonthlyIncExp() — transaksi hitungKas:false SKIP dari Pemasukan/Pengeluaran Dashboard', () => {
  const txM = [
    { type: 'income', amount: 500000 }, // dihitung
    { type: 'expense', amount: 200000 }, // dihitung
    { type: 'income', amount: 999999, hitungKas: false }, // catatan saja, skip
    { type: 'expense', amount: 888888, hitungKas: false }, // catatan saja, skip
  ];
  assert.deepStrictEqual(_dashMonthlyIncExp(txM), { inc: 500000, exp: 200000 });
});

test('_dashMonthlyIncExp() — transaksi TANPA field hitungKas (absen) tetap dihitung normal (backward-compat)', () => {
  const txM = [
    { type: 'income', amount: 500000 },
    { type: 'expense', amount: 200000 },
  ];
  assert.deepStrictEqual(_dashMonthlyIncExp(txM), { inc: 500000, exp: 200000 });
});

test('_dashMonthlyIncExp() — hitungKas:true eksplisit tetap dihitung normal', () => {
  const txM = [
    { type: 'income', amount: 500000, hitungKas: true },
    { type: 'expense', amount: 200000, hitungKas: true },
  ];
  assert.deepStrictEqual(_dashMonthlyIncExp(txM), { inc: 500000, exp: 200000 });
});

test('_dashMonthlyIncExp() — semua transaksi hitungKas:false -> inc/exp = 0', () => {
  const txM = [
    { type: 'income', amount: 500000, hitungKas: false },
    { type: 'expense', amount: 200000, hitungKas: false },
  ];
  assert.deepStrictEqual(_dashMonthlyIncExp(txM), { inc: 0, exp: 0 });
});

test('_dashMonthlyIncExp() — transfer_in/transfer_out tidak ikut Pemasukan/Pengeluaran (0 regresi, sama seperti inline lama)', () => {
  const txM = [
    { type: 'income', amount: 500000 },
    { type: 'transfer_in', amount: 100000 },
    { type: 'transfer_out', amount: 50000 },
  ];
  assert.deepStrictEqual(_dashMonthlyIncExp(txM), { inc: 500000, exp: 0 });
});

test('_dashMonthlyIncExp() — array kosong -> {inc:0,exp:0}', () => {
  assert.deepStrictEqual(_dashMonthlyIncExp([]), { inc: 0, exp: 0 });
});
