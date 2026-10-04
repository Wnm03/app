'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');

test('S2503 Finance taxonomy zero-substantive-gap invariants',()=>{
 const D={categories:{income:[{id:'inc_gaji',name:'Gaji',subs:[]}],expense:[
   {id:'cat_a',name:'Belanja',classification:'POKOK',subs:[{id:'sub_a',name:'Harian',classification:'POKOK'}]},
   {id:'cat_b',name:'Transport',classification:'WAJIB',subs:[{id:'sub_b',name:'Servis',classification:'WAJIB'}]}
 ]},transactions:[],budgets:[{id:'b1',catIds:['cat_a','sub_a']}]};
 const ctx=loadSource(['modules/finance/finance-category-sot.js','modules/finance/finance-tx-sot.js'],{D},['FinanceCategorySOT','FinanceTxSOT']);
 const S=ctx.FinanceCategorySOT, T=ctx.FinanceTxSOT;

 const tx=T.create({id:'t1',type:'expense',category:'Belanja',subcategory:'Harian',amount:10});
 assert.equal(tx.categoryId,'cat_a'); assert.equal(tx.subcategoryId,'sub_a');

 T.updateById('t1',{category:'Transport',subcategory:'Servis'});
 assert.equal(tx.categoryId,'cat_b'); assert.equal(tx.subcategoryId,'sub_b');
 assert.equal(tx.category,'Transport'); assert.equal(tx.subcategory,'Servis');
 T.updateById('t1',{category:'Belanja'});
 assert.equal(tx.categoryId,'cat_a'); assert.equal(tx.subcategoryId,undefined); assert.equal(tx.subcategory,'');

 assert.throws(()=>T.create({id:'bad',type:'expense',category:'Tidak Ada',amount:1}),/FINANCE_CATEGORY_UNRESOLVED/);
 assert.equal(D.transactions.length,1);

 S.updateCategory('expense','cat_a',{name:'Kendaraan'});
 assert.equal(tx.category,'Kendaraan');
 const tx2=T.create({id:'t2',type:'expense',category:'Transport',subcategory:'Servis',amount:5});
 S.updateSubcategory('expense','cat_b','sub_b',{name:'Perawatan'});
 assert.equal(tx2.subcategory,'Perawatan');
 assert.equal(S.findSub(S.findById('expense','cat_b'),'sub_b').name,'Perawatan');

 assert.equal(S.resolveSeven({type:'expense',categoryId:'cat_a',subcategoryId:'sub_a'}), 'POKOK');
 assert.equal(S.resolveSeven({type:'income',category:'Gaji'}),null);
 S.removeSubcategory('expense','cat_b','sub_b');
 assert.equal(tx.subcategoryId,undefined);
 S.removeCategory('expense','cat_a');
 assert.equal(JSON.stringify(D.budgets[0].catIds),JSON.stringify(['__total__']));

 const f=fs.readFileSync('modules/finance/filter-laporan.js','utf8');
 assert.match(f,/f\.classification/); assert.match(f,/resolveSeven/);
 const b=fs.readFileSync('scripts/build.js','utf8');
 assert.ok(b.indexOf("'modules/finance/finance-category-sot.js'")<b.indexOf("'modules/finance/finance-tx-sot.js'"));
 assert.ok(b.includes("'modules/finance/finance-category-sot.js'"));
 const payroll=fs.readFileSync('modules/business/reset-gaji-mingguan.js','utf8');
 assert.doesNotMatch(payroll,/D\.categories\.income\.push\(/);
});
