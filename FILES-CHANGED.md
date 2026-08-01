# Files changed — Sesi 332: Update Baseline docs/AUDIT_MATRIX.md

## Isi

- `docs/AUDIT_MATRIX.md` — tabel "Coverage Baseline" diperbarui ke angka repo
  sungguhan: Total files 625→629, JavaScript 474→475, Markdown 137→140,
  Module families "13+"→12 (eksak, dari isi `modules/*`). Tests/HTML/JSON/CSS
  tidak berubah (181/3/2/2).
- `CHANGELOG.md`, `docs/CHECKPOINT.md` — entry Sesi 332
- `index.html`, `app_production.html`, `sw.js` — `?v=` naik ke 993 (rebuild,
  karena S331 dijalankan lebih dulu lalu S332 di atasnya — lihat catatan)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — REGENERASI (build ulang,
  0 perubahan logic — cuma bump versi konstan ikut S331→S332)
- `modules/shared/modules-render.js`, `modals.js`, `modules-calc.js`,
  `chat-action-handlers.js`, `features-helpers-global-security.js` —
  hanya bump konstanta versi
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis
- `backups/` — 4 file (backup bundle S330 & S331, dibuat otomatis oleh
  `node scripts/build.js` selama 2x run berurutan S331→S332)

**0 perubahan kode/logic aplikasi** — patch ini murni dokumentasi
(AUDIT_MATRIX.md) + efek samping wajib dari menjalankan `node scripts/build.js`
ulang (bump versi + regenerasi bundle/dokumen auto-generate).

## Verifikasi

```
node --test tests/*.test.js
# tests 2054 / pass 2054 / fail 0   (sebelum & sesudah update baseline)

node scripts/build.js s332-update-baseline-audit-matrix
# ✅ Build selesai, ?v=993
# Peringatan "docs/AUDIT_MATRIX.md kemungkinan sudah usang" — SUDAH HILANG
# dari output build (baseline sekarang sinkron dgn repo sungguhan).
# Sisa 1 peringatan non-fatal yang TIDAK terkait patch ini: 5 file source
# lewat ambang 1600 baris (business-flow-presenter.js, build.js,
# modules-render.js, aset.js, scan-ocr.js) — kandidat dipecah, di luar scope.
```
