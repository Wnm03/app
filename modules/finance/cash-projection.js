// cash-projection.js — Sesi P1 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md,
// Track 2). Presenter READ-ONLY: 0 ubah Finance/Accounting Engine. Utang berjadwal
// (cicilanBulanan>0) sudah auto-sync jadi D.bills kind:'utang' lewat piutang-utang.js/
// Debt.syncBill() — dibaca lewat getBillStats()/D.bills sudah otomatis ikut kehitung,
// TIDAK dibaca ulang dari D.debts di sini (dobel-hitung kalau iya).
// PENGECUALIAN SEMPIT (fix GAP-CP-002, Sesi audit-kartu-proyeksi-kas-insight): utang
// otomatis "Pinjam Dana Titipan" (autoTitipanOwnerId, cicilanBulanan:0 by design,
// lihat maybeCreateTitipanPinjamUtang() di piutang-utang.js) TIDAK PERNAH masuk
// D.bills sama sekali (Debt.syncBill() sengaja skip utang tanpa cicilan) -- utk
// kasus SEMPIT ini SAJA, getMonthlyCashProjection() baca D.debts langsung (filter
// ketat: autoTitipanOwnerId ada + !billId + cicilanBulanan<=0, lihat komentar di
// fungsinya) supaya kewajiban ini tidak lagi buta total dari proyeksi. 0 risiko
// dobel-hitung dgn utang lain krn filter itu persis kondisi shouldHaveBill=false.
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
// opts (S667B, OPSIONAL, 100% BACKWARD-COMPATIBLE) — {billWindowMode,cycleStartDay,
// includeKiriman,includePendingGaji}, REUSE PERSIS CashflowProjSettings/billingCycleRange
// (cashflow-projection-settings.js/tx-list-cashflow.js, Sesi 93/95) -- dipanggil tanpa opts
// (semua caller lama, termasuk _renderCashProjectionCard() sblm sesi ini) hasilnya IDENTIK
// perilaku lama (billWindowMode default 'kalender' = getBillOccurrencesInMonth(b,y,m), SAMA
// PERSIS kode asli di bawah; includeKiriman/includePendingGaji default true = SAMA PERSIS
// perilaku sesi kiriman-mingguan-proyeksi-kas, formula tidak berubah kalau opts tidak
// dikirim). HANYA sisaKewajiban/billMonthTotal/billPaidThisPeriod yang berubah kalau
// billWindowMode==='siklus' -- proyeksiGaji TETAP selalu bulan kalender m/y (gaji tidak ada
// konsep siklus tengah-bulan), pola sama persis computeCashflowForecast() yang cuma ubah
// jendela TAGIHAN, bukan income. Mode '30hari' (dipakai kartu Proyeksi Saldo Kas lain) TIDAK
// relevan di sini (kartu ini selalu per-bulan-kalender utk sisi gaji) -- kalau billWindowMode
// dikirim '30hari', diperlakukan sama seperti 'kalender' (fallback aman, 0 behavior baru).
//
// Sesi pengaturan-proyeksi-kas-lengkap (Keputusan #1-#3): includeKiriman(bool,default true)
// & includePendingGaji(bool,default true) MURNI toggle formula -- field mentah
// (recordedGaji/pendingGajiEstimate/kirimanEstimate/kirimanPerMinggu/weeksInMonth) SELALU
// dikembalikan apa adanya (0 disembunyikan) supaya panel "⚙️ Atur" & kartu bisa tetap
// menampilkan angka mentahnya sbg info, cuma formula proyeksiGaji/proyeksiKas yang
// menyesuaikan mana yang disertakan.
function getMonthlyCashProjection(month,year,opts){
const now=new Date();
const y=(year!=null?year:now.getFullYear());
const m=(month!=null?month:now.getMonth());
const cfg=opts||{};
const includeKiriman=cfg.includeKiriman!==false;
const includePendingGaji=cfg.includePendingGaji!==false;
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
const proyeksiGaji=recordedGaji+(includePendingGaji?pendingGajiEstimate:0);

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
// kewajibanItems — dikumpulkan BARENGAN loop sisaKewajiban di bawah (0 loop D.bills
// tambahan), dipakai murni utk breakdown "Top-3 kontributor terbesar" di kartu UI
// (Sesi audit-kartu-proyeksi-kas-insight, quick win #5) -- 0 logika hitung baru,
// sekadar menyimpan {name,amount} tiap item yang SUDAH ikut kehitung sisaKewajiban.
const kewajibanItems=[];
const sisaKewajibanTerjadwal=(D.bills||[]).reduce((s,b)=>{
if(typeof getBillPaidThisPeriodInfo==='function'&&getBillPaidThisPeriodInfo(b,billRangeMonth,billRangeYear)!=null)return s;
const amt=billOccCount(b)*(b.amount||0);
if(amt>0)kewajibanItems.push({name:b.name||'(tagihan tanpa nama)',amount:amt});
return s+amt;
},0);
// FIX GAP-CP-002 (audit-kartu-proyeksi-kas-insight): utang otomatis "Pinjam Dana
// Titipan" (maybeCreateTitipanPinjamUtang(), piutang-utang.js, Sesi 714/719-720)
// SENGAJA dibuat dgn cicilanBulanan:0 (lump-sum, tanpa jadwal cicilan tetap) --
// Debt.syncBill() punya guard shouldHaveBill=!lunas&&cicilanBulanan>0, jadi utang
// jenis ini TIDAK PERNAH disinkron jadi D.bills. Akibatnya sebelum fix ini, utang
// itu 100% BUTA dari "Sisa Kewajiban" (loop di atas HANYA baca D.bills) -- kalau
// user pinjam dari Dana Titipan, proyeksi kas sama sekali tidak tahu kewajiban itu
// ada. Ini beda dari filosofi "under-estimate lebih aman drpd over-estimate" di
// bagian gaji (komentar atas file ini) -- di sini arahnya salah: kewajiban nyata
// TERSEMBUNYI PENUH, bukan sekadar under-estimate.
// Fix (SEMPIT & aman thd dobel-hitung): baca D.debts HANYA utk entri yang (a) belum
// lunas, (b) `autoTitipanOwnerId` ada (khusus dibuat otomatis dari alur Titipan, 0
// menyentuh utang manual biasa yang user memang sengaja tidak kasih cicilan), dan
// (c) TIDAK punya billId & cicilanBulanan<=0 (persis kondisi shouldHaveBill=false di
// Debt.syncBill() -- kalau suatu saat W kasih utang ini cicilanBulanan lewat Buku
// Utang manual, otomatis ikut disinkron ke D.bills & otomatis KELUAR dari filter ini,
// 0 risiko dobel-hitung). Nilai dipakai `d.nilai` (outstanding, sudah otomatis
// berkurang tiap pembayaran parsial via syncTitipanPinjamUtangOnEdit()) -- utang jenis
// ini tidak py jadwal pasti, jadi (khusus kategori ini) dianggap kewajiban PENUH
// begitu ada & belum lunas, ditampilkan terpisah di kewajibanItems supaya user tetap
// bisa lihat sumbernya (bukan disembunyikan lagi jadi 1 angka gabungan yang membingungkan).
const titipanPinjamUnscheduled=(D.debts||[])
.filter(d=>d&&!d.lunas&&d.autoTitipanOwnerId&&!d.billId&&(d.cicilanBulanan||0)<=0);
const titipanPinjamUnscheduledTotal=titipanPinjamUnscheduled.reduce((s,d)=>{
const amt=d.nilai||0;
if(amt>0)kewajibanItems.push({name:d.name||'Pinjam Dana Titipan',amount:amt});
return s+amt;
},0);
const sisaKewajiban=sisaKewajibanTerjadwal+titipanPinjamUnscheduledTotal;
// topKewajiban — 3 kontributor terbesar (bill terjadwal + utang titipan tak
// terjadwal digabung 1 daftar, diurutkan desc) -- quick win #5, murni presenter.
const topKewajiban=kewajibanItems.slice().sort((a,b)=>b.amount-a.amount).slice(0,3);

// 3) Kiriman Mingguan (Sesi kiriman-mingguan-proyeksi-kas) — estimasi = SETTING
// GLOBAL yang sudah ada D.profile.kiriman ("Kiriman Mingguan (Rp)", Pengaturan →
// Profil, dipakai juga oleh InsightTargetMingguan) dikali jumlah minggu di bulan
// target (_cpWeeksInMonth di atas). SENGAJA reuse setting yang sudah ada, TIDAK ada
// field/override baru — user pilih opsi "cukup pakai setting global yang sudah ada".
const weeksInMonth=_cpWeeksInMonth(y,m);
const kirimanPerMinggu=(D.profile&&D.profile.kiriman)||0;
const kirimanEstimate=kirimanPerMinggu*weeksInMonth;

// 4) Proyeksi Kas = Proyeksi Gaji − Sisa Kewajiban − Kiriman Mingguan (kalau
// includeKiriman!==false). Boleh negatif (justru itu sinyal yang mau ditunjukkan ke
// user: pengeluaran terjadwal bulan ini lebih besar dari proyeksi gaji) — TIDAK
// di-floor ke 0.
const proyeksiKas=proyeksiGaji-sisaKewajiban-(includeKiriman?kirimanEstimate:0);

// 5) saldoKasSekarang/proyeksiSaldoAkhirBulan (quick win #1, audit-kartu-proyeksi-
// kas-insight) — "Proyeksi Kas" di atas cuma DELTA (gaji−kewajiban−kiriman), TIDAK
// dijumlah dgn saldo kas bebas sekarang, jadi defisit Rp500rb kelihatan sama
// merahnya baik saldo kas 0 maupun 5jt. Fix: 100% REUSE totalSaldoAkun() (akun.js,
// definisi "Total Saldo Akun" yang SAMA dipakai Dashboard/Laporan lainnya di seluruh
// app -- 0 rumus baru, 0 field baru soal kas). Guard typeof (aman kalau akun.js
// belum dimuat bareng, pola sama fungsi lain di file ini) -- fallback null (BUKAN 0)
// supaya presenter/kartu UI bisa bedakan "belum bisa dihitung" vs "kosong beneran".
const saldoKasSekarang=(typeof totalSaldoAkun==='function')?totalSaldoAkun():null;
const proyeksiSaldoAkhirBulan=(saldoKasSekarang!=null)?(saldoKasSekarang+proyeksiKas):null;

// 6) piutangJatuhTempoBulanIni (medium win, audit-kartu-proyeksi-kas-insight) — piutang
// (D.piutang) yang BELUM lunas & `jatuhTempo` jatuh di bulan target, DIJUMLAH murni sbg
// INFO SKENARIO OPTIMIS -- SENGAJA TIDAK masuk ke proyeksiKas/proyeksiSaldoAkhirBulan di
// atas (piutang jatuh tempo tidak menjamin CAIR tepat waktu, beda sifatnya dari
// gaji/kewajiban yang relatif pasti) -- pola sama persis filosofi under-estimate di atas.
// Presenter (_renderCashProjectionCard) WAJIB menampilkan ini terpisah, berlabel jelas
// "skenario optimis kalau piutang cair", BUKAN dijumlah diam2 ke angka utama supaya
// user tidak salah kira kas pasti selonggar itu.
const piutangJatuhTempoBulanIni=(D.piutang||[])
.filter(p=>p&&!p.lunas&&_cpInMonth(p.jatuhTempo,y,m))
.reduce((s,p)=>s+(p.nilai||0),0);

return{
month:m,year:y,
proyeksiGaji,recordedGaji,pendingGajiEstimate,includePendingGaji,
sisaKewajiban,billMonthTotal,billPaidThisPeriod,
titipanPinjamUnscheduledTotal,kewajibanItems,topKewajiban,
weeksInMonth,kirimanPerMinggu,kirimanEstimate,includeKiriman,
proyeksiKas,saldoKasSekarang,proyeksiSaldoAkhirBulan,
piutangJatuhTempoBulanIni,
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

// getCashProjectionTrend(month,year,opts,monthsBack) — Sesi audit-kartu-proyeksi-kas-
// insight (item besar-effort #9, sparkline tren beberapa bulan). Fungsi murni, 0 rumus
// baru -- cuma memanggil getMonthlyCashProjection() berulang utk monthsBack bulan
// terakhir (termasuk bulan target), TIDAK butuh storage snapshot baru (beda dari
// kalibrasi proyeksi vs realisasi yang masih di-carry-forward krn ITU perlu snapshot
// AWAL bulan tersimpan -- trend di sini beda, tiap titik dihitung ULANG dari data
// SEKARANG, jadi wajar kalau angka bulan lalu di sini bisa beda dari yang tampil di
// kartu bulan lalu waktu itu, mis. kalau ada transaksi/tagihan yang baru ditambahkan
// belakangan dgn tanggal mundur -- ini BUKAN bug, konsekuensi wajar dari "hitung ulang"
// vs "snapshot").
// Urutan hasil: KRONOLOGIS (bulan tertua duluan, bulan target di elemen terakhir) --
// lebih natural utk dirender sbg sparkline kiri->kanan.
function getCashProjectionTrend(month,year,opts,monthsBack){
const now=new Date();
const y=(year!=null?year:now.getFullYear());
const m=(month!=null?month:now.getMonth());
const n=(monthsBack>0)?monthsBack:6;
const out=[];
for(let i=n-1;i>=0;i--){
let tm=m-i,ty=y;
while(tm<0){tm+=12;ty-=1;}
out.push(getMonthlyCashProjection(tm,ty,opts));
}
return out;
}

// ==== Kalibrasi Proyeksi vs Realisasi (item besar-effort #10, carry-forward S721) ====
// Beda mendasar dari getCashProjectionTrend() di atas: trend HITUNG ULANG tiap titik
// dari data SEKARANG (jadi angka bulan lalu bisa berubah kalau ada transaksi baru dgn
// tanggal mundur). Kalibrasi butuh sebaliknya -- angka proyeksi yang DIBEKUKAN persis
// seperti waktu pertama kali dilihat di awal bulan, supaya "meleset X%" dibandingkan
// terhadap proyeksi ASLI, bukan proyeksi yang diam-diam sudah ikut ter-update oleh data
// baru. Makanya perlu SNAPSHOT tersimpan (D.cashProjSnapshots), bukan cuma re-computasi.
//
// Desain (keputusan sesi ini, didokumentasikan eksplisit krn item ini di-flag "butuh
// keputusan desain" di carry-forward S721):
// 1. Snapshot diambil OTOMATIS kali PERTAMA kartu Proyeksi Kas dirender di bulan target
//    (dipanggil dari _renderCashProjectionCard(), lihat modules-render.js) -- BUKAN scheduled
//    job terpisah (app ini tidak py background scheduler), pola paling sederhana yang
//    konsisten dgn arsitektur "render-triggered" yang sudah dipakai di seluruh dashboard.
// 2. recordCashProjectionSnapshot() IDEMPOTEN per month/year -- kalau entri utk bulan itu
//    SUDAH ada, TIDAK ditimpa lagi (kecuali opts.force:true) -- supaya snapshot tetap
//    mewakili proyeksi paling AWAL kartu dilihat bulan itu, bukan proyeksi hari terakhir.
// 3. "Realisasi" utk kalibrasi = pemasukan−pengeluaran kas riil (hitungKas!==false) bulan
//    itu dari D.transactions -- BUKAN saldo akhir bulan (app tidak simpan histori saldo
//    harian, jadi saldo akhir bulan lampau tidak bisa direkonstruksi persis). Dibandingkan
//    terhadap snapshot.proyeksiKas (delta gaji−kewajiban−kiriman), bukan proyeksiSaldoAkhirBulan,
//    supaya perbandingan apple-to-apple (proyeksiKas juga delta, bukan posisi saldo).
// 4. Kalibrasi HANYA dihitung utk bulan yang SUDAH LEWAT (bulan berjalan belum "final",
//    realisasinya belum lengkap) -- caller wajib pastikan month/year yang dicek < bulan
//    ini kalau mau hasil bermakna (fungsi sendiri tidak melarang, tapi getCashProjectionCalibrationSummary()
//    di bawah SENGAJA skip bulan berjalan/masa depan).

// recordCashProjectionSnapshot(month,year,opts,force) — simpan snapshot proyeksiKas bulan
// target ke D.cashProjSnapshots (dibuat kalau belum ada array-nya, pola sama persis
// D.gajiMingguanHistory di reset-gaji-mingguan.js). Idempoten per month/year kecuali
// force:true. Return entri snapshot (baru ATAU yang sudah ada sebelumnya).
function recordCashProjectionSnapshot(month,year,opts,force){
if(!Array.isArray(D.cashProjSnapshots))D.cashProjSnapshots=[];
const now=new Date();
const y=(year!=null?year:now.getFullYear());
const m=(month!=null?month:now.getMonth());
const idx=D.cashProjSnapshots.findIndex(s=>s&&s.month===m&&s.year===y);
if(idx!==-1&&!force)return D.cashProjSnapshots[idx];
const r=getMonthlyCashProjection(m,y,opts);
const entry={
month:m,year:y,
proyeksiKas:r.proyeksiKas,
proyeksiSaldoAkhirBulan:r.proyeksiSaldoAkhirBulan,
saldoKasSekarang:r.saldoKasSekarang,
recordedAt:now.toISOString(),
};
if(idx!==-1)D.cashProjSnapshots[idx]=entry;
else D.cashProjSnapshots.push(entry);
return entry;
}

// getCashProjectionCalibration(month,year) — bandingkan snapshot proyeksiKas bulan target
// (kalau ada) thd realisasi kas riil (pemasukan−pengeluaran hitungKas!==false, D.transactions
// bulan itu). Fungsi murni, 0 baca DOM. available:false kalau belum pernah ada snapshot
// tersimpan utk bulan itu (kartu belum pernah dibuka bulan itu, atau bulan sebelum fitur
// ini ada -- 0 data lama utk dikalibrasi, wajar & bukan bug).
function getCashProjectionCalibration(month,year){
const snap=(D.cashProjSnapshots||[]).find(s=>s&&s.month===month&&s.year===year);
if(!snap)return{available:false,month,year};
const txM=(D.transactions||[]).filter(t=>t&&t.hitungKas!==false&&_cpInMonth(t.date,year,month));
const incRealized=txM.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount||0),0);
const expRealized=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount||0),0);
const realisasiKas=incRealized-expRealized;
const selisih=realisasiKas-snap.proyeksiKas;
// pctError: null kalau proyeksi persis 0 (div-by-zero, jarang tapi mungkin) -- caller
// harus guard null sebelum ditampilkan sbg persentase.
const pctError=(snap.proyeksiKas!==0)?(selisih/Math.abs(snap.proyeksiKas)):null;
// verdict: 'optimis' = proyeksi lebih tinggi dari realisasi (kas riil ternyata lebih
// kecil dari yang diproyeksikan), 'pesimis' = sebaliknya (realisasi lebih baik dari
// proyeksi), 'akurat' = selisih persis 0 (jarang, tapi valid).
const verdict=selisih<0?'optimis':(selisih>0?'pesimis':'akurat');
return{
available:true,month,year,
proyeksiKas:snap.proyeksiKas,realisasiKas,selisih,pctError,verdict,
snapshotRecordedAt:snap.recordedAt,
};
}

