// ride-map.js — RideMap (S526, "Map / Route Foundation"). HARD SCOPE
// sesi ini: MAP ABSTRACTION murni buat menggambar rute (polyline) +
// posisi terkini dari trackpoints yang sudah ada (S522 RideActivityMetrics,
// S523 RideGpsRecorder, S524 RideStorage, S525 RideUI) — TIDAK ADA
// rumus GPS/metrics/persistence/orkestrasi baru di sini, 100% REUSE
// kontrak trackpoint yang sudah ada.
//
// TIDAK ADA di file ini (sengaja, sesuai scope S526):
//   - 0 perubahan ke modules/vehicle/ride-activity-metrics.js (S522),
//     ride-gps-recorder.js (S523), ride-storage.js (S524), ride-ui.js
//     (S525) — reuse murni lewat typeof guard, pola sama RideUI mereuse
//     3 modul di bawahnya.
//   - 0 perubahan ke Vehicle/Fuel/Maintenance/History/Analytics.
//   - 0 perubahan ke index.html/app_production.html/MODAL_HTML/build.js/
//     modules/shared/modals.js.
//   - 0 dependency baru (Leaflet/Google Maps/dst) — REPO AUDIT (sebelum
//     menulis file ini) tidak menemukan library map apa pun yang benar2
//     dipakai di repo (satu-satunya kandidat konvensi yang ADA & TERPAKAI
//     adalah inline SVG `<polyline>` murni, lihat modules/home/
//     hidup-seimbang.js baris ~191) — jadi RideMap mengikuti konvensi itu
//     apa adanya: render SVG inline tanpa dependency eksternal, tanpa
//     tile server, tanpa network call (cocok utk app offline-first
//     IndexedDB-primary yang sudah ada).
//
// MAP ABSTRACTION — dipisah 2 lapis:
//   1) FUNGSI MURNI (0 DOM, 100% dites tanpa browser): hasValidCoordinate/
//      filterValidPoints/computeBounds/projectPoint/projectPoints/
//      buildPolylineAttr/buildRouteMarkup — mengubah trackpoints mentah
//      jadi markup SVG (string), TIDAK PERNAH menyentuh document/DOM.
//      Ini lapisan yang bisa diganti render target lain (mis. Canvas,
//      atau library map sungguhan nanti) tanpa mengubah kontrak lifecycle
//      di bawah — itulah "abstraksi"-nya: caller cuma peduli
//      create/update/clear/destroy, bukan detail SVG.
//   2) LIFECYCLE (DOM-touching, SELALU guard document.getElementById bisa
//      null, TIDAK PERNAH throw kalau elemen target belum ada di markup —
//      pola identik RideUI.render()): create()/update()/clear()/destroy().
//
// TRACKPOINT CONTRACT (identik S522/S523/S524 — lihat header modul2 itu):
//   { timestamp, latitude, longitude, accuracy, altitude, speed }
//   RideMap HANYA memakai latitude/longitude dari kontrak ini.
//
// PRINSIP UMUM:
//   - Koordinat invalid (bukan number/NaN/Infinity/di luar rentang
//     derajat valid) TIDAK PERNAH dirender (dilewati/filtered), TIDAK
//     PERNAH throw — satu titik GPS buruk tidak boleh menggagalkan
//     seluruh render peta (pola sama RideActivityMetrics).
//   - 0 trackpoints valid (array kosong/null/undefined/semua invalid) ->
//     render "empty state" (bukan error, bukan crash) — lihat
//     buildRouteMarkup().
//   - currentPosition (posisi terkini, TERPISAH dari array trackpoints)
//     opsional; kalau invalid/tidak diberikan, marker posisi terkini
//     cuma dilewati (bukan dianggap error) — route/polyline dari
//     trackpoints tetap dirender.
//   - Semua fungsi murni 0 mutate input (copy/derive saja).
//   - Lifecycle instance disimpan di Map internal per elementId (bukan
//     di window/global lain) — create() dua kali dengan id yang sama
//     TIDAK membuat kebocoran (instance lama ditimpa, konsisten dgn
//     idempotent create() pola RideGpsRecorder.start() dua kali saat
//     RECORDING TIDAK bikin watcher kedua).
//   - update()/clear()/destroy() pada elementId yang belum pernah
//     di-create() TIDAK PERNAH throw — balik {ok:false,error} (pola
//     sama semua fungsi publik modul Ride lain), bukan exception.
//   - Semua dependency modul lain (RideActivityMetrics utk bounding box)
//     dicek `typeof X !== 'undefined'` dulu + fallback lokal kalau belum
//     ter-load — pola sama semua UI module lain di repo ini (lihat
//     RideUI._modulesReady()).

'use strict';

