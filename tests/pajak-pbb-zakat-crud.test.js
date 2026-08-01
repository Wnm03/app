'use strict';
// tests/pajak-pbb-zakat-crud.test.js — cakupan modules/finance/pajak-pbb-zakat.js
// (PBB, Zakat, PPh21, PajakUMKM), sebelumnya 0 test file yang menyentuhnya langsung.
// File ini lebih berat dari CRUD lain (banyak DOM & save()) — fokus ke logic
// hitung + efek save()/create/update, bukan render HTML secara detail:
//   - PBB.hitung()/ikatTagihan() (create tagihan baru vs update tagihan existing)
//   - Zakat.hitungPenghasilan()/hitungMaal()/hitungFitrah() (kalkulasi murni + save())
//   - Zakat.catatDibayar() (create log+transaksi, dgn askConfirm) & delLog() (delete)
//   - PPh21.hitung()/isiDariTransaksi() (kalkulasi progresif + save())
//   - PajakUMKM.render() (kalkulasi murni, tanpa save())

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function autoEl() {
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'style') { if (!t.style) t.style = autoEl(); return t.style; }
      if (prop === 'classList') { if (!t.classList) t.classList = { add() {}, remove() {}, toggle() {} }; return t.classList; }
      if (prop === 'matches') return () => false;
      if (prop in t) return t[prop];
      return undefined;
    },
    set(t, prop, val) { t[prop] = val; return true; },
  });
}
function makeDoc(predefined = {}) {
  return {
    getElementById: (id) => (id in predefined ? predefined[id] : autoEl()),
    querySelectorAll: () => [],
  };
}
function parsePzNum(v) {
  if (v === null || v === undefined) return 0;
  const str = String(v);
  const negative = /-/.test(str);
  const digits = str.replace(/[^0-9]/g, '');
  const n = Number(digits);
  if (isNaN(n)) return 0;
  return negative ? -n : n;
}
function makeD(overrides = {}) {
  return Object.assign(
    {
      assets: [],
      bills: [],
      accounts: [{ id: 'a1', name: 'Cash' }],
      transactions: [],
      cobek: [],
      profile: { apiKey: 'k', apiProvider: 'claude' },
      pajakZakat: {
        pbb: { njoptkp: 5000000, tarifPersen: 0.2 },
        nisabPenghasilanBulan: 5000000,
        hargaEmasPerGram: 1000000,
        zakatFitrahPerJiwa: 45000,
        zakatLog: [],
        utangJT: 0,
        haulMaalMulai: null,
        pphBrutoBulan: 0,
        pphIuranBulan: 0,
      },
    },
    overrides,
  );
}

function makeCtx({ document, D, calls, askConfirmResult = true }) {
  return loadSource(
    ['modules/finance/pajak-pbb-zakat.js'],
    {
      document, D,
      uid: (() => { let n = 1; return () => 'pz' + (n++); })(),
      sameId: (a, b) => String(a) === String(b),
      escapeHtml: (s) => String(s),
      fmt: (n) => 'Rp' + n,
      fmtFull: (n) => 'RpFull' + n,
      parsePzNum,
      save: () => calls.push('save'),
      toast: (msg) => calls.push('toast:' + msg),
      askConfirm: async (msg) => { calls.push('askConfirm:' + msg); return askConfirmResult; },
      openModal: (id) => calls.push('open:' + id),
      closeModal: (id) => calls.push('close:' + id),
      refreshBillEverywhere: () => calls.push('refreshBillEverywhere'),
      renderDashboard: () => calls.push('renderDashboard'),
      renderKeuangan: () => calls.push('renderKeuangan'),
      renderPajakZakat: () => calls.push('renderPajakZakat'),
      renderRefCheckReminder: () => calls.push('renderRefCheckReminder'),
      renderKekayaanBersih: () => calls.push('renderKekayaanBersih'),
      totalSaldoAkun: () => 1000000,
      totalPiutangValue: () => 0,
      totalDebtValue: () => 0,
      totalCicilanOutstanding: () => 0,
      todayStr: () => '2026-08-01',
      aiErrorHint: () => '',
      callAIProviderRaw: async () => ({ ok: true, text: '{}' }),
    },
    ['PBB', 'Zakat', 'RefAI', 'PajakUMKM', 'PPh21'],
  );
}

