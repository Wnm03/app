# PATCH S2731 — Nama servis ↔ SOT komponen (build 2697)

## Akar masalah
`ServiceInputCatalog.infer()` mencocokkan nama dengan **substring mentah**:
- "Sasis & Kaki-**Kaki**" → **Aki** ("kaki" memuat "aki")
- "aki" → **Paking Knalpot** ("p**aki**ng" memuat "aki", dan item itu lebih dulu di urutan)

## Perbaikan kode
- `modules/vehicle/service-input-catalog.js`: exact match menang dulu, lalu containment **per kata utuh**. Tanpa fuzzy baru.
- Bundle a/b (diminify esbuild), index, app_production, sw, 5 file konstanta versi → build **2697** (baseline app-main_40 = 2694; draf sebelumnya salah memakai 2691 = downgrade, sudah dikoreksi).
- Tes baru `s2731-service-name-infer-wordboundary.test.js`; acuan beku `s2703` diselaraskan (tes itu mengunci perilaku substring lama).

## Perbaikan data (`data-fix/…-S2731-FIXED.json`, skrip: `scripts/fix-backup-service-sot-s2731.js`)
Additive: tidak ada baris dihapus, tidak ada id diubah, teks `item` log tidak diubah. Idempoten (jalan ke-2 = 0 perubahan). Checksum SHA-256 disegel ulang.

| Perbaikan | Jumlah |
|---|---|
| "Sasis & Kaki-Kaki" → kategori **Body & Kontrol** (tanpa komponen) | 2 baris |
| Kategori **Aki** khusus Vario 125 dibuat (`sp_component_aki_veh_1`, Kelistrikan) | 2 baris |
| Referensi Aki (log, checklist, jadwal, state, interval) dipindah dari Sasis ke Aki | 7 |
| Kategori diberi `serviceComponentId` (Pembersihan Rumah CVT, Kampas Rem Depan, Oli Gardan/Final Drive) | 3 |
| Judul grup basi diselaraskan ("Perawatan Berkala", "Sistem PGM-FI & Bahan Bakar", dll.) | 8 |
| Log: `serviceComponentNameSnapshot` = nama SOT (teks `item` asli tetap) | 21 |
| Log: `categoryId` kosong diisi / yatim diperbaiki (hanya jika kandidat unik) | 8 / 3 |

| **S2731.3** — master baru `gasket-tutup-head` (Servis Mesin, tanpa interval); log Seal Head (1783591790532) → `gasket-tutup-head`; Kabel Rem Belakang dikonsolidasi: `kabel-rem-belakang-body` jadi alias → `kabel-rem-belakang` | 1 log + master |
| **S2731.2** — Grmuk cvt → `pelumasan-cvt-grease`; Servis Cvt ×3 → `pembersihan-rumah-cvt`; Tutup Pully → `driven-face-cvt` (sesuai penjelasan pemilik data) | 5 |
| **S2731.1** — log dipetakan sesuai keputusan: Slidepiece ×2 → `slide-piece-cvt`, Pully → `driven-face-cvt`, Seal Kruk As → `kruk-as-bearing`, Korter Piston → `piston-ring`, ganti shock belakang → `shock-belakang` | 6 |
| **S2731.1** — Gasket Stator Base (1782820344534) dilepas dari komponen salah (checklist turunan dikosongkan; sama dgn log kembarannya) | 1 |

Lima stok di Sasis (Komstir Set, Bosh Engine Mounting, Shockbreaker Belakang, Bearing Roda Depan, Seal Roda Depan) tetap di Sasis & Kaki-Kaki.

Catatan: file backup asli **sudah tidak lolos checksum** sebelum patch (kemungkinan diedit setelah disegel). Hasil perbaikan lolos.

## Hasil uji
- Full test (`node scripts/run-full-test.js`, 32 shard), baseline app-main_40 + patch: **9274 tes, 9273 lulus, 0 gagal, 1 skip**.
- Tes baru `s2731-3-gasket-tutup-head-kabel-rem-alias` (7 tes): master tidak ganda, alias teresolusi, satu representasi aktif, Seal Head tertelusur & tanpa jadwal/baseline baru, 7 log tanpa padanan tidak berubah, skrip idempoten.
- 3 tes kontrak lama disesuaikan karena master memang berubah (jumlah per kategori servis-mesin 16 / body-kontrol 6, total tetap 102; universal 60 / unverified 12; checksum master disegel ulang). Tidak ada tes dilonggarkan.
- Build resmi `node scripts/build.js --require-minify`; `verify-bundle-freshness` & `verify-window-expose` OK.

## Keputusan yang butuh Anda (sengaja tidak disentuh)
1. **Sisa 7 log tanpa komponen SOT — tidak dipaksakan:** Gasket Stator Base ×2 (suku cadang katalog 11363KWN900, bukan komponen servis), **Seal Magnet (DITAHAN: belum jelas gasket cover magnet atau oil seal kruk as sisi magnet; butuh nomor/bentuk part)**, Jasa Pasang Stang Laher & Jasa Overhoul (jasa saja), Ban Dalam (riwayat sebelum tubeless), Pembersihan Rem (depan/belakang belum diketahui).
2. **Kabel Rem Belakang:** konsolidasi selesai di master (alias kompatibel). Stok 43450-KZR-600 sengaja TIDAK ditautkan otomatis ke komponen (butuh aturan relasi part–komponen eksplisit).
3. **7 kategori judul-grup lama** (Fast Moving & Fluida, CVT & Transmisi Otomatis, Pendingin, PGM-FI & Bahan Bakar, Kontrol & Kabel, Elektrikal, Body & Floor): jangan dihapus (dipakai sebagai kelompok stok). Pindahkan **16 jadwal reminder** yang masih bernaung di sana ke komponen kanonik (Oli Mesin, Filter Udara, Kampas Rem Depan/Belakang, Coolant, Kabel Gas, Aki, Grease CVT).
4. **31 id kategori ganda** (id sama dipakai beberapa kendaraan + 25 baris tanpa kendaraan). Risiko: edit di satu kendaraan bisa menimpa yang lain. Rekomendasi: sesi terpisah — id baru `sp_component_<komponen>_<vehicleId>` + remap semua referensi, disertai tes.
5. **Nama kategori kustom** ("Ban depan 80/90", "Kampas Rem", "ban", "Minyak rem"): biarkan sebagai label; identitas sudah lewat `serviceComponentId`. Khusus "ban" (Grandmax) → pisah Depan/Belakang.
6. **Teks `item` log berbeda dari nama SOT (24):** biarkan (riwayat asli); UI memakai snapshot SOT bila ada.

## Pasang
Salin isi ZIP ke repo (struktur sama). Restore backup: gunakan `data-fix/…-FIXED.json`.