// --- helpers murni internal (0 DOM) ------------------------------------

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function hasValidCoordinate(p) {
  return !!p
    && isFiniteNumber(p.latitude) && p.latitude >= -90 && p.latitude <= 90
    && isFiniteNumber(p.longitude) && p.longitude >= -180 && p.longitude <= 180;
}

function asArray(points) {
  return Array.isArray(points) ? points : [];
}

// filterValidPoints(points) — copy baru, hanya titik dengan koordinat
// valid, 0 mutate input, urutan array dipertahankan apa adanya.
function filterValidPoints(points) {
  return asArray(points).filter(hasValidCoordinate);
}

// localBoundingBox(points) — fallback kalau RideActivityMetrics (S522)
// belum ter-load; identik logikanya dgn RideActivityMetrics.
// calculateBoundingBox() (lihat ride-activity-metrics.js) supaya
// perilaku sama persis baik reuse maupun fallback dipakai.
function localBoundingBox(points) {
  const pts = filterValidPoints(points);
  if (pts.length === 0) return null;
  let minLatitude = pts[0].latitude;
  let maxLatitude = pts[0].latitude;
  let minLongitude = pts[0].longitude;
  let maxLongitude = pts[0].longitude;
  for (let i = 1; i < pts.length; i++) {
    const { latitude, longitude } = pts[i];
    if (latitude < minLatitude) minLatitude = latitude;
    if (latitude > maxLatitude) maxLatitude = latitude;
    if (longitude < minLongitude) minLongitude = longitude;
    if (longitude > maxLongitude) maxLongitude = longitude;
  }
  return { minLatitude, maxLatitude, minLongitude, maxLongitude };
}

// computeBounds(points) — 100% REUSE RideActivityMetrics.
// calculateBoundingBox() (S522) kalau ter-load (typeof guard, pola sama
// RideUI._modulesReady()), fallback ke localBoundingBox() kalau belum
// (mis. dites terisolasi tanpa loadSource(['ride-activity-metrics.js'])).
// null kalau 0 koordinat valid (TIDAK PERNAH {min:0,...} — sama alasan
// dgn RideActivityMetrics: caller harus bisa bedakan "kosong" vs "titik
// di 0,0").
function computeBounds(points) {
  if (typeof RideActivityMetrics !== 'undefined' && RideActivityMetrics
    && typeof RideActivityMetrics.calculateBoundingBox === 'function') {
    return RideActivityMetrics.calculateBoundingBox(points);
  }
  return localBoundingBox(points);
}

// projectPoint(point, bounds, viewW, viewH, padding) — proyeksi
// equirectangular sederhana (linear, cukup utk jarak pendek 1 perjalanan
// — bukan proyeksi peta dunia) dari {latitude,longitude} ke koordinat
// SVG {x,y} di dalam viewBox 0..viewW / 0..viewH dikurangi padding.
// Sumbu Y dibalik (lintang makin besar = makin ke ATAS) krn SVG y makin
// besar = makin ke BAWAH. bounds datar (span 0, mis. 1 titik saja atau
// semua titik di lintang/bujur sama persis) -> dipusatkan (0 div/0).
function projectPoint(point, bounds, viewW, viewH, padding) {
  const latSpan = bounds.maxLatitude - bounds.minLatitude;
  const lonSpan = bounds.maxLongitude - bounds.minLongitude;
  const innerW = Math.max(0, viewW - (padding * 2));
  const innerH = Math.max(0, viewH - (padding * 2));
  const x = lonSpan === 0
    ? viewW / 2
    : padding + (((point.longitude - bounds.minLongitude) / lonSpan) * innerW);
  const y = latSpan === 0
    ? viewH / 2
    : padding + (((bounds.maxLatitude - point.latitude) / latSpan) * innerH);
  return { x, y };
}

