'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const ROOT=path.join(__dirname,'..');
const build=fs.readFileSync(path.join(ROOT,'scripts','build.js'),'utf8');
function group(name){
 const m=build.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
 assert.ok(m,`missing ${name}`);
 return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
}
const groups={A:group('GROUP_A'),B:group('GROUP_B')};

test('Servis module declaration exists in exactly one classic bundle source',()=>{
 const hits=[];
 for(const [name,files] of Object.entries(groups)) for(const file of files){
  const src=fs.readFileSync(path.join(ROOT,file),'utf8');
  if(/\bconst\s+Servis\s*=\s*\{/.test(src)) hits.push({group:name,file});
 }
 assert.deepEqual(hits,[{group:'B',file:'modules/vehicle/servis.js'}],`duplicate/misplaced Servis declarations: ${JSON.stringify(hits)}`);
});

test('car-notes no longer owns the Servis declaration',()=>{
 const src=fs.readFileSync(path.join(ROOT,'car-notes.js'),'utf8');
 assert.equal(/\bconst\s+Servis\s*=\s*\{/.test(src),false);
});
