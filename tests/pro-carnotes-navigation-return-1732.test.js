const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(ROOT, 'modules/vehicle/vehicle-core.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'pro-ui-layer.css'), 'utf8');

function carNotesSection(html) {
  const start = html.indexOf('<div class="page pro-vehicle-page" id="page-carnotes">');
  const end = html.indexOf('<div class="page" id="page-settings">', start);
  assert.ok(start >= 0 && end > start, 'Car Notes page boundary must exist');
  return html.slice(start, end);
}

test('Car Notes Pro exposes an explicit route back to the app-wide feature navbar', () => {
  const cn = carNotesSection(index);
  assert.match(cn, /data-action="proReturnToMainNav"/);
  assert.match(cn, /aria-label="Kembali ke aplikasi utama">← Aplikasi Utama/);
  assert.match(core, /function proReturnToMainNav\(\)/);
  assert.match(core, /showPage\('dashboard-hub'\)/);
  assert.match(css, /pro-main-nav-back/);
});

test('every static Car Notes Pro button has an interaction contract', () => {
  const cn = carNotesSection(index);
  const re = /<button\b([^>]*)>/g;
  let m;
  const dead = [];
  while ((m = re.exec(cn))) {
    const attrs = m[1];
    if (!/\bdata-(?:action|pro-goto|pro-vehicle)\s*=/.test(attrs)) dead.push(attrs.trim());
  }
  assert.deepEqual(dead, [], 'Found static Car Notes buttons without data-action/data-pro-goto/data-pro-vehicle');
});

test('mockup secondary controls are wired instead of inert placeholders', () => {
  const cn = carNotesSection(index);
  assert.match(cn, /data-action="openGlobalSearch"[^>]*aria-label="Cari"/);
  assert.match(cn, /data-action="proOpenNotifications"[^>]*aria-label="Notifikasi"/);
  assert.match(cn, /data-action="proMockupActivateGroup"/);
  assert.match(cn, /data-action="proMockupMapUnavailable"/);
  assert.match(core, /function proMockupActivateGroup\(el\)/);
  assert.match(core, /function proMockupMapUnavailable\(\)/);
});