// getCashProjectionCalibrationSummary(monthsBack) — agregat kalibrasi BEBERAPA bulan lalu
// (default 6, HANYA bulan yang sudah lewat -- bulan berjalan/masa depan SENGAJA dilewati,
// realisasinya belum final). Fungsi murni. Mengembalikan {available,history,avgPctError,
// avgAbsPctError,biasVerdict} -- biasVerdict rule-based SEDERHANA dari rata-rata pctError (>+5% = cenderung
// pesimis/under-estimate, <-5% = cenderung optimis/over-estimate, di antaranya = "cukup akurat"),
// AMBANG 5% dipilih sederhana (bukan uji statistik formal) sekadar sinyal kasar spy user tidak
// harus baca tabel angka satu-satu.
//
// avgAbsPctError (Sesi S726, carry-forward S725 "rentang optimis/pesimis") — rata-rata
// NILAI ABSOLUT pctError (beda dari avgPctError yang BERARAH/bisa saling meniadakan
// pesimis & optimis) -- dipakai sbg lebar band SIMETRIS di sekitar proyeksiKas (keputusan
// W: band simetris, bukan digeser bias arah / bukan min-max). 100% REUSE `withPct` yang
// sudah dihitung utk avgPctError, 0 query data baru.
function getCashProjectionCalibrationSummary(monthsBack){
const now=new Date();
const y=now.getFullYear();
const m=now.getMonth();
const n=(monthsBack>0)?monthsBack:6;
const history=[];
for(let i=n;i>=1;i--){
let tm=m-i,ty=y;
while(tm<0){tm+=12;ty-=1;}
const c=getCashProjectionCalibration(tm,ty);
if(c.available)history.push(c);
}
if(!history.length)return{available:false,history:[]};
const withPct=history.filter(h=>h.pctError!=null);
const avgPctError=withPct.length?(withPct.reduce((s,h)=>s+h.pctError,0)/withPct.length):null;
const avgAbsPctError=withPct.length?(withPct.reduce((s,h)=>s+Math.abs(h.pctError),0)/withPct.length):null;
let biasVerdict='campur';
if(avgPctError!=null){
if(avgPctError>0.05)biasVerdict='pesimis';
else if(avgPctError<-0.05)biasVerdict='optimis';
else biasVerdict='akurat';
}
return{available:true,history,avgPctError,avgAbsPctError,biasVerdict};
}

