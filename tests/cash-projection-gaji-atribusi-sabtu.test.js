'use strict';
// tests/cash-projection-gaji-atribusi-sabtu.test.js — cakupan:
// 1) Bugfix pendingGajiEstimate (cash-projection.js) — atribusi 1 minggu penuh
//    ke bulan tempat Sabtu (getWeekRange().end) minggu itu jatuh, SAMA PERSIS
//    definisi _cpWeeksInMonth(), bukan ke bulan tanggal masing-masing workDay.
// 2) computeWeeklyGajiTotal() (reset-gaji-mingguan.js) — tipeGaji 'harian'/
//    'borongan' (default) tidak berubah; tipeGaji 'mingguanTetap' pakai flat
//    gajiPokokMingguan + lembur/tambahan/potongan harian.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeD(overrides) {
  return Object.assign({
    transactions: [],
    workDays: [],
    bills: [],
    profile: {},
  }, overrides);
}

function makeCtx(D) {
  return loadSource(
    ['modules/business/reset-gaji-mingguan.js', 'modules/finance/tagihan-kalender.js', 'modules/finance/cash-projection.js'],
    { D }
  );
}

// --- pendingGajiEstimate: atribusi minggu lintas-bulan ---

test('pendingGajiEstimate — minggu yang Sabtu-nya jatuh di BULAN BERIKUTNYA, workDay Senin di bulan lama tetap dihitung ke bulan Sabtu (bukan bulan tanggal workDay-nya)', () => {
  // 2026-08-31 = Senin, minggu itu (Minggu 2026-08-30 s/d Sabtu 2026-09-05)
  // Sabtu-nya jatuh di September -- harus kehitung ke proyeksi September,
  // BUKAN Agustus (dulu: bug, dihitung ke bulan tanggal 2026-08-31 = Agustus).
  const D = makeD({ workDays: [{ date: '2026-08-31', total: 100000 }] });
  const ctx = makeCtx(D);
  const agustus = ctx.getMonthlyCashProjection(7, 2026); // month index 0-based: Agustus=7
  const september = ctx.getMonthlyCashProjection(8, 2026); // September=8
  assert.equal(agustus.pendingGajiEstimate, 0);
  assert.equal(september.pendingGajiEstimate, 100000);
});

test('pendingGajiEstimate — minggu biasa (Sabtu di bulan yang sama) tetap terhitung benar ke bulan itu', () => {
  // 2026-08-10 = Senin, minggu Minggu 2026-08-09 s/d Sabtu 2026-08-15 --
  // Sabtu-nya juga di Agustus, jadi tidak ada perubahan perilaku di kasus ini.
  const D = makeD({ workDays: [{ date: '2026-08-10', total: 75000 }, { date: '2026-08-11', total: 80000 }] });
  const ctx = makeCtx(D);
  const agustus = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(agustus.pendingGajiEstimate, 155000);
});

test('pendingGajiEstimate — 1 minggu penuh dihitung SEKALI ke bulan Sabtu walau workDay-nya tersebar di 2 bulan kalender berbeda', () => {
  const D = makeD({
    workDays: [
      { date: '2026-08-31', total: 50000 }, // Senin, Agustus
      { date: '2026-09-01', total: 50000 }, // Selasa, September -- minggu SAMA (Sabtu 2026-09-05)
    ],
  });
  const ctx = makeCtx(D);
  const agustus = ctx.getMonthlyCashProjection(7, 2026);
  const september = ctx.getMonthlyCashProjection(8, 2026);
  assert.equal(agustus.pendingGajiEstimate, 0);
  assert.equal(september.pendingGajiEstimate, 100000);
});

// --- computeWeeklyGajiTotal() ---

test('computeWeeklyGajiTotal() — tipeGaji default/"harian" TIDAK berubah: jumlah w.total apa adanya', () => {
  const D = makeD({ profile: { tipeGaji: 'harian' } });
  const ctx = makeCtx(D);
  const weekDays = [{ total: 65000, pokok: 65000, lembur: 0, tambahan: 0, potongan: 0 }, { total: 70000, pokok: 65000, lembur: 5000, tambahan: 0, potongan: 0 }];
  assert.equal(ctx.computeWeeklyGajiTotal(weekDays), 135000);
});

test('computeWeeklyGajiTotal() — tipeGaji "mingguanTetap": pokok harian diabaikan, dipakai flat gajiPokokMingguan + lembur/tambahan/potongan harian, di-floor ke 0 kalau minus', () => {
  const D = makeD({ profile: { tipeGaji: 'mingguanTetap', gajiPokokMingguan: 500000 } });
  const ctx = makeCtx(D);
  const weekDays = [
    { total: 999999, pokok: 999999, lembur: 20000, tambahan: 10000, potongan: 5000 },
    { total: 999999, pokok: 999999, lembur: 0, tambahan: 0, potongan: 0 },
  ];
  assert.equal(ctx.computeWeeklyGajiTotal(weekDays), 525000); // 500000 + 20000 + 10000 - 5000

  const D2 = makeD({ profile: { tipeGaji: 'mingguanTetap', gajiPokokMingguan: 10000 } });
  const ctx2 = makeCtx(D2);
  assert.equal(ctx2.computeWeeklyGajiTotal([{ total: 0, lembur: 0, tambahan: 0, potongan: 50000 }]), 0);
});

// --- pendingGajiEstimate mengikuti D.profile.tipeGaji ---

test('pendingGajiEstimate — tipeGaji "bulananTetap": D.workDays SAMA SEKALI tidak dipakai (gaji flat dicatat lewat confirmMonthlyGaji(), bukan dari absensi)', () => {
  const D = makeD({
    profile: { tipeGaji: 'bulananTetap' },
    workDays: [{ date: '2026-08-10', total: 200000, lembur: 0, tambahan: 0, potongan: 0 }],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026);
  assert.equal(r.pendingGajiEstimate, 0);
});

test('pendingGajiEstimate — tipeGaji "mingguanTetap": ikut flat gajiPokokMingguan + lembur/tambahan/potongan per minggu (SAMA PERSIS computeWeeklyGajiTotal), bukan sum w.total', () => {
  const D = makeD({
    profile: { tipeGaji: 'mingguanTetap', gajiPokokMingguan: 500000 },
    workDays: [
      // Senin 2026-08-10, minggu Minggu 2026-08-09 s/d Sabtu 2026-08-15 (Agustus)
      { date: '2026-08-10', total: 999999, pokok: 999999, lembur: 20000, tambahan: 0, potongan: 5000 },
    ],
  });
  const ctx = makeCtx(D);
  const r = ctx.getMonthlyCashProjection(7, 2026); // Agustus
  assert.equal(r.pendingGajiEstimate, 515000); // 500000 + 20000 - 5000
});
