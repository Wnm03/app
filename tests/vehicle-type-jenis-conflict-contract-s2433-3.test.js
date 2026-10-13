'use strict';
// S2433.3 — tes KONTRAK deteksi konflik (non-mutatif). Tidak menyentuh source produksi/bundle.
const test = require('node:test');
const assert = require('node:assert/strict');
const { deteksiKonflik, KATEGORI } = require('../scripts/lib-deteksi-konflik-jenis-vehicletype.js');

const kat = (vs, o) => deteksiKonflik(vs, o).temuan.map((t) => `${t.id}:${t.kategori}`);
const deepFreeze = (o) => { Object.values(o).forEach((x) => { if (x && typeof x === 'object') deepFreeze(x); }); return Object.freeze(o); };

test('konsisten -> tanpa temuan (termasuk beda huruf besar/spasi)', () => {
  assert.deepEqual(kat([{ id: 1, jenis: 'motor', vehicleType: 'motor' }, { id: 2, jenis: ' Mobil ', vehicleType: 'MOBIL' }]), []);
});
test('motor vs mobil -> konflik', () => {
  assert.deepEqual(kat([{ id: 1, jenis: 'mobil', vehicleType: 'motor' }]), ['1:' + KATEGORI.KONFLIK]);
});
test('listrik vs mobil/motor -> lintas konsep, BUKAN konflik; listrik==listrik tidak dilaporkan', () => {
  assert.deepEqual(kat([{ id: 1, jenis: 'listrik', vehicleType: 'mobil' }, { id: 2, jenis: 'motor', vehicleType: 'listrik' }, { id: 3, jenis: 'listrik', vehicleType: 'listrik' }]),
    ['1:' + KATEGORI.LINTAS_KONSEP, '2:' + KATEGORI.LINTAS_KONSEP]);
});
test('satu field kosong -> tidak lengkap (bukan konflik), menyebut field kosong; kedua kosong -> tanpa_tipe', () => {
  const r = deteksiKonflik([{ id: 1, jenis: 'motor' }, { id: 2, vehicleType: 'mobil' }, { id: 3 }]).temuan;
  assert.deepEqual(r.map((t) => [t.kategori, t.fieldKosong]), [[KATEGORI.TIDAK_LENGKAP, 'vehicleType'], [KATEGORI.TIDAK_LENGKAP, 'jenis'], [KATEGORI.TANPA_TIPE, undefined]]);
});
test('nilai tidak dikenal dilaporkan terpisah per field dan tidak dihitung konflik', () => {
  const r = deteksiKonflik([{ id: 1, jenis: 'truk', vehicleType: 'mobil' }]).temuan;
  assert.deepEqual(r.map((t) => [t.kategori, t.field, t.nilai]), [[KATEGORI.NILAI_TIDAK_VALID, 'jenis', 'truk']]);
});
test('snapshot beda dilaporkan terpisah; snapshot sama tidak', () => {
  assert.deepEqual(kat([{ id: 1, jenis: 'motor', vehicleType: 'motor', sot: { vehicleType: 'mobil' } }, { id: 2, jenis: 'motor', vehicleType: 'motor', sot: { vehicleType: 'motor' } }]), ['1:' + KATEGORI.SNAPSHOT_BEDA]);
});
test('profil model beda dicatat hanya bila profil diberikan; tanpa profil tidak ada temuan', () => {
  const v = [{ id: 1, modelId: 'vario-125', jenis: 'mobil', vehicleType: 'mobil' }];
  assert.deepEqual(kat(v), []);
  assert.deepEqual(kat(v, { profilModel: { 'vario-125': 'motor' } }), ['1:' + KATEGORI.PROFIL_MODEL_BEDA]);
});
test('INVARIAN: input beku tidak berubah/tidak melempar, hasil identik di dua kali jalan, input non-array aman', () => {
  const v = deepFreeze([{ id: 1, name: 'A', jenis: 'mobil', vehicleType: 'motor', sot: { vehicleType: 'mobil' }, modelId: 'm' }, null, { id: 2 }]);
  const snap = JSON.stringify(v);
  const a = deteksiKonflik(v, { profilModel: { m: 'motor' } }), b = deteksiKonflik(v, { profilModel: { m: 'motor' } });
  assert.deepEqual(a, b); assert.equal(JSON.stringify(v), snap);
  assert.equal(a.totalDiperiksa, 2);
  assert.deepEqual(deteksiKonflik(null).temuan, []);
});
test('ringkasan menghitung tiap kategori (semua kunci hadir, termasuk 0)', () => {
  const r = deteksiKonflik([{ id: 1, jenis: 'mobil', vehicleType: 'motor' }]);
  assert.deepEqual(Object.keys(r.ringkasan).sort(), Object.values(KATEGORI).sort());
  assert.equal(r.ringkasan[KATEGORI.KONFLIK], 1); assert.equal(r.ringkasan[KATEGORI.SNAPSHOT_BEDA], 0);
});
