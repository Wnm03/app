const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
for(const [name,text] of [['source',src],['Bundle-B',bundle]]){
 assert(text.includes("let s=null, fromIdb=false, idbRaw=null, lsRaw=null;"),name+' harus membaca kedua media secara independen');
 assert(text.includes("typeof localStorage!=='undefined') lsRaw=localStorage.getItem('kw_v4')"),name+' harus guard localStorage read');
 assert(text.includes("_parseStoredSnapshot=(raw,label)=>"),name+' harus punya parser recovery terpusat');
 assert(text.includes("if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('root snapshot bukan object')"),name+' harus menolak root JSON non-object');
 assert(text.includes("p=_parseStoredSnapshot(idbRaw,'IndexedDB');"),name+' harus validasi snapshot IDB');
 assert(text.includes("p=_parseStoredSnapshot(lsRaw,'localStorage');"),name+' harus fallback ke snapshot localStorage valid');
 assert(text.includes("if(!p&&lsRaw)"),name+' harus mencoba LS setelah IDB corrupt/kosong');
 assert(text.includes("if(idbRaw||lsRaw)"),name+' harus membedakan tidak ada data vs data corrupt');
 assert(text.includes("IDBStore.set('kw_v4_mirror',s||lsRaw)"),name+' harus repair mirror IDB dari LS yang tervalidasi');
 assert(!text.includes("Data tersimpan corrupt:',parseErr"),name+' tidak boleh abort hanya karena satu sumber corrupt');
}
console.log('PASS persistence recovery fallback 1745');
