// aset.js — Domain Aset & Kekayaan: ALOKASI_PRESETS/AlokasiAset (rekomendasi alokasi dana), Aset (Buku Aset & Kekayaan Bersih), Penyusutan (estimasi nilai buku aset yg menurun nilainya: Garis Lurus/Saldo Menurun/Manual), PajakAset (estimasi PBB aset properti & Zakat Maal per aset zakatable + Ringkasan Pajak), LaporanAset (Laporan Aset gabungan: Daftar Aset, Riwayat Transaksi, Nilai Aset, Penyusutan, Ringkasan Kekayaan — dari sisi aset saja), IDBStore (helper generik penyimpanan IndexedDB), PORTFOLIO_LABELS, TimelineW (timeline tujuan keuangan)
// Dipindah ke modules/asset/aset.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul-modul ini dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js (v62).
// CATATAN: IDBStore sebenarnya helper GENERIK (bukan spesifik domain Aset) yang dipakai save()/migrasi di features-helpers-global-security.js & self-test — ikut co-located di sini krn memang sudah dari dulu 1 file sama Aset, dipindah apa adanya tanpa isi diubah. Kandidat dipindah lagi ke file sendiri di sesi berikutnya kalau mau lebih rapi.
// TimelineW.goals() memanggil Renov.totals() (sekarang di renovasi.js) lewat variabel global — aman krn dipanggil saat runtime (render), bukan saat file di-load, & renovasi.js tetap ikut ter-load lewat build.js.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const ALOKASI_PRESETS={
konservatif:{label:'🛡️ Konservatif',desc:'Prioritas jaga nilai pokok, fluktuasi seminimal mungkin. Cocok kalau dana ini penting/darurat atau horison waktu pendek (<2 tahun).',items:[
{name:'Kas / Dana Darurat',pct:40,icon:'💵'},
{name:'RDPU / Deposito',pct:35,icon:'📈'},
{name:'Obligasi / Sukuk Ritel',pct:15,icon:'📜'},
{name:'Emas',pct:10,icon:'🥇'}
]},
moderat:{label:'⚖️ Moderat',desc:'Seimbang antara peluang pertumbuhan & keamanan. Cocok utk horison menengah (3-5 tahun).',items:[
{name:'Kas / Dana Darurat',pct:20,icon:'💵'},
{name:'RDPU / Deposito',pct:25,icon:'📈'},
{name:'Obligasi / Sukuk Ritel',pct:20,icon:'📜'},
{name:'Reksadana Saham / Saham',pct:20,icon:'📊'},
{name:'Emas',pct:15,icon:'🥇'}
]},
agresif:{label:'🚀 Agresif',desc:'Prioritas pertumbuhan jangka panjang, siap terima fluktuasi nilai yang besar. Cocok horison panjang (>5-7 tahun).',items:[
{name:'Kas / Dana Darurat',pct:10,icon:'💵'},
{name:'Obligasi / Sukuk Ritel',pct:15,icon:'📜'},
{name:'Reksadana Saham / Saham',pct:45,icon:'📊'},
{name:'Emas',pct:10,icon:'🥇'},
{name:'Kripto / Alternatif',pct:20,icon:'🪙'}
]}
};
const AlokasiAset={
SUFFIXES:[''],
setRisk(key){
D.assetAllocation=D.assetAllocation||{};
D.assetAllocation.risk=key;
save();
AlokasiAset.renderAll();
},
onDanaInput(suffix){
suffix=suffix||'';
const danaEl=document.getElementById('aaDana'+suffix);
if(!danaEl)return;
D.assetAllocation=D.assetAllocation||{};
D.assetAllocation.dana=parsePzNum(danaEl.value);
save();
AlokasiAset.renderAll();
},
renderAll(){
AlokasiAset.SUFFIXES.forEach(suf=>AlokasiAset.renderOne(suf));
},
renderOne(suffix){
suffix=suffix||'';
const box=document.getElementById('aaResult'+suffix);
if(!box)return;
const chips=document.querySelectorAll('#aaRiskChips'+suffix+' .chip-btn');
const danaEl=document.getElementById('aaDana'+suffix);
const risk=D.assetAllocation&&D.assetAllocation.risk;
chips.forEach(b=>b.classList.remove('active'));
if(risk){
const idx={konservatif:0,moderat:1,agresif:2}[risk];
if(chips[idx])chips[idx].classList.add('active');
}
if(danaEl){
const savedDana=D.assetAllocation&&D.assetAllocation.dana;
danaEl.value=(savedDana!=null&&savedDana!=='')?savedDana:(totalSaldoAkun()||'');
}
if(!risk){box.innerHTML='<div class="u-fs12t2">Pilih dulu salah satu profil risiko di atas ya.</div>';return;}
const preset=ALOKASI_PRESETS[risk];
if(!preset)return;
const dana=danaEl?parsePzNum(danaEl.value):0;
const dd=(D.targets||[]).find(t=>t.isDanaDarurat);
const ddBanner=dd?'':`<div class="u-fs11 u-cacc2 u-r10 u-mb10 u-lh15" style="background:var(--accent2-soft);padding:8px 10px">🚨 Belum ada target yang ditandai <b>Dana Darurat</b>, jadi baris "Kas / Dana Darurat" di bawah masih ilustrasi murni. <span class="u-pointer u-fw600" style="text-decoration:underline" data-action="openTargetModalDanaDarurat">+ Buat targetnya sekarang</span></div>`;
box.innerHTML=ddBanner+'<div class="u-hint10">'+escapeHtml(preset.desc)+'</div>'+
preset.items.map(it=>{
const nominal=Math.round(dana*it.pct/100);
const isDanaDaruratRow=/dana darurat/i.test(it.name);
let ddInfo='';
if(isDanaDaruratRow&&dd){
const ddSaved=dd.accountId?recalcAccBalance(dd.accountId):dd.saved;
const ddPct=Math.min(100,Math.round((ddSaved/dd.amount)*100));
const ddCol=ddPct>=100?'var(--accent3)':ddPct>=50?'var(--accent4)':'var(--accent2)';
ddInfo=`<div style="font-size:11px;color:${ddCol};margin-top:4px;font-weight:600">🎯 "${escapeHtml(dd.name)}": ${fmtFull(ddSaved)} / ${fmtFull(dd.amount)} (${ddPct}%)</div>`;
}
return `<div style="display:flex;justify-content:space-between;align-items:${ddInfo?'flex-start':'center'};padding:8px 0;border-bottom:1px solid var(--border)">
          <div><div class="u-fs13 u-fw600">${it.icon} ${escapeHtml(it.name)}</div><div class="u-fs11 u-t2">${it.pct}%</div>${ddInfo}</div>
          <div class="u-fw700 u-fs13" style="white-space:nowrap;padding-left:8px">${fmtFull(nominal)}</div>
        </div>`;
}).join('')+
'<div class="u-fs11 u-t2 u-mt10 u-lh15">⚠️ Ini cuma ilustrasi persentase umum, bukan saran investasi personal/berlisensi. Nama produk, jangka waktu, dan porsi pastinya perlu disesuaikan sama tujuan & riset kamu sendiri, atau konsultasi ke perencana keuangan berlisensi OJK.</div>';
// Widget Rekomendasi AI (invest-ai-widget.js) — opsional, di-guard supaya
// renderOne() tetap aman kalau file itu belum/tidak dimuat. Widget di-APPEND
// ke box yang sama, TIDAK menimpa ilustrasi alokasi di atas.
if(typeof InvestAI!=='undefined')InvestAI.mountInto(box);
},
init(suffix){
AlokasiAset.renderOne(suffix||'');
}
};
// isAssetOwnershipSelf(a) — helper REUSE dari OwnershipEngine (Sesi 193,
// Ownership Sync Asset & Investasi). Balikin true kalau kepemilikan EFEKTIF
// aset ini SELF (termasuk aset lama yg belum punya field `ownership` sama
// sekali — via OwnershipEngine.resolve() otomatis fallback ke SELF/DEFAULT,
// 100% backward compatible, TIDAK ada aset existing yang tiba-tiba
// ke-exclude). Balikin false kalau ownership-nya salah satu dari INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY (sesuai spesifikasi sesi ini: aset2 tipe ini
// WAJIB dikecualikan dari agregat Total Aset/Dashboard Aset/AI Insight/Net
// Worth — tapi TIDAK dari Aset.renderList() [Buku Aset], aset & histori
// tersebut tetap tampil & tersimpan apa adanya di daftar, cuma tidak ikut
// dijumlah ke total).
// Guard typeof OwnershipEngine: kalau engine belum dimuat, fallback true
// (anggap SELF/tidak exclude apa pun) — pola sama persis
// isAccOwnershipSelf() (modules/finance/akun.js, Sesi 192).
function isAssetOwnershipSelf(a){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(a).type==='SELF';
}
// AssetInsight — kartu "💡 Insight Aset" di paling atas halaman Aset (page-aset).
// Tujuan: kasih ringkasan cepat yg butuh perhatian, TANPA user perlu buka semua
// card di bawahnya satu-satu (Dashboard Aset, Performa Investasi, Histori
// Kekayaan, dst — semuanya sudah ada datanya, insight ini cuma menyorot bagian
// yg paling relevan). Read-only, tidak nyimpen state sendiri, cuma baca ulang
// D.assets & D.wealthSnapshots tiap kali dipanggil. Dipanggil dari
// Aset.renderList() spy selalu sinkron tiap save/delete/import/scan.
const AssetInsight={
// Ambang persentase 1 kategori aset dianggap "kurang terdiversifikasi".
CONCENTRATION_THRESHOLD:60,
// compute() — DIPISAH dari render() supaya bisa dipakai ulang oleh FinCoach.compute()
// (modules-calc.js) buat sinkronisasi ke widget "🩺 Insight Cepat" di Dashboard, TANPA
// mengubah sedikit pun teks/urutan insight yang sudah ada & sudah dites di aset.test.js —
// murni ekstraksi array `insights` yang sebelumnya dibangun langsung di render().
compute(){
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
const totalNilai=list.reduce((s,a)=>s+(a.nilai||0),0);
const insights=[];
// (1) Konsentrasi kategori — kalau 1 jenis aset mendominasi porsi terbesar,
// user mungkin belum sadar portofolionya kurang terdiversifikasi.
const perKategori={};
list.forEach(a=>{
const j=a.jenis||'Lainnya';
perKategori[j]=(perKategori[j]||0)+(a.nilai||0);
});
const kategoriSorted=Object.entries(perKategori).sort((a,b)=>b[1]-a[1]);
if(kategoriSorted.length&&totalNilai>0){
const[topJenis,topNilai]=kategoriSorted[0];
const pct=topNilai/totalNilai*100;
if(pct>=AssetInsight.CONCENTRATION_THRESHOLD){
insights.push(`⚠️ <b>${Math.round(pct)}%</b> dari total Aset kamu ada di kategori <b>${escapeHtml(topJenis)}</b> — pertimbangkan diversifikasi ke jenis aset lain supaya tidak terlalu bergantung pada satu instrumen.`);
}
}
// (2) Performer terbaik/terburuk — cuma aset yg ada data modalnya (sama
// dgn kriteria di Aset.renderInvestasi(), biar konsisten & tidak keisi
// angka semu dari aset yg belum diisi modalnya).
const tracked=list.map(a=>{
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:null);
return{a,buku};
}).filter(x=>x.buku!=null&&x.buku>0);
if(tracked.length){
let best=null,worst=null;
tracked.forEach(({a,buku})=>{
const pct=((a.nilai||0)-buku)/buku*100;
if(!best||pct>best.pct)best={name:a.name,pct};
if(!worst||pct<worst.pct)worst={name:a.name,pct};
});
if(best&&(!worst||best.name!==worst.name||tracked.length===1)){
insights.push(`📈 Performa terbaik: <b>${escapeHtml(best.name)}</b> (${best.pct>=0?'+':''}${best.pct.toFixed(1)}%).`);
}
if(worst&&tracked.length>1&&worst.pct<0){
insights.push(`📉 Perlu dipantau: <b>${escapeHtml(worst.name)}</b> (${worst.pct.toFixed(1)}%) — cek lagi apakah masih sesuai rencana.`);
}
}
// (3) Growth Rate Aktual kekayaan bersih (dari snapshot Histori Kekayaan,
// pakai fungsi yg sama dgn card Histori Kekayaan supaya angkanya konsisten).
if(typeof Kekayaan!=='undefined'){
const cagrResult=Kekayaan.actualCAGR();
if(cagrResult&&!cagrResult.reason){
const pct=cagrResult.cagr*100;
insights.push(`${pct>=0?'🚀':'🔻'} Kekayaan Bersih tumbuh <b>${pct>=0?'+':''}${pct.toFixed(1)}%/tahun</b> (growth rate aktual dari snapshot, bukan asumsi).`);
}
}
return insights;
},
render(){
const card=document.getElementById('assetInsightCard');
const box=document.getElementById('assetInsightBody');
if(!card||!box)return;
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
if(!list.length){card.classList.add('u-dnone');return;}
card.classList.remove('u-dnone');
const totalNilai=list.reduce((s,a)=>s+(a.nilai||0),0);
const insights=AssetInsight.compute();
box.innerHTML=`<div class=\"u-fs20 u-fw700 u-mb4\">${fmtFull(totalNilai)}</div><div class=\"u-fs11 u-t2 u-mb10\">Total nilai ${list.length} aset tercatat</div>`+
(insights.length?insights.map(t=>`<div class=\"u-fs12 u-lh15 u-mb8\">${t}</div>`).join(''):'<div class=\"u-fs12 u-t2 u-lh15\">Belum ada insight khusus — data aset kamu sejauh ini terlihat wajar.</div>');
}
};
const Aset={
editId:null,
_zakatableState:false,
ICON:{'Tanah':'🏞️','Rumah/Bangunan':'🏠','Kendaraan':'🏍️','Emas/Logam Mulia':'🥇','Deposito/Investasi':'📈','Saham':'📊','Reksadana':'💹','Kripto':'🪙','Lainnya':'📦'},
// Ringkasan singkat field kategori-spesifik utk baris di daftar Buku Aset
// (mis. "2022 · 125cc · Pertalite" utk Kendaraan) -- lihat renderJenisFields.
extraLabel(a){
if(a.jenis==='Kendaraan'){
const parts=[];
if(a.vehTahun)parts.push(String(a.vehTahun));
if(a.vehCc)parts.push(a.vehCc+'cc');
if(a.vehBbm)parts.push(a.vehBbm);
return parts.join(' · ');
}
if((a.jenis==='Tanah'||a.jenis==='Rumah/Bangunan')&&a.luasM2)return a.luasM2+' m²';
if(a.jenis==='Emas/Logam Mulia'&&(a.goldBeratGram||a.goldKadar)){
const parts=[];
if(a.goldBeratGram)parts.push(a.goldBeratGram+'g');
if(a.goldKadar)parts.push(a.goldKadar+'');
return parts.join(' · ');
}
return '';
},
openModal(id){
Aset.editId=id||null;
const a=id?D.assets.find(x=>sameId(x.id,id)):null;
document.getElementById('assetModalTitle').textContent=a?'Edit Aset':'Tambah Aset';
document.getElementById('assetName').value=a?a.name:'';
document.getElementById('assetJenis').value=a?a.jenis:'Tanah';
document.getElementById('assetLokasi').value=a?(a.lokasi||''):'';
document.getElementById('assetNilai').value=a?a.nilai:'';
document.getElementById('assetModalInvestasi').value=a&&a.modalInvestasi!=null?a.modalInvestasi:'';
document.getElementById('assetHargaBeli').value=a&&a.hargaBeli!=null?a.hargaBeli:'';
document.getElementById('assetJumlahUnit').value=a&&a.jumlahUnit!=null?a.jumlahUnit:'';
document.getElementById('assetTanggal').value=a?(a.tanggal||''):todayStr();
const accSel=document.getElementById('assetAccId');
if(accSel)accSel.value=a&&a.accountId?String(a.accountId):'';
const scanBox=document.getElementById('assetScanCandidates');
if(scanBox){scanBox.style.display='none';scanBox.innerHTML='';}
Aset._zakatableState=a?!!a.zakatable:false;
const btn=document.getElementById('assetZakatableBtn');
btn.textContent=Aset._zakatableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._zakatableState?' active':'');
// Dana Titipan (permintaan user): satu instrumen investasi bisa campuran dana sendiri
// & dana titipan investor/keluarga -- toggle + field terpisah, pola sama dgn
// billShared/txCicilanShared (toggle -> tampilkan wrap). Nominal titipan disimpan apa
// adanya (bukan %), disinkron ke Buku Utang lewat Aset._syncTitipanDebt() di save().
const titipanToggle=document.getElementById('assetTitipanToggle');
const titipanHasAmount=!!(a&&a.titipanAmount>0);
if(titipanToggle)titipanToggle.checked=titipanHasAmount;
document.getElementById('assetTitipanOwnerType').value=a&&a.titipanOwnerType?a.titipanOwnerType:'investor';
document.getElementById('assetTitipanOwnerName').value=a&&a.titipanOwnerName?a.titipanOwnerName:'';
document.getElementById('assetTitipanAmount').value=titipanHasAmount?a.titipanAmount:'';
document.getElementById('assetTitipanWrap').classList.toggle('u-dnone',!titipanHasAmount);
Aset.onTitipanOwnerTypeChange();
Aset.renderJenisFields(a);
Aset.updateProfitPreview();
// Ownership (S231) — reuse OwnershipEngine, sama pola dgn Akun/Kendaraan. Aset lama tanpa
// field ownership: resolve() fallback ke SELF/DEFAULT (backward compatible).
const ownSel=document.getElementById('assetOwnership');
if(ownSel){
if(typeof OwnershipEngine!=='undefined'){
ownSel.innerHTML=OwnershipEngine.TYPES.map(t=>'<option value="'+t+'">'+escapeHtml(OwnershipEngine.label(t))+'</option>').join('');
ownSel.value=OwnershipEngine.resolve(a||{}).type;
}else{
ownSel.innerHTML='<option value="SELF">Milik Sendiri</option>';
ownSel.value='SELF';
}
}
openModal('assetModal');
},
// FITUR BARU (permintaan user): input Buku Aset dibedakan sesuai kategori --
// Kendaraan -> Tahun/CC/BBM, Tanah & Rumah/Bangunan -> Luas (m2, dipakai juga
// oleh estimasi PBB di PajakAset yang sudah ada), Emas/Logam Mulia -> Berat
// (gram) & Kadar/Karat (field goldBeratGram/goldKadar -- SAMA PERSIS dgn
// field yg dipakai GoldImport, lihat modules/asset/aset-emas-impor.js, biar
// input manual & impor massal nyambung ke skema data yg sama). Kategori lain
// (Deposito/Saham/Reksadana/Kripto/Lainnya) tetap pakai field umum yg sudah
// ada (Modal Investasi/Harga Beli/Jumlah Unit), jadi wrap dikosongkan.
//   onJenisChange() dipanggil dari onchange dropdown Jenis -- render ULANG
//   dgn asset=null (form kosong) krn pindah kategori = data lama kategori
//   sebelumnya sudah tidak relevan. openModal() di atas panggil langsung dgn
//   asset asli (a) supaya field kepril saat Edit Aset.
onJenisChange(){
Aset.renderJenisFields(null);
},
renderJenisFields(a){
const jenis=document.getElementById('assetJenis').value;
const wrap=document.getElementById('assetJenisFieldsWrap');
if(!wrap)return;
if(jenis==='Kendaraan'){
const tahun=a&&a.vehTahun!=null?a.vehTahun:'';
const cc=a&&a.vehCc!=null?a.vehCc:'';
const bbm=a&&a.vehBbm?a.vehBbm:'';
wrap.innerHTML='<div class="u-grid2"><div class="fg"><label class="fl">Tahun</label><input type="text" inputmode="numeric" class="fi" id="assetVehTahun" placeholder="2022" value="'+escapeHtml(String(tahun))+'"></div><div class="fg"><label class="fl">CC</label><input type="text" inputmode="numeric" class="fi" id="assetVehCc" placeholder="125" value="'+escapeHtml(String(cc))+'"></div></div><div class="fg"><label class="fl">Jenis BBM</label><select class="fs" id="assetVehBbm"><option value="">— Pilih —</option><option value="Pertalite">Pertalite</option><option value="Pertamax">Pertamax</option><option value="Pertamax Turbo">Pertamax Turbo</option><option value="Solar">Solar</option><option value="Dexlite">Dexlite</option><option value="Listrik">⚡ Listrik</option><option value="Hybrid">Hybrid</option></select></div>';
document.getElementById('assetVehBbm').value=bbm;
}else if(jenis==='Tanah'||jenis==='Rumah/Bangunan'){
const luas=a&&a.luasM2!=null?a.luasM2:'';
wrap.innerHTML='<div class="fg"><label class="fl">Luas Tanah/Bangunan (m²)</label><input type="text" inputmode="decimal" class="fi" id="assetLuasM2" placeholder="120" value="'+escapeHtml(String(luas))+'"></div><div class="u-fs11 u-t2" style="margin:-6px 0 12px;line-height:1.5">💡 NJOP dipakai dari field "Estimasi Nilai Saat Ini" di bawah — estimasi PBB otomatis muncul di menu 🏛️ Pajak Aset setelah aset ini disimpan.</div>';
}else if(jenis==='Emas/Logam Mulia'){
const gram=a&&a.goldBeratGram!=null?a.goldBeratGram:'';
const kadar=a&&a.goldKadar!=null?a.goldKadar:750;
wrap.innerHTML='<div class="u-grid2"><div class="fg"><label class="fl">Berat (gram)</label><input type="text" inputmode="decimal" class="fi" id="assetGoldGram" placeholder="4.13" value="'+escapeHtml(String(gram))+'"></div><div class="fg"><label class="fl">Kadar/Karat</label><select class="fs" id="assetGoldKadar"><option value="999">24K (999)</option><option value="916">22K (916)</option><option value="875">21K (875)</option><option value="750">18K (750)</option><option value="700">17K (700)</option></select></div></div>';
document.getElementById('assetGoldKadar').value=String(kadar);
}else{
wrap.innerHTML='';
}
},
updateProfitPreview(){
const box=document.getElementById('assetProfitInfo');
if(!box)return;
const nilai=calcPreviewValue(document.getElementById('assetNilai').value);
const modal=calcPreviewValue(document.getElementById('assetModalInvestasi').value);
if(!modal){box.innerHTML='';return;}
const untung=nilai-modal;
const pct=modal?(untung/modal*100):0;
const cls=untung>=0?'green':'red';
box.innerHTML='Estimasi untung/rugi: <b class="'+cls+'">'+(untung>=0?'+':'')+fmtFull(untung)+' ('+(pct>=0?'+':'')+pct.toFixed(2)+'%)</b>';
},
toggleZakatable(){
Aset._zakatableState=!Aset._zakatableState;
const btn=document.getElementById('assetZakatableBtn');
btn.textContent=Aset._zakatableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._zakatableState?' active':'');
},
toggleTitipan(){
const on=document.getElementById('assetTitipanToggle').checked;
document.getElementById('assetTitipanWrap').classList.toggle('u-dnone',!on);
if(on)Aset.onTitipanOwnerTypeChange();
},
// TITIPAN_OWNER_LABELS / onTitipanOwnerTypeChange() -- label & placeholder field Nama
// berubah sesuai jenis pemberi Dana Titipan dipilih (pola sama persis Debt.JENIS_DEFAULTS/
// Debt.onJenisChange() di modules/finance/piutang-utang.js). Cuma UI copy yang berubah,
// TIDAK ada field/skema data baru -- titipanOwnerName tetap 1 field yang sama.
TITIPAN_OWNER_LABELS:{
investor:{label:'Nama Investor',placeholder:'Pak Budi, PT Modal Jaya, dll'},
keluarga:{label:'Nama Anggota Keluarga',placeholder:'Kakak, Ibu, Om Budi, dll'},
lainnya:{label:'Nama/Keterangan',placeholder:'Koperasi, teman, dll'}
},
onTitipanOwnerTypeChange(){
const type=document.getElementById('assetTitipanOwnerType').value;
const cfg=Aset.TITIPAN_OWNER_LABELS[type]||Aset.TITIPAN_OWNER_LABELS.investor;
const lbl=document.getElementById('assetTitipanOwnerNameLabel');
const inp=document.getElementById('assetTitipanOwnerName');
if(lbl)lbl.textContent=cfg.label+' (opsional)';
if(inp)inp.placeholder=cfg.placeholder;
},
// _syncTitipanDebt(a) — jaga entry Buku Utang (D.debts) tetap sinkron dgn porsi
// titipan aset ini, pola SAMA PERSIS dgn Investment._syncTitipanDebt()
// (modules/asset/investasi.js) -- 0 rumus baru, cuma dipindah ke domain Aset supaya
// 1 instrumen investasi bisa campuran dana sendiri & dana titipan investor/keluarga.
// nilai aset (a.nilai) TETAP dicatat penuh & apa adanya; porsi titipan (a.titipanAmount)
// otomatis jadi 1 entry utang bernama pemilik dana, sehingga Kekayaan Bersih = Nilai
// Aset − Utang Titipan (tidak overstated). titipanAmount 0/toggle mati -> entry utang
// lama (kalau ada) otomatis dihapus, tidak menyisakan sampah.
_syncTitipanDebt(a){
if(!a||typeof D==='undefined'||!D.debts)return;
if(a.titipanAmount>0){
const typeLabel=a.titipanOwnerType==='keluarga'?'Keluarga':(a.titipanOwnerType==='lainnya'?'Pihak Lain':'Investor');
const owner=(a.titipanOwnerName&&String(a.titipanOwnerName).trim())?(String(a.titipanOwnerName).trim()+' ('+typeLabel+')'):typeLabel;
const amount=a.titipanAmount;
const catatan='Dana titipan aset: '+a.name;
let debt=a.titipanDebtLinkId?D.debts.find(d=>String(d.id)===String(a.titipanDebtLinkId)):null;
if(debt){
Object.assign(debt,{name:owner,nilai:amount,catatan,lunas:amount<=0});
}else{
debt={id:uid(),name:owner,nilai:amount,bunga:0,cicilanBulanan:0,tanggal:todayStr(),jatuhTempo:'',catatan,lunas:amount<=0};
D.debts.push(debt);
a.titipanDebtLinkId=debt.id;
}
}else if(a.titipanDebtLinkId){
D.debts=D.debts.filter(d=>String(d.id)!==String(a.titipanDebtLinkId));
a.titipanDebtLinkId=null;
}
},
save(){
const name=document.getElementById('assetName').value.trim();
if(!name){toast('⚠️ Nama aset wajib diisi');return;}
const jenis=document.getElementById('assetJenis').value;
const lokasi=document.getElementById('assetLokasi').value.trim();
const nilai=parsePzNum(document.getElementById('assetNilai').value);
const modalInvestasi=parsePzNum(document.getElementById('assetModalInvestasi').value)||null;
const hargaBeli=parseDecStr(document.getElementById('assetHargaBeli').value);
const jumlahUnit=parseDecStr(document.getElementById('assetJumlahUnit').value);
const tanggal=document.getElementById('assetTanggal').value||'';
let accountId=document.getElementById('assetAccId').value||null;
// BUGFIX-FEATURE: opsi "__new__" = bukan menautkan ke akun yang SUDAH ADA, tapi
// bikin akun baru otomatis dari aset ini -- biar akun itu langsung nongol di
// daftar 🏦 Akun & bisa langsung dipakai buat transaksi (bayar/terima) seperti
// akun biasa, bukan cuma referensi nilai doang. Saldo awal akun = nilai aset saat
// ini. Setelah dibuat, id akun baru itu yang dipakai sbg accountId (tetap otomatis
// dikecualikan dari Total Saldo Akun lewat linkedAssetAccountIds(), sama seperti
// tautan ke akun lama, supaya nilainya gak dobel dihitung).
let _createdNewAcc=false;
// Ownership (S231) — dibaca dari dropdown, divalidasi/dinormalisasi via OwnershipEngine.
// Dipindah ke SINI (sebelum blok __new__ di bawah, bukan sesudahnya seperti semula)
// supaya akun baru yang auto-dibuat dari Aset bisa langsung ikut mewarisi ownership
// aset-nya (fix gap dicatat Sesi 311: akun auto-buat selalu ownership SELF/DEFAULT,
// jadi tidak kehitung di Dana Kelolaan/"Dana Investor" walau aset-nya sendiri sudah
// ownership INVESTOR/CUSTOMER/dst).
const ownRawA=document.getElementById('assetOwnership')?.value;
const ownership=(typeof OwnershipEngine!=='undefined'&&OwnershipEngine.isValidType(ownRawA))?OwnershipEngine.normalize(ownRawA):(typeof OwnershipEngine!=='undefined'?OwnershipEngine.DEFAULT:'SELF');
if(accountId==='__new__'){
const newAcc={id:'acc_'+Date.now(),name,emoji:Aset.ICON[jenis]||'📦',baseBalance:nilai,balance:nilai,includeInBalance:true,ownership};
D.accounts.push(newAcc);
accountId=newAcc.id;
_createdNewAcc=true;
}
// SYNC NOMINAL AKUN TERTAUT (fix: akun yang ditautkan dari Buku Aset sebelumnya
// cuma dapat baseBalance = nilai SEKALI waktu dibuat -- edit nilai aset SESUDAHNYA
// tidak pernah kepropagasi ke akunnya, jadi keduanya cepat divergen. Fix: tiap kali
// aset disimpan (nilai berubah/tidak) & sudah tertaut ke akun YANG SUDAH ADA
// (bukan baru dibuat di blok atas, itu sudah otomatis sama), akun itu di-"koreksi"
// ke nominal = nilai aset SEKARANG, pakai pola txDelta yang SAMA PERSIS dgn
// _saveAccInner() (akun.js) -- riwayat transaksi akun (kalau ada) TIDAK diubah,
// cuma baseBalance-nya digeser supaya hasil recalcAccBalance() = nilai aset.
if(accountId&&!_createdNewAcc){
const linkedAcc=D.accounts.find(x=>sameId(x.id,accountId));
if(linkedAcc){
const txDelta=recalcAccBalance(linkedAcc.id)-(linkedAcc.baseBalance!==undefined?linkedAcc.baseBalance:(linkedAcc.balance||0));
linkedAcc.baseBalance=nilai-txDelta;
linkedAcc.balance=nilai;
}
}
const keuntungan=modalInvestasi?(nilai-modalInvestasi):null;
const keuntunganPct=modalInvestasi?((nilai-modalInvestasi)/modalInvestasi*100):null;
const extra={modalInvestasi,hargaBeli,jumlahUnit,keuntungan,keuntunganPct};
// Dana Titipan (permintaan user): nominal titipan dijepit ke [0, nilai] -- titipan
// TIDAK BOLEH lebih besar dari Estimasi Nilai instrumen ini sendiri. Toggle mati =
// titipanAmount 0 (Aset._syncTitipanDebt() di bawah otomatis lepas tautan utang lama).
const titipanOn=document.getElementById('assetTitipanToggle')?.checked;
let titipanAmount=titipanOn?parsePzNum(document.getElementById('assetTitipanAmount').value):0;
if(titipanAmount<0)titipanAmount=0;
if(titipanAmount>nilai)titipanAmount=nilai;
extra.titipanAmount=titipanAmount;
extra.titipanOwnerType=titipanAmount>0?(document.getElementById('assetTitipanOwnerType').value||'investor'):'';
extra.titipanOwnerName=titipanAmount>0?document.getElementById('assetTitipanOwnerName').value.trim():'';
// Field kategori-spesifik (lihat Aset.renderJenisFields) -- selalu di-reset dulu
// ke null lalu diisi ULANG sesuai jenis yg dipilih SEKARANG, supaya kalau user
// ganti kategori pas Edit Aset (mis. dari Kendaraan ke Tanah), field kategori
// lama tidak nyangkut jadi data basi di aset ini.
extra.vehTahun=null;extra.vehCc=null;extra.vehBbm=null;
extra.luasM2=null;
extra.goldBeratGram=null;extra.goldKadar=null;
if(jenis==='Kendaraan'){
const vt=document.getElementById('assetVehTahun');
const vc=document.getElementById('assetVehCc');
const vb=document.getElementById('assetVehBbm');
extra.vehTahun=vt&&vt.value!==''?(parseInt(vt.value,10)||null):null;
extra.vehCc=vc&&vc.value!==''?(parseInt(vc.value,10)||null):null;
extra.vehBbm=vb&&vb.value?vb.value:null;
}else if(jenis==='Tanah'||jenis==='Rumah/Bangunan'){
const lm=document.getElementById('assetLuasM2');
extra.luasM2=lm&&lm.value!==''?(parseDecStr(lm.value)||null):null;
}else if(jenis==='Emas/Logam Mulia'){
const gg=document.getElementById('assetGoldGram');
const gk=document.getElementById('assetGoldKadar');
extra.goldBeratGram=gg&&gg.value!==''?(parseDecStr(gg.value)||null):null;
extra.goldKadar=gk&&gk.value?(parseInt(gk.value,10)||null):null;
}
let savedAsset;
if(Aset.editId){
const a=D.assets.find(x=>sameId(x.id,Aset.editId));
if(!a){toast('⚠️ Aset tidak ditemukan, coba tutup dan buka lagi');return;}
Object.assign(a,{name,jenis,lokasi,nilai,tanggal,zakatable:Aset._zakatableState,accountId,ownership},extra);
savedAsset=a;
} else {
savedAsset=Object.assign({id:uid(),name,jenis,lokasi,nilai,tanggal,zakatable:Aset._zakatableState,accountId,ownership},extra);
D.assets.push(savedAsset);
}
Aset._syncTitipanDebt(savedAsset);
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{jenis,nilai,editId:Aset.editId});
closeModal('assetModal');
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
if(typeof renderDebtList==='function')renderDebtList();
if(typeof populateAccFilters==='function')populateAccFilters();
toast(_createdNewAcc?'✅ Aset tersimpan & akun baru dibuat':'✅ Aset tersimpan');
},
async delete(id){
if(!await askConfirm('Hapus aset ini dari Buku Aset?',{okText:'Ya, Hapus'}))return;
const a=D.assets.find(x=>sameId(x.id,id));
const hadTitipanDebt=!!(a&&a.titipanDebtLinkId&&D.debts);
if(hadTitipanDebt){
D.debts=D.debts.filter(d=>String(d.id)!==String(a.titipanDebtLinkId));
}
D.assets=D.assets.filter(a=>!sameId(a.id,id));
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{deletedId:id});
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
if(hadTitipanDebt&&typeof renderDebtList==='function')renderDebtList();
},
renderList(){
const el=document.getElementById('assetList');
if(!el)return;
// Ownership Filter UI (S235) — reuse OwnershipEngine.filterByType() apa adanya, TIDAK ada
// filter/logic baru. HANYA memfilter daftar yang DIRENDER di sini; totalValue()/
// renderDashboard()/dst di bawah TETAP dihitung dari D.assets penuh lewat pemanggilan
// masing2 (Jangan mengubah perhitungan). Ini juga mencakup item Investasi (jenis
// "Deposito/Investasi"/"Saham"/"Reksadana"/"Kripto" ikut tampil & difilter di sini,
// karena project ini belum punya daftar Investasi terpisah dari Buku Aset).
const assetOwnFilterEl=document.getElementById('assetOwnFilter');
const assetOwnFilterVal=assetOwnFilterEl?assetOwnFilterEl.value:'ALL';
let list=D.assets||[];
if(assetOwnFilterVal&&assetOwnFilterVal!=='ALL'&&typeof OwnershipEngine!=='undefined'){
const assetOwnFiltered=OwnershipEngine.filterByType(list,assetOwnFilterVal);
if(assetOwnFiltered.ok)list=assetOwnFiltered.items;
}
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada aset tercatat</div></div>';Aset.renderDashboard();Aset.renderInvestasi();Penyusutan.renderList();PajakAset.renderList();LaporanAset.renderList();AssetInsight.render();return;}
el.innerHTML=list.map(a=>{
// S306 UI polish: baris tx-meta sebelumnya menggabung jenis · label/extraLabel · lokasi ·
// akun tertaut · kepemilikan · dana titipan · %untung jadi 1 kalimat panjang tanpa jarak
// visual (lebih padat drpd kasus chip Tagihan S299/S304). Sekarang HANYA 2 chip prioritas
// yang tampil di kartu — jenis & 📍 lokasi (reuse class "acc-chip" yang SUDAH ADA, 0 style
// baru). SEMUA detail lain (label tambahan/extraLabel, akun tertaut, kepemilikan/ownership,
// dana titipan, %untung) dipindah jadi baris teks di dalam overflow menu (Aset.
// openActionsMenu di bawah) — dihitung ULANG di sana dari `a`/`id`, BUKAN dikirim lewat
// closure, jadi TIDAK ada variabel sisa yang dihitung di sini tapi tidak dipakai.
const jenisChip=`<span class="acc-chip">${escapeHtml(a.jenis)}</span>`;
const lokasiChip=a.lokasi?` <span class="acc-chip">📍 ${escapeHtml(a.lokasi)}</span>`:'';
return `<div class="tx-item u-pointer" data-action="openAssetModal" data-args="${escapeHtml(JSON.stringify([a.id]))}"><div class="tx-icon u-bgaccsoft">${Aset.ICON[a.jenis]||'📦'}</div><div class="tx-info"><div class="tx-name">${escapeHtml(a.name)}${a.zakatable?' <span class="u-fs10 u-cacc3 u-r6 u-ml4" style="border:1px solid var(--accent3);padding:1px 5px">Zakat</span>':''}</div><div class="tx-meta">${jenisChip}${lokasiChip}</div></div><div class="tx-amount">${fmt(a.nilai)}</div><button class="tx-del" data-stop="1" data-action="Aset.openActionsMenu" data-args="${escapeHtml(JSON.stringify([a.id]))}" aria-label="Aksi lainnya">⋮</button></div>`;
}).join('');
Aset.renderDashboard();
Aset.renderInvestasi();
Penyusutan.renderList();
PajakAset.renderList();
LaporanAset.renderList();
AssetInsight.render();
},
// openActionsMenu(id) — menu overflow "⋮" utk aksi sekunder + detail kartu aset (S306
// UI polish, lanjutan pola S299/S304/S305: SAMA PERSIS openBillActionsMenu() di
// tagihan-kalender.js / openProdusenActionsMenu() di cobek-order.js — reuse penuh modal
// qs-modal-overlay & class .bill-action-row/.bar-icon yang SUDAH ADA, 0 style baru).
// 3 tombol kartu (📜 Riwayat, ⚡ Scan cepat, 🗑 Hapus) dipindah ke sini; tap kartu TETAP
// buka Edit (data-action="openAssetModal" di wrapper div, tidak berubah). Detail meta yang
// sebelumnya digabung di tx-meta (label/extraLabel, akun tertaut, kepemilikan, dana
// titipan, %untung) ditampilkan di #assetActionsMeta — bukan dihapus, cuma dipindah biar
// baris chip di kartu tetap ringkas (jenis + lokasi saja).
openActionsMenu(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)return;
document.getElementById('assetActionsTitle').textContent=`${Aset.ICON[a.jenis]||'📦'} ${a.name}`;
const linkedAcc=a.accountId?D.accounts.find(x=>sameId(x.id,a.accountId)):null;
const linkMeta=linkedAcc?('🔗 Akun tertaut: '+escapeHtml(linkedAcc.name)):(a.accountId?'🔗 Akun tertaut: (akun terhapus)':'');
const ownResolved=(typeof OwnershipEngine!=='undefined')?OwnershipEngine.resolve(a):null;
const ownMeta=ownResolved?('👤 Kepemilikan: '+escapeHtml(OwnershipEngine.label(ownResolved.type))):'';
const titipanLabel=a.titipanOwnerType==='keluarga'?'Keluarga':(a.titipanOwnerType==='lainnya'?'Pihak Lain':'Investor');
const titipanMeta=a.titipanAmount>0?('💰 Titipan '+escapeHtml(titipanLabel)+': '+fmt(a.titipanAmount)):'';
const extraMeta=Aset.extraLabel(a)?escapeHtml(Aset.extraLabel(a)):'';
const pctMeta=(a.keuntunganPct!=null&&isFinite(a.keuntunganPct))?(`${a.keuntunganPct>=0?'▲':'▼'} ${a.keuntunganPct>=0?'+':''}${a.keuntunganPct.toFixed(2)}%`):'';
const metaRows=[extraMeta,linkMeta,ownMeta,titipanMeta,pctMeta].filter(Boolean);
// Div meta TETAP ada di HTML (bukan dibuat/dihapus dinamis) supaya elemennya selalu bisa
// diambil lewat getElementById; kalau kebetulan kosong (mis. OwnershipEngine belum kemuat),
// disembunyikan lewat display:none — bukan cuma innerHTML='' — supaya padding bawaannya
// (lihat markup di app_production.html/index.html) TIDAK nyisain celah kosong di atas
// daftar aksi.
const metaEl=document.getElementById('assetActionsMeta');
metaEl.innerHTML=metaRows.join('<br>');
metaEl.style.display=metaRows.length?'':'none';
const histRow=linkedAcc?`<div class="bill-action-row" data-action="assetActionHistory" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon u-cacc3">📜</span> Riwayat Transaksi</div>`:'';
document.getElementById('assetActionsList').innerHTML=`${histRow}
    <div class="bill-action-row" data-action="assetActionScan" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon u-cacc">⚡</span> Update Cepat via Scan</div>
    <div class="bill-action-row danger" data-action="assetActionDelete" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon">🗑</span> Hapus</div>`;
