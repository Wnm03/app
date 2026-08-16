# Patch v2: Saran "Self Reward" (Saldo Bersih) + Tombol "Titipan" (Quick Action)

Patch ini ngegabung 2 perubahan kecil di Dashboard:

## 1) Saran Self Reward di kartu "Saldo Bersih" (sudah ada di patch v1)
Kartu Saldo Bersih (Beranda → baris Analytics) sekarang punya 2 kondisi:
- **Negatif** — perilaku lama, tidak berubah: badge "⚠️ Kurang" + saran kurangi
  pengeluaran non-wajib.
- **Positif & sehat (baru)** — kalau kondisi keuanganmu memenuhi semua syarat
  (budget aman, cashflow positif, dana darurat & target investasi tercapai,
  tidak ada utang/tagihan macet — dicek lewat modul `SelfReward` yang sudah
  ada), muncul badge hijau "🎉 Layak Reward" + saran nominal reward yang bisa
  diambil.

## 2) Tombol "Titipan" ngisi sela kosong di baris Quick Action (BARU)
Kamu benar — baris tombol di bawah Hero Card (Transaksi / Riwayat / Cari
Fitur / AI) itu di-grid untuk **5 kolom**, tapi cuma 4 tombol yang dipasang,
jadi ada 1 sela kosong di sebelah kanan tombol AI.

Sela itu sekarang diisi tombol **"💼 Titipan"** yang membuka langsung ke
**Keuangan → Laporan → tab Dana Titipan** (dipilih karena ini fitur yang
sering perlu dicek cepat — pokok, alokasi per pemilik, & pengembalian dana
titipan — dan sebelumnya cuma bisa diakses lewat beberapa langkah navigasi).
Navigasinya reuse penuh `dashHubNavigateToFeature()` + target yang sama
persis dengan entri "Dana Titipan" di menu pencarian fitur — 0 logic baru.

Kalau kamu mau slot itu diisi fitur lain (mis. "Target Keuangan", "Tagihan
Jatuh Tempo", dsb), gampang — tinggal ganti target di
`dashHubQaDanaTitipan()` (`modules/shared/action-wrappers.js`) sesuai fitur
yang kamu mau, atau bilang mau apa dan saya buatkan patch berikutnya.

## File yang diubah (source, "perbaikan" sebenarnya)
- `modules/dashboard-hub/dashboard-hub.js` — logic kartu Saldo Bersih
- `modules/shared/action-wrappers.js` — handler `dashHubQaDanaTitipan()`
- `index.html` — markup tombol ke-5 di `.dashhub-qa-row`
- `styles.css` — 3 baris class CSS baru (varian hijau, reuse token warna
  yang sudah ada)

## File lain di patch ini (hasil build, biar tinggal upload)
Karena app ini di-serve dari bundle (bukan file source langsung), disertakan
juga hasil `node scripts/build.js` versi 1369:
- `app-bundle-a.min.js`, `app-bundle-b.min.js`
- `index.html`, `app_production.html` (query `?v=1369`)
- `sw.js` (`CACHE_NAME` → `kw-cache-v1369`)

## Cara pasang
1. Timpa 8 file di atas di repo/hosting kamu (pertahankan struktur folder
   `modules/dashboard-hub/` & `modules/shared/`).
2. Commit & push SEMUA file yang berubah (bundle-nya juga, bukan cuma
   HTML/sw.js — itu yang beneran memuat kode barunya).
3. Hard refresh / clear cache browser (biar service worker lama nggak
   nyangkut versi file lama).

## Status pengujian
`npm test` (4505 test) — semua lolos, tidak ada regresi. Kedua perubahan
murni tambahan (guard `typeof` + reuse fungsi yang sudah ada), tidak
mengubah kalkulasi/behavior lama.
