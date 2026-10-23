'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('S2710: no evidence means health score is unknown, not 0/100', () => {
  const src = read('modules/vehicle/vehicle-intelligence.js');
  assert.match(src, /maxScore > 0 \? Math\.round\(\(rawScore \/ maxScore\) \* 100\) : null/);
  assert.match(src, /const scoredRows = rows\.filter\(\(r\) => Number\.isFinite\(r\.healthScore\)\)/);
  assert.match(src, /Skor kesehatan armada belum tersedia karena data perawatan\/BBM belum memadai/);
  assert.match(read('modules/vehicle/vehicle-dashboard.js'), /label: validScore \? 'Skor Kesehatan Armada' : 'Skor Kesehatan Armada · Data Kurang'/);
});

test('S2710: fleet average excludes vehicles without a valid score', () => {
  const src = read('modules/vehicle/vehicle-intelligence.js');
  assert.match(src, /scoredRows\.reduce\(\(s, r\) => s \+ r\.healthScore, 0\) \/ scoredRows\.length/);
  assert.match(src, /healthLabel: hs\.label/);
});

test('S2710: Insight AI breadcrumb does not repeat the page title', () => {
  for (const file of ['index.html', 'app_production.html']) {
    const src = read(file);
    assert.match(src, /<div class="page-breadcrumb"><span class="pb-current" id="cniBreadcrumbSub">Ringkasan<\/span><\/div>/);
    assert.doesNotMatch(src, /<div class="page-breadcrumb">🧠 Insight AI › <span class="pb-current" id="cniBreadcrumbSub">/);
  }
});

test('S2710: built bundles do not render unknown fleet/vehicle health as 0 or null/100', () => {
  const bundles = read('app-bundle-a.min.js') + read('app-bundle-b.min.js');
  assert.ok(bundles.includes('Data Kurang'));
  assert.ok(bundles.includes('belum tersedia karena data perawatan/BBM belum memadai'));
  assert.ok(bundles.includes('skor kesehatan armada belum tersedia (data kurang)'));
  assert.ok(bundles.includes('value:n?`${t}/100`:"\\u2014"'));
  assert.ok(bundles.includes('value:n?`${t}/100`:"\\u2014"')); 
});
