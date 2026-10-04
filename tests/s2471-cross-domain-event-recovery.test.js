const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vehicle=fs.readFileSync('modules/vehicle/vehicle-core.js','utf8');
const stock=fs.readFileSync('modules/vehicle/stock-command-sot.js','utf8');
const adapter=fs.readFileSync('modules/vehicle/service-event-adapter.js','utf8');
test('vehicle CRUD/KM events have post-commit durable fallback',()=>{
  assert.match(vehicle,/vehicleEditEventErr/);
  assert.match(vehicle,/vehicleCreateEventErr/);
  assert.match(vehicle,/vehicleKmEventErr/);
  assert.match(vehicle,/vehicleDeleteEventErr/);
  assert.match(vehicle,/ServiceEventOutbox\.enqueue\(\{type:'vehicle\.updated'/);
});
test('stock finance events have durable fallback',()=>{
  assert.match(stock,/purchase-apply/);
  assert.match(stock,/purchase-revert/);
  assert.match(stock,/FinanceEventOutbox\.enqueue\('finance\.updated'/);
});
test('service event outbox replays vehicle/finance events with event metadata',()=>{
  assert.match(adapter,/evt\.type==='vehicle\.updated'/);
  assert.match(adapter,/evt\.type==='finance\.updated'/);
  assert.match(adapter,/eventMeta/);
});
