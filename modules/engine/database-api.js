// modules/engine/database-api.js — Database API, Fase 1 (fondasi murni),
// Sesi 1/N mengikuti RANCANGAN-ENGINE-DATABASE-IMPORT-FINAL-v3.md.
//
// LANGKAH INI SAJA (per keputusan eksplisit: "1 langkah dulu"): migrasi
// data Vehicle Database untuk 2 model yang sudah ada (Honda Vario 125,
// Honda BeAT FI) + API baca murni di atasnya. TIDAK ada langkah lain
// dikerjakan sesi ini — Database API generik untuk 5 lapisan tetap lain
// (Master/Platform/Asset/Reference/Localization), Import Database, dan
// perluasan Event Bus (AIBus) SENGAJA belum disentuh, supaya tiap langkah
// bisa direview satu-satu (sesuai permintaan eksplisit sebelumnya).
//
// SENGAJA "SENYAP" — pola sama persis modules/ai/ai-core.js Sesi 1/6:
// file ini TIDAK di-wire ke fitur/modul manapun yang sudah berjalan.
// Belum didaftarkan di scripts/build.js (belum ikut ter-bundle ke
// app-bundle-a/b.min.js), belum dipanggil dari mana pun. 0 (nol) perilaku
// app yang berjalan berubah karena file ini ada. Pendaftaran ke
// scripts/build.js + penyambungan ke TORSI_DB/VEHICLE_SPEC_DB
// (modules/vehicle/sparepart-servis-b.js) adalah LANGKAH TERPISAH
// berikutnya, belum dikerjakan sesi ini.
//
// SUMBER DATA: TORSI_DB & VEHICLE_SPEC_DB, dua konstanta yang sudah ada di
// modules/vehicle/sparepart-servis-b.js (dikutip dari Buku Pedoman
// Reparasi Honda — Vario 125 & BeAT FI). Isi field `torsi.cats`, `spec.*`,
// & `sourceNote` di bawah adalah SALINAN PERSIS (byte-for-byte, diverifikasi
// lewat tests/database-api-vehicle-migration.test.js — bandingkan literal
// asli dari sparepart-servis-b.js dgn data di sini) — TIDAK ada angka/teks
// diubah, ditambah, atau dihilangkan.
//
// KENAPA DISALIN, BUKAN DI-IMPORT LANGSUNG: TORSI_DB/VEHICLE_SPEC_DB ada di
// file yang dimuat SETELAH file ini dalam urutan build (lihat GROUP_B di
// scripts/build.js) — mengacu ke variabel itu langsung dari sini akan
// gagal (ReferenceError, belum terdefinisi saat file ini dieksekusi).
// Menyalin data menghindari masalah urutan muat tanpa mengubah urutan file
// yang sudah ada. Ini DUPLIKASI SEMENTARA, bukan desain akhir: begitu
// langkah "sambungkan" (sesi berikutnya, terpisah) dikerjakan,
// findTorsiDb()/findVehicleSpec() di sparepart-servis-b.js akan diganti
// baca dari DatabaseAPI.vehicle di sini — TORSI_DB/VEHICLE_SPEC_DB literal
// akan dihapus, bukan dipertahankan dobel selamanya.
//
// MATCHING LOGIC (findTorsiByName/findSpecByName di bawah) SENGAJA disalin
// PERSIS (bukan diinterpretasi ulang) dari findTorsiDb()/findVehicleSpec()
// yang sudah ada: `vehName.toLowerCase()`, lalu `.includes(m)` per
// `matchNames` (substring match, bukan exact match) — supaya saat
// disambungkan nanti, perilaku 100% identik, 0 regresi ke fitur torsi/spec
// kendaraan yang sudah jalan.
//
// CATATAN CAKUPAN "Vehicle Database" (dikonfirmasi eksplisit sebelum sesi
// ini ditulis): TORSI_DB/VEHICLE_SPEC_DB masuk Vehicle Database (data
// per-model, dicocokkan lewat matchNames) — BUKAN Reference Database.
// Reference Database (Fase 3, generik lintas-model) kandidatnya adalah
// tabel konversi universal seperti MY_WRENCH_SCALE (sparepart-servis-b.js)
// yang TIDAK dicocokkan ke model tertentu — di luar cakupan sesi ini.

