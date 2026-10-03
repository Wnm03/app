# S2372 — Pemindaian tunggal untuk snapshot sesi servis

## Temuan
Blok setelah pembuatan log menyaring `D.servisLogs` untuk menemukan baris sesi baru. Di dalam loop tersebut, kode kembali menyaring seluruh array dan menjalankan `indexOf` pada hasilnya hanya untuk memperoleh indeks idempotensi. Untuk `n` log dan `k` baris dalam sesi, pola tersebut menambah pekerjaan mendekati O(k*n) di luar pemindaian awal.

## Perbaikan
- Ambil `_sessionRowsToSnapshot` sekali dari filter sesi yang sama.
- Iterasi array tersebut dengan indeks agar urutan baris identik.
- Gunakan indeks loop yang sama untuk mengambil `_rowIdempotencyKeys`.
- Pertahankan perilaku saat jumlah kunci lebih sedikit dari jumlah baris: baris tanpa kunci tidak diberi `idempotencyKey`.
- Pertahankan snapshot katalog asinkron dan fallback error per referensi.

## Verifikasi
Tes sumber memeriksa hanya satu pemfilteran dan tidak ada `filter().indexOf()` di loop. Tes perilaku memeriksa urutan pemetaan dan kasus jumlah kunci yang lebih sedikit. Perubahan ini belum membuktikan peningkatan waktu nyata pada data produksi.
