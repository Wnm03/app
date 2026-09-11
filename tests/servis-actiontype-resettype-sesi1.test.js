'use strict';
// tests/servis-actiontype-resettype-sesi1.test.js — cakupan Sesi 1 dari
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md: field actionType di
// D.servisLogs + resetType/actionMode/gantiResetsInterval per-kategori +
// getLastServiceKmForCat()/getLastServiceDateForCat() versi actionTypeFilter/
// forReminder + computeServiceUrgency() yang sadar pola + suggestNextBusiAction().
//
// Cakupan:
//  - resolveResetActionTypeFilter()/getEffectiveActionMode()/getEffectiveResetType()
//    — helper murni baru, backward-compatible (kategori lama = pola 1, null filter).
//  - matchesActionTypeForReset() (sparepart-servis.js) & Servis._matchesActionTypeForReset()
//    (car-notes.js) — HARUS identik, dites dari 2 sisi.
//  - getLastServiceDateForCat()/computeServiceUrgency() — pola 2 (resetType:'both'),
//    pola 3 (alternasi Busi), pola 4 (periksa-conditional, mis. Kampas Rem).
//  - suggestNextBusiAction() — saran toggle default utk pola 3.
//  - Servis.markServiced() — actionType opsional, backward compatible.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function baseD(overrides) {
  return Object.assign(
    {
      vehicles: [{ id: 'v1', name: 'Vario 125', jenis: 'motor' }],
      sparepartCats: [],
      servisLogs: [],
      partsStock: [],
      transactions: [],
      accounts: [{ id: 'a1', name: 'Tunai' }],
    },
    overrides || {}
  );
}

function makeSparepartCtx(D, extra) {
  return loadSource(
    ['modules/vehicle/sparepart-servis.js', 'modules/vehicle/sparepart-servis-b.js'],
    Object.assign(
      {
        D,
        curVehicleId: 'v1',
        codeFromName: (s) => String(s).slice(0, 3).toUpperCase(),
        save: () => {},
        toast: () => {},
        escapeHtml: (s) => String(s == null ? '' : s),
        document: { getElementById: () => null, querySelectorAll: () => [] },
        renderServisList: () => {},
        renderDashboardServisReminder: () => {},
        estimateServiceDateISO: () => null,
        Servis: {
          getLastServiceKmForCat: (vehicleId, cat, actionTypeFilter, forReminder) => {
            const logs = (D.servisLogs || [])
              .filter((s) => {
                if (!(s.vehicleId === vehicleId && s.km && s.categoryId === cat.id)) return false;
                const effType = s.actionType || 'ganti';
                if (forReminder && cat.actionMode === 'periksa-conditional' && cat.gantiResetsInterval === false && effType === 'ganti') return false;
                if (!actionTypeFilter) return true;
                return effType === actionTypeFilter;
              })
              .sort((a, b) => new Date(b.date) - new Date(a.date) || b.km - a.km);
            return logs.length ? logs[0].km : null;
          },
        },
        MY_WRENCH: {},
      },
      extra || {}
    ),
    ['Sparepart']
  );
}

function makeCarNotesCtx(D, extra) {
  return loadSource(
    ['car-notes.js'],
    Object.assign(
      {
        D,
        curVehicleId: 'v1',
        save: () => {},
        toast: () => {},
        uid: (() => { let n = 0; return () => 'id' + ++n; })(),
        escapeHtml: (s) => String(s == null ? '' : s),
        document: { getElementById: () => null, querySelectorAll: () => [] },
        getVehicleKm: () => 5000,
        askConfirm: async () => true,
        showPromptModal: async () => '0',
        resolveVehicleTxCategory: () => 'Kendaraan',
        renderCnTab: () => {},
        renderDashboard: () => {},
        renderKeuangan: () => {},
        closeModal: () => {},
        withSaveGuardAsync: (a, b, fn) => fn,
        // servisLogMatchesCat() didefinisikan di modules/vehicle/sparepart-servis.js
        // (TIDAK dimuat di harness ini) -- stub minimal, pola sama persis logic
        // aslinya (match by categoryId), cukup utk test murni car-notes.js ini.
        servisLogMatchesCat: (s, cat) => s.categoryId === cat.id,
      },
      extra || {}
    ),
    ['Servis']
  );
}

// --- resolveResetActionTypeFilter() / getEffectiveActionMode/ResetType ---

test('resolveResetActionTypeFilter() — pola 1/5/6 (default, tanpa actionMode) balikin null', () => {
  const ctx = makeSparepartCtx(baseD());
  assert.equal(ctx.resolveResetActionTypeFilter({}), null);
  assert.equal(ctx.resolveResetActionTypeFilter({ actionMode: 'bersih' }), null);
  assert.equal(ctx.resolveResetActionTypeFilter({ actionMode: 'none' }), null);
});

