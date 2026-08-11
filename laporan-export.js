// laporan-export.js — Ekspor Laporan Keuangan ke PDF (exportLaporanPDF) & gambar
// (exportLaporanImage), plus builder data laporan (buildLaporanExportData: filter periode,
// total income/expense, breakdown per kategori). Dipisah dari
// features-aiwidget-reminder-gdrive-search.js (Sesi 4 restrukturisasi folder, blok 3 — lihat
// AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan ulang file, BUKAN perubahan perilaku.

function buildLaporanExportData(){
const {from,to}=getRange();
const f=getLaporanFilters();
const txs=D.transactions.filter(t=>{
const d=new Date(t.date);
if(d<from||d>to)return false;
if(t.type==='transfer_in'||t.type==='transfer_out')return false;
if(!txMatchesFilters(t,f))return false;
return true;
}).sort((a,b)=>new Date(a.date)-new Date(b.date));
const inc=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const periodeLabel=document.querySelector('#periodeChips .chip-btn.active')?.textContent||'Custom';
const fromLbl=from.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const toLbl=to.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const km={};
txs.forEach(t=>{if(!km[t.category])km[t.category]={inc:0,exp:0,n:0};if(t.type==='income')km[t.category].inc+=t.amount;else km[t.category].exp+=t.amount;km[t.category].n++;});
const katRows=Object.entries(km).sort((a,b)=>(b[1].inc+b[1].exp)-(a[1].inc+a[1].exp));
return {txs,inc,exp,periodeLabel,fromLbl,toLbl,katRows};
}
async function exportLaporanPDF(){
if(typeof window.jspdf==='undefined'){
try{await ensureJsPDF();}catch(e){toast('⚠️ Gagal memuat modul PDF, cek koneksi internet');return;}
}
if(typeof window.jspdf==='undefined'){toast('⚠️ Modul PDF masih dimuat, coba lagi 2 detik');return;}
const {jsPDF}=window.jspdf;
const {txs,inc,exp,periodeLabel,fromLbl,toLbl,katRows}=buildLaporanExportData();
const doc=new jsPDF({unit:'pt',format:'a4'});
const pageW=doc.internal.pageSize.getWidth();
let y=50;
doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(40,40,60);
doc.text('Laporan Keuangan - Keluarga '+(D.profile.nama||'W'),40,y);
y+=20;
doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(110,110,130);
doc.text(`Periode: ${periodeLabel} (${fromLbl} - ${toLbl})`,40,y);y+=14;
doc.text('Dicetak: '+new Date().toLocaleString('id-ID'),40,y);y+=20;
doc.setDrawColor(220,220,230);doc.line(40,y,pageW-40,y);y+=22;
doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,40);
doc.text('Ringkasan',40,y);y+=18;
doc.setFont('helvetica','normal');doc.setFontSize(11);
doc.setTextColor(20,140,90);doc.text('Pemasukan: '+fmtFull(inc),40,y);
doc.setTextColor(210,60,60);doc.text('Pengeluaran: '+fmtFull(exp),pageW/2,y);y+=16;
doc.setTextColor(80,70,200);doc.text('Saldo Bersih: '+fmtFull(inc-exp),40,y);
doc.setTextColor(60,60,70);doc.text('Jumlah Transaksi: '+txs.length,pageW/2,y);y+=28;
if(katRows.length){
doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,40);
doc.text('Per Kategori',40,y);y+=16;
doc.setFont('helvetica','normal');doc.setFontSize(9.5);
katRows.forEach(([k,v])=>{
if(y>770){doc.addPage();y=50;}
const val=v.inc-v.exp;
doc.setTextColor(60,60,70);
doc.text(`${k} (${v.n}x)`,40,y);
doc.setTextColor(val>=0?20:210,val>=0?140:60,val>=0?90:60);
doc.text((val>=0?'+':'-')+fmtFull(Math.abs(val)),pageW-150,y);
y+=14;
});
y+=14;
}
if(y>740){doc.addPage();y=50;}
doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(30,30,40);
doc.text('Daftar Transaksi',40,y);y+=16;
doc.setFontSize(9);
const colX=[40,105,255,355,430];
doc.setFillColor(124,111,239);
doc.rect(40,y-10,pageW-80,16,'F');
doc.setTextColor(255,255,255);
doc.text('Tanggal',colX[0]+2,y);doc.text('Kategori',colX[1]+2,y);doc.text('Akun',colX[2]+2,y);doc.text('Catatan',colX[3]+2,y);doc.text('Jumlah',colX[4]+2,y);
y+=14;
doc.setFont('helvetica','normal');
txs.forEach(t=>{
if(y>780){doc.addPage();y=50;}
const accName=D.accounts.find(a=>a.id===t.accountId)?.name||'';
doc.setTextColor(60,60,70);
doc.text(t.date,colX[0]+2,y);
doc.text(String(t.category||'').slice(0,22),colX[1]+2,y);
doc.text(accName.slice(0,14),colX[2]+2,y);
doc.text(String(t.note||'-').slice(0,16),colX[3]+2,y);
doc.setTextColor(t.type==='income'?20:210,t.type==='income'?140:60,t.type==='income'?90:60);
doc.text((t.type==='income'?'+':'-')+fmtFull(t.amount),colX[4]+2,y);
y+=13;
});
doc.save('laporan-W-'+new Date().toISOString().split('T')[0]+'.pdf');
toast('✅ Laporan PDF berhasil dibuat');
}
async function exportLaporanImage(){
if(typeof html2canvas==='undefined'){
try{await ensureHtml2Canvas();}catch(e){toast('⚠️ Gagal memuat modul gambar, cek koneksi internet');return;}
}
if(typeof html2canvas==='undefined'){toast('⚠️ Modul gambar masih dimuat, coba lagi 2 detik');return;}
const {txs,inc,exp,periodeLabel,fromLbl,toLbl,katRows}=buildLaporanExportData();
const wrap=document.createElement('div');
wrap.style.cssText='position:fixed;left:-9999px;top:0;width:420px;background:#ffffff;color:#1a1a2e;font-family:"Plus Jakarta Sans",sans-serif;padding:24px;';
const katHTML=katRows.map(([k,v])=>{
const val=v.inc-v.exp;
return `<div class="u-flex u-jcb u-fs12" style="padding:6px 0;border-bottom:1px solid #eee"><span>${escapeHtml(k)} <span style="color:#999">(${v.n}x)</span></span><span style="font-weight:700;color:${val>=0?'#16a34a':'#dc2626'}">${val>=0?'+':'-'}${fmtFull(Math.abs(val))}</span></div>`;
}).join('');
const txHTML2=txs.slice(-30).map(t=>{
const accName=D.accounts.find(a=>a.id===t.accountId)?.name||'';
return `<div class="u-flex u-jcb u-fs12" style="padding:5px 0;border-bottom:1px solid #f5f5f5"><span>${t.date} · ${escapeHtml(t.category)}${accName?' · '+escapeHtml(accName):''}</span><span style="font-weight:700;color:${t.type==='income'?'#16a34a':'#dc2626'}">${t.type==='income'?'+':'-'}${fmtFull(t.amount)}</span></div>`;
}).join('');
wrap.innerHTML=`
    <div class="u-fs18 u-fw800 u-mb2">📊 Laporan Keuangan</div>
    <div class="u-fs12" style="color:#888;margin-bottom:16px">Keluarga ${escapeHtml(D.profile.nama||'W')} · ${escapeHtml(periodeLabel)} (${fromLbl} - ${toLbl})</div>
    <div class="u-flex u-gap8 u-mb12">
      <div class="u-flex1 u-r12 u-tac" style="background:#f0fdf4;padding:10px"><div class="u-fs12 u-fw700" style="color:#16a34a">PEMASUKAN</div><div class="u-fs14 u-fw800" style="color:#16a34a">${fmtFull(inc)}</div></div>
      <div class="u-flex1 u-r12 u-tac" style="background:#fef2f2;padding:10px"><div class="u-fs12 u-fw700" style="color:#dc2626">PENGELUARAN</div><div class="u-fs14 u-fw800" style="color:#dc2626">${fmtFull(exp)}</div></div>
    </div>
    <div class="u-r12 u-tac" style="background:#f5f3ff;padding:10px;margin-bottom:18px"><div class="u-fs12 u-fw700" style="color:var(--accent)">SALDO BERSIH</div><div class="u-fs16 u-fw800" style="color:var(--accent)">${fmtFull(inc-exp)}</div></div>
    <div class="u-fs13 u-fw800 u-mb6">Per Kategori</div>
    ${katHTML||'<div class="u-fs12" style="color:#999">Tidak ada data</div>'}
    <div class="u-fs13 u-fw800" style="margin:16px 0 6px">Transaksi ${txs.length>30?'(30 Terbaru)':''}</div>
    ${txHTML2||'<div class="u-fs12" style="color:#999">Tidak ada transaksi</div>'}
    <div class="u-fs12 u-tac" style="margin-top:18px;color:#bbb">Dibuat dengan Keluarga W · ${new Date().toLocaleDateString('id-ID')}</div>
  `;
document.body.appendChild(wrap);
if(typeof html2canvas==='undefined'){
document.body.removeChild(wrap);
toast('⚠️ Modul gambar laporan gagal dimuat (cek koneksi internet), coba lagi nanti',4000);
return;
}
html2canvas(wrap,{scale:2,backgroundColor:'#ffffff'}).then(canvas=>{
document.body.removeChild(wrap);
const a=document.createElement('a');
a.href=canvas.toDataURL('image/png');
a.download='laporan-W-'+new Date().toISOString().split('T')[0]+'.png';
a.click();
toast('✅ Gambar laporan berhasil dibuat');
}).catch(e=>{
if(wrap.parentNode) document.body.removeChild(wrap);
toast('❌ Gagal membuat gambar: '+e.message);
});
}
let gdriveTokenClient=null;
let gdriveAccessToken=null;
let gdrivePendingAfterAuth=null;
let gdriveTokenScope=null;
let gdriveTokenExpiresAt=null;
let gdriveUserEmail=null;
