'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
const groups = {};
for (const name of ['GROUP_A', 'GROUP_B']) {
  const m = build.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  assert.ok(m, `missing ${name} in build.js`);
  groups[name] = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

test('build groups contain no duplicate source path across bundles', () => {
  const all = [...groups.GROUP_A, ...groups.GROUP_B];
  const duplicates = all.filter((file, i) => all.indexOf(file) !== i);
  assert.deepEqual(duplicates, [], `duplicate source paths: ${duplicates.join(', ')}`);
});

test('every declared bundle source exists on disk', () => {
  for (const [group, files] of Object.entries(groups)) {
    for (const file of files) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `${group} references missing source: ${file}`);
    }
  }
});

test('Servis split remains in dependency order', () => {
  assert.ok(groups.GROUP_A.includes('car-notes.js'));
  assert.ok(groups.GROUP_B.includes('modules/vehicle/servis-checklist.js'));
  assert.ok(groups.GROUP_B.includes('modules/vehicle/service-input-catalog.js'));
  assert.ok(groups.GROUP_B.includes('modules/vehicle/servis.js'));
  assert.ok(groups.GROUP_B.indexOf('modules/vehicle/servis-checklist.js') < groups.GROUP_B.indexOf('modules/vehicle/servis.js'));
  assert.ok(groups.GROUP_B.indexOf('modules/vehicle/service-input-catalog.js') < groups.GROUP_B.indexOf('modules/vehicle/servis.js'));
});