// getAttendancePatternStats(limit) — Sesi "Proyeksi Pola Absen" (Keputusan #1 W: basis
// proyeksi = pola dari isi absen HISTORIS, bukan absen minggu berjalan yang masih bisa
// berubah). Sumber: D.gajiMingguanHistory (diisi confirmWeeklyReset(), lihat
// modules/business/reset-gaji-mingguan.js — {weekStart,weekEnd,total,count,resetDate,
// incomeSaved}, max 26 entri tersimpan). Fungsi murni, 0 baca DOM.
//
// limit (opsional, default 10) — jumlah minggu TERCATAT terakhir yang dipakai (bukan 10
// minggu kalender terakhir — kalau user pernah skip reset beberapa minggu, yang dipakai
// tetap 10 ENTRI terakhir yang ada di riwayat, sesuai kata "tercatat" di keputusan W).
// Array.push() di confirmWeeklyReset() -> urutan array = kronologis, entri TERBARU ada di
// AKHIR array, jadi slice(-limit) sudah benar ambil yang terbaru.
//
// avgGajiPerHari dihitung WEIGHTED (totalGaji/totalHariKerja dari seluruh minggu yang
// dipakai), BUKAN rata-rata dari rata-rata per-minggu — supaya minggu dengan hari kerja
// lebih banyak proporsional lebih berpengaruh ke estimasi gaji/hari (lebih akurat drpd
// average-of-averages kalau jumlah hari kerja antar minggu tidak rata).
// avgHariKerjaPerMinggu dihitung SIMPLE (totalHariKerja/jumlah minggu) — termasuk minggu
// dgn count:0 (minggu libur/absen kosong TETAP bagian dari pola nyata, sengaja tidak
// di-exclude spy pola tidak over-estimate).
//
// hasEnoughData:false kalau riwayat kosong ATAU totalHariKerja:0 di seluruh minggu yang
// dipakai (avgGajiPerHari tidak bisa dihitung, div-by-zero digguard jadi 0) — caller
// (getPolaAbsenProjection()/kartu UI) WAJIB cek flag ini sebelum menampilkan proyeksi
// sbg angka pasti (proyeksi pola absen tidak masuk akal tanpa riwayat gaji/hari).
// ==== Proyeksi Multi-Bulan & Notifikasi Proaktif Defisit (carry-forward S723) ====
// getCashProjectionForecast(monthsAhead,opts) — proyeksi KE DEPAN beberapa bulan
// (beda arah dari getCashProjectionTrend() di atas, yang MUNDUR & hitung ulang bulan
// yang SUDAH lewat dari data yang SUDAH ada). Bulan depan belum py D.transactions/
// D.workDays sama sekali, jadi proyeksiGaji tidak bisa reuse recordedGaji/
// pendingGajiEstimate (keduanya pasti 0) -- forecast ini BARU dipindah ke fungsi
// terpisah (bukan menambah cabang di getMonthlyCashProjection()) supaya fungsi itu
// tetap murni "bulan tertentu, apa adanya" (0 perubahan perilaku ke fungsi yang
// sudah ada & sudah dites, konsisten acceptance criteria #4 P1).
//
// Sumber estimasi gaji bulan ke-2 dst: 100% REUSE getAttendancePatternStats() (avg
// gaji/hari & hari-kerja/minggu dari D.gajiMingguanHistory) -- SAMA PERSIS basis yang
// dipakai getPolaAbsenProjection() utk sisa hari bulan berjalan, di sini diperpanjang
// ke SATU BULAN PENUH (dailyWorkRate x jumlah hari kalender bulan itu). 0 sumber data
// baru, 0 pola statistik baru -- cuma jendela hari yang beda (1 bulan penuh, bukan
// cuma sisa hari bulan berjalan).
//
// Bulan pertama (i=0, bulan target/berjalan) SENGAJA TETAP pakai proyeksiGaji APA
// ADANYA dari getMonthlyCashProjection() (recordedGaji+pendingGajiEstimate) -- itu
// sebagian/seluruhnya SUDAH data nyata bulan itu, lebih akurat drpd pattern generik.
// gajiSource:'aktual' vs 'pola' dikembalikan per-bulan supaya presenter bisa
// membedakan mana proyeksi yang masih berbasis data nyata vs murni estimasi.
//
// sisaKewajiban/kirimanEstimate bulan depan TETAP dihitung PERSIS
// getMonthlyCashProjection() (getBillOccurrencesInMonth() aman dipanggil MAJU krn
// murni kalkulasi kalender dari b.nextDue+freq, bukan histori transaksi -- pola
// SUDAH dipakai begini di kartu Tagihan existing utk preview bulan depan, 0 kode
// kalender baru di sini).
//
// proyeksiSaldoKumulatif — running balance (saldoKasSekarang + akumulasi proyeksiKas
// tiap bulan berjalan), BUKAN proyeksiSaldoAkhirBulan per-bulan berdiri sendiri (yang
// itu cuma saldo SEKARANG + delta bulan ITU SAJA, salah kalau dipakai utk bulan ke-2
// dst -- defisit bulan ke-1 harus ikut mengurangi starting point bulan ke-2). null
// selama totalSaldoAkun() belum tersedia (pola guard sama persis
// saldoKasSekarang/proyeksiSaldoAkhirBulan di getMonthlyCashProjection()).
//
// hasEnoughData:false (dari pattern) -> proyeksiGaji bulan ke-2 dst di-set 0 (BUKAN
// disembunyikan/di-null-kan) -- defisit besar "palsu" yang muncul akibat ini SENGAJA
// dibiarkan tampak drpd diam2 pakai angka reka-reka tanpa dasar riwayat. Presenter
// WAJIB tampilkan flag hasEnoughData ini.
//
// ==== Sesi S725 (carry-forward S724, 3 dari 6 saran "proyeksi lebih informatif") ====
// confidence ('tinggi'/'sedang'/'rendah') & additionalWorkDaysNeeded (null|number)
// ditambahkan per entri months[] -- lihat komentar inline di masing-masing di bawah
// (dekat perhitungannya) buat detail. Keduanya 100% REUSE data yang sudah dihitung
// di loop ini (gajiSource/jarak-i utk confidence, pattern.avgGajiPerHari+proyeksiKas
// utk additionalWorkDaysNeeded) -- 0 sumber data baru, 0 pemanggilan fungsi lain.
//
// ==== Sesi S726 (carry-forward S725, item "rentang optimis/pesimis") ====
// rangeLow/rangeHigh (null|number) ditambahkan per entri months[] -- band simetris
// dari avgAbsPctError kalibrasi (getCashProjectionCalibrationSummary(), keputusan W:
// simetris, bukan digeser bias arah). Lihat komentar inline di dekat perhitungannya.
function getCashProjectionForecast(monthsAhead,opts){
const now=new Date();
const y0=now.getFullYear();
const m0=now.getMonth();
const n=(monthsAhead>0)?monthsAhead:3;
const cfg=opts||{};
const includeKiriman=cfg.includeKiriman!==false;
const pattern=getAttendancePatternStats(cfg.polaAbsenWeeks);
const dailyWorkRate=pattern.avgHariKerjaPerMinggu/7;
const calibSummary=getCashProjectionCalibrationSummary(cfg.calibrationMonthsBack);
const months=[];
let saldoRunning=null;
for(let i=0;i<n;i++){
let tm=m0+i,ty=y0;
while(tm>=12){tm-=12;ty+=1;}
const baseline=getMonthlyCashProjection(tm,ty,opts);
let proyeksiGaji,gajiSource;
if(i===0){
proyeksiGaji=baseline.proyeksiGaji;gajiSource='aktual';
}else{
const daysInMonth=new Date(ty,tm+1,0).getDate();
proyeksiGaji=pattern.hasEnoughData?(dailyWorkRate*daysInMonth*pattern.avgGajiPerHari):0;
gajiSource='pola';
}
const proyeksiKas=proyeksiGaji-baseline.sisaKewajiban-(includeKiriman?baseline.kirimanEstimate:0);
if(i===0)saldoRunning=baseline.saldoKasSekarang;
if(saldoRunning!=null)saldoRunning=saldoRunning+proyeksiKas;
// confidence — SEKEDAR label jarak-dari-sekarang, 0 statistik baru (bukan interval
// kepercayaan matematis, cuma penanda "makin jauh makin bergantung pola generik"
// biar user kalibrasi ekspektasi per baris tanpa baca gajiSource+jarak bulan
// sendiri). i===0 (gajiSource:'aktual', data nyata bulan berjalan) -> 'tinggi'.
// i===1 (bulan depan pertama full-pola) -> 'sedang'. i>=2 -> 'rendah'.
const confidence=i===0?'tinggi':(i===1?'sedang':'rendah');
// additionalWorkDaysNeeded — hari kerja EKSTRA (di atas pola rata-rata yang sudah
// terhitung di proyeksiGaji) yang kira-kira dibutuhkan buat nutup defisit bulan itu,
// 100% REUSE pattern.avgGajiPerHari (SAMA basis dgn proyeksiGaji itu sendiri, 0
// sumber data baru). null kalau tidak defisit (proyeksiKas>=0) ATAU
// avgGajiPerHari<=0 (div-by-zero guard, sama pola hasEnoughData di atas) -- angka
// ini SEKEDAR estimasi kasar linier (hari kerja tambahan x avgGajiPerHari = nutup
// gap), BUKAN jaminan (hari tambahan itu sendiri mungkin tidak tersedia tergantung
// jadwal toko).
const additionalWorkDaysNeeded=(proyeksiKas<0&&pattern.avgGajiPerHari>0)?Math.ceil((-proyeksiKas)/pattern.avgGajiPerHari):null;
// rangeLow/rangeHigh (Sesi S726, carry-forward S725 "rentang optimis/pesimis",
// Keputusan W: band SIMETRIS dari avgAbsPctError kalibrasi -- BUKAN digeser bias
// arah, BUKAN min/max historis). 100% REUSE getCashProjectionCalibrationSummary()
// (avgAbsPctError, lihat komentar di fungsi itu) -- 0 statistik baru dihitung di
// sini, cuma diterapkan sbg lebar band ± di sekitar proyeksiKas titik tengah.
// null/null kalau kalibrasi belum tersedia (riwayat snapshot kosong/kurang) ATAU
// avgAbsPctError null (semua snapshot lama proyeksiKas:0, div-by-zero guard sudah
// di getCashProjectionCalibration()) -- presenter WAJIB cek null sebelum tampil.
const rangeLow=(calibSummary.available&&calibSummary.avgAbsPctError!=null)?(proyeksiKas-Math.abs(proyeksiKas*calibSummary.avgAbsPctError)):null;
const rangeHigh=(calibSummary.available&&calibSummary.avgAbsPctError!=null)?(proyeksiKas+Math.abs(proyeksiKas*calibSummary.avgAbsPctError)):null;
months.push({
month:tm,year:ty,
proyeksiGaji,gajiSource,confidence,
sisaKewajiban:baseline.sisaKewajiban,
kirimanEstimate:baseline.kirimanEstimate,includeKiriman,
proyeksiKas,additionalWorkDaysNeeded,rangeLow,rangeHigh,
proyeksiSaldoKumulatif:saldoRunning,
});
}
return{
available:true,months,
hasEnoughData:pattern.hasEnoughData,
firstDeficitMonth:months.find(o=>o.proyeksiKas<0)||null,
firstNegativeSaldoMonth:months.find(o=>o.proyeksiSaldoKumulatif!=null&&o.proyeksiSaldoKumulatif<0)||null,
};
}

