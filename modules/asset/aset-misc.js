// aset-misc.js — Domain Aset & Kekayaan (LAIN-LAIN): ALOKASI_PRESETS/AlokasiAset (rekomendasi alokasi dana), isAssetOwnershipSelf & helper migrasi Investasi, AssetInsight (insight kepemilikan aset), assetInvestmentLinkOptionsHtml/_normalizeInstrumentName, IDBStore (helper generik IndexedDB — dipakai lintas modul, bukan cuma Aset), PORTFOLIO_LABELS, TimelineW (linimasa tujuan keuangan), setAsetTab, prediksi nilai aset/net worth, AI rules Aset.
// S589: dipecah dari modules/asset/aset.js (dulu 1 file 3175 baris) — lihat docs/AUDIT-SPLIT-ASET-JS.md & docs/FIX-s589-split-aset-js.md.
// PENTING: file ini WAJIB dimuat PALING TERAKHIR dari trio aset.js/aset-reports.js/aset-misc.js — baris Object.assign(window,{...}) di akhir file ini merujuk identifier dari KETIGA file (Aset dari aset.js, Penyusutan/PajakAset/LaporanAset dari aset-reports.js, sisanya dari file ini sendiri). Kalau urutan manifest build.js keliru, Object.assign ini akan gagal ReferenceError saat runtime.
// Isi & perilaku TIDAK berubah dari sebelum split — murni pindah lokasi fisik baris kode.

