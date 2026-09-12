// service-input-catalog.js — satu SoT UI untuk pilihan Kategori Servis + Komponen Servis.
// Sumber data: SERVICE_CHECKLIST_GROUPS (13 grup / 30 item). Tidak membuat taxonomy baru.
// Dipakai oleh form Transaksi Keuangan dan modal Car Notes Servis.
(function(){
function groups(){return typeof SERVICE_CHECKLIST_GROUPS!=='undefined'?SERVICE_CHECKLIST_GROUPS:[];}
function groupById(id){return groups().find(g=>g&&g.masterCategoryId===id)||null;}
function itemById(id){
for(const g of groups()){
const it=(g.items||[]).find(x=>x&&x.id===id);
if(it)return {item:it,group:g};
}
return null;
}
function normalize(v){return String(v||'').trim().toLowerCase();}
function infer(text){
const q=normalize(text);
if(!q)return null;
for(const g of groups())for(const it of (g.items||[])){
const n=normalize(it.name);
if(q===n||q.includes(n)||n.includes(q))return {group:g,item:it};
}
// Keyword inference hanya untuk memilih UI, bukan membuat kategori/interval baru.
const rules=[
[/\boli\b|filter oli|busi|klep|kompresi|keteng|tensioner/,'servis-mesin'],
[/v[- ]?belt|roller|cvt|kopling ganda|per cvt/,'servis-cvt'],
[/throttle|isc|injector|injeksi|pgm[- ]?fi/,'sistem-injeksi-pgmfi'],
[/tangki|selang bahan bakar|fuel/,'sistem-bahan-bakar'],
[/coolant|radiator|water pump|thermostat/,'sistem-pendingin'],
[/rem|kampas rem|minyak rem/,'sistem-pengereman'],
[/shock|suspensi/,'suspensi'],
[/komstir|kemudi|bearing kemudi/,'sistem-kemudi'],
[/aki|kelistrikan|lampu|sekering/,'kelistrikan'],
[/ban|roda|velg/,'roda'],
[/filter udara/,'filter-udara'],
[/gardan|final gear|final drive/,'final-gear'],
[/body|kontrol|handle|kunci|switch/,'body-kontrol']
];
const hit=rules.find(r=>r[0].test(q));
if(hit)return {group:groupById(hit[1]),item:null};
return null;
}
function populateCategorySelect(sel,selectedId,placeholder){
if(!sel)return;
const cur=selectedId||sel.value||'';
sel.innerHTML=`<option value="">${placeholder||'— Pilih kategori servis —'}</option>`+groups().map(g=>`<option value="${escapeHtml(g.masterCategoryId)}">${escapeHtml(g.group)}</option>`).join('');
if(cur&&groupById(cur))sel.value=cur;
}
function populateComponentSelect(sel,masterCategoryId,selectedItemId,placeholder){
if(!sel)return;
const g=groupById(masterCategoryId);
const cur=selectedItemId||sel.value||'';
sel.innerHTML=`<option value="">${placeholder||'— Pilih komponen servis —'}</option>`+(g?(g.items||[]).map(it=>`<option value="${escapeHtml(it.id)}">${escapeHtml(it.name)}</option>`).join(''):'');
if(cur&&g&&(g.items||[]).some(it=>it.id===cur))sel.value=cur;
}
function sync(categoryEl,componentEl,itemEl,opts){
opts=opts||{};
const itemText=itemEl?itemEl.value:'';
let inferred=infer(itemText);
let master=categoryEl?categoryEl.value:'';
let component=componentEl?componentEl.value:'';
if(!master&&inferred&&inferred.group)master=inferred.group.masterCategoryId;
if(!component&&inferred&&inferred.item&&(!master||inferred.group.masterCategoryId===master))component=inferred.item.id;
if(categoryEl){populateCategorySelect(categoryEl,master);if(master)categoryEl.value=master;}
if(componentEl){populateComponentSelect(componentEl,master,component);if(component)componentEl.value=component;}
if(component&&itemEl){const hit=itemById(component);if(hit)itemEl.value=hit.item.name;}
if(opts.returnSelection)return {masterCategoryId:master||'',componentId:component||'',inferred:inferred||null};
return master||'';
}
function onCategoryChange(categoryEl,componentEl,itemEl){
const master=categoryEl?categoryEl.value:'';
if(componentEl)populateComponentSelect(componentEl,master,'');
if(itemEl) itemEl.value='';
return master;
}
function onComponentChange(componentEl,categoryEl,itemEl){
const id=componentEl?componentEl.value:'';
const hit=itemById(id);
if(hit){if(categoryEl)categoryEl.value=hit.group.masterCategoryId;if(itemEl)itemEl.value=hit.item.name;}
return hit;
}
window.ServiceInputCatalog={groups,groupById,itemById,infer,populateCategorySelect,populateComponentSelect,sync,onCategoryChange,onComponentChange};
})();
