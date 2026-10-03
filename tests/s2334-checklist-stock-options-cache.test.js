'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function extractMethodBody(source, name) {
  const marker = `${name}(){`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `method ${name} not found`);
  let i = start + marker.length;
  let depth = 1;
  while (depth > 0) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') depth -= 1;
    i += 1;
  }
  return source.slice(start + marker.length, i - 1);
}

test('S2334 checklist render reads and filters vehicle stock once per render, even with multiple checked items', () => {
  const box = { innerHTML: '' };
  const ctx = { console, escapeHtml: value => String(value), Object, JSON, Array, String, Number, Set, Map };
  ctx.window = ctx;
  vm.createContext(ctx);
  ctx.document = { getElementById: id => id === 'servisChecklistPanel' ? box : null };
  vm.runInContext(require('./helpers/serviceMasterFixture').generatedSource(), ctx);
  vm.runInContext(fs.readFileSync('modules/vehicle/servis-checklist.js', 'utf8'), ctx);

  ctx.curVehicleId = 'veh-1';
  ctx.Servis = { _serviceChecklistMasterCategoryIds: ['servis-mesin', 'sistem-pengereman', 'roda'] };
  let stockReads = 0;
  ctx.servisPartsStockRead = () => {
    stockReads += 1;
    return [
      { id: 'part-shared', name: 'Busi', qty: 3 },
      { id: 'part-other-vehicle', name: 'Ban', qty: 2, vehicleId: 'veh-2' },
    ];
  };

  const groups = ctx.Servis._serviceChecklistMasterCategoryIds
    .map(id => ctx.ServisChecklist.findGroupByMasterCategoryId(id)).filter(Boolean);
  const itemIds = groups.flatMap(found => ctx.ServisChecklist.itemsOfGroup(found.group).map(item => item.id));
  assert.ok(itemIds.length >= 3, 'fixture should include multiple checklist items');
  ctx.ServisChecklist._checked[itemIds[0]] = 'ganti';
  ctx.ServisChecklist._checked[itemIds[1]] = 'periksa';
  ctx.ServisChecklist._checked[itemIds[2]] = 'bersih';
  ctx.ServisChecklist._stockPartRefs = ctx.ServisChecklist._stockPartRefs || {};
  ctx.ServisChecklist._stockPartRefs[itemIds[0]] = { partId: 'part-shared', qty: 1 };

  const source = fs.readFileSync('modules/vehicle/servis.js', 'utf8');
  const body = extractMethodBody(source, 'renderServiceChecklist');
  const render = vm.runInContext(`(function renderServiceChecklist(){${body}})`, ctx);
  assert.doesNotThrow(() => render.call(ctx.Servis));
  assert.equal(stockReads, 1, 'the stock source/filter must run once, not once per checked component');
  assert.ok(box.innerHTML.includes('value="part-shared" selected'), 'selected stock part remains selected');
  assert.ok(!box.innerHTML.includes('part-other-vehicle'), 'stock belonging to another vehicle remains excluded');
});
