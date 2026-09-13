'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(['modules/vehicle/servis-checklist.js'], {}, ['SERVICE_CHECKLIST_GROUPS']);
const GROUPS = ctx.SERVICE_CHECKLIST_GROUPS;
const ITEMS = GROUPS.flatMap(g => g.items.map(it => ({ ...it, group: g.group })));

test('checklist SoT remains the base 30-item contract after cumulative patching', () => {
  assert.equal(GROUPS.length, 13);
  assert.equal(ITEMS.length, 30);
  assert.equal(new Set(GROUPS.map(g => g.masterCategoryId)).size, 13);
});

test('checklist does not contain accidental USER_ACCUMULATED_LIST contamination', () => {
  assert.equal(ITEMS.filter(it => String(it.sumber || '').includes('USER_ACCUMULATED_LIST_2026-09-12')).length, 0);
  assert.equal(ITEMS.find(it => it.id === 'filter-oli'), undefined);
  assert.equal(ITEMS.find(it => it.id === 'slide-piece-cvt'), undefined);
  assert.equal(ITEMS.find(it => it.id === 'filter-fuel-pump'), undefined);
});

test('legacy checklist action contracts remain stable', () => {
  const busi = ITEMS.find(it => it.id === 'busi');
  const kompresi = ITEMS.find(it => it.id === 'kompresi-mesin');
  const kabel = ITEMS.find(it => it.id === 'kabel-gas-standar-kunci');
  assert.equal(busi.actionMode, 'alternate');
  assert.equal(kompresi.actionMode, 'none');
  assert.equal(kabel.intervalKm, null);
});
