#!/usr/bin/env bash
# bump-version.sh — Jalankan skrip ini SETIAP KALI selesai edit file .js atau .css,
# sebelum upload ke hosting. Ini menyamakan nomor versi di semua tempat sekaligus:
#   - ?v=N di semua <link>/<script> tag (app_production.html & index.html)
#   - CACHE_NAME di sw.js
#
# Kenapa perlu: kalau nomor versi tidak dinaikkan tapi isi file .js/.css berubah,
# browser (atau service worker) bisa tetap serve versi LAMA yang di-cache dengan
# URL yang sama persis -- user tidak pernah dapat fix-nya walau file sudah diganti
# di server. Ini pernah kejadian nyata: file features-*.js sempat diedit tapi
# ?v= -nya lupa dinaikkan sementara styles.css sudah naik duluan, jadi nomor versi
# antar file jadi tidak sinkron.
#
# Pemakaian: ./bump-version.sh [nomor_versi_baru]
# Kalau nomor_versi_baru tidak diisi, otomatis pakai (versi tertinggi yang ditemukan + 1).

set -euo pipefail
cd "$(dirname "$0")/.."

HTML_FILES=(app_production.html index.html)
SW_FILE=sw.js

# 1. Cari versi tertinggi yang sedang dipakai (dari ?v=N di file HTML manapun)
current_max=0
for f in "${HTML_FILES[@]}"; do
  [ -f "$f" ] || continue
  while read -r n; do
    [ -n "$n" ] && [ "$n" -gt "$current_max" ] && current_max="$n"
  done < <(grep -oE '\?v=[0-9]+' "$f" | grep -oE '[0-9]+' || true)
done

new_version="${1:-$((current_max + 1))}"

echo "Versi lama tertinggi terdeteksi : $current_max"
echo "Versi baru yang akan dipakai     : $new_version"
echo ""

# 2. Samakan SEMUA ?v=N (berapapun N-nya sekarang) jadi ?v=new_version di kedua HTML
for f in "${HTML_FILES[@]}"; do
  [ -f "$f" ] || { echo "  (lewati, tidak ada) $f"; continue; }
  sed -i -E "s/\?v=[0-9]+/?v=${new_version}/g" "$f"
  echo "  ✓ $f -> semua ?v= jadi ?v=${new_version}"
done

# 3. Naikkan CACHE_NAME di sw.js (format: 'kw-cache-vN')
if [ -f "$SW_FILE" ]; then
  sed -i -E "s/(CACHE_NAME = 'kw-cache-v)[0-9]+(')/\1${new_version}\2/" "$SW_FILE"
  echo "  ✓ $SW_FILE -> CACHE_NAME jadi 'kw-cache-v${new_version}'"
else
  echo "  (lewati, tidak ada) $SW_FILE"
fi

echo ""
echo "Selesai. Semua file sekarang konsisten di versi ${new_version}."
echo "Jangan lupa: upload ULANG semua file yang berubah, bukan cuma HTML/sw.js."
