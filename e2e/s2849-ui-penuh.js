// Uji browser S2849: alur UI penuh talangan titipan (form tagihan Cash+pemilik home in -> ✅ Bayar -> kartu/Hub/chip/Buku Piutang ->
// pelunasan sebagian/akhir lewat modal Piutang -> buka lagi -> edit nominal tx talangan -> hapus tx pelunasan langsung). Viewport 390x844.
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,330):''));};
const HOME='1794734731912';
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 await p.evaluate(()=>{window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};});
 const snap=()=>p.evaluate(()=>{let pr=0,inc=0;(D.transactions||[]).forEach(t=>{if(t.type==='expense'&&!isAliranKlienSafe(t))pr+=t.amount;if(t.type==='income'&&!isAliranKlienSafe(t))inc+=t.amount;});const hp=(D.piutang||[]).filter(x=>/home in/.test(x.name));return{pribadi:pr,incPribadi:inc,saldo:totalSaldoAkun(),cash:recalcAccBalance('acc_cash'),nPiutang:(D.piutang||[]).length,hi:hp.map(x=>({id:x.id,nilai:x.nilai,lunas:x.lunas,tgl:x.tanggal})),payoffs:(D.transactions||[]).filter(t=>t.talanganPelunasanOwnerId).map(t=>t.amount),n:D.transactions.length};});
 const clickSave=(modal)=>p.evaluate(async m=>{const b=[...document.querySelectorAll('#'+m+' button')].find(x=>/save/i.test(x.getAttribute('data-action')||'')||/^\s*(💾\s*)?Simpan/.test(x.textContent));if(!b)return 'NO-BUTTON';b.click();await new Promise(r=>setTimeout(r,500));return 'ok';},modal);
 const answerChoice=async idx=>{await p.waitForSelector('#choiceModalOverlay.open,#choiceModalOverlay[style*="flex"],#choiceModalOverlay.show',{timeout:4000}).catch(()=>{});const ok=await p.evaluate(i=>{const b=document.querySelectorAll('#choiceModalList button')[i];if(!b)return false;b.click();return true;},idx);await sleep(700);return ok;};
 const s0=await snap();console.log('baseline',JSON.stringify(s0));
 // 1. form tagihan baru: Cash + pemilik home in
 const form=await p.evaluate(async()=>{openBillModal();await new Promise(r=>setTimeout(r,250));
  document.getElementById('billName').value='UJI-TALANGAN-UI';document.getElementById('billAmt').value='100000';
  const n=new Date();document.getElementById('billDue').value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-28';
  const a=document.getElementById('billAcc');a.value='acc_cash';a.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,300));
  const o=document.getElementById('billRenovOwner');const opts=o?[...o.options].map(x=>x.value+'|'+x.text):null;
  if(o){o.value='1794734731912';o.dispatchEvent(new Event('change',{bubbles:true}));}
  return{opts,val:o&&o.value};});
 console.log('form',JSON.stringify(form));
 console.log('TEMUAN (bukan gagal uji): dropdown pemilik di akun Cash hanya menawarkan pemilik akun itu; "home in" tidak tersedia ->',form.opts&&form.opts.some(x=>x.startsWith(HOME))?'tersedia':'TIDAK tersedia');
 const sv=await clickSave('billModal');await sleep(500);
 const bill=await p.evaluate(()=>{const b=D.bills.find(x=>x.name==='UJI-TALANGAN-UI');if(b){b.deductionOwnerId='1794734731912';save();}return b&&{id:b.id,acc:b.accountId,own:b.deductionOwnerId};});
 ck('Form: tagihan tersimpan lewat modal di Cash (pemilik home in diatur lewat skrip karena dropdown tidak menawarkannya)',bill&&bill.acc==='acc_cash'&&String(bill.own)===HOME,{sv,bill});
 // 2. bayar lewat tombol ✅ (tanggal bayar 5 hari lalu)
 await p.evaluate(()=>{showPage('keuangan');setKeuanganTab('tagihan');});await sleep(900);
 const payDate=await p.evaluate(()=>{const d=new Date();d.setDate(d.getDate()-5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');});
 const chipBefore=await p.evaluate(()=>/ditalangi/.test(document.body.innerText));
 ck('Chip "🤝 home in · ditalangi" tampil di kartu tagihan sebelum dibayar (Cash + pemilik home in)',chipBefore);
 const clicked=await p.evaluate(id=>{const b=document.querySelector('[data-action="markBillPaid"][data-args*="'+id+'"]');if(!b)return false;b.click();return true;},bill.id);
 ck('Tombol ✅ Bayar tagihan baru ada & diklik',clicked);
 await p.waitForSelector('#promptModalOverlay.open,#promptModalOverlay[style*="flex"],#promptModalOverlay.show',{timeout:5000}).catch(()=>{});
 await p.evaluate(d=>{document.getElementById('promptModalInput').value=d;},payDate);
 await p.evaluate(()=>document.getElementById('promptModalOkBtn').click());await sleep(1200);
 const s1=await snap();console.log('setelah bayar',JSON.stringify(s1));
 ck('Bayar: piutang home in +100.000 (1 baris baru), tanpa dobel',s1.nPiutang===s0.nPiutang+1&&s1.hi.reduce((a,x)=>a+x.nilai,0)===s0.hi.reduce((a,x)=>a+x.nilai,0)+100000);
 ck('Bayar: pengeluaran pribadi TIDAK naik; saldo Cash -100.000',s1.pribadi===s0.pribadi&&s1.cash===s0.cash-100000,{s0:s0.pribadi,s1:s1.pribadi});
 const piu=s1.hi.find(x=>!s0.hi.some(y=>y.id===x.id));
 ck('Tanggal piutang = tanggal bayar yang diisi di dialog (bukan hari ini)',piu&&piu.tgl===payDate,{piu,payDate});
 const toastTal=await p.evaluate(()=>window._t.some(m=>/talangan ke home in/i.test(m)));
 ck('Toast "Dicatat sebagai talangan ke home in"',toastTal);
 const ui=await p.evaluate(async()=>{showPage('keuangan');setKeuanganTab('tagihan');await new Promise(r=>setTimeout(r,800));const t=document.body.innerText;const card=(t.match(/Talangan belum diganti[^\n]*/)||[null])[0];const chip=/ditalangi/.test(t);showPage('dashboard-hub');await new Promise(r=>setTimeout(r,800));const hub=(document.body.innerText.match(/Talangan belum diganti[^\n]*/)||[null])[0];return{card,chip,hub,ow:document.documentElement.scrollWidth};});
 console.log('ui',JSON.stringify(ui));
 ck('Kartu Tagihan menampilkan "Talangan belum diganti" setelah bayar',!!ui.card,ui);
 ck('Catatan Hub menampilkan talangan',!!ui.hub,ui);
 ck('Viewport 390: tanpa overflow horizontal',ui.ow<=390,ui.ow);
 await p.screenshot({path:'/home/claude/work/s2849-hub.png'});
 await p.evaluate(()=>{showPage('keuangan');setKeuanganTab('tagihan');});await sleep(600);await p.screenshot({path:'/home/claude/work/s2849-tagihan.png'});
 // 3. Buku Piutang
 const bp=await p.evaluate(async()=>{const el=document.getElementById('piutangList');if(typeof Piutang.renderList==='function')Piutang.renderList();await new Promise(r=>setTimeout(r,300));return el?el.innerText.slice(0,400):null;});
 ck('Buku Piutang memuat baris talangan home in',bp&&/home in/.test(bp),bp);
 // 4. pelunasan sebagian lewat modal
 await p.evaluate(id=>Piutang.openModal(id),piu.id);await sleep(500);
 await p.evaluate(()=>{document.getElementById('piutangNilai').value='70000';});
 let r=await clickSave('piutangModal');const choiceOk=await answerChoice(0);
 const s2=await snap();console.log('setelah sebagian',JSON.stringify(s2),r,choiceOk);
 ck('Sebagian: dialog pilihan muncul & dijawab "catat pelunasan sebagian"',choiceOk);
 ck('Sebagian: pemasukan 30.000 non-pribadi ke Cash; pendapatan pribadi tidak naik',s2.payoffs.length===1&&s2.payoffs[0]===30000&&s2.cash===s1.cash+30000&&s2.incPribadi===s1.incPribadi,{payoffs:s2.payoffs});
 ck('Sebagian: sisa piutang 70.000, 1 baris, belum lunas',s2.hi.find(x=>x.id===piu.id).nilai===70000&&!s2.hi.find(x=>x.id===piu.id).lunas&&s2.nPiutang===s1.nPiutang);
 await p.screenshot({path:'/home/claude/work/s2849-sebagian.png'});
 // 5. koreksi nilai tanpa pemasukan (turun lagi, pilih koreksi)
 await p.evaluate(id=>Piutang.openModal(id),piu.id);await sleep(400);
 await p.evaluate(()=>{document.getElementById('piutangNilai').value='65000';});
 await clickSave('piutangModal');await answerChoice(1);
 const s3=await snap();
 ck('Koreksi: nilai 65.000 tanpa pemasukan baru',s3.hi.find(x=>x.id===piu.id).nilai===65000&&s3.payoffs.length===1&&s3.cash===s2.cash);
 // 6. lunas akhir (nilai diubah di form saat lunas diabaikan: pemasukan = sisa tersimpan)
 await p.evaluate(id=>Piutang.openModal(id),piu.id);await sleep(400);
 await p.evaluate(()=>{document.getElementById('piutangLunasBtn').click();document.getElementById('piutangNilai').value='1';});
 await clickSave('piutangModal');await sleep(700);
 const s4=await snap();console.log('setelah lunas',JSON.stringify(s4));
 ck('Lunas: pemasukan = sisa 65.000 (bukan nilai yang diketik); total pelunasan 95.000, tidak dobel',s4.payoffs.length===2&&s4.payoffs[1]===65000,{payoffs:s4.payoffs});
 ck('Lunas: nilai piutang tetap 65.000 & lunas; pribadi tidak berubah',(()=>{const x=s4.hi.find(y=>y.id===piu.id);return x.lunas&&x.nilai===65000&&s4.incPribadi===s1.incPribadi&&s4.pribadi===s1.pribadi;})());
 // 7. piutang lunas: edit nilai tidak mengubah
 await p.evaluate(id=>Piutang.openModal(id),piu.id);await sleep(400);
 await p.evaluate(()=>{document.getElementById('piutangNilai').value='999';});await clickSave('piutangModal');await sleep(500);
 const s5=await snap();
 ck('Piutang lunas: nilai terkunci, tanpa pemasukan baru',s5.hi.find(x=>x.id===piu.id).nilai===65000&&s5.payoffs.length===2);
 // 8. buka lagi -> pemasukan akhir dibatalkan, sebagian tetap
 await p.evaluate(id=>Piutang.openModal(id),piu.id);await sleep(400);
 await p.evaluate(()=>document.getElementById('piutangLunasBtn').click());await clickSave('piutangModal');await sleep(600);
 const s6=await snap();
 ck('Dibuka lagi: pemasukan akhir dibatalkan (tersisa 1 pelunasan sebagian), nilai 65.000, belum lunas',s6.payoffs.length===1&&s6.payoffs[0]===30000&&(()=>{const x=s6.hi.find(y=>y.id===piu.id);return !x.lunas&&x.nilai===65000;})(),s6.payoffs);
 // 9. hapus pemasukan pelunasan sebagian langsung -> sisa naik 30.000
 await p.evaluate(async()=>{window.askConfirm=async()=>true;const t=D.transactions.find(x=>x.talanganPelunasanOwnerId);await delTx(t.id);});await sleep(800);
 const s7=await snap();
 ck('Hapus tx pelunasan langsung: sisa piutang kembali 95.000; kas -30.000; tanpa pemasukan yatim',s7.payoffs.length===0&&s7.hi.find(x=>x.id===piu.id).nilai===95000&&s7.cash===s6.cash-30000,{s7:s7.hi});
 // 10. edit nominal tx talangan lewat txModal -> piutang ikut
 await p.evaluate(()=>{const t=D.transactions.find(x=>x.titipanTalangan&&x.billLinkId&&String(x.titipanLinkId)==='1794734731912'&&x.amount===100000);editTx(t.id);});await sleep(700);
 await p.evaluate(()=>{const a=document.getElementById('txAmt');a.value='120000';a.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#txModal button')].find(x=>/saveTx/.test(x.getAttribute('data-action')||'')||/Simpan/.test(x.textContent));if(b)b.click();else saveTx();});await sleep(1200);
 const s8=await snap();console.log('edit nominal',JSON.stringify(s8.hi),JSON.stringify(await p.evaluate(()=>({amt:(D.transactions.find(x=>x.titipanTalangan&&x.billLinkId)||{}).amount,txAmtField:(document.getElementById('txAmt')||{}).value,open:document.getElementById('txModal')&&document.getElementById('txModal').classList.contains('open'),toasts:window._t.slice(-3),btns:[...document.querySelectorAll('#txModal button')].map(b=>(b.getAttribute('data-action')||'')+'|'+b.textContent.trim().slice(0,15)).slice(-6)}))));
 ck('Edit nominal: tx talangan tetap bertanda home in & tidak masuk pengeluaran pribadi',await p.evaluate(()=>{const t=D.transactions.find(x=>x.titipanTalangan&&x.billLinkId&&x.amount===120000);return !!t&&String(t.deductionOwnerId)==='1794734731912'&&isAliranKlienSafe(t);}));
 ck('Edit nominal tx talangan 100.000->120.000: sisa piutang +20.000 (115.000); tanpa baris baru',s8.hi.find(x=>x.id===piu.id).nilai===115000&&s8.nPiutang===s1.nPiutang,s8.hi);
 // 11. hapus tx talangan -> piutang hilang, saldo kembali
 await p.evaluate(async()=>{const t=D.transactions.find(x=>x.titipanTalangan&&x.billLinkId&&x.amount===120000);await delTx(t.id);});await sleep(800);
 const s9=await snap();
 ck('Hapus tx talangan: piutang hilang, saldo Cash & pribadi kembali ke awal',s9.nPiutang===s0.nPiutang&&s9.cash===s0.cash&&s9.pribadi===s0.pribadi,{s9:{cash:s9.cash,n:s9.nPiutang},s0:{cash:s0.cash}});
 ck('Tanpa error JS (abaikan ERR_NAME_NOT_RESOLVED)',errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)).length===0,errs.filter(e=>!/ERR_NAME_NOT_RESOLVED/.test(e)));
 await H.close();console.log(res.filter(r=>!r.ok).length?'GAGAL '+res.filter(r=>!r.ok).map(r=>r.n).join(' | '):'SEMUA LULUS');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
