const {describe,it}=require("node:test");
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const servis=fs.readFileSync(path.join(root,'modules/vehicle/servis-b.js'),'utf8');
const render=fs.readFileSync(path.join(root,'modules/shared/modules-render.js'),'utf8');
const renderB=fs.readFileSync(path.join(root,'modules/shared/modules-render-b.js'),'utf8');

describe('S1858 Car Notes deep performance',()=>{
 it('avoids nested reminder render when Car Notes servis tab renders list',()=>{
   assert.match(renderB,/renderServisList\(\{skipReminder:true\}\)/);
   assert.match(servis,/renderList\(opts\)/);
   assert.match(servis,/if\(!_opts\.skipReminder\)Servis\.renderReminder\(\);/);
 });
 it('renderList participates in the Car Notes revision/profile pipeline',()=>{
   assert.match(servis,/renderList\(opts\)/);
   assert.match(servis,/if\(!_opts\.skipReminder\)Servis\.renderReminder\(\);/);
   assert.match(servis,/_renderListCache/);
   assert.match(servis,/CarNotesPerformance\.revision\(\)/);
   assert.match(renderB,/CarNotesPerformance\.profile/);
   assert.match(renderB,/carnotes\.render\.serviceIntegrity/);
 });
});