const VEHICLE_DB_RECORDS = [
  {
    id: "vario-125",
    displayName: "Honda Vario 125 (KZR)",
    torsi: {
      matchNames: ["vario 125"],
      sourceNote: "Honda Vario 125 Techno/KZR (PGM-FI, liquid-cooled) — Buku Pedoman Reparasi resmi (scan lengkap 310 hal., diverifikasi user), bagian Spesifikasi & Torsi Pengencangan (hal. 1-9 s/d 1-12) & Jadwal Perawatan Berkala (hal. 3-3). Semua nilai torsi di entri ini di-cross-check baris-per-baris thd scan manual tsb (sesi audit ini) — 100% cocok, 0 nilai diubah, cuma nambah beberapa part yg sebelumnya belum masuk (lihat item-item baru di bawah).",
      cats: [
        { cat: "Perawatan Berkala", icon: "🛠️", items: [
          {"name":"Mur pengunci kabel gas","ulir":"8 mm","nm":8.5,"kgf":0.9},
          {"name":"Sekrup cover rumah saringan udara","ulir":"5 mm","nm":1.1,"kgf":0.1},
          {"name":"Busi","ulir":"10 mm","nm":16,"kgf":1.6,"interval":"Periksa tiap 4.000 km · Ganti tiap 8.000 km","consumable":true},
          {"name":"Mur pengunci sekrup penyetel valve","ulir":"5 mm","nm":10,"kgf":1,"note":"oli","interval":"Periksa/setel tiap 4.000 km"},
          {"name":"Baut pembuangan oli mesin","ulir":"12 mm","nm":24,"kgf":2.4,"interval":"Ganti oli tiap 4.000 km","consumable":true},
          {"name":"Tutup saringan kasa oli mesin","ulir":"30 mm","nm":20,"kgf":2,"interval":"Bersihkan tiap 8.000 km"},
          {"name":"Baut pemeriksaan oli final reduction","ulir":"8 mm","nm":23,"kgf":2.3,"interval":"Ganti oli transmisi tiap 8.000 km"},
          {"name":"Baut pembuangan oli final reduction (transmisi)","ulir":"8 mm","nm":23,"kgf":2.3,"interval":"Ganti oli transmisi tiap 8.000 km"},
          {"name":"Mur pengunci kabel penghubung equalizer (tipe CBS)","ulir":"8 mm","nm":6.4,"kgf":0.7},
          {"name":"Saringan udara","ulir":"—","nm":null,"kgf":null,"interval":"Ganti tiap 16.000 km (lebih sering jika area basah/berdebu)","consumable":true,"noTorque":true},
          {"name":"Drive belt (v-belt CVT)","ulir":"—","nm":null,"kgf":null,"interval":"Periksa tiap 8.000 km · Ganti tiap 32.000 km","consumable":true,"noTorque":true},
          {"name":"Minyak rem","ulir":"—","nm":null,"kgf":null,"interval":"Periksa tiap 4.000 km · Ganti tiap 2 tahun","consumable":true,"noTorque":true},
          {"name":"Cairan pendingin radiator (coolant)","ulir":"—","nm":null,"kgf":null,"interval":"Periksa tiap 4.000 km · Ganti tiap 2 tahun","consumable":true,"noTorque":true},
        ] },
        { cat: "Mesin — Cylinder Head/Valve", icon: "⚙️", items: [
          {"name":"Baut stopper camshaft","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Baut stopper shaft rocker arm","ulir":"5 mm","nm":5,"kgf":0.5,"note":"oli"},
          {"name":"Baut socket cam sprocket","ulir":"5 mm","nm":8,"kgf":0.8,"note":"oli"},
          {"name":"Sekrup cam chain tensioner lifter","ulir":"6 mm","nm":4,"kgf":0.4},
          {"name":"Baut penahan pompa air","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Mur cylinder head","ulir":"8 mm","nm":27,"kgf":2.8,"note":"oli"},
          {"name":"Baut stud cylinder","ulir":"8 mm","nm":9,"kgf":0.9},
        ] },
        { cat: "Mesin — Kopling/Pulley/Final Drive", icon: "🔗", items: [
          {"name":"Sekrup plat cover crankcase kiri","ulir":"4 mm","nm":3.2,"kgf":0.3},
          {"name":"Mur drive pulley face","ulir":"14 mm","nm":59,"kgf":6,"note":"oli"},
          {"name":"Mur kopling/driven pulley","ulir":"28 mm","nm":54,"kgf":5.5},
          {"name":"Mur clutch outer","ulir":"12 mm","nm":49,"kgf":5},
          {"name":"Baut final reduction case","ulir":"8 mm","nm":23,"kgf":2.3},
          {"name":"Mur link penggantung mesin (sisi rangka)","ulir":"10 mm","nm":69,"kgf":7},
          {"name":"Mur link penggantung mesin (sisi mesin)","ulir":"10 mm","nm":49,"kgf":5},
        ] },
        { cat: "Sistem PGM-FI & Bahan Bakar", icon: "⛽", items: [
          {"name":"Sekrup torx katup solenoid peninggi putaran stasioner","ulir":"5 mm","nm":3.4,"kgf":0.3},
          {"name":"Sensor ECT","ulir":"10 mm","nm":12,"kgf":1.2},
          {"name":"Sensor O2","ulir":"12 mm","nm":24.5,"kgf":2.5},
          {"name":"Mur plat pemasangan pompa bahan bakar","ulir":"6 mm","nm":12,"kgf":1.2},
          {"name":"Sekrup dudukan kabel gas","ulir":"5 mm","nm":3.4,"kgf":0.3},
          {"name":"Baut pemasangan joint injector","ulir":"6 mm","nm":12,"kgf":1.2},
          {"name":"Baut pemasangan pompa oli","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Baut pembuangan radiator","ulir":"10 mm","nm":1,"kgf":0.1},
        ] },
        { cat: "Roda Depan/Suspensi/Kemudi", icon: "🛞", items: [
          {"name":"Baut socket cakram rem depan","ulir":"8 mm","nm":42,"kgf":4.3,"note":"new"},
          {"name":"Mur as roda depan","ulir":"12 mm","nm":59,"kgf":6},
          {"name":"Baut socket fork","ulir":"8 mm","nm":20,"kgf":2},
          {"name":"Baut penjepit bottom bridge","ulir":"10 mm","nm":64,"kgf":6.5},
          {"name":"Baut pemasangan caliper rem depan","ulir":"8 mm","nm":30,"kgf":3.1,"note":"new"},
          {"name":"Mur batang stang kemudi","ulir":"10 mm","nm":59,"kgf":6},
          {"name":"Mur pengunci poros kemudi","ulir":"26 mm","nm":74,"kgf":7.5},
          {"name":"Sekrup as handel rem belakang (tipe standard)","ulir":"5 mm","nm":1,"kgf":0.1},
          {"name":"Mur as handel rem belakang (tipe standard)","ulir":"5 mm","nm":4.5,"kgf":0.5,"note":"Mur-U"},
        ] },
        { cat: "Roda Belakang/Suspensi", icon: "🛞", items: [
          {"name":"Mur as roda belakang","ulir":"16 mm","nm":118,"kgf":12,"note":"oli"},
          {"name":"Baut pemasangan atas shock absorber","ulir":"10 mm","nm":59,"kgf":6},
          {"name":"Baut pemasangan bawah shock absorber","ulir":"8 mm","nm":26,"kgf":2.7},
        ] },
        { cat: "Sistem Rem", icon: "🛑", items: [
          {"name":"Baut arm rem belakang","ulir":"6 mm","nm":10,"kgf":1,"note":"new"},
          {"name":"Katup pembuangan caliper rem","ulir":"8 mm","nm":5.4,"kgf":0.6},
          {"name":"Sekrup tutup reservoir master cylinder rem","ulir":"4 mm","nm":1.5,"kgf":0.2},
          {"name":"Pin brake pad (kampas rem)","ulir":"10 mm","nm":18,"kgf":1.8,"interval":"Periksa keausan tiap 4.000 km","consumable":true},
          {"name":"Mur as handel rem depan","ulir":"6 mm","nm":6,"kgf":0.6},
          {"name":"Baut oli selang rem","ulir":"10 mm","nm":34,"kgf":3.5},
          {"name":"Pin dudukan caliper rem","ulir":"8 mm","nm":18,"kgf":1.8},
          {"name":"Baut as handel rem depan (tipe standard)","ulir":"6 mm","nm":1,"kgf":0.1},
          {"name":"Sekrup as handel rem depan (tipe CBS)","ulir":"6 mm","nm":1,"kgf":0.1},
          {"name":"Sekrup switch lampu rem depan","ulir":"4 mm","nm":1,"kgf":0.1},
          {"name":"Sekrup cover dudukan handel rem belakang (tipe CBS)","ulir":"5 mm","nm":4.3,"kgf":0.4},
        ] },
        { cat: "Kelistrikan & Panel", icon: "🔌", items: [
          {"name":"Baut socket pemasangan stator","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Baut spesial pemasangan sensor CKP","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Mur flywheel","ulir":"12 mm","nm":69,"kgf":7},
          {"name":"Baut pemasangan kipas pendingin","ulir":"6 mm","nm":8.5,"kgf":0.9},
          {"name":"Baut pemasangan sensor VS","ulir":"6 mm","nm":12,"kgf":1.2},
          {"name":"Sekrup pemasangan kunci kontak","ulir":"6 mm","nm":9,"kgf":0.9,"note":"new"},
          {"name":"Baut pemasangan muffler","ulir":"10 mm","nm":59,"kgf":6},
          {"name":"Mur joint pipa exhaust","ulir":"7 mm","nm":26.5,"kgf":2.7},
          {"name":"Baut as standar samping","ulir":"10 mm","nm":10,"kgf":1},
          {"name":"Mur pengunci as standar samping","ulir":"10 mm","nm":29,"kgf":3},
          {"name":"Sekrup pemasangan meter kombinasi","ulir":"5 mm","nm":1.1,"kgf":0.1},
          {"name":"Sekrup meter kombinasi","ulir":"3 mm","nm":0.54,"kgf":0.1},
          {"name":"Baut socket pelindung sensor VS","ulir":"6 mm","nm":10,"kgf":1,"note":"new"},
          {"name":"Baut socket key shutter","ulir":"5 mm","nm":4.95,"kgf":0.5},
        ] },
      ],
    },
    spec: {
      matchNames: ["vario 125"],
      sourceNote: "Honda Vario 125 (KZR) — Buku Pedoman Reparasi, bab SPESIFIKASI (hal. 1-4 s/d 1-8) & PERAWATAN (hal. 3-3)",
      umum: {
        "Kapasitas tangki BBM": "5,5 liter",
        "Oli mesin (ganti rutin)": "0,8 liter",
        "Oli mesin (setelah bongkar/ganti saringan)": "0,9 liter",
        "Jenis oli mesin": "SAE 10W-30 · API SG atau lebih tinggi · JASO T903: MB",
        "Oli transmisi/final drive (rutin)": "0,12 liter",
        "Oli transmisi/final drive (bongkar)": "0,14 liter",
        "Coolant (radiator+mesin)": "0,51 liter",
        "Coolant (tangki cadangan)": "0,14 liter",
        "Jenis coolant": "Honda PRE-MIX Coolant",
        "Busi": "NGK CPR7EA-9 / DENSO U22EPR-9",
        "Celah busi": "0,8 – 0,9 mm",
        "RPM stasioner": "1.700 ± 100 rpm",
        "Waktu pengapian": "12° sebelum TMA (saat stasioner)",
      },
      ban: {
        depan: { ukuran: "80/90-14 M/C 40P", tekanan: "200 kPa · 2,00 kgf/cm² · 29 psi (solo maupun boncengan)" },
        belakang: { ukuran: "90/90-14 M/C 46P", tekanan: "225 kPa · 2,25 kgf/cm² · 33 psi (solo maupun boncengan)" },
      },
      kelistrikan: {
        aki: "YTZ6V — 12V, 5 Ah",
        sekring: "Utama 25A · Tambahan 10A × 5",
        bohlam: [
          ["Lampu depan","12V 25/25W ×2"],
          ["Lampu senja","12V 3,4W ×2"],
          ["Lampu belakang","12V 5W"],
          ["Lampu rem","12V 10W ×2"],
          ["Lampu plat nomor","12V 5W"],
          ["Lampu sein","12V 10W ×4"],
        ],
      },
      batasServis: [
        ["Ketebalan cakram rem depan","3,3–3,7 mm","Min 3,0 mm"],
        ["Diameter tromol rem belakang","–","Maks 131,0 mm"],
      ],
    },
  },
  {
    id: "beat-fi",
    displayName: "Honda BeAT FI Gen 1",
    torsi: {
      matchNames: ["beat fi","beat-fi","beat esp","beat pgm-fi","vario 110","vario110","vario 110 esp"],
      sourceNote: "Honda BeAT FI Gen 1 — Buku Pedoman Reparasi, bab Informasi Umum (Spesifikasi & Torsi Pengencangan, hal. 1-4 s/d 1-11) & Perawatan (Jadwal Perawatan Berkala, hal. 3-3). Catatan: mesin 108cc (non-liquid cooled) satu platform dengan Vario 110 (eSP) — torsi mekanis dipakaikan juga untuk Vario 110 di sini, TAPI spek non-mesin (ban/rem/kelistrikan/kapasitas) belum terverifikasi khusus utk Vario 110 — cek ulang ke buku manual Vario 110 kalau ragu, terutama bagian Roda/Rem/Kelistrikan.",
      cats: [
        { cat: "Perawatan Berkala", icon: "🛠️", items: [
          {"name":"Mur pengunci kabel gas","ulir":"8 mm","nm":8.5,"kgf":0.9},
          {"name":"Sekrup cover rumah saringan udara","ulir":"5 mm","nm":1.1,"kgf":0.1},
          {"name":"Busi","ulir":"10 mm","nm":16,"kgf":1.6,"interval":"Periksa tiap 4.000 km · Ganti tiap 8.000 km","consumable":true},
          {"name":"Mur pengunci sekrup penyetel valve","ulir":"5 mm","nm":10,"kgf":1,"note":"oli","interval":"Periksa/setel tiap 1.000 km, lalu tiap kelipatan 4.000 km"},
          {"name":"Baut pembuangan oli mesin","ulir":"12 mm","nm":24,"kgf":2.4,"interval":"Ganti oli tiap 4.000 km (servis pertama di 1.000 km)","consumable":true},
          {"name":"Tutup saringan kasa oli mesin","ulir":"30 mm","nm":20,"kgf":2,"interval":"Bersihkan tiap 12.000 km (servis pertama di 1.000 km)"},
          {"name":"Baut pemeriksaan oli final reduction","ulir":"8 mm","nm":13,"kgf":1.3,"interval":"Ganti oli transmisi tiap 8.000 km"},
          {"name":"Baut pembuangan oli final reduction (transmisi)","ulir":"8 mm","nm":13,"kgf":1.3,"interval":"Ganti oli transmisi tiap 8.000 km"},
          {"name":"Mur pengunci kabel penghubung equalizer (tipe CBS)","ulir":"8 mm","nm":6.4,"kgf":0.7},
          {"name":"Jari-jari (tipe spoke wheel)","ulir":"BC 3,2 mm","nm":3.7,"kgf":0.4},
          {"name":"Baut penyetel arah sinar lampu depan","ulir":"4 mm","nm":2,"kgf":0.2},
          {"name":"Saringan udara","ulir":"—","nm":null,"kgf":null,"interval":"Ganti tiap 16.000 km (lebih sering jika area basah/berdebu)","consumable":true,"noTorque":true},
          {"name":"Drive belt (v-belt CVT)","ulir":"—","nm":null,"kgf":null,"interval":"Periksa tiap 8.000 km · Ganti tiap 24.000 km","consumable":true,"noTorque":true},
          {"name":"Minyak rem","ulir":"—","nm":null,"kgf":null,"interval":"Periksa tiap 4.000 km · Ganti tiap 2 tahun","consumable":true,"noTorque":true},
        ] },
        { cat: "Mesin — Cylinder Head/Valve", icon: "⚙️", items: [
          {"name":"Sekrup pemasangan intake shroud","ulir":"5 mm","nm":0.8,"kgf":0.1},
          {"name":"Baut pemasangan exhaust shroud","ulir":"6 mm","nm":7,"kgf":0.7},
          {"name":"Mur cylinder head","ulir":"7 mm","nm":18,"kgf":1.8,"note":"oli"},
          {"name":"Baut cam sprocket","ulir":"5 mm","nm":8,"kgf":0.8,"note":"oli"},
          {"name":"Sekrup cam chain tensioner lifter","ulir":"6 mm","nm":4,"kgf":0.4},
          {"name":"Baut special cover cylinder head","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Sekrup pemasangan breather plate","ulir":"4 mm","nm":3,"kgf":0.3},
          {"name":"Baut pin as cam chain tensioner slider","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Baut stud cylinder","ulir":"7 mm","nm":6,"kgf":0.6},
        ] },
        { cat: "Mesin — Kopling/Pulley/Final Drive", icon: "🔗", items: [
          {"name":"Sekrup plat cover crankcase kiri","ulir":"4 mm","nm":3,"kgf":0.3},
          {"name":"Mur drive pulley face","ulir":"14 mm","nm":108,"kgf":11,"note":"oli"},
          {"name":"Mur kopling/driven pulley","ulir":"28 mm","nm":54,"kgf":5.5},
          {"name":"Mur clutch outer","ulir":"12 mm","nm":49,"kgf":5},
          {"name":"Mur link penggantung mesin (sisi mesin)","ulir":"10 mm","nm":49,"kgf":5},
          {"name":"Mur link penggantung mesin (sisi rangka)","ulir":"10 mm","nm":69,"kgf":7},
        ] },
        { cat: "Sistem PGM-FI & Bahan Bakar", icon: "⛽", items: [
          {"name":"Sekrup torx katup solenoid peninggi putaran stasioner","ulir":"5 mm","nm":3.4,"kgf":0.3},
          {"name":"Sensor EOT","ulir":"10 mm","nm":14.5,"kgf":1.5},
          {"name":"Sensor O2","ulir":"12 mm","nm":25,"kgf":2.5},
          {"name":"Mur plat pemasangan pompa bahan bakar","ulir":"6 mm","nm":12,"kgf":1.2},
          {"name":"Sekrup dudukan kabel gas","ulir":"5 mm","nm":3.4,"kgf":0.3},
          {"name":"Baut pemasangan joint injector","ulir":"6 mm","nm":12,"kgf":1.2},
          {"name":"Sekrup plat pompa oli","ulir":"4 mm","nm":3,"kgf":0.3},
          {"name":"Baut pemasangan pompa oli","ulir":"6 mm","nm":10,"kgf":1},
        ] },
        { cat: "Roda Depan/Suspensi/Kemudi", icon: "🛞", items: [
          {"name":"Mur as roda depan","ulir":"12 mm","nm":59,"kgf":6},
          {"name":"Baut socket cakram rem depan","ulir":"8 mm","nm":42,"kgf":4.3,"note":"new"},
          {"name":"Baut socket fork","ulir":"8 mm","nm":20,"kgf":2},
          {"name":"Baut penjepit bottom bridge","ulir":"10 mm","nm":64,"kgf":6.5},
          {"name":"Baut fork","ulir":"20 mm","nm":22.5,"kgf":2.3},
          {"name":"Baut pemasangan caliper rem depan","ulir":"8 mm","nm":30,"kgf":3,"note":"new"},
          {"name":"Mur batang stang kemudi","ulir":"10 mm","nm":59,"kgf":6},
        ] },
        { cat: "Roda Belakang/Suspensi", icon: "🛞", items: [
          {"name":"Mur as roda belakang","ulir":"16 mm","nm":118,"kgf":12,"note":"oli"},
          {"name":"Baut pemasangan atas shock absorber belakang","ulir":"10 mm","nm":59,"kgf":6},
          {"name":"Baut pemasangan bawah shock absorber belakang","ulir":"8 mm","nm":26.5,"kgf":2.7},
        ] },
        { cat: "Sistem Rem", icon: "🛑", items: [
          {"name":"Baut arm rem belakang","ulir":"6 mm","nm":10,"kgf":1,"note":"new"},
          {"name":"Katup pembuangan caliper rem","ulir":"8 mm","nm":5.4,"kgf":0.6},
          {"name":"Sekrup tutup reservoir master cylinder rem","ulir":"4 mm","nm":1.5,"kgf":0.2},
          {"name":"Pin brake pad (kampas rem)","ulir":"10 mm","nm":18,"kgf":1.8,"interval":"Periksa keausan tiap 4.000 km","consumable":true},
          {"name":"Mur as handel rem depan","ulir":"6 mm","nm":6,"kgf":0.6},
          {"name":"Baut oli selang rem","ulir":"10 mm","nm":34,"kgf":3.5},
          {"name":"Pin dudukan caliper rem","ulir":"8 mm","nm":18,"kgf":1.8},
        ] },
        { cat: "Kelistrikan & Panel", icon: "🔌", items: [
          {"name":"Baut pemasangan kipas pendingin","ulir":"6 mm","nm":8,"kgf":0.8},
          {"name":"Mur flywheel","ulir":"10 mm","nm":39,"kgf":4},
          {"name":"Baut pemasangan sensor CKP","ulir":"5 mm","nm":6,"kgf":0.6},
          {"name":"Baut pemasangan muffler","ulir":"10 mm","nm":59,"kgf":6},
          {"name":"Baut pelindung muffler","ulir":"6 mm","nm":10,"kgf":1},
          {"name":"Baut as standar samping","ulir":"10 mm","nm":10,"kgf":1},
          {"name":"Mur pengunci as standar samping","ulir":"10 mm","nm":29,"kgf":3},
          {"name":"Baut socket key shutter","ulir":"6 mm","nm":10,"kgf":1,"note":"new"},
        ] },
      ],
    },
    spec: {
      matchNames: ["beat fi","beat-fi","beat esp","beat pgm-fi"],
      sourceNote: "Honda BeAT FI Gen 1 — Buku Pedoman Reparasi, bab INFORMASI UMUM (hal. 1-4 s/d 1-11) & PERAWATAN (hal. 3-3). Mesin 108cc satu platform dengan Vario 110 (eSP), tapi verifikasi ulang sebelum dipakai untuk motor lain.",
      umum: {
        "Kapasitas tangki BBM": "3,7 liter",
        "Oli mesin (ganti rutin)": "0,7 liter",
        "Oli mesin (setelah bongkar/ganti saringan)": "0,8 liter",
        "Jenis oli mesin": "SAE 10W-30 · API SG atau lebih tinggi · JASO T903: MB",
        "Oli transmisi/final drive (rutin)": "0,14 liter",
        "Oli transmisi/final drive (bongkar)": "0,16 liter",
        "Sistem pendinginan": "Udara paksa (tidak pakai radiator/coolant)",
        "Busi": "NGK CPR9EA-9 / DENSO U27EPR9",
        "Celah busi": "0,80 – 0,90 mm",
        "RPM stasioner": "1.700 ± 100 rpm",
        "Waktu pengapian": "7° sebelum TMA (saat stasioner)",
      },
      ban: {
        depan: { ukuran: "80/90-14 M/C 40P", tekanan: "200 kPa · 2,00 kgf/cm² · 29 psi (solo maupun boncengan)" },
        belakang: { ukuran: "90/90-14 M/C 46P", tekanan: "225 kPa · 2,25 kgf/cm² · 33 psi (solo maupun boncengan)" },
      },
      kelistrikan: {
        aki: "GTZ4V / YTZ4V — 12V, 3 Ah",
        sekring: "Utama 15A · Tambahan 10A",
        bohlam: [
          ["Lampu depan","12V 32/32W"],
          ["Lampu senja","12V 3,4W"],
          ["Lampu rem/belakang","12V 18/5W"],
          ["Lampu sein","12V 10W ×4"],
          ["Lampu instrumen","12V 1,7W ×2"],
          ["Indikator lampu jauh","12V 1,7W"],
          ["Indikator sein","12V 3,4W"],
          ["MIL","12V 1,7W"],
        ],
      },
      batasServis: [
        ["Ketebalan cakram rem depan","3,3–3,7 mm","Min 3,0 mm"],
        ["Diameter tromol rem belakang","130,0 mm","Maks 131,0 mm"],
      ],
    },
  },
];

