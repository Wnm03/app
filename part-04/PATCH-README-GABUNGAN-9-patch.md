# Patch Gabungan (9 patch → 1) — hanya file yang berubah/baru

23 file — timpa langsung ke root project, struktur folder di zip ini
sudah sama persis dgn struktur repo (root, `docs/`, `modules/...`, `tests/`).

## File berubah (20)
- `app-bundle-a.min.js`, `app-bundle-b.min.js` — hasil build ulang
- `app_production.html`, `index.html`, `sw.js` — versi ?v=1369
- `chat-action-handlers.js`
- `data-health-check.js` — aksi koreksi "Stok sparepart minus"
- `docs/BUG_REGISTRY.md` — BUG-007 OPEN→FIXED
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` — auto-regenerated
- `modules/dashboard-hub/dashboard-hub.js` — kartu Saldo Bersih + saran self-reward
- `modules/finance/titipan-reconcile.js` — checkTransactionOwnerRefs (S635) +
  checkOwnershipDualSource (S636 Opsi C), digabung jadi 6 sub-check di checkAll()
- `modules/shared/action-wrappers.js` — dashHubQaDanaTitipan() (tombol ke-5 Quick Action)
- `modules/shared/features-helpers-global-security.js`, `modules-calc.js`,
  `modules-render.js`, `modals.js` — versi disamakan (S637)
- `modules/shared/keamanan-pin.js` — salt per-perangkat (bukan salt tetap)
- `self-test.js` — pesan assert checkAll() sebut 2 sub-check baru
- `styles.css` — varian hijau kartu Saldo Bersih
- `tests/titipan-reconcile.test.js` — 6 test baru checkOwnershipDualSource()

## File baru (2)
- `tests/s635-titipan-reconcile-transaction-owner-refs.test.js`
- `tests/data-health-check-negative-stock-correction.test.js`

## Verifikasi
`node --test tests/*.test.js` → 4527/4527 pass, 0 fail. `node scripts/build.js`
lolos semua cek internal (version sync, drift, dsb).

## Cara pasang
Timpa 23 file di atas ke lokasi yang sama di repo (root/docs/modules/tests
sesuai struktur zip), commit & push semuanya sekaligus (termasuk 2 bundle
.min.js — itu yang beneran dimuat browser).
