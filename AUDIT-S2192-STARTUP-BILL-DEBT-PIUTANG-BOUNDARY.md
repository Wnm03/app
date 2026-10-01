# Audit S2192 — Startup / Persistence Loading Bill-Debt-Piutang Boundary

## Scope
Audit startup `load()` untuk memastikan state Bill/Debt/Piutang yang legacy atau parsial tidak melewati boundary karena urutan inisialisasi yang salah.

## Temuan substantif
Sebelum S2192, `load()` menjalankan `Debt.syncBill()` segera setelah `D.debts` diinisialisasi, sementara `D.bills` dan `D.billsArchive` baru dibuat beberapa puluh baris kemudian. Pada snapshot lama yang tidak memiliki `bills`, `Debt.syncBill()` mengakses `D.bills.find(...)`, melempar exception, lalu exception ditelan oleh `catch(e){void e;}`. Akibatnya bill cicilan yang seharusnya direbuild tidak pernah dibuat.

## Repair
- `D.bills` dan `D.billsArchive` sekarang diinisialisasi sebelum `D.debts`/`Debt.syncBill()`.
- `Debt.syncBill()` tetap dipanggil pada startup karena idempotent dan merupakan canonical projection dari Debt -> Bill.
- Error startup sync tidak lagi ditelan tanpa jejak; dicatat melalui `console.error`.
- Tidak ada perubahan UI.
- Tidak ada schema change.
- Tidak ada legacy deletion.

## Verification
- S2192 startup boundary: 2/2 PASS.
- BUG-006 syncBill regression: 4/4 PASS.
- S2188 reconciler: 4/4 PASS.
- S2191 restore integrity: 4/4 PASS.
- Combined checkpoint: 14/14 PASS.
- Build: PASS.
- Bundle A/B syntax: PASS.
- esbuild tidak tersedia; bundle tidak diminify.

## Generated files
Build menghasilkan version/generated artifacts (2184), tetapi tidak dimasukkan ke patch S2192 karena bukan perubahan source yang diperlukan untuk repair ini.
