'use strict';
// tests/fuel-jenis-wiring-s753.test.js — Sesi 753 (fitur "Referensi Harga
// BBM via AI", wiring: car-notes.js BBM.openModal/_saveInner, tx-bbm.js
// recordBbmLog/toggleTxBbmFields/applyTxBbmFromTx, transaksi.js edit-tx
// restore txBbmJenis). Fokus sesi ini murni WIRING -- bug duplikat dropdown
// "Jenis BBM" (bbmJenis/txBbmJenis, modules/shared/modals.js) SENGAJA
// dibiarkan dulu (belum diperbaiki), sesuai arahan sesi.
//
// Test ini fokus ke recordBbmLog() (modules/finance/tx-bbm.js) -- fungsi
// MURNI (tidak baca/tulis DOM), jadi aman dites lewat loadSource() tanpa
// perlu mock document.getElementById (beda dari sesi lalu yang mock-nya
// sendiri jadi sumber kegagalan test, bukan logic aplikasinya).

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD() {
  return { bbmLogs: [] };
}

function loadTxBbm(D) {
  let n = 1000;
  const uid = () => String(n++);
  const ctx = loadSource(['modules/finance/tx-bbm.js'], { D, uid });
  return ctx;
}

test('s753: recordBbmLog() baru -- jenis dikirim caller, tersimpan di D.bbmLogs[].jenis', () => {
  const D = makeD();
  const ctx = loadTxBbm(D);
  const result = ctx.recordBbmLog({
    vehicleId: 'v1', date: '2026-09-07', km: 12000, liter: 3.5, harga: 10000,
    cost: 35000, spbu: 'Pertamina', fullTank: true, note: '', accountId: 'a1',
    jenis: 'pertamax', txId: 'tx1', existingBbmId: null,
  });
  assert.equal(result.isNew, true);
  const b = D.bbmLogs.find((x) => x.id === result.bbmId);
  assert.ok(b, 'log BBM baru harus tersimpan di D.bbmLogs');
  assert.equal(b.jenis, 'pertamax');
});

test('s753: recordBbmLog() baru -- jenis TIDAK dikirim caller (mis. pemanggil lama) -> tidak throw, field jenis tidak ada nilai valid', () => {
  const D = makeD();
  const ctx = loadTxBbm(D);
  const result = ctx.recordBbmLog({
    vehicleId: 'v1', date: '2026-09-07', km: 12000, liter: 3.5, harga: 10000,
    cost: 35000, spbu: '', fullTank: false, note: '', accountId: 'a1',
    txId: 'tx1', existingBbmId: null,
  });
  const b = D.bbmLogs.find((x) => x.id === result.bbmId);
  assert.ok(b);
  assert.ok(!b.jenis, 'jenis tidak boleh terisi kalau caller tidak mengirimnya');
});

test('s753: recordBbmLog() edit -- jenis baru menimpa jenis lama', () => {
  const D = makeD();
  D.bbmLogs.push({
    id: 'bbm1', vehicleId: 'v1', date: '2026-09-01', km: 11000, liter: 3,
    harga: 9500, cost: 28500, spbu: 'Shell', fullTank: true, note: '',
    accountId: 'a1', jenis: 'pertalite', txLinkId: 'tx0',
  });
  const ctx = loadTxBbm(D);
  const result = ctx.recordBbmLog({
    vehicleId: 'v1', date: '2026-09-07', km: 12000, liter: 3.5, harga: 12000,
    cost: 42000, spbu: 'Shell', fullTank: true, note: '', accountId: 'a1',
    jenis: 'pertamaxTurbo', txId: 'tx0', existingBbmId: 'bbm1',
  });
  assert.equal(result.isNew, false);
  const b = D.bbmLogs.find((x) => x.id === 'bbm1');
  assert.equal(b.jenis, 'pertamaxTurbo');
});

