#!/usr/bin/env bash
# remove-shop-dead-files.sh — Hasil Audit Fitur Shop
# =============================================================
# Menghapus 9 file duplikat/dead code yang TERKONFIRMASI 0 referensi
# path-exact di scripts/build.js (jadi tidak pernah ikut ke bundle
# app-bundle-a/b.min.js, murni sampah folder). Sudah tercatat sebagian
# di FIX-s559-r1-shop-multiowner-engine-dead-file-removal.md (yang
# menghapus modules/shop/multi-owner-engine.js) -- script ini
# menuntaskan sisa yang disebut "di luar scope" di dokumen itu, plus
# 3 duplikat lain yang ditemukan di audit sesi ini.
#
# KOREKSI dari draf awal: modules/shop/business-intelligence-presenter.js
# TERNYATA BUKAN dead file -- dia di-lazy-load runtime lewat
# _loadScriptOnce() di app_production.html (dikeluarkan dari bundle
# statis GROUP_B dengan SENGAJA, lihat komentar scripts/build.js baris
# ~1038). Sengaja TIDAK dimasukkan ke daftar hapus di bawah.
#
# AMAN: hanya menghapus, tidak mengubah file lain (kecuali 1 test yang
# secara eksplisit menguji isi file dead ini, lihat
# tests/s572-tx-acc-change-stale-state.test.js -- sudah disesuaikan
# terpisah di patch ini). Jalankan "npm test" & "node scripts/build.js"
# setelahnya untuk verifikasi 0 regresi (build.js tetap sukses karena
# file-file ini memang tidak pernah ada di bundle list-nya).
#
# Pemakaian: bash scripts/remove-shop-dead-files.sh   (dari root project)

set -e

FILES=(
  "modules/shop/modals.js"
  "modules/shop/modules-render.js"
  "modules/shop/modules-calc.js"
  "modules/shop/multi-owner-engine.js"
  "modules/shop/features-helpers-global-security.js"
  "modules/modals.js"
  "modules/modules-render.js"
  "modules/modules-calc.js"
  "finance/tx-cobek.js"
)

echo "🗑  Menghapus ${#FILES[@]} dead file (0 referensi di scripts/build.js):"
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    rm "$f"
    echo "  ✅ dihapus: $f"
  else
    echo "  ⚠️  sudah tidak ada, dilewati: $f"
  fi
done

echo ""
echo "Selesai. Jalankan verifikasi:"
echo "  npm test              # pastikan tetap 0 gagal"
echo "  node scripts/build.js # pastikan build tetap sukses"
