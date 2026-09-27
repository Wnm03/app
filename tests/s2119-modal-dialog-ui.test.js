const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('S2119 — modal families contain mobile scroll and overscroll', () => {
  assert.match(css, /\.modal, \.calc-modal, \.qs-modal[\s\S]*?overscroll-behavior:\s*contain;/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch;/);
});

test('S2119 — modal title and form content cannot force horizontal overflow', () => {
  assert.match(css, /\.modal-title\s*\{\s*min-width:\s*0;/);
  assert.match(css, /\.modal-title > :first-child[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.modal > form, \.modal > \.form, \.modal > \.form-grid/);
});

test('S2119 — modal controls remain contained within viewport', () => {
  assert.match(css, /\.modal button, \.modal input, \.modal select, \.modal textarea,[\s\S]*?max-width:\s*100%;/);
});

test('S2119 — narrow modal uses dynamic viewport height and safe-area padding', () => {
  assert.match(css, /@media \(max-width:\s*599px\)[\s\S]*?max-height:\s*min\(90dvh, 90vh\);/);
  assert.match(css, /padding-bottom:\s*calc\(24px \+ env\(safe-area-inset-bottom, 0px\)\);/);
});
