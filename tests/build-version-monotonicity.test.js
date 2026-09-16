'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const createBuildCore=require('../scripts/build-core');
const core=createBuildCore({ROOT:process.cwd(),ALL_SOURCE:[],readFile:()=>'',writeFile:()=>{},fs,path,computeGroupHash:()=>'',markerLine:()=>'',Buffer});

test('build version auto-increment never lowers the active numeric suffix',()=>{
  assert.equal(core.computeNextVersion('s748-carnotes-regression-1756'),'s748-carnotes-regression-1757');
  assert.equal(core.computeNextVersion('s748-carnotes-regression-1756','1757'),'s748-carnotes-regression-1757');
  assert.throws(()=>core.computeNextVersion('s748-carnotes-regression-1756','1755'),/downgrade ditolak/);
});
