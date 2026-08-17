// S264 Security Hardening — wrapper functions untuk eks data-onclick.
// Semua inline handler (data-onclick + new Function()) diganti data-action
// yang manggil fungsi bernama di sini. Tidak ada logic baru, cuma re-wrap
// kode yang sebelumnya inline supaya lolos CSP tanpa new Function().

function goToAbsensiFromGajiCalc(){ closeModal('gajiCalcModal'); openAbsensiModal(); }

function cancelCatModal(){ catModalCallback=null; closeModal('catModal'); }

function renovOpenItemModalCur(){ Renov.openItemModal(Renov.curId); }
function renovAiSuggestCur(){ RenovAI.suggest(Renov.curId); }
function renovDeleteProjectCur(){ Renov.deleteProject(Renov.curId); }
function renovCalcOpenCur(){ RenovCalc.open(Renov._currentItemCalcDetail); }

function clickElById(id){ const el=document.getElementById(id); if(el) el.click(); }

async function resetAllBudgetsConfirm(){
if(await askConfirm('Reset semua anggaran?')){
D.budgets=[];
saveBudgetSettings();
save();
renderBudgets();
closeModal('budgetSettingsModal');
toast('🗑 Semua anggaran dihapus');
}
}

function saveBudgetSettingsModal(){
saveBudgetSettings();
closeModal('budgetSettingsModal');
renderBudgets();
toast('✅ Pengaturan disimpan');
}

function openTargetModalDanaDarurat(){
openTargetModal();
document.getElementById('tDanaDarurat').checked=true;
onTargetDanaDaruratToggle();
}

function stopPropOnly(){ /* no-op, dipakai bareng data-stop="1" */ }

function billActionPayAdvance(id){ closeQS('qsBillActions'); markBillPaid(id,true); }
function billActionShareWA(id){ closeQS('qsBillActions'); shareBillWA(id); }
function billActionHistory(id){ closeQS('qsBillActions'); openBillHistory(id); }
function billActionEdit(id){ closeQS('qsBillActions'); openBillModal(id); }
function billActionDelete(id){ closeQS('qsBillActions'); delBill(id); }
function billActionDeleteArchive(id){ closeQS('qsBillActions'); delBillArchive(id); }

function produsenActionHarga(id){ closeQS('qsProdusenActions'); openProdusenHargaModal(id); }
function produsenActionDelete(id){ closeQS('qsProdusenActions'); delProdusen(id); }

// assetAction*(id) — S305 UI polish: pasangan wrapper utk openActionsMenu (Aset.openActionsMenu
// di aset.js), pola SAMA PERSIS billAction*/produsenAction* di atas — tutup qsAssetActions
// dulu sebelum jalanin aksi aslinya (Aset.openTxHistory/quickScanAsset/delAsset TIDAK diubah).
function assetActionHistory(id){ closeQS('qsAssetActions'); Aset.openTxHistory(id); }
function assetActionScan(id){ closeQS('qsAssetActions'); quickScanAsset(id); }
function assetActionDelete(id){ closeQS('qsAssetActions'); delAsset(id); }

// assetActionViewVehicle(vehicleId) — S509c Asset -> Vehicle Reverse
// Navigation (lihat PROMPT IMPLEMENTASI S509c): wrapper tipis, BUKAN modal
// baru. editVehicle(i) (vehicle-core.js, existing) butuh INDEX ASLI di
// D.vehicles (bukan id), jadi di-cari dulu lewat findIndex + sameId() (pola
// sama persis renderVehicleManageList() di modules-render.js yang juga
// nyari index dari object vehicle sebelum dipakai ke data-args editVehicle).
// Kalau index tidak ketemu (vehicle sudah dihapus sejak modal Aset dibuka),
// TIDAK ngapa-ngapain -- tidak crash, tidak toast, konsisten pola no-op
// guard fungsi lain di file ini kalau target sudah hilang.
function assetActionViewVehicle(vehicleId){
const i=(D.vehicles||[]).findIndex(v=>v&&sameId(v.id,vehicleId));
if(i<0)return;
editVehicle(i);
}

