// Fungsi render (85 fungsi) dipisah dari app_production.html untuk pemerataan ukuran file.
// Dipindah ke modules/shared/modules-render.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Semua fungsi ini murni definisi function global (bukan module), jadi tetap bisa dipanggil dari file manapun
// yang loadnya belakangan (sama seperti modules-calc.js/features-*.js).
// Audit ukuran file (lanjutan S589/s644 aset.js & business-flow-presenter.js): file ini
// dipecah jadi 2 supaya di bawah OVERSIZED_FILE_LINE_THRESHOLD (1600 baris). Lanjutannya
// (renderDashboard()/renderKeuangan()/renderLaporan()/renderVehicleManageList() dkk, dari
// runDeferredOrNow() sampai akhir file lama) dipindah ke modules/shared/modules-render-b.js.
// TIDAK butuh Object.assign mixin (beda dari aset.js/business-flow-presenter.js) karena
// semua isinya fungsi global (function foo(){...}) yang otomatis nempel ke scope global
// begitu file-nya di-load -- urutan load modules-render.js lalu modules-render-b.js
// (lihat scripts/build.js GROUP_A) cukup supaya semuanya tetap saling bisa panggil.
const MODULE_RENDER_VERSION='s615-fix-investasi-render-crash-and-ghost-migration';

function renderPageContent(name){
// KW perf fix: jaring pengaman selain hook di save() -- pastikan cache saldo akun juga fresh
// tiap ganti halaman/refresh page penuh (mis. showPage(), restore data), bukan cuma tiap save().
if(typeof invalidateAccBalCache==='function')invalidateAccBalCache();
if(typeof invalidateCashflowForecastCache==='function')invalidateCashflowForecastCache();
if(typeof FinanceIntelligence!=='undefined'&&typeof FinanceIntelligence.invalidateCache==='function')FinanceIntelligence.invalidateCache();
if(name==='dashboard')renderDashboard();
if(name==='dashboard-hub'&&typeof DashboardHub!=='undefined')DashboardHub.render();
if(name==='keuangan'){
populateKeuFilters();loadKeuFilterPrefsIntoDOM();renderKeuangan();renderBillList();
const lapTab=document.getElementById('keuanganTab-laporan');
if(lapTab&&lapTab.style.display!=='none'){populateCatFilter();populateAccFilters();renderLaporan();}
}
if(name==='shop'){renderShopRecent();renderProductList();renderShop();if(typeof Kasir!=='undefined')Kasir.render();}
if(name==='laporan'){populateCatFilter();populateAccFilters();renderLaporan();}
if(name==='carnotes'){renderVehicleSelect();renderCnTab();}
if(name==='ai')initChat();
if(name==='pajak')renderPajakZakat();
if(name==='aset'){
renderAssetList();AlokasiAset.init();renderWealthSnapshots();
// Property/Rental Management, Asset Portfolio, Asset Maintenance (S101-104)
// — DIPINDAH dari DashboardHub.render() (dashboard-hub.js) ke sini, pola
// sama Sesi 133 Finance/Vehicle (renderKeuangan()/renderCnTab()). 100%
// reuse presenter yang sama, container-nya sekarang di tab "Manajemen"
// #page-aset (lihat index.html).
if(typeof PropertyManagementPresenter!=='undefined')PropertyManagementPresenter.render();
if(typeof RentalManagementPresenter!=='undefined')RentalManagementPresenter.render();
if(typeof AssetPortfolioPresenter!=='undefined')AssetPortfolioPresenter.render();
if(typeof AssetMaintenancePresenter!=='undefined')AssetMaintenancePresenter.render();
// Investasi (S466, Fase 1 BUG-INV-001 Opsi 3) — dipanggil di sini SEKALI tiap
// #page-aset dibuka (sama pola presenter Manajemen di atas), TERLEPAS dari tab mana
// yang lagi aktif -- konsisten dgn komentar lama di file ini "Semua card di dalam
// pane tetap dirender penuh...TERLEPAS dari tab mana yang lagi aktif" (lihat
// setAsetTab() di aset.js). setAsetTab('investasi') JUGA memanggil ulang render()
// ini saat tab-nya benar2 dibuka (fresh data), jadi pemanggilan ganda di sini aman
// & murah (render() murni baca D.investments, 0 side-effect).
if(typeof InvestmentListUI!=='undefined')InvestmentListUI.render();
}
if(name==='settings'){renderSettings();renderBillList();}
}

function renderAccGrid(){
const el=document.getElementById('accGrid');
if(!el)return;
// BARU (permintaan user): tampilkan ringkasan Total Saldo Akun di kartu "🏦 Akun & Metode
// Pembayaran" pada Pengaturan > Keuangan -- sebelumnya kartu ini cuma daftar per-akun tanpa
// total, padahal total-nya sudah dihitung di tempat lain (Dashboard/Laporan) lewat
// totalSaldoAkun()/recalcAccBalance() yang sama, jadi 100% REUSE, 0 rumus baru. Guard
// getElementById null krn accGridTotal/accGridTotalWrap cuma ada di halaman Pengaturan
// (renderAccGrid() juga dipanggil dari page lain yang tidak punya elemen ini).
const totalEl=document.getElementById('accGridTotal');
const totalSubEl=document.getElementById('accGridTotalSub');
if(totalEl){
const t=totalSaldoAkun();
totalEl.textContent=(t<0?'-':'')+fmt(Math.abs(t));
totalEl.className='stat-val '+(t<0?'red':'green');
}
if(totalSubEl){
const linked=linkedAssetAccountIds();
const counted=D.accounts.filter(a=>a.includeInBalance!==false&&!linked.has(String(a.id))).length;
totalSubEl.textContent=counted+' dari '+D.accounts.length+' akun dihitung';
}
// Ownership Filter UI (S235) — reuse OwnershipEngine.filterByType() apa adanya, TIDAK ada
// filter/logic baru. HANYA memfilter daftar yang DIRENDER di grid; accGridTotal/
// accGridTotalSub di atas TETAP dihitung dari D.accounts penuh (Jangan mengubah
// perhitungan). "Semua"/elemen filter belum ada (halaman lain yg juga panggil
// renderAccGrid() tanpa elemen ini) -> tampilkan semua apa adanya (fallback aman).
const accOwnFilterEl=document.getElementById('accOwnFilter');
const accOwnFilterVal=accOwnFilterEl?accOwnFilterEl.value:'ALL';
let accGridList=D.accounts;
if(accOwnFilterVal&&accOwnFilterVal!=='ALL'&&typeof OwnershipEngine!=='undefined'){
const accOwnFiltered=OwnershipEngine.filterByType(accGridList,accOwnFilterVal);
if(accOwnFiltered.ok)accGridList=accOwnFiltered.items;
// Filter Kepemilikan "1 SOT" (patch delacc-titipan-debt susulan): filterByType()
// di atas MURNI baca acc.ownership (badge manual) apa adanya -- 100% REUSE apa
// adanya (0 logic filter baru di engine generik itu, dipakai domain lain juga,
// mis. Kendaraan baris ~1542). Fix HANYA di titik pakai akun ini: kalau user
// pilih filter "SELF" (Milik Sendiri), akun yang porsi REAL-nya non-SELF tapi
// badge-nya masih DEFAULT (belum diklasifikasi -- lihat resolveAccOwnershipBadgeState()
// di akun.js & ownBadgeState di bawah) DIKELUARKAN dari hasil filter SELF --
// menampilkannya sebagai "Milik Sendiri" menyesatkan padahal porsi aslinya
// bukan 100% milik sendiri. Guard typeof resolveAccOwnershipBadgeState aman
// kalau akun.js belum dimuat (0 filter berubah, fallback ke perilaku lama).
if(accOwnFilterVal==='SELF'&&typeof resolveAccOwnershipBadgeState==='function'){
accGridList=accGridList.filter(a=>!resolveAccOwnershipBadgeState(a.id).mismatch);
}
}
// Gap Badge Titipan (2026-08-14 sesi lanjutan #2, Rekomendasi #3,
// PATCH-NOTES-akun-dana-titipan-sync.md §5): 100% REUSE
// TitipanReconcile.checkAccounts() -- 0 logic gap dihitung ulang di sini.
// Dihitung SEKALI per render (bukan per-kartu) lalu dicocokkan ke tiap akun
// lewat Set id akun yang punya gap. Murni informasi, 0 mutasi ke D. Guard
// typeof TitipanReconcile -- kalau file itu belum dimuat di suatu halaman,
// fallback ke Set kosong (0 badge tampil), tidak error.
const titipanGapAccIds=(()=>{
const s=new Set();
if(typeof TitipanReconcile!=='undefined'&&typeof TitipanReconcile.checkAccounts==='function'){
const res=TitipanReconcile.checkAccounts();
// key berbentuk "accId::ownerId" (lihat _expectedFromAccounts()) -- ambil
// bagian accId saja (split '::' pertama), krn badge di kartu Akun cukup
// tandai per-akun (bukan per-owner).
(res&&res.missing||[]).forEach(m=>{ if(m&&m.key!=null)s.add(String(m.key).split('::')[0]); });
}
return s;
})();
el.innerHTML=accGridList.map((a)=>{
const i=D.accounts.indexOf(a);
const bal=recalcAccBalance(a.id);
const off=a.includeInBalance===false;
// linkedHoldingObj (fix bareng linkedPorsiLine di bawah, skenario "Majoris"): akun
// yang ditautkan LANGSUNG dari Holding Investasi lewat dropdown "🔗 Hubungkan ke
// Akun" (investAccId, investasi-list-view.js, S601-3 -- field `h.accountId`) TIDAK
// pernah kena isAccLinkedToAsset() (fungsi itu HANYA baca D.assets[].accountId,
// beda sumber data dari D.investments[].accountId). Sebelum fix ini kartu Akun utk
// jalur Holding-langsung tidak dianggap `linked` sama sekali -- badge/porsi/hint
// riwayat semuanya 0 tampil, padahal test lama (S566) sudah pakai nama "Majoris"
// utk skenario Aset tertaut yang MESTINYA konsisten juga utk Holding tertaut
// langsung. 100% REUSE findLinkedHoldingForAccount() (transaksi.js, S601-3) --
// guard typeof aman kalau file itu belum dimuat di suatu halaman (0 fungsi baru).
const linkedHoldingObj=(typeof findLinkedHoldingForAccount==='function')?findLinkedHoldingForAccount(a.id):null;
const linked=!off&&(isAccLinkedToAsset(a.id)||!!linkedHoldingObj);
const badge=off?' <span class="u-fs12t2">(off)</span>':(linked?' <span class="u-fs12t2">(via Aset)</span>':'');
let jenisLabel=a.jenis==='dikunci'?'🔒 Dikunci':(a.jenis==='investasi'?'📈 Investasi':'');
if(a.jenis==='investasi'&&a.platform)jenisLabel+=' · '+a.platform;
if(a.jenis==='dikunci'&&a.targetTanggalBuka)jenisLabel+=' · buka '+a.targetTanggalBuka;
const jenisBadge=jenisLabel?` <span class="u-fs12t2">${escapeHtml(jenisLabel)}</span>`:'';
// Ownership Badge (S233) — upgrade dari teks sederhana (S232) jadi badge, reuse class
// "acc-chip" yang SUDAH ADA di project ini (styles.css) — TIDAK ada style baru, TIDAK
// ada layout baru. Data diambil HANYA dari OwnershipEngine.resolve()/label() (0 rumus baru).
// Data lama tanpa field ownership: resolve() fallback ke SELF/DEFAULT.
// Ownership Badge (S233) + Ownership Detail View (S234) — SATU pemanggilan
// OwnershipEngine.resolve(a) dipakai bareng utk badge (label Bahasa Indonesia) DAN detail
// view di bawahnya (kode tipe mentah/TYPE, mis. "SELF") — supaya TIDAK ada logic
// resolve/hitung ulang yang duplikat. Data lama tanpa field ownership: resolve() fallback
// ke SELF/DEFAULT (backward compatible, sama seperti S232/S233).
const ownResolved=(typeof OwnershipEngine!=='undefined')?OwnershipEngine.resolve(a):null;
// badgeState (patch delacc-titipan-debt susulan, "1 SOT badge Kepemilikan &
// Filter vs porsi Holding/acc.owners") -- 100% REUSE resolveAccOwnershipBadgeState()
// (akun.js) baru, 0 rumus baru di sini. Kalau porsi REAL akun ini (Holding
// tertaut/acc.owners eksplisit) non-SELF tapi badge "Kepemilikan" masih DEFAULT
// (belum pernah diklasifikasi manual) -- badge chip generik "Milik Sendiri" yang
// SEBELUM ini tampil itu MENYESATKAN (porsi aslinya bukan 100% milik sendiri).
// Ganti jadi chip peringatan eksplisit (idiom sama titipanGapLine di bawah),
// TIDAK auto-tebak tipe spesifik (INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY) karena
// porsi cuma punya nama pemilik, bukan tipe semantik -- keputusan tipe akhir
// tetap manual lewat dropdown "Kepemilikan" di modal Edit Akun.
const ownBadgeState=(typeof resolveAccOwnershipBadgeState==='function')?resolveAccOwnershipBadgeState(a.id):null;
const ownMismatch=!!(ownBadgeState&&ownBadgeState.mismatch);
const ownText=ownMismatch?' <span class="acc-chip" style="color:var(--accent4)">⚠️ Belum diklasifikasi</span>':(ownResolved?` <span class="acc-chip">${escapeHtml(OwnershipEngine.label(ownResolved.type))}</span>`:'');
const ownDetail=ownResolved?`<div class="u-fs10 u-t2">Ownership<br>${escapeHtml(ownResolved.type)}</div>`:'';
// investDetail (S308) -- field DINAMIS hasil scan layar Detail Portofolio Bibit (Modal
// Investasi/Keuntungan/Harga Beli/Jumlah Unit, lihat UniversalScan.importSelected() di
// modules/shared/scan-ocr.js). MURNI TAMPILAN read-only di sini -- akun tanpa field ini
// (mayoritas: bank/e-wallet biasa) TIDAK menampilkan baris tambahan sama sekali (guard
// a.investDetail null/undefined), jadi 0 perubahan tampilan utk akun yang sudah ada.
const invD=a.investDetail;
const invDetailLine=invD?(()=>{
const parts=[];
if(invD.modal!=null)parts.push('Modal '+fmt(invD.modal));
if(invD.keuntungan!=null)parts.push((invD.keuntungan<0?'Rugi ':'Untung ')+fmt(Math.abs(invD.keuntungan)));
if(invD.jumlahUnit!=null)parts.push(Number(invD.jumlahUnit).toLocaleString('id-ID')+' unit');
return parts.length?`<div class="u-fs11 u-t2" style="margin-top:2px">${escapeHtml(parts.join(' · '))}</div>`:'';
})():'';
// linkedPorsiLine + linkedTxHint (permintaan user: "perjelas aset yang ditautkan
// utk akun transaksi agar menampilkan porsi lengkap dgn riwayat transaksi modal
// total") -- SEBELUM ini, akun berbadge "(via Aset)" cuma nampilin ownText
// generik (mis. "Investor", 1 tipe) & invDetailLine statis dari a.investDetail
// (snapshot hasil scan OCR, TIDAK mencerminkan porsi multi-owner Aset yg
// sebenarnya nautin akun ini). 2 tambahan di bawah PURE UI/read-only, 0 field
// baru, 0 rumus baru -- 100% REUSE MultiOwnerEngine.getOwners() (sama pola
// persis linkMultiOwnerWarn di Aset.openActionsMenu()/aset.js) & aksi klik
// kartu yg SUDAH ADA (data-action="openAccTxHistory" di wrapper div, tidak
// berubah) -- linkedTxHint cuma bikin affordance itu KELIHATAN, bukan bikin
// aksi baru.
const linkedAssetObj=linked?(D.assets||[]).find(x=>String(x.accountId)===String(a.id)):null;
// linkedPorsiLine -- FIX (skenario "Majoris", lanjutan komentar linkedHoldingObj di
// atas): SEBELUM ini baris porsi HANYA baca dari linkedAssetObj (D.assets), jadi
// akun yang tertaut LANGSUNG ke Holding Investasi (linkedHoldingObj, tanpa Aset
// perantara) tidak pernah dapat baris porsi sama sekali -- kelihatan "tidak
// sync" padahal porsinya beneran ada & LIVE di Holding tsb. Prioritas: Holding
// menang kalau ADA (konsisten dgn resolveOwnerDefaultForAccount() di transaksi.js,
// "Holding adalah sumber kebenaran porsi LIVE"), baru fallback ke Aset seperti
// semula -- 100% REUSE Investment.getOwners()/MultiOwnerEngine.getOwners(), 0
// rumus porsi baru.
const linkedPorsiLine=(linked&&linkedHoldingObj)?(()=>{
if(typeof Investment==='undefined')return'';
const owners=Investment.getOwners(linkedHoldingObj);
if(!owners||!owners.length)return'';
const porsiTxt=owners.map(o=>`${escapeHtml(o.ownerName)} (${o.porsi}%)`).join(' · ');
return`<div class="u-fs11 u-t2" style="margin-top:2px">👥 Porsi: ${porsiTxt}</div>`;
})():(linkedAssetObj&&typeof MultiOwnerEngine!=='undefined')?(()=>{
const res=MultiOwnerEngine.getOwners(linkedAssetObj);
if(!res||!res.ok||!res.owners.length)return'';
const porsiTxt=res.owners.map(o=>`${escapeHtml(o.ownerName)} (${o.porsi}%)`).join(' · ');
return`<div class="u-fs11 u-t2" style="margin-top:2px">👥 Porsi: ${porsiTxt}</div>`;
})():'';
// standalonePorsiLine (patch delacc-titipan-debt susulan) -- SEBELUM ini,
// akun BERDIRI-SENDIRI (bukan `linked` ke Aset/Holding, mis. porsi diisi lewat
// modal "⚖️ Atur Porsi Kepemilikan Akun" / AccOwners.save(), akun.js) TIDAK
// PERNAH dapat baris "👥 Porsi:" sama sekali -- linkedPorsiLine di atas cuma
// isi utk akun `linked`. Fallback ini 100% REUSE ownBadgeState.owners (sumber
// 'account' = getAccOwnersRaw(), sudah dihitung di atas utk badge) -- 0 rumus
// porsi baru, cuma tampilkan apa yang sudah dihitung. Guard `!linkedPorsiLine`
// jaga 0 duplikasi kalau akun ini ternyata JUGA linked (linkedPorsiLine sudah
// mengisi lebih dulu, prioritas Holding/Aset tetap menang).
const standalonePorsiLine=(!linkedPorsiLine&&ownBadgeState&&ownBadgeState.source==='account'&&ownBadgeState.owners.length)?(()=>{
const porsiTxt=ownBadgeState.owners.map(o=>`${escapeHtml(o.ownerName)} (${o.porsi}%)`).join(' · ');
return`<div class="u-fs11 u-t2" style="margin-top:2px">👥 Porsi: ${porsiTxt}</div>`;
})():'';
const linkedTxHint=linked?'<div class="u-fs10 u-t2" style="margin-top:2px">📜 Ketuk kartu untuk riwayat transaksi modal</div>':'';
// titipanGapLine (sesi lanjutan #2, Rekomendasi #3) -- murni informasi, 0
// tombol/aksi baru, 0 mutasi ke D. Hanya tampil utk akun berdiri-sendiri
// (bukan `linked` ke Aset -- itu sudah otomatis sync via cabang lain,
// lihat komentar _expectedFromAccounts()) yang ada di titipanGapAccIds.
const titipanGapLine=(!linked&&titipanGapAccIds.has(String(a.id)))?'<div class="u-fs11" style="margin-top:2px;color:var(--accent4)">⚠️ Porsi titipan belum sinkron ke Dana Titipan</div>':'';
return`<div class="acc-card" style="${off?'opacity:.55':''}" data-action="openAccTxHistory" data-args="${escapeHtml(JSON.stringify([a.id]))}">
      <button class="acc-card-edit" data-stop="1" data-action="openAccModal" data-args="${escapeHtml(JSON.stringify([i]))}" title="Edit" aria-label="Edit">✏️</button>
      <button class="acc-card-del" data-stop="1" data-action="delAcc" data-args="${escapeHtml(JSON.stringify([i]))}" aria-label="Hapus">🗑</button>
      <div class="acc-card-icon">${a.emoji}</div>
      <div class="acc-card-name">${escapeHtml(a.name)}${badge}${jenisBadge}${ownText}</div>
      ${ownDetail}
      ${invDetailLine}
      ${linkedPorsiLine}
      ${standalonePorsiLine}
      ${linkedTxHint}
      ${titipanGapLine}
      <div class="acc-card-bal ${bal<0?'red':'green'}">${bal<0?'-':''}${fmt(Math.abs(bal))}</div>
    </div>`;
}).join('');
}

