const fs=require('fs');const path=require('path');
const root=process.cwd();
const lazyClusters={
  vehicleCatalog:['modules/vehicle/vehicle-scanner.js','modules/vehicle/sparepart-scanner.js','modules/vehicle/sparepart-scanner-ui.js','modules/vehicle/sparepart-ocr.js','modules/vehicle/sparepart-ocr-parser.js','modules/vehicle/sparepart-ocr-catalog-link.js','modules/vehicle/sparepart-ocr-catalog-detail.js','modules/vehicle/sparepart-ocr-catalog-add.js','modules/vehicle/sparepart-ocr-orchestrator.js','modules/vehicle/vehicle-catalog-import.js','modules/vehicle/vehicle-catalog-import-ui.js','modules/vehicle/vehicle-catalog-import-stock-push.js','modules/vehicle/vehicle-catalog-web-import.js','modules/vehicle/vehicle-catalog-web-import-ui.js'],
  hondaPdf:['modules/vehicle/honda-pdf-import.js','modules/vehicle/honda-pdf-import-extract.js','modules/vehicle/honda-pdf-import-parse.js','modules/vehicle/honda-pdf-import-commit.js','modules/vehicle/honda-pdf-import-ui.js'],
  dataHealth:['data-health-check.js'],
  laporanExport:['laporan-export.js'],
  shopPdf:['modules/business/shop-pdf-import-ui.js']
};
const allLazy=new Set(Object.values(lazyClusters).flat());
const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
const eager=[...build.matchAll(/['"]([^'"]+\.js)['"]/g)].map(m=>m[1]).filter(p=>fs.existsSync(path.join(root,p))&&!allLazy.has(p)&&!p.includes('app-bundle-'));
function topSymbols(src){let depth=0, out=new Set(); for(const line of src.split(/\n/)){const code=line.replace(/\/\/.*$/,''); if(depth===0){for(const m of code.matchAll(/\b(?:let|const|var|function|class)\s+([A-Za-z_$][\w$]*)/g))out.add(m[1]);for(const m of code.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g))out.add(m[1]);} depth += (code.match(/{/g)||[]).length-(code.match(/}/g)||[]).length; if(depth<0)depth=0;}return [...out];}
function refs(symbol,file){const s=fs.readFileSync(path.join(root,file),'utf8').replace(/\/\/.*$/gm,''); const re=new RegExp('\\b'+symbol.replace(/[$]/g,'\\$&')+'\\b','g'); return (s.match(re)||[]).length;}
const ownership=[]; const potential=[];
for(const [cluster,files] of Object.entries(lazyClusters))for(const file of files){if(!fs.existsSync(path.join(root,file)))throw new Error('missing '+file);for(const symbol of topSymbols(fs.readFileSync(path.join(root,file),'utf8'))){ownership.push({cluster,file,symbol}); const hits=eager.filter(f=>refs(symbol,f)>0); if(symbol.length>=4&&hits.length)potential.push({cluster,file,symbol,eagerConsumers:hits.slice(0,8),consumerCount:hits.length});}}
const duplicate=new Map();for(const x of ownership){if(!duplicate.has(x.symbol))duplicate.set(x.symbol,[]);duplicate.get(x.symbol).push(x.file)}
const duplicates=[...duplicate.entries()].filter(([,v])=>v.length>1).map(([symbol,files])=>({symbol,files}));
const critical=['gdriveAccessToken','gdrivePendingAfterAuth','gdriveTokenScope','gdriveTokenExpiresAt','gdriveUserEmail','gdriveTokenClient'];
const criticalOwners=critical.map(symbol=>({symbol,owners:ownership.filter(x=>x.symbol===symbol).map(x=>x.file),eagerOwners:eager.filter(f=>refs(symbol,f)>0).slice(0,20)}));
const result={eagerCount:eager.length,lazyFiles:allLazy.size,ownershipCount:ownership.length,duplicateGlobalDefinitions:duplicates,potentialEagerConsumers:potential,criticalOwners};
console.log(JSON.stringify(result,null,2));
if(criticalOwners.some(x=>x.owners.length))process.exitCode=0;
