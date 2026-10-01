# Audit S2189 — Residual Debt Writer Boundary

## Scope

Verifikasi lanjutan setelah S2186–S2188 untuk memastikan mutation `D.debts` pada jalur production yang terkait Dana Titipan, Asset, dan Investment tidak lagi melewati canonical writer.

## Finding

Ditemukan satu residual nyata di `modules/finance/titipan-sync.js`: update Debt existing masih menggunakan `Object.assign(debt, ...)` langsung.

Dua jalur serupa di `modules/asset/aset-owners.js` dan `modules/asset/investasi.js` juga dinormalisasi ke `BillDebtPiutangCanonicalWriter.updateById('debts', ...)` agar seluruh update field Debt melewati boundary yang sama.

## Non-findings

Static sweep production pada domain Asset/Investment/Finance/Shop/Business/Shared tidak menemukan lagi direct assignment field Debt seperti `d.linkedOwnerId = ...` atau `Object.assign(debt, ...)`, selain fixture/self-test dan inisialisasi collection (`if (!D.debts) D.debts=[]`).

Inisialisasi collection bukan business mutation row dan tetap dipertahankan.

## Verification

- Asset/Titipan/Investment/Reconciler regression: **142/142 PASS**.
- `node --check` affected source files: **PASS**.
- Production static sweep residual Debt field mutation: **PASS**.
- `node scripts/build.js`: **PASS**.
- Bundle A/B syntax: **PASS**.
- esbuild tidak tersedia, sehingga bundle build tidak diminify.
- Full-suite acceptance tetap tidak diklaim dari sesi ini; suite besar sebelumnya dapat timeout.

## Decision

A-S2189 ditutup sebagai hardening arsitektur: **tidak ada perubahan schema/UI**, tidak ada legacy deletion, dan tidak ada business-rule rewrite. Perubahan hanya memindahkan mutation Debt yang sudah ada ke canonical writer.
