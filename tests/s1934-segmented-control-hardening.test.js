const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const modals = fs.readFileSync(path.join(ROOT,'modules/shared/modals.js'),'utf8');
const css = fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const helper = fs.readFileSync(path.join(ROOT,'modules/shared/segmented-control.js'),'utf8');

test('S1934 helper exposes one reusable contract without owning business state', () => {
  assert.match(helper,/global\.SegmentedControl\s*=\s*Object\.freeze/);
  assert.match(helper,/mount,\s*sync,\s*scan/);
  assert.doesNotMatch(helper,/render[A-Z]\w*\(/);
  assert.doesNotMatch(helper,/localStorage|indexedDB|fetch\(/);
});

test('S1934 helper is loaded before bundle A in both HTML entry points', () => {
  for (const file of ['index.html','app_production.html']) {
    const s=fs.readFileSync(path.join(ROOT,file),'utf8');
    const helper=s.match(/modules\/shared\/segmented-control\.js\?v=(\d+)/);
    const bundle=s.match(/app-bundle-a\.min\.js\?v=(\d+)/);
    assert.ok(helper&&bundle,file+' helper/bundle script missing');
    assert.equal(helper[1],bundle[1],file+' helper/bundle version mismatch');
    assert.ok(s.indexOf(helper[0])<s.indexOf(bundle[0]),file+' helper must load before bundle A');
  }
});

test('S1934 accessibility contract and keyboard/touch hardening are present', () => {
  assert.match(helper,/aria-selected/);
  assert.match(helper,/aria-pressed/);
  assert.match(helper,/ArrowLeft/);
  assert.match(helper,/ArrowRight/);
  assert.match(helper,/Enter/);
  assert.match(helper,/Space|key !== ' '/);
  assert.match(css,/focus-visible/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('S1934 does not convert long period chips into segmented controls', () => {
  for (const id of ['txListPeriodeChips','periodeChips','shopPeriodeChips','lapPeriodeChips']) {
    const i=html.indexOf(`id="${id}"`); assert.ok(i>=0,id);
    assert.doesNotMatch(html.slice(i-100,i+1200),/segmented-control/);
  }
});

test('S1934 existing data-action controls remain intact', () => {
  for (const token of ['setTxType','setPayMethod','Kasir.setPriceType','Kasir.setViewMode','TitipanExpenseUI.setDirection']) {
    assert.ok((html+'\n'+modals).includes(token), token);
  }
});