function renderDashAccList(){
const el=document.getElementById('dashAccList');
if(!el)return;
if(!D.accounts.length){el.innerHTML='<div class="empty"><div class="empty-text">Belum ada akun</div></div>';return;}
const visible=D.accounts.filter(a=>a.includeInBalance!==false);
el.innerHTML=(visible.length?visible:D.accounts).map(a=>{
const bal=recalcAccBalance(a.id);
return`<div class="aset-item"><div class="tx-icon u-bgaccsoft">${a.emoji}</div><div class="tx-info"><div class="tx-name">${escapeHtml(a.name)}</div></div><div class="tx-amount ${bal<0?'red':'green'}">${bal<0?'-':''}${fmt(Math.abs(bal))}</div></div>`;
}).join('');
const tEl=document.getElementById('dashAccTotal');
if(tEl){const t=totalSaldoAkun();tEl.textContent=(t<0?'-':'')+fmt(Math.abs(t));tEl.className='stat-val '+(t<0?'red':'green');}
}

function renderLapAccList(){
const el=document.getElementById('lapAccList');
if(!el)return;
if(!D.accounts.length){el.innerHTML='<div class="empty"><div class="empty-text">Belum ada akun</div></div>';return;}
el.innerHTML=D.accounts.map(a=>{
const bal=recalcAccBalance(a.id);
const off=a.includeInBalance===false;
const linked=!off&&isAccLinkedToAsset(a.id);
const badge=off?' <span class="u-fs12t2">(tidak dihitung)</span>':(linked?' <span class="u-fs12t2">(sudah dihitung via 📋 Buku Aset)</span>':'');
return`<div class="aset-item" style="${off?'opacity:.5':''};cursor:pointer" data-action="quickToggleInclude" data-args="${escapeHtml(JSON.stringify([a.id]))}">
      <div class="tx-icon u-bgaccsoft">${a.emoji}</div>
      <div class="tx-info"><div class="tx-name">${escapeHtml(a.name)}${badge}</div></div>
      <div class="tx-amount ${bal<0?'red':'green'}">${bal<0?'-':''}${fmt(Math.abs(bal))}</div>
    </div>`;
}).join('');
const tEl=document.getElementById('lapAccTotal');
if(tEl){const t=totalSaldoAkun();tEl.textContent=(t<0?'-':'')+fmt(Math.abs(t));tEl.className='stat-val '+(t<0?'red':'green');}
}

function renderReceiptInsight(amt,catName,guessedCat){
const el=document.getElementById('txScanInsight');
if(!el)return;
if(!amt||!catName){el.style.display='none';el.innerHTML='';return;}
const lines=[];
lines.push(`<div class="u-fw700 u-mb4">💡 Insight Otomatis</div>`);
lines.push(`<div>${guessedCat?guessedCat.emoji||'📦':'📦'} Kategori terdeteksi: <b>${escapeHtml(catName)}</b></div>`);
const hist=(D.transactions||[]).filter(t=>t.type==='expense'&&t.category&&t.category.trim().toLowerCase()===catName.trim().toLowerCase());
if(hist.length){
const avg=hist.reduce((s,t)=>s+t.amount,0)/hist.length;
const diffPct=avg>0?Math.round(((amt-avg)/avg)*100):0;
if(Math.abs(diffPct)<8){
lines.push(`<div>📊 Sekitar rata-rata belanja kategori ini (${fmt(avg)}/transaksi, dari ${hist.length}x catatan).</div>`);
}else if(diffPct>0){
lines.push(`<div>📈 <b>${diffPct}% lebih tinggi</b> dari rata-rata belanja kategori ini (${fmt(avg)}/transaksi, dari ${hist.length}x catatan).</div>`);
}else{
lines.push(`<div>📉 <b>${Math.abs(diffPct)}% lebih rendah</b> dari rata-rata belanja kategori ini (${fmt(avg)}/transaksi, dari ${hist.length}x catatan).</div>`);
}
}else{
lines.push(`<div>🆕 Ini catatan pertama untuk kategori ini.</div>`);
}
const fakeTx={type:'expense',category:catName,subcategory:(document.getElementById('txSubCat')?document.getElementById('txSubCat').value.trim():''),amount:amt};
const matchedBudgets=(D.budgets||[]).filter(b=>budgetMatchesTx(b,fakeTx));
matchedBudgets.forEach(b=>{
const used=getBudgetUsed(b);
const lim=getBudgetEffectiveLimit(b);
const projected=used+amt;
const sisaAfter=lim-projected;
const pctAfter=lim>0?Math.round((projected/lim)*100):0;
if(sisaAfter<0){
lines.push(`<div>🚨 Anggaran "<b>${escapeHtml(b.name)}</b>" akan <b>lewat ${fmt(Math.abs(sisaAfter))}</b> kalau transaksi ini disimpan (${pctAfter}% terpakai).</div>`);
}else if(pctAfter>=80){
lines.push(`<div>⚠️ Anggaran "<b>${escapeHtml(b.name)}</b>" akan terpakai <b>${pctAfter}%</b>, sisa ${fmt(sisaAfter)}.</div>`);
}else{
lines.push(`<div>✅ Anggaran "<b>${escapeHtml(b.name)}</b>" masih aman, sisa ${fmt(sisaAfter)} (${pctAfter}% terpakai).</div>`);
}
});
el.innerHTML=lines.join('');
el.style.display='block';
}


