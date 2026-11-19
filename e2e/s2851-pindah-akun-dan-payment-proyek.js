// Uji browser S2851: (1) hapus transaksi bayar tagihan proyek saat modul Renovasi BELUM dimuat (lazy) -> payment item proyek ikut hilang (tanpa yatim),
// baik potong porsi (BRI) maupun talangan (Cash); (2) pindah akun transaksi bayar tagihan titipan lewat modal edit: BRI->Cash jadi talangan (piutang +),
// Cash->BRI kembali potong porsi (piutang -); (3) edit nominal tagihan proyek menyinkron payment item. Viewport 390x844.
// Jalankan: ROOT=<repo> BACKUP=<backup.json> node e2e/s2851-pindah-akun-dan-payment-proyek.js
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,330):''));};
const HOME='1794734731912',BILL=1795000000033,PROJ=1794663148350;
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 ck('Prasyarat: modul Renovasi belum dimuat (lazy)',await p.evaluate(()=>typeof Renov==='undefined'));
 const snap=()=>p.evaluate(({B,P,H})=>{const pj=D.renovProjects.find(x=>String(x.id)===String(P));const it=pj.items.find(x=>x.billLinkId!=null&&String(x.billLinkId)===String(B))||pj.items.find(x=>String(x.id)===String((D.bills.find(b=>b.id===B)||{}).renovItemLinkId));const hp=(D.piutang||[]).filter(x=>x&&String(x.autoTitipanOwnerId)===H&&!x.lunas);return{nPay:it?(it.payments||[]).length:0,paid:it?!!it.paid:null,hi:hp.reduce((s,x)=>s+x.nilai,0),nHi:hp.length,n:D.transactions.length,cash:D.accounts.find(a=>a.id==='acc_cash').saldoAwal};},{B:BILL,P:PROJ,H:HOME});
 const bill=(over)=>p.evaluate(async({B,o})=>{const b=D.bills.find(x=>x.id===B);Object.assign(b,o);},{B:BILL,o:over});
 const pay=()=>p.evaluate(async B=>{window.askConfirm=async()=>true;markBillPaid(B);await new Promise(r=>setTimeout(r,300));const ok=document.getElementById('promptModalOkBtn');if(ok&&ok.offsetParent)ok.click();await new Promise(r=>setTimeout(r,1500));const t=D.transactions.filter(x=>x.billLinkId===B).sort((a,b)=>b.id-a.id)[0];return t&&t.id;},BILL);
 const del=id=>p.evaluate(async id=>{window.askConfirm=async()=>true;await delTx(id);await new Promise(r=>setTimeout(r,900));},id);
 const s0=await snap();console.log('baseline',JSON.stringify(s0));
 // --- (1a) potong porsi (BRI, home in) ---
 let id=await pay();const s1=await snap();
 ck('1a. Bayar dari BRI: payment tertaut item proyek (+1), tanpa piutang talangan',s1.nPay===s0.nPay+1&&s1.hi===0,s1);
 await del(id);const s2=await snap();
 ck('1a. Hapus tx (Renov belum dimuat): payment item proyek ikut hilang, item kembali belum lunas',s2.nPay===s0.nPay&&s2.paid===false&&s2.n===s0.n,{s0,s2});
 ck('1a. Modul Renovasi dimuat otomatis oleh hapus',await p.evaluate(()=>typeof Renov!=='undefined'));
 // --- (1b) talangan (Cash, home in): muat ulang halaman supaya Renov lazy lagi ---
 await p.evaluate(async()=>{await save();});await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 ck('Prasyarat 1b: Renov belum dimuat setelah reload',await p.evaluate(()=>typeof Renov==='undefined'));
 await bill({accountId:'acc_cash'});const s3=await snap();
 id=await pay();const s4=await snap();
 ck('1b. Bayar dari Cash: piutang home in +212.000 dan payment +1',s4.hi===s3.hi+212000&&s4.nPay===s3.nPay+1,{s3,s4});
 await p.evaluate(async()=>{await save();});await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 ck('Prasyarat 1b: Renov lazy lagi',await p.evaluate(()=>typeof Renov==='undefined'));
 await del(id);const s5=await snap();
 ck('1b. Hapus tx talangan: payment hilang, piutang kembali, item belum lunas',s5.nPay===s3.nPay&&s5.hi===s3.hi&&s5.paid===false,{s3,s5});
 // --- (2) pindah akun lewat modal edit ---
 await bill({accountId:'acc_bri'});
 id=await pay();const s6=await snap();
 const edit=async(acc,amt)=>{await p.evaluate(tid=>{editTx(tid);},id);await sleep(700);
  await p.evaluate(({acc,amt})=>{const a=document.getElementById('txAcc');a.value=acc;a.dispatchEvent(new Event('change',{bubbles:true}));if(amt){const m=document.getElementById('txAmt');m.value=String(amt);m.dispatchEvent(new Event('input',{bubbles:true}));}},{acc,amt});await sleep(300);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('#txModal button')].find(x=>/saveTx/.test(x.getAttribute('data-action')||'')||/Simpan/.test(x.textContent));if(b)b.click();else saveTx();});await sleep(1500);};
 await edit('acc_cash');const s7=await snap();
 const tx7=await p.evaluate(tid=>{const t=D.transactions.find(x=>x.id===tid);return t&&{acc:t.accountId,tal:t.titipanTalangan,own:String(t.deductionOwnerId),tl:String(t.titipanLinkId)};},id);
 ck('2. BRI -> Cash lewat modal edit: jadi talangan (piutang +212.000, penanda tx)',s7.hi===s6.hi+212000&&tx7&&tx7.acc==='acc_cash'&&tx7.tal===true&&tx7.tl===HOME&&tx7.own===HOME,{s6,s7,tx7});
 ck('2. Payment item proyek tetap 1 dan tertaut',s7.nPay===s6.nPay,{s6,s7});
 await edit('acc_bri');const s8=await snap();
 const tx8=await p.evaluate(tid=>{const t=D.transactions.find(x=>x.id===tid);return t&&{acc:t.accountId,tal:t.titipanTalangan,own:String(t.deductionOwnerId)};},id);
 ck('2. Cash -> BRI: kembali potong porsi (piutang hilang, penanda talangan lepas, tetap non-pribadi)',s8.hi===s6.hi&&tx8&&tx8.acc==='acc_bri'&&!tx8.tal&&tx8.own===HOME,{s8,tx8});
 // --- (3) edit nominal menyinkron payment item ---
 await edit('acc_bri',250000);
 const pa=await p.evaluate(({B,P,tid})=>{const pj=D.renovProjects.find(x=>String(x.id)===String(P));const t=D.transactions.find(x=>x.id===tid);const it=pj.items.find(x=>String(x.id)===String(t.renovItemLinkId));const py=(it.payments||[]).find(x=>String(x.id)===String(t.renovPaymentId));return{tx:t.amount,pay:py&&py.amount};},{B:BILL,P:PROJ,tid:id});
 ck('3. Edit nominal tx tagihan proyek -> payment item ikut 250.000',pa.tx===250000&&pa.pay===250000,pa);
 await del(id);const s9=await snap();
 ck('Akhir: hapus tx bersih (payment, piutang, jumlah transaksi kembali ke awal)',s9.nPay===s0.nPay&&s9.hi===s0.hi&&s9.n===s0.n&&s9.paid===false,{s0,s9});
 const real=errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e));
 ck('Tanpa error JS (abaikan ERR_NAME_NOT_RESOLVED)',real.length===0,real);
 const bad=res.filter(r=>!r.ok);console.log(bad.length?('GAGAL: '+bad.map(b=>b.n).join(' | ')):('SEMUA LULUS ('+res.length+')'));
 await H.close();process.exit(bad.length?1:0);
})();