// projectPoints(points, bounds, viewW, viewH, padding) — filterValidPoints
// dulu, lalu projectPoint per titik. bounds null (0 titik valid sama
// sekali, termasuk currentPosition) -> [] (bukan throw).
function projectPoints(points, bounds, viewW, viewH, padding) {
  const pts = filterValidPoints(points);
  if (!bounds || pts.length === 0) return [];
  return pts.map((p) => projectPoint(p, bounds, viewW, viewH, padding));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// buildPolylineAttr(projected) — string "x1,y1 x2,y2 ..." siap dipakai
// attribute `points` elemen SVG <polyline>. < 2 titik -> '' (garis butuh
// minimal 2 titik, 1 titik cuma jadi marker, bukan polyline).
function buildPolylineAttr(projected) {
  if (!Array.isArray(projected) || projected.length < 2) return '';
  return projected.map((p) => `${round2(p.x)},${round2(p.y)}`).join(' ');
}

const MAP_DEFAULT_OPTIONS = {
  width: 320,
  height: 320,
  padding: 20,
  routeColor: 'var(--accent3)',
  routeWidth: 3,
  startColor: 'var(--accent)',
  currentColor: 'var(--alert)',
  markerRadius: 5,
  currentRadius: 7,
  emptyLabel: 'Belum ada rute',
};

function mergeOptions(options) {
  return { ...MAP_DEFAULT_OPTIONS, ...(options || {}) };
}

function svgOpenTag(opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" `
    + 'width="100%" height="100%" role="img" aria-label="Peta rute perjalanan" class="ride-map-svg">';
}

function emptyStateMarkup(opts) {
  return `${svgOpenTag(opts)}`
    + `<text x="${opts.width / 2}" y="${opts.height / 2}" text-anchor="middle" `
    + 'dominant-baseline="middle" class="ride-map-empty-label" fill="currentColor" opacity="0.5" '
    + `font-size="13">${opts.emptyLabel}</text>`
    + '</svg>';
}

// buildRouteMarkup(trackpoints, currentPosition, options) — FUNGSI MURNI
// UTAMA modul ini: trackpoints (+ currentPosition opsional, TERPISAH dari
// array trackpoints) -> { svg, isEmpty, hasRoute, hasCurrentPosition,
// pointCount }. TIDAK PERNAH throw, TIDAK PERNAH menyentuh DOM.
//   - isEmpty: true kalau 0 koordinat valid sama sekali (trackpoints
//     MAUPUN currentPosition) -> svg cuma placeholder text (empty state).
//   - hasRoute: true kalau >= 2 trackpoint valid (polyline digambar).
//     1 trackpoint valid -> hasRoute=false tapi TETAP digambar sbg 1
//     marker titik awal (bukan dianggap kosong).
//   - hasCurrentPosition: true kalau currentPosition valid -> digambar
//     marker terpisah warna beda (opts.currentColor) DI ATAS route.
//   - Bounds dihitung dari GABUNGAN trackpoints valid + currentPosition
//     valid (supaya currentPosition di luar rute lama tetap kelihatan,
//     tidak terpotong viewBox).
function buildRouteMarkup(trackpoints, currentPosition, options) {
  const opts = mergeOptions(options);
  const validTrack = filterValidPoints(trackpoints);
  const validCurrent = hasValidCoordinate(currentPosition) ? currentPosition : null;

  const boundsSource = validCurrent ? [...validTrack, validCurrent] : validTrack;
  const bounds = computeBounds(boundsSource);

  if (!bounds) {
    return {
      svg: emptyStateMarkup(opts), isEmpty: true, hasRoute: false, hasCurrentPosition: false, pointCount: 0,
    };
  }

  const projectedTrack = projectPoints(validTrack, bounds, opts.width, opts.height, opts.padding);
  const hasRoute = projectedTrack.length >= 2;

  let body = svgOpenTag(opts);

  if (hasRoute) {
    const attr = buildPolylineAttr(projectedTrack);
    body += `<polyline points="${attr}" fill="none" stroke="${opts.routeColor}" `
      + `stroke-width="${opts.routeWidth}" stroke-linecap="round" stroke-linejoin="round" class="ride-map-route"/>`;
    const start = projectedTrack[0];
    body += `<circle cx="${round2(start.x)}" cy="${round2(start.y)}" r="${opts.markerRadius}" `
      + `fill="${opts.startColor}" class="ride-map-start"/>`;
  } else if (projectedTrack.length === 1) {
    const only = projectedTrack[0];
    body += `<circle cx="${round2(only.x)}" cy="${round2(only.y)}" r="${opts.markerRadius}" `
      + `fill="${opts.startColor}" class="ride-map-start"/>`;
  }

  let hasCurrentPosition = false;
  if (validCurrent) {
    const curProjected = projectPoint(validCurrent, bounds, opts.width, opts.height, opts.padding);
    body += `<circle cx="${round2(curProjected.x)}" cy="${round2(curProjected.y)}" r="${opts.currentRadius}" `
      + `fill="${opts.currentColor}" class="ride-map-current"/>`;
    hasCurrentPosition = true;
  }

  body += '</svg>';

  return {
    svg: body, isEmpty: false, hasRoute, hasCurrentPosition, pointCount: validTrack.length,
  };
}

// --- lifecycle: create/update/clear/destroy (DOM-touching, guarded) ---

// _instances — state runtime per elementId, TIDAK PERNAH dipersist (map
// murni presentational, sumber data tetap RideStorage/RideUI di layer
// atas — pola sama RideUI._recorder yang juga runtime-only).
const _instances = new Map();

function resolveElement(elementId) {
  if (typeof document === 'undefined' || !document || typeof document.getElementById !== 'function') return null;
  if (!elementId) return null;
  return document.getElementById(elementId) || null;
}

function setInner(el, markup) {
  if (el) el.innerHTML = markup;
}

// create(elementId, options) — daftarkan instance map baru terikat ke 1
// elementId, langsung render empty state. Guard elemen belum ada di
// markup (pola sama RideUI.render(), lihat WIRING STATUS di header
// ride-ui.js) — TIDAK PERNAH throw kalau elemen belum ter-mount, cuma
// state instance tetap tersimpan (update() berikutnya akan coba render
// ulang ke DOM begitu elemen ada, kalau caller panggil ulang create()
// atau elemen sudah termount saat update()).
// create() dua kali dgn elementId yang sama -> instance lama ditimpa
// (idempotent, 0 kebocoran instance ganda).
function create(elementId, options) {
  if (!elementId || typeof elementId !== 'string') {
    return { ok: false, error: { code: 'INVALID_ID', message: 'elementId wajib string non-kosong' } };
  }
  const opts = mergeOptions(options);
  _instances.set(elementId, { elementId, options: opts, lastMarkup: null });
  const el = resolveElement(elementId);
  const markup = emptyStateMarkup(opts);
  setInner(el, markup);
  const inst = _instances.get(elementId);
  inst.lastMarkup = markup;
  return { ok: true, id: elementId };
}

// update(elementId, trackpoints, currentPosition) — hitung ulang
// buildRouteMarkup() lalu tulis ke DOM (guard elemen null/instance belum
// ada). elementId yang belum pernah create() -> {ok:false,error} (bukan
// throw, bukan auto-create diam2 — caller harus create() dulu secara
// eksplisit, pola sama RideUI yang butuh start() dulu sebelum
// pause()/resume()/stop()).
function update(elementId, trackpoints, currentPosition) {
  const inst = _instances.get(elementId);
  if (!inst) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: `RideMap instance '${elementId}' belum di-create()` },
    };
  }
  const result = buildRouteMarkup(trackpoints, currentPosition, inst.options);
  const el = resolveElement(elementId);
  setInner(el, result.svg);
  inst.lastMarkup = result.svg;
  return {
    ok: true,
    isEmpty: result.isEmpty,
    hasRoute: result.hasRoute,
    hasCurrentPosition: result.hasCurrentPosition,
    pointCount: result.pointCount,
  };
}

