// modules/shared/modules-render-b.js — lanjutan modules/shared/modules-render.js
// (Audit ukuran file, lanjutan S589/s644): file modules-render.js dipecah jadi 2 supaya
// di bawah OVERSIZED_FILE_LINE_THRESHOLD (1600 baris, scripts/build.js). File ini berisi
// separuh KEDUA (dari runDeferredOrNow() sampai akhir), murni dipindah baris demi baris
// (0 logika diubah). Semua isinya fungsi global (bukan module/object), jadi HARUS dimuat
// SETELAH modules-render.js (lihat scripts/build.js GROUP_A & catatan di header
// modules-render.js) supaya fungsi-fungsi yang saling panggil sudah sama-sama terdaftar
// di scope global saat renderDashboard()/renderKeuangan() dkk dipanggil runtime.

// runDeferredOrNow(fn) — PERF helper (unblock PIN-unlock/showMain freeze). Menjadwalkan `fn`
// supaya TIDAK jalan di tumpukan JS yang sama dengan pemanggilnya (browser sempat "napas" &
// nge-paint dulu), dengan fallback berlapis: requestAnimationFrame (browser modern) -> setTimeout
// 0ms (browser lama/lingkungan tanpa rAF) -> jalan LANGSUNG-sinkron kalau keduanya tidak ada
// (mis. lingkungan test Node yang me-load modules-render.js sendirian lewat loadSource() —
// lihat tests/helpers/loadSource.js, TIDAK menyediakan requestAnimationFrame & men-stub
// setTimeout jadi no-op yang tidak pernah memanggil callback-nya). Sengaja didefinisikan sendiri
// di sini (bukan bergantung ke fungsi dari file lain) supaya modules-render.js tetap bisa
// di-load & renderDashboard() tetap bisa dipanggil berdiri sendiri tanpa ReferenceError, sama
// seperti sebelum perubahan ini. 0 logika bisnis baru — murni pengaturan KAPAN `fn` dieksekusi.
function runDeferredOrNow(fn){
if(typeof requestAnimationFrame==='function'){requestAnimationFrame(fn);return;}
if(typeof setTimeout==='function'){setTimeout(fn,0);return;}
fn();
}

