// tx-target.js — domain "Target Tabungan" (modal tambah target, deteksi Dana
// Dipindah ke modules/finance/tx-target.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Darurat, simpan, lihat transaksi akun terkait, tambah/hapus progres).
// Dipindah dari transaksi.js (lihat CLAUDE.md catatan kerja "split
// transaksi.js" bagian ke-9). Semua tetap fungsi global verbatim (tidak ada
// perubahan logika), dipanggil sama persis dari HTML (modals.js,
// data-action="openTargetModal"/"onTargetDanaDaruratToggle"/"saveTarget"/dst,
// dan modules-render.js untuk showTargetAccountTx/addTarget/delTarget),
// maupun dari file lintas-bundle lain (modules-calc.js & aset.js memanggil
// openTargetModal/onTargetDanaDaruratToggle utk jalan pintas "+ Buat
// targetnya sekarang" dari banner Dana Darurat).
function openTargetModal(){
['tName','tAmt','tSaved'].forEach(id=>document.getElementById(id).value='');
document.getElementById('tEmoji').value='🎯';
document.getElementById('tDanaDarurat').checked=false;
document.getElementById('tDanaDaruratHint').style.display='none';
populateAccFilters();
document.getElementById('tAcc').value='';
document.getElementById('tSavedWrap').style.display='block';
openModal('targetModal');
}
function onTargetAccChange(){
const linked=!!document.getElementById('tAcc').value;
document.getElementById('tSavedWrap').style.display=linked?'none':'block';
}
function onTargetDanaDaruratToggle(){
const chk=document.getElementById('tDanaDarurat');
const hint=document.getElementById('tDanaDaruratHint');
if(!chk.checked){hint.style.display='none';return;}
const avgBulanan=(typeof FI!=='undefined')?FI.annualExpense()/12:0;
const rekom=Math.round((avgBulanan||0)*6);
if(!document.getElementById('tName').value.trim())document.getElementById('tName').value='Dana Darurat';
const emojiEl=document.getElementById('tEmoji');
if(!emojiEl.value.trim()||emojiEl.value==='🎯')emojiEl.value='🚨';
if(!document.getElementById('tAmt').value&&rekom>0)document.getElementById('tAmt').value=rekom;
const already=(D.targets||[]).find(t=>t.isDanaDarurat);
let html=avgBulanan>0
?`💡 Rekomendasi umum: <b>6× rata-rata pengeluaran bulanan</b> (≈${fmtFull(avgBulanan)}) = <b>${fmtFull(rekom)}</b>. Sudah diisi otomatis di kolom Target — sesuaikan lagi kalau perlu (kalau pemasukan gak tetap, biasanya lebih aman ke arah 9–12×).`
:`💡 Rekomendasi umum dana darurat: 3–6× pengeluaran bulanan (lebih aman 6–12× kalau pemasukan gak tetap). Belum cukup data transaksi utk hitung otomatis, isi manual dulu ya.`;
if(already)html+=`<br>⚠️ Target "<b>${escapeHtml(already.name)}</b>" saat ini juga ditandai Dana Darurat — kalau disimpan, tandanya pindah ke target ini.`;
hint.innerHTML=html;
hint.style.display='block';
}
function saveTarget(){
const name=document.getElementById('tName').value;
const amt=parseFloat(document.getElementById('tAmt').value);
if(!name||!amt){toast('⚠️ Isi nama dan target');return;}
const accId=document.getElementById('tAcc').value||null;
const saved=accId?0:(parseFloat(document.getElementById('tSaved').value)||0);
const isDanaDarurat=document.getElementById('tDanaDarurat').checked;
if(isDanaDarurat)D.targets.forEach(t=>{t.isDanaDarurat=false;});
D.targets.push({id:uid(),name,amount:amt,saved,accountId:accId,emoji:document.getElementById('tEmoji').value||'🎯',isDanaDarurat});
save();closeModal('targetModal');renderSettings();
if(typeof AlokasiAset!=='undefined')AlokasiAset.renderAll();
toast(accId?'✅ Target tersimpan, tersambung ke akun (otomatis update)':'✅ Target tersimpan');
}
function showTargetAccountTx(targetId){
const t=D.targets.find(x=>sameId(x.id,targetId));if(!t||!t.accountId)return;
const acc=D.accounts.find(a=>a.id===t.accountId);if(!acc)return;
const txs=D.transactions.filter(x=>x.accountId===acc.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
const bal=recalcAccBalance(acc.id);
document.getElementById('filterTxTitle').textContent=`${t.emoji} ${t.name} (${acc.emoji} ${acc.name})`;
document.getElementById('filterTxSummary').textContent=`${txs.length} transaksi · Saldo saat ini ${fmtFull(bal)} dari target ${fmtFull(t.amount)}`;
document.getElementById('filterTxList').innerHTML=txs.length?txs.slice(0,100).map(txHTML).join(''):'<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">Belum ada transaksi di akun ini</div></div>';
openModal('filterTxModal');
}
async function addTarget(i){const addStr=await showPromptModal({title:'Tambah Tabungan',message:'Tambah berapa? (Rp)',icon:'🎯',inputType:'number'});if(addStr===null)return;const add=parseFloat(addStr);if(!add||isNaN(add))return;D.targets[i].saved+=add;save();renderSettings();toast('✅ Target diperbarui');}
async function delTarget(i){if(!await askConfirm('Hapus target?'))return;D.targets.splice(i,1);save();renderSettings();toast('🗑 Target dihapus');}
