// data-default.js — Domain Data Default: kategori shop bawaan (DEFAULT_COBEK_KATEGORI),
// Dipindah ke modules/shared/data-default.js (Sesi 17-18 restrukturisasi folder — lihat docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// akun keuangan bawaan (DEFAULT_ACCOUNTS), kategori sparepart kendaraan bawaan (DEFAULT_SPAREPARTS).
// PENTING: file ini HARUS dimuat SEBELUM features-helpers-global-security.js (bukan sesudah,
// beda dari file GROUP_B lainnya) — ketiga konstanta di sini dibaca LANGSUNG di dalam deklarasi
// `let D = {...}` pada features-helpers-global-security.js SAAT file itu di-load (bukan di dalam
// function body yang baru jalan belakangan), jadi kalau file ini dimuat SESUDAHNYA, D.cobekKategori/
// D.accounts/D.sparepartCats akan error "not defined" saat app pertama kali dibuka.
// Ditunda sengaja sejak v78 (lihat PEMISAHAN-FILE-ROADMAP.md) karena butuh perubahan urutan load,
// baru dikerjakan di v79 ini.

const DEFAULT_COBEK_KATEGORI = [
{id:'ck_kecil',name:'Shop Kecil'},
{id:'ck_sedang',name:'Shop Sedang'},
{id:'ck_besar',name:'Shop Besar'},
{id:'ck_munthu',name:'Munthu/Ulekan'},
{id:'ck_set',name:'Set Lengkap'},
];
const DEFAULT_ACCOUNTS = [
{id:'acc_cash',name:'Cash',emoji:'💵',balance:0},
{id:'acc_bri',name:'BRI',emoji:'🏦',balance:0},
{id:'acc_gopay',name:'Gopay',emoji:'📱',balance:0},
{id:'acc_seabank',name:'Seabank',emoji:'🏦',balance:0}
];
const DEFAULT_SPAREPARTS = [
{id:'sp_oli_mesin',name:'Oli Mesin',code:'OLI',intervalKm:2000},
{id:'sp_filter_oli',name:'Filter Oli',code:'FOL',intervalKm:8000},
{id:'sp_oli_gardan',name:'Oli Gardan/Transmisi',code:'OGD',intervalKm:8000},
{id:'sp_busi',name:'Busi',code:'BSI',intervalKm:8000},
{id:'sp_filter_udara',name:'Filter Udara',code:'FUD',intervalKm:10000},
{id:'sp_kampas_rem_depan',name:'Kampas Rem Depan',code:'KRD',intervalKm:10000},
{id:'sp_kampas_rem_belakang',name:'Kampas Rem Belakang',code:'KRB',intervalKm:10000},
{id:'sp_vbelt',name:'V-Belt (CVT)',code:'VBL',intervalKm:24000},
{id:'sp_roller_cvt',name:'Roller CVT',code:'RCV',intervalKm:24000},
{id:'sp_aki',name:'Aki (cek/ganti)',code:'AKI',intervalKm:18000}
];
// BUGFIX (Sesi 13 Tahap 1b lazy-load renovasi.js, temuan post-deploy v873):
// DEFAULT_CATS dipindah ke sini dari modules/home/renovasi.js. Isinya kategori
// income/expense bawaan app (tidak ada hubungan dgn fitur Renovasi) — sebelumnya
// nangkring di renovasi.js kebetulan saja. Karena renovasi.js sekarang lazy-load
// (baru dimuat saat tab Renovasi dibuka), sedangkan kategori.js/backup-restore.js/
// features-helpers-global-security.js butuh DEFAULT_CATS langsung saat app pertama
// kali jalan (setup data default & restore), harus ada di file yang SELALU
// ter-bundle & load duluan — sama seperti DEFAULT_COBEK_KATEGORI/DEFAULT_ACCOUNTS/
// DEFAULT_SPAREPARTS di atas.
const DEFAULT_CATS = {
income:[
{id:'cat_gi',name:'Gaji toko',emoji:'💼',subs:[]},
{id:'cat_bo',name:'Bonus toko',emoji:'🎁',subs:[]},
{id:'cat_cb',name:'Bisnis',emoji:'🪨',subs:[{id:'sub_cb_cobek',name:'Cobek'}]},
{id:'cat_tb',name:'Tambahan',emoji:'➕',subs:[]},
{id:'cat_ll',name:'Lainnya',emoji:'📦',subs:[]}
],
expense:[
{id:'cat_ki',name:'Kiriman istri',emoji:'👩',subs:[]},
{id:'cat_bp',name:'BPJS',emoji:'💊',subs:[]},
{id:'cat_tg',name:'Tagihan',emoji:'🧾',subs:[{id:'sub_wifi',name:'Wifi'},{id:'sub_pulsa',name:'Pulsa/Kuota'},{id:'sub_listrik',name:'Listrik'}]},
{id:'cat_mk',name:'Makan',emoji:'🍽️',subs:[]},
{id:'cat_an',name:'Anak',emoji:'👶',subs:[{id:'sub_sklh',name:'Sekolah'},{id:'sub_susu',name:'Susu & Gizi'},{id:'sub_mainan',name:'Mainan & Buku'}]},
{id:'cat_rv',name:'Renovasi',emoji:'🔨',subs:[]},
{id:'cat_bl',name:'Belanja',emoji:'🛒',subs:[]},
{id:'cat_cbb',name:'Bisnis',emoji:'🪨',subs:[{id:'sub_cbb_cobek',name:'Cobek'}]},
{id:'cat_inv',name:'Investasi',emoji:'📈',subs:[]},
{id:'cat_sedekah',name:'Sedekah/Donasi',emoji:'🤲',subs:[]},
{id:'cat_lx',name:'Lainnya',emoji:'📦',subs:[]}
]
};
