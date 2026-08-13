# FIX — Sesi D: Kustodian yang Sudah Diubah/Dihapus Tetap "Menempel" di Tab Dana Titipan

**Laporan user:** "Majoris masih render padahal sudah dihapus".

## Root cause
`renameCustodian()` dan `deleteCustodian()` (`modules/asset/investasi-list-view.js`,
dipanggil dari dropdown "Kustodian" di modal edit Holding Investasi) sudah
benar mengubah `D.investmentCustodians` lewat `CustodianRegistry.rename()`/
`remove()` (S542) — data selalu konsisten. Tapi keduanya hanya me-render
ulang dropdown **di dalam modal itu sendiri** (`_renderCustodianOptions()`);
tidak ada yang memberi tahu `DanaTitipanPortfolioPresenter` (tab "💰 Dana
Titipan" di belakang modal) bahwa data berubah. Semua mutasi lain yang
mempengaruhi kartu itu (commitment, return, expense — lihat
`dana-titipan-portfolio-render.js`/`titipan-expense-ui.js`) SELALU diikuti
`DanaTitipanPortfolioPresenter.render()` + `.renderInto('danaTitipanTabList')`;
custodian rename/delete ketinggalan pola yang sama sejak S542. Akibatnya
DOM tab Dana Titipan tetap menampilkan grup/nama kustodian LAMA (mis.
"🏦 Majoris") sampai ada trigger render lain (ganti tab, dsb).

## Perubahan
- **`modules/asset/investasi-list-view.js`**
  - `renameCustodian()`: tambah `DanaTitipanPortfolioPresenter.render()` +
    `.renderInto('danaTitipanTabList')` (guarded `typeof`, pola sama persis
    caller lain) setelah `CustodianRegistry.rename()` sukses.
  - `deleteCustodian()`: tambah panggilan yang sama setelah
    `CustodianRegistry.remove()` sukses.
  - 0 perubahan pada `CustodianRegistry` itu sendiri (rename/remove tetap
    tidak menyentuh `custodianId` di holding manapun, sesuai desain S542 —
    holding tetap aman, cuma fallback ke label generik "Kustodian").

## Kenapa tidak ada test otomatis baru
`tests/helpers/loadSource.js` eksplisit melarang dipakai untuk fungsi yang
baca/tulis DOM (`renameCustodian()`/`deleteCustodian()` keduanya
`document.getElementById(...)`-heavy) — sesuai catatan
`tests/s542-custodian-rename-remove.test.js` yang sudah menguji
`CustodianRegistry.rename()/remove()` murni logic-nya (10 test, tidak
disentuh sesi ini). Verifikasi manual: buka Holding Investasi → Kustodian
→ hapus/ubah nama → tutup modal → cek tab Dana Titipan langsung update
tanpa ganti tab.

## Test
Full regression suite: `node --test tests/*.test.js` → **4146/4146 lolos,
0 gagal** (0 test baru ditambahkan, 0 test lama berubah).

## Build
`node scripts/build.js sD-fix-majoris-custodian-stale-render` — versi naik
ke **1323**, sintaks kedua bundle valid (`node --check`). Juga
memperbaiki drift versi pre-existing yang tidak terkait
(`MODULE_RENDER_VERSION` di `modules/shared/modules-render.js` masih
`s584-...` padahal repo sudah di `s582-9-...` — build sebelumnya lupa
menyamakan file ini) supaya `verifyVersionConstantsSynced()` lolos lagi.

## Di luar scope sesi ini
- **Bug "orphan:2" di `TitipanReconcile.checkAll()`** — butuh data JSON
  aktual (`D.assets`/`D.investments`/`D.debts`) untuk identifikasi 2
  record spesifik; belum bisa dikerjakan tanpa itu.
- Kemungkinan kasus lain "Majoris masih render" (mis. HOLDING investasi
  atau AKUN yang dihapus, bukan entri kustodian) — beda jalur kode
  (`Investment.deleteHolding()` sudah membersihkan `D.debts` dengan benar,
  lihat audit sesi sebelumnya), belum dikonfirmasi user reproduksinya
  yang mana.
