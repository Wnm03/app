'use strict';
// tests/ride-map.test.js — cakupan modules/vehicle/ride-map.js (S526,
// "Map / Route Foundation"). Dua kelompok test: (1) fungsi murni (0 DOM)
// dites langsung tanpa mock apa pun, termasuk dgn & tanpa
// RideActivityMetrics (S522) ter-load supaya jalur reuse DAN jalur
// fallback lokal keduanya tercover; (2) lifecycle create/update/clear/
// destroy dites lewat fake `document` (pola sama tests/ride-ui.test.js)
// supaya guard "elemen belum ada di markup" & idempotency-nya benar2
// teruji, bukan cuma diasumsikan.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

// --- fake document (pola identik makeDocument() di tests/ride-ui.test.js) ---
function makeDocument(knownIds) {
  const elements = new Map();
  const known = new Set(knownIds || []);
  function el(id) {
    if (!elements.has(id)) {
      elements.set(id, { id, innerHTML: '' });
    }
    return elements.get(id);
  }
  return {
    elements,
    getElementById: (id) => ((elements.has(id) || known.has(id)) ? el(id) : null),
  };
}

function loadWithMetrics(doc) {
  const ctx = loadSource(
    ['modules/vehicle/ride-activity-metrics.js', 'modules/vehicle/ride-map.js'],
    { document: doc || makeDocument(['rideMapEl']) },
    ['RideActivityMetrics', 'RideMap'],
  );
  return ctx;
}

function loadWithoutMetrics(doc) {
  const ctx = loadSource(
    ['modules/vehicle/ride-map.js'],
    { document: doc || makeDocument(['rideMapEl']) },
    ['RideMap'],
  );
  return ctx;
}

const P1 = { latitude: -6.175392, longitude: 106.827153, timestamp: 1000 };
const P2 = { latitude: -6.180000, longitude: 106.830000, timestamp: 2000 };
const P3 = { latitude: -6.195000, longitude: 106.823059, timestamp: 3000 };

// =========================================================================
// FUNGSI MURNI
// =========================================================================

test('hasValidCoordinate() — valid vs invalid', () => {
  const { RideMap } = loadWithMetrics();
  assert.equal(RideMap.hasValidCoordinate(P1), true);
  assert.equal(RideMap.hasValidCoordinate(null), false);
  assert.equal(RideMap.hasValidCoordinate(undefined), false);
  assert.equal(RideMap.hasValidCoordinate({}), false);
  assert.equal(RideMap.hasValidCoordinate({ latitude: NaN, longitude: 106 }), false);
  assert.equal(RideMap.hasValidCoordinate({ latitude: 91, longitude: 106 }), false);
  assert.equal(RideMap.hasValidCoordinate({ latitude: -6, longitude: 181 }), false);
  assert.equal(RideMap.hasValidCoordinate({ latitude: '-6', longitude: 106 }), false);
  assert.equal(RideMap.hasValidCoordinate({ latitude: Infinity, longitude: 106 }), false);
});

test('filterValidPoints() — buang invalid, 0 mutate input, urutan dipertahankan', () => {
  const { RideMap } = loadWithMetrics();
  const input = [P1, { latitude: 999, longitude: 1 }, P2, null, { latitude: NaN, longitude: NaN }, P3];
  const frozenCopy = input.map((p) => (p ? { ...p } : p));
  const out = RideMap.filterValidPoints(input);
  // per-field, bukan deepEqual whole-array -- out datang dari realm vm
  // sandbox (loadSource), literal pembanding dari realm test ini;
  // deepStrictEqual (assert/strict) menganggap array/objek lintas realm
  // TIDAK reference-equal walau structurally sama (pola sama
  // tests/ride-activity-metrics.test.js).
  assert.equal(out.length, 3);
  assert.equal(out[0].latitude, P1.latitude);
  assert.equal(out[1].latitude, P2.latitude);
  assert.equal(out[2].latitude, P3.latitude);
  assert.deepEqual(input, frozenCopy); // input tidak berubah (array/objek realm test asli)
  assert.equal(RideMap.filterValidPoints(null).length, 0);
  assert.equal(RideMap.filterValidPoints(undefined).length, 0);
  assert.equal(RideMap.filterValidPoints('bukan-array').length, 0);
});

