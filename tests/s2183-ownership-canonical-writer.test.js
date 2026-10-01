const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function ctx(){
  const D={ownerRegistry:[],assets:[],investments:[],debts:[]};
  let n=0;
  const c={D,uid:()=>`u${++n}`,save:()=>{c.saves=(c.saves||0)+1;},window:{}};
  c.MultiOwnerEngine={
    validateOwners(owners){if(!Array.isArray(owners)||!owners.length)return{ok:false,reason:'empty'};const ids=new Set();let t=0;for(const o of owners){if(!o.ownerId||ids.has(o.ownerId))return{ok:false,reason:'duplicate'};ids.add(o.ownerId);t+=o.porsi||0;}return Math.abs(t-100)<1e-6?{ok:true}:{ok:false,reason:'total'};},
    setOwners(entity,owners){const v=this.validateOwners(owners);if(!v.ok)return v;return{ok:true,entity:{...entity,owners:owners.map(o=>({...o}))}};}
  };
  vm.createContext(c);
  for(const f of ['modules/shared/owner-registry.js','modules/shared/ownership-canonical-writer.js']) vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
  return c;
}
function test(name,fn){try{fn();console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
test('new owner is registered and canonicalized',()=>{const c=ctx();const r=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:' Budi ',porsi:100,isSelf:false}]);assert.equal(r.ok,true);assert.equal(r.owners[0].ownerId,c.D.ownerRegistry[0].id);assert.equal(c.D.ownerRegistry[0].name,'Budi');});
test('same name reuses one registry identity',()=>{const c=ctx();const a=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);const b=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:' bUdI ',porsi:100,isSelf:false}]);assert.equal(a.owners[0].ownerId,b.owners[0].ownerId);assert.equal(c.D.ownerRegistry.length,1);});
test('registered existing id is preserved',()=>{const c=ctx();const a=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);const b=c.window.OwnershipCanonicalWriter.prepare([{ownerId:a.owners[0].ownerId,ownerName:'Budi Baru',porsi:100,isSelf:false}]);assert.equal(b.owners[0].ownerId,a.owners[0].ownerId);});
test('legacy unregistered id remaps by name',()=>{const c=ctx();const a=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);const r=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'legacy-7',ownerName:'Budi',porsi:100,isSelf:false}]);assert.equal(r.ok,true);assert.equal(r.owners[0].ownerId,a.owners[0].ownerId);assert.deepEqual(r.remaps,[{oldId:'legacy-7',newId:a.owners[0].ownerId}]);});
test('SELF never enters registry',()=>{const c=ctx();const r=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Milik Sendiri',porsi:100,isSelf:true}]);assert.equal(r.owners[0].ownerId,'SELF');assert.equal(c.D.ownerRegistry.length,0);});
test('duplicate after canonicalization is rejected',()=>{const c=ctx();c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:50,isSelf:false}]);const r=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:50,isSelf:false},{ownerId:'',ownerName:' budi ',porsi:50,isSelf:false}]);assert.equal(r.ok,false);assert.match(r.reason,/duplikat/);});
test('invalid total is rejected before entity write',()=>{const c=ctx();const entity={owners:[]};const r=c.window.OwnershipCanonicalWriter.set(entity,[{ownerId:'',ownerName:'Budi',porsi:90,isSelf:false}]);assert.equal(r.ok,false);assert.deepEqual(entity.owners,[]);});
test('set returns normalized copy and leaves source entity untouched',()=>{const c=ctx();const entity={id:'a1',owners:[]};const r=c.window.OwnershipCanonicalWriter.set(entity,[{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);assert.equal(r.ok,true);assert.deepEqual(entity.owners,[]);assert.equal(r.entity.owners.length,1);});
test('registry persistence save remains unchanged contract',()=>{const c=ctx();c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);assert.equal(c.saves,1);});
test('schema is still owners[] only',()=>{const c=ctx();const r=c.window.OwnershipCanonicalWriter.prepare([{ownerId:'',ownerName:'Budi',porsi:100,isSelf:false}]);assert.deepEqual(Object.keys(r.owners[0]).sort(),['isSelf','ownerId','ownerName','porsi'].sort());});
