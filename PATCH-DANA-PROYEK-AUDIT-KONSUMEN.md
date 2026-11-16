# Patch: audit dana proyek — 4 konsumen basis pribadi
Baseline: app-main_16 (+ CATATAN-PATCH Dana Proyek Klien Fase 1-5 + Langkah 1-6).
Prinsip: dana proyek klien terpisah; ke dana pribadi hanya pencairan laba final dari ledger.

1. modules/shared/modules-render-b.js — ringkasan bulan halaman Keuangan (mIncome/mExpense/mNet + KeuanganInsight): aliran klien dikeluarkan, pencairan bulan itu ditambahkan. Daftar transaksi (txM) tidak diubah.
2. modules/shared/modules-render.js — kartu surplus: aliran klien dikeluarkan, pencairan ditambahkan.
3. modules/finance/pajak-pbb-zakat.js — PPh21 "isi dari transaksi": DP klien tidak dihitung gaji; pencairan laba ikut (per bulan pencairan).
4. modules/ai/feature-insights.js — pemakaian budget: belanja dana proyek tidak ikut.
Tes baru: tests/dana-proyek-konsumen-pribadi.test.js (4 tes; RED sebelum perbaikan). Suite penuh (TZ=UTC): 9.958 tes, 33 gagal = nama sama dgn baseline (bundle/freshness).
Belum: bundle belum dibangun ulang; belum diuji di browser/perangkat. Tidak disentuh: total saldo fisik di UI akun (label), akun lama tertaut aset berisi dana klien.

## Tahap 2 — tampilan saldo (diakumulasikan, hanya muncul bila ada proyek klien dgn dana tertahan > 0)
5. akun.js — helper baca-saja: saldoKlienRingkasSafe, catatanSaldoKlienSafe, akunAliranKlienSetSafe, akunTertautBerisiKlienSafe. totalSaldoAkun() tidak diubah (I-01).
6. modules-render.js — halaman Akun: catatan "Termasuk dana klien tertahan X · Saldo pribadi Y" di bawah Total Saldo Akun; lencana "Memuat dana klien" per kartu akun; peringatan merah akun tertaut aset yg memuat dana klien (info + langkah manual, tanpa migrasi). Total di Laporan (lapAccTotal) & dashboard (dashAccTotal): tetap FISIK (cocok dgn jumlah daftar) + catatan yg sama.
7. modules-calc.js — kartu Kekayaan Bersih: label "Saldo Akun (pribadi)" + "belum termasuk X dana klien".
Tes baru: tests/dana-proyek-tampilan-saldo.test.js (5 tes). Suite penuh (TZ=UTC): 9.963 tes, 33 gagal = sama dgn baseline.
Catatan: peringatan akun tertaut ditaruh di halaman Akun (belum di data-health-check.js, yang ada di root ZIP; bisa ditambah kemudian).

## Tahap 3 — temuan UJI BROWSER (Chromium headless, bundle dibangun ulang di salinan) — 2 bug nyata
8. akun.js — mesin dana klien ada di renovasi.js yang LAZY-LOAD. Sebelum halaman Renovasi dibuka, saldoPribadi/isAliranKlien/pencairan tidak ada, sehingga semua wrapper *Safe jatuh ke angka FISIK (DP klien terhitung pemasukan, saldo pribadi = fisik). Perbaikan: ensureKlienEngineSafe() memuat modul sekali bila ada proyek klien, lalu buang cache saldo & render ulang halaman aktif. Tanpa proyek klien: tidak memuat apa pun.
9. renovasi.js — renovAccountOwners() mengembalikan [{ownerId:'SELF',porsi:100}] utk akun biasa; kode lama menganggap itu "titipan" (.length>0). Akibatnya DP selalu "di luar cakupan", biaya proyek tidak terhitung, status tak pernah HIJAU, laba tak bisa diakui. Perbaikan: renovAkunTitipan() = ada pemilik selain SELF (deductionOwnerId SELF juga bukan titipan).
Tes baru: tests/dana-proyek-lazy-engine.test.js (3), tests/dana-proyek-owner-self-default.test.js (4). Suite penuh (TZ=UTC): 33 gagal = nama sama dgn baseline (bundle/freshness).
Hasil browser (data uji: gaji 300, DP 200, biaya proyek 120, makan 50): sebelum pencairan fisik 330 / pribadi 250 / dana tertahan 80 / pemasukan bulan 300 / pengeluaran 50; setelah laba 80 diakui+dicairkan: pribadi 330, pemasukan bulan 380, catatan dana klien hilang. Tanpa error konsol.
Belum: bundle produksi belum dibangun ulang di patch ini (jalankan scripts/build.js); belum diuji di perangkat Android/TWA.

