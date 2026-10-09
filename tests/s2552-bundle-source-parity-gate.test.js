'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { source, shipped } = require('./helpers/bundleSource');

for (const name of ['a', 'b']) {
  test(`S2552 bundle ${name.toUpperCase()}: marker hash cocok dengan source saat ini`, () => {
    assert.ok(source(name).length > 100000);
  });

  test(`S2552 bundle ${name.toUpperCase()}: byte-identik dengan esbuild(source) yang dipin`, (t) => {
    let esbuild;
    try { esbuild = require('esbuild'); } catch { return t.skip('esbuild tidak terpasang; hanya hash yang diperiksa'); }
    const out = esbuild.transformSync(source(name), { minify: true, loader: 'js', target: 'es2019' }).code;
    const s = shipped(name);
    assert.equal(s.slice(s.indexOf('\n') + 1), out, 'bundle terkirim tidak sama dengan hasil minify source');
  });
}
