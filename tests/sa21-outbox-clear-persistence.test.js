const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'); const vm=require('vm');
const src=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
function makeStorage(failSet=false){let data=new Map(); return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{if(failSet)throw new Error('storage offline');data.set(k,v)},removeItem:k=>data.delete(k)}}
function load(localStorage){const c={module:{exports:{}},exports:{},localStorage,window:{},queueMicrotask:()=>{}}; vm.runInNewContext(src,c); return c.module.exports.ServiceEventOutbox;}
test('SA21: clear rollback keeps pending event when persistence fails',()=>{
 const s=makeStorage(false); let o=load(s); o.enqueue({type:'finance.updated',payload:{id:'f1'}}); assert.equal(o.pending().length,1);
 const broken=makeStorage(true); // simulate storage failure for a fresh instance
 // seed storage with the pending event from the healthy instance
 const raw=s.getItem('service-event-outbox:v1'); broken.getItem=()=>raw;
 o=load(broken); assert.equal(o.pending().length,1);
 o.clear(); assert.equal(o.pending().length,1);
});
