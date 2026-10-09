# AUDIT S2288 — Boot macet, navigasi tidak respon, toast hilang, berat di Dashboard & Car Notes

Tanggal: 2026-10-09 · Basis: `app-main_14.zip` (build `s2041-1-part-sot-hardening-2285`)
Status: **AUDIT + RENCANA — SEBAGIAN SUDAH DIIMPLEMENTASI (S2288):** Langkah 1, 2, 3, 4, 7a, 7b selesai; Langkah 5, 6, 7c belum. Status terkini & hasil ukur setelah perbaikan: `docs/PERF-REMEDIATION-LOG.md` (log akumulatif).

---

## 1. Ringkasan (baca ini dulu)

Gejala yang Anda lihat — boot macet, halaman tidak bisa digeser/pindah, toast tidak muncul, terasa berat terutama di Dashboard & Car Notes — **bukan lima masalah terpisah**. Semuanya satu penyebab: **main thread terkunci berdetik-detik** oleh perhitungan sinkron. Selama terkunci, browser tidak memproses sentuhan, tidak menggambar toast, dan tidak merender halaman baru.

Penyebab utama (terukur):

1. **Perhitungan servis dihitung ulang berkali-kali tanpa cache.** Render Car Notes dan Dashboard memanggil `predictService → getLastServiceKmForCat → servisLogMatchesCat → ServiceTaxonomySOT` untuk setiap kategori × kendaraan, dan di setiap panggilan *seluruh* daftar komponen taksonomi dibangun ulang (`Object.assign` per item). Biaya naik sebanding dengan jumlah log servis.
2. **`predictService` dipanggil ulang oleh tiap kartu** (`getSummary`, `getInsights`, `maintenanceRisk/Impact/Recommendation`, `computeServiceUrgency`) pada satu kali render, tanpa berbagi hasil.
3. **Bundle JS 3,4 MB di-parse sinkron saat boot** (`document.write`, tanpa `defer`) — satu long task ±5 dtk pada CPU 4× lebih lambat (setara HP menengah).
4. **Self-test otomatis jalan di data asli** 2,5 dtk setelah boot: menyapu semua sub-tab Car Notes dan menekan toast selama berjalan.

---

## 2. Cara pengujian

- Aplikasi dijalankan sungguhan di Chromium (Playwright), viewport 390×844 (mobile + touch), server statis, layar dari `index.html` tanpa modifikasi.
- Data pengguna Anda tidak ada di zip, jadi dipakai **data sintetis** lewat jalur resmi (`kw_setup` + `D` + `save()`, lalu reload). Skala 1× = 3 kendaraan, 3.000 transaksi, 1.200 log BBM, 450 log servis, 1.500 log km, 60 tagihan. Skala 4× = semua ×4.
- Diukur: `PerformanceObserver('longtask')`, waktu `showPage()` sampai 2 frame, CPU profiler CDP (call tree), dan throttling CPU 4×.
- **Batasan jujur:** data sintetis ≠ data Anda; Chromium headless desktop ≠ HP Anda; tidak ada GPU/jaringan nyata. Angka absolut di HP Anda bisa berbeda, tetapi **pola dan akar masalahnya** sama. Verifikasi akhir tetap perlu di perangkat Anda (§7).

---

## 3. Hasil pengukuran

### 3.1 Waktu main thread terkunci saat pindah halaman (CPU desktop, tanpa throttle)

| Aksi | Skala 1× | Skala 4× |
|---|---|---|
| Boot sampai `mainApp` tampil | 0,8 dtk | 1,6 dtk (long task boot 1,17 dtk) |
| Dashboard Hub, kunjungan pertama | 0,29 dtk | 1,09 dtk |
| **Car Notes, kunjungan pertama** | **1,88 dtk** | **9,22 dtk** |
| Dashboard Hub, kunjungan kedua | 0,66 dtk | **2,33 dtk** (lebih lambat dari pertama) |
| Car Notes, kunjungan kedua | 0,02 dtk | 0,02 dtk (ter-cache) |
| Keuangan | 0,04 dtk | 0,15 dtk |

