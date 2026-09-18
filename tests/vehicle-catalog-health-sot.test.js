const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'modules/vehicle/vehicle-catalog-health-sot.js'),'utf8');

test('SOT-3D is read-only and never auto-merges',()=>{
 assert.match(src,/autoMerge:false/);
 assert.match(src,/sameNameOnlyNeverMerge:true/);
 assert.match(src,/differentOemNeverMerge:true/);
 assert.match(src,/packageVsIndividualNeverMerge:true/);
 assert.doesNotMatch(src,/VehicleCatalog\.(update|remove|removeMany|removeAll)\(/);
});

test('SOT-3D detects normalized OEM/barcode/aftermarket identity groups',()=>{
 assert.match(src,/duplicateOem/);
 assert.match(src,/duplicateBarcode/);
 assert.match(src,/duplicateAftermarketCode/);
 assert.match(src,/function vcHealthNorm/);
 assert.match(src,/duplicateOem/);
 assert.match(src,/duplicateBarcode/);
 assert.match(src,/duplicateAftermarketCode/);
});

test('SOT-3D explicitly flags same-name different-OEM as never-merge',()=>{
 assert.match(src,/different_oem_never_merge/);
 assert.match(src,/same_name_category/);
});

test('SOT-3D audits stock duplicate links and invalid catalog references',()=>{
 assert.match(src,/linkedToCatalog/);
 assert.match(src,/invalidLinks/);
 assert.match(src,/unlinked/);
});

test('SOT-3D loads before catalog consumers',()=>{
 const build=fs.readFileSync(path.join(root,'scripts/build.js'),'utf8');
 const h=build.indexOf("'modules/vehicle/vehicle-catalog-health-sot.js'");
 const c=build.indexOf("'modules/vehicle/vehicle-part-sot.js'");
 const ui=build.indexOf("'modules/vehicle/vehicle-catalog-ui.js'");
 assert.ok(h>=0&&c>=0&&ui>=0&&h<c&&h<ui);
});

test('SOT-3D functional rules: OEM normalization, different OEM, package split, stock integrity',()=>{
 const vm=require('node:vm');
 const context={window:{},console}; vm.createContext(context); vm.runInContext(src,context);
 const H=context.window.VehicleCatalogHealthSOT;
 const rows=[
  {id:'a',partName:'Gasket',category:'Mesin',oemCode:'1210AKZR600',compatibleVehicleIds:['veh_1']},
  {id:'b',partName:'Gasket',category:'Mesin',oemCode:'1210-AKZR-600',compatibleVehicleIds:['veh_1']},
  {id:'c',partName:'Gasket',category:'Mesin',oemCode:'22110KZR600',compatibleVehicleIds:['veh_1']},
  {id:'d',partName:'Gasket Set',category:'Mesin',oemCode:'SET-001',compatibleVehicleIds:['veh_1']},
 ];
 const report=H.auditCatalog(rows);
 assert.ok(report.duplicateOem.length>=1);
 const diff=report.candidates.find(x=>x.ids.includes('a')&&x.ids.includes('c'));
 assert.ok(diff); assert.ok(diff.reason.includes('different_oem_never_merge'));
 const pkg=report.candidates.find(x=>x.ids.includes('a')&&x.ids.includes('d'));
 assert.ok(pkg); assert.ok(pkg.reason.includes('package_vs_individual_never_merge'));
 assert.equal(pkg.autoMerge,false);
 const stock=H.auditStock([{catalogPartId:'a'},{catalogPartId:'a'},{catalogPartId:'missing'},{name:'Gasket'}],rows);
 assert.equal(stock.linkedToCatalog[0].catalogPartId,'a');
 assert.equal(stock.invalidLinks.length,1);
 assert.equal(stock.unlinked.length,1);
});