// _dashMonthlyIncExp(txM) — Sesi T2 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md,
// Track 1 "titik laporan utama Dashboard"). Pure helper: agregasi Pemasukan/Pengeluaran bulan
// berjalan yg dipakai dashCtx di renderDashboard() (di bawah) — dipisah jadi fungsi sendiri
// (bukan inline spt sebelumnya) supaya testable tanpa perlu sandbox DOM-heavy renderDashboard()
// (extractFunction() di tests/helpers/loadSource.js bisa ambil fungsi ini sendirian).
// Guard hitungKas:false (Sesi T1, lihat recalcAccBalance() di modules/finance/akun.js): transaksi
// Tunai bertanda "Catatan saja" SENGAJA di-skip dari total Pemasukan/Pengeluaran di sini juga,
// konsisten dgn saldo akun yg sudah skip transaksi itu (dua2nya sama2 representasi kas riil).
// absen/undefined tetap dihitung normal (backward-compatible, 0 migrasi data lama, pola sama T1).
// Scope T2 ini SENGAJA cuma titik dashCtx ini (dipakai FinCoach/KeuanganInsight lewat ctx) — titik
// laporan sekunder lain (modules-calc.js, filter-laporan.js, cashflow/forecast presenter dst) ADA
// query masing2 yg beda & BELUM disentuh sesi ini, dicicil terpisah di Sesi T4+ per RENCANA KERJA.
function _dashMonthlyIncExp(txM){
const inc=txM.filter(t=>t.type==='income'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
return{inc,exp};
}
function renderDashboard(){
LifeBalance.render();
// Konteks bulan-berjalan dihitung SEKALI di sini (dulu FinCoach & dashBillCard hitung
// txM/inc/exp/billStats sendiri-sendiri lagi walau datanya sama persis dengan yang dihitung di
// bawah buat statistik atas). Dioper ke widget yang butuh (billStatsShared->renderDashboardBills,
// dashCtx->FinCoach) supaya D.transactions/D.bills tidak di-scan ulang berkali-kali tiap 1x buka
// Dashboard. Widget lain di bawah (LifeBalance/AIWidget/dst) sengaja TIDAK diikutkan dulu — masing2
// hitung metrik yang beda (bukan cuma txM/inc/exp bulan ini), digabung nanti kalau memang kepakai bareng.
if(typeof Advisor!=='undefined')Advisor.render();
if(typeof AIWidget!=='undefined')AIWidget.render();
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const{inc,exp}=_dashMonthlyIncExp(txM);
const billStatsShared=(typeof getBillStats==='function')?getBillStats():null;
const dashCtx={now,m,y,txM,inc,exp,billStats:billStatsShared};
if(typeof FinCoach!=='undefined')FinCoach.renderDash(dashCtx);
if(typeof AIRecommendCard!=='undefined')AIRecommendCard.render();
if(typeof AIDailyBriefingCard!=='undefined')AIDailyBriefingCard.render();
if(typeof AIStatusCard!=='undefined')AIStatusCard.render();
// S138 (breadcrumb-navigasi-3lapis): baris yang dulu menulis ke dIncome/dExpense/
// dBalance/dShop/recentTx/dashAccList DIHAPUS — elemen2 itu HANYA ada di dalam
// blok HTML #page-dashboard lama yang sudah dihapus sesi ini (Kekayaan Bersih/
// Saldo Bulan Ini/Transaksi Terakhir versi Dashboard Hub sudah punya presenter
// live sendiri — FinanceDashboard/DashboardHubSummary dst, lihat live-wiring di
// bawah). dashCtx (now/m/y/txM/inc/exp/billStats) TETAP dihitung & dipertahankan
// apa adanya karena masih dikonsumsi FinCoach.renderDash(dashCtx) di bawah.
// Card opsional lewat feature registry DASH_CARD_DEFS/DASH_RENDER_ORDER — tiap card dicek dulu ke
// isDashCardOn() sebelum dihitung/dirender: kalau user matikan lewat Pengaturan → Tampilan →
// Kartu di Beranda, elemennya disembunyikan DAN fungsi hitungnya SAMA SEKALI TIDAK dipanggil
// (bukan cuma disembunyikan lewat CSS), jadi fitur yang tidak dipakai (mis. SewaKios/Pensiun)
// tidak ikut nge-scan data tiap buka Beranda. Urutan render mengikuti DASH_RENDER_ORDER, BUKAN
// urutan DASH_CARD_DEFS (yang dipakai checklist Pengaturan) — lihat catatan di dekat DASH_CARD_DEFS.
// BUGFIX (2026-07-11): tiap card DIBUNGKUS try/catch sendiri-sendiri. Sebelumnya kalau SATU
// card (mis. gara-gara data anggaran/kategori yang sudah rusak/dihapus) melempar error, seluruh
// sisa loop ikut berhenti — semua card SETELAHNYA di DASH_RENDER_ORDER jadi tidak ter-render
// ulang sama sekali (nyisa konten lama dari render sebelumnya) TANPA pesan apapun ke user selain
// toast generik "Ada error kecil" dari _friendlyErrorNotice. Sekarang tiap card gagal dicatat ke
// console.warn & dilewati SENDIRIAN — card lain tetap lanjut dirender normal.
// S129 (Dashboard Settings): urutan render kartu sekarang lewat
// DashboardSettings.applyDashCardOrder() (modules/dashboard-hub/
// dashboard-hub-settings.js) kalau modul itu sudah dimuat — 100% reuse
// DASH_RENDER_ORDER sbg fallback default-nya (lihat isi fungsi itu), TIDAK
// mengganti DASH_RENDER_ORDER itu sendiri. Guard typeof supaya tetap aman
// dipanggil dari test yang me-load modules-render.js sendirian tanpa modul
// dashboard-hub-settings.js (perilaku lama, urutan tetap DASH_RENDER_ORDER).
const dashCardRenderOrder=(typeof DashboardSettings!=='undefined'&&typeof DashboardSettings.applyDashCardOrder==='function')?DashboardSettings.applyDashCardOrder():DASH_RENDER_ORDER;
for(const key of dashCardRenderOrder){
const cardDef=DASH_CARD_BY_KEY[key];
if(!isDashCardOn(key)){hideDashCardEl(cardDef.elId);continue;}
showDashCardEl(cardDef.elId);
try{
cardDef.render(dashCtx);
}catch(e){
console.warn('renderDashboard: card "'+key+'" ('+cardDef.elId+') gagal dirender, dilewati:',e);
}
}
// ================== DASHBOARD HUB — LIVE WIRING (dashboard wiring Fase 2) ==================
// renderDashboard() sudah dipanggil dari puluhan titik save() di seluruh app (transaksi, shop,
// vehicle, akun, kategori, tagihan, dst) — Advisor.render()/LifeBalance.render() di atas SUDAH
// otomatis ikut ter-update lewat titik ini tiap kali data berubah, di halaman manapun user
// sedang berada. Hero Card/Summary Cards/Dashboard Analytics/Favorit (Dashboard Hub, Sprint 1)
// SEBELUMNYA cuma ter-render ulang lewat DashboardHub.render() (dipanggil navigasi/showPage
// saja), jadi kalau user tetap di halaman Dashboard Hub lalu menyimpan data dari Quick
// Action/modal, angkanya tidak ikut ter-update sampai halaman dibuka ulang. Baris di bawah
// menyambungkannya ke titik "live" yang sama dengan Advisor/LifeBalance — BUKAN mekanisme baru,
// murni pola yang sudah ada, cuma tadinya belum diikutkan. EIEDashboard.render() ikut disertakan
// krn ini yang berperan sbg "AI Insight" Dashboard Hub (lihat DashboardHub.render() di
// dashboard-hub.js) — sudah self-guarded (_rendering flag) & throttle sync makro 1x/hari sendiri,
// jadi aman dipanggil sesering renderDashboard(). Dibungkus try/catch SENDIRI (pola sama dgn
// loop DASH_RENDER_ORDER di atas) supaya kalau salah satu gagal, TIDAK menjatuhkan sisa
// renderDashboard() yang dipanggil dari alur simpan data di halaman lain (Keuangan/Shop/dst).
// PERF (unblock PIN-unlock/showMain freeze, lihat catatan runDeferredOrNow() di
// features-helpers-global-security.js): blok presenter di bawah ini (~18 sejak Sesi 134,
// 10 Finance + 8 Vehicle DIHAPUS — lihat catatan gap fix di bawah) TIDAK dicek
// isDashCardOn() dulu (beda dari loop DASH_RENDER_ORDER di atas) & sebelumnya jalan SINKRON di
// tumpukan JS yang sama dengan showMain() -> layar PIN "membeku" sampai semuanya selesai baru
// dashboard-core kelihatan, makin kerasa kalau data besar. Sekarang dijadwalkan lewat
// runDeferredOrNow() (rAF kalau tersedia, fallback setTimeout 0, fallback jalan LANGSUNG kalau
// keduanya tidak ada mis. lingkungan test Node) supaya browser sempat "napas" & nge-paint
// dashboard-core (Advisor/LifeBalance/kartu ringkasan/loop DASH_RENDER_ORDER di atas) dulu
// sebelum blok ini menyusul sepersekian detik kemudian. 0 perubahan logika/urutan/isi widget —
// yang berubah cuma KAPAN blok ini dieksekusi, bukan APA yang dieksekusi ataupun isi try/catch-nya.
runDeferredOrNow(function(){
// S159 (bugfix — kartu presenter tertentu "menghitung terus"): blok ini
// SEBELUMNYA 1 try/catch besar membungkus ~14 presenter berurutan. Kalau
// presenter manapun di tengah throw, seluruh sisa blok berhenti dieksekusi --
// presenter setelahnya tidak pernah kepanggil, kartu tetap HTML statis
// "Menghitung..." selamanya (error cuma keluar sbg console.warn, tidak
// kelihatan user). Sekarang TIAP presenter dibungkus try/catch SENDIRI (pola
// sama persis dgn loop DASH_RENDER_ORDER di atas blok ini) -- 1 presenter
// gagal cuma melewati presenter itu, sisanya tetap jalan. 0 perubahan
// urutan/logika presenter manapun, murni isolasi failure.
function _safeRender(name,fn){
try{fn();}catch(e){console.warn('renderDashboard: presenter "'+name+'" gagal dirender, dilewati:',e);}
}
_safeRender('DashboardHubHero',function(){if(typeof DashboardHubHero!=='undefined')DashboardHubHero.render();});
_safeRender('DashboardHubSummary',function(){if(typeof DashboardHubSummary!=='undefined')DashboardHubSummary.render();});
_safeRender('DashboardHubAnalytics',function(){if(typeof DashboardHubAnalytics!=='undefined')DashboardHubAnalytics.render();});
_safeRender('DashboardHubOwnershipSummary',function(){if(typeof DashboardHubOwnershipSummary!=='undefined')DashboardHubOwnershipSummary.render();});
// Finance Dashboard/Forecast/Budget Reko/Cashflow Proj/Financial Goal/Invest Planner/Debt
// Optimizer/Retirement Planner/Health Score/Risk Dashboard (10 presenter) — DIHAPUS dari live-
// wiring ini di Sesi 134 (gap fix pasca-Sesi 133). Alasan asli blok ini ("supaya card Dashboard
// Hub tetap live-update kalau user simpan data dari halaman lain") sudah TIDAK berlaku buat 10
// presenter ini krn card-nya sudah pindah keluar dari Dashboard Hub ke #page-keuangan (Sesi 133).
// Sebelum fix ini, 10 presenter di atas tetap dihitung ulang di SINI setiap kali salah satu dari
// puluhan titik save() di seluruh app terpanggil (bukan cuma pas buka tab Keuangan) — padahal
// renderKeuangan() (dipanggil dari titik save() yang SAMA) sudah menghitung ulang persis yang
// sama. 100% duplikasi kerja, 0 manfaat (containernya sudah tidak ada di Dashboard Hub lagi).
// Live-update Dashboard Hub utk 10 presenter ini sekarang murni via renderKeuangan().
_safeRender('PropertyManagementPresenter',function(){if(typeof PropertyManagementPresenter!=='undefined')PropertyManagementPresenter.render();});
_safeRender('RentalManagementPresenter',function(){if(typeof RentalManagementPresenter!=='undefined')RentalManagementPresenter.render();});
_safeRender('AssetPortfolioPresenter',function(){if(typeof AssetPortfolioPresenter!=='undefined')AssetPortfolioPresenter.render();});
_safeRender('AssetMaintenancePresenter',function(){if(typeof AssetMaintenancePresenter!=='undefined')AssetMaintenancePresenter.render();});
// Shop Business Engine Integration (S199, Finalisasi Integrasi Shop) —
// tambahan murni, pola sama _safeRender di atas. 100% reuse
// InventoryEngine/PurchaseEngine/ProfitEngine (S198), UI hanya presenter.
_safeRender('ShopBusinessEnginePresenter',function(){if(typeof ShopBusinessEnginePresenter!=='undefined')ShopBusinessEnginePresenter.render();});
_safeRender('TripPresenter',function(){if(typeof TripPresenter!=='undefined')TripPresenter.render();});
_safeRender('BusinessFlowPresenter',function(){if(typeof BusinessFlowPresenter!=='undefined')BusinessFlowPresenter.render();});
// Sesi 251 (lanjutan Business Intelligence tab, S250): BusinessIntelligencePresenter
// — 100% reuse ShopBusinessEnginePresenter/TripPresenter/BusinessFlowPresenter
// (3 baris di atas), pola _safeRender sama persis.
_safeRender('BusinessIntelligencePresenter',function(){if(typeof BusinessIntelligencePresenter!=='undefined')BusinessIntelligencePresenter.render();});
// Sesi 250 (Business Intelligence tab migration): ShopMiniSummary
// (dashboard-hub.js) — kartu ringkas pengganti #shopBusinessEngineWrap/
// #tripPresenterWrap/#businessFlowWrap di Beranda, 100% reuse
// ShopBusinessEnginePresenter.summary(), 0 rumus baru.
_safeRender('ShopMiniSummary',function(){if(typeof ShopMiniSummary!=='undefined')ShopMiniSummary.render();});
// VehicleDashboard/VehicleInsightPresenter/VehicleDailyBrief/VehicleAlertPanel/
// VehicleInsightFeed/VehicleAnalyticsPresenter/VehicleDecisionPresenter/
// VehicleAutomationPresenter (8 presenter) — DIHAPUS dari live-wiring ini di Sesi 134
// (gap fix pasca-Sesi 133), alasan SAMA PERSIS 10 presenter Finance di atas: card-nya
// sudah pindah ke #page-carnotes (Sesi 133), renderCnTab() (dipanggil dari titik save()
// yang sama) sudah menghitung ulang yang sama, blok ini tinggal duplikasi kerja.
_safeRender('CrossDashboardCard',function(){if(typeof CrossDashboardCard!=='undefined')CrossDashboardCard.render();});
_safeRender('CrossInsightPresenter',function(){if(typeof CrossInsightPresenter!=='undefined')CrossInsightPresenter.render();});
_safeRender('UnifiedBriefingPresenter',function(){if(typeof UnifiedBriefingPresenter!=='undefined')UnifiedBriefingPresenter.render();});
_safeRender('UnifiedDashboardHome',function(){if(typeof UnifiedDashboardHome!=='undefined')UnifiedDashboardHome.render();});
// S118 (Cross Module Integration Hardening): DecisionCenterHome (Recommendation Panel + Action
// Queue, Sesi 90) SEBELUMNYA hanya disambungkan lewat DashboardHub.render() (navigasi/showPage) —
// tertinggal dari live-wiring ini walau 4 presenter cross lain di atas (CrossDashboardCard/
// CrossInsightPresenter/UnifiedBriefingPresenter/UnifiedDashboardHome) sudah disertakan sejak
// Sesi 87-89. Akibatnya Action Queue/Recommendation Panel tidak ikut ter-update kalau user tetap
// di halaman Dashboard Hub lalu menyimpan data dari halaman lain — pola gap yang SAMA PERSIS
// yang melatarbelakangi live-wiring Hero/Summary/Analytics/Favorit di atas. 100% reuse
// DecisionCenterHome.render() yang sudah ada (0 mekanisme/rumus baru), TIDAK mengubah baris
// manapun sebelum ini.
_safeRender('DecisionCenterHome',function(){if(typeof DecisionCenterHome!=='undefined')DecisionCenterHome.render();});
_safeRender('DashboardHubFavoritView',function(){if(typeof DashboardHubFavoritView!=='undefined')DashboardHubFavoritView.render();});
_safeRender('EIEDashboard',function(){if(typeof EIEDashboard!=='undefined')EIEDashboard.render();});
});
}

function renderDashLaporanMini(inc,exp,txM){
const trendEl=document.getElementById('dashLapTrend');
const katEl=document.getElementById('dashLapKatMini');
if(!trendEl||!katEl)return;
const net=inc-exp;
const now=new Date();
const prevM=new Date(now.getFullYear(),now.getMonth()-1,1);
const txPrev=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===prevM.getMonth()&&d.getFullYear()===prevM.getFullYear();});
const incPrev=txPrev.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const expPrev=txPrev.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const netPrev=incPrev-expPrev;
if(!txM.length&&!txPrev.length){
trendEl.innerHTML='Belum ada transaksi bulan ini.';
} else if(netPrev===0){
trendEl.innerHTML=`Saldo bersih bulan ini: <b style="color:${net>=0?'var(--accent3)':'var(--accent2)'}">${fmt(net)}</b> (belum ada data bulan lalu utk dibandingkan)`;
} else {
const selisih=net-netPrev;
const pct=Math.round((Math.abs(selisih)/Math.abs(netPrev))*100);
const naik=selisih>0;
trendEl.innerHTML=`Saldo bersih bulan ini: <b style="color:${net>=0?'var(--accent3)':'var(--accent2)'}">${fmt(net)}</b> — <span style="color:${naik?'var(--accent3)':'var(--accent2)'}">${naik?'▲':'▼'} ${pct}%</span> vs bulan lalu (${fmt(netPrev)})`;
}
const km={};
txM.forEach(t=>{if(t.type==='transfer_in'||t.type==='transfer_out')return;if(!km[t.category])km[t.category]={inc:0,exp:0,n:0};if(t.type==='income')km[t.category].inc+=t.amount;else km[t.category].exp+=t.amount;km[t.category].n++;});
const ks=Object.entries(km).sort((a,b)=>(b[1].inc+b[1].exp)-(a[1].inc+a[1].exp)).slice(0,3);
const maxV=Math.max(...ks.map(([,v])=>v.inc+v.exp),1);
katEl.innerHTML=ks.length?ks.map(([k,v])=>{
const val=v.inc+v.exp,pct=Math.round((val/maxV)*100);
const col=v.inc>v.exp?'var(--accent3)':'var(--accent2)';
return`<div class="cat-bar"><div class="cat-bar-head"><span style="font-weight:500">${escapeHtml(k)} <span class="u-ctext3 u-fs12">(${v.n}x)</span></span><span style="font-weight:700;color:${col}">${fmt(val)}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
}).join(''):'<div class="u-fs12t2">Belum ada transaksi bulan ini.</div>';
}

function renderDashBudgetMini(){return Budget.renderDashMini();}

function renderDashZakatMini(incomeBulan){return Zakat.renderDashMini(incomeBulan);}

function renderFiScenarios(){return FI.renderScenarios();}

function renderFinancialFreedom(){return FI.renderFinancialFreedom();}

function renderFiCatOptions(selected){return FI.renderCatOptions(selected);}

function renderDashDanaDarurat(){return DanaDaruratAI.renderDash();}

// Kartu ringkasan "Gaji minggu ini dari Absensi" di halaman Keuangan — dihitung fresh
// tiap kali renderKeuangan() jalan dari D.workDays minggu berjalan (sama kayak yg dipakai
// gajiSyncBox di modal Absensi), supaya user lihat totalnya juga tanpa perlu buka modal
// Absensi dulu. Disembunyikan (u-dnone) kalau belum ada absensi minggu ini.
function renderKeuAbsensiGajiCard(){
const cardEl=document.getElementById('keuAbsensiGajiCard');
if(!cardEl)return;
const {start,end}=getWeekRange(new Date());
const weekDays=(D.workDays||[]).filter(w=>{const d=new Date(w.date);return d>=start&&d<=end;});
if(weekDays.length){
const total=weekDays.reduce((s,w)=>s+w.total,0);
cardEl.classList.remove('u-dnone');cardEl.style.display='block';
document.getElementById('keuAbsensiGajiCount').textContent=weekDays.length;
document.getElementById('keuAbsensiGajiTotal').textContent=fmtFull(total);
} else {
cardEl.classList.add('u-dnone');cardEl.style.display='none';
}
}
function renderKeuangan(){
document.getElementById('monthLabel').textContent=MONTHS_FULL[curMonth]+' '+curYear;
// txListMonthLabel (lanjutan filter bulan Daftar Transaksi) -- label ‹ bulan › terpisah di
// kartu "📋 Semua Transaksi", disinkronkan bareng monthLabel (Ringkasan) tiap renderKeuangan()
// jalan karena keduanya baca curMonth/curYear yang sama (lihat changeTxListMonth,
// tx-list-cashflow.js). Guard elemen: kartu Daftar Transaksi ada di sub-tab kelolaTab-transaksi
// yang mungkin belum pernah dirender di beberapa test harness/halaman lain.
const txListMonthLabelEl=document.getElementById('txListMonthLabel');
if(txListMonthLabelEl)txListMonthLabelEl.textContent=MONTHS_FULL[curMonth]+' '+curYear;
renderKeuAbsensiGajiCard();
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;});
const inc=txM.filter(t=>t.type==='income'||t.type==='transfer_in').reduce((s,t)=>s+t.amount,0);
const exp=txM.filter(t=>t.type==='expense'||t.type==='transfer_out').reduce((s,t)=>s+t.amount,0);
const incReal=txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const expReal=txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const net=incReal-expReal;
// PERF: KeuanganInsight.compute() dipanggil SETELAH txM/inc/exp di atas dihitung, supaya bisa
// dioper sbg ctx (0 scan ulang D.transactions) -- TAPI cuma kalau curMonth/curYear yg lagi
// dibuka user == bulan berjalan asli (sama dgn asumsi default compute() tanpa ctx). Kalau user
// lagi lihat bulan lain (paging), biarkan fallback tanpa ctx spy hasil insight TETAP soal bulan
// berjalan asli, bukan ikut bulan yg sedang dibuka -- 0 perubahan hasil, murni hindari scan dobel.
if(typeof KeuanganInsight!=='undefined'){
const now=new Date();
const isCurMonth=curMonth===now.getMonth()&&curYear===now.getFullYear();
KeuanganInsight.render(isCurMonth?{now,m:curMonth,y:curYear,txM,inc:incReal,exp:expReal}:undefined);
}
document.getElementById('mIncome').textContent=fmtFull(incReal);
document.getElementById('mExpense').textContent=fmtFull(expReal);
const nEl=document.getElementById('mNet');nEl.textContent=(net<0?'-':'')+fmtFull(net);nEl.className='stat-val '+(net>=0?'green':'red');
// GAP FIX Kekayaan Bersih: kartu "📊 Kekayaan Bersih" (#kbSaldoAkun/
// #kbTotalAset/#kbUtang/#kbPiutang/#kbInventori/#kbNetWorth) DIPINDAH ke
// halaman #page-keuangan ini (lihat komentar di index.html/
// app_production.html persis di atas kartu itu: "Dipindah dari tab Zakat
// (halaman Pajak)"), tapi renderKekayaanBersih() (alias Kekayaan.
// renderBersih(), modules-calc.js) TIDAK ikut dipindah/ditambahkan ke
// sini -- satu-satunya pemanggilnya masih renderPajakZakat(), yang HANYA
// jalan kalau user membuka halaman Pajak/Zakat secara terpisah (lihat
// `if(name==='pajak')renderPajakZakat();` di atas file ini). Akibatnya
// kartu ini macet permanen di placeholder statis "Rp 0" di HTML buat
// user yang belum pernah/tidak sering membuka halaman Pajak/Zakat --
// padahal kartunya sendiri sudah kelihatan di tab Keuangan yang jauh
// lebih sering dibuka. Pola gap SAMA PERSIS TanggaKeuangan (Sesi 136,
// lihat dashboard-hub.js) & DecisionCenterHome (Sesi 118) -- fix-nya
// sama: panggil LANGSUNG di sini juga, 100% reuse fungsi yang sudah ada
// (0 rumus baru). Panggilan di renderPajakZakat() TETAP dibiarkan (bukan
// dihapus) -- perlu utk live-update kalau user sedang di halaman Pajak
// lalu ubah data zakat/utang di sana.
if(typeof renderKekayaanBersih!=='undefined')renderKekayaanBersih();
const {from:txFrom,to:txTo}=getTxListRange();
const kf=getKeuFilters();
const txList=D.transactions.filter(t=>{const d=new Date(t.date);return d>=txFrom&&d<=txTo&&txMatchesFilters(t,kf)&&txMatchesSearch(t,kf.search);});
const sorted=[...txList].sort((a,b)=>new Date(b.date)-new Date(a.date));
const hasFilter=Object.values(kf).some(v=>v&&v!=='semua');
const visibleCount=Math.min(sorted.length,txListPage*TX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
// S468c (lanjutan s468-PLAN-virtual-bill-item-tx-list.md, s471/s472):
// section "⏳ Akan Jatuh Tempo" -- item virtual tagihan (belum dibayar,
// dari generateVirtualBillItemsForMonth(), txHTML() sudah siap merender
// sejak s468b) DIRENDER TERPISAH DI ATAS #allTx, TIDAK disisipkan ke
// sorted/visible/pagination di atas -- jadi 0 risiko ke mIncome/mExpense/
// mNet (dihitung dari txM, tidak disentuh) & 0 risiko ke hitungan
// "Tampilkan lebih banyak (N lagi)" (visibleCount/sorted.length di atas
// juga tidak disentuh). Guard WAJIB (temuan #7 plan): section HANYA
// tampil kalau txListPeriode==='bulan' DAN curYear/curMonth == bulan/
// tahun aktual SEKARANG (new Date()) -- di luar kondisi itu section
// TIDAK dirender sama sekali (bukan dirender kosong), supaya user yang
// nav ‹bulan› ke bulan lain atau ganti periode ke hari/minggu/tahun/
// selamanya tidak lihat proyeksi tagihan yang menyesatkan.
const vBillWrapEl=document.getElementById('allTxVirtualBills');
if(vBillWrapEl){
const nowVB=new Date();
const showVBill=txListPeriode==='bulan'&&curYear===nowVB.getFullYear()&&curMonth===nowVB.getMonth();
if(showVBill&&typeof generateVirtualBillItemsForMonth==='function'){
const vItems=generateVirtualBillItemsForMonth(curYear,curMonth);
vBillWrapEl.innerHTML=vItems.length?`<div class="u-fw600 u-mb6">⏳ Akan Jatuh Tempo</div>`+vItems.map(txHTML).join(''):'';
} else {
vBillWrapEl.innerHTML='';
}
}
// S637 (RENCANA-MODERNISASI-UI.md): tema "modern" pakai jalur tabel Ledger
// Pro (txTableHTML) utk #allTx, kolom saldo berjalan hanya kalau filter
// Akun sedang pilih 1 akun spesifik (bukan "Semua Akun") -- lihat komentar
// txTableRowHTML/txTableHTML (tx-list-cashflow.js) utk alasan. 10 tema lama
// 0 dampak, tetap jalur txHTML() kartu apa adanya.
const allTxEl=document.getElementById('allTx');
const allTxEmpty=`<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">${hasFilter?'Tidak ada transaksi yang cocok dengan filter':'Belum ada transaksi di periode ini'}</div></div>`;
if(D.profile&&D.profile.theme==='modern'&&typeof txTableHTML==='function'){
const singleAccId=(kf.acc&&kf.acc!=='semua')?kf.acc:null;
allTxEl.innerHTML=visible.length?txTableHTML(visible,singleAccId):allTxEmpty;
}else{
allTxEl.innerHTML=visible.length?visible.map(txHTML).join(''):allTxEmpty;
}
const moreWrap=document.getElementById('allTxLoadMoreWrap');
if(moreWrap){
if(visibleCount<sorted.length){
moreWrap.classList.remove('u-dnone');moreWrap.style.display='block';
moreWrap.querySelector('button').textContent=`⬇️ Tampilkan lebih banyak (${sorted.length-visibleCount} lagi)`;
} else moreWrap.style.display='none';
}
updateKfBadge();
// PERF (unblock tab-Keuangan freeze, permintaan eksplisit user): Budget/BudgetReko/Pensiun/
// Renov/SewaKios + 10 presenter finansial di bawah ini (Finance Dashboard/Forecast/Budget
// Reco/Cashflow Proj/Financial Goal/Invest Planner/Debt Optimizer/Retirement Planner/Health
// Score/Risk Dashboard — Sesi 75/91-99, DIPINDAH ke #page-keuangan di Sesi 133) SEBELUMNYA
// jalan SINKRON, sebelum stat cards (mIncome/mExpense/mNet) & list transaksi (#allTx) sempat
// digambar — jadi user nunggu semuanya kelar duluan sebelum konten inti tab Keuangan yang
// paling sering dilihat kelihatan. Sekarang bagian inti di atas tetap 100% sinkron (0
// perubahan logika/hasil), sedangkan widget2 ini disusulkan lewat runDeferredOrNow() yang
// sama dengan yang dipakai showMain() (Sesi 135) — supaya browser sempat nge-paint konten
// inti dulu baru widget tambahan nyusul. 0 perubahan logika/rumus masing-masing presenter —
// murni KAPAN dipanggil.
runDeferredOrNow(function(){
renderBudgets();
BudgetReko.init();
Pensiun.render();
if(typeof Renov!=='undefined')Renov.render();
if(typeof SewaKios!=='undefined')SewaKios.render();
if(typeof FinanceDashboard!=='undefined')FinanceDashboard.render();
if(typeof FinancialForecastPresenter!=='undefined')FinancialForecastPresenter.render();
if(typeof BudgetRecommendationPresenter!=='undefined')BudgetRecommendationPresenter.render();
if(typeof CashFlowProjectionPresenter!=='undefined')CashFlowProjectionPresenter.render();
if(typeof FinancialGoalPresenter!=='undefined')FinancialGoalPresenter.render();
if(typeof InvestmentPlannerPresenter!=='undefined')InvestmentPlannerPresenter.render();
if(typeof DebtOptimizerPresenter!=='undefined')DebtOptimizerPresenter.render();
if(typeof RetirementPlannerPresenter!=='undefined')RetirementPlannerPresenter.render();
if(typeof FinancialHealthScorePresenter!=='undefined')FinancialHealthScorePresenter.render();
if(typeof FinancialRiskDashboardPresenter!=='undefined')FinancialRiskDashboardPresenter.render();
});
}

function renderBudgets(){return Budget.render();}

function renderBudgetCatOptions(selected){return Budget.renderCatOptions(selected);}


function renderCashflowForecast(){
const el=document.getElementById('cfIncAvg');
if(!el)return;
const r=computeCashflowForecast();
const emptyEl=document.getElementById('cfEmpty'),bodyEl=document.getElementById('cfBody');
if(r.avail<1){
if(emptyEl)emptyEl.classList.remove('u-dnone');emptyEl.style.display='block';
if(bodyEl)bodyEl.style.display='none';
return;
}
if(emptyEl)emptyEl.style.display='none';
if(bodyEl)bodyEl.style.display='block';
document.getElementById('cfIncAvg').textContent=fmtFull(r.incAvg);
document.getElementById('cfExpAvg').textContent=fmtFull(r.expAvg);
document.getElementById('cfBillsDue').textContent=fmtFull(r.billsDue);
document.getElementById('cfSaldoNow').textContent=fmtFull(r.saldoNow);
const pEl=document.getElementById('cfProjected');
pEl.textContent=fmtFullSigned(r.projected);
pEl.style.color=r.projected<0?'var(--accent2)':'';
document.getElementById('cfNote').textContent=`Berdasarkan rata-rata ${r.months} bulan terakhir. Proyeksi = saldo sekarang + rata-rata masuk − rata-rata keluar − tagihan terjadwal 30 hari ke depan.`+(r.avail<2?' ⚠️ Histori transaksi masih <2 bulan, jadi rata-rata di atas masih kasar.':'')+(r.projected<0?` ⚠️ Berpotensi minus ${fmtFull(Math.abs(r.projected))}. ${cashflowActionSuggestion(Math.abs(r.projected),30)}`:'');
const billEl=document.getElementById('cfBillList');
if(r.upcoming.length){
billEl.innerHTML='<div class="u-fs11 u-t2 u-mb6">🧾 Tagihan 30 hari ke depan:</div>'+r.upcoming.sort((a,b)=>new Date(a.nextDue)-new Date(b.nextDue)).map(b=>`<div class="u-flex u-jcb u-fs12" style="padding:4px 0;border-top:1px solid var(--border)"><span>${escapeHtml(b.name)} · ${new Date(b.nextDue).toLocaleDateString('id-ID')}</span><span class="u-fw700">${fmt(b.amount)}</span></div>`).join('');
} else {
billEl.innerHTML='';
}
}

function renderLaporan(){
const {from,to}=getRange();
const f=getLaporanFilters();
const filterSig=JSON.stringify({from:+from,to:+to,f});
if(filterSig!==_lapLastFilterSig){lapTxPage=1;_lapLastFilterSig=filterSig;}
const txs=D.transactions.filter(t=>{
const d=new Date(t.date);
if(d<from||d>to)return false;
if(t.type==='transfer_in'||t.type==='transfer_out')return false;
if(!txMatchesFilters(t,f))return false;
return true;
});
const inc=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
const exp=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
const net=inc-exp;
document.getElementById('lapIn').textContent=fmt(inc);
document.getElementById('lapOut').textContent=fmt(exp);
const nEl=document.getElementById('lapNet');nEl.textContent=(net<0?'-':'')+fmt(Math.abs(net));nEl.className='stat-val '+(net>=0?'green':'red');
// S336 (konsistensi pola Dashboard Hub — DashboardHubAnalytics.render()):
// badge "⚠️ Kurang" + varian --warn saat Bersih<0, dan progress bar
// Masuk-vs-Keluar. 0 kalkulasi baru — reuse penuh inc/exp/net yang sudah
// dihitung di atas, cuma toggle class/style yang sudah ada di DOM.
const lapNetBoxEl=document.getElementById('lapNetBox');
const lapNetBadgeEl=document.getElementById('lapNetBadge');
if(lapNetBoxEl)lapNetBoxEl.classList.toggle('stat-box--warn',net<0);
if(lapNetBadgeEl)lapNetBadgeEl.classList.toggle('u-dnone',net>=0);
const lapBarEl=document.getElementById('lapIncExpBar');
if(lapBarEl){
const lapTotal=inc+exp;
lapBarEl.classList.toggle('u-dnone',lapTotal<=0);
if(lapTotal>0){
document.getElementById('lapIncExpBarInc').style.width=Math.round((inc/lapTotal)*100)+'%';
document.getElementById('lapIncExpBarExp').style.width=Math.round((exp/lapTotal)*100)+'%';
}
}
document.getElementById('lapCount').textContent=txs.length;
document.getElementById('lapAvg').textContent=txs.length?fmt((inc+exp)/txs.length):'Rp 0';
document.getElementById('lapTxN').textContent='('+txs.length+')';
const nActive=Object.values(f).filter(v=>v&&v!=='semua').length;
const cntEl=document.getElementById('lapFilterCount');
if(cntEl)cntEl.textContent=nActive?`${nActive} filter aktif`:'';
renderGrafik();
renderLapAccList();
renderCashflowForecast();
if(typeof AsetKeluarga!=='undefined')AsetKeluarga.render();
// S195 (Dana Kelolaan / Managed Funds): tambahan murni, pola sama
// AsetKeluarga.render() di atas — 100% reuse DanaKelolaan.summary(),
// tidak mengubah baris manapun sebelum ini.
if(typeof DanaKelolaanPresenter!=='undefined')DanaKelolaanPresenter.renderLaporan();
// Sesi 484 (Dana Titipan dalam Investasi — Portfolio Allocation Projection):
// tambahan murni read-only, pola sama baris di atas — 100% reuse
// Investment.getOwners()/holdingCost()/holdingValue()/holdingGainLoss() +
// MultiOwnerEngine.splitByPorsi(), tidak mengubah baris manapun sebelum ini.
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
// SESI 498 (Tab "Dana Titipan" Terpadu, Sesi A) — render tambahan murni
// (0 rumus baru) ke container BARU #danaTitipanTabList (sub-tab Laporan >
// Dana Titipan). Container LAMA #danaTitipanPortfolioList di atas TETAP
// dirender apa adanya (baris sebelum ini tidak diubah) — 2 tempat, 1 sumber
// data (DanaTitipanPortfolioAPI.build()), 0 SSOT baru.
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
const km={};
txs.forEach(t=>{if(!km[t.category])km[t.category]={inc:0,exp:0,n:0};if(t.type==='income')km[t.category].inc+=t.amount;else km[t.category].exp+=t.amount;km[t.category].n++;});
const ks=Object.entries(km).sort((a,b)=>(b[1].inc+b[1].exp)-(a[1].inc+a[1].exp));
const maxV=Math.max(...ks.map(([,v])=>v.inc+v.exp),1);
const showVsAvg=filterPeriode==='bulan'&&typeof BudgetReko!=='undefined';
const avgMap={};
if(showVsAvg){ BudgetReko.computeCategoryAverages().forEach(a=>{avgMap[a.name]=a.avgPerMonth;}); }
document.getElementById('lapKat').innerHTML=ks.length?ks.map(([k,v])=>{
const val=v.inc+v.exp,pct=Math.round((val/maxV)*100);
const col=v.inc>v.exp?'var(--accent3)':'var(--accent2)';
let vsAvgHtml='';
if(showVsAvg&&v.exp>v.inc&&avgMap[k]>0){
const avg=avgMap[k];
const selisihPct=Math.round(((v.exp-avg)/avg)*100);
const naik=selisihPct>10, turun=selisihPct<-10;
const badgeCol=naik?'var(--accent2)':(turun?'var(--accent3)':'var(--text2)');
const arrow=naik?'▲':(turun?'▼':'≈');
vsAvgHtml=`<div style="font-size:11px;color:${badgeCol};margin-top:2px">${arrow} ${selisihPct>0?'+':''}${selisihPct}% vs rata-rata bulanan (${fmt(avg)})</div>`;
}
return`<div class="cat-bar"><div class="cat-bar-head"><span style="font-weight:500">${k} <span class="u-ctext3 u-fs12">(${v.n}x)</span></span><span style="font-weight:700;color:${col}">${fmt(val)}</span></div><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${col}"></div></div>${vsAvgHtml}</div>`;
}).join(''):'<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">Belum ada data</div></div>';
const sorted=[...txs].sort((a,b)=>new Date(b.date)-new Date(a.date));
const visibleCount=Math.min(sorted.length,lapTxPage*TX_PAGE_SIZE);
const visible=sorted.slice(0,visibleCount);
document.getElementById('lapTx').innerHTML=visible.length?visible.map(txHTML).join(''):'<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">Tidak ada transaksi</div></div>';
let lapMoreWrap=document.getElementById('lapTxLoadMoreWrap');
if(!lapMoreWrap){
lapMoreWrap=document.createElement('div');
lapMoreWrap.id='lapTxLoadMoreWrap';
lapMoreWrap.style.cssText='text-align:center;margin-top:10px';
lapMoreWrap.innerHTML='<button class="btn btn-ghost btn-sm" data-action="loadMoreLapTx" aria-label="Tampilkan lebih banyak transaksi"></button>';
document.getElementById('lapTx').insertAdjacentElement('afterend',lapMoreWrap);
}
if(visibleCount<sorted.length){
lapMoreWrap.style.display='block';
{const lapMoreBtn=lapMoreWrap.querySelector('button');const lapMoreLabel=`⬇️ Tampilkan lebih banyak (${sorted.length-visibleCount} lagi)`;lapMoreBtn.textContent=lapMoreLabel;lapMoreBtn.setAttribute('aria-label',lapMoreLabel);}
} else lapMoreWrap.style.display='none';
}

function renderGrafik(){
const now=new Date();const bars=[];
for(let i=5;i>=0;i--){
const m=(now.getMonth()-i+12)%12,y=now.getFullYear()+(now.getMonth()-i<0?-1:0);
const txM=D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
bars.push({label:MONTHS[m],inc:txM.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp:txM.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)});
}
const maxV=Math.max(...bars.map(b=>Math.max(b.inc,b.exp)),1);
document.getElementById('grafikBars').innerHTML=bars.map(b=>`<div class="grafik-col"><div class="grafik-bar-group"><div class="grafik-bar" style="background:var(--accent3);opacity:0.85;height:${Math.max(4,(b.inc/maxV)*100)}%"></div><div class="grafik-bar" style="background:var(--accent2);opacity:0.85;height:${Math.max(4,(b.exp/maxV)*100)}%"></div></div><div class="grafik-lbl">${b.label}</div></div>`).join('');
}