// ------------------------------------------------------------------------
// API baca murni — TIDAK ada CRUD/write (Vehicle Database Fase 1 ini
// read-only, sumbernya kode statis, bukan storage). Pola nama method
// (getAll/getById) konsisten dgn VehicleCatalog (vehicle-catalog.js) &
// modul window.X lain di repo ini.
// ------------------------------------------------------------------------

// ------------------------------------------------------------------------
// Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §4 Fase 1 poin 2):
// pindahkan TORSI_DB/VEHICLE_SPEC_DB dari konstanta kode ke data tersimpan
// (IndexedDB), key by modelId. VEHICLE_DB_RECORDS di atas TETAP ADA —
// sekarang berperan sebagai seed/fallback, bukan lagi satu-satunya sumber
// baca. Menghapus TORSI_DB/VEHICLE_SPEC_DB literal (sparepart-servis-b.js)
// adalah langkah TERPISAH berikutnya (roadmap §3 Critical), BUKAN sesi ini.
//
// Pola IDBStore.get/set SAMA PERSIS modules/ai/ai-core.js
// (aiLoad/aiEnsureLoaded) — reuse instance IDBStore global yang sama dgn
// app, key terpisah ('vehicledb:active'). Guard `typeof IDBStore==='undefined'`
// supaya test/lingkungan terisolasi tanpa IndexedDB tetap jalan lewat
// fallback literal VEHICLE_DB_RECORDS — 0 regresi ke consumer sync yang
// sudah ada (findTorsiDb() dkk, SENGAJA TIDAK disentuh sesi ini, sesuai
// cakupan roadmap).
// ------------------------------------------------------------------------
const VEHICLE_DB_STORE_KEY = 'vehicledb:active';
let _vehicleDbActiveRecords = null; // null = belum dimuat -> baca VEHICLE_DB_RECORDS (seed)
let _vehicleDbLoaded = false;
// Sesi B-followup (roadmap §7 baris 349, gap (c) "konsumen findTorsiDb/
// findVehicleSpec masih baca sync tanpa await ensureLoaded()"): setelah
// diaudit, konsumen sync (resolveCatGroup()/renderVehicleSpecCard()/dkk)
// SEMUANYA dipanggil dari jalur render UI yang baru bisa jalan SETELAH
// load() (features-helpers-global-security.js) selesai -- dan load() SUDAH
// await DatabaseAPI.vehicle.ensureLoaded() sebelum lanjut (lihat komentar
// di load()). Mengubah resolveCatGroup() dkk jadi async supaya bisa
// `await ensureLoaded()` LANGSUNG di situ butuh ubah rantai pemanggil
// sampai ke render pipeline Servis.renderReminder() dkk -- refactor besar
// & berisiko regresi ke banyak titik render, DITOLAK (di luar cakupan "1
// gap kecil"). Perbaikan yang diambil sesi ini: `_vehicleDbLoadPromise`
// men-dedup pemanggilan `ensureLoaded()` supaya kalau lebih dari 1 titik
// memanggilnya "bersamaan" (mis. load() + kode lain yg suatu saat nanti
// juga memanggil ensureLoaded() sebelum load() selesai), cuma ADA SATU
// round-trip IndexedDB yang benar-benar jalan (sebelumnya: `_vehicleDbLoaded`
// baru jadi true SETELAH await selesai, jadi 2 pemanggil yang tumpang
// tindih sebelum itu bisa memicu 2x baca+tulis storage). Ini TIDAK
// mengubah kontrak "IDBStore belum boleh disentuh sebelum ensureLoaded()
// dipanggil" (test sesi B awal) -- getter sync (`_vehicleDbRecords()`)
// SENGAJA TIDAK diubah utk memicu load sendiri, persis alasan di atas.
let _vehicleDbLoadPromise = null;

