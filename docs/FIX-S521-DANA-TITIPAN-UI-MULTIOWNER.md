# FIX S521 — Dana Titipan: UI Pengeluaran Multi-Owner

## 1. Baseline

- Versi awal: v1251 (S519, `s519-titipan-talangan-linkage`)
- Baseline test sebelum S521-A: 3397/3397 PASS (post-build S519)
- Source of truth: `docs/DESIGN-S520-DANA-TITIPAN-UI-MULTIOWNER.md`
- S521 = implementasi UI pencatatan pengeluaran Dana Titipan (single &
  multi-owner) dari modal khusus `titipanExpenseModal`, 100% delegasi ke
  primitive S519 (`applyTxTitipanLinkageOnSave`/`maybeCreateTitipanTalanganPiutang`/
  `delTx()`) dan primitive S390/S392 (`MultiOwnerEngine.splitByPorsi()`/
  `validateOwners()`).

## 2. Ringkasan Sesi A–F

- **S521-A** — `TitipanExpenseFlow` (`titipan-expense-flow.js`): logic murni
  (`resolveOwner`, `computeSplitRows`, `validate`, `submit`) + 1 fungsi
  orkestrasi yang menyentuh `D.transactions`/`save()`. 0 engine/schema/counter
  baru. Rounding: proporsional → `Math.round()` per row → residual
  (input − sum(rounded)) diterapkan ke row TERAKHIR (invariant
  `sum(rows.amount) === inputAmount` selalu pas).
- **S521-B1** — Markup `titipanExpenseModal` ditambahkan ke
  `modules/shared/modals.js` (field: nominal, daftar owner existing-only,
  porsi per owner kalau >1 dipilih, talangan toggle, catatan/tanggal).
- **S521-B2** — `TitipanExpenseUI` (`titipan-expense-ui.js`): controller DOM
  tipis untuk modal tsb — draft-array + render-ulang-list (pola sama
  `Aset._renderOwnersList()`), `save()` dibungkus `withSaveGuardAsync()`
  sebagai lapis guard UI tambahan (lapis logic guard `_submitting` sudah ada
  di `TitipanExpenseFlow.submit()` sejak S521-A). Tombol Hapus modal ini
  SELALU disembunyikan — modal murni "catat baru", DELETE tetap 100% lewat
  `delTx()` dari Riwayat Transaksi (Design Lock §14).
- **S521-C** — Audit race-condition/dead-code pasca B1/B2 (lihat
  `AUDIT-FIX-RACE-CONDITION-DEADCODE.md`), 0 perubahan production yang
  ditemukan wajib.
- **S521-D** — Checkpoint konsolidasi A–C, baseline diverifikasi PASS penuh.
- **S521-E** — Final hardening audit (lihat §5 di bawah) + 4 test tambahan
  untuk menutup gap coverage (kategori/akun/tanggal kosong, XSS escaping
  nama owner) — **0 perubahan production logic**, gap yang ditemukan murni
  test coverage (kode production sudah menangani kasus-kasus tsb dengan
  benar sejak S521-A/B2).
- **S521-F** — Build & release resmi (versi, bundle, dokumentasi) atas hasil
  S521-E, 0 perubahan source lebih lanjut.

## 3. Scope Final Production

Production (3 file, semua sudah ada sejak S521-A/B1/B2, TIDAK berubah lagi
di S521-C/D/E/F):

1. `modules/finance/titipan-expense-flow.js` (238 baris) — `TitipanExpenseFlow`:
   `resolveOwner()`, `computeSplitRows()`, `validate()`, `submit()`.
2. `modules/finance/titipan-expense-ui.js` (271 baris) — `TitipanExpenseUI`:
   `open()`, `_renderOwnersList()`, `toggleOwner()`, `onPorsiInput()`,
   `onAmtInput()`, `_readAmount()`, `_selectedOwnersInput()`,
   `_updateSplitPreview()`, `save()`, `deleteFromModal()`.
