// Uji browser S2853: Chat AI banyak usulan sekaligus (Konfirmasi semua / Batal semua), add_piutang, add_utang, add_transaksi/add_tagihan dengan
// accountName + ownerName (talangan dari Cash, potong porsi dari BRI), akun tak dikenal = gagal tanpa efek, prompt memuat nama akun & pemilik. Viewport 390x844.
// Jalankan: ROOT=<repo> BACKUP=<backup.json> node e2e/s2853-chat-multi-aksi.js   (AI disimulasikan: callAIProviderRaw di-stub, tanpa jaringan)
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,330):''));};
const blk=o=>'[[ACTION]]'+JSON.stringify(o)+'[[/ACTION]]';
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 ck('Backup termuat',await loaded());
 const snap=()=>p.evaluate(()=>{let pr=0;(D.transactions||[]).forEach(t=>{if(t.type==='expense'&&!isAliranKlienSafe(t))pr+=t.amount;});return{pribadi:pr,cash:recalcAccBalance('acc_cash'),bri:recalcAccBalance('acc_bri'),nTx:D.transactions.length,nPiu:D.piutang.length,nDebt:(D.debts||[]).length,nBill:D.bills.length,hi:D.piutang.filter(x=>/home in/.test(x.name)).reduce((a,x)=>a+x.nilai,0)};});
 const s0=await snap();
 await p.evaluate(()=>{D.profile.apiKey='stub';window.__prompts=[];window.__reply='';window.callAIProviderRaw=async(sp)=>{window.__prompts.push(sp);return{ok:true,text:window.__reply};};window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};showPage('ai');});
 await sleep(600);
 const ask=async(reply,q)=>{await p.evaluate(({reply,q})=>{window.__reply=reply;document.getElementById('chatInput').value=q;return sendChat();},{reply,q});await sleep(900);};
 // ---- A. enam usulan sekaligus
 const A=['Siap, ini rekapnya ya:',
  blk({type:'add_transaksi',data:{type:'expense',amount:50000,category:'Renov',accountName:'Cash',ownerName:'home in',note:'UJI lem',date:'2026-11-18'}}),
  blk({type:'add_transaksi',data:{type:'expense',amount:30000,category:'Renov',accountName:'BRI',ownerName:'home in',note:'UJI paku'}}),
  blk({type:'add_transaksi',data:{type:'expense',amount:20000,category:'Makan',accountName:'Mandiri',note:'UJI akun salah'}}),
  blk({type:'add_piutang',data:{name:'UJI Budi',amount:500000,date:'2026-11-10',note:'pinjam'}}),
  blk({type:'add_utang',data:{name:'UJI Bank',amount:1000000,jenis:'koperasi',cicilanBulanan:100000}}),
  blk({type:'add_tagihan',data:{name:'UJI Listrik',amount:200000,nextDue:'2026-12-20',accountName:'Cash',ownerName:'home in'}})].join('\n');
 await ask(A,'catat semuanya');
 const ui=await p.evaluate(()=>({cards:document.querySelectorAll('[id^="chatAction_"]').length,all:!!document.querySelector('[id^="chatActionAll_"]'),allBtn:(document.querySelector('[data-action="confirmAllChatActions"]')||{}).textContent,txt:[...document.querySelectorAll('#chatBox .chat-bubble.ai')].map(x=>x.innerText).join('\n'),ow:document.documentElement.scrollWidth}));
 ck('6 kartu usulan + 1 kartu "Konfirmasi semua (6)"',ui.cards===6&&ui.all,ui.cards+' '+ui.allBtn);
 ck('Teks AI bersih dari blok [[ACTION]]',!/\[\[ACTION/.test(ui.txt)&&/rekapnya/.test(ui.txt));
 ck('Ringkasan kartu memuat akun & pemilik',/akun Cash\s*·\s*pemilik home in/.test(ui.txt)&&/akun BRI\s*·\s*pemilik home in/.test(ui.txt),(ui.txt.match(/Pengeluaran Rp 50\.000[^\n]*/)||[])[0]);
 ck('Viewport 390 tanpa overflow horizontal',ui.ow<=390,ui.ow);
 const pr=await p.evaluate(()=>window.__prompts[0]||'');
 ck('Prompt AI memuat tipe baru + daftar pemilik titipan + nama akun',/add_piutang/.test(pr)&&/add_utang/.test(pr)&&/PEMILIK DANA TITIPAN[^\n]*home in/.test(pr)&&/SALDO AKUN:[^\n]*Cash/.test(pr),pr.match(/PEMILIK DANA TITIPAN[^\n]*/)&&pr.match(/PEMILIK DANA TITIPAN[^\n]*/)[0]);
 ck('Belum ada yang tersimpan sebelum konfirmasi',JSON.stringify(await snap())===JSON.stringify(s0));
 await p.evaluate(()=>document.querySelector('[data-action="confirmAllChatActions"]').click());await sleep(1200);
 const s1=await snap();console.log('setelah konfirmasi semua',JSON.stringify(s1));
 const sum=await p.evaluate(()=>(document.querySelector('[id^="chatActionAll_"]')||{}).innerText||'');
 ck('Ringkasan: 5 tersimpan, 1 gagal',/5 tersimpan/.test(sum)&&/1 gagal/.test(sum),sum);
 ck('Transaksi +2 (akun salah TIDAK tersimpan)',s1.nTx===s0.nTx+2,{a:s0.nTx,b:s1.nTx});
 ck('Talangan Cash: kas -50.000 dan piutang home in +50.000',s1.cash===s0.cash-50000&&s1.hi===s0.hi+50000,{cash:[s0.cash,s1.cash],hi:[s0.hi,s1.hi]});
 ck('Potong porsi BRI: saldo BRI -30.000, tanpa piutang baru',s1.bri===s0.bri-30000);
 ck('Pengeluaran pribadi TIDAK naik (talangan + potong porsi non-pribadi)',s1.pribadi===s0.pribadi,{a:s0.pribadi,b:s1.pribadi});
 ck('Piutang +2 (talangan + UJI Budi), utang +1',s1.nPiu===s0.nPiu+2&&s1.nDebt===s0.nDebt+1,{piu:[s0.nPiu,s1.nPiu],debt:[s0.nDebt,s1.nDebt]});
 ck('Tagihan +2 (UJI Listrik + tagihan cicilan utang otomatis)',s1.nBill===s0.nBill+2,{a:s0.nBill,b:s1.nBill});
 const det=await p.evaluate(()=>{const tl=D.transactions.find(t=>t.note==='UJI lem');const pt=D.transactions.find(t=>t.note==='UJI paku');const bl=D.bills.find(b=>b.name==='UJI Listrik');const pi=D.piutang.find(x=>tl&&x.autoTxId===tl.id);return{tl:tl&&{acc:tl.accountId,tal:tl.titipanTalangan,own:tl.deductionOwnerId,date:tl.date},pt:pt&&{acc:pt.accountId,tal:pt.titipanTalangan,own:pt.deductionOwnerId},bl:bl&&{acc:bl.accountId,own:String(bl.deductionOwnerId),kind:bl.kind},pi:pi&&{nilai:pi.nilai,tgl:pi.tanggal,nama:pi.name},bank:(D.debts||[]).find(d=>d.name==='UJI Bank')};});
 ck('Detail talangan: tx Cash bertanda talangan home in, piutang tanggal = tanggal tx',det.tl&&det.tl.acc==='acc_cash'&&det.tl.tal===true&&String(det.tl.own)==='1794734731912'&&det.pi&&det.pi.nilai===50000&&det.pi.tgl==='2026-11-18',det);
 ck('Detail potong porsi: tx BRI ber-deductionOwnerId home in, bukan talangan',det.pt&&det.pt.acc==='acc_bri'&&!det.pt.tal&&String(det.pt.own)==='1794734731912',det.pt);
 ck('Tagihan chat: akun Cash + pemilik home in tersimpan (kini bisa dibayar sebagai talangan)',det.bl&&det.bl.acc==='acc_cash'&&det.bl.own==='1794734731912'&&det.bl.kind==='tagihan',det.bl);
 ck('Utang: jenis koperasi, belum lunas',det.bank&&det.bank.jenis==='koperasi'&&det.bank.lunas===false,det.bank);
 // ---- tagihan hasil chat dibayar lewat alur Bayar yang ada = talangan juga
 const bid=await p.evaluate(()=>D.bills.find(b=>b.name==='UJI Listrik').id);
 await p.evaluate(B=>{markBillPaid(B);},bid);
 await p.waitForSelector('#promptModalOverlay.open,#promptModalOverlay[style*="flex"],#promptModalOverlay.show',{timeout:5000}).catch(()=>{});
 await p.evaluate(()=>{const b=document.getElementById('promptModalOkBtn');if(b)b.click();});await sleep(1500);
 const s2=await snap();
 ck('Bayar tagihan hasil chat: piutang home in +200.000, pribadi tetap',s2.hi===s1.hi+200000&&s2.pribadi===s1.pribadi,{hi:[s1.hi,s2.hi],pr:[s1.pribadi,s2.pribadi]});
 // ---- B. edit sebelum konfirmasi
 await ask(blk({type:'add_transaksi',data:{type:'expense',amount:11000,category:'Makan',note:'UJI edit'}}),'catat makan');
 const ed=await p.evaluate(async()=>{const card=[...document.querySelectorAll('[id^="chatAction_"]')].pop();card.querySelector('[data-action="editChatAction"]').click();await new Promise(r=>setTimeout(r,200));
  const sel=card.querySelector('select[id$="_accountName"]');const own=card.querySelector('input[id$="_ownerName"]');if(!sel||!own)return{err:'field akun/pemilik tidak ada'};
  sel.value='Cash';own.value='renov';card.querySelector('[data-action="saveChatActionEdit"]').click();await new Promise(r=>setTimeout(r,200));
  const sumTxt=card.innerText;card.querySelector('[data-action="confirmChatAction"]').click();await new Promise(r=>setTimeout(r,500));
  const tx=D.transactions.find(t=>t.note==='UJI edit');return{sumTxt,tx:tx&&{acc:tx.accountId,tal:tx.titipanTalangan,own:tx.deductionOwnerId},msg:card.innerText};});
 ck('Edit kartu: akun + pemilik bisa diubah lalu disimpan sebagai talangan renov',ed.tx&&ed.tx.acc==='acc_cash'&&ed.tx.tal===true&&/renov/.test(ed.sumTxt),ed);
 // ---- C. batal semua
 const s3=await snap();
 await ask([blk({type:'add_piutang',data:{name:'UJI batal1',amount:1000}}),blk({type:'add_piutang',data:{name:'UJI batal2',amount:2000}})].join('\n'),'catat dua');
 await p.evaluate(()=>document.querySelector('[data-action="cancelAllChatActions"]').click());await sleep(500);
 const s4=await snap();
 ck('Batal semua: tidak ada data tersimpan',s4.nPiu===s3.nPiu&&s4.nTx===s3.nTx);
 // ---- D. lebih dari 20 blok
 await ask(Array.from({length:23},(_,i)=>blk({type:'add_target',data:{name:'UJI t'+i,amount:1000}})).join('\n'),'banyak');
 const many=await p.evaluate(()=>({cards:[...document.querySelectorAll('[id^="chatAction_"]')].filter(x=>x.querySelector('[data-action="confirmChatAction"]')).length,warn:/Terlalu banyak/.test(document.getElementById('chatBox').innerText)}));
 ck('23 blok: hanya 20 kartu + peringatan',many.cards===20&&many.warn,many);
 // ---- E. hapus transaksi talangan lewat chat: piutang ikut hilang
 await p.evaluate(async()=>{window.askConfirm=async()=>true;const t=D.transactions.find(x=>x.note==='UJI lem');await delTx(t.id);});await sleep(900);
 const s5=await snap();
 ck('Hapus tx talangan hasil chat: piutang talangan ikut hilang (hi turun 50.000)',s5.hi===s2.hi-50000,{s2hi:s2.hi,s5hi:s5.hi});
 const orphan=await p.evaluate(()=>D.piutang.filter(x=>x.autoTxId&&!D.transactions.some(t=>t.id===x.autoTxId)).length);
 ck('Tidak ada piutang talangan yatim',orphan===0,orphan);
 const jsErr=errs.filter(e=>!/ERR_TUNNEL|ERR_NAME/.test(e));
 ck('Tanpa error JS (selain jaringan sandbox)',jsErr.length===0,jsErr);
 const bad=res.filter(r=>!r.ok);console.log('\nHASIL '+(res.length-bad.length)+'/'+res.length);if(bad.length)console.log('GAGAL:',bad.map(b=>b.n).join(' | '));
 await H.close();process.exit(bad.length?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2);});
