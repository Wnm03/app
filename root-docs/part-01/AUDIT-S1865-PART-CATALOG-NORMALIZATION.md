# AUDIT S1865 — Part Catalog Normalization (No Images)

## Tujuan
Melanjutkan ekspansi S1864 dengan memisahkan **maintenance component** dari **part-level catalog record**. S1865 tidak memasukkan gambar katalog dan tidak menjadikan seluruh isi katalog sebagai component master.

## Sumber audit
Honda Cengkareng — Katalog Suku Cadang Honda Vario Techno 125 -2, kode KZRJ. Katalog terbit 20 Januari 2013 dan menyebut bahwa part dapat direvisi/diganti/dihapus setelah tanggal tersebut; karena itu nomor part dicatat sebagai provenance katalog, bukan jaminan current-market availability. citeturn4view0

Katalog mengidentifikasi KZRJ sebagai Vario Techno 125 2013 dengan tipe Standard/CBS dan nomor seri yang berlaku pada dokumen tersebut. citeturn4view0

## Temuan utama
1. `ServiceMasterDB` tetap menjadi taxonomy maintenance. Setelah audit lanjutan, dua komponen katalog yang jelas berbeda ditambahkan:
   - `oil-pump` → Servis Mesin
   - `bearing-swingarm` → Suspensi
   Total master menjadi **102 komponen / 13 kategori**.
2. Part-level catalog dipindahkan ke file JSON terpisah `data/parts-catalog-vario-techno-125-kzrj.json`.
3. S1865 mencatat **103 part records yang diverifikasi langsung dari teks katalog**. Ini bukan transkripsi penuh 104 halaman.
4. `PartsCatalogDB` menggunakan **on-demand fetch** terhadap JSON; data part tidak dimuat saat startup dan tidak ditanam sebagai base64/gambar di bundle.
5. Mapping yang belum jelas sengaja tidak dipaksakan. Contoh: switch side-stand tidak dipetakan ke `saklar-rem`, karena keduanya bukan komponen maintenance yang sama.

## Bukti katalog yang dipakai
- E-4 secara eksplisit mencantumkan valve stem seal, camshaft, rocker arm, intake valve dan exhaust valve. citeturn6view2turn6view3
- E-10 mencantumkan flywheel dan stator. E-11 mencantumkan oil pump assembly dan driven gear. citeturn5view1turn6view4
- E-14 mencantumkan radiator, radiator cap, water hoses dan cooling fan. citeturn11view0
- E-16/E-17 mencantumkan slide piece, drive face, roller, ramp plate, drive belt, clutch, driven face, needle bearing, 6902 bearing dan driven-face seal. citeturn11view0
- E-17-10 mencantumkan drive shaft, countershaft, final gear, several bearings dan oil seals. citeturn11view0
- E-19-20 mencantumkan oil-filter screen, speed sensor, crankcase bearings dan oil seal. citeturn11view0
- F-26 mencantumkan fuel pump, fuel filter, fuel tank, fuel hose dan fuel unit. F-28 mencantumkan air-cleaner element. citeturn9view0turn9view1
- F-17/F-18/F-23/F-36/F-40/F-41 menyediakan bukti untuk fork seal, front-caliper seal/pad, swingarm bearing/dust seals, rear cushion, battery, ignition coil, wiring, horn, relay dan fuse. citeturn7view0turn8view0turn8view1turn9view2

## Aturan desain
- 13 kategori existing tidak diubah.
- 100 component S1864 tidak dihapus; hanya ditambah 2 component yang memiliki bukti katalog jelas.
- Part number bukan maintenance component.
- Tidak semua bolt/washer/clip/O-ring dimasukkan sebagai component.
- Tidak ada interval servis baru yang diinferensikan dari katalog.
- Histori tetap `D.servisLogs`.
- Tidak ada gambar katalog.
- Tidak ada PDF katalog di bundle.
- Part catalog JSON dimuat hanya saat `PartsCatalogDB` pertama kali digunakan.

## Verifikasi
- 102 component IDs unique.
- 99 part numbers unique.
- Setiap section pada part record dideklarasikan.
- Setiap mapping componentId mengarah ke master component yang valid; part yang belum dapat dinormalisasi boleh memiliki `componentIds: []`.
- Targeted S1865 tests dan build dijalankan setelah perubahan.
