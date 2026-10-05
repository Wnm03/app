const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(ROOT,'styles.css'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const tema=fs.readFileSync(path.join(ROOT,'modules/shared/format-tema.js'),'utf8');
test('S2517: Minimal retired and migrated to Modern',()=>{
 assert.doesNotMatch(index,/data-t="minimal"/);
 assert.match(tema,/minimal:'modern'/);
 assert.doesNotMatch(css,/\[data-theme="minimal"\]\s*\{/);
});
