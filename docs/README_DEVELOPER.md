# README_DEVELOPER.md — Mulai dari sini

Ini entry point LDOS (LifeOS Developer Operating System). Ditambahkan
Sesi 26 (2026-07-18), atas permintaan eksplisit user untuk membangun
sistem dokumentasi permanen supaya sesi baru bisa langsung lanjut kerja
tanpa audit ulang repo.

## Urutan baca WAJIB di setiap chat baru

1. `docs/SESSION_RULES.md` — aturan kerja & workflow permanen.
2. `docs/PRODUCT_DECISIONS.md` — keputusan produk yang SUDAH final,
   jangan tanya ulang kalau jawabannya sudah ada di sana.
3. `docs/PROJECT_STATE.md` — ringkasan progress semua track (Smart AI +
   LifeOS), build/test/ZIP terakhir.
4. `docs/NEXT_SESSION.md` — target sesi berikutnya, checkpoint, first
   action.
5. `docs/CLAUDE.md` — riwayat detail per sesi (log lengkap, paling
   panjang — baca bagian akhir/terbaru dulu kalau cuma butuh konteks
   sesi terakhir).

Setelah membaca kelima file itu, LANGSUNG bekerja — jangan audit ulang
seluruh project kecuali file di atas menyatakan ada bagian yang belum
pernah diaudit atau checkpoint menyebut audit diperlukan.

## Dokumen pendukung (dibaca sesuai kebutuhan, bukan wajib tiap sesi)

- `docs/AI_SCOPE.md` — batas scope Smart AI (Tahap 1-8).
- `docs/LIFEOS_SCOPE.md` — batas scope LifeOS.
- `docs/IMPLEMENTATION_POLICY.md` — aturan additive/reuse/no-duplicate.
- `docs/ZIP_RULES.md` — urutan wajib build → ZIP → dokumentasi.
- `docs/WORKFLOW.md` — diagram alur kerja ringkas (versi visual dari
  `SESSION_RULES.md`).
- `docs/CHECKPOINT.md` — status sesi paling granular (current step),
  dipakai kalau sesi terputus di tengah jalan.
- `IMPLEMENTATION_STATUS.md` / `ROADMAP.md` / `TODO.md` (di ROOT repo,
  bukan `docs/`) — detail per-tahap khusus track **Smart AI**, lihat
  `docs/AI_SCOPE.md`.

## Dua track paralel

Project ini punya 2 track independen yang TIDAK saling tumpang tindih:

| Track | Dokumen status | Dokumen scope |
|---|---|---|
| **Smart AI & Smart Logistics** | `IMPLEMENTATION_STATUS.md`, `ROADMAP.md`, `TODO.md` (root) | `docs/AI_SCOPE.md` |
| **LifeOS** | `docs/PROJECT_STATE.md` § LifeOS | `docs/LIFEOS_SCOPE.md` |

Satu sesi hanya mengerjakan SATU target dari SATU track. Jangan
mencampur pekerjaan dua track dalam satu sesi.
