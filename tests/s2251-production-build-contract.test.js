const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const build = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
const releaseGate = fs.readFileSync(path.join(ROOT, 'scripts/verify-release-ready.js'), 'utf8');

assert(pkg.devDependencies && pkg.devDependencies.esbuild,
  'esbuild must remain a devDependency for production builds');
assert(pkg.devDependencies && pkg.devDependencies.eslint,
  'eslint must remain a devDependency for the release gate');
assert.strictEqual(pkg.scripts['build:release'], 'node scripts/build.js --require-minify',
  'build:release must require minification');
assert(/build\.js --require-minify/.test(pkg.scripts['release:preflight']),
  'release:preflight must invoke the minification-required build');
assert(/buildRequireMinify/.test(build) && /if \(buildRequireMinify && \(!resA\.minified \|\| !resB\.minified\)\)/.test(build),
  'build.js must hard-stop a required-minification build when either bundle is unminified');
assert(/UNMINIFIED_MARKER/.test(releaseGate) && /unminified/.test(releaseGate),
  'release gate must retain an explicit unminified-artifact check');
assert(/blocking\.push\('minify \(unminified, belum di-override\)'\)/.test(releaseGate),
  'unminified bundles must block release unless explicitly overridden');

console.log('S2251 production-build reproducibility contract: PASS');
