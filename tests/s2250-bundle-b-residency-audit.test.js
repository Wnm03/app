const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const build = fs.readFileSync(path.join(ROOT, 'scripts', 'build.js'), 'utf8');
const m = build.match(/const GROUP_B = \[(.*?)\n\];\nconst ALL_SOURCE/s);
assert(m, 'GROUP_B must remain discoverable in build.js');
const entries = [...m[1].matchAll(/['"]([^'"]+\.js)['"]/g)].map(x => x[1]);
assert(entries.length >= 300, `Unexpected GROUP_B shrinkage: ${entries.length}`);
assert(entries.every(rel => fs.existsSync(path.join(ROOT, rel))), 'Every GROUP_B source must exist');

// Existing safe lazy-load exclusions must stay outside GROUP_B.
for (const rel of [
  'modules/home/renovasi.js',
  'modules/business/sewakios.js',
  'modules/shop/business-intelligence-presenter.js',
]) assert(!entries.includes(rel), `${rel} must remain lazy-loaded, not bundled in GROUP_B`);

// Release configuration must require minification; S2250 must not solve a size
// problem by silently shipping raw concatenated source.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
assert(/build\.js --require-minify/.test(pkg.scripts['build:release']), 'build:release must require minification');
assert(/verify-release-ready\.js/.test(pkg.scripts['release:preflight']), 'release preflight must verify the final artifact');

console.log(`S2250 Bundle-B residency contract: PASS (${entries.length} GROUP_B entries)`);
