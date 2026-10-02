import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

function activeDirectTransactionPushes(source) {
  return source.split('\n').map((line, i) => ({line, i:i+1}))
    .filter(x => /^\s*D\.transactions\.push\(/.test(x.line));
}

test('S2309: active finance writers do not bypass FinanceTxSOT with direct D.transactions.push', () => {
  for (const file of ['car-notes.js', 'chat-action-handlers.js']) {
    const src = read(file);
    assert.deepEqual(activeDirectTransactionPushes(src), [], `${file} masih punya direct D.transactions.push`);
    assert.match(src, /FinanceTxSOT\.create\(/, `${file} tidak memakai FinanceTxSOT.create`);
  }
});

test('S2309: Bundle-A mirrors the direct-write hardening', () => {
  const bundle = read('app-bundle-a.min.js');
  assert.doesNotMatch(bundle, /D\.transactions\.push\(\{id:uid\(\),type,amount/);
  assert.doesNotMatch(bundle, /D\.transactions\.push\(\{id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory\(veh\),subcategory:'Bensin'/);
  assert.doesNotMatch(bundle, /D\.transactions\.push\(\{id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory\(veh\),subcategory:'Servis & Oli'/);
  assert.ok(bundle.includes('FinanceTxSOT.create({id:uid(),type,amount'));
  assert.ok(bundle.includes("FinanceTxSOT.create({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Bensin'"));
  assert.ok(bundle.includes("FinanceTxSOT.create({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli'"));
});
