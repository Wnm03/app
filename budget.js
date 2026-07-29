// budget.js — Anggaran Budget (batas pengeluaran per kategori, tab List/Rekomendasi, drill-down transaksi).
// Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian budget/laporan — lihat docs/FILE-MAP.md & RENCANA-SESI.md).
// Isi: const Budget (CRUD anggaran, hitung pemakaian/limit efektif termasuk rollover, kartu ringkasan Beranda) + wrapper global tipis (getBudgetSettings, saveBudget, dst — dipakai HTML data-action & modules-render.js) + BudgetTabs (switch tab List/Rekomendasi) + BudgetReko (rekomendasi anggaran otomatis dari rata-rata transaksi N bulan terakhir).
// PENTING: dimuat di GROUP_A build.js, tepat di posisi lama features-budget-laporan-carnotes-pelanggan.js (setelah pajak-pbb-zakat.js, sebelum car-notes.js) — urutan load antar file GROUP_A jangan diubah sembarangan.

const Budget={
editId:null,
curIcon:'🍚',
curPeriod:'bulanan',
PERIOD_HINT:{
bulanan:'Direset & dihitung ulang tiap bulan (bulan berjalan).',
mingguan:'Direset & dihitung ulang tiap minggu (Senin–Minggu, minggu berjalan berdasarkan tanggal hari ini).',
tahunan:'Direset & dihitung ulang tiap tahun (menjumlah semua bulan di tahun berjalan).',
sekali:'Nominal tetap satu kali — menjumlah SEMUA transaksi yang cocok sejak anggaran ini dibuat, tidak pernah reset otomatis (cocok utk target dana renovasi, dana darurat, dll).'
},
SETTINGS_KEY:'budgetSettings',
getSettings(){
try{return JSON.parse(localStorage.getItem(Budget.SETTINGS_KEY))||{};}catch{return{};}
},
saveSettings(){
const s={
warnAt80:document.getElementById('bsWarnAt80').checked,
showOver:document.getElementById('bsShowOver').checked,
hideZero:document.getElementById('bsHideZero').checked,
sortOrder:document.getElementById('bsSortOrder').value
};
safeSetItem(Budget.SETTINGS_KEY,JSON.stringify(s));
},
getCatNameById(catId){
if(catId==='__total__') return '__total__';
const all=[...D.categories.income,...D.categories.expense];
for(const c of all){
if(c.id===catId) return c.name;
for(const s of (c.subs||[])){if(s.id===catId) return s.name;}
}
return catId;
},
getCatInfoById(catId){
if(catId==='__total__') return {catName:'__total__'};
const all=[...D.categories.income,...D.categories.expense];
for(const c of all){
if(c.id===catId) return {catName:c.name};
for(const s of (c.subs||[])){if(s.id===catId) return {catName:c.name,subName:s.name};}
}
return {catName:catId};
},
matchesTx(budget, t){
if(t.type!=='expense') return false;
const ids=budget.catIds||(budget.catId?[budget.catId]:[]);
if(ids.includes('__total__')) return true;
return ids.some(catId=>{
const info=Budget.getCatInfoById(catId);
if(info.subName){
return t.category===info.catName && t.subcategory===info.subName;
}
return t.category===info.catName||t.category===catId||t.categoryId===catId;
});
},
matchesPeriod(budget,t,month,year){
const period=budget.period||'bulanan';
const m=month!=null?month:curMonth, y=year!=null?year:curYear;
const d=new Date(t.date);
if(period==='mingguan'){
const now=new Date();
const dow=(now.getDay()+6)%7;
const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow);
const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6,23,59,59,999);
return d>=monday&&d<=sunday;
}
if(period==='tahunan') return d.getFullYear()===y;
if(period==='sekali'){
const startDate=budget.createdAt?budget.createdAt.slice(0,10):null;
return !(startDate&&t.date<startDate);
}
return d.getMonth()===m&&d.getFullYear()===y;
},
getUsed(budget,month,year){
return D.transactions.filter(t=>Budget.matchesPeriod(budget,t,month,year)&&Budget.matchesTx(budget,t)).reduce((s,t)=>s+t.amount,0);
},
getEffectiveLimit(budget,month,year){
const period=budget.period||'bulanan';
if(period!=='bulanan'||!budget.rollover) return budget.limit;
const m=month!=null?month:curMonth, y=year!=null?year:curYear;
const pm=m===0?11:m-1;
const py=m===0?y-1:y;
const prevUsed=D.transactions.filter(t=>{
const d=new Date(t.date);
return d.getMonth()===pm&&d.getFullYear()===py&&Budget.matchesTx(budget,t);
}).reduce((s,t)=>s+t.amount,0);
const sisa=budget.limit-prevUsed;
return budget.limit+(sisa>0?sisa:0);
},
render(){
const bs=Budget.getSettings();
const el=document.getElementById('budgetList');
const sumEl=document.getElementById('budgetSummary');
if(!D.budgets||!D.budgets.length){
el.innerHTML=`<div class="budget-empty"><div class="budget-empty-icon">📊</div><div class="budget-empty-text">Belum ada anggaran. Tap <b>＋ Tambah</b> untuk mulai mengatur pengeluaran.</div></div>`;
sumEl.style.display='none';
return;
}
let items=[...D.budgets];
const sort=bs.sortOrder||'pct_desc';
items=items.map(b=>{const used=Budget.getUsed(b);const lim=Budget.getEffectiveLimit(b);return{...b,_used:used,_limit:lim,_pct:lim>0?used/lim:0,_sisa:lim-used};});
if(sort==='pct_desc') items.sort((a,b)=>b._pct-a._pct);
else if(sort==='pct_asc') items.sort((a,b)=>a._pct-b._pct);
else if(sort==='sisa_asc') items.sort((a,b)=>a._sisa-b._sisa);
else items.sort((a,b)=>a.name.localeCompare(b.name));
if(bs.hideZero) items=items.filter(b=>b._used>0);
const totalLim=items.reduce((s,b)=>s+b._limit,0);
const totalUsed=items.reduce((s,b)=>s+b._used,0);
const totalSisa=totalLim-totalUsed;
const overallPct=totalLim>0?Math.round((totalUsed/totalLim)*100):0;
document.getElementById('bTotalBudget').textContent=fmt(totalLim);
document.getElementById('bTotalUsed').textContent=fmt(totalUsed);
document.getElementById('bTotalSisa').textContent=(totalSisa<0?'-':'')+fmt(Math.abs(totalSisa));
const barFill=document.getElementById('bOverallBar');
barFill.style.width=Math.min(overallPct,100)+'%';
barFill.className='budget-bar-fill '+(overallPct>=100?'over':overallPct>=80?'warn':'ok');
document.getElementById('bOverallPct').textContent=overallPct+'% terpakai';
const now=new Date(),daysInMonth=new Date(curYear,curMonth+1,0).getDate();
const daysLeft=curMonth===now.getMonth()&&curYear===now.getFullYear()?daysInMonth-now.getDate():0;
document.getElementById('bOverallDays').textContent=daysLeft>0?daysLeft+' hari lagi':'';
sumEl.classList.remove('u-dnone');sumEl.style.display='block';
el.innerHTML=items.map(b=>{
const pct=Math.min(Math.round(b._pct*100),999);
const barClass=pct>=100?'over':pct>=80?'warn':'ok';
const isOver=pct>=100;
const rollTag=b.rollover?`<span class="u-fs12 u-r99 u-t2 u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">🔄 rollover</span>`:'';
const periodTag=b.period==='tahunan'?`<span class="u-fs12 u-r99 u-t2 u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">🗓️ tahunan</span>`:b.period==='mingguan'?`<span class="u-fs12 u-r99 u-t2 u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">📆 mingguan</span>`:b.period==='sekali'?`<span class="u-fs12 u-r99 u-t2 u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">🎯 1x</span>`:'';
const overTag=isOver&&(bs.showOver!==false)?`<span class="u-fs12 u-r99 u-fw700" style="background:var(--accent2);color:#fff;padding:2px 8px">LEWAT!</span>`:'';
const warnTag=(!isOver&&pct>=80&&bs.warnAt80!==false)?`<span class="u-fs12 u-fw700" style="color:var(--accent4)">⚠️ ${pct}%</span>`:'';
const limitLabel=b.rollover&&b._limit!==b.limit?`${fmtFull(b._limit)} (incl. rollover)`:`${fmtFull(b._limit)}`;
return `<div class="budget-item clickable" data-action="Budget.showDrillDown" data-args="${escapeHtml(JSON.stringify([b.id]))}">
        <div class="budget-item-header">
          <div class="budget-cat">${b.icon||'💰'} ${escapeHtml(b.name)} ${periodTag}${rollTag}</div>
          <div class="u-flex u-aic u-gap6">${warnTag}${overTag}</div>
        </div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${barClass}" style="width:${Math.min(pct,100)}%"></div></div>
        <div class="budget-bar-label">
          <span>${fmtFull(b._used)} <span class="u-t2">/ ${limitLabel}</span></span>
          <span class="${isOver?'over-label':''}">${isOver?'Lewat '+fmtFull(Math.abs(b._sisa)):fmtFull(b._sisa)+' sisa'}</span>
        </div>
        <div class="budget-actions u-mt10" data-stop="1" data-action="stopPropOnly">
          <button class="budget-edit-btn" data-action="openBudgetModal" data-args="${escapeHtml(JSON.stringify([b.id]))}" aria-label="Edit/Buka">✏️ Edit</button>
          <button class="budget-del-btn" data-action="deleteBudget" data-args="${escapeHtml(JSON.stringify([b.id]))}" aria-label="Hapus">🗑</button>
          <button class="budget-edit-btn" data-action="showBudgetDrillDown" data-args="${escapeHtml(JSON.stringify([b.id]))}" style="margin-left:auto">📋 Lihat Transaksi</button>
        </div>
      </div>`;
}).join('')||`<div class="budget-empty"><div class="budget-empty-text" style="padding:16px 0">Semua anggaran disembunyikan (filter aktif)</div></div>`;
},
cleanCatOptText(txt){
return txt.replace(/^[\s↳]+/,'').replace(/^[^\w\s]+\s*/,'').trim();
},
renderCatOptions(selected){
let html=`<label class="budget-cat-opt total"><input type="checkbox" id="budgetCatTotal" onchange="onBudgetCatTotalToggle(this)"> 🎯 Total Pengeluaran (semua kategori)</label>`;
D.categories.expense.forEach(c=>{
html+=`<label class="budget-cat-opt"><input type="checkbox" class="budgetCatChk" value="${c.id}" onchange="onBudgetCatChildToggle()"> ${escapeHtml(c.icon||'')} ${escapeHtml(c.name)}</label>`;
(c.subs||[]).forEach(s=>{
html+=`<label class="budget-cat-opt sub"><input type="checkbox" class="budgetCatChk" value="${s.id}" onchange="onBudgetCatChildToggle()"> ↳ ${escapeHtml(s.icon||'')} ${escapeHtml(s.name)}</label>`;
});
});
document.getElementById('budgetCatList').innerHTML=html;
const totalChk=document.getElementById('budgetCatTotal');
const isTotal=selected.includes('__total__');
totalChk.checked=isTotal;
document.querySelectorAll('.budgetCatChk').forEach(c=>{
c.disabled=isTotal;
c.checked=!isTotal&&selected.includes(c.value);
});
},
onCatTotalToggle(el){
document.querySelectorAll('.budgetCatChk').forEach(c=>{c.disabled=el.checked;if(el.checked)c.checked=false;});
Budget.autoName();
},
onCatChildToggle(){
Budget.autoName();
},
getSelectedCatIds(){
const totalChk=document.getElementById('budgetCatTotal');
if(totalChk&&totalChk.checked) return ['__total__'];
return Array.from(document.querySelectorAll('.budgetCatChk:checked')).map(c=>c.value);
},
autoName(){
const nameEl=document.getElementById('budgetName');
if(nameEl.value&&nameEl.dataset.autoFilled!=='1') return;
const ids=Budget.getSelectedCatIds();
let txt='';
if(ids.includes('__total__')){
txt='Total Pengeluaran';
} else if(ids.length===1){
const opt=document.querySelector(`.budgetCatChk[value="${ids[0]}"]`);
txt=opt?Budget.cleanCatOptText(opt.parentElement.textContent):'';
} else if(ids.length>1){
const first=document.querySelector(`.budgetCatChk[value="${ids[0]}"]`);
const firstTxt=first?Budget.cleanCatOptText(first.parentElement.textContent):'';
txt=`${firstTxt} +${ids.length-1} lainnya`;
}
nameEl.value=txt;
nameEl.dataset.autoFilled='1';
},
selectIcon(icon, el){
Budget.curIcon=icon;
document.querySelectorAll('#budgetIconPicker .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
},
selectPeriod(period, el){
Budget.curPeriod=period;
document.querySelectorAll('#budgetPeriodPicker .chip-btn').forEach(b=>b.classList.remove('active'));
el.classList.add('active');
document.getElementById('budgetPeriodHint').textContent=Budget.PERIOD_HINT[period]||'';
const rolloverRow=document.getElementById('budgetRolloverRow');
if(period==='bulanan'){
rolloverRow.style.display='flex';
} else {
rolloverRow.style.display='none';
document.getElementById('budgetRollover').checked=false;
}
},
openModal(id){
Budget.editId=id;
const isEdit=id!==null;
document.getElementById('budgetModalTitle').textContent=isEdit?'Edit Anggaran':'Tambah Anggaran';
const nameEl=document.getElementById('budgetName');
if(isEdit){
const b=D.budgets.find(x=>x.id===id);
if(b){
const ids=b.catIds||(b.catId?[b.catId]:['__total__']);
Budget.renderCatOptions(ids);
nameEl.value=b.name;
nameEl.dataset.autoFilled='0';
document.getElementById('budgetLimit').value=b.limit;
document.getElementById('budgetNote').value=b.note||'';
document.getElementById('budgetRollover').checked=!!b.rollover;
Budget.curIcon=b.icon||'💰';
document.querySelectorAll('#budgetIconPicker .chip-btn').forEach(btn=>{
btn.classList.toggle('active',btn.textContent.startsWith(Budget.curIcon));
});
const period=b.period||'bulanan';
Budget.selectPeriod(period,document.querySelector(`#budgetPeriodPicker .chip-btn[data-period="${period}"]`));
}
} else {
Budget.renderCatOptions(['__total__']);
nameEl.value='';
nameEl.dataset.autoFilled='1';
document.getElementById('budgetLimit').value='';
document.getElementById('budgetNote').value='';
document.getElementById('budgetRollover').checked=false;
Budget.curIcon='🍚';
document.querySelectorAll('#budgetIconPicker .chip-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
Budget.selectPeriod('bulanan',document.querySelector('#budgetPeriodPicker .chip-btn[data-period="bulanan"]'));
Budget.autoName();
}
openModal('budgetModal');
},
save(){return withSaveGuard('budget','budgetModal',Budget._saveInner);},
_saveInner(){
const catIds=Budget.getSelectedCatIds();
if(!catIds.length){toast('⚠️ Pilih minimal 1 kategori');return;}
const name=document.getElementById('budgetName').value.trim()||'Anggaran';
const limit=parseFloat(document.getElementById('budgetLimit').value);
const note=document.getElementById('budgetNote').value.trim();
const period=Budget.curPeriod||'bulanan';
const rollover=period==='bulanan'&&document.getElementById('budgetRollover').checked;
if(!limit||limit<=0){toast('⚠️ Masukkan batas anggaran');return;}
if(!D.budgets) D.budgets=[];
if(Budget.editId){
const i=D.budgets.findIndex(b=>b.id===Budget.editId);
if(i>=0){D.budgets[i]={...D.budgets[i],name,limit,catIds,icon:Budget.curIcon,note,rollover,period};delete D.budgets[i].catId;}
} else {
D.budgets.push({id:'bgt_'+Date.now(),name,limit,catIds,icon:Budget.curIcon,note,rollover,period,createdAt:new Date().toISOString()});
}
save();closeModal('budgetModal');Budget.render();renderDashboard();if(typeof BudgetReko!=='undefined')BudgetReko.render();toast(Budget.editId?'✅ Anggaran diperbarui':'✅ Anggaran ditambahkan');
},
async delete(id){
if(!await askConfirm('Hapus anggaran ini?'))return;
D.budgets=D.budgets.filter(b=>b.id!==id);
save();Budget.render();renderDashboard();if(typeof BudgetReko!=='undefined')BudgetReko.render();toast('🗑 Anggaran dihapus');
},
openSettings(){
const s=Budget.getSettings();
document.getElementById('bsWarnAt80').checked=s.warnAt80!==false;
document.getElementById('bsShowOver').checked=s.showOver!==false;
document.getElementById('bsHideZero').checked=!!s.hideZero;
document.getElementById('bsSortOrder').value=s.sortOrder||'pct_desc';
openModal('budgetSettingsModal');
},
showAllDrillDown(){
if(!D.budgets||!D.budgets.length)return;
const txM=D.transactions.filter(t=>{
return D.budgets.some(b=>Budget.matchesPeriod(b,t,curMonth,curYear)&&Budget.matchesTx(b,t));
}).sort((a,c)=>new Date(c.date)-new Date(a.date));
const total=txM.reduce((s,t)=>s+t.amount,0);
document.getElementById('filterTxTitle').textContent='📊 Semua Transaksi Teranggarkan';
document.getElementById('filterTxSummary').textContent=`${txM.length} transaksi · Total ${fmtFull(total)} (sesuai periode masing-masing anggaran)`;
document.getElementById('filterTxList').innerHTML=txM.length?txM.map(txHTML).join(''):'<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">Belum ada pengeluaran di kategori beranggaran</div></div>';
openModal('filterTxModal');
},
showDrillDown(id){
const b=D.budgets.find(x=>x.id===id);if(!b)return;
const txM=D.transactions.filter(t=>Budget.matchesPeriod(b,t,curMonth,curYear)&&Budget.matchesTx(b,t)).sort((a,c)=>new Date(c.date)-new Date(a.date));
const total=txM.reduce((s,t)=>s+t.amount,0);
document.getElementById('filterTxTitle').textContent=`${b.icon} ${b.name}`;
document.getElementById('filterTxSummary').textContent=`${txM.length} transaksi · Total ${fmtFull(total)} dari anggaran ${fmtFull(Budget.getEffectiveLimit(b))}`;
document.getElementById('filterTxList').innerHTML=txM.length?txM.map(txHTML).join(''):'<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">Belum ada pengeluaran di kategori ini</div></div>';
openModal('filterTxModal');
},
renderDashMini(){
const card=document.getElementById('dashBudgetMiniCard');
if(!card)return;
if(!D.budgets||!D.budgets.length){card.style.display='none';return;}
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const totalLim=D.budgets.reduce((s,b)=>s+Budget.getEffectiveLimit(b,m,y),0);
const totalUsed=D.budgets.reduce((s,b)=>s+Budget.getUsed(b,m,y),0);
const pct=totalLim>0?Math.round((totalUsed/totalLim)*100):0;
// BUGFIX (2026-07-11): dulu 4 elemen anak ini (dashBudgetUsed/dashBudgetLimit/dashBudgetPct/
// dashBudgetBar) diambil & langsung ditulis TANPA null-check, beda dari pola card lain di
// Beranda (mis. renderDashLaporanMini sudah `if(!trendEl||!katEl)return;`). Kalau salah satu
// elemen ini kosong (mis. margin race saat DOM belum sempat penuh ter-render, atau markup
// custom yang belum lengkap), `.textContent=`/`.style.width=` di elemen null melempar
// "Cannot set properties of null" & ikut menjatuhkan SISA renderDashboard() (lihat bugfix
// terkait di modules-render.js: loop DASH_RENDER_ORDER sekarang juga diisolasi per-card).
const usedEl=document.getElementById('dashBudgetUsed');
const limEl=document.getElementById('dashBudgetLimit');
const pctEl=document.getElementById('dashBudgetPct');
const bar=document.getElementById('dashBudgetBar');
if(!usedEl||!limEl||!pctEl||!bar){card.style.display='none';return;}
usedEl.textContent=fmt(totalUsed);
limEl.textContent=fmt(totalLim);
pctEl.textContent=pct+'%';
bar.style.width=Math.min(pct,100)+'%';
bar.className='budget-bar-fill '+(pct>=100?'over':pct>=80?'warn':'ok');
card.classList.remove('u-dnone');card.style.display='block';
}
};
// Wrapper global tipis ke Budget.* — digabung dari backup-restore.js (v91),
// ditaruh persis di sebelah objek Budget yang dibungkusnya. Dipakai HTML data-action & modules-render.js.
function getBudgetSettings(){return Budget.getSettings();}
function saveBudgetSettings(){return Budget.saveSettings();}
function getCatNameById(catId){return Budget.getCatNameById(catId);}
function getCatInfoById(catId){return Budget.getCatInfoById(catId);}
function budgetMatchesTx(budget,t){return Budget.matchesTx(budget,t);}
function getBudgetUsed(budget){return Budget.getUsed(budget);}
function getBudgetEffectiveLimit(budget){return Budget.getEffectiveLimit(budget);}
function cleanCatOptText(txt){return Budget.cleanCatOptText(txt);}
function onBudgetCatTotalToggle(el){return Budget.onCatTotalToggle(el);}
function onBudgetCatChildToggle(){return Budget.onCatChildToggle();}
function getSelectedBudgetCatIds(){return Budget.getSelectedCatIds();}
function autoBudgetName(){return Budget.autoName();}
function selectBudgetIcon(icon,el){return Budget.selectIcon(icon,el);}
function selectBudgetPeriod(period,el){return Budget.selectPeriod(period,el);}
function openBudgetModal(id){return Budget.openModal(id);}
function saveBudget(){return Budget.save();}
function deleteBudget(id){return Budget.delete(id);}
function openBudgetSettings(){return Budget.openSettings();}
function showAllBudgetDrillDown(){return Budget.showAllDrillDown();}
function showBudgetDrillDown(id){return Budget.showDrillDown(id);}
const BudgetTabs={
cur:'list',
switchTo(tab){
BudgetTabs.cur=tab;
const paneList=document.getElementById('budgetTabPane-list'),paneReko=document.getElementById('budgetTabPane-reko');
if(!paneList||!paneReko)return;
/* BUGFIX: dulu cuma set style.display, tapi kedua pane ini punya class "u-dnone" (display:none
   !important) di HTML awal -- style.display kalah sama !important jadi pane "reko" (Rekomendasi
   Otomatis Anggaran via AI) tidak pernah kelihatan walau tab-nya sudah aktif. Sekarang classList
   "u-dnone" ikut di-toggle, BUKAN cuma style.display. */
paneList.classList.toggle('u-dnone',tab!=='list');
paneList.style.display=tab==='list'?'':'none';
paneReko.classList.toggle('u-dnone',tab!=='reko');
paneReko.style.display=tab==='reko'?'':'none';
document.querySelectorAll('.budget-tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
const settingsBtn=document.getElementById('budgetTabSettingsBtn'),addBtn=document.getElementById('budgetTabAddBtn');
if(settingsBtn)settingsBtn.style.display=tab==='list'?'':'none';
if(addBtn)addBtn.style.display=tab==='list'?'':'none';
if(tab==='reko'&&typeof BudgetReko!=='undefined')BudgetReko.render();
}
};
const BudgetReko={
_lastCats:[],
getSettings(){
D.budgetReko=D.budgetReko||{months:3,buffer:10};
let months=Number(D.budgetReko.months); if(![3,6].includes(months))months=3;
let buffer=Number(D.budgetReko.buffer); if(![0,10,20].includes(buffer))buffer=10;
return {months,buffer};
},
setMonths(m){
D.budgetReko=D.budgetReko||{};
D.budgetReko.months=m;
save();
BudgetReko.render();
},
setBuffer(b){
D.budgetReko=D.budgetReko||{};
D.budgetReko.buffer=b;
save();
BudgetReko.render();
},
monthsAvailable(){
if(!D.transactions||!D.transactions.length)return 0;
let earliest=null;
D.transactions.forEach(t=>{const d=new Date(t.date);if(!earliest||d<earliest)earliest=d;});
if(!earliest)return 0;
const now=new Date();
return Math.max(1,(now.getFullYear()-earliest.getFullYear())*12+(now.getMonth()-earliest.getMonth())+1);
},
effectiveMonths(){
const {months}=BudgetReko.getSettings();
return Math.max(1,Math.min(months,BudgetReko.monthsAvailable()||1));
},
rangeFrom(){
const months=BudgetReko.effectiveMonths();
const now=new Date();
return new Date(now.getFullYear(),now.getMonth()-months+1,1);
},
incomeAvgPerMonth(){
const months=BudgetReko.effectiveMonths();
const from=BudgetReko.rangeFrom(),now=new Date();
const total=D.transactions.filter(t=>t.type==='income'&&new Date(t.date)>=from&&new Date(t.date)<=now).reduce((s,t)=>s+t.amount,0);
return total/months;
},
computeCategoryAverages(){
const months=BudgetReko.effectiveMonths();
const from=BudgetReko.rangeFrom(),now=new Date();
const txs=D.transactions.filter(t=>t.type==='expense'&&new Date(t.date)>=from&&new Date(t.date)<=now);
const map={};
txs.forEach(t=>{
const key=t.category||'Lainnya';
if(!map[key])map[key]={total:0,count:0};
map[key].total+=t.amount;
map[key].count++;
});
return Object.entries(map).map(([name,v])=>({name,total:v.total,count:v.count,avgPerMonth:v.total/months})).sort((a,b)=>b.avgPerMonth-a.avgPerMonth);
},
findCatIdByName(name){
const cat=D.categories.expense.find(c=>c.name===name);
return cat?cat.id:null;
},
existingBudgetFor(catId){
return (D.budgets||[]).find(b=>(b.catIds||[]).includes(catId)||b.catId===catId);
},
roundLimit(n){
return Math.ceil(Math.max(0,n)/5000)*5000;
},
applyByIndex(i){
const c=BudgetReko._lastCats[i];
if(!c){toast('⚠️ Data tidak ditemukan, coba refresh halaman');return;}
BudgetReko._applyOne(c);
save();
Budget.render();
BudgetReko.render();
toast('✅ Anggaran "'+c.name+'" ditetapkan: '+fmtFull(BudgetReko.roundLimit(c.avgPerMonth*(1+BudgetReko.getSettings().buffer/100))));
},
_applyOne(c){
const catId=BudgetReko.findCatIdByName(c.name);
if(!catId)return false;
const {buffer}=BudgetReko.getSettings();
const limit=BudgetReko.roundLimit(c.avgPerMonth*(1+buffer/100));
const existing=BudgetReko.existingBudgetFor(catId);
if(existing){
if(existing.limit===limit)return false;
existing.limit=limit;
if(!existing.catIds||!existing.catIds.length)existing.catIds=[catId];
delete existing.catId;
}else{
const catInfo=D.categories.expense.find(x=>x.id===catId);
D.budgets.push({id:'bgt_'+uid(),name:c.name,limit,catIds:[catId],icon:catInfo?catInfo.emoji:'💰',note:'Otomatis dari Rekomendasi Anggaran',rollover:false,period:'bulanan',createdAt:new Date().toISOString()});
}
return true;
},
applyAll(){
if(!BudgetReko._lastCats.length){toast('⚠️ Belum ada rekomendasi untuk diterapkan');return;}
let applied=0;
BudgetReko._lastCats.forEach(c=>{ if(BudgetReko._applyOne(c))applied++; });
save();
Budget.render();
BudgetReko.render();
toast(applied?('✅ '+applied+' anggaran diterapkan/diupdate sekaligus'):'✅ Semua anggaran sudah sesuai rekomendasi, tidak ada yang diubah');
},
render(){
const box=document.getElementById('budgetRekoResult');
if(!box)return;
const {months,buffer}=BudgetReko.getSettings();
document.querySelectorAll('#brMonthChips .chip-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.m)===months));
document.querySelectorAll('#brBufferChips .chip-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.b)===buffer));
const avail=BudgetReko.monthsAvailable();
if(avail<2){
box.innerHTML='<div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">Belum cukup histori transaksi (minimal ~2 bulan) utk kasih rekomendasi yang masuk akal. Catat transaksi terus ya, nanti otomatis muncul di sini.</div></div>';
BudgetReko._lastCats=[];
return;
}
const incomeAvg=BudgetReko.incomeAvgPerMonth();
const cats=BudgetReko.computeCategoryAverages().filter(c=>c.count>=2);
BudgetReko._lastCats=cats;
const totalReko=cats.reduce((s,c)=>s+c.avgPerMonth,0);
const pctOfIncome=incomeAvg>0?Math.round(totalReko/incomeAvg*100):null;
let html='<div class="u-flex u-jcb u-fs12 u-mb6"><span class="u-t2">Rata-rata Pemasukan/bulan ('+months+' bln terakhir)</span><span class="u-fw700">'+fmtFull(incomeAvg)+'</span></div>'+
'<div class="u-flex u-jcb u-fs12 u-mb12" style="padding-bottom:10px;border-bottom:1px solid var(--border)"><span class="u-t2">Total Rata-rata Pengeluaran/bulan</span><span class="u-fw700">'+fmtFull(totalReko)+(pctOfIncome!==null?' <span class="u-t2 u-fw400">('+pctOfIncome+'% dari pemasukan)</span>':'')+'</span></div>';
if(cats.length){
const belumSesuaiCount=cats.filter(c=>{
const catId=BudgetReko.findCatIdByName(c.name);
const existing=catId?BudgetReko.existingBudgetFor(catId):null;
const reko=BudgetReko.roundLimit(c.avgPerMonth*(1+buffer/100));
return !existing||existing.limit!==reko;
}).length;
if(belumSesuaiCount>0){
html+='<button type="button" class="btn btn-primary btn-full btn-sm u-mb12" data-action="BudgetReko.applyAll">⚡ Terapkan Semua Sekaligus ('+belumSesuaiCount+' kategori)</button>';
}
}
if(!cats.length){
html+='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada kategori pengeluaran yang cukup sering muncul (min. 2x) di rentang waktu ini.</div></div>';
}else{
html+=cats.map((c,i)=>{
const catId=BudgetReko.findCatIdByName(c.name);
const catInfo=catId?D.categories.expense.find(x=>x.id===catId):null;
const existing=catId?BudgetReko.existingBudgetFor(catId):null;
const reko=BudgetReko.roundLimit(c.avgPerMonth*(1+buffer/100));
const sudahSesuai=existing&&existing.limit===reko;
return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div class="u-flex u-jcb u-aic u-mb4">
            <div class="u-fs13 u-fw600">${catInfo?catInfo.emoji:'💰'} ${escapeHtml(c.name)}</div>
            <div class="u-fs11 u-t2">${c.count}x transaksi</div>
          </div>
          <div class="u-flex u-jcb u-aic">
            <div class="u-fs12t2">Rata-rata: ${fmtFull(c.avgPerMonth)}/bln${existing?' · Anggaran saat ini: '+fmtFull(existing.limit):''}</div>
            <button type="button" class="chip-btn${sudahSesuai?' active':''}" style="white-space:nowrap" data-action="BudgetReko.applyByIndex" data-args="${escapeHtml(JSON.stringify([i]))}">${sudahSesuai?'✓ Sudah Sesuai':(existing?'🔄 Update ke '+fmt(reko):'➕ Tetapkan '+fmt(reko))}</button>
          </div>
        </div>`;
}).join('');
}
box.innerHTML=html;
},
init(){ BudgetReko.render(); }
};