function renderMs(){D.milestones.forEach((done,i)=>{const el=document.getElementById('ms'+i);if(el){el.classList.toggle('done',done);el.textContent=done?'✓':'';el.setAttribute('aria-checked',done?'true':'false');}})}

function renderTarget(){
const el=document.getElementById('targetList');
if(!el)return;
if(!D.targets.length){el.innerHTML='<div class="empty"><div class="empty-icon">🎯</div><div class="empty-text">Belum ada target</div></div>';return;}
el.innerHTML=D.targets.map((t,i)=>{
const acc=t.accountId?D.accounts.find(a=>a.id===t.accountId):null;
const saved=acc?recalcAccBalance(acc.id):t.saved;
const pct=Math.min(100,Math.round((saved/t.amount)*100));
const col=pct>=100?'green':pct>=50?'orange':'purple';
const linkTag=acc?`<span class="u-fs11 u-r99 u-cacc u-ml4" style="background:var(--surface);border:1px solid var(--border2);padding:2px 7px">🔗 ${escapeHtml(acc.name)}</span>`:'';
const daruratTag=t.isDanaDarurat?`<span class="u-fs10 u-fw700 u-cacc2 u-r99 u-ml4" style="background:var(--accent2-soft);padding:2px 7px">🚨 DARURAT</span>`:'';
const actionsHtml=acc?`<button class="btn btn-sm btn-ghost u-flex1" data-action="showTargetAccountTx" data-args="${escapeHtml(JSON.stringify([t.id]))}">📋 Lihat Transaksi</button><button class="btn btn-sm btn-danger" data-action="delTarget" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>`
:`<button class="btn btn-sm btn-ghost u-flex1" data-action="addTarget" data-args="${escapeHtml(JSON.stringify([i]))}">+ Tambah</button><button class="btn btn-sm btn-danger" data-action="delTarget" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>`;
let daruratInfo='';
if(t.isDanaDarurat&&typeof FI!=='undefined'){
const avgBulanan=FI.annualExpense()/12;
if(avgBulanan>0){
const bulanCover=(saved/avgBulanan).toFixed(1);
daruratInfo=`<div class="u-fs11 u-t2 u-mt6" style="padding-top:6px;border-top:1px dashed var(--border)">≈ <b>${bulanCover} bulan</b> pengeluaran ter-cover · lihat rincian di 🧭 Rekomendasi Alokasi Aset (halaman Pajak & Zakat)</div>`;
}
}
return`<div class="tgt-item">
      <div class="tgt-head"><div class="tgt-name">${t.emoji} ${escapeHtml(t.name)}${linkTag}${daruratTag}</div><div class="tgt-pct">${pct}%</div></div>
      <div class="prog-bar"><div class="prog-fill ${col}" style="width:${pct}%"></div></div>
      <div class="tgt-vals"><span>${fmtFull(saved)} terkumpul</span><span>Target ${fmtFull(t.amount)}</span></div>
      ${daruratInfo}
      <div class="tgt-actions">
        ${actionsHtml}
      </div>
    </div>`;
}).join('');
}

