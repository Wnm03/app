'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadSource}=require('./helpers/loadSource');

function ctxFor(D){
  const calls=[];
  const ctx=loadSource(['modules/home/renovasi.js'],{
    D,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),
    toast:m=>calls.push(m),save:()=>true,closeModal:()=>{},openModal:()=>{},todayStr:()=> '2026-11-14',
    uid:(()=>{let n=0;return()=>`new-${++n}`;})(),
  },['Renov']);
  return {ctx,calls};
}

test('S2767 A: agregasi legacy cash dan cicilan tidak menghitung ganda',()=>{
  const {ctx}=ctxFor({renovProjects:[],transactions:[],accounts:[]});
  const {Renov}=ctx;
  const p={items:[
    {id:1,harga:100,paid:true,txId:'legacy'},
    {id:2,harga:200,paid:false,txId:null},
    {id:3,harga:300,paid:false,payments:[{id:'p1',txId:'t1',amount:100},{id:'p2',txId:'t2',amount:50}]},
    {id:4,harga:400,paid:true,txId:'old',payments:[{id:'p3',txId:'t3',amount:400}]},
  ]};
  assert.equal(ctx._renovItemPaidAmount(p.items[0]),100);
  assert.equal(ctx._renovItemPaidAmount(p.items[2]),150);
  const totals=Renov.totals(p);
  for(const [key,value] of Object.entries({total:1000,paid:650,sisa:350,count:4,paidCount:2,overpaid:0}))assert.equal(totals[key],value,key);
});

test('S2767 A/D4: edit transaksi cicilan hanya mengubah payment, bukan harga item',()=>{
  const it={id:'i1',harga:500,paid:false,payments:[{id:'p1',txId:'t1',amount:200,date:'2026-01-01',accountId:'a1'}]};
  const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[]};
  const {ctx}=ctxFor(D);
  ctx.Renov.onLinkedTxEdited({id:'t1',renovProjectLinkId:'1',renovItemLinkId:'i1',renovPaymentId:'p1',amount:250,date:'2026-02-01',accountId:'a2'});
  assert.equal(it.harga,500);
  assert.equal(it.payments[0].amount,250);
  assert.equal(it.payments[0].date,'2026-02-01');
  assert.equal(it.payments[0].accountId,'a2');
});

test('S2767 A: hapus transaksi cicilan menghapus payment terkait saja',()=>{
  const it={id:'i1',harga:500,paid:false,payments:[{id:'p1',txId:'t1',amount:200},{id:'p2',txId:'t2',amount:100}]};
  const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[]};
  const {ctx}=ctxFor(D);
  ctx.Renov.onLinkedTxDeleted({id:'t1',renovProjectLinkId:1,renovItemLinkId:'i1',renovPaymentId:'p1'});
  assert.deepEqual(it.payments.map(p=>p.id),['p2']);
  assert.equal(ctx.Renov.totals(D.renovProjects[0]).paid,100);
  assert.equal(it.paid,false);
});

test('S2767 D: hapus proyek melepas tautan DP dan pembayaran tanpa menghapus transaksi',async()=>{
  const p={id:1,name:'Renov',items:[{id:'i1',harga:100,paid:false,payments:[{id:'p1',txId:'t1',amount:100}]}]};
  const D={renovProjects:[p],transactions:[
    {id:'t1',type:'expense',renovProjectLinkId:1,renovItemLinkId:'i1',renovPaymentId:'p1'},
    {id:'d1',type:'income',renovDpProjectId:1,renovDpLabel:'DP',renovDpKind:'dp'},
  ],accounts:[]};
  const sot={findById:id=>D.transactions.find(t=>String(t.id)===String(id)),patchMetaById(id,patch){const t=this.findById(id);if(t)Object.keys(patch).forEach(k=>patch[k]===undefined?delete t[k]:t[k]=patch[k]);return t;}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,FinanceTxSOT:sot,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,closeModal:()=>{},openModal:()=>{},askConfirm:async()=>true,Tukang:{releaseEntries:()=>{}}},['Renov']);
  await ctx.Renov.deleteProject(1);
  assert.equal(D.transactions.length,2);
  assert.equal(D.transactions[0].renovItemLinkId,undefined);
  assert.equal(D.transactions[0].renovPaymentId,undefined);
  assert.equal(D.transactions[1].renovDpProjectId,undefined);
});

