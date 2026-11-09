# PATCH-MANIFEST S2780 — KUMULATIF di atas app-main_6 (mencakup S2777 + S2778 + S2779 + S2780)
Build: 2778 -> 2780 (esbuild minify, cek sintaks lolos)
Baseline: app-main_6.zip (build 2776). Terapkan di atas app-main_6; jangan campur dengan rantai lama.
Ringkasan S2780: BUG-036/037 (lepas tautan Stok Shop & Penjualan Shop; ditolak bila stok sudah terjual / piutang sudah lunas).
Setelah apply: `node scripts/apply-delete-manifest.js` (menghapus 3 file retired -> 3 dari 5 tes baseline yang gagal ikut hilang).

BEGIN_APPLY_FILES
app-bundle-a.min.js
app-bundle-b.min.js
app_production.html
chat-action-handlers.js
docs/BUG_REGISTRY.md
docs/COVERAGE-PER-MODULE.md
docs/FILE-MAP.md
docs/SESSION-NOTE-S2777-TX-BELANJA-SERVIS-CHOICE.md
docs/SESSION-NOTE-S2778-TX-UNLINK-VEHICLE.md
docs/SESSION-NOTE-S2779-TX-PANEL-VALIDATE-UNLINK.md
docs/SESSION-NOTE-S2780-TX-SHOP-UNLINK.md
index.html
modules/finance/transaksi-b.js
modules/finance/transaksi.js
modules/finance/tx-bbm.js
modules/finance/tx-renov.js
modules/finance/tx-servis.js
modules/finance/tx-stok-sparepart.js
modules/shared/features-helpers-global-security.js
modules/shared/modals.js
modules/shared/modules-calc.js
modules/shared/modules-render.js
modules/shop/cobek-tx-cart.js
sw.js
tests/s2777-tx-belanja-servis-choice.test.js
tests/s2778-tx-unlink-vehicle.test.js
tests/s2779-tx-panel-validate-unlink.test.js
tests/s2780-tx-shop-unlink.test.js
END_APPLY_FILES