function renderReminder(){
const el=document.getElementById('reminderList');if(!el)return;
const defaults=[{title:'Bayar BPJS',desc:'Tiap bulan — Rp 85.000',color:'var(--accent2)'},{title:'Bayar Wifi Pekalongan',desc:'Tiap bulan — Rp 50.000',color:'var(--accent4)'},{title:'Konfirmasi order Shop',desc:'H-2 sebelum pulang',color:'var(--accent)'}];
const all=[...defaults,...D.reminders];
el.innerHTML=all.map((r,i)=>`<div class="reminder-item"><div class="reminder-dot" style="background:${r.color}"></div><div class="u-flex1"><div class="u-fs13 u-fw600">${escapeHtml(r.title)}</div><div class="u-fs12t2">${escapeHtml(r.desc)}</div></div>${i>=defaults.length?`<button class="tx-del" data-action="delReminder" data-args="${escapeHtml(JSON.stringify([i-defaults.length]))}" aria-label="Hapus">🗑</button>`:''}</div>`).join('');
}

function renderWorkDays(){return Payroll.renderWorkDays();}

function renderVehicleSelect(){
const el=document.getElementById('vehicleSelect');if(!el)return;
if(!D.vehicles.find(v=>v.id===curVehicleId)&&D.vehicles.length) curVehicleId=D.vehicles[0].id;
el.innerHTML=D.vehicles.map(v=>`<div class="vehicle-chip ${v.id===curVehicleId?'active':''}" data-action="selectVehicle" data-args="${escapeHtml(JSON.stringify([v.id]))}">${v.emoji} ${escapeHtml(v.name)}</div>`).join('');
renderVehicleSpecCard();
}

