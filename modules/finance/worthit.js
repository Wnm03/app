// worthit.js — Domain Worth It? & Prioritas Belanja: cek kondisi keuangan sebelum belanja + daftar prioritas barang yang mau dibeli
// Dipindah ke modules/finance/worthit.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul WorthIt dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js (v62).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const WorthIt={
// Pertanyaan tambahan per Kategori (KW-165 lanjutan, "Sisa #5 Worth It?") — sebelumnya wiCategory/
// wlCategory cuma dropdown polos Kebutuhan/Keinginan tanpa pertanyaan lanjutan. Pola sama persis
// vehJenisFieldsHtml()/onVehJenisChange() di modules/vehicle/vehicle-core.js: fungsi murni
// (catFieldsHtml, tidak sentuh DOM) + fungsi wiring (onCategoryChange, baca/tulis DOM).
CAT_FIELDS:{
kebutuhan:{id:'AlasanKebutuhan',label:'Alasan Kebutuhan',options:[
['rusak','🔧 Barang lama rusak/tidak berfungsi'],
['habis','📦 Sudah habis, perlu restock'],
['belum_punya','🆕 Belum pernah punya, tapi memang perlu'],
['wajib','📌 Wajib/keharusan (kerja, sekolah, dll)']
]},
keinginan:{id:'SejakKapan',label:'Sudah Kepikiran Sejak Kapan?',options:[
['baru_lihat','👀 Baru lihat/kepikiran'],
['beberapa_hari','📅 Beberapa hari terakhir'],
['lama','⏳ Sudah lama diincar/direncanakan']
]}
},
// PURE (tidak sentuh DOM/D) — dites di tests/worthit-jenis.test.js.
catFieldsHtml(cat,prefix,val){
const def=WorthIt.CAT_FIELDS[cat];
if(!def)return '';
const id=prefix+def.id;
const opts=def.options.map(o=>'<option value="'+o[0]+'"'+(val===o[0]?' selected':'')+'>'+o[1]+'</option>').join('');
return '<div class="fg u-mb8"><label class="fl">'+def.label+'</label><select class="fs" id="'+id+'">'+opts+'</select></div>';
},
onCategoryChange(prefix,presetVal){
const catEl=document.getElementById(prefix+'Category');
const wrap=document.getElementById(prefix+'CatFieldsWrap');
if(!catEl||!wrap)return;
wrap.innerHTML=WorthIt.catFieldsHtml(catEl.value,prefix,presetVal);
},
readCatExtra(cat,prefix){
const def=WorthIt.CAT_FIELDS[cat];
if(!def)return null;
const el=document.getElementById(prefix+def.id);
return el?el.value:null;
},
open(){
['wiName','wiPrice','wiDP','wiTenor','wiCicilanBulan','wiHargaNormal'].forEach(id=>{document.getElementById(id).value='';});
document.getElementById('wiCategory').value='keinginan';
WorthIt.onCategoryChange('wi');
document.getElementById('wiMethod').value='tunai';
document.getElementById('wiIsDiskon').checked=false;
WorthIt.onMethodChange();
WorthIt.toggleDiskon();
document.getElementById('wiResultBox').style.display='none';
WorthIt._last=null;
WorthIt.switchTab('single');
openModal('worthItModal');
},
switchTab(tab){
document.getElementById('wiTabSingle').style.display=tab==='single'?'block':'none';
document.getElementById('wiTabList').style.display=tab==='list'?'block':'none';
document.getElementById('wiTabWatch').style.display=tab==='watch'?'block':'none';
document.getElementById('wiTabBtnSingle').classList.toggle('active',tab==='single');
document.getElementById('wiTabBtnList').classList.toggle('active',tab==='list');
document.getElementById('wiTabBtnWatch').classList.toggle('active',tab==='watch');
if(tab==='list'){
WorthIt.cancelEditList();
WorthIt.boughtViewOpen=true;WorthIt.toggleBoughtView();
WorthIt.renderList();
}else if(tab==='watch'){
WorthIt.PW.render();
}
},
reset(){
document.getElementById('wiResultBox').style.display='none';
document.getElementById('wiName').focus();
},
onMethodChange(){
const m=document.getElementById('wiMethod').value;
document.getElementById('wiCicilanFields').style.display=m==='cicilan'?'block':'none';
},
toggleDiskon(){
const on=document.getElementById('wiIsDiskon').checked;
document.getElementById('wiDiskonFields').style.display=on?'block':'none';
if(!on)document.getElementById('wiDiskonInfo').innerHTML='';
WorthIt.syncDiskon();
},
syncDiskon(){
const infoEl=document.getElementById('wiDiskonInfo');
if(!document.getElementById('wiIsDiskon').checked){if(infoEl)infoEl.innerHTML='';return;}
const price=parsePzNum(document.getElementById('wiPrice').value);
const normal=parsePzNum(document.getElementById('wiHargaNormal').value);
if(!infoEl)return;
if(normal<=0||price<=0){infoEl.innerHTML='Isi Harga & Harga Normal buat lihat perbandingannya.';return;}
if(normal<=price){infoEl.innerHTML='⚠️ Harga normal harus lebih besar dari harga yang dibayar biar kehitung diskonnya.';return;}
const hemat=normal-price;
const persen=(hemat/normal)*100;
infoEl.innerHTML='💰 Hemat <b>'+fmtFull(hemat)+'</b> ('+persen.toFixed(0)+'% dari harga normal '+fmtFull(normal)+')';
},
incomeAvg(){
const months=FI.effectiveMonths();
const now=new Date();
const from=new Date(now.getFullYear(),now.getMonth()-months+1,1);
const txs=D.transactions.filter(t=>{const d=new Date(t.date);return d>=from&&d<=now;});
return txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)/months;
},
hitung(){
const name=document.getElementById('wiName').value.trim()||'Barang ini';
const price=parsePzNum(document.getElementById('wiPrice').value);
const method=document.getElementById('wiMethod').value;
const cat=document.getElementById('wiCategory').value;
const catExtra=WorthIt.readCatExtra(cat,'wi');
if(price<=0){toast('⚠️ Isi dulu harga barangnya');return;}
const dp=method==='cicilan'?parsePzNum(document.getElementById('wiDP').value):0;
const tenor=method==='cicilan'?(parseInt(document.getElementById('wiTenor').value)||0):0;
const cicilanBulan=method==='cicilan'?parsePzNum(document.getElementById('wiCicilanBulan').value):0;
const totalBayarCicilan=dp+(cicilanBulan*tenor);
const selisihBunga=(method==='cicilan'&&tenor>0&&totalBayarCicilan>0)?Math.max(0,totalBayarCicilan-price):0;
const isDiskon=document.getElementById('wiIsDiskon').checked;
const hargaNormal=isDiskon?parsePzNum(document.getElementById('wiHargaNormal').value):0;
const diskonValid=isDiskon&&hargaNormal>price;
const hematRp=diskonValid?(hargaNormal-price):0;
const hematPersen=diskonValid?(hematRp/hargaNormal)*100:0;
const saldo=totalSaldoAkun();
const surplus=FI.monthlySurplus();
const incAvg=WorthIt.incomeAvg();
const dd=(D.targets||[]).find(t=>t.isDanaDarurat);
const ddPct=(dd&&dd.amount>0)?Math.min(999,Math.round((dd.saved/dd.amount)*100)):null;
const cicilanAktifBulanan=(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null).reduce((s,b)=>s+b.amount,0);
const cicilanBaruBulanan=method==='cicilan'?cicilanBulan:0;
const dsrSesudah=incAvg>0?((cicilanAktifBulanan+cicilanBaruBulanan)/incAvg)*100:null;
const uangKeluarSekarang=method==='cicilan'?dp:price;
const pctSaldoTerkuras=(saldo>0&&uangKeluarSekarang>0)?(uangKeluarSekarang/saldo)*100:0;
const issues=[];
if(ddPct===null){
issues.push({level:'orange',text:'Belum ada Target Keuangan yang ditandai 🚨 Dana Darurat, jadi kondisi keamanan finansialmu belum bisa dicek otomatis di sini. Cek juga secara manual sebelum belanja besar.'});
} else if(ddPct<100){
issues.push({level:cat==='keinginan'?'red':'orange',text:'Dana darurat baru <b>'+ddPct+'%</b> dari target. Idealnya dana darurat penuh dulu sebelum belanja "'+(cat==='keinginan'?'Keinginan':'Kebutuhan')+'".'});
} else {
issues.push({level:'green',text:'Dana darurat sudah <b>'+ddPct+'%</b> dari target. Aman dari sisi ini.'});
}
if(incAvg>0){
if(dsrSesudah>35)issues.push({level:'red',text:'Total cicilan bulanan (termasuk ini) akan jadi <b>'+dsrSesudah.toFixed(0)+'%</b> dari rata-rata income — sudah lewat batas aman 30–35%.'});
else if(dsrSesudah>30)issues.push({level:'orange',text:'Total cicilan bulanan akan jadi <b>'+dsrSesudah.toFixed(0)+'%</b> dari rata-rata income, mendekati batas aman 30–35%.'});
else if(cicilanBaruBulanan>0)issues.push({level:'green',text:'Total cicilan bulanan jadi <b>'+dsrSesudah.toFixed(0)+'%</b> dari rata-rata income, masih di zona aman.'});
} else if(method==='cicilan'){
issues.push({level:'orange',text:'Belum cukup data transaksi pemasukan utk hitung rasio cicilan (DSR) otomatis.'});
}
if(pctSaldoTerkuras>0){
const labelDana=method==='cicilan'?'DP':'harga barang';
if(pctSaldoTerkuras>50)issues.push({level:'red',text:(method==='cicilan'?'DP':'Belanja')+' ini bakal menguras <b>'+pctSaldoTerkuras.toFixed(0)+'%</b> saldo kamu sekarang ('+labelDana+').'});
else if(pctSaldoTerkuras>25)issues.push({level:'orange',text:(method==='cicilan'?'DP':'Belanja')+' ini bakal menguras <b>'+pctSaldoTerkuras.toFixed(0)+'%</b> saldo kamu sekarang ('+labelDana+').'});
else issues.push({level:'green',text:(method==='cicilan'?'DP':'Belanja')+' ini cuma <b>'+pctSaldoTerkuras.toFixed(0)+'%</b> dari saldo kamu, likuiditas masih aman.'});
}
if(method==='tunai'&&surplus>0){
const bulanNabung=Math.ceil(price/surplus);
if(bulanNabung>1)issues.push({level:'orange',text:'Kalau nabung dulu dari surplus bulanan ('+fmtFull(surplus)+'/bln), butuh ≈<b>'+bulanNabung+' bulan</b> baru kekumpul tanpa ganggu saldo sekarang.'});
} else if(method==='tunai'&&surplus<=0){
if((typeof FI!=='undefined'?FI.monthsOfDataAvailable():0)<1){
issues.push({level:'orange',text:'Belum ada data transaksi yang cukup, jadi belum bisa dihitung berapa lama nabung dulu sebelum beli ini.'});
} else {
issues.push({level:'red',text:'Rata-rata pengeluaranmu sekarang lebih besar dari pemasukan (surplus negatif), jadi belum ada "dana lebih" utk belanja tambahan ini.'});
}
}
if(selisihBunga>0){
const pctBunga=(selisihBunga/price)*100;
issues.push({level:pctBunga>15?'red':'orange',text:'Kalau cicilan, kamu bayar ekstra <b>'+fmtFull(selisihBunga)+'</b> ('+pctBunga.toFixed(0)+'% lebih mahal) dibanding tunai.'});
}
if(isDiskon){
if(!diskonValid){
issues.push({level:'orange',text:'Harga Normal belum diisi dengan benar (harus lebih besar dari Harga), jadi diskonnya belum bisa dicek worth it atau enggak.'});
} else if(hematPersen>=30){
issues.push({level:'green',text:'Diskonnya lumayan gede: hemat <b>'+fmtFull(hematRp)+'</b> ('+hematPersen.toFixed(0)+'%) dari harga normal '+fmtFull(hargaNormal)+'. Dari sisi harga, ini worth it — asal memang butuh/mau barangnya.'});
} else if(hematPersen>=10){
issues.push({level:'orange',text:'Diskonnya lumayan: hemat <b>'+fmtFull(hematRp)+'</b> ('+hematPersen.toFixed(0)+'%). Lumayan tapi bukan alasan utama buat beli kalau sebenarnya belum butuh.'});
} else {
issues.push({level:'red',text:'Diskonnya tipis: cuma hemat <b>'+fmtFull(hematRp)+'</b> ('+hematPersen.toFixed(0)+'%) dari harga normal. Hati-hati taktik "diskon palsu" — cek dulu histori harga barang ini (mis. di PriceHistory/CamelCamelCamel/riwayat marketplace) sebelum kepancing checkout.'});
}
}
if(cat==='keinginan'){
if(catExtra==='baru_lihat')issues.push({level:'red',text:'Kategori "Keinginan" & baru kepikiran/lihat — paling rawan impulsif. Coba terapkan aturan tunggu 3 hari dulu sebelum checkout.'});
else if(catExtra==='lama')issues.push({level:'green',text:'Kategori "Keinginan", tapi sudah lama diincar/direncanakan — aturan tunggu 3 hari kemungkinan sudah otomatis terlewati, worth it kalau memang sesuai budget.'});
else issues.push({level:'orange',text:'Kategori "Keinginan" — coba terapkan aturan tunggu 3 hari sebelum benar-benar checkout, sering hasratnya turun sendiri kalau ditunda.'});
} else if(cat==='kebutuhan'&&catExtra){
const labelMap={rusak:'barang lama rusak/tidak berfungsi',habis:'sudah habis & perlu restock',belum_punya:'belum pernah punya, tapi memang perlu',wajib:'wajib/keharusan'};
issues.push({level:catExtra==='belum_punya'?'orange':'green',text:'Alasan kebutuhan: <b>'+(labelMap[catExtra]||catExtra)+'</b>'+(catExtra==='belum_punya'?' — pastikan memang perlu, bukan sekadar ikut-ikutan.':' — cukup jelas & mendesak dari sisi kebutuhan.')});
}
const redCount=issues.filter(i=>i.level==='red').length;
const orangeCount=issues.filter(i=>i.level==='orange').length;
let verdict,verdictBg,verdictCol;
if(redCount>0){verdict='🔴 TUNDA DULU';verdictBg='var(--accent2-soft)';verdictCol='red';}
else if(orangeCount>=2){verdict='🟡 BISA, TAPI HATI-HATI';verdictBg='var(--accent4-soft)';verdictCol='orange';}
else {verdict='🟢 WORTH IT';verdictBg='var(--accent3-soft)';verdictCol='green';}
const vBox=document.getElementById('wiVerdictBox');
vBox.style.background=verdictBg;
const vEl=document.getElementById('wiVerdict');
vEl.textContent=verdict;
vEl.className=verdictCol;
document.getElementById('wiIssueList').innerHTML=issues.map(i=>{
const icon=i.level==='red'?'⚠️':(i.level==='orange'?'🔸':'✅');
return `<div class="u-flex u-gap8 u-aifs u-fs12 u-lh15 u-mb8"><span>${icon}</span><span class="u-ctext">${i.text}</span></div>`;
}).join('');
document.getElementById('wiResultBox').style.display='block';
WorthIt._last={name,price,method,cat,catExtra,dp,tenor,cicilanBulan,isDiskon,hargaNormal:diskonValid?hargaNormal:0,hematRp,hematPersen};
},
catatBeli(){
const d=WorthIt._last;
if(!d){toast('⚠️ Cek dulu sebelum mencatat belanja');return;}
closeModal('worthItModal');
openTxModal('expense');
document.getElementById('txNote').value=d.name+(d.isDiskon&&d.hargaNormal>0?' (diskon dari '+fmtFull(d.hargaNormal)+', hemat '+d.hematPersen.toFixed(0)+'%)':'');
const catField=document.getElementById('txCat');
let catGuessed=null;
if(catField&&!catField.value.trim()){
const guessedCat=guessCategoryFromReceiptText(d.name);
if(guessedCat){selectTxCat(guessedCat.name);catGuessed=guessedCat.name;}
}
_txCatLearnSource=d.name;
if(d.method==='cicilan'){
setPayMethod('cicilan');
document.getElementById('txCicilanNama').value=d.name;
document.getElementById('txCicilanTotal').value=String(d.price);
if(d.cicilanBulan>0)document.getElementById('txCicilanPerBulan').value=String(d.cicilanBulan);
document.getElementById('txCicilanTenor').value=String(d.tenor||6);
cicilanLastInput='total';
syncCicilanPreview('total');
toast('✏️ Detail cicilan sudah diisi'+(catGuessed?' (kategori tebakan: '+catGuessed+')':'')+', cek lagi lalu Simpan');
} else {
document.getElementById('txAmt').value=String(d.price);
toast('✏️ Nominal sudah diisi'+(catGuessed?', kategori tebakan: '+catGuessed:', pilih kategori')+' lalu Simpan');
}
},
simpanDulu(){
const d=WorthIt._last;
if(!d){toast('⚠️ Cek dulu sebelum disimpan');return;}
D.wishlist.push({id:uid(),name:d.name,price:d.price,isDiskon:!!(d.isDiskon&&d.hargaNormal>0),hargaNormal:d.hargaNormal||0,cat:d.cat,urgensi:'bisa_nunggu',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:false});
save();
toast('💾 "'+d.name+'" disimpan ke Prioritas Belanja — belum dicatat sebagai belanja, bisa dihapus/edit kapan saja di tab itu');
WorthIt.reset();
WorthIt.switchTab('list');
WorthIt.renderList();
},
toggleDiskonList(){
const on=document.getElementById('wlIsDiskon').checked;
document.getElementById('wlDiskonFields').style.display=on?'block':'none';
if(!on)document.getElementById('wlDiskonInfo').innerHTML='';
WorthIt.syncDiskonList();
},
syncDiskonList(){
const infoEl=document.getElementById('wlDiskonInfo');
if(!document.getElementById('wlIsDiskon').checked){if(infoEl)infoEl.innerHTML='';return;}
const price=parsePzNum(document.getElementById('wlPrice').value);
const normal=parsePzNum(document.getElementById('wlHargaNormal').value);
if(!infoEl)return;
if(normal<=0||price<=0){infoEl.innerHTML='Isi Harga & Harga Normal buat lihat perbandingannya.';return;}
if(normal<=price){infoEl.innerHTML='⚠️ Harga normal harus lebih besar dari harga yang dibayar biar kehitung diskonnya.';return;}
const hemat=normal-price;
const persen=(hemat/normal)*100;
infoEl.innerHTML='💰 Hemat <b>'+fmtFull(hemat)+'</b> ('+persen.toFixed(0)+'% dari harga normal '+fmtFull(normal)+')';
},
toggleSudahPunya(){
const on=document.getElementById('wlSudahPunya').checked;
document.getElementById('wlSudahPunyaAlasanBox').style.display=on?'block':'none';
},
editListId:null,
editListItem(id){
const it=D.wishlist.find(x=>sameId(x.id,id));
if(!it)return;
WorthIt.editListId=id;
document.getElementById('wlName').value=it.name;
document.getElementById('wlPrice').value=String(it.price);
document.getElementById('wlIsDiskon').checked=!!it.isDiskon;
document.getElementById('wlHargaNormal').value=it.isDiskon?String(it.hargaNormal):'';
WorthIt.toggleDiskonList();
WorthIt.syncDiskonList();
document.getElementById('wlCategory').value=it.cat;
WorthIt.onCategoryChange('wl',it.catExtra||null);
document.getElementById('wlUrgensi').value=it.urgensi;
document.getElementById('wlSudahPunya').checked=!!it.sudahPunya;
document.getElementById('wlSudahPunyaAlasan').value=it.sudahPunyaAlasan||'';
WorthIt.toggleSudahPunya();
document.getElementById('wlSubmitBtn').textContent='💾 Simpan Perubahan';
document.getElementById('wlCancelEditBtn').style.display='block';
document.getElementById('wlName').scrollIntoView({behavior:'smooth',block:'center'});
},
cancelEditList(){
WorthIt.editListId=null;
['wlName','wlPrice','wlHargaNormal','wlSudahPunyaAlasan'].forEach(id=>{document.getElementById(id).value='';});
document.getElementById('wlIsDiskon').checked=false;
WorthIt.toggleDiskonList();
document.getElementById('wlCategory').value='keinginan';
WorthIt.onCategoryChange('wl');
document.getElementById('wlUrgensi').value='bisa_nunggu';
document.getElementById('wlSudahPunya').checked=false;
WorthIt.toggleSudahPunya();
document.getElementById('wlSubmitBtn').textContent='+ Tambah ke List';
document.getElementById('wlCancelEditBtn').style.display='none';
},
async addToList(){
const name=document.getElementById('wlName').value.trim();
const price=parsePzNum(document.getElementById('wlPrice').value);
if(!name){toast('⚠️ Isi dulu nama barangnya');return;}
if(price<=0){toast('⚠️ Isi dulu harga barangnya');return;}
if(!WorthIt.editListId){
const dup=(D.wishlist||[]).find(x=>!x.bought&&x.name.trim().toLowerCase()===name.toLowerCase());
if(dup){
if(!await askConfirm(`Barang "${escapeHtml(dup.name)}" (${fmtFull(dup.price)}) udah ada di list Prioritas Belanja. Tetap tambahkan sebagai barang terpisah?`,{title:'Kemungkinan Duplikat',okText:'Ya, Tambahkan Juga'}))return;
}
}
const isDiskon=document.getElementById('wlIsDiskon').checked;
const hargaNormalRaw=isDiskon?parsePzNum(document.getElementById('wlHargaNormal').value):0;
const diskonValid=isDiskon&&hargaNormalRaw>price;
const cat=document.getElementById('wlCategory').value;
const catExtra=WorthIt.readCatExtra(cat,'wl');
const urgensi=document.getElementById('wlUrgensi').value;
const sudahPunya=document.getElementById('wlSudahPunya').checked;
const sudahPunyaAlasan=sudahPunya?document.getElementById('wlSudahPunyaAlasan').value.trim():'';
if(WorthIt.editListId){
const it=D.wishlist.find(x=>sameId(x.id,WorthIt.editListId));
if(it){
Object.assign(it,{name,price,isDiskon:diskonValid,hargaNormal:diskonValid?hargaNormalRaw:0,cat,catExtra,urgensi,sudahPunya,sudahPunyaAlasan});
save();
toast('✅ "'+name+'" diperbarui');
}
} else {
D.wishlist.push({id:uid(),name,price,isDiskon:diskonValid,hargaNormal:diskonValid?hargaNormalRaw:0,cat,catExtra,urgensi,sudahPunya,sudahPunyaAlasan,createdAt:new Date().toISOString(),bought:false});
save();
toast('✅ "'+name+'" ditambahkan ke list');
}
WorthIt.cancelEditList();
WorthIt.renderList();
},
computeScore(it){
const reasons=[];
let score=0;
if(it.cat==='kebutuhan'){
const belumPunya=it.catExtra==='belum_punya';
score+=belumPunya?30:40;
reasons.push({level:belumPunya?'orange':'green',text:belumPunya?'🛠️ Kebutuhan, tapi belum pernah punya sebelumnya — pastikan memang perlu, bukan ikut-ikutan.':'🛠️ Ini kebutuhan, bukan sekadar keinginan.'});
} else {
if(it.catExtra==='baru_lihat'){score+=5;reasons.push({level:'red',text:'✨ Masih keinginan & baru kepikiran/lihat — paling rawan impulsif, coba tunda 3 hari dulu.'});}
else if(it.catExtra==='lama'){score+=15;reasons.push({level:'orange',text:'✨ Keinginan, tapi sudah lama diincar/direncanakan — aturan tunda 3 hari kemungkinan sudah lewat.'});}
else {score+=10;reasons.push({level:'orange',text:'✨ Ini masih kategori keinginan — coba tunda 3 hari, sering hasratnya turun sendiri.'});}
}
if(it.urgensi==='mendesak'){score+=30;reasons.push({level:'green',text:'🔥 Mendesak — barang lama sudah rusak/habis atau memang diperlukan segera.'});}
else if(it.urgensi==='bisa_nunggu'){score+=15;reasons.push({level:'orange',text:'⏳ Bisa nunggu — belum darurat, aman ditunda ke gajian berikutnya.'});}
else {reasons.push({level:'red',text:'💭 Nice to have — belum perlu-perlu amat sekarang.'});}
if(it.sudahPunya){
score-=25;
const customText=(it.sudahPunyaAlasan||'').trim();
reasons.push({level:'red',text:customText?('📦 '+escapeHtml(customText)):'📦 Barang lama masih ada & masih bisa dipakai — ini lebih ke ganti karena lebih murah, bukan karena beneran butuh. Justru di sini seringnya "hemat" jadi alasan buat belanja yang sebenarnya belum perlu.'});
}
if(it.isDiskon&&it.hargaNormal>it.price){
const hematRp=it.hargaNormal-it.price;
const hematPersen=(hematRp/it.hargaNormal)*100;
const diskonScore=Math.min(50,hematPersen)*(it.sudahPunya?0.2:0.4);
score+=diskonScore;
if(hematPersen>=30)reasons.push({level:it.sudahPunya?'orange':'green',text:'🏷️ Diskon lumayan gede: hemat '+fmtFull(hematRp)+' ('+hematPersen.toFixed(0)+'%)'+(it.sudahPunya?', tapi tetap perlu diingat barang lama masih jalan.':'.')});
else if(hematPersen>=10)reasons.push({level:'orange',text:'🏷️ Diskon lumayan: hemat '+fmtFull(hematRp)+' ('+hematPersen.toFixed(0)+'%), tapi bukan alasan utama kalau belum butuh.'});
else reasons.push({level:'red',text:'🏷️ Diskon tipis, cuma '+hematPersen.toFixed(0)+'% — hati-hati taktik "diskon palsu".'});
}
const saldo=totalSaldoAkun();
const pctSaldo=(saldo>0)?(it.price/saldo)*100:0;
if(pctSaldo>50){score-=15;reasons.push({level:'red',text:'💸 Harganya bakal menguras >50% saldo kamu sekarang.'});}
else if(pctSaldo>25){score-=7;reasons.push({level:'orange',text:'💸 Harganya cukup besar, ~'+pctSaldo.toFixed(0)+'% dari saldo sekarang.'});}
score=Math.max(0,Math.min(100,Math.round(score)));
return{score,reasons};
},
renderList(){
const box=document.getElementById('wlItems');
const countEl=document.getElementById('wlCount');
const totalEl=document.getElementById('wlTotalSummary');
if(!box)return;
const items=(D.wishlist||[]).filter(it=>!it.bought);
if(!items.length){
countEl.textContent='';
if(totalEl)totalEl.innerHTML='';
box.innerHTML='<div class="u-fs12 u-t2 u-tac" style="padding:20px 0">Belum ada barang di list. Tambahin dulu di atas ya.</div>';
return;
}
const scored=items.map(it=>({it,...WorthIt.computeScore(it)})).sort((a,b)=>b.score-a.score);
countEl.textContent=items.length+' barang';
if(totalEl){
const totalHarga=items.reduce((sum,it)=>sum+(Number(it.price)||0),0);
const saldo=totalSaldoAkun();
const pct=saldo>0?(totalHarga/saldo*100):0;
let warnTxt='';
if(saldo>0&&pct>100)warnTxt=' ⚠️ totalnya lebih besar dari saldo kamu sekarang.';
else if(saldo>0&&pct>50)warnTxt=' ⚠️ ini bakal nguras lebih dari separuh saldo kamu.';
totalEl.innerHTML=`💰 Kalau semua ${items.length} barang dibeli sekaligus: <b>${fmtFull(totalHarga)}</b>`+(saldo>0?` (~${pct.toFixed(0)}% dari saldo ${fmtFull(saldo)})`:'')+warnTxt;
}
box.innerHTML=scored.map((s,i)=>{
const{it,score,reasons}=s;
let badge,badgeCol,badgeBg;
if(score>=70){badge='🟢 Prioritas Tinggi';badgeCol='green';badgeBg='var(--accent3-soft)';}
else if(score>=40){badge='🟡 Prioritas Sedang';badgeCol='orange';badgeBg='var(--accent4-soft)';}
else {badge='🔴 Bisa Ditunda';badgeCol='red';badgeBg='var(--accent2-soft)';}
const diskonInfo=(it.isDiskon&&it.hargaNormal>it.price)?' <span class="u-t2" style="text-decoration:line-through">'+fmtFull(it.hargaNormal)+'</span>':'';
const sudahPunyaBadge=it.sudahPunya?' <span class="u-fs10 u-t2 u-r8" style="background:var(--surface3);padding:1px 6px">📦 masih punya yg lama</span>':'';
return `<div class="card u-mb10" style="padding:14px">
        <div class="u-flex u-jcb u-aifs u-gap8 u-mb6">
          <div class="u-flex u-gap8 u-aifs">
            <div class="u-fw800 u-fs14 u-t2" style="min-width:18px">#${i+1}</div>
            <div><div class="u-fw700 u-fs14">${escapeHtml(it.name)}</div>
            <div class="u-fs12 u-t2 u-mt2">${fmtFull(it.price)}${diskonInfo}${sudahPunyaBadge}</div></div>
          </div>
          <div class="u-flex" style="gap:2px;flex-shrink:0">
            <button class="tx-del" data-action="WorthIt.editListItem" data-args="${escapeHtml(JSON.stringify([it.id]))}" aria-label="Edit">✏️</button>
            <button class="tx-del" data-action="WorthIt.deleteListItem" data-args="${escapeHtml(JSON.stringify([it.id]))}" aria-label="Hapus">🗑</button>
          </div>
        </div>
        <div style="display:inline-block;background:${badgeBg};color:${badgeCol};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;margin-bottom:8px">${badge} · ${score}</div>
        <div class="u-mb10">${reasons.map(r=>{
const icon=r.level==='red'?'⚠️':(r.level==='orange'?'🔸':'✅');
return `<div class="u-flex u-gap6 u-aifs u-fs11 u-lh15 u-mb4"><span>${icon}</span><span class="u-ctext">${r.text}</span></div>`;
}).join('')}</div>
        <button class="btn btn-expense btn-full btn-sm" data-action="WorthIt.catatBeliList" data-args="${escapeHtml(JSON.stringify([it.id]))}">✅ Sudah Beli, Catat</button>
      </div>`;
}).join('');
},
deleteListItem(id){
D.wishlist=D.wishlist.filter(x=>!sameId(x.id,id));
save();
if(sameId(WorthIt.editListId,id))WorthIt.cancelEditList();
WorthIt.renderList();
toast('🗑 Dihapus dari list');
},
openLinkTxModal(){
LinkTx.open('wishlist',null);
},
pendingBuyId:null,
catatBeliList(id){
const it=D.wishlist.find(x=>sameId(x.id,id));
if(!it)return;
closeModal('worthItModal');
openTxModal('expense');
WorthIt.pendingBuyId=id;
document.getElementById('txNote').value=it.name+(it.isDiskon&&it.hargaNormal>0?' (diskon dari '+fmtFull(it.hargaNormal)+')':'');
document.getElementById('txAmt').value=String(it.price);
const catField=document.getElementById('txCat');
let catGuessed=null;
if(catField&&!catField.value.trim()){
const guessedCat=guessCategoryFromReceiptText(it.name);
if(guessedCat){selectTxCat(guessedCat.name);catGuessed=guessedCat.name;}
}
_txCatLearnSource=it.name;
toast('✏️ Nominal sudah diisi'+(catGuessed?', kategori tebakan: '+catGuessed:', pilih kategori')+' lalu Simpan — barang baru ditandai "Sudah Beli" setelah transaksi ini disimpan.');
},
applyBuyLink(txId){
if(!WorthIt.pendingBuyId)return;
const it=D.wishlist.find(x=>sameId(x.id,WorthIt.pendingBuyId));
const t=D.transactions.find(x=>x.id===txId);
if(it&&t){
it.bought=true;
it.boughtDate=t.date||new Date().toISOString().split('T')[0];
it.txId=txId;
t.wishlistLinkId=it.id;
}
WorthIt.pendingBuyId=null;
},
onLinkedTxEdited(t){
const it=D.wishlist.find(x=>x.id===t.wishlistLinkId);
if(!it)return;
it.price=t.amount;
it.boughtDate=t.date;
WorthIt.renderList();
WorthIt.renderBoughtList();
},
onLinkedTxDeleted(t){
const it=D.wishlist.find(x=>x.id===t.wishlistLinkId);
if(!it)return;
it.bought=false;it.txId=null;it.boughtDate=null;
WorthIt.renderList();
WorthIt.renderBoughtList();
},
async undoBought(id){
const it=D.wishlist.find(x=>sameId(x.id,id));
if(!it)return;
const linkedTx=it.txId?D.transactions.find(x=>x.id===it.txId):null;
const msg=linkedTx
? `Kembalikan "${escapeHtml(it.name)}" ke daftar belum dibeli? Transaksi pengeluaran ${fmtFull(linkedTx.amount)} yang sudah tercatat di Keuangan TETAP ada (uangnya memang sudah keluar) — hapus manual di Keuangan kalau memang salah catat.`
: `Kembalikan "${escapeHtml(it.name)}" ke daftar belum dibeli?`;
if(!await askConfirm(msg,{title:'Kembalikan ke List',okText:'Ya, Kembalikan'}))return;
if(linkedTx)delete linkedTx.wishlistLinkId;
it.bought=false;it.txId=null;it.boughtDate=null;
save();
WorthIt.renderList();
WorthIt.renderBoughtList();
toast('↺ "'+it.name+'" dikembalikan ke daftar Prioritas Belanja');
},
renderBoughtList(){
const box=document.getElementById('wlBoughtItems');
const countEl=document.getElementById('wlBoughtCount');
if(!box)return;
const items=(D.wishlist||[]).filter(it=>it.bought)
.sort((a,b)=>(b.boughtDate||'').localeCompare(a.boughtDate||''));
if(!items.length){
if(countEl)countEl.textContent='';
box.innerHTML='<div class="u-fs12 u-t2 u-tac" style="padding:16px 0">Belum ada barang yang ditandai sudah dibeli.</div>';
return;
}
if(countEl)countEl.textContent=items.length+' barang';
box.innerHTML=items.map(it=>{
const t=it.txId?D.transactions.find(x=>x.id===it.txId):null;
return `<div class="tx-item">
        <div class="tx-icon" style="background:var(--accent3-soft)">✅</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(it.name)}</div>
          <div class="tx-meta">Dibeli ${it.boughtDate||'?'}${t?' · tercatat di Keuangan':' · transaksi tidak ditemukan'}</div>
        </div>
        <div class="tx-amount">${fmt(it.price)}</div>
        <button class="tx-del" data-action="WorthIt.undoBought" data-args="${escapeHtml(JSON.stringify([it.id]))}" title="Kembalikan ke list" aria-label="Kembalikan ke list">↺</button>
      </div>`;
}).join('');
},
boughtViewOpen:false,
toggleBoughtView(){
WorthIt.boughtViewOpen=!WorthIt.boughtViewOpen;
const activeEl=document.getElementById('wlActiveSection');
const boughtEl=document.getElementById('wlBoughtSection');
const btnEl=document.getElementById('wlBoughtToggleBtn');
if(activeEl)activeEl.style.display=WorthIt.boughtViewOpen?'none':'block';
if(boughtEl)boughtEl.style.display=WorthIt.boughtViewOpen?'block':'none';
if(btnEl)btnEl.textContent=WorthIt.boughtViewOpen?'📋 Lihat List Aktif':'✅ Lihat Sudah Dibeli';
if(WorthIt.boughtViewOpen)WorthIt.renderBoughtList();
},
// ==================== Pantau Harga (Price Watch) — tab ke-3 Worth It? ====================
// Catat harga 1 produk dari waktu ke waktu (manual/scan), AI bandingkan ke rata-rata
// historis (trend) + kondisi keuangan (100% reuse FinanceIntelligence.summary(), TIDAK
// ada rumus cashflow/health-score baru) -> saran "aman dibeli sekarang" atau "tunggu dulu".
// Pola strukturnya sama persis CAT_FIELDS/catFieldsHtml di atas: fungsi PURE (trend/verdict,
// tidak sentuh DOM/D) dipisah dari fungsi wiring DOM (render/promptAddItem/dst) — dites di
// tests/worthit-pricewatch.test.js.
PW:{
list(){return D.priceWatch||[];},
findItem(id){return (D.priceWatch||[]).find(x=>sameId(x.id,id));},
addItem(name){
if(!D.priceWatch)D.priceWatch=[];
const it={id:uid(),name:(name||'').trim()||'Produk',entries:[],createdAt:new Date().toISOString()};
D.priceWatch.push(it);
return it;
},
addEntry(itemId,price,date,source){
const it=WorthIt.PW.findItem(itemId);
if(!it||!(price>0))return null;
const entry={id:uid(),price:Math.round(price),date:date||new Date().toISOString().slice(0,10),source:source||'manual'};
it.entries.push(entry);
it.entries.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
return entry;
},
deleteItem(id){
D.priceWatch=(D.priceWatch||[]).filter(x=>!sameId(x.id,id));
},
deleteEntry(itemId,entryId){
const it=WorthIt.PW.findItem(itemId);
if(!it)return;
it.entries=(it.entries||[]).filter(e=>!sameId(e.id,entryId));
},
// PURE — dites di tests/worthit-pricewatch.test.js
trend(entries){
const list=(entries||[]).filter(e=>e&&e.price>0);
if(!list.length)return {count:0,latest:0,min:0,max:0,avg:0,direction:'belum_cukup'};
const sorted=[...list].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
const prices=sorted.map(e=>e.price);
const latest=prices[prices.length-1];
const min=Math.min(...prices);
const max=Math.max(...prices);
const avg=prices.reduce((s,p)=>s+p,0)/prices.length;
if(prices.length<2)return {count:1,latest,min,max,avg,direction:'belum_cukup'};
const pctVsAvg=avg>0?((latest-avg)/avg)*100:0;
let direction='stabil';
if(pctVsAvg<=-3)direction='turun';
else if(pctVsAvg>=3)direction='naik';
return {count:prices.length,latest,min,max,avg,pctVsAvg,direction};
},
// PURE — reuse FinanceIntelligence.summary() apa adanya (Sesi 74), TIDAK ada rumus
// cashflow/health-score baru. Guard typeof supaya tetap jalan kalau modul belum dimuat.
financialSafety(){
if(typeof FinanceIntelligence==='undefined')return {ok:false};
try{
const sum=FinanceIntelligence.summary();
const cashflow=sum&&sum.cashflow;
const surplus=cashflow&&typeof cashflow.surplus==='number'?cashflow.surplus:null;
const healthScore=sum&&typeof sum.healthScore==='number'?sum.healthScore:null;
return {ok:true,surplus,healthScore};
}catch(e){return {ok:false};}
},
// PURE — dites di tests/worthit-pricewatch.test.js. Gabung trend harga + kondisi
// keuangan jadi 1 verdict (pola sama semangat WorthIt.hitung(), tapi utk histori harga).
verdict(trend,finance){
const reasons=[];
let safe=null;
if(!trend||trend.direction==='belum_cukup'){
reasons.push('📊 Baru '+((trend&&trend.count)||0)+' data harga — catat minimal 2x biar tren kelihatan');
}else if(trend.direction==='turun'){
reasons.push('📉 Harga sekarang lebih murah '+Math.abs(trend.pctVsAvg).toFixed(0)+'% dari rata-rata historis');
safe=true;
}else if(trend.direction==='naik'){
reasons.push('📈 Harga sekarang lebih mahal '+trend.pctVsAvg.toFixed(0)+'% dari rata-rata historis');
safe=false;
}else{
reasons.push('➖ Harga relatif stabil dibanding rata-rata historis');
}
if(finance&&finance.ok){
if(typeof finance.healthScore==='number'){
if(finance.healthScore<40){
reasons.push('⚠️ Skor kesehatan keuangan masih rendah ('+finance.healthScore+'/100)');
safe=false;
}else if(finance.healthScore>=70){
reasons.push('✅ Skor kesehatan keuangan baik ('+finance.healthScore+'/100)');
if(safe===null)safe=true;
}
}
if(typeof finance.surplus==='number'&&finance.surplus<0){
reasons.push('⚠️ Cashflow bulanan sedang minus');
safe=false;
}
}else{
reasons.push('ℹ️ Kondisi keuangan belum bisa dicek (modul Finance Intelligence belum aktif)');
}
if(safe===null)safe=false;
const label=safe?'✅ Aman untuk dibeli sekarang':((!trend||trend.direction==='belum_cukup')?'⏳ Belum cukup data, catat harga dulu':'🟡 Sebaiknya tunggu dulu');
return {safe,label,reasons};
},
// ---- Wiring DOM (tidak dites unit, verifikasi manual/smoke-test) ----
render(){
const box=document.getElementById('wiWatchList');
if(!box)return;
const items=WorthIt.PW.list();
if(!items.length){
box.innerHTML='<div class="u-fs12 u-t2 u-tac" style="padding:20px 0">Belum ada produk dipantau. Tambahin dulu di atas ya.</div>';
return;
}
const finance=WorthIt.PW.financialSafety();
box.innerHTML=items.map(it=>{
const trend=WorthIt.PW.trend(it.entries);
const v=WorthIt.PW.verdict(trend,finance);
const entriesHtml=(it.entries||[]).slice().reverse().map(e=>`<div class="u-flex u-jcb u-fs11 u-t2" style="padding:3px 0">
        <span>${e.date}${e.source==='scan'?' 📷':''}</span><span>${fmtFull(e.price)}</span>
        <span class="tx-del" style="width:20px;height:20px" data-action="WorthIt.PW.removeEntry" data-args="${escapeHtml(JSON.stringify([it.id,e.id]))}" aria-label="Hapus">🗑</span>
      </div>`).join('')||'<div class="u-fs11 u-t2" style="padding:3px 0">Belum ada histori harga.</div>';
return `<div class="card u-mb10" style="padding:14px">
      <div class="u-flex u-jcb u-aifs u-gap8 u-mb6">
        <div class="u-fw700 u-fs14">${escapeHtml(it.name)}</div>
        <button class="tx-del" data-action="WorthIt.PW.removeItem" data-args="${escapeHtml(JSON.stringify([it.id]))}" aria-label="Hapus produk">🗑</button>
      </div>
      <div style="text-align:center;border-radius:10px;padding:10px;margin-bottom:8px;background:${v.safe?'var(--accent3-soft)':'var(--accent4-soft)'}">
        <div style="font-weight:800;font-size:14px">${v.label}</div>
        <div class="u-fs11 u-t2" style="margin-top:4px;line-height:1.5">${v.reasons.join('<br>')}</div>
      </div>
      <div class="u-flex u-gap8 u-mb8">
        <button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="WorthIt.PW.promptAddEntry" data-args="${escapeHtml(JSON.stringify([it.id]))}">✏️ Catat Harga</button>
        <button type="button" class="btn btn-ghost btn-sm u-flex1" data-action="WorthIt.PW.scanEntry" data-args="${escapeHtml(JSON.stringify([it.id]))}">📷 Scan</button>
      </div>
      ${entriesHtml}
    </div>`;
}).join('');
},
async promptAddItem(){
const name=await showPromptModal({title:'Produk yang Dipantau',message:'Nama produk',placeholder:'HP, kulkas, dll...'});
if(!name)return;
WorthIt.PW.addItem(name);
save();
WorthIt.PW.render();
},
async promptAddEntry(itemId){
const priceStr=await showPromptModal({title:'Catat Harga Sekarang',message:'Harga (Rp)',placeholder:'0',inputType:'number'});
if(priceStr==null)return;
const price=parsePzNum(priceStr);
if(price<=0){toast('⚠️ Harga tidak valid');return;}
WorthIt.PW.addEntry(itemId,price,null,'manual');
save();
WorthIt.PW.render();
toast('✅ Harga dicatat');
},
removeItem(id){
WorthIt.PW.deleteItem(id);
save();
WorthIt.PW.render();
},
removeEntry(itemId,entryId){
WorthIt.PW.deleteEntry(itemId,entryId);
save();
WorthIt.PW.render();
},
_pendingScanItem:null,
scanEntry(itemId){
WorthIt.PW._pendingScanItem=itemId;
scanReceipt('wiWatchScanAmt','wiWatchScanDate',null);
},
onScanAmtInput(){
const amtEl=document.getElementById('wiWatchScanAmt');
const dateEl=document.getElementById('wiWatchScanDate');
const itemId=WorthIt.PW._pendingScanItem;
if(!itemId||!amtEl)return;
const price=parsePzNum(amtEl.value);
if(price<=0)return;
WorthIt.PW.addEntry(itemId,price,dateEl&&dateEl.value,'scan');
amtEl.value='';if(dateEl)dateEl.value='';
WorthIt.PW._pendingScanItem=null;
save();
WorthIt.PW.render();
toast('✅ Harga hasil scan ditambahkan');
}
}
};
