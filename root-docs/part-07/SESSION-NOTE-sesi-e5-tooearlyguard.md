# Session Note — Sesi E5: guard "ganti terlalu dini"

## Konteks

Lanjutan Sesi E4 (`SESSION-NOTE-sesi-e4-defaultcost.md`), dikerjakan dari
ZIP hasil E4 (`PATCH-v1639-sesi-E4-defaultcost.zip`). Item 5 dari 6 saran
tambahan Sesi E (`ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §7).
Mengaktifkan placeholder `opts.skipEarlyGuard` yang sudah disiapkan
(no-op) sejak Sesi E1.

## Yang dikerjakan

**`car-notes.js`**:

1. **`Servis._checkTooEarlyGanti(cat, vehicleId, curKm)`** — finder murni
   baru (0 efek samping, 0 tulis `D`), pola sama seperti
   `_findAutoGantiStock()` (E2). Cari log "ganti" terakhir kategori+
   kendaraan ini lewat `getLastServiceKmForCat(vehicleId, cat, 'ganti')`
   (REUSE fungsi yang sudah ada, 0 logic baca log duplikat), lalu
   bandingkan jarak tempuh sejak itu dengan ambang **20% dari `intervalKm`**
   kategori. Kalau jarak tempuh di bawah ambang → dianggap "terlalu dini",
   return `{lastKm, traveled, intervalKm, thresholdKm}`. Return `null`
   (tidak dianggap dini) kalau: kategori tidak punya `intervalKm` valid,
   belum pernah ada log "ganti" (servis pertama kali), atau `curKm <
   lastKm` (data odometer tidak konsisten — sengaja tidak ditebak).
2. **`markServiced()`** — dipanggil setelah `willReset` dihitung, SEBELUM
   konfirmasi utama: kalau `actionType==='ganti'` DAN `opts.skipEarlyGuard`
   tidak di-set, panggil `_checkTooEarlyGanti()`. Kalau hasilnya truthy,
   tampilkan `askConfirm()` **terpisah** (`danger:true`) menjelaskan sudah
   berapa KM sejak ganti terakhir vs interval kategori. User batal → fungsi
   `return` (tidak lanjut ke konfirmasi utama, 0 dialog dobel utk kasus
   batal). User setuju → lanjut seperti biasa ke konfirmasi utama
   (`opts.skipConfirm` tetap berlaku independen).
3. **`markServicedBatch()`** — sekarang selalu mengirim
   `opts.skipEarlyGuard:true` (selain `skipConfirm:true` yang sudah ada
   sejak E1). Alasan: prinsip desain batch adalah "1 konfirmasi total,
   bukan per-item" — kalau guard baru ini dibiarkan aktif per-item di
   batch, itu akan memunculkan dialog konfirmasi tak terduga per item
   `ganti`, bertentangan dengan prinsip itu (sama alasan `skipConfirm`
   sudah dipakai sejak awal).
4. `actionType==='periksa'`/`'bersih'`/kosong (termasuk tombol "✅ Sudah
   Servis" lama di kartu Pengingat Servis) **tidak pernah** masuk cabang
   guard ini sama sekali — 0 regresi ke jalur lama.

## Test

Baru: `tests/servis-tooearlyguard-sesi-e5.test.js` (9 test) —
`_checkTooEarlyGanti()` return `null` saat belum pernah ganti & saat
jarak tempuh cukup, return detail saat terlalu dini; `markServiced(...,
'ganti')` dgn riwayat baru → guard tampil, batal → 0 entry tersimpan;
setuju → entry tersimpan; `opts.skipEarlyGuard:true` eksplisit → 0 dialog;
`actionType` selain 'ganti' & tombol lama tanpa `actionType` → guard tidak
dicek sama sekali; `markServicedBatch()` dgn item `'ganti'` baru diganti →
0 dialog (skipEarlyGuard otomatis aktif).

Verifikasi:
- `node --check car-notes.js` → lolos.
- `node --test tests/*.test.js` (seluruh delta zip) → **268/273 pass**
  (naik dari 259/264 di E4, +9 test baru semua pass); 5 gagal
  **PRE-EXISTING & TIDAK TERKAIT** — sama persis kegagalan yang sudah
  didokumentasikan berulang di E1-E4 (`ownership-engine.js` tidak ikut
  ter-bundle di delta zip ini).
- 0 regresi baru dikonfirmasi: seluruh test lama E1-E4 tetap pass apa
  adanya.

## Batasan sesi ini

- Sama seperti E1-E4: delta zip, bukan checkout penuh — `scripts/build.js`
  tidak dijalankan, `app-bundle-*.min.js`/`APP_BUILD_VERSION`/`index.html`
  **tidak diupdate**. Perlu digabung ke checkout penuh + build ulang
  sebelum rilis produksi.
- Ambang "terlalu dini" (**20% dari intervalKm**) adalah keputusan desain
  sesi ini sendiri (tidak ada angka eksplisit di roadmap) — kalau W mau
  ambang beda, tinggal ubah 1 angka (`0.2`) di `_checkTooEarlyGanti()`,
  0 refactor lain diperlukan.
- Guard ini murni **konfirmasi tambahan**, bukan hard-block — user tetap
  bisa lanjut ganti kalau memang yakin (sesuai gaya `askConfirm()` yang
  sudah dipakai di seluruh fungsi ini, bukan alert tanpa pilihan).

## Rekomendasi sesi berikutnya

Lanjut Sesi E6 (item terakhir: filter riwayat by `actionType`, chip UI
disisipkan JS sebelum `#servisList`) dari ZIP hasil sesi ini
(`PATCH-v1639-sesi-E5-tooearlyguard.zip`) — ini akan menuntaskan seluruh
6 saran tambahan Sesi E.
