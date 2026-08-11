# STALE-DOC-SCHEDULE.md — Jadwal audit dokumen basi (BARU Sesi 428)

Ditambahkan Sesi 428 (rencana perbaikan item ke-6, setelah S423-S425:
lint gate window.expose, release gate lint/esbuild, dedup HTML). Latar
belakang: sebelum sesi ini, dokumen jadi basi hanya ketahuan "kalau
kebetulan ketemu" pas sesi lain sedang baca file terkait — tidak ada
jadwal rutin. `docs/AUDIT_MATRIX.md` sudah punya guard OTOMATIS
(`lintDocsBaselineCountDrift()` di `scripts/build.js`, jalan tiap build,
non-fatal) tapi itu HANYA cek 1 angka baseline di 1 file — dokumen prosa
lain (status/riwayat/keputusan) tidak ada guard otomatis sama sekali
(sulit diotomasi karena isinya bebas teks, bukan angka/label
terstruktur).

## Jadwal

**Audit manual setiap 20 sesi.** Cek: apakah "Current Session"/"status
terkini" yang diklaim dokumen di bawah masih cocok dengan versi/sesi
terbaru sungguhan (`APP_BUILD_VERSION` di
`modules/shared/features-helpers-global-security.js`, atau `FIX-*.md`
bernomor sesi tertinggi). Kalau tidak cocok, tandai basi (pola project
ini: `⚠️`/catatan "dokumen ini basi" + rujuk ke sumber kebenaran yang
benar — JANGAN hapus histori lama, cukup tandai).

**Sesi audit berikutnya jatuh tempo: Sesi 448** (428 + 20).

## Dokumen yang dicek tiap jadwal ini

| Dokumen | Kenapa rawan basi |
|---|---|
| `docs/CHECKPOINT.md` § Current Session | Judul menjanjikan "update tiap sesi/step" tapi tidak ada enforcement — terbukti basi Sesi 428 (lihat log di bawah). |
| `docs/PROJECT_STATE.md` | Ringkasan progress "update setiap sesi" — sama, tidak ada enforcement. |
| `docs/NEXT_SESSION.md` | Target sesi berikutnya — kalau basi, sesi baru bisa salah start dari target yang sudah lama selesai. |
| `docs/KNOWN-ISSUES.md` (root, Tahap 1-8 UI) | Audit Sesi 428: **sudah rapi**, tiap item basi sudah ditandai eksplisit ✅/dijelaskan "sengaja dibiarkan" — 0 tindakan perlu. |
| `docs/KNOWN-ISSUES.md` (docs/, Business Logic §6-16) | Audit Sesi 428: berisi log bug historis (termasuk yang sudah FIXED) — dipertahankan sbg jejak audit, BUKAN basi (bukan diklaim "current status", jadi tidak butuh update). |
| `docs/AUDIT_MATRIX.md` | SUDAH ada guard otomatis tiap build — tidak perlu masuk cek manual, cukup pastikan guard-nya masih aktif (lihat `scripts/build.js` § `lintDocsBaselineCountDrift`). |

`docs/CLAUDE.md` (log detail per sesi) SENGAJA TIDAK masuk jadwal
audit "basi vs tidak" — sifatnya append-only historis, jadi tidak pernah
"salah", cuma bisa "belum lengkap" (lihat temuan di bawah). Kelengkapannya
dicek terpisah, bukan bagian jadwal stale-doc ini.

## Log audit

### Sesi 428 (2026-08-06) — audit pertama

- ✅ **Entry point tunggal** (item rencana lain, bukan bagian
  jadwal ini): `docs/README_DEVELOPER.md` sudah eksplisit berisi
  "Urutan baca WAJIB di setiap chat baru" — sudah memenuhi kebutuhan,
  0 perubahan perlu.
- ✅ **`docs/KNOWN-ISSUES.md` (root)**: diaudit penuh (221 baris) — SEMUA
  item basi yang ditemukan SUDAH ditandai sendiri oleh sesi-sesi
  sebelumnya (✅ SELESAI + rujukan dokumen detail, atau eksplisit
  "sengaja dibiarkan" dgn alasan). 0 entri perlu dibuang/diperbaiki.
- ✅ **`docs/KNOWN-ISSUES.md` (docs/)**: diaudit penuh (344 baris, §6-16)
  — isinya log bug historis per sesi audit (beberapa FIXED, beberapa
  masih OPEN), bukan klaim "status saat ini" yang bisa basi — dipertahankan
  apa adanya sbg jejak audit.
- ⚠️ **`docs/CHECKPOINT.md`**: BASI — "Current Session" menunjuk
  `v1047` (Tahap 6 Generic Shop Engine), padahal repo sungguhan sudah
  `v1141` (Sesi 425). Ditandai eksplisit sesi ini (lihat catatan di atas
  judul § Current Session), histori TIDAK dihapus.
