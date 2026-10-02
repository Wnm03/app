const fs=require('fs');
const path=require('path');
const root=process.cwd();
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function stripComments(s){return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');}
function sliceFunction(src,name){
 const clean=stripComments(src);
 const start=Math.max(clean.indexOf(`function ${name}`),clean.indexOf(`async function ${name}`));
 if(start<0)return '';
 const open=clean.indexOf('{',start); if(open<0)return '';
 let depth=0;
 for(let i=open;i<clean.length;i++){if(clean[i]==='{')depth++;else if(clean[i]==='}'&&--depth===0)return clean.slice(start,i+1);}
 return '';
}
const dispatcher=[
 ['HondaPdfImportUI','ensureHondaPdfImportScripts'],['runDataHealthCheck','ensureDataHealthScripts'],['DataHealth','ensureDataHealthScripts'],
 ['exportLaporanPDF','ensureLaporanExportScripts'],['exportLaporanImage','ensureLaporanExportScripts'],['ShopPdfImportUI','ensureShopPdfImportScripts']
];
const results=[];
const helper=read('modules/shared/features-helpers-global-security.js');
for(const [api,loader] of dispatcher){const re=new RegExp(`${api}\\s*:\\s*typeof ${loader}===['"]function['"]\\?${loader}:null`);results.push({consumer:'modules/shared/features-helpers-global-security.js',api,loader,pass:re.test(helper)});}
for(const [consumer,fnName,loader,api] of [
 ['modules/finance/tx-stok-sparepart.js','txStockScanPartVia','ensureVehicleCatalogFeatureScripts','SparepartScanner'],
 ['modules/shared/action-wrappers.js','laporanFabExportPDF','ensureLaporanExportScripts','exportLaporanPDF']
]){
 const fn=sliceFunction(read(consumer),fnName); const loaderPos=fn.indexOf(loader), apiPos=fn.indexOf(api);
 results.push({consumer,fnName,loader,api,pass:!!fn&&loaderPos>=0&&apiPos>loaderPos,functionFound:!!fn});
}
const vars=['_vehicleCatalogFeatureLoadPromise','_hondaPdfFeatureLoadPromise','_dataHealthFeatureLoadPromise','_laporanExportFeatureLoadPromise','_shopPdfImportFeatureLoadPromise'];
const lazy=read('modules/shared/feature-lazy-loader.js');
for(const v of vars)results.push({consumer:'modules/shared/feature-lazy-loader.js',api:v,pass:new RegExp(v+'\\s*=\\s*null').test(lazy)});
console.log(JSON.stringify({contractCount:results.length,passCount:results.filter(x=>x.pass).length,failCount:results.filter(x=>!x.pass).length,results},null,2));
if(results.some(x=>!x.pass))process.exitCode=1;
