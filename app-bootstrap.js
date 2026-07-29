// app-bootstrap.js — Titik bootstrap utama app: expose modul-modul ke window (Object.assign)
// lalu panggil init(). Dipisah dari features-sheets-pwa-selftest.js (Sesi 3 restrukturisasi
// folder, blok 5 — lihat docs/AUDIT-SESI-1-features-sheets-pwa-selftest.js) murni pengelompokan
// ulang file, BUKAN perubahan perilaku. PENTING: file ini HARUS jadi file TERAKHIR yang dimuat
// di urutan build.js (GROUP_B) sebelum lifeos/economic-intelligence (yang memang sudah dimuat
// belakangan & tidak butuh init() ini — lihat catatan di scripts/build.js).

// BUGFIX: sebelumnya Object.assign(...) + init() dipanggil TANPA try/catch. Kalau salah satu
// identifier di daftar Object.assign belum terdefinisi (mis. gara-gara satu file module gagal
// dimuat / urutan build.js berubah) ATAU ada error apa pun di dalam init(), exception-nya
// langsung berhenti di sini TANPA pesan apa pun ke user -- init() adalah titik yang mendaftarkan
// notifikasi (checkAndFireReminders via setInterval) DAN listener klik data-action (termasuk
// semua tombol Scan), jadi kegagalan senyap di sini persis menjelaskan gejala "semua scan tidak
// bisa dibuka, tidak ada notif di semua fitur" sekaligus. Sekarang errornya ditangkap, dilog, &
// ditampilkan lewat banner global (lihat window.__showRuntimeErrorBanner di index.html) supaya
// ketahuan & bisa dilaporkan, bukan cuma diam.
try{
Object.assign(window,{
Etalase,Produsen,Order,FI,DanaDaruratAI,WorthIt,TimelineW,Pensiun,Budget,BudgetTabs,BudgetReko,
Laporan,Payroll,Tukang,InsightTargetMingguan,BBM,Sparepart,Servis,Torsi,Pelanggan,SiapPulang,RefAI,Zakat,PPh21,PajakUMKM,
Aset,LifeBalance,Piutang,Debt,DebtStrategy,Kekayaan,AlokasiAset,PBB,
// Sesi 14 Tahap 1b: SewaKios SENGAJA TIDAK ada di daftar ini lagi --
// modules/business/sewakios.js sekarang lazy-load (dikeluarkan dari bundle,
// lihat scripts/build.js GROUP_A), jadi identifier ini belum tentu
// terdeklarasi saat baris ini jalan. Modul ini sekarang mendaftarkan diri
// sendiri ke window di akhir modules/business/sewakios.js begitu file itu
// selesai dimuat.
// Sesi 13 Tahap 1b: Renov/RenovAI/RenovCalc SENGAJA TIDAK ada di daftar ini
// lagi -- modules/home/renovasi.js sekarang lazy-load (dikeluarkan dari
// bundle, lihat scripts/build.js GROUP_A), jadi identifier2 itu belum tentu
// terdeklarasi saat baris ini jalan (ReferenceError di sini akan bikin
// SELURUH Object.assign ini gagal, termasuk modul lain di daftar yang sama).
// Ketiganya sekarang mendaftarkan diri sendiri ke window di akhir
// modules/home/renovasi.js begitu file itu selesai dimuat.
IDBStore,LinkTx,Bill,AIWidget,EduFund,PriceReko,OngkirCalc,PriceRekoWidget,StockRekoWidget,Refleksi,Kasir,Advisor,FinCoach,GoldImport,GoldZakat,AIRecommendCard,AIDailyBriefingCard,AISimulateWidget,AIScenarioWidget,AIHealthCheckWidget,BillMultiScan,UniversalScan
});
// BUGFIX (audit klik "0 reaksi"): init() adalah `async function` -- try/catch sinkron di
// sekeliling panggilan biasa `init()` TIDAK menangkap error yang terjadi DI DALAM init()
// (async function selalu mengembalikan Promise; throw di dalamnya jadi unhandled rejection,
// bukan exception sinkron). Akibatnya kalau init() gagal di tengah jalan, catch di bawah ini
// TIDAK PERNAH jalan -- tidak ada banner, tidak ada console.error, tidak ada alert -- app
// terlihat diam total (boot terhenti sebagian tanpa jejak). Fix: bungkus panggilannya supaya
// rejection-nya benar2 ditangkap di sini juga.
Promise.resolve(init()).catch(function(e){
console.error('[app-bootstrap] init() gagal (async, tertangkap via Promise.catch):',e);
if(typeof window.__showRuntimeErrorBanner==='function'){
window.__showRuntimeErrorBanner('Gagal memulai aplikasi ('+(e&&e.message?e.message:e)+')');
} else if(typeof alert==='function'){
alert('Gagal memulai aplikasi: '+(e&&e.message?e.message:e));
}
});
}catch(e){
console.error('[app-bootstrap] Gagal Object.assign(window,...) -- app boot terhenti:',e);
if(typeof window.__showRuntimeErrorBanner==='function'){
window.__showRuntimeErrorBanner('Gagal memulai aplikasi ('+(e&&e.message?e.message:e)+')');
} else if(typeof alert==='function'){
alert('Gagal memulai aplikasi: '+(e&&e.message?e.message:e));
}
}