function renderCarImportVehicleSelect(){
const el=document.getElementById('carImportVehicle');if(!el)return;
if(!D.vehicles||!D.vehicles.length){el.innerHTML='<option value="">Belum ada kendaraan</option>';return;}
const prevVal=el.value;
el.innerHTML=D.vehicles.map(v=>`<option value="${v.id}">${v.emoji} ${escapeHtml(v.name)}</option>`).join('');
if(prevVal&&D.vehicles.find(v=>v.id===prevVal)) el.value=prevVal;
else if(D.vehicles.find(v=>v.id===curVehicleId)) el.value=curVehicleId;
}

function renderVehicleManageList(){
const el=document.getElementById('vehicleManageList');
if(!el)return;
// Ownership Filter UI (S235) — reuse OwnershipEngine.filterByType() apa adanya, TIDAK ada
// filter/logic baru. Index [i] dipakai editVehicle/delVehicle harus tetap index ASLI di
// D.vehicles (bukan index di list terfilter), makanya dicari ulang via indexOf().
const vehOwnFilterEl=document.getElementById('vehOwnFilter');
const vehOwnFilterVal=vehOwnFilterEl?vehOwnFilterEl.value:'ALL';
let vehList=D.vehicles;
if(vehOwnFilterVal&&vehOwnFilterVal!=='ALL'&&typeof OwnershipEngine!=='undefined'){
const vehOwnFiltered=OwnershipEngine.filterByType(vehList,vehOwnFilterVal);
if(vehOwnFiltered.ok)vehList=vehOwnFiltered.items;
}
el.innerHTML=vehList.map((v)=>{
const i=D.vehicles.indexOf(v);
return `<div class="tx-item"><div class="tx-icon u-bgaccsoft">${v.emoji}</div><div class="tx-info"><div class="tx-name">${escapeHtml(v.name)}</div><div class="tx-meta">${vehMetaText(v)}</div></div><button class="tx-del u-bgaccsoft u-cacc" style="margin-right:6px" data-action="editVehicle" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Edit">✏️</button><button class="tx-del" data-action="delVehicle" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button></div>`;
}).join('');
}

function renderSptLinkStatus(){
const el=document.getElementById('sptBillStatus');
if(!el)return;
const bill=D.bills.find(b=>b.taxLink&&b.taxLink.key==='spt');
el.innerHTML=bill?('🔔 Terikat ke Tagihan: batas lapor <b>'+bill.nextDue+'</b>. Setelah lapor &amp; di-tandai lunas di Tagihan, tap tombol ini lagi tahun depan.'):'Belum diikat ke Tagihan. Tap tombol di atas supaya batas lapor SPT muncul sebagai reminder di menu Tagihan.';
}

function renderVehTaxSim(){
renderVehTaxList();
renderSimList();
}

function renderVehTaxList(){
const el=document.getElementById('vehTaxList');
if(!el)return;
el.innerHTML=D.vehicles.map(v=>{
const rows=Object.entries(VEHTAX_ITEMS).map(([key,cfg])=>{
const st=dateStatusBadge(v[cfg.tglKey]);
const biaya=v[cfg.biayaKey]||0;
return `<div class="tx-meta u-flex u-jcb u-aic u-mt2">
        <span>${cfg.label}: <span class="${st.col} u-fw700">${st.label}</span></span>
        <button class="btn btn-ghost btn-sm u-fs11" style="padding:2px 8px" data-stop="1" data-action="bayarPajakKendaraan" data-args="${escapeHtml(JSON.stringify([v.id, key]))}" ${biaya<=0?'title="Isi dulu estimasi biaya lewat ✏️"':''} aria-label="Isi dulu estimasi biaya lewat ✏️">✅ Bayar</button>
      </div>`;
}).join('');
return `<div class="tx-item u-aifs u-pointer u-fdcol u-gap6" data-action="openVehTaxModal" data-args="${escapeHtml(JSON.stringify([v.id]))}">
      <div class="u-flex u-aic u-w100">
        <div class="tx-icon u-bgaccsoft">${v.emoji}</div>
        <div class="tx-info"><div class="tx-name">${escapeHtml(v.name)}</div></div>
        <button class="tx-del u-bgaccsoft u-cacc" data-stop="1" data-action="openVehTaxModal" data-args="${escapeHtml(JSON.stringify([v.id]))}" aria-label="Edit/Buka">✏️</button>
      </div>
      <div class="u-w100" style="padding-left:44px">${rows}</div>
    </div>`;
}).join('');
}

function renderVehTaxLinkStatus(){
const modalEl=document.getElementById('vehTaxModal');
const vehicleId=modalEl.dataset.vehicleId;
if(!vehicleId)return;
Object.keys(VEHTAX_ITEMS).forEach(jenis=>{
const el=document.getElementById('vehTaxLinkStatus_'+jenis);
if(!el)return;
const key='vehtax:'+vehicleId+':'+jenis;
const bill=D.bills.find(b=>b.taxLink&&b.taxLink.key===key);
el.innerHTML=bill?('🔔 Terikat ke Tagihan: jatuh tempo <b>'+bill.nextDue+'</b>, '+fmtFull(bill.amount)+'. Setelah lunas &amp; siklus baru dimulai, isi tanggal baru lalu tap tombol lagi.'):'Belum diikat ke Tagihan.';
});
}

function renderSimLinkStatus(){
const el=document.getElementById('simLinkStatus');
if(!el)return;
if(!editSimId){el.innerHTML='Simpan data SIM ini dulu untuk bisa diikat ke Tagihan.';return;}
const key='sim:'+editSimId;
const bill=D.bills.find(b=>b.taxLink&&b.taxLink.key===key);
el.innerHTML=bill?('🔔 Terikat ke Tagihan: jatuh tempo <b>'+bill.nextDue+'</b>, '+fmtFull(bill.amount)):'Belum diikat ke Tagihan. Tap tombol di atas supaya reminder aktif di menu Tagihan.';
}

function renderSimList(){
const el=document.getElementById('simList');
if(!el)return;
const list=(D.simList||[]).slice().sort((a,b)=>daysUntilDate(a.tglAkhir)-daysUntilDate(b.tglAkhir));
if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">🪪</div><div class="empty-text">Belum ada data SIM</div></div>';return;}
el.innerHTML=list.map(s=>{
const st=dateStatusBadge(s.tglAkhir);
return `<div class="tx-item u-pointer" data-action="openSimModal" data-args="${escapeHtml(JSON.stringify([s.id]))}">
      <div class="tx-icon u-bgaccsoft">🪪</div>
      <div class="tx-info">
        <div class="tx-name">${escapeHtml(s.nama)} <span class="u-fs11 u-t2 u-fw400">· ${s.jenis}</span></div>
        <div class="tx-meta"><span class="${st.col} u-fw700">${st.label}</span></div>
      </div>
      <button class="tx-del" data-stop="1" data-action="delSim" data-args="${escapeHtml(JSON.stringify([s.id]))}" aria-label="Hapus">🗑</button>
    </div>`;
}).join('');
}

