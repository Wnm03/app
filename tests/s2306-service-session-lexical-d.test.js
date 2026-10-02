const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function sandbox(){
  const sb={console,Date,Set,Map,JSON,String,Number,Array,Object,Math,Promise};
  sb.globalThis=sb;
  sb.localStorage={_m:new Map(),getItem(k){return this._m.get(k)||null},setItem(k,v){this._m.set(k,String(v))},removeItem(k){this._m.delete(k)}};
  sb.save=()=>{};
  return vm.createContext(sb);
}
function load(ctx,file,prelude=''){
  const src=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  vm.runInContext(`${prelude}\n${src}`,ctx,{filename:file});
}

test('S2306 recovery and reconcile consume lexical D without globalThis.D',()=>{
  const ctx=sandbox();
  vm.runInContext(`let D={servisLogs:[{id:'s1',vehicleId:'v1',sessionId:'sess1',txLinkId:'t1',checklist:[{itemId:'c1'}]}],transactions:[{id:'t1',servisLinkId:'s1'}],partsStock:[],sparepartCats:[]};`,ctx);
  load(ctx,'modules/vehicle/service-session-recovery-s2050.js');
  load(ctx,'modules/vehicle/service-session-reconcile-s2051.js');
  const j=ctx.ServiceSessionRecoveryS2050.prepare({vehicleId:'v1',sessionId:'sess1',txId:'t1'},[]);
  assert.ok(j);
  assert.equal(j.rows.length,1);
  const r=ctx.ServiceSessionReconcileS2051.auditSession('v1','sess1');
  assert.equal(r.ok,true);
  assert.equal(r.rows.length,1);
});

test('S2306 critical Service session modules no longer read g.D directly outside lexical fallback',()=>{
  for(const file of [
    'modules/vehicle/service-session-mutation-s2047.js',
    'modules/vehicle/service-session-recovery-s2050.js',
    'modules/vehicle/service-session-reconcile-s2051.js'
  ]){
    const s=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    const stripped=s.replace(/const data=\(\)=>typeof D!=='undefined'\?D:g\.D;/g,'');
    assert.equal(/\bg\.D\b/.test(stripped),false,file);
    assert.match(s,/const data=\(\)=>typeof D!=='undefined'\?D:g\.D;/);
  }
});
