'use strict';
// tests/lifeos-link-registry.test.js — cakupan pertama untuk
// lifeos/lifeos-link-registry.js (relasi implisit-by-convention di D
// dibuat eksplisit di satu tempat, dikonsumsi review-adapter.js &
// goal-adapter.js). Sebelumnya NOL test sama sekali.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeRegistry() {
  return loadSource(['lifeos/lifeos-link-registry.js'], {}, ['LIFEOS_LINK_REGISTRY']);
}

test('lifeOSFindLink() — key yang terdaftar (dana-darurat) -> mengembalikan entry lengkap dgn label & links', () => {
  const { lifeOSFindLink } = makeRegistry();
  const link = lifeOSFindLink('dana-darurat');
  assert.ok(link);
  assert.equal(link.label, 'Dana Darurat');
  assert.ok(Array.isArray(link.links) && link.links.length > 0);
});

test('lifeOSFindLink() — key yang tidak terdaftar -> null (bukan undefined/error)', () => {
  const { lifeOSFindLink } = makeRegistry();
  assert.equal(lifeOSFindLink('tidak-ada'), null);
  assert.equal(lifeOSFindLink(undefined), null);
  assert.equal(lifeOSFindLink(''), null);
});

test('LIFEOS_LINK_REGISTRY — entry "dana-darurat".links[0].match() cuma cocok utk target dgn isDanaDarurat truthy', () => {
  const { LIFEOS_LINK_REGISTRY } = makeRegistry();
  const entry = LIFEOS_LINK_REGISTRY.find((l) => l.key === 'dana-darurat');
  const matcher = entry.links.find((l) => l.arr === 'targets').match;
  assert.equal(matcher({ isDanaDarurat: true, id: 't1' }), true);
  assert.equal(matcher({ isDanaDarurat: false, id: 't2' }), false);
  assert.ok(!matcher({ id: 't3' }), 'target tanpa field isDanaDarurat sama sekali -> tidak match (falsy)');
});

test('LIFEOS_LINK_REGISTRY — setiap entry punya key unik (cegah 2 relasi tabrakan lookup)', () => {
  const { LIFEOS_LINK_REGISTRY } = makeRegistry();
  const keys = LIFEOS_LINK_REGISTRY.map((l) => l.key);
  assert.equal(new Set(keys).size, keys.length);
});