const ALOKASI_PRESETS={
konservatif:{label:'🛡️ Konservatif',desc:'Prioritas jaga nilai pokok, fluktuasi seminimal mungkin. Cocok kalau dana ini penting/darurat atau horison waktu pendek (<2 tahun).',items:[
{name:'Kas / Dana Darurat',pct:40,icon:'💵'},
{name:'RDPU / Deposito',pct:35,icon:'📈'},
{name:'Obligasi / Sukuk Ritel',pct:15,icon:'📜'},
{name:'Emas',pct:10,icon:'🥇'}
]},
moderat:{label:'⚖️ Moderat',desc:'Seimbang antara peluang pertumbuhan & keamanan. Cocok utk horison menengah (3-5 tahun).',items:[
{name:'Kas / Dana Darurat',pct:20,icon:'💵'},
{name:'RDPU / Deposito',pct:25,icon:'📈'},
{name:'Obligasi / Sukuk Ritel',pct:20,icon:'📜'},
{name:'Reksadana Saham / Saham',pct:20,icon:'📊'},
{name:'Emas',pct:15,icon:'🥇'}
]},
agresif:{label:'🚀 Agresif',desc:'Prioritas pertumbuhan jangka panjang, siap terima fluktuasi nilai yang besar. Cocok horison panjang (>5-7 tahun).',items:[
{name:'Kas / Dana Darurat',pct:10,icon:'💵'},
{name:'Obligasi / Sukuk Ritel',pct:15,icon:'📜'},
{name:'Reksadana Saham / Saham',pct:45,icon:'📊'},
{name:'Emas',pct:10,icon:'🥇'},
{name:'Kripto / Alternatif',pct:20,icon:'🪙'}
]}
};
const AlokasiAset={
SUFFIXES:[''],
setRisk(key){
D.assetAllocation=D.assetAllocation||{};
D.assetAllocation.risk=key;
save();
AlokasiAset.renderAll();
},
onDanaInput(suffix){
suffix=suffix||'';
const danaEl=document.getElementById('aaDana'+suffix);
if(!danaEl)return;
D.assetAllocation=D.assetAllocation||{};
D.assetAllocation.dana=parsePzNum(danaEl.value);
save();
AlokasiAset.renderAll();
},
renderAll(){
AlokasiAset.SUFFIXES.forEach(suf=>AlokasiAset.renderOne(suf));
},
renderOne(suffix){
suffix=suffix||'';
const box=document.getElementById('aaResult'+suffix);
if(!box)return;
const chips=document.querySelectorAll('#aaRiskChips'+suffix+' .chip-btn');
const danaEl=document.getElementById('aaDana'+suffix);
const risk=D.assetAllocation&&D.assetAllocation.risk;
chips.forEach(b=>b.classList.remove('active'));
if(risk){
const idx={konservatif:0,moderat:1,agresif:2}[risk];
if(chips[idx])chips[idx].classList.add('active');
}
if(danaEl){
const savedDana=D.assetAllocation&&D.assetAllocation.dana;
danaEl.value=(savedDana!=null&&savedDana!=='')?savedDana:(totalSaldoAkun()||'');
}
if(!risk){box.innerHTML='<div class="u-fs12t2">Pilih dulu salah satu profil risiko di atas ya.</div>';return;}
const preset=ALOKASI_PRESETS[risk];
if(!preset)return;
const dana=danaEl?parsePzNum(danaEl.value):0;
const dd=(D.targets||[]).find(t=>t.isDanaDarurat);
const ddBanner=dd?'':`<div class="u-fs11 u-cacc2 u-r10 u-mb10 u-lh15" style="background:var(--accent2-soft);padding:8px 10px">🚨 Belum ada target yang ditandai <b>Dana Darurat</b>, jadi baris "Kas / Dana Darurat" di bawah masih ilustrasi murni. <span class="u-pointer u-fw600" style="text-decoration:underline" data-action="openTargetModalDanaDarurat">+ Buat targetnya sekarang</span></div>`;
box.innerHTML=ddBanner+'<div class="u-hint10">'+escapeHtml(preset.desc)+'</div>'+
preset.items.map(it=>{
const nominal=Math.round(dana*it.pct/100);
const isDanaDaruratRow=/dana darurat/i.test(it.name);
let ddInfo='';
if(isDanaDaruratRow&&dd){
const ddSaved=dd.accountId?recalcAccBalance(dd.accountId):dd.saved;
const ddPct=Math.min(100,Math.round((ddSaved/dd.amount)*100));
const ddCol=ddPct>=100?'var(--accent3)':ddPct>=50?'var(--accent4)':'var(--accent2)';
ddInfo=`<div style="font-size:11px;color:${ddCol};margin-top:4px;font-weight:600">🎯 "${escapeHtml(dd.name)}": ${fmtFull(ddSaved)} / ${fmtFull(dd.amount)} (${ddPct}%)</div>`;
}
const iconHtml=(typeof FeatureIcons!=='undefined')?FeatureIcons.render(it.icon,{size:14}):(it.icon||'');
return `<div style="display:flex;justify-content:space-between;align-items:${ddInfo?'flex-start':'center'};padding:8px 0;border-bottom:1px solid var(--border)">
          <div><div class="fi-insight-row u-fs13 u-fw600"><span class="fi-insight-icon">${iconHtml}</span><span>${escapeHtml(it.name)}</span></div><div class="u-fs11 u-t2">${it.pct}%</div>${ddInfo}</div>
          <div class="u-fw700 u-fs13" style="white-space:nowrap;padding-left:8px">${fmtFull(nominal)}</div>
        </div>`;
}).join('')+
'<div class="u-fs11 u-t2 u-mt10 u-lh15">⚠️ Ini cuma ilustrasi persentase umum, bukan saran investasi personal/berlisensi. Nama produk, jangka waktu, dan porsi pastinya perlu disesuaikan sama tujuan & riset kamu sendiri, atau konsultasi ke perencana keuangan berlisensi OJK.</div>';
// Widget Rekomendasi AI (invest-ai-widget.js) — opsional, di-guard supaya
// renderOne() tetap aman kalau file itu belum/tidak dimuat. Widget di-APPEND
// ke box yang sama, TIDAK menimpa ilustrasi alokasi di atas.
if(typeof InvestAI!=='undefined')InvestAI.mountInto(box);
},
init(suffix){
AlokasiAset.renderOne(suffix||'');
}
};
if (typeof AlokasiAset !== 'undefined') window.AlokasiAset = AlokasiAset;
// isAssetOwnershipSelf(a) — helper REUSE dari OwnershipEngine (Sesi 193,
// Ownership Sync Asset & Investasi). Balikin true kalau kepemilikan EFEKTIF
// aset ini SELF (termasuk aset lama yg belum punya field `ownership` sama
// sekali — via OwnershipEngine.resolve() otomatis fallback ke SELF/DEFAULT,
// 100% backward compatible, TIDAK ada aset existing yang tiba-tiba
// ke-exclude). Balikin false kalau ownership-nya salah satu dari INVESTOR/
// CUSTOMER/THIRD_PARTY/FAMILY (sesuai spesifikasi sesi ini: aset2 tipe ini
// WAJIB dikecualikan dari agregat Total Aset/Dashboard Aset/AI Insight/Net
// Worth — tapi TIDAK dari Aset.renderList() [Buku Aset], aset & histori
// tersebut tetap tampil & tersimpan apa adanya di daftar, cuma tidak ikut
// dijumlah ke total).
// Guard typeof OwnershipEngine: kalau engine belum dimuat, fallback true
// (anggap SELF/tidak exclude apa pun) — pola sama persis
// isAccOwnershipSelf() (modules/finance/akun.js, Sesi 192).
function isAssetOwnershipSelf(a){
if(typeof OwnershipEngine==='undefined')return true;
return OwnershipEngine.resolve(a).type==='SELF';
}
// s476a — Migrasi Investasi: D.assets -> D.investments (SSOT baru, lihat
// docs/s476-PLAN-migrate-investasi-to-holdings.md). Tabel padanan kategori
// Buku Aset (a.jenis, kosakata bebas/ICON) ke INVESTMENT_TYPES (kosakata
// tetap di investasi.js) -- TIDAK 1:1, sisanya fallback 'Lainnya'.
const ASSET_JENIS_TO_INVESTMENT_TYPE={
'Kripto':'Kripto',
'Reksadana':'Reksa Dana',
'Saham':'Saham',
'Deposito/Investasi':'Deposito',
'Emas/Logam Mulia':'Emas',
};
function mapAssetJenisToInvestmentType(jenis){
return ASSET_JENIS_TO_INVESTMENT_TYPE[jenis]||'Lainnya';
}
// migrateAssetInvestmentsToHoldings() — s476a: migrasi 1x-jalan tapi
// IDEMPOTENT (aman dipanggil berulang, mis. tiap Aset.renderList()) dari
// entri investasi lama di Buku Aset ke Holding (D.investments) via
// Investment.addHolding() (reuse, 0 validasi baru). Filter sumber SAMA
// PERSIS Aset.investmentPerformance() (isAssetOwnershipSelf(a) DAN
// (a.modalInvestasi!=null ATAU (a.hargaBeli!=null DAN a.jumlahUnit!=null))
// DAN buku>0), MINUS aset yang sudah ditandai `_migratedToInvestmentId`
// (idempotency: flag ADITIF di aset asal, aset itu sendiri TIDAK dihapus/
// diubah nilainya -- reversible, cuma disembunyikan di renderList()).
// owners[]/zakatable dibawa apa adanya (lihat tabel mapping di rencana
// sesi). Return {migrated,skipped} buat dipakai test/regresi.
function migrateAssetInvestmentsToHoldings(){
if(typeof Investment==='undefined'||typeof D==='undefined'||!D.assets)return{migrated:0,skipped:0};
// FIX (bug: aset tertaut manual ikut ke-migrasi lagi): sebelum fix ini, filter kandidat
// migrasi cuma exclude `_migratedToInvestmentId`, TIDAK exclude `investmentId` (tautan
// manual B1 lewat dropdown "🔗 Hubungkan ke Holding Investasi") -- beda dari pola exclude
// SAMA PERSIS yang sudah dipakai di totalValue() (aset.js), aset-keluarga.js,
// dana-kelolaan.js, invest-ai-widget.js, property-management-api.js (semua pakai
// `!a._migratedToInvestmentId` DAN `!a.investmentId` berdampingan). Akibatnya aset yang
// sudah ditautkan manual ke Holding tetap dianggap kandidat migrasi tiap renderList()
// jalan -> Holding DUPLIKAT terbuat (ROI +0.0%, avgPrice=currentPrice) & aset itu sendiri
// baru ditandai `_migratedToInvestmentId` -> hilang dari Buku Aset. Tambah `!a.investmentId`
// di sini, menyamakan pola exclude yang sudah ada di semua titik lain -- 0 logic lain diubah.
// FIX (bug: aset non-investasi ikut ke-migrasi -- mis. Kendaraan): "Harga
// Beli/Unit" & "Jumlah Unit" di assetModal itu field GENERIK yang tetap ada
// di form apa pun jenis asetnya (termasuk Kendaraan/Elektronik/dll), bukan
// eksklusif field investasi. Sebelum fix ini, `buku` di bawah dihitung dari
// kedua field itu TANPA cek jenis dulu -- begitu user isi harga beli+jumlah
// unit utk Kendaraan (mis. beli 1 motor Rp15jt), `buku`>0, lolos candidate,
// lalu ikut termigrasi ke Holding Investasi dgn type='Lainnya' (fallback
// mapAssetJenisToInvestmentType, jenis 'Kendaraan' tidak ada di mapping) --
// dan Kendaraan itu sendiri hilang dari Buku Aset (ditandai
// `_migratedToInvestmentId`). Tambah gate `!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]`
// di filter kandidat SEBELUM hitung buku, menyamakan syarat "jenis investasi
// yang dikenal" yang sudah dipakai di fallback baris di bawah (bug: fallback
// itu mengecek jenis tapi jalur utama hargaBeli*jumlahUnit tidak).
const candidates=D.assets.filter(isAssetOwnershipSelf).filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId).filter(a=>!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]).map(a=>{
let buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:null);
// FIX (jenis-investasi-tanpa-modal): "Modal Investasi" & "Harga Beli/Unit"
// di assetModal keduanya (opsional) -- kalau user pilih jenis investasi
// (Saham/Reksadana/Kripto/Deposito/Investasi/Emas) tapi cuma isi "Estimasi
// Nilai Saat Ini" (nilai) tanpa isi salah satu dari 2 field opsional itu,
// buku di atas tetap null selamanya -> aset TIDAK PERNAH lolos candidate,
// jadi tidak pernah bermigrasi ke Holding & tidak pernah muncul di tab
// Investasi (silently nyangkut di Buku Aset, terlihat sama seperti aset
// biasa). Fallback: kalau buku masih null TAPI jenis termasuk kategori
// investasi yang dikenal (ada di ASSET_JENIS_TO_INVESTMENT_TYPE, sudah
// didefinisikan di atas) DAN nilai>0, anggap buku=nilai (avgPrice=
// currentPrice=nilai, untung/rugi awal 0 -- akurat begitu user isi
// transaksi Beli pertama lewat 💱 Riwayat Transaksi atau edit manual di
// holding). Aset non-investasi (Tanah/Kendaraan/Rumah/dll, tidak ada di
// mapping) tidak terpengaruh sama sekali oleh fallback ini.
if(buku==null&&ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]&&a.nilai>0)buku=a.nilai;
return{a,buku};
}).filter(x=>x.buku!=null&&x.buku>0);
let migrated=0;
candidates.forEach(({a,buku})=>{
const hasUnit=a.modalInvestasi==null&&a.hargaBeli!=null&&a.jumlahUnit!=null&&a.jumlahUnit>0;
const unit=hasUnit?a.jumlahUnit:1;
const avgPrice=hasUnit?a.hargaBeli:buku;
const currentPrice=hasUnit?(a.nilai||0)/a.jumlahUnit:(a.nilai||0);
const holding=Investment.addHolding({
name:a.name,
type:mapAssetJenisToInvestmentType(a.jenis),
unit,
avgPrice,
currentPrice,
notes:a.notes||a.catatan||'',
zakatable:!!a.zakatable,
// purchaseDate (s476a2 — lihat AUDIT ROI/CAGR di docs/s476-PLAN-migrate-investasi-to-holdings.md):
// bawa a.tanggal apa adanya supaya Investment.holdingYieldPct()/portfolioSummary().yieldPct
// bisa menghitung CAGR holding hasil migrasi -- SEBELUM fix ini a.tanggal tidak pernah
// dibawa sama sekali (dikonfirmasi lewat audit), sehingga CAGR hilang total pasca-migrasi.
purchaseDate:a.tanggal||null,
});
if(Array.isArray(a.owners)&&a.owners.length&&typeof MultiOwnerEngine!=='undefined'){
try{Investment.setOwners(holding.id,a.owners);}catch(e){/* owners aset tidak valid utk holding -- biarkan default SELF 100%, tidak fatal */}
}
a._migratedToInvestmentId=holding.id;
migrated++;
});
if(migrated>0&&typeof save==='function')save();
return{migrated,skipped:candidates.length-migrated};
}
// findGhostMigratedAssets() -- audit user (Vario 125 nyangkut di D.investments):
// deteksi aset yang SUDAH ditandai `_migratedToInvestmentId` TAPI jenisnya TIDAK ada di
// ASSET_JENIS_TO_INVESTMENT_TYPE (mis. Kendaraan) -- kombinasi ini cuma mungkin terjadi
// lewat bug lama SEBELUM gate `!!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]` ditambahkan di
// migrateAssetInvestmentsToHoldings() (lihat catatan fix di atas), karena sejak gate itu
// ada, aset berjenis di luar mapping tidak akan pernah lolos jadi candidate lagi. Fix
// sumbernya TIDAK retroaktif -- holding "hantu" yang sudah kadung ke-migrasi sebelumnya
// tetap nyangkut di D.investments & aset asalnya tetap tersembunyi dari Buku Aset. Hanya
// disorot kalau holding tujuannya MASIH ADA di D.investments (kalau user sudah hapus
// manual holding-nya, tidak perlu disorot lagi -- 0 aksi paksa, cuma deteksi read-only,
// keputusan pulihkan/tidak tetap di tangan user lewat unmigrateAssetFromInvestment()).
function findGhostMigratedAssets(){
if(typeof D==='undefined'||!D.assets)return[];
const invIds=new Set((D.investments||[]).map((h)=>String(h.id)));
return D.assets.filter((a)=>a._migratedToInvestmentId&&!ASSET_JENIS_TO_INVESTMENT_TYPE[a.jenis]&&invIds.has(String(a._migratedToInvestmentId)));
}
// unmigrateAssetFromInvestment() -- pasangan findGhostMigratedAssets() di atas: membalik
// migrasi utk SATU aset -- hapus holding tujuannya (Investment.deleteHolding(), SUDAH ADA,
// sudah membersihkan D.investmentTx & entry Buku Utang tertaut, 0 logic baru di sini) &
// bersihkan `_migratedToInvestmentId` di asetnya supaya aset itu lolos lagi dari filter
// exclude di Aset.renderList()/totalValue() & kembali normal sbg entry Buku Aset biasa.
// Dipanggil manual dari UI (data-action), TIDAK pernah otomatis -- data user, keputusan
// tetap ada di tangan user. Return true kalau berhasil, false kalau assetId tidak
// ditemukan/tidak sedang ke-migrasi.
function unmigrateAssetFromInvestment(assetId){
if(typeof D==='undefined'||!D.assets)return false;
const a=D.assets.find((x)=>String(x.id)===String(assetId));
if(!a||!a._migratedToInvestmentId)return false;
const holdingId=a._migratedToInvestmentId;
if(typeof Investment!=='undefined')Investment.deleteHolding(holdingId);
a._migratedToInvestmentId=null;
if(typeof save==='function')save();
return true;
}
// syncLinkedAssetNilaiFromAkun() -- Sesi 422f: lengkapi arah sync yang selama
// ini BELUM ADA (dicatat sejak Sesi C: "arah sync SATU ARAH dari Aset->Akun,
// bukan sebaliknya"). Transaksi (bayar/terima/transfer) yang terjadi LANGSUNG
// di akun yang tertaut ke Aset (a.accountId) mengubah recalcAccBalance()
// akun itu, tapi `a.nilai` di Buku Aset sebelumnya tidak pernah ketarik balik
// -- user harus edit manual. Fix: dipanggil dari save() (titik tunggal,
// pola sama invalidateAccBalCache()), tiap aset yang py accountId di-cek:
// kalau saldo akun tertaut BEDA dari `a.nilai` sekarang, `a.nilai` dikoreksi
// mengikuti saldo akun. Idempotent: kalau akun tertaut baru saja disamakan
// oleh Aset.save()/saveOwners() (txDelta pattern), saldo akun = a.nilai ->
// 0 perubahan. Guard: skip aset tanpa accountId / akun yang sudah dihapus.
// SESI 449 (BUG-OWN-002 lanjutan): sebelumnya nilai akun tertaut di-scale
// balik lewat selfPorsi (nilai = ownPortion/selfPorsi%) karena akun tertaut
// dulu cuma nyimpen porsi SELF. Sekarang akun tertaut nyimpen NILAI PENUH
// instrumen (lihat "linkedAccNilai" di Aset.save()/saveOwners()), jadi arah
// sync balik ini juga disederhanakan: a.nilai = saldo akun apa adanya, 0
// scaling/pembagian porsi lagi (MultiOwnerEngine.selfPorsi() TIDAK dipakai
// di sini lagi).
// FIX (BUG-OWN-001, audit s444): sebelum fix ini, koreksi a.nilai di sini
// (arah Akun->Aset, dari transaksi riwayat NYATA yang terjadi langsung di
// akun tertaut) tidak pernah ketarik ke utang "dana titipan" milik owner
// NON-SELF (_syncOwnerDebts(), Buku Utang) -- utang jadi basi merefleksikan
// nilai LAMA, Kekayaan Bersih & Zakat Maal ikut salah hitung. Fix: begitu
// nilaiBaru!=a.nilai (transaksi riwayat beneran mengubah nilai), panggil
// Aset._syncOwnerDebts(a) juga -- guard typeof Aset (fungsi ini murni &
// dites headless tanpa Aset dimuat, lihat tests/asset-nilai-sync-from-akun-
// s422f.test.js) supaya tidak WAJIB Aset ada di scope.
function syncLinkedAssetNilaiFromAkun(){
if(!Array.isArray(D.assets)||typeof recalcAccBalance!=='function')return;
D.assets.forEach((a)=>{
if(!a.accountId)return;
const acc=(D.accounts||[]).find(x=>sameId(x.id,a.accountId));
if(!acc)return;
const nilaiBaru=recalcAccBalance(acc.id);
if(nilaiBaru!==a.nilai){
a.nilai=nilaiBaru;
if(typeof TitipanSync!=='undefined'&&typeof TitipanSync.reconcile==='function'){TitipanSync.reconcile(a);}else if(typeof Aset!=='undefined'&&typeof Aset._syncOwnerDebts==='function'){Aset._syncOwnerDebts(a);}
}
});
}
// AssetInsight — kartu "💡 Insight Aset" di paling atas halaman Aset (page-aset).
// Tujuan: kasih ringkasan cepat yg butuh perhatian, TANPA user perlu buka semua
// card di bawahnya satu-satu (Dashboard Aset, Performa Investasi, Histori
// Kekayaan, dst — semuanya sudah ada datanya, insight ini cuma menyorot bagian
// yg paling relevan). Read-only, tidak nyimpen state sendiri, cuma baca ulang
// D.assets & D.wealthSnapshots tiap kali dipanggil. Dipanggil dari
// Aset.renderList() spy selalu sinkron tiap save/delete/import/scan.
const AssetInsight={
// Ambang persentase 1 kategori aset dianggap "kurang terdiversifikasi".
CONCENTRATION_THRESHOLD:60,
// compute() — DIPISAH dari render() supaya bisa dipakai ulang oleh FinCoach.compute()
// (modules-calc.js) buat sinkronisasi ke widget "🩺 Insight Cepat" di Dashboard, TANPA
// mengubah sedikit pun teks/urutan insight yang sudah ada & sudah dites di aset.test.js —
// murni ekstraksi array `insights` yang sebelumnya dibangun langsung di render().
compute(){
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
const totalNilai=list.reduce((s,a)=>s+(a.nilai||0),0);
const insights=[];
// (1) Konsentrasi kategori — kalau 1 jenis aset mendominasi porsi terbesar,
// user mungkin belum sadar portofolionya kurang terdiversifikasi.
const perKategori={};
list.forEach(a=>{
const j=a.jenis||'Lainnya';
perKategori[j]=(perKategori[j]||0)+(a.nilai||0);
});
const kategoriSorted=Object.entries(perKategori).sort((a,b)=>b[1]-a[1]);
if(kategoriSorted.length&&totalNilai>0){
const[topJenis,topNilai]=kategoriSorted[0];
const pct=topNilai/totalNilai*100;
if(pct>=AssetInsight.CONCENTRATION_THRESHOLD){
insights.push(`⚠️ <b>${Math.round(pct)}%</b> dari total Aset kamu ada di kategori <b>${escapeHtml(topJenis)}</b> — pertimbangkan diversifikasi ke jenis aset lain supaya tidak terlalu bergantung pada satu instrumen.`);
}
}
// (2) Performer terbaik/terburuk — cuma aset yg ada data modalnya (sama
// dgn kriteria di Aset.renderInvestasi(), biar konsisten & tidak keisi
// angka semu dari aset yg belum diisi modalnya).
const tracked=list.map(a=>{
const buku=a.modalInvestasi!=null?a.modalInvestasi:(a.hargaBeli!=null&&a.jumlahUnit!=null?a.hargaBeli*a.jumlahUnit:null);
return{a,buku};
}).filter(x=>x.buku!=null&&x.buku>0);
if(tracked.length){
let best=null,worst=null;
tracked.forEach(({a,buku})=>{
const pct=((a.nilai||0)-buku)/buku*100;
if(!best||pct>best.pct)best={name:a.name,pct};
if(!worst||pct<worst.pct)worst={name:a.name,pct};
});
if(best&&(!worst||best.name!==worst.name||tracked.length===1)){
insights.push(`📈 Performa terbaik: <b>${escapeHtml(best.name)}</b> (${best.pct>=0?'+':''}${best.pct.toFixed(1)}%).`);
}
if(worst&&tracked.length>1&&worst.pct<0){
insights.push(`📉 Perlu dipantau: <b>${escapeHtml(worst.name)}</b> (${worst.pct.toFixed(1)}%) — cek lagi apakah masih sesuai rencana.`);
}
}
// (3) Growth Rate Aktual kekayaan bersih (dari snapshot Histori Kekayaan,
// pakai fungsi yg sama dgn card Histori Kekayaan supaya angkanya konsisten).
if(typeof Kekayaan!=='undefined'){
const cagrResult=Kekayaan.actualCAGR();
if(cagrResult&&!cagrResult.reason){
const pct=cagrResult.cagr*100;
insights.push(`${pct>=0?'🚀':'🔻'} Kekayaan Bersih tumbuh <b>${pct>=0?'+':''}${pct.toFixed(1)}%/tahun</b> (growth rate aktual dari snapshot, bukan asumsi).`);
}
}
return insights;
},
render(){
const card=document.getElementById('assetInsightCard');
const box=document.getElementById('assetInsightBody');
if(!card||!box)return;
const list=(D.assets||[]).filter(isAssetOwnershipSelf);
if(!list.length){card.classList.add('u-dnone');return;}
card.classList.remove('u-dnone');
const totalNilai=list.reduce((s,a)=>s+(a.nilai||0),0);
const insights=AssetInsight.compute();
box.innerHTML=`<div class=\"u-fs20 u-fw700 u-mb4\">${fmtFull(totalNilai)}</div><div class=\"u-fs11 u-t2 u-mb10\">Total nilai ${list.length} aset tercatat</div>`+
(insights.length?insights.map(t=>`<div class=\"u-fs12 u-lh15 u-mb8\">${t}</div>`).join(''):'<div class=\"u-fs12 u-t2 u-lh15\">Belum ada insight khusus — data aset kamu sejauh ini terlihat wajar.</div>');
}
};
// assetInvestmentLinkOptionsHtml(currentInvestmentId) -- Sesi B1: bangun <option> list utk
// dropdown "🔗 Hubungkan ke Holding Investasi" (assetModal), pola PERSIS
// vehicleAssetLinkOptionsHtml() (vehicle-core.js, S506) -- opsi pertama selalu "— Tidak
// terhubung —", sisanya HANYA D.investments yang ada (semua jenis, tidak difilter kategori
// krn holding investasi tidak punya sub-kategori kayak Aset.jenis). PURE function, hanya
// baca D.investments. Sesi ini CUMA field+dropdown (skema investmentId di Aset) -- 0 logic
// bridging/read-only lain, itu scope Sesi B2+.
function assetInvestmentLinkOptionsHtml(currentInvestmentId){
const opts=['<option value="">— Tidak terhubung —</option>'];
(D.investments||[]).forEach(h=>{
opts.push('<option value="'+h.id+'"'+(sameId(h.id,currentInvestmentId)?' selected':'')+'>'+escapeHtml(h.name||'?')+'</option>');
});
return opts.join('');
}
// _normalizeInstrumentName(s) -- SESI B4: normalisasi nama utk pencocokan name-similarity,
// pola PERSIS _normalizeAccNameForMatch() (scan-ocr.js, fuzzy account matcher) -- lowercase
// + buang semua selain a-z0-9. Dipakai Aset._findInvestmentMigrationCandidates() di bawah.
function _normalizeInstrumentName(s){
return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
}