// Sesi coding gap (a) Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
// §2g/§7, desain: DESAIN-SESI-B-GAP-A-VEHICLE-DB-REGISTRASI.md v1664):
// registrasi, bukan salin manual. modules/vehicle/sparepart-servis-b.js
// (dimuat SETELAH file ini, GROUP_B scripts/build.js) memanggil
// registerSource() top-level dgn data TORSI_DB/VEHICLE_SPEC_DB gabungan
// (pairing by id) begitu kedua const itu selesai didefinisikan — jadi
// TORSI_DB/VEHICLE_SPEC_DB jadi satu-satunya sumber kebenaran untuk seed
// baru, VEHICLE_DB_RECORDS literal di atas TIDAK dihapus (Keputusan (A)
// additive, dokumen desain §5) -- tetap jadi fallback paling akhir kalau
// registerSource() tidak pernah terpanggil (mis. 7 test yang me-load file
// ini sendirian, tanpa sparepart-servis-b.js ikut termuat).
let _registeredVehicleSource = null; // null = belum ada yg registrasi

/** Didaftarkan sbg DatabaseAPI.vehicle.registerSource -- dipanggil
 * sparepart-servis-b.js top-level. entries: array {id, displayName,
 * torsi?, spec?} -- bentuk PERSIS sama dgn shape VEHICLE_DB_RECORDS yang
 * sudah ada. Toleran kalau cuma salah satu (torsi-only/spec-only) ada utk
 * suatu id (Keputusan 3 dokumen desain). No-op kalau argumennya bukan
 * array (mis. dipanggil keliru). */
