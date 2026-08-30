// modules/asset/aset-owners.js — Aset: fitur multi-owner / porsi kepemilikan
// (Owners Modal, rebalance, quota, migrate-to-registry, dll). DIPECAH dari
// modules/asset/aset.js (audit ukuran file, lanjutan S589 yang sudah
// memecah aset.js jadi 3 file) — 0 logic diubah, murni pindah lokasi fisik.
// Metode di sini semuanya sudah pakai referensi eksplisit `Aset.xxx(...)`
// (bukan `this.xxx`), jadi aman digabung balik ke object Aset lewat
// Object.assign(Aset, AssetOwnersMixin) di akhir aset.js — perilaku identik
// sebelum & sesudah dipecah.
//
// Cakupan (dipindah APA ADANYA, urutan tidak diubah): label tombol "Atur
// Porsi" (_applyOwnersButtonLabel/_updateOwnersButtonLabel), toggle edit
// controls, openOwnersModal/openOwnersModalById, render daftar owners &
// quota, add/remove owner row, rebalance panel, saveOwners/resetOwners,
// sync hutang per-owner, migrateOwnersToRegistry.
//
// Harus dimuat SEBELUM aset.js akan gagal (aset.js yang mereferensikan
// AssetOwnersMixin di Object.assign-nya) — pastikan urutan load file ini
// SEBELUM aset.js di scripts/build.js & tests/helpers/loadSource per test.
const AssetOwnersMixin = {
// _applyOwnersButtonLabel(linked)/_updateOwnersButtonLabel(a) -- SESI B2b: ubah label
// tombol "Atur Porsi" di assetModal utama (id baru #assetOwnersBtn, lihat modals.js)
// jadi "🔗 Atur Porsi di Investasi" kalau aset ini tertaut ke Holding Investasi yang
// masih ada, atau balik ke label lama "⚖️ Atur Porsi Kepemilikan" kalau tidak -- PURE
// UI, 0 penulisan data. _updateOwnersButtonLabel(a) dipanggil openModal() (aset
// tersimpan, baca a.investmentId); onInvestmentLinkChange() di atas panggil
// _applyOwnersButtonLabel() langsung dari value dropdown (belum tentu tersimpan).
_applyOwnersButtonLabel(linked){
const btn=document.getElementById('assetOwnersBtn');
if(!btn)return;
btn.textContent=linked?'🔗 Atur Porsi di Investasi':'⚖️ Atur Porsi Kepemilikan';
},
_updateOwnersButtonLabel(a){
Aset._applyOwnersButtonLabel(!!Aset._resolveLinkedInvestment(a));
},
// _toggleOwnersEditControls() -- SESI B2a: tampil/sembunyikan blok tombol edit
// (➕ Tambah Pemilik / ✅ Simpan Porsi / ↺ Reset Draft, dibungkus 1 div
// #assetOwnersEditControls) & hint read-only (#assetOwnersReadOnlyHint), berdasarkan
// Aset._ownersReadOnly (di-set openOwnersModal() dari hasil _resolveLinkedInvestmentOwners).
// PURE UI, 0 penulisan ke D.assets/D.investments. Dipanggil dari _renderOwnersList()
// (SATU titik render modal ini, sama disiplin dgn updateOwnersTotal()).
_toggleOwnersEditControls(){
const editBox=document.getElementById('assetOwnersEditControls');
const hint=document.getElementById('assetOwnersReadOnlyHint');
const readOnly=!!Aset._ownersReadOnly;
if(editBox)editBox.classList.toggle('u-dnone',readOnly);
if(hint){
hint.classList.toggle('u-dnone',!readOnly);
if(readOnly)hint.textContent='🔗 Aset ini terhubung ke Holding Investasi -- porsi kepemilikan diatur & disimpan di sana (bukan di sini). Lepas tautannya di form Aset (🔗 Hubungkan ke Holding Investasi) kalau mau atur porsi manual lagi di Buku Aset.';
}
},
openOwnersModal(){
const id=Aset.editId;
const a=id?D.assets.find(x=>sameId(x.id,id)):null;
// SESI B2b: aset terhubung ke Holding Investasi yang masih ada -> alih navigasi
// LANGSUNG ke investmentOwnersModal lewat InvestmentUI.openOwnersModal(id) (S464,
// 100% reuse) -- assetOwnersModal (termasuk versi read-only B2a) TIDAK lagi dibuka
// sama sekali utk aset tertaut, konsisten dgn label tombol assetModal yang sudah
// berubah jadi "🔗 Atur Porsi di Investasi" (_updateOwnersButtonLabel). Guard typeof
// InvestmentUI: kalau module investasi-view.js belum dimuat (harusnya tidak pernah
// terjadi bareng investmentId terisi, tapi jaga-jaga), fallback ke jalur B2a/lama di
// bawah (read-only lewat Investment.getOwners(), bukan crash).
const linkedHolding=Aset._resolveLinkedInvestment(a);
if(linkedHolding&&typeof InvestmentUI!=='undefined'){
InvestmentUI.openOwnersModal(linkedHolding.id);
return;
}
document.getElementById('assetOwnersAssetName').textContent=a?('📋 '+a.name):'';
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// buang draft nilai tersirat (lihat _ownersDraftNilai) tiap kali modal
// dibuka ulang -- draft ini HANYA berlaku selama 1 sesi modal terbuka
// (pola sama _ownersDraft), supaya tidak nyangkut dari sesi buka-modal
// sebelumnya kalau user tutup modal tanpa Simpan Porsi.
Aset._ownersDraftNilai=null;
Aset._ownersModalAsset=a;
// FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026): buang panel penyesuaian yang mungkin
// masih nyangkut dari sesi buka-modal sebelumnya (pola sama _ownersDraftNilai di atas) --
// lihat _checkRebalanceTrigger()/_renderRebalancePanel() di bawah utk detail fiturnya.
Aset._rebalancePending=null;
// SESI B2a: aset terhubung ke Holding Investasi (a.investmentId) -> modal ini jadi
// READ-ONLY, porsi dibaca dari h.owners (bukan a.owners) -- lihat
// _resolveLinkedInvestmentOwners di atas.
const linkedOwners=Aset._resolveLinkedInvestmentOwners(a);
Aset._ownersReadOnly=!!linkedOwners;
if(linkedOwners){
Aset._ownersDraft=linkedOwners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
if(!a){
Aset._ownersDraft=[];
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
if(!res||!res.ok){
Aset._ownersDraft=[];
Aset._renderOwnersList();
openModal('assetOwnersModal');
return;
}
// Salinan (bukan referensi) -- aman diubah lewat addOwnerRow/removeOwnerRow/
// onOwnerNameInput/onOwnerPorsiInput tanpa menyentuh data asli aset sampai
// saveOwners() (ditunda ke sesi berikutnya) benar-benar dipanggil.
// S666 (wiring UI dari fondasi S665 Aset.getOwnerSettlement()): field
// settlement dibaca per-baris SEKARANG saat modal dibuka, sama pola persis
// InvestmentUI.openOwnersModal() (S661) -- bukan disintesis ulang, supaya
// toggle selalu mencerminkan status TERSIMPAN terakhir (a.ownerSettlement).
Aset._ownersDraft=res.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(a,o.ownerId):'titipan'}));
Aset._renderOwnersList();
openModal('assetOwnersModal');
// MIGRASI data lama (Agustus 2026): aset yang sudah overflow >100% SEBELUM fitur
// Auto-Rebalance ini ada (tersimpan begitu saja krn validasi lama tidak mencegahnya)
// tidak akan pernah memicu _checkRebalanceTrigger() lewat ketikan user kalau user tidak
// menyentuh field porsi sama sekali sesudah buka modal -- panggil manual di sini pakai
// baris TERAKHIR draft sbg "editedIndex" (sama efeknya: trigger hanya butuh SALAH SATU
// index yg valid, hasil kalkulasi tidak bergantung baris mana yang dianggap "diedit"
// utk kasus migrasi ini) supaya panel penyesuaian otomatis tampil begitu modal dibuka,
// bukan cuma saat user mulai mengetik. _checkRebalanceTrigger() sendiri sudah PURE
// (tidak menulis draft), aman dipanggil di sini.
Aset._checkRebalanceTrigger(Aset._ownersDraft.length-1);
},
// openOwnersModalById(assetId) -- SESI 515 (Dana Titipan Owner -> Nominal -> Asset ->
// Kuota -> Porsi): wrapper navigasi TIPIS, dipanggil dari LUAR assetModal (kartu Dana
// Titipan, dana-titipan-portfolio-presenter.js) supaya user bisa lompat langsung ke
// assetOwnersModal utk 1 aset tertentu tanpa harus lebih dulu masuk ke Buku Aset & buka
// assetModal-nya secara manual. 100% REUSE openOwnersModal() existing (S392a) --
// satu2nya hal baru di sini adalah menyiapkan Aset.editId dari assetId yang dioper
// (openOwnersModal() sendiri 0 baris diubah). Guard: assetId harus match D.assets
// existing -- kalau tidak ketemu, toast & batal (tidak pernah membuka modal porsi
// dgn _ownersModalAsset kosong tanpa pesan ke user).
openOwnersModalById(assetId){
const a=assetId?D.assets.find(x=>sameId(x.id,assetId)):null;
if(!a){if(typeof toast==='function')toast('⚠️ Aset tidak ditemukan');return;}
Aset.editId=a.id;
Aset.openOwnersModal();
},
// _ownersAssetNilai() -- SESI 429: nilai dasar (Rp) dipakai konversi
// porsi%<->nominal Rp di modal ini, ambil dari `Aset._ownersModalAsset.nilai`
// (field `assetNilai` yang SUDAH ADA di aset.js -- 0 field baru). Balik 0
// kalau aset belum ada/nilai bukan angka positif -- caller (_renderOwnersList/
// onOwnerPorsiInput/onOwnerNominalInput) pakai 0 sbg sinyal "field Nominal
// dinonaktifkan" (lihat _renderOwnersList di bawah), krn tanpa nilai dasar
// konversi Rp<->% tidak bisa dihitung.
_ownersAssetNilai(){
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// kalau user sudah menurunkan nilai dasar dari Nominal (Rp) baris manapun
// (lihat onOwnerNominalInput, cabang nilai<=0 -- aset ini belum py
// "Estimasi Nilai Saat Ini"), pakai nilai tersirat itu DULUAN drpd a.nilai
// asli (yang masih 0/kosong) supaya field Nominal baris LAIN & indikator
// total ikut kehitung benar tanpa harus keluar modal & isi form Aset dulu.
if(typeof Aset._ownersDraftNilai==='number'&&isFinite(Aset._ownersDraftNilai)&&Aset._ownersDraftNilai>0)return Aset._ownersDraftNilai;
const a=Aset._ownersModalAsset;
return (a&&typeof a.nilai==='number'&&isFinite(a.nilai)&&a.nilai>0)?a.nilai:0;
},
// _ownerQuotaText(o) -- SESI 505 (mirror PERSIS InvestmentUI._ownerQuotaText(), S494,
// digeneralisasi lintas domain S504): hitung & render "💰 Kuota sisa: Rp X" LIVE utk 1 baris
// owner non-SELF di assetOwnersModal, TERPISAH dari validasi total-porsi 100%
// (updateOwnersTotal() TIDAK dibaca/diubah di sini, & fungsi ini TIDAK PERNAH menonaktifkan
// #assetOwnersSaveBtn -- soft warning saja, sama pola S494 Gate 2 #3).
//
// 100% REUSE: `DanaTitipanPortfolioAPI.getCommitments()` (baca principalAmount mentah by
// ownerId, sama seperti InvestmentUI), `DanaTitipanPortfolioAPI.allocatedExcluding()` (S504,
// dipanggil dgn bentuk BARU `{assetId: currentAssetId}` -- BUKAN string -- supaya Aset yang
// sedang dibuka di modal ini dikecualikan dari domain Aset, bukan domain Investment), &
// `Aset._ownersAssetNilai()` (basis Rp yang SAMA dipakai kolom Nominal (Rp) baris ini, S429 --
// turunan `a.nilai`, 0 basis baru). 0 rumus baru selain "principal - allocatedExcluding -
// nominal draft baris ini" yang sudah didefinisikan eksplisit di S494 & dipakai apa adanya di
// sini utk domain Aset.
//
// Owner belum punya record commitment (`getCommitments()` tidak ketemu / principalAmount bukan
// angka) -> prompt "catat pokok dulu" (BUKAN tampil tanpa batas/diam saja), sama persis
// InvestmentUI._ownerQuotaText().
//
// DL-NEXT-9 REVISI 3 (poin 4, mirror PERSIS InvestmentUI._ownerQuotaText()) -- SEBELUM fix
// ini, "Kuota sisa" HANYA mengurangi allocatedExcluding()+draftNominal dari principal,
// mengabaikan usedTotal (jalur "Catat Pengeluaran Dana Titipan", tx.titipanLinkId, Sesi 519)
// & linkedExpenseTotal (pengeluaran akun tertaut deductionOwnerId, Sesi PATCH-2026-08-14) --
// dua komponen yang SUDAH jadi bagian formula spent di build()/estimatedUnallocated, sehingga
// angka bisa tidak sinkron dgn dashboard Dana Titipan (root cause, lihat
// DESIGN-LOCK-DL-NEXT-9-OWNER-QUOTA-SISA-SPENT-SYNC-2.md). FIX: baca keduanya dari owner
// bucket DanaTitipanPortfolioAPI.build() (SATU sumber kebenaran sama dgn estimatedUnallocated,
// 0 rumus baru). Keduanya GLOBAL per-ownerId (bukan per-holding, sudah diverifikasi di
// build()) -- 0 exclusion tambahan diperlukan (beda dgn allocatedExcluding() yang memang harus
// exclude instrumen/aset yang sedang dibuka di modal ini).
//
// HARD INVARIANT (DL-Next-9): gain/currentValue (Untung-Rugi) TIDAK PERNAH masuk formula ini.
_ownerQuotaText(o,i){
if(!o||o.isSelf||!o.ownerId)return '';
if(typeof DanaTitipanPortfolioAPI==='undefined')return '';
const commit=DanaTitipanPortfolioAPI.getCommitments().find((c)=>c&&c.ownerId===o.ownerId);
if(!commit||!isFinite(commit.principalAmount)){
return '<div class="u-fs11 u-t2 u-mt2">💰 Kuota titipan: <span class="u-fw700">belum dicatat</span> — catat pokok dulu di menu Dana Titipan</div>';
}
const principal=Number(commit.principalAmount);
const currentAssetId=Aset._ownersModalAsset?Aset._ownersModalAsset.id:null;
const excluding=DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId,{assetId:currentAssetId});
const projection=(typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null;
const ownerBucket=(projection&&Array.isArray(projection.owners))?projection.owners.find((ow)=>ow&&ow.ownerId===o.ownerId):null;
const usedTotal=ownerBucket?(ownerBucket.usedTotal||0):0;
const linkedExpenseTotal=ownerBucket?(ownerBucket.linkedExpenseTotal||0):0;
const nilai=Aset._ownersAssetNilai();
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const draftNominal=nilai*(porsiNum/100);
const sisa=principal-excluding-usedTotal-linkedExpenseTotal-draftNominal;
const money=(typeof fmtFull==='function')?fmtFull:((typeof fmt==='function')?fmt:(n)=>'Rp '+Math.round(n||0));
const btnIdx=typeof i==='number'?i:(Array.isArray(Aset._ownersDraft)?Aset._ownersDraft.indexOf(o):-1);
const quotaBtn='<button type="button" class="btn btn-ghost btn-sm" style="padding:2px 8px;font-size:10.5px" data-action="Aset.applyQuotaToRow" data-args=\'['+btnIdx+']\'>🔄 Isi dari kuota sisa</button>';
if(sisa<0){
return '<div class="u-fs11 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap"><span class="u-fw700 red">⚠️ Kuota sisa: '+money(sisa)+' (melebihi pokok dikomit)</span>'+quotaBtn+'</div>';
}
// SESI AF2: sisipkan tombol "🔄 Isi dari kuota sisa" di samping angka kuota -- pemicu
// manual applyQuotaToRow() (lihat komentarnya) supaya user bisa isi/timpa ulang Porsi (%)
// baris ini dari kuota sisa kapan saja, tidak hanya sekali otomatis saat pilih owner.
// FIX (laporan user "diklik tidak bereaksi"): SEBELUMNYA tombol ini HANYA disisipkan di
// cabang kuota positif (di bawah) -- baris owner yang kuotanya SUDAH minus (cabang
// sisa<0 di atas, mis. "mas sihab" di screenshot user) tidak punya tombol sama sekali,
// jadi klik di teks merahnya wajar tidak bereaksi (tidak ada elemen data-action di sana).
// Fix: tombol sekarang disisipkan di KEDUA cabang -- applyQuotaToRow() sendiri sudah
// aman dipanggil kapan saja (cap<=0 -> toast "kuota sudah habis", bukan crash/diam).
return '<div class="u-fs11 u-t2 u-mt2 u-flex u-gap8" style="align-items:center;flex-wrap:wrap">💰 Kuota sisa: <span class="u-fw700">'+money(sisa)+'</span>'+quotaBtn+'</div>';
},
// _updateOwnerQuotaDisplay(i) -- SESI 505 (mirror PERSIS InvestmentUI._updateOwnerQuotaDisplay(),
// S494). Update HANYA elemen #assetOwnerKuota{i} tiap ketik porsi/nominal, TANPA render ulang
// seluruh list (pola sama alasan onOwnerPorsiInput/onOwnerNominalInput TIDAK memanggil
// _renderOwnersList() -- supaya fokus/kursor input tidak hilang tiap karakter diketik).
_updateOwnerQuotaDisplay(i){
const el=document.getElementById('assetOwnerKuota'+i);
if(!el)return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
el.innerHTML=Aset._ownerQuotaText(draft[i],i);
},
// _renderOwnersList() -- SESI 392b: render ulang #assetOwnersList dari Aset._ownersDraft.
// Dipanggil tiap ada tambah/hapus baris (addOwnerRow/removeOwnerRow), TIDAK dipanggil tiap
// karakter diketik di input nama/porsi/nominal (lihat onOwnerNameInput/onOwnerPorsiInput/
// onOwnerNominalInput di bawah) supaya fokus/kursor input tidak hilang tiap ketik.
// SESI 429: tiap baris sekarang juga menampilkan field "Nominal (Rp)" di
// samping "Porsi (%)" -- otomatis terhitung dari porsi% x nilai aset (field
// `nilai` yang sudah ada, 0 field D baru), dua arah (edit salah satu field,
// yang lain ikut update realtime, pola sama persis "Porsi Saya (%)"/"Porsi
// Saya (Rp)" yang sudah dipakai di txCicilanSharedPct/txCicilanSharedNominal
// & billSharedPct).
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// SEBELUMNYA, kalau aset belum punya nilai (Estimasi Nilai Saat Ini
// kosong/0), field Nominal dinonaktifkan (disabled) -- alasan lama:
// konversi Rp<->% butuh nilai dasar, dianggap "tidak ada cara aman
// menebaknya". Ternyata SALAH utk kasus nyata yang dilaporkan user: Porsi
// (%) tiap pemilik SUDAH diisi manual & totalnya SUDAH pas 100%, tapi
// field Nominal tetap kekunci cuma krn "Estimasi Nilai Saat Ini" di form
// Aset utama belum diisi -- padahal justru sebaliknya yang user mau: isi
// Nominal salah satu baris (yang porsinya sudah diketahui) buat MENURUNKAN
// nilai total instrumen itu sendiri. Field Nominal sekarang SELALU
// enabled; arah derivasi baru ini ditangani di onOwnerNominalInput()
// (cabang nilai<=0) lewat _ownersDraftNilai -- lihat komentar di sana.
// _ownerNameFieldHtml(o,i) -- SESI 490 (langkah 2/5 PLAN-owner-registry-multi-session.md):
// baris SELF tetap free-text (TIDAK berubah, pola lama -- Gate S490 eksplisit). Baris
// non-SELF: kalau OwnerRegistry SUDAH punya minimal 1 entri & baris ini TIDAK sedang mode
// "buat baru" (o._creatingNew), render <select> (pilih existing owner atau "Buat pemilik
// baru..."). Kalau registry masih kosong (baru pertama kali dipakai, belum ada entri sama
// sekali) ATAU baris sedang _creatingNew, fallback ke free-text SAMA PERSIS perilaku
// sebelum S490 -- onOwnerNameInput() TIDAK diubah, dipakai apa adanya di kedua fallback ini.
// Opsi dropdown SELALU sertakan ownerId lama baris ini kalau belum terdaftar di registry
// (owner legacy dari data sebelum S489/S490 ada) -- supaya buka modal tidak "kehilangan"
// nama yang sudah tersimpan.
_ownerNameFieldHtml(o,i){
const registryList=(typeof OwnerRegistry!=='undefined')?OwnerRegistry.listAll():[];
if(o.isSelf||!registryList.length||o._creatingNew){
return '<input type="text" class="fi" style="flex:1" placeholder="Nama pemilik" value="'+escapeHtml(o.ownerName||'')+'" oninput="Aset.onOwnerNameInput('+i+',this.value)">';
}
let matched=false;
let opts='<option value="">— Pilih pemilik —</option>';
registryList.forEach((r)=>{
const sel=(o.ownerId===r.id)?' selected':'';
if(o.ownerId===r.id)matched=true;
opts+='<option value="'+escapeHtml(r.id)+'"'+sel+'>'+escapeHtml(r.name)+'</option>';
});
if(o.ownerId&&!matched&&o.ownerName){
opts+='<option value="'+escapeHtml(o.ownerId)+'" selected>'+escapeHtml(o.ownerName)+'</option>';
}
opts+='<option value="__new__">➕ Buat pemilik baru…</option>';
return '<select class="fi" style="flex:1" onchange="Aset.onOwnerSelectChange('+i+',this.value)">'+opts+'</select>';
},
_renderOwnersList(){
Aset._toggleOwnersEditControls();
const listBox=document.getElementById('assetOwnersList');
if(!listBox){Aset.updateOwnersTotal();return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
// SESI B2a: cabang READ-ONLY (aset terhubung ke Holding Investasi) -- baris statis
// nama+porsi saja, TANPA input/tombol hapus (tidak ada onOwnerNameInput/
// onOwnerPorsiInput/removeOwnerRow di sini, sama sekali tidak menulis draft). Tombol
// edit (Tambah/Simpan/Reset) & indikator total sudah disembunyikan lewat
// _toggleOwnersEditControls() di atas, jadi TIDAK panggil updateOwnersTotal() di sini.
if(Aset._ownersReadOnly){
listBox.innerHTML=draft.length?draft.map((o)=>{
const porsiTxt=(typeof o.porsi==='number'&&isFinite(o.porsi))?o.porsi:0;
return '<div class="u-flex u-gap8" style="align-items:center;justify-content:space-between;margin-bottom:6px;padding:8px 10px;background:var(--surface3);border-radius:10px">'+
'<span style="font-size:13px;font-weight:600">'+escapeHtml(o.ownerName||'?')+(o.isSelf?' <span class="u-fs11 u-t2">(saya)</span>':'')+'</span>'+
'<span style="font-size:13px;font-weight:700;color:var(--accent)">'+porsiTxt+'%</span>'+
'</div>';
}).join(''):'<div class="empty"><div class="empty-text">Holding investasi terhubung belum punya pemilik tercatat.</div></div>';
return;
}
if(!Aset._ownersModalAsset){
listBox.innerHTML='<div class="empty"><div class="empty-text">Simpan aset ini dulu (tombol "Simpan Aset") sebelum mengatur porsi kepemilikan.</div></div>';
Aset.updateOwnersTotal();
return;
}
if(!draft.length){
listBox.innerHTML='<div class="empty"><div class="empty-text">Belum ada pemilik. Tap "➕ Tambah Pemilik" di bawah.</div></div>';
Aset.updateOwnersTotal();
return;
}
const nilai=Aset._ownersAssetNilai();
listBox.innerHTML=draft.map((o,i)=>{
const porsiNum=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:null;
const nominalVal=(nilai>0&&porsiNum!==null)?Math.round(nilai*porsiNum/100):'';
return '<div style="margin-bottom:8px">'+
'<div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px">'+
Aset._ownerNameFieldHtml(o,i)+
'<button type="button" class="btn btn-ghost btn-sm" data-action="Aset.removeOwnerRow" data-args=\'['+i+']\' aria-label="Hapus pemilik">✕</button>'+
'</div>'+
'<div class="u-grid2" style="margin-bottom:0">'+
'<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Porsi (%)</label><input type="number" class="fi" id="ownerPorsi'+i+'" placeholder="%" inputmode="decimal" value="'+(porsiNum!==null?porsiNum:'')+'" oninput="Aset.onOwnerPorsiInput('+i+',this.value)"></div>'+
'<div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Nominal (Rp)</label><input type="text" class="fi" id="ownerNominal'+i+'" placeholder="0" inputmode="decimal" value="'+nominalVal+'" oninput="Aset.onOwnerNominalInput('+i+',this.value)"></div>'+
'</div>'+
(nilai>0?'':'<div style="font-size:10.5px;color:var(--text3);margin:-2px 0 4px">Estimasi Nilai Saat Ini aset ini belum diisi -- isi Nominal (Rp) baris yang porsinya sudah kamu tahu, nilai total otomatis dihitung dari situ</div>')+
'<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-top:4px;cursor:pointer">'+
'<input type="checkbox" style="width:14px;height:14px"'+(o.isSelf?' checked':'')+' onchange="Aset.onOwnerIsSelfToggle('+i+',this.checked)"> 👤 Ini saya (porsi ini dihitung ke Zakat/Pajak milikmu)'+
'</label>'+
(o.isSelf?'':Aset._ownerSettlementFieldHtml(o,i))+
(o.isSelf?'':('<div id="assetOwnerKuota'+i+'">'+Aset._ownerQuotaText(o,i)+'</div>'))+
'</div>';
}).join('');
Aset.updateOwnersTotal();
// FITUR "Auto-Rebalance Porsi Pemilik": refresh panel penyesuaian (kalau sedang pending)
// tiap kali list ini di-render ulang penuh -- lihat _renderRebalancePanel() di bawah.
// Aman dipanggil di sini walau _rebalancePending null (fungsi itu sendiri yang
// mengosongkan box kalau tidak ada apa2 utk ditampilkan).
Aset._renderRebalancePanel();
},
// _ownerSettlementFieldHtml(o,i) -- S666 (wiring UI dari fondasi S665
// Aset.getOwnerSettlement()/setOwnerSettlement()), pola SAMA PERSIS
// InvestmentUI._ownerSettlementFieldHtml() (investasi-view.js, S661): toggle
// status owner non-SELF, HANYA dirender utk baris non-SELF (pemilik "saya"
// tidak relevan, tidak pernah masuk Buku Utang). 2 pilihan:
//   - 'titipan' (default): perilaku SAMA seperti sebelum S665/S666 -- porsi
//     owner ini masuk Buku Utang (Aset._syncOwnerDebts()/TitipanSync.reconcile()).
//   - 'milik': owner ini pemilik SUNGGUHAN (mis. rumah warisan istri sendiri,
//     BUKAN dana yang dititipkan buat dikelola) -- porsi TETAP tercatat sbg
//     kepemilikan owner ini (bisa difilter), TAPI TIDAK menghasilkan entry
//     Buku Utang.
// <select> dipilih (bukan checkbox) supaya label kedua opsi eksplisit tampil,
// tidak ambigu spt checkbox.
_ownerSettlementFieldHtml(o,i){
const val=o.settlement==='milik'?'milik':'titipan';
return '<div class="fg u-mb0" style="margin-top:6px">'+
'<label class="fl" style="margin-bottom:2px">Status Dana</label>'+
'<select class="fi" id="assetOwnerSettlement'+i+'" onchange="Aset.onOwnerSettlementChange('+i+',this.value)">'+
'<option value="titipan"'+(val==='titipan'?' selected':'')+'>🔒 Dana Titipan (tercatat di Buku Utang)</option>'+
'<option value="milik"'+(val==='milik'?' selected':'')+'>✅ Milik Sendiri Pemilik Ini (bukan titipan, tidak ada utang)</option>'+
'</select>'+
'</div>';
},
// onOwnerSettlementChange(i,val) -- tulis pilihan status ke draft[i].settlement saja
// (murni state, TIDAK menulis D.assets sampai saveOwners() -- pola sama persis
// onOwnerNameInput()/onOwnerPorsiInput() di atas & InvestmentUI.onOwnerSettlementChange()).
// Efeknya baru benar2 disinkronkan ke Buku Utang saat saveOwners() memanggil
// Aset.setOwnerSettlement() (lihat di bawah).
onOwnerSettlementChange(i,val){
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
draft[i].settlement=val==='milik'?'milik':'titipan';
},
// updateOwnersTotal() -- SESI 392c: hitung ulang & tampilkan total porsi Aset._ownersDraft
// saat ini di #assetOwnersTotalBox, warna hijau kalau pas 100% / merah kalau belum (kurang
// atau lebih). Dipanggil dari _renderOwnersList() (tiap baris ditambah/dihapus, ATAU tiap
// modal dibuka lewat openOwnersModal->_renderOwnersList) DAN langsung dari atribut oninput
// input porsi tiap baris (lihat _renderOwnersList di atas) supaya update realtime tiap
// ketik tanpa perlu render ulang seluruh list (yang akan menghilangkan fokus input, sama
// disiplin dgn onOwnerPorsiInput sejak 392b). 100% reuse MultiOwnerEngine.totalPorsi()/
// remainingPorsi() (S390) -- TIDAK ada rumus baru, PURE UI (baca draft di memori saja,
// tidak menulis apa pun ke D.assets).
updateOwnersTotal(){
const box=document.getElementById('assetOwnersTotalBox');
// saveBtn -- SESI 392d: tombol Simpan Porsi cuma aktif kalau total porsi PAS 100%
// (sinkron dgn syarat MultiOwnerEngine.validateOwners() yang dipanggil saveOwners()),
// supaya user tidak coba simpan draft yang pasti akan ditolak. Ini PURE UI (baca
// draft, set attribute disabled), 0 rumus baru -- reuse total/sisa yang sudah
// dihitung di bawah untuk box yang sama.
const saveBtn=document.getElementById('assetOwnersSaveBtn');
if(!box){if(saveBtn)saveBtn.disabled=true;return;}
if(!Aset._ownersModalAsset){box.textContent='';box.style.color='';if(saveBtn)saveBtn.disabled=true;return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length){
box.textContent='Belum ada pemilik ditambahkan.';
box.style.color='var(--text2)';
if(saveBtn)saveBtn.disabled=true;
return;
}
if(typeof MultiOwnerEngine==='undefined'){box.textContent='';box.style.color='';if(saveBtn)saveBtn.disabled=true;return;}
const total=MultiOwnerEngine.totalPorsi(draft);
const sisa=MultiOwnerEngine.remainingPorsi(draft);
const isValid=Math.abs(sisa)<=0.01;
box.style.color=isValid?'var(--accent3)':'var(--accent2)';
box.style.fontWeight='700';
box.textContent=isValid?('✅ Total porsi: '+total+'% (pas 100%)'):('⚠️ Total porsi: '+total+'% ('+(sisa>0?('kurang '+sisa+'%'):('lebih '+Math.abs(sisa)+'%'))+')');
if(saveBtn)saveBtn.disabled=!isValid;
},
// addOwnerRow() -- SESI 392b: tambah 1 baris pemilik kosong (nama & porsi kosong, diisi
// user) ke Aset._ownersDraft, lalu render ulang list. Murni ubah draft di memori --
// TIDAK menulis apa pun ke D.assets (sama seperti seluruh modal ini sampai saveOwners(),
// ditunda ke sesi berikutnya).
// SESI 393: baris pertama yang ditambahkan (draft masih kosong) default
// ditandai "👤 Ini saya" (isSelf:true) -- asumsi wajar krn biasanya user
// mulai isi porsi dari dirinya sendiri dulu, baru tambah pemilik lain
// (bisa ditoggle off lewat onOwnerIsSelfToggle() kalau memang bukan).
// Baris ke-2 dst default false supaya total porsi "milik sendiri" tidak
// sengaja kedobel tanpa user sadar.
addOwnerRow(){
// SESI B2a: guard pertahanan-berlapis -- tombol ini sudah disembunyikan lewat
// _toggleOwnersEditControls() saat Aset._ownersReadOnly, tapi tetap dijaga di sini
// (data-action bisa saja terpanggil dari jalur lain) supaya draft read-only dari
// Holding Investasi TIDAK PERNAH ikut termutasi.
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Aset._ownersModalAsset){toast('⚠️ Simpan aset ini dulu sebelum mengatur porsi kepemilikan');return;}
Aset._ownersDraft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
Aset._ownersDraft.push({ownerId:'',ownerName:'',porsi:0,isSelf:Aset._ownersDraft.length===0,settlement:'titipan'});
Aset._renderOwnersList();
},
// removeOwnerRow(i) -- SESI 392b: hapus 1 baris pemilik dari Aset._ownersDraft (index i),
// lalu render ulang list. Sama seperti addOwnerRow(), murni ubah draft di memori.
removeOwnerRow(i){
// SESI B2a: guard sama alasan addOwnerRow() di atas.
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Array.isArray(Aset._ownersDraft))return;
// FITUR "Auto-Rebalance Porsi Pemilik": index baris bisa bergeser setelah hapus -- buang
// panel rebalance yang sedang tampil (kalau ada) supaya tidak menunjuk baris yang salah.
// _renderOwnersList() di bawah akan render ulang panel dari kondisi bersih (null).
Aset._rebalancePending=null;
const removed=Aset._ownersDraft[i];
Aset._ownersDraft.splice(i,1);
// FIX (audit "porsi titipan tidak bisa dihapus & disimpan di tab edit
// kepemilikan"): SEBELUMNYA baris dihapus dari draft APA ADANYA tanpa
// redistribusi -- total porsi baris yang TERSISA otomatis jadi <100%
// (mis. hapus baris titipan 30% saat SELF masih 70% -> total cuma 70%),
// & updateOwnersTotal() men-disable tombol "✅ Simpan Porsi" sampai total
// PERSIS 100% lagi (lihat komentar updateOwnersTotal()) -- user yang cuma
// mau MENGHAPUS 1 baris titipan jadi kelihatan "tidak bisa dihapus &
// disimpan" krn tombol Simpan macet ter-disable tanpa penjelasan jelas
// knapa. Fix: bagi RATA porsi baris yang baru dihapus ke SEMUA baris
// tersisa (baris terakhir dpt sisa pembulatan supaya total PERSIS 100,
// pola presisi 4 desimal & "sisa ke baris terakhir" SAMA PERSIS
// _autoDistributeRemaining() di atas -- 0 rumus baru) -- total otomatis
// balik ke 100% & tombol Simpan langsung aktif, TANPA user harus hitung
// manual porsi baris yang tersisa satu-satu.
const removedPorsi=removed&&typeof removed.porsi==='number'&&isFinite(removed.porsi)?removed.porsi:0;
if(removedPorsi>0&&Aset._ownersDraft.length){
const n=Aset._ownersDraft.length;
let acc=0;
Aset._ownersDraft.forEach((o,k)=>{
let tambahan;
if(k===n-1){tambahan=Math.round((removedPorsi-acc)*10000)/10000;}
else{tambahan=Math.round((removedPorsi/n)*10000)/10000;acc+=tambahan;}
const cur=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
o.porsi=Math.round((cur+tambahan)*10000)/10000;
});
}
Aset._renderOwnersList();
},
// onOwnerNameInput(i,val) / onOwnerPorsiInput(i,val) -- SESI 392b: tulis perubahan
// ketikan user ke Aset._ownersDraft[i], TANPA render ulang list (render ulang hanya
// perlu saat baris ditambah/dihapus, bukan tiap karakter diketik, supaya fokus/kursor
// input tidak hilang). SESI 392c: onOwnerPorsiInput() sekarang juga memanggil
// updateOwnersTotal() supaya indikator total porsi (hijau/merah) ikut update realtime
// tiap ketik -- updateOwnersTotal() sendiri PURE baca #assetOwnersTotalBox +
// Aset._ownersDraft, tidak menyentuh list input lain, jadi aman dipanggil tiap karakter
// tanpa kena masalah fokus/kursor yang sama seperti _renderOwnersList().
onOwnerNameInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
Aset._ownersDraft[i].ownerName=val;
},
// onOwnerSelectChange(i,val) -- SESI 490: dipanggil dari dropdown pilih pemilik
// (_ownerNameFieldHtml(), baris non-SELF, hanya muncul kalau OwnerRegistry sudah punya
// entri). val==="__new__" -> masuk mode _creatingNew (render ulang jadi free-text kosong,
// sama seperti baris baru dari addOwnerRow()). val kosong -> kosongkan ownerId/ownerName
// (belum pilih apa-apa). val id existing -> isi ownerId/ownerName draft dari entri
// registry yang cocok. Render ulang list -- event onchange DISKRIT (bukan tiap ketik),
// aman & tidak kena masalah fokus/kursor seperti onOwnerNameInput()/onOwnerPorsiInput().
onOwnerSelectChange(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
if(val==='__new__'){
Aset._ownersDraft[i]._creatingNew=true;
Aset._ownersDraft[i].ownerId='';
Aset._ownersDraft[i].ownerName='';
Aset._renderOwnersList();
return;
}
if(!val){
Aset._ownersDraft[i].ownerId='';
Aset._ownersDraft[i].ownerName='';
Aset._renderOwnersList();
return;
}
const registryList=(typeof OwnerRegistry!=='undefined')?OwnerRegistry.listAll():[];
const entry=registryList.find((r)=>r.id===val);
Aset._ownersDraft[i].ownerId=val;
Aset._ownersDraft[i].ownerName=entry?entry.name:Aset._ownersDraft[i].ownerName;
Aset._ownersDraft[i]._creatingNew=false;
// SESI AF2 (fitur "Auto-fill dari Kuota Sisa Titipan", permintaan user via screenshot aset
// "renov"): begitu owner non-SELF dipilih dari dropdown & baris ini MASIH kosong (porsi<=0,
// belum pernah diketik manual -- _touched falsy), isi otomatis Porsi (%) (& Nominal (Rp) ikut
// lewat _renderOwnersList di bawah, sama seperti alur manual) dari sisa kuota titipan owner
// tsb, DIBATASI supaya tidak mendorong total porsi lewat 100% (lihat _ownerQuotaPorsiCap()).
// Tetap 100% bisa diedit manual setelahnya -- oninput onOwnerPorsiInput()/onOwnerNominalInput()
// jalan seperti biasa & akan menandai _touched, menimpa nilai auto-fill ini apa adanya.
if(!Aset._ownersDraft[i]._touched){
const curPorsi=typeof Aset._ownersDraft[i].porsi==='number'&&isFinite(Aset._ownersDraft[i].porsi)?Aset._ownersDraft[i].porsi:0;
if(curPorsi<=0){
const cap=Aset._ownerQuotaPorsiCap(i);
if(typeof cap==='number'&&cap>0){
Aset._ownersDraft[i].porsi=cap;
Aset._ownersDraft[i]._touched=true;
Aset._ownersDraft[i]._autoFilled=true;
if(typeof toast==='function')toast('💡 Porsi diisi otomatis dari sisa kuota titipan ('+cap+'%) — bisa diedit manual');
}
}
}
Aset._renderOwnersList();
},
// _ownerQuotaPorsiCap(i) -- SESI AF2: hitung berapa Porsi (%) maksimum yang aman diisi otomatis
// utk baris owner ke-i, dari sisa kuota titipannya, TANPA mendorong total porsi semua baris
// lewat 100%. 100% REUSE rumus sisa kuota yang sama persis dgn _ownerQuotaText() (principal -
// allocatedExcluding - usedTotal - linkedExpenseTotal, draftNominal baris ini dianggap 0 krn
// baris belum diisi) -- 0 rumus kuota baru. Balikin null kalau tidak berlaku (owner SELF/belum
// pilih owner/owner belum punya commitment/nilai aset belum diisi), 0 kalau kuota sisa owner
// itu <=0 atau ruang porsi yang tersisa (100% - total baris LAIN) sudah habis.
_ownerQuotaPorsiCap(i){
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const o=draft[i];
if(!o||o.isSelf||!o.ownerId)return null;
if(typeof DanaTitipanPortfolioAPI==='undefined')return null;
const commit=DanaTitipanPortfolioAPI.getCommitments().find((c)=>c&&c.ownerId===o.ownerId);
if(!commit||!isFinite(commit.principalAmount))return null;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0))return null;
const principal=Number(commit.principalAmount);
const currentAssetId=Aset._ownersModalAsset?Aset._ownersModalAsset.id:null;
const excluding=DanaTitipanPortfolioAPI.allocatedExcluding(o.ownerId,{assetId:currentAssetId});
const projection=(typeof DanaTitipanPortfolioAPI.build==='function')?DanaTitipanPortfolioAPI.build():null;
const ownerBucket=(projection&&Array.isArray(projection.owners))?projection.owners.find((ow)=>ow&&ow.ownerId===o.ownerId):null;
const usedTotal=ownerBucket?(ownerBucket.usedTotal||0):0;
const linkedExpenseTotal=ownerBucket?(ownerBucket.linkedExpenseTotal||0):0;
const sisaRp=principal-excluding-usedTotal-linkedExpenseTotal;
if(!(sisaRp>0))return 0;
const quotaPorsi=sisaRp/nilai*100;
const otherTotal=draft.reduce((sum,row,k)=>k===i?sum:sum+(typeof row.porsi==='number'&&isFinite(row.porsi)?row.porsi:0),0);
const remainingPorsi=Math.max(0,100-otherTotal);
const capped=Math.min(quotaPorsi,remainingPorsi);
return Math.round(Math.max(0,capped)*10000)/10000;
},
// applyQuotaToRow(i) -- SESI AF2: versi "tombol manual" dari auto-fill di atas -- dipanggil dari
// tombol "🔄 Isi dari kuota sisa" yang muncul di baris kuota tiap owner non-SELF
// (_ownerQuotaText() diperluas di bawah utk menyisipkan tombol ini). BEDA dgn auto-fill di
// onOwnerSelectChange() (yang cuma jalan sekali & hanya kalau baris masih kosong), tombol ini
// bisa dipanggil kapan saja user mau MENIMPA ulang porsi baris ke nilai kuota-sisa terkini
// (mis. stlh nilai aset baru diisi, atau user sudah sempat ubah manual tapi mau reset ke kuota)
// -- makanya TIDAK dicek _touched/curPorsi<=0 di sini, beda dgn cabang auto-fill pasif di atas.
applyQuotaToRow(i){
if(Aset._ownersReadOnly)return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft[i])return;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0)){if(typeof toast==='function')toast('⚠️ Isi dulu "Estimasi Nilai Saat Ini" aset ini sebelum bisa isi otomatis dari kuota');return;}
const cap=Aset._ownerQuotaPorsiCap(i);
if(cap===null){if(typeof toast==='function')toast('⚠️ Owner ini belum punya pokok titipan tercatat');return;}
if(cap<=0){if(typeof toast==='function')toast('⚠️ Kuota sisa owner ini sudah habis / ruang porsi sudah penuh');return;}
// FIX (laporan user "field Nominal/Porsi tidak bertambah/berkurang stlh klik"): SEBELUM fix
// ini, toast SELALU bilang "✅ Porsi diisi..." walau `cap` hasil hitung PERSIS SAMA dgn porsi
// yang sudah ada (kasus wajar: baris itu sudah memakai hampir seluruh kuotanya, sisa cuma
// beberapa rupiah -- lihat komentar _ownerQuotaPorsiCap() di atas, `cap` = total kuota
// TERMASUK yang sudah dialokasikan baris ini, bukan cuma sisa mentahnya). Field memang TIDAK
// berubah scr visual (bukan bug render -- 100% REUSE _renderOwnersList() yang sama dipakai
// ketik manual), tapi toast sukses yang tetap muncul bikin user kira ada yg tidak beres.
// Fix: bandingkan cap dgn porsi SEBELUMNYA -- kalau bedanya kurang dari presisi tampilan
// (0.0001%, sama toleransi pembulatan _ownerQuotaPorsiCap()), kasih toast beda yang jujur
// menjelaskan kenapa tidak ada perubahan, TIDAK menulis ulang draft/render (0 efek samping).
const prevPorsi=typeof draft[i].porsi==='number'&&isFinite(draft[i].porsi)?draft[i].porsi:0;
if(Math.abs(cap-prevPorsi)<0.0001){
if(typeof toast==='function')toast('ℹ️ Porsi baris ini sudah memakai hampir seluruh kuota titipannya -- sisa yang bisa ditambahkan cuma sedikit sekali, jadi angkanya tidak berubah');
return;
}
draft[i].porsi=cap;
draft[i]._touched=true;
draft[i]._autoFilled=true;
Aset._renderOwnersList();
if(typeof toast==='function')toast('✅ Porsi diisi dari sisa kuota titipan ('+cap+'%)');
},
onOwnerPorsiInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
const n=parseFloat(val);
const porsi=isFinite(n)?n:0;
Aset._ownersDraft[i].porsi=porsi;
// SESI AF1 (fitur "Auto-fill Sisa Porsi"): tandai baris ini "ditulis manual" supaya tidak
// jadi target auto-fill di kemudian hari (lihat calculateRemainingShare(), modules-calc.js).
Aset._ownersDraft[i]._touched=true;
// SESI 429: sync field Nominal (Rp) baris ini realtime -- ubah value DOM
// langsung (BUKAN _renderOwnersList ulang), sama disiplin dgn kenapa
// _renderOwnersList tidak dipanggil tiap ketik (lihat komentar di atasnya):
// render ulang akan menghilangkan fokus/kursor input yang sedang diketik.
const nilai=Aset._ownersAssetNilai();
if(nilai>0){
const nomEl=document.getElementById('ownerNominal'+i);
if(nomEl)nomEl.value=Math.round(nilai*porsi/100);
}
Aset.updateOwnersTotal();
// SESI 505 -- "Kuota sisa" per owner terpisah dari validasi total-porsi 100% di atas (soft
// warning, TIDAK menyentuh saveBtn.disabled -- lihat _ownerQuotaText()/_updateOwnerQuotaDisplay()),
// mirror PERSIS InvestmentUI.onOwnerPorsiInput() (S494).
Aset._updateOwnerQuotaDisplay(i);
// SESI AF1 -- auto-fill baris kosong berikutnya dgn sisa porsi (lihat _applyRemainingShare()).
Aset._applyRemainingShare(i);
// FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026): kalau ketikan ini bikin total porsi
// >100% (& ada porsi pemilik lain yg bisa dikurangi), tawarkan penyesuaian lewat panel
// preview -- TIDAK PERNAH mengubah porsi pemilik lain diam-diam, lihat
// _checkRebalanceTrigger()/_renderRebalancePanel() di bawah.
Aset._checkRebalanceTrigger(i);
},
// onOwnerNominalInput(i,val) -- SESI 429: arah sebaliknya dari
// onOwnerPorsiInput() -- user isi Nominal (Rp), porsi% baris ini dihitung
// ulang (nominal/nilaiAset*100, dibulatkan 2 desimal spt remainingPorsi())
// & ditulis ke Aset._ownersDraft[i].porsi (SAMA persis field yang dibaca
// saveOwners()/updateOwnersTotal() -- 0 field baru di draft/D.assets,
// Nominal murni tampilan turunan dari porsi% + nilai aset, TIDAK pernah
// disimpan sbg field sendiri). Field Nominal disabled kalau aset belum
// punya nilai (lihat _renderOwnersList), jadi guard nilai<=0 di sini
// murni jaga-jaga kalau handler terpanggil manual saat disabled.
// SESI 431: setelah porsi baris ini ditulis, sisa nilai aset (nilaiAset -
// nominal baris ini, dijepit ke >=0 -- "sampai 0", TIDAK pernah negatif)
// dibagi RATA ke SEMUA baris pemilik lain lewat _autoDistributeRemaining()
// (baru) supaya total porsi otomatis balik ke 100% tanpa user hitung
// manual tiap baris lain -- lihat komentar _autoDistributeRemaining() utk
// detail rumus & alasan pembulatan sisa ke baris terakhir.
onOwnerNominalInput(i,val){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
const nilai=Aset._ownersAssetNilai();
const n=parseFloat(String(val).replace(/[^0-9.-]/g,''));
const nominal=isFinite(n)?n:0;
// SESI AF1: tandai baris ini "ditulis manual" (lihat onOwnerPorsiInput() di atas).
Aset._ownersDraft[i]._touched=true;
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// SEBELUMNYA method ini `return` langsung kalau nilai<=0 (aset belum py
// "Estimasi Nilai Saat Ini") -- field Nominal dulu memang disabled di
// kondisi ini jadi handler ini "tidak pernah" kepanggil, TAPI itu blokir
// use-case nyata: user SUDAH tahu Porsi (%) tiap pemilik (total pas 100%,
// lihat baris ini punya draft[i].porsi terisi), yang belum ada cuma total
// Rp instrumennya. Cabang baru ini membalik arah derivasi: dari Nominal +
// Porsi (%) baris INI (bukan nominal/nilai spt cabang normal di bawah),
// tarik nilai TOTAL instrumen tersirat = nominal / (porsi/100), simpan ke
// Aset._ownersDraftNilai (dibaca _ownersAssetNilai(), dipakai saveOwners()
// utk nulis a.nilai beneran). Kalau porsi baris ini JUGA belum diisi
// (0/kosong) -- 0 persamaan 2 unknown, tidak ada cara aman menebak nilai
// dasar, dibiarkan (field tetap bisa diketik, cuma belum ada efek sampai
// Porsi (%)-nya diisi juga).
if(nilai<=0){
const porsiBaris=typeof Aset._ownersDraft[i].porsi==='number'&&isFinite(Aset._ownersDraft[i].porsi)?Aset._ownersDraft[i].porsi:0;
if(porsiBaris<=0||nominal<=0)return;
const nilaiTersirat=Math.round(nominal/(porsiBaris/100));
if(!isFinite(nilaiTersirat)||nilaiTersirat<=0)return;
Aset._ownersDraftNilai=nilaiTersirat;
// Nominal (Rp) baris LAIN ikut tersinkron ke nilai yang baru tersirat --
// porsi baris lain TIDAK berubah (beda dari cabang normal di bawah yang
// panggil _autoDistributeRemaining -- di sini porsi semua baris memang
// sudah fix/diketahui user, cuma tampilan Rp-nya yang menyusul).
Aset._ownersDraft.forEach((o,k)=>{
if(k===i)return;
const nomEl=document.getElementById('ownerNominal'+k);
if(nomEl&&typeof o.porsi==='number'&&isFinite(o.porsi))nomEl.value=Math.round(nilaiTersirat*o.porsi/100);
});
Aset.updateOwnersTotal();
// SESI 505 -- nilai tersirat baru mengubah basis draftNominal SEMUA baris (bukan cuma baris
// ini), jadi kuota baris lain ikut di-refresh juga (0 baris terlewat, sama pola sync Nominal
// (Rp) di atas). Guard di _updateOwnerQuotaDisplay() sendiri aman dipanggil utk baris SELF
// (elemen #assetOwnerKuota{i} SELF memang tidak pernah dirender, jadi getElementById balik
// null & fungsi diam2 return).
Aset._ownersDraft.forEach((o,k)=>{ Aset._updateOwnerQuotaDisplay(k); });
return;
}
// FIX S457 (bug: "Nominal manual berubah setelah Simpan Porsi", audit
// Agustus 2026): SEBELUMNYA porsi hasil konversi Rp->% dibulatkan ke 2
// desimal (Math.round(...*100)/100). Untuk nilai aset besar, resolusi 2
// desimal (0,01% dari nilai aset) bisa LEBIH KASAR dari selisih 2 nominal
// Rp yang beda tapi user maksud beda -- contoh nilai aset ~Rp11,7jt:
// 0,01% = Rp1.170, padahal selisih Rp1.699.786 vs Rp1.700.000 cuma
// Rp214 -- keduanya kebulat ke porsi PERSIS SAMA (15,12%). Akibatnya
// _renderOwnersList() (yang derive Nominal tampilan dari porsi tersimpan,
// Math.round(nilai*porsi/100)) balik menampilkan nominal LAMA (1.699.786)
// stlh "Simpan Porsi", bukan yang baru diketik user (1.700.000) -- user
// kira ketikannya "tidak kesimpan" padahal porsi-nya sendiri sudah benar,
// cuma re-derive Rp-nya yang lossy.
// FIX: naikkan presisi pembulatan porsi hasil konversi dari 2 ke 4 desimal
// (Math.round(...*10000)/10000) -- resolusi jadi 0,0001% dari nilai aset
// (utk nilai ~Rp11,7jt = ~Rp11,7, jauh lebih halus dari selisih rupiah
// realistis apa pun yang biasa diketik user), sehingga round-trip
// Rp->porsi%->Rp praktis lossless. SENGAJA TIDAK pakai anchor/state
// terpisah utk "mengingat" Rp asli yang diketik user (didiskusikan &
// ditolak, lihat FIX-v1177-to-v1178-s457-nominal-precision.md) -- anchor
// terpisah berarti 2 sumber-kebenaran (draft.porsi vs draft anchor Rp)
// yang harus disinkronkan manual di banyak tempat (tiap edit Porsi (%),
// tiap auto-bagi baris lain, tiap buka/reset modal) & rawan lupa 1 jalur
// invalidasi -- lihat _resyncOwnersFromDOM() yang SUDAH independen
// re-derive porsi dari DOM saat saveOwners(); 2 mekanisme sumber-kebenaran
// yang jalan sendiri2 itulah yang jadi kandidat kuat penyebab bug KEDUA
// ("porsi harus lebih dari 0" palsu) yang ditemukan saat coba pasang
// anchor. Presisi lebih tinggi menyelesaikan akar masalah (rounding lossy)
// tanpa nambah state/mekanisme baru -- 0 field baru, 1 sumber kebenaran
// tetap (Aset._ownersDraft[i].porsi), pola pembulatan yang sama dipakai
// konsisten di _autoDistributeRemaining()/_resyncOwnersFromDOM() (lihat
// komentar masing2 di bawah).
const porsi=Math.round((nominal/nilai*100)*10000)/10000;
Aset._ownersDraft[i].porsi=porsi;
const porsiEl=document.getElementById('ownerPorsi'+i);
if(porsiEl)porsiEl.value=porsi;
// SESI AF1: ganti trigger auto-bagi dari _autoDistributeRemaining() (broadcast rata/proporsional
// ke SEMUA baris lain, DIHAPUS -- lihat komentar di atas _applyRemainingShare()) ke
// _applyRemainingShare() (isi HANYA baris kosong berikutnya yang belum disentuh user) --
// konsisten dgn perilaku onOwnerPorsiInput() & 2 modal lain (Investasi/Akun).
Aset._applyRemainingShare(i);
Aset.updateOwnersTotal();
// SESI 505 -- porsi baris ini berubah (& _applyRemainingShare() di atas sudah menyesuaikan
// baris target kalau ada), refresh kuota SEMUA baris (sama alasan cabang nilai<=0 di atas).
Aset._ownersDraft.forEach((o,k)=>{ Aset._updateOwnerQuotaDisplay(k); });
// BUGFIX S622 (laporan user, screenshot aset "renov" -- persis skenario yang mendasari
// fitur Auto-Rebalance ini dibuat, lihat header fitur di atas): onOwnerPorsiInput() SUDAH
// memanggil _checkRebalanceTrigger() (baris ~837) tiap ketik, TAPI cabang ini
// (onOwnerNominalInput(), arah Rp->%) LUPA memanggilnya -- padahal keduanya SAMA-SAMA
// menulis Aset._ownersDraft[i].porsi & bisa SAMA-SAMA mendorong total >100%. Akibatnya:
// user ketik di kolom Nominal (Rp) baris pemilik baru sampai total >100% (persis kasus
// nyata: 2 pemilik sudah pas 100%, tambah pemilik ke-3 lewat Nominal) -> tombol "Simpan
// Porsi" otomatis ter-disable (updateOwnersTotal() di atas) TAPI panel "⚖️ Porsi melebihi
// 100%" yang seharusnya menawarkan penyesuaian 1-tombol TIDAK PERNAH muncul, krn baris
// pemicunya cuma ada di onOwnerPorsiInput(). User terjebak: total merah, save mati, tidak
// ada cara mudah membetulkan selain hitung manual/klik ulang tiap baris ganti ke Porsi (%).
// Fix: tambah 1 baris pemanggilan yang hilang, pola SAMA PERSIS onOwnerPorsiInput() (0
// rumus baru, _checkRebalanceTrigger() sendiri sudah PURE & aman dipanggil kapan saja --
// no-op kalau total<=100).
Aset._checkRebalanceTrigger(i);
},
// _autoDistributeRemaining() (SESI 431/449/457) -- DIHAPUS di sesi AF1 lanjutan (lihat
// SESI-AF1-SESSION-NOTE.md): sejak _applyRemainingShare() jadi satu-satunya trigger auto-bagi
// (dipanggil dari onOwnerPorsiInput() & onOwnerNominalInput() di bawah, lihat komentarnya
// masing2), method ini sudah tidak dipanggil dari mana pun di kode aplikasi (0 caller UI, cuma
// dipanggil test lama secara langsung) -- dead code. Sesuai rekomendasi eksplisit
// DESIGN-LOCK-autofill-sisa-porsi.md ("Rekomendasi: ganti total ke util baru supaya 1 sumber
// logika, hapus _autoDistributeRemaining() duplikat"), method + rumus bagi-proporsionalnya
// (S449) DIHAPUS -- calculateRemainingShare() (modules-calc.js) sekarang SATU-SATUNYA sumber
// logika auto-bagi utk ketiga modal (Aset/Investasi/Akun). Test lama yang memanggil method ini
// langsung (tests/asset-owners-nominal-autodistribute-proportional-s449.test.js) sudah ditulis
// ulang utk menguji perilaku _applyRemainingShare() yang menggantikannya (isi HANYA baris kosong
// berikutnya, bukan broadcast proporsional -- lihat Design Lock keputusan #2).
// _applyRemainingShare(editedIndex) -- SESI AF1 (fitur "Auto-fill Sisa Porsi"). Wrapper DOM+draft
// di sekitar calculateRemainingShare() (PURE, modules-calc.js, SSOT dipakai 3 modal) -- kalau ada
// 1 baris kosong yg belum disentuh user, isi porsi & (kalau aset punya nilai>0) Nominal (Rp) baris
// itu, lalu refresh total & kuota baris itu. Guard typeof: modules-calc.js selalu dimuat lebih
// dulu (GROUP_A awal) jadi seharusnya selalu ada, tapi dijaga tetap aman kalau urutan berubah.
_applyRemainingShare(editedIndex){
if(typeof calculateRemainingShare!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const result=calculateRemainingShare(draft,editedIndex);
if(!result)return;
draft[result.targetIndex].porsi=result.porsi;
const porsiEl=document.getElementById('ownerPorsi'+result.targetIndex);
if(porsiEl)porsiEl.value=result.porsi;
const nilai=Aset._ownersAssetNilai();
if(nilai>0){
const nomEl=document.getElementById('ownerNominal'+result.targetIndex);
if(nomEl)nomEl.value=Math.round(nilai*result.porsi/100);
}
Aset.updateOwnersTotal();
Aset._updateOwnerQuotaDisplay(result.targetIndex);
},
// ================= FITUR "Auto-Rebalance Porsi Pemilik" (Agustus 2026) =================
// Permintaan user (screenshot modal "⚖️ Atur Porsi Kepemilikan" aset "renov",
// assetOwnersModal): saat menambah pemilik baru ke aset yang porsinya sudah terisi >1
// pemilik, total porsi jadi >100% tanpa cara mudah menyesuaikan porsi pemilik lama.
// Fitur ini menawarkan penyesuaian (proporsional/dari terbesar/manual) lewat panel
// preview, TIDAK PERNAH mengubah porsi pemilik lama diam-diam -- rumus 100% REUSE
// calculateRebalance() (modules-calc.js, PURE, SSOT dipakai 3 modal porsi kepemilikan:
// Aset di sini, AccOwners di finance/akun.js, InvestmentUI di investasi-view.js).
//
// Aset._rebalancePending -- {editedIndex,method,manualIndex} kalau panel penyesuaian
// SEDANG tampil, null kalau tidak. TIDAK PERNAH ditulis langsung ke Aset._ownersDraft --
// hanya state UI murni, penulisan beneran hanya lewat applyRebalance() di bawah.
_rebalancePending:null,
// _checkRebalanceTrigger(editedIndex) -- dipanggil dari onOwnerPorsiInput() tiap ketik
// (setelah _applyRemainingShare() existing di atas, TIDAK saling ganggu krn kondisi
// keduanya saling eksklusif: _applyRemainingShare hanya jalan saat ada baris kosong &
// sisa>0, rebalance hanya jalan saat total >100%) & dari openOwnersModal()/resetOwners()
// (migrasi data lama yg sudah overflow sebelum fitur ini ada -- lihat komentar di
// openOwnersModal()). Set/reset Aset._rebalancePending berdasarkan kondisi total porsi
// draft saat ini, TANPA pernah menulis ke draft (aturan #6 -- tidak pernah mengubah
// porsi pemilik lain diam-diam, penulisan porsi beneran hanya lewat applyRebalance()).
_checkRebalanceTrigger(editedIndex){
if(typeof MultiOwnerEngine==='undefined'||typeof calculateRebalance!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length||!draft[editedIndex]){
if(Aset._rebalancePending){Aset._rebalancePending=null;Aset._renderRebalancePanel();}
return;
}
const total=MultiOwnerEngine.totalPorsi(draft);
// Trigger HANYA aktif kalau total >100% DAN ada porsi pemilik lain yg bisa dikurangi
// (kalau cuma 1 baris terisi & user isi >100% sendiri, itu bukan kasus rebalance --
// biarkan updateOwnersTotal() existing yang tampilkan peringatan merah).
let oldTotal=0;
draft.forEach((o,k)=>{if(k!==editedIndex)oldTotal+=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;});
if(total<=100||oldTotal<=0){
if(Aset._rebalancePending){Aset._rebalancePending=null;Aset._renderRebalancePanel();}
return;
}
if(!Aset._rebalancePending||Aset._rebalancePending.editedIndex!==editedIndex){
Aset._rebalancePending={editedIndex,method:'proporsional',manualIndex:null};
}
Aset._renderRebalancePanel();
},
// _rebalanceOwnerLabel(draft,i) -- nama tampilan 1 baris pemilik utk preview panel,
// fallback "Pemilik #n" kalau nama masih kosong (baris baru yg belum diisi nama).
_rebalanceOwnerLabel(draft,i){
const o=draft[i];
return (o&&o.ownerName)?o.ownerName:('Pemilik #'+(i+1));
},
// _renderRebalancePanel() -- SATU titik render panel "⚖️ Porsi melebihi 100%" (pilihan
// metode + preview "A: 71,88% -> 57,50%" dst + tombol Terapkan/Batal), dipasang sbg
// elemen sibling setelah #assetOwnersList lewat insertAdjacentElement (TIDAK perlu ubah
// markup modal di modals.js sama sekali). Kosongkan box kalau Aset._rebalancePending
// null (tidak ada apa2 utk ditampilkan).
_renderRebalancePanel(){
// Box statis #assetOwnersRebalanceBox sudah ada di template assetOwnersModal (modals.js,
// tepat setelah #assetOwnersList) -- TIDAK perlu insertAdjacentElement/createElement lagi,
// cukup isi innerHTML-nya (sama pola sederhana dgn box lain di modal ini).
const box=document.getElementById('assetOwnersRebalanceBox');
if(!box)return;
const pending=Aset._rebalancePending;
if(!pending||Aset._ownersReadOnly){box.innerHTML='';return;}
if(typeof calculateRebalance!=='function'){box.innerHTML='';return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
const eligibleOthers=draft.map((o,k)=>({k,o})).filter((x)=>x.k!==pending.editedIndex);
let previewHtml='';
if(calc&&calc.ok){
previewHtml=calc.adjustments.map((a)=>{
const label=Aset._rebalanceOwnerLabel(draft,a.index);
return '<div style="font-size:12.5px;color:var(--text2);margin-bottom:2px">'+escapeHtml(label)+': '+a.from+'% → <b style="color:var(--accent)">'+a.to+'%</b></div>';
}).join('');
}else if(calc){
const msg=calc.error==='manual_owner_insufficient'?'⚠️ Porsi pemilik terpilih tidak cukup utk menutup kelebihan.'
:calc.error==='manual_owner_not_selected'?'⚠️ Pilih dulu pemilik yang porsinya mau dikurangi.'
:'⚠️ Porsi pemilik lain tidak cukup utk menutup kelebihan ini.';
previewHtml='<div style="font-size:12.5px;color:var(--accent2)">'+msg+'</div>';
}
const manualSelect=pending.method==='manual'
?('<select class="fs u-mb10" onchange="Aset.setRebalanceManualOwner(this.value)">'
+'<option value="">Pilih pemilik…</option>'
+eligibleOthers.map((x)=>'<option value="'+x.k+'"'+(pending.manualIndex===x.k?' selected':'')+'>'+escapeHtml(Aset._rebalanceOwnerLabel(draft,x.k))+' ('+x.o.porsi+'%)</option>').join('')
+'</select>')
:'';
box.innerHTML='<div style="margin:10px 0;padding:12px;background:var(--surface3);border-radius:12px;border:1px solid var(--accent2)">'
+'<div style="font-size:13px;font-weight:700;color:var(--accent2);margin-bottom:8px">⚖️ Porsi melebihi 100% -- pilih cara menyesuaikan:</div>'
+'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="assetRebalanceMethod" value="proporsional"'+(pending.method==='proporsional'?' checked':'')+' onchange="Aset.setRebalanceMethod(this.value)"> Proporsional</label>'
+'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="radio" name="assetRebalanceMethod" value="largest"'+(pending.method==='largest'?' checked':'')+' onchange="Aset.setRebalanceMethod(this.value)"> Kurangi dari pemilik terbesar</label>'
+'<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:10px;cursor:pointer"><input type="radio" name="assetRebalanceMethod" value="manual"'+(pending.method==='manual'?' checked':'')+' onchange="Aset.setRebalanceMethod(this.value)"> Pilih pemilik manual</label>'
+manualSelect
+'<div style="margin:6px 0 10px">'+previewHtml+'</div>'
+'<div class="u-flex u-gap8">'
+'<button type="button" class="btn btn-primary u-flex1" style="padding:11px" data-action="Aset.applyRebalance"'+((!calc||!calc.ok)?' disabled':'')+'>✅ Terapkan Penyesuaian</button>'
+'<button type="button" class="btn btn-ghost" style="padding:11px" data-action="Aset.cancelRebalance">Batal</button>'
+'</div></div>';
},
// setRebalanceMethod(val) / setRebalanceManualOwner(val) -- ganti metode/pilihan manual
// di panel, render ULANG PREVIEW SAJA (bukan seluruh list _renderOwnersList(), supaya
// konsisten dgn disiplin "tidak reset fokus input" file ini -- walau panel ini sendiri
// tidak punya input teks yg fokusnya perlu dijaga, dipertahankan supaya polanya seragam).
setRebalanceMethod(val){
if(!Aset._rebalancePending)return;
Aset._rebalancePending.method=(val==='largest'||val==='manual')?val:'proporsional';
if(Aset._rebalancePending.method!=='manual')Aset._rebalancePending.manualIndex=null;
Aset._renderRebalancePanel();
},
setRebalanceManualOwner(val){
if(!Aset._rebalancePending)return;
const idx=val===''?null:parseInt(val,10);
Aset._rebalancePending.manualIndex=isFinite(idx)?idx:null;
Aset._renderRebalancePanel();
},
// applyRebalance() -- SATU-SATUNYA titik yang menulis hasil calculateRebalance() ke
// Aset._ownersDraft (menandai baris yang berubah _touched, aturan #15 -- field otomatis
// tetap bisa diedit manual lagi, tidak ada penguncian input), lalu _renderOwnersList()
// penuh (aman, ini aksi diskrit dari tap tombol, bukan tiap karakter diketik).
applyRebalance(){
const pending=Aset._rebalancePending;
if(!pending||typeof calculateRebalance!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
const calc=calculateRebalance(draft,pending.editedIndex,pending.method,pending.manualIndex);
if(!calc||!calc.ok){toast('⚠️ Penyesuaian tidak valid, coba metode lain');return;}
calc.adjustments.forEach((a)=>{
if(a.to===a.from)return;
draft[a.index].porsi=a.to;
draft[a.index]._touched=true;
});
Aset._rebalancePending=null;
Aset._renderOwnersList();
toast('✅ Porsi pemilik disesuaikan ke total 100%');
},
// cancelRebalance() -- buang panel TANPA mengubah draft sama sekali (aturan #6, #14).
cancelRebalance(){
Aset._rebalancePending=null;
Aset._renderRebalancePanel();
},
// onOwnerIsSelfToggle(i,checked) -- SESI 393: tandai/lepas baris ke-i draft
// sebagai porsi milik sendiri (dipakai Zakat Maal/Pajak Aset lewat
// MultiOwnerEngine.selfOwnedValue()). TIDAK ada batasan cuma-1-baris --
// user bisa tandai lebih dari 1 baris kalau memang beberapa baris itu
// sama-sama "aku" (mis. dicatat terpisah karena alasan lain), totalnya
// dijumlah apa adanya oleh selfPorsi().
onOwnerIsSelfToggle(i,checked){
if(!Array.isArray(Aset._ownersDraft)||!Aset._ownersDraft[i])return;
Aset._ownersDraft[i].isSelf=!!checked;
// SESI 497 FIX (mirror investasi-view.js InvestmentUI.onOwnerIsSelfToggle()): _ownerNameFieldHtml()
// nentuin free-text vs dropdown lewat o.isSelf, tapi cuma dievaluasi ulang saat _renderOwnersList()
// jalan -- toggle checkbox ini sebelumnya TIDAK memanggilnya, jadi field name macet di tipe lama
// (baris pertama default isSelf:true -> free-text, user uncheck "Ini saya" -> dropdown existing-owner
// tidak pernah muncul walau OwnerRegistry sudah ada isi). Event diskrit, aman render ulang penuh.
Aset._renderOwnersList();
},
// _resyncOwnersFromDOM() -- SESI 453 FIX (laporan user: field Nominal (Rp)
// kadang "tidak kepanggil" -- di video kelihatan toolbar quick-action browser
// (mis. Brave, salah deteksi field Nominal sbg form checkout/belanja) muncul
// di atas keyboard tepat saat user mengetik, mengganggu event `oninput`
// ketikan TERAKHIR sebelum tap Simpan). Akibatnya Aset._ownersDraft[i].porsi
// bisa ketinggalan satu ketikan dari apa yang SUNGGUH tertulis di layar
// (`#ownerNominal{i}`.value di DOM) -- draft di memori jadi tidak sinkron dgn
// tampilan, walau user sudah lihat angka yang benar sebelum tap Simpan.
// Dipanggil saveOwners() PALING AWAL (sebelum validasi nama/porsi & sebelum
// MultiOwnerEngine.setOwners()) -- baca ulang value ASLI tiap
// `#ownerNominal{i}` langsung dari DOM (sumber kebenaran akhir, bukan
// bergantung pada apakah `oninput` sempat ke-fire), bandingkan dgn nominal
// yang TERSIRAT dari draft[i].porsi saat ini (nilai*porsi/100, dibulatkan --
// pola pembulatan SAMA PERSIS onOwnerPorsiInput()/_autoDistributeRemaining()
// waktu nulis value ke DOM, supaya baris yang MEMANG tidak diketik ulang
// tidak keliru dianggap "beda"). Kalau beda -> berarti ada ketikan yang
// belum ke-commit ke draft -- recompute porsi dari nominal DOM tsb, rumus
// PERSIS cabang normal onOwnerNominalInput() (nilai>0): porsi =
// ROUND((nominal/nilai*100)*100)/100. Baris LAIN & _autoDistributeRemaining()
// SENGAJA tidak ikut dipanggil di sini (beda dari onOwnerNominalInput()) --
// method ini murni "commit ketikan yang lewat", bukan re-trigger efek
// samping auto-bagi; kalau hasilnya bikin total !=100%, validateOwners()
// (dipanggil MultiOwnerEngine.setOwners() di bawah, TIDAK diubah) yang akan
// menolak & munculkan toast, sama seperti skenario oninput normal yang
// sempat ke-trigger tapi user belum sempat perbaiki baris lain -- 0 perilaku
// baru di luar guard "event ketinggalan" ini. Guard `nilai<=0`: cabang
// nilai-tersirat (S451, field Nominal jadi sumber a.nilai) TIDAK disentuh
// method ini -- draft[i].porsi di kondisi itu memang belum bisa dihitung
// balik dari nominal/nilai (nilai-nya sendiri yang belum ada), jadi 0 risiko
// menimpa alur itu dgn angka salah.
_resyncOwnersFromDOM(){
// Guard `document` tidak ada/bukan DOM asli (mis. test/harness yang
// men-drive saveOwners() langsung dari draft tanpa DOM sama sekali) --
// tidak ada apa pun utk dibaca ulang, biarkan draft di memori apa adanya
// (perilaku SEBELUM sesi 453, 0 regresi utk pemanggilan non-UI).
if(typeof document==='undefined'||!document||typeof document.getElementById!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length)return;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0))return;
draft.forEach((o,i)=>{
const nomEl=document.getElementById('ownerNominal'+i);
// `typeof nomEl.value!=='string'` -- guard tambahan (BUKAN cuma
// `!nomEl`): elemen DOM (asli maupun tiruan stateful di test) SELALU
// punya `.value` bertipe string (default '' kalau kosong). Ini dipakai
// utk membedakan elemen sungguhan dari stub permisif harness test murni
// (loadSource.js, lihat komentarnya: "Jangan pakai harness ini buat
// nge-test fungsi yang baca/tulis DOM") yang balas APA SAJA property
// dgn objek proxy lain (bukan string) -- tanpa guard ini, baris yang
// tidak pernah dirender ke DOM sungguhan bisa salah kebaca sbg "Nominal
// kosong" & menimpa porsi draft yang sudah benar jadi 0%.
if(!nomEl||typeof nomEl.value!=='string')return;
// FIX S457 (bug KEDUA yang ditemukan saat audit "Nominal berubah stlh
// Simpan Porsi": saveOwners() menolak dgn "Pemilik ke-1: porsi harus
// lebih dari 0..." padahal porsi baris itu SUDAH valid, mis. 15,12%):
// SEBELUMNYA field DOM yang value-nya '' (kosong -- BUKAN "0" yang
// diketik eksplisit) diparse `parseFloat('')` = NaN -> jatuh ke fallback
// `isFinite(n)?n:0` = 0. Nilai 0 itu lalu dibandingkan ke
// `nominalTersirat` (hasil derive dari porsi valid, pasti !=0 kalau
// porsinya >0) -- BEDA, jadi dianggap "ada ketikan baru yang belum
// ke-commit" & porsi baris itu DITIMPA jadi 0 (round(0/nilai*100...)=0),
// PADAHAL field itu memang belum pernah ditulisi APA PUN (kosong bukan
// berarti user mengetik "0") -- kondisi ini bisa terjadi mis. baris yang
// porsinya diisi lewat _autoDistributeRemaining()/onOwnerPorsiInput
// (bukan diketik langsung ke Nominal) di render/test-harness tertentu di
// mana elemen DOM-nya sendiri belum sempat ditulis nilai awal. Fix: field
// KOSONG (setelah di-trim) di-skip total, TIDAK ditafsirkan sbg "0 Rp
// eksplisit" -- konsisten dgn cara onOwnerNominalInput() sendiri
// memperlakukan input kosong (parseFloat('')=NaN, TIDAK auto-jadi-0 utk
// alur derive; guard eksplisit di sana beda konteks). Kalau user memang
// mau set 0% lewat Nominal, tetap bisa lewat ketik "0" beneran (value
// jadi string "0", bukan '', lolos guard ini & tetap diproses normal).
if(nomEl.value.trim()==='')return;
const n=parseFloat(String(nomEl.value).replace(/[^0-9.-]/g,''));
if(!isFinite(n))return;
const domNominal=n;
const porsiSaatIni=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const nominalTersirat=Math.round(nilai*porsiSaatIni/100);
if(domNominal===nominalTersirat)return;
// FIX S457: presisi 4 desimal, sama alasan & pola dgn
// onOwnerNominalInput()/_autoDistributeRemaining() -- lihat komentar
// panjang di onOwnerNominalInput().
const porsiBaru=Math.round((domNominal/nilai*100)*10000)/10000;
o.porsi=porsiBaru;
});
},
// saveOwners() -- SESI 392d: tulis Aset._ownersDraft ke D.assets[].owners (baru
// benar-benar tersimpan, sebelumnya cuma draft di memori sejak 392a-392c). Validasi
// & normalisasi 100% reuse MultiOwnerEngine.setOwners() (S390, yang di dalamnya
// panggil validateOwners()) -- TIDAK ada rumus/logic validasi baru ditulis di sini.
// Baris draft yang ownerId-nya masih kosong (baris baru dari addOwnerRow(), belum
// pernah tersimpan) diberi id via uid() (helper global, sudah dipakai di seluruh
// aset.js) sebelum divalidasi -- ownerId dari data lama (hasil MultiOwnerEngine.
// getOwners() di openOwnersModal) tetap dipakai apa adanya.
// SESI 453: _resyncOwnersFromDOM() dipanggil PALING AWAL (lihat komentar
// method itu) -- baca ulang value asli tiap field Nominal dari DOM sebelum
// validasi/simpan, supaya walau `oninput` ketikan terakhir sempat kelewat
// (mis. diganggu toolbar quick-action browser), nilai yang BENAR-BENAR ada
// di layar tetap yang disimpan.
saveOwners(){
// SESI B2a: guard sama alasan addOwnerRow() di atas -- tombol Simpan Porsi sudah
// disembunyikan saat read-only, ini pertahanan berlapis supaya draft baca-saja dari
// Holding Investasi tidak pernah ketulis balik ke a.owners lewat jalur ini.
if(Aset._ownersReadOnly){toast('🔗 Porsi aset ini diatur di Holding Investasi, tidak bisa diedit di sini');return;}
if(!Aset._ownersModalAsset){toast('⚠️ Simpan aset ini dulu sebelum mengatur porsi kepemilikan');return;}
if(typeof MultiOwnerEngine==='undefined'){toast('⚠️ Fitur porsi kepemilikan belum siap dimuat');return;}
const a=D.assets.find(x=>sameId(x.id,Aset._ownersModalAsset.id));
if(!a){toast('⚠️ Aset tidak ditemukan, coba tutup dan buka lagi');return;}
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length){toast('⚠️ Tambahkan minimal 1 pemilik sebelum menyimpan');return;}
Aset._resyncOwnersFromDOM();
for(let i=0;i<draft.length;i++){
if(!draft[i].ownerName||!draft[i].ownerName.trim()){toast('⚠️ Nama pemilik baris ke-'+(i+1)+' wajib diisi');return;}
}
// SESI 490: baris baru (ownerId masih kosong) non-SELF -> ownerId lewat
// OwnerRegistry.findOrCreate() (dedup by nama, konsisten lintas aset), BUKAN uid()
// langsung lagi. Baris SELF & baris yang ownerId-nya SUDAH ada (dari dropdown pilih
// existing, atau data lama) TIDAK disentuh -- perilaku persis sebelum S490.
// SESI 547 (GAP3-AUD-001 poin 4): baris baru isSelf:true SEBELUMNYA jatuh ke uid()
// acak juga -- beda dari ownerId 'SELF' literal yang dipakai getOwners() default
// (multi-owner-engine.js) & investasi.js. Akibatnya "Milik Sendiri" yang baru
// ditambah lewat modal ini (bukan hasil sintesis default) bisa punya ownerId
// BEDA-BEDA antar aset/investasi -- SELF, yang seharusnya SATU identitas
// universal (bukan per-nama spt OwnerRegistry), jadi tidak konsisten. Fix: baris
// isSelf:true tanpa ownerId existing pakai literal 'SELF' -- 0 fungsi baru,
// cuma menyamakan ke literal yang sudah dipakai di mana-mana. TAPI: modul ini
// SENGAJA membolehkan >1 baris isSelf:true sekaligus (lihat komentar
// onOwnerIsSelfToggle() di atas, totalnya dijumlah apa adanya) -- 'SELF' cuma
// boleh dipakai SEKALI per aset (ownerId wajib unik, validateOwners()), jadi
// baris isSelf ke-2 dst yang ownerId-nya masih kosong tetap fallback ke uid()
// spt sebelumnya (0 perubahan utk kasus itu -- kasus umum tetap 1 baris SELF).
let selfIdUsed=draft.some((o)=>o.ownerId&&String(o.ownerId).trim()==='SELF');
// S607 (OwnerRegistry.findOrCreate() wajib, bukan opsional lagi): baris
// pemilik BARU non-SELF (belum py ownerId) WAJIB lolos OwnerRegistry --
// kalau OwnerRegistry gagal load / findOrCreate() bukan function, saveOwners()
// FAIL-FAST (toast + return SEBELUM MultiOwnerEngine.setOwners() dipanggil,
// D.assets TIDAK disentuh sama sekali), bukan diam-diam fallback ke uid()
// acak spt sebelumnya (gap tercatat sejak S583, lihat
// TitipanReconcile.checkOwnerIdConsistency()). Pola sama persis
// migrateOwnersToRegistry() (~baris 1365) yang sudah wajib duluan.
// Baris isSelf:true (SELF) & baris yang ownerId-nya sudah ada TIDAK kena guard
// ini (tidak lewat findOrCreate() sama sekali) -- 0 perubahan utk kasus itu.
let owners;
try{
owners=draft.map((o)=>{
let ownerId;
if(o.ownerId&&String(o.ownerId).trim()){
ownerId=String(o.ownerId).trim();
}else if(o.isSelf&&!selfIdUsed){
ownerId='SELF';
selfIdUsed=true;
}else if(!o.isSelf){
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'){
throw new Error('S607_OWNER_REGISTRY_UNAVAILABLE');
}
ownerId=OwnerRegistry.findOrCreate(o.ownerName.trim());
}else{
ownerId=String(uid());
}
return{ownerId,ownerName:o.ownerName.trim(),porsi:o.porsi,isSelf:!!o.isSelf};
});
}catch(e){
if(e&&e.message==='S607_OWNER_REGISTRY_UNAVAILABLE'){toast('⚠️ Fitur pemilik belum siap dimuat, coba lagi');return;}
throw e;
}
const res=MultiOwnerEngine.setOwners(a,owners);
if(!res.ok){toast('⚠️ '+res.reason);return;}
Object.assign(a,{owners:res.entity.owners});
// S666: sinkronkan status "Titipan"/"Milik Sendiri" per owner non-SELF --
// HARUS setelah Object.assign di atas (baris/ownerId final baru pasti sudah
// ada di a.owners), 100% reuse Aset.setOwnerSettlement() (fondasi S665, di
// dalamnya sudah memanggil TitipanSync.reconcile()/_syncOwnerDebts() +
// save() sendiri -- 0 rumus/sync Buku Utang baru ditulis di sini). Guard
// `typeof` (bukan wajib, pola sama InvestmentUI.saveOwners() S661): beberapa
// test lama memasang stub Aset minimal tanpa method S665 ini -- modul
// aset-owners.js SUNGGUHAN (bukan stub) SELALU punya method ini sejak S665.
if(typeof Aset.setOwnerSettlement==='function'){
owners.forEach((o)=>{
if(o.isSelf)return;
const draftRow=draft.find((d)=>(d.ownerId&&String(d.ownerId).trim()===o.ownerId)||d.ownerName.trim()===o.ownerName);
const settlement=draftRow&&draftRow.settlement==='milik'?'milik':'titipan';
Aset.setOwnerSettlement(a.id,o.ownerId,settlement);
});
}
// FIX (audit "porsi titipan tidak bisa dihapus & disimpan di tab edit
// kepemilikan"): kalau aset ini masih py field dana titipan LEGACY
// (a.titipanAmount/titipanOwnerType/titipanOwnerName -- disintesis jadi
// baris pemilik "titipan_..." oleh MultiOwnerEngine._synthesizeFromTitipan()
// tiap getOwners() dipanggil, SELAMA a.owners belum eksplisit tertulis),
// field lama itu WAJIB dikosongkan begitu user simpan owners[] eksplisit
// lewat modal ini -- SAMA PERSIS blok AUTO-MIGRATE di Aset._saveInner()
// (baris ~1531) yang jalan saat form Aset utama disimpan. SEBELUM fix ini,
// saveOwners() cuma menulis a.owners TANPA membersihkan field lama:
// getOwners() sendiri sudah benar (prioritas baca #1 = a.owners, cabang
// titipan legacy di bawahnya jadi tidak pernah kesentuh lagi), TAPI
// konsumen lain yang baca a.titipanAmount LANGSUNG (bukan lewat
// getOwners()) -- mis. titipanMeta di kartu Aset (openActionsMenu(), baris
// ~1663: `a.titipanAmount>0?('💰 Titipan ...')`) -- tetap menampilkan baris
// titipan yang SUDAH dihapus user dari modal ini. User mengira porsi
// titipan "tidak kehapus" padahal cuma badge kartu yang masih baca field
// legacy basi. Guard `a.titipanAmount>0` -- 0 efek utk aset yang memang
// tidak pernah pakai jalur titipan legacy (titipanAmount sudah 0/kosong).
if(a.titipanAmount>0){
a.titipanAmount=0;
a.titipanOwnerType='';
a.titipanOwnerName='';
}
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// kalau user menurunkan nilai dasar lewat Nominal (Rp) selama modal ini
// terbuka (aset belum py "Estimasi Nilai Saat Ini", lihat
// onOwnerNominalInput cabang nilai<=0), tulis ke a.nilai beneran DI SINI --
// SEBELUM blok sync saldo akun tertaut & _syncOwnerDebts() di bawah (yang
// dua-duanya baca a.nilai), supaya keduanya langsung pakai nilai yang baru
// diketahui, bukan 0/kosong seperti sebelumnya.
if(typeof Aset._ownersDraftNilai==='number'&&isFinite(Aset._ownersDraftNilai)&&Aset._ownersDraftNilai>0){
a.nilai=Aset._ownersDraftNilai;
}
// Sesi 422e: SYNC SALDO AKUN TERTAUT ke porsi BARU -- sebelumnya saveOwners()
// cuma nulis owners[]/render ulang tampilan (S422c), tapi baseBalance akun
// tertaut (kalau ADA, lihat assetAccId) tetap pakai nilai LAMA sampai form
// Aset utama dibuka & disimpan ulang secara terpisah. Reuse PERSIS pola
// txDelta dari Aset.save() (baris ~681) -- riwayat transaksi akun (kalau
// sudah ada, mis. sudah dipakai bayar/terima) TIDAK diubah, cuma baseBalance-
// nya digeser supaya recalcAccBalance() = nilai penuh instrumen sekarang.
// SESI 449 (BUG-OWN-002 lanjutan): sebelumnya di sini dipakai
// MultiOwnerEngine.selfOwnedValue(a,a.nilai) (porsi SELF saja) -- diganti
// a.nilai (nilai PENUH), lihat komentar panjang "linkedAccNilai" di Aset.save()
// di atas utk alasan lengkap (exclude dobel-hitung sudah dijamin totalSaldoAkun()
// via linkedAssetAccountIds(), tidak butuh baseBalance/balance dipotong ke
// porsi SELF lagi).
if(a.accountId){
const linkedAcc=D.accounts.find(x=>sameId(x.id,a.accountId));
if(linkedAcc){
const linkedAccNilai=a.nilai||0;
const txDelta=recalcAccBalance(linkedAcc.id)-(linkedAcc.baseBalance!==undefined?linkedAcc.baseBalance:(linkedAcc.balance||0));
linkedAcc.baseBalance=linkedAccNilai-txDelta;
linkedAcc.balance=linkedAccNilai;
// BUGFIX (audit kepemilikan, sama alasan dgn Aset.save()): saveOwners()
// cuma resync saldo, `ownership` akun tertaut tidak ikut disamakan ke
// `a.ownership` -- pakai OwnershipEngine.resolve() (bukan a.ownership
// mentah) supaya aset lama tanpa field ownership tetap fallback SELF
// (konsisten dgn seluruh konsumen OwnershipEngine lain, 0 regresi).
if(typeof OwnershipEngine!=='undefined')linkedAcc.ownership=OwnershipEngine.resolve(a).type;
}
}
// FIX (BUG-OWN-002, audit s444): saveOwners() sudah resync saldo akun tertaut
// ke porsi BARU (blok di atas, S422e) tapi TIDAK pernah memanggil
// _syncOwnerDebts() -- utang "dana titipan" milik owner NON-SELF (Buku Utang,
// lihat _syncOwnerDebts()) tetap kepatok ke porsi LAMA sampai user tidak
// sengaja buka+simpan ulang modal Edit Aset utama (satu-satunya jalur yang
// sebelumnya memanggilnya, _saveInner() baris ~938). Fix: panggil di sini
// juga, pola PERSIS sama (0 rumus baru) -- _syncOwnerDebts() sendiri sudah
// idempotent & aman dipanggil berkali-kali (upsert by linkedOwnerId, hapus
// entry utk owner yg sudah tidak ada di owners[] terbaru).
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{ownersUpdated:true,editId:a.id});
// nilai tersirat sudah dikomit ke a.nilai di atas -- buang draft-nya supaya
// _ownersAssetNilai() balik baca a.nilai asli (sekarang sudah terisi benar).
Aset._ownersDraftNilai=null;
Aset._ownersModalAsset=a;
Aset._ownersDraft=res.entity.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(a,o.ownerId):'titipan'}));
Aset._renderOwnersList();
// Sesi 422c: sebelumnya cuma Aset.renderList() -- porsi berubah juga
// mempengaruhi Kekayaan Bersih/Zakat (lewat Aset.totalValue(), S422c) &
// akun tertaut (badge/saldo di Akun Uang/Laporan/Dashboard), tapi 3 render
// itu TIDAK ikut dipanggil, jadi angkanya baru "sinkron beneran" setelah
// pindah halaman. Fix: samakan pola sync-nya dgn Aset.save() (baris ~739)
// -- 0 rumus baru, cuma nambah pemanggilan fungsi render yang sudah ada.
Aset.renderList();
if(typeof renderKekayaanBersih==='function')renderKekayaanBersih();
if(typeof hitungZakatMaal==='function')hitungZakatMaal();
if(typeof renderAccGrid==='function')renderAccGrid();
if(typeof renderDashAccList==='function')renderDashAccList();
if(typeof renderLapAccList==='function')renderLapAccList();
if(typeof renderDebtList==='function')renderDebtList();
// S583 sesi-9 (Rekomendasi #3 enforcement): audit checkAll() SETELAH simpan
// berhasil -- non-blocking (lihat komentar warnIfNotOk() di titipan-reconcile.js),
// TIDAK pernah menahan/menolak simpan yang di atas sudah selesai.
// S583 sesi-12: dipulihkan setelah sempat HILANG di aset.js sejak sesi-10b --
// sesi-10b membangun gerbang TitipanSync.reconcile() dari basis sebelum
// sesi-9 (bukan basis sesi-9), jadi 4 baris warnIfNotOk() ini (ditambahkan
// sesi-9) tidak ikut terbawa saat sesi-10b mengganti baris
// `Aset._syncOwnerDebts(a);` tepat di atas jadi gerbang TitipanSync. Baris
// TitipanSync.reconcile(a) & warnIfNotOk() ini 2 hal INDEPENDEN (satu soal
// sync utang, satu soal audit konsistensi registry) yang kebetulan hidup
// berdekatan -- diverifikasi sesi-12 lewat diff eksplisit sesi-9 vs sesi-10b
// (lihat PATCH-NOTES.md sesi-12), bukan re-derivasi logic baru.
if(typeof TitipanReconcile!=='undefined')TitipanReconcile.warnIfNotOk('Aset.saveOwners');
// FIX (audit "3 titik Simpan Porsi tidak me-refresh widget Dana Titipan"):
// porsi titipan pada aset ini ikut membentuk usedTotal/available yang
// ditampilkan kartu "Dana Kelolaan" & tab "Dana Titipan" (DanaTitipanPortfolioPresenter),
// tapi jalur ini belum pernah memanggil render-nya -- beda dari cascade lain
// (tx-list-cashflow.js baris ~235, dana-titipan-portfolio-render.js) yang sudah
// konsisten pakai pola render()+renderInto('danaTitipanTabList') ini. 0 logic baru,
// cuma menyamakan pola sync yang sudah baku di modul lain.
if(typeof DanaTitipanPortfolioPresenter!=='undefined')DanaTitipanPortfolioPresenter.render();
if(typeof DanaTitipanPortfolioPresenter!=='undefined'&&typeof DanaTitipanPortfolioPresenter.renderInto==='function')DanaTitipanPortfolioPresenter.renderInto('danaTitipanTabList');
toast('✅ Porsi kepemilikan tersimpan');
},
// resetOwners() -- SESI 392d: buang perubahan draft yang belum disimpan, muat ulang
// Aset._ownersDraft dari data TERSIMPAN di D.assets (via MultiOwnerEngine.getOwners(),
// sama persis logic yang dipakai openOwnersModal() -- 0 rumus baru). Dipakai kalau
// user salah edit & mau mulai ulang dari data terakhir tersimpan TANPA menutup modal.
resetOwners(){
// SESI B2a: tombol Reset Draft sudah disembunyikan saat read-only -- pertahanan
// berlapis: re-derive dari Holding Investasi lagi lewat jalur yang sama (idempotent,
// TIDAK ada draft manual yang bisa "dibuang" krn tidak pernah bisa diedit di sini).
// FITUR "Auto-Rebalance Porsi Pemilik": buang panel penyesuaian (kalau ada) --
// draft dimuat ulang dari nol di bawah, index lama sudah tidak relevan.
Aset._rebalancePending=null;
if(Aset._ownersReadOnly){
const linkedOwners=Aset._resolveLinkedInvestmentOwners(Aset._ownersModalAsset);
Aset._ownersDraft=(linkedOwners||[]).map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf}));
Aset._renderOwnersList();
return;
}
if(!Aset._ownersModalAsset){return;}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(Aset._ownersModalAsset):null;
Aset._ownersDraft=res&&res.ok?res.owners.map((o)=>({ownerId:o.ownerId,ownerName:o.ownerName,porsi:o.porsi,isSelf:!!o.isSelf,settlement:(typeof Aset.getOwnerSettlement==='function')?Aset.getOwnerSettlement(Aset._ownersModalAsset,o.ownerId):'titipan'})):[];
// FIX (audit "Nominal tidak bisa diisi manual", laporan user Agustus 2026):
// nilai tersirat dari Nominal (kalau ada, lihat _ownersDraftNilai) juga
// bagian dari "perubahan draft yang belum disimpan" -- ikut dibuang saat
// Reset Draft, pola sama _ownersDraft di atas.
Aset._ownersDraftNilai=null;
Aset._renderOwnersList();
toast('↺ Draft direset ke data yang terakhir tersimpan');
// MIGRASI data lama (Agustus 2026) -- sama alasan openOwnersModal(), lihat komentar di
// sana: data tersimpan yang sudah overflow >100% surface panel rebalance otomatis di
// sini juga (Reset Draft memuat ulang dari data tersimpan, bisa saja masih overflow).
Aset._checkRebalanceTrigger(Aset._ownersDraft.length-1);
},
// _syncOwnerDebts(a) — Sesi B (lanjutan MultiOwnerEngine S390/406b): gantiin
// _syncTitipanDebt() lama -- BUKAN cuma 1 entry utang titipan per aset,
// tapi 1 entry utang PER OWNER non-SELF dari MultiOwnerEngine.getOwners(a)
// (toleran: baca `a.owners` eksplisit KALAU ADA, atau disintesis dari
// titipanAmount legacy lewat cabang Sesi 406b -- 0 rumus baru dobel, murni
// pakai apa yang getOwners() sudah balikin). Tiap entry utang ditandai
// `linkedAssetId`/`linkedOwnerId` di OBJECT UTANGNYA SENDIRI (bukan pointer
// tunggal di aset spt titipanDebtLinkId dulu) supaya bisa nampung BERAPA PUN
// owner non-SELF sekaligus per aset -- 1 aset 3 pemilik non-SELF = 3 entry
// utang, dicari/di-update lewat filter linkedAssetId+linkedOwnerId, bukan 1
// field tunggal yang cuma muat 1 id.
// nilai aset (a.nilai) TETAP dicatat penuh & apa adanya; porsi tiap owner
// non-SELF (nilai * porsi/100) otomatis jadi 1 entry utang bernama owner
// itu, sehingga Kekayaan Bersih = Nilai Aset − Utang tiap owner titipan
// (tidak overstated). Owner yang dicabut (tidak ada lagi di getOwners() --
// mis. porsi diubah jadi 0, atau baris ownernya dihapus) -> entry utang
// tertautnya OTOMATIS DIHAPUS, tidak menyisakan sampah (0 UI utk hapus
// manual perlu).
// MIGRASI 1x dari field lama `a.titipanDebtLinkId` (peninggalan
// _syncTitipanDebt() <=Sesi 406b): kalau field itu masih ada & debt-nya
// masih ada di D.debts, debt itu di-TAG linkedAssetId/linkedOwnerId (owner
// id disintesis deterministik persis sama dgn yang dipakai
// MultiOwnerEngine._synthesizeFromTitipan(), jadi otomatis "ketemu" lagi di
// loop di bawah tanpa bikin entry duplikat) lalu field lamanya di-null-kan
// -- TIDAK ada entry utang baru dibuat/dihapus semata krn migrasi ini.
// TIDAK ada wiring baru ke Aset.save() sesi ini di luar 1 rename call site
// yang sudah ada (dari _syncTitipanDebt ke _syncOwnerDebts, supaya save()
// tidak manggil fungsi yang sudah tidak ada) -- migrasi data
// titipanAmount->a.owners yang SEBENARNYA (nulis field `owners` array) &
// perubahan UI assetModal jadi kerjaan Sesi C, sesuai rencana 4 sesi.
// getOwnerSettlement(a, ownerId) / setOwnerSettlement(id, ownerId, settlement) —
// S665 (lanjutan eksplisit dari Investment.getOwnerSettlement()/setOwnerSettlement(),
// S660: "Pola sama ke D.assets[] (Buku Aset)" dari daftar ide user pasca-S662).
// Port 1:1 -- SAMA PERSIS semantik & kontrak `Investment.getOwnerSettlement()`/
// `setOwnerSettlement()` (investasi.js), cuma sumber datanya `a.ownerSettlement`
// (bukan `h.ownerSettlement`) & sync-nya lewat `_syncOwnerDebts()`/`TitipanSync.
// reconcile()` (bukan `_syncTitipanDebt()`). Default TOLERAN ke 'titipan' kalau
// belum diisi/map belum ada -- 0 REGRESI utk seluruh data existing (setiap
// owner non-SELF aset TETAP otomatis jadi entry Buku Utang persis seperti
// sebelum sesi ini, kalau setOwnerSettlement() tidak pernah dipanggil).
// 'milik' = owner itu pemilik sungguhan (mis. rumah warisan istri sendiri) ->
// TIDAK menghasilkan/mempertahankan entry Buku Utang utk owner ybs (lihat
// `nonSelfOwners` di `_syncOwnerDebts()` di bawah), TAPI tetap muncul di
// getOwners() (porsi kepemilikan tidak berubah).
getOwnerSettlement(a,ownerId){
const map=a&&typeof a==='object'&&a.ownerSettlement&&typeof a.ownerSettlement==='object'?a.ownerSettlement:null;
const v=map?map[ownerId]:undefined;
return v==='milik'?'milik':'titipan';
},
setOwnerSettlement(id,ownerId,settlement){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)throw new Error('Aset tidak ditemukan');
if(typeof ownerId!=='string'||!ownerId.trim())throw new Error('ownerId wajib diisi');
const norm=settlement==='milik'?'milik':'titipan';
a.ownerSettlement=(a.ownerSettlement&&typeof a.ownerSettlement==='object')?a.ownerSettlement:{};
if(norm==='titipan'){
delete a.ownerSettlement[ownerId];
}else{
a.ownerSettlement[ownerId]='milik';
}
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
if(typeof save==='function')save();
return a;
},
// assetsByOwnerSettlement(ownerId, settlement) — query murni (0 mutasi), pola
// SAMA PERSIS `Investment.holdingsByOwnerSettlement()`: semua D.assets di mana
// `ownerId` adalah salah satu owner EFEKTIF (lewat MultiOwnerEngine.getOwners(),
// toleran data lama) DAN status settlement-nya (getOwnerSettlement) cocok
// `settlement` ('titipan'|'milik').
assetsByOwnerSettlement(ownerId,settlement){
if(typeof D==='undefined'||!Array.isArray(D.assets))return[];
const norm=settlement==='milik'?'milik':'titipan';
return D.assets.filter(a=>{
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
const owners=(res&&res.ok)?res.owners:[];
const row=owners.find(o=>o&&!o.isSelf&&String(o.ownerId)===String(ownerId));
return!!row&&Aset.getOwnerSettlement(a,row.ownerId)===norm;
});
},
_syncOwnerDebts(a){
if(!a||typeof D==='undefined'||!D.debts)return;
if(a.titipanDebtLinkId){
const legacyDebt=D.debts.find(d=>String(d.id)===String(a.titipanDebtLinkId));
if(legacyDebt&&!legacyDebt.linkedAssetId){
legacyDebt.linkedAssetId=a.id;
legacyDebt.linkedOwnerId='titipan_'+(a.titipanOwnerType||'investor');
}
a.titipanDebtLinkId=null;
}
const res=typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.getOwners(a):null;
const owners=(res&&res.ok)?res.owners:[];
const nilai=typeof a.nilai==='number'&&isFinite(a.nilai)?a.nilai:0;
const nonSelfOwners=owners.filter(o=>!o.isSelf&&o.porsi>0&&Aset.getOwnerSettlement(a,o.ownerId)!=='milik');
const existingLinked=D.debts.filter(d=>d.linkedAssetId===a.id);
const keepIds=new Set();
nonSelfOwners.forEach(o=>{
const amount=nilai*(o.porsi/100);
const catatan='Dana titipan aset: '+a.name;
let debt=existingLinked.find(d=>d.linkedOwnerId===o.ownerId);
if(debt){
Object.assign(debt,{name:o.ownerName,nilai:amount,catatan,lunas:amount<=0});
}else{
debt={id:uid(),name:o.ownerName,nilai:amount,bunga:0,cicilanBulanan:0,tanggal:todayStr(),jatuhTempo:'',catatan,lunas:amount<=0,linkedAssetId:a.id,linkedOwnerId:o.ownerId};
D.debts.push(debt);
}
keepIds.add(o.ownerId);
});
D.debts=D.debts.filter(d=>!(d.linkedAssetId===a.id&&!keepIds.has(d.linkedOwnerId)));
},
// migrateOwnersToRegistry() — R2 (audit ownership/titipan, lanjutan GAP3-AUD-001
// S545/546): baris `a.owners[]` non-SELF yang dibuat SEBELUM assetOwnersModal
// disambungkan ke OwnerRegistry (S490) masih pakai `ownerId` hasil `uid()` lama
// -- 2 aset dgn owner nama sama TIDAK otomatis punya `ownerId` sama. Fungsi ini
// derive `ownerId` KANONIK per nama lewat `OwnerRegistry.findOrCreate()` (fungsi
// resmi yg sama dipakai S490/Investment.migrateLegacyTitipanOwners()), relabel
// `D.debts[].linkedOwnerId` LEBIH DULU (pola sama persis S545, jaga kontinuitas
// histori/status lunas), baru ganti `ownerId` di baris owners[]-nya.
// IDEMPOTENT: baris yang `ownerId`-nya sudah sama dgn hasil findOrCreate() (baik
// karena sudah dimigrasi, atau memang dibuat lewat dropdown S490+) di-skip --
// aman dipanggil ulang.
// GUARD tabrakan: kalau konsolidasi bikin 2 baris owners[] di ASET YANG SAMA
// jadi `ownerId` sama (mis. data korup, 2 baris nama identik sengaja dipisah),
// aset itu di-skip UTUH (0 baris diubah) drpd bikin porsi dobel di `ownerId`
// yang sama -- dicatat di `res.conflicts`, butuh review manual (bukan retry
// otomatis di sesi ini).
// Return: {migrated, skipped, conflicts} -- jumlah BARIS owner yang direlabel,
// aset yang di-skip (0 baris non-SELF/sudah kanonik), & aset yang kena guard
// tabrakan di atas.
migrateOwnersToRegistry(){
if(typeof D==='undefined'||!Array.isArray(D.assets))return{migrated:0,skipped:0,conflicts:0};
if(typeof OwnerRegistry==='undefined'||typeof OwnerRegistry.findOrCreate!=='function'){
throw new Error('OwnerRegistry belum dimuat');
}
let migrated=0,skipped=0,conflicts=0;
D.assets.forEach(a=>{
if(!a||!Array.isArray(a.owners)||!a.owners.length){skipped++;return;}
const plan=[];
let touched=false;
a.owners.forEach(o=>{
if(!o||o.isSelf||!o.ownerName)return;
const canonical=OwnerRegistry.findOrCreate(String(o.ownerName).trim());
if(canonical!==o.ownerId){plan.push({row:o,oldId:o.ownerId,newId:canonical});touched=true;}
});
if(!touched){skipped++;return;}
const resultIds=a.owners.map(o=>(o&&!o.isSelf&&plan.some(p=>p.row===o))?plan.find(p=>p.row===o).newId:(o?o.ownerId:null));
const nonSelfResultIds=a.owners.map((o,i)=>({o,id:resultIds[i]})).filter(x=>x.o&&!x.o.isSelf).map(x=>x.id);
if(new Set(nonSelfResultIds).size!==nonSelfResultIds.length){conflicts++;return;}
plan.forEach(({row,oldId,newId})=>{
if(Array.isArray(D.debts)){
D.debts.forEach(d=>{ if(d&&d.linkedAssetId===a.id&&d.linkedOwnerId===oldId)d.linkedOwnerId=newId; });
}
row.ownerId=newId;
});
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else{Aset._syncOwnerDebts(a);}
migrated+=plan.length;
});
return{migrated,skipped,conflicts};
},
};
