'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const production = fs.readFileSync(path.join(ROOT, 'app_production.html'), 'utf8');

function graphiteBlock() {
  const m = css.match(/\[data-theme="graphite"\]\s*\{([^}]*)\}/);
  assert.ok(m, 'blok tema graphite harus ada');
  return m[1];
}

test('Graphite — palette dasar gelap dan netral abu-abu', () => {
  const b = graphiteBlock();
  assert.match(b, /--bg:#111315/);
  assert.match(b, /--surface2:#1d2024/);
  assert.match(b, /--accent:#d1d5da/);
  assert.match(b, /--accent3:#b8bdc3/);
  assert.match(b, /--accent3:#b8bdc3/);
  assert.match(b, /--money-pos:#b8bdc3/);
});

test('Graphite — tidak memakai hijau untuk status positif/uang masuk', () => {
  const b = graphiteBlock();
  assert.match(b, /--accent3:#b8bdc3/);
  assert.match(b, /--accent3:#b8bdc3/);
  assert.match(b, /--money-pos:#b8bdc3/);
});

test('Graphite — tersedia sebagai opsi tema di index dan production', () => {
  assert.match(index, /data-args='\["graphite"\]' data-t="graphite"/);
  assert.match(production, /data-args='\["graphite"\]' data-t="graphite"/);
  assert.match(index, /Graphite/);
  assert.match(production, /Graphite/);
});

test('Graphite — structural polish mengurangi visual berat tanpa menyentuh tema lain', () => {
  assert.match(css, /\[data-theme="graphite"\] \.card,[\s\S]*?border-radius:16px; box-shadow:var\(--shadow-card\)/);
  assert.match(css, /\[data-theme="graphite"\] \.theme-card,[\s\S]*?box-shadow:none/);
  assert.match(css, /\[data-theme="graphite"\] \.btn-primary \{ box-shadow:0 3px 10px rgba\(0,0,0,0\.20\); \}/);
});
