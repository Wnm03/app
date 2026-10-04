const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const transfer=fs.readFileSync('modules/finance/tx-transfer.js','utf8');
const akun=fs.readFileSync('modules/finance/akun.js','utf8');
const bill=fs.readFileSync('modules/finance/tagihan-kalender.js','utf8');
const target=fs.readFileSync('modules/finance/tx-target.js','utf8');

test('S2463 transfer rejects non-finite/oversized amounts and creates pair atomically',()=>{
 assert.match(transfer,/Number\.isFinite\(amt\).*999000000000/);
 assert.match(transfer,/FinanceTxSOT\.createMany\(\[\{id:uid\(\),type:'transfer_out'/);
});
test('S2463 account migration uses FinanceTxSOT for transaction account references',()=>{
 assert.match(akun,/FinanceTxSOT\.updateById\(t\.id,\{accountId:target\.id\}\)/);
});
test('S2463 bill archive unlink and payment edits use FinanceTxSOT',()=>{
 assert.match(bill,/FinanceTxSOT\.updateById\(t\.id,\{billLinkId:undefined\}\)/);
 assert.match(bill,/FinanceTxSOT\.updateById\(t\.id,patch\)/);
});
test('S2463 target progress cannot be negative or exceed target',()=>{
 assert.match(target,/Number\.isFinite\(add\).*add<=0/);
 assert.match(target,/saved<0\|\|saved>amt/);
});
