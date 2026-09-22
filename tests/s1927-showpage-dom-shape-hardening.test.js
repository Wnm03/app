'use strict';
// S1927: harden the remaining showPage() DOM-shape assumptions exposed by the
// S1926 regression. Lightweight DOM/test adapters may omit classList methods
// or setAttribute; showPage must not turn those shapes into navigation crashes.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

test('S1927: showPage DOM-shape contract is hardened',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const start=src.indexOf('function showPage(name,el,opts){');
  const end=src.indexOf('\n/* moved to modules-render.js',start);
  const body=src.slice(start,end);
  assert.match(body,/pageEl\.classList&&typeof pageEl\.classList\.contains==='function'/);
  assert.match(body,/pageEl\.classList&&typeof pageEl\.classList\.add==='function'/);
  assert.match(body,/typeof p\.classList\.remove==='function'/);
  assert.match(body,/typeof n\.classList\.remove==='function'/);
  assert.match(body,/typeof n\.setAttribute==='function'/);
  assert.match(body,/typeof activeBtn\.setAttribute==='function'/);
  assert.match(body,/typeof el\.setAttribute==='function'/);
});

test('S1927: source guards remaining classList/setAttribute assumptions in showPage',()=>{
  const src=read('modules/shared/modal-navigasi.js');
  const start=src.indexOf('function showPage(name,el,opts){');
  const end=src.indexOf('\n/* moved to modules-render.js',start);
  const body=src.slice(start,end);
  assert.match(body,/pageEl\.classList&&typeof pageEl\.classList\.contains==='function'/);
  assert.match(body,/pageEl\.classList&&typeof pageEl\.classList\.add==='function'/);
  assert.match(body,/typeof n\.setAttribute==='function'/);
  assert.match(body,/typeof activeBtn\.setAttribute==='function'/);
});