// toggleBillCardDetail(el) — S301 UI polish pt.5: accordion ringkas per-kartu tagihan.
// Sengaja pakai chevron TERPISAH (bukan ganti tap kartu jadi toggle) krn tap kartu
// (`data-action="openBillModal"` di `.bill-item`) sudah dipakai user utk buka Edit —
// kalau tap kartu direbut buat expand/collapse, alur edit yang sudah biasa dipakai jadi
// tabrakan/berubah. Chevron ini `data-stop="1"` jadi klik-nya TIDAK ikut trigger openBillModal.
function toggleBillCardDetail(el){
const card=el.closest('.bill-item');
if(card)card.classList.toggle('bill-card-expanded');
}

function torsiSetCatFromChip(name){ Torsi.setCat(name); }
function torsiToggleCatCardEl(el){ Torsi.toggleCatCard(el); }
function torsiCatatServisStop(name){ event.stopPropagation(); Torsi.catatServis(name); }
function torsiToggleCheckStop(key){ event.stopPropagation(); Torsi.toggleCheck(key); }
function torsiSelectPartIfAllowed(noTorque, catName, name){ if(!noTorque) Torsi.selectPart(catName, name); }

// FIX (audit UI/UX, screenshot 2026-08-17 17:37): 5x FAB per-halaman (keuFab/
// laporanFab/shopFab/shopLaporanFab/carNotesFab) sebelumnya mengambang bebas
// sendiri2 di kanan-bawah. Sekarang dipicu bareng dari SATU tombol terpusat
// di tengah nav bawah (#navFabMain, lihat markup di index.html sebelum
// nav-item "Aset"). closeAllKeuFabs() = helper bersama supaya SEMUA jalur
// penutupan (klik salah satu aksi di dalamnya, ATAU toggle tombol nav)
// selalu menutup SEMUA .keu-fab yang sedang terbuka + sinkronkan balik
// aria-expanded & rotasi ikon #navFabMain -- tidak ada state nyangkut kalau
// user buka lewat nav lalu pilih aksi di salah satu fab (mis. tab Laporan yg
// py 2 fab sekaligus terlihat, keuFab+laporanFab, lihat navFabToggle()).
function closeAllKeuFabs(){
  document.querySelectorAll('.keu-fab.open').forEach(f=>f.classList.remove('open'));
  const navFab=document.getElementById('navFabMain');
  if(navFab)navFab.setAttribute('aria-expanded','false');
}
// navFabToggle() -- toggle SEMUA .keu-fab yg SEDANG kelihatan di halaman/tab
// aktif secara bersamaan (bukan cuma 1), supaya kasus 1 halaman py >1 FAB
// aktif bareng (mis. #keuanganTab-laporan: keuFab TETAP tampil + laporanFab
// tampil tambahan, lihat komentar #keuanganTab-laporan .keu-fab di
// styles.css) tetap bisa dibuka semua lewat 1 tombol nav, bukan cuma yg
// pertama ketemu di DOM. Visibility dicek pakai offsetParent!==null (cara
// standar cek elemen benar2 ter-render, bukan cuma exist di DOM/di-hide via
// ancestor u-dnone) -- konsisten dgn pola cek visibility lain di codebase.
function navFabToggle(el){
  const visibleFabs=Array.from(document.querySelectorAll('.keu-fab')).filter(f=>f.offsetParent!==null);
  if(!visibleFabs.length){
    el.setAttribute('aria-expanded','false');
    if(typeof toast==='function')toast('Tidak ada aksi cepat di halaman ini');
    return;
  }
  const willOpen=!visibleFabs[0].classList.contains('open');
  visibleFabs.forEach(f=>f.classList.toggle('open',willOpen));
  el.setAttribute('aria-expanded',willOpen?'true':'false');
}

function keuFabOpenIncome(){ closeAllKeuFabs(); openTxModal('income'); }
function keuFabOpenExpense(){ closeAllKeuFabs(); openTxModal('expense'); }
function keuFabToggleMain(el){ const _o=document.getElementById('keuFab').classList.toggle('open'); el.setAttribute('aria-expanded', _o?'true':'false'); }

function openCatModalQuick(){ openCatModal(undefined, curCatFilter==='income'?'income':'expense'); }

function renovCalcOpenNull(){ RenovCalc.open(null); }

function laporanFabExportPDF(){ closeAllKeuFabs(); exportLaporanPDF(); }
function laporanFabExportCSV(){ closeAllKeuFabs(); exportCSV(); }
function laporanFabToggleMain(el){ const _o=document.getElementById('laporanFab').classList.toggle('open'); el.setAttribute('aria-expanded', _o?'true':'false'); }

