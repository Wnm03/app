'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=()=>fs.readFileSync('modules/shared/modals.js','utf8');
const raw=(type)=>new RegExp('(?<!data-)'+type+'=\\\\"([^\\\\"]*)\\\\"','g');

test('S2523 migrates safe zero-argument input/change handlers',()=>{
 const s=src().replace(/\\"/g,'"');
 for(const name of [
  'DeliveryPlanUI.calc','Etalase.renderMergeList','Sparepart.filterStockCatOptions','TitipanExpenseUI.onNoteInput',
  'Torsi.calcExt','Torsi.onManualInput','Torsi.renderList','Tukang.calcBorCalc','Tukang.calcDayUpah',
  'Tukang.onBorCalcCustomNameInput','WorthIt.PW.onScanAmtInput','WorthIt.syncDiskon','WorthIt.syncDiskonList',
  'onGlobalSearchInput','BusinessFlowPresenter.onTransferOriginChange','DeliveryPlanUI.onProductChange',
  'InvestmentListUI.onAssetLinkChange','LinkTx.onKatChange','LinkTx.renderList','Renov.toggleHargaTotalFields',
  'Renov.updateDeductionOwnerVisibility','RenovCalc.onMatSatuanChange','RenovCalc.toggleHitungUkuran',
  'Sparepart.syncCategoryComponentIdentity','Sparepart.syncCategoryServiceComponent','Tukang.onBorCalcJenisChange',
  'Tukang.onBorCalcSatuanChange','Tukang.toggleBorCalcUkuran','WorthIt.onMethodChange','WorthIt.toggleDiskon',
  'WorthIt.toggleDiskonList','WorthIt.toggleSudahPunya'
 ]) assert.ok(s.includes('data-oninput="'+name+'"')||s.includes('data-onchange="'+name+'"'),name);
 for(const x of ['DeliveryPlanUI.calc()','Etalase.renderMergeList()','Torsi.calcExt()','WorthIt.onMethodChange()']) assert.equal(s.includes('oninput="'+x+'"')||s.includes('onchange="'+x+'"'),false,x);
});

test('S2523 preserves event/element/value arguments through dispatcher metadata',()=>{
 const s=src().replace(/\\"/g,'"');
 for(const [name,arg] of [
  ['GoldImport.importXLSXFile','$event'],['Servis.addServiceChecklistPhoto','$event'],['ShopPdfImportUI.onFileChange','$event'],
  ['VehicleCatalogImportUI.onFileChange','$event'],['VehicleCatalogUI.addPhoto','$event'],['ShopKatalogDinamisPresenter.onVehicleChange','$el'],
  ['LinkTx.renderList','$value'],['Servis.onReceiptScanCostInput','$value'],['VehicleCatalogUI.onSearchInput','$value'],
  ['Torsi.onVehicleChange','$el'],['InvestmentListUI.onCustodianSelectChange','$value']
 ]) {
  assert.ok(s.includes('data-oninput="'+name+'" data-oninput-args=\'["'+arg+'"]\'')||s.includes('data-onchange="'+name+'" data-onchange-args=\'["'+arg+'"]\''),name);
 }
});

test('S2523 assignment wrappers do not use eval and preserve targets',()=>{
 const s=src().replace(/\\"/g,'"');
 assert.match(s,/function _clearPromptModalError\(\)\{[^}]*promptModalError/);
 assert.match(s,/function _sanitizePinPrompt\(el\)\{[^}]*pinPromptError/);
 assert.match(s,/function _setAutoFilledZero\(el\)\{[^}]*autoFilled/);
 assert.doesNotMatch(s,/function _(?:clearPromptModalError|sanitizePinPrompt|setAutoFilledZero)[\s\S]{0,300}\beval\s*\(/);
});

test('S2523 deferred inline surface was subsequently eliminated by S2524',()=>{
 const s=src().replace(/\\"/g,'"');
 const counts={};
 for(const t of ['oninput','onchange','onblur','onkeydown']) counts[t]=(s.match(new RegExp('(?<!data-)'+t+'=\"','g'))||[]).length;
 assert.deepEqual(counts,{oninput:0,onchange:0,onblur:0,onkeydown:0});
 for(const name of [
  '_tkBorTanggalOnInput','_sparepartNameOnInput','_stockNameOnInput',
  '_billAmtOnInput','_titipanExpenseAmtOnInput','_billAmtOnBlur','_pyTargetBulananOnBlur',
  '_rcMatHargaOnBlur','_renovItemHargaTotalOnBlur','_titipanExpenseAmtOnBlur',
  '_tkBorCalcHargaOnBlur','_tkBorTotalSharedOnBlur','_tkDayBorTotalOnBlur',
  '_tkUpahJamBaruOnBlur','_whBorTotalOnBlur','_hideSuggestBoxDelayed','_promptModalEnter','_pinPromptEnter'
 ]) assert.match(s,new RegExp('function '+name+'\\('),name);
});
