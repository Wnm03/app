#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const db=JSON.parse(fs.readFileSync(path.join(root,'data/database-kategori-komponen-servis.json'),'utf8'));
const generated=require(path.join(root,'modules/vehicle/service-master-data.generated.js'));
const rules=fs.readFileSync(path.join(root,'car-notes.js'),'utf8');
const tests=fs.readdirSync(path.join(root,'tests'));
const findings=[];
const ids=db.components.map(c=>c.componentId);
if(new Set(ids).size!==ids.length)findings.push({code:'DUPLICATE_COMPONENT_ID'});
if(db.components.length!==102)findings.push({code:'UNEXPECTED_COMPONENT_COUNT',count:db.components.length});
try{assert.deepStrictEqual(generated.SERVICE_MASTER_DATA,db);}catch(e){findings.push({code:'GENERATED_MASTER_DRIFT',message:e.message});}
for(const c of db.components.filter(x=>x.intervalAxes==='independent')){
  if(!(Number(c.intervalKm)>0||Number(c.intervalTimeMonths)>0))findings.push({code:'INDEPENDENT_AXIS_WITHOUT_SOT_INTERVAL',componentId:c.componentId});
  const rule=new RegExp(`[\\'\"]${c.componentId}[\\'\"]\\s*:\\s*\\{([^}]*)\\}`).exec(rules);
  if(!rule)findings.push({code:'INDEPENDENT_AXIS_WITHOUT_RUNTIME_RULE',componentId:c.componentId});
  else if(!/inspectKm\s*:/.test(rule[1]))findings.push({code:'INDEPENDENT_AXIS_WITHOUT_INSPECTION_RULE',componentId:c.componentId});
}
const vbelt=db.components.find(c=>c.componentId==='v-belt-cvt');
if(!vbelt||!Array.isArray(vbelt.intervalGuidelineOverrides)||!vbelt.intervalGuidelineOverrides.some(x=>x.modelYears&&x.modelYears.includes(2012)&&x.intervalKm===24000))findings.push({code:'KZR_2012_GUIDELINE_SCOPE_MISSING'});
for(const file of ['service-reminder-independent-interval-axes-s2150.test.js','service-reminder-model-year-guideline-s2151.test.js','service-reminder-slide-piece-replacement-reset-s2145.test.js','service-reminder-filter-fuel-pump-dual-interval-s2146.test.js'])if(!tests.includes(file))findings.push({code:'ACCUMULATED_REGRESSION_TEST_MISSING',file});
const policyReviews=db.components.filter(c=>c.needsReview===true&&/berbeda dari metadata existing|conflict|perlu keputusan kebijakan/i.test([c.catatan,c.catatanTambahan].filter(Boolean).join(' '))).map(c=>({componentId:c.componentId,intervalLabel:c.intervalLabel,source:c.sumber||null}));
const result={version:'S2151',mode:'read-only-cumulative-chain-audit',baseline:'app-main (23).zip',componentsScanned:db.components.length,independentAxisComponents:db.components.filter(c=>c.intervalAxes==='independent').map(c=>c.componentId),substantiveFindings:findings.length,findings,policyReviews};
console.log(JSON.stringify(result,null,2));
if(findings.length)process.exitCode=2;
