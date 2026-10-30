# TRANSITION DURATION TOKEN CONSOLIDATION

**Sprint 2 Tahap 12 — `ROADMAP-v1.1.md` Item 6 (Medium Priority, 🟢
CSS-only)**

Baseline: Tahap 11 selesai, `node --test` 1376/1376 PASS.

## Audit

Item 5 (box-shadow token) dilewati: token `--shadow-*` yang disebut
"sudah disiapkan sejak Tahap 1" ternyata **tidak ada** di `:root`
(diverifikasi, 0 match). Membuat skala baru dari 17 nilai `box-shadow`
berbeda (warna/blur/offset campur) berisiko tidak value-preserving.
Dilewati tanpa diskusi, lanjut ke item berikutnya yang valid.

Item 6 (durasi transition) diaudit: token `--dur-fast:100ms`,
`--dur-base:150ms`, `--dur-moderate:200ms`, `--dur-slow:250ms` sudah
ada. Dari ≥15 variasi durasi literal, 3 nilai match persis token:

| Literal | Token | Jumlah |
|---|---|---|
| `0.2s`/`.2s` | `var(--dur-moderate)` | 17 |
| `0.15s`/`.15s` | `var(--dur-base)` | 12 |
| `0.25s`/`.25s` | `var(--dur-slow)` | 3 |

Nilai lain (`.12s`, `.22s`, `.3s`, `.4s`, `.5s`, `.6s`, `1.1s`) **tidak**
match token manapun — tidak dimigrasi (mencegah perubahan nilai/non
value-preserving).

## Perubahan

`styles.css`: 32 literal durasi diganti `var(--dur-*)`, regex hanya
menyasar nilai persis (tidak menyentuh `.12s`/`.22s`/dst), easing
literal (`ease`) dipertahankan apa adanya karena tidak ada token
`--ease-*` yang setara kurva `ease` bawaan CSS.

## File berubah

| File | Perubahan |
|---|---|
| `styles.css` | 32 literal durasi → `var(--dur-*)` (value-preserving) |
| `CHANGELOG.md` | +section Tahap 12 |
| `TRANSITION-DURATION-TOKENS.md` | Dokumen ini |

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker, `index.html`/`app_production.html`
(tidak inline CSS).

## Hasil test

```
node --test
# tests 1376
# pass 1376
# fail 0
```

## Status

Item #6 selesai. Item #5 (shadow token) & #7/#9/#10/#11 (CSS-only) +
#8 (🔴 butuh JS) menunggu tahap berikutnya.
