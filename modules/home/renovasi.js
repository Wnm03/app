// renovasi.js — Domain Proyek Renovasi: RenovCalc (kalkulator material), Renov (proyek & item biaya), RenovAI (saran AI kebutuhan/ukuran)
// Dipindah ke modules/home/renovasi.js (Sesi 13 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// CATATAN: modul-modul ini dipindah ke file baru ini dari features-renovasi-pajak-aset-order.js (v62), yang sebelumnya juga berisi domain Aset/Kekayaan (AlokasiAset/Aset/IDBStore/PORTFOLIO_LABELS/TimelineW, sekarang di aset.js) & Worth It/Prioritas Belanja (WorthIt, sekarang di worthit.js).
// File lama features-renovasi-pajak-aset-order.js DIHAPUS setelah ini karena tidak ada isi tersisa.
// Renov.saveItem() memakai RenovCalc._pendingDetail lewat variabel global (diisi RenovCalc.useMaterial() saat modal Kalkulator Bantu Material dipakai) — aman krn 1 file yang sama sekarang.
// PENTING: file ini HARUS dimuat sesuai urutan build.js (GROUP_A/GROUP_B) karena beberapa modul saling referensi. Urutan grup ini: pajak-pbb-zakat.js, budget.js, car-notes.js, chat-action-handlers.js, edukasi-dana.js, sewakios.js, hidup-seimbang.js, linktx.js, renovasi.js, aset.js, worthit.js

