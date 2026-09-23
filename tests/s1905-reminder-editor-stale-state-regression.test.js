'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {loadSource}=require('./helpers/loadSource');
const root=path.join(__dirname,'..');

function cls(){return{active:false,toggle(c,v){if(c==='active')this.active=!!v;}};}
function doc(els){return{getElementById:id=>els[id]||null};}

test('S1905: reminder edit memakai canonical openCatModalById dan menutup servisModal',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
 assert.match(s,/editSparepartFromReminder\(catId\)\{[\s\S]*openCatModalById\(catId\)/);
 assert.match(s,/openCatModalById\(catId\)/);
 assert.match(s,/closeModal\('servisModal',\{instant:true\}\)/);
});

test('S1905: Sparepart editor membersihkan autocomplete transient state saat dibuka',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
 assert.match(s,/openCatModalById\(catId\)\{[\s\S]*staleSuggestIds=\['sparepartNameBox','sparepartCodeBox','sparepartAiSuggestBox'\]/);
 assert.match(s,/hideSuggestBox\('sparepartNameBox'\)[\s\S]*hideSuggestBox\('sparepartCodeBox'\)/);
});

test('S1905: Grup Komponen menutup suggestion lama saat focus/pointerdown',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/sparepart-servis.js'),'utf8');
 assert.match(s,/sel\.onfocus=clearTransient/);
 assert.match(s,/sel\.onpointerdown=clearTransient/);
});

test('S1905: setEditTab memiliki 3 state dan merender History canonical',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
 assert.match(s,/const next=tab==='reminder'\?'reminder':tab==='history'\?'history':'detail'/);
 assert.match(s,/const history=document\.getElementById\('servisHistoryPanel'\)/);
 assert.match(s,/if\(next==='history'\)Servis\.renderEditHistoryTab\(\)/);
});

test('S1905: modal production punya panel History yang terpisah',()=>{
 const s=fs.readFileSync(path.join(root,'modules/shared/modals.js'),'utf8');
 assert.match(s,/id=\\"servisEditTabHistory\\"/);
 assert.match(s,/id=\\"servisHistoryPanel\\"/);
});

test('S1905: editHistory menyimpan actual changes, bukan daftar field hard-coded',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
 assert.match(s,/const _editAuditFieldLabels=\{/);
 assert.match(s,/const _changes=_changedAuditFields\.map\(field=>\(\{field,label:/);
 assert.match(s,/from:_editAuditBefore\[field\]\?\?null,to:s\[field\]\?\?null/);
 assert.match(s,/fields:_changedAuditFields,changes:_changes/);
});

test('S1905: renderer audit menampilkan perubahan from → to',()=>{
 const s=fs.readFileSync(path.join(root,'modules/vehicle/servis.js'),'utf8');
 assert.match(s,/const changes=Array\.isArray\(h&&h\.changes\)\?h\.changes:\[\]/);
 assert.match(s,/const detail=changes\.length\?changes\.map/);
 assert.match(s,/escapeHtml\(from\).*escapeHtml\(to\)/s);
});
