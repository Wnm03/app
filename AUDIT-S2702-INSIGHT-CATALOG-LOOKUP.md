# AUDIT S2702 — Tab Insight Beranda lambat (lookup katalog servis)

Tanggal: 23 Okt 2026 · Baseline: `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
Akumulasi: patch S2653 (`d05d6c17…b692b6`) + patch S2701 (`7434c447…cb94`) + perbaikan S2702 ini. Build: `s2595-carnotes-null-interval-guard-2656`.

## Temuan
| ID | Prioritas | Modul | Ringkasan |
|----|-----------|-------|-----------|
| S2702-P1-1 | P1 (performa di alur yang sering dipakai) | `modules/vehicle/service-category-sot-reconciliation-s2007.js` | Membuka sub-tab Insight Beranda memblokir main thread 355–421 ms (data kosong). |
| S2702-P2-1 | P2 (gate lint) | `modules/shared/pwa-ux-performance.js:595` | `NodeFilter` no-undef → `npm run lint` 1 error (baseline 0). Berasal dari patch S2653. |

## Bukti browser (Chromium headless, viewport 390×844, data kosong, ukur ulang 3x)
- Profil CPU: 1 fungsi anonim di `app-bundle-b.min.js` baris 202 = 354 ms dari ±380–460 ms.
- Instrumentasi: `ServiceInputCatalog.groups()` dipanggil 3.009x per sekali buka tab; 2.958x lewat `catalogById()`/lookup per-id. `groups()` sendiri murah (±2 ms total) dan mengembalikan referensi yang sama; biayanya ada pada `flatMap` + `Object.assign` 102 item di setiap panggilan.
- Rantai pemanggil: `getMaintenanceConditionProjection` → `_predictServiceImpl` → `categoryIdentity` → `catalogById`/`exactNameCandidates` → `catalogItems()`.

## Akar masalah
`catalogItems()` mengalokasikan ulang seluruh katalog (13 grup / 102 item, satu salinan `Object.assign` per item) pada SETIAP lookup. Pemanggil melakukan lookup per kategori × per kendaraan → ±300 ribu alokasi objek per render.

## Perbaikan (refactor murni, bukan perubahan perilaku)
- Snapshot + indeks `id` dan `nama` (ternormalisasi) dibangun sekali; dipakai ulang selama "bentuk" katalog sama.
- Invalidasi otomatis: signature = referensi array `groups()`, jumlah grup, referensi + panjang `items` tiap grup (13 langkah). Penggantian array, `push` in-place, dan grup baru terdeteksi (diuji).
- Setiap pemanggil tetap menerima SALINAN BARU, jadi mutasi hasil tidak mencemari panggilan berikutnya (diuji).
- Jalur tak-terduga (groups() bukan array, items bukan array, `groups()` melempar, item null) memakai jalur tanpa cache dengan perilaku lama (`[]`/`null`).
- Tidak ada perubahan API (`catalogItems`, `catalogById`, `exactNameCandidates`, dll. sama), urutan resolver (explicit id → exact-name), pemilihan pertama-cocok, bentuk/urutan field item, maupun SOT.
- Batasan yang diketahui: perubahan field item di tempat (mis. `item.name = ...` pada master) TANPA mengubah array/panjang tidak terdeteksi. Master katalog bersifat generated/statis (`service-master-data.generated.js`) dan tidak ada penulis runtime (grep S2702); jika kelak ada, panggil ulang dengan array baru atau tambahkan invalidasi eksplisit.

## Hasil terukur (browser yang sama, 390×844, 3 ulangan)
| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Tab Insight, sinkron (pertama) | 355 / 363 / 434 ms | 119 / 121 / 126 ms |
| Tab Insight, sinkron (berikutnya) | 328–346 ms | 33–47 ms |
| Long task audit navigasi 390×844 / 360×640 / 1280×800 | 421 / 378 / 385 ms | 81 / 70 / 60 ms |
- Error JS 0 dan scroll horizontal 0 di 390×844, 360×640, 1280×800 setelah perubahan. Sisa waktu pertama ±120 ms belum diselidiki.

## SOT-AND-FUNCTION-CONTRACT (domain tersentuh)
| Domain | Sumber kanonis | Resolver | Pembaca | Penulis | Tes penjaga |
|--------|----------------|----------|---------|---------|-------------|
| Katalog komponen servis | `SERVICE_CHECKLIST_GROUPS` (`service-master-data.generated.js`) via `ServiceInputCatalog.groups()` | `categoryIdentity`: explicit `serviceComponentId` → exact-name unik → ambigu → none | `servis-b.js`, `sparepart-servis-b.js`, `vehicle-catalog-*-sot.js`, reminder/Insight | tidak ada penulis runtime | `tests/s2702-catalog-lookup-cache.test.js`, `tests/service-category-sot-reconciliation-s2007-s2008.test.js` |
Kontrak tidak berubah; cache hanya detail implementasi internal modul.

## Rollback
Kembalikan `modules/vehicle/service-category-sot-reconciliation-s2007.js` dari baseline (atau `tests/fixtures/s2007-reference-original.js`), jalankan `npm run build`, lalu `python3 scripts/refresh-file-hashes.py --write`.