const RenovCalc={
_matTotal:0,_matKebutuhan:0,_pendingDetail:null,
open(saved){
if(saved&&saved.type==='material'){
document.getElementById('rcMatNama').value=saved.nama||'';
document.getElementById('rcMatSatuan').value=saved.satuan||'m3';
document.getElementById('rcMatHitungUkuran').checked=!!saved.hitungUkuran;
document.getElementById('rcMatP').value=saved.p||'';
document.getElementById('rcMatL').value=saved.l||'';
document.getElementById('rcMatT').value=saved.t||'';
document.getElementById('rcMatLangsung').value=saved.langsung||'';
document.getElementById('rcMatBuangan').value=saved.buangan||'0';
document.getElementById('rcMatHarga').value=saved.harga||'';
} else {
['rcMatNama','rcMatP','rcMatL','rcMatT','rcMatLangsung','rcMatHarga'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
document.getElementById('rcMatBuangan').value='0';
document.getElementById('rcMatSatuan').value='m3';
document.getElementById('rcMatHitungUkuran').checked=false;
}
RenovCalc.onMatSatuanChange();
RenovCalc.toggleHitungUkuran();
openModal('renovCalcModal');
},
onMatSatuanChange(){
const s=document.getElementById('rcMatSatuan').value;
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
const lbl=labelMap[s];
document.getElementById('rcMatHargaLbl').textContent='Harga per '+lbl+' (Rp)';
document.getElementById('rcMatLangsungLbl').textContent='Jumlah Kebutuhan ('+lbl+')';
document.getElementById('rcMatLWrap').style.display=(s==='m3'||s==='m2')?'block':'none';
document.getElementById('rcMatTWrap').style.display=s==='m3'?'block':'none';
document.getElementById('rcMatBuanganWrap').style.display=s==='batang'?'none':'block';
RenovCalc.calcMaterial();
},
toggleHitungUkuran(){
const on=document.getElementById('rcMatHitungUkuran').checked;
const s=document.getElementById('rcMatSatuan').value;
const showUkuran=on&&s!=='batang';
document.getElementById('rcMatUkuranWrap').style.display=showUkuran?'block':'none';
document.getElementById('rcMatLangsungWrap').style.display=showUkuran?'none':'block';
RenovCalc.calcMaterial();
},
calcMaterial(){
const satuan=document.getElementById('rcMatSatuan').value;
const hitungUkuran=document.getElementById('rcMatHitungUkuran').checked&&satuan!=='batang';
const buangan=parseFloat(document.getElementById('rcMatBuangan').value)||0;
const harga=parseFloat(document.getElementById('rcMatHarga').value)||0;
let kebutuhanDasar=0;
if(hitungUkuran){
const p=parseFloat(document.getElementById('rcMatP').value)||0;
const l=parseFloat(document.getElementById('rcMatL').value)||0;
const t=parseFloat(document.getElementById('rcMatT').value)||0;
if(satuan==='m3')kebutuhanDasar=p*l*t;
else if(satuan==='m2')kebutuhanDasar=p*l;
else kebutuhanDasar=p;
} else {
kebutuhanDasar=parseFloat(document.getElementById('rcMatLangsung').value)||0;
}
const kebutuhanFinal=satuan==='batang'?Math.ceil(kebutuhanDasar*(1+buangan/100)):Math.round(kebutuhanDasar*(1+buangan/100)*100)/100;
const total=kebutuhanFinal*harga;
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
document.getElementById('rcMatKebutuhan').textContent=kebutuhanFinal.toLocaleString('id-ID')+' '+labelMap[satuan];
document.getElementById('rcMatTotal').textContent=fmtFull(total);
RenovCalc._matTotal=total;
RenovCalc._matKebutuhan=kebutuhanFinal;
},
useMaterial(){
const total=RenovCalc._matTotal||0;
if(total<=0){toast('⚠️ Isi dulu kebutuhan & harga satuannya');return;}
const nama=document.getElementById('rcMatNama').value.trim()||'Material';
const labelMap={m3:'m³',m2:'m²',meter:'meter',batang:'batang/pcs'};
const satuan=document.getElementById('rcMatSatuan').value;
const suggestName=`${nama} (${(RenovCalc._matKebutuhan||0).toLocaleString('id-ID')} ${labelMap[satuan]})`;
const kebutuhanText=document.getElementById('rcMatKebutuhan').textContent||'';
const hargaSatuan=parseFloat(document.getElementById('rcMatHarga').value)||0;
document.getElementById('renovItemHarga').value=Math.round(total);
const nameEl=document.getElementById('renovItemName');
if(nameEl)nameEl.value=suggestName;
RenovCalc._pendingDetail={
type:'material',nama,satuan,
hitungUkuran:document.getElementById('rcMatHitungUkuran').checked,
p:document.getElementById('rcMatP').value,
l:document.getElementById('rcMatL').value,
t:document.getElementById('rcMatT').value,
langsung:document.getElementById('rcMatLangsung').value,
buangan:document.getElementById('rcMatBuangan').value,
harga:document.getElementById('rcMatHarga').value,
total:Math.round(total),
text:'Material — '+kebutuhanText+' × '+fmtFull(hargaSatuan)+'/'+labelMap[satuan]
};
closeModal('renovCalcModal');
toast('✅ Hasil hitung material dipakai ke form item');
}
};
function _renovItemPaidAmount(it){
if(!it)return 0;
if(Array.isArray(it.payments))return it.payments.reduce((sum,p)=>sum+Math.max(0,Number(p&&p.amount)||0),0);
return it.paid?Math.max(0,Number(it.harga)||0):0;
}
function _renovStatMoney(n){const v=Math.round(Number(n)||0),a=Math.abs(v);if(a>=1e9){const u=a>=1e12?1e12:1e9,x=(v/u).toFixed(2).replace(/\.?0+$/,'').replace('.',',');return 'Rp '+x+(u===1e12?' T':' M');}return fmtFull(v);}
function _renovSetStat(id,n){const el=document.getElementById(id);if(!el)return;el.textContent=_renovStatMoney(n);el.title=fmtFull(n);}
function _renovSameId(a,b){return typeof sameId==='function'?sameId(a,b):String(a)===String(b);}
// S2823: Dana Proyek = DP/Termin masuk - belanja yang keluar dari REKENING PROYEK (bukan semua pembayaran dari akun mana pun). Tanpa helper sumber dana -> perilaku lama.
function _renovFundCalc(p,incoming,paid){if(typeof renovProjectFund==='function'){try{return renovProjectFund(p,incoming);}catch(e){console.warn('[Renov] sumber dana gagal',e);}}return{fund:incoming-paid,breakdown:null};}
// Fondasi Dana Proyek Klien — data lama tidak diklasifikasi otomatis.
function renovHasClientObligations(p){if(!p)return false;return (D.transactions||[]).some(t=>t&&((t.renovDpProjectId!=null&&String(t.renovDpProjectId)===String(p.id))||(t.renovRefundProjectId!=null&&String(t.renovRefundProjectId)===String(p.id))||(t.renovProjectLinkId!=null&&String(t.renovProjectLinkId)===String(p.id))))||(p.items||[]).some(it=>it&&(it.paid||it.txId||(it.payments||[]).length));}
// S2840: DP (income renovDpProjectId) / refund (expense renovRefundProjectId) tertaut proyek = aliran dana klien nyata.
function renovHasClientFlows(p){if(!p)return false;return (D.transactions||[]).some(t=>t&&((t.type==='income'&&t.renovDpProjectId!=null&&String(t.renovDpProjectId)===String(p.id))||(t.type==='expense'&&t.renovRefundProjectId!=null&&String(t.renovRefundProjectId)===String(p.id))));}
function renovClassifyProject(p,dana,by){if(!p||!['klien','pribadi'].includes(dana))return{ok:false,reason:'Klasifikasi tidak valid'};const old=p.dana||'belum-diklasifikasi';if(old===dana)return{ok:true,unchanged:true};if(old==='klien'&&renovHasClientFlows(p))return{ok:false,reason:'Proyek sudah punya DP/refund klien; klasifikasi tidak bisa diubah dari dana klien (dana klien akan hilang dari pembukuan). Selesaikan lewat refund/pencairan laba.'};if((p.labaLedger||[]).length)return{ok:false,reason:'Klasifikasi terkunci setelah ledger laba terisi'};if(!Array.isArray(p.danaHistory))p.danaHistory=[];p.danaHistory.push({dari:old,ke:dana,tanggal:todayStr(),dibuat:new Date().toISOString(),oleh:String(by||D.profile?.nama||'Profil perangkat')});p.dana=dana;return{ok:true,old,dana};}
// Temuan uji browser: renovAccountOwners() mengembalikan [{ownerId:'SELF',porsi:100}] utk akun biasa (default resolver). Itu BUKAN titipan.
// Titipan = ada pemilik selain SELF.
function _renovIdSelf(id){return String(id==null?'':id).trim().toUpperCase()==='SELF';}
function renovAkunTitipan(accountId){const o=typeof renovAccountOwners==='function'?renovAccountOwners(accountId):[];return o.some(x=>x&&x.ownerId!=null&&!_renovIdSelf(x.ownerId));}
// S2841: 1 SOT 'akun dalam cakupan saldo pribadi' = predikat totalSaldoAkun() (includeInBalance, bukan tertaut aset, isAccOwnershipSelf->OwnershipEngine) + bukan titipan.
// Dulu ada cek ad-hoc a.ownership||a.ownerType & field mati (assetId/assetLinkId/investmentId/holdingId) yg bisa beda dgn engine.
function _renovAccIsSelf(a){if(typeof isAccOwnershipSelf==='function')return !!isAccOwnershipSelf(a);return String((a&&a.ownership)||'SELF').trim().toUpperCase()==='SELF';}
function renovAccountScope(accountId){const a=(D.accounts||[]).find(x=>x&&sameId(x.id,accountId));if(!a)return{ok:false,reason:'Akun tidak ditemukan'};if(a.includeInBalance===false)return{ok:false,reason:'Akun tidak masuk saldo'};if(!_renovAccIsSelf(a))return{ok:false,reason:'Akun bukan milik sendiri (SELF)'};if(typeof isAccLinkedToAsset==='function'&&isAccLinkedToAsset(accountId))return{ok:false,reason:'Akun tertaut aset/investasi'};if(renovAkunTitipan(accountId))return{ok:false,reason:'Akun punya porsi pemilik lain (titipan)'};return{ok:true,reason:''};}
function renovClientAccountEligible(accountId){return renovAccountScope(accountId).ok;}
function _renovClientProjectAccounts(pid){return new Set((D.transactions||[]).filter(t=>t&&t.type==='income'&&String(t.renovDpProjectId)===String(pid)&&t.accountId).map(t=>String(t.accountId)));}
function renovClientFundState(p){if(!p||p.dana!=='klien')return{status:'ABU',reason:'Belum diklasifikasi'};const txs=D.transactions||[],dp=txs.filter(t=>t&&t.type==='income'&&String(t.renovDpProjectId)===String(p.id)),refunds=txs.filter(t=>t&&t.type==='expense'&&String(t.renovRefundProjectId)===String(p.id));let incoming=0,returned=0,cost=0,diLuarSaldo=0,diNonSelf=0,issues=[];dp.forEach(t=>{if(t.hitungKas===false){issues.push('DP bertanda Catatan saja');return;}const _n=Math.max(0,Number(t.amount)||0);incoming+=_n;const _o=_renovDpOutside(t.accountId);if(_o.luarSaldo)diLuarSaldo+=_n;if(_o.nonSelf)diNonSelf+=_n;if(!renovClientAccountEligible(t.accountId))issues.push('DP di luar cakupan saldo pribadi');});refunds.forEach(t=>returned+=Math.max(0,Number(t.amount)||0));(p.items||[]).forEach(it=>(Array.isArray(it.payments)?it.payments:(it.paid?[{txId:it.txId,amount:it.harga}]:[])).forEach(pay=>{const n=Math.max(0,Number(pay&&pay.amount)||0);if(!n)return;const tx=txs.find(t=>t&&sameId(t.id,pay.txId));if(!tx){issues.push('Pembayaran tanpa transaksi');return;}if(renovAkunTitipan(tx.accountId)||(tx.deductionOwnerId&&!_renovIdSelf(tx.deductionOwnerId))){issues.push('Pembayaran dari akun titipan');return;}if(pay.sumberDana==='proyek'||(pay.sumberDana==null&&_renovClientProjectAccounts(p.id).has(String(tx.accountId))))cost+=n;else if(pay.sumberDana!=='talangan-pribadi'&&pay.sumberDana!=='talangan-tagih')issues.push('Sumber dana pembayaran belum dikonfirmasi');}));if(txs.some(t=>t&&t.type==='income'&&t.renovDpProjectId!=null&&!D.renovProjects.some(x=>sameId(x.id,t.renovDpProjectId))))issues.push('DP proyek yatim');const pencairan=renovPencairanValid(p);return{status:issues.length?'KUNING':'HIJAU',reason:issues.join('; '),incoming,returned,cost,pencairan,diLuarSaldo,diNonSelf,danaTertahan:incoming-returned-cost-pencairan};}
function renovDanaTertahan(p){const x=renovClientFundState(p);return p&&p.dana==='klien'&&x.status!=='ABU'?Math.max(0,x.danaTertahan||0):0;}
// S2841: DP di akun yang TIDAK ada di totalSaldoAkun() tidak boleh dikurangkan dari saldo pribadi (kurang-ganda), dan DP di akun non-SELF sudah dihitung di DanaKelolaan.byType() (hitung-ganda).
// PENGECUALIAN SENGAJA: akun TERTAUT aset/investasi -> dana klien ikut nilai Aset (Kekayaan Bersih = saldo pribadi + nilai aset), jadi pengurangan lewat saldo pribadi
// DIPERTAHANKAN (perilaku lama; Data Health Check sudah memperingatkan, langkah manual). Akun titipan SELF berporsi pemilik lain: tetap ada di totalSaldoAkun() -> tetap dikurangkan.
function _renovDpOutside(accountId){const a=(D.accounts||[]).find(x=>x&&sameId(x.id,accountId));if(!a)return{luarSaldo:false,nonSelf:false};if(typeof isAccLinkedToAsset==='function'&&isAccLinkedToAsset(accountId))return{luarSaldo:false,nonSelf:false};const nonSelf=!_renovAccIsSelf(a);return{luarSaldo:nonSelf||a.includeInBalance===false,nonSelf};}
function renovDanaTertahanDalamSaldo(p){const x=renovClientFundState(p);if(!p||p.dana!=='klien'||x.status==='ABU')return 0;return Math.max(0,Math.max(0,x.danaTertahan||0)-(x.diLuarSaldo||0));}
function renovDanaTertahanUntukKelolaan(p){const x=renovClientFundState(p);if(!p||p.dana!=='klien'||x.status==='ABU')return 0;return Math.max(0,Math.max(0,x.danaTertahan||0)-(x.diNonSelf||0));}
// S2840: DP/refund hanya aliran klien bila proyeknya (masih) berklasifikasi 'klien'; proyek tak ditemukan (yatim) tetap dianggap klien agar tidak bocor ke pemasukan pribadi.
function _renovFlowProjectKlien(pid){const p=(D.renovProjects||[]).find(x=>x&&sameId(x.id,pid));return !p||p.dana==='klien';}
function isAliranKlien(t){if(!t)return false;if(t.type==='income'&&t.renovDpProjectId!=null)return _renovFlowProjectKlien(t.renovDpProjectId);if(t.type==='expense'&&t.renovRefundProjectId!=null)return _renovFlowProjectKlien(t.renovRefundProjectId);if(t.type==='expense'&&t.renovProjectLinkId!=null){const p=(D.renovProjects||[]).find(x=>sameId(x.id,t.renovProjectLinkId));if(p&&p.dana==='klien'){const it=(p.items||[]).find(x=>sameId(x.id,t.renovItemLinkId));const pay=it&&Array.isArray(it.payments)?it.payments.find(x=>sameId(x.txId,t.id)):null;return !!(pay&&(pay.sumberDana==='proyek'||(pay.sumberDana==='talangan-tagih'&&renovHasTalanganPiutang(pay.id))));}}return false;}
function renovHasTalanganPiutang(paymentId){return (D.piutang||[]).some(x=>x&&x.renovPaymentId!=null&&sameId(x.renovPaymentId,paymentId));}
function renovEnsureTalanganPiutang(p,it,pay,nilai){if(!p||!it||!pay)return{ok:false,reason:'Pembayaran tidak ditemukan'};const n=Math.round(Number(nilai==null?pay.amount:nilai));if(!(n>0)||n>Math.round(Number(pay.amount)||0))return{ok:false,reason:'Nilai piutang harus >0 dan tidak melebihi pembayaran'};if(!String(p.klien||'').trim())return{ok:false,reason:'Isi nama klien proyek (debitur) dahulu'};if(!Array.isArray(D.piutang))D.piutang=[];const ex=D.piutang.find(x=>x&&x.renovPaymentId!=null&&sameId(x.renovPaymentId,pay.id));if(ex)return{ok:true,existing:true,piutang:ex};const row={id:uid(),name:'Talangan proyek: '+p.name+' ('+p.klien+')',nilai:n,tanggal:pay.date||todayStr(),jatuhTempo:'',catatan:'Talangan pembayaran item proyek dengan hak tagih ke klien',lunas:false,renovProjectId:p.id,renovPaymentId:pay.id,renovTxId:pay.txId};if(typeof BillDebtPiutangCanonicalWriter!=='undefined'&&BillDebtPiutangCanonicalWriter&&typeof BillDebtPiutangCanonicalWriter.add==='function'){BillDebtPiutangCanonicalWriter.ensure&&BillDebtPiutangCanonicalWriter.ensure();BillDebtPiutangCanonicalWriter.add('piutang',row);}else D.piutang.push(row);return{ok:true,piutang:row};}
function renovRemoveUnpaidTalanganPiutang(match){if(!Array.isArray(D.piutang)||!D.piutang.length)return false;const before=D.piutang.length,pred=x=>x&&x.renovPaymentId!=null&&!x.lunas&&match(x);if(typeof BillDebtPiutangCanonicalWriter!=='undefined'&&BillDebtPiutangCanonicalWriter&&typeof BillDebtPiutangCanonicalWriter.removeByPredicate==='function')BillDebtPiutangCanonicalWriter.removeByPredicate('piutang',pred);else D.piutang=D.piutang.filter(x=>!pred(x));return D.piutang.length<before;}
// ===== FASE 4–5: Ledger laba proyek klien (append-only) =====
// Keputusan: metode "selesai + terverifikasi"; talangan tanpa hak tagih tetap expense pribadi (bukan biaya proyek); zakat dihitung saat PENCAIRAN.
// Ledger ada di p.labaLedger (ikut modul renov). Tidak ada transaksi baru di D.transactions: pencairan = entri ledger.
function renovLedger(p){return p&&Array.isArray(p.labaLedger)?p.labaLedger.filter(e=>e&&typeof e==='object'):[];}
function renovLedgerSums(p){const L=renovLedger(p);let akui=0,koreksi=0,cairkan=0,batal=0;const batalRef=new Set();L.forEach(e=>{const n=Math.max(0,Number(e.jumlah)||0);if(e.tipe==='akui')akui+=n;else if(e.tipe==='koreksi')koreksi+=n;else if(e.tipe==='cairkan')cairkan+=n;else if(e.tipe==='batal-cairkan'&&e.ref!=null&&!batalRef.has(String(e.ref))){const src=L.find(x=>x.tipe==='cairkan'&&String(x.id)===String(e.ref));if(src){batalRef.add(String(e.ref));batal+=Math.max(0,Number(src.jumlah)||0);}}});return{akui,koreksi,cairkan,batal,labaDiakuiBersih:akui-koreksi,pencairanValid:cairkan-batal,batalRef};}
function renovPencairanValid(p){return renovLedgerSums(p).pencairanValid;}
function renovCairkanAktif(p){const s=renovLedgerSums(p);return renovLedger(p).filter(e=>e.tipe==='cairkan'&&!s.batalRef.has(String(e.id)));}
// Cadangan biaya: 0 bila atestasi "semua biaya tercatat"; selain itu max(sisa rencana, angka yang diisi).
function renovCadangan(p){const a=p&&p.atestasi;if(!a)return 0;if(a.semuaBiayaTercatat)return 0;const plan=(p.items||[]).reduce((s,it)=>s+(Number(it.harga)||0),0),paid=(p.items||[]).reduce((s,it)=>{const pays=Array.isArray(it.payments)?it.payments:(it.paid?[{amount:it.harga}]:[]);return s+pays.reduce((x,y)=>x+(Number(y&&y.amount)||0),0);},0);return Math.max(Math.max(0,plan-paid),Math.max(0,Number(a.cadangan)||0));}
function renovLabaSummary(p){const sums=renovLedgerSums(p),st=renovClientFundState(p),klien=!!p&&p.dana==='klien';const selesai=!!p&&p.status==='selesai'&&!!p.atestasi;const rab=Math.max(0,Number(p&&p.rab)||0),penerimaanBersih=st.status==='ABU'?0:(st.incoming||0)-(st.returned||0),biaya=st.cost||0,cadangan=renovCadangan(p);const syarat=klien&&selesai&&st.status==='HIJAU';const labaMaks=syarat?Math.max(0,Math.min(rab,penerimaanBersih)-biaya-cadangan):0;const belum=sums.labaDiakuiBersih-sums.pencairanValid;const labaMaksHidup=(klien&&st.status!=='ABU')?Math.max(0,Math.min(rab,penerimaanBersih)-biaya-cadangan):0;const koreksiDiperlukan=sums.labaDiakuiBersih>0&&st.status!=='ABU'&&labaMaksHidup<sums.labaDiakuiBersih;const kelebihanPencairan=belum<0;const bisaAkui=syarat?Math.max(0,labaMaks-sums.labaDiakuiBersih):0;const batasPencairan=(syarat&&!koreksiDiperlukan)?Math.max(0,belum):0;let alasan='';if(!klien)alasan='Proyek belum diklasifikasi sebagai dana klien';else if(p.status!=='selesai')alasan='Proyek belum ditandai selesai';else if(!p.atestasi)alasan='Atestasi biaya belum dibuat';else if(st.status!=='HIJAU')alasan='Status dana '+st.status+(st.reason?' ('+st.reason+')':'');return{...sums,status:st.status,statusReason:st.reason||'',syarat,alasan,rab,penerimaanBersih,biaya,cadangan,labaMaks,bisaAkui,labaBelumDicairkan:belum,batasPencairan,koreksiDiperlukan,kelebihanPencairan,estimasiMargin:(p&&p.status!=='selesai')?Math.max(0,rab-(p.items||[]).reduce((s,it)=>s+(Number(it.harga)||0),0)):0};}
function renovLedgerEntry(p,tipe,jumlah,o){o=o||{};const sm=renovLabaSummary(p);return{id:uid(),kunci:String(o.kunci||''),tipe,jumlah:Math.round(Number(jumlah)),tanggal:o.tanggal||todayStr(),dibuat:new Date().toISOString(),oleh:String(o.oleh||(D.profile&&D.profile.nama)||'Profil perangkat'),ref:o.ref==null?null:o.ref,catatan:String(o.catatan||''),dasar:{penerimaanBersih:sm.penerimaanBersih,biayaDanaProyek:sm.biaya,cadangan:sm.cadangan,rab:sm.rab,labaMaks:sm.labaMaks,status:sm.status,atestasi:!!(p&&p.atestasi)}};}
// Menambah satu entri (append-only). Idempoten lewat kunci; rollback bila save() gagal.
function renovLedgerAppend(p,entry){if(!Array.isArray(p.labaLedger))p.labaLedger=[];if(entry.kunci&&p.labaLedger.some(e=>e&&e.kunci===entry.kunci))return{ok:true,duplicate:true};p.labaLedger.push(entry);if(typeof save==='function'&&save()===false){p.labaLedger.pop();return{ok:false,reason:'Penyimpanan gagal'};}return{ok:true,entry};}
function renovTandaiSelesai(p,o){o=o||{};if(!p||p.dana!=='klien')return{ok:false,reason:'Hanya proyek dana klien'};if(p.status==='arsip'||p.status==='batal')return{ok:false,reason:'Proyek berstatus '+p.status};if(!o.semuaBiayaTercatat&&!(Number(o.cadangan)>0))return{ok:false,reason:'Atestasi biaya: centang "semua biaya tercatat" atau isi cadangan biaya'};const old={status:p.status,tglSelesai:p.tglSelesai,atestasi:p.atestasi};p.status='selesai';p.tglSelesai=o.tanggal||todayStr();p.atestasi={tanggal:o.tanggal||todayStr(),dibuat:new Date().toISOString(),oleh:String(o.oleh||(D.profile&&D.profile.nama)||'Profil perangkat'),semuaBiayaTercatat:!!o.semuaBiayaTercatat,cadangan:Math.max(0,Math.round(Number(o.cadangan)||0))};if(typeof save==='function'&&save()===false){p.status=old.status;p.tglSelesai=old.tglSelesai;p.atestasi=old.atestasi;if(p.status===undefined)delete p.status;if(p.tglSelesai===undefined)delete p.tglSelesai;if(p.atestasi===undefined)delete p.atestasi;return{ok:false,reason:'Penyimpanan gagal'};}return{ok:true};}
function renovBukaSelesai(p){if(!p||p.status!=='selesai')return{ok:false,reason:'Proyek tidak berstatus selesai'};if(renovLedger(p).length)return{ok:false,reason:'Tidak bisa dibuka kembali setelah ledger laba terisi; gunakan koreksi'};const old={status:p.status,tglSelesai:p.tglSelesai,atestasi:p.atestasi};p.status='aktif';delete p.tglSelesai;delete p.atestasi;if(typeof save==='function'&&save()===false){p.status=old.status;p.tglSelesai=old.tglSelesai;p.atestasi=old.atestasi;return{ok:false,reason:'Penyimpanan gagal'};}return{ok:true};}
function _renovDupKey(p,o){const k=o&&o.kunci;return !!k&&renovLedger(p).some(e=>e.kunci===k);}
function _renovAmt(n){const v=Math.round(Number(n));return Number.isFinite(v)&&v>0?v:0;}
function renovAkuiLaba(p,jumlah,o){if(_renovDupKey(p,o))return{ok:true,duplicate:true};const n=_renovAmt(jumlah);if(!n)return{ok:false,reason:'Jumlah harus lebih dari 0'};const sm=renovLabaSummary(p);if(!sm.syarat)return{ok:false,reason:sm.alasan||'Syarat pengakuan belum terpenuhi'};if(n>sm.bisaAkui)return{ok:false,reason:'Melebihi batas pengakuan ('+sm.bisaAkui+')'};return renovLedgerAppend(p,renovLedgerEntry(p,'akui',n,o));}
function renovKoreksiLaba(p,jumlah,o){if(_renovDupKey(p,o))return{ok:true,duplicate:true};const n=_renovAmt(jumlah);if(!n)return{ok:false,reason:'Jumlah harus lebih dari 0'};if(!String((o&&o.catatan)||'').trim())return{ok:false,reason:'Alasan koreksi wajib diisi'};const sm=renovLabaSummary(p);if(n>sm.labaDiakuiBersih)return{ok:false,reason:'Koreksi melebihi laba diakui ('+sm.labaDiakuiBersih+')'};return renovLedgerAppend(p,renovLedgerEntry(p,'koreksi',n,o));}
function renovCairkanLaba(p,jumlah,o){if(_renovDupKey(p,o))return{ok:true,duplicate:true};const n=_renovAmt(jumlah);if(!n)return{ok:false,reason:'Jumlah harus lebih dari 0'};const sm=renovLabaSummary(p);if(!sm.syarat)return{ok:false,reason:sm.alasan||'Syarat pencairan belum terpenuhi'};if(sm.koreksiDiperlukan)return{ok:false,reason:'Koreksi laba diperlukan sebelum pencairan'};if(n>sm.batasPencairan)return{ok:false,reason:'Melebihi batas pencairan ('+sm.batasPencairan+')'};return renovLedgerAppend(p,renovLedgerEntry(p,'cairkan',n,o));}
function renovBatalCairkan(p,cairkanId,o){if(_renovDupKey(p,o))return{ok:true,duplicate:true};const src=renovLedger(p).find(e=>e.tipe==='cairkan'&&String(e.id)===String(cairkanId));if(!src)return{ok:false,reason:'Entri pencairan tidak ditemukan'};if(renovLedgerSums(p).batalRef.has(String(src.id)))return{ok:false,reason:'Pencairan sudah dibatalkan'};return renovLedgerAppend(p,renovLedgerEntry(p,'batal-cairkan',src.jumlah,{...(o||{}),ref:src.id,tanggal:(o&&o.tanggal)||todayStr()}));}
// Income pribadi dari pencairan: dihitung pada tanggal pencairan ASAL (pembatalan menghapusnya dari periode asal).
function renovPencairanIncome(fromYmd,toYmd){let n=0;(D.renovProjects||[]).forEach(p=>{if(!p||p.dana!=='klien')return;renovCairkanAktif(p).forEach(e=>{const d=String(e.tanggal||'').slice(0,10);if(d&&(!fromYmd||d>=fromYmd)&&(!toYmd||d<=toYmd))n+=Math.max(0,Number(e.jumlah)||0);});});return n;}
function renovPencairanBulan(ym){const y=String(ym||'').slice(0,7);return y.length===7?renovPencairanIncome(y+'-01',y+'-31'):0;}
// Integritas ledger (dipakai pasca-restore / pemeriksaan): hanya MELAPORKAN, tidak menolak.
function renovLedgerIssues(p){const out=[];if(!p)return out;const L=Array.isArray(p.labaLedger)?p.labaLedger:[];if(!L.length)return out;const ids=new Set(),keys=new Set();L.forEach((e,i)=>{if(!e||typeof e!=='object'){out.push('Entri ledger #'+(i+1)+' rusak');return;}if(!['akui','koreksi','cairkan','batal-cairkan'].includes(e.tipe))out.push('Tipe ledger tidak dikenal: '+e.tipe);if(!(Number(e.jumlah)>0))out.push('Jumlah ledger tidak valid');if(ids.has(String(e.id)))out.push('ID ledger ganda');ids.add(String(e.id));if(e.kunci){if(keys.has(e.kunci))out.push('Kunci ledger ganda');keys.add(e.kunci);}if(e.tipe==='batal-cairkan'&&!L.some(x=>x&&x.tipe==='cairkan'&&String(x.id)===String(e.ref)))out.push('Pembatalan merujuk pencairan yang tidak ada');});const s=renovLedgerSums(p);if(s.labaDiakuiBersih<0)out.push('Koreksi melebihi laba diakui');if(s.pencairanValid>s.labaDiakuiBersih)out.push('Pencairan melebihi laba diakui (kelebihan pencairan)');if(p.dana!=='klien')out.push('Ledger ada pada proyek non-klien');return out;}
function renovLabaPanelHtml(p){if(!p||p.dana!=='klien')return '';const sm=renovLabaSummary(p),pid=escapeHtml(JSON.stringify([p.id])),act=(a,l,cls)=>`<button class="btn ${cls||'btn-ghost'}" data-action="Renov.openLabaAksi" data-args="${escapeHtml(JSON.stringify([p.id,a]))}">${l}</button>`;const rows=renovLedger(p).slice().reverse().map(e=>{const aktif=e.tipe==='cairkan'&&!sm.batalRef.has(String(e.id));const lbl={akui:'Akui laba',koreksi:'Koreksi laba','cairkan':'Pencairan','batal-cairkan':'Batal pencairan'}[e.tipe]||escapeHtml(String(e.tipe));return `<div class="u-flex u-jcsb u-fs12 u-py4"><span>${escapeHtml(String(e.tanggal||''))} · ${lbl}${e.tipe==='cairkan'&&!aktif?' (dibatalkan)':''}${e.catatan?' · '+escapeHtml(e.catatan):''}</span><span class="u-fw700">${fmt(e.jumlah)}</span></div>${aktif?`<div class="u-fs11"><button class="btn btn-ghost" data-action="Renov.batalCairkan" data-args="${escapeHtml(JSON.stringify([p.id,e.id]))}">Batalkan pencairan ini</button></div>`:''}`;}).join('');const btns=[];if(p.status!=='selesai'&&p.status!=='arsip'&&p.status!=='batal')btns.push(act('selesai','✔ Tandai selesai &amp; atestasi biaya','btn-primary'));if(p.status==='selesai'&&!renovLedger(p).length)btns.push(act('buka','↺ Buka kembali'));if(sm.syarat){if(sm.bisaAkui>0)btns.push(act('akui','＋ Akui laba','btn-primary'));if(sm.labaDiakuiBersih>0)btns.push(act('koreksi','− Koreksi laba'));if(sm.batasPencairan>0)btns.push(act('cairkan','💸 Cairkan laba','btn-primary'));}else if(sm.labaDiakuiBersih>0)btns.push(act('koreksi','− Koreksi laba'));return `<div class="u-fw700 u-fs12 u-mt12">📒 Laba Proyek (ledger)</div><div class="u-grid u-grid2 u-gap8 u-mt6"><div><div class="u-fs11 u-t2">Batas laba (LabaMaks)</div><div class="u-fw700">${fmt(sm.labaMaks)}</div></div><div><div class="u-fs11 u-t2">Laba diakui (bersih)</div><div class="u-fw700">${fmt(sm.labaDiakuiBersih)}</div></div><div><div class="u-fs11 u-t2">Sudah dicairkan</div><div class="u-fw700">${fmt(sm.pencairanValid)}</div></div><div><div class="u-fs11 u-t2">Belum dicairkan (hak proyek)</div><div class="u-fw700">${fmt(sm.labaBelumDicairkan)}</div></div></div>${sm.alasan?`<div class="u-fs11 u-t2 u-mt6">${escapeHtml(sm.alasan)}. Estimasi margin (belum diakui): ${fmt(sm.estimasiMargin)}</div>`:''}${sm.koreksiDiperlukan?`<div class="u-fs12 u-mt6" style="color:var(--danger)">⚠️ Koreksi diperlukan: batas laba (${fmt(sm.labaMaks)}) di bawah laba diakui. Pencairan baru diblokir.</div>`:''}${sm.kelebihanPencairan?`<div class="u-fs12 u-mt6" style="color:var(--danger)">⚠️ Kelebihan pencairan ${fmt(-sm.labaBelumDicairkan)}. Batalkan pencairan terkait.</div>`:''}${btns.length?`<div class="renov-fund-actions u-mt8">${btns.join('')}</div>`:''}${rows?`<div class="u-mt8">${rows}</div>`:''}`;}
// Rincian dana klien tertahan (dalam saldo): saldo proyek (sisa untuk biaya) vs profit/bagi hasil diakui yang belum dicairkan. Baca-saja.
function renovSaldoRincian(){let tertahan=0,profit=0;(D.renovProjects||[]).filter(p=>p&&p.dana==='klien').forEach(p=>{const dalam=renovDanaTertahanDalamSaldo(p);if(!(dalam>0))return;let lb=0;try{lb=Math.max(0,Number(renovLabaSummary(p).labaBelumDicairkan)||0);}catch(_e){lb=0;}tertahan+=dalam;profit+=Math.min(dalam,lb);});return{tertahan,profit,proyek:tertahan-profit};}
function saldoPribadi(){return (typeof totalSaldoAkun==='function'?totalSaldoAkun():0)-(D.renovProjects||[]).filter(p=>p&&p.dana==='klien').reduce((n,p)=>n+renovDanaTertahanDalamSaldo(p),0);}
// Langkah 6 (U-10, read-only): akun tertaut aset/holding yang MEMUAT aliran dana klien (kasus data lama; form kini memblokir kasus baru). Tidak menulis apa pun. projectId opsional = batasi ke satu proyek.
function renovAkunTertautBerisiKlien(projectId){const out=new Map();if(typeof isAccLinkedToAsset!=='function')return[];(D.transactions||[]).forEach(t=>{if(!t||!isAliranKlien(t)||!isAccLinkedToAsset(t.accountId))return;const pid=t.renovDpProjectId!=null?t.renovDpProjectId:(t.renovRefundProjectId!=null?t.renovRefundProjectId:t.renovProjectLinkId);if(projectId!=null&&!sameId(pid,projectId))return;const k=String(t.accountId);if(!out.has(k)){const a=(D.accounts||[]).find(x=>x&&sameId(x.id,t.accountId));out.set(k,{accountId:t.accountId,nama:a?a.name:'(akun terhapus)',jumlahTx:0,proyek:new Set()});}const e=out.get(k);e.jumlahTx++;e.proyek.add(String(pid));});return[...out.values()].map(e=>({accountId:e.accountId,nama:e.nama,jumlahTx:e.jumlahTx,proyek:[...e.proyek]}));}

const Renov={
_paymentInFlight:false,
curId:null,
projEditId:null,
editItemId:null,
_currentItemCalcDetail:null,
totals(p){
const items=Array.isArray(p&&p.items)?p.items:[];
const total=items.reduce((sum,it)=>sum+Math.max(0,Number(it.harga)||0),0);
const paid=items.reduce((sum,it)=>sum+_renovItemPaidAmount(it),0);
const count=items.length;
const paidCount=items.filter(it=>_renovItemPaidAmount(it)>=Math.max(0,Number(it.harga)||0)&&Number(it.harga)>0).length;
const overpaid=items.reduce((sum,it)=>sum+Math.max(0,_renovItemPaidAmount(it)-Math.max(0,Number(it.harga)||0)),0);
return{total,paid,sisa:Math.max(0,total-paid),count,paidCount,overpaid};
},
render(){
if(typeof SewaKiosRenovInsight!=='undefined')SewaKiosRenovInsight.render();
const el=document.getElementById('renovList');
if(!el)return;
if(!D.renovProjects||!D.renovProjects.length){
el.innerHTML='<div class="empty"><div class="empty-icon">🛠️</div><div class="empty-text">Belum ada proyek renovasi</div></div>';
return;
}
el.innerHTML=D.renovProjects.filter(p=>p&&p.status!=='arsip').map(p=>{
const t=Renov.totals(p);
const pct=t.total>0?Math.min(100,Math.round((t.paid/t.total)*100)):0;
return`<div class="tx-item u-pointer u-fdcol u-gap6" style="align-items:stretch" data-action="Renov.openDetail" data-args="${escapeHtml(JSON.stringify([p.id]))}">
        <div class="u-flex u-aic u-gap10 renov-card-row">
          <div class="tx-icon u-bgaccsoft">🛠️</div>
          <div class="tx-info">
            <div class="tx-name">${escapeHtml(p.name)} ${t.count?`<span class="acc-chip">${t.paidCount}/${t.count} item</span>`:''}</div>
            <div class="tx-meta">${fmt(t.paid)} / ${fmt(t.total)} ${t.total>0?'· '+pct+'%':''}</div>
          </div>
          <button class="tx-del" data-stop="1" data-action="Renov.deleteProject" data-args="${escapeHtml(JSON.stringify([p.id]))}" aria-label="Hapus">🗑</button>
        </div>
        <div class="prog-bar" style="height:6px;margin-top:0"><div class="prog-fill purple" style="width:${pct}%"></div></div>
      </div>`;
}).join('');
},
openProjectModal(id){
Renov.projEditId=id||null;
const p=id?D.renovProjects.find(x=>sameId(x.id,id)):null;
document.getElementById('renovProjectModalTitle').textContent=p?'Edit Proyek':'Proyek Renovasi Baru';
document.getElementById('renovProjName').value=p?p.name:'';
document.getElementById('renovProjNote').value=p?(p.catatan||''):'';
const noteEl=document.getElementById('renovProjNote');
if(noteEl&&noteEl.parentElement){
let extra=document.getElementById('renovProjMetaFields');
if(!extra){extra=document.createElement('div');extra.id='renovProjMetaFields';extra.innerHTML='<div class="fg"><label class="fl" for="renovProjClient">Nama Klien (opsional)</label><input id="renovProjClient" class="fi" maxlength="120" placeholder="Nama klien"></div><div class="fg"><label class="fl" for="renovProjRab">Nilai Kontrak / RAB (Rp)</label><input id="renovProjRab" class="fi" inputmode="numeric" type="number" min="0" step="1" placeholder="0"></div>';const noteGroup=noteEl.closest('.fg')||noteEl.parentElement;noteGroup.parentElement.insertBefore(extra,noteGroup);}
if(!document.getElementById('renovProjDana')){const box=document.createElement('div');box.className='fg';box.innerHTML='<label class="fl" for="renovProjDana">Kepemilikan Dana</label><select id="renovProjDana" class="fi"><option value="">Belum diklasifikasi</option><option value="klien">Dana klien</option><option value="pribadi">Dana pribadi</option></select><div class="u-fs11 u-t2">Proyek lama tidak diklasifikasi otomatis.</div>';document.getElementById('renovProjMetaFields')?.appendChild(box);}
if(!document.getElementById('renovProjLokasi')){const cg=document.getElementById('renovProjClient'),host=cg&&cg.closest('.fg');if(host){const lg=document.createElement('div');lg.className='fg';lg.innerHTML='<label class="fl" for="renovProjLokasi">Lokasi (opsional)</label><input id="renovProjLokasi" class="fi" maxlength="120" placeholder="Contoh: Magelang">';host.parentElement.insertBefore(lg,host.nextSibling);}}
const lokEl=document.getElementById('renovProjLokasi');if(lokEl)lokEl.value=p?(p.lokasi||''):'';
const clientEl=document.getElementById('renovProjClient'),rabEl=document.getElementById('renovProjRab');
if(clientEl)clientEl.value=p?(p.klien||''):'';
if(rabEl)rabEl.value=p&&p.rab!=null?String(p.rab):'';
const danaEl=document.getElementById('renovProjDana');if(danaEl)danaEl.value=p?(p.dana||''):'';
}
openModal('renovProjectModal');
},
saveProject(){
const name=document.getElementById('renovProjName').value.trim();
if(!name){toast('⚠️ Masukkan nama proyek');return;}
const catatan=document.getElementById('renovProjNote').value.trim();
const klienEl=document.getElementById('renovProjClient'),rabEl=document.getElementById('renovProjRab');
const klien=String(klienEl&&klienEl.value||'').trim();
const lokasiEl=document.getElementById('renovProjLokasi');const lokasi=String(lokasiEl&&lokasiEl.value||'').trim();
const rabRaw=String(rabEl&&rabEl.value||'').trim();
const rab=rabRaw===''?0:Number(rabRaw);
if(!Number.isFinite(rab)||rab<0){toast('⚠️ Nilai RAB harus angka nol atau lebih');return;}
let savedProjectId=null,rollbackProject=null,createdProject=null;
if(Renov.projEditId){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.projEditId));
if(p){rollbackProject=JSON.parse(JSON.stringify(p));p.name=name;p.catatan=catatan;p.klien=klien;p.rab=rab;if(lokasiEl)p.lokasi=lokasi;const el=document.getElementById('renovProjDana'),next=el&&el.value||'';if(next&&next!==(p.dana||'')){if((p.labaLedger||[]).length){toast('⚠️ Klasifikasi terkunci setelah ledger laba terisi');return;}const preview=next==='klien'?renovDanaTertahan({...p,dana:'klien'}):0;if(!confirm('Ubah klasifikasi dana proyek? Dampak perkiraan dana tertahan: '+fmtFull(preview)+'. Perubahan dicatat dalam riwayat.'))return;const r=renovClassifyProject(p,next,D.profile&&D.profile.nama);if(!r.ok){toast('⚠️ '+r.reason);return;}}savedProjectId=p.id;}
} else {
const project={id:uid(),name,catatan,klien,rab,createdAt:todayStr(),items:[]};if(lokasi)project.lokasi=lokasi;const el=document.getElementById('renovProjDana'),dana=el&&el.value||'';if(dana)renovClassifyProject(project,dana,D.profile&&D.profile.nama);
D.renovProjects.push(project);createdProject=project;savedProjectId=project.id;
}
const saveResult=save();if(saveResult===false){if(rollbackProject){const current=D.renovProjects.find(x=>sameId(x.id,savedProjectId));if(current){Object.keys(current).forEach(k=>delete current[k]);Object.assign(current,rollbackProject);}}else if(createdProject)D.renovProjects=D.renovProjects.filter(x=>!sameId(x.id,createdProject.id));toast('⚠️ Gagal menyimpan proyek; perubahan dibatalkan');return;}
Renov.projEditId=null;
closeModal('renovProjectModal');Renov.render();
if(Renov.curId)Renov.renderDetail();
// If opened from the transaction form, refresh the existing selector immediately
// after save (not only on a close-button click) and select the project just saved.
const txModal=document.getElementById('txModal');
const txProjectSelect=document.getElementById('txRenovProject');
if(txModal&&txModal.classList&&typeof txModal.classList.contains==='function'&&txModal.classList.contains('open')&&typeof populateTxRenovSelect==='function'){
  populateTxRenovSelect();
  if(txProjectSelect&&savedProjectId!=null){txProjectSelect.value=String(savedProjectId);txProjectSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  if(typeof window!=='undefined'&&typeof window.__pwaSyncRenovCreateButton==='function')window.__pwaSyncRenovCreateButton();
}
toast('✅ Proyek tersimpan');
},
editCurrentProject(){ if(Renov.curId)Renov.openProjectModal(Renov.curId); },
async deleteProject(id){
const p=D.renovProjects.find(x=>sameId(x.id,id));if(!p)return;
if(renovHasClientObligations(p)||p.dana==='klien'||(p.labaLedger||[]).length){if(!await askConfirm(`Proyek "${escapeHtml(p.name)}" memiliki transaksi/kewajiban. Arsipkan? Riwayat dan perhitungan tetap dipertahankan.`,{title:'Arsipkan Proyek',okText:'Arsipkan'}))return;const old=p.status;p.status='arsip';p.archivedAt=new Date().toISOString();if(save()===false){p.status=old;delete p.archivedAt;toast('⚠️ Gagal mengarsipkan');return;}if(sameId(Renov.curId,id))Renov.curId=null;closeModal('renovDetailModal');Renov.render();toast('📦 Proyek diarsipkan; transaksi tetap tertaut');return;}
if(!await askConfirm(`Hapus proyek kosong "${escapeHtml(p.name)}"?`,{title:'Hapus Proyek',okText:'Ya, Hapus'}))return;D.renovProjects=D.renovProjects.filter(x=>!sameId(x.id,id));if(save()===false){D.renovProjects.push(p);toast('⚠️ Gagal menghapus proyek');return;}if(sameId(Renov.curId,id))Renov.curId=null;closeModal('renovDetailModal');Renov.render();toast('🗑 Proyek kosong dihapus');
},
openDetail(id){
Renov.curId=id;
Renov.renderDetail();
openModal('renovDetailModal');
},
renderFundPanel(p){
if(!p)return;
const listEl=document.getElementById('renovItemList');if(!listEl||!listEl.parentElement)return;
let panel=document.getElementById('renovFundPanel');
if(!panel){panel=document.createElement('section');panel.id='renovFundPanel';panel.className='card u-mb12';listEl.parentElement.insertBefore(panel,listEl);}
const items=Array.isArray(p.items)?p.items:[];
const plan=items.reduce((sum,it)=>sum+Math.max(0,Number(it.harga)||0),0);
const paid=items.reduce((sum,it)=>sum+_renovItemPaidAmount(it),0);
const dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id)&&!(Renov._ignoreTxIds&&Renov._ignoreTxIds.has(String(tx.id))));
const dp=dpTxs.filter(tx=>tx.renovDpKind!=='termin').reduce((sum,tx)=>sum+(Number(tx.amount)||0),0);
const termin=dpTxs.filter(tx=>tx.renovDpKind==='termin').reduce((sum,tx)=>sum+(Number(tx.amount)||0),0);
const incoming=dp+termin,fc=_renovFundCalc(p,incoming,paid),fund=fc.fund,bd=fc.breakdown,rab=Math.max(0,Number(p.rab)||0);
const categories={};items.forEach(it=>{const key=it.grup||it.category||'Tanpa kategori';if(!categories[key])categories[key]={plan:0,paid:0};categories[key].plan+=Math.max(0,Number(it.harga)||0);categories[key].paid+=_renovItemPaidAmount(it);});
const categoryRows=Object.entries(categories).map(([name,v])=>`<div class="renov-cat-row u-fs12"><div class="u-fw700">${escapeHtml(name)}</div><div class="u-t2">Rencana ${fmt(v.plan)} · Realisasi ${fmt(v.paid)} · Selisih ${fmt(v.plan-v.paid)}</div></div>`).join('');
const incomeRows=dpTxs.map(tx=>`<div class="u-flex u-jcsb u-aic u-fs12 u-py4"><span>${escapeHtml(tx.renovDpLabel|| (tx.renovDpKind==='termin'?'Termin':'DP'))} · ${escapeHtml(tx.date||'-')}</span><span>${fmt(tx.amount)} <button class="tx-del" data-action="Renov.deleteDpIncome" data-args="${escapeHtml(JSON.stringify([p.id,tx.id]))}" aria-label="Hapus pemasukan">🗑</button></span></div>`).join('');
const pct=plan>0?Math.min(100,Math.round(paid/plan*100)):0;
const _srcRow=(l,v)=>`<div class="u-flex u-jcsb u-fs12 u-py4"><span>${l}</span><span class="u-fw700">${fmt(v)}</span></div>`;
const srcRows=bd&&paid>0?[bd.proyek>0?_srcRow('🏦 Rekening proyek',bd.proyek):'',bd.talangan>0?_srcRow('👤 Talangan pribadi',bd.talangan):'',...Object.entries(bd.titipanOwners).map(([n,v])=>_srcRow('💰 Titipan · '+escapeHtml(n),v)),bd.tanpa>0?_srcRow('❔ Tanpa catatan transaksi',bd.tanpa):''].join(''):'';
const mk=typeof renovMarkerAudit==='function'?renovMarkerAudit(p.id):[];
const _lnk=(p.dana==='klien'&&typeof renovAkunTertautBerisiKlien==='function')?renovAkunTertautBerisiKlien(p.id):[];
const warnLink=_lnk.length?`<div class="u-fs11 u-mb6" style="color:var(--danger)">⚠️ Akun tertaut aset/investasi memuat dana proyek ini: ${_lnk.map(x=>escapeHtml(x.nama)).join(', ')}. Akun tertaut tidak masuk saldo pribadi, sementara dana tertahan tetap dikurangkan. Pindahkan dana klien ke akun biasa atau lepas tautan akunnya.</div>`:'';
panel.innerHTML=`<div class="u-fw700 u-mb6">💰 Arus Dana Proyek</div>${p.dana==='klien'?`<div class="u-fs11 u-mb6">Status dana: ${renovClientFundState(p).status}${renovClientFundState(p).reason?' · '+escapeHtml(renovClientFundState(p).reason):''} · Dana tertahan ${fmt(renovDanaTertahan(p))}</div>${warnLink}${(()=>{const sm=renovLabaSummary(p),tt=renovDanaTertahan(p),pr=Math.min(tt,Math.max(0,sm.labaBelumDicairkan||0));return `<div class="u-fs11 u-t2 u-mb6">Keterangan saldo bersih: saldo proyek ${fmt(tt-pr)} (sisa dana klien untuk biaya) + profit/bagi hasil diakui belum dicairkan ${fmt(pr)} = dana tertahan ${fmt(tt)}. Keduanya bukan saldo pribadi sampai laba dicairkan.</div>`;})()}`:`<div class="u-fs11 u-mb6 u-t2">Klasifikasi dana: ${p.dana==='pribadi'?'Pribadi':'Belum diklasifikasi'}</div>`}<div class="u-fs12 u-t2">${escapeHtml(p.name)}${p.klien?' · Klien: '+escapeHtml(p.klien):''}</div><div class="u-grid u-grid2 u-gap8 u-mt10"><div><div class="u-fs11 u-t2">Nilai Kontrak / RAB</div><div class="u-fw700">${fmt(rab)}</div></div><div><div class="u-fs11 u-t2">Rencana Item</div><div class="u-fw700">${fmt(plan)}</div></div><div><div class="u-fs11 u-t2">Selisih RAB</div><div class="u-fw700">${fmt(rab-plan)}</div></div><div><div class="u-fs11 u-t2">DP Masuk</div><div class="u-fw700">${fmt(dp)}</div></div><div><div class="u-fs11 u-t2">Termin Masuk</div><div class="u-fw700">${fmt(termin)}</div></div><div><div class="u-fs11 u-t2">Total Pemasukan</div><div class="u-fw700">${fmt(incoming)}</div></div><div><div class="u-fs11 u-t2">Terbayar Item</div><div class="u-fw700">${fmt(paid)}</div></div><div><div class="u-fs11 u-t2">Dana Proyek</div><div class="u-fw700" style="color:${fund<0?'var(--danger)':'var(--text)'}">${fmt(fund)} ${fund<0?'· Nombok':''}</div></div><div><div class="u-fs11 u-t2">Sisa Tagihan Klien</div><div class="u-fw700">${fmt(Math.max(0,rab-incoming))}</div></div><div><div class="u-fs11 u-t2">Sisa Belanja</div><div class="u-fw700">${fmt(Math.max(0,plan-paid))}</div></div>${Number(p.profit)>0?`<div><div class="u-fs11 u-t2">Profit/Margin (RAB)</div><div class="u-fw700">${fmt(p.profit)}</div></div>`:''}</div><div class="u-fs11 u-t2 u-mt8">Realisasi pembayaran item: ${pct}%${paid>plan?' · Kelebihan bayar '+fmt(paid-plan):''}${bd?(bd.talangan>0?' · Talangan pribadi '+fmt(bd.talangan):''):(fund<0?' · Nombok pribadi '+fmt(Math.max(0,-fund)):'')}</div>${srcRows?`<div class="u-fw700 u-fs12 u-mt12">Sumber dana pembayaran item</div>${srcRows}`:''}${mk.length?`<div class="u-fs12 u-mt8" style="color:var(--danger)">⚠️ ${mk.length} transaksi tak sinkron (proyek / penanggung / payment) <button class="btn btn-ghost" data-action="Renov.repairMarkers" data-args="${escapeHtml(JSON.stringify([p.id]))}">Periksa &amp; Rapikan</button></div>`:''}<div class="prog-bar u-mt6"><div class="prog-fill purple" style="width:${pct}%"></div></div><div class="u-fw700 u-fs12 u-mt12">Rencana / realisasi per kategori</div>${categoryRows||'<div class="u-t2 u-fs12">Belum ada item.</div>'}<div class="u-flex u-aic u-jcsb u-mt12"><div class="u-fw700 u-fs12">Daftar DP / Termin</div><button class="btn btn-ghost" data-action="Renov.toggleDpList">Daftar pemasukan</button></div><div id="renovDpListWrap" style="display:none">${incomeRows||'<div class="u-t2 u-fs12">Belum ada pemasukan proyek.</div>'}</div>${renovLabaPanelHtml(p)}${renovBagiHasilPanelHtml(p)}<div class="renov-fund-actions u-mt12"><button class="btn btn-primary" data-action="Renov.openDpModal" data-args="${escapeHtml(JSON.stringify([p.id]))}">＋ Catat DP / Termin</button>${p.dana==='klien'?`<button class="btn btn-ghost" data-action="Renov.openRefundModal" data-args="${escapeHtml(JSON.stringify([p.id]))}">↩ Pengembalian dana</button>`:''}<button class="btn btn-ghost" data-action="Renov.exportCSV" data-args="${escapeHtml(JSON.stringify([p.id]))}">Export CSV</button><button class="btn btn-ghost" data-action="Renov.importCSV" data-args="${escapeHtml(JSON.stringify([p.id]))}">Import CSV</button><button class="btn btn-ghost" data-action="Renov.exportXLSX" data-args="${escapeHtml(JSON.stringify([p.id]))}">Export Excel</button><button class="btn btn-ghost" data-action="Renov.importXLSX" data-args="${escapeHtml(JSON.stringify([p.id]))}">Import Excel</button><button class="btn btn-ghost" data-action="Renov.exportPDF" data-args="${escapeHtml(JSON.stringify([p.id]))}">Laporan PDF</button></div>`;
},
toggleDpList(){const el=document.getElementById('renovDpListWrap');if(el)el.style.display=el.style.display==='none'?'block':'none';},
repairMarkers(pid){
if(typeof renovRepairMarkers!=='function')return;
let r;try{r=renovRepairMarkers(pid);}catch(e){console.error('[Renov] rapikan penanda gagal',e);toast('⚠️ Gagal merapikan penanda');return;}
if(r.fixed&&save()===false){(r.ids||[]).forEach(id=>{try{FinanceTxSOT.patchMetaById(id,{deductionOwnerId:undefined});}catch(e){console.error('[Renov] rollback penanda gagal',e);}});toast('⚠️ Gagal menyimpan perbaikan');return;}
if(r.fixed){if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});}
Renov.render();if(sameId(Renov.curId,pid))Renov.renderDetail();
toast(r.fixed?'✅ '+r.fixed+' penanggung diisi otomatis'+(r.remaining?' · '+r.remaining+' perlu dicek manual':''):(r.remaining?'⚠️ '+r.remaining+' perlu dicek manual (pilih penanggung / hubungkan transaksi)':'✅ Semua penanda sinkron'));
},
_ensureDpModal(){let el=document.getElementById('renovDpModal');if(!el){el=document.createElement('div');el.id='renovDpModal';el.className='overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);}return el;},
openDpModal(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
Renov._dpProjectId=p.id;const cats=typeof getCatsByType==='function'?getCatsByType('income'):[];
if(!Array.isArray(cats)||!cats.length){toast('⚠️ Kategori income belum tersedia; pemasukan DP tidak dibuat');return;}
const accounts=D.accounts||[];if(!accounts.length){toast('⚠️ Belum ada akun tujuan');return;}
const el=Renov._ensureDpModal();el.innerHTML=`<div class="modal" style="max-height:90vh;overflow:auto"><div class="modal-handle"></div><div class="modal-title"><span>Catat DP / Termin Klien</span><button class="modal-close" data-action="closeModal" data-args='["renovDpModal"]'>✕</button></div><div style="overflow:auto;max-height:calc(90vh - 90px)"><div class="fg"><label class="fl" for="renovDpLabel">Label</label><input id="renovDpLabel" class="fi" maxlength="120" placeholder="DP awal / Termin 1"></div><div class="fg"><label class="fl" for="renovDpKind">Jenis</label><select id="renovDpKind" class="fi"><option value="dp">DP</option><option value="termin">Termin</option></select></div><div class="fg"><label class="fl" for="renovDpAmount">Jumlah (Rp)</label><input id="renovDpAmount" class="fi" type="number" min="1" step="1"></div><div class="fg"><label class="fl" for="renovDpDate">Tanggal</label><input id="renovDpDate" class="fi" type="date" value="${todayStr()}"></div><div class="fg"><label class="fl" for="renovDpAccount">Akun Tujuan</label><select id="renovDpAccount" class="fi" data-onchange="Renov.updateDpOwnerVisibility"><option value="">Pilih akun tujuan</option>${accounts.map(a=>`<option value="${escapeHtml(String(a.id))}">${escapeHtml(a.emoji||'')} ${escapeHtml(a.name||'Akun')}</option>`).join('')}</select></div><div id="renovDpOwnerWrap" class="u-mt8" style="display:none"><div class="fg"><label class="fl" for="renovDpOwner">Pemilik / Penanggung</label><select id="renovDpOwner" class="fi"></select></div></div><div class="fg"><label class="fl" for="renovDpNote">Catatan</label><input id="renovDpNote" class="fi" maxlength="240"></div><div class="u-flex u-gap8 u-mt14"><button class="btn btn-primary u-flex1 u-p14" data-action="Renov.submitDpIncome">Simpan Pemasukan</button><button class="btn btn-ghost" data-action="closeModal" data-args='["renovDpModal"]'>Batal</button></div></div></div>`;
const accEl=document.getElementById('renovDpAccount');if(accEl)accEl.value='';Renov.updateDpOwnerVisibility();openModal('renovDpModal');
},
updateDpOwnerVisibility(){
const accId=document.getElementById('renovDpAccount')?.value;const wrap=document.getElementById('renovDpOwnerWrap'),sel=document.getElementById('renovDpOwner');if(!wrap||!sel)return;
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accId):[];
if(!accId){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';renovFillOwnerSelect(sel,owners,'renovDpAccount','Renov.updateDpOwnerVisibility');if(owners.length===1)sel.value=owners[0].ownerId;sel.setAttribute('data-prev-owner',sel.value||'');
},
async submitDpIncome(){
if(Renov._dpInFlight)return;
const p=D.renovProjects.find(x=>sameId(x.id,Renov._dpProjectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const label=(document.getElementById('renovDpLabel')?.value||'').trim();const kind=document.getElementById('renovDpKind')?.value==='termin'?'termin':'dp';const amount=Number(document.getElementById('renovDpAmount')?.value);const date=document.getElementById('renovDpDate')?.value||todayStr();const accountId=document.getElementById('renovDpAccount')?.value||'';const note=(document.getElementById('renovDpNote')?.value||'').trim();
if(!(amount>0)||!Number.isFinite(amount)){toast('⚠️ Jumlah pemasukan harus lebih dari 0');return;}if(!accountId){toast('⚠️ Pilih akun tujuan');return;}if(p.dana==='klien'&&!renovClientAccountEligible(accountId)){toast('⚠️ Dana klien wajib masuk akun SELF dalam cakupan saldo, tidak tertaut aset dan tanpa porsi pemilik lain.');return;}
const cats=typeof getCatsByType==='function'?getCatsByType('income'):[];if(!Array.isArray(cats)||!cats.length){toast('⚠️ Kategori income kosong; transaksi tidak dibuat');return;}
const category=(cats.find(c=>/proyek|bisnis|jasa/i.test(c.name||''))||cats[0]).name;if(!category){toast('⚠️ Kategori income tidak valid');return;}
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accountId):[];const ownerEl=document.getElementById('renovDpOwner');const deductionOwnerId=owners.length?(ownerEl?.value||(owners.length===1?owners[0].ownerId:'')):'';if(owners.length>1&&!deductionOwnerId){toast('⚠️ Pilih pemilik/penanggung akun');return;}
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');Renov._dpInFlight=true;let tx=null,committed=false;
try{tx=FinanceTxSOT.create({id:uid(),type:'income',amount,accountId,date,category,subcategory:'',note:`Renovasi: ${p.name} - ${label|| (kind==='dp'?'DP':'Termin')}${note?' ('+note+')':''}`,payMethod:'tunai',renovDpProjectId:p.id,renovDpLabel:label|| (kind==='dp'?'DP':'Termin'),renovDpKind:kind,...(deductionOwnerId?{deductionOwnerId}:{})});
const saved=save();if(saved===false)throw new Error('Penyimpanan gagal');committed=true;
try{if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});}catch(e){console.warn('[Renov] refresh DP gagal',e);}try{if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'dp-income',projectId:p.id,txId:tx.id,amount});}catch(e){console.warn('[Renov] outbox DP gagal',e);}
try{closeModal('renovDpModal');Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();}catch(e){console.warn('[Renov] render DP gagal',e);}toast('✅ DP / Termin tercatat sebagai income Keuangan');
}catch(err){if(!committed){if(tx)try{FinanceTxSOT.removeById(tx.id);}catch(e){console.error('[Renov] rollback DP gagal',e);}toast('⚠️ Gagal mencatat DP / Termin: '+(err&&err.message||'kesalahan tidak diketahui'));}else toast('⚠️ DP/Termin sudah tersimpan; tampilan perlu dimuat ulang.');}
finally{Renov._dpInFlight=false;}
},
async deleteDpIncome(projectId,txId){
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT){toast('⚠️ FinanceTxSOT tidak tersedia');return;}
const tx=FinanceTxSOT.findById(txId);if(!tx||!_renovSameId(tx.renovDpProjectId,projectId))return;
if(!await askConfirm(`Hapus pemasukan ${fmtFull(tx.amount)} dari proyek? Transaksi income akan dihapus dari Keuangan dan saldo akun ikut dihitung ulang.`))return;
const removed=FinanceTxSOT.removeById(txId);if(!removed)return;if(save()===false){try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] rollback DP delete gagal',e);}toast('⚠️ Gagal menyimpan penghapusan DP');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();if(sameId(Renov.curId,projectId))Renov.renderDetail();toast('🗑 Pemasukan proyek dihapus');
},
openRefundModal(projectId){const p=(D.renovProjects||[]).find(x=>sameId(x.id,projectId));if(!p||p.dana!=='klien'){toast('⚠️ Proyek harus diklasifikasi sebagai dana klien');return;}const accounts=(D.accounts||[]).filter(a=>renovClientAccountEligible(a.id));if(!accounts.length){toast('⚠️ Tidak ada akun SELF yang memenuhi syarat');return;}Renov._refundProjectId=p.id;const el=Renov._ensureDpModal();el.innerHTML=`<div class="modal"><div class="modal-title">Pengembalian Dana Klien</div><div class="fg"><label class="fl">Jumlah (Rp)</label><input id="renovRefundAmount" class="fi" type="number" min="1"></div><div class="fg"><label class="fl">Tanggal</label><input id="renovRefundDate" class="fi" type="date" value="${todayStr()}"></div><div class="fg"><label class="fl">Akun sumber</label><select id="renovRefundAccount" class="fi">${accounts.map(a=>`<option value="${escapeHtml(String(a.id))}">${escapeHtml(a.name||'Akun')}</option>`).join('')}</select></div><div class="fg"><label class="fl">Catatan</label><input id="renovRefundNote" class="fi"></div><button class="btn btn-primary" data-action="Renov.submitRefund">Simpan pengembalian</button></div>`;openModal('renovDpModal');},
async submitRefund(){if(Renov._refundInFlight)return;const p=(D.renovProjects||[]).find(x=>sameId(x.id,Renov._refundProjectId));if(!p)return;const amount=Number(document.getElementById('renovRefundAmount')?.value),accountId=document.getElementById('renovRefundAccount')?.value,date=document.getElementById('renovRefundDate')?.value||todayStr(),note=(document.getElementById('renovRefundNote')?.value||'').trim();if(!(amount>0)||!Number.isFinite(amount)||!renovClientAccountEligible(accountId)){toast('⚠️ Data pengembalian tidak valid');return;}const cats=typeof getCatsByType==='function'?getCatsByType('expense'):[];if(!cats.length){toast('⚠️ Kategori expense belum tersedia');return;}Renov._refundInFlight=true;let tx=null;try{tx=FinanceTxSOT.create({id:uid(),type:'expense',amount,accountId,date,category:(cats.find(c=>/proyek|renovasi|bisnis/i.test(c.name||''))||cats[0]).name,subcategory:'',payMethod:'tunai',note:`Pengembalian dana klien: ${p.name}${note?' - '+note:''}`,renovRefundProjectId:p.id,renovRefundLabel:note||'Pengembalian dana klien'});if(save()===false)throw new Error('Penyimpanan gagal');if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});closeModal('renovDpModal');Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();toast('✅ Pengembalian dana klien tercatat');}catch(e){if(tx)try{FinanceTxSOT.removeById(tx.id);}catch(rbErr){console.error('[Renov] rollback pengembalian gagal',rbErr);}toast('⚠️ Pengembalian gagal: '+(e.message||'kesalahan'));}finally{Renov._refundInFlight=false;}},
openLabaAksi(projectId,aksi){const p=(D.renovProjects||[]).find(x=>sameId(x.id,projectId));if(!p||p.dana!=='klien'){toast('⚠️ Proyek harus berklasifikasi dana klien');return;}if(aksi==='buka'){const r=renovBukaSelesai(p);if(!r.ok){toast('⚠️ '+r.reason);return;}Renov.render();Renov.renderDetail();toast('✅ Proyek dibuka kembali');return;}const sm=renovLabaSummary(p);Renov._labaProjectId=p.id;Renov._labaAksi=aksi;Renov._labaKey='laba-'+aksi+'-'+uid();const el=Renov._ensureDpModal();const amt=(max,def)=>{const v=def==null?max:Math.min(max,def);return `<div class="fg"><label class="fl">Jumlah (Rp)</label><input id="renovLabaAmount" class="fi" type="number" min="1" max="${max}" value="${v>0?v:''}"></div>`;};const note=`<div class="fg"><label class="fl">Catatan${aksi==='koreksi'?' / alasan (wajib)':''}</label><input id="renovLabaNote" class="fi"></div>`;const date=`<div class="fg"><label class="fl">Tanggal</label><input id="renovLabaDate" class="fi" type="date" value="${todayStr()}"></div>`;const bs=renovBagianSelf(p),bsHint=bs?`<div class="u-fs11 u-t2 u-mb6">Bagian ${escapeHtml(bs.nama)} (bagi hasil): ${fmt(bs.nominal)}. Jumlah awal dibatasi ke sisa bagian ini (${fmt(renovSisaBagianSelf(p,aksi)||0)}); angka lebih besar tetap bisa disimpan setelah konfirmasi.</div>`:'';let title='',body='';if(aksi==='selesai'){title='Tandai Proyek Selesai';body=`<div class="u-fs12 u-mb6">Atestasi: konfirmasi biaya proyek. Laba hanya bisa diakui sampai batas kas klien yang sudah diterima dikurangi biaya dan cadangan.</div><label class="u-fs12"><input id="renovLabaAllCost" type="checkbox"> Semua biaya proyek sudah tercatat</label><div class="fg"><label class="fl">Cadangan biaya belum tercatat (Rp, bila tidak dicentang)</label><input id="renovLabaCadangan" class="fi" type="number" min="0" value="0"></div>${date}`;}else if(aksi==='akui'){title='Akui Laba Proyek';body=`<div class="u-fs12 u-mb6">Batas pengakuan saat ini: ${fmt(sm.bisaAkui)}</div>${bsHint}${amt(sm.bisaAkui,renovSisaBagianSelf(p,'akui'))}${date}${note}`;}else if(aksi==='koreksi'){title='Koreksi Laba Diakui';body=`<div class="u-fs12 u-mb6">Laba diakui bersih: ${fmt(sm.labaDiakuiBersih)}. Entri lama tidak diubah/dihapus.</div>${amt(Math.max(0,Math.min(sm.labaDiakuiBersih,sm.labaDiakuiBersih-sm.labaMaks)))}${date}${note}`;}else if(aksi==='cairkan'){title='Cairkan Laba ke Pribadi';body=`<div class="u-fs12 u-mb6">Batas pencairan: ${fmt(sm.batasPencairan)}. Dicatat sebagai income pribadi pada tanggal pencairan (tanpa transaksi baru; saldo fisik tidak berubah).</div>${bsHint}${amt(sm.batasPencairan,renovSisaBagianSelf(p,'cairkan'))}${date}${note}`;}else{toast('⚠️ Aksi tidak dikenal');return;}el.innerHTML=`<div class="modal"><div class="modal-title">${title}</div>${body}<button class="btn btn-primary" data-action="Renov.submitLaba">Simpan</button></div>`;openModal('renovDpModal');},
async submitLaba(){if(Renov._labaInFlight)return;const p=(D.renovProjects||[]).find(x=>sameId(x.id,Renov._labaProjectId));if(!p)return;const aksi=Renov._labaAksi,v=id=>document.getElementById(id);const amount=Number(v('renovLabaAmount')&&v('renovLabaAmount').value),date=(v('renovLabaDate')&&v('renovLabaDate').value)||todayStr(),catatan=((v('renovLabaNote')&&v('renovLabaNote').value)||'').trim(),o={kunci:Renov._labaKey,tanggal:date,catatan};Renov._labaInFlight=true;try{let r;{const lebih=renovCekMelebihiBagianSelf(p,aksi,amount);if(lebih&&typeof askConfirm==='function'&&!await askConfirm('Jumlah '+fmtFull(amount)+' membuat total '+(aksi==='akui'?'laba diakui':'pencairan')+' menjadi '+fmtFull(lebih.total)+', melebihi bagian '+lebih.nama+' ('+fmtFull(lebih.nominal)+'). Lanjut?',{title:'Melebihi Bagian '+lebih.nama,okText:'Lanjut'}))return;}if(aksi==='selesai')r=renovTandaiSelesai(p,{tanggal:date,semuaBiayaTercatat:!!(v('renovLabaAllCost')&&v('renovLabaAllCost').checked),cadangan:Number(v('renovLabaCadangan')&&v('renovLabaCadangan').value)||0});else if(aksi==='akui')r=renovAkuiLaba(p,amount,o);else if(aksi==='koreksi')r=renovKoreksiLaba(p,amount,o);else if(aksi==='cairkan')r=renovCairkanLaba(p,amount,o);else r={ok:false,reason:'Aksi tidak dikenal'};if(!r.ok){toast('⚠️ '+r.reason);return;}if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});closeModal('renovDpModal');Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();toast(r.duplicate?'ℹ️ Entri sudah tercatat':'✅ Tersimpan');}catch(e){toast('⚠️ Gagal: '+(e.message||'kesalahan'));}finally{Renov._labaInFlight=false;}},
async batalCairkan(projectId,cairkanId){const p=(D.renovProjects||[]).find(x=>sameId(x.id,projectId));if(!p)return;if(typeof askConfirm==='function'&&!await askConfirm('Batalkan pencairan ini? Dana kembali menjadi hak proyek dan income pribadi periode asal berkurang.',{title:'Batalkan Pencairan',okText:'Batalkan'}))return;const r=renovBatalCairkan(p,cairkanId,{kunci:'batal-'+cairkanId});if(!r.ok){toast('⚠️ '+r.reason);return;}if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();toast('✅ Pencairan dibatalkan');},
onDpTxEdited(){Renov.render();if(Renov.curId)Renov.renderDetail();},
onTalanganTxDeleted(t){if(t&&t.id!=null)renovRemoveUnpaidTalanganPiutang(x=>x.renovTxId!=null&&sameId(x.renovTxId,t.id));},
onClientTxEdited(t){if(t&&(t.renovDpProjectId!=null||t.renovRefundProjectId!=null)){Renov.render();if(Renov.curId)Renov.renderDetail();}},
onRefundTxDeleted(t){const pid=t&&t.renovRefundProjectId;if(pid==null)return;Renov.render();if(sameId(Renov.curId,pid))Renov.renderDetail();},
onDpTxDeleted(t){
// S2767.3: runTxDeleteCascades() dipanggil delTx() SEBELUM transaksi dihapus dari D.transactions,
// jadi render langsung masih melihat income DP itu. Abaikan id tsb sementara, lalu render ulang setelah tick.
Renov._ignoreTxIds=new Set(t&&t.id!=null?[String(t.id)]:[]);
try{Renov.render();if(Renov.curId)Renov.renderDetail();}finally{
setTimeout(()=>{Renov._ignoreTxIds=null;try{Renov.render();if(Renov.curId)Renov.renderDetail();}catch(e){console.warn('[Renov] refresh DP setelah hapus gagal',e);}},0);}
},
_csvCell(value){
let text=String(value==null?'':value);
if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(text))text="'"+text;
return '"'+text.replace(/"/g,'""')+'"';
},
_csvRow(values,delimiter=','){return values.map(v=>Renov._csvCell(v)).join(delimiter);},
exportCSV(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const items=Array.isArray(p.items)?p.items:[],dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));
const rows=[];const add=(r)=>rows.push(Renov._csvRow(r));
add(['=== IDENTITAS PROYEK ===']);add(['Nama Proyek','Klien','Nilai Kontrak/RAB','Catatan']);add([p.name,p.klien||'',p.rab||0,p.catatan||'']);rows.push('');
const plan=items.reduce((s,it)=>s+(Number(it.harga)||0),0),paid=items.reduce((s,it)=>s+_renovItemPaidAmount(it),0),incoming=dpTxs.reduce((s,tx)=>s+(Number(tx.amount)||0),0);
add(['=== RINGKASAN ===']);add(['RAB','Rencana Item','Terbayar','Sisa Belanja','DP+Termin Masuk','Dana Proyek','Sisa Tagihan Klien']);add([p.rab||0,plan,paid,Math.max(0,plan-paid),incoming,_renovFundCalc(p,incoming,paid).fund,Math.max(0,(Number(p.rab)||0)-incoming)]);rows.push('');
add(['=== DP / TERMIN ===']);add(['Label','Jenis','Tanggal','Akun','Nominal','Catatan','ID Transaksi']);dpTxs.forEach(tx=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,tx.accountId));add([tx.renovDpLabel||'',tx.renovDpKind||'dp',tx.date||'',acc?acc.name:tx.accountId,tx.amount,tx.note||'',tx.id]);});rows.push('');
add(['=== DAFTAR ITEM ===']);add(['Item','Kategori','Ukuran','Harga Rencana','Terbayar','Sisa','Status','Akun','Tanggal']);items.forEach(it=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,it.accountId)),amount=_renovItemPaidAmount(it);add([it.name,it.grup||it.category||'',it.ukuran||'',it.harga,amount,Math.max(0,(Number(it.harga)||0)-amount),amount>=(Number(it.harga)||0)?'Lunas':amount>0?'Sebagian':'Belum dibayar',acc?acc.name:it.accountId||'',it.paidDate||it.tglBayar||'']);});rows.push('');
add(['=== RIWAYAT CICILAN ===']);add(['Item','ID Pembayaran','Tanggal','Akun','Label','Nominal','ID Transaksi']);items.forEach(it=>(it.payments||[]).forEach(pay=>{const acc=(D.accounts||[]).find(a=>sameId(a.id,pay.accountId));add([it.name,pay.id,pay.date||'',acc?acc.name:pay.accountId||'',pay.label||'',pay.amount,pay.txId]);}));
{const bh=renovBagiHasilRows(p);if(bh){add(['=== LABA BERSIH & BAGI HASIL ===']);add(['Laba Bersih',bh.laba,bh.manual?'manual':'otomatis']);add(['Penerima','Porsi (%)','Bagian Laba (Rp)','Sudah Dicairkan','Belum Dicairkan']);bh.rows.forEach(r=>add([r.ownerName,r.porsi,r.nominal,r.dicairkan==null?'':r.dicairkan,r.belum==null?'':r.belum]));}}
const csv='\uFEFF'+rows.join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=('renovasi-'+String(p.name||'proyek').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.csv');document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('✅ CSV proyek berhasil disiapkan');return csv;
},
// S2866: kunci anti-duplikat impor = nama + harga (kategori/ukuran diabaikan: ekspor menulis grup, item lama menyimpan category).
_itemDupKey(name,price){return String(name==null?'':name).trim().toLowerCase().replace(/\s+/g,' ')+'|'+Math.round(Number(price)||0);},
_existingItemCounts(items){const m=new Map();(Array.isArray(items)?items:[]).forEach(it=>{if(!it)return;const k=Renov._itemDupKey(it.name,it.harga);m.set(k,(m.get(k)||0)+1);});return m;},
_renovParsePrice(raw){
let value=String(raw==null?'':raw).trim().replace(/[^0-9,.-]/g,'');if(!value)return NaN;
const comma=value.lastIndexOf(','),dot=value.lastIndexOf('.');
if(comma>=0&&dot>=0){if(comma>dot)value=value.replace(/\./g,'').replace(',','.');else value=value.replace(/,/g,'');}
else if(comma>=0){const decimals=value.length-comma-1;value=decimals>0&&decimals<=2?value.replace(',','.'):value.replace(/,/g,'');}
else if(dot>=0){const decimals=value.length-dot-1;if(decimals>2)value=value.replace(/\./g,'');}
return Number(value);
},
_csvItemSection(all){
// S2824: CSV hasil Export CSV proyek berisi beberapa seksi (=== ... ===). Import hanya butuh seksi DAFTAR ITEM.
// CSV polos (header Item/Harga di baris pertama) tetap diproses persis seperti sebelumnya.
const norm=v=>String(v==null?'':v).trim().toLowerCase().replace(/[\s_/-]+/g,'');
const hasHdr=r=>Array.isArray(r)&&r.some(c=>['item','nama','namaitem','namabarang'].includes(norm(c)))&&r.some(c=>['harga','hargarencana','nominal','price'].includes(norm(c)));
const isSect=r=>Array.isArray(r)&&r.length>0&&/^'?={3}/.test(String(r[0]||'').trim());
const blank=r=>!Array.isArray(r)||r.every(c=>String(c==null?'':c).trim()==='');
if(!Array.isArray(all)||!all.length||hasHdr(all[0])||!all.some(isSect))return {rows:all||[],offset:0};
let at=all.findIndex(r=>isSect(r)&&/daftar\s*item/i.test(String(r[0]||'')));
let h=at>=0?at+1:all.findIndex(hasHdr);
if(h<0||!hasHdr(all[h]))return {rows:all,offset:0};
let end=h+1;while(end<all.length&&!blank(all[end])&&!isSect(all[end]))end++;
return {rows:all.slice(h,end),offset:h};
},
_csvSkippedSections(all){
// S2828: hitung baris pada seksi DP / TERMIN dan RIWAYAT CICILAN yang TIDAK diimpor (hanya item rencana yang dibawa).
const out={dp:0,cicilan:0};if(!Array.isArray(all))return out;
const isSect=r=>Array.isArray(r)&&r.length>0&&/^'?={3}/.test(String(r[0]||'').trim());
let cur=null,hdr=false;
for(const r of all){
if(isSect(r)){const t=String(r[0]||'');cur=/dp\s*\/?\s*termin/i.test(t)?'dp':/riwayat\s*cicilan/i.test(t)?'cicilan':null;hdr=false;continue;}
if(!cur)continue;
if(!hdr){hdr=true;continue;}
if(Array.isArray(r)&&r.some(c=>String(c==null?'':c).trim()!==''))out[cur]++;
}
return out;
},
_parseCSV(text){
const sample=String(text||'').slice(0,8192);let commas=0,semis=0,quoted=false;for(let i=0;i<sample.length;i++){const c=sample[i];if(c==='"'){if(quoted&&sample[i+1]==='"'){i++;continue;}quoted=!quoted;}else if(!quoted&&c===',')commas++;else if(!quoted&&c===';')semis++;}
const delimiter=semis>commas?';':',';const rows=[];let row=[],field='',inQuotes=false;
for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(inQuotes&&text[i+1]==='"'){field+='"';i++;}else inQuotes=!inQuotes;}else if(c===delimiter&&!inQuotes){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!inQuotes){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>String(v).trim()!==''))rows.push(row);row=[];field='';}else field+=c;}
if(inQuotes)throw new Error('CSV memiliki tanda kutip yang tidak berpasangan');if(field!==''||row.length){row.push(field);if(row.some(v=>String(v).trim()!==''))rows.push(row);}return{delimiter,rows};
},
async importCSV(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const input=document.createElement('input');input.type='file';input.accept='.csv,text/csv';input.style.display='none';document.body.appendChild(input);
input.addEventListener('cancel',()=>input.remove(),{once:true});
input.addEventListener('change',async()=>{try{
const file=input.files&&input.files[0];if(!file)return;if(file.size>2*1024*1024)throw new Error('Ukuran CSV maksimal 2 MB');if(!file.size)throw new Error('File CSV kosong');
let raw=await file.text();raw=raw.replace(/^\uFEFF/,'');if(!raw.trim())throw new Error('File CSV kosong');if(raw.includes('\uFFFD'))throw new Error('Encoding CSV rusak/tidak terbaca');
const parsed=Renov._parseCSV(raw),sect=Renov._csvItemSection(parsed.rows),rows=sect.rows,off=sect.offset;if(rows.length<2)throw new Error('CSV harus memiliki header dan minimal satu baris data');
const header=rows[0].map(v=>String(v||'').trim().toLowerCase().replace(/[\s_/-]+/g,''));const find=(names)=>header.findIndex(h=>names.includes(h));
const nameIdx=find(['item','nama','namaitem','namabarang']);const catIdx=find(['kategori','category']);const sizeIdx=find(['ukuran','ukurankebutuhan','size']);const priceIdx=find(['harga','hargarencana','nominal','price']);
if(nameIdx<0||priceIdx<0)throw new Error('Header wajib: Item/Nama dan Harga');
const keyOf=(name,cat,size,price)=>[name,cat,size,price].map(v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ')).join('|');
const exist=Renov._existingItemCounts(p.items),seen=new Set();const valid=[],invalid=[];let skipExist=0,skipRepeat=0;
rows.slice(1).forEach((r,i)=>{const name=String(r[nameIdx]||'').trim(),category=catIdx>=0?String(r[catIdx]||'').trim():'',size=sizeIdx>=0?String(r[sizeIdx]||'').trim():'';const priceRaw=String(r[priceIdx]||'').trim();const price=Renov._renovParsePrice(priceRaw);if(!name){invalid.push({line:i+2+off,reason:'Nama item kosong'});return;}if(!priceRaw||!Number.isFinite(price)||price<=0){invalid.push({line:i+2+off,reason:'Harga harus angka lebih dari 0'});return;}const key=keyOf(name,category,size,price),dk=Renov._itemDupKey(name,price);if((exist.get(dk)||0)>0){exist.set(dk,exist.get(dk)-1);seen.add(key);skipExist++;invalid.push({line:i+2+off,reason:'Duplikat item (sudah ada)',dup:true});return;}if(seen.has(key)){skipRepeat++;invalid.push({line:i+2+off,reason:'Duplikat item (berulang di file)',dup:true});return;}seen.add(key);valid.push({id:uid(),name,category,ukuran:size,harga:price,paid:false,txId:null,paidDate:null,tglBayar:'',accountId:'',note:'',payments:undefined});});
const badRows=invalid.filter(x=>!x.dup);if(!valid.length){toast(skipExist||skipRepeat?`ℹ️ Tidak ada item baru: ${skipExist} sudah ada${skipRepeat?`, ${skipRepeat} berulang di file`:''}, ${badRows.length} baris tidak valid.`:`⚠️ Tidak ada baris valid. ${invalid.length} baris dilewati.`);return;}
const skipped=Renov._csvSkippedSections(parsed.rows),skipNote=(skipped.dp||skipped.cicilan)?`\n\nCatatan: ${skipped.dp} baris DP/Termin dan ${skipped.cicilan} baris Riwayat Cicilan tidak ikut diimpor (hanya item rencana).`:'';
const preview=`Preview import ${p.name}: ${valid.length} item baru, ${skipExist} dilewati karena sudah ada (cocok nama + harga)${skipRepeat?`, ${skipRepeat} berulang di file`:''}, ${badRows.length} baris tidak valid.\n\n${badRows.slice(0,8).map(x=>`Baris ${x.line}: ${x.reason}`).join('\n')}${skipNote}`;
if(!await askConfirm(preview,{title:'Konfirmasi Import CSV',okText:`Import ${valid.length} item`}))return;
p.items=p.items||[];const start=p.items.length;p.items.push(...valid);if(save()===false){p.items.splice(start,valid.length);toast('⚠️ Import dibatalkan karena penyimpanan gagal');return;}
Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();toast(`✅ ${valid.length} item rencana berhasil diimpor; ${invalid.length} baris dilewati`);
}catch(err){toast('⚠️ Import CSV gagal: '+(err&&err.message||'format tidak valid'));}finally{input.remove();}}, {once:true});input.click();
},
async exportPDF(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return false;}
try{if(typeof ensureJsPDF==='function')await ensureJsPDF();const JsPDF=typeof window!=='undefined'&&window.jspdf&&window.jspdf.jsPDF;if(!JsPDF){toast('⚠️ Library PDF tidak tersedia. Periksa koneksi internet lalu coba lagi.');return false;}
const doc=new JsPDF({unit:'pt',format:'a4'});const left=42,right=553;let y=48;const page=()=>{doc.addPage();y=48;};const ensureSpace=(height=18)=>{if(y+height>680)page();};const section=title=>{ensureSpace(28);doc.setFontSize(12);doc.text(title,left,y);y+=18;};const line=(label,value)=>{ensureSpace(16);doc.setFontSize(9);doc.text(String(label),left,y);doc.text(String(value),right,y,{align:'right'});y+=16;};const money=n=>'Rp '+Math.round(Number(n)||0).toLocaleString('id-ID');
const items=p.items||[],dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));const plan=items.reduce((s,it)=>s+(Number(it.harga)||0),0),paid=items.reduce((s,it)=>s+_renovItemPaidAmount(it),0),incoming=dpTxs.reduce((s,tx)=>s+(Number(tx.amount)||0),0),fc=_renovFundCalc(p,incoming,paid),fund=fc.fund,bd=fc.breakdown;
const categories=new Map();items.forEach(it=>{const key=String(it.grup||it.category||'Tanpa kategori');const row=categories.get(key)||{plan:0,paid:0};row.plan+=Math.max(0,Number(it.harga)||0);row.paid+=_renovItemPaidAmount(it);categories.set(key,row);});
doc.setFontSize(16);doc.text('Laporan Proyek Renovasi',left,y);y+=24;ensureSpace(20);doc.setFontSize(11);doc.text(String(p.name||''),left,y);y+=18;line('Klien',p.klien||'-');line('Nilai Kontrak / RAB',money(p.rab));line('Rencana Item',money(plan));line('Terbayar',money(paid));line('DP + Termin Masuk',money(incoming));line('Dana Proyek',money(fund));if(bd&&bd.talangan>0)line('Talangan pribadi',money(bd.talangan));if(bd&&bd.titipan>0)line('Dibayar dari titipan',money(bd.titipan));if(fund<0)line('STATUS DANA','NOMBOK — dana pribadi '+money(Math.abs(fund)));line('Sisa Tagihan Klien',money(Math.max(0,(Number(p.rab)||0)-incoming)));line('Sisa Belanja',money(Math.max(0,plan-paid)));if(paid>plan)line('Status realisasi','KELEBIHAN BAYAR '+money(paid-plan));
section('DP / Termin');dpTxs.forEach(tx=>line(`${tx.renovDpLabel||tx.renovDpKind||'DP'} · ${tx.date||'-'} · ${tx.note||''}`,money(tx.amount)));
section('Daftar Item Biaya');items.forEach(it=>{line(it.name,`${money(it.harga)} · Dibayar ${money(_renovItemPaidAmount(it))}`);(it.payments||[]).forEach(pay=>line('  '+(pay.label||'Cicilan')+' · '+(pay.date||'-'),money(pay.amount)));});{const bh=renovBagiHasilRows(p);if(bh){section('Laba Bersih & Bagi Hasil');line('Laba Bersih'+(bh.manual?' (manual)':''),money(bh.laba));bh.rows.forEach(r=>line('  '+r.ownerName+' · '+r.porsi+'%',money(r.nominal)));}}
section('Rencana vs Realisasi per Kategori');categories.forEach((row,name)=>{line(name,`Rencana ${money(row.plan)} · Realisasi ${money(row.paid)} · Selisih ${money(row.plan-row.paid)}`);});
const filename='laporan-renovasi-'+String(p.name||'proyek').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.pdf';doc.save(filename);toast('✅ Laporan PDF berhasil dibuat');return true;
}catch(err){console.error('[Renov] export PDF gagal',err);toast('⚠️ PDF gagal dibuat: '+(err&&err.message||'library tidak tersedia'));return false;}
},
// S2817: Export/Import Excel proyek (.xlsx), layout mengikuti sheet REKAP pada RAB_*.xlsx
// (NO | TANGGAL | ITEM | JUMLAH | HARGA SATUAN | ONGKIR | JUMLAH HARGA, dikelompokkan per kategori).
// Fungsi _xlsxBuild()/_xlsxParse() murni (tanpa DOM/XLSX) supaya bisa diuji tanpa pustaka SheetJS.
_xlsxSlug(name){return String(name||'proyek').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'proyek';},
_xlsxNorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/[\s_/.-]+/g,'');},
_xlsxDate(v){
if(v instanceof Date&&Number.isFinite(v.getTime()))return v.toISOString().slice(0,10);
if(typeof v==='number'&&v>20000&&v<80000)return new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);
const s=String(v==null?'':v).trim();return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';
},
_xlsxBuild(p){
const items=Array.isArray(p.items)?p.items:[];
const dpTxs=(D.transactions||[]).filter(tx=>tx&&tx.type==='income'&&_renovSameId(tx.renovDpProjectId,p.id));
const accName=(id)=>{const a=(D.accounts||[]).find(x=>_renovSameId(x.id,id));return a?a.name:(id||'');};
const num=(v)=>Number(v)||0;
const f=(formula,value)=>({t:'n',f:formula,v:value});
const rek=[['REKAP'],['KEGIATAN','',p.name||''],['PEKERJAAN','',p.name||''],['KLIEN','',p.klien||''],['LOKASI','',p.lokasi||''],['TAHUN ANGGARAN','',String(p.createdAt||'').slice(0,4)||new Date().getFullYear()],[],
['NO','TANGGAL','ITEM','JUMLAH','HARGA SATUAN','ONGKIR','JUMLAH HARGA'],[]];
const groups=new Map();items.forEach(it=>{const k=String(it.grup||it.category||'Tanpa kategori');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it);});
let no=0,grand=0;const subRows=[];
groups.forEach((list,cat)=>{
rek.push(['',cat.toUpperCase()]);const first=rek.length+1;
list.forEach(it=>{no++;const r=rek.length+1,hasQty=Number(it.qty)>0&&Number(it.hargaSatuan)>=0&&it.hargaSatuan!=null;
const qty=hasQty?Number(it.qty):1,unit=hasQty?Number(it.hargaSatuan):num(it.harga)-num(it.ongkir),ong=num(it.ongkir),total=num(it.harga);
rek.push([no,it.paidDate||it.tglBayar||'',it.name||'',qty,unit,ong||'',f(`(D${r}*E${r})+F${r}`,total)]);});
const last=rek.length;const sub=list.reduce((s,it)=>s+num(it.harga),0);grand+=sub;
rek.push(['','','','','JUMLAH','',f(`SUM(G${first}:G${last})`,sub)]);subRows.push({r:rek.length,v:sub});rek.push([]);
});
rek.push(['','','','','TOTAL JMLH','',subRows.length?f(subRows.map(x=>'G'+x.r).join('+'),grand):0]);
const plan=grand,paid=items.reduce((s,it)=>s+_renovItemPaidAmount(it),0),incoming=dpTxs.reduce((s,tx)=>s+num(tx.amount),0);
const sum=[['RINGKASAN PROYEK'],['Nama Proyek',p.name||''],['Klien',p.klien||''],['Lokasi',p.lokasi||''],['Nilai Kontrak/RAB',num(p.rab)],['Rencana Item',plan],['Terbayar',paid],['Sisa Belanja',Math.max(0,plan-paid)],['DP + Termin Masuk',incoming],['Dana Proyek',_renovFundCalc(p,incoming,paid).fund],['Sisa Tagihan Klien',Math.max(0,num(p.rab)-incoming)],['Catatan',p.catatan||'']];
const dp=[['Label','Jenis','Tanggal','Akun','Nominal','Catatan','ID Transaksi']];
dpTxs.forEach(tx=>dp.push([tx.renovDpLabel||'',tx.renovDpKind||'dp',tx.date||'',accName(tx.accountId),num(tx.amount),tx.note||'',tx.id]));
const cic=[['Item','ID Pembayaran','Tanggal','Akun','Label','Nominal','ID Transaksi']];
items.forEach(it=>(it.payments||[]).forEach(pay=>cic.push([it.name||'',pay.id,pay.date||'',accName(pay.accountId),pay.label||'',num(pay.amount),pay.txId])));
return [{name:'REKAP',rows:rek},{name:'Ringkasan',rows:sum},{name:'DP-Termin',rows:dp},{name:'Cicilan',rows:cic}];
},
reconcileItemAccounts(dryRun){
// S2818 F8: akun item Renovasi mengikuti akun transaksi (transaksi = sumber kebenaran). dryRun=true hanya menghitung.
const accs=(typeof D!=='undefined'&&D&&Array.isArray(D.accounts))?D.accounts:[];
const txs=(typeof D!=='undefined'&&D&&Array.isArray(D.transactions))?D.transactions:[];
let n=0;
((typeof D!=='undefined'&&D&&D.renovProjects)||[]).forEach(p=>(p&&p.items||[]).forEach(it=>{
if(!it||!it.txId||!it.accountId)return;
if(accs.some(a=>sameId(a.id,it.accountId)))return;
const t=txs.find(x=>x&&sameId(x.id,it.txId));
if(!t||!t.accountId||!accs.some(a=>sameId(a.id,t.accountId)))return;
n++;if(!dryRun)it.accountId=t.accountId;
}));
if(!dryRun&&n>0&&typeof save==='function')save();
return n;
},
_renovExpenseCategory(raw){
const cats=(typeof D!=='undefined'&&D&&D.categories&&Array.isArray(D.categories.expense))?D.categories.expense:[];
const nm=c=>String((c&&c.name)||c||'').trim();
const want=String(raw||'').trim().toLowerCase();
if(want){const hit=cats.find(c=>nm(c).toLowerCase()===want);if(hit)return nm(hit);}
const reno=cats.find(c=>/^reno?v/i.test(nm(c)));
return reno?nm(reno):'Renovasi';
},
_xlsxParse(aoa,existingItems){
const rows=Array.isArray(aoa)?aoa:[];const N=Renov._xlsxNorm;
let h=-1,cols=null;
for(let i=0;i<Math.min(rows.length,60)&&h<0;i++){
const n=(rows[i]||[]).map(N);
const item=n.findIndex(x=>x==='item'||x==='nama'||x==='namaitem'||x==='namabarang');
const tot=n.findIndex(x=>x==='jumlahharga'||x==='hargarencana'||x==='harga'||x==='total');
if(item>=0&&tot>=0){h=i;cols={item,tot,qty:n.indexOf('jumlah'),unit:n.findIndex(x=>x==='hargasatuan'),ong:n.indexOf('ongkir'),tgl:n.indexOf('tanggal'),cat:n.findIndex(x=>x==='kategori'||x==='category'),size:n.findIndex(x=>x==='ukuran'||x==='ukurankebutuhan')};}
}
if(h<0)return {ok:false,error:'Header tidak ditemukan. Wajib ada kolom ITEM dan JUMLAH HARGA (atau Item dan Harga).',valid:[],invalid:[],zero:0};
const val=(x)=>typeof x==='number'?x:Renov._renovParsePrice(x);
const keyOf=(name,cat,price)=>[name,cat,price].map(v=>String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ')).join('|');
const exist=Renov._existingItemCounts(existingItems),seen=new Set();
const valid=[],invalid=[];let zero=0,group='',profit=0,skipped=0,skipExist=0;
const STOP=/^(totaljmlh|hjk|dividen|sisakas)/;
for(let i=h+1;i<rows.length;i++){
const r=rows[i]||[];const line=i+1;
const lead=r.slice(0,Math.max(cols.item,1)+1).map(N);
if(r.some(c=>STOP.test(N(c)))&&!String(r[cols.item]||'').trim().length)break;
if(STOP.test(N(r[cols.item]))||lead.some(x=>/^(totaljmlh|hjk\(|dividen)/.test(x)))break;
const name=String(r[cols.item]==null?'':r[cols.item]).trim();
if(/^(profit|margin|keuntungan|laba)\b/i.test(name)){const pv=val(r[cols.tot]);if(Number.isFinite(pv)&&pv>0)profit+=pv;continue;}
const label=cols.cat>=0?String(r[cols.cat]||'').trim():'';
if(cols.cat<0&&cols.item>=1){const g=String(r[cols.item-1]==null?'':r[cols.item-1]).trim();if(g&&!/^\d+$/.test(g)&&!/^\d{4}-/.test(g))group=g;}
if(!name)continue;
const total0=val(r[cols.tot]),total=Number.isFinite(total0)?Math.round(total0):total0;
const category=(label||group||'').trim();
if(!Number.isFinite(total)||total<=0){if(!Number.isFinite(total)||total===0){zero++;}else invalid.push({line,reason:'Harga tidak boleh negatif'});continue;}
const key=keyOf(name,category,total),dk=Renov._itemDupKey(name,total);
if((exist.get(dk)||0)>0){exist.set(dk,exist.get(dk)-1);seen.add(key);skipped++;skipExist++;invalid.push({line,reason:'Duplikat item (sudah ada)',dup:true});continue;}
if(seen.has(key)){skipped++;invalid.push({line,reason:'Duplikat item (berulang di file)',dup:true});continue;}
seen.add(key);
const it={id:typeof uid==='function'?uid():String(Date.now())+i,name,category:Renov._renovExpenseCategory(''),grup:category,ukuran:cols.size>=0?String(r[cols.size]||'').trim():'',harga:total,paid:false,txId:null,paidDate:null,tglBayar:'',accountId:'',note:'',payments:undefined};
const q=cols.qty>=0?val(r[cols.qty]):NaN,u=cols.unit>=0?val(r[cols.unit]):NaN,o=cols.ong>=0?val(r[cols.ong]):NaN;
if(Number.isFinite(q)&&q>0&&Number.isFinite(u)&&u>=0){it.qty=q;it.hargaSatuan=u;if(Number.isFinite(o)&&o>0)it.ongkir=o;}
valid.push(it);
}
let hjk=0,lokasi='';
for(let i=0;i<rows.length;i++){const r=rows[i]||[];const n=r.map(N);
const hi=n.findIndex(x=>/^hjk/.test(x));if(hi>=0&&!hjk){const nums=r.slice(hi+1).map(x=>typeof x==='number'?x:NaN).filter(Number.isFinite);if(nums.length&&nums[nums.length-1]>0)hjk=nums[nums.length-1];}
if(!lokasi&&n[0]==='lokasi'){const t=r.slice(1).find(x=>String(x||'').trim());if(t)lokasi=String(t).trim();}}
return {ok:true,valid,invalid,zero,skipped,skipExist,meta:{hjk:Math.round(hjk),lokasi,profit:Math.round(profit)}};
},
async _xlsxEnsure(){
if(typeof XLSX!=='undefined')return true;
try{await ensureXLSX();}catch(e){toast('⚠️ Gagal memuat pustaka Excel, cek koneksi internet');return false;}
if(typeof XLSX==='undefined'){toast('⚠️ Pustaka Excel tidak tersedia');return false;}
return true;
},
async exportXLSX(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return false;}
if(!await Renov._xlsxEnsure())return false;
try{
const wb=XLSX.utils.book_new();
Renov._xlsxBuild(p).forEach(s=>{const ws=XLSX.utils.aoa_to_sheet(s.rows);if(s.name==='REKAP')ws['!cols']=[{wch:5},{wch:12},{wch:48},{wch:9},{wch:14},{wch:10},{wch:16}];XLSX.utils.book_append_sheet(wb,ws,s.name);});
XLSX.writeFile(wb,'renovasi-'+Renov._xlsxSlug(p.name)+'.xlsx');
toast('✅ File Excel proyek berhasil diunduh');return true;
}catch(err){console.error('[Renov] export XLSX gagal',err);toast('⚠️ Export Excel gagal: '+(err&&err.message||'tidak diketahui'));return false;}
},
async importXLSX(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const input=document.createElement('input');input.type='file';input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';input.style.display='none';document.body.appendChild(input);
input.addEventListener('cancel',()=>input.remove(),{once:true});
input.addEventListener('change',async()=>{try{
const file=input.files&&input.files[0];if(!file)return;
if(file.size>5*1024*1024)throw new Error('Ukuran file maksimal 5 MB');if(!file.size)throw new Error('File Excel kosong');
if(!await Renov._xlsxEnsure())return;
const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
const names=(wb.SheetNames||[]).slice().sort((a,b)=>(/^rekap$/i.test(String(b).trim())?1:0)-(/^rekap$/i.test(String(a).trim())?1:0));
if(!names.length)throw new Error('File tidak memiliki sheet');
let pick='',res=null,firstErr='';
for(const nm of names){const aoa=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,defval:'',raw:true});const r0=Renov._xlsxParse(aoa,p.items);if(r0.ok){pick=nm;res=r0;break;}if(!firstErr)firstErr=r0.error;}
if(!res)throw new Error(firstErr||'Format sheet tidak dikenali');
const badX=res.invalid.filter(x=>!x.dup);if(!res.valid.length){toast(res.skipped?`ℹ️ Tidak ada item baru di sheet "${pick}": ${res.skipExist} sudah ada, ${res.skipped-res.skipExist} berulang di file, ${badX.length+res.zero} baris lain dilewati.`:`⚠️ Tidak ada baris valid di sheet "${pick}". ${res.invalid.length+res.zero} baris dilewati.`);return;}
const sumNew=res.valid.reduce((s,it)=>s+it.harga,0);
const setRab=!(Number(p.rab)>0)&&res.meta&&res.meta.hjk>0;
const setLok=!String(p.lokasi||'').trim()&&res.meta&&res.meta.lokasi;
const setProfit=!!(res.meta&&res.meta.profit>0);
const preview=`Preview import Excel ke ${p.name} (sheet "${pick}"): ${res.valid.length} item baru, total ${fmtFull(sumNew)}; ${res.skipExist} dilewati karena sudah ada (cocok nama + harga)${res.skipped>res.skipExist?`, ${res.skipped-res.skipExist} berulang di file`:''}; ${res.zero} baris harga 0/kosong dilewati, ${badX.length} baris tidak valid.${setRab?`\nNilai Kontrak/RAB proyek (masih kosong) akan diisi HJK ${fmtFull(res.meta.hjk)}.`:''}${setLok?`\nLokasi proyek (masih kosong) akan diisi "${res.meta.lokasi}".`:''}${setProfit?`\nBaris PROFIT ${fmtFull(res.meta.profit)} bukan biaya: tidak diimpor sebagai item, disimpan sebagai margin proyek.`:''}\n\n${badX.slice(0,8).map(x=>`Baris ${x.line}: ${x.reason}`).join('\n')}`;
if(!await askConfirm(preview,{title:'Konfirmasi Import Excel',okText:`Import ${res.valid.length} item`}))return;
p.items=p.items||[];const start=p.items.length,oldRab=p.rab,oldLok=p.lokasi,oldProfit=p.profit;p.items.push(...res.valid);if(setProfit)p.profit=res.meta.profit;if(setRab)p.rab=res.meta.hjk;if(setLok)p.lokasi=res.meta.lokasi;
if(save()===false){p.items.splice(start,res.valid.length);if(setProfit){if(oldProfit===undefined)delete p.profit;else p.profit=oldProfit;}if(setRab)p.rab=oldRab;if(setLok){if(oldLok===undefined)delete p.lokasi;else p.lokasi=oldLok;}toast('⚠️ Import dibatalkan karena penyimpanan gagal');return;}
Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();
toast(`✅ ${res.valid.length} item rencana berhasil diimpor dari Excel`+(setRab?` (RAB diisi ${fmtFull(res.meta.hjk)})`:''));
}catch(err){toast('⚠️ Import Excel gagal: '+(err&&err.message||'format tidak valid'));}finally{input.remove();}},{once:true});input.click();
},
renderDetail(){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){closeModal('renovDetailModal');return;}
document.getElementById('renovDetailTitle').textContent=p.name;
document.getElementById('renovDetailNote').textContent=p.catatan||'';
const t=Renov.totals(p);
_renovSetStat('renovDetTotal',t.total);
_renovSetStat('renovDetPaid',t.paid);
_renovSetStat('renovDetSisa',t.sisa);
const pct=t.total>0?Math.min(100,Math.round((t.paid/t.total)*100)):0;
document.getElementById('renovDetBar').style.width=pct+'%';
document.getElementById('renovDetPct').textContent=pct+'% selesai';
document.getElementById('renovDetCount').textContent=`${t.paidCount}/${t.count} item lunas`;
const listEl=document.getElementById('renovItemList');
Renov.renderFundPanel(p);
if(!t.count){
listEl.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Belum ada item biaya</div></div>';
return;
}
const renderRow=(it)=>{
const acc=D.accounts.find(a=>sameId(a.id,it.accountId));
const itemPaid=_renovItemPaidAmount(it),itemSettled=(Number(it.harga)||0)>0&&itemPaid>=(Number(it.harga)||0),itemOverpaid=itemPaid>(Number(it.harga)||0);
return`<div class="tx-item" data-renov-item-id="${escapeHtml(String(it.id))}">
        <div class="tx-icon" style="background:${itemSettled?'var(--accent3-soft)':'var(--surface3)'};cursor:pointer" data-action="Renov.openPayModal" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" title="${itemSettled?'Lihat pembayaran':'Catat pembayaran'}">${itemSettled?'✅':(itemPaid>0?'🟡':'⬜')}</div>
        <div class="tx-info u-pointer" data-action="Renov.openItemModal" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}">
          <div class="tx-name" style="${itemSettled?'text-decoration:line-through;color:var(--text2)':''}">${escapeHtml(it.name)} ${(it.grup||it.category)?`<span class="acc-chip">${escapeHtml(it.grup||it.category)}</span>`:''}</div>
          <div class="tx-meta">${it.ukuran?('📏 '+escapeHtml(it.ukuran)+' · '):''}${it.hargaTotal?('💰 Total '+fmt(it.hargaTotal)+' · '):''}${itemOverpaid?'Kelebihan bayar · ':itemSettled?'Lunas · ':itemPaid>0?'Terbayar '+fmt(itemPaid)+' · ':''}${acc?acc.emoji+' '+escapeHtml(acc.name):'Belum pilih akun'}${it.calcDetail?(' · 🧮'+(Math.round(it.calcDetail.total||0)!==Math.round(it.harga||0)?' ⚠️':'')):''}</div>
        </div>
        <div class="tx-amount ${itemSettled?'green':''}">${fmt(it.harga)}</div>
        <button class="tx-del" data-action="Renov.deleteItem" data-args="${escapeHtml(JSON.stringify([p.id, it.id]))}" aria-label="Hapus">🗑</button>
      </div>`;
};
const belum=p.items.filter(it=>_renovItemPaidAmount(it)<(Number(it.harga)||0));
const sudah=p.items.filter(it=>_renovItemPaidAmount(it)>=(Number(it.harga)||0));
let html='';
if(belum.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:10px 0 6px">🛒 Perlu Dibeli (${belum.length})</div>`+belum.map(renderRow).join('');
if(sudah.length)html+=`<div class="u-fs11 u-fw700 u-t2" style="text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px">✅ Sudah Dibeli (${sudah.length})</div>`+sudah.map(renderRow).join('');
listEl.innerHTML=html;
},
_ensurePayModal(){
let el=document.getElementById('renovPayModal');
if(!el){el=document.createElement('div');el.id='renovPayModal';el.className='overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);}
return el;
},
openPayModal(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));
if(!p||!it){toast('⚠️ Item/proyek tidak ditemukan');return;}
Renov._payProjectId=p.id;Renov._payItemId=it.id;Renov._payMode='cash';
Renov._renderPayModal();openModal('renovPayModal');
},
_renderPayModal(){
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));
if(!p||!it)return;
const el=Renov._ensurePayModal();
const paid=_renovItemPaidAmount(it),remaining=Math.max(0,(Number(it.harga)||0)-paid);
const payments=Array.isArray(it.payments)?it.payments:(it.txId?[{id:'legacy-'+it.txId,txId:it.txId,amount:it.harga,date:it.paidDate||it.tglBayar,accountId:it.accountId,label:'Pembayaran cash lama',legacy:true}]:[]);
const history=payments.map(pay=>{
const acc=(D.accounts||[]).find(a=>sameId(a.id,pay.accountId));
return `<div class="tx-item u-aic"><div class="tx-info"><div class="tx-name">${escapeHtml(pay.label||'Pembayaran')}</div><div class="tx-meta">${escapeHtml(pay.date||'-')} · ${escapeHtml(acc?acc.name:'Akun tidak tersedia')}</div></div><div class="tx-amount">${fmt(pay.amount||0)}</div><button class="tx-del" data-action="${pay.legacy?'Renov.deleteLegacyItemPayment':'Renov.deleteItemPayment'}" data-args="${escapeHtml(JSON.stringify(pay.legacy?[p.id,it.id,pay.txId]:[p.id,it.id,pay.id]))}" aria-label="Hapus pembayaran">🗑</button></div>`;
}).join('');
const accounts=(D.accounts||[]).map(a=>`<option value="${escapeHtml(String(a.id))}" ${sameId(a.id,it.accountId)?'selected':''}>${escapeHtml(a.emoji||'')} ${escapeHtml(a.name||'Akun')}</option>`).join('');
const mode=Renov._payMode||'cash';
el.innerHTML=`<div class="modal" style="max-height:90vh;overflow:auto"><div class="modal-handle"></div><div class="modal-title"><span>Pembayaran Item Renovasi</span><button class="modal-close" data-action="closeModal" data-args='["renovPayModal"]'>✕</button></div><div style="overflow:auto;max-height:calc(90vh - 90px)"><div class="u-fw700">${escapeHtml(it.name)}</div><div class="u-t2 u-fs12 u-mt4">Harga item: ${fmtFull(it.harga)} · Terbayar: ${fmtFull(paid)} · Sisa: ${fmtFull(remaining)}</div><div class="u-mt12 u-fw700">Riwayat pembayaran</div>${history||'<div class="u-t2 u-fs12 u-mt6">Belum ada riwayat cicilan.</div>'}<div class="divider u-my12"></div><div class="u-fw700 u-mb8">Catat pembayaran</div><div class="u-flex u-gap8"><button class="btn u-flex1 ${mode==='cash'?'btn-primary':'btn-ghost'}" data-action="Renov.setPayMode" data-args='["cash"]'>Cash / Lunas</button><button class="btn u-flex1 ${mode==='installment'?'btn-primary':'btn-ghost'}" data-action="Renov.setPayMode" data-args='["installment"]'>Cicil</button></div><div class="fg"><label class="fl" for="renovPayAmount">Nominal (Rp)</label><input id="renovPayAmount" class="fi" type="number" min="1" step="1" value="${mode==='cash'?remaining:''}" ${mode==='cash'?'readonly':''} placeholder="Nominal pembayaran"></div><div class="fg"><label class="fl" for="renovPayDate">Tanggal</label><input id="renovPayDate" class="fi" type="date" value="${todayStr()}"></div><div class="fg"><label class="fl" for="renovPayAccount">Akun sumber dana</label><select id="renovPayAccount" class="fi" data-onchange="Renov.updatePayOwnerVisibility">${accounts}</select></div>${p.dana==='klien'?`<div class="fg"><label class="fl" for="renovPaySource">Sumber dana proyek</label><select id="renovPaySource" class="fi"><option value="">Konfirmasi sumber dana</option><option value="proyek">Dana klien (proyek)</option><option value="talangan-tagih">Talangan dengan hak tagih ke klien (jadi piutang)</option><option value="talangan-pribadi">Talangan pribadi (bukan biaya dana klien)</option></select><div class="u-fs11 u-t2">Pilih sesuai sumber uang sebenarnya, bukan hanya nama rekening.</div></div>`:''}<div id="renovPayOwnerWrap" class="u-mt8" style="display:none"><div class="fg"><label class="fl" for="renovPayOwner">Pemilik / Penanggung</label><select id="renovPayOwner" class="fi"></select></div></div><div class="fg"><label class="fl" for="renovPayLabel">Keterangan</label><input id="renovPayLabel" class="fi" maxlength="120" placeholder="${mode==='cash'?'Pelunasan':'Termin pembayaran'}"></div><div class="u-flex u-gap8 u-mt14"><button class="btn btn-primary u-flex1 u-p14" data-action="Renov.submitItemPayment">Simpan Pembayaran</button><button class="btn btn-ghost" data-action="closeModal" data-args='["renovPayModal"]'>Tutup</button></div></div></div>`;
Renov.updatePayOwnerVisibility();
},
updatePayOwnerVisibility(){
const accId=document.getElementById('renovPayAccount')?.value,wrap=document.getElementById('renovPayOwnerWrap'),sel=document.getElementById('renovPayOwner');if(!wrap||!sel)return;
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accId):[];if(!accId){wrap.style.display='none';sel.innerHTML='';return;}
wrap.style.display='block';renovFillOwnerSelect(sel,owners,'renovPayAccount','Renov.updatePayOwnerVisibility');
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId)),it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));if(it&&it.deductionOwnerId&&owners.some(o=>o.ownerId===it.deductionOwnerId))sel.value=it.deductionOwnerId;else if(owners.length===1)sel.value=owners[0].ownerId;sel.setAttribute('data-prev-owner',sel.value||'');
},
setPayMode(mode){
if(mode!=='cash'&&mode!=='installment')return;
Renov._payMode=mode;Renov._renderPayModal();
},
async submitItemPayment(){
if(Renov._paymentInFlight)return;
const p=D.renovProjects.find(x=>sameId(x.id,Renov._payProjectId));
const it=p&&(p.items||[]).find(x=>sameId(x.id,Renov._payItemId));
if(!p||!it){toast('⚠️ Item/proyek tidak ditemukan');return;}
const paid=_renovItemPaidAmount(it),remaining=Math.max(0,(Number(it.harga)||0)-paid);
const mode=Renov._payMode||'cash';
const amount=Math.round(mode==='cash'?remaining:Number(document.getElementById('renovPayAmount')?.value));
const date=document.getElementById('renovPayDate')?.value||todayStr();
const accountId=document.getElementById('renovPayAccount')?.value||'';
const sourceEl=document.getElementById('renovPaySource'),sourceChoice=sourceEl?sourceEl.value:'';
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accountId):[];const ownerEl=document.getElementById('renovPayOwner');const deductionOwnerId=owners.length?(ownerEl?.value||''):'';
const label=(document.getElementById('renovPayLabel')?.value||'').trim()||(mode==='cash'?'Pelunasan':'Cicilan');
if(!(amount>0)||!Number.isFinite(amount)||amount>Math.ceil(remaining)){toast('⚠️ Nominal harus lebih dari 0 dan tidak melebihi sisa pembayaran');return;}
if(!accountId){toast('⚠️ Pilih akun pembayaran');return;}
if(p.dana==='klien'&&!['proyek','talangan-tagih','talangan-pribadi'].includes(sourceChoice)){toast('⚠️ Konfirmasi sumber dana pembayaran');return;}
if(owners.length>1&&!deductionOwnerId){toast('⚠️ Pilih pemilik/penanggung akun');return;}
if(!date){toast('⚠️ Tanggal pembayaran wajib diisi');return;}
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT){toast('⚠️ FinanceTxSOT tidak tersedia');return;}
Renov._paymentInFlight=true;
let tx=null,payment=null,legacyBefore=null,committed=false;const hadPayments=Array.isArray(it.payments);
try{
const txId=uid(),paymentId=uid();
const legacyCash=mode==='cash'&&!Array.isArray(it.payments)&&paid===0&&p.dana!=='klien';
const txData={id:txId,type:'expense',amount,accountId,date,category:Renov._renovExpenseCategory(it.category),subcategory:'',payMethod:(mode==='installment'?'cicilan':'tunai'),note:`Renovasi: ${p.name} - ${it.name} (${label})`,renovProjectLinkId:p.id,renovItemLinkId:it.id,...(!legacyCash?{renovPaymentId:paymentId}:{})};
if(deductionOwnerId)txData.deductionOwnerId=deductionOwnerId;else if(it.deductionOwnerId&&owners.length===0)txData.deductionOwnerId=it.deductionOwnerId;
tx=FinanceTxSOT.create(txData);
const linked=FinanceTxSOT.patchMetaById(txId,{renovProjectLinkId:p.id,renovItemLinkId:it.id,...(!legacyCash?{renovPaymentId:paymentId}:{})});if(!linked)throw new Error('Gagal menautkan transaksi pembayaran ke item Renovasi');
if(legacyCash){
legacyBefore={paid:it.paid,txId:it.txId,paidDate:it.paidDate};
it.paid=true;it.txId=txId;it.paidDate=date;
} else {
if(!Array.isArray(it.payments))it.payments=[];
payment={id:paymentId,txId,amount,date,accountId,label,...(p.dana==='klien'?{sumberDana:sourceChoice}:{})};it.payments.push(payment);if(p.dana==='klien'&&sourceChoice==='talangan-tagih'){const r=renovEnsureTalanganPiutang(p,it,payment);if(!r.ok)throw new Error(r.reason);}
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
}
const saved=save();
if(saved===false)throw new Error('Penyimpanan gagal; transaksi dibatalkan');
committed=true;
try{if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});}catch(refreshErr){console.warn('[Renov] refresh setelah pembayaran gagal',refreshErr);}
try{if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-pay',projectId:p.id,itemId:it.id,txId:tx.id,amount});}catch(outboxErr){console.warn('[Renov] outbox pembayaran gagal',outboxErr);}
try{Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();}catch(renderErr){console.warn('[Renov] render setelah pembayaran gagal',renderErr);}
toast('✅ Pembayaran tercatat sebagai transaksi Keuangan');
}catch(err){
if(!committed){
if(payment&&Array.isArray(it.payments))it.payments=it.payments.filter(x=>!sameId(x.id,payment.id));
if(!hadPayments)delete it.payments;
if(legacyBefore){it.paid=legacyBefore.paid;it.txId=legacyBefore.txId;it.paidDate=legacyBefore.paidDate;}
if(tx)try{FinanceTxSOT.removeById(tx.id);}catch(rollbackError){console.error('[Renov] rollback transaksi gagal',rollbackError);}
console.error('[Renov] pembayaran gagal',err);toast('⚠️ Pembayaran gagal: '+(err&&err.message||'kesalahan tidak diketahui'));
}else{console.error('[Renov] pembayaran sudah tersimpan, ada kegagalan pasca-commit',err);toast('⚠️ Pembayaran sudah tersimpan; tampilan perlu dimuat ulang.');}
}finally{Renov._paymentInFlight=false;}
},
async setPaymentSource(projectId,itemId,paymentId,source){if(!['proyek','talangan-tagih','talangan-pribadi'].includes(source))return false;const p=(D.renovProjects||[]).find(x=>sameId(x.id,projectId)),it=p&&(p.items||[]).find(x=>sameId(x.id,itemId)),pay=it&&Array.isArray(it.payments)?it.payments.find(x=>sameId(x.id,paymentId)):null;if(!pay)return false;const old=pay.sumberDana,piBefore=JSON.stringify(D.piutang||[]);if(source==='talangan-tagih'){const r=renovEnsureTalanganPiutang(p,it,pay);if(!r.ok){toast('⚠️ '+r.reason);return false;}}else if(old==='talangan-tagih'){const hadPaid=(D.piutang||[]).some(x=>x&&x.renovPaymentId!=null&&sameId(x.renovPaymentId,pay.id)&&x.lunas);if(hadPaid){toast('⚠️ Piutang talangan sudah lunas; sumber dana tidak dapat diubah');return false;}renovRemoveUnpaidTalanganPiutang(x=>sameId(x.renovPaymentId,pay.id));}pay.sumberDana=source;if(save()===false){pay.sumberDana=old;const rows=JSON.parse(piBefore);if(typeof BillDebtPiutangCanonicalWriter!=='undefined'&&BillDebtPiutangCanonicalWriter&&typeof BillDebtPiutangCanonicalWriter.replace==='function')BillDebtPiutangCanonicalWriter.replace('piutang',rows);else D.piutang=rows;toast('⚠️ Gagal menyimpan sumber dana');return false;}Renov.renderFundPanel(p);return true;},
async deleteLegacyItemPayment(projectId,itemId,txId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId)),it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));if(!it||!sameId(it.txId,txId)||Array.isArray(it.payments))return;
if(!await askConfirm('Hapus pembayaran cash lama? Transaksi pengeluaran terkait juga akan dihapus dari Keuangan.'))return;
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');const removed=FinanceTxSOT.removeById(txId);if(!removed){toast('⚠️ Transaksi lama tidak ditemukan');return;}
const old={paid:it.paid,txId:it.txId,paidDate:it.paidDate};it.paid=false;it.txId=null;it.paidDate=null;
if(save()===false){it.paid=old.paid;it.txId=old.txId;it.paidDate=old.paidDate;try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] pemulihan cash legacy gagal',e);}toast('⚠️ Gagal menyimpan penghapusan pembayaran');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();toast('🗑 Pembayaran cash lama dihapus dari Keuangan');
},
async deleteItemPayment(projectId,itemId,paymentId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));const it=p&&(p.items||[]).find(x=>sameId(x.id,itemId));
const pay=it&&Array.isArray(it.payments)?it.payments.find(x=>sameId(x.id,paymentId)):null;
if(!pay)return;
if(!await askConfirm(`Hapus pembayaran ${fmtFull(pay.amount)}? Transaksi pengeluaran terkait juga akan dihapus dari Keuangan.`))return;
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
const removed=FinanceTxSOT.removeById(pay.txId);if(!removed){toast('⚠️ Transaksi pembayaran tidak ditemukan; riwayat dipertahankan');return;}
const oldPayments=it.payments.slice();const oldPaid=it.paid;it.payments=it.payments.filter(x=>!sameId(x.id,paymentId));it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
if(save()===false){it.payments=oldPayments;it.paid=oldPaid;try{FinanceTxSOT.create(removed);}catch(e){console.error('[Renov] pemulihan transaksi gagal',e);}toast('⚠️ Gagal menyimpan penghapusan pembayaran');return;}
if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-payment-delete',projectId:p.id,itemId:it.id,txId:removed.id});
Renov.render();if(sameId(Renov.curId,p.id))Renov.renderDetail();Renov._renderPayModal();toast('🗑 Pembayaran dihapus dari Renovasi dan Keuangan');
},
openItemModal(projectId,itemId){
Renov.curId=projectId;
Renov.editItemId=itemId||null;
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=itemId?p.items.find(x=>sameId(x.id,itemId)):null;
const cats=getCatsByType('expense');
document.getElementById('renovItemCat').innerHTML='<option value="">Tanpa kategori</option>'+cats.map(c=>`<option value="${escapeHtml(c.name)}">${c.emoji} ${escapeHtml(c.name)}</option>`).join('');
document.getElementById('renovItemAcc').innerHTML=D.accounts.map(a=>`<option value="${escapeHtml(a.id)}">${a.emoji} ${escapeHtml(a.name)}</option>`).join('');
document.getElementById('renovItemModalTitle').textContent=it?'Edit Item Biaya':'Tambah Item Biaya';
document.getElementById('renovItemName').value=it?it.name:'';
document.getElementById('renovItemUkuran').value=it?(it.ukuran||''):'';
document.getElementById('renovItemHarga').value=it?it.harga:'';
document.getElementById('renovItemHargaTotal').value=(it&&it.hargaTotal)?it.hargaTotal:'';
document.getElementById('renovItemHargaTotalToggle').checked=!!(it&&it.hargaTotal);
Renov.toggleHargaTotalFields();
document.getElementById('renovItemCat').value=it?(it.category||''):'';
document.getElementById('renovItemAcc').value=it?(it.accountId||D.accounts[0]?.id||''):(D.accounts[0]?.id||'');
Renov.updateDeductionOwnerVisibility(it?(it.deductionOwnerId||''):'');
document.getElementById('renovItemTglBayar').value=it?(it.tglBayar||it.paidDate||todayStr()):todayStr();
document.getElementById('renovItemNote').value=it?(it.note||''):'';
document.getElementById('renovItemPaidNotice').style.display=(it&&it.paid)?'block':'none';
RenovCalc._pendingDetail=null;
Renov._currentItemCalcDetail=it?(it.calcDetail||null):null;
const calcNoteEl=document.getElementById('renovItemCalcSaved');
if(calcNoteEl){
if(it&&it.calcDetail){
const mismatch=Math.round(it.calcDetail.total||0)!==Math.round(it.harga||0);
calcNoteEl.style.display='block';
calcNoteEl.innerHTML='🧮 Rincian tersimpan: '+escapeHtml(it.calcDetail.text||'')+(mismatch?' <span class="u-cacc2 u-fw600">(⚠️ sudah tidak sesuai harga terbaru)</span>':'');
} else {
calcNoteEl.style.display='none';
calcNoteEl.innerHTML='';
}
}
document.getElementById('renovItemLinkOldWrap').style.display=(it&&it.paid)?'none':'block';
closeModal('renovDetailModal');
openModal('renovItemModal');
},
// updateDeductionOwnerVisibility(presetOwnerId) — BUGFIX (audit "estimasi belum
// teralokasi" sesi 3, root cause sinyal 2/2 sesi 2): item Renovasi yang ditandai
// lunas (togglePaid()) atau ditautkan ke transaksi lama (confirmLinkTx()) TIDAK
// PERNAH menawarkan pemilihan "Ditanggung: <owner>" untuk akun Dana Titipan
// multi-owner -- transaksi hasilnya lolos TANPA `deductionOwnerId`, jadi
// resolveTxOwnerAssignment() (filter-laporan.js) fallback ke owners[0] (owner
// pertama), bukan owner yang sebenarnya menanggung. Fix: reuse PENUH pola
// #txDeductionOwner (transaksi.js/modals.js) -- renovAccountOwners(accId) (tx-renov.js, 1 SOT = resolveOwnerDefaultForAccount; dulu getAccOwnersRaw) (akun.js,
// 0 rumus baru) sbg sumber owners akun terpilih. 0 owner asli -> wrap
// disembunyikan (akun lama/single-owner, 0 regresi). >=1 owner -> wrap
// ditampilkan, dropdown diisi ulang dari nol tiap dipanggil (opsi owner akun
// sebelumnya TIDAK terbawa), value diisi presetOwnerId kalau valid (mode edit)
// atau owners[0] kalau cuma 1 owner (auto-select, sama seperti pola S575).
// Dipanggil dari openItemModal() (isi ulang tiap modal dibuka) + onchange
// #renovItemAcc (ganti akun -> opsi ikut berubah).
updateDeductionOwnerVisibility(presetOwnerId){
const accId=document.getElementById('renovItemAcc').value;
const wrap=document.getElementById('renovItemDeductionOwnerWrap');
const sel=document.getElementById('renovItemDeductionOwner');
if(!wrap||!sel)return;
const owners=typeof renovAccountOwners==='function'?renovAccountOwners(accId):[];
if(!accId){wrap.style.display='none';sel.innerHTML='';return;}
wrap.classList.remove('u-dnone');
wrap.style.display='block';
renovFillOwnerSelect(sel,owners,'renovItemAcc','Renov.updateDeductionOwnerVisibility');
if(presetOwnerId&&owners.some(o=>o.ownerId===presetOwnerId)){
sel.value=presetOwnerId;
} else if(owners.length===1){
sel.value=owners[0].ownerId;
}
sel.setAttribute('data-prev-owner',sel.value||'');
},
toggleHargaTotalFields(){
const on=document.getElementById('renovItemHargaTotalToggle').checked;
const wrap=document.getElementById('renovItemHargaTotalWrap');
const lbl=document.getElementById('renovItemHargaLbl');
wrap.classList.toggle('u-dnone',!on);
lbl.textContent=on?'Porsi Saya / Dilacak (Rp)':'Harga (Rp)';
Renov.syncHargaTotalPreview();
},
syncHargaTotalPreview(){
const on=document.getElementById('renovItemHargaTotalToggle').checked;
const prevEl=document.getElementById('renovItemHargaTotalPreview');
if(!on){prevEl.textContent='';return;}
const total=parseFloat(document.getElementById('renovItemHargaTotal').value)||0;
const mine=parseFloat(document.getElementById('renovItemHarga').value)||0;
if(total<=0){prevEl.textContent='';return;}
const selisih=total-mine;
prevEl.textContent=selisih>0?`Selisih (bukan porsi kamu): ${fmtFull(selisih)}`:(selisih<0?`⚠️ Porsi dilacak lebih besar dari Harga Total`:'Porsi dilacak = Harga Total penuh');
},
saveItem(){
evalAmtExpr('renovItemHarga');
evalAmtExpr('renovItemHargaTotal');
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const name=document.getElementById('renovItemName').value.trim();
const ukuran=document.getElementById('renovItemUkuran').value.trim();
const harga=parseFloat(document.getElementById('renovItemHarga').value)||0;
const hargaTotalOn=document.getElementById('renovItemHargaTotalToggle').checked;
const hargaTotal=hargaTotalOn?(parseFloat(document.getElementById('renovItemHargaTotal').value)||0):null;
if(!name||harga<=0){toast('⚠️ Lengkapi nama & harga item');return;}
const existingForPrice=Renov.editItemId?p.items.find(x=>sameId(x.id,Renov.editItemId)):null;
if(existingForPrice&&harga<_renovItemPaidAmount(existingForPrice)){toast('⚠️ Harga item tidak boleh lebih kecil dari total yang sudah dibayar');return;}
const category=document.getElementById('renovItemCat').value;
const accountId=document.getElementById('renovItemAcc').value||D.accounts[0]?.id;
const tglBayar=document.getElementById('renovItemTglBayar').value||todayStr();
const note=document.getElementById('renovItemNote').value.trim();
const deductionOwnerSel=document.getElementById('renovItemDeductionOwner');
const deductionOwnerWrapEl=document.getElementById('renovItemDeductionOwnerWrap');
const deductionOwnerId=(deductionOwnerSel&&deductionOwnerWrapEl&&deductionOwnerWrapEl.style.display!=='none')?(deductionOwnerSel.value||''):'';
// S2832: item lunas lama (1 transaksi tertaut) di akun multi-pemilik WAJIB punya penanggung -- kosong akan menghapus deductionOwnerId transaksinya.
if(Renov.editItemId&&!deductionOwnerId&&typeof renovAccountOwners==='function'&&renovAccountOwners(accountId).length>1){
const _eit=p.items.find(x=>sameId(x.id,Renov.editItemId));
if(_eit&&_eit.paid&&_eit.txId&&!Array.isArray(_eit.payments)){toast('⚠️ Pilih pemilik/penanggung akun');return;}
}
let calcDetail=null;
if(RenovCalc._pendingDetail&&Math.round(RenovCalc._pendingDetail.total)===Math.round(harga)){
calcDetail=RenovCalc._pendingDetail;
}
if(Renov.editItemId){
const it=p.items.find(x=>sameId(x.id,Renov.editItemId));
if(it){
it.name=name;it.ukuran=ukuran;it.harga=harga;it.hargaTotal=hargaTotal;it.category=category;it.accountId=accountId;it.note=note;it.tglBayar=tglBayar;
if(deductionOwnerId)it.deductionOwnerId=deductionOwnerId;else delete it.deductionOwnerId;
if(calcDetail){
if(it.calcDetail&&it.calcDetail.type==='absensi'&&it.calcDetail!==calcDetail){
Tukang.releaseEntries(it.calcDetail.entryIds);
}
it.calcDetail=calcDetail;
if(calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,it.id);
}
if(it.paid&&it.txId&&!Array.isArray(it.payments)){
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
// Legacy cash transaction remains editable through FinanceTxSOT; installment history is immutable here.
// S2766: edit transaksi tertaut lewat FinanceTxSOT.updateById (bukan Object.assign langsung)
// supaya kanonikalisasi kategori/subkategori & batas SOT tetap berlaku.
const t=FinanceTxSOT.updateById(it.txId,{amount:harga,category:category||'Renovasi',accountId,date:tglBayar,note:'Renovasi: '+p.name+' - '+name+(note?' ('+note+')':''),deductionOwnerId:deductionOwnerId||undefined});
if(t){
it.paidDate=tglBayar;
if(typeof FinanceEventOutbox!=='undefined'&&FinanceEventOutbox&&typeof FinanceEventOutbox.emitOrEnqueue==='function')FinanceEventOutbox.emitOrEnqueue('finance.updated',{kind:'renov',action:'item-edit-paid',projectId:p.id,itemId:it.id,txId:t.id,amount:harga});
}
}
}
} else {
const newId=uid();
p.items.push({id:newId,name,ukuran,harga,hargaTotal,category,accountId,note,tglBayar,calcDetail,paid:false,txId:null,paidDate:null,deductionOwnerId:deductionOwnerId||undefined});
if(calcDetail&&calcDetail.type==='absensi')Tukang.markUsed(calcDetail.entryIds,newId);
}
RenovCalc._pendingDetail=null;
Renov.editItemId=null;
save();closeModal('renovItemModal');
Renov.render();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
Renov.openDetail(p.id);
toast('✅ Item tersimpan');
},
togglePaid(projectId,itemId){
// Compatibility alias: all new cash/installment payments use one SOT-backed flow.
return Renov.openPayModal(projectId,itemId);
},
async deleteItem(projectId,itemId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,itemId));
if(!it)return;
const hasLinkedTx=!!(it.txId||(Array.isArray(it.payments)&&it.payments.some(pay=>pay&&pay.txId)));
const msg=hasLinkedTx?`Hapus item "${escapeHtml(it.name)}"? Semua transaksi pembayaran terkait di Keuangan akan ikut dihapus.`:`Hapus item "${escapeHtml(it.name)}"?`;
if(!await askConfirm(msg))return;
// BUGFIX (Bug E, s633, lihat AUDIT-s632-bugE-renovasi-delete-cascade.md):
// sebelum sesi ini, baris di bawah cuma D.transactions=D.transactions.
// filter(...) langsung -- BYPASS TOTAL cascade delTx() (stok sparepart/
// servis/BBM linked jadi orphan permanen). Fix: jalankan
// runTxDeleteCascades() (SSOT sama persis yg dipakai delTx(),
// tx-list-cashflow.js) DULU selagi transaksinya masih ada di
// D.transactions (beberapa cascade butuh state tsb), baru filter keluar.
// skipRenovCascade:true supaya TIDAK memanggil Renov.onLinkedTxDeleted(t)
// balik ke diri sendiri -- item ini SENDIRI sedang dihapus total
// (p.items=p.items.filter(...) di bawah), beda dari delTx() yang cuma
// mereset status lunas item (item tetap ada). Guard typeof: aman kalau
// urutan build.js berubah/tx-list-cashflow.js belum dimuat -- fallback ke
// perilaku lama (filter langsung, 0 error) daripada crash.
const linkedIds=[it.txId,...(Array.isArray(it.payments)?it.payments.map(pay=>pay&&pay.txId):[])].filter(Boolean);
if(linkedIds.length&&typeof FinanceTxSOT==='undefined')throw new Error('FINANCE_TX_SOT_REQUIRED');
linkedIds.forEach(txId=>{
const linkedTx=FinanceTxSOT.findById(txId);
if(linkedTx&&typeof runTxDeleteCascades==='function')runTxDeleteCascades(linkedTx,{skipRenovCascade:true});
if(linkedTx)FinanceTxSOT.removeById(txId);
});
if(it.calcDetail&&it.calcDetail.type==='absensi')Tukang.releaseEntries(it.calcDetail.entryIds);
p.items=p.items.filter(x=>!sameId(x.id,itemId));
save();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});Renov.render();Renov.renderDetail();
toast('🗑 Item dihapus');
},
onLinkedTxDeleted(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
if(Array.isArray(it.payments)){
// S2831: item lama (lunas via txId) yang dimigrasi ke payments[] punya baris payment bertaut txId TANPA renovPaymentId di transaksinya -> cocokkan juga lewat txId, jangan tinggalkan payment yatim.
it.payments=it.payments.filter(pay=>!(t.renovPaymentId!=null&&sameId(pay.id,t.renovPaymentId))&&!sameId(pay.txId,t.id));
if(it.txId!=null&&sameId(it.txId,t.id)){it.txId=null;it.paidDate=null;}
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
} else {
it.paid=false;it.txId=null;it.paidDate=null;
}
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
},
onLinkedTxEdited(t){
const p=D.renovProjects.find(x=>sameId(x.id,t.renovProjectLinkId));
if(!p)return;
const it=p.items.find(x=>sameId(x.id,t.renovItemLinkId));
if(!it)return;
if(Array.isArray(it.payments)){
const pay=it.payments.find(x=>(t.renovPaymentId!=null&&sameId(x.id,t.renovPaymentId))||sameId(x.txId,t.id));
if(pay){pay.amount=Math.max(0,Number(t.amount)||0);pay.date=t.date;pay.accountId=t.accountId;(D.piutang||[]).forEach(x=>{if(x&&x.renovPaymentId!=null&&sameId(x.renovPaymentId,pay.id)&&!x.lunas&&Number(x.nilai)>pay.amount)x.nilai=pay.amount;});}
it.paid=_renovItemPaidAmount(it)>=(Number(it.harga)||0);
} else {
it.harga=t.amount;it.category=t.category;it.accountId=t.accountId;it.paidDate=t.date;it.tglBayar=t.date;
}
Renov.render();
if(sameId(Renov.curId,p.id))Renov.renderDetail();
},
openLinkTxModal(){
LinkTx.open('renov',Renov.curId);
},
async confirmLinkTx(txId){
const p=D.renovProjects.find(x=>sameId(x.id,Renov.curId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const t=D.transactions.find(x=>sameId(x.id,txId));
if(!t){toast('⚠️ Transaksi tidak ditemukan');return;}
if(!await askConfirm(`Hubungkan transaksi "${t.note||t.category||'ini'}" (${fmtFull(t.amount)}, ${t.date}) ke item renovasi ini? Item akan otomatis terisi & langsung berstatus lunas dari transaksi ini — TIDAK ada transaksi baru yang dibuat.`,{okText:'Ya, Hubungkan',icon:'🔗',danger:false}))return;
const nameInput=document.getElementById('renovItemName').value.trim();
const noteInput=document.getElementById('renovItemNote').value.trim();
let it=Renov.editItemId?p.items.find(x=>sameId(x.id,Renov.editItemId)):null;
if(!it){
it={id:uid(),name:nameInput||t.note||t.category||'Item Renovasi',note:noteInput,paid:false,txId:null,paidDate:null};
p.items.push(it);
Renov.editItemId=it.id;
} else if(nameInput){
it.name=nameInput;it.note=noteInput;
}
it.harga=t.amount;it.category=t.category;it.accountId=t.accountId;
it.paid=true;it.txId=t.id;it.paidDate=t.date;it.tglBayar=t.date;
if(typeof FinanceTxSOT==='undefined'||!FinanceTxSOT)throw new Error('FINANCE_TX_SOT_REQUIRED');
const _linkPatch={renovProjectLinkId:p.id,renovItemLinkId:it.id};
if(it.deductionOwnerId&&!t.deductionOwnerId)_linkPatch.deductionOwnerId=it.deductionOwnerId;
else if(t.deductionOwnerId)it.deductionOwnerId=t.deductionOwnerId;
FinanceTxSOT.patchMetaById(t.id,_linkPatch);
Renov.editItemId=null;
save();closeModal('linkTxModal');closeModal('renovItemModal');
Renov.render();if(typeof refreshAfterMutation==='function')refreshAfterMutation({dashboard:true,finance:true});
Renov.openDetail(p.id);
toast('✅ Transaksi lama dihubungkan ke item renovasi (tidak dobel)');
}
};
// BUGFIX (Sesi 13 Tahap 1b lazy-load, temuan post-deploy v873): DEFAULT_CATS
// dipindah ke modules/shared/data-default.js. Sebelumnya nangkring di sini
// (kebetulan, tidak ada hubungan dgn fitur Renovasi) dan jadi ReferenceError
// saat boot krn file ini sekarang lazy-load (baru dimuat saat tab Renovasi
// dibuka), padahal kategori.js/backup-restore.js/features-helpers-global-
// security.js butuh DEFAULT_CATS langsung saat app pertama kali jalan.
const RenovAI={
systemPrompt(){
return `Kamu asisten renovasi rumah utk keluarga Indonesia. Kamu akan dikasih nama proyek renovasi & daftar item biaya yang sudah dicatat user (nama, ukuran/kebutuhan kalau ada, status sudah/belum dibeli). Tugasmu kasih saran singkat & praktis dalam Bahasa Indonesia, format Markdown ringkas dgn heading kecil pakai **tebal** (bukan JSON):
1. **Kebutuhan yang mungkin terlewat** — barang/jasa lazim utk proyek sejenis yang belum ada di daftar.
2. **Perkiraan ukuran/jumlah** — utk item yang ukurannya belum diisi, kasih perkiraan umum wajar (mis. keramik lantai kamar mandi 2x2m ± perlu berapa m² dgn buangan potong) & sebutkan itu perkiraan kasar yang perlu dicek ulang.
3. **Saran tambahan** — urutan pengerjaan yang wajar, atau hal yang sering bikin biaya membengkak.
Jangan mengarang harga pasti (Rupiah), fokus ke jenis/ukuran/jumlah & saran non-finansial. Jawab ringkas, maksimal sekitar 200-250 kata, jangan pakai kode fence.`;
},
buildUserPrompt(p){
const items=(p.items||[]).map(it=>`- ${escapeHtml(it.name)}${it.ukuran?` (ukuran/kebutuhan: ${it.ukuran})`:' (ukuran belum diisi)'} — ${it.paid?'sudah dibeli':'belum dibeli'}`).join('\n')||'(belum ada item dicatat)';
return `Nama proyek: ${escapeHtml(p.name)}${p.catatan?`\nCatatan: ${p.catatan}`:''}\nDaftar item saat ini:\n${items}\n\nBerikan saran sesuai instruksi.`;
},
async suggest(projectId){
const p=D.renovProjects.find(x=>sameId(x.id,projectId));
if(!p){toast('⚠️ Proyek tidak ditemukan');return;}
const apiKey=D.profile.apiKey;
const provider=D.profile.apiProvider||'claude';
if(!apiKey){toast('⚠️ Belum ada API Key. Isi dulu di Pengaturan → AI Asisten.');return;}
document.getElementById('renovAiBody').innerHTML='<div class="empty"><div class="empty-icon">🤖</div><div class="empty-text">Menyusun saran... (bisa beberapa detik)</div></div>';
openModal('renovAiModal');
try{
const r=await callAIProviderRaw(RenovAI.systemPrompt(),[{role:'user',content:RenovAI.buildUserPrompt(p)}],{maxTokens:1200});
if(!r.ok){
const label=provider==='gemini'?'Gemini':'Claude';
document.getElementById('renovAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal hubungi ${label}: ${escapeHtml(r.errMsg||'error tidak diketahui')}${aiErrorHint(provider,r.status)}</div></div>`;
return;
}
const textOut=r.text;
if(!textOut){
document.getElementById('renovAiBody').innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">AI tidak memberi balasan teks. Coba lagi.</div></div>';
return;
}
const htmlOut=escapeHtml(textOut).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
document.getElementById('renovAiBody').innerHTML=`<div class="u-fs13 u-lh16">${htmlOut}</div>`;
}catch(e){
document.getElementById('renovAiBody').innerHTML=`<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-text">Gagal ambil saran: ${escapeHtml(e.message||String(e))}</div></div>`;
}
}
};

// Sesi 13 — Tahap 1b (lazy-load): file ini sekarang bisa dimuat TERPISAH lewat
// _loadScriptOnce() (lihat ensureRenov() di index.html), bukan cuma lewat bundle
// app-bundle-a.min.js. app-bootstrap.js (Object.assign(window,{...})) cuma jalan
// SEKALI saat boot, sebelum file ini sempat ke-load kalau lazy — jadi modul ini
// sekarang mendaftarkan dirinya sendiri ke window di sini, supaya kapan pun file
// ini akhirnya dimuat, Renov/RenovAI/RenovCalc selalu tersedia sbg window.Renov
// dkk juga — 0 perubahan perilaku utk pemanggil yang sudah ada.
// ===== S2860: Laba Bersih & Bagi Hasil Proyek (porsi % <-> nominal Rp dua arah, laba bisa manual / otomatis) =====
// Data: p.bagiHasil = {labaManual:number|null, owners:[{ownerId,ownerName,porsi,isSelf}], tgl}. Nominal TIDAK disimpan (turunan porsi x laba).
// Laba otomatis: proyek klien selesai & ada ledger -> laba diakui bersih; selain itu estimasi = RAB - max(rencana item, terbayar).
function renovBiayaProyek(p){const items=Array.isArray(p&&p.items)?p.items:[];const plan=items.reduce((s,it)=>s+Math.max(0,Number(it&&it.harga)||0),0);const paid=items.reduce((s,it)=>s+(typeof _renovItemPaidAmount==='function'?(Number(_renovItemPaidAmount(it))||0):0),0);return{plan,paid,biaya:Math.max(plan,paid)};}
function renovLabaBersihAuto(p){const rab=Math.max(0,Number(p&&p.rab)||0),b=renovBiayaProyek(p);let sm=null;try{sm=renovLabaSummary(p);}catch(_e){sm=null;}if(sm&&p&&p.dana==='klien'&&p.status==='selesai'&&sm.labaDiakuiBersih>0)return{nilai:Math.round(sm.labaDiakuiBersih),sumber:'ledger',rab,biaya:b.biaya};return{nilai:Math.round(rab-b.biaya),sumber:'estimasi',rab,biaya:b.biaya};}
function renovLabaBersihEfektif(p,manualOverride){const a=renovLabaBersihAuto(p);const m=manualOverride!==undefined?manualOverride:(p&&p.bagiHasil&&p.bagiHasil.labaManual);const manual=typeof m==='number'&&isFinite(m);return{...a,manual,auto:a.nilai,nilai:manual?Math.round(m):a.nilai};}
function _bhRound10(n){return Math.round(n*1e10)/1e10;}
function _bhNominal(laba,porsi){return laba>0?Math.round(laba*(Number(porsi)||0)/100):'';}
function _bhDefaultOwners(){return[{ownerId:'SELF',ownerName:(typeof D!=='undefined'&&D.profile&&D.profile.nama)||'Saya',porsi:100,isSelf:true,_touched:false}];}
function _bhDraft(p){if(!p)return null;if(!Renov._bh||!sameId(Renov._bh.pid,p.id)){const s=p.bagiHasil;Renov._bh={pid:p.id,labaManual:(s&&typeof s.labaManual==='number'&&isFinite(s.labaManual))?s.labaManual:null,owners:(s&&Array.isArray(s.owners)&&s.owners.length)?s.owners.map(o=>({ownerId:o.ownerId||'',ownerName:o.ownerName||'',porsi:Number(o.porsi)||0,isSelf:!!o.isSelf,_touched:false})):_bhDefaultOwners()};}return Renov._bh;}
function renovBagiHasilPanelHtml(p){
if(!p||!(p.dana==='klien'||Number(p.rab)>0||p.bagiHasil))return'';
const d=_bhDraft(p),lb=renovLabaBersihEfektif(p,d.labaManual),laba=lb.nilai,esc=escapeHtml;
const total=d.owners.reduce((s,o)=>s+(Number(o.porsi)||0),0),ok=Math.abs(total-100)<=0.01;
const reg=(typeof OwnerRegistry!=='undefined'&&typeof OwnerRegistry.listAll==='function')?OwnerRegistry.listAll():[];
const dl='<datalist id="renovBhOwners">'+reg.map(r=>'<option value="'+esc(r.name||'')+'"></option>').join('')+'</datalist>';
const rows=d.owners.map((o,i)=>'<div class="u-mt8"><div class="u-flex u-gap8" style="align-items:center;margin-bottom:6px"><input type="text" class="fi" style="flex:1" list="renovBhOwners" placeholder="Nama penerima bagi hasil" value="'+esc(o.ownerName||'')+'" data-oninput="Renov.bhNameInput" data-oninput-args=\'['+i+',"$value"]\'><button type="button" class="btn btn-ghost btn-sm" data-action="Renov.bhRemove" data-args=\'['+i+']\' aria-label="Hapus penerima">✕</button></div><div class="u-grid2" style="margin-bottom:0"><div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Porsi (%)</label><input type="number" class="fi" id="renovBhP'+i+'" inputmode="decimal" placeholder="%" value="'+(Number(o.porsi)||0)+'" data-oninput="Renov.bhPorsiInput" data-oninput-args=\'['+i+',"$value"]\'></div><div class="fg u-mb0"><label class="fl" style="margin-bottom:2px">Bagian laba (Rp)</label><input type="text" class="fi" id="renovBhN'+i+'" inputmode="decimal" placeholder="0" value="'+_bhNominal(laba,o.porsi)+'" data-oninput="Renov.bhNominalInput" data-oninput-args=\'['+i+',"$value"]\'></div></div></div>').join('');
const sumber=lb.manual?'diisi manual':(lb.sumber==='ledger'?'dari laba diakui (ledger)':'estimasi RAB − biaya');
return '<div class="u-fw700 u-fs12 u-mt12">🧮 Laba Bersih &amp; Bagi Hasil</div>'+dl+
'<div class="u-grid u-grid2 u-gap8 u-mt6"><div><div class="u-fs11 u-t2">Nilai kontrak / RAB</div><div class="u-fw700">'+fmt(lb.rab)+'</div></div><div><div class="u-fs11 u-t2">Total biaya proyek</div><div class="u-fw700">'+fmt(lb.biaya)+'</div></div></div>'+
'<div class="fg u-mt8 u-mb0"><label class="fl" style="margin-bottom:2px">Laba bersih (Rp) — '+sumber+'</label><div class="u-flex u-gap8"><input type="text" class="fi" id="renovBhLaba" style="flex:1" inputmode="decimal" placeholder="Otomatis: '+Math.round(lb.auto)+'" value="'+(lb.manual?Math.round(laba):'')+'" data-oninput="Renov.bhLabaInput" data-oninput-args=\'["$value"]\'><button type="button" class="btn btn-ghost btn-sm" data-action="Renov.bhResetLaba">↺ Otomatis</button></div></div>'+
'<div class="u-fs11 u-t2 u-mt4" id="renovBhLabaInfo">'+(laba>0?('Laba bersih dipakai: <b>'+fmt(laba)+'</b>'):('⚠️ Laba bersih '+fmt(laba)+' (belum positif) — kolom Rp belum bisa dihitung, isi laba manual bila perlu.'))+'</div>'+
rows+
'<div class="u-fs12 u-mt8 u-fw700" id="renovBhTotal" style="color:'+(ok?'var(--accent3)':'var(--accent2)')+'">'+(ok?'✅ Total porsi: '+_bhRound10(total)+'% (pas 100%)':'⚠️ Total porsi: '+_bhRound10(total)+'% ('+(total<100?'kurang '+_bhRound10(100-total):'lebih '+_bhRound10(total-100))+'%)')+'</div>'+
(()=>{const w=renovLedgerMelebihiSelf(p);return w?'<div class="u-fs12 u-mt8" style="color:var(--danger)">⚠️ Ledger melebihi bagian '+esc(w.nama)+' ('+fmt(w.nominal)+'): laba diakui '+fmt(w.diakui)+', dicairkan '+fmt(w.cair)+'. Periksa bila tidak disengaja.</div>':'';})()+
(()=>{const x=renovSelisihManualLedger(p,lb);return x?'<div class="u-fs11 u-t2 u-mt6">Laba manual '+fmt(x.manual)+' berbeda dari batas laba ledger '+fmt(x.ledger)+' (selisih '+fmt(Math.abs(x.selisih))+(x.selisih>0?', mis. belanja belum terbayar':'')+'). Ledger memakai batas ledger; bagian penerima dihitung dari laba manual.</div>':'';})()+
(()=>{const bh=renovBagiHasilRows(p);if(!bh||!bh.laba)return'';const klien=p.dana==='klien';return '<div class="u-fs11 u-t2 u-mt10">Tersimpan (laba '+fmt(bh.laba)+'):</div>'+bh.rows.map(r=>'<div class="u-flex u-jcsb u-fs12 u-py4" style="gap:8px;flex-wrap:wrap"><span>'+esc(r.ownerName)+' · '+Number(Number(r.porsi).toFixed(4))+'%</span><span class="u-fw700">'+fmt(r.nominal)+(klien?' <span class="u-fs11 u-t2">(cair '+(r.dicairkan==null?'—':fmt(r.dicairkan))+' · belum '+(r.belum==null?'—':fmt(r.belum))+')</span>':'')+'</span></div>').join('');})()+'<div class="renov-fund-actions u-mt8"><button type="button" class="btn btn-ghost btn-sm" data-action="Renov.bhAdd">➕ Tambah Penerima</button><button type="button" class="btn btn-ghost btn-sm" data-action="Renov.bhRata">⚖️ Bagi Rata</button><button type="button" class="btn btn-ghost btn-sm" data-action="Renov.bhReload">↺ Reset Draft</button><button type="button" class="btn btn-primary" id="renovBhSave" data-action="Renov.bhSave"'+(ok?'':' disabled')+'>✅ Simpan Bagi Hasil</button></div>';
}
// renovBagiHasilRows(p) — bagi hasil TERSIMPAN (p.bagiHasil) -> baris {ownerName,porsi,nominal,dicairkan,belum}. PURE.
// Nominal dibulatkan per baris, selisih pembulatan ke baris porsi terbesar (total = laba). dicairkan/belum (hanya proyek klien): baris isSelf = ledger langsung; penerima lain null; tanpa isSelf = porsi x ledger.
function renovBagiHasilRows(p){const s=p&&p.bagiHasil;if(!s||!Array.isArray(s.owners)||!s.owners.length)return null;const lb=renovLabaBersihEfektif(p,(typeof s.labaManual==='number'&&isFinite(s.labaManual))?s.labaManual:null),laba=lb.nilai;let cair=0,belum=0;if(p.dana==='klien'){try{const sm=renovLabaSummary(p);cair=Math.max(0,sm.pencairanValid||0);belum=Math.max(0,sm.labaBelumDicairkan||0);}catch(_e){cair=0;belum=0;}}
const split=(total)=>{const r=s.owners.map(o=>Math.round(total*(Number(o.porsi)||0)/100));if(total>0&&r.length){let big=0;s.owners.forEach((o,i)=>{if((Number(o.porsi)||0)>(Number(s.owners[big].porsi)||0))big=i;});r[big]+=Math.round(total)-r.reduce((a,b)=>a+b,0);}return r;};
const nom=laba>0?split(laba):s.owners.map(()=>0),c=cair>0?split(cair):s.owners.map(()=>0),b=belum>0?split(belum):s.owners.map(()=>0);
// S2865: ledger pencairan = pendapatan pribadi pemilik perangkat (renovPencairanIncome). Bila ada baris isSelf, hanya baris itu yang mendapat cair/belum
// (cair = total ledger, belum = nominal - cair, min 0); penerima lain null (tidak dilacak). Tanpa baris isSelf: perilaku lama (proporsional).
const selfIdx=s.owners.findIndex(o=>o&&o.isSelf);
if(p.dana==='klien'&&selfIdx>=0)return{laba,manual:lb.manual,rows:s.owners.map((o,i)=>({ownerName:o.ownerName,porsi:Number(o.porsi)||0,nominal:nom[i],dicairkan:i===selfIdx?cair:null,belum:i===selfIdx?Math.max(0,nom[i]-cair):null}))};
return{laba,manual:lb.manual,rows:s.owners.map((o,i)=>({ownerName:o.ownerName,porsi:Number(o.porsi)||0,nominal:nom[i],dicairkan:c[i],belum:b[i]}))};}
// S2866: peringatan (BUKAN blokir) bila akui/cairkan laba melebihi bagian pemilik perangkat (baris isSelf) pada bagi hasil tersimpan.
// Batas keras ledger (bisaAkui/batasPencairan) tidak diubah. Tanpa baris isSelf / laba belum positif -> tidak ada peringatan.
function renovBagianSelf(p){const bh=renovBagiHasilRows(p);if(!bh||!Array.isArray(bh.rows))return null;const own=(p&&p.bagiHasil&&Array.isArray(p.bagiHasil.owners))?p.bagiHasil.owners:[];const idx=own.findIndex(o=>o&&o.isSelf);if(idx<0)return null;const row=bh.rows[idx];if(!row||!(row.nominal>0))return null;return{nama:String(row.ownerName||'').trim()||'W',nominal:row.nominal};}
// S2867: sisa bagian W untuk jumlah awal modal (akui: nominal - laba diakui; cairkan: nominal - pencairan valid). null = tanpa baris isSelf (tidak membatasi).
function renovSisaBagianSelf(p,aksi){const b=renovBagianSelf(p);if(!b)return null;const sm=renovLabaSummary(p);const sudah=aksi==='cairkan'?(Number(sm.pencairanValid)||0):(Number(sm.labaDiakuiBersih)||0);return Math.max(0,b.nominal-sudah);}
// S2867: kondisi pasif - ledger (diakui bersih atau pencairan valid) sudah di atas nominal W (mis. biaya berubah setelah akui). null bila tidak.
function renovLedgerMelebihiSelf(p){if(!p||p.dana!=='klien')return null;const b=renovBagianSelf(p);if(!b)return null;const sm=renovLabaSummary(p);const diakui=Number(sm.labaDiakuiBersih)||0,cair=Number(sm.pencairanValid)||0;return(diakui>b.nominal||cair>b.nominal)?{nama:b.nama,nominal:b.nominal,diakui,cair}:null;}
// S2867: selisih Laba manual vs batas laba ledger (LabaMaks) setelah proyek memenuhi syarat; null bila tidak relevan / sama.
function renovSelisihManualLedger(p,lb){if(!p||p.dana!=='klien'||!lb||!lb.manual)return null;let sm;try{sm=renovLabaSummary(p);}catch(_e){return null;}if(!sm||!sm.syarat)return null;const d=Math.round(sm.labaMaks)-Math.round(lb.nilai);return d===0?null:{manual:Math.round(lb.nilai),ledger:Math.round(sm.labaMaks),selisih:d};}
function renovCekMelebihiBagianSelf(p,aksi,jumlah){if(aksi!=='akui'&&aksi!=='cairkan')return null;const n=Math.max(0,Number(jumlah)||0);if(!(n>0))return null;const b=renovBagianSelf(p);if(!b)return null;const sm=renovLabaSummary(p);const sudah=aksi==='akui'?(Number(sm.labaDiakuiBersih)||0):(Number(sm.pencairanValid)||0);const total=sudah+n;return total>b.nominal?{nama:b.nama,nominal:b.nominal,sudah,total}:null;}
Object.assign(Renov,{
_bh:null,
_bhProject(){return(D.renovProjects||[]).find(x=>sameId(x.id,Renov.curId));},
_bhBase(){const p=Renov._bhProject(),d=p&&_bhDraft(p);return p&&d?renovLabaBersihEfektif(p,d.labaManual).nilai:0;},
_bhSyncDom(skipP,skipN){const d=Renov._bh;if(!d)return;const laba=Renov._bhBase();d.owners.forEach((o,i)=>{const pe=document.getElementById('renovBhP'+i),ne=document.getElementById('renovBhN'+i);if(pe&&i!==skipP)pe.value=Number(o.porsi)||0;if(ne&&i!==skipN)ne.value=_bhNominal(laba,o.porsi);});const total=d.owners.reduce((s,o)=>s+(Number(o.porsi)||0),0),ok=Math.abs(total-100)<=0.01,box=document.getElementById('renovBhTotal'),btn=document.getElementById('renovBhSave');if(box){box.style.color=ok?'var(--accent3)':'var(--accent2)';box.textContent=ok?('✅ Total porsi: '+_bhRound10(total)+'% (pas 100%)'):('⚠️ Total porsi: '+_bhRound10(total)+'% ('+(total<100?'kurang '+_bhRound10(100-total):'lebih '+_bhRound10(total-100))+'%)');}if(btn)btn.disabled=!ok;const info=document.getElementById('renovBhLabaInfo');if(info)info.innerHTML=laba>0?('Laba bersih dipakai: <b>'+fmt(laba)+'</b>'):('⚠️ Laba bersih '+fmt(laba)+' (belum positif) — kolom Rp belum bisa dihitung, isi laba manual bila perlu.');},
// Auto-fill: 2 penerima -> yang lain = sisa 100%; >=3 -> satu-satunya baris yang belum pernah diketik menampung sisa.
_bhAutoFill(i){const rows=Renov._bh.owners;let t=-1;if(rows.length===2)t=i===0?1:0;else{const c=rows.map((o,k)=>k).filter(k=>k!==i&&!rows[k]._touched);if(c.length===1)t=c[0];}if(t<0)return;const other=rows.reduce((s,o,k)=>k===t?s:s+(Number(o.porsi)||0),0);rows[t].porsi=Math.max(0,_bhRound10(100-other));},
bhNameInput(i,val){const d=Renov._bh;if(!d||!d.owners[i])return;d.owners[i].ownerName=val;const reg=(typeof OwnerRegistry!=='undefined'&&typeof OwnerRegistry.listAll==='function')?OwnerRegistry.listAll():[];const m=reg.find(r=>String(r.name||'').trim().toLowerCase()===String(val).trim().toLowerCase());d.owners[i].ownerId=m?m.id:(d.owners[i].isSelf?'SELF':'');},
bhPorsiInput(i,val){const d=Renov._bh;if(!d||!d.owners[i])return;const n=parseFloat(val);d.owners[i].porsi=isFinite(n)?Math.max(0,n):0;d.owners[i]._touched=true;Renov._bhAutoFill(i);Renov._bhSyncDom(i,-1);},
bhNominalInput(i,val){const d=Renov._bh;if(!d||!d.owners[i])return;const laba=Renov._bhBase();if(!(laba>0))return;const n=parseFloat(String(val).replace(/[^0-9.-]/g,''));const nominal=isFinite(n)?Math.max(0,n):0;d.owners[i].porsi=_bhRound10(nominal/laba*100);d.owners[i]._touched=true;Renov._bhAutoFill(i);Renov._bhSyncDom(-1,i);},
bhLabaInput(val){const d=Renov._bh;if(!d)return;const s=String(val).replace(/[^0-9.-]/g,'');const n=parseFloat(s);d.labaManual=(s===''||!isFinite(n))?null:n;Renov._bhSyncDom(-1,-1);},
bhResetLaba(){const d=Renov._bh,p=Renov._bhProject();if(!d||!p)return;d.labaManual=null;Renov.renderFundPanel(p);},
bhAdd(){const d=Renov._bh,p=Renov._bhProject();if(!d||!p)return;d.owners.push({ownerId:'',ownerName:'',porsi:0,isSelf:false,_touched:false});Renov.renderFundPanel(p);},
bhRemove(i){const d=Renov._bh,p=Renov._bhProject();if(!d||!p||!d.owners[i])return;const gone=Number(d.owners[i].porsi)||0;d.owners.splice(i,1);if(gone>0&&d.owners.length){const n=d.owners.length;let acc=0;d.owners.forEach((o,k)=>{const add=k===n-1?_bhRound10(gone-acc):_bhRound10(gone/n);acc+=add;o.porsi=_bhRound10((Number(o.porsi)||0)+add);});}Renov.renderFundPanel(p);},
bhRata(){const d=Renov._bh,p=Renov._bhProject();if(!d||!p||!d.owners.length)return;const n=d.owners.length;let acc=0;d.owners.forEach((o,k)=>{const v=k===n-1?_bhRound10(100-acc):_bhRound10(100/n);acc+=v;o.porsi=v;o._touched=true;});Renov.renderFundPanel(p);},
bhReload(){const p=Renov._bhProject();if(!p)return;Renov._bh=null;Renov.renderFundPanel(p);toast('↺ Draft dikembalikan ke data tersimpan');},
bhSave(){const d=Renov._bh,p=Renov._bhProject();if(!d||!p)return;const total=d.owners.reduce((s,o)=>s+(Number(o.porsi)||0),0);if(Math.abs(total-100)>0.01){toast('⚠️ Total porsi harus pas 100%');return;}if(d.owners.some(o=>!String(o.ownerName||'').trim())){toast('⚠️ Nama penerima bagi hasil belum diisi');return;}const old=p.bagiHasil;p.bagiHasil={labaManual:d.labaManual,owners:d.owners.map(o=>({ownerId:o.ownerId||(o.isSelf?'SELF':''),ownerName:String(o.ownerName).trim(),porsi:_bhRound10(Number(o.porsi)||0),isSelf:!!o.isSelf})),tgl:todayStr()};if(typeof save==='function'&&save()===false){if(old===undefined)delete p.bagiHasil;else p.bagiHasil=old;toast('⚠️ Penyimpanan gagal');return;}Renov._bh=null;Renov.renderFundPanel(p);toast('✅ Bagi hasil tersimpan');}
});

// ===== S2866: pratinjau "= Rp 1.000.000" di bawah field nominal Renov =====
// Field tetap angka polos (tanpa pemisah ribuan: parser membaca titik sebagai desimal -> rawan salah baca). Pratinjau memakai pembacaan yang sama dengan
// konsumennya (hapus selain 0-9 . - lalu parseFloat), jadi "1.000" tampil "= Rp 1" dan salah ketik langsung kelihatan. Dipasang lewat satu listener delegasi.
const _RENOV_NOMINAL_IDS=['renovProjRab','renovDpAmount','renovRefundAmount','renovLabaAmount','renovLabaCadangan','renovPayAmount','renovBhLaba'];
function renovNominalFieldId(id){id=String(id||'');return _RENOV_NOMINAL_IDS.indexOf(id)>=0||/^renovBhN\d+$/.test(id);}
function renovNominalPreviewText(raw){const s=String(raw==null?'':raw).replace(/[^0-9.-]/g,'');if(!s)return'';const n=parseFloat(s);if(!isFinite(n)||n<=0)return'';return'= Rp '+String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function renovNominalPreviewRefresh(){if(typeof document==='undefined'||!document||typeof document.querySelectorAll!=='function')return;document.querySelectorAll('[data-renov-pv]').forEach(d=>{const el=document.getElementById(d.getAttribute('data-renov-pv')),t=el?renovNominalPreviewText(el.value):'';d.textContent=t;d.hidden=!t;});}
function renovNominalPreviewEnsure(el){if(!el||!el.id||typeof document==='undefined'||typeof document.createElement!=='function')return;if(document.querySelector&&document.querySelector('[data-renov-pv="'+el.id+'"]'))return;const d=document.createElement('div');d.className='u-fs11 u-t2 u-mt4';d.setAttribute('data-renov-pv',el.id);d.hidden=true;const host=(typeof el.closest==='function'&&el.closest('.fg'))||el.parentNode;if(host&&typeof host.appendChild==='function')host.appendChild(d);}
function renovNominalPreviewInstall(){if(typeof document==='undefined'||!document||typeof document.addEventListener!=='function'||Renov._pvInstalled)return;Renov._pvInstalled=true;const on=e=>{const el=e&&e.target;if(!el||!el.id)return;if(renovNominalFieldId(el.id)){renovNominalPreviewEnsure(el);renovNominalPreviewRefresh();}if(/^renovBh[PN]\d+$/.test(el.id))setTimeout(renovNominalPreviewRefresh,0);};document.addEventListener('input',on);document.addEventListener('focusin',on);}
Renov.nominalPreviewText=renovNominalPreviewText;
renovNominalPreviewInstall();

if(typeof window!=='undefined'){window.Renov=Renov;window.RenovAI=RenovAI;window.RenovCalc=RenovCalc;}