function renderCnTab(){
// SELF-HEAL (audit S444+): backfill fuelState.referenceKm yang kosong di
// data lama SEBELUM presenter fuel di bawah dipanggil, supaya begitu
// halaman Car Notes ini dibuka, estimasi liter langsung mulai reaktif
// thd KM terbaru (0 aksi manual dibutuhkan). Idempotent & murah — lihat
// catatan lengkap di healFuelStateReferenceKm() (vehicle-core.js).
if(typeof healFuelStateReferenceKm==='function')healFuelStateReferenceKm();
if(typeof MobilInsight!=='undefined')MobilInsight.render();
// Vehicle Dashboard/Insight/Brief/Alert/Insight Feed/Analytics/Decision/
// Automation (Sesi 77-83, Batch 7) — DIPINDAH ke sini dari
// DashboardHub.render() (Sesi 133, permintaan eksplisit user). 100%
// reuse presenter yang sudah ada, TIDAK ada rumus baru. Container HTML
// (#vehdashWrap dst) juga sudah dipindah ke #page-carnotes.
if(typeof VehicleDashboard!=='undefined')VehicleDashboard.render();
if(typeof VehicleInsightPresenter!=='undefined')VehicleInsightPresenter.render();
// Sesi 171 (temuan audit, permintaan eksplisit user): VehicleDailyBrief.render()
// TIDAK LAGI dipanggil di sini — semua angka yang disusunnya (totalVehicles/
// avgHealth/totalOverdue via VehicleDashboard, reminder.total/overdueCount via
// VehicleInsightPresenter) SUDAH tampil sbg card di halaman Car Notes ini
// (sumbernya sama: VehicleAIHook.fleetSummary()), jadi narasi teksnya 100%
// presentasi ganda — pola sama persis alasan VehicleAlertPanel/VehicleInsightFeed
// di Sesi 156b (lihat komentar di bawah). File
// modules/vehicle/vehicle-daily-brief.js & tests/vehicle-daily-brief.test.js
// TIDAK dihapus (test itu me-load file sendirian, tidak lewat sini) — hanya
// wiring live-nya yg dicabut. #vehBriefWrap turut disembunyikan (lihat
// index.html/app_production.html) supaya tidak nongol sbg card kosong.
// Sesi 156b (permintaan eksplisit user): VehicleAlertPanel.render()/
// VehicleInsightFeed.render() TIDAK LAGI dipanggil terpisah di sini —
// digabung jadi satu panggilan VehicleAttentionPresenter.render() bareng
// VehicleDecisionPresenter (lihat baris itu di bawah, dihapus dari sana
// juga) supaya mengisi SATU container #vehAttentionBody ("🧭 Perlu
// Perhatian"), bukan 3 container/versi terpisah dari info yang sama.
if(typeof VehicleAttentionPresenter!=='undefined')VehicleAttentionPresenter.render();
if(typeof VehicleAnalyticsPresenter!=='undefined')VehicleAnalyticsPresenter.render();
// TASK-141: Fuel Intelligence Card — 100% reuse FuelIntelligenceEngine
// (yang sendiri 100% reuse VehicleFuelTrendSummary/VehicleReminder di
// atas), pola sama persis presenter vehicle lain di baris ini.
if(typeof FuelCard!=='undefined')FuelCard.render();
// TASK-150: Fuel Dashboard — 100% reuse FuelInsightEngine.getSummary()
// (yang sendiri 100% reuse seluruh engine fuel yang sudah ada), pola sama
// persis FuelCard.render() di baris atas.
if(typeof FuelDashboard!=='undefined')FuelDashboard.render();
// TASK-154: Fuel Comparison — 100% reuse FuelInsightEngine.getSummary()
// (per kendaraan) + FuelFleetSelector.selectVehicle() (badge prioritas),
// pola sama persis FuelDashboard.render() di baris atas. Refresh setelah
// transaksi BBM/servis terjadi lewat renderCnTab() ini sendiri dipanggil
// ulang (pola sama persis refresh FuelCard/FuelDashboard).
if(typeof FuelCompare!=='undefined')FuelCompare.render();
// TASK-156: Fuel Trend Dashboard — 100% reuse FuelInsightEngine.getSummary()
// + FuelCostAnalytics/FuelPredictionEngine/FuelMaintenanceEngine (dipanggil
// langsung utk field trend granular) + FuelModal.open()/
// FuelBarCorrection.open(), pola sama persis FuelDashboard.render() di
// baris atas. Refresh setelah transaksi BBM/servis terjadi lewat
// renderCnTab() ini sendiri dipanggil ulang (pola sama persis refresh
// FuelCard/FuelDashboard/FuelCompare).
if(typeof FuelTrendDashboard!=='undefined')FuelTrendDashboard.render();
if(typeof VehicleAutomationPresenter!=='undefined')VehicleAutomationPresenter.render();
// Sesi 532 (fix audit "UI Ride tidak muncul di tab Jalan"): RideUI (S525)
// sudah lengkap dikoding+ditest tapi render()-nya belum pernah dipanggil
// dari mana pun (pane #cnTab-jalan juga belum ada di markup -- sudah
// ditambah sesi ini, lihat index.html/app_production.html). Panggilan
// ini pola SAMA PERSIS presenter Car Notes lain di atas -- 0 rumus baru,
// murni sinkron DOM. RideUI.render() sendiri SELALU guard getElementById
// null, jadi aman dipanggil tiap renderCnTab() walau tab 'jalan' sedang
// tidak aktif (sama seperti presenter lain di sini yang tetap dipanggil
// terlepas tab mana yang aktif).
// RE-APPLIED (Sesi 543, audit): panggilan ini sempat hilang lagi di
// build v1266-1267 (Sesi 538) karena modules-render.js ter-rebuild dari
// base lama sebelum Sesi 532 -- dipasang ulang persis sama.
if(typeof RideUI!=='undefined')RideUI.render();
const curKmEl=document.getElementById('cnCurKm');
const curKmSrcEl=document.getElementById('cnCurKmSrc');
if(curKmEl&&!document.getElementById('cnCurKmInput')){
const kmSrc=getVehicleKmSource(curVehicleId);
curKmEl.textContent=kmSrc.km.toLocaleString('id-ID')+' km';
if(curKmSrcEl)curKmSrcEl.textContent=kmSourceLabel(kmSrc.source);
}
renderCarImportVehicleSelect();
renderVehTaxSim();
if(curCnTab==='bbm')renderBbmList();
if(curCnTab==='servis')renderServisList();
}

function renderBbmList(){return BBM.renderList();}

function renderSparepartCatList(){return Sparepart.renderCatList();}

function renderStockList(){return Sparepart.renderStockList();}

function renderVehicleSpecCard(){
const el=document.getElementById('vehSpecCard');
if(!el)return;
const veh=D.vehicles&&D.vehicles.find(v=>v.id===curVehicleId);
const spec=veh?findVehicleSpec(veh.name):null;
if(!spec){ el.innerHTML=''; return; }
const umumRows=Object.entries(spec.umum).map(([k,v])=>`<div class="u-flex u-jcb u-gap10 u-fs12" style="padding:5px 0;border-bottom:1px solid var(--border)"><span class="u-t2">${escapeHtml(k)}</span><span class="u-fw600 u-tar">${escapeHtml(v)}</span></div>`).join('');
const banRows=['depan','belakang'].map(pos=>`
    <div class="u-flex u-jcb u-gap10 u-fs12" style="padding:5px 0;border-bottom:1px solid var(--border)">
      <span class="u-t2">Ban ${pos==='depan'?'Depan':'Belakang'}</span>
      <span class="u-fw600 u-tar">${escapeHtml(spec.ban[pos].ukuran)}</span>
    </div>
    <div class="u-flex u-jcb u-gap10" style="padding:5px 0 5px 12px;border-bottom:1px solid var(--border);font-size:11.5px">
      <span class="u-ctext3">🔧 Tekanan angin</span>
      <span class="u-t2 u-tar">${escapeHtml(spec.ban[pos].tekanan)}</span>
    </div>`).join('');
const bohlamRows=spec.kelistrikan.bohlam.map(([k,v])=>`<div class="u-flex u-jcb u-gap10 u-fs12" style="padding:4px 0"><span class="u-t2">${escapeHtml(k)}</span><span class="u-fw600 u-tar">${escapeHtml(v)}</span></div>`).join('');
const batasRows=spec.batasServis.map(([nama,standar,batas])=>`
    <div class="u-fs12" style="padding:6px 0;border-bottom:1px solid var(--border)">
      <div class="u-fw600 u-mb2">${escapeHtml(nama)}</div>
      <div class="u-flex u-jcb u-t2" style="font-size:11.5px"><span>Standar: ${escapeHtml(standar)}</span><span class="u-cacc2 u-fw700">Batas: ${escapeHtml(batas)}</span></div>
    </div>`).join('');
el.innerHTML=`
    <div class="card-title u-flex u-aic u-jcb">
      <span>📋 Spesifikasi Pabrik</span>
      <span class="card-collapse-toggle" id="vehSpecCard-chev" data-action="toggleCardCollapse" data-args='["vehSpecCard","$event"]' aria-label="Buka/tutup bagian">▾</span>
    </div>
    <div class="card-collapse-body" id="vehSpecCard-cbody">
      <details open class="u-mb8">
        <summary class="u-pointer u-fs13 u-fw700" style="padding:4px 0">⚙️ Umum & Kapasitas</summary>
        <div style="padding-top:4px">${umumRows}</div>
      </details>
      <details class="u-mb8">
        <summary class="u-pointer u-fs13 u-fw700" style="padding:4px 0">🛞 Ban & Tekanan Angin</summary>
        <div style="padding-top:4px">${banRows}</div>
      </details>
      <details class="u-mb8">
        <summary class="u-pointer u-fs13 u-fw700" style="padding:4px 0">🔌 Kelistrikan (Aki/Sekring/Bohlam)</summary>
        <div style="padding-top:4px">
          <div class="u-flex u-jcb u-gap10 u-fs12" style="padding:4px 0"><span class="u-t2">Aki (battery)</span><span class="u-fw600 u-tar">${escapeHtml(spec.kelistrikan.aki)}</span></div>
          <div class="u-flex u-jcb u-gap10 u-fs12" style="padding:4px 0 8px;border-bottom:1px solid var(--border)"><span class="u-t2">Sekring (fuse)</span><span class="u-fw600 u-tar">${escapeHtml(spec.kelistrikan.sekring)}</span></div>
          ${bohlamRows}
        </div>
      </details>
      <details>
        <summary class="u-pointer u-fs13 u-fw700" style="padding:4px 0">🛑 Batas Servis Rem (Keselamatan)</summary>
        <div style="padding-top:4px">${batasRows}
          <div class="u-fs11 u-t2 u-mt6 u-lh15">⚠️ Kalau ukuran sudah melewati batas ini, komponen wajib diganti — jangan ditunda demi keselamatan.</div>
        </div>
      </details>
      <div class="u-ctext3 u-mt8 u-lh15" style="font-size:10.5px">📘 Sumber: ${escapeHtml(spec.sourceNote)}</div>
    </div>`;
// Konsistensi persistence collapse (audit UI/UX sesi ini): kartu ini pakai
// card-collapse-toggle/toggleCardCollapse() sama seperti ~40+ kartu lain,
// tapi kelewat manggil applyOneCardCollapsePref() (localStorage
// cardCollapsePrefs) sehingga state buka/tutup tidak diingat lintas
// render/reload -- 0 mekanisme baru, guard typeof pola sama pemanggil lain.
if(typeof applyOneCardCollapsePref==='function')applyOneCardCollapsePref('vehSpecCard');
}

function renderServisReminder(){return Servis.renderReminder();}

function renderServisList(){return Servis.renderList();}

function renderStorageUsage(){
const barEl=document.getElementById('storageOverallBar');
const listEl=document.getElementById('storageBreakdown');
if(!barEl||!listEl)return;
const totalBytes=byteSize(D);
const pct=Math.min(100,Math.round((totalBytes/STORAGE_QUOTA_ESTIMATE)*100));
const barClass=pct>=90?'over':pct>=70?'warn':'ok';
barEl.innerHTML=`
    <div class="u-flex u-jcb u-fs12 u-t2 u-mb4">
      <span>${fmtBytes(totalBytes)} terpakai dari ±${fmtBytes(STORAGE_QUOTA_ESTIMATE)}</span>
      <span style="font-weight:700;color:${pct>=90?'var(--accent2)':pct>=70?'var(--accent4)':'var(--accent3)'}">${pct}%</span>
    </div>
    <div class="prog-bar" style="height:10px"><div class="prog-fill ${barClass}" style="width:${pct}%;background:${pct>=90?'var(--accent2)':pct>=70?'var(--accent4)':'var(--accent3)'}"></div></div>
    ${pct>=70?`<div style="font-size:12px;color:${pct>=90?'var(--accent2)':'var(--accent4)'};margin-top:6px;font-weight:600">${pct>=90?'⚠️ Penyimpanan hampir penuh! Segera backup & pertimbangkan hapus data lama.':'⚠️ Penyimpanan mulai penuh, mulai pertimbangkan backup rutin.'}</div>`:''}
  `;
const rows=STORAGE_BIG_MODULES.map(m=>{
const arr=D[m.key]||[];
const bytes=byteSize(arr);
return {label:m.label,count:arr.length,bytes};
});
const knownBytes=rows.reduce((s,r)=>s+r.bytes,0);
const otherBytes=Math.max(0,totalBytes-knownBytes);
rows.push({label:'⚙️ Lainnya (akun, kategori, kendaraan, profil, pengaturan, dll)',count:null,bytes:otherBytes});
rows.sort((a,b)=>b.bytes-a.bytes);
const maxBytes=Math.max(...rows.map(r=>r.bytes),1);
listEl.innerHTML=rows.filter(r=>r.count===null?r.bytes>0:r.count>0).map(r=>{
const p=Math.round((r.bytes/maxBytes)*100);
return `<div class="u-mb10">
      <div class="u-flex u-jcb u-fs13" style="margin-bottom:3px">
        <span>${r.label}${r.count!==null?` <span class="u-ctext3 u-fs12">(${r.count.toLocaleString('id-ID')} data)</span>`:''}</span>
        <span class="u-fw600 u-t2">${fmtBytes(r.bytes)}</span>
      </div>
      <div class="prog-bar" style="height:6px"><div class="prog-fill" style="width:${p}%;background:var(--accent)"></div></div>
    </div>`;
}).join('');
renderArchiveSuggestHint();
renderArchiveHistory();
renderActualStorageQuota();
}

