// modules/shop/delivery-plan-ui.js — Delivery Plan UI (Sesi 203, Continue).
//
// Menutup gap yang dicatat di trip-engine.js ("Belum digunakan UI. Belum
// dihubungkan ke Shop.") & shop-business-engine-presenter.js ("TripEngine
// tidak dipakai di sini ... dipakai langsung di form Order/Kasir sesuai
// desain aslinya"). File ini murni presenter: 100% REUSE TripEngine (S198,
// modules/shop/trip-engine.js) yang sendiri delegasi PERSIS ke
// calculateSmartDelivery()/weightCalculator()/volumeCalculator() (sudah ada
// sejak Sesi 3-6). TIDAK ADA rumus baru, TIDAK menulis ke D, TIDAK memanggil
// save() — murni baca D.products/D.produsen/D.vehicles (read-only, sama
// kontrak fungsi yang di-reuse) & render ke #deliveryPlanModal (modals.js).
//
// Dipanggil dari tombol "🚚 Rencana Pengiriman" di orderModal
// (modules/shared/modals.js) lewat data-action="DeliveryPlanUI.open".
const DeliveryPlanUI = {
  metode: 'antar',

  _money(n) {
    return (typeof fmt === 'function') ? fmt(n) : ('Rp ' + Math.round(n || 0));
  },

  // open(prefill) — isi semua <select> dari D (produk/produsen/kendaraan),
  // reset form ke default, lalu buka modal & hitung sekali. `prefill`
  // opsional {productId,qty} (S206, Business Flow Purchase->Trip wiring)
  // — kalau dikasih & productId ada di daftar produk, dropdown produk &
  // qty langsung diisi dari situ (dipakai APA ADANYA, 0 recompute) —
  // TIDAK memanggil open() tanpa argumen, dipakai APA ADANYA, TIDAK ada
  // perubahan perilaku kalau dipanggil tanpa argumen (semua pemanggil
  // lama tetap sama persis).
  open(prefill) {
    const prodSel = document.getElementById('dpProduct');
    if (prodSel) {
      prodSel.innerHTML = (D.products || [])
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join('');
    }
    const produsenSel = document.getElementById('dpProdusen');
    if (produsenSel) {
      produsenSel.innerHTML = '<option value="">— Tanpa produsen —</option>'
        + (D.produsen || []).map((pr) => `<option value="${pr.id}">${escapeHtml(pr.name)}</option>`).join('');
    }
    const vehSel = document.getElementById('dpVehicle');
    if (vehSel) {
      vehSel.innerHTML = '<option value="">— Tanpa kendaraan —</option>'
        + (D.vehicles || []).map((v) => `<option value="${v.id}">${v.emoji || ''} ${escapeHtml(v.name)}</option>`).join('');
    }
    const qtyEl = document.getElementById('dpQty');
    if (qtyEl) qtyEl.value = 1;
    this.metode = 'antar';
    const aiBox = document.getElementById('dpAiBox');
    if (aiBox) { aiBox.classList.add('u-dnone'); aiBox.innerHTML = ''; }
    if (prefill && prefill.productId && prodSel) {
      const exists = (D.products || []).some((p) => p.id === prefill.productId);
      if (exists) {
        prodSel.value = prefill.productId;
        if (qtyEl && prefill.qty > 0) qtyEl.value = prefill.qty;
      }
    }
    this.onProductChange();
    openModal('deliveryPlanModal');
  },

  // onProductChange() — kalau produk pilihan punya produsenId bawaan
  // (D.products[].produsenId, sama field yg dipakai productModal), auto-
  // pilih produsen itu di dropdown supaya km/biaya bisa terisi dari
  // preferensi produsen (S6, OngkirCalc.prefillFromProdusen pola serupa).
  onProductChange() {
    const prodSel = document.getElementById('dpProduct');
    const produsenSel = document.getElementById('dpProdusen');
    if (prodSel && produsenSel) {
      const product = (D.products || []).find((p) => p.id === prodSel.value);
      if (product && product.produsenId) produsenSel.value = product.produsenId;
    }
    this.calc();
  },

  // setMetode(v, el) — toggle chip aktif + tampilkan/sembunyikan Etape 2
  // (Pekalongan -> Rumah Konsumen), pola SAMA PERSIS OngkirCalc.setMetode
  // (productModal, cobek-etalase.js/modals.js) supaya konsisten UX.
  setMetode(v, el) {
    this.metode = v;
    const wrap = document.getElementById('dpMetodeToggle');
    if (wrap) Array.from(wrap.children).forEach((b) => b.classList.remove('active'));
    if (el) el.classList.add('active');
    const etape2 = document.getElementById('dpEtape2Fields');
    if (etape2) etape2.style.display = (v === 'ambil') ? 'none' : '';
    this.calc();
  },

  // calc() — orkestrator murni presenter: kumpulkan input form, panggil
  // TripEngine.plan() (delegasi PERSIS calculateSmartDelivery(), S198) utk
  // ongkir+harga+profit, & TripEngine.weight()/volume() (delegasi PERSIS
  // weightCalculator()/volumeCalculator(), S198) utk info berat/volume
  // muatan kalau produk sudah punya data dimensi (S203, productModal).
  // TIDAK ADA hitungan baru di sini — cuma merangkai hasil 3 method
  // TripEngine yang sudah ada jadi satu ringkasan HTML.
  calc() {
    const box = document.getElementById('dpSummaryBox');
    if (!box) return;
    if (typeof TripEngine === 'undefined') {
      box.innerHTML = 'TripEngine belum dimuat.';
      return;
    }
    const productId = document.getElementById('dpProduct')?.value;
    const product = (D.products || []).find((p) => p.id === productId);
    if (!product) {
      box.innerHTML = 'Pilih produk untuk mulai.';
      return;
    }
    const qty = Math.max(0, parseFloat(document.getElementById('dpQty')?.value) || 0);
    const produsenId = document.getElementById('dpProdusen')?.value || null;
    const kmKonsumen = document.getElementById('dpKmKonsumen')?.value;
    const biayaPerKmKonsumen = document.getElementById('dpBiayaKmKonsumen')?.value;
    const vehicleId = document.getElementById('dpVehicle')?.value || null;
    const marginPct = document.getElementById('dpMarginPct')?.value;

    const plan = TripEngine.plan({
      productId, qty, produsenId,
      kmKonsumen: this.metode === 'antar' ? kmKonsumen : undefined,
      biayaPerKmKonsumen: this.metode === 'antar' ? biayaPerKmKonsumen : undefined,
      metode: this.metode, vehicleId,
      marginPct: marginPct !== '' ? marginPct : undefined,
    });

    let html = '';
    if (!plan.ok) {
      box.innerHTML = escapeHtml(plan.reason || 'Belum bisa dihitung.');
      return;
    }
    html += `<div><b>${escapeHtml(plan.productName)}</b> · ${qty} pcs</div>`;
    if (plan.plan && plan.plan.route && plan.plan.route.totalPerPcs !== undefined) {
      html += `<div>Ongkir: ${this._money(plan.plan.route.totalPerPcs)} / pcs</div>`;
    }
    if (plan.plan && plan.plan.price && plan.plan.price.hargaJual !== undefined) {
      html += `<div>Rekomendasi harga jual: ${this._money(plan.plan.price.hargaJual)}</div>`;
    }
    if (plan.plan && plan.plan.fuel && plan.plan.fuel.rpPerKm !== undefined) {
      html += `<div>Estimasi BBM: ${this._money(plan.plan.fuel.rpPerKm)} / km</div>`;
    }
    if (plan.profit && plan.profit.ok !== false && plan.profit.untung !== undefined) {
      html += `<div>Estimasi untung: ${this._money(plan.profit.untung)}</div>`;
    }

    // Berat/volume muatan — hanya ditampilkan kalau produk sudah punya
    // data berat/dimensi (S203, field baru productModal). Reuse
    // TripEngine.weight()/volume() (S198), tidak ada rumus baru.
    if (product.beratPerUnit > 0) {
      const w = TripEngine.weight({ beratPerUnit: product.beratPerUnit, qty });
      if (w.ok) html += `<div>Total berat: ${w.totalKg.toFixed(2)} kg</div>`;
    }
    if (product.panjang > 0 && product.lebar > 0 && product.tinggi > 0) {
      const vol = TripEngine.volume({
        panjang: product.panjang, lebar: product.lebar, tinggi: product.tinggi, qty,
      });
      if (vol.ok) html += `<div>Total volume: ${vol.totalM3.toFixed(3)} m³</div>`;
    }

    box.innerHTML = html || 'Isi data pengiriman untuk melihat ringkasan.';
  },

  // askAI() — 100% reuse requestAIRecommendation() (cobek-order.js, S6),
  // TIDAK ada prompt/logic AI baru di sini — murni oper parameter form yang
  // sama dgn calc() lalu tampilkan aiText hasilnya.
  async askAI() {
    if (typeof requestAIRecommendation !== 'function') return;
    const box = document.getElementById('dpAiBox');
    if (!box) return;
    box.classList.remove('u-dnone');
    box.innerHTML = 'Meminta rekomendasi AI...';
    const productId = document.getElementById('dpProduct')?.value;
    const qty = document.getElementById('dpQty')?.value;
    const produsenId = document.getElementById('dpProdusen')?.value || null;
    const kmKonsumen = document.getElementById('dpKmKonsumen')?.value;
    const biayaPerKmKonsumen = document.getElementById('dpBiayaKmKonsumen')?.value;
    const vehicleId = document.getElementById('dpVehicle')?.value || null;
    const marginPct = document.getElementById('dpMarginPct')?.value;
    try {
      const result = await requestAIRecommendation({
        productId, qty, produsenId, kmKonsumen, biayaPerKmKonsumen,
        metode: this.metode, vehicleId, marginPct: marginPct !== '' ? marginPct : undefined,
      });
      if (result && result.aiText) {
        box.innerHTML = escapeHtml(result.aiText).replace(/\n/g, '<br>');
      } else if (result && result.prompt) {
        box.innerHTML = escapeHtml(result.aiReason || 'Belum ada API Key AI — isi dulu di Pengaturan.');
      } else {
        box.innerHTML = escapeHtml((result && result.reason) || 'Gagal mendapat rekomendasi.');
      }
    } catch (e) {
      box.innerHTML = 'Gagal meminta rekomendasi AI.';
    }
  },
};

if (typeof window !== 'undefined') {
  window.DeliveryPlanUI = DeliveryPlanUI;
}
