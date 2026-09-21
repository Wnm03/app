# Akumulasi Patch — Audit Keuangan Cepat / Durasi Aktual

## Tujuan
Merapikan istilah UI yang sebelumnya memakai "Audit Keuangan 30 Menit". Angka 30 tetap dipakai untuk **periode 30 hari**, bukan durasi proses.

## Perubahan
- UI menjadi **Audit Keuangan Cepat**.
- Subketerangan tetap menjelaskan **30 hari terakhir**.
- Durasi audit diukur aktual dengan `performance.now()`; fallback `Date.now()`.
- Durasi ditampilkan sebagai `N ms` bila kurang dari 1 detik, atau `N,NN detik` bila minimal 1 detik.
- Dashboard Insight menampilkan durasi aktual.
- Audit detail/modal juga menampilkan `Waktu audit`.
- Nama action/ID internal `openFinancialAudit30Menit`, `renderFinancialAudit30Menit`, dan `financialAudit30Modal` dipertahankan agar kompatibel dengan wiring lama.
- Cache aplikasi dinaikkan dari **v1875 → v1876** agar browser/Service Worker mengambil bundle baru.

## Keputusan UI
Tidak menggunakan nama "Audit 30 Detik" karena itu akan menyiratkan target/SLA waktu eksekusi. Nama fitur menggambarkan fungsi, sedangkan waktu eksekusi ditampilkan sebagai metrik aktual.

## Verifikasi
- `node --check` presenter: PASS
- `node --check` dashboard hub: PASS
- `node --check` bundle B: PASS
- Referensi UI lama pada index/app_production/presenter/dashboard hub: tidak ditemukan.
- Test suite yang dibundel tidak dapat dijalankan di paket patch ini karena `tests/helpers/loadSource` tidak tersedia; ini dicatat sebagai keterbatasan paket, bukan dianggap PASS.
