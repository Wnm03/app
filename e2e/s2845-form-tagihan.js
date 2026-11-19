// Uji browser S2845: form tagihan baru (BRI -> pemilik tersimpan; Cash -> pribadi) + bayar + dampak laporan pribadi.
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,300):''));};
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;p.on('crash',()=>console.log('PAGE CRASH'));p.on('close',()=>console.log('PAGE CLOSED'));const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1000);
 await p.evaluate(()=>{window.askConfirm=async()=>true;window.showChoiceModal=async()=>0;window.showPromptModal=async o=>String((o&&o.defaultValue)!=null?o.defaultValue:'');window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};});
 const pers=()=>p.evaluate(()=>{const n=new Date(),ym=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');let e=0,f=0;(D.transactions||[]).forEach(t=>{if(t.type!=='expense'||String(t.date).slice(0,7)!==ym)return;f+=t.amount;if(!isAliranKlienSafe(t))e+=t.amount;});return{pribadi:e,fisik:f,saldoBRI:recalcAccBalance?recalcAccBalance('acc_bri'):null};});
 const base=await pers();console.log('baseline',base);
 const addBill=(name,acc)=>p.evaluate(async([name,acc])=>{
  openBillModal();await new Promise(r=>setTimeout(r,200));
  document.getElementById('billName').value=name;document.getElementById('billAmt').value='100000';
  const n=new Date();document.getElementById('billDue').value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-28';
  const a=document.getElementById('billAcc');a.value=acc;a.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,300));
  const o=document.getElementById('billRenovOwner');const ui={val:o&&o.value,opts:o?[...o.options].map(x=>x.text):null};
  await saveBill();await new Promise(r=>setTimeout(r,400));
  const b=D.bills.find(x=>x.name===name);return{ui,deductionOwnerId:b&&b.deductionOwnerId,id:b&&b.id,toasts:window._t.slice(-2)};
 },[name,acc]);
 const bri=await addBill('UJI-BRI','acc_bri');console.log(bri);
 ck('Form BRI: tagihan tersimpan & membawa pemilik "home in" (1794734731912)',bri.id&&String(bri.deductionOwnerId)==='1794734731912',bri);
 const cash=await addBill('UJI-CASH','acc_cash');console.log(cash);
 ck('Form Cash: tagihan tersimpan sebagai pribadi (tanpa deductionOwnerId)',cash.id&&!cash.deductionOwnerId,cash);
 // kartu & chip
 await p.evaluate(()=>{showPage('keuangan');if(typeof setKeuanganTab==='function')setKeuanganTab('tagihan');});await sleep(800);
 const ui=await p.evaluate(()=>({card:(document.getElementById('billOwnershipCard')||{}).innerText||document.body.innerText.match(/Pribadi[^\n]*\n?[^\n]*Titipan[^\n]*/)?.[0]||null,chips:(document.body.innerText.match(/🤝[^\n]*/g)||[]).length}));
 ck('Kartu Pribadi/Titipan & chip pemilik tampil',ui.chips>0,ui);
 // bayar
 const payAll=async id=>{await p.evaluate(id=>markBillPaid(id),id).catch(e=>console.log('pay err',e.message.slice(0,150)));await sleep(900);};
 await payAll(bri.id);
 const txB=await p.evaluate(id=>{const t=(D.transactions||[]).filter(x=>String(x.billLinkId)===String(id)).pop();return t&&{id:t.id,acc:t.accountId,owner:t.deductionOwnerId,amt:t.amount,safe:isAliranKlienSafe(t)};},bri.id);
 ck('Bayar BRI: transaksi membawa deductionOwnerId home in & dikecualikan dari pribadi',txB&&String(txB.owner)==='1794734731912'&&txB.safe===true,txB);
 const mid=await pers();
 ck('Pengeluaran pribadi TIDAK naik karena tagihan BRI; fisik naik 100.000',mid.pribadi===base.pribadi&&mid.fisik===base.fisik+100000,{base,mid});
 await payAll(cash.id);
 const txC=await p.evaluate(id=>{const t=(D.transactions||[]).filter(x=>String(x.billLinkId)===String(id)).pop();return t&&{acc:t.accountId,owner:t.deductionOwnerId,safe:isAliranKlienSafe(t)};},cash.id);
 ck('Bayar Cash: transaksi pribadi (tanpa penanda, tidak dikecualikan)',txC&&!txC.owner&&txC.safe===false,txC);
 const end=await pers();
 ck('Pengeluaran pribadi naik tepat 100.000 (hanya Cash)',end.pribadi===base.pribadi+100000,{end});
 // Hub & Laporan ikut basis pribadi
 const hub=await p.evaluate(async()=>{showPage('dashboard-hub');await new Promise(r=>setTimeout(r,800));return(document.getElementById('dashHubHeroExp')||{}).innerText||null;});
 console.log('hub exp',hub);
 ck('Hub: Keluar (pribadi) = pengeluaran pribadi bulan ini',hub&&String(hub).replace(/[^\d]/g,'')===String(end.pribadi),{hub,pribadi:end.pribadi});
 const note=await p.evaluate(()=>(document.getElementById('dashHubHeroTitipan')||{}).innerText||null);
 ck('Hub: catatan "belum termasuk titipan pemilik lain" tampil & >= 100.000',!!note&&Number(note.replace(/\D/g,'').slice(-9))>=100000,note);
 const lap=await p.evaluate(async()=>{showPage('keuangan');setKeuanganTab('laporan');if(typeof renderLaporan==='function')renderLaporan();await new Promise(r=>setTimeout(r,1200));const n=document.getElementById('lapBasisNote'),b=document.getElementById('lapBasisBox');return{note:n&&n.textContent,shown:b&&b.style.display!=='none'};});
 ck('Laporan: kotak basis & catatan menyebut titipan pemilik lain',lap.shown&&/titipan pemilik lain/.test(lap.note||''),lap);
 await p.screenshot({path:'/home/claude/work/s2845-laporan.png'});
 ck('Tanpa error JS (abaikan ERR_NAME_NOT_RESOLVED: sumber luar, container tanpa internet)',errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)).length===0,errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)));
 ck('(dummy)',true);
 void 0;
 //,errs.length===0,errs);
 await p.screenshot({path:'/home/claude/work/s2845-hp.png'});
 await H.close();
 console.log(res.filter(r=>!r.ok).length?'GAGAL':'SEMUA LULUS');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
