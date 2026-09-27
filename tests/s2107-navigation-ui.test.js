const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

test('S2107 nav keeps mobile touch targets at least 44px', () => {
  assert.match(css, /\.nav-item\s*\{[\s\S]*?min-width:\s*44px/);
  assert.match(css, /\.nav-fab\s*\{[\s\S]*?min-width:\s*44px/);
  assert.match(css, /\.keu-fab-action\s*\{[\s\S]*?min-height:\s*44px/);
});

test('S2107 nav avoids horizontal scrollbar chrome while preserving overflow behavior', () => {
  assert.match(css, /\.nav\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.nav::-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/);
});

test('S2107 nav handles safe-area insets on mobile', () => {
  assert.match(css, /env\(safe-area-inset-left,\s*0px\)/);
  assert.match(css, /env\(safe-area-inset-right,\s*0px\)/);
  assert.match(css, /env\(safe-area-inset-bottom,\s*0px\)/);
});

test('S2107 nav label overflow is scoped and does not alter transaction title rules', () => {
  assert.match(css, /\.nav-item\s*>\s*(?:span|\.nav-label)/);
  const s2107Start = css.lastIndexOf('S2107');
  const nextMarkers = ['S2108','S2109','S2110','S2111','S2112','S2113','S2114','S2115','S2116','S2117']
    .map(marker => css.indexOf(marker, s2107Start + 5))
    .filter(index => index >= 0);
  const nextStart = nextMarkers.length ? Math.min(...nextMarkers) : css.length;
  const s2107 = css.slice(s2107Start, nextStart);
  assert.doesNotMatch(s2107, /\.tx-name\b/);
});
