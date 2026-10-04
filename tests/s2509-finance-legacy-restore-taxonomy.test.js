const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const BASE_CATEGORIES={income:[],expense:[{id:'cat_tagihan_biaya_1782816414984',name:'Tagihan & Biaya',subs:[{id:'sub_wifi',name:'Wifi'}],classification:'WAJIB'}]};
function fresh(categories){
  global.D={categories:JSON.parse(JSON.stringify(categories)),transactions:[]};
  delete global.FinanceCategorySOT; delete global.FinanceTxSOT;
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../modules/finance/finance-category-sot.js'),'utf8'),{filename:'finance-category-sot.js'});
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../modules/finance/finance-tx-sot.js'),'utf8'),{filename:'finance-tx-sot.js'});
  return {D:global.D,Category:global.FinanceCategorySOT,Tx:global.FinanceTxSOT};
}

test('S2509 restores known legacy Tagihan/Pulsa-Kuota and Dana Titipan without dropping transactions',()=>{
  const transactions=[{id:'tagihan-1',type:'expense',amount:50000,category:'Tagihan',subcategory:'',note:'wifi'},{id:'tagihan-2',type:'expense',amount:38865,category:'Tagihan',subcategory:'Pulsa/Kuota'},{id:'titipan-1',type:'expense',amount:377247,category:'Dana Titipan',subcategory:'',titipanLinkId:'owner-1'},{id:'titipan-2',type:'expense',amount:50000,category:'Dana Titipan',subcategory:'',titipanLinkId:'owner-1'}];
  const {D,Category,Tx}=fresh(BASE_CATEGORIES);
  const rec=Category.reconcileLegacyTransactionTaxonomy(transactions);
  assert.equal(rec.ok,true);
  assert.deepEqual(rec.issues,[]);
  Tx.replaceSnapshot(transactions);
  assert.equal(D.transactions.length,transactions.length);
  const titipan=D.transactions.filter(t=>t.category==='Dana Titipan');
  assert.equal(titipan.length,2);
  const tagihanPulsa=D.transactions.find(t=>t.category==='Tagihan & Biaya'&&t.subcategory==='Pulsa/Kuota');
  assert.ok(tagihanPulsa);
  assert.equal(tagihanPulsa.categoryId,'cat_tagihan_biaya_1782816414984');
  assert.equal(tagihanPulsa.subcategoryId,'sub_tagihan_biaya_pulsa_kuota_legacy');
  assert.equal(Category.findByName('expense','Dana Titipan').classification,'NON_BELANJA');
});

test('S2509 remains fail-closed for an unknown legacy category',()=>{
  const {Category,Tx}=fresh(BASE_CATEGORIES);
  const rows=[{id:'unknown',type:'expense',amount:1,category:'Kategori Warisan Tidak Dikenal',subcategory:''}];
  const rec=Category.reconcileLegacyTransactionTaxonomy(rows);
  assert.equal(rec.ok,true);
  assert.deepEqual(rec.issues,[]);
  assert.throws(()=>Tx.replaceSnapshot(rows),/FINANCE_CATEGORY_UNRESOLVED/);
});
