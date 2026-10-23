'use strict';
// S2702 — tes karakterisasi (differential) untuk optimasi lookup katalog di
// modules/vehicle/service-category-sot-reconciliation-s2007.js.
// Implementasi lama dibekukan di tests/fixtures/s2007-reference-original.js;
// implementasi baru HARUS menghasilkan keluaran identik (nilai, urutan,
// perilaku error, isolasi mutasi) dan wajib invalid otomatis saat katalog berubah.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const NEW_PATH = path.join(__dirname, '..', 'modules', 'vehicle', 'service-category-sot-reconciliation-s2007.js');
const REF_PATH = path.join(__dirname, 'fixtures', 's2007-reference-original.js');
const MASTER = require('../modules/vehicle/service-master-data.generated.js').SERVICE_CHECKLIST_GROUPS;

function load(p) { delete require.cache[require.resolve(p)]; return require(p); }
const J = (v) => JSON.stringify(v);
function setCatalog(fn) { global.ServiceInputCatalog = { groups: fn }; }
function both() { return { n: load(NEW_PATH), r: load(REF_PATH) }; }

test.afterEach(() => { delete global.ServiceInputCatalog; });

test('katalog master asli: catalogItems/ById/ExactName identik dengan implementasi lama', () => {
  setCatalog(() => MASTER);
  const { n, r } = both();
  assert.ok(n.catalogItems().length >= 100, 'katalog master harus terisi');
  assert.equal(J(n.catalogItems()), J(r.catalogItems()));
  for (const it of r.catalogItems()) {
    assert.equal(J(n.catalogById(it.id)), J(r.catalogById(it.id)), 'id ' + it.id);
    assert.equal(J(n.exactNameCandidates(it.name)), J(r.exactNameCandidates(it.name)), 'nama ' + it.name);
    assert.equal(J(n.exactNameCandidates('  ' + String(it.name).toUpperCase().replace(/ /g, '   ') + ' ')), J(r.exactNameCandidates('  ' + String(it.name).toUpperCase().replace(/ /g, '   ') + ' ')));
  }
  for (const probe of ['', null, undefined, '  ', 'tidak-ada', 0, 123]) {
    assert.equal(J(n.catalogById(probe)), J(r.catalogById(probe)), 'probe id ' + String(probe));
    assert.equal(J(n.exactNameCandidates(probe)), J(r.exactNameCandidates(probe)), 'probe nama ' + String(probe));
  }
});

test('categoryIdentity/classifyCategory/auditCategories/canonicalReminderProjection identik', () => {
  setCatalog(() => MASTER);
  const { n, r } = both();
  const items = r.catalogItems();
  const cats = [];
  items.slice(0, 40).forEach((it, i) => {
    cats.push({ id: 'e' + i, vehicleId: 'v1', name: it.name, serviceComponentId: it.id, intervalKm: it.intervalKm });
    cats.push({ id: 'n' + i, vehicleId: 'v1', name: it.name, intervalKm: (it.intervalKm || 1000) + 1 });
    cats.push({ id: 'x' + i, vehicleId: 'v2', name: it.name.toUpperCase(), intervalBulan: 99 });
  });
  cats.push({ id: 'z1', name: 'Komponen Tidak Dikenal', masterCategoryId: 'm9' }, { id: 'z2' }, null);
  for (const c of cats) {
    assert.equal(J(n.categoryIdentity(c)), J(r.categoryIdentity(c)));
    assert.equal(J(n.classifyCategory(c)), J(r.classifyCategory(c)));
  }
  assert.equal(J(n.auditCategories(cats, 'v1')), J(r.auditCategories(cats, 'v1')));
  assert.equal(J(n.auditAll(cats, [{ id: 'v1' }, { id: 'v2' }])), J(r.auditAll(cats, [{ id: 'v1' }, { id: 'v2' }])));
  assert.equal(J(n.canonicalReminderProjection(cats, 'v1')), J(r.canonicalReminderProjection(cats, 'v1')));
});

test('nama ganda -> kandidat ambigu, urutan katalog dipertahankan; id ganda -> pertama-cocok', () => {
  const g = [
    { masterCategoryId: 'a', items: [{ id: 'dup', name: 'Kampas Rem', intervalKm: 1 }, { id: 'k2', name: 'kampas  rem' }] },
    { masterCategoryId: 'b', group: 'B', items: [{ id: 'dup', name: 'Lain', masterCategoryId: 'own' }, { id: 'k3', name: 'Kampas Rem', group: { masterCategoryId: 'viaGroup' } }] },
  ];
  setCatalog(() => g);
  const { n, r } = both();
  assert.equal(J(n.catalogItems()), J(r.catalogItems()));
  assert.equal(J(n.catalogById('dup')), J(r.catalogById('dup')));
  assert.equal(n.catalogById('dup').name, 'Kampas Rem');
  assert.equal(J(n.exactNameCandidates('KAMPAS REM')), J(r.exactNameCandidates('KAMPAS REM')));
  assert.equal(n.exactNameCandidates('KAMPAS REM').length, 3);
  assert.equal(J(n.categoryIdentity({ name: 'kampas rem' })), J(r.categoryIdentity({ name: 'kampas rem' })));
});

