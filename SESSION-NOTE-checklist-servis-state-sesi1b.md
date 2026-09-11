# SESSION NOTE — Checklist Servis, Sesi 1B (state & logic toggle)

Referensi: `BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md` §"Sesi 1B",
`PERBAIKAN-JENIS-TINDAKAN-CHECKLIST-SERVIS.md` §2c/§2d, lanjutan langsung
dari Sesi 1A (`SESSION-NOTE-checklist-servis-ui30item-sesi1a.md`, v1640).
Build version: v1640 → **v1641**.

## Keputusan W (dijawab sebelum sesi ini ditulis)

Sesi 1B sempat terhenti menunggu 2 keputusan (lihat breakdown dokumen
§"Keputusan W yang masih menggantung" poin 1–2):

1. **Default toggle periksa/ganti = `'periksa'`** (usulan dipilih — lebih
   aman: salah toggle jadi `'periksa'` cuma berarti belum tercatat ganti,
   lebih murah dikoreksi daripada reset jatuh-tempo ganti tanpa sengaja).
2. **Item ganti-saja/bersih-saja TETAP 1-actionType** — tidak diberi opsi
   "periksa saja" tambahan (ditunda; nambah itu berarti merevisi ulang
   tabel pola §2b yang sudah difinalkan Sesi 1A — scope creep, bukan
   syarat checklist bisa dipakai).

## Perubahan

1. **`modules/vehicle/servis-checklist.js`** (lanjutan file Sesi 1A, 0 file
   lain diubah kecuali build artifacts) — ditambah `const ServisChecklist`:
   - `open(vehicleId)` — reset `_checked{}` & simpan vehicleId aktif.
   - `toggleItem(groupIdx, itemIdx)` — centang (isi default actionType) /
     uncentang (delete key) 1 item.
   - `setActionType(groupIdx, itemIdx, type)` — override manual, guard
     `_validActionTypesFor()` per pola actionMode.
   - `checkedCount(groupIdx)` — badge jumlah tercentang per grup.
   - `_defaultActionType(item)` — pemetaan default per actionMode: pola
     1/2/5 (ganti/bersih terkunci) → actionMode itu sendiri; pola 6
     (`none`) → sentinel `'catat'`; pola 4 (`periksa-conditional`) →
     `'periksa'` (Keputusan W #1); pola 3 (`alternate`, Busi) → panggil
     `suggestNextBusiAction()` (sparepart-servis.js, SUDAH ADA, dipanggil
     apa adanya) via `resolveServisCatForVehicle()`, fallback `'periksa'`
     kalau kategori belum ke-resolve.
   - `window.ServisChecklist = ServisChecklist` ditambah PROAKTIF sesi ini
     (belum ada data-action yang memakainya — itu Sesi 1C) supaya tidak
     masuk bug class s345-348 (tombol data-action gagal diam-diam krn
     modul lupa di-window-expose).
   - State `_checked{itemId:actionType}` MURNI in-memory (bukan `D.*`) —
     sesuai desain: tutup modal tanpa simpan = state hilang (belum
     draft-persist, itu di luar scope Sesi 1B/1C).
   - **Belum ada markup** — ditest lewat unit test murni, belum nempel ke
     DOM apa pun (sesuai breakdown dokumen).
2. **Bundle rebuild** — `app-bundle-a.min.js`/`app-bundle-b.min.js`, versi
   `s779-followup6-fuel-price-deviation-summary` →
   `s780-followup6-fuel-price-deviation-summary` (source) / build number
   **1640 → 1641** (`index.html`, `app_production.html`, `sw.js`
   `CACHE_NAME`). `docs/FILE-MAP.md`/`docs/COVERAGE-PER-MODULE.md`
   diregenerasi otomatis oleh `build.js`.

## Test

`tests/servis-checklist-state-sesi1b.test.js` — 20 test baru:
- `open()` reset state & simpan vehicleId; tidak dibawa antar-buka-modal.
- `toggleItem()` per pola: ganti-saja (Oli Mesin), periksa terkunci
  (Celah Klep), `'none'` (Kompresi Mesin → `'catat'`), periksa-conditional
  (Kampas Rem Depan → default `'periksa'`), toggle ulang (delete lalu isi
  ulang), index di luar batas (`{ok:false}`, tidak throw).
- Busi (`alternate`): tanpa kategori ke-resolve → fallback `'periksa'`;
  kategori ada + 0/1 histori log → `'periksa'`/`'ganti'` (ikut
  `suggestNextBusiAction()` apa adanya); histori kendaraan LAIN tidak ikut
  terhitung (saran per-kendaraan).
- `setActionType()`: override manual valid; gagal kalau item belum
  tercentang; tolak actionType di luar `_validActionTypesFor()` (Oli
  Mesin/Selang Rem terkunci, Busi cuma periksa/ganti).
- `checkedCount()`: per grup independen, berkurang saat uncentang, index
  di luar batas → 0.
- `window.ServisChecklist` ter-expose.

**Hasil: 6053/6053 pass (6033 lama + 20 baru), 0 regresi.**
`verify-window-expose` ✓ (81 modul data-action, semua ter-expose — Sesi
1B belum menambah titik data-action baru, cuma window-expose proaktif).
`verify-bundle-freshness` ✓. `verify-release-ready` LOLOS dengan 2 gate
override manual (lint & minify — eslint/esbuild tidak tersedia di sandbox
ini, sama seperti sesi-sesi sebelumnya; tercatat di
`docs/RELEASE-GATE-LOG.md`). `npm run lint` tetap tidak bisa dijalankan
di sandbox ini — mohon jalankan `npm run lint` di environment W sebelum
deploy.

## Yang BELUM dikerjakan (lanjut ke sesi berikutnya)

- **Sesi 1C** — tombol "☑️ Servis Checklist" + modal/accordion di
  `index.html` (13 `<details>`, checkbox per item, toggle kecil
  "Diperiksa/Diganti" utk item 2-pilihan, badge 🔔 `linkCat:true`),
  sambung ke `ServisChecklist.toggleItem()`/`setActionType()`/
  `checkedCount()` dari sesi ini lewat `data-action`.
- **Sesi 2A/2B** — simpan batch ke `D.servisLogs` + sinkron reminder/
  keuangan (`ServisChecklist.saveAll()`, belum ditulis).
- 3 keputusan W lain yang masih terbuka (tidak menghambat Sesi 1C):
  biaya per-batch dibagi rata/1-baris, Ban Depan `linkCat`, Kampas Rem
  Belakang numpuk kategori atau pisah — lihat
  `BREAKDOWN-SESI-RINGAN-CHECKLIST-UI-30-ITEM.md` bagian akhir.