openQS('qsAssetActions');
},
// totalValue() — Sesi 193 (Ownership Sync): TAMBAH 1 filter isAssetOwnershipSelf(a)
// (0 logic lama diubah, cuma nambah 1 syarat filter sebelum reduce). Aset
// ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan dari Total
// Aset (dipakai jg oleh Kekayaan.currentNetWorth() & AssetPortfolioAPI —
// keduanya ikut ter-fix otomatis lewat titik ini, 0 perubahan tambahan di
// modul lain), tapi TETAP muncul apa adanya di Aset.renderList() (Buku Aset).
totalValue(){return(D.assets||[]).filter(isAssetOwnershipSelf).reduce((s,a)=>s+(a.nilai||0),0);},
// FITUR BARU: Dashboard Aset — ringkasan Total Aset / Nilai Buku / Nilai Pasar +
// breakdown per kategori (jenis). Nilai Pasar = total a.nilai (estimasi nilai saat
// ini, sesuai yang diisi user di modal Aset). Nilai Buku = total modal/harga
// perolehan (modalInvestasi kalau diisi, atau hargaBeli×jumlahUnit kalau itu yang
// diisi; kalau dua-duanya kosong, dianggap sama dgn Nilai Pasar krn tidak ada data
// modal -- supaya tidak salah tampil "untung/rugi" padahal cuma belum diisi).
// Dipanggil otomatis tiap kali Aset.renderList() jalan (save/delete/import/scan
// semua sudah lewat situ), jadi selalu sinkron tanpa perlu titik panggil baru.
renderDashboard(){
const box=document.getElementById('assetDashboard');
if(!box)return;
// Sesi 193 (Ownership Sync): filter isAssetOwnershipSelf() -- Dashboard Aset
// (ringkasan Total Aset/Nilai Buku/Nilai Pasar/breakdown kategori) HANYA
// menghitung aset ber-ownership SELF, sesuai spesifikasi (dikecualikan dari
// "Dashboard"). Aset non-SELF tetap ada apa adanya di Aset.renderList().
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
box.classList.remove('u-dnone');
if(!list.length){
const t=document.getElementById('assetDashTotal');if(t)t.textContent=fmtFull(0);
const b=document.getElementById('assetDashBuku');if(b)b.textContent=fmtFull(0);
const p=document.getElementById('assetDashPasar');if(p)p.textContent=fmtFull(0);
const s=document.getElementById('assetDashSelisih');if(s)s.textContent='';
const k=document.getElementById('assetDashKategori');if(k)k.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset tercatat — tambah aset pertama lewat 📋 Buku Aset di bawah untuk melihat ringkasan di sini.</div>';
const d=document.getElementById('assetDashDiversifikasi');if(d)d.innerHTML='';
return;
}
let totalPasar=0,totalBuku=0;
const perKategori={};
list.forEach(a=>{
const pasar=a.nilai||0;
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:pasar);
totalPasar+=pasar;totalBuku+=buku;
const jenis=a.jenis||'Lainnya';
if(!perKategori[jenis])perKategori[jenis]={count:0,nilai:0};
perKategori[jenis].count++;
perKategori[jenis].nilai+=pasar;
});
const selisih=totalPasar-totalBuku;
const selisihPct=totalBuku?(selisih/totalBuku*100):0;
const selisihCls=selisih>=0?'green':'red';
document.getElementById('assetDashTotal').textContent=fmtFull(totalPasar);
document.getElementById('assetDashBuku').textContent=fmtFull(totalBuku);
document.getElementById('assetDashPasar').textContent=fmtFull(totalPasar);
const selEl=document.getElementById('assetDashSelisih');
if(selEl)selEl.innerHTML=`Selisih Buku → Pasar: <b class="${selisihCls}">${fmtFullSigned(selisih)} (${selisih>=0?'+':''}${selisihPct.toFixed(2)}%)</b>`;
const barColors=['var(--accent)','var(--accent2)','var(--accent3)','var(--accent4)'];
// Komposisi Aset + Persentase Kategori: urut dari nilai (Rp) terbesar ke terkecil,
// tiap baris tampilkan ikon/jenis/jumlah unit, nominal, bar proporsional, & %
// terhadap totalPasar (bukan totalBuku, krn ini komposisi kekayaan SEKARANG).
const kategoriRows=Object.entries(perKategori).sort((a,b)=>b[1].nilai-a[1].nilai);
const katBox=document.getElementById('assetDashKategori');
if(katBox){
katBox.innerHTML=kategoriRows.map(([jenis,v],i)=>{
const pct=totalPasar?(v.nilai/totalPasar*100):0;
const icon=Aset.ICON[jenis]||'📦';
return `<div class="u-mb10">
      <div class="u-flex u-jcb u-aifs u-gap8 u-fs13 u-mb4"><span class="u-fw600 u-flex1">${icon} ${escapeHtml(jenis)} <span class="u-fs11 u-t2">(${v.count})</span></span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmt(v.nilai)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${pct}%;background:${barColors[i%barColors.length]}"></div></div>
      <div class="budget-bar-label"><span>${pct.toFixed(1)}% dari total</span></div>
    </div>`;
}).join('');
}
// FITUR BARU: Ringkasan Diversifikasi — simpulkan sebaran aset per kategori jadi
// 1 kalimat + label status, berdasarkan (a) jumlah kategori yang dipegang & (b)
// konsentrasi kategori terbesar (% dari totalPasar). Ambang batas dipilih supaya
// selaras dgn heuristik umum "jangan taruh semua telur di 1 keranjang":
//  - 1 kategori doang -> jelas belum terdiversifikasi sama sekali.
//  - kategori terbesar >=70% -> risiko konsentrasi tinggi meski kategori lain ada.
//  - kategori terbesar >=50% -> lumayan terkonsentrasi, masih perlu diwaspadai.
//  - selain itu (kategori terbesar <50%, jenis kategori >=3) -> dianggap sudah
//    tersebar cukup baik.
const divBox=document.getElementById('assetDashDiversifikasi');
if(divBox){
const jumlahKategori=kategoriRows.length;
if(!jumlahKategori){
divBox.innerHTML='';
} else {
const [topJenis,topV]=kategoriRows[0];
const topPct=totalPasar?(topV.nilai/totalPasar*100):0;
let label,cls,saran;
if(jumlahKategori===1){
label='⚠️ Belum Terdiversifikasi';cls='red';
saran=`Semua aset (100%) masih ada di 1 kategori: <b>${escapeHtml(topJenis)}</b>. Pertimbangkan sebar ke kategori lain (mis. emas, reksadana, atau kas darurat) biar gak terlalu bergantung ke 1 jenis aset.`;
} else if(topPct>=70){
label='⚠️ Konsentrasi Tinggi';cls='red';
saran=`${jumlahKategori} kategori sudah dipegang, tapi <b>${escapeHtml(topJenis)}</b> mendominasi ${topPct.toFixed(1)}% dari total. Risiko konsentrasi masih tinggi kalau nilai kategori itu turun.`;
} else if(topPct>=50){
label='🟡 Cukup Terkonsentrasi';cls='orange';
saran=`${jumlahKategori} kategori tersebar, dgn <b>${escapeHtml(topJenis)}</b> sbg porsi terbesar (${topPct.toFixed(1)}%). Lumayan seimbang, tapi masih ada baiknya dipantau supaya gak makin dominan.`;
} else {
label='✅ Terdiversifikasi Baik';cls='green';
saran=`Aset tersebar di ${jumlahKategori} kategori, tanpa satupun kategori yang mendominasi lebih dari separuh total (terbesar: ${escapeHtml(topJenis)}, ${topPct.toFixed(1)}%).`;
}
divBox.innerHTML=`<div class="u-r10 u-mt10" style="background:var(--accent-soft);padding:8px 10px">
      <div class="u-fs12 u-fw700 ${cls}">${label}</div>
      <div class="u-fs11 u-t2 u-mt4 u-lh15">${saran}</div>
    </div>`;
}
}
},
// FITUR BARU: Ringkasan Performa Investasi — ROI, Capital Gain/Loss, Yield (CAGR
// tahunan), & ringkasan performa portofolio. HANYA mencakup aset yang punya data
// modal (modalInvestasi ATAU hargaBeli×jumlahUnit terisi & >0) -- ini yg disebut
// "dilacak sebagai investasi" di sini, TERLEPAS dari jenis-nya (Tanah/Rumah pun
// ikut kalau memang diisi modalnya), krn definisi "investasi" yg dipakai murni
// berbasis ada/tidaknya data modal utk hitung untung-rugi, bukan kategori. Aset
// tanpa data modal (nilai=modal by default) SENGAJA dikecualikan supaya ROI/Yield
// portofolio gak keisi data semu (untung/rugi 0% terus krn memang belum diisi).
// - ROI: total return keseluruhan portofolio sejak modal awal ((Nilai-Modal)/Modal).
// - Capital Gain/Loss: nominal Rp selisih Nilai vs Modal (bisa +/-).
// - Yield: rata2 tertimbang (bobot=modal) dari CAGR per-aset ((Nilai/Modal)^(365/hari)-1),
//   HANYA aset yg py `tanggal` & sudah lewat >=1 hari -- dipakai buat estimasi
//   "setara berapa %/tahun", beda dari ROI yg cuma total return mentah tanpa
//   memperhitungkan lama waktu investasi.
// Referensi "hari ini" pakai todayStr() (bukan `new Date()` langsung) supaya
// determinstik & gampang di-test (sama seperti dipakai di openModal()).
// Dipanggil otomatis lewat renderList() spy selalu sinkron tiap save/delete/import.
//
// investmentPerformance() — DIPISAH dari renderInvestasi() (Sesi 161, gap
// fix Investment Planner) supaya bisa dipakai ulang oleh
// InvestmentPlannerAPI (modules/finance/investment-planner-api.js) TANPA
// duplikasi formula — pola SAMA PERSIS AssetInsight.compute() vs
// AssetInsight.render() di atas (ekstraksi murni, 0 rumus baru, 0 behavior
// berubah). Filter "tracked" (modalInvestasi ATAU hargaBeli×jumlahUnit
// terisi & >0) TETAP SAMA seperti sebelumnya. Read-only, tidak menyentuh
// DOM sama sekali — caller (renderInvestasi() di bawah, atau
// InvestmentPlannerAPI) yang urus presentasinya masing-masing.
// S261 (Investment Ownership Sync): TAMBAH 1 filter isAssetOwnershipSelf(a)
// di awal (0 rumus baru) — SEBELUM sesi ini, fungsi ini membaca D.assets
// MENTAH tanpa filter ownership, beda dari Aset.totalValue()/AssetInsight
// yang sudah SELF-only sejak S193. Akibatnya aset ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY ikut nyasar ke totalModal/
// totalNilai/gain/roiPct/best/worst di sini, DAN ke portfolioOverview()/
// assetAllocation()/investmentRecommendation() InvestmentPlannerAPI
// (modules/finance/investment-planner-api.js) yang 100% reuse fungsi ini.
// Pola filter SAMA PERSIS isAssetOwnershipSelf() yang sudah dipakai
// totalValue()/AssetInsight.compute() di file ini.
investmentPerformance(){
const tracked=(D.assets||[]).filter(isAssetOwnershipSelf).map(a=>{
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:null);
return{a,buku};
}).filter(x=>x.buku!=null&&x.buku>0);
if(!tracked.length){
return{holdingsCount:0,totalModal:0,totalNilai:0,gain:0,roiPct:0,yieldPct:null,best:null,worst:null,tracked:[]};
}
let totalModal=0,totalNilai=0,cagrSum=0,cagrWeight=0,best=null,worst=null;
const todayMs=new Date(todayStr()).getTime();
tracked.forEach(({a,buku})=>{
const nilai=a.nilai||0;
totalModal+=buku;totalNilai+=nilai;
const pct=(nilai-buku)/buku*100;
if(!best||pct>best.pct)best={name:a.name,pct};
if(!worst||pct<worst.pct)worst={name:a.name,pct};
if(a.tanggal){
const days=(todayMs-new Date(a.tanggal).getTime())/86400000;
if(days>=1){
const years=days/365;
const cagr=(Math.pow(nilai/buku,1/years)-1)*100;
if(isFinite(cagr)){cagrSum+=cagr*buku;cagrWeight+=buku;}
}
}
});
const gain=totalNilai-totalModal;
const roiPct=totalModal?(gain/totalModal*100):0;
const yieldPct=cagrWeight?(cagrSum/cagrWeight):null;
return{holdingsCount:tracked.length,totalModal,totalNilai,gain,roiPct,yieldPct,best,worst,tracked};
},
renderInvestasi(){
const box=document.getElementById('assetInvestasiDashboard');
if(!box)return;
const perf=Aset.investmentPerformance();
box.classList.remove('u-dnone');
if(!perf.holdingsCount){
const r=document.getElementById('assetInvestasiROI');if(r)r.textContent='—';
const y=document.getElementById('assetInvestasiYield');if(y)y.textContent='—';
const g=document.getElementById('assetInvestasiGain');if(g)g.innerHTML='';
const rk=document.getElementById('assetInvestasiRingkasan');if(rk)rk.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset dengan data modal (Modal Investasi, atau Harga Beli × Jumlah Unit) — isi salah satunya di 📋 Buku Aset supaya ROI/Yield bisa dihitung.</div>';
return;
}
const{totalModal,totalNilai,gain,roiPct,yieldPct,best,worst,tracked}=perf;
const gainCls=gain>=0?'green':'red';
const roiEl=document.getElementById('assetInvestasiROI');
if(roiEl)roiEl.innerHTML=`<b class="${gainCls}">${roiPct>=0?'+':''}${roiPct.toFixed(2)}%</b>`;
const gainEl=document.getElementById('assetInvestasiGain');
if(gainEl)gainEl.innerHTML=`<b class="${gainCls}">${fmtFullSigned(gain)} (${roiPct>=0?'+':''}${roiPct.toFixed(2)}%)</b>`;
const yieldEl=document.getElementById('assetInvestasiYield');
if(yieldEl){
yieldEl.innerHTML=(yieldPct==null)?'<span class="u-t2">Belum bisa dihitung (tanggal aset belum diisi / kurang dari 1 hari)</span>':
`<b class="${yieldPct>=0?'green':'red'}">${yieldPct>=0?'+':''}${yieldPct.toFixed(2)}%/tahun</b>`;
}
const ringkasanEl=document.getElementById('assetInvestasiRingkasan');
if(ringkasanEl){
let txt=`Dari <b>${tracked.length}</b> aset yang dilacak sbg investasi (ada data modal), total modal ${fmtFull(totalModal)} kini bernilai ${fmtFull(totalNilai)} — ${gain>=0?'untung':'rugi'} <b class="${gainCls}">${fmtFullSigned(gain)} (${roiPct>=0?'+':''}${roiPct.toFixed(2)}%)</b>`;
if(yieldPct!=null)txt+=`, setara ~${yieldPct>=0?'+':''}${yieldPct.toFixed(2)}%/tahun (CAGR)`;
txt+='.';
if(tracked.length>1&&best&&worst&&best.name!==worst.name){
txt+=` Kinerja terbaik: <b>${escapeHtml(best.name)}</b> (${best.pct>=0?'+':''}${best.pct.toFixed(2)}%), terendah: <b>${escapeHtml(worst.name)}</b> (${worst.pct>=0?'+':''}${worst.pct.toFixed(2)}%).`;
}
ringkasanEl.innerHTML=txt;
}
},
// Riwayat Transaksi -- khusus aset yang sudah ditautkan/punya Akun Transaksi (a.accountId).
// Pakai ulang filterTxModal (sama seperti Riwayat di tab Keuangan/Laporan) lewat scope
// baru 'account' di showFilteredTx() (lihat filter-laporan.js) supaya tidak duplikasi UI.
openTxHistory(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a){toast('⚠️ Aset tidak ditemukan');return;}
if(!a.accountId){toast('⚠️ Aset ini belum ditautkan ke Akun Transaksi');return;}
const acc=D.accounts.find(x=>sameId(x.id,a.accountId));
if(!acc){toast('⚠️ Akun Transaksi aset ini sudah terhapus');return;}
if(typeof showFilteredTx!=='function'){toast('⚠️ Fitur riwayat transaksi belum tersedia');return;}
showFilteredTx('account',undefined,'📜 Riwayat: '+acc.name,acc.id);
},
// AsetXLSX (bagian ke-10) — export/import data Buku Aset pakai format .xlsx, GANTI dari
// JSON/CSV sebelumnya (exportJSON/exportCSV/importJSON lama dihapus). Pola sama dgn
// ShopExport/ImportShopExcel di cobek.js: pustaka SheetJS di-lazy-load lewat ensureXLSX()
// (didefinisikan di index.html/app_production.html, sama seperti ensureJsPDF/ensureTesseract).
// Data export SELALU diambil live dari D.assets (bukan cache) biar sinkron pas tombol ditekan.
async _ensureXLSXLib(){
if(typeof XLSX!=='undefined')return true;
try{ await ensureXLSX(); }catch(e){ toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet'); return false; }
if(typeof XLSX==='undefined'){ toast('⚠️ Pustaka Excel tidak tersedia'); return false; }
return true;
},
async exportXLSX(){
const list=D.assets||[];
if(!list.length){toast('⚠️ Belum ada aset untuk di-export');return;}
if(!await Aset._ensureXLSXLib())return;
const rows=[['Nama','Jenis','Lokasi','Nilai','Modal Investasi','Harga Beli/Unit','Jumlah Unit','Tanggal','Zakatable','Akun Tertaut']];
list.forEach(a=>{
const accName=a.accountId?((D.accounts.find(x=>sameId(x.id,a.accountId))||{}).name||''):'';
rows.push([a.name,a.jenis,a.lokasi||'',a.nilai,a.modalInvestasi!=null?a.modalInvestasi:'',a.hargaBeli!=null?a.hargaBeli:'',a.jumlahUnit!=null?a.jumlahUnit:'',a.tanggal||'',a.zakatable?'Ya':'Tidak',accName]);
});
const wb=XLSX.utils.book_new();
const ws=XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb,ws,'Buku Aset');
XLSX.writeFile(wb,'aset-W-'+new Date().toISOString().split('T')[0]+'.xlsx');
toast('✅ '+list.length+' aset di-export');
},
// BUGFIX-PROTECTIVE: accountId dari file yang di-import SENGAJA tidak dipakai
// (selalu di-null-kan) -- id akun beda antar perangkat/backup, kalau ikut
// dipakai apa adanya bisa nyambung ke akun yang SALAH (kebetulan id-nya sama
// tapi akun berbeda) tanpa ada peringatan apapun ke user. Lebih aman minta
// user tautkan ulang manual lewat modal Edit Aset kalau memang perlu.
async importXLSX(e){
const file=e.target.files[0];if(!file)return;
if(!await Aset._ensureXLSXLib()){e.target.value='';return;}
let rows;
try{
const buf=await file.arrayBuffer();
const wb=XLSX.read(buf,{type:'array'});
const ws=wb.Sheets[wb.SheetNames[0]];
rows=XLSX.utils.sheet_to_json(ws,{defval:''});
}catch{
toast('❌ File tidak valid / rusak (bukan Excel)!');
e.target.value='';
return;
}
const arr=rows.map(r=>({
name:String(r['Nama']||'').trim(),
jenis:String(r['Jenis']||'').trim(),
lokasi:String(r['Lokasi']||'').trim(),
nilai:r['Nilai'],
modalInvestasi:r['Modal Investasi'],
hargaBeli:r['Harga Beli/Unit'],
jumlahUnit:r['Jumlah Unit'],
tanggal:String(r['Tanggal']||'').trim(),
zakatable:String(r['Zakatable']||'').trim().toLowerCase()==='ya'
}));
const valid=arr.filter(a=>a.name&&a.nilai!==''&&a.nilai!=null&&!isNaN(Number(a.nilai)));
const skipped=arr.length-valid.length;
if(!valid.length){
toast('⚠️ Tidak ada aset valid ditemukan di file ini');
e.target.value='';
return;
}
let msg='Ditemukan '+valid.length+' aset valid'+(skipped?' ('+skipped+' baris dilewati krn nama/nilai tidak lengkap)':'')+'. Aset ini akan DITAMBAHKAN ke Buku Aset yang sudah ada (bukan menimpa). Import sekarang?';
const confirmed=await askConfirm(msg,{danger:false,okText:'Ya, Import',icon:'📥'});
if(!confirmed){e.target.value='';return;}
D.assets=D.assets||[];
valid.forEach(a=>{
const nilai=Number(a.nilai)||0;
const modalInvestasi=a.modalInvestasi!=null&&a.modalInvestasi!==''?Number(a.modalInvestasi):null;
D.assets.push({
id:uid(),
name:String(a.name).trim(),
jenis:Aset.ICON[a.jenis]?a.jenis:'Lainnya',
lokasi:a.lokasi||'',
nilai,
tanggal:a.tanggal||todayStr(),
zakatable:!!a.zakatable,
accountId:null,
modalInvestasi,
hargaBeli:a.hargaBeli!=null&&a.hargaBeli!==''?Number(a.hargaBeli):null,
jumlahUnit:a.jumlahUnit!=null&&a.jumlahUnit!==''?Number(a.jumlahUnit):null,
keuntungan:modalInvestasi?(nilai-modalInvestasi):null,
keuntunganPct:modalInvestasi?((nilai-modalInvestasi)/modalInvestasi*100):null
});
});
save();
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
toast('✅ '+valid.length+' aset berhasil di-import'+(skipped?' ('+skipped+' dilewati)':''));
e.target.value='';
}
};
// ================= PENYUSUTAN ASET (bagian ke-11) =================
// FITUR BARU: Penyusutan (depreciation) — estimasi nilai buku aset yang nilainya
// MENURUN dari waktu ke waktu (kendaraan, bangunan, peralatan, dst), kebalikan
// dari "Ringkasan Performa Investasi" (renderInvestasi) di atas yang fokus ke
// aset yang nilainya naik/fluktuatif. 3 metode didukung, sesuai request:
//  - Garis Lurus (straight-line): beban penyusutan RATA tiap bulan sepanjang
//    umur manfaat, dari (Harga Perolehan − Nilai Residu) / Umur Manfaat, lalu
//    diprorata per bulan berjalan (bukan lompat 1x/tahun) supaya nilai buku
//    berubah halus. Nilai buku dibatasi tidak boleh turun di bawah Nilai Residu.
//  - Saldo Menurun (declining balance): tarif % diterapkan ke NILAI BUKU tahun
//    berjalan (bukan ke harga perolehan awal) tiap tahun PENUH yang sudah
//    lewat, sisa bulan di tahun berjalan diprorata linear dari tarif tahun itu.
//    Nominal penyusutan makin kecil tiap tahun (khas saldo menurun), floor di
//    Nilai Residu.
//  - Manual: TIDAK ada formula otomatis — nilai buku = field "Nilai" aset yang
//    sudah ada, di-update sendiri oleh user scr berkala lewat modal Edit Aset.
//    Fungsi manual() di sini cuma pass-through supaya API hitung() tetap
//    konsisten dipanggil dgn metode apapun tanpa percabangan di caller.
// "Harga Perolehan" dasar hitung diambil dari modalInvestasi (kalau diisi) atau
// hargaBeli×jumlahUnit — SAMA seperti dasar "Nilai Buku" di renderDashboard()/
// renderInvestasi(), supaya satu app konsisten definisi "harga perolehan"-nya.
// Kalau dua2nya kosong, Garis Lurus/Saldo Menurun tidak bisa dihitung (hitung()
// balikin hargaPerolehan:null, ditangani di renderList() dgn pesan minta diisi
// data modal dulu).
// Disimpan per-aset di a.penyusutan={aktif,metode,umurManfaatTahun,nilaiResidu,
// tarifPersen}. SENGAJA tidak dibatasi per jenis aset (siapa pun boleh
// diaktifkan) — sama filosofinya dgn modalInvestasi yg juga lintas-jenis (lihat
// catatan di renderInvestasi()), kartu UI cuma kasih hint aset apa yg lazim.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import,
// pola sama dgn renderDashboard()/renderInvestasi().
const Penyusutan={
METODE_LABELS:{garisLurus:'Garis Lurus',saldoMenurun:'Saldo Menurun',manual:'Manual'},
DEFAULTS:{metode:'garisLurus',umurManfaatTahun:4,nilaiResidu:0,tarifPersen:25},
// Harga Perolehan dasar hitung: sama dgn definisi "buku" di renderDashboard()/renderInvestasi().
hargaPerolehan(a){
if(!a)return null;
if(a.modalInvestasi!=null)return a.modalInvestasi;
if(a.hargaBeli!=null&&a.jumlahUnit!=null)return a.hargaBeli*a.jumlahUnit;
return null;
},
_monthsBetween(dariStr,keStr){
const dari=new Date(dariStr),ke=new Date(keStr);
if(isNaN(dari)||isNaN(ke))return 0;
let months=(ke.getFullYear()-dari.getFullYear())*12+(ke.getMonth()-dari.getMonth());
if(ke.getDate()<dari.getDate())months-=1;
return Math.max(0,months);
},
// Metode 1: Garis Lurus.
garisLurus(hargaPerolehan,nilaiResidu,umurManfaatTahun,tanggalPerolehan,tanggalHitung){
hargaPerolehan=Number(hargaPerolehan)||0;
nilaiResidu=Number(nilaiResidu)||0;
umurManfaatTahun=Number(umurManfaatTahun)||0;
if(hargaPerolehan<=0||umurManfaatTahun<=0||!tanggalPerolehan){
return{nilaiBuku:hargaPerolehan,akumulasi:0,bebanPerTahun:0,bebanPerBulan:0,bulanBerjalan:0,habisManfaat:false};
}
const nilaiDisusutkan=Math.max(0,hargaPerolehan-nilaiResidu);
const bebanPerTahun=nilaiDisusutkan/umurManfaatTahun;
const bebanPerBulan=bebanPerTahun/12;
const totalBulanManfaat=umurManfaatTahun*12;
const bulanBerjalanRaw=Penyusutan._monthsBetween(tanggalPerolehan,tanggalHitung||tanggalPerolehan);
const bulanEfektif=Math.max(0,Math.min(bulanBerjalanRaw,totalBulanManfaat));
const akumulasi=Math.min(nilaiDisusutkan,bebanPerBulan*bulanEfektif);
const nilaiBuku=Math.max(nilaiResidu,hargaPerolehan-akumulasi);
return{nilaiBuku,akumulasi,bebanPerTahun,bebanPerBulan,bulanBerjalan:bulanEfektif,habisManfaat:bulanBerjalanRaw>=totalBulanManfaat};
},
// Metode 2: Saldo Menurun.
saldoMenurun(hargaPerolehan,tarifPersen,nilaiResidu,tanggalPerolehan,tanggalHitung){
hargaPerolehan=Number(hargaPerolehan)||0;
tarifPersen=Number(tarifPersen)||0;
nilaiResidu=Number(nilaiResidu)||0;
if(hargaPerolehan<=0||tarifPersen<=0||!tanggalPerolehan){
return{nilaiBuku:hargaPerolehan,akumulasi:0,tahunBerjalan:0};
}
const bulanBerjalan=Penyusutan._monthsBetween(tanggalPerolehan,tanggalHitung||tanggalPerolehan);
const tahunPenuh=Math.floor(bulanBerjalan/12);
const sisaBulan=bulanBerjalan%12;
const tarif=Math.min(1,tarifPersen/100);
let nilaiBuku=hargaPerolehan;
for(let i=0;i<tahunPenuh&&nilaiBuku>nilaiResidu;i++){
nilaiBuku=Math.max(nilaiResidu,nilaiBuku*(1-tarif));
}
if(sisaBulan>0&&nilaiBuku>nilaiResidu){
const bebanBulanIni=nilaiBuku*tarif/12*sisaBulan;
nilaiBuku=Math.max(nilaiResidu,nilaiBuku-bebanBulanIni);
}
const akumulasi=Math.max(0,hargaPerolehan-nilaiBuku);
return{nilaiBuku,akumulasi,tahunBerjalan:bulanBerjalan/12};
},
// Metode 3: Manual — pass-through, nilai buku = nilai aset yang diisi user sendiri.
manual(nilaiSaatIni){
return{nilaiBuku:Number(nilaiSaatIni)||0,akumulasi:null,tahunBerjalan:null};
},
// Dispatcher: hitung nilai buku SEKARANG (atau di tanggalHitung tertentu) sesuai
// setting penyusutan yg tersimpan di aset (a.penyusutan). Balikin null kalau
// penyusutan belum diaktifkan utk aset ini.
hitung(a,tanggalHitung){
if(!a||!a.penyusutan||!a.penyusutan.aktif)return null;
const p=a.penyusutan;
const metode=p.metode||'garisLurus';
tanggalHitung=tanggalHitung||todayStr();
if(metode==='manual'){
return Object.assign({metode,hargaPerolehan:Penyusutan.hargaPerolehan(a)},Penyusutan.manual(a.nilai));
}
const hargaPerolehan=Penyusutan.hargaPerolehan(a);
if(hargaPerolehan==null){
return{metode,hargaPerolehan:null,nilaiBuku:a.nilai,akumulasi:null};
}
if(metode==='saldoMenurun'){
return Object.assign({metode,hargaPerolehan},Penyusutan.saldoMenurun(hargaPerolehan,p.tarifPersen,p.nilaiResidu,a.tanggal,tanggalHitung));
}
return Object.assign({metode,hargaPerolehan},Penyusutan.garisLurus(hargaPerolehan,p.nilaiResidu,p.umurManfaatTahun,a.tanggal,tanggalHitung));
},
// Nyalakan/matikan penyusutan utk 1 aset. Saat dinyalakan pertama kali (belum
// pernah punya a.penyusutan sama sekali), isi dgn DEFAULTS supaya field2 di UI
// langsung ada nilainya (bukan kosong/NaN).
toggleAktif(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)return;
a.penyusutan=a.penyusutan||Object.assign({},Penyusutan.DEFAULTS);
a.penyusutan.aktif=!a.penyusutan.aktif;
save();
Penyusutan.renderList();
},
// Update 1 parameter (metode/umurManfaatTahun/nilaiResidu/tarifPersen) dari kontrol
// per-baris di kartu Penyusutan. no-op kalau aset/penyusutan-nya belum ada (mis.
// race condition re-render), TIDAK bikin objek baru di sini spy tidak mem-bypass
// toggleAktif() sbg satu2nya titik nyalain penyusutan.
updateParam(id,field,rawValue){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a||!a.penyusutan)return;
if(field==='metode'){
a.penyusutan.metode=rawValue;
} else if(field==='nilaiResidu'){
a.penyusutan.nilaiResidu=parsePzNum(rawValue);
} else if(field==='umurManfaatTahun'){
a.penyusutan.umurManfaatTahun=parseDecStr(rawValue)||0;
} else if(field==='tarifPersen'){
a.penyusutan.tarifPersen=parseDecStr(rawValue)||0;
}
save();
Penyusutan.renderList();
},
// Render kartu "📉 Penyusutan Aset": 1 baris per aset (toggle aktif + kontrol
// metode & parameter kalau aktif + hasil hitung), plus total Akumulasi
// Penyusutan & total Nilai Buku Sekarang lintas aset yg aktif.
renderList(){
const card=document.getElementById('assetPenyusutanDashboard');
const box=document.getElementById('assetPenyusutanList');
if(!card||!box)return;
const list=D.assets||[];
card.classList.remove('u-dnone');
if(!list.length){
const ta=document.getElementById('assetPenyusutanTotalAkumulasi');if(ta)ta.textContent=fmtFull(0);
const tb=document.getElementById('assetPenyusutanTotalBuku');if(tb)tb.textContent=fmtFull(0);
box.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset tercatat — tambah aset pertama lewat 📋 Buku Aset di bawah, lalu aktifkan penyusutan per aset di sini.</div>';
return;
}
let totalAkumulasi=0,totalBuku=0;
box.innerHTML=list.map(a=>{
const aktif=!!(a.penyusutan&&a.penyusutan.aktif);
const p=a.penyusutan||Penyusutan.DEFAULTS;
const icon=Aset.ICON[a.jenis]||'📦';
let bodyHtml='';
if(aktif){
const hasil=Penyusutan.hitung(a);
const metode=p.metode||'garisLurus';
const metodeOpts=['garisLurus','saldoMenurun','manual'].map(m=>`<option value="${m}" ${m===metode?'selected':''}>${Penyusutan.METODE_LABELS[m]}</option>`).join('');
let fieldsHtml='';
if(metode==='garisLurus'){
fieldsHtml=`<div class="u-grid2 u-gap8 u-mb8">
        <div><label class="fl">Umur Manfaat (tahun)</label><input type="text" inputmode="numeric" class="fi" value="${p.umurManfaatTahun!=null?p.umurManfaatTahun:''}" onchange="Penyusutan.updateParam('${a.id}','umurManfaatTahun',this.value)"></div>
        <div><label class="fl">Nilai Residu (Rp)</label><input type="text" inputmode="numeric" class="fi" value="${p.nilaiResidu!=null?p.nilaiResidu:''}" onchange="Penyusutan.updateParam('${a.id}','nilaiResidu',this.value)"></div>
      </div>`;
} else if(metode==='saldoMenurun'){
fieldsHtml=`<div class="u-grid2 u-gap8 u-mb8">
        <div><label class="fl">Tarif per Tahun (%)</label><input type="text" inputmode="numeric" class="fi" value="${p.tarifPersen!=null?p.tarifPersen:''}" onchange="Penyusutan.updateParam('${a.id}','tarifPersen',this.value)"></div>
        <div><label class="fl">Nilai Residu (Rp)</label><input type="text" inputmode="numeric" class="fi" value="${p.nilaiResidu!=null?p.nilaiResidu:''}" onchange="Penyusutan.updateParam('${a.id}','nilaiResidu',this.value)"></div>
      </div>`;
} else {
fieldsHtml=`<div class="u-fs11 u-t2 u-mb8">Nilai buku = field "Nilai" aset ini, di-update manual sendiri lewat Edit Aset. Tidak ada formula otomatis di metode ini.</div>`;
}
let resultHtml='';
if(metode!=='manual'&&hasil.hargaPerolehan==null){
resultHtml=`<div class="u-fs11 u-cacc2">⚠️ Isi dulu Modal Investasi atau Harga Beli × Jumlah Unit di data aset ini supaya bisa dihitung.</div>`;
} else {
totalBuku+=hasil.nilaiBuku||0;
if(hasil.akumulasi!=null)totalAkumulasi+=hasil.akumulasi;
resultHtml=`<div class="u-fs12"><b>Nilai Buku Sekarang: ${fmtFull(hasil.nilaiBuku)}</b>${hasil.akumulasi!=null?' · Akumulasi Penyusutan: '+fmtFull(hasil.akumulasi):''}</div>`;
if(hasil.habisManfaat)resultHtml+=`<div class="u-fs11 u-t2 u-mt2">✅ Sudah mencapai akhir umur manfaat.</div>`;
}
bodyHtml=`<div class="fg" style="margin-bottom:8px"><label class="fl">Metode</label><select class="fs" onchange="Penyusutan.updateParam('${a.id}','metode',this.value)">${metodeOpts}</select></div>`+fieldsHtml+resultHtml;
}
return `<div class="u-r10 u-mb10" style="border:1px solid var(--border);padding:10px 12px">
      <div class="u-flex u-jcb u-aic u-mb8">
        <div class="u-fs13 u-fw600">${icon} ${escapeHtml(a.name)}</div>
        <label class="u-fs11 u-flex u-aic" style="gap:4px"><input type="checkbox" ${aktif?'checked':''} onchange="Penyusutan.toggleAktif('${a.id}')"> Aktif</label>
      </div>
      ${bodyHtml}
    </div>`;
}).join('');
const totalEl=document.getElementById('assetPenyusutanTotalAkumulasi');
if(totalEl)totalEl.textContent=fmtFull(totalAkumulasi);
const bukuEl=document.getElementById('assetPenyusutanTotalBuku');
if(bukuEl)bukuEl.textContent=fmtFull(totalBuku);
// Widget Rekomendasi AI (penyusutan-ai-widget.js) — opsional, di-guard supaya
// renderList() tetap aman kalau file itu belum/tidak dimuat. Container-nya
// (#assetPenyusutanAI) TERPISAH dari #assetPenyusutanList, pola sama dgn
// InvestAI.mountInto() di AlokasiAset.renderOne().
if(typeof PenyusutanAI!=='undefined'){
const aiEl=document.getElementById('assetPenyusutanAI');
if(aiEl)PenyusutanAI.mountInto(aiEl);
}
}
};
// ================= PAJAK ASET (bagian ke-12) =================
// FITUR BARU: Pajak Aset — estimasi 2 kewajiban yang nempel langsung ke aset
// yang tercatat di Buku Aset (BUKAN pengganti kalkulator umum di tab 🕌 Pajak
// yang sudah ada — PPh21/PBB manual/Zakat Maal lengkap dgn aset cair & utang
// -- ini scope-nya sengaja lebih sempit & auto-sync dari Buku Aset):
//  - PBB (Pajak Bumi & Bangunan): khusus aset berjenis 'Tanah' atau
//    'Rumah/Bangunan'. NJOP didekati dari field "Nilai" aset (Buku Aset tidak
//    simpan NJOP resmi terpisah) dikurangi NJOPTKP, dikali tarif PBB-P2.
//    NJOPTKP & tarif adalah SATU setting global (bukan per-aset) krn biasanya
//    sama utk semua properti di 1 daerah yang sama — disimpan di
//    D.pajakAsetSettings, default NJOPTKP Rp12.000.000 & tarif 0,5% (batas
//    maks menurut UU HKPD), TAPI beda tiap Pemda jadi selalu ada disclaimer
//    cek Perda/SPPT setempat (sama semangatnya dgn kartu PBB manual di tab
//    Pajak).
//  - Zakat Maal Aset: breakdown 2,5% KHUSUS dari aset yang ditandai
//    zakatable di Buku Aset (a.zakatable) — beda dari hitungZakatMaal() di
//    tab Pajak yang scope-nya lebih luas (ikut hitung aset cair & kurangi
//    utang). Di sini murni supaya user lihat aset MANA aja yg nyumbang &
//    berapa nominalnya per aset, tanpa perlu buka tab lain.
// Ringkasan Pajak menggabungkan total PBB + total Zakat Maal Aset jadi 1
// estimasi kewajiban tahunan per Buku Aset.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import,
// pola sama dgn Penyusutan.renderList().
const PajakAset={
DEFAULTS:{njoptkp:12000000,tarifPersen:0.5},
JENIS_PROPERTI:['Tanah','Rumah/Bangunan'],
settings(){
D.pajakAsetSettings=D.pajakAsetSettings||Object.assign({},PajakAset.DEFAULTS);
return D.pajakAsetSettings;
},
// Update setting global NJOPTKP/tarifPersen dari kontrol di kartu Pajak Aset.
updateSetting(field,rawValue){
if(field!=='njoptkp'&&field!=='tarifPersen')return;
const s=PajakAset.settings();
if(field==='njoptkp')s.njoptkp=parsePzNum(rawValue);
else s.tarifPersen=parseDecStr(rawValue)||0;
save();
PajakAset.renderList();
},
// Estimasi PBB 1 aset properti. null kalau bukan jenis Tanah/Rumah-Bangunan.
hitungPBB(a,settings){
if(!a||!PajakAset.JENIS_PROPERTI.includes(a.jenis))return null;
const s=settings||PajakAset.settings();
const njop=a.nilai||0;
const njoptkp=s.njoptkp||0;
const dasar=Math.max(0,njop-njoptkp);
const terutang=Math.round(dasar*(s.tarifPersen||0)/100);
return{njop,njoptkp,dasar,terutang};
},
zakatableAssets(){
return(D.assets||[]).filter(a=>a.zakatable);
},
// Breakdown Zakat Maal 2,5% khusus aset zakatable di Buku Aset (TANPA cek
// haul/nishab terpisah — itu urusan kalkulator Zakat Maal utama di tab Pajak).
hitungZakatAset(){
const list=PajakAset.zakatableAssets();
const totalNilai=list.reduce((s,a)=>s+(a.nilai||0),0);
const totalZakat=Math.round(totalNilai*0.025);
return{list,totalNilai,totalZakat};
},
// Render kartu "🧾 Pajak Aset": setting NJOPTKP/tarif, breakdown estimasi PBB
// per aset properti, breakdown Zakat Maal per aset zakatable, & Ringkasan
// Pajak (total gabungan). Kartu disembunyikan kalau tidak ada aset properti
// maupun aset zakatable sama sekali (belum relevan ditampilkan).
renderList(){
const card=document.getElementById('assetPajakDashboard');
const box=document.getElementById('assetPajakList');
if(!card||!box)return;
const properti=(D.assets||[]).filter(a=>PajakAset.JENIS_PROPERTI.includes(a.jenis));
const zakat=PajakAset.hitungZakatAset();
card.classList.remove('u-dnone');
if(!properti.length&&!zakat.list.length){
const tp=document.getElementById('assetPajakTotalPBB');if(tp)tp.textContent=fmtFull(0);
const tz=document.getElementById('assetPajakTotalZakat');if(tz)tz.textContent=fmtFull(0);
box.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset properti (tanah/bangunan) atau aset yang ditandai "Zakat" — tandai di 📋 Buku Aset supaya estimasi PBB/Zakat Maal muncul di sini.</div>';
return;
}
const s=PajakAset.settings();
// BUGFIX-PROTECTIVE: tidak overwrite input NJOPTKP/tarif kalau lagi difokus
// user (sedang diketik) supaya re-render (dipicu save/delete aset lain)
// tidak "melompat"/reset kursor di tengah ngetik.
const njoptkpEl=document.getElementById('pajakAsetNjoptkp');
if(njoptkpEl&&document.activeElement!==njoptkpEl)njoptkpEl.value=s.njoptkp;
const tarifEl=document.getElementById('pajakAsetTarif');
if(tarifEl&&document.activeElement!==tarifEl)tarifEl.value=s.tarifPersen;
let totalPBB=0;
const pbbHtml=properti.length?('<div class="u-fs12t2 u-fw700 u-mb6">🏛️ Estimasi PBB</div>'+properti.map(a=>{
const r=PajakAset.hitungPBB(a,s);
totalPBB+=r.terutang;
return `<div class="u-flex u-jcb u-aifs u-gap8 u-fs12 u-mb6"><span class="u-flex1">${Aset.ICON[a.jenis]||'📦'} ${escapeHtml(a.name)}</span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmtFull(r.terutang)}/th</span></div>`;
}).join('')):'';
const zakatHtml=zakat.list.length?('<div class="u-fs12t2 u-fw700 u-mb6 u-mt10">🕌 Zakat Maal per Aset (bukan Kekayaan Bersih)</div>'+zakat.list.map(a=>{
const z=Math.round((a.nilai||0)*0.025);
return `<div class="u-flex u-jcb u-aifs u-gap8 u-fs12 u-mb6"><span class="u-flex1">${Aset.ICON[a.jenis]||'📦'} ${escapeHtml(a.name)}</span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmtFull(z)}</span></div>`;
}).join('')):'';
box.innerHTML=(pbbHtml+zakatHtml)||'<div class="u-fs12 u-t2">Belum ada aset Tanah/Rumah-Bangunan atau aset zakatable.</div>';
const pbbEl=document.getElementById('assetPajakTotalPBB');
if(pbbEl)pbbEl.textContent=fmtFull(totalPBB);
const zakatEl=document.getElementById('assetPajakTotalZakat');
if(zakatEl)zakatEl.textContent=fmtFull(zakat.totalZakat);
const totalPajak=totalPBB+zakat.totalZakat;
const ringkasanEl=document.getElementById('assetPajakRingkasan');
if(ringkasanEl){
ringkasanEl.innerHTML=`📋 <b>Ringkasan Pajak:</b> estimasi total kewajiban pajak &amp; zakat dari Buku Aset ±<b>${fmtFull(totalPajak)}</b>/tahun — PBB ${fmtFull(totalPBB)} (${properti.length} aset properti) + Zakat Maal per Aset ${fmtFull(zakat.totalZakat)} (${zakat.list.length} aset zakatable, TIDAK termasuk Piutang/Utang). Estimasi kasar dari data Buku Aset, bukan angka resmi SPPT/lembaga zakat — cek Perda/BAZNAS setempat utk angka pasti. Untuk Zakat Maal lengkap (Saldo+Aset+Piutang−Utang), lihat kartu 💰 Zakat Maal di tab 🕌 Pajak.`;
}
}
};
// ================= LAPORAN ASET (bagian ke-13) =================
// FITUR BARU: Laporan Aset — satu kartu ringkas yang menggabungkan 5 hal yang
// sebelumnya cuma bisa dilihat kepencar di kartu2 lain, supaya bisa dibaca/
// dicetak jadi 1 laporan utuh: (1) Daftar Aset, (2) Riwayat Transaksi (dari
// akun2 yang ditautkan ke aset), (3) Nilai Aset (Pasar vs Buku + breakdown
// kategori — angka SAMA dgn Aset.renderDashboard(), dihitung ulang di sini
// spy modul ini berdiri sendiri/tidak bergantung urutan render kartu lain),
// (4) Penyusutan (ringkasan akumulasi & nilai buku sekarang, KHUSUS aset yg
// penyusutannya sudah Aktif — detail per-metode tetap di kartu 📉 Penyusutan
// Aset), dan (5) Ringkasan Kekayaan (dari Aset) — total nilai, kategori
// terbesar, & berapa yg zakatable. SENGAJA tidak mengulang scope kartu 🏦
// Kekayaan Bersih (renderKekayaanBersih, di luar file ini — itu gabungan
// akun+aset+utang) atau 🧾 Pajak Aset (PajakAset, PBB/Zakat) — laporan ini
// murni rekap sisi ASET saja spy tidak tumpang tindih & gampang dites sendiri.
// build() dipisah dari renderList() (pola sama dgn PajakAset.hitungZakatAset()
// vs renderList()) supaya logic murni bisa dites tanpa DOM.
const LaporanAset={
// Riwayat Transaksi: HANYA mencakup aset yang sudah ditautkan ke Akun Transaksi
// (a.accountId, sama syarat dgn Aset.openTxHistory()). D.transactions diasumsikan
// array flat berisi seluruh transaksi keuangan app (field minimal dipakai di sini:
// accountId, type ['income'|'expense'], amount, date, note) — kalau
// D.transactions belum ada/bukan array, dianggap kosong (tidak error).
riwayatTransaksi(){
const assets=(D.assets||[]).filter(a=>a.accountId);
const allTx=Array.isArray(D.transactions)?D.transactions:[];
const akunTertaut=assets.map(a=>{
const acc=(D.accounts||[]).find(x=>sameId(x.id,a.accountId));
const txAkun=acc?allTx.filter(t=>sameId(t.accountId,acc.id)):[];
const totalMasuk=txAkun.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount||0),0);
const totalKeluar=txAkun.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount||0),0);
return{assetId:a.id,assetName:a.name,accountId:a.accountId,accountName:acc?acc.name:null,accountExists:!!acc,jumlahTx:txAkun.length,totalMasuk,totalKeluar};
});
const accIds=akunTertaut.filter(x=>x.accountExists).map(x=>x.accountId);
const gabungan=allTx.filter(t=>accIds.some(id=>sameId(t.accountId,id)));
const recentTx=gabungan.slice().sort((x,y)=>new Date(y.date||0)-new Date(x.date||0)).slice(0,10);
return{akunTertaut,recentTx,totalTx:gabungan.length};
},
// Nilai Aset: total Nilai Pasar (a.nilai) vs Nilai Buku (modal/harga perolehan,
// definisi SAMA dgn Aset.renderDashboard()) + breakdown per kategori (jenis).
// S201 (Finalisasi Sinkronisasi Lintas Modul): fix — filter isAssetOwnershipSelf
// ditambahkan supaya BENAR-BENAR "SAMA dgn Aset.renderDashboard()" seperti
// diklaim komentar di atas (Sesi 193 sudah menambah filter ini di
// renderDashboard(), tapi LaporanAset.nilaiAset() sempat luput -> Dashboard
// Aset & Laporan Aset bisa beda angka kalau ada aset ber-ownership non-SELF).
// 0 rumus baru — reuse isAssetOwnershipSelf() yang sudah ada apa adanya.
nilaiAset(){
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
let totalPasar=0,totalBuku=0;
const perKategori={};
list.forEach(a=>{
const pasar=a.nilai||0;
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:pasar);
totalPasar+=pasar;totalBuku+=buku;
const jenis=a.jenis||'Lainnya';
if(!perKategori[jenis])perKategori[jenis]={count:0,nilai:0};
perKategori[jenis].count++;
perKategori[jenis].nilai+=pasar;
});
const selisih=totalPasar-totalBuku;
const selisihPct=totalBuku?(selisih/totalBuku*100):0;
return{totalPasar,totalBuku,selisih,selisihPct,perKategori};
},
// Penyusutan: rekap ringkas lintas aset yg penyusutannya AKTIF (detail per-metode
// tetap di kartu Penyusutan.renderList() — di sini cuma total utk laporan).
penyusutan(){
const list=(D.assets||[]).filter(a=>a.penyusutan&&a.penyusutan.aktif);
let totalAkumulasi=0,totalBukuSekarang=0,belumLengkap=0;
list.forEach(a=>{
const hasil=Penyusutan.hitung(a);
if(!hasil)return;
if(hasil.metode!=='manual'&&hasil.hargaPerolehan==null){belumLengkap++;return;}
totalBukuSekarang+=hasil.nilaiBuku||0;
if(hasil.akumulasi!=null)totalAkumulasi+=hasil.akumulasi;
});
return{jumlahAktif:list.length,totalAkumulasi,totalBukuSekarang,belumLengkap};
},
// Ringkasan Kekayaan (dari Aset) — SENGAJA cuma sisi aset (bukan gabungan akun+
// utang spt renderKekayaanBersih() global), supaya laporan ini murni & mandiri.
ringkasanKekayaan(){
// S201: filter isAssetOwnershipSelf() supaya jumlahAset KONSISTEN dgn
// totalNilaiPasar/totalNilaiBuku (nilaiAset(), sudah difilter di atas) —
// 1 laporan, 1 populasi aset yang sama, bukan jumlah dari populasi lebih
// besar dipasangkan dgn nilai dari populasi lebih kecil.
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
const nilai=LaporanAset.nilaiAset();
const zakat=(typeof PajakAset!=='undefined'?PajakAset.hitungZakatAset():{totalNilai:0,totalZakat:0,list:[]});
const kategoriRows=Object.entries(nilai.perKategori).sort((a,b)=>b[1].nilai-a[1].nilai);
const terbesar=kategoriRows.length?{jenis:kategoriRows[0][0],pct:nilai.totalPasar?(kategoriRows[0][1].nilai/nilai.totalPasar*100):0}:null;
return{jumlahAset:list.length,jumlahKategori:kategoriRows.length,totalNilaiPasar:nilai.totalPasar,totalNilaiBuku:nilai.totalBuku,totalZakatable:zakat.totalNilai,jumlahZakatable:zakat.list.length,kategoriTerbesar:terbesar};
},
// Gabungan semua data laporan (dipakai renderList() & bisa dipakai eksternal/test
// tanpa DOM sama sekali).
build(){
return{
daftarAset:(D.assets||[]).map(a=>({id:a.id,name:a.name,jenis:a.jenis,icon:Aset.ICON[a.jenis]||'📦',nilai:a.nilai||0,lokasi:a.lokasi||'',tanggal:a.tanggal||'',zakatable:!!a.zakatable,accountId:a.accountId||null})),
riwayatTransaksi:LaporanAset.riwayatTransaksi(),
nilaiAset:LaporanAset.nilaiAset(),
penyusutan:LaporanAset.penyusutan(),
ringkasanKekayaan:LaporanAset.ringkasanKekayaan()
};
},
// Render kartu "📑 Laporan Aset". Kartu disembunyikan kalau belum ada aset sama
// sekali (belum relevan ditampilkan) — pola sama dgn Penyusutan/PajakAset.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import.
renderList(){
const card=document.getElementById('laporanAsetCard');
if(!card)return;
card.classList.remove('u-dnone');
const data=LaporanAset.build();
// (1) Daftar Aset
const daftarEl=document.getElementById('lapAsetDaftar');
if(daftarEl){
daftarEl.innerHTML=data.daftarAset.map(a=>`<div class="lap-aset-row u-fs12"><span class="lap-aset-name">${a.icon} ${escapeHtml(a.name)}${a.zakatable?' 🕌':''}</span><span class="lap-aset-val">${fmtFull(a.nilai)}</span></div>`).join('')||'<div class="u-fs12 u-t2">Belum ada aset tercatat</div>';
}
// (2) Riwayat Transaksi
const riwayatEl=document.getElementById('lapAsetRiwayat');
if(riwayatEl){
const r=data.riwayatTransaksi;
const tertaut=r.akunTertaut.filter(x=>x.accountExists);
if(!tertaut.length){
riwayatEl.innerHTML='<div class="u-fs12 u-t2">Belum ada aset yang ditautkan ke Akun Transaksi.</div>';
} else {
riwayatEl.innerHTML=tertaut.map(x=>`<div class="u-fs12 u-mb6"><b>${escapeHtml(x.assetName)}</b> · 🔗 ${escapeHtml(x.accountName)} — ${x.jumlahTx} transaksi <span class="green">+${fmtFull(x.totalMasuk)}</span> / <span class="red">-${fmtFull(x.totalKeluar)}</span></div>`).join('')+`<div class="u-fs11 u-t2 u-mt6">Total ${r.totalTx} transaksi tercatat lintas akun tertaut.</div>`;
}
}
// (3) Nilai Aset
const nilaiEl=document.getElementById('lapAsetNilai');
if(nilaiEl){
const n=data.nilaiAset;
const cls=n.selisih>=0?'green':'red';
nilaiEl.innerHTML=`<div class="u-fs12 u-mb6">Nilai Pasar: <b>${fmtFull(n.totalPasar)}</b> · Nilai Buku: <b>${fmtFull(n.totalBuku)}</b></div><div class="u-fs12 ${cls}">Selisih: ${fmtFullSigned(n.selisih)} (${n.selisih>=0?'+':''}${n.selisihPct.toFixed(2)}%)</div>`;
}
// (4) Penyusutan
const penyusutanEl=document.getElementById('lapAsetPenyusutan');
if(penyusutanEl){
const p=data.penyusutan;
penyusutanEl.innerHTML=p.jumlahAktif?`<div class="u-fs12">${p.jumlahAktif} aset aktif penyusutan · Akumulasi ${fmtFull(p.totalAkumulasi)} · Nilai Buku Sekarang ${fmtFull(p.totalBukuSekarang)}</div>`:'<div class="u-fs12 u-t2">Belum ada aset yang mengaktifkan penyusutan.</div>';
}
// (5) Ringkasan Kekayaan
const ringkasanEl=document.getElementById('lapAsetRingkasan');
if(ringkasanEl){
const rk=data.ringkasanKekayaan;
let txt=`📦 <b>${rk.jumlahAset}</b> aset di <b>${rk.jumlahKategori}</b> kategori, total nilai pasar <b>${fmtFull(rk.totalNilaiPasar)}</b> (nilai buku ${fmtFull(rk.totalNilaiBuku)})`;
if(rk.kategoriTerbesar)txt+=`. Kategori terbesar: <b>${escapeHtml(rk.kategoriTerbesar.jenis)}</b> (${rk.kategoriTerbesar.pct.toFixed(1)}%)`;
if(rk.jumlahZakatable)txt+=`. ${rk.jumlahZakatable} aset zakatable senilai ${fmtFull(rk.totalZakatable)}`;
txt+='.';
ringkasanEl.innerHTML=txt;
}
}
};
const IDBStore={
_dbPromise:null,
DB_NAME:'kw_idb_v1',
STORE:'kv',
_open(){
if(IDBStore._dbPromise)return IDBStore._dbPromise;
IDBStore._dbPromise=new Promise((resolve,reject)=>{
if(!window.indexedDB){reject(new Error('IndexedDB tidak didukung browser ini'));return;}
let req;
try{ req=indexedDB.open(IDBStore.DB_NAME,1); }catch(e){reject(e);return;}
req.onupgradeneeded=()=>{ try{ req.result.createObjectStore(IDBStore.STORE); }catch(e){} };
req.onsuccess=()=>{
const db=req.result;
// BUGFIX: kalau koneksi ini ditutup (mis. tab lain upgrade versi DB, atau
// browser menutup koneksi idle) TANPA reset di sini, _dbPromise tetap
// nyimpen janji lama yg resolve ke objek IDBDatabase yg sudah "closing" --
// pemanggilan .transaction() berikutnya lewat cache itu bakal langsung
// lempar InvalidStateError. Makanya begitu koneksi ditutup dgn cara apa
// pun, cache di-null-kan supaya panggilan _open() berikutnya buka koneksi
// baru yang sehat.
db.onversionchange=()=>{ try{db.close();}catch(e){} IDBStore._dbPromise=null; };
db.onclose=()=>{ IDBStore._dbPromise=null; };
resolve(db);
};
req.onerror=()=>{ IDBStore._dbPromise=null; reject(req.error||new Error('Gagal membuka IndexedDB')); };
});
return IDBStore._dbPromise;
},
async get(key){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readonly');
const req=tx.objectStore(IDBStore.STORE).get(key);
req.onsuccess=()=>resolve(req.result);
req.onerror=()=>reject(req.error||new Error('Gagal membaca dari IndexedDB'));
});
},'get("'+key+'")',undefined);
},
async set(key,value){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readwrite');
tx.objectStore(IDBStore.STORE).put(value,key);
tx.oncomplete=()=>resolve(true);
tx.onerror=()=>reject(tx.error||new Error('Gagal menulis ke IndexedDB'));
});
},'set("'+key+'")',false);
},
// BARU (item "BELUM DIKERJAKAN" resetApp(): dulu resetApp() cuma localStorage.clear(),
// tidak pernah menyentuh IndexedDB -- lihat docs/CATATAN-CEK-CLAUDE.md). Mengosongkan
// SELURUH object store 'kv' (termasuk kw_v4_mirror, lifeos:store, eie:store, ai:store,
// dst -- semua key yg lewat IDBStore.set()), bukan cuma 1 key, karena reset total memang
// harus membersihkan semua mirror data, bukan cuma mirror utama.
async clear(){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readwrite');
tx.objectStore(IDBStore.STORE).clear();
tx.oncomplete=()=>resolve(true);
tx.onerror=()=>reject(tx.error||new Error('Gagal mengosongkan IndexedDB'));
});
},'clear()',false);
},
// BUGFIX: pembungkus retry -- kalau kegagalan disebabkan koneksi yg lagi
// closing/invalid (InvalidStateError, atau nama "closing" khas Safari),
// buang cache _dbPromise & coba SEKALI lagi dgn koneksi baru sebelum
// benar-benar menyerah. Menghindari error IndexedDB numpuk terus tiap
// kali koneksi lama jadi basi (mis. abis hot-reload pas dev).
async _withRetry(fn,label,fallback){
try{
return await fn();
}catch(e){
const staleConn=e&&(e.name==='InvalidStateError'||/closing/i.test(e.message||''));
if(staleConn){
IDBStore._dbPromise=null;
try{ return await fn(); }
catch(e2){ console.error('IndexedDB '+label+' gagal (setelah retry):',e2); return fallback; }
}
console.error('IndexedDB '+label+' gagal:',e);
return fallback;
}
}
};
const PORTFOLIO_LABELS={
nilai:/nilai\s*(sekarang|saat\s*ini)/i,
modal:/modal\s*investasi/i,
hargaBeli:/harga\s*(beli|perolehan)/i,
// BUGFIX (laporan user): layar "Detail Portofolio" per-instrumen Bibit pakai label
// "Total Unit" (bukan "Jumlah Unit" seperti halaman Bibit lain) utk field yang sama --
// tambahkan sbg alternatif, TIDAK mengganti "jumlah unit" yang sudah ada.
jumlahUnit:/(?:jumlah|total)\s*unit/i
};
const TimelineW={
avgSurplus(){
if(typeof Pensiun!=='undefined')return Pensiun.avgSurplus();
return{surplus:0,months:0};
},
goals(){
const goals=[];
(D.renovProjects||[]).forEach(p=>{
if(typeof Renov==='undefined')return;
const t=Renov.totals(p);
if(t.sisa>0)goals.push({key:'renov-'+p.id,emoji:'🔨',label:'Renovasi: '+p.name,remaining:t.sisa,kind:'renov'});
});
(D.targets||[]).forEach(t=>{
if(t.isDanaDarurat)return;
const remaining=Math.max(0,(t.amount||0)-(t.saved||0));
if(remaining>0)goals.push({key:'target-'+t.id,emoji:t.emoji||'🎯',label:t.name,remaining,kind:'target'});
});
return goals;
},
waterfall(){
const{surplus,months}=TimelineW.avgSurplus();
const goals=TimelineW.goals();
let cursor=0;
const rows=goals.map(g=>{
const monthsNeeded=surplus>0?Math.ceil(g.remaining/surplus):null;
const startMonth=cursor;
const endMonth=monthsNeeded!=null?cursor+monthsNeeded:null;
if(endMonth!=null)cursor=endMonth;
return{...g,monthsNeeded,startMonth,endMonth};
});
return{rows,surplus,surplusMonths:months};
},
addMonthsToDate(n){
const d=new Date();
d.setDate(1);
d.setMonth(d.getMonth()+n);
return d;
},
render(){
const card=document.getElementById('timelineWCard');
if(!card)return;
const{rows,surplus,surplusMonths}=TimelineW.waterfall();
const pensiunP=D.pensiun||{};
const pensiunAda=pensiunP.usiaSekarang&&pensiunP.usiaPensiun&&pensiunP.accId;
if(!rows.length&&!pensiunAda){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
let body='';
if(surplus<=0){
body+=`<div class="u-fs12 u-cacc2 u-r10 u-mb10 u-lh15" style="background:var(--accent2-soft);padding:8px 10px">⚠️ Rata-rata ${surplusMonths} bulan terakhir belum surplus (pemasukan ≤ pengeluaran), jadi linimasa di bawah belum bisa diproyeksikan realistis. Perbaiki dulu arus kas bulanan atau isi manual di masing-masing modul.</div>`;
} else {
body+=`<div class="u-fs11 u-t2 u-mb10 u-lh15">Diasumsikan seluruh rata-rata surplus ${surplusMonths} bulan terakhir (${fmtFull(surplus)}/bln) dipakai berurutan sesuai urutan di bawah. Ilustrasi, bukan alokasi otomatis.</div>`;
}
body+=rows.map((r,i)=>{
const dateLabel=(r.endMonth!=null)?TimelineW.addMonthsToDate(r.endMonth).toLocaleDateString('id-ID',{month:'long',year:'numeric'}):'—';
const yrs=r.monthsNeeded!=null?Math.floor(r.monthsNeeded/12):null;
const bln=r.monthsNeeded!=null?r.monthsNeeded%12:null;
const durLabel=r.monthsNeeded!=null?`${yrs?yrs+' th ':''}${bln} bln lagi (mulai bulan ke-${r.startMonth+1})`:'—';
return `<div style="display:flex;gap:10px;margin-bottom:${i===rows.length-1&&!pensiunAda?'0':'12px'}">
        <div class="u-flex u-fdcol u-aic">
          <div class="u-bgaccsoft u-flex u-aic u-jcc u-fs13" style="width:26px;height:26px;border-radius:50%">${r.emoji}</div>
          ${(i<rows.length-1||pensiunAda)?'<div class="u-flex1 u-mt2" style="width:2px;background:var(--border)"></div>':''}
        </div>
        <div class="u-flex1" style="padding-bottom:2px">
          <div class="u-fs13 u-fw700">${escapeHtml(r.label)}</div>
          <div class="u-fs11 u-t2 u-mt2">Sisa ${fmt(r.remaining)} · target selesai ~<b>${dateLabel}</b></div>
          <div class="u-fs11 u-t2">${durLabel}</div>
        </div>
      </div>`;
}).join('');
if(pensiunAda){
const n=Pensiun.sisaBulan();
const years=Math.floor(n/12),sisaBln=n%12;
const target=Number(pensiunP.targetDana)||0;
const proyeksi=Pensiun.proyeksi();
const onTrack=target>0&&proyeksi>=target;
body+=`<div class="u-flex u-gap10">
        <div class="u-flex u-fdcol u-aic">
          <div class="u-flex u-aic u-jcc u-fs13" style="width:26px;height:26px;border-radius:50%;background:var(--accent3-soft)">🏖️</div>
        </div>
        <div class="u-flex1">
          <div class="u-fs13 u-fw700">Pensiun (usia ${pensiunP.usiaSekarang}→${pensiunP.usiaPensiun})</div>
          <div class="u-fs11 u-t2 u-mt2">${years>0?years+' th ':''}${sisaBln} bln lagi · proyeksi dana ${fmt(proyeksi)}${target>0?' dari target '+fmt(target):''}</div>
          <div style="margin-top:1px" class="${onTrack?'green':'orange'} u-fs11 u-fw700">${target>0?(onTrack?'✅ Proyeksi on-track':'⚠️ Proyeksi masih kurang '+fmt(target-proyeksi)):'Isi target di modul Pensiun utk cek gap'}</div>
        </div>
      </div>`;
} else if(!rows.length){
card.style.display='none';return;
}
card.innerHTML=`<div class="card-title">🗺️ Linimasa Tujuan Finansial <span class="card-collapse-toggle" id="timelineWCard-chev" data-action="toggleCardCollapse" data-args='["timelineWCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="timelineWCard-cbody">`+body+`</div>`;
applyOneCardCollapsePref('timelineWCard');
}
};
// BUGFIX-INTEGRASI: semua modul di atas dideklarasikan `const`, yang TIDAK
// otomatis nempel ke `window` walau file ini di-load lewat <script> biasa
// setAsetTab — split halaman Aset (page-aset) jadi 3 tab (Ringkasan/Buku
// Aset/Analisis & Pajak), pola SAMA PERSIS dgn setKeuanganTab (tx-list-cashflow.js)
// /setShopTab/setCnTab/setPajakTab: toggle class u-dnone per pane, TIDAK ada
// business logic baru. Semua card di dalam pane tetap dirender penuh oleh
// renderAssetList()/AlokasiAset.init()/renderWealthSnapshots() (dipanggil dari
// renderPageContent('aset') di modules-render.js) TERLEPAS dari tab mana yang
// lagi aktif -- sama seperti pola kartu ber-collapse yg sudah ada di app ini,
// cuma sekarang levelnya per-tab, bukan per-kartu.
const ASET_TAB_ORDER=['ringkasan','buku','analisis','manajemen'];
function setAsetTab(t,el){
const asetTabBtns=document.querySelectorAll('#page-aset .cn-tab');
asetTabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=ASET_TAB_ORDER.indexOf(t); const btn=asetTabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('asetTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('asetTab-buku').classList.toggle('u-dnone', t!=='buku');
document.getElementById('asetTab-analisis').classList.toggle('u-dnone', t!=='analisis');
// Manajemen (dipindah dari Dashboard Hub) — pola sama 3 tab di atas.
document.getElementById('asetTab-manajemen').classList.toggle('u-dnone', t!=='manajemen');
}

// (bukan module). Dispatcher data-action (mis. data-action="Aset.exportXLSX",
// "AlokasiAset.setRisk", dst di index.html/app_production.html) resolve nama
// aksi lewat window[...], jadi TANPA baris ini semua binding tsb gagal diam2
// di production walau unit test tetap hijau (test harness expose modul
// langsung lewat context, bukan lewat window). Pola sama persis dgn bug
// OngkirCalc di cobek-pricing.js yg sudah pernah kejadian & diperbaiki
// sebelumnya — lihat CLAUDE.md.
// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 5/6: fungsi prediktif domain ASSET.
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. "Inventory" SENGAJA
// DI-SKIP sesi ini (keputusan eksplisit) — lihat catatan sama di
// modules/finance/tx-list-cashflow.js. PURE/read-only, TIDAK PERNAH
// memanggil save(). Belum ada UI/tombol baru, belum ada wiring otomatis
// (itu tugas Sesi 6).
//
// predictAssetValue() SENGAJA tidak menduplikasi Penyusutan.hitung() —
// dia cuma memanggil fungsi itu dengan tanggalHitung di MASA DEPAN (bukan
// hari ini), karena Penyusutan.hitung() memang sudah menerima parameter
// tanggal sembarang, bukan cuma "sekarang". Kalau aset TIDAK punya
// penyusutan aktif, tidak ada model pertumbuhan/penurunan nilai yang bisa
// dipakai (rule-based, bukan tebak-tebakan) — nilai diasumsikan flat, sama
// filosofinya dgn estimateKmPerDay() yg balikin null kalau histori kurang.
// ---------------------------------------------------------------------------

// predictAssetValue({assetId, monthsAhead}) — proyeksi nilai buku 1 aset N
// bulan ke depan. Kalau aset punya penyusutan aktif (a.penyusutan.aktif),
// nilai prediksi = Penyusutan.hitung(a, tanggalMasaDepan).nilaiBuku (metode
// Garis Lurus/Saldo Menurun/Manual sesuai setting aset itu). Kalau tidak,
// balikin nilai flat (nilai sekarang) dgn metode:'flat' supaya pemanggil
// tahu ini bukan proyeksi asli, cuma nilai apa adanya.
function predictAssetValue({assetId,monthsAhead=12}={}){
const a=(D.assets||[]).find(x=>sameId(x.id,assetId));
if(!a)return{ok:false,reason:'Aset tidak ditemukan'};
const now=new Date();
const target=new Date(now.getFullYear(),now.getMonth()+monthsAhead,now.getDate());
const targetISO=dateToISO(target);
if(a.penyusutan&&a.penyusutan.aktif&&typeof Penyusutan!=='undefined'){
const hasil=Penyusutan.hitung(a,targetISO);
return{ok:true,assetId,assetName:a.name,nilaiSaatIni:a.nilai,nilaiPrediksi:hasil.nilaiBuku,metode:hasil.metode,monthsAhead,targetDate:targetISO};
}
return{ok:true,assetId,assetName:a.name,nilaiSaatIni:a.nilai,nilaiPrediksi:a.nilai,metode:'flat',monthsAhead,targetDate:targetISO};
}

// netWorthForecast({monthsAhead}) — proyeksi Kekayaan Bersih N bulan ke
// depan, dari Kekayaan.currentNetWorth() (nilai sekarang) di-compound pakai
// dua sumber, sesuai data yang tersedia (fallback berjenjang, tidak pernah
// mengarang angka):
//  1) Kekayaan.actualCAGR() — kalau histori snapshot (D.wealthSnapshots)
//     cukup (≥2 titik, rentang ≥25 hari, baseline & terakhir positif),
//     pakai growth rate historis nyata (metode:'cagr-snapshot').
//  2) predictCashflow() (tx-list-cashflow.js) — kalau snapshot belum cukup,
//     pakai proyeksi surplus/defisit kas bulanan (incAvg-expAvg) sbg
//     pertumbuhan kekayaan bersih linear (metode:'cashflow-delta'). Ini
//     TIDAK memperhitungkan perubahan nilai aset non-kas (mis. penyusutan),
//     jadi lebih kasar drpd opsi 1.
//  3) Kalau keduanya tidak tersedia, balikin {ok:false} apa adanya.
function netWorthForecast({monthsAhead=6}={}){
if(typeof Kekayaan==='undefined')return{ok:false,reason:'Kekayaan belum dimuat'};
const netWorthNow=Kekayaan.currentNetWorth();
const cagrResult=Kekayaan.actualCAGR();
const now=new Date();
const months=[];
if(cagrResult&&cagrResult.cagr!=null){
const monthlyRate=Math.pow(1+cagrResult.cagr,1/12)-1;
let nw=netWorthNow;
for(let i=1;i<=monthsAhead;i++){
nw=nw*(1+monthlyRate);
const d=new Date(now.getFullYear(),now.getMonth()+i,1);
months.push({month:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),netWorthProjected:nw});
}
return{ok:true,netWorthNow,metode:'cagr-snapshot',monthlyRate,months,projectedEnd:nw};
}
if(typeof predictCashflow==='function'){
const cf=predictCashflow({monthsAhead});
if(cf.ok){
let nw=netWorthNow;
cf.months.forEach((m)=>{
nw+=cf.monthlyNet;
months.push({month:m.month,netWorthProjected:nw});
});
return{ok:true,netWorthNow,metode:'cashflow-delta',monthlyNet:cf.monthlyNet,months,projectedEnd:nw};
}
}
return{ok:false,reason:'Data histori (snapshot kekayaan / transaksi) belum cukup untuk proyeksi'};
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 8: rule domain ASSET utk AIDecision (lanjutan
// Sesi 7 — lihat RENCANA-SESI-RINGKAS.md). Rule: "proyeksi Kekayaan Bersih N
// bulan ke depan (netWorthForecast()) TURUN dari nilai sekarang" — dgn kata
// lain, tren negatif (bukan ambang nominal, karena "berapa Rp yang wajar
// turun" beda-beda per orang; tren negatif sudah cukup jadi sinyal awal).
// Cooldown lebih panjang (168 jam = mingguan) drpd rule finance karena aset &
// kekayaan bersih berubah lambat, tidak perlu re-alert tiap kali ada 1
// transaksi aset. TIDAK menduplikasi apa pun di UI Laporan Aset — rule ini
// masuk decisionLog AIDecision (dailyBriefing/simulate), bukan render kartu.
// ---------------------------------------------------------------------------

// _assetNetWorthDeclineCheck() — helper dipakai condition() & action().
function _assetNetWorthDeclineCheck(){
if(typeof netWorthForecast!=='function')return{trigger:false};
const fc=netWorthForecast({monthsAhead:6});
if(!fc.ok)return{trigger:false};
return{trigger:fc.projectedEnd<fc.netWorthNow,netWorthNow:fc.netWorthNow,projectedEnd:fc.projectedEnd,metode:fc.metode};
}

// ---------------------------------------------------------------------------
// Rule kedua ASSET (keputusan produk dikonfirmasi user): 'asset-zakat-due' —
// ada aset zakatable di Buku Aset dgn estimasi Zakat Maal (PajakAset.
// hitungZakatAset(), sudah ada) > 0. Ini PENGINGAT BERKALA (cooldown
// mingguan, sama spt asset-networth-declining), BUKAN pengecekan "sudah/belum
// dibayar" — app ini TIDAK menyimpan histori tanggal pembayaran zakat/haul
// sama sekali (dicek: tidak ada field itu di data manapun), jadi rule ini
// SENGAJA tidak berpura-pura tahu status bayar, cuma mengingatkan berkala
// selama estimasi Zakat Maal >= ambang nominal (default Rp0, artinya sama
// spt semula: trigger begitu ada zakat sama sekali) — sama semangatnya dgn
// hitungZakatAset() sendiri yang juga "TANPA cek haul/nishab terpisah".
// Ambang BISA DIATUR user (Sesi lanjutan, pola sama dgn getAIFinance-
// OverspendThreshold/getAIDeliveryThinMarginThreshold) lewat
// D.profile.aiAssetZakatMinThresholdRp, field baru di Pengaturan > 🤖 AI
// Asisten — berguna kalau user mau di-skip untuk zakat estimasi yang masih
// kecil/receh.
// ---------------------------------------------------------------------------
const AI_ASSET_ZAKAT_MIN_DEFAULT_RP=0;

// getAIAssetZakatMinThreshold()/setAIAssetZakatMinThreshold(rp) — getter/
// setter D.profile.aiAssetZakatMinThresholdRp, dipakai field Pengaturan
// (renderSettings()/autoSaveProfile()) & rule di bawah. Dijaga >=0.
function getAIAssetZakatMinThreshold(){
const v=D.profile&&D.profile.aiAssetZakatMinThresholdRp;
return(typeof v==='number'&&v>=0)?v:AI_ASSET_ZAKAT_MIN_DEFAULT_RP;
}
function setAIAssetZakatMinThreshold(rp){
const n=parseFloat(rp);
D.profile.aiAssetZakatMinThresholdRp=(Number.isFinite(n)&&n>=0)?n:AI_ASSET_ZAKAT_MIN_DEFAULT_RP;
return D.profile.aiAssetZakatMinThresholdRp;
}

function _assetZakatDueCheck(){
if(typeof PajakAset==='undefined'||typeof PajakAset.hitungZakatAset!=='function')return{trigger:false};
const z=PajakAset.hitungZakatAset();
const minThreshold=getAIAssetZakatMinThreshold();
return{trigger:z.totalZakat>minThreshold,totalNilai:z.totalNilai,totalZakat:z.totalZakat,jumlah:z.list.length,minThreshold};
}

let _assetAIRulesRegistered=false;
// registerAssetAIRules() — dipanggil sekali saat boot (self-test.js init()),
// idempotent lewat guard, return false kalau AIDecision belum ada.
function registerAssetAIRules(){
if(_assetAIRulesRegistered)return false;
if(typeof AIDecision==='undefined'||!AIDecision.rules||typeof AIDecision.rules.register!=='function')return false;
AIDecision.rules.register({
id:'asset-networth-declining',
category:'asset',
severity:'warning',
weight:4,
cooldownHours:168,
description:'Proyeksi Kekayaan Bersih 6 bulan ke depan (netWorthForecast) turun dari nilai sekarang.',
condition:()=>_assetNetWorthDeclineCheck().trigger,
action:()=>{
const c=_assetNetWorthDeclineCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Proyeksi Kekayaan Bersih 6 bulan ke depan turun dari ${fmt(c.netWorthNow)} ke ${fmt(c.projectedEnd)} (metode: ${c.metode}).`};
},
});
AIDecision.rules.register({
id:'asset-zakat-due',
category:'asset',
severity:'info',
weight:3,
cooldownHours:168,
description:'Ada aset zakatable di Buku Aset dengan estimasi Zakat Maal di atas ambang nominal (bisa diatur user, default Rp0) — pengingat berkala, TIDAK mengecek status sudah/belum dibayar (app belum menyimpan histori pembayaran zakat).',
condition:()=>_assetZakatDueCheck().trigger,
action:()=>{
const c=_assetZakatDueCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Estimasi Zakat Maal dari ${c.jumlah} aset zakatable (total nilai ${fmt(c.totalNilai)}) sekitar ${fmt(c.totalZakat)} — cek kartu 🧾 Pajak Aset kalau belum dibayar tahun ini.`};
},
});
_assetAIRulesRegistered=true;
return true;
}

Object.assign(window,{ALOKASI_PRESETS,AlokasiAset,AssetInsight,Aset,Penyusutan,PajakAset,LaporanAset,IDBStore,PORTFOLIO_LABELS,TimelineW});
