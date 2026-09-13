const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('S31 photo preview escapes FileReader data URL before placing it in img src', () => {
  const s = fs.readFileSync(path.join(ROOT, 'car-notes.js'), 'utf8');
  assert.match(s, /_photoDraft\.map\(\(src,i\)=>`[^`]*<img src="\$\{escapeHtml\(src\)\}"/);
});

test('S31 bundle A contains the same photo preview escaping', () => {
  const s = fs.readFileSync(path.join(ROOT, 'app-bundle-a.min.js'), 'utf8');
  assert.match(s, /_photoDraft\.map\(\(src,i\)=>`[^`]*<img src="\$\{escapeHtml\(src\)\}"/);
});
