# Patch manifest — S2610 Google OAuth connection hardening

Patch dibuat dari baseline `app-main (18).zip`; hanya file yang berubah/diperlukan untuk runtime build dan pengujian disertakan. Struktur path dipertahankan di bawah `app-main/`.

## Included
- `gdrive-backup.js`
- `sheets-sync.js`
- `tests/s2610-google-oauth-load-and-clientid.test.js`
- `AUDIT-GOOGLE-OAUTH-S2610.md`
- `app-bundle-a.min.js`
- `app-bundle-b.min.js`
- `index.html`
- `app_production.html`
- `sw.js`
- `chat-action-handlers.js`
- `modules/shared/modules-render.js`
- `modules/shared/modals.js`
- `modules/shared/modules-calc.js`
- `modules/shared/features-helpers-global-security.js`

## Version
- App build: `s2041-1-part-sot-hardening-2336`
- Service worker cache: `kw-cache-v2336`

## Gate status
- Production build: PASS
- Bundle freshness: PASS
- Targeted Google Drive/Sheets tests: 12/12 PASS
- Full suite (`node scripts/run-full-test.js`): hit execution time limit during run; no final summary, therefore not marked PASS.
- ESLint on touched JS files: 0 errors, 12 warnings (mostly global functions wired through HTML/bundles).
