// tx-transfer.js — logika modal "⇄ Transfer Antar Akun" (transferModal).
// Dipindah ke modules/finance/tx-transfer.js (Sesi 16 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Dipisah dari transaksi.js (2026-07-11, lihat CLAUDE.md catatan kerja
// "split transaksi.js" bagian ke-8) murni sebagai pengelompokan ulang
// file, BUKAN perubahan perilaku. Kedua fungsi di sini tetap global
// karena dipanggil dari:
//  - HTML lewat atribut data-action di modals.js (openTransferModal
//    dipanggil dari tombol "Transfer" di halaman Keuangan, saveTransfer
//    dari tombol "Simpan Transfer" di transferModal)
// Tidak ada modul lain yang meng-assume fungsi ini ada persis di
// transaksi.js — akses selalu lewat nama fungsi global.
function openTransferModal(){
populateAccFilters();
document.getElementById('trAmt').value='';
document.getElementById('trNote').value='';
document.getElementById('trDate').value=new Date().toISOString().split('T')[0];
if(D.accounts.length>1) document.getElementById('trTo').selectedIndex=1;
openModal('transferModal');
}
function saveTransfer(){
const from=document.getElementById('trFrom').value;
const to=document.getElementById('trTo').value;
evalAmtExpr('trAmt');
const amt=parseFloat(document.getElementById('trAmt').value);
if(!amt||amt<=0){toast('⚠️ Masukkan jumlah valid');return;}
if(from===to){toast('⚠️ Akun asal dan tujuan harus berbeda');return;}
const date=document.getElementById('trDate').value;
const note=document.getElementById('trNote').value||'Transfer';
const fromAcc=D.accounts.find(a=>a.id===from), toAcc=D.accounts.find(a=>a.id===to);
D.transactions.push({id:uid(),type:'transfer_out',amount:amt,category:'Transfer',note:`${note} → ${escapeHtml(toAcc.name)}`,date,accountId:from});
D.transactions.push({id:uid(),type:'transfer_in',amount:amt,category:'Transfer',note:`${note} ← ${escapeHtml(fromAcc.name)}`,date,accountId:to});
save();closeModal('transferModal');renderDashboard();renderKeuangan();toast('✅ Transfer berhasil');
}
