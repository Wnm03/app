# PATCH — Auto-suggest Owner Dana Titipan dari Catatan

**Permintaan user:** dari 5 ide lanjutan (auto-suggest porsi, badge riwayat,
migrasi massal, reminder lupa pilih, filter per pemilik) — cek status lalu
implementasikan salah satu dengan ringkas.

## Cek status ide lain (di repo yang diupload, sudah sampai S568)
- ✅ **Filter laporan per pemilik** — sudah ada (S567/S568,
  `filter-laporan.js`, tab per owner di modal Riwayat Transaksi).
- ✅ **Badge/porsi di riwayat transaksi** — sudah ada (S566/S567, badge
  "👥 Porsi" di kartu akun + split per owner di Riwayat Transaksi).
- ✅ **Reminder lupa pilih porsi** — sudah ada secara implisit:
  `TitipanExpenseUI.save()` block simpan & toast peringatan kalau 0 owner
  dicentang (baris ~213-216, sudah sejak S521).
- ⬜ **Migrasi transaksi lama sekaligus** — belum ada, scope lebih besar
  (perlu UI pemilihan transaksi lama + bulk-update owner), disarankan jadi
  sesi terpisah.
- ⬜ **Auto-suggest porsi dari kategori/catatan** — belum ada → diimplementasikan
  di patch ini.

## Perubahan
- **`modules/finance/titipan-expense-ui.js`**: tambah `TitipanExpenseUI.onNoteInput()`
  — kalau catatan yang diketik user mengandung PERSIS 1 nama owner existing
  (case-insensitive substring) DAN belum ada owner yang tercentang manual,
  owner itu otomatis tercentang. Ambigu (cocok >1 nama) atau tidak cocok
  sama sekali → tidak ada perubahan. User tetap bebas ubah manual kapan
  saja. 0 tulis ke `D`, pola sama `toggleOwner()`.
- **`modules/shared/modals.js`**: field `#titipanExpenseNote` di
  `titipanExpenseModal` — tambah `oninput="TitipanExpenseUI.onNoteInput()"`.
- **`tests/s521-titipan-expense-ui.test.js`**: +5 test baru (gap-check
  wiring oninput + 4 skenario onNoteInput: single match, ambigu 2 match,
  tidak menimpa pilihan manual, tidak match sama sekali).

## Hasil test
`node --test tests/s521-titipan-expense-ui.test.js` → 22/22 pass.
Full suite (`node --test tests/*.test.js`) → 3992/3998 pass, 6 fail
PRE-EXISTING di `tests/s551-investment-owners-nominal-readonly.test.js`
(dikonfirmasi gagal juga di repo asli sebelum patch ini — tidak terkait).
