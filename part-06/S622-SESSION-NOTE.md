# S622 — Fix: panel "⚖️ Porsi melebihi 100%" tidak muncul saat edit lewat kolom Nominal (Rp)

## Gejala (laporan user, screenshot modal "⚖️ Atur Porsi Kepemilikan" aset "renov")
2 pemilik sudah pas 100% (84,8901% + 15,1099%). User tambah pemilik ke-3 ("Aku")
dan mengetik langsung ke kolom **Nominal (Rp)** (57.331) — bukan ke kolom Porsi (%).
Hasilnya:
- Porsi baris itu terhitung 0,5096%, total jadi **100,5096% (lebih 0,51%)**.
- Tombol "✅ Simpan Porsi" otomatis nonaktif (`updateOwnersTotal()`, syarat total pas 100%).
- Panel penyesuaian otomatis "⚖️ Porsi melebihi 100% — pilih cara menyesuaikan"
  (fitur Auto-Rebalance, dibuat justru untuk skenario persis ini) **tidak muncul
  sama sekali** — user terjebak tanpa cara mudah membetulkan selain menghitung manual.

User sempat menduga ini soal "auto-fill" tidak berfungsi.

## Audit
Fitur "Auto-fill Sisa Porsi" (AF1, `_applyRemainingShare()`) dan fitur terpisah
"Auto-Rebalance Porsi Pemilik" (Agustus 2026, `_checkRebalanceTrigger()` +
`_renderRebalancePanel()`) memang dua mekanisme berbeda:
- AF1 cuma mengisi 1 baris **kosong** yang belum disentuh user — tidak relevan
  di sini karena ketiga baris sudah terisi/disentuh.
- Auto-Rebalance yang seharusnya jalan di sini (total >100% setelah nambah
  pemilik baru) — **dan memang sudah dites & dibuat khusus dari skenario aset
  "renov" ini** (lihat `tests/rebalance-porsi-pemilik.test.js`, komentar header).

Ditemukan lewat baca `modules/asset/aset.js`: ada 2 handler input yang sama-sama
menulis `draft[i].porsi` dan sama-sama BISA mendorong total >100%:
- `onOwnerPorsiInput()` (ketik di kolom Porsi %) → memanggil
  `Aset._checkRebalanceTrigger(i)` di baris terakhirnya. ✅
- `onOwnerNominalInput()` (ketik di kolom Nominal Rp, arah kebalikannya) →
  **TIDAK PERNAH memanggil `_checkRebalanceTrigger()`**. ❌

Bug yang SAMA PERSIS ada di `modules/asset/investasi-view.js`
(`InvestmentUI.onOwnerNominalInput()`) untuk modal Investasi. Modal Akun
(`AccOwners`, `finance/akun.js`) tidak kena — modal itu tidak punya kolom
Nominal sama sekali, cuma Porsi (%).

## Perbaikan
- `modules/asset/aset.js`: tambah 1 baris `Aset._checkRebalanceTrigger(i);`
  di akhir `onOwnerNominalInput()`, pola sama persis `onOwnerPorsiInput()`.
- `modules/asset/investasi-view.js`: tambah 1 baris
  `InvestmentUI._checkRebalanceTrigger(i);` di akhir `onOwnerNominalInput()`.
- 0 rumus baru — `_checkRebalanceTrigger()` sendiri PURE & sudah aman dipanggil
  kapan saja (no-op kalau total ≤100%).
- `tests/rebalance-porsi-pemilik.test.js`: 2 test baru —
  1. `Aset.onOwnerNominalInput` memicu `_checkRebalanceTrigger(i)` (spy, sesuai
     pola `makeAsetCtx()` yang sudah ada — konteks itu tidak memuat
     `multi-owner-engine.js`).
  2. `InvestmentUI.onOwnerNominalInput` memicu panel rebalance sungguhan
     (`_rebalancePending` muncul) saat overflow — konteksnya sudah memuat
     engine penuh jadi bisa dites end-to-end.

## Regresi
`node --test tests/*.test.js` — **4346/4346 pass**, 0 gagal (termasuk 34/34
`tests/rebalance-porsi-pemilik.test.js`).
`node scripts/build.js` — build sukses, versi `s621-...` → `s622-owner-registry-mandatory-lookup`
(`?v=1349` → `?v=1350`).

## Cara pakai setelah upload
Buka lagi modal "⚖️ Atur Porsi Kepemilikan" aset "renov", ketik ulang Nominal
(Rp) baris "Aku" — kali ini panel "⚖️ Porsi melebihi 100%" akan langsung
muncul (pilihan Proporsional / Kurangi dari pemilik terbesar / Pilih manual),
tinggal pilih & tekan "✅ Terapkan Penyesuaian" untuk membetulkan total balik
ke 100% tanpa hitung manual.

## File yang diubah
- `modules/asset/aset.js` (logic: `onOwnerNominalInput()` +1 baris)
- `modules/asset/investasi-view.js` (logic: `onOwnerNominalInput()` +1 baris)
- `tests/rebalance-porsi-pemilik.test.js` (2 test baru)
- Juga menyertakan perbaikan sesi sebelumnya (S621, `repairMissing()` Dana
  Titipan) — lihat `S621-SESSION-NOTE.md` — supaya patch ini kumulatif &
  tidak perlu upload 2 kali terpisah.
- `app-bundle-a.min.js`, `app-bundle-b.min.js` (hasil `node scripts/build.js`)
- `app_production.html`, `index.html`, `sw.js` (bump versi otomatis)
- `chat-action-handlers.js`, `modules/shared/features-helpers-global-security.js`,
  `modules/shared/modals.js`, `modules/shared/modules-calc.js`,
  `modules/shared/modules-render.js` (HANYA konstanta versi disamakan build.js)
- `docs/COVERAGE-PER-MODULE.md`, `docs/FILE-MAP.md` (regenerasi otomatis)
- `self-test.js`, `modules/finance/titipan-reconcile.js`,
  `tests/titipan-reconcile.test.js` (carry-over dari S621)
