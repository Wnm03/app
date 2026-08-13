# SESI 590 — Fix: Tombol "Hapus" di Menu Aksi Aset Ketutup Nav Bawah

## Laporan
User laporan (dgn screenshot): modal "⋮" aksi aset (mis. "Majoris") — baris
tombol "🗑 Hapus" ketutup nav bawah (Beranda/Uang/Shop/Aset/Mobil/Pajak),
terjadi PAS DIPAKAI LANGSUNG (dikonfirmasi user, bukan cuma di layar
recent-apps Android), dan tetap terjadi walau patch v1316 (cache-bump
sesi sebelumnya) sudah di-upload & app sudah di-refresh.

## Root cause
`showMain()` (`modules/shared/features-helpers-global-security.js`, dipanggil
SEKALI saat app pertama dibuka/PIN benar) men-set **inline style**
`mn.style.display='flex'` ke `#mainNav`. Inline style pada elemen SELALU
menang lawan rule stylesheet apa pun — KECUALI rule itu pakai `!important`.

Rule `body.has-open-modal .nav { display: none; }` (styles.css) — yang
ditoggle `_syncNavVisibilityForModals()` tiap `openQS()`/`openModal()`
(modal-navigasi.js) — **tidak** pakai `!important` sebelum fix ini. Jadi:
- Class `has-open-modal` di `<body>` toggle dengan BENAR (JS-nya tidak bug).
- Tapi efek visualnya KALAH TOTAL lawan inline style yang sudah lebih dulu
  terpasang showMain() — nav TIDAK PERNAH benar-benar hilang lagi sejak app
  pertama dibuka, di modal MANAPUN yang pakai mekanisme has-open-modal ini
  (bukan cuma qsAssetActions — berpotensi semua modal/qs-sheet lain juga
  kena, walau laporan user spesifik soal aksi aset).

Ini juga menjelaskan kenapa v1316 (cache-bump sesi lalu) tidak menyelesaikan
masalah user: itu memang bug lain (versi bundle basi), sudah benar diperbaiki,
tapi bug INI independen & tetap ada di source bahkan setelah v1316.

## Fix
1 baris CSS di `styles.css`, tambah `!important`:
```css
body.has-open-modal .nav { display: none !important; }
```
`showMain()` / inline style-nya SAMA SEKALI tidak disentuh (0 risiko ke titik
lain yg bergantung ke `display:flex` awal itu — `!important` pada stylesheet
rule menang lawan inline style TANPA `!important`, sesuai spesifikasi CSS
cascade, jadi cukup di sisi CSS saja).

## File disentuh
- `styles.css` (1 rule, +`!important`)
- `tests/nav-hidden-modal-inline-style-override-s590.test.js` (baru, 3 test)
- Version bump otomatis via `scripts/bump-version.sh`: v1317 → **v1318**
  (`index.html`, `app_production.html`, `sw.js`)

## Verifikasi
- Test baru: **3/3 pass**.
- Full `npm test`: **4147 test, 4056 pass, 91 fail** — identik dgn baseline
  sebelum sesi ini (91 fail pre-existing, tidak tersentuh), **0 regresi
  baru**.
- `node scripts/verify-release-ready.js` → Gate version-sync (S588) lolos:
  `✓ GATE version-sync: index.html (?v=1318) & sw.js (CACHE_NAME) sinkron.`
  (Gate lint/minify gagal di sandbox ini murni krn eslint/esbuild belum
  terpasang — tidak berkaitan dgn patch ini.)

## Catatan utk sesi berikutnya
Cek modal-modal lain yang mengandalkan `has-open-modal` (scanner overlay,
dialog konfirmasi, dll) — kemungkinan semua otomatis IKUT terlindungi oleh
fix `!important` ini (1 rule global), tapi belum ada audit eksplisit
menyeluruh di luar kasus nav vs qsAssetActions yang dilaporkan user.
