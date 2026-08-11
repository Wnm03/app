'use strict';
// tests/piutang-utang-numeric-guard-s403.test.js — cakupan Sesi 403
// (BUG-FIN-002): audit numerik lanjutan Buku Utang (modules/finance/
// piutang-utang.js). `nilai` sudah dijaga <=0 sejak BUG-FIN-001, tapi
// `bunga` & `cicilanBulanan` belum -- keduanya bisa lolos NEGATIF dan
// meracuni Debt.simulate() (proyeksi snowball/avalanche, dipakai
// debt-optimizer-*): bunga negatif bikin balance "menyusut" salah arah,
// cicilanBulanan negatif malah MENAMBAH balance tiap bulan.
//
// Fix: Debt.save() sekarang clamp bunga & cicilanBulanan ke 0 kalau
// hasil parse negatif (BUKAN ditolak spt `nilai` -- bunga/cicilan 0 itu
// valid, beda dari nilai yg wajib >0). Test ini pakai fakeDom (pola sama
// tests/inventory-transfer-chip-ui-s374.test.js) supaya Debt.save() yang
// DOM-heavy bisa dites end-to-end tanpa browser.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      debtName: { value: 'Bank X' },
      debtJenis: { value: 'kta' },
      debtNilai: { value: '5000000' },
      debtBunga: { value: '18' },
      debtCicilan: { value: '500000' },
      debtTanggal: { value: '2026-08-01' },
      debtJatuhTempo: { value: '' },
      debtCatatan: { value: '' },
      debtAssetId: { value: '' },
    },
    overrides,
  );
  return { getElementById: (id) => els[id] || null, _els: els };
}

function makeCtx(D, document, extra = {}) {
  return loadSource(
    ['modules/finance/piutang-utang.js'],
    Object.assign(
      {
        D,
        document,
        uid: (() => { let n = 9000; return () => ++n; })(),
        sameId: (a, b) => String(a) === String(b),
        parsePzNum: (v) => {
          if (v == null) return 0;
          const str = String(v);
          const neg = /-/.test(str);
          const digits = str.replace(/[^0-9]/g, '');
          const n = Number(digits);
          if (isNaN(n)) return 0;
          return neg ? -n : n;
        },
        toast: (msg) => extra.toasts && extra.toasts.push(msg),
        withSaveGuard: (key, modalId, fn) => fn(),
        save: () => {},
        closeModal: () => {},
        renderKekayaanBersih: () => {},
        hitungZakatMaal: () => {},
        renderBillList: () => {},
        checkBills: () => {},
        escapeHtml: (s) => String(s),
        fmtFull: (n) => 'Rp' + n,
        fmt: (n) => 'Rp' + n,
      },
      extra.globals || {},
    ),
    ['Debt', 'DebtStrategy'],
  );
}

function baseD() {
  return { debts: [], bills: [], accounts: [{ id: 'acc1' }] };
}

test('Debt.save() — bunga negatif diclamp ke 0, bukan lolos negatif', () => {
  const D = baseD();
  const document = fakeDom({ debtBunga: { value: '-18' } });
  const ctx = makeCtx(D, document);
  ctx.Debt.save();
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].bunga, 0, 'bunga negatif harus diclamp ke 0');
});

test('Debt.save() — cicilanBulanan negatif diclamp ke 0, bukan lolos negatif', () => {
  const D = baseD();
  const document = fakeDom({ debtCicilan: { value: '-500000' } });
  const ctx = makeCtx(D, document);
  ctx.Debt.save();
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].cicilanBulanan, 0, 'cicilanBulanan negatif harus diclamp ke 0');
});

test('Debt.save() — bunga & cicilanBulanan positif tetap tersimpan apa adanya (0 regresi)', () => {
  const D = baseD();
  const document = fakeDom();
  const ctx = makeCtx(D, document);
  ctx.Debt.save();
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].bunga, 18);
  assert.equal(D.debts[0].cicilanBulanan, 500000);
});

test('Debt.save() — bunga 0 (tanpa bunga) tetap valid, tidak dianggap sama dgn kasus negatif', () => {
  const D = baseD();
  const document = fakeDom({ debtBunga: { value: '0' } });
  const ctx = makeCtx(D, document);
  ctx.Debt.save();
  assert.equal(D.debts.length, 1);
  assert.equal(D.debts[0].bunga, 0);
});

test('Debt.simulate() — bunga yg sudah diclamp (0) tidak bikin balance turun palsu dibanding bunga positif normal', () => {
  const D = baseD();
  const document = fakeDom({ debtBunga: { value: '-24' } });
  const ctx = makeCtx(D, document);
  ctx.Debt.save();
  const ordered = ctx.DebtStrategy.computeOrder(D.debts, 'avalanche');
  const sim = ctx.DebtStrategy.simulate(ordered, 0);
  // bunga 0 (hasil clamp) -> totalInterest harus 0, BUKAN negatif (yg akan
  // terjadi kalau bunga -24 lolos apa adanya ke simulate()).
  assert.equal(sim.totalInterest, 0);
});
