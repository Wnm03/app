'use strict';
// B14: UI paket pengingat di kartu Pengingat Servis (buat, tunda/aktifkan/abaikan, checklist) lewat ServiceReminderPackageSOT.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = R('modules/vehicle/servis-b.js');

test('B14: kartu pengingat merender bagian paket di kedua cabang render', () => {
  assert.equal((src.match(/Servis\.renderReminderPackages\(card\);/g) || []).length, 2);
  for (const a of ['openPackageCreate', 'savePackageCreate', 'togglePackageItem', 'snoozePackage', 'activatePackage', 'dismissPackage']) assert.match(src, new RegExp('data-action="Servis\\.' + a + '"|' + a + '\\('));
});

function mk() {
  const toasts = [];
  const ctx = { console, D: { servisLogs: [], serviceReminderPackages: [] }, save() {}, uid: (() => { let n = 0; return () => 'u' + (++n); })(), toasts, toast: (m) => toasts.push(m), curVehicleId: 'v', askConfirm: async () => true, escapeHtml: String };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(R('modules/vehicle/reminder-lifecycle.js'), ctx);
  vm.runInContext(R('modules/vehicle/service-reminder-package-sot.js'), ctx);
  const a = src.indexOf('_pkgApi(){'); const b = src.indexOf('renderReminderPackages(card){');
  const c = src.indexOf('togglePackageItem(pkgId,itemId){'); const d = src.indexOf('async markLogAsGanti(id){');
  ctx.refreshed = 0;
  vm.runInContext('var Servis={renderReminder(){refreshed++;},' + src.slice(a, b) + src.slice(c, d) + '};', ctx);
  const p = ctx.ServiceReminderPackageSOT.create({ vehicleId: 'v', title: 'P', targets: [{ serviceComponentId: 'oli-mesin', componentName: 'Oli' }] }).package;
  return { ctx, p };
}
test('B14: togglePackageItem membalik done dan me-refresh kartu', () => {
  const { ctx, p } = mk();
  const r = ctx.Servis.togglePackageItem(p.id, p.checklist[0].id);
  assert.equal(r.ok, true); assert.equal(ctx.ServiceReminderPackageSOT.byId(p.id).checklist[0].done, true);
  ctx.Servis.togglePackageItem(p.id, p.checklist[0].id);
  assert.equal(ctx.ServiceReminderPackageSOT.byId(p.id).checklist[0].done, false);
  assert.equal(ctx.refreshed, 2);
  assert.equal(ctx.Servis.togglePackageItem(p.id, 'x').code, 'item_not_found');
});
test('B14: snooze 7 hari -> SNOOZED ber-batas; aktifkan -> ACTIVE; abaikan -> DISMISSED dan tak bisa dibuka lagi', async () => {
  const { ctx, p } = mk(); const P = ctx.ServiceReminderPackageSOT;
  ctx.Servis.snoozePackage(p.id, 7);
  const sn = P.byId(p.id); assert.equal(sn.status, 'SNOOZED');
  const days = (Date.parse(sn.snoozedUntil) - Date.now()) / 86400000; assert.ok(days > 6.9 && days <= 7.01);
  ctx.Servis.activatePackage(p.id); assert.equal(P.byId(p.id).status, 'ACTIVE');
  const r = await ctx.Servis.dismissPackage(p.id); assert.equal(r.ok, true);
  assert.equal(P.byId(p.id).status, 'DISMISSED');
  assert.equal(ctx.Servis.activatePackage(p.id).ok, false);
});
test('B14: abaikan dibatalkan di konfirmasi -> status tidak berubah', async () => {
  const { ctx, p } = mk(); ctx.askConfirm = async () => false;
  const r = await ctx.Servis.dismissPackage(p.id);
  assert.equal(r.code, 'CANCELLED'); assert.equal(ctx.ServiceReminderPackageSOT.byId(p.id).status, 'ACTIVE');
});
