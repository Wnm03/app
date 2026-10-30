# PATCH (AKUMULASI) — v1516 (label build "s703-akumulasi-collapse-26kartu")

Patch ini **menumpuk (akumulasi)** di atas kedua patch sebelumnya
(`patch-s700-zakatable-owner-autofill`, v1513 dan
`patch-s701-laporan-collapse-fix-stray-comment`, v1514) — **kedua fix
lama tidak hilang**, tetap aktif & sudah diverifikasi lolos test yang
sama. Upload patch ini menggantikan yang lama; tidak perlu upload
ketiga-tiganya.

## Fitur baru: Collapse di 26 kartu sisa (Shop, Catatan Kendaraan, Aset, Dashboard Hub)
Hasil audit Anda (39 kartu bergaya "Finance Dashboard", `dashhub-wrap`+
`findash-grid`) — 13 sudah collapsible sebelum patch ini (10 Laporan +
3 BBM), **26 sisanya sekarang SEMUA bisa collapse (tap header)**:

| Tab | Kartu (26) |
|---|---|
| **Shop** (3) | Shop Business Engine, Pengiriman Shop, Alur Bisnis Shop |
| **Catatan Kendaraan** (6) | Vehicle Dashboard, Vehicle Insight, Vehicle Attention, Vehicle Analytics, Vehicle Automation, Fuel Intelligence |
| **Aset** (4) | Property Management, Rental Management, Asset Portfolio, Asset Maintenance |
| **Dashboard Hub / Beranda** (13) | Dashboard Hub*, Life OS, Kondisi Ekonomi, Dana Kelolaan, Shop (mini), Finance & Vehicle Cross Summary, Cross Brief, Finance & Vehicle Insight, Personal Overview, Cross Module Widgets, Life Priority, Recommendation Panel, Action Queue |

`*` **Dashboard Hub** ("🗂️ Semua Fitur", `#dashboardHubWrap`) ternyata
**sudah collapsible** dari sesi lama lewat kartu pembungkusnya
(`#dashHubMainGridCard`, toggle `dashHubMainGrid`) — jadi TIDAK
disentuh lagi di patch ini, supaya tidak ada 2 collapse bertumpuk di
kartu yang sama. Sudah dicek: tap headernya ("🗂️ Semua Fitur") memang
collapse/expand seisi Dashboard Hub grid.

Juga ditemukan **Vehicle Analytics** sebenarnya sudah punya markup
collapse dari sesi lama, TAPI cuma area ikon chevron kecil yang bisa
di-tap (bukan seluruh header seperti kartu lain) — kemungkinan itu
sebabnya tidak masuk hitungan audit Anda. Sekarang seluruh headernya
ikut bisa di-tap, konsisten dengan kartu lain.

### 100% reuse — tidak ada CSS/JS mekanisme baru
Semua 26 kartu pakai **mekanisme yang sudah ada**:
`toggleCardCollapse()` + class `.card-collapse-toggle`/
`.card-collapse-body` (`modules/shared/modal-navigasi.js`), pola
markup `.dashhub-cat-head`+`data-action="toggleCardCollapse"` yang
sudah dipakai kartu Laporan (patch s701) & ~50 kartu lain di app ini.
Status buka/tutup ikut ter-persist ke `localStorage.cardCollapsePrefs`
otomatis (mekanisme lama).

### 2 pola implementasi, tergantung jenis kartu:
1. **Kartu dgn header statis** (mayoritas, 19 kartu) — index.html murni
   ditambah `data-action`/`.card-collapse-toggle`/`.card-collapse-body`
   di sekitar markup yang sudah ada, PERSIS pola s701. 0 file JS
   presenter disentuh.
