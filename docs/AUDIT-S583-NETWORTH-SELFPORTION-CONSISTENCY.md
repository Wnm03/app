# AUDIT-S583-NETWORTH-SELFPORTION-CONSISTENCY.md

Status: **AUDIT, 0 kode diubah.** Sesi audit mandiri (S583) — memverifikasi
konsistensi prinsip "cuma porsi `self` yang masuk Kekayaan Bersih" di
SEMUA fungsi agregat yang menyusun Net Worth/`FI.assetFund()`, lintas ke-5
domain yang punya konsep multi-owner. Pola format sama persis AUDIT-12/13/14
(rantai Owner Resolver), tapi topik ini BEDA/independen — bukan lanjutan
rantai Owner Resolver, melainkan audit horizontal baru atas prinsip
double-filter (binary include/exclude + skala porsi) di seluruh domain
agregat. Snapshot v1313 (S582, 4071 test, 0 fail).

## Cakupan

1. Baca ulang langsung dari source (bukan asumsi/memori) fungsi `totalValue()`-
   family di seluruh domain yang punya konsep ownership: `Aset`, `Akun`,
   `Investment`, `Piutang`, `Debt`.
2. Untuk tiap fungsi: verifikasi 2 lapis filter — (a) binary include/exclude
   via `isXOwnershipSelf`/`OwnershipEngine.resolve(x).type==='SELF'`, dan
   (b) skala nilai via `MultiOwnerEngine.selfOwnedValue()`/
   `resolveEntryAssetSelfPorsi()`.
3. Cek anti-dobel-hitung silang: aset yang ditautkan ke akun (`accountId`),
   aset yang bermigrasi ke Holding Investasi (`investmentId`/
   `_migratedToInvestmentId`), dan utang yang auto-sync dari
   aset/investasi (`linkedAssetId`/`linkedInvestmentId`).
4. Domain tanpa konsep owner (cicilan, stok bisnis) — konfirmasi memang
   tidak butuh filter (N/A by design, bukan gap).
5. Full regression `node --test tests/*.test.js` sebagai baseline — 0
   perubahan kode, jadi hasil harus identik snapshot S582.

## Hasil per fungsi (dibaca langsung dari source, sesi ini)

### 1. `Aset.totalValue()` — `modules/asset/aset.js:1896`
```
totalValue(){return(D.assets||[]).filter(isAssetOwnershipSelf)
  .filter(a=>!a._migratedToInvestmentId).filter(a=>!a.investmentId)
  .reduce((s,a)=>s+(typeof MultiOwnerEngine!=='undefined'
    ?MultiOwnerEngine.selfOwnedValue(a,a.nilai||0):(a.nilai||0)),0);}
```
Filter binary `isAssetOwnershipSelf` ✓, skala `selfOwnedValue()` ✓, exclude
`investmentId`/`_migratedToInvestmentId` (anti dobel-hitung dgn Holding,
sejak S422d) ✓. **PASS.**

### 2. `totalSaldoAkun()` — `modules/finance/akun.js:217`
```
function totalSaldoAkun(){
  const linked=linkedAssetAccountIds();
  const total=D.accounts.filter(a=>a.includeInBalance!==false
    &&!linked.has(String(a.id))&&isAccOwnershipSelf(a))
    .reduce((s,a)=>s+recalcAccBalance(a.id),0);
  ...
}
```
Filter binary `isAccOwnershipSelf` ✓. Anti dobel-hitung akun-tertaut-aset:
**dikonfirmasi tanggung jawabnya SEPENUHNYA di sisi Akun** — `linked=
linkedAssetAccountIds()` (dibaca dari `(D.assets||[]).filter(a=>a.accountId)`,
`akun.js:195-196`) mengecualikan akun tertaut PENUH dari `totalSaldoAkun()`,
apa pun status single/multi-owner-nya. Ini keputusan sadar Sesi 422c
(revert Sesi 396) — sebelumnya S396 sempat menghitung porsi SELF akun
tertaut di sini juga, menyebabkan double-count karena porsi SELF yang sama
sudah dihitung `Aset.totalValue()`. **PASS**, dan menjawab pertanyaan edge
case yang diajukan: aset-tertaut-akun **TIDAK** dikecualikan di sisi
`Aset.totalValue()` (memang seharusnya tidak, karena bukan itu tempat
pengecualiannya) — pengecualiannya murni di `totalSaldoAkun()` lewat
`linkedAssetAccountIds()`, sumber kebenaran tunggal untuk kasus ini.

### 3. `Investment.zakatableValue()` / `Investment.selfOwnedTotalValue()` — `modules/asset/investasi.js:655,671`
Keduanya filter `isHoldingOwnershipSelf` ✓, skala `MultiOwnerEngine.
selfOwnedValue()` ✓ (fallback `Investment.holdingValue(h)` kalau engine
tidak ada). `selfOwnedTotalValue()` (s476a, dipakai `Aset.totalValue()`
secara tidak langsung lewat `AssetPortfolioAPI`/`FI.assetFund()`) menjumlah
SEMUA holding ownership SELF; `zakatableValue()` menambah 1 filter lagi
`h.zakatable`. **PASS**, pola identik `Aset.totalValue()`.

### 4. `Piutang.totalValue()` — `modules/finance/piutang-utang.js:351`
```
totalValue(){return(D.piutang||[]).filter(isPiutangOwnershipSelf)
  .filter(p=>!p.lunas).reduce((s,p)=>s+(p.nilai||0)
    *(resolveEntryAssetSelfPorsi(p)/100),0);}
```
Filter binary ✓, skala via `resolveEntryAssetSelfPorsi()` ✓ (piutang tanpa
`assetId` — mayoritas kasus — selalu porsi 100%, jadi rumus efektif sama
dengan `nilai` mentah, 0 regresi kasus umum sejak S394). **PASS.**

