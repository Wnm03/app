'use strict';
// tests/s271-bill-list-cicilan-fixes.test.js — Sesi 271: dua bugfix dari laporan user
// (tangkapan layar "Tagihan, Cicilan & Langganan"):
//
//   1) getBillActiveDateForFilter() (tagihan-kalender.js, BARU) — dipakai renderBillList()
//      (modules-render.js) supaya tagihan/cicilan AKTIF yang berulang tetap muncul saat
//      filter/nav bulan digeser ke bulan berikutnya (proyeksi via getBillOccurrencesInMonth,
//      bukan exact-match ke b.nextDue tunggal). Bug lama: cicilan 3x/tagihan baru "hilang"
//      begitu geser ke bulan depan sebelum periode berjalan dibayar.
//
//   2) totalAmount pada bill kind:'cicilan' yang "Ditanggung Bersama" (transaksi.js,
//      _saveTxInner cabang cicilan) HARUS total PER PERIODE (perBulan), sama satuan dengan
//      amount/perBulanMine -- bukan total harga barang (totalHarga). Salah pakai `total`
//      bikin maybeCreateSharedPiutangFromBill() (piutang-utang.js) menghitung sisa porsi
//      pihak lain jadi jutaan rupiah yang salah (harusnya cuma selisih cicilan/bulan).
//      Test ini menegaskan RUMUS yang benar (dicek lewat calcCicilanPerBulanFromTotal +
//      getCicilanSharedMine-equivalent, dua fungsi murni yang SUDAH ADA di cicilan.js) --
//      bukan menjalankan ulang _saveTxInner (DOM-heavy), tapi mengunci kontrak angka yang
//      caller (transaksi.js) HARUS pakai untuk field totalAmount.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource, extractFunction } = require('./helpers/loadSource');

// ================= 1) getBillActiveDateForFilter() =================

function makeBillCalc(D) {
  return loadSource(
    ['modules/shared/format-tema.js', 'modules/finance/tagihan-kalender.js'],
    { D },
    ['BILLCAL_MAX_ITER', 'BILL_ANOMALY_THRESHOLD_PCT'],
  );
}
function baseD(overrides = {}) {
  return { bills: [], transactions: [], ...overrides };
}

test('getBillActiveDateForFilter() — cicilan bulanan, nextDue bulan ini & belum dibayar -> TETAP muncul saat filter digeser ke BULAN DEPAN (proyeksi)', () => {
  const { getBillActiveDateForFilter } = makeBillCalc(baseD());
  // Septictank: cicilan 12x, sisa 12, nextDue Agustus 2026 (mis. belum sempat dibayar)
  const bill = { nextDue: '2026-08-05', freq: 'bulanan', kind: 'cicilan', sisaTenor: 12 };
  // Filter digeser ke September 2026 (month index 8)
  const eff = getBillActiveDateForFilter(bill, '8', '2026', bill.nextDue);
  assert.notEqual(eff, null, 'cicilan bulanan HARUS punya proyeksi occurrence di bulan depan, bukan hilang');
  assert.equal(eff, '2026-09-05');
});

test('getBillActiveDateForFilter() — cicilan baru (sisaTenor penuh) tetap terdeteksi 3 bulan ke depan selama masih dalam sisaTenor', () => {
  const { getBillActiveDateForFilter } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-08-01', freq: 'bulanan', kind: 'cicilan', sisaTenor: 3 };
  assert.notEqual(getBillActiveDateForFilter(bill, '9', '2026', bill.nextDue), null, 'Oktober (occurrence ke-3) harus tampil');
  assert.equal(getBillActiveDateForFilter(bill, '10', '2026', bill.nextDue), null, 'November (setelah sisaTenor 3x habis) harus tersembunyi, BUKAN muncul terus');
});

test('getBillActiveDateForFilter() — bulan/tahun filter "all" -> balikin fallbackDateStr apa adanya (0 perubahan perilaku lama)', () => {
  const { getBillActiveDateForFilter } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-08-05', freq: 'bulanan' };
  assert.equal(getBillActiveDateForFilter(bill, 'all', 'all', bill.nextDue), '2026-08-05');
});

