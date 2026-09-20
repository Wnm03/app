#!/usr/bin/env node
'use strict';

/**
 * SERVICE-SOT-INTEGRITY-GATE
 * Release gate for the vehicle-service taxonomy/interval chain.
 *
 * This is intentionally dependency-free and read-only. It verifies:
 *   CATEGORY -> MASTER CATEGORY -> CHECKLIST -> SERVICE EVENT
 *   -> HISTORY/REMINDER -> INTERVAL -> VEHICLE ISOLATION -> IDEMPOTENCY
 * plus the existing full regression suite.
 *
 * It does not modify D, localStorage, bundles, or source files.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function fail(msg) { throw new Error(msg); }
function check(name, fn, results) {
  try { fn(); results.push({ name, status: 'PASS' }); }
  catch (e) { results.push({ name, status: 'FAIL', detail: e.message }); }
}

function main() {
  const results = [];

  check('CATEGORY -> MASTER CATEGORY canonical helper', () => {
    const src = read('modules/vehicle/category-canonical-ref.js');
    if (!src.includes('masterCategoryId')) fail('masterCategoryId helper missing');
    if (!src.includes('record.masterCategoryId')) fail('canonical field is not authoritative');
  }, results);

  check('CHECKLIST 102/102 masterCategoryId mapping (50 legacy + 52 catalog expansion)', () => {
    const src = read('modules/vehicle/servis-checklist.js');
    if (!src.includes('SERVICE_CHECKLIST_GROUPS.forEach')) fail('checklist projection missing');
    // S1863+: checklist is a projection of the generated Service Master; the
    // gate validates the projected/generated groups, not literals in the source.
    const F = require(path.join(ROOT, 'tests/helpers/serviceMasterFixture.js'));
    const { SERVICE_CHECKLIST_GROUPS } = require(path.join(ROOT, 'modules/vehicle/servis-checklist.js'));
    if (!Array.isArray(SERVICE_CHECKLIST_GROUPS) || SERVICE_CHECKLIST_GROUPS.length !== F.MASTER_GROUP_COUNT) fail('expected 13 checklist groups');
    const items = SERVICE_CHECKLIST_GROUPS.flatMap(g => g.items || []);
    if (items.length !== F.MASTER_COMPONENT_COUNT) fail(`expected ${F.MASTER_COMPONENT_COUNT} checklist items, got ${items.length}`);
    if (new Set(items.map(i => i.id)).size !== items.length) fail('checklist component ids are not unique');
    const lost = F.LEGACY_CHECKLIST_IDS.filter(id => !items.some(i => i.id === id));
    if (lost.length) fail(`legacy checklist components lost: ${lost.join(', ')}`);
    const missing = items.filter(i => !i.masterCategoryId);
    if (missing.length) fail(`${missing.length} checklist items lack masterCategoryId`);
    const unique = new Set(items.map(i => i.masterCategoryId));
    if (unique.size > F.MASTER_GROUP_COUNT) fail('checklist introduced more master categories than groups');
    const orphan = items.filter(i => !SERVICE_CHECKLIST_GROUPS.some(g => g.masterCategoryId === i.masterCategoryId));
    if (orphan.length) fail(`${orphan.length} checklist items reference a master category without a group`);
  }, results);

  check('BRAKE COMPONENT SoT + action override contract', () => {
    const { SERVICE_CHECKLIST_GROUPS } = require(path.join(ROOT, 'modules/vehicle/servis-checklist.js'));
    const items = SERVICE_CHECKLIST_GROUPS.flatMap(g => g.items || []);
    for (const id of ['kampas-rem-depan','kampas-rem-belakang','cakram-rem-depan','kaliper-rem-depan','master-rem-reservoir','tromol-rem-belakang','minyak-rem','selang-rem']) {
      if (!items.some(i => i.id === id)) fail(`missing brake component ${id}`);
    }
    if (items.some(i => i.name === 'Kampas Rem')) fail('generic Kampas Rem must not be a canonical checklist component');
    const generic = read('modules/vehicle/sparepart-servis.js');
    if (/motor:\[[^\]]*'Kampas Rem'[^\]]*\]/.test(generic)) fail('generic recommendation still contains Kampas Rem');
    if (!generic.includes('dedupeServiceCategoriesForVehicle')) fail('reminder category dedupe helper missing');
  }, results);

  check('S1811 ACTION/CONDITION/HISTORY guidance layer', () => {
    const guidance = read('modules/vehicle/service-maintenance-guidance.js');
    for (const token of ['SERVICE_CONDITION_RESULTS','recommendServiceAction','summarizeServiceHistory','isServiceComponentNotApplicable','auditServiceMaintenanceIntegrity']) {
      if (!guidance.includes(token)) fail(`guidance helper missing: ${token}`);
    }
    const servis = read('modules/vehicle/servis.js') + '\n' + read('modules/vehicle/servis-b.js');
    if (!servis.includes('chooseReminderAction')) fail('reminder manual action picker missing');
    if (!servis.includes('conditionResult')) fail('condition result persistence missing');
    if (!servis.includes('conditionNote')) fail('per-component condition note missing');
    if (!servis.includes('checklistNotApplicable')) fail('not-applicable persistence missing');
    if (!servis.includes('c.intervalBulan>0')) fail('date/month reminder filter missing');
    const modal = read('modules/shared/modals.js');
    if (!modal.includes('servisConditionResult')) fail('condition result UI missing');
  }, results);

  check('INTERVAL SoT enforcement', () => {
    const src = read('modules/vehicle/sparepart-servis.js');
    if (!src.includes('resolveCanonicalInterval(cat')) fail('runtime interval resolver does not use canonical policy');
    if (!src.includes('function getEffectiveIntervalKm')) fail('KM interval entry point missing');
    if (!src.includes('function getEffectiveIntervalBulan')) fail('month interval entry point missing');
    const policy = read('modules/vehicle/service-interval-policy.js');
    if (!policy.includes('vehicleOverride.intervalKm') || !policy.includes('category.intervalKm')) fail('KM precedence missing');
    if (!policy.includes('vehicleOverride.intervalBulan') || !policy.includes('category.intervalBulan')) fail('month precedence missing');
    if (policy.includes('checklist.interval')) fail('checklist became an interval authority');
  }, results);

  check('SERVICE EVENT single-fact + idempotency', () => {
    const src = read('modules/finance/tx-servis.js');
    if (!src.includes('txLinkId:opts.txId')) fail('service event missing txLinkId');
    if (!src.includes('findServiceEventForTransaction')) fail('transaction idempotency lookup missing');
    if (!src.includes('candidate.vehicleId===vehicleId')) fail('vehicle boundary missing on existing-link update');
    if (!src.includes('if(s){')) fail('event upsert path missing');
  }, results);

  check('HISTORY/REMINDER consume the same service-log fact', () => {
    // FIX (sesi perbaikan release-gate): dulu "history" dibaca dari
    // car-notes.js, tapi sejak sesi refactor arsitektur Servis (lihat
    // komentar "Servis canonical source: modules/vehicle/servis.js
    // (GROUP_B)." di car-notes.js baris ~532), seluruh logic riwayat servis
    // (baca/tulis D.servisLogs, render riwayat, checklist, dst) sudah
    // dipindah ke modules/vehicle/servis.js. car-notes.js sekarang cuma
    // berisi VEHTAX/BBM/Torsi — 0 referensi D.servisLogs, jadi gate ini
    // selalu FAIL walau kode sebenarnya sehat. Diarahkan ke lokasi source-
    // of-truth yang benar saat ini.
    const history = read('modules/vehicle/servis.js');
    const reminder = read('modules/vehicle/sparepart-servis.js');
    if (!history.includes('D.servisLogs')) fail('history does not use servisLogs');
    if (!reminder.includes('D.servisLogs')) fail('reminder does not use servisLogs');
    if (!reminder.includes('computeServiceUrgency')) fail('reminder does not use canonical urgency calculation');
  }, results);

  check('VEHICLE ISOLATION', () => {
    const tx = read('modules/finance/tx-servis.js');
    const adapter = read('modules/vehicle/service-event-adapter.js');
    if (!tx.includes('candidate.vehicleId===vehicleId')) fail('cross-vehicle existing event mutation is possible');
    if (!adapter.includes('log.vehicleId === vehicleId')) fail('canonical event vehicle boundary missing');
    if (!adapter.includes('log.txLinkId === txLinkId')) fail('transaction lookup is not scoped by txLinkId');
  }, results);

  check('FULL REGRESSION (app-main tests)', () => {
    if (process.env.SERVICE_SOT_SKIP_FULL_REGRESSION === '1') return;
    execSync('TEST_SHARDS=32 TEST_CONCURRENCY=8 TEST_SHARD_TIMEOUT_MS=90000 node scripts/run-full-test.js', {
      cwd: ROOT,
      stdio: 'pipe',
      maxBuffer: 32 * 1024 * 1024,
      shell: true
    });
  }, results);

  const failed = results.filter(r => r.status === 'FAIL');
  for (const r of results) {
    console.log(`${r.status === 'PASS' ? '✓' : '✗'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }

  console.log(`\nSERVICE-SOT-INTEGRITY-GATE: ${failed.length ? 'FAIL' : 'PASS'}`);
  if (failed.length) process.exit(1);
}

if (require.main === module) main();