function dbVehicleRegisterSource(entries) {
  if (!Array.isArray(entries)) return;
  _registeredVehicleSource = entries;
}

function _vehicleDbRecords() {
  return _vehicleDbActiveRecords || _registeredVehicleSource || VEHICLE_DB_RECORDS;
}

async function _vehicleDbDoLoad() {
  if (typeof IDBStore === 'undefined' || !IDBStore || typeof IDBStore.get !== 'function') {
    _vehicleDbLoaded = true;
    return _vehicleDbRecords();
  }
  try {
    const stored = await IDBStore.get(VEHICLE_DB_STORE_KEY);
    if (stored && Array.isArray(stored) && stored.length) {
      _vehicleDbActiveRecords = stored;
    } else {
      // Sesi coding gap (a): seed dari _vehicleDbRecords() (registered >
      // literal), BUKAN VEHICLE_DB_RECORDS langsung -- supaya instalasi
      // BARU (storage kosong) ambil data dari TORSI_DB/VEHICLE_SPEC_DB
      // teregistrasi kalau ada (sumber kebenaran sekarang), fallback ke
      // literal cuma kalau registerSource() tidak pernah dipanggil.
      // _vehicleDbActiveRecords masih null di titik ini, jadi
      // _vehicleDbRecords() jatuh ke _registeredVehicleSource||VEHICLE_DB_RECORDS.
      _vehicleDbActiveRecords = _vehicleDbRecords().slice();
      await IDBStore.set(VEHICLE_DB_STORE_KEY, _vehicleDbActiveRecords);
    }
  } catch (e) {
    console.error('[DatabaseAPI.vehicle] Gagal load dari IndexedDB, fallback ke literal seed:', e);
    _vehicleDbActiveRecords = null;
  }
  _vehicleDbLoaded = true;
  return _vehicleDbRecords();
}

/** Muat Vehicle Database aktif dari IndexedDB (sekali per sesi app, pola
 * sama persis aiEnsureLoaded()). Kalau storage kosong (belum pernah
 * ditulis), seed dari VEHICLE_DB_RECORDS lalu tulis-balik (write-through
 * 1x) supaya panggilan berikutnya baca dari storage. Kalau IDBStore tidak
 * tersedia (mis. test terisolasi) atau read/write gagal, fallback permanen
 * ke literal seed — tidak pernah throw ke pemanggil. Dedup lewat
 * `_vehicleDbLoadPromise` (Sesi B-followup, lihat catatan di atas): kalau
 * sudah ada pemuatan sedang berjalan, pemanggil berikutnya ikut menunggu
 * promise yang sama, bukan memicu round-trip IndexedDB baru. */
async function dbVehicleEnsureLoaded() {
  if (_vehicleDbLoaded) return _vehicleDbRecords();
  if (!_vehicleDbLoadPromise) _vehicleDbLoadPromise = _vehicleDbDoLoad();
  return _vehicleDbLoadPromise;
}

/** true kalau ensureLoaded() sudah pernah selesai (sukses atau fallback). */
function dbVehicleIsLoaded() {
  return _vehicleDbLoaded;
}

/** Reset cache in-memory (bukan hapus data storage) — dipakai kalau ada
 * penulis lain ke key 'vehicledb:active' (mis. CRUD Fase 2 nanti) & app
 * perlu baca ulang dari IndexedDB di panggilan berikutnya. */
function dbVehicleInvalidateCache() {
  _vehicleDbActiveRecords = null;
  _vehicleDbLoaded = false;
  _vehicleDbLoadPromise = null; // Sesi B-followup: reset dedup guard juga, supaya invalidateCache() diikuti ensureLoaded() beneran baca ulang, bukan kebagian promise lama yg sudah selesai
}

/** Semua record Vehicle Database (2 model, Fase 1). Balikin SALINAN
 * dangkal array (bukan referensi langsung ke sumber data) supaya
 * pemanggil tidak bisa tidak sengaja mutasi sumber data lewat push/splice
 * ke hasilnya — pola sama vehicleCatalogGetAll(). Baca dari cache aktif
 * (IndexedDB) kalau sudah dimuat, fallback ke literal seed kalau belum
 * (mis. dipanggil sebelum ensureLoaded() — tetap sync & aman). */
function dbVehicleGetAll() {
  return _vehicleDbRecords().slice();
}

/** Cari 1 record via id (`'vario-125'`/`'beat-fi'`). null kalau tidak ada. */
function dbVehicleGetById(id) {
  if (!id) return null;
  return _vehicleDbRecords().find((r) => r.id === id) || null;
}

