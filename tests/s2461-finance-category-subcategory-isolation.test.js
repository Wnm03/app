'use strict';
// S2461 — Finance category/subcategory type isolation + atomic persistence.
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function ctxFor({saveResult=true}={}){
  const els={catName:{value:''},catEmoji:{value:'💰'},subCatName:{value:''},txModal:{classList:{contains:()=>false}}};
  const D={
    categories:{income:[{id:'i1',name:'Transport',emoji:'💰',subs:[{id:'is1',name:'Gaji'}]}],expense:[{id:'e1',name:'Transport',emoji:'💸',subs:[{id:'es1',name:'Gaji'}]}]},
    transactions:[
      {id:'in1',type:'income',category:'Transport',subcategory:'Gaji'},
      {id:'ex1',type:'expense',category:'Transport',subcategory:'Gaji'}
    ],
    bills:[{id:'b1',category:'Transport',subcategory:'Gaji'}]
  };
  const ctx=loadSource(['modules/finance/kategori.js'],{
    D,catEditIdx:null,curCatModalType:'income',catModalCallback:null,
    subCatParentId:'i1',subCatParentType:'income',subCatEditId:null,
    document:{getElementById:id=>els[id]||{value:'',className:'',style:{},textContent:''}},
    save:()=>saveResult,toast:()=>{},closeModal:()=>{},renderCatList:()=>{},populateCatFilter:()=>{},populateKeuFilters:()=>{},refreshTxCatIfOpen:()=>{},refreshAfterMutation:()=>{},populateSubSelect:()=>{},escapeHtml:s=>s
  },['saveCat','saveSubCat','getCatByType']);
  return {ctx,D,els};
}

test('S2461 category rename is isolated by transaction type',()=>{
 const {ctx,D,els}=ctxFor(); ctx.catEditIdx=0; ctx.curCatModalType='income'; els.catName.value='Transport Baru';
 assert.equal(ctx.saveCat(),true);
 assert.equal(D.transactions.find(t=>t.id==='in1').category,'Transport Baru');
 assert.equal(D.transactions.find(t=>t.id==='ex1').category,'Transport');
 assert.equal(D.bills[0].category,'Transport');
});

test('S2461 subcategory rename is isolated by type + parent category',()=>{
 const {ctx,D,els}=ctxFor(); ctx.subCatParentId='i1';ctx.subCatParentType='income';ctx.subCatEditId='is1';els.subCatName.value='Gaji Baru';
 assert.equal(ctx.saveSubCat(),true);
 assert.equal(D.transactions.find(t=>t.id==='in1').subcategory,'Gaji Baru');
 assert.equal(D.transactions.find(t=>t.id==='ex1').subcategory,'Gaji');
 assert.equal(D.bills[0].subcategory,'Gaji');
});

test('S2461 getCatByType never falls back to the opposite transaction type',()=>{
 const {ctx}=ctxFor();
 assert.equal(ctx.getCatByType('Transport','expense').name,'Transport');
 assert.equal(ctx.getCatByType('Transport','missing'),null);
});

test('S2461 duplicate category name is rejected within same type',()=>{
 const {ctx,D,els}=ctxFor(); ctx.curCatModalType='income';ctx.catEditIdx=null;els.catName.value='transport';
 assert.equal(ctx.saveCat(),false); assert.equal(D.categories.income.length,1);
});

test('S2461 duplicate subcategory name is rejected within same parent',()=>{
 const {ctx,D,els}=ctxFor(); ctx.subCatParentId='i1';ctx.subCatParentType='income';ctx.subCatEditId=null;els.subCatName.value='gaji';
 assert.equal(ctx.saveSubCat(),false); assert.equal(D.categories.income[0].subs.length,1);
});

test('S2461 category mutation rolls back fully when save() rejects',()=>{
 const {ctx,D,els}=ctxFor({saveResult:false}); ctx.curCatModalType='income';ctx.catEditIdx=0;els.catName.value='Transport Baru';
 assert.equal(ctx.saveCat(),false);
 assert.equal(D.categories.income[0].name,'Transport');
 assert.equal(D.transactions.find(t=>t.id==='in1').category,'Transport');
});

test('S2461 subcategory mutation rolls back fully when save() rejects',()=>{
 const {ctx,D,els}=ctxFor({saveResult:false}); ctx.subCatParentId='i1';ctx.subCatParentType='income';ctx.subCatEditId='is1';els.subCatName.value='Gaji Baru';
 assert.equal(ctx.saveSubCat(),false);
 assert.equal(D.categories.income[0].subs[0].name,'Gaji');
 assert.equal(D.transactions.find(t=>t.id==='in1').subcategory,'Gaji');
});
