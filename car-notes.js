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
} else {
document.getElementById('bbmDate').value=new Date().toISOString().split('T')[0];
['bbmLiter','bbmHarga','bbmCost','bbmSpbu','bbmNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('bbmKm').value=getVehicleKm(curVehicleId)||'';
document.getElementById('bbmFull').checked=true;
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
const result=recordBbmLog({
vehicleId:curVehicleId,date,km,liter,harga,cost,spbu,fullTank,note,accountId:accId,
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
const Servis={
editId:null,
listPage:1,
lastFilterSig:null,
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
const matched=item?D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase()):null;
intervalEl.value=matched?matched.intervalKm:'';
}
Servis.tryAutoLinkCatalogPart(item);
Servis.renderCatalogRecommendations();
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
const linkedCat=(s.categoryId&&D.sparepartCats.find(c=>c.id===s.categoryId))||D.sparepartCats.find(c=>c.name.toLowerCase()===s.item.toLowerCase());
if(intervalEl)intervalEl.value=linkedCat?linkedCat.intervalKm:'';
} else {
document.getElementById('servisDate').value=new Date().toISOString().split('T')[0];
['servisItem','servisCost','servisNote'].forEach(id=>document.getElementById(id).value='');
document.getElementById('servisKm').value=getVehicleKm(curVehicleId)||'';
if(intervalEl)intervalEl.value='';
Servis.populatePartSelect('');
document.getElementById('servisPartQty').value=1;
Servis.populateCatalogPartSelect('');
document.getElementById('servisCatalogPartQty').value=1;
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
save(){return withSaveGuardAsync('servis','servisModal',Servis._saveInner);},
async _saveInner(){
const item=document.getElementById('servisItem').value.trim();
const cost=parseFloat(document.getElementById('servisCost').value);
if(!item||!cost){toast('⚠️ Lengkapi jenis servis dan biaya');return;}
let matched=D.sparepartCats.find(c=>c.name.toLowerCase()===item.toLowerCase());
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
if(usedPartId)await Servis.applyStockUsage(usedPartId,usedPartQty);
Servis.applyStockUsage(s.catalogPartLinkedStockId,s.catalogPartQty);
return;
}
if(intervalKm&&intervalKm>0&&!matched&&s.categoryId){
const linkedCat=D.sparepartCats.find(c=>c.id===s.categoryId);
if(linkedCat){linkedCat.intervalKm=intervalKm;catIdForLog=linkedCat.id;}
}
Object.assign(s,{date,item,categoryId:catIdForLog||s.categoryId,km,cost,note,accountId:accId,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null});
if(s.txLinkId){
const tx=D.transactions.find(t=>t.id===s.txLinkId);
if(tx)Object.assign(tx,{amount:cost,date,accountId:accId,note:noteFull});
}
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
VehicleCatalogServisLink.attachToServis(s.id,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);
}
save();closeModal('servisModal');renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();Sparepart.renderCatList();toast('✅ Catatan servis diperbarui'+(intervalKm?' & interval pengingat disinkron':''));
return;
}
if(usedPartId&&!await Servis.applyStockUsage(usedPartId,usedPartQty))return;
if(catalogLinkedStockId&&!await Servis.applyStockUsage(catalogLinkedStockId,catalogPartQty)){
if(usedPartId)await Servis.applyStockUsage(usedPartId,usedPartQty);
return;
}
const servisId=uid();
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:noteFull,date,servisLinkId:servisId});
D.servisLogs.push({id:servisId,vehicleId:curVehicleId,date,item,categoryId:catIdForLog,km,cost,note,accountId:accId,txLinkId:txId,usedPartId:usedPartId||null,usedPartQty:usedPartId?usedPartQty:0,catalogPartId:catalogPartId||null,catalogPartQty:catalogPartId?catalogPartQty:0,catalogPartOemCode:catalogPartId?catalogPartOemCode:'',catalogPartLinkedStockId:catalogLinkedStockId||null});
if(typeof VehicleCatalogServisLink!=='undefined'&&VehicleCatalogServisLink&&typeof VehicleCatalogServisLink.attachToServis==='function'){
VehicleCatalogServisLink.attachToServis(servisId,catalogPartId?[{catalogId:catalogPartId,qty:catalogPartQty}]:[]);
}
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
D.servisLogs=D.servisLogs.filter(s=>s.id!==id);
save();renderCnTab();renderDashboard();renderKeuangan();Sparepart.renderStockList();toast('🗑 Catatan servis dihapus');
},
async markServiced(catId){
const cat=D.sparepartCats.find(c=>c.id===catId);
if(!cat)return;
const curKm=getVehicleKm(curVehicleId);
if(!await askConfirm(`Tandai "${cat.name}" sudah diservis hari ini di KM ${curKm.toLocaleString('id-ID')}? Pengingat akan otomatis reset ke KM ini.`,{danger:false,okText:'Ya, Tandai',icon:'✅'}))return;
const costStr=await showPromptModal({title:'Biaya Servis',message:'Biaya servis ini (opsional, boleh dikosongkan/0):',icon:'💵',inputType:'number',defaultValue:0});
const cost=parseFloat(costStr)||0;
const date=new Date().toISOString().split('T')[0];
const accId=D.accounts[0]?.id;
const veh=D.vehicles.find(v=>v.id===curVehicleId);
const servisId=uid();
const entry={id:servisId,vehicleId:curVehicleId,date,item:cat.name,categoryId:cat.id,km:curKm,cost,note:'Ditandai selesai dari Pengingat Servis',accountId:accId,txLinkId:null};
if(cost>0){
const txId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:cat.name+(veh?' - '+veh.name:'')+' (tandai selesai)',date,servisLinkId:servisId});
entry.txLinkId=txId;
}
D.servisLogs.push(entry);
save();renderCnTab();renderDashboard();renderKeuangan();toast(`✅ ${cat.name} ditandai selesai, pengingat direset ke KM sekarang`);
},
getLastServiceKmForCat(vehicleId,cat){
const logs=D.servisLogs.filter(s=>s.vehicleId===vehicleId&&s.km&&servisLogMatchesCat(s,cat))
.sort((a,b)=>new Date(b.date)-new Date(a.date)||b.km-a.km);
return logs.length?logs[0].km:null;
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
const remindableCats=D.sparepartCats.filter(c=>c.intervalKm>0&&c.showInReminder!==false);
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
const sisa=intervalKm-jarakTempuh;
const pct=Math.min(100,Math.max(0,Math.round((jarakTempuh/intervalKm)*100)));
let col='green',msg=`Sisa ${sisa.toLocaleString('id-ID')} km`;
if(sisa<=0){col='red';msg=`⚠️ Lewat ${Math.abs(sisa).toLocaleString('id-ID')} km`;}
else if(sisa<=intervalKm*0.15){col='orange';msg=`🔔 Sisa ${sisa.toLocaleString('id-ID')} km`;}
const estDateISO=estimateServiceDateISO(sisa,kmPerDay);
const estLabel=estDateISO?` · ~${fmtDateID(estDateISO)}`:'';
return{cat,lastKm,intervalKm,overridden,sisa,pct,col,msg,estLabel};
}).sort((a,b)=>a.sisa-b.sisa);
card.innerHTML=`<div class="card-title">🔔 Pengingat Servis per Part <span class="card-collapse-toggle" id="servisReminderCard-chev" data-action="toggleCardCollapse" data-args='["servisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="servisReminderCard-cbody">`+(kmPerDay?`<div class="u-fs11 u-t2 u-mb10">📊 Estimasi tanggal dihitung dari rata-rata pemakaian ~${kmPerDay.toFixed(1)} km/hari (histori Catatan KM & BBM).</div>`:'')+rows.map(r=>`
      <div class="u-mb12">
        <div class="u-flex u-jcb u-aic u-fs12 u-mb4 u-pointer" data-action="editSparepartFromReminder" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Tap untuk edit kategori (berlaku semua kendaraan)">
          <span class="u-fw700">${escapeHtml(r.cat.name)} <span class="u-fs11 u-t2">✏️</span></span>
          <span class="${r.col} u-fw700">${r.msg}${r.estLabel}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill ${r.col}" style="width:${r.pct}%"></div></div>
        <div class="u-flex u-jcb u-aic" style="margin-top:3px">
          <div class="u-fs12t2">${r.lastKm===null?'Belum pernah dicatat':'Terakhir di '+r.lastKm.toLocaleString('id-ID')+' km'} · <span data-action="editVehicleIntervalOverride" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}" title="Set interval khusus kendaraan ini" class="u-pointer">Interval ${r.intervalKm.toLocaleString('id-ID')} km${r.overridden?' <span class="u-cacc u-fw700">(khusus)</span>':''} 🔧</span></div>
          <button class="btn btn-ghost btn-sm u-fs12" style="padding:3px 10px" data-stop="1" data-action="markSparepartServiced" data-args="${escapeHtml(JSON.stringify([r.cat.id]))}">✅ Sudah Servis</button>
        </div>
      </div>`).join('')+`</div>`;
