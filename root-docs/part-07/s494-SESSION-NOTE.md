# Sesi 494 — Kuota Nominal Titipan di `investmentOwnersModal` (Gate 2, PLAN-owner-registry-multi-session.md)

Ref: `PLAN-owner-registry-multi-session.md` § "GATE 2 — Kuota Nominal
Titipan" dan § "S494".

## Prasyarat terverifikasi sebelum coding
- S493 selesai, v1224, full suite 3219/3219 hijau (konfirmasi dari
  `PLAN-owner-registry-multi-session.md`: "Status: RANGKAIAN S489-S493
  SELESAI").
- Audit dependency: `DanaTitipanPortfolioAPI._holdingSplits()`/`build()`/
  `getCommitments()` (dana-titipan-portfolio-presenter.js) dan
  `InvestmentUI` modal `investmentOwnersModal` (investasi-view.js) semua
  ADA & reusable. **0 file/dependency hilang** — tidak ada stub/skeleton
  dibuat.

## Gate 2 — dikonfirmasi eksplisit sebelum implementasi
| # | Keputusan | Hasil |
|---|---|---|
| 1 | Basis nominal per holding | **holdingCost** (pokok masuk, konsisten `DanaTitipanPortfolioAPI` existing) |
| 2 | Owner belum punya `titipanCommitments`/`principalAmount` | **Prompt "catat pokok dulu"** (bukan tampil tanpa batas) |
| 3 | Sifat validasi kuota lebih | **Soft warning** ⚠️ (tetap bisa Simpan, pola sama `OVER_ALLOCATED`) |
| 4 | Scope | **Hanya `investmentOwnersModal`** (implisit dari instruksi awal — `assetOwnersModal` out-of-scope) |

## Scope implementasi (persis sesuai instruksi)
1. API baru `DanaTitipanPortfolioAPI.allocatedExcluding(ownerId,
   holdingId)` — reuse `_holdingSplits()`, 0 rumus baru.
2. `investasi-view.js`: tampilkan "Kuota sisa: Rp X" live per baris owner
   non-SELF di `investmentOwnersModal`.
3. Validasi kuota dipisah TOTAL dari validasi total-porsi 100% — tidak
   saling override.
4. 0 migrasi/merge/rename data existing.
5. 0 refactor besar / business logic di luar scope S494.

## 1. `DanaTitipanPortfolioAPI.allocatedExcluding(ownerId, holdingId)`
Ditambahkan di `modules/finance/dana-titipan-portfolio-presenter.js`,
tepat setelah `_holdingSplits()` (di-reuse langsung). Loop
`Investment.getHoldings()`, skip holding yang `id`-nya sama dengan
`holdingId` (holding yang sedang dibuka di modal — supaya draft porsi di
holding itu sendiri tidak ganda dihitung, caller yang menjumlah nominal
draft holding ini secara terpisah), lalu jumlahkan `costSplit` per owner
dari `_holdingSplits(h)` untuk `ownerId` yang cocok (SELF selalu
dikecualikan, pola sama `build()`). `holdingId` opsional — kosong berarti
tidak ada holding yang dikecualikan (total ke SEMUA holding owner itu).

Tidak ada rumus baru: `costSplit[idx].bagian` 100% berasal dari
`MultiOwnerEngine.splitByPorsi(Investment.holdingCost(h), owners)` yang
sudah ada sejak S484.

## 2. `InvestmentUI` — tampilan "Kuota sisa" live
`modules/asset/investasi-view.js`:

- **`_ownerQuotaText(o)`** (baru) — fungsi murni yang mengembalikan HTML
  1 baris kuota:
  - Baris SELF atau `ownerId` kosong -> string kosong (kuota TIDAK pernah
    tampil untuk SELF/baris belum dipilih).
  - `DanaTitipanPortfolioAPI.getCommitments()` tidak ketemu record untuk
    `ownerId` ini, atau `principalAmount` bukan angka -> Gate 2 #2: baris
    "💰 Kuota titipan: belum dicatat — catat pokok dulu di menu Dana
    Titipan".
  - Ada record -> hitung `sisa = principalAmount -
    allocatedExcluding(ownerId, holdingId sedang dibuka) -
    (holdingCost(holding) * porsiDraft/100)`. `sisa < 0` -> Gate 2 #3:
    baris "⚠️ Kuota sisa: Rp X (melebihi pokok dikomit)" (class `red`, TAPI
    tetap hanya teks — tidak pernah menyentuh `saveBtn.disabled`). `sisa
    >= 0` -> baris normal "💰 Kuota sisa: Rp X".
- **`_updateOwnerQuotaDisplay(i)`** (baru) — update HANYA
  `document.getElementById('investOwnerKuota' + i).innerHTML`, tanpa
  render ulang list (pola sama `onOwnerPorsiInput()`/`onOwnerNameInput()`
  existing — supaya fokus/kursor input porsi tidak hilang tiap ketik).
- **`_renderOwnersList()`**: tiap baris non-SELF sekarang dibungkus
  `<div id="investOwnerKuota{i}">` berisi hasil `_ownerQuotaText(o)`.
  Baris SELF TIDAK punya container ini sama sekali (konsisten dgn
  `_ownerQuotaText()` yang balik string kosong untuk SELF).
- **`onOwnerPorsiInput(i,val)`**: ditambah 1 baris panggil
  `InvestmentUI._updateOwnerQuotaDisplay(i)` setelah `updateOwnersTotal()`
  — kuota ter-update live tiap ketik porsi, PERSIS pola live yang diminta
  instruksi.
- `onOwnerSelectChange()` (S491, tidak diubah) sudah memanggil
  `_renderOwnersList()` penuh tiap dropdown owner berganti — kuota ikut
  ter-refresh otomatis lewat render ulang itu, tidak perlu perubahan
  tambahan.

## 3. Pemisahan validasi kuota vs validasi total-porsi 100%
`updateOwnersTotal()` (kontrol `#investmentOwnersSaveBtn.disabled`) **0
baris diubah** — tetap 100% berbasis `MultiOwnerEngine.totalPorsi()`/
`remainingPorsi()`, tidak membaca kuota sama sekali. `_ownerQuotaText()`/
`_updateOwnerQuotaDisplay()` sebaliknya **tidak pernah** menyentuh
`saveBtn.disabled` — murni render teks informatif. Dibuktikan eksplisit
di test #11 (`s494-*.test.js`): total porsi pas 100% -> `saveBtn.disabled
=== false` meski kuota titipan sudah lebih (soft warning, Gate 2 #3).

## Yang TIDAK diubah (out-of-scope, sesuai HARD RULE)
- `assetOwnersModal`/`aset.js` — 0 sentuhan (Gate 2 #4).
- `D.titipanCommitments`/`D.investments[].owners[]` — dibaca apa adanya,
  0 tulis baru dari fitur kuota ini (murni read-only projection).
- `MultiOwnerEngine.validateOwners()`/`totalPorsi()`/`remainingPorsi()` —
  0 baris diubah.
- 0 stub/skeleton dibuat — semua dependency yang dibutuhkan (`Investment.
  holdingCost()`, `_holdingSplits()`, `getCommitments()`) sudah ada &
  dipakai apa adanya.

## Test baru
`tests/s494-titipan-kuota-nominal-investment-owners.test.js` (14 test):
- Test 1-6: `allocatedExcluding()` murni — exclude holding sedang dibuka,
  tanpa `holdingId` (jumlah semua holding), SELF dikecualikan, `ownerId`
  tidak ditemukan -> 0, `ownerId` kosong -> 0 (tidak throw), multi-owner
  porsi split lintas holding.
- Test 7-14: DOM `InvestmentUI` — baris SELF kosong, prompt "catat pokok
  dulu" saat belum ada commitment, hitung kuota sisa benar (principal -
  excluding - draft nominal), soft warning saat melebihi (bukan hard
  block), **pemisahan eksplisit dari validasi total-porsi 100%**
  (`saveBtn.disabled` tetap `false`), `_updateOwnerQuotaDisplay()` update
  elemen yang tepat, `onOwnerPorsiInput()` live-update, container
  `#investOwnerKuota{i}` hanya muncul di baris non-SELF.

## Verifikasi
- `node --test tests/s494-titipan-kuota-nominal-investment-owners.test.js`
  → **14/14 lolos**.
- `node --test tests/*.test.js` → **3233/3233 lolos, 0 gagal** (3219 lama
  + 14 baru, **0 regresi**).
- `node scripts/verify-window-expose.js` → lolos (68 modul, semua
  ter-expose; `_ownerQuotaText()`/`_updateOwnerQuotaDisplay()` internal,
  tidak lewat `data-action`, tidak perlu expose).
- `node scripts/build.js` → lolos semua lint blocking; versi **1224 →
  1225**; kedua bundle lolos `node --check`.
- `node scripts/verify-release-ready.js` → **LOLOS** (override lint
  eslint & minify esbuild, sandbox tanpa akses jaringan — sama seperti
  S488-S493, dicatat di `docs/RELEASE-GATE-LOG.md`).

## File berubah
- `modules/finance/dana-titipan-portfolio-presenter.js` — API baru
  `allocatedExcluding()`.
- `modules/asset/investasi-view.js` — `_ownerQuotaText()`,
  `_updateOwnerQuotaDisplay()`, wiring di `_renderOwnersList()` &
  `onOwnerPorsiInput()`.
- `tests/s494-titipan-kuota-nominal-investment-owners.test.js` (baru).
- `CHANGELOG.md` — entri Sesi 494.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `index.html`,
  `app_production.html`, `sw.js`, `modules/shared/modules-render.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `chat-action-handlers.js`,
  `modules/shared/features-helpers-global-security.js` — rutin lewat
  `build.js` (versi 1225).
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi
  otomatis.
- `docs/RELEASE-GATE-LOG.md` — entri override baru (lint/minify).

## Belum ditangani (di luar scope sesi ini)
- Gate 2 #4 kalau nanti diputuskan "ikut" `assetOwnersModal` juga — butuh
  sesi terpisah (S495+), sengaja tidak dikerjakan di sini.
- Lint (`eslint`) & minifikasi (`esbuild`) nyata — perlu `npm install` di
  environment dgn akses registry.
