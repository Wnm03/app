# Sesi 13 — Tahap 1b: Lazy-load `modules/home/renovasi.js` (build `s13-guard-renov-typeof-checks`, `?v=870`)

## Konteks
Lanjutan Tahap 1a (`docs/SESI-13-GUARD-RENOV-TYPEOF.md`) — semua 7 titik panggilan
`Renov`/`RenovCalc` sudah dibungkus `typeof` guard & regresi hijau. Tahap ini
mengeksekusi rencana `docs/architecture/DESIGN_lazy-load-modules.md`: keluarkan
`renovasi.js` dari bundle, muat on-demand.

## Perubahan
1. **`scripts/build.js`** — `modules/home/renovasi.js` dikeluarkan dari `GROUP_A`
   (tidak lagi ikut ter-bundle ke `app-bundle-a.min.js`).
2. **`index.html`** — tambah `ensureRenov(){return _loadScriptOnce('modules/home/renovasi.js?v=NNN');}`,
   pola sama persis `ensureTesseract()` dkk.
3. **`modules/finance/tx-list-cashflow.js` (`setKeuanganTab`)** — titik "tab ini
   pertama dibuka": cabang `asetproyek` sekarang cek `typeof Renov`; kalau belum
   ada, panggil `ensureRenov()` dulu baru `Renov.render()`, dengan `.catch()`
   yang manggil `window.__moduleLoadFail(...)` (banner error yang sudah ada)
   kalau gagal (mis. offline). Pensiun/SewaKios di baris yang sama TIDAK
   disentuh (masih sinkron seperti sebelumnya).
4. **`app-bootstrap.js`** — **penyesuaian tak terduga**, di luar 4 langkah
   "Mekanisme teknis" di desain: `Object.assign(window,{...})` di sini
   mereferensikan `Renov,RenovAI,RenovCalc` sbg identifier bare bareng puluhan
   modul lain dalam SATU statement. Karena ketiganya sekarang belum tentu
   terdeklarasi saat boot (lazy-load), baris itu bisa `ReferenceError` &
   menggagalkan SELURUH `Object.assign` (termasuk modul lain yang tidak
   berhubungan) — persis skenario yang di-BUGFIX-kan komentar di atasnya untuk
   kasus lain. Fix: keluarkan 3 identifier itu dari daftar.
5. **`modules/home/renovasi.js`** — sebagai gantinya, tambah 1 baris di akhir
   file: `window.Renov=Renov;window.RenovAI=RenovAI;window.RenovCalc=RenovCalc;`
   — modul mendaftarkan diri sendiri ke `window` begitu selesai dimuat (jalan
   sama baik saat lazy-load maupun kalau nanti file ini balik masuk bundle).

## Kenapa titik lazy-load-nya di `setKeuanganTab`, bukan di `renderDashboard()`
`renderDashboard()` (`modules-render.js:1048`, `if(typeof Renov!=='undefined')Renov.render();`)
dipanggil dari puluhan titik `save()` di seluruh app — BUKAN cuma saat user
benar-benar buka fitur Renovasi. Memicu `ensureRenov()` di sana akan bikin
setiap `save()` transaksi apa pun (BBM, belanja, dll) diam-diam fetch
`renovasi.js`, meniadakan tujuan lazy-load. Titik yang benar adalah tempat user
SECARA SADAR membuka tab Aset & Proyek → Proyek Renovasi (`setKeuanganTab('asetproyek')`)
— itu sesuai prinsip desain #2 (0 perubahan urutan/isi render) & pola
`_loadScriptOnce` yang sudah ada (dipicu saat fitur BENAR dipakai).

Titik panggil Renov lain (dashboard live-wiring, `TimelineW.goals()`, ROI
SewaKios, edit/hapus transaksi renov, dll) TETAP hanya dibungkus guard `typeof`
dari Tahap 1a — kalau user belum pernah buka tab Renovasi, titik-titik itu
no-op (skip) sampai `Renov` ke-load, sesuai desain "fallback aman".

## Test
- **Sebelum build**: `npm test` → 1747/1747 PASS.
- **`node scripts/build.js`**: sukses, sintaks kedua bundle valid.
  `app-bundle-a.min.js`: 1048.7 KB (turun dari sebelumnya, ~27 KB isi
  `renovasi.js` sekarang di luar bundle).
- **Sesudah build**: `npm test` → 1747/1747 PASS.

## Status Tahap 1 (lazy-load Renovasi)
- ✅ Tahap 1a (guard) — SELESAI.
- ✅ Tahap 1b (keluarkan dari bundle + `_loadScriptOnce()`) — SELESAI sesi ini.
- ⏳ Verifikasi manual offline (kriteria selesai #4 di desain: buka tab Renovasi
  pertama kali dalam kondisi offline → harus tampil banner jelas, bukan silent
  fail) — BELUM dilakukan di sesi ini (perlu device/browser nyata, di luar
  environment yang tersedia sekarang). Kode `.catch()` + `__moduleLoadFail`
  sudah disiapkan untuk skenario ini.

`BUILD PASS / TEST PASS / ZIP / STOP`
