const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'minimal-ui-theme.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const prod = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');

test('minimal theme CSS tersedia dan scoped ke data-theme=minimal', () => {
  assert.match(css, /\[data-theme="minimal"\]/);
  assert.match(css, /--bg:#eef1f4/);
  assert.match(css, /--accent:#607487/);
  assert.match(css, /--accent3:#687985/);
});

test('minimal theme tidak memakai hijau/teal sebagai warna positif', () => {
  assert.match(css, /--accent3:#687985/);
  assert.match(css, /\.green,\s*\n?\[data-theme="minimal"\] \.orange \{ color:var\(--accent3\)!important; \}/);
});

test('index.html mendaftarkan tema Minimal tanpa mengubah tema lama', () => {
  assert.match(index, /data-args='\["minimal"\]' data-t="minimal"/);
  assert.match(index, /data-args='\["modern"\]' data-t="modern"/);
  assert.match(index, /minimal-ui-theme\.css\?v=1/);
});

test('app_production.html memuat tema Minimal yang sama', () => {
  assert.match(prod, /data-args='\["minimal"\]' data-t="minimal"/);
  assert.match(prod, /minimal-ui-theme\.css\?v=1/);
});

test('komponen utama mockup memiliki override: card, tab, hero, nav', () => {
  for (const selector of ['\.card', '\.cn-tab', '\.dashhub-hero', '\.nav', '\.nav-item']) {
    assert.match(css, new RegExp(`\\[data-theme="minimal"\\][^\\n]*${selector.replace('.', '\\.')}`));
  }
});
