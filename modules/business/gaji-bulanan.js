// gaji-bulanan.js — Sesi "Bulanan Tetap" (D.profile.tipeGaji==='bulananTetap'):
// catat gaji bulanan flat (D.profile.gajiBulananTetap) sbg 1 transaksi income,
// tanggal dikunci ke tanggal gajian tetap (D.profile.gajiBulananTanggal, 1-31)
// bulan berjalan -- BUKAN tanggal saat tombol ditekan (pola sama dgn fix
// confirmWeeklyReset() di reset-gaji-mingguan.js, supaya konsisten). Dimuat
// SETELAH gaji-calc.js (butuh ensureGajiCategory() dari reset-gaji-mingguan.js
// & populateAccFilters() dari akun.js, keduanya sudah dimuat lebih dulu) --
// askConfirm() (modal-navigasi.js) & todayStr() (features-helpers-global-
// security.js) dimuat jauh lebih awal, aman diakses di sini.
// checkMonthlySalaryReminder() dipanggil dari features-helpers-global-
// security.js (setTimeout 600ms saat app dibuka), pola sama persis
// checkWeeklySalaryReset().
// _mgYearMonth(now) — key "YYYY-MM" bulan berjalan, dipakai D.profile.
// gajiBulananLastRecordedMonth utk cek "sudah dicatat bulan ini belum".
function _mgYearMonth(now){
return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
}
// checkMonthlySalaryReminder — pola sama persis checkWeeklySalaryReset()
// (reset-gaji-mingguan.js): dipanggil sekali per load app (setTimeout 600ms,
// features-helpers-global-security.js). Hanya relevan kalau tipeGaji===
// 'bulananTetap' DAN tanggal hari ini sudah lewat/pas tanggal gajian DAN
// belum pernah dicatat bulan ini DAN belum pernah ditawarkan hari ini
// (D.lastMonthlyGajiPromptDate, field state terpisah dari D.lastResetPromptDate
// mingguan supaya 2 reminder ini tidak saling menimpa tanda "sudah ditawarkan").
// Parameter `now` OPSIONAL (default new Date()) -- murni supaya bisa dites
// deterministik tanpa mocking Date global, caller produksi (setTimeout di
// atas) selalu manggil tanpa argumen, 0 perubahan perilaku.
function checkMonthlySalaryReminder(now){
if(!(D.profile&&D.profile.tipeGaji==='bulananTetap'))return;
now=now||new Date();
const tgl=Math.max(1,Math.min(31,parseInt(D.profile.gajiBulananTanggal,10)||1));
if(now.getDate()<tgl)return;
if(D.profile.gajiBulananLastRecordedMonth===_mgYearMonth(now))return;
const ts=todayStr();
if(D.lastMonthlyGajiPromptDate===ts)return;
D.lastMonthlyGajiPromptDate=ts;
save();
openMonthlyGajiModal();
}
function openMonthlyGajiModal(){
const amtEl=document.getElementById('mgAmt');
if(amtEl) amtEl.value=D.profile.gajiBulananTetap||'';
populateAccFilters();
const accEl=document.getElementById('mgAcc');
if(accEl&&D.accounts.length) accEl.value=D.accounts[0].id;
openModal('monthlyGajiModal');
}
// _mgPayDate(now) — tanggal gajian bulan berjalan, di-clamp ke jumlah hari
// riil bulan itu (mis. tanggal 31 di bulan Februari otomatis jadi tanggal
// terakhir bulan itu, bukan overflow ke bulan berikutnya).
function _mgPayDate(now){
const tgl=Math.max(1,Math.min(31,parseInt(D.profile.gajiBulananTanggal,10)||1));
const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
return new Date(now.getFullYear(),now.getMonth(),Math.min(tgl,daysInMonth));
}
// FIX (guard duplikat): dulu tombol "✅ Catat sebagai Pemasukan" bisa ditap
// berkali-kali (mis. salah tap 2x, atau modal dibuka manual lagi bulan yang
// sama) tanpa peringatan apa pun, beda dari confirmWeeklyReset() yang punya
// D.lastResetPromptDate sbg guard alami (workDays sudah kehapus stlh reset
// pertama). Fix: cek D.profile.gajiBulananLastRecordedMonth -- kalau bulan
// berjalan sudah pernah dicatat, minta konfirmasi eksplisit dulu (askConfirm,
// modal-navigasi.js) sebelum boleh dobel-catat -- tetap MEMPERBOLEHKAN dobel
// (mis. ada bonus tambahan bulan ini) asal user sadar & sengaja, bukan
// kecelakaan tap ganda.
async function confirmMonthlyGaji(){
const amtEl=document.getElementById('mgAmt');
const amount=parseFloat(amtEl&&amtEl.value)||0;
if(amount<=0){toast('⚠️ Isi nominal gaji bulanan dulu');return;}
const now=new Date();
const ym=_mgYearMonth(now);
if(D.profile.gajiBulananLastRecordedMonth===ym){
const lanjut=await askConfirm('Gaji bulanan bulan ini sudah pernah dicatat. Catat lagi sebagai transaksi TERPISAH?',{okText:'Ya, Catat Lagi',danger:false});
if(!lanjut)return;
}
const accEl=document.getElementById('mgAcc');
const accId=(accEl&&accEl.value)||(D.accounts.length?D.accounts[0].id:null);
const gajiCat=ensureGajiCategory();
const catName=gajiCat.name;
let subName='';
if(Array.isArray(gajiCat.subs)&&gajiCat.subs.length){
const subMatch=gajiCat.subs.find(s=>/toko/i.test(s.name))||gajiCat.subs.find(s=>/gaji/i.test(s.name))||gajiCat.subs[0];
if(subMatch) subName=subMatch.name;
}
const payDate=_mgPayDate(now);
D.transactions.push({id:uid(),type:'income',amount,category:catName,subcategory:subName,accountId:accId,payMethod:'tunai',note:'Gaji bulanan tetap',date:dateToISO(payDate)});
D.profile.gajiBulananTetap=amount;
D.profile.gajiBulananLastRecordedMonth=ym;
save();
closeModal('monthlyGajiModal');
toast(`✅ Gaji bulanan ${fmtFull(amount)} dicatat sebagai Pemasukan! 🎉`);
renderDashboard();
renderKeuangan();
}
