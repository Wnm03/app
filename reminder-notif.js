// reminder-notif.js — resetApp (reset total data, disatukan di sini krn tidak ada domain lain
// yang cocok & cuma 1 fungsi kecil), share ke WhatsApp (phoneToWaId/waShareLink/openWaShare),
// notifikasi browser (requestNotifPermission/fireNotif/toggleNotifEnabled/testNotif), dan mesin
// pengecekan reminder lintas-domain (checkAndFireReminders: tagihan, LDR, pajak/SIM/SPT
// kendaraan) + share tagihan/LDR ke WA. Dipisah dari features-aiwidget-reminder-gdrive-search.js
// (Sesi 4 restrukturisasi folder, blok 2 — lihat AUDIT-STRUKTUR-FOLDER.md) murni pengelompokan
// ulang file, BUKAN perubahan perilaku. checkAndFireReminders() SENGAJA lintas-domain (baca
// D.bills/D.vehicles/D.simList dll) jadi file ini taruh di /modules/shared, bukan salah satu
// domain spesifik.

async function resetApp(){if(!await askConfirm('YAKIN? Semua data (transaksi, catatan, pengaturan) akan dihapus permanen.',{title:'Reset Aplikasi',okText:'Ya, Reset'}))return;if(!await askConfirm('Ini tidak bisa dibatalkan setelah dilanjutkan. Yakin mau lanjut?',{title:'Konfirmasi Terakhir',okText:'Ya, Hapus Semua'}))return;
// BUGFIX (docs/CATATAN-CEK-CLAUDE.md "BELUM DIKERJAKAN"): sebelumnya cuma localStorage.clear(),
// TIDAK PERNAH menyentuh IndexedDB (kw_v4_mirror dkk). Karena load() cek kw_v4_mirror DULUAN
// sebelum localStorage, reset lama bisa "gagal senyap" -- data D muncul lagi utuh dari mirror
// IndexedDB setelah reload. Guard typeof supaya tetap aman kalau IDBStore belum sempat dimuat.
if(typeof IDBStore!=='undefined'&&IDBStore.clear){try{await IDBStore.clear();}catch(e){console.error('Gagal mengosongkan IndexedDB saat reset:',e);}}
localStorage.clear();location.reload();}
function phoneToWaId(phone){
if(!phone) return '';
let p=String(phone).replace(/[^0-9+]/g,'');
if(p.startsWith('+')) p=p.slice(1);
if(p.startsWith('0')) p='62'+p.slice(1);
else if(!p.startsWith('62')) p='62'+p;
return p;
}
function waShareLink(text,phone){
const t=encodeURIComponent(text);
if(phone){const id=phoneToWaId(phone);return `https://wa.me/${id}?text=${t}`;}
return `https://wa.me/?text=${t}`;
}
function openWaShare(text,phone){window.open(waShareLink(text,phone),'_blank');}
async function requestNotifPermission(){
if(!('Notification' in window)){toast('⚠️ Browser ini tidak mendukung notifikasi');renderNotifSettings();return;}
try{
const perm=await Notification.requestPermission();
if(perm==='granted'){
D.notifSettings.enabled=true;save();
toast('✅ Notifikasi diaktifkan!');
fireNotif('🔔 Notifikasi Aktif','Keluarga W akan mengingatkan jadwal pulang & tagihan jatuh tempo selama aplikasi ini dibuka.');
checkAndFireReminders();
} else {
D.notifSettings.enabled=false;save();
toast('❌ Izin notifikasi ditolak / diblokir browser');
}
}catch(e){toast('⚠️ Gagal minta izin notifikasi');}
renderNotifSettings();
}
function fireNotif(title,body,tag,onClick){
if(!('Notification' in window)||Notification.permission!=='granted')return;
try{
const n=new Notification(title,{body,tag,renotify:!!tag});
n.onclick=()=>{window.focus();n.close();if(typeof onClick==='function'){try{onClick();}catch(e){console.warn('Gagal jalankan aksi klik notifikasi:',e);}}};
}catch(e){console.warn('Gagal kirim notifikasi:',e);}
}
function toggleNotifEnabled(checked){
if(checked){requestNotifPermission();}
else{D.notifSettings.enabled=false;save();renderNotifSettings();toast('🔕 Notifikasi dimatikan');}
}
/* moved to modules-render.js: renderNotifSettings */
function testNotif(){
if(!('Notification' in window)||Notification.permission!=='granted'){toast('⚠️ Aktifkan notifikasi dulu');return;}
fireNotif('🔔 Tes Notifikasi','Kalau ini muncul, notifikasi Keluarga W berhasil aktif! 🎉');
toast('✅ Notifikasi tes dikirim');
}
function checkAndFireReminders(){
if(!D.notifSettings.enabled||!('Notification' in window)||Notification.permission!=='granted')return;
const todayKey=todayStr();
let fired={};
try{fired=JSON.parse(localStorage.getItem('kw_notif_fired')||'{}');}catch(e){fired={};}
if(fired.date!==todayKey) fired={date:todayKey,ids:[]};
const today=new Date();today.setHours(0,0,0,0);
D.bills.forEach(b=>{
const d=new Date(b.nextDue);
const diff=Math.ceil((d-today)/(1000*60*60*24));
const fireKey='bill_'+b.id+'_'+b.nextDue;
if(diff>=0 && diff<=(D.notifSettings.billDays||3) && !fired.ids.includes(fireKey)){
fireNotif('🔔 Tagihan akan jatuh tempo',`${escapeHtml(b.name)} - ${fmtFull(b.amount)} jatuh tempo ${diff===0?'hari ini':diff+' hari lagi'}`,fireKey);
fired.ids.push(fireKey);
}
});
if(D.nextPulang){
const pulang=new Date(D.nextPulang);
const diff=Math.ceil((pulang-today)/(1000*60*60*24));
const fireKey='ldr_'+D.nextPulang;
if(diff>=0 && diff<=(D.notifSettings.ldrDays||3) && !fired.ids.includes(fireKey)){
fireNotif('✈️ Jadwal Pulang ke Pekalongan',diff===0?'Hari ini jadwal pulang! 💙':`Tinggal ${diff} hari lagi pulang ke Pekalongan 💙`,fireKey);
fired.ids.push(fireKey);
}
}
// Sesi 196 (Ownership Sync Vehicle): TAMBAH 1 filter isVehicleOwnershipSelf(v.id)
// di atas D.vehicles apa adanya (0 logic lama diubah) — kendaraan ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan dari notifikasi pajak
// kendaraan lintas-armada (D.vehicles sendiri TIDAK diubah/dimutasi).
D.vehicles.filter(v=>typeof isVehicleOwnershipSelf!=='function'||isVehicleOwnershipSelf(v.id)).forEach(v=>{
Object.entries(VEHTAX_ITEMS).forEach(([key,cfg])=>{
const tgl=v[cfg.tglKey];
if(!tgl)return;
const d=new Date(tgl);
const diff=Math.ceil((d-today)/(1000*60*60*24));
const fireKey='vehtax_'+v.id+'_'+key+'_'+tgl;
if(diff>=0 && diff<=(D.notifSettings.billDays||3) && !fired.ids.includes(fireKey)){
fireNotif('🚦 '+cfg.label.replace(/^\S+\s/,'')+' akan jatuh tempo',`${v.name} - ${diff===0?'hari ini':diff+' hari lagi'}`,fireKey);
fired.ids.push(fireKey);
}
});
});
(D.simList||[]).forEach(s=>{
if(!s.tglAkhir)return;
const d=new Date(s.tglAkhir);
const diff=Math.ceil((d-today)/(1000*60*60*24));
const fireKey='sim_'+s.id+'_'+s.tglAkhir;
if(diff>=0 && diff<=(D.notifSettings.billDays||3) && !fired.ids.includes(fireKey)){
fireNotif('🪪 SIM akan habis masa berlaku',`${s.nama} (${s.jenis}) - ${diff===0?'hari ini':diff+' hari lagi'}`,fireKey);
fired.ids.push(fireKey);
}
});
{
const sptDue=sptTahunanDueDate();
const d=new Date(sptDue);
const diff=Math.ceil((d-today)/(1000*60*60*24));
const fireKey='spt_'+sptDue;
if(diff>=0 && diff<=(D.notifSettings.billDays||3) && !fired.ids.includes(fireKey)){
fireNotif('🧾 Batas Lapor SPT Tahunan',`SPT Tahunan Orang Pribadi jatuh tempo ${diff===0?'hari ini':diff+' hari lagi'} (31 Maret)`,fireKey);
fired.ids.push(fireKey);
}
}
if(typeof VehicleNotifBridge!=='undefined'&&typeof VehicleNotifBridge.items==='function'){
VehicleNotifBridge.items(undefined,fired.ids).forEach((n)=>{
fireNotif(n.title,n.body,n.fireKey);
fired.ids.push(n.fireKey);
});
}
// TASK-153 (Fuel Notification & Reminder): 100% REUSE FuelNotifBridge
// (translator murni FuelInsightEngine, pola SAMA PERSIS VehicleNotifBridge
// di atas) + fireNotif() yang sama (0 sistem notifikasi baru). Klik
// notifikasi membuka FuelModal (Fuel Intelligence Modal existing, TASK-141)
// utk kendaraan terkait -- satu-satunya dashboard BBM per-kendaraan yang
// sudah ada di aplikasi ini (TASK-150 Fuel Dashboard belum dikerjakan,
// lihat AI_STATE.md).
if(typeof FuelNotifBridge!=='undefined'&&typeof FuelNotifBridge.items==='function'){
FuelNotifBridge.items(undefined,fired.ids).forEach((n)=>{
fireNotif(n.title,n.body,n.fireKey,()=>{if(typeof FuelModal!=='undefined'&&typeof FuelModal.open==='function')FuelModal.open(n.vehicleId);});
fired.ids.push(n.fireKey);
});
}
try{localStorage.setItem('kw_notif_fired',JSON.stringify(fired));}catch(e){console.error('Gagal simpan status notifikasi:',e);}
}
function shareBillWA(id){
const b=D.bills.find(x=>x.id===id);if(!b)return;
const due=new Date(b.nextDue).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const text=`🔔 Pengingat Tagihan\n${escapeHtml(b.name)}\nJumlah: ${fmtFull(b.amount)}\nJatuh tempo: ${due}`;
openWaShare(text);
}
function shareLDRWA(){
if(!D.nextPulang){toast('⚠️ Atur tanggal pulang dulu');return;}
const pulangD=new Date(D.nextPulang);
const pulangLbl=pulangD.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
const today=new Date();today.setHours(0,0,0,0);
const diff=Math.ceil((pulangD-today)/(1000*60*60*24));
const text=`✈️ Jadwal Pulang ke Pekalongan\nTanggal: ${pulangLbl}\n${diff>0?'Tinggal '+diff+' hari lagi 💙':'Hari ini pulang! 🏠'}`;
openWaShare(text);
}
