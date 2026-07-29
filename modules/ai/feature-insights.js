// feature-insights.js — Kartu "💡 Insight ..." di PALING ATAS/dekat 7 fitur (Keuangan, Pajak &
// Dipindah ke modules/ai/feature-insights.js (Sesi 14 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Zakat, Piutang & Utang, Sewa Kios & Renovasi, Bisnis Shop, Car Notes, Dana Pendidikan), pola
// PERSIS SAMA dgn AssetInsight (lihat aset.js): read-only, tidak nyimpen state sendiri, cuma baca
// ulang D tiap dipanggil. Setiap modul punya compute() yang mengembalikan array item
// {id,level,icon,text,action?} — format SAMA PERSIS dgn item FinCoach (modules-calc.js), supaya
// bisa disinkronkan jadi SATU feed gabungan di widget "🩺 Insight Cepat" Dashboard (lihat
// FinCoach.compute()). render() menampilkan compute() sbg kartu ringkas di masing2 halaman, gaya
// visual sama dgn #assetInsightBody (baris icon+text, u-fs12/u-lh15/u-mb8), TANPA tombol
// dismiss/aksi (itu cuma ada di widget Dashboard).
//
// KeuanganInsight & PiutangUtangInsight KHUSUS: compute()-nya adalah SATU-SATUNYA sumber logic
// utk sinyal² yg dulu ditulis inline di FinCoach (defisit/anggaran/utang jatuh tempo) —
// FinCoach.compute() memanggil compute() modul ini langsung (bukan nulis ulang logicnya) supaya
// kartu di halaman fitur & widget "🩺 Insight Cepat" Dashboard 100% sinkron 1:1, tidak mungkin
// beda isi.
//
// Dipanggil dari render utama masing2 halaman/fitur supaya selalu sinkron tiap save/delete/import:
//   - KeuanganInsight.render()      <- renderKeuangan()    (modules-render.js)
//   - PajakInsight.render()         <- renderPajakZakat()   (modules-render.js)
//   - PiutangUtangInsight.render()  <- Piutang.renderList() & Debt.renderList() (piutang-utang.js)
//   - SewaKiosRenovInsight.render() <- SewaKios.render()    (sewakios.js) & Renov.render() (renovasi.js)
//   - ShopInsight.render()          <- Etalase.renderList()  (cobek-etalase.js)
//   - MobilInsight.render()         <- renderCnTab()         (modules-render.js)
//   - EduFundInsight.render()       <- EduFund.render()      (edukasi-dana.js)
const FeatureInsightUI={
// Render item {icon,text}[] ke dalam card+body dgn id tertentu, sembunyikan card kalau kosong
// TOTAL tidak ada data relevan (beda dgn "tidak ada insight" yg tetap tampil dgn pesan aman).
renderInto(cardId,bodyId,hasData,items,emptyMsg){
const card=document.getElementById(cardId);
const box=document.getElementById(bodyId);
if(!card||!box)return;
if(!hasData){card.classList.add('u-dnone');return;}
card.classList.remove('u-dnone');
box.innerHTML=items.length?items.map(x=>`<div class=\"u-fs12 u-lh15 u-mb8\">${x.icon} ${x.text}</div>`).join(''):`<div class=\"u-fs12 u-t2 u-lh15\">${emptyMsg}</div>`;
}
};

