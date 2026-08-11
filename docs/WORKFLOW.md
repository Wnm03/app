# WORKFLOW.md — Alur kerja ringkas (versi visual)

Ditambahkan Sesi 26 (2026-07-18). Versi diagram singkat dari
`docs/SESSION_RULES.md` — kalau ada beda isi, `SESSION_RULES.md` yang
berlaku.

```
READ
 (docs/SESSION_RULES.md → docs/PRODUCT_DECISIONS.md →
  docs/PROJECT_STATE.md → docs/NEXT_SESSION.md → docs/CLAUDE.md)
  ↓
IMPLEMENT
 (SATU target saja, additive, reuse existing — docs/IMPLEMENTATION_POLICY.md)
  ↓
TEST
 (test file yang relevan dulu)
  ↓
FULL TEST
 (node --test tests/*.test.js — WAJIB 0 fail sebelum lanjut)
  ↓
BUILD
 (node scripts/build.js — WAJIB sukses + lolos node --check)
  ↓
ZIP
 (docs/ZIP_RULES.md — seluruh folder kerja, bukan file pilihan manual)
  ↓
UPDATE DOCS
 (docs/CLAUDE.md WAJIB tiap sesi; docs/PROJECT_STATE.md,
  docs/NEXT_SESSION.md, docs/CHECKPOINT.md kalau progress berubah;
  IMPLEMENTATION_STATUS.md/ROADMAP.md/TODO.md kalau target-nya Smart AI)
  ↓
NEXT SESSION
 (update docs/NEXT_SESSION.md dgn kandidat target berikutnya)
  ↓
STOP
```

Satu sesi = satu target = satu putaran penuh diagram di atas. Jangan
lompat balik ke IMPLEMENT sebelum UPDATE DOCS selesai (lihat Definition
of Done di `docs/SESSION_RULES.md`).
