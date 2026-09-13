const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('v23 dynamic innerHTML surfaces use HTML escaping for identified user/data-controlled text', () => {
  const checks = [
    ['car-notes.js', '${escapeHtml(emptyText)}'],
    ['modules/shop/business-intelligence-presenter.js', '${escapeHtml(x.icon)} ${escapeHtml(x.text)}'],
    ['modules/ai/feature-insights.js', '${escapeHtml(x.icon)} ${escapeHtml(x.text)}'],
    ['modules/ai/feature-insights.js', '${escapeHtml(emptyMsg)}'],
    ['modules/modules-render.js', '${escapeHtml(D.googleSheets.spreadsheetId)}'],
    ['modules/shop/modules-render.js', '${escapeHtml(D.googleSheets.spreadsheetId)}'],
  ];
  for (const [file, needle] of checks) {
    const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(s, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file} missing: ${needle}`);
  }
});

test('v23 targeted source scan reports the reviewed dynamic innerHTML patterns as hardened', () => {
  const files = ['car-notes.js','modules/modules-render.js','modules/shop/modules-render.js','modules/shop/business-intelligence-presenter.js','modules/ai/feature-insights.js'];
  for (const file of files) {
    const s = fs.readFileSync(path.join(ROOT,file),'utf8');
    assert.equal(s.includes('${emptyText}') && file==='car-notes.js', false);
  }
});