const KeuanganInsight={
// ctx (opsional) {now,m,y,txM,inc,exp} — dioper dari FinCoach.compute() (modules-calc.js) supaya
// txM/inc/exp yg sudah dihitung di sana (via renderDashboard()) tidak discan ulang 2x. Dipanggil
// tanpa ctx (dari render() di bawah / KeuanganInsight.compute() langsung) tetap hitung sendiri
// sbg fallback, sama seperti pola ctx di FinCoach — supaya modul ini bisa dipanggil independen.
compute(ctx){
const out=[];
const now=(ctx&&ctx.now)||new Date();
const m=(ctx&&ctx.m!=null)?ctx.m:now.getMonth();
const y=(ctx&&ctx.y!=null)?ctx.y:now.getFullYear();
const txM=(ctx&&ctx.txM)||(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const inc=(ctx&&ctx.inc!=null)?ctx.inc:txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=(ctx&&ctx.exp!=null)?ctx.exp:txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
// (1) Defisit bulan berjalan (pengeluaran > pemasukan bulan ini)
if(inc>0&&exp>inc){
out.push({id:'defisit',level:'danger',icon:'🔴',text:`Bulan ini pengeluaran (${fmtFull(exp)}) sudah melebihi pemasukan (${fmtFull(inc)}) — defisit ${fmtFull(exp-inc)}.`,action:{label:'Cek Laporan',page:'keuangan',navIdx:1}});
}
// (2) Anggaran paling parah (>=80% terpakai), ambil yang paling tinggi persennya
try{
if((D.budgets||[]).length){
const rows=D.budgets.map(b=>{
const used=(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&budgetMatchesTx(b,t);}).reduce((s,t)=>s+t.amount,0);
const pct=b.limit>0?Math.round(used/b.limit*100):0;
return{b,pct};
}).filter(r=>r.pct>=80).sort((a,b)=>b.pct-a.pct);
if(rows.length){
const r=rows[0],over=r.pct>=100;
out.push({id:'budget-'+r.b.id,level:over?'danger':'warning',icon:over?'🔴':'🟠',text:`Anggaran "${escapeHtml(r.b.name)}" sudah ${r.pct}% terpakai${over?' (OVER)':''}${rows.length>1?` (+${rows.length-1} anggaran lain juga ketat)`:''}.`,action:{label:'Lihat Anggaran',page:'keuangan',navIdx:1}});
}
}
}catch(e){console.warn('KeuanganInsight: gagal cek anggaran',e);}
return out;
},
// render(ctx) — ctx opsional {now,m,y,txM,inc,exp}, dioper dari renderKeuangan()
// (modules-render.js) KALAU bulan yg lagi dibuka user == bulan berjalan asli,
// supaya txM/inc/exp yg sudah dihitung di sana tidak discan ulang. Tanpa ctx
// (page lain sedang lihat bulan lampau/depan) tetap fallback hitung sendiri
// via compute() apa adanya — PERSIS perilaku lama, 0 perubahan hasil.
render(ctx){
const hasData=!!((D.transactions&&D.transactions.length)||(D.budgets&&D.budgets.length));
FeatureInsightUI.renderInto('keuanganInsightCard','keuanganInsightBody',hasData,KeuanganInsight.compute(ctx),'Belum ada insight khusus — kondisi keuangan kamu bulan ini terlihat aman.');
}
};