/** findTorsiByName(vehName, modelId) — SALINAN PERSIS logika findTorsiDb()
 * yang sudah ada di sparepart-servis-b.js, DIPERLUAS Sesi A2 (roadmap §7):
 * `modelId` opsional (dari D.vehicles[].modelId, Sesi A1) — kalau diisi
 * dan match record valid, dipakai LANGSUNG (exact, 0 ambiguitas), name
 * matching di-skip sepenuhnya. Kalau `modelId` kosong/tidak match apa pun
 * (mis. entri lama pra-migrasi, atau merk di luar Vehicle Database),
 * fallback 100% ke substring match `matchNames` seperti sebelumnya — 0
 * perubahan perilaku untuk pemanggil yang belum kirim `modelId`. */
function dbVehicleFindTorsiByName(vehName, modelId) {
  if (modelId) {
    const rec = dbVehicleGetById(modelId);
    if (rec && rec.torsi) return rec.torsi;
  }
  if (!vehName) return null;
  const n = vehName.toLowerCase();
  const rec = _vehicleDbRecords().find((r) => r.torsi && r.torsi.matchNames.some((m) => n.includes(m)));
  return rec ? rec.torsi : null;
}

/** findSpecByName(vehName, modelId) — SALINAN PERSIS logika findVehicleSpec()
 * yang sudah ada di sparepart-servis-b.js, DIPERLUAS Sesi A2 (roadmap §7)
 * dengan pola `modelId` opsional yang SAMA PERSIS dgn findTorsiByName() di
 * atas. */
function dbVehicleFindSpecByName(vehName, modelId) {
  if (modelId) {
    const rec = dbVehicleGetById(modelId);
    if (rec && rec.spec) return rec.spec;
  }
  if (!vehName) return null;
  const n = vehName.toLowerCase();
  const rec = _vehicleDbRecords().find((r) => r.spec && r.spec.matchNames.some((m) => n.includes(m)));
  return rec ? rec.spec : null;
}

// ------------------------------------------------------------------------
// Sesi A1 (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7, Fase 1 poin 1):
// manufacturers + vehicle_models relasional — fondasi murni, 0 UI, 0 titik
// baca lain diubah. `VEHICLE_MODELS` DITURUNKAN dari `VEHICLE_DB_RECORDS`
// di atas (bukan didefinisikan ulang manual) supaya 1 sumber kebenaran
// tetap `VEHICLE_DB_RECORDS` — kalau nanti model baru ditambah ke situ,
// `VEHICLE_MODELS` otomatis ikut tanpa disentuh manual. `matchNames`
// diambil dari `torsi.matchNames` (fallback `spec.matchNames` kalau
// `torsi` tidak ada) — sama seperti pola dbVehicleFindTorsiByName().
// ------------------------------------------------------------------------
const MANUFACTURERS = [
  { id: "honda", name: "Honda" },
];

const VEHICLE_MODELS = VEHICLE_DB_RECORDS.map((r) => ({
  id: r.id,
  manufacturerId: "honda",
  name: r.displayName,
  matchNames: (r.torsi && r.torsi.matchNames) || (r.spec && r.spec.matchNames) || [],
}));

// ------------------------------------------------------------------------
// Sesi lanjutan setelah Sesi B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md
// §2c, temuan "🟡 sebagian"): sebelum ini, VEHICLE_MODELS di atas dihitung
// SEKALI saat module load, murni dari VEHICLE_DB_RECORDS literal — kalau
// Vehicle Database aktif (_vehicleDbActiveRecords, Sesi B) berubah lewat
// storage (mis. CRUD Fase 2 nanti), VEHICLE_MODELS/dbVehicleModelFindByName()
// (dipakai migrasi toVersion:11) TIDAK ikut sinkron. `_vehicleModelRecords()`
// menutup gap ini: turunkan model list dari `_vehicleDbRecords()` (fungsi
// yang SAMA dipakai dbVehicleGetAll() dkk, sudah storage-aware sejak Sesi B)
// tiap dipanggil, bukan dari VEHICLE_MODELS const yang beku. VEHICLE_MODELS
// const TIDAK dihapus — tetap jadi fallback DAN kompatibel dgn test lama
// (parity vs VEHICLE_DB_RECORDS tidak berubah selama storage belum dimuat,
// yaitu skenario sebelum ensureLoaded() pernah dipanggil — 0 regresi).
// ------------------------------------------------------------------------
function _vehicleModelRecords() {
  if (_vehicleDbActiveRecords) return _vehicleDbActiveRecords.map(_toVehicleModelRecord);
  // Sesi coding gap (a): cabang BARU -- kalau storage belum pernah dimuat
  // TAPI sparepart-servis-b.js sudah registerSource(), turunkan model list
  // dari situ (bukan VEHICLE_MODELS literal beku) supaya 1 pintu konsisten
  // dgn _vehicleDbRecords()/dbVehicleGetAll() dkk yang sudah storage+
  // registered-aware.
  if (_registeredVehicleSource) return _registeredVehicleSource.map(_toVehicleModelRecord);
  return VEHICLE_MODELS;
}

function _toVehicleModelRecord(r) {
  return {
    id: r.id,
    manufacturerId: "honda",
    name: r.displayName,
    matchNames: (r.torsi && r.torsi.matchNames) || (r.spec && r.spec.matchNames) || [],
  };
}

/** Semua record Manufacturer. Salinan dangkal (pola sama dbVehicleGetAll()). */
function dbManufacturerGetAll() {
  return MANUFACTURERS.slice();
}

/** Cari 1 manufacturer via id. null kalau tidak ada. */
function dbManufacturerGetById(id) {
  if (!id) return null;
  return MANUFACTURERS.find((m) => m.id === id) || null;
}

/** Semua record Vehicle Model — storage-aware sejak sesi ini (lihat
 * `_vehicleModelRecords()` di atas): ikut Vehicle Database aktif kalau
 * sudah dimuat, fallback ke VEHICLE_MODELS (turunan literal) kalau belum.
 * Salinan dangkal. */
function dbVehicleModelGetAll() {
  return _vehicleModelRecords().slice();
}

/** Cari 1 vehicle model via id (`'vario-125'`/`'beat-fi'`). null kalau tidak ada. */
function dbVehicleModelGetById(id) {
  if (!id) return null;
  return _vehicleModelRecords().find((m) => m.id === id) || null;
}

/** findByName(vehName) — SAMA PERSIS pola substring-match findTorsiByName():
 * cocokkan `vehName` (mis. nama bebas dari D.vehicles[].name) terhadap
 * `matchNames` tiap model, case-insensitive. Balikin record model yang
 * cocok pertama, atau null. Dipakai migrasi toVersion:11
 * (features-helpers-global-security.js) untuk backfill `modelId` di
 * D.vehicles lama tanpa menebak-nebak ulang logic matching. */
function dbVehicleModelFindByName(vehName) {
  if (!vehName) return null;
  const n = vehName.toLowerCase();
  return _vehicleModelRecords().find((m) => m.matchNames.some((mn) => n.includes(mn))) || null;
}

