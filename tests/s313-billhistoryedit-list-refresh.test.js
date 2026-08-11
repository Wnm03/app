'use strict';
/**
 * s313-billhistoryedit-list-refresh.test.js — Sesi 313: laporan user (video
 * layar) — habis ubah tanggal bayar lewat "✏️ Ubah Tanggal Bayar" ->
 * billHistoryEditModal -> Simpan, toast "✅ Riwayat pembayaran diperbarui"
 * muncul (jadi kelihatan berhasil), tapi kartu di Daftar Tagihan masih
 * nampilin tanggal LAMA -- baru ke-update kalau user pindah halaman/buka
 * ulang transaksinya lalu simpan lagi.
 *
 * Root cause: saveBillHistoryEdit() (tagihan-kalender.js) memanggil
 * renderDashboard()/renderKeuangan()/renderBillHistory()/renderBillArchive()
 * setelah save(), TAPI TIDAK memanggil renderBillList() atau checkBills() --
 * padahal fungsi SEBELAH di modal yang sama, deleteBillHistoryTx(), SUDAH
 * memanggil keduanya (lihat renderDashboard();renderKeuangan();renderBillList();
 * renderSettings();checkBills();renderBillHistory();renderBillArchive(); di
 * deleteBillHistoryTx()). Data di D (t.date, archB.completedAt) sendiri sudah
 * benar sejak save() dipanggil -- ini murni gap RENDER, bukan gap penyimpanan.
 *
 * FIX: tambah renderBillList() & checkBills() ke daftar render setelah
 * save() di saveBillHistoryEdit(), disamakan ke pola deleteBillHistoryTx().
 *
 * Test load fungsi ASLI lewat brace-counting manual (pola sama
 * tests/s304-bill-payment-tx-fallback.test.js) supaya bisa suntik D tiruan &
 * stub semua dependency DOM/toast/save/closeModal/render*.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'finance', 'tagihan-kalender.js'),
  'utf8'
);

function extractFnSource(fnName) {
  const asyncMarker = `async function ${fnName}(`;
  const plainMarker = `function ${fnName}(`;
  let start = SRC.indexOf(asyncMarker);
  if (start === -1) start = SRC.indexOf(plainMarker);
  if (start === -1) throw new Error(`"${plainMarker}" tidak ditemukan`);
  const braceOpen = SRC.indexOf('{', start);
  let depth = 1;
  let i = braceOpen + 1;
  while (i < SRC.length && depth > 0) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') depth--;
    i++;
  }
  return SRC.slice(start, i);
}

function makeElStub(value) {
  return { value };
}

function loadSandbox(D, { curBillHistoryEditTxId, fields }) {
  const calls = {
    render: [],
    toasts: [],
    closedModal: null,
    saved: false,
  };
  const elMap = {
    bhTanggal: makeElStub(fields.tanggal),
    bhJumlah: makeElStub(String(fields.jumlah)),
    bhCatatan: makeElStub(fields.catatan || ''),
  };
  const context = {
    console,
    Math,
    Date,
    String,
    D,
    calls,
    curBillHistoryEditTxId,
    document: { getElementById: (id) => elMap[id] },
    toast: (msg) => { calls.toasts.push(msg); },
    save: () => { calls.saved = true; },
    closeModal: (id) => { calls.closedModal = id; },
    renderDashboard: () => { calls.render.push('renderDashboard'); },
    renderKeuangan: () => { calls.render.push('renderKeuangan'); },
    renderBillList: () => { calls.render.push('renderBillList'); },
    checkBills: () => { calls.render.push('checkBills'); },
    renderBillHistory: () => { calls.render.push('renderBillHistory'); },
    renderBillArchive: () => { calls.render.push('renderBillArchive'); },
    // s314: saveBillHistoryEdit() sekarang panggil refreshBillHistoryModalViews()
    // (satu sumber kebenaran dipakai bareng deleteBillHistoryTx()) alih-alih
    // 6 render di atas satu-satu -- stub ini fan-out ke render stub yang sama
    // supaya assertion lama (cek renderBillList/checkBills ikut terpanggil)
    // tetap valid tanpa perlu tahu isi asli refreshBillHistoryModalViews().
    refreshBillHistoryModalViews: () => {
      context.renderDashboard();context.renderKeuangan();context.renderBillList();
      context.checkBills();context.renderBillHistory();context.renderBillArchive();
    },
    renderDebtList: () => { calls.render.push('renderDebtList'); },
    renderKekayaanBersih: () => { calls.render.push('renderKekayaanBersih'); },
    hitungZakatMaal: () => { calls.render.push('hitungZakatMaal'); },
    Piutang: { renderList: () => { calls.render.push('Piutang.renderList'); } },
  };
  vm.createContext(context);
  const snippet = `function isLatestBillPaymentTx(billId,txId){
const ids=D.transactions.filter(t=>t.billLinkId===billId).map(t=>t.id);
return!ids.length||txId>=Math.max(...ids);
}
${extractFnSource('applyBillPaymentTxSync')}
${extractFnSource('saveBillHistoryEdit')}
this.saveBillHistoryEdit = saveBillHistoryEdit;`;
  vm.runInContext(snippet, context, { filename: 's313-extract.js' });
  context.saveBillHistoryEdit();
  return { context, calls };
}

test('saveBillHistoryEdit() — memanggil renderBillList() DAN checkBills() (dulu tidak, beda dari deleteBillHistoryTx())', () => {
  const D = {
    transactions: [{ id: 5, billLinkId: null, date: '2026-07-01', amount: 100000, note: 'lama' }],
    billsArchive: [],
  };
  const { calls } = loadSandbox(D, {
    curBillHistoryEditTxId: 5,
    fields: { tanggal: '2026-07-15', jumlah: 100000, catatan: 'baru' },
  });
  assert.ok(calls.render.includes('renderBillList'), 'renderBillList() harus ikut dipanggil supaya Daftar Tagihan tidak basi');
  assert.ok(calls.render.includes('checkBills'), 'checkBills() harus ikut dipanggil supaya badge status jatuh tempo ikut ke-refresh');
});

test('saveBillHistoryEdit() — tetap menulis t.date/t.amount/t.note & tetap tampilkan toast sukses (perilaku lama tidak berubah)', () => {
  const D = {
    transactions: [{ id: 5, billLinkId: null, date: '2026-07-01', amount: 100000, note: 'lama' }],
    billsArchive: [],
  };
  const { calls } = loadSandbox(D, {
    curBillHistoryEditTxId: 5,
    fields: { tanggal: '2026-07-15', jumlah: 150000, catatan: 'baru' },
  });
  assert.equal(D.transactions[0].date, '2026-07-15');
  assert.equal(D.transactions[0].amount, 150000);
  assert.equal(D.transactions[0].note, 'baru');
  assert.ok(calls.saved, 'save() harus tetap dipanggil');
  assert.equal(calls.closedModal, 'billHistoryEditModal');
  assert.ok(calls.toasts.some((m) => m.includes('diperbarui')));
});

test('saveBillHistoryEdit() — sync completedAt arsip tetap jalan kalau transaksi ini pembayaran TERAKHIR (perilaku lama tidak berubah)', () => {
  const D = {
    transactions: [{ id: 5, billLinkId: 'b1', date: '2026-07-01', amount: 100000, note: '' }],
    billsArchive: [{ id: 'b1', completedAt: '2026-07-01' }],
  };
  loadSandbox(D, {
    curBillHistoryEditTxId: 5,
    fields: { tanggal: '2026-07-20', jumlah: 100000, catatan: '' },
  });
  assert.equal(D.billsArchive[0].completedAt, '2026-07-20');
});

test('saveBillHistoryEdit() — tanggal kosong -> toast peringatan, TIDAK ada render/save yang dipanggil (guard lama tetap utuh)', () => {
  const D = {
    transactions: [{ id: 5, billLinkId: null, date: '2026-07-01', amount: 100000, note: '' }],
    billsArchive: [],
  };
  const { calls } = loadSandbox(D, {
    curBillHistoryEditTxId: 5,
    fields: { tanggal: '', jumlah: 100000, catatan: '' },
  });
  assert.equal(calls.saved, false);
  assert.equal(calls.render.length, 0);
  assert.ok(calls.toasts.some((m) => m.includes('Tanggal wajib diisi')));
});
