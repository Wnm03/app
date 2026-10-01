'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const ROOT=path.resolve(__dirname,'..');
function src(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8');}
function buildFiles(){
  const b=src('scripts/build.js');
  return [...b.matchAll(/'([^']+\.js)'/g)].map(m=>m[1]);
}
function walk(dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p,out);
    else if(ent.isFile()&&p.endsWith('.js')) out.push(p);
  }
  return out;
}

test('S2227 — FinanceTxSOT is wired before every bundled FinanceTxSOT consumer',()=>{
  const files=buildFiles();
  const sot=files.indexOf('modules/finance/finance-tx-sot.js');
  assert.ok(sot>=0,'FinanceTxSOT must be present in production build order');
  const violations=[];
  for(const rel of files){
    if(rel==='modules/finance/finance-tx-sot.js') continue;
    const abs=path.join(ROOT,rel);
    if(!fs.existsSync(abs)) continue;
    const s=fs.readFileSync(abs,'utf8');
    if(/FinanceTxSOT/.test(s) && files.indexOf(rel)<sot) violations.push(rel);
  }
  assert.deepEqual(violations,[],'FinanceTxSOT consumer appears before its gateway: '+violations.join(', '));
});

test('S2227 — every non-bundled FinanceTxSOT consumer is explicitly lazy-loaded or test-only',()=>{
  const files=new Set(buildFiles());
  const consumers=[];
  for(const abs of walk(path.join(ROOT,'modules'))){
    const rel=path.relative(ROOT,abs).replaceAll(path.sep,'/');
    const s=fs.readFileSync(abs,'utf8');
    if(/FinanceTxSOT/.test(s) && !files.has(rel)) consumers.push(rel);
  }
  const lazyAllowed=new Set(['modules/home/renovasi.js']);
  const unexpected=consumers.filter(x=>!lazyAllowed.has(x));
  assert.deepEqual(unexpected,[],`FinanceTxSOT consumers outside production bundle/lazy contract: ${unexpected.join(', ')}`);
  const render=src('modules/shared/modules-render.js');
  assert.match(render,/modules\/home\/renovasi\.js/,'Renovasi lazy-loader contract must remain explicit');
});

test('S2227 — Renovasi lazy-load path executes after the production bundle contract is established',()=>{
  const render=src('modules/shared/modules-render.js');
  const build=src('scripts/build.js');
  assert.match(build,/['"]modules\/finance\/finance-tx-sot\.js['"]/);
  assert.match(render,/ensureRenov\(\).*modules\/home\/renovasi\.js|modules\/home\/renovasi\.js/);
  assert.match(render,/FinanceTxSOT|ensureRenov/);
});
