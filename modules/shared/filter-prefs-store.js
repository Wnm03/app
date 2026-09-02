// filter-prefs-store.js — S716. Ekstraksi pola `_loadFilterPrefsOnce()`/
// `_saveFilterPrefs()` yang SAMA PERSIS diduplikasi 3x sebelum sesi ini:
// `InvestmentListUI` (S672, investasi-list-view.js), `Aset` (S715,
// modules/asset/aset.js), `DanaTitipanPortfolioPresenter` (S715,
// dana-titipan-portfolio-render.js) — ketiganya persis sama isinya, cuma
// beda nama objek target & storage key. Sesi ini pindahkan LOGIKANYA ke 1
// tempat (`FilterPrefsStore.loadOnce(target)`/`FilterPrefsStore.save(target)`),
// ketiga consumer jadi thin delegating wrapper yang manggil helper ini dgn
// `target` = objek mereka sendiri (`Aset`/`InvestmentListUI`/
// `DanaTitipanPortfolioPresenter`) — 0 perubahan nama method publik/call-site
// di consumer (tetap `Aset._loadFilterPrefsOnce()` dst dari luar), jadi 0
// tempat lain yang perlu disentuh selain ketiga file consumer itu sendiri.
//
// WAJIB dimuat SEBELUM ketiga consumer di scripts/build.js (modules/shared/
// biasanya dimuat lebih dulu drpd modules/asset|finance/ — lihat urutan yang
// sudah ada).
//
// Kontrak `target` (dipenuhi oleh Aset/InvestmentListUI/
// DanaTitipanPortfolioPresenter apa adanya, 0 field baru ditambah):
//   target.filterOwnerIds    — array string, state UI filter owner
//   target.filterSettlement  — '' | 'milik' | 'titipan'
//   target._filterPrefsLoaded — flag guard baca-sekali (murni runtime, TIDAK
//                                dipersist)
//   target._filterStorageKey  — nama key localStorage, unik per consumer
//                                (mis. 'assetListFilterPrefs',
//                                'investmentListFilterPrefs',
//                                'danaTitipanFilterPrefs')
//
// Pola try/catch permisif TIDAK berubah dari 3 versi sebelumnya:
// localStorage gagal/diblokir/korup TIDAK PERNAH melempar keluar -- filter
// tetap berfungsi murni di state UI in-memory kalau storage bermasalah,
// cuma tidak ke-persist lintas reload. Validasi bentuk data SEBELUM dipakai
// (Array.isArray utk filterOwnerIds, whitelist 'milik'/'titipan' utk
// filterSettlement) -- localStorage bisa diedit manual dari luar app
// (DevTools), jadi data JANGAN dipercaya mentah-mentah.
const FilterPrefsStore = {
// loadOnce(target) — HANYA baca sekali per lifetime halaman (guard
// target._filterPrefsLoaded) -- dipanggil dari render()/renderList()
// masing2 consumer (SSOT halaman/tab dibuka), BUKAN dari method render
// internal yang bisa dipanggil berkali-kali (termasuk dari dalam handler
// filter itu sendiri) -- baca ulang tiap render akan menimpa balik
// perubahan live user dgn nilai lama di storage.
loadOnce(target){
if(!target||target._filterPrefsLoaded)return;
target._filterPrefsLoaded=true;
if(typeof localStorage==='undefined')return;
try{
const raw=localStorage.getItem(target._filterStorageKey);
if(!raw)return;
const parsed=JSON.parse(raw);
if(parsed&&Array.isArray(parsed.filterOwnerIds)){
target.filterOwnerIds=parsed.filterOwnerIds.map(String);
}
if(parsed&&(parsed.filterSettlement==='milik'||parsed.filterSettlement==='titipan')){
target.filterSettlement=parsed.filterSettlement;
}else if(!target.filterOwnerIds.length){
// Konsisten sama guard onFilterOwnerToggle()/onFilterOwnerClearAll() di
// tiap consumer: status tanpa owner terpilih tidak bermakna -- kalau
// data lama di storage kebetulan punya filterOwnerIds kosong tapi
// filterSettlement terisi, jangan ikut dipakai.
target.filterSettlement='';
}
}catch(err){
// localStorage korup/tidak tersedia -> abaikan, filter tetap default
// kosong (0 crash, pola sama try/catch cardCollapsePrefs).
}
},
save(target){
if(!target||typeof localStorage==='undefined')return;
try{
localStorage.setItem(target._filterStorageKey,JSON.stringify({
filterOwnerIds:target.filterOwnerIds,
filterSettlement:target.filterSettlement,
}));
}catch(err){
// localStorage penuh/diblokir (mis. mode privat) -> abaikan, filter
// tetap jalan murni di state UI sesi ini saja (0 crash).
}
},
};
