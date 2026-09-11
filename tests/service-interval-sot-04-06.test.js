const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCanonicalInterval } = require('../modules/vehicle/service-interval-sot');

test('category interval is authoritative', () => {
  assert.deepEqual(
    resolveCanonicalInterval({intervalKm: 4000, intervalBulan: 4}),
    {intervalKm:4000, intervalBulan:4}
  );
});
test('vehicle override wins over category interval', () => {
  assert.deepEqual(
    resolveCanonicalInterval({intervalKm:4000, intervalBulan:4}, {intervalKm:5000}),
    {intervalKm:5000, intervalBulan:4}
  );
});
test('missing interval remains null, never invented', () => {
  assert.deepEqual(resolveCanonicalInterval({}), {intervalKm:null, intervalBulan:null});
});
