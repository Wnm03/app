'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const dashboard = fs.readFileSync(require.resolve('../modules/shared/modules-render.js'), 'utf8');
const reminder = fs.readFileSync(require.resolve('../modules/vehicle/vehicle-reminder.js'), 'utf8');

// SA-B contract: dashboard and fleet reminder consumers must accept the same
// canonical periodic axes as Servis.renderReminder(), including month/day-only
// schedules. No separate reminder threshold is introduced here.
test('SA-B: dashboard reminder tidak membuang schedule bulan/hari-only', () => {
  assert.match(dashboard, /\(c\.intervalKm>0\)\|\|\(c\.intervalBulan>0\)/);
  assert.match(dashboard, /hasMaintenanceReminderSchedule\(veh\.id,c\)/);
  assert.match(dashboard, /u&&u\.intervalHari&&u\.limitingAxis==='hari'/);
  assert.match(dashboard, /u&&u\.intervalBulan&&u\.limitingAxis==='bulan'/);
});

test('SA-B: VehicleReminder memakai due axis canonical, bukan memaksa semua menjadi KM', () => {
  assert.match(reminder, /it\.limitingAxis === 'bulan' && it\.sisaBulan != null/);
  assert.match(reminder, /it\.limitingAxis === 'hari' && it\.sisaHari != null/);
  assert.match(reminder, /it\.status === 'jatuh_tempo'/);
});
