// ai-chat.js — Chat AI (RefAI): UI edit aksi chat, kirim pesan ke provider AI (sendChat/
// callAIProviderRaw), Advisor (rule-based tips) & AIWidget (widget rekomendasi AI generik dipakai
// modul lain). Dipisah dari features-aiwidget-reminder-gdrive-search.js (Sesi 4 restrukturisasi
// folder, blok 1 — lihat AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan ulang file, BUKAN
// perubahan perilaku. PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) —
// cek scripts/build.js untuk urutan lengkap terkini.

// unifiedBriefingChatContext() — S111 (Batch 13, AI Daily Briefing Integration: Finance+Vehicle).
// Jembatan tipis MURNI BACA ke UnifiedAIBriefing.generate() (modules/cross/unified-ai-briefing.js,
// Sesi 88 — sendiri 100% reuse UnifiedSummaryAPI.summary() -> CrossAIHook.getAIHook() ->
// FinanceDashboard.getAIHook()+VehicleAIHook.fleetSummary()). TIDAK ada rumus/agregasi baru di
// sini — fungsi ini HANYA guard typeof + try/catch di sekitar generate() supaya aman dipanggil dari
// initChat()/sendChat() walau modul briefing belum dimuat di halaman tertentu (pola sama persis
// guard `typeof AIService==='undefined'` di AIDailyBriefingCard/AIStatusCard). null kalau briefing
// belum tersedia/gagal — pemanggil (initChat/systemPrompt) TETAP jalan seperti biasa, cuma tanpa
// baris briefing (silent, bukan error blocking). Scope S111 SENGAJA TIDAK termasuk asset (belum
// ada AssetAIAdvisor/Asset.getAIHook() terpadu — lihat docs/PRODUCT_DECISIONS.md).
function unifiedBriefingChatContext(){
if(typeof UnifiedAIBriefing==='undefined')return null;
try{
const b=UnifiedAIBriefing.generate();
return (b&&b.ok)?b.text:null;
}catch(e){console.warn('unifiedBriefingChatContext: gagal ambil UnifiedAIBriefing',e);return null;}
}
// recommendationPanelChatContext() — S114 (Batch 13, Unified Recommendation
// Panel Integration). Jembatan tipis MURNI BACA ke RecommendationPanel.
// getRecommendations() (modules/cross/recommendation-panel.js, sesi ini —
// sendiri 100% reuse DecisionCenterAPI.summary() -> LifeDashboardSummaryAPI/
// PriorityEngine/FinanceIntelligence.insights()+VehicleIntelligence.
// insights()). TIDAK ada rumus/filter baru di sini — hanya guard typeof +
// try/catch + format teks pakai RecommendationPanel._icon() (helper
// presentasional yang SUDAH ADA, dipakai apa adanya, BUKAN dibuat ulang),
// pola sama persis unifiedBriefingChatContext() di atas. null kalau
// RecommendationPanel belum dimuat/tidak ada rekomendasi/generate() error —
// pemanggil (initChat()/_sendChatInner()) TETAP jalan seperti biasa, cuma
// tanpa baris rekomendasi (silent, bukan error blocking). Scope S114
// SENGAJA TIDAK termasuk asset (sama seperti S111 — belum ada
// AssetAIAdvisor/Asset.getAIHook() terpadu).
function recommendationPanelChatContext(){
if(typeof RecommendationPanel==='undefined'||typeof RecommendationPanel.getRecommendations!=='function')return null;
try{
const{ok,recommendations}=RecommendationPanel.getRecommendations();
if(!ok||!Array.isArray(recommendations)||!recommendations.length)return null;
return recommendations.map(r=>`${RecommendationPanel._icon(r.type)} ${r.message}`).join('\n');
}catch(e){console.warn('recommendationPanelChatContext: gagal ambil RecommendationPanel',e);return null;}
}
// actionQueueChatContext() — S115 (ActionQueue Public API Integration).
// Jembatan tipis MURNI BACA ke ActionQueue.getQueue() (modules/cross/
// action-queue.js — sendiri 100% reuse DecisionCenterAPI.summary() ->
// LifeDashboardSummaryAPI/PriorityEngine). TIDAK ada rumus/filter/sorting
// baru di sini — hanya guard typeof + try/catch + format teks pakai
// ActionQueue._label()/_vehicleIcon() (helper presentasional yang SUDAH
// ADA, dipakai apa adanya, BUKAN dibuat ulang — sama persis format yang
// dipakai ActionQueue.render() sendiri utk tiap baris), pola sama persis
// recommendationPanelChatContext() di atas. null kalau ActionQueue belum
// dimuat/tidak ada item di queue/getQueue() error — pemanggil
// (initChat()/_sendChatInner()) TETAP jalan seperti biasa, cuma tanpa
// baris action queue (silent, bukan error blocking).
function actionQueueChatContext(){
if(typeof ActionQueue==='undefined'||typeof ActionQueue.getQueue!=='function')return null;
try{
const{ok,priorityItems}=ActionQueue.getQueue();
if(!ok||!Array.isArray(priorityItems)||!priorityItems.length)return null;
return priorityItems.map((item,idx)=>{
const icon=item.kind==='finance'?'💰':ActionQueue._vehicleIcon(item.vehicleType);
return `${idx+1}. ${icon} ${ActionQueue._label(item)}`;
}).join('\n');
}catch(e){console.warn('actionQueueChatContext: gagal ambil ActionQueue',e);return null;}
}
function chatActionEditFormHTML(actionId,type,data){
const fields=CHAT_ACTION_EDIT_FIELDS[type]||[];
const rows=fields.map(f=>{
const val=data[f.key]!=null?data[f.key]:'';
const id=`chatActionEdit_${actionId}_${f.key}`;
if(f.type==='select'){
const opts=typeof f.options==='function'?f.options():f.options;
return `<div class="fg u-mb6"><label class="fl u-fs11">${escapeHtml(f.label)}</label><select class="fi" id="${id}">${opts.map(([v,l])=>`<option value="${escapeHtml(String(v))}" ${sameId(v,val)?'selected':''}>${escapeHtml(l)}</option>`).join('')}</select></div>`;
}
return `<div class="fg u-mb6"><label class="fl u-fs11">${escapeHtml(f.label)}</label><input class="fi" id="${id}" type="${f.type}" value="${escapeHtml(String(val))}"></div>`;
}).join('');
return `<div class="u-fw700 u-mb6">✏️ Edit ${CHAT_ACTION_LABELS[type]||''}</div>
    ${rows}
    <div class="u-flex u-gap8 u-mt4">
      <button class="btn btn-primary btn-sm" data-action="saveChatActionEdit" data-args="${escapeHtml(JSON.stringify([actionId]))}">💾 Simpan Perubahan</button>
      <button class="btn btn-ghost btn-sm" data-action="cancelChatActionEdit" data-args="${escapeHtml(JSON.stringify([actionId]))}">↩️ Batal Edit</button>
    </div>`;
}
function editChatAction(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
el.innerHTML=chatActionEditFormHTML(actionId,pending.type,pending.data);
}
function saveChatActionEdit(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
const fields=CHAT_ACTION_EDIT_FIELDS[pending.type]||[];
const newData={...pending.data};
fields.forEach(f=>{
const inputEl=document.getElementById(`chatActionEdit_${actionId}_${f.key}`);
if(!inputEl)return;
let v=inputEl.value;
if(f.type==='number')v=(v===''?undefined:Number(v));
newData[f.key]=v;
});
pending.data=newData;
el.innerHTML=chatActionInnerHTML(actionId,pending.type,newData);
}
function cancelChatActionEdit(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
el.innerHTML=chatActionInnerHTML(actionId,pending.type,pending.data);
}
function confirmChatAction(actionId){
const pending=_pendingChatActions[actionId];
const el=document.getElementById('chatAction_'+actionId);
if(!pending||!el)return;
try{
const msg=CHAT_ACTION_HANDLERS[pending.type](pending.data);
el.innerHTML=`<div class="u-fw700">✅ Tersimpan</div><div class="u-fs13 u-t2">${escapeHtml(msg)}</div>`;
toast('✅ Tersimpan dari chat AI');
}catch(e){
el.innerHTML=`<div class="u-fw700" style="color:#ff5050">⚠️ Gagal: ${escapeHtml(e.message||'Terjadi kesalahan')}</div>`;
}
delete _pendingChatActions[actionId];
}
function cancelChatAction(actionId){
const el=document.getElementById('chatAction_'+actionId);
if(el)el.innerHTML='<div class="u-t2">❌ Dibatalkan</div>';
delete _pendingChatActions[actionId];
}
function initChat(){
if(chatInited)return;chatInited=true;
let html='<div class="chat-bubble ai">Halo W! 👋 Saya AI asisten pribadi Anda. Saya sudah baca semua data: keuangan, perkembangan anak, kendaraan (KM, BBM, servis), absensi/gaji, dan bisnis shop. Tanya apa saja!</div>';
try{
const reminders=getProactiveReminders();
if(reminders.length){
const list=reminders.map(r=>`• ${escapeHtml(r)}`).join('<br>');
html+=`<div class="chat-bubble ai">📋 <b>Sebelum lanjut, ada yang perlu diperhatikan nih:</b><br>${list}</div>`;
}
}catch(e){console.error('Gagal cek reminder proaktif:',e);}
try{
const briefingText=unifiedBriefingChatContext();
if(briefingText){
html+=`<div class="chat-bubble ai">📋 <b>Ringkasan Harian Finance & Vehicle:</b><br>${escapeHtml(briefingText)}</div>`;
}
}catch(e){console.error('Gagal ambil Unified AI Briefing:',e);}
try{
const recoText=recommendationPanelChatContext();
if(recoText){
html+=`<div class="chat-bubble ai">💡 <b>Rekomendasi utk Anda:</b><br>${escapeHtml(recoText).replace(/\n/g,'<br>')}</div>`;
}
}catch(e){console.error('Gagal ambil Recommendation Panel:',e);}
try{
const queueText=actionQueueChatContext();
if(queueText){
html+=`<div class="chat-bubble ai">🗂️ <b>Antrean Tindakan:</b><br>${escapeHtml(queueText).replace(/\n/g,'<br>')}</div>`;
}
}catch(e){console.error('Gagal ambil Action Queue:',e);}
document.getElementById('chatBox').innerHTML=html;
}
function aiQ(q){document.getElementById('chatInput').value=q;sendChat();}
async function sendChat(){
if(_saveGuards['chat'])return;
const btn=document.getElementById('chatSendBtn');
_saveGuards['chat']=true;
if(btn){btn.disabled=true;btn.style.opacity='0.5';}
try{
await _sendChatInner();
} finally {
_saveGuards['chat']=false;
if(btn){btn.disabled=false;btn.style.opacity='';}
}
}
async function _sendChatInner(){
const input=document.getElementById('chatInput');
const msg=input.value.trim();if(!msg)return;
input.value='';
const box=document.getElementById('chatBox');
box.innerHTML+=`<div class="chat-bubble user">${escapeHtml(msg)}</div>`;
const loading=document.createElement('div');loading.className='chat-bubble ai';loading.textContent='⏳ Menganalisa data Anda...';box.appendChild(loading);box.scrollTop=box.scrollHeight;
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const shopTotal=D.cobek.reduce((s,t)=>s+t.profit,0);
const targetInfo=D.targets.map(t=>`${escapeHtml(t.name)}: ${Math.round((t.saved/t.amount)*100)}%`).join(', ')||'Belum ada';
const eduFundInfo=(D.eduFunds||[]).map(f=>{const c=EduFund.calc(f);const pct=c.fv>0?Math.round((c.terkumpul/c.fv)*100):0;return `${escapeHtml(f.name)} (target ${f.tahunTarget}): butuh ${fmtFull(c.fv)}, terkumpul ${pct}%, nabung ~${fmtFull(c.pmtBulanan)}/bln`;}).join('; ')||'Belum ada';
const sewaKiosInfo=((D.sewaKios&&D.sewaKios.units)||[]).map(u=>`${escapeHtml(u.name)}: ${u.status==='disewa'?'disewa oleh '+(u.penyewa||'-')+' @'+fmtFull(u.hargaSewaBulanan||0)+'/bln':'kosong'}`).join('; ')||'Belum ada unit';
const renovInfo=(D.renovProjects||[]).map(p=>{const items=p.items||[];const total=items.reduce((s,i)=>s+(i.harga||0),0);const paid=items.filter(i=>i.paid).reduce((s,i)=>s+(i.harga||0),0);return `${escapeHtml(p.name)}: ${fmtFull(paid)}/${fmtFull(total)} terbayar (${items.length} item)`;}).join('; ')||'Belum ada proyek';
const debtInfo=(D.debts||[]).filter(d=>!d.lunas).map(d=>`${escapeHtml(d.name)}: ${fmtFull(d.nilai)}${d.jatuhTempo?', JT '+d.jatuhTempo:''}`).join('; ')||'Tidak ada utang aktif';
const piutangInfo=(D.piutang||[]).filter(p=>!p.lunas).map(p=>`${escapeHtml(p.name)}: ${fmtFull(p.nilai)}`).join('; ')||'Tidak ada piutang aktif';
const pensiunInfo=D.pensiun&&D.pensiun.aktif?`Target ${fmtFull(D.pensiun.targetDana||0)} di usia ${D.pensiun.usiaPensiun}, kontribusi ${fmtFull(D.pensiun.kontribusiBulanan||0)}/bln`:'Belum diatur';
const billInfo=D.bills.map(b=>`${escapeHtml(b.name)} (${b.kind}): ${fmtFull(b.amount)}, jatuh tempo ${b.nextDue}`).join('; ')||'Tidak ada';
const accInfo=D.accounts.map(a=>`${escapeHtml(a.name)}: ${fmtFull(recalcAccBalance(a.id))}`).join(', ');
const katMap={};
D.transactions.filter(t=>new Date(t.date)>=new Date(y,m-2,1)).forEach(t=>{if(!katMap[t.category])katMap[t.category]={inc:0,exp:0};if(t.type==='income')katMap[t.category].inc+=t.amount;else katMap[t.category].exp+=t.amount;});
const anakInfo=D.catatan.anak.slice(-3).map(c=>c.text||c.note||JSON.stringify(c)).join('; ')||'Belum ada catatan';
const msDone=D.milestones.filter(Boolean).length;
const msgLower=msg.toLowerCase();
const mentionsAny=(...kws)=>kws.some(k=>msgLower.includes(k));
// Sesi 196 (Ownership Sync Vehicle): kendaraan ber-ownership INVESTOR/CUSTOMER/
// THIRD_PARTY/FAMILY dikecualikan dari konteks AI (detail BBM/servis/pajak) —
// D.vehicles sendiri TIDAK diubah/dimutasi, cuma dipakai array terfilter di bawah.
const vehiclesForAI=D.vehicles.filter(v=>typeof isVehicleOwnershipSelf!=='function'||isVehicleOwnershipSelf(v.id));
const wantVehicleDetail=mentionsAny('motor','mobil','kendaraan','stnk','bbm','bensin','servis','oli','ban','plat','sim ','pajak kendaraan','uji kelayakan','bengkel','km ','kilometer',...vehiclesForAI.map(v=>v.name.toLowerCase()));
const vehicleInfoFull=vehiclesForAI.map(v=>{
const curKm=getVehicleKm(v.id);
const bbmV=[...D.bbmLogs.filter(b=>b.vehicleId===v.id)].sort((a,b)=>new Date(a.date)-new Date(b.date));
const totalBbmCost=bbmV.reduce((s,b)=>s+b.cost,0);
const totalLiter=bbmV.reduce((s,b)=>s+(b.liter||0),0);
const fullFills=bbmV.filter(b=>b.fullTank&&b.km);
let avgKmL=null;
if(fullFills.length>=2){
const pairs=[];for(let i=1;i<fullFills.length;i++){const kmDiff=fullFills[i].km-fullFills[i-1].km;const lit=fullFills[i].liter;if(kmDiff>0&&lit>0)pairs.push(kmDiff/lit);}
if(pairs.length)avgKmL=(pairs.reduce((s,v)=>s+v,0)/pairs.length).toFixed(1);
}
const bbmThisMonth=bbmV.filter(b=>{const d=new Date(b.date);return d.getMonth()===m&&d.getFullYear()===y;});
const bbmThisMonthCost=bbmThisMonth.reduce((s,b)=>s+b.cost,0);
const bbmSummary=`BBM: total ${totalLiter.toFixed(1)}L / ${fmtFull(totalBbmCost)} all-time, bulan ini ${fmtFull(bbmThisMonthCost)}, rata² ${avgKmL?avgKmL+' km/L':'belum cukup data'}, KM sekarang ${curKm.toLocaleString('id-ID')}`;
const servisV=D.servisLogs.filter(s=>s.vehicleId===v.id);
const totalServisV=servisV.reduce((s,x)=>s+(x.cost||0),0);
const servisVDetail=[...servisV].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(s=>`${s.item} ${s.date}${s.km?' @'+s.km.toLocaleString('id-ID')+'km':''} (${fmtFull(s.cost)})`).join('; ')||'belum ada';
const sparepartStatus=D.sparepartCats.map(cat=>{
const lastKm=getLastServiceKmForCat(v.id,cat);
const intervalKm=getEffectiveIntervalKm(v.id,cat);
const sisa=intervalKm-(lastKm===null?curKm:curKm-lastKm);
const status=sisa<=0?`❌ LEWAT ${Math.abs(sisa).toLocaleString('id-ID')}km`:sisa<=500?`⚠️ sisa ${sisa.toLocaleString('id-ID')}km`:`✅ sisa ${sisa.toLocaleString('id-ID')}km`;
return `${cat.name}: ${status}`;
}).join(', ');
const servisSummary=`Servis: total biaya ${fmtFull(totalServisV)}, 5 terakhir: [${servisVDetail}], status interval: ${sparepartStatus||'belum ada kategori servis'}`;
const jalanV=D.jalanLogs.filter(j=>j.vehicleId===v.id);
const totalKmJalan=jalanV.reduce((s,j)=>s+(j.jarak||0),0);
const jalanSummary=jalanV.length?`Perjalanan: ${jalanV.length} tercatat, total ${totalKmJalan.toLocaleString('id-ID')}km, 3 terakhir: ${[...jalanV].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3).map(j=>`${j.rute}${j.jarak?' ('+j.jarak+'km)':''}`).join(', ')}`:'Perjalanan: belum ada catatan';
return `\n${v.emoji} ${v.name} (${v.type||'kendaraan'}):\n  ${bbmSummary}\n  ${servisSummary}\n  ${jalanSummary}`;
}).join('\n')||'Belum ada kendaraan terdaftar';
const vehicleInfoCompact=vehiclesForAI.length?vehiclesForAI.map(v=>{
const curKm=getVehicleKm(v.id);
const bbmThisMonthCost=D.bbmLogs.filter(b=>{if(b.vehicleId!==v.id)return false;const d=new Date(b.date);return d.getMonth()===m&&d.getFullYear()===y;}).reduce((s,b)=>s+b.cost,0);
return `${v.emoji} ${v.name}: KM ${curKm.toLocaleString('id-ID')}, BBM bulan ini ${fmtFull(bbmThisMonthCost)}`;
}).join(' | '):'Belum ada kendaraan terdaftar';
const vehicleInfo=wantVehicleDetail?vehicleInfoFull:vehicleInfoCompact+' (ringkasan — detail BBM/servis/perjalanan per unit tersedia, tanya lebih spesifik kalau perlu)';
const wantSparepartDetail=mentionsAny('sparepart','spare part','gudang','stok part','stok sparepart');
const stockSparepartLow=D.partsStock.filter(p=>p.qty<=(p.minStock||1)).map(p=>`${escapeHtml(p.name)} (sisa ${p.qty}${p.unit?' '+p.unit:''})`).join(', ')||'Aman semua';
const stockSparepartAllFull=D.partsStock.length?D.partsStock.map(p=>`${escapeHtml(p.name)}: ${p.qty}${p.unit?' '+p.unit:''}`).join(', '):'Belum ada stok sparepart';
const stockSparepartAll=wantSparepartDetail?stockSparepartAllFull:(D.partsStock.length?`${D.partsStock.length} item tercatat (ringkasan — tanya lebih spesifik utk detail per item)`:'Belum ada stok sparepart');
const wantShopDetail=mentionsAny('shop','produk','stok','etalase','produsen','supplier','batu','harga jual','hpp');
const shopProdukStokFull=D.products.length?D.products.map(p=>`${escapeHtml(p.name)} — stok ${p.stock}, harga jual ${fmtFull(p.hargaJual)}, HPP ${fmtFull(p.hargaBeli)}${shopKategoriName(p.kategoriId)?', kategori '+shopKategoriName(p.kategoriId):''}${p.produsenId?', produsen '+((D.produsen.find(pr=>pr.id===p.produsenId)||{}).name||''):''}`).join('; '):'Belum ada produk di etalase';
const shopProdukStok=wantShopDetail?shopProdukStokFull:(D.products.length?`${D.products.length} produk terdaftar (ringkasan — tanya lebih spesifik utk detail per produk)`:'Belum ada produk di etalase');
// S260 (Business AI Ownership Sync): shopLowStok/shopModalStok fallback HANYA hitung produk
// ownership SELF — reuse isProductOwnershipSelf() (SSOT, cobek-etalase.js), guard typeof (fallback
// anggap semua SELF kalau file itu belum dimuat). shopModalStok jalur normal SUDAH ownership-aware
// lewat Etalase.totalModalStok() (S259); jalur fallback (Etalase belum dimuat) dulu TIDAK filter —
// disamakan di sini supaya kedua jalur selalu konsisten.
const prodSelfFilterChat=(typeof isProductOwnershipSelf==='function')?isProductOwnershipSelf:(()=>true);
const shopLowStok=D.products.filter(prodSelfFilterChat).filter(p=>p.stock<=2).map(p=>p.name).join(', ')||'Aman';
const shopModalStok=(typeof Etalase!=='undefined')?Etalase.totalModalStok():D.products.filter(prodSelfFilterChat).reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
const shopProdusenInfo=wantShopDetail?(D.produsen.length?D.produsen.map(pr=>pr.name+(pr.contact?' ('+pr.contact+')':'')).join(', '):'Belum ada produsen tercatat'):`${D.produsen.length} produsen tercatat`;
const shopOmzet=D.cobek.reduce((s,t)=>s+(t.total||0),0);
const shopThisMonth=D.cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const shopOmzetThisMonth=shopThisMonth.reduce((s,t)=>s+(t.total||0),0);
const shopUntungThisMonth=shopThisMonth.reduce((s,t)=>s+(t.profit||0),0);
const budgetInfo=D.budgets&&D.budgets.length?D.budgets.map(b=>{
const used=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&budgetMatchesTx(b,t);}).reduce((s,t)=>s+t.amount,0);
const pct=b.limit>0?Math.round(used/b.limit*100):0;
return `${b.icon} ${escapeHtml(b.name)}: anggaran ${fmtFull(b.limit)}, terpakai ${fmtFull(used)} (${pct}%)${pct>=100?' ❌ OVER BUDGET':pct>=80?' ⚠️ hampir habis':''}`;
}).join('\n'):'Belum ada anggaran yang diatur';
const whThisMonth=D.workDays.filter(w=>{const d=new Date(w.date);return d.getMonth()===m&&d.getFullYear()===y;});
const whAllTime=D.workDays.length;
const gajiThisMonth=whThisMonth.reduce((s,w)=>s+(w.total||0),0);
const gajiAbsensi=whThisMonth.length?`${whThisMonth.length} hari kerja bulan ini, estimasi gaji ${fmtFull(gajiThisMonth)} | Total semua waktu: ${whAllTime} hari tercatat`:'Belum ada absensi bulan ini';
const pz=D.pajakZakat;
const zpWajib=inc>=pz.nisabPenghasilanBulan;
const zpJumlah=zpWajib?Math.round(inc*0.025):0;
const zpInfo=`Zakat Penghasilan bulan ini: pemasukan ${fmtFull(inc)} vs nisab ${fmtFull(pz.nisabPenghasilanBulan)} → ${zpWajib?'✅ WAJIB zakat '+fmtFull(zpJumlah):'⬜ belum wajib (di bawah nisab)'}`;
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable).reduce((s,a)=>s+(a.nilai||0),0);
const totalHartaZakat=Math.max(0,totalSaldoAkun()+asetZakatable-(pz.utangJT||0)-totalDebtValue()-totalCicilanOutstanding());
const nisabMaal=85*pz.hargaEmasPerGram;
const cukupNisabMaal=totalHartaZakat>=nisabMaal;
let haulInfo='belum mencapai nisab';
let haulOk=false;
if(cukupNisabMaal){
if(!pz.haulMaalMulai) haulInfo='baru capai nisab, haul belum mulai dihitung';
else{ const hari=Math.floor((new Date()-new Date(pz.haulMaalMulai))/86400000); haulOk=hari>=354; haulInfo=haulOk?`sudah haul (${hari} hari sejak ${pz.haulMaalMulai})`:`haul berjalan ${hari}/354 hari`; }
}
const zmJumlah=(cukupNisabMaal&&haulOk)?Math.round(totalHartaZakat*0.025):0;
const zmInfo=`Zakat Maal: harta bersih ${fmtFull(totalHartaZakat)} vs nisab 85gr emas ${fmtFull(nisabMaal)} → ${(cukupNisabMaal&&haulOk)?'✅ WAJIB zakat '+fmtFull(zmJumlah):'⬜ belum wajib'} (${haulInfo})`;
const zakatLogInfo=(pz.zakatLog||[]).slice(0,3).map(l=>`${l.jenis} ${l.tanggal} ${fmtFull(l.jumlah)}`).join('; ')||'Belum ada riwayat pembayaran';
const vehTaxInfo=vehiclesForAI.map(v=>{
const items=Object.entries(VEHTAX_ITEMS).map(([,cfg])=>`${cfg.label.replace(/^\S+\s/,'')}: ${dateStatusBadge(v[cfg.tglKey]).label}`).join(', ');
return `${v.name} — ${items}`;
}).join(' | ')||'Belum ada kendaraan';
const simInfo=(D.simList||[]).length?D.simList.map(s=>`${s.nama} (${s.jenis}): ${dateStatusBadge(s.tglAkhir).label}`).join(', '):'Belum ada data SIM';
const pbbBumi=parsePzNum(document.getElementById('pbbNjopBumi')?.value||0);
const pbbBangunan=parsePzNum(document.getElementById('pbbNjopBangunan')?.value||0);
let pbbInfo='Belum diisi kalkulator PBB';
if(pbbBumi+pbbBangunan>0){
const kenaPajak=Math.max(0,(pbbBumi+pbbBangunan)-pz.pbb.njoptkp);
const terutang=Math.round(kenaPajak*(pz.pbb.tarifPersen/100));
pbbInfo=`NJOP total ${fmtFull(pbbBumi+pbbBangunan)} → PBB terutang ${fmtFull(terutang)}/tahun`;
}
const pphBrutoBulan=parsePzNum(document.getElementById('pphBruto')?.value||0);
let pphInfo='Belum diisi kalkulator PPh 21';
if(pphBrutoBulan>0){
const pphStatusVal=document.getElementById('pphStatus')?.value||'TK0';
const pphIuranBulan=parsePzNum(document.getElementById('pphIuran')?.value||0);
const brutoSetahun=pphBrutoBulan*12;
const biayaJabatan=Math.min(brutoSetahun*0.05,6000000);
const neto=Math.max(0,brutoSetahun-biayaJabatan-pphIuranBulan*12);
const pkp=Math.max(0,Math.floor((neto-getPTKP(pphStatusVal))/1000)*1000);
const{pajak}=hitungPPh21Progresif(pkp);
pphInfo=`PPh 21 setahun ${fmtFull(pajak)} (≈${fmtFull(Math.round(pajak/12))}/bulan), status ${pphStatusVal}`;
}
const umkmPajakBulan=Math.round(shopOmzetThisMonth*0.005);
const wantAsetDetail=mentionsAny('aset','harta','kekayaan','emas','tanah','rumah','investasi','net worth','netword','zakatable','portofolio','portfolio','kripto','crypto','saham','reksadana','untung','rugi','cuan','profit','loss','performa');
const totalAsetNilai=totalAssetValue();
const asetListInfoFull=(D.assets||[]).length?D.assets.map(a=>{
let s=`${escapeHtml(a.name)} (${a.jenis}${a.zakatable?', zakatable':''}): nilai saat ini ${fmtFull(a.nilai)}`;
if(a.modalInvestasi){
const pct=a.keuntunganPct;
s+=`, modal investasi ${fmtFull(a.modalInvestasi)}, untung/rugi ${a.keuntungan>=0?'+':''}${fmtFull(a.keuntungan)} (${pct>=0?'+':''}${pct.toFixed(2)}%)`;
}
if(a.jumlahUnit!=null)s+=`, jumlah unit ${a.jumlahUnit}`;
if(a.hargaBeli!=null)s+=`, harga beli/unit ${a.hargaBeli}`;
return s;
}).join('; '):'Belum ada aset tercatat';
const asetListInfo=wantAsetDetail?asetListInfoFull:((D.assets||[]).length?`${D.assets.length} aset tercatat (ringkasan — tanya lebih spesifik utk detail per aset)`:'Belum ada aset tercatat');
const netWorth=totalSaldoAkun()+totalAsetNilai-(pz.utangJT||0)-totalDebtValue()-totalCicilanOutstanding();
let fiInfo='Belum ada data transaksi yang cukup untuk hitung Kebebasan Finansial.';
try{
if(typeof fiGetAssumptions==='function'&&D.transactions&&D.transactions.length){
const{swr,ret,inf}=fiGetAssumptions();
const fiTarget=fiTargetNominal();
const fiAsetBersih=fiNetAssetFund();
const fiUtang=fiTotalDebt();
const fiSurplus=fiMonthlySurplus();
const fiAnnualExp=fiAnnualExpense();
const monthsToGo=fiEstimateMonthsToTarget();
const progPct=fiTarget>0?Math.min(999,Math.round(fiAsetBersih/fiTarget*100)):0;
const scope=(D.finansialFreedom&&D.finansialFreedom.assetScope==='semua')?'semua aset tercatat':'aset investasi/zakatable saja (bukan rumah tinggal/kendaraan pakai sehari-hari)';
fiInfo=`Target FI (${(100/swr).toFixed(1)}x pengeluaran tahunan, SWR ${swr}%): ${fmtFull(fiTarget)} (pengeluaran tahunan acuan ${fmtFull(fiAnnualExp)}). Dana FI saat ini (${scope}, dikurangi utang ${fmtFull(fiUtang)}): ${fmtFull(fiAsetBersih)} → progress ${progPct}%. Surplus/bulan (pemasukan-pengeluaran rata-rata): ${fmtFull(fiSurplus)}. Asumsi Return ${ret}%/th, Asumsi Inflasi ${inf}%/th (return riil ${((( 1+ret/100)/(1+inf/100)-1)*100).toFixed(1)}%/th, dipakai supaya target & estimasi tetap dlm nilai uang hari ini). Estimasi waktu capai FI dgn asumsi ini: ${monthsToGo===0?'🎉 sudah tercapai':monthsToGo===null?'>100 tahun (surplus/return kurang, atau minus)':fiFormatMonths(monthsToGo)}.`;
}
}catch(e){ console.warn('Gagal hitung ringkasan FI utk konteks chat AI:',e); }
const unifiedBriefingText=unifiedBriefingChatContext();
const recommendationText=recommendationPanelChatContext();
const actionQueueText=actionQueueChatContext();
const systemPrompt=`Kamu adalah PENASIHAT KEUANGAN PRIBADI sekaligus asisten all-in-one untuk ${D.profile.nama||'W'}, pria Indonesia kerja di toko mebel Borobudur, LDR dengan keluarga di Pekalongan.

PERANMU:
- Penasihat keuangan yang jujur, analitis, dan peduli — kasih saran nyata, bukan basa-basi
- Bantu analisa pengeluaran, tren, efisiensi, dan peluang hemat/cuan
- GAYA NGOBROL: santai & akrab banget, kayak ngobrol sama sahabat sendiri lewat WhatsApp — BUKAN gaya customer service atau laporan formal. Pakai bahasa sehari-hari yang ringan, boleh sesekali pakai emoji secukupnya (jangan berlebihan), hindari kata-kata kaku/baku/korporat kayak "Berdasarkan data yang tersedia..." atau "Dapat disimpulkan bahwa...".
- FORMAT JAWABAN: langsung ke poin-poin penting pakai bullet (• atau -), JANGAN nulis paragraf panjang bertele-tele. Buka dengan 1 kalimat singkat kalau perlu konteks, terus langsung poin-poin utamanya — tiap poin singkat & padat, angka/data penting ditulis jelas. Kalau ujungnya perlu kesimpulan/saran, kasih 1 baris penutup singkat, bukan paragraf.
- Tetap LENGKAP dan TUNTAS — jangan potong di tengah, jangan skip bagian pertanyaan yang belum kejawab — tapi rangkumnya padat, hindari basa-basi yang cuma buang-buang waktu baca.
- Tidak ada batas kata, tapi utamakan singkat, jelas, to the point dibanding panjang & muter-muter.
- CATATAN DATA: beberapa bagian (kendaraan/produk shop/sparepart/aset) ditampilkan RINGKAS kalau pertanyaan user tidak spesifik menyinggung topik itu — supaya hemat. Kalau user tanya lebih detail soal salah satu topik itu, dia akan otomatis dapat versi lengkap di pertanyaan berikutnya (tidak perlu kamu minta dia ganti prompt, cukup jawab dari ringkasan yang ada, atau bilang "tanya lebih spesifik ya" kalau datanya belum cukup).
- USUL AKSI (opsional): kalau dari obrolan JELAS user mau MENCATAT sesuatu yang konkret (bukan cuma nanya/curhat) — misal "catat aku abis beli bensin 50rb", "tambahin tagihan listrik 200rb jatuh tempo tgl 20", "servis motor kemarin ganti oli 80rb", "target nabung liburan 5jt", "catat anak udah bisa jalan hari ini", "masukin kampas rem 150rb ke wishlist/prioritas belanja" — tutup balasanmu dengan SATU blok persis format ini (di baris baru, setelah teks normal, JANGAN taruh di tengah kalimat):
[[ACTION]]{"type":"<salah satu: add_transaksi|add_tagihan|add_servis|add_target|add_catatan_anak|add_wishlist>","data":{...}}[[/ACTION]]
  Field per tipe:
  • add_transaksi: {type:"income"|"expense", amount:number, category:string, subcategory?:string, note?:string, date?:"YYYY-MM-DD"}
  • add_tagihan: {name:string, amount:number, nextDue:"YYYY-MM-DD", freq?:"bulanan"|"tahunan"|"sekali", category?:string, note?:string}
  • add_servis: {vehicleName:string, item:string, cost:number, date?:"YYYY-MM-DD", km?:number, note?:string}
  • add_target: {name:string, amount:number, saved?:number, emoji?:string}
  • add_catatan_anak: {text:string, date?:"YYYY-MM-DD"}
  • add_wishlist: {name:string, price:number, cat?:"kebutuhan"|"keinginan", urgensi?:"mendesak"|"bisa_nunggu"|"nice_to_have", hargaNormal?:number (isi kalau lagi diskon, harus > price), sudahPunya?:boolean, sudahPunyaAlasan?:string} — INI CUMA nambah rencana belanja ke daftar Prioritas Belanja, BUKAN mencatat transaksi/pengeluaran nyata. Kalau user bilang sudah BELI barangnya (bukan sekadar berencana), pakai add_transaksi biasa, bukan add_wishlist.
  JSON harus valid (pakai tanda kutip ganda, tanpa komentar, TANPA trailing comma). MAKSIMAL 1 blok ACTION per balasan. JANGAN pakai blok ini kalau user cuma nanya/minta saran/analisa — itu murni dijawab teks biasa. Data BELUM tersimpan begitu kamu kirim blok ini — sistem akan tampilkan tombol konfirmasi ke user dulu, jangan bilang "sudah kucatat" seolah-olah sudah pasti tersimpan, cukup bilang "cek & konfirmasi tombol di bawah ya". PENTING: kalimat "cek & konfirmasi tombol di bawah" HANYA boleh kamu tulis kalau blok [[ACTION]]...[[/ACTION]] beneran ada persis di balasanmu (lengkap dgn tag pembuka & penutup, JSON valid) — jangan pernah janji ada tombol kalau blok-nya nggak kamu sertakan, itu bikin user bingung karena tombolnya nggak akan muncul.

DATA KEUANGAN BULAN INI (${new Date().toLocaleString('id-ID',{month:'long',year:'numeric'})}):
Pemasukan: ${fmtFull(inc)} | Pengeluaran: ${fmtFull(exp)} | Bersih: ${fmtFull(inc-exp)} | Jumlah transaksi: ${txM.length}

SALDO AKUN: ${accInfo}
TAGIHAN/CICILAN AKTIF: ${billInfo}
TARGET TABUNGAN: ${targetInfo}
DANA PENDIDIKAN: ${eduFundInfo}
PROYEK RENOVASI: ${renovInfo}
SEWA KIOS: ${sewaKiosInfo}
UTANG (belum lunas): ${debtInfo}
PIUTANG (belum lunas): ${piutangInfo}
DANA PENSIUN: ${pensiunInfo}

PENDAPATAN TETAP:
- Gaji toko mebel Borobudur bulan ini: ${fmtFull(gajiThisMonth)} (dari ${whThisMonth.length} hari kerja tercatat, tarif ${fmtFull(D.profile.gajiPokok||0)}/hari)
- Kiriman istri (sesuai pengaturan): ${fmtFull(D.profile.kiriman||0)}/bulan
- Dana darurat: Rp 10jt (BKK) ✅ | RDPU Bibit: Rp 11jt (aset tetap, belum tercatat di modul Buku Aset)
- Kios Borobudur ±34m² milik sendiri (rencana dikontrakkan)

PAJAK & ZAKAT:
- ${zpInfo}
- ${zmInfo}
- Riwayat zakat dibayar (3 terakhir): ${zakatLogInfo}
- Pajak Kendaraan (STNK/uji kelayakan): ${vehTaxInfo}
- SIM: ${simInfo}
- PBB: ${pbbInfo}
- PPh 21: ${pphInfo}
- Pajak UMKM Shop (0.5% omzet bulan ini): ${fmtFull(umkmPajakBulan)}

ASET & KEKAYAAN BERSIH:
- Total nilai aset tercatat: ${fmtFull(totalAsetNilai)} — ${asetListInfo}
- Kekayaan bersih (saldo akun + aset − utang): ${fmtFull(netWorth)}

KEBEBASAN FINANSIAL (FI) & INFLASI:
${fiInfo}
Kalau user tanya soal "kapan bisa pensiun/FIRE/kebebasan finansial", "cukup gak tabunganku buat FI", atau minta analisa dampak inflasi ke rencana keuangannya, JAWAB pakai angka-angka di atas (jangan bilang tidak tahu / minta dia buka menu lain) — kamu SUDAH punya datanya. Kalau progress masih jauh, kasih saran konkret (naikkan surplus bulanan, kurangi pengeluaran kategori tertentu, atau evaluasi asumsi return/inflasi) — bukan cuma restate angka.

${unifiedBriefingText?`RINGKASAN AI HARIAN (Finance & Vehicle terpadu):\n${unifiedBriefingText}\n\n`:''}${recommendationText?`REKOMENDASI AI (Finance & Vehicle terpadu):\n${recommendationText}\n\n`:''}${actionQueueText?`ANTREAN TINDAKAN (Action Queue):\n${actionQueueText}\n\n`:''}PENGELUARAN 3 BULAN TERAKHIR PER KATEGORI:
${Object.entries(katMap).map(([k,v])=>`  ${k}: pemasukan ${fmtFull(v.inc)}, pengeluaran ${fmtFull(v.exp)}`).join('\n')}

BISNIS SHOP (batu shop PO system):
- All-time: omzet ${fmtFull(shopOmzet)}, untung ${fmtFull(shopTotal)}, ${D.cobek.length} transaksi
- Bulan ini: omzet ${fmtFull(shopOmzetThisMonth)}, untung ${fmtFull(shopUntungThisMonth)}, ${shopThisMonth.length} transaksi
- Produk etalase: ${shopProdukStok}
- Modal Stok tertanam (HPP x sisa stok semua produk, ini uang yg belum jadi cash lagi): ${fmtFull(shopModalStok)}
- Stok menipis (≤2): ${shopLowStok}
- Produsen/supplier: ${shopProdusenInfo}

ABSENSI & GAJI: ${gajiAbsensi}

ANGGARAN BULAN INI:
${budgetInfo}

KELUARGA & ANAK:
- Perkembangan anak: ${msDone}/5 milestone tercapai. Catatan: ${anakInfo}

KENDARAAN (data lengkap per unit):${vehicleInfo}

STOK SPAREPART GUDANG: ${stockSparepartAll}
Sparepart menipis: ${stockSparepartLow}`;
D.chatHistory.push({role:'user',content:msg});
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Belum ada API Key. Buka Pengaturan → AI Asisten, pilih provider & masukkan API key dulu ya W.</div>`;
box.scrollTop=box.scrollHeight;
D.chatHistory.pop();
return;
}
try{
let reply;
const r=await callAIProviderRaw(systemPrompt,D.chatHistory.slice(-10));
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div>`;
D.chatHistory.pop();
box.scrollTop=box.scrollHeight;
return;
}
reply=r.text||'Maaf, coba lagi ya W!';
const{text:cleanText,action,actionError}=extractChatAction(reply);
D.chatHistory.push({role:'assistant',content:cleanText||reply});
save();
loading.remove();
if(cleanText)box.innerHTML+=`<div class="chat-bubble ai">${escapeHtml(cleanText).replaceAll('\n','<br>')}</div>`;
if(action){
const actionId='a'+Date.now()+Math.floor(Math.random()*1000);
_pendingChatActions[actionId]={type:action.type,data:action.data};
box.innerHTML+=renderChatActionBubble(actionId,action.type,action.data);
}else if(actionError){
box.innerHTML+=`<div class="chat-bubble ai" style="border:1px solid #ff5050">
        <div class="u-fw700" style="color:#ff5050">⚠️ Tombol konfirmasi gagal dibuat</div>
        <div class="u-fs13 u-t2" style="margin:4px 0 8px">AI mencoba mengusulkan aksi tapi datanya tidak terbaca dengan benar. Coba ulangi pesannya, atau isi manual lewat form.</div>
        <div class="u-flex u-gap8 u-fwrap">
          <button class="btn btn-ghost btn-sm" data-action="openTxModal" data-args='["expense"]' aria-label="Edit/Buka">✏️ Buka Form Transaksi</button>
        </div>
      </div>`;
}else if(/tombol.{0,15}(di ?bawah|konfirmasi)|cek ?&? ?konfirmasi/i.test(cleanText)){
box.innerHTML+=`<div class="chat-bubble ai" style="border:1px solid #ff5050">
        <div class="u-fw700" style="color:#ff5050">⚠️ Tombol konfirmasi tidak muncul</div>
        <div class="u-fs13 u-t2" style="margin:4px 0 8px">AI menyebut ada tombol konfirmasi tapi lupa menyertakannya. Coba minta lagi ("tolong tampilkan tombol konfirmasinya"), atau isi manual.</div>
        <div class="u-flex u-gap8 u-fwrap">
          <button class="btn btn-ghost btn-sm" data-action="openTxModal" data-args='["expense"]' aria-label="Edit/Buka">✏️ Buka Form Transaksi</button>
        </div>
      </div>`;
}
}catch(e){
loading.remove();
box.innerHTML+=`<div class="chat-bubble ai">⚠️ Gagal terhubung: ${escapeHtml(e.message||'koneksi bermasalah')}. Pastikan online & API key valid ya! 🙏</div>`;
D.chatHistory.pop();
}
box.scrollTop=box.scrollHeight;
}
// callAIProviderRaw — SATU-SATUNYA tempat yang benar-benar fetch() ke Claude/Gemini di seluruh
// app. Awalnya cuma dipakai AIWidget.generate(), sekarang jadi tempat bersama utk 6 fitur AI yang
// ada (chat asisten, AIWidget laporan, RenovAI, RefAI, PriceReko.checkMarketAI, EduFund.checkAI) —
// sebelumnya tiap fitur itu copy-paste sendiri kode fetch Claude+Gemini (6x kode yang HAMPIR SAMA
// PERSIS, cuma beda systemPrompt/messages/maxTokens/perlu web_search atau tidak). Dirapikan supaya
// nambah provider AI baru, ganti model, atau benerin bug fetch cukup di 1 tempat.
// opts (semua opsional): {maxTokens:number (default 4096), webSearch:boolean (default false, aktifkan
// tool pencarian web server-side — Gemini google_search / Claude web_search_20250305, dipakai
// fitur yang butuh info TERBARU spt harga emas/harga pasar/biaya sekolah, BUKAN utk chat/saran biasa)}
// Return: {ok:true,text} kalau sukses (text = gabungan SEMUA blok teks di balasan, bukan cuma blok
// pertama — penting utk balasan yang pakai web_search, karena balasannya bisa berisi beberapa blok
// teks diselingi hasil pencarian, bukan cuma 1 blok di awal), atau {ok:false,errMsg,status} kalau
// gagal (status = HTTP status code kalau ada, dipakai caller utk kasih hint spesifik spt "cek API key").
async function callAIProviderRaw(systemPrompt,messages,opts){
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey)return{ok:false,errMsg:'no_api_key'};
const maxTokens=(opts&&opts.maxTokens)||4096;
const useWebSearch=!!(opts&&opts.webSearch);
try{
if(provider==='gemini'){
const geminiContents=messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
const body={system_instruction:{parts:[{text:systemPrompt}]},contents:geminiContents,generationConfig:{maxOutputTokens:maxTokens}};
if(useWebSearch)body.tools=[{google_search:{}}];
const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const data=await res.json();
if(!res.ok)return{ok:false,errMsg:data?.error?.message||`HTTP ${res.status}`,status:res.status};
const text=(data.candidates?.[0]?.content?.parts||[]).filter(p=>p.text).map(p=>p.text).join('\n').trim();
return{ok:true,text};
} else {
const body={model:'claude-sonnet-4-6',max_tokens:maxTokens,system:systemPrompt,messages};
if(useWebSearch)body.tools=[{type:'web_search_20250305',name:'web_search'}];
const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
const data=await res.json();
if(!res.ok)return{ok:false,errMsg:data?.error?.message||`HTTP ${res.status}`,status:res.status};
const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n').trim();
return{ok:true,text};
}
}catch(e){
return{ok:false,errMsg:e.message||'koneksi bermasalah'};
}
}
// authHint — dipakai caller (chat, RefAI, PriceReko, EduFund) utk kasih saran singkat spesifik
// per status HTTP, ngikutin pesan yang dulu ditulis manual & beda2 dikit di tiap fitur (skrg disatukan
// di 1 fungsi supaya konsisten): Claude 401 = API key salah/expired, Gemini 400/403 = cek API key.
function aiErrorHint(provider,status){
if(provider==='gemini')return(status===400||status===403)?' (cek API key di Pengaturan)':'';
return status===401?' (API key salah/expired, cek di Pengaturan)':'';
}
// Advisor — pengatur tab utk card gabungan "🧭 Penasihat" (v124, kw145-fuel-intelligence-integration-2):
// dulu FinCoach ("🩺 Insight Cepat", rule-based-gratis-instan) & AIWidget ("🔍 Laporan AI",
// panggil Claude/Gemini, wajib API key) tampil sbg 2 card TERPISAH di Dashboard — sekarang
// digabung jadi SATU card dgn 2 tab, supaya tidak terasa ada "2 penasihat AI" yang mirip2.
// Cuma UI switcher (toggle panel mana yang tampil + simpan preferensi tab terakhir), TIDAK ubah
// logika FinCoach/AIWidget sama sekali — keduanya tetap modul independen spt sebelumnya, cuma
// target render-nya sekarang panel di dalam 1 card yang sama (`#finCoachBody`/`#aiWidgetBody`).
const Advisor={
LS_KEY:'kw_advisor_tab',
current(){ try{return localStorage.getItem(Advisor.LS_KEY)||'coach';}catch(e){return'coach';} },
setTab(tab){
try{localStorage.setItem(Advisor.LS_KEY,tab);}catch(e){}
Advisor.render();
},
render(){
const tab=Advisor.current()==='report'?'report':'coach';
const bC=document.getElementById('advisorTabBtn-coach'),bR=document.getElementById('advisorTabBtn-report');
const pC=document.getElementById('advisorPanel-coach'),pR=document.getElementById('advisorPanel-report');
if(!bC||!bR||!pC||!pR)return;
bC.classList.toggle('active',tab==='coach');
bR.classList.toggle('active',tab==='report');
pC.classList.toggle('u-dnone',tab!=='coach');pC.style.display=tab==='coach'?'block':'none';
pR.classList.toggle('u-dnone',tab!=='report');pR.style.display=tab==='report'?'block':'none';
}
};
// AIRecommendCard — Sesi 14 (TODO.md #1, wiring recordOutcome() dari 1 titik UI nyata): kartu
// kecil di dalam "🧭 Penasihat" > tab "🩺 Insight Cepat" (di bawah FinCoach), khusus buat
// rekomendasi dari AIDecision (mesin Rule/Cross-Module Tahap 4, TERPISAH dari FinCoach yg
// rule-based lama/tidak pakai AIDecision sama sekali). Tombol Terima/Tolak/Abaikan manggil
// AIDecision.learn.recordOutcome(ruleId,'accepted'|'rejected'|'ignored') SUNGGUHAN — sebelum
// sesi ini, recordOutcome() cuma pernah dipanggil dari test, TIDAK PERNAH dari UI nyata manapun.
// Pola dismiss (LS_KEY per id, bukan per ruleId — 1 rule bisa trigger ulang lain waktu dgn
// decision id baru) SENGAJA disalin dari FinCoach.dismiss()/dismissedIds() yang sudah ada,
// BUKAN mekanisme baru.
//
// Sesi 32 (Tahap 6 — AI Learning, TARGET sesi ini): tambah tombol ketiga "✗ Tolak" (outcome
// 'rejected'). SEBELUM sesi ini cuma 'accepted'/'ignored' yang bisa dipicu dari UI nyata —
// padahal AIDecision.learn.getConfidence() (Sesi 19, dipakai buat urutan tampil) rumusnya
// accepted/(accepted+rejected) dan SENGAJA MENGABAIKAN 'ignored' (lihat komentar getConfidence
// di ai-decision-engine.js: "belum tentu penolakan"). Akibatnya sebelum sesi ini, confidence
// adaptif TIDAK PERNAH bisa turun dari histori pemakaian nyata (rejected selalu 0) — rule yang
// rekomendasinya berulang kali di-"Abaikan" user tetap dianggap confidence netral/tinggi,
// AI Learning secara efektif belum benar-benar "belajar". Tombol "Tolak" mengisi celah itu
// TANPA UI baru (masih dalam kartu yang sama) & TANPA logic baru (outcome 'rejected' sudah ada
// di AI_VALID_OUTCOMES sejak Sesi 2, reuse act() yang sudah generic menerima outcome apa pun).
// "Abaikan" TETAP ada & TETAP tidak mempengaruhi confidence (dismiss netral, pola lama tidak
// berubah) — beda semantik dgn "Tolak" yang eksplisit menyatakan rekomendasi ini tidak relevan/
// tidak dipercaya.
const AIRecommendCard={
DISMISS_LS_KEY:'kw_ai_recommend_dismissed',
dismissedIds(){
try{return JSON.parse(localStorage.getItem(AIRecommendCard.DISMISS_LS_KEY)||'[]');}catch(e){return[];}
},
markDismissed(id){
const cur=AIRecommendCard.dismissedIds();
if(!cur.includes(id))cur.push(id);
try{localStorage.setItem(AIRecommendCard.DISMISS_LS_KEY,JSON.stringify(cur.slice(-40)));}catch(e){}
},
// act(id, ruleId, outcome) — dipanggil tombol Terima/Abaikan. recordOutcome() SELALU dipanggil
// dulu (persist ke AIStore.learningData) baru SETELAH itu disembunyikan dari kartu (dismiss),
// supaya kalau recordOutcome() gagal (mis. ruleId kosong/tidak valid), kartu TETAP tampil —
// tidak diam-diam kehilangan rekomendasi tanpa ke-catat.
async act(id,ruleId,outcome){
try{
if(typeof AIDecision!=='undefined')await AIDecision.learn.recordOutcome(ruleId,outcome);
}catch(e){console.warn('AIRecommendCard: gagal recordOutcome',e);}
AIRecommendCard.markDismissed(id);
toast(outcome==='accepted'?'✅ Oke, dicatat sebagai rekomendasi yang membantu.':outcome==='rejected'?'👎 Oke, dicatat — rule ini akan lebih jarang tampil ke depannya.':'👍 Oke, tidak akan diprioritaskan lagi.');
AIRecommendCard.render();
},
// render() — async (beda dari FinCoach.renderDash() yg sync) krn AIDecision.decide() sendiri
// async (baca/tulis IndexedDB via AIStore, pola sama dgn AIWidget.generate()). Dipanggil TANPA
// await dari renderDashboard() (fire-and-forget, DOM diisi begitu Promise selesai) — pola yang
// SAMA PERSIS dgn cara AIWidget/EIEDashboard dipanggil di file ini & modules-render.js.
async render(){
const body=document.getElementById('aiRecommendBody');
if(!body)return;
if(typeof AIDecision==='undefined')return; // ai-decision-engine.js belum di-load, diam saja
let recommendations=[];
try{
const result=await AIDecision.decide({});
recommendations=(result&&Array.isArray(result.recommendations))?result.recommendations:[];
}catch(e){console.warn('AIRecommendCard: gagal ambil rekomendasi',e);return;}
const dismissed=AIRecommendCard.dismissedIds();
recommendations=recommendations.filter(r=>r&&r.id&&!dismissed.includes(r.id));
if(!recommendations.length){body.innerHTML='';return;}
// Sesi 19 (TODO.md Tahap 6, getConfidence() dipakai buat urutan tampil): sebelum sesi ini
// getConfidence() cuma dicatat (dipanggil dari test), TIDAK dipakai buat apa pun di UI —
// urutan tampil murni urutan trigger rule dari decide(). Sekarang, sebelum dipotong ke 2
// teratas, rekomendasi diurutkan descending berdasar skor gabungan: confidence dari weight
// rule (r.confidence, sudah ada di formatRecommendation) DIKALI confidence adaptif dari
// histori Terima/Abaikan user (AIDecision.learn.getConfidence(ruleId), rasio accepted/
// (accepted+rejected), default 0.5 netral kalau belum ada histori). Guard: kalau
// AIDecision.learn/getConfidence tidak ada (mock lama/versi AIDecision lain), skip sorting —
// urutan asli dari decide() dipakai apa adanya, TIDAK error.
if(recommendations.length>1&&typeof AIDecision.learn!=='undefined'&&typeof AIDecision.learn.getConfidence==='function'){
try{
const scored=await Promise.all(recommendations.map(async r=>({
rec:r,
score:(typeof r.confidence==='number'?r.confidence:0.5)*(r.ruleId?await AIDecision.learn.getConfidence(r.ruleId):0.5),
})));
scored.sort((a,b)=>b.score-a.score);
recommendations=scored.map(s=>s.rec);
}catch(e){console.warn('AIRecommendCard: gagal urutkan berdasar confidence',e);}
}
const top=recommendations.slice(0,2);
// Sesi 42 (Tahap 6 AI Learning lanjutan, TARGET sesi ini — keputusan final
// docs/PRODUCT_DECISIONS.md § "Tahap 6 AI Learning lanjutan"): baris statistik
// histori Terima/Tolak/Abaikan per rule, baris kecil TAMBAHAN di kartu yang
// SUDAH ADA ini — BUKAN halaman/route/chart/modal baru. Reuse PENUH
// AIDecision.learn.getStats(ruleId) (sudah ada sejak Sesi 14, balikin
// {accepted,rejected,ignored}) — TIDAK ada storage/helper baru. Guard: kalau
// getStats tidak tersedia (versi AIDecision lama/mock) ATAU rule belum
// pernah punya histori sama sekali (accepted+rejected+ignored===0), baris
// statistik TIDAK ditampilkan (bukan 0/0/0 kosong) — sama pola "TIDAK
// menebak/menampilkan data yang belum ada" dgn deliverySummary/dst.
const statsByRuleId={};
if(typeof AIDecision.learn!=='undefined'&&typeof AIDecision.learn.getStats==='function'){
try{
await Promise.all(top.filter(r=>r&&r.ruleId).map(async r=>{
const s=await AIDecision.learn.getStats(r.ruleId);
if(s&&((s.accepted||0)+(s.rejected||0)+(s.ignored||0))>0)statsByRuleId[r.ruleId]=s;
}));
}catch(e){console.warn('AIRecommendCard: gagal ambil statistik histori',e);}
}
body.innerHTML=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🤖 Rekomendasi AI</div>`
+top.map(r=>{
const s=statsByRuleId[r.ruleId];
return `
      <div class="u-mb8" style="border-left:3px solid var(--accent);padding-left:8px">
        <div class="u-fs12 u-lh15 u-mb6">${escapeHtml(r.title||'')} — ${escapeHtml(r.reason||'')}</div>
        ${s?`<div class="u-fs10 u-t2 u-mb6">📊 ✓ Terima ${s.accepted||0} · ✗ Tolak ${s.rejected||0} · Abaikan ${s.ignored||0}</div>`:''}
        <div class="u-flex u-gap8">
          <button class="btn btn-primary btn-sm u-flex1" data-action="AIRecommendCard.act" data-args="${escapeHtml(JSON.stringify([r.id,r.ruleId,'accepted']))}">✓ Terima</button>
          <button class="btn btn-ghost btn-sm u-flex1" data-action="AIRecommendCard.act" data-args="${escapeHtml(JSON.stringify([r.id,r.ruleId,'rejected']))}">✗ Tolak</button>
          <button class="btn btn-ghost btn-sm u-flex1" data-action="AIRecommendCard.act" data-args="${escapeHtml(JSON.stringify([r.id,r.ruleId,'ignored']))}">Abaikan</button>
        </div>
      </div>`;}).join('');
}
};
// AIDailyBriefingCard — Dashboard/nav wiring dailyBriefing() (TODO.md #2, lanjutan Sesi 15).
// Kartu kecil di dalam "🧭 Penasihat" > tab "🩺 Insight Cepat", DI BAWAH AIRecommendCard —
// reuse pola card yang sudah ada di file ini (container khusus, guard typeof, fire-and-forget
// dari renderDashboard(), sembunyikan diri kalau tidak ada apa pun buat ditampilkan), BUKAN
// mekanisme baru. Sumber data: AIService.dailyBriefing() (sudah ada sejak Sesi 2, "senyap" karena
// belum pernah dipanggil dari UI mana pun sampai sesi ini) — murni MEMBACA (dailyBriefing() sendiri
// tidak memicu evaluasi rule baru/tidak menulis apa pun), jadi aman dipanggil tiap render Beranda.
// Beda dari AIRecommendCard (rekomendasi individual + tombol Terima/Abaikan): kartu ini ringkasan
// (jumlah keputusan AI terbaru + ringkasan pengiriman kalau ada order Cobek pending) — TIDAK ada
// interaksi/tombol, murni display, jadi TIDAK butuh localStorage dismiss.
const AIDailyBriefingCard={
async render(){
const body=document.getElementById('aiBriefingBody');
if(!body)return;
if(typeof AIService==='undefined'){body.innerHTML='';return;} // ai-service.js belum di-load, diam saja
let briefing=null;
try{
briefing=await AIService.dailyBriefing({limit:5});
}catch(e){console.warn('AIDailyBriefingCard: gagal ambil dailyBriefing',e);return;}
if(!briefing){body.innerHTML='';return;}
const decisionCount=(briefing.recentDecisions||[]).length;
const ds=briefing.deliverySummary;
// Tidak ada apa pun buat ditampilkan (0 keputusan terbaru & tidak ada ringkasan pengiriman) ->
// kosongkan body (pola sama dgn AIRecommendCard.render() saat recommendations kosong), supaya
// tidak nambah ruang kosong di Beranda kalau AI belum "punya cerita" apa-apa.
if(!decisionCount&&!ds){body.innerHTML='';return;}
let html=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">📋 Ringkasan Harian AI</div>`;
html+=`<div class="u-fs12 u-lh15 u-mb6 u-t2">${decisionCount} keputusan AI terbaru tercatat.</div>`;
if(ds){
const totalPenjualan=(ds.profit&&typeof ds.profit.totalPenjualan==='number')?ds.profit.totalPenjualan:0;
html+=`<div class="u-fs12 u-lh15 u-mb6" style="border-left:3px solid var(--accent);padding-left:8px">📦 Order Cobek #${escapeHtml(String(ds.sourceOrderId))} belum dikirim — estimasi penjualan ${escapeHtml(fmt(totalPenjualan))}.</div>`;
}
body.innerHTML=html;
}
};
// AIStatusCard — Service Layer wiring healthCheck() (Sesi 28 lanjutan, TODO.md #6b/Tahap 2 sisa
// sub-item). Kartu status kecil di dalam "🧭 Penasihat" > tab "🩺 Insight Cepat", DI BAWAH
// AIDailyBriefingCard — reuse pola card yang sudah ada di file ini (container khusus, guard
// typeof, fire-and-forget dari renderDashboard()), BUKAN mekanisme baru. Sumber data:
// AIService.healthCheck() (sudah ada sejak Sesi 8, "senyap" karena belum pernah dipanggil dari UI
// mana pun sampai sesi ini, persis pola AIDailyBriefingCard dgn dailyBriefing()) — murni MEMBACA,
// TIDAK menulis apa pun, aman dipanggil tiap render Beranda. Silent kalau semua sehat & tidak ada
// temuan informasional (duplikat/dead rule/broken ref/orphaned storage) — supaya tidak nambah
// ruang kosong tiap buka Beranda kalau AI memang tidak "punya cerita" apa-apa, sama seperti
// AIDailyBriefingCard saat kosong.
const AIStatusCard={
async render(){
const body=document.getElementById('aiStatusBody');
if(!body)return;
if(typeof AIService==='undefined'||typeof AIService.healthCheck!=='function'){body.innerHTML='';return;}
let health=null;
try{
health=await AIService.healthCheck();
}catch(e){console.warn('AIStatusCard: gagal ambil healthCheck',e);return;}
if(!health){body.innerHTML='';return;}
const c=health.checks||{};
const issues=[];
if(health.ok===false)issues.push('⚠️ Ada bagian AI yang belum siap (cek console utk detail).');
if((c.duplicateRuleIds||[]).length)issues.push(`${c.duplicateRuleIds.length} rule terdaftar dobel.`);
if((c.duplicateRecommendations||[]).length)issues.push(`${c.duplicateRecommendations.length} rekomendasi terdaftar dobel.`);
if((c.brokenRecommendationRefs||[]).length)issues.push(`${c.brokenRecommendationRefs.length} referensi rekomendasi rusak.`);
const orphaned=c.orphanedStorageKeys||{};
const orphanedCount=(orphaned.orphanedCooldownRuleIds||[]).length+(orphaned.orphanedLearningDataRuleIds||[]).length;
if(orphanedCount)issues.push(`${orphanedCount} data tersimpan milik rule yang sudah dihapus.`);
if(!issues.length){body.innerHTML='';return;}
body.innerHTML=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt10">🩺 Status AI</div>`
+`<div class="u-fs12 u-lh15 u-t2" style="border-left:3px solid var(--accent4);padding-left:8px">${issues.map(i=>escapeHtml(i)).join('<br>')}</div>`;
}
};
// AISimulateWidget — Service Layer wiring simulate() (Sesi 28 lanjutan, TODO.md #6b/Tahap 2 sisa
// sub-item). Tombol "🧪 Simulasi Cepat (What-If)" di dalam "🧭 Penasihat" > tab "🔍 Laporan AI",
// DI BAWAH tombol Buat/Perbarui Analisis & Konsultasi AI — reuse panel & tombol yang sudah ada,
// BUKAN halaman baru. Sumber: AIService.simulate() (sudah ada sejak Sesi 15, "senyap" karena belum
// pernah dipanggil dari UI mana pun sampai sesi ini) — dipanggil TANPA ctx tambahan (What-If atas
// kondisi data SEKARANG, bukan skenario manual — input skenario manual belum ada UI-nya, di luar
// scope sub-item ini), murni MEMBACA & TIDAK menulis apa pun ke store (simulated:true, lihat
// ai-decision-engine.js decide()). Hasil ditulis ke #aiSimulateBody, TIDAK dipersist (beda dari
// AIWidget.generate() yang nyimpan D.aiWidgetReport), supaya jelas ini cuma simulasi sekali-tap.
const AISimulateWidget={
running:false,
async run(){
if(AISimulateWidget.running)return;
const btn=document.getElementById('aiSimulateBtn');
const body=document.getElementById('aiSimulateBody');
if(typeof AIService==='undefined'||typeof AIService.simulate!=='function'){
if(typeof toast==='function')toast('⚠️ Fitur simulasi AI belum tersedia');
return;
}
AISimulateWidget.running=true;
if(btn){btn.disabled=true;btn.textContent='⏳ Mensimulasikan...';}
try{
const result=await AIService.simulate({});
const recs=(result&&result.recommendations)||[];
if(body){
if(!recs.length){
body.innerHTML=`<div class="u-fs12 u-t2 u-mt8">Simulasi selesai — tidak ada rule yang terpicu dari kondisi data sekarang.</div>`;
} else {
body.innerHTML=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt8">🧪 Hasil Simulasi (${recs.length} rule terpicu, tidak disimpan)</div>`
+recs.map(r=>`<div class="u-mb6 u-fs12 u-lh15" style="border-left:3px solid var(--accent4);padding-left:8px">${escapeHtml(r.title||r.label||'')}${r.reason?' — '+escapeHtml(r.reason):''}</div>`).join('');
}
}
}catch(e){
console.warn('AISimulateWidget: gagal jalankan simulate()',e);
if(typeof toast==='function')toast('⚠️ Gagal jalankan simulasi: '+((e&&e.message)||'error tidak diketahui'));
}
AISimulateWidget.running=false;
if(btn){btn.disabled=false;btn.textContent='🧪 Simulasi Cepat (What-If)';}
}
};
// AIScenarioWidget — UI wiring AIService.simulateScenarios() (Sesi 48, kandidat Batch 2 #1
// "UI wiring simulateScenarios()", `docs/BATCH_PLAN.md`/`docs/NEXT_SESSION.md`). Tombol "📊
// Bandingkan Skenario Pengiriman" DI BAWAH tombol AISimulateWidget, tab yang SAMA "🔍 Laporan
// AI" — reuse panel yang sudah ada, BUKAN halaman/route baru. Pola widget (running guard,
// btn/body pair, disable-saat-jalan, try/catch+toast) DISALIN PERSIS dari AISimulateWidget di
// atas, BUKAN mekanisme baru.
//
// Sumber skenario (KENAPA bukan preset bisnis yang ditebak — lihat catatan `simulateScenarios()`
// di modules/ai/ai-service.js soal "TIDAK butuh keputusan produk baru soal skenario apa yang
// benar"): widget ini TIDAK menebak angka BBM/margin/ongkir apa pun. Setiap order Cobek yang
// BELUM diserahkan (`c.items && c.delivered===false`, filter SAMA PERSIS dgn yang sudah dipakai
// `_aiLastPendingCobekOrder()` di ai-service.js & `cobek-order.js` #106 — bukan rumus baru,
// filter yang sama direplikasi APA ADANYA persis pola yang sudah dipraktikkan di 2 tempat itu)
// jadi SATU skenario berlabel "Order Cobek #<id>", ctx `{delivery:{totalPenjualan,diskon}}` —
// field yang SAMA PERSIS dgn yang sudah dipakai `simulate()` untuk baseline order terakhir,
// cuma sekarang SEMUA order pending dijalankan sekaligus lewat `simulateScenarios()` (bukan cuma
// yang terakhir) supaya user bisa membandingkan lebih dari 1 order nyata dalam 1 tampilan. Kalau
// tidak ada order Cobek pending SAMA SEKALI, body menampilkan pesan kosong (TIDAK menebak data,
// pola sama dgn `deliverySimulation`/`profitSimulation` balik null saat tidak ada baseline).
const AIScenarioWidget={
running:false,
// buildScenariosFromPendingCobek() — pure (tidak menyentuh DOM), gampang dites sendiri.
// Guard `typeof D==='undefined'` sama persis dgn `_aiLastPendingCobekOrder()`.
buildScenariosFromPendingCobek(){
if(typeof D==='undefined'||!D||!Array.isArray(D.cobek))return[];
return D.cobek
.filter(c=>c.items&&c.delivered===false)
.sort((a,b)=>(b.id||0)-(a.id||0))
.map(c=>({name:`Order Cobek #${c.id}`,ctx:{delivery:{totalPenjualan:c.total,diskon:c.diskon}}}));
},
async run(){
if(AIScenarioWidget.running)return;
const btn=document.getElementById('aiScenarioBtn');
const body=document.getElementById('aiScenarioBody');
if(typeof AIService==='undefined'||typeof AIService.simulateScenarios!=='function'){
if(typeof toast==='function')toast('⚠️ Fitur perbandingan skenario AI belum tersedia');
return;
}
const scenarios=AIScenarioWidget.buildScenariosFromPendingCobek();
if(!scenarios.length){
if(body)body.innerHTML='<div class="u-fs12 u-t2 u-mt8">Tidak ada order Cobek pending untuk dibandingkan sebagai skenario.</div>';
return;
}
AIScenarioWidget.running=true;
if(btn){btn.disabled=true;btn.textContent='⏳ Membandingkan...';}
try{
const results=await AIService.simulateScenarios(scenarios);
if(body){
body.innerHTML=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt8">📊 Hasil Perbandingan (${results.length} skenario, tidak disimpan)</div>`
+results.map(item=>{
if(item.error){
return `<div class="u-mb8 u-fs12 u-lh15" style="border-left:3px solid var(--accent4);padding-left:8px"><b>${escapeHtml(item.name)}</b> — gagal: ${escapeHtml(item.error)}</div>`;
}
const recs=(item.result&&item.result.recommendations)||[];
const recLine=recs.length
?recs.map(r=>escapeHtml(r.title||r.label||'')).join(', ')
:'tidak ada rule terpicu';
return `<div class="u-mb8 u-fs12 u-lh15" style="border-left:3px solid var(--accent);padding-left:8px"><b>${escapeHtml(item.name)}</b> — ${recs.length} rule terpicu (${recLine})</div>`;
}).join('');
}
}catch(e){
console.warn('AIScenarioWidget: gagal jalankan simulateScenarios()',e);
if(typeof toast==='function')toast('⚠️ Gagal jalankan perbandingan skenario: '+((e&&e.message)||'error tidak diketahui'));
}
AIScenarioWidget.running=false;
if(btn){btn.disabled=false;btn.textContent='📊 Bandingkan Skenario Pengiriman';}
}
};
// AIHealthCheckWidget — Tahap 8 "pusat diagnostik" (Sesi 34, TODO.md #4e lanjutan). Tombol
// "🩺 Health Check Lengkap" di dalam "🧭 Penasihat" > tab "🔍 Laporan AI", DI BAWAH tombol
// AISimulateWidget — reuse pola tombol on-demand yang sudah ada (fire-on-click, bukan
// fire-and-forget tiap render Beranda seperti AIStatusCard, krn healthCheck() lengkap
// menjalankan 5 fungsi read-only sekaligus utk pengukuran performance, sengaja tidak dipanggil
// otomatis tiap buka Beranda spy tidak nambah beban). Sumber data SATU-SATUNYA:
// AIService.healthCheck() (sudah ada sejak Sesi 8, disempurnakan Sesi 30 dgn field
// `checks.performance`) — TIDAK ada engine/helper/storage baru, murni menyusun ulang field yang
// SUDAH ADA di return healthCheck() jadi 7 checkmark yang diminta target sesi ini: Context
// Collector/Rule Evaluation/Recommendation Engine/Daily Briefing/Simulation/Performance
// Timing/Overall Status. Beda dari AIStatusCard (silent kecuali ada temuan masalah, dipanggil
// tiap render Beranda) — widget ini SELALU menampilkan status lengkap (termasuk saat sehat),
// makanya dipisah sbg aksi manual, BUKAN menggantikan/mengubah perilaku AIStatusCard yang sudah
// ada & sudah dites (backward compatible penuh).
const AIHealthCheckWidget={
running:false,
// Kelima fungsi ini SAMA PERSIS dgn 5 fungsi yang diukur healthCheck() sendiri (lihat
// modules/ai/ai-service.js) — daftar di sini murni utk label tampilan+urutan checklist,
// TIDAK menjalankan ulang/mengukur ulang apa pun (nilai `ms` dibaca dari checks.performance
// yang sudah dihitung 1x oleh healthCheck()).
items(health){
const checks=(health&&health.checks)||{};
const perf=checks.performance||{};
const isMs=(v)=>typeof v==='number'&&isFinite(v);
return[
{label:'Context Collector',ready:checks.contextReady===true,ms:perf.contextCollectorMs},
{label:'Rule Evaluation',ready:isMs(perf.ruleEvaluationMs),ms:perf.ruleEvaluationMs},
{label:'Recommendation Engine',ready:isMs(perf.recommendationMs),ms:perf.recommendationMs},
{label:'Daily Briefing',ready:isMs(perf.dailyBriefingMs),ms:perf.dailyBriefingMs},
{label:'Simulation',ready:isMs(perf.simulationMs),ms:perf.simulationMs},
];
},
async run(){
if(AIHealthCheckWidget.running)return;
const btn=document.getElementById('aiHealthCheckBtn');
const body=document.getElementById('aiHealthCheckBody');
if(typeof AIService==='undefined'||typeof AIService.healthCheck!=='function'){
if(typeof toast==='function')toast('⚠️ Fitur health check AI belum tersedia');
return;
}
AIHealthCheckWidget.running=true;
if(btn){btn.disabled=true;btn.textContent='⏳ Memeriksa...';}
try{
const health=await AIService.healthCheck();
if(body)body.innerHTML=AIHealthCheckWidget.renderHtml(health);
}catch(e){
console.warn('AIHealthCheckWidget: gagal jalankan healthCheck()',e);
if(typeof toast==='function')toast('⚠️ Gagal jalankan health check: '+((e&&e.message)||'error tidak diketahui'));
}
AIHealthCheckWidget.running=false;
if(btn){btn.disabled=false;btn.textContent='🩺 Health Check Lengkap';}
},
// renderHtml — pure function (tidak menyentuh DOM sendiri) supaya gampang dites lewat
// pemanggilan langsung, dipanggil run() di atas SEBELUM ditulis ke #aiHealthCheckBody.
renderHtml(health){
if(!health)return'<div class="u-fs12 u-t2 u-mt8">Health check gagal diambil.</div>';
const checks=health.checks||{};
const rows=AIHealthCheckWidget.items(health);
const perfReady=rows.every((r)=>r.ready);
const fmtMs=(v)=>(typeof v==='number'&&isFinite(v))?v.toFixed(2)+'ms':'-';
const line=(mark,label,detail)=>`<div class="u-fs12 u-lh15 u-mb4">${mark} ${escapeHtml(label)}${detail?' — '+escapeHtml(detail):''}</div>`;
let html=`<div class="u-fs11 u-fw700 u-t2 u-mb6 u-mt8">🩺 Hasil Health Check</div>`;
rows.forEach((r)=>{html+=line(r.ready?'✓':'✗',r.label,fmtMs(r.ms));});
html+=line(perfReady?'✓':'✗','Performance Timing',rows.map((r)=>r.label+':'+fmtMs(r.ms)).join(', '));
html+=line(health.ok?'✓':'✗','Overall Status',(health.ok?'Sehat':'Ada bagian belum siap')+(health.checkedAt?' — '+health.checkedAt:''));
const issues=[];
if((checks.duplicateRuleIds||[]).length)issues.push(`${checks.duplicateRuleIds.length} rule dobel`);
if((checks.duplicateRecommendations||[]).length)issues.push(`${checks.duplicateRecommendations.length} rekomendasi dobel`);
if((checks.deadRuleIds||[]).length)issues.push(`${checks.deadRuleIds.length} rule mati`);
if((checks.brokenRecommendationRefs||[]).length)issues.push(`${checks.brokenRecommendationRefs.length} referensi rusak`);
const orphaned=checks.orphanedStorageKeys||{};
const orphanedCount=(orphaned.orphanedCooldownRuleIds||[]).length+(orphaned.orphanedLearningDataRuleIds||[]).length;
if(orphanedCount)issues.push(`${orphanedCount} data storage yatim`);
if(issues.length)html+=`<div class="u-fs12 u-lh15 u-t2 u-mt4" style="opacity:.8">ℹ️ ${escapeHtml(issues.join(', '))}.</div>`;
return html;
}
};
const AIWidget={
generating:false,
buildContext(){
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const inc=txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const accInfo=D.accounts.map(a=>`${escapeHtml(a.name)}: ${fmtFull(recalcAccBalance(a.id))}`).join(', ')||'Belum ada akun';
let netWorth=0;
try{ netWorth=totalSaldoAkun()+totalAssetValue()-((D.pajakZakat&&D.pajakZakat.utangJT)||0)-totalDebtValue()-totalCicilanOutstanding(); }catch(e){}
const shopOmzet=D.cobek.reduce((s,t)=>s+(t.total||0),0);
const shopProfit=D.cobek.reduce((s,t)=>s+(t.profit||0),0);
// S260 (Business AI Ownership Sync): fallback jalur (Etalase belum dimuat) disamakan dgn
// jalur normal (Etalase.totalModalStok(), sudah SELF-only sejak S259) — reuse
// isProductOwnershipSelf() (SSOT, guard typeof).
const prodSelfFilterWidget=(typeof isProductOwnershipSelf==='function')?isProductOwnershipSelf:(()=>true);
const shopModalStok=(typeof Etalase!=='undefined')?Etalase.totalModalStok():D.products.filter(prodSelfFilterWidget).reduce((s,p)=>s+((p.stock||0)*(p.hargaBeli||0)),0);
const shopThisMonth=D.cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const shopOmzetBulan=shopThisMonth.reduce((s,t)=>s+(t.total||0),0);
const shopProfitBulan=shopThisMonth.reduce((s,t)=>s+(t.profit||0),0);
const whThisMonth=D.workDays.filter(w=>{const d=new Date(w.date);return d.getMonth()===m&&d.getFullYear()===y;});
const gajiBulan=whThisMonth.reduce((s,w)=>s+(w.total||0),0);
// v179: total gaji minggu ini dihitung dari Absensi (D.workDays, in/out harian) — BUKAN dari
// transaksi Keuangan — biar AI juga bisa lihat progres gaji minggu berjalan (belum tentu sudah
// dicatat sbg pemasukan di Keuangan kalau minggunya belum "gajian"/reset).
let gajiMinggu=0,whCountMinggu=0;
try{
const{start:wStart,end:wEnd}=getWeekRange(new Date());
wEnd.setHours(23,59,59,999);
const whThisWeek=(D.workDays||[]).filter(w=>{const d=new Date(w.date);return d>=wStart&&d<=wEnd;});
gajiMinggu=whThisWeek.reduce((s,w)=>s+(w.total||0),0);
whCountMinggu=whThisWeek.length;
}catch(e){console.warn('AIWidget: gagal hitung gaji minggu ini',e);}
// v179: rata-rata gaji mingguan dari histori beberapa minggu terakhir (D.gajiMingguanHistory,
// dicatat otomatis tiap kali confirmWeeklyReset() dijalankan) — biar AI bisa lihat variabilitas
// pendapatan harian/mingguan dari waktu ke waktu, bukan cuma angka minggu ini yang bisa naik-turun
// tergantung jumlah hari kerja.
let avgGajiMingguan=0,gajiMingguanHistCount=0;
try{
const hist=(D.gajiMingguanHistory||[]).slice(-8);
if(hist.length){
avgGajiMingguan=Math.round(hist.reduce((s,h)=>s+(h.total||0),0)/hist.length);
gajiMingguanHistCount=hist.length;
}
}catch(e){console.warn('AIWidget: gagal hitung rata-rata gaji mingguan',e);}
let fiInfo='Belum cukup data transaksi utk hitung Kebebasan Finansial.';
try{
if(typeof fiGetAssumptions==='function'&&D.transactions&&D.transactions.length){
const{swr,ret,inf}=fiGetAssumptions();
const fiTarget=fiTargetNominal(),fiAset=fiNetAssetFund(),fiSurplus=fiMonthlySurplus();
const monthsToGo=fiEstimateMonthsToTarget();
const progPct=fiTarget>0?Math.min(999,Math.round(fiAset/fiTarget*100)):0;
fiInfo=`Target FI ${fmtFull(fiTarget)} (SWR ${swr}%), dana FI saat ini ${fmtFull(fiAset)} (${progPct}% progress), surplus rata² ${fmtFull(fiSurplus)}/bln, asumsi return ${ret}%/th & inflasi ${inf}%/th, estimasi capai: ${monthsToGo===0?'sudah tercapai 🎉':monthsToGo===null?'>100 tahun (surplus/return kurang)':fiFormatMonths(monthsToGo)}.`;
}
}catch(e){console.warn('AIWidget: gagal hitung FI',e);}
const debtInfo=(D.debts||[]).filter(d=>!d.lunas).map(d=>`${escapeHtml(d.name)}: ${fmtFull(d.nilai)}${d.jatuhTempo?', JT '+d.jatuhTempo:''}`).join('; ')||'Tidak ada utang aktif';
const billInfo=D.bills.map(b=>`${escapeHtml(b.name)} (${b.kind}): ${fmtFull(b.amount)}, JT ${b.nextDue}`).join('; ')||'Tidak ada tagihan/cicilan aktif';
let budgetInfo='Belum ada anggaran yang diatur';
try{
if((D.budgets||[]).length){
budgetInfo=D.budgets.map(b=>{
const used=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&budgetMatchesTx(b,t);}).reduce((s,t)=>s+t.amount,0);
const pct=b.limit>0?Math.round(used/b.limit*100):0;
return `${escapeHtml(b.name)}: ${pct}% terpakai${pct>=100?' (OVER)':pct>=80?' (hampir habis)':''}`;
}).join('; ');
}
}catch(e){}
let lifeBalanceInfo='Belum ada data Skor Hidup Seimbang.';
try{
if(typeof LifeBalance!=='undefined'&&typeof LifeBalance.compute==='function'){
const sc=LifeBalance.compute();
lifeBalanceInfo=`Skor Hidup Seimbang: ${sc.total}/100 (${sc.level}) — rincian: ${sc.parts.map(p=>p.label+' '+p.pts+'/'+p.max+' ('+p.note+')').join(', ')}`;
}
}catch(e){}
const targetInfo=(D.targets||[]).map(t=>`${escapeHtml(t.name)}: ${t.amount>0?Math.round((t.saved/t.amount)*100)+'%':'-'}`).join(', ')||'Belum ada target tabungan';
let asetInfo='Belum ada aset tercatat';
try{
if((D.assets||[]).length){
const totalAset=totalAssetValue();
asetInfo=`Total ${fmtFull(totalAset)} dari ${D.assets.length} aset (${D.assets.map(a=>a.name+' '+fmtFull(a.nilai)).join(', ')})`;
}
}catch(e){}
return{m,y,inc,exp,accInfo,netWorth,shopOmzet,shopProfit,shopModalStok,shopOmzetBulan,shopProfitBulan,gajiBulan,whCount:whThisMonth.length,gajiMinggu,whCountMinggu,avgGajiMingguan,gajiMingguanHistCount,fiInfo,debtInfo,billInfo,budgetInfo,lifeBalanceInfo,targetInfo,asetInfo};
},
buildSystemPrompt(c){
return `Kamu adalah PENASIHAT KEUANGAN, BISNIS & INVESTASI, sekaligus WORK-LIFE COACH pribadi untuk ${D.profile.nama||'pengguna'} (pakai data aplikasi keuangan keluarga miliknya).
Buatkan SATU laporan analisis komprehensif dari data di bawah. WAJIB pakai format PERSIS 4 bagian dengan heading berikut apa adanya (jangan diubah):

## 💰 Analisis Keuangan
## 🏢 Bisnis & Investasi
## ⚖️ Pola Hidup & Kerja
## ✅ Rekomendasi Prioritas

Aturan:
- Tiap bagian max 4-6 bullet (•), padat & konkret, sebutkan angka jelas — jangan paragraf panjang bertele-tele.
- Bagian "Rekomendasi Prioritas" berisi maks 5 poin actionable, diurutkan dari yang paling penting/mendesak dulu.
- Gaya bahasa: jujur, analitis, dan peduli seperti penasihat pribadi yang akrab — bukan gaya laporan korporat kaku, hindari kalimat pembuka seperti "Berdasarkan data yang tersedia...".
- Kalau ada data yang kosong/kurang (misal belum ada aset atau target), sebutkan itu sebagai catatan singkat, bukan alasan untuk skip bagian.

DATA BULAN ${c.m+1}/${c.y}:
- Pemasukan: ${fmtFull(c.inc)} | Pengeluaran: ${fmtFull(c.exp)} | Bersih: ${fmtFull(c.inc-c.exp)}
- Saldo akun: ${c.accInfo}
- Kekayaan bersih (saldo+aset-utang): ${fmtFull(c.netWorth)}
- Tagihan/cicilan aktif: ${c.billInfo}
- Utang belum lunas: ${c.debtInfo}
- Target tabungan: ${c.targetInfo}
- Anggaran bulan ini: ${c.budgetInfo}
- Kebebasan Finansial (FI): ${c.fiInfo}

BISNIS SHOP (batu shop PO system):
- All-time: omzet ${fmtFull(c.shopOmzet)}, untung ${fmtFull(c.shopProfit)}
- Bulan ini: omzet ${fmtFull(c.shopOmzetBulan)}, untung ${fmtFull(c.shopProfitBulan)}
- Modal Stok tertanam (uang blm jadi cash lagi, masih bentuk barang di etalase): ${fmtFull(c.shopModalStok)}

ASET & INVESTASI: ${c.asetInfo}

KERJA & POLA HIDUP:
- Gaji harian/absensi bulan ini: ${fmtFull(c.gajiBulan)} dari ${c.whCount} hari kerja tercatat
- Gaji harian/absensi MINGGU INI (belum tentu sudah dicatat sbg Pemasukan di Keuangan): ${fmtFull(c.gajiMinggu)} dari ${c.whCountMinggu} hari kerja tercatat
${c.gajiMingguanHistCount?`- Rata-rata gaji mingguan dari ${c.gajiMingguanHistCount} minggu terakhir yang sudah di-reset/gajian: ${fmtFull(c.avgGajiMingguan)}/minggu (pakai ini utk lihat naik-turun pendapatan, bukan cuma angka minggu ini)`:''}
- ${c.lifeBalanceInfo}`;
},
async generate(){
if(AIWidget.generating)return;
if(!D.profile.apiKey){
toast('⚠️ Isi dulu API Key AI di Pengaturan → AI Asisten');
showPage('settings',document.querySelectorAll('.nav-item')[6]);
return;
}
AIWidget.generating=true;
AIWidget.render();
try{
const ctx=AIWidget.buildContext();
const systemPrompt=AIWidget.buildSystemPrompt(ctx);
const r=await callAIProviderRaw(systemPrompt,[{role:'user',content:'Buatkan laporan analisis lengkap sesuai instruksi di atas, sekarang.'}]);
if(!r.ok){
toast('⚠️ Gagal buat analisis: '+(r.errMsg||'error tidak diketahui'));
} else if(!r.text){
toast('⚠️ AI tidak memberikan jawaban, coba lagi');
} else {
D.aiWidgetReport={text:r.text,generatedAt:new Date().toISOString()};
save();
toast('✅ Analisis AI diperbarui');
}
}catch(e){
toast('⚠️ Gagal terhubung: '+(e.message||'koneksi bermasalah'));
}
AIWidget.generating=false;
AIWidget.render();
},
mdToHtml(text){
let t=escapeHtml(text);
t=t.replace(/^## (.+)$/gm,'<div style="font-weight:800;margin:12px 0 6px;font-size:12.5px;color:var(--accent)">$1</div>');
t=t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
t=t.replace(/^[•\-] ?(.+)$/gm,'<div style="padding-left:14px;position:relative;margin-bottom:4px">•&nbsp;$1</div>');
t=t.split('\n').map(line=>line.startsWith('<div')?line:(line.trim()?line+'<br>':'')).join('');
return t;
},
render(){
const box=document.getElementById('aiWidgetBody');
if(!box)return;
const btn=document.getElementById('aiWidgetGenBtn');
if(AIWidget.generating){
if(btn){btn.disabled=true;btn.textContent='⏳ Menganalisa...';}
box.innerHTML='<div class="empty"><div class="empty-icon">🧭</div><div class="empty-text">⏳ AI sedang menganalisa semua data kamu, tunggu sebentar...</div></div>';
return;
}
if(btn){btn.disabled=false;btn.textContent='🔍 Buat/Perbarui Analisis';}
const r=D.aiWidgetReport;
if(!r||!r.text){
box.innerHTML='<div class="empty"><div class="empty-icon">🧭</div><div class="empty-text">Belum ada analisis. Tap "Buat/Perbarui Analisis" untuk laporan penasihat keuangan, bisnis &amp; investasi, dan pola hidup-kerja dari semua data kamu.</div></div>';
return;
}
const genDate=new Date(r.generatedAt);
box.innerHTML=`<div class="u-fs11 u-t2 u-mb8">🕒 Dibuat ${genDate.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})} ${genDate.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div><div class="u-fs13 u-lh16">${AIWidget.mdToHtml(r.text)}</div>`;
},
openChat(){
showPage('ai');
setTimeout(()=>{
const input=document.getElementById('chatInput');
if(input&&!input.value)input.value='Bahas lebih lanjut soal laporan analisis AI yang barusan dibuat di widget rekomendasi, saya mau tanya lebih detail.';
if(input)input.focus();
},150);
}
};
