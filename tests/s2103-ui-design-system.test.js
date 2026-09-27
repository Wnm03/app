const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'modern-ui-layer.css'), 'utf8');
const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const production = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');

test('S2103 uses existing UI tokens and no new dependency', () => {
  assert.match(css, /S2103 — neutral UI design system primitives/);
  assert.match(css, /var\(--surface3\)/);
  assert.match(css, /var\(--border\)/);
  assert.doesNotMatch(css, /@import\s+url\(/i);
  assert.doesNotMatch(css, /https?:\/\//i);
});

test('S2103 establishes a shared icon rhythm for existing icon components', () => {
  assert.match(css, /\.ui-icon,[\s\S]*\.empty-icon\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.dashhub-cat-icon,[\s\S]*\.empty-icon\s*\{[\s\S]*display:\s*inline-flex/);
  assert.match(css, /--ui-icon-size:\s*40px/);
  assert.match(css, /@media \(max-width: 360px\)/);
});

test('S2103 keeps touch controls at usable minimum size', () => {
  assert.match(css, /--ui-control-min:\s*44px/);
  assert.match(css, /\.btn\s*\{[^}]*min-height:\s*var\(--ui-control-min\)/);
});

test('S2103 is presentation-only and leaves runtime entry points unchanged', () => {
  assert.match(index, /modern-ui-layer\.css\?v=/);
  assert.match(production, /modern-ui-layer\.css\?v=/);
  assert.match(styles, /\.modal-close/);
  assert.doesNotMatch(css, /data-action=/);
  assert.doesNotMatch(css, /localStorage\.|indexedDB|addEventListener\(/);
});
