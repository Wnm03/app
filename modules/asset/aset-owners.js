const AssetOwnersMixin = {
DUST_THRESHOLD_RP:100,
_applyOwnersButtonLabel(linked){
const btn=document.getElementById('assetOwnersBtn');
if(!btn)return;
btn.textContent=linked?'🔗 Atur Porsi di Investasi':'⚖️ Atur Porsi Kepemilikan';
},
_updateOwnersButtonLabel(a){
Aset._applyOwnersButtonLabel(!!Aset._resolveLinkedInvestment(a));
},
_toggleOwnersEditControls(){
const editBox=document.getElementById('assetOwnersEditControls');
const hint=document.getElementById('assetOwnersReadOnlyHint');
const readOnly=!!Aset._ownersReadOnly;
if(editBox)editBox.classList.toggle('u-dnone',readOnly);
if(hint){
hint.classList.toggle('u-dnone',!readOnly);
if(readOnly)hint.textContent='🔗 Aset ini terhubung ke Holding Investasi -- porsi kepemilikan diatur & disimpan di sana (bukan di sini). Lepas tautannya di form Aset (🔗 Hubungkan ke Holding Investasi) kalau mau atur porsi manual lagi di Buku Aset.';
}
},
openOwnersModal(){
const id=Aset.editId;
const a=id?D.assets.find(x=>sameId(x.id,id)):null;
const linkedHolding=Aset._resolveLinkedInvestment(a);
if(linkedHolding&&typeof InvestmentUI!=='undefined'){
InvestmentUI.openOwnersModal(linkedHolding.id);
return;
}
document.getElementById('assetOwnersAssetName').textContent=a?('📋 '+a.name):'';
Aset._ownersDraftNilai=null;
Aset._ownersModalAsset=a;
Aset._rebalancePending=null;
const linkedOwners=Aset._resolveLinkedInvestmentOwners(a);
Aset._ownersReadOnly=!!linkedOwners;
if(linkedOwners){
Aset._ownersDraft=linkedOwners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
if(!a){
Aset._ownersDraft=[];
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
if(!res||!res.ok){
Aset._ownersDraft=[];
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
Aset._ownersDraft=res.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(a,o.ownerId):'titipan'}));
Aset._checkUnallocatedBannerOnOpen(a);
Aset._renderOwnersList();
openModal('assetOwnersModal');
Aset._checkRebalanceTrigger(Aset._ownersDraft.length-1);
},
openOwnersModalById(assetId){
const a=assetId?D.assets.find(x=>sameId(x.id,assetId)):null;
if(!a){if(typeof toast==='function')toast('⚠️ Aset tidak ditemukan');return;}
Aset.editId=a.id;
Aset.openOwnersModal();
},
_ownersAssetNilai(){
if(typeof Aset._ownersDraftNilai==='number'&&isFinite(Aset._ownersDraftNilai)&&Aset._ownersDraftNilai>0)return Aset._ownersDraftNilai;
const a=Aset._ownersModalAsset;
return (a&&typeof a.nilai==='number'&&isFinite(a.nilai)&&a.nilai>0)?a.nilai:0;
},
_ownerSisaTitipan(o,projection){
if(!o||o.isSelf||!o.ownerId)return null;
if(typeof DanaTitipanPortfolioAPI==='undefined')return null;
const commit=DanaTitipanPortfolioAPI.getCommitments().find((c)=>c&&c.ownerId===o.ownerId);
if(!commit||!isFinite(commit.principalAmount))return null;
const principal=Number(commit.principalAmount);
const currentAssetId=Aset._ownersModalAsset?Aset._ownersModalAsset.id:null;
const excluding=DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId,{assetId:currentAssetId});
const proj=projection||((typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null);
const ownerBucket=(proj&&Array.isArray(proj.owners))?proj.owners.find((ow)=>ow&&ow.ownerId===o.ownerId):null;
const usedTotal=ownerBucket?(ownerBucket.usedTotal||0):0;
const linkedExpenseTotal=ownerBucket?(ownerBucket.linkedExpenseTotal||0):0;
const renovExpenseTotal=ownerBucket?(ownerBucket.renovExpenseTotal||0):0;
const nilai=Aset._ownersAssetNilai();
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const draftNominal=nilai*(porsiNum/100);
return principal-excluding-usedTotal-linkedExpenseTotal-renovExpenseTotal-draftNominal;
},
_ownerQuotaText(o,i){
if(!o||o.isSelf||!o.ownerId)return '';
if(typeof DanaTitipanPortfolioAPI==='undefined')return '';
const commit=DanaTitipanPortfolioAPI.getCommitments().find((c)=>c&&c.ownerId===o.ownerId);
if(!commit||!isFinite(commit.principalAmount)){
return '<div class="u-fs11 u-t2 u-mt2">💰 Kuota titipan: <span class="u-fw700">belum dicatat</span> — catat pokok dulu di menu Dana Titipan</div>';
}
const sisa=Aset._ownerSisaTitipan(o);
const money=(typeof fmtFull==='function')?fmtFull:((typeof fmt==='function')?fmt:(n)=>'Rp '+Math.round(n||0));
const btnIdx=typeof i==='number'?i:(Array.isArray(Aset._ownersDraft)?Aset._ownersDraft.indexOf(o):-1);
const quotaBtn='<button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:10.5px" data-action="Aset.applyQuotaToRow" data-args=\'['+btnIdx+']\'>🔄 Isi dari kuota sisa</button>';
if(Math.abs(sisa)<Aset.DUST_THRESHOLD_RP){
return '<div class="u-fs11 u-mt2" style="opacity:.55">💰 Kuota sisa: '+money(sisa)+'</div>';
}
if(sisa<0){
return '<div class="u-fs11 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap"><span class="u-fw700 red">⚠️ Kuota sisa: '+money(sisa)+' (melebihi pokok dikomit)</span>'+quotaBtn+'</div>';
}
const realokasiBtn='<button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:10.5px" data-action="Aset.previewRealokasiSisaKuota" data-args=\'['+btnIdx+']\'>🔀 Alihkan sisa ke aset lain</button>';
return '<div class="u-fs11 u-t2 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap">💰 Kuota sisa: <span class="u-fw700">'+money(sisa)+'</span>'+quotaBtn+realokasiBtn+'</div>';
},
async previewRealokasiSisaKuota(i){
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const o=draft[i];
if(!o||o.isSelf||!o.ownerId)return;
if(typeof RealokasiSisaKuota==='undefined'){if(typeof toast==='function')toast('⚠️ Fitur realokasi belum siap dimuat');return;}
const sisa=Aset._ownerSisaTitipan(o);
if(sisa===null||!(sisa>Aset.DUST_THRESHOLD_RP)){if(typeof toast==='function')toast('⚠️ Tidak ada sisa kuota signifikan untuk dialihkan');return;}
const currentAssetId=Aset._ownersModalAsset?Aset._ownersModalAsset.id:null;
const candidates=RealokasiSisaKuota.findCandidates({assetId:currentAssetId});
if(!candidates.length){if(typeof toast==='function')toast('⚠️ Tidak ada aset/holding lain dengan ruang kosong (porsi Milik Sendiri) untuk dialihkan');return;}
const built=RealokasiSisaKuota.buildPlan(sisa,candidates);
if(!built.plan.length){if(typeof toast==='function')toast('⚠️ Tidak ada aset/holding lain dengan ruang kosong untuk dialihkan');return;}
const money=(typeof fmtFull==='function')?fmtFull:((typeof fmt==='function')?fmt:(n)=>'Rp '+Math.round(n||0));
let msg='🔀 Alihkan sisa kuota titipan '+(o.ownerName||'owner ini')+' ('+money(sisa)+') ke:\n';
built.plan.forEach((p)=>{msg+='• '+p.name+' ('+(p.type==='holding'?'Holding Investasi':'Buku Aset')+'): '+money(p.alloc)+'\n';});
if(built.unallocated>Aset.DUST_THRESHOLD_RP)msg+='Sisa '+money(built.unallocated)+' tetap belum teralokasi (tidak cukup ruang kosong di aset/holding lain).';
const ok=await askConfirm(msg.trim(),{title:'Alihkan Sisa Kuota',okText:'Ya, Alihkan',danger:false,icon:'🔀'});
if(!ok)return;
Aset._applyRealokasiSisaKuota(built.plan,o.ownerId,o.ownerName);
},
_applyRealokasiSisaKuota(plan,ownerId,ownerName){
let successCount=0,failCount=0,totalApplied=0;
(plan||[]).forEach((item)=>{
const res=RealokasiSisaKuota.applyAllocationRow(item,ownerId,ownerName);
if(res&&res.ok){successCount++;totalApplied+=res.actualAlloc||0;}else{failCount++;}
});
const money=(typeof fmtFull==='function')?fmtFull:((typeof fmt==='function')?fmt:(n)=>'Rp '+Math.round(n||0));
if(successCount>0){
if(typeof toast==='function')toast('✅ Sisa kuota dialihkan ke '+successCount+' aset/holding ('+money(totalApplied)+')'+(failCount?', '+failCount+' gagal':''));
}else{
if(typeof toast==='function')toast('⚠️ Gagal mengalihkan sisa kuota — coba lagi');
}
Aset._renderOwnersList();
},
_applyOwnersToAsset(a,owners){
if(!a)throw new Error('Aset tidak ditemukan');
if(typeof MultiOwnerEngine==='undefined')throw new Error('MultiOwnerEngine belum dimuat');
const res=MultiOwnerEngine.setOwners(a,owners);
if(!res.ok)throw new Error(res.reason);
Object.assign(a,{owners:res.entity.owners});
if(a.titipanAmount>0){
a.titipanAmount=0;
a.titipanOwnerType='';
a.titipanOwnerName='';
}
if(a.accountId){
const linkedAcc=D.accounts.find(x=>sameId(x.id,a.accountId));
if(linkedAcc){
const linkedAccNilai=a.nilai||0;
const txDelta=recalcAccBalance(linkedAcc.id)-(linkedAcc.baseBalance!==undefined?linkedAcc.baseBalance:(linkedAcc.balance||0));
linkedAcc.baseBalance=linkedAccNilai-txDelta;
linkedAcc.balance=linkedAccNilai;
if(typeof OwnershipEngine!=='undefined')linkedAcc.ownership=OwnershipEngine.resolve(a).type;
}
}
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
save();
if(typeof AIBus!=='undefined')AIBus.emit('asset.updated',{ownersUpdated:true,editId:a.id});
return a;
},
_ownerHasUnallocatedElsewhere(ownerId,projection){
if(!ownerId)return false;
if(typeof DanaTitipanPortfolioAPI==='undefined'||typeof DanaTitipanPortfolioAPI.build!=='function')return false;
const proj=projection||DanaTitipanPortfolioAPI.build();
if(!proj||!Array.isArray(proj.owners))return false;
const bucket=proj.owners.find((ow)=>ow&&ow.ownerId===ownerId);
return !!(bucket&&typeof bucket.estimatedUnallocated==='number'&&isFinite(bucket.estimatedUnallocated)&&bucket.estimatedUnallocated>=Aset.DUST_THRESHOLD_RP);
},
_checkUnallocatedBannerOnOpen(a){
if(typeof toast!=='function')return;
if(typeof DanaTitipanPortfolioAPI==='undefined'||typeof DanaTitipanPortfolioAPI.build!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(draft.length===0)return;
const projection=DanaTitipanPortfolioAPI.build();
if(!projection||!Array.isArray(projection.owners))return;
const nilai=Aset._ownersAssetNilai();
const names=[];
draft.forEach((o)=>{
if(!o||o.isSelf||!o.ownerId)return;
if(!Aset._ownerHasUnallocatedElsewhere(o.ownerId,projection))return;
const bucket=projection.owners.find((ow)=>ow&&ow.ownerId===o.ownerId);
const estimatedUnallocated=bucket?Number(bucket.estimatedUnallocated):0;
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const holdingNilaiOwner=nilai*(porsiNum/100);
if(holdingNilaiOwner<estimatedUnallocated)names.push(o.ownerName||o.ownerId);
});
if(names.length>0){
toast('👉 '+names.join(', ')+' masih punya sisa titipan belum terinvest -- cek Dana Titipan');
}
},
_updateOwnerQuotaDisplay(i){
const el=document.getElementById('assetOwnerKuota'+i);
if(!el)return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
el.innerHTML=Aset._ownerQuotaText(draft[i],i);
},
_ownerNameFieldHtml(o,i){
const registryList=(typeof OwnerRegistry!=='undefined')?OwnerRegistry.listAll():[];
if(o.isSelf||!registryList.length||o._creatingNew){
return '<input type="text" class="fi" style="flex:1" placeholder="Nama pemilik" value="'+escapeHtml(o.ownerName||'')+'" data-oninput="Aset.onOwnerNameInput" data-oninput-args=\'['+i+',"$value"]\'>';
}
let matched=false;
let opts='<option value="">— Pilih pemilik —</option>';
registryList.forEach((r)=>{
const sel=(o.ownerId===r.id)?' selected':'';
if(o.ownerId===r.id)matched=true;
opts+='<option value="'+escapeHtml(r.id)+'"'+sel+'>'+escapeHtml(r.name)+'</option>';
});
if(o.ownerId&&!matched&&o.ownerName){
opts+='<option value="'+escapeHtml(o.ownerId)+'" selected>'+escapeHtml(o.ownerName)+'</option>';
}
opts+='<option value="__new__">➕ Buat pemilik baru…</option>';
return '<select class="fi" style="flex:1" data-onchange="Aset.onOwnerSelectChange" data-onchange-args=\'['+i+',"$value"]\'>'+opts+'</select>';
},
_renderOwnersList(){
Aset._toggleOwnersEditControls();
const listBox=document.getElementById('assetOwnersList');
if(!listBox){Aset.updateOwnersTotal();return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(Aset._ownersReadOnly){
listBox.innerHTML=draft.length?draft.map((o)=>{
const porsiTxt=(typeof o.porsi==='number'&&isFinite(o.porsi))?o.porsi:0;
return '<div class="u-flex u-gap8" style="align-items:center;justify-content:space-between;margin-bottom:6px;padding:8px 10px;background:var(--surface3);border-radius:10px">'+
'<span style="font-size:13px;font-weight:600">'+escapeHtml(o.ownerName||'?')+(o.isSelf?' <span class="u-fs11 u-t2">(saya)</span>':'')+'</span>'+
'<span style="font-size:13px;font-weight:700;color:var(--accent)">'+porsiTxt+'%</span>'+
'</div>';
}).join(''):'<div class="empty"><div class="empty-text">Holding investasi terhubung belum punya pemilik tercatat.</div></div>';
Aset._renderOwnersUnallocatedBox();
return;
}
if(!Aset._ownersModalAsset){
listBox.innerHTML='<div class="empty"><div class="empty-text">Simpan aset ini dulu (tombol "Simpan Aset") sebelum mengatur porsi kepemilikan.</div></div>';
Aset.updateOwnersTotal();
Aset._renderOwnersUnallocatedBox();
return;
}
if(!draft.length){
listBox.innerHTML='<div class="empty"><div class="empty-text">Belum ada pemilik. Tap "➕ Tambah Pemilik" di bawah.</div></div>';
Aset.updateOwnersTotal();
Aset._renderOwnersUnallocatedBox();
return;
}
const nilai=Aset._ownersAssetNilai();
const titipanProjection=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null;
listBox.innerHTML=draft.map((o,i)=>{
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:null;
const nominalVal=(nilai>0&&porsiNum!==null)?Math.round(nilai*porsiNum/100):'';
const unallocatedBadge=(!o.isSelf&&o.ownerId&&Aset._ownerHasUnallocatedElsewhere(o.ownerId,titipanProjection))?('<div class="u-fs11 u-mt2"><button type="button" style="background:none;border:none;padding:0;margin:0;color:var(--accent);text-decoration:underline dotted;cursor:pointer;font:inherit;font-weight:600" data-action="dashHubQaDanaTitipan">👉 masih ada sisa titipan, cek holding lain</button></div>'):'';
return '<div style="margin-bottom:8px">'+
'<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">'+
Aset._ownerNameFieldHtml(o,i)+
'<button type="button" class="btn btn-ghost btn-sm" data-action="Aset.removeOwnerRow" data-args=\'['+i+']\' aria-label="Hapus pemilik">✕</button>'+
'</div>'+
'<div class="u-grid2" style="margin-bottom:0">'+
'<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Porsi (%)</label><input type="number" class="fi" id="ownerPorsi'+i+'" placeholder="%" inputmode="decimal" value="'+(porsiNum!==null?porsiNum:'')+'" data-oninput="Aset.onOwnerPorsiInput" data-oninput-args=\'['+i+',"$value"]\'></div>'+
'<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Nominal (Rp)</label><input type="text" class="fi" id="ownerNominal'+i+'" placeholder="0" inputmode="decimal" value="'+nominalVal+'" data-oninput="Aset.onOwnerNominalInput" data-oninput-args=\'['+i+',"$value"]\'></div>'+
'</div>'+
(nilai>0?'':'<div style="font-size:10.5px;color:var(--text3);margin:-2px 0 4px">Estimasi Nilai Saat Ini aset ini belum diisi -- isi Nominal (Rp) baris yang porsinya sudah kamu tahu, nilai total otomatis dihitung dari situ</div>')+
'<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-top:4px;cursor:pointer">'+
'<input type="checkbox" style="width:14px;height:14px"'+(o.isSelf?' checked':'')+' data-onchange="Aset.onOwnerIsSelfToggle" data-onchange-args=\'['+i+',"$checked"]\'> 👤 Ini saya (porsi ini dihitung ke Zakat/Pajak milikmu)'+
'</label>'+
(o.isSelf?'':Aset._ownerSettlementFieldHtml(o,i))+
(o.isSelf?'':('<div id="assetOwnerKuota'+i+'">'+Aset._ownerQuotaText(o,i)+'</div>'))+
unallocatedBadge+
'</div>';
}).join('');
Aset.updateOwnersTotal();
Aset._renderOwnersUnallocatedBox();
Aset._renderRebalancePanel();
},
_ownerSettlementFieldHtml(o,i){
const val=o.settlement==='milik'?'milik':'titipan';
return '<div class="fg u-mb0" style="margin-top:6px">'+
'<label class="fl" style="margin-bottom:2px">Status Dana</label>'+
'<select class="fi" id="assetOwnerSettlement'+i+'" data-onchange="Aset.onOwnerSettlementChange" data-onchange-args=\'['+i+',"$value"]\'>'+
'<option value="titipan"'+(val==='titipan'?' selected':'')+'>🔒 Dana Titipan (tercatat di Buku Utang)</option>'+
'<option value="milik"'+(val==='milik'?' selected':'')+'>✅ Milik Sendiri Pemilik Ini (bukan titipan, tidak ada utang)</option>'+
'</select>'+
'</div>';
},
onOwnerSettlementChange(i,val){
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
draft[i].settlement=val==='milik'?'milik':'titipan';
},
_renderOwnersUnallocatedBox(){
const box=document.getElementById('assetOwnersUnallocatedBox');
if(!box)return;
if(Aset._ownersReadOnly){box.innerHTML='';return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const nonSelf=draft.filter((o)=>o&&!o.isSelf&&o.ownerId);
if(nonSelf.length===0){box.innerHTML='';return;}
const titipanProjection=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null;
let total=0;let hasNegative=false;let hasValid=false;
nonSelf.forEach((o)=>{
const sisa=Aset._ownerSisaTitipan(o,titipanProjection);
if(sisa===null)return;
hasValid=true;
if(sisa<0){hasNegative=true;return;}
total+=sisa;
});
if(!hasValid){box.innerHTML='';return;}
const money=(typeof fmtFull==='function')?fmtFull:((typeof fmt==='function')?fmt:(n)=>'Rp '+Math.round(n||0));
let html='💰 Total sisa belum terinvest (semua owner): <span class="u-fw700">'+money(total)+'</span>';
if(hasNegative){
html+='<div class="u-fs11 u-mt2" style="color:var(--accent2)">⚠️ Ada owner yang kuotanya sudah minus (melebihi pokok dikomit) -- tidak ikut dijumlah di atas, cek baris masing-masing.</div>';
}
html+='<div class="u-mt6"><button type="button" class="btn btn-ghost btn-sm" data-action="Aset.bagiRataUnallocated">🔄 Bagi rata ke owner ini</button></div>';
box.innerHTML=html;
},
bagiRataUnallocated(){
if(Aset._ownersReadOnly)return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const indices=draft.map((o,k)=>({o,k})).filter((x)=>x.o&&!x.o.isSelf&&x.o.ownerId).map((x)=>x.k);
if(!indices.length)return;
Aset._rebalancePending=null;
Aset._renderRebalancePanel();
indices.forEach((i)=>{Aset.applyQuotaToRow(i);});
},
updateOwnersTotal(){
const box=document.getElementById('assetOwnersTotalBox');
const saveBtn=document.getElementById('assetOwnersSaveBtn');
if(!box){if(saveBtn)saveBtn.disabled=true;return;}
if(!Aset._ownersModalAsset){box.textContent='';box.style.color='';if(saveBtn)saveBtn.disabled=true;return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length){
box.textContent='Belum ada pemilik ditambahkan.';
box.style.color='var(--text2)';
if(saveBtn)saveBtn.disabled=true;
return;
}
if(typeof MultiOwnerEngine==='undefined'){box.textContent='';box.style.color='';if(saveBtn)saveBtn.disabled=true;return;}
const total=MultiOwnerEngine.totalPorsi(draft);
const sisa=MultiOwnerEngine.remainingPorsi(draft);
const isValid=Math.abs(sisa)<=0.01;
box.style.color=isValid?'var(--accent3)':'var(--accent2)';
box.style.fontWeight='700';
box.textContent=isValid?('✅ Total porsi: '+total+'% (pas 100%)'):('⚠️ Total porsi: '+total+'% ('+(sisa>0?('kurang '+sisa+'%'):('lebih '+Math.abs(sisa)+'%'))+')');
if(saveBtn)saveBtn.disabled=!isValid;
},
addOwnerRow(){
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Aset._ownersModalAsset){toast('⚠️ Simpan aset ini dulu sebelum mengatur porsi kepemilikan');return;}
Aset._ownersDraft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
Aset._ownersDraft.push({ownerId:'',ownerName:'',porsi:0,isSelf:Aset._ownersDraft.length===0,settlement:'titipan'});
Aset._renderOwnersList();
},
removeOwnerRow(i){
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Array.isArray(Aset._ownersDraft))return;
Aset._rebalancePending=null;
const removed=Aset._ownersDraft[i];
Aset._ownersDraft.splice(i,1);
const removedPorsi=removed&&typeof removed.porsi==='number'&&isFinite(removed.porsi)?removed.porsi:0;
if(removedPorsi>0&&Aset._ownersDraft.length){
const n=Aset._ownersDraft.length;
let acc=0;
Aset._ownersDraft.forEach((o,k)=>{
let tambahan;
if(k===n-1){tambahan=Math.round((removedPorsi-acc)*10000)/10000;}
else{tambahan=Math.round((removedPorsi/n)*10000)/10000;acc+=tambahan;}
const cur=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
o.porsi=Math.round((cur+tambahan)*10000)/10000;
});
}
Aset._renderOwnersList();
},
onOwnerNameInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
Aset._ownersDraft[i].ownerName=val;
},
onOwnerSelectChange(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
if(val==='__new__'){
Aset._ownersDraft[i]._creatingNew=true;
Aset._ownersDraft[i].ownerId='';
Aset._ownersDraft[i].ownerName='';
Aset._renderOwnersList();
return;
}
if(!val){
Aset._ownersDraft[i].ownerId='';
Aset._ownersDraft[i].ownerName='';
Aset._renderOwnersList();
return;
}
const registryList=(typeof OwnerRegistry!=='undefined')?OwnerRegistry.listAll():[];
const entry=registryList.find((r)=>r.id===val);
Aset._ownersDraft[i].ownerId=val;
Aset._ownersDraft[i].ownerName=entry?entry.name:Aset._ownersDraft[i].ownerName;
Aset._ownersDraft[i]._creatingNew=false;
if(!Aset._ownersDraft[i]._touched){
const curPorsi=typeof Aset._ownersDraft[i].porsi==='number'&&isFinite(Aset._ownersDraft[i].porsi)?Aset._ownersDraft[i].porsi:0;
if(curPorsi<=0){
const cap=Aset._ownerQuotaPorsiCap(i);
if(typeof cap==='number'&&cap>0){
Aset._ownersDraft[i].porsi=cap;
Aset._ownersDraft[i]._touched=true;
Aset._ownersDraft[i]._autoFilled=true;
if(typeof toast==='function')toast('💡 Porsi diisi otomatis dari sisa kuota titipan ('+cap+'%) — bisa diedit manual');
}
}
}
Aset._renderOwnersList();
},
_ownerQuotaPorsiCap(i){
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const o=draft[i];
if(!o||o.isSelf||!o.ownerId)return null;
if(typeof DanaTitipanPortfolioAPI==='undefined')return null;
const commit=DanaTitipanPortfolioAPI.getCommitments().find((c)=>c&&c.ownerId===o.ownerId);
if(!commit||!isFinite(commit.principalAmount))return null;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0))return null;
const principal=Number(commit.principalAmount);
const currentAssetId=Aset._ownersModalAsset?Aset._ownersModalAsset.id:null;
const excluding=DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId,{assetId:currentAssetId});
const projection=(typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null;
const ownerBucket=(projection&&Array.isArray(projection.owners))?projection.owners.find((ow)=>ow&&ow.ownerId===o.ownerId):null;
const usedTotal=ownerBucket?(ownerBucket.usedTotal||0):0;
const linkedExpenseTotal=ownerBucket?(ownerBucket.linkedExpenseTotal||0):0;
const renovExpenseTotal=ownerBucket?(ownerBucket.renovExpenseTotal||0):0;
const sisaRp=principal-excluding-usedTotal-linkedExpenseTotal-renovExpenseTotal;
if(!(sisaRp>0))return 0;
const quotaPorsi=sisaRp/nilai*100;
const otherTotal=draft.reduce((sum,row,k)=>k===i?sum:sum+(typeof row.porsi==='number'&&isFinite(row.porsi)?row.porsi:0),0);
const remainingPorsi=Math.max(0,100-otherTotal);
const capped=Math.min(quotaPorsi,remainingPorsi);
return Math.round(Math.max(0,capped)*10000)/10000;
},
applyQuotaToRow(i){
if(Aset._ownersReadOnly)return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0)){if(typeof toast==='function')toast('⚠️ Isi dulu "Estimasi Nilai Saat Ini" aset ini sebelum bisa isi otomatis dari kuota');return;}
const cap=Aset._ownerQuotaPorsiCap(i);
if(cap===null){if(typeof toast==='function')toast('⚠️ Owner ini belum punya pokok titipan tercatat');return;}
if(cap<=0){if(typeof toast==='function')toast('⚠️ Kuota sisa owner ini sudah habis / ruang porsi sudah penuh');return;}
const prevPorsi=typeof draft[i].porsi==='number'&&isFinite(draft[i].porsi)?draft[i].porsi:0;
if(Math.abs(cap-prevPorsi)<0.0001){
if(typeof toast==='function')toast('ℹ️ Porsi baris ini sudah memakai hampir seluruh kuota titipannya -- sisa yang bisa ditambahkan cuma sedikit sekali, jadi angkanya tidak berubah');
return;
}
draft[i].porsi=cap;
draft[i]._touched=true;
draft[i]._autoFilled=true;
Aset._renderOwnersList();
if(typeof toast==='function')toast('✅ Porsi diisi dari sisa kuota titipan ('+cap+'%)');
},
onOwnerPorsiInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
const n=parseFloat(val);
const porsi=isFinite(n)?n:0;
Aset._ownersDraft[i].porsi=porsi;
Aset._ownersDraft[i]._touched=true;
const nilai=Aset._ownersAssetNilai();
if(nilai>0){
const nomEl=document.getElementById('ownerNominal'+i);
if(nomEl)nomEl.value=Math.round(nilai*porsi/100);
}
Aset.updateOwnersTotal();
Aset._updateOwnerQuotaDisplay(i);
Aset._applyRemainingShare(i);
Aset._checkRebalanceTrigger(i);
},
onOwnerNominalInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
const nilai=Aset._ownersAssetNilai();
const n=parseFloat(String(val).replace(/[^0-9.-]/g,''));
const nominal=isFinite(n)?n:0;
Aset._ownersDraft[i]._touched=true;
if(nilai<=0){
const porsiBaris=typeof Aset._ownersDraft[i].porsi==='number'&&isFinite(Aset._ownersDraft[i].porsi)?Aset._ownersDraft[i].porsi:0;
if(porsiBaris<=0||nominal<=0)return;
const nilaiTersirat=Math.round(nominal/(porsiBaris/100));
if(!isFinite(nilaiTersirat)||nilaiTersirat<=0)return;
Aset._ownersDraftNilai=nilaiTersirat;
Aset._ownersDraft.forEach((o,k)=>{
if(k===i)return;
const nomEl=document.getElementById('ownerNominal'+k);
if(nomEl&&typeof o.porsi==='number'&&isFinite(o.porsi))nomEl.value=Math.round(nilaiTersirat*o.porsi/100);
});
Aset.updateOwnersTotal();
Aset._ownersDraft.forEach((o,k)=>{ Aset._updateOwnerQuotaDisplay(k); });
return;
}
const porsi=Math.round((nominal/nilai*100)*10000)/10000;
Aset._ownersDraft[i].porsi=porsi;
const porsiEl=document.getElementById('ownerPorsi'+i);
if(porsiEl)porsiEl.value=porsi;
Aset._applyRemainingShare(i);
Aset.updateOwnersTotal();
Aset._ownersDraft.forEach((o,k)=>{ Aset._updateOwnerQuotaDisplay(k); });
Aset._checkRebalanceTrigger(i);
},
_applyRemainingShare(editedIndex){
if(typeof calculateRemainingShare!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const result=calculateRemainingShare(draft,editedIndex);
if(!result)return;
draft[result.targetIndex].porsi=result.porsi;
const porsiEl=document.getElementById('ownerPorsi'+result.targetIndex);
if(porsiEl)porsiEl.value=result.porsi;
const nilai=Aset._ownersAssetNilai();
if(nilai>0){
const nomEl=document.getElementById('ownerNominal'+result.targetIndex);
if(nomEl)nomEl.value=Math.round(nilai*result.porsi/100);
}
Aset.updateOwnersTotal();
Aset._updateOwnerQuotaDisplay(result.targetIndex);
},
_rebalancePending:null,
_checkRebalanceTrigger(editedIndex){
if(typeof MultiOwnerEngine==='undefined'||typeof calculateRebalance!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length||!draft[editedIndex]){
if(Aset._rebalancePending){Aset._rebalancePending=null;Aset._renderRebalancePanel();}
return;
}
const total=MultiOwnerEngine.totalPorsi(draft);
let oldTotal=0;
draft.forEach((o,k)=>{if(k!==editedIndex)oldTotal+=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;});
if(total<=100||oldTotal<=0){
if(Aset._rebalancePending){Aset._rebalancePending=null;Aset._renderRebalancePanel();}
return;
}
if(!Aset._rebalancePending||Aset._rebalancePending.editedIndex!==editedIndex){
Aset._rebalancePending={editedIndex,method:'proporsional',manualIndex:null};
}
Aset._renderRebalancePanel();
},
_rebalanceOwnerLabel(draft,i){
const o=draft[i];
return (o&&o.ownerName)?o.ownerName:('Pemilik #'+(i+1));
},
_renderRebalancePanel(){
const box=document.getElementById('assetOwnersRebalanceBox');
if(!box)return;
const pending=Aset._rebalancePending;
if(!pending||Aset._ownersReadOnly){box.innerHTML='';return;}
if(typeof calculateRebalance!=='function'){box.innerHTML='';return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
const eligibleOthers=draft.map((o,k)=>({k,o})).filter((x)=>x.k!==pending.editedIndex);
let previewHtml='';
if(calc&&calc.ok){
previewHtml=calc.adjustments.map((a)=>{
const label=Aset._rebalanceOwnerLabel(draft,a.index);
return '<div style="font-size:12.5px;color:var(--text2);margin-bottom:2px">'+escapeHtml(label)+': '+a.from+'% → <b style="color:var(--accent)">'+a.to+'%</b></div>';
}).join('');
}else if(calc){
const msg=calc.error==='manual_owner_insufficient'?'⚠️ Porsi pemilik terpilih tidak cukup utk menutup kelebihan.'
:calc.error==='manual_owner_not_selected'?'⚠️ Pilih dulu pemilik yang porsinya mau dikurangi.'
:'⚠️ Porsi pemilik lain tidak cukup utk menutup kelebihan ini.';
previewHtml='<div style="font-size:12.5px;color:var(--accent2)">'+msg+'</div>';
}
const manualSelect=pending.method==='manual'
?('<select class="fs u-mb10" data-onchange="Aset.setRebalanceManualOwner" data-onchange-args=\'["$value"]\'>'
+'<option value="">Pilih pemilik…</option>'
+eligibleOthers.map((x)=>'<option value="'+x.k+'"'+(pending.manualIndex===x.k?' selected':'')+'>'+escapeHtml(Aset._rebalanceOwnerLabel(draft,x.k))+' ('+x.o.porsi+'%)</option>').join('')
+'</select>')
:'';
box.innerHTML='<div style="margin:10px 0;padding:12px;background:var(--surface3);border-radius:12px;border:1px solid var(--accent2)">'
+'<div style="font-size:13px;font-weight:700;color:var(--accent2);margin-bottom:8px">⚖️ Porsi melebihi 100% -- pilih cara menyesuaikan:</div>'
+'<div class=\"segmented-control is-grid seg-3 u-mb10\" data-segmented-control=\"asset-rebalance\" aria-label=\"Cara menyesuaikan porsi\">'
+'<button type=\"button\" class=\"segmented-choice\"'+(pending.method==='proporsional'?' active':'')+' data-action=\"Aset.setRebalanceMethod\" data-args=\'[\"proporsional\"]\'>Proporsional</button>'
+'<button type=\"button\" class=\"segmented-choice\"'+(pending.method==='largest'?' active':'')+' data-action=\"Aset.setRebalanceMethod\" data-args=\'[\"largest\"]\'>Terbesar</button>'
+'<button type=\"button\" class=\"segmented-choice\"'+(pending.method==='manual'?' active':'')+' data-action=\"Aset.setRebalanceMethod\" data-args=\'[\"manual\"]\'>Manual</button>'
+'</div>'+
+manualSelect
+'<div style="margin:6px 0 10px">'+previewHtml+'</div>'
+'<div class="u-flex u-gap8">'
+'<button type="button" class="btn btn-primary u-flex1" style="padding:11px" data-action="Aset.applyRebalance"'+((!calc||!calc.ok)?' disabled':'')+'>✅ Terapkan Penyesuaian</button>'
+'<button type="button" class="btn btn-ghost" style="padding:11px" data-action="Aset.cancelRebalance">Batal</button>'
+'</div></div>';
},
setRebalanceMethod(val){
if(!Aset._rebalancePending)return;
Aset._rebalancePending.method=(val==='largest'||val==='manual')?val:'proporsional';
if(Aset._rebalancePending.method!=='manual')Aset._rebalancePending.manualIndex=null;
Aset._renderRebalancePanel();
},
setRebalanceManualOwner(val){
if(!Aset._rebalancePending)return;
const idx=val===''?null:parseInt(val,10);
Aset._rebalancePending.manualIndex=isFinite(idx)?idx:null;
Aset._renderRebalancePanel();
},
applyRebalance(){
const pending=Aset._rebalancePending;
if(!pending||typeof calculateRebalance!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
if(!calc||!calc.ok){toast('⚠️ Penyesuaian tidak valid, coba metode lain');return;}
calc.adjustments.forEach((a)=>{
if(a.to===a.from)return;
draft[a.index].porsi=a.to;
draft[a.index]._touched=true;
});
Aset._rebalancePending=null;
Aset._renderOwnersList();
toast('✅ Porsi pemilik disesuaikan ke total 100%');
},
cancelRebalance(){
Aset._rebalancePending=null;
Aset._renderRebalancePanel();
},
onOwnerIsSelfToggle(i,checked){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
Aset._ownersDraft[i].isSelf=!!checked;
Aset._renderOwnersList();
},
_resyncOwnersFromDOM(){
if(typeof document==='undefined'||!document||typeof document.getElementById!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length)return;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0))return;
draft.forEach((o,i)=>{
const nomEl=document.getElementById('ownerNominal'+i);
if(!nomEl||typeof nomEl.value!=='string')return;
if(nomEl.value.trim()==='')return;
const n=parseFloat(String(nomEl.value).replace(/[^0-9.-]/g,''));
if(!isFinite(n))return;
const domNominal=n;
const porsiSaatIni=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const nominalTersirat=Math.round(nilai*porsiSaatIni/100);
if(domNominal===nominalTersirat)return;
const porsiBaru=Math.round((domNominal/nilai*100)*10000)/10000;
o.porsi=porsiBaru;
});
},
saveOwners(){
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Aset._ownersModalAsset){toast('⚠️ Simpan aset ini dulu sebelum mengatur porsi kepemilikan');return;}
if(typeof MultiOwnerEngine==='undefined'){toast('⚠️ Fitur porsi kepemilikan belum siap dimuat');return;}
const a=D.assets.find(x=>sameId(x.id,Aset._ownersModalAsset.id));
if(!a){toast('⚠️ Aset tidak ditemukan, coba tutup dan buka lagi');return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length){toast('⚠️ Tambahkan minimal 1 pemilik sebelum menyimpan');return;}
Aset._resyncOwnersFromDOM();
for(let i=0;i<draft.length;i++){
if(!draft[i].ownerName||!draft[i].ownerName.trim()){toast('⚠️ Nama pemilik baris ke-'+(i+1)+' wajib diisi');return;}
}
let selfIdUsed=draft.some((o)=>o.ownerId&&String(o.ownerId).trim()==='SELF');
let owners;
try{
owners=draft.map((o)=>{
let ownerId;
if(o.ownerId&&String(o.ownerId).trim()){
ownerId=String(o.ownerId).trim();
}else if(o.isSelf&&!selfIdUsed){
ownerId='SELF';
selfIdUsed=true;
}else if(!o.isSelf){
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'){
throw new Error('S607_OWNER_REGISTRY_UNAVAILABLE');
}
ownerId=OwnerRegistry.findOrCreate(o.ownerName.trim());
}else{
ownerId=String(uid());
}
return{ownerId,ownerName:o.ownerName.trim(),porsi:o.porsi,isSelf:!!o.isSelf};
});
}catch(e){
if(e&&e.message==='S607_OWNER_REGISTRY_UNAVAILABLE'){toast('⚠️ Fitur pemilik belum siap dimuat, coba lagi');return;}
throw e;
}
const res=MultiOwnerEngine.setOwners(a,owners);
if(!res.ok){toast('⚠️ '+res.reason);return;}
Object.assign(a,{owners:res.entity.owners});
if(typeof Aset.setOwnerSettlement==='function'){
owners.forEach((o)=>{
if(o.isSelf)return;
const draftRow=draft.find((d)=>(d.ownerId&&String(d.ownerId).trim()===o.ownerId)||d.ownerName.trim()===o.ownerName);
const settlement=draftRow&&draftRow.settlement==='milik'?'milik':'titipan';
Aset.setOwnerSettlement(a.id,o.ownerId,settlement);
});
}
if(a.titipanAmount>0){
a.titipanAmount=0;
a.titipanOwnerType='';
a.titipanOwnerName='';
}
if(typeof Aset._ownersDraftNilai==='number'&&isFinite(Aset._ownersDraftNilai)&&Aset._ownersDraftNilai>0){
a.nilai=Aset._ownersDraftNilai;
}
if(a.accountId){
const linkedAcc=D.accounts.find(x=>sameId(x.id,a.accountId));
if(linkedAcc){
const linkedAccNilai=a.nilai||0;
const txDelta=recalcAccBalance(linkedAcc.id)-(linkedAcc.baseBalance!==undefined?linkedAcc.baseBalance:(linkedAcc.balance||0));
linkedAcc.baseBalance=linkedAccNilai-txDelta;
linkedAcc.balance=linkedAccNilai;
if(typeof OwnershipEngine!=='undefined')linkedAcc.ownership=OwnershipEngine.resolve(a).type;
}
}
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{ownersUpdated:true,editId:a.id});
Aset._ownersDraftNilai=null;
Aset._ownersModalAsset=a;
Aset._ownersDraft=res.entity.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(a,o.ownerId):'titipan'}));
Aset._renderOwnersList();
Aset.renderList();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
if(typeof renderAccGrid==='function')renderAccGrid();
if(typeof renderDashAccList==='function')renderDashAccList();
if(typeof renderLapAccList==='function')renderLapAccList();
if(typeof renderDebtList==='function')renderDebtList();
if(typeof TitipanReconcile!=='undefined')TitipanReconcile.warnIfNotOk('Aset.saveOwners');
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
toast('✅ Porsi kepemilikan tersimpan');
},
resetOwners(){
Aset._rebalancePending=null;
if(Aset._ownersReadOnly){
const linkedOwners=Aset._resolveLinkedInvestmentOwners(Aset._ownersModalAsset);
Aset._ownersDraft=(linkedOwners||[]).map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
Aset._renderOwnersList();
return;
}
if(!Aset._ownersModalAsset){return;}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(Aset._ownersModalAsset):null;
Aset._ownersDraft=res&&res.ok?res.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(Aset._ownersModalAsset,o.ownerId):'titipan'})):[];
Aset._ownersDraftNilai=null;
Aset._renderOwnersList();
toast('↺ Draft direset ke data yang terakhir tersimpan');
Aset._checkRebalanceTrigger(Aset._ownersDraft.length-1);
},
getOwnerSettlement(a,ownerId){
const map=a&&typeof a==='object'&&a.ownerSettlement&&typeof a.ownerSettlement==='object'?a.ownerSettlement:null;
const v=map?map[ownerId]:undefined;
return v==='milik'?'milik':'titipan';
},
setOwnerSettlement(id,ownerId,settlement){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)throw new Error('Aset tidak ditemukan');
if(typeof ownerId!=='string'||!ownerId.trim())throw new Error('ownerId wajib diisi');
const norm=settlement==='milik'?'milik':'titipan';
a.ownerSettlement=(a.ownerSettlement&&typeof a.ownerSettlement==='object')?a.ownerSettlement:{};
if(norm==='titipan'){
delete a.ownerSettlement[ownerId];
}else{
a.ownerSettlement[ownerId]='milik';
}
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
if(typeof save==='function')save();
return a;
},
assetsByOwnerSettlement(ownerId,settlement){
if(typeof D==='undefined'||!Array.isArray(D.assets))return[];
const norm=settlement==='milik'?'milik':'titipan';
return D.assets.filter(a=>{
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
const owners=(res&&res.ok)?res.owners:[];
const row=owners.find(o=>o&&!o.isSelf&&String(o.ownerId)===String(ownerId));
return!!row&&Aset.getOwnerSettlement(a,row.ownerId)===norm;
});
},
_syncOwnerDebts(a){
if(!a||typeof D==='undefined'||!D.debts)return;
if(a.titipanDebtLinkId){
const legacyDebt=D.debts.find(d=>String(d.id)===String(a.titipanDebtLinkId));
if(legacyDebt&&!legacyDebt.linkedAssetId){
legacyDebt.linkedAssetId=a.id;
legacyDebt.linkedOwnerId='titipan_'+(a.titipanOwnerType||'investor');
}
a.titipanDebtLinkId=null;
}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
const owners=(res&&res.ok)?res.owners:[];
const nilai=typeof a.nilai==='number'&&isFinite(a.nilai)?a.nilai:0;
const nonSelfOwners=owners.filter(o=>!o.isSelf&&o.porsi>0&&Aset.getOwnerSettlement(a,o.ownerId)!=='milik');
const existingLinked=D.debts.filter(d=>d.linkedAssetId===a.id);
const keepIds=new Set();
nonSelfOwners.forEach(o=>{
const amount=nilai*(o.porsi/100);
const catatan='Dana titipan aset: '+a.name;
let debt=existingLinked.find(d=>d.linkedOwnerId===o.ownerId);
if(debt){
Object.assign(debt,{name:o.ownerName,nilai:amount,catatan,lunas:amount<=0});
}else{
debt={id:uid(),name:o.ownerName,nilai:amount,bunga:0,cicilanBulanan:0,tanggal:todayStr(),jatuhTempo:'',catatan,lunas:amount<=0,linkedAssetId:a.id,linkedOwnerId:o.ownerId};
D.debts.push(debt);
}
keepIds.add(o.ownerId);
});
D.debts=D.debts.filter(d=>!(d.linkedAssetId===a.id&&!keepIds.has(d.linkedOwnerId)));
},
migrateOwnersToRegistry(){
if(typeof D==='undefined'||!Array.isArray(D.assets))return{migrated:0,skipped:0,conflicts:0};
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'){
throw new Error('OwnerRegistry belum dimuat');
}
let migrated=0,skipped=0,conflicts=0;
D.assets.forEach(a=>{
if(!a||!Array.isArray(a.owners)||!a.owners.length){skipped++;return;}
const plan=[];
let touched=false;
a.owners.forEach(o=>{
if(!o||o.isSelf||!o.ownerName)return;
const canonical=OwnerRegistry.findOrCreate(String(o.ownerName).trim());
if(canonical!==o.ownerId){plan.push({row:o,oldId:o.ownerId,newId:canonical});touched=true;}
});
if(!touched){skipped++;return;}
const resultIds=a.owners.map(o=>(o&&!o.isSelf&&plan.some(p=>p.row===o))?plan.find(p=>p.row===o).newId:(o?o.ownerId:null));
const nonSelfResultIds=a.owners.map((o,i)=>({o,id:resultIds[i]})).filter(x=>x.o&&!x.o.isSelf).map(x=>x.id);
if(new Set(nonSelfResultIds).size!==nonSelfResultIds.length){conflicts++;return;}
plan.forEach(({row,oldId,newId})=>{
if(Array.isArray(D.debts)){
D.debts.forEach(d=>{ if(d&&d.linkedAssetId===a.id&&d.linkedOwnerId===oldId)d.linkedOwnerId=newId; });
}
row.ownerId=newId;
});
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
migrated+=plan.length;
});
return{migrated,skipped,conflicts};
},
};
