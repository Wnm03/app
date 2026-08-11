// attribute-store.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// AttributeStore = Master Product bagian sifat dinamis (setara
// `attribute_definition` + `product_attribute_value`/EAV di skema SQL yang
// diusulkan) — TAPI diterjemahkan jadi lapisan baca generik di atas field
// FISIK yang SUDAH ADA di `D.products` (`beratPerUnit`, `panjang`, `lebar`,
// `tinggi`, `diskonPersen`), BUKAN restrukturisasi data jadi EAV sungguhan.
// Field-field itu TETAP top-level di D.products persis seperti sekarang
// (45 file existing tidak boleh berubah — instruksi user §2), sesi ini
// cuma menambah SATU PINTU BACA generik di atasnya (kode atribut -> nilai),
// supaya modul BARU bisa baca "atribut produk" tanpa hardcode nama field
// fisik satu-satu — sama semangat ARSITEKTUR-SHOP-ENGINE-GENERIC.md §
// "sifat produk = metadata", versi ringan yang cocok utk penyimpanan
// in-memory + IndexedDB (bukan SQL).
//
// SENGAJA TIDAK menyentuh Etalase.parseSizeName()/pairKey()/
// NO_PAIR_SHAPES (cobek-etalase.js) — itu logic PARSING NAMA PRODUK utk
// size-pairing (shape/ukuran dari string "Cobek 19-20cm"), beda total dari
// atribut fisik tersimpan di sini. TIDAK diubah/digenerikkan fase ini
// sesuai instruksi user §4.
//
// SAMA POLA PurchaseEngine dkk: pure/stateless, TIDAK PERNAH menyentuh D
// kecuali baca read-only, TIDAK PERNAH panggil save(), TIDAK ADA rumus baru.
const AttributeStore = {

  // DEFINITIONS — daftar atribut fisik yang sudah ada di D.products,
  // dipetakan ke NAMA FIELD ASLI-nya (bukan atribut baru, bukan pengganti).
  // is_shipping_weight/is_packing_weight meniru flag di
  // ARSITEKTUR-SHOP-ENGINE-GENERIC.md §"Ongkir & Packing" — beratPerUnit
  // memang satu-satunya field berat yang dipakai OngkirCalc (cobek-pricing.js)
  // sesi-sesi sebelumnya, ditandai di sini SUPAYA kalkulasi ongkir generik
  // di masa depan bisa mencari lewat flag (bukan nama field "beratPerUnit"
  // literal) — TAPI belum ada kalkulasi baru yang memakainya sesi ini.
  DEFINITIONS: [
    { code: 'berat_per_unit', field: 'beratPerUnit', label: 'Berat per unit', is_shipping_weight: true },
    { code: 'panjang', field: 'panjang', label: 'Panjang' },
    { code: 'lebar', field: 'lebar', label: 'Lebar' },
    { code: 'tinggi', field: 'tinggi', label: 'Tinggi' },
    { code: 'diskon_persen', field: 'diskonPersen', label: 'Diskon (%)' },
  ],

  // definitions() — salinan DEFINITIONS (bukan referensi langsung, supaya
  // pemanggil luar tidak bisa mengubah tabel definisi ini secara tidak
  // sengaja lewat referensi).
  definitions() {
    return this.DEFINITIONS.map((d) => Object.assign({}, d));
  },

  // get(product, code) — nilai atribut produk berdasarkan kode generik,
  // dibaca dari field aslinya. undefined kalau product kosong/kode tidak
  // dikenal (BUKAN 0 — kaidah "kosong != 0" dari
  // ARSITEKTUR-SHOP-ENGINE-GENERIC.md §5 tetap dijaga di lapisan baca ini).
  get(product, code) {
    if (!product) return undefined;
    const def = this.DEFINITIONS.find((d) => d.code === code);
    if (!def) return undefined;
    return product[def.field];
  },

  // shippingWeight(product) — atribut yang ditandai is_shipping_weight=true
  // (sesi ini cuma beratPerUnit). Dibuat generik (bukan langsung
  // `product.beratPerUnit`) supaya kalau nanti ada >1 jenis produk dengan
  // field berat berbeda, pemanggil tidak perlu tahu nama field-nya.
  shippingWeight(product) {
    const def = this.DEFINITIONS.find((d) => d.is_shipping_weight);
    return def ? this.get(product, def.code) : undefined;
  },

  // === Tahap 3 (Generic Shop Engine — Product/Dashboard/Report wiring) ===

  // getAttribute(product, code) — alias eksplisit dari get() (nama sesuai
  // permintaan sesi Tahap 3). 0 logic baru, murni delegasi.
  getAttribute(product, code) {
    return this.get(product, code);
  },

  // hasAttribute(product, code) — true kalau kode dikenal DAN produk PUNYA
  // nilai utk atribut itu. Kaidah "kosong != 0" (ARSITEKTUR-SHOP-ENGINE-
  // GENERIC.md §5) tetap dijaga: cek `!== undefined`, BUKAN truthy — nilai
  // 0 (mis. diskon 0%) tetap dianggap "punya atribut", beda dari field yang
  // memang tidak pernah diisi.
  hasAttribute(product, code) {
    return this.getAttribute(product, code) !== undefined;
  },

  // setAttribute(product, code, value) — PURE, pola SAMA PERSIS
  // OwnershipEngine.assign() (modules/shared/ownership-engine.js): balikin
  // {ok:true, product} SALINAN BARU dgn field diisi, product ASLI TIDAK
  // DIMUTASI, TIDAK memanggil save() — caller yang bertanggung jawab
  // menyimpan lewat pola save() masing-masing domain (Etalase.*, sama
  // batasan yg didokumentasikan di OwnershipEngine.assign()). "Compatibility
  // only" (instruksi Tahap 3 §2): TIDAK ada format penyimpanan baru, field
  // yang diisi tetap field FISIK asli (via def.field), BUKAN sub-object
  // attributes:{} baru.
  // Return: {ok:false, reason} kalau product bukan object valid atau code
  // tidak dikenal (SAMA pola {ok,reason} dgn OwnershipEngine.validate()/
  // assign()).
  setAttribute(product, code, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const def = this.DEFINITIONS.find((d) => d.code === code);
    if (!def) return { ok: false, reason: `Kode atribut tidak dikenal: ${code}` };
    return { ok: true, product: { ...product, [def.field]: value } };
  },
};
