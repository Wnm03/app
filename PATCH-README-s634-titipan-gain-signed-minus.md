# S634 — Dana Titipan: UI/UX Audit Lanjutan (dari screenshot) + Fix

## Audit singkat dari screenshot yang dikirim

Screenshot menunjukkan tampilan LAMA (sebelum patch S631-633 dipasang) —
grid detail 8 baris selalu terbuka & dropdown "Pilih Aset" selalu tampil.
**Patch S631-633 yang sudah kamu buat sebelumnya sudah menjawab itu**
(collapse ke `<details>`, klik nama holding langsung buka Atur Porsi).
Pastikan patch itu sudah kepasang di device — kalau screenshot diambil
SETELAH pasang tapi tampilannya masih sama, kemungkinan bundle browser
belum ke-refresh (cek versi cache/hard-refresh).

## Temuan BARU (bukan dari S631-633): bug tanda minus hilang pada kerugian

Lihat baris "Aku — Pokok Rp 528.159 → Kini Rp 515.089 **Rp 13.070**" (merah)
di screenshot — seharusnya kerugian, tapi teksnya **tidak ada tanda minus**,
cuma dibedakan lewat warna merah. Ini genuine bug keterbacaan/aksesibilitas:
- Kalau warna kurang kontras / user color-blind / screen di-screenshot
  hitam-putih, angka rugi terbaca seperti angka biasa (bahkan mirip "untung"
  krn tidak ada tanda apa pun).
- Root cause: `_money()`/`fmtFull()` di `modules/shared/format-tema.js`
  SELALU membungkus `Math.abs()` — jadi pola lama
  `${n>=0?'+':''}${this._money(n)}` kehilangan tanda minus untuk n negatif.

## Fix (additive, 0 breaking change)

- `modules/finance/dana-titipan-portfolio-render.js`:
  - Helper baru `_gainMoney(n)` — reuse `fmtFullSigned()` yang SUDAH ADA di
    `format-tema.js` (belum pernah dipakai file ini sebelumnya). Otomatis
    kasih prefix "-" untuk rugi, "+" untuk untung/nol (0 regresi ke pola
    lama "+Rp 0" untuk gain nol).
  - 5 titik render gain (baris holding, sub-holding, summary kartu owner,
    grid detail "Untung-Rugi", "Total Teralokasi") diarahkan ke
    `_gainMoney()`, menggantikan pola manual `${n>=0?'+':''}${_money(n)}`.
- Test baru: `tests/s634-titipan-gain-signed-minus.test.js` (4 test) —
  cek rugi eksplisit "-Rp...", untung tetap "+Rp...", gain nol tetap
  "+Rp 0", & tidak ada double-sign "+-Rp".

## Rekomendasi lain (belum dikerjakan, usul next session)

1. Nama owner panjang (mis. "mas sihab") membungkus baris jadi 2 baris
   & mendorong angka Pokok/Kini turun — pertimbangkan `text-overflow:
   ellipsis` + `title` attribute utk nama panjang, atau singkatkan
   otomatis di layar sempit.
2. Icon ⚠️ di sebelah nama owner tanpa keterangan (di screenshot ada di
   "mas sihab") — pertimbangkan `title`/`aria-label` yang jelas apa
   peringatannya (mis. "Lebih alokasi" seperti badge `titipan-over-badge`
   yang sudah ada di kode, tapi perlu dipastikan konsisten dipakai).

## Hasil test & build (sandbox)

- `npm test` (baseline app-main__45_ + patch S631-633 + fix S634 ini):
  **4505/4505 pass**, 0 fail (naik dari 4501 di S633).
- `node scripts/build.js`: sukses, sintaks bundle valid, `index.html`/
  `app_production.html` sinkron.

## File yang berubah/baru (patch ini SAJA, S634)

- `modules/finance/dana-titipan-portfolio-render.js` (DIUBAH)
- `tests/s634-titipan-gain-signed-minus.test.js` (BARU)

⚠️ Patch ini dibuat DI ATAS patch S631-633 yang sudah kamu punya — pasang
S631-633 dulu (kalau belum), baru timpa `dana-titipan-portfolio-render.js`
dengan versi di patch ini (sudah termasuk semua perubahan S631+632+633+634).