function shopFabOpenOrder(){ closeAllKeuFabs(); openOrderModal(); }
function shopFabOpenProduct(){ closeAllKeuFabs(); openProductModal(); }
function shopFabToggleMain(el){ const _o=document.getElementById('shopFab').classList.toggle('open'); el.setAttribute('aria-expanded', _o?'true':'false'); }

function shopLaporanFabExportXLSX(){ closeAllKeuFabs(); exportLaporanShopXLSX(); }
function shopLaporanFabExportSemua(){ closeAllKeuFabs(); exportShopSemuaXLSX(); }
function shopLaporanFabToggleMain(el){ const _o=document.getElementById('shopLaporanFab').classList.toggle('open'); el.setAttribute('aria-expanded', _o?'true':'false'); }

function carNotesFabOpenBbm(){ closeAllKeuFabs(); openBbmModal(); }
function carNotesFabOpenServis(){ closeAllKeuFabs(); openServisModal(); }
function carNotesFabToggleMain(el){ const _o=document.getElementById('carNotesFab').classList.toggle('open'); el.setAttribute('aria-expanded', _o?'true':'false'); }

function clickAssetImportFile(){ document.getElementById('assetImportFile').click(); }
function printWindow(){ window.print(); }
function goToDashboardHub(){ showPage('dashboard-hub'); DashboardHub.render(); }

function qsKeuTambahAkun(){ closeQS('qsKeuangan'); openAccModal(); }
function qsKeuTransferAkun(){ closeQS('qsKeuangan'); openTransferModal(); }
function qsKeuKategoriMasuk(){ closeQS('qsKeuangan'); openCatModal(undefined,'income'); }
function qsKeuKategoriKeluar(){ closeQS('qsKeuangan'); openCatModal(undefined,'expense'); }
function qsKeuTambahTagihan(){ closeQS('qsKeuangan'); openBillModal(); }
function qsKeuLihatSemua(){ closeQS('qsKeuangan'); showPage('settings'); }
function qsKeuTambahTarget(){ closeQS('qsKeuangan'); openTargetModal(); }
function qsKeuDanaPendidikan(){ closeQS('qsKeuangan'); EduFund.openModal(); }
function qsKeuExportCSV(){ closeQS('qsKeuangan'); exportCSV(); }

function qsShopTambahProduk(){ closeQS('qsShop'); openProductModal(); }
function qsShopLihatEtalase(){ closeQS('qsShop'); setShopTab('etalase',document.querySelectorAll('#page-shop .cn-tab')[1]); }
function qsShopTransaksiBaru(){ closeQS('qsShop'); openOrderModal(); }
function qsShopRiwayat(){ closeQS('qsShop'); setShopTab('riwayat',document.querySelectorAll('#page-shop .cn-tab')[3]); }
function qsShopBackup(){ closeQS('qsShop'); openBackupModal(); }
function qsShopSetelanLanjutan(){ closeQS('qsShop'); showPage('settings'); }
function qsShopKatalogDinamis(){ closeQS('qsShop'); openShopKatalogDinamis(); }

function qsCarnotesKelolaKendaraan(){ closeQS('qsCarnotes'); openVehicleModal(); }
function qsCarnotesKatalog(){ closeQS('qsCarnotes'); VehicleCatalogUI.open(); }
function qsCarnotesUpdateKm(){ closeQS('qsCarnotes'); openKmModal(); }
function qsCarnotesKategoriPart(){ closeQS('qsCarnotes'); openSparepartModal(); }
function qsCarnotesCatatServis(){ closeQS('qsCarnotes'); openServisModal(); }
function qsCarnotesIsiBbm(){ closeQS('qsCarnotes'); openBbmModal(); }
function qsCarnotesKatalogDinamis(){ closeQS('qsCarnotes'); openShopKatalogDinamis(); }

