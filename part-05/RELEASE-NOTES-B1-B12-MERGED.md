# RELEASE NOTES — B1 s/d B12: Aset ↔ Investasi Link, Bridge, Double-Count Fix

Gabungan 12 sesi (B1-B12), diterapkan berurutan sesuai kronologi asli.
Setiap file di bawah adalah versi FINAL kumulatif (bukan diff per-sesi) —
siap langsung menimpa file yang sama di repo.

## Urutan sesi & ringkasan
1. **B1** — Field + dropdown `investmentId` di modal Aset ("🔗 Hubungkan ke
   Holding Investasi").
2. **B2a** — Read-only "Atur Porsi" saat aset tertaut ke Investasi.
3. **B2b** — Redirect owners view ke sisi Investasi kalau tertaut.
4. **B3** — Bridge display read-only "🔗 Terhubung ke Investasi" di kartu Aset.
5. **B4** *(tergabung ke rilis B5)* — Saran (bukan auto-link) pasangan
   Aset & Holding Investasi yang namanya mirip, belum ditautkan.
6. **B5** — Regression checkpoint + release notes B1-B5.
7. **B6** — Data Health Check: cek orphan `investmentId`.
8. **B7** — Audit (deteksi saja): aset tertaut berpotensi dihitung 2x di
   Kekayaan Bersih.
9. **B8** — **FIX** dobel-hitung: `Aset.totalValue()` & `Zakat.hitungMaal()`
   exclude aset ber-`investmentId` (Opsi A). Warn B7 dihapus (sudah tidak
   akurat).
10. **B9** — **FIX** lanjutan: `FI.investmentAssetValue()` (Financial
    Freedom Index) exclude `investmentId` juga (gap yang sama, titik lain).
11. **B10** — Navigasi simetris: tombol "🔗 Lihat di Aset" dari sisi
    Investasi (kebalikan B3).
12. **B11** — QoL: tombol "📦 Buka Aset" langsung di saran Data Health
    Check (B4/B6) yang menyebut 1 aset spesifik, reuse dispatcher
    `data-action="openAssetModal"` yang sudah ada.
13. **B12** — **FIX** dobel-hitung di modul terpisah yang ditemukan lewat
    audit lanjutan: `DanaKelolaan.sumAssets()` (`dana-kelolaan.js`) exclude
    `investmentId` juga (gap yang sama B7-B9, titik ke-3 di luar Kekayaan
    Bersih/Zakat Maal/FI).

## File yang berubah (versi final kumulatif)
| File | Sesi terakhir yang mengubah |
|---|---|
| `modules/asset/aset.js` | B8 |
| `modules/shared/modals.js` | B10 |
| `modules/asset/investasi-list-view.js` | B10 |
| `modules/finance/pajak-pbb-zakat.js` | B8 |
| `modules/shared/modules-calc.js` | B9 |
| `modules/finance/dana-kelolaan.js` | B12 |
| `data-health-check.js` | B11 |

## Catatan penting proses merge
- `tests/data-health-check-asset-investment-doublecount-b7.test.js`
  **DIHAPUS** dari gabungan ini — menguji warning B7 yang secara eksplisit
  dihapus lagi di B8 setelah rumusnya diperbaiki (bukan hilang, memang
  sengaja dibuang, lihat catatan B8).
- Semua file lain adalah UNION dari 12 sesi, diterapkan urut kronologis
  (timestamp asli tiap patch), jadi versi tiap file adalah yang PALING
  BARU dari sesi manapun yang menyentuhnya.
- Diverifikasi: 26/26 test relevan (Dana Kelolaan + Data Health Check +
  regresi terkait) lulus dengan file gabungan ini, dijalankan pakai
  harness `loadSource()` asli project.
- Jalankan full `node --test` di repo asli sebelum deploy untuk baseline
  resmi (bukan dijalankan penuh di sini karena sesi ini tidak punya akses
  ke seluruh source tree, hanya file yang relevan ke rantai B1-B12).

## Audit yang SUDAH dilakukan tapi TIDAK menghasilkan fix (dicatat, bukan bug)
- Bridge Kendaraan↔Aset (`vehAssetId`, S506/S507) — desain read-only tanpa
  snapshot nilai, dikonfirmasi 0 dobel-hitung.
- `aset-keluarga.js`, `property-management-api.js`, `invest-ai-widget.js`
  — baca `a.nilai` independen, tidak pernah dijumlah bareng nilai investasi
  di 1 total yang sama, jadi bukan pola dobel-hitung (beda dari B12).

## Cara pakai
Timpa 7 file di atas ke lokasi yang sama di repo, tambah semua file di
`tests/`, lalu jalankan `node --test` penuh untuk baseline regresi resmi
sebelum commit.