test('resolveResetActionTypeFilter() — pola 3 (alternate, mis. Busi) balikin null (SEMUA actionType jadi basis reset)', () => {
  const ctx = makeSparepartCtx(baseD());
  assert.equal(ctx.resolveResetActionTypeFilter({ actionMode: 'alternate', intervalKm: 4000 }), null);
});

test('resolveResetActionTypeFilter() — pola 2 (resetType:"both"/"time") balikin "ganti"', () => {
  const ctx = makeSparepartCtx(baseD());
  assert.equal(ctx.resolveResetActionTypeFilter({ resetType: 'both', intervalKm: 40000, intervalBulan: 24 }), 'ganti');
  assert.equal(ctx.resolveResetActionTypeFilter({ resetType: 'time', intervalBulan: 24 }), 'ganti');
});

test('resolveResetActionTypeFilter() — pola 4 (periksa-conditional, mis. Kampas Rem) balikin "periksa"', () => {
  const ctx = makeSparepartCtx(baseD());
  assert.equal(ctx.resolveResetActionTypeFilter({ actionMode: 'periksa-conditional', intervalKm: 10000, gantiResetsInterval: false }), 'periksa');
});

// --- matchesActionTypeForReset() ---

test('matchesActionTypeForReset() — log lama tanpa actionType diperlakukan "ganti" (0 migrasi data)', () => {
  const ctx = makeSparepartCtx(baseD());
  const log = { actionType: undefined };
  assert.equal(ctx.matchesActionTypeForReset(log, {}, 'ganti', false), true);
  assert.equal(ctx.matchesActionTypeForReset(log, {}, 'periksa', false), false);
  assert.equal(ctx.matchesActionTypeForReset(log, {}, null, false), true);
});

test('matchesActionTypeForReset() — pola 4: forReminder=true & gantiResetsInterval:false MENGELUARKAN log "ganti" dari basis reset APAPUN actionTypeFilter-nya', () => {
  const ctx = makeSparepartCtx(baseD());
  const cat = { actionMode: 'periksa-conditional', gantiResetsInterval: false };
  const gantiLog = { actionType: 'ganti' };
  assert.equal(ctx.matchesActionTypeForReset(gantiLog, cat, null, true), false);
  assert.equal(ctx.matchesActionTypeForReset(gantiLog, cat, 'ganti', true), false);
  // forReminder=false (mis. jalur riwayat) -- TIDAK ada pengecualian, log tetap ikut
  assert.equal(ctx.matchesActionTypeForReset(gantiLog, cat, null, false), true);
  // log 'periksa' tetap ikut normal
  const periksaLog = { actionType: 'periksa' };
  assert.equal(ctx.matchesActionTypeForReset(periksaLog, cat, null, true), true);
});

// --- getLastServiceDateForCat() dgn actionTypeFilter ---

test('getLastServiceDateForCat() — actionTypeFilter memisahkan log "ganti" vs "periksa" utk kategori sama', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Kampas Rem Depan', intervalKm: 10000, actionMode: 'periksa-conditional', gantiResetsInterval: false }],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000, actionType: 'periksa' },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-03-01', km: 3000, actionType: 'ganti' },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-02-01', km: 2000, actionType: 'periksa' },
    ],
  });
  const ctx = makeSparepartCtx(D);
  const cat = D.sparepartCats[0];
  assert.equal(ctx.getLastServiceDateForCat('v1', cat, 'periksa', false), '2026-02-01');
  assert.equal(ctx.getLastServiceDateForCat('v1', cat, 'ganti', false), '2026-03-01');
  // Tanpa filter -- semua log ikut (perilaku lama, 0 perubahan)
  assert.equal(ctx.getLastServiceDateForCat('v1', cat), '2026-03-01');
});

// --- computeServiceUrgency() per pola ---

test('computeServiceUrgency() — pola 4 (periksa-conditional): jatuh-tempo HANYA dari log "periksa", log "ganti" diabaikan sbg basis', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Kampas Rem Depan', intervalKm: 10000, actionMode: 'periksa-conditional', gantiResetsInterval: false }],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000, actionType: 'periksa' },
      // log 'ganti' JAUH lebih baru & km lebih tinggi -- KALAU dipakai sbg basis,
      // sisaKm akan jauh lebih besar (aman). Basis yg BENAR (periksa) harus tetap dipakai.
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-06-01', km: 9000, actionType: 'ganti' },
    ],
  });
  const ctx = makeSparepartCtx(D);
  const cat = D.sparepartCats[0];
  const u = ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 9500, kmPerDay: 10 });
  // basis = lastKm(periksa) = 1000 -> jarakTempuh = 9500-1000 = 8500 -> sisaKm = 10000-8500 = 1500
  assert.equal(u.sisaKm, 1500);
});

