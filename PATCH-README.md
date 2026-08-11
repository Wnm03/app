# Patch — Sesi 474 (Virtual Bill Item, s468d: buffer/regression final)
# = kw_patch_virtual-bill-item-tx-list-s468-final.zip (gabungan a+b+c+d)

Lihat `CHANGELOG.md` (bagian "Sesi 474", juga 471-473 di atasnya) untuk
detail lengkap. Fitur "Virtual Bill Item di List Transaksi"
(`s468-PLAN-virtual-bill-item-tx-list.md`) **SELESAI** — semua Definition
of Done terpenuhi.

## Ringkasan fitur (gabungan s468a+b+c+d)
- `modules/finance/tagihan-kalender.js` — `generateVirtualBillItemsForMonth(year,month)`
  murni: exclude bill lunas/arsip, id prefix `vbill_${billId}_${year}${month}`,
  nominal shared = `b.amount` apa adanya.
- `modules/finance/tx-list-cashflow.js` — `txHTML()` render kartu virtual
  (badge "⏳ Terjadwal", klik→`openBillModal`, 0 tombol hapus); `delTx()`
  guard baris pertama (id virtual → toast, tidak pernah sampai `askConfirm`).
- `modules/shared/modules-render.js` — `renderKeuangan()` wiring section
  `#allTxVirtualBills` di atas `#allTx`, **hanya** tampil saat
  `txListPeriode==='bulan'` & bulan/tahun = aktual sekarang.
- `index.html`, `app_production.html` — elemen `#allTxVirtualBills` baru.
- 18 test baru total (`virtual-bill-generator-s468a`,
  `virtual-bill-txhtml-deltx-guard-s468b`, `virtual-bill-alltx-wiring-s468c`,
  `virtual-bill-manual-scenario-s468d`).
- `app-bundle-a.min.js`, `app-bundle-b.min.js`, `sw.js`, `index.html`,
  `app_production.html` → versi 1196; konstanta versi module disamakan ke
  `s474-virtual-bill-item-final`.
- `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md` — regenerasi otomatis.

## Verifikasi final (gabungan)
- `node scripts/build.js s474-virtual-bill-item-final` — lolos, 0 error
  blocking.
- `node --test tests/*.test.js` → **3051/3051 lolos, 0 gagal**.
- `node scripts/verify-window-expose.js` / `verify-bundle-freshness.js` →
  lolos.

## Cara apply patch ini
Timpa (overwrite) file-file di atas ke root project hasil baseline
`kw_release_v1187_s466-...` (atau lebih baru, mis. bisa langsung dari
v1187 tanpa perlu patch s471/s472/s473 terpisah — patch ini SUDAH
gabungan penuh). Kalau sudah pernah apply patch s471/s472/s473 satu-satu,
patch ini idempotent (hasil akhirnya sama).

## Status
Release ini (`kw_release_v1196_s474-virtual-bill-item-final.zip`) siap
jadi baseline audit/sesi berikutnya.
