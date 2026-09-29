# SESSION NOTE — S2144 Service History mobile: compact & tidak terpotong (kumulatif S2143)

## Masalah
Screenshot 29 Sep 2026: kartu Riwayat Servis di mobile terpotong (judul/tanggal/chip) dan sangat panjang ke bawah.

## Perubahan
1. Rincian biaya (`Jasa/Part/Bahan/Lain`) hanya menampilkan komponen bernilai > 0; disembunyikan jika semuanya 0 (`_costChips` di `modules/vehicle/servis-b.js`). Berlaku juga di ringkasan sesi.
2. Tombol Edit Checklist / Edit Sesi / Tambah jadi ikon (✏️ / ➕); `aria-label` dan `title` tetap ("Edit Checklist Sesi Servis" dst).
3. Checkbox audit hanya muncul di mode pilih: toolbar default `☑️ Pilih`; mode aktif menampilkan "Pilih semua tampil", jumlah terpilih, audit, dan `✕ Selesai`. Class `servis-select-mode` di `#servisList`. Mode otomatis aktif bila ada item terpilih; reset saat ganti kendaraan.
4. Daftar > 8 entri dikelompokkan per bulan (header bisa dilipat, bulan terbaru terbuka default; semua terbuka saat mode pilih). Daftar <= 8 entri tetap flat.
5. Chip pengingat: nama komponen dihilangkan jika sama dengan judul kartu (nama lengkap tetap di `title`).
6. Test lama diselaraskan dengan kontrak grid terkini: S2098 (`servis-history-mobile-grid-s2098`), sesi2c, sesi2d, dan S2142 (chip kini wrap, bukan strip scroll).
7. Versi rilis dinaikkan lewat `node scripts/build.js 2142` (semua konstanta versi, `?v=` HTML, `CACHE_NAME` sw.js = 2142).

## CSS
Blok `S2144` di akhir `styles.css` (menggantikan S2143 yang sempat dikirim), plus chip S2142 kini `flex-wrap: wrap`.

## Test
- Baru: `tests/s2144-service-history-compact-ux.test.js` (9 test).
- Full suite setelah build: 7927 tests, 7920 pass, 7 fail. Ketujuhnya sudah gagal di baseline `app-main__37_` (tidak disentuh sesi ini):
  s1860-app-wide-hardening (1), s1931-navigation-atomic-transition (styles.css budget, 1), s2113-rendered-controls (1), service-empty-catch-v22 (1), vehicle-jenis (3).
- Catatan: `styles.css` bertambah; test budget S1931 sudah gagal sebelum patch ini.

## Belum dilakukan
- Verifikasi visual di perangkat nyata (hanya test source/CSS + harness handler).
- Bundle belum diminify (esbuild tidak tersedia di environment ini).