const PajakInsight={
compute(){
const out=[];
const pz=D.pajakZakat;
if(!pz)return out;
const now=new Date();
// (1) Zakat Penghasilan bulan ini sudah wajib (>= nisab) tapi belum dicatat dibayar bulan ini.
try{
const incomeBulan=(D.transactions||[]).filter(t=>t.type==='income'&&(()=>{const d=new Date(t.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})()).reduce((s,t)=>s+(t.amount||0),0);
const nisabBulan=pz.nisabPenghasilanBulan||0;
if(incomeBulan>0&&nisabBulan>0&&incomeBulan>=nisabBulan){
const sudahBayar=(pz.zakatLog||[]).some(l=>l.jenis==='penghasilan'&&(()=>{const d=new Date(l.tanggal);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})());
if(!sudahBayar){
const zakat=Math.round(incomeBulan*0.025);
out.push({id:'pajak-zakat-penghasilan',level:'info',icon:'🕌',text:`Pemasukan bulan ini (${fmtFull(incomeBulan)}) sudah di atas nisab — estimasi Zakat Penghasilan <b>${fmtFull(zakat)}</b>, belum dicatat dibayar bulan ini.`,action:{label:'Lihat Zakat',page:'pajak',navIdx:5}});
}
}
}catch(e){console.warn('PajakInsight: gagal cek zakat penghasilan',e);}
// (2) PBB terikat ke Tagihan & jatuh tempo dekat (<=30 hari)/lewat.
try{
const bill=(D.bills||[]).find(b=>b.pbbLink);
if(bill&&typeof daysUntilDate==='function'){
const d=daysUntilDate(bill.nextDue);
if(d!==null&&d<=30){
const late=d<0;
const kapan=late?`sudah lewat ${Math.abs(d)} hari dari jatuh tempo`:(d===0?'jatuh tempo hari ini':`jatuh tempo ${d} hari lagi`);
out.push({id:'pajak-pbb-due',level:late?'danger':'warning',icon:late?'🔴':'🟠',text:`PBB ${kapan} — estimasi ${fmtFull(bill.amount)}.`,action:{label:'Lihat PBB',page:'pajak',navIdx:5}});
}
}
}catch(e){console.warn('PajakInsight: gagal cek PBB',e);}
// (3) Zakat Maal sudah mencapai haul (≥354 hari) — siap dihitung & dicatat.
try{
if(pz.haulMaalMulai){
const mulai=new Date(pz.haulMaalMulai);
const hariBerjalan=Math.floor((now-mulai)/86400000);
if(hariBerjalan>=354){
out.push({id:'pajak-zakat-maal-haul',level:'info',icon:'🕌',text:`Zakat Maal sudah mencapai haul (≥354 hari sejak ${fmtDateID(pz.haulMaalMulai)}) — cek halaman Zakat Maal untuk hitung & catat kewajiban.`,action:{label:'Lihat Zakat Maal',page:'pajak',navIdx:5}});
}
}
}catch(e){console.warn('PajakInsight: gagal cek haul zakat maal',e);}
return out;
},
render(){
const hasData=!!(D.pajakZakat);
FeatureInsightUI.renderInto('pajakInsightCard','pajakInsightBody',hasData,PajakInsight.compute(),'Belum ada insight khusus — data pajak/zakat kamu sejauh ini terlihat wajar.');
}
};

const PiutangUtangInsight={
// DSR (Debt Service Ratio) dianggap berat kalau total cicilan/bulan sudah >=35% dari rata-rata
// pemasukan bulanan — ambang umum yg juga dipakai sbg rule of thumb perencanaan keuangan.
DSR_WARN_PCT:35,
compute(){
const out=[];
const now=new Date();
if(typeof daysUntilDate!=='function')return out;
// (1) Piutang jatuh tempo dekat (<=7 hari)/lewat, belum lunas — prioritas nagih.
// (Sesi 265, Ownership Sync — AI): TAMBAH filter isPiutangOwnershipSelf (0
// logic lama diubah), pola sama persis prodSelfFilter/cobSelfFilter di
// bawah — piutang ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY
// dikecualikan dari insight nagih. Guard typeof: fallback semua SELF.
try{
const piutangSelfFilter=typeof isPiutangOwnershipSelf==='function'?isPiutangOwnershipSelf:(()=>true);
(D.piutang||[]).filter(p=>!p.lunas&&p.jatuhTempo).filter(piutangSelfFilter).forEach(p=>{
const d=daysUntilDate(p.jatuhTempo);
if(d===null||d>7)return;
const late=d<0;
const kapan=late?`sudah lewat ${Math.abs(d)} hari dari`:(d===0?'jatuh tempo hari ini untuk':`jatuh tempo ${d} hari lagi untuk`);
out.push({id:'piutang-due-'+p.id,level:late?'danger':'warning',icon:late?'🔴':'🟠',text:`Piutang "${escapeHtml(p.name)}" (${fmtFull(p.nilai)}) ${kapan} ditagih.`,action:{label:'Lihat Piutang',page:'pajak',navIdx:5}});
});
}catch(e){console.warn('PiutangUtangInsight: gagal cek piutang',e);}
// (2) Utang jatuh tempo dekat (<=7 hari)/lewat, belum lunas — sama seperti FinCoach lama #6.
// KW-170: ikut cek cicilan barang aktif (Debt.billCicilanAktif(), sudah dianggap "utang beneran"
// di Buku Utang), digabung & diambil yang paling dekat jatuh temponya dari kedua sumber.
// (Sesi 265, Ownership Sync — AI): TAMBAH filter isDebtOwnershipSelf (0
// logic lama diubah) — utang non-SELF dikecualikan dari insight jatuh
// tempo. Guard typeof: fallback semua SELF.
try{
const debtSelfFilter=typeof isDebtOwnershipSelf==='function'?isDebtOwnershipSelf:(()=>true);
const soonDebt=(D.debts||[]).filter(d=>!d.lunas&&d.jatuhTempo).filter(debtSelfFilter).map(d=>({id:'debt-due-'+d.id,name:d.name,nilai:d.nilai,diff:daysUntilDate(d.jatuhTempo)}));
const billCicilan=(typeof Debt!=='undefined'&&typeof Debt.billCicilanAktif==='function')?Debt.billCicilanAktif():[];
const soonBill=billCicilan.filter(b=>b.nextDue).map(b=>({id:'debt-due-bill-'+b.id,name:b.name,nilai:b.amount,diff:daysUntilDate(b.nextDue)}));
const soon=soonDebt.concat(soonBill).filter(x=>x.diff!==null&&x.diff<=7).sort((a,b)=>a.diff-b.diff);
if(soon.length){
const x=soon[0],late=x.diff<0;
out.push({id:x.id,level:late?'danger':'warning',icon:late?'🔴':'🟠',text:`Utang "${escapeHtml(x.name)}" (${fmtFull(x.nilai)}) ${late?'sudah lewat '+Math.abs(x.diff)+' hari dari':x.diff===0?'jatuh tempo hari ini':x.diff+' hari lagi ke'} tanggal jatuh tempo.`,action:{label:'Lihat Utang',page:'pajak',navIdx:5}});
}
}catch(e){console.warn('PiutangUtangInsight: gagal cek utang',e);}
// (3) DSR (beban cicilan/bulan dibanding rata-rata pemasukan) sudah berat (>=35%).
try{
if(typeof DebtStrategy!=='undefined'&&typeof WorthIt!=='undefined'){
const dsr=DebtStrategy.computeDSR();
if(dsr.pct!=null&&dsr.pct>=PiutangUtangInsight.DSR_WARN_PCT){
out.push({id:'debt-dsr-tinggi',level:dsr.pct>=50?'danger':'warning',icon:dsr.pct>=50?'🔴':'🟠',text:`Beban cicilan bulanan (DSR) sudah ${Math.round(dsr.pct)}% dari rata-rata pemasukan (${fmtFull(dsr.totalCicilan)}/bln) — idealnya di bawah ${PiutangUtangInsight.DSR_WARN_PCT}%.`,action:{label:'Lihat Strategi Utang',page:'keuangan',navIdx:1}});
}
}
}catch(e){console.warn('PiutangUtangInsight: gagal cek DSR',e);}
return out;
},
render(){
const billCicilanCount=(typeof Debt!=='undefined'&&typeof Debt.billCicilanAktif==='function')?Debt.billCicilanAktif().length:0;
const hasData=!!((D.piutang&&D.piutang.length)||(D.debts&&D.debts.length)||billCicilanCount);
FeatureInsightUI.renderInto('piutangUtangInsightCard','piutangUtangInsightBody',hasData,PiutangUtangInsight.compute(),'Belum ada insight khusus — piutang & utang kamu sejauh ini aman.');
}
};

const ShopInsight={
// Ambang batas margin bulan ini dianggap turun signifikan dari bulan lalu (sama dgn FinCoach #8).
MARGIN_DROP_RATIO:0.75,
compute(){
const out=[];
// S260 (Business AI Ownership Sync): Shop AI Insight HANYA menghitung produk
// ownership SELF — reuse isProductOwnershipSelf() (SSOT, cobek-etalase.js),
// guard typeof biar aman kalau file itu belum dimuat (fallback anggap semua
// SELF), pola SAMA PERSIS cobSelfFilter/cobSelfFilter2 di bawah (S194, versi
// transaksi) & selfFilter di InventoryEngine/StockRekoWidget/PriceRekoWidget
// (S259/S260).
const prodSelfFilter=typeof isProductOwnershipSelf==='function'?isProductOwnershipSelf:(()=>true);
const products=(D.products||[]).filter(prodSelfFilter);
// (1) Stok menipis (<=2, sama dgn ambang badge "Menipis" di Etalase.renderList()).
const menipis=products.filter(p=>(p.stock||0)<=2);
if(menipis.length){
const contoh=menipis.slice(0,2).map(p=>escapeHtml(p.name)).join(', ');
out.push({id:'shop-stok-menipis',level:'warning',icon:'🟠',text:`${menipis.length} produk stoknya menipis (≤2)${menipis.length?': <b>'+contoh+'</b>'+(menipis.length>2?` +${menipis.length-2} lainnya`:''):''} — pertimbangkan restock.`,action:{label:'Lihat Shop',page:'shop',navIdx:2}});
}
// (2) Margin profit bulan ini turun jauh dari bulan lalu (min. 3 transaksi biar tidak false-positive).
try{
// Sesi 194 (Ownership Sync Shop): AI Insight margin Shop HANYA hitung
// transaksi ownership SELF (guard typeof biar aman kalau ownership-engine.js
// belum dimuat — fallback isCobekOwnershipSelf true).
const cobSelfFilter=typeof isCobekOwnershipSelf==='function'?isCobekOwnershipSelf:(()=>true);
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const cobek=D.cobek||[];
const cobThis=cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}).filter(cobSelfFilter);
const prevD=new Date(y,m-1,1);
const cobPrev=cobek.filter(t=>{const d=new Date(t.date);return d.getMonth()===prevD.getMonth()&&d.getFullYear()===prevD.getFullYear();}).filter(cobSelfFilter);
const marginOf=rows=>{const omzet=rows.reduce((s,t)=>s+(t.total||0),0);const profit=rows.reduce((s,t)=>s+(t.profit||0),0);return omzet>0?profit/omzet:null;};
const mThis=marginOf(cobThis),mPrev=marginOf(cobPrev);
if(mThis!=null&&mPrev!=null&&mPrev>0&&mThis<mPrev*ShopInsight.MARGIN_DROP_RATIO&&cobThis.length>=3){
out.push({id:'shop-margin',level:'warning',icon:'🟠',text:`Margin profit Shop bulan ini turun ke ${Math.round(mThis*100)}% (bulan lalu ${Math.round(mPrev*100)}%) — cek lagi harga modal/jual produk terbaru.`,action:{label:'Lihat Shop',page:'shop',navIdx:2}});
}
}catch(e){console.warn('ShopInsight: gagal cek margin',e);}
// (3) Produk terlaris bulan ini (penguat positif, bukan cuma peringatan).
try{
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
// Sesi 194 (Ownership Sync Shop): "Produk terlaris" HANYA hitung transaksi ownership SELF.
const cobSelfFilter2=typeof isCobekOwnershipSelf==='function'?isCobekOwnershipSelf:(()=>true);
const cobThis=(D.cobek||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}).filter(cobSelfFilter2);
if(cobThis.length>=3){
const perProduk={};
cobThis.forEach(t=>{(t.items||[]).forEach(it=>{const key=it.productId||it.name;if(!key)return;perProduk[key]=(perProduk[key]||{name:it.name,qty:0});perProduk[key].qty+=(it.qty||1);});});
const sorted=Object.values(perProduk).sort((a,b)=>b.qty-a.qty);
if(sorted.length){
out.push({id:'shop-terlaris',level:'good',icon:'🟢',text:`Produk terlaris bulan ini: <b>${escapeHtml(sorted[0].name)}</b> (${sorted[0].qty}x terjual).`});
}
}
}catch(e){console.warn('ShopInsight: gagal cek produk terlaris',e);}
// (4) Estimasi modal restock (S199, Finalisasi Integrasi Shop) — 100%
// reuse ShopBusinessEnginePresenter.summary().purchase (S198
// InventoryEngine.restockScan()+PurchaseEngine.estimatedCost()), 0 rumus
// baru di sini. Beda dari insight (1) di atas: (1) cuma menghitung JUMLAH
// produk stok menipis (ambang stock<=2), item ini menambahkan ESTIMASI
// MODAL (Rp) yang dibutuhkan utk restock semua produk yang direkomendasikan
// StockRekoWidget.scan() (bisa beda produk/ambang dari (1), krn StockRekoWidget
// juga mempertimbangkan histori penjualan/estimasi hari stok tersisa).
try{
if(typeof ShopBusinessEnginePresenter!=='undefined'){
const s=ShopBusinessEnginePresenter.summary();
if(s.purchase&&s.purchase.ok&&s.purchase.itemCount>0){
const money=typeof fmt==='function'?fmt:(n=>'Rp '+Math.round(n||0));
out.push({id:'shop-restock-modal',level:'warning',icon:'🟠',text:`${s.purchase.itemCount} produk direkomendasikan direstock — estimasi modal ${money(s.purchase.totalCost)}.`,action:{label:'Lihat Shop',page:'shop',navIdx:2}});
}
}
}catch(e){console.warn('ShopInsight: gagal cek estimasi modal restock',e);}
// (5) Rencana Pengiriman (S203, Delivery Plan UI) — 100% reuse
// TripEngine.weight()/volume() (S198, delegasi PERSIS ke
// weightCalculator()/volumeCalculator() cobek-etalase.js), TIDAK ada rumus
// baru di sini. Murni deteksi: ada produk dgn data berat/dimensi terisi
// (S203, field baru productModal) -> arahkan ke fitur baru itu.
try{
if(typeof TripEngine!=='undefined'){
const withDims=products.filter(p=>(p.beratPerUnit>0)||(p.panjang>0&&p.lebar>0&&p.tinggi>0));
if(withDims.length>0){
out.push({id:'shop-delivery-plan',level:'info',icon:'🚚',text:`${withDims.length} produk sudah punya data berat/dimensi — pakai 🚚 Rencana Pengiriman di form Transaksi Baru buat cek ongkir & kapasitas kendaraan sebelum kirim pesanan besar.`,action:{label:'Lihat Shop',page:'shop',navIdx:2}});
}
}
}catch(e){console.warn('ShopInsight: gagal cek rencana pengiriman',e);}
// (6) Margin Tipis Pengiriman (S204-A, Trip Presenter) — 100% reuse
// TripPresenter.summary() (agregasi field D.cobek yang sudah tersimpan:
// delivered/ongkir/marginPct + getAIDeliveryThinMarginThreshold() S9),
// TIDAK ada rumus baru di sini. Beda dari rule AI 'delivery-thin-margin'
// (AIDecision, per-transaksi saat save()): item ini ringkasan BULANAN di
// AI Insight Shop.
try{
if(typeof TripPresenter!=='undefined'){
const s=TripPresenter.summary();
if(s.ok&&s.thinMarginCount>0){
out.push({id:'shop-trip-thin-margin',level:'warning',icon:'🟠',text:`${s.thinMarginCount} dari ${s.trips} pengiriman bulan ini bermargin tipis (di bawah ${s.thinThreshold}%).`,action:{label:'Lihat Shop',page:'shop',navIdx:2}});
}
}
}catch(e){console.warn('ShopInsight: gagal cek margin tipis pengiriman',e);}
// (7) Business KPI Recommendation (S211-212, Business Flow KPI) — 100%
// reuse BusinessFlowPresenter.recommendation() (murni derived dari
// businessKPI()/flow()/purchaseStatus() yang sudah ada, S205-S211), TIDAK
// ada rumus baru di sini — cuma nyalurkan hasilnya ke feed AI Insight
// Shop supaya satu sumber angka sama dgn kartu Dashboard KPI.
try{
if(typeof BusinessFlowPresenter!=='undefined'){
BusinessFlowPresenter.recommendation().forEach(item=>out.push(item));
}
}catch(e){console.warn('ShopInsight: gagal cek business KPI recommendation',e);}
return out;
},
render(){
const hasData=!!((D.products&&D.products.length)||(D.cobek&&D.cobek.length));
FeatureInsightUI.renderInto('shopInsightCard','shopInsightBody',hasData,ShopInsight.compute(),'Belum ada insight khusus — data Shop kamu sejauh ini terlihat wajar.');
}
};