const IDBStore={
_dbPromise:null,
DB_NAME:'kw_idb_v1',
STORE:'kv',
_open(){
if(IDBStore._dbPromise)return IDBStore._dbPromise;
IDBStore._dbPromise=new Promise((resolve,reject)=>{
if(!window.indexedDB){reject(new Error('IndexedDB tidak didukung browser ini'));return;}
let req;
try{ req=indexedDB.open(IDBStore.DB_NAME,1); }catch(e){reject(e);return;}
// BUGFIX (audit "tombol Katalog/Import PDF macet, 0 toast", laporan user): dulu tidak
// ada req.onblocked maupun timeout di sini. indexedDB.open() bisa BLOCKED (mis. tab/
// koneksi lain masih pegang DB versi lama) -- kalau itu terjadi, onsuccess/onerror
// TIDAK PERNAH terpanggil, _dbPromise gantung SELAMANYA, dan setiap fitur yang lewat
// IDBStore (VehicleCatalog/Import PDF Katalog/dll) jadi "tombol mati" tanpa toast
// (promise yang cuma diam menggantung bukan reject, jadi tidak ketangkep .catch() di
// dispatcher klik). Fix: (1) log onblocked biar kelihatan di console, (2) timeout 8
// detik yang reject dgn pesan jelas + reset cache, supaya paling buruk user dapat
// toast error yang bisa dilaporkan, bukan tombol yang diam mati total.
let settled=false;
const timeoutId=setTimeout(()=>{
if(settled)return;
settled=true;
IDBStore._dbPromise=null;
reject(new Error('Membuka IndexedDB terlalu lama (mungkin diblokir tab/koneksi lain) -- coba tutup tab lain yang membuka aplikasi ini, lalu ulangi.'));
},8000);
req.onblocked=()=>{ console.warn('IndexedDB open() diblokir -- kemungkinan ada koneksi lain (tab lain) yang masih terbuka di versi lama.'); };
req.onupgradeneeded=()=>{ try{ req.result.createObjectStore(IDBStore.STORE); }catch(e){} };
req.onsuccess=()=>{
if(settled)return;
settled=true;
clearTimeout(timeoutId);
const db=req.result;
// BUGFIX: kalau koneksi ini ditutup (mis. tab lain upgrade versi DB, atau
// browser menutup koneksi idle) TANPA reset di sini, _dbPromise tetap
// nyimpen janji lama yg resolve ke objek IDBDatabase yg sudah "closing" --
// pemanggilan .transaction() berikutnya lewat cache itu bakal langsung
// lempar InvalidStateError. Makanya begitu koneksi ditutup dgn cara apa
// pun, cache di-null-kan supaya panggilan _open() berikutnya buka koneksi
// baru yang sehat.
db.onversionchange=()=>{ try{db.close();}catch(e){} IDBStore._dbPromise=null; };
db.onclose=()=>{ IDBStore._dbPromise=null; };
resolve(db);
};
req.onerror=()=>{
if(settled)return;
settled=true;
clearTimeout(timeoutId);
IDBStore._dbPromise=null;
reject(req.error||new Error('Gagal membuka IndexedDB'));
};
});
return IDBStore._dbPromise;
},
async get(key){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readonly');
const req=tx.objectStore(IDBStore.STORE).get(key);
req.onsuccess=()=>resolve(req.result);
req.onerror=()=>reject(req.error||new Error('Gagal membaca dari IndexedDB'));
});
},'get("'+key+'")',undefined);
},
async set(key,value){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readwrite');
tx.objectStore(IDBStore.STORE).put(value,key);
tx.oncomplete=()=>resolve(true);
tx.onerror=()=>reject(tx.error||new Error('Gagal menulis ke IndexedDB'));
});
},'set("'+key+'")',false);
},
// BARU (item "BELUM DIKERJAKAN" resetApp(): dulu resetApp() cuma localStorage.clear(),
// tidak pernah menyentuh IndexedDB -- lihat docs/CATATAN-CEK-CLAUDE.md). Mengosongkan
// SELURUH object store 'kv' (termasuk kw_v4_mirror, lifeos:store, eie:store, ai:store,
// dst -- semua key yg lewat IDBStore.set()), bukan cuma 1 key, karena reset total memang
// harus membersihkan semua mirror data, bukan cuma mirror utama.
async clear(){
return IDBStore._withRetry(async()=>{
const db=await IDBStore._open();
return await new Promise((resolve,reject)=>{
const tx=db.transaction(IDBStore.STORE,'readwrite');
tx.objectStore(IDBStore.STORE).clear();
tx.oncomplete=()=>resolve(true);
tx.onerror=()=>reject(tx.error||new Error('Gagal mengosongkan IndexedDB'));
});
},'clear()',false);
},
// BUGFIX: pembungkus retry -- kalau kegagalan disebabkan koneksi yg lagi
// closing/invalid (InvalidStateError, atau nama "closing" khas Safari),
// buang cache _dbPromise & coba SEKALI lagi dgn koneksi baru sebelum
// benar-benar menyerah. Menghindari error IndexedDB numpuk terus tiap
// kali koneksi lama jadi basi (mis. abis hot-reload pas dev).
async _withRetry(fn,label,fallback){
try{
return await fn();
}catch(e){
const staleConn=e&&(e.name==='InvalidStateError'||/closing/i.test(e.message||''));
if(staleConn){
IDBStore._dbPromise=null;
try{ return await fn(); }
catch(e2){ console.error('IndexedDB '+label+' gagal (setelah retry):',e2); return fallback; }
}
console.error('IndexedDB '+label+' gagal:',e);
return fallback;
}
}
};
const PORTFOLIO_LABELS={
nilai:/nilai\s*(sekarang|saat\s*ini)/i,
modal:/modal\s*investasi/i,
hargaBeli:/harga\s*(beli|perolehan)/i,
// BUGFIX (laporan user): layar "Detail Portofolio" per-instrumen Bibit pakai label
// "Total Unit" (bukan "Jumlah Unit" seperti halaman Bibit lain) utk field yang sama --
// tambahkan sbg alternatif, TIDAK mengganti "jumlah unit" yang sudah ada.
jumlahUnit:/(?:jumlah|total)\s*unit/i
};
const TimelineW={
avgSurplus(){
if(typeof Pensiun!=='undefined')return Pensiun.avgSurplus();
return{surplus:0,months:0};
},
goals(){
const goals=[];
(D.renovProjects||[]).forEach(p=>{
if(typeof Renov==='undefined')return;
const t=Renov.totals(p);
if(t.sisa>0)goals.push({key:'renov-'+p.id,emoji:'🔨',label:'Renovasi: '+p.name,remaining:t.sisa,kind:'renov'});
});
(D.targets||[]).forEach(t=>{
if(t.isDanaDarurat)return;
const remaining=Math.max(0,(t.amount||0)-(t.saved||0));
if(remaining>0)goals.push({key:'target-'+t.id,emoji:t.emoji||'🎯',label:t.name,remaining,kind:'target'});
});
return goals;
},
waterfall(){
const{surplus,months}=TimelineW.avgSurplus();
const goals=TimelineW.goals();
let cursor=0;
const rows=goals.map(g=>{
const monthsNeeded=surplus>0?Math.ceil(g.remaining/surplus):null;
const startMonth=cursor;
const endMonth=monthsNeeded!=null?cursor+monthsNeeded:null;
if(endMonth!=null)cursor=endMonth;
return{...g,monthsNeeded,startMonth,endMonth};
});
return{rows,surplus,surplusMonths:months};
},
addMonthsToDate(n){
const d=new Date();
d.setDate(1);
d.setMonth(d.getMonth()+n);
return d;
},
render(){
const card=document.getElementById('timelineWCard');
if(!card)return;
const{rows,surplus,surplusMonths}=TimelineW.waterfall();
const pensiunP=D.pensiun||{};
const pensiunAda=pensiunP.usiaSekarang&&pensiunP.usiaPensiun&&pensiunP.accId;
if(!rows.length&&!pensiunAda){card.style.display='none';return;}
card.classList.remove('u-dnone');card.style.display='block';
let body='';
if(surplus<=0){
body+=`<div class="u-fs12 u-cacc2 u-r10 u-mb10 u-lh15" style="background:var(--accent2-soft);padding:8px 10px">⚠️ Rata-rata ${surplusMonths} bulan terakhir belum surplus (pemasukan ≤ pengeluaran), jadi linimasa di bawah belum bisa diproyeksikan realistis. Perbaiki dulu arus kas bulanan atau isi manual di masing-masing modul.</div>`;
} else {
body+=`<div class="u-fs11 u-t2 u-mb10 u-lh15">Diasumsikan seluruh rata-rata surplus ${surplusMonths} bulan terakhir (${fmtFull(surplus)}/bln) dipakai berurutan sesuai urutan di bawah. Ilustrasi, bukan alokasi otomatis.</div>`;
}
body+=rows.map((r,i)=>{
const dateLabel=(r.endMonth!=null)?TimelineW.addMonthsToDate(r.endMonth).toLocaleDateString('id-ID',{month:'long',year:'numeric'}):'—';
const yrs=r.monthsNeeded!=null?Math.floor(r.monthsNeeded/12):null;
const bln=r.monthsNeeded!=null?r.monthsNeeded%12:null;
const durLabel=r.monthsNeeded!=null?`${yrs?yrs+' th ':''}${bln} bln lagi (mulai bulan ke-${r.startMonth+1})`:'—';
return `<div style="display:flex;gap:10px;margin-bottom:${i===rows.length-1&&!pensiunAda?'0':'12px'}">
        <div class="u-flex u-fdcol u-aic">
          <div class="u-bgaccsoft u-flex u-aic u-jcc u-fs13" style="width:26px;height:26px;border-radius:50%">${r.emoji}</div>
          ${(i<rows.length-1||pensiunAda)?'<div class="u-flex1 u-mt2" style="width:2px;background:var(--border)"></div>':''}
        </div>
        <div class="u-flex1" style="padding-bottom:2px">
          <div class="u-fs13 u-fw700">${escapeHtml(r.label)}</div>
          <div class="u-fs11 u-t2 u-mt2">Sisa ${fmt(r.remaining)} · target selesai ~<b>${dateLabel}</b></div>
          <div class="u-fs11 u-t2">${durLabel}</div>
        </div>
      </div>`;
}).join('');
if(pensiunAda){
const n=Pensiun.sisaBulan();
const years=Math.floor(n/12),sisaBln=n%12;
const target=Number(pensiunP.targetDana)||0;
const proyeksi=Pensiun.proyeksi();
const onTrack=target>0&&proyeksi>=target;
body+=`<div class="u-flex u-gap10">
        <div class="u-flex u-fdcol u-aic">
          <div class="u-flex u-aic u-jcc u-fs13" style="width:26px;height:26px;border-radius:50%;background:var(--accent3-soft)">🏖️</div>
        </div>
        <div class="u-flex1">
          <div class="u-fs13 u-fw700">Pensiun (usia ${pensiunP.usiaSekarang}→${pensiunP.usiaPensiun})</div>
          <div class="u-fs11 u-t2 u-mt2">${years>0?years+' th ':''}${sisaBln} bln lagi · proyeksi dana ${fmt(proyeksi)}${target>0?' dari target '+fmt(target):''}</div>
          <div style="margin-top:1px" class="${onTrack?'green':'orange'} u-fs11 u-fw700">${target>0?(onTrack?'✅ Proyeksi on-track':'⚠️ Proyeksi masih kurang '+fmt(target-proyeksi)):'Isi target di modul Pensiun utk cek gap'}</div>
        </div>
      </div>`;
} else if(!rows.length){
card.style.display='none';return;
}
card.innerHTML=`<div class="card-title">🗺️ Linimasa Tujuan Finansial <span class="card-collapse-toggle" id="timelineWCard-chev" data-action="toggleCardCollapse" data-args='["timelineWCard","$event"]' aria-label="Buka/tutup bagian">▾</span></div><div class="card-collapse-body" id="timelineWCard-cbody">`+body+`</div>`;
applyOneCardCollapsePref('timelineWCard');
}
};
// BUGFIX-INTEGRASI: semua modul di atas dideklarasikan `const`, yang TIDAK
// otomatis nempel ke `window` walau file ini di-load lewat <script> biasa
// setAsetTab — split halaman Aset (page-aset) jadi 3 tab (Ringkasan/Buku
// Aset/Analisis & Pajak), pola SAMA PERSIS dgn setKeuanganTab (tx-list-cashflow.js)
// /setShopTab/setCnTab/setPajakTab: toggle class u-dnone per pane, TIDAK ada
// business logic baru. Semua card di dalam pane tetap dirender penuh oleh
// renderAssetList()/AlokasiAset.init()/renderWealthSnapshots() (dipanggil dari
// renderPageContent('aset') di modules-render.js) TERLEPAS dari tab mana yang
// lagi aktif -- sama seperti pola kartu ber-collapse yg sudah ada di app ini,
// cuma sekarang levelnya per-tab, bukan per-kartu.
const ASET_TAB_ORDER=['ringkasan','buku','analisis','manajemen','investasi'];
// S679 (rekomendasi #4 audit S677): breadcrumb tab utama, pola sama dgn
// KEU_TAB_LABEL (tx-list-cashflow.js).
const ASET_TAB_LABEL={ringkasan:'Ringkasan',buku:'Buku Aset',analisis:'Analisis & Pajak',manajemen:'Manajemen',investasi:'Investasi'};
function setAsetTab(t,el){
const asetTabBtns=document.querySelectorAll('#page-aset .cn-tab');
asetTabBtns.forEach(b=>b.classList.remove('active'));
let _activeBtn=el;
if(el) el.classList.add('active');
else { const idx=ASET_TAB_ORDER.indexOf(t); const btn=asetTabBtns[idx>=0?idx:0]; if(btn){btn.classList.add('active');_activeBtn=btn;} }
if(typeof scrollTabBarIntoView==='function') scrollTabBarIntoView(_activeBtn);
const asetBc=document.getElementById('asetBreadcrumbSub');
if(asetBc)asetBc.textContent=ASET_TAB_LABEL[t]||t;
document.getElementById('asetTab-ringkasan').classList.toggle('u-dnone', t!=='ringkasan');
document.getElementById('asetTab-ringkasan').style.display='';
document.getElementById('asetTab-buku').classList.toggle('u-dnone', t!=='buku');
document.getElementById('asetTab-buku').style.display='';
document.getElementById('asetTab-analisis').classList.toggle('u-dnone', t!=='analisis');
document.getElementById('asetTab-analisis').style.display='';
// Manajemen (dipindah dari Dashboard Hub) — pola sama 3 tab di atas.
document.getElementById('asetTab-manajemen').classList.toggle('u-dnone', t!=='manajemen');
document.getElementById('asetTab-manajemen').style.display='';
// Investasi (Fase 1, BUG-INV-001 Opsi 3 — lihat AUDIT-BUILD-UI-INVESTASI-OPSI3.md) — pola
// sama 4 tab di atas, PLUS render on-demand (InvestmentListUI.render(), bukan cuma toggle
// class) tepat saat tab ini yang jadi aktif -- kartu ringkasan/list holding di dalamnya
// SENGAJA tidak ikut dipanggil dari renderPageContent('aset') tiap buka #page-aset (beda
// dgn renderAssetList() dkk yg SELALU jalan) supaya tidak kerja 2x kalau tab ini tidak
// sedang dilihat user; renderPageContent('aset') tetap memanggilnya sekali di awal (lihat
// modules-render.js) utk kasus reload langsung ke tab ini / restore state.
const investTab=document.getElementById('asetTab-investasi');
if(investTab){
investTab.classList.toggle('u-dnone', t!=='investasi');
investTab.style.display='';
if(t==='investasi'&&typeof InvestmentListUI!=='undefined')InvestmentListUI.render();
}
}

