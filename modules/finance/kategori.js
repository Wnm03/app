// kategori.js — Modal Kategori & Subkategori (tambah/edit/hapus, filter tampilan)
// Dipindah ke modules/finance/kategori.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

function getAllCats(){return[...D.categories.income,...D.categories.expense];}
function getCatsByType(type){return D.categories[type]||[];}
function getCat(name){
const all=getAllCats().filter(c=>c.name===name);
if(!all.length) return {name:'Lainnya',emoji:'📦',subs:[]};
return all.reduce((best,c)=>((c.subs&&c.subs.length||0)>(best.subs&&best.subs.length||0)?c:best),all[0]);
}
function getCatByType(name,type){
const cats=(D.categories[type]||[]).filter(c=>c.name===name);
if(!cats.length) return getCat(name);
return cats.reduce((best,c)=>((c.subs&&c.subs.length||0)>(best.subs&&best.subs.length||0)?c:best),cats[0]);
}
function uniqueCatList(){
const seen=new Map();
getAllCats().forEach(c=>{ if(!seen.has(c.name)) seen.set(c.name,c.emoji||'📦'); });
return[...seen.entries()];
}
function subNamesForCat(katName){
const seen=new Set();
getAllCats().forEach(c=>{
if(katName==='semua'||c.name===katName){(c.subs||[]).forEach(s=>{if(s.name)seen.add(s.name);});}
});
return[...seen].sort((a,b)=>a.localeCompare(b,'id'));
}
function populateCatSelect(id){
const sel=document.getElementById(id);
if(!sel)return;
const cur=sel.value;
sel.innerHTML='<option value="semua">Semua</option>'+uniqueCatList().map(([name,emoji])=>`<option value="${escapeHtml(name)}">${emoji} ${escapeHtml(name)}</option>`).join('');
sel.value=[...sel.options].some(o=>o.value===cur)?cur:'semua';
}
function populateSubSelect(subId,katId){
const sel=document.getElementById(subId);
if(!sel)return;
const katVal=document.getElementById(katId)?.value||'semua';
const cur=sel.value;
const subs=subNamesForCat(katVal);
sel.innerHTML='<option value="semua">Semua</option>'+subs.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
sel.value=subs.includes(cur)?cur:'semua';
}
function openCatModal(idx,type,callback){
catEditIdx=idx!==undefined?idx:null;
curCatModalType=type||'income';
catModalCallback=typeof callback==='function'?callback:null;
const isEdit=catEditIdx!==null&&catEditIdx!==undefined;
document.getElementById('catModalTitle').textContent=isEdit?'Edit Kategori':'Tambah Kategori';
setCatModalType(curCatModalType);
if(isEdit){
const cat=D.categories[curCatModalType][catEditIdx];
document.getElementById('catName').value=cat.name;
document.getElementById('catEmoji').value=cat.emoji;
} else {
document.getElementById('catName').value='';
document.getElementById('catEmoji').value='💰';
}
const catDelBtnEl=document.getElementById('catDelBtn'); if(catDelBtnEl) catDelBtnEl.style.display=isEdit?'':'none';
openModal('catModal');
}
async function delCatFromModal(){
if(catEditIdx===null||catEditIdx===undefined)return;
const cat=D.categories[curCatModalType][catEditIdx];
if(!cat)return;
const before=D.categories[curCatModalType].length;
await delCat(cat.id,curCatModalType);
if(D.categories[curCatModalType].length<before){ catModalCallback=null; closeModal('catModal'); }
}
function setCatModalType(t){
curCatModalType=t;
document.getElementById('catBtnI').className='type-btn'+(t==='income'?' ai':'');
document.getElementById('catBtnE').className='type-btn'+(t==='expense'?' ae':'');
}
function refreshTxCatIfOpen(){
const modal=document.getElementById('txModal');
if(!modal||!modal.classList.contains('open'))return;
updateTxVehiclePanels();
}
function saveCat(){
const name=document.getElementById('catName').value.trim();
const emoji=document.getElementById('catEmoji').value||'📦';
const type=curCatModalType;
if(!name){toast('⚠️ Isi nama kategori');return;}
if(catEditIdx!==null&&catEditIdx!==undefined){
const oldName=D.categories[type][catEditIdx].name;
D.categories[type][catEditIdx]={...D.categories[type][catEditIdx],name,emoji};
var catRenameAffected=0;
if(oldName!==name){
D.transactions.forEach(t=>{if(t.category===oldName){t.category=name;catRenameAffected++;}});
(D.bills||[]).forEach(b=>{if(b.category===oldName)b.category=name;});
}
} else {
D.categories[type].push({id:'cat_'+Date.now(),name,emoji,subs:[]});
}
save(); closeModal('catModal'); renderCatList(); populateCatFilter(); populateKeuFilters(); refreshTxCatIfOpen(); renderDashboard(); renderKeuangan();
toast(catRenameAffected?`✅ Kategori disimpan, ${catRenameAffected} transaksi lama ikut disesuaikan`:'✅ Kategori disimpan',catRenameAffected?3200:undefined);
if(catModalCallback){
const cb=catModalCallback; catModalCallback=null;
cb(name);
}
}
async function delCat(id,type){
const defaults=DEFAULT_CATS[type].map(c=>c.id);
const isDefault=defaults.includes(id);
const cat=D.categories[type].find(c=>c.id===id);
const usedCount=cat?D.transactions.filter(t=>t.category===cat.name).length:0;
let warnMsg=usedCount?`Hapus kategori "${cat.name}"? ${usedCount} transaksi yg sudah pakai kategori ini TIDAK akan ikut terhapus, tapi kategorinya tidak akan muncul lagi di pilihan Input Transaksi.`:'Hapus kategori ini beserta subkategorinya?';
if(isDefault)warnMsg=`⚠️ "${cat?cat.name:''}" adalah kategori bawaan (default) aplikasi. `+warnMsg;
if(!await askConfirm(warnMsg))return;
D.categories[type]=D.categories[type].filter(c=>c.id!==id);
save();renderCatList();populateCatFilter();populateKeuFilters();refreshTxCatIfOpen();toast('🗑 Kategori dihapus');
}
function openSubCatModal(catId,type,subId){
const cat=(D.categories[type]||[]).find(c=>c.id===catId);
if(!cat){toast('⚠️ Kategori tidak ditemukan');return;}
subCatParentId=catId; subCatParentType=type; subCatEditId=subId||null;
const isEdit=!!subCatEditId;
document.getElementById('subCatModalTitle').textContent=isEdit?'Edit Subkategori':'Tambah Subkategori';
document.getElementById('subCatParentLabel').textContent=cat.emoji+' '+cat.name;
if(isEdit){
const sub=(cat.subs||[]).find(s=>s.id===subCatEditId);
document.getElementById('subCatName').value=sub?sub.name:'';
}else{
document.getElementById('subCatName').value='';
}
openModal('subCatModal');
}
function saveSubCat(){
const name=document.getElementById('subCatName').value.trim();
if(!name){toast('⚠️ Isi nama subkategori');return;}
const cat=D.categories[subCatParentType].find(c=>c.id===subCatParentId);
if(!cat.subs)cat.subs=[];
if(subCatEditId){
const sub=cat.subs.find(s=>s.id===subCatEditId);
if(!sub){toast('⚠️ Subkategori tidak ditemukan');return;}
const oldName=sub.name;
sub.name=name;
var subRenameAffected=0;
if(oldName!==name){
D.transactions.forEach(t=>{if(t.subcategory===oldName&&t.category===cat.name){t.subcategory=name;subRenameAffected++;}});
(D.bills||[]).forEach(b=>{if(b.subcategory===oldName&&b.category===cat.name)b.subcategory=name;});
}
save();closeModal('subCatModal');renderCatList();populateSubSelect('fSub','fKat');populateSubSelect('kfSub','kfKat');refreshTxCatIfOpen();
toast(subRenameAffected?`✅ Subkategori disimpan, ${subRenameAffected} transaksi lama ikut disesuaikan`:'✅ Subkategori disimpan',subRenameAffected?3200:undefined);
}else{
cat.subs.push({id:'sub_'+Date.now(),name});
save();closeModal('subCatModal');renderCatList();populateSubSelect('fSub','fKat');populateSubSelect('kfSub','kfKat');refreshTxCatIfOpen();toast('✅ Subkategori ditambahkan');
}
}
async function delSubCat(catId,type,subId){
if(!await askConfirm('Hapus subkategori ini?'))return;
const cat=D.categories[type].find(c=>c.id===catId);
cat.subs=cat.subs.filter(s=>s.id!==subId);
save();renderCatList();populateSubSelect('fSub','fKat');populateSubSelect('kfSub','kfKat');refreshTxCatIfOpen();toast('🗑 Subkategori dihapus');
}
function toggleCatGroup(catId){
const el=document.getElementById('subs_'+catId);
const arrow=document.getElementById('arrow_'+catId);
if(el)el.classList.toggle('open');
if(arrow)arrow.classList.toggle('open');
}
function filterCat(f,el){
curCatFilter=f;
document.querySelectorAll('#catFilterChips .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
renderCatList();
}
/* moved to modules-render.js: renderCatList */
