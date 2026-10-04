const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const release=fs.readFileSync(path.join(root,'scripts/release.sh'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
test('S2426 release path requires a dependency lockfile',()=>{
  assert.match(release,/package-lock\.json/);
  assert.match(release,/npm-shrinkwrap\.json/);
  assert.match(release,/dependency graph release/);
  assert.match(release,/exit 1/);
});
test('S2426 production build still requires real minification',()=>{
  assert.match(pkg.scripts['build:release'],/--require-minify/);
  assert.match(pkg.scripts.build,/--require-minify/);
});