// (bukan module). Dispatcher data-action (mis. data-action="Aset.exportXLSX",
// "AlokasiAset.setRisk", dst di index.html/app_production.html) resolve nama
// aksi lewat window[...], jadi TANPA baris ini semua binding tsb gagal diam2
// di production walau unit test tetap hijau (test harness expose modul
// langsung lewat context, bukan lewat window). Pola sama persis dgn bug
// OngkirCalc di cobek-pricing.js yg sudah pernah kejadian & diperbaiki
// sebelumnya — lihat CLAUDE.md.
// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 5/6: fungsi prediktif domain ASSET.
// Lihat RENCANA-SESI-RINGKAS.md untuk peta 6 sesi. "Inventory" SENGAJA
// DI-SKIP sesi ini (keputusan eksplisit) — lihat catatan sama di
// modules/finance/tx-list-cashflow.js. PURE/read-only, TIDAK PERNAH
// memanggil save(). Belum ada UI/tombol baru, belum ada wiring otomatis
// (itu tugas Sesi 6).
//
// predictAssetValue() SENGAJA tidak menduplikasi Penyusutan.hitung() —
// dia cuma memanggil fungsi itu dengan tanggalHitung di MASA DEPAN (bukan
// hari ini), karena Penyusutan.hitung() memang sudah menerima parameter
// tanggal sembarang, bukan cuma "sekarang". Kalau aset TIDAK punya
// penyusutan aktif, tidak ada model pertumbuhan/penurunan nilai yang bisa
// dipakai (rule-based, bukan tebak-tebakan) — nilai diasumsikan flat, sama
// filosofinya dgn estimateKmPerDay() yg balikin null kalau histori kurang.
// ---------------------------------------------------------------------------

