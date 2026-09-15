const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
for(const [name,text] of [['source',src],['Bundle-B',bundle]]){
 assert(text.includes('function _installPersistenceLifecycleFlush()'),name+' harus memasang lifecycle flush');
 assert(text.includes("document.addEventListener('visibilitychange'"),name+' harus menangani visibilitychange');
 assert(text.includes("window.addEventListener('pagehide',flush)"),name+' harus menangani pagehide');
 assert(text.includes("window.addEventListener('beforeunload',flush)"),name+' harus menangani beforeunload');
 assert(text.includes("if(document.visibilityState==='hidden')flush();"),name+' hanya flush saat hidden');
 assert(text.includes('typeof window===\'undefined\'||typeof document===\'undefined\''),name+' harus aman di harness tanpa DOM');
}
assert(src.indexOf('_installPersistenceLifecycleFlush();')<src.indexOf('let _lastUid=0;'),'source lifecycle flush harus dipasang sebelum helper berikutnya');
console.log('PASS persistence lifecycle hardening 1743');
