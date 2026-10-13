#!/usr/bin/env bash
# ALAT AUDIT read-only: jalankan suite pada beberapa tanggal tergeser untuk mencari tes yang bergantung jam sistem.
# Pemakaian (dari root app-main): bash scripts/audit-ketergantungan-tanggal-tes.sh [tanggal-ISO ...]
# Default: tanggal asli penulisan tes (2026-10-12, harus HIJAU sebagai validasi harness), akhir tahun, awal bulan.
set -u
DATES=("$@"); [ ${#DATES[@]} -eq 0 ] && DATES=(2026-10-12T10:00:00+07:00 2026-10-19T10:00:00+07:00 2026-12-31T23:30:00+07:00 2027-03-01T10:00:00+07:00)
HERE="$(cd "$(dirname "$0")" && pwd)"
for d in "${DATES[@]}"; do
  echo "== $d"
  SHIFT_TO="$d" NODE_OPTIONS="--require $HERE/uji-geser-jam-preload.js" node --test tests/*.test.js 2>&1 | grep -E '^# (tests|pass|fail)|^not ok' | cut -c1-160
done
