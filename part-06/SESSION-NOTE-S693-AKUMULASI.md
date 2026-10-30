# SESSION-NOTE-S693-AKUMULASI — Akumulasi penuh S687→S693 (kartu klik→sumber)

**PENTING — kenapa ZIP ini beda dari `PATCH-v1507-s693-timeline-target-
row-click.zip` yang sempat dikirim sebelumnya:** ZIP sebelumnya dibangun
dari basis `app-main` + S691 + S692 saja — **tanpa sadar kehilangan
wiring S689** (baris `renov-*` → `Renov.openDetail` dan baris Pensiun →
`Pensiun.openSettings` di `TimelineW.render()`, `aset-misc.js`) karena
S691/S692 sendiri tidak menyentuh `aset-misc.js`, jadi versi filenya
yang terbawa adalah versi PRA-S689 dari `app-main.zip` (v1499, basis
lama sebelum S687 sekalipun). **ZIP ini gantikan yang lama sepenuhnya**
— akumulasi PENUH dari S687 sampai S693 di atas `app-main` v1499 asli,
diverifikasi tidak ada satupun fix yang ke-drop. Timpa semua file di ZIP
ini ke project asli, tidak ada langkah lain.

## Rantai sesi yang diakumulasi

| Sesi | Fitur | File utama |
|---|---|---|
| S687 | Collapse 4 kartu (Riwayat Arsip, Siap Pulang, Riwayat Harga, Semua Transaksi) | `modules-render-b.js`, `cobek-order.js` |
| S688 | Klik kartu→sumber: Siap Pulang, Proyeksi Arus Kas 30 Hari | `cobek-order.js`, `modules-render.js` |
| S689 | Linimasa: baris renov→`Renov.openDetail`, baris Pensiun→`Pensiun.openSettings` | `aset-misc.js` |
| S690 | Klik kartu→sumber: 4 kartu Finance Dashboard (Kekayaan Bersih, Arus Kas, Anggaran, Skor Kesehatan) | `finance-dashboard.js` |
| S691 | Cross-dashboard "Total Perhatian Gabungan": split-click 2 span per sumber | `cross-dashboard-card.js`, `finance-dashboard.js`, `styles.css` |
| S692 | Fondasi edit-by-id `openTargetModal(id)` (belum wiring linimasa) | `tx-target.js`, `modals.js`, `modules-render-b.js` |
| S693 | Linimasa: baris target→`openTargetModal(id)` (reuse fondasi S692) | `aset-misc.js` |

## Yang dikerjakan sesi ini (S693, baru)

**`modules/asset/aset-misc.js` — `TimelineW.render()`:** baris dengan
`r.kind==='target'` sekarang dapat `class="u-pointer" data-action=
"openTargetModal" data-args='[id]'`, pola SAMA PERSIS baris `renov-*`
yang sudah ada dari S689 (sekarang di-generalisir lewat lookup table
`ROW_CLICK_ACTION={renov:'Renov.openDetail',target:'openTargetModal'}`
supaya kedua jenis baris satu jalur kode, bukan dua percabangan
terpisah) — reuse `r.id` yang sudah ditambahkan `TimelineW.goals()`
sejak S689 (0 perubahan ke `goals()`/`waterfall()` sesi ini). 0 modal
baru, 0 rumus baru.

**Test:** `tests/s693-timelinew-target-click-tosource.test.js` (5 test)
— **menggantikan & menutup gap** `tests/timeline-w-cardclick-tosource.
test.js` milik S689 yang sengaja tidak pernah ikut ZIP manapun (lihat
SESSION-NOTE-S689): sekarang ketiga jenis baris (target/renov/pensiun)
punya regresi dalam SATU file test yang benar-benar ikut di ZIP. Cek:
baris target dapat `data-action`/`data-args`/class yang benar, beberapa
target sekaligus tidak tertukar id-nya, baris renov & Pensiun **tetap**
dapat wiring S689-nya (regresi eksplisit — inilah yang hilang di ZIP
sebelumnya), dan campuran renov+target dalam 1 render tidak saling
tertukar `data-action`.

## Belum dikerjakan
Semua kandidat dari `AUDIT-RENCANA-kartu-klik-ke-sumber` (GAP #1
finance-dashboard S690, GAP #2 cross-dashboard-card S691, linimasa
renov+pensiun S689, linimasa target S693) sudah selesai. Tidak ada
kandidat baru diketahui.

## Build & Test
- Basis sesi ini = `app-main` v1499 (ZIP asli yang pertama kali
  diupload) + S688 AKUMULASI + S689 AKUMULASI + S690 + S691 + S692,
  digabung berurutan, baru S693 di atasnya — **bukan** basis v1499 +
  S691 + S692 saja seperti ZIP sebelumnya yang salah.
- `node --test tests/*.test.js` → **5236/5236 pass**, 0 fail, 0 regresi.
- `node scripts/build.js s693-akumulasi-timelinew-target-click` → versi
  1499→**1507** (langsung ke versi tertinggi yg pernah dicapai S692,
  bukan naik 1 per sesi krn ini akumulasi banyak sesi sekaligus), kedua
  bundle lolos `node --check`.
- `node scripts/verify-release-ready.js` → **LOLOS** (2 gate di-override
  manual: lint & minify, sandbox tanpa akses jaringan — eslint/esbuild
  tidak terpasang & tidak bisa diinstall; sama seperti sesi-sesi
  sebelumnya, dicatat di `docs/RELEASE-GATE-LOG.md`). Gate html-sync &
  version-sync lolos tanpa override.
- **Catatan lingkungan build:** `app-bundle-a.min.js`/`app-bundle-b.min.js`
  di ZIP ini **belum diminify** (valid & lolos `node --check`, cuma lebih
  besar). Kalau mau reminify: `npm install --save-dev esbuild` di project
  asli lalu build ulang, 0 perubahan kode dibutuhkan.

## File dalam ZIP ini (akumulasi PENUH S687→S693 — 21 file)
`app-bundle-a.min.js`, `app-bundle-b.min.js`, `app_production.html`,
`chat-action-handlers.js`, `index.html`, `modules/asset/aset-misc.js`,
`modules/cross/cross-dashboard-card.js`,
`modules/finance/finance-dashboard.js`, `modules/finance/tx-target.js`,
`modules/shared/features-helpers-global-security.js`,
`modules/shared/modals.js`, `modules/shared/modules-calc.js`,
`modules/shared/modules-render-b.js`, `modules/shared/modules-render.js`,
`modules/shop/cobek-order.js`, `styles.css`, `sw.js`,
`tests/s690-finance-dashboard-cardclick-tosource.test.js`,
`tests/s691-cross-dashboard-card-combinedattention-splitclick.test.js`,
`tests/s692-target-modal-editbyid.test.js`,
`tests/s693-timelinew-target-click-tosource.test.js`.

Diverifikasi: `diff -rq` antara `app-main` v1499 asli vs hasil akumulasi
ini hanya menghasilkan tepat 21 file berbeda di atas (+ 4 file test yang
memang baru) — tidak ada file lain yang ketinggalan/ke-drop tanpa
sengaja.