// ---------------------------------------------------------------------------
// PBB.hitung() — kalkulasi + save() ke default ATAU ke aset terpilih
// ---------------------------------------------------------------------------

test('PBB.hitung() tanpa aset dipilih -> simpan tarif/njoptkp ke D.pajakZakat.pbb (default)', () => {
  const calls = [];
  const els = {
    pbbAssetPick: { value: '' },
    pbbNjopBumi: { value: '100000000' },
    pbbNjopBangunan: { value: '50000000' },
    pbbNjoptkp: { value: '10000000' },
    pbbTarif: { value: '0.2' },
    pbbNjopTotal: {}, pbbNjopKenaPajak: {}, pbbTerutang: {},
  };
  const D = makeD();
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.hitung();
  assert.equal(D.pajakZakat.pbb.njoptkp, 10000000);
  assert.equal(D.pajakZakat.pbb.tarifPersen, 0.2);
  assert.ok(calls.includes('save'));
  assert.equal(els.pbbNjopTotal.textContent, 'RpFull150000000');
  assert.equal(els.pbbNjopKenaPajak.textContent, 'RpFull140000000');
  assert.equal(els.pbbTerutang.textContent, 'RpFull280000');
});

test('PBB.hitung() dengan aset dipilih -> tarif/njoptkp tersimpan PER-ASET, bukan ke default global', () => {
  const calls = [];
  const D = makeD({ assets: [{ id: 'as1', name: 'Rumah A', jenis: 'Rumah/Bangunan', nilai: 500000000 }] });
  const els = {
    pbbAssetPick: { value: 'as1' },
    pbbNjopBumi: { value: '0' },
    pbbNjopBangunan: { value: '500000000' },
    pbbNjoptkp: { value: '12000000' },
    pbbTarif: { value: '0.1' },
    pbbNjopTotal: {}, pbbNjopKenaPajak: {}, pbbTerutang: {},
  };
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.hitung();
  assert.equal(D.assets[0].pbbNjoptkp, 12000000);
  assert.equal(D.assets[0].pbbTarif, 0.1);
  // default global (D.pajakZakat.pbb) TIDAK ikut berubah — tetap nilai awal dari makeD()
  assert.equal(D.pajakZakat.pbb.njoptkp, 5000000);
  assert.equal(D.pajakZakat.pbb.tarifPersen, 0.2);
});

test('PBB.ikatTagihan() jumlah 0 -> toast peringatan, TIDAK bikin tagihan', () => {
  const calls = [];
  const els = { pbbTerutang: { textContent: 'RpFull0' } };
  const D = makeD();
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.ikatTagihan();
  assert.match(calls.join(','), /toast:.*Belum ada PBB terutang/);
  assert.equal(D.bills.length, 0);
});

test('PBB.ikatTagihan() belum ada tanggal jatuh tempo -> toast peringatan', () => {
  const calls = [];
  const els = { pbbTerutang: { textContent: 'RpFull500000' }, pbbJatuhTempo: { value: '' } };
  const D = makeD();
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.ikatTagihan();
  assert.match(calls.join(','), /toast:.*tanggal jatuh tempo/);
  assert.equal(D.bills.length, 0);
});

test('PBB.ikatTagihan() -> CREATE tagihan baru (belum ada bill.pbbLink sebelumnya)', () => {
  const calls = [];
  const els = {
    pbbAssetPick: { value: '' },
    pbbTerutang: { textContent: 'RpFull500000' },
    pbbJatuhTempo: { value: '2026-12-01' },
  };
  const D = makeD();
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.ikatTagihan();
  assert.equal(D.bills.length, 1);
  assert.equal(D.bills[0].amount, 500000);
  assert.equal(D.bills[0].pbbLink, true);
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('refreshBillEverywhere'));
  assert.match(calls.join(','), /toast:.*dibuat/);
});

