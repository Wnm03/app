# v1153 → v1157 (S438 merge + S439 withSaveGuard retrofit batch 1)

## Konteks

Dua langkah digabung jadi satu sesi:

1. Merge `kw_patch_v1156_s438-audit-matrix-baseline-sync.zip` ke atas
   `kw_release_v1153_s437-ownership-linked-account-sync-fix.zip` (full
   release).
2. Dari 3 kandidat kerja sisa (double-proration bug `_saveBillInner`,
   `withSaveGuard()` retrofit 28 fungsi, split file kegedean) — cicil
   retrofit `withSaveGuard()` untuk 2-3 fungsi paling ringan dulu.

## 1. Merge patch S438 → full release

Patch S438 murni version-bump + baseline sync, 0 logic baru:

- `modules/shared/{features-helpers-global-security,modals,modules-render,
  modules-calc}.js`, `chat-action-handlers.js`: versi
  `s437-ownership-linked-account-sync-fix` → `s438-audit-matrix-baseline-sync`.
- `app_production.html`, `index.html`, `sw.js`: `?v=1153` → `?v=1156`,
  `CACHE_NAME` ikut.
- `docs/AUDIT_MATRIX.md`: baseline count Total files 740→822 (+82),
  JavaScript 527→555 (+28), Markdown 189→243 (+54) — drift terkumpul
  sejak S398, dicatat sbg non-fatal warning dari
  `lintDocsBaselineCountDrift()`.
- `app-bundle-a.min.js`, `app-bundle-b.min.js`: bundle hasil build S438.

Semua 11 file patch overlay bersih ke atas release v1153, tidak ada
konflik (diff dicek per-file sebelum overlay).

## 2. withSaveGuard() retrofit — batch 1 (3 fungsi paling ringan)

Kriteria "paling gampang": modal-form save tunggal, tidak async, tidak
manggil save-guard lain secara nested, sudah persis pola yang dipakai
`saveAcc()`/`saveBill()`/`Order.save()`/`Budget.save()`/`BBM.save()`/
`Kasir.checkout()` (`save(){return withSaveGuard(key, modalId, Obj.
_saveInner);}`).

Dipilih:

- `EduFund.save()` (`modules/finance/edukasi-dana.js`) → key `'eduFund'`,
  modal `eduFundModal`.
- `Piutang.save()` (`modules/finance/piutang-utang.js`) → key
  `'piutang'`, modal `piutangModal`.
- `Debt.save()` (`modules/finance/piutang-utang.js`) → key `'debt'`,
  modal `debtModal`.

Perubahan tiap fungsi: body lama dipindah jadi `_saveInner()`, `save()`
baru cuma manggil `withSaveGuard(key, modalId, Obj._saveInner)`. 0
logic bisnis diubah — murni retrofit guard submit-ganda, referensi
internal sudah pakai nama modul eksplisit (`EduFund.editId`,
`Piutang.editId`, dst — bukan `this.`), jadi aman didetach jadi fungsi
terpisah tanpa masalah binding.

Key `'eduFund'`/`'piutang'`/`'debt'` dicek dulu tidak bentrok dengan
key existing (`acc`, `bbm`, `bill`, `budget`, `kasir`, `order`).

### Test yang perlu disentuh

Dua test file manggil `.save()` langsung lewat `tests/helpers/
loadSource.js` (VM sandbox) tanpa memuat
`features-helpers-global-security.js`, jadi `withSaveGuard` belum ada
di scope-nya:

- `tests/edukasi-dana-crud.test.js`
- `tests/piutang-utang-numeric-guard-s403.test.js`

Fix: tambah `withSaveGuard: (key, modalId, fn) => fn()` ke
`extraGlobals`, pola yang sama persis sudah dipakai
`tests/tx-bbm-finance-integration.test.js` (`withSaveGuard`) &
`tests/servis-catalog-stock-sync-fix-s273.test.js`
(`withSaveGuardAsync`) untuk kasus serupa.

Test lain yang memuat `piutang-utang.js`/`edukasi-dana.js` dicek — tidak
ada yang manggil `.save()` langsung, jadi tidak perlu disentuh.

## Sisa retrofit (belum dikerjakan, ~25 fungsi lagi)

Kandidat lain (`aset.js:800`, `cobek-etalase.js:420`,
`cobek-order.js:38` `Produsen.save()`, dst) belum diaudit — beberapa
di antaranya (mis. `Produsen.save()`) manggil store/gate lain
(`SupplierStore.mutateCreate/mutateUpdate`) sehingga blast-radius-nya
lebih besar dari batch 1 ini, perlu sesi terpisah.

## Verifikasi

- `node --check` bersih di kedua file source yang diedit.
- `node --test tests/*.test.js` → **2900/2900 pass**, 0 fail (2896 lama
  + tidak ada test baru ditambah sesi ini, cuma 2 file existing
  di-patch).
- `node scripts/build.js s439-withsaveguard-retrofit-edufund-piutang-debt`
  → versi 1156→1157, `s438-audit-matrix-baseline-sync` →
  `s439-withsaveguard-retrofit-edufund-piutang-debt`, sintaks kedua
  bundle valid, `index.html`/`app_production.html` sinkron.
- Peringatan build (non-fatal, pre-existing, bukan dari sesi ini): 5
  file source di atas ambang 1600 baris (`business-flow-presenter.js`,
  `aset.js`, `scripts/build.js`, `modules-render.js`, `scan-ocr.js`) —
  ini kandidat #3 ("split file kegedean") yang masih di-park.
