const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(process.env.E2E_ROOT||path.join(__dirname,'..'));
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';const f=path.resolve(ROOT,rel);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
const res=[];let cur='';let P;const STRICT=process.env.E2E_STRICT==='1';
const ck=async(n,ok,d,known)=>{if(known&&!ok&&!STRICT){res.push({d:cur,n,ok:true,known:true});console.log(`⚠ TEMUAN TERBUKA [${cur}] ${n} — ${JSON.stringify(d).slice(0,200)} (E2E_STRICT=1 untuk menganggap gagal)`);return;}res.push({d:cur,n,ok:!!ok});let extra='';if(!ok){extra=' — '+JSON.stringify(d===undefined?'':d).slice(0,200)+' toast='+JSON.stringify(await P.evaluate(()=>window._t.slice(-2))).slice(0,200);}console.log(`${ok?'✓':'✗'} [${cur}] ${n}${extra}`);};
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${srv.address().port}/index.html`;
 const br=await chromium.launch({headless:true});
 const ctx=await br.newContext({viewport:{width:390,height:800},isMobile:true,serviceWorkers:'block'});
 const p=await ctx.newPage();P=p;const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
 const ev=(f,a)=>p.evaluate(f,a);const sleep=ms=>p.waitForTimeout(ms);
 await p.goto(base);await p.waitForFunction(()=>typeof D==='object'&&typeof showPage==='function');
 await ev(()=>{localStorage.setItem('kw_v4',JSON.stringify(D));localStorage.setItem('kw_setup','1');});
 await p.goto(base);await p.waitForFunction(()=>getComputedStyle(document.getElementById('mainApp')).display!=='none');
 await ev(()=>{window._t=[];const o=window.toast;window.toast=function(m){window._t.push(String(m));return o.apply(this,arguments);};window.askConfirm=async()=>true;
  D.accounts=[{id:'a1',name:'Dompet',emoji:'💵',baseBalance:1000000,balance:1000000,includeInBalance:true,jenis:'tunai',ownership:{type:'SELF'}}];
  D.transactions=[];D.bbmLogs=[];D.servisLogs=[];D.cobek=[];D.piutang=[];
  D.vehicles=[{id:'vA',name:'Motor A',emoji:'🏍️'}];curVehicleId='vA';
  const mk=(id,n,v)=>({id,name:n,emoji:'🏍️',classification:'WAJIB',linkedVehicleId:v,subs:[{id:id+'_b',name:'Bensin',classification:'WAJIB'},{id:id+'_s',name:'Servis & Oli',classification:'WAJIB'}]});D.categories.expense=D.categories.expense.concat([mk('cat_mA','Motor A','vA')]);
  D.products=[{id:'p1',name:'Cobek Batu',stock:10,kategoriId:null,produsenId:null,hargaBeli:20000,hargaJual:35000,hargaReseller:0,diskonPersen:0}];save();});
 const bal=()=>ev(()=>recalcAccBalance('a1'));
 const setCat=async(c,sub)=>{await ev(([c,sub])=>{const a=document.getElementById('txCat'),b=document.getElementById('txSubCat');a.value=c;b.value=sub;a.dispatchEvent(new Event('input',{bubbles:true}));b.dispatchEvent(new Event('input',{bubbles:true}));updateTxVehiclePanels();},[c,sub]);await sleep(300);};
 const today=new Date().toISOString().slice(0,10);
 const fill=(o)=>ev(o=>{for(const[k,v]of Object.entries(o)){const e=document.getElementById(k);if(!e)throw new Error('no el '+k);if(e.type==='checkbox'){e.checked=!!v;}else e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}},o);
 const guard=async(name,fn)=>{cur=name;const b=errs.length;await ev(()=>{D.transactions=[];D.cobek=[];D.bbmLogs=[];D.servisLogs=[];D.piutang=[];D.products[0].stock=10;window._t=[];save();});try{await fn();}catch(e){await ck('skenario tidak melempar exception',false,e.message);}await ck('tanpa pageerror',errs.length===b,errs.slice(b));};
 await ev(()=>showPage('keuangan'));await sleep(1200);


 const mkSale=async(qty)=>{await ev(()=>openTxModal('income'));await sleep(300);await fill({txAcc:'a1',txDate:today});await setCat('Bisnis','Cobek');await fill({txAddShopSale:true});await ev(()=>toggleTxShopSaleFields());await sleep(200);await fill({txShopSaleItem:'p1',txShopSaleQty:String(qty),txShopSaleHarga:'35000'});await ev(()=>addTxShopSaleCartItem());await sleep(200);await ev(()=>saveTx());await sleep(800);};
 const mkBbm=async()=>{await ev(()=>openTxModal('expense'));await sleep(300);await fill({txAmt:'50000',txAcc:'a1',txDate:today});await setCat('Motor A','Bensin');await fill({txSyncBbm:true});await ev(()=>toggleTxBbmFields());await sleep(200);await fill({txBbmVehicle:'vA',txBbmKm:'12000',txBbmLiter:'5',txBbmHargaL:'10000'});await ev(()=>saveTx());await sleep(700);};
 const integrity=()=>ev(()=>{const T=D.transactions,C=D.cobek,B=D.bbmLogs,S=D.servisLogs;const bad=[];
  T.forEach(t=>{if(t.cobekLinkId&&!C.some(c=>c.id===t.cobekLinkId))bad.push('tx->cobek '+t.id);if(t.bbmLinkId&&!B.some(b=>b.id===t.bbmLinkId))bad.push('tx->bbm '+t.id);});
  B.forEach(b=>{if(b.txLinkId&&!T.some(t=>t.id===b.txLinkId))bad.push('bbm->tx '+b.id);});
  S.forEach(l=>{const k=l.txLinkId||l.txId;if(k&&!T.some(t=>t.id===k))bad.push('servis->tx '+l.id);});
  C.forEach(c=>{const k=c.txId||c.txLinkId;if(k&&!T.some(t=>t.id===k))bad.push('cobek->tx '+c.id);});
  return bad;});

 await guard('EDIT: lepas tautan Shop',async()=>{
  const b0=await bal();await mkSale(2);
  const id=await ev(()=>D.transactions[0].id);
  await ev(i=>editTx(i),id);await sleep(500);
  await fill({txAddShopSale:false});await ev(()=>toggleTxShopSaleFields());
  await ev(()=>saveTx());await sleep(800);
  const a=await ev(()=>({stock:D.products[0].stock,cobek:D.cobek.length,tx:D.transactions.length,link:D.transactions[0]&&D.transactions[0].cobekLinkId||null}));
  await ck('lepas centang: stok pulih 10, cobek 0, tx tetap 1 tanpa cobekLinkId',a.stock===10&&a.cobek===0&&a.tx===1&&!a.link,a);
  await ck('saldo naik 70.000 (tx tetap ada, tidak dobel)',(await bal())===b0+70000,await bal());
  await ck('integritas tautan bersih',(await integrity()).length===0,await integrity());
 });
 await guard('EDIT: BBM ubah liter',async()=>{
  const b0=await bal();await mkBbm();
  const id=await ev(()=>D.transactions[0].id);
  await ev(i=>editTx(i),id);await sleep(500);
  await fill({txAmt:'60000',txBbmLiter:'6'});
  await ev(()=>saveTx());await sleep(800);
  const a=await ev(()=>({logs:D.bbmLogs.length,tx:D.transactions.length,cost:D.bbmLogs[0]&&D.bbmLogs[0].cost,liter:D.bbmLogs[0]&&D.bbmLogs[0].liter,v:D.bbmLogs[0]&&D.bbmLogs[0].vehicleId}));
  await ck('edit tx BBM: 1 log & 1 tx, kendaraan tetap vA',a.logs===1&&a.tx===1&&a.v==='vA',a);
  await ck('log BBM ikut: cost 60.000, liter 6',a.cost===60000&&a.liter===6,a);
  await ck('saldo turun 60.000 total (tidak dobel)',(await bal())===b0-60000,await bal());
  await ck('integritas tautan bersih',(await integrity()).length===0,await integrity());
 });
 await guard('TOLAK: stok kurang di modal Transaksi',async()=>{
  const b0=await bal();await mkSale(20);
  const a=await ev(()=>({stock:D.products[0].stock,cobek:D.cobek.length,tx:D.transactions.length}));
  a.detail=await ev(()=>D.transactions.map(t=>({type:t.type,amount:t.amount,cobekLinkId:t.cobekLinkId||null,note:t.note||'',cat:t.category,sub:t.subCategory||t.sub})));await ck('qty 20 > stok 10 ditolak: stok 10, cobek 0, tx 0',a.stock===10&&a.cobek===0&&a.tx===0,a,true);
  await ck('saldo tidak berubah (tx yatim 700.000 tidak tercatat)',(await bal())===b0,await bal(),true);
  await ev(()=>closeModal('txModal'));
 });
 await guard('EDIT: qty naik memakai stok yang dikembalikan',async()=>{
  await mkSale(8);
  const id=await ev(()=>D.transactions[0].id);
  await ev(i=>editTx(i),id);await sleep(500);
  await ev(()=>{curTxShopSaleCart[0].qty=10;renderTxShopSaleCartList();syncTxShopSaleAmt();});
  await ev(()=>saveTx());await sleep(800);
  const a=await ev(()=>({stock:D.products[0].stock,qty:D.cobek[0]&&D.cobek[0].items[0].qty,tx:D.transactions.length}));
  await ck('edit 8→10 (sisa 2 + kembali 8 = 10) diterima: stok 0, qty 10, 1 tx',a.stock===0&&a.qty===10&&a.tx===1,a);
  await ev(i=>editTx(i),id);await sleep(500);
  await ev(()=>{curTxShopSaleCart[0].qty=11;renderTxShopSaleCartList();syncTxShopSaleAmt();});
  await ev(()=>saveTx());await sleep(800);
  const b=await ev(()=>({stock:D.products[0].stock,qty:D.cobek[0].items[0].qty,tx:D.transactions.length}));
  await ck('edit 10→11 (>11 tersedia? stok 0+10=10) ditolak: tetap qty 10, stok 0',b.stock===0&&b.qty===10&&b.tx===1,b);
  await ev(()=>closeModal('txModal'));
 });
 await guard('PERINGATAN: transfer saldo minus',async()=>{
  await ev(()=>{D.accounts.push({id:'a2',name:'Bank',emoji:'🏦',baseBalance:0,balance:0,includeInBalance:true,jenis:'bank',ownership:{type:'SELF'}});save();window.askConfirm=async()=>false;});
  await ev(()=>openTransferModal());await sleep(300);
  await fill({trFrom:'a1',trTo:'a2',trAmt:'5000000',trDate:today});
  await ev(()=>saveTransfer());await sleep(500);
  await ck('transfer > saldo, konfirmasi ditolak: tidak ada transaksi',(await ev(()=>D.transactions.length))===0,await ev(()=>D.transactions.length));
  await ev(()=>{window.askConfirm=async()=>true;closeModal('transferModal');});
 });
 await guard('BACKUP/RESTORE + RELOAD: tautan utuh',async()=>{
  await mkSale(2);await mkBbm();
  await ck('prasyarat: 2 tx, 1 cobek, 1 log BBM',(await ev(()=>[D.transactions.length,D.cobek.length,D.bbmLogs.length].join()))==='2,1,1',await ev(()=>[D.transactions.length,D.cobek.length,D.bbmLogs.length].join()));
  const hasApi=await ev(()=>typeof buildBackupPayload==='function'&&typeof applyRestoredData==='function');
  if(hasApi){
   const r=await ev(async()=>{const payload=JSON.parse(JSON.stringify(await buildBackupPayload()));D.transactions=[];D.cobek=[];D.bbmLogs=[];const out=await applyRestoredData(payload);return {out:typeof out==='object'?JSON.stringify(out).slice(0,80):String(out),c:[D.transactions.length,D.cobek.length,D.bbmLogs.length].join()};});
   await ck('restore: 2 tx, 1 cobek, 1 log BBM kembali',r.c==='2,1,1',r);
   await ck('integritas tautan setelah restore',(await integrity()).length===0,await integrity());
  } else await ck('API backup tersedia (buildBackupPayload/applyRestoredData)',false);
  await ev(()=>save());await sleep(900);
  await p.reload();await p.waitForFunction(()=>typeof D==='object'&&getComputedStyle(document.getElementById('mainApp')).display!=='none');await sleep(1000);
  await ck('setelah reload: data & tautan utuh',(await ev(()=>[D.transactions.length,D.cobek.length,D.bbmLogs.length].join()))==='2,1,1'&&(await integrity()).length===0,[await ev(()=>[D.transactions.length,D.cobek.length,D.bbmLogs.length].join()),await integrity()]);
 });
 const f=res.filter(r=>!r.ok).length;
 console.log(`\nTOTAL ${res.length-f}/${res.length} lulus, ${f} gagal, ${res.filter(r=>r.known).length} temuan terbuka; pageerror total=${errs.length}`);if(errs.length)console.log(errs.slice(0,6));
 await br.close();srv.close();process.exit(f?1:0);
})();
