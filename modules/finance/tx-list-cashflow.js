// tx-list-cashflow.js — domain "List Transaksi (kartu tx, hapus tx), filter
// Dipindah ke modules/finance/tx-list-cashflow.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// periode Keuangan/Laporan, & Cashflow Forecast".
// Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split
// transaksi.js" bagian ke-11 -- lanjutan bagian ke-5/6/7/8/9). Semua tetap
// fungsi global verbatim (tidak ada perubahan logika sama sekali), dipanggil
// sama persis dari HTML (app_production.html/index.html: onclick
// changeMonth/setTxListPeriode/setPeriode/setKeuanganTab), dari
// modules-render.js (renderKeuangan/renderLaporan/renderCashflowForecast
// masing2 makai getTxListRange/getRange/computeCashflowForecast), dari
// backup-restore.js & cobek.js (getRange/txHTML/computeCashflowForecast utk
// ekspor & kartu shop), dan features-sheets-pwa-selftest.js (self-test
// makai setKeuanganTab).
//
// Variabel state `txListPeriode` (filter periode List Transaksi di tab
// Kelola) ikut dipindah ke sini karena cuma dipakai bareng
// setTxListPeriode/getTxListRange di bawah -- beda dari `filterPeriode`
// (filter Laporan) yang sudah dideklarasikan bareng variabel global lain di
// features-helpers-global-security.js sejak awal, jadi TIDAK ikut dipindah.
// `curMonth`/`curYear`/`txListPage` juga TIDAK dipindah -- sudah dipakai
// modul lain (features-helpers-global-security.js, filter-laporan.js)
// sebelum sesi ini, dibiarkan di tempat asalnya.
function txHTML(t){
const cats=getAllCats();
let icon='💰', bg='var(--accent-soft)';
if(t.type==='transfer_out'||t.type==='transfer_in'){icon='⇄';bg='var(--accent-soft)';}
else { const cat=cats.find(c=>c.name===t.category); if(cat){icon=cat.emoji;} bg=t.type==='income'?'var(--accent3-soft)':'var(--accent2-soft)'; }
const sign=(t.type==='income'||t.type==='transfer_in')?'+':'-';
const cls=(t.type==='income'||t.type==='transfer_in')?'green':'red';
const acc=D.accounts.find(a=>a.id===t.accountId);
const subText=t.subcategory?(' · '+t.subcategory):'';
const pmIcons={cicilan:'💳',langganan:'🔁',tunai:''};
const pmBadge=(t.payMethod&&t.payMethod!=='tunai')?` <span class="acc-chip">${pmIcons[t.payMethod]||''} ${t.payMethod}</span>`:'';
return`<div class="tx-item u-pointer" data-action="editTx" data-args="${escapeHtml(JSON.stringify([t.id]))}">
    <div class="tx-icon" style="background:${bg}">${icon}</div>
    <div class="tx-info"><div class="tx-name">${escapeHtml(t.category)}${escapeHtml(subText)}</div><div class="tx-meta">${t.date}${t.note?' · '+escapeHtml(t.note):''}${acc?` <span class="acc-chip">${acc.emoji} ${escapeHtml(acc.name)}</span>`:''}${pmBadge}</div></div>
    <div class="u-flex u-aic u-gap6">
      <div class="tx-amount ${cls}">${sign}${fmt(t.amount)}</div>
      <button class="tx-del" data-stop="1" data-action="delTx" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
    </div>
  </div>`;
}
async function delTx(id){
if(!await askConfirm('Hapus transaksi ini?'))return;
const t=D.transactions.find(x=>x.id===id);
if(t&&t.bbmLinkId&&D.bbmLogs)D.bbmLogs=D.bbmLogs.filter(b=>b.id!==t.bbmLinkId);
if(t&&t.partStockId&&typeof revertStockPurchase==='function'){
revertStockPurchase(t.partStockId,t.partStockQty);
toast(`📦 Stok sparepart dikurangi (transaksi dihapus)`,2600);
renderStockList();
}
if(t&&t.stockItems&&t.stockItems.length){
t.stockItems.forEach(si=>{
const p=D.products.find(x=>x.id===si.productId);
if(p)p.stock=Math.max(0,(p.stock||0)-(si.qty||0));
});
toast(`📦 Stok dikurangi (transaksi dihapus)`,2600);
} else if(t&&t.stockProductId){
const p=D.products.find(x=>x.id===t.stockProductId);
if(p){p.stock=Math.max(0,(p.stock||0)-(t.stockQty||0));toast(`📦 Stok "${p.name}" dikurangi ${t.stockQty} (transaksi dihapus)`,2600);}
}
if(t&&t.cobekLinkId){
const linkedShop=D.cobek.find(c=>c.id===t.cobekLinkId);
if(linkedShop&&linkedShop.items){
linkedShop.items.forEach(it=>{const p=D.products.find(x=>x.id===it.productId);if(p)p.stock=(p.stock||0)+it.qty;});
toast(`🪨 Stok dikembalikan, penjualan Shop terkait dihapus`,2600);
}
D.cobek=D.cobek.filter(c=>c.id!==t.cobekLinkId);
renderShop();renderShopRecent();
}
if(t&&t.servisLinkId&&D.servisLogs){
const linkedServis=D.servisLogs.find(s=>s.id===t.servisLinkId);
if(linkedServis){
if(linkedServis.usedPartId)revertStockUsage(linkedServis.usedPartId,linkedServis.usedPartQty);
toast(`🔧 Catatan servis terkait ikut dihapus`,2600);
}
D.servisLogs=D.servisLogs.filter(s=>s.id!==t.servisLinkId);
renderStockList();
}
if(t&&t.renovItemLinkId&&typeof Renov!=='undefined'){
Renov.onLinkedTxDeleted(t);
}
if(t&&t.wishlistLinkId){
WorthIt.onLinkedTxDeleted(t);
}
if(t&&t.sewaKiosLinkId&&typeof SewaKios!=='undefined'){
SewaKios.onLinkedTxDeleted(t);
}
if(t&&t.tukangPaymentEntryIds&&t.tukangPaymentEntryIds.length){
Tukang.unmarkPaidEntries(t.tukangPaymentEntryIds);
}
D.transactions=D.transactions.filter(t=>t.id!==id);
save();renderDashboard();renderKeuangan();renderCnTab();renderProductList();
if(!t||(!t.stockProductId&&!t.cobekLinkId&&!t.servisLinkId&&!t.partStockId&&!(t.stockItems&&t.stockItems.length)))toast('🗑 Dihapus'+(t&&t.renovItemLinkId?' (status lunas di Proyek Renovasi dibatalkan)':(t&&t.wishlistLinkId?' (barang dikembalikan ke Prioritas Belanja)':(t&&t.tukangPaymentEntryIds&&t.tukangPaymentEntryIds.length?' (absensi tukang terkait dibuka kembali)':''))));
}
function changeMonth(dir){
curMonth+=dir;
if(curMonth>11){curMonth=0;curYear++;}
if(curMonth<0){curMonth=11;curYear--;}
closeModal('filterTxModal');
txListPage=1;
renderKeuangan();
}
let txListPeriode='bulan';
function setTxListPeriode(p,el){
txListPeriode=p;
document.querySelectorAll('#txListPeriodeChips .chip-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');
document.getElementById('txListCustomRange').classList.toggle('u-dnone', p!=='custom');
document.getElementById('txListCustomRange').style.display='';
resetTxPageAndRender();
}
function getTxListRange(){
if(txListPeriode==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(txListPeriode==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(txListPeriode==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(txListPeriode==='bulan'){from=new Date(curYear,curMonth,1);const to2=new Date(curYear,curMonth+1,0);to2.setHours(23,59,59,999);return{from,to:to2};}
else if(txListPeriode==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const f=document.getElementById('txListFrom').value,t2=document.getElementById('txListTo').value;return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
}
function setPeriode(p,el){
filterPeriode=p;
document.querySelectorAll('#periodeChips .chip-btn').forEach(b=>b.classList.remove('active'));
if(el&&el.classList)el.classList.add('active');
document.getElementById('customRange').classList.toggle('u-dnone', p!=='custom');
document.getElementById('customRange').style.display='';
renderLaporan();
}
function getRange(){
if(filterPeriode==='selamanya')return{from:new Date(0),to:new Date(8640000000000000)};
const now=new Date();now.setHours(23,59,59,999);let from;
if(filterPeriode==='hari'){from=new Date();from.setHours(0,0,0,0);}
else if(filterPeriode==='minggu'){from=new Date();from.setDate(from.getDate()-from.getDay());from.setHours(0,0,0,0);}
else if(filterPeriode==='bulan'){from=new Date(now.getFullYear(),now.getMonth(),1);}
else if(filterPeriode==='tahun'){from=new Date(now.getFullYear(),0,1);}
else{const f=document.getElementById('fFrom').value,t2=document.getElementById('fTo').value;return{from:f?new Date(f):new Date(0),to:t2?new Date(t2+'T23:59:59'):now};}
return{from,to:now};
}
// KW perf fix lanjutan: computeCashflowForecast() dipanggil berulang di siklus render yang
// sama (FinanceIntelligence.cashflowSummary()/healthScore()/insights(), renderCashflowForecast(),
// ai-core.js) — tiap panggilan scan D.transactions dari nol walau datanya sama persis. Cache
// singleton (fungsi ini tanpa parameter), invalidate lewat hook yang sama dgn cache saldo akun
// (save()/renderPageContent(), lihat akun.js/features-helpers-global-security.js/modules-render.js).
let _cashflowForecastCache=undefined;
function invalidateCashflowForecastCache(){
_cashflowForecastCache=undefined;
}
function computeCashflowForecast(){
if(_cashflowForecastCache!==undefined)return _cashflowForecastCache;
const avail=(typeof BudgetReko!=='undefined')?BudgetReko.monthsAvailable():0;
const months=(typeof BudgetReko!=='undefined')?BudgetReko.effectiveMonths():3;
const from=(typeof BudgetReko!=='undefined')?BudgetReko.rangeFrom():(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth()-2,1);})();
const now=new Date();
const txs=(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=now;});
const incAvg=txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)/months;
const expAvg=txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)/months;
const saldoNow=totalSaldoAkun();
const in30=new Date(now);in30.setDate(in30.getDate()+30);
const upcoming=(D.bills||[]).filter(b=>{const d=new Date(b.nextDue);return d>=now&&d<=in30;});
const billsDue=upcoming.reduce((s,b)=>s+b.amount,0);
const projected=saldoNow+incAvg-expAvg-billsDue;
const result={incAvg,expAvg,saldoNow,billsDue,upcoming,projected,months,avail};
_cashflowForecastCache=result;
return result;
}
const KEU_TAB_ORDER=['kelola','tagihan','budget','utangpiutang','asetproyek','laporan'];
function setKeuanganTab(t,el){
const keuTabBtns=document.querySelectorAll('#page-keuangan .cn-tab');
keuTabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=KEU_TAB_ORDER.indexOf(t); const btn=keuTabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('keuanganTab-kelola').classList.toggle('u-dnone', t!=='kelola');
document.getElementById('keuanganTab-kelola').style.display='';
document.getElementById('keuanganTab-tagihan').classList.toggle('u-dnone', t!=='tagihan');
document.getElementById('keuanganTab-tagihan').style.display='';
document.getElementById('keuanganTab-budget').classList.toggle('u-dnone', t!=='budget');
document.getElementById('keuanganTab-budget').style.display='';
document.getElementById('keuanganTab-utangpiutang').classList.toggle('u-dnone', t!=='utangpiutang');
document.getElementById('keuanganTab-utangpiutang').style.display='';
document.getElementById('keuanganTab-asetproyek').classList.toggle('u-dnone', t!=='asetproyek');
document.getElementById('keuanganTab-asetproyek').style.display='';
document.getElementById('keuanganTab-laporan').classList.toggle('u-dnone', t!=='laporan');
document.getElementById('keuanganTab-laporan').style.display='';
if(t==='kelola'){populateKeuFilters();loadKeuFilterPrefsIntoDOM();renderKeuangan();}
if(t==='tagihan'){renderBillList();}
if(t==='budget'){renderBudgets();if(typeof BudgetReko!=='undefined')BudgetReko.init();}
if(t==='utangpiutang'){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof Debt!=='undefined')Debt.renderList();}
if(t==='asetproyek'){
if(typeof Pensiun!=='undefined')Pensiun.render();
// Sesi 13 Tahap 1b: Renov (modules/home/renovasi.js) sekarang lazy-load --
// kalau belum ke-load, muat dulu lewat ensureRenov() (index.html, pola sama
// dgn ensureTesseract() dkk), baru render begitu selesai. Pensiun/SewaKios
// TIDAK terpengaruh (masih dari bundle, render sinkron seperti sebelumnya).
if(typeof Renov!=='undefined'){Renov.render();}
else if(typeof ensureRenov==='function'){
ensureRenov().then(function(){if(typeof Renov!=='undefined')Renov.render();}).catch(function(e){
console.error('[Renov] Gagal lazy-load modules/home/renovasi.js:',e);
if(typeof window.__moduleLoadFail==='function')window.__moduleLoadFail('modules/home/renovasi.js');
});
}
if(typeof SewaKios!=='undefined'){SewaKios.render();}
else if(typeof ensureSewaKios==='function'){
ensureSewaKios().then(function(){if(typeof SewaKios!=='undefined')SewaKios.render();}).catch(function(e){
console.error('[SewaKios] Gagal lazy-load modules/business/sewakios.js:',e);
if(typeof window.__moduleLoadFail==='function')window.__moduleLoadFail('modules/business/sewakios.js');
});
}
}
if(t==='laporan'){populateCatFilter();populateAccFilters();renderLaporan();renderKeuangan();}
}