3. `modules/shared/modals.js` — entry `titipanExpenseModal` di `MODAL_HTML`
   (S521-B1) + wiring `oninput`/`onblur` field `titipanExpenseAmt` ke
   `TitipanExpenseUI.onAmtInput()` (S521-B2).
4. `modules/finance/dana-titipan-portfolio-presenter.js` — 1 baris tombol
   pemicu (`expenseBtn`, `data-action="TitipanExpenseUI.open"`) di
   `renderInto()` (S521-B2).

Test (2 file):

5. `tests/s521-titipan-expense-flow.test.js` (457 baris, 20 test) — LAPIS 3
   murni (`loadSource()` harness, 0 DOM), pola sama `s519-...test.js`.
6. `tests/s521-titipan-expense-ui.test.js` (383 baris, 17 test) — DOM tiruan
   stateful minimal (`getElementById` saja, controller ini tidak pakai
   `querySelectorAll`).

Build registration: `scripts/build.js` GROUP_B — `dana-titipan-portfolio-presenter.js`
→ `titipan-expense-flow.js` → `titipan-expense-ui.js` (urutan dependency
benar, 0 forward-reference).

Tidak ada file lain yang diubah sesi S521-A s/d F (di luar file
version-constant/bundle hasil `build.js`, lihat §7).

## 4. Test

- Targeted: 37/37 PASS
  (20 test `s521-titipan-expense-flow.test.js` + 17 test
  `s521-titipan-expense-ui.test.js`).
- Full regression: 3434/3434 PASS (3397 baseline S519 + 37 baru S521,
  0 regresi terhadap suite existing).
- Coverage eksplisit (Design Lock §20 + audit hardening S521-E): single
  owner, multi owner, porsi valid/invalid, owner invalid/tidak
  dikenal/duplikat, nominal 0/negatif/bukan angka, rounding + residual ke
  row terakhir, invariant sum(rows)===input (banyak kasus porsi ganjil),
  linkage `titipanLinkId` lolos `resolveTxTitipanOwner()`, talangan →
  piutang otomatis, duplicate/re-entrant submit diblokir, edit delta-sync
  piutang talangan, delete cascade `delTx()`, paid piutang preserved (TIDAK
  ikut terhapus), kategori/akun/tanggal kosong ditolak, XSS escaping nama
  owner di render list, dan non-mutation `principalAmount`/`D.assets`/
  `D.investments` (single & multi-owner).

## 5. Invariant

Diverifikasi PASS penuh (S521-E audit, dikonfirmasi ulang post-build S521-F
lewat perbandingan byte-per-byte source pra vs pasca build):

- `principalAmount` (`D.titipanCommitments[].principalAmount`) immutable —
  `TitipanExpenseFlow.submit()` tidak pernah menulisnya.
- `D.assets[].owners`/`D.investments[].owners` (porsi kepemilikan) tidak
  disentuh sama sekali oleh alur pengeluaran Dana Titipan.
- Tidak ada counter persistent baru, tidak ada SSOT baru — `usedTotal`/
  `talanganTotal`/`available` tetap derived on-read dari
  `dana-titipan-portfolio-presenter.js` (S519), 0 field agregat baru
  ditulis ke `D`.
- Linkage titipan tetap 100% lewat primitive S519
  (`applyTxTitipanLinkageOnSave()` → `maybeCreateTitipanTalanganPiutang()`
  internal), 0 logic piutang baru ditulis di `titipan-expense-flow.js`.
- DELETE tetap satu-satunya jalur `delTx()` (`tx-list-cashflow.js`) —
  `TitipanExpenseUI.deleteFromModal()` sengaja hanya menampilkan toast
  informasi, tidak pernah memanggil `delTx()` sendiri (Design Lock §14).
