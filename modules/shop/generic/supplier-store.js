// supplier-store.js — Generic Shop Engine, Tahap 1 (Generic Domain Layer).
//
// SupplierStore = Master Supplier (setara `master_supplier` +
// `product_supplier` di skema SQL yang diusulkan) — AREA MIGRASI PERTAMA
// sesuai rekomendasi audit §6 (paling kecil & terisolasi dari
// parseSizeName/pairKey yang berisiko). Membungkus `D.produsen`
// (`{id,name,contact,note,jarakKm,biayaPerKm}`, CRUD asli tetap di
// Produsen.* — cobek-order.js, TIDAK diubah sesi ini) + harga per supplier
// (`product.hargaByProdusen[supplierId]`, delegasi PERSIS ke
// PurchaseEngine.produsenPrice()/produsenProducts() yang sudah ada — S198,
// purchase-engine.js — supaya tidak duplikat logic).
//
// SAMA POLA PurchaseEngine/InventoryEngine: pure/stateless, TIDAK PERNAH
// menyentuh D kecuali baca read-only, TIDAK PERNAH panggil save(), TIDAK
// ADA business logic baru. Field lama (`D.produsen`, `produsenId`,
// `hargaByProdusen`) tetap dipakai apa adanya oleh 12 file existing yang
// sudah pegang mereka (compatibility layer = "tidak diubah", bukan
// "di-proxy") — sesuai instruksi user §2.
//
// Belum digunakan modul lain sesi ini (murni terdaftar biar ikut ter-bundle,
// pola sama ownership-engine.js S191 / PurchaseEngine S198).
const SupplierStore = {

  // list() — seluruh supplier, PERSIS `D.produsen`. Array kosong kalau
  // D/D.produsen belum ada (guard typeof, sama pola file lain di sini).
  list() {
    if (typeof D === 'undefined' || !D.produsen) return [];
    return D.produsen;
  },

  // find(id) — satu supplier by id, null kalau tidak ketemu/id kosong.
  find(id) {
    if (!id) return null;
    return this.list().find((s) => s.id === id) || null;
  },

  // label(id) — nama supplier utk ditampilkan, string kosong kalau id
  // kosong/tidak ketemu (mis. supplier sudah dihapus — PERSIS pola
  // Produsen.delete() di cobek-order.js yang cuma mengosongkan
  // p.produsenId, bukan menghapus histori harga produk).
  label(id) {
    const s = this.find(id);
    return s ? (s.name || '') : '';
  },

  // costFor(product, supplierId) — harga beli produk dari supplier
  // tertentu. Delegasi PERSIS ke PurchaseEngine.produsenPrice() (S198) —
  // guard typeof PurchaseEngine, fallback null kalau engine belum dimuat
  // (tidak boleh hitung ulang logic yang sama di 2 tempat).
  costFor(product, supplierId) {
    if (typeof PurchaseEngine === 'undefined') return null;
    return PurchaseEngine.produsenPrice(product, supplierId);
  },

  // productsFor(supplierId) — daftar produk yang punya histori harga beli
  // dari supplier tsb. Delegasi PERSIS ke PurchaseEngine.produsenProducts(),
  // dikasih D.products penuh (bukan hasil filter ownership — pemanggil yang
  // menentukan filter tambahan, sama pola InventoryEngine.totalModalStok()).
  productsFor(supplierId) {
    const supplier = this.find(supplierId);
    if (!supplier || typeof PurchaseEngine === 'undefined') return [];
    const products = (typeof D !== 'undefined' && D.products) ? D.products : [];
    return PurchaseEngine.produsenProducts(supplier, products);
  },

  // === Modul 7 (sesi ini): Supplier Mutation Gate ===========================
  // Lanjutan langsung Modul 3-6 (ProductRepository) — SSOT yang sama sekarang
  // dibuat utk sisi TULIS Supplier (`D.produsen`), yang sebelumnya ditulis
  // mentah tanpa validasi di 4 titik: `Produsen.save()` (create & update),
  // `Produsen.delete()`, dan `OngkirCalc.saveProdusenPref()` (cobek-order.js/
  // cobek-pricing.js). SAMA PRINSIP ProductRepository: field id/teks lewat
  // validateTextValue(), field numerik lewat validatePriceValue() — REUSE
  // PERSIS dari ProductRepository (guard typeof, 0 duplikasi validasi baru,
  // sama semangat mutateSetHargaProdusen() yang reuse validator ProductRepository
  // sendiri Modul 6). Kalau ProductRepository belum dimuat, fallback lokal
  // dgn ATURAN IDENTIK (bukan gate baru — cuma jaga-jaga urutan load script).

  // _validateText(value) — validasi teks wajib-isi bersama (dipakai utk
  // `name` di mutateCreate()/mutateUpdate() MAUPUN `id` di mutateDelete() —
  // 1 validator, bukan 2 — SAMA SEMANGAT mutateSetField() ProductRepository
  // yang 1 gate dipakai ke-3 field teksnya), delegasi ke
  // ProductRepository.validateTextValue() (SUDAH ADA, Modul 5) kalau
  // tersedia. Fallback lokal ATURAN IDENTIK (string, trim, tolak kosong)
  // supaya SupplierStore tetap bisa dipakai berdiri sendiri (mis. di test)
  // kalau ProductRepository belum di-load.
  _validateText(value) {
    if (typeof ProductRepository !== 'undefined') return ProductRepository.validateTextValue(value);
    if (typeof value !== 'string') return { ok: false, reason: `nilai tidak valid (bukan string): ${value}` };
    const trimmed = value.trim();
    if (!trimmed) return { ok: false, reason: 'nilai tidak valid (string kosong)' };
    return { ok: true, value: trimmed };
  },

  // _optionalText(value) — utk field teks OPSIONAL (contact/note) yang di
  // kode lama memang boleh kosong (`.trim()` doang, TIDAK ada pengecekan
  // wajib-isi — lihat `Produsen.save()` sebelum sesi ini). SENGAJA TIDAK
  // pakai validateTextValue() (yang menolak string kosong) supaya perilaku
  // "kontak/catatan boleh dikosongkan" TIDAK berubah. Bukan angka/objek ->
  // dianggap kosong (''), sama seperti `String(undefined).trim()` yang lama
  // akan meledak — versi ini fail-safe balik '' saja.
  _optionalText(value) {
    return (typeof value === 'string') ? value.trim() : '';
  },

  // _validateRouteNumber(value) — utk jarakKm/biayaPerKm (OngkirCalc rute
  // tetap per-produsen), delegasi ke ProductRepository.validatePriceValue()
  // (SUDAH ADA) — aturan SAMA: angka finite, diklem >=0. Fallback lokal
  // ATURAN IDENTIK kalau ProductRepository belum dimuat.
  _validateRouteNumber(value) {
    if (typeof ProductRepository !== 'undefined') return ProductRepository.validatePriceValue(value);
    if (typeof value !== 'number' || !isFinite(value)) {
      return { ok: false, reason: `nilai tidak valid (bukan angka/NaN/Infinity): ${value}` };
    }
    return { ok: true, value: Math.max(0, value) };
  },

  // mutateCreate(fields) — bangun objek supplier BARU (PURE, TIDAK push ke
  // D.produsen, TIDAK panggil save() — caller yang menaruh & simpan sendiri,
  // SAMA POLA ProductRepository.createProduct()). `fields` HARUS punya
  // `name` valid (wajib) — `contact`/`note` opsional (boleh kosong, SAMA
  // perilaku lama). id pakai generator PERSIS literal lama
  // (`'prd_'+Date.now()`, sama yang dipakai `Produsen.save()` utk supplier
  // baru — TIDAK diubah).
  // Return {ok:true, supplier} atau {ok:false, reason} (nama tidak valid).
  mutateCreate(fields) {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return { ok: false, reason: 'fields tidak valid — harus berupa object' };
    }
    const n = this._validateText(fields.name);
    if (!n.ok) return n;
    const supplier = {
      id: 'prd_' + Date.now(),
      name: n.value,
      contact: this._optionalText(fields.contact),
      note: this._optionalText(fields.note),
    };
    return { ok: true, supplier };
  },

  // mutateUpdate(supplier, changes) — GATE utk edit supplier existing, IN-
  // PLACE (impure, SAMA POLA ProductRepository.mutateSetField()/
  // mutateSetPrice() — caller (`Produsen.save()` cabang edit) pegang
  // REFERENSI LANGSUNG ke elemen `D.produsen`, memaksa immutable di sini
  // berarti refactor besar yang TIDAK diminta sesi ini). `changes.name`
  // divalidasi wajib-isi; `changes.contact`/`changes.note` opsional (boleh
  // kosong, ditulis apa adanya kalau field-nya ADA di `changes` — key yang
  // tidak dikirim TIDAK menimpa nilai lama, SAMA perilaku Object.assign()
  // parsial). Fail-safe: nama tidak valid -> supplier TIDAK disentuh sama
  // sekali (bukan partial write).
  mutateUpdate(supplier, changes) {
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
      return { ok: false, reason: 'Supplier tidak valid — harus berupa object' };
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return { ok: false, reason: 'changes tidak valid — harus berupa object' };
    }
    const n = this._validateText(changes.name);
    if (!n.ok) return n;
    supplier.name = n.value;
    if ('contact' in changes) supplier.contact = this._optionalText(changes.contact);
    if ('note' in changes) supplier.note = this._optionalText(changes.note);
    return { ok: true, supplier };
  },

  // mutateDelete(suppliers, id) — GATE hapus supplier, PURE (balikin ARRAY
  // BARU hasil filter, TIDAK memutasi `suppliers` input — SAMA POLA
  // ProductRepository.saveProduct(); caller yang assign balik ke
  // `D.produsen`, SAMA PERSIS pola `D.produsen=D.produsen.filter(...)` lama
  // di `Produsen.delete()`). CATATAN SCOPE: sisi-efek `Produsen.delete()`
  // yang mengosongkan `p.produsenId=''` di SEMUA produk terkait TETAP TIDAK
  // dilakukan DI SINI — itu MUTASI PRODUCT (bukan Supplier), di luar
  // tanggung jawab gate supplier ini. UPDATE Modul 15 (sesi lain):
  // `p.produsenId=''` itu SUDAH lewat `ProductRepository.mutateSetField()`
  // juga (gate itu diperluas menerima string kosong khusus kategoriId/
  // produsenId, lihat komentar mutateSetField() di product-repository.js)
  // — caller (`Produsen.delete()`) yang wiring, bukan gate ini.
  // Return {ok:true, suppliers} (array baru, id sudah tidak ada) atau
  // {ok:false, reason} (id tidak valid).
  mutateDelete(suppliers, id) {
    if (!Array.isArray(suppliers)) {
      return { ok: false, reason: 'suppliers tidak valid — harus berupa array' };
    }
    const k = this._validateText(id);
    if (!k.ok) return { ok: false, reason: `id tidak valid: ${k.reason}` };
    return { ok: true, suppliers: suppliers.filter((s) => s.id !== k.value) };
  },

  // mutateSetRoute(supplier, jarakKm, biayaPerKm) — GATE utk rute tetap
  // Etape 1 (Ambil ke Produsen) yang disimpan per-supplier (kw192-ongkir-
  // produsen-pref), IN-PLACE (impure, SAMA ALASAN mutateUpdate() —
  // `OngkirCalc.saveProdusenPref()` pegang referensi langsung `pr` dari
  // `D.produsen.find()`). Menggantikan `pr.jarakKm=km;pr.biayaPerKm=biaya;`
  // mentah. Guard `km<=0` (wajib isi jarak dulu) TETAP di caller (UX guard
  // lama, BUKAN business logic gate ini — sama semangat guard `val>0` yang
  // tetap di caller utk mutateSetHargaProdusen()/mutateDeleteHargaProdusen()
  // Modul 6). Fail-safe: salah satu angka tidak valid -> supplier TIDAK
  // disentuh sama sekali (bukan partial write, rute lama tetap utuh).
  // Return {ok:true, jarakKm, biayaPerKm} atau {ok:false, reason}.
  mutateSetRoute(supplier, jarakKm, biayaPerKm) {
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) {
      return { ok: false, reason: 'Supplier tidak valid — harus berupa object' };
    }
    const km = this._validateRouteNumber(jarakKm);
    if (!km.ok) return { ok: false, reason: `jarakKm tidak valid: ${km.reason}` };
    const biaya = this._validateRouteNumber(biayaPerKm);
    if (!biaya.ok) return { ok: false, reason: `biayaPerKm tidak valid: ${biaya.reason}` };
    supplier.jarakKm = km.value;
    supplier.biayaPerKm = biaya.value;
    return { ok: true, jarakKm: km.value, biayaPerKm: biaya.value };
  },
};
