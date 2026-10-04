'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/loadSource');

function makeCtx(D, saveResult='ok') {
  return loadSource(['modules/shared/owner-registry.js'], {
    D,
    uid: () => 'u' + (D._n = (D._n || 0) + 1),
    save: () => saveResult === 'throw' ? (()=>{ throw new Error('save failed'); })() : saveResult === 'false' ? false : true,
  }, ['OwnerRegistry']);
}

function fixture(){
  return {
    ownerRegistry:[{id:'o1',name:'Budi'},{id:'o2',name:'Budi W'}],
    assets:[{id:'a1',owners:[{ownerId:'o2',ownerName:'Budi W',isSelf:false,porsi:50}]}],
    investments:[{id:'i1',owners:[{ownerId:'o2',ownerName:'Budi W',isSelf:false,porsi:50}]}],
    titipanCommitments:[{id:'c1',ownerId:'o2',ownerName:'Budi W',principalAmount:100}],
    debts:[{id:'d1',linkedOwnerId:'o2',name:'Budi W',nilai:100}],
  };
}

test('S2478 rename rolls back every ownership projection when save() returns false',()=>{
  const D=fixture(); const before=JSON.stringify(D); const ctx=makeCtx(D,'false');
  const r=ctx.OwnerRegistry.rename('o2','Budi Baru');
  assert.equal(r.ok,false); assert.equal(r.reason,'persistence-failed'); assert.equal(JSON.stringify(D),before);
});

test('S2478 merge rolls back registry + asset + investment + titipan + debt when save() throws',()=>{
  const D=fixture(); const before=JSON.stringify(D); const ctx=makeCtx(D,'throw');
  const r=ctx.OwnerRegistry.merge('o2','o1');
  assert.equal(r.ok,false); assert.equal(r.reason,'persistence-failed'); assert.equal(JSON.stringify(D),before);
});

test('S2478 findOrCreate does not leave a phantom owner when persistence fails',()=>{
  const D={ownerRegistry:[]}; const ctx=makeCtx(D,'false');
  assert.throws(()=>ctx.OwnerRegistry.findOrCreate('Baru'),/Gagal menyimpan/);
  assert.deepEqual(D.ownerRegistry,[]);
});
