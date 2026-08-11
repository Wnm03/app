# FIX v1172 → v1173 (s453) — Ketikan Terakhir di "Nominal (Rp)" Kadang Tidak Tersimpan

## Laporan user
Video: modal "⚖️ Atur Porsi Kepemilikan", user mengetik di field Nominal
(Rp) salah satu baris pemilik. Kelihatan toolbar quick-action browser
("Pesanan / Cek Ongkir / Balas Cepat / Buat Pesanan" — quick-action bar
Brave) muncul di atas keyboard tepat saat mengetik, salah mendeteksi field
Nominal sebagai form belanja/checkout. Kemungkinan besar itu yang
mengganggu event ketikan TERAKHIR sebelum user tap Simpan — angka yang
benar sudah kelihatan di layar, tapi tidak ikut tersimpan.

## Root cause
`onOwnerNominalInput(i,val)` (modules/asset/aset.js) adalah satu-satunya
jalur yang menulis ketikan Nominal ke `Aset._ownersDraft[i].porsi` — method
ini dipanggil lewat `oninput` pada `#ownerNominal{i}`. Kalau satu event
`oninput` tidak sempat ke-fire (mis. diganggu overlay/toolbar di atas
keyboard), draft di memori berhenti di ketikan SEBELUM yang terakhir,
walau `#ownerNominal{i}`.value di DOM sendiri sudah menampilkan angka yang
benar (itu murni perilaku native `<input>`, tidak bergantung JS). `Aset.
saveOwners()` sebelumnya 100% percaya `Aset._ownersDraft[i].porsi` di
memori — tidak pernah membaca ulang DOM — jadi angka yang benar-benar
dilihat & disetujui user di layar bisa tidak ikut ke `D.assets[].owners`.

## Fix
`Aset.saveOwners()`: sebelum validasi/simpan, panggil method baru
`Aset._resyncOwnersFromDOM()` — baca ulang value asli tiap
`#ownerNominal{i}` langsung dari DOM, bandingkan dengan nominal yang
TERSIRAT dari `draft[i].porsi` saat ini (`nilai*porsi/100`, dibulatkan).
Kalau beda (berarti ada ketikan yang belum ke-commit ke draft), recompute
`porsi` dari nominal DOM tersebut — rumus persis sama dengan cabang normal
`onOwnerNominalInput()` (`nilai>0`) — dan timpa `draft[i].porsi` SEBELUM
`MultiOwnerEngine.setOwners()`/`validateOwners()` dipanggil.

```js
_resyncOwnersFromDOM(){
if(typeof document==='undefined'||!document||typeof document.getElementById!=='function')return;
const draft=Array.isArray(Aset._ownersDraft)?Aset._ownersDraft:[];
if(!draft.length)return;
const nilai=Aset._ownersAssetNilai();
if(!(nilai>0))return;
draft.forEach((o,i)=>{
const nomEl=document.getElementById('ownerNominal'+i);
if(!nomEl||typeof nomEl.value!=='string')return;
const n=parseFloat(String(nomEl.value).replace(/[^0-9.-]/g,''));
const domNominal=isFinite(n)?n:0;
const porsiSaatIni=typeof o.porsi==='number'&&isFinite(o.porsi)?o.porsi:0;
const nominalTersirat=Math.round(nilai*porsiSaatIni/100);
if(domNominal===nominalTersirat)return;
const porsiBaru=Math.round((domNominal/nilai*100)*100)/100;
o.porsi=porsiBaru;
});
},
```

dipanggil di `saveOwners()`, tepat setelah guard `draft.length` dan SEBELUM
loop validasi nama pemilik:

```js
if(!draft.length){toast('⚠️ Tambahkan minimal 1 pemilik sebelum menyimpan');return;}
Aset._resyncOwnersFromDOM();
for(let i=0;i<draft.length;i++){ ... }
```

### Kenapa TIDAK memanggil `_autoDistributeRemaining()` di sini
`_resyncOwnersFromDOM()` murni "commit ketikan yang lewat" untuk baris yang
DOM-nya beda dari draft — baris lain SENGAJA tidak ikut diubah. Kalau ini
membuat total porsi != 100%, `validateOwners()` (dipanggil
`MultiOwnerEngine.setOwners()` di bawahnya, TIDAK diubah sesi ini) yang
akan menolak & menampilkan toast peringatan — persis skenario yang sudah
ada sebelumnya kalau `oninput` sempat ke-trigger normal tapi user belum
sempat menyesuaikan baris lain. 0 perilaku baru di luar guard "event
ketinggalan" ini.