## Tahap 4 — Data Health Check, muat mesin lebih awal, verifikasi browser
10. data-health-check.js — peringatan "Akun tertaut aset memuat dana klien" (1 per akun, tombol ✏️ Buka Akun = openAccModal[indeks]); hanya info + langkah manual. Bila proyek klien ada tapi mesin belum dimuat: muat, lalu pindai ulang jika modal masih terbuka. Ditaruh SEBELUM blok render modal.
    TEMUAN (belum diperbaiki): modal dirender sekali di tengah runDataHealthCheck(); cek yang di-push sesudahnya (S2818–S2820, kategori servis, preorder) hanya masuk nilai kembalian, tidak tampil di modal.
11. akun.js — ensureKlienEngineSafe() kini mengembalikan promise (atau null); render ulang setelah muat dilewati bila aplikasi belum tampil. Baru: siapkanMesinKlienSafe(maxMs) (tidak pernah reject; true=siap/tak perlu, false=timeout/gagal).
12. modules/shared/app-init-runtime.js — pemuatan mesin dimulai tepat setelah load(); tanpa PIN showMain() menunggu maks 1,5 dtk; dengan PIN dimuat di belakang layar PIN. Tanpa proyek klien: tidak memuat apa pun.
Tes baru: tests/data-health-check-dana-klien-tertaut.test.js (9), tests/dana-proyek-mesin-awal.test.js (11); ditulis RED dulu, lalu hijau.
Suite penuh (TZ=UTC): 33 gagal = sama dgn baseline (bundle/freshness); 2 gagal sementara (catch kosong di 2 baris baru) sudah diperbaiki dan gerbangnya hijau.

### Uji browser (Chromium headless, bundle dibangun ulang di salinan; data: gaji 3.000.000, DP klien 2.000.000, biaya proyek 1.200.000, makan 500.000; laba 800.000)
- Mesin dimuat lebih awal: bundle patch lama → mesin BELUM ada saat aplikasi tampil pertama (renovasi.js selesai ±6 ms sesudahnya = tampilan fisik sekilas); bundle baru → mesin SUDAH ada saat tampil (selesai ±20 ms sebelumnya).
- Saldo: fisik 3.300.000; pribadi 2.500.000 sebelum pencairan, 3.300.000 sesudahnya.
- PPh21 "isi dari transaksi": sebelum pencairan 3.000.000 (DP tidak dihitung; tanpa perbaikan = 5.000.000); pencairan di bulan yg sama 3.800.000; pencairan di bulan lain (3.000.000+800.000)/2 = 1.900.000.
- Budget: pemakaian 500.000 (bukan 1.700.000); tanpa peringatan pada limit 2.000.000; kontrol positif limit 600.000 → "83% terpakai" (bukan 283%). Budget.matchesTx di baseline sudah mengecualikan aliran klien, jadi ai-chat.js & halaman Budget ikut aman.
- Tanpa error konsol di semua skenario.
Belum: bundle produksi belum dibangun ulang di patch ini (jalankan scripts/build.js); Data Health Check belum dicoba di browser (hanya tes unit); belum diuji di Android/TWA.

