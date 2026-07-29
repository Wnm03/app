# SESSION_RULES.md — Aturan kerja permanen (Implementation Mode)

Ini SUMBER KEBENARAN TUNGGAL untuk urutan kerja tiap sesi lanjutan
project ini. `docs/CLAUDE.md` (bagian "SESSION WORKFLOW & RECOVERY
MODE") berisi ringkasan yang WAJIB tetap sinkron dgn file ini — kalau
ada perbedaan, file ini yang berlaku.

Ditambahkan Sesi 22 (2026-07-18), atas permintaan eksplisit user
("IMPLEMENTATION MODE" — lanjutkan project existing, bukan Architect).

## Update Sesi 26 — LDOS (LifeOS Developer Operating System)

Mulai chat baru, baca `docs/README_DEVELOPER.md` dulu — itu entry
point urutan baca dokumen yang benar (`SESSION_RULES.md` →
`PRODUCT_DECISIONS.md` → `PROJECT_STATE.md` → `NEXT_SESSION.md` →
`CLAUDE.md`). Isi di bawah ini (aturan Sesi 22, khusus track **Smart
AI**) TETAP BERLAKU PENUH, tidak berubah/dihapus — tapi sekarang project
punya 2 track paralel:

- **Smart AI & Smart Logistics** — aturan di bawah ini, source of
  truth `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md`, scope lihat
  `docs/AI_SCOPE.md`.
- **LifeOS** — source of truth `docs/PROJECT_STATE.md` § LifeOS, scope
  lihat `docs/LIFEOS_SCOPE.md` (mulai dikerjakan Sesi 24-25, di luar
  log `docs/CLAUDE.md` bagian lama).

Kalau target sesi dari track LifeOS, "Source of truth" & "Target sesi"
di bawah ini (yang ditulis utk Smart AI) diganti acuannya ke
`docs/PROJECT_STATE.md`/`docs/LIFEOS_SCOPE.md` — urutan SESSION
WORKFLOW (baca → implement → test → full test → build → ZIP → docs →
STOP) dan RECOVERY MODE tetap sama persis utk kedua track. Keputusan
produk permanen (kedua track) ada di `docs/PRODUCT_DECISIONS.md` —
dokumen baru ini WAJIB dicek sebelum menganggap sebuah TODO "butuh
keputusan produk, tanya user dulu" (3 blocker Smart AI yang dulu
dicatat "buntu" di sesi-sesi lama SUDAH terjawab di sana per Sesi 26).

## Peran

Software Engineer yang MELANJUTKAN project existing:
- Jangan menjadi Architect / membuat desain baru.
- Jangan melakukan audit ulang seluruh project.
- Gunakan project existing sebagai source of truth.

## Source of truth (WAJIB dibaca sebelum apa pun)

- `docs/CLAUDE.md`
- `IMPLEMENTATION_STATUS.md`
- `ROADMAP.md`
- `TODO.md`

## Target sesi

Kerjakan HANYA SATU prioritas tertinggi yang belum selesai, sesuai
urutan tahap:

1. Tahap 2 — Integration
2. Tahap 4 — AI Decision
3. Tahap 5 — AI Daily Briefing
4. Tahap 6 — AI Learning
5. Tahap 7 — AI Simulation
6. Tahap 8 — AI Health Check

Kalau prioritas itu terlalu besar utk 1 sesi, pecah jadi pekerjaan
terkecil yang bisa selesai dalam SATU sesi (contoh Sesi 22: Tahap 2
dipecah ke sub-item "Registry" saja, bukan seluruh Tahap 2).

## Rule implementasi

- Jangan refactor besar.
- Jangan membuat arsitektur baru.
- Jangan duplicate function.
- Jangan duplicate storage.
- Jangan duplicate event.
- Gunakan struktur project yang sudah ada.
- Selalu backward compatible.
- Jangan mengerjakan TODO berikutnya di sesi yang sama.