test('S2767 B: cicil membuat satu transaksi SOT dan satu payment',async()=>{
  const it={id:'i1',name:'Semen',harga:500,paid:false,category:'Material',accountId:'a1'};
  const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[{id:'a1',name:'BRI'}]};
  const els={renovPayAmount:{value:'150'},renovPayDate:{value:'2026-11-14'},renovPayAccount:{value:'a1'},renovPayLabel:{value:'Cicilan 1'},renovPayModal:{innerHTML:''}};
  const document={getElementById:id=>els[id]||null};
  const FinanceTxSOT={create(tx){D.transactions.push(tx);return tx;},patchMetaById(id,patch){const tx=D.transactions.find(x=>String(x.id)===String(id));Object.assign(tx,patch);return tx;},removeById(id){const i=D.transactions.findIndex(x=>String(x.id)===String(id));return i<0?null:D.transactions.splice(i,1)[0];}};
  const {ctx}= {ctx:loadSource(['modules/home/renovasi.js'],{D,document,FinanceTxSOT,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,uid:(()=>{let n=0;return()=>`id${++n}`;})(),todayStr:()=> '2026-11-14',refreshAfterMutation:()=>{},FinanceEventOutbox:{emitOrEnqueue:()=>{}},closeModal:()=>{},openModal:()=>{},askConfirm:async()=>true},['Renov'])};
  ctx.Renov._payProjectId=1;ctx.Renov._payItemId='i1';ctx.Renov._payMode='installment';
  await ctx.Renov.submitItemPayment();
  assert.equal(D.transactions.length,1);assert.equal(D.transactions[0].type,'expense');assert.equal(D.transactions[0].amount,150);
  assert.equal(D.transactions[0].renovPaymentId,it.payments[0].id);assert.equal(it.payments.length,1);assert.equal(it.paid,false);
});

test('S2767 B: Cash lunas legacy tetap memakai paid/txId tanpa payments',async()=>{
  const it={id:'i1',name:'Cat',harga:250,paid:false,category:'Material',accountId:'a1'};
  const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[{id:'a1',name:'BRI'}]};
  const els={renovPayAmount:{value:'250'},renovPayDate:{value:'2026-11-14'},renovPayAccount:{value:'a1'},renovPayLabel:{value:''},renovPayModal:{innerHTML:''}};
  const document={getElementById:id=>els[id]||null};
  const FinanceTxSOT={create(tx){D.transactions.push(tx);return tx;},patchMetaById(id,patch){const tx=D.transactions.find(x=>String(x.id)===String(id));Object.assign(tx,patch);return tx;},removeById(id){const i=D.transactions.findIndex(x=>String(x.id)===String(id));return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,FinanceTxSOT,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,uid:()=> 'cash-tx',todayStr:()=> '2026-11-14',refreshAfterMutation:()=>{},FinanceEventOutbox:{emitOrEnqueue:()=>{}},closeModal:()=>{},openModal:()=>{}},['Renov']);
  ctx.Renov._payProjectId=1;ctx.Renov._payItemId='i1';ctx.Renov._payMode='cash';await ctx.Renov.submitItemPayment();
  assert.equal(it.paid,true);assert.equal(it.txId,'cash-tx');assert.equal(it.payments,undefined);assert.equal(D.transactions.length,1);
});

