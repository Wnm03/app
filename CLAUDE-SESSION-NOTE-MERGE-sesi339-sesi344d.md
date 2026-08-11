# Merge: sesi339 (ai-widget-svg-icons v911) + sesi344d (weight-bulk-widget v921) → v922

## Konteks

User mengirim 2 hasil release zip dari 2 sesi kerja terpisah yang ternyata
bercabang dari checkpoint yang sama (± Sesi 322, lihat `docs/CHECKPOINT.md`)
lalu berkembang independen:

- **`kw_release_sesi339_ai-widget-svg-icons_v911_UPDATED.zip`** — cabang lebih
  lama secara nomor sesi, tapi berisi backup snapshot sampai sesi ~338
  (`backups/*s334-s338*`), termasuk perbaikan UI Dashboard Hub (audit/search/
  badge bar) dan satu fitur yang TIDAK ada di cabang lain: field dinamis per
  Jenis SIM (Tanggal Uji KIR untuk SIM B1/B2, Kapasitas CC Motor untuk SIM
  C/C1/C2) di `modules/vehicle/vehicle-core.js`.
- **`kw_release_sesi344d_weight-bulk-widget_v921.zip`** — cabang lebih baru,
  sudah superset dari nyaris semua isi sesi339 (FeatureIcons di kartu insight,
  guard null-check di LinkTx, fitur "Ditanggung Bersama → Piutang" Sesi 341,
  `actionTargets` di AI rules Sesi 344b, redesain chip UI Inventory Transfer
  Sesi 342, dan fitur baru widget `WeightBulkWidget` Sesi 344d sendiri) —
  KECUALI fitur field per-Jenis SIM di atas.

## Yang dikerjakan sesi ini

Base dipakai dari sesi344d (v921) karena secara isi jauh lebih lengkap/baru.
Satu fitur unik dari sesi339 yang hilang di sesi344d di-porting manual:

1. `modules/vehicle/vehicle-core.js`:
   - `simJenisFieldsHtml(jenis, s)` — fungsi PURE baru, render field tambahan
     sesuai Jenis SIM (KIR utk B1/B2, CC Motor utk C/C1/C2, kosong utk A/D).
   - `onSimJenisChange()` — ditambah render ulang `#simJenisFieldsWrap` tiap
     ganti Jenis SIM (fungsi lama dari sesi344d, termasuk isian default biaya
     dari `D.pajakZakat` & default masa berlaku +5 tahun, tetap dipertahankan
     utuh — bukan ditimpa).
   - `openSimModal(id)` — render `simJenisFieldsWrap` sesuai data SIM yang
     dibuka (baik SIM baru maupun edit).
   - `saveSim()` — baca & simpan `kirTanggal`/`motorCc` (guard via
     `getElementById`, opsional — tidak wajib ada di DOM tergantung jenis).
2. `modules/shared/modals.js` — tambah `<div id="simJenisFieldsWrap"></div>`
   di modal `simModal`, persis di bawah dropdown Jenis SIM.
3. `tests/sim-jenis-fields-html.test.js` (baru, 4 test) — cakupan
   `simJenisFieldsHtml()`: field KIR utk B1/B2, field CC Motor utk C/C1/C2,
   string kosong utk A/D, aman dipanggil tanpa argumen kedua.
4. `backups/` — 8 file backup bundle dari sesi339 (s334, s336–s338) dibawa
   masuk supaya riwayat build tidak hilang.

## Tidak ada perubahan lain dari sesi339 yang perlu di-porting

Semua diff lain antara kedua zip sudah dicek satu per satu — hasilnya
konsisten: sesi344d sudah punya versi LEBIH BARU dari perubahan yang sama
(mis. `business-flow-presenter.js`: chip UI sesi344d menggantikan total
select-dropdown lama sesi339 sebagai bugfix S342; `aset.js`/`action-queue.js`/
dst: FeatureIcons rendering sesi344d menggantikan icon polos sesi339).

## Verifikasi

- `node --test tests/*.test.js` → **1879/1879 PASS** (1875 lama + 4 baru).
- `node --check` semua file yang diubah → OK.
- `node scripts/build.js kw-merge-sesi339-sesi344d` → sukses, versi **922**,
  sintaks bundle valid, `index.html` & `app_production.html` identik.
