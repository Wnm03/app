// aset-reports.js — Domain Aset & Kekayaan (LAPORAN): Penyusutan (estimasi nilai buku aset yg menurun: Garis Lurus/Saldo Menurun/Manual), PajakAset (estimasi PBB properti & Zakat Maal per aset zakatable), LaporanAset (Laporan Aset gabungan: Daftar Aset, Riwayat Transaksi, Nilai Aset, Penyusutan, Ringkasan Kekayaan).
// S589: dipecah dari modules/asset/aset.js (dulu 1 file 3175 baris) — lihat docs/AUDIT-SPLIT-ASET-JS.md & docs/FIX-s589-split-aset-js.md.
// WAJIB dimuat SETELAH aset.js (Penyusutan.renderList()/PajakAset.renderList() dipanggil dari Aset.renderList() — referensi call-time, bukan declare-time, tapi urutan manifest build.js tetap diikuti biar konsisten dgn dokumentasi & mudah ditelusuri).
// Isi & perilaku TIDAK berubah dari sebelum split — murni pindah lokasi fisik baris kode.

// ================= PENYUSUTAN ASET (bagian ke-11) =================
// FITUR BARU: Penyusutan (depreciation) — estimasi nilai buku aset yang nilainya
// MENURUN dari waktu ke waktu (kendaraan, bangunan, peralatan, dst), kebalikan
// dari "Ringkasan Performa Investasi" (renderInvestasi) di atas yang fokus ke
// aset yang nilainya naik/fluktuatif. 3 metode didukung, sesuai request:
//  - Garis Lurus (straight-line): beban penyusutan RATA tiap bulan sepanjang
//    umur manfaat, dari (Harga Perolehan − Nilai Residu) / Umur Manfaat, lalu
//    diprorata per bulan berjalan (bukan lompat 1x/tahun) supaya nilai buku
//    berubah halus. Nilai buku dibatasi tidak boleh turun di bawah Nilai Residu.
//  - Saldo Menurun (declining balance): tarif % diterapkan ke NILAI BUKU tahun
//    berjalan (bukan ke harga perolehan awal) tiap tahun PENUH yang sudah
//    lewat, sisa bulan di tahun berjalan diprorata linear dari tarif tahun itu.
//    Nominal penyusutan makin kecil tiap tahun (khas saldo menurun), floor di
//    Nilai Residu.
//  - Manual: TIDAK ada formula otomatis — nilai buku = field "Nilai" aset yang
//    sudah ada, di-update sendiri oleh user scr berkala lewat modal Edit Aset.
//    Fungsi manual() di sini cuma pass-through supaya API hitung() tetap
//    konsisten dipanggil dgn metode apapun tanpa percabangan di caller.
// "Harga Perolehan" dasar hitung diambil dari modalInvestasi (kalau diisi) atau
// hargaBeli×jumlahUnit — SAMA seperti dasar "Nilai Buku" di renderDashboard()/
// renderInvestasi(), supaya satu app konsisten definisi "harga perolehan"-nya.
// Kalau dua2nya kosong, Garis Lurus/Saldo Menurun tidak bisa dihitung (hitung()
// balikin hargaPerolehan:null, ditangani di renderList() dgn pesan minta diisi
// data modal dulu).
// Disimpan per-aset di a.penyusutan={aktif,metode,umurManfaatTahun,nilaiResidu,
// tarifPersen}. SENGAJA tidak dibatasi per jenis aset (siapa pun boleh
// diaktifkan) — sama filosofinya dgn modalInvestasi yg juga lintas-jenis (lihat
// catatan di renderInvestasi()), kartu UI cuma kasih hint aset apa yg lazim.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import,
// pola sama dgn renderDashboard()/renderInvestasi().
const Penyusutan={
METODE_LABELS:{garisLurus:'Garis Lurus',saldoMenurun:'Saldo Menurun',manual:'Manual'},
DEFAULTS:{metode:'garisLurus',umurManfaatTahun:4,nilaiResidu:0,tarifPersen:25},
// Harga Perolehan dasar hitung: sama dgn definisi "buku" di renderDashboard()/renderInvestasi().
hargaPerolehan(a){
if(!a)return null;
if(a.modalInvestasi!=null)return a.modalInvestasi;
if(a.hargaBeli!=null&&a.jumlahUnit!=null)return a.hargaBeli*a.jumlahUnit;
return null;
},
_monthsBetween(dariStr,keStr){
const dari=new Date(dariStr),ke=new Date(keStr);
if(isNaN(dari)||isNaN(ke))return 0;
let months=(ke.getFullYear()-dari.getFullYear())*12+(ke.getMonth()-dari.getMonth());
if(ke.getDate()<dari.getDate())months-=1;
return Math.max(0,months);
},
// Metode 1: Garis Lurus.
garisLurus(hargaPerolehan,nilaiResidu,umurManfaatTahun,tanggalPerolehan,tanggalHitung){
hargaPerolehan=Number(hargaPerolehan)||0;
nilaiResidu=Number(nilaiResidu)||0;
umurManfaatTahun=Number(umurManfaatTahun)||0;
if(hargaPerolehan<=0||umurManfaatTahun<=0||!tanggalPerolehan){
return{nilaiBuku:hargaPerolehan,akumulasi:0,bebanPerTahun:0,bebanPerBulan:0,bulanBerjalan:0,habisManfaat:false};
}
const nilaiDisusutkan=Math.max(0,hargaPerolehan-nilaiResidu);
const bebanPerTahun=nilaiDisusutkan/umurManfaatTahun;
const bebanPerBulan=bebanPerTahun/12;
const totalBulanManfaat=umurManfaatTahun*12;
const bulanBerjalanRaw=Penyusutan._monthsBetween(tanggalPerolehan,tanggalHitung||tanggalPerolehan);
const bulanEfektif=Math.max(0,Math.min(bulanBerjalanRaw,totalBulanManfaat));
const akumulasi=Math.min(nilaiDisusutkan,bebanPerBulan*bulanEfektif);
const nilaiBuku=Math.max(nilaiResidu,hargaPerolehan-akumulasi);
return{nilaiBuku,akumulasi,bebanPerTahun,bebanPerBulan,bulanBerjalan:bulanEfektif,habisManfaat:bulanBerjalanRaw>=totalBulanManfaat};
},
// Metode 2: Saldo Menurun.
saldoMenurun(hargaPerolehan,tarifPersen,nilaiResidu,tanggalPerolehan,tanggalHitung){
hargaPerolehan=Number(hargaPerolehan)||0;
tarifPersen=Number(tarifPersen)||0;
nilaiResidu=Number(nilaiResidu)||0;
if(hargaPerolehan<=0||tarifPersen<=0||!tanggalPerolehan){
return{nilaiBuku:hargaPerolehan,akumulasi:0,tahunBerjalan:0};
}
const bulanBerjalan=Penyusutan._monthsBetween(tanggalPerolehan,tanggalHitung||tanggalPerolehan);
const tahunPenuh=Math.floor(bulanBerjalan/12);
const sisaBulan=bulanBerjalan%12;
const tarif=Math.min(1,tarifPersen/100);
let nilaiBuku=hargaPerolehan;
for(let i=0;i<tahunPenuh&&nilaiBuku>nilaiResidu;i++){
nilaiBuku=Math.max(nilaiResidu,nilaiBuku*(1-tarif));
}
if(sisaBulan>0&&nilaiBuku>nilaiResidu){
const bebanBulanIni=nilaiBuku*tarif/12*sisaBulan;
nilaiBuku=Math.max(nilaiResidu,nilaiBuku-bebanBulanIni);
}
const akumulasi=Math.max(0,hargaPerolehan-nilaiBuku);
return{nilaiBuku,akumulasi,tahunBerjalan:bulanBerjalan/12};
},
// Metode 3: Manual — pass-through, nilai buku = nilai aset yang diisi user sendiri.
manual(nilaiSaatIni){
return{nilaiBuku:Number(nilaiSaatIni)||0,akumulasi:null,tahunBerjalan:null};
},
// Dispatcher: hitung nilai buku SEKARANG (atau di tanggalHitung tertentu) sesuai
// setting penyusutan yg tersimpan di aset (a.penyusutan). Balikin null kalau
// penyusutan belum diaktifkan utk aset ini.
hitung(a,tanggalHitung){
if(!a||!a.penyusutan||!a.penyusutan.aktif)return null;
const p=a.penyusutan;
const metode=p.metode||'garisLurus';
tanggalHitung=tanggalHitung||todayStr();
if(metode==='manual'){
return Object.assign({metode,hargaPerolehan:Penyusutan.hargaPerolehan(a)},Penyusutan.manual(a.nilai));
}
const hargaPerolehan=Penyusutan.hargaPerolehan(a);
if(hargaPerolehan==null){
return{metode,hargaPerolehan:null,nilaiBuku:a.nilai,akumulasi:null};
}
if(metode==='saldoMenurun'){
return Object.assign({metode,hargaPerolehan},Penyusutan.saldoMenurun(hargaPerolehan,p.tarifPersen,p.nilaiResidu,a.tanggal,tanggalHitung));
}
return Object.assign({metode,hargaPerolehan},Penyusutan.garisLurus(hargaPerolehan,p.nilaiResidu,p.umurManfaatTahun,a.tanggal,tanggalHitung));
},
// Nyalakan/matikan penyusutan utk 1 aset. Saat dinyalakan pertama kali (belum
// pernah punya a.penyusutan sama sekali), isi dgn DEFAULTS supaya field2 di UI
// langsung ada nilainya (bukan kosong/NaN).
toggleAktif(id){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a)return;
a.penyusutan=a.penyusutan||Object.assign({},Penyusutan.DEFAULTS);
a.penyusutan.aktif=!a.penyusutan.aktif;
save();
Penyusutan.renderList();
},
// Update 1 parameter (metode/umurManfaatTahun/nilaiResidu/tarifPersen) dari kontrol
// per-baris di kartu Penyusutan. no-op kalau aset/penyusutan-nya belum ada (mis.
// race condition re-render), TIDAK bikin objek baru di sini spy tidak mem-bypass
// toggleAktif() sbg satu2nya titik nyalain penyusutan.
updateParam(id,field,rawValue){
const a=D.assets.find(x=>sameId(x.id,id));
if(!a||!a.penyusutan)return;
if(field==='metode'){
a.penyusutan.metode=rawValue;
} else if(field==='nilaiResidu'){
a.penyusutan.nilaiResidu=parsePzNum(rawValue);
} else if(field==='umurManfaatTahun'){
a.penyusutan.umurManfaatTahun=parseDecStr(rawValue)||0;
} else if(field==='tarifPersen'){
a.penyusutan.tarifPersen=parseDecStr(rawValue)||0;
}
save();
Penyusutan.renderList();
},
// Render kartu "📉 Penyusutan Aset": 1 baris per aset (toggle aktif + kontrol
// metode & parameter kalau aktif + hasil hitung), plus total Akumulasi
// Penyusutan & total Nilai Buku Sekarang lintas aset yg aktif.
renderList(){
const card=document.getElementById('assetPenyusutanDashboard');
const box=document.getElementById('assetPenyusutanList');
if(!card||!box)return;
const list=D.assets||[];
card.classList.remove('u-dnone');
if(!list.length){
const ta=document.getElementById('assetPenyusutanTotalAkumulasi');if(ta)ta.textContent=fmtFull(0);
const tb=document.getElementById('assetPenyusutanTotalBuku');if(tb)tb.textContent=fmtFull(0);
box.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset tercatat — tambah aset pertama lewat 📋 Buku Aset di bawah, lalu aktifkan penyusutan per aset di sini.</div>';
return;
}
let totalAkumulasi=0,totalBuku=0;
box.innerHTML=list.map(a=>{
const aktif=!!(a.penyusutan&&a.penyusutan.aktif);
const p=a.penyusutan||Penyusutan.DEFAULTS;
const icon=Aset.ICON[a.jenis]||'📦';
const iconHtml=(typeof FeatureIcons!=='undefined')?FeatureIcons.render(icon,{size:14}):icon;
let bodyHtml='';
if(aktif){
const hasil=Penyusutan.hitung(a);
const metode=p.metode||'garisLurus';
const metodeOpts=['garisLurus','saldoMenurun','manual'].map(m=>`<option value="${m}" ${m===metode?'selected':''}>${Penyusutan.METODE_LABELS[m]}</option>`).join('');
let fieldsHtml='';
if(metode==='garisLurus'){
fieldsHtml=`<div class="u-grid2 u-gap8 u-mb8">
        <div><label class="fl">Umur Manfaat (tahun)</label><input type="text" inputmode="numeric" class="fi" value="${p.umurManfaatTahun!=null?p.umurManfaatTahun:''}" onchange="Penyusutan.updateParam('${a.id}','umurManfaatTahun',this.value)"></div>
        <div><label class="fl">Nilai Residu (Rp)</label><input type="text" inputmode="numeric" class="fi" value="${p.nilaiResidu!=null?p.nilaiResidu:''}" onchange="Penyusutan.updateParam('${a.id}','nilaiResidu',this.value)"></div>
      </div>`;
} else if(metode==='saldoMenurun'){
fieldsHtml=`<div class="u-grid2 u-gap8 u-mb8">
        <div><label class="fl">Tarif per Tahun (%)</label><input type="text" inputmode="numeric" class="fi" value="${p.tarifPersen!=null?p.tarifPersen:''}" onchange="Penyusutan.updateParam('${a.id}','tarifPersen',this.value)"></div>
        <div><label class="fl">Nilai Residu (Rp)</label><input type="text" inputmode="numeric" class="fi" value="${p.nilaiResidu!=null?p.nilaiResidu:''}" onchange="Penyusutan.updateParam('${a.id}','nilaiResidu',this.value)"></div>
      </div>`;
} else {
fieldsHtml=`<div class="u-fs11 u-t2 u-mb8">Nilai buku = field "Nilai" aset ini, di-update manual sendiri lewat Edit Aset. Tidak ada formula otomatis di metode ini.</div>`;
}
let resultHtml='';
if(metode!=='manual'&&hasil.hargaPerolehan==null){
resultHtml=`<div class="u-fs11 u-cacc2">⚠️ Isi dulu Modal Investasi atau Harga Beli × Jumlah Unit di data aset ini supaya bisa dihitung.</div>`;
} else {
totalBuku+=hasil.nilaiBuku||0;
if(hasil.akumulasi!=null)totalAkumulasi+=hasil.akumulasi;
resultHtml=`<div class="u-fs12"><b>Nilai Buku Sekarang: ${fmtFull(hasil.nilaiBuku)}</b>${hasil.akumulasi!=null?' · Akumulasi Penyusutan: '+fmtFull(hasil.akumulasi):''}</div>`;
if(hasil.habisManfaat)resultHtml+=`<div class="u-fs11 u-t2 u-mt2">✅ Sudah mencapai akhir umur manfaat.</div>`;
}
bodyHtml=`<div class="fg" style="margin-bottom:8px"><label class="fl">Metode</label><select class="fs" onchange="Penyusutan.updateParam('${a.id}','metode',this.value)">${metodeOpts}</select></div>`+fieldsHtml+resultHtml;
}
return `<div class="u-r10 u-mb10" style="border:1px solid var(--border);padding:10px 12px">
      <div class="u-flex u-jcb u-aic u-mb8">
        <div class="fi-insight-row u-fs13 u-fw600"><span class="fi-insight-icon">${iconHtml}</span><span>${escapeHtml(a.name)}</span></div>
        <label class="u-fs11 u-flex u-aic" style="gap:4px"><input type="checkbox" ${aktif?'checked':''} onchange="Penyusutan.toggleAktif('${a.id}')"> Aktif</label>
      </div>
      ${bodyHtml}
    </div>`;
}).join('');
const totalEl=document.getElementById('assetPenyusutanTotalAkumulasi');
if(totalEl)totalEl.textContent=fmtFull(totalAkumulasi);
const bukuEl=document.getElementById('assetPenyusutanTotalBuku');
if(bukuEl)bukuEl.textContent=fmtFull(totalBuku);
// Widget Rekomendasi AI (penyusutan-ai-widget.js) — opsional, di-guard supaya
// renderList() tetap aman kalau file itu belum/tidak dimuat. Container-nya
// (#assetPenyusutanAI) TERPISAH dari #assetPenyusutanList, pola sama dgn
// InvestAI.mountInto() di AlokasiAset.renderOne().
if(typeof PenyusutanAI!=='undefined'){
const aiEl=document.getElementById('assetPenyusutanAI');
if(aiEl)PenyusutanAI.mountInto(aiEl);
}
}
};
// ================= PAJAK ASET (bagian ke-12) =================
// FITUR BARU: Pajak Aset — estimasi 2 kewajiban yang nempel langsung ke aset
// yang tercatat di Buku Aset (BUKAN pengganti kalkulator umum di tab 🕌 Pajak
// yang sudah ada — PPh21/PBB manual/Zakat Maal lengkap dgn aset cair & utang
// -- ini scope-nya sengaja lebih sempit & auto-sync dari Buku Aset):
//  - PBB (Pajak Bumi & Bangunan): khusus aset berjenis 'Tanah' atau
//    'Rumah/Bangunan'. NJOP didekati dari field "Nilai" aset (Buku Aset tidak
//    simpan NJOP resmi terpisah) dikurangi NJOPTKP, dikali tarif PBB-P2.
//    NJOPTKP & tarif adalah SATU setting global (bukan per-aset) krn biasanya
//    sama utk semua properti di 1 daerah yang sama — disimpan di
//    D.pajakAsetSettings, default NJOPTKP Rp12.000.000 & tarif 0,5% (batas
//    maks menurut UU HKPD), TAPI beda tiap Pemda jadi selalu ada disclaimer
//    cek Perda/SPPT setempat (sama semangatnya dgn kartu PBB manual di tab
//    Pajak).
//  - Zakat Maal Aset: breakdown 2,5% KHUSUS dari aset yang ditandai
//    zakatable di Buku Aset (a.zakatable) — beda dari hitungZakatMaal() di
//    tab Pajak yang scope-nya lebih luas (ikut hitung aset cair & kurangi
//    utang). Di sini murni supaya user lihat aset MANA aja yg nyumbang &
//    berapa nominalnya per aset, tanpa perlu buka tab lain.
// Ringkasan Pajak menggabungkan total PBB + total Zakat Maal Aset jadi 1
// estimasi kewajiban tahunan per Buku Aset.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import,
// pola sama dgn Penyusutan.renderList().
const PajakAset={
DEFAULTS:{njoptkp:12000000,tarifPersen:0.5},
JENIS_PROPERTI:['Tanah','Rumah/Bangunan'],
settings(){
D.pajakAsetSettings=D.pajakAsetSettings||Object.assign({},PajakAset.DEFAULTS);
return D.pajakAsetSettings;
},
// Update setting global NJOPTKP/tarifPersen dari kontrol di kartu Pajak Aset.
updateSetting(field,rawValue){
if(field!=='njoptkp'&&field!=='tarifPersen')return;
const s=PajakAset.settings();
if(field==='njoptkp')s.njoptkp=parsePzNum(rawValue);
else s.tarifPersen=parseDecStr(rawValue)||0;
save();
PajakAset.renderList();
},
// Estimasi PBB 1 aset properti. null kalau bukan jenis Tanah/Rumah-Bangunan.
hitungPBB(a,settings){
if(!a||!PajakAset.JENIS_PROPERTI.includes(a.jenis))return null;
const s=settings||PajakAset.settings();
const njop=a.nilai||0;
const njoptkp=s.njoptkp||0;
const dasar=Math.max(0,njop-njoptkp);
const terutang=Math.round(dasar*(s.tarifPersen||0)/100);
return{njop,njoptkp,dasar,terutang};
},
zakatableAssets(){
return(D.assets||[]).filter(a=>a.zakatable);
},
// Breakdown Zakat Maal 2,5% khusus aset zakatable di Buku Aset (TANPA cek
// haul/nishab terpisah — itu urusan kalkulator Zakat Maal utama di tab Pajak).
// SESI 393: totalNilai sekarang dihitung dari PORSI MILIK SENDIRI tiap aset
// (Aset.selfOwnedNilai(), 100% reuse MultiOwnerEngine.selfOwnedValue() S390)
// -- BUKAN nilai penuh lagi. Aset single-owner (mayoritas — default/legacy)
// tetap balik nilai penuh (selfPorsi 100%, 0 regresi). Aset multi-pemilik yg
// porsi user belum ditandai "👤 Saya" di modal porsi (assetOwnersModal)
// otomatis TIDAK ikut disumbang ke Zakat -- sesuai temuan audit: nilai
// pemilik lain tidak seharusnya kena zakat kamu.
hitungZakatAset(){
const list=PajakAset.zakatableAssets();
const totalNilai=list.reduce((s,a)=>s+Aset.selfOwnedNilai(a),0);
const totalZakat=Math.round(totalNilai*0.025);
return{list,totalNilai,totalZakat};
},
// Render kartu "🧾 Pajak Aset": setting NJOPTKP/tarif, breakdown estimasi PBB
// per aset properti, breakdown Zakat Maal per aset zakatable, & Ringkasan
// Pajak (total gabungan). Kartu disembunyikan kalau tidak ada aset properti
// maupun aset zakatable sama sekali (belum relevan ditampilkan).
renderList(){
const card=document.getElementById('assetPajakDashboard');
const box=document.getElementById('assetPajakList');
if(!card||!box)return;
const properti=(D.assets||[]).filter(a=>PajakAset.JENIS_PROPERTI.includes(a.jenis));
const zakat=PajakAset.hitungZakatAset();
card.classList.remove('u-dnone');
if(!properti.length&&!zakat.list.length){
const tp=document.getElementById('assetPajakTotalPBB');if(tp)tp.textContent=fmtFull(0);
const tz=document.getElementById('assetPajakTotalZakat');if(tz)tz.textContent=fmtFull(0);
box.innerHTML='<div class="u-fs12 u-t2 u-lh15">Belum ada aset properti (tanah/bangunan) atau aset yang ditandai "Zakat" — tandai di 📋 Buku Aset supaya estimasi PBB/Zakat Maal muncul di sini.</div>';
return;
}
const s=PajakAset.settings();
// BUGFIX-PROTECTIVE: tidak overwrite input NJOPTKP/tarif kalau lagi difokus
// user (sedang diketik) supaya re-render (dipicu save/delete aset lain)
// tidak "melompat"/reset kursor di tengah ngetik.
const njoptkpEl=document.getElementById('pajakAsetNjoptkp');
if(njoptkpEl&&document.activeElement!==njoptkpEl)njoptkpEl.value=s.njoptkp;
const tarifEl=document.getElementById('pajakAsetTarif');
if(tarifEl&&document.activeElement!==tarifEl)tarifEl.value=s.tarifPersen;
let totalPBB=0;
const pbbHtml=properti.length?('<div class="u-fs12t2 u-fw700 u-mb6">🏛️ Estimasi PBB</div>'+properti.map(a=>{
const r=PajakAset.hitungPBB(a,s);
totalPBB+=r.terutang;
return `<div class="u-flex u-jcb u-aifs u-gap8 u-fs12 u-mb6"><span class="u-flex1">${Aset.ICON[a.jenis]||'📦'} ${escapeHtml(a.name)}</span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmtFull(r.terutang)}/th</span></div>`;
}).join('')):'';
const zakatHtml=zakat.list.length?('<div class="u-fs12t2 u-fw700 u-mb6 u-mt10">🕌 Zakat Maal per Aset (bukan Kekayaan Bersih)</div>'+zakat.list.map(a=>{
const z=Math.round(Aset.selfOwnedNilai(a)*0.025);
return `<div class="u-flex u-jcb u-aifs u-gap8 u-fs12 u-mb6"><span class="u-flex1">${Aset.ICON[a.jenis]||'📦'} ${escapeHtml(a.name)}</span><span class="u-fw700 u-tar" style="white-space:nowrap">${fmtFull(z)}</span></div>`;
}).join('')):'';
box.innerHTML=(pbbHtml+zakatHtml)||'<div class="u-fs12 u-t2">Belum ada aset Tanah/Rumah-Bangunan atau aset zakatable.</div>';
const pbbEl=document.getElementById('assetPajakTotalPBB');
if(pbbEl)pbbEl.textContent=fmtFull(totalPBB);
const zakatEl=document.getElementById('assetPajakTotalZakat');
if(zakatEl)zakatEl.textContent=fmtFull(zakat.totalZakat);
const totalPajak=totalPBB+zakat.totalZakat;
const ringkasanEl=document.getElementById('assetPajakRingkasan');
if(ringkasanEl){
ringkasanEl.innerHTML=`📋 <b>Ringkasan Pajak:</b> estimasi total kewajiban pajak &amp; zakat dari Buku Aset ±<b>${fmtFull(totalPajak)}</b>/tahun — PBB ${fmtFull(totalPBB)} (${properti.length} aset properti) + Zakat Maal per Aset ${fmtFull(zakat.totalZakat)} (${zakat.list.length} aset zakatable, TIDAK termasuk Piutang/Utang). Estimasi kasar dari data Buku Aset, bukan angka resmi SPPT/lembaga zakat — cek Perda/BAZNAS setempat utk angka pasti. Untuk Zakat Maal lengkap (Saldo+Aset+Piutang−Utang), lihat kartu 💰 Zakat Maal di tab 🕌 Pajak.`;
}
}
};
// ================= LAPORAN ASET (bagian ke-13) =================
// FITUR BARU: Laporan Aset — satu kartu ringkas yang menggabungkan 5 hal yang
// sebelumnya cuma bisa dilihat kepencar di kartu2 lain, supaya bisa dibaca/
// dicetak jadi 1 laporan utuh: (1) Daftar Aset, (2) Riwayat Transaksi (dari
// akun2 yang ditautkan ke aset), (3) Nilai Aset (Pasar vs Buku + breakdown
// kategori — angka SAMA dgn Aset.renderDashboard(), dihitung ulang di sini
// spy modul ini berdiri sendiri/tidak bergantung urutan render kartu lain),
// (4) Penyusutan (ringkasan akumulasi & nilai buku sekarang, KHUSUS aset yg
// penyusutannya sudah Aktif — detail per-metode tetap di kartu 📉 Penyusutan
// Aset), dan (5) Ringkasan Kekayaan (dari Aset) — total nilai, kategori
// terbesar, & berapa yg zakatable. SENGAJA tidak mengulang scope kartu 🏦
// Kekayaan Bersih (renderKekayaanBersih, di luar file ini — itu gabungan
// akun+aset+utang) atau 🧾 Pajak Aset (PajakAset, PBB/Zakat) — laporan ini
// murni rekap sisi ASET saja spy tidak tumpang tindih & gampang dites sendiri.
// build() dipisah dari renderList() (pola sama dgn PajakAset.hitungZakatAset()
// vs renderList()) supaya logic murni bisa dites tanpa DOM.
const LaporanAset={
// Riwayat Transaksi: HANYA mencakup aset yang sudah ditautkan ke Akun Transaksi
// (a.accountId, sama syarat dgn Aset.openTxHistory()). D.transactions diasumsikan
// array flat berisi seluruh transaksi keuangan app (field minimal dipakai di sini:
// accountId, type ['income'|'expense'], amount, date, note) — kalau
// D.transactions belum ada/bukan array, dianggap kosong (tidak error).
riwayatTransaksi(){
const assets=(D.assets||[]).filter(a=>a.accountId);
const allTx=Array.isArray(D.transactions)?D.transactions:[];
const akunTertaut=assets.map(a=>{
const acc=(D.accounts||[]).find(x=>sameId(x.id,a.accountId));
const txAkun=acc?allTx.filter(t=>sameId(t.accountId,acc.id)):[];
const totalMasuk=txAkun.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount||0),0);
const totalKeluar=txAkun.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount||0),0);
return{assetId:a.id,assetName:a.name,accountId:a.accountId,accountName:acc?acc.name:null,accountExists:!!acc,jumlahTx:txAkun.length,totalMasuk,totalKeluar};
});
const accIds=akunTertaut.filter(x=>x.accountExists).map(x=>x.accountId);
const gabungan=allTx.filter(t=>accIds.some(id=>sameId(t.accountId,id)));
const recentTx=gabungan.slice().sort((x,y)=>new Date(y.date||0)-new Date(x.date||0)).slice(0,10);
return{akunTertaut,recentTx,totalTx:gabungan.length};
},
// Nilai Aset: total Nilai Pasar (a.nilai) vs Nilai Buku (modal/harga perolehan,
// definisi SAMA dgn Aset.renderDashboard()) + breakdown per kategori (jenis).
// S201 (Finalisasi Sinkronisasi Lintas Modul): fix — filter isAssetOwnershipSelf
// ditambahkan supaya BENAR-BENAR "SAMA dgn Aset.renderDashboard()" seperti
// diklaim komentar di atas (Sesi 193 sudah menambah filter ini di
// renderDashboard(), tapi LaporanAset.nilaiAset() sempat luput -> Dashboard
// Aset & Laporan Aset bisa beda angka kalau ada aset ber-ownership non-SELF).
// 0 rumus baru — reuse isAssetOwnershipSelf() yang sudah ada apa adanya.
// S706 (Temuan #2, audit modul Aset sesi S705): TAMBAH filter
// `!a._migratedToInvestmentId` & `!a.investmentId` — Aset.totalValue()
// (aset.js) sudah exclude aset yang sudah "pindah" ke Holding Investasi
// (migrasi otomatis s476a ATAU tautan manual B8) sejak lama, tapi
// nilaiAset() di sini luput ikut disinkronkan waktu kedua filter itu
// ditambahkan — aset yang nilainya sudah dihitung di sisi Investasi tetap
// ikut dijumlah lagi di kartu "📑 Laporan Aset" (double count). Pola
// filter SAMA PERSIS Aset.totalValue() (aset.js:987), 0 rumus baru.
nilaiAset(){
const list=(D.assets||[]).filter(isAssetOwnershipSelf).filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId);
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
return{totalPasar,totalBuku,selisih,selisihPct,perKategori};
},
// Penyusutan: rekap ringkas lintas aset yg penyusutannya AKTIF (detail per-metode
// tetap di kartu Penyusutan.renderList() — di sini cuma total utk laporan).
penyusutan(){
const list=(D.assets||[]).filter(a=>a.penyusutan&&a.penyusutan.aktif);
let totalAkumulasi=0,totalBukuSekarang=0,belumLengkap=0;
list.forEach(a=>{
const hasil=Penyusutan.hitung(a);
if(!hasil)return;
if(hasil.metode!=='manual'&&hasil.hargaPerolehan==null){belumLengkap++;return;}
totalBukuSekarang+=hasil.nilaiBuku||0;
if(hasil.akumulasi!=null)totalAkumulasi+=hasil.akumulasi;
});
return{jumlahAktif:list.length,totalAkumulasi,totalBukuSekarang,belumLengkap};
},
// Ringkasan Kekayaan (dari Aset) — SENGAJA cuma sisi aset (bukan gabungan akun+
// utang spt renderKekayaanBersih() global), supaya laporan ini murni & mandiri.
ringkasanKekayaan(){
// S201: filter isAssetOwnershipSelf() supaya jumlahAset KONSISTEN dgn
// totalNilaiPasar/totalNilaiBuku (nilaiAset(), sudah difilter di atas) —
// 1 laporan, 1 populasi aset yang sama, bukan jumlah dari populasi lebih
// besar dipasangkan dgn nilai dari populasi lebih kecil.
// S706 (Temuan #2): filter migrasi `!a._migratedToInvestmentId`/
// `!a.investmentId` ikut ditambahkan di sini juga (SAMA PERSIS nilaiAset()
// di atas) — supaya jumlahAset TETAP konsisten dgn populasi yang dipakai
// nilai.totalPasar/nilai.totalBuku (yang sekarang sudah exclude aset
// termigrasi/tertaut), bukan cuma isAssetOwnershipSelf saja.
const list=(D.assets||[]).filter(isAssetOwnershipSelf).filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId);
const nilai=LaporanAset.nilaiAset();
const zakat=(typeof PajakAset!=='undefined'?PajakAset.hitungZakatAset():{totalNilai:0,totalZakat:0,list:[]});
const kategoriRows=Object.entries(nilai.perKategori).sort((a,b)=>b[1].nilai-a[1].nilai);
const terbesar=kategoriRows.length?{jenis:kategoriRows[0][0],pct:nilai.totalPasar?(kategoriRows[0][1].nilai/nilai.totalPasar*100):0}:null;
return{jumlahAset:list.length,jumlahKategori:kategoriRows.length,totalNilaiPasar:nilai.totalPasar,totalNilaiBuku:nilai.totalBuku,totalZakatable:zakat.totalNilai,jumlahZakatable:zakat.list.length,kategoriTerbesar:terbesar};
},
// Gabungan semua data laporan (dipakai renderList() & bisa dipakai eksternal/test
// tanpa DOM sama sekali).
build(){
return{
// S706 (Temuan #2): daftarAset ikut difilter `isAssetOwnershipSelf` +
// `!a._migratedToInvestmentId` + `!a.investmentId` (SAMA PERSIS populasi
// nilaiAset()/ringkasanKekayaan() di atas) — sebelum ini daftarAset baca
// D.assets MENTAH tanpa filter apapun, jadi baris "Daftar Aset" bisa
// menampilkan aset non-SELF & aset yang sudah pindah ke Investasi
// berdampingan dgn totalPasar/totalBuku yang sudah exclude keduanya
// (rincian per-baris vs total jadi tidak nyambung).
daftarAset:(D.assets||[]).filter(isAssetOwnershipSelf).filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId).map(a=>({id:a.id,name:a.name,jenis:a.jenis,icon:Aset.ICON[a.jenis]||'📦',nilai:a.nilai||0,lokasi:a.lokasi||'',tanggal:a.tanggal||'',zakatable:!!a.zakatable,accountId:a.accountId||null})),
riwayatTransaksi:LaporanAset.riwayatTransaksi(),
nilaiAset:LaporanAset.nilaiAset(),
penyusutan:LaporanAset.penyusutan(),
ringkasanKekayaan:LaporanAset.ringkasanKekayaan()
};
},
// Render kartu "📑 Laporan Aset". Kartu disembunyikan kalau belum ada aset sama
// sekali (belum relevan ditampilkan) — pola sama dgn Penyusutan/PajakAset.
// Dipanggil dari Aset.renderList() spy selalu sinkron tiap save/delete/import.
renderList(){
const card=document.getElementById('laporanAsetCard');
if(!card)return;
card.classList.remove('u-dnone');
const data=LaporanAset.build();
// (1) Daftar Aset
const daftarEl=document.getElementById('lapAsetDaftar');
if(daftarEl){
daftarEl.innerHTML=data.daftarAset.map(a=>{
const iconHtml=(typeof FeatureIcons!=='undefined')?FeatureIcons.render(a.icon,{size:14}):(a.icon||'');
return `<div class="lap-aset-row u-fs12"><span class="lap-aset-name fi-insight-row"><span class="fi-insight-icon">${iconHtml}</span><span>${escapeHtml(a.name)}${a.zakatable?' 🕌':''}</span></span><span class="lap-aset-val">${fmtFull(a.nilai)}</span></div>`;
}).join('')||'<div class="u-fs12 u-t2">Belum ada aset tercatat</div>';
}
// (2) Riwayat Transaksi
const riwayatEl=document.getElementById('lapAsetRiwayat');
if(riwayatEl){
const r=data.riwayatTransaksi;
const tertaut=r.akunTertaut.filter(x=>x.accountExists);
if(!tertaut.length){
riwayatEl.innerHTML='<div class="u-fs12 u-t2">Belum ada aset yang ditautkan ke Akun Transaksi.</div>';
} else {
riwayatEl.innerHTML=tertaut.map(x=>`<div class="u-fs12 u-mb6"><b>${escapeHtml(x.assetName)}</b> · 🔗 ${escapeHtml(x.accountName)} — ${x.jumlahTx} transaksi <span class="green">+${fmtFull(x.totalMasuk)}</span> / <span class="red">-${fmtFull(x.totalKeluar)}</span></div>`).join('')+`<div class="u-fs11 u-t2 u-mt6">Total ${r.totalTx} transaksi tercatat lintas akun tertaut.</div>`;
}
}
// (3) Nilai Aset
const nilaiEl=document.getElementById('lapAsetNilai');
if(nilaiEl){
const n=data.nilaiAset;
const cls=n.selisih>=0?'green':'red';
nilaiEl.innerHTML=`<div class="u-fs12 u-mb6">Nilai Pasar: <b>${fmtFull(n.totalPasar)}</b> · Nilai Buku: <b>${fmtFull(n.totalBuku)}</b></div><div class="u-fs12 ${cls}">Selisih: ${fmtFullSigned(n.selisih)} (${n.selisih>=0?'+':''}${n.selisihPct.toFixed(2)}%)</div>`;
}
// (4) Penyusutan
const penyusutanEl=document.getElementById('lapAsetPenyusutan');
if(penyusutanEl){
const p=data.penyusutan;
penyusutanEl.innerHTML=p.jumlahAktif?`<div class="u-fs12">${p.jumlahAktif} aset aktif penyusutan · Akumulasi ${fmtFull(p.totalAkumulasi)} · Nilai Buku Sekarang ${fmtFull(p.totalBukuSekarang)}</div>`:'<div class="u-fs12 u-t2">Belum ada aset yang mengaktifkan penyusutan.</div>';
}
// (5) Ringkasan Kekayaan
const ringkasanEl=document.getElementById('lapAsetRingkasan');
if(ringkasanEl){
const rk=data.ringkasanKekayaan;
let txt=`📦 <b>${rk.jumlahAset}</b> aset di <b>${rk.jumlahKategori}</b> kategori, total nilai pasar <b>${fmtFull(rk.totalNilaiPasar)}</b> (nilai buku ${fmtFull(rk.totalNilaiBuku)})`;
if(rk.kategoriTerbesar)txt+=`. Kategori terbesar: <b>${escapeHtml(rk.kategoriTerbesar.jenis)}</b> (${rk.kategoriTerbesar.pct.toFixed(1)}%)`;
if(rk.jumlahZakatable)txt+=`. ${rk.jumlahZakatable} aset zakatable senilai ${fmtFull(rk.totalZakatable)}`;
txt+='.';
ringkasanEl.innerHTML=txt;
}
}
};
