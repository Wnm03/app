const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const {readServisSource}=require('./helpers/carNotesSource');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('S31 photo preview escapes FileReader data URL before placing it in img src', () => {
  const s = readServisSource();
  assert.ok(s.includes('_photoDraft.map((src,i)=>`') && s.includes('<img src="${escapeHtml(src)}"'), 'photo preview must escape FileReader data URL');
});

test('S31 bundle B contains the same photo preview escaping', () => {
  const s = fs.readFileSync(path.join(ROOT, 'app-bundle-b.min.js'), 'utf8');
  assert.ok(s.includes('_photoDraft.map((src,i)=>`') && s.includes('<img src="${escapeHtml(src)}"'), 'photo preview must escape FileReader data URL');
});