Biaya Car Notes tumbuh ±5× saat data 4× → hampir linear terhadap jumlah log. Pengguna dengan data bertahun-tahun akan makin parah. Kunjungan ke-2 cepat karena ada cache render, tetapi cache itu hilang setiap ada perubahan data (tiap simpan servis/BBM), dan Dashboard tidak punya cache semacam itu.

### 3.2 Simulasi HP menengah (CPU 4× lebih lambat, skala 4×)

- First Contentful Paint: **6,3 dtk** (first paint 0,26 dtk lalu layar kosong).
- Satu long task **5,2 dtk** tepat setelah first paint = parse + eksekusi `app-bundle-a/b.min.js`.
- `showPage('dashboard-hub')`: **4,4 dtk**.

Ini yang terasa sebagai "boot awal stuck": ada 5+ detik di mana layar tidak merespons sentuhan sama sekali.

### 3.3 Call tree CPU saat membuka Car Notes (skala 2×, waktu inklusif)

```
showPage → renderPageContent → renderCnTab → render (4,8 dtk)
  └ predictService                        4,69 dtk
      └ getLastServiceKmForCat            4,33 dtk   <- per kategori × kendaraan
          └ servisLogMatchesCat → resolve komponen
              └ ServiceTaxonomySOT.components()   3,4 dtk   <- membangun ulang daftar tiap panggilan
  └ _briefingHtml → getSummary → maintenanceImpact → _serviceStatus → predictService  (lagi)
  └ getInsights → maintenanceRisk / _maintenanceInsight → computeServiceUrgency       (lagi)
```

---

## 4. Temuan, urut prioritas

