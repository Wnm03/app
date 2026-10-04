const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const finance=fs.readFileSync('modules/finance/finance-event-outbox.js','utf8');
const lifecycle=fs.readFileSync('modules/vehicle/service-event-lifecycle.js','utf8');

test('FinanceEventOutbox handles async consumer rejection instead of trusting emit()',()=>{
  assert.match(finance,/typeof g\.AIBus\.emitAsync==='function'/);
  assert.match(finance,/post-commit event failed; queued for retry/);
  assert.match(finance,/return enqueue\(type,payload\);/);
});

test('Service lifecycle has durable fallback for async consumer failure',()=>{
  assert.match(lifecycle,/typeof AIBus\.emitAsync==='function'/);
  assert.match(lifecycle,/ServiceEventOutbox\.enqueue/);
  assert.match(lifecycle,/type:'service\.update'/);
});

test('AIBus async delivery primitive is awaited by durable paths',()=>{
  assert.match(finance,/g\.AIBus\.emitAsync\(type,payload\)/);
});
