# AUDIT-8-11-OWNER-RESOLVER-POST-DL-NEXT-1.md

Status: **AUDIT, 0 kode diubah.** Dilakukan terhadap snapshot v1308
(S578, sesudah DL-Next-1 diimplementasi). Referensi:
`DESIGN-LOCK-OWNER-RESOLVER-AUDIT-3-6-FOLLOWUP.md`,
`AUDIT-1-7-OWNER-RESOLVER-LANJUTAN.md`,
`FIX-v1307-to-v1308-s578-owner-resolver-validation-source-fix.md`.

---

## Audit-8 — Regresi Dana Titipan

**Bukti:** Grep `deductionOwnerId`/`resolveOwnerDefaultForAccount` di
`dana-titipan-aggregation-api.js` & `dana-titipan-portfolio-presenter.js`
→ **0 hasil**. Domain Dana Titipan 100% tidak menyentuh field
`deductionOwnerId` maupun fungsi resolver yang diubah S578.

**Verifikasi jalan:** seluruh 34 file test Dana Titipan (`*titipan*.test.js`
+ `asset-titipan.test.js` + `dana-kelolaan-titipan-detail-s459.test.js`) →
**335/335 lolos**.

**Temuan:** **PASS.** Perubahan S578 struktural tidak mungkin meregresi
Dana Titipan — 0 coupling.

---

## Audit-9 — Consumer owner (downstream `deductionOwnerId`)

**Bukti:** Grep seluruh `modules/` untuk `deductionOwnerId` → hanya 3 file:
`transaksi.js` (produsen, sudah diaudit 3A), `akun.js` (2 baris komentar,
0 logic), dan `tx-list-cashflow.js:84-98` — **satu-satunya consumer nyata**:
badge "👤 Ditanggung: <nama>" di riwayat transaksi (S574-E, murni
presentasi, 0 hitung ulang saldo).

**TEMUAN (gap turunan, sama pola dgn 3A):** Consumer ini resolve nama
owner lewat `getAccOwners(t.accountId)` dulu, fallback ke `acc.owners`
langsung — **keduanya sama sekali tidak mengecek aset tertaut**, persis
fungsi lama yang diganti di guard `_saveTxInner()` (S578). Efeknya:
untuk transaksi yang `deductionOwnerId`-nya berhasil tersimpan lewat
sumber `source:'asset'` (skenario akun tanpa `acc.owners[]` sendiri +
tertaut aset multi-owner — kasus yang justru BARU BISA valid tervalidasi
sejak fix S578), badge riwayat **tidak akan menemukan nama ownernya**
(`ownerMatch` selalu `undefined` di kedua cabang lookup) → baris badge
kosong, walau `deductionOwnerId` tersimpan benar.

**Sifat temuan:** ini **bukan regresi S578** — gap ini sudah ada sejak
S574-E dibuat (consumer ini tidak pernah tahu soal aset tertaut). Tapi
S578 (dgn benar) membuat lebih banyak transaksi valid tersimpan lewat
jalur `source:'asset'`, sehingga gap tampilan ini jadi **lebih sering
terlihat** dibanding sebelumnya (`deductionOwnerId` lebih jarang gagal
tersimpan, tapi begitu tersimpan lewat sumber aset, nama tidak muncul).

**Risiko:** Rendah — murni tampilan (nama kosong, bukan data salah/hilang).
`deductionOwnerId` yang tersimpan tetap benar & bisa dibaca ulang penuh
saat transaksi dibuka utk edit (baris 888, `editTx()` baca `t.
deductionOwnerId` langsung, tidak lewat `getAccOwners()`).

**Rekomendasi:** Untuk sesi lanjutan (bukan sekarang) — ganti basis lookup
nama owner di `tx-list-cashflow.js:86-96` dari `getAccOwners()` ke
`resolveOwnerDefaultForAccount()` (sumber sama, pola sama persis DL-Next-1).
**Ini kandidat DL-Next-6 baru**, belum di-lock — perlu keputusan eksplisit
terpisah sebelum dikerjakan, sesuai disiplin "1 sesi 1 fokus".

---

## Audit-10 — Recalculation CREATE/EDIT/DELETE

**Bukti:** Guard S578 (`transaksi.js:1126-1127`) adalah **satu
choke-point tunggal** di awal `_saveTxInner()`, dieksekusi **sebelum**
percabangan ke 10 titik `Object.assign`/push (EDIT utang, EDIT tagihan,
EDIT cicilan x2, EDIT tagihan-lama x2, EDIT generik, CREATE cicilan,
CREATE langganan, CREATE generik — tabel lengkap di Audit-3A). Karena
guard ini letaknya SEBELUM percabangan (bukan diduplikasi di tiap
cabang), fix S578 otomatis berlaku identik ke **seluruh 10 cabang**
tanpa kode tambahan per cabang.

**DELETE (`delTx()`, `tx-list-cashflow.js:108`):** `deductionOwnerId`
adalah field metadata biner (siapa menanggung PENUH), **tidak pernah
ikut kalkulasi saldo/split** (dikonfirmasi Audit-4 lama & test S574-D2
[7/8]). Hapus transaksi murni menghapus baris `D.transactions` apa
adanya — **tidak butuh recalculation khusus** untuk field ini, beda dgn
`transferPairId` (yang punya logic hapus-berpasangan) atau `partStockId`/
`stockItems` (yang punya revert stok). 0 gap ditemukan.

**Temuan:** **PASS.** Fix S578 konsisten di seluruh jalur CREATE/EDIT
(1 choke-point, 0 duplikasi/drift antar cabang); DELETE tidak relevan
utk recalculation field ini.

---

## Audit-11 — Backward compatibility

**Bukti:**
- Test S574-D2 [6/8] (existing, tetap lolos post-S578): transaksi lama
  tanpa `deductionOwnerId` di akun single-owner tetap bisa
  dibuka/edit/save, 0 field dipaksa muncul.
- Test S578 [3/3] (baru): akun single-owner murni (0 `acc.owners[]`, 0
  aset tertaut) — guard TIDAK terpicu, save tetap lolos tanpa friksi baru.
- `editTx()` (baris 888) baca `t.deductionOwnerId` langsung dari data
  tersimpan, tidak lewat resolver apa pun — transaksi lama (dibuat
  sebelum S574 sekalipun) tetap ter-render identik.

**Temuan:** **PASS.** Fix S578 hanya memperketat validasi untuk kasus
yang SEBELUMNYA seharusnya wajib pilih tapi lolos diam-diam (bug) — akun
yang genuinely single-owner (baik lama maupun baru) 0 terdampak.

---

## Ringkasan

| # | Audit | Status |
|---|---|---|
| 8 | Regresi Dana Titipan | **PASS** — 0 coupling, 335/335 test |
| 9 | Consumer owner (`tx-list-cashflow.js` badge) | **GAP DITEMUKAN** — risiko rendah, murni tampilan, kandidat DL-Next-6 (belum di-lock) |
| 10 | Recalculation CREATE/EDIT/DELETE | **PASS** — 1 choke-point, 10 cabang konsisten, DELETE tidak relevan |
| 11 | Backward compatibility | **PASS** — transaksi lama & akun single-owner 0 terdampak |

**Kesimpulan:** S578 (DL-Next-1) **aman untuk rilis**, tidak ada regresi.
Satu temuan baru (Audit-9) bersifat opsional/kosmetik, direkomendasikan
jadi item Design Lock terpisah (DL-Next-6) kalau mau dikerjakan — **tidak
memblokir apa pun**, tidak wajib dikerjakan sekarang.
