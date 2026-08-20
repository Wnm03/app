# Sesi S656 — Closeout status `docs/BUG_REGISTRY.md` (BUG-006/008/009/010/012/013)

## Konteks

`TODO.md` sudah disinkronkan ke DONE untuk BUG-006/007/008/009/010/011/012/013
di sesi S651 (stale-doc cleanup), tapi `docs/BUG_REGISTRY.md` — sumber audit
asli — tidak ikut diupdate sesi itu (di luar cakupan S651, cuma `TODO.md`
yang disentuh). Enam entry (BUG-006, 008, 009, 010, 012, 013) di
`docs/BUG_REGISTRY.md` masih tertulis `Status: **OPEN**` padahal fix-nya
sudah landing (BUG-006 sebelum S646, sisanya sesi S646–S650) — persis pola
staleness yang sudah pernah ditutup untuk BUG-007 (verifikasi 2026-08-16)
dan GAP3-AUD-001. Rekomendasi eksplisit di `SESSION-NOTE-S655.md`:
"kalau ada kebutuhan lain ... audit ke source dulu sebelum eksekusi" —
di sini staleness-nya sudah dikonfirmasi langsung (bukan asumsi):
`grep` komentar `FIX (BUG-XXX, audit 2026-08)` ditemukan persis di
masing-masing file/fungsi yang disebut recommendation aslinya.

**0 perubahan logic/behavior sesi ini — murni sinkronisasi dokumentasi.**
Tidak ada file kode (`modules/*.js`) atau test yang disentuh.

## Verifikasi sebelum edit

Dicek langsung tiap file source (bukan cuma percaya `TODO.md`):

| Bug | File | Komentar fix ditemukan | Regression test |
|---|---|---|---|
| BUG-006 | `modules/finance/piutang-utang.js` | `FIX (BUG-006, audit 2026-08)` di `Debt.syncBill()` | belum ada test khusus — dicatat terpisah, lihat catatan di bawah |
| BUG-008 | `modules/finance/worthit.js` | `FIX (BUG-008, audit 2026-08)` di `WorthIt.catatBeli()` | `tests/s646-worthit-catatbeli-cicilan-dp.test.js` (S646) |
| BUG-009 | `modules/finance/filter-laporan.js` | `FIX (BUG-009, audit 2026-08)` di `toggleKeuFilter()` | `tests/s647-togglekeufilter-class-detect.test.js` (S647) |
| BUG-010 | `modules/finance/filter-laporan.js` | `FIX (BUG-010, audit 2026-08)` di `showFilteredTx()` scope `'keuangan'` | `tests/s648-showfilteredtx-keuangan-search-scope.test.js` (S648) |
| BUG-012 | `modules/finance/tx-list-cashflow.js` | `FIX (BUG-012, audit 2026-08)` di `changeMonth()`/`changeTxListMonth()` | `tests/s649-changemonth-financeintelligence-cache-invalidate.test.js` (S649) |
| BUG-013 | `modules/finance/financial-risk-dashboard-api.js` | `FIX (BUG-013, audit 2026-08)` di `_emergencyFundRisk()` | `tests/s650-emergencyfundrisk-realtime-balance.test.js` (S650) |

BUG-006 tetap ditandai FIXED (sumbernya sudah fix, dikonfirmasi komentar di
source, sama seperti BUG-007/BUG-011 yang sudah lama fix sebelum audit
S646) — tapi regression test spesifik utk skenario `Debt.syncBill()` orphan
belum ada. Ini **tidak diklaim** sebagai sudah ada di entry-nya (lihat teks
status), dan tetap dicatat sbg item terbuka terpisah di bawah, konsisten
dgn catatan asli S651.

## Yang dikerjakan

`docs/BUG_REGISTRY.md`:
- Enam entry (`## BUG-006`, `## BUG-008`, `## BUG-009`, `## BUG-010`,
  `## BUG-012`, `## BUG-013`) — baris `Status: **OPEN**` diganti jadi
  `Status: **FIXED**` dengan catatan tambahan (pola PERSIS sama BUG-007:
  histori audit asli di bawahnya **TIDAK diedit**, cuma baris Status yang
  ditambah keterangan file/fungsi/komentar fix + referensi test/sesi).

**0 file kode disentuh, 0 test baru** — sesi housekeeping dokumentasi murni,
sama seperti S651/S655.

## Item terbuka yang belum tertutup (dicatat, bukan dikerjakan sesi ini)

- Regression test khusus skenario `Debt.syncBill()` → orphan piutang
  (BUG-006) belum ada — analog `removeOrphanedAutoPiutangForBill()` yang
  sudah ada test-nya untuk `delBill()`. Sudah disebut sbg item terbuka
  sejak `SESSION-NOTE-S651.md`, belum masuk urutan sesi manapun.

## Test

Full suite pada tree baseline (`node --test tests/*.test.js`, 4630 test di
tree ini — belum termasuk test file S646-S655 yang di-patch terpisah) →
**4630/4630 pass**, 0 fail. Perubahan sesi ini murni file Markdown, tidak
menyentuh kode/loader test, jadi tidak berpengaruh ke hasil.

## File yang berubah (patch-only)

```
docs/BUG_REGISTRY.md   (edit — dokumentasi saja, 0 perubahan kode/test)
```

## Sesi berikutnya (rekomendasi)

- Kalau BUG-006 mau ditutup total (bukan cuma status doc): tambah
  regression test `Debt.syncBill()` orphan piutang (item di atas) — bisa
  1 sesi kecil sendiri.
- Blok E (Data Health) & Blok F (test coverage) sudah selesai per
  `SESSION-NOTE-S655.md`.
- Blok G (Atur Porsi Kepemilikan 392d/392e) masih menunggu keputusan
  produk + prasyarat audit write-path `OwnerRegistry`/`saveOwners()` —
  belum dieksekusi.
