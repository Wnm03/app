const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function load() {
  const store = new Map();
  const ctx = {
    console,
    localStorage: {
      getItem(k){ return store.has(k) ? store.get(k) : null; },
      setItem(k,v){ store.set(k,String(v)); },
      removeItem(k){ store.delete(k); }
    },
    window: null,
    module: { exports: {} },
    setTimeout() {},
    queueMicrotask(fn){ fn(); }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8'),ctx,{filename:'service-event-adapter.js'});
  return ctx;
}

let pass = 0;
function test(name, fn){ try { fn(); console.log('ok - '+name); pass++; } catch(e){ console.error('not ok - '+name); throw e; } }

test('post-commit service outbox row gets stable eventId',()=>{
  const c=load();
  assert.equal(c.ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:'T1',kind:'servis',action:'update'}}),true);
  const row=c.ServiceEventOutbox.pending()[0];
  assert.ok(row.eventId);
  assert.equal(row.eventId,row.key);
});

test('stable eventId survives persistence and replay metadata',()=>{
  const c=load();
  c.ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:'T2',kind:'servis',action:'delete'}});
  const id=c.ServiceEventOutbox.pending()[0].eventId;
  const seen=[];
  c.AIBus={emit:(type,payload,meta)=>seen.push(meta&&meta.eventId)};
  c.ServiceEventOutbox.flush();
  assert.deepEqual(seen,[id]);
});

test('exact duplicate keeps one durable identity',()=>{
  const c=load();
  c.ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:'T3',kind:'servis',action:'update'}});
  c.ServiceEventOutbox.enqueue({type:'finance.updated',payload:{txId:'T3',kind:'servis',action:'update'}});
  assert.equal(c.ServiceEventOutbox.pending().length,1);
  assert.ok(c.ServiceEventOutbox.pending()[0].eventId);
});

console.log(`${pass}/3 PASS`);
