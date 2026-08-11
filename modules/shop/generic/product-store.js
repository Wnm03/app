// product-store.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// ProductStore = Master Product bagian identitas (setara `master_product`
// di skema SQL yang diusulkan, TANPA sisi atribut dinamis — lihat
// attribute-store.js utk itu). Membungkus `D.products` apa adanya: nama
// field (`hargaBeli`, `hargaJual`, `kategoriId`, `produsenId`, dst.) TETAP
// sama persis, TIDAK dipindah ke sub-object `attributes:{}` — sesuai
// keputusan user §2 (compatibility layer = field lama tetap berfungsi
// tanpa perubahan besar) & §4 (jangan ubah parseSizeName/pairKey).
//
// SENGAJA CUMA BACA (list/find/filter). CRUD produk (tambah/edit/hapus,
// size-pairing, bundle) TETAP 100% di Etalase.* (cobek-etalase.js) —
// TIDAK diduplikasi/dipindah ke sini, supaya SSOT logic tetap satu tempat
// & risiko regresi ke fitur size-pairing yang berisiko (audit §2) = nol.
//
// SAMA POLA PurchaseEngine dkk: pure/stateless, TIDAK PERNAH menyentuh D
// kecuali baca read-only, TIDAK PERNAH panggil save(), TIDAK ADA rumus
// baru — murni satu pintu baca generik utk modul BARU (Dashboard/Report/
// Import-Export generik, Tahap berikutnya).
const ProductStore = {

  // list() — seluruh produk, PERSIS `D.products`. Array kosong kalau
  // D/D.products belum ada.
  list() {
    if (typeof D === 'undefined' || !D.products) return [];
    return D.products;
  },

  // listSelf() — produk dgn kepemilikan efektif SELF saja, PERSIS filter
  // yang sudah dipakai InventoryEngine.totalModalStok()/totalNilaiJualStok()
  // (isProductOwnershipSelf, cobek-etalase.js) — supaya modul generik baru
  // yang butuh angka "punya sendiri" tidak perlu duplikat guard ini.
  listSelf() {
    const selfFilter = (typeof isProductOwnershipSelf === 'function') ? isProductOwnershipSelf : (() => true);
    return this.list().filter(selfFilter);
  },

  // find(id) — satu produk by id, null kalau tidak ketemu/id kosong.
  find(id) {
    if (!id) return null;
    return this.list().find((p) => p.id === id) || null;
  },

  // byCategory(categoryId) — produk dgn kategoriId tsb (field ASLI, TIDAK
  // diubah — lihat komentar header).
  byCategory(categoryId) {
    if (!categoryId) return [];
    return this.list().filter((p) => p.kategoriId === categoryId);
  },

  // bySupplier(supplierId) — produk dgn produsenId tsb (field ASLI).
  bySupplier(supplierId) {
    if (!supplierId) return [];
    return this.list().filter((p) => p.produsenId === supplierId);
  },

  // === Tahap 3 (Generic Shop Engine — Product/Dashboard/Report wiring) ===
  // Helper baca ATTRIBUT/RELASI produk lewat compatibility layer yang SUDAH
  // ADA (CategoryStore/SupplierStore Tahap 1 + AttributeStore/OwnershipEngine
  // — SSOT, bukan duplikasi D.cobekKategori/D.produsen.find() di sini).
  // Semua PURE (tidak menyentuh D selain baca, tidak panggil save()).

  // getCategory(product) — objek kategori via kategoriId (field ASLI),
  // delegasi PERSIS CategoryStore.find() (Tahap 1) kalau dimuat, fallback
  // baca D.cobekKategori langsung (compat layer). null kalau produk
  // kosong/kategoriId kosong/tidak ketemu.
  getCategory(product) {
    if (!product || !product.kategoriId) return null;
    if (typeof CategoryStore !== 'undefined') return CategoryStore.find(product.kategoriId);
    if (typeof D === 'undefined' || !D.cobekKategori) return null;
    return D.cobekKategori.find((k) => k.id === product.kategoriId) || null;
  },

  // getSupplier(product) — objek supplier via produsenId (field ASLI),
  // delegasi PERSIS SupplierStore.find() (Tahap 1) kalau dimuat, fallback
  // baca D.produsen langsung (compat layer). null kalau produk
  // kosong/produsenId kosong/tidak ketemu.
  getSupplier(product) {
    if (!product || !product.produsenId) return null;
    if (typeof SupplierStore !== 'undefined') return SupplierStore.find(product.produsenId);
    if (typeof D === 'undefined' || !D.produsen) return null;
    return D.produsen.find((pr) => pr.id === product.produsenId) || null;
  },

  // getWeight(product) — delegasi AttributeStore.shippingWeight() (kode
  // atribut 'berat_per_unit' -> field beratPerUnit) kalau AttributeStore
  // dimuat, fallback baca beratPerUnit langsung (compat layer, guard
  // typeof pola sama seluruh codebase) — HASIL SAMA baik lewat
  // AttributeStore maupun fallback, keduanya baca field fisik yang sama.
  getWeight(product) {
    if (!product) return undefined;
    if (typeof AttributeStore !== 'undefined') return AttributeStore.shippingWeight(product);
    return product.beratPerUnit;
  },

  // getDimensions(product) — {panjang, lebar, tinggi} via AttributeStore.get()
  // (kode 'panjang'/'lebar'/'tinggi') kalau dimuat, fallback baca field
  // asli langsung. undefined per-field kalau produk kosong (kaidah "kosong
  // != 0" tetap dijaga, sama seperti AttributeStore.get()).
  getDimensions(product) {
    if (!product) return { panjang: undefined, lebar: undefined, tinggi: undefined };
    if (typeof AttributeStore !== 'undefined') {
      return {
        panjang: AttributeStore.get(product, 'panjang'),
        lebar: AttributeStore.get(product, 'lebar'),
        tinggi: AttributeStore.get(product, 'tinggi'),
      };
    }
    return { panjang: product.panjang, lebar: product.lebar, tinggi: product.tinggi };
  },

  // getOwnership(product) — delegasi PERSIS OwnershipEngine.resolve() (SSOT
  // ownership seluruh app) -> {ok, type, isDefault}. Guard typeof: kalau
  // OwnershipEngine belum dimuat, balikin bentuk yang SAMA dgn resolve()
  // versi fallback-nya sendiri (DEFAULT/SELF, isDefault:true) supaya
  // pemanggil tidak perlu tahu bedanya.
  getOwnership(product) {
    if (typeof OwnershipEngine === 'undefined') return { ok: true, type: 'SELF', isDefault: true };
    return OwnershipEngine.resolve(product);
  },

  // === Tahap 8 (Generic Shop Engine — by-name lookup wiring) ===
  // findByName(name) — satu produk by `name` (field ASLI), case-insensitive,
  // null kalau tidak ketemu/name kosong. PURE = list().find(), SAMA PERSIS
  // pola pencocokan yang sudah dipakai di 6 titik call-site yang di-wire
  // sesi ini (`p.name.toLowerCase() === X.toLowerCase()`) — 0 rumus baru,
  // hanya satu pintu baca generik menggantikan `D.products.find(...)`
  // inline di tiap titik.
  findByName(name) {
    if (!name) return null;
    const target = String(name).toLowerCase();
    return this.list().find((p) => p.name.toLowerCase() === target) || null;
  },
};
