'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const {loadSource}=require('./helpers/loadSource');

test('S2462 Finance save guards preflight stale cross-tab state',()=>{
  const shared=require('fs').readFileSync('modules/shared/features-helpers-global-security.js','utf8');
  const finance=require('fs').readFileSync('modules/finance/features-helpers-global-security.js','utf8');
  assert.match(shared,/function _financeMutationBlockedByStaleState\(\)/);
  assert.doesNotMatch(finance,/function _financeMutationBlockedByStaleState\(\)/);
  assert.match(finance,/function withSaveGuard\(key,modalId,fn\)\{\s*if\(_saveGuards\[key\]\)return;\s*if\(_financeMutationBlockedByStaleState\(\)\)return false;/);
  assert.match(finance,/async function withSaveGuardAsync\(key,modalId,fn\)\{\s*if\(_saveGuards\[key\]\)return;\s*if\(_financeMutationBlockedByStaleState\(\)\)return false;/);
});

test('S2462 stale-write guard is resident in production bundles',()=>{
  for(const f of ['app-bundle-b.min.js']){
    const bundle=fs.readFileSync(f,'utf8');
    assert.match(bundle,/function _financeMutationBlockedByStaleState\(/,`${f}: canonical Finance stale-write guard missing from bundle`);
  }
});

test('S2462 target rejects zero/negative target and trims name',()=>{
  const els={tName:{value:'   '},tAmt:{value:'-1'},tAcc:{value:''},tSaved:{value:'0'},tDanaDarurat:{checked:false},tEmoji:{value:'🎯'}};
  const D={targets:[]}; const ctx=loadSource(['modules/finance/tx-target.js'],{
    D,document:{getElementById:id=>els[id]||{style:{},value:'',checked:false}},
    toast:()=>{},_financeMutationBlockedByStaleState:()=>false,renderEmergencyFundSuggestBadge:()=>{},renderSettings:()=>{}
  },['saveTarget']);
  assert.equal(ctx.saveTarget(),false); assert.deepEqual(D.targets,[]);
});

test('S2462 Finance mutation entrypoints contain stale-write preflight',()=>{
  const files=[
    'modules/finance/kategori.js','modules/finance/tagihan-kalender.js','modules/finance/transaksi-b.js',
    'modules/finance/tx-list-cashflow.js','modules/finance/tx-target.js','modules/finance/tx-transfer.js',
    'modules/finance/pajak-pbb-zakat.js','modules/finance/akun.js','modules/finance/titipan-expense-flow.js','modules/finance/dana-titipan-commitment-return-api.js','modules/finance/dana-titipan-pool-api.js'
  ];
  for(const f of files){
    const s=fs.readFileSync(f,'utf8');
    assert.match(s,/_financeMutationBlockedByStaleState/,`${f}: stale-write guard missing`);
  }
  const pajak=fs.readFileSync('modules/finance/pajak-pbb-zakat.js','utf8');
  assert.match(pajak,/BillDebtPiutangCanonicalWriter\.updateById\('bills',bill\.id/,'PBB bill edit must use canonical Finance bill writer');
  const akun=fs.readFileSync('modules/finance/akun.js','utf8');
  assert.match(akun,/save\(\)\{\s*if\(typeof _financeMutationBlockedByStaleState/,'account-owner save must preflight stale state');
});

// node:test reports the authoritative test totals; avoid a hard-coded PASS count
// that could falsely claim success when the production-bundle contract fails.