async function renderActualStorageQuota(){
const el=document.getElementById('storageActualQuota');
if(!el)return;
el.textContent='';
try{
if(!navigator.storage||!navigator.storage.estimate)return;
const est=await navigator.storage.estimate();
if(el.isConnected===false)return;
if(typeof est.usage==='number'&&typeof est.quota==='number'&&est.quota>0){
el.textContent=`ℹ️ Kuota nyata dari browser ini: ${fmtBytes(est.usage)} terpakai dari ${fmtBytes(est.quota)} (mencakup SEMUA data situs ini, bukan cuma app ini kalau ada data lain).`;
}
}catch(e){ }
}

function renderArchiveSuggestHint(){
const el=document.getElementById('archiveSuggestHint');
if(!el)return;
const curYear=new Date().getFullYear();
const archivedYears=new Set((D.archiveHistory||[]).flatMap(h=>h.years||[]));
const oldUnarchived=archiveAvailableYears().filter(y=>y<=curYear-2 && !archivedYears.has(y));
if(!oldUnarchived.length){ el.innerHTML=''; return; }
el.innerHTML=`<div class="u-fs12 u-cacc4 u-r10 u-mt10 u-lh15" style="background:var(--accent4-soft);border:1px solid rgba(255,169,77,0.25);padding:10px 12px">📅 Ada data riwayat tahun ${oldUnarchived.sort().join(', ')} yang sudah lama & belum pernah diarsip. Pertimbangkan arsip supaya penyimpanan HP lebih lega.</div>`;
}

function renderArchiveHistory(){
const wrap=document.getElementById('archiveHistoryWrap');
if(!wrap)return;
const hist=D.archiveHistory||[];
if(!hist.length){ wrap.innerHTML=''; return; }
const rows=hist.slice(-5).reverse().map(h=>`
    <div class="u-flex u-jcb u-fs12" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <span>Tahun ${(h.years||[]).join(', ')}</span>
      <span class="u-t2">${(h.totalItems||0).toLocaleString('id-ID')} data · ${new Date(h.date).toLocaleDateString('id-ID')}</span>
    </div>`).join('');
wrap.innerHTML=`<div class="card-title u-mb6">🗄️ Riwayat Arsip</div>${rows}`;
}

function renderSettings(){
const diagGroupEl=document.getElementById('stgGroup6');
if(diagGroupEl) diagGroupEl.style.display=''; // Diagnostik selalu tampil (dulu disembunyikan kalau bukan dev mode)
renderStorageUsage();
updateDebugConsoleBtn();
const abvEl=document.getElementById('aboutBuildVersion'); if(abvEl) abvEl.textContent=APP_BUILD_VERSION;
const asvEl=document.getElementById('aboutSchemaVersion'); if(asvEl) asvEl.textContent='v'+SCHEMA_VERSION;
const apsEl=document.getElementById('aboutProdSyncStatus'); if(apsEl){ const ps=computeProductionSyncStatus(); apsEl.textContent=ps.label; apsEl.style.color=ps.inSync?'var(--accent3)':'#e0a030'; }
const fsCurEl=document.getElementById('fileSizeCurrent'), fsStatEl=document.getElementById('fileSizeStatus');
if(fsCurEl&&fsStatEl){
const fs=computeFileSizeStatus();
fsCurEl.textContent=fmtBytes(fs.size);
fsStatEl.textContent=fs.label;
fsStatEl.style.color=fs.color;
}
document.getElementById('sNama').value=D.profile.nama||'W';
document.getElementById('sGaji').value=D.profile.gajiPokok||65000;
document.getElementById('sKirim').value=D.profile.kiriman||500000;
const sLemburMxEl=document.getElementById('sLemburMx'); if(sLemburMxEl) sLemburMxEl.value=D.profile.lemburMultiplier||1.5;
const sTarifMingguEl=document.getElementById('sTarifMinggu'); if(sTarifMingguEl) sTarifMingguEl.value=D.profile.tarifMinggu||139000;
const sInsightMingguanAktifEl=document.getElementById('sInsightMingguanAktif'); if(sInsightMingguanAktifEl) sInsightMingguanAktifEl.checked=!(D.profile&&D.profile.insightMingguanAktif===false);
const sTglLahirEl=document.getElementById('sTanggalLahir'); if(sTglLahirEl) sTglLahirEl.value=(D.profile&&D.profile.tanggalLahir)||'';
const kawinVal=!!(D.profile&&D.profile.statusKawin);
document.querySelectorAll('#sStatusKawinPicker .chip-btn').forEach(b=>b.classList.toggle('active',(b.dataset.val==='1')===kawinVal));
const tanggunganVal=Math.max(0,Math.min(3,parseInt((D.profile&&D.profile.tanggungan)||0)||0));
document.querySelectorAll('#sTanggunganPicker .chip-btn').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.val)===tanggunganVal));
const pekerjaanVal=D.profile&&D.profile.statusPekerjaan;
document.querySelectorAll('#sPekerjaanPicker .chip-btn').forEach(b=>b.classList.toggle('active',b.dataset.val===pekerjaanVal));
updateProfilPTKPPreview();
updateUsiaPreview();
const apiKeyEl=document.getElementById('sApiKey'); if(apiKeyEl) apiKeyEl.value=D.profile.apiKey||'';
const providerEl=document.getElementById('sApiProvider'); if(providerEl){providerEl.value=D.profile.apiProvider||'claude';toggleApiKeyHint();}
const aiThEl=document.getElementById('sAIFinanceThreshold'); if(aiThEl) aiThEl.value=typeof getAIFinanceOverspendThreshold==='function'?getAIFinanceOverspendThreshold():150;
const aiDelThEl=document.getElementById('sAIDeliveryThreshold'); if(aiDelThEl) aiDelThEl.value=typeof getAIDeliveryThinMarginThreshold==='function'?getAIDeliveryThinMarginThreshold():10;
const aiFinLowBalEl=document.getElementById('sAIFinanceLowBalance'); if(aiFinLowBalEl) aiFinLowBalEl.value=typeof getAIFinanceLowBalanceMultiplier==='function'?getAIFinanceLowBalanceMultiplier():0.5;
const aiVehFuelDropEl=document.getElementById('sAIVehicleFuelDrop'); if(aiVehFuelDropEl) aiVehFuelDropEl.value=typeof getAIVehicleFuelDropThreshold==='function'?getAIVehicleFuelDropThreshold():20;
const aiDelLowStockEl=document.getElementById('sAIDeliveryLowStock'); if(aiDelLowStockEl) aiDelLowStockEl.value=typeof getAIDeliveryLowStockThreshold==='function'?getAIDeliveryLowStockThreshold():2;
const aiAssetZakatMinEl=document.getElementById('sAIAssetZakatMin'); if(aiAssetZakatMinEl) aiAssetZakatMinEl.value=typeof getAIAssetZakatMinThreshold==='function'?getAIAssetZakatMinThreshold():0;
const ocrMinConfEl=document.getElementById('sOcrMinConfidence'); if(ocrMinConfEl) ocrMinConfEl.value=typeof getOcrMinConfidence==='function'?getOcrMinConfidence():50;
if(typeof renderKeamananSettings==='function')renderKeamananSettings();
const whG=document.getElementById('whGaji'); if(whG) whG.value=D.profile.gajiPokok||65000;
const whD=document.getElementById('whDate'); if(whD&&!whD.value) whD.value=new Date().toISOString().split('T')[0];
renderWorkDays();
document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.t===(D.profile.theme||'dark')));
renderDashCardPrefsUI();
// S129 (Dashboard Settings): sinkronkan kontrol Compact Mode/Density/Tab
// Default/urutan kartu (lihat modules/dashboard-hub/dashboard-hub-settings.js)
// tiap kali halaman Pengaturan dirender ulang — pola sama dgn
// renderDashCardPrefsUI() di atas. Guard typeof: modul ini opsional dari
// sudut pandang renderSettings() (tidak boleh menjatuhkan sisa fungsi kalau
// entah kenapa belum sempat dimuat).
if(typeof DashboardSettings!=='undefined')DashboardSettings.renderSettingsUI();
// S229-230 (Settings -> Ownership, read-only): sinkronkan tab Kepemilikan
// tiap kali halaman Pengaturan dirender ulang — pola sama DashboardSettings
// di atas. Guard typeof: modul ini opsional dari sudut pandang
// renderSettings() (tidak boleh menjatuhkan sisa fungsi kalau entah kenapa
// belum sempat dimuat).
if(typeof OwnershipSettingsPresenter!=='undefined')OwnershipSettingsPresenter.render();
// R4 (audit ownership/titipan, menutup OWNREG-GATE3-001): sinkronkan card
// "Kelola Daftar Pemilik" (#ownerRegistrySettingsList) tiap kali halaman
// Pengaturan dirender ulang — pola sama persis OwnershipSettingsPresenter
// di atas. Guard typeof sama alasan yang sama (modul opsional dari sudut
// pandang renderSettings()).
if(typeof OwnerRegistrySettingsUI!=='undefined')OwnerRegistrySettingsUI.render();
// S592 (lanjutan PATCH-ghost-asset-migrated-investment.md): sinkronkan card
// "Bersihkan Aset Ghost (Migrasi)" (#ghostAssetCleanupList) tiap kali halaman
// Pengaturan dirender ulang — pola sama persis OwnerRegistrySettingsUI di
// atas. Guard typeof sama alasan yang sama (modul opsional dari sudut
// pandang renderSettings()).
if(typeof GhostAssetCleanupUI!=='undefined')GhostAssetCleanupUI.render();
// Data Management Core: Backup Health/Backup History (lihat
// modules/shared/backup-health-presenter.js/backup-history-presenter.js)
// — guard typeof, pola sama dgn DashboardSettings di atas.
if(typeof BackupHealthPresenter!=='undefined')BackupHealthPresenter.render();
if(typeof BackupHistoryPresenter!=='undefined')BackupHistoryPresenter.render();
renderAccGrid();
renderCatList();
renderSparepartCatList();
renderStockList();
renderBillList();
renderTarget();
EduFund.render();
renderReminder();
renderNotifSettings();
if(typeof EIENotifSettings!=='undefined') EIENotifSettings.render();
const lifeOSVisibleToggleEl=document.getElementById('lifeOSVisibleToggle'); if(lifeOSVisibleToggleEl && typeof LifeOSHome!=='undefined') lifeOSVisibleToggleEl.checked=LifeOSHome.isVisiblePref();
renderGDriveSettings();
renderSheetsSettings();
setImportType(curImportType,document.querySelector('#importChips .chip-btn'));
renderSelfTestLastResult();
}

