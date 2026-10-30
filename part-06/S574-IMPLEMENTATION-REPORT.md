# S574-F — FINAL INTEGRATION, FULL TEST, BUILD & RELEASE

Laporan final integrasi S574-A s/d S574-F (fitur **Pemilik Sumber Potongan** untuk
akun multi-owner). Semua command di bawah benar-benar dijalankan pada working tree
hasil overlay BASE → A → B → C → D1 → D2 → E (latest change wins).

## 1. Scope S574

Desain final (TIDAK berubah dari checkpoint sebelumnya):

```
ACCOUNT
  ↓
owners[]
  ↓
transaction.deductionOwnerId
  ↓
Pemilik Sumber Potongan
```

`deductionOwnerId` murni metadata assignment — **bukan** `amount × ownership
percentage`. Saldo transaksi tetap dipotong 100% dari akun yang dipilih; owner
hanya menandai siapa yang "menanggung" transaksi itu di antara owners akun.

## 2. S574-A — Akun Owner Helper

`getAccOwners(accId)` / `setAccOwners(accId, owners)` di `modules/finance/akun.js`
— wrapper tipis di atas `MultiOwnerEngine`, dengan fallback sintesis 1 owner SELF
100% untuk akun yang belum punya `owners[]`. **PASS** (verified via S574 test suite).

## 3. S574-B — Account Owners UI

`AccOwners` object (`modules/finance/akun.js`) + modal `accountOwnersModal`
(`modules/shared/modals.js`, `#accountOwnersModal`) — CRUD baris owner, validasi
total 100% sebelum simpan, reset draft. **PASS**.

## 4. S574-C — Transaction Deduction Owner Picker

`#txDeductionOwnerWrap` / `#txDeductionOwner` di modal transaksi
(`modules/shared/modals.js`) + wiring show/hide otomatis di
`modules/finance/transaksi.js` — picker hanya muncul kalau akun terpilih
multi-owner; single-owner tidak dapat friksi. **PASS**.

## 5. S574-D1 — deductionOwnerId CREATE

`saveTx()` (`modules/finance/transaksi.js`) menulis `deductionOwnerId` saat
transaksi baru dibuat, hanya jika akun multi-owner & owner dipilih. Account
switching membuang pilihan owner lama (tidak terbawa ke akun lain). **PASS**.

## 6. S574-D2 — deductionOwnerId EDIT + Persist Validation

`saveTx()` edit-path menyimpan ulang `deductionOwnerId`; validasi persist
ditambahkan test baru `tests/s574-d2-deduction-owner-persist-validation.test.js`.
**PASS**.

## 7. S574-E — editTx Prefill, History Badge, Data-Health

- `editTx()` (`modules/finance/transaksi.js`) — prefill `#txDeductionOwner` dari
  `deductionOwnerId` transaksi tersimpan.
- `modules/finance/tx-list-cashflow.js` — badge riwayat menampilkan nama owner
  kalau `deductionOwnerId` ada.
- `data-health-check.js` — deteksi orphan `deductionOwnerId` (owner tidak ada /
  bukan owner akun transaksi / akun sudah tidak valid), tanpa memicu false-positive
  pada transaksi lama tanpa field ini.
- Test baru: `tests/s574-e-history-badge-datahealth-regression.test.js`.
**PASS**.

## 8. Files Changed (LIVE, dari BASE)

| File | Checkpoint |
|---|---|
| `modules/finance/akun.js` | A, B (+ fix window-expose `AccOwners`, sesi F) |
| `modules/shared/modals.js` | B, C |
| `modules/finance/transaksi.js` | C, D1, D2, E |
| `modules/finance/tx-list-cashflow.js` | E |
| `data-health-check.js` | E |
| `tests/s574-d2-deduction-owner-persist-validation.test.js` | D2 (baru) |
| `tests/s574-e-history-badge-datahealth-regression.test.js` | E (baru) |

File lain yang berubah (`index.html`, `app_production.html`, `app-bundle-a.min.js`,
`app-bundle-b.min.js`, `sw.js`, `chat-action-handlers.js`,
`modules/shared/modules-calc.js`, `modules/shared/modules-render.js`,
`modules/shared/features-helpers-global-security.js`, `docs/FILE-MAP.md`,
`docs/COVERAGE-PER-MODULE.md`) adalah **produk otomatis `node scripts/build.js`**
(version bump `s572-owner-porsi-tx-assignment` → `s573-owner-porsi-tx-assignment`,
build number 1303 → 1304, regenerasi bundle & dokumentasi) — bukan perubahan logic
manual, dan meliputi juga fix drift index `MODAL_HTML` di `index.html` /
`app_production.html` (lihat §9).

## 9. Regresi yang Ditemukan & Diperbaiki di Sesi F

Selama full test & build, ditemukan **2 regresi S574** (bukan pre-existing) yang
diperbaiki di sesi ini sebelum release:

1. **`verify-window-expose` gagal** — modul `AccOwners` (S574-B,
   `modules/finance/akun.js`) dipakai lewat banyak `data-action="AccOwners.xxx"`
   di modal `accountOwnersModal` & `accModal`, tapi tidak pernah di-`window.AccOwners=AccOwners`.
   **Fix:** tambah blok `if(typeof window!=='undefined'){window.AccOwners=AccOwners;}`
   di akhir definisi `AccOwners`, mengikuti pola persis `OwnerRegistry`/`CustodianRegistry`.
