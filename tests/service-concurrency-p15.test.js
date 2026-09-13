const assert = require('assert');
const { withServiceMutationLock } = require('../modules/vehicle/service-event-adapter');

(async () => {
  const events = [];
  const first = withServiceMutationLock(async () => {
    events.push('first:start');
    await new Promise(r => setTimeout(r, 20));
    events.push('first:end');
    return 1;
  });
  const second = withServiceMutationLock(async () => {
    events.push('second:start');
    events.push('second:end');
    return 2;
  });
  assert.deepStrictEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepStrictEqual(events, ['first:start','first:end','second:start','second:end']);

  let active = 0, maxActive = 0;
  await Promise.all(Array.from({length: 8}, (_, i) => withServiceMutationLock(async () => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise(r => setTimeout(r, i % 2 ? 2 : 1));
    active--;
  })));
  assert.strictEqual(maxActive, 1, 'service mutations must never overlap');
  console.log('P15 PASS: shared service mutation lock serializes async service writes');
})();