function renderChatActionBubble(actionId,type,data){
return `<div class="chat-bubble ai u-r12" id="chatAction_${actionId}" style="border:1px solid var(--accent)">${chatActionInnerHTML(actionId,type,data)}</div>`;
}

function renderNotifSettings(){
const el=document.getElementById('notifEnableToggle');
if(el) el.checked=!!(D.notifSettings.enabled && 'Notification' in window && Notification.permission==='granted');
const statusEl=document.getElementById('notifStatus');
if(statusEl){
if(!('Notification' in window)) statusEl.textContent='⚠️ Browser ini tidak mendukung notifikasi';
else if(Notification.permission==='denied') statusEl.textContent='❌ Izin diblokir — aktifkan manual lewat pengaturan situs di browser';
else if(Notification.permission==='granted'&&D.notifSettings.enabled) statusEl.textContent='✅ Notifikasi aktif (aktif selama app ini dibuka/di-background)';
else statusEl.textContent='Belum aktif. Aktifkan dulu di atas.';
}
}


function renderGDriveSettings(){
const idEl=document.getElementById('gdClientId'); if(idEl) idEl.value=D.googleDrive.clientId||'';
const stEl=document.getElementById('gdStatus');
if(stEl){
const syncLabel=D.googleDrive.lastSync? 'terakhir sinkron '+new Date(D.googleDrive.lastSync).toLocaleString('id-ID') : 'belum pernah sinkron';
stEl.textContent=gdriveConnStatusLabel()+' · '+syncLabel;
}
const asEl=document.getElementById('gdAutoSync'); if(asEl) asEl.checked=!!D.googleDrive.autoSync;
const dcBtn=document.getElementById('gdDisconnectBtn'); if(dcBtn) dcBtn.style.display=gdriveAccessToken?'':'none';
}

function renderSheetsSettings(){
const idEl=document.getElementById('gsSpreadsheetId'); if(idEl) idEl.value=D.googleSheets.spreadsheetId||'';
const stEl=document.getElementById('gsStatus');
if(stEl){
const syncLabel=D.googleSheets.lastSync? 'terakhir sinkron '+new Date(D.googleSheets.lastSync).toLocaleString('id-ID') : 'belum pernah sinkron';
stEl.textContent=gdriveConnStatusLabel(true)+' · '+syncLabel;
}
const dcBtn=document.getElementById('gsDisconnectBtn'); if(dcBtn) dcBtn.style.display=gdriveAccessToken?'':'none';
const linkEl=document.getElementById('gsLink');
if(linkEl) linkEl.innerHTML=D.googleSheets.spreadsheetId? `<a class="u-cacc4" href="https://docs.google.com/spreadsheets/d/${D.googleSheets.spreadsheetId}" target="_blank">🔗 Buka Spreadsheet</a><br><span class="u-ctext3">🕘 Riwayat versi: di dalam Sheets, buka menu <b>File → Riwayat versi → Lihat riwayat versi</b> (atau tekan Ctrl+Alt+Shift+H)</span>` : '';
const cntEl=document.getElementById('gsLocalCount');
if(cntEl){
const perModul=SHEETS_MODULES.map(m=>`${m}:${(D[m]||[]).length}`).join(', ');
const total=SHEETS_MODULES.reduce((s,m)=>s+(D[m]||[]).length,0);
cntEl.textContent=`🔍 Debug (build ${APP_BUILD_VERSION}) — data lokal siap disync: ${total} item total (${perModul})`;
}
}

function renderSelfTestResults(data){
_lastSelfTestData=data;
const summaryEl=document.getElementById('selfTestSummary');
const resultsEl=document.getElementById('selfTestResults');
const copyBtn=document.getElementById('selfTestCopyBtn');
const when=new Date(data.ranAt).toLocaleString('id-ID');
if(summaryEl) summaryEl.innerHTML=(data.failCount===0?'✅ ':'⚠️ ')+'<b>'+data.passCount+'/'+data.total+'</b> tes berhasil'+(data.failCount>0?' · <span class="u-cacc2">'+data.failCount+' gagal</span>':'')+'<div class="u-ctext3 u-mt2">Terakhir dijalankan: '+when+'</div>';
if(resultsEl){
resultsEl.innerHTML=data.results.map(r=>`
      <div class="u-flex u-aifs u-gap8 u-fs12" style="padding:8px 0;border-top:1px solid var(--border)">
        <span>${r.pass?'✅':'❌'}</span>
        <div class="u-flex1">
          <div class="u-ctext">${escapeHtml(r.name)}</div>
          ${r.pass?'':'<div class="u-cacc2 u-mt2">'+escapeHtml(r.error)+'</div>'}
        </div>
      </div>`).join('');
}
if(copyBtn) copyBtn.style.display=data.results.length?'block':'none';
}

function renderSelfTestLastResult(){
const summaryEl=document.getElementById('selfTestSummary');
if(!summaryEl||_lastSelfTestData) return;
try{
const raw=localStorage.getItem('kw_selftest_last');
if(!raw) return;
const stored=JSON.parse(raw);
if(!stored||!Array.isArray(stored.results)) return;
renderSelfTestResults(stored);
}catch(e){ }
}

function renderNavSmokeResults(data){
_lastNavSmokeData=data;
const summaryEl=document.getElementById('navSmokeSummary');
const resultsEl=document.getElementById('navSmokeResults');
const copyBtn=document.getElementById('navSmokeCopyBtn');
if(summaryEl) summaryEl.innerHTML=(data.failCount===0?'✅ ':'⚠️ ')+'<b>'+data.passCount+'/'+data.total+'</b> halaman aman'+(data.failCount>0?' · <span class="u-cacc2">'+data.failCount+' bermasalah</span>':'')+'<div class="u-ctext3 u-mt2">Terakhir dijalankan: '+new Date(data.ranAt).toLocaleString('id-ID')+'</div>';
if(resultsEl){
resultsEl.innerHTML=data.results.filter(r=>!r.pass).map(r=>`
      <div class="u-flex u-aifs u-gap8 u-fs12" style="padding:8px 0;border-top:1px solid var(--border)">
        <span>❌</span>
        <div class="u-flex1">
          <div class="u-ctext">${escapeHtml(r.name)}</div>
          <div class="u-cacc2 u-mt2">${escapeHtml(r.error||'')}</div>
        </div>
      </div>`).join('');
}
if(copyBtn) copyBtn.style.display=data.results.length?'block':'none';
}

function renderModalSweepResults(data){
_lastModalSweepData=data;
const summaryEl=document.getElementById('modalSweepSummary');
const resultsEl=document.getElementById('modalSweepResults');
const copyBtn=document.getElementById('modalSweepCopyBtn');
if(summaryEl) summaryEl.innerHTML=(data.failCount===0?'✅ ':'⚠️ ')+'<b>'+data.passCount+'/'+data.total+'</b> modal aman'+(data.contextCount>0?' · <span class="u-ctext3">'+data.contextCount+' butuh konteks (wajar)</span>':'')+(data.failCount>0?' · <span class="u-cacc2">'+data.failCount+' bermasalah</span>':'')+'<div class="u-ctext3 u-mt2">Terakhir dijalankan: '+new Date(data.ranAt).toLocaleString('id-ID')+'</div>';
if(resultsEl){
resultsEl.innerHTML=data.results.filter(r=>!r.pass&&!r.needsContext).map(r=>`
      <div class="u-flex u-aifs u-gap8 u-fs12" style="padding:8px 0;border-top:1px solid var(--border)">
        <span>❌</span>
        <div class="u-flex1">
          <div class="u-ctext">${escapeHtml(r.fn)} <span class="u-ctext3">(#${escapeHtml(r.id)})</span></div>
          <div class="u-cacc2 u-mt2">${escapeHtml(r.error||'')}</div>
        </div>
      </div>`).join('');
}
if(copyBtn) copyBtn.style.display=data.results.length?'block':'none';
}

function renderPajakZakat(){
if(typeof PajakInsight!=='undefined')PajakInsight.render();
const pz=D.pajakZakat;
const elHE=document.getElementById('pzHargaEmas'); if(elHE&&!elHE.matches(':focus'))elHE.value=pz.hargaEmasPerGram;
const elNB=document.getElementById('pzNisabBulan'); if(elNB&&!elNB.matches(':focus'))elNB.value=pz.nisabPenghasilanBulan;
const elFJ=document.getElementById('pzFitrahJiwa'); if(elFJ&&!elFJ.matches(':focus'))elFJ.value=pz.zakatFitrahPerJiwa;
renderRefCheckReminder();
const elUT=document.getElementById('zmUtang'); if(elUT&&!elUT.matches(':focus'))elUT.value=pz.utangJT||'';
const elPphStatus=document.getElementById('pphStatus'); if(elPphStatus) elPphStatus.value=profilePTKPStatus();
const elZfJiwa=document.getElementById('zfJiwa'); if(elZfJiwa&&!elZfJiwa.matches(':focus'))elZfJiwa.value=profileJiwaKeluarga();
const elPphBruto=document.getElementById('pphBruto'); if(elPphBruto&&!elPphBruto.matches(':focus'))elPphBruto.value=pz.pphBrutoBulan||'';
const elPphIuran=document.getElementById('pphIuran'); if(elPphIuran&&!elPphIuran.matches(':focus'))elPphIuran.value=pz.pphIuranBulan||'';
const elSptBadge=document.getElementById('pphSptBadge'); if(elSptBadge){const st=sptStatusBadge();elSptBadge.textContent=st.label;elSptBadge.className=st.col;}
renderSptLinkStatus();
renderPajakRekomendasi();
renderAssetList();
renderPiutangList();
renderDebtList();
renderKekayaanBersih();
AlokasiAset.init();
hitungZakatPenghasilan();
hitungZakatMaal();
hitungZakatFitrah();
hitungPPh21();
renderUMKMPajak();
renderPBB();
renderZakatLog();
_pajakZakatRenderedOnce=true;
}

function renderRefCheckReminder(){
const el=document.getElementById('refCheckReminder');
const noteEl=document.getElementById('refCheckedNote');
if(!el||!noteEl)return;
const pz=D.pajakZakat;
if(!pz.refCheckedAt){
el.style.display='none';
noteEl.textContent='Belum pernah dicek via AI.';
return;
}
const days=Math.floor((new Date()-new Date(pz.refCheckedAt))/86400000);
noteEl.textContent=`Terakhir dicek via AI: ${new Date(pz.refCheckedAt).toLocaleDateString('id-ID')} (${days} hari lalu).`;
if(days>=180){
el.classList.remove('u-dnone');el.style.display='block';
el.style.background='var(--accent2-soft)';
el.style.color='var(--accent2)';
el.textContent=`⚠️ Sudah ${days} hari sejak terakhir dicek — harga emas & nisab kemungkinan sudah berubah. Cek ulang di bawah.`;
} else {
el.style.display='none';
}
}

function renderZakatLog(){return Zakat.renderLog();}

function renderUMKMPajak(){return PajakUMKM.render();}

function renderAssetList(){return Aset.renderList();}

function renderPiutangList(){return Piutang.renderList();}

function renderDebtList(){return Debt.renderList();}

function renderWealthSnapshots(){return Kekayaan.renderSnapshots();}

function renderKekayaanBersih(){return Kekayaan.renderBersih();}

function renderPBB(){return PBB.render();}

function renderPBBBillStatus(){return PBB.renderBillStatus();}