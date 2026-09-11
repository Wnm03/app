// car-notes.js — Catatan Kendaraan (Car Notes): pajak kendaraan (VEHTAX), log BBM, log servis + pengingat interval, kalkulator Torsi baut.
// Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 6 restrukturisasi folder, bagian Car Notes — lihat docs/FILE-MAP.md & RENCANA-SESI.md).
// Isi: VEHTAX_ITEMS/VEHTAX_INPUT_IDS (konstanta jadwal pajak STNK/ganti plat/uji kelayakan) + const BBM (catat isi BBM, hitung km/L, grafik tren) + const Servis (catat servis, pemakaian stok sparepart, pengingat interval per kategori) + TORSI_STANDARD_CAT/MY_WRENCH + const Torsi (kalkulator konversi & gauge visual torsi baut).
// PENTING: dimuat di GROUP_A build.js, tepat setelah budget.js (posisi lama features-budget-laporan-carnotes-pelanggan.js) — urutan load antar file GROUP_A jangan diubah sembarangan.

const VEHTAX_ITEMS={
tahunan:{label:'🧾 STNK Tahunan',tglKey:'pajakTahunanTgl',biayaKey:'biayaTahunan',advance:d=>d.setFullYear(d.getFullYear()+1)},
limaTahun:{label:'🔄 Ganti Plat (5th)',tglKey:'pajakLimaTahunTgl',biayaKey:'biayaLimaTahun',advance:d=>d.setFullYear(d.getFullYear()+5)},
uji:{label:'🚗 Uji Kelayakan',tglKey:'ujiKelayakanTgl',biayaKey:'biayaUji',advance:d=>d.setMonth(d.getMonth()+6)}
};
const VEHTAX_INPUT_IDS={
tahunan:{date:'vehTaxTahunan',biaya:'vehBiayaTahunan'},
limaTahun:{date:'vehTaxLimaTahun',biaya:'vehBiayaLimaTahun'},
uji:{date:'vehTaxUji',biaya:'vehBiayaUji'}
};
// Estimasi biaya pajak kendaraan dari histori pembayaran sebelumnya — pola SAMA PERSIS
// PriceReko.autoFillTransport() (modules/shop/cobek-pricing.js): rata-rata dari transaksi
// terakhir, bukan hitung ulang tarif resmi. Sumber data 100% reuse: bayarPajakKendaraan()
// (di bawah) sudah mencatat tiap pembayaran ke D.transactions dgn note persis
// `<label tanpa emoji> - <nama kendaraan>` — fungsi ini murni membaca ulang histori itu,
// TIDAK ada tabel/field baru di D.
function vehTaxHistoryEstimate(vehicleId,jenis){
const v=(D.vehicles||[]).find(x=>x.id===vehicleId);
const cfg=VEHTAX_ITEMS[jenis];
if(!v||!cfg)return null;
const noteMatch=cfg.label.replace(/^\S+\s/,'')+' - '+v.name;
const paid=(D.transactions||[]).filter(t=>t.type==='expense'&&t.note===noteMatch&&t.amount>0).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-5);
if(!paid.length)return null;
return Math.round(paid.reduce((s,t)=>s+t.amount,0)/paid.length);
}
function autoFillVehTaxBiaya(jenis){
const vehicleId=document.getElementById('vehTaxModal').dataset.vehicleId;
const ids=VEHTAX_INPUT_IDS[jenis];
if(!ids)return;
const est=vehTaxHistoryEstimate(vehicleId,jenis);
if(est===null){toast('⚠️ Belum ada histori pembayaran '+(VEHTAX_ITEMS[jenis]?.label.replace(/^\S+\s/,'')||'')+' buat kendaraan ini — bayar sekali dulu lewat tombol ✅ Bayar biar tercatat.');return;}
const el=document.getElementById(ids.biaya);
if(el)el.value=est;
toast('✅ Diisi dari rata-rata pembayaran sebelumnya: '+fmtFull(est)+' — sesuaikan lagi kalau tarif resmi terbaru beda.',7000);
}
// onBbmJenisChange() — wrapper utk data-onchange="onBbmJenisChange" di dropdown
// #bbmJenis (bbmModal, modules/shared/modals.js). Gap ditemukan lewat laporan
// user (toast "Input ini belum berfungsi") + dikonfirmasi lewat audit statis
// data-action/data-onchange di modals.js: markup & test s753 sudah mengasumsikan
// wrapper ini ADA (lihat tests/fuel-jenis-wiring-s753.test.js), tapi definisinya
// sendiri belum pernah ditulis -- beda dari onTxBbmJenisChange (txModal, sudah
// ada di modules/finance/tx-bbm.js) yang jadi pola acuan di sini. Perilaku
// disamakan persis: begitu jenis BBM diganti, harga referensi (#bbmHarga)
// di-refresh sesuai jenis baru untuk kendaraan aktif (curVehicleId).
function onBbmJenisChange(){
if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId);
}
}
const BBM={
editId:null,
listPage:1,
lastFilterSig:null,
openModal(editId){
BBM.editId=(typeof editId!=='undefined')?editId:null;
const isEdit=BBM.editId!==null;
document.getElementById('bbmModalTitle').textContent=isEdit?'Edit Catatan BBM':'Catat Isi BBM';
document.getElementById('bbmDelBtn').style.display=isEdit?'flex':'none';
const bbmAccEl=document.getElementById('bbmAcc');
if(bbmAccEl) bbmAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
if(typeof FuelPriceRef!=='undefined')FuelPriceRef.populateSelect('bbmJenis',curVehicleId);
if(isEdit){
const b=D.bbmLogs.find(x=>x.id===BBM.editId);
if(!b)return;
document.getElementById('bbmDate').value=b.date;
document.getElementById('bbmKm').value=b.km;
document.getElementById('bbmLiter').value=b.liter;
document.getElementById('bbmHarga').value=b.harga||'';
document.getElementById('bbmCost').value=b.cost;
document.getElementById('bbmSpbu').value=b.spbu||'';
document.getElementById('bbmFull').checked=!!b.fullTank;
document.getElementById('bbmNote').value=b.note||'';
if(bbmAccEl&&b.accountId)bbmAccEl.value=b.accountId;
// Edit: set dropdown Jenis BBM ke jenis tersimpan TANPA menimpa harga
// (populateSelect() di atas sudah isi opsi + default lastType; di sini
// cuma override value-nya sesuai catatan yang diedit, kalau ada).
if(b.jenis){
const jenisEl=document.getElementById('bbmJenis');
if(jenisEl)jenisEl.value=b.jenis;
} else if(typeof FuelPriceRef!=='undefined'){
FuelPriceRef.selectUnknown('bbmJenis');
}
} else {
document.getElementById('bbmDate').value=new Date().toISOString().split('T')[0];
['bbmLiter','bbmHarga','bbmCost','bbmSpbu','bbmNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('bbmKm').value=getVehicleKm(curVehicleId)||'';
document.getElementById('bbmFull').checked=true;
// Entry baru: isi harga referensi sesuai jenis default yang terpilih
// (per-kendaraan, Sesi 755 -- lihat SESSION-NOTE S755).
if(typeof FuelPriceRef!=='undefined')FuelPriceRef.onSelectChange('bbmJenis','bbmHarga',curVehicleId);
}
openModal('bbmModal');
},
syncCost(){
const liter=parseFloat(document.getElementById('bbmLiter').value);
const harga=parseFloat(document.getElementById('bbmHarga').value);
if(liter&&harga)document.getElementById('bbmCost').value=Math.round(liter*harga);
},
syncLiterFromCost(){
const harga=parseFloat(document.getElementById('bbmHarga').value);
const cost=parseFloat(document.getElementById('bbmCost').value);
if(harga>0&&cost>0){
document.getElementById('bbmLiter').value=(cost/harga).toFixed(2);
}
},
syncHargaChanged(){
const liter=parseFloat(document.getElementById('bbmLiter').value);
const harga=parseFloat(document.getElementById('bbmHarga').value);
const cost=parseFloat(document.getElementById('bbmCost').value);
if(liter>0&&harga>0){
document.getElementById('bbmCost').value=Math.round(liter*harga);
}else if(harga>0&&cost>0){
document.getElementById('bbmLiter').value=(cost/harga).toFixed(2);
}
},
save(){return withSaveGuard('bbm','bbmModal',BBM._saveInner);},
_saveInner(){
const km=parseFloat(document.getElementById('bbmKm').value);
const liter=parseFloat(document.getElementById('bbmLiter').value);
let cost=parseFloat(document.getElementById('bbmCost').value);
let harga=parseFloat(document.getElementById('bbmHarga').value);
if(!km||!liter||!cost){toast('⚠️ Lengkapi KM, liter, dan biaya');return;}
const spbu=document.getElementById('bbmSpbu').value.trim();
const fullTank=document.getElementById('bbmFull').checked;
const date=document.getElementById('bbmDate').value;
const note=document.getElementById('bbmNote').value;
const accId=document.getElementById('bbmAcc')?document.getElementById('bbmAcc').value:D.accounts[0]?.id;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const noteFull='BBM'+(veh?' '+veh.name:'')+(spbu?' - '+spbu:'')+(note?' - '+note:'');
const isEdit=BBM.editId!==null;
const existing=isEdit?D.bbmLogs.find(x=>x.id===BBM.editId):null;
if(isEdit&&!existing){toast('⚠️ Data tidak ditemukan');return;}
// BUGFIX: catatan BBM "yatim" (existing.txLinkId hilang, mis. transaksi
// terkaitnya kehapus manual) dulu SILENTLY tetap tidak tersinkron kalau
// diedit, krn txId jatuh ke null & cabang "if(txId)" di bawah dilewati.
// Sekarang: kalau ketahuan yatim saat edit, generate txId baru & buat
// ulang transaksinya (sama seperti alur catatan baru), bukan dibiarkan.
const wasOrphan=isEdit&&!existing.txLinkId;
const txId=isEdit?(existing.txLinkId||uid()):uid();
const jenisEl=document.getElementById('bbmJenis');
const jenis=jenisEl?jenisEl.value:undefined;
const result=recordBbmLog({
vehicleId:curVehicleId,date,km,liter,harga,cost,spbu,fullTank,note,accountId:accId,jenis,
txId,existingBbmId:isEdit?BBM.editId:null
});
if(isEdit){
if(wasOrphan){
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Bensin',accountId:accId,payMethod:'tunai',note:noteFull,date,bbmLinkId:result.bbmId});
const b=D.bbmLogs.find(x=>x.id===result.bbmId);
if(b)b.txLinkId=txId;
toast('✅ Catatan BBM diperbarui & disinkron ulang ke Keuangan');
}else{
const tx=D.transactions.find(t=>t.id===txId);
if(tx)Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
toast('✅ Catatan BBM diperbarui');
}
} else {
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Bensin',accountId:accId,payMethod:'tunai',note:noteFull,date,bbmLinkId:result.bbmId});
toast('✅ Catatan BBM tersimpan & tersinkron ke Keuangan');
}
save();closeModal('bbmModal');renderCnTab();renderDashboard();renderKeuangan();
// TASK-152 (Fuel Finance Integration): samakan dgn pola _saveTxInner()
// di transaksi.js (transaksi umum dgn sinkron BBM lewat tx-bbm.js) yang
// SUDAH emit AIBus "finance.updated" tiap transaksi tersimpan -- sebelum
// ini, catatan BBM lewat modal "Catat Isi BBM" (jalur INI) tidak pernah
// memancarkan event itu, jadi AIDecision/AIService (modules/ai/ai-service.js
// wireEvents(), SUDAH ADA) tidak pernah tahu ada transaksi BBM baru kalau
// user masuk lewat Car Notes bukan lewat form Transaksi umum. 0 field baru
// di payload selain yang sudah dipakai transaksi.js (txId/category/type/
// amount) + `kind:'bbm'` (pola sama dgn kind:"cicilan-baru"/"langganan" di
// transaksi.js) supaya listener bisa membedakan asal event kalau perlu,
// TANPA mengubah bentuk dasar payload. TIDAK menyentuh AIBus/AIService/
// FuelInsightEngine sama sekali -- murni tambah 1 pemancar event dari sisi
// ini, reuse bus yang sudah ada apa adanya.
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'bbm'});
},
deleteFromModal(){if(BBM.editId===null)return;const id=BBM.editId;closeModal('bbmModal');BBM.del(id);},
async del(id){
if(!await askConfirm('Hapus catatan ini? Catatan keuangan terkait juga akan dihapus.'))return;
const b=D.bbmLogs.find(x=>x.id===id);
if(b&&b.txLinkId)D.transactions=D.transactions.filter(tx=>tx.id!==b.txLinkId);
D.bbmLogs=D.bbmLogs.filter(b=>b.id!==id);
save();renderCnTab();renderDashboard();renderKeuangan();toast('🗑 Catatan BBM dihapus');
},
svgCostBar(months,byMonth){
if(!months.length)return '<div class="u-fs12 u-t2 u-tac" style="padding:14px 0">Belum ada data biaya BBM di periode ini.</div>';
const maxCost=Math.max(...months.map(m=>byMonth[m].cost),1);
const barW=34,gap=18,padL=10,chartH=64;
const w=months.length*(barW+gap)+padL;
let bars='';
months.forEach((m,idx)=>{
const val=byMonth[m].cost;
const h=Math.max(4,Math.round((val/maxCost)*chartH));
const x=padL+idx*(barW+gap);
const y=chartH-h+18;
bars+=`<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5" style="fill:var(--accent2)"/>`
+`<text x="${x+barW/2}" y="${y-6}" text-anchor="middle" style="font-size:9px;fill:var(--text2);font-family:'Plus Jakarta Sans',sans-serif">${fmt(val)}</text>`
+`<text x="${x+barW/2}" y="${chartH+32}" text-anchor="middle" style="font-size:9px;fill:var(--text3);font-family:'Plus Jakarta Sans',sans-serif">${byMonth[m].label}</text>`;
});
return `<svg class="u-w100" viewBox="0 0 ${w} ${chartH+40}" style="height:auto;display:block">${bars}</svg>`;
},
svgEffLine(points){
if(points.length<2)return '<div class="u-fs12 u-t2 u-tac" style="padding:14px 0">Butuh minimal 3 isi BBM "penuh" (full tank) berurutan buat menghitung tren efisiensi.</div>';
const vals=points.map(p=>p.kml);
const max=Math.max(...vals),min=Math.min(...vals);
const range=(max-min)||1;
const padT=14,padB=22,padX=10;
const w=Math.max(points.length*54,200),h=64;
const stepX=points.length>1?(w-padX*2)/(points.length-1):0;
const coords=points.map((p,i)=>({x:padX+i*stepX,y:padT+(1-(p.kml-min)/range)*(h-padT-padB),...p}));
const poly=coords.map(c=>`${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
let dots='';
coords.forEach(c=>{
dots+=`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" style="fill:var(--accent3)"/>`
+`<text x="${c.x.toFixed(1)}" y="${(c.y-8).toFixed(1)}" text-anchor="middle" style="font-size:9px;fill:var(--text2);font-family:'Plus Jakarta Sans',sans-serif">${c.kml.toFixed(1)}</text>`
+`<text x="${c.x.toFixed(1)}" y="${h+10}" text-anchor="middle" style="font-size:8px;fill:var(--text3);font-family:'Plus Jakarta Sans',sans-serif">${c.label}</text>`;
});
return `<svg class="u-w100" viewBox="0 0 ${w} ${h+20}" style="height:auto;display:block"><polyline points="${poly}" style="fill:none;stroke:var(--accent3);stroke-width:2"/>${dots}</svg>`;
},
renderTrend(logs){
const box=document.getElementById('bbmTrendCard');
if(!box)return;
const byMonth={};
logs.forEach(b=>{
const d=new Date(b.date);
if(isNaN(d))return;
const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
if(!byMonth[key])byMonth[key]={cost:0,label:d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'})};
byMonth[key].cost+=b.cost;
});
const months=Object.keys(byMonth).sort().slice(-6);
const sortedByKm=[...logs].sort((a,b)=>a.km-b.km);
const fullIdx=sortedByKm.map((b,i)=>b.fullTank?i:-1).filter(i=>i>=0);
const effPoints=[];
for(let n=0;n<fullIdx.length-1;n++){
const i=fullIdx[n],j=fullIdx[n+1];
const kmDist=sortedByKm[j].km-sortedByKm[i].km;
const literUsed=sortedByKm.slice(i+1,j+1).reduce((s,x)=>s+x.liter,0);
if(kmDist>0&&literUsed>0)effPoints.push({kml:kmDist/literUsed,label:new Date(sortedByKm[j].date).toLocaleDateString('id-ID',{day:'2-digit',month:'short'})});
}
const lastEff=effPoints.slice(-8);
box.innerHTML=`<div class="card-title">📈 Tren BBM</div>
      <div class="u-fs11 u-t2 u-fw700 u-mb6">💸 Biaya per Bulan (${months.length?'6 bulan terakhir':'-'})</div>
      ${BBM.svgCostBar(months,byMonth)}
      <div style="height:1px;background:var(--border);margin:14px 0"></div>
      <div class="u-fs11 u-t2 u-fw700 u-mb6">⚡ Efisiensi km/liter (per isi penuh, ${lastEff.length||0} data terakhir)</div>
      ${BBM.svgEffLine(lastEff)}`;
},
renderList(){
const {from,to}=getCnRange();
const filterSig=curVehicleId+'|'+(+from)+'|'+(+to);
if(filterSig!==BBM.lastFilterSig){BBM.listPage=1;BBM.lastFilterSig=filterSig;}
const logs=D.bbmLogs.filter(b=>b.vehicleId===curVehicleId&&new Date(b.date)>=from&&new Date(b.date)<=to).sort((a,b)=>a.km-b.km);
const totalL=logs.reduce((s,b)=>s+b.liter,0);
const totalCost=logs.reduce((s,b)=>s+b.cost,0);
let avgKmL=0;
const fullIdx=logs.map((b,i)=>b.fullTank?i:-1).filter(i=>i>=0);
if(fullIdx.length>=2){
let totalKmDist=0,totalLiterUsed=0;
for(let n=0;n<fullIdx.length-1;n++){
const i=fullIdx[n],j=fullIdx[n+1];
const kmDist=logs[j].km-logs[i].km;
const literUsed=logs.slice(i+1,j+1).reduce((s,b)=>s+b.liter,0);
if(kmDist>0&&literUsed>0){totalKmDist+=kmDist;totalLiterUsed+=literUsed;}
}
if(totalLiterUsed>0)avgKmL=totalKmDist/totalLiterUsed;
} else if(logs.length>=2){
const totalJarak=logs[logs.length-1].km-logs[0].km;
const literTanpaAwal=logs.slice(1).reduce((s,b)=>s+b.liter,0);
avgKmL=literTanpaAwal>0?(totalJarak/literTanpaAwal):0;
}
document.getElementById('bbmAvgKmL').textContent=avgKmL?avgKmL.toFixed(1):'-';
document.getElementById('bbmTotalL').textContent=totalL.toFixed(1)+' L';
document.getElementById('bbmTotalCost').textContent=fmt(totalCost);
BBM.renderTrend(logs);
const sorted=[...logs].sort((a,b)=>b.km-a.km);
const el=document.getElementById('bbmList');
if(!sorted.length){el.innerHTML='<div class="empty"><div class="empty-icon">⛽</div><div class="empty-text">Belum ada catatan BBM</div></div>';return;}
const prevMap=new Map(), cumLiterMap=new Map();
{
let prevDistinct=null,cum=0,i=0;
while(i<logs.length){
let j=i,groupLiter=0;
while(j<logs.length&&logs[j].km===logs[i].km){groupLiter+=(logs[j].liter||0);j++;}
cum+=groupLiter;
for(let k=i;k<j;k++){prevMap.set(logs[k].id,prevDistinct);cumLiterMap.set(logs[k].id,cum);}
prevDistinct=logs[j-1];
i=j;
}
}
const visibleCount=Math.min(sorted.length,BBM.listPage*TX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
el.innerHTML=visible.map((b)=>{
const prev=prevMap.get(b.id)||null;
let kmL=null;
if(prev&&b.fullTank){
const jarak=b.km-prev.km;
const literSejak=cumLiterMap.get(b.id)-(prev?cumLiterMap.get(prev.id):0);
kmL=(jarak>0&&literSejak>0)?(jarak/literSejak):null;
}
return`<div class="tx-item u-pointer" data-action="openBbmModal" data-args="${escapeHtml(JSON.stringify([b.id]))}">
        <div class="tx-icon" style="background:var(--accent4-soft)">⛽</div>
        <div class="tx-info"><div class="tx-name">${b.km!=null?b.km.toLocaleString('id-ID')+' km':'(km tidak dicatat)'} · ${b.liter}L${b.harga?' · Rp'+Math.round(b.harga).toLocaleString('id-ID')+'/L':''}</div><div class="tx-meta">${b.date}${b.spbu?' · '+escapeHtml(b.spbu):''}${b.fullTank?' · Full Tank':' · Isi sebagian'}${b.note?' · '+escapeHtml(b.note):''}</div></div>
        <div class="u-flex u-fdcol u-gap4" style="align-items:flex-end">
          <div class="tx-amount red">${fmt(b.cost)}</div>
          ${kmL?`<span class="kmL-badge">${kmL.toFixed(1)} km/L</span>`:''}
        </div>
        <button class="tx-del" data-stop="1" data-action="delBbm" data-args="${escapeHtml(JSON.stringify([b.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
}).join('');
let bbmMoreWrap=document.getElementById('bbmListLoadMoreWrap');
if(!bbmMoreWrap){
bbmMoreWrap=document.createElement('div');
bbmMoreWrap.id='bbmListLoadMoreWrap';
bbmMoreWrap.style.cssText='text-align:center;margin-top:10px';
bbmMoreWrap.innerHTML='<button class="btn btn-ghost btn-sm" data-action="loadMoreBbmList" aria-label="Tampilkan lebih banyak riwayat BBM"></button>';
el.insertAdjacentElement('afterend',bbmMoreWrap);
}
if(visibleCount<sorted.length){
bbmMoreWrap.style.display='block';
bbmMoreWrap.querySelector('button').textContent=`⬇️ Tampilkan lebih banyak (${sorted.length-visibleCount} lagi)`;
} else bbmMoreWrap.style.display='none';
},
loadMore(){BBM.listPage++;BBM.renderList();}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['BBM'][method]. `const BBM = {...}` di atas HANYA membuat binding
// lexical-scope (bukan properti window), pola fix sama persis window.FuelModal
// di fuel-modal.js (bug yang sama pernah terjadi & diperbaiki di sana).
// Tanpa baris ini, semua tombol data-action="BBM.xxx" gagal diam-diam.
if (typeof BBM !== 'undefined') window.BBM = BBM;
const Servis={
editId:null,
listPage:1,
lastFilterSig:null,
// _photoDraft — BARU (Sesi F1, ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
// §7 Sesi F "Foto di Service History"). Array dataURL string, in-memory
// draft SAJA selama modal servis terbuka (dipopulasi dari s.foto saat
// edit, dikosongkan saat tambah baru) -- baru ditulis ke D.servisLogs[].foto
// saat _saveInner() sukses. Pola construction sama seperti field lain di
// objek ini (editId dll): reset di openModal(), dibaca di _saveInner().
_photoDraft:[],
// activeActionTypeFilter — BARU (Sesi E6, ROADMAP-KONSOLIDASI-DATABASE-
// SERVIS-v2.md §7 Sesi E item 6 "filter riwayat by actionType"). State
// in-memory murni (bukan field D baru, tidak dipersist -- pola sama
// Torsi.activeCat). null = "Semua" (0 filter, 0 perubahan perilaku
// renderList() lama). Nilai lain: 'periksa'/'bersih'/'ganti'.
activeActionTypeFilter:null,
// activeMasterCategoryFilter — BARU (Sesi D-lanjutan4, ROADMAP-KONSOLIDASI-
// DATABASE-SERVIS-v2.md §7 Sesi D — item "filter/chip masterCategory di
// Servis.renderList() (Riwayat Servis)" yang SENGAJA ditunda di Sesi
// D-lanjutan3 (v1670, lihat SESSION-NOTE-sesi-d-lanjutan3-mastercategoryfilter-
// v1670.md "Sengaja TIDAK dikerjakan sesi ini") krn renderList() adalah
// daftar LOG (butuh join balik ke kategori dulu via resolveLogMasterCategoryId()
// di bawah), beda dari Sparepart.renderCatList() yg daftar KATEGORI langsung.
// State in-memory murni (bukan field D baru, tidak dipersist -- pola sama
// persis activeActionTypeFilter/Sparepart.activeMasterCategoryFilter). null =
// "Semua" (0 filter, 0 perubahan perilaku lama).
activeMasterCategoryFilter:null,
// _masterCategoryFilterPrefsLoaded/_masterCategoryFilterStorageKey +
// _loadMasterCategoryFilterPrefsOnce()/_saveMasterCategoryFilterPrefs() --
// Sesi D-lanjutan5. Pola & alasan SAMA PERSIS versi Sparepart
// (modules/vehicle/sparepart-servis.js) -- lihat komentar lengkap di sana
// (kenapa bukan FilterPrefsStore apa adanya, dst). Key storage BEDA (khusus
// Servis, terpisah dari Sparepart) supaya preferensi filter kedua tab tidak
// saling timpa.
_masterCategoryFilterPrefsLoaded:false,
_masterCategoryFilterStorageKey:'servisMasterCategoryFilterPrefs',
_loadMasterCategoryFilterPrefsOnce(){
if(Servis._masterCategoryFilterPrefsLoaded)return;
Servis._masterCategoryFilterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(Servis._masterCategoryFilterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
const id=parsed&&parsed.activeMasterCategoryFilter;
if(id===null)return;
if(typeof id!=='string')return;
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
const validIds=hasApi?(DatabaseAPI.masterCategory.getAll()||[]).map(c=>c.id):[];
if((typeof UNCATEGORIZED_FILTER_ID!=='undefined'&&id===UNCATEGORIZED_FILTER_ID)||validIds.indexOf(id)!==-1){
Servis.activeMasterCategoryFilter=id;
}
}catch(err){
// localStorage korup/tidak tersedia -> abaikan, filter tetap default null
// ("Semua") -- 0 crash.
}
},
_saveMasterCategoryFilterPrefs(){
if(typeof localStorage==='undefined')return;
try{
localStorage.setItem(Servis._masterCategoryFilterStorageKey,JSON.stringify({activeMasterCategoryFilter:Servis.activeMasterCategoryFilter}));
}catch(err){
// localStorage penuh/diblokir -> abaikan (0 crash).
}
},
// resolveLogMasterCategoryId(s) -- Sesi D-lanjutan4. Join 1 entry riwayat
// servis (s, dari D.servisLogs) balik ke kategori masternya (13 kategori
// terkunci, DatabaseAPI.masterCategory). Reuse persis pola join yang SUDAH
// ADA di openServisModal() (lihat baris `linkedCat` jalur edit/prefill
// interval): s.categoryId (tautan langsung, entry baru sejak field ini ada)
// -> fallback resolveServisCatForVehicle(s.item, vehicleId) (match nama+
// kendaraan, utk entry lama tanpa categoryId) -> fallback match nama polos
// (fail-safe terakhir kalau resolveServisCatForVehicle tidak termuat). Begitu
// dapat kategori (cat), delegasi ke resolveCatGroup() apa adanya (SoT
// tunggal, 0 logic classify baru) utk masterCategoryId-nya -- pola sama
// persis Sparepart.dashReminderMasterCatBadgeHTML()/updateMasterCatBadge().
// 0 match kategori ATAU 0 match kategori master -> null (bukan ditebak),
// entry itu tidak akan cocok filter kategori master mana pun (tetap tampil
// normal saat filter "Semua").
resolveLogMasterCategoryId(s){
if(typeof resolveCatGroup!=='function')return null;
const vehicleId=s.vehicleId||curVehicleId;
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,vehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===(s.item||'').toLowerCase()));
if(!linkedCat)return null;
const r=resolveCatGroup(linkedCat,vehicleId);
return r?r.masterCategoryId:null;
},
// setMasterCategoryFilter(id) -- Sesi D-lanjutan4. Dipanggil dari klik chip
// filter (data-action="Servis.setMasterCategoryFilter") di Riwayat Servis.
// id: null ("Semua") atau salah satu id dari 13 kategori master. Pola sama
// persis setActionTypeFilter() di atas -- reset listPage ke 1 supaya
// pagination tidak nyangkut di halaman lama saat filter berganti.
setMasterCategoryFilter(id){
Servis.activeMasterCategoryFilter=id||null;
// Sesi D-lanjutan5: persist pilihan chip (lihat _saveMasterCategoryFilterPrefs()
// di atas) -- 0 dampak kalau storage gagal/diblokir.
Servis._saveMasterCategoryFilterPrefs();
Servis.listPage=1;
Servis.renderList();
},
// renderMasterCategoryChips(beforeEl) -- Sesi D-lanjutan4. Chip row filter
// riwayat by kategori master (13 terkunci), DISISIPKAN lewat JS sebelum
// beforeEl (pola sama persis renderActionTypeChips() di atas &
// Sparepart.renderMasterCategoryChips() Sesi D-lanjutan3) -- 1x dibuat (cek
// getElementById dulu), tidak dobel-insert di render berikutnya. Guard: 0
// DatabaseAPI.masterCategory sama sekali -> row TIDAK dibuat sama sekali
// (bukan tampil kosong), pola sama "0/>1 kandidat = dilewati, tidak
// menebak" yang konsisten dipakai di seluruh fitur Sesi D.
renderMasterCategoryChips(beforeEl){
const hasApi=typeof DatabaseAPI!=='undefined'&&DatabaseAPI.masterCategory&&typeof DatabaseAPI.masterCategory.getAll==='function';
if(!hasApi)return;
let row=document.getElementById('servisMasterCatChipRow');
if(!row){
row=document.createElement('div');
row.id='servisMasterCatChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:6px;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const cats=DatabaseAPI.masterCategory.getAll()||[];
// Sesi D-lanjutan5: chip "❔ Belum Terklasifikasi" -- pola & alasan SAMA
// PERSIS Sparepart.renderMasterCategoryChips() (sparepart-servis.js), lihat
// komentar lengkap di sana. UNCATEGORIZED_FILTER_ID dideklarasikan di
// sparepart-servis.js (dimuat sebelum file ini via scripts/build.js).
const options=[{id:null,label:'🔍 Semua'}].concat(cats.map(c=>({id:c.id,label:(c.icon||'🔧')+' '+c.name}))).concat([{id:UNCATEGORIZED_FILTER_ID,label:'❔ Belum Terklasifikasi'}]);
row.innerHTML=options.map(o=>`<div class="chip ${o.id===Servis.activeMasterCategoryFilter?'active':''}" data-action="Servis.setMasterCategoryFilter" data-args="${escapeHtml(JSON.stringify([o.id]))}">${o.label}</div>`).join('');
},
populatePartSelect(selectedPartId){
const sel=document.getElementById('servisPartId');
if(!sel)return;
// Bugfix (laporan user): dropdown ini dulu tampil SEMUA D.partsStock tanpa
// pandang kendaraan aktif -- sekarang di-filter reuse Sparepart.isPartForVehicle()
// (part tanpa tautan katalog/kendaraan tetap tampil, lihat catatan di sana).
const list=D.partsStock.filter(p=>p.id===selectedPartId||Sparepart.isPartForVehicle(p,typeof curVehicleId!=='undefined'?curVehicleId:null));
const opts=list.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (sisa ${p.qty}${p.unit?' '+p.unit:''})</option>`).join('');
sel.innerHTML='<option value="">Tidak pakai stok</option>'+opts;
sel.value=selectedPartId||'';
Servis.onPartChange();
},
onPartChange(){
const sel=document.getElementById('servisPartId');
const wrap=document.getElementById('servisPartQtyWrap');
if(!sel||!wrap)return;
wrap.style.display=sel.value?'block':'none';
},
/** Muat daftar part Vehicle Catalog ke dropdown `servisCatalogPartId` (Tahap 6
 * Sesi 2 — UI picker, reuse VehicleCatalog.getAll() apa adanya, TIDAK ada
 * filter/rekomendasi otomatis berdasar jenis kendaraan/servis). Async karena
 * VehicleCatalog.getAll() async (baca IDBStore) — dipanggil fire-and-forget
 * dari openModal() (pola sama beberapa populate async lain di app), select
 * tetap kosong dulu sampai promise resolve. Guard typeof supaya modal servis
 * tetap berfungsi normal kalau VehicleCatalog belum sempat dimuat. */
populateCatalogPartSelect(selectedCatalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.getAll==='function';
if(!hasCatalog){
sel.innerHTML='<option value="">Tidak pakai part katalog</option>';
sel.value='';
Servis.onCatalogPartChange();
return;
}
VehicleCatalog.getAll().then(items=>{
// Bugfix (laporan user): dulu tampil SEMUA part katalog tanpa pandang
// kendaraan aktif -- reuse VehicleCatalog.filterForVehicle() yang sama
// dipakai VehicleCatalogUI.renderList().
const filtered=VehicleCatalog.filterForVehicle(items,typeof curVehicleId!=='undefined'?curVehicleId:null);
const list=(filtered||[]).some(it=>it.id===selectedCatalogId)||!selectedCatalogId?filtered:filtered.concat((items||[]).filter(it=>it.id===selectedCatalogId));
const opts=(list||[]).map(it=>`<option value="${escapeHtml(it.id)}" data-oem="${escapeHtml(it.oemCode||'')}" data-name="${escapeHtml(it.partName||'')}">${escapeHtml(it.partName||'(Tanpa nama)')}${it.oemCode?' — '+escapeHtml(it.oemCode):''}</option>`).join('');
sel.innerHTML='<option value="">Tidak pakai part katalog</option>'+opts;
sel.value=selectedCatalogId||'';
Servis.onCatalogPartChange();
}).catch(()=>{
sel.innerHTML='<option value="">Tidak pakai part katalog</option>';
sel.value='';
Servis.onCatalogPartChange();
});
},
onCatalogPartChange(){
const sel=document.getElementById('servisCatalogPartId');
const wrap=document.getElementById('servisCatalogPartQtyWrap');
if(!sel||!wrap)return;
wrap.style.display=sel.value?'block':'none';
},
/** Muat & tampilkan area rekomendasi part katalog (Tahap 6 Sesi 4 — chip
 * list, TIDAK mengubah dropdown/qty/servisLogs/stok apa pun, murni saran
 * yang bisa diklik). Reuse VehicleCatalog.recommend() apa adanya, dasar
 * rekomendasi: kendaraan aktif (curVehicleId) + isi field "Jenis Servis/
 * Item" saat ini. Guard typeof supaya modal servis tetap berfungsi normal
 * kalau VehicleCatalog belum sempat dimuat. Async (fire-and-forget, pola
 * sama populateCatalogPartSelect) — area disembunyikan dulu sampai
 * promise resolve & ada hasil. */
renderCatalogRecommendations(){
const wrap=document.getElementById('servisCatalogRecoWrap');
const list=document.getElementById('servisCatalogRecoList');
if(!wrap||!list)return;
wrap.style.display='none';
list.innerHTML='';
const hasCatalog=typeof VehicleCatalog!=='undefined'&&VehicleCatalog&&typeof VehicleCatalog.recommend==='function';
if(!hasCatalog)return;
const itemEl=document.getElementById('servisItem');
const item=itemEl?itemEl.value.trim():'';
VehicleCatalog.recommend({vehicleId:curVehicleId,item}).then(items=>{
if(!items||!items.length)return;
list.innerHTML=items.map(it=>`<button type="button" class="chip-btn" style="font-size:11px" data-action="Servis.selectCatalogRecommendation" data-args="${escapeHtml(JSON.stringify([it.id]))}">${escapeHtml(it.partName||'(Tanpa nama)')}${it.oemCode?' · '+escapeHtml(it.oemCode):''}</button>`).join('');
wrap.style.display='block';
}).catch(()=>{});
},
/** Klik 1 chip rekomendasi -> otomatis pilih part itu di dropdown
 * `servisCatalogPartId` (kalau opsinya sudah termuat) & tampilkan field
 * qty (reuse onCatalogPartChange() apa adanya). TIDAK menyimpan apa pun
 * (belum mengubah servisLogs/stok — sesuai cakupan sesi ini), murni bantu
 * isi form. */
selectCatalogRecommendation(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
},
onItemAutofillInterval(){
const item=document.getElementById('servisItem').value.trim();
const intervalEl=document.getElementById('servisInterval');
if(intervalEl&&intervalEl.dataset.manual!=='1'){
// BUGFIX (audit): pakai resolveServisCatForVehicle() (sparepart-servis.js)
// supaya interval yang diautofill milik kategori kendaraan AKTIF, bukan
// ke-nyasar ke kategori privat kendaraan lain yang kebetulan nama-nya
// sama. Guard typeof supaya tetap aman kalau file itu belum termuat
// (mis. test yang load car-notes.js secara terisolasi).
const matched=item?(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase())):null;
intervalEl.value=matched?matched.intervalKm:'';
}
Servis.tryAutoLinkCatalogPart(item);
Servis.renderCatalogRecommendations();
},
/** BUGFIX (laporan user, Sesi 545): render suggest-box custom untuk
 * "Jenis Servis/Item" (reuse pola simpleAutocompleteInput() yang sudah
 * dipakai field lain di app ini -- lihat catatan lengkap di
 * Sparepart.populateDatalist(), modules/vehicle/sparepart-servis.js).
 * Dipanggil dari oninput & onfocus field servisItem. Sumber data dari
 * Sparepart.getItemSuggestions() (kategori+stok+katalog, sama seperti
 * datalist lama). Maks 8 saran spy list tidak kepanjangan di layar HP. */
onItemInputSuggest(){
const el=document.getElementById('servisItem');
const box=document.getElementById('servisItemSuggestBox');
if(!el||!box)return;
const q=el.value.trim().toLowerCase();
const names=(typeof Sparepart!=='undefined'&&Sparepart.getItemSuggestions)?Sparepart.getItemSuggestions():[];
const matches=(q?names.filter(n=>n.toLowerCase().includes(q)):names).slice(0,8);
if(!matches.length){box.style.display='none';box.innerHTML='';return;}
box.innerHTML=matches.map(n=>`<div class="suggest-item" onmousedown="event.preventDefault();Servis.selectItemSuggestion('${jsAttrEscape(n)}')">${escapeHtml(n)}</div>`).join('');
box.style.display='block';
},
/** User tap 1 saran dari suggest-box -> isi field servisItem & tutup
 * suggest-box, lalu jalankan lagi alur autofill interval/auto-link katalog
 * yang sama seperti user ngetik manual persis nama itu (reuse
 * onItemAutofillInterval() apa adanya -- TIDAK ada logic baru). */
selectItemSuggestion(name){
const el=document.getElementById('servisItem');
if(el)el.value=name;
if(typeof hideSuggestBox==='function')hideSuggestBox('servisItemSuggestBox');
Servis.onItemAutofillInterval();
},
/** Sesi 297 (permintaan eksplisit user, sinkron "Jenis Servis/Item" <-> Katalog Suku
 * Cadang supaya stok otomatis kepotong tanpa perlu pilih dua kali): kalau user
 * mengetik/pilih teks di "Jenis Servis/Item" yang PERSIS (case-insensitive) cocok
 * dengan SATU nama part di dropdown `servisCatalogPartId` (yang sudah dimuat via
 * populateCatalogPartSelect() saat modal dibuka), otomatis pilihkan part itu &
 * tampilkan field qty (reuse onCatalogPartChange() apa adanya) -- sama seperti user
 * pilih manual dari "Pilih dari Katalog" / chip rekomendasi, cukup lebih cepat.
 * Exact match tetap auto-pilih LANGSUNG tanpa konfirmasi (aman, tidak ambigu).
 * TIDAK menimpa pilihan yang sudah ada (kalau `servisCatalogPartId` sudah ada
 * value, dibiarkan -- user yang pegang kendali penuh begitu sudah pernah pilih/
 * ganti manual). Ambigu (2+ part nama sama persis) -> tidak auto-pilih, biar user
 * pilih sendiri lewat dropdown/chip (juga tidak dilanjutkan ke partial match,
 * supaya tidak makin salah pilih dari nama yang sudah ambigu duluan).
 *
 * Sesi berikutnya (permintaan eksplisit user): kalau TIDAK ada exact match tunggal,
 * coba cari partial match (nama part memuat teks item, atau sebaliknya) sebagai
 * SARAN -- TIDAK auto-pilih langsung seperti exact match, karena partial match bisa
 * salah tebak part & stok bisa kepotong tidak diinginkan. Sebagai gantinya
 * ditampilkan lewat renderPartialCatalogMatch() (area konfirmasi terpisah, chip per
 * kandidat) -- part katalog HANYA terpilih (dan stok HANYA kepotong saat simpan)
 * setelah user tap salah satu chip confirmPartialCatalogMatch(). */
tryAutoLinkCatalogPart(item){
const sel=document.getElementById('servisCatalogPartId');
Servis.dismissPartialCatalogMatch();
if(!sel||!item)return;
if(sel.value)return;
const target=item.toLowerCase();
const opts=Array.from(sel.options||[]).filter(o=>o.value);
const exact=opts.filter(o=>(o.dataset.name||'').toLowerCase()===target);
if(exact.length===1){
sel.value=exact[0].value;
Servis.onCatalogPartChange();
return;
}
if(exact.length>1)return;
const partial=opts.filter(o=>{
const name=(o.dataset.name||'').toLowerCase();
if(!name)return false;
return name.includes(target)||target.includes(name);
});
if(partial.length)Servis.renderPartialCatalogMatch(partial);
},
/** Tampilkan chip konfirmasi untuk tiap kandidat partial match (lihat
 * tryAutoLinkCatalogPart()) di area `servisCatalogPartialWrap`. Murni render,
 * TIDAK mengubah `servisCatalogPartId` -- part baru terpilih setelah user tap
 * salah satu chip (lihat confirmPartialCatalogMatch()). */
renderPartialCatalogMatch(matches){
const wrap=document.getElementById('servisCatalogPartialWrap');
const list=document.getElementById('servisCatalogPartialList');
if(!wrap||!list)return;
list.innerHTML=matches.map(o=>`<button type="button" class="chip-btn" style="font-size:11px" data-action="Servis.confirmPartialCatalogMatch" data-args="${escapeHtml(JSON.stringify([o.value]))}">${escapeHtml(o.dataset.name||'(Tanpa nama)')}${o.dataset.oem?' · '+escapeHtml(o.dataset.oem):''}</button>`).join('');
wrap.classList.remove('u-dnone');
wrap.style.display='block';
},
/** User tap 1 chip kandidat partial match -> BARU di sini part katalog beneran
 * dipilihkan ke `servisCatalogPartId` (reuse onCatalogPartChange() apa adanya,
 * sama seperti exact match/chip rekomendasi) & area konfirmasi ditutup. Sebelum
 * ini dipanggil, TIDAK ada apa pun yang berubah di dropdown/stok -- exactly kenapa
 * partial match butuh langkah konfirmasi tambahan ini (beda dari exact match yang
 * auto-pilih langsung), supaya stok tidak salah kepotong dari tebakan yang keliru. */
confirmPartialCatalogMatch(catalogId){
const sel=document.getElementById('servisCatalogPartId');
if(!sel)return;
const hasOption=Array.from(sel.options||[]).some(o=>o.value===String(catalogId));
if(!hasOption)return;
sel.value=String(catalogId);
Servis.onCatalogPartChange();
Servis.dismissPartialCatalogMatch();
},
/** Tutup/kosongkan area konfirmasi partial match (dipanggil saat user tap
 * "Bukan ini, abaikan", saat re-run tryAutoLinkCatalogPart() dgn item baru, atau
 * kapan pun modal servis dibuka ulang) -- TIDAK menyentuh `servisCatalogPartId`. */
dismissPartialCatalogMatch(){
const wrap=document.getElementById('servisCatalogPartialWrap');
const list=document.getElementById('servisCatalogPartialList');
if(list)list.innerHTML='';
if(wrap){wrap.classList.add('u-dnone');wrap.style.display='none';}
},
openModal(editId,prefillItem){
Sparepart.populateDatalist();
Servis.editId=(typeof editId!=='undefined')?editId:null;
const isEdit=Servis.editId!==null;
document.getElementById('servisModalTitle').textContent=isEdit?'Edit Catatan Servis':'Catat Servis/Sparepart';
document.getElementById('servisDelBtn').style.display=isEdit?'flex':'none';
const servisAccEl=document.getElementById('servisAcc');
if(servisAccEl) servisAccEl.innerHTML=D.accounts.map(a=>`<option value="${a.id}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
const intervalEl=document.getElementById('servisInterval');
if(intervalEl)intervalEl.dataset.manual='0';
Servis.dismissPartialCatalogMatch();
if(isEdit){
const s=D.servisLogs.find(x=>x.id===Servis.editId);
if(!s)return;
document.getElementById('servisDate').value=s.date;
document.getElementById('servisItem').value=s.item;
document.getElementById('servisKm').value=s.km||'';
document.getElementById('servisCost').value=s.cost;
document.getElementById('servisNote').value=s.note||'';
if(servisAccEl&&s.accountId)servisAccEl.value=s.accountId;
Servis.populatePartSelect(s.usedPartId);
document.getElementById('servisPartQty').value=s.usedPartQty||1;
const catalogRefs=(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.getServisRefs==='function')?VehicleCatalogServisLink.getServisRefs(s.id):[];
const firstCatalogRef=catalogRefs&&catalogRefs[0];
Servis.populateCatalogPartSelect(firstCatalogRef?firstCatalogRef.catalogId:'');
document.getElementById('servisCatalogPartQty').value=firstCatalogRef?firstCatalogRef.qty:1;
Servis.renderCatalogRecommendations();
// BUGFIX (audit): sama seperti onItemAutofillInterval() -- fallback by-nama
// dulu polos & global, sekarang lewat resolveServisCatForVehicle() supaya
// prefill interval saat edit tidak ke-nyasar ke kategori privat kendaraan lain.
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||(typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(s.item,s.vehicleId||curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===s.item.toLowerCase()));
if(intervalEl)intervalEl.value=linkedCat?linkedCat.intervalKm:'';
Servis._photoDraft=(s.foto||[]).slice();
Servis._renderPhotoThumbs();
} else {
document.getElementById('servisDate').value=new Date().toISOString().split('T')[0];
['servisItem','servisCost','servisNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('servisKm').value=getVehicleKm(curVehicleId)||'';
if(intervalEl)intervalEl.value='';
Servis.populatePartSelect('');
document.getElementById('servisPartQty').value=1;
Servis.populateCatalogPartSelect('');
document.getElementById('servisCatalogPartQty').value=1;
Servis._photoDraft=[];
Servis._renderPhotoThumbs();
if(prefillItem){
document.getElementById('servisItem').value=prefillItem;
Servis.onItemAutofillInterval();
const matchStock=D.partsStock.find(p=>p.name.toLowerCase()===prefillItem.toLowerCase()||p.name.toLowerCase().includes(prefillItem.toLowerCase())||prefillItem.toLowerCase().includes(p.name.toLowerCase()));
if(matchStock)Servis.populatePartSelect(matchStock.id);
} else {
Servis.renderCatalogRecommendations();
}
}
openModal('servisModal');
},
revertStockUsage(partId,qty){
if(!partId||!qty)return;
const p=D.partsStock.find(x=>x.id===partId);
if(p)p.qty=(p.qty||0)+qty;
},
/** Cari 1 item Stok Sparepart (D.partsStock) yang `catalogId`-nya PERSIS
 * sama dengan part katalog terpilih di form Servis (Sesi 273, tindak
 * lanjut audit S272) — match presisi via ID, TIDAK terpengaruh user
 * mengedit nama baris stok lewat "Edit Stok Sparepart"
 * (Sparepart.saveStock() menjaga catalogId tetap utuh meski name
 * berubah). Dipakai LEBIH DULU di _saveInner() sebelum fallback ke
 * findMatchingStockByName(). */
findMatchingStockByCatalogId(catalogId){
if(!catalogId)return null;
return D.partsStock.find(p=>p.catalogId===catalogId)||null;
},
/** Cari 1 item Stok Sparepart (D.partsStock) yang namanya PERSIS sama
 * (case-insensitive) dengan nama part katalog terpilih — dipakai untuk
 * ikut mengurangi stok fisik saat part dari Vehicle Catalog dipakai di
 * servis (Tahap 7E-3). Exact match saja (bukan substring) supaya tidak
 * salah kurangi stok item yang mirip tapi beda.
 * Sesi 273: sekarang jadi FALLBACK saja (dipanggil hanya kalau
 * findMatchingStockByCatalogId() gagal) — untuk baris stok lama yang
 * dibuat sebelum bridge `catalogId` ada (Sesi 266) dan belum pernah
 * punya field itu. Lihat CHANGELOG.md § Sesi 272/273. */
findMatchingStockByName(name){
const n=(name||'').trim().toLowerCase();
if(!n)return null;
return D.partsStock.find(p=>p.name.trim().toLowerCase()===n)||null;
},
async applyStockUsage(partId,qty){
if(!partId||!qty)return true;
const p=D.partsStock.find(x=>x.id===partId);
if(!p)return true;
if(p.qty<qty){
if(!await askConfirm(`⚠️ Stok "${escapeHtml(p.name)}" cuma sisa ${p.qty}${p.unit?' '+p.unit:''}, dipakai ${qty}. Tetap lanjut & stok jadi minus?`,{danger:false,okText:'Ya, Lanjut'}))return false;
}
p.qty=(p.qty||0)-qty;
return true;
},
// ===== Foto Riwayat Servis (Sesi F1) =====
// Cakupan sengaja dipersempit ke: tambah/lihat/hapus foto di form Servis +
// simpan/muat dari D.servisLogs[].foto. TIDAK termasuk sesi ini (backlog
// Sesi F lanjutan): thumbnail/badge di daftar Riwayat Servis, kompresi
// gambar sebelum jadi dataURL, atau batas ukuran per-foto selain guard
// kasar di bawah. Field `foto` OPSIONAL & backward-compatible -- entry
// lama tanpa field ini tetap kebaca normal (fallback `s.foto||[]`).
pickPhoto(){
const el=document.getElementById('servisPhotoInput');
if(el)el.click();
},
addPhoto(event){
const files=event&&event.target&&event.target.files?Array.from(event.target.files):[];
if(event&&event.target)event.target.value='';
if(!files.length)return;
const MAX_PHOTOS=5;
const MAX_BYTES=5*1024*1024;
files.forEach(file=>{
if(!file||!file.type||!file.type.startsWith('image/')){toast('⚠️ File bukan gambar, dilewati');return;}
if(file.size>MAX_BYTES){toast(`⚠️ "${file.name}" terlalu besar (maks 5MB), dilewati`);return;}
if(Servis._photoDraft.length>=MAX_PHOTOS){toast(`⚠️ Maksimal ${MAX_PHOTOS} foto per catatan servis`);return;}
const reader=new FileReader();
reader.onload=()=>{
if(typeof reader.result==='string')Servis._photoDraft.push(reader.result);
Servis._renderPhotoThumbs();
};
reader.readAsDataURL(file);
});
},
removePhoto(idx){
Servis._photoDraft.splice(idx,1);
Servis._renderPhotoThumbs();
},
_renderPhotoThumbs(){
const wrap=document.getElementById('servisPhotoThumbs');
if(!wrap)return;
wrap.innerHTML=Servis._photoDraft.map((src,i)=>`<div style="position:relative;width:64px;height:64px"><img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border2)"><button type="button" data-action="Servis.removePhoto" data-args='[${i}]' aria-label="Hapus foto" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:var(--accent2);color:#fff;font-size:11px;line-height:20px;text-align:center;padding:0;cursor:pointer">✕</button></div>`).join('');
},
save(){return withSaveGuardAsync('servis','servisModal',Servis._saveInner);},
async _saveInner(){
const item=document.getElementById('servisItem').value.trim();
// BUGFIX (laporan user, Sesi 545): dulu `!cost` menolak simpan kalau Biaya
// diisi 0 (mis. servis gratis/klaim garansi) karena 0 falsy di JS -- field
// biaya jadi WAJIB diisi angka >0 padahal seharusnya boleh 0/kosong. Fix:
// treat kolom kosong sbg 0 (bukan wajib diisi), validasi eksplisit pakai
// isNaN() (nilai bukan angka valid) & cost<0 (negatif tidak masuk akal utk
// biaya) -- item (Jenis Servis) tetap wajib diisi, cuma Biaya yang
// sekarang boleh 0.
const costRaw=document.getElementById('servisCost').value.trim();
const cost=costRaw===''?0:parseFloat(costRaw);
if(!item||isNaN(cost)||cost<0){toast('⚠️ Lengkapi jenis servis (cek juga Biaya, harus 0 atau lebih)');return;}
// BUGFIX (audit): idem -- pencarian kategori by-nama saat SIMPAN servis
// sekarang scoped ke kendaraan aktif (curVehicleId) lewat
// resolveServisCatForVehicle(), supaya servis kendaraan B tidak ke-link ke
// kategori privat milik kendaraan A hanya karena nama item sama persis.
let matched=typeof resolveServisCatForVehicle==='function'?resolveServisCatForVehicle(item,curVehicleId):D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase());
const date=document.getElementById('servisDate').value;
const note=document.getElementById('servisNote').value;
const accId=document.getElementById('servisAcc')?document.getElementById('servisAcc').value:D.accounts[0]?.id;
const km=parseFloat(document.getElementById('servisKm').value)||null;
const intervalRaw=document.getElementById('servisInterval')?document.getElementById('servisInterval').value:'';
const intervalKm=intervalRaw?parseFloat(intervalRaw):null;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const noteFull=item+(veh?' - '+veh.name:'')+(note?' - '+note:'');
const usedPartId=document.getElementById('servisPartId')?document.getElementById('servisPartId').value:'';
const usedPartQty=usedPartId?(parseFloat(document.getElementById('servisPartQty').value)||0):0;
const catalogPartSelEl=document.getElementById('servisCatalogPartId');
const catalogPartId=catalogPartSelEl?catalogPartSelEl.value:'';
const catalogPartQty=catalogPartId?(parseFloat(document.getElementById('servisCatalogPartQty').value)||1):0;
// Sesi 180 (Tahap 6B2): snapshot ringan opsional {catalogPartId,catalogPartQty,
// catalogPartOemCode} langsung di D.servisLogs (pola sama usedPartId/usedPartQty
// di bawah) -- TIDAK menggantikan/mengubah mekanisme catalogPartRefs (Tahap 6
// Sesi 1, VehicleCatalogServisLink) yang tetap dipanggil apa adanya di bawah.
// catalogPartOemCode diambil dari atribut data-oem opsi terpilih (diisi
// populateCatalogPartSelect()) -- sinkron, TIDAK memanggil VehicleCatalog
// lagi di sini, supaya tidak dobel-sumber-kebenaran/dobel call IDB.
const catalogPartOemCode=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.oem||''):'';
const catalogPartName=(catalogPartId&&catalogPartSelEl&&catalogPartSelEl.selectedOptions&&catalogPartSelEl.selectedOptions[0]&&catalogPartSelEl.selectedOptions[0].dataset)?(catalogPartSelEl.selectedOptions[0].dataset.name||''):'';
// Sesi 273: catalogId dulu (match presisi, tahan terhadap rename baris
// stok manual), findMatchingStockByName() jadi fallback SAJA untuk baris
// stok lama yang belum pernah punya catalogId (dibuat sebelum Sesi 266).
const catalogStockMatch=catalogPartId?(Servis.findMatchingStockByCatalogId(catalogPartId)||Servis.findMatchingStockByName(catalogPartName)):null;
const catalogLinkedStockId=catalogStockMatch?catalogStockMatch.id:null;
const itemIsVehicleName=!!matchingVehicleName(item);
let catIdForLog=matched?matched.id:null;
let newCatCreated=false;
if(intervalKm&&intervalKm>0){
if(matched){
matched.intervalKm=intervalKm;
} else if(item&&!itemIsVehicleName){
const newCat={id:'sp_'+Date.now(),name:item,code:codeFromName(item),intervalKm};
D.sparepartCats.push(newCat);
matched=newCat;
catIdForLog=newCat.id;
newCatCreated=true;
}
}
if(Servis.editId!==null){
const s=D.servisLogs.find(x=>x.id===Servis.editId);
if(!s){toast('⚠️ Data tidak ditemukan');return;}
Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
if(usedPartId&&!await Servis.applyStockUsage(usedPartId,usedPartQty)){
await Servis.applyStockUsage(s.usedPartId,s.usedPartQty);
Servis.applyStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
return;
}
if(catalogLinkedStockId&&!await Servis.applyStockUsage(catalogLinkedStockId,catalogPartQty)){
// BUGFIX (audit S324): dulu baris di bawah ini malah applyStockUsage() lagi
// (dobel-potong stok usedPartId yang BARU SAJA sukses dipotong di atas),
// bukan revertStockUsage() -- dan restore usedPartId LAMA (s.usedPartId)
// tidak pernah dikembalikan sama sekali di jalur ini walau sudah di-revert
// duluan di awal fungsi. Fix: revert dulu potongan baru, baru restore yang lama.
if(usedPartId)Servis.revertStockUsage(usedPartId,usedPartQty);
Servis.applyStockUsage(s.usedPartId,s.usedPartQty);
Servis.applyStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
return;
}
if(intervalKm&&intervalKm>0&&!matched&&s.categoryId){
const linkedCat=D.sparepartCats.find(c=>c.id===s.categoryId);
if(linkedCat){linkedCat.intervalKm=intervalKm;catIdForLog=linkedCat.id;}
}
Object.assign(s,{date,item,categoryId:catIdForLog||s.categoryId,km,cost,note,accountId:accId,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null,foto:Servis._photoDraft.slice()});
if(s.txLinkId){
const tx=D.transactions.find(t=>t.id===s.txLinkId);
if(tx)Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
// BUGFIX (backlog v1644, gap sama sifatnya dgn markServiced() yg sudah
// diperbaiki -- jalur BERBEDA, submit modal servis biasa via edit): dulu
// TIDAK pernah emit "finance.updated" walau tx terkait barusan di-update
// di atas -- listener AI (apa pun yg subscribe "finance.updated") tidak
// pernah tahu ada perubahan transaksi servis dari modal ini. Pola sama
// persis _saveTxInner() (modules/finance/transaksi-b.js baris ~588) yg
// emit "finance.updated" di jalur create MAUPUN edit transaksi umum.
if(tx&&typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId:tx.id,category:tx.category,type:'expense',amount:cost,kind:'servis'});
}
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
VehicleCatalogServisLink.attachToServis(s.id,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);
}
save();closeModal('servisModal');renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();Sparepart.renderCatList();toast('✅ Catatan servis diperbarui'+(intervalKm?' & interval pengingat disinkron':''));
return;
}
if(usedPartId&&!await Servis.applyStockUsage(usedPartId,usedPartQty))return;
if(catalogLinkedStockId&&!await Servis.applyStockUsage(catalogLinkedStockId,catalogPartQty)){
// BUGFIX (audit S324): dulu applyStockUsage() lagi di sini (dobel-potong
// stok usedPartId yang barusan sukses dipotong 1 baris di atas) padahal
// seharusnya revertStockUsage() -- catatan servis ini batal disimpan
// (return di bawah), jadi potongan usedPartId di atas harus dikembalikan.
if(usedPartId)Servis.revertStockUsage(usedPartId,usedPartQty);
return;
}
const servisId=uid();
const txId=uid();
const txCat=resolveVehicleTxCategory(veh);
D.transactions.push({id:txId,type:'expense',amount:cost,category:txCat,subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:servisId});
D.servisLogs.push({id:servisId,vehicleId:curVehicleId,date,item,categoryId:catIdForLog,km,cost,note,accountId:accId,txLinkId:txId,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null,foto:Servis._photoDraft.slice()});
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
VehicleCatalogServisLink.attachToServis(servisId,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);
}
// BUGFIX (backlog v1644): jalur BUAT BARU servis dari modal biasa (beda dari
// markServiced() yg sudah diperbaiki sesi lalu) juga TIDAK PERNAH emit
// "finance.updated" walau D.transactions.push() barusan terjadi persis di
// atas -- listener AI tidak pernah tahu ada transaksi servis baru dari
// modal ini. Emit di sini, SELALU (bukan cuma cost>0) krn transaksi di sini
// memang SELALU dibuat apa pun nilai cost-nya (beda dgn markServiced() yg
// cuma bikin tx kalau cost>0) -- pola sama _saveTxInner() (transaksi-b.js
// baris ~588) yg juga emit tanpa syarat amount setelah tx tersimpan.
if(typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId,category:txCat,type:'expense',amount:cost,kind:'servis'});
save();closeModal('servisModal');renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();Sparepart.renderCatList();
if(newCatCreated){
toast(`✅ Catatan servis tersimpan, "${item}" ditambahkan ke Pengingat Servis (tiap ${intervalKm.toLocaleString('id-ID')} km)`);
} else if(matched&&intervalKm){
toast('✅ Catatan servis tersimpan & interval pengingat disinkron');
} else if(itemIsVehicleName){
toast(`✅ Catatan servis tersimpan. (Catatan: "${item}" adalah nama kendaraan, jadi tidak dibuatkan kategori pengingat — isi jenis servisnya, mis. "Ganti Oli", di kolom Jenis Servis/Item)`,4500);
} else if(!matched&&item){
setTimeout(async()=>{
if(await askConfirm(`"${item}" belum ada di daftar pengingat servis. Tambahkan sebagai kategori pengingat baru sekarang?`,{danger:false,okText:'Ya, Tambahkan',icon:'🔔'})){
const interval=await showPromptModal({title:'Interval Servis',message:'Interval servis untuk "'+item+'" (KM):',icon:'🔧',inputType:'number',defaultValue:3000});
const n=parseFloat(interval);
if(n&&n>0){
const newCat={id:'sp_'+Date.now(),name:item,code:codeFromName(item),intervalKm:n};
D.sparepartCats.push(newCat);
const s2=D.servisLogs.find(x=>x.id===servisId);
if(s2)s2.categoryId=newCat.id;
save();Sparepart.renderCatList();Servis.renderList();toast('✅ Kategori pengingat ditambahkan');
}
}
},150);
} else {
toast('✅ Catatan servis tersimpan & tersinkron ke Keuangan');
}
},
deleteFromModal(){if(Servis.editId===null)return;const id=Servis.editId;closeModal('servisModal');Servis.del(id);},
async del(id){
if(!await askConfirm('Hapus catatan ini? Catatan keuangan terkait juga akan dihapus.'))return;
const s=D.servisLogs.find(x=>x.id===id);
if(s&&s.txLinkId)D.transactions=D.transactions.filter(tx=>tx.id!==s.txLinkId);
if(s&&s.usedPartId)Servis.revertStockUsage(s.usedPartId,s.usedPartQty);
if(s&&s.catalogPartLinkedStockId)Servis.revertStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
// Sesi E2 (auto-potong stok saat "ganti"): kalau entry ini dulu ikut
// motong stok otomatis lewat _findAutoGantiStock() (lihat markServiced()),
// kembalikan qty-nya juga saat catatan dihapus -- pola sama persis
// usedPartId/catalogPartLinkedStockId di atas, biar stok tidak nyangkut.
if(s&&s.autoGantiStockId)Servis.revertStockUsage(s.autoGantiStockId,1);
D.servisLogs=D.servisLogs.filter(s=>s.id!==id);
save();renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();toast('🗑 Catatan servis dihapus');
},
// markServiced(catId, actionType) — actionType FITUR BARU (opsional, backward
// compatible; PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2a/§6-poin1):
// dulu cuma dipanggil markServiced(catId) dari tombol "✅ Sudah Servis" di
// kartu Pengingat Servis (renderReminder(), tetap 1-arg, tidak berubah).
// Disiapkan supaya checklist servis (rencana Sesi 2 -- lihat dokumen §2d)
// bisa REUSE fungsi ini apa adanya + kirim actionType ('periksa'/'bersih'/
// 'ganti'), bukan bikin jalur simpan sendiri (0 logic duplikat, kartu
// reminder & stok otomatis ikut ter-update). actionType kosong/undefined =
// persis perilaku lama (disimpan sbg null, diperlakukan 'ganti' oleh
// getLastServiceKmForCat/getLastServiceDateForCat, lihat §2a).
// markServiced(catId, actionType, opts) — opts FITUR BARU (Sesi E1,
// ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 1): opsional,
// backward compatible -- dipanggil markServiced(catId) atau
// markServiced(catId,actionType) spt sebelumnya = 0 perubahan perilaku.
// Tujuan opts: kasih fondasi supaya checklist multi-item (rencana Sesi
// 1C/2A, belum ada kodenya) bisa nanti REUSE fungsi ini per-item lewat
// markServicedBatch() di bawah, tanpa jalur simpan duplikat.
//   opts.skipConfirm    — lewati askConfirm() (dipakai batch: 1 konfirmasi
//                          di pemanggil, bukan per-item)
//   opts.skipEarlyGuard — (Sesi E5, sebelumnya placeholder di E1) lewati
//                          guard "ganti terlalu dini" (lihat
//                          `_checkTooEarlyGanti()` di bawah) -- dipakai
//                          `markServicedBatch()` supaya batch tetap "1
//                          konfirmasi total", bukan 1 dialog guard per item.
//                          Independen dari opts.skipConfirm (2 knob
//                          terpisah, sesuai desain E1).
//   opts.presetCost     — angka biaya yg sudah diketahui pemanggil, lewati
//                          showPromptModal() (dipakai batch: 1 prompt total
//                          di pemanggil kalau perlu, atau 0 kalau memang
//                          mau 0 tanpa tanya)
//   opts.batchId        — (Sesi E3, sebelumnya placeholder di E1) ID batch
//                          yang sama utk seluruh item dari 1x pemanggilan
//                          markServicedBatch(), disimpan sbg entry.batchId
//                          di D.servisLogs & ditandai "🔗 batch" di riwayat
//                          (Servis.renderList()) -- 0 efek kalau dipanggil
//                          langsung tanpa lewat markServicedBatch() (opts
//                          kosong = batchId null, sama spt sebelum Sesi E3).
// Sesi E4 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 4
// "default cost per actionType"): kalau opts.presetCost TIDAK diisi DAN
// actionType eksplisit 'periksa' atau 'bersih' (bukan 'ganti', bukan
// kosong/undefined), cost otomatis 0 TANPA showPromptModal() -- alasan:
// item "periksa"/"bersih" biasanya tidak ada biaya (cuma cek/lap), jadi
// prompt biaya cuma gesekan tambahan. actionType 'ganti' atau kosong
// (tombol "✅ Sudah Servis" lama di kartu Pengingat Servis, SELALU
// dipanggil tanpa actionType) TETAP prompt seperti biasa -- 0 regresi ke
// jalur lama. opts.presetCost (dipakai markServicedBatch()) tetap prioritas
// PALING TINGGI di atas default actionType ini, tidak berubah dari E1.
// _findAutoGantiStock(cat, vehicleId) — BARU (Sesi E2, ROADMAP-KONSOLIDASI-
// DATABASE-SERVIS-v2.md §7 Sesi E item 2 "auto-potong stok saat ganti").
// Cari 1 kandidat Stok Sparepart (D.partsStock) yang cocok kategori (catId
// sama persis dgn kategori pengingat yg ditandai) DAN kendaraan (lewat
// Sparepart.isPartForVehicle(), fungsi yg SUDAH ADA & dipakai dropdown
// "Gunakan Stok Sparepart" -- 0 skema baru, reuse logic vehicle-scoping yg
// sudah teruji). SENGAJA hanya auto-potong kalau PERSIS 1 kandidat cocok
// -- 0 kandidat (tidak ada stok utk kategori ini) atau >1 kandidat
// (ambigu, mis. ada 2 baris "Oli Mesin" beda merek) DILEWATI (return null,
// tidak menebak) supaya tidak salah motong stok yang salah. Ini FINDER
// murni (0 efek samping, 0 tulis D) -- pemotongan qty dilakukan terpisah
// oleh pemanggil (lihat markServiced() di bawah).
_findAutoGantiStock(cat,vehicleId){
if(!cat||!Array.isArray(D.partsStock))return null;
const candidates=D.partsStock.filter(p=>p.catId===cat.id&&(typeof Sparepart!=='undefined'&&typeof Sparepart.isPartForVehicle==='function'?Sparepart.isPartForVehicle(p,vehicleId):true));
return candidates.length===1?candidates[0]:null;
},
// _checkTooEarlyGanti(cat, vehicleId, curKm) — BARU (Sesi E5, ROADMAP-
// KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi E item 5 "guard 'ganti terlalu
// dini'"). FINDER murni (0 efek samping, 0 tulis D) -- cari log "ganti"
// TERAKHIR utk kategori+kendaraan ini (reuse getLastServiceKmForCat() apa
// adanya dgn actionTypeFilter:'ganti', SAMA fungsi yg sudah dipakai basis
// reset pengingat -- 0 logic baca log duplikat), lalu bandingkan jarak KM
// yg sudah ditempuh sejak itu dgn ambang batas 20% dari intervalKm
// kategori. Kalau jarak tempuh < ambang (mis. interval 3000km, ambang
// 600km, baru jalan 300km sejak ganti terakhir) -> dianggap "terlalu
// dini", return detail supaya pemanggil bisa tanya konfirmasi tambahan.
// SENGAJA return null (tidak menganggap dini) kalau: kategori tidak
// punya intervalKm valid, belum pernah ada log "ganti" sebelumnya
// (lastKm null -- servis pertama kali, wajar), atau odometer curKm <
// lastKm (data KM tidak konsisten/mundur -- tidak ditebak, biar tidak
// salah blokir gara2 data aneh, bukan tanggung jawab guard ini).
_checkTooEarlyGanti(cat,vehicleId,curKm){
if(!cat||!cat.intervalKm||cat.intervalKm<=0)return null;
const lastKm=Servis.getLastServiceKmForCat(vehicleId,cat,'ganti');
if(lastKm===null||lastKm===undefined)return null;
const traveled=curKm-lastKm;
if(traveled<0)return null;
const thresholdKm=cat.intervalKm*0.2;
if(traveled>=thresholdKm)return null;
return{lastKm,traveled,intervalKm:cat.intervalKm,thresholdKm};
},
async markServiced(catId,actionType,opts){
opts=opts||{};
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;
const curKm=getVehicleKm(curVehicleId);
const actLabel=actionType==='periksa'?'diperiksa':(actionType==='bersih'?'dibersihkan':'diservis');
// willReset — HANYA relevan utk pola 4/periksa-conditional (§2c): kalau
// item ini punya gantiResetsInterval:false & yg ditandai actionType
// 'ganti', reset TIDAK terjadi (basis jatuh-tempo tetap dari log
// 'periksa') -- teks konfirmasi/toast disesuaikan supaya user tidak
// dikasih janji palsu "pengingat direset" padahal tidak.
const willReset=!(cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&(actionType||'ganti')==='ganti');
// Sesi E5 (guard "ganti terlalu dini"): HANYA saat actionType eksplisit
// 'ganti' (bukan kosong/'periksa'/'bersih' -- checklist lama/tombol
// "✅ Sudah Servis" tanpa actionType TIDAK pernah masuk cabang ini, 0
// regresi) DAN opts.skipEarlyGuard tidak di-set. Dialog guard ini TERPISAH
// dari konfirmasi utama di bawah (independen dari opts.skipConfirm) --
// kalau user batal di sini, fungsi berhenti SEBELUM konfirmasi utama
// ditampilkan (0 dialog dobel utk kasus batal).
if(actionType==='ganti'&&!opts.skipEarlyGuard){
const early=Servis._checkTooEarlyGanti(cat,curVehicleId,curKm);
if(early){
const earlyMsg=`⚠️ "${cat.name}" baru diganti ${early.traveled.toLocaleString('id-ID')} km lalu (interval ${early.intervalKm.toLocaleString('id-ID')} km) -- kelihatannya masih terlalu dini. Tetap tandai ganti sekarang?`;
if(!await askConfirm(earlyMsg,{danger:true,okText:'Ya, Tetap Ganti',icon:'⚠️'}))return;
}
}
if(!opts.skipConfirm){
const confirmMsg=`Tandai "${cat.name}" sudah ${actLabel} hari ini di KM ${curKm.toLocaleString('id-ID')}?`+(willReset?' Pengingat akan otomatis reset ke KM ini.':' (Item ini basis jatuh-temponya dari "periksa" -- catatan "ganti" ini TIDAK mereset pengingat.)');
if(!await askConfirm(confirmMsg,{danger:false,okText:'Ya, Tandai',icon:'✅'}))return;
}
let cost;
if(opts.presetCost!==undefined&&opts.presetCost!==null){
cost=parseFloat(opts.presetCost)||0;
}else if(actionType==='periksa'||actionType==='bersih'){
// Sesi E4: default cost per actionType -- periksa/bersih auto 0, 0 prompt.
cost=0;
}else{
const costStr=await showPromptModal({title:'Biaya Servis',message:'Biaya servis ini (opsional, boleh dikosongkan/0):',icon:'💵',inputType:'number',defaultValue:0});
cost=parseFloat(costStr)||0;
}
const date=new Date().toISOString().split('T')[0];
const accId=D.accounts[0]?.id;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const servisId=uid();
const entry={id:servisId,vehicleId:curVehicleId,date,item:cat.name,categoryId:cat.id,km:curKm,cost,note:'Ditandai selesai dari Pengingat Servis',accountId:accId,txLinkId:null,actionType:actionType||null,batchId:opts.batchId||null};
if(cost>0){
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:cat.name+(veh?' - '+veh.name:'')+' (tandai selesai)',date,servisLinkId:servisId});
entry.txLinkId=txId;
}
D.servisLogs.push(entry);
// Sesi E2 (auto-potong stok saat "ganti"): HANYA saat actionType eksplisit
// 'ganti' (bukan actionType kosong/'periksa'/'bersih') -- 0 dampak ke
// tombol "✅ Sudah Servis" lama di kartu Pengingat Servis (dipanggil tanpa
// actionType sama sekali, jadi tidak pernah masuk cabang ini, 0 regresi).
// Auto-potong 1 qty SAJA kalau stok cukup (qty>=1) -- kalau stok
// tidak cukup/0, DILEWATI DIAM-DIAM (bukan nge-prompt konfirmasi minus
// spt applyStockUsage() manual) krn ini aksi otomatis di balik tombol
// "tandai selesai", bukan input eksplisit user pilih part -- munculin
// dialog konfirmasi tak terduga di sini (apalagi saat dipanggil dari
// markServicedBatch() dgn skipConfirm) akan mengejutkan/menghalangi user.
let autoGantiStock=null;
if(actionType==='ganti'){
autoGantiStock=Servis._findAutoGantiStock(cat,curVehicleId);
if(autoGantiStock&&(autoGantiStock.qty||0)>=1){
autoGantiStock.qty=autoGantiStock.qty-1;
entry.autoGantiStockId=autoGantiStock.id;
}else{
autoGantiStock=null;
}
}
save();renderCnTab();renderDashboard();renderKeuangan();
// BUGFIX (audit "✅ Sudah Servis" tidak emit AIBus event): markServiced() menulis
// langsung ke D.servisLogs/D.transactions tanpa lewat saveServis() (sparepart-servis-b.js)
// -- alur submit modal servis biasa emit AIBus 'vehicle.updated' lewat wrapper itu, tapi
// jalur cepat ini (tombol di kartu Pengingat Servis) TIDAK, jadi listener AI (mis. audit
// overdue servis) tidak pernah tahu ada servis baru kalau user cuma tap tombol ini.
// Fix: emit event yang sama di titik ini, sama persis polanya dgn saveServis() utk
// 'vehicle.updated' (selalu) & pola BBM (car-notes.js baris ~180) utk 'finance.updated'
// (cuma kalau benar ada transaksi baru yg tercatat, yaitu saat cost>0/txLinkId terisi).
if(typeof AIBus!=="undefined")AIBus.emit("vehicle.updated",{kind:"servis"});
if(entry.txLinkId&&typeof AIBus!=="undefined")AIBus.emit("finance.updated",{txId:entry.txLinkId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'servis'});
if(autoGantiStock&&typeof Sparepart!=='undefined'&&typeof Sparepart.renderStockList==='function')Sparepart.renderStockList();
if(!opts.skipConfirm)toast(`✅ ${cat.name} ditandai ${actLabel}, `+(willReset?'pengingat direset ke KM sekarang':'tercatat (pengingat tidak berubah)')+(autoGantiStock?` (stok "${autoGantiStock.name}" otomatis dipotong 1)`:''));
return entry;
},
// markServicedBatch(items) — BARU (Sesi E1). items: array of
// {catId, actionType, cost}. REUSE markServiced() apa adanya per item
// (0 logic simpan duplikat) dgn opts.skipConfirm:true (1 konfirmasi di
// pemanggil nanti, bukan per-item) & opts.presetCost (dari `cost` per
// item kalau diisi, kalau tidak diisi tetap 0 tanpa prompt -- checklist
// multi-item belum ada UI-nya, jadi fondasi ini sengaja tidak nge-prompt
// per-item, itu akan bikin batch >1 item butuh N kali showPromptModal).
// opts.skipEarlyGuard:true (Sesi E5) juga selalu di-set -- guard "ganti
// terlalu dini" per-item akan bertentangan dgn prinsip "1 konfirmasi
// total" batch ini (sama alasannya dgn skipConfirm).
// Fondasi ini disiapkan utk checklist multi-item (rencana Sesi 1C/2A,
// belum ada kodenya) -- dipakai apa adanya begitu checklist dibangun.
async markServicedBatch(items){
if(!Array.isArray(items)||!items.length)return[];
// Sesi E3: 1 batchId (uid()) DIBAGI ke seluruh item dari 1x pemanggilan
// ini -- dipakai buat nandain "🔗 batch" di riwayat (Servis.renderList())
// supaya user bisa lihat item mana saja yang ditandai selesai bersamaan.
const batchId=uid();
const results=[];
for(const it of items){
const entry=await Servis.markServiced(it.catId,it.actionType,{skipConfirm:true,skipEarlyGuard:true,presetCost:it.cost!==undefined?it.cost:0,batchId});
if(entry)results.push(entry);
}
toast(`✅ ${results.length} item servis ditandai selesai`);
return results;
},
// getLastServiceKmForCat(vehicleId, cat, actionTypeFilter, forReminder) —
// actionTypeFilter & forReminder FITUR BARU (opsional, backward compatible;
// PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md §2c). Dipanggil TANPA 2 param
// baru ini (mis. dari riwayat/servisList) = 0 perubahan perilaku lama.
// Delegasi filter ke Servis._matchesActionTypeForReset() di bawah supaya
// logic-nya persis 1 tempat (twin di modules/vehicle/sparepart-servis.js
// getLastServiceDateForCat() punya salinan yang HARUS tetap identik).
getLastServiceKmForCat(vehicleId,cat,actionTypeFilter,forReminder){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km&&servisLogMatchesCat(s,cat)&&Servis._matchesActionTypeForReset(s,cat,actionTypeFilter,forReminder))
.sort((a,b)=>new Date(b.date)-new Date(a.date)||b.km-a.km);
return logs.length?logs[0].km:null;
},
// _matchesActionTypeForReset(log, cat, actionTypeFilter, forReminder) — lihat
// dokumentasi lengkap di twin-nya modules/vehicle/sparepart-servis.js
// (matchesActionTypeForReset(), top-level function, dipakai getLastServiceDateForCat()
// di file itu). Duplikasi SENGAJA (bukan reuse cross-file) krn file ini
// (car-notes.js) dimuat SEBELUM sparepart-servis.js di build.js & beberapa
// test harness (mis. sparepart-interval-bulan.test.js) memuat sparepart-servis.js
// TANPA car-notes.js sama sekali -- kalau salah satu diubah, cek ulang yang lain.
_matchesActionTypeForReset(log,cat,actionTypeFilter,forReminder){
const effType=log.actionType||'ganti';
if(forReminder&&cat&&cat.actionMode==='periksa-conditional'&&cat.gantiResetsInterval===false&&effType==='ganti')return false;
if(!actionTypeFilter)return true;
return effType===actionTypeFilter;
},
editSparepartFromReminder(catId){
const idx=D.sparepartCats.findIndex(c=>c.id===catId);
if(idx<0){toast('⚠️ Kategori sparepart tidak ditemukan');return;}
Sparepart.openCatModal(idx);
},
renderReminder(){
const card=document.getElementById('servisReminderCard');
if(!card)return;
const curKm=getVehicleKm(curVehicleId);
const kmPerDay=estimateKmPerDay(curVehicleId);
// Sesi 295 (bugfix "Pengingat Servis" kebanjiran kategori sampah): dulu SEMUA
// D.sparepartCats ditampilkan tanpa filter -- termasuk kategori yg auto-dibuat
// syncPartsStockFromCatalog() (tx-stok-sparepart.js) saat scan Katalog Suku
// Cadang, yg sengaja diberi intervalKm:0 & showInReminder:false karena itu
// cuma kategori PENGELOMPOKAN STOK, bukan jadwal servis. Tanpa filter ini,
// kategori spt "E-2 Cylinder Head Cover" (dari scan torsi/katalog) numpuk di
// Pengingat dgn "Interval 0 km" & selalu "Lewat" (0-jarakTempuh selalu <=0).
// Filter: hanya kategori dgn interval valid (>0) DAN belum ditandai
// disembunyikan manual dari 🔧 Kelola Kategori (lihat renderCatList()).
// S622 (permintaan user: pengingat servis per part/kategori/stok sparepart
// harus sendiri-sendiri per kendaraan): tambah filter catVisibleForVehicle()
// (modules/vehicle/sparepart-servis.js) -- kategori khusus kendaraan LAIN
// (cat.vehicleId terisi tapi beda dari curVehicleId) tidak lagi ikut numpuk
// di kartu Pengingat Servis kendaraan ini. Kategori universal (vehicleId
// kosong, mayoritas data lama) tetap tampil di semua kendaraan (fail-open,
// 0 data lama berubah perilaku).
const remindableCats=D.sparepartCats.filter(c=>c.intervalKm>0&&c.showInReminder!==false&&catVisibleForVehicle(c,curVehicleId));
if(!remindableCats.length){
const hiddenCount=D.sparepartCats.length-remindableCats.length;
card.innerHTML='<div class="card-title">🔔 Pengingat Servis</div><div class="empty"><div class="empty-text">'+(hiddenCount?'Belum ada kategori dgn interval servis aktif. '+hiddenCount+' kategori lain disembunyikan/belum diatur intervalnya — atur di 🔧 Kelola Kategori Sparepart.':'Belum ada kategori sparepart. Atur di Pengaturan.')+'</div></div>';
return;
}
const rows=remindableCats.map(cat=>{
const lastKm=Servis.getLastServiceKmForCat(curVehicleId,cat);
const intervalKm=getEffectiveIntervalKm(curVehicleId,cat);
const overridden=hasIntervalOverride(curVehicleId,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;
// FITUR BARU (Interval Waktu): 100% reuse computeServiceUrgency()
// (modules/vehicle/sparepart-servis.js) -- SATU-SATUNYA titik hitung
// status/sisa yg sadar 2 sumbu (km & bulan opsional per kategori). sisa/pct/
// col/msg/severity di bawah TETAP dihitung dari sisaKm (utk progress bar &
// label km yg sudah ada, 0 perubahan tampilan lama), cuma status
// 'lewat'/'segera' (severity) skrg ikut u.status supaya axis bulan yg lebih
// mendesak (mis. Minyak Rem sudah >6 bln walau km masih jauh) TETAP kebaca.
const u=(typeof computeServiceUrgency==='function')?computeServiceUrgency({vehicleId:curVehicleId,cat,curKm,kmPerDay}):null;
const sisa=intervalKm-jarakTempuh;
const pct=Math.min(100,Math.max(0,Math.round((jarakTempuh/intervalKm)*100)));
const status=u?u.status:(sisa<=0?'lewat':(sisa<=intervalKm*0.15?'segera':'aman'));
let col='green',msg=`Sisa ${sisa.toLocaleString('id-ID')} km`,severity=null;
if(status==='lewat'){col='red';msg=`⚠️ Lewat ${Math.abs(sisa).toLocaleString('id-ID')} km`;severity='overdue';}
else if(status==='segera'){col='orange';msg=`🔔 Sisa ${sisa.toLocaleString('id-ID')} km`;severity='due-soon';}
// bulanNote — tampilkan sisa bulan cuma kalau kategori ini PUNYA
// intervalBulan diatur DAN itu axis yg lebih mendesak (u.limitingAxis==='bulan'),
// supaya tidak menambah noise di kategori pure-km (mayoritas data existing).
const bulanNote=(u&&u.intervalBulan&&u.limitingAxis==='bulan')
?(u.sisaBulan<=0?` · ⚠️ lewat ${Math.abs(Math.round(u.sisaBulan))} bln`:` · sisa ~${Math.round(u.sisaBulan)} bln`)
:'';
const estDateISO=estimateServiceDateISO(sisa,kmPerDay);
const estLabel=(estDateISO?` · ~${fmtDateID(estDateISO)}`:'')+bulanNote;
// FITUR BARU (audit, gap "reminder tidak nyambung ke VehicleActionRecommendation"):
// 100% reuse VehicleActionRecommendation.actionFor() (vehicle-action-recommendation.js,
// Sesi 82) -- TIDAK menghitung ulang severity apa pun, cuma numpang teks aksi
// konkret yang sudah ada utk severity 'overdue'/'due-soon' yang SAMA PERSIS
// dgn yang dipakai VehicleAlertPanel/VehicleInsightFeed di Dashboard. Guard
// typeof spy tetap aman kalau file itu belum termuat (mis. test terisolasi).
const action=(severity&&typeof VehicleActionRecommendation!=='undefined')?VehicleActionRecommendation.actionFor({type:'service',severity}).label:null;
return{cat,lastKm,intervalKm,overridden,sisa,pct,col,msg,estLabel,action};
}).sort((a,b)=>a.sisa-b.sisa);
card.innerHTML=`<div class="card-title">🔔 Pengingat Servis per Part <span class="card-collapse-toggle" id="servisReminderCard-chev" data-action="toggleCardCollapse" data-args='["servisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="servisReminderCard-cbody">`+(kmPerDay?`<div class="u-fs11 u-t2 u-mb10">📊 Estimasi tanggal dihitung dari rata-rata pemakaian ~${kmPerDay.toFixed(1)} km/hari (histori Catatan KM & BBM).</div>`:'')+rows.map(r=>`
      <div class="u-mb12">
        <div class="u-flex u-jcb u-aic u-fs12 u-mb4 u-pointer" data-action="editSparepartFromReminder" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Tap untuk edit kategori (berlaku semua kendaraan)">
          <span class="u-fw700">${escapeHtml(r.cat.name)} <span class="u-fs11 u-t2">✏️</span></span>
          <span class="${r.col} u-fw700">${r.msg}${r.estLabel}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill ${r.col}" style="width:${r.pct}%"></div></div>
        ${r.action?`<div class="u-fs11 u-fw700 u-cacc" style="margin-top:2px">👉 ${escapeHtml(r.action)}</div>`:''}
        <div class="u-flex u-jcb u-aic" style="margin-top:3px">
          <div class="u-fs12t2">${r.lastKm===null?'Belum pernah dicatat':'Terakhir di '+r.lastKm.toLocaleString('id-ID')+' km'} · <span data-action="editVehicleIntervalOverride" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Set interval khusus kendaraan ini" class="u-pointer">Interval ${r.intervalKm.toLocaleString('id-ID')} km${r.overridden?' <span class="u-cacc u-fw700">(khusus)</span>':''} 🔧</span></div>
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="markSparepartServiced" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}">✅ Sudah Servis</button>
        </div>
      </div>`).join('')+`</div>`;
applyOneCardCollapsePref('servisReminderCard');
},
loadMore(){Servis.listPage++;Servis.renderList();},
// setActionTypeFilter(type) — BARU (Sesi E6). Dipanggil dari klik chip
// filter (data-action="Servis.setActionTypeFilter"). type: null ("Semua")
// atau 'periksa'/'bersih'/'ganti'. Reset listPage ke 1 (pola sama BBM/
// Torsi.setCat()) supaya pagination tidak nyangkut di halaman lama saat
// filter berganti (bisa beda jumlah total item).
setActionTypeFilter(type){
Servis.activeActionTypeFilter=type||null;
Servis.listPage=1;
Servis.renderList();
},
// renderActionTypeChips(beforeEl) — BARU (Sesi E6). Chip row filter
// riwayat by actionType, DISISIPKAN lewat JS sebelum #servisList (bukan
// markup statis di index.html -- beda dgn Torsi.chips() yg pakai
// container #trsChipRow yang SUDAH ada di markup). Pola pembuatan elemen
// dinamis 1x (cek getElementById dulu, buat kalau belum ada) SAMA PERSIS
// dgn servisMoreWrap di bawah (renderList()), supaya tidak dobel-insert
// tiap kali renderList() dipanggil ulang.
renderActionTypeChips(beforeEl){
let row=document.getElementById('servisActionTypeChipRow');
if(!row){
row=document.createElement('div');
row.id='servisActionTypeChipRow';
row.className='u-flex u-fs12 u-mb10';
row.style.cssText='gap:6px;flex-wrap:wrap';
beforeEl.insertAdjacentElement('beforebegin',row);
}
const options=[{v:null,label:'🔍 Semua'},{v:'periksa',label:'🔍 Diperiksa'},{v:'bersih',label:'🧽 Dibersihkan'},{v:'ganti',label:'🔧 Diganti'}];
row.innerHTML=options.map(o=>`<div class="chip ${o.v===Servis.activeActionTypeFilter?'active':''}" data-action="Servis.setActionTypeFilter" data-args="${escapeHtml(JSON.stringify([o.v]))}">${o.label}</div>`).join('');
},
renderList(){
Servis.renderReminder();
// Sesi D-lanjutan5: baca preferensi filter tersimpan SEKALI per lifetime
// halaman, SEBELUM filterSig/logs dihitung di bawah -- supaya render
// pertama tab ini langsung mencerminkan pilihan filter sesi sebelumnya
// (pola sama persis Sparepart.renderCatList()).
Servis._loadMasterCategoryFilterPrefsOnce();
const {from,to}=getCnRange();
// filterSig -- Sesi D-lanjutan4: activeMasterCategoryFilter ditambahkan sbg
// komponen (pola sama persis penambahan activeActionTypeFilter di E6),
// supaya listPage ikut direset otomatis saat filter kategori master
// berganti (jumlah total item bisa beda).
const filterSig=curVehicleId+'|'+(+from)+'|'+(+to)+'|'+Servis.activeActionTypeFilter+'|'+Servis.activeMasterCategoryFilter;
if(filterSig!==Servis.lastFilterSig){Servis.listPage=1;Servis.lastFilterSig=filterSig;}
// Sesi D-lanjutan4: kondisi filter tambahan by kategori master, reuse
// resolveLogMasterCategoryId(s) apa adanya (0 logic classify baru).
// activeMasterCategoryFilter===null (default) = 0 perubahan hasil filter
// dari sebelum sesi ini -- 0 regresi, sama persis pola E6.
// Sesi D-lanjutan5: chip "❔ Belum Terklasifikasi" (UNCATEGORIZED_FILTER_ID)
// -- cocokkan entry yang resolveLogMasterCategoryId(s)-nya null (baik krn
// classify 0 keyword cocok, maupun krn 0 kategori yang bisa di-join sama
// sekali), BUKAN dibandingkan literal ke salah satu dari 13 id terkunci.
const isUncategorizedFilter=typeof UNCATEGORIZED_FILTER_ID!=='undefined'&&Servis.activeMasterCategoryFilter===UNCATEGORIZED_FILTER_ID;
const logs=D.servisLogs.filter(s=>s.vehicleId===curVehicleId&&new Date(s.date)>=from&&new Date(s.date)<=to&&(!Servis.activeActionTypeFilter||(s.actionType||'ganti')===Servis.activeActionTypeFilter)&&(!Servis.activeMasterCategoryFilter||(isUncategorizedFilter?Servis.resolveLogMasterCategoryId(s)==null:Servis.resolveLogMasterCategoryId(s)===Servis.activeMasterCategoryFilter))).sort((a,b)=>new Date(b.date)-new Date(a.date));
const totalCost=logs.reduce((s,x)=>s+(x.cost||0),0);
const lastKm=logs.reduce((m,x)=>x.km&&x.km>m?x.km:m,0);
document.getElementById('servisCount').textContent=logs.length;
document.getElementById('servisTotalCost').textContent=fmt(totalCost);
document.getElementById('servisLastKm').textContent=lastKm?lastKm.toLocaleString('id-ID')+' km':'-';
const el=document.getElementById('servisList');
Servis.renderActionTypeChips(el);
// renderMasterCategoryChips(el) -- Sesi D-lanjutan4. Dipanggil SETELAH
// renderActionTypeChips(el) (keduanya pakai insertAdjacentElement
// 'beforebegin' relatif ke el) supaya urutan tampil konsisten: chip
// actionType (E6) di atas, chip kategori master (sesi ini) di bawahnya,
// baru #servisList. Dipanggil sebelum cek logs.length supaya chip tetap
// tampil walau hasil filter 0 entry (user bisa ganti filter lagi), pola
// sama persis renderActionTypeChips(el) di atas.
Servis.renderMasterCategoryChips(el);
if(!logs.length){
// Sesi D-lanjutan4: pesan empty state dibedakan saat filter kategori
// master aktif & 0 match, supaya user tidak salah kira riwayat servis
// kendaraannya benar-benar kosong -- pola sama persis pembedaan pesan di
// Sparepart.renderCatList() (Sesi D-lanjutan3). Filter actionType/rentang
// tanggal 0 match tetap pakai pesan default lama (0 perubahan, di luar
// scope sesi ini).
const emptyText=Servis.activeMasterCategoryFilter?'Tidak ada catatan servis utk kategori master ini':'Belum ada catatan servis';
el.innerHTML=`<div class="empty"><div class="empty-icon">🔧</div><div class="empty-text">${emptyText}</div></div>`;
return;
}
const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);
const visible=logs.slice(0,visibleCount);
el.innerHTML=visible.map(s=>{
const part=s.usedPartId?D.partsStock.find(p=>p.id===s.usedPartId):null;
const partInfo=part?` · 📦 ${s.usedPartQty}${part.unit?' '+escapeHtml(part.unit):''} ${escapeHtml(part.name)}`:'';
// Sesi E3: tandai "🔗 batch" di riwayat kalau entry ini punya batchId
// (ditandai selesai bareng item lain lewat markServicedBatch()) -- 0
// dampak ke entry lama/single (batchId null/undefined = tidak ditandai).
const batchInfo=s.batchId?' · 🔗 batch':'';
// Sesi F2 (lanjutan F1, ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 Sesi
// F): badge jumlah foto di riwayat servis. Pola sama persis batchInfo di
// atas (string kosong kalau tidak ada field/tidak relevan, 0 dampak ke
// entry lama tanpa field `foto`). Thumbnail gambar & lightbox SENGAJA
// belum -- backlog langkah Sesi F berikutnya, badge teks dulu sesuai
// urutan risiko rendah -> tinggi.
const fotoInfo=s.foto&&s.foto.length?` · 📷 ${s.foto.length}`:'';
// Sesi F-lanjutan (backlog eksplisit Sesi F2, ROADMAP-KONSOLIDASI-DATABASE-
// SERVIS-v2.md §7 Sesi F): thumbnail gambar sungguhan di Riwayat Servis --
// <img> 38x38 (sama persis ukuran .tx-icon di styles.css) memakai
// s.foto[0] (foto PERTAMA saja, bukan galeri) sbg preview, ditaruh SETELAH
// tx-icon SEBELUM tx-info. 0 dampak ke entry tanpa foto (string kosong,
// markup tx-item persis sama seperti sebelumnya) -- pola sama persis
// fotoInfo (badge teks) di bawah: kondisional murni pada s.foto.length.
// Lightbox/viewer ukuran penuh & kompresi dataURL TETAP backlog terpisah
// (thumbnail 38x38 dari dataURL mentah aman utk ukuran preview kecil ini,
// beban/kompresi cuma relevan kalau dataURL asli dipakai ukuran penuh).
const fotoThumb=s.foto&&s.foto.length?`<img src="${s.foto[0]}" alt="" style="width:38px;height:38px;object-fit:cover;border-radius:var(--r-lg);border:1px solid var(--border2);flex-shrink:0">`:'';
return `<div class="tx-item u-pointer" data-action="openServisModal" data-args="${escapeHtml(JSON.stringify([s.id]))}"><div class="tx-icon u-bgaccsoft">🔧</div>${fotoThumb}<div class="tx-info"><div class="tx-name">${escapeHtml(s.item)}</div><div class="tx-meta">${s.date}${s.km?' · '+s.km.toLocaleString('id-ID')+' km':''} ${s.note?'· '+escapeHtml(s.note):''}${partInfo}${batchInfo}${fotoInfo}</div></div><div class="tx-amount red">${fmt(s.cost)}</div><button class="tx-del" data-stop="1" data-action="delServis" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
let servisMoreWrap=document.getElementById('servisListLoadMoreWrap');
if(!servisMoreWrap){
servisMoreWrap=document.createElement('div');
servisMoreWrap.id='servisListLoadMoreWrap';
servisMoreWrap.style.cssText='text-align:center;margin-top:10px';
servisMoreWrap.innerHTML='<button class="btn btn-ghost btn-sm" data-action="loadMoreServisList" aria-label="Tampilkan lebih banyak riwayat servis"></button>';
el.insertAdjacentElement('afterend',servisMoreWrap);
}
if(visibleCount<logs.length){
servisMoreWrap.style.display='block';
servisMoreWrap.querySelector('button').textContent=`⬇️ Tampilkan lebih banyak (${logs.length-visibleCount} lagi)`;
} else servisMoreWrap.style.display='none';
}
};
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Servis'][method]. `const Servis = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di fuel-modal.js (bug yang sama pernah terjadi &
// diperbaiki di sana). Tanpa baris ini, semua tombol data-action="Servis.xxx"
// (termasuk chip rekomendasi part) gagal diam-diam.
if (typeof Servis !== 'undefined') window.Servis = Servis;
const TORSI_STANDARD_CAT={cat:'Standar (Umum)', icon:'🔩', items:[
{name:'Baut hex 5 mm & mur', ulir:'5 mm', nm:5.2, kgf:0.5},
{name:'Baut hex 6 mm & mur (termasuk baut flens SH)', ulir:'6 mm', nm:10, kgf:1.0},
{name:'Baut hex 8 mm & mur', ulir:'8 mm', nm:22, kgf:2.2},
{name:'Baut hex 10 mm & mur', ulir:'10 mm', nm:34, kgf:3.5},
{name:'Baut hex 12 mm & mur', ulir:'12 mm', nm:54, kgf:5.5},
{name:'Sekrup 5 mm', ulir:'5 mm', nm:4.2, kgf:0.4},
{name:'Sekrup 6 mm', ulir:'6 mm', nm:9.0, kgf:0.9},
{name:'Baut flens 6 mm (termasuk NSHF) & mur', ulir:'6 mm', nm:12, kgf:1.2},
{name:'Baut & mur flens 8 mm', ulir:'8 mm', nm:27, kgf:2.8},
{name:'Baut & mur flens 10 mm', ulir:'10 mm', nm:39, kgf:4.0},
]};
const MY_WRENCH={brand:'MOLLAR',sku:'MLR-B11950',minNm:13.56,maxNm:108.48,minLbft:10,maxLbft:80,panjang:280};
const Torsi={
mode:'catalog', selected:null, activeCat:'Semua', extOpen:false,
pageMode:'normal', checked:{}, biaya:{}, cats:[TORSI_STANDARD_CAT], db:null,
// _selectedVehicleId — state in-memory murni (bukan field D baru), pola sama
// ShopKatalogDinamisPresenter._selectedVehicleId (lihat DESIGN dok. A.4.1).
// Default diisi curVehicleId tiap open(); dipakai toggleCheck()/updateBiaya()
// supaya baca/tulis lewat TorsiVehicleAPI, independen dari curVehicleId global.
_selectedVehicleId:null,
itemKey(cat,name){return cat+'|'+name;},
computeCats(){
const veh=D.vehicles.find(v=>v.id===curVehicleId);
this.db=veh?findTorsiDb(veh.name,veh.modelId):null;
this.cats=[TORSI_STANDARD_CAT,...(this.db?this.db.cats:[])];
},
renderSourceNote(){
const el=document.getElementById('trsSourceNote');
if(!el)return;
el.textContent='📘 Sumber: '+(this.db?this.db.sourceNote:'Torsi standar umum (baut/mur/sekrup standar Honda). Belum ada data referensi spesifik untuk model kendaraan ini.');
},
fmt(v){if(v===null||v===undefined||isNaN(v))return '–';return (Math.round(v*100)/100).toString();},
findStock(name){
const n=name.toLowerCase();
return D.partsStock.find(p=>p.name.toLowerCase()===n||p.name.toLowerCase().includes(n)||n.includes(p.name.toLowerCase()))||null;
},
loadPersisted(){
if(!D.torsiChecklist)D.torsiChecklist={};
const rec=D.torsiChecklist[curVehicleId];
this.checked=rec&&rec.checked?{...rec.checked}:{};
this.biaya=rec&&rec.biaya?{...rec.biaya}:{};
this.pageMode=(rec&&rec.pageMode)||'normal';
},
persist(){
if(!D.torsiChecklist)D.torsiChecklist={};
D.torsiChecklist[curVehicleId]={checked:this.checked,biaya:this.biaya,pageMode:this.pageMode};
save();
},
open(){
this.mode='catalog';this.selected=null;this.activeCat='Semua';this.extOpen=false;
// Default per A.4.1: mulai dari kendaraan aktif global tiap modal dibuka.
this._selectedVehicleId=curVehicleId;
this.loadPersisted();
this.computeCats();
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const km=getVehicleKm(curVehicleId)||0;
document.getElementById('trsVehChip').textContent=(veh?veh.emoji+' '+veh.name:'')+' · '+km.toLocaleString('id-ID')+' km';
this.renderVehicleSelect();
this.renderSourceNote();
document.getElementById('trsSearchInput').value='';
document.getElementById('trsManualTorsiInput').value='';
this.setCalcMode('catalog');
this.setPageMode(this.pageMode||'normal');
this.chips();
this.renderList();
openModal('torsiModal');
},
// renderVehicleSelect() — isi <select id="trsVehicleSelect"> dari
// TorsiVehicleAPI.daftarKendaraan() (lihat DESIGN dok. A.4). 100% reuse
// kontrak {ok,count,list} yang sudah dipakai ShopKatalogDinamisPresenter —
// tidak ada query/hitungan baru di sini, murni render pilihan.
renderVehicleSelect(){
const sel=document.getElementById('trsVehicleSelect');
if(!sel)return;
if(typeof TorsiVehicleAPI==='undefined'){sel.innerHTML='';return;}
const dk=TorsiVehicleAPI.daftarKendaraan();
if(!dk.ok||dk.count===0){sel.innerHTML='<option value="">— Belum ada kendaraan —</option>';return;}
if(!this._selectedVehicleId||!dk.list.some(v=>v.id===this._selectedVehicleId)){
this._selectedVehicleId=dk.list[0].id;
}
sel.innerHTML=dk.list.map(v=>`<option value="${escapeHtml(v.id)}"${v.id===this._selectedVehicleId?' selected':''}>${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
},
// onVehicleChange(el) — dipanggil dari onchange <select id="trsVehicleSelect">
// (lihat DESIGN dok. A.4.1). Ganti this._selectedVehicleId (in-memory saja,
// TIDAK menyentuh curVehicleId global maupun D — pola sama persis
// ShopKatalogDinamisPresenter.onVehicleChange()), lalu baca checklist
// kendaraan terpilih APA ADANYA lewat TorsiVehicleAPI.checklistUntuk()
// (read-only, 0 side-effect) & render ulang daftar part + trsVehChip.
// CATATAN: sengaja TIDAK memanggil this.setPageMode()/this.persist() di sini
// — keduanya menulis ke D.torsiChecklist[curVehicleId] (lihat persist()),
// bukan ke vehicleId yang baru dipilih; toggle UI mode diperbarui manual
// di bawah supaya tidak salah menulis ke kendaraan aktif global.
onVehicleChange(el){
const vehicleId=el&&el.value;
if(!vehicleId)return;
this._selectedVehicleId=vehicleId;
const res=TorsiVehicleAPI.checklistUntuk(vehicleId);
if(!res.ok){toast(res.reason||'Kendaraan tidak ditemukan');return;}
this.checked={...res.checked};
this.biaya={...res.biaya};
this.pageMode=res.pageMode;
document.getElementById('trsTopModeNormal').classList.toggle('active',this.pageMode==='normal');
document.getElementById('trsTopModeChecklist').classList.toggle('active',this.pageMode==='checklist');
document.getElementById('trsSummaryBar').classList.toggle('show',this.pageMode==='checklist');
const km=getVehicleKm(vehicleId)||0;
const veh=D.vehicles.find(v=>v.id===vehicleId);
document.getElementById('trsVehChip').textContent=(veh?veh.emoji+' '+veh.name:res.kendaraan.name)+' · '+km.toLocaleString('id-ID')+' km';
this.renderList();
this.updateSummary();
},
chips(){
const cats=['Semua',...this.cats.map(d=>d.cat)];
document.getElementById('trsChipRow').innerHTML=cats.map(c=>`<div class="trs-chip ${c===Torsi.activeCat?'active':''}" data-action="Torsi.setCat" data-args="${escapeHtml(JSON.stringify([c]))}">${c==='Semua'?'🔍 Semua':escapeHtml(c)}</div>`).join('');
},
setCat(c){this.activeCat=c;this.chips();this.renderList();},
setCalcMode(m){
this.mode=m;
document.getElementById('trsModeCatalog').classList.toggle('active',m==='catalog');
document.getElementById('trsModeManual').classList.toggle('active',m==='manual');
document.getElementById('trsManualInputWrap').style.display=m==='manual'?'block':'none';
if(m==='manual')this.onManualInput();else this.updateGauge();
},
onManualInput(){
const v=parseFloat(document.getElementById('trsManualTorsiInput').value);
document.getElementById('trsGaugePartName').textContent=isNaN(v)?'Masukkan nilai torsi (N·m)':'✍️ Input manual';
this.renderGaugeValues(isNaN(v)?null:v);
},
updateGauge(){
if(this.selected){
document.getElementById('trsGaugePartName').textContent='🔩 '+this.selected.name;
this.renderGaugeValues(this.selected.nm,this.selected.note);
} else {
document.getElementById('trsGaugePartName').textContent='Pilih sparepart di bawah ⤵️';
this.renderGaugeValues(null);
}
},
selectPart(catName,itemName){
let it=null;
const cat=this.cats.find(d=>d.cat===catName);
if(cat)it=cat.items.find(x=>x.name===itemName);
if(!it||it.noTorque)return;
this.selected=it;
this.setCalcMode('catalog');
document.getElementById('trsGaugePartName').textContent='🔩 '+it.name;
this.renderGaugeValues(it.nm,it.note);
toast('✅ Dimuat ke kalkulator: '+it.name);
document.querySelector('#torsiModal .modal').scrollTop=0;
},
renderGaugeValues(nm,note){
const gv=document.getElementById('trsGaugeVal'),sub=document.getElementById('trsGaugeSub');
if(nm===null||nm===undefined||isNaN(nm)){
gv.textContent='–';sub.textContent='';
['nm','kgf','lbft','lbin'].forEach(u=>document.getElementById('trsVal-'+u).textContent='–');
} else {
gv.textContent=nm;
sub.textContent=note==='oli'?'🛢️ Oleskan oli mesin pada ulir & permukaan duduk':(note==='new'?'🔒 Baut ALOC — wajib ganti baru setiap dilepas':'');
document.getElementById('trsVal-nm').textContent=this.fmt(nm);
document.getElementById('trsVal-kgf').textContent=this.fmt(nm/TORSI_NM_PER_KGF);
document.getElementById('trsVal-lbft').textContent=this.fmt(nm/TORSI_NM_PER_LBFT);
document.getElementById('trsVal-lbin').textContent=this.fmt(nm/TORSI_NM_PER_LBIN);
}
this.calcExt();
this.renderWrenchNote(nm);
},
renderWrenchNote(nm){
const el=document.getElementById('trsWrenchNote');
if(!el)return;
if(nm===null||nm===undefined||isNaN(nm)){el.innerHTML='';return;}
const lbft=nm/TORSI_NM_PER_LBFT;
const inRange=nm>=MY_WRENCH.minNm&&nm<=MY_WRENCH.maxNm;
const rangeColor=inRange?'var(--accent3)':'var(--accent2)';
const rangeIcon=inRange?'✅':'⚠️';
const rangeMsg=inRange?'Dalam jangkauan kunci kamu':(nm<MY_WRENCH.minNm?'Di bawah jangkauan minimum — kunci ini tidak akurat/tidak bisa disetel setipis ini':'Melebihi kapasitas maksimum kunci ini — jangan dipaksa, bisa merusak kunci/baut');
el.innerHTML=`<div class="u-r10 u-fs11 u-lh16" style="background:var(--surface3);border:1px solid var(--border2);padding:10px 12px">
      <div class="u-fw700 u-ctext u-mb2">🔧 Kunci kamu: ${MY_WRENCH.brand} ${MY_WRENCH.sku} (${MY_WRENCH.minNm}–${MY_WRENCH.maxNm} Nm / ${MY_WRENCH.minLbft}–${MY_WRENCH.maxLbft} lbf·ft, ${MY_WRENCH.panjang} mm)</div>
      <div style="color:${rangeColor};font-weight:700">${rangeIcon} ${rangeMsg}</div>
      <div class="u-t2 u-mt2">📏 Skala di batang kunci tercetak langsung dalam <b>N·m</b>, tiap kenaikan angka utama = 13,56 Nm. Target kamu: <b>${this.fmt(nm)} Nm</b> (≈ ${this.fmt(lbft)} lbf·ft).</div>
      ${inRange?this.scalePositionHtml(nm):''}
    </div>`;
},
scalePositionHtml(nm){
const marks=MY_WRENCH_SCALE;
const perTurn=marks[0].nm;
const perLine=perTurn/10;
let lowerIdx=0;
for(let i=0;i<marks.length;i++){ if(marks[i].nm<=nm+1e-9) lowerIdx=i; }
let lower=marks[lowerIdx];
let remainder=nm-lower.nm;
let linesRounded=Math.round(remainder/perLine);
const upperMark=marks[lowerIdx+1]||null;
if(linesRounded>=10 && upperMark){ lower=upperMark; linesRounded=0; }
const estimatedNm=lower.nm+linesRounded*perLine;
const overallFrac=(estimatedNm-MY_WRENCH.minNm)/(MY_WRENCH.maxNm-MY_WRENCH.minNm);
let posMsg;
if(linesRounded===0){
posMsg=`🎯 Sejajarkan garis paling atas gagang dengan angka <b>${this.fmt(lower.nm)}</b> di batang, angka <b>0</b> pada gagang tepat di garis vertikal batang. Tidak perlu maju garis sama sekali.`;
} else {
const prevLabel=Math.floor(linesRounded/2)*2;
const overShoot=linesRounded-prevLabel;
const nextLabel=prevLabel+2;
const stepDesc=overShoot===0?`tepat di angka <b>${prevLabel}</b>`:`melewati angka <b>${prevLabel}</b>, lalu berhenti <b>${overShoot} garis</b> setelahnya menuju angka <b>${nextLabel}</b>`;
posMsg=`🎯 Putar gagang sampai sejajar angka <b>${this.fmt(lower.nm)}</b> di batang (posisi gagang di 0). Lalu putar maju <b>${linesRounded} garis kecil</b> (${stepDesc}) di skala gagang.`;
}
return `<div class="u-mt8">
      <div class="u-t2 u-mb8">${posMsg}</div>
      <div class="u-t2 u-mb8">≈ Setelan kamu sekarang <b>${this.fmt(estimatedNm)} Nm</b> (target ${this.fmt(nm)} Nm, selisih ${this.fmt(Math.abs(estimatedNm-nm))} Nm — 1 garis = ${this.fmt(perLine)} Nm).</div>
      ${this.scaleSvgHtml(overallFrac)}
      ${this.thimbleSvgHtml(linesRounded+((remainder/perLine)-Math.round(remainder/perLine)))}
    </div>`;
},
thimbleSvgHtml(lineVal){
lineVal=Math.max(0,Math.min(9,lineVal));
const W=300,H=54,padL=20,padR=20,axisY=30;
const w=W-padL-padR;
let ticks='';
for(let i=0;i<=9;i++){
const x=padL+(i/9)*w;
const major=i%2===0;
ticks+=`<line x1="${x}" y1="${axisY-(major?9:5)}" x2="${x}" y2="${axisY}" stroke="var(--text3)" stroke-width="${major?1.4:1}"/>`;
if(major)ticks+=`<text x="${x}" y="${axisY-12}" font-size="9" font-family="'Space Grotesk',monospace" fill="var(--text2)" text-anchor="middle">${i}</text>`;
}
const px=padL+(lineVal/9)*w;
return `<svg class="u-w100 u-mt2" viewBox="0 0 ${W} ${H}" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
      <line x1="${padL}" y1="${axisY}" x2="${W-padR}" y2="${axisY}" stroke="var(--text3)" stroke-width="1"/>
      ${ticks}
      <polygon points="${px},${axisY+4} ${px-5},${axisY+13} ${px+5},${axisY+13}" fill="var(--accent)"/>
      <text x="${px}" y="${axisY+24}" font-size="9" font-family="'Space Grotesk',monospace" font-weight="700" fill="var(--accent)" text-anchor="middle">gagang</text>
    </svg>`;
},
scaleSvgHtml(frac){
frac=Math.max(0,Math.min(1,frac));
const W=300,H=98,padL=22,padR=22,railY=54,railH=16;
const railW=W-padL-padR;
const marks=MY_WRENCH_SCALE;
const collarCx=padL+frac*railW;
const collarW=34;
let ticks='';
marks.forEach((m,i)=>{
const x=padL+(i/(marks.length-1))*railW;
ticks+=`<line x1="${x}" y1="${railY-2}" x2="${x}" y2="${railY+railH+2}" stroke="var(--text3)" stroke-width="1"/>
        <text x="${x}" y="${railY-8}" font-size="9" font-family="'Space Grotesk',monospace" fill="var(--text2)" text-anchor="middle">${this.fmt(m.nm)}</text>`;
});
let hatch='';
for(let hx=-collarW/2+4;hx<collarW/2;hx+=5){
hatch+=`<line x1="${collarCx+hx}" y1="${railY-6}" x2="${collarCx+hx-6}" y2="${railY+railH+6}" stroke="rgba(0,0,0,0.35)" stroke-width="1.4"/>`;
}
return `<svg class="u-w100" viewBox="0 0 ${W} ${H}" style="height:auto;display:block" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trsRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d8d8de"/><stop offset="45%" stop-color="#8a8a92"/><stop offset="55%" stop-color="#8a8a92"/><stop offset="100%" stop-color="#c4c4cc"/>
        </linearGradient>
        <linearGradient id="trsCollar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9c9d2"/><stop offset="50%" stop-color="#e8e8ee"/><stop offset="100%" stop-color="#9d9da6"/>
        </linearGradient>
      </defs>
      <rect x="${padL}" y="${railY}" width="${railW}" height="${railH}" rx="3" fill="url(#trsRail)"/>
      ${ticks}
      <g>
        <rect x="${collarCx-collarW/2}" y="${railY-6}" width="${collarW}" height="${railH+12}" rx="4" fill="url(#trsCollar)" stroke="rgba(0,0,0,0.25)"/>
        <g style="clip-path:inset(0)">${hatch}</g>
        <line x1="${collarCx-collarW/2}" y1="${railY-10}" x2="${collarCx-collarW/2}" y2="${railY+railH+10}" stroke="var(--accent)" stroke-width="2.5"/>
      </g>
      <text x="${collarCx-collarW/2}" y="${railY+railH+24}" font-size="9.5" font-family="'Space Grotesk',monospace" font-weight="700" fill="var(--accent)" text-anchor="middle">▲ setel di sini</text>
    </svg>`;
},
// CATATAN (audit v1.0-stabilization): toggle ini SENGAJA tidak dipindah ke toggleCardCollapse()
// standar (modal-navigasi.js, dipakai ~40+ kartu dashboard/keuangan/dll). Alasan: (1) id elemen di
// sini (trsExtBody/trsExtChev) tidak ikuti skema key+'-cbody'/key+'-chev' yg dibutuhkan fungsi itu;
// (2) toggleCardCollapse() PERSIST status ke localStorage cardCollapsePrefs, sedangkan toggle ini
// murni state sementara helper input di dalam modal (direset ke tertutup tiap modal Torsi dibuka
// ulang, lihat this.extOpen di reset()) — mempersist status kolom "pakai ekstensi kunci" antar sesi
// bukan perilaku yg diinginkan utk field bantu ini. Class CSS (.card-collapse-toggle/.collapsed)
// tetap dipakai apa adanya krn itu memang milik sistem visual bersama, cuma jalur togglenya beda.
toggleExt(){
this.extOpen=!this.extOpen;
document.getElementById('trsExtBody').classList.toggle('collapsed');
document.getElementById('trsExtChev').classList.toggle('collapsed');
},
currentTargetNm(){
if(this.mode==='manual'){
const v=parseFloat(document.getElementById('trsManualTorsiInput').value);
return isNaN(v)?null:v;
}
return this.selected?this.selected.nm:null;
},
calcExt(){
const L=parseFloat(document.getElementById('trsExtL').value);
const A=parseFloat(document.getElementById('trsExtA').value);
const target=this.currentTargetNm();
const resWrap=document.getElementById('trsExtResult');
if(!L||!A||target===null){resWrap.style.display='none';return;}
const setting=target*L/(L+A);
resWrap.style.display='block';
document.getElementById('trsExtResultVal').textContent=this.fmt(setting)+' N·m';
document.getElementById('trsExtResultNote').textContent=`Target sebenarnya di baut tetap ${this.fmt(target)} N·m. Karena kunci diperpanjang jadi ${L+A} mm (asli ${L} mm + ekstensi ${A} mm), kunci di-set ke ${this.fmt(setting)} N·m supaya torsi yang sampai ke baut pas ${this.fmt(target)} N·m.`;
},
setPageMode(m){
this.pageMode=m;
document.getElementById('trsTopModeNormal').classList.toggle('active',m==='normal');
document.getElementById('trsTopModeChecklist').classList.toggle('active',m==='checklist');
document.getElementById('trsSummaryBar').classList.toggle('show',m==='checklist');
this.renderList();
this.updateSummary();
this.persist();
},
// toggleCheck()/updateBiaya() — refactor (lihat DESIGN dok. A.5): baca/tulis
// lewat TorsiVehicleAPI.setCheck() atas this._selectedVehicleId, bukan lagi
// this.persist() langsung ke D.torsiChecklist[curVehicleId]. Kontrak
// TorsiVehicleAPI & bentuk D.torsiChecklist tidak berubah (0 perubahan skema)
// — cuma titik tulisnya yang pindah, supaya field "Pilih Kendaraan" (sesi
// berikutnya) bisa cek/isi biaya kendaraan lain tanpa ganti curVehicleId
// global. Fallback ke curVehicleId kalau _selectedVehicleId belum diisi
// (mis. dipanggil di luar alur open() normal).
toggleCheck(key){
const vehicleId=this._selectedVehicleId||curVehicleId;
this.checked[key]=!this.checked[key];
this.renderList();
this.updateSummary();
TorsiVehicleAPI.setCheck(vehicleId,key,{checked:this.checked[key]});
},
updateBiaya(key,val){
const vehicleId=this._selectedVehicleId||curVehicleId;
this.biaya[key]=parseFloat(val)||0;
this.updateSummary();
TorsiVehicleAPI.setCheck(vehicleId,key,{biaya:this.biaya[key]});
},
updateSummary(){
let total=0,done=0,count=0;
this.cats.forEach(cat=>cat.items.forEach(it=>{
const key=this.itemKey(cat.cat,it.name);
count++;
if(this.checked[key]){done++;total+=(this.biaya[key]||0);}
}));
document.getElementById('trsSummaryProgress').textContent=done+'/'+count;
document.getElementById('trsSummaryProgressFill').style.width=count?Math.round(done/count*100)+'%':'0%';
document.getElementById('trsSummaryBiaya').textContent='Rp '+total.toLocaleString('id-ID');
},
catatServis(name){
closeModal('torsiModal');
setTimeout(()=>openServisModal(undefined,name),200);
},
goToStock(){
closeModal('torsiModal');
setTimeout(()=>{
const d=document.getElementById('cnStockDetails');
if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}
},250);
},
noteBadge(note){
if(note==='oli')return '<span class="trs-part-badge oil">🛢️ Oleskan oli</span>';
if(note==='new')return '<span class="trs-part-badge new">🔒 Ganti baru</span>';
return '';
},
renderList(){
const q=document.getElementById('trsSearchInput').value.trim().toLowerCase();
let cats=this.cats;
if(this.activeCat!=='Semua')cats=this.cats.filter(d=>d.cat===this.activeCat);
let html='';let totalShown=0;
cats.forEach((cat,ci)=>{
const items=cat.items.filter(it=>!q||it.name.toLowerCase().includes(q));
if(items.length===0)return;
totalShown+=items.length;
html+=`<div class="card" style="padding:8px 12px">
        <div class="trs-part-cat-head" data-action="Torsi.toggleCatCard" data-args='["$el"]'>
          <div class="trs-part-cat-head-left">
            <div class="trs-part-cat-icon">${cat.icon}</div>
            <div><div class="trs-part-cat-title">${escapeHtml(cat.cat)}</div><div class="trs-part-cat-count">${items.length} item</div></div>
          </div>
          <span class="trs-part-cat-chev open">▾</span>
        </div>
        <div class="card-collapse-body" style="padding-bottom:6px">
          ${items.map(it=>this.renderRow(cat.cat,it)).join('')}
        </div>
      </div>`;
});
if(totalShown===0)html=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Part tidak ditemukan. Coba kata kunci lain.</div></div>`;
document.getElementById('trsCatList').innerHTML=html;
},
toggleCatCard(headEl){
const body=headEl.parentElement.querySelector('.card-collapse-body');
const chev=headEl.querySelector('.trs-part-cat-chev');
body.classList.toggle('collapsed');
chev.classList.toggle('open');
},
renderRow(catName,it){
const key=this.itemKey(catName,it.name);
const checked=!!this.checked[key];
const biayaVal=this.biaya[key]||'';
const stockItem=this.findStock(it.name);
const torsiHtml=it.noTorque
?`<div class="trs-part-torsi"><div class="trs-part-torsi-nm u-fs11 u-ctext3">servis rutin</div></div>`
:`<div class="trs-part-torsi"><div class="trs-part-torsi-nm">${it.nm}</div><div class="trs-part-torsi-kgf">(${it.kgf} kgf·m)</div></div>`;
let extras='';
if(it.interval)extras+=`<div class="trs-tag-btn trs-tag-interval">🔁 ${escapeHtml(it.interval)}</div>`;
if(stockItem)extras+=`<div class="trs-tag-btn ${stockItem.qty>0?'stok-ok':'stok-low'}">📦 ${stockItem.qty>0?('Stok '+stockItem.qty+(stockItem.unit?' '+stockItem.unit:'')):'Stok habis'}</div>`;
extras+=`<div class="trs-tag-btn" data-stop="1" data-action="Torsi.catatServis" data-args="${escapeHtml(JSON.stringify([it.name]))}">🔧 Catat Servis</div>`;
const checkHtml=`<div class="trs-part-check ${this.pageMode==='checklist'?'show':''} ${checked?'checked':''}" data-stop="1" data-action="Torsi.toggleCheck" data-args="${escapeHtml(JSON.stringify([key]))}">${checked?'✓':''}</div>`;
let biayaHtml='';
if(it.consumable){
biayaHtml=`<div class="trs-biaya-wrap" data-stop="1" data-action="stopPropOnly"><span>💰 Rp</span><input type="number" inputmode="numeric" placeholder="estimasi" value="${biayaVal}" data-oninput="Torsi.updateBiaya" data-oninput-args='${escapeHtml(JSON.stringify([key,'$value']))}'></div>`;
}
return `<div class="trs-part-row" data-action="torsiSelectPartIfAllowed" data-args="${escapeHtml(JSON.stringify([!!it.noTorque,catName,it.name]))}">
      ${checkHtml}
      <div class="trs-part-info">
        <div class="trs-part-name">${escapeHtml(it.name)}</div>
        <div class="trs-part-meta"><span>⌀ ${escapeHtml(it.ulir)}</span>${it.note?('· '+this.noteBadge(it.note)):''}</div>
      </div>
      ${torsiHtml}
      <div class="trs-part-extra-row">${extras}</div>
      ${biayaHtml}
    </div>`;
}
};

// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Torsi'][method]. `const Torsi = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di fuel-modal.js (bug yang sama pernah terjadi &
// diperbaiki di sana). Tanpa baris ini, semua interaksi modal Kalkulator
// Torsi (pilih kategori, toggle checklist, mode kalkulator, dst) gagal
// diam-diam.
if (typeof Torsi !== 'undefined') window.Torsi = Torsi;
