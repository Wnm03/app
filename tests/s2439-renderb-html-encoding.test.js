const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'modules/shared/modules-render-b.js'), 'utf8');

test('S2439: Google Sheets spreadsheetId is HTML-encoded before entering href', () => {
  assert.match(
    src,
    /href="https:\/\/docs\.google\.com\/spreadsheets\/d\/\$\{escapeHtml\(D\.googleSheets\.spreadsheetId\)\}"/
  );
  assert.doesNotMatch(
    src,
    /href="https:\/\/docs\.google\.com\/spreadsheets\/d\/\$\{D\.googleSheets\.spreadsheetId\}"/
  );
});

test('S2439: persisted/user-controlled emoji fields are HTML-encoded in render-b vehicle/target sinks', () => {
  assert.match(src, /\$\{escapeHtml\(t\.emoji\)\}/);
  assert.equal((src.match(/\$\{escapeHtml\(v\.emoji\)\}/g) || []).length >= 4, true);
  assert.doesNotMatch(src, /\$\{v\.emoji\} \$\{escapeHtml\(v\.name\)\}/);
  assert.doesNotMatch(src, /\$\{t\.emoji\} \$\{escapeHtml\(t\.name\)\}/);
});
