// pajak-pbb-zakat.js — Kalkulator Pajak Bumi & Bangunan (PBB), Zakat (penghasilan, maal, fitrah), Referensi AI (cek harga emas/nisab via AI), Pajak UMKM, dan PPh 21 (Orang Pribadi)
// Dipindah ke modules/finance/pajak-pbb-zakat.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari: features-renovasi-pajak-aset-order.js (PBB, Zakat) dan features-edukasi-pajak-utang-sewakios.js (RefAI, PajakUMKM, PPh21) — sesi pemisahan domain Pajak/Zakat, lanjutan roadmap PEMISAHAN-FILE-ROADMAP.md.
// CATATAN: RefAI._parseJSON() juga dipakai EduFund.checkAI() (features-edukasi-pajak-utang-sewakios.js) & PriceReko.checkMarketAI() (cobek.js) lewat variabel global RefAI — aman krn dipanggil saat runtime (klik tombol), bukan saat file di-load.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const PBB={
render(){
const sel=document.getElementById('pbbAssetPick');
if(!sel)return;
const cur=sel.value;
const eligible=(D.assets||[]).filter(a=>a.jenis==='Tanah'||a.jenis==='Rumah/Bangunan');
sel.innerHTML='<option value="">— Pilih aset Tanah/Rumah —</option>'+eligible.map(a=>`<option value="${a.id}">${escapeHtml(a.name)} (${a.jenis}) — ${fmt(a.nilai)}</option>`).join('');
if(eligible.some(a=>a.id===cur))sel.value=cur;
const pbbDefault=D.pajakZakat.pbb;
const asset=cur?D.assets.find(a=>sameId(a.id,cur)):null;
const njoptkp=(asset&&asset.pbbNjoptkp!=null)?asset.pbbNjoptkp:pbbDefault.njoptkp;
const tarif=(asset&&asset.pbbTarif!=null)?asset.pbbTarif:pbbDefault.tarifPersen;
const elTKP=document.getElementById('pbbNjoptkp'); if(elTKP&&!elTKP.matches(':focus'))elTKP.value=njoptkp;
const elTarif=document.getElementById('pbbTarif'); if(elTarif&&!elTarif.matches(':focus'))elTarif.value=tarif;
const hint=document.getElementById('pbbTarifScopeHint');
if(hint)hint.textContent=asset?('📍 Tarif & NJOPTKP ini khusus untuk "'+asset.name+'" — aset lain tidak ikut berubah.'):'Isi tanpa pilih aset di atas = tersimpan sebagai nilai default (dipakai aset lain yang belum punya tarif sendiri).';
PBB.hitung();
PBB.renderBillStatus();
},
// Sesi 319: tarif & NJOPTKP kini per-aset (D.assets[].pbbTarif/pbbNjoptkp) kalau ada aset
// dipilih di pbbAssetPick — jadi rumah/tanah di kota beda bisa pakai Perda beda.
// Kalau tidak ada aset dipilih (entri manual), tetap fallback ke D.pajakZakat.pbb (global, lama).
currentAsset(){
const id=document.getElementById('pbbAssetPick')?.value||'';
return id?D.assets.find(a=>sameId(a.id,id)):null;
},
renderBillStatus(){
const el=document.getElementById('pbbBillStatus');
if(!el)return;
const asset=PBB.currentAsset();
const bill=D.bills.find(b=>b.pbbLink&&(asset?sameId(b.pbbLink,asset.id):b.pbbLink===true));
el.innerHTML=bill?('🔔 Terikat ke tagihan tahunan: jatuh tempo <b>'+bill.nextDue+'</b>, jumlah '+fmtFull(bill.amount)+'. Update kalkulator lalu tap tombol lagi untuk menyesuaikan.'):'Belum diikat ke tagihan. Isi tanggal jatuh tempo lalu tap tombol di atas supaya PBB muncul sebagai reminder tahunan di menu Tagihan.';
},
pilihAset(){
const id=document.getElementById('pbbAssetPick').value;
if(!id)return;
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)return;
if(a.jenis==='Rumah/Bangunan'){
document.getElementById('pbbNjopBangunan').value=a.nilai;
} else {
document.getElementById('pbbNjopBumi').value=a.nilai;
}
toast('✅ NJOP diisi dari "'+a.name+'" — sesuaikan lagi kalau perlu (nilai aset ≠ NJOP resmi SPPT)');
PBB.render();
},
hitung(){
const njopBumi=parsePzNum(document.getElementById('pbbNjopBumi').value);
const njopBangunan=parsePzNum(document.getElementById('pbbNjopBangunan').value);
const njoptkp=parsePzNum(document.getElementById('pbbNjoptkp').value);
const tarif=parseFloat((document.getElementById('pbbTarif').value||'0').replace(',','.'))||0;
const asset=PBB.currentAsset();
if(asset){
asset.pbbNjoptkp=njoptkp;
asset.pbbTarif=tarif;
} else {
D.pajakZakat.pbb.njoptkp=njoptkp;
D.pajakZakat.pbb.tarifPersen=tarif;
}
save();
const njopTotal=njopBumi+njopBangunan;
const njopKenaPajak=Math.max(0,njopTotal-njoptkp);
const terutang=Math.round(njopKenaPajak*(tarif/100));
document.getElementById('pbbNjopTotal').textContent=fmtFull(njopTotal);
document.getElementById('pbbNjopKenaPajak').textContent=fmtFull(njopKenaPajak);
document.getElementById('pbbTerutang').textContent=fmtFull(terutang);
},
ikatTagihan(){
const jumlah=parsePzNum(document.getElementById('pbbTerutang').textContent);
if(jumlah<=0){toast('⚠️ Belum ada PBB terutang untuk diikat ke tagihan');return;}
const due=document.getElementById('pbbJatuhTempo').value;
if(!due){toast('⚠️ Isi dulu tanggal jatuh tempo PBB');return;}
const asset=PBB.currentAsset();
// pbbLink: id aset (kalau dipilih dari Buku Aset) atau true (entri manual, perilaku lama) —
// supaya beberapa aset (kota/tarif beda) bisa masing-masing punya tagihan PBB tahunan sendiri.
let bill=D.bills.find(b=>b.pbbLink&&(asset?sameId(b.pbbLink,asset.id):b.pbbLink===true));
const nama='PBB (Pajak Bumi & Bangunan)'+(asset?(' — '+asset.name):'');
if(bill){
bill.amount=jumlah; bill.nextDue=due; bill.freq='tahunan'; bill.name=nama;
save(); refreshBillEverywhere(); PBB.renderBillStatus();
toast('✅ Tagihan PBB diperbarui: '+fmtFull(jumlah)+' jatuh tempo '+due);
} else {
D.bills.push({id:uid(),name:nama,amount:jumlah,nextDue:due,freq:'tahunan',category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||null,note:'Otomatis dari Kalkulator PBB',kind:'tagihan',pbbLink:asset?asset.id:true});
save(); refreshBillEverywhere(); PBB.renderBillStatus();
toast('✅ Tagihan tahunan PBB dibuat, reminder aktif di menu Tagihan');
}
}
};
const Zakat={
hitungPenghasilan(){
const now=new Date();
const incomeBulan=D.transactions.filter(t=>t.type==='income'&&(()=>{const d=new Date(t.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})()).reduce((s,t)=>s+(t.amount||0),0);
const nisab=D.pajakZakat.nisabPenghasilanBulan;
document.getElementById('zpIncomeBulan').textContent=fmtFull(incomeBulan);
document.getElementById('zpNisabBulan').textContent=fmtFull(nisab);
const wajib=incomeBulan>=nisab;
const zakat=wajib?Math.round(incomeBulan*0.025):0;
const statusEl=document.getElementById('zpStatus');
statusEl.textContent=wajib?'✅ Wajib Zakat':'⬜ Belum Wajib (di bawah nisab)';
statusEl.style.color=wajib?'var(--accent3)':'var(--text2)';
document.getElementById('zpJumlah').textContent=fmtFull(zakat);
},
hitungMaal(){
const pz=D.pajakZakat;
const saldoAkun=totalSaldoAkun();
const asetZakatable=(D.assets||[]).filter(a=>a.zakatable).reduce((s,a)=>s+(a.nilai||0),0);
const piutangZakatable=totalPiutangValue();
const utangManual=parsePzNum(document.getElementById('zmUtang').value);
pz.utangJT=utangManual; save();
renderKekayaanBersih();
const utang=(typeof FI!=='undefined')?FI.totalDebt():(utangManual+totalDebtValue()+totalCicilanOutstanding());
const totalHarta=Math.max(0,saldoAkun+asetZakatable+piutangZakatable-utang);
const nisab=85*pz.hargaEmasPerGram;
document.getElementById('zmTotalHarta').textContent=fmtFull(totalHarta);
document.getElementById('zmNisab').textContent=fmtFull(nisab);
const cukupNisab=totalHarta>=nisab;
let haulOk=false, haulMsg='';
if(cukupNisab){
if(!pz.haulMaalMulai){
pz.haulMaalMulai=new Date().toISOString().slice(0,10);
haulMsg='📅 Haul mulai dihitung hari ini ('+pz.haulMaalMulai+'). Zakat wajib jika harta masih ≥ nisab 1 tahun lagi.';
} else {
const mulai=new Date(pz.haulMaalMulai);
const hariBerjalan=Math.floor((new Date()-mulai)/86400000);
haulOk=hariBerjalan>=354;
haulMsg=haulOk?'✅ Sudah mencapai haul (≥354 hari) sejak '+pz.haulMaalMulai+'.':'⏳ Haul berjalan '+hariBerjalan+' dari 354 hari sejak '+pz.haulMaalMulai+'.';
}
} else {
pz.haulMaalMulai=null;
haulMsg='Harta belum mencapai nisab, haul belum dihitung.';
}
const statusEl=document.getElementById('zmStatus');
const wajib=cukupNisab&&haulOk;
statusEl.textContent=wajib?'✅ Wajib Zakat':(cukupNisab?'⏳ Sudah nisab, tunggu haul':'⬜ Belum Wajib');
statusEl.style.color=wajib?'var(--accent3)':'var(--text2)';
document.getElementById('zmJumlah').textContent=fmtFull(wajib?Math.round(totalHarta*0.025):0);
document.getElementById('zmHaulInfo').textContent=haulMsg;
},
hitungFitrah(){
const jiwa=Math.max(1,parseInt(document.getElementById('zfJiwa').value)||1);
document.getElementById('zfTotal').textContent=fmtFull(jiwa*D.pajakZakat.zakatFitrahPerJiwa);
},
async catatDibayar(jenis){
const jumlahStr=jenis==='penghasilan'?document.getElementById('zpJumlah').textContent:document.getElementById('zmJumlah').textContent;
const jumlah=parsePzNum(jumlahStr);
if(jumlah<=0){toast('⚠️ Belum ada kewajiban zakat untuk dicatat');return;}
if(!await askConfirm('Catat pembayaran zakat '+(jenis==='penghasilan'?'penghasilan':'maal')+' sebesar '+fmtFull(jumlah)+'? Otomatis tercatat sebagai pengeluaran di Keuangan.',{danger:false,okText:'Ya, Catat',icon:'🕌'}))return;
D.pajakZakat.zakatLog.unshift({id:uid(),jenis,tanggal:new Date().toISOString().slice(0,10),jumlah});
D.transactions.push({id:uid(),type:'expense',amount:jumlah,category:'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'Zakat '+(jenis==='penghasilan'?'Penghasilan':'Maal'),date:new Date().toISOString().slice(0,10)});
if(jenis==='maal')D.pajakZakat.haulMaalMulai=new Date().toISOString().slice(0,10);
save();
Zakat.renderLog();
Zakat.hitungMaal();
renderDashboard();
renderKeuangan();
toast('✅ Tercatat & masuk Keuangan, semoga berkah 🤲');
},
renderLog(){
const el=document.getElementById('zakatLogList');
if(!el)return;
const log=D.pajakZakat.zakatLog||[];
if(!log.length){el.innerHTML='<div class="empty"><div class="empty-icon">🕌</div><div class="empty-text">Belum ada riwayat</div></div>';return;}
el.innerHTML=log.slice(0,20).map(l=>`<div class="tx-item"><div class="tx-icon" style="background:var(--accent3-soft)">🕌</div><div class="tx-info"><div class="tx-name">Zakat ${l.jenis==='penghasilan'?'Penghasilan':'Maal'}</div><div class="tx-meta">${l.tanggal}</div></div><div class="tx-amount green">${fmtFull(l.jumlah)}</div><button class="tx-del" data-action="delZakatLog" data-args="${escapeHtml(JSON.stringify([l.id]))}" aria-label="Hapus">🗑</button></div>`).join('');
},
async delLog(id){
if(!await askConfirm('Hapus catatan zakat ini?',{okText:'Ya, Hapus'}))return;
D.pajakZakat.zakatLog=D.pajakZakat.zakatLog.filter(l=>!sameId(l.id,id));
save();Zakat.renderLog();
},
renderDashMini(incomeBulan){
const card=document.getElementById('dashZakatMiniCard');
if(!card||!D.pajakZakat)return;
const nisab=D.pajakZakat.nisabPenghasilanBulan||0;
const wajib=incomeBulan>=nisab&&incomeBulan>0;
const zakat=wajib?Math.round(incomeBulan*0.025):0;
document.getElementById('dashZakatStatus').textContent=wajib?'✅ Wajib zakat bulan ini':'⬜ Belum wajib (di bawah nisab)';
document.getElementById('dashZakatJumlah').textContent=fmt(zakat);
card.style.display=wajib?'block':'none';
}
};
const RefAI={
_draft:null,
ITEMS:[
{key:'hargaEmasPerGram',label:'Harga Emas / Gram'},
{key:'nisabPenghasilanBulan',label:'Nisab Zakat Penghasilan / Bulan'},
{key:'zakatFitrahPerJiwa',label:'Zakat Fitrah / Jiwa'},
// Sesi 319 (KW-165): biaya perpanjangan SIM per jenis — dulu hardcode SIM_JENIS_DEFAULTS di
// vehicle-core.js, sekarang jadi field D.pajakZakat.simTarif* & ikut alur "Cek Update via AI" ini.
{key:'simTarifA',label:'Biaya Perpanjang SIM A (PNBP)'},
{key:'simTarifB1',label:'Biaya Perpanjang SIM B1 (PNBP)'},
{key:'simTarifB2',label:'Biaya Perpanjang SIM B2 (PNBP)'},
{key:'simTarifC',label:'Biaya Perpanjang SIM C (PNBP)'},
{key:'simTarifC1',label:'Biaya Perpanjang SIM C1 (PNBP)'},
{key:'simTarifC2',label:'Biaya Perpanjang SIM C2 (PNBP)'},
{key:'simTarifD',label:'Biaya Perpanjang SIM D (PNBP)'}
],
systemPrompt(){
// Dibangun otomatis dari RefAI.ITEMS supaya nambah item baru di masa depan tidak perlu tulis ulang skema JSON manual.
const schema=RefAI.ITEMS.map(it=>`  "${it.key}": {"value": <angka Rp terbaru buat "${it.label}", atau null kalau tidak ketemu/tidak yakin>, "source": "<nama situs/lembaga & info singkat>", "tanggal": "<tanggal info ini berlaku>"}`).join(',\n');
return `Kamu asisten riset utk aplikasi keuangan keluarga Indonesia. Tugasmu HANYA mencari angka referensi TERBARU berikut lewat web search — harga emas Antam/logam mulia 24 karat, nisab & zakat fitrah BAZNAS, dan biaya PNBP perpanjangan SIM per jenis (PP tarif PNBP Polri) — lalu balas HANYA dalam format JSON valid (tanpa teks lain, tanpa markdown code fence, tanpa komentar):
{
${schema}
}
Kalau salah satu tidak ketemu/tidak yakin, isi value dengan null dan jelaskan alasannya singkat di source. JANGAN mengarang angka kalau tidak ketemu di hasil pencarian.`;
},
async check(){
const btn=document.getElementById('refAiCheckBtn');
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
RefAI._draft=null;
const applyBtn=document.getElementById('refAiApplyBtn'); if(applyBtn)applyBtn.disabled=true;
document.getElementById('refAiBody').innerHTML='<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Mencari info terbaru via web search... (bisa 10-30 detik)</div></div>';
openModal('refAiModal');
if(btn){btn.disabled=true;btn.textContent='🔍 Mencari...';}
try{
const r=await callAIProviderRaw(RefAI.systemPrompt(),[{role:'user',content:'Cari & kasih 3 angka referensi zakat/emas terbaru sesuai format JSON yang diminta.'}],{maxTokens:2048,webSearch:true});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
document.getElementById('refAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div></div>`;
return;
}
const textOut=r.text;
const parsed=RefAI._parseJSON(textOut);
if(!parsed){
document.getElementById('refAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Balasan AI tidak bisa dibaca sebagai data referensi. Coba lagi.</div></div>`;
return;
}
RefAI._draft=parsed;
RefAI.renderDraft();
}catch(e){
document.getElementById('refAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal cek: ${escapeHtml(e.message||String(e))}</div></div>`;
}finally{
if(btn){btn.disabled=false;btn.textContent='🔍 Cek Update via AI';}
D.pajakZakat.refCheckedAt=todayStr();
save();
renderRefCheckReminder();
}
},
_parseJSON(text){
if(!text)return null;
let t=text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/```\s*$/,'').trim();
try{return JSON.parse(t);}catch(e){}
const s=t.indexOf('{'),eIdx=t.lastIndexOf('}');
if(s>=0&&eIdx>s){ try{return JSON.parse(t.slice(s,eIdx+1));}catch(e){} }
return null;
},
renderDraft(){
const body=document.getElementById('refAiBody');
const pz=D.pajakZakat;
const d=RefAI._draft||{};
let anyValid=false;
body.innerHTML=RefAI.ITEMS.map(it=>{
const cur=pz[it.key];
const item=d[it.key];
if(!item||item.value===null||item.value===undefined||!isFinite(Number(item.value))||Number(item.value)<=0){
return `<div class="u-r10 u-mb8" style="padding:10px;background:var(--surface3)">
          <div class="u-fw700 u-fs13 u-mb2">${it.label}</div>
          <div class="u-fs11 u-t2">⚠️ AI tidak menemukan nilai yang cukup yakin${item&&item.source?': '+escapeHtml(item.source):''}. Nilai tersimpan tetap ${fmtFull(cur)}.</div>
        </div>`;
}
anyValid=true;
const changed=Math.round(Number(item.value))!==Math.round(cur);
return `<div class="u-r10 u-mb8" style="padding:10px;background:var(--surface3)">
        <label class="u-flex u-gap8 u-aifs u-pointer">
          <input type="checkbox" data-refkey="${it.key}" ${changed?'checked':''} style="margin-top:3px">
          <div class="u-flex1">
            <div class="u-fw700 u-fs13">${it.label}</div>
            <div class="u-fs12 u-mt2">${changed?`<span class="u-ctext3" style="text-decoration:line-through">${fmtFull(cur)}</span> → <b class="green">${fmtFull(Number(item.value))}</b>`:`<span>${fmtFull(Number(item.value))}</span> <span class="u-ctext3">(sama dgn tersimpan)</span>`}</div>
            <div class="u-fs11 u-t2" style="margin-top:3px">📌 ${escapeHtml(item.source||'Sumber tidak disebutkan')}${item.tanggal?' · '+escapeHtml(String(item.tanggal)):''}</div>
          </div>
        </label>
      </div>`;
}).join('')+`<div class="u-fs11 u-ctext3 u-mt4 u-lh14">⚠️ Verifikasi sendiri ke sumber resmi (logammulia.com / baznas.go.id) sebelum dipakai buat hitungan zakat resmi.</div>`;
const applyBtn=document.getElementById('refAiApplyBtn'); if(applyBtn)applyBtn.disabled=!anyValid;
},
applySelected(){
if(!RefAI._draft){toast('⚠️ Belum ada hasil cek');return;}
const pz=D.pajakZakat;
const checked=[...document.querySelectorAll('#refAiBody input[type=checkbox]:checked')];
if(!checked.length){toast('⚠️ Centang minimal 1 item yang mau diterapkan');return;}
let n=0;
checked.forEach(cb=>{
const key=cb.dataset.refkey;
const item=RefAI._draft[key];
if(!item||item.value===null||item.value===undefined||!isFinite(Number(item.value))||Number(item.value)<=0)return;
pz[key]=Math.round(Number(item.value));
pz.refSources=pz.refSources||{};
pz.refSources[key]={source:item.source||'',tanggal:item.tanggal||''};
n++;
});
pz.nisabPenghasilanTahun=pz.nisabPenghasilanBulan*12;
save();
renderPajakZakat();
renderRefCheckReminder();
closeModal('refAiModal');
toast(`✅ ${n} nilai referensi diperbarui dari hasil cek AI`);
}
};
const PajakUMKM={
render(){
const elO=document.getElementById('umkmOmzet'), elP=document.getElementById('umkmPajak');
if(!elO||!elP)return;
const now=new Date();
const omzetBulan=(D.cobek||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,t)=>s+(t.total||0),0);
elO.textContent=fmtFull(omzetBulan);
elP.textContent=fmtFull(Math.round(omzetBulan*0.005));
}
};
const PPh21={
getPTKP(status){
const dependents={TK0:0,TK1:1,TK2:2,TK3:3,K0:0,K1:1,K2:2,K3:3}[status]||0;
const married=status.startsWith('K');
let ptkp=54000000;
if(married)ptkp+=4500000;
ptkp+=dependents*4500000;
return ptkp;
},
hitungProgresif(pkp){
if(pkp<=0)return{pajak:0,detail:[]};
const brackets=[[60000000,0.05],[190000000,0.15],[250000000,0.25],[4500000000,0.30],[Infinity,0.35]];
let sisa=pkp,pajak=0,detail=[];
for(const[batas,tarif]of brackets){
if(sisa<=0)break;
const kena=Math.min(sisa,batas);
const t=kena*tarif;
if(kena>0)detail.push(`${(tarif*100)}% × ${fmtFull(kena)} = ${fmtFull(t)}`);
pajak+=t;sisa-=kena;
}
return{pajak:Math.round(pajak),detail};
},
isiDariTransaksi(){
const now=new Date();
const y=now.getFullYear();
const incomeYear=D.transactions.filter(t=>t.type==='income'&&new Date(t.date).getFullYear()===y);
if(!incomeYear.length){toast('⚠️ Belum ada data pemasukan tahun ini');return;}
const monthsSet=new Set(incomeYear.map(t=>new Date(t.date).getMonth()));
const totalYear=incomeYear.reduce((s,t)=>s+(t.amount||0),0);
const avgBulan=Math.round(totalYear/Math.max(1,monthsSet.size));
document.getElementById('pphBruto').value=avgBulan;
PPh21.hitung();
toast('✅ Diisi rata-rata pemasukan/bulan tahun '+y);
},
hitung(){
const brutoBulan=parsePzNum(document.getElementById('pphBruto').value);
const status=document.getElementById('pphStatus').value;
const iuranBulan=parsePzNum(document.getElementById('pphIuran').value);
D.pajakZakat.pphBrutoBulan=brutoBulan;
D.pajakZakat.pphIuranBulan=iuranBulan;
save();
const brutoSetahun=brutoBulan*12;
const biayaJabatan=Math.min(brutoSetahun*0.05,6000000);
const iuranSetahun=iuranBulan*12;
const neto=Math.max(0,brutoSetahun-biayaJabatan-iuranSetahun);
const ptkp=PPh21.getPTKP(status);
const pkp=Math.max(0,Math.floor((neto-ptkp)/1000)*1000);
const{pajak,detail}=PPh21.hitungProgresif(pkp);
document.getElementById('pphBrutoSetahun').textContent=fmtFull(brutoSetahun);
document.getElementById('pphBiayaJabatan').textContent=fmtFull(biayaJabatan);
document.getElementById('pphIuranSetahun').textContent=fmtFull(iuranSetahun);
document.getElementById('pphNeto').textContent=fmtFull(neto);
document.getElementById('pphStatusLabel').textContent=(status.startsWith('TK')?'TK/'+status.slice(2):'K/'+status.slice(1));
document.getElementById('pphPTKP').textContent=fmtFull(ptkp);
document.getElementById('pphPKP').textContent=fmtFull(pkp);
document.getElementById('pphBracketDetail').innerHTML=detail.length?detail.join('<br>'):'Penghasilan kena pajak Rp0 — tidak terutang PPh 21.';
document.getElementById('pphSetahun').textContent=fmtFull(pajak);
document.getElementById('pphPerBulan').textContent=fmtFull(Math.round(pajak/12));
}
};
