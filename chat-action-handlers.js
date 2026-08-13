// chat-action-handlers.js — Aksi AI Chat/RefAI: label & handler eksekusi usulan aksi dari balasan AI (blok [[ACTION]]).
// Dipisah dari features-budget-laporan-carnotes-pelanggan.js (Sesi 7 restrukturisasi folder — file lama SELESAI dihapus total, lihat docs/FILE-MAP.md & RENCANA-SESI.md). Fase 1 restrukturisasi (pecah 3 god-file) SELESAI di sesi ini.
// Isi: MODULE_FEATURES_VERSION (konstanta versi, dicek sinkron oleh diagnostik-versi.js) + CHAT_ACTION_LABELS (label tombol usul per tipe aksi) + CHAT_ACTION_HANDLERS (eksekusi nyata tiap tipe aksi ke D.*, dipanggil dari chat-action.js via chatActionInnerHTML/extractChatAction) + CHAT_ACTION_EDIT_FIELDS (skema field utk form edit usulan sebelum dieksekusi).
// PENTING: dimuat di GROUP_A build.js, tepat di posisi lama features-budget-laporan-carnotes-pelanggan.js (setelah car-notes.js, sebelum edukasi-dana.js) — urutan load antar file GROUP_A jangan diubah sembarangan.

const MODULE_FEATURES_VERSION='s593-ghost-asset-cleanup-owner-settings-buildfix';
const CHAT_ACTION_LABELS={add_transaksi:'💸 Usul: Tambah Transaksi',add_tagihan:'🧾 Usul: Tambah Tagihan/Cicilan',add_servis:'🔧 Usul: Catat Servis Kendaraan',add_target:'🎯 Usul: Tambah Target Tabungan',add_catatan_anak:'👶 Usul: Catat soal Anak',add_wishlist:'📋 Usul: Tambah ke Prioritas Belanja'};
const CHAT_ACTION_HANDLERS={
add_transaksi(data){
const type=(data.type==='income')?'income':'expense';
const amount=Math.round(Number(data.amount));
if(!amount||amount<=0)throw new Error('Nominal tidak valid');
const accountId=(D.accounts.find(a=>data.accountName&&a.name&&a.name.toLowerCase().includes(String(data.accountName).toLowerCase()))||D.accounts[0])?.id;
D.transactions.push({id:uid(),type,amount,category:data.category||'Lainnya',subcategory:data.subcategory||'',accountId,payMethod:'tunai',note:data.note||'',date:(data.date&&!isNaN(new Date(data.date).getTime()))?data.date:new Date().toISOString().split('T')[0]});
save();refreshCurrentPage();
return `Transaksi ${type==='income'?'pemasukan':'pengeluaran'} ${fmtFull(amount)} (${data.category||'Lainnya'}) tersimpan`;
},
add_tagihan(data){
const amount=Math.round(Number(data.amount));
if(!amount||amount<=0)throw new Error('Nominal tidak valid');
if(!data.nextDue||isNaN(new Date(data.nextDue).getTime()))throw new Error('Tanggal jatuh tempo tidak valid, format harus YYYY-MM-DD');
D.bills.push({id:uid(),name:data.name||'Tagihan',amount,nextDue:data.nextDue,freq:data.freq||'bulanan',category:data.category||'Tagihan',subcategory:'',accountId:D.accounts[0]?.id||null,note:data.note||'',kind:data.kind||'tagihan'});
save();refreshCurrentPage();
return `Tagihan "${data.name||'Tagihan'}" ${fmtFull(amount)} (jatuh tempo ${data.nextDue}) tersimpan`;
},
add_servis(data){
const cost=Math.round(Number(data.cost));
if(!cost||cost<=0)throw new Error('Biaya tidak valid');
let veh=D.vehicles.find(v=>v.id===data.vehicleId);
if(!veh&&data.vehicleName)veh=D.vehicles.find(v=>v.name.toLowerCase().includes(String(data.vehicleName).toLowerCase()));
if(!veh&&D.vehicles.length===1)veh=D.vehicles[0];
if(!veh)throw new Error('Kendaraan tidak dikenali, sebutkan namanya lebih jelas ya');
const date=(data.date&&!isNaN(new Date(data.date).getTime()))?data.date:new Date().toISOString().split('T')[0];
const accId=D.accounts[0]?.id||'';
const txId=uid(),servisId=uid();
D.transactions.push({id:txId,type:'expense',amount:cost,category:resolveVehicleTxCategory(veh),subcategory:'Servis & Oli',accountId:accId,payMethod:'tunai',note:(data.item||'Servis')+' - '+veh.name,date,servisLinkId:servisId});
D.servisLogs.push({id:servisId,vehicleId:veh.id,date,item:data.item||'Servis',categoryId:null,km:data.km?Number(data.km):null,cost,note:data.note||'',accountId:accId,txLinkId:txId});
save();refreshCurrentPage();renderDashboardServisReminder();
return `Servis "${data.item||'Servis'}" untuk ${veh.name} ${fmtFull(cost)} tersimpan`;
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
D.catatan.anak.push({id:uid(),date:(data.date&&!isNaN(new Date(data.date).getTime()))?data.date:new Date().toISOString().split('T')[0],text:String(data.text).trim()});
save();refreshCurrentPage();
return `Catatan anak tersimpan: "${String(data.text).trim()}"`;
}
};
const CHAT_ACTION_EDIT_FIELDS={
add_transaksi:[
{key:'type',label:'Jenis',type:'select',options:[['expense','Pengeluaran'],['income','Pemasukan']]},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'category',label:'Kategori',type:'text'},
{key:'note',label:'Catatan',type:'text'},
{key:'date',label:'Tanggal',type:'date'},
],
add_tagihan:[
{key:'name',label:'Nama Tagihan',type:'text'},
{key:'amount',label:'Nominal (Rp)',type:'number'},
{key:'nextDue',label:'Jatuh Tempo',type:'date'},
{key:'freq',label:'Frekuensi',type:'select',options:[['bulanan','Bulanan'],['tahunan','Tahunan'],['sekali','Sekali']]},
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