// predictAssetValue({assetId, monthsAhead}) — proyeksi nilai buku 1 aset N
// bulan ke depan. Kalau aset punya penyusutan aktif (a.penyusutan.aktif),
// nilai prediksi = Penyusutan.hitung(a, tanggalMasaDepan).nilaiBuku (metode
// Garis Lurus/Saldo Menurun/Manual sesuai setting aset itu). Kalau tidak,
// balikin nilai flat (nilai sekarang) dgn metode:'flat' supaya pemanggil
// tahu ini bukan proyeksi asli, cuma nilai apa adanya.
function predictAssetValue({assetId,monthsAhead=12}={}){
const a=(D.assets||[]).find(x=>sameId(x.id,assetId));
if(!a)return{ok:false,reason:'Aset tidak ditemukan'};
const now=new Date();
const target=new Date(now.getFullYear(),now.getMonth()+monthsAhead,now.getDate());
const targetISO=dateToISO(target);
if(a.penyusutan&&a.penyusutan.aktif&&typeof Penyusutan!=='undefined'){
const hasil=Penyusutan.hitung(a,targetISO);
return{ok:true,assetId,assetName:a.name,nilaiSaatIni:a.nilai,nilaiPrediksi:hasil.nilaiBuku,metode:hasil.metode,monthsAhead,targetDate:targetISO};
}
return{ok:true,assetId,assetName:a.name,nilaiSaatIni:a.nilai,nilaiPrediksi:a.nilai,metode:'flat',monthsAhead,targetDate:targetISO};
}

