const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'pro-ui-layer.css'), 'utf8');
const carNotes = fs.readFileSync(path.join(root, 'car-notes.js'), 'utf8');
const servis = fs.readFileSync(path.join(root, 'modules/vehicle/servis.js'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app_production.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const requiredSurfaces = [
  '.pro-vehicle-page',
  '.pro-vehicle-hero',
  '.pro-odometer-card',
  '.pro-servis-screen',
  '.pro-reminder-card',
  '.pro-service-stats',
  '.pro-history-card',
  '#servisModal',
  '#servisEditTabs',
  '#servisServiceCategoryPanel',
  '#servisMasterCategoryChips',
  '#servisChecklistPanel',
  '#servisReminderCard',
  '.servis-history-session',
  '.servis-history-item',
  '#fuelIntelWrap',
  '#fuelIntelBody',
  '#cnTab-jalan',
  '.ride-map-svg',
  '.ride-map-route'
];

test('M9 static visual gate: mockup surfaces and geometry contracts exist', () => {
  for (const selector of requiredSurfaces) assert.match(css, new RegExp(selector.replace(/[.#]/g, '\\$&')));
  assert.match(css, /border-radius:\s*(1[4-9]|[2-9]\d)px/);
  assert.match(css, /min-height:\s*4[4-9]px/);
  assert.match(css, /max-width:\s*760px/);
  assert.match(css, /@media\s*\(max-width:420px\)/);
  assert.match(css, /@media\s*\(max-width:760px\)/);
});

test('M5 responsive gate: mobile controls and overflow protections remain present', () => {
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /white-space:\s*nowrap/);
});

test('M6 performance gate: long-list containment/lazy rendering remains CSS-only', () => {
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /contain:\s*content/);
  assert.match(servis, /loading="lazy"/);
  assert.match(servis, /decoding="async"/);
  assert.doesNotMatch(css, /<script|@import\s+url\(/i);
});

test('M7 regression firewall: Servis SoT and build group integrity remain intact', () => {
  assert.equal((servis.match(/^const\s+Servis\s*=\s*\{/gm) || []).length, 1);
  assert.equal((carNotes.match(/^const\s+Servis\s*=\s*\{/gm) || []).length, 0);
  const groupB = build.match(/GROUP_B[\s\S]*?(?=GROUP_C|GROUP_D|\];)/)?.[0] || '';
  assert.match(groupB, /modules\/vehicle\/servis-checklist\.js/);
  assert.match(groupB, /modules\/vehicle\/service-input-catalog\.js/);
  assert.match(groupB, /modules\/vehicle\/servis\.js/);
});

test('M8 cache/build wiring: Pro UI is shipped and version markers are synchronized', () => {
  // FIX (1725): versi cache-buster ikut naik tiap sesi lanjutan (1713 -> ...
  // -> 1725). Gate ini ngecek pola PENOMORAN-nya konsisten (html & sw.js
  // sinkron di versi TERBARU yang sama), bukan angka statis 1713 yg jadi
  // basi begitu ada sesi lanjutan. Lihat AUDIT-APP-MAIN13-MOCKUP-FIDELITY-
  // COMPLETION-1724.md dan SESSION-NOTE fix setCnTab (1725).
  assert.match(html, /pro-ui-layer\.css\?v=1725/);
  assert.match(sw, /kw-cache-v1725/);
  assert.match(sw, /pro-ui-layer\.css/);
});
