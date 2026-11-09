'use strict';
// Fase 5A (S2768) — dropdown tema onboarding hanya menawarkan tema kanonik (tanpa alias palsu ocean/stone/slate).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
for (const f of ['index.html', 'app_production.html']) {
  test(`S2768: ${f} onboarding menawarkan hanya tema kanonik`, () => {
    const sel = read(f).split('id="ob_tema"')[1].split('</select>')[0];
    const vals = [...sel.matchAll(/value="([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(vals, ['dark', 'light', 'auto', 'graphite', 'modern']);
  });
}