// netWorthForecast({monthsAhead}) — proyeksi Kekayaan Bersih N bulan ke
// depan, dari Kekayaan.currentNetWorth() (nilai sekarang) di-compound pakai
// dua sumber, sesuai data yang tersedia (fallback berjenjang, tidak pernah
// mengarang angka):
//  1) Kekayaan.actualCAGR() — kalau histori snapshot (D.wealthSnapshots)
//     cukup (≥2 titik, rentang ≥25 hari, baseline & terakhir positif),
//     pakai growth rate historis nyata (metode:'cagr-snapshot').
//  2) predictCashflow() (tx-list-cashflow.js) — kalau snapshot belum cukup,
//     pakai proyeksi surplus/defisit kas bulanan (incAvg-expAvg) sbg
//     pertumbuhan kekayaan bersih linear (metode:'cashflow-delta'). Ini
//     TIDAK memperhitungkan perubahan nilai aset non-kas (mis. penyusutan),
//     jadi lebih kasar drpd opsi 1.
//  3) Kalau keduanya tidak tersedia, balikin {ok:false} apa adanya.
function netWorthForecast({monthsAhead=6}={}){
if(typeof Kekayaan==='undefined')return{ok:false,reason:'Kekayaan belum dimuat'};
const netWorthNow=Kekayaan.currentNetWorth();
const cagrResult=Kekayaan.actualCAGR();
const now=new Date();
const months=[];
if(cagrResult&&cagrResult.cagr!=null){
const monthlyRate=Math.pow(1+cagrResult.cagr,1/12)-1;
let nw=netWorthNow;
for(let i=1;i<=monthsAhead;i++){
nw=nw*(1+monthlyRate);
const d=new Date(now.getFullYear(),now.getMonth()+i,1);
months.push({month:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),netWorthProjected:nw});
}
return{ok:true,netWorthNow,metode:'cagr-snapshot',monthlyRate,months,projectedEnd:nw};
}
if(typeof predictCashflow==='function'){
const cf=predictCashflow({monthsAhead});
if(cf.ok){
let nw=netWorthNow;
cf.months.forEach((m)=>{
nw+=cf.monthlyNet;
months.push({month:m.month,netWorthProjected:nw});
});
return{ok:true,netWorthNow,metode:'cashflow-delta',monthlyNet:cf.monthlyNet,months,projectedEnd:nw};
}
}
return{ok:false,reason:'Data histori (snapshot kekayaan / transaksi) belum cukup untuk proyeksi'};
}

