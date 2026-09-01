// aset.js — Domain Aset & Kekayaan (INTI): const Aset={} — Buku Aset, form/modal, CRUD, dashboard, bridge Investasi, export/import Excel, owners split-modal (multi-owner porsi kepemilikan).
// S589: file ini dipecah dari 1 file 3175 baris jadi 3 file (aset.js inti + aset-reports.js + aset-misc.js) — lihat docs/AUDIT-SPLIT-ASET-JS.md & docs/FIX-s589-split-aset-js.md untuk rencana & verifikasi lengkap.
// PENTING: urutan load WAJIB aset.js -> aset-reports.js -> aset-misc.js (aset-misc.js diakhiri Object.assign(window,{...}) yang merujuk identifier dari ketiga file).
// Isi & perilaku Aset TIDAK berubah sama sekali dari sebelum split — murni pindah lokasi fisik baris kode, referensi data-action="Aset.xxx" tetap sama persis.

const Aset={
// NOTE (audit ukuran file): metode fitur owners/porsi kepemilikan DIPECAH ke aset-owners.js (0 logic diubah), digabung balik via Object.assign() setelah literal ini.
editId:null,
// filterOwnerIds / filterSettlement — S667 (fondasi single-select, sesi lanjutan
// eksplisit dari catatan "Belum dikerjakan" SESSION-NOTE-S666.md: "filter
// Owner+Status di daftar Buku Aset"), diubah jadi MULTI-SELECT S673 (item backlog
// dari catatan "Belum dikerjakan" SESSION-NOTE-S667.md: "multi-select owner Buku
// Aset/Dana Titipan"), pola SAMA PERSIS InvestmentListUI.filterOwnerIds/
// filterSettlement (S669/S671, investasi-list-view.js, bentuk final checkbox
// multi-select) tapi domain Aset. State UI MURNI (bukan ditulis ke D), direset ke
// [] tiap reload halaman -- pola sama editId di atas. filterOwnerIds: array
// ownerId non-SELF (dari MultiOwnerEngine.getOwners(a), kanonik lewat
// OwnerRegistry sejak S491/S665), [] = Semua Pemilik (filter nonaktif).
// filterSettlement: '' = Semua Status, atau 'titipan'/'milik' (Aset.
// getOwnerSettlement(), S665) -- HANYA relevan kalau filterOwnerIds terisi (owner
// SELF tidak punya konsep settlement). Beda dgn assetOwnFilter (S235, dropdown
// statis di index.html, filter TIPE kepemilikan SELF/INVESTOR/CUSTOMER/FAMILY/
// THIRD_PARTY) -- 2 filter ini independen, tidak saling menggantikan (lihat
// renderList() di bawah).
filterOwnerIds:[],
filterSettlement:'',
_zakatableState:false,
// _tradableState / TRADABLE_JENIS / TRADABLE_TYPE_MAP -- §H/§I AUDIT-UNIFIED-ASSET-
// INVESTMENT-FORM.md (wrapper UI tipis di atas assetModal yang sudah ada, 0 model baru).
// TRADABLE_JENIS = subset assetJenis (dropdown assetModal SUDAH ADA) yang punya padanan
// instrumen tradable di sisi Investment -- dipakai _renderTradableSection() utk
// tampil/sembunyikan section toggle "📈 Buat Holding Investasi Otomatis" & auto-detect
// default toggle-nya (§H poin 1). TRADABLE_TYPE_MAP memetakan tiap jenis itu ke
// INVESTMENT_TYPES (investasi.js) yang PALING dekat -- dipakai saveUnified() SAJA saat
// memanggil Investment.addHolding({type,...}), TIDAK mengubah INVESTMENT_TYPES itu sendiri.
TRADABLE_JENIS:['Saham','Reksadana','Kripto','Deposito/Investasi'],
TRADABLE_TYPE_MAP:{'Saham':'Saham','Reksadana':'Reksa Dana','Kripto':'Kripto','Deposito/Investasi':'Deposito'},
_tradableState:false,
ICON:{'Tanah':'🏞️','Rumah/Bangunan':'🏠','Kendaraan':'🏍️','Emas/Logam Mulia':'🥇','Deposito/Investasi':'📈','Saham':'📊','Reksadana':'💹','Kripto':'🪙','Lainnya':'📦'},
// Ringkasan singkat field kategori-spesifik utk baris di daftar Buku Aset
// (mis. "2022 · 125cc · Pertalite" utk Kendaraan) -- lihat renderJenisFields.
extraLabel(a){
if(a.jenis==='Kendaraan'){
const parts=[];
if(a.vehTahun)parts.push(String(a.vehTahun));
if(a.vehCc)parts.push(a.vehCc+'cc');
if(a.vehBbm)parts.push(a.vehBbm);
return parts.join(' · ');
}
if((a.jenis==='Tanah'||a.jenis==='Rumah/Bangunan')&&a.luasM2)return a.luasM2+' m²';
if(a.jenis==='Emas/Logam Mulia'&&(a.goldBeratGram||a.goldKadar)){
const parts=[];
if(a.goldBeratGram)parts.push(a.goldBeratGram+'g');
if(a.goldKadar)parts.push(a.goldKadar+'');
return parts.join(' · ');
}
return '';
},
openModal(id){
Aset.editId=id||null;
const a=id?D.assets.find(x=>sameId(x.id,id)):null;
document.getElementById('assetModalTitle').textContent=a?'Edit Aset':'Tambah Aset';
document.getElementById('assetName').value=a?a.name:'';
document.getElementById('assetJenis').value=a?a.jenis:'Tanah';
document.getElementById('assetLokasi').value=a?(a.lokasi||''):'';
document.getElementById('assetNilai').value=a?a.nilai:'';
document.getElementById('assetModalInvestasi').value=a&&a.modalInvestasi!=null?a.modalInvestasi:'';
document.getElementById('assetHargaBeli').value=a&&a.hargaBeli!=null?a.hargaBeli:'';
document.getElementById('assetJumlahUnit').value=a&&a.jumlahUnit!=null?a.jumlahUnit:'';
document.getElementById('assetTanggal').value=a?(a.tanggal||''):todayStr();
const accSel=document.getElementById('assetAccId');
if(accSel)accSel.value=a&&a.accountId?String(a.accountId):'';
const scanBox=document.getElementById('assetScanCandidates');
if(scanBox){scanBox.style.display='none';scanBox.innerHTML='';}
Aset._zakatableState=a?!!a.zakatable:false;
const btn=document.getElementById('assetZakatableBtn');
btn.textContent=Aset._zakatableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._zakatableState?' active':'');
// Dana Titipan -- Sesi C (tahap terakhir migrasi Dana Titipan -> Multi-Owner Engine):
// dulu di sini toggle+field titipan (bisa diedit langsung) diisi ulang tiap modal
// dibuka. Sekarang PURE read-only lewat _renderTitipanSummary() -- mengatur porsi
// kepemilikan (termasuk dana titipan/patungan) SATU PINTU lewat tombol "⚖️ Atur Porsi
// Kepemilikan" (openOwnersModal(), S392a+), bukan lagi 2 tempat terpisah yang bisa
// gampang divergen satu sama lain.
Aset._renderTitipanSummary(a);
Aset._renderVehicleLinkAction(a);
Aset._populateInvestmentLinkSelect(a);
Aset._renderTradableSection(a);
Aset._updateOwnersButtonLabel(a);
Aset.renderJenisFields(a);
Aset.updateProfitPreview();
// Ownership (S231) — reuse OwnershipEngine, sama pola dgn Akun/Kendaraan. Aset lama tanpa
// field ownership: resolve() fallback ke SELF/DEFAULT (backward compatible).
const ownSel=document.getElementById('assetOwnership');
if(ownSel){
if(typeof OwnershipEngine!=='undefined'){
ownSel.innerHTML=OwnershipEngine.TYPES.map(t=>'<option value="'+t+'">'+escapeHtml(OwnershipEngine.label(t))+'</option>').join('');
ownSel.value=OwnershipEngine.resolve(a||{}).type;
}else{
ownSel.innerHTML='<option value="SELF">Milik Sendiri</option>';
ownSel.value='SELF';
}
}
openModal('assetModal');
},
// FITUR BARU (permintaan user): input Buku Aset dibedakan sesuai kategori --
// Kendaraan -> Tahun/CC/BBM, Tanah & Rumah/Bangunan -> Luas (m2, dipakai juga
// oleh estimasi PBB di PajakAset yang sudah ada), Emas/Logam Mulia -> Berat
// (gram) & Kadar/Karat (field goldBeratGram/goldKadar -- SAMA PERSIS dgn
// field yg dipakai GoldImport, lihat modules/asset/aset-emas-impor.js, biar
// input manual & impor massal nyambung ke skema data yg sama). Kategori lain
// (Deposito/Saham/Reksadana/Kripto/Lainnya) tetap pakai field umum yg sudah
// ada (Modal Investasi/Harga Beli/Jumlah Unit), jadi wrap dikosongkan.
//   onJenisChange() dipanggil dari onchange dropdown Jenis -- render ULANG
//   dgn asset=null (form kosong) krn pindah kategori = data lama kategori
//   sebelumnya sudah tidak relevan. openModal() di atas panggil langsung dgn
//   asset asli (a) supaya field kepril saat Edit Aset.
onJenisChange(){
Aset.renderJenisFields(null);
// §H poin 1: ganti Jenis = kandidat instrumen tradable ikut berubah -- render ulang
// section toggle dgn a=null (pola sama renderJenisFields(null) di atas: ganti kategori
// dianggap "seperti aset baru" utk keperluan section ini, TIDAK baca a.investmentId
// tersimpan lagi krn user mungkin lagi ganti-ganti Jenis sebelum benar-benar Simpan).
Aset._renderTradableSection(null);
},
renderJenisFields(a){
const jenis=document.getElementById('assetJenis').value;
const wrap=document.getElementById('assetJenisFieldsWrap');
if(!wrap)return;
if(jenis==='Kendaraan'){
const tahun=a&&a.vehTahun!=null?a.vehTahun:'';
const cc=a&&a.vehCc!=null?a.vehCc:'';
const bbm=a&&a.vehBbm?a.vehBbm:'';
wrap.innerHTML='<div class="u-grid2"><div class="fg"><label class="fl">Tahun</label><input type="text" inputmode="numeric" class="fi" id="assetVehTahun" placeholder="2022" value="'+escapeHtml(String(tahun))+'"></div><div class="fg"><label class="fl">CC</label><input type="text" inputmode="numeric" class="fi" id="assetVehCc" placeholder="125" value="'+escapeHtml(String(cc))+'"></div></div><div class="fg"><label class="fl">Jenis BBM</label><select class="fs" id="assetVehBbm"><option value="">— Pilih —</option><option value="Pertalite">Pertalite</option><option value="Pertamax">Pertamax</option><option value="Pertamax Turbo">Pertamax Turbo</option><option value="Solar">Solar</option><option value="Dexlite">Dexlite</option><option value="Listrik">⚡ Listrik</option><option value="Hybrid">Hybrid</option></select></div>';
document.getElementById('assetVehBbm').value=bbm;
}else if(jenis==='Tanah'||jenis==='Rumah/Bangunan'){
const luas=a&&a.luasM2!=null?a.luasM2:'';
wrap.innerHTML='<div class="fg"><label class="fl">Luas Tanah/Bangunan (m²)</label><input type="text" inputmode="decimal" class="fi" id="assetLuasM2" placeholder="120" value="'+escapeHtml(String(luas))+'"></div><div class="u-fs11 u-t2" style="margin:-6px 0 12px;line-height:1.5">💡 NJOP dipakai dari field "Estimasi Nilai Saat Ini" di bawah — estimasi PBB otomatis muncul di menu 🏛️ Pajak Aset setelah aset ini disimpan.</div>';
}else if(jenis==='Emas/Logam Mulia'){
const gram=a&&a.goldBeratGram!=null?a.goldBeratGram:'';
const kadar=a&&a.goldKadar!=null?a.goldKadar:750;
wrap.innerHTML='<div class="u-grid2"><div class="fg"><label class="fl">Berat (gram)</label><input type="text" inputmode="decimal" class="fi" id="assetGoldGram" placeholder="4.13" value="'+escapeHtml(String(gram))+'"></div><div class="fg"><label class="fl">Kadar/Karat</label><select class="fs" id="assetGoldKadar"><option value="999">24K (999)</option><option value="916">22K (916)</option><option value="875">21K (875)</option><option value="750">18K (750)</option><option value="700">17K (700)</option></select></div></div>';
document.getElementById('assetGoldKadar').value=String(kadar);
}else{
wrap.innerHTML='';
}
},
updateProfitPreview(){
const box=document.getElementById('assetProfitInfo');
if(!box)return;
const nilai=calcPreviewValue(document.getElementById('assetNilai').value);
const modal=calcPreviewValue(document.getElementById('assetModalInvestasi').value);
if(!modal){box.innerHTML='';return;}
const untung=nilai-modal;
const pct=modal?(untung/modal*100):0;
const cls=untung>=0?'green':'red';
box.innerHTML='Estimasi untung/rugi: <b class="'+cls+'">'+(untung>=0?'+':'')+fmtFull(untung)+' ('+(pct>=0?'+':'')+pct.toFixed(2)+'%)</b>';
},
toggleZakatable(){
Aset._zakatableState=!Aset._zakatableState;
const btn=document.getElementById('assetZakatableBtn');
btn.textContent=Aset._zakatableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._zakatableState?' active':'');
},
// _renderTitipanSummary(a) -- SESI C (tahap terakhir migrasi Dana Titipan -> Multi-
// Owner Engine): gantiin toggleTitipan()/onTitipanOwnerTypeChange()/
// TITIPAN_OWNER_LABELS lama (dihapus sesi ini) yang dulu render field titipan bisa-
// diedit langsung di assetModal. Sekarang PURE read-only -- cuma nunjukin ringkasan
// singkat pemilik non-SELF aset ini SAAT INI (kalau ada), baca lewat
// MultiOwnerEngine.getOwners() (toleran data lama/baru -- baik yang sudah py `a.owners`
// eksplisit MAUPUN yang masih legacy `titipanAmount` & belum sempat auto-migrate,
// 0 rumus baru ditulis di sini). Mengatur porsi (termasuk titipan/patungan) sekarang
// SATU PINTU lewat tombol "⚖️ Atur Porsi Kepemilikan" (openOwnersModal(), S392a+).
_renderTitipanSummary(a){
const box=document.getElementById('assetTitipanSummary');
if(!box)return;
if(!a||typeof MultiOwnerEngine==='undefined'){box.textContent='';box.classList.add('u-dnone');return;}
const res=MultiOwnerEngine.getOwners(a);
if(!res||!res.ok||!res.isMultiOwner){box.textContent='';box.classList.add('u-dnone');return;}
const nonSelf=res.owners.filter(o=>!o.isSelf);
if(!nonSelf.length){box.textContent='';box.classList.add('u-dnone');return;}
const parts=nonSelf.map(o=>escapeHtml(o.ownerName)+' '+o.porsi+'%').join(', ');
box.innerHTML='💰 Ada dana titipan/patungan: '+parts+' — atur lewat tombol "⚖️ Atur Porsi Kepemilikan" di bawah.';
box.classList.remove('u-dnone');
},
// _renderVehicleLinkAction(a) -- S509c Asset -> Vehicle Reverse Navigation
// (lihat PROMPT IMPLEMENTASI S509c, simetris dgn S509b Vehicle -> Asset).
// PURE read-only: kalau aset ini jenis Kendaraan DAN sudah ditautkan balik
// oleh SATU D.vehicles[] (via resolveVehicleByAssetId() di vehicle-core.js,
// guard typeof karena vehicle-core.js modul terpisah -- pola sama persis
// guard typeof MultiOwnerEngine di _renderTitipanSummary()), tampilkan
// tombol navigasi "🚗 Lihat di Kendaraan". TIDAK ada warning/badge kalau
// TIDAK ada vehicle tertaut -- beda dgn S509b, arah ini tidak ada konsep
// "orphan" (aset bisa saja memang belum ditautkan vehicle manapun, itu
// normal, bukan data rusak). Kontainer disembunyikan (u-dnone) kalau tidak
// ada match, ditampilkan kalau ada.
_renderVehicleLinkAction(a){
const box=document.getElementById('assetVehicleLinkAction');
if(!box)return;
if(!a||a.jenis!=='Kendaraan'||typeof resolveVehicleByAssetId!=='function'){box.innerHTML='';box.classList.add('u-dnone');return;}
const v=resolveVehicleByAssetId(a.id);
if(!v){box.innerHTML='';box.classList.add('u-dnone');return;}
box.innerHTML='<button type="button" class="btn btn-ghost btn-full btn-sm" data-action="assetActionViewVehicle" data-args="'+escapeHtml(JSON.stringify([v.id]))+'">🚗 Lihat di Kendaraan</button>';
box.classList.remove('u-dnone');
},
// _populateInvestmentLinkSelect(a) -- Sesi B1: helper DOM dipanggil openModal() (tambah
// baru, a=null -> dropdown "Tidak terhubung"; edit, a=aset existing -> investmentId-nya
// kalau ada otomatis ke-select), pola sama persis _populateVehAssetLinkSelect() (S506,
// vehicle-core.js). Field a.investmentId dibaca-tulis di sini & di _saveInner() SAJA --
// 0 logic bridging/tampilan lain di sesi ini (itu scope B2/B3).
_populateInvestmentLinkSelect(a){
const sel=document.getElementById('assetInvestmentId');
if(!sel)return;
sel.innerHTML=assetInvestmentLinkOptionsHtml(a&&a.investmentId);
},
// onInvestmentLinkChange() -- SESI B2b: dipanggil dari onchange dropdown "🔗 Hubungkan
// ke Holding Investasi" (assetModal) supaya label tombol "Atur Porsi" di bawahnya ikut
// update LIVE begitu user ganti tautan (belum sempat Simpan Aset) -- baca langsung dari
// value dropdown saat ini, BUKAN dari a.investmentId tersimpan (beda dgn
// _updateOwnersButtonLabel(a) yang dipanggil openModal() saat modal baru dibuka).
onInvestmentLinkChange(){
const sel=document.getElementById('assetInvestmentId');
const id=sel?sel.value:'';
const h=id?(D.investments||[]).find(x=>sameId(x.id,id)):null;
Aset._applyOwnersButtonLabel(!!h);
// §H poin 2: link manual (dropdown ini) SELALU jadi override -- begitu user pilih
// holding yang SUDAH ADA di sini, sembunyikan toggle "Buat Holding Investasi Otomatis"
// (section tradable) supaya saveUnified() tidak dobel-buat holding baru. Balik pilih
// "— Tidak ditautkan —" (id kosong) -> section dievaluasi ulang seperti biasa.
const section=document.getElementById('assetTradableSection');
if(section){
if(id)section.classList.add('u-dnone');
else Aset._renderTradableSection(Aset.editId?D.assets.find(x=>sameId(x.id,Aset.editId)):null);
}
},
// toggleTradable() -- toggle chip "📈 Buat Holding Investasi Otomatis" (assetTradableSection),
// pola SAMA PERSIS toggleZakatable() di atas -- 0 logic baru, cuma flip _tradableState +
// refresh label/class tombol.
toggleTradable(){
Aset._tradableState=!Aset._tradableState;
const btn=document.getElementById('assetTradableBtn');
if(btn){
btn.textContent=Aset._tradableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._tradableState?' active':'');
}
},
// _renderTradableSection(a) -- §H/§I: dipanggil openModal() (a=aset existing/null utk
// tambah baru), onJenisChange() (a=null, lihat komentar di atas), & onInvestmentLinkChange()
// (balik ke "Tidak ditautkan"). PURE render, 0 tulis data -- keputusan
// tulis/tidak-tulis holding baru ada sepenuhnya di saveUnified() saat Simpan Aset.
_renderTradableSection(a){
const section=document.getElementById('assetTradableSection');
if(!section)return;
const jenisSel=document.getElementById('assetJenis');
const jenis=jenisSel?jenisSel.value:'';
const isTradableJenis=Aset.TRADABLE_JENIS.includes(jenis);
// auto-hide section kalau sudah tertaut (link manual SELALU jadi override, §H poin 2) --
// tautan lama (Edit Aset, a.investmentId) di sini; tautan yang baru dipilih user LEWAT
// dropdown ditangani terpisah di onInvestmentLinkChange() (blm tentu tersimpan ke `a`).
const alreadyLinked=!!(a&&a.investmentId);
if(!isTradableJenis||alreadyLinked){
section.classList.add('u-dnone');
Aset._tradableState=false;
return;
}
section.classList.remove('u-dnone');
// auto-detect default toggle dari jenis -- KHUSUS aset baru (a null, termasuk saat
// onJenisChange() re-render dgn a=null): jenis tradable otomatis default AKTIF, supaya
// alur "isi Jenis=Saham lalu Simpan" langsung bikin holding tanpa langkah ekstra. Aset
// existing yang SEDANG di-edit (a terisi, belum tertaut) TIDAK dipaksa nyala ulang tiap
// modal dibuka -- toggle mengikuti pilihan terakhir user di sesi ini (_tradableState).
if(!a)Aset._tradableState=true;
const btn=document.getElementById('assetTradableBtn');
if(btn){
btn.textContent=Aset._tradableState?'✓ Aktif':'Nonaktif';
btn.className='chip-btn'+(Aset._tradableState?' active':'');
}
const priceInput=document.getElementById('assetCurrentPrice');
if(priceInput)priceInput.value='';
},
// openOwnersModal(id) -- SESI 392a+392b ("atur porsi kepemilikan majemuk"): baca
// pemilik aset yang sedang tercatat lewat MultiOwnerEngine.getOwners() (S390, 100%
// reuse), disalin ke Aset._ownersDraft (array di memori, BUKAN referensi ke D.assets
// langsung) supaya bisa ditambah/dihapus/diedit lewat addOwnerRow()/removeOwnerRow()/
// onOwnerNameInput()/onOwnerPorsiInput() (392b) sebelum benar-benar disimpan.
// Indikator total porsi interaktif (updateOwnersTotal) & tombol simpan/reset
// (saveOwners/resetOwners) SENGAJA ditunda ke sesi berikutnya (disiplin "1 task = 1
// sesi", sama pola S390->S391->392a->392b). Dipanggil dari tombol "⚖️ Atur Porsi
// Kepemilikan" di assetModal -- tersedia untuk aset yang sudah ada (Aset.editId terisi
// dari openModal()); kalau belum ada aset tersimpan (mis. lagi isi form Tambah Aset
// baru), modal menampilkan pesan supaya aset disimpan dulu.
// selfOwnedNilai(a) -- SESI 393: porsi `a.nilai` yang jadi milik SENDIRI
// (bukan porsi pemilik lain kalau aset ini multi-pemilik), 100% reuse
// MultiOwnerEngine.selfOwnedValue() (S390/393) -- 0 rumus baru di sini.
// Guard typeof MultiOwnerEngine: kalau engine belum dimuat, fallback nilai
// penuh (perilaku SEBELUM Sesi 393, aman & tidak pernah lebih rendah dari
// yang seharusnya). Dipakai PajakAset (Zakat Maal per Aset) & bisa dipakai
// modul lain (mis. Zakat.hitungMaal() di pajak-pbb-zakat.js lewat
// MultiOwnerEngine langsung, tidak perlu import Aset).
selfOwnedNilai(a){
if(typeof MultiOwnerEngine==='undefined')return(a&&a.nilai)||0;
return MultiOwnerEngine.selfOwnedValue(a,(a&&a.nilai)||0);
},
// _resolveLinkedInvestmentOwners(a) -- SESI B2a: PURE, dipanggil openOwnersModal().
// Balikin null kalau aset TIDAK terhubung ke Holding Investasi (a.investmentId kosong,
// lihat field baru B1) ATAU holding yang ditautkan sudah tidak ada lagi di D.investments
// (tautan orphan, mis. holding-nya dihapus) ATAU module investasi.js belum dimuat --
// dalam ketiga kasus itu caller FALLBACK ke jalur editable lama (SAMA PERSIS perilaku
// sebelum sesi ini, 0 regresi). Balikin array owners (format sama persis
// MultiOwnerEngine.getOwners(): {ownerId,ownerName,porsi,isSelf}) kalau tautan valid --
// dibaca LIVE lewat Investment.getOwners() (AUD-008/S462, SUDAH ADA & 100% reuse), BUKAN
// disalin/snapshot ke a.owners -- porsi aset yang tertaut jadi SATU sumber kebenaran di
// holding investasi, mencegah dobel-catat 2 draft porsi berbeda utk instrumen yang sama.
// _resolveLinkedInvestment(a) -- SESI B2b: PURE, versi lebih ringan dari
// _resolveLinkedInvestmentOwners() di bawah -- CUMA cari holding-nya (tanpa syarat
// module investasi.js/Investment sudah dimuat, tanpa baca owners), dipakai
// _updateOwnersButtonLabel()/onInvestmentLinkChange()/openOwnersModal() (redirect) yang
// semuanya cuma butuh tahu "aset ini tertaut ke holding yang MASIH ADA atau tidak",
// bukan porsinya. Balikin objek holding (h) kalau tertaut & valid, null kalau tidak
// (investmentId kosong ATAU orphan/holding sudah dihapus).
_resolveLinkedInvestment(a){
if(!a||!a.investmentId)return null;
return(D.investments||[]).find(x=>sameId(x.id,a.investmentId))||null;
},
_resolveLinkedInvestmentOwners(a){
if(typeof Investment==='undefined')return null;
const h=Aset._resolveLinkedInvestment(a);
if(!h)return null;
return Investment.getOwners(h)||[];
},
// _investmentBridgeMeta(a) -- SESI B3: bangun 1 baris teks read-only "🔗 Terhubung ke
// Investasi: <nama holding> · Porsi: 70% Budi · 30% Ayah" utk kartu Aset (dipakai
// openActionsMenu() di bawah, digabung ke metaRows yang SUDAH ADA -- pola desain S306
// "detail dipindah ke overflow menu, kartu tetap ringkas"). Pola PERSIS
// vehAssetBridgeHtml() (S507, vehicle-core.js): PURE, READ-ONLY, baca LIVE dari
// D.investments/Investment.getOwners() tiap panggilan (bukan snapshot/cache di a).
// Balikin null kalau aset TIDAK tertaut (a.investmentId kosong) ATAU tautan orphan
// (holding sudah dihapus) -- caller menyembunyikan baris ini sepenuhnya kalau null,
// sama disiplin dgn extraMeta/linkMeta/dst di metaRows. Owners line HANYA tampil kalau
// ADA porsi>0 tercatat (guard typeof Investment, pola sama _resolveLinkedInvestmentOwners)
// -- holding yang belum diatur porsinya sama sekali cukup tampilkan nama holding saja.
_investmentBridgeMeta(a){
const h=Aset._resolveLinkedInvestment(a);
if(!h)return null;
let ownersLine='';
if(typeof Investment!=='undefined'){
const owners=Investment.getOwners(h);
if(owners&&owners.length){
ownersLine=owners.filter(o=>o.porsi>0).map(o=>Math.round(o.porsi)+'% '+escapeHtml(o.ownerName||'?')).join(' · ');
}
}
return '🔗 Terhubung ke Investasi: '+escapeHtml(h.name||'?')+(ownersLine?(' · Porsi: '+ownersLine):'');
},
// _findInvestmentMigrationCandidates() -- SESI B4 (alat bantu migrasi Data Health Check):
// cari PASANGAN Aset (belum tertaut, investmentId kosong) & Holding Investasi (belum
// ditautkan aset manapun) yang namanya mirip -- kandidat instrumen dobel-catat (1x manual
// di Buku Aset lama, 1x lagi di Holding Investasi baru) yang belum ditautkan lewat dropdown
// "🔗 Hubungkan ke Holding Investasi" (B1). PURE, READ-ONLY -- SENGAJA cuma SARAN, BUKAN
// auto-link (nama mirip tidak selalu berarti instrumen sama), keputusan link tetap manual
// di modal Aset. Pencocokan pola PERSIS _fuzzyAccountMatch() (scan-ocr.js): normalisasi lalu
// exact match ATAU substring 1 arah, guard panjang min 4 karakter (cegah false-positive nama
// pendek generik). Dipanggil dari data-health-check.js (guard typeof Aset).
_findInvestmentMigrationCandidates(){
const linkedHoldingIds=new Set((D.assets||[]).filter(a=>a.investmentId).map(a=>String(a.investmentId)));
const candidates=[];
(D.assets||[]).forEach(a=>{
if(a.investmentId)return;
const an=_normalizeInstrumentName(a.name);
if(an.length<4)return;
(D.investments||[]).forEach(h=>{
if(linkedHoldingIds.has(String(h.id)))return;
const hn=_normalizeInstrumentName(h.name);
if(hn.length<4)return;
if(an!==hn && !an.includes(hn) && !hn.includes(an))return;
candidates.push({
assetId:a.id,assetName:a.name||'?',assetNilai:a.nilai||0,
holdingId:h.id,holdingName:h.name||'?',
holdingValue:(typeof Investment!=='undefined'&&typeof Investment.holdingValue==='function')?Investment.holdingValue(h):null,
});
});
});
return candidates;
},
save(){return withSaveGuard('aset','assetModal',Aset._saveInner);},
// saveUnified() -- §H/§I AUDIT-UNIFIED-ASSET-INVESTMENT-FORM.md: orkestrasi TIPIS di atas
// Aset.save() (_saveInner(), TIDAK diubah selain 1 baris return di atas) & Investment.
// addHolding()/MultiOwnerEngine.setOwners() (SUDAH ADA, TIDAK diubah). Dipanggil dari
// data-action="saveAsset" (assetModal, lewat pajak-aset-ui-wrappers.js) MENGGANTIKAN
// pemanggilan Aset.save() langsung. Kalau section "📈 Buat Holding Investasi Otomatis"
// sedang disembunyikan (bukan jenis tradable / sudah tertaut manual, lihat
// _renderTradableSection()) ATAU togglenya nonaktif, perilaku PERSIS SAMA dgn Aset.save()
// lama (0 regresi utk kasus non-tradable, yang tetap jadi mayoritas alur Buku Aset).
saveUnified(){
const section=document.getElementById('assetTradableSection');
const sectionVisible=!!(section&&!section.classList.contains('u-dnone'));
const wantAutoHolding=sectionVisible&&Aset._tradableState;
const priceEl=document.getElementById('assetCurrentPrice');
const currentPriceRaw=priceEl?priceEl.value:'';
const currentPrice=currentPriceRaw!==''?parseDecStr(currentPriceRaw):null;
const savedAsset=Aset.save();
if(!savedAsset)return savedAsset;// validasi gagal (mis. nama kosong) atau save guard aktif -- _saveInner() sudah toast sendiri, hentikan di sini, 0 side-effect tambahan.
if(!wantAutoHolding)return savedAsset;
// Guard ganda thd race/duplikasi: kalau asetnya SUDAH tertaut (a.investmentId, mis. dari
// link manual yang barusan tersimpan) ATAU module Investment belum dimuat, jangan bikin
// holding kedua / gagal diam-diam.
if(savedAsset.investmentId)return savedAsset;
if(typeof Investment==='undefined'||typeof Investment.addHolding!=='function')return savedAsset;
const type=Aset.TRADABLE_TYPE_MAP[savedAsset.jenis]||'Lainnya';
const unit=isFinite(savedAsset.jumlahUnit)&&savedAsset.jumlahUnit>0?savedAsset.jumlahUnit:0;
const avgPrice=isFinite(savedAsset.hargaBeli)&&savedAsset.hargaBeli>0?savedAsset.hargaBeli:0;
const holding=Investment.addHolding({
name:savedAsset.name,
type,
unit,
avgPrice,
currentPrice:currentPrice!=null?currentPrice:avgPrice,
notes:'Auto-dibuat dari Buku Aset: '+savedAsset.name,
zakatable:!!savedAsset.zakatable,
purchaseDate:savedAsset.tanggal||null,
});
// Waris ownership aset -> holding baru (§I) -- 100% reuse Investment.setOwners(), yang di
// dalamnya delegasi penuh ke MultiOwnerEngine.setOwners() (0 rumus baru ditulis di sini).
// Kalau aset ini SELF 100% (owners.length<=1 SELF), tidak perlu dipanggil -- addHolding()
// di atas sudah default SELF 100% (perilaku sama).
if(typeof MultiOwnerEngine!=='undefined'){
const ownersRes=MultiOwnerEngine.getOwners(savedAsset);
if(ownersRes&&ownersRes.ok&&Array.isArray(ownersRes.owners)&&(ownersRes.owners.length>1||!ownersRes.owners[0]?.isSelf)){
try{Investment.setOwners(holding.id,ownersRes.owners);}catch(e){/* non-fatal: holding tetap tersimpan (default SELF) walau porsi gagal diwariskan */}
}
}
savedAsset.investmentId=holding.id;
save();
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();
toast('✅ Aset tersimpan & Holding Investasi otomatis dibuat');
return savedAsset;
},
_saveInner(){
const name=document.getElementById('assetName').value.trim();
if(!name){toast('⚠️ Nama aset wajib diisi');return;}
const jenis=document.getElementById('assetJenis').value;
const lokasi=document.getElementById('assetLokasi').value.trim();
const nilai=parsePzNum(document.getElementById('assetNilai').value);
const modalInvestasi=parsePzNum(document.getElementById('assetModalInvestasi').value)||null;
const hargaBeli=parseDecStr(document.getElementById('assetHargaBeli').value);
const jumlahUnit=parseDecStr(document.getElementById('assetJumlahUnit').value);
const tanggal=document.getElementById('assetTanggal').value||'';
let accountId=document.getElementById('assetAccId').value||null;
// linkedAccNilai -- SESI C (tahap terakhir migrasi Dana Titipan -> Multi-Owner
// Engine) awalnya nulis cuma porsi SELF ke sini (bukan nilai penuh instrumen),
// SUPAYA Total Saldo Akun tidak dobel-hitung dgn Aset.totalValue(). SESI 449
// (BUG-OWN-002 lanjutan, audit s448) REVISI keputusan itu: exclude dobel-hitung
// SUDAH sepenuhnya jadi tanggung jawab totalSaldoAkun() lewat linkedAssetAccountIds()
// (lihat komentar totalSaldoAkun(), akun.js) -- akun tertaut dikecualikan PENUH
// dari Total Saldo Akun terlepas dari nilai apa pun yang tersimpan di
// baseBalance/balance-nya. Jadi menulis porsi SELF-saja ke sini TIDAK PERLU utk
// cegah dobel-hitung, tapi PUNYA efek samping buruk: kalau porsi SELF 0% (mis.
// semua owner "Ini saya"-nya belum dicentang), kartu akun tertaut nampilin
// Rp 0 padahal instrumennya ada isinya -- membingungkan user (dicatat Sesi 434
// sbg gejala, dikasih catatan penjelas doang waktu itu, BUKAN di-fix akarnya).
// Fix: tulis NILAI PENUH instrumen (bukan porsi SELF saja) -- kartu akun
// tertaut sekarang selalu representatif/informatif, exclude dari Kekayaan
// Bersih tetap terjamin oleh totalSaldoAkun() (independen dari field ini).
const linkedAccNilai=nilai;
// BUGFIX-FEATURE: opsi "__new__" = bukan menautkan ke akun yang SUDAH ADA, tapi
// bikin akun baru otomatis dari aset ini -- biar akun itu langsung nongol di
// daftar 🏦 Akun & bisa langsung dipakai buat transaksi (bayar/terima) seperti
// akun biasa, bukan cuma referensi nilai doang. Saldo awal akun = porsi milik
// sendiri (nilai aset dikurangi Dana Titipan, kalau ada). Setelah dibuat, id akun
// baru itu yang dipakai sbg accountId (tetap otomatis dikecualikan dari Total
// Saldo Akun lewat linkedAssetAccountIds(), sama seperti tautan ke akun lama,
// supaya nilainya gak dobel dihitung).
let _createdNewAcc=false;
// Ownership (S231) — dibaca dari dropdown, divalidasi/dinormalisasi via OwnershipEngine.
// Dipindah ke SINI (sebelum blok __new__ di bawah, bukan sesudahnya seperti semula)
// supaya akun baru yang auto-dibuat dari Aset bisa langsung ikut mewarisi ownership
// aset-nya (fix gap dicatat Sesi 311: akun auto-buat selalu ownership SELF/DEFAULT,
// jadi tidak kehitung di Dana Kelolaan/"Dana Investor" walau aset-nya sendiri sudah
// ownership INVESTOR/CUSTOMER/dst).
// Link Holding Investasi (Sesi B1) -- dibaca dari dropdown "🔗 Hubungkan ke Holding
// Investasi", pola sama vehAssetId (S506): "— Tidak terhubung —" (value kosong) -> field
// DIHAPUS dari record (guardrail konvensi schema existing, bukan disimpan sbg link
// kosong). 0 validasi tambahan di sesi ini (murni baca id yang dipilih user dari D.investments
// -- opsi dropdown sudah dijamin valid oleh assetInvestmentLinkOptionsHtml()).
const investmentIdRaw=document.getElementById('assetInvestmentId')?.value||'';
const investmentId=investmentIdRaw||null;
const ownRawA=document.getElementById('assetOwnership')?.value;
const ownership=(typeof OwnershipEngine!=='undefined'&&OwnershipEngine.isValidType(ownRawA))?OwnershipEngine.normalize(ownRawA):(typeof OwnershipEngine!=='undefined'?OwnershipEngine.DEFAULT:'SELF');
if(accountId==='__new__'){
const newAcc={id:'acc_'+Date.now(),name,emoji:Aset.ICON[jenis]||'📦',baseBalance:linkedAccNilai,balance:linkedAccNilai,includeInBalance:true,ownership};
D.accounts.push(newAcc);
accountId=newAcc.id;
_createdNewAcc=true;
}
// SYNC NOMINAL AKUN TERTAUT (fix: akun yang ditautkan dari Buku Aset sebelumnya
// cuma dapat baseBalance = nilai SEKALI waktu dibuat -- edit nilai aset SESUDAHNYA
// tidak pernah kepropagasi ke akunnya, jadi keduanya cepat divergen. Fix: tiap kali
// aset disimpan (nilai berubah/tidak) & sudah tertaut ke akun YANG SUDAH ADA
// (bukan baru dibuat di blok atas, itu sudah otomatis sama), akun itu di-"koreksi"
// ke nominal = linkedAccNilai (nilai penuh instrumen, SESI 449 lihat komentar di
// atas) SEKARANG, pakai pola txDelta yang SAMA PERSIS dgn _saveAccInner()
// (akun.js) -- riwayat transaksi akun (kalau ada, mis. sudah dipakai bayar/
// terima) TIDAK diubah, cuma baseBalance-nya digeser supaya hasil
// recalcAccBalance() = linkedAccNilai. Buku Aset (variabel `nilai`) TIDAK
// disentuh oleh blok ini sama sekali -- arah sync SATU ARAH dari Aset -> Akun,
// bukan sebaliknya, jadi nilai di Buku Aset tetap ikut update manual tersendiri,
// tidak pernah ketarik balik oleh transaksi yang terjadi di akun tertaut.
if(accountId&&!_createdNewAcc){
const linkedAcc=D.accounts.find(x=>sameId(x.id,accountId));
if(linkedAcc){
const txDelta=recalcAccBalance(linkedAcc.id)-(linkedAcc.baseBalance!==undefined?linkedAcc.baseBalance:(linkedAcc.balance||0));
linkedAcc.baseBalance=linkedAccNilai-txDelta;
linkedAcc.balance=linkedAccNilai;
// BUGFIX (audit kepemilikan): akun EXISTING yang BARU ditautkan (atau sudah
// tertaut & aset ini disimpan ulang) sebelumnya TIDAK ikut mewarisi
// `ownership` aset -- cuma jalur __new__ (buat akun baru dari aset) di atas
// yang mewarisi (lihat komentar Sesi 311). Akibatnya akun lama yang
// ditautkan ke aset ber-ownership non-SELF (mis. INVESTOR) tetap tampil
// SELF/default kalau ownership akun itu belum pernah diisi manual --
// OwnershipEngine jadi TIDAK lagi single source of truth utk akun tertaut.
// Fix: samakan pola __new__ -- akun tertaut SELALU disamakan ke ownership
// aset (Aset -> Akun, arah sync SATU ARAH, sama seperti sync saldo di atas).
if(typeof OwnershipEngine!=='undefined')linkedAcc.ownership=ownership;
}
}
const keuntungan=modalInvestasi?(nilai-modalInvestasi):null;
const keuntunganPct=modalInvestasi?((nilai-modalInvestasi)/modalInvestasi*100):null;
const extra={modalInvestasi,hargaBeli,jumlahUnit,keuntungan,keuntunganPct};
// CATATAN Sesi C: extra.titipanAmount/titipanOwnerType/titipanOwnerName SENGAJA TIDAK
// diisi ulang di sini lagi (field itu sudah tidak ada di assetModal) -- Object.assign()
// di bawah cuma menimpa key yang ADA di extra, jadi titipanAmount lama (aset yang
// belum sempat auto-migrate) TIDAK ikut ke-reset ke 0 tiap kali aset ini disimpan --
// tetap utuh sampai blok AUTO-MIGRATE di bawah benar-benar memindahkannya ke
// `savedAsset.owners`.
// Field kategori-spesifik (lihat Aset.renderJenisFields) -- selalu di-reset dulu
// ke null lalu diisi ULANG sesuai jenis yg dipilih SEKARANG, supaya kalau user
// ganti kategori pas Edit Aset (mis. dari Kendaraan ke Tanah), field kategori
// lama tidak nyangkut jadi data basi di aset ini.
extra.vehTahun=null;extra.vehCc=null;extra.vehBbm=null;
extra.luasM2=null;
extra.goldBeratGram=null;extra.goldKadar=null;
if(jenis==='Kendaraan'){
const vt=document.getElementById('assetVehTahun');
const vc=document.getElementById('assetVehCc');
const vb=document.getElementById('assetVehBbm');
extra.vehTahun=vt&&vt.value!==''?(parseInt(vt.value,10)||null):null;
extra.vehCc=vc&&vc.value!==''?(parseInt(vc.value,10)||null):null;
extra.vehBbm=vb&&vb.value?vb.value:null;
}else if(jenis==='Tanah'||jenis==='Rumah/Bangunan'){
const lm=document.getElementById('assetLuasM2');
extra.luasM2=lm&&lm.value!==''?(parseDecStr(lm.value)||null):null;
}else if(jenis==='Emas/Logam Mulia'){
const gg=document.getElementById('assetGoldGram');
const gk=document.getElementById('assetGoldKadar');
extra.goldBeratGram=gg&&gg.value!==''?(parseDecStr(gg.value)||null):null;
extra.goldKadar=gk&&gk.value?(parseInt(gk.value,10)||null):null;
}
let savedAsset;
if(Aset.editId){
const a=D.assets.find(x=>sameId(x.id,Aset.editId));
if(!a){toast('⚠️ Aset tidak ditemukan, coba tutup dan buka lagi');return;}
Object.assign(a,{name,jenis,lokasi,nilai,tanggal,zakatable:Aset._zakatableState,accountId,ownership},extra);
if(investmentId)a.investmentId=investmentId;else delete a.investmentId;
savedAsset=a;
} else {
savedAsset=Object.assign({id:uid(),name,jenis,lokasi,nilai,tanggal,zakatable:Aset._zakatableState,accountId,ownership},extra);
if(investmentId)savedAsset.investmentId=investmentId;
D.assets.push(savedAsset);
}
// AUTO-MIGRATE (Sesi C -- sesi TERAKHIR dari 4 migrasi Dana Titipan -> Multi-Owner
// Engine, lihat s406b/s407/s408/s409-SESSION-NOTE.md utk 3 sesi sebelumnya): aset yang
// masih py titipanAmount>0 legacy TAPI belum py `owners` eksplisit ditulis PERMANEN ke
// `savedAsset.owners` di titik simpan ini. SEBELUM sesi ini cuma disintesis on-the-fly
// tiap dibaca (MultiOwnerEngine.getOwners()->_synthesizeFromTitipan(), Sesi 406b) --
// TIDAK PERNAH benar-benar ditulis ke data. 100% reuse getOwners()+setOwners() (S390,
// 0 rumus baru) -- getOwners() yang mensintesis 2 baris (SELF+titipan) dari nilai/
// titipanAmount SEBELUM disimpan, lalu setOwners() menormalisasi & menulisnya.
// titipanAmount/titipanOwnerType/titipanOwnerName legacy dikosongkan SETELAH migrasi
// sukses -- representasinya sudah pindah penuh ke `owners` (getOwners() prioritas
// baca #1 ada di `entity.owners`, jadi field lama TIDAK dibaca lagi setelah ini,
// dikosongkan murni buat kebersihan data, bukan krn masih dipakai).
if(typeof MultiOwnerEngine!=='undefined'&&!Array.isArray(savedAsset.owners)&&savedAsset.titipanAmount>0){
const migRes=MultiOwnerEngine.getOwners(savedAsset);
if(migRes&&migRes.ok&&migRes.owners.length>1){
const setRes=MultiOwnerEngine.setOwners(savedAsset,migRes.owners);
if(setRes.ok)Object.assign(savedAsset,{owners:setRes.entity.owners,titipanAmount:0,titipanOwnerType:'',titipanOwnerName:''});
}
}
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(savedAsset);}else{Aset._syncOwnerDebts(savedAsset);}
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{jenis,nilai,editId:Aset.editId});
closeModal('assetModal');
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
if(typeof renderDebtList==='function')renderDebtList();
if(typeof populateAccFilters==='function')populateAccFilters();
toast(_createdNewAcc?'✅ Aset tersimpan & akun baru dibuat':'✅ Aset tersimpan');
// return savedAsset -- §I: SATU-SATUNYA baris ditambah ke _saveInner() (exception thd
// "tidak menyentuh isi _saveInner()" -- lihat AUDIT-UNIFIED-ASSET-INVESTMENT-FORM.md §I),
// murni supaya saveUnified() (wrapper tipis di bawah) bisa baca hasil simpan (id/jenis/
// nilai/dst) tanpa re-query D.assets. 0 perubahan pada logic simpan di atas baris ini.
return savedAsset;
},
async delete(id){
if(!await askConfirm('Hapus aset ini dari Buku Aset?',{okText:'Ya, Hapus'}))return;
const a=D.assets.find(x=>sameId(x.id,id));
const hadTitipanDebt=!!(a&&a.titipanDebtLinkId&&D.debts);
if(hadTitipanDebt){
D.debts=D.debts.filter(d=>String(d.id)!==String(a.titipanDebtLinkId));
}
// BUGFIX (orphan:2, TitipanReconcile.checkAll()): a.titipanDebtLinkId di atas
// cuma pointer LEGACY (single-owner, sebelum Sesi B/AUD-008) -- selalu null utk
// aset yang sudah lewat _syncOwnerDebts() (field itu di-null-kan tiap sync, lihat
// _syncOwnerDebts()). Sejak Sesi B, tiap owner non-SELF punya entry utang SENDIRI
// ditandai linkedAssetId di object utangnya sendiri (bisa >1 entry per aset) --
// hapus aset TIDAK PERNAH membersihkan entry-entry ini, jadi Buku Utang nyangkut
// (persis kelas bug BUG-OWN-002 yang TitipanReconcile dibuat utk deteksi, kali
// ini di jalur HAPUS bukan simpan). Fix: bersihkan SEMUA entry linkedAssetId===id,
// pola sama persis baris D.debts=D.debts.filter(...) di _syncOwnerDebts() (aset.js)
// -- 0 rumus baru, cuma menyamakan cakupan cleanup dgn cakupan sync yang sudah ada.
if(D.debts){
D.debts=D.debts.filter(d=>!sameId(d.linkedAssetId,id));
}
D.assets=D.assets.filter(a=>!sameId(a.id,id));
save();
if(typeof AIBus!=="undefined")AIBus.emit("asset.updated",{deletedId:id});
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
if((hadTitipanDebt||(a&&a.owners&&a.owners.length))&&typeof renderDebtList==='function')renderDebtList();
},
// BUGFIX S705 (audit pola sama "0 reaksi" S601/S608 InvestmentListUI/Aset.renderList):
// Penyusutan.renderList()/PajakAset.renderList()/LaporanAset.renderList() SEBELUMNYA
// dipanggil berurutan TANPA try/catch dari 4 titik di Aset.renderList() -- 1 fungsi throw
// (mis. data aset korup) merambat ke pemanggil, membatalkan panggilan berikutnya
// (AssetInsight.render() ikut batal) dan di alur delete-aset (Aset.delete()) baris
// setelah Aset.renderList() (renderAccGrid/renderDashAccList/renderLapAccList) ikut
// batal jalan. Fix: 1 titik perbaikan (dipanggil dari ke-4 tempat), bungkus tiap kartu
// laporan dgn try/catch sendiri2 -- 1 kartu gagal TIDAK menjatuhkan 2 lainnya maupun
// pemanggil. 0 perubahan di aset-reports.js (isi ketiga renderList() itu sendiri 0 disentuh).
_safeRenderReports(){
try{Penyusutan.renderList();}catch(err){if(typeof console!=='undefined'&&console.error)console.error('[Aset._safeRenderReports] Penyusutan.renderList gagal',err);}
try{PajakAset.renderList();}catch(err){if(typeof console!=='undefined'&&console.error)console.error('[Aset._safeRenderReports] PajakAset.renderList gagal',err);}
try{LaporanAset.renderList();}catch(err){if(typeof console!=='undefined'&&console.error)console.error('[Aset._safeRenderReports] LaporanAset.renderList gagal',err);}
},
renderList(){
const el=document.getElementById('assetList');
if(!el)return;
// s476a: migrasi idempotent dijalankan tiap renderList() -- murah (early-exit
// begitu semua kandidat sudah bertanda `_migratedToInvestmentId`), memastikan
// entri investasi lama otomatis pindah ke Holding tanpa perlu tombol manual.
migrateAssetInvestmentsToHoldings();
// Ownership Filter UI (S235) — reuse OwnershipEngine.filterByType() apa adanya, TIDAK ada
// filter/logic baru. HANYA memfilter daftar yang DIRENDER di sini; totalValue()/
// renderDashboard()/dst di bawah TETAP dihitung dari D.assets penuh lewat pemanggilan
// masing2 (Jangan mengubah perhitungan). Ini juga mencakup item Investasi (jenis
// "Deposito/Investasi"/"Saham"/"Reksadana"/"Kripto" ikut tampil & difilter di sini,
// karena project ini belum punya daftar Investasi terpisah dari Buku Aset).
const assetOwnFilterEl=document.getElementById('assetOwnFilter');
const assetOwnFilterVal=assetOwnFilterEl?assetOwnFilterEl.value:'ALL';
let list=D.assets||[];
if(assetOwnFilterVal&&assetOwnFilterVal!=='ALL'&&typeof OwnershipEngine!=='undefined'){
const assetOwnFiltered=OwnershipEngine.filterByType(list,assetOwnFilterVal);
if(assetOwnFiltered.ok)list=assetOwnFiltered.items;
}
// s476a: entri yang sudah termigrasi ke Holding (D.investments) DISEMBUNYIKAN
// dari daftar editable biasa (tetap ADA di D.assets, bukan dihapus -- lihat
// migrateAssetInvestmentsToHoldings()), diganti 1 baris ringkasan di bawah.
const migratedCount=list.filter(a=>a._migratedToInvestmentId).length;
list=list.filter(a=>!a._migratedToInvestmentId);
const migratedBanner=migratedCount?`<div class="tx-item u-pointer" data-action="dashHubNavigateToFeature" data-args='${escapeHtml(JSON.stringify([{page:'aset',tab:'investasi'}]))}'><div class="tx-icon u-bgaccsoft">💹</div><div class="tx-info"><div class="tx-name">Investasi kamu sekarang dikelola di tab Investasi</div><div class="tx-meta">${migratedCount} item dipindah dari Buku Aset</div></div><div class="tx-amount">→</div></div>`:'';
// S667 (fondasi single-select, sesi lanjutan eksplisit dari catatan "Belum
// dikerjakan" SESSION-NOTE-S666.md), diubah jadi CHECKBOX LIST multi-select S673
// (item backlog SESSION-NOTE-S667.md, pola SAMA PERSIS InvestmentListUI S669/S671
// /investasi-list-view.js, bentuk final checkbox multi-select, domain Aset):
// filter checkbox-list "Pemilik" + dropdown "Status" di atas daftar Buku Aset,
// murni state UI (Aset.filterOwnerIds/filterSettlement, 0 tulis ke D) -- reuse
// penuh MultiOwnerEngine.getOwners()+Aset.getOwnerSettlement() (fondasi S665,
// 0 rumus baru). Filter bar dibangun dari `list` di ATAS (SUDAH lolos filter
// tipe kepemilikan assetOwnFilter S235 + SUDAH exclude item yang termigrasi ke
// Investasi) SEBELUM difilter owner+status, supaya opsi checkbox owner tetap
// lengkap walau filter Status sedang aktif menyembunyikan sebagian aset -- 0
// aset punya owner non-SELF sama sekali -> _renderFilterBar() balikin ''
// (filter bar disembunyikan total, bukan dirender kosong/nganggur, sama pola
// InvestmentListUI). Beda dgn assetOwnFilter (S235, filter TIPE kepemilikan
// SELF/INVESTOR/dst) -- filter S667/S673 ini soal OWNER SPESIFIK (bisa pilih
// lebih dari satu) + status settlement titipan/milik (S665/S666), independen,
// TIDAK saling menggantikan.
const ownerFilterBar=Aset._renderFilterBar(list);
const filteredList=list.filter(Aset._assetMatchesFilter);
if(!list.length){el.innerHTML=ownerFilterBar+(migratedBanner||'<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada aset tercatat</div></div>');Aset.renderDashboard();Aset.renderInvestasi();Aset._safeRenderReports();AssetInsight.render();return;}
// filteredList kosong TAPI list (sebelum filter owner+status) tidak -- beda
// pesan kosong drpd "belum ada aset tercatat" di atas, pola sama persis
// InvestmentListUI._renderList() ("🔍 Tidak ada holding yang cocok").
if(!filteredList.length){el.innerHTML=ownerFilterBar+migratedBanner+'<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada aset yang cocok dengan filter ini</div></div>';Aset.renderDashboard();Aset.renderInvestasi();Aset._safeRenderReports();AssetInsight.render();return;}
// S639 (RENCANA-MODERNISASI-UI.md): tema "modern" pakai jalur tabel list
// padat (assetTableHTML, lanjutan pola s637 Ledger Pro/tabel Uang & s638
// class .money Dana Titipan) utk #assetList, GANTIKAN grid kartu `.tx-item`
// di bawah. Jalur kartu (list.map(...) di bawah) 0 disentuh -- tetap dipakai
// apa adanya utk 10 tema lama. 0 kolom saldo berjalan (konsep itu spesifik
// transaksi kronologis, tidak berlaku utk daftar aset).
if(D.profile&&D.profile.theme==='modern'&&typeof assetTableHTML==='function'){
el.innerHTML=ownerFilterBar+migratedBanner+assetTableHTML(filteredList);
Aset.renderDashboard();Aset.renderInvestasi();Aset._safeRenderReports();AssetInsight.render();
return;
}
el.innerHTML=ownerFilterBar+migratedBanner+filteredList.map(a=>{
// BUGFIX (audit pola sama "0 reaksi" S601 InvestmentListUI._renderList): SEBELUMNYA
// blok ini TANPA try/catch -- 1 aset dgn data yg bikin assetCrossCheckWarning()/Aset.ICON
// lookup throw akan menjatuhkan SELURUH .map(), el.innerHTML tidak pernah ke-assign,
// dan #assetList tetap nampilin HTML render sukses SEBELUMNYA (tap jadi 0 reaksi krn
// data-action-nya sudah basi). Fix: bungkus per-aset dgn try/catch, fallback ke chip
// aman & badge ⚠️ kalau gagal hitung, baris tetap bisa di-tap utk buka & benerin datanya.
let jenisChip='',lokasiChip='',assetWarnChip='',renderError=false;
try{
// S306 UI polish: baris tx-meta sebelumnya menggabung jenis · label/extraLabel · lokasi ·
// akun tertaut · kepemilikan · dana titipan · %untung jadi 1 kalimat panjang tanpa jarak
// visual (lebih padat drpd kasus chip Tagihan S299/S304). Sekarang HANYA 2 chip prioritas
// yang tampil di kartu — jenis & 📍 lokasi (reuse class "acc-chip" yang SUDAH ADA, 0 style
// baru). SEMUA detail lain (label tambahan/extraLabel, akun tertaut, kepemilikan/ownership,
// dana titipan, %untung) dipindah jadi baris teks di dalam overflow menu (Aset.
// openActionsMenu di bawah) — dihitung ULANG di sana dari `a`/`id`, BUKAN dikirim lewat
// closure, jadi TIDAK ada variabel sisa yang dihitung di sini tapi tidak dipakai.
jenisChip=`<span class="acc-chip">${escapeHtml(a.jenis)}</span>`;
lokasiChip=a.lokasi?` <span class="acc-chip">📍 ${escapeHtml(a.lokasi)}</span>`:'';
// S552 (diaktifkan) — badge cross-check kepemilikan arah balik (Investment.assetId ->
// Asset), reuse assetCrossCheckWarning() (investasi.js) apa adanya, 0 rumus baru di sini.
const assetWarn=(typeof assetCrossCheckWarning==='function')?assetCrossCheckWarning(a):null;
assetWarnChip=assetWarn?` <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="${escapeHtml(assetWarn)}">⚠️</span>`:'';
}catch(err){
renderError=true;
if(typeof console!=='undefined'&&console.error)console.error('[Aset.renderList] gagal render aset',a&&a.id,err);
assetWarnChip=' <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="Gagal menghitung data aset ini — tap untuk buka & cek">⚠️</span>';
}
return `<div class="tx-item u-pointer" data-action="openAssetModal" data-args="${escapeHtml(JSON.stringify([a.id]))}"><div class="tx-icon u-bgaccsoft">${Aset.ICON[a.jenis]||'📦'}</div><div class="tx-info"><div class="tx-name">${escapeHtml(a.name||'(tanpa nama)')}${a.zakatable?' <span class="u-fs10 u-cacc3 u-r6 u-ml4" style="border:1px solid var(--accent3);padding:1px 5px">Zakat</span>':''}${assetWarnChip}</div><div class="tx-meta">${jenisChip}${lokasiChip}</div></div><div class="tx-amount">${renderError?'⚠️':fmt(a.nilai)}</div><button class="tx-del" data-stop="1" data-action="Aset.openActionsMenu" data-args="${escapeHtml(JSON.stringify([a.id]))}" aria-label="Aksi lainnya">⋮</button></div>`;
}).join('');
Aset.renderDashboard();
Aset.renderInvestasi();
Aset._safeRenderReports();
AssetInsight.render();
},
// _renderFilterBar(list) — S667 (fondasi dropdown single-select), diubah jadi
// CHECKBOX LIST multi-select S673, pola SAMA PERSIS InvestmentListUI.
// _renderFilterBar() (investasi-list-view.js, S669 checkbox list, S671 tombol
// Pilih Semua/Bersihkan). Bangun daftar checkbox "Pemilik" + dropdown "Status" di
// atas daftar aset, dari MultiOwnerEngine.getOwners(a) (owner non-SELF sudah
// kanonik lewat OwnerRegistry sejak S491) + Aset.getOwnerSettlement() (S665).
// Opsi owner dikumpulkan dari aset YANG ADA SEKARANG di `list` (bukan
// OwnerRegistry.listAll() penuh, yg juga mencakup owner Investasi/Akun yg tidak
// relevan di sini — 0 opsi mubazir yg pas dipilih hasilnya selalu kosong). 0 owner
// non-SELF sama sekali (mis. semua aset masih milik sendiri) -> balikin '' (filter
// bar disembunyikan total, bukan dirender kosong/nganggur).
_renderFilterBar(list){
// ownerMap: id -> {name, count}. count = JUMLAH ASET (bukan jumlah baris owner) di
// mana owner ini muncul sbg salah satu pemilik non-SELF -- dipakai sbg badge "(N
// aset)" di tiap baris checkbox, pola sama persis badge "(N holding)" InvestmentListUI.
// 1 aset dgn owner yg sama muncul >1x di getOwners() (data lama/duplikat) SENGAJA
// cuma dihitung SEKALI per aset (pakai Set per-aset di bawah).
const ownerMap=new Map();
(list||[]).forEach(a=>{
let owners;
try{const res=(typeof MultiOwnerEngine!=='undefined')?MultiOwnerEngine.getOwners(a):null;owners=(res&&res.ok)?res.owners:[];}catch(err){owners=[];}
const seenInThisAsset=new Set();
owners.forEach(o=>{
if(!o||o.isSelf||!o.ownerId)return;
const id=String(o.ownerId);
if(!ownerMap.has(id))ownerMap.set(id,{name:o.ownerName||'Pemilik',count:0});
if(!seenInThisAsset.has(id)){ownerMap.get(id).count+=1;seenInThisAsset.add(id);}
});
});
if(!ownerMap.size)return'';
const selectedIds=Aset.filterOwnerIds;
const ownerIdsAll=Array.from(ownerMap.keys());
// Tombol cepat "Pilih Semua"/"Bersihkan" — pola SAMA PERSIS InvestmentListUI S671,
// ambang sama (HANYA dirender kalau owner non-SELF > 5, di bawah itu tap manual
// per-checkbox masih cepat). 0 perubahan pada checkbox list/predicate, tombol ini
// murni bulk-set filterOwnerIds lewat handler baru di bawah
// (onFilterOwnerSelectAll()/onFilterOwnerClearAll()).
const quickActionsHtml=ownerIdsAll.length>5
?'<div class="btn-row u-mb4">'
+'<button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="Aset.onFilterOwnerSelectAll()">Pilih Semua</button>'
+'<button type="button" class="btn btn-ghost btn-sm u-flex1" onclick="Aset.onFilterOwnerClearAll()">Bersihkan</button>'
+'</div>'
:'';
const ownerChecks=Array.from(ownerMap.entries()).map(([id,info])=>{
const checked=selectedIds.indexOf(id)!==-1;
return'<label class="u-flex u-gap6" style="align-items:center;padding:4px 0">'
+'<input type="checkbox" onchange="Aset.onFilterOwnerToggle(\''+escapeHtml(id)+'\')"'+(checked?' checked':'')+'>'
+'<span class="u-fs13">'+escapeHtml(info.name)+' <span class="u-t2 u-fs11">('+info.count+' aset)</span></span>'
+'</label>';
}).join('');
// Dropdown Status HANYA masuk akal kalau minimal 1 owner sudah dicentang
// (settlement adalah properti PER owner-aset, bukan global) -- disabled + balik
// ke '' otomatis lewat onFilterOwnerToggle() saat filterOwnerIds jadi kosong lagi.
const statusDisabled=selectedIds.length?'':' disabled';
const statusOpts='<option value="">Semua Status</option>'
+'<option value="titipan"'+(Aset.filterSettlement==='titipan'?' selected':'')+'>🔒 Dana Titipan</option>'
+'<option value="milik"'+(Aset.filterSettlement==='milik'?' selected':'')+'>✅ Milik Sendiri</option>';
return'<div class="card u-mb10" style="padding:8px 10px">'
+'<div class="u-fs11 u-t2 u-mb4">👥 Filter Pemilik (bisa pilih lebih dari satu)</div>'
+quickActionsHtml
+ownerChecks
+'<select class="fs u-mt6" style="width:100%"'+statusDisabled+' onchange="Aset.onFilterSettlementChange(this.value)">'+statusOpts+'</select>'
+'</div>';
},
// _assetMatchesFilter(a) — S667 (fondasi single-owner), diubah jadi OR multi-owner
// S673. Query murni (0 mutasi), dipanggil per-aset dari renderList(). filterOwnerIds
// kosong -> semua aset lolos (filter nonaktif). Aset lolos kalau punya SALAH SATU
// owner dari filterOwnerIds (non-SELF) -- semantik OR, sama pola InvestmentListUI.
// _holdingMatchesFilter() (S669). Kalau filterSettlement juga diisi, status
// settlement (Aset.getOwnerSettlement(), S665) baris owner yang cocok itu harus
// sesuai -- pola query turunan dari Aset.assetsByOwnerSettlement() (aset-owners.js),
// cuma dipecah jadi predicate per-aset supaya bisa dipakai Array.prototype.filter()
// langsung di renderList().
_assetMatchesFilter(a){
if(!Aset.filterOwnerIds.length)return true;
let owners;
try{const res=(typeof MultiOwnerEngine!=='undefined')?MultiOwnerEngine.getOwners(a):null;owners=(res&&res.ok)?res.owners:[];}catch(err){return false;}
const row=owners.find(o=>o&&!o.isSelf&&Aset.filterOwnerIds.indexOf(String(o.ownerId))!==-1);
if(!row)return false;
if(!Aset.filterSettlement)return true;
try{
return Aset.getOwnerSettlement(a,row.ownerId)===Aset.filterSettlement;
}catch(err){
return false;
}
},
// onFilterOwnerToggle(id) — S673 (ganti onFilterOwnerChange S667, checkbox toggle
// bukan dropdown select, pola SAMA PERSIS InvestmentListUI.onFilterOwnerToggle()
// S669). Tambah/hapus id dari filterOwnerIds, murni state UI lalu delegasi ke
// Aset.renderList() (SAMA PERSIS pola assetOwnFilter yang sudah ada, S235) -- beda
// dari InvestmentListUI yang re-render summary+list secara terpisah (Buku Aset
// tidak punya kartu ringkasan terpisah dari renderList() spt #investSummaryValue,
// jadi 0 perlu jalur partial render tersendiri di sini). Array jadi kosong (owner
// terakhir dilepas-centang) otomatis mengosongkan filterSettlement juga (status
// tanpa owner terpilih tidak bermakna apa-apa, lihat komentar _renderFilterBar()
// di atas).
onFilterOwnerToggle(id){
const key=String(id||'');
if(!key)return;
const idx=Aset.filterOwnerIds.indexOf(key);
if(idx===-1)Aset.filterOwnerIds.push(key);
else Aset.filterOwnerIds.splice(idx,1);
if(!Aset.filterOwnerIds.length)Aset.filterSettlement='';
Aset.renderList();
},
onFilterSettlementChange(val){
Aset.filterSettlement=(val==='milik'||val==='titipan')?val:'';
Aset.renderList();
},
// onFilterOwnerSelectAll()/onFilterOwnerClearAll() — S673, pola SAMA PERSIS
// InvestmentListUI.onFilterOwnerSelectAll()/onFilterOwnerClearAll() (S671).
// Dipicu tombol quick-action di _renderFilterBar() yang HANYA muncul kalau owner
// non-SELF > 5. Murni state UI (filterOwnerIds/filterSettlement), 0 mutasi ke
// D.assets, lalu Aset.renderList() seperti toggle manual. Select All mengumpulkan
// SEMUA ownerId non-SELF dari D.assets saat ini (bukan cuma yang lagi kecentang,
// dan bukan cuma dari `list` yang sudah terfilter assetOwnFilter/migrasi) --
// owner baru yang belum pernah dicentang tetap ikut ter-include. Clear All juga
// mengosongkan filterSettlement (status tanpa owner terpilih tidak bermakna,
// sama seperti saat owner terakhir dilepas-centang manual di
// onFilterOwnerToggle()).
onFilterOwnerSelectAll(){
const ids=new Set();
(D.assets||[]).forEach(a=>{
let owners;
try{const res=(typeof MultiOwnerEngine!=='undefined')?MultiOwnerEngine.getOwners(a):null;owners=(res&&res.ok)?res.owners:[];}catch(err){owners=[];}
owners.forEach(o=>{if(o&&!o.isSelf&&o.ownerId)ids.add(String(o.ownerId));});
});
Aset.filterOwnerIds=Array.from(ids);
Aset.renderList();
},
onFilterOwnerClearAll(){
Aset.filterOwnerIds=[];
Aset.filterSettlement='';
Aset.renderList();
},
// openActionsMenu(id) — menu overflow "⋮" utk aksi sekunder + detail kartu aset (S306
// UI polish, lanjutan pola S299/S304/S305: SAMA PERSIS openBillActionsMenu() di
// tagihan-kalender.js / openProdusenActionsMenu() di cobek-order.js — reuse penuh modal
// qs-modal-overlay & class .bill-action-row/.bar-icon yang SUDAH ADA, 0 style baru).
// 3 tombol kartu (📜 Riwayat, ⚡ Scan cepat, 🗑 Hapus) dipindah ke sini; tap kartu TETAP
// buka Edit (data-action="openAssetModal" di wrapper div, tidak berubah). Detail meta yang
// sebelumnya digabung di tx-meta (label/extraLabel, akun tertaut, kepemilikan, dana
// titipan, %untung) ditampilkan di #assetActionsMeta — bukan dihapus, cuma dipindah biar
// baris chip di kartu tetap ringkas (jenis + lokasi saja).
openActionsMenu(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)return;
document.getElementById('assetActionsTitle').textContent=`${Aset.ICON[a.jenis]||'📦'} ${a.name}`;
const linkedAcc=a.accountId?D.accounts.find(x=>sameId(x.id,a.accountId)):null;
// Sesi 434 (audit "nominal akun tertaut selalu 0") tadinya nampilin porsi Milik
// Sendiri di sini karena akun tertaut memang cuma disinkron ke porsi SELF saja
// (lihat versi lama komentar ini) -- SESI 449 (BUG-OWN-002 lanjutan) akun tertaut
// sekarang disinkron ke NILAI PENUH instrumen (lihat "linkedAccNilai" di
// Aset.save()/saveOwners()), jadi saldo yang ditampilkan di sini otomatis sama
// dgn a.nilai, tidak lagi butuh catatan "porsi Milik Sendiri" -- dobel-hitung ke
// Kekayaan Bersih tetap dicegah oleh totalSaldoAkun() (linkedAssetAccountIds()),
// independen dari saldo tampilan ini.
const linkMeta=linkedAcc?('🔗 Akun tertaut: '+escapeHtml(linkedAcc.name)+' (saldo '+fmt(recalcAccBalance(linkedAcc.id))+')'):(a.accountId?'🔗 Akun tertaut: (akun terhapus)':'');
// linkMultiOwnerWarn -- SESI 454 (lanjutan diskusi BUG-OWN-002/S449): akun tertaut SELALU
// disinkron ke NILAI PENUH instrumen (bukan porsi tertentu), tapi ini bisa bikin user
// multi-pemilik salah kira akun tertaut = porsi mereka saja. 0 perubahan ke logic
// saldo/utang (lihat linkedAccNilai di Aset.save()/saveOwners()) -- murni badge
// informational, reuse MultiOwnerEngine.getOwners() (sama pola _renderTitipanSummary()).
// Porsi non-SELF tetap tercatat otomatis sbg Utang Titipan lewat _syncOwnerDebts().
const isMultiOwner=(typeof MultiOwnerEngine!=='undefined')&&(()=>{const res=MultiOwnerEngine.getOwners(a);return!!(res&&res.ok&&res.isMultiOwner);})();
const linkMultiOwnerWarn=(linkedAcc&&isMultiOwner)?'⚠️ Akun tertaut merepresentasikan 100% nilai aset (bukan cuma porsi Anda) — porsi pemilik lain tercatat sbg Utang Titipan':'';
const ownResolved=(typeof OwnershipEngine!=='undefined')?OwnershipEngine.resolve(a):null;
const ownMeta=ownResolved?('👤 Kepemilikan: '+escapeHtml(OwnershipEngine.label(ownResolved.type))):'';
const titipanLabel=a.titipanOwnerType==='keluarga'?'Keluarga':(a.titipanOwnerType==='lainnya'?'Pihak Lain':'Investor');
const titipanMeta=a.titipanAmount>0?('💰 Titipan '+escapeHtml(titipanLabel)+': '+fmt(a.titipanAmount)):'';
const extraMeta=Aset.extraLabel(a)?escapeHtml(Aset.extraLabel(a)):'';
const pctMeta=(a.keuntunganPct!=null&&isFinite(a.keuntunganPct))?(`${a.keuntunganPct>=0?'▲':'▼'} ${a.keuntunganPct>=0?'+':''}${a.keuntunganPct.toFixed(2)}%`):'';
// investmentBridgeMeta -- SESI B3: baris "🔗 Terhubung ke Investasi" + porsi read-only,
// lihat Aset._investmentBridgeMeta() di atas (pola persis vehAssetBridgeHtml() S507).
// null (aset tidak tertaut/tautan orphan) -> baris disembunyikan sepenuhnya via filter(Boolean).
const investmentBridgeMeta=Aset._investmentBridgeMeta(a);
const metaRows=[extraMeta,linkMeta,linkMultiOwnerWarn,ownMeta,titipanMeta,investmentBridgeMeta,pctMeta].filter(Boolean);
// Div meta TETAP ada di HTML (bukan dibuat/dihapus dinamis) supaya elemennya selalu bisa
// diambil lewat getElementById; kalau kebetulan kosong (mis. OwnershipEngine belum kemuat),
// disembunyikan lewat display:none — bukan cuma innerHTML='' — supaya padding bawaannya
// (lihat markup di app_production.html/index.html) TIDAK nyisain celah kosong di atas
// daftar aksi.
const metaEl=document.getElementById('assetActionsMeta');
metaEl.innerHTML=metaRows.join('<br>');
metaEl.style.display=metaRows.length?'':'none';
const histRow=linkedAcc?`<div class="bill-action-row" data-action="assetActionHistory" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon u-cacc3">📜</span> Riwayat Transaksi</div>`:'';
// investRow -- SESI B3: tombol navigasi "🔍 Lihat di Investasi", HANYA tampil kalau aset
// ini tertaut ke Holding Investasi yang masih ada (Aset._resolveLinkedInvestment(a)).
// Reuse murni InvestmentListUI.openModal(id) (SUDAH ADA sejak Fase 1 investasi-list-view.js)
// lewat dispatcher data-action/data-args generik -- pola sama persis vehAssetViewActionHtml()
// (S509b, "🔍 Lihat di Buku Aset") & assetActionViewVehicle (_renderVehicleLinkAction, S509c).
const linkedHoldingForView=Aset._resolveLinkedInvestment(a);
const investRow=linkedHoldingForView?`<div class="bill-action-row" data-action="InvestmentListUI.openModal" data-args="${escapeHtml(JSON.stringify([linkedHoldingForView.id]))}"><span class="bar-icon u-cacc3">🔍</span> Lihat di Investasi</div>`:'';
document.getElementById('assetActionsList').innerHTML=`${histRow}${investRow}
    <div class="bill-action-row" data-action="assetActionScan" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon u-cacc">⚡</span> Update Cepat via Scan</div>
    <div class="bill-action-row danger" data-action="assetActionDelete" data-args="${escapeHtml(JSON.stringify([id]))}"><span class="bar-icon">🗑</span> Hapus</div>`;
