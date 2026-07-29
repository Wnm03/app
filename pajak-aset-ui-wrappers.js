// pajak-aset-ui-wrappers.js — Wrapper UI tipis: parser angka (parsePzNum/parseDecStr/
// normalizeOcrNumber), ganti tab pajak/zakat (setPajakTab/setPjkTab/savePajakSettings), dan
// delegasi tipis ke modul Zakat/PPh21/Aset/Piutang/Debt/DebtStrategy/Kekayaan/PBB (dipanggil
// langsung dari data-action di HTML). Dipisah dari features-sheets-pwa-selftest.js (Sesi 3
// restrukturisasi folder, blok 4 — lihat docs/AUDIT-SESI-1-features-sheets-pwa-selftest.js) murni
// pengelompokan ulang file, BUKAN perubahan perilaku. Isinya lintas domain (finance+asset) tapi
// tipis, sengaja TIDAK dipecah lagi per-domain (lihat AUDIT-STRUKTUR-FOLDER.md).

function parsePzNum(v){
if(v===null||v===undefined)return 0;
const str=String(v);
const negative=/-/.test(str);
const digits=str.replace(/[^0-9]/g,'');
const n=Number(digits);
if(isNaN(n))return 0;
return negative?-n:n;
}
function parseDecStr(v){
if(v===null||v===undefined||v==='')return null;
let s=String(v).trim().replace(/[^0-9.,\-]/g,'');
if(!s)return null;
if(s.includes(',')&&!s.includes('.')) s=s.replace(',','.');
else s=s.replace(/,/g,'');
const n=parseFloat(s);
return isNaN(n)?null:n;
}
function normalizeOcrNumber(raw){
if(!raw)return NaN;
raw=String(raw).trim();
const lastComma=raw.lastIndexOf(','), lastDot=raw.lastIndexOf('.');
let decSep=null;
if(lastComma>-1&&lastDot>-1){
decSep=lastComma>lastDot?',':'.';
} else if(lastComma>-1){
const parts=raw.split(',');
if(parts[parts.length-1].length!==3)decSep=',';
} else if(lastDot>-1){
const parts=raw.split('.');
if(parts[parts.length-1].length!==3)decSep='.';
}
let intPart=raw,decPart='';
if(decSep){
const idx=raw.lastIndexOf(decSep);
intPart=raw.slice(0,idx);
decPart=raw.slice(idx+1);
}
intPart=intPart.replace(/[.,]/g,'');
const n=parseFloat(intPart+(decPart?'.'+decPart:''));
return n;
}
function setPajakTab(tab,el){
document.querySelectorAll('#page-pajak .cn-tab').forEach(b=>b.classList.remove('active'));
if(el)el.classList.add('active');
document.getElementById('pajakTab-zakat').classList.toggle('u-dnone', tab!=='zakat');
document.getElementById('pajakTab-zakat').style.display='';
document.getElementById('pajakTab-pajak').classList.toggle('u-dnone', tab!=='pajak');
document.getElementById('pajakTab-pajak').style.display='';
}
// 2026-07-17 (bagian ke-4): split tab 🧾 Pajak (PPh 21) (dalam page-pajak)
// jadi 2 sub-tab (PPh 21 / PBB & UMKM) — pola SAMA PERSIS dgn
// setLaporanTab/setKelolaTab (tx-list-cashflow.js) & setAsetTab (aset.js),
// murni toggle DOM, tidak ada logic baru. renderPajakZakat()/
// renderPajakRekomendasi() (modules-render.js) tetap mengisi kartu di kedua
// sub-tab sekaligus saat masuk tab Pajak, terlepas dari sub-tab mana yang
// aktif.
const PJK_SUBTAB_ORDER=['pph21','pbb'];
const PJK_SUBTAB_LABEL={pph21:'PPh 21',pbb:'PBB & UMKM'};
function setPjkTab(t,el){
const pjkSubtabBtns=document.querySelectorAll('#pajakTab-pajak .pjk-subtab');
pjkSubtabBtns.forEach(b=>b.classList.remove('active'));
if(el) el.classList.add('active');
else { const idx=PJK_SUBTAB_ORDER.indexOf(t); const btn=pjkSubtabBtns[idx>=0?idx:0]; if(btn) btn.classList.add('active'); }
document.getElementById('pjkTab-pph21').classList.toggle('u-dnone', t!=='pph21');
document.getElementById('pjkTab-pbb').classList.toggle('u-dnone', t!=='pbb');
const pjkBc=document.getElementById('pjkBreadcrumbSub');
if(pjkBc)pjkBc.textContent=PJK_SUBTAB_LABEL[t]||t;
}
let _pajakZakatRenderedOnce=false;
/* moved to modules-render.js: renderPajakZakat */
function savePajakSettings(){
const pz=D.pajakZakat;
pz.hargaEmasPerGram=parsePzNum(document.getElementById('pzHargaEmas').value)||pz.hargaEmasPerGram;
pz.nisabPenghasilanBulan=parsePzNum(document.getElementById('pzNisabBulan').value)||pz.nisabPenghasilanBulan;
pz.nisabPenghasilanTahun=pz.nisabPenghasilanBulan*12;
pz.zakatFitrahPerJiwa=parsePzNum(document.getElementById('pzFitrahJiwa').value)||pz.zakatFitrahPerJiwa;
save();
hitungZakatPenghasilan();hitungZakatMaal();hitungZakatFitrah();
}
/* moved to modules-render.js: renderRefCheckReminder */
function hitungZakatPenghasilan(){return Zakat.hitungPenghasilan();}
function hitungZakatMaal(){return Zakat.hitungMaal();}
function hitungZakatFitrah(){return Zakat.hitungFitrah();}
function catatZakatDibayar(jenis){return Zakat.catatDibayar(jenis);}
/* moved to modules-render.js: renderZakatLog */
function delZakatLog(id){return Zakat.delLog(id);}
function getPTKP(status){return PPh21.getPTKP(status);}
function hitungPPh21Progresif(pkp){return PPh21.hitungProgresif(pkp);}
function isiPPhDariTransaksi(){return PPh21.isiDariTransaksi();}
function hitungPPh21(){return PPh21.hitung();}
/* moved to modules-render.js: renderUMKMPajak */
function openAssetModal(id){return Aset.openModal(id);}
function toggleAssetZakatable(){return Aset.toggleZakatable();}
function saveAsset(){return Aset.save();}
async function delAsset(id){return Aset.delete(id);}
/* moved to modules-render.js: renderAssetList */
function totalAssetValue(){return Aset.totalValue();}
// totalInventoriBisnisValue — modal (HPP) yg tertanam di stok produk Shop/Etalase (D.products),
// ikut dihitung sbg bagian Kekayaan Bersih (lihat Kekayaan.currentNetWorth/renderBersih di
// modules-calc.js) krn ini uang riil milik user yg lagi berbentuk barang, bukan tunai. Selalu
// live dari Etalase.totalModalStok() (bukan salinan/snapshot terpisah) supaya otomatis ikut
// ter-update tiap kali produk ditambah/diedit/dihapus di Etalase — tidak perlu CRUD terpisah.
function totalInventoriBisnisValue(){return Etalase.totalModalStok();}
function isNoSpendDay(dateStr){
return !D.transactions.some(t=>t.type==='expense'&&t.date===dateStr);
}
function computeNoSpendLast30(){
let count=0;
const now=new Date();
let earliest=null;
(D.transactions||[]).forEach(t=>{const d=new Date(t.date);if(!earliest||d<earliest)earliest=d;});
const daysSinceEarliest=earliest?Math.floor((now-earliest)/86400000)+1:0;
const daysWithData=Math.max(0,Math.min(30,daysSinceEarliest));
for(let i=0;i<30;i++){
const d=new Date(now); d.setDate(d.getDate()-i);
if(isNoSpendDay(dateToISO(d)))count++;
}
return {count,total:30,daysWithData};
}
function autoSnapshotLifeBalanceIfNeeded(){return LifeBalance.autoSnapshotIfNeeded();}
function openPiutangModal(id){return Piutang.openModal(id);}
function togglePiutangLunas(){return Piutang.toggleLunas();}
function savePiutang(){return Piutang.save();}
async function delPiutang(id){return Piutang.delete(id);}
function totalPiutangValue(){return Piutang.totalValue();}
/* moved to modules-render.js: renderPiutangList */
function openDebtModal(id){return Debt.openModal(id);}
function toggleDebtLunas(){return Debt.toggleLunas();}
function saveDebt(){return Debt.save();}
async function delDebt(id){return Debt.delete(id);}
function totalDebtValue(){return Debt.totalValue();}
function totalDebtCicilanBulanan(){return Debt.totalCicilanBulanan();}
// Sisa kewajiban cicilan/paylater (kind:'cicilan' di D.bills) yg belum lunas — TERPISAH dari Buku Utang (D.debts).
// Dipakai bareng totalDebtValue() di semua tempat yg hitung "total utang" (Kekayaan Bersih, Zakat Maal, AI widget,
// FI.totalDebt()) supaya konsisten, krn cicilan/paylater juga kewajiban riil yg harus ikut dikurangi dari kekayaan.
function totalCicilanOutstanding(){return(typeof getBillStats==='function'?getBillStats().outstanding:0)||0;}
/* moved to modules-render.js: renderDebtList */
function setDebtStrategyMethod(m){return DebtStrategy.setMethod(m);}
function onDsExtraInput(){return DebtStrategy.onExtraInput();}
function currentNetWorthValue(){return Kekayaan.currentNetWorth();}
function saveWealthSnapshot(manual){return Kekayaan.saveSnapshot(manual);}
function autoSnapshotWealthIfNeeded(){return Kekayaan.autoSnapshotIfNeeded();}
async function delWealthSnapshot(id){return Kekayaan.deleteSnapshot(id);}
function actualWealthCAGR(){return Kekayaan.actualCAGR();}
/* moved to modules-render.js: renderWealthSnapshots */
/* moved to modules-render.js: renderKekayaanBersih */
/* moved to modules-render.js: renderPBB */
/* moved to modules-render.js: renderPBBBillStatus */
function pilihAsetPBB(){return PBB.pilihAset();}
function hitungPBB(){return PBB.hitung();}
function ikatPBBTagihan(){return PBB.ikatTagihan();}
