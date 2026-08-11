# Retire `tests/s551-investment-owners-nominal-readonly.test.js`

## Latar belakang
Ditandai sebagai "temuan sampingan, belum diputuskan" di dua sesi
sebelumnya:
- `MERGE-s552-into-v1289.md` (langkah 2): instruksi manual "Hapus
  `tests/s551-investment-owners-nominal-readonly.test.js` kalau masih ada
  di repo (sudah digantikan test s552)" — tidak pernah dieksekusi.
- `FIX-s562-s563-r5-dana-titipan-presenter-split.md`: dikonfirmasi ulang
  sebagai stale test (6/3960 gagal, pre-existing, tidak terkait split R5),
  opsi yang ditawarkan: update assertion ke nama fungsi baru, ATAU retire.

## Keputusan: RETIRE (hapus file), bukan update assertion

**Alasan:** Premis inti test S551 — field "Nominal (Rp)" di
`investmentOwnersModal` bersifat **read-only, murni tampilan turunan,
TIDAK PERNAH ditulis balik ke draft/holding** — sudah dibalik secara
sengaja oleh keputusan desain Sesi 552 (field itu sekarang **dua arah**:
ketik Nominal → porsi% ikut dihitung ulang & ditulis ke draft, lihat
`onOwnerNominalInput()` di `investasi-view.js`). "Update assertion ke
nama fungsi baru" saja tidak cukup — isi test S551 (test #5-7 khususnya)
akan tetap menguji perilaku read-only yang sudah tidak benar by design.

`tests/s552-investment-owners-nominal-bidirectional.test.js` (11 test,
sudah ada sejak S552) sudah fully-superseded coverage-nya: basis
`holdingValue()`, live-update per ketik %, render awal per baris,
round-trip presisi porsi↔nominal, DAN tetap ada test eksplisit
("11. `_ownerNominalValue()`: TIDAK PERNAH menulis balik") yang
membuktikan fungsi *display*-nya tetap murni — bagian yang valid dari
niat S551 tetap terjaga, cuma lewat file test yang benar.

## Yang dilakukan
- Hapus `tests/s551-investment-owners-nominal-readonly.test.js` (0 file
  lain menyentuh nama file ini — dicek `grep -rl` ke `scripts/` &
  `docs/`, tidak ada hardcoded reference; test suite di-discover via
  `fs.readdirSync` di `scripts/build.js`, jadi 0 wiring lain yang perlu
  diubah).

## Verifikasi
- Sebelum: `node --test tests/*.test.js` → 3960 test, 3954 pass, 6 fail
  (semua di file yang dihapus).
- Sesudah: `node --test tests/*.test.js` → **3953 test, 3953 pass, 0 fail**.
- `tests/s552-investment-owners-nominal-bidirectional.test.js` dijalankan
  terpisah untuk konfirmasi coverage pengganti masih utuh: 11/11 pass.

## Yang TIDAK diubah
- 0 perubahan kode aplikasi (`investasi-view.js` dll) — murni penghapusan
  test file usang.
- R3 (`GAP3-AUD-001`) tidak disentuh — sudah dikonfirmasi FIXED sejak
  Sesi 545/546 (lihat `docs/BUG_REGISTRY.md`), di luar scope sesi ini.
