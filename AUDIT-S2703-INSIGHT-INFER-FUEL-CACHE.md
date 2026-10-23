# AUDIT S2703 — Sisa waktu tab Insight (infer katalog & hitungan BBM) + uji alur tulis data besar

Tanggal: 23 Okt 2026 · Baseline: `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`
Akumulasi: S2653 + S2701 + S2702 + perbaikan S2703 ini. Build: `s2595-carnotes-null-interval-guard-2657`.

## Metode uji (Chromium headless 390×844, Playwright)
- Data sintetis deterministik: 25.000 transaksi, 1.800 log BBM, 1.200 log servis, 3 kendaraan (JSON ±5 MB), disimpan lalu reload.
- Alur tulis lewat UI (`openTxModal` → isi → `saveTx`), 3x data kecil dan 5x data besar; persistensi dicek setelah reload.
- Profil CPU (CDP Profiler) + instrumentasi jumlah panggilan fungsi.

## Temuan
| ID | Prioritas | Modul | Ringkasan |
|----|-----------|-------|-----------|
| S2703-P1-1 | P1 | `modules/vehicle/service-input-catalog.js` | `infer()` 13.600x/render, normalisasi 102 nama tiap panggilan (±49 ms). |
| S2703-P1-2 | P1 | `modules/vehicle/vehicle-core.js` | `estimateKmPerDay` 18x, `getFuelFullTankSegments` 33x, `fuelEfficiency` 15x per render; sort dgn `new Date` di komparator + filter bersarang. |
| S2703-P2-1 | P2 (belum dikerjakan) | jalur simpan | Dengan 25 rb transaksi, tutup modal simpan 400–750 ms: `getCachedTxDateMs` ±164 ms, rantai `goalSourceFI→annualExpense→targetNominal` ±156 ms, `_buildSaveJson` ±94 ms, snapshot `JSON.stringify(D)` di `_saveTxInner` ±85 ms, `predictService` via decision engine ±206 ms. |
| S2703-P3-1 | P3 | `servisLogMatchesCat` | Masih 25.600 panggilan/render (±35 ms setelah perbaikan). Kandidat sesi berikut. |

Catatan: dengan data kosong, sinkron tab Insight di mesin uji ini hanya 5–7 ms; sisa ±120 ms dari S2702 tidak terreproduksi pada data kosong dan cocok dengan biaya yang bergantung data di atas.

## Hasil terukur (browser yang sama, data besar)
| Metrik | Sebelum | Sesudah |
|--------|---------|---------|
| Insight sinkron (pertama) | 118–156 ms | ±66 ms |
| Insight sinkron (berikutnya) | 96–129 ms | 46–54 ms |
| `infer` total/render | ±49 ms | ±4 ms |
| Alur tulis: persistensi setelah reload | 3/3 dan 5/5 | 3/3 dan 5/5 |
| Error JS | 0 | 0 |

## Kontrak
Tidak ada perubahan API, urutan pencocokan (nama persis → keyword), pemilihan pertama-cocok, bentuk hasil, maupun SOT. Cache `infer` bersifat internal modul (invalidasi: referensi array groups, jumlah grup, referensi+panjang items tiap grup). Memo BBM memakai `kwScopeMemo` yang sudah ada (hidup hanya dalam satu render sinkron, dibuang saat `save()`).
Batasan: ubah-di-tempat field `name` item katalog tanpa mengubah array/panjang tidak terdeteksi cache `infer` (katalog generated/statis, tidak ada penulis runtime).

## Rollback
Kembalikan `modules/vehicle/service-input-catalog.js` dan `modules/vehicle/vehicle-core.js` dari baseline, jalankan `npm run build`, lalu `python3 scripts/refresh-file-hashes.py --write`.
