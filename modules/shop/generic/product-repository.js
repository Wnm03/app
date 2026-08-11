// product-repository.js — Generic Shop Engine, Tahap 4 (Product CRUD Layer,
// PURE).
//
// Lanjutan Tahap 1-3 (category-store.js/supplier-store.js/attribute-store.js/
// product-store.js/pricing-service.js/inventory-service.js) yang SEMUA cuma
// baca (list/find/filter) — TIDAK ADA satu pun yang menulis. ProductRepository
// menutup sisi TULIS-nya, tapi PURE 100% (SAMA POLA OwnershipEngine.assign()/
// AttributeStore.setAttribute()): tidak pernah memutasi objek input, tidak
// pernah menyentuh `D` kecuali baca, TIDAK PERNAH memanggil `save()`. Caller
// (modul Tahap 5+ nanti) yang bertanggung jawab menaruh hasilnya ke `D.products`
// & memanggil `save()` — SAMA batasan yang didokumentasikan di
// OwnershipEngine.assign()/AttributeStore.setAttribute().
//
// SCOPE Tahap 4 (instruksi eksplisit sesi ini): HANYA layer baru ini.
// BELUM di-wire ke Etalase.save(), form tambah/edit produk, Import/Export,
// atau kasir — itu tetap 100% jalan lewat kode existing yang TIDAK disentuh
// sama sekali sesi ini (0 baris `cobek-etalase.js`/`cobek-io.js`/
// `cobek-tx-cart.js` diubah).
//
// Keputusan arsitektur (dikonfirmasi user sebelum coding, lihat
// LAPORAN-TAHAP4-GENERIC-SHOP-ENGINE.md §0):
//   1. AttributeStore.setAttribute() PURE (immutable, tidak save()) — SUDAH
//      demikian sejak Tahap 3, dipakai apa adanya di sini.
//   2. ProductStore.getOwnership() delegasi ke OwnershipEngine.resolve() —
//      SUDAH demikian sejak Tahap 3, dipakai utk default ownership produk
//      baru (createProduct()) via OwnershipEngine.resolve({}) langsung.
//   3. updateProduct(product, changes) pakai AUTO-ROUTE: key di `changes`
//      yang match salah satu `AttributeStore.DEFINITIONS[].field` (berat/
//      panjang/lebar/tinggi/diskon) lewat AttributeStore.setAttribute();
//      key lainnya (name/harga*/stock/kategoriId/produsenId/ownership/dst.)
//      lewat immutable merge biasa. Peta field->code dibaca LANGSUNG dari
//      AttributeStore.DEFINITIONS (bukan hardcode daftar terpisah) supaya
//      tetap satu SSOT — kalau Tahap depan menambah definisi atribut baru,
//      auto-route ini otomatis ikut tanpa edit file ini.
//   4. cloneProduct(): deep clone (JSON-safe, sama asumsi data `D.products`
//      yang memang JSON-serializable utk IndexedDB), id baru pakai
//      MEKANISME EXISTING PERSIS (`'prod_'+Date.now()`, sama literal yang
//      dipakai `Etalase.save()` utk produk baru di cobek-etalase.js), stock
//      dipaksa 0, field lain tetap sama.
//   5. saveProduct() PURE — TIDAK memanggil save(), TIDAK menyentuh `D`.
//      Menerima array `products` (biasanya `D.products`, caller yang kirim)
//      + satu `product`, balikin ARRAY BARU hasil upsert (replace by id kalau
//      sudah ada, append kalau belum) — array input TIDAK dimutasi (bukan
//      push/splice in-place).
//
// SENGAJA TIDAK menyentuh: D.products (kecuali baca lewat parameter yang
// caller kirim), IndexedDB, save(), parseSizeName()/pairKey()/NO_PAIR_SHAPES,
// ProfitEngine, kasir, atau perilaku bisnis mana pun.
const ProductRepository = {

  // === helper internal (tidak dipanggil dari luar, tidak diekspos) ===

  // _genId() — mekanisme id EXISTING PERSIS yang dipakai Etalase.save() utk
  // produk baru (`cobek-etalase.js`, baris pembuatan produk baru). Ditaruh
  // di satu tempat di sini supaya createProduct()/cloneProduct() konsisten
  // tanpa duplikasi literal 'prod_'+Date.now() dua kali.
  _genId() {
    return 'prod_' + Date.now();
  },

  // _attributeFieldMap() — peta field fisik -> kode atribut, dibaca LANGSUNG
  // dari AttributeStore.DEFINITIONS (SSOT Tahap 1/3) tiap dipanggil — bukan
  // cache statis — supaya kalau AttributeStore.DEFINITIONS berubah di
  // runtime (mis. test yang inject D berbeda), auto-route selalu ikut versi
  // terbaru. Balikin {} (bukan throw) kalau AttributeStore belum dimuat —
  // updateProduct() akan otomatis fallback ke merge biasa utk SEMUA field
  // kalau demikian (guard typeof konsisten pola seluruh codebase).
  _attributeFieldMap() {
    if (typeof AttributeStore === 'undefined') return {};
    const map = {};
    AttributeStore.DEFINITIONS.forEach((def) => { map[def.field] = def.code; });
    return map;
  },

  // === API publik Tahap 4 ===

  // createProduct(fields) — bangun objek produk BARU (PURE, TIDAK push ke
  // D.products, TIDAK panggil save() — caller yang menaruh via saveProduct()
  // + save() sendiri). `fields` (object, opsional per-key) di-merge di ATAS
  // default yang meniru bentuk produk baru `Etalase.save()` (field yang sama
  // persis: name/stock/hargaBeli/hargaJual/hargaReseller/diskonPersen/
  // kategoriId/beratPerUnit/panjang/lebar/tinggi/ownership/produsenId/
  // hargaByProdusen) supaya kompatibel 100% dgn produk yang dibuat lewat
  // form modal biasa.
  // Return: {ok:true, product} — product baru (id di-generate, TIDAK sama
  // dgn produk lain manapun di `D.products` selama tidak dipanggil >1x pada
  // milidetik yang sama, batasan SAMA PERSIS dgn Etalase.save()).
  // {ok:false, reason} kalau `fields` bukan object valid (null/array/
  // primitif) — SAMA pola {ok,reason} dgn OwnershipEngine.assign()/
  // AttributeStore.setAttribute().
  createProduct(fields) {
    if (fields !== undefined && (fields === null || typeof fields !== 'object' || Array.isArray(fields))) {
      return { ok: false, reason: 'fields tidak valid — harus berupa object' };
    }
    const src = fields || {};
    const defaultOwnership = (typeof OwnershipEngine !== 'undefined') ? OwnershipEngine.resolve({}).type : 'SELF';
    const newId = this._genId();
    const product = {
      name: '',
      stock: 0,
      hargaBeli: 0,
      hargaJual: 0,
      hargaReseller: null,
      diskonPersen: 0,
      kategoriId: '',
      beratPerUnit: 0,
      panjang: 0,
      lebar: 0,
      tinggi: 0,
      ownership: defaultOwnership,
      produsenId: '',
      hargaByProdusen: {},
      catatan: '', // Sesi 386: field teks bebas baru, diisi dari kolom CSV/Excel "Catatan"
      ...src,
      id: newId, // id SELALU dari generator, tidak boleh dioverride via fields (jaga keunikan)
    };
    return { ok: true, product };
  },

  // updateProduct(product, changes) — immutable merge dgn AUTO-ROUTE (lihat
  // keputusan §3 di header): tiap key di `changes` dicek dulu ke peta
  // field->code AttributeStore (_attributeFieldMap()) — kalau match, lewat
  // AttributeStore.setAttribute() (PURE, satu key per panggilan, di-chain
  // berurutan kalau `changes` punya >1 field atribut); kalau tidak match
  // (name/harga*/stock/kategoriId/produsenId/ownership/dll.), langsung
  // immutable merge (`{...result, [key]: value}`).
  // `product` ASLI TIDAK PERNAH dimutasi (setiap langkah balikin objek baru,
  // sama pola AttributeStore.setAttribute()/OwnershipEngine.assign()).
  // Return: {ok:true, product} — product hasil merge (objek baru).
  // {ok:false, reason} kalau `product` bukan object valid, `changes` bukan
  // object valid, atau salah satu key atribut gagal di-route lewat
  // AttributeStore.setAttribute() (diteruskan reason-nya apa adanya).
  updateProduct(product, changes) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return { ok: false, reason: 'changes tidak valid — harus berupa object' };
    }
    const attrMap = this._attributeFieldMap();
    let result = product;
    for (const key of Object.keys(changes)) {
      const value = changes[key];
      const attrCode = attrMap[key];
      if (attrCode) {
        const r = AttributeStore.setAttribute(result, attrCode, value);
        if (!r.ok) return r;
        result = r.product;
      } else {
        result = { ...result, [key]: value };
      }
    }
    return { ok: true, product: result };
  },

  // cloneProduct(product) — salinan produk (deep clone, JSON-safe — SAMA
  // asumsi data `D.products` yang memang harus JSON-serializable utk
  // IndexedDB, jadi tidak ada field function/Date/dll. yang hilang saat
  // clone), id BARU (mekanisme existing PERSIS via _genId(), lihat §4),
  // `stock` dipaksa 0 (produk hasil clone belum punya stok fisik sendiri),
  // field lain (harga/kategori/produsen/ownership/atribut fisik/dst.) TETAP
  // SAMA dgn produk asal. Produk asal TIDAK dimutasi (deep clone, bukan
  // referensi).
  // Return: {ok:true, product} — clone baru. {ok:false, reason} kalau
  // `product` bukan object valid.
  cloneProduct(product) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const cloned = JSON.parse(JSON.stringify(product));
    cloned.id = this._genId();
    cloned.stock = 0;
    return { ok: true, product: cloned };
  },

  // saveProduct(products, product) — PURE upsert: balikin ARRAY BARU (bukan
  // memutasi `products` in-place — tidak ada push()/splice() ke array input)
  // dgn `product` disisipkan. Kalau `products` sudah punya item ber-id sama
  // (`product.id`), item itu DIGANTI (immutable replace di posisi yang sama,
  // urutan array lain tidak berubah); kalau belum ada, `product` DITAMBAHKAN
  // di akhir. TIDAK PERNAH memanggil save(), TIDAK PERNAH menyentuh `D`
  // langsung (murni operasi array di parameter yang caller kirim) — caller
  // (mis. `D.products = hasil.products; save();`) yang bertanggung jawab
  // penuh menyimpan.
  // Return: {ok:true, products} — array baru. {ok:false, reason} kalau
  // `products` bukan array, atau `product` bukan object ber-`id` valid.
  saveProduct(products, product) {
    if (!Array.isArray(products)) {
      return { ok: false, reason: 'products tidak valid — harus berupa array' };
    }
    if (!product || typeof product !== 'object' || Array.isArray(product) || !product.id) {
      return { ok: false, reason: 'product tidak valid — harus berupa object ber-id' };
    }
    const idx = products.findIndex((p) => p && p.id === product.id);
    const result = idx === -1
      ? [...products, product]
      : products.map((p, i) => (i === idx ? product : p));
    const dupIds = new Set();
    const seen = new Set();
    result.forEach((p) => {
      if (p && p.id) {
        if (seen.has(p.id)) dupIds.add(p.id);
        seen.add(p.id);
      }
    });
    if (dupIds.size) {
      return { ok: false, reason: `id produk ganda terdeteksi: ${[...dupIds].join(', ')}` };
    }
    return { ok: true, products: result };
  },

  // === Modul 3 (sesi ini): Stock Mutation Gate =============================
  // Latar: sebelum sesi ini, tulis `.stock` produk tersebar LANGSUNG di 6
  // file (cobek-tx-cart.js/cobek-pricing.js/cobek-io.js/tx-list-cashflow.js/
  // transaksi.js/shop-data-io-api.js) — masing2 copy-paste rumus sendiri
  // (`p.stock=Math.max(0,(p.stock||0)+delta)` / `p.stock=r.stock` mentah
  // tanpa validasi). 0 tempat menolak NaN/Infinity/delta bukan-angka —
  // silently menghasilkan stok NaN/Infinity di data. Bagian ini menutup
  // celah itu: SATU gate (validasi + tulis) yang SEMUA 6 file di atas
  // sekarang panggil, MENGGANTIKAN rumus inline masing2 (behavior klem
  // >=0 & arah tambah/kurang TETAP SAMA PERSIS — cuma dipindah+divalidasi,
  // bukan business logic baru).
  // SENGAJA impure (beda dari createProduct/updateProduct/saveProduct di
  // atas yang PURE) karena SEMUA call site existing pegang REFERENSI
  // LANGSUNG ke elemen `D.products` (bukan array terpisah yang perlu
  // di-assign balik) — memaksa pola immutable di titik itu berarti ubah
  // struktur tiap call site (assign balik ke D.products[idx]), itu masuk
  // kategori refactor besar yang TIDAK diminta sesi ini. `applyStockDelta()`
  // (PURE, di atas) tetap tersedia utk caller yang MEMANG pegang array
  // terpisah/butuh immutability.

  _isFiniteNumber(n) {
    return typeof n === 'number' && Number.isFinite(n);
  },

  // findById(products, id) — cari 1 produk by id DENGAN deteksi id ganda
  // (data korup): kalau ketemu >1 match, TOLAK (ok:false) supaya caller
  // tidak pernah salah tulis ke produk yang salah pas ada duplicate id.
  findById(products, id) {
    if (!Array.isArray(products)) {
      return { ok: false, reason: 'products tidak valid — harus berupa array' };
    }
    if (!id) return { ok: false, reason: 'id tidak valid' };
    const matches = products.filter((p) => p && p.id === id);
    if (matches.length === 0) return { ok: false, reason: 'produk tidak ditemukan', product: null };
    if (matches.length > 1) {
      return { ok: false, reason: `id produk ganda terdeteksi (${matches.length}x): ${id}` };
    }
    return { ok: true, product: matches[0] };
  },

  // hasDuplicateId(products, id) — true kalau `id` muncul >1x di `products`.
  hasDuplicateId(products, id) {
    if (!Array.isArray(products) || !id) return false;
    return products.filter((p) => p && p.id === id).length > 1;
  },

  // validateStockDelta(currentStock, delta) — validasi bersama dipakai
  // SEMUA jalur tambah/kurang stok relatif (qty transaksi, retur, restock
  // massal, rollback). Tolak (ok:false) kalau `delta` bukan angka valid
  // (NaN/Infinity/-Infinity/string/undefined) — SEBELUM sesi ini kasus ini
  // silently menghasilkan NaN di `.stock`. `currentStock` yang korup (NaN/
  // bukan angka) DIANGGAP 0 (SAMA PERSIS pola `(p.stock||0)` existing di
  // semua call site — bukan perilaku baru). Hasil DIKLEM ke >=0
  // (`Math.max(0,...)`) — SAMA PERSIS semua call site yang sudah pakai pola
  // itu.
  validateStockDelta(currentStock, delta) {
    if (!this._isFiniteNumber(delta)) {
      return { ok: false, reason: `delta stok tidak valid (bukan angka/NaN/Infinity): ${delta}` };
    }
    const cur = this._isFiniteNumber(currentStock) ? currentStock : 0;
    return { ok: true, value: Math.max(0, cur + delta) };
  },

  // validateStockValue(value) — validasi bersama utk SET stok absolut
  // (import CSV/JSON/PDF/scan yang mengirim angka stok baru langsung,
  // bukan delta). Aturan sama: harus angka finite, diklem ke >=0.
  validateStockValue(value) {
    if (!this._isFiniteNumber(value)) {
      return { ok: false, reason: `nilai stok tidak valid (bukan angka/NaN/Infinity): ${value}` };
    }
    return { ok: true, value: Math.max(0, value) };
  },

  // applyStockDelta(product, delta) — versi PURE (balikin product BARU,
  // TIDAK memutasi `product` asli), utk caller yang pegang array terpisah
  // (pola sama dgn updateProduct()/createProduct() di atas).
  applyStockDelta(product, delta) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const v = this.validateStockDelta(product.stock, delta);
    if (!v.ok) return v;
    return { ok: true, product: { ...product, stock: v.value } };
  },

  // mutateStockDelta(product, delta) — GATE utama: satu-satunya jalur yang
  // boleh menulis `.stock` LANGSUNG (in-place) ke referensi objek produk
  // yang sudah ada di `D.products` utk mutasi relatif (+/-). Menggantikan
  // `p.stock=Math.max(0,(p.stock||0)+delta)` yang sebelumnya diulang di 4
  // file. Fail-safe: kalau delta tidak valid, `.stock` TIDAK disentuh sama
  // sekali (bukan partial write).
  // Return {ok:true, stock} (stock SUDAH ditulis) atau {ok:false, reason}
  // (stock TIDAK berubah).
  mutateStockDelta(product, delta) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const v = this.validateStockDelta(product.stock, delta);
    if (!v.ok) return v;
    product.stock = v.value;
    return { ok: true, stock: v.value };
  },

  // mutateSetStock(product, value) — GATE utk SET stok absolut in-place,
  // sama pola mutateStockDelta() tapi utk jalur import/restore
  // (shop-data-io-api.js/cobek-io.js) yang sebelumnya nulis
  // `product.stock = r.stock` mentah tanpa validasi apapun (bisa NaN kalau
  // file import korup/kolom kosong ke-parse jadi NaN).
  mutateSetStock(product, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const v = this.validateStockValue(value);
    if (!v.ok) return v;
    product.stock = v.value;
    return { ok: true, stock: v.value };
  },

  // === Modul 4 (sesi ini): Price Mutation Gate ==============================
  // Latar: sebelum sesi ini, tulis `.hargaBeli`/`.hargaJual` produk tersebar
  // LANGSUNG di 5 file (shop-data-io-api.js/cobek-io.js/cobek-tx-cart.js/
  // cobek-pricing.js/cobek-etalase.js) — masing2 assignment mentah
  // (`product.hargaBeli=r.hargaBeli` / `p.hargaJual=reko` dst.) TANPA
  // validasi apapun. 0 tempat menolak NaN/Infinity/undefined — silently
  // menghasilkan harga NaN/Infinity/undefined di data (mis. kolom kosong
  // pas import Excel/CSV/Scan/PDF ke-parse jadi NaN/undefined lalu ketimpa
  // begitu saja ke produk yang sudah ada). Bagian ini menutup celah itu:
  // SATU gate (validasi + tulis) yang SEMUA 5 file di atas sekarang
  // panggil, MENGGANTIKAN assignment mentah masing2 (nilai valid TETAP
  // ditulis SAMA PERSIS — cuma dipindah+divalidasi, bukan rumus/business
  // logic baru).
  // SENGAJA impure & TIDAK menyentuh createProduct()/updateProduct() (yang
  // PURE di atas, dipakai jalur form Etalase.save()) — alasan SAMA PERSIS
  // mutateStockDelta()/mutateSetStock(): semua call site existing pegang
  // REFERENSI LANGSUNG ke elemen `D.products` (bukan array terpisah yang
  // perlu di-assign balik) — memaksa pola immutable di titik itu berarti
  // refactor besar yang TIDAK diminta sesi ini.
  // Scope SENGAJA hanya `hargaBeli`/`hargaJual` (2 field yang diminta sesi
  // ini) — `hargaReseller` (field harga ke-3, ditulis mentah di titik yang
  // sama di shop-data-io-api.js/cobek-io.js) BELUM digate sesi ini, dicatat
  // sbg known issue di CHANGELOG/KNOWN-ISSUES supaya tidak lupa.

  // validatePriceValue(value) — validasi bersama dipakai SEMUA jalur tulis
  // harga absolut (hargaBeli/hargaJual). Tolak (ok:false) kalau `value`
  // bukan angka valid (NaN/Infinity/-Infinity/string/undefined/null) —
  // SEBELUM sesi ini kasus ini silently menghasilkan harga NaN/Infinity/
  // undefined di data. Hasil DIKLEM ke >=0 (`Math.max(0,...)`) — harga
  // tidak pernah negatif, prinsip sama dengan validateStockValue().
  validatePriceValue(value) {
    if (!this._isFiniteNumber(value)) {
      return { ok: false, reason: `nilai harga tidak valid (bukan angka/NaN/Infinity): ${value}` };
    }
    return { ok: true, value: Math.max(0, value) };
  },

  // mutateSetPrice(product, field, value) — GATE utama: satu-satunya jalur
  // yang boleh menulis `.hargaBeli`/`.hargaJual` LANGSUNG (in-place) ke
  // referensi objek produk yang sudah ada di `D.products`. Menggantikan
  // `product.hargaBeli=...`/`p.hargaJual=...` mentah yang sebelumnya
  // diulang di 5 file. `field` HARUS 'hargaBeli' atau 'hargaJual' (scope
  // sesi ini) — field lain ditolak supaya gate ini tidak disalahgunakan di
  // luar scope yang sudah divalidasi/diuji. Fail-safe: kalau value tidak
  // valid, field TIDAK disentuh sama sekali (bukan partial write) — produk
  // mempertahankan harga LAMA-nya, bukan berubah jadi NaN/undefined.
  // Return {ok:true, field, value} (field SUDAH ditulis) atau
  // {ok:false, reason} (field TIDAK berubah).
  // Modul 5 (sesi ini): field ketiga `hargaReseller` ditambahkan ke gate yang
  // sama (bukan gate terpisah — 1 field harga lagi, pola sama persis
  // hargaBeli/hargaJual) TAPI dengan SATU pengecualian eksplisit: `null`
  // valid utk `hargaReseller` (artinya "reseller belum diisi", state yang
  // sudah lama ada di data — lihat default `hargaReseller: null` di
  // createProduct() atas & titik pembuatan produk baru di cobek-io.js/
  // shop-data-io-api.js) — beda dari hargaBeli/hargaJual yang TIDAK PERNAH
  // null (0 dianggap "belum diisi" utk keduanya). Rekomendasi persis dari
  // known issue Modul 4 (lihat CHANGELOG-MODUL4.md §"Known issue baru").
  mutateSetPrice(product, field, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    if (field !== 'hargaBeli' && field !== 'hargaJual' && field !== 'hargaReseller') {
      return { ok: false, reason: `field harga tidak didukung gate ini: ${field}` };
    }
    if (field === 'hargaReseller' && value === null) {
      product.hargaReseller = null;
      return { ok: true, field, value: null };
    }
    const v = this.validatePriceValue(value);
    if (!v.ok) return v;
    product[field] = v.value;
    return { ok: true, field, value: v.value };
  },

  // === Modul 5 (sesi ini): Attribute Mutation Gate =========================
  // Lanjutan langsung Modul 4 — field lain yang masih ditulis mentah tanpa
  // validasi di titik yang SAMA PERSIS dgn hargaBeli/hargaJual/hargaReseller
  // (commitShopRows()/ImportShopExcel.commit()): diskonPersen (numerik,
  // persen) & kategoriId/produsenId/satuan (id/teks). barcode & "margin"
  // TIDAK ada sbg field tersimpan di skema produk saat ini (margin dihitung
  // on-the-fly dari hargaBeli/hargaJual di cobek-io.js, bukan field — 0
  // titik mutasi utk digate); tidak ada perubahan skema baru sesi ini.

  // validateDiscountValue(value) — validasi bersama utk diskonPersen. Sama
  // aturan validatePriceValue() (angka finite) DITAMBAH klem atas
  // (0..100, karena ini persen) selain klem bawah (>=0) yang sudah ada.
  validateDiscountValue(value) {
    if (!this._isFiniteNumber(value)) {
      return { ok: false, reason: `nilai diskon tidak valid (bukan angka/NaN/Infinity): ${value}` };
    }
    return { ok: true, value: Math.max(0, Math.min(100, value)) };
  },

  // mutateSetDiskon(product, value) — GATE utk diskonPersen, pola sama
  // persis mutateSetStock()/mutateSetPrice(). Menggantikan
  // `p.diskonPersen=r.diskonPersen` mentah (cobek-io.js) yang sebelumnya 0
  // validasi (bisa NaN/negatif/>100 kalau kolom import korup).
  mutateSetDiskon(product, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const v = this.validateDiscountValue(value);
    if (!v.ok) return v;
    product.diskonPersen = v.value;
    return { ok: true, field: 'diskonPersen', value: v.value };
  },

  // validateTextValue(value) — validasi bersama utk field id/teks
  // (kategoriId/produsenId/satuan). Tolak (ok:false) kalau `value` bukan
  // string, atau string kosong setelah di-trim (termasuk null/undefined/
  // NaN/angka — semua ditolak, SAMA prinsip "tolak sebelum ditulis mentah"
  // dgn validatePriceValue()/validateStockValue()). Hasil DI-TRIM (bukan
  // klem angka — ini teks) supaya whitespace liar dari import tidak lolos.
  validateTextValue(value) {
    if (typeof value !== 'string') {
      return { ok: false, reason: `nilai tidak valid (bukan string): ${value}` };
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return { ok: false, reason: 'nilai tidak valid (string kosong)' };
    }
    return { ok: true, value: trimmed };
  },

  // mutateSetField(product, field, value) — GATE utk field id/teks
  // (kategoriId/produsenId/satuan/catatan), 1 gate dipakai bareng (bukan
  // gate terpisah per field — hindari duplikasi validasi, sama semangat
  // instruksi sesi ini) SAMA POLA mutateSetPrice() (field whitelist +
  // fail-safe: field tidak disentuh sama sekali kalau value tidak valid).
  // Menggantikan `p.kategoriId=...`/`p.produsenId=...`/`product.satuan=...`
  // mentah yang sebelumnya ditulis tanpa validasi di
  // shop-data-io-api.js/cobek-io.js.
  // `catatan` (Sesi 386, FIX-v1084-to-v1085-s433-audit-fix-renov-edit-not-saving.md)
  // ditambah ke whitelist yang SUDAH ADA — field teks bebas baru dari kolom
  // CSV/Excel "Catatan" (produk, bukan produsen — produsen sudah punya
  // `catatan` sendiri lewat SupplierStore, tidak disentuh sesi ini), pola
  // validasi SAMA PERSIS satuan (lewat validateTextValue() yang sudah ada).
  mutateSetField(product, field, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    if (field !== 'kategoriId' && field !== 'produsenId' && field !== 'satuan' && field !== 'catatan') {
      return { ok: false, reason: `field tidak didukung gate ini: ${field}` };
    }
    // Modul 15 (sesi ini): Clear Field Mutation Gate — SATU pengecualian
    // eksplisit ditambahkan ke gate yang sudah ada (SAMA POLA
    // mutateSetPrice() Modul 5 utk hargaReseller=null): `value===''` VALID
    // khusus utk kategoriId/produsenId (artinya "dikosongkan" — kategori/
    // produsen produk ini sudah dihapus, atau input kategori kasir
    // whitespace-only). Sebelum sesi ini, gate ini (validateTextValue()
    // Modul 5) MEWAJIBKAN teks non-kosong sehingga 3 titik sisi-efek clear
    // yang sudah ADA SEBELUM sesi ini (Etalase.delKategori() Modul 8,
    // Produsen.delete() Modul 7, applyTxShopStockFromTx() cabang
    // kategoriInput whitespace-only Modul 6) SENGAJA dibiarkan raw —
    // didokumentasikan eksplisit di CHANGELOG-MODUL5/6/7/8.md sbg known
    // issue yang butuh perluasan gate (bukan gate baru) utk ditutup.
    // `satuan` TIDAK ikut pengecualian ini (tidak ada jalur existing yang
    // butuh clear satuan ke kosong — menambah pengecualian utk field yang
    // tidak butuh berarti melebarkan gate di luar apa yang benar-benar
    // dipakai). Nilai lain (null/undefined/NaN/angka/whitespace-only)
    // TETAP ditolak sama seperti sebelumnya — HANYA string kosong literal
    // `''` yang dikecualikan.
    if (value === '' && (field === 'kategoriId' || field === 'produsenId')) {
      product[field] = '';
      return { ok: true, field, value: '' };
    }
    const v = this.validateTextValue(value);
    if (!v.ok) return v;
    product[field] = v.value;
    return { ok: true, field, value: v.value };
  },

  // === Modul 6 (sesi ini): Nested Attribute Mutation Gate ===================
  // Lanjutan langsung Modul 5 — satu-satunya nested object Product yang masih
  // ditulis mentah: `product.hargaByProdusen[produsenId]` (map harga beli
  // per-produsen, 3 titik: cobek-order.js Produsen.saveHarga() [set ATAU
  // delete], cobek-tx-cart.js applyTxShopStockFromTx() [set-only], dan
  // cobek-etalase.js Etalase.save() [set-only]). Field skalar
  // `kategoriId`/`produsenId` yang masih bypass Repository di
  // cobek-tx-cart.js (issue #1 CHANGELOG-MODUL5.md) dialihkan ke
  // mutateSetField() yang SUDAH ADA (Modul 5) — tidak butuh gate baru, cuma
  // wiring.
  //
  // Desain gate nested BARU (bukan reuse mutateSetField()/mutateSetPrice()
  // langsung — struktur beda, 1 field = 1 map, bukan 1 field = 1 skalar):
  //   - key (produsenId) divalidasi lewat validateTextValue() YANG SUDAH ADA
  //     (reuse persis, 0 duplikasi validasi teks baru).
  //   - value (harga) divalidasi lewat validatePriceValue() YANG SUDAH ADA
  //     (reuse persis, 0 duplikasi validasi harga baru) — SAMA aturan dgn
  //     hargaBeli/hargaJual (finite, diklem >=0).
  //   - SET & DELETE dipisah jadi 2 method (bukan 1 method dgn flag) supaya
  //     tiap call site tetap eksplisit soal niatnya (SAMA semangat
  //     `mutateStockDelta()` vs `mutateSetStock()` — 2 gate beda niat, bukan
  //     1 gate serba-guna) & cocok dgn 2 pola behavior berbeda yang sudah ada
  //     di 3 call site (order.js: set ATAU delete tergantung value; tx-cart.js
  //     & etalase.js: set-only, caller sendiri yang sudah guard `>0` sebelum
  //     manggil — gate TIDAK mengubah guard itu, cuma menggantikan assignment
  //     mentah setelahnya).
  //   - `product.hargaByProdusen` DIBUAT kalau belum ada (SAMA PERSIS pola
  //     `if(!product.hargaByProdusen)product.hargaByProdusen={}` yang sudah
  //     ada di ke-3 call site — dipindah ke dalam gate, bukan logic baru).
  //   - Fail-safe SAMA pola gate lain: value/key tidak valid -> map TIDAK
  //     disentuh sama sekali (bukan partial write, bukan bikin map kosong
  //     kalau sebelumnya belum ada & mutasi gagal).

  // mutateSetHargaProdusen(product, produsenId, value) — GATE SET utk nested
  // map hargaByProdusen. Menggantikan
  // `product.hargaByProdusen[produsenId]=hargaBeli` mentah (3 titik).
  // Return {ok:true, produsenId, value} (map SUDAH ditulis) atau
  // {ok:false, reason} (map TIDAK berubah).
  mutateSetHargaProdusen(product, produsenId, value) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const k = this.validateTextValue(produsenId);
    if (!k.ok) return { ok: false, reason: `produsenId tidak valid: ${k.reason}` };
    const v = this.validatePriceValue(value);
    if (!v.ok) return v;
    if (!product.hargaByProdusen || typeof product.hargaByProdusen !== 'object' || Array.isArray(product.hargaByProdusen)) {
      product.hargaByProdusen = {};
    }
    product.hargaByProdusen[k.value] = v.value;
    return { ok: true, produsenId: k.value, value: v.value };
  },

  // mutateDeleteHargaProdusen(product, produsenId) — GATE DELETE utk nested
  // map hargaByProdusen. Menggantikan `delete product.hargaByProdusen[key]`
  // mentah (cobek-order.js Produsen.saveHarga(), cabang value<=0). Idempotent
  // — hapus key yang memang tidak ada TETAP ok:true (SAMA perilaku `delete`
  // JS native, 0 perubahan perilaku).
  // Return {ok:true, produsenId} (key dihapus/sudah tidak ada) atau
  // {ok:false, reason} (produk/produsenId tidak valid).
  mutateDeleteHargaProdusen(product, produsenId) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
      return { ok: false, reason: 'Produk tidak valid — harus berupa object' };
    }
    const k = this.validateTextValue(produsenId);
    if (!k.ok) return { ok: false, reason: `produsenId tidak valid: ${k.reason}` };
    if (!product.hargaByProdusen || typeof product.hargaByProdusen !== 'object' || Array.isArray(product.hargaByProdusen)) {
      product.hargaByProdusen = {};
    }
    delete product.hargaByProdusen[k.value];
    return { ok: true, produsenId: k.value };
  },

  // === Modul 12 (sesi ini): Product Delete Mutation Gate =====================
  // Satu-satunya mutasi mentah tersisa di Etalase (`cobek-etalase.js`,
  // `Etalase.delete(i)`): `D.products.splice(i,1)` tanpa validasi apa pun.
  // TIDAK ADA gate delete produk sebelumnya di ProductRepository (beda dari
  // SupplierStore.mutateDelete()/CategoryStore.mutateDelete() yang sudah
  // ada) — method ini BARU, dibuat sekecil mungkin (1 method, PURE, pola
  // SAMA PERSIS SupplierStore.mutateDelete()) khusus utk kebutuhan sesi ini,
  // bukan wiring ke gate lama.
  //
  // mutateDelete(products, id) — GATE hapus produk by id, PURE (balikin
  // ARRAY BARU hasil filter, TIDAK memutasi `products` input — SAMA POLA
  // saveProduct() di atas & SupplierStore.mutateDelete()). Caller yang
  // assign balik ke `D.products` (menggantikan `D.products.splice(i,1)`
  // mentah). id tidak ketemu TETAP ok:true (idempotent, SAMA perilaku
  // `.filter()` native — splice(i,1) dgn index tidak valid pun sebelumnya
  // tidak pernah error, cuma no-op/salah hapus; validasi id di sini justru
  // MENCEGAH kasus salah-hapus-produk-lain kalau index sudah basi/berubah).
  // Return {ok:true, products} (array baru, id sudah tidak ada) atau
  // {ok:false, reason} (products bukan array / id tidak valid).
  mutateDelete(products, id) {
    if (!Array.isArray(products)) {
      return { ok: false, reason: 'products tidak valid — harus berupa array' };
    }
    const k = this.validateTextValue(id);
    if (!k.ok) return { ok: false, reason: `id tidak valid: ${k.reason}` };
    return { ok: true, products: products.filter((p) => p.id !== k.value) };
  },
};