applyOneCardCollapsePref('servisReminderCard');
},
loadMore(){Servis.listPage++;Servis.renderList();},
renderList(){
Servis.renderReminder();
const {from,to}=getCnRange();
const filterSig=curVehicleId+'|'+(+from)+'|'+(+to);
if(filterSig!==Servis.lastFilterSig){Servis.listPage=1;Servis.lastFilterSig=filterSig;}
const logs=D.servisLogs.filter(s=>s.vehicleId===curVehicleId&&new Date(s.date)>=from&&new Date(s.date)<=to).sort((a,b)=>new Date(b.date)-new Date(a.date));
const totalCost=logs.reduce((s,x)=>s+(x.cost||0),0);
const lastKm=logs.reduce((m,x)=>x.km&&x.km>m?x.km:m,0);
document.getElementById('servisCount').textContent=logs.length;
document.getElementById('servisTotalCost').textContent=fmt(totalCost);
document.getElementById('servisLastKm').textContent=lastKm?lastKm.toLocaleString('id-ID')+' km':'-';
const el=document.getElementById('servisList');
if(!logs.length){el.innerHTML='<div class="empty"><div class="empty-icon">🔧</div><div class="empty-text">Belum ada catatan servis</div></div>';return;}
const visibleCount=Math.min(logs.length,Servis.listPage*TX_PAGE_SIZE);
const visible=logs.slice(0,visibleCount);
el.innerHTML=visible.map(s=>{
const part=s.usedPartId?D.partsStock.find(p=>p.id===s.usedPartId):null;
const partInfo=part?` · 📦 ${s.usedPartQty}${part.unit?' '+escapeHtml(part.unit):''} ${escapeHtml(part.name)}`:'';
return `<div class="tx-item u-pointer" data-action="openServisModal" data-args="${escapeHtml(JSON.stringify([s.id]))}"><div class="tx-icon u-bgaccsoft">🔧</div><div class="tx-info"><div class="tx-name">${escapeHtml(s.item)}</div><div class="tx-meta">${s.date}${s.km?' · '+s.km.toLocaleString('id-ID')+' km':''} ${s.note?'· '+escapeHtml(s.note):''}${partInfo}</div></div><div class="tx-amount red">${fmt(s.cost)}</div><button class="tx-del" data-stop="1" data-action="delServis" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button></div>`;
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
this.db=veh?findTorsiDb(veh.name):null;
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
biayaHtml=`<div class="trs-biaya-wrap" data-stop="1" data-action="stopPropOnly"><span>💰 Rp</span><input type="number" inputmode="numeric" placeholder="estimasi" value="${biayaVal}" oninput="Torsi.updateBiaya('${key.replace(/'/g,"\\'")}', this.value)"></div>`;
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
