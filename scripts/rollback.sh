#!/usr/bin/env bash
# rollback.sh — Kembalikan app-bundle-a.min.js / app-bundle-b.min.js ke backup
# terakhir yang tersimpan di folder backups/ (dibuat otomatis oleh build.js
# setiap kali "node build.js" dijalankan).
#
# PENTING: rollback ini HANYA mengembalikan file bundle .js. Nomor versi di
# index.html/app_production.html/sw.js TIDAK ikut diturunkan otomatis (biar
# tidak salah timpa versi yang sudah dipakai user lain). Kalau perlu, sesuaikan
# ?v=N manual setelah rollback, atau jalankan bump-version.sh lagi supaya
# nomor versi naik dan cache browser pasti ke-refresh dengan bundle hasil rollback.
#
# Pemakaian:
#   ./rollback.sh              -> tampilkan daftar backup yang tersedia
#   ./rollback.sh <nama_file>  -> rollback SATU bundle spesifik dari backups/<nama_file>
#                                  ke lokasi aslinya (app-bundle-a.min.js atau -b.min.js)

set -euo pipefail
cd "$(dirname "$0")/.."

BACKUP_DIR="backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "Belum ada folder backups/ — berarti belum pernah ada build yang menimpa bundle lama."
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Backup yang tersedia (terbaru di atas):"
  echo ""
  echo "  app-bundle-a.min.js:"
  ls -1t "$BACKUP_DIR" 2>/dev/null | grep '^app-bundle-a\.min\.' | sed 's/^/    /' || echo "    (tidak ada)"
  echo ""
  echo "  app-bundle-b.min.js:"
  ls -1t "$BACKUP_DIR" 2>/dev/null | grep '^app-bundle-b\.min\.' | sed 's/^/    /' || echo "    (tidak ada)"
  echo ""
  echo "Cara pakai: ./rollback.sh <nama_file_backup>"
  echo "Contoh    : ./rollback.sh app-bundle-a.min.v47-build37.2026-07-09T10-00-00-000Z.js"
  exit 0
fi

BACKUP_FILE="$1"
SRC="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$SRC" ]; then
  echo "❌ Tidak ketemu: $SRC"
  echo "Jalankan './rollback.sh' tanpa argumen untuk lihat daftar backup yang ada."
  exit 1
fi

# Tentukan file tujuan (app-bundle-a.min.js atau app-bundle-b.min.js) dari nama backup
if [[ "$BACKUP_FILE" == app-bundle-a.min.* ]]; then
  DEST="app-bundle-a.min.js"
elif [[ "$BACKUP_FILE" == app-bundle-b.min.* ]]; then
  DEST="app-bundle-b.min.js"
else
  echo "❌ Nama file backup tidak dikenali (harus diawali app-bundle-a.min. atau app-bundle-b.min.)"
  exit 1
fi

# Simpan dulu bundle yang sedang aktif sekarang (jaga-jaga, biar rollback juga tidak permanen menghapus)
if [ -f "$DEST" ]; then
  SAFETY_TS="$(date -u +%Y-%m-%dT%H-%M-%S-000Z)"
  cp "$DEST" "$BACKUP_DIR/${DEST%.js}.pra-rollback.${SAFETY_TS}.js"
  echo "✓ Bundle aktif saat ini diarsipkan dulu ke: $BACKUP_DIR/${DEST%.js}.pra-rollback.${SAFETY_TS}.js"
fi

cp "$SRC" "$DEST"
echo "✓ $DEST dikembalikan dari backup: $BACKUP_FILE"
echo ""
echo "⚠️  Ingat: naikkan nomor versi (jalankan ./bump-version.sh) supaya browser/service"
echo "    worker user tidak tetap serve versi lama dari cache."
