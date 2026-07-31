# Fix v971 (s311) — Scan Massal Transaksi Lama (saran #4 dari audit s306)

## Latar belakang

Lanjutan `AUDIT-billlinkid-remaining-gaps.md`. Saran #1-3 sudah dikerjakan di
s308-s310. Saran **#4** ("Self-healing reaktif satu-per-satu, tidak ada scan
massal") sengaja belum dikerjakan sebelumnya karena butuh UI baru (🔴) —
dikerjakan sesi ini.

## Perubahan

1. `modules/finance/tagihan-kalender.js`:
   - `scanAllBillFallbackCandidates(billsArchive, transactions)` — fungsi
     murni, scan SEMUA entri `D.billsArchive` yang belum ter-`billLinkId`
     sekaligus, pakai fallback yang sama persis dengan
     `openBillPaymentDateEdit()` (`findFallbackBillPaymentTxId`). Beda dari
     jalur reaktif: entri yang AMBIGU (`countFallbackBillPaymentCandidates`
     >1) di-**skip**, bukan auto-link + toast peringatan — karena scan massal
     tidak memberi kesempatan user cek satu-satu sebelum commit.
   - `BillFallbackScan` — objek UI (`open/render/confirmSelected`): tampilkan
     preview daftar kandidat dengan checkbox (default tercentang), user bisa
     uncheck yang ragu, baru commit (tulis `billLinkId`) — bukan auto-save
     langsung, sesuai saran audit.

2. `modules/shared/modals.js`:
   - Tombol baru "🔍 Scan & Tautkan Transaksi Lama" di modal
     `billArchiveModal` (✅ Cicilan/Tagihan Lunas).
   - Modal baru `billFallbackScanModal` (preview + tombol commit).

3. `index.html` / `app_production.html`: renumbering `MODAL_HTML[N]` script
   tag (modal baru disisipkan di index 41, semua index sesudahnya +1) —
   total tetap 90 modal, sudah diverifikasi jumlahnya cocok.

4. `app-bootstrap.js`: daftarkan `BillFallbackScan` ke
   `Object.assign(window,{...})`.

## Test baru

`tests/s311-bill-fallback-scan-massal.test.js` (6 test, cakupan: kandidat
valid ketemu, entri sudah ter-link di-skip, entri ambigu di-skip, tidak ada
kandidat di-skip, scan campuran banyak entri sekaligus, input kosong/null
tidak error).

## Verifikasi

- `node --test tests/*.test.js` → **2012/2012 PASS**.
- `node --check` semua file yang diubah → OK.
- Build: `s311-fallback-ambiguity-warning` → versi **971**, sintaks bundle
  valid, `index.html` & `app_production.html` identik (auto oleh build.js).