// ------------------------------------------------------------------------
// Sesi berikutnya setelah B (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7
// baris 91 / §5.2 "item siap coding sekarang"): wiring 3 konsumen literal
// TERSISA ke DatabaseAPI — GENERIC_GROUP_BY_NAME, GENERIC_RECOMMEND_NAMES,
// FALLBACK_KEYWORDS (ketiganya di modules/vehicle/sparepart-servis.js &
// sparepart-servis-b.js). Ini BEDA dari 4 konsumen yang sudah wired
// sebelumnya (findTorsiDb/findVehicleSpec/suggestServiceIntervalKm/
// collectKnownGroups, lihat §2b roadmap) — 4 itu MEMANGGIL data per-model
// (`DatabaseAPI.vehicle`), sedangkan 3 di sini adalah data GENERIK lintas
// model (bukan data pabrikan, dilabeli eksplisit "estimasi"/"rule-of-thumb"
// di kode aslinya) — masuk kategori "Master Kategori & Komponen Servis"
// (roadmap §1 tabel baris 2), bukan Vehicle Database.
//
// SENGAJA namespace `master` di sini CUMA wadah baca murni utk 3 data ini —
// BUKAN Master Database penuh (`service_categories`/`service_items` 13
// kategori terkunci, roadmap §4 Fase 2 poin 1, masih 0% via §2b). Pola sama
// persis VEHICLE_DB_RECORDS di atas: data DISALIN (bukan di-import langsung
// — file sumber dimuat SETELAH file ini, lihat GROUP_B scripts/build.js),
// getter sync murni, 0 storage/IndexedDB (beda dgn DatabaseAPI.vehicle yg
// sudah py ensureLoaded() sejak Sesi B — 3 data ini TIDAK per-model jadi
// tidak butuh key by modelId, cukup pola guard sync yang sudah terbukti 4×
// di findTorsiDb()/dkk sebelum Sesi B menambah storage-nya).
//
// KENAPA DISALIN: identik alasan VEHICLE_DB_RECORDS di atas (urutan muat).
// Getter balikin SALINAN (Object.assign/slice), bukan referensi langsung,
// pola sama dbVehicleGetAll() — pemanggil tidak bisa tidak sengaja mutasi
// sumber data di sini.
// ------------------------------------------------------------------------
const GENERIC_GROUP_BY_NAME_RECORDS = {
  'oli mesin': { group: 'Perawatan Berkala', icon: '🛠️' },
  'filter oli': { group: 'Perawatan Berkala', icon: '🛠️' },
  'oli gardan': { group: 'Perawatan Berkala', icon: '🛠️' },
  'oli transmisi': { group: 'Perawatan Berkala', icon: '🛠️' },
  busi: { group: 'Perawatan Berkala', icon: '🛠️' },
  'filter udara': { group: 'Perawatan Berkala', icon: '🛠️' },
  'filter ac': { group: 'Perawatan Berkala', icon: '🛠️' },
  'v-belt cvt': { group: 'Perawatan Berkala', icon: '🛠️' },
  'minyak rem': { group: 'Perawatan Berkala', icon: '🛠️' },
  coolant: { group: 'Perawatan Berkala', icon: '🛠️' },
  'roller cvt': { group: 'Mesin — Kopling/Pulley/Final Drive', icon: '🔗' },
  'timing belt': { group: 'Mesin — Cylinder Head/Valve', icon: '⚙️' },
  'kampas rem': { group: 'Sistem Rem', icon: '🛑' },
  aki: { group: 'Kelistrikan & Panel', icon: '🔌' },
  'ban depan': { group: 'Roda Depan/Suspensi/Kemudi', icon: '🛞' },
};

const GENERIC_RECOMMEND_NAMES_RECORDS = {
  motor: ['Oli Mesin', 'Filter Oli', 'Oli Gardan', 'Busi', 'Filter Udara', 'Kampas Rem', 'V-Belt CVT', 'Roller CVT', 'Minyak Rem', 'Aki', 'Ban Depan'],
  mobil: ['Oli Mesin', 'Filter Oli', 'Oli Transmisi', 'Busi', 'Filter Udara', 'Filter AC', 'Kampas Rem', 'Minyak Rem', 'Aki', 'Coolant', 'Timing Belt', 'Ban Depan'],
  listrik: ['Kampas Rem', 'Minyak Rem', 'Aki', 'Ban Depan'],
};

const FALLBACK_KEYWORDS_RECORDS = [
  { keys: ['oli mesin', 'oli mesin motor'], km: 2000, label: 'rata-rata rekomendasi ganti oli mesin motor matic' },
  { keys: ['filter oli', 'saringan oli'], km: 8000, label: 'rata-rata rekomendasi buku servis motor matic' },
  { keys: ['oli gardan', 'oli transmisi', 'final drive', 'final reduction'], km: 8000, label: 'rata-rata rekomendasi buku servis motor matic' },
  { keys: ['busi'], km: 8000, label: 'rata-rata rekomendasi buku servis motor matic' },
  { keys: ['filter udara', 'saringan udara'], km: 16000, label: 'rata-rata rekomendasi buku servis motor matic' },
  { keys: ['kampas rem', 'brake pad'], km: 10000, label: 'rata-rata rekomendasi pemeriksaan kampas rem' },
  { keys: ['v-belt', 'vbelt', 'drive belt', 'cvt belt'], km: 24000, label: 'rata-rata rekomendasi ganti v-belt CVT' },
  { keys: ['roller', 'roller cvt'], km: 24000, label: 'rata-rata rekomendasi ganti roller CVT' },
  { keys: ['minyak rem', 'brake fluid'], km: 20000, label: 'rata-rata rekomendasi ganti minyak rem (≈2 tahun)' },
  { keys: ['coolant', 'radiator', 'cairan pendingin'], km: 20000, label: 'rata-rata rekomendasi ganti coolant (≈2 tahun)' },
  { keys: ['aki', 'accu', 'battery'], km: 15000, label: 'rata-rata usia pakai aki motor sebelum dicek ulang' },
  { keys: ['ban depan', 'ban belakang', 'ban luar'], km: 20000, label: 'rata-rata usia pakai ban motor' },
];

/** Salinan dangkal GENERIC_GROUP_BY_NAME (map nama part -> {group,icon}). */
function dbMasterGetGenericGroupByName() {
  return Object.assign({}, GENERIC_GROUP_BY_NAME_RECORDS);
}

/** Salinan dangkal GENERIC_RECOMMEND_NAMES (map jenis kendaraan -> array nama part). */
function dbMasterGetGenericRecommendNames() {
  const out = {};
  Object.keys(GENERIC_RECOMMEND_NAMES_RECORDS).forEach((k) => {
    out[k] = GENERIC_RECOMMEND_NAMES_RECORDS[k].slice();
  });
  return out;
}

/** Salinan dangkal FALLBACK_KEYWORDS (array {keys,km,label}). */
function dbMasterGetFallbackKeywords() {
  return FALLBACK_KEYWORDS_RECORDS.slice();
}