2. **`MODAL_HTML index drift` — build gagal (182 drift)** — S574-B menyisipkan
   modal `accountOwnersModal` ke TENGAH array `MODAL_HTML` (`modules/shared/modals.js`,
   setelah `accModal`), sehingga semua index sesudahnya geser, tapi komentar
   `<!-- modal:xxx -->` & nomor `document.write(MODAL_HTML[N])` di `index.html`
   dan `app_production.html` tidak ikut disesuaikan. **Fix:** sisip entry
   `document.write(MODAL_HTML[8]);</script><!-- modal:accountOwnersModal -->` di
   posisi yang benar (persis setelah entry `accModal`) di kedua file HTML, lalu
   renumber seluruh index sesudahnya secara berurutan.

Setelah kedua fix ini, `npm test` & `node scripts/build.js` kembali ke baseline
(0 regresi baru, build PASS).

## 10. Tests

### S574 Targeted Test Suite

```
node --test tests/s574-d2-deduction-owner-persist-validation.test.js \
  tests/s574-e-history-badge-datahealth-regression.test.js \
  tests/s574-tx-account-not-owner-no-split.test.js
```

**Hasil: 30/30 PASS** (cocok dengan target yang diketahui dari S574-E). 0 failure, 0 skip.

### Full `npm test`

```
node --test tests/*.test.js
```

**Hasil final: 4033 tests, 4026 PASS, 7 FAIL** — 7 failure PERSIS SAMA (nama & lokasi
identik) dengan 7 pre-existing failure di BASE (diverifikasi dengan menjalankan
`npm test` juga di BASE sebelum overlay apa pun diterapkan). **0 regresi baru dari
S574.**

7 pre-existing failure (terverifikasi gagal juga di BASE):
1. `runDataHealthCheck: warn kalau Transaksi tertaut ke Aset yang accountId-nya SAMA dgn akun transaksi itu sendiri`
2. `_ownerNominalText(): holding tidak ada -> string kosong`
3. `_ownerNominalText(): basis holdingValue() ... BUKAN holdingCost()`
4. `_ownerNominalText(): porsi 0/kosong -> nominal 0`
5. `_ownerNominalText(): porsi 100% -> nominal = holdingValue() penuh`
6. `onOwnerPorsiInput(): mengetik % baru langsung meng-update #investOwnerNominal{i} (live)`
7. `_ownerNominalText(): TIDAK PERNAH menulis balik ke draft/holding`

Semua 7 berasal dari domain **Investment Owners nominal display** (tidak terkait
S574 sama sekali).

## 11. Baseline vs Final

| | OLD baseline (dari brief) | BASE tree (verified) | FINAL (setelah S574 + fix) |
|---|---|---|---|
| Total tests | 4006 | 4006 | 4033 |
| PASS | 3999 | 3999 | 4026 |
| FAIL | 7 | 7 | 7 |
| S574 failures | — | — | 0 |

Total test bertambah 27 (4006 → 4033) karena 2 file test baru dari S574-D2 & S574-E
(masing-masing berisi beberapa subtest S574).

## 12. Build Result

```
node scripts/build.js
```

**PASS.** Ringkasan:
- Semua lint regresi built-in PASS (u-dnone risky, escapeHtml, Tesseract guard,
  overlay open self-heal, reflow guard, scanner structural drift).
- **`MODAL_HTML index drift`: PASS setelah fix §9.2** (0 drift, sebelumnya 182).
- 29 catch block kosong (pre-existing warning, tidak menghentikan build).
- 9 file oversized (pre-existing warning, tidak menghentikan build).
- `docs/AUDIT_MATRIX.md` coverage baseline usang (pre-existing warning).
- Version disamakan: `s572-owner-porsi-tx-assignment` → `s573-owner-porsi-tx-assignment`,
  build number 1303 → 1304.
- `app-bundle-a.min.js` & `app-bundle-b.min.js` ditulis ulang (esbuild tidak
  terpasang di environment ini → bundle tidak diminify, tapi 100% valid,
  `node --check` lolos).
- `node scripts/verify-bundle-freshness.js` → **PASS**, hash source cocok dengan bundle.

## 13. Orphan Verification

WAJIB tetap tidak berubah — **diverifikasi identik byte-for-byte terhadap BASE**:
- `modules/modals.js` — UNCHANGED
- `modules/shop/modals.js` — UNCHANGED
- `finance/*` — UNCHANGED (seluruh direktori, diverifikasi dengan `diff -rq`)

## 14. Known Pre-existing Failures

Lihat §10 — 7 failure di domain Investment Owners nominal display, terverifikasi
gagal juga di BASE (sebelum S574 diterapkan), sehingga bukan tanggung jawab S574.

## 15. Final Conclusion

- Semua checkpoint S574-A s/d E terintegrasi dengan urutan overlay yang benar
  (latest change wins), tanpa redesign & tanpa fitur baru di luar scope.
- 2 regresi ditemukan (window-expose `AccOwners`, MODAL_HTML index drift) —
  **keduanya diperbaiki** di sesi F sebelum release, bukan disembunyikan.
- 30/30 S574 targeted test PASS.
- Full test: 0 regresi baru (4026/4033 PASS, 7 FAIL = 100% pre-existing).
- Build PASS, bundle freshness PASS.
- Orphan (`modules/modals.js`, `modules/shop/modals.js`, `finance/*`) UNCHANGED.

**FINAL STATUS: COMPLETE**
