# Sesi 344c — AI Recommend actionTargets (pilot: recommendationId jadi tombol jalan)

Lanjutan audit Sesi 344b. Prioritas 🔴 dari daftar audit dikerjakan: `recommendationId`/
`AIDecision.recommend.register()` ADA di engine tapi belum dipakai domain manapun — 2 rule baru
(`product-weight-missing`, `vehicle-capacity-missing`) cuma punya `actions:[...]` berupa teks,
user masih harus cari sendiri ke Etalase/Kelola Kendaraan.

**Temuan tambahan saat audit**: `AIRecommendCard.render()` (ai-chat.js) ternyata **tidak pernah
merender field `actions` sama sekali** — dihitung di `formatRecommendation()` tapi dibuang di UI.
Jadi perbaikannya dua lapis: (1) tampilkan `actions`, (2) untuk 2 rule pilot, jadikan tombol nyata.

## Perubahan

1. `modules/shop/cobek-pricing.js` — rule `product-weight-missing`: action() sekarang juga
   mengembalikan `actionTargets: [{type:'product', id}]`.
2. `modules/vehicle/sparepart-servis.js` — rule `vehicle-capacity-missing`: action() sekarang
   juga mengembalikan `actionTargets: [{type:'vehicle', id}]`.
3. `modules/ai/ai-decision-engine.js` — `actionTargets` di-propagate lewat `rules.evaluate()`,
   `decide()` (real & simulated), dan `formatRecommendation()`. Field opsional (null kalau rule
   tidak menyediakan) — 0 breaking change ke rule lain/test lain (1870 test tetap pass).
4. `ai-chat.js` (`AIRecommendCard`):
   - `runAction(type,id)` baru — cari index by id di `D.products`/`D.vehicles` (bukan simpan
     index langsung, krn bisa berubah di antara `decide()` dan tap tombol), lalu panggil modal
     yang SUDAH ADA (`Etalase.openModal`/`editVehicle`). 0 modal/route baru.
   - `render()` sekarang menampilkan `actions`: kalau ada `actionTargets[i]` dgn type dikenal
     (`product`/`vehicle`) → tombol `data-action="AIRecommendCard.runAction"`. Rule lain (tanpa
     actionTargets) → tetap teks saran biasa, bukan tombol.

## Tidak dikerjakan sesi ini (dari audit yang sama)
- 🟠 Badge persisten di kartu — **ternyata sudah ada** (`weightMissingTag` di cobek-etalase.js,
  `capTag` di vehicle-core.js), jadi di-skip, tidak perlu dikerjakan ulang.
- 🟡 Bulk fill berat produk lama — belum digarap (perlu cek dulu jumlah produk lama yang kena).
- 🟢 Dynamic fields per jenis (Akun, Kelola Kendaraan, SIM, Utang & Piutang, Worth It) — di luar
  scope, existing top-of-mind item.

## Verifikasi
- `node --test tests/*.test.js` → 1870/1870 pass.
- `node --check` pada semua file yang diubah → OK.
- Build: `s344c-ai-recommend-actiontargets` → versi 920, sintaks bundle valid,
  index.html & app_production.html identik.
