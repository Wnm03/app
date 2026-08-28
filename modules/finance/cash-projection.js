// cash-projection.js — Sesi P1 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md,
// Track 2). Presenter READ-ONLY: 0 ubah Finance/Accounting Engine, 0 baca/tulis
// D.debts langsung (utang berjadwal sudah auto-sync jadi D.bills kind:'utang' lewat
// piutang-utang.js/syncDebtBill() — baca lewat getBillStats() sudah otomatis ikut
// kehitung, dobel-hitung kalau kita baca D.debts lagi di sini).
//
// Ditaruh SETELAH tagihan-kalender.js di scripts/build.js (dependency wajib:
// getBillStats()/getBillPaidThisPeriodInfo(), didefinisikan di file itu).
// reset-gaji-mingguan.js (D.workDays, getWeekRange) sudah dimuat jauh lebih awal
// di GROUP_B, aman diakses lewat D langsung (tidak perlu fungsinya).
//
// AUDIT P0 (data asli W, backup 2026-08-27): dari 236 transaksi income, pola gaji
// PALING BESAR (84 tx) ternyata category:"Penghasilan" + subcategory:"Gaji toko"
// (note KOSONG) — bukan category:"Gaji" seperti asumsi awal desain. Ini persis
// skenario acceptance criteria #2 ("kategori TIDAK mengandung gaji tetap
// terhitung"), makanya isGajiTransaction() di bawah SENGAJA cek category ATAU
// subcategory ATAU note (bukan cuma category+note) — kalau cuma category+note yang
// dicek, 84 transaksi gaji terbesar W bakal lolos tidak kehitung proyeksi.
// Pola lain yang DITEMUKAN tapi SENGAJA TIDAK dianggap gaji (ambigu, tidak match
// /gaji/i di field manapun): subcategory "H" (43 tx, nominal tidak konsisten dgn
// pola gajian mingguan), "Tambahan" (31 tx, notenya barang² spt "tripod"/"Kemah"),
// "Bonus toko" (7 tx). Kalau ternyata ini juga harus dihitung sbg gaji, perlu
// keputusan eksplisit dari W dulu (bukan diasumsikan sepihak di sini) — proyeksi
// kas sengaja under-estimate drpd over-estimate (lebih aman drpd bikin user kirain
// kas lebih longgar dari kenyataan).

// isGajiTransaction(t) — predikat murni. cobekLinkId SELALU exclude apapun
// kategorinya (acceptance criteria #1) krn itu penjualan cobek/mebel real,
// bukan gaji, meski kebetulan ketiban kategori yang match /gaji/i.
function isGajiTransaction(t){
if(!t||t.type!=='income')return false;
if(t.cobekLinkId)return false;
const p=/gaji/i;
return p.test(t.category||'')||p.test(t.subcategory||'')||p.test(t.note||'');
}

// Parse "YYYY-MM-DD" jadi LOCAL midnight (pola sama persis billNextDueLocalMidnight
// di tagihan-kalender.js) — hindari bug offset timezone dari parsing UTC.
function _cpLocalDate(dateStr){
if(!dateStr)return new Date(NaN);
const parts=String(dateStr).split('-');
if(parts.length!==3)return new Date(dateStr);
const[y,m,d]=parts.map(Number);
return new Date(y,m-1,d);
}
function _cpInMonth(dateStr,year,month){
const d=_cpLocalDate(dateStr);
if(isNaN(d.getTime()))return false;
return d.getFullYear()===year&&d.getMonth()===month;
}

// _cpWeeksInMonth(year,month) — jumlah minggu (definisi Minggu-Sabtu, SAMA PERSIS
// getWeekRange() di reset-gaji-mingguan.js) yang AKHIRNYA (hari Sabtu) jatuh di bulan
// target. Dipakai murni utk estimasi Kiriman Mingguan (Sesi kiriman-mingguan-proyeksi-
// kas) -- bukan konsep baru, cuma menghitung ulang hari Sabtu dlm 1 bulan kalender.
function _cpWeeksInMonth(year,month){
const daysInMonth=new Date(year,month+1,0).getDate();
let count=0;
for(let d=1;d<=daysInMonth;d++){
if(new Date(year,month,d).getDay()===6)count++;
}
return count;
}

