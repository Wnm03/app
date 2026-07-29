// sheets-schema.js — Skema kolom Google Sheets per modul (SHEETS_SCHEMAS/SHEETS_MODULES) &
// helper konversi item<->baris (sheetsHeaderFor/sheetsItemToCells/sheetsCellsToItem dst),
// dipakai oleh sheets-sync.js. Dipisah dari features-aiwidget-reminder-gdrive-search.js
// (Sesi 5 restrukturisasi folder, blok 4 — lihat AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan
// ulang file, BUKAN perubahan perilaku.

const SHEETS_SCHEMAS={
bbmLogs:[
{key:'vehicleId',type:'string'},
{key:'date',type:'string'},
{key:'km',type:'number'},
{key:'liter',type:'number'},
{key:'harga',type:'number'},
{key:'cost',type:'number'},
{key:'spbu',type:'string'},
{key:'fullTank',type:'boolean'},
{key:'note',type:'string'},
{key:'accountId',type:'string'},
{key:'txLinkId',type:'string'},
],
servisLogs:[
{key:'vehicleId',type:'string'},
{key:'date',type:'string'},
{key:'item',type:'string'},
{key:'categoryId',type:'string'},
{key:'km',type:'number'},
{key:'cost',type:'number'},
{key:'note',type:'string'},
{key:'accountId',type:'string'},
{key:'txLinkId',type:'string'},
{key:'usedPartId',type:'string'},
{key:'usedPartQty',type:'number'},
],
kmLogs:[
{key:'vehicleId',type:'string'},
{key:'date',type:'string'},
{key:'km',type:'number'},
{key:'note',type:'string'},
],
partsStock:[
{key:'name',type:'string'},
{key:'catId',type:'string'},
{key:'code',type:'string'},
{key:'qty',type:'number'},
{key:'unit',type:'string'},
{key:'minStock',type:'number'},
{key:'price',type:'number'},
{key:'note',type:'string'},
],
products:[
{key:'name',type:'string'},
{key:'stock',type:'number'},
{key:'kategoriId',type:'string'},
{key:'produsenId',type:'string'},
{key:'hargaBeli',type:'number'},
{key:'hargaJual',type:'number'},
{key:'hargaReseller',type:'number'},
{key:'diskonPersen',type:'number'},
{key:'hargaByProdusen',type:'json'},
],
cobek:[
{key:'date',type:'string'},
{key:'items',type:'json'},
{key:'priceType',type:'string'},
{key:'customer',type:'json'},
{key:'subtotal',type:'number'},
{key:'diskon',type:'number'},
{key:'ongkir',type:'number'},
{key:'total',type:'number'},
{key:'profit',type:'number'},
{key:'accountId',type:'string'},
{key:'txLinkId',type:'string'},
{key:'delivered',type:'boolean'},
{key:'note',type:'string'},
],
transactions:[
{key:'type',type:'string'},
{key:'amount',type:'number'},
{key:'category',type:'string'},
{key:'subcategory',type:'string'},
{key:'accountId',type:'string'},
{key:'payMethod',type:'string'},
{key:'note',type:'string'},
{key:'date',type:'string'},
{key:'billLinkId',type:'string'},
{key:'stockProductId',type:'string'},
{key:'stockQty',type:'number'},
{key:'stockItems',type:'json'},
{key:'produsenId',type:'string'},
{key:'kategoriId',type:'string'},
{key:'cobekLinkId',type:'string'},
{key:'bbmLinkId',type:'string'},
{key:'servisLinkId',type:'string'},
],
bills:[
{key:'name',type:'string'},
{key:'amount',type:'number'},
{key:'nextDue',type:'string'},
{key:'freq',type:'string'},
{key:'sisaTenor',type:'number'},
{key:'category',type:'string'},
{key:'subcategory',type:'string'},
{key:'accountId',type:'string'},
{key:'note',type:'string'},
{key:'kind',type:'string'},
{key:'totalHarga',type:'number'},
{key:'tenor',type:'number'},
{key:'bunga',type:'number'},
{key:'shared',type:'boolean'},
{key:'sharedPct',type:'number'},
{key:'totalAmount',type:'number'},
{key:'taxLink',type:'json'},
],
targets:[
{key:'name',type:'string'},
{key:'amount',type:'number'},
{key:'saved',type:'number'},
{key:'accountId',type:'string'},
{key:'emoji',type:'string'},
{key:'isDanaDarurat',type:'boolean'},
],
eduFunds:[
{key:'name',type:'string'},
{key:'biayaHariIni',type:'number'},
{key:'tahunTarget',type:'number'},
{key:'inflasi',type:'number'},
{key:'returnAsumsi',type:'number'},
{key:'accountId',type:'string'},
{key:'terkumpul',type:'number'},
],
workDays:[
{key:'date',type:'string'},
{key:'masuk',type:'string'},
{key:'pulang',type:'string'},
{key:'istMulai',type:'string'},
{key:'istSelesai',type:'string'},
{key:'istirahatMin',type:'number'},
{key:'totalJam',type:'number'},
{key:'jamLembur',type:'number'},
{key:'jenis',type:'string'},
{key:'pokok',type:'number'},
{key:'lembur',type:'number'},
{key:'total',type:'number'},
{key:'gajiHariInput',type:'number'},
],
simList:[
{key:'nama',type:'string'},
{key:'jenis',type:'string'},
{key:'tglAkhir',type:'string'},
],
tukangWorkers:[
{key:'name',type:'string'},
{key:'upahJam',type:'number'},
{key:'jamKerjaNormal',type:'number'},
{key:'upahLemburJam',type:'number'},
],
gajiMingguanHistory:[
{key:'weekStart',type:'string'},
{key:'weekEnd',type:'string'},
{key:'total',type:'number'},
{key:'count',type:'number'},
{key:'resetDate',type:'string'},
{key:'incomeSaved',type:'boolean'},
],
};
const SHEETS_MODULES=['transactions','cobek','bbmLogs','servisLogs','kmLogs','partsStock','products','bills','targets','eduFunds','workDays','simList','tukangWorkers','tukangAbsensi','gajiMingguanHistory'];
// FIX (lihat CHANGELOG): dulu tertulis 'shop' di sini, padahal D TIDAK PUNYA field
// bernama 'shop' (data asli ada di D.cobek) dan SHEETS_SCHEMAS juga tidak punya
// entry 'shop' -- akibatnya tab "shop" di Spreadsheet SELALU KOSONG (0 baris)
// walau kelihatan terdaftar sbg modul yg disync. 'tukangAbsensi' sengaja TIDAK
// didaftarkan di SHEETS_SCHEMAS di atas (bentuk datanya variatif tergantung mode
// 'jam'/'borongan') -- otomatis fallback ke 1 kolom JSON (lihat sheetsItemToCells),
// itu perilaku yang sudah didukung & aman, bukan bug.
function sheetsColLetter(n){
let s='';
while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); }
return s;
}
function sheetsHeaderFor(modKey){
const schema=SHEETS_SCHEMAS[modKey];
return schema? ['id','updatedAt',...schema.map(f=>f.key)] : ['id','updatedAt','data'];
}
function sheetsLastColFor(modKey){
const schema=SHEETS_SCHEMAS[modKey];
return sheetsColLetter(2+(schema?schema.length:1));
}
function sheetsItemToCells(modKey,item){
const schema=SHEETS_SCHEMAS[modKey];
const {id,...rest}=item;
if(!schema) return [JSON.stringify(rest)];
return schema.map(f=>{
const v=rest[f.key];
if(v===undefined||v===null||v==='') return '';
if(f.type==='number') return (typeof v==='number')?v:(Number(v)||'');
if(f.type==='boolean') return !!v;
if(f.type==='json') return JSON.stringify(v);
return String(v);
});
}
function sheetsCellsToItem(modKey,id,cells){
const schema=SHEETS_SCHEMAS[modKey];
if(!schema){
const rest=cells[0]?JSON.parse(cells[0]):{};
return {id,...rest};
}
const item={id};
schema.forEach((f,i)=>{
const raw=cells[i];
if(raw===undefined||raw===''||raw===null){ item[f.key]=(f.type==='number')?null:(f.type==='boolean'?false:(f.type==='json'?null:'')); return; }
if(f.type==='number') item[f.key]=(typeof raw==='number')?raw:parseFloat(raw);
else if(f.type==='boolean') item[f.key]=(raw===true||raw==='TRUE'||raw==='true');
else if(f.type==='json'){ try{ item[f.key]=JSON.parse(raw); }catch(e){ item[f.key]=null; } }
else item[f.key]=String(raw);
});
return item;
}
function sheetsSaveSpreadsheetId(){
let v=document.getElementById('gsSpreadsheetId').value.trim();
const m=v.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
if(m) v=m[1];
D.googleSheets.spreadsheetId=v;
save();
}