## Tahap 5 — perbaikan render Data Health Check (temuan Tahap 4 ditutup)
13. data-health-check.js — blok render dipindah ke fungsi lokal `_renderDataHealth(issues)` dan dipanggil SEKALI tepat sebelum `openModal('dataHealthModal')`. Isi semua cek, urutan push, teks, dan nilai kembalian TIDAK diubah. Dampak: cek S2818-S2820, kategori servis orphan, dan preorder orphan kini tampil di modal beserta tombol perbaikannya; ringkasan tidak lagi "sehat" palsu. Komentar "WAJIB di atas blok render" pada blok Tahap 4 dihapus.
14. Urutan tampil: error di atas peringatan (salinan terurut; nilai kembalian TIDAK diurutkan ulang). Peringatan sejenis (judul sama) dikelompokkan berdekatan.
15. Ringkasan memuat baris "Rincian: <jenis temuan> (jumlah) · ..." (maks 8 jenis) bila ada >= 2 jenis temuan.
16. Tampilan bertahap: grup PERINGATAN dengan > 5 kartu (DH_COLLAPSE_MIN) diciutkan di bawah satu tombol "<judul> · N temuan — Lihat detail". Keputusan keamanan: (a) SEMUA kartu tetap ada di DOM, hanya atribut `hidden` (4 self-test + tes lama membaca dataHealthList.innerHTML); (b) tanpa batas jumlah kartu, tidak ada temuan yang hilang dari layar; (c) error tidak pernah diciutkan; (d) state buka/tutup di luar render, bertahan saat aksi perbaikan memanggil ulang runDataHealthCheck() selama modal terbuka, reset saat modal tertutup; (e) DataHealth.toggleGroup(idx) murni DOM+state — tidak rescan, tidak openModal; pakai data-action (sudah window-expose), tanpa inline handler; (f) objek issue & nilai kembalian tidak berubah.
17. Batas kartu per grup (DH_GROUP_CAP=100, hanya PERINGATAN, hanya tampilan): grup dengan > 100 kartu merender 100 pertama + catatan "Menampilkan 100 dari N temuan jenis ini. Perbaiki yang tampil lalu pindai ulang untuk melihat sisanya." (ikut ciut bersama grup). Nilai kembalian runDataHealthCheck(), jumlah di tombol header, dan hitungan ringkasan tetap LENGKAP; error tidak pernah dibatasi. Ukur sintetis: 3.001 temuan -> DOM 1,7 MB turun jadi 177 KB. Catatan: sisa di atas 100 terjangkau setelah yang tampil diperbaiki lalu modal dipindai ulang (aksi perbaikan otomatis memindai ulang).
Tes baru: tests/data-health-check-render-semua-temuan.test.js (7 tes) dan tests/data-health-check-tampilan-bertahap.test.js (7 tes); tes baru RED pada versi sebelumnya, hijau sesudahnya.
Verifikasi (TZ=UTC, app-main__16_ + patch): base 9.954 tes/33 gagal; akhir 10.004 tes/33 gagal, nama gagal IDENTIK dgn base (bundle/freshness). verify-no-inline-handlers PASS; verify-window-expose OK.
Catatan rilis: aksi perbaikan di modal (pembulatan nominal, tautkan log kendaraan, dll.) kini terjangkau pengguna untuk pertama kali; semuanya memakai konfirmasi, tetapi sarankan backup dulu.
### Uji browser nyata Tahap 5 (Chromium headless, viewport HP 390px, bundle dibangun ulang di SALINAN; data sintetis: 120 servis orphan, 2 error kategori kendaraan lain, 7 preorder orphan, 1 nominal pecahan, 2 kendaraan)
Skrip: e2e/run-e2e-data-health-bertahap.js (prasyarat: node scripts/build.js). Hasil: 19/19 lolos, tanpa error JS/console.
- Modal terbuka lewat jalur produksi (ensureDataHealthScripts + runDataHealthCheck); ringkasan "2 error & 130 peringatan" (bukan "sehat"); error di atas; 2 tombol header grup.
- Cap: 112 kartu di DOM (100 dari 120 + catatan "Menampilkan 100 dari 120..."); awal hanya 5 kartu terlihat, 107 hidden.
- Ketukan nyata pada header: buka -> 7 kartu terlihat, aria-expanded=true; ketuk lagi -> ciut. Dispatcher data-action ter-resolve (tanpa toast "belum berfungsi").
- Aksi perbaikan nyata "Bulatkan nominal" (kini terjangkau): kartu hilang, nominal 1000,5 -> 1001, modal tetap terbuka, grup yang dibuka tetap terbuka, grup yang tidak dibuka tetap ciut.
- Tutup lalu buka ulang: semua grup ciut lagi. Render ulang 131 temuan 24-44 ms. Tanpa overflow horizontal di 390px.
Belum: posisi scroll tepat setelah toggle tidak di-assert (hanya diperiksa visual); belum diuji di Android/TWA; bundle di ZIP ini belum dibangun ulang (jalankan scripts/build.js).