- Piutang talangan yang sudah lunas (`lunas:true`) tetap preserved, tidak
  ikut terhapus oleh cascade delete (test #15).
- Multi-owner tetap N transaksi terpisah (1 row `split` = 1 `tx` scalar),
  bukan 1 transaksi dengan array split.
- `titipanLinkId` tetap scalar per transaksi (satu ownerId per tx, sama
  seperti pola S519).

## 6. Build

- Versi lama → baru: `s519-titipan-talangan-linkage` →
  `s521-dana-titipan-ui-multiowner` (eksplisit, BUKAN auto-increment —
  auto-increment format `sNNN-slug` berisiko salah menaikkan slug lama
  seperti pola yang sudah didokumentasikan di entry S519 FINAL
  `docs/RELEASE-GATE-LOG.md`).
- `?v=1251` → `?v=1252`, `CACHE_NAME` → `kw-cache-v1252`.
- Bundle diregenerasi (`app-bundle-a.min.js`/`app-bundle-b.min.js`, TANPA
  minifikasi — esbuild tidak tersedia di sandbox ini, sama kondisi seperti
  S508–S519). `app_production.html` disinkronkan ulang dari `index.html`.
  Backup bundle lama otomatis tersimpan di `backups/`.
- `verify-bundle-freshness.js`: PASS (hash source cocok kedua bundle).
- `verify-window-expose.js`: PASS (69 modul lengkap, 307 file di-scan).
- `verify-release-ready.js`: LOLOS — gate `html-sync` hijau otomatis; gate
  `lint`/`minify` di-override manual (alasan sama seperti S508–S519,
  tercatat otomatis oleh script itu sendiri di `docs/RELEASE-GATE-LOG.md`).
- Full regression setelah build: **3434/3434 PASS** (angka SAMA seperti
  sebelum build — `build.js` hanya bump versi & regenerasi bundle, 0 test
  ditambah/dihapus).
- Post-build invariant re-audit: 3 file production S521
  (`titipan-expense-flow.js`/`titipan-expense-ui.js`/
  `dana-titipan-portfolio-presenter.js`) + file S519 primitive
  (`piutang-utang.js`/`transaksi.js`/`tx-list-cashflow.js`/
  `multi-owner-engine.js`/`ownership-engine.js`) diverifikasi identik
  byte-per-byte pra vs pasca build — 0 logic bisnis tambahan masuk lewat
  proses build.

## 7. Release Gate

Known non-S521 warnings (build tetap lanjut, tidak memblokir rilis, bukan
scope S521, pre-existing dari sesi-sesi sebelumnya):

- `docs/AUDIT_MATRIX.md` "Coverage Baseline" usang (jumlah file berbeda dari
  repo sungguhan) — peringatan bawaan build.js, tidak terkait S521.
- 5 file source sudah lewat ambang 1600 baris (`aset.js`,
  `business-flow-presenter.js`, `build.js`, `modules-render.js`,
  `scan-ocr.js`) — kandidat dipecah, tidak terkait S521, tidak diubah sesi
  ini.

Gate `lint`/`minify` di-override manual (lihat §6), gate `html-sync` PASS
otomatis. Tidak ada failure lain yang disembunyikan.

## 8. Exact Scope Audit

Source berubah HANYA S521 (3 file production + 2 file test, lihat §3).
Perubahan hasil build (mechanical/generated, bukan logic manual): versi
konstanta di `modules/shared/modules-render.js`/`modals.js`/
`modules-calc.js`/`chat-action-handlers.js`/
`modules/shared/features-helpers-global-security.js`, `app-bundle-a.min.js`,
`app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
`docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md`
(entry gate baru), backup bundle lama (untracked, `backups/`) — semua
dihasilkan `scripts/build.js`, diverifikasi tiap file version-constant
HANYA berisi swap string versi lama→baru, 0 baris logic lain berubah.
`multi-owner-engine.js`/`ownership-engine.js`/file asset-investment lain:
TIDAK berubah (dikonfirmasi identik byte-per-byte, §6).

Status: **RELEASE COMPLETE** (S521-F).
