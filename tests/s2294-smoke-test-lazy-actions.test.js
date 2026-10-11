'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const smoke = fs.readFileSync('modules/shared/smoke-test.js', 'utf8');
const dispatcher = fs.readFileSync('modules/shared/features-helpers-global-security.js', 'utf8');

test('S2294 smoke-test recognizes registered lazy action owners', () => {
  assert.match(smoke, /function extractLazyOwnerNames\(src\)/);
  assert.match(smoke, /property keys are kept/);
  assert.match(smoke, /typeof\\s\+ensure/);
  assert.match(smoke, /checkDataActionPaths\(pathsMap, lazyOwners\)/);
  assert.match(smoke, /result\.actionDeferred = actionCheck\.deferred/);
  assert.match(smoke, /Aksi lazy-load ditunda pemeriksaannya sampai modul terkait dibuka/);
});

test('S2294 lazy owner registry remains connected to real lazy loaders', () => {
  assert.match(dispatcher, /const lazyOwnerLoaders=\{/);
  for (const owner of ['Renov', 'SewaKios', 'runSelfTest', 'HondaPdfImportUI', 'ShopPdfImportUI']) {
    assert.match(dispatcher, new RegExp('\\b' + owner + '\\s*:'));
  }
});

test('S2294 smoke-test still reports non-lazy missing actions as errors', () => {
  assert.match(smoke, /if \(!ok \|\| typeof fn !== 'function'\) missing\.push\(full\)/);
  assert.match(smoke, /result\.actionMissing = actionCheck\.missing/);
});

test('S2294 lazy-owner extraction survives minified production bundle', () => {
  const bundle = fs.readFileSync('app-bundle-b.min.js', 'utf8');
  const re = /(?:^|[,\s{])([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*typeof\s+ensure[A-Za-z0-9_$]*/g;
  const owners = new Set([...bundle.matchAll(re)].map((m) => m[1]));
  for (const owner of ['Renov', 'SewaKios', 'runSelfTest', 'HondaPdfImportUI', 'ShopPdfImportUI']) {
    assert.ok(owners.has(owner), `minified bundle must preserve lazy owner key ${owner}`);
  }
});
