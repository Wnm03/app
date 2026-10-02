'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../modules/shared/modules-render-b.js'), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = source.indexOf('\n}', start);
  assert.notEqual(end, -1, `${name} must close`);
  return source.slice(start, end + 2);
}
function element(initialHtml = '', initialValue = '') {
  let html = initialHtml;
  return {
    value: initialValue,
    writes: 0,
    get innerHTML() { return html; },
    set innerHTML(value) { this.writes++; html = value; },
  };
}
function harness(fnName, el, extra = {}) {
  const context = {
    document: { getElementById: () => el },
    D: { vehicles: [{ id: 'v1', emoji: '🏍️', name: 'Motor A' }] },
    curVehicleId: 'v1',
    escapeHtml: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    renderVehicleSpecCard: () => { context.specRenders = (context.specRenders || 0) + 1; },
    ...extra,
  };
  vm.runInNewContext(functionSource(fnName), context);
  vm.runInNewContext(`${fnName}()`, context);
  return context;
}

test('S2332 renderVehicleSelect does not replace identical chip DOM', () => {
  const html = '<div class="vehicle-chip active" data-action="selectVehicle" data-args="[&quot;v1&quot;]">🏍️ Motor A</div>';
  const el = element(html);
  const ctx = harness('renderVehicleSelect', el);
  assert.equal(el.writes, 0);
  assert.equal(ctx.specRenders, 1, 'existing vehicle spec renderer still runs');
});

test('S2332 renderCarImportVehicleSelect preserves option nodes when catalogue is unchanged', () => {
  const html = '<option value="v1">🏍️ Motor A</option>';
  const el = element(html, 'v1');
  harness('renderCarImportVehicleSelect', el);
  assert.equal(el.writes, 0);
  assert.equal(el.value, 'v1');
});

test('S2332 renderCarImportVehicleSelect updates options when catalogue changes', () => {
  const el = element('<option value="v1">🏍️ Motor A</option>', 'v1');
  const ctx = {
    document: { getElementById: () => el },
    D: { vehicles: [{ id: 'v1', emoji: '🏍️', name: 'Motor B' }] },
    curVehicleId: 'v1',
    escapeHtml: value => String(value),
  };
  vm.runInNewContext(functionSource('renderCarImportVehicleSelect'), ctx);
  vm.runInNewContext('renderCarImportVehicleSelect()', ctx);
  assert.equal(el.writes, 1);
  assert.match(el.innerHTML, /Motor B/);
});

test('S2332 renderVehicleSelect still updates the active chip when selected vehicle changes', () => {
  const el = element('');
  const ctx = {
    document: { getElementById: () => el },
    D: { vehicles: [
      { id: 'v1', emoji: '🏍️', name: 'Motor A' },
      { id: 'v2', emoji: '🚗', name: 'Mobil B' },
    ] },
    curVehicleId: 'v2',
    escapeHtml: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    renderVehicleSpecCard: () => {},
  };
  vm.runInNewContext(functionSource('renderVehicleSelect'), ctx);
  vm.runInNewContext('renderVehicleSelect()', ctx);
  assert.match(el.innerHTML, /vehicle-chip active[^>]*data-args="\[&quot;v2&quot;\]"/);
  assert.match(el.innerHTML, /Mobil B/);
});
