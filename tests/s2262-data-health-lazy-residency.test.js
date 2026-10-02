const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const build = fs.readFileSync('scripts/build.js','utf8');
const loader = fs.readFileSync('modules/shared/feature-lazy-loader.js','utf8');
const security = fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const health = fs.readFileSync('data-health-check.js','utf8');

function groupB(){
  const m = build.match(/const GROUP_B = \[(.*?)\];/s);
  assert.ok(m);
  return [...m[1].matchAll(/['\"]([^'\"]+\.js)['\"]/g)].map(x=>x[1]);
}

test('S2262: data-health-check.js removed from eager GROUP_B',()=>{
  assert.equal(groupB().includes('data-health-check.js'),false);
});

test('S2262: lazy loader exposes ensureDataHealthScripts with dedup/retry',()=>{
  assert.match(loader,/const DATA_HEALTH_FEATURE_SCRIPTS = \[\s*'data-health-check\.js'/);
  assert.match(loader,/function ensureDataHealthScripts\(\)/);
  assert.match(loader,/window\.ensureDataHealthScripts = ensureDataHealthScripts/);
  assert.match(loader,/_dataHealthFeatureLoadPromise = null/);
  assert.match(loader,/_dataHealthFeatureLoadPromise = null;\s*throw err;/s);
});

test('S2262: data-action dispatcher retries direct runDataHealthCheck/DataHealth lazily',()=>{
  assert.match(security,/runDataHealthCheck: typeof ensureDataHealthScripts==='function'\?ensureDataHealthScripts:null/);
  assert.match(security,/DataHealth: typeof ensureDataHealthScripts==='function'\?ensureDataHealthScripts:null/);
});

test('S2262: diagnostic module remains global API after load',()=>{
  assert.match(health,/function runDataHealthCheck\(\)/);
  assert.match(health,/const DataHealth=\{/);
  assert.match(health,/window\.DataHealth = DataHealth/);
});

test('S2262: build no longer embeds data-health-check eagerly',()=>{
  assert.equal((build.match(/['\"]data-health-check\.js['\"]/g)||[]).length,0);
  assert.match(loader,/['\"]data-health-check\.js['\"]/);
});

test('S2262: loader syntax is valid',()=>{
  new vm.Script(loader);
  new vm.Script(security);
});