test('S2767 C: DP disimpan sebagai income tertaut proyek dengan jenis DP/termin',async()=>{
  const p={id:1,name:'Renov',items:[]};const D={renovProjects:[p],transactions:[],accounts:[{id:'bri',name:'BRI'}]};
  const els={renovDpLabel:{value:'Termin 1'},renovDpKind:{value:'termin'},renovDpAmount:{value:'1000'},renovDpDate:{value:'2026-11-14'},renovDpAccount:{value:'bri'},renovDpNote:{value:'Tahap awal'},renovDpOwner:{value:''}};
  const document={getElementById:id=>els[id]||null};const FinanceTxSOT={create(tx){D.transactions.push(tx);return tx;},removeById(id){const i=D.transactions.findIndex(x=>String(x.id)===String(id));return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,FinanceTxSOT,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,uid:()=> 'dp-tx',todayStr:()=> '2026-11-14',getCatsByType:type=>type==='income'?[{name:'Jasa'}]:[],getAccOwnersRaw:()=>({owners:[]}),refreshAfterMutation:()=>{},FinanceEventOutbox:{emitOrEnqueue:()=>{}},closeModal:()=>{},openModal:()=>{}},['Renov']);
  ctx.Renov._dpProjectId=1;await ctx.Renov.submitDpIncome();
  assert.equal(D.transactions.length,1);assert.equal(D.transactions[0].type,'income');assert.equal(D.transactions[0].renovDpProjectId,1);assert.equal(D.transactions[0].renovDpKind,'termin');assert.equal(D.transactions[0].amount,1000);
});

test('S2767 B: save gagal rollback transaksi dan payment',async()=>{
  const it={id:'i1',name:'Semen',harga:500,paid:false,category:'Material',accountId:'a1'};const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[{id:'a1',name:'BRI'}]};
  const els={renovPayAmount:{value:'100'},renovPayDate:{value:'2026-11-14'},renovPayAccount:{value:'a1'},renovPayLabel:{value:'Cicilan'},renovPayModal:{innerHTML:''}};const document={getElementById:id=>els[id]||null};
  const FinanceTxSOT={create(tx){D.transactions.push(tx);return tx;},patchMetaById(id,patch){const tx=D.transactions.find(x=>x.id===id);Object.assign(tx,patch);return tx;},removeById(id){const i=D.transactions.findIndex(x=>x.id===id);return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,FinanceTxSOT,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>false,uid:()=> 'rollback-tx',todayStr:()=> '2026-11-14',refreshAfterMutation:()=>{},closeModal:()=>{},openModal:()=>{}},['Renov']);
  ctx.Renov._payProjectId=1;ctx.Renov._payItemId='i1';ctx.Renov._payMode='installment';await ctx.Renov.submitItemPayment();
  assert.equal(D.transactions.length,0);assert.equal(it.payments,undefined);
});

test('S2767 E: parser CSV mendukung koma, titik-koma, kutip ganda, dan newline dalam field',()=>{
  const {ctx}=ctxFor({renovProjects:[],transactions:[],accounts:[]});
  const comma=ctx.Renov._parseCSV('Nama,Kategori,Harga\n"Pintu, depan","Bahan ""utama""",1500\n"Item\nDua",Material,2500');
  assert.equal(comma.rows[1][0],'Pintu, depan');assert.equal(comma.rows[1][1],'Bahan "utama"');assert.equal(comma.rows[2][0],'Item\nDua');
  const semi=ctx.Renov._parseCSV('Nama;Kategori;Harga\nKeramik;Material;2500');
  assert.equal(semi.delimiter,';');assert.equal(semi.rows[1][2],'2500');
});

test('S2767 E: CSV injection guard melindungi teks, angka negatif tetap numerik',()=>{
  const {ctx}=ctxFor({renovProjects:[],transactions:[],accounts:[]});
  assert.equal(ctx.Renov._csvCell('=1+1'),"\"'=1+1\"");
  assert.equal(ctx.Renov._csvCell(' +CMD'),"\"' +CMD\"");
  assert.equal(ctx.Renov._csvCell(-250),'"-250"');
  assert.equal(ctx.Renov._csvCell('Nama, "A"'),'"Nama, ""A"""');
});

test('S2767 E: parser nominal menerima format angka Indonesia dan desimal titik',()=>{
  const {ctx}=ctxFor({renovProjects:[],transactions:[],accounts:[]});
  assert.equal(ctx.Renov._renovParsePrice('1.500.000'),1500000);
  assert.equal(ctx.Renov._renovParsePrice('1.500,50'),1500.5);
  assert.equal(ctx.Renov._renovParsePrice('1500.50'),1500.5);
  assert.equal(ctx.Renov._renovParsePrice('1,500'),1500);
});

