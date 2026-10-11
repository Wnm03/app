'use strict';
// tests/grad-accent-token-scope.test.js — Regression: token gradient yang memakai var(--accent*)
// tidak boleh didefinisikan di :root (accent hanya ada di [data-theme]), kalau tidak token jadi
// kosong dan .btn-primary / .nav-fab-icon tampil tanpa latar di semua tema.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function blocks(selectorRe) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) if (selectorRe.test(m[1].trim())) out.push(m[2]);
  return out;
}

test('token --grad-accent* tidak didefinisikan di blok :root', () => {
  for (const body of blocks(/^:root$/)) {
    assert.doesNotMatch(body, /--grad-accent(-diag)?\s*:/, 'token gradient bergantung --accent -> harus di scope [data-theme]');
  }
});

test('--grad-accent dan --grad-accent-diag didefinisikan di scope [data-theme] generik', () => {
  const hit = blocks(/^\[data-theme\]$/).join('\n');
  assert.match(hit, /--grad-accent\s*:\s*linear-gradient\([^;]*var\(--accent\)/);
  assert.match(hit, /--grad-accent-diag\s*:\s*linear-gradient\([^;]*var\(--accent\)/);
});

test('semua pemakai var(--grad-accent*) punya definisi yang bisa di-resolve dari body[data-theme]', () => {
  assert.ok(/var\(--grad-accent-diag\)/.test(css));
  assert.ok(/\.btn-primary\s*\{[^}]*var\(--grad-accent-diag\)/.test(css));
});
