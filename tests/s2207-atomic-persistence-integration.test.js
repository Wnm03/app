const fs=require('fs');const assert=require('assert');
function between(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);return src.slice(i,j<0?src.length:j);}
const tag=fs.readFileSync('modules/finance/tagihan-kalender.js','utf8');
const tit=fs.readFileSync('modules/finance/titipan-expense-flow.js','utf8');
const tagSeg=between(tag,'const _paymentAtomic=FinanceCrossEntityAtomic.begin','}finally{');
assert.ok(tagSeg.includes('_paymentAtomic.commit();'),'bill payment must stage atomic events');
const tagCommits=[...tagSeg.matchAll(/_paymentAtomic\.commit\(\);/g)].map(m=>m.index);
const tagSaves=[...tagSeg.matchAll(/\bsave\(\);/g)].map(m=>m.index);
assert.ok(tagCommits.length>=4,'each bill-payment exit path must commit');
for(const pos of tagSaves)assert.ok(tagCommits.some(c=>c<pos),'every bill-payment save must follow atomic commit');
const titSeg=between(tit,'const _atomic = typeof FinanceCrossEntityAtomic','      if (typeof AIBus');
const titCommit=titSeg.indexOf('_atomic.commit();'),titSave=titSeg.indexOf('save();');
assert.ok(titCommit>=0&&titSave>titCommit,'Titipan save must persist after atomic event staging');
console.log('S2207 atomic persistence integration PASS');
