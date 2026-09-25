const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const servisPath = path.join(root, 'modules/vehicle/servis.js');

function loadServis({ logs, vehicleId = 'v1' }) {
  const panel = { innerHTML: '' };
  const context = {
    console,
    window: {},
    D: { servisLogs: logs, vehicles: [{ id: vehicleId, name: 'Vehicle 1' }], sparepartCats: [] },
    curVehicleId: vehicleId,
    escapeHtml: (x) => String(x == null ? '' : x),
    resolveCatGroup: () => null,
    resolveServisCatForVehicle: () => null,
    servisLogMatchesCat: () => false,
    compareServiceHistoryRecency: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
    ServiceInputCatalog: {
      infer: (name) => {
        const n = String(name || '').toLowerCase();
        if (n.includes('saringan udara') || n.includes('filter udara')) return { item: { id: 'filter-udara', name: 'Saringan udara' } };
        return null;
      },
      itemById: (id) => ({ item: { id, name: id === 'filter-udara' ? 'Saringan udara' : String(id) } }),
    },
    ServiceEventOutbox: { enqueue() {} },
    document: {
      getElementById(id) {
        if (id === 'servisHistoryPanel') return panel;
        return null;
      },
      querySelector() { return null; },
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(servisPath, 'utf8'), context, { filename: servisPath });
  return { Servis: context.window.Servis, panel };
}

test('S2016: Reminder → Riwayat keeps selected component across all vehicle sessions', () => {
  const logs = [
    { id: 'l1', vehicleId: 'v1', date: '2026-09-24', sessionId: 's2', serviceComponentId: 'filter-udara', item: 'Saringan udara' },
    { id: 'l2', vehicleId: 'v1', date: '2026-06-01', sessionId: 's1', item: 'Saringan udara' },
    { id: 'l3', vehicleId: 'v1', date: '2026-05-01', sessionId: 's0', serviceComponentId: 'busi', item: 'Busi' },
    { id: 'l4', vehicleId: 'v2', date: '2026-04-01', sessionId: 'sx', serviceComponentId: 'filter-udara', item: 'Saringan udara' },
  ];
  const { Servis, panel } = loadServis({ logs });
  Servis.editId = 'l1';
  Servis.serviceHistorySessionFilter = '';
  Servis.serviceHistoryComponentFilter = 'filter-udara';
  Servis.resolveCanonicalServiceSelection = ({ serviceComponentId }) => ({
    component: { name: serviceComponentId === 'filter-udara' ? 'Saringan udara' : serviceComponentId },
    group: null,
  });
  Servis.renderEditHistoryTab();

  assert.equal(Servis.serviceHistorySessionFilter, '', 'component navigation must not retain a single session');
  assert.equal(Servis.serviceHistoryComponentFilter, 'filter-udara');
  const rowDates = [...panel.innerHTML.matchAll(/📅 ([0-9-]+)/g)].map(m => m[1]);
  assert.deepEqual(rowDates, ['2026-09-24', '2026-06-01']);
  assert.match(panel.innerHTML, /2 riwayat tercatat/);
});

test('S2016: legacy history without serviceComponentId resolves to canonical component', () => {
  const { Servis } = loadServis({ logs: [] });
  assert.equal(
    Servis.resolveLogServiceComponentId({ vehicleId: 'v1', item: 'Saringan udara' }),
    'filter-udara'
  );
});

test('S2016: source no longer narrows Reminder history to target session', () => {
  const src = fs.readFileSync(servisPath, 'utf8');
  const start = src.indexOf('openHistoryFromReminder(categoryId,componentId){');
  const end = src.indexOf('\nrenderServiceComponentFilter(beforeEl){', start);
  assert.ok(start >= 0 && end > start);
  const fn = src.slice(start, end);
  assert.match(fn, /Servis\.openModal\(target\.id\);/);
  assert.match(fn, /Servis\.serviceHistorySessionFilter='';/);
  assert.match(fn, /Servis\.serviceHistoryComponentFilter=String\(componentId\|\|''\);/);
  assert.doesNotMatch(fn, /serviceHistorySessionFilter=String\(\(target&&/);
});

test('S2016: history component list and rows use canonical resolver + normalized vehicle IDs', () => {
  const src = fs.readFileSync(servisPath, 'utf8');
  const start = src.indexOf('renderEditHistoryTab(){');
  const end = src.indexOf('\ncreateHistoryAuditPackage(){', start);
  assert.ok(start >= 0 && end > start);
  const fn = src.slice(start, end);
  assert.match(fn, /String\(x\.vehicleId\)===vehicleKey/);
  assert.match(fn, /Servis\.resolveLogServiceComponentId\(x\)/);
  assert.match(fn, /Servis\.resolveLogServiceComponentId\(log\)/);
  assert.doesNotMatch(fn, /x\.vehicleId===vehicleId/);
  assert.doesNotMatch(fn, /log\.vehicleId!==vehicleId/);
});

test('S2016: production bundle contains the canonical history-navigation fix', () => {
  const bundle = fs.readFileSync(path.join(root, 'app-bundle-b.min.js'), 'utf8');
  assert.match(bundle, /serviceHistorySessionFilter=''/);
  assert.match(bundle, /resolveLogServiceComponentId/);
});
