'use strict';
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const A=fs.readFileSync(path.join(root,'app-bundle-a.min.js'),'utf8');
const B=fs.readFileSync(path.join(root,'app-bundle-b.min.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prod=fs.readFileSync(path.join(root,'app_production.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const checks=[];
function pass(name,ok,detail=''){checks.push({name,ok,detail});if(!ok)console.error(`FAIL ${name}${detail?`: ${detail}`:''}`);}
function count(re,s){return (s.match(re)||[]).length;}
function syntax(file){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});return r.status===0?r.stdout||'':r.stderr||'syntax error';}

pass('bundle-a syntax',syntax(path.join(root,'app-bundle-a.min.js'))==='');
pass('bundle-b syntax',syntax(path.join(root,'app-bundle-b.min.js'))==='');
pass('no direct partsStock assignment',!/(?:D|g\.D)\.partsStock\s*=/.test(A+'\n'+B));
pass('no direct partsStock mutator',!/(?:D|g\.D)\.partsStock\.(?:push|splice|unshift|pop|shift|sort|reverse)\s*\(/.test(A+'\n'+B));
pass('no indexed partsStock assignment',!/(?:D|g\.D)\.partsStock\s*\[[^\]]+\]\s*=/.test(A+'\n'+B));
for(const method of ['create','update','remove','restoreRows','replaceSnapshot','setQtyMap','setQty','adjustQty','consume','applyDeltas'])
  pass(`StockCommandSOT export ${method}`,new RegExp(`\\b${method}\\s*[,}]`).test(B.slice(B.indexOf('const api={VERSION,find')))||new RegExp(`\\b${method}\\s*[,}]`).test(B.slice(B.indexOf('const api={VERSION'))));
pass('StockCommandSOT exposed',/g\.StockCommandSOT=api;/.test(B));
pass('Service SOT exposed',/window\.VehicleServiceSOT=VehicleServiceSOT;/.test(B));
pass('Service SOT ready API',/ensureReady:vehicleServiceSotEnsureReady/.test(B)&&/isReady:vehicleServiceSotIsReady/.test(B));
pass('Service interval writer delegates to SOT',/VehicleCarNotesSOT\.setServiceInterval\(vid,cat/.test(B));
const versions=[...new Set((A+B+index+prod+sw).match(/s2041-1-part-sot-hardening-\d+/g)||[])];
pass('single runtime build version',versions.length===1,versions.join(', '));
const buildNum=((versions[0]||'').match(/-(\d+)$/)||[])[1]||'';
pass('build version has numeric suffix (version-agnostic, tolerates build bumps)',/^\d+$/.test(buildNum)&&Number(buildNum)>=2170,versions.join(', '));
pass(`index cache bust matches build ${buildNum}`,!!buildNum&&!new RegExp('\\?v=(?!'+buildNum+'\\b)\\d+').test(index));
pass(`production cache bust matches build ${buildNum}`,!!buildNum&&!new RegExp('\\?v=(?!'+buildNum+'\\b)\\d+').test(prod));
pass('service master artifact present',fs.existsSync(path.join(root,'modules/vehicle/service-master-data.generated.js')));
pass('P4.6 alias test present',fs.existsSync(path.join(root,'tests/s2152-p4-6-zero-alias-write.test.js')));
const failed=checks.filter(x=>!x.ok);
console.log(`P4.7 FINAL STATIC GATE: ${checks.length-failed.length}/${checks.length} PASS`);
if(failed.length){process.exitCode=1;}