test('S2767 D4: pembayaran melebihi harga setelah edit transaksi tetap lunas dan harga rencana tidak berubah',()=>{
  const it={id:'i1',harga:300,paid:true,payments:[{id:'p1',txId:'t1',amount:350}]};
  const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[]};
  const {ctx}=ctxFor(D);
  ctx.Renov.onLinkedTxEdited({id:'t1',renovProjectLinkId:1,renovItemLinkId:'i1',renovPaymentId:'p1',amount:400,date:'2026-11-14',accountId:'a1'});
  assert.equal(it.harga,300);assert.equal(it.paid,true);assert.equal(ctx.Renov.totals(D.renovProjects[0]).overpaid,100);
});

test('S2767 E: import CSV preview, anti-duplikat, dan konfirmasi menambah rencana tanpa transaksi',async()=>{
  const p={id:1,name:'Renov',items:[{id:'old',name:'Keramik',category:'Material',ukuran:'40x40',harga:1000,paid:false}]};
  const D={renovProjects:[p],transactions:[],accounts:[]};let acceptedText='';let inputRef;
  const document={getElementById:()=>null,body:{appendChild:()=>{}},createElement:()=>{inputRef={style:{},files:[{size:200,text:async()=> 'Nama;Kategori;Ukuran;Harga\nKeramik;Material;40x40;1000\nCat;Material;5 liter;2000\nItem tanpa harga;Material;;0'}],addEventListener:(name,fn)=>{inputRef.handler=fn;},click(){inputRef.changePromise=inputRef.handler();},remove(){}};return inputRef;}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,uid:(()=>{let n=0;return()=>`new${++n}`;})(),todayStr:()=> '2026-11-14',askConfirm:async text=>{acceptedText=text;return true;},closeModal:()=>{},openModal:()=>{}},['Renov']);
  await ctx.Renov.importCSV(1);await inputRef.changePromise;
  assert.match(acceptedText,/1 item valid, 2 baris tidak valid/);assert.equal(p.items.length,2);assert.equal(p.items[1].name,'Cat');assert.equal(p.items[1].paid,false);assert.equal(D.transactions.length,0);
});

test('S2767 E: export PDF memakai ensureJsPDF dan menyimpan dokumen saat library tersedia',async()=>{
  let loaded=false,saved=false;class FakePDF{constructor(){this.internal={pageSize:{getWidth:()=>595}};}setFontSize(){}text(){}addPage(){}save(){saved=true;}}
  const D={renovProjects:[{id:1,name:'Renov',klien:'Klien',rab:1000,items:[{id:'i1',name:'Cat',harga:500,paid:false}]}],transactions:[],accounts:[]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,window:{jspdf:{jsPDF:FakePDF}},ensureJsPDF:async()=>{loaded=true;},sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{}},['Renov']);
  const result=await ctx.Renov.exportPDF(1);assert.equal(loaded,true);assert.equal(saved,true);assert.equal(result,true);
});

test('S2767 UI: modal pembayaran memakai atribut data-action/data-args yang valid tanpa inline handler',()=>{
  const overlay={innerHTML:'',setAttribute(){}};const document={getElementById:id=>id==='renovPayModal'?overlay:null};
  const D={renovProjects:[{id:1,name:'Renov',items:[{id:'i1',name:'Cat',harga:100,paid:false}]}],transactions:[],accounts:[]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),todayStr:()=> '2026-11-14'},['Renov']);
  ctx.Renov._payProjectId=1;ctx.Renov._payItemId='i1';ctx.Renov._renderPayModal();
  assert.match(overlay.innerHTML,/data-action="Renov\.setPayMode" data-args='\["cash"\]'/);
  assert.match(overlay.innerHTML,/data-action="closeModal" data-args='\["renovPayModal"\]'/);
  assert.doesNotMatch(overlay.innerHTML,/onclick\s*=/i);
});

