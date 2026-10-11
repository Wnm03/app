# Audit & Implementasi UI/UX S2311 — prioritas 2 → 1 → 3

## Basis dan batas perubahan
- Basis: `app-main (11).zip` (SHA-256: `e5d7e7d3cdbd8b7b7793003287a7f48cc600dcfa259b09f1aed5a1404b741c98`) ditambah patch `PATCH-S2310-GRAD-ACCENT-TOKEN-SCOPE-v2310.zip`.
- Akumulasi dipertahankan sebagai satu patch; runtime build/cache dinaikkan ke `s2041-1-part-sot-hardening-2311`, HTML `?v=2311`, service-worker cache `kw-cache-v2311`.
- Tidak ada perubahan layout global di luar scope yang diminta; business logic transaksi, perhitungan, dan data tetap memakai fungsi lama.

## Hasil implementasi

### Prioritas 2 — tombol “+”
- Mempertahankan satu pemicu FAB bersama di navigasi bawah.
- Menguatkan tampilan ikon `+` dengan warna teks kontras dan latar fallback yang eksplisit.
- Menu FAB kontekstual tetap membuka aksi halaman yang sudah tersedia, dengan posisi fixed tepat di atas navigasi bawah dan batas lebar sesuai viewport/safe-area.
- Pada halaman tanpa FAB khusus (termasuk Beranda), tombol `+` membuka menu fallback yang berisi Pemasukan, Pengeluaran, Isi BBM, dan Servis; tidak lagi berhenti pada toast “Tidak ada aksi cepat”.
- Menutup menu fallback saat aksi dipilih atau FAB bersama ditutup; label “Tambah” tersedia di desktop.

### Prioritas 1 — tab Uang
- Tujuh tab utama dipertahankan, tetapi dipaksa satu baris horizontal yang bisa digeser, bukan membungkus hingga tiga baris.
- Breadcrumb level halaman yang mengulang nama tab disembunyikan; breadcrumb sub-tab yang memberi konteks tetap ada.
- Sub-tab Kelola tetap horizontal dan ringkas. Tidak ada tab atau fitur keuangan yang dihapus.

### Prioritas 3 — Mobil/BBM
- Header Fuel Intelligence yang sebelumnya terulang di dalam card dihilangkan dari body; header luar tetap menjadi satu judul card. Nama kendaraan dan efisiensi tetap ditampilkan sebagai baris ringkas.
- Hint fuel bar tidak lagi membawa tombol Atur Tangki/Koreksi kedua; hint mengarahkan ke CTA tunggal yang tetap tersedia pada baris aksi.
- Baris briefing tanpa nilai tidak lagi menampilkan deretan tanda “—”; hanya nilai yang tersedia atau insight/rekomendasi bermakna yang ditampilkan.

## Verifikasi
- Tes terarah UI/UX + FuelCard + S2550: 72/72 lulus.
- Full suite: 8.789 tes; 8.786 lulus, 0 gagal, 3 skipped, 0 cancelled/todo; seluruh 64 shard valid.
- `node --check` pada source JS dan bundle yang disentuh: lulus.
- Bundle freshness: kedua bundle cocok dengan hash source.
- Release gate: seluruh gate struktural, SOT, version, cache, minify, deep firewall, Car Notes, dan bundle freshness lulus. Gate lint normal tidak dapat berjalan karena `eslint` tidak tersedia di sandbox; release gate dijalankan dengan override terdokumentasi setelah syntax check JS dan tes terarah/full suite lulus. Ini bukan klaim bahwa ESLint benar-benar berjalan.
- Pemeriksaan screenshot browser otomatis tidak selesai di sandbox; tampilan akhir masih perlu smoke-test visual nyata di 320px, 390px, dan desktop, termasuk interaksi sentuh. Tidak diklaim sebagai verifikasi Safari/iOS.

## Catatan batas
- Tidak mengubah isu audit lain di luar tiga prioritas ini.
- Tidak mengubah struktur data, transaksi, perhitungan, atau penyimpanan.
