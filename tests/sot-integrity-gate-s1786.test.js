'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),gate=require('../scripts/sot-integrity-gate');
test('S1786 runtime manifest unique/complete',()=>{const f=gate.runtimeSourcesFromBuild();assert.ok(f.length>100);assert.equal(new Set(f).size,f.length)});
test('S1786 canonical version owned by shared source',()=>assert.match(gate.sourceVersion(),/^s\d+-.+$/));
test('S1786 complete SOT gate passes',()=>assert.doesNotThrow(()=>gate.main()));