test('s753: recordBbmLog() edit -- jenis TIDAK dikirim caller -> jenis lama yang sudah tersimpan TIDAK ditimpa jadi kosong', () => {
  const D = makeD();
  D.bbmLogs.push({
    id: 'bbm1', vehicleId: 'v1', date: '2026-09-01', km: 11000, liter: 3,
    harga: 9500, cost: 28500, spbu: 'Shell', fullTank: true, note: '',
    accountId: 'a1', jenis: 'solar', txLinkId: 'tx0',
  });
  const ctx = loadTxBbm(D);
  ctx.recordBbmLog({
    vehicleId: 'v1', date: '2026-09-08', km: 12500, liter: 4, harga: 12000,
    cost: 48000, spbu: 'Shell', fullTank: true, note: '', accountId: 'a1',
    txId: 'tx0', existingBbmId: 'bbm1',
  });
  const b = D.bbmLogs.find((x) => x.id === 'bbm1');
  assert.equal(b.jenis, 'solar', 'jenis lama harus tetap solar, tidak boleh hilang/null');
});

test('s753 (lanjutan): bug duplikat dropdown "Jenis BBM" (bbmJenis/txBbmJenis) di modals.js SUDAH diperbaiki -- masing-masing cuma 1x', () => {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const html = ctx.MODAL_HTML.join('\n');
  const bbmJenisCount = (html.match(/id="bbmJenis"/g) || []).length;
  const txBbmJenisCount = (html.match(/id="txBbmJenis"/g) || []).length;
  assert.equal(bbmJenisCount, 1, 'bbmJenis harus cuma 1x sekarang (duplikat sudah dihapus)');
  assert.equal(txBbmJenisCount, 1, 'txBbmJenis harus cuma 1x sekarang (duplikat sudah dihapus)');
});

test('s753 (lanjutan): bbmModal -- markup Jenis BBM tetap lengkap (label, select, onchange) setelah dedup', () => {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const html = ctx.MODAL_HTML.join('\n');
  const bbmModalIdx = html.indexOf('id="bbmModal"');
  assert.notEqual(bbmModalIdx, -1);
  const jenisIdx = html.indexOf('id="bbmJenis"', bbmModalIdx);
  assert.notEqual(jenisIdx, -1);
  const bbmHargaIdx = html.indexOf('id="bbmHarga"', bbmModalIdx);
  assert.ok(jenisIdx < bbmHargaIdx, 'dropdown Jenis BBM harus tetap sebelum field Harga per Liter');
  const section = html.slice(jenisIdx - 60, bbmHargaIdx);
  assert.match(section, /Jenis BBM/);
  // CSP-fix (lanjutan): inline onchange="FuelPriceRef.onSelectChange(...)" sudah
  // dimigrasikan jadi data-onchange="onBbmJenisChange" (wrapper yg memanggil
  // FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId) di runtime).
  assert.match(section, /data-onchange="onBbmJenisChange"/);
  assert.match(section, /id="fuelRefCheckBtn"/, 'tombol cek AI (S751) harus tetap ada persis setelah dropdown');
});

test('s753 (lanjutan): txBbmFields -- markup Jenis BBM tetap lengkap (label, select, onchange) setelah dedup', () => {
  const ctx = loadSource(['modules/shared/modals.js'], {}, ['MODAL_HTML']);
  const html = ctx.MODAL_HTML.join('\n');
  const wrapIdx = html.indexOf('id="txBbmFields"');
  assert.notEqual(wrapIdx, -1);
  const jenisIdx = html.indexOf('id="txBbmJenis"', wrapIdx);
  assert.notEqual(jenisIdx, -1);
  const checkBtnIdx = html.indexOf('id="txFuelRefCheckBtn"', wrapIdx);
  assert.ok(jenisIdx < checkBtnIdx, 'dropdown Jenis BBM harus tetap sebelum tombol cek AI (S752)');
  const section = html.slice(jenisIdx - 60, checkBtnIdx);
  assert.match(section, /Jenis BBM/);
  // CSP-fix (lanjutan): inline onchange="FuelPriceRef.onSelectChange(...)" sudah
  // dimigrasikan jadi data-onchange="onTxBbmJenisChange" (wrapper yg baca ulang
  // document.getElementById('txBbmVehicle').value tiap dipanggil di runtime).
  assert.match(section, /data-onchange="onTxBbmJenisChange"/);
});
