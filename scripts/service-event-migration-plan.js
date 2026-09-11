#!/usr/bin/env node
/**
 * DATA-MIGRATION-09
 * Deterministic, read-only repair planner.
 * Input JSON: {servisLogs:[], sparepartCats:[], masterCategory:[]}
 * Output: JSON plan. No writes.
 */
const fs=require('node:fs');
const f=process.argv[2];
if(!f){console.log(JSON.stringify({status:'READY',mode:'READ_ONLY',message:'Pass JSON export path.'},null,2));process.exit(0);}
const d=JSON.parse(fs.readFileSync(f,'utf8'));
const logs=Array.isArray(d.servisLogs)?d.servisLogs:[];
const cats=Array.isArray(d.sparepartCats)?d.sparepartCats:[];
const masters=Array.isArray(d.masterCategory)?d.masterCategory:[];
const catById=new Map(cats.filter(Boolean).map(c=>[c.id,c]));
const masterById=new Map(masters.filter(Boolean).map(c=>[c.id,c]));
const plan=[];

for(const log of logs){
  const categoryId=log?.categoryId ?? log?.catId ?? null;
  const cat=categoryId?catById.get(categoryId):null;
  const masterCategoryId=log?.masterCategoryId ?? cat?.masterCategoryId ?? null;
  const issues=[];
  if(categoryId && !cat) issues.push('ORPHAN_CATEGORY');
  if(!masterCategoryId) issues.push('MISSING_MASTER_CATEGORY');
  if(masterCategoryId && !masterById.has(masterCategoryId)) issues.push('INVALID_MASTER_CATEGORY');
  if(!categoryId && !masterCategoryId) issues.push('UNRESOLVED_EVENT_IDENTITY');

  if(issues.length){
    plan.push({
      id:log?.id??null,
      item:log?.item??log?.name??null,
      proposed:{
        categoryId:cat?.id??categoryId??null,
        masterCategoryId:masterCategoryId??cat?.masterCategoryId??null
      },
      issues,
      action:'REVIEW_REQUIRED'
    });
  }
}
console.log(JSON.stringify({
  status:'PLAN_ONLY',
  destructive:false,
  total_logs:logs.length,
  repair_candidates:plan.length,
  plan
},null,2));