// clear(elementId) — reset ke empty state TANPA melepas instance
// (options tetap dipertahankan, beda dari destroy()) — pola dipakai
// mis. saat discard() ride (RideUI.discard() pola serupa: reset state,
// bukan hapus registrasi UI-nya).
function clear(elementId) {
  const inst = _instances.get(elementId);
  if (!inst) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: `RideMap instance '${elementId}' belum di-create()` },
    };
  }
  const markup = emptyStateMarkup(inst.options);
  const el = resolveElement(elementId);
  setInner(el, markup);
  inst.lastMarkup = markup;
  return { ok: true };
}

// destroy(elementId) — kosongkan DOM (guard null) + lepas instance dari
// _instances sepenuhnya. Idempotent: destroy() pada elementId yang sudah
// di-destroy()/tidak pernah di-create() TIDAK throw, balik {ok:false}
// tanpa efek samping (pola sama RideGpsRecorder.stop() idempotent).
function destroy(elementId) {
  const inst = _instances.get(elementId);
  if (!inst) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: `RideMap instance '${elementId}' belum di-create()` },
    };
  }
  const el = resolveElement(elementId);
  setInner(el, '');
  _instances.delete(elementId);
  return { ok: true };
}

// getInstance(elementId) — helper baca-saja (test/debug), balik copy
// dangkal metadata instance (BUKAN node DOM asli) atau null kalau belum
// di-create()/sudah di-destroy().
function getInstance(elementId) {
  const inst = _instances.get(elementId);
  if (!inst) return null;
  return { elementId: inst.elementId, options: { ...inst.options }, lastMarkup: inst.lastMarkup };
}

// --- RideMap -------------------------------------------------------

const RideMap = {

DEFAULT_OPTIONS: MAP_DEFAULT_OPTIONS,

// fungsi murni (0 DOM) — diekspos supaya bisa dites/dipakai terisolasi
hasValidCoordinate,
filterValidPoints,
computeBounds,
projectPoint,
projectPoints,
buildPolylineAttr,
buildRouteMarkup,

// lifecycle (DOM-touching, guarded)
create,
update,
clear,
destroy,
getInstance,

};

// pola fix sama persis window.RideUI di ride-ui.js (S525) / seluruh
// modul lain yang kena bug "const tidak otomatis jadi properti window"
// (lihat catatan recurring-bug repo) — tanpa baris ini, data-action
// berbasis "RideMap.*" nanti (begitu wiring HTML-nya dikerjakan sesi
// lain) tidak akan pernah ketemu lewat window.<path>.
if (typeof RideMap !== 'undefined' && typeof window !== 'undefined') window.RideMap = RideMap;
