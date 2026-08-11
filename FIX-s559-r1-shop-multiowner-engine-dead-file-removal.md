# FIX s559 — R1: Hapus `modules/shop/multi-owner-engine.js` (dead duplicate)

**Sumber:** `AUDIT-DANA-TITIPAN-OWNERSHIP-SIMPLIFIKASI.md` (audit ownership/titipan),
Temuan 2 ("Dua Engine Kembar yang Sudah Divergen") — R1, prioritas 1.

**Scope sesi ini: HANYA file ini.** Tidak menyentuh `OwnerRegistry`, Dana Titipan,
`GAP3-AUD-001`, atau business logic lain, sesuai instruksi eksplisit.

## Temuan tambahan sebelum eksekusi

Audit awal mengira `modules/shop/multi-owner-engine.js` adalah engine kembar yang
dipakai di flow shop dan sudah divergen dari `modules/shared/multi-owner-engine.js`
(kurang cabang `_synthesizeFromTitipan()` dari Sesi 406b). Investigasi lebih lanjut
sebelum eksekusi menemukan file ini **sudah lama ditandai dead/stale**, jauh sebelum
audit ini:

- `PATCH-INFO.md`: "**DUPLIKAT**, isinya kebetulan identik dengan
  `modules/shared/multi-owner-engine.js`... tapi tetap file berlebih karena kode
  aplikasi seharusnya hanya mereferensikan folder `modules/shared/`."
- `REMOVED-STALE-FILES-MANUAL.txt` (era v1165/s446): sudah masuk daftar file yang
  ada di repo tapi tidak ada di release.
- `README-PATCH-UPDATE-s496-to-s509c.md` (era v1243/s509c): masih tercatat stale,
  belum pernah dihapus.

Verifikasi: `grep -rl "shop/multi-owner-engine"` di seluruh source/HTML/build script
→ **0 referensi**. `scripts/build.js` bundle list tidak menyertakan file ini sama
sekali. Satu-satunya file lain di `modules/shop/` yang menyebut `MultiOwnerEngine`
(`modules-calc.js`) sendiri juga sudah ditandai stale/tidak dimuat.

**Kesimpulan: file ini tidak pernah live di production sejak ~v1165.** Divergensinya
(kurang `_synthesizeFromTitipan()`) tidak pernah jadi bug nyata — murni risiko laten
kalau suatu saat ada yang salah reference. R1 jadi penghapusan dead file, bukan
"merge dua engine aktif".

## Perubahan

- **Dihapus:** `modules/shop/multi-owner-engine.js` (282 baris, 0 referensi di
  seluruh repo).
- **Tidak ada file lain diubah.**

## Verifikasi

- `npm test` sebelum hapus: 3947 test, **3941 pass / 6 fail**.
- `npm test` sesudah hapus: 3947 test, **3941 pass / 6 fail** — **persis sama**,
  6 kegagalan itu pre-existing & tidak terkait (`_ownerNominalText()` investment
  owner nominal UI, gagal juga di baseline sebelum sesi ini menyentuh apa pun).
- `node scripts/build.js`: berhenti di tahap `verifyVersionConstantsSynced()`
  (`modules/shared/modals.js` MODAL_VERSION desync) — **dikonfirmasi pre-existing**,
  gagal dengan pesan identik di baseline zip asli sebelum file ini dihapus. Di
  luar scope R1, tidak diperbaiki sesi ini.

## Di luar scope (belum dikerjakan)

Sisa file lain yang juga ditandai stale duplikat di dokumen yang sama
(`modules/shop/features-helpers-global-security.js`, `modules/shop/modals.js`,
`modules/shop/modules-calc.js`, `modules/shop/modules-render.js`) — **tidak
disentuh sesi ini**, sengaja dibiarkan untuk sesi terpisah kalau mau dibereskan
juga (pola sama: cek 0 referensi dulu, baru hapus).

Urutan simplifikasi selanjutnya sesuai kesepakatan: `GAP3-AUD-001` (fix identity
collision legacy titipan investasi) → R2 (migrasi OwnerRegistry) → R4 (rename/merge
API) → R5 (pecah presenter) → R6 (moratorium field baru, berlaku efektif sekarang).
