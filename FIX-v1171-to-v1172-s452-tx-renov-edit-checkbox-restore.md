# FIX v1171 → v1172 (s452) — Centang "🔨 Catat juga ke Proyek Renovasi?" Hilang Saat Transaksi Dibuka Ulang

## Laporan user
Screenshot: modal Edit Transaksi kategori "Renov" > "kamar mandi", akun
Majoris, Tunai, "Bayar: closet ina". User sudah centang "🔨 Catat juga ke
Proyek Renovasi?" waktu simpan pertama kali — berhasil, item-nya benar
nongol di fitur Proyek Renovasi. Tapi begitu transaksi yang sama dibuka lagi
lewat Edit, centangnya tampil KOSONG lagi, seolah tidak pernah dicentang.

## Root cause
`editTx()` (modules/finance/transaksi.js) mengisi ulang SEMUA field form
dari data transaksi yang sedang diedit (`t`) — tapi utk panel Renov,
checkbox `#txAddRenov` SELALU dipaksa `checked=false` tanpa syarat apapun:

```js
const renovChkEdit=document.getElementById('txAddRenov');
if(renovChkEdit)renovChkEdit.checked=false;
```

Beda dgn panel serupa lain di baris-baris tepat di bawahnya (`shopChk` utk
"Tambah ke Stok Sparepart Shop juga?", `bbmChk` utk sinkron BBM) yang
memang mengecek dulu apakah transaksi ini punya link data sebelum
menentukan status checkbox (mis. `hasShopStock`/`linkedBbm`). Panel Renov
tidak pernah dicek balik ke `t.renovProjectLinkId`/`t.renovItemLinkId`
(dua field yang justru sudah benar diisi oleh `applyTxRenovFromTx()` waktu
transaksi pertama kali disimpan — datanya sendiri TIDAK hilang, cuma
representasi checkbox di form Edit yang tidak pernah disinkronkan balik).

## Fix
`editTx()`: sebelum menentukan status checkbox, cari dulu proyek Renov yang
match `t.renovProjectLinkId` (hanya kalau `t.renovItemLinkId` juga ada &
proyeknya masih ada di `D.renovProjects`) — pola identik dgn `hasShopStock`
tepat di bawahnya:

```js
const renovLinkedProject=(t.renovProjectLinkId&&t.renovItemLinkId&&D.renovProjects)
?D.renovProjects.find(p=>sameId(p.id,t.renovProjectLinkId))
:null;
if(renovChkEdit)renovChkEdit.checked=!!renovLinkedProject;
...
if(renovLinkedProject){
const renovProjSelEdit=document.getElementById('txRenovProject');
if(renovProjSelEdit)renovProjSelEdit.value=renovLinkedProject.id;
}
```

Dropdown "Proyek Renovasi"-nya juga ikut diisi ulang ke proyek yang sudah
ter-link, bukan cuma checkbox-nya saja.

Kalau proyeknya kebetulan sudah dihapus user (tapi transaksi masih
menyimpan `renovProjectLinkId` basi), `find()` balik `undefined` ->
checkbox tetap KOSONG (bukan error/nyangkut ke data yang tidak ada) — sudah
dicek lewat test regresi #3.

## Kenapa ini AMAN (tidak memicu item Renov dobel)
Fix ini murni restorasi TAMPILAN form Edit. Guard yang sudah ada di
`_saveTxInner()` (lihat BUGFIX s433 di tx-renov.js):

```js
if((!existingTx||!existingTx.renovItemLinkId)&&typeof applyTxRenovFromTx==='function')
  txRenovMsg=applyTxRenovFromTx(...)||'';
```

tetap mencegah `applyTxRenovFromTx()` jalan lagi kalau `existingTx.renovItemLinkId`
sudah ada — jadi checkbox tercentang saat Edit (fix sesi ini) TIDAK memicu
item Renov baru lagi waktu user simpan ulang transaksi yang sama.

## File yang berubah
- `modules/finance/transaksi.js` — fix inti (`editTx()`)
- `tests/s452-tx-renov-edit-checkbox-restore.test.js` — **baru**, 3 test:
  1. transaksi sudah ter-link -> checkbox tercentang + dropdown proyek terisi
  2. transaksi belum pernah ter-link -> checkbox tetap kosong (regresi)
  3. transaksi ter-link tapi proyeknya sudah dihapus -> checkbox kosong, tidak error (regresi)
- Bundle/versi (otomatis lewat `node scripts/build.js`): `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
  `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Testing
- `node --test tests/*.test.js` → **2937/2937 pass** (naik dari 2934, +3 test baru)
- `node scripts/build.js s452-tx-renov-edit-checkbox-restore` → build sukses,
  sintaks kedua bundle valid (`node --check`)
- Release Gate (`scripts/verify-release-ready.js`): lint & minify di-override
  manual (sandbox tanpa akses jaringan, eslint/esbuild tidak bisa
  ter-install) — lihat `docs/RELEASE-GATE-LOG.md`

## Versi
- Lama: v1171 (s451-porsi-proporsional-linked-akun-nilai-penuh)
- Baru: **v1172 (s452-tx-renov-edit-checkbox-restore)**
