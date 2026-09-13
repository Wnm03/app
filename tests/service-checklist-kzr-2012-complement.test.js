'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

const ctx = loadSource(['modules/vehicle/servis-checklist.js'], {}, ['SERVICE_CHECKLIST_GROUPS']);
const GROUPS = ctx.SERVICE_CHECKLIST_GROUPS;
const ITEMS = GROUPS.flatMap(g => g.items.map(it => ({ ...it, group: g.group })));

test('checklist SoT is the current 46-item canonical contract after cumulative patching', () => {
  assert.equal(GROUPS.length, 13);
  assert.equal(ITEMS.length, 46);
  assert.equal(new Set(GROUPS.map(g => g.masterCategoryId)).size, 13);
});

test('current 46-item checklist preserves the explicitly accumulated 2026-09-12 components', () => {
  const accumulated = ITEMS.filter(it => String(it.sumber || '').includes('USER_ACCUMULATED_LIST_2026-09-12'));
  assert.equal(accumulated.length, 17);
  for (const id of ['filter-oli','slide-piece-cvt','filter-fuel-pump','relay-sekring']) {
    assert.ok(ITEMS.some(it => it.id === id), `expected accumulated checklist item: ${id}`);
  }
});

test('legacy checklist action contracts remain stable', () => {
  const busi = ITEMS.find(it => it.id === 'busi');
  const kompresi = ITEMS.find(it => it.id === 'kompresi-mesin');
  const kabel = ITEMS.find(it => it.id === 'kabel-gas-standar-kunci');
  assert.equal(busi.actionMode, 'alternate');
  assert.equal(kompresi.actionMode, 'none');
  assert.equal(kabel.intervalKm, 8000);
});
