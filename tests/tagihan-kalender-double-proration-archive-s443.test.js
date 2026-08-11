'use strict';
// tests/tagihan-kalender-double-proration-archive-s443.test.js — cakupan
// BUG-FIN-003 (double-proration): getBillArchiveEditSource() (dipakai
// openBillModal() utk mengisi #billAmt saat ✏️ Edit Tagihan (Lunas), s317)
// mengembalikan tx.amount apa adanya sbg `amount` -- tapi utk tagihan SHARED,
// tx.amount cuma PORSI SENDIRI (bukan Total, lihat BUG-002 sesi 342: t.amount
// SELALU porsi keluar dari kantong sendiri). Field #billAmt sendiri berlabel
// "Jumlah Total per Periode" (toggleBillSharedFields) & _saveBillInner() SELALU
// mem-prorata ulang isinya lewat sharedPct (rawAmt*sharedPct/100). Kalau porsi
// (bukan total) yang dikembalikan di sini, hasil edit archive round-trip
// (buka modal lalu save tanpa ubah apa pun) memprorata Total asli DUA KALI --
// porsi user susut jadi porsi^2/total, bukan tetap porsi seperti seharusnya.
//
// Skenario: total tagihan 1.000.000, split 50/50 -> porsi tersimpan di
// transaksi pembayaran = 500.000. User buka ✏️ Edit Tagihan (Lunas) lalu
// langsung Simpan tanpa mengubah field apa pun (kasus paling umum -- cuma mau
// koreksi nama/catatan). Ekspektasi: porsi tetap 500.000 (0 regresi thd nilai
// tersimpan). Sebelum fix: rawAmt terbaca 500.000 (bukan 1.000.000), lalu
// diprorata lagi -> amt = round(500.000*50/100) = 250.000 (SALAH, dobel).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function fakeDom(overrides) {
  const els = Object.assign(
    {
      billName: { value: 'Internet Rumah' },
      billAmt: { value: '' }, // diisi lewat openBillModal(), bukan manual di sini
      billDue: { value: '' },
      billDueWrap: { style: {} },
      billDueLabel: { textContent: '' },
      billModalTitle: { textContent: '' },
      billFreq: { value: 'bulanan' },
      billCat: { value: '' },
      billSubCat: { value: '', innerHTML: '' },
      billAcc: { value: 'acc1' },
      billNote: { value: '' },
      billShared: { checked: false },
      billSharedPct: { value: '50' },
      billSharedWrap: { style: {} },
      billAmtLabel: { textContent: '' },
      billSharedPreview: { textContent: '' },
      billSharedOtherName: { value: '' },
      billSharedAutoPiutang: { checked: false },
    },
    overrides,
  );
  return { getElementById: (id) => (id in els ? els[id] : null), _els: els };
}

function makeCtx(D, document, toasts) {
  const ctx = loadSource(
    ['modules/finance/tagihan-kalender.js'],
    {
      D,
      document,
      uid: (() => { let n = 9000; return () => ++n; })(),
      sameId: (a, b) => String(a) === String(b),
      toast: (msg) => toasts.push(msg),
      save: () => {},
      closeModal: () => {},
      openModal: () => {},
      escapeHtml: (s) => s,
      getCatsByType: () => [],
      updateBillSubCatOptions: () => {},
      setBillType: (k) => { ctx.curBillType = k; },
      shouldShowGenericDueField: () => true,
      renderBillList: () => {},
      renderSettings: () => {},
      renderDashboard: () => {},
      checkBills: () => {},
      renderBillHistory: () => {},
      renderBillArchive: () => {},
    },
  );
  ctx.curBillType = 'tagihan';
  ctx.billEditId = null;
  ctx.billEditFromArchive = false;
  return ctx;
}

function baseD() {
  return { bills: [], billsArchive: [], transactions: [], accounts: [{ id: 'acc1' }] };
}

test('_saveBillInner() — archive round-trip shared bill TIDAK boleh dobel-prorata', () => {
  const D = baseD();
  D.billsArchive.push({
    id: 'billA',
    name: 'Internet Rumah',
    amount: 500000,       // porsi tersimpan (0.5 * 1.000.000)
    totalAmount: 1000000, // total asli, tidak pernah diprorata
    sharedPct: 50,
    shared: true,
    sharedAutoPiutang: false,
    kind: 'tagihan',
    freq: 'bulanan',
    completedAt: '2026-07-01',
  });
  D.transactions.push({
    // id numerik (pola uid() asli -- getLatestBillPaymentTxId pakai Math.max
    // atas id, jadi HARUS numerik, bukan string, spy match kondisi produksi)
    id: 9500,
    billLinkId: 'billA',
    amount: 500000, // t.amount SELALU porsi sendiri (BUG-002)
    date: '2026-07-01',
  });

  const toasts = [];
  const dom = fakeDom();
  const ctx = makeCtx(D, dom, toasts);

  // Simulasikan openBillModal(editId) mengisi #billAmt dari
  // getBillArchiveEditSource() (persis alur ✏️ Edit Tagihan (Lunas), s317).
  ctx.billEditId = 'billA';
  ctx.billEditFromArchive = true;
  const src = ctx.getBillArchiveEditSource(D.billsArchive[0], D.transactions);
  dom._els.billAmt.value = String(src.amount);
  dom._els.billDue.value = src.date;
  dom._els.billShared.checked = true;
  dom._els.billSharedPct.value = '50';

  // User langsung Simpan tanpa mengubah field apa pun.
  ctx._saveBillInner();

  const saved = D.billsArchive.find((b) => b.id === 'billA');
  assert.equal(
    saved.amount,
    500000,
    'porsi tersimpan harus tetap 500.000 (round-trip edit tanpa ubah nilai) -- BUKAN diprorata dobel jadi 250.000',
  );
});

test('_saveBillInner() — archive round-trip bill TIDAK shared tetap normal (0 regresi)', () => {
  const D = baseD();
  D.billsArchive.push({
    id: 'billB',
    name: 'Listrik',
    amount: 200000,
    totalAmount: null,
    sharedPct: null,
    shared: false,
    kind: 'tagihan',
    freq: 'bulanan',
    completedAt: '2026-07-05',
  });
  D.transactions.push({
    id: 9501,
    billLinkId: 'billB',
    amount: 200000,
    date: '2026-07-05',
  });

  const toasts = [];
  const dom = fakeDom();
  const ctx = makeCtx(D, dom, toasts);

  ctx.billEditId = 'billB';
  ctx.billEditFromArchive = true;
  const src = ctx.getBillArchiveEditSource(D.billsArchive[0], D.transactions);
  dom._els.billAmt.value = String(src.amount);
  dom._els.billDue.value = src.date;
  dom._els.billShared.checked = false;

  ctx._saveBillInner();

  const saved = D.billsArchive.find((b) => b.id === 'billB');
  assert.equal(saved.amount, 200000, 'bill non-shared tidak boleh regresi');
});