test('PBB.ikatTagihan() -> UPDATE tagihan existing (bill.pbbLink sudah ada utk aset yang sama), bukan create baru', () => {
  const calls = [];
  const D = makeD({
    assets: [{ id: 'as1', name: 'Rumah A', jenis: 'Rumah/Bangunan', nilai: 1 }],
    bills: [{ id: 'b1', name: 'PBB lama', amount: 100000, nextDue: '2025-01-01', freq: 'tahunan', pbbLink: 'as1' }],
  });
  const els = {
    pbbAssetPick: { value: 'as1' },
    pbbTerutang: { textContent: 'RpFull700000' },
    pbbJatuhTempo: { value: '2026-12-01' },
  };
  const { PBB } = makeCtx({ document: makeDoc(els), D, calls });
  PBB.ikatTagihan();
  assert.equal(D.bills.length, 1);
  assert.equal(D.bills[0].amount, 700000);
  assert.equal(D.bills[0].nextDue, '2026-12-01');
  assert.match(calls.join(','), /toast:.*diperbarui/);
});

// ---------------------------------------------------------------------------
// Zakat.hitungPenghasilan() / hitungMaal() / hitungFitrah()
// ---------------------------------------------------------------------------

test('Zakat.hitungPenghasilan() -> wajib zakat kalau income bulan ini >= nisab, 2.5%', () => {
  const calls = [];
  const now = new Date();
  const D = makeD({
    transactions: [{ type: 'income', amount: 6000000, date: now.toISOString().slice(0, 10) }],
  });
  const els = { zpIncomeBulan: {}, zpNisabBulan: {}, zpStatus: { style: {} }, zpJumlah: {} };
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls });
  Zakat.hitungPenghasilan();
  assert.match(els.zpStatus.textContent, /Wajib Zakat/);
  assert.equal(els.zpJumlah.textContent, 'RpFull150000');
});

test('Zakat.hitungMaal() -> save() dipanggil (utangJT ikut ditulis) & hitung total harta - utang', () => {
  const calls = [];
  const D = makeD({ assets: [{ id: 'as1', zakatable: true, nilai: 2000000 }] });
  const els = { zmUtang: { value: '0' }, zmTotalHarta: {}, zmNisab: {}, zmStatus: { style: {} }, zmJumlah: {}, zmHaulInfo: {} };
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls });
  Zakat.hitungMaal();
  assert.ok(calls.includes('save'));
  assert.ok(calls.includes('renderKekayaanBersih'));
  // totalSaldoAkun (1000000) + asetZakatable (2000000) - utang(0) = 3000000, < nisab (85*1jt)
  assert.equal(els.zmTotalHarta.textContent, 'RpFull3000000');
  assert.match(els.zmStatus.textContent, /Belum Wajib/);
});

test('Zakat.hitungFitrah() -> total = jiwa x zakatFitrahPerJiwa, minimal 1 jiwa', () => {
  const calls = [];
  const els = { zfJiwa: { value: '4' }, zfTotal: {} };
  const { Zakat } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  Zakat.hitungFitrah();
  assert.equal(els.zfTotal.textContent, 'RpFull180000');
});

// ---------------------------------------------------------------------------
// Zakat.catatDibayar() (create log + transaksi) / delLog() (delete)
// ---------------------------------------------------------------------------

test('Zakat.catatDibayar() jumlah 0 -> toast peringatan, TIDAK askConfirm/save', async () => {
  const calls = [];
  const els = { zpJumlah: { textContent: 'RpFull0' } };
  const { Zakat } = makeCtx({ document: makeDoc(els), D: makeD(), calls });
  await Zakat.catatDibayar('penghasilan');
  assert.match(calls.join(','), /toast:.*Belum ada kewajiban zakat/);
  assert.ok(!calls.includes('save'));
});

