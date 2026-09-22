'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('S1920 dashboard mobile: canonical primary blocks have stale-hide self-heal', () => {
  const src = read('modules/dashboard-hub/dashboard-hub.js');
  assert.match(src, /S1920 — Mobile dashboard shell integrity/);
  assert.match(src, /\['dashHubHeroCard', 'dashHubQuickActions'\]\.forEach/);
  assert.match(src, /primary\.classList\.remove\('u-dnone'\)/);
  assert.match(src, /primary\.style\.removeProperty\('display'\)/);
});

test('S1920 dashboard mobile: narrow quick-actions use a readable 3-column grid', () => {
  const css = read('styles.css');
  assert.match(css, /@media\(max-width:380px\)\{[\s\S]*?#page-dashboard-hub \.dashhub-qa-row\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /#page-dashboard-hub \.dashhub-qa-btn\{[\s\S]*?min-height:58px/);
});

test('S1920 settings: seven split-tabs remain available and mobile rail is sticky', () => {
  const html = read('index.html');
  const expected = [
    'profil', 'keuangan', 'pengingat', 'notifbackup',
    'keamanan', 'kepemilikan', 'diagnostik',
  ];
  for (const tab of expected) {
    assert.match(html, new RegExp(`data-tab="${tab}"`), `missing settings tab ${tab}`);
  }
  const css = read('styles.css');
  assert.match(css, /#page-settings > \.cn-tabs\{[\s\S]*?position:sticky/);
  assert.match(css, /#page-settings > \.cn-tabs \.cn-tab\{[\s\S]*?min-height:44px/);
});

test('S1920 settings search: moved vehicle/dashboard settings are discoverable', () => {
  const src = read('modules/shared/pengaturan-search.js');
  assert.match(src, /Kendaraan, BBM, Servis, Pajak & SIM/);
  assert.match(src, /page:'carnotes'/);
  assert.match(src, /Dashboard Hub \/ Beranda/);
  assert.match(src, /page:'dashboard-hub'/);
});

test('S1920 Car Notes: primary mobile action is full-width, secondary actions stay paired', () => {
  const css = read('pwa-ui-layer.css');
  assert.match(css, /pwa-domain-car \.pwa-domain-hero-actions\{[\s\S]*?grid-template-columns:repeat\(2,1fr\)/);
  assert.match(css, /pwa-domain-car \.pwa-action-card:first-child\{[\s\S]*?grid-column:1\/-1/);
});
