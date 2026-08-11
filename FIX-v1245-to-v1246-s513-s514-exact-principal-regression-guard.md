# S514 — Dana Titipan Exact Principal Regression Guard

**Status: S514 COMPLETE — EXACT PRINCIPAL GUARDED**

## Ringkasan

S514 adalah sesi implementasi (bukan audit) dengan target tunggal:
memastikan nominal Dana Titipan `"1.700.000.000"` tersimpan dan tampil
tetap `"1.700.000.000"` — tidak ada floating error atau decrement ke
`1699999999`. Flow "Owner → Nominal → Asset → Kuota → Porsi" **ditunda**,
tidak dikerjakan sesi ini.

## Baseline

- Versi awal: `v1245` / `s512-dashboard-hub-dana-titipan`
- Test: 3353/3353 pass
- Dicek `docs/RELEASE-GATE-LOG.md`: tidak ada sesi S513/S514 sebelumnya (0 collision)

## Investigasi (STEP 1-7)

Pipeline penuh direproduksi memakai source **asli** (bukan re-implementasi
logic di test), lewat harness `loadSource`:

```
"1.700.000.000"
  --normalizeAmtToken/safeCalc (modules/shared/kalkulator-input.js)-->
1700000000
  --saveCommitment() (modules/finance/dana-titipan-portfolio-presenter.js)-->
D.titipanCommitments[].principalAmount === 1700000000
  --build()-->
owner.principalAmount === 1700000000 (utuh, tidak tersentuh
  allocation/over-allocation/return — field terpisah: overAllocatedAmount,
  outstandingPrincipal)
  --fmtFull() (modules/shared/format-tema.js)-->
"Rp 1.700.000.000"
```

Setiap titik pipeline diverifikasi satu per satu (termasuk lewat eksekusi
Node langsung, bukan cuma pembacaan kode) — **tidak ditemukan divergensi**
ke `1699999999` atau bentuk floating-point error lain di baseline v1245.

## Root Cause

**ROOT CAUSE: tidak ada bug ditemukan.** Pipeline exact-integer untuk kasus
`"1.700.000.000"` sudah benar sejak baseline v1245. Karena itu, sesuai
HARD RULE 9 (no core refactor tanpa root cause valid) dan RULE 16 (diff
discipline), **0 baris source produksi (.js non-test) diubah** sesi ini.

## Perubahan

Hanya **1 file baru** ditambahkan:

- `tests/s514-dana-titipan-exact-principal-guard.test.js` (8 test):
  1. `normalizeAmtToken("1.700.000.000")` → `"1700000000"`
  2. `safeCalc("1.700.000.000")` → `1700000000` (exact integer)
  3. `saveCommitment()` menyimpan `principalAmount` exact `1700000000`
  4. `fmtFull(1700000000)` → `"Rp 1.700.000.000"`
  5. Round-trip penuh: raw string → parse → save → `build()` → render
  6. **RULE 6 (principal SSOT)**: allocation (termasuk over-allocated)
     tidak pernah mengubah `principalAmount`
  7. **RULE 6**: pengembalian (`D.titipanReturns`) tidak mengubah
     `principalAmount` (hanya `outstandingPrincipal`, field derived
     terpisah)
  8. No-decrement guard eksplisit di setiap titik pipeline

Semua test memakai source produksi asli (`loadSource` harness), termasuk
`fmtFull`/`fmt` **asli** (bukan stub identity `String(n)` seperti sebagian
test s484/s485x lama) — supaya guard ini benar-benar mengunci perilaku
render production, bukan cuma logic murni.

## Test

- Sebelum: 3353/3353 pass
- Sesudah: **3361/3361 pass** (naik 8, semua baru, 0 gagal, 0 test lama
  diubah)

## Guard Status

- File core/finance (`dana-titipan-portfolio-presenter.js`,
  `kalkulator-input.js`, `modals.js`, `format-tema.js`): **tidak diubah**
- Flow Owner/Asset/Porsi/Kuota/Dashboard: **tidak disentuh**
- Schema Dana Titipan: **tidak berubah**
- Tidak ada field SSOT baru (`rawPrincipal`/`exactPrincipal`/dll)
- Tidak ada UI/modal/picker/tab baru

## Build

- Versi baru: `v1246` / `s513-dashboard-hub-dana-titipan` (bump otomatis
  dari `scripts/build.js`, konsisten dgn pola build-tanpa-source-change
  sebelumnya)
- `node --check` lolos di kedua bundle
- eslint & esbuild tidak tersedia di sandbox (tanpa akses jaringan) — lihat
  override di `docs/RELEASE-GATE-LOG.md`, konsisten pola S424 dst.
