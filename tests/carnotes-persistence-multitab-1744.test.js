const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
for(const [name,text] of [['source',src],['Bundle-B',bundle]]){
 assert(text.includes("let _crossTabStateStale=false;"),name+' harus punya stale-state guard');
 assert(text.includes("new BroadcastChannel('kw_v4_persistence')"),name+' harus mendeteksi instance lain via BroadcastChannel');
 assert(text.includes("window.addEventListener('storage'"),name+' harus punya fallback storage event');
 assert(text.includes("e.data.type==='kw-v4-write'"),name+' harus memvalidasi pesan write');
 assert(text.includes("e.data.source!==_crossTabInstance"),name+' harus mengabaikan pesan dari instance sendiri');
 assert(text.includes('_markCrossTabStale();'),name+' harus menandai state stale');
 assert(text.includes('_announcePersistenceWrite();'),name+' harus mengumumkan persistence write');
}
assert(src.indexOf('_installCrossTabPersistenceGuard();')<src.indexOf('let _lastUid=0;'),'cross-tab guard harus dipasang pada startup helper');
assert(src.includes("localStorage.setItem('kw_v4_writer',_crossTabInstance+'|'+Date.now())"),'harus ada marker fallback lintas tab');
console.log('PASS persistence multi-tab conflict detection 1744');
