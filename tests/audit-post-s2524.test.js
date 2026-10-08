'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=()=>fs.readFileSync('modules/shared/modals.js','utf8').replace(/\\"/g,'"');
const inline=(type)=>new RegExp('(?<!data-)'+type+'="','g');

test('S2524 removes the remaining inline event attributes from modals.js',()=>{
 const s=src();
 assert.equal((s.match(inline('oninput'))||[]).length,0);
 assert.equal((s.match(inline('onchange'))||[]).length,0);
 assert.equal((s.match(inline('onblur'))||[]).length,0);
 assert.equal((s.match(inline('onkeydown'))||[]).length,0);
});

test('S2524 preserves the five compound input handler sequences through named wrappers',()=>{
 const s=src();
 const pairs=[
  ['_billAmtOnInput',"updateAmtPreview('billAmt','billAmtPreview');updateBillSharedPreview()"],
  ['_tkBorTanggalOnInput','Tukang.renderSharedBorWorkerList();Tukang.calcSharedBorongan()'],
  ['_sparepartNameOnInput',"autoFillSparepartCode();simpleAutocompleteInput('sparepartName','sparepartNameBox',acSparepartCatNames);Sparepart.autoSuggestInterval();Sparepart.updateMasterCatBadgeLive()"],
  ['_stockNameOnInput',"autoFillStockCode();simpleAutocompleteInput('stockName','stockNameBox',acStockNames)"],
  ['_titipanExpenseAmtOnInput',"updateAmtPreview('titipanExpenseAmt','titipanExpenseAmtPreview');TitipanExpenseUI.onAmtInput()"]
 ];
 for(const [fn,body] of pairs){
  assert.ok(s.includes('function '+fn+'(){'+body+';}'),fn);
  assert.ok(s.includes('data-oninput="'+fn+'"'),fn);
 }
});

test('S2524 preserves the seventeen blur sequences and delayed suggest timing',()=>{
 const s=src();
 const pairs=[
  ['_whBorTotalOnBlur',"evalAmtExpr('whBorTotal');Payroll.onJenisHariChange()"],
  ['_pyTargetBulananOnBlur',"evalAmtExpr('pyTargetBulanan');Payroll.saveTargetBulanan()"],
  ['_renovItemHargaTotalOnBlur',"evalAmtExpr('renovItemHargaTotal');Renov.syncHargaTotalPreview()"],
  ['_rcMatHargaOnBlur',"evalAmtExpr('rcMatHarga');RenovCalc.calcMaterial()"],
  ['_tkUpahJamBaruOnBlur',"evalAmtExpr('tkUpahJamBaru');Tukang.suggestLembur()"],
  ['_tkDayBorTotalOnBlur',"evalAmtExpr('tkDayBorTotal');Tukang.calcDayUpah()"],
  ['_tkBorTotalSharedOnBlur',"evalAmtExpr('tkBorTotalShared');Tukang.calcSharedBorongan()"],
  ['_tkBorCalcHargaOnBlur',"evalAmtExpr('tkBorCalcHarga');Tukang.calcBorCalc()"],
  ['_billAmtOnBlur',"evalAmtExpr('billAmt');updateBillSharedPreview()"],
  ['_titipanExpenseAmtOnBlur',"evalAmtExpr('titipanExpenseAmt');TitipanExpenseUI.onAmtInput()"]
 ];
 for(const [fn,body] of pairs){
  assert.ok(s.includes('function '+fn+'(){'+body+';}'),fn);
  assert.ok(s.includes('data-onblur="'+fn+'"'),fn);
 }
 for(const id of ['pNameBox','prNameBox','billNameBox','sparepartNameBox','sparepartCodeBox','stockNameBox','stockCodeBox'])
  assert.ok(s.includes(`data-onblur="_hideSuggestBoxDelayed" data-onblur-args='[\"${id}\"]'`),id);
 assert.ok(s.includes('function _hideSuggestBoxDelayed(id){setTimeout(()=>hideSuggestBox(id),150);}'));
});

test('S2524 preserves Enter-key behavior through $event dispatcher args',()=>{
 const s=src();
 assert.match(s,/function _promptModalEnter\(event\)\{if\(event&&event\.key==='Enter'\)\{event\.preventDefault\(\);_promptModalSubmit\(\);\}\}/);
 assert.match(s,/function _pinPromptEnter\(event\)\{if\(event&&event\.key==='Enter'\)\{event\.preventDefault\(\);_pinPromptSubmit\(\);\}\}/);
 assert.match(s,/data-onkeydown="_promptModalEnter" data-onkeydown-args='\["\$event"\]'/);
 assert.match(s,/data-onkeydown="_pinPromptEnter" data-onkeydown-args='\["\$event"\]'/);
});

test('S2524 wrappers do not introduce eval or inline event code',()=>{
 const s=src();
 const block=s.slice(s.indexOf('function _clearPromptModalError'),s.indexOf('const MODAL_HTML'));
 assert.doesNotMatch(block,/\beval\s*\(/);
 assert.doesNotMatch(s,/(?<!data-)on(?:input|change|blur|keydown)="/);
 assert.match(fs.readFileSync('modules/vehicle/service-history-bulk-identity-editor.js','utf8'),/data-onchange="Servis\.syncBulkHistoryComponentOptions"/);
 assert.match(fs.readFileSync('modules/vehicle/service-history-bulk-identity-editor.js','utf8'),/data-onchange="Servis\.refreshBulkHistoryIdentityPreview"/);
});
