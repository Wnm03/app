# FIX v1215 → v1216 (s487) — Badge Cara Bayar "Tagihan"/"Utang" Tanpa Ikon di Kartu Transaksi

## Konteks
Item teratas `TODO.md` (BUG-004, "Bill/Piutang/Debt — dari Sesi Audit
2026-08-01"). `markBillPaid()` (`tagihan-kalender.js`) menulis
`payMethod:b.kind` ke transaksi pembayaran — `b.kind` bisa
`'tagihan'`/`'cicilan'`/`'langganan'`/`'utang'`. Badge kartu transaksi
(`txHTML()`, `tx-list-cashflow.js`) sebelumnya cuma punya ikon untuk 3
dari 4 kind itu (`pmIcons={cicilan,langganan,tunai}`), jadi transaksi
bayar Tagihan/Utang tampil dengan badge kosong (`pmIcons[t.payMethod]||''`
jatuh ke string kosong) — cuma teks polos " tagihan"/" utang" tanpa ikon,
padahal dropdown filter `#kfMethod` (`index.html`, Laporan) sudah lebih
dulu punya opsi lengkap dengan ikon 🧾 Tagihan/📕 Utang.

Saat mengecek isu ini di `TODO.md`, ditemukan 4 dari 6 item lain di
tabel yang sama (BUG-001, BUG-002, BUG-003, BUG-005, BUG-FIN-001) sudah
lama diperbaiki di sesi-sesi lampau (komentar `FIX (BUG-00N, sesi NNN)`
sudah ada di source) tapi tidak pernah disinkronkan ke `TODO.md` — tabel
tersebut diperbarui sesi ini untuk mencerminkan status source yang
sebenarnya.

## Fix
- `modules/finance/tx-list-cashflow.js` — `pmIcons` ditambah
  `tagihan:'🧾'` dan `utang:'📕'`, disamakan persis dengan ikon yang
  sudah dipakai opsi `#kfMethod` di `index.html` (0 ikon baru
  diciptakan, murni menyamakan yang sudah ada). `cicilan`/`langganan`/
  `tunai` tidak berubah.

## File yang berubah
- `modules/finance/tx-list-cashflow.js`
- `tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js` (baru, 6 test)
- `TODO.md` (update status 6 item, 5 di antaranya stale-doc correction)

## Test
`tests/s487-txhtml-pmicons-tagihan-utang-badge.test.js` — 6 test:
badge tagihan (🧾), badge utang (📕), regresi cicilan/langganan tidak
berubah (💳/🔁), regresi tunai tetap tanpa badge, regresi payMethod
kosong/undefined tetap tanpa badge & tidak error, dan fallback aman
untuk payMethod tidak dikenal (ikon kosong, bukan crash).

Full regression: **3178/3178 PASS** (naik dari 3172, +6, 0 regresi).
