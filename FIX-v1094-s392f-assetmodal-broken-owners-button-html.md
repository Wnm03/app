# Sesi 392f — Bugfix: tombol "Atur Porsi Kepemilikan" tersisip rusak di assetModal

## Temuan

Bug nyata di HTML `assetModal` (bukan di `assetOwnersModal` itu sendiri, yang
sudah benar). Tombol pembuka `Aset.openOwnersModal` — ditambahkan sesi 392a —
tersisip **di tengah atribut `class="..."` milik `<label>`**, bukan sebagai
elemen sibling yang valid:

```html
<!-- SEBELUM (rusak): -->
<div class="fg"><label class="<button type="button" class="btn btn-ghost btn-full btn-sm u-mb10" data-action="Aset.openOwnersModal">⚖️ Atur Porsi Kepemilikan</button>
    <div class="fl">Kepemilikan</label><select class="fs" id="assetOwnership"></select></div>
```

`<label class="` terpotong oleh tag `<button>` yang menyisip, lalu ditutup
lagi oleh `<div class="fl">` di baris berikutnya — bukan atribut `class`
yang valid, bukan penutupan elemen yang valid. Browser tetap "berhasil"
merender sesuatu lewat HTML error-recovery, tapi struktur DOM yang
dihasilkan tidak terprediksi (label kosong/salah, button bisa ketarik ke
posisi tak terduga tergantung parser).

## Perbaikan

```html
<!-- SESUDAH (benar): -->
<button type="button" class="btn btn-ghost btn-full btn-sm u-mb10" data-action="Aset.openOwnersModal">⚖️ Atur Porsi Kepemilikan</button>
<div class="fg"><label class="fl">Kepemilikan</label><select class="fs" id="assetOwnership"></select></div>
```

Tombol jadi elemen `<button>` sibling yang berdiri sendiri, tepat sebelum
`<div class="fg">` untuk field Kepemilikan — sama seperti pola tombol
`btn-ghost` lain di modal yang sama (`📷 Scan Portofolio`, dll).

## Audit bug serupa

Di-grep seluruh `modules/**/*.js` untuk pola atribut yang tersisipi tag
(`="<tag `) — **hanya 1 kejadian**, yaitu bug ini sendiri. Tidak ada
kejadian serupa lain di codebase.

## Cakupan perubahan

- **1 file diubah**: `modules/shared/modals.js` (potongan HTML `assetModal`
  di `MODAL_HTML` array) — murni perbaikan markup, 0 logic JS diubah.
- Tidak ada perubahan `Aset.openOwnersModal()`/`saveOwners()`/
  `MultiOwnerEngine`/rule AI — semua tetap seperti sesi 392a–392e.

## Regression

`npm test`: **2669/2669 pass** (sama seperti sebelum fix — tidak ada test
yang menutupi HTML mentah ini, jadi 0 regresi/0 tambahan test count, tapi
juga tidak ada yang gagal). Tag balance diverifikasi manual: `<label>`
14/14, `<button>` 8/8, `<select>` 4/4, `<div>` 39/39 (semua seimbang setelah
fix, sebelumnya struktur "seimbang" tapi salah nesting).
