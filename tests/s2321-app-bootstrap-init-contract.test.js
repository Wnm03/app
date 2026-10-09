const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('S2321 app bootstrap calls eager runtime facade, not lazy self-test init()', () => {
  const boot = read('app-bootstrap.js');
  assert.match(boot, /__kwInitRuntime/);
  assert.match(boot, /__kwBootPromise=typeof __kwInitRuntime==='function'\?__kwInitRuntime\(\)/);
  assert.doesNotMatch(boot, /Promise\.resolve\(init\(\)\)/);
});

test('S2321 rebuilt bundle contains the runtime bootstrap call and not the stale init() call', () => {
  const bundle = require('./helpers/bundleSource').source('b');
  assert.match(bundle, /__kwInitRuntime==='function'\?__kwInitRuntime\(\)/);
  assert.doesNotMatch(bundle, /Promise\.resolve\(init\(\)\)/);
});

test('S2321 self-test remains lazy and is not required for production boot', () => {
  const build = read('scripts/build.js');
  const group = (build.match(/const GROUP_B = \[(.*?)\n\];/s) || [])[1] || '';
  assert.doesNotMatch(group, /['"]self-test\.js['"]/);
  assert.match(read('modules/shared/app-init-runtime.js'), /async function __kwInitRuntime\(\)/);
});
