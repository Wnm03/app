const fs=require('fs');
const src=fs.readFileSync('modules/shared/features-helpers-global-security.js','utf8');
const bundle=fs.readFileSync('app-bundle-b.min.js','utf8');
function assert(c,m){if(!c)throw new Error(m)}
for(const [name,text] of [['source',src],['Bundle-B',bundle]]){
 assert(text.includes('let _savePersistSeq=0;'),name+' harus punya sequence persistence');
 assert(text.includes('const seq=++_savePersistSeq;'),name+' harus memberi sequence pada setiap snapshot');
 assert(text.includes('if(seq===_savePersistSeq)_writeLocalSnapshot(json);'),name+' fallback localStorage hanya boleh memakai snapshot terbaru');
 assert(text.includes('Fallback localStorage dilewati: snapshot IDB yang gagal sudah usang'),name+' harus mendeteksi fallback snapshot lama');
}
console.log('PASS stale persistence fallback guard S1765');
