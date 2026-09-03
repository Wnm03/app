// deficit-notif-bridge.js — Deficit Notification Bridge (Sesi S724, carry-forward
// S723 item "notifikasi proaktif defisit"). Pola SAMA PERSIS modules/vehicle/
// vehicle-notif-bridge.js / fuel-notif-bridge.js — modul PURE, TIDAK PERNAH
// memanggil fireNotif()/Notification/localStorage sendiri, tidak menyentuh DOM.
// Hanya MENERJEMAHKAN getCashProjectionDeficitAlert() (modules/finance/cash-
// projection.js) jadi {fireKey,title,body} siap pakai checkAndFireReminders()
// (reminder-notif.js, yang SUDAH memanggil fireNotif()+menyimpan kw_notif_fired
// sendiri, pola dispatch sama persis bridge lain).
//
// fireKey SENGAJA menyertakan type+month+year bulan defisit yang terdeteksi (BUKAN
// tanggal hari ini) -- kalau bulan/jenis defisit yang terdeteksi BERGESER (mis. user
// bayar tagihan besar/nambah pemasukan sehingga bulan yg tadinya defisit jadi aman,
// atau severity turun dari 'saldo' ke 'kas'), fireKey otomatis beda & notif baru
// tetap muncul. checkAndFireReminders() me-reset fired.ids TIAP HARI (fired.date!==
// todayKey, lihat reminder-notif.js) -- jadi selama kondisi defisit yang SAMA masih
// terdeteksi, notif ini tetap muncul ULANG tiap hari (pola SAMA PERSIS reminder
// tagihan H-3 yg juga menembak tiap hari sampai lunas) -- disengaja, BUKAN bug:
// defisit proyeksi yang dibiarkan tidak ditangani user lebih baik terus diingatkan
// drpd cuma sekali lalu terlupakan.
const DeficitNotifBridge = {

// items(firedIds, opts) — array berisi 0 atau 1 item {fireKey,title,body}, siap
// ditembak. 0/1 (bukan array per-bulan) krn getCashProjectionDeficitAlert() SUDAH
// memilih 1 sinyal PALING mendesak (saldo kumulatif minus diutamakan drpd delta
// bulan saja, lihat komentar prioritas di fungsinya) -- 1 notif per hari sudah
// cukup mewakili, tidak perlu spam beberapa notif defisit sekaligus.
items(firedIds,opts){
const fired=Array.isArray(firedIds)?firedIds:[];
if(typeof getCashProjectionDeficitAlert!=='function')return[];
let alert;
try{alert=getCashProjectionDeficitAlert(opts);}
catch(e){console.warn('DeficitNotifBridge.items: gagal hitung sinyal defisit',e);return[];}
if(!alert||!alert.available)return[];
const fireKey='cashdeficit_'+alert.type+'_'+alert.month+'_'+alert.year;
if(fired.includes(fireKey))return[];
const monthNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const monthLabel=monthNames[alert.month]||('bulan ke-'+(alert.month+1));
const fmt=(typeof fmtFullSigned==='function')?fmtFullSigned:(n=>String(Math.round(n||0)));
const title=alert.type==='saldo'?'⚠️ Proyeksi Saldo Kas Bakal Minus':'⚠️ Proyeksi Kas Defisit';
const body=alert.type==='saldo'
?`Kalau pola saat ini berlanjut, proyeksi saldo kas ${monthLabel} ${alert.year} minus (${fmt(alert.amount)}).`
:`Proyeksi Kas ${monthLabel} ${alert.year} defisit (${fmt(alert.amount)}) -- kewajiban diperkirakan lebih besar dari proyeksi gaji.`;
return[{fireKey,title,body}];
},

};
