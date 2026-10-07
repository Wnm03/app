/* a11y-pressed-native.js (S256AI) -- single writer of aria-pressed for NATIVE <button class="chip-btn"> toggles / single-select pickers.
   One-way: class "active" -> aria-pressed. Never writes class, role or tabindex (native buttons already have them).
   Strict allowlist (container id / self id / data-action). Tab-like groups (WorthIt.switchTab) and plain action buttons are NOT included.
   Controls inside .segmented-control stay owned by S1934. */
const _A11Y_NATIVE_CONTAINERS=['txListPeriodeChips','periodeChips','shopPeriodeChips','lapPeriodeChips','cnPeriodeChips','brMonthChips','brBufferChips','budgetPeriodPicker','budgetIconPicker','fiAssetScopePicker','ongkirMetodeToggle','dpMetodeToggle','importKatalogTargetToggle','importShopExcelTargetToggle','shopPdfImportTargetToggle','shopScanTargetToggle','shopJsonImportModeToggle'];
const _A11Y_NATIVE_SELF=['txListPeriodeChipBulan','accIncludeBtn','assetZakatableBtn','assetTradableBtn','piutangLunasBtn','debtLunasBtn','pStockKoreksiBtn','bModKeuangan','bModCarnotes','bModShop','bModAset','bModRenov','bModPensiunZakat','bModHabit','bModLain'];
// Dynamic (re-rendered) single-select groups without a stable container id: matched by data-action, re-synced after re-render by the S256AG hook.
const _A11Y_NATIVE_ACTIONS=['setDashServisVehFilter','FuelDashboard.switchVehicle','FuelTrendDashboard.switchVehicle','FuelCompare.setSort','Kasir.setCategoryFilter','_dashCashProjSetBillWindowMode','CashFlowProjectionPresenter._setBillWindowMode'];
// Deliberately excluded (contract test forces every chip-btn template into one of the lists): tabs need aria-selected (separate session), the rest are plain action/expander buttons.
const _A11Y_NATIVE_EXCLUDED_ACTIONS=['WorthIt.switchTab','pickAssetScanCandidate','applyQuickScan','BusinessFlowPresenter.tapTransferChip','BusinessFlowPresenter.tapPurchaseOrderBatchChip','Servis.selectCatalogRecommendation','Servis.confirmPartialCatalogMatch','BudgetReko.applyByIndex','_dashCashProjToggleSettings','CashFlowProjectionPresenter.toggleSettings'];
const _A11Y_NATIVE_SELECTOR=_A11Y_NATIVE_CONTAINERS.map(function(id){return '#'+id+' button.chip-btn';}).concat(_A11Y_NATIVE_SELF.map(function(id){return 'button.chip-btn#'+id;}),_A11Y_NATIVE_ACTIONS.map(function(a){return 'button.chip-btn[data-action="'+a+'"]';})).join(',');
function _a11yNativeEligible(el){
if(!el||el.tagName!=='BUTTON') return false;
if(el.closest&&el.closest('.segmented-control')) return false;
return true;
}
function _a11yNativeSyncList(list){
let n=0;
for(let i=0;i<list.length;i++){
const el=list[i];
if(!_a11yNativeEligible(el)) continue;
const v=(el.classList&&el.classList.contains('active'))?'true':'false';
if(el.getAttribute('aria-pressed')!==v){ el.setAttribute('aria-pressed',v); n++; }
}
return n;
}
function _a11yNativeSync(root){
try{
if(!root||!root.querySelectorAll) return 0;
return _a11yNativeSyncList(root.querySelectorAll(_A11Y_NATIVE_SELECTOR));
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y native pressed sync gagal:', err&&err.message); return 0; }
}
// ONE class-only observer; targets are the allowlisted containers / self buttons only (never body, never childList). Idempotent per target.
let _a11yNativeObs=null;
const _a11yNativeSeen=(typeof WeakSet!=='undefined')?new WeakSet():null;
function _a11yNativeObserve(){
try{
if(typeof document==='undefined'||typeof MutationObserver==='undefined'||!_a11yNativeSeen) return 0;
if(!_a11yNativeObs){
_a11yNativeObs=new MutationObserver(function(recs){
for(let i=0;i<recs.length;i++){
const t=recs[i].target;
if(!t) continue;
if(t.tagName==='BUTTON') _a11yNativeSyncList([t]);
else if(t.querySelectorAll) _a11yNativeSyncList(t.querySelectorAll('button.chip-btn'));
}
});
}
let n=0;
const ids=_A11Y_NATIVE_CONTAINERS.concat(_A11Y_NATIVE_SELF);
for(let i=0;i<ids.length;i++){
const t=document.getElementById(ids[i]);
if(!t||_a11yNativeSeen.has(t)) continue;
_a11yNativeObs.observe(t,{attributes:true,attributeFilter:['class'],subtree:true});
_a11yNativeSeen.add(t);
n++;
}
return n;
}catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] a11y native observer gagal:', err&&err.message); return 0; }
}
// Single entry point, called from the S256AG hook. Also processes late-rendered .segmented-control roots (S1934 only scanned at boot) via its public API.
function _a11yNativePressedSyncAll(root){
const n=_a11yNativeSync(root);
_a11yNativeObserve();
try{ if(typeof SegmentedControl!=='undefined'&&SegmentedControl&&typeof SegmentedControl.scan==='function') SegmentedControl.scan(root||document); }catch(err){ if(typeof console!=='undefined'&&console.debug) console.debug('[app] segmented scan gagal:', err&&err.message); }
return n;
}
