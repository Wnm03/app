// refleksi-selfcare.js — Domain Refleksi & Self-Care: Jurnal Syukur, Checklist Self-Care harian
// Dipindah ke modules/home/refleksi-selfcare.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// (dgn hitung konsisten berturut-turut), & Catatan Privat terenkripsi (pakai PIN aplikasi, skema
// kripto sama dgn encryptApiKeyWithPin/decryptApiKeyWithPin di keamanan-pin.js — PBKDF2+AES-GCM,
// kunci diturunkan dari PIN MENTAH sesi (_sessionRawPin), TIDAK PERNAH ditulis ke storage).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (D, save, toast,
// askConfirm, uid, todayStr, dateToISO, escapeHtml, openModal/closeModal) & SETELAH keamanan-pin.js
// (_sessionRawPin, encryptApiKeyWithPin, decryptApiKeyWithPin) — lihat urutan GROUP_B di build.js.
const REFLEKSI_SELFCARE_ITEMS=[
{id:'sc1',label:'💧 Minum air putih cukup'},
{id:'sc2',label:'😴 Tidur cukup (7-8 jam)'},
{id:'sc3',label:'🚶 Gerak / olahraga ringan'},
{id:'sc4',label:'🧘 Waktu tenang utk diri sendiri'},
{id:'sc5',label:'📵 Kurangi screen time berlebih'}
];
// SelfCareReko — widget rekomendasi ringan di tab Self-Care: baca 14 hari terakhir checklist
// self-care (D.refleksi.selfCareLog) + jurnal syukur (D.refleksi.gratitude), lalu kasih SATU
// saran paling relevan. Sengaja dibuat beda dari LifeBalance.getFocusAreas() (hidup-seimbang.js)
// yang fokus ke skor finansial/keseimbangan (Dana Darurat, DSR, No-Spend, Kerja-Istirahat) --
// widget ini fokus ke 5 item checklist self-care harian itu sendiri, yang datanya tidak dipakai
// LifeBalance sama sekali.
// PENTING nada/tone: dibuat suportif & tanpa nge-judge (selaras sama hint bawaan tab ini --
// "Ringan saja, jangan jadi beban"), BUKAN daftar kegagalan/skor per-item yang bisa berasa
// menghakimi. Tidak menyimpulkan/psikoanalisa penyebab, cuma refleksikan pola dari data yang ada.
const SelfCareReko={
compute(){
const log=D.refleksi.selfCareLog||{};
const days=[];
const d=new Date();
for(let i=0;i<14;i++){
days.push(dateToISO(d));
d.setDate(d.getDate()-1);
}
const loggedDays=days.filter(iso=>log[iso]&&log[iso].length);
if(loggedDays.length<5){
return {ready:false,note:'Isi checklist self-care beberapa hari lagi dulu ya, biar saran di sini bisa lebih pas.'};
}
const perItem=REFLEKSI_SELFCARE_ITEMS.map(it=>{
const count=loggedDays.filter(iso=>(log[iso]||[]).includes(it.id)).length;
return {...it,count,pct:Math.round((count/loggedDays.length)*100)};
});
const weakest=perItem.slice().sort((a,b)=>a.pct-b.pct)[0];
const gratitudeCount=(D.refleksi.gratitude||[]).filter(g=>days.includes(g.date)).length;
return {ready:true,loggedDaysCount:loggedDays.length,weakest,gratitudeCount};
},
render(){
const el=document.getElementById('refSelfCareRekoBox');
if(!el)return;
const r=this.compute();
if(!r.ready){
// lint-ok-no-escape: r.note selalu string tetap yg ditulis di compute() di atas, bukan data ketikan user
el.innerHTML=`<div class="u-fs11 u-t2 u-r8 u-lh14" style="padding:8px 10px;background:var(--surface3);margin-bottom:12px">💡 ${r.note}</div>`;
return;
}
const parts=[];
if(r.weakest.pct<60){
parts.push(`<b>${r.weakest.label}</b> kelihatan paling sering kelewat belakangan ini (${r.weakest.count}/${r.loggedDaysCount} hari tercatat). Kalau mau, coba fokus ke ini dulu minggu ini — pelan-pelan aja, gak perlu langsung sempurna.`);
} else {
parts.push('🎉 Semua item checklist udah cukup konsisten belakangan ini. Pertahankan ya!');
}
if(r.gratitudeCount===0){
parts.push('Belum ada catatan syukur 14 hari terakhir — kalau ada waktu sebentar, coba tulis 1 hal kecil aja di tab 🙏 Syukur.');
}
el.innerHTML=`<div class="u-fs11 u-r8 u-lh14" style="padding:9px 10px;background:var(--accent-soft);margin-bottom:12px">💡 ${parts.join(' ')}</div>`;
}
};
const Refleksi={
curTab:'syukur',
_revealed:{},
open(){
this.curTab='syukur';
this._revealed={};
this.render();
openModal('refleksiModal');
},
setTab(tab){
this.curTab=tab;
const tabs={syukur:'refTabSyukurBtn',selfcare:'refTabSelfcareBtn',catatan:'refTabCatatanBtn'};
const wraps={syukur:'refWrapSyukur',selfcare:'refWrapSelfcare',catatan:'refWrapCatatan'};
Object.keys(tabs).forEach(k=>{
const btn=document.getElementById(tabs[k]);
if(btn){btn.style.background=(k===tab)?'var(--accent)':'transparent';btn.style.color=(k===tab)?'#fff':'var(--text2)';}
const wrap=document.getElementById(wraps[k]);
if(wrap)wrap.classList.toggle('u-dnone',k!==tab);
});
this.render();
},
render(){
if(!document.getElementById('refleksiModal'))return;
this.renderGratitude();
this.renderSelfCare();
this.renderNotes();
this.renderDashCard();
},
// ===== JURNAL SYUKUR =====
addGratitude(){
const el=document.getElementById('refSyukurText');
const text=(el.value||'').trim();
if(!text){toast('Tulis dulu rasa syukurmu hari ini.');return;}
if(!D.refleksi.gratitude)D.refleksi.gratitude=[];
D.refleksi.gratitude.push({id:uid(),date:todayStr(),text});
el.value='';
save();
this.renderGratitude();
this.renderDashCard();
toast('🙏 Rasa syukur tersimpan');
},
async deleteGratitude(id){
if(!await askConfirm('Hapus catatan syukur ini?',{okText:'Ya, Hapus'}))return;
D.refleksi.gratitude=(D.refleksi.gratitude||[]).filter(g=>!sameId(g.id,id));
save();
this.renderGratitude();
},
renderGratitude(){
const listEl=document.getElementById('refSyukurList');
if(!listEl)return;
const list=(D.refleksi.gratitude||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
if(!list.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">🙏</div><div class="empty-text">Belum ada catatan syukur</div></div>';
return;
}
// lint-ok-no-escape: g.text di-escapeHtml() eksplisit di bawah krn ini teks ketikan user
listEl.innerHTML=list.map(g=>`<div class="tx-item"><div class="tx-icon u-bgaccsoft">🙏</div><div class="tx-info"><div class="tx-name">${g.date}</div><div class="tx-meta u-lh14">${escapeHtml(g.text)}</div></div><button class="tx-del" data-action="Refleksi.deleteGratitude" data-args="${escapeHtml(JSON.stringify([g.id]))}" aria-label="Hapus">🗑</button></div>`).join('');
},
// ===== CHECKLIST SELF-CARE =====
toggleSelfCare(itemId){
if(!D.refleksi.selfCareLog)D.refleksi.selfCareLog={};
const today=todayStr();
if(!D.refleksi.selfCareLog[today])D.refleksi.selfCareLog[today]=[];
const arr=D.refleksi.selfCareLog[today];
const idx=arr.indexOf(itemId);
if(idx>=0)arr.splice(idx,1); else arr.push(itemId);
if(!arr.length)delete D.refleksi.selfCareLog[today];
save();
this.renderSelfCare();
this.renderDashCard();
},
computeStreak(){
const log=D.refleksi.selfCareLog||{};
let streak=0;
const d=new Date();
for(let i=0;i<3650;i++){
const iso=dateToISO(d);
const arr=log[iso];
if(arr&&arr.length){streak++;d.setDate(d.getDate()-1);}
else if(i===0){ d.setDate(d.getDate()-1); continue; } // hari ini belum dicentang, tetap cek kemarin
else break;
}
return streak;
},
renderSelfCare(){
const listEl=document.getElementById('refSelfCareList');
if(!listEl)return;
const today=todayStr();
const todayLog=(D.refleksi.selfCareLog&&D.refleksi.selfCareLog[today])||[];
listEl.innerHTML=REFLEKSI_SELFCARE_ITEMS.map(it=>{
const checked=todayLog.includes(it.id);
return `<div class="setting-item" style="padding:10px 0;cursor:pointer" data-action="Refleksi.toggleSelfCare" data-args='["${it.id}"]'>
      <div style="font-size:13px;${checked?'color:var(--accent3);font-weight:700':''}">${it.label}</div>
      <div style="width:22px;height:22px;border-radius:7px;border:2px solid ${checked?'var(--accent3)':'var(--border2)'};background:${checked?'var(--accent3)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:13px">${checked?'✓':''}</div>
    </div>`;
}).join('');
const streakEl=document.getElementById('refStreakVal');
if(streakEl)streakEl.textContent=this.computeStreak()+' hari';
SelfCareReko.render();
const histEl=document.getElementById('refSelfCareHistory');
if(histEl){
const log=D.refleksi.selfCareLog||{};
const rows=[];
const d=new Date();
for(let i=0;i<14;i++){
const iso=dateToISO(d);
const arr=log[iso]||[];
rows.push(`<div class="u-flex u-jcb u-fs12" style="padding:6px 0;border-bottom:1px solid var(--border)"><span>${iso}</span><span class="u-t2">${arr.length}/${REFLEKSI_SELFCARE_ITEMS.length} item</span></div>`);
d.setDate(d.getDate()-1);
}
histEl.innerHTML=rows.join('');
}
},
// ===== CATATAN PRIVAT (TERENKRIPSI) =====
async addNote(){
const judulEl=document.getElementById('refCatatanJudul');
const textEl=document.getElementById('refCatatanText');
const judul=(judulEl.value||'').trim();
const text=(textEl.value||'').trim();
if(!text){toast('Tulis dulu isi catatannya.');return;}
if(typeof _sessionRawPin==='undefined'||!_sessionRawPin){
toast('⚠️ Sesi PIN tidak aktif — buka ulang aplikasi (kunci lalu buka lagi dgn PIN) sebelum menyimpan catatan privat.',4000);
return;
}
try{
const plain=JSON.stringify({title:judul,text});
const enc=await encryptApiKeyWithPin(_sessionRawPin,plain);
if(!D.refleksi.privateNotes)D.refleksi.privateNotes=[];
D.refleksi.privateNotes.push({id:uid(),date:todayStr(),enc});
judulEl.value='';textEl.value='';
save();
this.renderNotes();
toast('🔒 Catatan privat tersimpan (terenkripsi)');
}catch(e){
console.error('Gagal enkripsi catatan privat:',e);
toast('⚠️ Gagal menyimpan catatan privat.');
}
},
async deleteNote(id){
if(!await askConfirm('Hapus catatan privat ini? Tindakan ini tidak bisa dibatalkan.',{okText:'Ya, Hapus'}))return;
D.refleksi.privateNotes=(D.refleksi.privateNotes||[]).filter(n=>!sameId(n.id,id));
delete this._revealed[id];
save();
this.renderNotes();
},
async toggleNoteView(id){
const bodyEl=document.getElementById('refNoteBody_'+id);
const btnEl=document.getElementById('refNoteEyeBtn_'+id);
if(!bodyEl)return;
if(this._revealed[id]){
delete this._revealed[id];
bodyEl.textContent='•••• (Terenkripsi — tap 👁 utk lihat)';
if(btnEl)btnEl.textContent='👁';
return;
}
if(typeof _sessionRawPin==='undefined'||!_sessionRawPin){
toast('⚠️ Sesi PIN tidak aktif, tidak bisa membuka catatan ini sekarang.');
return;
}
const note=(D.refleksi.privateNotes||[]).find(n=>sameId(n.id,id));
if(!note)return;
const decrypted=await decryptApiKeyWithPin(_sessionRawPin,note.enc);
if(decrypted===null){
toast('❌ Gagal membuka catatan (PIN berubah atau data rusak).');
return;
}
let parsed=null; try{parsed=JSON.parse(decrypted);}catch(e){}
this._revealed[id]=true;
if(btnEl)btnEl.textContent='🙈';
bodyEl.innerHTML=parsed?`${parsed.title?'<b>'+escapeHtml(parsed.title)+'</b><br>':''}${escapeHtml(parsed.text||'')}`:escapeHtml(decrypted);
},
renderNotes(){
const listEl=document.getElementById('refCatatanList');
if(!listEl)return;
const list=(D.refleksi.privateNotes||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
if(!list.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">🔒</div><div class="empty-text">Belum ada catatan privat</div></div>';
return;
}
listEl.innerHTML=list.map(n=>`<div class="tx-item"><div class="tx-icon u-bgaccsoft">🔒</div><div class="tx-info"><div class="tx-name">${n.date}</div><div class="tx-meta u-lh14" id="refNoteBody_${n.id}">•••• (Terenkripsi — tap 👁 utk lihat)</div></div><button class="tx-del" id="refNoteEyeBtn_${n.id}" data-action="Refleksi.toggleNoteView" data-args="${escapeHtml(JSON.stringify([n.id]))}" aria-label="Lihat">👁</button><button class="tx-del" data-action="Refleksi.deleteNote" data-args="${escapeHtml(JSON.stringify([n.id]))}" aria-label="Hapus">🗑</button></div>`).join('');
},
// ===== KARTU RINGKASAN DI DASHBOARD =====
renderDashCard(){
const el=document.getElementById('refleksiStreakBadge');
if(!el)return;
const streak=this.computeStreak();
el.textContent=streak>0?('🔥 '+streak+' hari'):'';
}
};
