# AUDIT S2704 — Memo `servisLogMatchesCat`

Baseline: `app-main (36)` SHA-256 `e907ea71dc49c1febae6e461bf604b70841d92b6b0363e326d21c9ddc76777a6`. Build: `s2595-carnotes-null-interval-guard-2658`.

| ID | Prioritas | Modul | Ringkasan |
|----|-----------|-------|-----------|
| S2704-P3-1 | P3 | `modules/vehicle/sparepart-servis.js` | `servisLogMatchesCat` ±25.600 panggilan/render Insight (±35 ms menurut profil S2703). Di-memo per (log, kategori) dalam render-scope. |

## Kontrak
Hasil boolean identik; memo hanya aktif di dalam `kwRenderScope`, dibuang saat scope selesai atau `save()` (`kwScopeInvalidate`). Argumen bukan objek memakai jalur lama. Tanpa perubahan API/SOT.
Batasan: mutasi `log`/`kategori`/`D` di tempat dalam satu render sinkron tanpa `save()` tidak terdeteksi (pola sama dengan memo S2288/S2703).

## Belum dikerjakan
- Jalur simpan data besar (S2703-P2-1): `getCachedTxDateMs`, rantai `goalSourceFI→annualExpense`, `_buildSaveJson`, snapshot `JSON.stringify(D)`.
- Cache `infer`: ubah-di-tempat `name` item katalog.
- Pengukuran browser S2704 (tidak ada Chromium di sandbox).

## Rollback
Kembalikan `modules/vehicle/sparepart-servis.js` dari baseline, `npm run build`, `python3 scripts/refresh-file-hashes.py --write`.