const MobilInsight={
compute(){
const out=[];
// Sesi 197 (Ownership Sync — Insight): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas D.vehicles (0 logic lama diubah) —
// kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan
// dari insight pajak kendaraan, pola sama persis isVehicleOwnershipSelf()
// di vehicle-core.js (Sesi 196). SIM (D.simList) TIDAK difilter — bukan
// entitas kendaraan, tidak punya konsep ownership.
const vehicles=(D.vehicles||[]).filter(v=>typeof isVehicleOwnershipSelf!=='function'||isVehicleOwnershipSelf(v.id));
if(typeof daysUntilDate!=='function')return out;
// (1) Pajak Kendaraan (STNK Tahunan/Ganti Plat 5th/Uji Kelayakan) jatuh tempo dekat/lewat.
vehicles.forEach(v=>{
Object.entries(VEHTAX_ITEMS||{}).forEach(([key,cfg])=>{
const d=daysUntilDate(v[cfg.tglKey]);
if(d===null)return;
if(d<=30){
const late=d<0;
const kapan=late?`sudah lewat ${Math.abs(d)} hari dari`:(d===0?'jatuh tempo hari ini untuk':`jatuh tempo ${d} hari lagi untuk`);
out.push({id:'mobil-tax-'+v.id+'-'+key,level:late?'danger':'warning',icon:late?'🔴':'🟠',text:`${cfg.label} ${escapeHtml(v.name)} ${kapan.includes('hari ini')?kapan:kapan+' tanggal jatuh tempo'}.`,action:{label:'Lihat Pajak Kendaraan',page:'carnotes',navIdx:4}});
}
});
});
// (2) SIM jatuh tempo dekat/lewat.
(D.simList||[]).forEach(s=>{
const d=daysUntilDate(s.tglAkhir);
if(d===null)return;
if(d<=30){
const late=d<0;
const kapan=late?`sudah lewat ${Math.abs(d)} hari dari masa berlaku`:(d===0?'jatuh tempo hari ini':`jatuh tempo ${d} hari lagi`);
out.push({id:'mobil-sim-'+s.id,level:late?'danger':'warning',icon:'🪪',text:`SIM ${escapeHtml(s.nama)} (${s.jenis}) ${kapan}.`,action:{label:'Lihat SIM',page:'carnotes',navIdx:4}});
}
});
return out;
},
render(){
const hasData=!!((D.vehicles&&D.vehicles.length));
FeatureInsightUI.renderInto('mobilInsightCard','mobilInsightBody',hasData,MobilInsight.compute(),'Belum ada insight khusus — pajak kendaraan & SIM kamu sejauh ini aman.');
}
};

