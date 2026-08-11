# FIX v1175 → v1176 (s455) — Dana Titipan Dikeluarkan dari Strategi Pelunasan Utang

## Konteks
Lanjutan diskusi S454: dana titipan owner non-SELF (`_syncOwnerDebts()`,
disimpan sbg entri di `D.debts` biar Kekayaan Bersih benar) ikut kebaca
`DebtStrategy.activeDebts()` — nongol di "Strategi Pelunasan Utang"
(snowball/avalanche) & menaikkan `activeCount` Debt Optimizer, padahal
bukan kewajiban yang perlu dilunasi (bunga/cicilan selalu 0, tanpa jatuh
tempo). Reminder jatuh-tempo/utang-macet/DSR/Dana-Kelolaan sudah aman
duluan (semua syaratnya `jatuhTempo` terisi atau ownership non-SELF, yang
mana titipan tidak memenuhi).

## Fix
- `DebtStrategy.activeDebts()` (`modules/finance/piutang-utang.js`) —
  tambah `!d.linkedAssetId` ke filter (penanda titipan yang sudah ada,
  0 field baru). `Debt.totalValue()` (Kekayaan Bersih) TIDAK disentuh.
- `Debt.renderList()` — badge baru "🔒 Titipan — bukan kewajiban dibayar"
  di kartu utang yang `linkedAssetId`-nya terisi.

## File yang berubah
- `modules/finance/piutang-utang.js`
- `tests/s455-owner-debt-exclude-strategy.test.js` — **baru**, 3 test:
  titipan exclude dari `activeDebts()`, utang biasa tidak berubah,
  `totalValue()` tetap menghitung titipan.
- Bundle/versi otomatis (`node scripts/build.js`).

## Testing
- `npm test` → **2948/2948 pass** (naik dari 2945, +3 test baru)
- `node scripts/build.js s455-owner-debt-exclude-strategy` → build sukses

## Versi
- Lama: v1175 (s454-multiowner-linked-account-badge)
- Baru: **v1176 (s455-owner-debt-exclude-strategy)**
