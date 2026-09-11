# SESSION NOTE — Checklist Servis: actionType/resetType, Sesi 1

Referensi: `PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md` §2–§3, §6-poin1.
Build version: s778-followup6-fuel-price-deviation-summary → v1639 (build.js).

## Scope Sesi 1 (data & logic layer, 0 dependensi ke UI checklist 30-item)

Sesi 1 sengaja dibatasi ke fondasi yang 100% dispesifikasikan di dokumen
(§2a–§2c) dan tidak butuh UI checklist 30-item itu sendiri (yang belum ada
kode-nya sama sekali — lihat §4 dokumen). Ini supaya Sesi 1 aman diselesaikan
& ditest tuntas tanpa terblokir dokumen lain yang belum diupload
(`VERIFIKASI-DAN-FINALISASI-CHECKLIST-SERVIS.md`, dirujuk di §3 dokumen tapi
tidak ada di baseline).

## Perubahan

1. **`D.servisLogs` — field baru `actionType`** (opsional, `'ganti'|'bersih'|
   'periksa'|null`). Dituliskan di `Servis.markServiced()` (car-notes.js).
   Baris lama tanpa field ini tetap `undefined`/`null`, diperlakukan `'ganti'`
   di semua logic reset (0 migrasi data).

2. **`D.sparepartCats` — 3 field baru per-kategori** (semua opsional):
   - `actionMode`: `'ganti'`(default)`|'bersih'|'alternate'|'periksa-conditional'|'none'`
   - `resetType`: `'km'`(default)`|'time'|'both'`
   - `gantiResetsInterval`: default `true`, dipakai hanya saat
     `actionMode==='periksa-conditional'`

3. **`getLastServiceKmForCat()`** (car-notes.js, `Servis.getLastServiceKmForCat`)
   **& `getLastServiceDateForCat()`** (modules/vehicle/sparepart-servis.js) —
   ditambah 2 parameter opsional: `actionTypeFilter`, `forReminder`. Dipanggil
   tanpa keduanya (riwayat/servisList/dll) = 0 perubahan perilaku lama.
   Filter logic didup­likasi sengaja di 2 tempat (`Servis._matchesActionTypeForReset`
   & `matchesActionTypeForReset`) — harus tetap identik, lihat komentar di kode.

4. **`resolveResetActionTypeFilter(cat)`** (sparepart-servis.js, baru) — pemetaan
   pola→filter sesuai tabel §2b:
   - pola 1/5/6 (default/bersih/none) & pola 3 (`alternate`) → `null` (semua
     actionType jadi basis reset, 0 perubahan)
   - pola 2 (`resetType:'both'|'time'`) & pola 4 (`periksa-conditional`) →
     `'ganti'` / `'periksa'`

5. **`computeServiceUrgency()`** (sparepart-servis.js) — sekarang memanggil
   `getLastServiceKmForCat()`/`getLastServiceDateForCat()` dengan
   `resolveResetActionTypeFilter(cat)` + `forReminder:true`. Kombinasi km+bulan
   (pola 2, "mana yang lebih dulu tercapai") **sudah otomatis benar** — logic
   itu sudah ada sejak fitur Interval Waktu, tidak disentuh.

6. **`suggestNextBusiAction(vehicleId,cat)`** (sparepart-servis.js, baru) —
   saran default toggle periksa/ganti untuk pola 3 (Busi), berdasar paritas
   jumlah log sebelumnya. Murni saran, tidak mengunci `actionType`.

7. **`Servis.markServiced(catId, actionType)`** — param `actionType` opsional
   (§6-poin1: disiapkan supaya checklist Sesi 2 nanti REUSE fungsi ini, bukan
   bikin jalur simpan sendiri). Teks konfirmasi/toast disesuaikan supaya tidak
   mengklaim "pengingat direset" untuk kasus pola 4 + `actionType:'ganti'`
   (yang memang tidak mereset, sesuai §2c). Dipanggil tanpa `actionType`
   (tombol "✅ Sudah Servis" existing) = 0 perubahan.

## Test

`tests/servis-actiontype-resettype-sesi1.test.js` — 14 test baru, cakupan:
`resolveResetActionTypeFilter()` per pola, `matchesActionTypeForReset()` dari
2 sisi (car-notes.js & sparepart-servis.js), `getLastServiceDateForCat()` &
`computeServiceUrgency()` untuk pola 2/3/4 (termasuk kasus "log ganti lebih
baru tapi TIDAK dipakai sbg basis" untuk pola 4), `suggestNextBusiAction()`,
dan `Servis.markServiced()`/`Servis.getLastServiceKmForCat()` backward
compatibility.

**Hasil: 6019/6019 pass (6005 lama + 14 baru), 0 regresi.**
`verify-window-expose` ✓, `verify-bundle-freshness` ✓ (setelah rebuild).
Lint (`npm run lint`) tidak bisa dijalankan di sandbox ini (tidak ada akses
internet untuk install eslint) — mohon jalankan `npm run lint` di environment
W sebelum deploy sebagai pengaman tambahan.

## Yang BELUM dikerjakan (di luar scope Sesi 1, lihat dokumen §4/§6)

- **Checklist UI 30-item itu sendiri** (§2d) — toggle "Diperiksa"/"Diganti"
  per baris, state in-memory `checked{itemId:actionType}`. Ini butuh
  `VERIFIKASI-DAN-FINALISASI-CHECKLIST-SERVIS.md` (dirujuk dokumen §3, belum
  diupload) untuk tahu lokasi/markup checklist yang sudah direncanakan
  sebelumnya. **Mohon W upload dokumen itu supaya Sesi 2 bisa mulai.**
- Auto-potong stok saat `actionType==='ganti'` (§6-poin2)
- Batch checkout multi-item via `batchId` (§6-poin3)
- Default cost 0 utk periksa/bersih (§6-poin4)
- Guard "ganti terlalu dini" (§6-poin5)
- Filter riwayat by `actionType` (§6-poin6)
- Keputusan W yang masih pending (§4): default toggle periksa/ganti,
  & apakah item ganti-saja (mis. Oli Mesin) perlu opsi "periksa saja" juga.
