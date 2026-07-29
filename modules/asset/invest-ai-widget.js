// invest-ai-widget.js — Widget "🤖 Rekomendasi AI" otomatis di kartu 🧭
// Dipindah ke modules/asset/invest-ai-widget.js (Sesi 9 restrukturisasi folder — lihat
// docs/FILE-MAP.md & RENCANA-SESI.md; isi & nama file TIDAK berubah, cuma lokasi folder).
// Rekomendasi Alokasi Aset (aset.js: AlokasiAset.renderOne(), target #aaResult,
// halaman Pajak & Zakat / tab Zakat). MODUL BARU — tidak mengubah satu baris
// pun logic AlokasiAset/Aset yang sudah ada; file ini HANYA menambah satu
// section baru yang di-append SETELAH box.innerHTML AlokasiAset ditulis (pola
// persis sama dgn self-reward-ai-widget.js -> SelfRewardAI.mountInto()).
//
// TUJUAN: baca kondisi investasi/aset senyata mungkin (bukan cuma ilustrasi
// alokasi preset) dari beberapa sumber, semua lewat guard
// `typeof X!=='undefined'` supaya aman dites/berdiri sendiri:
//   - D.assets (Buku Aset, aset.js)   -> diversifikasi aset "investasi"
//     (yg ditandai zakatable: Emas/Deposito/Saham/Reksadana/Kripto/tanah dst)
//   - D.assetAllocation (preset risiko terpilih user, aset.js)
//   - D.targets isDanaDarurat          -> cek dana darurat sblm alokasi lain
//   - Investment.portfolioSummary()/getHoldings() (investasi.js, kalau modul
//     portofolio itu dipakai) -> ROI & alokasi per jenis instrumen

function _iaFmtRp(n) {
  return typeof fmt === 'function' ? fmt(n) : 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}
function _iaEsc(s) {
  return typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s);
}