const SewaKiosRenovInsight={
// Unit dianggap "kosong berkepanjangan" kalau sudah >=30 hari sejak terakhir masuk status 'kosong'.
KOSONG_LAMA_HARI:30,
// Proyek renovasi dianggap "mandek" kalau sudah >=60 hari sejak dibuat tapi masih ada sisa belum lunas.
RENOV_MANDEK_HARI:60,
compute(){
const out=[];
const now=new Date();
// (1) Unit kios kosong berkepanjangan (belum ada penyewa, sudah lama nganggur).
try{
(D.sewaKios&&D.sewaKios.units||[]).filter(u=>u.status==='kosong').forEach(u=>{
const log=(u.statusLog||[]).filter(l=>l.status==='kosong');
const sejak=log.length?log[log.length-1].tanggal:u.mulai;
if(!sejak)return;
const hari=Math.floor((now-new Date(sejak))/86400000);
if(hari>=SewaKiosRenovInsight.KOSONG_LAMA_HARI){
out.push({id:'sewakios-kosong-'+u.id,level:'warning',icon:'🟠',text:`Unit "${escapeHtml(u.name)}" sudah kosong ${hari} hari — pertimbangkan turunkan harga sewa atau promosikan lagi.`,action:{label:'Lihat Sewa Kios',page:'keuangan',navIdx:1}});
}
});
}catch(e){console.warn('SewaKiosRenovInsight: gagal cek unit kosong',e);}
// (2) Sewa yang akan jatuh tempo tagih dalam <=5 hari (sinkron dgn logic SewaKios.nextTagih()).
try{
if(typeof SewaKios!=='undefined'){
(D.sewaKios&&D.sewaKios.units||[]).forEach(u=>{
const nt=SewaKios.nextTagih(u);
if(!nt||nt.diffDays>5)return;
const late=nt.diffDays<0;
const kapan=late?`sudah lewat ${Math.abs(nt.diffDays)} hari dari`:(nt.diffDays===0?'jatuh tempo hari ini untuk':`jatuh tempo ${nt.diffDays} hari lagi untuk`);
out.push({id:'sewakios-tagih-'+u.id,level:late?'danger':'warning',icon:late?'🔴':'🔔',text:`Sewa unit "${escapeHtml(u.name)}"${u.penyewa?' ('+escapeHtml(u.penyewa)+')':''} ${kapan} penagihan bulan ini.`,action:{label:'Lihat Sewa Kios',page:'keuangan',navIdx:1}});
});
}
}catch(e){console.warn('SewaKiosRenovInsight: gagal cek tagihan sewa',e);}
// (3) Proyek renovasi mandek: sudah lama dibuat, masih ada sisa item belum lunas.
try{
if(typeof Renov!=='undefined'){
(D.renovProjects||[]).forEach(p=>{
const t=Renov.totals(p);
if(t.sisa<=0||!p.createdAt)return;
const hari=Math.floor((now-new Date(p.createdAt))/86400000);
if(hari>=SewaKiosRenovInsight.RENOV_MANDEK_HARI){
out.push({id:'renov-mandek-'+p.id,level:'info',icon:'🛠️',text:`Proyek renovasi "${escapeHtml(p.name)}" sudah ${hari} hari berjalan, masih sisa ${fmtFull(t.sisa)} (${t.paidCount}/${t.count} item lunas).`,action:{label:'Lihat Renovasi',page:'keuangan',navIdx:1}});
}
});
}
}catch(e){console.warn('SewaKiosRenovInsight: gagal cek proyek renovasi',e);}
return out;
},
render(){
const hasData=!!((D.sewaKios&&D.sewaKios.units&&D.sewaKios.units.length)||(D.renovProjects&&D.renovProjects.length));
FeatureInsightUI.renderInto('sewaKiosRenovInsightCard','sewaKiosRenovInsightBody',hasData,SewaKiosRenovInsight.compute(),'Belum ada insight khusus — Sewa Kios & Renovasi kamu sejauh ini aman.');
}
};