- ⚠️ **`docs/PROJECT_STATE.md`**: BASI — masih menyebut "per akhir Sesi
  50". BELUM ditandai/diperbaiki sesi ini (di luar scope 1-sesi-ringan
  S428 — butuh sesi terpisah utk merangkum ~375 sesi progress dgan
  benar, bukan sekadar tempel catatan basi seperti CHECKPOINT.md).
  **Rekomendasi sesi mendatang**: audit ulang penuh + tulis ringkasan
  baru dari `docs/CLAUDE.md`/`FIX-*.md` terbaru.
- ⚠️ **`docs/NEXT_SESSION.md`**: BASI — catatan sync teratas masih Sesi
  323. Sama seperti PROJECT_STATE.md, BELUM diperbaiki sesi ini (di luar
  scope), direkomendasikan utk sesi terpisah.
- ⚠️ **`docs/CLAUDE.md`**: log detail per sesi TIDAK LENGKAP — berhenti
  di **Sesi 396** (`v1098`), sedangkan sesi berjalan sudah sampai
  **Sesi 425+** (`v1141`) — ada gap ~29 sesi yang tidak terlog di sini
  (S397-S424 tidak dicek satu-satu apakah benar hilang total atau cuma
  tidak berurutan; TIDAK diaudit detail sesi ini, di luar scope). Ini
  BUKAN "basi" dalam arti isi salah — cuma belum lengkap. Backfill 29
  sesi log secara akurat butuh sesi terpisah (risiko tinggi kalau
  ditulis ulang dari ingatan/tebakan tanpa baca FIX-*.md tiap sesi
  aslinya satu per satu).
- ✅ **`docs/AUDIT_MATRIX.md`**: guard otomatis (`lintDocsBaselineCountDrift`)
  dikonfirmasi masih ada & aktif di `scripts/build.js` (baris ~1659,
  dipanggil dari daftar lint build). 0 tindakan perlu.

**Ringkasan sesi ini**: 1 dokumen ditandai basi langsung (CHECKPOINT.md,
perbaikan murah — cuma catatan penanda, bukan rewrite). 2 dokumen
(PROJECT_STATE.md, NEXT_SESSION.md) + 1 gap log (CLAUDE.md S397-424)
dicatat sbg technical debt dokumentasi utk sesi terpisah — di luar
lingkup "1 sesi ringan" yang diminta rencana perbaikan ini.

### Sesi 429 (2026-08-07) — tandai basi PROJECT_STATE.md/NEXT_SESSION.md

Lanjutan langsung dari 2 item yang S428 sengaja tunda (lihat log Sesi
428 di atas). **Rewrite ringkasan penuh (~377 sesi utk
PROJECT_STATE.md, ~105 sesi utk NEXT_SESSION.md) TETAP TIDAK dilakukan
sesi ini** — treatment yang diberikan sesi ini sama persis pola
`CHECKPOINT.md` S428: tandai basi eksplisit di atas judul + rujuk ke
sumber kebenaran (`APP_BUILD_VERSION`, `FIX-*.md` bernomor tertinggi),
konten historis dipertahankan.

- ⚠️→✅ **`docs/PROJECT_STATE.md`**: ditandai basi (catatan blok di atas
  judul, sama pola CHECKPOINT.md). Rewrite ringkasan penuh Sesi 51→428
  MASIH belum dikerjakan — direkomendasikan sbg sesi khusus terpisah
  (bukan "1 sesi ringan"), risiko tinggi kalau ditulis dari
  ingatan/tebakan tanpa audit `FIX-*.md` tiap sesi asli satu-per-satu.
- ⚠️→✅ **`docs/NEXT_SESSION.md`**: ditandai basi (catatan blok di atas
  judul), sekaligus diperbaiki 1 hal FUNGSIONAL (bukan cuma penanda):
  "Target sesi berikutnya yang BENAR-BENAR terkini" sekarang eksplisit
  merujuk S426 (kemungkinan blocked permanen)/S427 (audit guard-function,
  besar) — supaya sesi mendatang yang baca file ini TIDAK salah start
  dari catatan Sesi 323 yang sudah 105 sesi basi. Rewrite riwayat Sesi
  324→428 di bawahnya TETAP tidak dikerjakan (sama alasan
  PROJECT_STATE.md).
- Item lain dari log Sesi 428 (gap `docs/CLAUDE.md` S397-424, S426,
  S427) **TIDAK disentuh sesi ini** — tetap technical debt terbuka.

**Ringkasan sesi ini**: kedua dokumen yang tersisa dari log S428 kini
SUDAH ditandai basi (konsisten CHECKPOINT.md). Rewrite isi penuh
ketiganya (PROJECT_STATE/NEXT_SESSION/CLAUDE.md gap) tetap backlog
sesi terpisah — lihat rekomendasi masing-masing di atas.
