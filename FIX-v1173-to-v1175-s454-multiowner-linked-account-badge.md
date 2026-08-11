# FIX v1173 → v1175 (s454) — Badge Peringatan Akun Tertaut utk Aset Multi-Pemilik

## Latar belakang
Diskusi user: kenapa modal "Tautkan ke Akun" di form Aset tidak ada
pilihan porsi mana yang ditautkan kalau asetnya multi-pemilik? Audit
konfirmasi: `assetAccId` menautkan 1 akun ke 1 aset SECARA UTUH — baik
`Aset.save()` maupun `Aset.saveOwners()` selalu menulis
`linkedAcc.balance = a.nilai` (nilai PENUH instrumen), berapa pun jumlah
pemilik & porsinya. Ini SENGAJA (S449/BUG-OWN-002 — nyoba nulis porsi
SELF saja bikin kartu akun tampil Rp0 walau instrumennya ada isinya).
Porsi non-SELF sebenarnya SUDAH ditangani lewat `_syncOwnerDebts()`
(entri "Utang Dana Titipan" otomatis di Buku Utang) — independen dari
nominal akun tertaut, jadi Kekayaan Bersih tetap benar. Gap-nya murni UI:
user bisa salah kira akun tertaut = porsi mereka saja.

## Opsi yang dipertimbangkan (dari diskusi)
1. Badge/keterangan di UI saat aset multi-pemilik + ada akun tertaut.
2. Checkbox "tautkan hanya porsi SELF" — **DITOLAK**: menarik balik
   kondisi yang sudah diperbaiki di BUG-OWN-002/S449 (kartu akun bisa
   tampil Rp0), nambah 2 state yang harus dijaga konsisten selamanya.
3. `owners[].linkedAccountId` per pemilik (akun berbeda per porsi) —
   **DITOLAK/ditunda**: scope besar, nyentuh `totalSaldoAkun()`/
   `recalcAccBalance()`/dedup logic, bukan "1 task = 1 sesi". Belum ada
   kebutuhan nyata (baru gap desain, bukan bug data dilaporkan).

**Keputusan:** implementasi opsi 1 saja. 0 perubahan ke logic
saldo/utang — murni informational.

## Fix
`Aset.openActionsMenu()` (`modules/asset/aset.js`) — badge baru
`linkMultiOwnerWarn`, tampil di `#assetActionsMeta` SAAT DAN HANYA SAAT
aset punya akun tertaut (`linkedAcc`) DAN multi-pemilik
(`MultiOwnerEngine.getOwners(a).isMultiOwner`, reuse 100% — sama pola
`_renderTitipanSummary()`):

```js
const isMultiOwner=(typeof MultiOwnerEngine!=='undefined')&&(()=>{const res=MultiOwnerEngine.getOwners(a);return!!(res&&res.ok&&res.isMultiOwner);})();
const linkMultiOwnerWarn=(linkedAcc&&isMultiOwner)?'⚠️ Akun tertaut merepresentasikan 100% nilai aset (bukan cuma porsi Anda) — porsi pemilik lain tercatat sbg Utang Titipan':'';
```

Ditambahkan ke `metaRows` (setelah `linkMeta`), jadi tampil di baris
detail yang sama dengan info akun tertaut lainnya.

### Kenapa AMAN
- Guard `typeof MultiOwnerEngine!=='undefined'` — kalau engine belum
  dimuat, badge di-skip (tidak error, tidak crash), sama pola guard yang
  sudah dipakai di seluruh `aset.js`.
- Tidak menyentuh `linkedAccNilai`/`_syncOwnerDebts()`/saldo akun sama
  sekali — murni baris teks tambahan di menu detail (read-only).
- Badge hanya tampil kalau BENAR-BENAR ada akun tertaut DAN aset
  benar-benar multi-pemilik — single-owner (SELF 100%) atau aset tanpa
  akun tertaut tidak terpengaruh.

## File yang berubah
- `modules/asset/aset.js` — badge baru di `openActionsMenu()` (~6 baris)
- `tests/s454-linked-account-multiowner-badge.test.js` — **baru**, 4 test:
  1. multi-pemilik + akun tertaut → badge tampil
  2. single-owner (SELF 100%) + akun tertaut → badge TIDAK tampil
  3. multi-pemilik TANPA akun tertaut → badge TIDAK tampil (tidak relevan)
  4. `MultiOwnerEngine` tidak dimuat → tidak error, badge di-skip (fallback aman)
- Bundle/versi (otomatis lewat `node scripts/build.js`): `app-bundle-a.min.js`,
  `app-bundle-b.min.js`, `app_production.html`, `index.html`, `sw.js`,
  `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modules-render.js`, `modules/shared/modals.js`,
  `modules/shared/modules-calc.js`, `chat-action-handlers.js`,
  `docs/FILE-MAP.md`, `docs/COVERAGE-PER-MODULE.md`

## Testing
- `npm test` → **2945/2945 pass** (naik dari 2941, +4 test baru)
- `node scripts/build.js s454-multiowner-linked-account-badge` → build
  sukses, sintaks kedua bundle valid (`node --check`)

## Versi
- Lama: v1173 (s453-owners-nominal-dom-resync)
- Baru: **v1175 (s454-multiowner-linked-account-badge)**
- Catatan: `build.js` sempat terpanggil 2x sesi ini (run pertama tanpa
  argumen tag eksplisit, langsung dikoreksi dgn run kedua pakai tag
  deskriptif) — v1174 SEMPAT ada sesaat tapi tidak pernah dirilis/di-ZIP,
  v1175 adalah versi final yang dirilis.
