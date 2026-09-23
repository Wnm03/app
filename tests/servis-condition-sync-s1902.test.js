'use strict';
// S1902 — single state bridge between the checklist result and the main
// Car Notes service editor. The checklist remains the component state when
// the current serviceComponentId is a checked checklist item; free/manual
// service entries remain independent.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeDocument() {
  const elements = new Map();
  const ids = [
    'servisComponent','servisItem','servisActionType','servisActionTypeWrap',
    'servisActionTypeHint','servisConditionResult','servisConditionNote',
    'servisChecklistPanel','servisCategory'
  ];
  ids.forEach(id => elements.set(id, {
    id,
    value: '',
    innerHTML: '',
    style: {},
    classList: { add(){}, remove(){}, toggle(){} },
    dataset: {},
    options: [],
    selectedOptions: [],
  }));
  return { getElementById: id => elements.get(id) || null, elements };
}

function freshCtx() {
  const document = makeDocument();
  const D = { sparepartCats: [], servisLogs: [], vehicles: [], accounts: [], partsStock: [] };
  const ctx = loadSource(
    ['modules/vehicle/service-master-data.generated.js','modules/vehicle/servis.js'],
    {
      D,
      curVehicleId: 'veh-1',
      document,
      SERVICE_CONDITION_RESULTS: [
        { id:'baik', label:'Baik', icon:'🟢' },
        { id:'mulai-aus', label:'Mulai aus', icon:'🟡' },
        { id:'aus', label:'Aus', icon:'🟠' },
        { id:'rusak', label:'Rusak', icon:'🔴' },
      ],
      validServiceCondition: id => ['baik','mulai-aus','aus','rusak'].includes(id),
      serviceConditionLabel: id => String(id),
      resolveServisCatForVehicle: () => null,
      escapeHtml: value => String(value ?? ''),
    },
    ['SERVICE_CHECKLIST_GROUPS','ServisChecklist']
  );
  return { ctx, document };
}

function setupFilterOli(ctx, document) {
  ctx.ServisChecklist.open('veh-1');
  const found = ctx.ServisChecklist.findItemById('filter-oli');
  assert.ok(found, 'Filter Oli harus ada di checklist SoT');
  ctx.ServisChecklist.toggleItem(found.groupIdx, found.itemIdx);
  document.elements.get('servisComponent').value = 'filter-oli';
  document.elements.get('servisItem').value = 'Filter Oli';
  return found;
}

test('checklist -> form: hasil, catatan, dan tindakan memakai state komponen yang sama', () => {
  const { ctx, document } = freshCtx();
  setupFilterOli(ctx, document);
  ctx.ServisChecklist.setConditionResultByItemId('filter-oli', 'baik');
  ctx.ServisChecklist.setConditionNoteByItemId('filter-oli', 'masih bersih');

  assert.equal(ctx.window.Servis.syncServiceFormFromChecklist('filter-oli'), true);
  assert.equal(document.elements.get('servisConditionResult').value, 'baik');
  assert.equal(document.elements.get('servisConditionNote').value, 'masih bersih');
  assert.equal(document.elements.get('servisActionType').value, 'periksa');
});

test('form -> checklist: hasil pemeriksaan dua arah tanpa auto-check item yang belum dicentang', () => {
  const { ctx, document } = freshCtx();
  setupFilterOli(ctx, document);
  document.elements.get('servisConditionResult').value = 'aus';
  ctx.window.Servis.onServiceConditionResultChange();
  assert.equal(ctx.ServisChecklist._results['filter-oli'], 'aus');

  document.elements.get('servisConditionResult').value = '';
  ctx.window.Servis.onServiceConditionResultChange();
  assert.equal(ctx.ServisChecklist._results['filter-oli'], undefined);

  // New manual item is not allowed to silently become a checklist item.
  document.elements.get('servisComponent').value = 'komponen-tidak-dikenal';
  document.elements.get('servisItem').value = 'Komponen Manual';
  document.elements.get('servisConditionResult').value = 'rusak';
  ctx.window.Servis.onServiceConditionResultChange();
  assert.equal(ctx.ServisChecklist._results['filter-oli'], undefined);
});

test('form -> checklist: tindakan manual juga sinkron untuk komponen yang punya dua opsi', () => {
  const { ctx, document } = freshCtx();
  ctx.ServisChecklist.open('veh-1');
  const found = ctx.ServisChecklist.findItemById('kampas-rem-depan');
  assert.ok(found, 'Kampas Rem Depan harus ada di checklist SoT');
  ctx.ServisChecklist.toggleItem(found.groupIdx, found.itemIdx);
  document.elements.get('servisComponent').value = 'kampas-rem-depan';
  document.elements.get('servisItem').value = 'Kampas Rem Depan';
  assert.equal(document.elements.get('servisActionType').value, '');
  ctx.window.Servis.syncServiceFormFromChecklist('kampas-rem-depan');
  assert.equal(document.elements.get('servisActionType').value, 'periksa');
  document.elements.get('servisActionType').value = 'ganti';
  ctx.window.Servis.onServiceActionTypeChange();
  assert.equal(ctx.ServisChecklist._checked['kampas-rem-depan'], 'ganti');
});

test('form -> checklist: catatan kondisi ikut sinkron tanpa rerender setiap keystroke', () => {
  const { ctx, document } = freshCtx();
  setupFilterOli(ctx, document);
  document.elements.get('servisConditionNote').value = 'rembes sedikit';
  ctx.window.Servis.onServiceConditionNoteChange();
  assert.equal(ctx.ServisChecklist._conditionNotes['filter-oli'], 'rembes sedikit');
});

test('setConditionResult kosong menghapus hasil lama dan Tidak Berlaku membersihkan catatan stale', () => {
  const { ctx } = freshCtx();
  ctx.ServisChecklist.open('veh-1');
  const found = ctx.ServisChecklist.findItemById('filter-oli');
  ctx.ServisChecklist.toggleItem(found.groupIdx, found.itemIdx);
  ctx.ServisChecklist.setConditionResultByItemId('filter-oli', 'rusak');
  ctx.ServisChecklist.setConditionNoteByItemId('filter-oli', 'retak');
  ctx.ServisChecklist.setNotApplicable(found.groupIdx, found.itemIdx, true);
  assert.equal(ctx.ServisChecklist._results['filter-oli'], undefined);
  assert.equal(ctx.ServisChecklist._conditionNotes['filter-oli'], undefined);
});