// getCashProjectionDeficitAlert(opts) — sinyal defisit proaktif (carry-forward S723,
// item "notifikasi proaktif defisit"). Fungsi murni, 0 baca DOM/localStorage/
// Notification di sini (itu urusan lapisan bridge, lihat modules/finance/deficit-
// notif-bridge.js, pola SAMA PERSIS VehicleNotifBridge/FuelNotifBridge di modules/
// vehicle/*) -- 100% REUSE getCashProjectionForecast() di atas, 0 rumus baru.
//
// alertMonthsAhead (opsional, default 3) -- HANYA memindai N bulan pertama forecast
// (bulan berjalan + N-1 bulan ke depan). Proyeksi makin jauh makin bergantung pada
// pattern generik (gajiSource:'pola'), memberi peringatan utk bulan yg sangat jauh
// berisiko menyesatkan drpd membantu.
//
// Prioritas trigger: proyeksiSaldoKumulatif<0 (saldo kas BENERAN diproyeksikan minus,
// bukan cuma delta bulan itu negatif -- user lebih perlu tau kalau UANGNYA BENERAN
// AKAN HABIS) diperiksa DULU, baru fallback ke proyeksiKas<0 murni (delta bulan itu
// defisit tapi masih ketutup saldo/tabungan -- tetap layak diingatkan, cuma prioritas
// lebih rendah drpd saldo beneran minus).
function getCashProjectionDeficitAlert(opts){
const cfg=opts||{};
const monthsAhead=(cfg.alertMonthsAhead>0)?cfg.alertMonthsAhead:3;
const forecast=getCashProjectionForecast(monthsAhead,opts);
const scanned=forecast.months.slice(0,monthsAhead);
const saldoMinus=scanned.find(o=>o.proyeksiSaldoKumulatif!=null&&o.proyeksiSaldoKumulatif<0);
if(saldoMinus)return{
available:true,type:'saldo',
month:saldoMinus.month,year:saldoMinus.year,amount:saldoMinus.proyeksiSaldoKumulatif,
hasEnoughData:forecast.hasEnoughData,
};
const kasMinus=scanned.find(o=>o.proyeksiKas<0);
if(kasMinus)return{
available:true,type:'kas',
month:kasMinus.month,year:kasMinus.year,amount:kasMinus.proyeksiKas,
hasEnoughData:forecast.hasEnoughData,
};
return{available:false};
}

