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
// S468b (lanjutan s468-PLAN-virtual-bill-item-tx-list.md, s471a):
// item virtual tagihan (dari generateVirtualBillItemsForMonth(), lihat
// tagihan-kalender.js) dikirim ke txHTML() lewat array section terpisah
// (bukan D.transactions/sorted/visible -- s468c). Router murni pakai
// prefix eksplisit 'vbill_' di id, jadi TIDAK perlu cross-check ke D.bills
// tiap kali. Klik kartu -> openBillModal(billId asli, hasil strip prefix),
// tombol 🗑 diganti non-fungsional (data-action kosong via bill id null,
// lihat cabang khusus di delTx()) supaya tidak memicu dialog "Hapus
// transaksi?" yang menyesatkan (poin bahaya #2 di plan).
function txHTML(t){
if(t&&t.virtual&&String(t.id).startsWith('vbill_')){
const cats=getAllCats();
const cat=cats.find(c=>c.name===t.category);
const icon=cat?cat.emoji:'⏳';
return`<div class="tx-item u-pointer" data-action="openBillModal" data-args="${escapeHtml(JSON.stringify([t.billId]))}">
    <div class="tx-icon" style="background:var(--accent-soft)">${icon}</div>
    <div class="tx-info"><div class="tx-name">${escapeHtml(t.name)} <span class="acc-chip">⏳ Terjadwal</span></div><div class="tx-meta">${t.date}</div></div>
    <div class="u-flex u-aic u-gap6">
      <div class="tx-amount red">-${fmt(t.amount)}</div>
    </div>
  </div>`;
}
const cats=getAllCats();
let icon='💰', bg='var(--accent-soft)';
if(t.type==='transfer_out'||t.type==='transfer_in'){icon='⇄';bg='var(--accent-soft)';}
else { const cat=cats.find(c=>c.name===t.category); if(cat){icon=cat.emoji;} bg=t.type==='income'?'var(--accent3-soft)':'var(--accent2-soft)'; }
const sign=(t.type==='income'||t.type==='transfer_in')?'+':'-';
const cls=(t.type==='income'||t.type==='transfer_in')?'green':'red';
const acc=D.accounts.find(a=>a.id===t.accountId);
const subText=t.subcategory?(' · '+t.subcategory):'';
// FIX (BUG-004, TODO.md — Bill/Piutang/Debt audit 2026-08-01): kind
// 'tagihan'/'utang' belum terdaftar di sini (dropdown filter `#kfMethod`
// di index.html SUDAH punya opsi 🧾 Tagihan/📕 Utang sejak sebelumnya —
// cuma badge kartu transaksi ini yang ketinggalan), jadi badge payMethod
// utk transaksi bayar Tagihan/Utang (dari markBillPaid(), payMethod:b.kind
// bisa 'tagihan'/'utang' selain 'cicilan'/'langganan') tampil TANPA ikon
// (pmIcons[t.payMethod]||'' jatuh ke string kosong). Ikon disamakan persis
// dgn yang dipakai opsi dropdown #kfMethod (🧾/📕) supaya konsisten 1
// sumber makna di seluruh app.
const pmIcons={cicilan:'💳',langganan:'🔁',tagihan:'🧾',utang:'📕',tunai:''};
const pmBadge=(t.payMethod&&t.payMethod!=='tunai')?` <span class="acc-chip">${pmIcons[t.payMethod]||''} ${t.payMethod}</span>`:'';
// Sesi 394: badge "👥 N pemilik" di judul + rincian pembagian per pemilik di
// tx-meta, kalau transaksi ini dikaitkan ke aset multi-owner (t.assetId,
// lihat resolveTxAssetSplit() di transaksi.js -- 0 kalkulasi baru di sini).
// Guard typeof resolveTxAssetSplit: aman kalau transaksi.js belum dimuat
// (urutan build.js) atau fitur belum ada -- badge/rincian cuma tidak tampil,
// bukan error.
const assetSplit=(t.assetId&&typeof resolveTxAssetSplit==='function')?resolveTxAssetSplit(t):null;
const ownerBadge=(assetSplit&&assetSplit.ok)?` <span class="acc-chip">👥 ${assetSplit.splits.length} pemilik</span>`:'';
const ownerSplitLine=(assetSplit&&assetSplit.ok)?`<div class="tx-meta">👥 ${assetSplit.splits.map(s=>escapeHtml(s.ownerName)+': '+fmt(s.bagian)).join(' · ')}</div>`:'';
// Sesi T3 (RENCANA-KERJA-toggle-hitungkas-dan-proyeksi-kas.md Track 1, lanjutan Sesi T1
// tx.hitungKas): badge "📝 Catatan saja" utk transaksi yg SENGAJA di-skip dari saldo akun
// (Sesi T1, recalcAccBalance()) & Pemasukan/Pengeluaran Dashboard (Sesi T2, _dashMonthlyIncExp())
// -- murni presentasi, 0 logic hitung apa pun di sini, cuma nampilin status yg SUDAH ditentukan
// t.hitungKas===false biar user tidak bingung kenapa transaksi ini "menghilang" dari saldo/laporan.
// Scope T3 HANYA txHTML() (dipakai 10 tema lama) sesuai rencana kerja -- txTableRowHTML() (tema
// "modern"/Ledger Pro, S637) SENGAJA tidak disentuh sesi ini, dicicil terpisah kalau diperlukan.
const hitungKasBadge=t.hitungKas===false?' <span class="acc-chip">📝 Catatan saja</span>':'';
// S574-E: badge "👤 Ditanggung: <nama owner>" di riwayat -- MURNI PRESENTASI,
// tidak menghitung/split nominal apa pun (beda domain dari assetSplit di
// atas, lihat AUDIT-S574-PEMILIK-SUMBER-POTONGAN.md §2.5/§7 -- assetId tetap
// relasi riwayat, deductionOwnerId adalah domain akun/pemilik-penanggung yang
// terpisah). Transaksi lama tanpa t.deductionOwnerId -> baris ini tetap
// kosong, tampilan tx-item TIDAK berubah sama sekali (backward compatible).
//
// S579 FIX (DL-Next-6, source-mismatch lanjutan DL-Next-1/S578 -- lihat
// DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md &
// AUDIT-8-11-OWNER-RESOLVER-POST-DL-NEXT-1.md §Audit-9): basis lookup nama
// diganti dari getAccOwners()/acc.owners (KEDUANYA cuma baca
// acc.owners[]/acc.ownership, buta terhadap aset tertaut) ke
// resolveOwnerDefaultForAccount(t.accountId) -- SUMBER SAMA PERSIS yang
// dipakai guard validasi di _saveTxInner() (S578) & UI
// updateTxDeductionOwnerVisibility() (Res-C). Sebelum fix ini, transaksi
// yang deductionOwnerId-nya berasal dari source:'asset' (akun tanpa
// acc.owners[] sendiri, tertaut aset multi-owner) tidak pernah ketemu
// namanya di sini -> badge kosong walau data tersimpan benar. Guard typeof
// tetap dipertahankan (aman kalau transaksi.js belum dimuat/urutan
// build.js berubah, badge cuma tidak tampil, bukan error).
let deductionOwnerLine='';
if(t.deductionOwnerId){
let ownerName=null;
if(typeof resolveOwnerDefaultForAccount==='function'){
const resolved=resolveOwnerDefaultForAccount(t.accountId);
if(resolved&&resolved.ok){
const ownerMatch=(resolved.owners||[]).find(o=>String(o.ownerId)===String(t.deductionOwnerId));
if(ownerMatch)ownerName=ownerMatch.ownerName;
}
}
if(!ownerName&&typeof getAccOwners==='function'){
const ownRes=getAccOwners(t.accountId);
if(ownRes&&ownRes.ok){
const ownerMatch=(ownRes.owners||[]).find(o=>String(o.ownerId)===String(t.deductionOwnerId));
if(ownerMatch)ownerName=ownerMatch.ownerName;
}
}
if(!ownerName&&acc&&Array.isArray(acc.owners)){
const ownerMatch=acc.owners.find(o=>String(o.ownerId)===String(t.deductionOwnerId));
if(ownerMatch)ownerName=ownerMatch.ownerName;
}
if(ownerName)deductionOwnerLine=`<div class="tx-meta">👤 Ditanggung: ${escapeHtml(ownerName)}</div>`;
}
return`<div class="tx-item u-pointer" data-action="editTx" data-args="${escapeHtml(JSON.stringify([t.id]))}">
    <div class="tx-icon" style="background:${bg}">${icon}</div>
    <div class="tx-info"><div class="tx-name">${escapeHtml(t.category)}${escapeHtml(subText)}${ownerBadge}${hitungKasBadge}</div><div class="tx-meta">${t.date}${t.note?' · '+escapeHtml(t.note):''}${acc?` <span class="acc-chip">${acc.emoji} ${escapeHtml(acc.name)}</span>`:''}${pmBadge}</div>${ownerSplitLine}${deductionOwnerLine}</div>
    <div class="u-flex u-aic u-gap6">
      <div class="tx-amount ${cls}">${sign}${fmt(t.amount)}</div>
      <button class="tx-del" data-stop="1" data-action="delTx" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button>
    </div>
  </div>`;
}
// txTableRowHTML/txTableHTML — S637 (RENCANA-MODERNISASI-UI.md, tema
// "modern"/Ledger Pro). Jalur render BARU, ADDITIF -- txHTML() di atas 0
// disentuh, tetap dipakai apa adanya utk 10 tema lama. Dipanggil dari
// renderKeuangan() (modules-render.js) HANYA saat D.profile.theme==='modern',
// menggantikan visible.map(txHTML) utk container #allTx.
// Cakupan sesi ini: HANYA tab Uang (#allTx). Riwayat (filterTxList) & Dana
// Titipan sengaja TIDAK disentuh (rencana bertahap, sesi terpisah).
// Item virtual tagihan (vbill_*, #allTxVirtualBills) TIDAK lewat sini --
// tetap dirender via txHTML() apa adanya di jalur terpisah (bukan transaksi
// riil, tidak boleh ikut hitungan saldo berjalan).
// Kolom "Saldo" (saldo berjalan) HANYA muncul kalau balMap diisi (dipanggil
// dgn accId spesifik, bukan "Semua Akun") -- keputusan user: saldo berjalan
// lintas-akun (gabungan kas+bank+e-wallet dst) tidak bermakna secara
// finansial, jadi kolom itu sengaja disembunyikan total (bukan ditampilkan
// "0"/keliru) saat filter Akun = Semua Akun.
function txTableRowHTML(t,balAfter){
const cats=getAllCats();
let icon='💰';
if(t.type==='transfer_out'||t.type==='transfer_in')icon='⇄';
else{const cat=cats.find(c=>c.name===t.category);if(cat)icon=cat.emoji;}
const sign=(t.type==='income'||t.type==='transfer_in')?'+':'-';
const cls=(t.type==='income'||t.type==='transfer_in')?'green':'red';
const acc=D.accounts.find(a=>a.id===t.accountId);
const subText=t.subcategory?(' · '+t.subcategory):'';
const pmIcons={cicilan:'💳',langganan:'🔁',tagihan:'🧾',utang:'📕',tunai:''};
const pmBadge=(t.payMethod&&t.payMethod!=='tunai')?` <span class="acc-chip">${pmIcons[t.payMethod]||''} ${t.payMethod}</span>`:'';
const assetSplit=(t.assetId&&typeof resolveTxAssetSplit==='function')?resolveTxAssetSplit(t):null;
const ownerBadge=(assetSplit&&assetSplit.ok)?` <span class="acc-chip">👥 ${assetSplit.splits.length} pemilik</span>`:'';
const saldoCell=(balAfter!==undefined&&balAfter!==null)?`<td class="tx-amount tx-tbl-saldo num">${fmt(balAfter)}</td>`:'';
return`<tr class="tx-tbl-row u-pointer" data-action="editTx" data-args="${escapeHtml(JSON.stringify([t.id]))}">
    <td class="tx-tbl-date">${t.date}</td>
    <td class="tx-tbl-desc"><div class="tx-name">${icon} ${escapeHtml(t.category)}${escapeHtml(subText)}${ownerBadge}</div><div class="tx-meta">${t.note?escapeHtml(t.note)+' · ':''}${acc?`<span class="acc-chip">${acc.emoji} ${escapeHtml(acc.name)}</span>`:''}${pmBadge}</div></td>
    <td class="tx-amount ${cls} num">${sign}${fmt(t.amount)}</td>
    ${saldoCell}
    <td class="tx-tbl-del"><button class="tx-del" data-stop="1" data-action="delTx" data-args="${escapeHtml(JSON.stringify([t.id]))}" aria-label="Hapus">🗑</button></td>
  </tr>`;
}
function txTableHTML(items,accIdForBalance){
const balMap=accIdForBalance&&typeof computeAccRunningBalances==='function'?computeAccRunningBalances(accIdForBalance):null;
const showSaldo=!!balMap;
return`<div class="tx-tbl-wrap"><table class="tx-tbl"><thead><tr><th>Tanggal</th><th>Uraian</th><th class="num">Nominal</th>${showSaldo?'<th class="num">Saldo</th>':''}<th></th></tr></thead><tbody>${items.map(t=>txTableRowHTML(t,balMap?balMap.get(t.id):undefined)).join('')}</tbody></table></div>`;
}
// BUGFIX (Bug E, s633, lihat AUDIT-s632-bugE-renovasi-delete-cascade.md):
// diekstrak APA ADANYA (0 perubahan logika/urutan/pesan toast) dari badan
// delTx() -- cascade bbmLinkId/partStockId/stockItems/stockProductId/
// cobekLinkId/servisLinkId/renovItemLinkId/wishlistLinkId/sewaKiosLinkId/
// tukangPaymentEntryIds SEKARANG jadi SATU SSOT yang dipakai delTx() (jalur
// List Transaksi) DAN Renov.deleteItem() (jalur hapus item langsung dari UI
// Renovasi, modules/home/renovasi.js) -- sebelum sesi ini Renov.deleteItem()
// menghapus transaksi terkait langsung lewat D.transactions=D.transactions.
// filter(...) TANPA menjalankan cascade ini sama sekali (Bug E: stok
// sparepart/servis/BBM jadi orphan). titipanLinkId & billLinkId SENGAJA
// TIDAK diikutkan di sini (tetap inline di delTx()) -- transaksi yang sudah
// billLinkId/titipan-linked TIDAK BISA dihubungkan ke item Renov lewat
// LinkTx (lihat LinkTx._getFiltered(), linktx.js), jadi kombinasi itu tidak
// pernah terjadi utk transaksi renovItemLinkId -- 0 scope creep di luar
// Bug E.
// opts.skipRenovCascade: dipakai Renov.deleteItem() supaya TIDAK memanggil
// Renov.onLinkedTxDeleted(t) balik ke dirinya sendiri -- onLinkedTxDeleted()
// cuma mereset status lunas item (paid=false/txId=null), yang PERCUMA &
// berpotensi konflik krn item itu SENDIRI sedang dihapus total oleh
// pemanggil (p.items=p.items.filter(...) tepat setelah cascade ini
// selesai) -- lihat komentar di Renov.deleteItem().
function runTxDeleteCascades(t,opts){
opts=opts||{};
if(t&&t.bbmLinkId&&D.bbmLogs)D.bbmLogs=D.bbmLogs.filter(b=>b.id!==t.bbmLinkId);
if(t&&t.partStockId&&typeof revertStockPurchase==='function'){
revertStockPurchase(t.partStockId,t.partStockQty,t.id);
toast(`📦 Stok sparepart dikurangi (transaksi dihapus)`,2600);
renderStockList();
}
if(t&&t.stockItems&&t.stockItems.length){
t.stockItems.forEach(si=>{
const p=D.products.find(x=>x.id===si.productId);
if(p){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(p,-(si.qty||0));else p.stock=Math.max(0,(p.stock||0)-(si.qty||0));}
});
toast(`📦 Stok dikurangi (transaksi dihapus)`,2600);
} else if(t&&t.stockProductId){
const p=D.products.find(x=>x.id===t.stockProductId);
if(p){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(p,-(t.stockQty||0));else p.stock=Math.max(0,(p.stock||0)-(t.stockQty||0));toast(`📦 Stok "${p.name}" dikurangi ${t.stockQty} (transaksi dihapus)`,2600);}
}
if(t&&t.cobekLinkId){
const linkedShop=D.cobek.find(c=>c.id===t.cobekLinkId);
if(linkedShop&&linkedShop.items){
linkedShop.items.forEach(it=>{const p=D.products.find(x=>x.id===it.productId);if(p){if(typeof ProductRepository!=='undefined')ProductRepository.mutateStockDelta(p,it.qty);else p.stock=(p.stock||0)+it.qty;}});
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
if(t&&t.renovItemLinkId&&typeof Renov!=='undefined'&&!opts.skipRenovCascade){
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
// FIX (audit s-async-ownership lanjutan): cascade BARU -- sebelumnya
// `investmentTxLinkId` (dibuat Investment.addTransaction() saat Beli/Jual
// pakai "Akun Sumber Dana", modules/asset/investasi.js) TIDAK PERNAH dibaca
// di manapun. Kalau transaksi Keuangan yang ditautkan dihapus dari SINI
// (Transaksi/Cashflow, bukan dari layar Investasi), tx investasi (D.investmentTx)
// & holding-nya (unit/avgPrice) tetap seolah pembelian/penjualan itu terjadi --
// desync permanen antara Akun & Holding Investasi (saldo akun sudah balik,
// tapi unit investasi tidak). Fix: cascade SAMA PERSIS pola cobekLinkId/
// servisLinkId di atas -- hapus tx investasi terkait & recomputeHolding()
// (fungsi yang SUDAH ADA, 0 rumus baru, sumber kebenarannya tetap 100%
// riwayat D.investmentTx sisa).
if(t&&t.investmentTxLinkId&&typeof Investment!=='undefined'&&D.investmentTx){
const linkedInvTx=D.investmentTx.find(it=>it.id===t.investmentTxLinkId);
if(linkedInvTx){
D.investmentTx=D.investmentTx.filter(it=>it.id!==t.investmentTxLinkId);
if(linkedInvTx.type==='beli'||linkedInvTx.type==='jual'){
Investment.recomputeHolding(linkedInvTx.investmentId);
}
toast(`📈 Transaksi investasi terkait ikut dihapus & holding disesuaikan`,2600);
}
}
}
async function delTx(id){
// S468b guard (defense in depth, lihat poin bahaya #2 di
// s468-PLAN-virtual-bill-item-tx-list.md): id item virtual tagihan
// (prefix 'vbill_', lihat txHTML()) BUKAN transaksi asli -- kalau
// ke-trigger (mis. race re-render, atau dipanggil langsung bukan lewat
// tombol yg sudah disembunyikan di txHTML()), JANGAN tampilkan dialog
// "Hapus transaksi?" yang menyesatkan (tidak ada apa pun yang akan
// terhapus). Guard di baris PERTAMA, sebelum askConfirm() dipanggil.
if(String(id).startsWith('vbill_')){toast('Tagihan ini belum dibayar');return;}
if(!await askConfirm('Hapus transaksi ini?'))return;
const t=D.transactions.find(x=>x.id===id);
// SESI 432 (audit fitur Transfer Antar Akun): transfer_out/transfer_in
// SEKARANG dibuat berpasangan lewat `transferPairId` (baru, lihat
// tx-transfer.js saveTransfer()) -- sebelum sesi ini, delTx() cuma
// menghapus 1 baris transaksi yg diklik, jadi kalau salah satu kaki
// transfer dihapus, kaki satunya jadi ORPHAN (saldo akun tujuan/asal
// jadi pincang permanen krn transaksi lawan pasangnya masih ada sendirian
// -- bug yg ditemukan audit, lihat FIX-*-s433-audit-fix-renov-edit-not-saving.md).
// Fix: kalau transaksi yg dihapus adalah salah satu kaki transfer & PUNYA
// transferPairId (transfer baru, dibuat setelah sesi ini), pasangannya
// (transferPairId sama, id beda) ikut dicari & dihapus BARENGAN.
// Transfer LAMA (dibuat sebelum sesi ini, belum punya field
// `transferPairId` sama sekali) TIDAK bisa dipasangkan otomatis -- 0 cara
// aman menebak pasangannya cuma dari amount/date/accountId (bisa salah
// pasang kalau ada transfer lain dgn nominal/tanggal sama) -- tetap
// berperilaku SAMA seperti sebelum sesi ini (hapus 1 sisi saja, TIDAK
// ada regresi utk data lama).
let pairedTx=null;
if(t&&(t.type==='transfer_out'||t.type==='transfer_in')&&t.transferPairId){
pairedTx=D.transactions.find(x=>x.id!==id&&x.transferPairId===t.transferPairId);
}
// S631 (Bug D fix, lihat AUDIT-s630-bugD-transfer-legacy-orphan.md §5.1
// Opsi A): transfer LEGACY tanpa transferPairId TIDAK bisa dipasangkan
// otomatis dgn aman -- heuristic amount+date+accountId TERBUKTI berisiko
// salah pasang kalau ada >1 transfer lain dgn nominal/tanggal kebetulan
// sama (lihat regression test 4 s630/s631, guard rail wajib tetap lolos).
// Daripada menebak & menghapus transaksi lain secara diam-diam, user
// diberi PERINGATAN eksplisit sebelum lanjut -- supaya sadar bahwa sisi
// pasangannya TIDAK akan ikut terhapus & tidak bisa dipastikan otomatis.
// Kalau user membatalkan di sini, TIDAK ADA apa pun yang terhapus (0
// mutasi D.transactions) -- non-destruktif, keputusan tetap di tangan
// user, 0 heuristic auto-pairing baru diciptakan.
if(t&&(t.type==='transfer_out'||t.type==='transfer_in')&&!t.transferPairId){
if(!await askConfirm('⚠️ Ini transfer lama (legacy) tanpa penanda pasangan otomatis. Sisi pasangannya TIDAK akan ikut terhapus dan tidak bisa dipastikan otomatis — cek & sesuaikan akun pasangan secara manual jika perlu. Tetap hapus transaksi ini?'))return;
}
runTxDeleteCascades(t);
// Sesi 519 (LANJUTKAN-S519, Design Lock S518 §7 "tx-list-cashflow.js —
// DELETE PATH", scope expansion resmi — DELETE cascade Dana Titipan
// SENGAJA ditaruh di sini, BUKAN transaksi.js, krn delTx() ada di file
// ini). Pola SAMA PERSIS cascade *LinkId di atas (bbmLinkId/cobekLinkId/
// servisLinkId dst): kalau transaksi yang dihapus punya `titipanLinkId`
// (talangan Dana Titipan, `piutang-utang.js` S519), piutang otomatisnya
// (`autoTxId===t.id`) dihapus HANYA kalau BELUM lunas -- piutang yang
// SUDAH lunas dipertahankan sbg historical record (Hard Invariant #19/#20,
// 100% reuse `removeUnpaidTitipanTalanganPiutangForTx()`, 0 cascade
// architecture baru ditulis di sini). 0 `recordReturn()`/transaksi
// kompensasi/perubahan `principalAmount`/`D.assets` (Design Lock S518 §7
// "JANGAN"). `usedTotal`/`available` (dana-titipan-portfolio-presenter.js
// build()) otomatis turun sendiri begitu `t` hilang dari
// `D.transactions` di baris filter di bawah -- TIDAK ada counter manual
// yang perlu di-decrement di sini (Hard Invariant #21/#22).
if(t&&t.titipanLinkId&&typeof removeUnpaidTitipanTalanganPiutangForTx==='function'){
removeUnpaidTitipanTalanganPiutangForTx(t.id);
}
// FIX (audit lanjutan "tablist sync Dana Titipan", bug sekelas ke-5):
// titipanLinkId adalah SATU-SATUNYA cascade *LinkId di fungsi ini yang
// TIDAK memanggil render modulnya sendiri (bandingkan cobekLinkId ->
// renderShop(), servisLinkId -> renderStockList(), renovItemLinkId ->
// Renov.onLinkedTxDeleted(), dst di atas). Komentar Sesi 519 di atas
// cuma menjamin KEBENARAN data (`usedTotal`/`available` otomatis benar
// di render berikutnya) -- bukan REFRESH tampilan. Kalau tx yg dihapus
// dibuat lewat modal Pengeluaran Dana Titipan (titipan-expense-flow.js,
// type:'expense'), baris "Estimasi dari Transaksi <Akun>" di kartu owner
// (_expenseComparisonForOwner(), Sesi C/S597) ikut berubah -- tapi kalau
// dihapus dari sini (list transaksi umum, bukan tombol khusus Dana
// Titipan), kartu yg sedang dilihat user (#danaTitipanTabList) tidak
// ter-refresh sampai pindah tab/reload. Sync eksplisit, pola PERSIS
// sama dgn cascade lain di atas, 0 logic baru.
if(t&&t.titipanLinkId){
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
}
// BUGFIX (Bug A, audit DELETE transaksi pembayaran): delTx() TIDAK PERNAH
// memanggil revertBillFromDeletedTx(t) (tagihan-kalender.js) -- beda dari
// deleteBillHistoryTx() (jalur DELETE lain, modal 📋 Riwayat Pembayaran)
// yang SUDAH memanggilnya sejak sesi 291 (lihat komentar SSOT di definisi
// revertBillFromDeletedTx()). Akibatnya hapus transaksi pembayaran
// Tagihan/Cicilan/Langganan/Utang lewat tombol 🗑 di List Transaksi biasa
// TIDAK membalikkan sisaTenor/nextDue/reaktivasi arsip/saldo utang/auto-
// piutang "Ditanggung Bersama" -- data D.bills/D.billsArchive/D.debts/
// D.piutang jadi basi/nyangkut permanen. Fix: panggil fungsi SSOT yang
// SAMA PERSIS dipakai deleteBillHistoryTx(), guard typeof (pola sama
// cascade *LinkId lain di atas -- aman kalau tagihan-kalender.js belum
// dimuat/urutan build.js berubah). SENGAJA ditaruh SEBELUM baris filter
// D.transactions di bawah (bukan sesudah) -- revertBillFromDeletedTx()
// memanggil isLatestBillPaymentTx() yang re-scan D.transactions, harus
// dijalankan SAAT `t` masih ada di array supaya identik dgn urutan yang
// sudah terbukti benar di deleteBillHistoryTx() (0 logic baru ditulis di
// sini, 100% reuse).
let billRevert=null;
if(t&&t.billLinkId&&typeof revertBillFromDeletedTx==='function'){
billRevert=revertBillFromDeletedTx(t);
if(typeof renderBillList==='function')renderBillList();
if(typeof checkBills==='function')checkBills();
if(billRevert&&billRevert.linkedBill&&billRevert.linkedBill.kind==='utang'&&typeof renderDebtList==='function')renderDebtList();
if(billRevert&&(billRevert.isLatest||billRevert.removedPiutang)){
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
}
if(billRevert&&billRevert.removedPiutang&&typeof Piutang!=='undefined')Piutang.renderList();
}
let billRevertMsg='';
if(billRevert&&billRevert.restoredFromArchive)billRevertMsg=' (tagihan diaktifkan lagi)';
else if(billRevert&&billRevert.isLatest&&billRevert.linkedBill&&billRevert.linkedBill.kind==='cicilan')billRevertMsg=' (sisa tenor dikembalikan)';
else if(billRevert&&billRevert.isLatest&&billRevert.linkedBill&&billRevert.linkedBill.kind==='utang')billRevertMsg=' (sisa utang dikembalikan)';
else if(billRevert&&billRevert.isLatest&&billRevert.linkedBill&&(billRevert.linkedBill.kind==='langganan'||billRevert.linkedBill.kind==='tagihan'))billRevertMsg=' (jatuh tempo dikembalikan)';
D.transactions=D.transactions.filter(x=>x.id!==id&&(!pairedTx||x.id!==pairedTx.id));
save();renderDashboard();renderKeuangan();renderCnTab();renderProductList();
if(pairedTx)toast('🗑 Transfer dihapus (2 sisi sekaligus, saldo kedua akun ikut disesuaikan)');
else if(!t||(!t.stockProductId&&!t.cobekLinkId&&!t.servisLinkId&&!t.partStockId&&!(t.stockItems&&t.stockItems.length)))toast('🗑 Dihapus'+(t&&t.renovItemLinkId?' (status lunas di Proyek Renovasi dibatalkan)':(t&&t.wishlistLinkId?' (barang dikembalikan ke Prioritas Belanja)':(t&&t.tukangPaymentEntryIds&&t.tukangPaymentEntryIds.length?' (absensi tukang terkait dibuka kembali)':billRevertMsg))));
}
function changeMonth(dir){
curMonth+=dir;
if(curMonth>11){curMonth=0;curYear++;}
if(curMonth<0){curMonth=11;curYear--;}
closeModal('filterTxModal');
txListPage=1;
// FIX (BUG-012, audit 2026-08): FinanceIntelligence men-cache hasil panggilan TANPA
// argumen eksplisit (mis. incomeVsExpense()/budgetSummary() bulan default -- lihat
// komentar _ivxCache/invalidateCache() di finance-intelligence.js), diinvalidate lewat
// hook yang sama dgn cache saldo akun (save()/renderPageContent()). changeMonth() ganti
// curMonth/curYear (bulan aktif yg jadi acuan default itu) TAPI tidak lewat salah satu
// hook itu -- dipanggil langsung dari tombol ‹ › navigasi bulan, cuma renderKeuangan().
// Akibatnya kartu turunan yang baca FinanceIntelligence tanpa argumen (mis. "Skor
// Kesehatan Finansial") tetap nampilin angka cache bulan SEBELUMNYA sampai ada
// save()/pindah halaman berikutnya yang kebetulan invalidate cache-nya. Invalidate
// eksplisit di sini, pola sama renderPageContent() -- 0 cache baru, cuma dipanggil juga
// di titik ganti-bulan ini.
if(typeof FinanceIntelligence!=='undefined'&&typeof FinanceIntelligence.invalidateCache==='function')FinanceIntelligence.invalidateCache();
renderKeuangan();
}
// BUGFIX (audit menyeluruh "tab nav tidak respon"): tombol ‹ › month-nav di kartu "📋 Semua
// Transaksi" (index.html) sudah lama pakai data-action="changeTxListMonth", tapi fungsinya
// TIDAK PERNAH ditulis di manapun -- tombol mati total, tanpa error (data-action dispatcher
// diam-diam no-op kalau nama fungsinya tidak ada). txListMonthLabel sudah baca curMonth/curYear
// yang SAMA dgn monthLabel (lihat renderKeuangan(), modules-render.js), jadi alias tipis ke
// changeMonth() (0 logic baru) sudah cukup -- persis pola setCobekTab->setShopTab.
function changeTxListMonth(dir){return changeMonth(dir);}
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
const KEU_TAB_ORDER=['kelola','tagihan','budget','utangpiutang','asetproyek','laporan','akun'];
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
// BUGFIX (audit "tombol 🏦 Akun di tab Keuangan tidak respon", laporan
// user): tombol "🏦 Akun" (data-args=["akun"]) sudah ada di HTML sejak
// awal, tapi panel #keuanganTab-akun & pemanggilan render-nya TIDAK PERNAH
// ditambahkan ke sini -- akibatnya panel itu permanen ketutup class
// u-dnone (default di HTML) berapa kali pun tombolnya ditap, kelihatan
// persis seperti tombol "mati". Fix: toggle panel sama seperti tab lain +
// panggil renderAccGrid() (modules-render.js) yang memang sudah ada &
// dipakai listener onchange filter di panel ini, cuma belum pernah
// dipanggil saat tab-nya dibuka pertama kali.
document.getElementById('keuanganTab-akun').classList.toggle('u-dnone', t!=='akun');
document.getElementById('keuanganTab-akun').style.display='';
if(t==='kelola'){populateKeuFilters();loadKeuFilterPrefsIntoDOM();renderKeuangan();}
if(t==='tagihan'){renderBillList();}
if(t==='budget'){renderBudgets();if(typeof BudgetReko!=='undefined')BudgetReko.init();}
if(t==='utangpiutang'){if(typeof Piutang!=='undefined')Piutang.renderList();if(typeof Debt!=='undefined')Debt.renderList();}
if(t==='akun'){if(typeof renderAccGrid==='function')renderAccGrid();}
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
// SESI 498 (Tab "Dana Titipan" Terpadu, Sesi A) — tambah sub-tab ke-4
// 'titipan', pola SAMA PERSIS 3 sub-tab lama di atas (murni toggle DOM,
// 0 logic baru). Konten sub-tab ini diisi DanaTitipanPortfolioPresenter.
// renderInto('danaTitipanTabList'), dipanggil dari renderLaporan() sama
// seperti ketiga sub-tab lain (semua sub-tab tetap diisi sekaligus,
// terlepas mana yang aktif — konsisten pola existing).
const LAPORAN_SUBTAB_ORDER=['ringkasan','aruskas','transaksi','titipan'];
const LAPORAN_SUBTAB_LABEL={ringkasan:'Ringkasan',aruskas:'Arus Kas & Kategori',transaksi:'Transaksi & Export',titipan:'Dana Titipan'};
function setLaporanTab(t,el){
const lapSubtabBtns=document.querySelectorAll('#keuanganTab-laporan .lap-subtab');
lapSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=LAPORAN_SUBTAB_ORDER.indexOf(t); const btn=lapSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('laporanTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('laporanTab-ringkasan').style.display='';
document.getElementById('laporanTab-aruskas').classList.toggle('u-dnone', t!=='aruskas');
document.getElementById('laporanTab-aruskas').style.display='';
document.getElementById('laporanTab-transaksi').classList.toggle('u-dnone', t!=='transaksi');
document.getElementById('laporanTab-transaksi').style.display='';
const titipanTabEl=document.getElementById('laporanTab-titipan');
if(titipanTabEl){ titipanTabEl.classList.toggle('u-dnone', t!=='titipan'); titipanTabEl.style.display=''; }
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
document.getElementById('kelolaTab-ringkasan').style.display='';
document.getElementById('kelolaTab-transaksi').classList.toggle('u-dnone', t!=='transaksi');
document.getElementById('kelolaTab-transaksi').style.display='';
document.getElementById('kelolaTab-pengaturan').classList.toggle('u-dnone', t!=='pengaturan');
document.getElementById('kelolaTab-pengaturan').style.display='';
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
