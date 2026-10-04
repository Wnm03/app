'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { loadSource } = require('./helpers/loadSource');

test('S2468. Dana Titipan commitment/return CRUD memiliki rollback eksplisit saat save() === false', () => {
  const src = fs.readFileSync('modules/finance/dana-titipan-commitment-return-api.js','utf8');
  assert.match(src, /const beforeCommitments = JSON\.stringify/);
  assert.match(src, /D\.titipanCommitments = JSON\.parse\(beforeCommitments\)/);
  assert.match(src, /const beforeReturns = JSON\.stringify/);
  assert.match(src, /D\.titipanReturns = JSON\.parse\(beforeReturns\)/);
  assert.match(src, /code:'PERSISTENCE_FAILED'/);
});

test('S2468. Dana Titipan pool create/delete rollback saat save() === false', () => {
  const D = { titipanPool:[{id:'p1',amount:100,type:'deposit'}], titipanCommitments:[] };
  const ctx = loadSource(['modules/finance/dana-titipan-pool-api.js'], {
    D, uid:()=> 'p2', save:()=>false, _financeMutationBlockedByStaleState:()=>false
  }, ['DanaTitipanPoolAPI']);
  const before = JSON.stringify(D.titipanPool);
  const a = ctx.DanaTitipanPoolAPI.addDeposit({amount:50});
  assert.equal(a.code,'PERSISTENCE_FAILED');
  assert.equal(JSON.stringify(D.titipanPool),before);
  const d = ctx.DanaTitipanPoolAPI.deleteEntry('p1');
  assert.equal(d.code,'PERSISTENCE_FAILED');
  assert.equal(JSON.stringify(D.titipanPool),before);
});
