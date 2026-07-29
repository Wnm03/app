# SECONDARY CLICKABLE HOVER ELEVATION

**Sprint 2 Tahap 16 — `ROADMAP-v1.1.md` Item 11 (Low Priority, 🟢
CSS-only)**

Baseline: Tahap 15 selesai, `node --test` 1382/1382 PASS.

## Perubahan

Tambah hover elevation utk `.stat-box.clickable`, `.cobek-stat.clickable`,
`.bbm-stat.clickable`, `.budget-sum-box.clickable`, `.budget-item.clickable`
— reuse nilai shadow persis sama dengan `.card:hover`
(`0 2px 8px rgba(0,0,0,.08)`) yang sudah ada, ditambahkan ke dalam
blok `@media (hover:hover) and (pointer:fine)` global existing (bukan
blok baru). Rule `:active` lama untuk elemen-elemen ini tidak diubah.

## File berubah

| File | Perubahan |
|---|---|
| `styles.css` | +1 rule aditif di dalam media block existing |
| `tests/secondary-clickable-hover.test.js` | 3 test baru |
| `CHANGELOG.md` | +section Tahap 16 |
| `SECONDARY-CLICKABLE-HOVER.md` | Dokumen ini |

## Tidak diubah

FEATURE_REGISTRY, Dashboard V2, Hero Dashboard, business logic, build
system, package.json, service worker, `index.html`/`app_production.html`.

## Hasil test

```
node --test
# tests 1385
# pass 1385
# fail 0
```

## Status

Item #11 selesai. **Seluruh item ROADMAP-v1.1.md yang layak dikerjakan
dalam batasan CSS-only/additive/value-preserving sudah selesai** (#1,
#2, #4, #6, #7, #9, #10, #11). Sisa:
- #3 (SVG icon FEATURE_REGISTRY) — dilarang constraint.
- #5 (box-shadow token) — token tidak pernah dibuat, butuh keputusan
  skala baru di luar mandat value-preserving.
- #8 (ripple koordinat sentuh) — 🔴 butuh perubahan JavaScript.

Roadmap CSS-only habis. Item tersisa butuh sesi terpisah dengan mandat
eksplisit (izin JS / desain skala shadow baru).