test('perilaku error identik: groups() melempar / null / bukan array / item null / katalog tidak ada', () => {
  const cases = {
    throws: () => { throw new Error('boom'); },
    nullish: () => null,
    notArray: () => ({ flatMap: () => [{ id: 'x', name: 'X' }] }),
    nullItem: () => [{ items: [null] }],
    stringItems: () => [{ items: 'abc' }],
    nullGroup: () => [null, { items: [{ id: 'ok', name: 'OK' }] }],
  };
  for (const [k, fn] of Object.entries(cases)) {
    setCatalog(fn);
    const { n, r } = both();
    for (const f of ['catalogItems']) assert.equal(J(n[f]()), J(r[f]()), k + ' ' + f);
    assert.equal(J(n.catalogById('ok')), J(r.catalogById('ok')), k + ' byId');
    assert.equal(J(n.exactNameCandidates('ok')), J(r.exactNameCandidates('ok')), k + ' byName');
  }
  delete global.ServiceInputCatalog;
  const { n, r } = both();
  assert.equal(J(n.catalogItems()), J(r.catalogItems()));
  assert.equal(n.catalogById('x'), r.catalogById('x'));
  assert.equal(J(n.exactNameCandidates('x')), J(r.exactNameCandidates('x')));
});

test('isolasi mutasi: hasil yang dimutasi pemanggil tidak mencemari panggilan berikutnya', () => {
  setCatalog(() => MASTER);
  const { n } = both();
  const first = n.catalogById('oli-mesin') || n.catalogItems()[0];
  const id = first.id, name = first.name;
  const before = J(n.catalogById(id));
  first.name = 'DIMUTASI'; first.intervalKm = -5; first.extra = true;
  n.catalogItems()[0].name = 'DIMUTASI-2';
  n.exactNameCandidates(name).forEach((x) => { x.name = 'DIMUTASI-3'; });
  assert.equal(J(n.catalogById(id)), before);
  assert.ok(n.exactNameCandidates(name).length >= 1);
});

test('invalidasi otomatis: array diganti, item di-push in-place, grup ditambah', () => {
  const g1 = [{ masterCategoryId: 'a', items: [{ id: 'a1', name: 'A1' }] }];
  let cur = g1;
  setCatalog(() => cur);
  const { n, r } = both();
  assert.equal(n.catalogById('a1').name, 'A1');
  assert.equal(n.catalogById('a2'), null);
  g1[0].items.push({ id: 'a2', name: 'A2' });                       // in-place push
  assert.equal(J(n.catalogById('a2')), J(r.catalogById('a2')));
  assert.equal(n.catalogById('a2').name, 'A2');
  g1.push({ masterCategoryId: 'b', items: [{ id: 'b1', name: 'B1' }] }); // grup baru
  assert.equal(J(n.catalogById('b1')), J(r.catalogById('b1')));
  assert.notEqual(n.catalogById('b1'), null);
  cur = [{ masterCategoryId: 'c', items: [{ id: 'c1', name: 'C1' }] }]; // array diganti
  assert.equal(n.catalogById('a1'), null);
  assert.equal(n.catalogById('c1').name, 'C1');
  assert.equal(J(n.catalogItems()), J(r.catalogItems()));
  g1[0].items = [];                                                       // items diganti
  cur = g1;
  assert.equal(n.catalogById('a1'), null);
});

test('performa: 3.000 lookup pada katalog master jauh lebih cepat dari implementasi lama', () => {
  setCatalog(() => MASTER);
  const { n, r } = both();
  const ids = r.catalogItems().map((i) => i.id);
  const run = (m) => { const t = process.hrtime.bigint(); for (let i = 0; i < 3000; i++) m.catalogById(ids[i % ids.length]); return Number(process.hrtime.bigint() - t) / 1e6; };
  run(n); run(r);
  const tNew = run(n), tOld = run(r);
  assert.ok(tNew * 3 < tOld, `baru ${tNew.toFixed(1)}ms vs lama ${tOld.toFixed(1)}ms`);
});