openQS('qsAssetActions');
},
// totalValue() — Sesi 193 (Ownership Sync): TAMBAH 1 filter isAssetOwnershipSelf(a)
// (0 logic lama diubah, cuma nambah 1 syarat filter sebelum reduce). Aset
// ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan dari Total
// Aset (dipakai jg oleh Kekayaan.currentNetWorth() & AssetPortfolioAPI —
// keduanya ikut ter-fix otomatis lewat titik ini, 0 perubahan tambahan di
// modul lain), tapi TETAP muncul apa adanya di Aset.renderList() (Buku Aset).
// Sesi 422d (fix #3, lanjutan revert S396 di s422c): filter isAssetOwnershipSelf
// di atas cuma cek field `ownership` (legacy, single value) -- TIDAK tahu soal
// aset MULTI-OWNER (`a.owners[]`, MultiOwnerEngine) yang porsinya kepisah per
// baris. Sebelum sesi ini, aset lolos filter (ownership efektifnya SELF) selalu
// disumbang PENUH `a.nilai`, walau ternyata porsi SELF-nya cuma sebagian (mis.
// 60%) -- overstate Kekayaan Bersih. Fix: reuse PERSIS
// MultiOwnerEngine.selfOwnedValue(a,a.nilai) (S393, pola sama Zakat Maal di
// pajak-pbb-zakat.js) per aset, bukan `a.nilai` mentah. Aset single-owner
// (mayoritas/legacy) TIDAK berubah -- selfOwnedValue() balik nilai penuh kalau
// selfPorsi 100%, 0 regresi.
// s476a (docs/s476-PLAN-migrate-investasi-to-holdings.md): TAMBAH filter
// `!a._migratedToInvestmentId` -- aset yang sudah dimigrasi ke Holding
// (D.investments) dikecualikan dari total di SINI (masih ADA di D.assets,
// cuma tidak ikut dijumlah lagi -- nilainya sekarang "milik" sisi Investasi).
// SENGAJA TIDAK menambahkan Investment.*TotalValue() langsung di titik ini --
// `Aset.totalValue()` dipakai juga oleh AssetPortfolioAPI (asset-portfolio-
// api.js) sbg `assetValue` yang DIJUMLAH TERPISAH dgn `investmentValue`
// (Investment.portfolioSummary().totalValue) di portfolioComposition(); kalau
// holding ikut ditambahkan di sini juga, jadi DOBEL-HITUNG di kartu Portfolio
// itu. Penjumlahan Net Worth (Kekayaan.currentNetWorth()/renderBersih(), lihat
// Blocker A rencana sesi) dilakukan 1 titik terpisah di modules-calc.js lewat
// `Investment.selfOwnedTotalValue()` (versi TERSKALA porsi SELF, beda dari
// portfolioSummary().totalValue yg dipakai AssetPortfolioAPI -- lihat catatan
// di investasi.js).
// PERUBAHAN SESI B8 (fix, follow-up B7 audit "dihitung 2x" -- Opsi A dari 3
// opsi trade-off yg dipresentasikan): TAMBAH filter `!a.investmentId` --
// SAMA PERSIS pola `!a._migratedToInvestmentId` di atas, cuma sumbernya beda
// (link manual B1 lewat dropdown "🔗 Hubungkan ke Holding Investasi", BUKAN
// migrasi penuh s476a). Begitu aset ditautkan ke Holding yg MASIH ADA
// (Aset._resolveLinkedInvestment(a) balikin non-null), nilainya SEKARANG
// dianggap "milik" sisi Investasi (Investment.selfOwnedTotalValue()) --
// PERSIS filosofi _migratedToInvestmentId, aset TIDAK hilang dari Buku Aset/
// UI (beda dari migrasi), cuma tidak ikut dijumlah lagi DI SINI. Kalau
// holding-nya sudah dihapus (orphan, dicek B6) atau belum ditautkan sama
// sekali, `a.investmentId` tetap ada di data tapi resolve gagal -- SENGAJA
// TIDAK pakai _resolveLinkedInvestment() di sini (nambah dependency lookup
// per-aset ke overhead reduce()), cukup cek keberadaan field `a.investmentId`
// -- SAMA sikap dgn B6 (baca field, bukan validasi orphan di titik hitung).
// Efek: aset orphan (holding dihapus tapi field investmentId belum dilepas)
// nilainya HILANG sementara dari Kekayaan Bersih sampai user lepas
// tautannya di modal Aset -- SAMA PERSIS pola _migratedToInvestmentId (aset
// termigrasi yg holding-nya dihapus juga tidak otomatis balik ke Buku Aset).
// Dipakai juga oleh AssetPortfolioAPI (portfolioComposition()) -- filter ini
// SEKALIGUS menghilangkan dobel-hitung yg sama di kartu Portfolio (assetValue
// vs investmentValue), bukan cuma Kekayaan Bersih.
totalValue(){return(D.assets||[]).filter(isAssetOwnershipSelf).filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId).reduce((s,a)=>s+(typeof MultiOwnerEngine!=='undefined'?MultiOwnerEngine.selfOwnedValue(a,a.nilai||0):(a.nilai||0)),0);},
// FITUR BARU: Dashboard Aset — ringkasan Total Aset / Nilai Buku / Nilai Pasar +
// breakdown per kategori (jenis). Nilai Pasar = total a.nilai (estimasi nilai saat
// ini, sesuai yang diisi user di modal Aset). Nilai Buku = total modal/harga
// perolehan (modalInvestasi kalau diisi, atau hargaBeli×jumlahUnit kalau itu yang
// diisi; kalau dua-duanya kosong, dianggap sama dgn Nilai Pasar krn tidak ada data
// modal -- supaya tidak salah tampil "untung/rugi" padahal cuma belum diisi).
// Dipanggil otomatis tiap kali Aset.renderList() jalan (save/delete/import/scan
// semua sudah lewat situ), jadi selalu sinkron tanpa perlu titik panggil baru.
renderDashboard(){
const box=document.getElementById('assetDashboard');
if(!box)return;
// Sesi 193 (Ownership Sync): filter isAssetOwnershipSelf() -- Dashboard Aset
// (ringkasan Total Aset/Nilai Buku/Nilai Pasar/breakdown kategori) HANYA
// menghitung aset ber-ownership SELF, sesuai spesifikasi (dikecualikan dari
// "Dashboard"). Aset non-SELF tetap ada apa adanya di Aset.renderList().
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
box.classList.remove('u-dnone');
if(!list.length){
const t=document.getElementById('assetDashTotal');if(t)t.textContent=fmtFull(0);
const b=document.getElementById('assetDashBuku');if(b)b.textContent=fmtFull(0);
const p=document.getElementById('assetDashPasar');if(p)p.textContent=fmtFull(0);
const s=document.getElementById('assetDashSelisih');if(s)s.textContent='';
const k=document.getElementById('assetDashKategori');if(k)k.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset tercatat — tambah aset pertama lewat 📋 Buku Aset di bawah untuk melihat ringkasan di sini.</div>';
const d=document.getElementById('assetDashDiversifikasi');if(d)d.innerHTML='';
return;
}
let totalPasar=0,totalBuku=0;
const perKategori={};
list.forEach(a=>{
const pasar=a.nilai||0;
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:pasar);
totalPasar+=pasar;totalBuku+=buku;
const jenis=a.jenis||'Lainnya';
if(!perKategori[jenis])perKategori[jenis]={count:0,nilai:0};
perKategori[jenis].count++;
perKategori[jenis].nilai+=pasar;
});
const selisih=totalPasar-totalBuku;
const selisihPct=totalBuku?(selisih/totalBuku*100):0;
const selisihCls=selisih>=0?'green':'red';
document.getElementById('assetDashTotal').textContent=fmtFull(totalPasar);
document.getElementById('assetDashBuku').textContent=fmtFull(totalBuku);
document.getElementById('assetDashPasar').textContent=fmtFull(totalPasar);
const selEl=document.getElementById('assetDashSelisih');
if(selEl)selEl.innerHTML=`Selisih Buku → Pasar: <b class="${selisihCls}">${fmtFullSigned(selisih)} (${selisih>=0?'+':''}${selisihPct.toFixed(2)}%)</b>`;
const barColors=['var(--accent)','var(--accent2)','var(--accent3)','var(--accent4)'];
// Komposisi Aset + Persentase Kategori: urut dari nilai (Rp) terbesar ke terkecil,
// tiap baris tampilkan ikon/jenis/jumlah unit, nominal, bar proporsional, & %
// terhadap totalPasar (bukan totalBuku, krn ini komposisi kekayaan SEKARANG).
const kategoriRows=Object.entries(perKategori).sort((a,b)=>b[1].nilai-a[1].nilai);
const katBox=document.getElementById('assetDashKategori');
if(katBox){
katBox.innerHTML=kategoriRows.map(([jenis,v],i)=>{
const pct=totalPasar?(v.nilai/totalPasar*100):0;
const icon=Aset.ICON[jenis]||'📦';
const iconHtml=(typeof FeatureIcons!=='undefined')?FeatureIcons.render(icon,{size:14}):icon;
return `<div class="u-mb10">
      <div class="u-flex u-jcb u-aifs u-gap8 u-fs13 u-mb4"><span class="fi-insight-row u-fw600 u-flex1"><span class="fi-insight-icon">${iconHtml}</span><span>${escapeHtml(jenis)} <span class="u-fs11 u-t2">(${v.count})</span></span></span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmt(v.nilai)}</span></div>
      <div class="budget-bar-track"><div class="budget-bar-fill" style="width:${pct}%;background:${barColors[i%barColors.length]}"></div></div>
      <div class="budget-bar-label"><span>${pct.toFixed(1)}% dari total</span></div>
    </div>`;
}).join('');
}
// FITUR BARU: Ringkasan Diversifikasi — simpulkan sebaran aset per kategori jadi
// 1 kalimat + label status, berdasarkan (a) jumlah kategori yang dipegang & (b)
// konsentrasi kategori terbesar (% dari totalPasar). Ambang batas dipilih supaya
// selaras dgn heuristik umum "jangan taruh semua telur di 1 keranjang":
//  - 1 kategori doang -> jelas belum terdiversifikasi sama sekali.
//  - kategori terbesar >=70% -> risiko konsentrasi tinggi meski kategori lain ada.
//  - kategori terbesar >=50% -> lumayan terkonsentrasi, masih perlu diwaspadai.
//  - selain itu (kategori terbesar <50%, jenis kategori >=3) -> dianggap sudah
//    tersebar cukup baik.
const divBox=document.getElementById('assetDashDiversifikasi');
if(divBox){
const jumlahKategori=kategoriRows.length;
if(!jumlahKategori){
divBox.innerHTML='';
} else {
const [topJenis,topV]=kategoriRows[0];
const topPct=totalPasar?(topV.nilai/totalPasar*100):0;
let label,cls,saran;
if(jumlahKategori===1){
label='⚠️ Belum Terdiversifikasi';cls='red';
saran=`Semua aset (100%) masih ada di 1 kategori: <b>${escapeHtml(topJenis)}</b>. Pertimbangkan sebar ke kategori lain (mis. emas, reksadana, atau kas darurat) biar gak terlalu bergantung ke 1 jenis aset.`;
} else if(topPct>=70){
label='⚠️ Konsentrasi Tinggi';cls='red';
saran=`${jumlahKategori} kategori sudah dipegang, tapi <b>${escapeHtml(topJenis)}</b> mendominasi ${topPct.toFixed(1)}% dari total. Risiko konsentrasi masih tinggi kalau nilai kategori itu turun.`;
} else if(topPct>=50){
label='🟡 Cukup Terkonsentrasi';cls='orange';
saran=`${jumlahKategori} kategori tersebar, dgn <b>${escapeHtml(topJenis)}</b> sbg porsi terbesar (${topPct.toFixed(1)}%). Lumayan seimbang, tapi masih ada baiknya dipantau supaya gak makin dominan.`;
} else {
label='✅ Terdiversifikasi Baik';cls='green';
saran=`Aset tersebar di ${jumlahKategori} kategori, tanpa satupun kategori yang mendominasi lebih dari separuh total (terbesar: ${escapeHtml(topJenis)}, ${topPct.toFixed(1)}%).`;
}
divBox.innerHTML=`<div class="u-r10 u-mt10" style="background:var(--accent-soft);padding:8px 10px">
      <div class="u-fs12 u-fw700 ${cls}">${label}</div>
      <div class="u-fs11 u-t2 u-mt4 u-lh15">${saran}</div>
    </div>`;
}
}
},
// FITUR BARU: Ringkasan Performa Investasi — ROI, Capital Gain/Loss, Yield (CAGR
// tahunan), & ringkasan performa portofolio. HANYA mencakup aset yang punya data
// modal (modalInvestasi ATAU hargaBeli×jumlahUnit terisi & >0) -- ini yg disebut
// "dilacak sebagai investasi" di sini, TERLEPAS dari jenis-nya (Tanah/Rumah pun
// ikut kalau memang diisi modalnya), krn definisi "investasi" yg dipakai murni
// berbasis ada/tidaknya data modal utk hitung untung-rugi, bukan kategori. Aset
// tanpa data modal (nilai=modal by default) SENGAJA dikecualikan supaya ROI/Yield
// portofolio gak keisi data semu (untung/rugi 0% terus krn memang belum diisi).
// - ROI: total return keseluruhan portofolio sejak modal awal ((Nilai-Modal)/Modal).
// - Capital Gain/Loss: nominal Rp selisih Nilai vs Modal (bisa +/-).
// - Yield: rata2 tertimbang (bobot=modal) dari CAGR per-aset ((Nilai/Modal)^(365/hari)-1),
//   HANYA aset yg py `tanggal` & sudah lewat >=1 hari -- dipakai buat estimasi
//   "setara berapa %/tahun", beda dari ROI yg cuma total return mentah tanpa
//   memperhitungkan lama waktu investasi.
// Referensi "hari ini" pakai todayStr() (bukan `new Date()` langsung) supaya
// determinstik & gampang di-test (sama seperti dipakai di openModal()).
// Dipanggil otomatis lewat renderList() spy selalu sinkron tiap save/delete/import.
//
// investmentPerformance() — DIPISAH dari renderInvestasi() (Sesi 161, gap
// fix Investment Planner) supaya bisa dipakai ulang oleh
// InvestmentPlannerAPI (modules/finance/investment-planner-api.js) TANPA
// duplikasi formula — pola SAMA PERSIS AssetInsight.compute() vs
// AssetInsight.render() di atas (ekstraksi murni, 0 rumus baru, 0 behavior
// berubah). Filter "tracked" (modalInvestasi ATAU hargaBeli×jumlahUnit
// terisi & >0) TETAP SAMA seperti sebelumnya. Read-only, tidak menyentuh
// DOM sama sekali — caller (renderInvestasi() di bawah, atau
// InvestmentPlannerAPI) yang urus presentasinya masing-masing.
// S261 (Investment Ownership Sync): TAMBAH 1 filter isAssetOwnershipSelf(a)
// di awal (0 rumus baru) — SEBELUM sesi ini, fungsi ini membaca D.assets
// MENTAH tanpa filter ownership, beda dari Aset.totalValue()/AssetInsight
// yang sudah SELF-only sejak S193. Akibatnya aset ber-ownership
// INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY ikut nyasar ke totalModal/
// totalNilai/gain/roiPct/best/worst di sini, DAN ke portfolioOverview()/
// assetAllocation()/investmentRecommendation() InvestmentPlannerAPI
// (modules/finance/investment-planner-api.js) yang 100% reuse fungsi ini.
// Pola filter SAMA PERSIS isAssetOwnershipSelf() yang sudah dipakai
// totalValue()/AssetInsight.compute() di file ini.
investmentPerformance(){
const tracked=(D.assets||[]).filter(isAssetOwnershipSelf).map(a=>{
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:null);
return{a,buku};
}).filter(x=>x.buku!=null&&x.buku>0);
if(!tracked.length){
return{holdingsCount:0,totalModal:0,totalNilai:0,gain:0,roiPct:0,yieldPct:null,best:null,worst:null,tracked:[]};
}
let totalModal=0,totalNilai=0,cagrSum=0,cagrWeight=0,best=null,worst=null;
const todayMs=new Date(todayStr()).getTime();
tracked.forEach(({a,buku})=>{
const nilai=a.nilai||0;
totalModal+=buku;totalNilai+=nilai;
const pct=(nilai-buku)/buku*100;
if(!best||pct>best.pct)best={name:a.name,pct};
if(!worst||pct<worst.pct)worst={name:a.name,pct};
if(a.tanggal){
const days=(todayMs-new Date(a.tanggal).getTime())/86400000;
if(days>=1){
const years=days/365;
const cagr=(Math.pow(nilai/buku,1/years)-1)*100;
if(isFinite(cagr)){cagrSum+=cagr*buku;cagrWeight+=buku;}
}
}
});
const gain=totalNilai-totalModal;
const roiPct=totalModal?(gain/totalModal*100):0;
const yieldPct=cagrWeight?(cagrSum/cagrWeight):null;
return{holdingsCount:tracked.length,totalModal,totalNilai,gain,roiPct,yieldPct,best,worst,tracked};
},
renderInvestasi(){
const box=document.getElementById('assetInvestasiDashboard');
if(!box)return;
const perf=Aset.investmentPerformance();
box.classList.remove('u-dnone');
if(!perf.holdingsCount){
const r=document.getElementById('assetInvestasiROI');if(r)r.textContent='—';
const y=document.getElementById('assetInvestasiYield');if(y)y.textContent='—';
const g=document.getElementById('assetInvestasiGain');if(g)g.innerHTML='';
const rk=document.getElementById('assetInvestasiRingkasan');if(rk)rk.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset dengan data modal (Modal Investasi, atau Harga Beli × Jumlah Unit) — isi salah satunya di 📋 Buku Aset supaya ROI/Yield bisa dihitung.</div>';
return;
}
const{totalModal,totalNilai,gain,roiPct,yieldPct,best,worst,tracked}=perf;
const gainCls=gain>=0?'green':'red';
const roiEl=document.getElementById('assetInvestasiROI');
if(roiEl)roiEl.innerHTML=`<b class="${gainCls}">${roiPct>=0?'+':''}${roiPct.toFixed(2)}%</b>`;
const gainEl=document.getElementById('assetInvestasiGain');
if(gainEl)gainEl.innerHTML=`<b class="${gainCls}">${fmtFullSigned(gain)} (${roiPct>=0?'+':''}${roiPct.toFixed(2)}%)</b>`;
const yieldEl=document.getElementById('assetInvestasiYield');
if(yieldEl){
yieldEl.innerHTML=(yieldPct==null)?'<span class="u-t2">Belum bisa dihitung (tanggal aset belum diisi / kurang dari 1 hari)</span>':
`<b class="${yieldPct>=0?'green':'red'}">${yieldPct>=0?'+':''}${yieldPct.toFixed(2)}%/tahun</b>`;
}
const ringkasanEl=document.getElementById('assetInvestasiRingkasan');
if(ringkasanEl){
let txt=`Dari <b>${tracked.length}</b> aset yang dilacak sbg investasi (ada data modal), total modal ${fmtFull(totalModal)} kini bernilai ${fmtFull(totalNilai)} — ${gain>=0?'untung':'rugi'} <b class="${gainCls}">${fmtFullSigned(gain)} (${roiPct>=0?'+':''}${roiPct.toFixed(2)}%)</b>`;
if(yieldPct!=null)txt+=`, setara ~${yieldPct>=0?'+':''}${yieldPct.toFixed(2)}%/tahun (CAGR)`;
txt+='.';
if(tracked.length>1&&best&&worst&&best.name!==worst.name){
txt+=` Kinerja terbaik: <b>${escapeHtml(best.name)}</b> (${best.pct>=0?'+':''}${best.pct.toFixed(2)}%), terendah: <b>${escapeHtml(worst.name)}</b> (${worst.pct>=0?'+':''}${worst.pct.toFixed(2)}%).`;
}
ringkasanEl.innerHTML=txt;
}
},
// Riwayat Transaksi -- khusus aset yang sudah ditautkan/punya Akun Transaksi (a.accountId).
// Pakai ulang filterTxModal (sama seperti Riwayat di tab Keuangan/Laporan) lewat scope
// baru 'account' di showFilteredTx() (lihat filter-laporan.js) supaya tidak duplikasi UI.
openTxHistory(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a){toast('⚠️ Aset tidak ditemukan');return;}
if(!a.accountId){toast('⚠️ Aset ini belum ditautkan ke Akun Transaksi');return;}
const acc=D.accounts.find(x=>sameId(x.id,a.accountId));
if(!acc){toast('⚠️ Akun Transaksi aset ini sudah terhapus');return;}
if(typeof showFilteredTx!=='function'){toast('⚠️ Fitur riwayat transaksi belum tersedia');return;}
showFilteredTx('account',undefined,'📜 Riwayat: '+acc.name,acc.id);
},
// AsetXLSX (bagian ke-10) — export/import data Buku Aset pakai format .xlsx, GANTI dari
// JSON/CSV sebelumnya (exportJSON/exportCSV/importJSON lama dihapus). Pola sama dgn
// ShopExport/ImportShopExcel di cobek.js: pustaka SheetJS di-lazy-load lewat ensureXLSX()
// (didefinisikan di index.html/app_production.html, sama seperti ensureJsPDF/ensureTesseract).
// Data export SELALU diambil live dari D.assets (bukan cache) biar sinkron pas tombol ditekan.
async _ensureXLSXLib(){
if(typeof XLSX!=='undefined')return true;
try{ await ensureXLSX(); }catch(e){ toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet'); return false; }
if(typeof XLSX==='undefined'){ toast('⚠️ Pustaka Excel tidak tersedia'); return false; }
return true;
},
async exportXLSX(){
const list=D.assets||[];
if(!list.length){toast('⚠️ Belum ada aset untuk di-export');return;}
if(!await Aset._ensureXLSXLib())return;
const rows=[['Nama','Jenis','Lokasi','Nilai','Modal Investasi','Harga Beli/Unit','Jumlah Unit','Tanggal','Zakatable','Akun Tertaut']];
list.forEach(a=>{
const accName=a.accountId?((D.accounts.find(x=>sameId(x.id,a.accountId))||{}).name||''):'';
rows.push([a.name,a.jenis,a.lokasi||'',a.nilai,a.modalInvestasi!=null?a.modalInvestasi:'',a.hargaBeli!=null?a.hargaBeli:'',a.jumlahUnit!=null?a.jumlahUnit:'',a.tanggal||'',a.zakatable?'Ya':'Tidak',accName]);
});
const wb=XLSX.utils.book_new();
const ws=XLSX.utils.aoa_to_sheet(rows);
XLSX.utils.book_append_sheet(wb,ws,'Buku Aset');
XLSX.writeFile(wb,'aset-W-'+new Date().toISOString().split('T')[0]+'.xlsx');
toast('✅ '+list.length+' aset di-export');
},
// BUGFIX-PROTECTIVE: accountId dari file yang di-import SENGAJA tidak dipakai
// (selalu di-null-kan) -- id akun beda antar perangkat/backup, kalau ikut
// dipakai apa adanya bisa nyambung ke akun yang SALAH (kebetulan id-nya sama
// tapi akun berbeda) tanpa ada peringatan apapun ke user. Lebih aman minta
// user tautkan ulang manual lewat modal Edit Aset kalau memang perlu.
async importXLSX(e){
const file=e.target.files[0];if(!file)return;
if(!await Aset._ensureXLSXLib()){e.target.value='';return;}
let rows;
try{
const buf=await file.arrayBuffer();
const wb=XLSX.read(buf,{type:'array'});
const ws=wb.Sheets[wb.SheetNames[0]];
rows=XLSX.utils.sheet_to_json(ws,{defval:''});
}catch{
toast('❌ File tidak valid / rusak (bukan Excel)!');
e.target.value='';
return;
}
const arr=rows.map(r=>({
name:String(r['Nama']||'').trim(),
jenis:String(r['Jenis']||'').trim(),
lokasi:String(r['Lokasi']||'').trim(),
nilai:r['Nilai'],
modalInvestasi:r['Modal Investasi'],
hargaBeli:r['Harga Beli/Unit'],
jumlahUnit:r['Jumlah Unit'],
tanggal:String(r['Tanggal']||'').trim(),
zakatable:String(r['Zakatable']||'').trim().toLowerCase()==='ya'
}));
const valid=arr.filter(a=>a.name&&a.nilai!==''&&a.nilai!=null&&!isNaN(Number(a.nilai)));
const skipped=arr.length-valid.length;
if(!valid.length){
toast('⚠️ Tidak ada aset valid ditemukan di file ini');
e.target.value='';
return;
}
let msg='Ditemukan '+valid.length+' aset valid'+(skipped?' ('+skipped+' baris dilewati krn nama/nilai tidak lengkap)':'')+'. Aset ini akan DITAMBAHKAN ke Buku Aset yang sudah ada (bukan menimpa). Import sekarang?';
const confirmed=await askConfirm(msg,{danger:false,okText:'Ya, Import',icon:'📥'});
if(!confirmed){e.target.value='';return;}
D.assets=D.assets||[];
valid.forEach(a=>{
const nilai=Number(a.nilai)||0;
const modalInvestasi=a.modalInvestasi!=null&&a.modalInvestasi!==''?Number(a.modalInvestasi):null;
D.assets.push({
id:uid(),
name:String(a.name).trim(),
jenis:Aset.ICON[a.jenis]?a.jenis:'Lainnya',
lokasi:a.lokasi||'',
nilai,
tanggal:a.tanggal||todayStr(),
zakatable:!!a.zakatable,
accountId:null,
modalInvestasi,
hargaBeli:a.hargaBeli!=null&&a.hargaBeli!==''?Number(a.hargaBeli):null,
jumlahUnit:a.jumlahUnit!=null&&a.jumlahUnit!==''?Number(a.jumlahUnit):null,
keuntungan:modalInvestasi?(nilai-modalInvestasi):null,
keuntunganPct:modalInvestasi?((nilai-modalInvestasi)/modalInvestasi*100):null
});
});
save();
Aset.renderList();renderKekayaanBersih();hitungZakatMaal();renderAccGrid();renderDashAccList();renderLapAccList();
toast('✅ '+valid.length+' aset berhasil di-import'+(skipped?' ('+skipped+' dilewati)':''));
e.target.value='';
}
};
// Gabungkan balik metode fitur multi-owner/porsi kepemilikan yang dipecah
// ke modules/asset/aset-owners.js (audit ukuran file) — hasilnya tetap 1
// object Aset yang sama persis seperti sebelum dipecah.
Object.assign(Aset, AssetOwnersMixin);
// Ekspos ke window — WAJIB supaya delegasi klik global (data-action, di
// features-helpers-global-security.js) bisa menemukan modul ini lewat
// window['Aset'][method]. `const Aset = {...}` di atas HANYA membuat
// binding lexical-scope (bukan properti window), pola fix sama persis
// window.FuelModal di modules/vehicle/fuel-modal.js / window.BBM,Servis,Torsi
// di car-notes.js (Sesi 345) — bug yang sama pernah terjadi & diperbaiki di
// sana. Tanpa baris ini, semua tombol data-action="Aset.xxx" gagal diam-diam.
if (typeof Aset !== 'undefined') window.Aset = Aset;
// assetTableRowHTML/assetTableHTML — S639 (RENCANA-MODERNISASI-UI.md,
// lanjutan pola s637 tabel Ledger Pro Uang & s638 class .money Dana
// Titipan). Jalur render BARU, ADDITIF -- kartu `.tx-item` di
// Aset.renderList() 0 disentuh, tetap dipakai apa adanya utk 10 tema lama.
// Dipanggil dari Aset.renderList() HANYA saat D.profile.theme==='modern',
// menggantikan list.map(...) kartu utk container #assetList. Reuse PENUH
// class `.tx-tbl*` yang sudah ada sejak s637 (0 CSS baru) -- kolom
// disesuaikan konten Aset (Aset | Nilai | aksi), TANPA kolom saldo berjalan
// (konsep itu spesifik transaksi kronologis, tidak berlaku utk daftar aset
// yang bukan arus kas). Sel Nilai reuse class `.tx-amount` (sudah ada) yang
// otomatis kebagian tabular-nums/font-mono lewat aturan [data-theme="modern"]
// s635 -- 0 aturan font baru. Chip jenis/lokasi & badge Zakat/warning
// cross-check REUSE PERSIS logic yang sama dgn kartu (bukan rumus baru).
// assetOwnerCellHtml(a) — S644 (RENCANA-MODERNISASI-UI.md, lanjutan s639):
// kolom "Pemilik" tabel Aset tema modern (mockup Ledger Pro: "W · 70%",
// "Sen", "Bersama"). REUSE MultiOwnerEngine.getOwners() 100% apa adanya
// (0 rumus kepemilikan baru, 0 field baru ditulis ke D.assets) -- murni
// format ringkas 1 owner/porsi jadi teks pendek utk 1 sel tabel:
// - MultiOwnerEngine belum dimuat / getOwners() gagal -> '—'
// - 1 pemilik & isSelf (default utk aset tanpa data owners eksplisit,
//   lihat getOwners() poin 4) -> 'Saya'
// - 1 pemilik non-self -> nama disingkat (inisial tiap kata, maks 3
//   huruf) + porsi% HANYA kalau porsi<100 (porsi 100% sudah jelas dari
//   sekadar nama, tidak perlu diulang)
// - >1 pemilik dgn 1 yang dominan (porsi>=60) -> nama dominan (sama
//   aturan singkat) + porsi%, konsisten kartu Dana Titipan yang juga
//   pakai ambang 60% utk keputusan tampilan serupa
// - >1 pemilik, tidak ada yang dominan -> 'Bersama'
function assetOwnerCellHtml(a){
if(typeof MultiOwnerEngine==='undefined')return '—';
const res=MultiOwnerEngine.getOwners(a);
if(!res||!res.ok||!res.owners||!res.owners.length)return '—';
const owners=res.owners;
const shortName=(n)=>{
const words=String(n||'').trim().split(/\s+/).filter(Boolean);
if(!words.length)return '?';
if(words.length===1)return words[0].slice(0,3);
return words.map((w)=>w[0]).join('').slice(0,3).toUpperCase();
};
if(owners.length===1){
const o=owners[0];
if(o.isSelf)return 'Saya';
return escapeHtml(shortName(o.ownerName))+(o.porsi<100?` · ${Math.round(o.porsi)}%`:'');
}
const dominant=owners.reduce((max,o)=>((o.porsi||0)>(max?max.porsi:0)?o:max),null);
if(dominant&&dominant.porsi>=60)return escapeHtml(shortName(dominant.ownerName))+` · ${Math.round(dominant.porsi)}%`;
return 'Bersama';
}
function assetTableRowHTML(a){
const jenisChip=`<span class="acc-chip">${escapeHtml(a.jenis)}</span>`;
const lokasiChip=a.lokasi?` <span class="acc-chip">📍 ${escapeHtml(a.lokasi)}</span>`:'';
const assetWarn=(typeof assetCrossCheckWarning==='function')?assetCrossCheckWarning(a):null;
const assetWarnChip=assetWarn?` <span class="u-fs10 u-r6 u-ml4" style="border:1px solid var(--accent4);color:var(--accent4);padding:1px 5px" title="${escapeHtml(assetWarn)}">⚠️</span>`:'';
return`<tr class="tx-tbl-row u-pointer" data-action="openAssetModal" data-args="${escapeHtml(JSON.stringify([a.id]))}">
    <td class="tx-tbl-desc"><div class="tx-name">${Aset.ICON[a.jenis]||'📦'} ${escapeHtml(a.name)}${a.zakatable?' <span class="u-fs10 u-cacc3 u-r6 u-ml4" style="border:1px solid var(--accent3);padding:1px 5px">Zakat</span>':''}${assetWarnChip}</div><div class="tx-meta">${jenisChip}${lokasiChip}</div></td>
    <td class="num u-fs11 u-t2">${assetOwnerCellHtml(a)}</td>
    <td class="tx-amount num">${fmt(a.nilai)}</td>
    <td class="tx-tbl-del"><button class="tx-del" data-stop="1" data-action="Aset.openActionsMenu" data-args="${escapeHtml(JSON.stringify([a.id]))}" aria-label="Aksi lainnya">⋮</button></td>
  </tr>`;
}
function assetTableHTML(list){
return`<div class="tx-tbl-wrap"><table class="tx-tbl"><thead><tr><th>Aset</th><th class="num">Pemilik</th><th class="num">Nilai</th><th></th></tr></thead><tbody>${list.map(assetTableRowHTML).join('')}</tbody></table></div>`;
}
