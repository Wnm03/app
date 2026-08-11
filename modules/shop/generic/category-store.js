// category-store.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// KONTEKS: lanjutan dari AUDIT-PRA-IMPLEMENTASI-GENERIC-SHOP-ENGINE.md +
// ARSITEKTUR-SHOP-ENGINE-GENERIC.md. Karena KW tidak punya database SQL
// (PWA client-side murni, data hidup di `D` & IndexedDB — lihat audit §1),
// 5 master generik (`master_category` dkk) DITERJEMAHKAN jadi lapisan JS
// pure/stateless yang MEMBUNGKUS struktur data existing (`D.cobekKategori`),
// SAMA PERSIS pola PurchaseEngine/InventoryEngine/ProfitEngine (S198,
// modules/shop/purchase-engine.js dkk, file-file di sebelah): tidak pernah
// menyentuh D kecuali baca read-only, tidak pernah panggil save(), tidak
// ada business logic baru — murni membungkus data existing supaya modul
// BARU (Tahap 3 dst.) punya satu pintu baca generik, bukan Compatibility
// LAYER untuk field lama TIDAK diubah sama sekali di sesi ini (lihat
// instruksi user: "jangan rewrite besar / ubah perilaku bisnis existing").
//
// CategoryStore = Master Category (setara `master_category` di skema SQL
// yang diusulkan) — kategori Shop (`D.cobekKategori`, dipakai utk tier
// ukuran umum Kecil/Sedang/Besar, BUKAN bentuk barang — lihat komentar
// Etalase.parseSizeName di cobek-etalase.js). TIDAK menyentuh
// parseSizeName/pairKey/NO_PAIR_SHAPES — itu tetap logic size-pairing
// berbasis NAMA produk, terpisah total dari kategori.
//
// Belum digunakan modul lain sesi ini (murni terdaftar biar ikut ter-bundle,
// pola sama ownership-engine.js S191).
const CategoryStore = {

  // list() — seluruh kategori Shop, PERSIS `D.cobekKategori` (array of
  // {id,name,...}). Array kosong kalau D/D.cobekKategori belum ada (guard
  // typeof D, sama pola guard fungsi lain di modul shop).
  list() {
    if (typeof D === 'undefined' || !D.cobekKategori) return [];
    return D.cobekKategori;
  },

  // find(id) — satu kategori by id, null kalau tidak ketemu/id kosong.
  find(id) {
    if (!id) return null;
    return this.list().find((k) => k.id === id) || null;
  },

  // label(id) — nama kategori utk ditampilkan, string kosong kalau id
  // kosong/tidak ketemu (PERSIS pola tampilan "-" / "" yang sudah dipakai
  // di renderList() cobek-etalase.js utk kategori yang sudah dihapus).
  label(id) {
    const k = this.find(id);
    return k ? (k.name || '') : '';
  },

  // === Modul 8 (sesi ini): Category Mutation Gate ===========================
  // Lanjutan langsung Modul 5-7 (ProductRepository/SupplierStore) — SSOT
  // yang sama sekarang dibuat utk sisi TULIS Category (`D.cobekKategori`),
  // yang sebelumnya ditulis mentah tanpa validasi di 3 titik:
  // `resolveShopKategori()` (cobek-tx-cart.js — find-or-create dipakai jalur
  // Transaksi & import shop-data-io-api.js/cobek-io.js), `Etalase.
  // addKategoriManual()` cabang edit (rename in-place), dan `Etalase.
  // delKategori()` (hapus + sisi-efek clear `kategoriId` produk). SAMA
  // PRINSIP ProductRepository/SupplierStore: field teks lewat
  // validateTextValue() — REUSE PERSIS (guard typeof, 0 duplikasi validasi
  // baru, sama semangat SupplierStore Modul 7).

  // _validateText(value) — delegasi ke ProductRepository.validateTextValue()
  // (SUDAH ADA) kalau tersedia, SAMA POLA SupplierStore._validateText().
  // Fallback lokal ATURAN IDENTIK supaya CategoryStore tetap bisa dipakai
  // berdiri sendiri (mis. di test) kalau ProductRepository belum di-load.
  _validateText(value) {
    if (typeof ProductRepository !== 'undefined') return ProductRepository.validateTextValue(value);
    if (typeof value !== 'string') return { ok: false, reason: `nilai tidak valid (bukan string): ${value}` };
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, reason: 'nilai tidak valid (string kosong)' };
    return { ok: true, value: trimmed };
  },

  // mutateResolve(categories, name) — GATE utk find-or-create by name,
  // MENGGANTIKAN `resolveShopKategori()` mentah (cobek-tx-cart.js). PURE
  // (TIDAK memutasi `categories` input — caller yang push & assign balik,
  // SAMA POLA mutateCreate() SupplierStore). id pakai generator PERSIS
  // literal lama (`'ck_'+Date.now()+'_'+uid()`, guard `typeof uid` kalau
  // helper global itu belum dimuat — fallback Math.random() suffix supaya
  // id tetap unik, TIDAK pernah dipakai di kode lama tapi jaga-jaga test
  // berdiri sendiri). Match nama SAMA case-insensitive PERSIS perilaku
  // lama (`.toLowerCase()`). Return {ok:true, categories, id, created}
  // (`created` true kalau kategori baru dibuat) atau {ok:false, reason}
  // (nama tidak valid — TIDAK pernah membuat kategori kosong/sampah).
  mutateResolve(categories, name) {
    if (!Array.isArray(categories)) {
      return { ok: false, reason: 'categories tidak valid — harus berupa array' };
    }
    const n = this._validateText(name);
    if (!n.ok) return n;
    const existing = categories.find((c) => (c.name || '').toLowerCase() === n.value.toLowerCase());
    if (existing) return { ok: true, categories, id: existing.id, created: false };
    const suffix = (typeof uid === 'function') ? uid() : Math.random().toString(36).slice(2);
    const kat = { id: 'ck_' + Date.now() + '_' + suffix, name: n.value };
    const next = categories.concat([kat]);
    return { ok: true, categories: next, id: kat.id, created: true };
  },

  // mutateRename(category, name) — GATE utk edit nama kategori, IN-PLACE
  // (impure, SAMA ALASAN SupplierStore.mutateUpdate() — `Etalase.
  // addKategoriManual()` cabang edit pegang REFERENSI LANGSUNG ke elemen
  // `D.cobekKategori`, memaksa immutable di sini berarti refactor besar yang
  // TIDAK diminta sesi ini). Cek bentrok nama (nama dupikat) TETAP di
  // caller (business logic UX lama, "kategori X sudah ada" — BUKAN validasi
  // gate ini, sama semangat guard `km<=0` yang tetap di caller utk
  // SupplierStore.mutateSetRoute()). Fail-safe: nama tidak valid -> category
  // TIDAK disentuh sama sekali. Return {ok:true, category} atau
  // {ok:false, reason}.
  mutateRename(category, name) {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      return { ok: false, reason: 'Category tidak valid — harus berupa object' };
    }
    const n = this._validateText(name);
    if (!n.ok) return n;
    category.name = n.value;
    return { ok: true, category };
  },

  // mutateDelete(categories, id) — GATE hapus kategori, PURE (balikin ARRAY
  // BARU hasil filter, TIDAK memutasi `categories` input — SAMA POLA
  // SupplierStore.mutateDelete(); caller yang assign balik ke
  // `D.cobekKategori`, SAMA PERSIS pola
  // `D.cobekKategori=D.cobekKategori.filter(...)` lama di
  // `Etalase.delKategori()`). CATATAN SCOPE: sisi-efek `Etalase.
  // delKategori()` yang mengosongkan `p.kategoriId=''` di SEMUA produk
  // terkait TETAP TIDAK dilakukan DI SINI — itu MUTASI PRODUCT (bukan
  // Category), di luar tanggung jawab gate kategori ini. UPDATE Modul 15
  // (sesi lain): `p.kategoriId=''` itu SUDAH lewat
  // `ProductRepository.mutateSetField()` juga (gate itu diperluas menerima
  // string kosong khusus kategoriId/produsenId, lihat komentar
  // mutateSetField() di product-repository.js) — caller (`Etalase.
  // delKategori()`) yang wiring, bukan gate ini. Return
  // {ok:true, categories} (array baru, id sudah tidak ada) atau
  // {ok:false, reason} (id tidak valid).
  mutateDelete(categories, id) {
    if (!Array.isArray(categories)) {
      return { ok: false, reason: 'categories tidak valid — harus berupa array' };
    }
    const k = this._validateText(id);
    if (!k.ok) return { ok: false, reason: `id tidak valid: ${k.reason}` };
    return { ok: true, categories: categories.filter((c) => c.id !== k.value) };
  },
};
