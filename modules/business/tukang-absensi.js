// tukang-absensi.js — Domain Tukang (absensi/payroll harian & borongan) ONLY.
// Dipindah ke modules/business/tukang-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN [2026-07-12]: File ini dulu bernama features-tukang-kendaraan-storage.js dan asalnya
// campuran 5 domain (lihat riwayat lengkap di docs/CATATAN-CEK-CLAUDE.md). Bagian "Chat Action"
// SUDAH DIPISAH ke chat-action.js, "Storage/Archive" SUDAH DIPISAH ke data-archive.js,
// "Sparepart & Servis" SUDAH DIPISAH ke sparepart-servis.js, dan "Vehicle core" (CRUD kendaraan,
// KM, Pajak Kendaraan, SIM, proactive reminders, Car Notes tab) SUDAH DIPISAH ke vehicle-core.js
// (roadmap split file besar bagian ke-1 s/d ke-4). Bagian ke-5 (TERAKHIR): file ini di-rename
// dari features-tukang-kendaraan-storage.js jadi tukang-absensi.js — roadmap split file besar
// ini SELESAI TOTAL (5 bagian).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js, vehicle-core.js, chat-action.js, data-archive.js, sparepart-servis.js

/* moved to modules-render.js: renderWorkDays */
const Tukang={
weekStart:getWeekRange(new Date()).start,
_rangeResult:null,
_dayCtx:null,
_pendingPaymentEntryIds:null,
_pendingPaymentRange:null,
_histOpen:{},
toggleWorkerHistory(workerId){
Tukang._histOpen[workerId]=!Tukang._histOpen[workerId];
Tukang.renderAll();
},
async delAbsensiEntry(id){
const a=D.tukangAbsensi.find(x=>sameId(x.id,id));
if(!a)return;
if(a.paidTxId){toast('⚠️ Absensi ini sudah dibayar (tercatat di Keuangan), tidak bisa dihapus di sini');return;}
if(a.renovItemLinkId){toast('⚠️ Absensi ini sudah dipakai di item Renovasi, tidak bisa dihapus di sini');return;}
if(!await askConfirm('Hapus catatan absensi ini?'))return;
D.tukangAbsensi=D.tukangAbsensi.filter(x=>!sameId(x.id,id));
save();Tukang.renderAll();toast('🗑 Absensi dihapus');
},
renderWorkerHistory(w){
const entries=D.tukangAbsensi.filter(a=>a.workerId==w.id).sort((a,b)=>a.date<b.date?1:(a.date>b.date?-1:0));
const isOpen=!!Tukang._histOpen[w.id];
const listHtml=entries.length?entries.map(a=>{
const locked=!!(a.renovItemLinkId||a.paidTxId);
const paidLock=!!a.paidTxId;
const dateLabel=new Date(a.date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
const detail=a.mode==='borongan'?`📦 Borongan ${fmtFull(a.borTotal)}÷${a.borJumlah} tukang`:`⏰ ${a.masuk}–${a.pulang} (${a.jamKerja} jam${a.jamLembur>0?', lembur '+a.jamLembur+' jam':''})`;
const lockNote=paidLock?' · 💸 sudah dibayar':(locked?' · 🔒 dipakai di Renovasi':'');
return `<div class="wh-day-item${locked?'':' u-pointer'}" ${locked?'':`data-tk-hist-edit="1" data-tk-hist-worker="${w.id}" data-tk-hist-date="${a.date}"`}>
        <div class="wh-day-info">
          <div class="wh-day-date">${dateLabel}${locked?'':' <span class="u-fs10 u-t2 u-fw400">✏️</span>'}</div>
          <div class="wh-day-time">${detail}${lockNote}</div>
        </div>
        <div class="wh-day-pay">${fmtFull(a.upah)}</div>
        ${locked?'':`<button class="tx-del" data-stop="1" data-tk-hist-del="${a.id}" aria-label="Hapus">🗑</button>`}
      </div>`;
}).join(''):'<div class="empty"><div class="empty-text">Belum ada absensi dicatat untuk pekerja ini</div></div>';
return `<div class="u-flex u-jcb u-aic u-pointer" data-tk-hist-toggle="${w.id}" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
        <span class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:.5px">📋 Riwayat Absensi (${entries.length})</span>
        <span class="u-fs11 u-t2">${isOpen?'▲ Tutup':'▼ Lihat'}</span>
      </div>
      ${isOpen?`<div class="u-fdcol u-gap6">${listHtml}</div>`:''}`;
},
openModal(){
Tukang.weekStart=getWeekRange(new Date()).start;
const today=todayStr();
const fromEl=document.getElementById('tkRangeFrom'), toEl=document.getElementById('tkRangeTo');
if(fromEl&&!fromEl.value)fromEl.value=today;
if(toEl&&!toEl.value)toEl.value=today;
document.getElementById('tkRangeTotal').textContent='Rp 0';
document.getElementById('tkRangeDetail').textContent='';
Tukang._rangeResult=null;
Tukang.renderAll();
openModal('tukangModal');
},
changeWeek(dir){
const d=new Date(Tukang.weekStart);
d.setDate(d.getDate()+7*dir);
Tukang.weekStart=getWeekRange(d).start;
Tukang.renderAll();
},
suggestLembur(){
const upahEl=document.getElementById('tkUpahJamBaru');
const lemburEl=document.getElementById('tkUpahLemburJamBaru');
if(!upahEl||!lemburEl||lemburEl.value)return;
const upahJam=parseFloat(upahEl.value)||0;
if(upahJam>0)lemburEl.placeholder='otomatis '+fmtFull(Math.round(upahJam*1.5))+' (1.5×)';
},
addWorker(){
const name=document.getElementById('tkNamaBaru').value.trim();
evalAmtExpr('tkUpahJamBaru');
evalAmtExpr('tkUpahLemburJamBaru');
const upahJam=parseFloat(document.getElementById('tkUpahJamBaru').value)||0;
const jamKerjaNormal=parseFloat(document.getElementById('tkJamKerjaBaru').value)||7;
const upahLemburInput=parseFloat(document.getElementById('tkUpahLemburJamBaru').value)||0;
const upahLemburJam=upahLemburInput>0?upahLemburInput:Math.round(upahJam*1.5);
if(!name){toast('⚠️ Isi nama pekerja');return;}
if(!upahJam||upahJam<=0){toast('⚠️ Isi upah pokok/jam yang valid');return;}
D.tukangWorkers.push({id:uid(),name,upahJam,jamKerjaNormal,upahLemburJam});
document.getElementById('tkNamaBaru').value='';
document.getElementById('tkUpahJamBaru').value='';
document.getElementById('tkJamKerjaBaru').value='7';
document.getElementById('tkUpahLemburJamBaru').value='';
save();Tukang.renderAll();toast('✅ Pekerja "'+name+'" ditambahkan ('+fmtFull(upahJam)+'/jam)');
},
async delWorker(id){
const w=D.tukangWorkers.find(x=>x.id==id);
if(!w)return;
const hasLocked=D.tukangAbsensi.some(a=>a.workerId==id&&a.renovItemLinkId);
if(hasLocked){toast('⚠️ Tidak bisa hapus — "'+w.name+'" masih punya absensi yang sudah dipakai di item Renovasi. Batalkan/hapus dulu item terkait.');return;}
if(!await askConfirm(`Hapus pekerja "${w.name}"? Absensi yang belum dipakai ikut terhapus.`))return;
D.tukangAbsensi=D.tukangAbsensi.filter(a=>a.workerId!=id);
D.tukangWorkers=D.tukangWorkers.filter(x=>x.id!=id);
save();Tukang.renderAll();toast('🗑 Pekerja dihapus');
},
_computeDay(w,masuk,pulang,istMulai,istSelesai){
let masukMin=timeToMinutes(masuk), pulangMin=timeToMinutes(pulang);
if(pulangMin<masukMin) pulangMin+=24*60;
let totalMinKotor=pulangMin-masukMin;
let istirahatMin=0;
if(istMulai&&istSelesai){
let istMulaiMin=timeToMinutes(istMulai), istSelesaiMin=timeToMinutes(istSelesai);
if(istSelesaiMin<istMulaiMin) istSelesaiMin+=24*60;
const overlapStart=Math.max(masukMin,istMulaiMin);
const overlapEnd=Math.min(pulangMin,istSelesaiMin);
istirahatMin=Math.max(0,overlapEnd-overlapStart);
}
const totalJam=Math.max(0,(totalMinKotor-istirahatMin)/60);
const ambangLembur=w.jamKerjaNormal||7;
const jamKerja=Math.min(totalJam,ambangLembur);
const jamLembur=Math.max(0,totalJam-ambangLembur);
const upah=Math.round(jamKerja*w.upahJam+jamLembur*w.upahLemburJam);
return {istirahatMin,totalJam:Math.round(totalJam*100)/100,jamKerja:Math.round(jamKerja*100)/100,jamLembur:Math.round(jamLembur*100)/100,upah};
},
openDayEntry(workerId,dateIso){
const w=D.tukangWorkers.find(x=>x.id==workerId);
if(!w)return;
const entry=D.tukangAbsensi.find(a=>a.workerId==workerId&&a.date==dateIso);
if(entry&&entry.renovItemLinkId){toast('⚠️ Absensi ini sudah dipakai di item Renovasi, tidak bisa diubah di sini');return;}
if(entry&&entry.paidTxId){toast('⚠️ Absensi ini sudah dibayar (tercatat di Keuangan), tidak bisa diubah di sini');return;}
Tukang._dayCtx={workerId,date:dateIso};
document.getElementById('tkDayWorkerName').textContent=w.name;
document.getElementById('tkDayBorWorkerNameInline').textContent=w.name;
const d=new Date(dateIso+'T00:00:00');
document.getElementById('tkDayDateLabel').textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
document.getElementById('tkDayMasuk').value=entry&&entry.masuk?entry.masuk:'08:00';
document.getElementById('tkDayPulang').value=entry&&entry.pulang?entry.pulang:'16:00';
document.getElementById('tkDayIstMulai').value=entry&&entry.istMulai?entry.istMulai:'12:00';
document.getElementById('tkDayIstSelesai').value=entry&&entry.istSelesai?entry.istSelesai:'13:00';
document.getElementById('tkDayBorTotal').value=entry&&entry.mode==='borongan'?entry.borTotal:'';
document.getElementById('tkDayBorJumlah').value=entry&&entry.mode==='borongan'&&entry.borJumlah?entry.borJumlah:1;
document.getElementById('tkDayDelBtn').style.display=entry?'':'none';
Tukang.setDayMode(entry&&entry.mode==='borongan'?'borongan':'jam');
openModal('tkDayModal');
},
setDayMode(mode){
Tukang._dayMode=mode;
const jamBtn=document.getElementById('tkDayModeJamBtn'), borBtn=document.getElementById('tkDayModeBorBtn');
const jamWrap=document.getElementById('tkDayJamWrap'), borWrap=document.getElementById('tkDayBorWrap');
if(mode==='borongan'){
jamBtn.style.background='transparent';jamBtn.style.color='var(--text2)';
borBtn.style.background='var(--accent)';borBtn.style.color='#fff';
jamWrap.style.display='none';borWrap.style.display='';
} else {
jamBtn.style.background='var(--accent)';jamBtn.style.color='#fff';
borBtn.style.background='transparent';borBtn.style.color='var(--text2)';
jamWrap.style.display='';borWrap.style.display='none';
}
Tukang.calcDayUpah();
},
calcDayUpah(){
const ctx=Tukang._dayCtx; if(!ctx)return 0;
const w=D.tukangWorkers.find(x=>x.id==ctx.workerId); if(!w)return 0;
if(Tukang._dayMode==='borongan'){
const total=parsePzNum(document.getElementById('tkDayBorTotal').value);
const jumlah=Math.max(1,parseInt(document.getElementById('tkDayBorJumlah').value)||1);
const upah=Math.round(total/jumlah);
document.getElementById('tkDayUpah').textContent=fmtFull(upah);
document.getElementById('tkDayBreakdown').textContent=total>0?(fmtFull(total)+' ÷ '+jumlah+' tukang'):'';
return upah;
}
const masuk=document.getElementById('tkDayMasuk').value;
const pulang=document.getElementById('tkDayPulang').value;
const istMulai=document.getElementById('tkDayIstMulai').value;
const istSelesai=document.getElementById('tkDayIstSelesai').value;
if(!masuk||!pulang){document.getElementById('tkDayUpah').textContent='Rp 0';document.getElementById('tkDayBreakdown').textContent='';return 0;}
const r=Tukang._computeDay(w,masuk,pulang,istMulai,istSelesai);
document.getElementById('tkDayUpah').textContent=fmtFull(r.upah);
let bd=r.totalJam+' jam kerja bersih';
if(r.istirahatMin>0)bd+=' (istirahat '+r.istirahatMin+' menit dikurangi)';
bd+=' · Pokok '+r.jamKerja+' jam × '+fmtFull(w.upahJam);
if(r.jamLembur>0)bd+=' + Lembur '+r.jamLembur+' jam × '+fmtFull(w.upahLemburJam);
document.getElementById('tkDayBreakdown').textContent=bd;
return r.upah;
},
saveDayEntry(){
const ctx=Tukang._dayCtx; if(!ctx)return;
const w=D.tukangWorkers.find(x=>x.id==ctx.workerId); if(!w)return;
const idx=D.tukangAbsensi.findIndex(a=>a.workerId==ctx.workerId&&a.date==ctx.date);
let data;
let upahTersimpan;
if(Tukang._dayMode==='borongan'){
const borTotal=parsePzNum(document.getElementById('tkDayBorTotal').value);
const borJumlah=Math.max(1,parseInt(document.getElementById('tkDayBorJumlah').value)||1);
if(borTotal<=0){toast('⚠️ Isi total upah borongan dulu');return;}
const upah=Math.round(borTotal/borJumlah);
data={mode:'borongan',borTotal,borJumlah,masuk:null,pulang:null,istMulai:null,istSelesai:null,istirahatMin:0,totalJam:0,jamKerja:0,jamLembur:0,upah};
upahTersimpan=upah;
} else {
const masuk=document.getElementById('tkDayMasuk').value;
const pulang=document.getElementById('tkDayPulang').value;
const istMulai=document.getElementById('tkDayIstMulai').value;
const istSelesai=document.getElementById('tkDayIstSelesai').value;
if(!masuk||!pulang){toast('⚠️ Isi jam masuk & jam pulang dulu');return;}
const r=Tukang._computeDay(w,masuk,pulang,istMulai,istSelesai);
if(r.totalJam<=0){toast('⚠️ Jam pulang harus setelah jam masuk');return;}
data={mode:'jam',masuk,pulang,istMulai,istSelesai,istirahatMin:r.istirahatMin,totalJam:r.totalJam,jamKerja:r.jamKerja,jamLembur:r.jamLembur,upah:r.upah,borTotal:null,borJumlah:null};
upahTersimpan=r.upah;
}
if(idx===-1){
D.tukangAbsensi.push({id:uid(),workerId:ctx.workerId,date:ctx.date,renovItemLinkId:null,...data});
} else {
Object.assign(D.tukangAbsensi[idx],data);
}
save();closeModal('tkDayModal');Tukang.renderAll();toast('✅ Absen tersimpan: '+fmtFull(upahTersimpan));
},
async deleteDayEntry(){
const ctx=Tukang._dayCtx; if(!ctx)return;
if(!await askConfirm('Hapus catatan absen hari ini?'))return;
D.tukangAbsensi=D.tukangAbsensi.filter(a=>!(a.workerId==ctx.workerId&&a.date==ctx.date));
save();closeModal('tkDayModal');Tukang.renderAll();toast('🗑 Absen dihapus');
},
openSharedBorModal(){
if(!D.tukangWorkers.length){toast('⚠️ Belum ada pekerja. Tambah dulu di atas.');return;}
const dateEl=document.getElementById('tkBorTanggal');
if(!dateEl.value)dateEl.value=dateToISO(new Date());
document.getElementById('tkBorTotalShared').value='';
Tukang.renderSharedBorWorkerList();
Tukang.calcSharedBorongan();
openModal('tkBorSharedModal');
},
renderSharedBorWorkerList(){
const dateIso=document.getElementById('tkBorTanggal').value;
const listEl=document.getElementById('tkBorWorkerList');
listEl.innerHTML=D.tukangWorkers.map(w=>{
const entry=dateIso?D.tukangAbsensi.find(a=>a.workerId==w.id&&a.date==dateIso):null;
const locked=!!(entry&&(entry.renovItemLinkId||entry.paidTxId));
const lockNote=locked?(entry.paidTxId?' — 🔒 sudah dibayar':' — 🔒 sudah dipakai di item Renovasi'):'';
return `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);${locked?'opacity:0.5':''}">
        <input type="checkbox" class="tkBorWorkerChk" value="${w.id}" onchange="Tukang.calcSharedBorongan()" ${locked?'disabled':'checked'}>
        <span class="u-fs13 u-fw600">${escapeHtml(w.name)}${lockNote?'<span class="u-fw600 u-t2">'+lockNote+'</span>':''}</span>
      </label>`;
}).join('');
},
calcSharedBorongan(){
const total=parsePzNum(document.getElementById('tkBorTotalShared').value);
const checked=[...document.querySelectorAll('.tkBorWorkerChk:checked')];
const n=checked.length;
const perOrang=n>0?Math.round(total/n):0;
document.getElementById('tkBorSharedPerOrang').textContent=fmtFull(perOrang);
document.getElementById('tkBorSharedPreview').textContent=n>0?(fmtFull(total)+' ÷ '+n+' tukang dicentang'):'⚠️ Pilih minimal 1 tukang';
return {total,n,perOrang};
},
saveSharedBorongan(){
const dateIso=document.getElementById('tkBorTanggal').value;
if(!dateIso){toast('⚠️ Isi tanggal dulu');return;}
const {total,n,perOrang}=Tukang.calcSharedBorongan();
if(total<=0){toast('⚠️ Isi total upah borongan dulu');return;}
if(n<=0){toast('⚠️ Centang minimal 1 tukang yang ikut');return;}
const checkedIds=[...document.querySelectorAll('.tkBorWorkerChk:checked')].map(c=>c.value);
let saved=0,skipped=[];
checkedIds.forEach(workerId=>{
const idx=D.tukangAbsensi.findIndex(a=>a.workerId==workerId&&a.date==dateIso);
const existing=idx!==-1?D.tukangAbsensi[idx]:null;
if(existing&&(existing.renovItemLinkId||existing.paidTxId)){
const w=D.tukangWorkers.find(x=>x.id==workerId);
skipped.push(w?w.name:'?');
return;
}
const data={mode:'borongan',borTotal:total,borJumlah:n,upah:perOrang,masuk:null,pulang:null,istMulai:null,istSelesai:null,istirahatMin:0,totalJam:0,jamKerja:0,jamLembur:0};
if(idx===-1){
D.tukangAbsensi.push({id:uid(),workerId,date:dateIso,renovItemLinkId:null,paidTxId:null,...data});
} else {
Object.assign(D.tukangAbsensi[idx],data);
}
saved++;
});
save();closeModal('tkBorSharedModal');Tukang.renderAll();
let msg='✅ Borongan tersimpan: '+fmtFull(perOrang)+'/orang × '+saved+' tukang';
if(skipped.length)msg+=' — dilewati: '+skipped.join(', ')+' (absensinya sudah dipakai/dibayar)';
toast(msg);
},
BOR_JENIS_LABEL:{keramik:'Pasang Keramik',plester:'Plester Dinding',acian:'Acian Dinding',cat:'Pengecatan',bata:'Pasang Bata/Batako',bongkar:'Bongkar Bangunan',cor:'Cor Dak/Kolom Beton',listrik:'Instalasi Titik Listrik',kusen:'Pasang Kusen/Pintu/Jendela',pipa:'Pasang Pipa/Saluran'},
BOR_JENIS_UNIT:{keramik:'m2',plester:'m2',acian:'m2',cat:'m2',bata:'m2',bongkar:'m2',cor:'m3',listrik:'buah',kusen:'buah',pipa:'meter'},
BOR_UNIT_LABEL:{m2:'m²',m3:'m³',meter:'meter',buah:'buah/titik'},
_borHargaMemoryKey(){
const jenis=document.getElementById('tkBorCalcJenis').value;
if(jenis!=='custom')return jenis;
const name=(document.getElementById('tkBorCalcCustomName').value||'').trim().toLowerCase();
return name?'custom:'+name:null;
},
openBorCalc(target){
Tukang._borCalcTarget=target;
document.getElementById('tkBorCalcJenis').value='keramik';
document.getElementById('tkBorCalcCustomName').value='';
document.getElementById('tkBorCalcSatuan').value='m2';
document.getElementById('tkBorCalcP').value='';
document.getElementById('tkBorCalcL').value='';
document.getElementById('tkBorCalcT').value='';
document.getElementById('tkBorCalcLuas').value='';
document.getElementById('tkBorCalcHarga').value='';
document.getElementById('tkBorCalcHitungUkuran').checked=false;
Tukang.onBorCalcJenisChange();
Tukang.toggleBorCalcUkuran();
openModal('tkBorCalcModal');
},
_applyBorCalcUnitUI(){
const unit=document.getElementById('tkBorCalcSatuan').value;
const unitLabel=Tukang.BOR_UNIT_LABEL[unit];
document.getElementById('tkBorCalcHargaLbl').textContent='Harga Borongan per '+unitLabel+' (Rp)';
document.getElementById('tkBorCalcLuasLbl').textContent='Jumlah Pekerjaan ('+unitLabel+')';
document.getElementById('tkBorCalcLuasOutLbl').textContent='Jumlah Dipakai';
const isUkuranBisa=unit==='m2'||unit==='m3';
document.getElementById('tkBorCalcUkuranToggleWrap').style.display=isUkuranBisa?'':'none';
document.getElementById('tkBorCalcUkuranSub').textContent=unit==='m3'?'Otomatis hitung volume dari panjang × lebar × tinggi':'Otomatis hitung luas dari panjang × lebar ruangan/bidang';
document.getElementById('tkBorCalcTWrap').style.display=unit==='m3'?'':'none';
if(!isUkuranBisa){
document.getElementById('tkBorCalcHitungUkuran').checked=false;
document.getElementById('tkBorCalcUkuranWrap').style.display='none';
document.getElementById('tkBorCalcLuasWrap').style.display='';
}
const hargaEl=document.getElementById('tkBorCalcHarga');
const memNoteEl=document.getElementById('tkBorCalcHargaMemoryNote');
const key=Tukang._borHargaMemoryKey();
const remembered=key&&D.tukangBorHargaMemory?D.tukangBorHargaMemory[key]:null;
if(remembered&&!parsePzNum(hargaEl.value)){
hargaEl.value=remembered;
memNoteEl.textContent='💡 Otomatis diisi dari harga terakhir dipakai ('+fmtFull(remembered)+'/'+unitLabel+')';
} else {
memNoteEl.textContent='';
}
},
onBorCalcJenisChange(){
const jenis=document.getElementById('tkBorCalcJenis').value;
document.getElementById('tkBorCalcCustomNameWrap').style.display=jenis==='custom'?'':'none';
document.getElementById('tkBorCalcSatuanWrap').style.display=jenis==='custom'?'':'none';
if(jenis!=='custom'){
document.getElementById('tkBorCalcSatuan').value=Tukang.BOR_JENIS_UNIT[jenis]||'m2';
}
document.getElementById('tkBorCalcHarga').value='';
Tukang._applyBorCalcUnitUI();
Tukang.calcBorCalc();
},
onBorCalcSatuanChange(){
document.getElementById('tkBorCalcHarga').value='';
Tukang._applyBorCalcUnitUI();
Tukang.calcBorCalc();
},
onBorCalcCustomNameInput(){
Tukang._applyBorCalcUnitUI();
},
toggleBorCalcUkuran(){
const on=document.getElementById('tkBorCalcHitungUkuran').checked;
document.getElementById('tkBorCalcUkuranWrap').style.display=on?'':'none';
document.getElementById('tkBorCalcLuasWrap').style.display=on?'none':'';
Tukang.calcBorCalc();
},
calcBorCalc(){
const unit=document.getElementById('tkBorCalcSatuan').value;
const hitungUkuran=document.getElementById('tkBorCalcHitungUkuran').checked&&(unit==='m2'||unit==='m3');
let jumlah;
if(hitungUkuran){
const p=parsePzNum(document.getElementById('tkBorCalcP').value);
const l=parsePzNum(document.getElementById('tkBorCalcL').value);
if(unit==='m3'){
const t=parsePzNum(document.getElementById('tkBorCalcT').value);
jumlah=p*l*t;
} else {
jumlah=p*l;
}
document.getElementById('tkBorCalcLuas').value=jumlah?String(Math.round(jumlah*100)/100):'';
} else {
jumlah=parsePzNum(document.getElementById('tkBorCalcLuas').value);
}
const harga=parsePzNum(document.getElementById('tkBorCalcHarga').value);
const total=Math.round(jumlah*harga);
const unitLabel=Tukang.BOR_UNIT_LABEL[unit];
document.getElementById('tkBorCalcLuasOut').textContent=(Math.round(jumlah*100)/100)+' '+unitLabel;
document.getElementById('tkBorCalcTotal').textContent=fmtFull(total);
Tukang._borCalcResult={luas:jumlah,total,harga,unit};
return Tukang._borCalcResult;
},
useBorCalc(){
const r=Tukang._borCalcResult||Tukang.calcBorCalc();
if(!r.total||r.total<=0){toast('⚠️ Isi luas/ukuran & harga borongan dulu');return;}
const key=Tukang._borHargaMemoryKey();
if(key&&r.harga>0){
if(!D.tukangBorHargaMemory)D.tukangBorHargaMemory={};
D.tukangBorHargaMemory[key]=r.harga;
save();
}
const target=Tukang._borCalcTarget;
if(target==='day'){
document.getElementById('tkDayBorTotal').value=r.total;
Tukang.calcDayUpah();
} else if(target==='shared'){
document.getElementById('tkBorTotalShared').value=r.total;
Tukang.calcSharedBorongan();
}
closeModal('tkBorCalcModal');
toast('✅ Hasil kalkulator dipakai: '+fmtFull(r.total));
},
_borHistMonth:null,
openBorHistory(){
const now=new Date();
Tukang._borHistMonth=new Date(now.getFullYear(),now.getMonth(),1);
Tukang.renderBorHistory();
openModal('tkBorHistModal');
},
changeBorHistMonth(delta){
const m=Tukang._borHistMonth||new Date();
Tukang._borHistMonth=new Date(m.getFullYear(),m.getMonth()+delta,1);
Tukang.renderBorHistory();
},
renderBorHistory(){
const m=Tukang._borHistMonth||new Date(new Date().getFullYear(),new Date().getMonth(),1);
document.getElementById('tkBorHistMonthLabel').textContent=m.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
const from=dateToISO(m);
const to=dateToISO(new Date(m.getFullYear(),m.getMonth()+1,0));
const entries=D.tukangAbsensi.filter(a=>a.mode==='borongan'&&a.date>=from&&a.date<=to).sort((a,b)=>a.date<b.date?1:(a.date>b.date?-1:0));
const total=entries.reduce((s,a)=>s+a.upah,0);
const hariSet=new Set(entries.map(a=>a.date));
document.getElementById('tkBorHistTotal').textContent=fmtFull(total);
document.getElementById('tkBorHistSub').textContent=entries.length+' entri · '+hariSet.size+' hari kerja borongan';
const listEl=document.getElementById('tkBorHistList');
if(!entries.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Belum ada absensi borongan di bulan ini.</div></div>';
return;
}
listEl.innerHTML=entries.map(a=>{
const w=D.tukangWorkers.find(x=>x.id==a.workerId);
const name=w?w.name:'(pekerja dihapus)';
const d=new Date(a.date+'T00:00:00');
const dateLabel=d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
const lockNote=a.paidTxId?' · 💸 sudah dibayar':(a.renovItemLinkId?' · 🔒 dipakai di item Renovasi':'');
return `<div class="tx-item">
        <div class="u-minw0"><div class="tx-name">${escapeHtml(name)}</div><div class="tx-meta">${dateLabel} · ${fmtFull(a.borTotal)} ÷ ${a.borJumlah} tukang${lockNote}</div></div>
        <div class="tx-amount">${fmtFull(a.upah)}</div>
      </div>`;
}).join('');
},
payBorHistoryAsExpense(){
const m=Tukang._borHistMonth||new Date(new Date().getFullYear(),new Date().getMonth(),1);
const from=dateToISO(m);
const to=dateToISO(new Date(m.getFullYear(),m.getMonth()+1,0));
const entries=D.tukangAbsensi.filter(a=>a.mode==='borongan'&&!a.renovItemLinkId&&!a.paidTxId&&a.date>=from&&a.date<=to);
if(!entries.length){toast('⚠️ Tidak ada absensi borongan yang bisa dibayar di bulan ini (kosong, atau semua sudah dibayar/dipakai di item Renovasi)');return;}
const total=entries.reduce((s,a)=>s+a.upah,0);
const byWorker={};
entries.forEach(a=>{
const w=D.tukangWorkers.find(x=>x.id==a.workerId);
const name=w?w.name:'(pekerja dihapus)';
byWorker[name]=(byWorker[name]||0)+a.upah;
});
const detail=Object.entries(byWorker).map(([name,t])=>name+': '+fmtFull(t)).join(' · ');
const monthLabel=m.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
Tukang._pendingPaymentEntryIds=entries.map(a=>a.id);
Tukang._pendingPaymentRange={from,to};
closeModal('tkBorHistModal');closeModal('tukangModal');
openTxModal('expense');
setTimeout(()=>{
document.getElementById('txAmt').value=Math.round(total);
const upahCat=D.categories.expense.find(c=>/tukang|upah|gaji|renovasi/i.test(c.name));
if(upahCat){ document.getElementById('txCat').value=upahCat.name; updateSubCatOptions(); }
document.getElementById('txNote').value='Upah borongan '+monthLabel+' — '+detail;
},60);
},
_jamHistMonth:null,
openJamHistory(){
const now=new Date();
Tukang._jamHistMonth=new Date(now.getFullYear(),now.getMonth(),1);
Tukang.renderJamHistory();
openModal('tkJamHistModal');
},
changeJamHistMonth(delta){
const m=Tukang._jamHistMonth||new Date();
Tukang._jamHistMonth=new Date(m.getFullYear(),m.getMonth()+delta,1);
Tukang.renderJamHistory();
},
renderJamHistory(){
const m=Tukang._jamHistMonth||new Date(new Date().getFullYear(),new Date().getMonth(),1);
document.getElementById('tkJamHistMonthLabel').textContent=m.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
const from=dateToISO(m);
const to=dateToISO(new Date(m.getFullYear(),m.getMonth()+1,0));
const entries=D.tukangAbsensi.filter(a=>a.mode!=='borongan'&&a.date>=from&&a.date<=to).sort((a,b)=>a.date<b.date?1:(a.date>b.date?-1:0));
const total=entries.reduce((s,a)=>s+a.upah,0);
const totalJamKerja=entries.reduce((s,a)=>s+(a.jamKerja||0),0);
const totalJamLembur=entries.reduce((s,a)=>s+(a.jamLembur||0),0);
document.getElementById('tkJamHistTotal').textContent=fmtFull(total);
document.getElementById('tkJamHistSub').textContent=entries.length+' hari absen · '+(Math.round(totalJamKerja*100)/100)+' jam kerja + '+(Math.round(totalJamLembur*100)/100)+' jam lembur';
const listEl=document.getElementById('tkJamHistList');
if(!entries.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">⏱</div><div class="empty-text">Belum ada absen per jam di bulan ini.</div></div>';
return;
}
listEl.innerHTML=entries.map(a=>{
const w=D.tukangWorkers.find(x=>x.id==a.workerId);
const name=w?w.name:'(pekerja dihapus)';
const d=new Date(a.date+'T00:00:00');
const dateLabel=d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
const jamLabel=a.masuk&&a.pulang?(a.masuk+'–'+a.pulang):'';
let jamDetail=(a.jamKerja||0)+' jam kerja';
if(a.jamLembur>0)jamDetail+=' + '+a.jamLembur+' jam lembur';
const lockNote=a.paidTxId?' · 💸 sudah dibayar':(a.renovItemLinkId?' · 🔒 dipakai di item Renovasi':'');
return `<div class="tx-item">
        <div class="u-minw0"><div class="tx-name">${escapeHtml(name)}</div><div class="tx-meta">${dateLabel} · ${jamLabel} · ${jamDetail}${lockNote}</div></div>
        <div class="tx-amount">${fmtFull(a.upah)}</div>
      </div>`;
}).join('');
},
renderAll(){
const start=new Date(Tukang.weekStart);
const end=new Date(start); end.setDate(start.getDate()+6);
const labelEl=document.getElementById('tkWeekLabel');
if(labelEl){
const now=new Date(); const {start:curStart}=getWeekRange(now);
const isCur=start.getTime()===curStart.getTime();
const fmtShort=d=>d.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
labelEl.textContent=fmtShort(start)+' – '+fmtShort(end)+(isCur?' (Ini)':'');
}
const days=[];for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d);}
const dowShort=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const listEl=document.getElementById('tkWorkerList');
if(!listEl)return;
if(!D.tukangWorkers.length){listEl.innerHTML='<div class="empty"><div class="empty-icon">👷</div><div class="empty-text">Belum ada pekerja. Tambah dulu di atas.</div></div>';return;}
listEl.innerHTML=D.tukangWorkers.map(w=>{
let weekTotal=0;
const chips=days.map(d=>{
const iso=dateToISO(d);
const entry=D.tukangAbsensi.find(a=>a.workerId==w.id&&a.date==iso);
let label='·',bg='var(--surface3)',color='var(--text3)';
if(entry){
weekTotal+=entry.upah;
if(entry.mode==='borongan'){
label='📦';
bg='var(--accent2-soft)';color='var(--accent2)';
} else {
const totalJam=entry.jamKerja+entry.jamLembur;
label=(totalJam%1===0?totalJam:totalJam.toFixed(1))+'j';
bg=entry.jamLembur>0?'var(--accent4-soft)':'var(--accent3-soft)';
color=entry.jamLembur>0?'var(--accent4)':'var(--accent3)';
}
}
const locked=!!(entry&&(entry.renovItemLinkId||entry.paidTxId));
const paidLock=!!(entry&&entry.paidTxId);
const jamLabel=entry&&entry.mode==='borongan'?` borongan ${fmtFull(entry.borTotal)}÷${entry.borJumlah}`:(entry&&entry.masuk&&entry.pulang?` ${entry.masuk}–${entry.pulang}`:'');
const lockNote=paidLock?' (sudah dibayar)':(locked?' (sudah dipakai di item Renovasi)':'');
return `<div ${locked?'':`data-tk-day="1" data-tk-worker="${w.id}" data-tk-date="${iso}"`} class="wh-day-box" style="cursor:${locked?'default':'pointer'}" title="${dowShort[d.getDay()]} ${iso}${jamLabel}${lockNote}">
<div class="wh-day-box-dow">${dowShort[d.getDay()]}</div>
<div class="wh-day-box-date">${d.getDate()}</div>
<div class="wh-day-box-status" style="background:${bg};color:${color}">${label}</div>
${locked?'<span class="u-abs" style="top:2px;right:4px;font-size:8px">'+(paidLock?'💸':'🔒')+'</span>':''}
</div>`;
}).join('');
return `<div class="tx-item u-fdcol u-gap8" style="align-items:stretch">
        <div class="u-flex u-jcb u-aic u-gap8">
          <div class="u-minw0"><div class="tx-name">${escapeHtml(w.name)}</div><div class="tx-meta">${fmtFull(w.upahJam)}/jam · lembur ${fmtFull(w.upahLemburJam)}/jam</div></div>
          <div class="u-tar" style="flex-shrink:0"><div class="tx-amount">${fmtFull(weekTotal)}</div><div class="u-fs11 u-t2">minggu ini</div></div>
          <button class="tx-del" data-tk-del="${w.id}" aria-label="Hapus">🗑</button>
        </div>
        <div class="u-flex u-gap4">${chips}</div>
        ${Tukang.renderWorkerHistory(w)}
      </div>`;
}).join('');
if(!listEl._tkDelegated){
listEl._tkDelegated=true;
const handleTap=(e)=>{
const dayEl=e.target.closest('[data-tk-day]');
if(dayEl){Tukang.openDayEntry(dayEl.getAttribute('data-tk-worker'),dayEl.getAttribute('data-tk-date'));return;}
const delEl=e.target.closest('[data-tk-del]');
if(delEl){Tukang.delWorker(delEl.getAttribute('data-tk-del'));return;}
const histToggleEl=e.target.closest('[data-tk-hist-toggle]');
if(histToggleEl){Tukang.toggleWorkerHistory(histToggleEl.getAttribute('data-tk-hist-toggle'));return;}
const histDelEl=e.target.closest('[data-tk-hist-del]');
if(histDelEl){Tukang.delAbsensiEntry(histDelEl.getAttribute('data-tk-hist-del'));return;}
const histEditEl=e.target.closest('[data-tk-hist-edit]');
if(histEditEl){Tukang.openDayEntry(histEditEl.getAttribute('data-tk-hist-worker'),histEditEl.getAttribute('data-tk-hist-date'));return;}
};
listEl.addEventListener('click',handleTap);
}
},
calcRange(){
const from=document.getElementById('tkRangeFrom').value;
const to=document.getElementById('tkRangeTo').value;
if(!from||!to){toast('⚠️ Isi tanggal dari & sampai dulu');Tukang._rangeResult=null;return;}
const entries=D.tukangAbsensi.filter(a=>!a.renovItemLinkId&&!a.paidTxId&&a.date>=from&&a.date<=to);
const total=entries.reduce((s,a)=>s+a.upah,0);
const byWorker={};
entries.forEach(a=>{
const w=D.tukangWorkers.find(x=>x.id==a.workerId);
const name=w?w.name:'(pekerja dihapus)';
if(!byWorker[name])byWorker[name]={jamKerja:0,jamLembur:0,borHari:0,total:0};
byWorker[name].jamKerja+=a.jamKerja||0;
byWorker[name].jamLembur+=a.jamLembur||0;
if(a.mode==='borongan')byWorker[name].borHari+=1;
byWorker[name].total+=a.upah;
});
const detail=Object.entries(byWorker).map(([name,d])=>{
let parts=[];
if(d.jamKerja||d.jamLembur){
let s=d.jamKerja+' jam kerja';
if(d.jamLembur)s+=' + '+d.jamLembur+' jam lembur';
parts.push(s);
}
if(d.borHari)parts.push(d.borHari+' hari borongan');
return `${name}: ${parts.join(' + ')} = ${fmtFull(d.total)}`;
}).join(' · ');
document.getElementById('tkRangeTotal').textContent=fmtFull(total);
document.getElementById('tkRangeDetail').textContent=detail||'Belum ada absensi yang bisa dipakai pada periode ini';
Tukang._rangeResult={total,entryIds:entries.map(a=>a.id),from,to,detail};
return Tukang._rangeResult;
},
payAsExpense(){
const r=Tukang.calcRange();
if(!r||r.total<=0){toast('⚠️ Tidak ada absensi yang bisa dibayar pada periode ini');return;}
Tukang._pendingPaymentEntryIds=r.entryIds;
Tukang._pendingPaymentRange={from:r.from,to:r.to};
closeModal('tukangModal');
openTxModal('expense');
setTimeout(()=>{
document.getElementById('txAmt').value=Math.round(r.total);
const upahCat=D.categories.expense.find(c=>/tukang|upah|gaji|renovasi/i.test(c.name));
if(upahCat){ document.getElementById('txCat').value=upahCat.name; updateSubCatOptions(); }
document.getElementById('txNote').value='Upah tukang '+r.from+' s/d '+r.to+(r.detail?' — '+r.detail:'');
},60);
},
applyPendingPayment(txId){
const ids=Tukang._pendingPaymentEntryIds;
if(!ids||!ids.length)return;
ids.forEach(id=>{
const a=D.tukangAbsensi.find(x=>sameId(x.id,id));
if(a)a.paidTxId=txId;
});
const t=D.transactions.find(x=>x.id===txId);
if(t)t.tukangPaymentEntryIds=ids;
Tukang._pendingPaymentEntryIds=null;
Tukang._pendingPaymentRange=null;
},
unmarkPaidEntries(entryIds){
(entryIds||[]).forEach(id=>{
const a=D.tukangAbsensi.find(x=>sameId(x.id,id));
if(a)delete a.paidTxId;
});
},
applyToItem(){
const r=Tukang.calcRange();
if(!r||r.total<=0){toast('⚠️ Tidak ada absensi yang bisa dipakai pada periode ini');return;}
const hargaEl=document.getElementById('renovItemHarga');
if(!hargaEl){toast('⚠️ Buka dulu form Tambah/Edit Item Biaya di Proyek Renovasi');return;}
hargaEl.value=Math.round(r.total);
const nameEl=document.getElementById('renovItemName');
if(nameEl&&!nameEl.value.trim())nameEl.value='Upah Tukang (Absensi '+r.from+' s/d '+r.to+')';
if(typeof RenovCalc!=='undefined'){
RenovCalc._pendingDetail={
type:'absensi',entryIds:r.entryIds,from:r.from,to:r.to,
total:Math.round(r.total),
text:'Absensi tukang '+r.from+' s/d '+r.to+' — '+(r.detail||'-')
};
}
closeModal('tukangModal');
toast('✅ Total absensi dipakai ke form item — jangan lupa tap Simpan Item');
},
markUsed(entryIds,itemId){
(entryIds||[]).forEach(id=>{
const a=D.tukangAbsensi.find(x=>sameId(x.id,id));
if(a)a.renovItemLinkId=itemId;
});
},
releaseEntries(entryIds){
(entryIds||[]).forEach(id=>{
const a=D.tukangAbsensi.find(x=>sameId(x.id,id));
if(a)a.renovItemLinkId=null;
});
}
};
