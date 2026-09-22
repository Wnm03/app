const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('S27: FeatureInsightUI escapes icon/text/empty message before innerHTML', () => {
  const s = fs.readFileSync(path.join(ROOT, 'modules/ai/feature-insights.js'), 'utf8');
  // text/emptyMsg go through safeInsightText(), which escapes everything via
  // escapeHtml() and then selectively restores only the app's own intentional
  // <b>...</b> bold tokens (see S1929) -- still a single escape pass over any
  // user/data-controlled content, never raw interpolation.
  assert.match(s, /const safeInsightText=\(value\)=>\{const escaped=escapeHtml\(value\);/);
  assert.match(s, /\$\{escapeHtml\(x\.icon\)\} \$\{safeInsightText\(x\.text\)\}/);
  assert.match(s, /\$\{safeInsightText\(emptyMsg\)\}/);
  assert.doesNotMatch(s, /\$\{x\.icon\} \$\{x\.text\}/);
});

test('S27: Business Intelligence escapes insight text in both card and drill-down surfaces', () => {
  const s = fs.readFileSync(path.join(ROOT, 'modules/shop/business-intelligence-presenter.js'), 'utf8');
  const hardened = /\$\{escapeHtml\(x\.icon\)\} \$\{escapeHtml\(x\.text\)\}/g;
  assert.equal((s.match(hardened) || []).length, 2);
  assert.doesNotMatch(s, /\$\{x\.icon\} \$\{x\.text\}/);
});

test('S27: reviewed insight HTML surfaces remain single-render points', () => {
  const feature = fs.readFileSync(path.join(ROOT, 'modules/ai/feature-insights.js'), 'utf8');
  const bi = fs.readFileSync(path.join(ROOT, 'modules/shop/business-intelligence-presenter.js'), 'utf8');
  assert.ok(feature.includes('box.innerHTML=items.length?'));
  assert.ok(bi.includes('el.innerHTML = items.map((x) =>'));
  assert.ok(bi.includes('const html = items.map((x) =>'));
});
