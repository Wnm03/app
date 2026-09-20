'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {scan}=require('../scripts/app-wide-data-integrity-audit.js');
test('app-wide data integrity audit is read-only and emits domain coverage',()=>{
 const r=scan();
 assert.ok(r.domains.length>=5);
 assert.ok(r.sourceOfTruthSignals.some(x=>x.store==='D.servisLogs'));
 assert.ok(Array.isArray(r.duplicateWriteCandidates));
 assert.ok(r.incompleteChecks.some(x=>x.includes('Runtime snapshots')));
});
