# AUDIT S2188 — Bill / Debt / Piutang Cross-Feature Reconciliation

## Scope

S2188 memvalidasi graph referensi setelah canonical-writer consolidation S2186–S2187.
Audit bersifat **read-only**: tidak memperbaiki data secara otomatis dan tidak mengubah schema/UI.

## Invariants

- ID duplikat pada `D.bills`, `D.billsArchive`, `D.debts`, dan `D.piutang` terdeteksi.
- Bill aktif dan bill archive dengan ID sama terdeteksi.
- `D.bills[].debtId` harus menunjuk `D.debts` yang ada.
- `D.debts[].billId` harus menunjuk bill aktif/archive yang ada.
- Relasi reciprocal Bill utang ↔ Debt diverifikasi bila kedua pointer tersedia.
- `D.piutang[].autoBillId` harus menunjuk bill aktif/archive.
- `D.piutang[].autoTxId` dan `linkedTxId` harus menunjuk transaksi yang ada.
- `D.debts[].autoTxId` harus menunjuk transaksi yang ada.
- Debt yang tertaut aset/investasi tidak boleh menunjuk entity yang sudah tidak ada.

## Verification

- S2186 canonical-writer tests: PASS
- S2187 residual-writer tests: PASS
- S2188 reconciler tests: **10/10 PASS**
- Cross-feature regression selected suite: **77/77 PASS**
- Build cumulative: PASS
- Both generated bundles: `node --check` PASS
- esbuild: tidak tersedia; bundle build tidak diminify.
- Full suite: tidak dijadikan acceptance gate pada checkpoint ini; historical full-suite runs masih timeout pada workspace besar.

## Decision

S2188 menambah **read-only reconciliation surface** tanpa auto-repair. Jika `reconcile()` menemukan issue, data harus diperbaiki melalui canonical domain writer yang sesuai pada sesi repair berikutnya; reconciler tidak boleh menghapus histori secara otomatis.
