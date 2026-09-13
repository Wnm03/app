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

  check('CHECKLIST 46/46 masterCategoryId mapping', () => {
    const src = read('modules/vehicle/servis-checklist.js');
    if (!src.includes('SERVICE_CHECKLIST_GROUPS.forEach')) fail('checklist projection missing');
    const { SERVICE_CHECKLIST_GROUPS } = require(path.join(ROOT, 'modules/vehicle/servis-checklist.js'));
    if (!Array.isArray(SERVICE_CHECKLIST_GROUPS) || SERVICE_CHECKLIST_GROUPS.length !== 13) fail('expected 13 checklist groups');
    const items = SERVICE_CHECKLIST_GROUPS.flatMap(g => g.items || []);
    if (items.length !== 46) fail(`expected 46 checklist items, got ${items.length}`);
    const missing = items.filter(i => !i.masterCategoryId);
    if (missing.length) fail(`${missing.length} checklist items lack masterCategoryId`);
    const unique = new Set(items.map(i => i.masterCategoryId));
    if (unique.size > 13) fail('checklist introduced more master categories than groups');
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
    const history = read('car-notes.js');
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
    execSync('node --test tests/*.test.js', {
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
