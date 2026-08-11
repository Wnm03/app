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
// SESI 432 (audit fitur Transfer Antar Akun): guard baru -- transfer butuh
// MINIMAL 2 akun (asal != tujuan, lihat saveTransfer() di bawah). Sebelum
// sesi ini modal tetap bisa dibuka dgn 0/1 akun (dropdown trFrom/trTo
// kosong/cuma 1 opsi lewat populateAccFilters()), user baru tahu ada
// masalah SETELAH isi form & tekan simpan (pesan "asal dan tujuan harus
// berbeda" yg membingungkan kalau akunnya memang cuma ada 1). Guard di
// sini kasih tahu SEBELUM modal dibuka, lebih jelas akar masalahnya.
function openTransferModal(){
if(!D.accounts||D.accounts.length<2){toast('⚠️ Butuh minimal 2 akun untuk transfer — tambah akun dulu di Kelola Akun');return;}
populateAccFilters();
document.getElementById('trAmt').value='';
document.getElementById('trNote').value='';
document.getElementById('trDate').value=new Date().toISOString().split('T')[0];
if(D.accounts.length>1) document.getElementById('trTo').selectedIndex=1;
openModal('transferModal');
}
// saveTransfer() -- SESI 432 (audit fitur Transfer Antar Akun), 2 fix:
//   1. Guard `!fromAcc||!toAcc` (BARU) -- sebelum sesi ini, `from`/`to`
//      yg tidak valid (mis. dropdown kosong krn 0 akun, atau id basi dari
//      state DOM yg belum di-refresh) langsung dipakai akses `.name` di
//      bawah tanpa dicek dulu -> TypeError "Cannot read properties of
//      undefined" & seluruh flow simpan transfer gagal diam-diam (uncaught
//      exception di tengah fungsi, transaksi TIDAK tersimpan tapi tanpa
//      pesan jelas ke user). Guard ini gagal LEBIH AWAL & jelas via toast.
//   2. `transferPairId` (BARU, field baru di kedua baris transaksi) --
//      sebelum sesi ini, 2 baris transaksi (`transfer_out` & `transfer_in`)
//      yg dibuat oleh 1x transfer SAMA SEKALI TIDAK TERTAUT (0 field yg
//      menghubungkan keduanya) -- delTx() (tx-list-cashflow.js) cuma tahu
//      cara hapus SATU baris by id, jadi kalau user hapus salah satu kaki
//      transfer, kaki satunya jadi ORPHAN & saldo akun asal/tujuan jadi
//      pincang permanen (uang "menghilang" dari 1 akun tanpa pernah keluar
//      dari akun lain, atau sebaliknya). `transferPairId` (uid() BARU,
//      SAMA di kedua baris, beda dari `id` masing-masing baris) dipakai
//      delTx() utk cari & hapus pasangannya sekaligus -- lihat komentar
//      delTx() di tx-list-cashflow.js utk detail.
// note.trim() (BARU) -- sebelum sesi ini, note isi spasi kosong ('   ')
// lolos jadi note (bukan fallback 'Transfer') krn '   '||'Transfer' tetap
// balikin '   ' (truthy, string kosong-spasi bukan falsy di JS).
function saveTransfer(){
const from=document.getElementById('trFrom').value;
const to=document.getElementById('trTo').value;
evalAmtExpr('trAmt');
const amt=parseFloat(document.getElementById('trAmt').value);
if(!amt||amt<=0){toast('⚠️ Masukkan jumlah valid');return;}
if(from===to){toast('⚠️ Akun asal dan tujuan harus berbeda');return;}
const fromAcc=D.accounts.find(a=>a.id===from), toAcc=D.accounts.find(a=>a.id===to);
if(!fromAcc||!toAcc){toast('⚠️ Akun asal/tujuan tidak valid — pilih ulang akunnya');return;}
const date=document.getElementById('trDate').value;
const note=(document.getElementById('trNote').value||'').trim()||'Transfer';
const transferPairId=uid();
D.transactions.push({id:uid(),type:'transfer_out',amount:amt,category:'Transfer',note:`${note} → ${escapeHtml(toAcc.name)}`,date,accountId:from,transferPairId});
D.transactions.push({id:uid(),type:'transfer_in',amount:amt,category:'Transfer',note:`${note} ← ${escapeHtml(fromAcc.name)}`,date,accountId:to,transferPairId});
save();closeModal('transferModal');renderDashboard();renderKeuangan();toast('✅ Transfer berhasil');
}
