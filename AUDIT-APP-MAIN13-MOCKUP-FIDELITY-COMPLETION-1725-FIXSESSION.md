# Audit — App Main 13 / Pro Mockup Fidelity — Sesi Perbaikan 1725

## Scope
Sesi lanjutan AKUMULATIF di atas patch 1718–1724 (bukan pengganti — semua file
patch 1718–1724 tetap ikut dalam ZIP ini apa adanya, tidak ada yang
dihapus/diturunkan). Sesi ini murni memperbaiki 2 temuan dari full test run
terhadap hasil patch 1724:

## Fix 1 — setCnTab() TypeError risk (modules/vehicle/vehicle-core.js)
**Sebelum (1724):**
```js
if(proBottom){...; if(bi!=null&&proBottom.children[bi])proBottom.children[bi].classList.add('active');}
```
Akses `proBottom.children[bi]` tanpa jaga-jaga kalau `proBottom.children`
sendiri `undefined` (mis. saat `proBottom` bukan elemen DOM asli — termasuk di
harness test yang pakai stub/fake element). Di DOM browser asli properti ini
nyaris selalu ada, tapi tetap rawan meledak kalau elemen datang dari sumber
non-standar (test, SSR, dsb).

**Sesudah (1725):**
```js
if(proBottom){...; const btnEl=bi!=null&&proBottom.children?proBottom.children[bi]:null; if(btnEl)btnEl.classList.add('active');}
```
Guard eksplisit sebelum indexing `.children[bi]`.

Test yang sebelumnya gagal (`tests/s679-scroll-flash-14-tabswitch-regression.test.js`
— subtest `setCnTab()`) sekarang PASS.

## Fix 2 — test gate versi basi (tests/pro-mockup-final-gate-1713.test.js)
Test lama hardcode assert `pro-ui-layer.css?v=1713` & `kw-cache-v1713`,
padahal versi build sudah naik lewat sesi-sesi lanjutan. Diupdate ke
`v=1725` mengikuti versi build ZIP ini (`node scripts/build.js 1725`).
Bundle A/B, index.html, app_production.html, sw.js ikut di-rebuild otomatis
oleh `build.js` supaya semua marker versi tetap sinkron (gate
`version-sync`/`html-sync`/`bundle-freshness` tetap PASS).

## Validation (sesi 1725)
- Full test suite: **6785/6785 PASS, 0 fail** (naik dari 6783/6785 di 1724).
- `verify-bundle-freshness.js`: PASS.
- `verify-window-expose.js`: PASS (82 data-action modules).
- `node --check` bundle A & B: PASS.
- `verify-release-ready.js`: masih GAGAL karena 3 hal — **2 di antaranya
  limitasi environment sandbox** (eslint & esbuild tidak terpasang, tidak ada
  akses jaringan buat install), **1 lagi pre-existing** dari sebelum patch
  1718 sama sekali (`service-sot-integrity` → sub-check "HISTORY/REMINDER
  consume `D.servisLogs`" — dikonfirmasi GAGAL juga di `app-main (13)` bersih
  tanpa patch apa pun, jadi di luar scope sesi mockup ini, TIDAK disentuh di
  sini supaya tidak mencampur perbaikan yang tidak diminta).

## File yang berubah sesi ini (di atas akumulasi 1718–1724)
- `modules/vehicle/vehicle-core.js` (fix guard)
- `tests/pro-mockup-final-gate-1713.test.js` (update assert versi ke 1725)
- `index.html`, `app_production.html`, `sw.js`, `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`
  (hasil otomatis `node scripts/build.js 1725`)

Semua file lain dari patch 1718–1724 (termasuk 5 modul `modules/shared/*`,
`modules/vehicle/pro-mockup-presenter.js`, `pro-ui-layer.css`,
`chat-action-handlers.js`, `scripts/build.js`, 3 file test 1716/1718/1724,
2 file AUDIT sebelumnya) tetap disertakan APA ADANYA dalam ZIP ini — tidak
ada yang hilang.