## SESSION WORKFLOW (urutan kerja wajib)

1. Baca `docs/CLAUDE.md`.
2. Baca `IMPLEMENTATION_STATUS.md`.
3. Baca `ROADMAP.md`.
4. Baca `TODO.md`.
5. Kerjakan hanya TODO prioritas nomor 1.
6. Jalankan test (`node --test tests/*.test.js`).
7. Build project (`node scripts/build.js`).
8. Setelah build sukses, WAJIB membuat ZIP terlebih dahulu.
9. Tampilkan link download ZIP.
10. Baru update seluruh dokumentasi.
11. STOP.

## RECOVERY MODE

Jika sesi terputus karena kuota:

- Jangan mengulang analisis.
- Jangan mengulang implementasi yang sudah selesai.
- Jangan mengulang test jika tidak ada perubahan kode.
- Jangan mengulang build jika build terakhir masih valid.
- Lanjutkan dari checkpoint terakhir.
- Prioritaskan membuat ZIP apabila belum dibuat.
- Setelah ZIP selesai, baru update dokumentasi.
- Jangan mengerjakan fitur baru sampai sesi sebelumnya benar-benar
  selesai.

## Kalau kuota chat hampir habis

- Jangan memulai pekerjaan baru.
- Jangan menjalankan audit ulang.
- Jangan mengulang test yang sudah lulus.
- Jangan mengulang build yang sudah berhasil.
- Buat ZIP terlebih dahulu.
- Update dokumentasi jika masih ada sisa kuota.

## Format catatan sesi (WAJIB, di `docs/CLAUDE.md` per sesi)

- Nomor sesi
- Tanggal
- Target
- File yang diubah
- Hasil test
- Hasil build
- Progress
- Next TODO
- Known Issue

## Struktur dokumentasi

```
docs/
├── README_DEVELOPER.md       ← BARU Sesi 26 — mulai baca dari sini
├── SESSION_RULES.md          ← Aturan kerja permanen (file ini)
├── PRODUCT_DECISIONS.md      ← BARU Sesi 26 — keputusan produk final, cek dulu sebelum tanya user
├── PROJECT_STATE.md          ← BARU Sesi 26 — ringkasan progress 2 track
├── NEXT_SESSION.md           ← BARU Sesi 26 — target & checkpoint sesi berikutnya
├── BATCH_PLAN.md              ← BARU Sesi 43 — pengelompokan sesi ke Batch (lapisan penomoran di atas alur kerja ini, TIDAK mengubah aturan di file ini)
├── CHECKPOINT.md             ← BARU Sesi 26 — status granular current-step
├── IMPLEMENTATION_POLICY.md  ← BARU Sesi 26 — aturan additive/reuse/no-duplicate
├── ZIP_RULES.md              ← BARU Sesi 26 — urutan wajib build→ZIP→docs
├── AI_SCOPE.md                ← BARU Sesi 26 — batas scope Smart AI
├── LIFEOS_SCOPE.md           ← BARU Sesi 26 — batas scope LifeOS
├── WORKFLOW.md                ← BARU Sesi 26 — diagram alur kerja
├── CLAUDE.md                 ← Riwayat sesi (log lengkap, paling panjang)
├── IMPLEMENTATION_STATUS.md  ← (di root repo, bukan di docs/) Progress per tahap [Smart AI]
├── ROADMAP.md                ← (di root repo) Checklist roadmap [Smart AI]
├── TODO.md                   ← (di root repo) Prioritas berikutnya [Smart AI]
```

Catatan: `IMPLEMENTATION_STATUS.md`/`ROADMAP.md`/`TODO.md` ada di ROOT
repo (bukan di dalam `docs/`) — sudah begitu sejak sebelum Sesi 22,
TIDAK dipindah di sesi ini supaya semua link/referensi relatif yang
sudah ada di dokumen lain tetap valid (backward compatible, hindari
refactor besar sesuai rule di atas).