test('S2767 6.1: RAB negatif ditolak, RAB dan klien disimpan di proyek',()=>{
  const p={id:'proj1',name:'Renov',catatan:'Catatan',klien:'Klien',rab:2500,createdAt:'2026-11-14',items:[]};
  const D={renovProjects:[],transactions:[],accounts:[]};
  const els={renovProjName:{value:'Renov Dapur'},renovProjNote:{value:'Pekerjaan dapur'},renovProjClient:{value:'Budi'},renovProjRab:{value:'25000000'}};
  const document={getElementById:id=>els[id]||null};const messages=[];
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:m=>messages.push(m),save:()=>true,uid:()=> 'proj-new',todayStr:()=> '2026-11-14',closeModal:()=>{},openModal:()=>{}},['Renov']);
  ctx.Renov.saveProject();assert.equal(D.renovProjects.length,1);assert.equal(D.renovProjects[0].rab,25000000);assert.equal(D.renovProjects[0].klien,'Budi');
  D.renovProjects=[];els.renovProjRab.value='-1';ctx.Renov.saveProject();assert.equal(D.renovProjects.length,0);assert.ok(messages.some(m=>String(m).includes('RAB')));
});

test('S2767 C: kategori income kosong tidak membuat DP',async()=>{
  const D={renovProjects:[{id:1,name:'Renov',items:[]}],transactions:[],accounts:[{id:'a1'}]};const messages=[];
  const els={renovDpLabel:{value:'DP'},renovDpKind:{value:'dp'},renovDpAmount:{value:'100'},renovDpDate:{value:'2026-11-14'},renovDpAccount:{value:'a1'},renovDpNote:{value:''},renovDpOwner:{value:''}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document:{getElementById:id=>els[id]||null},FinanceTxSOT:{create:tx=>D.transactions.push(tx)},sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:m=>messages.push(m),save:()=>true,uid:()=> 'dp',todayStr:()=> '2026-11-14',getCatsByType:()=>[],getAccOwnersRaw:()=>({owners:[]})},['Renov']);
  ctx.Renov._dpProjectId=1;await ctx.Renov.submitDpIncome();assert.equal(D.transactions.length,0);assert.ok(messages.some(m=>/kategori income/i.test(String(m))));
});

test('S2767 C: akun multi-owner wajib memilih deductionOwnerId yang benar',async()=>{
  const D={renovProjects:[{id:1,name:'Renov',items:[]}],transactions:[],accounts:[{id:'pool',name:'Dana Titipan'}]};const messages=[];
  const els={renovDpLabel:{value:'Termin 2'},renovDpKind:{value:'termin'},renovDpAmount:{value:'500'},renovDpDate:{value:'2026-11-14'},renovDpAccount:{value:'pool'},renovDpNote:{value:''},renovDpOwner:{value:''}};
  const owners=[{ownerId:'owner-a',ownerName:'Pemilik A'},{ownerId:'owner-b',ownerName:'Pemilik B'}];const sot={create(tx){D.transactions.push(tx);return tx;},removeById(id){const i=D.transactions.findIndex(t=>t.id===id);return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document:{getElementById:id=>els[id]||null},FinanceTxSOT:sot,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:m=>messages.push(m),save:()=>true,uid:()=> 'dp-owner',todayStr:()=> '2026-11-14',getCatsByType:()=>[{name:'Jasa'}],getAccOwnersRaw:()=>({owners}),refreshAfterMutation:()=>{},FinanceEventOutbox:{emitOrEnqueue:()=>{}},closeModal:()=>{}},['Renov']);
  ctx.Renov._dpProjectId=1;await ctx.Renov.submitDpIncome();assert.equal(D.transactions.length,0);assert.ok(messages.some(m=>String(m).includes('Pilih pemilik')));
  els.renovDpOwner.value='owner-b';await ctx.Renov.submitDpIncome();assert.equal(D.transactions.length,1);assert.equal(D.transactions[0].deductionOwnerId,'owner-b');
});

