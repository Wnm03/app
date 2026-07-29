// edukasi-dana.js — Dana Pendidikan (EduFund): kalkulator target biaya sekolah/kuliah & nabung/bulan
// Dipindah ke modules/finance/edukasi-dana.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul EduFund dipindah ke file baru ini dari features-edukasi-pajak-utang-sewakios.js (v60). EduFund.checkAI() masih memanggil RefAI._parseJSON() lewat variabel global — aman krn runtime call, bukan saat file di-load (RefAI ada di pajak-pbb-zakat.js).
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const EduFund={
calc(f){
const now=new Date();
const n=Math.max(0,(parseInt(f.tahunTarget)||now.getFullYear())-now.getFullYear());
const inflasi=(parseFloat(f.inflasi)||0)/100;
const ret=(parseFloat(f.returnAsumsi)||0)/100;
const biayaHariIni=parseFloat(f.biayaHariIni)||0;
const fv=biayaHariIni*Math.pow(1+inflasi,n);
const acc=f.accountId?D.accounts.find(a=>a.id===f.accountId):null;
const terkumpul=acc?recalcAccBalance(acc.id):(parseFloat(f.terkumpul)||0);
const kekurangan=Math.max(0,fv-terkumpul);
const r=(1+ret)/(1+inflasi)-1;
let pmtBulanan;
if(n<=0){
pmtBulanan=kekurangan;
}else if(Math.abs(r)<0.0005){
pmtBulanan=kekurangan/(n*12);
}else{
const bulan=n*12;
const rBulanan=Math.pow(1+r,1/12)-1;
const anuitas=((Math.pow(1+rBulanan,bulan)-1)/rBulanan)*(1+rBulanan);
pmtBulanan=anuitas>0?kekurangan/anuitas:kekurangan/bulan;
}
return{n,fv:Math.round(fv),terkumpul:Math.round(terkumpul),kekurangan:Math.round(kekurangan),pmtBulanan:Math.round(Math.max(0,pmtBulanan)),returnRiil:r*100};
},
openModal(id){
EduFund.editId=id||null;
const f=id?D.eduFunds.find(x=>sameId(x.id,id)):null;
document.getElementById('eduFundModalTitle').textContent=f?'Edit Dana Pendidikan':'Tambah Dana Pendidikan';
document.getElementById('eduName').value=f?f.name:'';
document.getElementById('eduBiayaHariIni').value=f?f.biayaHariIni:'';
document.getElementById('eduTahunTarget').value=f?f.tahunTarget:(new Date().getFullYear()+5);
document.getElementById('eduInflasi').value=f?f.inflasi:12;
document.getElementById('eduReturn').value=f?f.returnAsumsi:8;
document.getElementById('eduTerkumpul').value=f&&!f.accountId?f.terkumpul:'';
const accSel=document.getElementById('eduAcc');
if(accSel){
accSel.innerHTML='<option value="">— Tidak terkait akun, isi manual —</option>'+D.accounts.map(a=>`<option value="${a.id}">${escapeHtml(a.emoji||'')} ${escapeHtml(a.name)}</option>`).join('');
accSel.value=f&&f.accountId?String(f.accountId):'';
}
EduFund.updatePreview();
openModal('eduFundModal');
},
updatePreview(){
const accSel=document.getElementById('eduAcc');
const savedWrap=document.getElementById('eduSavedWrap');
if(savedWrap)savedWrap.style.display=(accSel&&accSel.value)?'none':'';
const f={
biayaHariIni:document.getElementById('eduBiayaHariIni').value,
tahunTarget:document.getElementById('eduTahunTarget').value,
inflasi:document.getElementById('eduInflasi').value,
returnAsumsi:document.getElementById('eduReturn').value,
accountId:accSel?accSel.value||null:null,
terkumpul:document.getElementById('eduTerkumpul').value
};
const c=EduFund.calc(f);
const box=document.getElementById('eduFundPreview');
if(!box)return;
if(c.n<=0){
box.innerHTML=`⚠️ Tahun target sudah lewat/tahun ini — butuh <b>${fmtFull(c.kekurangan)}</b> sekarang juga.`;
return;
}
box.innerHTML=`Perkiraan biaya di ${document.getElementById('eduTahunTarget').value} (${c.n} th lagi): <b>${fmtFull(c.fv)}</b><br>Sudah terkumpul: ${fmtFull(c.terkumpul)} · Kekurangan: <b>${fmtFull(c.kekurangan)}</b><br>Return riil ${c.returnRiil.toFixed(1)}%/th → nabung ≈ <b class="green">${fmtFull(c.pmtBulanan)}/bulan</b>`;
},
save(){
const name=document.getElementById('eduName').value.trim();
if(!name){toast('⚠️ Nama anak/jenjang wajib diisi');return;}
const biayaHariIni=parsePzNum(document.getElementById('eduBiayaHariIni').value);
if(!biayaHariIni){toast('⚠️ Biaya hari ini wajib diisi');return;}
const tahunTarget=parseInt(document.getElementById('eduTahunTarget').value)||new Date().getFullYear();
const inflasi=parseFloat(document.getElementById('eduInflasi').value)||12;
const returnAsumsi=parseFloat(document.getElementById('eduReturn').value)||8;
const accSel=document.getElementById('eduAcc');
const accountId=accSel&&accSel.value?accSel.value:null;
const terkumpul=accountId?0:parsePzNum(document.getElementById('eduTerkumpul').value);
if(EduFund.editId){
const f=D.eduFunds.find(x=>sameId(x.id,EduFund.editId));
Object.assign(f,{name,biayaHariIni,tahunTarget,inflasi,returnAsumsi,accountId,terkumpul});
}else{
D.eduFunds.push({id:uid(),name,biayaHariIni,tahunTarget,inflasi,returnAsumsi,accountId,terkumpul});
}
save();
EduFund.render();
EduFund.renderDashMini();
closeModal('eduFundModal');
toast('✅ Dana Pendidikan tersimpan');
},
del(id){
D.eduFunds=D.eduFunds.filter(x=>!sameId(x.id,id));
save();
EduFund.render();
EduFund.renderDashMini();
toast('🗑️ Dana Pendidikan dihapus');
},
renderDashMini(){
const card=document.getElementById('dashEduFundMiniCard');
if(!card)return;
if(!D.eduFunds||!D.eduFunds.length){card.style.display='none';return;}
let totalFv=0,totalTerkumpul=0,totalPmt=0;
D.eduFunds.forEach(f=>{
const c=EduFund.calc(f);
totalFv+=c.fv;
totalTerkumpul+=c.terkumpul;
totalPmt+=c.pmtBulanan;
});
const pct=totalFv>0?Math.min(100,Math.round((totalTerkumpul/totalFv)*100)):0;
document.getElementById('dashEduFundTerkumpul').textContent=fmt(totalTerkumpul);
document.getElementById('dashEduFundTarget').textContent=fmt(totalFv);
document.getElementById('dashEduFundPct').textContent=pct+'%';
const bar=document.getElementById('dashEduFundBar');
bar.style.width=Math.min(pct,100)+'%';
bar.className='budget-bar-fill '+(pct>=100?'over':pct>=50?'ok':'warn');
document.getElementById('dashEduFundSub').textContent=`${D.eduFunds.length} rencana · Total nabung ≈ ${fmtFull(totalPmt)}/bulan`;
card.classList.remove('u-dnone');card.style.display='block';
},
render(){
if(typeof EduFundInsight!=='undefined')EduFundInsight.render();
const el=document.getElementById('eduFundList');
if(!el)return;
if(!D.eduFunds.length){el.innerHTML='<div class="empty"><div class="empty-icon">🎓</div><div class="empty-text">Belum ada rencana dana pendidikan</div></div>';return;}
el.innerHTML=D.eduFunds.map(f=>{
const c=EduFund.calc(f);
const pct=c.fv>0?Math.min(100,Math.round((c.terkumpul/c.fv)*100)):0;
const col=pct>=100?'green':pct>=50?'orange':'purple';
const acc=f.accountId?D.accounts.find(a=>sameId(a.id,f.accountId)):null;
const linkTag=acc?`<span class="u-fs11 u-r99 u-cacc u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">🔗 ${escapeHtml(acc.name)}</span>`:'';
return`<div class="tgt-item">
      <div class="tgt-head"><div class="tgt-name">🎓 ${escapeHtml(f.name)}${linkTag}</div><div class="tgt-pct">${pct}%</div></div>
      <div class="prog-bar"><div class="prog-fill ${col}" style="width:${pct}%"></div></div>
      <div class="tgt-vals"><span>${fmtFull(c.terkumpul)} terkumpul</span><span>Target ${fmtFull(c.fv)} (${f.tahunTarget})</span></div>
      <div class="u-fs11 u-t2 u-mt6" style="padding-top:6px;border-top:1px dashed var(--border)">Nabung ≈ <b>${fmtFull(c.pmtBulanan)}/bulan</b> (inflasi ${f.inflasi}%/th, return ${f.returnAsumsi}%/th)</div>
      <div class="tgt-actions">
        <button class="btn btn-sm btn-ghost u-flex1" data-action="EduFund.openModal" data-args="${escapeHtml(JSON.stringify([f.id]))}">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" data-action="EduFund.del" data-args="${escapeHtml(JSON.stringify([f.id]))}" aria-label="Hapus">🗑</button>
      </div>
    </div>`;
}).join('');
},
async checkAI(){
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
const namaSekolah=await showPromptModal({title:'Cek Estimasi Biaya',message:'Nama sekolah/kampus & kota (makin spesifik makin akurat)',icon:'🔍',placeholder:'cth: SDIT Al Azhar Yogyakarta'});
if(!namaSekolah)return;
toast('🔍 Mencari estimasi biaya via AI, mohon tunggu...',8000);
const sysPrompt=`Kamu asisten riset utk aplikasi keuangan keluarga Indonesia. Cari estimasi TOTAL BIAYA MASUK (uang pangkal/pondok + biaya tahun pertama, dalam Rupiah) utk sekolah/kampus berikut lewat web search: "${namaSekolah}". Balas HANYA JSON valid (tanpa teks lain, tanpa markdown fence):
{"biayaEstimasi":{"value": <angka Rp, atau null kalau tidak ketemu>, "source":"<sumber & rincian singkat>", "tanggal":"<kapan info ini berlaku>"}}
Kalau tidak yakin/tidak ketemu, isi value null & jelaskan di source. JANGAN mengarang angka.`;
try{
const r=await callAIProviderRaw(sysPrompt,[{role:'user',content:'Cari & kasih estimasi biaya sesuai format JSON yang diminta.'}],{maxTokens:1024,webSearch:true});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
toast('❌ Gagal hubungi '+label+': '+(r.errMsg||'error tidak diketahui'));
return;
}
const textOut=r.text;
const parsed=RefAI._parseJSON(textOut);
const item=parsed&&parsed.biayaEstimasi;
if(!item||item.value===null||item.value===undefined||!isFinite(Number(item.value))||Number(item.value)<=0){
toast('⚠️ AI tidak menemukan angka yang cukup yakin'+(item&&item.source?': '+item.source:''));
return;
}
document.getElementById('eduBiayaHariIni').value=Math.round(Number(item.value));
EduFund.updatePreview();
toast(`✅ Estimasi terisi: ${fmtFull(Math.round(Number(item.value)))} — 📌 ${item.source||'sumber tidak disebutkan'}${item.tanggal?' · '+item.tanggal:''}. Cek ulang ke sumber resmi ya!`,8000);
}catch(e){
toast('❌ Gagal cek: '+(e.message||String(e)));
}
}
};