| # | Temuan | Dampak | Bukti | Lokasi sumber |
|---|---|---|---|---|
| **F1** | `components()`, `categories()`, `componentById()` membangun ulang daftar (clone `Object.assign` per item) di **setiap** panggilan; `componentById` linear `.find` | Hotspot #1 CPU (±70% waktu Car Notes) | Profil §3.3; prototipe §5 | `modules/vehicle/service-taxonomy-sot.js` (juga pola sama di `service-input-catalog.js: itemById/infer`) |
| **F2** | `getLastServiceKmForCat` memanggil `historyRows()` (proyeksi seluruh log kendaraan), `.filter(servisLogMatchesCat)`, lalu **sort penuh** hanya untuk mengambil 1 elemen; dipanggil per kategori | O(kategori × log × biaya resolve) | Profil §3.3 | `modules/vehicle/servis-b.js:215`; wrapper `sparepart-servis-b.js:554` |
| **F3** | `predictService` dipanggil berulang oleh `getSummary`, `getInsights`, `maintenanceRisk`, `maintenanceImpact`, `maintenanceRecommendation`, `computeServiceUrgency` pada satu render; juga memanggil `normalizeLegacyServiceLogs()` di setiap panggilan | Hasil identik dihitung 4–6× per render | Profil setelah fix F1 masih 2,4 dtk di `predictService` | `modules/vehicle/sparepart-servis-b.js:595`; konsumen di `vehicle-intelligence`, `vehicle-insight-*`, `vehicle-analytics-presenter` |
| **F4** | Bundle 1,0 MB + 2,4 MB dimuat sinkron lewat `document.write` di `bundle-load-guard.js`, plus 100+ modal di-`document.write` | Layar kosong ≥5 dtk di HP menengah; tidak ada indikator loading | §3.2 | `index.html`, `modules/shared/bundle-load-guard.js`, `modules/shared/modal-write.js` |
| **F5** | Self-test otomatis (`boot-early.js`, `setTimeout 2500`) jalan di **data asli**: menyapu semua sub-tab Car Notes (`self-test-cases-b.js:613-629`), mengganti `D.bbmLogs` sementara & render ulang (`self-test-cases-a.js:852-862`), bahkan menyentuh `kw_pin`/`kw_v4`/`D.profile.apiKey` + `saveFlush()` (`self-test-cases-b.js:160-180`). Toast ditekan sepanjang proses (`setToastSuppressed(true)`) | Beku tepat saat Anda mulai memakai app; toast hilang; **risiko data** bila crash di tengah | Call tree profil awal memuat `computeSelfTestResults → renderCnTab`; kode `self-test.js:88-99` | `self-test.js`, `modules/shared/self-test-cases-*.js`, `boot-early.js:134` |
| **F6** | Auto self-test **crash dengan `TypeError ... reading 'name'`** (`self-test.js:95`) pada profil kosong sehingga `kw_selftest_build` tidak pernah ditulis → dianggap belum jalan → **diulang setiap boot** | Beban berulang tiap buka app (perlu diverifikasi di profil Anda: cek `localStorage.kw_selftest_build`) | Log console + `kw_selftest_build = null` setelah 6 dtk | `self-test.js:93-96` (handler `catch` mengakses `c.name` dan bisa melempar lagi) |
| **F7** | Dashboard tidak punya cache render dan merender ulang kartu servis/insight pada kunjungan ke-2 (lebih lambat dari ke-1) | Terasa "berat" saat bolak-balik tab bawah | §3.1 | `modules/dashboard-hub/*`, `renderPageContent` di bundle-a |
| **F8** | `_loadScriptOnce` retry memuat ulang file yang sama → `SyntaxError: Identifier 'BusinessIntelligencePresenter' has already been declared` (global error/banner) | Banner error palsu, modul bisa gagal | Terjadi di semua run | `modules/shared/boot-early.js` (`_loadScriptOnce`), `business-intelligence-presenter.js` |
| **F9** | `smoke-test` dev melaporkan 71 ID DOM hilang & 31 `data-action` tak ter-expose (mis. `Renov.*`, `SewaKios.*`, `ShopPdfImportUI.open`) dan **menampilkan banner merah "[DEV]"** ke pengguna | Gangguan UI; sebagian tombol "diam" bila modul lazy belum termuat | Banner pada screenshot boot | `modules/shared/smoke-test.js` |
| **F10** | Tidak ada handler swipe-antar-halaman di kode (hanya `enableSwipeToDismiss` untuk 2 modal). "Tidak bisa digeser" = scroll/sentuhan tidak diproses karena main thread terkunci (F1–F5), bukan bug gestur | — | `grep` seluruh modul | — |

Catatan kecil yang diperiksa dan **bukan** penyebab: touch listener memakai `passive:true` kecuali satu delegasi `.suggest-item` (aman); `touch-action: pan-y` wajar; Service Worker `skipWaiting` + `no-cache` tidak memblokir render.

---

## 5. Validasi prototipe (bukan di kode produksi)

Di salinan terpisah (`proto/`), F1 saja ditambal: cache `categories()`/`components()` (invalidasi bila referensi/jumlah `SERVICE_CHECKLIST_GROUPS` berubah) dan `componentById` lewat `Map`. Build lewat `scripts/build.js` lolos. Hasil skala 4×, perbandingan sebelum → sesudah:

| Aksi | Sebelum | Sesudah F1 saja |
|---|---|---|
| Car Notes, kunjungan pertama | 9,22 dtk | **2,46 dtk** (−73%) |
| Dashboard Hub, kunjungan kedua | 2,33 dtk | **0,91 dtk** (−61%) |
| Dashboard Hub, kunjungan pertama | 1,09 dtk | 0,40 dtk |

Sisa 2,4 dtk di Car Notes setelah F1 ada di `predictService` berulang (F3) dan `getLastServiceKmForCat` (F2) — itu target langkah berikutnya. Diff prototipe: ±32 baris di `service-taxonomy-sot.js`. **Belum** dijalankan `npm test`/lint; wajib sebelum dipakai (lihat §6, langkah 1).

