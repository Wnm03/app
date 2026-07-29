// aset-keluarga.js — Laporan gabungan lintas-modul: 🏠 Aset Keluarga
// Dipindah ke modules/asset/aset-keluarga.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// ============================================================================
// FITUR BARU: satu kartu ringkasan di tab Laporan yang menyusun ULANG (bukan
// menduplikasi sumber angka) 3 modul yang selama ini cuma bisa dilihat
// terpisah — (1) Keuangan: saldo akun aktif & total utang/cicilan
// (totalSaldoAkun()/totalDebtValue()/totalCicilanOutstanding(), akun.js/
// cicilan.js/tagihan-kalender.js — TIDAK disentuh), (2) Shop: nilai modal
// stok & piutang pelanggan (totalInventoriBisnisValue()/totalPiutangValue(),
// cobek-etalase.js/piutang-utang.js — TIDAK disentuh), dan (3) Car Notes:
// nilai kendaraan yang SUDAH tercatat di Buku Aset dgn jenis 'Kendaraan'
// (D.assets, aset.js — TIDAK disentuh), dibandingkan dgn jumlah kendaraan
// terdaftar di Car Notes (D.vehicles, vehicle-core.js) supaya user lihat
// kalau ada kendaraan yang belum ikut dihitung ke total aset.
//
// SENGAJA TIDAK mengubah/menduplikasi Kekayaan.renderBersih() (modules-
// calc.js, kartu 🏦 Kekayaan Bersih) — itu tetap SATU-SATUNYA sumber angka
// "kekayaan bersih total" yang dipakai growth-rate/snapshot/FI. Kartu ini
// murni breakdown PER-MODUL dari angka yang sama, supaya bisa dibaca/dicetak
// jadi 1 laporan "Aset Keluarga" lintas Shop/Car Notes/Keuangan — bukan
// sumber kebenaran baru & tidak menambah field data baru sama sekali (pure
// read-only orchestration, pola sama dgn LaporanAset.build()/renderList()
// di aset.js).
//
// build() dipisah dari render() supaya logic murni bisa dites tanpa DOM.
const AsetKeluarga={
// (1) Modul Keuangan: saldo akun aktif dikurangi utang manual + utang buku +
// sisa cicilan/tagihan (definisi SAMA dgn Kekayaan.renderBersih()).
keuangan(){
const saldoAkun=(typeof totalSaldoAkun==='function')?totalSaldoAkun():0;
const utangManual=(D.pajakZakat&&D.pajakZakat.utangJT)||0;
const utangBuku=(typeof totalDebtValue==='function')?totalDebtValue():0;
const cicilan=(typeof totalCicilanOutstanding==='function')?totalCicilanOutstanding():0;
const utang=utangManual+utangBuku+cicilan;
return{saldoAkun,utang,net:saldoAkun-utang};
},
// (2) Modul Shop: nilai modal stok (inventori) + piutang pelanggan yang
// belum lunas (definisi SAMA dgn Kekayaan.renderBersih()).
shop(){
const inventori=(typeof totalInventoriBisnisValue==='function')?totalInventoriBisnisValue():0;
const piutang=(typeof totalPiutangValue==='function')?totalPiutangValue():0;
return{inventori,piutang,net:inventori+piutang};
},
// (3) Modul Car Notes: kendaraan yang dikelola di Car Notes (D.vehicles)
// dibanding aset jenis 'Kendaraan' yang SUDAH dicatat nilainya di Buku Aset
// (D.assets) — TIDAK ADA field penghubung baru, murni baca 2 data yang
// sudah ada apa adanya (nama kendaraan & nama aset bisa beda, jadi
// dibandingkan JUMLAHNYA saja, bukan dicocokkan satu-satu).
// Sesi 197 (Ownership Sync — Family/Aset Keluarga): TAMBAH 1 filter
// isVehicleOwnershipSelf(v.id) di atas D.vehicles (0 logic lama diubah) —
// kendaraan ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY dikecualikan
// dari hitungan "jumlahKendaraan" kartu Aset Keluarga, pola sama persis
// isVehicleOwnershipSelf() di vehicle-core.js (Sesi 196). Guard typeof: kalau
// helper belum dimuat, anggap semua SELF (tidak exclude apa pun).
carNotes(){
const vehicles=(D.vehicles||[]).filter(v=>typeof isVehicleOwnershipSelf!=='function'||isVehicleOwnershipSelf(v.id));
const assetKendaraan=(D.assets||[]).filter(a=>a.jenis==='Kendaraan');
const nilaiTercatat=assetKendaraan.reduce((s,a)=>s+(a.nilai||0),0);
return{jumlahKendaraan:vehicles.length,jumlahAsetKendaraan:assetKendaraan.length,nilaiTercatat};
},
build(){
const keu=AsetKeluarga.keuangan();
const shop=AsetKeluarga.shop();
const cn=AsetKeluarga.carNotes();
const total=keu.net+shop.net+cn.nilaiTercatat;
return{keuangan:keu,shop,carNotes:cn,total};
},
// Render kartu "🏠 Aset Keluarga". Kartu tetap ditampilkan walau semua nol
// (beda dgn LaporanAset yg sembunyi kalau kosong) — supaya user baru yg
// belum isi Shop/Car Notes tetap lihat kartu ini ada & tahu apa isinya.
render(){
const card=document.getElementById('asetKeluargaCard');
if(!card)return;
const d=AsetKeluarga.build();
const keuEl=document.getElementById('akKeuangan');
if(keuEl)keuEl.innerHTML=`<div class="u-flex u-jcb u-fs12 u-mb4"><span>Saldo Akun</span><span class="u-fw700">${fmtFull(d.keuangan.saldoAkun)}</span></div><div class="u-flex u-jcb u-fs12"><span>Utang &amp; Cicilan</span><span class="u-fw700 red">-${fmtFull(d.keuangan.utang)}</span></div>`;
const shopEl=document.getElementById('akShop');
if(shopEl)shopEl.innerHTML=`<div class="u-flex u-jcb u-fs12 u-mb4"><span>Nilai Stok (Inventori)</span><span class="u-fw700">${fmtFull(d.shop.inventori)}</span></div><div class="u-flex u-jcb u-fs12"><span>Piutang Pelanggan</span><span class="u-fw700">${fmtFull(d.shop.piutang)}</span></div>`;
const cnEl=document.getElementById('akCarNotes');
if(cnEl){
const cn=d.carNotes;
let cnHtml=cn.jumlahKendaraan?`<div class="u-flex u-jcb u-fs12"><span>${cn.jumlahKendaraan} kendaraan terdaftar · nilai tercatat</span><span class="u-fw700">${fmtFull(cn.nilaiTercatat)}</span></div>`:'<div class="u-fs12 u-t2">Belum ada kendaraan tercatat di Car Notes.</div>';
if(cn.jumlahKendaraan&&cn.jumlahAsetKendaraan<cn.jumlahKendaraan){
cnHtml+=`<div class="u-fs11 u-t2 u-mt6">ℹ️ Baru ${cn.jumlahAsetKendaraan} dari ${cn.jumlahKendaraan} kendaraan yang punya nilai tercatat di 📋 Buku Aset (jenis "🏍️ Kendaraan") — tambahkan di sana supaya ikut masuk Total Aset Keluarga di bawah.</div>`;
}
cnEl.innerHTML=cnHtml;
}
const totalEl=document.getElementById('akTotal');
if(totalEl){totalEl.textContent=fmtFullSigned(d.total);totalEl.style.color=d.total<0?'var(--accent2)':'';}
}
};
