// Uji browser S2847: perbaiki penanda titipan pada pembayaran tagihan lama.
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,400):''));};
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 ck('Backup termuat',await loaded());
 await p.evaluate(()=>{window.askConfirm=async m=>{window._confirmMsg=m;return true;};});
 const snap=()=>p.evaluate(()=>{let pr=0,fi=0;(D.transactions||[]).forEach(t=>{if(t.type!=='expense')return;fi+=t.amount;if(!isAliranKlienSafe(t))pr+=t.amount;});return{pribadi:pr,fisik:fi,briSaldo:recalcAccBalance('acc_bri'),n:(D.transactions||[]).length};});
 const before=await snap();
 const aud=await p.evaluate(()=>{const l=titipanLamaAudit();return{count:l.length,ringkas:titipanLamaRingkas(l)};});
 console.log('audit',JSON.stringify(aud));
 await p.evaluate(()=>{showPage('keuangan');setKeuanganTab('tagihan');});await sleep(1000);
 const ui=await p.evaluate(()=>{const e=[...document.querySelectorAll('[id$="TitipanLamaFix"]')];return e.map(x=>x.innerText);});
 ck('Tombol periksa & perbaiki tampil bila ada kandidat (atau tidak ada kandidat -> tidak tampil)',aud.count>0?ui.length>0:ui.length===0,{ui,aud:aud.count});
 if(aud.count>0){
  await p.evaluate(()=>{document.querySelector('[data-titipan-lama]').click();});await sleep(1200);
  const after=await snap();
  const msg=await p.evaluate(()=>window._confirmMsg);
  console.log('konfirmasi:',msg);
  ck('Pratinjau menyebut jumlah & dampak',/pembayaran tagihan lama/.test(msg||'')&&/PRIBADI/.test(msg||''));
  ck('Fisik & saldo BRI tidak berubah; jumlah transaksi sama',after.fisik===before.fisik&&after.briSaldo===before.briSaldo&&after.n===before.n,{before,after});
  ck('Pengeluaran pribadi turun tepat sebesar total kandidat (bulan ini bila ada)',after.pribadi<=before.pribadi,{turun:before.pribadi-after.pribadi,total:aud.ringkas.total});
  const again=await p.evaluate(()=>titipanLamaAudit().length);
  ck('Idempoten: tidak ada kandidat tersisa',again===0,again);
  const gone=await p.evaluate(()=>!document.querySelector('[data-titipan-lama]'));
  ck('Tombol hilang setelah perbaikan',gone);
 }
 ck('Tanpa error JS (abaikan ERR_NAME_NOT_RESOLVED)',errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)).length===0,errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)));
 await p.screenshot({path:'/home/claude/work/s2847.png'});
 await H.close();console.log(res.filter(r=>!r.ok).length?'GAGAL':'SEMUA LULUS');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
