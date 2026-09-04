// reset-gaji-mingguan.js — Domain Reset Gaji Mingguan: hitung rentang minggu berjalan (getWeekRange),
// Dipindah ke modules/business/reset-gaji-mingguan.js (Sesi 15 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// deteksi & tawarkan reset absensi tiap Sabtu (checkWeeklySalaryReset), buka modal reset manual
// (openWeeklyResetManual), dan proses konfirmasi reset + catat pemasukan gaji otomatis (confirmWeeklyReset).
// Dipindah dari features-helpers-global-security.js (v72) — potongan KEEMPAT stlh kalkulator-input.js
// (v69), keamanan-pin.js (v70), modal-navigasi.js (v71). Blok ini kontigu di file asal (langsung sebelum
// showMain), 1 domain murni (fitur "gajian mingguan dari Absensi harian" di modul Tukang/Gaji), TIDAK
// direferensi modul lain kecuali lewat variabel global: D.workDays/D.transactions/D.accounts/D.categories/
// D.lastResetPromptDate (state, tetap di features-helpers-global-security.js), uid()/save()/toast()/
// fmtFull() (tetap di file itu juga), openModal()/closeModal() (modal-navigasi.js), populateAccFilters()
// (akun.js), renderWorkDays()/renderDashboard()/renderKeuangan() (modules-render.js), dateToISO()
// (helper-teks.js) — semua diakses saat runtime (klik tombol/modal
// dibuka), bukan saat file dimuat.
// CATATAN: `todayStr()` SENGAJA TIDAK ikut dipindah (tetap di features-helpers-global-security.js)
// walau ada tepat di antara getWeekRange & _wrLastTotal di file lama — krn itu utilitas tanggal generik
// yang dipakai 12+ file lain di luar domain reset gaji mingguan (mirip fmt/escapeHtml), bukan spesifik
// domain ini. Dipanggil dari sini lewat variabel global seperti biasa.
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh D, save, toast,
// fmtFull, uid, todayStr) & modal-navigasi.js (butuh openModal/closeModal).
function getWeekRange(d){
const day=d.getDay();
const start=new Date(d); start.setDate(d.getDate()-day); start.setHours(0,0,0,0);
const end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
return {start,end};
}
let _wrLastTotal=0,_wrLastCount=0,_wrLastStart=null,_wrLastEnd=null;
// FIX (audit kategori gaji absensi): sebelumnya kalau tidak ada kategori income
// yang namanya match /gaji/i, sistem fallback diam-diam ke D.categories.income[0]
// (kategori pemasukan PERTAMA apa adanya — bisa kategori bisnis, dll). Ini bikin
// gaji mingguan dari absensi tercatat di kategori yang salah tanpa notifikasi
// apapun, terutama kalau user pernah menghapus/mengganti nama kategori "Gaji toko"
// bawaan (kategori.js SENGAJA membolehkan rename/hapus kategori apa saja, termasuk
// kategori default — lihat saveCat/delCat). Fix: kalau tidak ketemu, buat kategori
// "Gaji" baru otomatis alih-alih fallback ke kategori pertama sembarang. Dipakai
// bareng oleh confirmWeeklyReset() di file ini & saveGajiAsIncome() di gaji-calc.js
// (file itu dimuat SETELAH file ini di scripts/build.js, jadi aman diakses dari sana).
// computeWeeklyGajiTotal(weekDays) — Sesi Mingguan Tetap. Untuk tipeGaji
// 'harian'/'borongan' (default, D.profile.tipeGaji tidak diset atau bukan
// 'mingguanTetap'), perilaku PERSIS SAMA seperti sebelumnya: jumlah w.total
// tiap hari. Untuk tipeGaji==='mingguanTetap', pokok harian TIDAK dipakai --
// diganti 1 nominal flat D.profile.gajiPokokMingguan per minggu, lembur/
// tambahan/potongan per hari TETAP dijumlah seperti biasa (fitur ini cuma
// mengganti komponen POKOK, bukan komponen lain).
function computeWeeklyGajiTotal(weekDays){
if(D.profile&&D.profile.tipeGaji==='mingguanTetap'){
const pokokMingguan=D.profile.gajiPokokMingguan||0;
const lainLain=(weekDays||[]).reduce((s,w)=>s+(w.lembur||0)+(w.tambahan||0)-(w.potongan||0),0);
return Math.max(0,pokokMingguan+lainLain);
}
return (weekDays||[]).reduce((s,w)=>s+w.total,0);
}
function ensureGajiCategory(){
const found=D.categories.income.find(c=>/gaji/i.test(c.name));
if(found) return found;
const created={id:'cat_gaji_'+uid(),name:'Gaji',emoji:'💼',subs:[]};
D.categories.income.push(created);
return created;
}
// FIX (gate jam sore): dulu popup "💰 Sabtu Gajian!" langsung muncul begitu app
// dibuka hari Sabtu jam berapa pun (termasuk pagi/siang saat user kemungkinan
// belum selesai kerja/gajian belum diterima). User kerja Minggu-Sabtu & gajian
// diterima Sabtu SORE -- popup pagi/siang jadi prematur & harus di-"Tunda"
// manual. Fix: tambah gerbang jam >=18 (18:00) sebelum popup ditampilkan.
// PENTING: gerbang ini TIDAK ikut menandai D.lastResetPromptDate="sudah
// ditawarkan hari ini" -- kalau app dibuka pagi (blm jam 18), fungsi ini cuma
// diam & keluar tanpa efek, supaya begitu app dibuka lagi sore/malam hari yang
// sama, popup tetap bisa muncul (bukan ke-skip seharian). Parameter `now`
// OPSIONAL (default new Date()), pola sama persis checkMonthlySalaryReminder()
// di gaji-bulanan.js -- murni supaya bisa dites deterministik tanpa mocking
// Date global, caller produksi (setTimeout di features-helpers-global-
// security.js) selalu manggil tanpa argumen, 0 perubahan behavior lain.
function checkWeeklySalaryReset(now){
now=now||new Date();
if(now.getDay()!==6) return;
if(now.getHours()<18) return;
const ts=todayStr();
if(D.lastResetPromptDate===ts) return;
const {start,end}=getWeekRange(now);
const weekDays=D.workDays.filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;});
if(!weekDays.length){ D.lastResetPromptDate=ts; save(); return; }
const total=computeWeeklyGajiTotal(weekDays);
_wrLastTotal=total;_wrLastCount=weekDays.length;_wrLastStart=start;_wrLastEnd=end;
document.getElementById('wrCount').textContent=weekDays.length;
document.getElementById('wrTotal').textContent=fmtFull(total);
const ckEl=document.getElementById('wrAutoIncome'); if(ckEl) ckEl.checked=true;
const accWrapEl=document.getElementById('wrAccWrap'); if(accWrapEl) accWrapEl.style.display=D.accounts.length?'block':'none';
const accEl=document.getElementById('wrAcc'); if(accEl&&D.accounts.length) accEl.value=D.accounts[0].id;
openModal('weeklyResetModal');
}
// v181: dulu SELALU pakai minggu real sekarang (new Date()), padahal tombol "💰 Sudah Gajian?"
// di tab Absensi muncul per MINGGU YANG SEDANG DIBROWSE (lihat panah ‹ › / Payroll.weekStart di
// payroll-absensi.js) — akibatnya kalau user browse ke minggu LAMA yang masih pending & tap tombol
// itu, yang ke-reset/dicatat malah minggu sekarang (salah/kosong), bukan minggu lama yang dimaksud.
// Ini bikin notif "⚠️ N minggu pending" tidak pernah bisa benar-benar diselesaikan lewat tombol ini.
// Fix: pakai Payroll.weekStart (minggu yang sedang tampil di layar) sbg target, fallback ke minggu
// real sekarang kalau dipanggil di luar konteks itu (mis. modul Payroll belum sempat dimuat).
function openWeeklyResetManual(){
const target=(typeof Payroll!=='undefined'&&Payroll.weekStart)?new Date(Payroll.weekStart):new Date();
const {start,end}=getWeekRange(target);
const weekDays=D.workDays.filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;});
if(!weekDays.length){toast('⚠️ Belum ada absensi minggu ini untuk dicatat');return;}
const total=computeWeeklyGajiTotal(weekDays);
_wrLastTotal=total;_wrLastCount=weekDays.length;_wrLastStart=start;_wrLastEnd=end;
populateAccFilters();
document.getElementById('wrCount').textContent=weekDays.length;
document.getElementById('wrTotal').textContent=fmtFull(total);
const ckEl=document.getElementById('wrAutoIncome'); if(ckEl) ckEl.checked=true;
const accWrapEl=document.getElementById('wrAccWrap'); if(accWrapEl) accWrapEl.style.display=D.accounts.length?'block':'none';
const accEl=document.getElementById('wrAcc'); if(accEl&&D.accounts.length) accEl.value=D.accounts[0].id;
closeModal('absensiModal');
closeModal('gajiCalcModal');
openModal('weeklyResetModal');
}
function confirmWeeklyReset(yes){
// Pakai minggu yang di-"kunci" saat modal ini dibuka (_wrLastStart/_wrLastEnd), BUKAN dihitung
// ulang dari new Date() — supaya konsisten dgn minggu yang ditampilkan ke user di modal
// (termasuk kalau itu minggu lama yang sedang di-reset lewat notif pending), & aman dari race
// condition kalau tanggal berganti persis saat modal ini terbuka.
const {start,end}=(_wrLastStart&&_wrLastEnd)?{start:_wrLastStart,end:_wrLastEnd}:getWeekRange(new Date());
const now=new Date();
let incomeSaved=false;
if(yes){
const autoEl=document.getElementById('wrAutoIncome');
const autoIncome=autoEl&&autoEl.checked&&_wrLastTotal>0;
if(autoIncome){
const accEl=document.getElementById('wrAcc');
const accId=(accEl&&accEl.value)||(D.accounts.length?D.accounts[0].id:null);
const gajiCat=ensureGajiCategory();
const catName=gajiCat.name;
// Auto-pilih subkategori yang paling cocok (mis. "Gaji Toko") kalau kategori
// yang match punya subs — dulu subcategory SELALU dikosongkan walau user
// sudah punya subkategori yang sesuai, jadi harus dipilih manual tiap minggu.
// Prioritas: sub yang namanya mengandung "toko" > mengandung "gaji" > sub
// pertama yang ada. Kalau kategori tidak punya subs sama sekali (termasuk
// kategori "Gaji" yang baru dibuat otomatis oleh ensureGajiCategory()), tetap
// kosong seperti sebelumnya — tidak ada regresi.
let subName='';
if(Array.isArray(gajiCat.subs) && gajiCat.subs.length){
const subMatch=gajiCat.subs.find(s=>/toko/i.test(s.name))||gajiCat.subs.find(s=>/gaji/i.test(s.name))||gajiCat.subs[0];
if(subMatch) subName=subMatch.name;
}
// FIX (bug tanggal): dulu pakai dateToISO(now) -- tanggal SAAT tombol
// "Sudah Terima, Reset" di-tap, yang bisa beda hari (bahkan beda bulan) dari
// Sabtu minggu yang sedang direset kalau user telat konfirmasi. Ini bikin
// transaksi gaji tercatat di bulan yang salah & tidak konsisten dgn
// pendingGajiEstimate/_cpWeeksInMonth (cash-projection.js) yang selalu
// mengatribusikan minggu ke bulan tempat Sabtu-nya jatuh. Fix: pakai
// dateToISO(end) -- tanggal Sabtu minggu yang di-"kunci" (_wrLastEnd/start
// di atas), bukan tanggal hari ini.
D.transactions.push({id:uid(),type:'income',amount:_wrLastTotal,category:catName,subcategory:subName,accountId:accId,payMethod:'tunai',note:`Gaji mingguan dari absensi (${_wrLastCount} hari kerja, ${dateToISO(start)} s/d ${dateToISO(end)})`,date:dateToISO(end)});
incomeSaved=true;
}
if(!Array.isArray(D.gajiMingguanHistory))D.gajiMingguanHistory=[];
D.gajiMingguanHistory.push({id:uid(),weekStart:dateToISO(start),weekEnd:dateToISO(end),total:_wrLastTotal,count:_wrLastCount,resetDate:todayStr(),incomeSaved});
if(D.gajiMingguanHistory.length>26) D.gajiMingguanHistory=D.gajiMingguanHistory.slice(-26);
D.workDays=D.workDays.filter(w=>{const d=new Date(w.date);return !(d>=start&&d<=end);});
toast(incomeSaved?`✅ Absensi direset & ${fmtFull(_wrLastTotal)} dicatat sebagai Pemasukan! 🎉`:'✅ Absensi minggu ini direset, selamat gajian! 🎉');
} else {
toast('Oke, data absensi minggu ini tetap disimpan');
}
D.lastResetPromptDate=todayStr();
_wrLastStart=null;_wrLastEnd=null;
save();
closeModal('weeklyResetModal');
renderWorkDays();
Payroll.renderDashMini();
renderDashboard();
if(incomeSaved) renderKeuangan();
}
