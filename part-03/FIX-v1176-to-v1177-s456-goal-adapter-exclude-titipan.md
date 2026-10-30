# FIX v1176 → v1177 (s456) — Dana Titipan Dikeluarkan dari Goal Cards

## Konteks
Lanjutan diskusi S455: dana titipan owner non-SELF (`_syncOwnerDebts()`,
disimpan sbg entri di `D.debts` biar Kekayaan Bersih benar) sudah
di-exclude dari `DebtStrategy.activeDebts()` (Strategi Pelunasan Utang),
tapi masih ikut kebaca `goalSourceDebt()` (`lifeos/adapters/goal-adapter.js`)
— nongol sbg kartu "Goal" di halaman Goals, padahal bukan kewajiban yang
perlu "dilunasi". Progress-nya juga janggal: titipan selalu `lunas:false`,
jadi permanen jadi goal card 0% yang gak pernah selesai.

## Fix
- `goalSourceDebt()` (`lifeos/adapters/goal-adapter.js`) — tambah
  `!d.linkedAssetId` ke filter (penanda titipan yang sudah ada, 0 field
  baru). Pola sama persis fix S455 di `DebtStrategy.activeDebts()`.
- Badge "🔒 Titipan — bukan kewajiban dibayar" di Buku Utang (S455) tidak
  disentuh — sudah benar.

## File yang berubah
- `lifeos/adapters/goal-adapter.js`
- `tests/s456-goal-adapter-exclude-titipan.test.js` — **baru**, 2 test:
  titipan exclude dari `goalSourceDebt()`, utang biasa tidak berubah.
- Bundle/versi otomatis (`node scripts/build.js`).

## Testing
- `npm test` → **2950/2950 pass** (naik dari 2948, +2 test baru)
- `node scripts/build.js s456-goal-adapter-exclude-titipan` → build sukses

## Versi
- Lama: v1176 (s455-owner-debt-exclude-strategy)
- Baru: **v1177 (s456-goal-adapter-exclude-titipan)**
