# Triase S2552 — kelompok E (tes teks render usang vs regresi)

Hanya triase. Tidak ada tes E yang diubah; semuanya menunggu persetujuan per tes.
Dasar: full test sharded pada base + S2551 + perubahan D (35 gagal tersisa).

| Tes | Hasil | Bukti | Usulan (belum dikerjakan) |
| --- | --- | --- | --- |
| perf-navigation-v1825 #1 Keuangan top-tab | Tes usang | Asersi yang sama lulus terhadap `modules/shared/modules-render.js`; gagal karena membaca bundle minify. Perilaku juga terbukti di VM (`s2552-bundle-vm-runtime`). | Baca `bundleSource('b'/'a')` |
| #2 Shop tidak render semua presenter | Tes usang | Sama; terbukti di VM. | Sama |
| #3 Aset lazy per tab | Tes usang | Sama; terbukti di VM. | Sama |
| #4 setAsetTab render hanya jika tab berubah | Tes usang | Asersi lulus terhadap `modules/asset/aset-misc.js`. | Sama |
| #5 showPage satu kali scan overlay | Tes usang | Lulus terhadap `modules/shared/modal-navigasi.js`. | Sama |
| #6 tap nav aktif tidak render ulang | Tes usang | Lulus terhadap `modal-navigasi.js`. | Sama |
| s2462 Finance save guards preflight stale | **Regresi sungguhan (sebagian)** | `withSaveGuard`/`withSaveGuardAsync` di bundle produksi TIDAK memanggil `_financeMutationBlockedByStaleState()`. Perbaikan hanya ada di `modules/finance/features-helpers-global-security.js`, yang tidak termasuk GROUP_A/GROUP_B `scripts/build.js`. Tes memeriksa salinan yatim itu. | Keputusan Anda: tambah preflight di versi `shared` + rebuild bundle, lalu arahkan tes ke `shared`. |

Dampak s2462: `save()` tetap menolak tab basi, jadi data tersimpan tidak tertimpa; mutasi in-memory
lewat jalur `withSaveGuard` yang tidak punya preflight sendiri bisa terjadi sebelum ditolak.
11 entrypoint finance punya preflight langsung (tes keempat s2462 lulus).

Tes 28 lain yang sebelumnya dikira sebagian E ternyata kelompok A (teks bundle minify) dan sudah diselesaikan.
