'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('Car Notes Theme Pro rollback: no Pro UI layer, mockup presenter, or Pro routing remains active', () => {
  const index = read('index.html');
  const core = read('modules/vehicle/vehicle-core.js');
  const renderB = read('modules/shared/modules-render-b.js');
  const sw = read('sw.js');
  const build = read('scripts/build.js');

  assert.equal(fs.existsSync(path.join(ROOT, 'pro-ui-layer.css')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'modules/vehicle/pro-mockup-presenter.js')), false);

  for (const source of [index, core, renderB, sw, build]) {
    assert.doesNotMatch(source, /proMockup(?:Init|SetScreen|PushHistory|ActivateGroup)|proMock(?:Screen|BottomNav)|proOpenHistoryTab|renderProHome|proCnBottomNav|pro-ui-layer|proReturnToMainNav/i);
    assert.doesNotMatch(source, /\[data-theme=["']pro["']\]/i);
  }

  const page = index.slice(index.indexOf('<div class="page" id="page-carnotes">'), index.indexOf('<!-- PAJAK & ZAKAT -->'));
  assert.match(page, /id="page-carnotes"/);
  assert.match(page, /id="vehicleSelect"/);
  assert.match(page, /id="cnTab-insight"/);
  assert.match(page, /id="cnTab-bbm"/);
  assert.match(page, /id="cnTab-servis"/);
  assert.match(page, /id="cnTab-pajak"/);
  assert.doesNotMatch(page, /pro-[\w-]+|proMock|proCnBottomNav/i);
});

test('Car Notes rollback preserves canonical Servis business logic and current performance wiring', () => {
  const core = read('modules/vehicle/vehicle-core.js');
  const servis = read('modules/vehicle/servis.js');
  const renderB = read('modules/shared/modules-render-b.js');

  assert.match(core, /function setCnTab\(/);
  assert.match(core, /function getVehicleKm\(/);
  assert.match(servis, /const Servis\s*=|let Servis\s*=|var Servis\s*=/);
  const servisCode = servis
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((servisCode.match(/(?:const|let|var)\s+Servis\s*=/g) || []).length, 1);
  assert.match(renderB, /Servis\.renderReminder\(\)/);
  assert.match(renderB, /renderServisList\(\)/);
  assert.match(renderB, /FuelCard\.render\(\)/);
});
