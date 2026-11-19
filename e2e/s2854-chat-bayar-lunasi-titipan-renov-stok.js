// Uji browser S2854: aksi chat pay_tagihan, pay_piutang, add_titipan, add_renov_proyek/item (+tagihan tertaut), add_stok_cobek. Viewport 390x844, AI di-stub.
// Jalankan: ROOT=<repo> BACKUP=<backup.json> node e2e/s2854-chat-bayar-lunasi-titipan-renov-stok.js
const h=require('./dana-proyek-browser/harness');const fs=require('fs');
const BK=JSON.parse(fs.readFileSync(process.env.BACKUP,'utf8'));
const res=[];const ck=(n,ok,d)=>{res.push({n,ok:!!ok});console.log((ok?'✓ ':'✗ ')+n+(d!==undefined?'  → '+JSON.stringify(d).slice(0,300):''));};
const blk=o=>'[[ACTION]]'+JSON.stringify(o)+'[[/ACTION]]';
(async()=>{
 const H=await h.start({width:390,height:844},true);const {p,errs}=H;const sleep=ms=>p.waitForTimeout(ms);
 const loaded=()=>p.evaluate(()=>(D.accounts||[]).some(a=>a.id==='acc_bri')&&(D.transactions||[]).length>1000);
 for(let i=0;i<3&&!(await loaded());i++){
  await p.evaluate(async bk=>{Object.keys(D).forEach(k=>delete D[k]);Object.assign(D,bk);const s=JSON.stringify(D);localStorage.setItem('kw_v4',s);try{await IDBStore.set('kw_v4_mirror',s);}catch(e){void e;}},BK);
  await p.reload();await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1200);
 }
 ck('Backup termuat',await loaded());
 await p.evaluate(()=>{D.profile.apiKey='stub';window.__prompts=[];window.__reply='';window.callAIProviderRaw=async(sp)=>{window.__prompts.push(sp);return{ok:true,text:window.__reply};};});
 await sleep(500);
 const ask=async(reply,q)=>{await p.evaluate(({reply,q})=>{window.__reply=reply;document.getElementById('chatInput').value=q;return sendChat();},{reply,q});await sleep(900);};
 const confirmAll=async()=>{await p.evaluate(()=>{const b=document.querySelector('[data-action="confirmAllChatActions"]');if(b)b.click();});await sleep(2500);};
 const lastCards=()=>p.evaluate(()=>[...document.querySelectorAll('[id^="chatAction_"]')].map(c=>c.innerText.replace(/\s+/g,' ')));
 const bill=n=>p.evaluate(n=>{const b=D.bills.find(x=>x.name===n);const t=D.transactions.filter(x=>b&&x.billLinkId===b.id);return{nextDue:b&&b.nextDue,n:t.length,last:t.length?{amt:t[t.length-1].amount,date:t[t.length-1].date,acc:t[t.length-1].accountId}:null};},n);
 const BN=await p.evaluate(()=>{BillDebtPiutangCanonicalWriter.add('bills',{id:uid(),name:'UJI Bayar Chat',amount:135000,nextDue:'2026-11-25',freq:'bulanan',category:'Tagihan',subcategory:'',accountId:'acc_cash',note:'',kind:'tagihan'});save();return 'UJI Bayar Chat';});console.log('Tagihan uji:',BN);
 const PID=await p.evaluate(()=>String(D.piutang.find(x=>x.name==='istri'&&!x.lunas).id));
 const s0={n:await p.evaluate(()=>D.transactions.length),wifi:await bill(BN),cash:await p.evaluate(()=>recalcAccBalance('acc_cash'))};

 // A. batch: bayar wifi + lunasi sebagian piutang istri + titipan baru + proyek + item + tagihan tertaut + stok
 await ask(['Oke, ini usulannya:',
  blk({type:'pay_tagihan',data:{name:BN,date:'2026-11-18'}}),
  blk({type:'pay_piutang',data:{name:'istri',amount:40000,date:'2026-11-18'}}),
  blk({type:'add_titipan',data:{ownerName:'UJI Pak Budi',amount:3000000,date:'2026-11-10',note:'uji'}}),
  blk({type:'add_renov_proyek',data:{name:'UJI Kamar Tamu',rab:9000000,klien:'UJI Bu Sari',lokasi:'Magelang'}}),
  blk({type:'add_renov_item',data:{projectName:'UJI Kamar Tamu',name:'UJI Cat Dinding',harga:750000,accountName:'BRI'}}),
  blk({type:'add_tagihan',data:{name:'UJI Cicilan Cat',amount:250000,nextDue:'2026-12-20',projectName:'UJI Kamar Tamu',itemName:'UJI Cat Dinding'}}),
  blk({type:'add_stok_cobek',data:{productName:'cobek 21-22cm',qty:4,hargaBeli:16000,accountName:'Cash',date:'2026-11-18'}})
 ].join('\n'),'catat semuanya');
 const ui=await p.evaluate(()=>({lbl:[...document.querySelectorAll('[id^="chatAction_"]')].map(c=>c.innerText.split('\n')[0]),cards:document.querySelectorAll('[id^="chatAction_"]').length,txt:document.getElementById('chatMessages')?document.getElementById('chatMessages').innerText:document.body.innerText,ow:document.documentElement.scrollWidth}));
 console.log(JSON.stringify(ui.lbl));ck('7 kartu usulan tampil dengan label baru',ui.cards===7&&ui.lbl.join('|').match(/Bayar Tagihan.*Lunasi Piutang.*Dana Titipan.*Proyek Renovasi.*Item Renovasi.*Stok Masuk/),ui.cards);
 ck('Viewport 390 tanpa overflow horizontal',ui.ow<=390,ui.ow);
 const pr=await p.evaluate(()=>window.__prompts[0]||'');
 ck('Prompt AI memuat tipe baru',/pay_tagihan/.test(pr)&&/pay_piutang/.test(pr)&&/add_titipan/.test(pr)&&/add_stok_cobek/.test(pr)&&/add_renov_item/.test(pr));
 ck('Belum ada yang tersimpan sebelum konfirmasi',(await p.evaluate(()=>D.transactions.length))===s0.n);
 await confirmAll();
 const sum=await p.evaluate(()=>(document.querySelector('[id^="chatActionAll_"]')||{}).innerText||'');
 ck('Ringkasan: 7 tersimpan, 0 gagal',/7 tersimpan/.test(sum)&&!/gagal/.test(sum),sum);
 const cards=await lastCards();console.log(cards.join('\n'));
 const w=await bill(BN);
 ck('Bayar wifi: 1 transaksi baru bertanggal 2026-11-18, nextDue maju',w.n===s0.wifi.n+1&&w.last.date.slice(0,10)==='2026-11-18'&&w.last.amt===135000&&w.nextDue==='2026-12-25',{before:s0.wifi,after:w});
 ck('Dialog bawaan tidak tertinggal terbuka',await p.evaluate(()=>!['confirmModalOverlay','promptModalOverlay'].some(id=>{const e=document.getElementById(id);return e&&e.classList.contains('open');})));
 ck('askConfirm/showPromptModal asli dipulihkan',await p.evaluate(()=>/_queueDialog/.test(String(askConfirm))&&/_queueDialog|prompt\(/.test(String(showPromptModal))));
 const st=await p.evaluate((PID)=>{
  const pi=D.piutang.find(x=>String(x.id)===PID);
  const c=(D.titipanCommitments||[]).find(x=>/UJI Pak Budi/.test(x.ownerName||''));
  const pj=D.renovProjects.find(x=>x.name==='UJI Kamar Tamu');const it=pj&&pj.items[0];
  const bl=D.bills.find(b=>b.name==='UJI Cicilan Cat');
  const pr=D.products.find(x=>x.name==='cobek 21-22cm');
  const stx=D.transactions.find(t=>t.stockProductId===(pr&&pr.id)&&/Stok masuk/.test(t.note||''));
  return{piNilai:pi&&pi.nilai,piLunas:pi&&pi.lunas,piTx:D.transactions.filter(t=>t.talanganPiutangId&&String(t.talanganPiutangId)===String(pi&&pi.id)).length,
   komit:c&&c.principalAmount,owner:!!(typeof OwnerRegistry!=='undefined'&&OwnerRegistry.listAll().some(o=>/UJI Pak Budi/.test(o.name||o.ownerName||''))),
   pj:pj&&{rab:pj.rab,klien:pj.klien,lokasi:pj.lokasi,n:pj.items.length},it:it&&{harga:it.harga,acc:it.accountId,paid:it.paid},
   bl:bl&&{proj:bl.renovProjectLinkId===(pj&&pj.id),item:bl.renovItemLinkId===(it&&it.id)},
   stock:pr&&pr.stock,hb:pr&&pr.hargaBeli,stx:stx&&{amt:stx.amount,cat:stx.category,sub:stx.subcategory,acc:stx.accountId,qty:stx.stockQty}};},PID);
 console.log(JSON.stringify(st));
 ck('Piutang istri: sisa 60.000, belum lunas (pelunasan sebagian)',st.piNilai===60000&&st.piLunas===false,st);
 ck('Dana Titipan: pemilik baru + pokok 3.000.000',st.komit===3000000&&st.owner,st);
 ck('Renovasi: proyek (RAB/klien/lokasi) + item belum dibayar di BRI',st.pj&&st.pj.rab===9000000&&st.pj.klien==='UJI Bu Sari'&&st.pj.lokasi==='Magelang'&&st.pj.n===1&&st.it.harga===750000&&st.it.acc==='acc_bri'&&st.it.paid===false,st);
 ck('Tagihan tertaut proyek + item',st.bl&&st.bl.proj&&st.bl.item,st.bl);
 ck('Stok cobek 21-22cm 1→5, harga beli 16.000, pengeluaran Bisnis/Cobek 64.000 dari Cash',st.stock===5&&st.hb===16000&&st.stx&&st.stx.amt===64000&&st.stx.cat==='Bisnis'&&st.stx.sub==='Cobek'&&st.stx.acc==='acc_cash'&&st.stx.qty===4,st);

 // B. bayar ulang wifi periode yang sama = ditolak, tanpa transaksi baru
 const nB=await p.evaluate(()=>D.transactions.length);
 await ask(blk({type:'pay_tagihan',data:{name:BN}}),'bayar lagi');
 await p.evaluate(()=>document.querySelector('[id^="chatAction_"]:last-of-type [data-action="confirmChatAction"]')?.click());await sleep(1200);
 const cB=(await lastCards()).pop();
 ck('Bayar ulang wifi periode sama ditolak (sudah dibayar) tanpa transaksi baru',/Gagal/.test(cB)&&/sudah dibayar/.test(cB)&&(await p.evaluate(()=>D.transactions.length))===nB,cB);

 // C. lunasi sisa piutang istri penuh
 await ask(blk({type:'pay_piutang',data:{name:'istri'}}),'istri lunas');
 await p.evaluate(()=>[...document.querySelectorAll('[data-action="confirmChatAction"]')].pop().click());await sleep(1000);
 ck('Piutang istri lunas penuh',await p.evaluate(P=>D.piutang.find(x=>String(x.id)===P).lunas===true,PID));

 // D. error: produk/proyek tak dikenal, tanpa efek
 const nD=await p.evaluate(()=>({t:D.transactions.length,p:D.products.map(x=>x.stock).join(),r:D.renovProjects.length}));
 await ask([blk({type:'add_stok_cobek',data:{productName:'ZZZ',qty:2}}),blk({type:'add_renov_item',data:{projectName:'ZZZ',name:'a',harga:5}}),blk({type:'pay_tagihan',data:{name:'ZZZ'}})].join('\n'),'salah semua');
 await confirmAll();
 const sD=await p.evaluate(()=>(document.querySelector('[id^="chatActionAll_"]:last-of-type')||[...document.querySelectorAll('[id^="chatActionAll_"]')].pop()||{}).innerText||'');
 ck('Tiga usulan salah gagal semua tanpa efek',/3 gagal/.test(sD)||/0 tersimpan/.test(sD),sD);
 ck('Data tidak berubah setelah usulan gagal',JSON.stringify(nD)===JSON.stringify(await p.evaluate(()=>({t:D.transactions.length,p:D.products.map(x=>x.stock).join(),r:D.renovProjects.length}))));

 // E. halaman terkait render tanpa error
 for(const pg of ['keuangan','renovasi','laporan']){try{await p.evaluate(g=>showPage(g),pg);await sleep(600);}catch(e){void e;}}
 ck('Tidak ada pageerror selama uji',errs.filter(e=>/pageerror/.test(e)).length===0,errs.filter(e=>/pageerror/.test(e)));
 const bad=res.filter(r=>!r.ok);console.log('\nHASIL: '+(res.length-bad.length)+'/'+res.length+' lulus');
 console.log('Console error non-jaringan:',errs.filter(e=>!/ERR_TUNNEL|net::|Failed to load resource/.test(e)));
 await H.close();process.exit(bad.length?1:0);
})();