### 5. `Debt.totalValue()` — `modules/finance/piutang-utang.js:572`
```
totalValue(){return(D.debts||[]).filter(isDebtOwnershipSelf)
  .filter(d=>!d.lunas).filter(d=>!d.linkedAssetId&&!d.linkedInvestmentId)
  .reduce((s,d)=>s+(d.nilai||0)*(resolveEntryAssetSelfPorsi(d)/100),0);}
```
Filter binary ✓, skala ✓, PLUS 1 filter tambahan exclude
`linkedAssetId`/`linkedInvestmentId` (BUG-016 fix, S463) — utang yang
auto-sync dari aset/investasi tertaut SUDAH dikecualikan di sisi
aset/investasi lewat `selfOwnedValue()`/`isHoldingOwnershipSelf()`; kalau
entrinya ikut dihitung di sini juga, porsi yang sama kepotong 2x dari Net
Worth (double-subtraction). **PASS**, pola anti-dobel-hitung paling
eksplisit di antara ke-5 domain.

### 6. Domain tanpa konsep owner
`totalCicilanOutstanding()`, `totalInventoriBisnisValue()`, `utangJT`
(cicilan barang & stok bisnis, `modules/finance/*`/`modules/business/*`) —
dikonfirmasi ulang tidak punya field `owners`/ownership apa pun di skema
datanya, jadi tidak ada konsep "porsi self" yang berlaku. **N/A by
design**, bukan gap.

### Catatan sampingan — di luar cakupan Net Worth (dikonfirmasi TIDAK relevan)
`AssetInsight.compute()`/`AssetInsight.render()` (`aset.js:235,291`) juga
punya `list.reduce((s,a)=>s+(a.nilai||0),0)` mentah (filter
`isAssetOwnershipSelf` doang, TANPA skala `selfOwnedValue()`/exclude
`investmentId`). **Dicek dan dikonfirmasi bukan gap** — ini widget UI
"🩺 Insight Cepat" murni tampilan (total nilai + insight konsentrasi
kategori/performa), TIDAK dipanggil `renderKekayaanBersih()`/`FI.
assetFund()`/agregat Net Worth manapun. Beda tujuan dari `Aset.totalValue()`
secara sengaja, bukan kelalaian.

## Hasil build & test
- Full `node --test tests/*.test.js`: **4071 test, 4071 pass, 0 fail** —
  identik snapshot S582 (`FIX-v1312-s582-9-preexisting-test-failures-
  closeout.md`), sesuai ekspektasi karena 0 kode disentuh sesi ini.

## Ringkasan

| # | Fungsi | Domain | Filter binary | Skala porsi | Anti dobel-hitung tambahan | Status |
|---|---|---|---|---|---|---|
| 1 | `Aset.totalValue()` | Aset | ✓ `isAssetOwnershipSelf` | ✓ `selfOwnedValue` | exclude `investmentId`/`_migratedToInvestmentId` | **PASS** |
| 2 | `totalSaldoAkun()` | Akun | ✓ `isAccOwnershipSelf` | (recalcAccBalance, tanpa skala parsial) | exclude penuh akun tertaut via `linkedAssetAccountIds()` | **PASS** |
| 3 | `Investment.zakatableValue()`/`selfOwnedTotalValue()` | Holding Investasi | ✓ `isHoldingOwnershipSelf` | ✓ `selfOwnedValue` | — | **PASS** |
| 4 | `Piutang.totalValue()` | Piutang | ✓ `isPiutangOwnershipSelf` | ✓ `resolveEntryAssetSelfPorsi` | — | **PASS** |
| 5 | `Debt.totalValue()` | Utang | ✓ `isDebtOwnershipSelf` | ✓ `resolveEntryAssetSelfPorsi` | exclude `linkedAssetId`/`linkedInvestmentId` | **PASS** |
| 6 | Cicilan/Stok bisnis/Utang manual | Non-owner domain | — | — | — | **N/A** (by design) |
| — | `AssetInsight.compute()`/`render()` | UI widget, bukan Net Worth | ✓ (binary saja) | ✗ (sengaja, bukan agregat NW) | — | **OUT OF SCOPE**, dikonfirmasi bukan gap |

**Kesimpulan:** 0 gap ditemukan. Prinsip "bukan self → tidak masuk
Kekayaan Bersih" diterapkan konsisten di seluruh 5 domain multi-owner via
2 lapis filter (binary + skala), dan setiap potensi dobel-hitung silang
(aset↔akun, aset↔investasi, utang↔aset/investasi) punya SATU titik
tanggung jawab eksplisit yang terdokumentasi di komentar source, tidak
ada yang tumpang tindih atau terlewat. Tidak ada perubahan kode yang
diperlukan dari audit ini.

## Cakupan yang SENGAJA tidak dikerjakan
- Tidak menambah test baru — audit ini murni verifikasi source vs prinsip
  yang sudah dikunci sejak S192/S193/S255/S394/S422c/S422d/S463/s476a;
  0 penyimpangan ditemukan yang butuh test regresi baru.
- Tidak menyentuh `AssetInsight.compute()`/`render()` — di luar cakupan
  Net Worth secara desain, mengubahnya untuk "konsisten" dengan
  `Aset.totalValue()` justru berisiko mengubah tampilan Total Nilai Aset
  di widget insight (yang memang dimaksudkan menampilkan total mentah
  porsi self, bukan porsi self-scaled) — di luar permintaan sesi ini.
