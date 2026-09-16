'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {verify}=require('../scripts/verify-version-integrity');
test('version source/HTML/SW tetap konsisten setelah setiap release bump',()=>{
 const r=verify();
 assert.equal(r.ok,true,r.errors.join('; '));
 assert.match(r.appVersion,/^s\d+-[a-z0-9-]+$/i);
 assert.equal(r.htmlValues.length>0,true);
 assert.equal(new Set(r.htmlValues).size,1);
 assert.equal(r.swVersion,r.htmlValues[0]);
});
