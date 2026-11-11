'use strict';
// AUDIT-BROWSER B12: COMPLETED adalah state terminal; menghapus log servis yang menyelesaikan paket pengingat
// meninggalkan paket COMPLETED yatim dan pengingatnya tidak pernah aktif lagi. reopenIfOrphaned() membuka kembali
// paket (ACTIVE) bila tak ada log lain yang menunjuknya; dipanggil dari ServiceEventLifecycle.remove/removeAsync.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function mk() {
  const saves = [];
  const ctx = { console, D: { servisLogs: [], serviceReminderPackages: [] }, save: (o) => saves.push(o), uid: (() => { let n = 0; return () => 'u' + (++n); })() };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(R('modules/vehicle/reminder-lifecycle.js'), ctx);
  vm.runInContext(R('modules/vehicle/service-reminder-package-sot.js'), ctx);
  vm.runInContext(R('modules/vehicle/service-event-lifecycle.js'), ctx);
  return { ctx, saves };
}
function seed(ctx, n) {
  const P = ctx.ServiceReminderPackageSOT;
  const pkg = P.create({ vehicleId: 'v', targets: [{ categoryId: 'c1' }] }).package;
  const rows = [];
  for (let i = 0; i < n; i++) { const r = { id: 's' + i, vehicleId: 'v', categoryId: 'c1' }; ctx.D.servisLogs.push(r); rows.push(r); }
  const res = P.completeFromHistory(pkg.id, rows.map((r) => r.id));
  assert.ok(res.ok);
  assert.strictEqual(P.byId(pkg.id).status, 'COMPLETED');
  return { P, pkg, rows };
}

test('B12: hapus satu-satunya log penyelesai -> paket kembali ACTIVE', () => {
  const { ctx, saves } = mk();
  const { P, pkg, rows } = seed(ctx, 1);
  ctx.D.servisLogs = ctx.D.servisLogs.filter((x) => x.id !== rows[0].id);
  ctx.ServiceEventLifecycle.remove(rows[0], {});
  const p = P.byId(pkg.id);
  assert.strictEqual(p.status, 'ACTIVE');
  assert.strictEqual(p.completedSessionId, undefined);
  assert.strictEqual(p.completedAt, undefined);
  assert.ok(saves.length >= 1);
});

test('B12: masih ada log lain pada paket -> tetap COMPLETED', () => {
  const { ctx } = mk();
  const { P, pkg, rows } = seed(ctx, 2);
  ctx.D.servisLogs = ctx.D.servisLogs.filter((x) => x.id !== rows[0].id);
  ctx.ServiceEventLifecycle.remove(rows[0], {});
  assert.strictEqual(P.byId(pkg.id).status, 'COMPLETED');
});

test('B12: dipanggil SEBELUM log dikeluarkan dari D.servisLogs (jalur Keuangan) tetap benar', () => {
  const { ctx } = mk();
  const { P, pkg, rows } = seed(ctx, 1);
  ctx.ServiceEventLifecycle.remove(rows[0], {});
  assert.strictEqual(P.byId(pkg.id).status, 'ACTIVE');
});

test('B12: log tanpa paket / paket tidak ada / paket belum COMPLETED -> tidak berubah, tidak melempar', () => {
  const { ctx } = mk();
  const P = ctx.ServiceReminderPackageSOT;
  assert.strictEqual(P.reopenIfOrphaned({ id: 'x' }).code, 'no_package');
  assert.strictEqual(P.reopenIfOrphaned({ id: 'x', reminderPackageId: 'nope' }).code, 'not_found');
  const pkg = P.create({ vehicleId: 'v', targets: [{ categoryId: 'c1' }] }).package;
  assert.strictEqual(P.reopenIfOrphaned({ id: 'x', reminderPackageId: pkg.id }).reopened, false);
  assert.doesNotThrow(() => ctx.ServiceEventLifecycle.remove(null, {}));
});

test('B12: unlink (log servis tetap ada) tidak membuka kembali paket', () => {
  const { ctx } = mk();
  const { P, pkg, rows } = seed(ctx, 1);
  ctx.ServiceEventLifecycle.unlink(rows[0], {});
  assert.strictEqual(P.byId(pkg.id).status, 'COMPLETED');
});

test('B12: id paket dari uid() numerik tetap ditemukan oleh byId/get (dulu byId selalu null)', () => {
  const { ctx } = mk();
  ctx.uid = () => 1794393907667; // uid() aplikasi mengembalikan number
  const P = ctx.ServiceReminderPackageSOT;
  const pkg = P.create({ vehicleId: 'v', targets: [{ categoryId: 'c1' }] }).package;
  assert.strictEqual(typeof pkg.id, 'string');
  assert.ok(P.byId(1794393907667));
  ctx.D.serviceReminderPackages[0].id = 1794393907667; // data lama dengan id numerik
  assert.ok(P.byId('1794393907667'));
  assert.strictEqual(P.get('1794393907667').length, 1);
});