test('computeBounds() — reuse RideActivityMetrics.calculateBoundingBox() kalau ter-load', () => {
  const { RideMap, RideActivityMetrics } = loadWithMetrics();
  const viaMetrics = RideActivityMetrics.calculateBoundingBox([P1, P2, P3]);
  const viaMap = RideMap.computeBounds([P1, P2, P3]);
  assert.equal(viaMap.minLatitude, viaMetrics.minLatitude);
  assert.equal(viaMap.maxLatitude, viaMetrics.maxLatitude);
  assert.equal(viaMap.minLongitude, viaMetrics.minLongitude);
  assert.equal(viaMap.maxLongitude, viaMetrics.maxLongitude);
});

test('computeBounds() — fallback lokal identik hasilnya kalau RideActivityMetrics belum ter-load', () => {
  const withMetrics = loadWithMetrics();
  const withoutMetrics = loadWithoutMetrics();
  assert.equal(typeof withoutMetrics.RideActivityMetrics, 'undefined');
  const a = withMetrics.RideMap.computeBounds([P1, P2, P3]);
  const b = withoutMetrics.RideMap.computeBounds([P1, P2, P3]);
  assert.equal(a.minLatitude, b.minLatitude);
  assert.equal(a.maxLatitude, b.maxLatitude);
  assert.equal(a.minLongitude, b.minLongitude);
  assert.equal(a.maxLongitude, b.maxLongitude);
});

test('computeBounds() — 0 koordinat valid -> null (bukan {min:0,...})', () => {
  const { RideMap } = loadWithMetrics();
  assert.equal(RideMap.computeBounds([]), null);
  assert.equal(RideMap.computeBounds(null), null);
  assert.equal(RideMap.computeBounds([{ latitude: 999, longitude: 1 }]), null);
});

test('projectPoint() — proyeksi dasar & pusat kalau span 0 (1 titik / semua sama)', () => {
  const { RideMap } = loadWithMetrics();
  const bounds = { minLatitude: -6.2, maxLatitude: -6.1, minLongitude: 106.8, maxLongitude: 106.9 };
  const p = RideMap.projectPoint({ latitude: -6.15, longitude: 106.85 }, bounds, 200, 200, 20);
  assert.ok(p.x >= 20 && p.x <= 180);
  assert.ok(p.y >= 20 && p.y <= 180);

  const flatBounds = { minLatitude: -6.15, maxLatitude: -6.15, minLongitude: 106.8, maxLongitude: 106.8 };
  const center = RideMap.projectPoint({ latitude: -6.15, longitude: 106.8 }, flatBounds, 200, 200, 20);
  assert.equal(center.x, 100);
  assert.equal(center.y, 100);
});

test('projectPoint() — lintang lebih besar (utara) diproyeksikan lebih ke ATAS (y lebih kecil)', () => {
  const { RideMap } = loadWithMetrics();
  const bounds = { minLatitude: -6.2, maxLatitude: -6.1, minLongitude: 106.8, maxLongitude: 106.9 };
  const north = RideMap.projectPoint({ latitude: -6.1, longitude: 106.85 }, bounds, 200, 200, 20);
  const south = RideMap.projectPoint({ latitude: -6.2, longitude: 106.85 }, bounds, 200, 200, 20);
  assert.ok(north.y < south.y);
});

test('projectPoints() — filter invalid dulu sebelum proyeksi, bounds null -> []', () => {
  const { RideMap } = loadWithMetrics();
  const bounds = RideMap.computeBounds([P1, P2]);
  const out = RideMap.projectPoints([P1, { latitude: 999, longitude: 1 }, P2], bounds, 200, 200, 20);
  assert.equal(out.length, 2);
  assert.equal(RideMap.projectPoints([P1, P2], null, 200, 200, 20).length, 0);
});

test('buildPolylineAttr() — < 2 titik -> string kosong, >= 2 titik -> "x,y x,y ..."', () => {
  const { RideMap } = loadWithMetrics();
  assert.equal(RideMap.buildPolylineAttr([]), '');
  assert.equal(RideMap.buildPolylineAttr([{ x: 1, y: 2 }]), '');
  const attr = RideMap.buildPolylineAttr([{ x: 1, y: 2 }, { x: 3.456, y: 4 }]);
  assert.equal(attr, '1,2 3.46,4');
});

test('buildRouteMarkup() — 0 trackpoints valid & 0 currentPosition -> empty state', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([], null, {});
  assert.equal(r.isEmpty, true);
  assert.equal(r.hasRoute, false);
  assert.equal(r.hasCurrentPosition, false);
  assert.equal(r.pointCount, 0);
  assert.match(r.svg, /<svg/);
  assert.match(r.svg, /Belum ada rute/);
  assert.doesNotMatch(r.svg, /<polyline/);
});

