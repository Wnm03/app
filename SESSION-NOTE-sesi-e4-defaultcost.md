# Session Note — Sesi E4: default cost per `actionType`

## Konteks

Lanjutan Sesi E3 (`SESSION-NOTE-sesi-e3-batchid.md`), dikerjakan dari ZIP
hasil E3 (`PATCH-v1639-sesi-E3-batchid.zip`). Item 4 dari 6 saran tambahan
Sesi E (`ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md` §7).

## Yang dikerjakan

**`car-notes.js`** (`Servis.markServiced`):

1. Blok penentuan `cost` sekarang punya 1 cabang baru: kalau
   `opts.presetCost` **tidak** diisi DAN `actionType` eksplisit `'periksa'`
   atau `'bersih'`, `cost` langsung diset `0` **tanpa** memanggil
   `showPromptModal()`.
2. Urutan prioritas (tidak berubah dari sebelumnya, cuma disisip 1 cabang
   baru di tengah):
   `opts.presetCost` (tertinggi, dipakai `markServicedBatch()`) →
   `actionType==='periksa'||'bersih'` → default `0` tanpa prompt (**baru
   sesi ini**) → selain itu (`'ganti'` atau kosong/undefined) → tetap
   `showPromptModal()` seperti biasa.
3. Tombol "✅ Sudah Servis" lama di kartu Pengingat Servis **selalu**
   dipanggil `markServiced(catId)` tanpa `actionType` → tetap masuk cabang
   prompt lama, **0 regresi**. `actionType==='ganti'` (checklist, dipilih
   eksplisit) juga tetap prompt seperti biasa — cabang baru ini murni utk
   `'periksa'`/`'bersih'`.
4. `markServicedBatch(items)` tidak disentuh — kalau item batch tidak
   mengisi `cost`, tetap lewat jalur lama `opts.presetCost:(it.cost!==
   undefined?it.cost:0)` dari E1 (jadi utk item batch, cost sudah pasti
   `preset`, cabang baru sesi ini tidak pernah kepakai dari jalur batch —
   dikonfirmasi lewat test, 0 logic dobel).

## Test

Baru: `tests/servis-defaultcost-sesi-e4.test.js` (6 test) —
`actionType==='periksa'`/`'bersih'` tanpa `presetCost` → `cost=0`,
`showPromptModal` 0 kali dipanggil; `actionType==='ganti'` & tanpa
`actionType` (tombol lama) → tetap prompt, 0 regresi; `opts.presetCost`
tetap prioritas tertinggi di atas default `actionType` baru; item batch
`actionType==='periksa'` tanpa `cost` eksplisit tetap lewat jalur
`presetCost` batch (bukan cabang baru).

Verifikasi:
- `node --check car-notes.js` → lolos.
- `node --test tests/*.test.js` (seluruh delta zip) → **259/264 pass**
  (naik dari 253/258 E3, +6 test baru semua pass); 5 gagal
  **PRE-EXISTING & TIDAK TERKAIT** — sama persis kegagalan yang sudah
  didokumentasikan berulang di E1/E2/E3 (`ownership-engine.js` tidak ikut
  ter-bundle di delta zip ini, bukan bug sesi ini).
- 0 regresi baru dikonfirmasi: seluruh test lama E1+E2+E3 (`markServiced`/
  `markServicedBatch`/auto-ganti-stock/`batchId`) tetap pass apa adanya.

## Batasan sesi ini

- Sama seperti E1-E3: delta zip, bukan checkout penuh — `scripts/build.js`
  tidak dijalankan, `app-bundle-*.min.js`/`APP_BUILD_VERSION`/`index.html`
  **tidak diupdate**. Perlu digabung ke checkout penuh + build ulang
  sebelum rilis produksi (pola sama sesi-sesi vehicle-DatabaseAPI
  sebelumnya).
- Sengaja **tidak** menambah opsi override (mis. paksa prompt walau
  `actionType==='periksa'`) — di luar scope item 4 roadmap, bisa jadi
  saran terpisah kalau memang dibutuhkan W nanti.

## Rekomendasi sesi berikutnya

Lanjut Sesi E5 (guard "ganti terlalu dini", `_checkTooEarlyGanti`, pakai
placeholder `opts.skipEarlyGuard` dari E1) dari ZIP hasil sesi ini
(`PATCH-v1639-sesi-E4-defaultcost.zip`).
