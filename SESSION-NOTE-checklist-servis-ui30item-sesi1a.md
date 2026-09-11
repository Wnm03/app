# SESSION NOTE — Checklist Servis UI 30-item, Sesi 1A (konstanta data)

Referensi: `BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md` (Sesi 1A),
`VERIFIKASI-DAN-FINALISASI-CHECKLIST-SERVIS.md` §3 (tabel final 30 item),
`PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md` §2b (pola actionMode).
Build version: s778-followup6-fuel-price-deviation-summary → **v1640**
(lanjutan langsung dari v1639, `SESSION-NOTE-checklist-servis-actiontype-sesi1.md`).

## Scope Sesi 1A (murni data, 0 UI/logic)

Sesi ini SENGAJA dibatasi ke 1 hal: konstanta `SERVICE_CHECKLIST_GROUPS`
(30 item / 13 grup) berbentuk data statis, supaya bisa direview & ditest
terpisah dari state/logic toggle (Sesi 1B) dan markup modal (Sesi 1C) —
lihat alasan pemecahan di `BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md`.

## Perubahan

1. **File baru `modules/vehicle/servis-checklist.js`** — deklarasi
   `const SERVICE_CHECKLIST_GROUPS` (13 grup, 30 item), field per item:
   `id, name, linkCat, actionMode, resetType, intervalKm,
   intervalTimeMonths, gantiResetsInterval, intervalLabel, sumber,
   needsReview?, catatan?`. Isi persis tabel `VERIFIKASI §3` — 9 item
   `linkCat:true` (Oli Mesin, Busi, V-Belt CVT, Roller CVT, Kampas Rem
   Depan, Minyak Rem, Aki, Filter Udara, Oli Gardan/Final Drive), sisanya
   `false`. Tidak ada `window.SERVICE_CHECKLIST_GROUPS=` (bukan object
   literal top-level, bukan dipanggil via `data-action` — di luar
   cakupan `verify-window-expose.js`, sudah diverifikasi lolos).
2. **`scripts/build.js`** — `'modules/vehicle/servis-checklist.js'`
   ditambah ke `GROUP_B`, tepat setelah
   `'modules/vehicle/sparepart-servis-b.js'`.
3. **Bundle rebuild** — `app-bundle-a.min.js`/`app-bundle-b.min.js`,
   versi `s778-followup6-fuel-price-deviation-summary` →
   `s779-followup6-fuel-price-deviation-summary` (source) / build number
   **1639 → 1640** (`index.html`, `app_production.html`, `sw.js`
   `CACHE_NAME`). `docs/FILE-MAP.md` & `docs/COVERAGE-PER-MODULE.md`
   diregenerasi otomatis oleh build.js.

**4 item ditandai `needsReview:true`** (keputusan W belum final, sesuai
`VERIFIKASI §4` & catatan `PERBAIKAN §2b`): V-Belt CVT (pola
alternate vs 2-interval-independen), Coolant (linkCat nunggu W tambah
nama ke `GENERIC_RECOMMEND_NAMES.motor`), Kampas Rem Belakang (numpuk
kategori atau pisah), Ban Depan (linkCat naik jadi `true` atau tetap).
Datanya tetap diisi (bukan dikosongkan) supaya Sesi 1B/1C bisa jalan
duluan — tinggal diubah 1 field kalau W sudah putuskan.

## Test

`tests/servis-checklist-groups-sesi1a.test.js` — 14 test baru, cakupan:
jumlah grup (13) & item (30) tepat, 9 `linkCat:true` sesuai nama persis,
id unik, nama unik per grup, enum `actionMode`/`resetType` valid,
konsistensi `resetType` vs `intervalKm`/`intervalTimeMonths`/
`intervalLabel`, `gantiResetsInterval` cuma terisi utk
`periksa-conditional`, `intervalLabel`/`sumber` tidak kosong, 4 item
`needsReview` sesuai nama, urutan 13 grup persis daftar sistem di audit,
tidak ada grup kosong.

**Hasil: 6033/6033 pass (6019 lama + 14 baru), 0 regresi.**
`verify-window-expose` ✓, bundle freshness ✓ (setelah rebuild).
`npm run lint` tetap tidak bisa dijalankan di sandbox ini (tidak ada
akses internet utk install eslint, sama seperti catatan Sesi 1
sebelumnya) — mohon jalankan `npm run lint` di environment W sebelum
deploy.

## Yang BELUM dikerjakan (lanjut ke sesi berikutnya)

- **Sesi 1B** — state & logic toggle in-memory (`ServisChecklist.open()`,
  `.toggleItem()`, `.setActionType()`, `.checkedCount()`,
  `checked{itemId:actionType}`) — **butuh jawaban W dulu**: default
  toggle periksa/ganti (`'periksa'` diusulkan) & apakah item ganti-saja
  (Oli Mesin dkk) perlu opsi "periksa saja" juga (lihat
  `BREAKDOWN-SESI-RINGAN...md` §"Keputusan W yang masih menggantung"
  poin 1–2).
- **Sesi 1C** — tombol "☑️ Servis Checklist" + modal/accordion di
  `index.html`, sambung ke state Sesi 1B.
- **Sesi 2A/2B** — simpan batch ke `D.servisLogs` + sinkron reminder/
  keuangan.
- 5 keputusan W yang masih terbuka: lihat
  `BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md` bagian akhir.
