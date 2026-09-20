#!/usr/bin/env node
'use strict';
/**
 * Read-only static audit for duplicate-source and incomplete-record risks.
 * It never mutates application data and intentionally reports candidates,
 * not confirmed runtime duplicates.
 */
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const domains={
  vehicle:['modules/vehicle','D.servisLogs','D.vehicles'],
  finance:['modules/finance','D.transaksi','D.akun'],
  shop:['modules/shop','D.products','D.stock'],
  shared:['modules/shared','save()','localStorage'],
  asset:['modules/asset','D.aset','D.investasi']
};
function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const n of fs.readdirSync(dir)){const p=path.join(dir,n);const s=fs.statSync(p);if(s.isDirectory())out.push(...walk(p));else if(/\.js$/.test(n))out.push(p);}return out;}
function scan(){const result={domains:[],duplicateWriteCandidates:[],sourceOfTruthSignals:[],incompleteChecks:[]};
 for(const [name,[rel,...tokens]] of Object.entries(domains)){
  const files=walk(path.join(ROOT,rel));let hits=0;const writers=[];
  for(const file of files){const text=fs.readFileSync(file,'utf8');for(const token of tokens)if(text.includes(token))hits++;if(/\.push\(|\.unshift\(|Object\.assign\(D\./.test(text))writers.push(path.relative(ROOT,file));}
  result.domains.push({domain:name,files:files.length,signalHits:hits,writerFiles:[...new Set(writers)]});
 }
 const all=walk(path.join(ROOT,'modules'));const symbols=new Map();
 for(const file of all){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)){const n=m[1];if(!symbols.has(n))symbols.set(n,[]);symbols.get(n).push(path.relative(ROOT,file));}}
 for(const [name,files] of symbols)if(new Set(files).size>1)result.duplicateWriteCandidates.push({symbol:name,files:[...new Set(files)]});
 result.sourceOfTruthSignals.push({store:'D.servisLogs',expected:'vehicle service history',status:'declared-canonical'});
 result.sourceOfTruthSignals.push({store:'D.vehicles',expected:'vehicle records',status:'requires-runtime-validation'});
 result.sourceOfTruthSignals.push({store:'D.transaksi',expected:'finance transactions',status:'requires-runtime-validation'});
 result.sourceOfTruthSignals.push({store:'D.products',expected:'shop products',status:'requires-runtime-validation'});
 result.incompleteChecks.push('Runtime snapshots are required to confirm duplicate records.');
 result.incompleteChecks.push('Repeated names/functions are advisory and may be intentional module-local implementations.');
 return result;
}
if(require.main===module){const r=scan();console.log(JSON.stringify(r,null,2));}
module.exports={scan};
