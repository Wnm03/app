'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = rd('modules/shared/a11y-expanded-toggles.js');
function node(id, hidden) {
  const attrs = {}, cls = new Set(hidden ? ['u-dnone'] : []);
  return { id, attrs, cls, classList: { contains: (c) => cls.has(c), toggle: (c, f) => { f ? cls.add(c) : cls.delete(c); }, add: (c) => cls.add(c), remove: (c) => cls.delete(c) },
    getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); } };
}
function setup(ids) {
  const els = {}; ids.forEach((i) => { els[i + 'Toggle'] = node(i + 'Toggle'); els[i + 'Panel'] = node(i + 'Panel', true); });
  const mos = []; class MO { constructor(cb) { this.cb = cb; this.o = []; mos.push(this); } observe(t, o) { this.o.push([t, o]); } }
  const document = { getElementById: (id) => els[id] || null };
  const sync = new Function('document', 'MutationObserver', src + ';return _a11yExpandedTogglesSync;')(document, MO);
  return { els, mos, sync };
}
const IDS = ['dashCashProjSettings', 'cashflowProjSettings'];
test('S256AK: closed panel -> aria-expanded false + aria-controls', () => {
  const { els, sync } = setup(IDS); assert.ok(sync() > 0);
  IDS.forEach((i) => { assert.strictEqual(els[i + 'Toggle'].attrs['aria-expanded'], 'false'); assert.strictEqual(els[i + 'Toggle'].attrs['aria-controls'], i + 'Panel'); });
});
test('S256AK: panel class toggle mirrored by the class-only observer; idempotent; never writes class', () => {
  const { els, mos, sync } = setup(IDS); sync(); assert.strictEqual(sync(), 0);
  assert.strictEqual(mos.length, 1); mos[0].o.forEach((x) => { assert.deepStrictEqual(x[1], { attributes: true, attributeFilter: ['class'] }); });
  els.cashflowProjSettingsPanel.classList.toggle('u-dnone', false); mos[0].cb([{ target: els.cashflowProjSettingsPanel }]);
  assert.strictEqual(els.cashflowProjSettingsToggle.attrs['aria-expanded'], 'true');
  assert.strictEqual(els.dashCashProjSettingsToggle.attrs['aria-expanded'], 'false');
  assert.ok(!/classList\.(add|remove|toggle)\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
});
test('S256AK: absent elements -> 0, no observer', () => {
  const { mos, sync } = setup([]); assert.strictEqual(sync(), 0); assert.strictEqual(mos.length, 0);
});
test('S256AK: ids/classes match real toggles; hooks and single registration', () => {
  assert.ok(rd('modules/shared/modules-render.js').includes("'dashCashProjSettingsToggle'") && rd('modules/shared/modules-render.js').includes("'dashCashProjSettingsPanel'"));
  const p = rd('modules/finance/cashflow-projection-presenter.js'); assert.ok(p.includes("'cashflowProjSettingsToggle'") && p.includes("'cashflowProjSettingsPanel'"));
  assert.strictEqual((rd('modules/shared/a11y-action-controls.js').match(/_a11yExpandedTogglesSync/g) || []).length, 4);
  assert.strictEqual((rd('scripts/build.js').match(/a11y-expanded-toggles\.js/g) || []).length, 1);
});