test('Zakat.catatDibayar() askConfirm ditolak -> TIDAK ada log/transaksi baru', async () => {
  const calls = [];
  const els = { zpJumlah: { textContent: 'RpFull250000' } };
  const D = makeD();
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls, askConfirmResult: false });
  await Zakat.catatDibayar('penghasilan');
  assert.equal(D.pajakZakat.zakatLog.length, 0);
  assert.equal(D.transactions.length, 0);
  assert.ok(!calls.includes('save'));
});

test('Zakat.catatDibayar() sukses -> CREATE 1 entry zakatLog + 1 transaksi expense, save()', async () => {
  const calls = [];
  const els = { zpJumlah: { textContent: 'RpFull250000' } };
  const D = makeD();
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls });
  await Zakat.catatDibayar('penghasilan');
  assert.equal(D.pajakZakat.zakatLog.length, 1);
  assert.equal(D.pajakZakat.zakatLog[0].jumlah, 250000);
  assert.equal(D.transactions.length, 1);
  assert.equal(D.transactions[0].type, 'expense');
  assert.equal(D.transactions[0].amount, 250000);
  assert.ok(calls.includes('save'));
  assert.match(calls.join(','), /toast:.*Tercatat/);
});

test('Zakat.catatDibayar("maal") sukses -> haulMaalMulai direset ke hari ini', async () => {
  const calls = [];
  const els = { zmJumlah: { textContent: 'RpFull500000' } };
  const D = makeD({ pajakZakat: Object.assign({}, makeD().pajakZakat, { haulMaalMulai: '2020-01-01' }) });
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls });
  await Zakat.catatDibayar('maal');
  assert.notEqual(D.pajakZakat.haulMaalMulai, '2020-01-01');
});

test('Zakat.delLog() askConfirm ditolak -> log TIDAK dihapus', async () => {
  const calls = [];
  const D = makeD({ pajakZakat: Object.assign({}, makeD().pajakZakat, { zakatLog: [{ id: 'z1', jenis: 'penghasilan', jumlah: 1000 }] }) });
  const els = { zakatLogList: {} };
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls, askConfirmResult: false });
  await Zakat.delLog('z1');
  assert.equal(D.pajakZakat.zakatLog.length, 1);
  assert.ok(!calls.includes('save'));
});

test('Zakat.delLog() sukses -> DELETE entry dari zakatLog, save()', async () => {
  const calls = [];
  const D = makeD({ pajakZakat: Object.assign({}, makeD().pajakZakat, { zakatLog: [{ id: 'z1', jenis: 'penghasilan', jumlah: 1000 }] }) });
  const els = { zakatLogList: {} };
  const { Zakat } = makeCtx({ document: makeDoc(els), D, calls });
  await Zakat.delLog('z1');
  assert.equal(D.pajakZakat.zakatLog.length, 0);
  assert.ok(calls.includes('save'));
});

// ---------------------------------------------------------------------------
// PPh21.getPTKP() / hitungProgresif() (murni) & hitung()/isiDariTransaksi() (save()+DOM)
// ---------------------------------------------------------------------------

test('PPh21.getPTKP() -> TK0 = 54jt, K1 = 54jt+4.5jt(kawin)+4.5jt(1 tanggungan)', () => {
  const { PPh21 } = makeCtx({ document: makeDoc(), D: makeD(), calls: [] });
  assert.equal(PPh21.getPTKP('TK0'), 54000000);
  assert.equal(PPh21.getPTKP('K1'), 54000000 + 4500000 + 4500000);
});

