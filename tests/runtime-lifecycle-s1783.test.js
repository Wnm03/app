'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {verify}=require('../scripts/verify-runtime-lifecycle');
test('S1783: runtime lifecycle singleton dan AIBus cleanup',()=>{const r=verify();assert.equal(r.ok,true,r.errors.join('; '));});