---

## 6. Rencana perbaikan (urut eksekusi, satu langkah = satu sesi/ZIP sesuai `SESSION_RULES.md`)

Aturan umum: edit **source** (bukan `*.min.js`), lalu `npm run check` → `npm run build` → ZIP lewat `npm run release`. Jangan ubah urutan `build.js`.

### Langkah 1 — Cache taksonomi (F1) · risiko rendah · dampak terbesar
- `service-taxonomy-sot.js`: cache `categories()`, `components()`, `Map` untuk `componentById`/`categoryById`; invalidasi saat `SERVICE_CHECKLIST_GROUPS` berganti (identitas array + jumlah item), plus `ServiceTaxonomySOT.invalidate()` eksplisit untuk tes.
- `service-input-catalog.js`: indeks `Map` untuk `itemById`, dan memoisasi `infer()` per string.
- **Cek keamanan:** pastikan tidak ada pemanggil yang memutasi array/objek hasil (`grep` pemakai `components()`/`categories()`); bila ada, kembalikan `Object.freeze` atau salinan dangkal hanya di jalur yang memutasi.
- **Target:** Car Notes pertama ≤ 2,5 dtk di skala 4× (sudah terbukti di prototipe).

### Langkah 2 — `getLastServiceKmForCat` tanpa sort penuh (F2)
- Ganti `filter + sort + logs[0]` dengan satu lintasan yang mencari elemen "terbaru" memakai `compareServiceHistoryRecency` (O(n), tanpa alokasi array).
- Indeks `Map<kendaraan, baris-riwayat>` per "versi data" (lihat Langkah 3) supaya `historyRows()` tidak memproyeksi ulang tiap kategori.
- **Target:** `getLastServiceKmForCat` < 20% dari waktu render Car Notes.

### Langkah 3 — Cache `predictService` per versi data (F3)
- Tambah penghitung versi ringan (`D.__rev`) yang naik di `save()`/mutasi servis, BBM, kategori sparepart, km. Cache `predictService({vehicleId,categoryId})` dengan kunci `vehicleId|categoryId|rev`; bersihkan saat `rev` berubah.
- Panggil `normalizeLegacyServiceLogs()` sekali per `rev`, bukan setiap panggilan.
- `computeServiceUrgency` menerima `historyRows` yang sudah dihitung (parameternya sudah ada) dari pemanggil.
- Hindari cache usang: tes bahwa tambah/ubah/hapus servis dan ubah interval langsung terlihat di Car Notes & Dashboard.
- **Target:** Car Notes pertama ≤ 0,8 dtk, Dashboard ≤ 0,5 dtk di skala 4×.

### Langkah 4 — Self-test jangan menyentuh data asli & tidak saat boot (F5, F6)
- Jalankan auto self-test hanya (a) saat idle (`requestIdleCallback`, ≥ 30 dtk setelah boot) **dan** (b) hanya bila pengguna belum berinteraksi, atau pindahkan sepenuhnya ke tombol manual di Pengaturan → Diagnostik. Rekomendasi: **matikan auto-run** untuk build produksi.
- Perbaiki `self-test.js:95`: `catch` jangan mengakses properti `c` tanpa guard (`c&&c.name`), dan tulis `kw_selftest_build` di `finally` agar tidak diulang tiap boot.
- Kasus uji yang mengubah `kw_pin`/`kw_v4`/`D.profile.apiKey` dan `saveFlush()` harus memakai snapshot data terpisah, bukan `D` hidup.
- Tampilkan toast ringkasan bila tes dijalankan manual saja.
- **Target:** tidak ada long task > 200 ms antara detik 2 dan 30 setelah boot; `kw_selftest_build` terisi setelah run pertama.

