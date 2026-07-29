# TOUCH TARGET PADDING — .chip-btn / .qs-btn

**Sprint 2 Tahap 13 — `ROADMAP-v1.1.md` Item 7 (Medium Priority, 🟢
CSS-only)**

Baseline: Tahap 12 selesai, `node --test` 1376/1376 PASS.

## Perubahan

- `.chip-btn`: padding vertikal `6px` → `11px` (+5px/sisi).
- `.qs-btn`: padding vertikal `7px` → `12px` (+5px/sisi).
- `font-size`, warna, border, border-radius, dan seluruh properti lain
  tidak berubah — hanya area sentuh diperbesar, ukuran visual
  ikon/teks tetap.

## File berubah

| File | Perubahan |
|---|---|
| `styles.css` | 2 deklarasi (`.chip-btn`, `.qs-btn`) padding vertikal +5px |
| `tests/touch-target-padding.test.js` | 3 test baru (struktural) |
| `CHANGELOG.md` | +section Tahap 13 |
| `TOUCH-TARGET-PADDING.md` | Dokumen ini |

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker, `index.html`/`app_production.html`.

## Hasil test

```
node --test
# tests 1379
# pass 1379
# fail 0
```

## Status

Item #7 selesai. Sisa: #5 (shadow token, butuh skala baru — ditahan),
#8 (🔴 butuh JS), #9/#10/#11 (Low Priority CSS-only).
