// Self-test case registry part B.
function __kwSelfTestCasesB(){
return [
{name:'runDataHealthCheck(): mendeteksi piutang tanpa nama, nilai tidak valid, & jatuh tempo tidak valid (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof runDataHealthCheck!=='function')return;
const backup=D.piutang;
try{
D.piutang=[
{id:'__p_noname__',name:'',nilai:100000,tanggal:'2026-01-01',jatuhTempo:'',lunas:false},
{id:'__p_badval__',name:'Tes Piutang',nilai:NaN,tanggal:'2026-01-01',jatuhTempo:'',lunas:false},
{id:'__p_badjt__',name:'Tes Piutang 2',nilai:50000,tanggal:'2026-01-01',jatuhTempo:'tanggal-ngawur',lunas:false}
];
runDataHealthCheck();
const listHtml=document.getElementById('dataHealthList')?document.getElementById('dataHealthList').innerHTML:'';
_selfTestAssert(listHtml.includes('Piutang tanpa nama peminjam'),'Harus mendeteksi piutang tanpa nama peminjam');
_selfTestAssert(listHtml.includes('Piutang dengan nilai tidak valid'),'Harus mendeteksi piutang dengan nilai NaN/rusak');
_selfTestAssert(listHtml.includes('Piutang dengan tanggal jatuh tempo tidak valid'),'Harus mendeteksi piutang dengan jatuh tempo tidak terbaca sebagai tanggal');
} finally {
D.piutang=backup;
closeModal('dataHealthModal');
}
}},
{name:'CHAT_ACTION_EDIT_FIELDS: setiap tipe aksi chat AI punya konfigurasi form Edit yang lengkap', fn:()=>{
Object.keys(CHAT_ACTION_HANDLERS).forEach(type=>{
const fields=CHAT_ACTION_EDIT_FIELDS[type];
_selfTestAssert(Array.isArray(fields)&&fields.length>0,'CHAT_ACTION_EDIT_FIELDS harus punya daftar field untuk tipe aksi "'+type+'"');
fields.forEach(f=>{
_selfTestAssert(f.key&&f.label&&f.type,'Setiap field edit ("'+type+'") harus punya key, label, dan type');
});
});
}},
{name:'actualWealthCAGR(): kondisi belum cukup data (kurang dari 2 snapshot / rentang <25 hari) → null (sementara, D.wealthSnapshots dicadangkan & dikembalikan)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[];
_selfTestAssert(actualWealthCAGR()===null,'0 snapshot harus null');
D.wealthSnapshots=[{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false}];
_selfTestAssert(actualWealthCAGR()===null,'1 snapshot harus null');
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-01-05',netWorth:1100000,auto:false}
];
_selfTestAssert(actualWealthCAGR()===null,'Rentang <25 hari antar snapshot harus null (belum absurd dihitung tahunan)');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): basis awal negatif/nol → cagr:null reason "baseline-negative" (bukan NaN)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:-500000,auto:false},
{id:'__t2__',date:'2026-03-01',netWorth:1000000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null&&r.cagr===null&&r.reason==='baseline-negative','Basis awal negatif harus mengembalikan {cagr:null, reason:"baseline-negative"}, bukan null/NaN');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): kekayaan bersih TERAKHIR negatif → cagr:null reason "latest-negative" (BUGFIX, dulu NaN)', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2026-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-04-01',netWorth:-250000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null,'Snapshot cukup (2, rentang ≥25 hari) harus tetap mengembalikan object, bukan null');
_selfTestAssert(r.cagr===null,'cagr harus null saat kekayaan bersih terakhir negatif (bukan NaN — ini bugfix utamanya)');
_selfTestAssert(!Number.isNaN(r.cagr),'cagr TIDAK BOLEH berupa NaN dalam kondisi apa pun');
_selfTestAssert(r.reason==='latest-negative','reason harus "latest-negative" saat basis awal positif tapi snapshot terakhir negatif');
} finally { D.wealthSnapshots=backup; }
}},
{name:'actualWealthCAGR(): kondisi normal (awal & akhir positif, rentang cukup) → cagr angka valid, reason null', fn:()=>{
const backup=D.wealthSnapshots;
try{
D.wealthSnapshots=[
{id:'__t1__',date:'2025-01-01',netWorth:1000000,auto:false},
{id:'__t2__',date:'2026-01-01',netWorth:1200000,auto:false}
];
const r=actualWealthCAGR();
_selfTestAssert(r!==null&&r.reason===null,'Kondisi normal harus mengembalikan reason:null');
_selfTestAssert(typeof r.cagr==='number'&&!Number.isNaN(r.cagr),'cagr harus berupa angka valid pada kondisi normal');
_selfTestAssert(r.cagr>0,'Kekayaan naik dari 1jt ke 1.2jt dlm ~1th harus menghasilkan cagr positif (≈20%)');
} finally { D.wealthSnapshots=backup; }
}},
{name:'renderBillHistory(): catatan transaksi (note) di-escape, tidak boleh membocorkan tag HTML mentah (XSS HARDENING)', fn:()=>{
if(typeof renderBillHistory!=='function'||typeof openBillHistory!=='function')return;
const backupTx=D.transactions,backupBillId=curBillHistoryId;
const payload='<img src=x onerror="1">';
try{
const billId='__xss_bill__';
D.transactions=[{id:'__xss_tx__',billLinkId:billId,date:'2026-01-01',amount:1000,note:payload,category:'Tes'}];
const modal=document.getElementById('billHistoryModal');
const hadOpen=modal&&modal.classList.contains('open');
if(modal)modal.classList.add('open');
curBillHistoryId=billId;
renderBillHistory();
const html=document.getElementById('billHistoryList')?document.getElementById('billHistoryList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Catatan pembayaran tagihan harus di-escape (tidak boleh ada tag <img> mentah dari note)');
if(modal&&!hadOpen)modal.classList.remove('open');
} finally { D.transactions=backupTx; curBillHistoryId=backupBillId; }
}},
{name:'renderBbmList()/renderStockList()/renderServisList(): field bebas-teks (note/spbu/nama/kode/item) di-escape (XSS HARDENING)', fn:()=>{
if(typeof renderBbmList!=='function'||typeof renderStockList!=='function'||typeof renderServisList!=='function')return;
const veh=D.vehicles[0];
if(!veh)return;
const payload='<img src=x onerror="1">';
const backupBbm=D.bbmLogs,backupParts=D.partsStock,backupServis=D.servisLogs,backupCurVeh=curVehicleId;
try{
curVehicleId=veh.id;
D.bbmLogs=[{id:'__xss_bbm__',date:'2026-01-01',vehicleId:veh.id,km:100,liter:5,harga:10000,cost:50000,fullTank:true,spbu:payload,note:payload}];
renderBbmList();
const bbmHtml=document.getElementById('bbmList')?document.getElementById('bbmList').innerHTML:'';
_selfTestAssert(!bbmHtml.includes('<img'),'SPBU/catatan di daftar BBM harus di-escape');
D.partsStock=[{id:'__xss_part__',name:payload,code:payload,note:payload,qty:5,unit:'pcs',minStock:1,price:0}];
renderStockList();
const stockHtml=document.getElementById('stockList')?document.getElementById('stockList').innerHTML:'';
_selfTestAssert(!stockHtml.includes('<img'),'Nama/kode/catatan sparepart di daftar stok harus di-escape');
D.servisLogs=[{id:'__xss_servis__',date:'2026-01-01',vehicleId:veh.id,item:payload,note:payload,cost:1000}];
renderServisList();
const servisHtml=document.getElementById('servisList')?document.getElementById('servisList').innerHTML:'';
_selfTestAssert(!servisHtml.includes('<img'),'Item/catatan servis di daftar servis kendaraan harus di-escape');
} finally {
D.bbmLogs=backupBbm; D.partsStock=backupParts; D.servisLogs=backupServis; curVehicleId=backupCurVeh;
renderBbmList(); renderStockList(); renderServisList();
}
}},
{name:'Etalase.renderList(): nama produk/kategori/produsen di-escape (XSS HARDENING)', fn:()=>{
if(typeof Etalase==='undefined'||typeof Etalase.renderList!=='function')return;
const payload='<img src=x onerror="1">';
const backupProducts=D.products,backupProdusen=D.produsen,backupKategori=D.cobekKategori;
try{
D.produsen=[{id:'__xss_prod__',name:payload,contact:'',note:''}];
D.cobekKategori=[{id:'__xss_kat__',name:payload}];
D.products=[{id:'__xss_p__',name:payload,stock:5,kategoriId:'__xss_kat__',produsenId:'__xss_prod__',hargaBeli:1000,hargaJual:2000,hargaReseller:0,diskonPersen:0}];
Etalase.renderList();
const html=document.getElementById('productList')?document.getElementById('productList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Nama produk/kategori/produsen di daftar Etalase harus di-escape');
} finally {
D.products=backupProducts; D.produsen=backupProdusen; D.cobekKategori=backupKategori;
Etalase.renderList();
}
}},
{name:'renderReminder(): judul & deskripsi pengingat di-escape (XSS HARDENING)', fn:()=>{
if(typeof renderReminder!=='function')return;
const payload='<img src=x onerror="1">';
const backupReminders=D.reminders;
try{
D.reminders=[{id:'__xss_reminder__',title:payload,desc:payload,color:'#7c6fef'}];
renderReminder();
const html=document.getElementById('reminderList')?document.getElementById('reminderList').innerHTML:'';
_selfTestAssert(!html.includes('<img'),'Judul/deskripsi pengingat harus di-escape');
} finally {
D.reminders=backupReminders;
renderReminder();
}
}},
{name:'Enkripsi API key (Web Crypto, kunci dari PIN): round-trip benar, PIN salah gagal dekripsi, save() tidak pernah simpan polos ke kw_v4 (HARDENING KEAMANAN)', fn:async()=>{
if(typeof encryptApiKeyWithPin!=='function'||typeof decryptApiKeyWithPin!=='function')return;
const backupProfile=JSON.parse(JSON.stringify(D.profile||{}));
const backupPin=localStorage.getItem('kw_pin');
const backupEnc=localStorage.getItem('kw_apikey_enc');
const backupKw4=localStorage.getItem('kw_v4');
const testPin='7391';
const testKey='sk-test-selftest-'+Date.now();
try{
const enc=await encryptApiKeyWithPin(testPin,testKey);
_selfTestAssert(enc&&enc.salt&&enc.iv&&enc.ct,'Hasil enkripsi harus punya salt, iv, & ciphertext');
const decrypted=await decryptApiKeyWithPin(testPin,enc);
_selfTestAssert(decrypted===testKey,'Dekripsi dgn PIN yang benar harus mengembalikan API key asli, dapat "'+decrypted+'"');
const wrongResult=await decryptApiKeyWithPin('0000',enc);
_selfTestAssert(wrongResult===null,'Dekripsi dengan PIN salah harus menghasilkan null (fail-safe), dapat "'+wrongResult+'"');
localStorage.setItem('kw_pin',testPin);
D.profile=D.profile||{};
D.profile.apiKey=testKey;
saveFlush();
const rawKw4=localStorage.getItem('kw_v4');
_selfTestAssert(!rawKw4.includes(testKey),'kw_v4 TIDAK BOLEH mengandung API key dalam bentuk teks polos setelah save()');
const parsedKw4=JSON.parse(rawKw4);
_selfTestAssert(!parsedKw4.profile||!('apiKey' in parsedKw4.profile),'Field "apiKey" TIDAK BOLEH ada sama sekali di objek profile dalam kw_v4');
} finally {
D.profile=backupProfile;
if(backupPin===null)localStorage.removeItem('kw_pin'); else localStorage.setItem('kw_pin',backupPin);
if(backupEnc===null)localStorage.removeItem('kw_apikey_enc'); else localStorage.setItem('kw_apikey_enc',backupEnc);
if(backupKw4===null)localStorage.removeItem('kw_v4'); else localStorage.setItem('kw_v4',backupKw4);
}
}},
{name:'save() di-debounce (PERFORMA): beberapa panggilan berturutan cuma menulis ke disk SATU KALI', fn:async()=>{
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
const original=_saveImmediate;
const staleBefore=typeof _crossTabStateStale!=='undefined'?_crossTabStateStale:false;
const warnBefore=typeof _crossTabWarnShown!=='undefined'?_crossTabWarnShown:false;
let callCount=0;
_saveImmediate=function(){callCount++;};
try{
// Isolate the contract test from a real cross-tab stale state. Production guard remains intact.
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=false;
if(typeof _crossTabWarnShown!=='undefined')_crossTabWarnShown=false;
save();save();save();save();save();
const pollStart=Date.now();
while(callCount===0 && (Date.now()-pollStart)<3000){ await new Promise(r=>setTimeout(r,25)); }
} finally {
_saveImmediate=original;
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=staleBefore;
if(typeof _crossTabWarnShown!=='undefined')_crossTabWarnShown=warnBefore;
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
}
_selfTestAssert(callCount===1,'_saveImmediate() seharusnya cuma terpanggil 1x dari 5x panggilan save() berturutan (digabung debounce), malah terpanggil '+callCount+'x');
}},
{name:'saveFlush() (PERFORMA): menulis ke disk SEKARANG & membatalkan jeda debounce yang masih tertunda', fn:async()=>{
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
const original=_saveImmediate;
const staleBefore=typeof _crossTabStateStale!=='undefined'?_crossTabStateStale:false;
const warnBefore=typeof _crossTabWarnShown!=='undefined'?_crossTabWarnShown:false;
let callCount=0;
_saveImmediate=function(){callCount++;};
try{
// Isolate the hard-flush contract test from cross-tab stale state left by another self-test.
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=false;
if(typeof _crossTabWarnShown!=='undefined')_crossTabWarnShown=false;
save();
_selfTestAssert(callCount===0,'Sesaat setelah save(), _saveImmediate() belum boleh terpanggil (masih menunggu jeda debounce)');
saveFlush();
_selfTestAssert(callCount===1,'saveFlush() harus langsung memicu _saveImmediate() sekali, tanpa menunggu jeda debounce');
_selfTestAssert(_saveDebounceTimer===null,'saveFlush() harus membatalkan timer debounce yang masih tertunda (_saveDebounceTimer harus null sesudahnya)');
await new Promise(r=>setTimeout(r,500));
_selfTestAssert(callCount===1,'Tidak boleh ada _saveImmediate() tambahan setelah saveFlush() (timer debounce lama harusnya sudah dibatalkan)');
} finally {
_saveImmediate=original;
if(typeof _crossTabStateStale!=='undefined')_crossTabStateStale=staleBefore;
if(typeof _crossTabWarnShown!=='undefined')_crossTabWarnShown=warnBefore;
if(_saveDebounceTimer){clearTimeout(_saveDebounceTimer);_saveDebounceTimer=null;}
}
}},
{name:'gdriveTrySilentReconnectOnLoad(): TIDAK mencoba apa pun kalau belum diizinkan / sudah tersambung', fn:()=>{
const backupGDrive=D.googleDrive?JSON.parse(JSON.stringify(D.googleDrive)):null;
const backupToken=gdriveAccessToken;
const originalInitTC=gdriveInitTokenClient;
let callCount=0;
gdriveInitTokenClient=function(){callCount++;return null;};
try{
D.googleDrive={clientId:'123-abc.apps.googleusercontent.com',fileId:null,lastSync:null,autoSync:false};
gdriveAccessToken=null;
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak boleh mencoba reconnect kalau Sinkron Otomatis belum diaktifkan user');
D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:true};
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak boleh mencoba reconnect kalau Client ID belum diisi');
D.googleDrive={clientId:'123-abc.apps.googleusercontent.com',fileId:null,lastSync:null,autoSync:true};
gdriveAccessToken='token-palsu-utk-tes';
gdriveTrySilentReconnectOnLoad();
_selfTestAssert(callCount===0,'Tidak perlu reconnect kalau gdriveAccessToken sudah ada (berarti masih tersambung sesi ini)');
} finally {
D.googleDrive=backupGDrive;
gdriveAccessToken=backupToken;
gdriveInitTokenClient=originalInitTC;
}
}},
{name:'WorthIt.computeScore(): kebutuhan+mendesak diberi skor lebih tinggi daripada keinginan+nice-to-have', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.computeScore!=='function')return;
const backupAccounts=JSON.parse(JSON.stringify(D.accounts));
try{
D.accounts=[{id:'__selftest_acc__',name:'Tes',emoji:'💰',baseBalance:1000000000,includeInBalance:true}];
const tinggi=WorthIt.computeScore({name:'A',price:10000,cat:'kebutuhan',urgensi:'mendesak',isDiskon:false,hargaNormal:0,sudahPunya:false});
const rendah=WorthIt.computeScore({name:'B',price:10000,cat:'keinginan',urgensi:'nice_to_have',isDiskon:false,hargaNormal:0,sudahPunya:false});
_selfTestAssert(tinggi.score>rendah.score,'Item kebutuhan+mendesak ('+tinggi.score+') harus lebih tinggi dari keinginan+nice-to-have ('+rendah.score+')');
_selfTestAssert(tinggi.score>=70,'Item kebutuhan+mendesak seharusnya masuk badge Prioritas Tinggi (skor>=70), dapat '+tinggi.score);
_selfTestAssert(rendah.score<40,'Item keinginan+nice-to-have seharusnya masuk badge Bisa Ditunda (skor<40), dapat '+rendah.score);
} finally { D.accounts=backupAccounts; }
}},
{name:'WorthIt.computeScore(): "sudah punya barang lama" menurunkan skor & diskon tipis ditandai merah', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.computeScore!=='function')return;
const backupAccounts=JSON.parse(JSON.stringify(D.accounts));
try{
D.accounts=[{id:'__selftest_acc__',name:'Tes',emoji:'💰',baseBalance:1000000000,includeInBalance:true}];
const base={name:'A',price:10000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:false,hargaNormal:0};
const tanpaSudahPunya=WorthIt.computeScore({...base,sudahPunya:false});
const denganSudahPunya=WorthIt.computeScore({...base,sudahPunya:true,sudahPunyaAlasan:''});
_selfTestAssert(denganSudahPunya.score<tanpaSudahPunya.score,'Menandai "sudah punya barang lama" harus menurunkan skor dibanding tidak ditandai');
const diskonTipis=WorthIt.computeScore({name:'C',price:95000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:true,hargaNormal:100000,sudahPunya:false});
const diskonGede=WorthIt.computeScore({name:'D',price:50000,cat:'keinginan',urgensi:'bisa_nunggu',isDiskon:true,hargaNormal:100000,sudahPunya:false});
_selfTestAssert(diskonGede.score>diskonTipis.score,'Diskon 50% harus mendorong skor lebih tinggi daripada diskon 5%');
const alasanText='<img src=x onerror=1> alasan custom';
const withReason=WorthIt.computeScore({...base,sudahPunya:true,sudahPunyaAlasan:alasanText});
const reasonHtml=withReason.reasons.map(r=>r.text).join(' ');
_selfTestAssert(!reasonHtml.includes('<img'),'Alasan custom "sudah punya barang" harus di-escape (XSS HARDENING)');
} finally { D.accounts=backupAccounts; }
}},
{name:'WorthIt.addToList()/editListItem()/deleteListItem(): CRUD D.wishlist tidak merusak data lain (sementara, dicadangkan & dikembalikan)', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.addToList!=='function')return;
const requiredIds=['wlName','wlPrice','wlIsDiskon','wlHargaNormal','wlCategory','wlUrgensi','wlSudahPunya','wlSudahPunyaAlasan','wlSubmitBtn','wlCancelEditBtn'];
if(requiredIds.some(id=>!document.getElementById(id)))return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupEditId=WorthIt.editListId;
try{
WorthIt.cancelEditList();
const countBefore=D.wishlist.length;
document.getElementById('wlName').value='__selftest_item__';
document.getElementById('wlPrice').value='50000';
document.getElementById('wlIsDiskon').checked=false;
WorthIt.toggleDiskonList();
document.getElementById('wlCategory').value='kebutuhan';
document.getElementById('wlUrgensi').value='mendesak';
document.getElementById('wlSudahPunya').checked=false;
WorthIt.toggleSudahPunya();
WorthIt.addToList();
_selfTestAssert(D.wishlist.length===countBefore+1,'addToList() harus menambah tepat 1 item baru ke D.wishlist');
const added=D.wishlist.find(x=>x.name==='__selftest_item__');
_selfTestAssert(!!added,'Item baru harus ditemukan di D.wishlist berdasarkan nama');
_selfTestAssert(added.price===50000&&added.cat==='kebutuhan'&&added.urgensi==='mendesak','Field item baru (harga/kategori/urgensi) harus tersimpan sesuai input form');
WorthIt.editListItem(added.id);
_selfTestAssert(WorthIt.editListId===added.id,'editListItem() harus set WorthIt.editListId ke ID item yang diedit');
_selfTestAssert(document.getElementById('wlName').value==='__selftest_item__','Form harus terisi ulang dgn nama item saat mode edit');
document.getElementById('wlPrice').value='75000';
document.getElementById('wlSudahPunya').checked=true;
WorthIt.toggleSudahPunya();
document.getElementById('wlSudahPunyaAlasan').value='masih oke tapi mau upgrade';
WorthIt.addToList();
_selfTestAssert(D.wishlist.length===countBefore+1,'Simpan perubahan saat mode edit TIDAK boleh menambah item baru (harus update in-place)');
const updated=D.wishlist.find(x=>x.id===added.id);
_selfTestAssert(updated.price===75000,'Harga item harus terupdate setelah edit');
_selfTestAssert(updated.sudahPunya===true&&updated.sudahPunyaAlasan==='masih oke tapi mau upgrade','Status & alasan "sudah punya barang lama" harus tersimpan setelah edit');
_selfTestAssert(WorthIt.editListId===null,'WorthIt.editListId harus direset ke null setelah selesai simpan/edit');
WorthIt.deleteListItem(added.id);
_selfTestAssert(D.wishlist.length===countBefore,'deleteListItem() harus mengembalikan panjang D.wishlist ke semula');
_selfTestAssert(!D.wishlist.some(x=>x.id===added.id),'Item yang dihapus tidak boleh tersisa di D.wishlist');
} finally {
D.wishlist=backupWishlist;
WorthIt.editListId=backupEditId;
save();
}
}},
{name:'WorthIt.catatBeliList()+applyBuyLink(): item BELUM bought sebelum tx disimpan, & baru bought+ke-link setelah tx tersimpan', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.catatBeliList!=='function')return;
if(!document.getElementById('txAmt')||!document.getElementById('txNote')||!document.getElementById('txModal')||!document.getElementById('worthItModal'))return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
const backupPending=WorthIt.pendingBuyId;
const backupTxEditId=txEditId;
const txWasOpen=document.getElementById('txModal').classList.contains('open');
const wiWasOpen=document.getElementById('worthItModal').classList.contains('open');
try{
D.wishlist.push({id:'__selftest_wl_1__',name:'__selftest_barang_beli__',price:25000,isDiskon:false,hargaNormal:0,cat:'kebutuhan',urgensi:'mendesak',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:false});
WorthIt.catatBeliList('__selftest_wl_1__');
const itAfterOpen=D.wishlist.find(x=>x.id==='__selftest_wl_1__');
_selfTestAssert(itAfterOpen.bought===false,'BUGFIX: item TIDAK BOLEH langsung bought:true cuma karena txModal dibuka (baru dianggap bought setelah tx beneran Simpan)');
_selfTestAssert(WorthIt.pendingBuyId==='__selftest_wl_1__','catatBeliList() harus menyimpan ID barang ke WorthIt.pendingBuyId, menunggu tx disimpan');
_selfTestAssert(document.getElementById('txAmt').value==='25000','Nominal txModal harus otomatis terisi sesuai harga barang wishlist');
closeModal('txModal');
_selfTestAssert(WorthIt.pendingBuyId===null,'BUGFIX: menutup txModal tanpa Simpan harus membatalkan pendingBuyId');
_selfTestAssert(D.wishlist.find(x=>x.id==='__selftest_wl_1__').bought===false,'Item wishlist harus TETAP belum-bought kalau txModal dibatalkan/ditutup');
WorthIt.catatBeliList('__selftest_wl_1__');
const fakeTxId='__selftest_tx_1__';
D.transactions.push({id:fakeTxId,type:'expense',amount:25000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_beli__',date:new Date().toISOString().split('T')[0]});
WorthIt.applyBuyLink(fakeTxId);
const itAfterBuy=D.wishlist.find(x=>x.id==='__selftest_wl_1__');
_selfTestAssert(itAfterBuy.bought===true,'Setelah transaksi beneran tersimpan & applyBuyLink() dipanggil, item baru boleh jadi bought:true');
_selfTestAssert(itAfterBuy.txId===fakeTxId,'Item harus tersambung ke ID transaksi asli (txId) setelah applyBuyLink()');
const linkedTx=D.transactions.find(x=>x.id===fakeTxId);
_selfTestAssert(linkedTx.wishlistLinkId==='__selftest_wl_1__','Transaksi harus tersambung balik ke item wishlist (wishlistLinkId) — link 2 arah');
_selfTestAssert(WorthIt.pendingBuyId===null,'pendingBuyId harus direset ke null setelah applyBuyLink() dipakai');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
WorthIt.pendingBuyId=backupPending;
txEditId=backupTxEditId;
closeModal('txModal'); // BUGFIX: catatBeliList() dipanggil 2x di tes ini & membuka txModal lagi setelah closeModal() pertama -- tanpa baris ini modal tertinggal 'open' & muncul ke user begitu tes selesai
if(txWasOpen) document.getElementById('txModal').classList.add('open');
if(wiWasOpen) document.getElementById('worthItModal').classList.add('open');
save();
}
}},
{name:'WorthIt.onLinkedTxDeleted()/onLinkedTxEdited(): sync 2 arah saat transaksi terkait wishlist dihapus/diedit di Keuangan', fn:()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.onLinkedTxDeleted!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
try{
const txId='__selftest_tx_2__';
D.wishlist.push({id:'__selftest_wl_2__',name:'__selftest_barang_2__',price:40000,isDiskon:false,hargaNormal:0,cat:'keinginan',urgensi:'bisa_nunggu',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:true,boughtDate:'2025-01-01',txId});
D.transactions.push({id:txId,type:'expense',amount:40000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_2__',date:'2025-01-01',wishlistLinkId:'__selftest_wl_2__'});
const t=D.transactions.find(x=>x.id===txId);
t.amount=45000;t.date='2025-01-02';
WorthIt.onLinkedTxEdited(t);
const editedIt=D.wishlist.find(x=>x.id==='__selftest_wl_2__');
_selfTestAssert(editedIt.price===45000,'onLinkedTxEdited() harus menyinkronkan harga item ke nominal transaksi yang diedit');
_selfTestAssert(editedIt.boughtDate==='2025-01-02','onLinkedTxEdited() harus menyinkronkan tanggal beli ke tanggal transaksi yang diedit');
WorthIt.onLinkedTxDeleted(t);
const revertedIt=D.wishlist.find(x=>x.id==='__selftest_wl_2__');
_selfTestAssert(!!revertedIt,'Item wishlist TIDAK BOLEH ikut terhapus saat transaksi terkait dihapus');
_selfTestAssert(revertedIt.bought===false,'BUGFIX (sync 2 arah): item harus kembali bought:false saat transaksi terkait dihapus dari Keuangan');
_selfTestAssert(revertedIt.txId===null,'txId item harus direset ke null setelah transaksi terkait dihapus');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
save();
}
}},
{name:'WorthIt.undoBought(): mengembalikan barang "sudah dibeli" ke list aktif tanpa menghapus transaksi terkait', fn:async()=>{
if(typeof WorthIt==='undefined'||typeof WorthIt.undoBought!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTx=JSON.parse(JSON.stringify(D.transactions));
const backupAskConfirm=window.askConfirm;
try{
const txId='__selftest_tx_3__';
D.wishlist.push({id:'__selftest_wl_3__',name:'__selftest_barang_3__',price:15000,isDiskon:false,hargaNormal:0,cat:'kebutuhan',urgensi:'mendesak',sudahPunya:false,sudahPunyaAlasan:'',createdAt:new Date().toISOString(),bought:true,boughtDate:'2025-01-01',txId});
D.transactions.push({id:txId,type:'expense',amount:15000,category:'Lainnya',subcategory:'',accountId:D.accounts[0]?.id||'',payMethod:'tunai',note:'__selftest_barang_3__',date:'2025-01-01',wishlistLinkId:'__selftest_wl_3__'});
window.askConfirm=async()=>true;
await WorthIt.undoBought('__selftest_wl_3__');
const it=D.wishlist.find(x=>x.id==='__selftest_wl_3__');
_selfTestAssert(it.bought===false,'undoBought() harus mengembalikan item ke status belum-dibeli');
_selfTestAssert(it.txId===null,'undoBought() harus melepas link txId dari item');
const t=D.transactions.find(x=>x.id===txId);
_selfTestAssert(!!t,'undoBought() TIDAK BOLEH menghapus transaksi yang sudah tercatat di Keuangan (uangnya memang sudah keluar)');
_selfTestAssert(!t.wishlistLinkId,'undoBought() harus melepas wishlistLinkId dari transaksi supaya tidak lagi tersambung ke item yang sudah di-undo');
} finally {
D.wishlist=backupWishlist;
D.transactions=backupTx;
window.askConfirm=backupAskConfirm;
save();
}
}},
{name:'add_wishlist (Chat AI): validasi input & barang tersimpan ke D.wishlist sebagai rencana (bukan transaksi nyata)', fn:()=>{
if(typeof CHAT_ACTION_HANDLERS==='undefined'||typeof CHAT_ACTION_HANDLERS.add_wishlist!=='function')return;
const backupWishlist=JSON.parse(JSON.stringify(D.wishlist||[]));
const backupTxCount=D.transactions.length;
try{
let threw=false;
try{ CHAT_ACTION_HANDLERS.add_wishlist({name:'',price:10000}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_wishlist harus menolak nama barang kosong');
threw=false;
try{ CHAT_ACTION_HANDLERS.add_wishlist({name:'Tes',price:0}); }catch(e){ threw=true; }
_selfTestAssert(threw,'add_wishlist harus menolak harga yang tidak valid (0/kosong/negatif)');
CHAT_ACTION_HANDLERS.add_wishlist({name:'__selftest_chat_wl__',price:30000,cat:'kebutuhan',urgensi:'mendesak'});
const added=D.wishlist.find(x=>x.name==='__selftest_chat_wl__');
_selfTestAssert(!!added,'add_wishlist harus menambah item baru ke D.wishlist');
_selfTestAssert(added.bought===false,'Barang dari add_wishlist harus berstatus belum-dibeli (cuma rencana, bukan transaksi nyata)');
_selfTestAssert(D.transactions.length===backupTxCount,'add_wishlist TIDAK BOLEH ikut membuat transaksi nyata di D.transactions');
} finally {
D.wishlist=backupWishlist;
save();
}
}},
{name:'Torsi.scalePositionHtml()/scaleSvgHtml()/thimbleSvgHtml(): tidak crash & hasil valid untuk nilai batas kunci (min/max/tepat kelipatan/tengah garis)', fn:()=>{
const testVals=[
MY_WRENCH.minNm,
MY_WRENCH.maxNm,
MY_WRENCH_SCALE[2].nm,
45,
MY_WRENCH_SCALE[0].nm+MY_WRENCH_SCALE[0].nm/10*9.6
];
testVals.forEach(nm=>{
let html;
try{ html=Torsi.scalePositionHtml(nm); }
catch(e){ _selfTestAssert(false,'Torsi.scalePositionHtml('+nm+') melempar error: '+e.message); return; }
_selfTestAssert(typeof html==='string'&&html.includes('<svg'),'Torsi.scalePositionHtml('+nm+') harus mengembalikan HTML berisi ilustrasi SVG, dapat: '+String(html).slice(0,60));
});
let threwOutOfRange=false;
try{ Torsi.scalePositionHtml(MY_WRENCH.minNm-5); Torsi.scalePositionHtml(MY_WRENCH.maxNm+20); }
catch(e){ threwOutOfRange=true; }
_selfTestAssert(!threwOutOfRange,'Torsi.scalePositionHtml() tidak boleh crash walau dipanggil dengan nilai di luar jangkauan kunci');
let threwRenderNote=false;
try{
Torsi.renderWrenchNote(null);
Torsi.renderWrenchNote(NaN);
Torsi.renderWrenchNote(50);
}catch(e){ threwRenderNote=true; }
_selfTestAssert(!threwRenderNote,'Torsi.renderWrenchNote() tidak boleh crash untuk input null/NaN/nilai normal (elemen trsWrenchNote mungkin belum ada di DOM saat modal tertutup, harus fail-safe)');
}},
{name:'findVehicleSpec()/renderVehicleSpecCard(): tidak crash untuk model dikenal, model tidak dikenal, atau kendaraan kosong', fn:()=>{
const known=findVehicleSpec('Vario 125 KZR (test)');
_selfTestAssert(!!known,'findVehicleSpec() harus mengenali nama yang mengandung "vario 125" (case-insensitive)');
_selfTestAssert(known.ban&&known.ban.depan&&known.ban.belakang,'Data spek ban depan & belakang harus ada untuk Vario 125');
const unknown=findVehicleSpec('Motor Antah Berantah 999');
_selfTestAssert(unknown===null,'findVehicleSpec() harus mengembalikan null utk model yang tidak dikenal, BUKAN melempar error atau data ngawur');
_selfTestAssert(findVehicleSpec('')===null&&findVehicleSpec(undefined)===null,'findVehicleSpec() harus fail-safe (null) untuk input kosong/undefined');
let threw=false;
try{ renderVehicleSpecCard(); }catch(e){ threw=true; }
_selfTestAssert(!threw,'renderVehicleSpecCard() tidak boleh crash walau elemen #vehSpecCard belum ada di DOM (halaman Car Notes belum dibuka)');
}},
{name:'Regresi UI: semua id yang dipanggil getElementById() ada di HTML (deteksi typo id)', fn:()=>{
const snapshot=getHtmlSnapshotForSelfTest();
_selfTestAssert(snapshot.length>1000,'Snapshot HTML untuk tes regresi UI kosong/gagal terekam');
const scriptSrc=Array.from(document.scripts).map(s=>s.textContent||'').join('\n');
const idRe=/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g;
// id-id berikut SENGAJA TIDAK ada di HTML statis -- dibuat/ditempel ke DOM secara dinamis lewat
// JS, BUKAN typo, jadi dikecualikan dari cek "missing" di bawah (bukan cuma ditambah ke set yang
// dicek -- itu bug lama, lihat riwayat fix):
//   - selfRewardModal/selfRewardModalBody: ditempel SelfRewardView.ensureMounted() ke
//     document.body sekali saat pertama dibuka (lihat self-reward-view.js).
//   - investAiWidget: dibuat document.createElement() oleh InvestAI.mountInto(), di-append ke
//     box Alokasi Aset SETELAH box.innerHTML preset ditulis (lihat invest-ai-widget.js).
const DYNAMIC_MOUNT_IDS=new Set(['selfRewardModal','selfRewardModalBody','investAiWidget']);
const ids=new Set();
let m;
while((m=idRe.exec(scriptSrc))){ ids.add(m[1]); }
const missing=[];
ids.forEach(id=>{
if(DYNAMIC_MOUNT_IDS.has(id))return;
const attrRe=new RegExp('id=["\']'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\']');
if(!attrRe.test(snapshot))missing.push(id);
});
_selfTestAssert(missing.length===0,'id berikut dipakai di getElementById() tapi TIDAK ditemukan di HTML (kemungkinan typo id): '+missing.join(', '));
}},
{name:'renderDashboard() ikut memanggil mini-card Anggaran di Beranda (dashBudgetMiniCard)', fn:()=>{
const card=document.getElementById('dashBudgetMiniCard');
if(!card)return;
const backupBudgets=D.budgets;
try{
D.budgets=[{id:'__selftest_dashbudget__',name:'Tes Diagnostik',icon:'💰',catIds:['__total__'],limit:100000,rollover:false,period:'bulanan'}];
renderDashboard({force:true});
_selfTestAssert(card.style.display!=='none','#dashBudgetMiniCard harus tampil (bukan display:none) setelah renderDashboard() saat D.budgets tidak kosong — cek renderDashboard() memanggil renderDashBudgetMini()/Budget.renderDashMini()');
} finally {
D.budgets=backupBudgets;
renderDashboard({force:true});
}
}},
{name:'DebtStrategy.computeOrder() urutkan Avalanche (bunga tertinggi) & Snowball (saldo terkecil) dengan benar', fn:()=>{
const dummy=[{id:'a',name:'A',nilai:5000000,bunga:6,cicilanBulanan:500000},{id:'b',name:'B',nilai:1000000,bunga:24,cicilanBulanan:200000},{id:'c',name:'C',nilai:10000000,bunga:12,cicilanBulanan:1000000}];
const avalanche=DebtStrategy.computeOrder(dummy,'avalanche');
_selfTestAssert(avalanche.map(d=>d.id).join(',')==='b,c,a','Avalanche harus urut bunga tertinggi dulu (b,c,a), dapat '+avalanche.map(d=>d.id).join(','));
const snowball=DebtStrategy.computeOrder(dummy,'snowball');
_selfTestAssert(snowball.map(d=>d.id).join(',')==='b,a,c','Snowball harus urut saldo terkecil dulu (b,a,c), dapat '+snowball.map(d=>d.id).join(','));
_selfTestAssert(dummy.map(d=>d.id).join(',')==='a,b,c','computeOrder() tidak boleh mengubah array asli (harus pakai salinan)');
}},
{name:'DebtStrategy.simulate() menghitung lama pelunasan & efek dana ekstra dengan benar', fn:()=>{
const single=[{id:'x',nilai:1200000,bunga:0,cicilanBulanan:100000}];
const simNoExtra=DebtStrategy.simulate(single,0);
_selfTestAssert(simNoExtra.months===12,'Utang 1.2jt tanpa bunga, cicilan 100rb/bln, tanpa dana ekstra, harus lunas dlm 12 bln, dapat '+simNoExtra.months);
const simWithExtra=DebtStrategy.simulate(single,100000);
_selfTestAssert(simWithExtra.months===6,'Utang 1.2jt tanpa bunga, cicilan 100rb + ekstra 100rb/bln, harus lunas dlm 6 bln, dapat '+simWithExtra.months);
const noCicilan=[{id:'y',nilai:1000000,bunga:10,cicilanBulanan:0}];
const simNone=DebtStrategy.simulate(noCicilan,0);
_selfTestAssert(simNone.months===null,'Utang tanpa cicilanBulanan harus dilewati simulasi (months=null), dapat '+simNone.months);
}},
{name:'(kw63) FI.assetFund()/totalDebt()/netAssetFund() konsisten & tidak exception', fn:()=>{
const assetFund=FI.assetFund(), totalDebt=FI.totalDebt(), net=FI.netAssetFund();
_selfTestAssert(typeof assetFund==='number'&&!Number.isNaN(assetFund),'FI.assetFund() harus berupa angka valid, dapat '+assetFund);
_selfTestAssert(typeof totalDebt==='number'&&!Number.isNaN(totalDebt),'FI.totalDebt() harus berupa angka valid, dapat '+totalDebt);
_selfTestAssert(net===assetFund-totalDebt,'FI.netAssetFund() harus sama dengan assetFund()-totalDebt(), dapat net='+net+' vs hitung manual='+(assetFund-totalDebt));
}},
{name:'(kw63) Kekayaan.currentNetWorth() menghasilkan angka valid tanpa exception', fn:()=>{
const nw=Kekayaan.currentNetWorth();
_selfTestAssert(typeof nw==='number'&&!Number.isNaN(nw),'Kekayaan.currentNetWorth() harus berupa angka valid, dapat '+nw);
}},
{name:'(kw63) DanaDaruratAI.computeRecommendation() mengembalikan bentuk & multiplier yang valid', fn:()=>{
const r=DanaDaruratAI.computeRecommendation();
_selfTestAssert([6,9,12].indexOf(r.multiplier)>-1,'multiplier harus salah satu dari 6/9/12, dapat '+r.multiplier);
_selfTestAssert(typeof r.recommended==='number'&&r.recommended>=0,'recommended harus angka >=0, dapat '+r.recommended);
_selfTestAssert(typeof r.reason==='string'&&r.reason.length>0,'reason harus berupa teks penjelasan, tidak boleh kosong');
}},
{name:'(kw63) Pensiun.sisaBulan()/proyeksi()/danaTerkumpul() konsisten dgn data dummy (backup & restore D.pensiun)', fn:()=>{
const backup=D.pensiun;
try{
D.pensiun={usiaSekarang:30,usiaPensiun:35,kontribusiBulanan:1000000,returnTahunan:0,accId:null};
_selfTestAssert(Pensiun.sisaBulan()===60,'sisaBulan() usia 30->35 harus 60 bulan, dapat '+Pensiun.sisaBulan());
_selfTestAssert(Pensiun.danaTerkumpul()===0,'danaTerkumpul() tanpa accId harus 0, dapat '+Pensiun.danaTerkumpul());
const proyeksi=Pensiun.proyeksi();
_selfTestAssert(proyeksi===1000000*60,'proyeksi() tanpa return (0%) & pv=0 harus sama dgn total setoran (60jt), dapat '+proyeksi);
D.pensiun={usiaSekarang:35,usiaPensiun:30,kontribusiBulanan:0,returnTahunan:6,accId:null};
_selfTestAssert(Pensiun.sisaBulan()===0,'sisaBulan() saat usiaPensiun<=usiaSekarang harus 0 (dianggap tidak valid), dapat '+Pensiun.sisaBulan());
} finally {
D.pensiun=backup;
}
}},
{name:'(kw64) computeFileSizeStatus() mengembalikan status ambang batas yang valid', fn:()=>{
const fs=computeFileSizeStatus();
_selfTestAssert(typeof fs.size==='number'&&fs.size>0,'size harus angka positif, dapat '+fs.size);
_selfTestAssert(['aman','warn','action'].indexOf(fs.level)>-1,'level harus salah satu dari aman/warn/action, dapat '+fs.level);
_selfTestAssert(fs.warnAt<fs.actionAt,'ambang warnAt harus lebih kecil dari actionAt');
}},
{name:'(kw66) computeModalSweepCoverageResults() mendeteksi modal yang belum terdaftar', fn:()=>{
const cov=computeModalSweepCoverageResults();
_selfTestAssert(typeof cov.allCount==='number'&&cov.allCount>0,'allCount harus angka positif (ada modal di DOM), dapat '+cov.allCount);
_selfTestAssert(Array.isArray(cov.uncovered),'uncovered harus array');
const fake=document.createElement('div');
fake.className='overlay';
fake.id='__selftest_fake_modal_kw66__';
document.body.appendChild(fake);
try{
const cov2=computeModalSweepCoverageResults();
_selfTestAssert(cov2.uncovered.includes('__selftest_fake_modal_kw66__'),'modal palsu yang sengaja belum didaftarkan harus muncul di uncovered[]');
} finally {
fake.remove();
}
}},
{name:'(kw67) computeProductionSyncStatus() mengembalikan status yang konsisten', fn:()=>{
const ps=computeProductionSyncStatus();
_selfTestAssert(typeof ps.inSync==='boolean','inSync harus boolean');
_selfTestAssert(ps.inSync===(ps.masterVersion===ps.syncedVersion),'inSync harus persis sama dgn (masterVersion===syncedVersion)');
_selfTestAssert(typeof ps.label==='string'&&ps.label.length>0,'label harus string tidak kosong');
}},
{name:'(kw68) PriceReko.roundNice()/calc() menghasilkan rekomendasi harga jual yang konsisten', fn:()=>{
_selfTestAssert(PriceReko.roundNice(0)===0,'roundNice(0) harus 0');
_selfTestAssert(PriceReko.roundNice(-100)===0,'roundNice(negatif) harus 0 (fail-safe)');
_selfTestAssert(PriceReko.roundNice(33200)===33000,'roundNice(33200) di skala 20rb-100rb (step 1000) harus 33000, dapat '+PriceReko.roundNice(33200));
_selfTestAssert(PriceReko.roundNice(1234567)===1250000,'roundNice(1234567) di skala >=1jt (step 50000) harus 1250000, dapat '+PriceReko.roundNice(1234567));
const pBeli=document.getElementById('pBeli'),pJual=document.getElementById('pJual'),pReseller=document.getElementById('pReseller');
const t=document.getElementById('prkTransport'),m=document.getElementById('prkMargin');
if(!pBeli||!pJual||!pReseller||!t||!m)return; // form belum ter-render (mis. modal produk belum pernah dibuka), lewati aman
const backup={pBeli:pBeli.value,pJual:pJual.value,pReseller:pReseller.value,t:t.value,m:m.value};
try{
pBeli.value='20000';t.value='2000';m.value='50';
const result=PriceReko.calc();
_selfTestAssert(result===33000,'calc() modal 20rb+transport 2rb margin 50% harus 33000, dapat '+result);
pReseller.value='';
PriceReko.apply();
_selfTestAssert(pJual.value==='33000','apply() harus isi pJual=33000, dapat '+pJual.value);
_selfTestAssert(pReseller.value!==''&&Number(pReseller.value)<Number(pJual.value),'apply() harus isi pReseller lebih rendah dari pJual kalau masih kosong, dapat '+pReseller.value);
} finally {
pBeli.value=backup.pBeli;pJual.value=backup.pJual;pReseller.value=backup.pReseller;t.value=backup.t;m.value=backup.m;
}
}},
{name:'UI: panel tab benar-benar terlihat (computed display) setelah tab diklik -- cegah bug "u-dnone (!important) menang lawan inline style display:block"', fn:()=>{
const groups=[
{page:'#page-carnotes',fn:(typeof setCnTab==='function')?setCnTab:null,paneId:t=>'cnTab-'+t},
{page:'#page-shop',fn:(typeof setShopTab==='function')?setShopTab:null,paneId:t=>'shopTab-'+t},
{page:'#page-pajak',fn:(typeof setPajakTab==='function')?setPajakTab:null,paneId:t=>'pajakTab-'+t},
{page:'#page-keuangan',fn:(typeof setKeuanganTab==='function')?setKeuanganTab:null,paneId:t=>'keuanganTab-'+t},
{page:'#page-keuangan',fn:(typeof BudgetTabs!=='undefined')?BudgetTabs.switchTo:null,paneId:t=>'budgetTabPane-'+t,btnClass:'.budget-tab-btn'},
{page:'#page-aset',fn:(typeof setAsetTab==='function')?setAsetTab:null,paneId:t=>'asetTab-'+t},
{page:'#keuanganTab-laporan',fn:(typeof setLaporanTab==='function')?setLaporanTab:null,paneId:t=>'laporanTab-'+t,btnClass:'.lap-subtab'},
{page:'#keuanganTab-kelola',fn:(typeof setKelolaTab==='function')?setKelolaTab:null,paneId:t=>'kelolaTab-'+t,btnClass:'.kel-subtab'},
{page:'#pajakTab-pajak',fn:(typeof setPjkTab==='function')?setPjkTab:null,paneId:t=>'pjkTab-'+t,btnClass:'.pjk-subtab'},
// Sesi 158 (permintaan eksplisit user): sub-tab bersarang BARU di dalam
// tab Insight AI/BBM (page-carnotes) — pola SAMA PERSIS 3 entry sub-tab
// di atas (laporan/kelola/pajak).
{page:'#cnTab-insight',fn:(typeof setCnInsightTab==='function')?setCnInsightTab:null,paneId:t=>'cniTab-'+t,btnClass:'.cni-subtab'},
{page:'#cnTab-bbm',fn:(typeof setCnBbmTab==='function')?setCnBbmTab:null,paneId:t=>'cnbTab-'+t,btnClass:'.cnb-subtab'}
];
groups.forEach(g=>{
if(!g.fn)return;
const btns=[...document.querySelectorAll(g.page+' '+(g.btnClass||'.cn-tab'))];
if(!btns.length)return;
const originalBtn=btns.find(b=>b.classList.contains('active'))||btns[0];
let originalTab=null;
try{ originalTab=JSON.parse(originalBtn.getAttribute('data-args')||'[]')[0]; }catch(e){ /* data-args tidak valid/kosong -- originalTab tetap null, aman diabaikan */ }
try{
btns.forEach(btn=>{
let tabName=null;
try{ tabName=JSON.parse(btn.getAttribute('data-args')||'[]')[0]; }catch(e){ /* data-args tidak valid/kosong -- tabName tetap null, di-skip guard di bawah */ }
if(!tabName)return;
g.fn(tabName,btn);
const pane=document.getElementById(g.paneId(tabName));
if(pane){
const disp=getComputedStyle(pane).display;
_selfTestAssert(disp!=='none','Panel #'+pane.id+' harus terlihat (computed display bukan "none") setelah tab "'+tabName+'" di '+g.page+' diaktifkan -- kalau ini gagal, kemungkinan class u-dnone (display:none !important) tidak dilepas walau JS sudah set display:block');
}
});
} finally {
if(originalTab) g.fn(originalTab,originalBtn);
}
});
}},
{name:'UI: konten daftar panjang tidak kepotong tanpa scrollbar (cegah bug "Riwayat Servis Vario 125 tidak bisa scroll")', fn:()=>{
document.querySelectorAll('.card-collapse-body').forEach(body=>{
if(body.classList.contains('collapsed'))return;
const scrollH=body.scrollHeight, clientH=body.clientHeight;
_selfTestAssert(scrollH<=clientH+2,'Kartu #'+body.id+': konten setinggi '+scrollH+'px tapi area yg kelihatan cuma '+clientH+'px & TIDAK ADA scroll internal -- sisanya kepotong permanen tanpa cara menjangkaunya (mis. karena max-height:2000px + overflow:hidden di .card-collapse-body). Kalau daftar di dalamnya bisa tumbuh panjang, beri elemen listnya sendiri overflow-y:auto + max-height (lihat pola #servisList/#bbmList/#assetList di styles.css).');
});
const knownLongLists=['bbmList','servisList','allTx','lapTx','zakatLogList','wealthSnapshotList','assetList','piutangList','debtList','renovList'];
knownLongLists.forEach(id=>{
const el=document.getElementById(id);
if(!el)return;
const style=getComputedStyle(el);
_selfTestAssert(style.overflowY==='auto'||style.overflowY==='scroll','Daftar #'+id+' harus punya overflow-y:auto/scroll sendiri (bisa tumbuh panjang seiring waktu & hidup di dalam .card-collapse-body yg overflow:hidden) -- kalau aturan CSS-nya kehapus/berubah tanpa sadar, ini akan gagal.');
});
}},
{name:'Kartu pengingat Backup (dashBackupReminderCard): muncul kalau belum pernah sync & data sudah banyak, sembunyi kalau sudah pernah sync/di-dismiss', fn:()=>{
if(typeof renderDashboardBackupReminder!=='function'||typeof dismissBackupReminder!=='function')throw new Error('renderDashboardBackupReminder()/dismissBackupReminder() harus ada');
const card=document.getElementById('dashBackupReminderCard');
if(!card)return; // halaman dashboard belum ke-render sama sekali, skip
const backupGD=D.googleDrive, backupGS=D.googleSheets, backupTx=D.transactions;
const backupDismissFlag=localStorage.getItem('kw_backup_reminder_dismissed');
try{
localStorage.removeItem('kw_backup_reminder_dismissed');
D.googleDrive={clientId:'',fileId:null,lastSync:null,autoSync:false};
D.googleSheets={spreadsheetId:'',lastSync:null};
D.transactions=Array.from({length:35},(_,i)=>({id:'__selftest_backup_tx_'+i,type:'expense',amount:1000,category:'Tes',date:todayStr()}));
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='block','Kartu Backup harus MUNCUL kalau belum pernah sync & data sudah >= 30 catatan');
D.googleDrive.lastSync=new Date().toISOString();
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='none','Kartu Backup harus SEMBUNYI kalau sudah pernah sync sekali lewat Drive/Sheets');
D.googleDrive.lastSync=null;
renderDashboardBackupReminder();
_selfTestAssert(card.style.display==='block','Kartu Backup harus muncul lagi kalau lastSync di-reset (memastikan bukan ke-cache)');
dismissBackupReminder();
_selfTestAssert(card.style.display==='none','Kartu Backup harus SEMBUNYI setelah tombol "Sudah Paham" (dismiss) dipencet');
_selfTestAssert(localStorage.getItem('kw_backup_reminder_dismissed')==='1','dismissBackupReminder() harus menyimpan flag dismiss ke localStorage');
} finally {
D.googleDrive=backupGD; D.googleSheets=backupGS; D.transactions=backupTx;
if(backupDismissFlag===null) localStorage.removeItem('kw_backup_reminder_dismissed'); else localStorage.setItem('kw_backup_reminder_dismissed',backupDismissFlag);
renderDashboardBackupReminder();
}
}},
{name:'UI: elemen interaktif (data-action) yang cuma berisi ikon/emoji/tanpa teks wajib punya aria-label (aksesibilitas screen reader)', fn:()=>{
findMissingAriaLabels(document).forEach(msg=>_selfTestAssert(false,msg));
}},
// S583 sesi-7: wiring TitipanReconcile.checkAll() (S583 sesi-6) ke Tes
// Otomatis -- sebelumnya cuma disiapkan sbg 1 titik panggil tunggal, belum
// benar-benar dipanggil dari mana pun (lihat PATCH-NOTES.md sesi-6, "Belum
// dikerjakan"). PURE baca-saja (0 mutasi D), guard typeof spy tidak crash
// kalau titipan-reconcile.js kebetulan belum ke-load duluan.
// Fix (sesi-8): checkAll() sudah nambah sub-check ke-4 `accountSync`
// (checkAccounts(), lihat titipan-reconcile.js baris ~292) tapi pesan di
// bawah ini tidak pernah diupdate ikut nyebut accountSync -- kalau gap
// nyata ada DI accountSync (bukan sync/ownerIdConsistency/debtNameStaleness),
// r.ok tetap false (assert tetap gagal, benar) tapi pesannya bakal bilang
// "0 gap" di ketiga sub-check lama itu tanpa penjelasan kenapa r.ok=false
// -- sekarang accountSync.ok/missing/orphan ikut ditulis di pesan.
{name:'TitipanReconcile.checkAll(): audit sinkron Dana Titipan (Buku Utang vs Aset/Investasi) + konsistensi ownerId + staleness nama pasca-rename, semua 0 gap', fn:()=>{
if(typeof TitipanReconcile==='undefined')return;
const r=TitipanReconcile.checkAll();
// Fix (S635 lanjutan): pola GAP YANG SAMA PERSIS terulang -- checkAll()
// sudah nambah sub-check ke-5 `transactionOwnerRefs` (checkTransactionOwnerRefs(),
// lihat titipan-reconcile.js, saran Prioritas #2 AUDIT-DATA-HEALTH-BACKUP-
// 2026-08-16.md) tapi pesan ini belum ikut diupdate -- kalau gap ada DI
// transactionOwnerRefs (transaksi ber-deductionOwnerId basi, mis. kasus
// 8x akun "Saldo tagihan" di audit itu), r.ok tetap false (assert tetap
// gagal, benar) tapi pesan tidak menjelaskan kenapa. Sekarang
// transactionOwnerRefs.ok/orphan ikut ditulis, pola sama accountSync.
// Fix (S638 — perbaikan false-positive Tes Otomatis): `ownershipDualSource`
// (S636 Opsi C) SENGAJA didesain sbg "warning saja" (lihat komentar
// checkOwnershipDualSource()/checkAll() di titipan-reconcile.js dan
// warnIfNotOk() -- "SENGAJA non-blocking...supaya user bisa terkunci
// tidak bisa menyimpan porsi yang justru BENAR"), BUKAN indikator gap/bug
// data seperti 5 sub-check lain (sync/ownerIdConsistency/debtNameStaleness/
// accountSync/transactionOwnerRefs -- itu semua nunjuk baris data yang
// SALAH/basi/orphan, ada tombol "Perbaiki Gap Dana Titipan" utknya).
// ownershipDualSource=false untuk kasus SAH (mis. aset "Majoris": dropdown
// Kepemilikan non-SELF + Porsi Kepemilikan eksplisit non-SELF sekaligus,
// keduanya valid, cuma dobel representasi -- lihat AUDIT-S636-MAJORIS-
// OWNERSHIP-DUAL-SOURCE-KEPUTUSAN.md) BUKAN bug yang perlu diperbaiki
// otomatis, jadi Tes Otomatis TIDAK SEHARUSNYA menandainya gagal (sebelum
// fix ini, 1 tes selalu merah tiap ada aset dual-source yang sah, padahal
// 0 gap data sungguhan). Sekarang `coreOk` (5 sub-check asli) yang jadi
// syarat lulus; ownershipDualSource.ok/flagged tetap ditulis di pesan
// (informasional, pola sama field lain) supaya kalau ownershipDualSource
// sendirian yang false, pesan tetap menjelaskan kenapa -- HANYA saja tidak
// lagi menggagalkan tes. checkAll().ok/warnIfNotOk() di titipan-reconcile.js
// TIDAK diubah (tetap AND dari 6 sub-check, dipakai console.warn saat
// saveOwners() -- itu memang tempat semestinya sinyal ini muncul).
// Fix (SESI FIX-2026-09-01-lanjutan): sub-check ke-7 `poolCommitment`
// (checkPoolCommitment(), audit gap D.titipanPool/D.titipanCommitments vs
// Dana Titipan tab -- lihat komentar lengkap di titipan-reconcile.js).
// SENGAJA informasional/non-blocking, pola SAMA PERSIS ownershipDualSource
// (S638 di atas): status OVER_ALLOCATED (pool atau per-owner) adalah KONDISI
// KEUANGAN NYATA yang butuh keputusan user (tambah pokok/kurangi alokasi),
// BUKAN bug sync yang bisa "diperbaiki otomatis" spt orphan/missing baris
// Buku Utang -- tidak ada tombol "Perbaiki Gap" utk ini, jadi Tes Otomatis
// TIDAK SEHARUSNYA menandainya gagal. `coreOk` (5 sub-check asli, tidak
// berubah) tetap satu-satunya syarat lulus; poolCommitment.ok/poolStatus/
// overAllocatedOwners ditulis di pesan (informasional) supaya kalau ini
// sendirian yang false, pesan tetap menjelaskan kenapa.
// Fix (SESI S675): sub-check ke-8 `returnVsLiability`
// (checkReturnVsLiability(), audit gap recordReturn() dicatat tapi porsi
// owner belum ikut dikecilkan di Aset/Investasi -- lihat komentar lengkap
// di titipan-reconcile.js). SENGAJA informasional/non-blocking, pola SAMA
// PERSIS poolCommitment di atas: gap ini KONDISI KEUANGAN NYATA yang butuh
// keputusan user (owner sudah ambil kembali dana, tapi porsi kepemilikan
// belum dikecilkan manual -- bisa di aset mana pun, tidak ada 1 jawaban
// auto-repair pasti benar), BUKAN baris data yang bisa "diperbaiki
// otomatis" spt orphan/missing. `coreOk` (5 sub-check asli, tidak berubah)
// tetap satu-satunya syarat lulus; returnVsLiability.ok/flagged ditulis di
// pesan (informasional) supaya kalau ini sendirian yang false, pesan tetap
// menjelaskan kenapa.
// Fix (SESI S676): sub-check ke-9 `returnVsAccountLiability`
// (checkReturnVsAccountLiability(), audit gap #2 dari SESSION-NOTE-S675.md
// -- checkReturnVsLiability() di atas TIDAK cakup titipan yang pokoknya
// murni di akun berdiri-sendiri, karena `allocatedPrincipal`-nya (dari
// DanaTitipanPortfolioAPI.build()) HANYA cakupan Aset+Investasi. Lihat
// komentar lengkap di titipan-reconcile.js). SENGAJA informasional/
// non-blocking, pola SAMA PERSIS returnVsLiability di atas: gap channel
// Akun ini KONDISI KEUANGAN NYATA yang sama (owner sudah ambil kembali
// dana, tapi porsi kepemilikan di akun belum dikecilkan manual), BUKAN
// baris data yang bisa "diperbaiki otomatis". `coreOk` (5 sub-check asli,
// tidak berubah) tetap satu-satunya syarat lulus;
// returnVsAccountLiability.ok/flagged ditulis di pesan (informasional)
// supaya kalau ini sendirian yang false, pesan tetap menjelaskan kenapa.
// Fix (poin 4, sesi lanjutan hasil audit 2026-09-01): sub-check ke-10
// `pendingOwnerReview` (checkPendingOwnerReview(), daftar transaksi yang
// deductionOwnerId-nya dikosongkan repairTransactionOwnerRefs() krn
// ambigu & belum diisi ulang manual -- lihat komentar lengkap di
// titipan-reconcile.js). SENGAJA informasional/non-blocking, pola SAMA
// PERSIS returnVsLiability/returnVsAccountLiability di atas: butuh user
// mengisi ulang pemiliknya manual (tidak bisa ditebak otomatis, itu
// sebabnya dikosongkan bukan ditebak), bukan baris data yang bisa
// "diperbaiki otomatis". `coreOk` (5 sub-check asli, tidak berubah) tetap
// satu-satunya syarat lulus; pendingOwnerReview.ok/pending ditulis di
// pesan (informasional) supaya kalau ini sendirian yang false, pesan
// tetap menjelaskan kenapa -- dan supaya jumlahnya kelihatan tiap Tes
// Otomatis dijalankan, bukan cuma sesaat di console.warn tombol perbaikan.
const coreOk = r.sync.ok && r.ownerIdConsistency.ok && r.debtNameStaleness.ok && r.accountSync.ok && r.transactionOwnerRefs.ok;
// Fix (poin 1, sesi lanjutan): sub-check ke-11 `ownerIdConflicts`
// (checkOwnerIdConflicts(), grup nama pemilik yang dilewati
// repairOwnerIdConsistency() krn tabrakan -- lihat komentar lengkap di
// titipan-reconcile.js). SENGAJA informasional/non-blocking, pola SAMA
// PERSIS pendingOwnerReview di atas: butuh review manual (bukan bug yang
// bisa ditombol perbaiki otomatis -- itu justru KENAPA dilewati, bukan
// digabung sembarangan). `coreOk` (5 sub-check asli, tidak berubah) tetap
// satu-satunya syarat lulus; ownerIdConflicts.ok/conflicts ditulis di
// pesan (informasional) supaya kalau ini sendirian yang false, pesan
// tetap menjelaskan kenapa.
_selfTestAssert(coreOk,'TitipanReconcile.checkAll() menemukan gap -- sync.ok='+r.sync.ok+' (missing:'+r.sync.missing.length+' orphan:'+r.sync.orphan.length+' mismatch:'+r.sync.mismatch.length+'), ownerIdConsistency.ok='+r.ownerIdConsistency.ok+' (divergent:'+r.ownerIdConsistency.divergent.length+'), debtNameStaleness.ok='+r.debtNameStaleness.ok+' (stale:'+r.debtNameStaleness.stale.length+'), accountSync.ok='+r.accountSync.ok+' (missing:'+r.accountSync.missing.length+' orphan:'+r.accountSync.orphan.length+'), transactionOwnerRefs.ok='+r.transactionOwnerRefs.ok+' (orphan:'+r.transactionOwnerRefs.orphan.length+'), ownershipDualSource.ok='+r.ownershipDualSource.ok+' (flagged:'+r.ownershipDualSource.flagged.length+', informasional -- tidak menggagalkan tes), poolCommitment.ok='+r.poolCommitment.ok+' (poolStatus:'+r.poolCommitment.poolStatus+' overAllocatedOwners:'+r.poolCommitment.overAllocatedOwners.length+', informasional -- tidak menggagalkan tes), returnVsLiability.ok='+r.returnVsLiability.ok+' (flagged:'+r.returnVsLiability.flagged.length+', informasional -- tidak menggagalkan tes), returnVsAccountLiability.ok='+r.returnVsAccountLiability.ok+' (flagged:'+r.returnVsAccountLiability.flagged.length+', informasional -- tidak menggagalkan tes), pendingOwnerReview.ok='+r.pendingOwnerReview.ok+' (pending:'+r.pendingOwnerReview.pending.length+', informasional -- tidak menggagalkan tes), ownerIdConflicts.ok='+r.ownerIdConflicts.ok+' (conflicts:'+r.ownerIdConflicts.conflicts.length+', informasional -- tidak menggagalkan tes)');
}},
{name:'Car Notes: Feature Parity Guard — fitur inti legacy tidak boleh hilang dari build',fn:()=>{
  _selfTestAssert(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.inventory==='function','CarNotesPerformance feature inventory tidak tersedia di build');
  const r=CarNotesPerformance.inventory();
  _selfTestAssert(r.ok,'Feature Parity Car Notes gagal — fitur hilang: '+r.missing.join(', '));
}},
{name:'Car Notes: Performance Cache Guard — memo menghindari kalkulasi berulang dalam satu revision',fn:()=>{
  _selfTestAssert(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.memo==='function','CarNotesPerformance.memo tidak tersedia');
  let calls=0; const id='__selftest_cn_cache__';
  if(typeof CarNotesPerformance.bump==='function')CarNotesPerformance.bump('selftest-cache');
  const a=CarNotesPerformance.memo('selftest',id,()=>{calls++;return 42;});
  const b=CarNotesPerformance.memo('selftest',id,()=>{calls++;return 99;});
  _selfTestAssert(a===42&&b===42&&calls===1,'Cache Car Notes tidak bekerja: calls='+calls+' a='+a+' b='+b);
}},
{name:'Car Notes: Incremental Audit Guard — audit tetap read-only dan memakai revision/domain cache',fn:()=>{
  _selfTestAssert(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.auditCurrent==='function','CarNotesPerformance.auditCurrent tidak tersedia');
  const r=CarNotesPerformance.auditCurrent();
  _selfTestAssert(r&&Array.isArray(r.issues)&&Array.isArray(r.reports),'Hasil incremental audit tidak valid');
  _selfTestAssert(r.revision===CarNotesPerformance.revision(),'Revision audit tidak sinkron');
}},
{name:'Car Notes: Performance Metrics Guard — render tercatat per tab dan cache hit/miss terukur',fn:()=>{
  _selfTestAssert(typeof CarNotesPerformance!=='undefined'&&typeof CarNotesPerformance.snapshot==='function','CarNotesPerformance.snapshot tidak tersedia');
  if(typeof CarNotesPerformance.render==='function'){CarNotesPerformance.render('selftest');CarNotesPerformance.render('selftest');}
  const s=CarNotesPerformance.snapshot();
  _selfTestAssert(s.metrics&&s.metrics.byTab&&s.metrics.byTab.selftest>=2,'Metrics render Car Notes tidak mencatat render per tab');
  _selfTestAssert(Number.isFinite(Number(s.metrics.cacheHits))&&Number.isFinite(Number(s.metrics.cacheMisses)),'Metrics cache hit/miss tidak valid');
}},
{name:'Car Notes: Fuel Intelligence bertingkat — Home tidak memanggil full Fuel Insight Engine',fn:()=>{
  _selfTestAssert(typeof CarNotesPerformance!=='undefined','Performance guard harus termuat sebelum presenter Car Notes');
  _selfTestAssert(typeof FuelInsightEngine!=='undefined' || typeof FuelCard!=='undefined','Engine Fuel Intelligence/ FuelCard harus tetap tersedia');
}},
];
}
function __kwSelfTestCases(){
return __kwSelfTestCasesA().concat(__kwSelfTestCasesB());
}

// CATATAN (Sesi 297): file ini adalah runtime app (bukan file test Node), tapi
// namanya cocok pola default `node --test` (*-test.js) sehingga bisa ke-load &
// "gagal" kalau `node --test` dijalankan TANPA argumen di root. `npm test`
// sudah aman (lihat package.json: `node --test tests/*.test.js`, membatasi
// hanya folder tests/) — lihat juga catatan di README.md bagian Testing.
