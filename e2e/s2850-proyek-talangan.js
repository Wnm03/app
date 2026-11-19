// Uji browser S2850: (1) tagihan Proyek Renovasi NON-klien dibayar dari Cash dengan pemilik tersimpan home in = talangan (piutang +, pribadi tetap, tanpa dialog
// pemilik, tetap tertaut item proyek); hapus tx mengembalikan saldo/pribadi/piutang. (4) dropdown pemilik form Tagihan: Cash menawarkan "ditalangi", BRI tidak,
// proyek klien tidak. Proyek klien dibayar = perilaku lama (tanpa piutang talangan otomatis). Viewport 390x844.
// Jalankan: ROOT=<repo> BACKUP=<backup.json> node e2e/s2850-proyek-talangan.js
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
 await p.evaluate(()=>{window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};});
 const snap=()=>p.evaluate(({H,B,P})=>{let pr=0;(D.transactions||[]).forEach(t=>{if(t.type==='expense'&&!isAliranKlienSafe(t))pr+=t.amount;});const hp=(D.piutang||[]).filter(x=>/home in/.test(x.name));const pj=D.renovProjects.find(x=>String(x.id)===String(P));const it=pj.items.find(x=>String(x.id)==='1795000000032');return{pribadi:pr,cash:recalcAccBalance('acc_cash'),nPiutang:(D.piutang||[]).length,hi:hp.map(x=>({id:x.id,nilai:x.nilai,tgl:x.tanggal})),hiSum:hp.reduce((a,x)=>a+x.nilai,0),nPay:(it.payments||[]).length,n:D.transactions.length};},{H:HOME,B:BILL,P:PROJ});
 const s0=await snap();console.log('baseline',JSON.stringify(s0));
 // --- item 4: dropdown form Tagihan (edit tagihan RAB wallpanel di BRI) ---
 const dd=await p.evaluate(async({B})=>{openBillModal(B);await new Promise(r=>setTimeout(r,350));
  const opts=()=>{const o=document.getElementById('billRenovOwner');return o?[...o.options].map(x=>x.value+'|'+x.text):[];};
  const r={};r.bri=opts();
  const a=document.getElementById('billAcc');a.value='acc_cash';a.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
  r.cash=opts();
  // proyek klien: tidak menawarkan "ditalangi"
  const ps=document.getElementById('billRenovProject');const keep=ps.value;
  D.renovProjects.push({id:'PKLIEN',name:'KlienUji',dana:'klien',items:[]});_populateBillRenovProjectSelect();ps.value='PKLIEN';ps.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
  r.klien=opts();
  D.renovProjects=D.renovProjects.filter(x=>x.id!=='PKLIEN');_populateBillRenovProjectSelect();ps.value=keep;ps.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
  r.cash2=opts();return r;},{B:BILL});
 console.log('dropdown',JSON.stringify(dd));
 ck('Item 4: Cash menawarkan "🤝 home in (ditalangi)"',dd.cash.some(x=>x.startsWith(HOME+'|🤝 home in (ditalangi)')),dd.cash);
 ck('Item 4: BRI (memuat porsi home in) tidak menandai home in sebagai ditalangi',!dd.bri.some(x=>/home in \(ditalangi\)/.test(x))&&dd.bri.some(x=>x.startsWith(HOME+'|')),dd.bri);
 ck('Item 4: proyek klien tidak menawarkan "ditalangi"',!dd.klien.some(x=>/ditalangi/.test(x)),dd.klien);
 ck('Item 4: opsi "ditalangi" sebelum opsi kelola pemilik',dd.cash2[dd.cash2.length-1].startsWith('__manage_owners__'));
 // pilih home in di Cash lewat form dan simpan
 const pick=await p.evaluate(async()=>{const o=document.getElementById('billRenovOwner');o.value='1794734731912';o.dispatchEvent(new Event('change',{bubbles:true}));return{v:o.value,acc:document.getElementById('billAcc').value,form:billOwnerIdFromForm()};});
 ck('Item 4: memilih home in di Cash menghasilkan pemilik tersimpan home in',pick.v===HOME&&pick.form===HOME&&pick.acc==='acc_cash',pick);
 const sv=await p.evaluate(async()=>{const b=[...document.querySelectorAll('#billModal button')].find(x=>/save/i.test(x.getAttribute('data-action')||'')||/^\s*(💾\s*)?Simpan/.test(x.textContent));if(!b)return 'NO-BUTTON';b.click();await new Promise(r=>setTimeout(r,600));return 'ok';});
 const bill=await p.evaluate(B=>{const b=D.bills.find(x=>x.id===B);return b&&{acc:b.accountId,own:String(b.deductionOwnerId),proj:String(b.renovProjectLinkId),item:String(b.renovItemLinkId)};},BILL);
 ck('Form: tagihan proyek tersimpan di Cash + pemilik home in (lewat dropdown baru, bukan skrip)',bill&&bill.acc==='acc_cash'&&bill.own===HOME&&bill.proj===String(PROJ),{sv,bill});
 // --- item 1: bayar ---
 const s1a=await snap();
 await p.evaluate(B=>{markBillPaid(B);},BILL);
 await p.waitForSelector('#promptModalOverlay.open,#promptModalOverlay[style*="flex"],#promptModalOverlay.show',{timeout:5000}).catch(()=>{});
 const choiceOpen=await p.evaluate(()=>{const c=document.getElementById('choiceModalOverlay');return !!c&&(c.classList.contains('open')||c.classList.contains('show')||getComputedStyle(c).display==='flex');});
 await p.evaluate(()=>document.getElementById('promptModalOkBtn').click());await sleep(1500);
 const s1=await snap();console.log('setelah bayar',JSON.stringify(s1));
 ck('Bayar: tanpa dialog pemilik (pemilik tersimpan dihormati)',!choiceOpen);
 ck('Bayar: piutang home in +212.000 (1 baris baru)',s1.nPiutang===s1a.nPiutang+1&&s1.hiSum===s1a.hiSum+212000,{a:s1a.hiSum,b:s1.hiSum});
 ck('Bayar: pengeluaran pribadi tetap; saldo Cash -212.000',s1.pribadi===s1a.pribadi&&s1.cash===s1a.cash-212000,{pr:[s1a.pribadi,s1.pribadi],cash:[s1a.cash,s1.cash]});
 const link=await p.evaluate(({B,P})=>{const t=D.transactions.find(x=>x.billLinkId===B&&x.titipanTalangan);const pj=D.renovProjects.find(x=>String(x.id)===String(P));const it=t&&pj.items.find(x=>String(x.id)===String(t.renovItemLinkId));return t&&{own:String(t.deductionOwnerId),tl:String(t.titipanLinkId),proj:String(t.renovProjectLinkId),payOk:!!(it&&(it.payments||[]).some(x=>String(x.txId)===String(t.id))),id:t.id};},{B:BILL,P:PROJ});
 ck('Bayar: tx bertanda talangan home in & tetap tertaut item proyek (payment ada)',link&&link.own===HOME&&link.tl===HOME&&link.proj===String(PROJ)&&link.payOk,link);
 ck('Bayar: toast talangan tampil',await p.evaluate(()=>window._t.some(m=>/talangan ke home in/i.test(m))));
 const ui=await p.evaluate(async()=>{showPage('keuangan');setKeuanganTab('tagihan');await new Promise(r=>setTimeout(r,800));return{ow:document.documentElement.scrollWidth,card:/Talangan belum diganti/.test(document.body.innerText)};});
 ck('UI: kartu Tagihan menampilkan talangan; viewport 390 tanpa overflow horizontal',ui.card&&ui.ow<=390,ui);
 await p.screenshot({path:'/home/claude/work/s2850-tagihan.png'});
 // --- hapus transaksi ---
 await p.evaluate(async id=>{window.askConfirm=async()=>true;await delTx(id);},link.id);// askConfirm dijawab otomatis (modal konfirmasi menahan promise)await sleep(900);
 const s2=await snap();console.log('setelah hapus',JSON.stringify(s2));
 ck('Hapus tx: saldo Cash, pengeluaran pribadi, piutang kembali ke awal',s2.cash===s1a.cash&&s2.pribadi===s1a.pribadi&&s2.nPiutang===s1a.nPiutang&&s2.hiSum===s1a.hiSum,{s2,s1a});
 console.log('TEMUAN (bukan perubahan ini): payment di item proyek setelah hapus tx =',s2.nPay,'(sebelum bayar',s1a.nPay,')');
 // --- proyek klien: perilaku lama, tanpa piutang talangan otomatis ---
 const kl=await p.evaluate(async({B,P})=>{const pj=D.renovProjects.find(x=>String(x.id)===String(P));pj.dana='klien';const before=(D.piutang||[]).length;markBillPaid(B);await new Promise(r=>setTimeout(r,700));const ok=document.getElementById('promptModalOkBtn');if(ok)ok.click();await new Promise(r=>setTimeout(r,1500));const t=D.transactions.find(x=>x.billLinkId===B&&String(x.renovProjectLinkId)===String(P)&&!x.titipanTalangan&&x.date>='2026-11-19');return{newPiutang:(D.piutang||[]).length-before,tal:D.transactions.some(x=>x.billLinkId===B&&x.titipanTalangan&&x.date>='2026-11-19'),hasTx:!!t};},{B:BILL,P:PROJ});
 ck('Proyek klien: tidak membuat piutang talangan otomatis (perilaku lama)',kl.newPiutang===0&&!kl.tal,kl);
 ck('Tanpa error JS (abaikan ERR_NAME_NOT_RESOLVED)',errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)).length===0,errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)));
 await H.close();console.log(res.filter(r=>!r.ok).length?'GAGAL '+res.filter(r=>!r.ok).map(r=>r.n).join(' | '):'SEMUA LULUS ('+res.length+')');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