function renderPajakRekomendasi(applyOpen){
const card=document.getElementById('pajakRekomendasiCard'),txt=document.getElementById('pajakRekomendasiText');
if(!card||!txt)return;
const status=D.profile&&D.profile.statusPekerjaan;
const umkmDetails=document.getElementById('umkmDetails');
if(!status){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
if(status==='karyawan'){
txt.innerHTML='💡 Status kerjamu <b>Karyawan</b> — pakai kalkulator <b>🧾 Estimasi PPh 21</b> di bawah. Kalkulator PPh Final UMKM bisa diabaikan kecuali ada usaha sampingan.';
if(applyOpen&&umkmDetails)umkmDetails.open=false;
} else if(status==='freelance'){
txt.innerHTML='💡 Status kerjamu <b>Freelance/UMKM</b> — pakai kalkulator <b>🏪 Pajak Bisnis Shop (UMKM)</b> di bawah (PPh Final 0,5% dari omzet). Kalkulator PPh 21 untuk skema karyawan bisa diabaikan.';
if(applyOpen&&umkmDetails)umkmDetails.open=true;
} else {
txt.innerHTML='💡 Kamu punya penghasilan <b>Karyawan & usaha sendiri</b> — cek dua-duanya: <b>PPh 21</b> untuk gaji, <b>PPh Final UMKM</b> untuk omzet usaha.';
if(applyOpen&&umkmDetails)umkmDetails.open=true;
}
}

function renderCatList(){
const el=document.getElementById('catList');if(!el)return;
let types=curCatFilter==='semua'?['income','expense']:[curCatFilter];
let html='';
types.forEach(type=>{
D.categories[type].forEach((c,idx)=>{
const hasSubs=c.subs&&c.subs.length>0;
html+=`<div class="cat-group">
        <div class="cat-group-head">
          ${hasSubs?`<span class="cat-group-toggle" id="arrow_${c.id}" data-action="toggleCatGroup" data-args="${escapeHtml(JSON.stringify([c.id]))}" role="button" tabindex="0" aria-label="Tampilkan/sembunyikan subkategori ${escapeHtml(c.name)}">▶</span>`:'<span style="width:11px;display:inline-block"></span>'}
          <div class="cat-emoji" data-action="openCatModal" data-args="${escapeHtml(JSON.stringify([idx, type]))}" aria-label="Edit kategori ${escapeHtml(c.name)}">${c.emoji}</div>
          <div class="cat-name" data-action="openCatModal" data-args="${escapeHtml(JSON.stringify([idx, type]))}">${escapeHtml(c.name)}</div>
          <span class="cat-type-badge ${type==='income'?'cat-type-in':'cat-type-out'}">${type==='income'?'Masuk':'Keluar'}</span>
          <button class="tx-del" data-action="openSubCatModal" data-args="${escapeHtml(JSON.stringify([c.id, type]))}" title="Tambah subkategori" aria-label="Tambah subkategori">➕</button>
          <button class="tx-del" data-action="delCat" data-args="${escapeHtml(JSON.stringify([c.id, type]))}" aria-label="Hapus">🗑</button>
        </div>
        ${hasSubs?`<div class="cat-sub-list" id="subs_${c.id}">${c.subs.map(s=>`<div class="cat-sub-item"><span class="u-fs12 u-ctext3">↳</span><div class="cat-sub-name u-pointer" data-action="openSubCatModal" data-args="${escapeHtml(JSON.stringify([c.id, type, s.id]))}" title="Edit subkategori" aria-label="Edit subkategori ${escapeHtml(s.name)}">${escapeHtml(s.name)}</div><button class="tx-del" data-action="delSubCat" data-args="${escapeHtml(JSON.stringify([c.id, type, s.id]))}" aria-label="Hapus">🗑</button></div>`).join('')}</div>`:''}
      </div>`;
});
});
el.innerHTML=html||'<div class="empty"><div class="empty-text">Belum ada kategori</div></div>';
}

// findFallbackBillPaymentTxIdsForActiveBill(bill, transactions) -- FIX ringkas
// (audit s306 saran #1, dikerjakan s310): findFallbackBillPaymentTxId()
// (s304, tagihan-kalender.js) cuma didesain utk tagihan yang SUDAH lunas/
// diarsip (1 completedAt tunggal -> pilih 1 kandidat tanggal-terdekat).
// Tagihan AKTIF (belum diarsip) beda -- punya BANYAK periode pembayaran
// (tiap bulan/minggu), jadi tidak ada "1 completedAt" buat jadi acuan jarak
// tanggal. Fungsi murni ini pakai strategi lebih sederhana yang cocok utk
// kasus ini: kembalikan SEMUA transaksi expense yang belum bertaut ke bill
// manapun, nominal cocok b.amount, & catatan menyebut nama tagihan ini --
// bukan cuma 1 kandidat. Dipakai renderBillHistory() supaya transaksi lama
// (dicatat manual sebelum billLinkId ada) tidak hilang diam-diam dari
// "📋 Riwayat Pembayaran" tagihan aktif (beda dari kasus arsip yang sudah
// dilaporkan user & diperbaiki s304 lewat toast error -- di sini transaksi
// cuma hilang tanpa jejak sama sekali, makanya perlu ditangani di titik
// render, bukan di titik "gagal edit" seperti arsip).
function findFallbackBillPaymentTxIdsForActiveBill(bill,transactions){
if(!bill||!bill.name)return[];
const nameLower=String(bill.name).toLowerCase();
return (transactions||[]).filter(t=>t.type==='expense'&&!t.billLinkId&&Math.abs((t.amount||0)-(bill.amount||0))<1&&t.note&&String(t.note).toLowerCase().includes(nameLower)).map(t=>t.id);
}
function renderBillHistory(){
if(curBillHistoryId==null)return;
const modal=document.getElementById('billHistoryModal');
if(!modal||!modal.classList.contains('open'))return;
const activeBill=D.bills.find(x=>x.id===curBillHistoryId);
const b=activeBill||(D.billsArchive||[]).find(x=>x.id===curBillHistoryId);
const subEl=document.getElementById('billHistorySub');
const listEl=document.getElementById('billHistoryList');
if(!listEl)return;
// Self-healing (saran #1 s306, fix s310) -- KHUSUS tagihan AKTIF (billsArchive
// punya jalur self-heal sendiri lewat findFallbackBillPaymentTxId() di
// openBillPaymentDateEdit, tidak disentuh di sini). Ditautkan langsung
// (bukan cuma tampil sekali) supaya jalur sync 2 arah normal berlaku mulai
// saat itu, pola sama seperti fallback arsip.
let healedCount=0;
if(activeBill){
const fallbackIds=findFallbackBillPaymentTxIdsForActiveBill(activeBill,D.transactions);
if(fallbackIds.length){
fallbackIds.forEach(txId=>{
const t=D.transactions.find(x=>x.id===txId);
if(t&&!t.billLinkId){t.billLinkId=curBillHistoryId;healedCount++;}
});
if(healedCount&&typeof save==='function')save();
}
}
const rows=D.transactions.filter(t=>t.billLinkId===curBillHistoryId).sort((a,b2)=>new Date(b2.date)-new Date(a.date));
const lunasTag=activeBill?'':' · ✅ Lunas';
const healedTag=healedCount?` · 🔗 ${healedCount} transaksi lama otomatis ditautkan`:'';
if(subEl)subEl.textContent=b?`${b.name} · ${rows.length}x pembayaran tercatat${lunasTag}${healedTag}`:`${rows.length}x pembayaran tercatat${healedTag}`;
if(!rows.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada riwayat pembayaran</div></div>';
return;
}
listEl.innerHTML=rows.map(t=>{
const d=new Date(t.date);
return`<div class="bill-item">
      <div class="tx-icon u-bgaccsoft">💸</div>
      <div class="tx-info">
        <div class="tx-name">${d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</div>
        <div class="tx-meta">${escapeHtml(t.note||'-')}</div>
      </div>
      <div class="tx-amount red">${fmt(t.amount)}</div>
      <div class="u-flex u-fdcol u-gap4 u-ml4">
        <button class="tx-del u-cacc" data-action="editBillHistoryTx" data-args="${escapeHtml(JSON.stringify([t.id]))}" title="Edit" aria-label="Edit">✏️</button>
      </div>
    </div>`;
}).join('');
}

// s325: HTML tombol arsip (Riwayat/Edit/Hapus) DISATUKAN di sini supaya tidak ada lagi
// 2 tempat terpisah yang bisa drift (lihat bill-archive-actionbtn-parity.test.js). Semua
// kind (tagihan/cicilan/langganan) & semua status lunas WAJIB dapat 3 tombol yang sama --
// termasuk kasus cicilan tenor 1x "Bayar Bulan Depan" yang langsung ke-archive tanpa
// pernah tampil di list utama (laporan user, lihat CHANGELOG s325).
function billArchiveActionButtonsHtml(id){
return`<div class="u-flex u-fdcol u-gap4 u-ml4">
      <button class="tx-del u-cacc3" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([id]))}" title="Riwayat Pembayaran" aria-label="Riwayat Pembayaran">📋</button>
      <button class="tx-del u-bgaccsoft u-cacc" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([id]))}" title="Edit" aria-label="Edit">✏️</button>
      <button class="tx-del" data-action="delBillArchive" data-args="${escapeHtml(JSON.stringify([id]))}" title="Hapus dari Arsip" aria-label="Hapus dari Arsip">🗑</button>
    </div>`;
}

function renderBillArchive(){
const listEl=document.getElementById('billArchiveList');
if(!listEl)return;
const rows=[...(D.billsArchive||[])].sort((a,b)=>new Date(b.completedAt||0)-new Date(a.completedAt||0));
const icons={tagihan:'🧾',cicilan:'💳',langganan:'🔁'};
if(!rows.length){
listEl.innerHTML='<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">Belum ada cicilan/tagihan yang lunas</div></div>';
return;
}
listEl.innerHTML=rows.map(b=>`<div class="bill-item">
    <div class="tx-icon u-bgaccsoft">${icons[b.kind]||'✅'}</div>
    <div class="tx-info">
      <div class="tx-name">${escapeHtml(b.name)}</div>
      <div class="tx-meta">Lunas ${b.completedAt?new Date(b.completedAt).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'-'}${b.tenor?` · ${b.tenor}x cicilan`:''}</div>
    </div>
    ${billArchiveActionButtonsHtml(b.id)}
  </div>`).join('');
}

function renderBillList(){
const targets=['billList','billListKeu'].map(id=>document.getElementById(id)).filter(Boolean);
if(!targets.length)return;
populateBillFilterOptions();
// FIX (user report + Screenshot 2026-07-31): sinkronkan billFilterBulan/Tahun ke bulan berjalan
// SEBELUM combined difilter di bawah -- lihat komentar lengkap di initBillStatMonthDefault()
// (tagihan-kalender.js). Tanpa ini, render PERTAMA (belum pernah nav ‹›) menyaring dgn
// billFilterBulan masih 'all' walau label besar sudah terlanjur bilang bulan sekarang.
initBillStatMonthDefault();
// S322: sinkronkan dropdown status & tombol tab Bayar/Lunas ke state billFilterStatus tiap
// render (dipanggil dari mana saja: ganti tab, ganti halaman, dsb) supaya UI tidak pernah
// "nyasar" ke kombinasi kontradiktif (mis. tab Bayar aktif tapi dropdown masih di Lunas).
const billStatusSelEl=document.getElementById('billFilterStatus');
if(billStatusSelEl)billStatusSelEl.value=billFilterStatus;
const billTabBayarEl=document.getElementById('billTabBayarBtn'), billTabLunasEl=document.getElementById('billTabLunasBtn');
if(billTabBayarEl)billTabBayarEl.className='type-btn'+(billFilterStatus==='aktif'?' at':'');
if(billTabLunasEl)billTabLunasEl.className='type-btn'+(billFilterStatus==='lunas'?' ai':'');
const icons={tagihan:'🧾',cicilan:'💳',langganan:'🔁'};
const today=new Date();today.setHours(0,0,0,0);
// Lanjutan S322: tagihan/cicilan AKTIF yang sudah dibayar utk periode berjalan (baik pas
// tanggal maupun dibayar di muka/"bayar bulan depan") ditambahkan SEBAGAI ENTRI KEDUA
// (duplikat, _paidPeriodOnly:true) khusus tab Lunas -- entri ASLI-nya (_lunas:false) TETAP
// ada & tetap tampil di tab Bayar seperti biasa (lihat getBillPaidThisPeriodInfo, dipisah
// dari D.billsArchive/_lunas murni karena tagihannya sendiri masih aktif, belum benar2
// selesai/tidak berulang lagi).
const paidPeriodEntries=D.bills.map(b=>({b,info:getBillPaidThisPeriodInfo(b,billFilterBulan,billFilterTahun)})).filter(x=>x.info).map(({b,info})=>({...b,_lunas:true,_paidPeriodOnly:true,_dateForFilter:info.date.toISOString().split('T')[0]}));
let combined=[
...D.bills.map(b=>({...b,_lunas:false,_dateForFilter:b.nextDue})),
...(D.billsArchive||[]).map(b=>({...b,_lunas:true,_dateForFilter:b.completedAt||b.nextDue})),
...paidPeriodEntries
];
const totalCount=combined.length;
combined=combined.filter(b=>{
if(billFilterStatus==='aktif'&&b._lunas)return false;
if(billFilterStatus==='lunas'&&!b._lunas)return false;
if(billFilterKategori!=='all'&&b.category!==billFilterKategori)return false;
// BUGFIX (cicilan/tagihan berulang "hilang" pas geser ‹bulan berikutnya› di kartu Tagihan,
// Cicilan & Langganan / changeBillStatMonth) — lihat komentar lengkap di
// getBillActiveDateForFilter() (tagihan-kalender.js). Tagihan yg sudah Lunas/diarsip (_lunas)
// TETAP exact-match ke tanggal historis asli (completedAt/tanggal bayar beneran) -- itu event
// yang sudah pasti terjadi, bukan proyeksi.
if(!b._lunas){
const eff=getBillActiveDateForFilter(b,billFilterBulan,billFilterTahun,b._dateForFilter);
if(eff===null)return false;
b._dateForFilter=eff;
} else {
const d=new Date(b._dateForFilter);
if(billFilterBulan!=='all'&&(isNaN(d)||d.getMonth()!==parseInt(billFilterBulan)))return false;
if(billFilterTahun!=='all'&&(isNaN(d)||d.getFullYear()!==parseInt(billFilterTahun)))return false;
}
return true;
});
// "aktif"/"lunas" sekarang jadi 2 tampilan UTAMA lewat tab Bayar/Lunas (bukan lagi filter
// tambahan) -- jadi cuma kategori/bulan/tahun, atau memilih "Semua Status" lewat dropdown
// lanjutan, yang dianggap "sedang memfilter" (S322).
// FIX (user report + Screenshot 2026-07-30): geser ‹bulan› di nav besar (changeBillStatMonth)
// dulu selalu bikin isFiltering true (karena reuse billFilterBulan/billFilterTahun yg sama
// dgn dropdown Filter lanjutan), jadi bulan kosong nyasar ke pesan "cocok dgn filter" + tombol
// "Reset Filter" -- padahal user cuma browsing bulan, sama seperti Daftar Transaksi biasa yang
// TIDAK menghitung navigasi bulan sbg "filter" (lihat hasFilter/kf di renderKeuangan()). Sekarang
// billFilterBulan/Tahun cuma dihitung sbg filter aktif kalau BUKAN hasil browsing nav besar
// (billStatNavActive, lihat komentar di tagihan-kalender.js) -- kategori & pilihan "Semua Status"
// eksplisit via dropdown tetap dihitung filter seperti biasa.
const isFiltering=billFilterStatus==='all'||billFilterKategori!=='all'||(!billStatNavActive&&(billFilterBulan!=='all'||billFilterTahun!=='all'));
const countEl=document.getElementById('billFilterCount');
const resetBtn=document.getElementById('billFilterResetBtn');
if(countEl)countEl.textContent=isFiltering?`Menampilkan ${combined.length} dari ${totalCount} tagihan`:'';
if(resetBtn)resetBtn.style.display=isFiltering?'inline-block':'none';
const filterToggleBtn=document.getElementById('billFilterToggleBtn');
if(filterToggleBtn)filterToggleBtn.innerHTML=isFiltering?'🔍 Filter •':'🔍 Filter';
if(!combined.length){
const resetHtml=isFiltering?'<button class="btn btn-ghost btn-sm u-mt10" data-action="resetBillFilter">↺ Reset Filter</button>':'';
// Kalau kosong gara2 browsing bulan lewat nav besar (bukan filter eksplisit), pesan ikut sebut
// bulan yg lagi dibuka -- konsisten dgn "Belum ada transaksi di periode ini" di Daftar Transaksi.
const navBrowsing=!isFiltering&&billStatNavActive&&billStatMonth!==null;
const msg=isFiltering?'Tidak ada tagihan yang cocok dengan filter':(navBrowsing?`Belum ada tagihan${billFilterStatus==='lunas'?' lunas':''} di ${MONTHS_FULL[billStatMonth]} ${billStatYear}`:'Belum ada tagihan terjadwal');
targets.forEach(el=>el.innerHTML=`<div class="empty"><div class="empty-icon">🔔</div><div class="empty-text">${msg}</div>${resetHtml}</div>`);
updateBillStatGrid('keuBill');
return;
}
const sorted=combined.sort((a,b)=>{
if(a._lunas!==b._lunas)return a._lunas?1:-1;
return new Date(a._dateForFilter)-new Date(b._dateForFilter);
});
// S322 split tab Bayar/Lunas: kalau SEMUA item yang lolos filter itu lunas (billListTab==='lunas'
// atau filter status manual diset 'lunas'), kelompokkan per bulan (terbaru dulu) + subtotal per
// bulan -- jauh lebih gampang ditelusuri drpd list panjang tak berujung yg cuma diurut per tanggal
// (ini juga akar dari bug "tombol Edit lunas error", karena sebelumnya lunas & aktif dicampur jadi
// satu list tanpa pembeda visual selain opacity).
const allLunas=combined.length>0&&combined.every(b=>b._lunas);
let html;
if(allLunas){
const sortedLunas=[...combined].sort((a,b)=>new Date(b._dateForFilter)-new Date(a._dateForFilter));
const groups=[];
let curKey=null,curGroup=null;
sortedLunas.forEach(b=>{
const d=new Date(b._dateForFilter);
const key=isNaN(d)?'Tanggal tidak diketahui':(MONTHS_FULL[d.getMonth()]+' '+d.getFullYear());
if(key!==curKey){curKey=key;curGroup={label:key,items:[]};groups.push(curGroup);}
curGroup.items.push(b);
});
html=groups.map(g=>{
const groupTotal=g.items.reduce((s,b)=>s+(b.amount||0),0);
return `<div class="u-flex u-jcb u-aic u-mt10 u-mb4" style="padding:0 2px">
      <span class="u-fs12 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:.5px">${g.label}</span>
      <span class="u-fs12 u-fw700 u-cacc3">${fmt(groupTotal)}</span>
    </div>`+g.items.map(b=>renderBillItemHtml(b,today,icons)).join('');
}).join('');
} else {
html=sorted.map(b=>renderBillItemHtml(b,today,icons)).join('');
}
targets.forEach(el=>el.innerHTML=html);
updateBillStatGrid('keuBill');
}
// renderBillItemHtml — template 1 kartu tagihan di renderBillList(), dipisah jadi fungsi sendiri
// (S322) supaya bisa dipakai ulang baik utk list flat (tab Bayar/aktif) maupun list terkelompok
// per-bulan (tab Lunas) tanpa duplikasi template gede.
function renderBillItemHtml(b,today,icons){
const due=new Date(b._dateForFilter);
const diff=Math.ceil((due-today)/(1000*60*60*24));
let cicilanBar='';
if(b.kind==='cicilan'&&b.tenor&&b.sisaTenor!==null){
const sudah=b.tenor-b.sisaTenor;
const pct=Math.round((sudah/b.tenor)*100);
// Warna progress ikut sisa tenor (S299 UI polish pt.4) — reuse class .prog-fill.green/
// .orange yg SUDAH ADA (var(--accent)/--accent3/--accent4, 0 warna baru): hijau = masih
// jauh dari akhir tenor (on-track), oranye = 2x cicilan terakhir (mepet akhir tenor,
// jadi pengingat siapin pelunasan/cek perpanjangan sebelum tenor habis).
const barColor=b.sisaTenor<=2?'orange':'green';
cicilanBar=`<div class="u-mt4"><div class="u-flex u-jcb u-fs12 u-t2 u-mb2"><span>Cicilan ke-${sudah} dari ${b.tenor}x</span><span>${pct}%</span></div><div class="prog-bar" style="height:4px"><div class="prog-fill ${barColor}" style="width:${pct}%"></div></div></div>`;
}
// Urgensi 3-tier (S299 UI polish pt.2): <=3 hari/lewat = merah (urgent), 4-7 hari = oranye
// (soon), >7 hari = abu-abu netral (far, belum perlu perhatian). Kategori/subkategori/shared/
// sisaTenor TETAP pakai .acc-chip abu-abu netral (SUDAH begitu dari awal) — jadi sekarang ada
// urutan jelas: kategori (netral, kecil) vs urgensi (warna, langsung nangkep tanpa baca teks).
const urgClass=diff<=3?'bill-due-urgent':(diff<=7?'bill-due-soon':'bill-due-far');
// _paidPeriodOnly (lanjutan S322): entri duplikat "sudah dibayar periode ini" milik tagihan
// yang MASIH AKTIF (bukan D.billsArchive) -- badge & label dibedakan dari "Lunas" murni
// (yang berarti tagihan itu sendiri sudah 100% selesai) supaya tidak menyesatkan user.
const isArchived=b._lunas&&!b._paidPeriodOnly;
// Badge kecil "sudah dibayar bulan ini" KHUSUS kartu di tab Bayar (entri asli, bukan
// duplikat _paidPeriodOnly) -- supaya user langsung lihat status tanpa perlu pindah ke tab
// Lunas (lanjutan ringkas dari fitur _paidPeriodOnly di atas).
const paidThisPeriod=(!isArchived&&!b._paidPeriodOnly)?getBillPaidThisPeriodInfo(b,billFilterBulan,billFilterTahun):null;
const paidThisPeriodChip=paidThisPeriod?`<span class="acc-chip" style="color:var(--accent3)">✅ Sudah dibayar bulan ini</span>`:'';
// UX (lanjutan audit user, laporan "chip 🧾 satu arah aja (Piutang->Tagihan)"): kebalikan
// dari chip "🧾 Tagihan asal" di kartu Piutang (s300) -- kartu Tagihan yang jadi sumber
// piutang otomatis (b.shared+sharedAutoPiutang) sekarang dapat chip balik "🤝 Piutang
// terkait" yang buka piutangnya langsung (reuse openPiutangModal). Dibatasi ke b.shared
// (bukan cuma b.sharedAutoPiutang) supaya piutang LAMA yang sudah terlanjur dibuat tetap
// tertaut walau togglenya belakangan dimatikan. data-stop="1" wajib (pola sama chip lain
// di kartu ini) supaya tap chip tidak ikut trigger data-action="openBillModal" milik kartu.
const autoPiutangId=(b.shared&&typeof getAutoPiutangIdForBill==='function')?getAutoPiutangIdForBill(b.id,D.piutang):null;
const autoPiutangChip=autoPiutangId?`<span class="acc-chip u-pointer" data-stop="1" data-action="openPiutangModal" data-args="${escapeHtml(JSON.stringify([autoPiutangId]))}" title="Lihat piutang terkait">🤝 Piutang terkait</span>`:'';
const statusBadge=b._paidPeriodOnly?`<span class="bill-due-badge bill-due-ok">✅ Dibayar</span>`:(b._lunas?`<span class="bill-due-badge bill-due-ok">✅ Lunas</span>`:`<span class="bill-due-badge ${urgClass}">${diff<0?'Lewat':diff===0?'Hari ini':diff+' hari'}</span>`);
const anomaly=isArchived?null:getBillAnomalyInfo(b.id,b.amount);
const anomalyNote=anomaly?`<div class="u-fs11 u-mt2 u-fw700" style="color:var(--accent4)">⚠️ Naik ${anomaly.pctChange}% dari rata-rata ${anomaly.count}x terakhir (${fmt(anomaly.avgPrev)}) — cek lagi sebelum bayar</div>`:'';
const hasDetail=!!(cicilanBar||anomalyNote);
const chevron=hasDetail?`<span class="bill-card-chevron" data-stop="1" data-action="toggleBillCardDetail" data-args='["$el"]' title="Detail" aria-label="Tampilkan detail">▾</span>`:'';
const actionBtns=isArchived?
`<button class="tx-del u-cacc3" data-stop="1" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Riwayat Pembayaran" aria-label="Riwayat Pembayaran">📋</button>
       <button class="tx-del" data-stop="1" data-action="openBillActionsMenu" data-args="${escapeHtml(JSON.stringify([b.id,true]))}" title="Aksi lainnya" aria-label="Aksi lainnya">⋮</button>`:
(b._paidPeriodOnly?
// FIX (laporan user, screenshot tab Lunas — "tombol centang bayar tidak tampil, pencil malah
// buka Edit Transaksi"): kartu _paidPeriodOnly ini SENGAJA tidak punya tombol ✅ (bayar lagi
// akan dobel-bayar periode yang sama, lihat catatan getBillPaidThisPeriodInfo di atas), dan
// ✏️ di sini SUDAH BENAR memanggil openBillModal(b.id) yang lalu redirect ke editTx() (bill
// ini masih aktif, bukan arsip — lihat catatan gap "Edit Tagihan vs Detail Cicilan" di
// openBillModal()), yaitu membuka transaksi pembayaran periode INI, bukan pengaturan tagihan
// umum. Label lama "Edit" generik menyesatkan (kelihatan seperti tombol edit kartu, padahal
// hasilnya lompat ke modal Edit Transaksi) — diperjelas jadi "Edit Pembayaran Bulan Ini" tanpa
// mengubah routing/logic apa pun (aman, 0 risiko regresi ke openBillModal/editTx).
`<button class="tx-del u-cacc3" data-stop="1" data-action="openBillHistory" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Riwayat Pembayaran" aria-label="Riwayat Pembayaran">📋</button>
       <button class="tx-del u-bgaccsoft u-cacc" data-stop="1" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Edit Pembayaran Bulan Ini" aria-label="Edit Pembayaran Bulan Ini">✏️</button>
       <button class="tx-del" data-stop="1" data-action="openBillActionsMenu" data-args="${escapeHtml(JSON.stringify([b.id,false]))}" title="Aksi lainnya" aria-label="Aksi lainnya">⋮</button>`:
`<button class="tx-del" data-stop="1" data-action="markBillPaid" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Bayar sekarang" aria-label="Bayar sekarang">✅</button>
       <button class="tx-del u-bgaccsoft u-cacc" data-stop="1" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Edit" aria-label="Edit">✏️</button>
       <button class="tx-del" data-stop="1" data-action="openBillActionsMenu" data-args="${escapeHtml(JSON.stringify([b.id,false]))}" title="Aksi lainnya" aria-label="Aksi lainnya">⋮</button>`);
return`<div class="bill-item u-pointer" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([b.id]))}" style="flex-direction:column;align-items:stretch;gap:8px;${isArchived?'opacity:0.75':''}">
      <div class="u-flex u-aic u-gap10">
        <div class="tx-icon u-bgaccsoft">${icons[b.kind]||'🔔'}</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(b.name)} ${b.category?`<span class="acc-chip">${b.category}</span>`:''} ${b.subcategory?`<span class="acc-chip">${b.subcategory}</span>`:''} ${b.shared?`<span class="acc-chip">👫 ${b.sharedPct}% dari ${fmt(b.totalAmount)}</span>`:''} ${!isArchived&&b.sisaTenor!=null?`<span class="acc-chip">${b.sisaTenor}x lagi</span>`:''} ${autoPiutangChip} ${paidThisPeriodChip}</div>
          <div class="tx-meta">${b._paidPeriodOnly?'Sudah dibayar':(b._lunas?'Lunas':'Jatuh tempo')} ${due.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})} · ${b.freq}</div>
        </div>
        <div class="u-flex u-fdcol u-gap4" style="align-items:flex-end">
          <div class="tx-amount red">${fmt(b.amount)}</div>
          ${statusBadge}
        </div>
        ${chevron}
      </div>
      ${hasDetail?`<div class="bill-card-detail">${cicilanBar}${anomalyNote}</div>`:''}
      <div class="u-flex u-gap6 u-fwrap" style="justify-content:flex-end">
        ${actionBtns}
      </div>
    </div>`;
}

function renderDashCashflowForecast(){
const card=document.getElementById('cashflowForecastCard');
if(!card)return;
if(!D.bills||!D.bills.length){card.style.display='none';return;}
const today=new Date();today.setHours(0,0,0,0);
const rangeEnd=new Date(today);rangeEnd.setDate(rangeEnd.getDate()+30);
const curBalance=totalSaldoAkun();
let running=curBalance;
let dangerDate=null;
const events=[];
D.bills.forEach(b=>{
getBillOccurrencesInRange(b,today,rangeEnd).forEach(d=>events.push({date:d,amount:b.amount,name:b.name}));
});
events.sort((a,b)=>a.date-b.date);
events.forEach(e=>{
running-=e.amount;
if(running<0&&!dangerDate)dangerDate=e.date;
});
const total30=events.reduce((s,e)=>s+e.amount,0);
if(!events.length){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
const safe=running>=0;
card.innerHTML=`
    <div class="card-title">📉 Proyeksi Arus Kas (30 Hari) <span class="card-collapse-toggle" id="cashflowForecastCard-chev" data-action="toggleCardCollapse" data-args='["cashflowForecastCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div>
    <div class="card-collapse-body" id="cashflowForecastCard-cbody">
    <div class="u-fs12 u-t2 u-mb10">Saldo sekarang ${fmt(curBalance)} dikurangi ${events.length} tagihan/cicilan/langganan (total ${fmt(total30)}) yang jatuh tempo dalam 30 hari ke depan.</div>
    ${safe
?`<div class="u-r10 u-cacc3 u-fs13 u-fw600" style="padding:10px;background:var(--accent3-soft)">✅ Aman — proyeksi saldo tetap positif: ${fmt(running)}</div>`
:(()=>{
const daysToDanger=Math.max(1,Math.round((dangerDate-today)/86400000));
return `<div class="u-r10 u-cacc2 u-fs13 u-fw600" style="padding:10px;background:var(--accent2-soft)">⚠️ Berpotensi MINUS ${fmt(Math.abs(running))} sekitar ${dangerDate.toLocaleDateString('id-ID',{day:'numeric',month:'long'})} kalau tidak ada pemasukan tambahan.
        <div class="u-fw400 u-mt6 u-fs12">${cashflowActionSuggestion(Math.abs(running),daysToDanger)}</div></div>`;
})()}
    </div>
  `;
applyOneCardCollapsePref('cashflowForecastCard');
}

function renderBillCalendar(){
const labelEl=document.getElementById('billCalLabel');
const gridEl=document.getElementById('billCalGrid');
const totalEl=document.getElementById('billCalTotal');
const dayListEl=document.getElementById('billCalDayList');
if(!gridEl)return;
labelEl.textContent=MONTHS_FULL[billCalMonth]+' '+billCalYear;
const byDate={};
D.bills.forEach(b=>{
getBillOccurrencesInMonth(b,billCalYear,billCalMonth).forEach(d=>{
const key=d.toISOString().split('T')[0];
if(!byDate[key])byDate[key]=[];
byDate[key].push(b);
});
});
const monthTotal=Object.values(byDate).flat().reduce((s,b)=>s+(b.amount||0),0);
const totalCount=Object.values(byDate).flat().length;
totalEl.textContent=totalCount?`${totalCount} jatuh tempo bulan ini · Total ${fmt(monthTotal)}`:'Tidak ada tagihan jatuh tempo bulan ini';
const firstDow=new Date(billCalYear,billCalMonth,1).getDay();
const daysInMonth=new Date(billCalYear,billCalMonth+1,0).getDate();
const todayStr=new Date().toISOString().split('T')[0];
let html='';
for(let i=0;i<firstDow;i++)html+='<div class="billcal-day empty"></div>';
for(let day=1;day<=daysInMonth;day++){
const dateStr=`${billCalYear}-${String(billCalMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const hasBill=!!byDate[dateStr];
const cls=['billcal-day'];
if(dateStr===todayStr)cls.push('today');
if(hasBill)cls.push('has-bill');
if(dateStr===billCalSelectedDate)cls.push('selected');
const ariaLbl=`Tanggal ${day}${hasBill?', ada tagihan jatuh tempo':''}`;
html+=`<div class="${cls.join(' ')}" data-action="selectBillCalDay" data-args="${escapeHtml(JSON.stringify([dateStr]))}" aria-label="${escapeHtml(ariaLbl)}">${day}${hasBill?'<div class="billcal-dot"></div>':''}</div>`;
}
gridEl.innerHTML=html;
const selList=billCalSelectedDate?(byDate[billCalSelectedDate]||[]):[];
if(!billCalSelectedDate){
dayListEl.innerHTML='';
} else if(!selList.length){
const dLabel=new Date(billCalSelectedDate).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
dayListEl.innerHTML=`<div class="u-fs12 u-t2 u-mb8">${dLabel}</div><div class="empty" style="padding:16px 0"><div class="empty-icon">📭</div><div class="empty-text">Tidak ada tagihan jatuh tempo</div></div>`;
} else {
const icons={tagihan:'🧾',cicilan:'💳',langganan:'🔁'};
const dLabel=new Date(billCalSelectedDate).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'});
dayListEl.innerHTML=`<div class="u-fs12 u-t2 u-mb8">${dLabel} · ${selList.length} tagihan</div>`
+selList.map(b=>`<div class="bill-item">
        <div class="tx-icon u-bgaccsoft">${icons[b.kind]||'🔔'}</div>
        <div class="tx-info">
          <div class="tx-name">${escapeHtml(b.name)} ${b.category?`<span class="acc-chip">${escapeHtml(b.category)}</span>`:''}</div>
          <div class="tx-meta">${b.freq}${b.sisaTenor!=null?` · sisa ${b.sisaTenor}x`:''}</div>
        </div>
        <div class="tx-amount red">${fmt(b.amount)}</div>
      </div>`).join('');
}
}

function renderDashboardBills(billStats){
const card=document.getElementById('dashBillCard');if(!card)return;
if(!D.bills.length){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
const s=billStats||getBillStats();
document.getElementById('dashBillMonthTotal').textContent=fmt(s.monthTotal);
document.getElementById('dashBillUpcomingCount').textContent=s.soonCount;
document.getElementById('dashBillOutstanding').textContent=fmt(s.outstanding);
const badge=document.getElementById('dashBillOverdueBadge');
if(s.overdueCount>0){badge.classList.remove('u-dnone');badge.style.display='inline-block';badge.textContent=s.overdueCount+' Terlambat';}else{badge.style.display='none';}
const icons={tagihan:'🧾',cicilan:'💳',langganan:'🔁'};
document.getElementById('dashBillMiniList').innerHTML=s.nearest.map(({b,diff})=>`
    <div class="u-flex u-aic u-gap8" style="padding:8px 0;border-top:1px solid var(--border)">
      <div class="tx-icon u-bgaccsoft" style="width:32px;height:32px;font-size:15px">${icons[b.kind]||'🔔'}</div>
      <div class="tx-info"><div class="tx-name" style="font-size:var(--fs-body)">${escapeHtml(b.name)}</div><div class="tx-meta">${diff<0?'Lewat '+Math.abs(diff)+' hari':diff===0?'Hari ini':diff+' hari lagi'}</div></div>
      <div class="tx-amount red u-fs13">${fmt(b.amount)}</div>
      <button class="tx-del" data-stop="1" data-action="markBillPaid" data-args="${escapeHtml(JSON.stringify([b.id]))}" title="Bayar sekarang" aria-label="Bayar sekarang">✅</button>
    </div>`).join('');
}

function renderLDR(){
if(D.nextPulang)document.getElementById('nextPulang').value=D.nextPulang;
const now=new Date(),m=now.getMonth(),y=now.getFullYear();
const whThisMonth=D.workDays.filter(w=>{const d=new Date(w.date);return d.getMonth()===m&&d.getFullYear()===y;});
const cycleEl=document.getElementById('ldrCycle');
if(cycleEl) cycleEl.textContent=`📋 ${whThisMonth.length} hari kerja tercatat bulan ini`;
if(!D.nextPulang){document.getElementById('ldrNum').textContent='?';document.getElementById('ldrSub').textContent='Atur tanggal pulang berikutnya';return;}
const today=new Date();today.setHours(0,0,0,0);
const pulang=new Date(D.nextPulang);
const diff=Math.ceil((pulang-today)/(1000*60*60*24));
if(diff<=0){document.getElementById('ldrNum').textContent='🏠';document.getElementById('ldrUnit').textContent='';document.getElementById('ldrSub').textContent='Sudah pulang ke Pekalongan!';document.getElementById('ldrFill').style.width='100%';return;}
document.getElementById('ldrNum').textContent=diff;
document.getElementById('ldrUnit').textContent='hari';
document.getElementById('ldrSub').textContent='lagi pulang ke Pekalongan 💙';
const cycleStart=D.ldrCycleStart?new Date(D.ldrCycleStart):null;
let pct=0;
if(cycleStart && pulang>cycleStart){
const totalCycle=(pulang-cycleStart)/(1000*60*60*24);
const elapsed=(today-cycleStart)/(1000*60*60*24);
pct=(elapsed/totalCycle)*100;
} else {
pct=100-(diff/14)*100;
}
document.getElementById('ldrFill').style.width=Math.max(0,Math.min(100,pct))+'%';
document.getElementById('ldrDate').textContent=pulang.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
}

// Sesi 197 (Ownership Sync — Dashboard): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas D.vehicles (0 logic lama diubah) —
// kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan
// dari widget Beranda "Reminder Servis" (chip filter & daftar reminder),
// pola sama persis isVehicleOwnershipSelf() di vehicle-core.js (Sesi 196).
// Guard typeof: kalau helper belum dimuat, anggap semua SELF.
function _dashServisSelfVehicles(){
return D.vehicles.filter(v=>typeof isVehicleOwnershipSelf!=='function'||isVehicleOwnershipSelf(v.id));
}
function renderDashServisVehChips(){
const selfVehicles=_dashServisSelfVehicles();
if(dashServisVehFilter!=='semua'&&!selfVehicles.find(v=>v.id===dashServisVehFilter)){
dashServisVehFilter='semua';
safeSetItem('kw_dashServisVehFilter','semua');
}
if(selfVehicles.length<2)return'';
const chips=[{id:'semua',label:'Semua'},...selfVehicles.map(v=>({id:v.id,label:`${v.emoji||'🏍️'} ${escapeHtml(v.name)}`}))];
return `<div class="u-flex u-gap6 u-mb10" style="overflow-x:auto;padding-bottom:2px">`
+chips.map(c=>`<button class="chip-btn${dashServisVehFilter===c.id?' active':''}" data-action="setDashServisVehFilter" data-args="${escapeHtml(JSON.stringify([c.id]))}">${escapeHtml(c.label)}</button>`).join('')
+`</div>`;
}

function renderDashboardServisReminder(){
const card=document.getElementById('dashServisReminderCard');
if(!card)return;
const selfVehicles=_dashServisSelfVehicles();
// Sesi 295: sama seperti Servis.renderReminder() (car-notes.js) -- filter ke
// kategori dgn interval valid & tidak disembunyikan, biar kategori sampah
// hasil scan Katalog Suku Cadang (intervalKm:0, showInReminder:false) tidak
// numpuk juga di widget Beranda ini.
// BUGFIX (audit lanjutan S622/S629, gap yang sama dgn resolveServisCatForVehicle()):
// filter ini dulu TIDAK ikut catVisibleForVehicle(), beda dgn
// Servis.renderReminder() (car-notes.js) yang sudah benar. Widget Beranda ini
// bisa menampilkan BEBERAPA kendaraan sekaligus, jadi filter-nya tidak bisa
// dilakukan 1x di luar (1 vehicleId) -- harus per-kendaraan DI DALAM loop di
// bawah. Tanpa ini, kategori PRIVAT milik kendaraan lain ikut nyasar tampil
// di kartu Pengingat kendaraan yang sedang difilter.
const remindableCatsAll=D.sparepartCats.filter(c=>c.intervalKm>0&&c.showInReminder!==false);
if(!selfVehicles.length||!remindableCatsAll.length){card.style.display='none';return;}
const vehChipsHTML=renderDashServisVehChips();
const vehicles=dashServisVehFilter==='semua'?selfVehicles:selfVehicles.filter(v=>v.id===dashServisVehFilter);
const rows=[];
vehicles.forEach(veh=>{
const curKm=getVehicleKm(veh.id);
const kmPerDay=estimateKmPerDay(veh.id);
const remindableCats=remindableCatsAll.filter(c=>catVisibleForVehicle(c,veh.id));
remindableCats.forEach(cat=>{
const lastKm=getLastServiceKmForCat(veh.id,cat);
const intervalKm=getEffectiveIntervalKm(veh.id,cat);
const jarakTempuh=lastKm===null?curKm:curKm-lastKm;
const sisa=intervalKm-jarakTempuh;
const pct=Math.min(100,Math.max(0,Math.round((jarakTempuh/intervalKm)*100)));
let col=null;
if(sisa<=0)col='red';
else if(sisa<=intervalKm*0.15)col='orange';
if(!col)return;
const msg=sisa<=0?`⚠️ Lewat ${Math.abs(sisa).toLocaleString('id-ID')} km`:`🔔 Sisa ${sisa.toLocaleString('id-ID')} km`;
const estDateISO=estimateServiceDateISO(sisa,kmPerDay);
const estLabel=estDateISO?` · ~${fmtDateID(estDateISO)}`:'';
rows.push({veh,cat,sisa,pct,col,msg:msg+estLabel});
});
});
if(!rows.length){
if(dashServisVehFilter!=='semua'&&vehChipsHTML){
card.classList.remove('u-dnone');card.style.display='block';
card.innerHTML=`<div class="card-title">🔧 Pengingat Servis <span class="card-collapse-toggle" id="dashServisReminderCard-chev" data-action="toggleCardCollapse" data-args='["dashServisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="dashServisReminderCard-cbody">`+vehChipsHTML+`<div class="u-fs12 u-t2 u-tac" style="padding:10px 0">✅ Aman, belum ada servis mendesak untuk kendaraan ini.</div></div>`;
applyOneCardCollapsePref('dashServisReminderCard');
}else{
card.style.display='none';
}
return;
}
rows.sort((a,b)=>a.sisa-b.sisa);
const top=rows.slice(0,3);
card.classList.remove('u-dnone');card.style.display='block';
card.innerHTML=`<div class="card-title">🔧 Pengingat Servis <span class="acc-chip u-cacc2" style="border-color:var(--accent2)">${rows.length}</span> <span class="card-collapse-toggle" id="dashServisReminderCard-chev" data-action="toggleCardCollapse" data-args='["dashServisReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="dashServisReminderCard-cbody">`
+vehChipsHTML
+top.map(r=>`
    <div class="u-mb10 u-pointer" data-action="goToServisFromDash" data-args="${escapeHtml(JSON.stringify([r.veh.id]))}">
      <div class="u-flex u-jcb u-aic u-fs12 u-mb4">
        <span class="u-fw700">${r.veh.emoji||'🏍️'} ${escapeHtml(r.veh.name)} · ${escapeHtml(r.cat.name)}</span>
        <span class="${r.col} u-fw700">${r.msg}</span>
      </div>
      <div class="prog-bar"><div class="prog-fill ${r.col}" style="width:${r.pct}%"></div></div>
    </div>`).join('')
+(rows.length>top.length?`<div class="u-fs12 u-cacc u-tar u-pointer" data-action="goToServisFromDash">Lihat semua (${rows.length}) →</div>`:'')
+`</div>`;
applyOneCardCollapsePref('dashServisReminderCard');
}

function renderDashboardSewaKiosReminder(){
const card=document.getElementById('dashSewaKiosReminderCard');
if(!card)return;
const units=(D.sewaKios&&D.sewaKios.units)||[];
const rows=units.map(u=>({u,nt:SewaKios.nextTagih(u)})).filter(r=>r.nt&&r.nt.diffDays<=5);
if(!rows.length){card.style.display='none';return;}
rows.sort((a,b)=>a.nt.diffDays-b.nt.diffDays);
const top=rows.slice(0,3);
card.classList.remove('u-dnone');card.style.display='block';
card.innerHTML=`<div class="card-title">🏠 Pengingat Tagih Sewa <span class="acc-chip u-cacc2" style="border-color:var(--accent2)">${rows.length}</span> <span class="card-collapse-toggle" id="dashSewaKiosReminderCard-chev" data-action="toggleCardCollapse" data-args='["dashSewaKiosReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="dashSewaKiosReminderCard-cbody">`
+top.map(r=>{
const col=r.nt.diffDays<0?'red':'orange';
const dueLabel=r.nt.due.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
const msg=r.nt.diffDays<0?`⚠️ Telat ${Math.abs(r.nt.diffDays)} hari`:(r.nt.diffDays===0?'🔔 Jatuh tempo hari ini':`🔔 ${r.nt.diffDays} hari lagi (${dueLabel})`);
return `<div class="u-flex u-jcb u-aic u-mb8 u-pointer" data-action="SewaKios.catatSewa" data-args="${escapeHtml(JSON.stringify([r.u.id]))}">
        <span class="u-fs12 u-fw700">${escapeHtml(r.u.name)}${r.u.penyewa?' — '+escapeHtml(r.u.penyewa):''}</span>
        <span class="${col} u-fs12 u-fw700">${msg}</span>
      </div>`;
}).join('')
+(rows.length>top.length?`<div class="u-fs12 u-cacc u-tar u-pointer" data-action="showPage" data-args='["keuangan", "$nav:1"]'>Lihat semua (${rows.length}) →</div>`:'')
+`</div>`;
applyOneCardCollapsePref('dashSewaKiosReminderCard');
}

// Nudge sekali (bisa di-dismiss permanen) kalau user BELUM PERNAH sync ke Google Drive/Sheets
// sama sekali TAPI datanya sudah cukup banyak -- soalnya semua data cuma tersimpan lokal di HP
// (localStorage + IndexedDB mirror), kalau HP hilang/rusak/di-uninstall tanpa backup, data hilang
// total. Bukan wajib/blocking, cuma pengingat.
const BACKUP_REMINDER_DISMISS_KEY='kw_backup_reminder_dismissed';
const BACKUP_REMINDER_DATA_THRESHOLD=30; // total catatan (transaksi+bbm+servis+shop) sebelum dianggap "udah lumayan banyak"
function renderDashboardBackupReminder(){
const card=document.getElementById('dashBackupReminderCard');
if(!card)return;
if(localStorage.getItem(BACKUP_REMINDER_DISMISS_KEY)==='1'){card.style.display='none';return;}
const everSynced=!!(D.googleDrive&&D.googleDrive.lastSync)||!!(D.googleSheets&&D.googleSheets.lastSync);
if(everSynced){card.style.display='none';return;}
const totalCatatan=(D.transactions?D.transactions.length:0)+(D.bbmLogs?D.bbmLogs.length:0)+(D.servisLogs?D.servisLogs.length:0)+((D.cobek||[]).length);
if(totalCatatan<BACKUP_REMINDER_DATA_THRESHOLD){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
card.innerHTML=`<div class="card-title">☁️ Backup Belum Aktif <span class="card-collapse-toggle" id="dashBackupReminderCard-chev" data-action="toggleCardCollapse" data-args='["dashBackupReminderCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="dashBackupReminderCard-cbody">
  <div class="u-fs12 u-t2 u-lh15 u-mb10">Sudah ada <b>${totalCatatan} catatan</b> tersimpan, tapi semuanya cuma di penyimpanan lokal HP ini. Kalau HP hilang, rusak, atau app-nya ke-uninstall/data ke-clear tanpa backup, <b>semua data ini bisa hilang total</b> & tidak bisa dipulihkan.</div>
  <div class="u-flex u-gap8">
    <button class="btn btn-primary btn-sm u-flex1" data-action="showPage" data-args='["settings","$nav:6"]'>☁️ Aktifkan Backup</button>
    <button class="btn btn-ghost btn-sm" data-action="dismissBackupReminder">Sudah Paham</button>
  </div>
</div>`;
applyOneCardCollapsePref('dashBackupReminderCard');
}
function dismissBackupReminder(){
safeSetItem(BACKUP_REMINDER_DISMISS_KEY,'1');
const card=document.getElementById('dashBackupReminderCard');
if(card)card.style.display='none';
toast('Oke, tidak akan diingatkan lagi. Kamu tetap bisa aktifkan backup kapan saja lewat Pengaturan.');
}

// Daftar card Dashboard yang BOLEH disembunyikan user lewat Pengaturan → Tampilan → Kartu di
// Beranda. Ini satu-satunya sumber data buat checklist di Pengaturan (renderDashCardPrefsUI) DAN
// buat renderDashboard() memutuskan mana yang di-skip. Card "inti" (Penasihat, Skor Hidup
// Seimbang, saldo bulan ini, Saldo Akun, Transaksi Terakhir) sengaja TIDAK dimasukkan sini —
// selalu tampil karena jadi acuan utama tiap buka Beranda.
// Field `render(ctx)`: dipanggil renderDashboard() kalau card ini aktif (isDashCardOn). `ctx`
// berisi konteks bulan-berjalan yang sudah dihitung sekali di renderDashboard() (now/m/y/txM/
// inc/exp/billStats) — dipakai kalau card butuh (mis. laporanMini, zakatMini, bill), diabaikan
// kalau tidak. Urutan render sesungguhnya (beda dari urutan checklist Pengaturan di bawah, yang
// sengaja dikelompokkan per tema) diatur lewat DASH_RENDER_ORDER, bukan urutan array ini.
// S138 (breadcrumb-navigasi-3lapis, cleanup #page-dashboard lama): 13 entry lama
// (bill/servisReminder/sewaKiosReminder/backupReminder/danaDarurat/cashflowForecast/
// timeline/budgetMini/eduFund/zakatMini/laporanMini/siapPulang/ldr) DIHAPUS dari sini —
// elemen target masing2 (dashBillCard/dashServisReminderCard/dst) HANYA ada di dalam
// blok HTML #page-dashboard lama (app_production.html/index.html baris 202-325 sebelum
// dihapus sesi ini), BUKAN di #page-dashboard-hub. 4 entry sisanya (fi/pensiun/absensi/
// refleksi) TETAP karena elemennya (dashFiCard/dashPensiunCard/dashAbsensiCard/
// refleksiCard) sudah pindah ke #page-dashboard-hub sejak migrasi Tahap 3a.
// _renderCashProjectionCard(ctx) — Sesi P2 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md
// Track 2, lanjutan Sesi P1 modules/finance/cash-projection.js). Card baru "💰 Proyeksi Kas
// Bulan Ini" -- 100% REUSE getMonthlyCashProjection() (0 rumus baru di sini, murni presenter).
// Kriteria #5 (acceptance criteria P1-P2): SELALU render 3 angka terpisah (Proyeksi Gaji /
// Sisa Kewajiban / Proyeksi Kas) -- TIDAK ADA mode 1-angka gabungan.
// ctx (dari renderDashboard()) dipakai kalau ada (ctx.m/ctx.y = bulan berjalan yang sudah
// dihitung sekali di atas), tapi function ini juga aman dipanggil tanpa ctx (fallback ke
// bulan/tahun berjalan lewat getMonthlyCashProjection(undefined,undefined) sendiri).
// Sesi Q1 (AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md, Keputusan #1): tambah 2 angka
// "Pemasukan Bulan Ini"/"Pengeluaran Bulan Ini" -- REUSE ctx.inc/ctx.exp (kas riil, semua
// tipe transaksi, sudah dihitung 1x di renderDashboard() lewat _dashMonthlyIncExp() & sudah
// dioper ke sini sejak awal, cuma sebelum sesi ini tidak pernah dipakai). Kalau dipanggil
// tanpa ctx (mis. dari test lama/pemanggilan berdiri sendiri), fallback hitung sendiri dari
// D.transactions bulan target (m/y yang sama dipakai getMonthlyCashProjection() di atas),
// tetap ter-guard hitungKas!==false -- pola sama persis FinCoach.compute() (modules-calc.js).
// 0 perubahan ke getMonthlyCashProjection() sendiri (acceptance criteria #4) -- murni consumer.
// Sesi Q2 (AUDIT-RENCANA-proyeksi-arus-kas-lengkap.md, Keputusan #3): breakdown gaji tercatat
// vs pending & kewajiban total vs sudah dibayar -- field SUDAH ADA di getMonthlyCashProjection()
// (recordedGaji/pendingGajiEstimate/billMonthTotal/billPaidThisPeriod), 0 hitungan baru, murni
// ditampilkan di balik toggle "Detail" (class u-dnone, pola sama hideDashCardEl() di atas) supaya
// kartu tidak makin padat by default (kartu sudah 5 angka utama sejak Sesi Q1).
// Sesi Q3 (Keputusan #2): tambah "Rata-rata Surplus Bulanan" (REUSE fiMonthlySurplus(), 0 rumus
// baru) sbg metrik ke-4 SELALU tampil (bukan di balik toggle -- beda dari breakdown Q2 yang murni
// info tambahan, metrik ini beda SEMANTIK dari Proyeksi Kas jadi wajib kelihatan supaya user tidak
// menyangka 2 angka itu sama). WAJIB disertai 1-2 baris penjelasan (window rata-rata multi-bulan
// vs bulan kalender berjalan) persis sesuai catatan risiko "SEDANG" di dokumen audit -- tanpa
// penjelasan ini user bisa salah paham dikira Proyeksi Kas dihitung ulang/beda karena bug.
// Guard typeof FI/fiMonthlySurplus -- aman kalau modules-calc.js belum dimuat bareng.
// _dashCashProjSettingsToggle(el)/_dashCashProjApplySettings()/dst (S667B) — panel inline
// "⚙️ Atur" (siklus tagihan), REUSE PERSIS CashflowProjSettings (cashflow-projection-
// settings.js, Sesi 95/S667 — SAMA D.profile.cashflowProjSettings, jadi 1 setting dipakai
// kedua kartu "Proyeksi Kas Bulan Ini" & "Proyeksi Pemasukan/Pengeluaran/Saldo Kas" --
// TIDAK ada struktur data baru). Cuma expose billWindowMode('kalender'/'siklus')+
// cycleStartDay -- field months/accountId TIDAK relevan di kartu ini (proyeksiGaji selalu
// bulan kalender, bukan rata-rata N-bulan), jadi sengaja tidak ditampilkan di sini walau
// field-nya tetap ada di objek settings yang sama (dipakai kartu satunya). Ditaruh sbg
// sibling #dashCashProjBody (bukan di-replace innerHTML-nya tiap render, pola sama persis
// _renderSettingsToggle() di cashflow-projection-presenter.js).
function _dashCashProjSettingsToggle(bodyEl){
const wrap=bodyEl.parentElement;
if(!wrap)return;
let toggle=document.getElementById('dashCashProjSettingsToggle');
if(!toggle){
toggle=document.createElement('button');
toggle.id='dashCashProjSettingsToggle';
toggle.type='button';
toggle.className='chip-btn u-mb8';
toggle.setAttribute('data-action','_dashCashProjToggleSettings');
wrap.insertBefore(toggle,bodyEl);
}
const customized=(typeof CashflowProjSettings!=='undefined')&&CashflowProjSettings.isCustomized();
toggle.textContent=customized?'⚙️ Atur (aktif)':'⚙️ Atur';
if(!document.getElementById('dashCashProjSettingsPanel')){
const panel=document.createElement('div');
panel.id='dashCashProjSettingsPanel';
panel.className='u-dnone u-mb10 u-r10';
panel.style.padding='10px';
panel.style.background='var(--surface3)';
wrap.insertBefore(panel,bodyEl);
}
}
function _dashCashProjToggleSettings(){
const panel=document.getElementById('dashCashProjSettingsPanel');
if(!panel)return;
const opening=panel.classList.contains('u-dnone');
if(opening)_dashCashProjFillSettingsPanel(panel);
panel.classList.toggle('u-dnone',!opening);
}
function _dashCashProjFillSettingsPanel(panel){
if(typeof CashflowProjSettings==='undefined'){panel.innerHTML='<div class="empty-text">Pengaturan belum tersedia</div>';return;}
const s=CashflowProjSettings.get();
// Default settings global (CASHFLOW_PROJ_SETTINGS_DEFAULT) = '30hari', dipakai kartu
// Proyeksi Saldo Kas satunya -- kartu INI cuma kenal 'kalender'/'siklus' (lihat komentar
// getMonthlyCashProjection() di cash-projection.js), jadi '30hari'/belum-diset dianggap
// 'kalender' KHUSUS utk tombol aktif di sini (0 perubahan ke value tersimpan).
const effMode=s.billWindowMode==='siklus'?'siklus':'kalender';
const modeBtn=(mode,label)=>`<button type="button" class="chip-btn${effMode===mode?' active':''}" data-action="_dashCashProjSetBillWindowMode" data-args='["${mode}"]'>${label}</button>`;
// Sesi pengaturan-proyeksi-kas-lengkap: kiriman mingguan (nominal) dibaca LANGSUNG dari
// D.profile.kiriman (SATU-SATUNYA sumber, sama persis dipakai InsightTargetMingguan) --
// input di sini nulis ke field itu juga (bukan field baru), jadi tetap konsisten kalau
// diubah dari Pengaturan → Profil.
const kirimanVal=(D.profile&&D.profile.kiriman)||0;
panel.innerHTML=`
<div class="fg u-mb8"><label class="fl">Mode Jendela Kewajiban</label>
<div class="u-flex u-fwrap u-gap6">
${modeBtn('kalender','Kalender Bulan Ini')}
${modeBtn('siklus','Siklus Custom')}
</div>
</div>
<div class="fg u-mb8${s.billWindowMode==='siklus'?'':' u-dnone'}" id="dashCashProjCycleWrap">
<label class="fl">Tanggal Mulai Siklus</label>
<input type="number" class="fi" id="dashCashProjCycleDay" min="1" max="28" value="${s.cycleStartDay}" onchange="_dashCashProjSetCycleDay()">
</div>
<div class="fg u-mb8">
<label class="fl">Kiriman Mingguan (Rp)</label>
<input type="number" class="fi" id="dashCashProjKirimanVal" min="0" step="1000" value="${kirimanVal}" onchange="_dashCashProjSetKirimanVal()">
<label class="u-flex u-gap6 u-fs12 u-t2 u-mt6"><input type="checkbox" id="dashCashProjIncludeKiriman"${s.includeKiriman?' checked':''} onchange="_dashCashProjSetIncludeKiriman()"> Sertakan ke Proyeksi Kas</label>
</div>
<div class="fg u-mb8">
<label class="u-flex u-gap6 u-fs12"><input type="checkbox" id="dashCashProjIncludePending"${s.includePendingGaji?' checked':''} onchange="_dashCashProjSetIncludePendingGaji()"> Sertakan Gaji Pending (estimasi absensi belum di-reset) ke Proyeksi Gaji</label>
</div>
<div class="fg u-mb8">
<label class="fl">Rentang Rata-rata Surplus Bulanan</label>
<select class="fs" id="dashCashProjSurplusMonths" onchange="_dashCashProjSetSurplusMonths()">
<option value=""${s.surplusMonths?'':' selected'}>Otomatis (ikut pengaturan Financial Freedom)</option>
${[3,6,12].map(n=>`<option value="${n}"${s.surplusMonths===n?' selected':''}>${n} bulan terakhir</option>`).join('')}
</select>
</div>
<div class="u-flex u-gap8">
<button type="button" class="btn btn-primary" data-action="_dashCashProjResetSettings">↺ Reset ke Default</button>
</div>
`;
}
function _dashCashProjSetKirimanVal(){
const el=document.getElementById('dashCashProjKirimanVal');
const v=el?parseInt(el.value,10):0;
if(D.profile)D.profile.kiriman=(Number.isFinite(v)&&v>=0)?v:0;
if(typeof save==='function')save();
_dashCashProjRefreshAll();
}
function _dashCashProjSetIncludeKiriman(){
const el=document.getElementById('dashCashProjIncludeKiriman');
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.set({includeKiriman:!!(el&&el.checked)});
_dashCashProjRefreshAll();
}
function _dashCashProjSetIncludePendingGaji(){
const el=document.getElementById('dashCashProjIncludePending');
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.set({includePendingGaji:!!(el&&el.checked)});
_dashCashProjRefreshAll();
}
function _dashCashProjSetSurplusMonths(){
const el=document.getElementById('dashCashProjSurplusMonths');
const v=el?parseInt(el.value,10):NaN;
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.set({surplusMonths:(Number.isFinite(v)&&v>=1)?v:null});
_dashCashProjRefreshAll();
}
function _dashCashProjSetBillWindowMode(mode){
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.set({billWindowMode:mode});
_dashCashProjRefreshAll();
}
function _dashCashProjSetCycleDay(){
const el=document.getElementById('dashCashProjCycleDay');
const v=el?parseInt(el.value,10):16;
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.set({cycleStartDay:(Number.isFinite(v)&&v>=1&&v<=28)?v:16});
_dashCashProjRefreshAll();
}
function _dashCashProjResetSettings(){
if(typeof CashflowProjSettings!=='undefined')CashflowProjSettings.reset();
_dashCashProjRefreshAll();
if(typeof toast==='function')toast('↺ Pengaturan proyeksi kas direset');
}
// _dashCashProjRefreshAll() — re-render kartu ini + isi ulang panel kalau lg kebuka, LALU
// (S667B) ikut refresh kartu "Proyeksi Pemasukan/Pengeluaran/Saldo Kas" satunya juga kalau
// ada di halaman -- 1 setting dipakai 2 kartu, jadi harus sinkron 2 arah (lihat juga
// perubahan simetris di CashFlowProjectionPresenter._applySettings/resetSettings,
// cashflow-projection-presenter.js).
function _dashCashProjRefreshAll(){
_renderCashProjectionCard();
const panel=document.getElementById('dashCashProjSettingsPanel');
if(panel&&!panel.classList.contains('u-dnone'))_dashCashProjFillSettingsPanel(panel);
if(typeof CashFlowProjectionPresenter!=='undefined')CashFlowProjectionPresenter.render();
}
function _renderCashProjectionCard(ctx){
const el=document.getElementById('dashCashProjBody');
if(!el)return;
_dashCashProjSettingsToggle(el);
if(typeof getMonthlyCashProjection!=='function'){el.innerHTML='<div class="u-fs12 u-t2">Modul proyeksi kas belum dimuat.</div>';return;}
const cfg=(typeof CashflowProjSettings!=='undefined')?CashflowProjSettings.get():{};
const r=getMonthlyCashProjection(ctx&&ctx.m,ctx&&ctx.y,{billWindowMode:cfg.billWindowMode,cycleStartDay:cfg.cycleStartDay,includeKiriman:cfg.includeKiriman,includePendingGaji:cfg.includePendingGaji});
const kasCls=r.proyeksiKas<0?'red':'green';
let inc,exp;
if(ctx&&ctx.inc!=null&&ctx.exp!=null){
inc=ctx.inc;exp=ctx.exp;
}else{
const now=new Date();
const y=(ctx&&ctx.y!=null)?ctx.y:now.getFullYear();
const m=(ctx&&ctx.m!=null)?ctx.m:now.getMonth();
const txM=(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
inc=txM.filter(t=>t.type==='income'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
exp=txM.filter(t=>t.type==='expense'&&t.hitungKas!==false).reduce((s,t)=>s+t.amount,0);
}
let surplusHtml='';
if(typeof fiMonthlySurplus==='function'){
try{
const surplusMonthsOverride=cfg.surplusMonths;
const surplus=fiMonthlySurplus(surplusMonthsOverride);
const surplusMonths=surplusMonthsOverride||((typeof FI!=='undefined'&&typeof FI.effectiveMonths==='function')?FI.effectiveMonths():null);
const surplusCls=surplus<0?'red':'green';
surplusHtml=`
<div class="u-tac u-mt10 divider-top">
<div class="u-fs11 u-t2">Rata-rata Surplus Bulanan${surplusMonths?` (${surplusMonths} bln terakhir)`:''}</div>
<div class="stat-val ${surplusCls} u-fs16">${fmtFullSigned(surplus)}</div>
<div class="u-fs10 u-t2 u-mt4">Beda dari "Proyeksi Kas" di atas: ini rata-rata pemasukan−pengeluaran kas riil selama beberapa bulan terakhir, bukan bulan kalender berjalan saja -- wajar kalau angkanya tidak sama.</div>
</div>`;
}catch(e){console.warn('_renderCashProjectionCard: gagal hitung surplus rata-rata',e);}
}
el.innerHTML=`
<div class="grid2 u-mb10">
<div class="stat-box u-pointer" onclick="_dashCashProjOpenDetail()"><div class="stat-label">Proyeksi Gaji</div><div class="stat-val u-fs14">${fmtFull(r.gajiProjected)}</div></div>
<div class="stat-box u-pointer" onclick="_dashCashProjOpenDetail()"><div class="stat-label">Sisa Kewajiban</div><div class="stat-val u-fs14">${fmtFull(r.kewajibanSisa)}</div></div>
<div class="stat-box u-pointer" onclick="showFilteredTx('dashboard','income','Pemasukan Bulan Ini')"><div class="stat-label">Pemasukan Bulan Ini</div><div class="stat-val u-fs14 green">${fmtFull(inc)}</div></div>
<div class="stat-box u-pointer" onclick="showFilteredTx('dashboard','expense','Pengeluaran Bulan Ini')"><div class="stat-label">Pengeluaran Bulan Ini</div><div class="stat-val u-fs14 red">${fmtFull(exp)}</div></div>
</div>
<div class="stat-box u-pointer u-mb10" onclick="_dashCashProjOpenDetail()"><div class="stat-label">Kiriman Mingguan (Estimasi)</div><div class="stat-val u-fs14">${fmtFull(r.kirimanEstimate)}</div></div>
<div class="u-tac">
<div class="u-fs11 u-t2">Proyeksi Kas Bulan Ini</div>
<div class="stat-val ${kasCls} u-fs20">${fmtFullSigned(r.proyeksiKas)}</div>
</div>
${surplusHtml}
<div class="u-tac u-mt6">
<button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('dashCashProjDetailBody').classList.toggle('u-dnone')">Detail ▾</button>
</div>
<div id="dashCashProjDetailBody" class="u-dnone u-mt8">
<div class="grid2 u-mb8">
<div class="stat-box u-pointer" onclick="showFilteredTx('dashboard','gaji','Gaji Tercatat Bulan Ini')"><div class="stat-label">Gaji Tercatat</div><div class="stat-val u-fs12">${fmtFull(r.recordedGaji)}</div></div>
<div class="stat-box u-pointer" onclick="_dashCashProjGoToAbsensi()"><div class="stat-label">Gaji Pending</div><div class="stat-val u-fs12">${fmtFull(r.pendingGajiEstimate)}</div></div>
<div class="stat-box u-pointer" onclick="_dashCashProjGoToTagihan()"><div class="stat-label">Total Kewajiban</div><div class="stat-val u-fs12">${fmtFull(r.billMonthTotal)}</div></div>
<div class="stat-box u-pointer" onclick="_dashCashProjGoToTagihan()"><div class="stat-label">Sudah Dibayar</div><div class="stat-val u-fs12">${fmtFull(r.billPaidThisPeriod)}</div></div>
</div>
<div class="u-fs11 u-t2 u-tac">Kiriman Mingguan: ${fmtFull(r.kirimanPerMinggu)} × ${r.weeksInMonth} minggu (setting Pengaturan → Profil) = ${fmtFull(r.kirimanEstimate)}${r.includeKiriman?'':' (tidak disertakan ke Proyeksi Kas)'}</div>
${r.includePendingGaji?'':'<div class="u-fs11 u-t2 u-tac u-mt4">Gaji Pending tidak disertakan ke Proyeksi Gaji</div>'}
</div>`;
}
// _dashCashProjOpenDetail() — buka + scroll ke bagian Detail kartu ini (Proyeksi Gaji/
// Sisa Kewajiban/Kiriman Mingguan sudah punya breakdown-nya sendiri DI DALAM kartu,
// jadi klik cukup expand+scroll ke situ, TIDAK perlu modal baru — sesuai keputusan user).
function _dashCashProjOpenDetail(){
const body=document.getElementById('dashCashProjDetailBody');
if(!body)return;
body.classList.remove('u-dnone');
body.scrollIntoView({behavior:'smooth',block:'nearest'});
}
// _dashCashProjGoToAbsensi()/_dashCashProjGoToTagihan() — "Gaji Pending" sumbernya
// D.workDays (belum di-reset), bukan daftar transaksi; "Total Kewajiban"/"Sudah Dibayar"
// sumbernya D.bills — keduanya BUKAN tab Uang, jadi diarahkan ke halaman asalnya lewat
// dashHubNavigateToFeature() yang sudah ada (0 navigasi baru dibuat).
function _dashCashProjGoToAbsensi(){
if(typeof dashHubNavigateToFeature==='function')dashHubNavigateToFeature({page:'dashboard-hub',dashKey:'absensi',goTo:'dashAbsensiCard'});
}
function _dashCashProjGoToTagihan(){
if(typeof dashHubNavigateToFeature==='function')dashHubNavigateToFeature({page:'keuangan',tab:'tagihan'});
}

const DASH_CARD_DEFS=[
{key:'fi',label:'🎯 Kebebasan Finansial',elId:'dashFiCard',render:()=>renderFinancialFreedom()},
{key:'cashProjection',label:'💰 Proyeksi Kas Bulan Ini',elId:'dashCashProjCard',render:(ctx)=>_renderCashProjectionCard(ctx)},
{key:'pensiun',label:'🏖️ Dana Pensiun',elId:'dashPensiunCard',render:()=>Pensiun.renderDashMini()},
{key:'absensi',label:'📅 Absensi Harian',elId:'dashAbsensiCard',render:()=>Payroll.renderDashMini()},
{key:'refleksi',label:'🌱 Refleksi & Self-Care',elId:'refleksiCard',render:()=>Refleksi.renderDashCard()},
];
// Urutan render sesungguhnya di Beranda (beda dari urutan checklist Pengaturan di
// DASH_CARD_DEFS). Dipisah dari DASH_CARD_DEFS supaya menambah/menyusun ulang checklist
// Pengaturan tidak diam-diam mengubah urutan tampilan Beranda, begitu juga sebaliknya.
const DASH_RENDER_ORDER=['fi','cashProjection','pensiun','absensi','refleksi'];
const DASH_CARD_BY_KEY={};
DASH_CARD_DEFS.forEach(c=>{DASH_CARD_BY_KEY[c.key]=c;});
function isDashCardOn(key){
return !(D.dashCardPrefs && D.dashCardPrefs[key]===false);
}
function hideDashCardEl(elId){
const el=document.getElementById(elId);
if(!el)return;
el.classList.add('u-dnone');
el.style.display='none';
}
// BUGFIX (kartu Beranda tidak muncul lagi setelah dimatikan lalu dinyalakan
// ulang lewat Pengaturan -> Tampilan -> Kartu di Beranda): hideDashCardEl()
// di atas menyembunyikan elemen lewat DUA jalur -- classList 'u-dnone' DAN
// inline style.display='none'. toggleDashCardPref(key,true)/setAllDashCardPrefs(true)
// sudah benar memanggil save()+renderDashboard() ulang, dan loop di bawah
// (DASH_RENDER_ORDER) sudah benar SKIP hideDashCardEl() begitu isDashCardOn()
// balik jadi true -- tapi TIDAK ADA fungsi kebalikan yang pernah dipanggil
// utk melepas inline style.display='none' yang sudah kadung ditulis
// hideDashCardEl() sebelumnya. Inline style attribute punya spesifisitas
// LEBIH TINGGI dari class CSS apa pun (termasuk kalau .u-dnone dilepas
// lewat classList.remove yang sudah benar), jadi elemen TETAP invisible
// selama-lamanya sampai reload penuh SPA, walau checkbox Pengaturan &
// D.dashCardPrefs sudah benar menunjukkan "aktif". showDashCardEl() ini
// murni kebalikan simetris hideDashCardEl() (0 fungsi lama diubah) --
// dipanggil di loop DASH_RENDER_ORDER di bawah, tiap render normal
// (bukan cuma sesudah toggle), supaya idempotent & aman dipanggil berkali-kali.
function showDashCardEl(elId){
const el=document.getElementById(elId);
if(!el)return;
el.classList.remove('u-dnone');
el.style.display='';
}
function renderDashCardPrefsUI(){
const wrap=document.getElementById('dashCardPrefsList');
if(!wrap)return;
wrap.innerHTML=`<div class="u-flex u-gap8 u-mb10">
      <button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="setAllDashCardPrefs(true)">✅ Aktifkan Semua</button>
      <button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="setAllDashCardPrefs(false)">🚫 Matikan Semua</button>
    </div>`
+DASH_CARD_DEFS.map(c=>`
    <div class="setting-item">
      <div class="setting-label">${c.label}</div>
      <label class="tgl-switch"><input type="checkbox" ${isDashCardOn(c.key)?'checked':''} onchange="toggleDashCardPref('${c.key}',this.checked)"><span class="tgl-track"></span></label>
    </div>`).join('');
}
function setAllDashCardPrefs(on){
if(!D.dashCardPrefs)D.dashCardPrefs={};
DASH_CARD_DEFS.forEach(c=>{if(on)delete D.dashCardPrefs[c.key];else D.dashCardPrefs[c.key]=false;});
save();
renderDashCardPrefsUI();
if(document.getElementById('page-dashboard-hub'))renderDashboard();
}
function toggleDashCardPref(key,checked){
if(!D.dashCardPrefs)D.dashCardPrefs={};
if(checked)delete D.dashCardPrefs[key]; else D.dashCardPrefs[key]=false;
save();
if(document.getElementById('page-dashboard-hub'))renderDashboard();
}