2. **Kartu dgn konten 100% dinamis, judulnya dulu ditulis di dalam
   `innerHTML` presenter** (7 kartu: Vehicle Attention, Fuel
   Intelligence, Cross Brief, Personal Overview, Life Priority,
   Recommendation Panel, Action Queue) — judulnya **DIPINDAH** ke
   markup statis HTML (supaya bisa jadi header collapse), lalu baris
   judul di `innerHTML` presenter terkait **dihapus** (bukan diubah
   rumus/datanya, murni presentasi). File yang disentuh:
   - `modules/vehicle/vehicle-attention-presenter.js` — judul "🧭 Perlu
     Perhatian" dipindah; pola SILENT (sembunyi kalau kosong) sekarang
     menyembunyikan `#vehAttentionWrap` (dulu cuma mengosongkan body),
     supaya card tidak nongol kosong dgn header baru.
   - `modules/vehicle/fuel-card.js` — **TIDAK disentuh sama sekali**,
     judulnya memang belum ada di situ, tinggal ditambah header statis
     di index.html.
   - `modules/cross/unified-briefing-presenter.js` — judul "📋
     Ringkasan Harian…" dipindah KHUSUS utk `#crossBriefBody` (kartu
     Dashboard Hub). Container KEDUA `#aiUnifiedBriefBody` (kartu "🧭
     Penasihat" di AI Chat, bukan Dashboard Hub, TIDAK collapsible)
     **tetap dapat versi lengkap dgn judul di dalamnya** — 0 perubahan
     tampilan di sana, `generate()` tetap dipanggil 1x seperti
     sebelumnya (dicek test `satu kali generate()...` masih hijau).
   - `modules/cross/personal-overview-presenter.js`,
     `modules/cross/life-priority-panel.js`,
     `modules/cross/recommendation-panel.js`,
     `modules/cross/action-queue.js` — judul masing2 dipindah ke
     markup statis (Action Queue: jumlah item yang tadinya di judul
     sekarang jadi baris kecil pertama di body, TIDAK hilang).
   - **Dicek dulu**: tidak ada test yang assert teks judul lama di
     kelima file ini (grep `tests/`), jadi aman dihapus dari JS.

## Fix sebelumnya (tetap aktif, tidak diubah rumusnya)
- S700: toggle "Hitung ke Zakat Maal" auto-set Kepemilikan "Milik
  Sendiri" (`modules/asset/aset.js`).
- S701: 10 kartu Laporan Keuangan collapsible + fix komentar HTML
  bocor tampil di layar.

## File yang berubah di patch ini (akumulasi ketiga sesi)
- `index.html` / `app_production.html` — 26 kartu baru jadi
  collapsible (+ tetap bawa fix s700/s701). Versi disamakan ke v1516.
- `sw.js` — `CACHE_NAME` → `kw-cache-v1516`.
- `app-bundle-a.min.js` / `app-bundle-b.min.js` — hasil
  `node scripts/build.js` (source terbaru, termasuk s700/s701/s702).
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js` — konstanta versi disamakan
  (`s701-…` → `s703-akumulasi-collapse-26kartu`, dinaikkan otomatis
  oleh `scripts/build.js` sendiri saat mendeteksi versi baru), 0 logic
  lain diubah.
- `modules/asset/aset.js` — disertakan ulang APA ADANYA (fix zakat s700,
  tidak diubah lagi) supaya patch ini lengkap/berdiri sendiri.
- `modules/vehicle/vehicle-attention-presenter.js`,
  `modules/cross/{action-queue,life-priority-panel,
  personal-overview-presenter,recommendation-panel,
  unified-briefing-presenter}.js` — judul dipindah ke markup statis
  (lihat detail di atas), 0 rumus/skoring/data yang berubah.
- `tests/asset-zakatable-owner-autofill.test.js` — disertakan ulang
  (tidak diubah), fix zakat s700 tidak hilang saat upload.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — diregenerasi
  otomatis oleh build.

## ⚠️ Catatan build (esbuild tidak tersedia di environment ini)
Sama seperti s701: `app-bundle-a.min.js`/`app-bundle-b.min.js` dibangun
ulang **TANPA minifikasi** (esbuild tidak bisa di-install di sandbox
tanpa akses internet), ukurannya lebih besar dari build produksi
biasa. Isinya **100% valid & lolos `node --check` + full test suite**.
Kalau ukuran kecil penting:
```
npm install --save-dev esbuild
node scripts/build.js
```
lalu upload ulang kedua file bundle hasilnya.

## Test
Full suite: **5276/5276 pass, 0 fail** — 0 regresi (termasuk test zakat
s700 & seluruh test cross/*.js, vehicle-attention-presenter, fuel-card
yang disentuh sesi ini — semuanya cuma assert isi body/data, tidak ada
yang assert teks judul lama, jadi aman).

## Cara pakai
Upload/timpa SEMUA file di zip ini ke lokasi yang sama persis di
project (struktur folder di zip = struktur folder project). Jangan
cuma upload `index.html` saja — bundle (`app-bundle-*.min.js`), 5 file
versi-konstanta, 5 file presenter cross/vehicle, & versi
(`app_production.html`/`sw.js`) harus ikut ditimpa supaya ke-26 kartu
benar-benar collapse & versi cache tidak tabrakan.
