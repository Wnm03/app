const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(process.env.E2E_ROOT||path.join(__dirname,'..'));
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';const f=path.resolve(ROOT,rel);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
const res=[];let cur='';
const ck=(n,ok,d)=>{res.push({d:cur,n,ok:!!ok});console.log(`${ok?'✓':'✗'} [${cur}] ${n}${ok||d===undefined?'':' — '+(typeof d==='string'?d:JSON.stringify(d)).slice(0,220)}`);};
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${srv.address().port}/index.html`;
 const br=await chromium.launch({headless:true});
 const ctx=await br.newContext({viewport:{width:390,height:800},isMobile:true,serviceWorkers:'block'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
 const ev=(f,a)=>p.evaluate(f,a);
 const sleep=ms=>p.waitForTimeout(ms);
 await p.goto(base); await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function');
 await ev(()=>{localStorage.setItem('kw_v4',JSON.stringify(D));localStorage.setItem('kw_setup','1');});
 await p.goto(base); await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');
 // fixture
 await ev(()=>{
  window.askConfirm=async()=>true;window._t=[];const _o=window.toast;window.toast=function(m){window._t.push(String(m));return _o.apply(this,arguments);};
  D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1000000,balance:1000000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}},{id:'a2',name:'Bank',emoji:'🏦',baseBalance:500000,balance:500000,includeInBalance:true,jenis:'bank',ownership:{type:'SELF'}}];
  D.transactions=[];D.bbmLogs=[];D.servisLogs=[];D.cobek=[];D.piutang=[];
  D.vehicles=[{id:'vA',name:'Motor A',emoji:'🏍️'},{id:'vB',name:'Mobil B',emoji:'🚗'}];
  if(typeof curVehicleId!=='undefined')curVehicleId='vA';
  D.products=[{id:'p1',name:'Cobek Batu',stock:10,kategoriId:null,produsenId:null,hargaBeli:20000,hargaJual:35000,hargaReseller:30000,diskonPersen:0},{id:'p2',name:'Ulekan',stock:2,kategoriId:null,produsenId:null,hargaBeli:10000,hargaJual:20000,hargaReseller:0,diskonPersen:0}];
  save();
 });
 const bal=id=>ev(i=>recalcAccBalance(i),id);
 const fillSet=(o)=>ev(o=>{for(const[k,v]of Object.entries(o)){const e=document.getElementById(k);if(!e)throw new Error('no el '+k);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}},o);
 const guard=async(name,fn)=>{cur=name;const before=errs.length;try{await fn();}catch(e){ck('skenario tidak melempar exception',false,e.message);}const ne=errs.slice(before);ck('tanpa pageerror',ne.length===0,ne);};

 // ================= UANG =================
 await guard('UANG',async()=>{
  await ev(()=>showPage('keuangan'));await sleep(1500);
  const b0=await bal('a1');ck('saldo awal Dompet 1.000.000',b0===1000000,b0);
  // pemasukan
  await ev(()=>openTxModal('income'));await sleep(300);
  await fillSet({txAmt:'250000',txAcc:'a1',txCat:'Gaji toko',txNote:'e2e gaji',txDate:new Date().toISOString().slice(0,10)});
  await ev(()=>saveTx());await sleep(400);
  let n=await ev(()=>D.transactions.filter(t=>t.type==='income').length);
  ck('pemasukan tersimpan (1 transaksi)',n===1,n);
  ck('saldo Dompet naik jadi 1.250.000',(await bal('a1'))===1250000,await bal('a1'));
  // pengeluaran
  await ev(()=>openTxModal('expense'));await sleep(300);
  await fillSet({txAmt:'100000',txAcc:'a1',txCat:'Makan',txNote:'e2e makan',txDate:new Date().toISOString().slice(0,10)});
  await ev(()=>saveTx());await sleep(400);
  ck('pengeluaran tersimpan, saldo 1.150.000',(await bal('a1'))===1150000,await bal('a1'));
  // validasi nominal 0
  const cntBefore=await ev(()=>D.transactions.length);
  await ev(()=>openTxModal('expense'));await sleep(300);
  await fillSet({txAmt:'0',txAcc:'a1',txCat:'Makan'});
  await ev(()=>saveTx());await sleep(300);
  ck('nominal 0 ditolak (jumlah transaksi tetap)',(await ev(()=>D.transactions.length))===cntBefore,await ev(()=>D.transactions.length));
  await ev(()=>closeModal('txModal'));
  // transfer
  await ev(()=>openTransferModal());await sleep(300);
  await fillSet({trFrom:'a1',trTo:'a2',trAmt:'150000',trNote:'e2e tf',trDate:new Date().toISOString().slice(0,10)});
  await ev(()=>saveTransfer());await sleep(500);
  ck('transfer: Dompet 1.000.000 & Bank 650.000',(await bal('a1'))===1000000&&(await bal('a2'))===650000,[await bal('a1'),await bal('a2')]);
  const pair=await ev(()=>{const o=D.transactions.find(t=>t.type==='transfer_out'),i=D.transactions.find(t=>t.type==='transfer_in');return !!(o&&i&&o.transferPairId&&o.transferPairId===i.transferPairId);});
  ck('transfer: 2 baris berpasangan transferPairId',pair);
  // transfer akun sama ditolak
  const c2=await ev(()=>D.transactions.length);
  await ev(()=>openTransferModal());await sleep(300);
  await fillSet({trFrom:'a1',trTo:'a1',trAmt:'1000'});
  await ev(()=>saveTransfer());await sleep(300);
  ck('transfer akun sama ditolak',(await ev(()=>D.transactions.length))===c2);
  await ev(()=>closeModal('transferModal'));
  // edit pengeluaran 100k -> 120k
  const id=await ev(()=>D.transactions.find(t=>t.note==='e2e makan').id);
  await ev(i=>editTx(i),id);await sleep(400);
  await fillSet({txAmt:'120000'});
  await ev(()=>saveTx());await sleep(400);
  ck('edit: amount jadi 120000 & saldo Dompet 980.000 (tidak dobel)',(await ev(i=>D.transactions.find(t=>t.id===i).amount,id))===120000&&(await bal('a1'))===980000,[await ev(i=>D.transactions.find(t=>t.id===i).amount,id),await bal('a1')]);
  // hapus
  await ev(i=>delTx(i),id);await sleep(400);
  ck('hapus: transaksi hilang & saldo Dompet 1.100.000',!(await ev(i=>D.transactions.some(t=>t.id===i),id))&&(await bal('a1'))===1100000,await bal('a1'));
  // render list
  await ev(()=>{renderKeuangan();});await sleep(300);
  const rows=await ev(()=>document.querySelectorAll('#allTx .tx-row,#allTx [data-action*="editTx"],#allTx tr,#allTx .tx-item').length);
  ck('daftar transaksi tab Uang terender (>0 baris)',rows>0,rows);
 });

 // ================= SHOP =================
 await guard('SHOP',async()=>{
  await ev(()=>showPage('shop'));await sleep(1500);
  const s0=await ev(()=>D.products.find(x=>x.id==='p1').stock);
  // kasir lunas
  await ev(()=>{Kasir.reset&&Kasir.reset();Kasir.populateAccSelect&&Kasir.populateAccSelect();});
  await ev(()=>{Kasir.addToCart('p1');Kasir.addToCart('p1');Kasir.addToCart('p2');});await sleep(300);
  const cart=await ev(()=>JSON.stringify(Kasir.cart));
  ck('keranjang terisi (p1 x2, p2 x1)',/p1/.test(cart)&&/p2/.test(cart),cart);
  const t0=await ev(()=>D.transactions.length);
  await fillSet({kasirAcc:'a1'});
  await ev(()=>Kasir.checkout());await sleep(800);
  const st=await ev(()=>({p1:D.products.find(x=>x.id==='p1').stock,p2:D.products.find(x=>x.id==='p2').stock,cobek:D.cobek.length,tx:D.transactions.length}));
  ck('checkout lunas: stok p1 10→8, p2 2→1',st.p1===8&&st.p2===1,st);
  ck('checkout lunas: 1 record cobek + transaksi pemasukan',st.cobek===1&&st.tx>t0,st);
  const income=await ev(()=>D.transactions.filter(t=>t.type==='income').slice(-1)[0]);
  ck('nominal pemasukan = 2×35.000+20.000 = 90.000',income&&Number(income.amount)===90000,income&&income.amount);
  // DP + piutang
  await ev(()=>{Kasir.reset();Kasir.addToCart('p1');});
  await fillSet({kasirAcc:'a1',kasirDP:'10000',kasirCustName:'Budi',kasirCustPhone:'0812'});
  await ev(()=>Kasir.checkout());await sleep(800);
  const dp=await ev(()=>({piutang:D.piutang.length,p:D.piutang[0]&&D.piutang[0].amount||D.piutang[0]&&D.piutang[0].sisa||D.piutang[0]&&D.piutang[0].total,stok:D.products.find(x=>x.id==='p1').stock}));
  ck('checkout DP: piutang tercatat & stok p1 jadi 7',dp.piutang===1&&dp.stok===7,dp);
  // stok tidak cukup
  const r=await ev(()=>recordShopSale({items:[{productId:'p2',qty:5,price:20000}],accountId:'a1',date:new Date().toISOString().slice(0,10)}));
  ck('stok tidak cukup ditolak (ok:false)',r&&r.ok===false,r);
  ck('stok p2 tidak berubah setelah penolakan',(await ev(()=>D.products.find(x=>x.id==='p2').stock))===1);
  const r2=await ev(()=>recordShopSale({items:[{productId:'p1',qty:-1,price:1}],accountId:'a1'}));
  ck('qty negatif ditolak',r2&&r2.ok===false,r2);
  // render riwayat
  await ev(()=>{if(typeof setShopTab==='function')setShopTab('riwayat');if(typeof Order!=='undefined'&&Order.render)Order.render();});await sleep(500);
  ck('Riwayat Shop terender',(await ev(()=>document.querySelectorAll('#shopList > *').length))>0,await ev(()=>document.querySelectorAll('#shopList > *').length));
 });

 // ================= CAR NOTES =================
 await guard('CARNOTES-TAB',async()=>{
  await ev(()=>showPage('carnotes'));await sleep(1500);
  for(const t of ['insight','bbm','servis','pajak','jalan']){
   await ev(x=>setCnTab(x,document.querySelector('#page-carnotes .cn-tab')),t);await sleep(500);
   const vis=await ev(x=>{const e=document.getElementById('cnTab-'+x);return !!e&&!e.classList.contains('u-dnone')&&getComputedStyle(e).display!=='none';},t);
   ck(`tab ${t} tampil`,vis);
  }
 });
 await guard('CARNOTES-BBM',async()=>{
  await ev(()=>setCnTab('bbm',document.querySelector('#page-carnotes .cn-tab')));await sleep(400);
  const a0=await bal('a1');
  await ev(()=>openBbmModal());await sleep(400);
  await fillSet({bbmDate:new Date().toISOString().slice(0,10),bbmKm:'10000',bbmLiter:'5',bbmHarga:'10000',bbmCost:'50000',bbmSpbu:'Pertamina',bbmAcc:'a1'});
  await ev(()=>saveBbm());await sleep(600);
  const l=await ev(()=>D.bbmLogs.map(x=>({v:x.vehicleId,km:x.km,cost:x.cost,tx:!!x.txLinkId,id:x.id})));
  ck('BBM tersimpan (1 log, vehicle vA, km 10000)',l.length===1&&l[0].v==='vA'&&l[0].km===10000,l);
  ck('BBM menautkan transaksi & saldo turun 50.000',l[0]&&l[0].tx&&(await bal('a1'))===a0-50000,[a0,await bal('a1')]);
  // edit
  await ev(i=>openBbmModal(i),l[0].id);await sleep(400);
  await fillSet({bbmCost:'60000'});
  await ev(()=>saveBbm());await sleep(600);
  ck('BBM edit: biaya 60.000, saldo turun total 60.000 (tidak dobel)',(await ev(i=>D.bbmLogs.find(x=>x.id===i).cost,l[0].id))===60000&&(await bal('a1'))===a0-60000,[await ev(i=>D.bbmLogs.find(x=>x.id===i).cost,l[0].id),await bal('a1')]);
  // hapus
  await ev(i=>delBbm(i),l[0].id);await sleep(600);
  ck('BBM hapus: log hilang & saldo kembali',(await ev(()=>D.bbmLogs.length))===0&&(await bal('a1'))===a0,[await ev(()=>D.bbmLogs.length),await bal('a1')]);
  const orphan=await ev(()=>D.transactions.filter(t=>t.linkedBbmId||t.bbmLogId).length);
  ck('BBM hapus: tidak ada transaksi yatim',orphan===0,orphan);
  // isolasi kendaraan: log ke vB tidak muncul di vA
  await ev(()=>{curVehicleId='vB';});await ev(()=>openBbmModal());await sleep(300);
  await fillSet({bbmDate:new Date().toISOString().slice(0,10),bbmKm:'500',bbmLiter:'3',bbmHarga:'10000',bbmCost:'30000',bbmAcc:'a1'});
  await ev(()=>saveBbm());await sleep(500);
  const iso=await ev(()=>({vB:D.bbmLogs.filter(x=>x.vehicleId==='vB').length,vA:D.bbmLogs.filter(x=>x.vehicleId==='vA').length}));
  ck('BBM isolasi per kendaraan (vB=1, vA=0)',iso.vB===1&&iso.vA===0,iso);
  await ev(()=>{curVehicleId='vA';});
 });
 await guard('CARNOTES-SERVIS',async()=>{
  await ev(()=>{curVehicleId='vA';});await ev(()=>openBbmModal());await sleep(300);
  await fillSet({bbmDate:new Date().toISOString().slice(0,10),bbmKm:'10000',bbmLiter:'2',bbmHarga:'10000',bbmCost:'20000',bbmAcc:'a1'});
  await ev(()=>saveBbm());await sleep(500);
  await ev(()=>setCnTab('servis',document.querySelector('#page-carnotes .cn-tab')));await sleep(400);
  const a0=await bal('a1');
  await ev(()=>openServisModal?openServisModal():Servis.openModal());await sleep(500);
  await fillSet({servisDate:new Date().toISOString().slice(0,10),servisKm:'9000',servisJobType:'routine',servisItem:'Ganti oli',servisCost:'75000',servisAcc:'a1'});
  await ev(()=>saveServis());await sleep(800);
  const s=await ev(()=>D.servisLogs.map(x=>({v:x.vehicleId,item:x.item||x.name||x.servisItem,cost:x.cost,id:x.id})));
  ck('Servis tersimpan (1 log, vA)',s.length>=1&&s[0].v==='vA',{s,toast:await ev(()=>window._t.slice(-3)),odo:await ev(()=>typeof getVehicleOdometer==='function'?getVehicleOdometer('vA'):null)});
  ck('Servis: saldo turun 75.000',(await bal('a1'))===a0-75000,[a0,await bal('a1')]);
  if(s[0]){await ev(i=>delServis(i),s[0].id);await sleep(800);
   ck('Servis hapus: log hilang & saldo kembali',(await ev(()=>D.servisLogs.length))===0&&(await bal('a1'))===a0,[await ev(()=>D.servisLogs.length),await bal('a1')]);}
 });
 // persistensi
 await guard('PERSISTENSI',async()=>{
  await ev(()=>save());await sleep(800);
  const snap=await ev(()=>({tx:D.transactions.length,cobek:D.cobek.length}));
  await p.reload();await p.waitForFunction(()=>typeof D==='object'&&getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1000);
  const after=await ev(()=>({tx:D.transactions.length,cobek:D.cobek.length}));
  ck('data bertahan setelah reload',after.tx===snap.tx&&after.cobek===snap.cobek,{snap,after});
 });
 const f=res.filter(r=>!r.ok).length;
 console.log(`\nTOTAL ${res.length-f}/${res.length} lulus, ${f} gagal; pageerror total=${errs.length}`);if(errs.length)console.log(errs.slice(0,8));
 await br.close();srv.close();process.exit(f?1:0);
})();