### Langkah 5 — Boot tidak memblokir render (F4)
- Tambah splash/skeleton HTML statis + CSS inline tipis di `index.html` yang tampil di first paint (tanpa menunggu bundle) dan disembunyikan saat `mainApp` tampil.
- Ganti `document.write` bundle dengan `<script defer>` berurutan, tetap menjaga urutan A → modal-write → B (uji urutan dengan `verify-bundle`/`release-check`). Bila `document.write` modal terlalu terikat, **minimal** pecah bundle-b (2,4 MB) menjadi inti + modul lazy (mekanisme `ensure*` sudah ada) untuk modul yang jarang dipakai (Shop, Pajak, Aset-lanjut, AI).
- **Target (CPU 4×):** FCP ≤ 2 dtk dengan splash; long task tunggal boot ≤ 1,5 dtk.

### Langkah 6 — Render halaman tidak memblokir input (F7, UX)
- Di `showPage`, tampilkan kerangka halaman + indikator "memuat…" dulu, lalu render kartu berat dalam potongan lewat `requestAnimationFrame`/`scheduler.postTask` atau `requestIdleCallback` (kartu insight/prediksi belakangan, daftar panjang dengan batas awal 50 baris + "muat lagi").
- Cache render Dashboard dengan kunci `rev` dari Langkah 3.
- Pastikan `toast()` bisa tampil: tidak ada loop sinkron > 50 ms di jalur klik → toast.
- **Target:** input-ke-respons (INP) < 200 ms saat pindah tab bawah.

### Langkah 7 — Bersih-bersih (F8, F9)
- `_loadScriptOnce`: sebelum retry, cek apakah skrip sudah dieksekusi (flag `window.__loaded_<modul>`), jangan memuat ulang bila sudah ada; bungkus `business-intelligence-presenter.js` dalam IIFE/`var` agar idempoten.
- `smoke-test.js`: sembunyikan banner "[DEV]" di produksi (hanya bila `?debug=1`); daftarkan `Renov`, `SewaKios`, `ShopPdfImportUI` ke whitelist lazy atau perbaiki pendaftaran `window`-nya.

---

## 7. Cara memverifikasi (di perangkat Anda dan di CI)

1. `npm run check` (lint + `verify-window-expose` + `npm test` + build) harus hijau setelah tiap langkah. Jalankan juga `npm run audit:carnotes-performance` dan `npm run test:e2e`.
2. Chrome DevTools → Performance, CPU throttling 4×, rekam: buka app → Dashboard → Car Notes → Dashboard. Tidak boleh ada long task > 500 ms setelah first paint; catat FCP, TBT, INP.
3. Di Console HP/Chrome Anda (opsional, untuk data asli): jalankan
   `new PerformanceObserver(l=>l.getEntries().forEach(e=>console.log('LONG',Math.round(e.duration))) ).observe({entryTypes:['longtask']})`
   lalu buka Car Notes. Kirim angkanya bila masih lambat setelah Langkah 1–3; angka dari data asli akan menentukan apakah Langkah 4–6 perlu didahulukan.
4. Cek `localStorage.kw_selftest_build` di perangkat Anda: bila **kosong/berbeda** dari `APP_BUILD_VERSION`, F6 ikut menyumbang.
5. Regresi fungsional yang wajib lolos: tambah/ubah/hapus servis → pengingat dan Dashboard langsung berubah; ganti kendaraan; `test:critical`.

## 8. Urutan yang disarankan & estimasi dampak

| Setelah langkah | Perkiraan Car Notes pertama (skala 4×, CPU desktop) | Catatan |
|---|---|---|
| Sekarang | 9,2 dtk | terukur |
| 1 | 2,5 dtk | terukur di prototipe |
| 1+2+3 | < 0,8 dtk | **target**, belum terukur |
| 4 | menghilangkan beku 2,5 dtk setelah boot & toast tertekan | |
| 5 | FCP di HP menengah dari 6,3 dtk ke ≤ 2 dtk | **target** |

Mulai dari Langkah 1 (paling kecil, paling berdampak, sudah tervalidasi), lalu 4 (menghilangkan risiko data & beku saat boot), lalu 2–3, 5, 6, 7.
