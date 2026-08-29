'use strict';
/**
 * s447-tx-renov-numeric-id-fix.test.js — regresi utk bug real yang dilaporkan
 * user: sudah centang "Catat juga ke Proyek Renovasi?", sudah pilih proyeknya
 * di dropdown (kelihatan jelas terisi "Renov"), tapi pas Simpan tetap muncul
 * toast "⚠️ Pilih dulu Proyek Renovasi-nya" -- padahal transaksi Keuangan-nya
 * sendiri berhasil diperbarui.
 *
 * ROOT CAUSE: id proyek Renov dibuat oleh uid() global (lihat
 * modules/shared/features-helpers-global-security.js) yang return NUMBER
 * (`Date.now()`-based), TAPI value dari <select>/<option> di DOM SELALU
 * string (browser otomatis stringify). tx-renov.js (applyTxRenovFromTx &
 * handleTxRenovBelumDibeli) dulu bandingkan id proyek pakai `===` (strict
 * equality) alih-alih `sameId()` (helper global yg bandingkan
 * String(a)===String(b), sudah dipakai KONSISTEN di semua tempat lain yg
 * cocokkan id proyek Renov, lihat modules/home/renovasi.js) -- akibatnya
 * `D.renovProjects.find(x=>x.id===projId)` SELALU gagal (number !== string)
 * walau user sudah benar pilih proyeknya, dan fallback di baris berikutnya
 * (BUGFIX s446) juga ikut gagal karena masalahnya bukan projId kosong, tapi
 * projId (string) tidak pernah match sama p.id (number).
 *
 * PENTING kenapa test s436/s433 SEBELUMNYA tidak menangkap bug ini: mock
 * uid() di test2 itu sengaja return STRING (`String(n+=1)`), jadi kebetulan
 * selalu match sama id string dari DOM -- gap-nya baru kena kalau id proyek
 * beneran NUMBER seperti uid() asli. Test ini pakai id numerik asli-mirip
 * (mock uid() return number, sama seperti fungsi asli) supaya gap ini
 * benar-benar tertutup ke depannya.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeFakeDoc(values) {
  const els = {};
  Object.keys(values).forEach((id) => {
    const v = values[id];
    els[id] = (typeof v === 'boolean') ? { checked: v } : { value: v };
  });
  return { doc: { getElementById: (id) => els[id] || null }, els };
}

function makeCtx({ document, D, calls, txEditId = null }) {
  return loadSource(
    ['modules/shared/helper-teks.js', 'modules/finance/tx-renov.js', 'modules/finance/transaksi.js', 'modules/finance/transaksi-b.js'],
    {
      document,
      D,
      curPayMethod: 'tunai',
      curTxType: 'expense',
      txEditId,
      _txPayMethodTouchedByUser: false,
      _txCatLearnSource: null,
      evalAmtExpr: () => {},
      toast: (m, dur) => calls.push({ msg: m, dur }),
      save: () => calls.push({ save: true }),
      closeModal: (id) => calls.push({ closeModal: id }),
      renderDashboard: () => {},
      renderKeuangan: () => {},
      renderCnTab: () => {},
      rememberLastAccForCat: () => {},
      AIBus: { emit: () => {} },
      applyTxStockFromTx: () => {},
      applyTxBbmFromTx: () => {},
      applyTxShopStockFromTx: () => {},
      applyTxShopSaleFromTx: () => {},
      WorthIt: { applyBuyLink: () => {}, onLinkedTxEdited: () => {} },
      Renov: { render: () => {}, renderDetail: () => {}, curId: null },
      // sameId() ASLI (String(a)===String(b)), sengaja BUKAN mock strict-eq,
      // supaya test ini benar2 melewati kode produksi tx-renov.js apa adanya.
      sameId: (a, b) => String(a) === String(b),
      findPossibleDuplicateTx: () => null,
      SewaKios: { applyPaymentLink: () => {} },
      Tukang: { applyPendingPayment: () => {} },
      // uid() MIRIP ASLI: return NUMBER, bukan string (beda dari test s436).
      uid: (() => { let n = 5000; return () => (n += 1); })(),
    },
  );
}

function baseFields(overrides = {}) {
  return Object.assign({
    txAmt: '154280', txSubCat: '', txDate: '2026-08-05', txNote: 'Bayar: closet ina', txCat: 'Renov', txAcc: 'a1',
    txAddRenov: true, txRenovProject: '', // diisi per-test dari id numerik proyek asli
  }, overrides);
}

test('BUGFIX s447: proyek Renov ber-id NUMBER (persis uid() asli) + user SUDAH pilih di dropdown -> harus BERHASIL tertaut, BUKAN toast "Pilih dulu Proyek Renovasi-nya"', async () => {
  const projectId = 1754540761234; // angka besar mirip Date.now(), TIDAK di-quote -> number asli
  const D = {
    transactions: [],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: projectId, name: 'Renov', items: [] }],
  };
  const calls = [];
  // Simulasikan value dropdown persis seperti browser: SELALU string, walau project id-nya number.
  const { doc } = makeFakeDoc(baseFields({ txRenovProject: String(projectId) }));
  const fakePanel = { style: { display: 'block' } };
  doc.getElementById = ((orig) => (id) => (id === 'txRenovPanel' ? fakePanel : orig(id)))(doc.getElementById);
  const ctx = makeCtx({ document: doc, D, calls });

  await ctx._saveTxInner();

  // Item Renov harus benar-benar tercipta & tertaut -- INI yang gagal sebelum fix.
  assert.equal(D.renovProjects[0].items.length, 1, 'item Renov harus tercipta walau id proyeknya number, bukan string');
  const item = D.renovProjects[0].items[0];
  assert.equal(item.paid, true);
  assert.equal(item.harga, 154280);
  assert.equal(D.transactions[0].renovItemLinkId, item.id);
  assert.equal(D.transactions[0].renovProjectLinkId, projectId);

  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0].msg, /✅ Transaksi tersimpan/);
  assert.doesNotMatch(toastCalls[0].msg, /⚠️ Pilih dulu Proyek Renovasi-nya/, 'TIDAK boleh muncul warning ini padahal user sudah pilih proyeknya');
  assert.match(toastCalls[0].msg, /otomatis dicatat & lunas di proyek "Renov"/);
});

test('BUGFIX s447: skenario EDIT transaksi lama (belum ter-link) dengan id proyek NUMBER -> harus berhasil ter-link, bukan warning palsu', async () => {
  const projectId = 1754540761234;
  const existingTx = {
    id: 9001, type: 'expense', amount: 154280, category: 'Renov', subcategory: '',
    accountId: 'a1', note: 'Bayar: closet ina', date: '2026-08-05',
    // BELUM ter-link (persis kasus di laporan user -- transaksi lama yg mau dihubungkan sekarang)
  };
  const D = {
    transactions: [existingTx],
    accounts: [{ id: 'a1', name: 'Cash' }],
    renovProjects: [{ id: projectId, name: 'Renov', items: [] }],
  };
  const calls = [];
  const { doc } = makeFakeDoc(baseFields({ txRenovProject: String(projectId) }));
  const fakePanel = { style: { display: 'block' } };
  doc.getElementById = ((orig) => (id) => (id === 'txRenovPanel' ? fakePanel : orig(id)))(doc.getElementById);
  const ctx = makeCtx({ document: doc, D, calls, txEditId: 9001 });

  await ctx._saveTxInner();

  assert.equal(D.renovProjects[0].items.length, 1, 'item Renov harus tercipta walau ini edit transaksi lama');
  assert.equal(existingTx.renovProjectLinkId, projectId);

  const toastCalls = calls.filter((c) => 'msg' in c);
  assert.equal(toastCalls.length, 1);
  assert.match(toastCalls[0].msg, /✅ Transaksi diperbarui/);
  assert.doesNotMatch(toastCalls[0].msg, /⚠️ Pilih dulu Proyek Renovasi-nya/);
});
