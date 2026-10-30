# AUDIT S2728 — Verifikasi data nyata, sumbu aksi, matcher tunggal, jalur AI

Data: backup-keluarga-W-2026-10-18.json (110 log servis, 244 kategori, 5 kendaraan). Engine asli dijalankan di Node (modul sumber asli, tanpa browser).

## Perubahan kode (di atas S2727/v2)
1. `ai-chat.js` — status interval AI memakai `computeServiceUrgency` (SOT yang sama dgn kartu Pengingat) lewat fungsi baru `aiServiceIntervalStatusText`. Sebelumnya: `getLastServiceKmForCat(v.id,cat)` tanpa filter aksi (log periksa/bersih/tanpa actionType dianggap reset), memakai semua kategori semua kendaraan, dan hitung sisa km sendiri.
2. Tes baru `tests/s2728-real-data-matcher-axis-ai-regression.test.js` (9 tes perilaku; 5 di antaranya gagal pada baseline tanpa patch).
3. `tests/s2601-riwayat-pengingat-sot-dan-keyboard.test.js` — dua asersi diperbarui: tes lama menegaskan log hanya-induk (teks bebas) dihitung untuk kartu berkomponen; itu persis perilaku yang dilarang aturan T2.
4. `FILE-HASHES-SHA256.txt` disegarkan; bundle dibuat ulang.

## Hasil replay Vario 125 (odometer = km log terbesar = 21.311)
Perubahan status akibat patch (baseline app-main(39) -> v3): Busi terlewat 5.600 -> aman 20.237; V-Belt CVT aman 14.867 -> aman 7.608; Kampas Kopling Ganda aman 14.867 -> aman 5.500; Seal Driven Face aman 14.867 -> belum diketahui. Kategori lain tidak berubah.
Target audit lama TIDAK seluruhnya terreproduksi pada backup ini (lihat laporan).

## Lampiran: audit di browser sungguhan (Chromium, backup disuntik ke kw_v4)
- Kebocoran log teks bebas -> kategori berkomponen (Vario 125): baseline 31 pasang, v3 0.
- Log yang cocok ke >3 kategori: baseline 8, v3 1 ("Pembersihan Rem" km 15.917; sah, 6 baris komponen eksplisit).
- Kebocoran antar kendaraan: 0. Baseline dari log tanpa actionType: 0.
- Kartu Pengingat (DOM): baseline 13 Terlewat/1 Mendekati/13 Aman/12 Belum diketahui; v3 12/1/13/13.
- Cacat ditemukan di browser & diperbaiki: pool AI memakai D.sparepartCats mentah (8 nama lama berlebih, 5 nama kanonik hilang). Kini memakai pool yang sama dgn kartu Pengingat: 39 = 39 kategori, 0 selisih status.