// ------------------------------------------------------------------------
// Sesi D (ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §7 "Sesi D") — 13
// kategori Master Kategori Servis TERKUNCI, namespace `masterCategory`
// (SENGAJA beda nama dari `master` di atas -- itu wadah baca 3 literal
// generik lama, BUKAN Master Database poin 2 di peta §1. `masterCategory`
// = data statis pertama utk Master Database itu).
//
// Sumber 13 kategori: breakdown servis Honda Vario 125 KZR 2012 (PGM-FI
// generasi pertama) yang diberikan W sesi ini sbg keputusan produk --
// dipakai APA ADANYA sbg taksonomi terkunci (bukan ditebak Claude), sesuai
// permintaan W "jika ada butuh keputusan produk" di prompt sesi ini.
//
// Desain (ADDITIVE, pola sama persis Sesi B gap (a) "Keputusan 1: additive
// dulu, full-cutover sesi terpisah" -- BUKAN meniru langkah gap (a) itu
// sendiri, 2 hal beda, cuma filosofinya sama): 13 kategori ini BARU
// (0 kategori/grup lama dihapus atau diganti namanya). `classifyItemName()`
// di bawah cuma MENAMBAH cara baca baru (keyword-based, per-item, mirip
// gaya GENERIC_GROUP_BY_NAME_RECORDS di atas -- eksplisit dilabeli
// "estimasi", BUKAN data pabrikan) -- dipakai resolveCatGroup()
// (sparepart-servis.js) utk mengisi field BARU masterCategoryId/-Name/-Icon
// di hasilnya, field group/icon LAMA 0 berubah (0 titik baca lama
// terpengaruh, 0 regresi). Migrasi penuh 8 grup ad-hoc TORSI_DB ke 13
// kategori ini (kalau nanti diinginkan) sengaja BUKAN scope sesi ini --
// 8 grup ad-hoc itu per-KELOMPOK (per cats[].cat), sedangkan classifier di
// sini per-ITEM (lebih presisi, tapi beda satuan) krn 1 grup ad-hoc spt
// "Perawatan Berkala" isinya campuran lintas kategori (oli mesin=Servis
// Mesin, v-belt=Servis CVT, minyak rem=Pengereman, dst) -- tidak bisa
// dipetakan 1:1 per grup tanpa kehilangan presisi.
//
// Item yang TIDAK match keyword mana pun balikin null (bukan ditebak ke
// kategori terdekat) -- pola sama E2 (`_findAutoGantiStock`) "0/>1
// kandidat = dilewati, aman, tidak menebak".
// ------------------------------------------------------------------------
const MASTER_SERVICE_CATEGORIES_RECORDS = [
  { id: 'servis-mesin', name: 'Servis Mesin', icon: '🔧',
    keywords: ['oli mesin', 'filter oli', 'saringan oli', 'busi', 'celah klep', 'klep', 'valve', 'kompresi mesin', 'piston', 'ring piston', 'silinder', 'head silinder', 'cylinder head', 'rantai keteng', 'keteng', 'tensioner', 'noken as', 'camshaft', 'rocker arm', 'gasket', 'seal mesin', 'crankcase', 'pompa oli'] },
  { id: 'servis-cvt', name: 'Servis CVT', icon: '🔗',
    keywords: ['v-belt', 'drive belt', 'roller', 'rumah roller', 'variator', 'slider piece', 'ramp plate', 'kampas kopling', 'mangkok kopling', 'per cvt', 'torque driver', 'bearing cvt', 'seal cvt', 'pulley', 'clutch', 'kopling'] },
  { id: 'sistem-injeksi-pgmfi', name: 'Sistem Injeksi PGM-FI', icon: '💉',
    keywords: ['throttle body', 'isc', 'idle speed', 'injector', 'sensor tps', 'tps', 'map sensor', 'intake manifold', 'sensor ect', 'ect', 'sensor eot', 'eot', 'solenoid', 'sensor o2'] },
  { id: 'sistem-bahan-bakar', name: 'Sistem Bahan Bakar', icon: '⛽',
    keywords: ['tangki bensin', 'selang bensin', 'tutup tangki', 'fuel pump', 'pompa bahan bakar', 'pompa bensin', 'saringan bensin', 'filter bensin'] },
  { id: 'sistem-pendingin', name: 'Sistem Pendingin', icon: '🌡️',
    keywords: ['radiator', 'coolant', 'cairan pendingin', 'selang radiator', 'water pump', 'pompa air', 'thermostat', 'kipas'] },
  { id: 'sistem-pengereman', name: 'Sistem Pengereman', icon: '🛑',
    keywords: ['kampas rem', 'cakram', 'caliper', 'kaliper', 'minyak rem', 'master rem', 'master cylinder', 'selang rem', 'tromol', 'tuas rem', 'kabel rem', 'handel rem', 'rem'] },
  { id: 'suspensi', name: 'Suspensi', icon: '🌀',
    keywords: ['shock', 'fork', 'suspensi', 'bushing', 'bottom bridge'] },
  { id: 'sistem-kemudi', name: 'Sistem Kemudi', icon: '🎯',
    keywords: ['komstir', 'poros kemudi', 'stang kemudi', 'batang stang', 'segitiga'] },
  { id: 'kelistrikan', name: 'Kelistrikan', icon: '🔌',
    keywords: ['aki', 'alternator', 'spul', 'regulator', 'kiprok', 'starter', 'relay', 'sekring', 'kabel bodi', 'ecu', 'sensor ckp', 'sensor vs', 'lampu', 'klakson', 'saklar', 'flywheel', 'stator', 'meter kombinasi'] },
  { id: 'roda', name: 'Roda', icon: '🛞',
    keywords: ['ban depan', 'ban belakang', 'pentil', 'bearing roda', 'as roda'] },
  { id: 'filter-udara', name: 'Filter Udara', icon: '🌬️',
    keywords: ['filter udara', 'saringan udara', 'air cleaner', 'elemen filter', 'box filter', 'saluran masuk udara'] },
  { id: 'final-gear', name: 'Final Gear', icon: '⚙️',
    keywords: ['final reduction', 'final gear', 'oli gardan', 'gardan', 'oli transmisi'] },
  { id: 'body-kontrol', name: 'Body dan Kontrol', icon: '🧰',
    keywords: ['kabel gas', 'standar samping', 'standar tengah', 'engsel jok', 'kunci kontak', 'key shutter', 'baut bodi', 'baut-baut bodi'] },
];

/** Salinan dangkal 13 kategori (tanpa field `keywords`, internal saja -- pola sama dbVehicleGetAll() balikin salinan, bukan referensi). */
function dbMasterCategoryGetAll() {
  return MASTER_SERVICE_CATEGORIES_RECORDS.map((c) => ({ id: c.id, name: c.name, icon: c.icon }));
}

/** Cari 1 kategori via id. null kalau tidak ada. */
function dbMasterCategoryGetById(id) {
  if (!id) return null;
  const hit = MASTER_SERVICE_CATEGORIES_RECORDS.find((c) => c.id === id);
  return hit ? { id: hit.id, name: hit.name, icon: hit.icon } : null;
}

/** classifyItemName(name) -- cocokkan nama part/item (mis. cat.name dari
 * D.sparepartCats atau item.name dari TORSI_DB) ke 1 dari 13 kategori
 * terkunci via keyword substring match (case-insensitive), urutan array di
 * atas = urutan prioritas. Balikin {id,name,icon} pada match pertama, atau
 * null kalau 0 keyword cocok (SENGAJA tidak menebak ke kategori terdekat,
 * lihat catatan di atas namespace). Estimasi/heuristik, bukan data
 * pabrikan -- pola sama persis GENERIC_GROUP_BY_NAME_RECORDS. */
function dbMasterCategoryClassifyItemName(name) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return null;
  for (const cat of MASTER_SERVICE_CATEGORIES_RECORDS) {
    if (cat.keywords.some((kw) => n.includes(kw))) {
      return { id: cat.id, name: cat.name, icon: cat.icon };
    }
  }
  return null;
}

// ------------------------------------------------------------------------
// Namespace publik — pola sama persis AIBus/VehicleCatalog (const object,
// expose eksplisit ke window karena app ini script global non-module).
// ------------------------------------------------------------------------
const DatabaseAPI = {
  vehicle: {
    getAll: dbVehicleGetAll,
    getById: dbVehicleGetById,
    findTorsiByName: dbVehicleFindTorsiByName,
    findSpecByName: dbVehicleFindSpecByName,
    ensureLoaded: dbVehicleEnsureLoaded,
    isLoaded: dbVehicleIsLoaded,
    invalidateCache: dbVehicleInvalidateCache,
    registerSource: dbVehicleRegisterSource,
  },
  manufacturer: {
    getAll: dbManufacturerGetAll,
    getById: dbManufacturerGetById,
  },
  vehicleModel: {
    getAll: dbVehicleModelGetAll,
    getById: dbVehicleModelGetById,
    findByName: dbVehicleModelFindByName,
  },
  master: {
    getGenericGroupByName: dbMasterGetGenericGroupByName,
    getGenericRecommendNames: dbMasterGetGenericRecommendNames,
    getFallbackKeywords: dbMasterGetFallbackKeywords,
  },
  masterCategory: {
    getAll: dbMasterCategoryGetAll,
    getById: dbMasterCategoryGetById,
    classifyItemName: dbMasterCategoryClassifyItemName,
  },
};

if (typeof window !== 'undefined') {
  window.DatabaseAPI = DatabaseAPI;
}