const InvestAI = {

  // Aset yang ditandai "Hitung ke Zakat Maal" = aset produktif/investasi
  // (definisi sama dgn yang dipakai FI Settings "Cakupan Aset untuk Target
  // FI" di modules-calc.js, supaya konsisten satu app).
  // S261 (Investment Ownership Sync): TAMBAH filter isAssetOwnershipSelf
  // (guard typeof, pola sama AssetPortfolioAPI.portfolioComposition()) —
  // SEBELUM sesi ini, rekomendasi diversifikasi/vs-preset di bawah bisa
  // ikut menghitung aset ber-ownership INVESTOR/CUSTOMER/THIRD_PARTY/
  // FAMILY, beda dari Aset.totalValue()/investmentPerformance() yang
  // sudah SELF-only. 0 rumus baru — cuma nambah 1 filter di atas filter
  // zakatable yang sudah ada.
  _investmentAssets() {
    if (typeof D === 'undefined' || !Array.isArray(D.assets)) return [];
    const selfOnly = typeof isAssetOwnershipSelf === 'function' ? isAssetOwnershipSelf : () => true;
    return D.assets.filter(selfOnly).filter((a) => a.zakatable);
  },

  // 1) Dana darurat harus lebih dulu beres sebelum alokasi ke instrumen lain.
  _checkDanaDarurat() {
    if (typeof D === 'undefined') return [];
    const dd = (D.targets || []).find((t) => t.isDanaDarurat);
    if (!dd) return []; // sudah ada banner khusus dari AlokasiAset sendiri
    const saved = dd.accountId && typeof recalcAccBalance === 'function' ? recalcAccBalance(dd.accountId) : dd.saved;
    const pct = dd.amount > 0 ? Math.round((saved / dd.amount) * 100) : 0;
    if (pct < 100) {
      return [{
        icon: '🚨',
        text: `Dana darurat baru ${pct}% dari target. Sebelum menambah alokasi ke instrumen berisiko, prioritaskan dulu sampai 100%.`,
        priority: 1,
      }];
    }
    return [];
  },

  // 2) Diversifikasi Buku Aset — flag kalau >60% nilai aset investasi
  // menumpuk di satu jenis (mis. semua di Emas atau semua di satu Saham).
  _checkDiversifikasi() {
    const list = InvestAI._investmentAssets();
    if (list.length < 2) return [];
    const total = list.reduce((s, a) => s + (a.nilai || 0), 0);
    if (total <= 0) return [];
    const byJenis = {};
    list.forEach((a) => {
      byJenis[a.jenis] = (byJenis[a.jenis] || 0) + (a.nilai || 0);
    });
    const dominant = Object.entries(byJenis)
      .map(([jenis, val]) => ({ jenis, pct: (val / total) * 100 }))
      .sort((a, b) => b.pct - a.pct)[0];
    if (dominant && dominant.pct >= 60) {
      return [{
        icon: '⚖️',
        text: `${Math.round(dominant.pct)}% aset investasi kamu ada di "${_iaEsc(dominant.jenis)}". Pertimbangkan diversifikasi ke jenis lain supaya risikonya lebih menyebar.`,
        priority: 2,
      }];
    }
    return [];
  },

  // 3) Bandingkan komposisi Buku Aset aktual vs preset risiko yang dipilih
  // user di AlokasiAset (kalau ada) — cari kesenjangan terbesar.
  _checkVsPreset(risk) {
    if (!risk || typeof ALOKASI_PRESETS === 'undefined' || !ALOKASI_PRESETS[risk]) return [];
    const list = InvestAI._investmentAssets();
    const total = list.reduce((s, a) => s + (a.nilai || 0), 0);
    if (total <= 0) return [];
    const jenisMap = {
      'Emas/Logam Mulia': 'Emas',
      'Deposito/Investasi': 'RDPU / Deposito',
      'Saham': 'Reksadana Saham / Saham',
      'Reksadana': 'Reksadana Saham / Saham',
      'Kripto': 'Kripto / Alternatif',
    };
    const actualPct = {};
    list.forEach((a) => {
      const label = jenisMap[a.jenis];
      if (!label) return;
      actualPct[label] = (actualPct[label] || 0) + ((a.nilai || 0) / total) * 100;
    });
    const preset = ALOKASI_PRESETS[risk];
    let biggestGap = null;
    preset.items.forEach((it) => {
      if (/dana darurat/i.test(it.name)) return; // sudah dicek terpisah
      const actual = actualPct[it.name] || 0;
      const gap = it.pct - actual;
      if (gap > 15 && (!biggestGap || gap > biggestGap.gap)) {
        biggestGap = { name: it.name, gap, target: it.pct, actual: Math.round(actual) };
      }
    });
    if (biggestGap) {
      return [{
        icon: '🧭',
        text: `Profil "${risk}" menyarankan ~${biggestGap.target}% di ${_iaEsc(biggestGap.name)}, tapi Buku Aset kamu baru ${biggestGap.actual}% di sana. Bisa jadi bahan pertimbangan alokasi berikutnya.`,
        priority: 3,
      }];
    }
    return [];
  },

  // 4) Kalau modul portofolio (Investment, investasi.js) dipakai — ROI &
  // konsentrasi holding, terpisah dari Buku Aset di atas.
  // S261 (Investment Ownership Sync): gate keberadaan holding sekarang
  // pakai summary.holdingsCount (SUDAH difilter isHoldingOwnershipSelf
  // sejak S193 di Investment.portfolioSummary()), BUKAN lagi
  // Investment.getHoldings().length mentah — supaya widget ini tidak
  // "kebuka" gate-nya hanya krn ada holding ber-ownership
  // INVESTOR/CUSTOMER/THIRD_PARTY/FAMILY (summary/roiPct yang dipakai di
  // bawah sudah SELF-only, tapi gate-nya sendiri sebelumnya belum
  // konsisten). 0 rumus baru.
  _checkPortofolio() {
    if (typeof Investment === 'undefined') return [];
    const summary = Investment.portfolioSummary ? Investment.portfolioSummary() : null;
    if (!summary || !summary.holdingsCount) return [];
    const out = [];
    if (summary && summary.roiPct < 0) {
      out.push({
        icon: '📉',
        text: `Portofolio (holding tercatat) sedang minus ${summary.roiPct.toFixed(1)}% (unrealized) — belum tentu masalah kalau horisonnya masih panjang, tapi jangan buru-buru nambah di instrumen yang sama.`,
        priority: 2,
      });
    }
    return out;
  },

  // ---------- API utama ----------
  generateRecommendations() {
    if (typeof D === 'undefined') return [];
    const risk = D.assetAllocation && D.assetAllocation.risk;
    const all = [
      ...InvestAI._checkDanaDarurat(),
      ...InvestAI._checkDiversifikasi(),
      ...InvestAI._checkVsPreset(risk),
      ...InvestAI._checkPortofolio(),
    ];
    return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
  },

  buildWidgetHtml(recommendations) {
    const list = recommendations && recommendations.length ? recommendations : null;
    const itemsHtml = list
      ? list.map((r) => `<div class="fg" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
          <span>${r.icon}</span><span style="font-size:12px;line-height:1.5">${_iaEsc(r.text)}</span>
        </div>`).join('')
      : `<div class="fg" style="font-size:12px;color:var(--text2)">Belum cukup data (isi Buku Aset & pilih profil risiko dulu) untuk rekomendasi otomatis.</div>`;
    return `
      <div class="u-fs11 u-t2 u-mt10 u-mb4" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">🤖 Rekomendasi AI</div>
      <div id="investAiList">${itemsHtml}</div>
    `;
  },

  // mountInto(box) — SATU-SATUNYA fungsi yang sentuh DOM. Dipanggil dari
  // aset.js (AlokasiAset.renderOne) SETELAH box.innerHTML preset alokasi
  // ditulis; widget di-APPEND (bukan menimpa) supaya ilustrasi alokasi yang
  // sudah ada tetap utuh.
  mountInto(box) {
    if (!box || typeof document === 'undefined') return;
    const old = box.querySelector ? box.querySelector('#investAiWidget') : document.getElementById('investAiWidget');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const wrap = document.createElement('div');
    wrap.id = 'investAiWidget';
    wrap.innerHTML = InvestAI.buildWidgetHtml(InvestAI.generateRecommendations());
    box.appendChild(wrap);
  },
};

if (typeof window !== 'undefined') {
  window.InvestAI = InvestAI;
}
