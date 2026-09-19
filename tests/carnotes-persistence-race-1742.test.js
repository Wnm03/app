const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
assert(src.includes('let _savePersistChain=Promise.resolve();'),'source harus punya persistence queue');
assert(src.includes('_savePersistChain=_savePersistChain.then(()=>IDBStore.set(\'kw_v4_mirror\',json))'),'source harus serialize IDB writes');
assert(bundle.includes('let _savePersistChain=Promise.resolve();'),'Bundle-B harus membawa persistence queue');
assert(bundle.includes('_savePersistChain=_savePersistChain.then(()=>IDBStore.set(\'kw_v4_mirror\',json))'),'Bundle-B harus serialize IDB writes');
assert((src.match(/_savePersistChain=_savePersistChain\.then\(\(\)=>IDBStore\.set\('kw_v4_mirror',json\)/g)||[]).length>=1,'source harus punya satu jalur queued mirror write');
assert(src.includes('_writeLocalSnapshot(json)'),'source harus punya synchronous flush fallback');
console.log('PASS persistence race guard 1742');
