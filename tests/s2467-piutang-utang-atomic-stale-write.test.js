const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pi=fs.readFileSync('modules/finance/piutang-utang.js','utf8');
const helper=fs.readFileSync('modules/finance/features-helpers-global-security.js','utf8');

test('S2467 Finance Piutang/Utang mutations preflight stale state',()=>{
  for(const fn of ["save(){if(typeof _financeMutationBlockedByStaleState", "async delete(id){"]){
    assert.ok(pi.includes(fn),`missing ${fn}`);
  }
  assert.ok(pi.match(/save\(\)\{if\(typeof _financeMutationBlockedByStaleState/));
  assert.ok(pi.match(/_saveInner\(\)\{\nif\(typeof _financeMutationBlockedByStaleState/));
  assert.ok(helper.includes('function _financeMutationBlockedByStaleState()'));
});

test('S2467 Piutang save/delete rollback snapshots include transaction linkage',()=>{
  assert.match(pi,/const _snap=_bdpAtomicSnapshot\(\['piutang','transactions'\]\)/);
  assert.match(pi,/const _persistOk=save\(\);\nif\(_persistOk===false\)\{_bdpAtomicRestore\(_snap\)/);
  assert.match(pi,/async delete\(id\)\{\nif\(typeof _financeMutationBlockedByStaleState/);
  assert.match(pi,/const _snap=_bdpAtomicSnapshot\(\['piutang'\]\)/);
});

test('S2467 Utang save is atomic across debt, bill, piutang and transaction linkage',()=>{
  assert.match(pi,/const _snap=_bdpAtomicSnapshot\(\['debts','bills','billsArchive','piutang','transactions'\]\)/);
  assert.match(pi,/try\{Debt\.syncBill\(d\);\}catch\(e\)\{_bdpAtomicRestore\(_snap\);throw e;\}/);
  assert.match(pi,/if\(_persistOk===false\)\{_bdpAtomicRestore\(_snap\)/);
});

test('S2467 Utang delete rolls back debt and generated bill on stale rejection',()=>{
  assert.match(pi,/const _snap=_bdpAtomicSnapshot\(\['debts','bills','piutang'\]\)/);
  assert.match(pi,/BillDebtPiutangCanonicalWriter\.removeById\('debts',id\);\nconst _persistOk=save\(\);/);
  assert.match(pi,/if\(_persistOk===false\)\{_bdpAtomicRestore\(_snap\)/);
});

test('S2467 Piutang edit uses canonical writer instead of direct row mutation',()=>{
  assert.match(pi,/BillDebtPiutangCanonicalWriter\.updateById\('piutang',p\.id,p0=>Object\.assign\(p0,_patch\)\)/);
  assert.doesNotMatch(pi,/Object\.assign\(p,\{name,nilai,tanggal,jatuhTempo,catatan,assetId,lunas:Piutang\._lunasState\}\)/);
});
