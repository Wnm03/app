// data-archive.js — Storage usage estimate & Archive (export lalu hapus data lama per tahun).
// Dipindah ke modules/shared/data-archive.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari tukang-absensi.js (2026-07-12, roadmap split file besar bagian
// ke-2) murni pengelompokan ulang file, BUKAN perubahan perilaku. Domain ini (kuota penyimpanan +
// arsip/hapus data) tidak overlap dengan Tukang/Vehicle/Sparepart/Servis yang masih ada di file asal
// selain sama-sama "data lama numpuk" secara tema besar — cukup berdiri sendiri.
// Dipakai oleh: modules-render.js (renderStorageUsage, renderActualStorageQuota, renderArchiveSuggestHint,
// renderArchiveHistory — panggilan runtime lewat referensi variabel/fungsi di bawah, tidak ada
// dependensi urutan load) dan modals.js (HTML archiveModal, tombol data-action="archiveExportStep"/
// "archiveDeleteStep", checkbox onchange="toggleArchiveYear(...)" — dievaluasi saat modal
// dibuka/ditap, bukan saat parse, jadi urutan load juga tidak masalah). Tidak ada state di sini yang
// di-assign dari file lain sebelum dideklarasikan (beda dengan chatInited di chat-action.js), jadi
// file ini boleh diletakkan di mana saja di GROUP_B asal sebelum features-sheets-pwa-selftest.js
// (yang memanggil archiveAvailableYears()/archiveCollectByYears() di self-test-nya).
const STORAGE_QUOTA_ESTIMATE=5*1024*1024;
const STORAGE_BIG_MODULES=[
{key:'transactions',label:'💰 Transaksi Keuangan'},
{key:'cobek',label:'🪨 Shop (Order)'},
{key:'bbmLogs',label:'⛽ Log BBM'},
{key:'servisLogs',label:'🔧 Log Servis'},
{key:'kmLogs',label:'📍 Catatan KM'},
{key:'jalanLogs',label:'🛣️ Catatan Perjalanan (fitur lama, data lama)'},
{key:'partsStock',label:'📦 Stok Sparepart'},
{key:'products',label:'🛍️ Produk Etalase (Shop)'},
{key:'bills',label:'🧾 Tagihan'},
{key:'targets',label:'🎯 Target Tabungan'},
{key:'eduFunds',label:'🎓 Dana Pendidikan'},
{key:'renovProjects',label:'🛠️ Proyek Renovasi'},
{key:'wishlist',label:'📋 Prioritas Belanja'},
];
function byteSize(v){ try{ return new Blob([JSON.stringify(v)]).size; }catch(e){ return 0; } }
/* moved to modules-render.js: renderStorageUsage */
/* moved to modules-render.js: renderActualStorageQuota */
function fmtBytes(b){
if(b<1024) return b+' B';
if(b<1024*1024) return (b/1024).toFixed(1)+' KB';
return (b/1024/1024).toFixed(2)+' MB';
}
const ARCHIVE_MODULES=[
{key:'transactions',label:'💰 Transaksi Keuangan'},
{key:'cobek',label:'🪨 Shop (Order)'},
{key:'bbmLogs',label:'⛽ Log BBM'},
{key:'servisLogs',label:'🔧 Log Servis'},
{key:'kmLogs',label:'📍 Catatan KM'},
{key:'jalanLogs',label:'🛣️ Catatan Perjalanan (fitur lama)'},
];
let archiveSelectedYears=new Set();
let archiveExportedYears=null;
function archiveGetYear(dateStr){
const d=new Date(dateStr);
return isNaN(d)?null:d.getFullYear();
}
function archiveAvailableYears(){
const years=new Set();
ARCHIVE_MODULES.forEach(m=>{
(D[m.key]||[]).forEach(item=>{
const y=archiveGetYear(item.date);
if(y) years.add(y);
});
});
return Array.from(years).sort((a,b)=>b-a);
}
/* moved to modules-render.js: renderArchiveSuggestHint */
/* moved to modules-render.js: renderArchiveHistory */
function openArchiveModal(){
archiveSelectedYears=new Set();
archiveExportedYears=null;
document.getElementById('archiveStep1').style.display='block';
document.getElementById('archiveStep2').style.display='none';
const years=archiveAvailableYears();
const curYear=new Date().getFullYear();
const listEl=document.getElementById('archiveYearList');
const hintEl=document.getElementById('archiveEmptyHint');
if(!years.length){
listEl.innerHTML='';
hintEl.textContent='Belum ada data riwayat yang bisa diarsip.';
} else {
hintEl.textContent=years.includes(curYear)?'⚠️ Tahun berjalan ('+curYear+') tetap bisa dipilih, tapi hati-hati kalau masih aktif dipakai.':'';
listEl.innerHTML=years.map(y=>{
const counts=ARCHIVE_MODULES.reduce((s,m)=>s+(D[m.key]||[]).filter(it=>archiveGetYear(it.date)===y).length,0);
return `<label class="u-flex u-aic u-gap10 u-r10 u-pointer" style="padding:10px 12px;background:var(--surface3);border:1px solid var(--border2)">
        <input type="checkbox" style="width:18px;height:18px" onchange="toggleArchiveYear(${y},this)">
        <span class="u-flex1">${y}</span>
        <span class="u-fs12t2">${counts.toLocaleString('id-ID')} data</span>
      </label>`;
}).join('');
}
updateArchivePreview();
openModal('archiveModal');
}
function toggleArchiveYear(year,el){
if(el.checked) archiveSelectedYears.add(year); else archiveSelectedYears.delete(year);
updateArchivePreview();
}
function archiveCollectByYears(years){
const out={};
ARCHIVE_MODULES.forEach(m=>{
out[m.key]=(D[m.key]||[]).filter(it=>years.has(archiveGetYear(it.date)));
});
return out;
}
function updateArchivePreview(){
const el=document.getElementById('archivePreview');
if(!el)return;
if(!archiveSelectedYears.size){ el.textContent='Pilih minimal 1 tahun dulu.'; return; }
const data=archiveCollectByYears(archiveSelectedYears);
const total=Object.values(data).reduce((s,arr)=>s+arr.length,0);
const yearsSorted=Array.from(archiveSelectedYears).sort();
el.textContent=`Akan mengarsip ${total.toLocaleString('id-ID')} data dari tahun ${yearsSorted.join(', ')} (semua modul riwayat di atas).`;
}
function archiveExportStep(){
if(!archiveSelectedYears.size){ toast('⚠️ Pilih minimal 1 tahun dulu'); return; }
const years=new Set(archiveSelectedYears);
const data=archiveCollectByYears(years);
const total=Object.values(data).reduce((s,arr)=>s+arr.length,0);
if(!total){ toast('⚠️ Tidak ada data di tahun terpilih'); return; }
const format=document.getElementById('archiveFormat').value;
const yearsTag=Array.from(years).sort().join('-');
const dateTag=new Date().toISOString().split('T')[0];
if(format==='json'){
const out={schemaVersion:SCHEMA_VERSION,archivedAt:new Date().toISOString(),archivedYears:Array.from(years).sort(),...data};
const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='arsip-W-'+yearsTag+'-'+dateTag+'.json';a.click();
} else {
const csvParts=[];
const toCSVRow=arr=>arr.map(v=>{v=(v===null||v===undefined)?'':String(v);return v.includes(',')||v.includes('"')?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');
ARCHIVE_MODULES.forEach(m=>{
const arr=data[m.key];
if(!arr||!arr.length)return;
csvParts.push('=== '+m.label+' ===');
csvParts.push(toCSVRow(['ID','Tanggal','Data (JSON)']));
arr.forEach(it=>csvParts.push(toCSVRow([it.id,it.date,JSON.stringify(it)])));
csvParts.push('');
});
const blob=new Blob([csvParts.join('\n')],{type:'text/csv'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='arsip-W-'+yearsTag+'-'+dateTag+'.csv';a.click();
}
archiveExportedYears=years;
document.getElementById('archiveStep1').style.display='none';
document.getElementById('archiveStep2').style.display='block';
toast('✅ File arsip sudah di-download ('+total.toLocaleString('id-ID')+' data)');
}
async function archiveDeleteStep(){
if(!archiveExportedYears||!archiveExportedYears.size){ toast('⚠️ Export dulu sebelum hapus'); return; }
const years=archiveExportedYears;
const data=archiveCollectByYears(years);
const total=Object.values(data).reduce((s,arr)=>s+arr.length,0);
const yearsSorted=Array.from(years).sort();
const ok=await askConfirm(`Hapus ${total.toLocaleString('id-ID')} data tahun ${yearsSorted.join(', ')} dari HP? File arsip sudah kamu download — pastikan file itu aman sebelum lanjut. Ini TIDAK BISA dibatalkan.`,{title:'Hapus Data Arsip',danger:true,okText:'Ya, Hapus dari HP',icon:'🗑️'});
if(!ok)return;
ARCHIVE_MODULES.forEach(m=>{
if(!D[m.key])return;
D[m.key]=D[m.key].filter(it=>!years.has(archiveGetYear(it.date)));
});
if(!D.archiveHistory)D.archiveHistory=[];
D.archiveHistory.push({date:new Date().toISOString(),years:yearsSorted,totalItems:total});
save();
renderStorageUsage();
closeModal('archiveModal');
toast(`✅ ${total.toLocaleString('id-ID')} data tahun ${yearsSorted.join(', ')} berhasil diarsip & dihapus dari HP`,4000);
}
