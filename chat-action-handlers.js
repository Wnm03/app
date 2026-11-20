// chat-action-handlers.js — Aksi AI Chat/RefAI: label & handler eksekusi usulan aksi dari balasan AI (blok [[ACTION]]).
// Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 7 restrukturisasi folder — file lama SELESAI dihapus total, lihat docs/FILE-MAP.md & RENCANA-SESI.md). Fase 1 restrukturisasi (pecah 3 god-file) SELESAI di sesi ini.
// Isi: MODULE_FEATURES_VERSION (konstanta versi, dicek sinkron oleh diagnostik-versi.js) + CHAT_ACTION_LABELS (label tombol usul per tipe aksi) + CHAT_ACTION_HANDLERS (eksekusi nyata tiap tipe aksi ke D.*, dipanggil dari chat-action.js via chatActionInnerHTML/extractChatAction) + CHAT_ACTION_EDIT_FIELDS (skema field utk form edit usulan sebelum dieksekusi).
// PENTING: dimuat di GROUP_A build.js, tepat di posisi lama features-budget-laporan-carnotes-pelanggan.js (setelah car-notes.js, sebelum edukasi-dana.js) — urutan load antar file GROUP_A jangan diubah sembarangan.

const MODULE_FEATURES_VERSION='s2854-chat-aksi-bayar-lunasi-titipan-renov-stok-2903';
// S2853 — helper resolusi nama -> id untuk aksi chat. Nama yang DISEBUT tapi tidak dikenali/ambigu = error (bukan diam-diam jatuh ke akun pertama).
function _chatResolveAccountId(name){
const n=String(name||'').trim().toLowerCase();
if(!n)return D.accounts[0]?.id||'';
const hit=D.accounts.filter(a=>a&&a.name&&a.name.trim().toLowerCase()===n);
const part=hit.length?hit:D.accounts.filter(a=>a&&a.name&&a.name.toLowerCase().includes(n));
if(part.length===1)return part[0].id;
if(part.length>1)throw new Error('Nama akun "'+name+'" ambigu: '+part.map(a=>a.name).join(', '));
throw new Error('Akun "'+name+'" tidak dikenali. Akun yang ada: '+D.accounts.map(a=>a.name).join(', '));
}
function _chatResolveOwnerId(name){
const n=String(name||'').trim().toLowerCase();
if(!n||/^(self|milik sendiri|pribadi)$/.test(n))return '';
const list=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.listExistingOwners==='function')?DanaTitipanPortfolioAPI.listExistingOwners():[];
const exact=list.filter(o=>String(o.ownerName||'').trim().toLowerCase()===n);
const part=exact.length?exact:list.filter(o=>String(o.ownerName||'').toLowerCase().includes(n));
if(part.length===1)return String(part[0].ownerId);
if(part.length>1)throw new Error('Nama pemilik "'+name+'" ambigu: '+part.map(o=>o.ownerName).join(', '));
throw new Error('Pemilik titipan "'+name+'" tidak dikenali. Yang ada: '+(list.map(o=>o.ownerName).join(', ')||'-'));
}
function _chatOwnerName(ownerId){
const list=(typeof DanaTitipanPortfolioAPI!=='undefined'&&typeof DanaTitipanPortfolioAPI.listExistingOwners==='function')?DanaTitipanPortfolioAPI.listExistingOwners():[];
const o=list.find(x=>String(x.ownerId)===String(ownerId));
return o?o.ownerName:'pemilik';
}
// Pemilik punya porsi di akun sumber = potong porsi (deductionOwnerId saja); selain itu = talangan (pola S2848 billTalanganPayMeta).
function _chatOwnerTxMeta(ownerId,accountId){
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accountId):[];
if(owners.some(o=>String(o.ownerId)===String(ownerId)))return{deductionOwnerId:String(ownerId)};
return{titipanLinkId:String(ownerId),titipanTalangan:true,deductionOwnerId:String(ownerId)};
}
function _chatDateOrEmpty(v){return(v&&/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!isNaN(new Date(v).getTime()))?String(v):'';}
function _chatDateOrToday(v){return _chatDateOrEmpty(v)||todayStr();}
// S2854 — helper umum aksi baru (pelunasan/bayar, Dana Titipan, Renovasi, stok Cobek).
function _chatPickByName(list,getName,name,label,describe){
const n=String(name||'').trim().toLowerCase();
if(!n)throw new Error(label+' wajib disebut namanya');
const nm=x=>String(getName(x)||'').trim().toLowerCase();
const exact=list.filter(x=>nm(x)===n);
const hit=exact.length?exact:list.filter(x=>nm(x).includes(n));
if(hit.length===1)return hit[0];
const show=describe||getName;
if(hit.length>1)throw new Error(label+' "'+name+'" ambigu: '+hit.map(show).join(', '));
throw new Error(label+' "'+name+'" tidak ditemukan');
}
let _chatAutoDialogBusy=false;
// Menjalankan fn (mis. markBillPaid) dengan dialog UI dijawab otomatis dari parameter AI. Dialog tak terduga DIBATALKAN dan dilaporkan (return daftar teksnya),
// jadi logika pembayaran asli tidak diduplikasi. Dialog global dipulihkan di finally; satu eksekusi pada satu waktu.
async function _chatWithAutoDialogs(promptAnswers,fn){
if(_chatAutoDialogBusy)throw new Error('Masih memproses aksi lain, ulangi sebentar lagi');
_chatAutoDialogBusy=true;
const g=typeof globalThis!=='undefined'?globalThis:window;
const keys=['askConfirm','showPromptModal','showChoiceModal','showAlertModal'];
const had={},saved={},blocked=[];
keys.forEach(k=>{had[k]=Object.prototype.hasOwnProperty.call(g,k);saved[k]=g[k];});
const brief=s=>String(s==null?'':s).replace(/&quot;/g,'"').replace(/&amp;/g,'&').slice(0,200);
g.askConfirm=async msg=>{blocked.push(brief(msg));return false;};
g.showChoiceModal=async o=>{blocked.push(brief(o&&(o.message||o.title)||'pilihan'));return null;};
g.showAlertModal=async()=>true;
g.showPromptModal=async o=>{const t=String((o&&o.title)||'');const a=promptAnswers&&promptAnswers[t];if(a!==undefined)return String(a);blocked.push(brief(t||(o&&o.message)||'isian'));return null;};
try{await fn();}finally{keys.forEach(k=>{if(had[k])g[k]=saved[k];else delete g[k];});_chatAutoDialogBusy=false;}
return blocked;
}
function _chatRefreshFinance(){
try{if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();if(typeof hitungZakatMaal==='function')hitungZakatMaal();}catch(e){void e;}
}
const CHAT_ACTION_LABELS={add_transaksi:'💸 Usul: Tambah Transaksi',add_tagihan:'🧾 Usul: Tambah Tagihan/Cicilan',add_servis:'🔧 Usul: Catat Servis Kendaraan',add_target:'🎯 Usul: Tambah Target Tabungan',add_catatan_anak:'👶 Usul: Catat soal Anak',add_wishlist:'📋 Usul: Tambah ke Prioritas Belanja',add_piutang:'🤝 Usul: Catat Piutang (uang dipinjamkan)',add_utang:'💳 Usul: Catat Utang (uang dipinjam)',pay_tagihan:'✅ Usul: Bayar Tagihan/Cicilan',pay_piutang:'🤝 Usul: Lunasi Piutang (uang diterima)',add_titipan:'🏦 Usul: Dana Titipan (pokok pemilik)',add_renov_proyek:'🏗️ Usul: Tambah Proyek Renovasi',add_renov_item:'🧱 Usul: Tambah Item Renovasi',add_stok_cobek:'📦 Usul: Stok Masuk Cobek/Shop'};
const CHAT_ACTION_HANDLERS={
add_transaksi(data){
const type=(data.type==='income')?'income':'expense';
const amount=Math.round(Number(data.amount));
if(!amount||amount<=0)throw new Error('Nominal tidak valid');
const accountId=_chatResolveAccountId(data.accountName);
const ownerId=_chatResolveOwnerId(data.ownerName);
if(ownerId&&type==='income')throw new Error('Pemilik (ownerName) hanya untuk pengeluaran');
const meta=ownerId?_chatOwnerTxMeta(ownerId,accountId):{};
const _snapTx=JSON.stringify(D.transactions||[]),_snapPiu=JSON.stringify(D.piutang||[]);
const txId=uid();
try{
FinanceTxSOT.create({id:txId,type,amount,category:data.category||'Lainnya',subcategory:data.subcategory||'',accountId,payMethod:'tunai',note:data.note||'',date:(data.date&&!isNaN(new Date(data.date).getTime()))?data.date:todayStr(),...meta});
if(meta.titipanTalangan){const tx=FinanceTxSOT.findById(txId);if(!tx||typeof maybeCreateTitipanTalanganPiutang!=='function')throw new Error('Talangan tidak dapat dicatat (modul belum siap)');maybeCreateTitipanTalanganPiutang(tx);if(!(D.piutang||[]).some(x=>x&&x.autoTxId===txId))throw new Error('Piutang talangan gagal dibuat');}
}catch(err){try{FinanceTxSOT.replaceSnapshot(JSON.parse(_snapTx));D.piutang=JSON.parse(_snapPiu);}catch(e2){void e2;}throw err;}
save();refreshCurrentPage();
const acc=D.accounts.find(a=>a.id===accountId);
const tail=meta.titipanTalangan?` — dicatat sebagai talangan ke ${_chatOwnerName(ownerId)} (piutang dibuat)`:(ownerId?` — potong porsi ${_chatOwnerName(ownerId)} (bukan pengeluaran pribadi)`:'');
return `Transaksi ${type==='income'?'pemasukan':'pengeluaran'} ${fmtFull(amount)} (${data.category||'Lainnya'}) dari ${acc?acc.name:'akun'} tersimpan${tail}`;
},
add_tagihan(data){
const amount=Math.round(Number(data.amount));
if(!amount||amount<=0)throw new Error('Nominal tidak valid');
if(!data.nextDue||isNaN(new Date(data.nextDue).getTime()))throw new Error('Tanggal jatuh tempo tidak valid, format harus YYYY-MM-DD');
const accountId=_chatResolveAccountId(data.accountName)||null;
const ownerId=_chatResolveOwnerId(data.ownerName);
const kind=data.kind==='langganan'?'langganan':'tagihan';
let renovLink={};
if(String(data.projectName||'').trim()){
const rp=_chatPickByName(D.renovProjects||[],x=>x.name,data.projectName,'Proyek renovasi');
let itId='';
if(String(data.itemName||'').trim()){const it=_chatPickByName(rp.items||[],x=>x.name,data.itemName,'Item proyek "'+rp.name+'"');itId=it.id;}
renovLink={renovProjectLinkId:rp.id,renovItemLinkId:itId};
}
BillDebtPiutangCanonicalWriter.add('bills',{id:uid(),name:data.name||'Tagihan',amount,nextDue:data.nextDue,freq:data.freq||'bulanan',category:data.category||'Tagihan',subcategory:'',accountId,note:data.note||'',kind,...(ownerId?{deductionOwnerId:ownerId}:{}),...renovLink});
save();refreshCurrentPage();
const acc=D.accounts.find(a=>a.id===accountId);
return `Tagihan "${data.name||'Tagihan'}" ${fmtFull(amount)} (jatuh tempo ${data.nextDue}${acc?', akun '+acc.name:''}${ownerId?', pemilik '+_chatOwnerName(ownerId):''}${renovLink.renovProjectLinkId?', tertaut proyek renovasi':''}) tersimpan`;
},
add_piutang(data){
const name=String(data.name||'').trim();
if(!name)throw new Error('Nama peminjam tidak boleh kosong');
const nilai=Math.round(Number(data.amount));
if(!nilai||nilai<=0)throw new Error('Nominal piutang tidak valid');
const tanggal=_chatDateOrToday(data.date);
const jatuhTempo=_chatDateOrEmpty(data.dueDate);
const dup=(D.piutang||[]).find(x=>x&&!x.lunas&&String(x.name||'').trim().toLowerCase()===name.toLowerCase()&&x.nilai===nilai&&x.tanggal===tanggal);
BillDebtPiutangCanonicalWriter.add('piutang',{id:uid(),name,nilai,tanggal,jatuhTempo,catatan:data.note||'',assetId:'',lunas:false});
save();refreshCurrentPage();
return `Piutang ${name} ${fmtFull(nilai)} tersimpan (tanpa transaksi kas; catat pengeluarannya terpisah bila uang sudah keluar)`+(dup?' (⚠️ sudah ada piutang belum lunas yang persis sama — cek biar gak dobel)':'');
},
add_utang(data){
const name=String(data.name||'').trim();
if(!name)throw new Error('Nama pemberi utang tidak boleh kosong');
const nilai=Math.round(Number(data.amount));
if(!nilai||nilai<=0)throw new Error('Nominal utang tidak valid');
const jenis=['kta','kartu_kredit','pinjol','pribadi','koperasi','lainnya'].includes(data.jenis)?data.jenis:'lainnya';
const bunga=Math.max(0,Number(data.bunga)||0),cicilanBulanan=Math.max(0,Math.round(Number(data.cicilanBulanan)||0));
const d={id:uid(),name,jenis,nilai,bunga,cicilanBulanan,tanggal:_chatDateOrToday(data.date),jatuhTempo:_chatDateOrEmpty(data.dueDate),catatan:data.note||'',assetId:'',lunas:false};
const dup=(D.debts||[]).find(x=>x&&!x.lunas&&String(x.name||'').trim().toLowerCase()===name.toLowerCase()&&x.nilai===nilai&&x.tanggal===d.tanggal);
const _snapDebts=JSON.stringify(D.debts||[]),_snapBills=JSON.stringify(D.bills||[]);
try{BillDebtPiutangCanonicalWriter.add('debts',d);if(typeof Debt!=='undefined'&&typeof Debt.syncBill==='function')Debt.syncBill(d);}catch(err){try{D.debts=JSON.parse(_snapDebts);D.bills=JSON.parse(_snapBills);}catch(e2){void e2;}throw err;}
save();refreshCurrentPage();
return `Utang ${name} ${fmtFull(nilai)} tersimpan (tanpa transaksi kas; catat pemasukannya terpisah bila uang sudah diterima)`+(dup?' (⚠️ sudah ada utang belum lunas yang persis sama — cek biar gak dobel)':'');
},
async pay_tagihan(data){
if(typeof markBillPaid!=='function')throw new Error('Fitur bayar tagihan belum siap dimuat');
const b=_chatPickByName((D.bills||[]).filter(x=>x&&x.id!=null),x=>x.name,data.name,'Tagihan',x=>x.name+' ('+fmtFull(x.amount)+')');
const date=_chatDateOrToday(data.date);
let payAmount=b.amount;
if(data.amount!=null&&data.amount!==''){
const a=Math.round(Number(data.amount));
if(!(a>0))throw new Error('Nominal pembayaran tidak valid');
if(b.kind==='utang')payAmount=a;
else if(a!==Math.round(Number(b.amount)||0))throw new Error('Nominal tagihan "'+b.name+'" tetap '+fmtFull(b.amount)+' (hanya utang yang boleh dibayar beda nominal)');
}
const count=()=>(D.transactions||[]).filter(t=>t&&t.billLinkId===b.id).length;
const before=count();
const blocked=await _chatWithAutoDialogs({'Jumlah Pembayaran':payAmount,'Tanggal Pembayaran':date},()=>markBillPaid(b.id,false));
if(count()<=before){
const why=blocked.length?blocked[0]:'dibatalkan oleh aplikasi';
throw new Error('Pembayaran "'+b.name+'" tidak dilakukan — '+why+'. Bayar lewat tombol Bayar di Tagihan bila memang perlu.');
}
const tx=(D.transactions||[]).filter(t=>t&&t.billLinkId===b.id).pop();
refreshCurrentPage();
return 'Tagihan "'+b.name+'" dibayar '+fmtFull(tx?tx.amount:payAmount)+' ('+(tx&&tx.date?String(tx.date).slice(0,10):date)+')';
},
pay_piutang(data){
const p=_chatPickByName((D.piutang||[]).filter(x=>x&&!x.lunas),x=>x.name,data.name,'Piutang belum lunas',x=>x.name+' ('+fmtFull(x.nilai)+')');
if(typeof _shopReceivableOwner==='function'&&_shopReceivableOwner(p))throw new Error('Piutang "'+p.name+'" berasal dari order Shop — tandai pembayarannya diterima lewat Riwayat Shop/Piutang di aplikasi');
const sisa=Math.round(Number(p.nilai)||0);
let amt=sisa;
if(data.amount!=null&&data.amount!==''){amt=Math.round(Number(data.amount));if(!(amt>0))throw new Error('Nominal pelunasan tidak valid');if(amt>sisa)throw new Error('Nominal melebihi sisa piutang '+fmtFull(sisa));}
const full=amt>=sisa;
const date=_chatDateOrToday(data.date);
const talangan=typeof talanganIsPiutang==='function'&&talanganIsPiutang(p);
const snap=typeof _bdpAtomicSnapshot==='function'?_bdpAtomicSnapshot(['piutang','transactions']):null;
let payoffTxId=null,patch;
try{
if(talangan){
payoffTxId=talanganPayoffCreate(p,amt,date);
if(!payoffTxId)throw new Error('Pemasukan pelunasan talangan tidak dapat dicatat');
patch=full?{lunas:true,linkedPayoffTxId:payoffTxId}:{nilai:sisa-amt};
}else if(p.linkedTxId!=null){
if(!full)throw new Error('Piutang ini tertaut transaksi kas — pelunasan sebagian dilakukan lewat Edit di aplikasi');
const orig=FinanceTxSOT.findById(p.linkedTxId);
if(orig&&orig.accountId&&!p.linkedPayoffTxId)payoffTxId=createPiutangUtangAutoTx('income',sisa,orig.accountId,'Piutang','Piutang lunas: '+p.name,date);
patch=payoffTxId?{lunas:true,linkedPayoffTxId:payoffTxId}:{lunas:true};
}else{
patch=full?{lunas:true}:{nilai:sisa-amt,catatan:((p.catatan?p.catatan+' · ':'')+'Dibayar sebagian '+fmtFull(amt)+' pada '+date).slice(0,300)};
}
BillDebtPiutangCanonicalWriter.updateById('piutang',p.id,p0=>Object.assign(p0,patch));
if(save()===false)throw new Error('Gagal menyimpan (state berubah) — data dikembalikan, muat ulang lalu coba lagi');
}catch(err){
try{if(snap&&typeof _bdpAtomicRestore==='function')_bdpAtomicRestore(snap);}catch(e2){void e2;}
throw err;
}
try{if(typeof Piutang!=='undefined'&&Piutang.renderList)Piutang.renderList();}catch(e){void e;}
_chatRefreshFinance();refreshCurrentPage();
return 'Piutang '+p.name+' '+(full?'dilunasi '+fmtFull(sisa):'dibayar sebagian '+fmtFull(amt)+' (sisa '+fmtFull(sisa-amt)+')')+(payoffTxId?(talangan?' — pemasukan non-pribadi ke akun talangan dicatat':' — pemasukan kas dicatat'):' — tanpa transaksi kas');
},
add_titipan(data){
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'||typeof DanaTitipanPortfolioAPI==='undefined'||typeof DanaTitipanPortfolioAPI.saveCommitment!=='function')throw new Error('Fitur Dana Titipan belum siap dimuat');
const name=String(data.ownerName||data.name||'').trim();
if(!name)throw new Error('Nama pemilik dana titipan tidak boleh kosong');
const principal=Number(data.amount);
if(!Number.isFinite(principal)||principal<0)throw new Error('Pokok dana titipan harus angka >= 0');
const ownerId=OwnerRegistry.findOrCreate(name);
if(!ownerId)throw new Error('Pemilik titipan gagal dibuat');
const prev=(D.titipanCommitments||[]).find(c=>c&&String(c.ownerId)===String(ownerId));
const rec=DanaTitipanPortfolioAPI.saveCommitment({ownerId,ownerName:name,principalAmount:principal,committedDate:_chatDateOrEmpty(data.date)||undefined,notes:data.note!==undefined?String(data.note):undefined});
if(rec&&rec.ok===false)throw new Error('Pokok dana titipan gagal disimpan ('+(rec.code||'error')+')');
try{if(typeof DanaTitipanPortfolioPresenter!=='undefined'){DanaTitipanPortfolioPresenter.render();if(typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');}}catch(e){void e;}
refreshCurrentPage();
return 'Dana Titipan '+name+' pokok '+fmtFull(principal)+(prev?' diperbarui (sebelumnya '+fmtFull(prev.principalAmount)+')':' tersimpan');
},
add_renov_proyek(data){
if(!Array.isArray(D.renovProjects))D.renovProjects=[];
const name=String(data.name||'').trim();
if(!name)throw new Error('Nama proyek tidak boleh kosong');
if(D.renovProjects.some(x=>x&&String(x.name||'').trim().toLowerCase()===name.toLowerCase()))throw new Error('Proyek "'+name+'" sudah ada — tambahkan item saja (add_renov_item)');
const rab=data.rab==null||data.rab===''?0:Number(data.rab);
if(!Number.isFinite(rab)||rab<0)throw new Error('RAB harus angka nol atau lebih');
const project={id:uid(),name,catatan:String(data.note||'').trim(),klien:String(data.klien||'').trim(),rab,createdAt:todayStr(),items:[]};
const lokasi=String(data.lokasi||'').trim();if(lokasi)project.lokasi=lokasi;
if(data.dana){const r=typeof renovClassifyProject==='function'?renovClassifyProject(project,data.dana,D.profile&&D.profile.nama):{ok:false,reason:'Modul Renovasi belum siap'};if(!r.ok)throw new Error(r.reason||'Klasifikasi dana tidak valid (klien/pribadi)');}
D.renovProjects.push(project);
if(save()===false){D.renovProjects=D.renovProjects.filter(x=>x!==project);throw new Error('Gagal menyimpan proyek (state berubah)');}
try{if(typeof Renov!=='undefined'&&Renov.render)Renov.render();}catch(e){void e;}
refreshCurrentPage();
return 'Proyek renovasi "'+name+'" tersimpan'+(rab?' (RAB '+fmtFull(rab)+')':'')+(project.dana?' · dana '+project.dana:'');
},
add_renov_item(data){
const p=_chatPickByName(D.renovProjects||[],x=>x.name,data.projectName,'Proyek renovasi');
const name=String(data.name||'').trim();
if(!name)throw new Error('Nama item tidak boleh kosong');
const harga=Math.round(Number(data.harga));
if(!(harga>0))throw new Error('Harga item tidak valid');
if(!Array.isArray(p.items))p.items=[];
if(p.items.some(x=>x&&String(x.name||'').trim().toLowerCase()===name.toLowerCase()))throw new Error('Item "'+name+'" sudah ada di proyek "'+p.name+'"');
const accountId=_chatResolveAccountId(data.accountName)||'';
const category=(typeof Renov!=='undefined'&&Renov._renovExpenseCategory)?Renov._renovExpenseCategory(data.category):(data.category||'Renovasi');
const item={id:uid(),name,ukuran:String(data.ukuran||'').trim(),harga,hargaTotal:null,category,accountId,note:String(data.note||'').trim(),tglBayar:_chatDateOrToday(data.tglBayar),calcDetail:null,paid:false,txId:null,paidDate:null};
p.items.push(item);
if(save()===false){p.items=p.items.filter(x=>x!==item);throw new Error('Gagal menyimpan item (state berubah)');}
try{if(typeof Renov!=='undefined'&&Renov.render)Renov.render();}catch(e){void e;}
refreshCurrentPage();
return 'Item "'+name+'" '+fmtFull(harga)+' ditambahkan ke proyek "'+p.name+'" (belum dibayar; bayar lewat Renovasi atau tautkan tagihan)';
},
add_stok_cobek(data){
if(typeof ProductRepository==='undefined'||typeof ProductRepository.mutateStockDelta!=='function')throw new Error('Modul stok Shop belum siap dimuat');
const prod=_chatPickByName(D.products||[],x=>x.name,data.productName,'Produk');
const qty=Math.round(Number(data.qty));
if(!(qty>0))throw new Error('Jumlah stok masuk tidak valid');
const hb=data.hargaBeli==null||data.hargaBeli===''?0:Math.round(Number(data.hargaBeli));
if(!Number.isFinite(hb)||hb<0)throw new Error('Harga beli tidak valid');
const hasAcc=!!String(data.accountName||'').trim();
if(hasAcc&&!(hb>0))throw new Error('Harga beli satuan wajib diisi kalau stok dicatat sebagai pengeluaran dari akun');
const accountId=hasAcc?_chatResolveAccountId(data.accountName):'';
const date=_chatDateOrToday(data.date);
const _snapTx=JSON.stringify(D.transactions||[]);
const txId=hasAcc?uid():('chatstock_'+uid());
let txMade=false,stockDone=false;
try{
if(hasAcc){
FinanceTxSOT.create({id:txId,type:'expense',amount:qty*hb,category:'Bisnis',subcategory:'Cobek',accountId,payMethod:'tunai',note:'Stok masuk: '+prod.name+' x'+qty+(data.note?' ('+data.note+')':''),date});
txMade=true;
}
const r=ProductRepository.mutateStockDelta(prod,qty,{source:'stock-receipt',reason:'stok masuk dari chat AI',refType:'transaction',refId:txId,idempotencyKey:'tx-stock-receipt:'+txId+':'+prod.id+':r1'});
if(!r||r.ok===false)throw new Error((r&&r.reason)||'Stok gagal ditambah');
stockDone=true;
if(hb>0)ProductRepository.mutateSetPrice(prod,'hargaBeli',hb);
if(txMade)FinanceTxSOT.patchMetaById(txId,{stockRev:1,stockItems:[{productId:prod.id,name:prod.name,qty,hargaBeli:hb,produsenId:prod.produsenId||'',kategoriId:prod.kategoriId||''}],stockProductId:prod.id,stockQty:qty,kategoriId:prod.kategoriId||''});
if(save()===false)throw new Error('Gagal menyimpan (state berubah)');
}catch(err){
try{if(txMade)FinanceTxSOT.replaceSnapshot(JSON.parse(_snapTx));if(stockDone)ProductRepository.mutateStockDelta(prod,-qty,{source:'stock-receipt-rollback',reason:'rollback stok masuk chat AI',refType:'transaction',refId:txId,idempotencyKey:'chat-stock-rollback:'+txId});}catch(e2){void e2;}
throw err;
}
try{if(typeof renderProductList==='function')renderProductList();}catch(e){void e;}
refreshCurrentPage();
return 'Stok '+prod.name+' +'+qty+' (jadi '+(prod.stock||0)+')'+(hasAcc?' — pengeluaran '+fmtFull(qty*hb)+' dicatat dari akun '+(D.accounts.find(a=>a.id===accountId)||{}).name:' — tanpa catatan kas');
},
add_servis(data){
const _run=()=>{const _snap={servisLogs:JSON.stringify(D.servisLogs||[]),transactions:JSON.stringify(D.transactions||[]),partsStock:JSON.stringify(D.partsStock||[])};try{
const cost=Math.round(Number(data.cost));
if(!Number.isFinite(cost)||cost<0)throw new Error('Biaya tidak valid');
let veh=D.vehicles.find(v=>v.id===data.vehicleId);
if(!veh&&data.vehicleName)veh=D.vehicles.find(v=>v.name.toLowerCase().includes(String(data.vehicleName).toLowerCase()));
if(!veh&&D.vehicles.length===1)veh=D.vehicles[0];
if(!veh)throw new Error('Kendaraan tidak dikenali, sebutkan namanya lebih jelas ya');
const date=(data.date&&/^\d{4}-\d{2}-\d{2}$/.test(String(data.date)))?String(data.date):todayStr();
const accId=D.accounts[0]?.id||'';
const servisItem=data.item||'Servis';
const idem=data.idempotencyKey||('chat:servis:'+veh.id+':'+date+':'+String(servisItem).trim().toLowerCase()+':'+String(data.km??'')+':'+String(cost)+':'+String(data.note||'').trim().toLowerCase());
const existing=typeof findServiceEventByIdempotencyKey==='function'?findServiceEventByIdempotencyKey(D.servisLogs||[],idem,veh.id):null;
if(existing)return `Servis "${existing.item||servisItem}" untuk ${veh.name} sudah pernah dicatat`;
const txId=uid(),servisId=uid();
const canonicalCatId=typeof canonicalServisCategoryId==='function'?canonicalServisCategoryId(servisItem,veh.id,null):null;
const _chatCat=canonicalCatId?(D.sparepartCats||[]).find(c=>c&&c.id===canonicalCatId):null;
const _chatKm=data.km==null||data.km===''?null:Number(data.km);
if(_chatKm!==null&&(!Number.isFinite(_chatKm)||_chatKm<0))throw new Error('KM servis tidak valid');
if(typeof Servis!=='undefined'&&typeof Servis.validateServiceOdometer==='function'){const _chatOdo=Servis.validateServiceOdometer({vehicleId:veh.id,km:_chatKm,date,excludeId:null});if(_chatOdo&&_chatOdo.ok===false)throw new Error(_chatOdo.message||'KM servis tidak konsisten dengan histori kendaraan');}
const _chatSnap=(_chatCat&&typeof buildServiceNextDueSnapshot==='function')?buildServiceNextDueSnapshot({vehicleId:veh.id,cat:_chatCat,serviceKm:_chatKm,serviceDate:date,actionType:data.actionType||null}):{};
FinanceTxSOT.create({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:servisItem+' - '+veh.name,date,servisLinkId:servisId,vehicleId:veh.id});
const _chatServiceLog={id:servisId,vehicleId:veh.id,date,item:servisItem,categoryId:canonicalCatId,km:_chatKm,cost,note:data.note||'',accountId:accId,txLinkId:txId,intervalKmAtService:_chatSnap.intervalKmAtService||null,intervalBulanAtService:_chatSnap.intervalBulanAtService||null,nextDueKm:_chatSnap.nextDueKm??null,nextDueDate:_chatSnap.nextDueDate||null,nextDueAxis:_chatSnap.nextDueAxis||'none',idempotencyKey:idem};
D.servisLogs.push(_chatServiceLog);
save();
try{if(typeof ServiceEventLifecycle!=='undefined'&&typeof ServiceEventLifecycle.create==='function')ServiceEventLifecycle.create(_chatServiceLog);}catch(err){if(typeof ServiceEventOutbox!=='undefined'&&!ServiceEventOutbox.enqueue({type:'service.create',payload:_chatServiceLog}))console.error('V37: service.create outbox persistence failed',err);}
const _chatFinancePayload={txId:txId,category:resolveVehicleTxCategory(veh),type:'expense',amount:cost,kind:'servis'};
try{if(typeof AIBus!=='undefined')AIBus.emit('finance.updated',_chatFinancePayload);}catch(_chatFinanceErr){if(typeof ServiceEventOutbox!=='undefined'&&!ServiceEventOutbox.enqueue({type:'finance.updated',payload:_chatFinancePayload}))console.error('V37: finance.updated outbox persistence failed',_chatFinanceErr);}
refreshCurrentPage();
return `Servis "${servisItem}" untuk ${veh.name} ${fmtFull(cost)} tersimpan`;
}catch(err){try{D.servisLogs=JSON.parse(_snap.servisLogs);if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');FinanceTxSOT.replaceSnapshot(JSON.parse(_snap.transactions));if(typeof StockCommandSOT==='undefined'||!StockCommandSOT||typeof StockCommandSOT.replaceSnapshot!=='function')throw new Error('StockCommandSOT wajib tersedia untuk rollback stok chat');StockCommandSOT.replaceSnapshot(JSON.parse(_snap.partsStock));}catch(_){ /* best-effort cleanup; primary action already completed */ }throw err;}};
return typeof withServiceMutationLock==='function'?withServiceMutationLock(_run):_run();
},
add_target(data){
const amount=Math.round(Number(data.amount));
if(!amount||amount<=0)throw new Error('Target nominal tidak valid');
D.targets.push({id:uid(),name:data.name||'Target',amount,saved:Math.round(Number(data.saved||0)),emoji:data.emoji||'🎯'});
save();refreshCurrentPage();
return `Target tabungan "${data.name||'Target'}" ${fmtFull(amount)} tersimpan`;
},
add_wishlist(data){
const name=(data.name||'').trim();
if(!name)throw new Error('Nama barang tidak boleh kosong');
const price=Math.round(Number(data.price));
if(!price||price<=0)throw new Error('Harga barang tidak valid');
const cat=(data.cat==='kebutuhan')?'kebutuhan':'keinginan';
const urgensi=['mendesak','bisa_nunggu','nice_to_have'].includes(data.urgensi)?data.urgensi:'bisa_nunggu';
const hargaNormalRaw=Math.round(Number(data.hargaNormal||0));
const isDiskon=!!(hargaNormalRaw&&hargaNormalRaw>price);
const dup=(D.wishlist||[]).find(x=>!x.bought&&x.name.trim().toLowerCase()===name.toLowerCase());
D.wishlist.push({id:uid(),name,price,isDiskon,hargaNormal:isDiskon?hargaNormalRaw:0,cat,urgensi,sudahPunya:!!data.sudahPunya,sudahPunyaAlasan:data.sudahPunyaAlasan?String(data.sudahPunyaAlasan).trim():'',createdAt:new Date().toISOString(),bought:false});
save();refreshCurrentPage();
return `Barang "${name}" ${fmtFull(price)} ditambahkan ke Prioritas Belanja`+(dup?` (⚠️ ada barang dgn nama serupa yg sudah ada di list — cek biar gak dobel)`:'');
},
add_catatan_anak(data){
if(!data.text||!String(data.text).trim())throw new Error('Isi catatan kosong');
if(!D.catatan.anak)D.catatan.anak=[];
D.catatan.anak.push({id:uid(),date:(data.date&&!isNaN(new Date(data.date).getTime()))?data.date:todayStr(),text:String(data.text).trim()});
save();refreshCurrentPage();
return `Catatan anak tersimpan: "${String(data.text).trim()}"`;
}
};
const CHAT_ACTION_EDIT_FIELDS={
add_transaksi:[
{key:'type',label:'Jenis',type:'select',options:[['expense','Pengeluaran'],['income','Pemasukan']]},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'category',label:'Kategori',type:'text'},
{key:'accountName',label:'Akun',type:'select',options:()=>[['','(akun pertama)'],...D.accounts.map(a=>[a.name,a.name])]},
{key:'ownerName',label:'Pemilik titipan (opsional)',type:'text'},
{key:'note',label:'Catatan',type:'text'},
{key:'date',label:'Tanggal',type:'date'},
],
add_tagihan:[
{key:'name',label:'Nama Tagihan',type:'text'},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'nextDue',label:'Jatuh Tempo',type:'date'},
{key:'freq',label:'Frekuensi',type:'select',options:[['bulanan','Bulanan'],['tahunan','Tahunan'],['sekali','Sekali']]},
{key:'accountName',label:'Akun',type:'select',options:()=>[['','(akun pertama)'],...D.accounts.map(a=>[a.name,a.name])]},
{key:'ownerName',label:'Pemilik titipan (opsional)',type:'text'},
],
add_piutang:[
{key:'name',label:'Nama Peminjam',type:'text'},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'date',label:'Tanggal',type:'date'},
{key:'dueDate',label:'Jatuh Tempo (opsional)',type:'date'},
{key:'note',label:'Catatan',type:'text'},
],
add_utang:[
{key:'name',label:'Nama Pemberi Utang',type:'text'},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'cicilanBulanan',label:'Cicilan/bulan (Rp, opsional)',type:'number'},
{key:'date',label:'Tanggal',type:'date'},
{key:'dueDate',label:'Jatuh Tempo (opsional)',type:'date'},
{key:'note',label:'Catatan',type:'text'},
],
pay_tagihan:[
{key:'name',label:'Nama Tagihan',type:'text'},
{key:'amount',label:'Nominal (hanya utang yang boleh beda)',type:'number'},
{key:'date',label:'Tanggal Bayar',type:'date'},
],
pay_piutang:[
{key:'name',label:'Nama Peminjam',type:'text'},
{key:'amount',label:'Nominal diterima (kosong = lunas penuh)',type:'number'},
{key:'date',label:'Tanggal',type:'date'},
],
add_titipan:[
{key:'ownerName',label:'Nama Pemilik',type:'text'},
{key:'amount',label:'Pokok Dikomit (Rp)',type:'number'},
{key:'date',label:'Tanggal Komit',type:'date'},
{key:'note',label:'Catatan',type:'text'},
],
add_renov_proyek:[
{key:'name',label:'Nama Proyek',type:'text'},
{key:'rab',label:'RAB (Rp)',type:'number'},
{key:'klien',label:'Klien',type:'text'},
{key:'lokasi',label:'Lokasi',type:'text'},
{key:'dana',label:'Dana',type:'select',options:[['','(belum diklasifikasi)'],['pribadi','Pribadi'],['klien','Klien']]},
],
add_renov_item:[
{key:'projectName',label:'Proyek',type:'select',options:()=>(D.renovProjects||[]).length?D.renovProjects.map(x=>[x.name,x.name]):[['','Belum ada proyek']]},
{key:'name',label:'Nama Item',type:'text'},
{key:'harga',label:'Harga (Rp)',type:'number'},
{key:'ukuran',label:'Ukuran',type:'text'},
{key:'accountName',label:'Akun',type:'select',options:()=>[['','(akun pertama)'],...D.accounts.map(a=>[a.name,a.name])]},
],
add_stok_cobek:[
{key:'productName',label:'Produk',type:'select',options:()=>(D.products||[]).length?D.products.map(x=>[x.name,x.name]):[['','Belum ada produk']]},
{key:'qty',label:'Jumlah masuk',type:'number'},
{key:'hargaBeli',label:'Harga beli satuan (Rp)',type:'number'},
{key:'accountName',label:'Akun (kosong = tanpa catatan kas)',type:'select',options:()=>[['','(tanpa catatan kas)'],...D.accounts.map(a=>[a.name,a.name])]},
{key:'date',label:'Tanggal',type:'date'},
],
add_servis:[
{key:'vehicleName',label:'Kendaraan',type:'select',options:()=>D.vehicles.length?D.vehicles.map(v=>[v.name,v.name]):[['','Belum ada kendaraan']]},
{key:'item',label:'Item Servis',type:'text'},
{key:'cost',label:'Biaya (Rp)',type:'number'},
{key:'date',label:'Tanggal',type:'date'},
{key:'km',label:'KM (opsional)',type:'number'},
],
add_target:[
{key:'name',label:'Nama Target',type:'text'},
{key:'amount',label:'Target Nominal (Rp)',type:'number'},
{key:'saved',label:'Sudah Terkumpul (Rp)',type:'number'},
],
add_catatan_anak:[
{key:'text',label:'Catatan',type:'text'},
{key:'date',label:'Tanggal',type:'date'},
],
add_wishlist:[
{key:'name',label:'Nama Barang',type:'text'},
{key:'price',label:'Harga (Rp)',type:'number'},
{key:'cat',label:'Kategori',type:'select',options:[['kebutuhan','🛠️ Kebutuhan'],['keinginan','✨ Keinginan']]},
{key:'urgensi',label:'Urgensi',type:'select',options:[['mendesak','🔥 Mendesak'],['bisa_nunggu','⏳ Bisa Nunggu'],['nice_to_have','💭 Nice to Have']]},
],
};
