# Patch — Merge overlay s635/636 + s637 + s638 + s639 ke app-main baseline

Zip ini HANYA berisi file yang berubah/baru dibanding `app-main__50_.zip`
(baseline sebelum overlay diterapkan). `index.html`, `app_production.html`,
`sw.js`, dan test s640 TIDAK disertakan karena sudah identik di baseline
(s640 sudah ter-apply duluan di sana).

## File yang diperbaiki (isi diganti, bukan file baru)
- `styles.css` — tambah blok `[data-theme="modern"]`, token `--font-mono`,
  CSS tabel `.tx-tbl*` (s637), gating ticker (s636)
- `modules/dashboard-hub/dashboard-hub.js` — ticker ringkasan Beranda (s636)
- `modules/finance/tx-list-cashflow.js` — tabel Ledger Pro + saldo berjalan
  tab Uang (s637)
- `modules/finance/akun.js` — pendukung s637
- `modules/shared/modules-render.js` — branch `D.profile.theme==='modern'`
  di `renderKeuangan()` (s637)
- `modules/finance/dana-titipan-portfolio-render.js` — class `.money`
  Dana Titipan (s638)
- `modules/asset/aset.js` — tabel list padat tab Aset (s639)
- `modules/shop/cobek-order.js` — perubahan ikutan dari overlay s635/636

## File baru
- `CHANGELOG-AUDIT-UIUX-VISUAL-2026-08.md`
- `CHANGELOG-S637-TX-TABEL-MODERN-SALDO-BERJALAN.md`
- `CHANGELOG-S638-DANA-TITIPAN-MONEY-CLASS.md`
- `CHANGELOG-S639-ASET-TABEL-MODERN-LIST-PADAT.md`
- `tests/dashboard-hub-ticker-modern-s636.test.js`
- `tests/s637-tx-tabel-modern-saldo-berjalan.test.js`
- `tests/s638-dana-titipan-money-class-modern.test.js`
- `tests/s639-aset-tabel-modern-list-padat.test.js`

## Cara pakai
Overlay file-file ini di atas `app-main__50_.zip` (timpa yang sudah ada,
tambahkan yang baru), lalu jalankan `node --test tests/*.test.js`.

## Verifikasi yang sudah dijalankan (di sandbox ini)
- `node --test tests/*.test.js` → **4596/4596 pass, 0 fail**
- `node --test tests/s640-modern-theme-registration-audit.test.js` →
  **21/21 pass** (sebelum overlay ini: 17/21)
- `node scripts/verify-window-expose.js` → OK
- `node scripts/verify-release-ready.js` → gate `html-sync` ✅,
  `version-sync` ✅ (v1374). Gate `lint`/`minify` GAGAL krn `eslint`/
  `esbuild` tidak tersedia di sandbox ini — **WAJIB** dijalankan manual
  (`npm run check`) di environment kamu sebelum rilis sesungguhnya.