// ---------------------------------------------------------------------------
// Smart Delivery Engine, Sesi 8: rule domain ASSET utk AIDecision (lanjutan
// Sesi 7 — lihat RENCANA-SESI-RINGKAS.md). Rule: "proyeksi Kekayaan Bersih N
// bulan ke depan (netWorthForecast()) TURUN dari nilai sekarang" — dgn kata
// lain, tren negatif (bukan ambang nominal, karena "berapa Rp yang wajar
// turun" beda-beda per orang; tren negatif sudah cukup jadi sinyal awal).
// Cooldown lebih panjang (168 jam = mingguan) drpd rule finance karena aset &
// kekayaan bersih berubah lambat, tidak perlu re-alert tiap kali ada 1
// transaksi aset. TIDAK menduplikasi apa pun di UI Laporan Aset — rule ini
// masuk decisionLog AIDecision (dailyBriefing/simulate), bukan render kartu.
// ---------------------------------------------------------------------------

// _assetNetWorthDeclineCheck() — helper dipakai condition() & action().
function _assetNetWorthDeclineCheck(){
if(typeof netWorthForecast!=='function')return{trigger:false};
const fc=netWorthForecast({monthsAhead:6});
if(!fc.ok)return{trigger:false};
return{trigger:fc.projectedEnd<fc.netWorthNow,netWorthNow:fc.netWorthNow,projectedEnd:fc.projectedEnd,metode:fc.metode};
}

