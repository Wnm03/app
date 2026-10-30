# PATCH s485f → s486 (Case F: Partial Return) — **FINAL, release-ready**

Menggantikan `PATCH-README-s486-WIP.md` (checkpoint 1+2 saja). Sesi ini
menyelesaikan Checkpoint 3 (§3 `RENCANA-SESI-CASEF-PARTIAL-RETURN-S486.md`):
full regresi ulang, `node scripts/build.js`, dan audit HARD RULE eksplisit.
Detail lengkap: `s486-SESSION-NOTE.md`.

## Status

- **3172/3172 test PASS** (`node --test tests/*.test.js`), 0 gagal.
- `node scripts/build.js s486-titipan-commitment-partial-return` sudah
  dijalankan: versi `s485e-final-regression-docs` →
  `s486-titipan-commitment-partial-return`, `?v=` **1214 → 1215**,
  `CACHE_NAME` → `kw-cache-v1215`. `app_production.html` sudah
  disinkronkan (mengandung modal `titipanReturnModal`).
- `node scripts/verify-release-ready.js`: **LOLOS** (gate `html-sync`
  otomatis hijau; gate `lint`/`minify` di-override manual karena
  eslint/esbuild tidak bisa diinstall di sandbox tanpa akses jaringan —
  tercatat di `docs/RELEASE-GATE-LOG.md`, konsisten dengan pola
  override sesi-sesi sebelumnya di project ini).
- Audit HARD RULE: **0 sentuhan** ke `ownership-engine.js`,
  `multi-owner-engine.js`, `investasi.js`, `akun.js` (grep + jejak
  `build.js` — tidak ada baseline ZIP S485f terpisah utk `diff -rq`
  literal, lihat catatan di `s486-SESSION-NOTE.md`).
- Bundle unminified (esbuild tidak tersedia) — sintaks lolos
  `node --check`, valid dipakai, hanya lebih besar ukurannya.

## Bug ditemukan & diperbaiki sesi ini (di luar rencana WIP)

`tests/s485a-titipan-commitment-owner-picker.test.js` test #10 gagal
setelah full regresi — assersi `Object.keys(totals)` masih pakai daftar
6 field lama, padahal `totals.returnedTotalSum`/
`totals.outstandingPrincipalTotal` sudah ditambahkan (additive) di
`build()` sesi WIP. WIP README hanya menyebut `s484`/`s485b`/`s485d`
diupdate untuk ini — `s485a` (assersi identik) terlewat. Diperbaiki
dengan pola yang sama (+2 field baru, additive, 0 perubahan validasi
lain).

## Isi patch (final, S485f → S486)

| File | Sumber perubahan |
|---|---|
| `modules/finance/dana-titipan-portfolio-presenter.js` | WIP — `recordReturn()`/`getReturns()`/`deleteReturn()`, extend `build()`/`render()`, `DanaTitipanReturnUI` |
| `modules/shared/modals.js` | WIP (modal `titipanReturnModal`) + bump versi (Checkpoint 3) |
| `index.html` | WIP (`document.write(MODAL_HTML[97])`) + bump `?v=1215` (Checkpoint 3) |
| `app_production.html` | **Baru disinkronkan Checkpoint 3** (sebelumnya WIP belum menyentuh ini — sekarang cermin `index.html`, `?v=1215`) |
| `tests/s486-titipan-commitment-return.test.js` | WIP — baru, 28 test |
| `tests/s484-dana-titipan-portfolio-presenter.test.js` | WIP — 1 assersi totals diperbarui |
| `tests/s485b-titipan-commitment-crud.test.js` | WIP — 1 assersi totals diperbarui |
| `tests/s485d-titipan-commitment-ui.test.js` | WIP — scope ekstraksi `uiCode` dibatasi |
| `tests/s485a-titipan-commitment-owner-picker.test.js` | **Checkpoint 3** — 1 assersi totals diperbarui (bug ketinggalan, lihat di atas) |
| `app-bundle-a.min.js`, `app-bundle-b.min.js` | Checkpoint 3 — ditulis ulang oleh `build.js` (unminified) |
| `sw.js` | Checkpoint 3 — `CACHE_NAME` → `kw-cache-v1215` |
| `modules/shared/modules-render.js`, `modules/shared/modules-calc.js`, `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js` | Checkpoint 3 — bump string versi otomatis (`APP_BUILD_VERSION` dkk.) |
| `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`, `docs/RELEASE-GATE-LOG.md` | Checkpoint 3 — ditulis ulang otomatis oleh `build.js`/`verify-release-ready.js` |
| `s486-SESSION-NOTE.md` | Checkpoint 3 — baru, dokumentasi penutup sesi |
| `PATCH-README-s486.md` | Checkpoint 3 — dokumen ini, menggantikan versi WIP |

## Cara apply patch

Timpa semua file di atas ke atas baseline S485f (`v1214`,
`kw_release_v1214_s485f-gap3-audit-closeout.zip`). Tidak perlu
menjalankan `build.js` lagi — sudah dijalankan & disertakan hasilnya
di patch ini.

## Rekomendasi sebelum rilis produksi final

Jalankan `npm run lint` dan `npm install esbuild && node scripts/build.js`
sekali di environment dengan akses jaringan (sandbox sesi ini tidak
punya akses npm registry, 403 Forbidden) untuk mendapat bundle
terminifikasi & konfirmasi lint bersih — override yang dipakai di sesi
ini valid untuk checkpoint/ZIP saat ini, tapi bukan pengganti run
sungguhan kalau ada akses jaringan.