test('getBillActiveDateForFilter() — tagihan sekali (freq "sekali") di luar bulan filter -> null (tidak ikut diproyeksikan berulang)', () => {
  const { getBillActiveDateForFilter } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-08-05', freq: 'sekali' };
  assert.equal(getBillActiveDateForFilter(bill, '9', '2026', bill.nextDue), null);
  assert.equal(getBillActiveDateForFilter(bill, '7', '2026', bill.nextDue), '2026-08-05');
});

test('getBillActiveDateForFilter() — hanya filter tahun (bulan "all") -> pakai bulan asli dari fallbackDateStr, tahun dari filter', () => {
  const { getBillActiveDateForFilter } = makeBillCalc(baseD());
  const bill = { nextDue: '2026-08-05', freq: 'tahunan' };
  assert.equal(getBillActiveDateForFilter(bill, 'all', '2027', bill.nextDue), '2027-08-05');
});

// ================= 2) totalAmount cicilan shared = per-periode, bukan total harga =================

test('kontrak totalAmount cicilan shared: perBulan (total per periode) != total harga barang untuk kasus multi-bulan (Septictank: 2.664.000 / 12x)', () => {
  const ctx = loadSource(['modules/finance/cicilan.js'], {
    document: { getElementById: () => null },
  });
  const { calcCicilanPerBulanFromTotal } = ctx;
  const total = 2664000, tenor = 12, bunga = 0;
  const { perBulan } = calcCicilanPerBulanFromTotal(total, tenor, bunga);
  assert.equal(perBulan, 222000, 'cicilan/bulan harus 2.664.000 / 12 = 222.000');
  assert.notEqual(perBulan, total, 'totalAmount TIDAK BOLEH sama dengan total harga barang untuk cicilan multi-bulan');
  const sharedPct = 55;
  const mine = Math.round(perBulan * sharedPct / 100);
  assert.equal(mine, 122100, 'porsi kamu 55% dari cicilan/bulan (222.000) = 122.100, cocok dgn tangkapan layar');
  const sisaPihakLainBenar = perBulan - mine;
  const sisaPihakLainSALAH = total - mine;
  assert.equal(sisaPihakLainBenar, 99900, 'sisa porsi pihak lain per bulan yg BENAR = 222.000 - 122.100 = 99.900');
  assert.notEqual(sisaPihakLainSALAH, sisaPihakLainBenar, 'kalau totalAmount keliru dipasang = total harga (2.664.000), sisa jadi salah total (2.5jt-an) -- inilah bug yang diperbaiki');
});

// ================= 3) openBillModal() redirect utk kind:'cicilan' (S271 lanjutan) =================
// Bug: klik kartu/✏️ Edit cicilan di list Tagihan,Cicilan&Langganan membuka modal Tagihan/
// Langganan GENERIK (tanpa field Tenor/Total Harga/Cicilan per Bulan/Bunga/KPR) alih-alih modal
// "🗂 Detail Cicilan" yang lengkap (dibuka via editTx()). Test ini stub editTx/toast/goToList
// sbg spy (redirect terjadi SEBELUM openBillModal menyentuh field-field DOM billCat/billAcc dst,
// jadi cukup load tagihan-kalender.js saja tanpa kategori.js).

function makeOpenBillModalCtx(D, spies = {}) {
  return loadSource(
    ['modules/finance/tagihan-kalender.js'],
    {
      D,
      toast: spies.toast || (() => {}),
      goToList: spies.goToList || (() => {}),
      editTx: spies.editTx || (() => {}),
      askConfirm: async () => true,
      getCatsByType: spies.getCatsByType || (() => []),
      getCatByType: spies.getCatByType || (() => null),
      openModal: spies.openModal || (() => {}),
    },
  );
}

