# Sesi C — Aset non-core: `asset.updated` di `aset-emas-impor.js` & `aset-reports.js` (v1676)

> ROADMAP-KONSOLIDASI-DATABASE-SERVIS-v2.md §2j urutan poin 2 — domain
> besar TERAKHIR Sesi C Prioritas Sedang yang masih 0% Event Bus
> (`AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` temuan #9, "Aset —
> bagian non-`aset.js`"). `aset-misc.js` (2/4 titik relevan) sudah
> ditutup sesi `investasi.js` dasar (v1674, lewat `investment.updated`
> krn domainnya holding/investasi) — sesi ini menutup 2 file "adjacent"
> terakhir yang masih menulis `D.assets` tanpa emit.

## Kode

2 titik emit `asset.updated` baru (pola **tanpa** wrapper `kind`/`action`
— beda dari `finance.updated`/`product.updated`/`investment.updated`,
domain `asset.updated` sejak awal (`aset.js`/`aset-owners.js`) pakai
field langsung, bukan wrapper):

- `modules/asset/aset-emas-impor.js` — `GoldImport.commit()`: setelah
  `save()`, emit `AIBus.emit("asset.updated",{imported:count})` (1x per
  commit, batch — bukan per-item, konsisten pola batch
  `migrateAssetInvestmentsToHoldings()` di `aset-misc.js`, v1674).
- `modules/asset/aset-reports.js` — `Penyusutan.toggleAktif(id)` &
  `Penyusutan.updateParam(id,field,rawValue)`: setelah `save()`, emit
  `AIBus.emit("asset.updated",{penyusutanUpdated:true,editId:id})` —
  payload pola sama `aset-owners.js`
  (`{ownersUpdated:true,editId}`).

Listener `AIService.wireEvents()` sudah subscribe `asset.updated` sejak
sesi wiring sebelumnya — 0 perubahan listener. **0 field/skema data
diubah. 0 titik baca lama disentuh.**

## Keputusan produk — 2 write point SENGAJA tidak diberi event

Audit menghitung "aset-emas-impor.js (2x)" dan "aset-reports.js (3x)"
`save()` — tapi masing-masing 1 titik di antaranya murni **pengaturan
global**, bukan data per-aset transaksional:

- `GoldZakat.onHargaInput()` (`aset-emas-impor.js`) — nulis
  `D.goldZakatSettings.hargaPerGram24k` (harga acuan emas per gram,
  dipakai kalkulator zakat maal emas).
- `PajakAset.updateSetting()` (`aset-reports.js`) — nulis
  `D.pajakAsetSettings` (NJOPTKP/tarif PBB, 1 setting global lintas
  aset, bukan per-aset).

Keduanya konsisten kategori "Ditandai RENDAH" di
`AUDIT-SESI-C-EVENTBUS-D-WRITES-NO-EMIT.md` (pengaturan lokal/global,
0 konsumen lintas-modul yang masuk akal) — sama seperti
`format-tema.js`/`features-helpers-global-security.js` yang memang
sengaja tidak direkomendasikan dapat event. Keputusan diambil sekarang
(bukan ditunda) krn 100% mengikuti kriteria yang sudah eksplisit di
audit, bukan soal skema data baru.

## Test

- Baru: `tests/aset-goldimport-aibus-emit-sesi-c.test.js` (4 test) —
  commit sukses emit `{imported:N}`, guard 0-item tidak emit, AIBus
  tidak ada tidak throw, `GoldZakat.onHargaInput()` tidak emit apa pun.
- Baru: `tests/aset-reports-penyusutan-aibus-emit-sesi-c.test.js`
  (6 test) — `toggleAktif()`/`updateParam()` emit dgn payload benar,
  guard id/`.penyusutan` tidak ada tidak emit, AIBus tidak ada tidak
  throw, `PajakAset.updateSetting()` tidak emit apa pun.
- **10/10 test baru pass.**
- Full suite (`node --test tests/*.test.js`), sebelum `build.js`:
  **6480 test, 6476 pass, 4 fail** — 4 kegagalan 100% pre-existing
  (`verify-release-ready`, `checkBundleFreshness`, 2× S468d/txHTML
  virtual-bill), **0 regresi baru dari sesi ini**.
- Setelah `node scripts/build.js` dijalankan ulang: **6480 test, 6478
  pass, 2 fail** — 2 gate (`verify-release-ready`/
  `checkBundleFreshness`) yang sempat gagal di run sebelum build kini
  **lolos** (state bundle sudah segar); 2 kegagalan S468d/txHTML
  virtual-bill tetap ada, pre-existing sejak v1673, di luar cakupan
  sesi ini.

### Build & release gate

- `node scripts/build.js` — sukses. Versi source bump otomatis
  `...-1675` → `...-1676`; versi numerik `?v=` bump `1650` → `1651`.
  Bundle TANPA minifikasi (esbuild tidak tersedia di sandbox), sintaks
  lolos `node --check`.
- `node scripts/verify-window-expose.js` — OK, 81 modul.
- `node scripts/verify-bundle-freshness.js` — OK, kedua bundle segar.
- `node scripts/verify-release-ready.js` — lolos via override manual
  (`CONFIRM_LINT_UNAVAILABLE_REASON`/`CONFIRM_UNMINIFIED_REASON`,
  sandbox tanpa akses jaringan, sama seperti sesi-sesi sebelumnya).
  `docs/RELEASE-GATE-LOG.md` diperbarui otomatis oleh script.
- Peringatan oversized-file (6 file, tidak berubah dari sebelum sesi
  ini — `aset-reports.js`/`aset-emas-impor.js` TIDAK masuk daftar,
  delta penambahan sesi ini kecil) tidak menggagalkan build.

## Sengaja TIDAK dikerjakan sesi ini

- Perbaikan 7 gap harness
  `investasi-dasar-aibus-investment-updated-sesi-c.test.js` (v1674,
  tetap ditunda atas instruksi W) — item #1 di urutan rekomendasi
  §2j, butuh konfirmasi W dulu sebelum dikerjakan, di luar scope sesi
  ini.
- Sesi F lanjutan (thumbnail/lightbox), gate wajib version-bump di
  `scripts/build.js` — 2 item lain di urutan §2j, ditunda ke sesi
  masing-masing.

**Belum dikerjakan:** perbaikan 7 gap harness v1674 (nunggu konfirmasi
W), Sesi F lanjutan, gate version-bump wajib.

**Skor update:** Sesi C Prioritas Sedang — **Aset non-core TUNTAS**
(2/2 domain terakhir: `aset-emas-impor.js` + `aset-reports.js`). Semua
5 domain Sesi C Prioritas Sedang kini **TUNTAS**: Shop/Cobek (v1662),
Dana Titipan (v1671-1672), `investasi.js` dasar (v1674, minus 7 gap
harness yang ditunda), Aset non-core (v1676, sesi ini). Prioritas
Sedang Sesi C secara keseluruhan **selesai** kecuali 7 gap harness
v1674 yang menunggu keputusan W.
