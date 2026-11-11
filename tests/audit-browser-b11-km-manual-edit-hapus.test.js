'use strict';
// AUDIT-BROWSER B11: KM manual (D.kmLogs) tidak bisa diedit/dihapus -> typo 999.999 mengunci input BBM/servis
// dan membuat pengingat "terlewat" palsu. Kini ada riwayat KM manual dengan edit/hapus, dan pesan penolakan
// KM menyebut sumber KM-nya (KM manual / catatan BBM / catatan servis).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B11: modal KM punya daftar riwayat + tombol simpan ber-id', () => {
  const m = R('modules/shared/modals.js');
  assert.match(m, /id=\\"kmHistoryList\\"/);
  assert.match(m, /id=\\"kmSaveBtn\\"/);
});

test('B11: vehicle-core mendefinisikan renderKmHistory/editKmLog/delKmLog dan saveKm mendukung mode edit', () => {
  const v = R('modules/vehicle/vehicle-core.js');
  assert.match(v, /function renderKmHistory\(/);
  assert.match(v, /function editKmLog\(/);
  assert.match(v, /async function delKmLog\(/);
  assert.match(v, /if\(_editing\)\{_editing\.km=km;/);
  assert.match(v, /data-action="delKmLog"/);
});

test('B11: pesan guard KM menyebut sumber', () => {
  const t = R('modules/finance/tx-bbm.js');
  assert.match(t, /'KM manual'/);
  assert.match(t, /'KM lebih kecil dari '\+prior\._srcLabel\+' sebelumnya \('/);
});

// perilaku: hapus KM typo membuat getVehicleKm kembali normal
const vm = require('node:vm');
function mk() {
  const els = {};
  const el = (id) => (els[id] = els[id] || { value: '', textContent: '', innerHTML: '' });
  const ctx = {
    console, window: {}, toast() {}, escapeHtml: (s) => String(s), save() {}, uid: (() => { let n = 0; return () => 'k' + (++n); })(),
    askConfirm: async () => true, renderCnTab() {}, renderDashboardServisReminder() {}, curVehicleId: 'v',
    document: { getElementById: (i) => el(i) },
    D: { vehicles: [{ id: 'v' }], kmLogs: [{ id: 'a', vehicleId: 'v', date: '2026-11-01', km: 1000 }, { id: 'b', vehicleId: 'v', date: '2026-11-02', km: 999999 }], bbmLogs: [], servisLogs: [] },
    getVehicleKm: (vid) => Math.max(0, ...ctx.D.kmLogs.filter((k) => k.vehicleId === vid).map((k) => k.km)),
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const src = R('modules/vehicle/vehicle-core.js');
  const a = src.indexOf('let _kmEditId=null;'); const b = src.indexOf('async function saveKm(){');
  vm.runInContext(src.slice(a, b) + '\nthis.renderKmHistory=renderKmHistory;this.editKmLog=editKmLog;this.delKmLog=delKmLog;', ctx);
  return { ctx, els };
}
test('B11: delKmLog menghapus typo dan KM kendaraan kembali ke nilai wajar', async () => {
  const { ctx, els } = mk();
  assert.strictEqual(ctx.getVehicleKm('v'), 999999);
  await ctx.delKmLog('b');
  assert.strictEqual(ctx.D.kmLogs.length, 1);
  assert.strictEqual(ctx.getVehicleKm('v'), 1000);
  assert.strictEqual(els.kmVal.value, 1000);
});
test('B11: editKmLog mengisi form dan riwayat menampilkan tombol edit/hapus', () => {
  const { ctx, els } = mk();
  ctx.renderKmHistory();
  assert.match(els.kmHistoryList.innerHTML, /editKmLog/);
  assert.match(els.kmHistoryList.innerHTML, /delKmLog/);
  ctx.editKmLog('b');
  assert.strictEqual(els.kmVal.value, 999999);
  assert.strictEqual(els.kmSaveBtn.textContent, 'Simpan Perubahan');
});