// 2026-07-17: split tab 📊 Laporan jadi 3 sub-tab (Ringkasan / Arus Kas &
// Kategori / Transaksi & Export) — pola SAMA PERSIS dgn setAsetTab (aset.js),
// murni toggle DOM, tidak ada logic baru. renderLaporan() (dipanggil sekali
// saat masuk tab Laporan di atas) tetap mengisi semua kartu di ketiga
// sub-tab sekaligus, terlepas dari sub-tab mana yang lagi aktif.
const LAPORAN_SUBTAB_ORDER=['ringkasan','aruskas','transaksi'];
const LAPORAN_SUBTAB_LABEL={ringkasan:'Ringkasan',aruskas:'Arus Kas & Kategori',transaksi:'Transaksi & Export'};
function setLaporanTab(t,el){
const lapSubtabBtns=document.querySelectorAll('#keuanganTab-laporan .lap-subtab');
lapSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=LAPORAN_SUBTAB_ORDER.indexOf(t); const btn=lapSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('laporanTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('laporanTab-aruskas').classList.toggle('u-dnone', t!=='aruskas');
document.getElementById('laporanTab-transaksi').classList.toggle('u-dnone', t!=='transaksi');
const lapBc=document.getElementById('laporanBreadcrumbSub');
if(lapBc)lapBc.textContent=LAPORAN_SUBTAB_LABEL[t]||t;
}

// 2026-07-17 (bagian ke-3): split tab 💰 Kelola jadi 3 sub-tab (Ringkasan /
// Transaksi / Kelola Data) — pola SAMA PERSIS dgn setLaporanTab/setAsetTab
// di atas, murni toggle DOM. renderKeuangan() (dipanggil sekali saat masuk
// tab Kelola) tetap mengisi semua kartu di ketiga sub-tab sekaligus,
// terlepas dari sub-tab mana yang lagi aktif.
const KELOLA_SUBTAB_ORDER=['ringkasan','transaksi','pengaturan'];
const KELOLA_SUBTAB_LABEL={ringkasan:'Ringkasan',transaksi:'Transaksi',pengaturan:'Kelola Data'};
function setKelolaTab(t,el){
const kelSubtabBtns=document.querySelectorAll('#keuanganTab-kelola .kel-subtab');
kelSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=KELOLA_SUBTAB_ORDER.indexOf(t); const btn=kelSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('kelolaTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('kelolaTab-transaksi').classList.toggle('u-dnone', t!=='transaksi');
document.getElementById('kelolaTab-pengaturan').classList.toggle('u-dnone', t!=='pengaturan');
const kelBc=document.getElementById('kelolaBreadcrumbSub');
if(kelBc)kelBc.textContent=KELOLA_SUBTAB_LABEL[t]||t;
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 5/6: fungsi prediktif domain FINANCE.
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. "Inventory" (baris §4
// dokumen) SENGAJA DI-SKIP sesi ini (keputusan eksplisit: dikerjakan
// Finance/Asset/Vehicle dulu) — TIDAK ada stockPrediction/deadStockDetector/
// restockRecommendation di sini atau di modul manapun sesi ini.
//
// Ketiga fungsi di bawah SENGAJA tidak menduplikasi computeCashflowForecast()
// di atas (rata-rata income/expense N bulan terakhir dari BudgetReko, kalau
// ada) — mereka MEMBUNGKUS hasilnya jadi proyeksi bulan-demi-bulan ke DEPAN.
// Rule-based & gratis (rata-rata historis flat, bukan panggilan AI/ML),
// konsisten dgn gaya estimateKmPerDay/estimateRpPerKm (vehicle-core.js).
// PURE/read-only — TIDAK PERNAH memanggil save() atau menulis ke D. Belum
// ada UI/tombol baru, belum ada wiring otomatis (itu tugas Sesi 6).
// ---------------------------------------------------------------------------

// _predictMonthlySeries(startAmount, monthsAhead) — helper internal: bangun
// array {month:'YYYY-MM', amount} unt N bulan ke depan (bulan berjalan+1..+N)
// dgn nilai flat (rata-rata historis diasumsikan konstan). Dipakai oleh
// predictIncome/predictExpense di bawah supaya bentuk outputnya konsisten.
function _predictMonthlySeries(amount,monthsAhead){
const out=[];
const now=new Date();
for(let i=1;i<=monthsAhead;i++){
const d=new Date(now.getFullYear(),now.getMonth()+i,1);
out.push({month:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),amount});
}
return out;
}

// predictIncome({monthsAhead}) — proyeksi pemasukan N bulan ke depan, dari
// rata-rata pemasukan historis (incAvg, computeCashflowForecast()). Balikin
// {ok:false} kalau computeCashflowForecast belum dimuat (guard urutan load).
function predictIncome({monthsAhead=3}={}){
if(typeof computeCashflowForecast!=='function')return{ok:false,reason:'computeCashflowForecast belum dimuat'};
const cf=computeCashflowForecast();
return{ok:true,monthlyAvg:cf.incAvg,basedOnMonths:cf.months,months:_predictMonthlySeries(cf.incAvg,monthsAhead)};
}

// predictExpense({monthsAhead}) — sama seperti predictIncome, tapi dari
// rata-rata pengeluaran historis (expAvg). billsDue (tagihan jatuh tempo
// 30 hari ke depan) TIDAK dimasukkan ke sini (itu bagian predictCashflow()
// di bawah, biar predictExpense murni cerminan pola pengeluaran historis).
function predictExpense({monthsAhead=3}={}){
if(typeof computeCashflowForecast!=='function')return{ok:false,reason:'computeCashflowForecast belum dimuat'};
const cf=computeCashflowForecast();
return{ok:true,monthlyAvg:cf.expAvg,basedOnMonths:cf.months,months:_predictMonthlySeries(cf.expAvg,monthsAhead)};
}

// predictCashflow({monthsAhead}) — proyeksi saldo akun bulan-demi-bulan ke
// depan: mulai dari saldoNow (computeCashflowForecast()), tiap bulan
// ditambah incAvg dikurang expAvg; billsDue (tagihan jatuh tempo 30 hari
// ke depan, sudah dihitung computeCashflowForecast()) dikurangkan HANYA di
// bulan pertama (sesuai jendela 30 hari-nya) supaya tidak dobel-hitung di
// bulan-bulan berikutnya.
function predictCashflow({monthsAhead=3}={}){
if(typeof computeCashflowForecast!=='function')return{ok:false,reason:'computeCashflowForecast belum dimuat'};
const cf=computeCashflowForecast();
const monthlyNet=cf.incAvg-cf.expAvg;
let saldo=cf.saldoNow;
const months=[];
const now=new Date();
for(let i=1;i<=monthsAhead;i++){
saldo+=monthlyNet;
if(i===1)saldo-=cf.billsDue;
const d=new Date(now.getFullYear(),now.getMonth()+i,1);
months.push({month:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),income:cf.incAvg,expense:cf.expAvg,saldoProjected:saldo});
}
return{ok:true,saldoNow:cf.saldoNow,monthlyNet,billsDue:cf.billsDue,basedOnMonths:cf.months,months,projectedEnd:saldo};
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 7: rule domain FINANCE pertama utk AIDecision
// (lihat RENCANA-SESI-RINGKAS.md — "Status nyata setelah Sesi 6": bus sudah
// hidup dari Sesi 6 tapi AIDecision.rules._rules masih kosong). Rule ini:
// "pengeluaran bulan berjalan > X% dari rata-rata pengeluaran computeCashflow-
// Forecast()". X BISA DIATUR user (bukan hardcode) lewat
// D.profile.aiFinanceOverspendThresholdPct, field baru di Pengaturan > 🤖 AI
// Asisten (default 150 = 1.5x rata-rata).
// TIDAK menduplikasi FinCoach (modules-calc.js) — FinCoach itu insight instan
// di Dashboard (tidak dipersist). Rule ini masuk decisionLog lewat
// AIDecision.decide() supaya muncul juga di AIService.dailyBriefing()/.simulate().
// Additive murni: TIDAK mengubah computeCashflowForecast/predict* di atas.
// ---------------------------------------------------------------------------
const AI_FINANCE_OVERSPEND_DEFAULT_PCT=150;

// getAIFinanceOverspendThreshold()/setAIFinanceOverspendThreshold(pct) —
// getter/setter D.profile.aiFinanceOverspendThresholdPct, dipakai field
// Pengaturan (renderSettings()/autoSaveProfile() di modules-render.js /
// profil-pengaturan.js) & rule di bawah. Minimum dipaksa 100 (di bawah itu
// rule akan selalu trigger begitu ada pengeluaran sama sekali).
function getAIFinanceOverspendThreshold(){
const v=D.profile&&D.profile.aiFinanceOverspendThresholdPct;
return(typeof v==='number'&&v>=100)?v:AI_FINANCE_OVERSPEND_DEFAULT_PCT;
}
function setAIFinanceOverspendThreshold(pct){
const n=parseInt(pct,10);
D.profile.aiFinanceOverspendThresholdPct=(Number.isFinite(n)&&n>=100)?n:AI_FINANCE_OVERSPEND_DEFAULT_PCT;
return D.profile.aiFinanceOverspendThresholdPct;
}

// _financeOverspendCheck() — helper dipakai condition() & action() rule di
// bawah supaya angka yang dievaluasi & yang ditampilkan di message konsisten
// (satu sumber hitung, tidak dihitung ulang beda cara di 2 tempat).
function _financeOverspendCheck(){
if(typeof computeCashflowForecast!=='function')return{trigger:false};
const cf=computeCashflowForecast();
if(!cf.expAvg||cf.expAvg<=0)return{trigger:false};
const now=new Date();
const monthExpense=(D.transactions||[]).filter(t=>{
if(t.type!=='expense')return false;
const d=new Date(t.date);
return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
}).reduce((s,t)=>s+t.amount,0);
const thresholdPct=getAIFinanceOverspendThreshold();
const pct=Math.round((monthExpense/cf.expAvg)*100);
return{trigger:pct>thresholdPct,monthExpense,expAvg:cf.expAvg,pct,thresholdPct};
}

// ---------------------------------------------------------------------------
// Rule kedua FINANCE (keputusan produk dikonfirmasi user): 'finance-low-balance'
// — saldo total akun (totalSaldoAkun(), akun.js) jatuh di bawah X kali
// rata-rata pengeluaran bulanan (computeCashflowForecast().expAvg). Ambang X
// (default 0.5) BISA DIATUR user (pola sama dgn getAIFinanceOverspendThreshold
// di atas / getAIDeliveryThinMarginThreshold Sesi 9) lewat
// D.profile.aiFinanceLowBalanceMultiplier, field baru di Pengaturan > 🤖 AI
// Asisten. _financeLowBalanceCheck() dipisah dari _financeOverspendCheck()
// krn beda sumber data (saldo akun, bukan pengeluaran bulan berjalan) —
// tidak menduplikasi hitungan yang sama.
// ---------------------------------------------------------------------------
const AI_FINANCE_LOW_BALANCE_DEFAULT_MULTIPLIER=0.5;

// getAIFinanceLowBalanceMultiplier()/setAIFinanceLowBalanceMultiplier(mult) —
// getter/setter D.profile.aiFinanceLowBalanceMultiplier, dipakai field
// Pengaturan (renderSettings()/autoSaveProfile()) & rule di bawah. Dijaga
// di rentang 0.1-2 (di luar itu rule jadi tidak berguna: <=0 selalu trigger,
// >2 nyaris tidak pernah trigger untuk kondisi wajar).
function getAIFinanceLowBalanceMultiplier(){
const v=D.profile&&D.profile.aiFinanceLowBalanceMultiplier;
return(typeof v==='number'&&v>=0.1&&v<=2)?v:AI_FINANCE_LOW_BALANCE_DEFAULT_MULTIPLIER;
}
function setAIFinanceLowBalanceMultiplier(mult){
const n=parseFloat(mult);
D.profile.aiFinanceLowBalanceMultiplier=(Number.isFinite(n)&&n>=0.1&&n<=2)?n:AI_FINANCE_LOW_BALANCE_DEFAULT_MULTIPLIER;
return D.profile.aiFinanceLowBalanceMultiplier;
}

function _financeLowBalanceCheck(){
if(typeof totalSaldoAkun!=='function'||typeof computeCashflowForecast!=='function')return{trigger:false};
const cf=computeCashflowForecast();
if(!cf.expAvg||cf.expAvg<=0)return{trigger:false};
const saldo=totalSaldoAkun();
const multiplier=getAIFinanceLowBalanceMultiplier();
return{trigger:saldo<cf.expAvg*multiplier,saldo,expAvg:cf.expAvg,multiplier};
}

let _financeAIRulesRegistered=false;
// registerFinanceAIRules() — dipanggil sekali saat boot (init() di
// self-test.js, persis setelah AIService.wireEvents() — lihat komentar di
// sana). Idempotent lewat guard _financeAIRulesRegistered supaya aman kalau
// termanggil dobel. Return false (bukan throw) kalau AIDecision belum ada
// (mis. urutan load lain di test) — sama pola dgn guard fungsi lain di file
// ini (typeof computeCashflowForecast!=='function').
function registerFinanceAIRules(){
if(_financeAIRulesRegistered)return false;
if(typeof AIDecision==='undefined'||!AIDecision.rules||typeof AIDecision.rules.register!=='function')return false;
AIDecision.rules.register({
id:'finance-overspend-month',
category:'finance',
severity:'warning',
weight:5,
cooldownHours:24,
description:'Pengeluaran bulan berjalan melebihi ambang % dari rata-rata pengeluaran (computeCashflowForecast).',
condition:()=>_financeOverspendCheck().trigger,
action:()=>{
const c=_financeOverspendCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Pengeluaran bulan ini sudah ${fmt(c.monthExpense)} (${c.pct}% dari rata-rata ${fmt(Math.round(c.expAvg))}/bulan, ambang ${c.thresholdPct}%).`};
},
});
AIDecision.rules.register({
id:'finance-low-balance',
category:'finance',
severity:'warning',
weight:4,
cooldownHours:24,
description:'Saldo total akun (totalSaldoAkun) di bawah X kali rata-rata pengeluaran bulanan (computeCashflowForecast().expAvg, X bisa diatur user).',
condition:()=>_financeLowBalanceCheck().trigger,
action:()=>{
const c=_financeLowBalanceCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Saldo total akun cuma ${fmt(c.saldo)}, di bawah ${c.multiplier}x rata-rata pengeluaran bulanan (${fmt(Math.round(c.expAvg))}).`};
},
});
_financeAIRulesRegistered=true;
return true;
}