test('buildRouteMarkup() — semua trackpoints invalid tetap dianggap kosong, 0 throw', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([{ latitude: 999, longitude: 1 }, null, undefined], null, {});
  assert.equal(r.isEmpty, true);
  assert.equal(r.pointCount, 0);
});

test('buildRouteMarkup() — 1 trackpoint valid -> marker titik, BUKAN empty, hasRoute false', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([P1], null, {});
  assert.equal(r.isEmpty, false);
  assert.equal(r.hasRoute, false);
  assert.equal(r.pointCount, 1);
  assert.match(r.svg, /ride-map-start/);
  assert.doesNotMatch(r.svg, /<polyline/);
});

test('buildRouteMarkup() — >= 2 trackpoint valid -> polyline + marker start', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([P1, P2, P3], null, {});
  assert.equal(r.isEmpty, false);
  assert.equal(r.hasRoute, true);
  assert.equal(r.pointCount, 3);
  assert.match(r.svg, /<polyline/);
  assert.match(r.svg, /ride-map-start/);
});

test('buildRouteMarkup() — koordinat invalid di tengah array dilewati, sisanya tetap dirender', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([P1, { latitude: NaN, longitude: NaN }, P2, P3], null, {});
  assert.equal(r.pointCount, 3);
  assert.equal(r.hasRoute, true);
});

test('buildRouteMarkup() — currentPosition valid -> marker terpisah, ikut bounds', () => {
  const { RideMap } = loadWithMetrics();
  const farAway = { latitude: -6.30, longitude: 106.95 };
  const r = RideMap.buildRouteMarkup([P1, P2], farAway, {});
  assert.equal(r.hasCurrentPosition, true);
  assert.match(r.svg, /ride-map-current/);
  // bounds harus mencakup farAway juga (bukan cuma trackpoints)
  const bounds = RideMap.computeBounds([P1, P2, farAway]);
  const boundsTrackOnly = RideMap.computeBounds([P1, P2]);
  assert.notDeepEqual(bounds, boundsTrackOnly);
});

test('buildRouteMarkup() — currentPosition invalid diabaikan (bukan error), route tetap dirender', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([P1, P2], { latitude: 999, longitude: 1 }, {});
  assert.equal(r.hasCurrentPosition, false);
  assert.doesNotMatch(r.svg, /ride-map-current/);
  assert.equal(r.hasRoute, true);
});

test('buildRouteMarkup() — currentPosition valid TANPA trackpoints -> bukan empty, hanya marker current', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([], P1, {});
  assert.equal(r.isEmpty, false);
  assert.equal(r.hasCurrentPosition, true);
  assert.equal(r.hasRoute, false);
  assert.equal(r.pointCount, 0);
  assert.doesNotMatch(r.svg, /ride-map-start/);
});

test('buildRouteMarkup() — options custom (width/height/warna) dipakai di markup', () => {
  const { RideMap } = loadWithMetrics();
  const r = RideMap.buildRouteMarkup([P1, P2], null, { width: 500, height: 400, routeColor: '#ff0000' });
  assert.match(r.svg, /viewBox="0 0 500 400"/);
  assert.match(r.svg, /#ff0000/);
});

// =========================================================================
// LIFECYCLE: create/update/clear/destroy
// =========================================================================

test('create() — daftarkan instance & render empty state ke DOM', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  const res = RideMap.create('rideMapEl');
  assert.equal(res.ok, true);
  assert.equal(res.id, 'rideMapEl');
  assert.match(doc.getElementById('rideMapEl').innerHTML, /Belum ada rute/);
});

test('create() — elementId belum ada di markup (DOM null) tidak throw, instance tetap tersimpan', () => {
  const doc = makeDocument([]); // 'ghostEl' sengaja tidak ada di document
  const { RideMap } = loadWithMetrics(doc);
  assert.doesNotThrow(() => RideMap.create('ghostEl'));
  const inst = RideMap.getInstance('ghostEl');
  assert.ok(inst);
  assert.equal(inst.elementId, 'ghostEl');
});

test('create() — elementId invalid (bukan string/kosong) -> {ok:false}, bukan throw', () => {
  const { RideMap } = loadWithMetrics();
  assert.deepEqual(RideMap.create('').ok, false);
  assert.deepEqual(RideMap.create(null).ok, false);
  assert.deepEqual(RideMap.create(undefined).ok, false);
});