## Tahap 6 — uji browser menyeluruh + perbaikan lencana akun (diakumulasikan, v9)
18. modules/shared/modules-render.js — lencana kartu akun "Memuat dana klien (tidak termasuk saldo pribadi)" kini hanya tampil bila dana klien tertahan > 0 (saldoKlienRingkasSafe().tertahan). Sebelumnya tetap tampil setelah laba dicairkan penuh (tertahan = 0). Hanya tampilan; tanpa perubahan logic/SOT/data.
Tes baru: tests/dana-proyek-lencana-akun-tertahan.test.js (2).
Verifikasi (TZ=UTC, app-main_16 + patch): 10.024 tes, 2 gagal = ada juga di baseline (modules/modals.js orphan, DELETE-FILES); 29/29 tes dana-proyek; verify-window-expose OK; build lolos.
Uji browser nyata (Chromium, 360/390/412/desktop 1280): skenario klien 47/47, tanpa proyek klien 6/6, sapuan ±200 tombol di 8 halaman tanpa error. Skrip: e2e/dana-proyek-browser/ (ROOT=<repo> SHOTS=<dir> TAG=hp|desktop MODE=client|plain node full.js).
Catatan terbuka (tidak diubah): Hub "Saldo Semua Akun" memakai saldo pribadi (perilaku baseline) sedangkan Akun/Laporan fisik + catatan; id dashAccTotal tidak ada di DOM Hub.
Belum: Android/TWA/perangkat nyata; bundle produksi belum dibangun ulang di ZIP ini (jalankan scripts/build.js).

## Tahap 7 — catatan dana klien di Dashboard Hub (v10, menutup catatan terbuka Tahap 6)
19. modules/finance/akun.js — helper baca-saja catatanHubSaldoKlienSafe(anchor): bila ada dana klien tertahan > 0, tambah satu baris kecil di bawah angka hero Hub "Belum termasuk dana klien tertahan X · Saldo fisik Y"; dibuat sekali, diperbarui, dihapus bila 0/tanpa proyek klien. Angka hero (saldo pribadi) TIDAK diubah.
20. modules/dashboard-hub/dashboard-hub.js — 1 baris pemanggilan di render() dgn guard typeof (tanpa mesin/proyek klien: tidak ada efek). Render ulang setelah mesin lazy-load sudah ditangani ensureKlienEngineSafe().
Tes baru: tests/dana-proyek-hub-catatan.test.js (4). Verifikasi: 10.028 tes, 2 gagal = ada di baseline; verify-window-expose OK; no-inline-handlers PASS; lint 0 error.
Browser (360/390/desktop 1280): skenario klien 49/49 (catatan Hub tampil 800.000/3.300.000, hilang setelah pencairan penuh), tanpa proyek klien 7/7.
Catatan: id dashAccTotal di catatan Tahap 2 memang tidak ada di DOM Hub; dashboard memakai dashHubHeroSaldo (pribadi) + catatan baru ini.