test('S2767 E: export CSV ber-BOM, terisolasi per proyek, dan melindungi formula teks',()=>{
  let downloaded=false,blobText='';class FakeBlob{constructor(parts,opts){blobText=parts.join('');this.type=opts.type;}}
  const anchor={click(){downloaded=true;},remove(){}};const document={createElement:()=>anchor,body:{appendChild:()=>{}}};
  const D={renovProjects:[{id:1,name:'Renov',klien:'=1+1',rab:1000,items:[{id:'i1',name:'Cat',category:'Material',harga:500,paid:false}]},{id:2,name:'Rahasia',items:[{id:'x',name:'Tidak boleh ikut',harga:999}]}],transactions:[{id:'dp1',type:'income',amount:200,renovDpProjectId:1,renovDpKind:'dp',renovDpLabel:'DP'}],accounts:[]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document,Blob:FakeBlob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{}},['Renov']);
  const csv=ctx.Renov.exportCSV(1);assert.equal(csv.charCodeAt(0),0xFEFF);assert.equal(downloaded,true);assert.match(blobText,/\'=1\+1/);assert.match(blobText,/DP/);assert.doesNotMatch(blobText,/Rahasia|Tidak boleh ikut/);
});

test('S2767.2: PDF memuat realisasi kategori dan penanda Nombok dengan guard halaman',async()=>{
  const calls=[];class FakePDF{constructor(){this.internal={pageSize:{getWidth:()=>595}};}setFontSize(){}text(...args){calls.push(args);}addPage(){calls.push(['PAGE']);}save(){calls.push(['SAVE']);}}
  const D={renovProjects:[{id:1,name:'Renov',rab:100,items:[{id:'a',name:'Semen',category:'Material',harga:200,paid:false,payments:[{id:'p',amount:150}]}]}],transactions:[{id:'dp',type:'income',amount:50,renovDpProjectId:1}],accounts:[]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,window:{jspdf:{jsPDF:FakePDF}},ensureJsPDF:async()=>{},sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{}},['Renov']);
  assert.equal(await ctx.Renov.exportPDF(1),true);
  const rendered=calls.map(c=>c.join(' ')).join('\n');
  assert.match(rendered,/NOMBOK/);assert.match(rendered,/Material/);assert.match(rendered,/Realisasi/);assert.ok(calls.some(c=>c[0]==='SAVE'));
});

test('S2767.2: export CSV menyertakan catatan DP/termin',()=>{
  const D={renovProjects:[{id:1,name:'Renov',items:[]}],transactions:[{id:'dp1',type:'income',amount:500,date:'2026-11-14',accountId:'a1',note:'Tahap pondasi',renovDpProjectId:1,renovDpKind:'dp',renovDpLabel:'DP awal'}],accounts:[{id:'a1',name:'BRI'}]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){} }},URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:function(){},sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{}},['Renov']);
  const csv=ctx.Renov.exportCSV(1);assert.match(csv,/Catatan/);assert.match(csv,/Tahap pondasi/);
});

test('S2767.2: deleteDpIncome aman saat FinanceTxSOT tidak tersedia',async()=>{
  const {ctx,calls}=ctxFor({renovProjects:[{id:1,items:[]}],transactions:[],accounts:[]});
  await assert.doesNotReject(()=>ctx.Renov.deleteDpIncome(1,'missing'));
  assert.ok(Array.isArray(calls));
});

test('S2767.2: multi-termin tersimpan sebagai dua income tertaut terpisah',async()=>{
  const p={id:1,name:'Renov',items:[]};const D={renovProjects:[p],transactions:[],accounts:[{id:'bri',name:'BRI'}]};let seq=0;
  const els={renovDpLabel:{value:'Termin'},renovDpKind:{value:'termin'},renovDpAmount:{value:'100'},renovDpDate:{value:'2026-11-14'},renovDpAccount:{value:'bri'},renovDpNote:{value:''},renovDpOwner:{value:''}};
  const FinanceTxSOT={create(tx){D.transactions.push(tx);return tx;},removeById(id){const i=D.transactions.findIndex(t=>t.id===id);return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,document:{getElementById:id=>els[id]||null},FinanceTxSOT,sameId:(a,b)=>String(a)===String(b),escapeHtml:s=>String(s),fmt:n=>String(n),fmtFull:n=>String(n),toast:()=>{},save:()=>true,uid:()=>`term-${++seq}`,todayStr:()=> '2026-11-14',getCatsByType:()=>[{name:'Jasa'}],getAccOwnersRaw:()=>({owners:[]}),refreshAfterMutation:()=>{},FinanceEventOutbox:{emitOrEnqueue:()=>{}},closeModal:()=>{}},['Renov']);
  ctx.Renov._dpProjectId=1;await ctx.Renov.submitDpIncome();await ctx.Renov.submitDpIncome();
  assert.equal(D.transactions.length,2);assert.deepEqual(D.transactions.map(t=>t.id),['term-1','term-2']);assert.ok(D.transactions.every(t=>t.renovDpKind==='termin'));
});

