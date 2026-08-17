# Patch — Sesi s640 (RENCANA-MODERNISASI-UI.md) — Audit + Registrasi Tema

Sesi PENUTUP rencana modernisasi (s635–s640). Baseline: overlay
`PATCH-AUDIT-UIUX-VISUAL-2026-08.zip` (s635+s636) +
`kw_patch_s637-tx-tabel-modern-saldo-berjalan.zip` +
`kw_patch_s638-dana-titipan-money-class.zip` +
`kw_patch_s639-aset-tabel-modern-list-padat.zip` di atas app-main terbaru.

**Scope (tabel rencana):** "Audit lintas modul, full run 4500+ test suite,
putuskan apakah `modern` jadi opsi tema tambahan atau default baru."
Output: laporan audit + keputusan go/no-go (lihat
`LAPORAN-AUDIT-S640-TEMA-MODERN.md` utk detail lengkap per-sesi).

## Ringkasan audit

- Diverifikasi ulang gating 4 sesi sebelumnya (s636 ticker, s637 tabel
  Uang, s638 class money Titipan, s639 tabel Aset) — **0 regresi**, 2 pola
  gating (CSS-only vs JS-branch) konsisten dgn tujuan masing-masing.
- Full suite sebelum sesi ini: 4575/4575 pass. Setelah + test audit baru:
  **4596/4596 pass** (0 fail).

## Keputusan Go/No-Go

**GO** — daftarkan `modern` sbg **opsi tema tambahan** (bukan default).
**NO-GO** — jadi default baru (ditunda, butuh feedback pemakaian nyata
dulu sesuai rencana risiko §6 dokumen asli). Alasan lengkap di laporan
audit.

## Perubahan

- `index.html` — 1 `theme-card` baru "Modern" ditambahkan di AKHIR grid
  `#themeGrid` (setelah "Otomatis"), pola identik 9 `theme-card` lama.
  Preview pakai warna asli tema (`#fafafa` bg, `#2f6fed` aksen — sama
  persis token CSS s635). **9 theme-card lama 0 diubah/dipindah.**
- `app_production.html` — disinkronkan dari `index.html` persis logika
  `scripts/build.js` step 6 (comment AUTO-GENERATED + isi identik) —
  disertakan karena gate `html-sync` membandingkan keduanya.
- `tests/s640-modern-theme-registration-audit.test.js` (BARU) — 21 test:
  keberadaan+atribut card modern, regresi 9 card lama + auto satu-per-satu,
  total count grid = 11, urutan card, sinkronisasi app_production.html,
  default `<body data-theme>` & `applyEffectiveTheme()` TIDAK berubah
  (bukti keputusan "opsi tambahan" bukan "default baru"), + 4 test audit
  ulang gating s636/s637/s638/s639.
- `LAPORAN-AUDIT-S640-TEMA-MODERN.md` (BARU) — laporan lengkap per §1–§5.

**Tidak disentuh:** `styles.css` (blok tema `modern` sejak s635 sudah
lengkap, 0 token baru), `format-tema.js` (`setTheme()`/
`applyEffectiveTheme()` generik, otomatis menerima value tema apa pun),
seluruh modul finance/asset/dashboard-hub yang disentuh s636-s639 (0
perubahan logic, murni diverifikasi ulang lewat audit).

## Verifikasi
- `node --test tests/*.test.js` → **4596/4596 pass** (4575 sebelumnya + 21
  baru), 0 regresi.
- `node scripts/verify-window-expose.js` → OK.
- `node scripts/verify-release-ready.js` → gate `html-sync` ✅, gate
  `version-sync` ✅ (v1374). Gate `lint`/`minify` GAGAL krn `eslint`/
  `esbuild` tidak tersedia di sandbox ini (bukan temuan dari sesi ini) —
  **WAJIB** jalankan `npm run check` penuh di environment kamu sebelum
  rilis (`node scripts/build.js` regenerasi bundle & bump versi resmi,
  krn versi di zip ini `?v=1374` hasil version-sync check yang sudah ada
  di file sw.js/index.html, TIDAK di-bump manual oleh sesi ini).

## File dalam ZIP ini
- `index.html`
- `app_production.html`
- `tests/s640-modern-theme-registration-audit.test.js` (BARU)
- `LAPORAN-AUDIT-S640-TEMA-MODERN.md` (BARU)
- `CHANGELOG-S640-AUDIT-REGISTRASI-TEMA-MODERN.md`

## Status rencana
**`RENCANA-MODERNISASI-UI.md` (s635–s640): SELESAI SEMUA SESI.** Perluasan
lanjutan (tabel Ledger Pro ke Riwayat/Dana Titipan, atau evaluasi
default) butuh Design Lock/rencana baru — lihat §4 laporan audit.
