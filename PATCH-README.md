# PATCH-README — Merged S646–S657

Gabungan 12 patch sesi (S646, S647, S648, S649, S650, S651, S652, S653, S654,
S655, S656, S657) menjadi satu file patch. Setiap file yang berubah lebih
dari sekali diambil dari sesi **paling akhir** (fix kumulatif — sesi
berikutnya membangun di atas sesi sebelumnya, dikonfirmasi via diff, bukan
menimpa/menghapus fix lama). File yang unik per sesi disertakan apa adanya.

## Resolusi file yang overlap antar sesi

| File | Sesi yang menyentuh | Diambil dari | Alasan |
|---|---|---|---|
| `modules/finance/filter-laporan.js` | S647, S648 | **S648** | S648 menambahkan fix BUG-010 (`txMatchesSearch`) di atas fix BUG-009 milik S647 — diverifikasi via `diff`, tidak ada baris S647 yang hilang. |
| `TODO.md` | S651, S652, S653, S654, S655 | **S655** | Update dokumentasi kumulatif tiap sesi; S655 adalah revisi terakhir & mencakup seluruh catatan sesi sebelumnya. |
| `docs/BUG_REGISTRY.md` | S656, S657 | **S657** | S657 adalah koreksi eksplisit atas klaim yang keliru di catatan S656 (soal status test regresi BUG-006). |

## File unik (tidak overlap, diambil langsung)

- `modules/finance/worthit.js` — S646 (BUG-008)
- `modules/finance/tx-list-cashflow.js` — S649 (BUG-012)
- `modules/finance/financial-risk-dashboard-api.js` — S650 (BUG-013)
- 8 file test baru (satu per sesi S646–S650, S652–S654)
- 12 `SESSION-NOTE-S###.md` — seluruhnya disertakan sebagai jejak audit per sesi

## Verifikasi yang dilakukan

- `node --check` pada seluruh file `.js` hasil merge (4 file modul + 8 file
  test) → **lolos, tanpa error sintaks**.
- Isi `filter-laporan.js`, `TODO.md`, dan `BUG_REGISTRY.md` di-diff antar
  versi sesi untuk memastikan versi terakhir bersifat kumulatif/superset,
  bukan regresi.

## Cara apply

Extract isi zip ini ke root project (`app-main/`), timpa file yang sudah
ada. Tidak perlu urutan apply — ini sudah merupakan hasil akhir gabungan
seluruh sesi S646–S657.
