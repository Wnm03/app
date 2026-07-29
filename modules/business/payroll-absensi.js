// payroll-absensi.js — Payroll: Absensi Harian & Kalkulator Gaji Mingguan (const Payroll={...})
// Dipindah ke modules/business/payroll-absensi.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (v93): dipindah dari backup-restore.js — domain ini sudah rapi
// sbg 1 objek modul (mirip LinkTx/Renov/Aset), jadi dipisah jadi file domain sendiri, bukan digabung
// ke file lain. Lihat PEMISAHAN-FILE-ROADMAP.md.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: data-default.js, features-helpers-global-security.js, diagnostik-versi.js, format-tema.js, error-handler.js, helper-teks.js, keamanan-pin.js, modal-navigasi.js, reset-gaji-mingguan.js, debug-console.js, pengaturan-search.js, onboarding.js, kalkulator-input.js, scan-ocr.js, filter-laporan.js, akun.js, gaji-calc.js, transaksi.js, profil-pengaturan.js, kategori.js, tagihan-kalender.js, backup-restore.js, payroll-absensi.js, tukang-absensi.js

const Payroll={
weekStart:getWeekRange(new Date()).start,
editId:null,
selectedGridDate:null,
timeToMinutes(t){if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m;},
setWhTab(tab){
const isAbsensi=tab==='absensi';
const aBtn=document.getElementById('whTabAbsensiBtn'), kBtn=document.getElementById('whTabKalkulatorBtn');
const aWrap=document.getElementById('whTabAbsensiWrap'), kWrap=document.getElementById('whTabKalkulatorWrap');
if(aBtn){aBtn.style.background=isAbsensi?'var(--accent)':'transparent';aBtn.style.color=isAbsensi?'#fff':'var(--text2)';}
if(kBtn){kBtn.style.background=!isAbsensi?'var(--accent)':'transparent';kBtn.style.color=!isAbsensi?'#fff':'var(--text2)';}
if(aWrap)aWrap.classList.toggle('u-dnone',!isAbsensi);
if(kWrap)kWrap.classList.toggle('u-dnone',isAbsensi);
},
showFormFields(){
const wrapEl=document.getElementById('whFormFieldsWrap');
if(wrapEl)wrapEl.classList.remove('u-dnone');
},
hideFormFields(){
const wrapEl=document.getElementById('whFormFieldsWrap');
if(wrapEl)wrapEl.classList.add('u-dnone');
},
openAbsensiModal(){
Payroll.editId=null;
Payroll.setWhTab('absensi');
Payroll.hideFormFields();
const hintEl=document.getElementById('whEditHint');
if(hintEl)hintEl.style.display='none';
const saveBtnEl=document.getElementById('whSaveBtn');
if(saveBtnEl)saveBtnEl.textContent='+ Tambah ke Absensi Minggu Ini';
document.getElementById('whDate').value=new Date().toISOString().split('T')[0];
document.getElementById('whGaji').value=D.profile.gajiPokok||'';
const whIstMulaiEl=document.getElementById('whIstMulai'); if(whIstMulaiEl)whIstMulaiEl.value='12:00';
const whIstSelesaiEl=document.getElementById('whIstSelesai'); if(whIstSelesaiEl)whIstSelesaiEl.value='13:00';
const whBorTotalEl=document.getElementById('whBorTotal'); if(whBorTotalEl)whBorTotalEl.value='';
const whBorNoteEl=document.getElementById('whBorNote'); if(whBorNoteEl)whBorNoteEl.value='';
const whPotonganEl=document.getElementById('whPotongan'); if(whPotonganEl)whPotonganEl.value='';
const whTambahanEl=document.getElementById('whTambahan'); if(whTambahanEl)whTambahanEl.value='';
document.getElementById('whJenisHari').value='biasa';
Payroll.onJenisHariChange();
const targetEl=document.getElementById('pyTargetBulanan');
if(targetEl)targetEl.value=D.profile.targetGajiBulanan||'';
const rekoBoxEl=document.getElementById('pyRateRekoBox');
if(rekoBoxEl){rekoBoxEl.style.display='none';rekoBoxEl.innerHTML='';}
if(D.profile.targetGajiBulanan)Payroll.renderRateRecommendation();
Payroll.weekStart=getWeekRange(new Date()).start;
const mingguOptEl=document.getElementById('whJenisMingguOpt');
if(mingguOptEl)mingguOptEl.textContent='Hari Minggu ('+fmt(D.profile.tarifMinggu||139000)+')';
Payroll.renderWorkDays();
openModal('absensiModal');
},
onJenisHariChange(){
const jenis=document.getElementById('whJenisHari').value;
const isBorongan=jenis==='borongan';
const jamWrap=document.getElementById('whJamFieldsWrap');
const borWrap=document.getElementById('whBorFieldsWrap');
const gajiWrap=document.getElementById('whGajiWrap');
if(jamWrap)jamWrap.classList.toggle('u-dnone',isBorongan);
if(borWrap)borWrap.classList.toggle('u-dnone',!isBorongan);
if(gajiWrap)gajiWrap.classList.toggle('u-dnone',isBorongan);
},
changeAbsensiWeek(dir){
const d=new Date(Payroll.weekStart);
d.setDate(d.getDate()+7*dir);
Payroll.weekStart=getWeekRange(d).start;
const now=new Date();
const {start:curStart}=getWeekRange(now);
const isCurrentWeek=(Payroll.weekStart.getTime()===curStart.getTime());
const whDateEl=document.getElementById('whDate');
if(whDateEl)whDateEl.value=isCurrentWeek?dateToISO(now):dateToISO(Payroll.weekStart);
Payroll.renderWorkDays();
},
addWorkDay(){
const date=document.getElementById('whDate').value;
const jenis=document.getElementById('whJenisHari').value;
if(!date){toast('⚠️ Lengkapi tanggal');return;}
if(jenis==='borongan'){
const borNoteEl=document.getElementById('whBorNote');
const borNote=borNoteEl?borNoteEl.value.trim():'';
const borTotal=parsePzNum(document.getElementById('whBorTotal').value);
if(!borTotal||borTotal<=0){toast('⚠️ Isi total upah borongan/trip');return;}
const potonganEl=document.getElementById('whPotongan');
const potongan=potonganEl?(parsePzNum(potonganEl.value)||0):0;
const tambahanEl=document.getElementById('whTambahan');
const tambahan=tambahanEl?(parsePzNum(tambahanEl.value)||0):0;
const total=Math.max(0,Math.round(borTotal)+tambahan-potongan);
if(Payroll.editId!==null){
D.workDays=D.workDays.filter(w=>w.id!==Payroll.editId&&w.date!==date);
} else {
D.workDays=D.workDays.filter(w=>w.date!==date);
}
D.workDays.push({id:Payroll.editId!==null?Payroll.editId:uid(),date,masuk:'',pulang:'',istMulai:'',istSelesai:'',istirahatMin:0,totalJam:0,jamLembur:0,jenis,pokok:Math.round(borTotal),lembur:0,potongan,tambahan,total,borNote,gajiHariInput:null});
const wasEdit=Payroll.editId!==null;
Payroll.cancelEditWorkDay();
save();Payroll.renderWorkDays();Payroll.renderDashMini();toast(wasEdit?'✅ Absensi diperbarui: '+fmtFull(total):'✅ Absensi borongan tersimpan: '+fmtFull(total));
return;
}
const masuk=document.getElementById('whMasuk').value;
const pulang=document.getElementById('whPulang').value;
const istMulaiStr=document.getElementById('whIstMulai').value||'12:00';
const istSelesaiStr=document.getElementById('whIstSelesai').value||'13:00';
const gajiHari=parseInt(document.getElementById('whGaji').value)||D.profile.gajiPokok||65000;
if(!masuk||!pulang){toast('⚠️ Lengkapi tanggal & jam kerja');return;}
let totalMinKotor=Payroll.timeToMinutes(pulang)-Payroll.timeToMinutes(masuk);
if(totalMinKotor<0)totalMinKotor+=24*60;
const istMulai=Payroll.timeToMinutes(istMulaiStr);
let istSelesai=Payroll.timeToMinutes(istSelesaiStr);
if(istSelesai<istMulai)istSelesai+=24*60;
const masukMin=Payroll.timeToMinutes(masuk);
let pulangMin=Payroll.timeToMinutes(pulang);
if(pulangMin<masukMin) pulangMin+=24*60;
const overlapStart=Math.max(masukMin,istMulai);
const overlapEnd=Math.min(pulangMin,istSelesai);
const istirahatMin=Math.max(0,overlapEnd-overlapStart);
const totalMinBersih=totalMinKotor-istirahatMin;
const totalJam=totalMinBersih/60;
const lemburMx=D.profile.lemburMultiplier||1.5;
const tarifMinggu=D.profile.tarifMinggu||139000;
const jamLembur=jenis==='minggu'?0:Math.max(0,totalJam-7);
const pokok=jenis==='minggu'?tarifMinggu:gajiHari;
const upahLemburPerJam=gajiHari/7*lemburMx;
const lembur=jenis==='minggu'?0:jamLembur*upahLemburPerJam;
const potonganEl=document.getElementById('whPotongan');
const potongan=potonganEl?(parsePzNum(potonganEl.value)||0):0;
const tambahanEl=document.getElementById('whTambahan');
const tambahan=tambahanEl?(parsePzNum(tambahanEl.value)||0):0;
const total=Math.max(0,pokok+lembur+tambahan-potongan);
if(Payroll.editId!==null){
D.workDays=D.workDays.filter(w=>w.id!==Payroll.editId&&w.date!==date);
} else {
D.workDays=D.workDays.filter(w=>w.date!==date);
}
D.workDays.push({id:Payroll.editId!==null?Payroll.editId:uid(),date,masuk,pulang,istMulai:istMulaiStr,istSelesai:istSelesaiStr,istirahatMin,totalJam:Math.round(totalJam*100)/100,jamLembur:Math.round(jamLembur*100)/100,jenis,pokok,lembur:Math.round(lembur),potongan,tambahan,total:Math.round(total),gajiHariInput:gajiHari,borNote:''});
const wasEdit=Payroll.editId!==null;
Payroll.cancelEditWorkDay();
save();Payroll.renderWorkDays();Payroll.renderDashMini();toast(wasEdit?'✅ Absensi diperbarui: '+fmtFull(total):'✅ Absensi tersimpan: '+fmtFull(total));
},
editWorkDay(id){
const w=D.workDays.find(x=>x.id===id);
if(!w)return;
Payroll.editId=id;
Payroll.selectedGridDate=w.date;
Payroll.renderWeekGrid();
Payroll.setWhTab('absensi');
Payroll.showFormFields();
document.getElementById('whDate').value=w.date;
document.getElementById('whMasuk').value=w.masuk||'07:00';
document.getElementById('whPulang').value=w.pulang||'15:00';
document.getElementById('whIstMulai').value=w.istMulai||'12:00';
document.getElementById('whIstSelesai').value=w.istSelesai||'13:00';
document.getElementById('whJenisHari').value=w.jenis||'biasa';
document.getElementById('whGaji').value=(w.gajiHariInput!=null?w.gajiHariInput:w.pokok)||D.profile.gajiPokok||'';
const whBorTotalEl=document.getElementById('whBorTotal'); if(whBorTotalEl)whBorTotalEl.value=w.jenis==='borongan'?w.pokok:'';
const whBorNoteEl=document.getElementById('whBorNote'); if(whBorNoteEl)whBorNoteEl.value=w.borNote||'';
const whPotonganEl=document.getElementById('whPotongan'); if(whPotonganEl)whPotonganEl.value=w.potongan||'';
const whTambahanEl=document.getElementById('whTambahan'); if(whTambahanEl)whTambahanEl.value=w.tambahan||'';
Payroll.onJenisHariChange();
document.getElementById('whEditHint').style.display='block';
document.getElementById('whEditDateLabel').textContent=new Date(w.date).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
document.getElementById('whSaveBtn').textContent='💾 Update Absensi';
document.getElementById('whDate').scrollIntoView({behavior:'smooth',block:'center'});
},
cancelEditWorkDay(dateOverride){
Payroll.editId=null;
document.getElementById('whEditHint').style.display='none';
document.getElementById('whSaveBtn').textContent='+ Tambah ke Absensi Minggu Ini';
document.getElementById('whGaji').value=D.profile.gajiPokok||'';
document.getElementById('whMasuk').value='07:00';
document.getElementById('whPulang').value='15:00';
document.getElementById('whIstMulai').value='12:00';
document.getElementById('whIstSelesai').value='13:00';
document.getElementById('whJenisHari').value='biasa';
const whBorTotalEl2=document.getElementById('whBorTotal'); if(whBorTotalEl2)whBorTotalEl2.value='';
const whBorNoteEl2=document.getElementById('whBorNote'); if(whBorNoteEl2)whBorNoteEl2.value='';
const whPotonganEl2=document.getElementById('whPotongan'); if(whPotonganEl2)whPotonganEl2.value='';
const whTambahanEl2=document.getElementById('whTambahan'); if(whTambahanEl2)whTambahanEl2.value='';
Payroll.onJenisHariChange();
if(dateOverride){
document.getElementById('whDate').value=dateOverride;
Payroll.selectedGridDate=dateOverride;
Payroll.renderWeekGrid();
return;
}
const now=new Date();
const {start:curStart}=getWeekRange(now);
const isCurrentWeek=(Payroll.weekStart.getTime()===curStart.getTime());
const newDate=isCurrentWeek?dateToISO(now):dateToISO(Payroll.weekStart);
document.getElementById('whDate').value=newDate;
Payroll.selectedGridDate=newDate;
Payroll.renderWeekGrid();
},
async delWorkDay(id){
if(!await askConfirm('Hapus catatan absensi ini?'))return;
D.workDays=D.workDays.filter(w=>w.id!==id);
if(Payroll.editId===id)Payroll.cancelEditWorkDay();
save();Payroll.renderWorkDays();Payroll.renderDashMini();toast('🗑 Absensi dihapus');
},
renderWorkDays(){
const start=new Date(Payroll.weekStart);
const end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
const now=new Date();
const {start:curStart}=getWeekRange(now);
const isCurrentWeek=(start.getTime()===curStart.getTime());
const labelEl=document.getElementById('absensiWeekLabel');
if(labelEl){
const fmtShort=d=>d.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
labelEl.textContent=fmtShort(start)+' – '+fmtShort(end)+(isCurrentWeek?' (Ini)':'');
}
const thisWeek=D.workDays.filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;}).sort((a,b)=>new Date(b.date)-new Date(a.date));
const total=thisWeek.reduce((s,w)=>s+w.total,0);
const totalPokok=thisWeek.reduce((s,w)=>s+w.pokok,0);
const totalLembur=thisWeek.reduce((s,w)=>s+w.lembur,0);
const totalPotongan=thisWeek.reduce((s,w)=>s+(w.potongan||0),0);
const totalTambahan=thisWeek.reduce((s,w)=>s+(w.tambahan||0),0);
const resEl=document.getElementById('gajiResult');
if(thisWeek.length){
resEl.style.display='block';
document.getElementById('whCount').textContent=thisWeek.length;
document.getElementById('gajiTotal').textContent=fmtFull(total);
document.getElementById('gajiDetail').innerHTML=`<div class="gaji-row"><span>Total gaji pokok</span><span>${fmtFull(totalPokok)}</span></div><div class="gaji-row"><span>Total lembur</span><span>${fmtFull(totalLembur)}</span></div>`+(totalTambahan>0?`<div class="gaji-row"><span>Total tambahan lain-lain</span><span>+${fmtFull(totalTambahan)}</span></div>`:'')+(totalPotongan>0?`<div class="gaji-row"><span>Total potongan lain-lain</span><span>−${fmtFull(totalPotongan)}</span></div>`:'');
const syncBoxEl=document.getElementById('gajiSyncBox');
if(syncBoxEl){
// BUGFIX: dulu tombol ini cuma tampil kalau isCurrentWeek true, jadi kalau
// habis pilih "Belum, Tunda" (confirmWeeklyReset(false)) lalu buka lagi
// modal Absensi di lain waktu, atau lagi browsing minggu selain minggu asli
// sekarang, tombol ini hilang padahal absensi minggu ini masih ada &
// belum dicatat sbg pemasukan. openWeeklyResetManual() sendiri SELALU
// menghitung ulang berdasarkan minggu berjalan asli (new Date()), jadi
// aman ditampilkan terus selama ada absensi minggu ini — tidak tergantung
// minggu mana yang lagi ditampilkan di grid/riwayat.
syncBoxEl.innerHTML=`<button class="btn btn-income btn-full btn-sm" data-action="openWeeklyResetManual">💰 Sudah Gajian? Catat & Reset Minggu Ini</button>`;
}
} else resEl.style.display='none';
Payroll.renderPendingOldWeeksBox();
const listEl=document.getElementById('whList');
if(!listEl)return;
listEl.innerHTML=thisWeek.length?thisWeek.map(w=>`
      <div class="wh-day-item u-pointer" data-action="editWorkDay" data-args="${escapeHtml(JSON.stringify([w.id]))}">
        <div class="wh-day-info">
          <div class="wh-day-date">${new Date(w.date).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'})} ${w.jenis==='minggu'?'🔴':''}${w.jenis==='borongan'?'📦':''} <span class="u-fs10 u-t2 u-fw400">✏️</span></div>
          <div class="wh-day-time">${w.jenis==='borongan'?'Borongan/Per-Trip'+(w.borNote?' · '+escapeHtml(w.borNote):''):w.masuk+'–'+w.pulang+' ('+w.totalJam+' jam'+(w.jamLembur>0?', lembur '+w.jamLembur+' jam':'')+')'}${w.tambahan>0?' · tambahan +'+fmtFull(w.tambahan):''}${w.potongan>0?' · potongan −'+fmtFull(w.potongan):''}</div>
        </div>
        <div class="wh-day-pay">${fmtFull(w.total)}</div>
        <button class="tx-del" data-stop="1" data-action="delWorkDay" data-args="${escapeHtml(JSON.stringify([w.id]))}" aria-label="Hapus">🗑</button>
      </div>`).join(''):'<div class="empty"><div class="empty-text">Belum ada absensi dicatat di minggu ini</div></div>';