// ---------------------------------------------------------------------------
// Rule kedua ASSET (keputusan produk dikonfirmasi user): 'asset-zakat-due' —
// ada aset zakatable di Buku Aset dgn estimasi Zakat Maal (PajakAset.
// hitungZakatAset(), sudah ada) > 0. Ini PENGINGAT BERKALA (cooldown
// mingguan, sama spt asset-networth-declining), BUKAN pengecekan "sudah/belum
// dibayar" — app ini TIDAK menyimpan histori tanggal pembayaran zakat/haul
// sama sekali (dicek: tidak ada field itu di data manapun), jadi rule ini
// SENGAJA tidak berpura-pura tahu status bayar, cuma mengingatkan berkala
// selama estimasi Zakat Maal >= ambang nominal (default Rp0, artinya sama
// spt semula: trigger begitu ada zakat sama sekali) — sama semangatnya dgn
// hitungZakatAset() sendiri yang juga "TANPA cek haul/nishab terpisah".
// Ambang BISA DIATUR user (Sesi lanjutan, pola sama dgn getAIFinance-
// OverspendThreshold/getAIDeliveryThinMarginThreshold) lewat
// D.profile.aiAssetZakatMinThresholdRp, field baru di Pengaturan > 🤖 AI
// Asisten — berguna kalau user mau di-skip untuk zakat estimasi yang masih
// kecil/receh.
// ---------------------------------------------------------------------------
const AI_ASSET_ZAKAT_MIN_DEFAULT_RP=0;

// getAIAssetZakatMinThreshold()/setAIAssetZakatMinThreshold(rp) — getter/
// setter D.profile.aiAssetZakatMinThresholdRp, dipakai field Pengaturan
// (renderSettings()/autoSaveProfile()) & rule di bawah. Dijaga >=0.
function getAIAssetZakatMinThreshold(){
const v=D.profile&&D.profile.aiAssetZakatMinThresholdRp;
return(typeof v==='number'&&v>=0)?v:AI_ASSET_ZAKAT_MIN_DEFAULT_RP;
}
function setAIAssetZakatMinThreshold(rp){
const n=parseFloat(rp);
D.profile.aiAssetZakatMinThresholdRp=(Number.isFinite(n)&&n>=0)?n:AI_ASSET_ZAKAT_MIN_DEFAULT_RP;
return D.profile.aiAssetZakatMinThresholdRp;
}

function _assetZakatDueCheck(){
if(typeof PajakAset==='undefined'||typeof PajakAset.hitungZakatAset!=='function')return{trigger:false};
const z=PajakAset.hitungZakatAset();
const minThreshold=getAIAssetZakatMinThreshold();
return{trigger:z.totalZakat>minThreshold,totalNilai:z.totalNilai,totalZakat:z.totalZakat,jumlah:z.list.length,minThreshold};
}

let _assetAIRulesRegistered=false;
// registerAssetAIRules() — dipanggil sekali saat boot (self-test.js init()),
// idempotent lewat guard, return false kalau AIDecision belum ada.
function registerAssetAIRules(){
if(_assetAIRulesRegistered)return false;
if(typeof AIDecision==='undefined'||!AIDecision.rules||typeof AIDecision.rules.register!=='function')return false;
AIDecision.rules.register({
id:'asset-networth-declining',
category:'asset',
severity:'warning',
weight:4,
cooldownHours:168,
description:'Proyeksi Kekayaan Bersih 6 bulan ke depan (netWorthForecast) turun dari nilai sekarang.',
condition:()=>_assetNetWorthDeclineCheck().trigger,
action:()=>{
const c=_assetNetWorthDeclineCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Proyeksi Kekayaan Bersih 6 bulan ke depan turun dari ${fmt(c.netWorthNow)} ke ${fmt(c.projectedEnd)} (metode: ${c.metode}).`};
},
});
AIDecision.rules.register({
id:'asset-zakat-due',
category:'asset',
severity:'info',
weight:3,
cooldownHours:168,
description:'Ada aset zakatable di Buku Aset dengan estimasi Zakat Maal di atas ambang nominal (bisa diatur user, default Rp0) — pengingat berkala, TIDAK mengecek status sudah/belum dibayar (app belum menyimpan histori pembayaran zakat).',
condition:()=>_assetZakatDueCheck().trigger,
action:()=>{
const c=_assetZakatDueCheck();
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
return{message:`Estimasi Zakat Maal dari ${c.jumlah} aset zakatable (total nilai ${fmt(c.totalNilai)}) sekitar ${fmt(c.totalZakat)} — cek kartu 🧾 Pajak Aset kalau belum dibayar tahun ini.`};
},
});
if(typeof AssetOwnershipSplitPresenter!=='undefined'){
AIDecision.rules.register({
id:'asset-multi-owner-porsi-incomplete',
category:'asset',
severity:'warning',
weight:4,
cooldownHours:72,
description:'Ada aset dgn porsi kepemilikan (owners) sudah mulai diisi tapi belum valid/belum total 100%.',
condition:()=>AssetOwnershipSplitPresenter.incompletePortions().items.length>0,
action:()=>{
const items=AssetOwnershipSplitPresenter.incompletePortions().items;
const names=items.slice(0,3).map(x=>x.name).join(', ');
return{message:`${items.length} aset punya porsi kepemilikan belum lengkap (${names}${items.length>3?', dst':''}) — cek & lengkapi jadi total 100%.`};
},
});
AIDecision.rules.register({
id:'asset-multi-owner-profit-split-info',
category:'asset',
severity:'info',
weight:2,
cooldownHours:168,
description:'Ringkasan pembagian keuntungan otomatis utk aset multi-pemilik (>=2 pemilik dgn porsi valid).',
condition:()=>AssetOwnershipSplitPresenter.summary().items.some(x=>x.keuntungan>0),
action:()=>{
const items=AssetOwnershipSplitPresenter.summary().items.filter(x=>x.keuntungan>0);
const fmt=typeof fmtFull==='function'?fmtFull:(n=>'Rp '+Math.round(n||0).toLocaleString('id-ID'));
const top=items[0];
const rincian=top.splits.map(s=>`${s.ownerName} ${s.porsi}% (${fmt(s.bagian)})`).join(', ');
return{message:`${items.length} aset multi-pemilik untung — "${top.name}" untung ${fmt(top.keuntungan)}, dibagi: ${rincian}.`};
},
});
}
_assetAIRulesRegistered=true;
return true;
}

Object.assign(window,{ALOKASI_PRESETS,AlokasiAset,AssetInsight,Aset,Penyusutan,PajakAset,LaporanAset,IDBStore,PORTFOLIO_LABELS,TimelineW});
