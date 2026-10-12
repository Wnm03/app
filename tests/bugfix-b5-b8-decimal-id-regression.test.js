'use strict';
// tests/bugfix-b5-b8-decimal-id-regression.test.js — audit lanjutan (S2306)
// B5 parseDecStr: format id-ID ('1.500,50', '12.345.678', '1,234,567')
// B6 Debt.save(): bunga '7,5' tidak lagi terpotong jadi 7
// B7 EduFund.save(): inflasi/return koma desimal, 0% valid (bukan digeser ||12 / ||8)
// B8 EduFund.updatePreview(): pratinjau pakai parser yg sama dgn save()

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/loadSource');

const ROOT = path.join(__dirname, '..');
const parsers = new Function(
  fs.readFileSync(path.join(ROOT, 'pajak-aset-ui-wrappers.js'), 'utf8') +
  ';return {parseDecStr,parseDecimalID,parsePzNum,parseMoneyID}'
)();

test('B5 parseDecStr — format id-ID & en-US campuran', () => {
  const c = [
    ['1.500,50', 1500.5], ['12.345.678', 12345678], ['1,234,567', 1234567],
    ['1,234.5', 1234.5], ['7,5', 7.5], ['0,25', 0.25], ['1.5', 1.5],
    ['2500000', 2500000], ['-3,5', -3.5],
  ];
  for (const [raw, want] of c) assert.equal(parsers.parseDecStr(raw), want, raw);
  assert.equal(parsers.parseDecStr(''), null);
  assert.equal(parsers.parseDecStr('abc'), null);
});


test('B5 kontrak field uang vs kuantitas — 15.000 Rupiah tidak tertukar dengan desimal', () => {
  assert.equal(parsers.parseMoneyID('15.000'), 15000);
  assert.equal(parsers.parseMoneyID('1.500.000'), 1500000);
  assert.equal(parsers.parseMoneyID('1.500,50'), 1500.5);
  assert.equal(parsers.parseMoneyID('15,5'), 15.5);
  assert.equal(parsers.parseMoneyID(''), null);
  assert.equal(parsers.parseDecStr('1.234'), 1.234, 'parser kuantitas/desimal tidak diubah');
  const asset = fs.readFileSync(path.join(ROOT, 'modules/asset/aset.js'), 'utf8');
  assert.match(asset, /parseMoneyID\(_hargaBeliRaw\)/, 'harga beli aset harus memakai kontrak uang');
  assert.match(asset, /parseDecStr\(document\.getElementById\('assetJumlahUnit'\)\.value\)/, 'jumlah unit tetap desimal');
  const investmentList = fs.readFileSync(path.join(ROOT, 'modules/asset/investasi-list-view.js'), 'utf8');
  assert.match(investmentList, /parseMoneyID\(avgEl\.value\)/);
  assert.match(investmentList, /parseMoneyID\(curEl\.value\)/);
  const watch = fs.readFileSync(path.join(ROOT, 'modules/asset/investasi-watch-view.js'), 'utf8');
  assert.match(watch, /parseMoneyID\(lastEl\.value\)/);
  assert.match(watch, /parseMoneyID\(targetEl\.value\)/);
  const tx = fs.readFileSync(path.join(ROOT, 'modules/asset/investasi-tx-view.js'), 'utf8');
  assert.match(tx, /parseMoneyID\(feeEl\.value\)/);
  assert.match(tx, /parseMoneyID\(priceEl\.value\)/);
  assert.match(tx, /parseMoneyID\(amtEl\.value\)/);
  assert.match(tx, /parseDecStr\(qtyEl\.value\)/, 'kuantitas transaksi tetap mendukung pecahan');
});

function debtCtx(bunga) {
  const els = {
    debtName: { value: 'Bank X' }, debtJenis: { value: 'kta' }, debtNilai: { value: '5000000' },
    debtBunga: { value: bunga }, debtCicilan: { value: '500000' }, debtTanggal: { value: '2026-08-01' },
    debtJatuhTempo: { value: '' }, debtCatatan: { value: '' }, debtAssetId: { value: '' },
  };
  const D = { debts: [], bills: [], accounts: [{ id: 'acc1' }] };
  const { Debt } = loadSource(['modules/finance/piutang-utang.js'], {
    D, document: { getElementById: (id) => els[id] || null },
    uid: () => 9001, sameId: (a, b) => String(a) === String(b),
    parsePzNum: parsers.parsePzNum, parseDecimalID: parsers.parseDecimalID,
    toast() {}, withSaveGuard: (k, m, fn) => fn(), save() {}, closeModal() {},
    renderKekayaanBersih() {}, hitungZakatMaal() {}, renderBillList() {}, checkBills() {},
    escapeHtml: (s) => String(s), fmtFull: (n) => 'Rp' + n, fmt: (n) => 'Rp' + n,
  }, ['Debt']);
  Debt.save();
  return D.debts[0];
}

