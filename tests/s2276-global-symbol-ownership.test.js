const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const ROOT=process.cwd();
const lazy=[
'modules/vehicle/vehicle-scanner.js','modules/vehicle/sparepart-scanner.js','modules/vehicle/sparepart-scanner-ui.js','modules/vehicle/sparepart-ocr.js','modules/vehicle/sparepart-ocr-parser.js','modules/vehicle/sparepart-ocr-catalog-link.js','modules/vehicle/sparepart-ocr-catalog-detail.js','modules/vehicle/sparepart-ocr-catalog-add.js','modules/vehicle/sparepart-ocr-orchestrator.js','modules/vehicle/vehicle-catalog-import.js','modules/vehicle/vehicle-catalog-import-ui.js','modules/vehicle/vehicle-catalog-import-stock-push.js','modules/vehicle/vehicle-catalog-web-import.js','modules/vehicle/vehicle-catalog-web-import-ui.js',
'modules/vehicle/honda-pdf-import.js','modules/vehicle/honda-pdf-import-extract.js','modules/vehicle/honda-pdf-import-parse.js','modules/vehicle/honda-pdf-import-commit.js','modules/vehicle/honda-pdf-import-ui.js','data-health-check.js','laporan-export.js','modules/business/shop-pdf-import-ui.js'];
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const build=read('scripts/build.js');
const loader=read('modules/shared/feature-lazy-loader.js');
const helpers=read('modules/shared/features-helpers-global-security.js');

test('S2276: all audited lazy sources remain outside eager build',()=>{
 for(const f of lazy){assert.ok(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);assert.equal(build.includes(`'${f}'`),false,`lazy source is eager: ${f}`);assert.equal(build.includes(`"${f}"`),false,`lazy source is eager: ${f}`);}
});

test('S2276: each lazy cluster has canonical loader ownership',()=>{
 for(const name of ['ensureVehicleCatalogFeatureScripts','ensureHondaPdfImportScripts','ensureDataHealthScripts','ensureLaporanExportScripts','ensureShopPdfImportScripts']){
   assert.match(loader,new RegExp(`function ${name}\\s*\\(`),`missing ${name}`);
   assert.match(loader,new RegExp(`window\\.${name}\\s*=`),`not exposed ${name}`);
 }
});

test('S2276: lazy API dispatchers point to demand loaders',()=>{
 const pairs=[['HondaPdfImportUI','ensureHondaPdfImportScripts'],['runDataHealthCheck','ensureDataHealthScripts'],['DataHealth','ensureDataHealthScripts'],['exportLaporanPDF','ensureLaporanExportScripts'],['exportLaporanImage','ensureLaporanExportScripts'],['ShopPdfImportUI','ensureShopPdfImportScripts']];
 for(const [api,loaderName] of pairs){assert.match(helpers,new RegExp(`${api}:\\s*typeof ${loaderName}==='function'\\?${loaderName}:null`),`dispatcher ownership missing for ${api}`);}
});

test('S2276: Google Drive auth state has one eager canonical owner',()=>{
 const eager=read('gdrive-backup.js'); const lazyReport=read('laporan-export.js');
 for(const s of ['gdriveAccessToken','gdrivePendingAfterAuth','gdriveTokenScope','gdriveTokenExpiresAt','gdriveUserEmail','gdriveTokenClient']){
   assert.match(eager,new RegExp(`(?:let|const|var) ${s}\\s*=`),`missing eager owner ${s}`);
   assert.doesNotMatch(lazyReport,new RegExp(`(?:let|const|var) ${s}\\s*=`),`duplicate lazy owner ${s}`);
 }
 const posG=build.indexOf("'gdrive-backup.js'"); const posSheets=build.indexOf("'sheets-sync.js'"); assert.ok(posG>=0,'gdrive-backup absent from build'); assert.ok(posSheets<0||posG<posSheets,'gdrive owner must initialize before sheets-sync');
});

