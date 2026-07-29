// hidup-seimbang.js — Domain Skor Hidup Seimbang: skor gabungan dari Dana Darurat, DSR cicilan, No-Spend 30 hari, & keseimbangan kerja-istirahat, plus riwayat snapshot bulanan.
// Dipindah ke modules/home/hidup-seimbang.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari: features-edukasi-pajak-utang-sewakios.js (lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md, v59).
// PENTING: LifeBalance.compute() memanggil WorthIt.incomeAvg() (di worthit.js, guarded typeof check) & computeNoSpendLast30() (di features-sheets-pwa-selftest.js, GROUP_B, TIDAK di-guard typeof — ini kondisi lama yang sudah ada sebelum dipindah, aman krn dipanggil runtime setelah kedua bundle GROUP_A & GROUP_B ter-load, bukan saat load file).
// PENTING: harus dimuat sesuai urutan build.js (GROUP_A) — LifeBalance.render()/.compute() dipanggil dari modules-render.js & modules-calc.js (GROUP_A juga) lewat variabel global saat runtime (render dashboard), aman di file manapun dalam GROUP_A.

const LifeBalance={
compute(){
const parts=[];
const dd=(D.targets||[]).find(t=>t.isDanaDarurat);
let ddPts,ddNote;
if(!dd||!dd.amount){
ddPts=0; ddNote='Belum ada Target Dana Darurat';
} else {
const pct=Math.min(100,(dd.saved/dd.amount)*100);
ddPts=Math.round((pct/100)*25);
ddNote=Math.round(pct)+'% dari target';
}
parts.push({label:'🚨 Dana Darurat',pts:ddPts,max:25,note:ddNote});
const incAvg=(typeof WorthIt!=='undefined')?WorthIt.incomeAvg():0;
const cicilanAktifBulanan=(D.bills||[]).filter(b=>b.kind==='cicilan'&&b.sisaTenor!=null).reduce((s,b)=>s+b.amount,0);
let dsrPts,dsrNote;
if(incAvg<=0){
dsrPts=13; dsrNote='Data income belum cukup';
} else {
const dsr=(cicilanAktifBulanan/incAvg)*100;
dsrPts=Math.round(Math.max(0,Math.min(25,25*(1-dsr/35))));
dsrNote=dsr.toFixed(0)+'% dari rata-rata income';
}
parts.push({label:'💳 Rasio Cicilan (DSR)',pts:dsrPts,max:25,note:dsrNote,thin:incAvg<=0});
const nsd=computeNoSpendLast30();
let nsdPts,nsdNote;
if(nsd.daysWithData<7){
nsdPts=13; nsdNote='Histori transaksi belum cukup (<7 hari)';
} else {
nsdPts=Math.round((nsd.count/nsd.total)*25);
nsdNote=nsd.count+'/'+nsd.total+' hari (30 hr terakhir)';
}
parts.push({label:'🚫 No Spend Day',pts:nsdPts,max:25,note:nsdNote,thin:nsd.daysWithData<7});
const now=new Date();
let workPts,workNote;
if(!(D.workDays&&D.workDays.length)){
workPts=13; workNote='Belum ada catatan Absensi';
} else {
let restDays=0;
for(let i=0;i<7;i++){
const d=new Date(now); d.setDate(d.getDate()-i);
const iso=dateToISO(d);
const worked=(D.workDays||[]).some(w=>w.date===iso);
if(!worked)restDays++;
}
workPts=Math.round(Math.min(25,(restDays/2)*25));
workNote=restDays+' hari istirahat (7 hr terakhir)';
}
parts.push({label:'⏰ Kerja vs Istirahat',pts:workPts,max:25,note:workNote,thin:!(D.workDays&&D.workDays.length)});
const total=parts.reduce((s,p)=>s+p.pts,0);
let level,color;
if(total>=80){level='🟢 Seimbang';color='var(--accent3)';}
else if(total>=60){level='🟡 Cukup Baik';color='var(--accent4)';}
else if(total>=40){level='🟠 Perlu Perhatian';color='var(--accent2)';}
else {level='🔴 Waspada';color='var(--accent2)';}
return {total,level,color,parts};
},
render(){
const scoreEl=document.getElementById('lbScoreNum');
if(!scoreEl)return;
const {total,level,color,parts}=LifeBalance.compute();
scoreEl.textContent=total;
document.getElementById('lbLevel').textContent=level+' · '+total+'/100';
document.getElementById('lbLevel').style.color=color;
const ring=document.getElementById('lbRing');
const circumference=169.6;
ring.style.stroke=color;
ring.style.strokeDashoffset=Math.round(circumference*(1-total/100));
document.getElementById('lbBars').innerHTML=parts.map(p=>{
const pct=Math.round((p.pts/p.max)*100);
const barColor=pct>=80?'var(--accent3)':pct>=50?'var(--accent4)':'var(--accent2)';
// lint-ok-no-escape: p.label & p.note di sini selalu string tetap dari LifeBalance.compute() (mis. ddNote/dsrNote/nsdNote/workNote) yang ditulis di kode, bukan teks ketikan user
return `<div>
        <div class="u-flex u-jcb u-fs11" style="margin-bottom:3px"><span>${p.label}</span><span class="u-t2">${p.note}</span></div>
        <div class="budget-bar-track" style="height:6px"><div class="budget-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      </div>`;
}).join('');
const noteEl=document.getElementById('lbDataNote');
if(noteEl){
const thinParts=parts.filter(p=>p.thin);
if(thinParts.length){
noteEl.classList.remove('u-dnone');noteEl.style.display='block';
noteEl.innerHTML='ℹ️ '+thinParts.map(p=>p.label).join(' & ')+' pakai nilai netral (bukan hasil hitung riil) krn datanya belum cukup — skor total di atas belum sepenuhnya mencerminkan kondisimu.';
} else {
noteEl.style.display='none';
}
}
LifeBalance.renderFocus(parts);
LifeBalance.renderTrendBadge();
},
tips:{
'🚨 Dana Darurat':'Coba tambah setoran ke Target Dana Darurat bulan ini, meski nominal kecil.',
'💳 Rasio Cicilan (DSR)':'Kurangi cicilan baru dulu, atau percepat pelunasan cicilan yang sudah berjalan.',
'🚫 No Spend Day':'Coba jadwalkan 1-2 hari "tanpa belanja" tiap minggu ke depan.',
'⏰ Kerja vs Istirahat':'Jadwalkan hari libur/istirahat — jangan kerja terus tanpa jeda.'
},
getFocusAreas(parts){
return parts.map(p=>({...p,pct:Math.round((p.pts/p.max)*100)}))
.filter(p=>p.pct<70)
.sort((a,b)=>a.pct-b.pct)
.slice(0,2);
},
renderFocus(parts){
const el=document.getElementById('lbFocus');
if(!el)return;
const areas=LifeBalance.getFocusAreas(parts);
if(!areas.length){
el.innerHTML='<div class="u-fs11 u-cacc3 u-r8" style="padding:8px 10px;background:var(--accent3-soft)">🎉 Semua komponen sudah cukup baik (≥70%). Pertahankan!</div>';
return;
}
el.innerHTML='<div class="u-fs11 u-fw700 u-t2" style="margin-bottom:5px">🔍 Fokus Perbaikan (paling narik turun skor)</div>'+
areas.map(p=>`<div class="u-fs11 u-r8 u-lh14" style="padding:7px 9px;background:var(--surface3);margin-bottom:5px"><b>${p.label}</b> <span class="u-cacc2">(${p.pct}%)</span> — ${LifeBalance.tips[p.label]||'Perbaiki komponen ini utk naikkan skor.'}</div>`).join('');
},
saveSnapshot(manual){
const today=todayStr();
const {total:score,parts}=LifeBalance.compute();
const partsSnap=parts.map(p=>({label:p.label,pts:p.pts,max:p.max}));
if(!D.lifeBalanceSnapshots)D.lifeBalanceSnapshots=[];
const existing=D.lifeBalanceSnapshots.find(s=>s.date===today);
if(existing){
existing.score=score;
existing.parts=partsSnap;
if(manual)existing.auto=false;
} else {
D.lifeBalanceSnapshots.push({id:uid(),date:today,score,parts:partsSnap,auto:!manual});
}
D.lifeBalanceSnapshots.sort((a,b)=>a.date.localeCompare(b.date));
save();
LifeBalance.renderHistoryModal();
LifeBalance.renderTrendBadge();
if(manual)toast('✅ Snapshot Skor Hidup Seimbang tersimpan: '+score+'/100');
},
autoSnapshotIfNeeded(){
if(!D.lifeBalanceSnapshots)D.lifeBalanceSnapshots=[];
if(!D.accounts.length&&!(D.targets||[]).length&&!D.transactions.length)return;
const ym=todayStr().slice(0,7);
if(D.lifeBalanceSnapshots.some(s=>s.date.slice(0,7)===ym))return;
LifeBalance.saveSnapshot(false);
},
async deleteSnapshot(id){
if(!await askConfirm('Hapus snapshot Skor Hidup Seimbang ini?',{okText:'Ya, Hapus'}))return;
D.lifeBalanceSnapshots=(D.lifeBalanceSnapshots||[]).filter(s=>!sameId(s.id,id));
save();
LifeBalance.renderHistoryModal();
LifeBalance.renderTrendBadge();
},
renderTrendBadge(){
const el=document.getElementById('lbTrendBadge');
if(!el)return;
const list=(D.lifeBalanceSnapshots||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
if(list.length<2){el.style.display='none';return;}
const last=list[list.length-1],prev=list[list.length-2];
const delta=last.score-prev.score;
el.classList.remove('u-dnone');el.style.display='inline';
el.textContent=(delta>=0?'▲ +':'▼ ')+delta+' vs bulan lalu';
el.style.color=delta>=0?'var(--accent3)':'var(--accent2)';
},
openHistoryModal(){
LifeBalance.renderHistoryModal();
openModal('lbHistoryModal');
},
renderHistoryModal(){
const listEl=document.getElementById('lbHistoryList');
const chartEl=document.getElementById('lbHistoryChart');
if(!listEl)return;
const list=(D.lifeBalanceSnapshots||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
if(!list.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📈</div><div class="empty-text">Belum ada snapshot skor tercatat</div></div>';
if(chartEl)chartEl.innerHTML='';
return;
}
if(chartEl){
const asc=list.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-12);
const W=280,H=70,pad=6;
const pts=asc.map((s,i)=>{
const x=asc.length>1?pad+(i/(asc.length-1))*(W-2*pad):W/2;
const y=H-pad-((s.score/100)*(H-2*pad));
return x+','+y;
});
const dots=asc.map((s,i)=>{
const [x,y]=pts[i].split(',');
return `<circle cx="${x}" cy="${y}" r="2.5" fill="var(--accent3)"><title>${s.date}: ${s.score}</title></circle>`;
}).join('');
chartEl.innerHTML=`<svg class="u-w100" viewBox="0 0 ${W} ${H}" style="height:70px;display:block">
        <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent3)" stroke-width="2"/>
        ${dots}
      </svg>`;
}
const WBAL_SHOW_LIMIT=24;
const visible=list.slice(0,WBAL_SHOW_LIMIT);
listEl.innerHTML=visible.map((s,i)=>{
const prev=list[i+1];
let deltaHtml='';
if(prev){
const delta=s.score-prev.score;
deltaHtml=`<div class="tx-meta">${delta>=0?'▲':'▼'} ${Math.abs(delta)} poin vs snapshot sebelumnya</div>`;
if(s.parts&&prev.parts){
const moves=s.parts.map(p=>{
const pr=prev.parts.find(x=>x.label===p.label);
return pr?{label:p.label,diff:p.pts-pr.pts}:null;
}).filter(Boolean);
if(moves.length){
const biggest=moves.reduce((a,b)=>Math.abs(b.diff)>Math.abs(a.diff)?b:a);
if(biggest.diff!==0){
deltaHtml+=`<div class="tx-meta" style="color:${biggest.diff<0?'var(--accent2)':'var(--accent3)'}">${biggest.diff<0?'⬇️':'⬆️'} Paling berubah: ${biggest.label} (${biggest.diff>0?'+':''}${biggest.diff})</div>`;
}
}
}
}
return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">📈</div><div class="tx-info"><div class="tx-name">${s.date}${s.auto?' <span class="u-fs10 u-t2 u-r6 u-ml4" style="border:1px solid var(--border2);padding:1px 5px">Otomatis</span>':''}</div>${deltaHtml}</div><div class="tx-amount">${s.score}/100</div><button class="tx-del" data-action="LifeBalance.deleteSnapshot" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
}
};
