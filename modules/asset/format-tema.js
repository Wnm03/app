// format-tema.js — Domain Format Angka & Tema: format rupiah singkat (fmt, mis. "Rp 1.5 jt"),
// Dipindah ke modules/shared/format-tema.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// format rupiah penuh (fmtFull/fmtFullSigned), notifikasi toast di bawah layar (toast), dan
// ganti/terapkan tema warna app termasuk mode "auto" ikut jam HP (setTheme/applyEffectiveTheme).
// Dipindah dari features-helpers-global-security.js (v76) — potongan KESEMBILAN stlh
// kalkulator-input.js (v69), keamanan-pin.js (v70), modal-navigasi.js (v71),
// reset-gaji-mingguan.js (v72), debug-console.js/pengaturan-search.js (v73), onboarding.js (v74),
// diagnostik-versi.js (v75). Domain ini DIPILIH TERAKHIR (bukan paling awal seperti biasanya)
// justru krn PALING BANYAK dipakai di seluruh app (`toast()` saja dipanggil 900+ kali dari
// puluhan file lain) — supaya polanya sudah teruji dulu di domain2 kecil sebelum pindahkan
// utilitas inti sepenting ini.
// TIDAK ADA isi yang diubah, cuma dipindah file. Semua pemanggil di file lain mengakses fungsi2
// ini sbg variabel global saat runtime (tombol diklik/render halaman), BUKAN saat file di-load —
// jadi aman terlepas dari urutan pasti file ini di dalam GROUP_B, asalkan tetap di GROUP_B (satu
// bundle yang sama dgn D/save() yg dipakai setTheme, & dimuat sebelum app dipakai user).
// PENTING: file ini HARUS dimuat SETELAH features-helpers-global-security.js (butuh `D`/`save()`).
// S159 (bugfix — permintaan user "nominal jangan disingkat/dibulatkan, komplit dgn
// titik"): fmt() SEBELUMNYA menyingkat & membulatkan (>=1jt -> "Rp 1.5 jt" 1 desimal,
// >=1rb -> "Rp 500rb" tanpa desimal) -- dipakai di ~40 file (kasir, cicilan, aset,
// vehicle, shop, dashboard presenter, dll) utk tampilkan nominal, jadi 1 fungsi ini
// yg nentuin tampilan "disingkat" di HAMPIR SEMUA fitur. fmtFull() (di bawah) SUDAH
// lengkap & pakai titik ribuan (toLocaleString('id-ID')) sejak awal, tapi cuma
// dipakai sebagian tempat. Drpd edit 40 file satu-satu (resiko regresi & duplikasi
// logic), fmt() sekarang 100% REUSE fmtFull() sbg satu-satunya sumber format nominal
// -- seluruh pemanggil fmt() di 40 file otomatis dapat angka lengkap tanpa disentuh.
// fmtFull()/fmtFullSigned() itu sendiri TIDAK diubah sama sekali.
//
// SESI 544 (audit laporan user: nominal Dana Titipan tampil pecahan aneh,
// mis. "Rp 10.012.550,539" / owner "mas sihab" pokok tampil "Rp
// 1.699.999,461" padahal dicatat bulat "Rp 1.700.000"). ROOT CAUSE:
// pemisah desimal ',' di atas BUKAN sengaja ditulis di sini -- itu output
// asli `Number.toLocaleString('id-ID')` saat argumennya py sisa desimal
// (default `maximumFractionDigits` locale id-ID = 3). Sisa desimal itu
// sendiri numeric drift dari pembagian porsi% (`MultiOwnerEngine.
// splitByPorsi()`, `bagian = nilai * porsi/100`, SENGAJA tidak dibulatkan
// di sana -- lihat komentar fungsi itu, "pembulatan tampilan jadi
// tanggung jawab caller/formatter") -- BUKAN bug di splitByPorsi() itu
// sendiri. fmtFull()/fmtFullSigned() ADALAH formatter tampilan yang
// dimaksud comment itu, tapi sebelum sesi ini belum benar2 membulatkan
// (toLocaleString default cuma MEMBATASI 3 desimal, TIDAK membulatkan ke
// satuan Rupiah). Rupiah tidak py pecahan resmi yang dipakai user awam
// (sen sudah lama tidak beredar) & 0 tempat lain di app ini sengaja
// menampilkan desimal Rupiah -- jadi `Math.round()` di sini SEBELUM
// `toLocaleString()` aman utk SEMUA pemanggil (900+ titik), 0 pemanggil
// mengandalkan pecahan tampil (diverifikasi: 0 test existing assert
// output fmtFull/fmt dgn nilai desimal). Nilai ASLI di `D` (mis.
// `o.allocatedPrincipal`) TIDAK disentuh sama sekali -- ini murni
// pembulatan TAMPILAN, kalkulasi/SSOT di tempat lain tetap presisi penuh.
function fmt(n){return fmtFull(n);}
function fmtFull(n){return'Rp '+Math.round(Number(Math.abs(n||0))).toLocaleString('id-ID');}
function fmtFullSigned(n){n=Number(n||0);return(n<0?'-':'')+'Rp '+Math.round(Math.abs(n)).toLocaleString('id-ID');}
// BUGFIX (laporan user: toast pesan error scan sparepart "hilang"/tidak
// kebaca): dulu tiap panggilan toast() bikin setTimeout sendiri TANPA
// membatalkan timer dari panggilan sebelumnya -- kalau toast ke-2 (mis.
// "❌ Gagal scan: ...", durasi default 2200ms) dipanggil SAAT toast ke-1
// masih tampil (mis. "🔍 Membuka kamera...", durasi custom 4000ms), timer
// toast ke-1 tetap jalan & menyembunyikan box tepat di detik ke-4 --
// memotong toast ke-2 sebelum sempat kebaca (kalau toast ke-2 muncul di
// antara detik 2-4). Sekarang timer sebelumnya di-clearTimeout() dulu tiap
// toast() dipanggil, jadi durasi SELALU dihitung dari toast yang PALING
// BARU tampil -- tidak ada lagi timer basi yang nyembunyikan toast baru.
// SESI TAMBAHAN (audit UI/UX: "toast cuma 1 slot tanpa antrean" -- kalau 2
// notifikasi trigger berdekatan, mis. simpan lalu langsung ada validasi lain,
// toast ke-2 LANGSUNG menimpa teks toast ke-1 lewat `t.textContent=msg` di
// atas sebelum sempat kebaca user, meski fix timer sebelumnya sudah bikin
// durasinya benar). ROOT CAUSE beda dari bugfix timer di atas: itu benerin
// KAPAN toast hilang, ini benerin toast KEDUA menimpa TEKS toast pertama
// secara instan. Fix: `toast()` sekarang taruh pesan ke antrean FIFO dulu
// (bukan langsung render), 1 elemen `#toast` yang sama dipakai bergantian
// satu-per-satu -- pesan lama SELALU sempat tampil penuh durasinya sebelum
// pesan berikutnya muncul. Jeda kecil (`_TOAST_GAP_MS`) antar pesan disamakan
// dgn `--dur-moderate` (200ms, lihat styles.css `.toast`) supaya transisi
// fade-out toast lama selesai dulu sebelum fade-in toast baru (kalau
// langsung ganti teks tanpa jeda, teks berubah di tengah animasi & terasa
// "patah"). Antrean dibatasi `_TOAST_QUEUE_MAX` (buang yg PALING LAMA
// mengantre, bukan yg baru) supaya toast lama tidak "membanjiri" & nge-lag
// notifikasi terbaru kalau ada error beruntun/loop -- prioritas selalu pesan
// TERBARU + pesan yang SEDANG tampil, bukan histori antrean.
// API tetap 100% sama: `toast(msg, dur=2200)`, dipanggil sinkron dari 900+
// titik existing, 0 perubahan signature/return value (tetap `undefined`).
let _toastHideTimer=null;
let _toastGapTimer=null;
let _toastShowing=false;
let _toastQueue=[];
const _TOAST_GAP_MS=200;
const _TOAST_QUEUE_MAX=4;
function _toastShowNext(){
  if(_toastQueue.length===0){_toastShowing=false;return;}
  _toastShowing=true;
  const{msg,dur,undoFn}=_toastQueue.shift();
  const t=document.getElementById('toast');
  // SESI TAMBAHAN (audit UI/UX: "konfirmasi hapus tanpa undo" -- pola berisiko
  // utk app finansial, kalau user salah tap data hilang permanen). toastUndo()
  // di bawah reuse PENUH antrean di atas (0 struct data baru, cuma nambah
  // field opsional `undoFn`) -- toast() BIASA (900+ pemanggil existing) TIDAK
  // PERNAH mengisi field ini, jadi tetap 100% `t.textContent=msg` polos spt
  // sebelumnya, 0 perubahan tampilan/perilaku utk pemanggil lama. Class
  // `toast--action` cuma ditoggle saat undoFn ADA, jadi CSS existing (`.toast`
  // biasa) juga tidak berubah utk kasus lama.
  t.classList.toggle('toast--action',!!undoFn);
  if(undoFn){
    t.innerHTML='';
    const span=document.createElement('span');
    span.className='toast-msg';
    span.textContent=msg;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='toast-undo-btn';
    btn.textContent='Urungkan';
    btn.onclick=function(){
      if(_toastHideTimer){clearTimeout(_toastHideTimer);_toastHideTimer=null;}
      t.classList.remove('show');
      try{undoFn();}catch(e){console.error('toastUndo: undoFn error:',e);}
      _toastGapTimer=setTimeout(()=>{_toastGapTimer=null;_toastShowNext();},_TOAST_GAP_MS);
    };
    t.appendChild(span);
    t.appendChild(btn);
  } else {
    t.textContent=msg;
  }
  t.classList.add('show');
  _toastHideTimer=setTimeout(()=>{
    t.classList.remove('show');
    _toastHideTimer=null;
    _toastGapTimer=setTimeout(()=>{_toastGapTimer=null;_toastShowNext();},_TOAST_GAP_MS);
  },dur);
}
function toast(msg,dur=2200){
  _toastQueue.push({msg,dur});
  while(_toastQueue.length>_TOAST_QUEUE_MAX)_toastQueue.shift();
  if(!_toastShowing&&!_toastGapTimer)_toastShowNext();
}
// dismissAllToasts() — BUGFIX (audit video user: toast lama dari halaman/tab
// SEBELUMNYA tetap tampil & antre menutupi tombol interaktif -- mis. "+ TAMBAH
// HOLDING" & item Daftar Holding -- di tab Investasi setelah user pindah tab,
// krn toast() TIDAK PERNAH tahu kalau konteks halaman sudah berganti (antrean
// `_toastQueue` & timer `_toastHideTimer`/`_toastGapTimer` murni berbasis
// waktu, lepas dari navigasi). ROOT CAUSE: toast dibuat utk kasih feedback
// SAAT itu juga (mis. "Tersimpan ✅") -- begitu user sudah pindah konteks
// (ganti tab bawah / sub-tab Aset), pesan lama itu tidak lagi relevan &
// SEHARUSNYA tidak terus menghalangi UI baru. Fix MINIMAL & additive: 1 fungsi
// baru yang (1) buang semua toast yg masih mengantre, (2) batalkan timer
// show/gap yg berjalan, (3) sembunyikan toast yg sedang tampil SEKARANG JUGA
// (tanpa animasi fade, konsisten dgn pola showPage() yg juga paksa-tutup
// overlay yg nyangkut saat pindah tab -- lihat komentar showPage() di
// modal-navigasi.js). 0 perubahan ke toast()/toastUndo()/API existing lain --
// pemanggil lama 100% tidak terpengaruh, fungsi ini murni dipanggil dari titik
// navigasi (showPage/setAsetTab) di sesi ini.
function dismissAllToasts(){
  _toastQueue.length=0;
  if(_toastHideTimer){clearTimeout(_toastHideTimer);_toastHideTimer=null;}
  if(_toastGapTimer){clearTimeout(_toastGapTimer);_toastGapTimer=null;}
  _toastShowing=false;
  const t=document.getElementById('toast');
  if(t)t.classList.remove('show');
}
// toastUndo(msg,undoFn,dur=5000) — toast dgn tombol "Urungkan". Klik tombol
// -> jalankan `undoFn()` (caller yang tanggung jawab kembalikan state, mis.
// splice balik ke index semula) & toast langsung hilang (tidak nunggu durasi
// penuh). Kalau TIDAK diklik sampai `dur` habis, hapus dianggap final -- 0
// aksi tambahan diperlukan krn caller SUDAH menghapus datanya SEBELUM manggil
// toastUndo() (pola "hapus dulu, tawarkan undo sesudah", bukan "tunda hapus
// sampai timeout" -- lebih aman krn tidak ada state "pending delete" yang
// bisa lupa di-commit kalau user menutup app sebelum timer selesai).
// Durasi default 5000ms (lebih lama dari toast() biasa 2200ms) -- user butuh
// waktu baca PESAN + putuskan mau klik Urungkan atau tidak, bukan cuma baca
// notifikasi.
// SENGAJA baru dipakai di 1 tempat (delReminder(), transaksi.js) sbg contoh
// pola nyata pertama -- delete lain yang py cascade kompleks (mis. delTx(),
// runTxDeleteCascades()) BELUM diretrofit undo sesi ini (butuh audit
// terpisah per cascade supaya restore-nya benar2 utuh, bukan cuma splice
// balik 1 array).
function toastUndo(msg,undoFn,dur=5000){
  _toastQueue.push({msg,dur,undoFn});
  while(_toastQueue.length>_TOAST_QUEUE_MAX)_toastQueue.shift();
  if(!_toastShowing&&!_toastGapTimer)_toastShowNext();
}
function setTheme(t){
D.profile.theme=t; save();
applyEffectiveTheme();
document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.t===t));
toast(t==='auto'?'Tema otomatis aktif 🌗 (ikut jam HP)':'Tema '+t+' aktif ✨');
// RENCANA-MODERNISASI-UI.md: tema "modern" (s637/s639) punya markup terstruktur
// (tabel Ledger Pro Uang & list padat Aset) yg di-gate via cek D.profile.theme
// DI DALAM fungsi render tab masing2 -- bukan lewat CSS murni spt ticker Beranda
// (s636). setTheme() sebelumnya cuma ganti atribut data-theme (CSS reaktif
// otomatis), jadi kalau tab Uang/Aset sedang terbuka saat ganti tema, markup lama
// (kartu) tetap nempel sampai tab itu di-render ulang manual. Trigger re-render
// eksplisit di sini supaya tampilan struktural ikut berubah seketika, konsisten
// dgn CSS yang sudah berubah instan. Guarded typeof (pola sama dgn pemanggil lain
// di file ini) supaya aman dipanggil dari test yang load file ini sendirian atau
// dari state app dimana tab terkait belum pernah dibuka (elemen belum ada di DOM
// -- masing2 fungsi sudah early-return kalau elemennya null).
if(typeof renderKeuangan==='function')renderKeuangan();
if(typeof Aset!=='undefined'&&Aset&&typeof Aset.renderList==='function')Aset.renderList();
}
function applyEffectiveTheme(){
let t=D.profile.theme||'dark';
if(t==='auto'){
const h=new Date().getHours();
t=(h>=6&&h<18)?'light':'dark';
}
document.body.setAttribute('data-theme',t);
// BUGFIX (audit delay s-lanjutan): simpan tema efektif yg BARU SAJA diterapkan ke
// localStorage (bukan D.profile.theme mentah -- utk mode "auto" ini sudah hasil
// resolve jam HP, jadi cache-nya representatif utk load berikutnya). Dibaca oleh
// inline script paling atas <body> di index.html/app_production.html SEBELUM
// init()/load() (baca IndexedDB) selesai, supaya body langsung ke-paint dgn tema
// yg (hampir pasti) benar sejak awal -- bukan nunggu load selesai baru "dibalik"
// dari "fresh" (flash tema terang->gelap yg kelihatan spt delay/lag).
// Guarded try/catch: localStorage bisa gagal (private mode Safari lama, storage
// penuh, dll) -- kegagalan cache ini TIDAK BOLEH bikin applyEffectiveTheme() ikut
// gagal (tema tetap harus keterapkan biar app tetap kepakai).
try{localStorage.setItem('kw_theme_cache',t);}catch(e){}
}
