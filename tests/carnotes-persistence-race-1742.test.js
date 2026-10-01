const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(/IDBStore\.setMany(?:IfCurrent)?/.test(src),'source harus memakai atomic batch persistence');
assert(src.includes('kw_v4_mirror'),'source harus persist mirror');
assert(/setMany(?:IfCurrent)?/.test(bundle),'Bundle-B harus membawa atomic batch persistence');
assert(bundle.includes('kw_v4_mirror'),'Bundle-B harus persist mirror');
assert(/setMany(?:IfCurrent)?/.test(src),'source harus punya satu jalur atomic batch mirror write');
assert(src.includes('_writeLocalSnapshot(json)'),'source harus punya synchronous flush fallback');
console.log('PASS persistence race guard 1742');