function qsLaporanBulanIni(){ closeQS('qsLaporan'); setPeriode('bulan',document.querySelectorAll('#periodeChips .chip-btn')[2]); }
function qsLaporanTahunIni(){ closeQS('qsLaporan'); setPeriode('tahun',document.querySelectorAll('#periodeChips .chip-btn')[3]); }
function qsLaporanPemasukanSaja(){ closeQS('qsLaporan'); document.getElementById('fTipe').value='income'; renderLaporan(); }
function qsLaporanPengeluaranSaja(){ closeQS('qsLaporan'); document.getElementById('fTipe').value='expense'; renderLaporan(); }
function qsLaporanExportCSV(){ closeQS('qsLaporan'); exportCSV(); }
function qsLaporanExportJSON(){ closeQS('qsLaporan'); exportJSON(); }
function qsLaporanBackupLanjutan(){ closeQS('qsLaporan'); openBackupModal(); }
function qsLaporanSetelanAkun(){ closeQS('qsLaporan'); showPage('settings'); }

function qsAiAnalisaBulanIni(){ closeQS('qsAI'); aiQ('Analisa keuangan bulan ini, boros di mana?'); }
function qsAiCekKendaraan(){ closeQS('qsAI'); aiQ('Kondisi kendaraan saya bagaimana, ada servis yang mendesak?'); }
function qsAiTagihanMendesak(){ closeQS('qsAI'); aiQ('Tagihan dan cicilan yang akan jatuh tempo?'); }
function qsAiCekBisnisShop(){ closeQS('qsAI'); aiQ('Gimana performa bisnis shop bulan ini, stok mana yang mau habis?'); }
function qsAiGajiAbsensi(){ closeQS('qsAI'); aiQ('Absensi & estimasi gaji bulan ini sudah berapa?'); }
function qsAiResetChat(){ closeQS('qsAI'); clearChat(); }
function qsAiEditProfil(){ closeQS('qsAI'); showPage('settings'); }

function backToSettingsPage(){ showPage('settings'); }

function dashHubQaTambahTransaksi(){ openTxModal('expense'); }
function dashHubQaBackup(){ openBackupModal(); }
// dashHubQaBackupHistory() — pengganti quick action "Backup" (Sesi ini):
// tombol "Backup" di header (#backupBadge, runFullBackup) & tombol Backup di
// grid quick action tadinya memanggil aksi backup yang sama persis (terasa
// duplikat). Quick action ini sekarang membuka Riwayat Backup (bukan
// menjalankan backup lagi) lewat dashHubNavigateToFeature() yang SUDAH ADA
// (dashboard-hub.js) -> Pengaturan > tab Notif&Backup > #backupHistoryList
// (diisi BackupHistoryPresenter, sudah ada). 0 logic backup baru, 0 field D
// baru — murni navigasi ke UI yang sudah ada. Fallback ke openBackupModal()
// kalau dashHubNavigateToFeature belum ke-load (mis. dipanggil sebelum
// dashboard-hub.js), supaya tombol tetap aman dipakai.
function dashHubQaBackupHistory(){
  if (typeof dashHubNavigateToFeature === 'function') {
    dashHubNavigateToFeature({ page: 'settings', group: 'stgGroup4', goTo: 'backupHistoryList' });
  } else {
    openBackupModal();
  }
}
function dashHubQaFocusSearch(){ document.getElementById('dashHubSearchInput').focus(); }
function dashHubQaOpenAI(){ showPage('ai'); }
// dashHubQaDanaTitipan() — mengisi slot ke-5 yang sebelumnya kosong di
// #dashHubQuickActions (.dashhub-qa-row sudah digrid utk 5 kolom sejak
// awal, cuma 4 tombol yang dipasang -> ada 1 sela kosong di sisi kanan
// tombol AI). 0 logic baru: reuse PENUH dashHubNavigateToFeature() +
// target yang SAMA PERSIS dgn entri 'keu-dana-titipan' di
// dashboard-hub-registry.js (Keuangan > Laporan > tab Dana Titipan).
// Fallback ke showPage('keuangan') kalau dashHubNavigateToFeature belum
// ke-load, pola sama dgn dashHubQaBackupHistory() di atas.
function dashHubQaDanaTitipan(){
  if (typeof dashHubNavigateToFeature === 'function') {
    dashHubNavigateToFeature({ page: 'keuangan', tab: 'laporan', subtab: 'titipan', goTo: 'danaTitipanTabList' });
  } else {
    showPage('keuangan');
  }
}

function linkTxToggleSelectStop(id){ LinkTx.toggleSelectAndRender(id); }

function vehCnCurKmInputStop(){ /* no-op, dipakai bareng data-stop="1" */ }
