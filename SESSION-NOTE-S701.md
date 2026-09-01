# SESSION-NOTE-S701 — Koreksi staleness BUG-INV-001 di BUG_REGISTRY.md (docs-only, 0 coding)

**Basis akumulasi:** ZIP ini adalah AKUMULASI PENUH — seluruh 42 file
dari `kw-patch-s700-2026-09-01-bug006-bug007-audit-matrix-sync.zip`
(v1512) dipertahankan APA ADANYA, ditambah 1 file diubah
(`docs/BUG_REGISTRY.md`) + 1 file baru (catatan ini). Timpa SEMUA file
di ZIP ini ke project asli — tidak perlu apply S700 terpisah lebih
dulu.

## Konteks

Item ini muncul dari audit "sisa BUG_REGISTRY.md di luar §0a/§0a-2" yang
dicatat sebagai "Belum dikerjakan" di SESSION-NOTE-S700, dengan asumsi
awal BUG-INV-001 "MEMANG masih genuinely OPEN". Audit sesi ini
menemukan sebaliknya: BUG-INV-001 sudah FIXED, tapi baris `Status:`
final entry-nya di `docs/BUG_REGISTRY.md` membeku di OPEN — staleness
yang SAMA PERSIS dengan pola BUG-006/BUG-007/BUG-FIN-001 yang
dibereskan S699/S700.

## Root cause

Di dalam entry BUG-INV-001 (§0a-8), paragraf **"Update Sesi 468"**
(menyatakan eksplisit "Fase 4 SELESAI... BUG-INV-001 status: FIXED")
tercetak SEBELUM paragraf **"Update Sesi 467"** secara fisik di file —
urutan terbalik dari kronologi sesi asli (466→467→468). Baris `Status:`
final di bawah kedua paragraf itu mewarisi kesimpulan paragraf terakhir
yang terbaca (467, "Fase 4 MASIH belum dikerjakan... OPEN"), bukan
kesimpulan sebenarnya (468, FIXED).

## Verifikasi (langsung ke source, bukan cuma percaya dokumen lain)

- Fase 1 — `Investment.addHolding()` punya caller nyata di
  `modules/asset/investasi-list-view.js` (`InvestmentListUI.save()`),
  juga `modules/asset/aset.js` & `modules/asset/aset-misc.js`.
- Fase 2 — `modules/asset/investasi-tx-view.js` (`InvestmentTxUI`),
  `Investment.addTransaction()` ter-wire nyata. Test
  `tests/investment-tx-watch-ui-s467.test.js`: **20/20 pass**.
- Fase 3 — `modules/asset/investasi-watch-view.js` (`InvestmentWatchUI`),
  `Investment.addWatch()` ter-wire nyata.
- Fase 4 — `tests/investment-dead-read-verification-s468.test.js`
  (9 test, verifikasi 5 call site: `dana-kelolaan.js`,
  `invest-ai-widget.js`, `self-reward-ai-widget.js`,
  `ownership-settings-presenter.js`, `user-finance-adapter.js`):
  **9/9 pass**.
- `tests/investment-list-ui-s466.test.js`: **15/15 pass**.
- Cross-check dokumen lain yang mereferensikan BUG-INV-001:
  `docs/KNOWN-ISSUES.md` & `TODO.md` — 0 referensi (tidak ada yang perlu
  disinkron). `docs/AUDIT_MATRIX.md` — hanya disebut sepintas di catatan
  baseline (baris 36), sudah konsisten dgn FIXED, tidak stale.
- Entri lain di luar §0a-8 (GAP3-AUD-001/002, OWNREG-GATE3-001,
  BUG-015/016, BUG-S516-001) — dicek, semua sudah konsisten (FIXED
  tersinkron, atau memang sengaja OPEN/OUT OF SCOPE by design decision).
  Tidak ada staleness serupa selain BUG-INV-001.

## Fix (docs-only, 0 source disentuh)

- `docs/BUG_REGISTRY.md`, entry BUG-INV-001 (§0a-8): paragraf
  "Update Sesi 467" & "Update Sesi 468" direorder jadi kronologis
  (isi paragraf TIDAK diubah — histori audit asli dipertahankan); baris
  `Status:` final diubah OPEN → **FIXED** dgn catatan koreksi S701.

## Test & Build

0 file source (`modules/`, `index.html`, dll) disentuh — murni 1 file
docs (`docs/BUG_REGISTRY.md`). Full suite dijalankan ulang sebagai
verifikasi rutin (tidak diharapkan berubah): semua test terkait
Investment PASS (lihat daftar di atas). `node scripts/build.js`
**TIDAK dijalankan** (versi tetap 1512, konsisten dgn konvensi sesi
docs-only — sama seperti S699/S700).

## File yang berubah di ZIP ini

- `docs/BUG_REGISTRY.md` — **fix utama sesi ini**: entry BUG-INV-001
  (§0a-8) — reorder paragraf Update Sesi 467/468 + Status OPEN → FIXED
- `SESSION-NOTE-S701.md` — baru

## Belum dikerjakan (di luar scope sesi ini, tetap di daftar audit)

- `economic-intelligence/` — belum disentuh.
- Penghapusan file dead `modules/modules-render.js` (dan file dead lain
  di `scripts/remove-shop-dead-files.sh`) — masih menunggu keputusan
  user.
- Restore `esbuild` / pemecahan `scripts/build.js` (2444 baris, di atas
  ambang 1600) — belum dikerjakan (butuh akses jaringan, di luar
  sandbox ini).