const EduFundInsight={
// Target dianggap "mepet" kalau tahun target tinggal <=2 tahun lagi tapi masih ada kekurangan dana.
MEPET_TAHUN:2,
compute(){
const out=[];
if(typeof EduFund==='undefined')return out;
(D.eduFunds||[]).forEach(f=>{
try{
const c=EduFund.calc(f);
if(c.kekurangan<=0)return; // sudah cukup/lebih, tidak perlu insight
if(c.n<=0){
out.push({id:'edufund-lewat-'+f.id,level:'danger',icon:'🔴',text:`Target dana pendidikan "${escapeHtml(f.name)}" tahun ${f.tahunTarget} sudah lewat/tahun ini — masih kurang ${fmtFull(c.kekurangan)}.`,action:{label:'Lihat Dana Pendidikan',page:'settings',navIdx:6}});
}else if(c.n<=EduFundInsight.MEPET_TAHUN){
out.push({id:'edufund-mepet-'+f.id,level:'warning',icon:'🟠',text:`Target dana pendidikan "${escapeHtml(f.name)}" tinggal ${c.n} tahun lagi, masih kurang ${fmtFull(c.kekurangan)} — perlu nabung ≈${fmtFull(c.pmtBulanan)}/bulan.`,action:{label:'Lihat Dana Pendidikan',page:'settings',navIdx:6}});
}
}catch(e){console.warn('EduFundInsight: gagal hitung',f&&f.name,e);}
});
return out;
},
render(){
const hasData=!!(D.eduFunds&&D.eduFunds.length);
FeatureInsightUI.renderInto('eduFundInsightCard','eduFundInsightBody',hasData,EduFundInsight.compute(),'Belum ada insight khusus — target dana pendidikan kamu sejauh ini masih di jalur aman.');
}
};