Payroll.renderWeekGrid();
},
renderWeekGrid(){
const start=new Date(Payroll.weekStart);
const days=[];for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d);}
const dowShort=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const gridEl=document.getElementById('whWeekGrid');
if(!gridEl)return;
const today=todayStr();
if(!Payroll.selectedGridDate){
const {start:curStart2}=getWeekRange(new Date());
if(Payroll.weekStart.getTime()===curStart2.getTime())Payroll.selectedGridDate=today;
}
gridEl.innerHTML=days.map(d=>{
const iso=dateToISO(d);
const entry=D.workDays.find(w=>w.date===iso);
let label='·',bg='var(--surface3)',color='var(--text3)';
if(entry){
if(entry.jenis==='borongan'){
label='📦';bg='var(--accent2-soft)';color='var(--accent2)';
} else {
const totalJam=entry.totalJam||0;
label=(totalJam%1===0?totalJam:totalJam.toFixed(1))+'j';
bg=entry.jamLembur>0?'var(--accent4-soft)':'var(--accent3-soft)';
color=entry.jamLembur>0?'var(--accent4)':'var(--accent3)';
}
}
const isToday=iso===today;
const isSelected=iso===Payroll.selectedGridDate;
const jamLabel=entry&&entry.jenis==='borongan'?` borongan ${fmtFull(entry.total)}`:(entry&&entry.masuk&&entry.pulang?` ${entry.masuk}–${entry.pulang}`:'');
return `<div data-wh-day="1" data-wh-date="${iso}" class="wh-day-box${isToday?' is-today':''}${isSelected?' selected':''}" title="${dowShort[d.getDay()]} ${iso}${jamLabel}">
<div class="wh-day-box-dow">${dowShort[d.getDay()]}</div>
<div class="wh-day-box-date">${d.getDate()}</div>
<div class="wh-day-box-status" style="background:${bg};color:${color}">${label}</div>
</div>`;
}).join('');
if(!gridEl._whDelegated){
gridEl._whDelegated=true;
gridEl.addEventListener('click',(e)=>{
const dayEl=e.target.closest('[data-wh-day]');
if(!dayEl)return;
Payroll.selectGridDay(dayEl.getAttribute('data-wh-date'));
});
}
},
selectGridDay(iso){
Payroll.selectedGridDate=iso;
Payroll.renderWeekGrid();
Payroll.showFormFields();
const d=new Date(iso+'T00:00:00');
const dLabel=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
const entry=D.workDays.find(w=>w.date===iso);
if(entry){
const ringkas=entry.jenis==='borongan'?`📦 Borongan${entry.borNote?' · '+entry.borNote:''} · ${fmtFull(entry.total)}`:`⏰ ${entry.masuk}–${entry.pulang} (${entry.totalJam} jam${entry.jamLembur>0?', lembur '+entry.jamLembur+' jam':''}) · ${fmtFull(entry.total)}`;
toast(`📅 ${dLabel}: ${ringkas}`);
Payroll.editWorkDay(entry.id);
return;
}
toast(`📅 ${dLabel}: belum ada absensi. Isi form di bawah untuk menambahkan.`);
Payroll.cancelEditWorkDay(iso);
const dateEl=document.getElementById('whDate');
if(dateEl)dateEl.scrollIntoView({behavior:'smooth',block:'center'});
},
recommendRate(targetBulanan){
const recent=(D.workDays||[]).filter(w=>w.jenis!=='borongan').slice(-30);
const avgJam=recent.length?recent.reduce((s,w)=>s+(w.totalJam||0),0)/recent.length:7;
const currentGajiHari=D.profile.gajiPokok||0;
const idealWorkDaysPerWeek=5;
const idealWorkDaysPerMonth=Math.round(idealWorkDaysPerWeek*(30/7));
const requiredPerDay=targetBulanan/idealWorkDaysPerMonth;
const requiredPerJam=requiredPerDay/(avgJam||7);
const daysNeededAtCurrentRate=currentGajiHari>0?Math.ceil(targetBulanan/currentGajiHari):null;
const overworkRisk=daysNeededAtCurrentRate!=null&&daysNeededAtCurrentRate>idealWorkDaysPerMonth;
return{avgJam,currentGajiHari,idealWorkDaysPerMonth,requiredPerDay,requiredPerJam,daysNeededAtCurrentRate,overworkRisk,targetBulanan};
},
saveTargetBulanan(){
const el=document.getElementById('pyTargetBulanan');
if(!el)return;
const val=parsePzNum(el.value);
D.profile.targetGajiBulanan=val>0?val:null;
save();
},
renderRateRecommendation(){
const box=document.getElementById('pyRateRekoBox');
if(!box)return;
Payroll.saveTargetBulanan();
const target=D.profile.targetGajiBulanan;
if(!target||target<=0){
box.style.display='none';box.innerHTML='';
toast('⚠️ Isi target pemasukan bulanan dulu');
return;
}
const r=Payroll.recommendRate(target);
box.style.display='block';
let html=`<div class="u-fs12 u-lh16">`;
html+=`💡 Supaya tetap ada <b>≥2 hari libur/minggu</b> (maks <b>${r.idealWorkDaysPerMonth} hari kerja/bulan</b>), dengan rata-rata <b>${r.avgJam.toFixed(1)} jam kerja/hari</b> dari histori Absensimu, kamu perlu <b>${fmtFull(r.requiredPerDay)}/hari</b> (≈${fmtFull(r.requiredPerJam)}/jam) untuk capai target ${fmtFull(target)}/bulan.`;
if(r.currentGajiHari>0){
const diff=r.requiredPerDay-r.currentGajiHari;
html+=`<br>Gaji pokok/hari kamu sekarang ${fmtFull(r.currentGajiHari)} — `;
html+=diff>0?`perlu naik ≈${fmtFull(diff)}/hari (${Math.round(diff/r.currentGajiHari*100)}%) supaya capai target tanpa nambah hari kerja.`:`sudah cukup buat capai target di atas ✅.`;
} else {
html+=`<br>ℹ️ Isi dulu "Gaji Pokok/Hari" di atas biar bisa dibandingkan sama tarif kamu sekarang.`;
}
if(r.overworkRisk){
html+=`<br>⚠️ Kalau tarifnya tetap seperti sekarang, kamu perlu kerja ≈<b>${r.daysNeededAtCurrentRate} hari/bulan</b> buat capai target itu — lebih dari batas aman di atas & berisiko bikin skor ⏰ Kerja vs Istirahat turun (kurang hari libur). Lebih baik naikkan tarif/jam daripada terus nambah hari kerja.`;
}
html+='</div>';
if(r.requiredPerDay>0){
html+=`<button type="button" class="btn btn-primary btn-full btn-sm u-mt10" data-action="Payroll.applyRecommendedRate" data-args="${escapeHtml(JSON.stringify([Math.round(r.requiredPerDay)]))}">✅ Pakai Tarif Ini (${fmtFull(Math.round(r.requiredPerDay))}/hari)</button>`;
}
box.innerHTML=html;
},
applyRecommendedRate(amount){
const el=document.getElementById('whGaji');
if(el)el.value=amount;
D.profile.gajiPokok=amount;
save();
toast('✅ Gaji Pokok/Hari diisi '+fmtFull(amount)+' (jadi default absensi baru juga)');
},
// v179: cek absensi minggu² SEBELUM minggu berjalan yang masih tersimpan (artinya belum pernah
// direset/"digajikan" lewat confirmWeeklyReset) — biasanya krn user berulang kali pilih "Belum,
// Tunda" di modal Sabtu atau lupa buka app pas weekend. Dikelompokkan per minggu (pakai
// getWeekRange) supaya bisa dikasih tahu ada berapa minggu yang menumpuk & totalnya berapa.
pendingOldWeeksInfo(){
const {start:curStart}=getWeekRange(new Date());
const old=(D.workDays||[]).filter(w=>new Date(w.date)<curStart);
if(!old.length)return null;
const byWeek={};
old.forEach(w=>{
const {start}=getWeekRange(new Date(w.date));
const key=dateToISO(start);
if(!byWeek[key])byWeek[key]={weekStart:key,total:0,count:0};
byWeek[key].total+=w.total;byWeek[key].count++;
});
const weeks=Object.values(byWeek).sort((a,b)=>a.weekStart.localeCompare(b.weekStart));
const total=weeks.reduce((s,w)=>s+w.total,0);
return {weeks,total,weekCount:weeks.length};
},
// v180: notif ini dulu cuma teks (innerHTML) tanpa cara ditutup/dikonfirm sama sekali — user
// terpaksa lihat warning yang sama terus tiap buka Absensi walau sudah paham & belum sempat
// menindaklanjuti. Sekarang dipisah jadi "raw info" (pendingOldWeeksInfo, dipakai badge dashboard
// — TIDAK ikut kefilter dismiss, supaya status asli tetap akurat) vs "visible info" (dipakai box
// notif ini saja, ikut kefilter minggu yang sudah di-dismiss user lewat tombol ✕ di bawah).
// Minggu yang di-dismiss disimpan per weekStart (D.payrollDismissedWeeks) supaya kalau nanti ada
// minggu pending BARU yang menumpuk lagi, notif otomatis muncul lagi (bukan dismiss selamanya).
pendingOldWeeksInfoVisible(){
const info=Payroll.pendingOldWeeksInfo();
if(!info)return null;
const dismissed=new Set(D.payrollDismissedWeeks||[]);
const weeks=info.weeks.filter(w=>!dismissed.has(w.weekStart));
if(!weeks.length)return null;
const total=weeks.reduce((s,w)=>s+w.total,0);
return {weeks,total,weekCount:weeks.length};
},
dismissPendingOldWeeksBox(){
const info=Payroll.pendingOldWeeksInfo();
if(!info)return;
const keys=info.weeks.map(w=>w.weekStart);
D.payrollDismissedWeeks=Array.from(new Set([...(D.payrollDismissedWeeks||[]),...keys]));
save();
Payroll.renderPendingOldWeeksBox();
toast('✅ Notif disembunyikan — tetap bisa dicek & digajikan lewat Riwayat Absensi kapan saja');
},
renderPendingOldWeeksBox(){
const box=document.getElementById('whPendingOldWeeksBox');
if(!box)return;
const info=Payroll.pendingOldWeeksInfoVisible();
if(!info){box.innerHTML='';return;}
box.innerHTML=`<div style="background:var(--accent4-soft);border:1px solid var(--accent4);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:12px;line-height:1.5;position:relative">
<button type="button" data-action="Payroll.dismissPendingOldWeeksBox" aria-label="Tutup notif" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--text2);font-size:14px;cursor:pointer;padding:2px 6px;line-height:1">✕</button>
<div style="padding-right:22px">⚠️ Ada absensi dari <b>${info.weekCount} minggu sebelumnya</b> yang belum di-reset/dicatat gajian (total ${fmtFull(info.total)}) — mungkin kelewat pas weekend. Cek Riwayat Absensi di bawah, lalu tap "💰 Sudah Gajian?" di Kalkulator Gaji buat tiap minggu yang belum.</div>
</div>`;
},
renderDashMini(){
const labelEl=document.getElementById('dashAbsensiStatusLabel');
const subEl=document.getElementById('dashAbsensiStatusSub');
const hariEl=document.getElementById('dashAbsensiHariCount');
const gajiEl=document.getElementById('dashAbsensiGajiTotal');
if(!labelEl||!hariEl||!gajiEl)return;
const todayIso=dateToISO(new Date());
const todayEntry=(D.workDays||[]).find(w=>w.date===todayIso);
if(todayEntry){
labelEl.textContent='✅ Sudah absen hari ini';
labelEl.style.color='var(--accent3)';
subEl.textContent=(todayEntry.jenis==='borongan'?'📦 Borongan/Per-Trip':todayEntry.masuk+'–'+todayEntry.pulang)+' · '+fmtFull(todayEntry.total);
} else {
labelEl.textContent='⏰ Belum absen hari ini';
labelEl.style.color='var(--accent4)';
subEl.textContent='Ketuk "+ Isi" untuk catat absensi hari ini';
}
const {start,end}=getWeekRange(new Date());
end.setHours(23,59,59,999);
const thisWeek=(D.workDays||[]).filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;});
const totalGaji=thisWeek.reduce((s,w)=>s+w.total,0);
hariEl.textContent=thisWeek.length;
gajiEl.textContent=fmtFull(totalGaji);
const pendingBadgeEl=document.getElementById('dashAbsensiPendingBadge');
if(pendingBadgeEl){
const info=Payroll.pendingOldWeeksInfo();
pendingBadgeEl.innerHTML=info?`<div class="u-fs11" style="margin-top:8px;color:var(--accent4);font-weight:600">⚠️ ${info.weekCount} minggu lalu belum di-reset (${fmtFull(info.total)})</div>`:'';
}
// Sync Budget Mingguan <-> Gaji Absensi (kartu sync sederhana). Murni baca budget yang
// sudah dibuat user sendiri lewat modul Budget (period==='mingguan') — TIDAK membuat/
// mengasumsikan budget tertentu (mis. nama "Belanja"), TIDAK ada rumus baru: limit &
// used 100% dari Budget.getEffectiveLimit()/getUsed() apa adanya. CATATAN: definisi
// "minggu" di sini beda dgn Budget.matchesPeriod() (Payroll: Minggu–Sabtu via
// getWeekRange, Budget mingguan: Senin–Minggu) — masing-masing pakai definisi
// minggunya sendiri, tidak dipaksa disamakan (di luar scope kartu sync ini).
const budgetSyncEl=document.getElementById('dashAbsensiBudgetSync');
if(budgetSyncEl){
const mingguanBudgets=(D.budgets||[]).filter(b=>b.period==='mingguan');
if(!mingguanBudgets.length||typeof Budget==='undefined'){
budgetSyncEl.innerHTML='';
} else {
const totalLimit=mingguanBudgets.reduce((s,b)=>s+Budget.getEffectiveLimit(b),0);
const totalUsed=mingguanBudgets.reduce((s,b)=>s+Budget.getUsed(b),0);
const sisaBudget=totalLimit-totalUsed;
const cukup=totalGaji>=totalLimit;
const statusLine=cukup?`<div class="u-fs11" style="color:var(--accent3);font-weight:600">✅ Gaji minggu ini cukup nutup budget belanja</div>`:`<div class="u-fs11" style="color:var(--accent4);font-weight:600">⚠️ Gaji minggu ini kurang ${fmtFull(totalLimit-totalGaji)} dari budget belanja</div>`;
budgetSyncEl.innerHTML=`<div class="u-fs11 u-t2" style="margin-top:8px">🛒 Budget Mingguan: ${fmtFull(totalUsed)} / ${fmtFull(totalLimit)} (sisa ${fmtFull(sisaBudget)})</div>${statusLine}`;
}
}
// S132: kartu Insight Target Mingguan (kirim uang ke istri) — murni BACA data
// yang sudah dihitung di atas (D.workDays minggu ini), tidak mengubah apa pun
// di renderDashMini() ini. Guard typeof supaya aman kalau file belum dimuat.
if(typeof InsightTargetMingguan!=='undefined')InsightTargetMingguan.render();
}
};
function timeToMinutes(t){return Payroll.timeToMinutes(t);}
function addWorkDay(){return Payroll.addWorkDay();}
function editWorkDay(id){return Payroll.editWorkDay(id);}
function cancelEditWorkDay(){return Payroll.cancelEditWorkDay();}
function delWorkDay(id){return Payroll.delWorkDay(id);}