### Guard `nilai<=0` (cabang nilai-tersirat, S451) tidak disentuh
Kalau aset belum punya "Estimasi Nilai Saat Ini" (`_ownersAssetNilai()`
balik 0), `_resyncOwnersFromDOM()` langsung return tanpa menyentuh apa pun
— cabang `onOwnerNominalInput()` untuk kasus itu (nilai dasar instrumen
justru DITURUNKAN dari Nominal+Porsi, lihat S451) punya arah rumus
kebalikan (nominal→nilai total, bukan nominal→porsi) dan sudah benar
lewat jalurnya sendiri; menyamaratakan guard ini ke situ berisiko menimpa
`_ownersDraftNilai` dengan angka yang salah.

### Guard `typeof nomEl.value!=='string'`
Dipakai untuk membedakan elemen DOM sungguhan (browser asli, ataupun
tiruan stateful di test — keduanya SELALU punya `.value` bertipe string,
default `''` kalau kosong) dari stub permisif harness test murni
(`tests/helpers/loadSource.js`, yang eksplisit mendokumentasikan "jangan
dipakai buat nge-test fungsi yang baca/tulis DOM"). Tanpa guard ini, test
yang men-drive `saveOwners()` langsung dari draft (tanpa DOM sama sekali)
akan salah kebaca sbg "Nominal kosong" & draft yang sudah benar bisa
tertimpa jadi 0%.

## Kenapa ini AMAN (tidak mengubah perilaku normal)
- Kalau `oninput` selalu ke-trigger normal (kasus mayoritas, tanpa
  gangguan toolbar/overlay), `#ownerNominal{i}`.value di DOM SELALU sama
  dengan nominal tersirat dari `draft[i].porsi` (karena keduanya memang
  ditulis bareng oleh `onOwnerNominalInput`/`onOwnerPorsiInput`/
  `_autoDistributeRemaining` yang sudah ada) — `_resyncOwnersFromDOM()`
  jadi no-op murni di jalur ini, 0 perubahan porsi.
- Validasi 100%/nama-pemilik-wajib di `saveOwners()` (yang sudah ada,
  TIDAK diubah) tetap jadi baris pertahanan terakhir kalau resync ini
  justru bikin total tidak pas 100%.
- Tidak menambah field baru ke `D.assets`/`draft` — 0 rumus baru di luar
  yang sudah dipakai `onOwnerNominalInput()` cabang normal.

## File yang berubah
- `modules/asset/aset.js` — fix inti (`Aset._resyncOwnersFromDOM()` baru +
  1 baris pemanggilan di `saveOwners()`)
- `tests/asset-owners-nominal-dom-resync-s453.test.js` — **baru**, 4 test:
  1. ketikan terakhir yang "kelewat" `oninput` tetap tersimpan (dibaca
     ulang dari DOM) lewat `saveOwners()`
  2. baris yang DOM-nya sudah sama dgn draft (tidak ada ketikan kelewat)
     tidak ikut berubah — 0 regresi jalur normal
  3. `_resyncOwnersFromDOM()` no-op kalau aset belum punya nilai (cabang
     nilai-tersirat S451 tidak disentuh)
  4. field Nominal yang DOM-nya default/kosong tidak salah menimpa draft
     jadi lolos validasi yang seharusnya ditolak (guard elemen tidak ada)
- 3 test lama (`asset-owners-nominal-autodistribute-s431.test.js`,
  `asset-owners-nominal-sync-s429.test.js` ×2) — disesuaikan supaya
  mensimulasikan typing sungguhan (set `.value` DOM langsung sebelum
  memanggil handler, sama seperti browser asli melakukannya secara native
  sebelum `oninput` sempat dipanggil) — 0 perubahan pada `aset.js` itu
  sendiri, murni menyamakan asumsi mock DOM di test dengan perilaku
  browser nyata sesudah `saveOwners()` sekarang ikut membaca DOM.
- Bundle/versi (otomatis lewat `node scripts/build.js`): `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
  `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`,
  `docs/RELEASE-GATE-LOG.md`

## Testing
- `node --test tests/*.test.js` → **2941/2941 pass** (naik dari 2937, +4
  test baru)
- `node scripts/build.js s453-owners-nominal-dom-resync` → build sukses,
  sintaks kedua bundle valid (`node --check`)
- Release Gate (`scripts/verify-release-ready.js`): lint & minify
  di-override manual (sandbox tanpa akses jaringan, eslint/esbuild tidak
  bisa ter-install) — lihat `docs/RELEASE-GATE-LOG.md`

## Versi
- Lama: v1172 (s452-tx-renov-edit-checkbox-restore)
- Baru: **v1173 (s453-owners-nominal-dom-resync)**
