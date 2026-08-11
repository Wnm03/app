# FIX v1169 → v1170 (s451) — Field Nominal (Rp) Terkunci di Modal ⚖️ Atur Porsi Kepemilikan

## Laporan user
Screenshot: aset "Majoris" (3 baris pemilik: "mas sihab (Keluarga)" 15,15%,
"Kamera" 84,85%, total pas 100%). Field "Nominal (Rp)" abu-abu/disabled di
kedua baris, walau Porsi (%) sudah lengkap dan pas 100%. Hint di bawah
field: "Isi 'Estimasi Nilai Saat Ini' di form Aset dulu supaya Nominal bisa
dihitung otomatis".

## Root cause
`_ownersAssetNilai()` (aset.js) balik 0 kalau `a.nilai` (field "Estimasi
Nilai Saat Ini" di form Aset utama) belum diisi/0. `_renderOwnersList()`
memakai nilai ini utk nge-`disable` field Nominal SELURUHNYA — alasan lama
(Sesi 429): "konversi Rp<->% butuh nilai dasar, tidak ada cara aman
menebaknya".

Asumsi itu salah utk kasus nyata ini: user justru **sudah tahu** Porsi (%)
tiap pemilik (diisi manual, total 100%) — yang belum ada cuma total Rp
instrumennya. Dengan Porsi (%) baris tertentu + Nominal (Rp) baris yang
sama, nilai dasar (`a.nilai`) itu sendiri BISA diturunkan:
`nilaiDasar = nominal / (porsi/100)`. Field lama memblokir jalur ini sama
sekali.

## Fix
1. **`_renderOwnersList()`**: hapus atribut `disabled` dari field Nominal
   — selalu aktif. Hint di bawah field diubah jadi mengarahkan user isi
   Nominal salah satu baris (bukan lagi "isi form Aset dulu").
2. **`onOwnerNominalInput(i,val)`**: tambah cabang baru utk `nilai<=0`
   (sebelumnya `return` langsung di sini): kalau Porsi (%) baris ini SUDAH
   diisi (>0), hitung `nilaiTersirat = nominal/(porsi/100)`, simpan ke
   `Aset._ownersDraftNilai` (state baru, draft-only). Nominal (Rp) baris
   LAIN ikut disinkron ke nilai tersirat ini (porsi baris lain TIDAK
   berubah). Kalau porsi baris ini JUGA belum diisi — no-op (0 persamaan 2
   unknown, tidak ada cara aman menebak).
3. **`_ownersAssetNilai()`**: baca `Aset._ownersDraftNilai` dulu (kalau
   ada & >0) sebelum fallback ke `a.nilai` asli — supaya render/kalkulasi
   lain di modal yang sama langsung pakai nilai tersirat.
4. **`saveOwners()`**: kalau `_ownersDraftNilai` ada, tulis ke `a.nilai`
   SEBELUM blok sync saldo akun tertaut & `_syncOwnerDebts()` (keduanya
   baca `a.nilai`) — supaya "Estimasi Nilai Saat Ini" otomatis terisi &
   akun tertaut/utang titipan langsung sinkron ke nilai baru, tanpa user
   perlu buka form Aset utama secara terpisah.
5. **`openOwnersModal()`/`resetOwners()`**: reset `_ownersDraftNilai=null`
   — state ini draft-only per sesi modal terbuka, dibuang kalau modal
   ditutup tanpa simpan atau user tekan "↺ Reset Draft".

## File yang berubah
- `modules/asset/aset.js`
- `tests/asset-owners-nominal-sync-s429.test.js` (2 test lama yang
  eksplisit assert perilaku disabled DIGANTI 4 test baru yang assert
  perilaku enabled + derivasi nilai — perilaku lama itu sendiri yang jadi
  bug, jadi test lama memang HARUS berubah, bukan regresi)

## Test
- 4 test baru di `asset-owners-nominal-sync-s429.test.js` (field selalu
  aktif, derivasi nilai dari nominal+porsi, no-op kalau porsi juga kosong,
  nilai tersirat ikut tersimpan lewat saveOwners())
- Full suite: 2934/2934 pass, 0 regresi

## Build
- v1169 → v1170 (s451)
- Release gate: lint & minify di-override manual (sandbox tanpa akses
  jaringan, eslint/esbuild tidak bisa di-install) — dicatat di
  `docs/RELEASE-GATE-LOG.md`. html-sync lolos normal.