test('update() sebelum create() -> {ok:false, error NOT_FOUND}, bukan throw', () => {
  const { RideMap } = loadWithMetrics();
  const res = RideMap.update('belumAda', [P1, P2], null);
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'NOT_FOUND');
});

test('update() setelah create() — render polyline ke DOM, balik metadata rute', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl');
  const res = RideMap.update('rideMapEl', [P1, P2, P3], null);
  assert.equal(res.ok, true);
  assert.equal(res.hasRoute, true);
  assert.equal(res.pointCount, 3);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /<polyline/);
});

test('update() dengan currentPosition — marker current ikut dirender', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl');
  const res = RideMap.update('rideMapEl', [P1, P2], P3);
  assert.equal(res.hasCurrentPosition, true);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /ride-map-current/);
});

test('update() dengan trackpoints kosong -> render empty state, 0 throw', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl');
  const res = RideMap.update('rideMapEl', [], null);
  assert.equal(res.ok, true);
  assert.equal(res.isEmpty, true);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /Belum ada rute/);
});

test('clear() — reset ke empty state TANPA melepas instance (update() sesudahnya tetap jalan)', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl');
  RideMap.update('rideMapEl', [P1, P2], null);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /<polyline/);

  const res = RideMap.clear('rideMapEl');
  assert.equal(res.ok, true);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /Belum ada rute/);

  const res2 = RideMap.update('rideMapEl', [P1, P2, P3], null);
  assert.equal(res2.ok, true);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /<polyline/);
});

test('clear() pada elementId yang belum di-create() -> {ok:false}, bukan throw', () => {
  const { RideMap } = loadWithMetrics();
  const res = RideMap.clear('tidakPernahDiCreate');
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'NOT_FOUND');
});

test('destroy() — kosongkan DOM & lepas instance sepenuhnya (idempotent)', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl');
  RideMap.update('rideMapEl', [P1, P2], null);

  const res = RideMap.destroy('rideMapEl');
  assert.equal(res.ok, true);
  assert.equal(doc.getElementById('rideMapEl').innerHTML, '');
  assert.equal(RideMap.getInstance('rideMapEl'), null);

  // destroy() kedua kali -> tidak throw, balik ok:false (sudah lepas)
  const res2 = RideMap.destroy('rideMapEl');
  assert.equal(res2.ok, false);

  // update()/clear() setelah destroy() -> NOT_FOUND, bukan throw
  assert.equal(RideMap.update('rideMapEl', [P1, P2], null).ok, false);
  assert.equal(RideMap.clear('rideMapEl').ok, false);
});

test('create() dua kali dengan elementId sama -> idempotent (instance lama ditimpa, 0 kebocoran)', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  RideMap.create('rideMapEl', { width: 100 });
  RideMap.update('rideMapEl', [P1, P2], null);
  RideMap.create('rideMapEl', { width: 999 });
  const inst = RideMap.getInstance('rideMapEl');
  assert.equal(inst.options.width, 999);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /Belum ada rute/);
});

test('getInstance() — null kalau belum pernah create()/sudah destroy(), copy dangkal kalau ada', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);
  assert.equal(RideMap.getInstance('rideMapEl'), null);
  RideMap.create('rideMapEl');
  const inst = RideMap.getInstance('rideMapEl');
  assert.ok(inst);
  inst.options.width = 12345; // mutasi hasil getInstance() TIDAK boleh nembus ke instance asli
  const inst2 = RideMap.getInstance('rideMapEl');
  assert.notEqual(inst2.options.width, 12345);
});

test('lifecycle penuh end-to-end: create -> update (route+current) -> clear -> update -> destroy', () => {
  const doc = makeDocument(['rideMapEl']);
  const { RideMap } = loadWithMetrics(doc);

  assert.equal(RideMap.create('rideMapEl').ok, true);
  const u1 = RideMap.update('rideMapEl', [P1, P2, P3], P3);
  assert.equal(u1.hasRoute, true);
  assert.equal(u1.hasCurrentPosition, true);

  assert.equal(RideMap.clear('rideMapEl').ok, true);
  assert.match(doc.getElementById('rideMapEl').innerHTML, /Belum ada rute/);

  const u2 = RideMap.update('rideMapEl', [P1], null);
  assert.equal(u2.hasRoute, false);
  assert.equal(u2.pointCount, 1);

  assert.equal(RideMap.destroy('rideMapEl').ok, true);
  assert.equal(RideMap.getInstance('rideMapEl'), null);
});