test('openBillModal() — bill kind:"cicilan" aktif dgn riwayat transaksi -> redirect ke editTx() transaksi TERBARU (bukan modal generik)', () => {
  const calls = { editTx: [] };
  const D = {
    bills: [{ id: 'bill-cicilan-1', kind: 'cicilan', name: 'Septictank', sisaTenor: 11 }],
    billsArchive: [],
    transactions: [
      { id: 100, billLinkId: 'bill-cicilan-1' },
      { id: 300, billLinkId: 'bill-cicilan-1' }, // transaksi TERBARU (id terbesar)
      { id: 200, billLinkId: 'bill-cicilan-1' },
      { id: 999, billLinkId: 'bill-lain' }, // bill lain, tidak boleh ikut kepilih
    ],
  };
  const ctx = makeOpenBillModalCtx(D, { editTx: (id) => calls.editTx.push(id) });
  ctx.openBillModal('bill-cicilan-1');
  assert.deepEqual(calls.editTx, [300], 'harus panggil editTx() dgn id transaksi TERBARU (300, bukan 100/200)');
});

test('openBillModal() — bill kind:"cicilan" aktif TANPA riwayat transaksi sama sekali -> jatuh ke modal generik (fix s325), TIDAK panggil editTx() & TIDAK toast error', () => {
  const calls = { editTx: [], toast: [], openModal: [] };
  const D = {
    bills: [{ id: 'bill-cicilan-2', kind: 'cicilan', name: 'Kulkas' }],
    billsArchive: [],
    transactions: [],
    accounts: [],
  };
  const ctx = makeOpenBillModalCtx(D, {
    editTx: (id) => calls.editTx.push(id),
    toast: (msg) => calls.toast.push(msg),
    openModal: (id) => calls.openModal.push(id),
  });
  ctx.openBillModal('bill-cicilan-2');
  assert.equal(calls.editTx.length, 0, 'tidak boleh redirect ke editTx() krn tidak ada transaksi tertaut');
  assert.equal(calls.toast.length, 0, 'fix s325: tidak ada lagi dead-end toast error utk kasus ini');
  assert.deepEqual(calls.openModal, ['billModal'], 'harus tetap lanjut buka modal generik, bukan dead-end');
});

test('openBillModal() — bill kind:"utang" (redirect LAMA, S regresi) tetap ke Buku Utang, bukan ikut redirect cicilan yang baru', () => {
  const calls = { editTx: [], goToList: [] };
  const D = {
    bills: [{ id: 'bill-utang-1', kind: 'utang', debtId: 'debt-1', name: 'KPR' }],
    billsArchive: [],
    transactions: [],
  };
  const ctx = makeOpenBillModalCtx(D, {
    editTx: (id) => calls.editTx.push(id),
    goToList: (list) => calls.goToList.push(list),
  });
  ctx.openBillModal('bill-utang-1');
  assert.deepEqual(calls.goToList, ['debtList']);
  assert.equal(calls.editTx.length, 0, 'kind utang TIDAK boleh ikut redirect ke editTx() (itu punya jalur sendiri ke Buku Utang)');
});

test('source guard: transaksi.js membuat/mengedit bill kind cicilan shared HARUS set totalAmount:perBulan, TIDAK BOLEH lagi totalAmount:total (regresi S271)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'finance', 'transaksi.js'), 'utf8');
  const badPattern = /totalAmount:cicilanShared\?total:null/;
  const goodPatternCount = (src.match(/totalAmount:cicilanShared\?perBulan:null/g) || []).length;
  const goodPiutangCallCount = (src.match(/totalAmount:perBulan,amount:perBulanMine/g) || []).length;
  assert.equal(badPattern.test(src), false, 'pola bug lama (totalAmount:cicilanShared?total:null) tidak boleh ada lagi di transaksi.js');
  assert.equal(goodPatternCount, 3, 'ketiga cabang (edit existingBill, bill baru tenor==1, bill baru tenor>1) harus pakai totalAmount:cicilanShared?perBulan:null');
  assert.equal(goodPiutangCallCount, 1, 'panggilan maybeCreateSharedPiutangFromBill() saat cicilan baru langsung dibayar (1x pertama) harus ikut pakai totalAmount:perBulan');
});