// getMonthlyCashProjection(month,year,opts) — fungsi murni, 0 baca DOM. Prinsip:
// Proyeksi Kas = Proyeksi Gaji − Sisa Kewajiban Terjadwal. SELALU kembalikan 3
// angka terpisah (acceptance criteria #5), tidak ada mode gabungan 1-angka.
//
// opts (S667B, OPSIONAL, 100% BACKWARD-COMPATIBLE) — {billWindowMode,cycleStartDay},
// REUSE PERSIS CashflowProjSettings/billingCycleRange (cashflow-projection-settings.js/
// tx-list-cashflow.js, Sesi 93/95) -- dipanggil tanpa opts (semua caller lama, termasuk
// _renderCashProjectionCard() sblm sesi ini) hasilnya IDENTIK perilaku lama
// (billWindowMode default 'kalender' = getBillOccurrencesInMonth(b,y,m), SAMA PERSIS kode
// asli di bawah). HANYA sisaKewajiban/billMonthTotal/billPaidThisPeriod yang berubah kalau
// billWindowMode==='siklus' -- proyeksiGaji TETAP selalu bulan kalender m/y (gaji tidak ada
// konsep siklus tengah-bulan), pola sama persis computeCashflowForecast() yang cuma ubah
// jendela TAGIHAN, bukan income. Mode '30hari' (dipakai kartu Proyeksi Saldo Kas lain) TIDAK
// relevan di sini (kartu ini selalu per-bulan-kalender utk sisi gaji) -- kalau billWindowMode
// dikirim '30hari', diperlakukan sama seperti 'kalender' (fallback aman, 0 behavior baru).
function getMonthlyCashProjection(month,year,opts){
const now=new Date();
const y=(year!=null?year:now.getFullYear());
const m=(month!=null?month:now.getMonth());
const cfg=opts||{};
const useSiklus=cfg.billWindowMode==='siklus'&&typeof billingCycleRange==='function';
const cycleRange=useSiklus?billingCycleRange(now,cfg.cycleStartDay):null;

// 1) Proyeksi Gaji = gaji SUDAH tercatat (D.transactions bulan ini, via
// isGajiTransaction) + estimasi PENDING (D.workDays yang belum di-reset lewat
// confirmWeeklyReset()/openWeeklyResetManual(), masih nangkring di D.workDays
// mentah, jatuh di bulan target).
const recordedGaji=(D.transactions||[])
.filter(t=>isGajiTransaction(t)&&_cpInMonth(t.date,y,m))
.reduce((s,t)=>s+(t.amount||0),0);
const pendingGajiEstimate=(D.workDays||[])
.filter(w=>_cpInMonth(w.date,y,m))
.reduce((s,w)=>s+(w.total||0),0);
const proyeksiGaji=recordedGaji+pendingGajiEstimate;

// 2) Sisa Kewajiban Terjadwal — PENTING (acceptance criteria #3, "tidak dipotong
// dua kali"): markBillPaid() SUDAH memajukan nextDue begitu bill dibayar, jadi
// getBillOccurrencesInMonth()/getBillStats().monthTotal SECARA ALAMI sudah
// exclude bill yang baru dibayar & nextDue-nya sudah lewat dari bulan target
// (occurrence-nya sekarang jatuh di bulan berikutnya). KALAU kita naif
// `monthTotal - jumlah yang sudah dibayar` di atas total itu, bill yang sama
// bisa kepotong DUA KALI (sekali krn sudah tidak muncul di occurrence, sekali
// lagi krn ikut disubtract) -- makanya di sini dihitung PER-BILL: skip bill
// yang getBillPaidThisPeriodInfo()!=null utk periode target (baik krn nextDue
// sudah maju, MAUPUN kasus tepi freq mingguan yang occurrence-nya kebetulan
// masih nyangkut di bulan target walau sudah dibayar), sisanya baru dijumlah
// occurrence x amount. billMonthTotal/billPaidThisPeriod tetap dikembalikan
// terpisah sbg info mentah (bukan dipakai lagi utk hitung sisaKewajiban).
// S667B: jendela hitung kewajiban -- 'siklus' pakai billingCycleRange() (via
// getBillOccurrencesInRange(), SUDAH ADA di tagihan-kalender.js), default/lainnya PERSIS
// kode asli (getBillOccurrencesInMonth(b,y,m), bulan kalender m/y target).
// Catatan (limitasi terdokumentasi, disengaja): guard getBillPaidThisPeriodInfo() di mode
// 'siklus' dicek pakai bulan/tahun akhir siklus (cycleRange.to) -- fungsi itu sendiri
// murni month/year based (tidak ada versi range), jadi ini best-effort utk kasus tepi
// freq mingguan yang disebut di komentar acceptance criteria #3 di atas; occurrence
// utama (getBillOccurrencesInRange, via nextDue yang sudah dimajukan markBillPaid())
// tetap benar utk kasus umum bulanan/tahunan/sekali.
const billRangeYear=useSiklus?cycleRange.to.getFullYear():y;
const billRangeMonth=useSiklus?cycleRange.to.getMonth():m;
const billOccCount=(b)=>useSiklus
?(typeof getBillOccurrencesInRange==='function'?getBillOccurrencesInRange(b,cycleRange.from,cycleRange.to).length:0)
:(typeof getBillOccurrencesInMonth==='function'?getBillOccurrencesInMonth(b,y,m).length:0);
const billMonthTotal=useSiklus
?(D.bills||[]).reduce((s,b)=>s+billOccCount(b)*(b.amount||0),0)
:((typeof getBillStats==='function'?getBillStats(m,y).monthTotal:0)||0);
const billPaidThisPeriod=(D.bills||[])
.filter(b=>typeof getBillPaidThisPeriodInfo==='function'&&getBillPaidThisPeriodInfo(b,billRangeMonth,billRangeYear)!=null)
.reduce((s,b)=>s+(b.amount||0),0);
const sisaKewajiban=(D.bills||[]).reduce((s,b)=>{
if(typeof getBillPaidThisPeriodInfo==='function'&&getBillPaidThisPeriodInfo(b,billRangeMonth,billRangeYear)!=null)return s;
return s+billOccCount(b)*(b.amount||0);
},0);

// 3) Kiriman Mingguan (Sesi kiriman-mingguan-proyeksi-kas) — estimasi = SETTING
// GLOBAL yang sudah ada D.profile.kiriman ("Kiriman Mingguan (Rp)", Pengaturan →
// Profil, dipakai juga oleh InsightTargetMingguan) dikali jumlah minggu di bulan
// target (_cpWeeksInMonth di atas). SENGAJA reuse setting yang sudah ada, TIDAK ada
// field/override baru — user pilih opsi "cukup pakai setting global yang sudah ada".
const weeksInMonth=_cpWeeksInMonth(y,m);
const kirimanPerMinggu=(D.profile&&D.profile.kiriman)||0;
const kirimanEstimate=kirimanPerMinggu*weeksInMonth;

// 4) Proyeksi Kas = Proyeksi Gaji − Sisa Kewajiban − Kiriman Mingguan (estimasi).
// Boleh negatif (justru itu sinyal yang mau ditunjukkan ke user: pengeluaran
// terjadwal bulan ini lebih besar dari proyeksi gaji) — TIDAK di-floor ke 0.
const proyeksiKas=proyeksiGaji-sisaKewajiban-kirimanEstimate;

return{
month:m,year:y,
proyeksiGaji,recordedGaji,pendingGajiEstimate,
sisaKewajiban,billMonthTotal,billPaidThisPeriod,
weeksInMonth,kirimanPerMinggu,kirimanEstimate,
proyeksiKas,
// Alias kompat Sesi P2 (kartu UI ditulis melawan penamaan draft P1 yang lain --
// gajiProjected/kewajibanSisa/gajiTercatat/gajiPending/kewajibanTerjadwal --
// sebelum P1 final ini dipilih lewat audit data asli, lihat AUDIT-FINAL-P1-*.md).
// Nilainya identik dgn field di atas, cuma nama beda. 0 logika baru di sini.
gajiProjected:proyeksiGaji,
gajiTercatat:recordedGaji,
gajiPending:pendingGajiEstimate,
kewajibanSisa:sisaKewajiban,
kewajibanTerjadwal:billMonthTotal,
};
}
