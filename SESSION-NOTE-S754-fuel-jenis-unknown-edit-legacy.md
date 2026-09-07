# Sesi 754 — FuelPriceRef.selectUnknown(): cegah jenis BBM default "bocor" ke catatan lama

**Versi akhir: 1585** (lanjutan kumulatif S749–S753, base v1584).

## Temuan (audit, sebelum coding)
Saat mengedit catatan BBM LAMA (dari sebelum fitur "Jenis BBM" ada,
`b.jenis`/`linkedBbm.jenis` undefined), `FuelPriceRef.populateSelect()` yang
dipanggil di awal `BBM.openModal()` (car-notes.js) & `editTx()` (transaksi.js)
selalu mengisi dropdown dengan default `D.fuelPriceRef.lastType` (fallback
`'pertalite'`) — TIDAK ada opsi "belum diketahui". Kalau user langsung tekan
Simpan tanpa mengubah dropdown, catatan lama yang aslinya tidak diketahui
jenisnya diam-diam ketiban jenis default tsb. Bukan bug fungsional (tidak
menyebabkan crash/data salah secara sistemik), tapi gap UX/data-integrity
kecil yang bisa mengarah ke data BBM historis yang menyesatkan.

## Perubahan (additive, 0 file lama diubah perilakunya di luar titik ini)
1. **`modules/vehicle/fuel-price-ref.js`** — method baru
   `FuelPriceRef.selectUnknown(selectId)`: menambah 1 `<option value="">❓ Belum
   Diketahui</option>` (idempotent, cek dulu via `querySelector` sebelum
   insert) & set `el.value=''`. Murni UI, 0 data ditulis — guard
   `opts.jenis!==''` di `recordBbmLog()` (sudah ada sejak s753) menjamin
   value kosong ini tidak pernah menimpa `b.jenis` yang sudah tersimpan.
2. **`car-notes.js` (`BBM.openModal`)** — cabang edit: kalau `b.jenis` falsy,
   panggil `FuelPriceRef.selectUnknown('bbmJenis')` (else dari branch
   `if(b.jenis){...}` yang sudah ada).
3. **`modules/finance/transaksi.js` (`editTx`)** — sama, cabang
   `if(linkedBbm.jenis){...} else if(...) FuelPriceRef.selectUnknown('txBbmJenis')`.

## Verifikasi
- `node --check` lolos di ketiga file.
- Test baru: `tests/fuel-jenis-unknown-edit-legacy.test.js` (5 test, semua
  pass) — `selectUnknown()` idempotent, set value kosong, tambah opsi
  placeholder sekali saja, dan `recordBbmLog()` tidak menimpa jenis lama saat
  menerima `jenis:''`.
- Full test suite SEBELUM test baru: 5639/5639 pass (0 regresi dari s753).
- Full test suite SESUDAH test baru: **5644/5644 pass**.
- `node scripts/build.js s754-fuel-jenis-unknown-edit-legacy` sukses, versi
  final **1585**, bundle valid (`node --check` lolos).
- `verify-window-expose.js` — OK, 78 modul via data-action semua ter-expose.
- `verify-bundle-freshness.js` — OK, kedua bundle segar (hash source cocok).
- Full suite dijalankan ULANG setelah build (memastikan rebuild bundle tidak
  meregresi apa pun): tetap 5644/5644 pass.

## Belum selesai / catatan
- esbuild tidak terpasang di sandbox build ini → bundle ditulis TANPA
  minifikasi (ukuran lebih besar dari versi terminifikasi). Tidak
  mempengaruhi fungsi.
