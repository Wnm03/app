# AUDIT S1864 — Service Master Catalog Expansion

## Tujuan
Melengkapi `ServiceMasterDB` yang sebelumnya berisi 13 kategori / 50 komponen berdasarkan struktur katalog suku cadang Honda Vario Techno 125 -2 (KZRJ), tanpa memasukkan gambar katalog dan tanpa mengubah 13 kategori yang sudah menjadi taxonomy SoT.

## Sumber
- Canonical application master: `data/database-kategori-komponen-servis.json`
- Catalog reference: Honda Cengkareng — Katalog Suku Cadang Honda Vario Techno 125 -2, KZRJ 2013–2015.
- URL: https://www.hondacengkareng.com/catalogs/katalog-honda-vario-techno-125-2/

Catalog digunakan untuk audit kelengkapan struktur komponen, bukan sebagai sumber interval servis. Karena itu komponen baru tidak diberi interval KM/bulan yang tidak didukung katalog.

## Hasil
- Kategori tetap: **13**
- Komponen sebelum: **50**
- Komponen sesudah: **100**
- ID komponen lama: dipertahankan
- Duplicate `componentId`: **0**
- Gambar katalog: **tidak dimasukkan**
- Part number level-detail: **belum dimasukkan**; ini sengaja dipisahkan dari maintenance-component master.

### Ekspansi utama
- Servis Mesin: 8 → 14
- Servis CVT: 13 → 18
- Sistem Injeksi PGM-FI: 3 → 5
- Sistem Bahan Bakar: 2 → 4
- Sistem Pendingin: 3 → 6
- Sistem Pengereman: 8 → 11
- Suspensi: 3 → 7
- Sistem Kemudi: 1 → 3
- Kelistrikan: 3 → 10
- Roda: 3 → 7
- Filter Udara: 1 → 1
- Final Gear: 1 → 7
- Body & Kontrol: 1 → 7

## Data model
`catalogRefs` ditambahkan sebagai provenance ringan pada component master. Nilai hanya diisi untuk section reference yang sudah diverifikasi; mapping kosong berarti belum dikunci dan tidak boleh dianggap sebagai bukti section tertentu.

`catalogSources` pada root JSON mencatat katalog yang dipakai untuk audit kelengkapan.

## Aturan penting
1. 13 kategori existing tidak dipecah/diubah.
2. Component lama tidak dihapus dan ID tidak diganti.
3. Komponen katalog yang terlalu kecil seperti setiap baut/washer/clip/O-ring tidak otomatis menjadi maintenance component.
4. Interval servis baru tidak diinferensikan dari keberadaan part di katalog.
5. Maintenance history tetap memakai `D.servisLogs`.
6. `ServiceMaintenanceEngine` tetap read-only terhadap histori.

## Verifikasi
Targeted test:
- ServiceMasterDB / maintenance golden contract: **11/11 PASS**
- Build `s1864-service-master-catalog-100-1864`: selesai.
- Bundle syntax check: PASS.
- HTML/SW version sync: PASS.
- Source lint gates: PASS.

Catatan build: `esbuild` tidak tersedia di environment sehingga bundle dibuat tanpa minifikasi, tetapi syntax check kedua bundle lolos. Release environment dengan esbuild sebaiknya melakukan rebuild versi yang sama untuk mendapatkan minifikasi.