test('B6 Debt.save() — bunga "7,5" tersimpan 7.5; "0" tetap 0; negatif tetap diclamp 0', () => {
  assert.equal(debtCtx('7,5').bunga, 7.5);
  assert.equal(debtCtx('0').bunga, 0);
  assert.equal(debtCtx('').bunga, 0);
  assert.equal(debtCtx('-18').bunga, 0);
});

function eduCtx(els) {
  const D = { eduFunds: [], accounts: [] };
  const doc = { getElementById: (id) => els[id] || { style: {}, classList: { add() {}, remove() {}, toggle() {} } } };
  const { EduFund } = loadSource(['modules/finance/edukasi-dana.js'], {
    document: doc, D, uid: () => 'e1', sameId: (a, b) => String(a) === String(b),
    escapeHtml: (s) => String(s), fmt: (n) => 'Rp' + n, fmtFull: (n) => 'Rp' + n,
    parsePzNum: parsers.parsePzNum, parseDecimalID: parsers.parseDecimalID,
    recalcAccBalance: () => 0, withSaveGuard: (k, m, fn) => fn(), save() {}, openModal() {},
    closeModal() {}, toast() {},
  }, ['EduFund']);
  return { EduFund, D };
}

test('B7 EduFund.save() — koma desimal & 0% valid; kosong -> default', () => {
  const base = { eduName: { value: 'SD' }, eduBiayaHariIni: { value: '20.000.000' }, eduTahunTarget: { value: '2030' }, eduTerkumpul: { value: '0' } };
  let { EduFund, D } = eduCtx({ ...base, eduInflasi: { value: '7,5' }, eduReturn: { value: '6,25' } });
  EduFund.save();
  assert.equal(D.eduFunds[0].inflasi, 7.5);
  assert.equal(D.eduFunds[0].returnAsumsi, 6.25);
  assert.equal(D.eduFunds[0].biayaHariIni, 20000000);

  ({ EduFund, D } = eduCtx({ ...base, eduInflasi: { value: '0' }, eduReturn: { value: '0' } }));
  EduFund.save();
  assert.equal(D.eduFunds[0].inflasi, 0);
  assert.equal(D.eduFunds[0].returnAsumsi, 0);

  ({ EduFund, D } = eduCtx({ ...base, eduInflasi: { value: '' }, eduReturn: { value: '' } }));
  EduFund.save();
  assert.equal(D.eduFunds[0].inflasi, 12);
  assert.equal(D.eduFunds[0].returnAsumsi, 8);
});

test('B8 EduFund.updatePreview() — input mentah "50.000.000"/"7,5" sama hasilnya dgn calc() angka bersih', () => {
  const year = new Date().getFullYear() + 5;
  const mk = (b, i, r) => ({
    eduBiayaHariIni: { value: b }, eduTahunTarget: { value: String(year) }, eduInflasi: { value: i },
    eduReturn: { value: r }, eduTerkumpul: { value: '0' }, eduAcc: { value: '' },
    eduSavedWrap: { style: {} }, eduFundPreview: { style: {}, innerHTML: '' },
  });
  const raw = mk('50.000.000', '7,5', '6,5');
  const a = eduCtx(raw); a.EduFund.updatePreview();
  const clean = mk('50000000', '7.5', '6.5');
  const b = eduCtx(clean); b.EduFund.updatePreview();
  assert.ok(raw.eduFundPreview.innerHTML.length > 0);
  assert.equal(raw.eduFundPreview.innerHTML, clean.eduFundPreview.innerHTML);
});

test('B5-B8 lanjutan: parseMoneyID memperlakukan awalan 0 sebagai desimal, bukan ribuan', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'pajak-aset-ui-wrappers.js'), 'utf8');
  const a = src.indexOf('function parseMoneyID'), b = src.indexOf('function parseDecimalID');
  const parseMoneyID = new Function(src.slice(a, b) + ';return parseMoneyID')();
  assert.equal(parseMoneyID('0.500'), 0.5);
  assert.equal(parseMoneyID('0,500'), 0.5);
  assert.equal(parseMoneyID('15.000'), 15000);
  assert.equal(parseMoneyID('1.234'), 1234);
  assert.equal(parseMoneyID('0.500.000'), 500000);
});

test('B5-B8 lanjutan: parsePzNum tidak melipatgandakan desimal eksplisit, tampilan rupiah tetap utuh', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'pajak-aset-ui-wrappers.js'), 'utf8');
  const a = src.indexOf('function parsePzNum'), b = src.indexOf('function parseDecimalID');
  const { parsePzNum } = new Function(src.slice(a, b) + ';return {parsePzNum}')();
  assert.equal(parsePzNum('Rp 1.234.567'), 1234567);
  assert.equal(parsePzNum('1.500.000'), 1500000);
  assert.equal(parsePzNum('15.000'), 15000);
  assert.equal(parsePzNum('1500000,50'), 1500001);
  assert.equal(parsePzNum('1.500.000,5'), 1500001);
  assert.equal(parsePzNum('-2.500'), -2500);
  assert.equal(parsePzNum('1500000'), 1500000);
  assert.equal(parsePzNum(''), 0);
  assert.equal(parsePzNum(null), 0);
});
