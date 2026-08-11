# FIX v1141 -> v1142 (s428) — Konsolidasi dokumentasi source-of-truth

## Konteks

Rencana perbaikan item ke-6 (terakhir dari daftar S423-S428; S426 E2E
smoke test & S427 audit guard-function di-skip dulu — S426 butuh install
browser via network yang tidak tersedia di sandbox ini, terkonfirmasi
lewat `npm install --dry-run` -> `E403`; S427 di luar scope "1 sesi
ringan" krn cakupannya ~150 titik pola `if(typeof fn==='function')fn()`
tersebar di puluhan file, butuh audit isi fungsi satu-per-satu).

Scope asli S428: (1) satu entry point eksplisit "baca urutan ini", (2)
audit `KNOWN-ISSUES.md` buang entri basi, (3) jadwal pengecekan
stale-doc berkala.

## Temuan sebelum implementasi

1. **Item (1) sudah terpenuhi** — `docs/README_DEVELOPER.md` (dari Sesi
   26) sudah eksplisit berisi "Urutan baca WAJIB di setiap chat baru".
   0 perubahan struktural perlu, cuma ditambah 1 baris rujukan ke
   deliverable baru sesi ini (lihat di bawah).
2. **Item (2) — `KNOWN-ISSUES.md` (root, 221 baris) sudah rapi**: semua
   entri basi SUDAH ditandai eksplisit oleh sesi-sesi sebelumnya (✅
   SELESAI + rujukan dokumen detail, atau "sengaja dibiarkan" dgn
   alasan). 0 entri perlu dibuang.
3. **Temuan BARU di luar 2 poin di atas** (ditemukan saat audit): 3
   dokumen lain justru BASI — `docs/CHECKPOINT.md` § Current Session
   menunjuk `v1047` (padahal repo sudah `v1141`), `docs/PROJECT_STATE.md`
   masih "per akhir Sesi 50", `docs/NEXT_SESSION.md` catatan teratas
   masih Sesi 323 — dan `docs/CLAUDE.md` (log per-sesi) berhenti di
   Sesi 396, ada gap ~29 sesi tidak terlog. Ini justru bukti hidup
   kenapa item (3) (jadwal berkala) diperlukan — dokumen2 ini
   menjanjikan "update tiap sesi" di judulnya sendiri tapi ternyata
   tidak konsisten diikuti.

## Perubahan

### 1. `docs/STALE-DOC-SCHEDULE.md` (BARU)

Jadwal audit manual tiap 20 sesi (jatuh tempo berikutnya: **Sesi 448**),
daftar dokumen yang dicek + kenapa rawan basi, dan log audit pertama
(temuan lengkap di atas, termasuk yang SENGAJA belum diperbaiki sesi ini
karena di luar scope "1 sesi ringan" — lihat § "Belum dikerjakan" di
bawah).

`docs/AUDIT_MATRIX.md` sengaja TIDAK masuk daftar cek manual — sudah
ada guard otomatis (`lintDocsBaselineCountDrift()` di `scripts/build.js`,
jalan non-fatal tiap build), dikonfirmasi ulang sesi ini masih aktif.

`docs/CLAUDE.md` sengaja TIDAK masuk kriteria "basi vs tidak" (sifatnya
append-only historis, tidak pernah "salah" cuma bisa "belum lengkap") —
gap-nya dicatat terpisah sbg temuan, bukan pelanggaran jadwal ini.

### 2. `docs/CHECKPOINT.md` — tandai basi (perbaikan murah)

Ditambah catatan eksplisit di atas § "Current Session" yang menjelaskan
blok itu basi (menunjuk `v1047`, bukan `v1141` terkini) + rujukan ke
`STALE-DOC-SCHEDULE.md`. Konten historis di bawahnya **TIDAK dihapus**
(pola konsisten dgn `KNOWN-ISSUES.md`: tandai, jangan hapus riwayat).

### 3. `docs/README_DEVELOPER.md` / `docs/SESSION_RULES.md` — rujukan

1 baris di masing-masing menunjuk ke `STALE-DOC-SCHEDULE.md`, +
peringatan eksplisit di `SESSION_RULES.md`: jadwal 20-sesi BUKAN
pengganti update rutin per-sesi, cuma jaring pengaman kalau update rutin
terlewat.

## Test

`node --test tests/*.test.js` -> **2868/2868 pass, 0 fail** — 0 test baru
sesi ini (murni perubahan dokumentasi `.md`, tidak ada logic/behavior
baru yang perlu digating test).

## Release Gate

`node scripts/verify-release-ready.js`:
- **Lint/Minify**: eslint/esbuild tidak tersedia (sandbox tanpa akses
  jaringan, konsisten dgn s424/s425) -> di-override manual. Perubahan
  sesi ini murni dokumentasi + 1 penanda komentar, 0 file `.js` source
  yang disentuh manual. Detail: `docs/RELEASE-GATE-LOG.md`.
- **html-sync**: lolos tanpa override.

## Build

`node scripts/build.js s428-doc-consolidation-stale-schedule` -> sukses,
`v1141` -> `v1142`.

## File yang berubah

- `docs/STALE-DOC-SCHEDULE.md` — BARU
- `docs/CHECKPOINT.md` — penanda basi ditambah, histori dipertahankan
- `docs/README_DEVELOPER.md` — 1 baris rujukan baru
- `docs/SESSION_RULES.md` — section baru "Audit dokumen basi"
- `docs/RELEASE-GATE-LOG.md` — 1 entri baru (append, otomatis)
- Konstanta versi (8 file source yang sama dgn s424/s425) naik ke
  `s428-doc-consolidation-stale-schedule`
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js` — hasil build ulang otomatis,
  `?v=1141` -> `?v=1142`
- `backups/` — 2 file backup bundle lama (otomatis oleh `build.js`)

## Belum dikerjakan / batasan yang diketahui (SENGAJA di luar scope sesi ini)

- `docs/PROJECT_STATE.md` & `docs/NEXT_SESSION.md` TIDAK diperbaiki
  isinya sesi ini (cuma dicatat basi di `STALE-DOC-SCHEDULE.md`) — kedua
  file itu butuh rangkuman ulang progress ~375 sesi yang akurat, bukan
  sekadar tempel 1 catatan "basi" seperti `CHECKPOINT.md` (yang cukup 1
  penanda krn kontennya spesifik 1 checkpoint lama, bukan ringkasan
  keseluruhan project). Rekomendasi: sesi terpisah khusus utk ini.
- `docs/CLAUDE.md` gap Sesi 397-424 TIDAK di-backfill — berisiko kalau
  ditulis ulang dari ingatan/tebakan tanpa baca `FIX-*.md` tiap sesi asli
  satu per satu. Rekomendasi: sesi terpisah, atau terima gap ini permanen
  (histori S397-424 tetap ada di `FIX-*.md` masing2, cuma tidak
  terkonsolidasi ke `CLAUDE.md`).
- **S426** (E2E smoke test Playwright/Puppeteer) & **S427** (audit pola
  guard `typeof fn==='function'`) — TIDAK disentuh sesi manapun sejauh
  ini (S423->S425->S428). S426 kemungkinan permanen terblokir di sandbox
  ini (butuh browser via network). S427 butuh sesi khusus (bukan "1 sesi
  ringan") krn cakupannya besar.
