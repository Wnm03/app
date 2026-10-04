'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadSource}=require('./helpers/loadSource');

test('S2501 cumulative Finance taxonomy closure: one SOT, merge remap, budget/AI/OCR canonical IDs, fail-closed writers',()=>{
  // 1) Canonical SOT merge must remap every surviving reference, not merely delete duplicates.
  const D={
    categories:{
      income:[],
      expense:[
        {id:'cat_a',name:'Belanja',classification:'POKOK',subs:[{id:'sub_a1',name:'Harian'}]},
        {id:'cat_b',name:'  BELANJA ',classification:'POKOK',subs:[{id:'sub_b1',name:'Harian'},{id:'sub_b2',name:'Bulanan'}]}
      ]
    },
    transactions:[
      {id:'tx_dup_cat',type:'expense',categoryId:'cat_b',subcategoryId:'sub_b1',category:'BELANJA',subcategory:'Harian'},
      {id:'tx_dup_sub',type:'expense',categoryId:'cat_b',subcategoryId:'sub_b2',category:'BELANJA',subcategory:'Bulanan'}
    ],
    budgets:[{id:'b1',catIds:['cat_b','sub_b1']}]
  };
  const ctx=loadSource(['modules/finance/finance-category-sot.js'],{D},['FinanceCategorySOT']);
  const merge=ctx.FinanceCategorySOT.mergeDuplicates('expense');
  assert.equal(JSON.stringify(merge.categoryRemap),JSON.stringify({cat_b:'cat_a'}));
  assert.equal(JSON.stringify(merge.subcategoryRemap),JSON.stringify({sub_b1:'sub_a1'}));
  assert.equal(D.categories.expense.length,1);
  assert.equal(D.transactions[0].categoryId,'cat_a');
  assert.equal(D.transactions[0].subcategoryId,'sub_a1');
  assert.equal(D.transactions[1].categoryId,'cat_a');
  assert.equal(D.transactions[1].subcategoryId,'sub_b2');
  assert.equal(JSON.stringify(D.budgets[0].catIds),JSON.stringify(['cat_a','sub_a1']));

  // 2) Budget recommendation resolver must not fall back to D.categories as a second resolver.
  const budgetSrc=fs.readFileSync('budget.js','utf8');
  assert.match(budgetSrc,/findCatIdByName\(name\)\{[\s\S]*?FinanceCategorySOT\.findByName\('expense',name\)/);
  assert.doesNotMatch(budgetSrc,/findCatIdByName\(name\)\{\s*const cat=D\.categories\.expense\.find/);

  // 3) Learned AI/OCR mappings must be canonical-ID based; legacy strings are migration input only.
  const aiSrc=fs.readFileSync('modules/ai/kategorisasi-ai.js','utf8');
  assert.match(aiSrc,/categoryId:\s*cat\.id/);
  assert.match(aiSrc,/subcategoryId:\s*sub \? sub\.id/);
  assert.match(aiSrc,/D\.learnedItemCat\[w\]=\{categoryId:/);
  const ocrSrc=fs.readFileSync('modules/shared/scan-ocr.js','utf8');
  assert.match(ocrSrc,/FinanceCategorySOT\.findById\('expense',categoryId\)/);
  assert.match(ocrSrc,/FinanceCategorySOT\.findByName\('expense',catName\)/);

  // 4) Taxonomy writers are fail-closed outside FinanceCategorySOT.
  const scanRoots=['modules/finance','modules/shared','modules/shop','modules/asset','modules/vehicle'];
  const bad=[];
  const writerRe=/D\.categories(?:\.(?:income|expense)|\[[^\]]+\])\s*(?:=|\.(?:push|splice)\s*\()/;
  function walk(dir){
    for(const n of fs.readdirSync(dir)){
      const p=dir+'/'+n; const st=fs.statSync(p);
      if(st.isDirectory()){ if(n!=='tests') walk(p); continue; }
      if(!p.endsWith('.js')||p.endsWith('finance-category-sot.js'))continue;
      fs.readFileSync(p,'utf8').split('\n').forEach((line,i)=>{if(writerRe.test(line))bad.push(`${p}:${i+1}:${line.trim()}`);});
    }
  }
  scanRoots.forEach(walk);
  assert.deepEqual(bad,[],bad.join('\n'));

  // 5) The build must load FinanceCategorySOT before its shared bootstrap consumers.
  const build=fs.readFileSync('scripts/build.js','utf8');
  assert.ok(build.indexOf("'modules/finance/finance-category-sot.js'") < build.indexOf("'modules/shared/features-helpers-global-security.js'"));

  console.log('S2501 PASS — merge/remap + budget + AI/OCR + writer-boundary + build-order');
});
