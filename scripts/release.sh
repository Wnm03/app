#!/usr/bin/env bash
# scripts/release.sh — satu-satunya cara resmi bikin zip rilis/patch utk dikirim
# ke luar (hosting, atau dikirim sbg lampiran ke orang lain).
#
# KENAPA SCRIPT INI ADA:
# Dua insiden pernah terjadi krn zip dibuat manual dari folder kerja:
#   1. app-bundle-a.min.js & belasan file source lain ketinggalan saat zip
#      (folder kerja beda dgn apa yg sebenarnya sudah di-commit).
#   2. Sebuah patch ("collapse-fixed") ternyata dibuat dari branch/commit LAMA
#      yg lupa di-rebase ke main terbaru -> 2 bugfix yg sudah pernah selesai
#      (chicken-egg OCR, false-positive nama aset Bibit) ke-revert tanpa sadar.
#
# Script ini mencegah keduanya dgn cara:
#   - GAGAL kalau branch lokal bukan main / ketinggalan dari origin/main ->
#     mencegah kasus #2 (patch dari base basi).
#   - GAGAL kalau `npm run check` (lint+test+build, termasuk semua guard
#     regresi di build.js) tidak lolos.
#   - `npm run check` otomatis menaikkan APP_BUILD_VERSION & menulis ulang
#     bundle/HTML/sw.js. Perubahan itu di-commit OTOMATIS oleh script ini
#     (bukan manual, tidak mungkin lupa), BARU SETELAH ITU zip dibuat lewat
#     `git archive` dari commit itu. Jadi isi zip = isi commit, titik --
#     tidak mungkin ada file "ketinggalan" atau bundle basi yg nyelip.
#
# Pemakaian:
#   ./scripts/release.sh                 -> pakai HEAD & nama file otomatis
#   ./scripts/release.sh <nama-output>   -> paksa nama file zip custom
#
# Kalau memang butuh bikin zip dari branch feature yg belum di-merge ke main
# (mis. mau dikirim buat direview dulu), pakai --allow-non-main -- tapi ingat
# ini artinya zip itu BUKAN rilis final & belum tentu sudah lolos CI di main.

set -euo pipefail
cd "$(dirname "$0")/.."

ALLOW_NON_MAIN=0
OUT_NAME=""
for arg in "$@"; do
  case "$arg" in
    --allow-non-main) ALLOW_NON_MAIN=1 ;;
    *) OUT_NAME="$arg" ;;
  esac
done

if [ ! -d .git ]; then
  echo "❌ Bukan repo git (tidak ada folder .git/). Script ini HARUS dijalankan"
  echo "   dari clone git yg asli, bukan dari folder hasil extract zip -- justru"
  echo "   itu inti masalah yg mau dicegah script ini (isi zip tidak terjamin"
  echo "   sinkron dgn commit yg sebenarnya)."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ] && [ "$ALLOW_NON_MAIN" -eq 0 ]; then
  echo "❌ Branch aktif = '$CURRENT_BRANCH', bukan 'main'."
  echo "   Ini persis pola yg dulu bikin fix OCR & fix nama aset Bibit ke-revert:"
  echo "   patch dibuat dari branch yg sudah ketinggalan dari main."
  echo "   Merge/rebase ke main dulu, lalu ulangi -- atau kalau memang sengaja,"
  echo "   jalankan dgn --allow-non-main (paham risikonya)."
  exit 1
fi

echo "1/4 — Cek branch sinkron dgn origin/main..."
if git rev-parse --verify --quiet origin/main >/dev/null; then
  git fetch origin main --quiet || true
  BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
  if [ "$BEHIND" != "0" ]; then
    echo "❌ Branch lokal ketinggalan $BEHIND commit dari origin/main."
    echo "   Jalankan 'git pull' / rebase dulu sebelum rilis."
    exit 1
  fi
  echo "✓ Sudah sinkron dgn origin/main"
else
  echo "  (skip — remote origin/main tidak ketemu di clone ini)"
fi

echo ""
echo "2/4 — Menjalankan npm run check (lint + test + build)..."
# REQUIRE_MINIFY=1 dibaca oleh build.js (npm run build = node build.js, tidak
# lewat CLI flag --require-minify) -- pastikan rilis resmi SELALU gagal keras
# kalau esbuild ternyata tidak terpasang, bukan diam-diam kirim bundle besar.
REQUIRE_MINIFY=1 npm run check
echo "✓ npm run check lolos (termasuk cek wajib-minify)"

echo ""
echo "3/4 — Commit perubahan hasil build (versi/bundle/HTML/sw.js)..."
if [ -n "$(git status --porcelain)" ]; then
  VERSION_AFTER="$(grep -oE "APP_BUILD_VERSION\s*=\s*'[^']+'" features-helpers-global-security.js | sed -E "s/.*'([^']+)'/\1/")"
  git add -A
  git commit -m "release: build ${VERSION_AFTER}" --quiet
  echo "✓ Perubahan build di-commit sbg \"release: build ${VERSION_AFTER}\""
else
  echo "✓ Tidak ada perubahan dari build (versi/bundle sudah up to date di commit sebelumnya)"
fi

echo ""
echo "4/4 — Membuat zip dari git archive (isi = persis commit ini, tidak mungkin ada file ketinggalan)..."
COMMIT_SHORT="$(git rev-parse --short HEAD)"
VERSION="$(grep -oE "APP_BUILD_VERSION\s*=\s*'[^']+'" features-helpers-global-security.js | sed -E "s/.*'([^']+)'/\1/")"
if [ -z "$OUT_NAME" ]; then
  OUT_NAME="keluarga-w-${VERSION}-${COMMIT_SHORT}.zip"
fi
mkdir -p dist
git archive --format=zip -o "dist/$OUT_NAME" HEAD

echo ""
echo "✅ Selesai: dist/$OUT_NAME"
echo "   Isi zip ini dijamin = commit $(git rev-parse --short HEAD) yg baru saja lolos npm run check."
echo "   Jangan lupa 'git push' supaya origin/main ikut ke-update dgn commit rilis ini."