function getAttendancePatternStats(limit){
const n=(limit>0?limit:10);
const history=Array.isArray(D.gajiMingguanHistory)?D.gajiMingguanHistory:[];
const recent=history.slice(-n);
const weeksUsed=recent.length;
const totalHariKerja=recent.reduce((s,w)=>s+(w&&w.count||0),0);
const totalGaji=recent.reduce((s,w)=>s+(w&&w.total||0),0);
const avgHariKerjaPerMinggu=weeksUsed>0?totalHariKerja/weeksUsed:0;
const avgGajiPerHari=totalHariKerja>0?totalGaji/totalHariKerja:0;
return{
weeksUsed,totalHariKerja,totalGaji,
avgHariKerjaPerMinggu,avgGajiPerHari,
hasEnoughData:weeksUsed>0&&totalHariKerja>0,
};
}

// getPolaAbsenProjection(month,year,opts) — Sesi "Proyeksi Pola Absen" (Keputusan #2 W:
// muncul di kartu "Proyeksi Kas Bulan Ini" di Beranda, jawab 2 pertanyaan: (a) kalau sisa
// hari MINGGU ini pola absen berlanjut seperti biasa, target Kiriman Mingguan tercapai
// atau kurang, (b) kalau sisa hari BULAN ini pola absen berlanjut, proyeksi kas akhir
// bulan plus atau minus). Presenter READ-ONLY di atas getAttendancePatternStats() +
// getMonthlyCashProjection() — 0 rumus baru di 2 fungsi itu, murni fungsi ke-3 yang
// menggabungkan keduanya dgn proyeksi hari tersisa.
//
// Model proyeksi (disengaja sederhana, "linier" dari pola historis — bukan prediksi
// per-hari-kalender mana yang bakal masuk kerja): dailyWorkRate = avgHariKerjaPerMinggu/7
// (rata-rata hari kerja per HARI KALENDER, bukan per hari kerja), dikali sisa hari
// kalender (minggu/bulan) buat estimasi TAMBAHAN hari kerja & gaji ke depan. Ini SAMA
// filosofi dgn kirimanEstimate di getMonthlyCashProjection() (kirimanPerMinggu x
// weeksInMonth) — proyeksi rata-rata, bukan simulasi kalender kerja hari-per-hari.
//
// Minggu berjalan pakai getWeekRange() (modules/business/reset-gaji-mingguan.js, definisi
// Minggu-Sabtu, SAMA PERSIS dipakai confirmWeeklyReset()) — file itu dimuat scripts/
// build.js jauh lebih awal dari file ini (GROUP_B, lihat catatan di atas), aman dipanggil
// langsung. D.workDays minggu berjalan (belum di-reset) dipakai sbg hari kerja "sudah
// terjadi" minggu ini (SAMA sumber dgn pendingGajiEstimate di getMonthlyCashProjection(),
// TAPI dihitung ulang di sini per-minggu bukan per-bulan — 0 pembacaan D.workDays baru,
// cuma jendela filter beda).
//
// Bulan target (month/year/opts) DIOPER APA ADANYA ke getMonthlyCashProjection() (proyeksi
// kas baseline bulan itu, termasuk gaji tercatat+pending & kewajiban — SAMA PERSIS kartu
// Proyeksi Kas Bulan Ini yang sudah ada), proyeksi tambahan pola absen HANYA ditambahkan
// kalau bulan target = bulan berjalan sungguhan (isCurrentMonth) — proyeksi "sisa hari
// bulan ini" tidak masuk akal utk bulan lain (mis. bulan yang sudah lewat/akan datang),
// jadi remainingDaysInMonth otomatis 0 & proyeksiKasPolaAbsen == proyeksiKasBaseline utk
// kasus itu (aman, tidak salah tampil).
// opts.polaAbsenWeeks (S/UI-limit-minggu, OPSIONAL, backward-compat -- tidak
// dikirim/null = SAMA PERSIS perilaku sebelum field ini ada, default 10 dari
// getAttendancePatternStats() sendiri) -- override jumlah minggu TERCATAT terakhir
// yang dipakai basis pola (REUSE CashflowProjSettings.polaAbsenWeeks, field lain di
// opts yang tidak dikenal fungsi ini, mis. billWindowMode, tetap diteruskan apa
// adanya ke getMonthlyCashProjection() di bawah tanpa terpengaruh).
function getPolaAbsenProjection(month,year,opts){
const cfg=opts||{};
const now=new Date();
const y=(year!=null?year:now.getFullYear());
const m=(month!=null?month:now.getMonth());
const isCurrentMonth=(y===now.getFullYear()&&m===now.getMonth());
const pattern=getAttendancePatternStats(cfg.polaAbsenWeeks);
const dailyWorkRate=pattern.avgHariKerjaPerMinggu/7;

// (a) Minggu berjalan -> target Kiriman Mingguan
const weekRange=(typeof getWeekRange==='function')?getWeekRange(now):{start:now,end:now};
const currentWeekWorkDays=(D.workDays||[]).filter(w=>{
const d=_cpLocalDate(w&&w.date);
return !isNaN(d.getTime())&&d>=weekRange.start&&d<=weekRange.end;
});
const currentWeekHariKerja=currentWeekWorkDays.length;
const currentWeekGaji=currentWeekWorkDays.reduce((s,w)=>s+(w.total||0),0);
const remainingDaysInWeek=6-now.getDay(); // hari SETELAH hari ini s/d Sabtu (Minggu-Sabtu, getWeekRange())
const projectedAdditionalHariKerjaMinggu=dailyWorkRate*remainingDaysInWeek;
const projectedAdditionalGajiMinggu=projectedAdditionalHariKerjaMinggu*pattern.avgGajiPerHari;
const projectedGajiMingguIni=currentWeekGaji+projectedAdditionalGajiMinggu;
const kirimanTarget=(D.profile&&D.profile.kiriman)||0;
const weeklyGap=projectedGajiMingguIni-kirimanTarget;
const weeklyVerdict=weeklyGap>=0?'tercapai':'kurang';

// (b) Bulan berjalan -> proyeksi kas akhir bulan
const remainingDaysInMonth=isCurrentMonth?(new Date(y,m+1,0).getDate()-now.getDate()):0;
const projectedAdditionalHariKerjaBulan=dailyWorkRate*remainingDaysInMonth;
const projectedAdditionalGajiBulan=projectedAdditionalHariKerjaBulan*pattern.avgGajiPerHari;
const baseline=(typeof getMonthlyCashProjection==='function')?getMonthlyCashProjection(m,y,opts):null;
const proyeksiKasBaseline=baseline?baseline.proyeksiKas:0;
const proyeksiKasPolaAbsen=proyeksiKasBaseline+projectedAdditionalGajiBulan;
const monthlyVerdict=proyeksiKasPolaAbsen>=0?'plus':'minus';

return{
month:m,year:y,isCurrentMonth,
pattern,
currentWeekHariKerja,currentWeekGaji,
remainingDaysInWeek,projectedAdditionalHariKerjaMinggu,projectedAdditionalGajiMinggu,
projectedGajiMingguIni,kirimanTarget,weeklyGap,weeklyVerdict,
remainingDaysInMonth,projectedAdditionalHariKerjaBulan,projectedAdditionalGajiBulan,
proyeksiKasBaseline,proyeksiKasPolaAbsen,monthlyVerdict,
hasEnoughData:pattern.hasEnoughData,
};
}