test('computeServiceUrgency() — pola 2 (resetType:"both"): lastKm & lastDate basisnya log "ganti" saja', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Oli Gardan', intervalKm: 24000, intervalBulan: 24, resetType: 'both' }],
    servisLogs: [
      // log 'periksa' (bukan basis reset utk pola 2) HARUS diabaikan
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-07-01', km: 500, actionType: 'periksa' },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 100, actionType: 'ganti' },
    ],
  });
  const ctx = makeSparepartCtx(D);
  const cat = D.sparepartCats[0];
  const u = ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 5000, kmPerDay: 5, nowISO: '2026-08-26' });
  // basis km = 100 (log ganti, bukan 500 dari periksa) -> sisaKm = 24000-(5000-100)=19100
  assert.equal(u.sisaKm, 19100);
});

test('computeServiceUrgency() — pola 1/3 (default/alternate) TIDAK berubah dari desain lama (0 regresi)', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Busi', intervalKm: 4000, actionMode: 'alternate' }],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000, actionType: 'periksa' },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-02-01', km: 5000, actionType: 'ganti' },
    ],
  });
  const ctx = makeSparepartCtx(D);
  const cat = D.sparepartCats[0];
  const u = ctx.computeServiceUrgency({ vehicleId: 'v1', cat, curKm: 8500, kmPerDay: 10 });
  // basis = log terbaru APAPUN actionType-nya (5000, dari 'ganti') -> sisaKm = 4000-(8500-5000)=500
  assert.equal(u.sisaKm, 500);
});

// --- suggestNextBusiAction() ---

test('suggestNextBusiAction() — genap (0 log) saran "periksa", ganjil saran "ganti", bergantian tiap centang', () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Busi', intervalKm: 4000, actionMode: 'alternate' }] });
  const ctx = makeSparepartCtx(D);
  const cat = D.sparepartCats[0];
  assert.equal(ctx.suggestNextBusiAction('v1', cat), 'periksa');
  D.servisLogs.push({ vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000, actionType: 'periksa' });
  assert.equal(ctx.suggestNextBusiAction('v1', cat), 'ganti');
  D.servisLogs.push({ vehicleId: 'v1', categoryId: 'c1', date: '2026-02-01', km: 5000, actionType: 'ganti' });
  assert.equal(ctx.suggestNextBusiAction('v1', cat), 'periksa');
});

// --- Servis.markServiced() (car-notes.js) ---

test('Servis.markServiced() — tanpa actionType (1 arg) = perilaku lama, actionType tersimpan null', async () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Oli Mesin', intervalKm: 2000 }] });
  const ctx = makeCarNotesCtx(D);
  await ctx.Servis.markServiced('c1');
  assert.equal(D.servisLogs.length, 1);
  assert.equal(D.servisLogs[0].actionType, null);
});

test('Servis.markServiced() — dgn actionType "periksa" tersimpan apa adanya, pesan tidak klaim reset kalau gantiResetsInterval:false & actionType "ganti"', async () => {
  const D = baseD({ sparepartCats: [{ id: 'c1', name: 'Kampas Rem Depan', intervalKm: 10000, actionMode: 'periksa-conditional', gantiResetsInterval: false }] });
  let toastMsg = '';
  const ctx = makeCarNotesCtx(D, { toast: (m) => { toastMsg = m; } });
  await ctx.Servis.markServiced('c1', 'ganti');
  assert.equal(D.servisLogs[0].actionType, 'ganti');
  assert.match(toastMsg, /tidak berubah/);

  await ctx.Servis.markServiced('c1', 'periksa');
  assert.equal(D.servisLogs[1].actionType, 'periksa');
  assert.match(toastMsg, /pengingat direset/);
});

test('Servis.getLastServiceKmForCat() — actionTypeFilter opsional, backward compatible tanpa filter', () => {
  const D = baseD({
    sparepartCats: [{ id: 'c1', name: 'Busi', intervalKm: 4000 }],
    servisLogs: [
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-01-01', km: 1000, actionType: 'periksa' },
      { vehicleId: 'v1', categoryId: 'c1', date: '2026-02-01', km: 5000, actionType: 'ganti' },
    ],
  });
  const ctx = makeCarNotesCtx(D);
  const cat = D.sparepartCats[0];
  assert.equal(ctx.Servis.getLastServiceKmForCat('v1', cat), 5000);
  assert.equal(ctx.Servis.getLastServiceKmForCat('v1', cat, 'periksa'), 1000);
  assert.equal(ctx.Servis.getLastServiceKmForCat('v1', cat, 'ganti'), 5000);
});
