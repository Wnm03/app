'use strict';
// AUDIT B13: (1) edit interval dari kartu pengingat kendaraan tertentu tersimpan sbg override manual kendaraan itu,
// (2) tombol "Tandai Ganti" utk log lama ber-actionType kosong, (3) renderDashboardServisReminder (kode mati) dihapus,
// (4) audit paket pengingat: DISMISSED/COMPLETED tak bisa diselesaikan ulang, SNOOZED punya batas waktu, checklist ikut selesai.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadSource } = require('./helpers/loadSource');
const root = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// ---------- (1) interval per kendaraan ----------
function el(o) { return Object.assign({ value: '', disabled: false, textContent: '', checked: false, innerHTML: '', style: {}, dataset: {}, classList: { add() {}, remove() {} } }, o || {}); }
function mkSave(ctxVeh, catVehicleId) {
  const D = { vehicles: [{ id: 'veh1', name: 'Vario' }, { id: 'veh2', name: 'Xpander' }], sparepartCats: [{ id: 'c1', name: 'Oli Mesin', code: 'OLI', intervalKm: 2000, intervalBulan: 0, vehicleId: catVehicleId, showInReminder: true }], partsStock: [], servisLogs: [] };
  const els = { sparepartModalTitle: el(), sparepartName: el(), sparepartInterval: el(), sparepartIntervalBulan: el(), sparepartCode: el(), sparepartShowInReminder: el({ checked: true }), sparepartVehicleId: el(), sparepartGroupId: el(), sparepartAiSuggestBox: el(), sparepartDelBtn: el() };
  const calls = [];
  const ServiceIntervalSOT = {
    active: (cat, vid) => ({ intervalKm: vid === 'veh1' ? 4000 : cat.intervalKm, intervalBulan: 0, source: 'pedoman' }),
    setManual: (cat, vid, km, mo) => { calls.push(['manual', vid, km, mo]); return { ok: true }; },
    setGuideline: (cat, vid, km, mo) => { calls.push(['guideline', vid, km, mo]); return { ok: true }; },
    setAiRecommendation: (cat, vid, km, mo) => { calls.push(['ai', vid, km, mo]); return { ok: true }; },
  };
  const ctx = loadSource(['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js', 'modules/vehicle/sparepart-servis-ui.js'], {
    D, curVehicleId: 'veh1', document: { getElementById: (id) => els[id] || null, createElement: () => el({ appendChild() {} }) },
    openModal() {}, closeModal() {}, save() {}, toast() {}, askConfirm: async () => true, renderServisList() {},
    matchingVehicleName: () => null, codeFromName: (s) => String(s).slice(0, 3).toUpperCase(), escapeHtml: (s) => String(s == null ? '' : s), MY_WRENCH: {}, ServiceIntervalSOT,
  }, ['Sparepart']);
  ctx._els = els; ctx._calls = calls; ctx._D = D; return ctx;
}
test('B13-1: kategori global dibuka dari kartu veh1, interval diubah -> override manual veh1, kategori global utuh', () => {
  const ctx = mkSave('veh1', null);
  ctx.Sparepart.openCatModalById('c1', { contextVehicleId: 'veh1' });
  assert.equal(ctx._els.sparepartInterval.value, 4000); // form menampilkan nilai efektif
  ctx._els.sparepartInterval.value = '3000';
  ctx.Sparepart.saveCat();
  assert.deepEqual(ctx._calls.at(-1), ['manual', 'veh1', 3000, 0]);
  const cat = ctx._D.sparepartCats[0];
  assert.equal(cat.intervalKm, 2000);
  assert.ok(!cat.vehicleId);
});
test('B13-1: tanpa konteks kendaraan perilaku lama (kategori global menyimpan interval ke kategori)', () => {
  const ctx = mkSave('veh1', null);
  ctx.Sparepart.openCatModalById('c1');
  ctx._els.sparepartInterval.value = '3000';
  ctx.Sparepart.saveCat();
  assert.equal(ctx._calls.filter((c) => c[1] === 'veh1').length, 0);
  assert.equal(ctx._D.sparepartCats[0].intervalKm, 3000);
});
test('B13-1: konteks kendaraan tapi interval TIDAK diubah -> tidak membuat override', () => {
  const ctx = mkSave('veh1', null);
  ctx.Sparepart.openCatModalById('c1', { contextVehicleId: 'veh1' });
  ctx._els.sparepartName.value = 'Oli Mesin';
  ctx.Sparepart.saveCat();
  assert.equal(ctx._calls.filter((c) => c[0] === 'manual').length, 0);
});
test('B13-1: openCatModalById tanpa opts mereset konteks lama', () => {
  const ctx = mkSave('veh1', null);
  ctx.Sparepart.openCatModalById('c1', { contextVehicleId: 'veh1' });
  ctx.Sparepart.openCatModalById('c1');
  assert.equal(ctx.Sparepart._contextVehicleId, null);
});
test('B13-1: editSparepartFromReminder meneruskan kendaraan aktif', () => {
  assert.match(R('modules/vehicle/servis-b.js'), /openCatModalById\(catId,\{contextVehicleId:/);
});

// ---------- (2) tandai ganti ----------
function mkGanti(logs) {
  const D = { servisLogs: logs, sparepartCats: [{ id: 'c1', intervalKm: 2000 }] };
  const src = R('modules/vehicle/servis-b.js');
  const a = src.indexOf('async markLogAsGanti(id){'); const b = src.indexOf('return {ok:true,id:log.id};\n}', a) + 'return {ok:true,id:log.id};\n}'.length;
  const toasts = [], saves = []; let confirm = true;
  const ctx = { console, D, curVehicleId: 'v', toast: (m) => toasts.push(m), save: (o) => saves.push(o), askConfirm: async () => confirm, refreshCarNotesAfterMutation() {}, Servis: { renderList() {}, renderReminder() {} },
    buildServiceNextDueSnapshot: () => ({ nextDueKm: 12000, nextDueDate: null, nextDueAxis: 'km' }) };
  vm.createContext(ctx);
  vm.runInContext('this.M={' + src.slice(a, b) + '}', ctx);
  return { ctx, toasts, saves, setConfirm: (v) => { confirm = v; } };
}
test('B13-2: log tanpa actionType ditandai ganti + snapshot + riwayat edit + save', async () => {
  const { ctx, saves, toasts } = mkGanti([{ id: 's1', vehicleId: 'v', categoryId: 'c1', km: 10000, date: '2026-01-01', item: 'Oli' }]);
  const r = await ctx.M.markLogAsGanti('s1');
  assert.equal(r.ok, true);
  const l = ctx.D.servisLogs[0];
  assert.equal(l.actionType, 'ganti'); assert.equal(l.nextDueKm, 12000);
  assert.equal(l.editHistory.at(-1).scope, 'mark-action-type');
  assert.equal(saves.length, 1); assert.ok(toasts.at(-1).includes('Ganti'));
});
test('B13-2: log yang sudah punya actionType tidak disentuh; batal konfirmasi = tidak berubah; id tak ada = ditolak', async () => {
  const m = mkGanti([{ id: 's1', actionType: 'periksa' }, { id: 's2', item: 'x' }]);
  assert.equal((await m.ctx.M.markLogAsGanti('s1')).code, 'ALREADY_SET');
  assert.equal(m.ctx.D.servisLogs[0].actionType, 'periksa');
  m.setConfirm(false);
  assert.equal((await m.ctx.M.markLogAsGanti('s2')).code, 'CANCELLED');
  assert.ok(!m.ctx.D.servisLogs[1].actionType);
  assert.equal((await m.ctx.M.markLogAsGanti('zzz')).code, 'NOT_FOUND');
});
test('B13-2: riwayat merender tombol hanya untuk log tanpa actionType', () => {
  const s = R('modules/vehicle/servis-b.js');
  assert.match(s, /const markGantiBtn=!String\(s\.actionType\|\|''\)\.trim\(\)\?/);
  assert.match(s, /data-action="Servis\.markLogAsGanti"/);
  assert.match(s, /\$\{actionBadge\}\$\{markGantiBtn\}/);
});

// ---------- (3) fungsi mati ----------
test('B13-3: renderDashboardServisReminder tidak lagi didefinisikan / dipanggil di sumber', () => {
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk('modules').concat(['car-notes.js', 'chat-action-handlers.js']).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const t = R(f).split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
    assert.ok(!/renderDashboardServisReminder/.test(t), f);
  }
});

// ---------- (4) paket pengingat ----------
function mkPkg() {
  const saves = [];
  const ctx = { console, D: { servisLogs: [], serviceReminderPackages: [] }, save: (o) => saves.push(o), uid: (() => { let n = 0; return () => 'u' + (++n); })() };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(R('modules/vehicle/reminder-lifecycle.js'), ctx);
  vm.runInContext(R('modules/vehicle/service-reminder-package-sot.js'), ctx);
  vm.runInContext(R('modules/vehicle/service-event-lifecycle.js'), ctx);
  return ctx;
}
const comp = (ctx, extra) => ctx.ServiceReminderPackageSOT.create(Object.assign({ vehicleId: 'v', targets: [{ serviceComponentId: 'oli-mesin', componentName: 'Oli Mesin' }, { serviceComponentId: 'filter-oli', componentName: 'Filter Oli' }] }, extra || {})).package;
const log = (ctx, id, comps) => { const r = { id, vehicleId: 'v', checklist: comps.map((c) => ({ serviceComponentId: c })) }; ctx.D.servisLogs.push(r); return r; };

test('B13-4: paket DISMISSED tidak bisa diselesaikan lewat completeFromHistory', () => {
  const ctx = mkPkg(); const P = ctx.ServiceReminderPackageSOT; const p = comp(ctx);
  P.transition(p.id, 'DISMISSED'); log(ctx, 's1', ['oli-mesin', 'filter-oli']);
  const r = P.completeFromHistory(p.id, ['s1']);
  assert.equal(r.ok, false); assert.equal(r.code, 'dismissed_cannot_complete');
  assert.equal(P.byId(p.id).status, 'DISMISSED');
});
test('B13-4: paket COMPLETED tidak bisa diselesaikan ulang oleh log lain; panggilan ulang dgn log yg sama idempoten', () => {
  const ctx = mkPkg(); const P = ctx.ServiceReminderPackageSOT; const p = comp(ctx);
  log(ctx, 's1', ['oli-mesin', 'filter-oli']); log(ctx, 's2', ['oli-mesin', 'filter-oli']);
  assert.equal(P.completeFromHistory(p.id, ['s1']).ok, true);
  const sid = P.byId(p.id).completedSessionId;
  assert.equal(P.completeFromHistory(p.id, ['s1']).code, 'already_completed');
  assert.equal(P.completeFromHistory(p.id, ['s1']).ok, true);
  const r2 = P.completeFromHistory(p.id, ['s2']);
  assert.equal(r2.ok, false); assert.equal(P.byId(p.id).completedSessionId, sid);
  assert.ok(!ctx.D.servisLogs[1].reminderPackageId);
});
test('B13-4: checklist paket ditandai selesai saat paket selesai dan dibatalkan saat dibuka kembali', () => {
  const ctx = mkPkg(); const P = ctx.ServiceReminderPackageSOT; const p = comp(ctx);
  const l = log(ctx, 's1', ['oli-mesin', 'filter-oli']);
  assert.equal(P.completeFromHistory(p.id, ['s1']).ok, true);
  const done = P.checklist(p.id).map((c) => c.done);
  assert.equal(done.length, 2);
  assert.ok(done.every(Boolean));
  ctx.D.servisLogs = [];
  ctx.ServiceEventLifecycle.remove(l, {});
  assert.equal(P.byId(p.id).status, 'ACTIVE');
  assert.ok(P.checklist(p.id).every((c) => c.done === false));
});
test('B13-4: setChecklistItem hanya utk paket non-final; notApplicable menghapus done', () => {
  const ctx = mkPkg(); const P = ctx.ServiceReminderPackageSOT; const p = comp(ctx);
  const cid = p.checklist[0].id;
  assert.equal(P.setChecklistItem(p.id, cid, { done: true }).item.done, true);
  assert.equal(P.setChecklistItem(p.id, cid, { notApplicable: true }).item.done, false);
  assert.equal(P.setChecklistItem(p.id, 'nope', { done: true }).code, 'item_not_found');
  P.transition(p.id, 'DISMISSED');
  assert.equal(P.setChecklistItem(p.id, cid, { done: true }).code, 'package_final');
});
test('B13-4: SNOOZED dgn batas waktu aktif lagi lewat wakeSnoozed; tanpa batas tetap SNOOZED; until invalid ditolak', () => {
  const ctx = mkPkg(); const P = ctx.ServiceReminderPackageSOT; const p = comp(ctx); const q = comp(ctx, { title: 'B' });
  assert.equal(P.transition(p.id, 'SNOOZED', { until: 'bukan-tanggal' }).code, 'invalid_snooze_until');
  P.transition(p.id, 'SNOOZED', { until: '2026-11-10T00:00:00Z' });
  P.transition(q.id, 'SNOOZED');
  assert.equal(P.wakeSnoozed('2026-11-09T00:00:00Z').woke.length, 0);
  assert.deepEqual(Array.from(P.wakeSnoozed('2026-11-11T00:00:00Z').woke), [p.id]);
  assert.equal(P.byId(p.id).status, 'ACTIVE'); assert.equal(P.byId(p.id).snoozedUntil, undefined);
  assert.equal(P.byId(q.id).status, 'SNOOZED');
});
test('B13-4: picker paket Keuangan menyembunyikan COMPLETED (kecuali yang sedang dipilih)', () => {
  assert.match(R('modules/finance/tx-servis.js'), /p\.status!=='DISMISSED'&&\(p\.status!=='COMPLETED'\|\|\(selectedId&&/);
});
