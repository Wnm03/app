# Sesi S657 — Koreksi klaim keliru di `docs/BUG_REGISTRY.md` (BUG-006, dari sesi S656)

## Konteks

Saat cross-check ulang untuk merencanakan sesi berikutnya (mencari
regression test `Debt.syncBill()` untuk BUG-006, item yang di catatan
S656 disebut "belum ada"), ternyata `tests/bug006-syncbill-orphan-piutang.test.js`
**sudah ada** di source — bukan test baru, sudah ada sebelum sesi S656
(dikonfirmasi lewat `unzip -l` arsip upload asli, timestamp file mendahului
sesi ini). Isinya persis 4 test yang meng-cover skenario BUG-006: utang
jadi Lunas, `cicilanBulanan` dinolkan, tanpa piutang auto terkait, dan
`shouldHaveBill` tetap true — semuanya pass.

Klaim di `docs/BUG_REGISTRY.md` entry BUG-006 (ditulis sesi S656)
menyatakan "belum ada test khusus skenario `syncBill()` orphan" — ini
**salah**. Root cause kekeliruan: sesi S656 mengandalkan `grep -rln
removeOrphanedAutoPiutangForBill tests/` yang HARUSNYA menemukan file ini
(nama file `bug006-syncbill-orphan-piutang.test.js` bahkan eksplisit
menyebut BUG-006), tapi hasil grep tidak diperiksa lebih lanjut sebelum
menulis kesimpulan "belum ada" ke entry registry — kesalahan verifikasi,
bukan kesalahan fix/kode.

**0 perubahan logic/behavior — murni koreksi dokumentasi atas kesalahan
sesi sebelumnya.**

## Yang dikerjakan

`docs/BUG_REGISTRY.md`:
- Baris Status BUG-006 (ditambahkan sesi S656) dikoreksi: hapus klaim
  "belum ada test khusus", ganti dengan referensi yang benar ke
  `tests/bug006-syncbill-orphan-piutang.test.js` (4 test, dijalankan &
  dikonfirmasi pass sesi ini) + catatan eksplisit bahwa ini koreksi atas
  kekeliruan S656 (bukan menyembunyikan histori — transparan soal
  kesalahan sebelumnya, sama semangat "histori audit asli tidak diedit"
  yang dipegang di seluruh file ini).

**0 file kode disentuh, 0 test baru** (test yang direferensikan sudah ada
sebelumnya) — sesi housekeeping/koreksi dokumentasi murni.

## Test

`node --test tests/*.test.js` → **4630/4630 pass**, 0 fail. Termasuk re-run
eksplisit `tests/bug006-syncbill-orphan-piutang.test.js` sendiri (4/4 pass)
untuk konfirmasi langsung sebelum menulis klaim di registry.

## File yang berubah (patch-only)

```
docs/BUG_REGISTRY.md   (edit — koreksi dokumentasi, 0 perubahan kode/test)
```

## Sesi berikutnya (rekomendasi)

- BUG-006 kini benar-benar tertutup penuh (fix + test + doc semua
  terkonfirmasi) — tidak ada item terbuka tersisa dari Blok A.
- Blok E/F sudah selesai (per S655). Blok G masih menunggu keputusan
  produk + prasyarat audit `OwnerRegistry`/`saveOwners()` (392d/392e).
- Kalau memulai sesi baru di luar rencana lama: audit `grep` HARUS
  diperiksa isinya sebelum menyimpulkan sesuatu "belum ada" — pelajaran
  dari kekeliruan sesi ini.