test('PPh21.hitungProgresif() -> pkp<=0 hasil 0 tanpa detail', () => {
  const { PPh21 } = makeCtx({ document: makeDoc(), D: makeD(), calls: [] });
  const r = PPh21.hitungProgresif(0);
  assert.equal(r.pajak, 0);
  assert.equal(r.detail.length, 0);
});

test('PPh21.hitungProgresif() -> pkp di bracket pertama saja (5%)', () => {
  const { PPh21 } = makeCtx({ document: makeDoc(), D: makeD(), calls: [] });
  const r = PPh21.hitungProgresif(50000000);
  assert.equal(r.pajak, 2500000);
  assert.equal(r.detail.length, 1);
});

test('PPh21.hitung() -> save() dgn brutoBulan/iuranBulan tersimpan ke D.pajakZakat', () => {
  const calls = [];
  const els = {
    pphBruto: { value: '10000000' },
    pphStatus: { value: 'TK0' },
    pphIuran: { value: '100000' },
    pphBrutoSetahun: {}, pphBiayaJabatan: {}, pphIuranSetahun: {}, pphNeto: {},
    pphStatusLabel: {}, pphPTKP: {}, pphPKP: {}, pphBracketDetail: {}, pphSetahun: {}, pphPerBulan: {},
  };
  const D = makeD();
  const { PPh21 } = makeCtx({ document: makeDoc(els), D, calls });
  PPh21.hitung();
  assert.equal(D.pajakZakat.pphBrutoBulan, 10000000);
  assert.equal(D.pajakZakat.pphIuranBulan, 100000);
  assert.ok(calls.includes('save'));
  assert.equal(els.pphBrutoSetahun.textContent, 'RpFull120000000');
});

test('PPh21.isiDariTransaksi() -> tanpa data income tahun ini, toast peringatan & tidak lanjut hitung', () => {
  const calls = [];
  const { PPh21 } = makeCtx({ document: makeDoc(), D: makeD(), calls });
  PPh21.isiDariTransaksi();
  assert.match(calls.join(','), /toast:.*Belum ada data pemasukan/);
});

test('PPh21.isiDariTransaksi() -> isi rata-rata pemasukan/bulan dari transaksi tahun berjalan lalu hitung()', () => {
  const calls = [];
  const y = new Date().getFullYear();
  const D = makeD({
    transactions: [
      { type: 'income', amount: 5000000, date: `${y}-01-15` },
      { type: 'income', amount: 7000000, date: `${y}-02-15` },
    ],
  });
  const els = {
    pphBruto: { value: '' },
    pphStatus: { value: 'TK0' },
    pphIuran: { value: '0' },
    pphBrutoSetahun: {}, pphBiayaJabatan: {}, pphIuranSetahun: {}, pphNeto: {},
    pphStatusLabel: {}, pphPTKP: {}, pphPKP: {}, pphBracketDetail: {}, pphSetahun: {}, pphPerBulan: {},
  };
  const { PPh21 } = makeCtx({ document: makeDoc(els), D, calls });
  PPh21.isiDariTransaksi();
  assert.equal(els.pphBruto.value, 6000000); // rata-rata (5jt+7jt)/2 bulan
  assert.match(calls.join(','), /toast:.*Diisi rata-rata/);
});

// ---------------------------------------------------------------------------
// PajakUMKM.render() (murni, tanpa save())
// ---------------------------------------------------------------------------

test('PajakUMKM.render() -> pajak final 0.5% dari omzet cobek bulan berjalan', () => {
  const calls = [];
  const now = new Date();
  const D = makeD({ cobek: [{ total: 20000000, date: now.toISOString().slice(0, 10) }] });
  const els = { umkmOmzet: {}, umkmPajak: {} };
  const { PajakUMKM } = makeCtx({ document: makeDoc(els), D, calls });
  PajakUMKM.render();
  assert.equal(els.umkmOmzet.textContent, 'RpFull20000000');
  assert.equal(els.umkmPajak.textContent, 'RpFull100000');
  assert.ok(!calls.includes('save'));
});