test('S2767.2: guard in-flight mencegah submit pembayaran ganda',async()=>{
  const it={id:'i',name:'Cat',harga:100,paid:false};const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[]};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,toast:()=>{}},['Renov']);ctx.Renov._paymentInFlight=true;
  await ctx.Renov.submitItemPayment();assert.equal(D.transactions.length,0);assert.equal(it.payments,undefined);
});

test('S2767.2: rollback hapus pembayaran memulihkan urutan payments dan flag paid',async()=>{
  const p1={id:'p1',txId:'t1',amount:100},p2={id:'p2',txId:'t2',amount:100};const it={id:'i',name:'Cat',harga:200,paid:true,payments:[p1,p2]};const D={renovProjects:[{id:1,name:'Renov',items:[it]}],transactions:[],accounts:[]};
  const FinanceTxSOT={findById:()=>null,removeById:()=>({id:'t1'}),create:()=>{}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,FinanceTxSOT,askConfirm:async()=>true,save:()=>false,toast:()=>{},fmtFull:n=>String(n),sameId:(a,b)=>String(a)===String(b)},['Renov']);
  await ctx.Renov.deleteItemPayment(1,'i','p1');assert.deepEqual(it.payments.map(x=>x.id),['p1','p2']);assert.equal(it.paid,true);
});

test('S2767.2: hapus item menjalankan cascade dan menghapus semua transaksi cicilan',async()=>{
  const it={id:'i1',name:'Semen',harga:200,paid:false,payments:[{id:'p1',txId:'t1',amount:100},{id:'p2',txId:'t2',amount:100}]};const p={id:1,name:'Renov',items:[it]};
  const D={renovProjects:[p],transactions:[{id:'t1'},{id:'t2'}],accounts:[]};const cascades=[];
  const FinanceTxSOT={findById:id=>D.transactions.find(t=>t.id===id),removeById(id){const i=D.transactions.findIndex(t=>t.id===id);return i<0?null:D.transactions.splice(i,1)[0];}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D,FinanceTxSOT,escapeHtml:s=>String(s),askConfirm:async()=>true,runTxDeleteCascades:(tx,opts)=>cascades.push([tx.id,opts.skipRenovCascade]),Tukang:{releaseEntries(){}},save:()=>true,refreshAfterMutation:()=>{},toast:()=>{},sameId:(a,b)=>String(a)===String(b)},['Renov']);
  ctx.Renov.render=()=>{};ctx.Renov.renderDetail=()=>{};await ctx.Renov.deleteItem(1,'i1');
  assert.equal(p.items.length,0);assert.equal(D.transactions.length,0);assert.deepEqual(cascades,[['t1',true],['t2',true]]);
});

test('S2767.2: hook edit dan hapus DP meminta render ulang proyeksi',()=>{
  const {ctx}=ctxFor({renovProjects:[{id:1,items:[]}],transactions:[],accounts:[]});let renders=0,details=0;
  ctx.Renov.curId=1;ctx.Renov.render=()=>renders++;ctx.Renov.renderDetail=()=>details++;
  ctx.Renov.onDpTxEdited();ctx.Renov.onDpTxDeleted();assert.equal(renders,2);assert.equal(details,2);
});

test('S2767.2: dialog import CSV menghapus input saat pengguna membatalkan pemilihan',async()=>{
  let cancel,removed=false;const input={style:{},addEventListener(name,fn){if(name==='cancel')cancel=fn;},click(){},remove(){removed=true;}};
  const ctx=loadSource(['modules/home/renovasi.js'],{D:{renovProjects:[{id:1,name:'Renov',items:[]}]},document:{createElement:()=>input,body:{appendChild(){}}},sameId:(a,b)=>String(a)===String(b),toast:()=>{}},['Renov']);
  await ctx.Renov.importCSV(1);assert.equal(typeof cancel,'function');cancel();assert.equal(removed,true);
});
